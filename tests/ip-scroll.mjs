// Learner-flow and scrolled hit-target regressions, shared by mobile and desktop.
// Unlike tab-only smoke tests, the primary test solves all four questions via Next.
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
const version = '20261007-beginner-flow-v3';
const key = 'network-learning:ip-subnetting:answers:v1';
const normalize = s => s.replace(/\r\n/g, '\n').trim();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.ico': 'image/x-icon' };
let server, base = process.env.BASE_URL;
if (!base) {
  server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (name === '/favicon.ico') { res.writeHead(204).end(); return; }
      const file = resolve(root, '.' + name);
      if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(await readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {});
const results = [];
const viewports = [[320,640,true],[360,640,true],[360,800,true],[390,844,true],[412,915,true],[800,360,true],[768,1024,true],[980,720,false],[1366,768,false],[1920,1080,false]];
async function atTop(page, selector, move = true) {
  const point = await page.evaluate(({ selector, move }) => {
    const e = document.querySelector(selector), r0 = e.getBoundingClientRect();
    if (move) window.scrollTo({ top: scrollY + r0.top + r0.height / 2 - 100, behavior: 'instant' });
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, height: innerHeight, width: innerWidth, hit: !!hit && e.contains(hit), blocker: hit?.outerHTML.slice(0, 160) };
  }, { selector, move });
  assert.ok(point.x > 0 && point.x < point.width && point.y > 0 && point.y < point.height, `${selector} outside viewport`);
  assert.ok(point.hit, `${selector} covered: ${point.blocker}`);
  return point;
}
async function press(page, selector, touch, move = true) {
  const p = await atTop(page, selector, move);
  if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function verifySurface(url, name) {
  for (const [width, height, touch] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    try {
      assert.equal((await page.goto(`${url}/${pagePath}`, { waitUntil: 'networkidle' })).status(), 200);
      assert.equal(await page.locator('meta[name="lab-ui-version"]').getAttribute('content'), version);
      assert.equal(await page.locator('header.hero').evaluate(e => getComputedStyle(e).position), 'static');
      await page.evaluate(() => { window.__tabClicks = 0; document.querySelector('#tabs').addEventListener('click', () => window.__tabClicks++); });
      const selections = ['on','gw','gw','on']; // Video's two correct, two incorrect answers.
      const decisions = ['같은 네트워크 (ON-LINK)','다른 네트워크 → Gateway','같은 네트워크로 잘못 판단','다른 네트워크 → Gateway'];
      for (let i = 0; i < 4; i++) {
        assert.equal(await page.locator('#lessonNo').innerText(), `문제 ${i+1} / 4`);
        assert.equal(await page.locator('#runBtn').isDisabled(), true);
        assert.equal(await page.locator('#resultArea').isVisible(), false);
        assert.equal(await page.locator('#nextBtn').isVisible(), false);
        assert.equal((await page.locator('body').innerText()).includes('PASS'), false, 'no author PASS on prediction screen');
        await press(page, `#choices [data-value="${selections[i]}"]`, touch);
        assert.equal(await page.locator('#runBtn').isEnabled(), true);
        assert.equal(await page.locator(`#choices [data-value="${selections[i]}"]`).getAttribute('aria-pressed'), 'true');
        await press(page, '#runBtn', touch);
        assert.equal(await page.locator('#verdictTitle').innerText(), i < 2 ? '✓ 정답입니다' : '✕ 오답입니다');
        assert.equal(await page.locator('#choices button:disabled').count(), 3, 'submitted answers must be locked');
        assert.equal(await page.locator('#submitRow').isVisible(), false, 'primary action must change after submit');
        assert.equal(await page.locator('#calculationDetails').isVisible(), true);
        assert.equal(await page.locator('#evidenceDetails').getAttribute('open'), null);
        assert.equal((await page.locator('body').innerText()).includes('PASS'), false, 'grade must not be confused with lab PASS');
        await atTop(page, '#verdictTitle', false);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'verdictTitle');
        const snapshot = await page.locator('#chosenAnswer').innerText();
        await page.locator('#choices button').last().evaluate(b => b.click());
        assert.equal(await page.locator('#chosenAnswer').innerText(), snapshot, 'locked choice cannot replace graded answer');
        if ((width === 360 && height === 800 || width === 1366) && i === 2) {
          await page.screenshot({ path: resolve(output, `ip-answer-${name}-${width}.png`) });
        }
        // The beginner result shows the validated topology before the primary Next action.
        // Numeric calculation remains available below the action as optional deepening.
        const positions = await page.evaluate(() => {
          const grade=document.querySelector('#verdictTitle').getBoundingClientRect().top+scrollY;
          const model=document.querySelector('#modelObservation').getBoundingClientRect().top+scrollY;
          const next=document.querySelector('#nextBtn').getBoundingClientRect().bottom+scrollY;
          const calc=document.querySelector('#calculationDetails').getBoundingClientRect().top+scrollY;
          return {grade,model,next,calc};
        });
        assert.ok(positions.grade<positions.model&&positions.model<positions.next&&positions.next<positions.calc,'result flow order must be verdict → topology → next → numeric deepening');
        assert.ok(positions.next - positions.grade < 1400, 'result-to-next distance is excessive');
        assert.equal(await page.locator('#decisionOut').innerText(), decisions[i]);
        if (i === 2) {
          assert.equal(await page.locator('#srcIp').innerText(), '10.77.10.10/24');
          assert.equal(await page.locator('#dstIp').innerText(), '10.77.10.140/25');
          assert.ok((await page.locator('#dstNet').innerText()).includes('10.77.10.0/24'));
          assert.ok((await page.locator('#calculationBasis').innerText()).includes('자신의 Prefix Length /24'));
          assert.equal(await page.locator('#maskTry').isVisible(), true);
          await press(page, '#maskTry25', touch);
          assert.ok((await page.locator('#maskTryResult').innerText()).includes('Gateway(.1)'));
          await press(page, '#maskTry24', touch);
          assert.ok((await page.locator('#maskTryResult').innerText()).includes('직접 찾으려'));
        }
        for (const sel of ['#srcIp','#dstIp','#explainTitle','#decisionOut']) await atTop(page, sel);
        await press(page, '#evidenceDetails summary', touch);
        assert.ok((await page.locator('#validatedOut').innerText()).includes('제작자 사전 장비 검증'));
        await atTop(page, '#evidenceText');
        assert.ok(await page.locator('header.hero').evaluate(e => e.getBoundingClientRect().bottom <= 0));
        await press(page, '#nextBtn', touch);
        if (i < 3) {
          assert.equal(await page.evaluate(() => document.activeElement.id), 'question');
          await atTop(page, '#question', false);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      }
      assert.equal(await page.evaluate(() => window.__tabClicks), 0, 'four questions must be solvable without returning to top tabs');
      assert.equal(await page.locator('#complete').isVisible(), true);
      assert.equal(await page.locator('#completionScore').innerText(), '완료 4 / 4 · 정답 2 · 다시 볼 문제 2');
      assert.equal(await page.locator('#scoreText').innerText(), '정답 2 · 다시 볼 문제 2 · 남은 문제 0');
      // Returning to an answered question restores its exact submitted choice.
      await press(page, '#reviewWrongBtn', touch);
      assert.equal(await page.locator('#lessonNo').innerText(), '문제 3 / 4');
      assert.equal(await page.locator('#chosenAnswer').innerText(), '그래도 Gateway(.1)에 먼저 보낸다');
      assert.equal(await page.locator('#verdictTitle').innerText(), '✕ 오답입니다');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#verdictTitle').innerText(), '✕ 오답입니다');
      assert.equal(await page.locator('#scoreText').innerText(), '정답 2 · 다시 볼 문제 2 · 남은 문제 0');
      await press(page, '#resetBtn', touch);
      assert.equal(await page.locator('#resultArea').isVisible(), false);
      assert.equal(await page.locator('#scoreText').innerText(), '정답 2 · 다시 볼 문제 1 · 남은 문제 1');
      await press(page, '#choices [data-value="on"]', touch);
      await press(page, '#runBtn', touch);
      assert.equal(await page.locator('#verdictTitle').innerText(), '✓ 정답입니다');
      assert.equal(await page.locator('#scoreText').innerText(), '정답 3 · 다시 볼 문제 1 · 남은 문제 0');
      // Revisit preserves; retry resets only its own answer. Keyboard path too.
      await page.locator('.tab').nth(0).click();
      assert.equal(await page.locator('#verdictTitle').innerText(), '✓ 정답입니다');
      await page.locator('#resetBtn').focus(); await page.keyboard.press('Enter');
      await page.locator('#choices [data-value="on"]').focus(); await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.value), 'on');
      await page.locator('#runBtn').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#verdictTitle').innerText(), '✓ 정답입니다');
      // Last question reached out of order routes to unanswered work, not a false completion.
      await page.evaluate(k => localStorage.removeItem(k), key); await page.reload({ waitUntil: 'networkidle' });
      await page.locator('.tab').nth(3).click();
      await press(page, '#choices [data-value="gw"]', touch); await press(page, '#runBtn', touch);
      assert.ok((await page.locator('#nextBtn').innerText()).includes('미응답 문제 1'));
      await press(page, '#nextBtn', touch);
      assert.equal(await page.locator('#lessonNo').innerText(), '문제 1 / 4');
      assert.equal(await page.locator('#complete').isVisible(), false);
      assert.deepEqual(errors, []);
      results.push({ surface:name,width,height,touch,scenarios:4,status:'PASS',flow:'next-only',graded:'2 correct / 2 incorrect',checks:['grade','next','prefix','restore','reload','retry','keyboard','skip','occlusion'] });
      console.log(`PASS learner flow + scrolled targets ${name} ${width}x${height}`);
    } finally { await context.close(); }
  }
  for (const kind of ['blocked','malformed']) {
    const context = await browser.newContext(); const page = await context.newPage();
    try {
      if (kind === 'blocked') await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get(){ throw new DOMException('blocked','SecurityError'); } }); });
      await page.goto(`${url}/${pagePath}`, { waitUntil:'networkidle' });
      if (kind === 'malformed') { await page.evaluate(k => localStorage.setItem(k,'{broken'),key); await page.reload({ waitUntil:'networkidle' }); }
      await page.locator('#choices .choice').first().click(); await page.locator('#runBtn').click();
      assert.equal(await page.locator('#verdictTitle').innerText(), '✓ 정답입니다');
      if (kind==='blocked') assert.ok((await page.locator('#storageNote').innerText()).includes('현재 화면에서만'));
      results.push({surface:name,case:`storage-${kind}`,status:'PASS'});
    } finally {await context.close();}
  }
}
try {
  await verifySurface(base, process.env.BASE_URL ? 'requested-url' : 'local');
  if (!process.env.BASE_URL && process.env.GITHUB_REPOSITORY==='sebia1993/sebia1993.github.io' && process.env.GITHUB_REF==='refs/heads/main') {
    const publicBase='https://sebia1993.github.io', expected=normalize(await readFile(resolve(root,pagePath),'utf8'));
    const context=await browser.newContext(); let published=false;
    try {
      for(let i=0;i<18;i++) {
        try { const r=await context.request.get(`${publicBase}/${pagePath}?qa=${version}-${i}`,{timeout:15000}); if(r.ok()&&normalize(await r.text())===expected){published=true;break;} } catch {}
        await new Promise(r=>setTimeout(r,5000));
      }
      assert.ok(published,'Tested bytes not yet published');
      for(const asset of ['styles.css','lab-ui.css']) {
        const r=await context.request.get(`${publicBase}/${asset}?qa=${version}`); assert.ok(r.ok());
        assert.equal(normalize(await r.text()),normalize(await readFile(resolve(root,asset),'utf8')));
      }
    } finally {await context.close();}
    await verifySurface(publicBase,'published');
  }
} catch(e) {results.push({status:'FAIL',message:e.message});throw e;}
finally {
  await writeFile(resolve(output,'ip-scroll-summary.json'),JSON.stringify({version,networkLabExecuted:false,checks:results},null,2));
  await browser.close();if(server)await new Promise(r=>server.close(r));
}
