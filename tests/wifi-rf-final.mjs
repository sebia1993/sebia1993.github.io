import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'}).end(await readFile(file));
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();

try{
  for(const viewport of [{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}]){
    for(const path of ['/labs/wifi-rf.html','/labs/wifi-rf-simulator.html']){
      const page=await browser.newPage({viewport});
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' overflow '+viewport.width);
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/wifi-rf.html',{waitUntil:'networkidle'});
  const body=await page.locator('body').innerText();
  assert.ok(body.includes('5 GHz · Channel 149 · 80 MHz'));
  assert.ok(body.includes('OBSERVED · 3차 보완 PASS'));
  assert.ok(body.includes('Radar Event는 관측하지 않았고'));

  await page.goto(base+'/labs/wifi-rf-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  for(let i=0;i<6;i++){
    if(i>0) await page.locator('.lesson-tab').nth(i).click();
    await page.locator('.choice').nth(0).click();
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
    assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 6'));
  }

  await page.locator('.lesson-tab').nth(2).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#metaPanel').innerText()).includes('75 dB'));
  assert.ok((await page.locator('#stateList').innerText()).includes('Tool-SNR NOT_EXPOSED'));

  await page.locator('.lesson-tab').nth(3).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('AP-A / AP-06 / AP-12 / AP-13'));
  assert.ok((await page.locator('#metaPanel').innerText()).includes('4 BSSIDs'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('3차 보완 PASS'));

  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('Radar vacate not reproduced'));

  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS wifi-rf focused browser QA');
