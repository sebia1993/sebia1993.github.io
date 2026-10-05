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
    for(const path of ['/labs/roaming-wlan-troubleshooting.html','/labs/roaming-wlan-troubleshooting-simulator.html']){
      const page=await browser.newPage({viewport});
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      const overflow=await page.evaluate(()=>({
        bad:document.documentElement.scrollWidth>innerWidth+1,
        doc:document.documentElement.scrollWidth,
        win:innerWidth,
        offenders:[...document.querySelectorAll('*')].map(el=>{
          const r=el.getBoundingClientRect();
          return {tag:el.tagName,cls:el.className||'',id:el.id||'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:el.scrollWidth};
        }).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,20)
      }));
      if(overflow.bad) console.log('OVERFLOW_DIAG',path,viewport.width,JSON.stringify(overflow));
      assert.equal(overflow.bad,false,path+' overflow '+viewport.width);
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/roaming-wlan-troubleshooting.html',{waitUntil:'networkidle'});
  const concept=await page.locator('body').innerText();
  assert.ok(concept.includes('공식 사례 + 기존 검증 Evidence 기반'));
  assert.ok(concept.includes('FT 성공과 Data Resume는 같은 증거가 아닙니다.'));
  assert.ok(concept.includes('약한 RSSI만으로 Sticky Client라고 부르지 않습니다.'));
  assert.ok(concept.includes('RF'));
  assert.ok(concept.includes('Routing / Reachability'));

  await page.goto(base+'/labs/roaming-wlan-troubleshooting-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  for(let i=0;i<6;i++){
    if(i>0) await page.locator('.lesson-tab').nth(i).click();
    await page.locator('.choice').nth(0).click();
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
    assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 6'));
  }

  await page.locator('.lesson-tab').nth(0).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('Distinct BSSID transition'));
  assert.ok((await page.locator('#meta').innerText()).includes('Published trace'));

  await page.locator('.lesson-tab').nth(2).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('NOT CONFIRMED'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('별도 증거'));

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#meta').innerText()).includes('Authentication'));

  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('Addressing failure'));
  assert.ok((await page.locator('#states').innerText()).includes('CASE-B = Policy/Authorization'));
  assert.ok((await page.locator('#states').innerText()).includes('CASE-C = Routing'));

  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS roaming-wlan-troubleshooting focused browser QA');
