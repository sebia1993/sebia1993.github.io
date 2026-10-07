import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const file='labs/ip-subnetting-simulator.html',version='20261007-topology-sim-v4';
const normalize=s=>s.replace(/\r\n/g,'\n').trim(),checks=[];
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{
  const pth=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pth==='/favicon.ico'){res.writeHead(204).end();return;}
  const p=resolve(root,'.'+pth);if(!p.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  const b=await readFile(p);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'}[extname(p)]||'application/octet-stream'),'Cache-Control':'no-store'}).end(b);
 }catch{res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
}
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
const matrix=[[360,800,true],[412,915,true],[800,360,true],[768,1024,true],[1366,768,false],[1920,1080,false]];

async function waitComplete(page){
 await page.waitForFunction(()=>document.querySelector('#modelObservation')?.dataset.flowState==='complete',undefined,{timeout:7000});
}
async function runScenario(page,tab,choice,{inspectStart=false}={}){
 await page.locator('.tab').nth(tab).click();
 if(await page.locator('#resetBtn').isVisible())await page.locator('#resetBtn').click();
 await page.locator('#choices [data-value="'+choice+'"]').click();
 assert.equal(await page.locator('#runBtn').innerText(),'② 실행해서 확인하기');
 await page.locator('#runBtn').click();
 assert.equal(await page.locator('#modelObservation').isVisible(),true);
 assert.equal(await page.locator('#verdict').isVisible(),false,'grade must stay hidden while the flow is playing');
 assert.equal(await page.locator('#resultActions').isVisible(),false,'Next/Retry must stay hidden while the flow is playing');
 if(inspectStart){
  assert.equal(await page.locator('#simTopology [data-sim-id].on-route').count(),0,'prefix comparison must not pre-highlight the final route');
  assert.equal(await page.locator('#simEventKind').innerText(),'PREFIX');
 }
 await waitComplete(page);
 assert.equal(await page.locator('#verdict').isVisible(),true);
 assert.equal(await page.locator('#resultActions').isVisible(),true);
 assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'complete');
}
async function openFlow(page){
 assert.equal(await page.locator('#simFlowDetails').isVisible(),true);
 if((await page.locator('#simFlowDetails').getAttribute('open'))===null)await page.locator('#simFlowDetails summary').click();
}

