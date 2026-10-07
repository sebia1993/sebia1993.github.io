import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repo = fileURLToPath(new URL('../', import.meta.url));
const read = name => fs.readFileSync(path.join(repo, name), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
// Git may check text out as CRLF on Windows. Compare the repository's LF text
// without ignoring spaces, words, attributes or any other substantive content.
const protectedDigest = (name, value) => digest(/\.(?:html|css|js|svg)$/.test(name)
  ? value.toString('utf8').replace(/\r\n/g, '\n')
  : value);
const fixtures = JSON.parse(read('tests/fixtures/roadmap-simulator-models.json'));
const protectedPages = JSON.parse(read('tests/fixtures/roadmap-protected-pages.json'));

// Capture the original data at its real adapter boundary without rendering a
// browser or running its teaching simulation. Expected hashes predate this work.
function loadAdapter(topic) {
  let adapter;
  const element = () => ({
    style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    append() {}, appendChild() {}, before() {}, after() {}, setAttribute() {}, addEventListener() {},
    querySelector() { return element(); }, querySelectorAll() { return []; }
  });
  const context = {
    NetworkSimulator: { mount(value) { adapter = value; } },
    ResizeObserver: class { observe() {} disconnect() {} },
    addEventListener() {},
    requestAnimationFrame() {},
    document: {
      // Resize observers may register a surface during module loading. Their
      // callbacks deliberately do not execute in this data-only regression.
      getElementById() { return element(); },
      querySelector() { return element(); },
      querySelectorAll() { return []; },
      createElement() { return element(); }
    }
  };
  context.window = context;
  vm.createContext(context);
  const scripts = [...read(`labs/${topic}-simulator.html`).matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(name => name.endsWith('.js') && name !== 'network-simulator-session.js');
  for (const name of scripts) {
    vm.runInContext(read(`labs/${name}`), context, { filename: name, timeout: 1000 });
  }
  assert.ok(adapter?.raw, `${topic}: adapter data exported`);
  return adapter;
}

test('all 22 source models preserve the 120 previously verified scenarios', () => {
  assert.equal(Object.keys(fixtures).length, 22);
  let count = 0;
  for (const [topic, expected] of Object.entries(fixtures)) {
    const { raw } = loadAdapter(topic);
    assert.equal(digest(JSON.stringify(raw)), expected.hash, `${topic}: original conditions, answers, event order and evidence`);
    count += raw.length;
    for (const scenario of raw) {
      const keys = scenario.options.map((option, i) => Array.isArray(option) ? option[0] : i);
      assert.equal(new Set(keys).size, keys.length, `${topic}: unique prediction keys`);
      assert.ok(keys.includes(scenario.correct), `${topic}: answer identifies an existing choice`);
      assert.ok(scenario.question && scenario.reason, `${topic}: question and explanation retained`);
    }
  }
  assert.equal(count, 120);
});

test('reference simulators and associated concept pages stay outside this change', () => {
  for (const [name, expected] of Object.entries(protectedPages.files)) {
    const content = fs.readFileSync(path.join(repo, name));
    assert.equal(protectedDigest(name, content), expected, `${name}: protected baseline ${protectedPages.baseline}`);
    const windowsCheckout = content.toString('utf8').replace(/\r?\n/g, '\r\n');
    assert.equal(protectedDigest(name, Buffer.from(windowsCheckout)), expected, `${name}: same protected content after Windows checkout`);
  }
});

test('every target links to its own existing concept guide and keeps ARP styles', () => {
  for (const topic of Object.keys(fixtures)) {
    const html = read(`labs/${topic}-simulator.html`);
    const link = html.match(/<a\b[^>]*\bid=["']conceptGuideLink["'][^>]*>/)?.[0];
    assert.ok(link, `${topic}: visible concept link exists`);
    assert.match(link, new RegExp(`href=["'](?:\\./)?${topic}\\.html["']`), `${topic}: correct concept destination`);
    assert.match(read(`labs/${topic}.html`), /<h1\b/, `${topic}: destination is a guide`);
    for (const style of ['arp-simulator-1.css', 'arp-simulator-2.css', 'arp-simulator-3.css', 'arp-simulator-mobile.css', 'arp-simulator-mobile-follow.css']) {
      assert.ok(html.includes(style), `${topic}: ${style} directly reused`);
    }
  }
});

test('guide-aligned presentation covers every question without changing the answer keys', () => {
  for (const topic of Object.keys(fixtures)) {
    const { raw, presentation } = loadAdapter(topic);
    assert.equal(presentation?.lessons?.length, raw.length, `${topic}: each scenario has a learning brief`);
    for (const lesson of presentation.lessons) {
      assert.match(lesson.title, /[가-힣]/, `${topic}: meaningful Korean question title`);
      assert.match(lesson.brief, /[가-힣]/, `${topic}: learning context`);
      assert.ok(lesson.hints.length >= 2, `${topic}: progressive help`);
      assert.equal('correct' in lesson || 'options' in lesson, false, `${topic}: presentation does not override grading data`);
    }
    const guide = read(`labs/${topic}.html`).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const original = JSON.stringify(raw);
    for (const [oldName, displayName] of Object.entries(presentation.names || {})) {
      if (original.includes(oldName)) {
        const difference = presentation.guideDifferences?.find(item => item.name === displayName && /[가-힣]/.test(item.reason));
        assert.ok(guide.includes(displayName) || difference, `${topic}: ${oldName} → ${displayName} must occur in the concept guide or have an explained topology difference`);
      }
    }
  }
});

test('custom observation plans retain native event order and finite observation time', () => {
  for (const topic of Object.keys(fixtures)) {
    const adapter = loadAdapter(topic);
    assert.equal(typeof adapter.buildPlan, 'function', `${topic}: observation adapted to its learning goal`);
    for (let i = 0; i < adapter.raw.length; i++) {
      const plan = adapter.buildPlan(i, 'normal');
      assert.ok(plan.length >= 2, `${topic}/${i}: progressive observation`);
      for (const event of plan) {
        assert.ok(Number.isFinite(event.duration) && event.duration >= 180 && event.duration <= 60000, `${topic}/${i}: finite hold or motion duration`);
        assert.equal(typeof event.action, 'function', `${topic}/${i}: explicit scene action`);
        assert.ok(event.title && event.detail, `${topic}/${i}: observation has an explanation`);
      }
      if (adapter.raw[i].steps) {
        const native = Array.from(plan, event => event.modelStepIndex).filter(index => Number.isInteger(index) && index >= 0);
        assert.deepEqual(native, Array.from(adapter.raw[i].steps, (_, index) => index), `${topic}/${i}: original events appear in order`);
      }
    }
  }
});
