import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read = topic => fs.readFileSync(new URL(`../labs/${topic}-model.js`, import.meta.url), 'utf8');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/roadmap-simulator-models.json', import.meta.url)));

test('stage 3–4 scenario and evidence objects retain their original hashes', () => {
  for (const topic of ['routing-table', 'ospf', 'acl', 'nat-pat', 'firewall-vpn']) {
    const source = read(topic).match(/const lessons=(\[[\s\S]*?\n\]);/);
    assert.ok(source, `${topic}: original lesson array is present`);
    const lessons = vm.runInNewContext(`(${source[1]})`);
    assert.equal(createHash('sha256').update(JSON.stringify(lessons)).digest('hex'), fixtures[topic].hash, topic);
  }
});

// Execute the actual model's plan builder with a recording presentation adapter.
// This verifies route semantics; it does not simulate packets or browser layout.
test('NAT-05 and NAT-06 recover both original request/reply pairs', () => {
  let adapter;
  vm.runInNewContext(read('nat-pat'), {
    document: {},
    SecurityLab: {
      names: {}, labels: {},
      event: (title, detail, action) => ({title, detail, action}),
      move: (title, detail, route, label, action, tone) => ({title, detail, route, label, action, tone}),
    },
    NetworkSimulator: {mount(value) { adapter = value; }},
  });
  for (const index of [4, 5]) {
    const moves = JSON.parse(JSON.stringify(adapter.buildPlan(index, 'recover'))).filter(event => event.route);
    assert.equal(moves.length, 4, `${adapter.raw[index].claim}: two explicit round trips`);
    assert.deepEqual(moves.map(event => event.route), [
      ['r1', 'r2', 'r3'], ['r3', 'r2', 'r1'],
      ['r4', 'r2', 'r3'], ['r3', 'r2', 'r4'],
    ]);
    for (let i = 0; i < moves.length; i += 2) {
      assert.match(moves[i].label, /Echo Request$/);
      assert.match(moves[i + 1].label, /Echo Reply$/);
      assert.deepEqual(moves[i + 1].route, moves[i].route.toReversed(), 'reply returns to the request origin');
      assert.equal(moves[i + 1].tone, 'return');
    }
    const opening = adapter.buildPlan(index, 'recover')[0].detail;
    assert.match(opening, index === 4 ? /Router D.*선택/ : /Router A.*inside/);
  }
});

class Element {
  constructor() { this.className = ''; this.hidden = true; this.style = {}; this.attributes = {}; }
  classList = {
    add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/), ...names])].filter(Boolean).join(' '); },
    remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
    contains: name => this.className.split(/\s+/).includes(name),
  };
  setAttribute(name, value) { this.attributes[name] = value; if (name === 'class') this.className = value; }
  getAttribute(name) { return name === 'class' ? this.className : this.attributes[name]; }
}

test('Routing local E0/2 failure does not mark the peer router or cable as failed', () => {
  const elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const source = read('routing-table');
  const context = vm.createContext({$, recovered: false});
  vm.runInContext(source.slice(source.indexOf('function resetTopology()'), source.indexOf('const adapter=')), context);
  context.resetTopology();
  context.applyTopology({routeMode: 'failure', dest: '198.51.100.10', decision: 'No route'});
  assert.equal($('routeInterfaceState').hidden, false, 'local interface warning is visible');
  assert.equal($('node-r1').classList.contains('stop'), true, 'forwarding stops at Router A');
  assert.equal($('node-r3').classList.contains('down'), false, 'Router C has no recorded device failure');
  assert.equal($('link-r1-r3').getAttribute('class'), 'net-link', 'physical cable remains connected');
  context.resetTopology();
  context.recovered = true;
  context.applyTopology({routeMode: 'failure', dest: '198.51.100.10', decision: 'Default route'});
  assert.equal($('routeInterfaceState').hidden, true, 'recovery clears the local warning');
  assert.equal($('node-r3').classList.contains('active'), true, 'the recovered path reaches Router C');
});

for (const [topic, prefix, ids, edges] of [
  ['routing-table', 'route', ['node-pc1', 'node-r1', 'node-r2', 'node-r3'], [['link-pc-r1', 0, 1], ['link-r1-r2', 1, 2], ['link-r1-r3', 1, 3]]],
  ['ospf', 'ospf', ['r1', 'r2', 'r3'], [['link12', 0, 1], ['link23', 1, 2], ['link13', 0, 2]]],
]) {
  test(`${topic} connections anchor to icon boundaries independently of label bounds`, () => {
    const icons = [
      {left: 131, top: 91, width: 40, height: 30},
      {left: 281, top: 211, width: 60, height: 40},
      {left: 461, top: 71, width: 50, height: 40},
      {left: 471, top: 351, width: 40, height: 30},
    ];
    const elements = new Map();
    ids.forEach((id, i) => elements.set(id, {
      // A large name/description box deliberately differs from the device icon.
      getBoundingClientRect: () => ({left: icons[i].left - 70, top: icons[i].top - 10, width: 180, height: 140}),
      querySelector: selector => selector === '.node-icon' ? {getBoundingClientRect: () => icons[i]} : null,
    }));
    edges.forEach(([id]) => elements.set(id, new Element()));
    const stage = {clientWidth: 550, clientHeight: 420, clientLeft: 1, clientTop: 1,
      getBoundingClientRect: () => ({left: 100, top: 50}), querySelector: () => new Element()};
    const context = vm.createContext({$: id => elements.get(id), [`${prefix}Stage`]: stage});
    const source = read(topic);
    vm.runInContext(source.slice(source.indexOf(`function ${prefix}Center(`), source.indexOf(`function ${prefix}Move(`)), context);
    context[`${prefix}Layout`]();
    for (const [edgeId, a, b] of edges) {
      const line = elements.get(edgeId);
      for (const [n, i] of [[1, a], [2, b]]) {
        const x = line.getAttribute(`x${n}`), y = line.getAttribute(`y${n}`);
        const box = icons[i], left = box.left - 101, top = box.top - 51;
        assert.ok(x >= left - 1e-6 && x <= left + box.width + 1e-6 && y >= top - 1e-6 && y <= top + box.height + 1e-6, `${edgeId}: endpoint lies on its device`);
        assert.ok(Math.min(Math.abs(x-left), Math.abs(x-left-box.width), Math.abs(y-top), Math.abs(y-top-box.height)) < 1e-6, `${edgeId}: endpoint meets an icon edge`);
      }
    }
    const firstCenter = JSON.parse(JSON.stringify(context[`${prefix}Center`](ids[0])));
    assert.deepEqual(firstCenter, {x: 50, y: 55, w: 40, h: 30}, 'packet coordinates use the icon center');
  });
}
