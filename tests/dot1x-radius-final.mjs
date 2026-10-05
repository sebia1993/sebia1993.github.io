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
  {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const response=await page.goto(base+'/roadmap.html',{waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'roadmap overflow 390px');
    assert.ok((await page.locator('body').innerText()).includes('802.1X / EAP / RADIUS'));
    await page.close();
  }

  for(const viewport of [{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}]){
    for(const path of ['/labs/dot1x-radius.html','/labs/dot1x-radius-simulator.html']){
      const page=await browser.newPage({viewport});
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' overflow '+viewport.width);
      if(path.includes('simulator')){
        assert.equal(await page.locator('.dot-tab').count(),6);
        assert.equal(await page.locator('#runBtn').isDisabled(),true);
      }
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/dot1x-radius-simulator.html',{waitUntil:'networkidle'});

  // 01 boundary
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('EAPOL'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('1 / 6'));

  // 02 relay
  await page.locator('.dot-tab').nth(1).click();
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('20 exact EAP relay matches'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));

  // 03 success
  await page.locator('.dot-tab').nth(2).click();
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('10.77.20.10'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('3 / 6'));

  // 04 reject requires recovery
  await page.locator('.dot-tab').nth(3).click();
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('Access-Reject #371'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('3 / 6'));
  assert.equal(await page.locator('#recoverBtn').isVisible(),true);
  await page.locator('#recoverBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('Access-Accept #416'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));

  // 05 authorization
  await page.locator('.dot-tab').nth(4).click();
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  const vlanText=await page.locator('#stateList').innerText();
  assert.ok(vlanText.includes('VLAN20'));
  assert.ok(vlanText.includes('VLAN30'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));

  // 06 timeout requires recovery
  await page.locator('.dot-tab').nth(5).click();
  await page.locator('.dot-choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('Access-Accept = 0 / Access-Reject = 0'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('RADIUS 응답 없음'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));
  await page.locator('#recoverBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('Access-Accept #523'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('6 / 6'));

  // reset gate
  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);

  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS dot1x-radius browser QA');
