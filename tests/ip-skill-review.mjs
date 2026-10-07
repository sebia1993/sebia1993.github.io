// Latest-skill review: prediction → one Run → observation → grade → optional deepening.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const file='labs/ip-subnetting-simulator.html',version='20261007-observation-review-v5';
const legacyKey='network-learning:ip-subnetting:answers:v1';
const source=await readFile(resolve(root,file),'utf8');
assert.equal(source.includes('>\\n<meta name="network-sim-version"'),false,'head must not expose a literal \\n text node');
assert.ok(source.includes('② 실행해서 확인하기'),'single Run control must be the primary observation action');
assert.equal(source.includes('simAutoEvent'),false,'duplicate event strip must stay removed');
assert.ok(source.indexOf('id="modelObservation"')<source.indexOf('id="verdict"'),'topology must precede grade in the DOM');
const normalize=s=>s.replace(/\r\n/g,'\n').trim(),checks=[];

// Exercise the exact bounded observation model in the page.
const arith=source.slice(source.indexOf('function ipToInt('),source.indexOf('function grade('));
const model=source.slice(source.indexOf('function buildObservation('),source.indexOf('// END OBSERVATION MODEL'));
assert.ok(arith&&model,'model source boundaries');
const run=vm.runInNewContext(arith+'\n'+model+'\nbuildObservation');
const fixtures=[
 {src:'10.77.10.10',dst:'10.77.10.20',prefix:25,destinationLan:'A',scenarioId:'same-subnet',target:'10.77.10.20',last:'direct-path',motion:['pc1','pc3']},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:25,destinationLan:'B',scenarioId:'different-subnet',target:'10.77.10.1',last:'routed-path',motion:['pc1','r1','pc2']},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:24,destinationLan:'B',scenarioId:'wrong-mask',target:'10.77.10.140',last:'unresolved-arp',motion:['pc1','r1']},
 {src:'10.77.10.10',dst:'10.77.10.140',prefix:25,destinationLan:'B',scenarioId:'mask-recovery',target:'10.77.10.1',last:'routed-path',motion:['pc1','r1','pc2']}
];
for(const f of fixtures){
 const input={...f,gateway:'10.77.10.1',dstPrefix:25,claimIds:['IPSUB-test']};
 const o=run(input),altered=run({...input,answer:'wrong',choice:'different'});
 assert.equal(o.arpTarget,f.target);
 assert.equal(o.events.at(-1).kind,f.last);
 assert.deepEqual(Array.from(o.events.at(-1).motion),f.motion);
 assert.equal(JSON.stringify(o),JSON.stringify(altered),'learner answer must never drive the network model');
 assert.ok(Object.isFrozen(o)&&Object.isFrozen(o.events)&&o.events.every(Object.isFrozen));
 checks.push({scope:'pure-model',scenario:f.scenarioId,status:'PASS'});
}

let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/favicon.ico'){res.writeHead(204).end();return;}
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
  const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
  return {x,y,hit:!!hit&&e.contains(hit)};
 });assert.ok(point.hit,selector+' is obscured');
 if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
}
async function waitComplete(page){
 await page.waitForFunction(()=>document.querySelector('#modelObservation')?.dataset.flowState==='complete',undefined,{timeout:5000});
}

