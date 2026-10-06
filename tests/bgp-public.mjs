import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const origin='https://sebia1993.github.io';
await mkdir(resolve(repo,'test-results/bgp-public'),{recursive:true});
const browser=await chromium.launch();

async function waitForPublished(path, expected){
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  let last='';
  try{
    for(let i=0;i<24;i++){
      try{
        const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
        const body=await page.locator('body').innerText();
        last='status='+(response?.status()??'none')+' body='+body.slice(0,180);
        if(response && response.ok() && body.includes(expected)) return page;
      }catch(e){last=String(e);}
      await page.waitForTimeout(5000);
    }
    throw new Error('Published content did not become ready: '+path+' '+last);
  }catch(e){await page.close();throw e;}
}

try{
  let page=await waitForPublished('/labs/bgp.html','BGP(Border Gateway Protocol)');
  const concept=await page.locator('body').innerText();
  assert.ok(concept.includes('AS_PATH는 경로가 거쳐 온 AS 정보'));
  assert.ok(concept.includes('Prefix Filter ≠ Packet ACL'));
  assert.ok(concept.includes('전체 BGP Best-Path 알고리즘'));
  await page.screenshot({path:resolve(repo,'test-results/bgp-public/concept-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/labs/bgp-simulator.html','BGP / Route Policy');
  assert.equal(await page.locator('.lesson-tab').count(),5);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  await page.locator('.lesson-tab').nth(2).click();
  await page.locator('.choice').nth(1).click();
  await page.locator('#runBtn').click();
  assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
  assert.ok((await page.locator('#states').innerText()).includes('R3'));
  assert.ok((await page.locator('#states').innerText()).includes('200'));
  assert.ok((await page.locator('#eventText').innerText()).includes('R2 → R3'));

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('.choice').nth(0).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#states').innerText()).includes('EXTRA'));
  assert.ok((await page.locator('#states').innerText()).includes('Withdrawal'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('Packet ACL'));
  await page.screenshot({path:resolve(repo,'test-results/bgp-public/simulator-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/roadmap.html','BGP / Route Policy');
  const roadmap=await page.locator('body').innerText();
  assert.ok(roadmap.includes('BGP / Route Policy'));
  assert.ok(await page.locator('a[href="./labs/bgp.html"]').count()>=1);
  assert.ok(await page.locator('a[href="./labs/bgp-simulator.html"]').count()>=1);
  await page.close();

  for(const path of ['/labs/bgp.html','/labs/bgp-simulator.html']){
    page=await browser.newPage({viewport:{width:360,height:800}});
    const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
    assert.ok(response && response.ok(),path+' public response');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' public 360 overflow');
    await page.screenshot({path:resolve(repo,'test-results/bgp-public/'+(path.includes('simulator')?'simulator':'concept')+'-360.png'),fullPage:true});
    await page.close();
  }
}finally{
  await browser.close();
}
console.log('PASS BGP public GitHub Pages QA');
