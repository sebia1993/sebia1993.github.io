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

// The 2026-10-13 whole-roadmap audit intentionally updates reference labs and concise guides.
// Retain byte-level checks for untouched shared styles/assets and original advanced archives;
// check archived evidence separately instead of freezing the UI that this task repairs.
test('shared reference styles, assets and advanced evidence archives remain preserved', () => {
  for (const [name, expected] of Object.entries(protectedPages.files)) {
    if (!(/arp-.*\.css$/.test(name) || /-advanced-archive\.html$/.test(name) || /\.svg$/.test(name))) continue;
    const content = fs.readFileSync(path.join(repo, name));
    assert.equal(protectedDigest(name, content), expected, `${name}: protected baseline ${protectedPages.baseline}`);
    const windowsCheckout = content.toString('utf8').replace(/\r?\n/g, '\r\n');
    assert.equal(protectedDigest(name, Buffer.from(windowsCheckout)), expected, `${name}: same protected content after Windows checkout`);
  }
});

test('all original Concept Guide evidence archives remain byte-identical', () => {
  const baseline=JSON.parse(read('tests/fixtures/roadmap-concept-archives.json'));
  for (const [name, expected] of Object.entries(baseline.files)) {
    const archive=read(name).replace(/\r\n/g,'\n').match(/<!-- ORIGINAL-CONCEPT-START -->([\s\S]*?)<!-- ORIGINAL-CONCEPT-END -->/);
    assert.ok(archive, name+' retains its original evidence');
    assert.equal(digest(archive[1]),expected,name+' original evidence unchanged');
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

test('guide-aligned questions have valid display answer keys and preserve original evidence', () => {
  for (const topic of Object.keys(fixtures)) {
    const { raw, presentation } = loadAdapter(topic);
    assert.equal(presentation?.lessons?.length, raw.length, `${topic}: each scenario has a learning brief`);
    for (const lesson of presentation.lessons) {
      assert.match(lesson.title, /[가-힣]/, `${topic}: meaningful Korean question title`);
      assert.match(lesson.brief, /[가-힣]/, `${topic}: learning context`);
      assert.ok(lesson.hints.length >= 2, `${topic}: progressive help`);
      assert.equal('correct' in lesson || 'options' in lesson, false, `${topic}: raw grading fields remain separate`);
      if(lesson.choices){
        assert.ok(lesson.question&&lesson.reason,`${topic}: replacement question has a reason`);
        assert.ok(lesson.choices.some(([key])=>key===lesson.correctKey),`${topic}: display answer is a valid choice`);
        assert.equal(new Set(lesson.choices.map(([key])=>key)).size,lesson.choices.length,`${topic}: unique display keys`);
      }
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
