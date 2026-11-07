/**
 * findings.js —— 问题清单（画的部分）
 * ============================================================================
 *
 * ## 回答什么问题
 * ------------------
 * 「跑完这一批，**有什么问题**？」——
 * 下面那一大堆表（内容覆盖 / 角色进度 / 按阶段境界）里散着各种缺口，
 * 这里把它们**收成一张清单**：几处、是哪些、在哪看、这到底说明什么。
 *
 * ⚠ 本文件只排版：数字与文字都来自 `model.js` 的 `buildFindings()`，
 *   这里一个数都不自己算。
 *
 * ⚠ 每条都带着「⚠」提示 —— 因为「这批命没遇到」**不等于**「内容有问题」
 *   （可能是这批命没走到那儿）。把话说准，才不会照着去修不存在的问题。
 */

import { md } from './md.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/**
 * 画问题清单。
 * @param {object[]} findings `model.js::buildFindings()` 的结果
 */
export function renderFindings(findings) {
  if (!findings || !findings.length) {
    return '<p class="viz-hint">这批命没查出问题来（各项都在底线之内）。</p>';
  }
  const warn = findings.filter(row => row.severity === 'warn');
  /* ⚠ 每一格都带 `data-label` —— 窄屏改成一行一格时，标签要跟着出来。 */
  const rows = findings.map(row => `<div class="viz-find${row.severity === 'warn' ? ' warn' : ''}">
      <span class="viz-find-title" data-label="问题">${esc(row.title)}</span>
      <span class="viz-find-count mono" data-label="几处">${row.count} ${esc(row.unit)}</span>
      <span class="viz-find-names" data-label="是哪些">${row.names.length ? esc(row.names.join('、')) + (row.names.length >= 8 ? ' …' : '') : '—'}</span>
      <span class="viz-find-where" data-label="在哪看">${esc(row.where)}</span>
      <span class="viz-find-note" data-label="这说明什么">${md(row.note)}</span>
    </div>`).join('');
  const head = `<div class="viz-find-head">
      <span class="viz-find-title">问题</span>
      <span class="viz-find-count">几处</span>
      <span class="viz-find-names">是哪些</span>
      <span class="viz-find-where">在哪看</span>
      <span class="viz-find-note">这说明什么</span>
    </div>`;
  const summary = warn.length
    ? `查出 <b class="mono">${warn.length}</b> 类要查的问题${findings.length > warn.length ? '，另有 ' + (findings.length - warn.length) + ' 条提醒' : ''}。`
    : `只有 <b class="mono">${findings.length}</b> 条提醒，没有要查的问题。`;
  return `
    <p class="viz-find-summary">${summary}</p>
    ${head}
    <div class="viz-find-list">${rows}</div>`;
}
