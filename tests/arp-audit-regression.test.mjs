import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real ARP model and controller with a minimal DOM and a virtual
// animation clock. These are behavioral regressions, not browser/render tests.
function simulator(){
  const elements=new Map(),timers=new Map(),listeners=new Map();
  let timerId=0,now=0;
  function element(){
    const classes=new Set();
    return {
      style:{},dataset:{},children:[],attributes:{},textContent:'',_html:'',value:'',hidden:false,disabled:false,
      classList:{add(...v){v.forEach(x=>classes.add(x))},remove(...v){v.forEach(x=>classes.delete(x))},contains:v=>classes.has(v),toggle(v,on){on??=!classes.has(v);on?classes.add(v):classes.delete(v);return on}},
      set innerHTML(v){this._html=v;this.children=[]},get innerHTML(){return this._html},
      setAttribute(k,v){this.attributes[k]=String(v)},appendChild(child){this.children.push(child)},
      querySelector(){return element()},scrollIntoView(){},addEventListener(){},
    };
  }
  const document={
    body:element(),head:element(),
    querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},
    querySelectorAll(s){return s==='[data-prediction]'?this.querySelector('#predictionOptions').children:[]},
    createElement:element,addEventListener(){},
  };
  const context=vm.createContext({document,console,
    window:{addEventListener(name,fn){listeners.set(name,fn)}},
    setTimeout(fn,ms=0){const id=++timerId;timers.set(id,{fn,time:now+ms});return id},
    clearTimeout(id){timers.delete(id)},alert(message){throw new Error(message)},
  });
  const run=code=>vm.runInContext(code,context);
  for(let i=1;i<=6;i++)run(fs.readFileSync(new URL(`../labs/arp-simulator-${i}.js`,import.meta.url),'utf8'));
  async function tick(){
    for(let i=0;i<12;i++)await Promise.resolve();
    if(!timers.size)return false;
    const [id,timer]=[...timers].sort((a,b)=>a[1].time-b[1].time)[0];
    timers.delete(id);now=timer.time;timer.fn();
    for(let i=0;i<12;i++)await Promise.resolve();
    return true;
  }
  async function finish(promise){
    let done=false,error;promise.then(()=>done=true,e=>{done=true;error=e});
    for(let i=0;i<10000&&!done;i++){
      const advanced=await tick();
      if(!advanced&&!done)throw new Error('Run stalled without an animation wait');
    }
    assert.equal(done,true,'run finishes within the animation budget');
    if(error)throw error;
  }
  return {run,tick,finish,elements,listeners};
}

test('five standard lessons preserve protocol outcomes and never claim unperformed recovery',async()=>{
  const sim=simulator();
  for(let i=0;i<5;i++){
    sim.run(`configureLesson(${i});state.predictionChoice=lessons[state.lesson].prediction.correct`);
    await sim.finish(sim.run('ping()'));
    assert.equal(sim.run('state.last.ok'),i<2);
    assert.equal(sim.run('state.completed[state.lesson]'),true);
    assert.equal(sim.run('state.busy'),false);
    assert.equal(sim.elements.get('#pingBtn').disabled,false);
    assert.equal(sim.run('state.recovered[state.lesson]'),false);
    if(i>=2){
      assert.deepEqual(Array.from(sim.run('checklistState().map(x=>x[2])')),[true,false,false]);
      assert.match(sim.elements.get('#verdictBox').innerHTML,/개념 확인 완료/);
    }
  }
  assert.match(sim.elements.get('#completionSummary').textContent,/0 \/ 3/);
});

test('recovery requires a successful replay after the original failure, not merely a setting change',async()=>{
  const sim=simulator();
  sim.run('configureLesson(2);state.predictionChoice="badgw"');
  await sim.finish(sim.run('ping()'));
  sim.run('invalidateExperiment();state.gw=GOOD.pc1Gw;renderLessonStatus()');
  assert.deepEqual(Array.from(sim.run('checklistState().map(x=>x[2])')),[true,true,false]);
  assert.equal(sim.run('state.recovered[2]'),false);
  await sim.finish(sim.run('ping()'));
  assert.equal(sim.run('state.last.ok'),true);
  assert.equal(sim.run('state.recovered[2]'),true);
  assert.deepEqual(Array.from(sim.run('checklistState().map(x=>x[2])')),[true,true,true]);
  sim.run('configureLesson(2,{resetProgress:true})');
  assert.equal(sim.run('state.completed[2]||state.recovered[2]||state.failureSeen[2]||!!state.answers[2]'),false);
});

test('destination/config changes invalidate predictions; free experiments do not use the fixed answer',async()=>{
  const sim=simulator();
  sim.run('state.predictionChoice="pc3";chooseDest("pc2")');
  assert.equal(sim.run('state.predictionChoice'),null);
  assert.equal(sim.run('state.experiment'),true);
  assert.equal(sim.elements.get('#predictionOptions').hidden,true);
  await sim.finish(sim.run('ping()'));
  assert.equal(sim.run('state.last.ok'),true);
  assert.equal(sim.run('state.completed[0]'),false);
  assert.equal(sim.run('state.answers[0]'),null);
  assert.equal(sim.elements.get('#predictionFeedback').hidden,true);
  assert.equal(sim.run('state.snapshots.some(x=>x.key==="icmp-pc1-r2")'),true);
});

