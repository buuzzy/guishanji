import { newLife, beginLife, advance, advanceToDecision, choose, autoChoice, setFocus, act } from './game-api.js';
import { renameBirth, personById } from '../../packages/core/state.js';
import { SaveStore, STORAGE_KEY, MAX_FILE_BYTES } from '../../packages/storage/store.js';
import { renderScene, renderPortrait, renderMap, renderHome, renderCurve, renderShareCard } from '../../packages/render/canvas.js';
import { sharePNG, annualCSV, biographyHTML, escapeHTML } from '../../packages/media/exports.js';
import { AmbientMusic } from '../../packages/media/audio.js';
import { welcomeView, birthView, lifeView, endingView } from './views.js';
import { dialogView } from './dialogs.js';

const screen = document.querySelector('#screen'), modal = document.querySelector('#modal');
const PREFS_KEY = 'shanhai.preferences.v1';
let storage;
try { storage = localStorage; } catch { storage = { getItem() { throw new Error('Storage unavailable'); }, setItem() { throw new Error('Storage unavailable'); } }; }
const store = new SaveStore(storage), music = new AmbientMusic();
let state = null, draft = null, mode = 'welcome', autoplay = false, resumeAfterChoice = false;
let saving = false, dirty = false, saveError = null, toastTimer = null;
let pendingImport = null;
let modalInfo = null, modalResume = false, modalOpener = null, animation = 0, lastFrame = 0;
const preferences = { theme: 'light', reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, audio: false };
try {
  const saved = JSON.parse(storage.getItem(PREFS_KEY) || 'null');
  if (saved?.version === 1) {
    if (['light', 'dark'].includes(saved.theme)) preferences.theme = saved.theme;
    if ([1, 3, 8].includes(saved.speed)) preferences.speed = saved.speed;
    if (typeof saved.reduced === 'boolean') preferences.reduced = saved.reduced;
    // Audio still requires a gesture in this browsing session.
  }
} catch { /* A damaged preference does not alter life archives. */ }
try { state = store.load(); } catch (error) { saveError = error; }
const cover = newLife({ seed: '山海·封面', root: 'dual', region: 'landu', origin: 'ward' });
cover.month = 24 * 12; cover.player.realm = 1; cover.player.focus = 'explore';

function toast(message, duration = 3800) {
  const element = document.querySelector('#toast'); element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, duration);
}

function applyPreferences() {
  document.body.dataset.theme = preferences.theme; document.body.dataset.reduced = String(preferences.reduced);
  document.querySelector('meta[name="theme-color"]').content = preferences.theme === 'dark' ? '#1f302b' : '#f5f3e8';
  startAnimation();
}

function savePreferences() {
  try { storage.setItem(PREFS_KEY, JSON.stringify({ version: 1, ...preferences })); }
  catch { toast('偏好暂时无法写入浏览器；这一页会继续使用你的选择。'); }
  applyPreferences();
}

function currentScene() { return mode === 'birth' ? draft : state || cover; }
function dialogState() {
  if (modalInfo?.data.draft) return draft;
  if (modalInfo?.data.lifeId) return store.lives().find(item => item.id === modalInfo.data.lifeId) || null;
  return state;
}

function draw(root, target) {
  if (!target) return;
  for (const canvas of root.querySelectorAll('canvas[data-canvas]')) {
    const type = canvas.dataset.canvas;
    if (type === 'scene') renderScene(canvas, target, { dark: preferences.theme === 'dark', reduced: preferences.reduced, time: performance.now(), wide: canvas.dataset.wide === 'true' && innerWidth > 760 });
    else if (type === 'portrait') renderPortrait(canvas, target, canvas.dataset.person ? personById(target, canvas.dataset.person) : null);
    else if (type === 'map') renderMap(canvas, target, preferences.theme === 'dark');
    else if (type === 'home') renderHome(canvas, target);
    else if (type === 'curve') renderCurve(canvas, target, canvas.dataset.field || 'realm');
    else if (type === 'share') renderShareCard(canvas, target);
  }
}

function startAnimation() {
  if (animation) cancelAnimationFrame(animation); animation = 0;
  if (preferences.reduced || document.hidden) { if (screen.childElementCount) draw(screen, currentScene()); return; }
  const frame = time => {
    if (time - lastFrame >= 65) {
      for (const canvas of screen.querySelectorAll('canvas[data-canvas="scene"]')) renderScene(canvas, currentScene(), { dark: preferences.theme === 'dark', time, wide: canvas.dataset.wide === 'true' && innerWidth > 760 });
      if (modal.open && dialogState()) for (const canvas of modal.querySelectorAll('canvas[data-canvas="scene"]')) renderScene(canvas, dialogState(), { dark: preferences.theme === 'dark', time });
      lastFrame = time;
    }
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);
}

