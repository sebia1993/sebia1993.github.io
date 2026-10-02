import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(repo, 'test-results');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
let server;
let base = process.env.BASE_URL;
if (!base) {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(repo, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(resolve(repo) + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
const failures = [];
let assertions = 0;
async function check(name, fn) {
  try { await fn(); assertions++; console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const paths = ['roadmap.html', 'labs/arp-default-gateway.html', 'labs/arp-default-gateway-simulator.html', 'labs/ethernet-mac-table.html', 'labs/ethernet-mac-table-simulator.html', 'viewer.html?mode=packets&scenario=01-same-subnet&point=pc1-sw1', 'ethernet-viewer.html?mode=packets&scenario=02-known-unicast&point=pc2-sw1'];
try {
  for (const width of [390, 768, 1440]) {
    for (const path of paths) {
      await check(`legacy ${width}px ${path}`, async () => {
        const page = await browser.newPage({ viewport: { width, height: 960 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
        try {
          const response = await page.goto(`${base}/${path}`, { waitUntil: 'networkidle' });
          assert.equal(response.status(), 200);
          assert.ok((await page.locator('body').innerText()).length > 200);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'page overflows horizontally');
          if (path === 'roadmap.html') {
            assert.equal(await page.locator('.topic').count(), 27);
            const roadmapText = await page.locator('body').innerText();
            assert.ok(roadmapText.includes('Concept Guide'));
            assert.ok(roadmapText.includes('Interactive Lab'));
            assert.equal(await page.locator('#summaryMetrics').count(), 0);
            assert.equal(roadmapText.includes('PNETLab'), false);
          }
          if (path.endsWith('-simulator.html')) {
            const action = page.locator(path.includes('arp-') ? '#pingBtn' : '#runBtn');
            assert.equal(await action.isDisabled(), true);
            await page.locator('#predictionOptions button').first().click();
            assert.equal(await action.isEnabled(), true);
            await page.locator('#resetBtn').click();
            assert.equal(await action.isDisabled(), true, 'reset must require a new prediction');
            if (path.includes('arp-') && width === 390) {
              assert.equal(await page.locator('[data-m-device]').count(), 4);
              assert.ok(await page.locator('[data-m-device]').first().getAttribute('aria-disabled'));
            }
          }
          if (path === 'labs/ethernet-mac-table.html') {
            await page.screenshot({ path: resolve(output, `ethernet-mac-table-${width}.png`), fullPage: true });
          }
          assert.deepEqual(errors, [], 'runtime or console errors');
        } finally { await page.close(); }
      });
    }
  }

  for (const width of [320, 390, 768, 1440]) {
    await check(`IP concept ${width}px two-stage page`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
      try {
        const response = await page.goto(`${base}/labs/ip-subnetting.html`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        const body = await page.locator('body').innerText();
        assert.ok(body.includes('Mask를 적용한 Network Prefix가 같으면 on-link'));
        assert.ok(body.includes('10.77.10.10/25'));
        assert.ok(body.includes('10.77.10.140/25'));
        assert.equal(await page.locator('a[href="ip-subnetting-simulator.html"]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: resolve(output, `ip-subnetting-concept-${width}.png`), fullPage: true });
      } finally { await page.close(); }
    });

    await check(`IP simulator ${width}px prediction and four scenarios`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
      try {
        const response = await page.goto(`${base}/labs/ip-subnetting-simulator.html`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('.tab').count(), 4);
        if (width <= 390) {
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'mobile page overflows horizontally');
          assert.equal(await page.evaluate(() => {
            const tabs = document.querySelector('.tabs');
            return tabs.scrollWidth > tabs.clientWidth;
          }), true, 'mobile lesson selector should be compact horizontal scroll');
          assert.equal(await page.evaluate(() => {
            const card = document.querySelector('main.card').getBoundingClientRect();
            return card.top < innerHeight * 0.9;
          }), true, 'current learning question is pushed below the first mobile viewport');
          const beforeLessonTop = await page.evaluate(() => document.querySelector('main.card').getBoundingClientRect().top);
          await page.locator('.tab').nth(1).click();
          await page.waitForTimeout(120);
          const mobileLessonPosition = await page.evaluate(() => {
            const card = document.querySelector('main.card').getBoundingClientRect();
            const question = document.querySelector('#question').getBoundingClientRect();
            return { cardTop: card.top, questionTop: question.top, viewport: innerHeight };
          });
          assert.ok(mobileLessonPosition.cardTop < beforeLessonTop - 40, 'mobile lesson selection did not move the current lesson toward the viewport');
          assert.ok(mobileLessonPosition.questionTop >= 0 && mobileLessonPosition.questionTop < mobileLessonPosition.viewport * 0.75, 'mobile lesson selection should leave the current question visibly in the viewport');
          await page.locator('.tab').nth(0).click();
          await page.waitForTimeout(120);
        }
        const run = page.locator('#runBtn');
        const expectedDecisions = ['ON-LINK', 'VIA GATEWAY', 'ON-LINK로 오판', 'VIA GATEWAY'];
        for (let i = 0; i < 4; i++) {
          await page.locator('.tab').nth(i).click();
          assert.equal(await run.isDisabled(), true, `lesson ${i + 1} must require prediction`);
          await page.locator('#choices .choice').first().click();
          assert.equal(await run.isEnabled(), true);
          await run.click();
          assert.equal(await page.locator('#resultArea').isVisible(), true);
          assert.equal(await page.locator('#validatedOut').innerText(), 'PASS');
          assert.equal(await page.locator('#decisionOut').innerText(), expectedDecisions[i]);
          if (i === 2) {
            assert.ok((await page.locator('#evidenceText').innerText()).includes('.140에 직접 ARP 3회'));
          }
        }
        assert.equal(await page.locator('#progressText').innerText(), '4 / 4 완료');
        assert.equal(await page.locator('#complete').isVisible(), true);
        await page.locator('#resetBtn').click();
        assert.equal(await run.isDisabled(), true);
        assert.equal(await page.locator('#resultArea').isVisible(), false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: resolve(output, `ip-subnetting-simulator-${width}.png`), fullPage: true });
      } finally { await page.close(); }
    });
  }
  await check('Wireless Policy Mapper original Python runtime', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
    });
    try {
      const response = await page.goto(`${base}/projects/runtime-demos/wireless-policy-mapper/index.html`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      await page.locator('#status').filter({ hasText: '원 저장소 Python 소스 로드 완료' }).waitFor({ timeout: 120000 });
      assert.equal(await page.locator('#runBtn').isEnabled(), true);
      await page.locator('#runBtn').click();
      await page.locator('#status').filter({ hasText: '실행 완료' }).waitFor({ timeout: 30000 });
      assert.ok((await page.locator('#policies').innerText()).includes('내부망 차단, 인터넷 중심'));
      assert.ok((await page.locator('#mappings').innerText()).includes('CORP-WIFI'));
      assert.ok((await page.locator('#mappings').innerText()).includes('employee-internet'));
      assert.ok((await page.locator('#runtimeInfo').innerText()).includes('Python 3.14'));
      assert.deepEqual(errors, [], 'runtime or console errors');
      await page.screenshot({ path: resolve(output, 'wireless-policy-mapper-runtime.png'), fullPage: true });
    } finally { await page.close(); }
  });
} finally {
  await browser.close();
  if (server) await new Promise(r => server.close(r));
}
await (await import('node:fs/promises')).writeFile(resolve(output, 'browser-summary.json'), JSON.stringify({ target: process.env.BASE_URL ? 'deployed' : 'local', assertions, failures, networkLabExecuted: false }, null, 2));
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
