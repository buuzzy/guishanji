import { validateRun, cloneRun, upgradeRun } from './engine.js';
import { CONTENT_REVISION, LEGACY_CONTENT_REVISION, PREVIOUS_CONTENT_REVISION,PREVIEW3_CONTENT_REVISION } from '../../content/adventure.js';
import { hashText } from '../core/random.js';

export const ADVENTURE_KEY = 'shanhai.adventure.v01';
export const MAX_ARCHIVE_BYTES = 3 * 1024 * 1024;
export class AdventureSaveError extends Error {
  constructor(code, message, cause) { super(message, { cause }); this.name = 'AdventureSaveError'; this.code = code; }
}
const empty = () => ({ product: 'gui-shan-preview', format: 1, contentRevision: CONTENT_REVISION, revision: 0, activeId: null, lives: [] });
function parse(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_ARCHIVE_BYTES) throw new AdventureSaveError('invalid', '存档文件过大，原文已保留。');
  try { return JSON.parse(raw); } catch (error) { throw new AdventureSaveError('corrupt', '存档文字损坏。已有原档没有被覆盖，可以导出或读取备份。', error); }
}
export function validateArchive(doc) {
  if (!doc || doc.product !== 'gui-shan-preview' || doc.format !== 1 || ![CONTENT_REVISION, LEGACY_CONTENT_REVISION, PREVIOUS_CONTENT_REVISION,PREVIEW3_CONTENT_REVISION].includes(doc.contentRevision) || !Number.isSafeInteger(doc.revision) || doc.revision < 0 || !Array.isArray(doc.lives) || doc.lives.length > 64) throw new AdventureSaveError('version', '这份存档的产品、版本或结构暂不支持。原档已保留。');
  const ids = new Set();
  for (const state of doc.lives) {
    try { validateRun(state); } catch (error) { throw new AdventureSaveError('invalid', error.message, error); }
    if (ids.has(state.id)) throw new AdventureSaveError('invalid', '人生编号重复，已有档案未改写。');
    ids.add(state.id);
  }
  if (doc.activeId !== null && !ids.has(doc.activeId)) throw new AdventureSaveError('invalid', '当前人生引用损坏，已有档案未改写。');
  return doc;
}
function upgradeArchive(doc) {
  validateArchive(doc);
  const upgraded = cloneRun(doc);
  upgraded.contentRevision = CONTENT_REVISION;
  upgraded.lives = doc.lives.map(upgradeRun);
  return validateArchive(upgraded);
}

