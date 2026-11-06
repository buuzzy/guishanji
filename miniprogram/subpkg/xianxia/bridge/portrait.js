/**
 * portrait.js — 像素肖像（画到 canvas）
 * ============================================================================
 *
 * 画的是**上游修仙网页端**那个肖像（`apps/preview/life-panels.js` 的 `portrait(s)`）：
 * 一张 24×30 的像素小人，站在 `#cbd5d1` 的地面上。
 *
 * 上游用 SVG 画，小程序画不了内联 SVG ⇒ 同样的精灵、同样的配色、
 * 同样的坐标，逐个像素用 `fillRect` 画出来（`pages/past/past.js` 的陈列架小人
 * 与人生页身份卡的肖像都用这一份）。
 *
 * ⚠ 像素表来自 `runtime/pixel-style.js`（上游 `apps/preview/pixel-style.js` 的快照）。
 */
'use strict';

var PIXEL_STYLE = require('../runtime/pixel-style.js').PIXEL_STYLE;

/** 上游那套配色（`life-panels.js:16` 的 colors）。 */
var PORTRAIT_COLORS = {
  H: '#32383b', S: '#d9ac82', E: '#32383b', c: '#b48165', m: '#a56957',
  B: '#708d88', b: '#49615f', P: '#566c6b', F: '#32383b', D: '#708d88', d: '#49615f',
};
/** 地面色（上游 SVG 里那层 `#cbd5d1` 的底座）。 */
var GROUND_COLOR = '#cbd5d1';
/** 百岁以上的头发变白（上游：`age>100?'#aaa797':'#32383b'`）。 */
var WHITE_HAIR = '#aaa797';

/** 年龄段（上游：`age<3 baby / <7 small / <13 child / <18 teen / 其余 adult`）。 */
function stageOf(age) {
  if (age < 3) return 'baby';
  if (age < 7) return 'small';
  if (age < 13) return 'child';
  if (age < 18) return 'teen';
  return 'adult';
}

/**
 * 画一个小人。
 *
 * ⚠ 2026-11-05 修复（用户真机反馈「角色卡片里的头像被过度缩小」）：
 *   之前的写法把坐标空间按 `scale = 4` 放大成 96×120，**却仍按 1 单位画像素**
 *   ⇒ 小人只有应有尺寸的 1/4，挤在画布左上角，底座也只盖住 1/4 宽。
 *   现在改成与上游 SVG **完全同构**：
 *     · 逻辑坐标系固定 24×30（上游 `viewBox="0 0 24 30"`）；
 *     · 缩放 k = min(width/24, height/30)；
 *     · 居中偏移（对齐 SVG 的 preserveAspectRatio="xMidYMid meet"）；
 *     · 每个像素 1×1 单位：x = z + 7、y = 25 - sprite.length + r；
 *     · 底座 0,22,24,8（上游 `<path d="M0 22h24v8H0z">`）。
 *   改完小人生命页身份卡与往期人生陈列架**同时恢复正常大小**。
 *
 * @param {object} canvas canvas 节点（type="2d"）
 * @param {number} width 显示宽（CSS px）
 * @param {number} height 显示高（CSS px）
 * @param {string} stage 年龄段
 * @param {string} sex 'M' / 'F'
 * @param {number} dpr 像素比
 * @param {number} age 年龄（决定头发颜色）
 */
function drawFigure(canvas, width, height, stage, sex, dpr, age) {
  try {
    var people = PIXEL_STYLE.PEOPLE[sex || 'M'];
    var sprite = people[stage] || people.adult;
    var w = 24;
    var h = 30;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    var k = Math.min(width / w, height / h);
    /* SVG 的 xMidYMid meet：短边居中，两边留白。 */
    var ox = (width - w * k) / 2;
    var oy = (height - h * k) / 2;
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy);
    /* 底座（上游 SVG 里那层 `#cbd5d1` 的地面）。 */
    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, 22, 24, 8);
    for (var r = 0; r < sprite.length; r++) {
      for (var z = 0; z < sprite[r].length; z++) {
        var key = sprite[r][z];
        var color = PORTRAIT_COLORS[key];
        if (key === 'H' && age > 100) color = WHITE_HAIR;
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(z + 7, 25 - sprite.length + r, 1, 1);
      }
    }
  } catch (error) {
    /* 小人画不出来不影响内容。 */
  }
}

module.exports = {
  PORTRAIT_COLORS: PORTRAIT_COLORS,
  GROUND_COLOR: GROUND_COLOR,
  stageOf: stageOf,
  drawFigure: drawFigure,
};
