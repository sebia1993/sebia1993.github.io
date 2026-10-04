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
    for(const path of ['/labs/firewall-vpn.html','/labs/firewall-vpn-simulator.html']){
      const page=await browser.newPage({viewport});
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' overflow '+viewport.width);
      if(path.includes('simulator')&&viewport.width===360) assert.equal(await page.locator('.topology-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),true);
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/firewall-vpn-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#stateList').innerText()).includes('TCP_ESTAB'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('1 / 6'));

  await page.locator('.lesson-tab').nth(1).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('CONNECTION FAIL'));
  assert.equal(await page.locator('#stopR2').isVisible(),true);
  assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));

  await page.locator('.lesson-tab').nth(2).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#metaPanel').innerText()).includes('Session'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));
  assert.equal(await page.locator('#recoverBtn').isVisible(),true);
  await page.locator('#recoverBtn').click();
  assert.ok((await page.locator('#eventKind').innerText()).includes('RECOVERY'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('3 / 6'));

  await page.locator('.lesson-tab').nth(3).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#metaPanel').innerText()).includes('QM_IDLE'));
  assert.ok((await page.locator('#link23').getAttribute('class')).includes('esp'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('CLEAR IP 3/3'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));
  assert.equal(await page.locator('#compareBtn').isVisible(),true);
  await page.locator('#compareBtn').click();
  assert.ok((await page.locator('#link23').getAttribute('class')).includes('esp'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));

  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('VPN FAIL'));
  assert.ok((await page.locator('#metaPanel').innerText()).includes('MM_KEY_EXCH'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));
  await page.locator('#recoverBtn').click();
  assert.ok((await page.locator('#resultBox').innerText()).includes('RECOVERED'));
  assert.ok((await page.locator('#metaPanel').innerText()).includes('QM_IDLE'));
  assert.ok((await page.locator('#progressCount').innerText()).includes('6 / 6'));

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.lesson-tab').nth(3).click();
  await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
  assert.equal(await page.locator('#link23').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS firewall-vpn focused browser QA');
