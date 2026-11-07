/**
 * items.js —— 道具页（画的部分）
 * ============================================================================
 *
 * ## 显示什么
 * ------------
 *   ① 这条命**碰到过**的道具：什么时候进的行囊、什么时候被用掉、
 *      现在还在不在。
 *   ② 道具**全表**（43 件）：哪些这条命碰到了、哪些一次都没碰到。
 *
 * ## ⚠ 数字全部来自 model.js
 * ----------------------
 * 本文件不碰引擎状态，只排版 `buildItems()` 的产物。
 * 道具的「什么时候进 / 出行囊」是**采样**出来的（引擎只在日志里留
 * 「得到凝丹真解」这类文字，没有结构化字段）⇒ 见 model.js 的 buildItems。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 一个月的月数 → 「X 年 Y 个月」（引擎的 duration 口径，这里只是排版）。 */
function when(event) {
  if (!event) return '';
  const years = Math.floor(event.month / 12);
  const months = event.month % 12;
  const text = years ? years + ' 年' + (months ? ' ' + months + ' 个月' : '') : months + ' 个月';
  return text + '（' + event.age + ' 岁）';
}

/** 进出记录：按**时间顺序**列（顺序即 events 的顺序，不会倒序）。 */
function timeline(row) {
  if (row.atStart) return '<span class="viz-item-when">出生时就有</span>';
  if (!row.events.length) return '<span class="viz-item-when">—</span>';
  return row.events.map(event => {
    const label = event.kind === 'got' ? '得到' : '用掉';
    const cls = event.kind === 'got' ? 'got' : 'lost';
    return `<span class="viz-item-when ${cls}">${label} · ${esc(when(event))}</span>`;
  }).join(' <span class="viz-item-arrow">→</span> ');
}

function itemRow(row) {
  const state = row.held ? 'held' : row.seen ? 'seen' : 'never';
  return `<div class="viz-item ${state}">
    <span class="viz-item-name">${esc(row.name)}<small>${esc(row.detail)}</small></span>
    <span class="viz-item-time">${timeline(row)}</span>
  </div>`;
}

export function renderItems(items) {
  const acquired = items.acquired.length
    ? items.acquired.map(itemRow).join('')
    : '<p class="viz-hint">这条命一件道具也没碰到。</p>';
  const missed = items.missed.length
    ? items.missed.map(row => `<span class="viz-item-chip">${esc(row.name)}</span>`).join('')
    : '<p class="viz-hint">全部道具都碰到了。</p>';
  return `
    <div class="viz-item-stats">
      <span>道具全表 <b class="mono">${items.total}</b> 件</span>
      <span>这条命碰到 <b class="mono">${items.acquired.length}</b> 件</span>
      <span>现在带着 <b class="mono">${items.heldCount}</b> 件</span>
      <span>一次都没碰到 <b class="mono">${items.missed.length}</b> 件</span>
    </div>
    <h4 class="viz-sub">这条命碰到过的</h4>
    <div class="viz-items">${acquired}</div>
    <h4 class="viz-sub">一次都没碰到的</h4>
    <div class="viz-item-chips">${missed}</div>`;
}
