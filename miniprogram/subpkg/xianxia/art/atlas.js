/**
 * atlas.js — 点阵大陆地图（移植自 HTML 试玩端）
 * ============================================================================
 *
 * 来源
 * ----
 * 上游 `buuzzy/xianxia-life` 的 `apps/preview/continent-atlas.js`
 * （锁定快照在 `vendor/xianxia-r12-art/apps/preview/`）。
 * 那份直接往 `<canvas>` 上画，依赖 `root.clientWidth` 算字号。
 *
 * 这份移植只改两处，**算法一个字不改**：
 *   ① 不再从 DOM 拿画布，改成「传进来一个画布上下文」；
 *   ② `root.clientWidth` 改成参数 `clientWidth`（由小程序组件量出来传进来）。
 *
 * 地图尺寸：960×624（上游同款）。点阵来自 GEOGRAPHY 的轮廓多边形，
 * **不编造任何人口或势力**（上游注释原话：the fine dot field follows the
 * authorized world map; no population is invented）。
 */
'use strict';

var engine = require('../runtime/engine.js');

var K = 12;
var W = 960;
var H = 624;

/* 上游原样：两块大陆轮廓的补点。 */
var extras = {
  tide: [[[47, 21], [50, 19], [53, 22], [51, 25], [48, 26], [46, 24]]],
  sky: [[[72, 36], [75, 33], [78, 36], [76, 40], [72, 40]], [[56, 40], [59, 37], [62, 40], [60, 44], [57, 43]]],
};

function inside(x, y, points) {
  var yes = false;
  for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
    var a = points[i][0], b = points[i][1];
    var c = points[j][0], d = points[j][1];
    if ((b > y) !== (d > y) && x < ((c - a) * (y - b)) / (d - b) + a) yes = !yes;
  }
  return yes;
}

function smooth(points) {
  var out = [];
  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    var prev = points[(i + points.length - 1) % points.length];
    var next = points[(i + 1) % points.length];
    var a = [(prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2];
    var b = [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2];
    for (var k = 0; k < 5; k++) {
      var t = k / 5;
      out.push([
        Math.pow(1 - t, 2) * a[0] + 2 * (1 - t) * t * p[0] + t * t * b[0],
        Math.pow(1 - t, 2) * a[1] + 2 * (1 - t) * t * p[1] + t * t * b[1],
      ]);
    }
  }
  return out;
}

/** 点阵（每块大陆一份）。**只算一次**，之后复用。 */
var dotsCache = null;

function dots() {
  if (dotsCache) return dotsCache;
  var geography = engine.GEOGRAPHY || [];
  var masks = geography.map(function (g) {
    var extra = extras[g.id] || [];
    var raw = [g.outline].concat(extra);
    return {id: g.id, polys: raw.map(smooth)};
  });
  var result = masks.map(function (g) { return {id: g.id, points: []}; });
  for (var i = 0; i < masks.length; i++) {
    for (var y = 2; y < 51; y += 0.5) {
      for (var x = 1; x < 79; x += 0.5) {
        var hit = false;
        for (var q = 0; q < masks[i].polys.length; q++) {
          if (inside(x, y, masks[i].polys[q])) { hit = true; break; }
        }
        if (hit) result[i].points.push([x * K, y * K]);
      }
    }
  }
  dotsCache = result;
  return result;
}

/**
 * 画地图。
 * @param {object} c 画布上下文
 * @param {object} s  人生状态（可为空）
 * @param {string} theme 'light' | 'dark'
 * @param {number} clientWidth 画布在屏幕上的显示宽度（CSS 像素）—— 上游用它算字号
 */
