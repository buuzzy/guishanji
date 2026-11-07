/**
 * history.js —— 「与上一次跑批比」
 * ============================================================================
 *
 * ## 回答什么问题
 * ------------------
 * 「我刚改完内容，再跑一批 ⇒ **跟上次比，到底变了什么？**」——
 * 这是「不断跑批」这个循环的收尾：光看当前这一批，只知道「现在是什么样」；
 * 跟上一次比，才知道「我刚才那笔改动有没有用」。
 *
 * ## 它做什么
 * ----------
 *   ① 把每次跑批的**关键数字**存到浏览器本地（`localStorage`），
 *      存的是**已经算好的数**，不是规则 ⇒ 下次跑批拿来比。
 *   ② 画出差异块：哪几项变了、变了多少、**是变好还是变差**。
 *
 * ## ⚠ 口径
 * --------
 *   · **按玩法分开存**（固定偏好 / 随机探索各存一份）⇒
 *     同一个玩法的两次跑批之间可比（换个玩法去比，数字没有可比性）。
 *   · ⚠ **条数不一样要说明**：上次 40 条、这次 20 条 ⇒ 数字不能直接比，
 *     差异块里会写清楚，别让人拿两批不同大小的样本当同一批看。
 *   · ⚠ **方向不一样**：覆盖类（剧情卡 / 结局 / 道具 / 地名 / 到境人数）
 *     越多越好；缺口类（一族没走到 / 没选过的选项 / 没遇到的角儿）
 *     越少越好 ⇒ 「变好」不是看绝对值，是看方向。
 *
 * ## ⚠ 存档键不许撞
 * ------------------
 * 游戏自己的存档键是 `shanhai.adventure.v01`（`packages/adventure/store.js`）。
 * 这里用的是 `guishanji.viz.history.v1` ⇒ 两边各存各的，谁也不许动谁。
 *
 * ## ⚠ 本文件不许 import node:*
 * --------------------------
 * 浏览器与 Node 两侧都要用（门禁在 Node 侧 import 它拿存档键）⇒
 *   只能碰 `globalThis.localStorage`（浏览器里才有 ⇒ Node 侧自动当空）。
 */

import { md } from './md.js';

/**
 * 本地存档键。
 * ⚠ 与游戏的存档键 `shanhai.adventure.v01` **不是同一个**。
 */
export const HISTORY_KEY = 'guishanji.viz.history.v1';

/** 玩法各占一个槽（各存各的 ⇒ 同一个玩法的两次跑批之间才可比）。 */
export const HISTORY_MODES = [
  { id: 'policy', label: '固定偏好' },
  { id: 'random', label: '随机探索' },
];

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/**
 * 时间戳 → 人看得懂的字。
 * ⚠ 手动拼，不用 `toLocaleString` —— 那个在不同环境下写出来不一样。
 */
