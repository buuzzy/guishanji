/**
 * radar.js — 五轴能力图（悟性 / 胆识 / 仁心 / 体力 / 心境）
 * ============================================================================
 *
 * 来源
 * ----
 * 上游 `buuzzy/xianxia-life` 的 `apps/preview/life-panels.js` 里的 `abilityRadar()`
 * （那份用 SVG 画）。
 *
 * 这份移植把 SVG 换成 canvas 画：算法（角序、半径刻度、文字位置）一字不改。
 * 换 canvas 的原因只有一个 —— 小程序里放 SVG 得写成 base64 图片，
 * 而这个图要**跟着状态实时变**，画布更合适。
 */
'use strict';

var KEYS = ['insight', 'courage', 'empathy', 'health', 'mind'];
var LABELS = {
  insight: '悟性', courage: '胆识', empathy: '仁心', health: '体力', mind: '心境',
};

var W = 240;
var H = 226;
var CX = 120;
var CY = 112;
var MAX_R = 76;
var LABEL_R = 99;

/**
 * 字号与字体：照上游网页端 **实际渲染出来** 的样子。
 *
 * 上游用的是 SVG（`viewBox 0 0 240 226`）+ CSS：
 *   `.radar-label{font-size:10px}` / `.radar-value{font-size:9px;font-family:monospace}`
 *   `.ability-radar{max-width:290px}` ⇒ SVG 从 240 单位拉到 290px
 * ⇒ 屏幕上的实际字号 = 10 × 290/240 ≈ **12.1px**、9 × 290/240 ≈ **10.9px**。
 *
 * ⚠ **canvas 拿不到 CSS 变量**（小程序端也是）⇒ 字体名只能写死，
 *   但要与 `miniprogram/app.wxss` 的 `--f-body` / `--f-mono` 同源
 *   （门禁 `xianxiastyle` 断言这件事）。
 *
 * ⚠ 之前这里写死的是 `'13px sans-serif'` / `'11px sans-serif'`：
 *   ① 字号偏大（画布 240 单位在面板里显示成 324px ⇒ 13 单位 = 17.6px）；
 *   ② `sans-serif` 是系统默认字体（iOS Helvetica / Android Roboto），
 *      与页面其它文字（PingFang SC）不一致 ⇒ 用户 2026-11-04 真机反馈。
 */
var DISPLAY_W_DEFAULT = 290;
var LABEL_CSS_PX = 12.1;
var VALUE_CSS_PX = 10.9;
var FONT_LABEL = '"PingFang SC","Noto Sans SC","Noto Sans CJK SC","Microsoft YaHei",system-ui,sans-serif';
var FONT_VALUE = '"IBM Plex Mono","PingFang SC","Noto Sans SC","Microsoft YaHei",ui-monospace,Menlo,monospace';

/** 第 i 根轴在半径 r 处的坐标（角度从正上方开始，顺时针）。 */
function point(i, r) {
  var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
}

/**
 * 画五轴图。
 * @param {object} c 画布上下文
 * @param {object} player 玩家状态（要读 insight/courage/empathy/health/mind）
 * @param {object} [style] {grid, shape, label, value, font}
 */
function drawRadar(c, player, style) {
  var s = style || {};
  var grid = s.grid || 'rgba(80,110,105,0.22)';
  var shape = s.shape || '#0f6e68';
  var labelColor = s.label || '#3d4a4d';
  var valueColor = s.value || '#5f6e72';

  c.clearRect(0, 0, W, H);

  var radii = [19, 38, 57, 76];
  for (var r = 0; r < radii.length; r++) {
    var pts = [];
    for (var i = 0; i < 5; i++) pts.push(point(i, radii[r]).join(','));
    c.beginPath();
    for (var k = 0; k < 5; k++) {
      var p = point(k, radii[r]);
      if (k === 0) c.moveTo(p[0], p[1]);
      else c.lineTo(p[0], p[1]);
    }
    c.closePath();
    c.strokeStyle = grid;
    c.lineWidth = 1;
    c.stroke();
  }

  for (var a = 0; a < 5; a++) {
    var spoke = point(a, MAX_R);
    c.beginPath();
    c.moveTo(CX, CY);
    c.lineTo(spoke[0], spoke[1]);
    c.strokeStyle = grid;
    c.stroke();
  }

  var values = [];
  for (var v = 0; v < 5; v++) {
    var raw = Number(player[KEYS[v]]);
    if (!isFinite(raw)) raw = 0;
    values.push(Math.max(0, Math.min(100, raw)));
  }

  c.beginPath();
  for (var q = 0; q < 5; q++) {
    var pt = point(q, values[q] * 0.76);
    if (q === 0) c.moveTo(pt[0], pt[1]);
    else c.lineTo(pt[0], pt[1]);
  }
  c.closePath();
  c.fillStyle = s.fill || 'rgba(15,110,104,0.18)';
  c.fill();
  c.strokeStyle = shape;
  c.lineWidth = 2;
  c.stroke();

  c.textAlign = 'center';
  /* 字号换算：目标 CSS px（上游渲染值）→ 画布单位（画布 240 单位 = 实际显示宽）。 */
  var displayWidth = s.width || DISPLAY_W_DEFAULT;
  var unit = W / displayWidth;
  var labelSize = (s.labelPx || LABEL_CSS_PX) * unit;
  var valueSize = (s.valuePx || VALUE_CSS_PX) * unit;
  for (var t = 0; t < 5; t++) {
    var lp = point(t, LABEL_R);
    c.fillStyle = labelColor;
    c.font = labelSize.toFixed(2) + 'px ' + (s.labelFont || FONT_LABEL);
    c.fillText(LABELS[KEYS[t]], lp[0], lp[1]);
    c.fillStyle = valueColor;
    c.font = valueSize.toFixed(2) + 'px ' + (s.valueFont || FONT_VALUE);
    c.fillText(values[t].toFixed(1), lp[0], lp[1] + 13);
  }
}

module.exports = {
  KEYS: KEYS,
  LABELS: LABELS,
  W: W,
  H: H,
  point: point,
  drawRadar: drawRadar,
  DISPLAY_W_DEFAULT: DISPLAY_W_DEFAULT,
  LABEL_CSS_PX: LABEL_CSS_PX,
  VALUE_CSS_PX: VALUE_CSS_PX,
  FONT_LABEL: FONT_LABEL,
  FONT_VALUE: FONT_VALUE,
};