function updateSaveStatus() {
  document.querySelector('#share-nav').hidden = !(mode === 'birth' ? draft : state);
  document.querySelector('#life-count').textContent = store.lives().filter(item => item.phase === 'ended').length;
  const status = document.querySelector('#save-status');
  status.textContent = saving ? '正在留档…' : saveError ? '留档需处理 · 可先导出进度' : dirty ? '本页进度尚未留档' : mode === 'birth' ? '入世后自动留档' : state ? '此生已在本地留档' : '浏览器本地档案';
  const warning = document.querySelector('#save-warning'); warning.hidden = !saveError;
  if (saveError) warning.innerHTML = escapeHTML(saveError.message) + '<button type="button" class="text-button" data-action="vault">处理存档</button>';
}

function render({ focusDecision = false } = {}) {
  const focused = document.activeElement;
  const focus = focused && screen.contains(focused) ? { id: focused.id, action: focused.dataset.action, choice: focused.dataset.choice, focus: focused.dataset.focus } : null;
  screen.innerHTML = mode === 'birth' ? birthView(draft) : mode === 'life' && state ? lifeView(state, { autoplay, speed: preferences.speed }) : mode === 'ending' && state?.ending ? endingView(state) : welcomeView(state, state || cover);
  draw(screen, currentScene()); updateSaveStatus();
  if (focusDecision && document.querySelector('#decision-title')) {
    document.querySelector('#decision-title').focus({ preventScroll: true });
    document.querySelector('#decision').scrollIntoView({ block: 'nearest', behavior: preferences.reduced ? 'instant' : 'smooth' });
  } else if (focus?.id) document.getElementById(focus.id)?.focus({ preventScroll: true });
  else if (focus?.action) {
    const candidate = [...screen.querySelectorAll('button')].find(button => button.dataset.action === focus.action && button.dataset.choice === focus.choice && button.dataset.focus === focus.focus);
    candidate?.focus({ preventScroll: true });
  }
}

function refreshDialog() {
  if (!modalInfo) return;
  const data = { ...modalInfo.data, lives: store.lives(), document: store.document, preferences };
  if (modalInfo.type === 'vault') {
    try { data.backup = store.backup(); } catch (error) { data.backupError = error.code === 'missing' ? '' : error.message; }
    try { data.preserved = store.preserved(); } catch { data.preserved = []; }
  }
  const view = dialogView(modalInfo.type, dialogState(), data);
  document.querySelector('#modal-title').textContent = view.title; document.querySelector('#modal-kicker').textContent = view.kicker;
  document.querySelector('#modal-body').innerHTML = view.html; draw(modal, dialogState());
}

function openDialog(type, data = {}) {
  if (!modal.open) {
    const active = document.activeElement;
    modalOpener = active?.dataset.action ? { ...active.dataset } : null;
    modalResume = autoplay; autoplay = false; render();
  }
  modalInfo = { type, data }; refreshDialog();
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
}

function closeDialog(resume = true) {
  if (modalInfo?.type === 'import-conflict') pendingImport = null;
  const shouldResume = resume && modalResume; modalResume = false; modalInfo = null;
  if (modal.open) modal.close();
  if (shouldResume && state?.phase === 'life' && !state.pending && !saveError) autoplay = true;
  render();
  if (modalOpener) {
    [...document.querySelectorAll('button[data-action]')].find(button => !button.disabled && Object.entries(modalOpener).every(([key, value]) => button.dataset[key] === value))?.focus({ preventScroll: true });
    modalOpener = null;
  }
}

async function withLock(operation) {
  if (navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, operation);
  return operation();
}

async function persist() {
  if (!state) return;
  saving = true; updateSaveStatus();
  try {
    await withLock(() => store.save(state)); dirty = false; saveError = null;
  } catch (error) {
    saveError = error; autoplay = false; dirty = true;
  } finally { saving = false; updateSaveStatus(); }
}

