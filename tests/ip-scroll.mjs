// Scrolled hit targets, not just bounding boxes: a sticky hero can hide a
// geometrically visible button. This test must fail against the old IP page.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'test-results');
await mkdir(output, { recursive: true });
const pagePath = 'labs/ip-subnetting-simulator.html';
const version = '20261003-header-flow-fix';
const normalize = text => text.replace(/\r\n/g, '\n').trim();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.ico': 'image/x-icon' };
let server;
let base = process.env.BASE_URL;
if (!base) {
  server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, '.' + name);
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
const results = [];
const viewports = [
  [320, 640, true], [360, 640, true], [360, 800, true],
  [390, 844, true], [412, 915, true], [800, 360, true],
  [768, 1024, true], [1366, 768, false], [1920, 1080, false]
];

async function targetAtTop(page, selector) {
  const point = await page.evaluate(selector => {
    const el = document.querySelector(selector);
    const before = el.getBoundingClientRect();
    window.scrollTo({ top: scrollY + before.top + before.height / 2 - 100, behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = Math.min(innerHeight - 8, Math.max(8, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return { x, y, top: r.top, bottom: r.bottom, height: innerHeight,
      receivesInput: !!hit && el.contains(hit), blocker: hit?.outerHTML.slice(0, 180) };
  }, selector);
  assert.ok(point.bottom > 0 && point.top < point.height, `${selector} is outside viewport`);
  assert.ok(point.receivesInput, `${selector} covered at scrolled position: ${point.blocker}`);
  return point;
}
async function inputAtTop(page, selector, touch) {
  const point = await targetAtTop(page, selector);
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
async function verifySurface(url, name) {
  for (const [width, height, touch] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    try {
      const response = await page.goto(`${url}/${pagePath}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('meta[name="lab-ui-version"]').getAttribute('content'), version);
      assert.equal(await page.locator('.lab-wrap > header.hero').evaluate(e => getComputedStyle(e).position), 'static');
      for (let i = 0; i < 4; i++) {
        await page.locator('.tab').nth(i).click();
        assert.equal(await page.locator('#runBtn').isDisabled(), true);
        // Raw coordinates avoid locator auto-scroll moving a hidden button out
        // from under an overlay before the test can notice the defect.
        await inputAtTop(page, '#choices .choice', touch);
        assert.equal(await page.locator('#runBtn').isEnabled(), true);
        await inputAtTop(page, '#runBtn', touch);
        assert.equal(await page.locator('#resultArea').isVisible(), true);
        assert.equal(await page.locator('#decisionOut').innerText(), ['ON-LINK', 'VIA GATEWAY', 'ON-LINK로 오판', 'VIA GATEWAY'][i]);
        for (const selector of ['#question', '#choices .choice', '#runBtn', '#srcIp', '#dstIp', '#decisionOut', '#explainTitle', '#evidenceText']) {
          await targetAtTop(page, selector);
        }
        assert.ok(await page.locator('header.hero').evaluate(e => e.getBoundingClientRect().bottom <= 0), 'introduction must scroll out of view');
        if (width === 360 && height === 800 && (i === 0 || i === 2)) {
          await targetAtTop(page, '#srcIp');
          await page.screenshot({ path: resolve(output, `ip-scroll-${name}-${width}-${i + 1}.png`) });
        }
        await inputAtTop(page, '#resetBtn', touch);
        assert.equal(await page.locator('#resultArea').isVisible(), false);
        assert.equal(await page.locator('#runBtn').isDisabled(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      assert.deepEqual(errors, [], 'runtime / asset failures');
      results.push({ surface: name, width, height, touch, scenarios: 4, status: 'PASS' });
      console.log(`PASS IP scroll/hit-target ${name} ${width}x${height}`);
    } finally { await context.close(); }
  }
}

try {
  await verifySurface(base, process.env.BASE_URL ? 'requested-url' : 'local');
  // On this repository's main-branch CI, check the actual published bytes and
  // interactions as well. Never call a rollout delay a successful public QA.
  if (!process.env.BASE_URL && process.env.GITHUB_REPOSITORY === 'sebia1993/sebia1993.github.io' && process.env.GITHUB_REF === 'refs/heads/main') {
    const publicBase = 'https://sebia1993.github.io';
    const expected = normalize(await readFile(resolve(root, pagePath), 'utf8'));
    const request = await browser.newContext();
    let published = false;
    try {
      for (let attempt = 0; attempt < 18; attempt++) {
        try {
          const r = await request.request.get(`${publicBase}/${pagePath}?qa=${version}-${attempt}`, { timeout: 15000 });
          if (r.ok() && normalize(await r.text()) === expected) { published = true; break; }
        } catch { /* A failed request is retried, never counted as PASS. */ }
        await new Promise(r => setTimeout(r, 5000));
      }
      assert.ok(published, 'Current IP lab bytes are not available at the public URL');
      for (const asset of ['styles.css', 'lab-ui.css']) {
        const r = await request.request.get(`${publicBase}/${asset}?qa=${version}`);
        assert.ok(r.ok(), `Published asset missing: ${asset}`);
        assert.equal(normalize(await r.text()), normalize(await readFile(resolve(root, asset), 'utf8')), `Published ${asset} differs from tested source`);
      }
    } finally { await request.close(); }
    await verifySurface(publicBase, 'published');
  }
} catch (e) {
  results.push({ status: 'FAIL', message: e.message });
  throw e;
} finally {
  await writeFile(resolve(output, 'ip-scroll-summary.json'), JSON.stringify({ version, networkLabExecuted: false, checks: results }, null, 2));
  await browser.close();
  if (server) await new Promise(r => server.close(r));
}
