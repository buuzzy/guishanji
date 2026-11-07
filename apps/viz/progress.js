/**
 * progress.js —— 角色进度（画的部分）
 * ============================================================================
 *
 * ## 回答什么问题
 * ------------------
 * 「这批命是怎么往上走的？」——
 *   · **谁卡在哪一境**（到达的命数逐级递减 ⇒ 掉在哪一环看得出来）；
 *   · **每一境待了多久**（待 65 年 ⇒ 那段人生要么没内容，要么卡住了）；
 *   · **突破卡隔了多久**（与「内容完备度盘点」同一口径、同一个目标值）。
 *
 * ⚠ 本文件只排版：所有数字都来自 `model.js` 的 `buildProgress()`
 *   （那里读的是引擎写的日志与采样），这里一个数都不自己算。
 */

import { md } from './md.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 占比条：走完这一境的人占多少。 */
function funnel(share) {
  const width = Math.max(0, Math.min(100, share * 100));
  return `<span class="viz-prog-bar"><i style="width:${width.toFixed(1)}%"></i></span>`;
}

/** 各境推进：到达多少人、什么时候到的、待了多久。 */
function realmTable(progress) {
  const rows = progress.realms.map(row => `<div class="viz-prog-row${row.reached === 0 ? ' empty' : ''}">
      <span class="viz-prog-name">${esc(row.name)}</span>
      <span class="viz-prog-count mono">${row.reached}/${progress.finished}</span>
      <span class="viz-prog-share">${funnel(row.share)}<small class="mono">${(row.share * 100).toFixed(0)}%</small></span>
      <span class="viz-prog-cell mono">${row.medianAge === null ? '—' : row.medianAge + ' 岁'}</span>
      <span class="viz-prog-cell mono">${row.dwellMedian === null ? '—' : row.dwellMedian + ' 年'}</span>
      <span class="viz-prog-cell mono">${row.dwellMax === null ? '—' : row.dwellMax + ' 年'}</span>
    </div>`).join('');
  return `
    <div class="viz-prog-head">
      <span class="viz-prog-name">境界</span>
      <span class="viz-prog-count">到达的命</span>
      <span class="viz-prog-share">占比</span>
      <span class="viz-prog-cell">到达年龄中位</span>
      <span class="viz-prog-cell">在这一境待了几年（中位）</span>
      <span class="viz-prog-cell">最长那条</span>
    </div>
    <div class="viz-prog-rows">${rows}</div>`;
}

/** 突破间隔：与「内容完备度盘点」同一口径、同一目标值。 */
function spanTable(progress) {
  if (!progress.spans.length) return '<p class="viz-hint">这批命里没有同一境界段的突破卡间隔可算。</p>';
  const rows = progress.spans.map(row => `<div class="viz-prog-row${row.ok ? '' : ' below'}">
      <span class="viz-prog-name">${esc(row.name)}</span>
      <span class="viz-prog-cell mono">${row.median === null ? '—' : row.median + ' 年'}</span>
      <span class="viz-prog-cell mono">≤ ${row.target} 年</span>
      <span class="viz-prog-cell">${row.ok ? '达标' : '<b class="below">未达标</b>'}</span>
      <span class="viz-prog-cell mono">${row.count} 条命</span>
    </div>`).join('');
  const bad = progress.spans.filter(row => !row.ok);
  const note = bad.length
    ? `<p class="viz-hint">⚠ <b>${esc(bad.map(row => row.name).join('、'))}</b> ${md('这几段的突破卡间隔超过目标 ' + progress.spanTarget + ' 年 ⇒ 已在「内容完备度盘点」的缺口台账里登记为**已知缺口**（不许自己硬改，那是行为变更）。')}</p>`
    : `<p class="viz-hint">各段突破间隔都在目标 ${progress.spanTarget} 年以内。</p>`;
  return `
    <div class="viz-prog-head t-span">
      <span class="viz-prog-name">境界段</span>
      <span class="viz-prog-cell">间隔中位</span>
      <span class="viz-prog-cell">目标</span>
      <span class="viz-prog-cell">判定</span>
      <span class="viz-prog-cell">样本</span>
    </div>
    <div class="viz-prog-rows">${rows}</div>
    ${note}`;
}

/**
 * 画「角色进度」。
 * @param {object} progress `model.js::buildProgress()` 的结果
 */
export function renderProgress(progress) {
  if (!progress) return '<p class="viz-hint">还没跑过批量实测 ⇒ 没有进度可看。</p>';
  const empty = progress.realms.filter(row => row.reached === 0).map(row => row.name);
  const stuck = empty.length
    ? `<p class="viz-hint">⚠ <b>${esc(empty.join('、'))}</b>${md('：这批命里**一条都没到过** ⇒ 这段人生要么没人走，要么走不到（要看随机探索那一侧的结果再定）。')}</p>`
    : '';
  return `
    <h5 class="viz-sub-sub">各境推进<small>谁卡在哪一境</small></h5>
    ${realmTable(progress)}
    ${stuck}
    <p class="viz-hint">${md('「在这一境待了几年」是**每条命先算差值再取中位**，不是「两个中位数相减」；')}
      凡人一辈子（不修行的道途）不会出现在上面任何一境里。</p>
    <h5 class="viz-sub-sub">突破间隔<small>同一境界段的突破卡隔了多久</small></h5>
    ${spanTable(progress)}`;
}
