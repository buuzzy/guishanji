import { validateState, ValidationError } from '../core/validate.js';
import { clone } from '../core/state.js';
import { hashText } from '../core/random.js';
import { forkState } from './fork.js';

export const STORAGE_KEY = 'shanhai.life.v1';
export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export class StorageError extends Error {
  constructor(message, code, cause) { super(message, { cause }); this.name = 'StorageError'; this.code = code; }
}

function parse(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_FILE_BYTES) throw new StorageError('文件过大或不是可读取的文字。原文件已保留。', 'invalid');
  try { return JSON.parse(raw); } catch (error) { throw new StorageError('存档文字已损坏，原数据没有被改写。可导出原档或读取备份。', 'corrupt', error); }
}

export function validateDocument(doc) {
  if (!doc || doc.format !== 1 || !Number.isSafeInteger(doc.revision) || doc.revision < 0 || typeof doc.updatedAt !== 'string' || !Array.isArray(doc.lives) || doc.lives.length > 512) throw new StorageError('档案版本或结构暂不支持，原数据已保留。', 'invalid');
  if (Object.keys(doc).some(key => ['__proto__', 'constructor', 'prototype'].includes(key))) throw new StorageError('档案存在不允许的数据键。', 'invalid');
  const ids = new Set();
  for (const state of doc.lives) {
    validateState(state);
    if (ids.has(state.id)) throw new StorageError('档案中存在重复人生 ID。', 'invalid');
    ids.add(state.id);
  }
  if (doc.activeId !== null && !ids.has(doc.activeId)) throw new StorageError('当前人生的引用已损坏。', 'invalid');
  return doc;
}

