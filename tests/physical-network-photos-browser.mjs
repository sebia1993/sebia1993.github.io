import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'test-results/physical-photos');
await mkdir(out,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){
 server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const path=resolve(root,'.'+pathname);
   if(!path.startsWith(root+'/'))throw new Error('outside root');
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'}[extname(path)]||'text/plain'));
   res.end(await readFile(path));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base='http://127.0.0.1:'+server.address().port;
}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu']});
const rows=[],errors=[];
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});p.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));}
async function photos(p){
 await p.locator('#utp-cross-section-photos').scrollIntoViewIfNeeded();
 for(const img of await p.locator('.utp-real-photo img').all()){
  await img.scrollIntoViewIfNeeded();
  await img.evaluate(e=>e.decode());
  assert.deepEqual(await img.evaluate(e=>[e.naturalWidth,e.naturalHeight]),[1200,900]);
  const rect=await img.boundingBox();assert.ok(rect.width>=250&&rect.height>180);
  assert.ok(Math.abs(rect.width/rect.height-4/3)<.01,'photo aspect ratio');
 }
}
async function geometry(p){
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'document overflow');
 const bad=await p.locator('.utp-real-photos,.utp-real-photo,.utp-photo-credit,.utp-photo-open').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.className));
 assert.deepEqual(bad,[],'photo text/container clipping');
}
try{
 const hashes=[];
 if(process.env.BASE_URL){
  for(const path of ['labs/physical-network.html','labs/physical-network-photos.css','labs/images/cat5e-cross-section.jpg','labs/images/cat6-cross-section.jpg','labs/images/cat5e-cross-section-original.jpg','labs/images/cat6-cross-section-original.jpg']){
   const expected=await readFile(root+'/'+path);
   const response=await fetch(base+'/'+path+'?verify='+Date.now());assert.equal(response.status,200,path);
   const actual=Buffer.from(await response.arrayBuffer());
   const sha256=createHash('sha256').update(actual).digest('hex');
   assert.equal(sha256,createHash('sha256').update(expected).digest('hex'),'published byte mismatch: '+path);
   hashes.push({path,sha256});
  }
 }
 for(const [width,height]of [[360,800],[800,360],[768,1024],[1366,768],[1920,1080]]){
  const ctx=await browser.newContext({viewport:{width,height}}),p=await ctx.newPage();watch(p);
  const response=await p.goto(base+'/labs/physical-network.html?qa='+Date.now()+'#utp-cross-section-photos',{waitUntil:'networkidle'});
  assert.equal(response.status(),200);await photos(p);await geometry(p);
  assert.equal(await p.locator('.utp-cutaway').count(),2);
  const cards=await p.locator('.utp-real-photo').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  if(width<=700){assert.ok(Math.abs(cards[0].x-cards[1].x)<1);assert.ok(cards[1].y>=cards[0].y+cards[0].height);}
  else{assert.ok(Math.abs(cards[0].y-cards[1].y)<1);assert.ok(cards[1].x>=cards[0].x+cards[0].width);}
  await p.locator('#utp-cross-section-photos').screenshot({path:out+'/photos-'+width+'.png'});
  await p.locator('#utp-cat5e-cat6').screenshot({path:out+'/context-'+width+'.png'});
  for(const a of await p.locator('.utp-real-photo-link').all()){
   await a.focus();assert.equal(await a.evaluate(e=>e===document.activeElement),true);
   const popupPromise=p.waitForEvent('popup');await p.keyboard.press('Enter');const popup=await popupPromise;
   await popup.waitForLoadState('load');assert.match(popup.url(),/-cross-section-original\.jpg$/);
   await popup.locator('img').evaluate(e=>e.decode());
   assert.deepEqual(await popup.locator('img').evaluate(e=>[e.naturalWidth,e.naturalHeight]),[4032,3024]);
   await popup.close();
  }
  await p.locator('.utp-photo-provenance summary').focus();await p.keyboard.press('Enter');
  assert.notEqual(await p.locator('.utp-photo-provenance').getAttribute('open'),null);await geometry(p);
  if(width===360){
   await p.evaluate(()=>{const es=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,n]of es)e.style.setProperty('font-size',n*2+'px','important');});
   await geometry(p);await p.locator('#utp-cross-section-photos').screenshot({path:out+'/text-200-percent.png'});
   await p.reload({waitUntil:'networkidle'});
  }
  await p.locator('.cg-primary').click();await p.waitForURL('**/physical-network-simulator.html');
  assert.equal(await p.locator('#runBtn').isDisabled(),true);
  await p.locator('#conceptGuideLink').click();await p.waitForURL('**/physical-network.html');
  rows.push({width,height,photoDecode:'PASS',originalOpen:'PASS',responsive:'PASS',keyboard:'PASS',navigation:'PASS'});
  await ctx.close();
 }
 for(const mode of ['no-javascript','forced-colors']){
  const ctx=await browser.newContext({viewport:{width:360,height:800},javaScriptEnabled:mode!=='no-javascript',...(mode==='forced-colors'?{forcedColors:'active'}:{})});
  const p=await ctx.newPage();watch(p);
  await p.goto(base+'/labs/physical-network.html#utp-cross-section-photos',{waitUntil:'networkidle'});
  await photos(p);await geometry(p);await p.locator('.utp-photo-provenance summary').click();
  assert.notEqual(await p.locator('.utp-photo-provenance').getAttribute('open'),null);
  await p.locator('#utp-cross-section-photos').screenshot({path:out+'/'+mode+'.png'});
  await ctx.close();
 }
 assert.deepEqual(errors,[]);
 const result={base,checkedAt:new Date().toISOString(),rows,errors,textZoom200:'PASS',withoutJavaScript:'PASS',forcedColors:'PASS',publicFiles:hashes,networkLabExecuted:false,classification:'Photo provenance and browser UI validation only'};
 await writeFile(out+'/'+(process.env.BASE_URL?'public':'local')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
