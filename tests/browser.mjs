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
            assert.deepEqual(await page.locator('#summaryMetrics b').allTextContents(), ['1', '2', '5', '16', '5', '1', '2']);
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
          assert.deepEqual(errors, [], 'runtime or console errors');
        } finally { await page.close(); }
      });
    }
  }

  for (const width of [320, 390, 768, 1440]) {
    await check(`IP lesson ${width}px full interaction`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text()); });
      try {
        await page.goto(`${base}/labs/ip-subnetting.html`, { waitUntil: 'networkidle' });
        const root = page.locator('[data-phase]');
        await root.waitFor();
        assert.equal(await root.getAttribute('data-phase'), 'predicting');
        assert.equal(await root.getByRole('button', { name: '기본 모드', exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(await root.getByRole('button', { name: '자동 재생', exact: true }).isDisabled(), true);
        const scenarios = await page.evaluate(async () => (await import('/assets/lab/scenarios/ip-subnetting.js')).scenarios);
        assert.ok(scenarios?.length === 6, 'six normal/failure/recovery scenarios');
        for (const scenario of scenarios) {
          await root.getByLabel('실습 시나리오', { exact: true }).selectOption(scenario.id);
          // Deliberately wrong predictions remain usable and teach the correction.
          const choice = scenario.choices.find(c => c.id !== scenario.correctId);
          await root.getByRole('button', { name: choice.label, exact: true }).click();
          for (let i = 0; i < scenario.steps.length; i++) await root.getByRole('button', { name: '한 단계', exact: true }).click();
          assert.equal(await root.getAttribute('data-phase'), 'finished', scenario.id);
          assert.equal(Number(await root.getAttribute('data-step')), scenario.steps.length - 1);
          await root.getByRole('button', { name: '초기화', exact: true }).click();
          assert.equal(await root.getAttribute('data-phase'), 'predicting');
          assert.equal(Number(await root.getAttribute('data-step')), -1);
        }
        const first = scenarios[0];
        await root.getByLabel('실습 시나리오', { exact: true }).selectOption(first.id);
        await root.getByRole('button', { name: first.choices[0].label, exact: true }).click();
        await root.getByRole('button', { name: '자동 재생', exact: true }).click();
        await root.getByRole('button', { name: '초기화', exact: true }).click();
        await page.waitForTimeout(1300); // Past one playback timer: old work must stay cancelled.
        assert.equal(await root.getAttribute('data-phase'), 'predicting');
        assert.equal(Number(await root.getAttribute('data-step')), -1);
        await root.getByRole('button', { name: first.choices[0].label, exact: true }).click();
        await root.getByRole('button', { name: '자동 재생', exact: true }).click();
        await root.getByLabel('실습 시나리오', { exact: true }).selectOption(scenarios[1].id);
        await page.waitForTimeout(1300);
        assert.equal(await root.getAttribute('data-phase'), 'predicting');
        assert.equal(Number(await root.getAttribute('data-step')), -1);
        await root.getByRole('button', { name: '고급 모드', exact: true }).click();
        assert.equal(await root.getByRole('button', { name: '고급 모드', exact: true }).getAttribute('aria-pressed'), 'true');
        const follow = root.getByLabel('패킷 가로 따라가기', { exact: true });
        assert.equal(await follow.isChecked(), false);
        await follow.check();
        await root.getByRole('button', { name: '확대', exact: true }).click();
        await root.getByRole('button', { name: '축소', exact: true }).click();
        await root.getByRole('button', { name: '보기 맞춤', exact: true }).click();
        await root.getByRole('button', { name: '확대', exact: true }).click();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const routed = scenarios.find(s => s.id === 'different-subnet');
        await root.getByLabel('실습 시나리오', { exact: true }).selectOption(routed.id);
        await root.getByRole('button', { name: routed.choices.find(c => c.id === routed.correctId).label, exact: true }).click();
        const viewport = root.locator('.nl-topology-viewport');
        await viewport.scrollIntoViewIfNeeded();
        const vertical = await page.evaluate(() => scrollY);
        let maxHorizontal = 0;
        for (const step of routed.steps) {
          // Dispatch the control without Playwright scrolling it into view: test
          // the engine's follow behavior independently from the driver's scroll.
          await root.getByRole('button', { name: '한 단계', exact: true }).evaluate(button => button.click());
          maxHorizontal = Math.max(maxHorizontal, await viewport.evaluate(el => el.scrollLeft));
          assert.ok(Math.abs((await page.evaluate(() => scrollY)) - vertical) <= 1, 'packet follow moved document vertically');
          if (step.packet?.destinationIp) assert.ok((await root.locator('.nl-packet-body').textContent()).includes(step.packet.destinationIp));
        }
        assert.ok(maxHorizontal > 0, 'zoomed packet follow never moved horizontally');
        assert.equal(await root.getAttribute('data-phase'), 'finished');
        assert.equal(await root.locator('.nl-packet-details').getAttribute('open'), '');
        await root.getByRole('button', { name: '초기화', exact: true }).click();
        await root.getByRole('button', { name: routed.choices[0].label, exact: true }).click();
        await root.getByRole('button', { name: '자동 재생', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.nl-lab').dataset.phase === 'finished');
        assert.equal(await root.locator('.nl-event-log li').count(), routed.steps.length);
        await root.getByRole('button', { name: '기본 모드', exact: true }).click();
        assert.equal(await root.getByRole('button', { name: '기본 모드', exact: true }).getAttribute('aria-pressed'), 'true');
        // Calculator: arithmetic, special-prefix semantics and invalid input.
        await page.getByLabel('Prefix /', { exact: true }).fill('24');
        await page.getByRole('button', { name: '계산하기', exact: true }).click();
        assert.ok((await page.locator('#calculator-message').innerText()).includes('같은 Subnet'));
        assert.ok((await page.locator('#calculator-result').innerText()).includes('192.0.2.255'));
        await page.getByLabel('Prefix /', { exact: true }).fill('31');
        await page.getByRole('button', { name: '계산하기', exact: true }).click();
        assert.ok((await page.locator('#calculator-message').innerText()).includes('/31'));
        await page.getByLabel('출발지 IPv4', { exact: true }).fill('999.0.2.10');
        await page.getByRole('button', { name: '계산하기', exact: true }).click();
        assert.equal(await page.getByLabel('출발지 IPv4', { exact: true }).getAttribute('aria-invalid'), 'true');
        assert.equal(await page.locator('#calculator-result').innerText(), '');
        await page.getByLabel('출발지 IPv4', { exact: true }).fill('192.0.2.10');
        await page.getByLabel('Prefix /', { exact: true }).fill('25');
        await page.getByRole('button', { name: '계산하기', exact: true }).click();
        await page.getByRole('button', { name: 'IP 목적지: PC2 .140 · Ethernet 목적지: R1 왼쪽 MAC', exact: true }).click();
        assert.ok((await page.locator('#quiz-feedback').innerText()).startsWith('맞습니다.'));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.deepEqual(errors, []);
        await page.screenshot({ path: resolve(output, `ip-subnetting-${width}.png`), fullPage: true });
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
