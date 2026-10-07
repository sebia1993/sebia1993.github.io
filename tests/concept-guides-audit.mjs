/** Whole-roadmap Concept Guide regression. Excludes simulator mutations. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {extname,resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(), output=process.env.QA_OUTPUT||'test-results/concept-guides';await mkdir(output,{recursive:true});
const requested=process.env.QA_TOPIC_IDS?.split(',');
const topics=JSON.parse(await readFile('learning-data.json','utf8')).topics.filter(t=>t.detailUrl&&(!requested||requested.includes(t.id)));
assert(topics.length>0,'No matching Concept Guides');
let server;
if(!process.env.BASE_URL){server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);res.setHeader('content-type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[extname(path)]||'application/octet-stream'));res.end(await readFile(root+path))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(8772,'127.0.0.1',r));}
let proxy;if(process.env.BASE_URL&&process.env.HTTPS_PROXY){let u=new URL(process.env.HTTPS_PROXY);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})}}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-gpu'],...(proxy?{proxy}:{})});
// Optional only for a controlled QA proxy with a private certificate authority.
const contextOptions={ignoreHTTPSErrors:process.env.QA_PROXY_PRIVATE_CA==='1'};
const base=process.env.BASE_URL||'http://127.0.0.1:8772/';const results=[],failures=[];
async function dimensions(page){return page.evaluate(()=>{const visible=e=>{const r=e.getBoundingClientRect();return !!(r.width&&r.height)&&e.checkVisibility({checkVisibilityCSS:true})};let ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return {overflow:document.documentElement.scrollWidth>innerWidth+1,duplicateIds:ids.filter((v,i)=>ids.indexOf(v)!==i),brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].map(e=>e.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1))),h1:document.querySelectorAll('h1').length,clipped:[...document.querySelectorAll('.cg-node,.cg-terms dd,.cg-summary,.cg-question,.cg-primary')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2).map(e=>e.className),visiblePrimary:[...document.querySelectorAll('a[href$="-simulator.html"]')].filter(visible).length,contentHeight:document.documentElement.scrollHeight};});}
try{
for(const t of topics){
 const row={id:t.id,viewports:[],errors:[],assets:[],links:[]};
 const physical=t.id==='physical-network',evidenceSelector=physical?'.cg-evidence':'#cg-evidence';
 const page=await browser.newPage(contextOptions);page.on('pageerror',e=>row.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)row.assets.push(r.status()+' '+r.url())});
 try{
 for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]]){
 await page.setViewportSize({width,height});
 // Reuse the public document for resize checks to respect host request limits.
 if(!process.env.BASE_URL||width===360){const response=await page.goto(new URL(t.detailUrl,base).href,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);}
 const actual=await dimensions(page);row.viewports.push({width,height,...actual});assert.equal(actual.overflow,false,'page overflow');assert.deepEqual(actual.duplicateIds,[],'duplicate IDs');assert.deepEqual(actual.brokenAnchors,[],'broken anchors');assert.equal(actual.h1,1,'one h1');assert.deepEqual(actual.clipped,[],'clipped learning copy');assert.equal(actual.visiblePrimary,1,'one visible simulator CTA');
 if(t.id!=='ip-subnetting'){
  if(!physical)assert.equal(await page.locator('body').getAttribute('data-concept-audit'),'20261007','published revision');
  const section=physical?'#utp':'#cg-flow';
  await page.locator(`a[href="${section}"]`).click();assert(await page.locator(`${section} h2`).isVisible());
  await page.locator(`${evidenceSelector}>summary`).click();assert.equal(await page.locator(evidenceSelector).getAttribute('open'),'');assert.equal((await dimensions(page)).overflow,false,'expanded evidence overflow');
  await page.locator(`${evidenceSelector}>summary`).click();
 }
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/${t.id}-${width}.png`,fullPage:true});
 const cta=page.locator(t.id==='ip-subnetting'?'a[href="ip-subnetting-simulator.html"]':'.cg-primary').first();await cta.scrollIntoViewIfNeeded();assert(await cta.evaluate(e=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'CTA unobstructed');
 }
 // Real keyboard operation, 200% root text sizing, and forced colors.
 await page.setViewportSize({width:360,height:800});if(!process.env.BASE_URL)await page.goto(new URL(t.detailUrl,base).href);
 const zoomStyle=await page.addStyleTag({content:'html{font-size:200%!important}'});assert.equal((await dimensions(page)).overflow,false,'200% text overflow');row.textZoom='PASS';
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});assert.equal((await dimensions(page)).overflow,false,'forced colors overflow');row.forcedColors='PASS';
 await zoomStyle.evaluate(e=>e.remove());if(!process.env.BASE_URL)await page.goto(new URL(t.detailUrl,base).href);await page.emulateMedia({forcedColors:'none'});
 if(t.id!=='ip-subnetting'){
 const summary=page.locator(`${evidenceSelector}>summary`);await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator(evidenceSelector).getAttribute('open'),'');await page.keyboard.press('Enter');assert.equal(await page.locator(evidenceSelector).getAttribute('open'),null);row.keyboard='PASS';
 if(!physical){const oldId=await page.locator('.cg-archive [id]').first().getAttribute('id');if(oldId){await page.evaluate(id=>location.hash=id,oldId);await page.waitForTimeout(50);assert.equal(await page.locator(evidenceSelector).getAttribute('open'),'');row.legacyAnchor=oldId;}}
 }
 const links=await page.locator('a[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
 for(const link of links){if(/^(https?:|mailto:|#|javascript:)/.test(link))continue;const u=new URL(link,new URL(t.detailUrl,'http://local'));await access(resolve(root,'.'+decodeURIComponent(u.pathname)));}row.localLinks='PASS';
 const cta=page.locator(t.id==='ip-subnetting'?'a[href="ip-subnetting-simulator.html"]':'.cg-primary').first();await cta.click();await page.waitForURL('**/'+t.id+'-simulator.html');row.simulatorNavigation='PASS';
 await page.goBack();assert.equal(new URL(page.url()).pathname,'/labs/'+t.id+'.html');row.backNavigation='PASS';
 assert.deepEqual(row.errors,[]);assert.deepEqual(row.assets,[]);row.result='PASS';
 }catch(e){row.result='FAIL';row.reason=e.message;failures.push({id:t.id,reason:e.message});}
 results.push(row);console.log(t.id+': '+row.result+(row.reason?' '+row.reason:''));await page.close();if(process.env.BASE_URL)await new Promise(r=>setTimeout(r,2000));
}
// Static guides remain readable without JavaScript.
const nojs=await browser.newContext({...contextOptions,javaScriptEnabled:false,viewport:{width:360,height:800}});for(const t of topics){const p=await nojs.newPage();await p.goto(new URL(t.detailUrl,base).href);assert(await p.locator('h1').isVisible());assert(await p.locator(t.id==='ip-subnetting'?'#groupVisual':t.id==='physical-network'?'#cg-picture .cg-figure':'.cg-figure').isVisible());await p.close();}await nojs.close();
await writeFile(output+'/results.json',JSON.stringify({base,results,failures,noJavaScript:'PASS'},null,2));console.log(JSON.stringify({pages:results.length,passed:results.filter(r=>r.result==='PASS').length,failures}));
if(failures.length)process.exitCode=1;
}finally{await browser.close();server?.close();}
