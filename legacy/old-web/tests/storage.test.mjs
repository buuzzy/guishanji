import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, STORAGE_KEY } from '../packages/storage/store.js';
import { newLife, beginLife, advance, choose } from '../apps/web/game-api.js';
import { clone } from '../packages/core/state.js';
import { playLife } from './scenarios.mjs';

class MemoryStorage {
  constructor() { this.map = new Map(); this.limit = Infinity; this.silent = null; }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) {
    const copy = new Map(this.map); copy.set(key, String(value));
    if ([...copy].reduce((sum, [k, v]) => sum + k.length + v.length, 0) > this.limit) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }
    if (this.silent !== key) this.map = copy;
  }
}

test('存档读回完整，恢复后沿同样的随机流继续人生', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); assert.equal(store.load(), null);
  const pending = advance(beginLife(newLife({ seed: 'restore-rng' })), 72); store.save(pending);
  const second = new SaveStore(storage), restored = second.load(); assert.deepEqual(restored, pending);
  assert.deepEqual(advance(choose(restored, 'read'), 72), advance(choose(pending, 'read'), 72));
  restored.player.name = '另一个名字'; assert.equal(second.active().player.name, pending.player.name);
});

test('另启新人生保留已经结束与尚未结束的完整人生', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load();
  const unfinished = advance(beginLife(newLife({ seed: 'unfinished' })), 72), ended = playLife('archived', 'family');
  store.save(unfinished); store.save(ended); store.save(beginLife(newLife({ seed: 'third' })));
  assert.equal(store.lives().length, 3); assert.deepEqual(store.activate(unfinished.id), unfinished);
  assert.deepEqual(store.lives().find(item => item.id === ended.id), ended);
  assert.throws(() => store.save({ ...ended, revision: ended.revision + 1 }), /结束/u);
});

test('保存之前备份上一份完整档案，不能用旧人生覆盖新进度', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load();
  const first = beginLife(newLife({ seed: 'backup' })), second = advance(first, 12); store.save(first); store.save(second);
  assert.deepEqual(store.backup().lives[0], first); assert.throws(() => store.save(first), /旧进度/u);
  assert.deepEqual(store.active(), second);
});

test('多个页面的基线冲突明确报错，不覆盖较新的档案', () => {
  const storage = new MemoryStorage(), a = new SaveStore(storage), b = new SaveStore(storage); a.load(); b.load();
  a.save(beginLife(newLife({ seed: 'a' }))); const raw = storage.getItem(STORAGE_KEY);
  assert.throws(() => b.save(beginLife(newLife({ seed: 'b' }))), error => error.code === 'conflict');
  assert.equal(storage.getItem(STORAGE_KEY), raw); assert.equal(b.lives().length, 0);
});

test('存储配额不足和写入读回失败保留已有档案及其他游戏数据', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); storage.setItem('other-game', 'do-not-touch'); store.load();
  const first = beginLife(newLife({ seed: 'quota' })); store.save(first); const raw = storage.getItem(STORAGE_KEY);
  storage.limit = raw.length + 200;
  assert.throws(() => store.save(advance(first, 12)), error => error.code === 'quota');
  assert.equal(storage.getItem(STORAGE_KEY), raw); assert.equal(storage.getItem('other-game'), 'do-not-touch');
  storage.limit = Infinity; storage.silent = STORAGE_KEY + '.backup';
  assert.throws(() => store.save(advance(first, 12)), error => error.code === 'readback');
  assert.equal(storage.getItem(STORAGE_KEY), raw);
});

test('损坏原档可以导出，恢复有效备份前会另存损坏文字', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load();
  const state = beginLife(newLife({ seed: 'recover' })); store.save(state); store.save(advance(state, 12));
  const corrupt = '{broken-raw-data'; storage.setItem(STORAGE_KEY, corrupt);
  const fresh = new SaveStore(storage); assert.throws(() => fresh.load(), error => error.code === 'corrupt');
  assert.equal(fresh.raw(), corrupt); assert.throws(() => fresh.save(state));
  assert.deepEqual(fresh.recoverBackup(), state);
  assert.ok([...storage.map.entries()].some(([key, value]) => key.startsWith(STORAGE_KEY + '.preserved.') && value === corrupt));
});