test('reset cancels both ARP broadcast branches and permits only one subsequent run',async()=>{
  const sim=simulator();
  sim.run('state.predictionChoice="pc3"');
  const oldRun=sim.run('ping()');
  for(let i=0;i<300&&sim.run('pendingRunWaits.size')<2;i++)await sim.tick();
  assert.equal(sim.run('pendingRunWaits.size'),2,'cancel during the parallel ARP branch animation');
  sim.run('configureLesson(1,{resetProgress:true});state.predictionChoice="gw"');
  const newRun=sim.run('ping()'),duplicate=sim.run('ping()');
  await sim.finish(Promise.all([oldRun,newRun,duplicate]));
  assert.equal(sim.run('state.lesson'),1);
  assert.equal(sim.run('state.completed[0]'),false);
  assert.equal(sim.run('state.last.ok'),true);
  assert.equal(sim.run('state.snapshots.filter(x=>x.key==="icmp-pc1-r2").length'),1);
  assert.equal(sim.run('state.snapshots.find(x=>x.key==="icmp-r2-dest").ttl'),'63');
  assert.equal(sim.run('state.busy'),false);
  assert.equal(sim.run('pendingRunWaits.size'),0);
  assert.equal(sim.elements.get('#pingBtn').disabled,false);
});

test('changing view mode or destination during a run cannot publish a stale result',async()=>{
  for(const action of ['setViewMode("advanced")','chooseDest("pc2")']){
    const sim=simulator();
    sim.run('state.predictionChoice="pc3"');
    const pending=sim.run('ping()');
    await sim.tick();sim.run(action);
    await sim.finish(pending);
    assert.equal(sim.run('state.last'),null);
    assert.equal(sim.run('state.completed.some(Boolean)'),false);
    assert.equal(sim.run('state.busy'),false);
    assert.equal(sim.run('pendingRunWaits.size'),0);
  }
});

test('tab revisits preserve submitted records; explicit reset and BFCache return clear the right progress',async()=>{
  const sim=simulator();
  sim.run('state.predictionChoice="pc3"');await sim.finish(sim.run('ping()'));
  sim.run('configureLesson(1);configureLesson(0)');
  assert.equal(sim.run('state.predictionChoice'),'pc3');
  assert.equal(sim.run('state.predictionLocked'),true);
  assert.equal(sim.run('state.completed[0]'),true);
  sim.run('configureLesson(0,{resetProgress:true})');
  assert.equal(sim.run('state.predictionChoice'),null);
  assert.equal(sim.run('state.completed[0]'),false);
  sim.run('state.completed.fill(true);state.recovered.fill(true);state.failureSeen.fill(true);state.answers.fill({choice:"gw"});setViewMode("advanced")');
  sim.listeners.get('pageshow')({persisted:true});
  assert.equal(sim.run('state.completed.some(Boolean)||state.recovered.some(Boolean)||state.failureSeen.some(Boolean)||state.answers.some(Boolean)'),false);
  assert.equal(sim.run('state.lesson'),0);
  assert.equal(sim.run('isAdvancedMode()'),false);
});

test('last-only completion moves to an unfinished lesson instead of a hidden course result',async()=>{
  const sim=simulator();sim.run('configureLesson(4);state.predictionChoice="noreply"');
  await sim.finish(sim.run('ping()'));
  sim.run('goNextLesson()');
  assert.equal(sim.run('state.lesson'),0);
});

test('incorrect submissions remain incorrect after replay or a tab revisit',async()=>{
  const sim=simulator();
  sim.run('configureLesson(1);state.predictionChoice="pc2"');
  await sim.finish(sim.run('ping()'));
  assert.equal(sim.run('state.answers[1].correct'),false);
  assert.match(sim.elements.get('#predictionFeedback').innerHTML,/예상과 실제 동작이 달랐습니다/);
  await sim.finish(sim.run('ping()'));
  sim.run('configureLesson(0);configureLesson(1)');
  assert.equal(sim.run('state.answers[1].correct'),false);
  assert.equal(sim.run('state.predictionChoice'),'pc2');
});

test('free condition changes retain learned neighbors and targeted CLI clearing stays independent',()=>{
  const sim=simulator();
  sim.run('state.arp[state.pc3Ip]=MAC.pc3;state.r2Arp[state.pc2Ip]=MAC.pc2;state.predictionChoice="pc3";runCmd("clear arp unknown")');
  assert.equal(sim.run('state.predictionChoice'),'pc3');
  sim.run('chooseDest("pc2")');
  assert.equal(sim.run('state.arp[state.pc3Ip]'),sim.run('MAC.pc3'));
  sim.run('runCmd("clear arp pc1")');
  assert.equal(sim.run('Object.keys(state.arp).length'),0);
  assert.equal(sim.run('state.r2Arp[state.pc2Ip]'),sim.run('MAC.pc2'));
  sim.run('runCmd("show ip")');
  assert.match(sim.elements.get('#termOut').textContent,/PC1 192\.168\.10\.10\/24/);
});
