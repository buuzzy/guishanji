/**
 * curve.js —— 属性曲线（画的部分）
 * ============================================================================
 *
 * ## 为什么要有曲线
 * --------------
 * 人生进程轴告诉你「什么时候发生了什么」，但没说「**人变成了什么样**」。
 * 而开发者真正想看的恰恰是这个：
 *   · 这次突破把体力打没了多少？
 *   · 仁心是在哪一段涨起来的？
 *   · 灵石是从哪一年开始入不敷出的？
 *
 * ⇒ 三张图：**五维属性** / **修行进度** / **灵石**，都按年龄画。
 *
 * ## ⚠ 横轴与人生进程轴是**同一把尺子**
 * ------------------------------------
 * 两张图用同一个 `axisX()` ⇒ 上下严格对齐 ⇒
 * 「31 岁突破筑基」和「31 岁体力掉到 40」能一眼对上。
 *
 * 本层不判断任何东西：数据由 `model.js` 的 `buildCurve()` 算好，这里只画。
 */

import { AXIS_WIDTH } from './model.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/**
 * 一张折线图。
 *
 * @param {object} options
 * @param {string} options.title 标题
 * @param {Array} options.series 每条线 {key, label, points:[{x,y}]}
 * @param {number} [options.height] 图高
 * @param {Array} [options.thresholds] 横向参考线 {value, label}
 * @param {Function} [options.format] 纵轴数字怎么写
 */
function chart({ title, note, series, height = 118, thresholds = [], format = value => String(Math.round(value)) }) {
  const H = height, TOP = 10, BOTTOM = H - 16;
  const all = series.flatMap(line => line.points);
  if (!all.length) return `<div class="viz-chart"><div class="viz-chart-head"><span class="viz-chart-title">${esc(title)}</span></div><p class="viz-chart-empty">还没有数据</p></div>`;
  let min = Math.min(0, ...all.map(point => point.y));
  let max = Math.max(...all.map(point => point.y));
  if (max === min) max = min + 1;
  const y = value => BOTTOM - (value - min) / (max - min) * (BOTTOM - TOP);
  const parts = [];

  let shown = null;
  for (let index = 0; index <= 3; index++) {
    const gy = TOP + (BOTTOM - TOP) * index / 3;
    const value = max - (max - min) * index / 3;
    parts.push(`<line x1="60" y1="${gy.toFixed(1)}" x2="${AXIS_WIDTH}" y2="${gy.toFixed(1)}" class="viz-grid" />`);
    /* ⚠ 数值很小时（四舍五入后）刻度会重复（出现「1 1 0 0」）⇒ 重复的不再写。 */
    const text = format(value);
    if (text !== shown) {
      parts.push(`<text x="54" y="${(gy + 3).toFixed(1)}" class="viz-chart-y" text-anchor="end">${esc(text)}</text>`);
      shown = text;
    }
  }
  for (const line of thresholds) {
    if (line.value < min || line.value > max) continue;
    const gy = y(line.value);
    parts.push(`<line x1="60" y1="${gy.toFixed(1)}" x2="${AXIS_WIDTH}" y2="${gy.toFixed(1)}" class="viz-threshold" />`);
    parts.push(`<text x="${AXIS_WIDTH - 6}" y="${(gy - 3).toFixed(1)}" class="viz-threshold-label" text-anchor="end">${esc(line.label)}</text>`);
  }
  for (const line of series) {
    const path = line.points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${y(point.y).toFixed(1)}`).join(' ');
    parts.push(`<path d="${path}" class="viz-line viz-line-${esc(line.key)}" />`);
  }

  const legend = series.map(line => `<span class="viz-legend-item"><i class="swatch swatch-${esc(line.key)}"></i>${esc(line.label)}</span>`).join('');
  return `<div class="viz-chart">
    <div class="viz-chart-head">
      <span class="viz-chart-title">${esc(title)}</span>
      ${note ? `<span class="viz-chart-note">${esc(note)}</span>` : ''}
      <span class="viz-chart-legend">${legend}</span>
    </div>
    <svg style="width:${AXIS_WIDTH}px" viewBox="0 0 ${AXIS_WIDTH} ${H}" role="img" aria-label="${esc(title)}">${parts.join('')}</svg>
  </div>`;
}

/**
 * 三张图：五维 / 修行进度 / 灵石。
 * @param {object} model buildCurve 的产物
 */
export function renderCurves(model) {
  const attributes = chart({
    title: '五维属性',
    note: '悟性 · 胆识 · 仁心 · 体力 · 心境',
    series: model.attributes.map(attribute => ({ key: attribute.key, label: attribute.label, points: attribute.points })),
  });
  const progress = chart({
    title: '修行进度',
    note: '虚线是每一境的门槛',
    series: [{ key: 'progress', label: '进度', points: model.progress.points }],
    thresholds: model.progress.thresholds.map(row => ({ value: row.value, label: row.realm + ' 境门槛 ' + row.value })),
  });
  const stones = chart({
    title: '灵石',
    note: '身家',
    series: [{ key: 'stones', label: '灵石', points: model.stones.points }],
  });
  return `${attributes}${progress}${stones}`;
}
