import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {lessons} from '../labs/physical-network-lessons.js';
const root=resolve(import.meta.dirname,'..'),out=root+'/test-results/physical-sync';await mkdir(out,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json'}[extname(path)]||'text/plain'));res.end(await readFile(root+path));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu']});
const rows=[],errors=[],hashes=[];
async function layout(p){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflow');assert.deepEqual(await p.locator('.inspection-card,.inspection-photo,.inspection-ports>div').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0&&(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1)).map(e=>e.className)),[],'inspection clipping');}
async function choose(p,i){if(await p.locator('#practiceGroup').inputValue()!==String(lessons[i].group))await p.locator('#practiceGroup').selectOption(String(lessons[i].group));await p.locator(`[data-lesson="${i}"]`).click();}
async function run(p,i,answer){await choose(p,i);if(await p.locator('#resultArea').isVisible())await p.locator('#resetBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#runBtn').isDisabled(),true);assert.equal(await p.locator('#inspectionBody [data-reveal-step]:visible').count(),0);await p.locator(`[data-prediction="${answer}"]`).click();await p.locator('#runBtn').click();assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#nextBtn').isDisabled(),true);await p.clock.runFor(12000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'COMPLETED');}
try{
 if(process.env.BASE_URL){for(const path of ['labs/physical-network-simulator.html','labs/physical-network-simulator.js','labs/physical-network-simulator.css','labs/physical-network-lessons.js','labs/images/cat5e-cross-section.jpg','labs/images/cat6-cross-section.jpg','labs/physical-network.html']){const expected=await readFile(root+'/'+path);const r=await fetch(base+'/'+path+'?qa='+Date.now());assert.equal(r.status,200,path);const actual=Buffer.from(await r.arrayBuffer()),sha256=createHash('sha256').update(actual).digest('hex');assert.equal(sha256,createHash('sha256').update(expected).digest('hex'),path);hashes.push({path,sha256});}}
 for(const [width,height]of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  const c=await browser.newContext({viewport:{width,height}}),p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await p.goto(base+'/labs/physical-network-simulator.html?qa='+Date.now(),{waitUntil:'networkidle'});await p.clock.install();await layout(p);
  assert.equal(await p.locator('#practiceGroup option').count(),3);assert.equal(await p.locator('[data-lesson]:visible').count(),4);assert.equal(await p.locator('[data-part="sfpa"] strong').innerText(),'지빅 A');
  assert.match(await p.locator('[data-part="distribution"] small').innerText(),/L3/);
  for(let i=4;i<lessons.length;i++){
   await choose(p,i);await layout(p);assert.equal(await p.locator('#physicalTopology').isVisible(),false);
   if(i===4){
    for(const img of await p.locator('.inspection-photo img').all()){await img.evaluate(e=>e.decode());assert.deepEqual(await img.evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1200,900]);}
    await p.locator('#inspectionSurface').screenshot({path:out+`/photos-initial-${width}.png`});
    const photoLink=p.locator('.inspection-photo>a').first();await photoLink.focus();const popupPromise=p.waitForEvent('popup');await p.keyboard.press('Enter');const popup=await popupPromise;await popup.waitForLoadState('load');await popup.locator('img').evaluate(e=>e.decode());assert.deepEqual(await popup.locator('img').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[4032,3024]);await popup.close();
   }
   await run(p,i,lessons[i].answer);assert.match(await p.locator('#verdictTitle').innerText(),/정답입니다/);await layout(p);
   assert.equal(await p.locator('.live-event-strip').count(),1);assert.equal(await p.locator('.live-event-strip:visible').count(),1);
   assert.equal(await p.locator('#conceptSectionLink').getAttribute('href'),'physical-network.html#'+lessons[i].anchor);
   await p.locator('#inspectionSurface').screenshot({path:out+`/lesson-${i}-${width}.png`});
   const score=await p.locator('#scoreText').innerText();await p.locator('#reviewPanel summary').click();await p.locator('#prevEvent').click();assert.equal(await p.locator('#resultArea').isVisible(),false);await p.locator('#nextEvent').click();assert.equal(await p.locator('#scoreText').innerText(),score);
   await p.locator('#playbackBtn').click();await p.clock.runFor(600);await p.locator('#playbackBtn').click();const title=await p.locator('#liveEventTitle').innerText();await p.clock.runFor(9000);assert.equal(await p.locator('#liveEventTitle').innerText(),title);await p.locator('#playbackBtn').click();await p.clock.runFor(12000);assert.equal(await p.locator('#scoreText').innerText(),score);
  }
  // A wrong answer changes the grade, never the underlying documentary observation.
  await run(p,9,0);assert.match(await p.locator('#verdictTitle').innerText(),/예상과 결과/);assert.match(await p.locator('#inspectionBody').innerText(),/후보: 전체 OM3/);
  const prior=await p.locator('#scoreText').innerText();await choose(p,4);await choose(p,9);assert.equal(await p.locator('#scoreText').innerText(),prior);assert.match(await p.locator('#chosenAnswer').innerText(),/싱글모드/);
  // Active timers cannot leak across observation types or groups.
  await p.locator('#playbackBtn').click();await p.clock.runFor(400);await p.locator('#practiceGroup').selectOption('0');await p.clock.runFor(20000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('#resultArea').isVisible(),false);assert.equal(await p.locator('#physicalTopology').isVisible(),true);
  await choose(p,4);await p.locator('#playbackBtn').click();await p.clock.runFor(400);await p.locator('#resetBtn').click();await p.clock.runFor(20000);assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('.inspecting').count(),0);assert.equal(await p.locator('[data-reveal-step]:visible').count(),0);
  // Scrolled controls must receive the actual hit, not merely have layout bounds.
  await p.locator('#resetBtn').scrollIntoViewIfNeeded();const hit=await p.locator('#resetBtn').evaluate(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,ok:e.contains(document.elementFromPoint(x,y))};});assert.ok(hit.ok);await p.mouse.click(hit.x,hit.y);
  if(width===360){
   await p.evaluate(()=>{const es=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,n]of es)e.style.setProperty('font-size',n*2+'px','important');});await layout(p);await p.locator('#inspectionSurface').screenshot({path:out+'/text-200.png'});await p.reload({waitUntil:'networkidle'});
   await choose(p,11);await p.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await run(p,11,1);await layout(p);await p.locator('#inspectionSurface').screenshot({path:out+'/forced-reduced.png'});await p.emulateMedia({forcedColors:'none',reducedMotion:'no-preference'});
  }
  await p.locator('#conceptSectionLink').click();await p.waitForURL('**/physical-network.html#*');assert.equal(await p.locator('.cg-primary').count(),1);await p.goBack();await p.waitForSelector('[data-prediction]');assert.equal(await p.locator('#physicalLab').getAttribute('data-state'),'IDLE');assert.equal(await p.locator('#practiceGroup').inputValue(),'0');assert.match(await p.locator('#courseCount').innerText(),/0 \/ 12/);
  rows.push({width,height,allExtensions:'PASS',photoOriginal:'PASS',noEarlyResult:'PASS',pauseReplayReset:'PASS',groupTimerIsolation:'PASS',gradeIntegrity:'PASS',navigation:'PASS'});console.log(width,'PASS');await c.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/'+(process.env.BASE_URL?'public':'local')+'.json',JSON.stringify({base,checkedAt:new Date().toISOString(),rows,errors,hashes,networkLabExecuted:false,scope:'Browser teaching-model QA; no physical measurements'},null,2));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
