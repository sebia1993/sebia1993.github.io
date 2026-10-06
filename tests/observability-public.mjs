import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const origin='https://sebia1993.github.io';
await mkdir(resolve(repo,'test-results/observability-public'),{recursive:true});
const browser=await chromium.launch();

async function waitForPublished(path,expected){
  const page=await browser.newPage({viewport:{width:1366,height:768}});let last='';
  try{
    for(let i=0;i<24;i++){
      try{const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});const body=await page.locator('body').innerText();last='status='+(response?.status()??'none')+' body='+body.slice(0,180);if(response&&response.ok()&&body.includes(expected))return page;}catch(e){last=String(e);}
      await page.waitForTimeout(5000);
    }
    throw new Error('Published content did not become ready: '+path+' '+last);
  }catch(e){await page.close();throw e;}
}

try{
  let page=await waitForPublished('/labs/observability.html','사건 하나 → Packet · Log · 상태 조회 · 알림 → 시간과 대상 장비로 묶기 → 복구까지 확인');
  const concept=await page.locator('body').innerText();
  assert.ok(concept.includes('Trap이 항상 가장 먼저 오는 것은 아닙니다'));
  assert.ok(concept.includes('Ping 실패만으로 장애 원인을 확정하지 않습니다'));
  await page.screenshot({path:resolve(repo,'test-results/observability-public/concept-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/labs/observability-simulator.html','Packet / Log / SNMP 관측');
  assert.equal(await page.locator('.lesson-tab').count(),5);
  await page.locator('.lesson-tab').nth(1).click();await page.locator('.choice').nth(0).click();await page.locator('#runBtn').click();
  assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');assert.ok((await page.locator('#states').innerText()).includes('Admin2 / Oper2'));
  await page.locator('.lesson-tab').nth(3).click();await page.locator('.choice').nth(1).click();await page.locator('#runBtn').click();
  assert.ok((await page.locator('#scopeNote').innerText()).includes('일반적인 SNMP Trap 지연 규칙이 아닙니다'));
  await page.screenshot({path:resolve(repo,'test-results/observability-public/simulator-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/roadmap.html','Packet / Log / SNMP 관측');
  assert.ok(await page.locator('a[href="./labs/observability.html"]').count()>=1);
  assert.ok(await page.locator('a[href="./labs/observability-simulator.html"]').count()>=1);
  await page.close();

  for(const path of ['/labs/observability.html','/labs/observability-simulator.html']){
    page=await browser.newPage({viewport:{width:360,height:800}});
    const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
    assert.ok(response&&response.ok(),path+' public response');
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,width:document.documentElement.scrollWidth,inner:innerWidth,offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)}));
    assert.equal(layout.overflow,false,path+' public 360 overflow '+JSON.stringify(layout));
    await page.screenshot({path:resolve(repo,'test-results/observability-public/'+(path.includes('simulator')?'simulator':'concept')+'-360.png'),fullPage:true});
    await page.close();
  }
}finally{await browser.close();}
console.log('PASS Observability public GitHub Pages QA');
