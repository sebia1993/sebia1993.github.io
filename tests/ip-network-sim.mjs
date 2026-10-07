// ARP-template parity, browser interaction, and subnet regression.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {lessons,addressWindow,subnetInfo} from '../labs/ip-subnetting-model.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');await mkdir(out,{recursive:true});
let base=process.env.BASE_URL,server;const errors=[],checks=[];
if(!base){server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}const f=resolve(root,'.'+pathname);if(!f.startsWith(root)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(f)]||'text/plain'));res.end(await readFile(f));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const url=base+'/labs/ip-subnetting-simulator.html';
function watch(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});}
async function finish(p){for(let i=0;i<7;i++)await p.clock.fastForward(6000);}
async function done(p){await p.waitForFunction(()=>document.querySelector('#ipLab').dataset.state==='COMPLETED',null,{timeout:15000});}
async function choose(p,i,id){await p.locator('[data-lesson="'+i+'"]').click();await p.locator('[data-prediction]').filter({hasText:lessons[i].choices.find(c=>c[0]===id)[1]}).click();await p.locator('#runBtn').click();}
async function overflow(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page horizontal overflow');assert.equal(await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length!==new Set(ids).size;}),false,'duplicate IDs');}
const props=['backgroundColor','backgroundImage','color','borderRadius','borderTopColor','borderTopWidth','boxShadow','fontSize','fontFamily','fontWeight','padding','maxWidth'];
async function style(p,selector){return p.locator(selector).first().evaluate((el,props)=>Object.fromEntries(props.map(k=>[k,getComputedStyle(el)[k]])),props);}
try{
 for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  const context=await browser.newContext({viewport:{width,height}}),p=await context.newPage(),ref=await context.newPage();watch(p);watch(ref);
  await ref.goto(base+'/labs/arp-default-gateway-simulator.html',{waitUntil:'networkidle'});await p.goto(url);
  // Byte-shared styles also match computed styles across the requested breakpoints.
  for(const s of ['body','.wrap','.hero','.hero h1','.card','.coach','.prediction-card','.prediction-copy h2','.prediction-options button','.ping-btn','.topology-shell','.live-event-strip','.soft-btn','.next-btn'])assert.deepEqual(await style(p,s),await style(ref,s),`style parity ${s} ${width}`);
  await p.screenshot({path:resolve(out,`subnet-initial-${width}.png`),fullPage:true});await ref.screenshot({path:resolve(out,`arp-reference-${width}.png`),fullPage:true});
  await overflow(p);assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#runBtn').isDisabled(),true);assert.equal(await p.locator('.address-block.active').count(),0);assert.equal(await p.locator('#networkOut').innerText(),'—');
  await p.clock.install();await p.locator('[data-prediction="192.168.10.64/26"]').click();assert.equal(await p.locator('#runBtn').isEnabled(),true);await p.locator('#runBtn').click();
  assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#networkOut').innerText(),'—');
  await p.clock.runFor(7600);assert.equal(await p.locator('.address-block.active').getAttribute('data-network'),'192.168.10.64');assert.equal(await p.locator('#networkOut').innerText(),'—');
  await p.locator('#playbackBtn').click();const before=await p.locator('#liveEventDetail').innerText();await p.clock.fastForward(6000);assert.equal(await p.locator('#liveEventDetail').innerText(),before);assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'PAUSED');
  await p.screenshot({path:resolve(out,`subnet-paused-${width}.png`),fullPage:true});await p.locator('#playbackBtn').click();await finish(p);await done(p);
  assert.equal(await p.locator('#verdictTitle').innerText(),'✓ 정답입니다');assert.match(await p.locator('#hostsOut').innerText(),/192.168.10.65 ~ 192.168.10.126/);await overflow(p);
  const score=await p.locator('#scoreText').innerText();await p.locator('#playbackBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);assert.match(await p.locator('#liveEventTitle').innerText(),/단계 01/);await finish(p);await done(p);assert.equal(await p.locator('#scoreText').innerText(),score);
  await p.screenshot({path:resolve(out,`subnet-completed-${width}.png`),fullPage:true});
  // A reset in motion must stay reset after the old flow's full duration.
  await p.locator('#playbackBtn').click();await p.clock.runFor(500);await p.locator('#resetBtn').click();await p.clock.fastForward(25000);assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('.address-block.active').count(),0);assert.equal(await p.locator('#resultArea').isVisible(),false);
  // Every original scenario remains selectable; only its current path lights.
  for(let i=3;i<7;i++){
   await choose(p,i,lessons[i].answer);assert.equal(await p.locator('#activeLinks path').count(),0);await p.clock.runFor(1700);assert.equal(await p.locator('#packetMarker').getAttribute('hidden'),null);await finish(p);await done(p);assert.equal(await p.locator('#verdictTitle').innerText(),'✓ 정답입니다');
   assert.equal(await p.locator('#pc1Address').innerText(),lessons[i].src+'/'+lessons[i].prefix);await overflow(p);
   if(i===5){assert.equal(await p.locator('#liveEventKind').innerText(),'응답 없음');}
   if(i===4)await p.screenshot({path:resolve(out,`subnet-network-${width}.png`),fullPage:true});
  }
  // Prefix changes in optional comparison don't change grading.
  await p.locator('#maskPanel summary').click();const oldScore=await p.locator('#scoreText').innerText();await p.locator('[data-mask="24"]').click();assert.match(await p.locator('#maskResult').innerText(),/같은 네트워크로 판단/);assert.equal(await p.locator('#scoreText').innerText(),oldScore);
  await p.locator('#resetBtn').click();await choose(p,1,lessons[1].choices[0][0]);await finish(p);await done(p);assert.equal(await p.locator('#verdictTitle').innerText(),'✕ 예상과 결과가 달랐습니다');
  await p.locator('#nextBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'IDLE');
  // Scenario change during RUNNING cancels the old run, even for rapid changes.
  await p.locator('[data-prediction]').first().click();await p.locator('#runBtn').click();await p.locator('[data-lesson="0"]').click();await p.clock.fastForward(25000);assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'IDLE');
  await p.locator('[data-view-mode="advanced"]').click();await p.locator('#calculatorPanel summary').click();
  for(const prefix of [8,16,24,25,26,27,28,29,30,31,32,0]){
   await p.locator('#ipInput').fill('192.168.10.129');await p.locator('#prefixInput').fill(String(prefix));await p.locator('#calculatorForm button[type="submit"]').click();const info=subnetInfo('192.168.10.129',prefix);assert.equal(await p.locator('[data-field="network"]').innerText(),info.network);assert.equal(await p.locator('[data-field="broadcast"]').innerText(),info.broadcast??'없음');
  }
  await p.locator('#prefixInput').fill('33');await p.locator('#calculatorForm button[type="submit"]').click();assert.equal(await p.locator('#calculatorResult .kv').count(),0);assert.equal(await p.locator('#calculatorMessage').getAttribute('class'),'error');
  await p.locator('#prefixInput').fill('26');await p.locator('#practiceInputBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#calculatorResult .kv').count(),0);await overflow(p);
  await p.reload();assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('#courseCount').innerText(),'0 / 7 완료');
  if(width===1366){
   for(let i=0;i<lessons.length;i++){
    const choice=i===1?lessons[i].choices[0][0]:lessons[i].answer;
    await p.locator('[data-prediction]').filter({hasText:lessons[i].choices.find(c=>c[0]===choice)[1]}).click();await p.locator('#runBtn').click();await finish(p);await done(p);await p.locator('#nextBtn').click();
   }
   assert.equal(await p.locator('#courseComplete').isVisible(),true);assert.match(await p.locator('#completionScore').innerText(),/정답 6 · 다시 볼 문제 1/);assert.equal(await p.locator('.summary-item').count(),7);
   await p.locator('#reviewWrongBtn').click();assert.equal(await p.locator('#verdictTitle').innerText(),'✕ 예상과 결과가 달랐습니다');
   await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#playbackBtn').click();await finish(p);await done(p);assert.match(await p.locator('#scoreText').innerText(),/정답 6/);
   await p.locator('[data-view-mode="advanced"]').click();await p.locator('#calculatorPanel summary').click();await p.locator('#randomBtn').click();assert.equal(await p.locator('#ipLab').getAttribute('data-state'),'IDLE');assert.match(await p.locator('#coachTitle').innerText(),/내 주소/);
   await p.locator('[data-prediction]').first().click();await p.locator('#runBtn').click();await p.locator('#calculatorPanel summary').click();await p.locator('#ipInput').fill('10.1.2.3');await finish(p);assert.notEqual(await p.locator('#ipLab').getAttribute('data-state'),'RUNNING');
  }
  checks.push({width,height,styleParity:true,interaction:true,overflow:false});await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'ip-arp-template-qa.json'),JSON.stringify({base,checks,errors},null,2));console.log(JSON.stringify({PASS:true,checks,errors}));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