function drawMap(c, s, theme, clientWidth) {
  var dark = theme === 'dark';
  var cultivation = s && s.life ? s.life.cultivation : null;
  var current = s ? engine.currentContinent(s) : null;
  var closed = (cultivation && cultivation.closed) || [];
  var visited = (cultivation && cultivation.visited) || [];
  var geography = engine.GEOGRAPHY || [];

  var p = dark
    ? {land: '#8a9a96', hot: '#4cc0af', route: '#a3b2af', ink: '#cbd5d1', accent: '#e2678a'}
    : {land: '#5f6e72', hot: '#0f6e68', route: '#4a5a61', ink: '#5f6e72', accent: '#8c1d3c'};

  c.clearRect(0, 0, W, H);

  var all = dots();
  for (var i = 0; i < all.length; i++) {
    var g = all[i];
    var hot = g.id === current || visited.indexOf(g.id) >= 0;
    c.fillStyle = hot ? p.hot : p.land;
    c.globalAlpha = hot ? 0.52 : 0.25;
    for (var j = 0; j < g.points.length; j++) {
      c.beginPath();
      c.arc(g.points[j][0], g.points[j][1], 1.55, 0, Math.PI * 2);
      c.fill();
    }
  }

  c.globalAlpha = 1;
  var edges = {};
  var walked = {};
  for (var gi = 0; gi < geography.length; gi++) {
    var conns = geography[gi].connections || [];
    for (var ci = 0; ci < conns.length; ci++) {
      edges[[geography[gi].id, conns[ci]].sort().join('-')] = true;
    }
  }
  var routes = (cultivation && cultivation.routes) || [];
  for (var ri = 0; ri < routes.length; ri++) {
    for (var rj = 1; rj < routes[ri].length; rj++) {
      walked[[routes[ri][rj - 1], routes[ri][rj]].sort().join('-')] = true;
    }
  }

  var edgeKeys = Object.keys(edges);
  for (var ei = 0; ei < edgeKeys.length; ei++) {
    var pair = edgeKeys[ei].split('-');
    var A = findPin(geography, pair[0]);
    var B = findPin(geography, pair[1]);
    if (!A || !B) continue;
    var done = !!walked[edgeKeys[ei]];
    var blocked = closed.indexOf(edgeKeys[ei]) >= 0;
    c.strokeStyle = done ? p.hot : p.route;
    c.globalAlpha = blocked ? 0.25 : (done ? 0.9 : 0.35);
    c.lineWidth = done ? 2.2 : 1.4;
    c.setLineDash(done ? [] : [5, 6]);
    c.beginPath();
    c.moveTo(A[0] * K, A[1] * K);
    c.lineTo(B[0] * K, B[1] * K);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    if (blocked) {
      c.fillStyle = p.accent;
      c.textAlign = 'center';
      c.font = '20px sans-serif';
      c.fillText('×', ((A[0] + B[0]) * K) / 2, ((A[1] + B[1]) * K) / 2);
    }
  }

  var width = clientWidth || W;
  for (var mi = 0; mi < geography.length; mi++) {
    var land = geography[mi];
    var pin = land.pin || [0, 0];
    var x = pin[0] * K;
    var y = pin[1] * K;
    c.fillStyle = land.id === current ? p.hot : p.ink;
    c.textAlign = 'center';
    c.font = Math.max(18, Math.round((W / Math.max(320, width)) * 12)) + 'px sans-serif';
    c.fillText(land.name, x, y - 30);
    if (land.id === current) {
      c.strokeStyle = p.hot;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, y, 16, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fill();
    } else if (visited.indexOf(land.id) >= 0) {
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
    }
    if (s && s.birth && s.birth.continent === land.id) {
      c.font = Math.max(12, Math.round((W / Math.max(320, width)) * 9)) + 'px sans-serif';
      c.fillText('出生地', x, y + 32);
    }
  }
  return edgeKeys.length;
}

function findPin(geography, id) {
  for (var i = 0; i < geography.length; i++) if (geography[i].id === id) return geography[i].pin;
  return null;
}

module.exports = {
  K: K,
  W: W,
  H: H,
  dots: dots,
  drawMap: drawMap,
};