async function commit(next, { announce = true } = {}) {
  if (next === state) return;
  const oldPending = state?.pending?.id, oldPhase = state?.phase;
  state = next; mode = next.phase === 'ended' ? 'ending' : next.phase;
  dirty = true;
  if (state.pending || state.phase === 'ended') autoplay = false;
  render(); await persist();
  render({ focusDecision: announce && state.pending?.id !== oldPending && !!state.pending });
  if (oldPhase !== 'ended' && state.phase === 'ended') {
    resumeAfterChoice = false; document.querySelector('#ending-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: preferences.reduced ? 'instant' : 'smooth' });
    if (!saveError) toast('此生已落笔，完整经历留在前世录。');
  }
}

function freshSeed() { return [...crypto.getRandomValues(new Uint32Array(3))].map(value => value.toString(36)).join('-'); }
function prepareNew() {
  closeDialog(false); autoplay = false; resumeAfterChoice = false;
  draft = newLife({ seed: freshSeed(), runId: freshSeed() }); mode = 'birth'; render(); window.scrollTo({ top: 0, behavior: 'instant' });
}

async function respond(choiceId) {
  const shouldResume = resumeAfterChoice;
  const next = choose(state, choiceId); await commit(next);
  if (!next.pending) {
    resumeAfterChoice = false;
    if (shouldResume && next.phase === 'life' && !saveError) { autoplay = true; render(); }
  }
}

async function progress(months) {
  autoplay = false; resumeAfterChoice = false;
  await commit(advance(state, months));
}

function download(blob, name) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 20000);
}

function fileName(state, extension) { return '山海一生-' + state.player.name.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '_') + '-' + Math.floor(state.month / 12) + '岁.' + extension; }

async function exportLife(format, id = '', birth = false) {
  const target = id ? store.lives().find(life => life.id === id) : birth ? draft : state;
  if (!target) throw new Error('还没有可以导出的这一生。');
  let blob, extension = format;
  if (format === 'png') blob = await sharePNG(target);
  else if (format === 'json') blob = new Blob([store.export(target)], { type: 'application/json;charset=utf-8' });
  else if (format === 'csv') blob = new Blob([annualCSV(target)], { type: 'text/csv;charset=utf-8' });
  else if (format === 'html') blob = new Blob([biographyHTML(target)], { type: 'text/html;charset=utf-8' });
  else throw new Error('暂不支持这个导出格式。');
  download(blob, fileName(target, extension)); toast('已经生成并下载这份此生记录。');
}

async function performStore(operation) {
  saving = true; updateSaveStatus();
  try {
    state = await withLock(operation); dirty = false; saveError = null; autoplay = false; resumeAfterChoice = false;
    if (state?.phase === 'birth') { draft = state; mode = 'birth'; }
    else mode = state?.phase === 'ended' ? 'ending' : state ? 'life' : 'welcome';
    closeDialog(false);
  } catch (error) { saveError = error; autoplay = false; toast(error.message, 6500); }
  finally { saving = false; render(); }
}

// The handlers below only translate browser intent into core commands.
const mutations = new Set(['begin-life', 'choose', 'choose-auto', 'focus', 'play', 'step-year', 'step-choice', 'heal', 'sell', 'buy', 'travel', 'retreat', 'retreat-until', 'leave-retreat', 'home-style', 'initiate', 'activate-life', 'recover-backup', 'reload-save', 'prepare-new']);
mutations.add('import-fork');

