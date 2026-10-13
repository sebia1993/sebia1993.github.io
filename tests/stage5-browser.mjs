import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'test-results/stage5-focused');
fs.mkdirSync(output,{recursive:true});
const server=createServer((req,res)=>{
 try{
  const file=path.resolve(repo,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(repo)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');
  res.end(fs.readFileSync(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu']});
const topics=['wifi-rf','wlan-association','dot1x-radius','roaming-wlan-troubleshooting'];
const selectedLesson=[4,5,1,2];
const expectedQuestion=['이 두 Channel Allocation은?','PMF에 대한 올바른 설명은 무엇일까요?','Switch A가 서버 쪽 구간에 전달하는 방식은?','전환 이후 서비스 성공을 확인하려면 무엇이 더 필요할까요?'];
const checks=[];
async function finish(page){
 for(let i=0;i<40;i++){
  if(await page.locator('#simLab').getAttribute('data-state')==='COMPLETED')return;
  await page.clock.fastForward(Number(await page.locator('#simLab').getAttribute('data-event-duration-ms'))+40);
 }
 throw Error('Observation did not complete');
}
try{
 for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  for(let topicIndex=0;topicIndex<topics.length;topicIndex++){
   const topic=topics[topicIndex],page=await browser.newPage({viewport:{width,height}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
   await page.goto(`${base}/labs/${topic}.html`);
   await page.locator('#cg-picture').scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${topic} concept overflow`);
   if(topic==='wifi-rf'){
    const diagram=page.locator('img[src="wifi-rf-spectrum.svg"]');
    assert.ok(await diagram.evaluate(e=>e.complete&&e.naturalWidth>0));
    assert.ok((await diagram.boundingBox()).width<=400);
   }
   if(topic==='wlan-association'){
    const basic=await page.locator('#cg-terms').innerText();
    for(const term of ['ANonce','SNonce','MIC','PMF'])assert.ok(basic.includes(term),`${term} taught before optional evidence`);
   }
   assert.ok(await page.locator('.cg-sources a').count()>0,`${topic} official source links`);
   await page.locator('#cg-picture').screenshot({path:path.join(output,`${topic}-${width}-concept.png`)});
   await page.goto(`${base}/labs/${topic}-simulator.html`);
   const now=new Date('2026-10-13T00:00:00Z');
   await page.clock.install({time:now});await page.clock.pauseAt(new Date(now.getTime()+1000));
   await page.locator(`[data-lesson="${selectedLesson[topicIndex]}"]`).click();
   assert.equal(await page.locator('#simQuestion').innerText(),await page.evaluate(q=>window.networkLessonPresent(q),expectedQuestion[topicIndex]));
   assert.equal(await page.locator('#simResult').isVisible(),false);
   assert.equal(await page.locator('#simRun').isDisabled(),true);
   if(topic==='dot1x-radius')assert.doesNotMatch(await page.locator('#simConditions').innerText(),/hash|SHA|Identifier|해시/);
   if(topic==='wlan-association')assert.doesNotMatch(await page.locator('#wlanFlow').innerText(),/Supplicant|Authenticator/);
   const model=await page.evaluate(i=>window.networkLessonModel[i],selectedLesson[topicIndex]);
   const answer=model.choices.findIndex(([key])=>key===model.correctKey);
   await page.locator('#simOptions button').nth(answer).click();
   await page.locator('#simRun').click();await finish(page);
   assert.equal(await page.locator('#simVerdict').innerText(),'✓ 정답입니다');
   if(topic==='wifi-rf'){
    assert.equal(await page.locator('.rf-spectrum-diagram').count(),1);
    assert.ok(await page.locator('.rf-spectrum-diagram').evaluate(e=>e.complete&&e.naturalWidth>0));
   }
   if(topic==='wlan-association')assert.doesNotMatch(await page.locator('#simVisual').innerText(),/AP A A|RSN|AKM/);
   if(topic==='dot1x-radius')assert.doesNotMatch(await page.locator('#simVisual').innerText(),/SHA-256|exact-match|20개 EAP/);
   if(topic==='roaming-wlan-troubleshooting'){
    await page.locator('#simReview summary').click();await page.locator('#prevStepBtn').click();
    const scene=await page.locator('#simVisual').innerText();
    assert.ok(scene.includes('21:53:59.692212232')&&scene.includes('21:54:25.913247615'));
   }
   await page.locator('#simVisual').scrollIntoViewIfNeeded();
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${topic} scene overflow`);
   await page.locator('#simVisual').screenshot({path:path.join(output,`${topic}-${width}-scene.png`)});
   assert.deepEqual(errors,[]);
   checks.push({topic,width,status:'PASS'});await page.close();
  }
 }
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(checks,null,2));
}
console.log(`PASS Stage 5 focused content/scene checks: ${checks.length} topic/viewport combinations`);
