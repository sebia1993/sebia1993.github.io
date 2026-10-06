// Existing IPSUB claims rendered as diagrams; no network lab is executed here.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
const path='labs/ip-subnetting.html',version='20261006-general-public-v3';
const normalize=s=>s.replace(/\r\n/g,'\n').trim();
const source=await readFile(resolve(root,path),'utf8');
const styles=Object.fromEntries(await Promise.all(['styles.css','lab-ui.css'].map(async f=>[f,await readFile(resolve(root,f),'utf8')])));
const inline=process.env.RENDER_INLINE==='1';
let server,base=process.env.BASE_URL;
if(!base&&!inline){
 server=createServer(async(req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name==='/favicon.ico'){res.writeHead(204).end();return;}
  const p=resolve(root,'.'+name);if(!p.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  const bytes=await readFile(p);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'}[extname(p)]||'application/octet-stream'),'Cache-Control':'no-store'}).end(bytes);
 }catch{res.writeHead(404).end('Not found');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
}
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),checks=[];
const matrix=[[320,640,true],[360,800,true],[390,844,true],[412,915,true],[800,360,true],[768,1024,true],[980,720,false],[1366,768,false],[1920,1080,false]];
const figures=['storyVisual','addressVisual','groupVisual','rangeVisual','sameVisual','differentVisual','gatewayVisual','maskVisual','bitVisual','mistakeVisual'];
async function open(page,url){
 if(inline){let html=source;for(const [name,css] of Object.entries(styles))html=html.replace(new RegExp(`<link[^>]+href="../${name.replace('.','\\.')}"[^>]*>`),()=>'<style>'+css+'</style>');await page.setContent(html);}
 else assert.equal((await page.goto(`${url}/${path}`,{waitUntil:'networkidle'})).status(),200);
}
async function geometry(page){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflows');
 const bad=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-visual]')).flatMap(f=>{
  const box=f.getBoundingClientRect();return Array.from(f.querySelectorAll('.device-card,.neighborhood,.number-half,.rule-card,.route-card,.mini-device,.gateway-box,.notation-card,.bit-bar,figcaption')).map(e=>{const r=e.getBoundingClientRect();return {id:f.id,text:e.textContent.slice(0,80),bad:r.left<box.left-1||r.right>box.right+1||e.scrollWidth>e.clientWidth+2};}).filter(x=>x.bad);
 }));assert.deepEqual(bad,[],'diagram overflows or clips its labels');
}
async function testSurface(url,surface){
 for(const [width,height,touch] of matrix){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,javaScriptEnabled:false}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  try{
   await open(page,url);
   assert.equal(await page.locator('meta[name="concept-visual-version"]').getAttribute('content'),version);
   assert.equal(await page.locator('[data-visual]').count(),10);
   assert.equal(await page.locator('body > header').evaluate(e=>getComputedStyle(e).position),'static');
   const text=await page.locator('body').innerText();
   assert.ok(text.includes('내 컴퓨터는 상대에게 바로 보내야 할까?'));
   assert.ok(text.includes('이런 주소를')&&text.includes('IP 주소라고 합니다.'));
   assert.ok(text.includes('하나의 그룹을')&&text.includes('Subnet(서브넷)'));
   assert.ok(text.includes('그 경계를 알려주는 표시가')&&text.includes('/25'));
   assert.ok(text.includes('Default Gateway')&&text.includes('Router'));
   assert.ok(text.includes('/25와 255.255.255.128은 같은 경계를 다른 방식으로 적은 것입니다.'));
   assert.ok(text.includes('오늘 새로 배운 말'));
   assert.ok(text.includes('10.77.10.0/25')&&text.includes('10.77.10.128/25'));
   assert.equal(text.includes('Proxy ARP'),false,'advanced validation detail must stay out of learner flow');
   assert.ok((await page.locator('#differentVisual').innerText()).includes('출구'));
   assert.ok((await page.locator('#gatewayVisual').innerText()).includes('Default Gateway'));
   assert.equal(await page.locator('svg:not([aria-hidden="true"])').count(),0,'icons must not replace text');
   for(const id of figures){const f=page.locator('#'+id),caption=await f.getAttribute('aria-labelledby');assert.ok(caption);assert.ok((await page.locator('#'+caption).innerText()).length>20);}
   await geometry(page);
   if(width===360||width===1366){for(const id of figures)await page.locator('#'+id).screenshot({path:resolve(out,`${surface}-${id}-${width}.png`)});await page.screenshot({path:resolve(out,`${surface}-concept-${width}.png`),fullPage:true});}
   for(const id of figures){
    await page.locator('#'+id).evaluate(e=>window.scrollTo({top:scrollY+e.getBoundingClientRect().top,behavior:'instant'}));
    const visible=await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+20,Math.max(1,r.top+20));return !!hit&&e.contains(hit);});assert.ok(visible,id+' is obscured');
   }
   assert.equal(await page.locator('.term-item').count(),6,'six end-of-page terminology cards');
   assert.equal(await page.locator('details.evidence-note').count(),0,'author validation evidence stays out of learner flow');
   const cta=page.locator('a[href="ip-subnetting-simulator.html"]');assert.equal(await cta.count(),1);await cta.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   assert.ok(await cta.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}));
   if(!inline){const r=await context.request.get(`${url}/labs/ip-subnetting-simulator.html`);assert.ok(r.ok(),'stage 2 link');}
   await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});await geometry(page);
   assert.ok((await page.locator('#groupVisual').innerText()).includes('네트워크 동네 A'));
   await page.emulateMedia({forcedColors:'active'});await geometry(page);
   assert.ok((await page.locator('#rangeVisual').innerText()).includes('두 번째 그룹'));
   assert.deepEqual(errors,[]);
   checks.push({surface,width,height,touch,javaScriptEnabled:false,status:'PASS',states:['normal','200%-text','forced-colors','scrolled','general-public-terminology'],visuals:10});
   console.log(`PASS concept diagrams ${surface} ${width}x${height}`);
  }catch(e){await page.screenshot({path:resolve(out,`concept-fail-${surface}-${width}.png`),fullPage:true});throw e;}finally{await context.close();}
 }
}
try{
 await testSurface(base,inline?'source-inline':process.env.BASE_URL?'requested-url':'local');
 if(!inline&&!process.env.BASE_URL&&process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io'&&process.env.GITHUB_REF==='refs/heads/main'){
  const publicBase='https://sebia1993.github.io',request=await browser.newContext();let ready=false;
  try{
   for(let i=0;i<18;i++){try{const r=await request.request.get(`${publicBase}/${path}?qa=${version}-${i}`,{timeout:15000});if(r.ok()&&normalize(await r.text())===normalize(source)){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
   assert.ok(ready,'Tested concept source has not reached public URL');
   for(const [f,css] of Object.entries(styles)){const r=await request.request.get(`${publicBase}/${f}?qa=${version}`);assert.ok(r.ok());assert.equal(normalize(await r.text()),normalize(css),'CSS mismatch: '+f);}
  }finally{await request.close();}
  await testSurface(publicBase,'published');
 }
}catch(e){checks.push({status:'FAIL',message:e.message});throw e;}
finally{
 await writeFile(resolve(out,'ip-concept-visual-qa.json'),JSON.stringify({version,networkLabExecuted:false,browser:browser.version(),checks},null,2));
 await writeFile(resolve(out,'ip-concept-source.html'),source);
 await browser.close();if(server)await new Promise(r=>server.close(r));
}
