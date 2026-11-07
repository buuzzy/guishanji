/**
 * axis.js —— 人生进程轴（画的部分）
 * ============================================================================
 *
 * ## 画的是什么
 * --------------
 * 一条横轴 = 一辈子。上面叠了五层，从上到下：
 *
 *   ① 人生阶段   幼年 / 少年 / 入门 / 立身 / 传灯 / 晚年（节奏表的六个段）
 *   ② 境界窗口   每一境「通常在哪个年纪到」+ 停在那一境会活到几岁
 *   ③ 抉择点     每一个 ● 是一次抉择（点得开）
 *   ④ 经历       日志里的每一条经历（竖线）
 *   ⑤ 突破       哪年到的哪一境（◆）
 *
 * ## ⚠ 这一层不判断任何东西
 * ----------------------
 * 位置、颜色、分组全部由 `model.js` 算好，这里只负责画成 SVG。
 * ⇒ 画错了能一眼分清是「数据不对」还是「画错了」。
 */

import { AXIS_WIDTH, axisX } from './model.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clip = age => Math.min(age, 600);

const STAGE_CLASS = ['viz-stage-0', 'viz-stage-1', 'viz-stage-2', 'viz-stage-3', 'viz-stage-4', 'viz-stage-5'];

/** 竖着排文字（左侧标签栏用）。 */
const vtext = (x, y, text) => `<text x="${x}" y="${y}" class="viz-axis-label">${esc(text)}</text>`;

export function renderAxis(model) {
  const W = AXIS_WIDTH, H = 194;
  const parts = [];

  /* ── 底：阶段色带 ─────────────────────────────────────────────────── */
  for (const stage of model.stages) {
    const from = axisX(stage.from), to = axisX(clip(stage.to));
    const fill = STAGE_CLASS[model.stages.indexOf(stage) % STAGE_CLASS.length];
    parts.push(`<rect x="${from.toFixed(1)}" y="10" width="${Math.max(1, to - from).toFixed(1)}" height="22" class="${fill}" />`);
    parts.push(`<text x="${((from + to) / 2).toFixed(1)}" y="25" class="viz-stage-name" text-anchor="middle">${esc(stage.name)}</text>`);
  }
  parts.push(vtext(8, 25, '阶段'));

  /* ── 境界窗口 ─────────────────────────────────────────────────────── */
  for (const row of model.cadences) {
    const from = axisX(row.from), to = axisX(clip(row.to));
    parts.push(`<rect x="${from.toFixed(1)}" y="44" width="${Math.max(2, to - from).toFixed(1)}" height="16" rx="3" class="viz-realm-window" />`);
    parts.push(`<text x="${((from + to) / 2).toFixed(1)}" y="56" class="viz-realm-name" text-anchor="middle">${esc(row.name)}</text>`);
    /* 停在这一境会活到几岁 —— 只在窗口右侧画一小截。 */
    const death = axisX(clip(row.death));
    parts.push(`<line x1="${death.toFixed(1)}" y1="44" x2="${death.toFixed(1)}" y2="60" class="viz-realm-death" />`);
  }
  parts.push(vtext(8, 56, '境界'));

  /* ── 抉择轴 ───────────────────────────────────────────────────────── */
  parts.push(`<line x1="${AXIS_WIDTH - 26}" y1="84" x2="${axisX(600).toFixed(1)}" y2="84" class="viz-axis-line" />`);
  for (const point of model.points) {
    const x = axisX(point.age).toFixed(1);
    const failed = point.success === false;
    parts.push(`<g class="viz-point${failed ? ' failed' : ''}" data-step="${point.index}"><circle cx="${x}" cy="84" r="5" /><title>${esc(point.title)}（${point.age} 岁 · ${esc(point.choice)}）</title></g>`);
  }
  parts.push(vtext(8, 88, '抉择'));

  /* ── 经历标记 ─────────────────────────────────────────────────────── */
  for (const mark of model.marks) {
    const x = axisX(mark.age).toFixed(1);
    parts.push(`<line x1="${x}" y1="104" x2="${x}" y2="116" class="viz-mark viz-mark-${esc(mark.kind)}" />`);
  }
  parts.push(vtext(8, 113, '经历'));

  /* ── 突破 ─────────────────────────────────────────────────────────── */
  for (const step of model.breakthroughs) {
    const x = axisX(step.age).toFixed(1);
    parts.push(`<path d="M${x} 128 L${(Number(x) + 6).toFixed(1)} 136 L${x} 144 L${(Number(x) - 6).toFixed(1)} 136 Z" class="viz-breakthrough"><title>${esc(step.title)}（${step.age} 岁）</title></path>`);
  }
  parts.push(vtext(8, 139, '突破'));

  /* ── 寿元上限 / 终年 ───────────────────────────────────────────────
   * ⚠ 标签放在**最底下那条单独留出来的带**里 ——
   *   放顶部会压住「阶段」那一行的字（实测「寿元上限 73」正好落在「立身」上）。
   */
  if (model.lifespan) {
    const x = axisX(clip(model.lifespan)).toFixed(1);
    parts.push(`<line x1="${x}" y1="6" x2="${x}" y2="172" class="viz-lifespan" />`);
    parts.push(`<text x="${x}" y="188" class="viz-lifespan-label" text-anchor="middle">寿元上限 ${model.lifespan}</text>`);
  }
  const endX = axisX(model.endAge).toFixed(1);
  parts.push(`<line x1="${endX}" y1="6" x2="${endX}" y2="172" class="viz-end" />`);
  parts.push(`<text x="${endX}" y="188" class="viz-end-label" text-anchor="middle">终年 ${model.endAge}</text>`);

  /* ── 年龄刻度 ─────────────────────────────────────────────────────── */
  for (let age = 0; age <= 600; age += 10) {
    const x = axisX(age);
    const major = age % 50 === 0;
    parts.push(`<line x1="${x.toFixed(1)}" y1="156" x2="${x.toFixed(1)}" y2="${major ? 164 : 160}" class="viz-tick" />`);
    if (major) parts.push(`<text x="${x.toFixed(1)}" y="176" class="viz-tick-label" text-anchor="middle">${age}</text>`);
  }

  return `<svg class="viz-axis" style="width:${W}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="人生进程轴">${parts.join('')}</svg>`;
}
