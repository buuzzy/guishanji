import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { startServer, projectRoot } from './serve.mjs';
import { launchBrowser, delay } from './lib/browser.mjs';
import { STORAGE_KEY, SaveStore } from '../packages/storage/store.js';
import { validateState } from '../packages/core/validate.js';
import { beginLife, newLife } from '../apps/web/game-api.js';
import { toAge, policyChoice } from '../tests/scenarios.mjs';

const artifacts = join(projectRoot, 'artifacts'), shots = join(artifacts, 'screenshots');
const imports = join(projectRoot, '.local', 'browser-imports');
await Promise.all([mkdir(shots, { recursive: true }), mkdir(imports, { recursive: true })]);
const report = { startedAt: new Date().toISOString(), platform: process.platform, node: process.version, results: [], screenshots: [], testedScope: 'isolated desktop Chromium + emulated mobile Web; not physical device/Safari/Firefox' };
const service = await startServer({ port: 0 }); let errorService, browser, page, errorPage;
async function check(name, operation) {
  const started = Date.now();
  try { await operation(); report.results.push({ name, passed: true, durationMs: Date.now() - started }); console.log('BROWSER PASS · ' + name); }
  catch (error) { report.results.push({ name, passed: false, error: error.stack || error.message, durationMs: Date.now() - started }); throw error; }
}
const raw = page => page.eval('localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')');
const life = page => page.eval('(() => { const doc = JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ') || "null"); return doc?.lives.find(state => state.id === doc.activeId) || null; })()');
const saved = page => page.waitFor('document.querySelector("#save-status").textContent.includes("已在本地留档")');
async function changed(page, revision) { await page.waitFor('(() => { const doc = JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')); return doc.lives.find(state => state.id === doc.activeId).revision > ' + revision + '; })()'); await saved(page); }
async function respond(page, policy = 'cultivate') { const before = await life(page); await page.click('[data-action="choose"][data-choice="' + policyChoice(before, policy) + '"]'); await changed(page, before.revision); }
async function nextDecision(page) { const before = await life(page); await page.click('[data-action="step-choice"]'); await changed(page, before.revision); }
async function screenshot(name, target = page) { await target.eval('window.scrollTo({top:0,behavior:"instant"})'); const path = join(shots, name + '.png'); await target.screenshot(path); const data = await readFile(path); report.screenshots.push({ path: 'artifacts/screenshots/' + name + '.png', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') }); }
async function importFile(page, path) {
  const previous = await raw(page);
  const { root } = await page.send('DOM.getDocument'); const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#import-file' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [path] });
  // File.text() resolves asynchronously; the previous save indicator can still
  // say "saved" until the import actually starts.
  await page.waitFor('localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ') !== ' + JSON.stringify(previous) + ' || !document.querySelector("#save-warning").hidden || document.querySelector("#modal-title").textContent.includes("两份进度")');
}
const exportFile = state => JSON.stringify({ product: 'shanhai-life', exportVersion: 1, type: 'life', state }, null, 2);

try {
  await check('Web 资源可读取，私有配置与 Git 路径不可读取', async () => {
    for (const path of ['/', '/apps/web/style.css', '/apps/web/app.js', '/packages/core/engine.js', '/content/world.js']) { const response = await fetch(service.url + path.slice(1)); assert.equal(response.status, 200, path); }
    for (const path of ['/.git/config', '/.env.local', '/AGENTS.md', '/package.json', '/server/data/local.json', '/packages/%2e%2e/%2e%2e/.git/config']) { const response = await fetch(service.url + path.slice(1)); assert.equal(response.status, 404, path); }
    assert.equal((await fetch(service.url, { method: 'POST' })).status, 405);
  });
  browser = await launchBrowser(); report.browser = browser.version; report.profile = browser.profile;
  const downloads = join(browser.profile, 'downloads'); await mkdir(downloads);
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  page = await browser.page(); await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await check('桌面首页与原创像素场景真实渲染', async () => {
    await page.navigate(service.url); await page.waitFor('!!document.querySelector(".welcome h1")');
    assert.equal(await page.eval('document.querySelector(".welcome h1").textContent'), '山海一生');
    assert.equal(await raw(page), null);
    assert.ok(await page.eval('(() => { const c = document.querySelector("canvas"); const pixels = c.getContext("2d").getImageData(0,0,c.width,c.height).data; return new Set(Array.from(pixels)).size > 30; })()'));
    await screenshot('01-welcome-desktop');
  });
  await check('出生重抽、改名与入世在普通入口完成', async () => {
    await page.click('[data-action="new-life"]'); await page.waitFor('!!document.querySelector("#birth-name")');
    for (let i = 0; i < 25 && await page.eval('document.querySelector(".birth-info").textContent.includes("未见灵根")'); i++) await page.click('[data-action="reroll"]');
    assert.ok(!await page.eval('document.querySelector(".birth-info").textContent.includes("未见灵根")'));
    await page.click('#birth-name'); await page.eval('document.querySelector("#birth-name").select()'); await page.send('Input.insertText', { text: '沈知微' });
    await screenshot('02-birth-desktop');
    await page.click('[data-action="begin-life"]'); await saved(page);
    const state = await life(page); validateState(state); assert.equal(state.player.name, '沈知微'); assert.equal(state.phase, 'life'); assert.equal(state.month, 0);
  });
  await check('抉择自动进入人生，等待回应时不能快转', async () => {
    await nextDecision(page); const state = await life(page); assert.equal(state.month, 72); assert.equal(state.pending.event, 'primer');
    assert.ok(await page.eval('document.querySelector("[data-action=step-year]").disabled && document.querySelector("[data-action=step-choice]").disabled'));
    const before = await raw(page); await delay(1100); assert.equal(await raw(page), before);
    await screenshot('03-choice-desktop');
  });
  await check('刷新完整恢复人物、随机流与待选抉择', async () => {
    const before = await raw(page); await page.navigate(service.url); await page.waitFor('!!document.querySelector("[data-action=continue]")'); await page.click('[data-action="continue"]');
    assert.equal(await raw(page), before); assert.ok(await page.eval('!!document.querySelector("#decision-title")'));
    const state = await life(page); await page.click('[data-action="choose"][data-choice="read"]'); await changed(page, state.revision); assert.ok((await life(page)).player.insight > state.player.insight);
  });
  await check('十二岁问道接入同一人物、地域、功法和修为', async () => {
    await nextDecision(page); const before = await life(page); assert.equal(before.pending.event, 'path');
    await page.click('[data-action="choose"][data-choice="songyin"]'); await changed(page, before.revision);
    const state = await life(page); assert.equal(state.id, before.id); assert.equal(state.player.realm, 1); assert.equal(state.player.faction, 'songyin'); assert.equal(state.player.location, 'landu'); assert.equal(state.player.focus, 'cultivate');
  });
  await check('地图、亲友与人物道路只读，不改变人生或随机数', async () => {
    const before = await raw(page);
    await page.click('[data-action="world"]'); assert.equal(await page.eval('document.querySelectorAll(".region-row").length'), 5); await page.click('[data-action="close-modal"]');
    await page.click('[data-action="people"]'); assert.ok(await page.eval('document.querySelectorAll(".person-row").length > 2'));
    await page.click('[data-action="person"]'); assert.ok(await page.eval('document.querySelector("#modal-body").textContent.includes("对方自己的道路")')); await page.click('[data-action="close-modal"]');
    await delay(250); assert.equal(await raw(page), before);
  });
  await check('日色、夜色与减少动画可切换，不影响人生', async () => {
    const before = await raw(page); await page.click('[data-action="settings"]'); await page.click('[data-action="theme"][data-theme="dark"]');
    assert.equal(await page.eval('document.body.dataset.theme'), 'dark');
    const reducedBefore = await page.eval('document.querySelector("#reduced-motion").checked');
    await page.click('#reduced-motion'); await page.waitFor('document.body.dataset.reduced === ' + JSON.stringify(String(!reducedBefore)));
    if (reducedBefore) { await page.click('#reduced-motion'); await page.waitFor('document.body.dataset.reduced === "true"'); }
    await page.click('[data-action="close-modal"]'); await screenshot('04-life-night-desktop');
    assert.equal(await raw(page), before);
    await page.click('[data-action="settings"]'); await page.click('[data-action="theme"][data-theme="light"]'); await page.click('[data-action="close-modal"]');
  });
  await check('原创合成山音通过用户操作开启和关闭', async () => {
    await page.click('[data-action="settings"]'); await page.click('#ambient-audio');
    await page.waitFor('JSON.parse(localStorage.getItem("shanhai.preferences.v1")).audio === true');
    await page.click('#ambient-audio'); assert.equal(await page.eval('JSON.parse(localStorage.getItem("shanhai.preferences.v1")).audio'), false);
    await page.click('[data-action="close-modal"]');
  });
  await check('自动流转、速度与暂停不跳过人物月份', async () => {
    // A world decision can follow the apprenticeship at the same age.
    // Autoplay remains unavailable until every current decision is answered.
    for (let count = 0; (await life(page)).pending; count++) {
      assert.ok(count < 20); await respond(page);
    }
    await page.eval('const speedSelect = document.querySelector("#speed"); speedSelect.value="8"; speedSelect.dispatchEvent(new Event("change",{bubbles:true}));');
    const before = await life(page); await page.click('[data-action="play"]');
    await page.waitFor('(() => { const doc=JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')); return doc.lives.find(state=>state.id===doc.activeId).month > ' + before.month + '; })()');
    if (await page.eval('!document.querySelector("[data-action=play]").disabled && document.querySelector("[data-action=play]").getAttribute("aria-pressed") === "true"')) await page.click('[data-action="play"]');
    await saved(page); const paused = await raw(page); await delay(1050); assert.equal(await raw(page), paused);
  });
  await check('成年抉择与坊市物品沿原人生生效', async () => {
    let state = await life(page), iterations = 0;
    while (state.month < 216 || state.pending) { if (++iterations > 30) throw new Error('成年阶段未到达'); state.pending ? await respond(page) : await nextDecision(page); state = await life(page); }
    await page.click('[data-action="inventory"]'); const before = await life(page); assert.ok(before.player.stones >= 12);
    await page.click('[data-action="buy"][data-item="charm"]'); await changed(page, before.revision);
    const after = await life(page); assert.equal(after.player.stones, before.player.stones - 12); assert.equal(after.player.inventory.charm, before.player.inventory.charm + 1);
    await page.click('[data-action="close-modal"]');
  });
  await check('洞府外观写入人物，闭关中的要事中断真实年月', async () => {
    await page.click('[data-action="home"]'); const before = await life(page);
    await page.click('[data-action="home-style"][data-style="bamboo"]'); await changed(page, before.revision); assert.equal((await life(page)).player.homeStyle, 'bamboo');
    const atStart = await life(page); await page.click('[data-action="retreat"][data-years="10"]'); await changed(page, atStart.revision);
    const retreat = await life(page); await page.click('[data-action="retreat-until"]'); await changed(page, retreat.revision);
    const interrupted = await life(page); assert.ok(interrupted.month > atStart.month); assert.ok(interrupted.month < atStart.month + 120); assert.ok(interrupted.pending); assert.ok(interrupted.player.retreat);
    validateState(interrupted); await screenshot('05-retreat-choice-desktop');
    let state = interrupted, replies = 0;
    while (state.player.retreat) {
      if (++replies > 40) throw new Error('闭关未在约定月份结束');
      if (state.pending) await respond(page);
      else { const prior = state.revision; await page.click('[data-action="retreat-until"]'); await changed(page, prior); }
      state = await life(page);
    }
    assert.ok(state.month <= atStart.month + 120); assert.ok(state.random.world.draws > atStart.random.world.draws); assert.notDeepEqual(state.world.regions, atStart.world.regions);
  });

  async function downloaded(extension, previous) {
    for (let i = 0; i < 100; i++) {
      const file = (await readdir(downloads)).find(name => !previous.has(name) && name.endsWith('.' + extension));
      if (file && (await stat(join(downloads, file))).size > 0) return join(downloads, file);
      await delay(70);
    }
    throw new Error('文件没有实际下载：' + extension);
  }
  const exported = {};
  await check('PNG、HTML、CSV 与 JSON 生成真实文件且与当前人生一致', async () => {
    const state = await life(page); await page.click('[data-action="share"]');
    for (const format of ['png', 'html', 'csv', 'json']) {
      const previous = new Set(await readdir(downloads)); await page.click('[data-action="export"][data-format="' + format + '"]'); exported[format] = await downloaded(format, previous);
    }
    const png = await readFile(exported.png); assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]); assert.equal(png.readUInt32BE(16), 960); assert.equal(png.readUInt32BE(20), 1160);
    const html = await readFile(exported.html, 'utf8'); assert.ok(html.includes(state.player.name)); assert.ok(!html.includes('<script'));
    const csv = await readFile(exported.csv, 'utf8'); assert.equal(csv.trim().split('\r\n').length, state.years.length + 1);
    const json = JSON.parse(await readFile(exported.json, 'utf8')); assert.deepEqual(json.state, state); validateState(json.state);
    report.exports = Object.fromEntries(await Promise.all(Object.entries(exported).map(async ([format, path]) => [format, { path, bytes: (await stat(path)).size }])));
    await page.click('[data-action="close-modal"]');
  });
  await check('导出的传记可离线阅读并实际打印为 PDF', async () => {
    const biography = await browser.page(); await biography.navigate(pathToFileURL(exported.html).href);
    await biography.waitFor('document.querySelector("img").complete && document.querySelector("img").naturalWidth === 960');
    assert.ok((await biography.eval('document.querySelector("h1").textContent')).includes('沈知微'));
    const { data } = await biography.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
    const pdf = Buffer.from(data, 'base64'); assert.ok(pdf.subarray(0, 8).toString().startsWith('%PDF-')); await writeFile(join(artifacts, 'biography-print.pdf'), pdf);
    assert.deepEqual(biography.errors, []); await biography.close();
  });
  await check('文件导入恢复另一段人生，原本的修士仍完整保留', async () => {
    const previous = await life(page), imported = toAge('browser-mortal-transfer', 40, 'family', { root: 'none', name: '苏长宁' });
    const path = join(imports, 'mortal-life.json'); await writeFile(path, exportFile(imported));
    await page.click('[data-action="settings"]'); await page.click('[data-action="vault"]'); await importFile(page, path);
    await page.waitFor('!!document.querySelector(".identity-top h2") && document.querySelector(".identity-top h2").textContent === "苏长宁"'); await saved(page);
    assert.deepEqual(await life(page), imported);
    const retained = await page.eval('JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')).lives');
    assert.deepEqual(retained.find(state => state.id === previous.id), previous); assert.equal(retained.length, 2);
  });
  await check('同一人生的不同进度经预览后可并存，文件副本保持人物与机缘', async () => {
    const existing = await life(page), incoming = toAge('browser-mortal-transfer', 48, 'family', { root: 'none', name: '苏长宁' });
    const path = join(imports, 'same-life-later.json'); await writeFile(path, exportFile(incoming)); const before = await raw(page);
    await page.click('[data-action="settings"]'); await page.click('[data-action="vault"]'); await importFile(page, path);
    await page.waitFor('document.querySelector("#modal-title").textContent.includes("两份进度")'); assert.equal(await raw(page), before);
    await page.click('[data-action="import-fork"]'); await saved(page);
    const copied = await life(page); validateState(copied); assert.notEqual(copied.id, existing.id); assert.equal(copied.month, incoming.month); assert.deepEqual(copied.random, incoming.random);
    const retained = await page.eval('JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')).lives'); assert.equal(retained.length, 3); assert.deepEqual(retained.find(item => item.id === existing.id), existing);
  });
  await check('凡人通过浏览器的真实抉择走到终章，前世录可回看完整经历', async () => {
    let state = await life(page), iterations = 0;
    while (state.phase === 'life') { if (++iterations > 150) throw new Error('浏览器人生没有结束'); state.pending ? await respond(page, 'family') : await nextDecision(page); state = await life(page); }
    assert.equal(state.ending.type, 'family'); assert.equal(state.player.realm, 0); validateState(state);
    assert.equal(await page.eval('document.querySelector("#ending-title").textContent'), state.ending.title);
    assert.equal(await page.eval('document.querySelector("#life-count").textContent'), '1'); await screenshot('06-ending-desktop');
    const before = await raw(page); await page.click('[data-action="history"]'); assert.equal(await page.eval('document.querySelectorAll(".archive-card").length'), 3);
    await page.click('[data-action="archive"][data-life="' + state.id + '"]'); await page.click('[data-action="archive-journal"]');
    assert.ok(await page.eval('document.querySelectorAll(".timeline li").length > 30')); assert.equal(await raw(page), before); await page.click('[data-action="close-modal"]');
    report.completedBrowserLife = { seed: state.seed, age: state.ending.age, ending: state.ending.type, decisions: state.choices.length };
  });
  await check('另启一世会保留已结束和未结束的人生', async () => {
    const ended = await life(page); await page.click('[data-action="new-life"]'); await page.click('[data-action="begin-life"]'); await saved(page);
    const lives = await page.eval('JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')).lives'); assert.equal(lives.length, 4); assert.deepEqual(lives.find(state => state.id === ended.id), ended);
  });
  await check('真实第二个页面触发存档冲突，读回最新档案完成对齐', async () => {
    const second = await browser.page(); await second.navigate(service.url); await second.waitFor('!!document.querySelector("[data-action=continue]")'); await second.click('[data-action="continue"]');
    const before = await life(second); await second.click('[data-action="step-year"]'); await changed(second, before.revision);
    await page.waitFor('!document.querySelector("#save-warning").hidden && document.querySelector("#save-warning").textContent.includes("另一个页面")');
    const updated = await raw(second); await page.click('[data-action="step-year"]');
    // The storage event already warns about the other tab. Wait for this stale
    // write to finish before asking the UI to reload the current archive.
    await page.waitFor('document.querySelector("#save-warning").textContent.includes("已暂停写入") && document.querySelector("#save-status").textContent.includes("留档需处理")');
    assert.equal(await raw(second), updated);
    await page.click('[data-action="settings"]'); await page.click('[data-action="vault"]'); await page.click('[data-action="reload-save"]'); await saved(page);
    assert.deepEqual(await life(page), await life(second)); assert.equal(await raw(page), updated); assert.deepEqual(second.errors, []); await second.close();
  });
  await check('普通入口生成的人生在浏览器中实际走完出生至终章', async () => {
    let state = await life(page), steps = 0;
    while (state.phase === 'life') { if (++steps > 160) throw new Error('普通入口的人生没有结束'); state.pending ? await respond(page, 'family') : await nextDecision(page); state = await life(page); }
    assert.equal(state.player.realm, 0); assert.equal(state.ending.type, 'family'); validateState(state);
    report.completeNaturalBrowserLife = { seed: state.seed, id: state.id, age: state.ending.age, decisions: state.choices.length, fromOrdinaryBirth: true, externalStateInjection: false };
  });

  errorService = await startServer({ port: 0 }); errorPage = await browser.page(); await errorPage.navigate(errorService.url); await errorPage.waitFor('!!document.querySelector(".welcome")');
  const backupLife = toAge('browser-backup', 18, 'cultivate', { root: 'dual', name: '许见山' });
  const memory = new Map(), backupStore = new SaveStore({ getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }); backupStore.load(); backupStore.save(backupLife);
  const broken = '{damaged-browser-archive';
  await check('损坏存档提示恢复，有效备份采用前保留原始文字', async () => {
    await errorPage.eval('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ',' + JSON.stringify(broken) + ');localStorage.setItem(' + JSON.stringify(STORAGE_KEY + '.backup') + ',' + JSON.stringify(backupStore.raw()) + ')');
    await errorPage.navigate(errorService.url); await errorPage.waitFor('!document.querySelector("#save-warning").hidden'); assert.equal(await raw(errorPage), broken);
    await errorPage.click('[data-action="settings"]'); await errorPage.click('[data-action="vault"]'); await errorPage.click('[data-action="recover-backup"]'); await saved(errorPage);
    assert.deepEqual(await life(errorPage), backupLife);
    assert.ok(await errorPage.eval('Object.keys(localStorage).some(key=>key.startsWith(' + JSON.stringify(STORAGE_KEY + '.preserved.') + ') && localStorage.getItem(key)===' + JSON.stringify(broken) + ')'));
  });
  await check('不支持的导入版本明确拒绝，原档没有覆盖', async () => {
    const invalid = newLife({ seed: 'future-import' }); invalid.format = 99;
    const path = join(imports, 'unsupported-life.json'); await writeFile(path, exportFile(invalid)); const before = await raw(errorPage);
    await errorPage.click('[data-action="settings"]'); await errorPage.click('[data-action="vault"]'); await importFile(errorPage, path);
    await errorPage.waitFor('!document.querySelector("#save-warning").hidden && document.querySelector("#save-warning").textContent.includes("版本")'); assert.equal(await raw(errorPage), before);
    await errorPage.click('[data-action="reload-save"]'); await saved(errorPage);
  });
  await check('浏览器配额故障注入保留已有档案，仍可导出本页进度', async () => {
    const before = await raw(errorPage);
    await errorPage.eval('globalThis.originalArchiveSetter=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){if(key===' + JSON.stringify(STORAGE_KEY) + ' || key===' + JSON.stringify(STORAGE_KEY + '.backup') + ')throw new DOMException("quota-test","QuotaExceededError");return originalArchiveSetter.call(this,key,value);}');
    await errorPage.click('[data-action="step-year"]'); await errorPage.waitFor('!document.querySelector("#save-warning").hidden && document.querySelector("#save-warning").textContent.includes("空间不足")'); assert.equal(await raw(errorPage), before);
    await errorPage.click('[data-action="settings"]'); await errorPage.click('[data-action="vault"]');
    const previous = new Set(await readdir(downloads)); await errorPage.click('[data-action="export"][data-format="json"]'); const file = await downloaded('json', previous);
    assert.ok(JSON.parse(await readFile(file, 'utf8')).state.month > backupLife.month);
    await errorPage.eval('Storage.prototype.setItem=globalThis.originalArchiveSetter;delete globalThis.originalArchiveSetter;'); await errorPage.click('[data-action="reload-save"]'); await saved(errorPage);
  });
  await check('手机 Web 的触控、抉择与主要详情没有横向溢出', async () => {
    await errorPage.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await errorPage.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const mobile = toAge('mobile-web-life', 11, 'family', { root: 'none', name: '温听澜' }); const path = join(imports, 'mobile-life.json'); await writeFile(path, exportFile(mobile));
    await errorPage.click('[data-action="settings"]', true); await errorPage.click('[data-action="vault"]', true); await importFile(errorPage, path); await saved(errorPage);
    await errorPage.click('[data-action="step-choice"]', true); await changed(errorPage, mobile.revision);
    assert.equal((await life(errorPage)).pending.event, 'path');
    assert.ok(await errorPage.eval('document.documentElement.scrollWidth <= innerWidth + 1'));
    await screenshot('07-choice-mobile', errorPage);
    for (const action of ['world', 'people', 'inventory', 'home', 'settings']) {
      await errorPage.click('[data-action="' + action + '"]', true);
      assert.ok(await errorPage.eval('document.documentElement.scrollWidth <= innerWidth + 1'), action);
      assert.ok(await errorPage.eval('document.querySelector("#modal").getBoundingClientRect().width <= innerWidth'), action);
      await errorPage.click('[data-action="close-modal"]', true);
    }
    await errorPage.click('[data-action="choose"][data-choice="home"]', true); await saved(errorPage); assert.equal((await life(errorPage)).player.role, 'scholar');
    for (const width of [360, 768, 1280]) { await errorPage.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 }); await delay(150); assert.ok(await errorPage.eval('document.documentElement.scrollWidth <= innerWidth + 1'), 'width=' + width); }
  });
  await check('键盘焦点、按钮名称与媒体能力可用', async () => {
    assert.deepEqual(await errorPage.eval('[...document.querySelectorAll("button")].filter(el=>!el.textContent.trim()&&!el.getAttribute("aria-label")).map(el=>el.outerHTML)'), []);
    await errorPage.click('[data-action="settings"]'); await errorPage.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await errorPage.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await errorPage.eval('document.querySelector("#modal").open'), false);
    report.capabilities = await errorPage.eval('({canvas:!!document.createElement("canvas").getContext("2d"),toBlob:typeof HTMLCanvasElement.prototype.toBlob==="function",captureStream:typeof HTMLCanvasElement.prototype.captureStream==="function",mediaRecorder:typeof MediaRecorder!=="undefined",webAudio:typeof AudioContext!=="undefined",webLocks:!!navigator.locks,videoImplemented:false})');
  });
  await check('应用页面无 JavaScript 错误、失败资源或外部网络依赖', async () => {
    assert.deepEqual(page.errors, []); assert.deepEqual(errorPage.errors, []);
    for (const [target, url] of [[page, service.url], [errorPage, errorService.url]]) {
      assert.deepEqual(target.responses.filter(response => response.status >= 400), []);
      assert.deepEqual(target.requests.filter(request => !request.startsWith(url) && !request.startsWith('data:') && !request.startsWith('blob:')), []);
    }
  });
} catch (error) {
  report.error = error.stack || error.message; console.error(report.error); process.exitCode = 1;
  const failedPage = errorPage || page;
  if (failedPage) {
    report.failureContext = { state: await life(failedPage), ui: await failedPage.eval('({modalOpen:document.querySelector("#modal").open,saveStatus:document.querySelector("#save-status").textContent,warning:document.querySelector("#save-warning").textContent,toast:document.querySelector("#toast").textContent,scrollY,visibility:document.visibilityState,focused:document.hasFocus()})') };
    await screenshot('failure-' + report.startedAt.replace(/[^0-9]/gu, ''), failedPage);
  }
} finally {
  if (page) report.consoleErrors = page.errors; if (errorPage) report.errorPageConsoleErrors = errorPage.errors;
  if (browser) await browser.close();
  await service.close(); if (errorService) await errorService.close();
  report.finishedAt = new Date().toISOString(); report.passed = !report.error && report.results.every(result => result.passed);
  await writeFile(join(artifacts, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(artifacts, 'browser-run-' + report.startedAt.replace(/[^0-9]/gu, '') + '.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('BROWSER ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.filter(result => result.passed).length + '/' + report.results.length);
}
