#!/usr/bin/env node
/**
 * 规范化序列化器 —— 让「内容」能被逐值比对。
 *
 * 为什么需要它：
 *   事件表里 `text` / `reply` 可能是函数（`s => '...'`），
 *   JSON.stringify 会把函数**直接丢掉** ⇒ 比对会「假绿」（函数变了也发现不了）。
 *   这里把函数记成 `fn:<源码字符串>`、把 undefined 记成显式标记、对象键排序，
 *   于是序列化结果稳定、可逐字节比对。
 *
 * 只服务于 scripts/（不进小程序包），可以放心用 Node API。
 */
import { createHash } from 'node:crypto';

/**
 * 不参与「内容保真」比对的字段。
 *
 * `voice` 是表达域的状态位（S7 引入）：它标明「这条事件的话怎么说」，
 * 不是剧情内容本身。加它不该让「事件表逐值全等」门禁误报。
 */
export const IGNORED_FIELDS = ['voice'];

/**
 * 把任意值转成可稳定比对的结构。
 * @param {*} value
 * @param {{ignore?: string[]}} [options]
 */
export function canonical(value, options = {}) {
  const ignore = options.ignore || IGNORED_FIELDS;
  if (value === undefined) return { __undefined: true };
  if (typeof value === 'function') return { __function: value.toString() };
  if (value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return { __number: String(value) };
  if (Array.isArray(value)) return value.map(item => canonical(item, options));
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (ignore.indexOf(key) !== -1) continue;
      out[key] = canonical(value[key], options);
    }
    return out;
  }
  return value;
}

/** 稳定字符串（键已排序）。 */
export function stableStringify(value, options = {}) {
  return JSON.stringify(canonical(value, options));
}

/** 内容摘要（sha256 前 16 位足够定位，且基线文件小）。 */
export function digest(value, options = {}) {
  const text = typeof value === 'string' ? value : stableStringify(value, options);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/** 一张表（id → 节点）的摘要 + 条目数。 */
export function tableDigest(table, options = {}) {
  return { count: Object.keys(table).length, digest: digest(table, options) };
}

/** 两个 id 列表的差异。 */
export function idDiff(actual, expected) {
  const a = new Set(actual);
  const e = new Set(expected);
  return {
    added: actual.filter(id => !e.has(id)),
    removed: expected.filter(id => !a.has(id)),
  };
}
