import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'test-results/physical-places');
await mkdir(out,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,'http://localhost').pathname;
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'}[extname(path)]||'text/plain'));
   res.end(await readFile(root+path));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base='http://127.0.0.1:'+server.address().port;
}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu']});
const rows=[],errors=[];
try{
 if(process.env.BASE_URL){
  for(const path of ['labs/physical-network.html','labs/physical-network-applications.css']){
   const expected=await readFile(root+'/'+path);
   const r=await fetch(base+'/'+path+'?qa='+Date.now());
   assert.equal(r.status,200,path);
   const actual=Buffer.from(await r.arrayBuffer());
   assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(expected).digest('hex'),'public bytes differ: '+path);
  }
 }
 for(const [width,height]of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  const ctx=await browser.newContext({viewport:{width,height}}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const r=await p.goto(base+'/labs/physical-network.html?qa='+Date.now()+'#utp-category-guide',{waitUntil:'networkidle'});
  assert.equal(r.status(),200);
  assert.equal(await p.locator('#utp-application-cases').getAttribute('open'),null);
  await p.locator('#utp-application-places').scrollIntoViewIfNeeded();
  await p.screenshot({path:out+'/closed-'+width+'.png'});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await p.locator('#utp-application-cases summary').focus();
  await p.keyboard.press('Enter');
  assert.notEqual(await p.locator('#utp-application-cases').getAttribute('open'),null);
  assert.equal(await p.locator('.utp-place-card').count(),4);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(await p.locator('.utp-place-card').evaluateAll(els=>els.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.innerText)),[]);
  await p.locator('#utp-application-cases').screenshot({path:out+'/open-'+width+'.png'});
  for(const a of await p.locator('.utp-case-source a').all()){
   await a.focus();assert.equal(await a.evaluate(e=>e===document.activeElement),true);
   assert.equal(await a.getAttribute('target'),'_blank');
  }
  if(width===360){
   await p.evaluate(()=>{const pairs=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,n]of pairs)e.style.setProperty('font-size',n*2+'px','important');});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'200% text overflow');
   await p.locator('#utp-application-cases').screenshot({path:out+'/text-200-percent.png'});
   await p.reload({waitUntil:'networkidle'});
  }
  await p.locator('.cg-primary').click();await p.waitForURL('**/physical-network-simulator.html');
  assert.equal(await p.locator('#runBtn').isDisabled(),true);
  await p.locator('#conceptGuideLink').click();await p.waitForURL('**/physical-network.html');
  rows.push({width,height,closedOpen:'PASS',overflow:'PASS',clipping:'PASS',keyboard:'PASS',navigation:'PASS'});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);
 const result={base,checkedAt:new Date().toISOString(),rows,errors,textZoom200:'PASS',networkLabExecuted:false,publicBytes:process.env.BASE_URL?'MATCH':'NOT_APPLICABLE'};
 await writeFile(out+'/'+(process.env.BASE_URL?'public':'local')+'.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{
 await browser.close();if(server)await new Promise(r=>server.close(r));
}
