import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute real scene callbacks and SecurityLab state updates. Geometry and
// animation rendering remain browser checks, not claims made by this harness.
function load(topic) {
  class Element {
    constructor(tag='div') { this.tagName=tag;this.children=[];this.attributes={};this.style={};this.dataset={};this.className='';this.hidden=false;this._text='';this.clientWidth=900;this.clientHeight=450; }
    get classList() { const e=this;return {contains:n=>e.className.split(/\s+/).includes(n),add(...ns){e.className=[...new Set([...e.className.split(/\s+/).filter(Boolean),...ns])].join(' ');},remove(...ns){e.className=e.className.split(/\s+/).filter(n=>!ns.includes(n)).join(' ');}}; }
    set textContent(value){this._text=String(value);this.children=[];}
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
    set innerHTML(value){this.textContent=value;}
    setAttribute(k,v){if(k==='class')this.className=String(v);else this.attributes[k]=String(v);}
    getAttribute(k){return k==='class'?this.className:this.attributes[k]??null;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;this._text='';}
    getBoundingClientRect(){return {left:0,top:0,width:100,height:80};}
    querySelectorAll(selector){const matches=e=>selector.split(',').some(s=>s.trim().startsWith('.')?e.classList.contains(s.trim().slice(1)):e.tagName===s.trim());const all=[];for(const child of this.children){if(matches(child))all.push(child);all.push(...child.querySelectorAll(selector));}return all;}
    querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  }
  const elements=new Map(),stage=new Element();stage.className='so-stage';
  const create=(id,cls='',parent=stage)=>{const e=new Element();e.className=cls;elements.set(id,e);parent.append(e);return e;};
  const svg=create('svg','topology-svg');
  const nodes=topic==='observability'?['nodeR1','nodeR2','nodeNMS']:['nodeR1','nodeR2','nodeR3','nodeNMS'];
  for(const id of nodes){const node=create(id,'node');const icon=new Element();icon.className='node-icon';node.append(icon);}
  for(const id of topic==='observability'?['linkData','linkMgmt']:['linkR1','linkR2','linkR3'])create(id,'link',svg);
  for(const id of topic==='observability'?['dataToken','r1Token','mgmtToken']:['tokenR1','tokenR2','tokenR3'])create(id,'token-text');
  const visual=create('simVisual',''),states=create('states',''),example=create('automationExample','');example.hidden=true;
  const document={body:{dataset:{topic}},getElementById:id=>elements.get(id)??null,querySelector:s=>s==='#simVisual .so-stage'?stage:null,querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
  let adapter;
  const context={document,NetworkSimulator:{mount(value){adapter=value;}},addEventListener(){},matchMedia:()=>({matches:false})};context.window=context;
  vm.createContext(context);
  for(const name of ['security-operations-presentation.js',`${topic}-model.js`])vm.runInContext(fs.readFileSync(new URL(`../labs/${name}`,import.meta.url),'utf8'),context,{filename:name});
  return {adapter,el:id=>elements.get(id),states,example,visual};
}

function healthy(m) {
  assert.match(m.el('linkData').className,/\bdata-on\b/);
  assert.doesNotMatch(m.el('linkData').className,/data-off/);
  assert.doesNotMatch(m.el('nodeR1').className,/\bfail\b/);
  assert.match(m.el('dataToken').textContent,/3\/3/);
  assert.match(m.el('r1Token').textContent,/Admin1 \/ Oper1/);
  assert.match(m.el('linkMgmt').className,/mgmt-on/);
}

for(const index of [0,1])test(`OBS ${index+1}: recovery atomically replaces the failed scene, including review`,()=>{
  const m=load('observability'),plan=m.adapter.buildPlan(index);
  m.adapter.reset(index);
  for(const step of plan.slice(0,-2))step.action();
  assert.match(m.el('linkData').className,/data-off/);
  assert.match(m.el('nodeR1').className,/\bfail\b/);
  plan.at(-2).action();healthy(m);
  plan.at(-1).action();healthy(m);
  assert.match(m.states.textContent,/현재 장면.*복구 후/);
  assert.match(m.states.textContent,/이력/);
  // Previous / next review callbacks must remain consistent without a reset.
  plan.at(-3).action();assert.match(m.el('linkData').className,/data-off/);
  plan.at(-2).action();healthy(m);
  plan.at(-1).action();healthy(m);
});

test('OBS distinguishes an unknown cause, a failure comparison, and a final recovered scene',()=>{
  const m=load('observability'),packet=m.adapter.buildPlan(0);
  packet[2].action();
  assert.doesNotMatch(m.el('linkData').className,/data-off|data-on/);
  assert.doesNotMatch(m.el('nodeR1').className,/\bfail\b/);
  assert.match(m.states.textContent,/다른 근거와 대조 필요/);
  m.adapter.buildPlan(3).at(-1).action();
  assert.match(m.el('linkData').className,/data-off/);
  assert.match(m.states.textContent,/같은 E0\/0 장애/);
  m.adapter.buildPlan(4).at(-1).action();healthy(m);
  m.adapter.reset(2);
  assert.doesNotMatch(m.el('linkData').className,/data-off|data-on/);
  assert.equal(m.states.textContent,'');
  assert.equal(m.el('dataToken').textContent,'관찰 대기');
});

test('all OBS and automation scene actions execute through the real shared helper',()=>{
  for(const topic of ['observability','network-automation']){
    const m=load(topic);
    for(let i=0;i<m.adapter.raw.length;i++){
      m.adapter.reset(i);
      for(const event of m.adapter.buildPlan(i)){assert.ok(event.duration>=180);event.action();}
    }
  }
});

test('automation preserves a real state fragment through normalization, comparison and JSON',()=>{
  const m=load('network-automation'),plan=m.adapter.buildPlan(1);
  const codes=()=>m.example.querySelectorAll('code').map(e=>e.textContent);
  m.adapter.reset(1);assert.equal(m.example.hidden,true);
  plan.find(e=>e.title==='상태 원문 보존').action();
  assert.equal(codes()[0],'administratively down/down');
  assert.equal(codes()[1],'다음 관찰에서 확인');
  plan.find(e=>e.title==='같은 필드로 정리').action();
  const actual=JSON.parse(codes()[1]);
  assert.equal(actual.admin,'down');assert.equal(actual.protocol,'down');assert.equal(actual.ip,'10.255.0.2');
  assert.equal(codes()[2],'다음 관찰에서 확인');
  plan.find(e=>e.title==='정상 기준과 비교').action();assert.match(codes()[2],/MISMATCH/);
  assert.equal(codes()[3],'다음 관찰에서 확인');
  plan.at(-1).action();
  const report=JSON.parse(codes()[3]);
  assert.equal(report.collection_status,'SUCCESS');assert.equal(report.comparison,'MISMATCH');
  assert.equal(report.intent.admin,'up');assert.equal(report.actual.admin,'down');
  assert.equal(codes()[0],'administratively down/down');
  assert.match(m.example.textContent,/학습용 축약이며 원본 파일 복제가 아닙니다/);
  m.adapter.reset(0);assert.equal(m.example.hidden,true);assert.equal(m.example.textContent,'');
});

test('automation collection error creates no invented Actual in its JSON example',()=>{
  const m=load('network-automation');
  m.adapter.buildPlan(2).at(-1).action();
  const codes=m.example.querySelectorAll('code').map(e=>e.textContent),report=JSON.parse(codes[3]);
  assert.match(codes[0],/상태 원문 없음/);
  assert.equal(JSON.parse(codes[1]),null);
  assert.equal(report.device,'R3');assert.equal(report.actual,null);
  assert.equal(report.collection_status,'ERROR');assert.equal(report.comparison,'NOT_EVALUATED');
});
