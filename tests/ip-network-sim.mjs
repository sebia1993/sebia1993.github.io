import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const file='labs/ip-subnetting-simulator.html',version='20261007-topology-sim-v3';
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
async function submit(page,tab,choice){
 await page.locator('.tab').nth(tab).click();
 if(await page.locator('#resetBtn').isVisible())await page.locator('#resetBtn').click();
 await page.locator('#choices [data-value="'+choice+'"]').click();await page.locator('#runBtn').click();
}
async function openFlow(page){
 if((await page.locator('#simFlowDetails').getAttribute('open'))===null)await page.locator('#simFlowDetails summary').click();
}
async function verify(url,surface){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  try{
   assert.equal((await page.goto(url+'/'+file,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('meta[name=network-sim-version]').getAttribute('content'),version);
   assert.equal(await page.locator('#modelObservation').isVisible(),false);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc1]').count(),1);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc2]').count(),1);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc3]').count(),1);
   assert.equal(await page.locator('#simTopology [data-sim-id=r1]').count(),1);
   assert.equal(await page.locator('#simTopology [data-sim-id=lana]').count(),1);
   assert.equal(await page.locator('#simTopology [data-sim-id=lanb]').count(),1);
   assert.equal(await page.locator('#simTopology [data-device-shape=host]').count(),3);
   assert.equal(await page.locator('#simTopology [data-device-shape=router]').count(),1);

   await submit(page,0,'gw'); // deliberately wrong; model must still show validated behavior.
   assert.equal(await page.locator('#verdictTitle').innerText(),'✕ 오답입니다');
   assert.ok((await page.locator('#modelEvent').innerText()).includes('10.77.10.20'));
   assert.equal(await page.locator('#simFlowDetails').getAttribute('open'),null);
   assert.equal(await page.locator('#simAutoBtn').isVisible(),true);
   assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'ready');
   assert.ok((await page.locator('#simAutoEvent').innerText()).startsWith('흐름 1 / 4'));
   if([360,1366].includes(width)){
    const autoScore=await page.locator('#scoreText').innerText(),autoAnswer=await page.locator('#chosenAnswer').innerText();
    await page.locator('#simAutoBtn').click();
    assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'playing');
    await page.waitForFunction(()=>document.querySelector('#simStepLabel')?.textContent==='흐름 2 / 4',{timeout:5000});
    await page.locator('#simAutoBtn').click();
    const pausedStep=await page.locator('#simStepLabel').innerText();
    assert.equal(await page.locator('#simAutoBtn').getAttribute('data-state'),'paused');
    await page.waitForTimeout(1250);
    assert.equal(await page.locator('#simStepLabel').innerText(),pausedStep,'paused autoplay advanced unexpectedly');
    await page.locator('#simAutoBtn').click();
    await page.waitForFunction(()=>document.querySelector('#simAutoBtn')?.dataset.state==='complete',{timeout:6000});
    assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'direct-path');
    assert.equal(await page.locator('#simPacket').innerText(),'IPv4');
    assert.equal(await page.locator('#scoreText').innerText(),autoScore,'autoplay changed score');
    assert.equal(await page.locator('#chosenAnswer').innerText(),autoAnswer,'autoplay changed answer');
    await page.locator('#simAutoBtn').click();
    assert.equal(await page.locator('#simStepLabel').innerText(),'흐름 1 / 4','replay must restart at first event');
    await page.locator('#simAutoBtn').click();
   }
   await openFlow(page);
   assert.equal(await page.locator('#modelTarget').innerText(),'10.77.10.20');
   assert.equal(await page.locator('#simDecision').innerText(),'ON-LINK');
   assert.equal(await page.locator('#simStepLabel').innerText(),'흐름 1 / 4');
   await page.locator('#simNext').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'arp-request');
   assert.ok((await page.locator('#simStepText').innerText()).includes('10.77.10.20'));
   assert.equal(await page.locator('#simTopology [data-sim-id=pc3]').evaluate(e=>e.classList.contains('is-current')),true);
   await page.locator('#simNext').click();await page.locator('#simNext').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'direct-path');
   assert.equal(await page.locator('#simPacket').innerText(),'IPv4');

   await submit(page,1,'gw');
   assert.ok((await page.locator('#modelEvent').innerText()).includes('10.77.10.1'));
   await openFlow(page);
   assert.equal(await page.locator('#modelTarget').innerText(),'10.77.10.1');
   assert.equal(await page.locator('#simDecision').innerText(),'VIA GATEWAY');
   for(let i=0;i<3;i++)await page.locator('#simNext').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'routed-path');
   assert.equal(await page.locator('#simTopology [data-sim-id=pc2]').evaluate(e=>e.classList.contains('is-current')),true);
   assert.equal(await page.locator('#simTopology [data-sim-id=link-r1-b]').evaluate(e=>e.classList.contains('on-route')),true);

   await submit(page,2,'gw');
   assert.equal(await page.locator('#verdictTitle').innerText(),'✕ 오답입니다');
   assert.ok((await page.locator('#modelEvent').innerText()).includes('10.77.10.140'));
   await openFlow(page);
   assert.equal(await page.locator('#modelTarget').innerText(),'10.77.10.140');
   assert.equal(await page.locator('#simDecision').innerText(),'ON-LINK로 오판');
   await page.locator('#simNext').click();await page.locator('#simNext').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'unresolved-arp');
   assert.equal(await page.locator('#simPacket').innerText(),'응답 없음');
   assert.equal(await page.locator('#simTopology [data-sim-id=r1]').evaluate(e=>e.classList.contains('is-stop')),true);
   assert.equal(await page.locator('#simTopology [data-sim-id=link-r1-b]').evaluate(e=>e.classList.contains('on-route')),false);
   assert.equal(await page.locator('#simTopology [data-sim-id=pc2]').evaluate(e=>e.classList.contains('on-route')),false);
   assert.ok((await page.locator('#modelEvent').innerText()).includes('원격 전달 전 중단'));

   const score=await page.locator('#scoreText').innerText();
   await page.locator('#simPrev').click();await page.locator('#simNext').click();
   assert.equal(await page.locator('#scoreText').innerText(),score,'sim playback changed current-page learner state');

   await submit(page,3,'gw');await openFlow(page);for(let i=0;i<3;i++)await page.locator('#simNext').click();
   assert.equal(await page.locator('#simStepText').getAttribute('data-kind'),'routed-path');
   assert.equal(await page.locator('#simPacket').innerText(),'IPv4');

   const layout=await page.evaluate(()=>{
    const a=document.querySelector('[data-sim-id=lana]').getBoundingClientRect(),r=document.querySelector('[data-sim-id=r1]').getBoundingClientRect(),b=document.querySelector('[data-sim-id=lanb]').getBoundingClientRect();
    return {ordered:r.left>a.right-2&&b.left>r.right-2,inside:a.left>=0&&b.right<=innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(layout.overflow,false);
   assert.equal(layout.inside,true,'topology must fit without horizontal pan');
   assert.equal(layout.ordered,true,'LAN A → R1 → LAN B order must remain visible');

   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('#simPacket').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
   await page.emulateMedia({forcedColors:'active'});
   assert.ok((await page.locator('#modelCaption').innerText()).includes('SW1/SW2 내부 동작은 생략'));
   if([360,1366].includes(width)){await page.locator('#modelObservation').screenshot({path:resolve(out,'network-sim-'+surface+'-'+width+'.png')});}
   assert.deepEqual(errors,[]);
   checks.push({surface,width,height,touch,status:'PASS',scenarios:['same-subnet','different-subnet','wrong-mask','mask-recovery'],checks:['topology','auto-playback','pause-resume-replay','manual-step-fallback','answer-independent-model','wrong-mask-stop','responsive-reflow','reduced-motion','forced-colors']});
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
