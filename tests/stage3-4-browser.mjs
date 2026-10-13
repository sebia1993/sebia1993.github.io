// Focused rendered geometry and screenshot review. Full scenario QA is separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {finishPlayback, playbackSnapshot} from './roadmap-playback-assertions.mjs';

const repo = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = path.join(repo, 'test-results/stage3-4-visual');
fs.mkdirSync(output, {recursive: true});
const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const filename = path.resolve(repo, '.' + pathname);
    if (!filename.startsWith(repo + path.sep)) throw new Error('Invalid path');
    response.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[path.extname(filename)] || 'application/octet-stream');
    response.end(fs.readFileSync(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE, args:['--no-sandbox','--disable-gpu']});
const scenarios = {'routing-table':4, ospf:2, acl:0, 'nat-pat':4, 'firewall-vpn':0};
const targets = process.env.TOPICS?.split(',') || Object.keys(scenarios);
const reportPath = path.join(output,'report.json');
const results = process.env.TOPICS && fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath)).results.filter(result=>!targets.includes(result.topic)) : [];

async function answerAndRun(page, index) {
  await page.locator(`[data-lesson="${index}"]`).click();
  const choice = await page.evaluate(i => {
    const lesson = window.networkLessonModel[i];
    return lesson.choices.findIndex(entry => entry[0] === lesson.correctKey);
  }, index);
  await page.locator('#simOptions button').nth(choice).click();
  await page.locator('#simRun').click();
  await finishPlayback(page);
}

async function iconGeometry(page, topic) {
  const edges = topic === 'ospf' ? [['link12','r1','r2'],['link23','r2','r3'],['link13','r1','r3']] :
    [['link-pc-r1','node-pc1','node-r1'],['link-r1-r2','node-r1','node-r2'],['link-r1-r3','node-r1','node-r3']];
  return page.evaluate(edges => edges.map(([id,from,to]) => {
    const line=document.getElementById(id), svg=line.ownerSVGElement;
    const bounds=svg.getBoundingClientRect(), view=svg.viewBox.baseVal;
    const endpoints=[from,to].map((nodeId,index) => {
      const icon=document.querySelector(`#${nodeId} .node-icon`).getBoundingClientRect();
      const x=bounds.left+Number(line.getAttribute(`x${index+1}`))*bounds.width/view.width;
      const y=bounds.top+Number(line.getAttribute(`y${index+1}`))*bounds.height/view.height;
      return {nodeId,x,y,inside:x>=icon.left-2&&x<=icon.right+2&&y>=icon.top-2&&y<=icon.bottom+2,
        edgeDistance:Math.min(Math.abs(x-icon.left),Math.abs(x-icon.right),Math.abs(y-icon.top),Math.abs(y-icon.bottom))};
    });
    const labels=[...document.querySelectorAll('#simVisual .topology-stage .node b,#simVisual .topology-stage .node small')];
    const labelCrossings=labels.filter(label=>{
      const rect=label.getBoundingClientRect();
      for(let i=0;i<=200;i++){
        const x=endpoints[0].x+(endpoints[1].x-endpoints[0].x)*i/200,y=endpoints[0].y+(endpoints[1].y-endpoints[0].y)*i/200;
        if(x>rect.left+1&&x<rect.right-1&&y>rect.top+1&&y<rect.bottom-1)return true;
      }
      return false;
    }).map(label=>label.textContent);
    return {id,endpoints,labelCrossings};
  }), edges);
}

