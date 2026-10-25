import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative, sep, isAbsolute } from 'node:path';
import { startServer, projectRoot } from './serve.mjs';
import { GAME_VERSION } from '../content/world.js';
import { launchBrowser } from './lib/browser.mjs';
import { STORAGE_KEY } from '../packages/storage/store.js';
import { validateState } from '../packages/core/validate.js';

const output = join(projectRoot, 'dist');
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [], scope: 'actual static build, isolated Chromium, no deployment' };
const hash = data => createHash('sha256').update(data).digest('hex');
let service, browser, page;
async function check(name, operation) {
  const started = Date.now();
  try { await operation(); report.results.push({ name, passed: true, durationMs: Date.now() - started }); console.log('STATIC PASS · ' + name); }
  catch (error) { report.results.push({ name, passed: false, error: error.stack || error.message }); throw error; }
}
const storedLife = () => page.eval('(() => { const doc=JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + '));return doc?.lives.find(state=>state.id===doc.activeId);})()');
const saved = () => page.waitFor('document.querySelector("#save-status").textContent.includes("已在本地留档")');

try {
  const manifestBytes = await readFile(join(output, 'xianxia-build.json'));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.product, 'shanhai-life'); assert.equal(manifest.version, GAME_VERSION);
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
  report.manifest = { sha256: hash(manifestBytes), builtAt: manifest.builtAt, files: manifest.files.length, bytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0) };
  await check('构建清单的全部路径、字节与 SHA-256 一致，源码没有漏入旧版本', async () => {
    const seen = new Set(), expected = new Set(['xianxia-build.json']);
    for (const file of manifest.files) {
      assert.equal(typeof file.path, 'string'); assert.ok(!file.path.includes('\\'));
      assert.ok(!file.path.split('/').some(part => !part || part === '.' || part === '..'));
      assert.ok(!seen.has(file.path)); seen.add(file.path); expected.add(file.path);
      const destination = resolve(output, file.path), rel = relative(output, await realpath(destination));
      assert.ok(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
      const bytes = await readFile(destination); assert.equal(bytes.length, file.bytes, file.path); assert.equal(hash(bytes), file.sha256, file.path);
      if (file.path !== 'package.json') {
        const source = file.path === 'index.html' ? 'apps/web/index.html' : file.path;
        assert.equal(hash(await readFile(join(projectRoot, source))), file.sha256, source);
      }
    }
    const actual = [];
    async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else { assert.ok(entry.isFile(), path); actual.push(relative(output, path).replaceAll('\\', '/')); } } }
    await walk(output); assert.deepEqual(actual.sort(), [...expected].sort());
  });
  service = await startServer({ root: output, port: 0 });
  await check('构建的全部 Web 文件经 HTTP 响应逐字一致，首页与私有路径正确', async () => {
    let responses = 0;
    for (const file of manifest.files) {
      if (file.path === 'package.json') continue;
      const response = await fetch(service.url + file.path); assert.equal(response.status, 200, file.path);
      assert.equal(hash(Buffer.from(await response.arrayBuffer())), file.sha256, file.path); responses++;
    }
    const response = await fetch(service.url); assert.equal(response.status, 200);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), manifest.files.find(file => file.path === 'index.html').sha256);
    for (const path of ['package.json', '.git/config', '.env.local', '../AGENTS.md']) assert.equal((await fetch(service.url + path)).status, 404, path);
    report.http = { publicFileResponses: responses, root: true, privatePaths: 4 };
  });
  browser = await launchBrowser(); report.browser = browser.version;
  page = await browser.page(); await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await check('真实构建在浏览器完成出生、入世、自动抉择、回应与刷新恢复', async () => {
    await page.navigate(service.url); await page.waitFor('!!document.querySelector(".welcome h1")');
    assert.equal(await page.eval('localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')'), null);
    await page.click('[data-action="new-life"]'); await page.waitFor('!!document.querySelector("#birth-name")');
    await page.click('[data-action="begin-life"]'); await saved();
    const born = await storedLife(); validateState(born); assert.equal(born.month, 0); assert.equal(born.phase, 'life');
    await page.click('[data-action="step-choice"]'); await page.waitFor('!!document.querySelector("#decision-title")'); await saved();
    const pending = await storedLife(); assert.equal(pending.id, born.id); assert.equal(pending.month, 72); assert.equal(pending.pending.event, 'primer');
    assert.ok(await page.eval('document.querySelector(".scene-label.bottom").textContent.startsWith("6 岁")'));
    await page.click('[data-action="choose"][data-choice="read"]'); await page.waitFor('!document.querySelector("#decision-title")'); await saved();
    const progressed = await storedLife(); validateState(progressed); assert.equal(progressed.id, born.id); assert.ok(progressed.player.insight > pending.player.insight);
    await page.navigate(service.url); await page.waitFor('!!document.querySelector("[data-action=continue]")'); await page.click('[data-action="continue"]');
    assert.deepEqual(await storedLife(), progressed); assert.deepEqual(page.errors, []);
    assert.deepEqual(page.responses.filter(response => response.status >= 400), []);
    assert.deepEqual(page.requests.filter(url => !url.startsWith(service.url) && !url.startsWith('data:') && !url.startsWith('blob:')), []);
    report.life = { seed: progressed.seed, month: progressed.month, decisions: progressed.choices.length, fromOrdinaryBirth: true };
  });
} catch (error) { report.error = error.stack || error.message; console.error(report.error); process.exitCode = 1; }
finally {
  if (browser) await browser.close(); if (service) await service.close();
  await mkdir(join(projectRoot, 'artifacts'), { recursive: true });
  report.finishedAt = new Date().toISOString(); report.passed = !report.error && report.results.every(result => result.passed);
  await writeFile(join(projectRoot, 'artifacts/static-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('STATIC ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.filter(result => result.passed).length + '/' + report.results.length);
}
