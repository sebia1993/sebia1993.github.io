// Focused browser regression for recovery state and the preserved-data example.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {finishPlayback} from './roadmap-playback-assertions.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'test-results/stage67-focused');fs.mkdirSync(output,{recursive:true});
const server=createServer((q,r)=>{try{const file=path.resolve(repo,'.'+new URL(q.url,'http://local').pathname);if(!file.startsWith(path.resolve(repo)+path.sep)){r.writeHead(403).end();return;}r.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');r.end(fs.readFileSync(file));}catch{r.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu']});
const results=[];
try {
  for(const width of [360,768,1366,1920]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-13T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-13T00:00:01Z'));
    async function open(topic){await page.goto(`http://127.0.0.1:${server.address().port}/labs/${topic}-simulator.html`);}
    async function complete(i){await page.locator(`[data-lesson="${i}"]`).click();const right=await page.evaluate(i=>{const s=window.networkLessonModel[i];return s.choices.findIndex(x=>x[0]===s.correctKey);},i);await page.locator('#simOptions button').nth(right).click();await page.locator('#simRun').click();await finishPlayback(page);}
    async function healthy(){const state=await page.evaluate(()=>({link:document.getElementById('linkData').getAttribute('class'),node:document.getElementById('nodeR1').className,ping:document.getElementById('dataToken').textContent,get:document.getElementById('r1Token').textContent,table:document.getElementById('states').textContent}));assert.match(state.link,/data-on/);assert.doesNotMatch(state.link,/data-off/);assert.doesNotMatch(state.node,/\bfail\b/);assert.match(state.ping,/3\/3/);assert.match(state.get,/Admin1 \/ Oper1/);return state;}
    await open('observability');
    for(const i of [0,1]){
      await complete(i);const final=await healthy();assert.match(final.table,/현재 장면.*복구 후/);
      await page.locator('#simReview summary').click();await page.locator('#prevStepBtn').click();await healthy();
      await page.locator('#prevStepBtn').click();assert.match(await page.locator('#linkData').getAttribute('class'),/data-off/);
      await page.locator('#nextStepBtn').click();await healthy();await page.locator('#nextStepBtn').click();await healthy();
      await page.locator('#simVisual').screenshot({path:path.join(output,`observability-${width}-${i+1}-recovered.png`)});
    }
    const title='GET과 Trap의 시작점은 같을까요?';
    for(let n=0;n<4;n++){await page.locator('[data-lesson="2"]').click();await page.locator('#simOptions button').first().click();assert.equal(await page.locator('#simTitle').textContent(),title);await page.locator('[data-lesson="0"]').click();}
    await open('network-automation');await complete(1);
    const code=()=>page.locator('#automationExample code').allTextContents();
    let texts=await code(),record=JSON.parse(texts[3]);assert.equal(texts[0],'administratively down/down');assert.equal(record.comparison,'MISMATCH');assert.equal(record.actual.admin,'down');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.locator('#automationExample').screenshot({path:path.join(output,`automation-${width}-mismatch.png`)});
    await page.locator('#simReview summary').click();
    for(let n=0;n<10&&(await page.locator('#eventTitle').textContent())!=='상태 원문 보존';n++)await page.locator('#prevStepBtn').click();
    texts=await code();assert.equal(texts[0],'administratively down/down');assert.equal(texts[1],'다음 관찰에서 확인');assert.equal(texts[3],'다음 관찰에서 확인');
    await page.locator('#nextStepBtn').click();texts=await code();assert.equal(JSON.parse(texts[1]).admin,'down');assert.equal(texts[2],'다음 관찰에서 확인');
    await page.locator('#nextStepBtn').click();texts=await code();assert.match(texts[2],/MISMATCH/);assert.equal(texts[3],'다음 관찰에서 확인');
    await complete(2);record=JSON.parse((await code())[3]);assert.equal(record.actual,null);assert.equal(record.collection_status,'ERROR');assert.equal(record.comparison,'NOT_EVALUATED');
    await page.locator('#simReset').click();assert.equal(await page.locator('#automationExample').isVisible(),false);
    assert.deepEqual(errors,[]);results.push({width,status:'PASS',checks:['OBS recovery + reverse/forward review','trap title stability','Raw→Actual→Intent→JSON progression','ERROR has no Actual','reset clears example','no horizontal overflow']});
    await page.close();console.log(`Stage 6/7 focused PASS ${width}px`);
  }
} finally {await browser.close();server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));}
