import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const origin='https://sebia1993.github.io';
await mkdir(resolve(repo,'test-results/observability-public'),{recursive:true});
const browser=await chromium.launch();

async function waitForPublished(path,expected,viewport={width:1366,height:768}){
  const page=await browser.newPage({viewport});let last='';
  try{
    for(let i=0;i<24;i++){
      try{
        const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
        const body=await page.locator('body').innerText();
        last='status='+(response?.status()??'none')+' body='+body.slice(0,180);
        if(response&&response.ok()&&body.includes(expected))return page;
      }catch(e){last=String(e);}
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
  assert.ok(concept.includes('MIB Object'));
  assert.ok(concept.includes('sysUpTime'));
  await page.screenshot({path:resolve(repo,'test-results/observability-public/concept-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/labs/observability-simulator.html','Packet / Log / SNMP 관측');
  assert.equal(await page.locator('.lesson-tab').count(),5);
  const correct=[1,0,1,1,2];
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

  await page.locator('.lesson-tab').nth(0).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[0]).click();await page.locator('#runBtn').click();
  let states=await page.locator('#states').innerText();assert.ok(states.includes('Ping 0/3'));assert.ok(states.includes('원인 확정 X'));

  await page.locator('.lesson-tab').nth(1).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[1]).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('Admin2 / Oper2'));assert.ok(states.includes('sysUpTime'));

  await page.locator('.lesson-tab').nth(2).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[2]).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('linkDown'));assert.ok(states.includes('GET으로 증명'));

  await page.locator('.lesson-tab').nth(3).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[3]).click();await page.locator('#runBtn').click();
  assert.ok((await page.locator('#eventText').innerText()).includes('44행 normalized timeline'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('일반적인 SNMP Trap 지연 규칙이 아닙니다'));

  await page.locator('.lesson-tab').nth(4).click();await page.locator('#resetBtn').click();await page.locator('.choice').nth(correct[4]).click();await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();assert.ok(states.includes('up/up'));assert.ok(states.includes('Ping 3/3'));assert.ok(states.includes('Admin1 / Oper1'));

  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.screenshot({path:resolve(repo,'test-results/observability-public/simulator-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/roadmap.html','Packet / Log / SNMP 관측');
  assert.ok(await page.locator('a[href="./labs/observability.html"]').count()>=1);
  assert.ok(await page.locator('a[href="./labs/observability-simulator.html"]').count()>=1);
  await page.close();

  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){
    for(const path of ['/labs/observability.html','/labs/observability-simulator.html']){
      page=await browser.newPage({viewport});
      const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('pageerror',e=>errors.push(String(e)));
      const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
      assert.ok(response&&response.ok(),path+' public response');
      const layout=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        width:document.documentElement.scrollWidth,
        inner:innerWidth,
        offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)
      }));
      assert.equal(layout.overflow,false,path+' public overflow '+viewport.width+' '+JSON.stringify(layout));
      assert.deepEqual(errors,[],path+' public console errors '+viewport.width);
      if(viewport.width===360)await page.screenshot({path:resolve(repo,'test-results/observability-public/'+(path.includes('simulator')?'simulator':'concept')+'-360.png'),fullPage:true});
      await page.close();
    }
  }
}finally{await browser.close();}
console.log('PASS Observability comprehensive public GitHub Pages QA');