async function natRecovery(page, width, scenario) {
  await page.locator('#simRecover').click();
  const expected = {1:['r3','A · Echo Request'],3:['r1','A · Echo Reply'],4:['r3','D · Echo Request'],6:['r4','D · Echo Reply']};
  const arrivals = [];
  for (let guard=0;guard<20;guard++) {
    const state=await playbackSnapshot(page);
    if(state.phase==='COMPLETED') break;
    assert.equal(state.phase,'RUNNING');
    const target=expected[state.index];
    if(target){
      await page.clock.fastForward(Math.max(0,state.duration-state.elapsed-90));
      const arrival=await page.evaluate(([target,label])=>{
        const packet=document.querySelector('.so-packet'), icon=document.querySelector(`#${target} .node-icon`);
        const a=packet.getBoundingClientRect(), b=icon.getBoundingClientRect();
        return {target,expectedLabel:label,label:packet.textContent,distance:Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)};
      },target);
      assert.equal(arrival.label,arrival.expectedLabel);
      assert.ok(arrival.distance<3,`same-flow endpoint ${arrival.target}: ${arrival.distance}`);
      arrivals.push(arrival);
      if(width===1366)await page.locator('#simVisual').screenshot({path:path.join(output,`nat-${scenario}-${state.index}-arrival.jpg`),type:'jpeg',quality:88});
    }
    const now=await playbackSnapshot(page);
    await page.clock.fastForward(now.duration-now.elapsed+40);
  }
  assert.equal((await playbackSnapshot(page)).phase,'COMPLETED');
  assert.equal(arrivals.length,4);
  return arrivals;
}

try {
  for(const topic of targets)for(const width of [360,768,1366,1920]){
    const index=scenarios[topic];
    const height=({360:800,768:1024,1366:768,1920:1080})[width];
    const page=await browser.newPage({viewport:{width,height}}), result={topic,width,height,status:'PASS'};
    try{
      await page.clock.install({time:new Date('2026-10-13T00:00:00Z')});
      await page.clock.pauseAt(new Date('2026-10-13T00:00:01Z'));
      const response=await page.goto(`${base}/labs/${topic}-simulator.html`,{waitUntil:'load'});
      assert.equal(response.status(),200,'local page is served');
      await page.evaluate(()=>document.fonts.ready);
      await answerAndRun(page,index);
      if(topic==='nat-pat')result.arrivals=await natRecovery(page,width,5);
      if(topic==='routing-table'){
        assert.equal(await page.locator('#routeInterfaceState').isVisible(),true);
        assert.equal(await page.locator('#node-r3').evaluate(node=>node.classList.contains('down')),false);
        result.localInterface=await page.locator('#routeInterfaceState').innerText();
        result.linkDash=await page.locator('#link-r1-r3').evaluate(line=>getComputedStyle(line).strokeDasharray);
        assert.equal(result.linkDash,'none');
      }
      if(topic==='routing-table'||topic==='ospf'){
        result.geometry=await iconGeometry(page,topic);
        for(const edge of result.geometry)for(const endpoint of edge.endpoints){assert.ok(endpoint.inside,`${edge.id} inside icon`);assert.ok(endpoint.edgeDistance<2,`${edge.id} boundary: ${endpoint.edgeDistance}`);}
        for(const edge of result.geometry)assert.deepEqual(edge.labelCrossings,[],`${edge.id} keeps device labels clear`);
      }
      result.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(result.overflow<=1);
      await page.locator('#simVisual').screenshot({path:path.join(output,`${topic}-${width}-visual.jpg`),type:'jpeg',quality:88});
      await page.screenshot({path:path.join(output,`${topic}-${width}-page.jpg`),type:'jpeg',quality:85,fullPage:true});
      if(topic==='nat-pat'&&width===1366){await answerAndRun(page,5);result.secondRecovery=await natRecovery(page,width,6);}
    }catch(error){result.status='FAIL';result.error=error.stack;await page.screenshot({path:path.join(output,`${topic}-${width}-failure.jpg`),type:'jpeg',quality:88,fullPage:true}).catch(()=>{});}
    finally{await page.close();results.push(result);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({scope:'Focused geometry and virtual-clock scene review; full scenario and wall-clock QA reported separately',results},null,2));console.log(`${topic} ${width}: ${result.status}${result.error?' '+result.error.split('\n')[0]:''}`);}
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
assert.equal(results.filter(result=>result.status==='FAIL').length,0,'focused browser checks');
