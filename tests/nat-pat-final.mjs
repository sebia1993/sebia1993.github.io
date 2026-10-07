import {readLearningText} from './concept-evidence-helper.mjs';
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
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain'}).end(await readFile(file));
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1366,height:768}});
try{
  await page.goto(base+'/labs/nat-pat.html',{waitUntil:'networkidle'});
  assert.ok((await readLearningText(page)).includes('198.51.100.5:25473'));
  assert.ok((await readLearningText(page)).includes('미변환'));

  await page.goto(base+'/labs/nat-pat-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  await page.locator('.lesson-tab').nth(1).click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#translationList').innerText()).includes('25473'));
  assert.ok((await page.locator('#translationList').innerText()).includes('46258'));

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('R4 Ping 0/3'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('1 / 6'));
  await page.locator('#recoverBtn').click();

  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('R1 0/3 · R4 3/3'));
  await page.locator('#recoverBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('R1 3/3 · R4 3/3'));

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS nat-pat browser smoke');