function stamp(at) {
  if (!at) return '—';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return String(at);
  const pad = value => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/** 玩法 id → 中文名。 */
function modeLabel(mode) {
  return (HISTORY_MODES.find(entry => entry.id === mode) || {}).label || mode;
}

/**
 * 读本地存档。
 *
 * ⚠ 浏览器里才有 `localStorage` ⇒ Node 侧（门禁 import 本文件）自动当空。
 * ⚠ 读坏了（存的东西被手改过）⇒ **不报错，当作没有** ⇒ 面板不许因此白屏。
 *
 * @returns {{policy: object|null, random: object|null}} 存着的快照
 */
export function readHistory() {
  const empty = { policy: null, random: null };
  try {
    const store = globalThis.localStorage;
    if (!store) return empty;
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const out = { policy: null, random: null };
    for (const mode of HISTORY_MODES) {
      const entry = parsed ? parsed[mode.id] : null;
      /* ⚠ 只认「有 metrics 的」⇒ 存坏的东西当作没有。 */
      if (entry && entry.metrics && typeof entry.metrics === 'object') out[mode.id] = entry;
    }
    return out;
  } catch {
    return empty;
  }
}

/**
 * 存一份快照（按玩法分开存）。
 *
 * @param {string} mode 'policy' | 'random'
 * @param {object} snapshot `model.js::buildBatchSnapshot()` 的结果
 * @returns {boolean} 存成功没有（存不了也不许把面板搞崩）
 */
export function writeSnapshot(mode, snapshot) {
  try {
    const store = globalThis.localStorage;
    if (!store || !snapshot) return false;
    const current = readHistory();
    current[mode] = snapshot;
    store.setItem(HISTORY_KEY, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

/**
 * 画一个玩法的差异块。
 *
 * @param {object} entry `{ mode, previous, next, rows }`
 */
function renderEntry(entry) {
  const label = modeLabel(entry.mode);
  const { previous, next, rows } = entry;
  /* ⚠ 第一次跑 ⇒ 没有上一次可比。 */
  if (!previous) {
    return `<div class="viz-hist-entry">
      <p class="viz-hist-title">${esc(label)}</p>
      <p class="viz-hint">${md('**还没有上一次的记录**可比 —— 这次跑完已经存下来了（' + stamp(next?.at) + '），下次再跑就能看出改动的影响。')}</p>
    </div>`;
  }
  /* ⚠ 上次有、这次没变。 */
  if (!rows || !rows.length) {
    return `<div class="viz-hist-entry">
      <p class="viz-hist-title">${esc(label)}</p>
      <p class="viz-hint">${md('跟上次跑的一模一样（上次 ' + previous.count + ' 条，这次 ' + (next?.count ?? '—') + ' 条，' + stamp(previous.at) + ' ⇒ ' + stamp(next?.at) + '），**没有变化**。')}</p>
    </div>`;
  }
  const good = rows.filter(row => row.good).length;
  const bad = rows.length - good;
  const list = rows.map(row => {
    const sign = row.delta > 0 ? '+' : '';
    const dir = row.better === 'up' ? '越多越好' : '越少越好';
    return `<div class="viz-hist-row">
      <span class="viz-hist-label" data-label="指标">${esc(row.label)}</span>
      <span class="viz-hist-num mono" data-label="上次">${row.before}</span>
      <span class="viz-hist-num mono" data-label="这次">${row.after}</span>
      <span class="viz-hist-num mono" data-label="变化">${sign}${row.delta}</span>
      <span class="viz-hist-good ${row.good ? 'ok' : 'bad'}" data-label="变好了吗">${md(row.good ? '**变好了**' : '**变差了**')}<small>（${dir}）</small></span>
    </div>`;
  }).join('');
  /* ⚠ 条数不一样 ⇒ 数字不能直接比 ⇒ 必须写清楚，别让人误读。 */
  const countNote = previous.count !== next?.count
    ? `<p class="viz-hist-note warn">⚠ 上次跑了 <b class="mono">${previous.count}</b> 条，这次跑了 <b class="mono">${next?.count ?? '—'}</b> 条 —— ${md('**条数不一样，数字不能直接比**')}。</p>`
    : '';
  return `<div class="viz-hist-entry">
    <p class="viz-hist-title">${esc(label)}<small>${esc(stamp(previous.at))} ⇒ ${esc(stamp(next?.at))}</small></p>
    <p class="viz-hist-note">${rows.length} 项变了：<b class="mono">${good}</b> 项变好，<b class="mono">${bad}</b> 项变差。</p>
    ${countNote}
    <div class="viz-hist-head">
      <span class="viz-hist-label">指标</span>
      <span class="viz-hist-num">上次</span>
      <span class="viz-hist-num">这次</span>
      <span class="viz-hist-num">变化</span>
      <span class="viz-hist-good">变好了吗</span>
    </div>
    <div class="viz-hist-list">${list}</div>
  </div>`;
}

/**
 * 画「与上一次跑批比」这一块。
 *
 * @param {object} history `{ policy?: entry, random?: entry }`
 */
export function renderHistory(history) {
  const entries = HISTORY_MODES.map(entry => (history ? history[entry.id] : null)).filter(Boolean);
  if (!entries.length) return '';
  return `<div class="viz-hist">${entries.map(renderEntry).join('')}</div>`;
}

/**
 * 一句话小结（放在「跑一批」的状态栏里）。
 *
 * @param {object} history 同上
 * @returns {string} 没有变化就返回空串
 */
export function summarizeHistory(history) {
  const rows = HISTORY_MODES.map(entry => (history ? history[entry.id] : null)).filter(Boolean).flatMap(entry => entry.rows || []);
  if (!rows.length) return '';
  const good = rows.filter(row => row.good).length;
  return '跟上次比：' + rows.length + ' 项变了（' + good + ' 项变好）';
}