function empty() { return { format: 1, revision: 0, updatedAt: '', activeId: null, lives: [] }; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** One atomic document retains every life. Never deletes history to fit a quota. */
export class SaveStore {
  constructor(storage, key = STORAGE_KEY) { this.storage = storage; this.key = key; this.snapshotRaw = undefined; this.document = null; }

  raw(backup = false) {
    try { return this.storage.getItem(this.key + (backup ? '.backup' : '')); }
    catch (error) { throw new StorageError('浏览器未允许读取本地存档。你仍可将当前人生导出为文件。', 'unavailable', error); }
  }

  load() {
    const raw = this.raw(); this.snapshotRaw = raw;
    try { this.document = raw === null ? empty() : validateDocument(parse(raw)); }
    catch (error) { this.document = null; throw error; }
    return this.active();
  }

  active() { return clone(this.document?.lives.find(state => state.id === this.document.activeId) || null); }
  lives() { return clone(this.document?.lives || []); }

  put(key, raw) {
    try { this.storage.setItem(key, raw); }
    catch (error) { throw new StorageError(error?.name === 'QuotaExceededError' ? '浏览器存储空间不足。已有档案没有删除；请导出当前人生或全量档案后重试。' : '本地存档无法写入，请导出当前人生以保留进度。', error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable', error); }
    try { if (this.storage.getItem(key) !== raw) throw new Error('readback mismatch'); }
    catch (error) { throw new StorageError('存档写入后读回不一致。请导出当前进度，并重新读取档案。', 'readback', error); }
  }

  assertBaseline() {
    if (this.snapshotRaw === undefined) this.load();
    if (!this.document) throw new StorageError('原档未能读取。请先导出原数据或读取有效备份，再写入新人生。', 'corrupt');
    if (this.raw() !== this.snapshotRaw) throw new StorageError('另一个页面已经更新了档案。已暂停写入，请先导出本页进度，再读取最新档案。', 'conflict');
  }

  write(doc) {
    this.assertBaseline(); validateDocument(doc);
    const next = clone(doc); next.revision = this.document.revision + 1; next.updatedAt = new Date().toISOString();
    const raw = JSON.stringify(next);
    if (raw.length > MAX_FILE_BYTES) throw new StorageError('档案已经超过本版本的导入上限，请先导出保存。', 'quota');
    if (this.snapshotRaw !== null) this.put(this.key + '.backup', this.snapshotRaw);
    this.assertBaseline();
    this.put(this.key, raw);
    this.snapshotRaw = raw; this.document = next;
    return this.active();
  }

  save(state) {
    validateState(state); this.assertBaseline();
    const doc = clone(this.document), index = doc.lives.findIndex(item => item.id === state.id);
    if (index >= 0) {
      const old = doc.lives[index];
      if (old.seed !== state.seed || old.revision > state.revision || (old.phase === 'ended' && !same(old, state))) throw new StorageError('此人生 ID 已有更新或已结束。已有版本已保留，不能用旧进度覆盖。', 'stale');
      doc.lives[index] = clone(state);
    } else doc.lives.push(clone(state));
    doc.activeId = state.id;
    return this.write(doc);
  }

  activate(id) {
    this.assertBaseline();
    if (!this.document.lives.some(state => state.id === id)) throw new StorageError('没有找到这段人生。', 'missing');
    const doc = clone(this.document); doc.activeId = id; return this.write(doc);
  }

  backup() {
    const raw = this.raw(true);
    if (raw === null) throw new StorageError('当前浏览器还没有备份。', 'missing');
    return clone(validateDocument(parse(raw)));
  }

  recoverBackup() {
    const doc = this.backup(), current = this.raw();
    if (this.snapshotRaw !== undefined && current !== this.snapshotRaw) throw new StorageError('档案刚被其他页面更新，请重新读取后再恢复。', 'conflict');
    if (current !== null) this.put(this.key + '.preserved.' + hashText(current).toString(36), current);
    if (this.raw() !== current) throw new StorageError('恢复过程中档案有变更，原文件已保留。', 'conflict');
    doc.revision++; doc.updatedAt = new Date().toISOString();
    const raw = JSON.stringify(doc); this.put(this.key, raw);
    this.snapshotRaw = raw; this.document = doc; return this.active();
  }

  preserved() {
    try {
      const result = [], prefix = this.key + '.preserved.';
      for (let index = 0; index < Math.min(this.storage.length || 0, 4096); index++) {
        const key = this.storage.key(index);
        if (!key?.startsWith(prefix)) continue;
        const raw = this.storage.getItem(key);
        let document = null;
        try { document = validateDocument(parse(raw)); } catch { /* Raw damaged text remains downloadable. */ }
        result.push({ id: key.slice(prefix.length), characters: raw?.length || 0, lives: document?.lives.length ?? null, updatedAt: document?.updatedAt || '' });
      }
      return result;
    } catch (error) { throw new StorageError('浏览器暂未允许读取恢复前的原档。', 'unavailable', error); }
  }

  preservedRaw(id) {
    if (typeof id !== 'string' || !/^[a-z0-9]{1,20}$/u.test(id)) throw new StorageError('原档编号无效。', 'invalid');
    const raw = this.storage.getItem(this.key + '.preserved.' + id);
    if (raw === null) throw new StorageError('没有找到这份恢复前原档。', 'missing');
    return raw;
  }

  export(state = null, current = null) {
    if (state) { validateState(state); return JSON.stringify({ product: 'shanhai-life', exportVersion: 1, type: 'life', state }, null, 2); }
    if (!this.document) throw new StorageError('档案无法解析，请使用“导出原档”。', 'corrupt');
    const document = clone(this.document);
    if (current) {
      validateState(current);
      const index = document.lives.findIndex(item => item.id === current.id);
      if (index >= 0) document.lives[index] = clone(current); else document.lives.push(clone(current));
      document.activeId = current.id;
    }
    return JSON.stringify({ product: 'shanhai-life', exportVersion: 1, type: 'archive', document }, null, 2);
  }

  import(raw, { conflicts = 'reject' } = {}) {
    const file = parse(raw);
    let incoming, activeId;
    if (file?.format === 1 && Array.isArray(file.lives) && file.product === undefined) { validateDocument(file); incoming = file.lives; activeId = file.activeId; }
    else {
      if (!file || file.product !== 'shanhai-life' || file.exportVersion !== 1) throw new StorageError('这不是本游戏支持的档案文件。', 'invalid');
      if (file.type === 'life') { validateState(file.state); incoming = [file.state]; activeId = file.state.id; }
      else if (file.type === 'archive') { validateDocument(file.document); incoming = file.document.lives; activeId = file.document.activeId; }
      else throw new StorageError('未知的导出类型。', 'invalid');
    }
    this.assertBaseline();
    const doc = clone(this.document);
    let adoptedActiveId = activeId;
    for (const state of incoming) {
      const existing = doc.lives.find(item => item.id === state.id);
      let adopted = state;
      if (existing && !same(existing, state)) {
        if (conflicts !== 'fork') throw new StorageError('文件与浏览器中有同一人生的不同进度。可以保留两个进度后采用文件副本继续；此次没有覆盖已有进度。', 'duplicate');
        const digest = hashText(JSON.stringify(state));
        for (let index = 0; index < 1024; index++) {
          const candidate = 'life-' + hashText(state.seed).toString(36) + '-' + hashText(state.id + ':' + digest + ':fork:' + index).toString(36);
          if (candidate === state.id) continue;
          const copied = forkState(state, candidate), stored = doc.lives.find(item => item.id === candidate);
          if (!stored || same(stored, copied)) { adopted = copied; break; }
        }
        if (adopted === state) throw new StorageError('暂时无法为副本分配独立 ID，原档已保留。', 'duplicate');
      }
      if (!doc.lives.some(item => item.id === adopted.id)) doc.lives.push(clone(adopted));
      if (state.id === activeId) adoptedActiveId = adopted.id;
    }
    if (adoptedActiveId) doc.activeId = adoptedActiveId;
    return this.write(doc);
  }
}

export { ValidationError };
