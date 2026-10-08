import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {scenarios,baseline,derive} from '../labs/physical-network-model.js';
import {lessons} from '../labs/physical-network-lessons.js';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'test-results/physical-network');await mkdir(out,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(path)]||'text/plain'));res.end(await readFile(root+path));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
let proxy;if(process.env.BASE_URL&&process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu'],...(proxy?{proxy}:{})});
const errors=[],rows=[];
async function geometry(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflow');const bad=await p.locator('.phy-element').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width>0&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)).map(e=>e.dataset.part));assert.deepEqual(bad,[],'node clipping');const overlap=await p.locator('.phy-element').evaluateAll(els=>{let a=els.map(e=>({id:e.dataset.part,r:e.getBoundingClientRect()}));let bad=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){let x=a[i].r,y=a[j].r;if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>3&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>3)bad.push([a[i].id,a[j].id]);}return bad;});assert.deepEqual(overlap,[],'node overlap');}
async function finish(p){await p.clock.runFor(12000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'COMPLETED');}
async function run(p,i,answer){await p.locator(`[data-lesson="${i}"]`).click();if(await p.locator('#resultArea').isVisible())await p.locator('#resetBtn').click();await p.locator(`[data-prediction="${answer}"]`).click();await p.locator('#runBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);await finish(p);}
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});p.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));}
try{
 for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  const c=await browser.newContext({viewport:{width,height},ignoreHTTPSErrors:Boolean(proxy)}),p=await c.newPage();watch(p);
  const resp=await p.goto(base+'/labs/physical-network.html',{waitUntil:'networkidle',timeout:60000});assert.equal(resp.status(),200);await geometry(p);const guideText=await p.locator('body').innerText();assert.doesNotMatch(guideText,/AP01|Access Switch|상위 Switch|CONCEPT GUIDE|INTERACTIVE LAB|Mental Model|Cable Type|Teaching Simplification|NOT_RUN/);await p.screenshot({path:resolve(out,`concept-${width}.png`),fullPage:true});
  assert.equal(await p.locator('.cg-primary').count(),1);await p.locator('.cg-evidence summary').click();assert.equal(await p.locator('.source-body').isVisible(),true);await geometry(p);await p.locator('.cg-primary').click();await p.waitForURL('**/physical-network-simulator.html');
  assert.equal(await p.locator('#runBtn').isDisabled(),true);assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('[data-part="ap1"] strong').innerText(),'AP A');assert.equal(await p.locator('[data-part="ap2"] strong').innerText(),'AP B');assert.equal(await p.locator('[data-part="access"] strong').innerText(),'Switch A');assert.equal(await p.locator('[data-part="distribution"] strong').innerText(),'Switch B');const labText=await p.locator('body').innerText();assert.doesNotMatch(labText,/AP01|AP02|Access Switch|상위 Switch|PHYSICAL NETWORK|Teaching Simulation|Reset ·|ONLINE|CONNECTED|REMOVED/);assert.equal(await p.locator('#ap1Status').innerText(),'관찰 전');assert.equal(await p.locator('#utp1Status').innerText(),'관찰 전');await geometry(p);await p.screenshot({path:resolve(out,`initial-${width}.png`),fullPage:true});
  await p.clock.install();
  for(let i=0;i<4;i++){
   await run(p,i,scenarios[i].answer);assert.match(await p.locator('#verdictTitle').innerText(),/정답입니다/);
   const expect=[['정상','정상','정상'],['연결 끊김','정상','정상'],['상위망 영향','상위망 영향','끊김'],['상위망 영향','상위망 영향','끊김']][i];
   assert.match(await p.locator('#ap1Status').innerText(),new RegExp(expect[0]));assert.match(await p.locator('#ap2Status').innerText(),new RegExp(expect[1]));assert.match(await p.locator('#uplinkStatus').innerText(),new RegExp('상위 연결 '+expect[2]));assert.equal(await p.locator('#accessStatus').innerText(),'전원 켜짐');
   if(i===2){assert.match(await p.locator('#sfpaStatus').innerText(),/제거됨/);assert.match(await p.locator('#ap1Status').innerText(),/전원 켜짐/);}
   if(i===3){assert.match(await p.locator('#sfpaStatus').innerText(),/정상/);assert.match(await p.locator('#fiberaStatus').innerText(),/분리됨/);}
   await geometry(p);await p.screenshot({path:resolve(out,`${scenarios[i].id}-${width}.png`),fullPage:true});
   const score=await p.locator('#scoreText').innerText();await p.locator('#playbackBtn').click();await finish(p);assert.equal(await p.locator('#scoreText').innerText(),score);
   await p.locator('#resetBtn').click();assert.match(await p.locator('#uplinkStatus').innerText(),i===0?/관찰 전/:/상위 연결 정상/);assert.match(await p.locator('#ap1Status').innerText(),i===0?/관찰 전/:/정상/);assert.equal(await p.locator('.disconnected').count(),0);assert.equal(await p.locator('#resultArea').isVisible(),false);
   await p.locator(`[data-prediction="${scenarios[i].answer}"]`).click();await p.locator('#runBtn').click();await finish(p);
  }
  await p.locator('#nextBtn').click();assert.equal(await p.locator('#courseComplete').isVisible(),false);for(let i=4;i<lessons.length;i++){await p.locator(`[data-prediction="${lessons[i].answer}"]`).click();await p.locator('#runBtn').click();await finish(p);await p.locator('#nextBtn').click();}assert.equal(await p.locator('#courseComplete').isVisible(),true);assert.match(await p.locator('#completionScore').innerText(),/정답 12 · 오답 0/);await p.locator('#restartBtn').click();
  // Wrong prediction changes grade, not the simulated physical state.
  await run(p,1,1);assert.match(await p.locator('#verdictTitle').innerText(),/예상과 결과/);assert.match(await p.locator('#ap1Status').innerText(),/연결 끊김/);assert.match(await p.locator('#ap2Status').innerText(),/정상/);
  await p.locator('#reviewPanel summary').click();await p.locator('#prevEvent').click();const score=await p.locator('#scoreText').innerText();await p.locator('#nextEvent').click();assert.equal(await p.locator('#scoreText').innerText(),score);
  // Pause preserves the remaining time and state; reset cancels delayed callbacks.
  await p.locator('#playbackBtn').click();await p.clock.runFor(700);await p.locator('#playbackBtn').click();const event=await p.locator('#liveEventTitle').innerText();await p.clock.runFor(6000);assert.equal(await p.locator('#liveEventTitle').innerText(),event);await p.locator('#playbackBtn').click();await p.clock.runFor(1500);assert.equal(await p.locator('#liveEventTitle').innerText(),event);await finish(p);
  await p.locator('#playbackBtn').click();await p.clock.runFor(2800);await p.locator('#resetBtn').click();await p.clock.runFor(25000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('.disconnected').count(),0);
  await p.locator('[data-prediction="0"]').click();await p.locator('#runBtn').click();await p.locator('[data-lesson="2"]').click();await p.clock.runFor(25000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');
  for(const part of Object.keys((await import('../labs/physical-network-model.js')).roles)){await p.locator(`[data-part="${part}"]`).click();assert.ok((await p.locator('#roleDetail').innerText()).length>15);}
  // Actual hit test on scrolled reset control.
  await p.locator('#resetBtn').scrollIntoViewIfNeeded();assert.equal(await p.locator('#resetBtn').evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===top||e.contains(top)}),true);
  await p.locator('#conceptGuideLink').click();await p.waitForURL('**/physical-network.html');await p.goBack();assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');assert.match(await p.locator('#courseCount').innerText(),/0 \/ 12/);
  await p.reload();await p.waitForSelector('[data-prediction]');assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');
  await p.goto(base+'/roadmap.html',{waitUntil:'networkidle'});assert.equal(await p.locator('.topic h4').first().innerText(),'물리 네트워크 / UTP · Fiber · SFP');assert.deepEqual((await p.locator('.topic h4').allTextContents()).slice(1,5),['IP 주소 / Subnetting','Ethernet / MAC Table','ARP / Default Gateway','ICMP / Ping / Traceroute']);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.locator('.topic').first().locator('a').first().click();await p.waitForURL('**/physical-network.html');
  rows.push({width,height,layout:'PASS',scenarios:'PASS',replayReset:'PASS',prediction:'PASS',navigation:'PASS',consoleAssets:'PASS'});console.log(`${width} × ${height}: PASS`);await c.close();
 }
 // Model contract checks all combinations including conditions not exposed as scenarios.
 for(let bits=0;bits<64;bits++){const m=Object.fromEntries(Object.keys(baseline()).map((k,i)=>[k,Boolean(bits&(1<<i))]));const d=derive(m);assert.equal(d.uplink,m.sfpa&&m.sfpb&&m.fibera&&m.fiberb);assert.equal(d.ap1.power,m.utp1);assert.equal(d.ap2.power,m.utp2);assert.equal(d.accessPower,true);}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,process.env.BASE_URL?'public.json':'local.json'),JSON.stringify({base,checkedAt:new Date().toISOString(),rows,errors,hardware:'NOT_RUN',classification:'Teaching Simulation QA'},null,2));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
