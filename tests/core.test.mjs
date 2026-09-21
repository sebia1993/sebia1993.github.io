import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, choose, advance, reset } from '../assets/lab/core.js';
import { parseIPv4, subnetInfo, sameSubnet } from '../assets/lab/ipv4.js';

const scenario = {
  id: 'test-normal', choices: [{ id: 'direct', label: '직접' }, { id: 'gateway', label: 'Gateway' }],
  correctId: 'direct', steps: [
    { title: '판단', detail: '같은 subnet', nodeId: 'pc1', packet: { destinationIp: '192.0.2.20' } },
    { title: '도착', detail: '직접 전달', nodeId: 'pc2' }
  ]
};

test('IPv4 arithmetic remains unsigned at the top of its range', () => {
  assert.equal(parseIPv4('255.255.255.255'), 4294967295);
  assert.equal(parseIPv4('0.0.0.0'), 0);
  const info = subnetInfo('203.0.113.200', 25);
  assert.equal(info.network, '203.0.113.128');
  assert.equal(info.broadcast, '203.0.113.255');
  assert.equal(info.firstHost, '203.0.113.129');
  assert.equal(info.lastHost, '203.0.113.254');
  assert.equal(info.hostCount, 126);
});

test('conventional /24 and /30 ranges do not include network/broadcast', () => {
  const subnet = subnetInfo('192.0.2.10', 24);
  assert.equal(subnet.mask, '255.255.255.0');
  assert.equal(subnet.network, '192.0.2.0');
  assert.equal(subnet.broadcast, '192.0.2.255');
  assert.equal(subnet.hostCount, 254);
  const small = subnetInfo('198.51.100.6', 30);
  assert.equal(small.network, '198.51.100.4');
  assert.equal(small.firstHost, '198.51.100.5');
  assert.equal(small.lastHost, '198.51.100.6');
  assert.equal(small.broadcast, '198.51.100.7');
  assert.equal(small.hostCount, 2);
});

test('/0, /31, and /32 keep their distinct address semantics', () => {
  const all = subnetInfo('203.0.113.90', 0);
  assert.equal(all.mask, '0.0.0.0');
  assert.equal(all.network, '0.0.0.0');
  assert.equal(all.broadcast, '255.255.255.255');
  assert.equal(all.hostCount, 4294967294);
  const p2p = subnetInfo('192.0.2.11', 31);
  assert.equal(p2p.type, 'point-to-point');
  assert.equal(p2p.firstHost, '192.0.2.10');
  assert.equal(p2p.lastHost, '192.0.2.11');
  assert.equal(p2p.broadcast, null);
  assert.equal(p2p.hostCount, 2);
  const host = subnetInfo('255.255.255.255', 32);
  assert.equal(host.type, 'host-route');
  assert.equal(host.network, '255.255.255.255');
  assert.equal(host.firstHost, host.lastHost);
  assert.equal(host.broadcast, null);
  assert.equal(host.hostCount, 1);
});

test('same-subnet comparison covers prefix boundaries and /32 equality', () => {
  assert.equal(sameSubnet('192.0.2.127', '192.0.2.128', 24), true);
  assert.equal(sameSubnet('192.0.2.127', '192.0.2.128', 25), false);
  assert.equal(sameSubnet('0.0.0.0', '255.255.255.255', 0), true);
  assert.equal(sameSubnet('192.0.2.10', '192.0.2.11', 31), true);
  assert.equal(sameSubnet('192.0.2.10', '192.0.2.11', 32), false);
  assert.equal(sameSubnet('192.0.2.10', '192.0.2.10', 32), true);
});

test('malformed IPv4 and prefixes are rejected before bitwise coercion', () => {
  for (const ip of ['1.2.3', '1.2.3.4.5', '256.2.3.4', '-1.2.3.4', '1e2.2.3.4', '1..3.4', '01.2.3.4', '', null]) {
    assert.throws(() => parseIPv4(ip));
  }
  for (const prefix of [-1, 33, 24.5, '24', NaN, Infinity, null]) {
    assert.throws(() => subnetInfo('192.0.2.10', prefix));
    assert.throws(() => sameSubnet('192.0.2.10', '192.0.2.20', prefix));
  }
});

test('prediction is required, wrong predictions can still learn, choice locks after execution', () => {
  const initial = createState(scenario);
  assert.equal(advance(initial, scenario), initial);
  const wrong = choose(initial, scenario, 'gateway');
  assert.equal(initial.choiceId, null);
  assert.equal(wrong.correct, false);
  const first = advance(wrong, scenario);
  assert.equal(first.phase, 'playing');
  assert.equal(first.events.length, 1);
  assert.equal(choose(first, scenario, 'direct'), first);
  const end = advance(first, scenario);
  assert.equal(end.phase, 'finished');
  assert.equal(end.events.length, 2);
  assert.equal(advance(end, scenario), end);
});

test('reset produces independent immutable state and removes prior events', () => {
  const first = createState(scenario), second = createState(scenario);
  const active = advance(choose(first, scenario, 'direct'), scenario);
  assert.equal(second.choiceId, null);
  assert.equal(second.events.length, 0);
  assert.throws(() => active.events.push({}));
  assert.throws(() => { active.events[0].packet.destinationIp = '198.51.100.20'; });
  assert.equal(scenario.steps[0].packet.destinationIp, '192.0.2.20');
  const fresh = reset(scenario);
  assert.deepEqual(fresh, first);
  assert.notEqual(fresh, first);
  assert.equal(fresh.phase, 'predicting');
  assert.equal(fresh.stepIndex, -1);
});

test('invalid or cross-scenario transitions fail explicitly', () => {
  const state = createState(scenario);
  assert.throws(() => choose(state, scenario, 'missing'));
  assert.throws(() => advance(state, { ...scenario, id: 'other' }));
  assert.throws(() => createState({ ...scenario, correctId: 'missing' }));
  assert.throws(() => createState({ ...scenario, choices: [{ id: 'direct' }, { id: 'direct' }] }));
  assert.throws(() => createState({ ...scenario, steps: [] }));
});

test('packet source and conceptual-step metadata survive immutable transitions', () => {
  const explicit = { ...scenario, steps: [
    { title: '새 요청', fromNodeId: 'pc1', nodeId: 'pc2', packetId: 'echo-1', packet: { sourceIp: '192.0.2.10' } },
    { title: '응답 관찰', nodeId: 'pc2', animate: false }
  ] };
  const sent = advance(choose(createState(explicit), explicit, 'direct'), explicit);
  assert.equal(sent.events[0].fromNodeId, 'pc1');
  assert.equal(sent.events[0].packetId, 'echo-1');
  assert.equal(sent.events[0].animate, true);
  const observed = advance(sent, explicit);
  assert.equal(observed.events[1].animate, false);
  assert.equal(observed.events[1].fromNodeId, null);
  assert.equal(sent.events.length, 1);
});
