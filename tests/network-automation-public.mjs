import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const repo=fileURLToPath(new URL('../',import.meta.url));const origin='https://sebia1993.github.io';
await mkdir(resolve(repo,'test-results/network-automation-public'),{recursive:true});
const browser=await chromium.launch();
async function waitFor(path,expected,viewport={width:1366,height:768}){const page=await browser.newPage({viewport});let last='';try{for(let i=0;i<24;i++){try{const r=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});const body=await page.locator('body').innerText();last='status='+(r?.status()??'none')+' body='+body.slice(0,180);if(r&&r.ok()&&body.includes(expected))return page;}catch(e){last=String(e)}await page.waitForTimeout(5000);}throw new Error('not published '+path+' '+last);}catch(e){await page.close();throw e;}}
try{
  let page=await waitFor('/labs/network-automation.html','확인할 장비와 정상 기준 → 자동 수집 → 같은 형태로 정리 → 비교 → 결과 기록 → 다시 실행');
  let body=await page.locator('body').innerText();assert.ok(body.includes('PASS, MISMATCH, ERROR는 서로 다릅니다'));assert.ok(body.includes('이름-값 구조의 텍스트 형식인 JSON'));
  await page.screenshot({path:resolve(repo,'test-results/network-automation-public/concept-1366.png'),fullPage:true});await page.close();

  page=await waitFor('/labs/network-automation-simulator.html','Network Automation');
  assert.equal(await page.locator('.lesson-tab').count(),5);
  const correct=[0,1,2,2,1];
  for(let i=0;i<5;i++){if(i>0)await page.locator('.lesson-tab').nth(i).click();await page.locator('.choice').nth(correct[i]).click();await page.locator('#runBtn').click();assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');}
  assert.equal(await page.locator('#complete').isVisible(),true);
  await page.screenshot({path:resolve(repo,'test-results/network-automation-public/simulator-1366.png'),fullPage:true});await page.close();

  page=await waitFor('/roadmap.html','Network Automation');
  assert.ok(await page.locator('a[href="./labs/network-automation.html"]').count()>=1);assert.ok(await page.locator('a[href="./labs/network-automation-simulator.html"]').count()>=1);await page.close();

  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){for(const path of ['/labs/network-automation.html','/labs/network-automation-simulator.html']){page=await browser.newPage({viewport});const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(String(e)));const r=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});assert.ok(r&&r.ok());const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,width:document.documentElement.scrollWidth,inner:innerWidth,offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)}));assert.equal(layout.overflow,false,path+' '+viewport.width+' '+JSON.stringify(layout));assert.deepEqual(errors,[]);if(viewport.width===360)await page.screenshot({path:resolve(repo,'test-results/network-automation-public/'+(path.includes('simulator')?'simulator':'concept')+'-360.png'),fullPage:true});await page.close();}}
}finally{await browser.close();}
console.log('PASS Network Automation public GitHub Pages QA');
