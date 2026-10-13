import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the real topic adapter and mobile projection without a browser.
// This verifies semantic state; viewport rendering remains a separate browser gate.
function load(topic) {
  const elements=new Map();
  function element(key) {
    if(elements.has(key))return elements.get(key);
    const attributes=new Map();
    const e={className:'',textContent:'',style:{},dataset:{},clientWidth:0,
      setAttribute(k,v){if(k==='class')this.className=String(v);else attributes.set(k,String(v));},
      getAttribute(k){return k==='class'?this.className:attributes.get(k)||null;},
      querySelector(selector){return element(key+' '+selector);},
      querySelectorAll(){return [];},append(){},appendChild(){},after(){},
      classList:{add(...names){e.className=[...new Set([...e.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove(...names){e.className=e.className.split(/\s+/).filter(n=>!names.includes(n)).join(' ');}}
    };elements.set(key,e);return e;
  }
  let adapter;
  const document={
    getElementById:id=>element('#'+id),
    querySelector:selector=>selector.startsWith('[data-')?element(selector):selector==='#simVisual .topology-stage'?element(selector):null,
    querySelectorAll:()=>[],
  };
  const context={document,NetworkSimulator:{mount:a=>{adapter=a;}},ResizeObserver:class{observe(){}},matchMedia:()=>({matches:false})};
  context.window=context;vm.createContext(context);
  for(const name of ['packet-labs-presentation.js',topic+'-model.js'])vm.runInContext(fs.readFileSync(new URL('../labs/'+name,import.meta.url),'utf8'),context,{filename:name});
  return {adapter,el:element,scene(index,nativeStep){adapter.reset(index);const item=adapter.buildPlan(index).find(p=>p.modelStepIndex===nativeStep);assert.ok(item);item.action();}};
}

test('normal VLAN separation stays excluded, not a failed mobile link',()=>{
  const m=load('vlan-trunk');m.scene(1,2);
  assert.match(m.el('[data-device="pc10b"]').className,/is-excluded/);
  assert.match(m.el('[data-edge="sw2-pc10b"]').className,/is-excluded/);
  assert.doesNotMatch(m.el('[data-edge="sw2-pc10b"]').className,/is-stop/);
  assert.match(m.el('[data-edge="sw2-pc20b"]').className,/is-active/);
});

test('Inter-VLAN unicast highlights PC C cable while PC D cable stays neutral',()=>{
  const m=load('inter-vlan-routing');m.scene(1,4);
  assert.match(m.el('[data-edge="sw1-pc20a"]').className,/is-active/);
  assert.doesNotMatch(m.el('[data-edge="sw1-pc20b"]').className,/is-active|is-reply|is-stop/);
  m.scene(2,1);
  assert.match(m.el('[data-edge="sw1-pc20a"]').className,/is-reply/);
  assert.doesNotMatch(m.el('[data-edge="sw1-pc20b"]').className,/is-active|is-reply/);
});

for(const [topic,fields] of [['dhcp',['dhcpState','connectState']],['dns',['dnsState','ipState']]]){
  test(`${topic} resets the visible result when a new attempt starts`,()=>{
    const m=load(topic);m.scene(4,3);
    for(const id of fields)assert.notEqual(m.el('#'+id).textContent,'관찰 전');
    m.adapter.reset(0);
    for(const id of fields)assert.equal(m.el('#'+id).textContent,'관찰 전');
  });
}

test('DHCP service/relay failures keep the physical transit link healthy',()=>{
  const m=load('dhcp');
  for(const [step,node] of [[1,'r2'],[2,'r1']]){
    m.scene(3,step);
    assert.equal(m.el('#l3Svg').getAttribute('class'),'net-link idle');
    assert.match(m.el('#'+node).className,/stop/);
    assert.doesNotMatch(m.el('[data-edge="r1-r2"]').className,/is-stop/);
  }
  m.scene(4,2);
  assert.match(m.el('#pc1').className,/stop/);
  assert.doesNotMatch(m.el('#r1').className,/stop/);
  assert.equal(m.el('#l3Svg').getAttribute('class'),'net-link idle');
});

test('DNS service and wrong-address failures identify the processing endpoint',()=>{
  const m=load('dns');
  m.scene(3,0);
  assert.match(m.el('#r2').className,/stop/);
  assert.equal(m.el('#l5Svg').getAttribute('class'),'net-link idle');
  m.scene(3,2);
  assert.match(m.el('#pc1').className,/stop/);
  assert.equal(m.el('#l4Svg').getAttribute('class'),'net-link idle');
});

test('LACP observation wait does not overwrite the bundled failure baseline',()=>{
  const m=load('lacp');
  for(const i of [0,1]){m.adapter.reset(i);assert.equal(m.el('#poBadge').textContent,'Po1 · 관찰 전');}
  for(const i of [2,3,4]){
    m.adapter.reset(i);
    assert.equal(m.el('#poBadge').textContent,'Po1 · UP');
    assert.equal(m.el('#labelM1').textContent,'M1 · Bundled');
    assert.equal(m.el('#labelM2').textContent,'M2 · Bundled');
  }
});

test('STP shows complete port roles while its evidence shorthand stays unchanged',()=>{
  const m=load('stp');m.scene(0,3);
  assert.match(m.el('#sw3Ports').textContent,/Root Port · 전달 Cost 4/);
  assert.match(m.el('#sw3Ports').textContent,/Alternate · 대기 Cost 4/);
  assert.match(m.adapter.raw[0].reason,/CLI\/BPDU/);
});

test('principle questions use view overrides and retain original evidence questions',()=>{
  const lacp=load('lacp').adapter,dns=load('dns').adapter;
  assert.match(lacp.raw[2].question,/실제로 확인된 Flow→Member Mapping/);
  assert.match(lacp.presentation.lessons[2].question,/한 Flow의 여러 패킷/);
  assert.equal(lacp.presentation.lessons[2].correctKey,'map');
  assert.match(dns.raw[1].question,/DNS ID 관계/);
  assert.match(dns.presentation.lessons[1].question,/다음 조회는 어디/);
  assert.equal(dns.presentation.lessons[1].correctKey,'rewrite');
});
