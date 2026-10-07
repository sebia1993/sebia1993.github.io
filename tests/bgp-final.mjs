import {readLearningText} from './concept-evidence-helper.mjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(repo,'.'+pathname);
    if(!file.startsWith(resolve(repo)+sep)){res.writeHead(403).end();return;}
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','Cache-Control':'no-store'}).end(await readFile(file));
  }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
await mkdir(resolve(repo,'test-results/bgp'),{recursive:true});

try{
  const viewports=[
    {width:360,height:800},
    {width:768,height:1024},
    {width:1366,height:768},
    {width:1920,height:1080}
  ];

  for(const viewport of viewports){
    for(const path of ['/labs/bgp.html','/labs/bgp-simulator.html']){
      const page=await browser.newPage({viewport});
      const errors=[];
      page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
      page.on('pageerror',e=>errors.push(String(e)));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200,path+' status '+viewport.width);
      const layout=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        width:document.documentElement.scrollWidth,
        inner:innerWidth,
        offenders:Array.from(document.querySelectorAll('body *')).map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,id:el.id,cls:el.className?.baseVal??el.className,text:(el.textContent||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width};}).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,12)
      }));
      assert.equal(layout.overflow,false,path+' horizontal overflow '+viewport.width+' '+JSON.stringify(layout));
      assert.deepEqual(errors,[],path+' console/page errors '+viewport.width);
      if(viewport.width===360||viewport.width===1366){
        const name=path.includes('simulator')?'simulator':'concept';
        await page.screenshot({path:resolve(repo,'test-results/bgp/'+name+'-'+viewport.width+'.png'),fullPage:true});
      }
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];
  page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
  page.on('pageerror',e=>errors.push(String(e)));

  await page.goto(base+'/labs/bgp.html',{waitUntil:'networkidle'});
  const concept=await readLearningText(page);
  assert.ok(concept.includes('BGP(Border Gateway Protocol)'));
  assert.ok(concept.includes('경로에 딸린 정보'));
  assert.ok(concept.includes('AS(Autonomous System)'));
  assert.ok(concept.includes('AS_PATH는 경로가 거쳐 온 AS 정보'));
  assert.ok(concept.includes('Prefix Filter ≠ Packet ACL'));
  assert.ok(concept.includes('next-hop-self'));
  assert.ok(concept.includes('전체 BGP Best-Path 알고리즘'));
  assert.equal(await page.locator('a[href="bgp-simulator.html"]').count()>0,true);

  await page.goto(base+'/labs/bgp-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),5);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);

  const correct=[1,0,1,1,0];
  for(let i=0;i<5;i++){
    if(i>0) await page.locator('.lesson-tab').nth(i).click();
    assert.equal(await page.locator('#runBtn').isDisabled(),true);
    await page.locator('.choice').nth(correct[i]).click();
    assert.equal(await page.locator('#runBtn').isDisabled(),false);
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
    assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 5'));
  }

  await page.locator('.lesson-tab').nth(1).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[1]).click();
  await page.locator('#runBtn').click();
  let states=await page.locator('#states').innerText();
  assert.ok(states.includes('R2'));
  assert.ok(states.includes('10.0.12.2'));

  await page.locator('.lesson-tab').nth(2).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[2]).click();
  await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();
  assert.ok(states.includes('200'));
  assert.ok(states.includes('R3'));
  assert.ok((await page.locator('#eventText').innerText()).includes('R2 → R3'));

  await page.locator('.lesson-tab').nth(3).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[3]).click();
  await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();
  assert.ok(states.includes('65003 65003 65003'));
  assert.ok(states.includes('10.0.14.1'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('next-hop-self'));

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[4]).click();
  await page.locator('#runBtn').click();
  states=await page.locator('#states').innerText();
  assert.ok(states.includes('EXTRA'));
  assert.ok(states.includes('Withdrawal'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('Packet ACL'));

  assert.equal(await page.locator('#complete').isVisible(),true);
  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();
}finally{
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS BGP focused browser QA');
