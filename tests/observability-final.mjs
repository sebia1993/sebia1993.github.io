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
await mkdir(resolve(repo,'test-results/observability'),{recursive:true});
try{
  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){
    for(const path of ['/labs/observability.html','/labs/observability-simulator.html']){
      const page=await browser.newPage({viewport});const errors=[];
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('pageerror',e=>errors.push(String(e)));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,width:document.documentElement.scrollWidth,inner:innerWidth,offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)}));
      assert.equal(layout.overflow,false,path+' overflow '+viewport.width+' '+JSON.stringify(layout));
      assert.deepEqual(errors,[],path+' console errors '+viewport.width);
      if(viewport.width===360||viewport.width===1366){const name=path.includes('simulator')?'simulator':'concept';await page.screenshot({path:resolve(repo,'test-results/observability/'+name+'-'+viewport.width+'.png'),fullPage:true});}
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/observability.html',{waitUntil:'networkidle'});
  const concept=await readLearningText(page);
  assert.ok(concept.includes('사건 하나 → Packet · Log · 상태 조회 · 알림 → 시간과 대상 장비로 묶기 → 복구까지 확인'));
  assert.ok(concept.includes('Ping 실패만으로 장애 원인을 확정하지 않습니다'));
  assert.ok(concept.includes('Trap이 항상 가장 먼저 오는 것은 아닙니다'));
  assert.ok(concept.includes('ifAdminStatus'));
  assert.ok(concept.includes('sysUpTime'));
  assert.ok(concept.includes('private evidence 원본은 공개하지 않습니다'));
  assert.equal(await page.locator('a[href="observability-simulator.html"]').count()>0,true);

  await page.goto(base+'/labs/observability-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),5);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
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
  await page.close();
}finally{await browser.close();await new Promise(r=>server.close(r));}
console.log('PASS Observability focused browser QA');
