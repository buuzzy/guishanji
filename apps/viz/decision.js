/**
 * decision.js —— 决策框（画的部分）
 * ============================================================================
 *
 * ## 画的是什么
 * --------------
 * 一张卡的完整样子：正文 + 所有选项 + 每个选项的**代价、把握值、需要多久**，
 * 以及**为什么点不了**（那些「还差 4 灵石」「没有药师行囊」）。
 *
 * 这是给开发者看的那一面 —— 玩家看到的是按钮，
 * 这里要看到的是「这个选项此刻为什么长这样」。
 *
 * ## 两种模式
 * ----------
 *   · 待决（pending）：当前等着点的卡，选项**可以点**，点了就走一步。
 *   · 回看（step）   ：轴上翻出来的旧抉择，只读 —— 当时给了什么、选了什么、成没成。
 *
 * ⚠ 选项的数字全部来自引擎的 `options()`，本文件不重算。
 */

import { ITEMS } from '../../content/adventure.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 代价写成人话。 */
function costText(cost) {
  if (!cost) return '';
  const parts = [];
  if (cost.stones) parts.push(cost.stones + ' 灵石');
  if (cost.debt) parts.push('欠 ' + cost.debt + ' 灵石');
  for (const item of cost.items || []) parts.push(esc(ITEMS[item]?.name ?? item));
  return parts.join(' · ');
}

function optionMarkup(option, { pickable }) {
  const cost = costText(option.cost);
  const chance = option.chance === null ? '' : (option.chance + '% 把握');
  const months = option.months ? option.months + ' 个月' : '';
  const meta = [cost, chance, months].filter(Boolean).map(text => `<span class="viz-opt-meta">${esc(text)}</span>`).join('');
  const reasons = option.reasons?.length
    ? `<ul class="viz-opt-reasons">${option.reasons.map(reason => `<li>${esc(reason)}</li>`).join('')}</ul>`
    : '';
  const inner = `<span class="viz-opt-label">${esc(option.label)}</span>${option.hint ? `<span class="viz-opt-hint">${esc(option.hint)}</span>` : ''}${meta ? `<span class="viz-opt-metas">${meta}</span>` : ''}${reasons}`;
  if (!pickable) return `<li class="viz-opt${option.enabled ? '' : ' off'}">${inner}</li>`;
  return `<li class="viz-opt${option.enabled ? '' : ' off'}"><button type="button" class="viz-opt-btn" data-pick="${esc(option.id)}"${option.enabled ? '' : ' disabled'}>${inner}</button></li>`;
}

export function renderDecision(view, { mode, auto = false }) {
  /* 命走完了 ⇒ 这一栏显示终章（别空着 —— 它是屏幕最宽的一栏）。 */
  if (mode === 'ended') {
    const stats = view.stats || [];
    return `<div class="viz-ending">
      <span class="viz-ending-label">终章</span>
      <h3>${esc(view.title)}</h3>
      <p class="viz-ending-text">${esc(view.text)}</p>
      ${stats.length ? `<div class="viz-ending-stats">${stats.map(row => `<div class="viz-ending-stat"><b>${esc(row.value)}</b><span>${esc(row.label)}</span></div>`).join('')}</div>` : ''}
      <p class="viz-hint">这条命走完了。换颗种子、换个道途再走一条 —— 点左上「重来」，或点轴上的抉择点回看中途的某一步。</p>
    </div>`;
  }
  if (!view) {
    return '<p class="viz-empty">眼下没有待决的事。点「跑完一生」，或自己在下面一个选项一个选项地选。</p>';
  }
  const head = `
    <div class="viz-dec-head">
      <span class="viz-dec-age">${view.age} 岁</span>
      <span class="viz-dec-event mono">${esc(view.event)}</span>
      <h3>${esc(view.title)}</h3>
    </div>
    <p class="viz-dec-text">${esc(view.text)}</p>`;

  if (mode === 'pending') {
    const list = view.offered.map(option => optionMarkup(option, { pickable: true })).join('');
    return `${head}<ul class="viz-opts">${list}</ul>`;
  }

  const list = view.offered.map(option => optionMarkup(option, { pickable: false })).join('');
  const picked = view.offered.find(option => option.id === view.picked);
  const result = view.result || {};
  const verdict = result.success === true ? '<b class="ok">成了</b>' : result.success === false ? '<b class="bad">没成</b>' : '';
  const deferred = result.deferred ? '<span class="viz-opt-meta">（这是长线，结果后来才结算）</span>' : '';
  const changes = (result.changes || []).length ? `<p class="viz-dec-changes">变化：${result.changes.map(esc).join(' · ')}</p>` : '';
  /* ⚠ 自动播放时补一句：这一下**不是人点的**。 */
  const autoNote = auto
    ? '<p class="viz-hint viz-dec-auto">自动进行中：这一下是系统自己选的（按偏好或随机）。点「停下」可以随时接手。</p>'
    : '';
  return `${head}
    <ul class="viz-opts">${list}</ul>
    <div class="viz-dec-result">
      <p class="viz-dec-picked">当时选了：<b>${esc(picked?.label ?? view.picked)}</b> ${verdict}${deferred}</p>
      ${result.body ? `<p class="viz-dec-body">${esc(result.body)}</p>` : ''}
      ${changes}
    </div>
    ${autoNote}`;
}
