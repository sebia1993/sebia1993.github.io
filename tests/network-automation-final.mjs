import {readLearningText} from './concept-evidence-helper.mjs';
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
await mkdir(resolve(repo,'test-results/network-automation'),{recursive:true});
try{
  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){
    for(const path of ['/labs/network-automation.html','/labs/network-automation-simulator.html']){
      const page=await browser.newPage({viewport});const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(String(e)));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(response.status(),200);
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,width:document.documentElement.scrollWidth,inner:innerWidth,offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)}));
      assert.equal(layout.overflow,false,path+' overflow '+viewport.width+' '+JSON.stringify(layout));assert.deepEqual(errors,[],path+' console errors '+viewport.width);
      if(viewport.width===360||viewport.width===1366){await page.screenshot({path:resolve(repo,'test-results/network-automation/'+(path.includes('simulator')?'simulator':'concept')+'-'+viewport.width+'.png'),fullPage:true});}
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/network-automation.html',{waitUntil:'networkidle'});
  const body=await readLearningText(page);
  assert.ok(body.includes('확인할 장비와 정상 기준 → 자동 수집 → 같은 형태로 정리 → 비교 → 결과 기록 → 다시 실행'));
  assert.ok(body.includes('PASS, MISMATCH, ERROR는 서로 다릅니다'));
  assert.ok(body.includes('원격 장비에 안전하게 접속'));
  assert.ok(body.includes('이름-값 구조의 텍스트 형식인 JSON'));
  assert.ok(body.includes('SSH PCAP에서 명령 내용이 보였다고 주장하지 않습니다'));
  assert.equal(await page.locator('a[href="network-automation-simulator.html"]').count()>0,true);

  await page.goto(base+'/labs/network-automation-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),5);
  const correct=[0,1,2,2,1];
  for(let i=0;i<5;i++){
    if(i>0)await page.locator('.lesson-tab').nth(i).click();
    assert.equal(await page.locator('#runBtn').isDisabled(),true);
    await page.locator('.choice').nth(correct[i]).click();
    assert.equal(await page.locator('#runBtn').isDisabled(),false);
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
    assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 5'));
  }
  assert.equal(await page.locator('#complete').isVisible(),true);

  await page.locator('.lesson-tab').nth(1).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(1).click();await page.locator('#runBtn').click();
  let states=await page.locator('#states').innerText();assert.ok(states.includes('SUCCESS / MISMATCH'));assert.ok(states.includes('Lo0 admin down/down'));

  await page.locator('.lesson-tab').nth(2).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(2).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('ERROR / NOT_EVALUATED'));assert.ok(states.includes('R3 state 미생성'));

  await page.locator('.lesson-tab').nth(3).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(2).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('Valid JSON'));assert.ok(states.includes('public report 미포함'));

  await page.locator('.lesson-tab').nth(4).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(1).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('Baseline = Final'));assert.ok(states.includes('unchanged'));

  await page.locator('#resetBtn').click();assert.equal(await page.locator('#runBtn').isDisabled(),true);assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS Network Automation focused browser QA');
