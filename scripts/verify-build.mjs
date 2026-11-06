import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, relative, sep, isAbsolute } from 'node:path';
import { startServer, projectRoot } from './serve.mjs';
import { ADVENTURE_VERSION } from '../content/adventure.js';
import { launchBrowser } from './lib/browser.mjs';
import { ADVENTURE_KEY } from '../packages/adventure/store.js';
import { validateRun } from '../packages/adventure/engine.js';

const output = join(projectRoot, 'dist');
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [], scope: 'actual static build of 归山记, isolated Chromium, no deployment' };
const hash = data => createHash('sha256').update(data).digest('hex');
let service, browser, page;
async function check(name, operation) {
  const started = Date.now();
  try { await operation(); report.results.push({ name, passed: true, durationMs: Date.now() - started }); console.log('STATIC PASS · ' + name); }
  catch (error) { report.results.push({ name, passed: false, error: error.stack || error.message }); throw error; }
}
const storedDoc = () => page.eval('(() => { const raw = localStorage.getItem(' + JSON.stringify(ADVENTURE_KEY) + '); return raw ? JSON.parse(raw) : null; })()');

try {
  const manifestBytes = await readFile(join(output, 'xianxia-build.json'));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.product, 'guishanji'); assert.equal(manifest.version, ADVENTURE_VERSION);
  assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
  report.manifest = { sha256: hash(manifestBytes), builtAt: manifest.builtAt, files: manifest.files.length, bytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0) };
  await check('构建清单的全部路径、字节与 SHA-256 一致，源码没有漏入旧版本', async () => {
    const seen = new Set(), expected = new Set(['xianxia-build.json']);
    for (const file of manifest.files) {
      assert.equal(typeof file.path, 'string'); assert.ok(!file.path.includes('\\'));
      assert.ok(!file.path.split('/').some(part => !part || part === '.' || part === '..'));
      assert.ok(!seen.has(file.path)); seen.add(file.path); expected.add(file.path);
      // 旧 0.2.0 产品的页面与专属模块不在产物里。
      assert.ok(!file.path.startsWith('apps/web/'), '产物仍含旧产品页面：' + file.path);
      const destination = resolve(output, file.path), rel = relative(output, await realpath(destination));
      assert.ok(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
      const bytes = await readFile(destination); assert.equal(bytes.length, file.bytes, file.path); assert.equal(hash(bytes), file.sha256, file.path);
      if (file.path !== 'package.json') {
        const source = file.path === 'index.html' || file.path === 'preview/index.html' ? 'apps/preview/index.html' : file.path;
        assert.equal(hash(await readFile(join(projectRoot, source))), file.sha256, source);
      }
    }
    const actual = [];
    async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path); else { assert.ok(entry.isFile(), path); actual.push(relative(output, path).replaceAll('\\', '/')); } } }
    await walk(output); assert.deepEqual(actual.sort(), [...expected].sort());
  });
  service = await startServer({ root: output, port: 0 });
  await check('构建的全部 Web 文件经 HTTP 响应逐字一致，根入口是归山记，旧产品路径已下线', async () => {
    let responses = 0;
    for (const file of manifest.files) {
      if (file.path === 'package.json') continue;
      const response = await fetch(service.url + file.path); assert.equal(response.status, 200, file.path);
      assert.equal(hash(Buffer.from(await response.arrayBuffer())), file.sha256, file.path); responses++;
    }
    const root = await fetch(service.url); assert.equal(root.status, 200);
    assert.equal(hash(Buffer.from(await root.arrayBuffer())), manifest.files.find(file => file.path === 'index.html').sha256);
    const legacy = await fetch(service.url + 'preview/'); assert.equal(legacy.status, 200);
    assert.equal(hash(Buffer.from(await legacy.arrayBuffer())), manifest.files.find(file => file.path === 'preview/index.html').sha256);
    for (const path of ['package.json', '.git/config', '.env.local', '../AGENTS.md', 'apps/web/index.html']) assert.equal((await fetch(service.url + path)).status, 404, path);
    report.http = { publicFileResponses: responses, root: true, previewAlias: true, privatePaths: 5 };
  });
  browser = await launchBrowser(); report.browser = browser.version;
  page = await browser.page(); await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await check('真实构建在浏览器完成首页、出生、自动存档与刷新恢复', async () => {
    await page.navigate(service.url);
    await page.waitFor('!!window.adventurePreview && !!document.querySelector(".home h1")');
    assert.equal(await page.eval('document.title'), '归山记 · 修仙人生');
    assert.ok(!(await page.eval('document.body.innerText')).includes('试玩'), '首页仍出现开发期文案');
    await page.click('[data-action=new]');
    await page.waitFor('adventurePreview.status().screen==="life"', 30000);
    await page.waitFor('!!localStorage.getItem(' + JSON.stringify(ADVENTURE_KEY) + ')', 30000);
    const doc = await storedDoc();
    assert.ok(doc && Array.isArray(doc.lives) && doc.lives.length === 1, '出生后应当正好留下一段人生');
    const born = doc.lives.find(life => life.id === doc.activeId);
    assert.ok(born, '存档没有指向当前人生'); validateRun(born);
    await page.navigate(service.url);
    await page.waitFor('!!document.querySelector("[data-action=continue]")');
    await page.click('[data-action=continue]');
    await page.waitFor('adventurePreview.status().screen==="life"');
    const restored = await page.eval('adventurePreview.snapshot()');
    assert.equal(restored.id, born.id); assert.equal(restored.seed, born.seed);
    assert.deepEqual(page.errors, []);
    assert.deepEqual(page.responses.filter(response => response.status >= 400), []);
    assert.deepEqual(page.requests.filter(url => !url.startsWith(service.url) && !url.startsWith('data:') && !url.startsWith('blob:')), []);
    report.life = { id: born.id, seed: born.seed, month: born.month, decisions: born.decisions.length };
  });
} catch (error) { report.error = error.stack || error.message; console.error(report.error); process.exitCode = 1; }
finally {
  if (browser) await browser.close(); if (service) await service.close();
  await mkdir(join(projectRoot, 'artifacts'), { recursive: true });
  report.finishedAt = new Date().toISOString(); report.passed = !report.error && report.results.every(result => result.passed);
  await writeFile(join(projectRoot, 'artifacts/static-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('STATIC ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.filter(result => result.passed).length + '/' + report.results.length);
}