async function verify(url,surface){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  try{
   assert.equal((await page.goto(url+'/'+file,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('meta[name=network-sim-version]').getAttribute('content'),version);
   assert.equal(await page.locator('#modelObservation').isVisible(),false);
   assert.equal(await page.locator('#simTopology [data-device-shape=host]').count(),3);
   assert.equal(await page.locator('#simTopology [data-device-shape=router]').count(),1);
   // The device SVG language is intentionally similar to Ethernet/MAC Table.
   assert.equal(await page.locator('#simTopology [data-device-shape=host] svg[viewBox="0 0 100 85"]').count(),3);
   assert.equal(await page.locator('#simTopology [data-device-shape=router] svg[viewBox="0 0 120 80"]').count(),1);

   // Keep the full-motion playback on two representative widths; speed the rest up via Reduced Motion.
   if(![360,1366].includes(width))await page.emulateMedia({reducedMotion:'reduce'});

   // Same-subnet: one Run starts observation automatically and hides the grade until the flow completes.
   await page.locator('#choices [data-value="gw"]').click(); // deliberately wrong prediction
   await page.locator('#runBtn').click();
   assert.equal(await page.locator('#verdict').isVisible(),false);
   assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'playing');
   assert.equal(await page.locator('#simEventKind').innerText(),'PREFIX');
   assert.equal(await page.locator('#simTopology [data-sim-id].on-route').count(),0);

   if([360,1366].includes(width)){
    await page.waitForFunction(()=>document.querySelector('#simStepLabel')?.textContent==='흐름 2 / 4',undefined,{timeout:5000});
    assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'arp-request');
    await page.locator('#simAutoBtn').click();
    const paused=await page.locator('#simStepLabel').textContent();
    assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'paused');
    await page.waitForTimeout(950);
    assert.equal(await page.locator('#simStepLabel').textContent(),paused,'pause advanced to a new event');
    await page.locator('#simAutoBtn').click();
   }
   await waitComplete(page);
   assert.equal(await page.locator('#verdictTitle').innerText(),'✕ 오답입니다');
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'direct-path');
   assert.equal(await page.locator('#simPacket').innerText(),'IPv4');
   assert.equal(await page.locator('#simAutoBtn').innerText(),'↻ 흐름 다시 보기');

   // Manual fallback is available only after the automatic observation completes.
   const scoreAfterFirst=await page.locator('#scoreText').innerText();
   await openFlow(page);
   await page.locator('#simPrev').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'arp-reply');
   await page.locator('#simNext').click();
   assert.equal(await page.locator('#scoreText').innerText(),scoreAfterFirst,'manual review changed score');

   // Routed case: final route must NOT be shown at Prefix/ARP-request steps.
   await runScenario(page,1,'gw',{inspectStart:true});
   assert.equal(await page.locator('#verdictTitle').innerText(),'✓ 정답입니다');
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'routed-path');
   assert.equal(await page.locator('#simTopology [data-sim-id=link-a-r1]').evaluate(e=>e.classList.contains('on-route')),true);
   assert.equal(await page.locator('#simTopology [data-sim-id=link-r1-b]').evaluate(e=>e.classList.contains('on-route')),true);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc2]').evaluate(e=>e.classList.contains('is-current')),true);

   // Replay is observation-only. Switching to a new completed/available problem cancels the replay.
   const beforeReplay=await page.locator('#scoreText').innerText();
   await page.locator('#simAutoBtn').click();
   assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'playing');
   await page.locator('.tab').nth(2).click();
   await page.waitForTimeout(600);
   assert.equal(await page.locator('#lessonNo').innerText(),'문제 3 / 4');
   assert.equal(await page.locator('#resultArea').isVisible(),false);
   assert.equal(await page.locator('#scoreText').innerText(),beforeReplay);

   // Wrong /24: ARP never reaches the remote host and the final state stops at the LAN boundary/router side.
   await page.locator('#choices [data-value="gw"]').click();await page.locator('#runBtn').click();await waitComplete(page);
   assert.equal(await page.locator('#verdictTitle').innerText(),'✕ 오답입니다');
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'unresolved-arp');
   assert.equal(await page.locator('#simPacket').innerText(),'응답 없음');
   assert.equal(await page.locator('#simTopology [data-sim-id=r1]').evaluate(e=>e.classList.contains('is-stop')),true);
   assert.equal(await page.locator('#simTopology [data-sim-id=link-r1-b]').evaluate(e=>e.classList.contains('on-route')),false);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc2]').evaluate(e=>e.classList.contains('on-route')),false);

   // Recovery returns to the validated routed path.
   await runScenario(page,3,'gw',{inspectStart:true});
   assert.equal(await page.locator('#verdictTitle').innerText(),'✓ 정답입니다');
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'routed-path');
   assert.equal(await page.locator('#simPacket').innerText(),'IPv4');

   const layout=await page.evaluate(()=>{
    const a=document.querySelector('[data-sim-id=lana]').getBoundingClientRect(),r=document.querySelector('[data-sim-id=r1]').getBoundingClientRect(),b=document.querySelector('[data-sim-id=lanb]').getBoundingClientRect();
    return {ordered:r.left>a.right-2&&b.left>r.right-2,inside:a.left>=0&&b.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(layout.overflow,false);assert.equal(layout.inside,true);assert.equal(layout.ordered,true);

   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('#simAutoBtn').click();await waitComplete(page);
   assert.equal(await page.locator('#simPacket').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
   await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
   assert.ok((await page.locator('#modelCaption').innerText()).includes('SW1/SW2 내부 동작은 생략'));
   if([360,1366].includes(width))await page.locator('#modelObservation').screenshot({path:resolve(out,'network-sim-'+surface+'-'+width+'.png')});
   assert.deepEqual(errors,[]);
   checks.push({surface,width,height,touch,status:'PASS',checks:['single-run-observation','grade-after-observation','progressive-path-reveal','device-shaped-icons','packet-motion','pause-resume','replay','manual-fallback','timer-cancel','failure-stop','responsive','reduced-motion','forced-colors']});
   console.log('PASS network sim '+surface+' '+width+'x'+height);
  }finally{await context.close();}
 }
}

try{
 await verify(base,process.env.BASE_URL?'requested-url':'local');
 if(!process.env.BASE_URL&&process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io'&&process.env.GITHUB_REF==='refs/heads/main'){
  const publicBase='https://sebia1993.github.io',expected=normalize(await readFile(resolve(root,file),'utf8')),context=await browser.newContext();let ready=false;
  try{
   for(let i=0;i<18;i++){try{const r=await context.request.get(publicBase+'/'+file+'?qa='+version+'-'+i,{timeout:15000});if(r.ok()&&normalize(await r.text())===expected){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
   assert.ok(ready,'tested simulator source not yet published');
  }finally{await context.close();}
  await verify(publicBase,'published');
 }
}catch(e){checks.push({status:'FAIL',message:e.message});throw e;}
finally{await writeFile(resolve(out,'ip-network-sim-qa.json'),JSON.stringify({version,networkLabExecuted:false,checks},null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