test('未知版本、危险键与缺失人物引用的导入不改写原档', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load(); const state = beginLife(newLife({ seed: 'invalid-import' })); store.save(state);
  const raw = store.raw(), file = JSON.parse(store.export(state)); file.state.format = 2;
  assert.throws(() => store.import(JSON.stringify(file)), /版本/u); assert.equal(store.raw(), raw);
  file.state = clone(state); file.state.player.partnerId = 'missing'; assert.throws(() => store.import(JSON.stringify(file)), /人物/u);
  file.state = clone(state); Object.defineProperty(file.state.flags, '__proto__', { value: {}, enumerable: true }); assert.throws(() => store.import(JSON.stringify(file)), /数据键/u);
  assert.equal(store.raw(), raw);
});

test('此生与全量 JSON 转移合并档案，重复进度冲突时原样保留', () => {
  const a = new SaveStore(new MemoryStorage()), b = new SaveStore(new MemoryStorage()); a.load(); b.load();
  const first = beginLife(newLife({ seed: 'one' })), second = playLife('two', 'family'); a.save(first); a.save(second);
  assert.deepEqual(b.import(a.export()), second); assert.equal(b.lives().length, 2);
  assert.deepEqual(b.import(a.export(first)), first); assert.equal(b.lives().length, 2);
  const prior = b.raw(); assert.throws(() => b.import(a.export(advance(first, 12))), error => error.code === 'duplicate'); assert.equal(b.raw(), prior);
});

test('写入失败时全量导出仍能包括本页的未保存进度，不修改浏览器原档', () => {
  const store = new SaveStore(new MemoryStorage()); store.load(); const state = beginLife(newLife({ seed: 'dirty-export' })); store.save(state);
  const next = advance(state, 12), prior = store.raw(), file = store.export(null, next);
  const recipient = new SaveStore(new MemoryStorage()); recipient.load(); assert.deepEqual(recipient.import(file), next);
  assert.equal(store.raw(), prior); assert.deepEqual(store.active(), state);
});

test('浏览器禁止存储时返回明确错误，不伪报保存成功', () => {
  const store = new SaveStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  assert.throws(() => store.load(), error => error.code === 'unavailable');
});

test('明确采用文件副本时并存两份进度，人物引用与机缘完整延续', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load();
  const state = advance(beginLife(newLife({ seed: 'fork-graph', root: 'dual' })), 72); store.save(state);
  const other = advance(choose(state, 'read'), 72), previous = clone(store.active());
  const copied = store.import(store.export(other), { conflicts: 'fork' });
  assert.notEqual(copied.id, state.id); assert.deepEqual(copied.random, other.random); assert.equal(copied.month, other.month); assert.equal(copied.pending.event, other.pending.event);
  assert.equal(store.lives().length, 2); assert.deepEqual(store.lives().find(item => item.id === state.id), previous);
  const a = choose(other, 'songyin'), b = choose(copied, 'songyin');
  assert.deepEqual(a.random, b.random); assert.deepEqual(a.stats, b.stats); assert.equal(a.player.realm, b.player.realm); assert.equal(a.player.name, b.player.name);
  assert.ok(b.people.some(person => person.id === b.player.mentorId));
  assert.equal(store.import(store.export(other), { conflicts: 'fork' }).id, copied.id); assert.equal(store.lives().length, 2);
});

test('恢复前的有效原档可列出、原文下载并在另一浏览器导入', () => {
  const storage = new MemoryStorage(), store = new SaveStore(storage); store.load();
  const original = beginLife(newLife({ seed: 'before-recovery' })); store.save(original); const later = advance(original, 72); store.save(later); const before = store.raw();
  store.recoverBackup(); const entries = store.preserved(); assert.equal(entries.length, 1); assert.equal(entries[0].lives, 1); assert.equal(store.preservedRaw(entries[0].id), before);
  const recipient = new SaveStore(new MemoryStorage()); recipient.load(); assert.deepEqual(recipient.import(before), later);
});
