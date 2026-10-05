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
await mkdir(resolve(repo,'test-results/fhrp'),{recursive:true});

try{
  const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];
  for(const viewport of viewports){
    for(const path of ['/labs/fhrp.html','/labs/fhrp-simulator.html']){
      const page=await browser.newPage({viewport});
      const errors=[];
      page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
      page.on('pageerror',err=>errors.push(String(err)));
      const response=await page.goto(base+path,{waitUntil:'networkidle'});
      assert.equal(response.status(),200);
      const overflow=await page.evaluate(()=>({
        bad:document.documentElement.scrollWidth>innerWidth+1,
        doc:document.documentElement.scrollWidth,
        win:innerWidth,
        offenders:[...document.querySelectorAll('*')].map(el=>{
          const r=el.getBoundingClientRect();
          return {tag:el.tagName,cls:String(el.className||''),id:el.id||'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:el.scrollWidth};
        }).filter(x=>x.right>innerWidth+1||x.left<-1).slice(0,20)
      }));
      if(overflow.bad) console.log('OVERFLOW_DIAG',path,viewport.width,JSON.stringify(overflow));
      assert.equal(overflow.bad,false,path+' overflow '+viewport.width);
      assert.deepEqual(errors,[],path+' console errors '+viewport.width);
      if(viewport.width===360||viewport.width===1366){
        const name=path.includes('simulator')?'simulator':'concept';
        await page.screenshot({path:resolve(repo,'test-results/fhrp/'+name+'-'+viewport.width+'.png'),fullPage:true});
      }
      await page.close();
    }
  }

  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.goto(base+'/labs/fhrp.html',{waitUntil:'networkidle'});
  const concept=await page.locator('body').innerText();
  assert.ok(concept.includes('같은 Virtual Gateway, 바뀌는 Forwarding Owner'));
  assert.ok(concept.includes('110→90'));
  assert.ok(concept.includes('VRRPv2'));
  assert.ok(concept.includes('VRRPv3를 실측했다고 표현하지 않음'));
  assert.ok(concept.includes('무손실'));

  await page.goto(base+'/labs/fhrp-simulator.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  const correct=[1,0,2,1,0,2];

  for(let i=0;i<6;i++){
    if(i>0) await page.locator('.lesson-tab').nth(i).click();
    assert.equal(await page.locator('#runBtn').isDisabled(),true);
    await page.locator('.choice').nth(correct[i]).click();
    assert.equal(await page.locator('.choice').nth(correct[i]).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#runBtn').isDisabled(),false);
    await page.locator('#runBtn').click();
    assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
    assert.ok((await page.locator('#progressCount').innerText()).includes((i+1)+' / 6'));
  }

  await page.locator('.lesson-tab').nth(4).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[4]).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#states').innerText()).includes('110 → 90'));
  assert.ok((await page.locator('#states').innerText()).includes('R2 Active'));
  assert.ok((await page.locator('#eventText').innerText()).includes('upstream Down'));
  assert.ok(await page.locator('[data-node="r1"].track-low').count()>=1);
  assert.ok(await page.locator('[data-link="r1-r3"].failed').count()>=1);

  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('#resetBtn').click();
  await page.locator('.choice').nth(correct[5]).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#states').innerText()).includes('R2 Master'));
  assert.ok((await page.locator('#states').innerText()).includes('IP protocol 112'));
  await page.locator('.evidence summary').click();
  assert.ok((await page.locator('#evidenceList').innerText()).includes('VRRP version 2'));

  await page.locator('#resetBtn').click();
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  assert.equal(await page.locator('#feedback').isVisible(),false);
  await page.close();
} finally {
  await browser.close();
  await new Promise(r=>server.close(r));
}
console.log('PASS FHRP focused browser QA');