async function handleAction(action, element) {
  if (saving && mutations.has(action)) { toast('正在留档，请稍等片刻。'); return; }
  if (action === 'share') { openDialog('share', { draft: mode === 'birth' }); return; }
  if (['history', 'settings', 'help', 'about', 'vault', 'people', 'inventory', 'world', 'home', 'journal'].includes(action)) { openDialog(action); return; }
  if (action === 'close-modal') { closeDialog(); return; }
  if (action === 'welcome') { closeDialog(false); autoplay = false; resumeAfterChoice = false; mode = 'welcome'; render(); window.scrollTo({ top: 0, behavior: 'instant' }); return; }
  if (action === 'continue') {
    if (state?.phase === 'birth') { draft = state; mode = 'birth'; }
    else mode = state?.phase === 'ended' ? 'ending' : 'life';
    render(); return;
  }
  if (action === 'new-life') {
    if (state?.phase === 'life') openDialog('new-life');
    else { if (dirty) { await persist(); if (saveError) { openDialog('vault'); return; } } prepareNew(); }
    return;
  }
  if (action === 'prepare-new') {
    if (dirty) { await persist(); if (saveError) { openDialog('vault'); return; } }
    prepareNew(); return;
  }
  if (action === 'reroll') { draft = newLife({ seed: freshSeed(), runId: freshSeed() }); render(); return; }
  if (action === 'begin-life') {
    draft = renameBirth(draft, document.querySelector('#birth-name').value);
    await commit(beginLife(draft)); window.scrollTo({ top: 0, behavior: 'instant' }); return;
  }
  if (action === 'choose') { await respond(element.dataset.choice); return; }
  if (action === 'choose-auto') { await respond(autoChoice(state)); return; }
  if (action === 'focus') { await commit(setFocus(state, element.dataset.focus), { announce: false }); return; }
  if (action === 'play') { autoplay = !autoplay && state?.phase === 'life' && !state.pending && !saveError; resumeAfterChoice = false; render(); return; }
  if (action === 'step-year') { await progress(12); return; }
  if (action === 'step-choice') { autoplay = false; resumeAfterChoice = false; await commit(advanceToDecision(state)); return; }
  if (action === 'retreat-until') { if (!state.player.retreat) throw new Error('眼下没有闭关安排。'); closeDialog(false); await progress(state.player.retreat.until - state.month); return; }
  if (['heal', 'sell', 'buy', 'home-style', 'leave-retreat', 'initiate'].includes(action)) {
    const command = action === 'home-style' ? { type: 'home', style: element.dataset.style } : action === 'leave-retreat' ? { type: 'leaveRetreat' } : { type: action, item: element.dataset.item };
    await commit(act(state, command), { announce: false }); if (modal.open) refreshDialog(); return;
  }
  if (action === 'travel' || action === 'retreat') {
    const command = action === 'travel' ? { type: 'travel', to: element.dataset.to } : { type: 'retreat', years: Number(element.dataset.years) };
    const next = act(state, command); closeDialog(false); await commit(next); return;
  }
  if (action === 'person') { openDialog('person', { personId: element.dataset.person }); return; }
  if (action === 'archive') { openDialog('archive', { lifeId: element.dataset.life }); return; }
  if (action === 'archive-journal') { openDialog('archive-journal', { lifeId: element.dataset.life }); return; }
  if (action === 'activate-life') {
    if (dirty) { await persist(); if (saveError) { openDialog('vault'); return; } }
    await performStore(() => store.activate(element.dataset.life)); return;
  }
  if (action === 'journal-filter') { modalInfo.data.filter = element.dataset.filter; refreshDialog(); return; }
  if (action === 'journal-more') { modalInfo.data.limit = (modalInfo.data.limit || 80) + 80; refreshDialog(); return; }
  if (action === 'theme') { preferences.theme = element.dataset.theme; savePreferences(); render(); refreshDialog(); return; }
  if (action === 'export') { await exportLife(element.dataset.format, element.dataset.life, modalInfo?.data.draft); return; }
  if (action === 'export-archive') {
    download(new Blob([store.export(null, dirty ? state : null)], { type: 'application/json;charset=utf-8' }), '山海一生-全量档案.json'); toast('全量档案已下载。'); return;
  }
  if (action === 'export-raw') {
    const raw = store.raw(); if (raw === null) { toast('此浏览器还没有原档文字。'); return; }
    download(new Blob([raw], { type: 'application/json;charset=utf-8' }), '山海一生-原始档案.json'); toast('原始档案文字已另存。'); return;
  }
  if (action === 'export-backup') {
    const doc = store.backup();
    download(new Blob([JSON.stringify({ product: 'shanhai-life', exportVersion: 1, type: 'archive', document: doc }, null, 2)], { type: 'application/json;charset=utf-8' }), '山海一生-备份档案.json'); toast('备份文件已另存。'); return;
  }
  if (action === 'export-preserved') {
    const raw = store.preservedRaw(element.dataset.snapshot);
    download(new Blob([raw], { type: 'application/json;charset=utf-8' }), '山海一生-恢复前原档-' + element.dataset.snapshot + '.json'); toast('恢复前的原始档案已另存。'); return;
  }
  if (action === 'recover-backup') {
    if (dirty && state) await exportLife('json');
    await performStore(() => store.recoverBackup()); if (!saveError) toast('备份已恢复，原始档案也已单独保留。'); return;
  }
  if (action === 'import-fork') {
    if (!pendingImport) throw new Error('请重新选择需要导入的文件。');
    const raw = pendingImport; await performStore(() => store.import(raw, { conflicts: 'fork' }));
    if (!saveError) toast('已采用文件副本继续，浏览器中原有的进度仍在前世录。'); return;
  }
  if (action === 'reload-save') {
    if (dirty && state) await exportLife('json');
    await performStore(() => store.load()); if (!saveError) toast('已读取浏览器中最新的档案。'); return;
  }
}

