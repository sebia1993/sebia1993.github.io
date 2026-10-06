import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const repo=fileURLToPath(new URL('../',import.meta.url)),output=resolve(repo,'test-results');
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.ico':'image/x-icon'};
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(repo,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(resolve(repo)+sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(file));}catch{res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
}
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),failures=[];let assertions=0;
async function check(name,fn){try{await fn();assertions++;console.log(`PASS ${name}`);}catch(error){failures.push({name,message:error.message});console.error(`FAIL ${name}: ${error.message}`);}}
function errorsFor(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});return errors;}
const paths=['roadmap.html','labs/arp-default-gateway.html','labs/arp-default-gateway-simulator.html','labs/ethernet-mac-table.html','labs/ethernet-mac-table-simulator.html','viewer.html?mode=packets&scenario=01-same-subnet&point=pc1-sw1','ethernet-viewer.html?mode=packets&scenario=02-known-unicast&point=pc2-sw1'];
try{
 for(const width of [390,768,1440])for(const path of paths)await check(`legacy ${width}px ${path}`,async()=>{
  const page=await browser.newPage({viewport:{width,height:960}}),errors=errorsFor(page);
  try{
   assert.equal((await page.goto(`${base}/${path}`,{waitUntil:'networkidle'})).status(),200);
   assert.ok((await page.locator('body').innerText()).length>200);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page overflows horizontally');
   if(path==='roadmap.html'){
    assert.equal(await page.locator('.topic').count(),27);const t=await page.locator('body').innerText();
    assert.ok(t.includes('Concept Guide'));assert.ok(t.includes('Interactive Lab'));assert.equal(await page.locator('#summaryMetrics').count(),0);assert.equal(t.includes('PNETLab'),false);
   }
   if(path.endsWith('-simulator.html')){
    const action=page.locator(path.includes('arp-')?'#pingBtn':'#runBtn');assert.equal(await action.isDisabled(),true);
    await page.locator('#predictionOptions button').first().click();assert.equal(await action.isEnabled(),true);
    await page.locator('#resetBtn').click();assert.equal(await action.isDisabled(),true,'reset must require a new prediction');
    if(path.includes('arp-')&&width===390){assert.equal(await page.locator('[data-m-device]').count(),4);assert.ok(await page.locator('[data-m-device]').first().getAttribute('aria-disabled'));}
   }
   if(path==='labs/ethernet-mac-table.html')await page.screenshot({path:resolve(output,`ethernet-mac-table-${width}.png`),fullPage:true});
   assert.deepEqual(errors,[],'runtime or console errors');
  }finally{await page.close();}
 });
 for(const width of [320,390,768,1440]){
  await check(`IP concept ${width}px two-stage page`,async()=>{
   const page=await browser.newPage({viewport:{width,height:960}}),errors=errorsFor(page);
   try{
    assert.equal((await page.goto(`${base}/labs/ip-subnetting.html`,{waitUntil:'networkidle'})).status(),200);
    const body=await page.locator('body').innerText();assert.ok(body.includes('내 컴퓨터는 상대에게 바로 보내야 할까?'));assert.ok(body.includes('네트워크 동네 A'));assert.ok(body.includes('이번 예제에서 그 경계를 알려주는 표시가 /25입니다.'));assert.ok(body.includes('10.77.10.10/25'));assert.ok(body.includes('10.77.10.140/25'));assert.ok(body.includes('오늘 새로 배운 말'));
    assert.equal(await page.locator('a[href="ip-subnetting-simulator.html"]').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
    await page.screenshot({path:resolve(output,`ip-subnetting-concept-${width}.png`),fullPage:true});
   }finally{await page.close();}
  });
  // Full sequential grading, restore/retry, actual-prefix, keyboard, scrolled
  // hit-target and public-URL checks now live in ip-scroll.mjs (same CI command).
  await check(`IP simulator ${width}px prediction and visible grading`,async()=>{
   const page=await browser.newPage({viewport:{width,height:960}}),errors=errorsFor(page);
   try{
    assert.equal((await page.goto(`${base}/labs/ip-subnetting-simulator.html`,{waitUntil:'networkidle'})).status(),200);
    assert.equal(await page.locator('.tab').count(),4);
    if(width<=390){
     assert.equal(await page.evaluate(()=>{const t=document.querySelector('.tabs');return t.scrollWidth>t.clientWidth;}),true);
     assert.equal(await page.evaluate(()=>document.querySelector('#question').getBoundingClientRect().top<innerHeight*.9),true);
     const before=await page.evaluate(()=>scrollY);await page.locator('.tab').nth(1).click();
     assert.ok(Math.abs((await page.evaluate(()=>scrollY))-before)<=2,'top tab should not cause a document jump');
     await page.locator('.tab').nth(0).click();
    }
    assert.equal(await page.locator('#runBtn').isDisabled(),true);assert.equal(await page.locator('#resultArea').isVisible(),false);
    await page.locator('#choices .choice').first().click();assert.equal(await page.locator('#runBtn').isEnabled(),true);
    await page.locator('#runBtn').click();assert.equal(await page.locator('#verdictTitle').innerText(),'✓ 정답입니다');
    assert.equal(await page.locator('#nextBtn').isVisible(),true);assert.equal(await page.locator('#choices button:disabled').count(),3);
    assert.equal((await page.locator('body').innerText()).includes('PASS'),false,'author validation is optional, not the learner grade');
    await page.locator('#resetBtn').click();assert.equal(await page.locator('#runBtn').isDisabled(),true);assert.equal(await page.locator('#resultArea').isVisible(),false);
    assert.equal(await page.locator('#progressText').innerText(),'풀이 완료 0 / 4');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
    await page.screenshot({path:resolve(output,`ip-subnetting-simulator-${width}.png`),fullPage:true});
   }finally{await page.close();}
  });
 }
 await check('Wireless Policy Mapper original Python runtime',async()=>{
  const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=errorsFor(page);
  try{
   assert.equal((await page.goto(`${base}/projects/runtime-demos/wireless-policy-mapper/index.html`,{waitUntil:'domcontentloaded'})).status(),200);
   await page.locator('#status').filter({hasText:'원 저장소 Python 소스 로드 완료'}).waitFor({timeout:120000});assert.equal(await page.locator('#runBtn').isEnabled(),true);
   await page.locator('#runBtn').click();await page.locator('#status').filter({hasText:'실행 완료'}).waitFor({timeout:30000});
   assert.ok((await page.locator('#policies').innerText()).includes('내부망 차단, 인터넷 중심'));assert.ok((await page.locator('#mappings').innerText()).includes('CORP-WIFI'));assert.ok((await page.locator('#mappings').innerText()).includes('employee-internet'));assert.ok((await page.locator('#runtimeInfo').innerText()).includes('Python 3.14'));
   assert.deepEqual(errors,[],'runtime or console errors');await page.screenshot({path:resolve(output,'wireless-policy-mapper-runtime.png'),fullPage:true});
  }finally{await page.close();}
 });
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
await writeFile(resolve(output,'browser-summary.json'),JSON.stringify({target:process.env.BASE_URL?'deployed':'local',assertions,failures,networkLabExecuted:false},null,2));
assert.equal(failures.length,0,JSON.stringify(failures,null,2));
