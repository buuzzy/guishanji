/**
 * journal.js —— 流水页（画的部分）
 * ============================================================================
 *
 * ## 显示什么
 * ------------
 *   ① 一生的日志正文（按类型过滤）—— 引擎记的每一条经历。
 *   ② 每一次抉择的表：哪张卡、选了什么、成没成、把握多少。
 *   ③ 「跑一批」的入口与覆盖度统计（见 batch.js）。
 *
 * ⚠ 日志与抉择都是引擎写的 ⇒ 本文件只排版，不加工。
 */

import { renderBatch } from './batch.js';
import { renderCoverage, renderComparison, renderStageCoverage } from './coverage.js';
import { renderProgress } from './progress.js';
import { renderFindings } from './findings.js';
import { renderHistory } from './history.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const KIND_LABELS = {
  birth: '出生', life: '日子', story: '故事', choice: '抉择', institution: '宗门',
  plan: '打算', breakthrough: '突破', cultivation: '修行', people: '人际',
  world: '天下', ending: '终章', years: '年月', loss: '失去', interrupt: '打断',
};

function kindLabel(kind) {
  return KIND_LABELS[kind] || kind;
}

/** 日志条目。 */
function entry(row) {
  const changes = row.changes.length ? `<span class="viz-log-changes">${row.changes.map(esc).join(' · ')}</span>` : '';
  return `<div class="viz-log kind-${esc(row.kind)}">
    <span class="viz-log-when mono">${row.age} 岁</span>
    <span class="viz-log-title">${esc(row.title)}<small>${esc(kindLabel(row.kind))}${row.location ? ' · ' + esc(row.location) : ''}</small></span>
    <span class="viz-log-body">${esc(row.body)}${changes}</span>
  </div>`;
}

/** 抉择表。 */
function decisionTable(decisions) {
  if (!decisions.length) return '<p class="viz-hint">还没有做过任何抉择。</p>';
  const rows = decisions.map(row => {
    const result = row.success === false ? '<span class="viz-dec-no">没成</span>'
      : row.success === true ? '<span class="viz-dec-yes">成了</span>' : '—';
    const chance = row.chance === null ? '—' : row.chance + '%';
    return `<div class="viz-dec">
      <span class="viz-dec-age mono">${row.age} 岁</span>
      <span class="viz-dec-event">${esc(row.event)}<small>选：${esc(row.choice)}</small></span>
      <span class="viz-dec-chance mono">${chance}</span>
      <span class="viz-dec-result">${result}</span>
    </div>`;
  }).join('');
  return `<div class="viz-decs">${rows}</div>`;
}

export function renderJournal(view, batch, coverage, compare, stageCoverage, stageCoverageAlt, progress, findings, history) {
  const filters = view.kinds.map(kind => {
    const count = view.journal.filter(row => row.kind === kind).length;
    return `<span class="viz-log-filter kind-${esc(kind)}">${esc(kindLabel(kind))} <b class="mono">${count}</b></span>`;
  }).join('');
  const entries = view.journal.map(entry).join('');
  /* ⚠ 批量实测与内容覆盖放在**最上面** ——
   *   流水页下面还有 159 条日志与 39 次抉择，覆盖表埋在最底下等于没有。
   */
  const batchBlock = batch
    ? `<h4 class="viz-sub">批量实测<small>${batch.lives} 条命</small></h4>${renderBatch(batch)}`
    : '<h4 class="viz-sub">批量实测</h4><p class="viz-hint">还没跑过批量实测 ⇒ 点右上角「跑一批」（跑几十条命，看结局分布、道具命中、各境到达年龄）。</p>';
  /* ⚠ 两种玩法都跑过 ⇒ 并排比放在**最前面**（那才是跑批要看的东西），
   *   两边各自的统计与覆盖也都摆出来，别只给一个平均数。 */
  const compareBlock = compare
    ? `<h4 class="viz-sub">两种玩法并排比<small>${esc(compare.left.label)} vs ${esc(compare.right.label)}</small></h4>${renderComparison(compare)}`
    : '';
  const altBatchBlock = compare
    ? `<h4 class="viz-sub">批量实测<small>${esc(compare.right.label)} · ${compare.right.batch.lives} 条命</small></h4>${renderBatch(compare.right.batch)}`
    : '';
  const coverageBlock = batch
    ? `<h4 class="viz-sub">内容覆盖<small>${compare ? esc(compare.left.label) + '这批命' : '这批命'}碰到了多少内容</small></h4>${renderCoverage(coverage)}`
    : '';
  const altCoverageBlock = compare
    ? `<h4 class="viz-sub">内容覆盖<small>${esc(compare.right.label)}这批命碰到了多少内容</small></h4>${renderCoverage(compare.right.coverage)}`
    : '';
  /* ⚠ 按阶段 / 境界：回答「不同阶段、境界的那段人生有没有内容可看」。 */
  const stageBlock = stageCoverage
    ? `<h4 class="viz-sub">按阶段 / 境界看内容<small>这段人生有没有内容可看</small></h4>${renderStageCoverage(stageCoverage)}`
    : '';
  const altStageBlock = stageCoverageAlt
    ? `<h4 class="viz-sub">按阶段 / 境界看内容<small>${esc(compare ? compare.right.label : '另一批命')}</small></h4>${renderStageCoverage(stageCoverageAlt)}`
    : '';
  /* ⚠ 问题清单放在**最上面** —— 跑完批第一眼要看到的是「有什么问题」，
   *   下面那些表都是它的证据。 */
  const findingsBlock = findings && findings.length
    ? `<h4 class="viz-sub">问题清单<small>这批命查出了什么</small></h4>${renderFindings(findings)}`
    : '';
  /* ⚠ 「与上一次跑批比」放在问题清单**下面** ——
   *   先看「现在有什么问题」，再看「我刚才那笔改动有没有用」。 */
  const historyBlock = history && (history.policy || history.random)
    ? `<h4 class="viz-sub">与上一次跑批比<small>改完内容再跑，看变化</small></h4>${renderHistory(history)}`
    : '';
  /* ⚠ 角色进度：这批命怎么往上走（谁卡在哪一境、每境待了多久）。 */
  const progressBlock = progress
    ? `<h4 class="viz-sub">角色进度<small>这批命怎么往上走</small></h4>${renderProgress(progress)}`
    : '';
  return `
    <div class="viz-log-filters">${filters}</div>
    ${findingsBlock}
    ${historyBlock}
    ${compareBlock}
    ${batchBlock}
    ${altBatchBlock}
    ${progressBlock}
    ${coverageBlock}
    ${altCoverageBlock}
    ${stageBlock}
    ${altStageBlock}
    <h4 class="viz-sub">抉择流水<small>${view.decisions.length} 次</small></h4>
    ${decisionTable(view.decisions)}
    <h4 class="viz-sub">一生的正文<small>${view.journal.length} 条</small></h4>
    <div class="viz-logs">${entries}</div>`;
}
