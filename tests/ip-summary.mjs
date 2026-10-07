// Summary badges must reflect the current practice run without persisting answers across page loads.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)), out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const file='labs/ip-subnetting-simulator.html', version='20261007-summary-status-v2';
const matrix=[[320,640,true],[360,800,true],[390,844,true],[412,915,true],[800,360,true],[768,1024,true],[980,720,false],[1366,768,false],[1920,1080,false]];
const checks=[];
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path==='/favicon.ico'){res.writeHead(204).end();return;}
  const p=resolve(root,'.'+path);if(!p.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  const bytes=await readFile(p),mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json'};
  res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
}
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
async function summaryCheck(page,expected){
 const rows=page.locator('#summaryList .summary-item');assert.equal(await rows.count(),4);
 assert.equal(await page.locator('#complete').isVisible(),true);
 assert.equal(await page.locator('#summaryList').getAttribute('role'),'list');
 const c=expected.filter(g=>g==='correct').length;
 assert.equal(await page.locator('#completionScore').innerText(),`완료 4 / 4 · 정답 ${c} · 다시 볼 문제 ${4-c}`);
 assert.equal(await page.locator('#completionScore .summary-chip').count(),3);
 assert.equal(await page.locator('.summary-chip[data-grade=correct]').innerText(),`정답 ${c}`);
 assert.equal(await page.locator('.summary-chip[data-grade=incorrect]').innerText(),`다시 볼 문제 ${4-c}`);
 for(let i=0;i<4;i++){
  const row=rows.nth(i),ok=expected[i]==='correct';
  assert.equal(await row.getAttribute('data-grade'),expected[i]);
  assert.equal(await row.locator('.summary-status-text').innerText(),ok?'정답':'오답');
  assert.equal(await row.locator('.summary-status-icon').innerText(),ok?'✓':'✕');
  assert.equal(await row.locator('.summary-answer-label').innerText(),ok?'내 답 · 정답':'내 답 · 오답');
  assert.equal(await row.locator('button').innerText(),ok?'답안 보기':'오답 해설 보기');
  const layout=await row.evaluate(e=>{
   const r=e.getBoundingClientRect();return Array.from(e.querySelectorAll('.summary-status,.summary-title,.summary-answer-label,.summary-answer-value,button')).map(n=>{const b=n.getBoundingClientRect();return {text:n.textContent,inside:b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1};});
  });assert.ok(layout.every(x=>x.inside),JSON.stringify(layout));
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
 assert.equal(await page.locator('#reviewWrongBtn').isVisible(),c<4);
 const palette=await page.evaluate(()=>{
  function rgb(s){return (s.match(/[\d.]+/g)||[]).map(Number);}
  function bg(el){for(let e=el;e;e=e.parentElement){const c=rgb(getComputedStyle(e).backgroundColor);if(c.length===3||c[3]===1)return c;}throw new Error('No opaque background');}
  function L(c){return c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
  return Array.from(document.querySelectorAll('#complete .summary-chip,#complete .summary-status-text,#complete .summary-title,#complete .summary-answer-label,#complete .summary-answer-value,#complete .summary-review')).map(e=>{const a=L(rgb(getComputedStyle(e).color)),b=L(bg(e));return {text:e.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
 });assert.ok(palette.every(x=>x.ratio>=4.5),JSON.stringify(palette.filter(x=>x.ratio<4.5)));
 const bars=await rows.evaluateAll(es=>es.map(e=>({width:parseFloat(getComputedStyle(e).borderInlineStartWidth),color:getComputedStyle(e).borderInlineStartColor,grade:e.dataset.grade})));
 assert.ok(bars.every(x=>x.width>=5));
 if(c>0&&c<4)assert.notEqual(bars.find(x=>x.grade==='correct').color,bars.find(x=>x.grade==='incorrect').color);
 return Math.min(...palette.map(x=>x.ratio));
}
async function solve(page,choices){
 for(const choice of choices){
  await page.locator(`#choices [data-value="${choice}"]`).click();
  await page.locator('#runBtn').click();
  await page.locator('#nextBtn').click();
 }
}
async function checkSurface(url,name){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  try{
   assert.equal((await page.goto(`${url}/${file}`,{waitUntil:'networkidle'})).status(),200);
   assert.equal(await page.locator('meta[name=summary-ui-version]').getAttribute('content'),version);
   // Solve in sequence using only Next. Same 3/1 state as the user's example.
   for(const choice of ['on','gw','drop','gw']){
    await page.locator(`#choices [data-value="${choice}"]`).click();await page.locator('#runBtn').click();await page.locator('#nextBtn').click();
   }
   const minContrast=await summaryCheck(page,['correct','correct','incorrect','correct']);
   if([360,1366].includes(width))await page.locator('#complete').screenshot({path:resolve(out,`summary-${name}-${width}.png`)});
   // Real hit target for the new error-review control, not just a text assertion.
   const wrong=page.getByRole('button',{name:'문제 3 오답 해설 보기',exact:true});await wrong.scrollIntoViewIfNeeded();
   const pt=await wrong.evaluate(e=>{const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,hit:e.contains(document.elementFromPoint(x,y))};});assert.ok(pt.hit);
   if(touch)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);
   assert.equal(await page.locator('#lessonNo').innerText(),'문제 3 / 4');assert.equal(await page.locator('#verdictTitle').innerText(),'✕ 오답입니다');
   assert.equal(await page.locator('#chosenAnswer').innerText(),'Prefix Length가 다르면 바로 버린다');
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#lessonNo').innerText(),'문제 1 / 4');
   assert.equal(await page.locator('#resultArea').isVisible(),false);
   assert.equal(await page.locator('#scoreText').innerText(),'정답 0 · 다시 볼 문제 0 · 남은 문제 4');
   assert.ok((await page.locator('#storageNote').innerText()).includes('새로고침하면 1번 문제부터 다시 시작'));

   await solve(page,['on','gw','on','gw']);
   await summaryCheck(page,['correct','correct','correct','correct']);
   // Correct-answer review still works from keyboard inside the current practice run.
   await page.getByRole('button',{name:'문제 1 답안 보기',exact:true}).focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator('#verdictTitle').innerText(),'✓ 정답입니다');

   await page.reload({waitUntil:'networkidle'});
   await solve(page,['drop','on','drop','on']);
   await summaryCheck(page,['incorrect','incorrect','incorrect','incorrect']);
   // Enlarged text and monochrome high-contrast mode must not lose meaning.
   await page.addStyleTag({content:'html{font-size:200%}'});await summaryCheck(page,['incorrect','incorrect','incorrect','incorrect']);
   await page.emulateMedia({forcedColors:'active'});
   assert.deepEqual(await page.locator('.summary-status-text').allInnerTexts(),['오답','오답','오답','오답']);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.deepEqual(errors,[]);
   checks.push({surface:name,width,height,touch,status:'PASS',minTextContrast:minContrast,states:['3-correct-1-incorrect','all-correct-after-retry','all-incorrect','200%-text','forced-colors'],preserved:['same-run-review','fresh-start-reload','sequential-next','keyboard-and-touch-review']});
   console.log(`PASS summary ${name} ${width}x${height}`);
  }catch(e){await page.screenshot({path:resolve(out,`summary-failure-${name}-${width}.png`),fullPage:true});throw e;}finally{await context.close();}
 }
}
try{
 await checkSurface(base,process.env.BASE_URL?'requested-url':'local');
 if(!process.env.BASE_URL&&process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io'&&process.env.GITHUB_REF==='refs/heads/main'){
  const publicBase='https://sebia1993.github.io',expected=(await readFile(resolve(root,file),'utf8')).replace(/\r\n/g,'\n').trim();
  const request=await browser.newContext();let published=false;
  try{
   for(let i=0;i<18;i++){
    try{const r=await request.request.get(`${publicBase}/${file}?qa=${version}-${i}`,{timeout:15000});if(r.ok()&&(await r.text()).replace(/\r\n/g,'\n').trim()===expected){published=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,5000));
   }
  }finally{await request.close();}
  assert.ok(published,'Tested summary source is not yet published');await checkSurface(publicBase,'published');
 }
}catch(e){checks.push({status:'FAIL',message:e.message});throw e;}
finally{await writeFile(resolve(out,'ip-summary-qa.json'),JSON.stringify({version,networkLabExecuted:false,checks},null,2));await browser.close();if(server)await new Promise(r=>server.close(r));}
