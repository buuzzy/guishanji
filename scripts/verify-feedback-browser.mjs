import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { startServer, projectRoot } from './serve.mjs';
import { launchBrowser } from './lib/browser.mjs';
import { STORAGE_KEY } from '../packages/storage/store.js';
import { validateState } from '../packages/core/validate.js';
import { incomePreview, travelPreview } from '../packages/core/engine.js';
import { toAge, policyChoice } from '../tests/scenarios.mjs';

const stamp = new Date().toISOString().replace(/[^0-9]/gu, '');
const artifacts = join(projectRoot, 'artifacts', 'feedback-' + stamp);
const imports = join(projectRoot, '.local', 'feedback-imports-' + stamp);
await Promise.all([mkdir(artifacts, { recursive: true }), mkdir(imports, { recursive: true })]);
const report = { startedAt: new Date().toISOString(), node: process.version, platform: process.platform, results: [], screenshots: [], scope: 'Real clicks on isolated Chromium; controlled authored saves + published 0.1.0 fixture. Mobile viewport emulation, not physical devices.' };
const service = await startServer({ port: 0 }); let browser, page;
const raw = () => page.eval('localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')');
const life = async () => { const doc = JSON.parse(await raw()); return doc?.lives.find(item => item.id === doc.activeId) || null; };
const saved = () => page.waitFor('document.querySelector("#save-status").textContent.includes("已在本地留档") && document.querySelector("#save-warning").hidden');
async function check(name, operation) {
  const start = Date.now();
  try { await operation(); report.results.push({ name, passed: true, durationMs: Date.now() - start }); console.log('FEEDBACK BROWSER PASS · ' + name); }
  catch (error) { report.results.push({ name, passed: false, durationMs: Date.now() - start, error: error.stack }); throw error; }
}
async function change(selector, touch = false) {
  const before = await life(); await page.click(selector, touch);
  await page.waitFor('(() => { const doc=JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')); return doc.lives.find(item=>item.id===doc.activeId).revision > ' + before.revision + '; })()');
  await saved(); return validateState(await life());
}
async function respond(policy = 'quiet') { return change('[data-action="choose"][data-choice="' + policyChoice(await life(), policy) + '"]'); }
async function install(state, name) {
  validateState(state);
  const path = join(imports, name + '.json'); await writeFile(path, JSON.stringify({ product: 'shanhai-life', exportVersion: 1, type: 'life', state }) + '\n');
  await page.click('[data-action="settings"]'); await page.click('[data-action="vault"]');
  const { root } = await page.send('DOM.getDocument'); const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#import-file' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [path] });
  await page.waitFor('(() => { const doc=JSON.parse(localStorage.getItem(' + JSON.stringify(STORAGE_KEY) + ')); return doc?.activeId === ' + JSON.stringify(state.id) + ' && !document.querySelector("#modal").open; })()');
  await saved(); assert.deepEqual(await life(), state);
}
async function screenshot(name, selector = null) {
  if (selector) await page.eval('document.querySelector(' + JSON.stringify(selector) + ').scrollIntoView({block:"start",behavior:"instant"})');
  else await page.eval('window.scrollTo({top:0,behavior:"instant"})');
  const path = join(artifacts, name + '.png'); await page.screenshot(path); const bytes = await readFile(path);
  report.screenshots.push({ path: relative(projectRoot, path).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function finishTravel() {
  for (let count = 0; (await life()).player.travel; count++) {
    assert.ok(count < 30);
    if ((await life()).pending) await respond(); else await change('[data-action="step-arrival"]');
  }
}
function adult(seed, root = 'dual') {
  const state = toAge(seed, 18, 'family', { root, origin: 'farmer' });
  state.player.money = 500; state.player.stones = 60; state.player.herbs = 40; state.player.health = 45; state.player.craft = 30;
  return validateState(state);
}

try {
  browser = await launchBrowser(); report.browser = browser.version; report.profile = browser.profile;
  page = await browser.page();
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await page.navigate(service.url); await page.waitFor('!!document.querySelector(".welcome")');
  await check('旧人生按新规则读取，继续操作后仍保留升级前原文与完整往事', async () => {
    const sourceRaw = await readFile(join(projectRoot, 'tests/fixtures/v0.1.0-archive.json'), 'utf8'), source = JSON.parse(sourceRaw);
    const previous = source.lives.find(item => item.id === source.activeId);
    await page.eval('localStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ',' + JSON.stringify(sourceRaw) + ')');
    await page.navigate(service.url); await page.waitFor('!!document.querySelector("[data-action=continue]")'); await page.click('[data-action="continue"]');
    assert.equal(await raw(), sourceRaw);
    assert.ok(await page.eval('document.querySelector(".guide-card").textContent.includes("学会调息")'));
    await change('[data-action="learn-breath"]');
    const current = await life(); assert.equal(current.version, '0.2.0'); assert.equal(current.month, previous.month);
    for (const key of ['random', 'people', 'years', 'choices', 'ledger']) assert.deepEqual(current[key], previous[key]);
    assert.deepEqual(current.log.slice(0, previous.log.length), previous.log);
    assert.equal(await page.eval('localStorage.getItem(' + JSON.stringify(STORAGE_KEY + '.backup') + ')'), sourceRaw);
    await change('[data-action="focus"][data-focus="family"]');
    assert.ok(await page.eval('Object.keys(localStorage).some(key=>key.startsWith(' + JSON.stringify(STORAGE_KEY + '.preserved.') + ') && localStorage.getItem(key)===' + JSON.stringify(sourceRaw) + ')'));
    assert.equal(JSON.parse(await raw()).lives.length, 3);
    report.legacyMigration = { sourceVersion: '0.1.0', preservedOriginal: true, lives: 3, unchangedMonthAndRNG: true };
  });
  await check('悟性 100、未见灵根者能在主界面通窍、按月练习并进入炼气', async () => {
    const source = adult('browser-entry-no-root', 'none'); source.player.insight = 100;
    await install(source, 'entry');
    let state = await change('[data-action="attune"]');
    assert.equal(state.player.stones, source.player.stones - 6); assert.equal(state.player.herbs, source.player.herbs - 8);
    assert.equal(state.player.root, 'none'); assert.equal(state.player.training.awakened, true);
    for (let count = 0; state.player.training.progress < 12; count++) {
      assert.ok(count < 24); state = state.pending ? await respond() : await change('[data-action="practice-month"]');
    }
    const before = state;
    state = state.pending?.event === 'entry' ? await change('[data-action="choose"][data-choice="enter"]') : await change('[data-action="initiate"]');
    assert.equal(state.player.realm, 1); assert.equal(state.player.stones, before.player.stones - 12); assert.equal(state.player.herbs, before.player.herbs - 3);
    assert.ok(state.month > source.month && state.month < source.month + 24);
    assert.ok(await page.eval('document.querySelector(".guide-card").textContent.includes("38 灵石")'));
    await screenshot('01-entry-guide', '.guide-card');
    report.entry = { startingInsight: 100, root: state.player.root, awakened: true, ageInMonths: state.month, realm: '炼气', realUIClicks: true };
  });
  await check('兑换、炼丹与服丹实际扣除资源、经过月份并恢复体魄', async () => {
    await page.click('[data-action="inventory"]'); const before = await life();
    const exchanged = await change('[data-action="exchange-stones"]');
    assert.equal(exchanged.player.money, before.player.money - 100); assert.equal(exchanged.player.stones, before.player.stones + 5);
    const brewed = await change('[data-action="brew"]');
    assert.equal(brewed.month, exchanged.month + 1); assert.equal(brewed.player.inventory.pill, exchanged.player.inventory.pill + 1);
    assert.equal(brewed.player.stones, exchanged.player.stones - 1); assert.equal(brewed.player.herbs, exchanged.player.herbs - 3);
    const healed = await change('[data-action="use-pill"]');
    assert.equal(healed.player.health, Math.min(100, brewed.player.health + 30)); assert.equal(healed.player.inventory.pill, brewed.player.inventory.pill - 1);
    assert.ok(healed.ledger.some(item => item.label === '炼制养元丹' && item.stones === -1 && item.herbs === -3));
    await screenshot('02-resource-loop', '#modal-body'); await page.click('[data-action="close-modal"]');
  });
  await check('十六岁自然询问迁居，说明去处、用途、路资与月份，真实抵达后可做当地活动', async () => {
    const source = toAge('browser-natural-journey', 15, 'family', { root: 'none', origin: 'farmer' }); source.player.money = 500; source.player.stones = 40;
    await install(source, 'journey');
    let state = await change('[data-action="step-year"]');
    assert.equal(state.pending.event, 'journey'); assert.equal(state.pending.options.length, 5);
    assert.ok(state.pending.options.find(option => option.id === 'zhaoshi').description.includes('器坊'));
    await screenshot('03-journey-choice', '#decision');
    const route = travelPreview(state, 'zhaoshi'), before = state;
    state = await change('[data-action="choose"][data-choice="zhaoshi"]');
    assert.equal(state.player.location, before.player.location); assert.equal(state.player.money, before.player.money - route.money); assert.equal(state.player.travel.to, 'zhaoshi');
    await page.click('[data-action="inventory"]');
    assert.ok(await page.eval('[...document.querySelectorAll("#modal [data-action=buy],#modal [data-action=sell],#modal [data-action=exchange-stones]")].every(button=>button.disabled)'));
    await page.click('[data-action="close-modal"]'); await finishTravel();
    const arrived = await life(); assert.equal(arrived.player.location, 'zhaoshi'); assert.equal(arrived.month, before.month + route.months);
    const worked = await change('[data-action="local-activity"]');
    assert.equal(worked.month, arrived.month + 1); assert.equal(worked.player.money, arrived.player.money - 20); assert.equal(worked.player.stones, arrived.player.stones + 8);
    assert.ok(await page.eval('document.querySelector(".location-card [data-action=local-activity]").disabled'));
    await page.click('[data-action="world"]');
    assert.equal(await page.eval('document.querySelectorAll(".region-row").length'), 5);
    assert.ok(await page.eval('document.querySelector("#modal-body").textContent.includes("繁荣 / 250") && document.querySelector("#modal-body").textContent.includes("风险 / 2.5")'));
    await screenshot('04-regional-activities', '#modal-body'); await page.click('[data-action="close-modal"]');
  });
  await check('改造洞府显示费用和余额，年表与账册有同一笔实际扣费', async () => {
    await install(adult('browser-home-cost'), 'home'); await page.click('[data-action="home"]');
    const before = await life(), after = await change('[data-action="home-style"][data-style="bamboo"]');
    assert.equal(after.player.stones, before.player.stones - 8); assert.equal(after.player.homeStyle, 'bamboo');
    assert.ok(after.log.some(item => item.kind === 'home' && item.text.includes('8 灵石') && item.text.includes('余额')));
    assert.ok(after.ledger.some(item => item.label.includes('竹舍') && item.stones === -8));
    await screenshot('05-home-cost', '#modal-body'); await page.click('[data-action="close-modal"]');
  });
  let funeralActor, deathMonth;
  await check('父母讣告在闭关中出现，显示具名身份、享年与返乡治丧安排', async () => {
    const source = toAge('browser-parent-funeral', 30, 'cultivate', { root: 'single', origin: 'farmer' });
    source.player.location = 'wenxue'; if (!source.player.visited.includes('wenxue')) source.player.visited.push('wenxue');
    source.player.money = 500; source.player.stones = 300; source.player.herbs = 80; source.player.progress = 0;
    funeralActor = source.people.find(item => item.relation === 'mother'); funeralActor.health = 0;
    await install(source, 'funeral'); await page.click('[data-action="home"]');
    await change('[data-action="retreat"][data-years="10"]'); const death = await change('[data-action="retreat-until"]');
    assert.equal(death.pending.event, 'bereavement'); assert.equal(death.pending.payload.actorId, funeralActor.id); assert.equal(death.player.retreat, null);
    assert.ok(death.pending.title.includes('母亲') && death.pending.title.includes('享年'));
    assert.ok(death.pending.text.includes('成服') && death.pending.text.includes('安葬'));
    deathMonth = death.month; await screenshot('06-parent-obituary', '#decision');
    const fees = death.pending.options.find(item => item.id === 'full').costs.money;
    const returning = await change('[data-action="choose"][data-choice="full"]');
    assert.equal(returning.player.money, death.player.money - fees); assert.equal(returning.player.travel.to, funeralActor.location);
    assert.equal(returning.player.mourning[0].stage, 'returning'); await finishTravel();
    const rites = await change('[data-action="step-month"]'); assert.equal(rites.player.mourning[0].stage, 'observance');
    assert.ok(rites.log.some(item => item.text.includes('素麻衣') && item.text.includes('入殓')));
    assert.equal(incomePreview(rites).mourningFactor, 0.7);
    await page.click('[data-action="home"]');
    assert.ok(await page.eval('[...document.querySelectorAll("#modal [data-action=retreat],#modal [data-action=home-style]")].every(button=>button.disabled)'));
    await screenshot('07-mourning-home', '#modal-body'); await page.click('[data-action="close-modal"]');
  });
  await check('守丧仍按月生活，周年追思和期满重新安排接入同一人生', async () => {
    let state = await life();
    for (let count = 0; state.pending?.event !== 'memorial'; count++) {
      assert.ok(count < 30); state = state.pending ? await respond() : await change('[data-action="step-year"]');
    }
    assert.equal(state.pending.payload.actorId, funeralActor.id); assert.equal(state.month, deathMonth + 12);
    state = await change('[data-action="choose"][data-choice="keep"]'); assert.ok(state.player.keepsakes.includes(funeralActor.name + '的旧物'));
    for (let count = 0; state.pending?.event !== 'mourningEnd'; count++) {
      assert.ok(count < 40); state = state.pending ? await respond() : await change('[data-action="step-year"]');
    }
    assert.equal(state.player.mourning[0].stage, 'complete');
    await screenshot('08-mourning-complete', '#decision');
    state = await change('[data-action="choose"][data-choice="work"]');
    await page.click('[data-action="home"]'); assert.ok(await page.eval('!document.querySelector("#modal [data-action=retreat]").disabled'));
    await page.click('[data-action="close-modal"]');
    report.mourning = { deathMonth, completedMonth: state.month, actorId: funeralActor.id, returnBurialAndAnniversary: true };
  });
  await check('各类灾乱与王朝更替有具体年表，当前影响有地点与持续期', async () => {
    const source = toAge('browser-visible-world', 36, 'quiet', { root: 'none', origin: 'farmer' });
    await install(source, 'world-events'); await page.click('[data-action="world"]');
    const text = await page.eval('document.querySelector("#modal-body").textContent');
    for (const word of ['粮食短缺', '河堤决口', '地动', '加征', '劳役', '王朝更替', '仙魔']) assert.ok(text.includes(word), word);
    assert.ok(source.world.history.filter(item => item.type && item.type !== 'recovery').length >= 11);
    await screenshot('09-world-history', '#modal-body'); await page.click('[data-action="close-modal"]');
  });
  await check('家中已无人时，主界面与年度叙述说明独自生活', async () => {
    const source = adult('browser-empty-home', 'none');
    for (const actor of source.people.filter(item => ['mother', 'father', 'guardian', 'partner', 'child'].includes(item.relation))) { actor.alive = false; actor.deathMonth = source.month; }
    await install(source, 'empty-home'); let state = await change('[data-action="step-year"]');
    assert.notEqual(state.pending?.event, 'homecoming');
    assert.ok(state.log.some(item => item.kind === 'year' && /独自|故人|家中已没有/u.test(item.text)));
    await screenshot('10-empty-home');
  });
  await check('手机宽度下四属性、修行指引和关键详情可见，触控学习与资源操作可用', async () => {
    for (const width of [360, 390, 768]) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 });
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: width < 768, maxTouchPoints: 5 });
      const source = adult('mobile-feedback-' + width); source.player.insight = 100;
      await install(source, 'mobile-' + width);
      assert.ok(await page.eval('document.documentElement.scrollWidth <= innerWidth + 1'));
      for (const label of ['体魄', '心境', '悟性', '技艺']) assert.ok(await page.eval('document.querySelector("#screen").textContent.includes(' + JSON.stringify(label) + ')'));
      await change('[data-action="learn-breath"]', width < 768);
      await screenshot('11-guide-' + width, '.guide-card');
      for (const action of ['world', 'inventory', 'home', 'people']) {
        await page.click('.tools-grid [data-action="' + action + '"]', width < 768);
        assert.ok(await page.eval('document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector("#modal").getBoundingClientRect().width <= innerWidth'));
        if (action === 'inventory') { await change('[data-action="exchange-stones"]', width < 768); await screenshot('12-inventory-' + width, '#modal-body'); }
        await page.click('[data-action="close-modal"]', width < 768);
      }
    }
  });
  await check('新增流程无脚本错误、失败资源或外部网络依赖', async () => {
    assert.deepEqual(page.errors, []); assert.deepEqual(page.responses.filter(item => item.status >= 400), []);
    assert.deepEqual(page.requests.filter(url => !url.startsWith(service.url) && !url.startsWith('data:') && !url.startsWith('blob:')), []);
  });
} catch (error) {
  report.error = error.stack; process.exitCode = 1; console.error(error.stack);
  if (page) { report.failureContext = { state: await life(), ui: await page.eval('({modal:document.querySelector("#modal").open,warning:document.querySelector("#save-warning").textContent,toast:document.querySelector("#toast").textContent})') }; await screenshot('failure'); }
} finally {
  if (page) report.consoleErrors = page.errors;
  if (browser) await browser.close(); await service.close();
  report.finishedAt = new Date().toISOString(); report.passed = !report.error && report.results.every(item => item.passed);
  await Promise.all([writeFile(join(artifacts, 'verification.json'), JSON.stringify(report, null, 2) + '\n'), writeFile(join(projectRoot, 'artifacts', 'feedback-browser-verification.json'), JSON.stringify(report, null, 2) + '\n')]);
  console.log('FEEDBACK BROWSER ' + (report.passed ? 'PASS' : 'FAIL') + ' · ' + report.results.filter(item => item.passed).length + '/' + report.results.length);
}
