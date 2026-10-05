import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(repo,'.'+pathname);if(!file.startsWith(resolve(repo)+sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'}).end(await readFile(file));}catch{res.writeHead(404).end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
await mkdir(resolve(repo,'test-results/vrf'),{recursive:true});
try{
  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){
    for(const path of ['/labs/vrf.html','/labs/vrf-simulator.html']){
      const page=await browser.newPage({viewport});const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(String(e)));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(response.status(),200);
      const bad=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(bad,false,path+' overflow '+viewport.width);assert.deepEqual(errors,[],path+' console errors '+viewport.width);
      if(viewport.width===360||viewport.width===1366){const name=path.includes('simulator')?'simulator':'concept';await page.screenshot({path:resolve(repo,'test-results/vrf/'+name+'-'+viewport.width+'.png'),fullPage:true});}
      await page.close();
    }
  }
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/vrf.html',{waitUntil:'networkidle'});const concept=await page.locator('body').innerText();
  assert.ok(concept.includes('VRF Context → 그 VRF의 Routing Table → 출력 경로'));
  assert.ok(concept.includes('같은 IP라도 VRF가 다르면'));
  assert.ok(concept.includes('원래 BLUE Ping은 0/3'));
  assert.ok(concept.includes('MP-BGP/MPLS'));
  await page.goto(base+'/labs/vrf-simulator.html',{waitUntil:'networkidle'});assert.equal(await page.locator('.lesson-tab').count(),6);assert.equal(await page.locator('#runBtn').isDisabled(),true);
  const correct=[1,0,2,1,1,1];
  for(let i=0;i<6;i++){if(i>0)await page.locator('.lesson-tab').nth(i).click();assert.equal(await page.locator('#runBtn').isDisabled(),true);await page.locator('.choice').nth(correct[i]).click();assert.equal(await page.locator('#runBtn').isDisabled(),false);await page.locator('#runBtn').click();assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 6'));}
  await page.locator('.lesson-tab').nth(3).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[3]).click();await page.locator('#runBtn').click();assert.ok((await page.locator('#states').innerText()).includes('BLUE'));assert.ok((await page.locator('#states').innerText()).includes('e0/0'));assert.ok((await page.locator('#states').innerText()).includes('e0/1'));
  await page.locator('.lesson-tab').nth(5).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[5]).click();await page.locator('#runBtn').click();assert.ok((await page.locator('#states').innerText()).includes('Outbound Request'));assert.ok((await page.locator('#states').innerText()).includes('0/3'));assert.ok((await page.locator('#scopeNote').innerText()).includes('양방향 Reachability 성공으로 표시하지 않습니다'));assert.ok((await page.locator('#blueRib').innerText()).includes('192.0.2.0/24'));
  await page.locator('#resetBtn').click();assert.equal(await page.locator('#runBtn').isDisabled(),true);assert.equal(await page.locator('#feedback').isVisible(),false);await page.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS VRF focused browser QA');
