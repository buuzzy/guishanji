/**
 * guilloche.js — 出生登记卡上的「雕版底纹」（逐字移植自官方）
 * ============================================================================
 *
 * 来源：`miniprogram/idcard.js`（官方「身份证卡片 / 出生登记卡」那一份里的
 * `guilloche()` 与 `drawGuilloche()`）。官方原样是**内联 SVG**，
 * 微信不能渲染内联 SVG ⇒ 官方那边已经把同一条正弦公式搬到 canvas 上画。
 *
 * 这份是**逐字移植**（公式、取整、描边宽度都一样），
 * 放在修仙分包里 ⇒ 修仙不依赖主包的官方模块（隔离要求）。
 *
 * ⚠ 「逐字移植」这句话有门禁兜着：
 *   `scripts/test-xianxia-style.mjs` 会把本文件里的两个函数源码
 *   与官方 `miniprogram/idcard.js` 里的同名函数**逐字比对**。
 */
'use strict';

/** 官方 idcard.js 的 guilloche(w, h)：14 条正弦曲线。 */
function guilloche(w, h) {
  var paths = [];
  for (var i = 0; i < 14; i++) {
    var ph = i * 0.45;
    var amp = h * (0.16 + 0.012 * i);
    var lam = w / (2.2 + i * 0.07);
    var pts = [];
    for (var x = 0; x <= w; x += 6) {
      var y = h / 2 + amp * Math.sin(2 * Math.PI * x / lam + ph) * Math.cos(Math.PI * x / w * 1.3 + i * 0.2);
      pts.push(x, parseFloat(y.toFixed(1)));
    }
    paths.push(pts);
  }
  return paths;
}

/** 官方 idcard.js 的 drawGuilloche(ctx, w, h, color, tw, th)。 */
function drawGuilloche(ctx, w, h, color, tw, th) {
  var sx = tw == null || !w ? 1 : tw / w;
  var sy = th == null || !h ? 1 : th / h;
  ctx.save();
  ctx.strokeStyle = color || 'rgba(15,110,104,.09)';
  ctx.lineWidth = 0.7;
  var paths = guilloche(w, h);
  for (var k = 0; k < paths.length; k++) {
    var pts = paths[k];
    ctx.beginPath();
    ctx.moveTo(pts[0] * sx, pts[1] * sy);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * sx, pts[i + 1] * sy);
    ctx.stroke();
  }
  ctx.restore();
}

module.exports = {guilloche: guilloche, drawGuilloche: drawGuilloche};