/** Independent archive. UI wraps writes in Web Locks; this also compares the raw baseline. */
export class AdventureStore {
  constructor(storage, key = ADVENTURE_KEY) { this.storage = storage; this.key = key; this.rawSnapshot = undefined; this.document = null; this.migrationRaw = null; }
  raw(suffix = '') {
    try { return this.storage.getItem(this.key + suffix); }
    catch (error) { throw new AdventureSaveError('unavailable', '浏览器未允许读取本地存档。仍可导出当前人生。', error); }
  }
  load() {
    const raw = this.raw(); this.rawSnapshot = raw; this.document = null;
    const original = raw === null ? empty() : validateArchive(parse(raw));
    this.document = upgradeArchive(original);
    this.migrationRaw = raw !== null && JSON.stringify(original) !== JSON.stringify(this.document) ? raw : null;
    return this.active();
  }
  active() { return cloneRun(this.document?.lives.find(state => state.id === this.document.activeId) || null); }
  lives() { return cloneRun(this.document?.lives || []); }
  baseline() {
    if (this.rawSnapshot === undefined) this.load();
    if (!this.document) throw new AdventureSaveError('corrupt', '原档无法读取，已停止自动写入。可先导出原档或恢复备份。');
    if (this.raw() !== this.rawSnapshot) throw new AdventureSaveError('conflict', '另一个页面已更新存档。本页已暂停写入，请先导出本页进度，再读取最新档案。');
  }
  put(key, raw) {
    try { this.storage.setItem(key, raw); }
    catch (error) { throw new AdventureSaveError(error.name === 'QuotaExceededError' ? 'quota' : 'unavailable', '本地存档写入失败，已有主档仍保留。请导出当前人生后再处理。', error); }
    if (this.storage.getItem(key) !== raw) throw new AdventureSaveError('readback', '存档读回不一致，请导出本页进度。');
  }
  write(doc) {
    this.baseline(); validateArchive(doc);
    const next = cloneRun(doc); next.revision = this.document.revision + 1;
    const raw = JSON.stringify(next);
    if (new TextEncoder().encode(raw).length > MAX_ARCHIVE_BYTES) throw new AdventureSaveError('quota', '档案已达到本版上限。旧人生没有被删，请先导出保存。');
    if (this.migrationRaw !== null) this.preserve(this.migrationRaw, parse(this.migrationRaw).contentRevision === PREVIEW3_CONTENT_REVISION ? '.preserved.preview3.' : parse(this.migrationRaw).contentRevision === PREVIOUS_CONTENT_REVISION ? '.preserved.preview2.' : '.preserved.preview1.');
    if (this.rawSnapshot !== null) this.put(this.key + '.backup', this.rawSnapshot);
    this.baseline(); this.put(this.key, raw);
    this.rawSnapshot = raw; this.document = next; this.migrationRaw = null;
    return this.active();
  }
  save(state) {
    validateRun(state); this.baseline();
    const doc = cloneRun(this.document), index = doc.lives.findIndex(old => old.id === state.id);
    if (index >= 0) {
      const old = doc.lives[index];
      if (doc.activeId === state.id && JSON.stringify(old) === JSON.stringify(state)) return this.active();
      if (old.seed !== state.seed || old.revision >= state.revision || (old.phase === 'ended' && JSON.stringify(old) !== JSON.stringify(state))) throw new AdventureSaveError('stale', '此人生已有更新或已结束，不能被旧进度覆盖。可导出本页副本。');
      doc.lives[index] = cloneRun(state);
    } else {
      if (doc.lives.length >= 64) throw new AdventureSaveError('quota', '已保存六十四段人生，本版不会自动删除。可导出档案后另开浏览器体验。');
      doc.lives.push(cloneRun(state));
    }
    doc.activeId = state.id;
    return this.write(doc);
  }
  activate(id) {
    this.baseline();
    if (!this.document.lives.some(state => state.id === id)) throw new AdventureSaveError('missing', '没有找到这段人生。');
    const doc = cloneRun(this.document); doc.activeId = id; return this.write(doc);
  }
  export(state = null) {
    if (state) { validateRun(state); return JSON.stringify({ product: 'gui-shan-preview', exportVersion: 1, type: 'life', state }, null, 2); }
    if (!this.document) throw new AdventureSaveError('corrupt', '请用“导出原档”保留当前无法解析的文字。');
    return JSON.stringify(this.document, null, 2);
  }
  import(raw) {
    const file = parse(raw);
    let incoming;
    if (file?.product === 'gui-shan-preview' && file.exportVersion === 1 && file.type === 'life') { validateRun(file.state); incoming = [upgradeRun(file.state)]; }
    else incoming = upgradeArchive(file).lives;
    this.baseline();
    const doc = cloneRun(this.document);
    for (const source of incoming) {
      const state = cloneRun(source), existing = doc.lives.find(old => old.id === state.id);
      if (existing && JSON.stringify(existing) === JSON.stringify(state)) { doc.activeId = existing.id; continue; }
      if (existing) {
        const stem = 'copy-' + hashText(JSON.stringify(state)).toString(36);
        let id = stem, number = 1; while (doc.lives.some(old => old.id === id)) id = stem + '-' + number++;
        state.id = id;
      }
      if (doc.lives.length >= 64) throw new AdventureSaveError('quota', '导入后人生数超出上限，本次尚未写入。');
      doc.lives.push(state); doc.activeId = state.id;
    }
    return this.write(doc);
  }
  recover() {
    const backup = this.raw('.backup');
    if (backup === null) throw new AdventureSaveError('missing', '这个浏览器还没有有效备份。');
    const original = validateArchive(parse(backup)), doc = upgradeArchive(original), current = this.raw();
    if (this.rawSnapshot !== undefined && current !== this.rawSnapshot) throw new AdventureSaveError('conflict', '主档刚刚更新，请先重新读取。');
    if (current !== null) this.put(this.key + '.preserved.' + hashText(current).toString(36), current);
    if (JSON.stringify(original) !== JSON.stringify(doc)) this.preserve(backup, original.contentRevision===PREVIEW3_CONTENT_REVISION?'.preserved.preview3.':original.contentRevision===PREVIOUS_CONTENT_REVISION?'.preserved.preview2.':'.preserved.preview1.');
    if (this.raw() !== current) throw new AdventureSaveError('conflict', '恢复时检测到另一个页面写入，已停止。');
    doc.revision++; const raw = JSON.stringify(doc); this.put(this.key, raw);
    this.rawSnapshot = raw; this.document = doc; this.migrationRaw = null; return this.active();
  }
  preserve(raw, prefix) {
    const stem = this.key + prefix + hashText(raw).toString(36);
    let key = stem, index = 1, old = this.storage.getItem(key);
    while (old !== null && old !== raw) { key = stem + '-' + index++; old = this.storage.getItem(key); }
    if (old !== raw) this.put(key, raw);
  }
}