document.addEventListener('click', event => {
  const element = event.target.closest('button[data-action]');
  if (!element || element.disabled) return;
  void handleAction(element.dataset.action, element).catch(error => toast(error.message || '这次操作未能完成。', 6500));
});

document.addEventListener('input', event => {
  if (event.target.id === 'birth-name') {
    try { draft = renameBirth(draft, event.target.value); } catch { /* Let the user finish editing; validate on beginning. */ }
  }
});

document.addEventListener('change', event => {
  const element = event.target;
  void (async () => {
    if (element.id === 'speed') { preferences.speed = Number(element.value); savePreferences(); return; }
    if (element.id === 'reduced-motion') { preferences.reduced = element.checked; savePreferences(); draw(modal, dialogState()); return; }
    if (element.id === 'ambient-audio') {
      try { await music.setEnabled(element.checked); preferences.audio = element.checked; }
      catch (error) { preferences.audio = false; element.checked = false; toast(error.message); }
      savePreferences(); return;
    }
    if (element.id === 'curve-field') { modalInfo.data.field = element.value; refreshDialog(); document.querySelector('#curve-field')?.focus(); return; }
    if (element.id === 'import-file') {
      const file = element.files?.[0]; if (!file) return;
      if (saving) { toast('请等当前留档完成，再选择文件。'); element.value = ''; return; }
      if (file.size > MAX_FILE_BYTES) throw new Error('文件超过 12 MiB，本次没有读取或覆盖已有档案。');
      if (dirty) { await persist(); if (saveError) { element.value = ''; return; } }
      const raw = await file.text(); await performStore(() => store.import(raw));
      if (saveError?.code === 'duplicate') {
        const exported = JSON.parse(raw), incoming = exported.type === 'life' ? [exported.state] : exported.type === 'archive' ? exported.document.lives : exported.lives;
        const conflicts = incoming.flatMap(item => { const current = store.lives().find(stored => stored.id === item.id); return current && JSON.stringify(current) !== JSON.stringify(item) ? [{ name: item.player.name, currentAge: Math.floor(current.month / 12), fileAge: Math.floor(item.month / 12), currentDecisions: current.choices.length, fileDecisions: item.choices.length }] : []; });
        pendingImport = raw; saveError = null; updateSaveStatus(); openDialog('import-conflict', { conflicts });
        return;
      }
      if (!saveError) toast('档案已导入，其他人生也已保留。');
    }
  })().catch(error => { toast(error.message || '这次操作未能完成。', 6500); if (element.id === 'import-file') element.value = ''; });
});

modal.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
modal.addEventListener('click', event => { if (event.target === modal) { const bounds = modal.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(); } });

document.addEventListener('keydown', event => {
  if (modal.open || mode !== 'life' || saving || event.target.closest('button, input, select, textarea, a')) return;
  if (event.code === 'Space') { event.preventDefault(); void handleAction('play', {}); }
  if (event.code === 'ArrowRight' && !state.pending) { event.preventDefault(); void progress(12).catch(error => toast(error.message)); }
});

setInterval(() => {
  if (!autoplay || saving || modal.open || document.hidden || state?.phase !== 'life' || state.pending) return;
  const next = advance(state, preferences.speed * 3);
  if (next.pending) resumeAfterChoice = true;
  void commit(next).catch(error => { autoplay = false; toast(error.message); });
}, 900);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { autoplay = false; resumeAfterChoice = false; music.pause(); }
  else void music.resume().catch(() => { preferences.audio = false; });
  startAnimation(); render();
});
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY && event.newValue !== store.snapshotRaw) {
    autoplay = false; resumeAfterChoice = false;
    saveError = new Error('另一个页面更新了档案。此页已暂停；可先导出本页进度，再读取最新档案。'); saveError.code = 'conflict';
    render();
  }
});
window.addEventListener('beforeunload', event => { if (dirty && state) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('resize', () => { draw(screen, currentScene()); if (modal.open) draw(modal, dialogState()); });

applyPreferences(); render();
