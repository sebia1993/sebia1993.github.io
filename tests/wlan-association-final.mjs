import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(repo,'.'+path);
    if(!file.startsWith(resolve(repo)+sep)){res.writeHead(403).end();return;}
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'}).end(content);
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();

await mkdir(resolve(repo,'test-results'),{recursive:true});

const errors=[];
try {
  for (const viewport of [{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}]) {
    for (const path of ['/labs/wlan-association.html','/labs/wlan-association-simulator.html','/learning/wireless/wlan-association/reference-validation-2026-10-05.html']) {
      const page=await browser.newPage({viewport});
      page.on('pageerror',e=>errors.push(e.message));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200,path);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' overflow '+viewport.width);
      if(viewport.width===360 || viewport.width===1366) await page.screenshot({path:`test-results/wlan-${path.split('/').pop()}-${viewport.width}.png`,fullPage:true});
      await page.close();
    }
  }
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/labs/wlan-association-simulator.html');
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#lessonTabs button').count(),6);
  const answers=[1,2,0,1,2,0], steps=[4,5,6,14,11,5];
  for(let i=0;i<6;i++) {
    await page.locator('#lessonTabs button').nth(i).click();
    await page.locator(`#choice-${i===0?0:answers[i]}`).check();
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#lesson').getAttribute('data-phase'),'observe');
    assert.equal(await page.locator('#options input:enabled').count(),0);
    await page.locator('#showAllBtn').click();
    assert.equal(await page.locator('#lesson').getAttribute('data-phase'),'feedback');
    assert.equal(await page.locator('#feedback').getAttribute('data-correct'),i===0?'false':'true');
    assert.equal(await page.locator('#sequenceList .wlan-event').count(),steps[i]);
  }
  await page.locator('#finishBtn').click();
  assert.equal(await page.locator('#summary').getAttribute('data-score'),'5');
  await page.locator('#reviewWrongBtn').click();
  assert.equal(await page.locator('#lesson').getAttribute('data-lesson'),'0');
  await page.locator('#choice-1').check();
  await page.locator('#runBtn').click();
  await page.locator('#showAllBtn').click();
  assert.equal(await page.locator('#feedback').getAttribute('data-correct'),'true');
  await page.locator('#exitReviewBtn').click();
  await page.locator('#finishBtn').click();
  assert.equal(await page.locator('#summary').getAttribute('data-score'),'5','retry must not inflate first-attempt score');
  await page.locator('#restartBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#lesson').getAttribute('data-phase'),'predict');
  assert.equal(await page.locator('#sequenceList .wlan-event').count(),0);
  await page.locator('#choice-1').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#runBtn').isEnabled(),true);
  await page.locator('#runBtn').click();
  await page.locator('#nextStepBtn').click();
  assert.equal(await page.locator('#stepCount').textContent(),'학습 단계 2 / 4');
  assert.equal(await page.locator('#retryBtn').isVisible(),false);
  await page.locator('#showAllBtn').click();
  await page.locator('#retryBtn').click();
  assert.equal(await page.locator('#lesson').getAttribute('data-phase'),'predict');
  assert.equal(await page.locator('#sequenceList .wlan-event').count(),0);
  const evidence=await (await fetch(base+'/learning/wireless/wlan-association/reference-evidence.json')).json();
  assert.equal(evidence.live_environment.execution,'NOT_RUN');
  assert.equal(evidence.claims.length,6);
  assert.ok(evidence.claims.every(c=>c.live_actual===null),'reference data must not become user hardware Actual');
  assert.equal(evidence.claims.find(c=>c.id==='WLAN-04').packet_result,'NOT_TESTED');
  assert.equal(evidence.claims.find(c=>c.id==='WLAN-06').packet_result,'NOT_CONFIRMED');
  let referenceFrames=0;
  for(const sample of evidence.public_samples) {
    const prefix=base+'/learning/wireless/wlan-association/';
    const frames=await (await fetch(prefix+sample.aliased_frame_data)).json();
    const decoded=await (await fetch(prefix+sample.aliased_decrypted_frame_data)).json();
    assert.equal(frames.length,sample.frame_count);
    assert.equal(decoded.length,sample.frame_count);
    referenceFrames+=frames.length;
    if(sample.decompressed_file==='wpa3-sae.pcapng') {
      for(const number of [1,10,13,14]) {
        const frame=decoded.find(f=>Number(f['frame.number'])===number);
        assert.equal(frame['wlan.rsn.capabilities.mfpc'],'False');
        assert.equal(frame['wlan.rsn.capabilities.mfpr'],'False');
      }
    }
  }
  assert.equal(referenceFrames,183);
  const data=await (await fetch(base+'/learning-data.json')).json();
  const topic=data.topics.find(t=>t.id==='wlan-association');
  assert.equal(topic.packetCaptures,0,'public references must not inflate own capture counts');
  assert.equal(topic.recoveryValidations,0);
  assert.equal(topic.liveValidationStatus,'not-run');
  assert.deepEqual(errors,[]);
  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS WLAN reference scope, quiz, review, reset, keyboard and responsive QA');
