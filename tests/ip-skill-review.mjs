// Latest-skill review: grade, executed observation and saved UI state are distinct.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const file='labs/ip-subnetting-simulator.html',version='20261007-observation-review-v3';
const legacyKey='network-learning:ip-subnetting:answers:v1';
const source=await readFile(resolve(root,file),'utf8');
assert.equal(source.includes('>\\n<meta name="network-sim-version"'),false,'head must not expose a literal \\n text node');
const normalize=s=>s.replace(/\r\n/g,'\n').trim();
const checks=[];
// Exercise the same pure function shipped in the page, not an alternate test model.
const arith=source.slice(source.indexOf('function ipToInt('),source.indexOf('function grade('));
const model=source.slice(source.indexOf('function buildObservation('),source.indexOf('// END OBSERVATION MODEL'));
assert.ok(arith&&model,'model source boundaries');
const run=vm.runInNewContext(arith+'\n'+model+'\nbuildObservation');
const fixtures=[
 {src:'10.77.10.10',dst:'10.77.10.20',prefix:25,destinationLan:'A',scenarioId:'same-subnet',target:'10.77.10.20',kind:'arp-reply'},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:25,destinationLan:'B',scenarioId:'different-subnet',target:'10.77.10.1',kind:'arp-reply'},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:24,destinationLan:'B',scenarioId:'wrong-mask',target:'10.77.10.140',kind:'unresolved-arp'},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:25,destinationLan:'B',scenarioId:'mask-recovery',target:'10.77.10.1',kind:'arp-reply'}
];
for(const f of fixtures){
 const input={...f,gateway:'10.77.10.1',dstPrefix:25,claimIds:['IPSUB-test']};
 const observation=run(input),altered=run({...input,answer:'deliberately-wrong',choice:'different'});
 assert.equal(observation.arpTarget,f.target);assert.equal(observation.events[2].kind,f.kind);
 assert.equal(JSON.stringify(observation),JSON.stringify(altered),'learner choice must not drive the model');
 assert.ok(Object.isFrozen(observation)&&Object.isFrozen(observation.events)&&observation.events.every(Object.isFrozen));
 assert.equal(observation.destinationPrefix,25);
 checks.push({scope:'pure-model',scenario:f.scenarioId,status:'PASS'});
}
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const p=resolve(root,'.'+path);if(!p.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  const b=await readFile(p);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ico':'image/x-icon'}[extname(p)]||'application/octet-stream'),'Cache-Control':'no-store'}).end(b);
 }catch{res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
}
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
const matrix=[[320,640,true],[360,800,true],[390,844,true],[412,915,true],[800,360,true],[768,1024,true],[980,720,false],[1366,768,false],[1920,1080,false]];
async function input(page,selector,touch){
 const point=await page.locator(selector).evaluate(e=>{
  const r0=e.getBoundingClientRect();window.scrollTo({top:scrollY+r0.top+r0.height/2-110,behavior:'instant'});
  const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  return {x,y,hit:e.contains(document.elementFromPoint(x,y))};
 });assert.ok(point.hit,selector+' is obscured');
 if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
}
async function surface(url,name){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  try{
   assert.equal((await page.goto(`${url}/${file}`,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('meta[name=skill-review-version]').getAttribute('content'),version);
   assert.equal(await page.locator('#runBtn').isVisible(),true,'initial primary action must not be hidden');
   assert.equal(await page.locator('#runBtn').isDisabled(),true);
   assert.equal(await page.locator('#modelObservation').isVisible(),false,'do not reveal observation before submission');
   await page.locator('.tab').nth(1).focus();await page.keyboard.press('Enter');
   assert.ok(await page.evaluate(()=>document.activeElement===document.querySelectorAll('.tab')[1]),'tab activation lost keyboard focus');
   await page.locator('.tab').nth(0).click();
   await page.evaluate(()=>{window.__tabClicks=0;document.querySelector('#tabs').addEventListener('click',()=>window.__tabClicks++);});
   for(const [i,choice] of ['on','gw','gw','on'].entries()){
    assert.equal(await page.locator('#lessonNo').innerText(),`문제 ${i+1} / 4`);
    await input(page,`#choices [data-value="${choice}"]`,touch);
    assert.equal(await page.locator('.tab.active small').innerText(),'선택 중 · 미제출');
    await input(page,'#runBtn',touch);
    assert.equal(await page.locator('#verdictTitle').innerText(),i<2?'✓ 정답입니다':'✕ 오답입니다');
    assert.equal(await page.locator('#modelObservation').isVisible(),true);
    assert.equal(await page.locator('#modelObservation').getAttribute('data-scenario'),fixtures[i].scenarioId);
    assert.ok((await page.locator('#modelEvent').innerText()).includes(fixtures[i].target));
    assert.equal(await page.locator('#simFlowDetails').getAttribute('open'),null);
    assert.equal(await page.locator('#modelObservation').getAttribute('data-outcome'),i===2?'unresolved':'resolved');
    assert.equal(await page.locator('#simTopology [data-device-shape="host"]').count(),3,'three host-shaped device icons');
    assert.equal(await page.locator('#simTopology [data-device-shape="router"]').count(),1,'one router-shaped device icon');
    const flowOrder=await page.evaluate(()=>{
      const model=document.querySelector('#modelObservation'),next=document.querySelector('#nextBtn'),calc=document.querySelector('#calculationDetails');
      return !!(model.compareDocumentPosition(next)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(next.compareDocumentPosition(calc)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.equal(flowOrder,true,'result flow must be verdict → topology → next/reset → numeric deepening');
    assert.equal(await page.locator('.hero p').first().evaluate(e=>getComputedStyle(e).color),'rgb(215, 227, 239)','hero learning copy contrast');
    assert.equal(await page.locator('#feedback').evaluate(e=>getComputedStyle(e).color),'rgb(215, 227, 239)','prediction feedback is primary copy');
    const eventContrast=await page.evaluate(()=>{
      function rgb(s){return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);}
      function lum(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
      function L(s){const [r,g,b]=rgb(s);return .2126*lum(r)+.7152*lum(g)+.0722*lum(b);}
      const fg=L(getComputedStyle(document.querySelector('#modelEvent')).color),bg=L(getComputedStyle(document.querySelector('#modelObservation')).backgroundColor);
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    });
    assert.ok(eventContrast>=7,'current event primary copy contrast must stay >= 7:1, got '+eventContrast);
    const surfaceColors=await page.evaluate(()=>({
      page:getComputedStyle(document.body).backgroundColor,
      observation:getComputedStyle(document.querySelector('#modelObservation')).backgroundColor
    }));
    assert.notEqual(surfaceColors.observation,surfaceColors.page,'observation surface must separate from page background');
    assert.ok((await page.locator('#modelCaption').textContent()).includes('직접 전달'));
    assert.equal((await page.locator('body').innerText()).includes('PASS'),false);
    const distance=await page.evaluate(()=>document.querySelector('#nextBtn').getBoundingClientRect().bottom-document.querySelector('#verdictTitle').getBoundingClientRect().top);
    assert.ok(distance<1800,'beginner result displaced primary Next too far: '+distance+'px');
    if(i===2&&[360,1366].includes(width))await page.screenshot({path:resolve(out,`skill-review-${name}-${width}.png`)});
    const score=await page.locator('#scoreText').innerText();
    await input(page,'#simFlowDetails summary',touch);
    assert.equal(await page.locator('#simPrev').isDisabled(),true);
    await input(page,'#simNext',touch);assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'arp-request');
    await input(page,'#simNext',touch);assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),fixtures[i].kind);
    while(!(await page.locator('#simNext').isDisabled())) await input(page,'#simNext',touch);
    assert.equal(await page.locator('#simNext').isDisabled(),true);
    await input(page,'#simPrev',touch);
    
    assert.equal(await page.locator('#scoreText').innerText(),score);
    await input(page,'#simFlowDetails summary',touch);
    assert.equal(await page.locator('#calculationDetails').isVisible(),true);
    assert.equal(await page.locator('#decisionOut').innerText(),['같은 네트워크 (ON-LINK)','다른 네트워크 → Gateway','같은 네트워크로 잘못 판단','다른 네트워크 → Gateway'][i]);
    assert.ok((await page.locator('#calculationDetails').innerText()).includes('Prefix Length'),'numeric deepening must use Prefix Length terminology');
    assert.equal((await page.locator('#calculationDetails').innerText()).includes('PC1이 사용한 Mask'),false,'slash notation must not be mislabeled as Mask');
    assert.ok((await page.locator('#nextHopOut').innerText()).endsWith(fixtures[i].target));
    if(i===2){
      assert.equal(await page.locator('#srcIp').innerText(),'10.77.10.10/24');
      assert.equal(await page.locator('#dstIp').innerText(),'10.77.10.140/25');
      assert.equal(await page.locator('#maskTry').isVisible(),true);
      await input(page,'#maskTry25',touch);assert.ok((await page.locator('#maskTryResult').innerText()).includes('Gateway(.1)'));
      await input(page,'#maskTry24',touch);assert.ok((await page.locator('#maskTryResult').innerText()).includes('직접 찾으려'));
      
    }
    await input(page,'#nextBtn',touch);
   }
   assert.equal(await page.evaluate(()=>window.__tabClicks),0,'continuous flow regressed');
   assert.equal(await page.locator('#lessonCard').isVisible(),false,'summary must not expose the previous question as another active surface');
   assert.equal(await page.locator('#completionScore').innerText(),'완료 4 / 4 · 정답 2 · 다시 볼 문제 2');
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#lessonNo').innerText(),'문제 1 / 4','reload must start fresh at problem 1');
   assert.equal(await page.locator('#resultArea').isVisible(),false,'reload must clear prior result');
   assert.equal(await page.locator('#complete').isVisible(),false,'reload must not restore summary');
   assert.equal(await page.locator('#scoreText').innerText(),'정답 0 · 다시 볼 문제 0 · 남은 문제 4');
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),legacyKey),null,'legacy saved answers must be cleared');
   assert.ok((await page.locator('#storageNote').innerText()).includes('다시 들어오면 1번 문제부터 미응답 상태로 시작'));
   await page.locator('.tab').nth(1).click();
   await input(page,'#choices [data-value="gw"]',touch);await input(page,'#runBtn',touch);
   await input(page,'#evidenceDetails summary',touch);
   assert.ok((await page.locator('#evidenceScope').innerText()).includes('기존 Cisco/VPCS'));
   for(const href of await page.locator('.source-links a').evaluateAll(es=>es.map(e=>e.href))){const r=await context.request.get(href);assert.ok(r.ok(),`missing evidence link ${href}`);}
   await page.addStyleTag({content:'html{font-size:200%}'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
   const forcedColorMeaning=await page.locator('#modelEvent').innerText();
    assert.ok(forcedColorMeaning.includes('다른 네트워크 동네')&&forcedColorMeaning.includes('Gateway'),'forced-colors must preserve the route decision in text');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.deepEqual(errors,[]);
   checks.push({surface:name,width,height,touch,status:'PASS',checks:['visible-disabled-submit','stable-tab-focus','visible-model','same-run-details','replay-keeps-grade','sequential-next','fresh-start-reload','legacy-storage-clear','actual-prefix','source-links','200%-text','forced-colors']});
   console.log(`PASS latest-skill review ${name} ${width}x${height}`);
  }catch(e){await page.screenshot({path:resolve(out,`skill-review-failure-${name}-${width}.png`),fullPage:true});throw e;}finally{await context.close();}
 }
 // Legacy saved progress must be discarded so every new entry is a fresh practice run.
 const context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto(`${url}/${file}`);
  await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({schema:1,index:2,answers:[{choice:'on',submitted:true},{choice:'gw',submitted:true},{choice:'drop',submitted:true},{choice:'gw',submitted:true}]})),legacyKey);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),legacyKey),null);
  assert.equal(await page.locator('#lessonNo').innerText(),'문제 1 / 4');
  assert.equal(await page.locator('#resultArea').isVisible(),false);
  assert.equal(await page.locator('#scoreText').innerText(),'정답 0 · 다시 볼 문제 0 · 남은 문제 4');
  checks.push({surface:name,case:'legacy-storage-cleared-fresh-start',status:'PASS'});
 }finally{await context.close();}
}
try{
 await surface(base,process.env.BASE_URL?'requested-url':'local');
 if(!process.env.BASE_URL&&process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io'&&process.env.GITHUB_REF==='refs/heads/main'){
  const publicBase='https://sebia1993.github.io',context=await browser.newContext();let ready=false;
  try{
   for(let i=0;i<18;i++){try{const r=await context.request.get(`${publicBase}/${file}?qa=${version}-${i}`,{timeout:15000});if(r.ok()&&normalize(await r.text())===normalize(source)){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
   assert.ok(ready,'tested source is not yet publicly deployed');
   for(const name of ['styles.css','lab-ui.css']){const r=await context.request.get(`${publicBase}/${name}?qa=${version}`);assert.ok(r.ok());assert.equal(normalize(await r.text()),normalize(await readFile(resolve(root,name),'utf8')));}
  }finally{await context.close();}
  await surface(publicBase,'published');
 }
}catch(e){checks.push({status:'FAIL',message:e.message});throw e;}
finally{
 await writeFile(resolve(out,'ip-skill-review-qa.json'),JSON.stringify({version,browser:browser.version(),networkLabExecuted:false,checks},null,2));
 await writeFile(resolve(out,'ip-skill-review-source.html'),source);
 await browser.close();if(server)await new Promise(r=>server.close(r));
}
