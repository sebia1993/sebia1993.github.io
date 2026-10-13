/** Whole-roadmap audit regressions: attempts, navigation, review and display stability. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {finishPlayback} from './roadmap-playback-assertions.mjs';
const root=process.cwd();let server;
let base=process.env.BASE_URL;
if(!base){server=createServer((req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://x').pathname);if(!p.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(p)]||'text/plain');res.end(fs.readFileSync(p));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu']});
const results=[];
try{for(const topic of ['icmp-troubleshooting','wlan-association','observability']){
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.goto(base+'/labs/'+topic+'-simulator.html');
 const lessons=await page.evaluate(()=>window.networkLessonModel);
 const choose=async(i,correct)=>{const lesson=lessons[i],j=lesson.choices.findIndex(([key])=>(key===lesson.correctKey)===correct);await page.locator('#simOptions button').nth(j).click();};
 const run=async()=>{await page.locator('#simRun').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'simPlayback','run transfers keyboard focus to playback');await finishPlayback(page);assert.equal(await page.evaluate(()=>document.activeElement.id),'simVerdict','completion transfers keyboard focus to result');};
 await choose(0,true);await run();
 const choice=await page.locator('#simChosen').innerText();
 await page.locator('[data-lesson="1"]').click();await page.locator('[data-lesson="0"]').click();
 assert.equal(await page.locator('#simLab').getAttribute('data-state'),'COMPLETED','completed attempt restored');
 assert.equal(await page.locator('#simChosen').innerText(),choice,'restored grade belongs to same choice');
 assert.equal(await page.locator('#simOptions button:enabled').count(),0,'restored response cannot mutate without reset');
 await page.locator('#simReview summary').click();await page.locator('#prevStepBtn').click();
 assert.equal(await page.locator('#simResult').isVisible(),false,'historical scene hides final verdict');
 assert.equal(await page.locator('#simOptions .correct-answer').count(),0,'historical scene hides final answer color');
 await page.locator('#nextStepBtn').click();assert.equal(await page.locator('#simResult').isVisible(),true);
 await page.locator('#simReset').click();assert.equal(await page.locator('#simCount').innerText(),`0 / ${lessons.length} 완료`);
 await choose(0,false);await run();assert.equal(await page.locator('#simVerdict').innerText(),'✕ 예상과 달랐습니다','new attempt graded from new choice');
 const score=await page.locator('#simScore').innerText();assert.equal(score,topic==='wlan-association'?`최초 제출 · 정답 1 · 오답 0 · 미응답 ${lessons.length-1}`:`정답 0 · 오답 1 · 미응답 ${lessons.length-1}`,'score policy clearly labeled');
 await page.reload();await page.locator(`[data-lesson="${lessons.length-1}"]`).click();await choose(lessons.length-1,true);await run();await page.locator('#simNext').click();
 assert.equal(await page.locator('#simSummary').isVisible(),false,'last numbered scenario is not whole-course completion');
 assert.equal(await page.locator('#simNumber').innerText(),'1','next goes to pending scenario');
 const presentation=await page.evaluate(()=>window.networkLessonPresentation);
 const labels=[...Object.values(presentation.labels||{}),...Object.values(presentation.names||{}),...presentation.lessons.map(x=>x.title)];
 assert.deepEqual(await page.evaluate(values=>values.filter(value=>networkLessonPresent(networkLessonPresent(value))!==networkLessonPresent(value)),labels),[],'display translation is idempotent');
 assert.deepEqual(errors,[]);results.push({topic,status:'PASS',checks:['restore-and-lock','retry-grade','review','focus','first-submission-label','pending-navigation','idempotent-labels']});await page.close();
}
// Moving from a footer to another question must reveal the new focus target.
// activeElement alone missed a focused question hundreds of pixels offscreen.
for(const width of [360,1366]){
 const page=await browser.newPage({viewport:{width,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.goto(base+'/labs/observability-simulator.html');
 const lessons=await page.evaluate(()=>window.networkLessonModel);
 const visibleFocus=async(id,label)=>{
  const result=await page.evaluate(id=>{const target=document.getElementById(id),r=target.getBoundingClientRect();return {active:document.activeElement.id,top:r.top,bottom:r.bottom,height:innerHeight};},id);
  assert.equal(result.active,id,label+' receives focus');
  assert.ok(result.top>=0&&result.bottom<=result.height,label+' is fully visible: '+JSON.stringify(result));
 };
 const complete=async i=>{
  const s=lessons[i],answer=s.choices.findIndex(([key])=>key===s.correctKey);
  await page.locator('#simOptions button').nth(answer).click();await page.locator('#simRun').click();await finishPlayback(page);
 };
 for(let i=0;i<lessons.length;i++){
  await complete(i);
  // Playwright brings the footer control into view before activating it.
  await page.locator('#simNext').click();
  if(i<lessons.length-1){
   assert.equal(await page.locator('#simNumber').innerText(),String(i+2));
   await visibleFocus('simQuestion',`${width}px next question`);
  }
 }
 assert.equal(await page.locator('#simSummary').isVisible(),true);
 await visibleFocus('simSummaryScore',`${width}px completion summary`);
 await page.locator('#simSummaryList button').last().click();
 assert.equal(await page.locator('#simLab').getAttribute('data-state'),'COMPLETED');
 await visibleFocus('simQuestion',`${width}px restored question`);
 assert.deepEqual(errors,[]);
 results.push({topic:'observability',viewport:width,status:'PASS',checks:['next-question-visible-focus','summary-visible-focus','restored-question-visible-focus']});
 await page.close();
}
fs.mkdirSync('test-results/audit',{recursive:true});fs.writeFileSync('test-results/audit/session-regressions.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();server?.close();}
