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
 *
 * `ageEnd` 是长线的**年龄上界**（S6 引入）：它标出「这条线最晚该在哪个年纪出现」。
 * ⚠ 它只被**当前版本（规则十二）**的执行器读 —— 历史版本（5–11）仍按老口径走
 *   （只看 `age`，不看上界）⇒ 加它**不改历史版本的任何一个值**。
 *   ⇒ 它属于「当前版本专用的附加信息」，与 `voice` 同性质。
 *
 * ⚠⚠ 它的正确性**不靠这个门禁守**（它被忽略了）⇒ 由「长线覆盖率审计」守
 *   （`scripts/audit-chains.mjs`）：每条长线在窗口内都该发得出来。
 */
export const IGNORED_FIELDS = ['voice', 'ageEnd'];

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