async function surface(url,name){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  try{
   assert.equal((await page.goto(`${url}/${file}`,{waitUntil:'networkidle'})).status(),200);
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('meta[name=skill-review-version]').getAttribute('content'),version);
   assert.equal(await page.locator('#runBtn').innerText(),'② 실행해서 확인하기');
   assert.equal(await page.locator('#runBtn').isDisabled(),true);
   assert.equal(await page.locator('#modelObservation').isVisible(),false);

   for(const [i,choice] of ['on','gw','gw','on'].entries()){
    assert.equal(await page.locator('#lessonNo').innerText(),`문제 ${i+1} / 4`);
    await input(page,`#choices [data-value="${choice}"]`,touch);
    assert.equal(await page.locator('.tab.active small').innerText(),'선택 중 · 미실행');
    await input(page,'#runBtn',touch);

    // The Ethernet-style rule: observation is visible before any grade/reason/Next.
    assert.equal(await page.locator('#modelObservation').isVisible(),true);
    assert.equal(await page.locator('#verdict').isVisible(),false);
    assert.equal(await page.locator('#resultActions').isVisible(),false);
    assert.equal(await page.locator('#calculationDetails').isVisible(),false);
    assert.equal(await page.locator('#simFlowDetails').isVisible(),false);
    assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'playing');
    assert.equal(await page.locator('#simEventKind').innerText(),'PREFIX');
    assert.equal(await page.locator('#modelObservation').getAttribute('data-scenario'),fixtures[i].scenarioId);
    assert.equal(await page.locator('#simTopology [data-sim-id].on-route').count(),0,'final path leaked into prefix step');

    await waitComplete(page);
    assert.equal(await page.locator('#verdictTitle').innerText(),i<2?'✓ 정답입니다':'✕ 오답입니다');
    assert.equal(await page.locator('#resultActions').isVisible(),true);
    assert.equal(await page.locator('#calculationDetails').isVisible(),true);
    assert.equal(await page.locator('#simFlowDetails').isVisible(),true);
    assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'complete');
    assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),fixtures[i].last);
    assert.ok((await page.locator('#modelEvent').innerText()).startsWith('흐름 '));

    const flowOrder=await page.evaluate(()=>{
      const model=document.querySelector('#modelObservation'),verdict=document.querySelector('#verdict'),next=document.querySelector('#resultActions'),calc=document.querySelector('#calculationDetails');
      return !!(model.compareDocumentPosition(verdict)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(verdict.compareDocumentPosition(next)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(next.compareDocumentPosition(calc)&Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.equal(flowOrder,true,'expected topology → grade → actions → numeric deepening');

    // Primary/secondary readability.
    assert.equal(await page.locator('.hero p').first().evaluate(e=>getComputedStyle(e).color),'rgb(215, 227, 239)');
    const eventContrast=await page.evaluate(()=>{
      function rgb(s){return (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);}
      function lum(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
      function L(s){const [r,g,b]=rgb(s);return .2126*lum(r)+.7152*lum(g)+.0722*lum(b);}
      const fg=L(getComputedStyle(document.querySelector('#modelEvent')).color),bg=L(getComputedStyle(document.querySelector('#simLiveEvent')).backgroundColor);
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    });
    assert.ok(eventContrast>=7,'Current Event contrast '+eventContrast);

    // Manual step controls are review-only and must not change the score.
    const score=await page.locator('#scoreText').innerText();
    await input(page,'#simFlowDetails summary',touch);
    if(!(await page.locator('#simPrev').isDisabled()))await input(page,'#simPrev',touch);
    assert.equal(await page.locator('#scoreText').innerText(),score);

    assert.ok((await page.locator('#calculationDetails').innerText()).includes('Prefix Length'));
    assert.equal((await page.locator('#calculationDetails').innerText()).includes('PC1이 사용한 Mask'),false);
    assert.ok((await page.locator('#nextHopOut').innerText()).endsWith(fixtures[i].target));
    if(i===2){
      assert.equal(await page.locator('#srcIp').innerText(),'10.77.10.10/24');
      assert.equal(await page.locator('#dstIp').innerText(),'10.77.10.140/25');
      await input(page,'#maskTry25',touch);assert.ok((await page.locator('#maskTryResult').innerText()).includes('Gateway(.1)'));
      await input(page,'#maskTry24',touch);assert.ok((await page.locator('#maskTryResult').innerText()).includes('직접 찾으려'));
    }
    if(i===2&&[360,1366].includes(width))await page.screenshot({path:resolve(out,`skill-review-${name}-${width}.png`),fullPage:true});
    await input(page,'#nextBtn',touch);
   }

   assert.equal(await page.locator('#lessonCard').isVisible(),false);
   assert.equal(await page.locator('#completionScore').innerText(),'완료 4 / 4 · 정답 2 · 다시 볼 문제 2');

   // Fresh Start remains the default for repetition learning.
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#lessonNo').innerText(),'문제 1 / 4');
   assert.equal(await page.locator('#resultArea').isVisible(),false);
   assert.equal(await page.locator('#scoreText').innerText(),'정답 0 · 다시 볼 문제 0 · 남은 문제 4');
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),legacyKey),null);

   // Evidence remains optional and source links stay live.
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('.tab').nth(1).click();await input(page,'#choices [data-value="gw"]',touch);await input(page,'#runBtn',touch);await waitComplete(page);
   await input(page,'#evidenceDetails summary',touch);
   assert.ok((await page.locator('#evidenceScope').innerText()).includes('기존 Cisco/VPCS'));
   for(const href of await page.locator('.source-links a').evaluateAll(es=>es.map(e=>e.href))){const r=await context.request.get(href);assert.ok(r.ok(),`missing evidence link ${href}`);}

   await page.addStyleTag({content:'html{font-size:200%}'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
   assert.ok((await page.locator('#modelEvent').innerText()).includes('최종 목적지 IP'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.deepEqual(errors,[]);
   checks.push({surface:name,width,height,touch,status:'PASS',checks:['single-run-observation','grade-after-flow','progressive-path','device-icons','manual-review','fresh-start','evidence-links','200%-text','forced-colors']});
   console.log(`PASS latest-skill review ${name} ${width}x${height}`);
  }catch(e){await page.screenshot({path:resolve(out,`skill-review-failure-${name}-${width}.png`),fullPage:true});throw e;}finally{await context.close();}
 }

 // Legacy persistent answers are discarded on entry.
 const context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto(`${url}/${file}`);
  await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({schema:1,index:2,answers:[{choice:'on',submitted:true},{choice:'gw',submitted:true},{choice:'drop',submitted:true},{choice:'gw',submitted:true}]})),legacyKey);
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),legacyKey),null);
  assert.equal(await page.locator('#lessonNo').innerText(),'문제 1 / 4');
  assert.equal(await page.locator('#resultArea').isVisible(),false);
  checks.push({surface:name,case:'legacy-storage-cleared',status:'PASS'});
 }finally{await context.close();}
}

try{
 await surface(base,process.env.BASE_URL?'requested-url':'local');
 if(!process.env.BASE_URL&&process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io'&&process.env.GITHUB_REF==='refs/heads/main'){
  const publicBase='https://sebia1993.github.io',context=await browser.newContext();let ready=false;
  try{
   for(let i=0;i<18;i++){try{const r=await context.request.get(`${publicBase}/${file}?qa=${version}-${i}`,{timeout:15000});if(r.ok()&&normalize(await r.text())===normalize(source)){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
   assert.ok(ready,'tested source is not yet publicly deployed');
   for(const name of ['styles.css','lab-ui.css']){const r=await context.request.get(`${publicBase}/${name}?qa=${version}`);assert.ok(r.ok());}
  }finally{await context.close();}
  await surface(publicBase,'published');
 }
}catch(e){checks.push({status:'FAIL',message:e.message});throw e;}
finally{
 await writeFile(resolve(out,'ip-skill-review-qa.json'),JSON.stringify({version,browser:browser.version(),networkLabExecuted:false,checks},null,2));
 await writeFile(resolve(out,'ip-skill-review-source.html'),source);
 await browser.close();if(server)await new Promise(r=>server.close(r));
}
