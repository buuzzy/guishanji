/**
 * 道具闭环门禁的反向验证（2026-11-08 · T5）
 * ============================================================================
 *
 * 这道门禁守的是「道具**从哪来、能到哪去**」：
 *   · 发霉的道具（表里有、源码里一次都没出现）
 *   · 拿不到却被消耗
 *   · 拿到却无出口
 *   · 人生经历带道具的比例低于下限
 *
 * ⚠ **为什么要单测**：
 *   护栏类门禁平时很少真的拦下什么 ⇒ 光看「跑一遍没报错」证明不了它有用。
 *   ⇒ 这里用**造出来的坏数据**逐条证明四条判据真的抓得住，
 *     并且守「扫描器认得三种写法」（带引号 / 对象键 / 动态变量）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {judge, classifyText, RATIO_FLOOR} from '../scripts/audit-items.mjs';

/** 造一条「道具行」给判据用。 */
const row = (id, source, sink, use) => ({
  id, name: id, source, sink, use,
  sourceFiles: source ? ['a.js'] : [],
  sinkFiles: sink ? ['a.js'] : [],
  useFiles: use ? ['a.js'] : [],
});

/* ── ① 四条判据各自抓得住吗 ────────────────────────────────────────── */

test('判据：发霉的道具（表里有、源码里一次都没出现）必须报红', () => {
  const problems = judge([row('moldy_item', 0, 0, 0)], 0.5);
  assert.ok(problems.some(p => p.includes('moldy_item') && p.includes('一次都没出现')), '发霉的道具必须被报出来');
});

test('判据：拿不到却被消耗必须报红', () => {
  const problems = judge([row('ghost_item', 0, 1, 0)], 0.5);
  assert.ok(problems.some(p => p.includes('ghost_item') && p.includes('没有任何来源')), '拿不到却被消耗必须被报出来');
});

test('判据：拿到却无出口必须报红', () => {
  const problems = judge([row('dead_item', 1, 0, 0)], 0.5);
  assert.ok(problems.some(p => p.includes('dead_item') && p.includes('没有任何出口')), '拿到却无出口必须被报出来');
});

test('判据：人生经历带道具的比例低于下限必须报红', () => {
  const problems = judge([row('fine_item', 1, 1, 1)], RATIO_FLOOR - 0.01);
  assert.ok(problems.some(p => p.includes('比例')), '比例不达标必须被报出来');
});

test('判据：全都达标时不得报红（门禁不能只会红）', () => {
  const problems = judge([row('fine_item', 1, 1, 1)], RATIO_FLOOR);
  assert.deepEqual(problems, [], '全都达标时不该报红');
});

/* ── ② 扫描器认得三种写法吗（这是实测踩过的坑）────────────────────── */

const scan = (source, ids) => {
  const found = new Map();
  for (const id of ids) found.set(id, {source: new Set(), sink: new Set(), use: new Set()});
  classifyText(source, 'x.js', found);
  return found;
};

test('扫描：带引号的获得（effects.items）算来源', () => {
  const found = scan(`const a={effects:{items:['alpha_item']}};`, ['alpha_item']);
  assert.equal(found.get('alpha_item').source.size, 1);
  assert.equal(found.get('alpha_item').sink.size, 0);
});

test('扫描：不带引号的对象键（check.items）算用途 —— 实测踩过的坑', () => {
  const found = scan(`const a={check:{base:1,items:{alpha_item:10}}};`, ['alpha_item']);
  assert.equal(found.get('alpha_item').use.size, 1, 'check 里的道具必须算成「用途」');
  assert.equal(found.get('alpha_item').source.size, 0);
});

test('扫描：cost 里的道具算消耗', () => {
  const found = scan(`const a={cost:{items:['alpha_item']}};`, ['alpha_item']);
  assert.equal(found.get('alpha_item').sink.size, 1);
});

test('扫描：动态写法（items:[变量]）要能追到变量的定义', () => {
  const source = `const items=['alpha_item','beta_item'];const a={effects:{items:[items[0]]}};`;
  const found = scan(source, ['alpha_item', 'beta_item']);
  assert.equal(found.get('alpha_item').source.size, 1, 'items[0] 指到的那个必须算成来源');
});

test('扫描：一条声明里两个变量（const a=…,item={…}[k]）也要认得', () => {
  const source = `const skill=c.skill,item={x:'alpha_item'}[skill];const b={effects:{items:[item]}};`;
  const found = scan(source, ['alpha_item']);
  assert.equal(found.get('alpha_item').source.size, 1);
});

test('扫描：failure 里的道具算来源（失败时「拿到」的东西）', () => {
  const found = scan(`const a={check:{failure:{items:['alpha_item']}}};`, ['alpha_item']);
  assert.equal(found.get('alpha_item').source.size, 1);
});

test('扫描：完全没出现的道具既不是来源也不是出口（要被抓成「发霉」）', () => {
  const found = scan(`const a={effects:{items:['alpha_item']}};`, ['alpha_item', 'ghost_item']);
  const g = found.get('ghost_item');
  assert.equal(g.source.size + g.sink.size + g.use.size, 0);
});
