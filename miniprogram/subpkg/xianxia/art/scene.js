/**
 * scene.js — 修仙像素场景（移植自 HTML 试玩端）
 * ============================================================================
 *
 * 来源
 * ----
 * 上游 `buuzzy/xianxia-life` 的 `apps/preview/cultivation-pixel.js`（锁定快照在
 * `vendor/xianxia-r12-art/apps/preview/`）。那份是**浏览器**代码：它拿
 * `root.querySelectorAll('canvas')` 找四层画布、用 `performance.now()` 计时、
 * 到处用 `?.` 与 `??`（小程序拒收 ES2020）。
 *
 * 这份移植只做三件事，**画面逻辑一个字不改**：
 *   ① 去掉 DOM：改成「把模型交给它，它往画布上画」；
 *   ② 四层画布（sky / back / mid / front）合成**一张**画布，按原顺序画
 *      —— 小程序里画布是同一个，四层就是先后画，视觉结果一样；
 *   ③ 把 `?.` / `??` 换成显式判断。
 *
 * ⚠「画面逻辑一个字不改」这句话不是嘴上说的：
 *   `scripts/test-xianxia-art.mjs` 会把上游那份**原样**装进 VM 里，
 *   给它四层假画布，再给我们这份同样的模型，
 *   然后**逐笔比对**两层画布的每一次 fillRect（颜色与坐标全等）。
 *   改了这里而没同步上游 ⇒ 那道门禁立刻报红。
 *
 * 画面尺寸：192×108（上游同款）。
 */
'use strict';

var engine = require('../runtime/engine.js');
var PIXEL_STYLE = require('../runtime/pixel-style.js').PIXEL_STYLE;

var W = 192;
var H = 108;

/* ───────────────────────────── 小工具 ───────────────────────────── */

function px(c, color, x, y, w, h) {
  if (w === undefined) w = 1;
  if (h === undefined) h = 1;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function rgbOf(v) {
  return [1, 3, 5].map(function (i) { return parseInt(v.slice(i, i + 2), 16); });
}

function mix(a, b, t) {
  var av = rgbOf(a);
  var bv = rgbOf(b);
  return '#' + av.map(function (v, i) {
    return Math.round(v + (bv[i] - v) * t).toString(16).padStart(2, '0');
  }).join('');
}

/* ───────────────────────────── 景物 ───────────────────────────── */

function tree(c, P, x, y) {
  px(c, P.trunk, x, y - 25, 2, 25);
  for (var l = 0; l < 4; l++) {
    for (var r = 0; r < 6; r++) {
      px(c, r % 3 ? P.tree2 : P.treehi, x - 5 - l * 2 + r, y - 34 + l * 6 + r, 13 + l * 4 - r * 2, 1);
    }
  }
}

function rock(c, P, x, y) {
  px(c, P.ol, x, y, 9, 5);
  px(c, P.stone, x + 1, y - 1, 7, 4);
  px(c, P.pave, x + 2, y - 1, 3, 1);
}

function house(c, P, x, y, w, hut, broken) {
  if (w === undefined) w = 42;
  if (hut === undefined) hut = false;
  if (broken === undefined) broken = false;
  px(c, P.ol, x, y - 25, w, 25);
  px(c, P.wall2, x + 1, y - 24, w - 2, 22);
  px(c, P.wall, x + 2, y - 23, w - 6, 18);
  px(c, P.pave2, x - 2, y - 1, w + 4, 3);
  for (var r = 0; r < 8; r++) {
    var spread = 8 - r;
    px(c, P.ol, x - spread, y - 33 + r, w + spread * 2, 1);
    px(c, hut ? P.thatch : (r % 2 ? P.roof2 : P.roof), x - spread + 1, y - 33 + r, w + spread * 2 - 2, 1);
    for (var z = x - spread + 3; z < x + w + spread - 2; z += 6) px(c, P.ol, z, y - 33 + r);
  }
  px(c, P.ol, x + w / 2 - 5, y - 13, 11, 12);
  px(c, P.trunk, x + w / 2 - 4, y - 12, 9, 11);
  px(c, P.gold, x + w / 2 + 2, y - 7);
  var doors = [x + 6, x + w - 13];
  for (var d = 0; d < doors.length; d++) {
    var dz = doors[d];
    px(c, P.ol, dz, y - 18, 7, 8);
    px(c, P.winlit, dz + 1, y - 17, 5, 6);
    px(c, P.trunk, dz + 3, y - 17, 1, 6);
    px(c, P.trunk, dz + 1, y - 14, 5, 1);
  }
  var posts = [x + 1, x + w - 4];
  for (var q = 0; q < posts.length; q++) {
    var pz = posts[q];
    px(c, P.ol, pz, y - 25, 3, 24);
    px(c, P.brick, pz + 1, y - 24, 1, 22);
  }
  px(c, P.ol, x + w / 2 - 10, y - 23, 20, 5);
  px(c, P.gold, x + w / 2 - 9, y - 22, 18, 3);
  for (var i = 0; i < 3; i++) px(c, P.roof2, x + w / 2 - 6 + i * 5, y - 22, 2, 2);
  if (broken) {
    px(c, P.sky.d[1], x + w - 15, y - 31, 10, 9);
    for (var b = 0; b < 4; b++) rock(c, P, x + w - 12 + b * 4, y + 2);
  }
}

function person(c, P, x, y, sex, age, robe, t, action, beast) {
  var stage = age < 3 ? 'baby' : age < 7 ? 'small' : age < 13 ? 'child' : age < 18 ? 'teen' : 'adult';
  var people = PIXEL_STYLE.PEOPLE[sex || 'M'];
  var sprite = people[stage];
  if (!sprite) return;
  var bob = (action === 'sword' || action === 'work') ? Math.floor(t / 5) % 2 : 0;
  var colors = {
    H: age > 100 ? P.hairold : P.hair,
    S: P.skin,
    E: P.ol,
    c: mix(P.skin, P.roof, 0.25),
    m: P.roof2,
    B: robe,
    b: mix(robe, P.ol, 0.25),
    P: robe,
    F: P.ol,
    D: robe,
    d: mix(robe, P.ol, 0.3),
  };
  for (var r = 0; r < sprite.length; r++) {
    for (var z = 0; z < sprite[r].length; z++) {
      var k = sprite[r][z];
      if (colors[k]) {
        px(c, k === 'E' && t % 53 === 0 ? P.skin : colors[k], x + z, y - sprite.length + r + bob);
      }
    }
  }
  if (age >= 13) {
    px(c, P.gold, x + 1, y - 5 + bob, 7, 1);
    px(c, robe, x + 2, y - 4 + bob, 5, 2);
    px(c, P.hair, x + 3, y - sprite.length - 2, 3, 2);
  }
  if (action === 'study' || action === 'array') {
    px(c, P.ol, x + 7, y - 8, 8, 6);
    px(c, P.wall, x + 8, y - 7, 6, 4);
    px(c, P.trunk, x + 10, y - 7, 1, 4);
  }
  if (action === 'sword') {
    for (var i = 0; i < 10; i++) px(c, P.metal, x + 7 + i, y - 8 - i + bob);
    px(c, P.gold, x + 8, y - 10, 3, 1);
  }
  if (beast) {
    px(c, P.gold, x + 1, y - sprite.length - 2, 1, 3);
    px(c, P.gold, x + 7, y - sprite.length - 2, 1, 3);
    px(c, robe, x + 8, y - 4, 5, 1);
  }
}

function lantern(c, P, x, y, t) {
  px(c, P.ol, x, y, 1, 7);
  px(c, P.ol, x - 2, y + 6, 5, 8);
  px(c, P.roof, x - 1, y + 7, 3, 6);
  px(c, t % 3 ? P.gold : P.winlit, x, y + 8, 1, 4);
  px(c, P.gold, x, y + 14, 1, 3);
}

function room(c, P, m, t) {
  var cultivation = m.run && m.run.life ? m.run.life.cultivation : null;
  var detained = cultivation && cultivation.detained;
  if (m.context === 'confinement' || detained) {
    px(c, P.ol, 0, 0, W, H);
    px(c, P.stone, 0, 15, W, 93);
    for (var y = 16; y < 82; y += 12) {
      for (var x = (y % 24 ? 0 : 12); x < W; x += 24) {
        px(c, P.ol, x, y, 24, 1);
        px(c, P.ol, x, y, 1, 12);
      }
    }
    px(c, P.soil2, 0, 85, W, 23);
    px(c, P.ol, 140, 30, 35, 57);
    px(c, P.wall2, 145, 39, 25, 5);
    for (var bx = 143; bx < 175; bx += 6) px(c, P.trunk, bx, 31, 2, 52);
    px(c, P.thatch, 58, 94, 35, 5);
    px(c, P.wall, 103, 95, 7, 2);
    for (var i = 0; i < 8; i++) px(c, P.wall2, 18 + i * 4, 57, 1, 5);
    person(c, P, 74, 96, m.sex, m.age, m.robe, t, 'rest', m.path === 'beast');
    lantern(c, P, 131, 40, t);
    return;
  }
  px(c, P.wall2, 0, 22, W, 61);
  px(c, P.wall, 0, 24, W, 53);
  for (var wx = 0; wx < W; wx += 24) px(c, P.trunk, wx, 22, 3, 61);
  px(c, P.soil, 0, 83, W, 25);
  for (var sy = 87; sy < H; sy += 6) {
    px(c, P.soil2, 0, sy, W, 1);
    for (var sx = (sy % 3) * 7; sx < W; sx += 32) px(c, P.soil2, sx, sy - 4, 1, 4);
  }
  px(c, P.ol, 10, 30, 45, 30);
  px(c, P.win, 11, 31, 43, 28);
  px(c, P.far2, 12, 49, 40, 10);
  for (var fx = 14; fx < 52; fx += 8) px(c, P.trunk, fx, 31, 2, 28);
  px(c, P.trunk, 11, 43, 43, 2);
  for (var r = 0; r < 3; r++) {
    px(c, P.ol, 127, 30 + r * 12, 53, 11);
    px(c, P.trunk, 128, 39 + r * 12, 51, 2);
    for (var b = 0; b < 8; b++) {
      px(c, [P.me, P.roof, P.gold, P.wall2][(b + r) % 4], 130 + b * 6, 32 + r * 12, 4, 7);
      px(c, P.wall, 131 + b * 6, 34 + r * 12, 2, 1);
    }
  }
  px(c, P.ol, 64, 75, 46, 4);
  px(c, P.thatch, 65, 75, 44, 2);
  px(c, P.trunk, 66, 79, 3, 14);
  px(c, P.trunk, 104, 79, 3, 14);
  px(c, P.wall, 70, 71, 13, 4);
  px(c, P.ol, 75, 70, 1, 4);
  if (m.activity === 'alchemy') {
    px(c, P.ol, 89, 59, 13, 15);
    px(c, P.metal, 90, 60, 11, 12);
    px(c, P.gold, 92, 73, 7, 2);
    px(c, P.winlit, 93, 68, 5, 3);
    px(c, P.roof, 93, 56, 5, 3);
    for (var ai = 0; ai < 3; ai++) px(c, P.smoke, 94 + ((ai + t) % 4), 51 - ai * 4, 3, 2);
  }
  if (m.context === 'retreat') {
    px(c, P.thatch2, 72, 91, 27, 7);
    for (var rx = 57; rx < 112; rx += 3) {
      px(c, P.me, rx, 96 + Math.floor(Math.sin(rx + t * 0.1) * 2), 2, 1);
    }
  }
  person(c, P, 80, 96, m.sex, m.age, m.robe, t, m.context === 'retreat' ? 'rest' : m.activity, m.path === 'beast');
  lantern(c, P, 113, 39, t);
}

/* ───────────────────────────── 特殊场景 ───────────────────────────── */

function specialScene(mid, front, P, m, t) {
  var scene = m.scene;
  if (['mine', 'siege', 'camp', 'settlement', 'hide', 'tribulation'].indexOf(scene) < 0) return false;

  px(mid, P.soil, 0, 78, W, 30);
  for (var i = 0; i < 50; i++) px(mid, i % 2 ? P.soil2 : P.grass2, (i * 31) % W, 80 + ((i * 17) % 27), 2, 1);

  /**
   * 地火矿（规则12 起会出现的场景）。
   * ⚠ 逐笔照抄上游 `apps/preview/cultivation-pixel.js` 的 mine 分支，
   *   一个坐标、一个颜色都不能差（画面门禁逐笔比）。
   */
  if (scene === 'mine') {
    px(mid, P.ol, 0, 0, W, 78);
    px(mid, P.stone, 0, 0, W, 62);
    for (var my = 0; my < 64; my += 8) {
      for (var mxx = (my % 16 ? 4 : 0); mxx < W; mxx += 16) {
        px(mid, P.ol, mxx, my, 14, 1);
        px(mid, P.wall2, mxx + 2, my + 2, 5, 1);
      }
    }
    px(mid, P.ol, 62, 26, 68, 59);
    px(mid, P.soil2, 65, 72, 62, 13);
    var minePosts = [60, 127];
    for (var mp = 0; mp < minePosts.length; mp++) {
      var mpv = minePosts[mp];
      px(mid, P.ol, mpv, 24, 6, 62);
      px(mid, P.trunk, mpv + 1, 25, 3, 60);
      px(mid, P.thatch2, mpv + 2, 27, 1, 54);
    }
    px(mid, P.trunk, 60, 23, 74, 5);
    px(mid, P.thatch2, 63, 24, 68, 1);
    for (var mdy = 76; mdy < H; mdy++) {
      px(mid, P.metal, 81 - (mdy - 76) / 2, mdy, 2, 1);
      px(mid, P.metal, 110 + (mdy - 76) / 2, mdy, 2, 1);
      if (mdy % 6 === 0) px(mid, P.trunk, 80 - (mdy - 76) / 2, mdy, 33 + mdy - 76, 2);
    }
    px(mid, P.ol, 120, 77, 28, 14);
    px(mid, P.trunk, 121, 78, 26, 10);
    for (var mrk = 0; mrk < 6; mrk++) rock(mid, P, 121 + mrk * 4, 75 - mrk % 2 * 3);
    px(mid, P.ol, 123, 90, 5, 5);
    px(mid, P.ol, 141, 90, 5, 5);
    lantern(mid, P, 57, 41, t);
    lantern(mid, P, 135, 39, t + 2);
    person(front, P, 76, 100, m.sex, m.age, m.robe, t, 'work');
    person(front, P, 104, 99, 'M', 32, P.pt, t + 3, 'work');
    px(front, P.metal, 113, 79, 1, 18);
    px(front, P.metal, 110, 79, 8, 2);
    for (var msm = 0; msm < 8; msm++) px(front, P.smoke, 67 + msm * 7, 65 - (msm + t) % 6, 2, 1);
  } else if (scene === 'siege') {
    house(mid, P, 16, 82, 52, false, true);
    house(mid, P, 131, 83, 42, false, true);
    var fires = [24, 39, 145, 157];
    for (var f = 0; f < fires.length; f++) {
      var fx = fires[f];
      for (var k = 0; k < 4; k++) {
        px(front, k % 2 ? P.gold : P.roof, fx + (k % 2), 75 - k * 4 - ((t + k) % 3), 4 - (k % 2), 5);
        px(front, P.smoke, fx + ((Math.floor(t / 3) + k) % 5), 52 - k * 6, 5, 3);
      }
    }
    for (var y = 48; y < 99; y += 4) {
      var bx = 92 + Math.floor(Math.sin(y * 0.1 + t * 0.1) * 3);
      px(front, y % 8 ? P.me : P.gold, bx, y, 1, 3);
    }
    for (var x = 77; x < 111; x += 4) px(front, P.me, x, 99 + Math.floor(Math.sin(x + t * 0.1)), 2, 1);
    person(front, P, 77, 99, m.sex, m.age, m.robe, t, 'sword');
    person(front, P, 111, 98, 'M', 38, P.roof2, t + 4, 'sword');
    person(front, P, 48, 103, 'F', 23, P.pt, t, 'work');
    var rocks = [[9, 101], [39, 106], [152, 104], [177, 95]];
    for (var r = 0; r < rocks.length; r++) rock(front, P, rocks[r][0], rocks[r][1]);
  } else if (scene === 'camp') {
    var tents = [[15, 85], [111, 86]];
    for (var t1 = 0; t1 < tents.length; t1++) {
      var tx = tents[t1][0], ty = tents[t1][1];
      for (var rr = 0; rr < 20; rr++) px(mid, rr % 3 ? P.thatch : P.thatch2, tx + 20 - rr, ty - 20 + rr, rr * 2 + 1, 1);
      px(mid, P.ol, tx + 18, ty - 11, 7, 10);
      px(mid, P.trunk, tx + 20, ty - 21, 1, 21);
    }
    px(mid, P.wall2, 151, 91, 25, 9);
    px(mid, P.ol, 151, 91, 25, 1);
    for (var mx = 156; mx < 174; mx += 8) px(mid, P.trunk, mx, 92, 1, 8);
    px(mid, P.wall, 158, 87, 13, 4);
    px(mid, P.roof, 165, 88, 2, 2);
    px(front, P.stone, 80, 99, 14, 3);
    px(front, P.gold, 85, 91 + (t % 3), 4, 7);
    px(front, P.roof, 84, 96, 6, 3);
    person(front, P, 65, 104, m.sex, m.age, m.robe, t, 'rest');
    person(front, P, 96, 104, 'M', 31, P.par, t + 3, 'rest');
    person(front, P, 47, 99, 'F', 27, P.sib, t, 'work');
  } else if (scene === 'settlement') {
    house(mid, P, 20, 81, 46);
    house(mid, P, 127, 82, 43);
    px(mid, P.trunk, 88, 59, 2, 30);
    px(mid, P.wall, 74, 61, 15, 9);
    px(mid, P.me, 75, 62, 13, 7);
    px(mid, P.gold, 80, 63, 2, 5);
    for (var si = 0; si < 6; si++) {
      px(mid, P.soil2, 113 + si * 7, 99, 5, 3);
      px(mid, P.tree2, 115 + si * 7, 94, 1, 6);
      px(mid, P.treehi, 113 + si * 7, 93, 5, 2);
    }
    person(front, P, 84, 103, m.sex, m.age, m.robe, t, 'study');
    person(front, P, 47, 101, 'M', 24, P.pt, t, 'work');
    px(front, P.wall, 51, 91, 8, 6);
    px(front, P.trunk, 53, 91, 1, 6);
    person(front, P, 111, 101, 'F', 42, P.par, t, 'array');
  } else if (scene === 'hide') {
    for (var hi = 0; hi < 7; hi++) tree(mid, P, 9 + hi * 27, 90 + (hi % 2) * 6);
    for (var hx = 48; hx < 132; hx++) {
      var hy = 68 - Math.floor(Math.sin(((hx - 48) / 84) * Math.PI) * 35);
      px(mid, P.stone, hx, hy, 1, 93 - hy);
    }
    px(mid, P.ol, 75, 57, 32, 40);
    px(mid, P.soil2, 77, 89, 28, 8);
    person(front, P, 84, 98, m.sex, m.age, m.robe, t, 'rest');
    for (var hf = 0; hf < 7; hf++) px(front, P.tree2, 70 + hf * 6, 98 - (hf % 2) * 3, 4, 2);
  } else {
    px(mid, P.cloudsh, 0, 0, W, 28);
    for (var cx = 0; cx < W; cx += 19) px(mid, P.cloud, cx, 21 + ((cx + t) % 7), 23, 5);
    for (var ci = 0; ci < 32; ci++) {
      var a = ci * Math.PI / 16;
      px(mid, ci % 3 ? P.me : P.gold, 93 + Math.cos(a) * 30, 94 + Math.sin(a) * 8, 2, 1);
    }
    if (t % 7 < 3) {
      for (var ly = 25; ly < 83; ly += 3) {
        px(front, P.sunhi, 93 + Math.floor(Math.sin(ly * 0.19) * 5), ly, 2, 4);
      }
    }
    person(front, P, 89, 98, m.sex, m.age, m.robe, t, 'rest');
    person(front, P, 40, 102, 'M', 75, P.par, t, 'array');
    person(front, P, 143, 102, 'F', 72, P.sib, t, 'array');
    px(front, P.wall, 86, 101, 7, 3);
    px(front, P.gold, 87, 100, 5, 1);
  }
  return true;
}

/* ───────────────────────────── 模型 ───────────────────────────── */

/**
 * 从人生状态算出画场景要用的模型。
 * 口径照上游 registerScene()：context / companions / path / age / activity。
 */
function buildModel(run, theme) {
  var cultivation = run && run.life ? run.life.cultivation : null;
  var context = run && run.life ? engine.activityContext(run) : 'birth';
  var companions = run && run.life ? engine.presentPeople(run).slice(0, 3) : [];
  var path = cultivation && cultivation.path ? cultivation.path : 'orthodox';
  var age = run ? Math.floor(run.month / 12) + ((run.birth && run.birth.startAge) || 0) : 20;
  var activity = context === 'work' ? 'work' : (cultivation && cultivation.activity ? cultivation.activity : 'study');
  var scene = run && engine.sceneFor ? engine.sceneFor(run) : null;
  return {
    run: run,
    theme: theme || 'light',
    context: context,
    scene: scene,
    companions: companions,
    path: path,
    age: age,
    activity: activity,
    sex: run && run.player ? run.player.sex : 'M',
    robe: '',
  };
}

/* ───────────────────────────── 画 ───────────────────────────── */

/**
 * 把场景画到画布上。
 * @param {object} layers {sky, back, mid, front} —— 四层画布。
 *        小程序里只有一张画布 ⇒ 四个都传同一个 ctx 即可（按 sky→back→mid→front 顺序画）。
 * @param {object} model buildModel() 的结果
 * @param {number} now   毫秒时间戳
 * @param {boolean} [reduced] 静止画面（不播动画）
 */
function drawScene(layers, model, now, reduced) {
  if (!model) return;
  var sky = layers.sky;
  var back = layers.back;
  var mid = layers.mid;
  var front = layers.front;
  var P = PIXEL_STYLE.PAL[model.theme === 'dark' ? 'dark' : 'light'];
  var t = reduced ? 7 : Math.floor(now / 180);
  model.robe = ({
    orthodox: P.me,
    loose: P.gold,
    demonic: P.roof2,
    beast: P.tree2,
    mortal: P.par,
  })[model.path] || P.me;

  for (var c = 0; c < 4; c++) {
    var layer = c === 0 ? sky : c === 1 ? back : c === 2 ? mid : front;
    layer.clearRect(0, 0, W, H);
  }

  for (var y = 0; y < H; y++) px(sky, mix(P.sky.d[0], P.sky.d[1], y / H), 0, y, W, 1);
  px(sky, P.sun, 150, 15, 9, 7);
  px(sky, P.sunhi, 151, 15, 5, 3);
  for (var ci = 0; ci < 5; ci++) {
    var cx = (ci * 43 + Math.floor(t / 7)) % 210 - 14;
    var cy = 13 + (ci % 3) * 6;
    px(sky, P.cloudsh, cx, cy + 3, 23, 3);
    px(sky, P.cloud, cx + 4, cy, 16, 5);
    px(sky, P.cloud, cx + 9, cy - 2, 7, 2);
  }
  for (var bx = 0; bx < W; bx++) {
    var by = 40 + Math.floor(Math.sin(bx * 0.07) * 9 + Math.sin(bx * 0.023) * 10);
    px(back, P.far1, bx, by, 1, H - by);
    var bz = 59 + Math.floor(Math.sin(bx * 0.05 + 1) * 9);
    px(back, P.far2, bx, bz, 1, H - bz);
  }

  if (specialScene(mid, front, P, model, t)) return;

  var cultivation = model.run && model.run.life ? model.run.life.cultivation : null;
  var detained = cultivation && cultivation.detained;
  var indoor = model.context === 'confinement' || detained || model.context === 'retreat' ||
    model.context === 'cavern' ||
    (['study', 'alchemy', 'array'].indexOf(model.activity) >= 0 &&
      ['travel', 'valley', 'outer', 'beast', 'childhood'].indexOf(model.context) < 0);
  if (indoor) {
    room(mid, P, model, t);
    return;
  }

  px(mid, P.grass, 0, 77, W, 31);
  for (var gi = 0; gi < 95; gi++) px(mid, gi % 3 ? P.grass2 : P.grasshi, (gi * 37) % W, 79 + ((gi * 19) % 29), 2, 1);
  var outer = model.context === 'outer';
  var water = model.run && engine.currentContinent(model.run) === 'tide';
  if (water) {
    px(mid, P.water, 0, 78, 65, 30);
    for (var wi = 0; wi < 12; wi++) px(mid, P.water2, (wi * 13 + t) % 63, 81 + ((wi * 7) % 26), 7, 1);
  }
  if (outer) {
    px(mid, P.sky.d[1], 0, 79, W, 29);
    for (var oi = 0; oi < 4; oi++) {
      var ox = 12 + oi * 46;
      var oy = 84 + (oi % 2) * 5;
      px(mid, P.grass, ox, oy, 31, 3);
      for (var orr = 0; orr < 9; orr++) px(mid, P.stone, ox + orr, oy + 3 + orr, 31 - orr * 2, 1);
    }
  } else {
    for (var py = 77; py < H; py++) px(mid, py % 5 ? P.pave : P.pave2, 67 - (py - 77) / 3, py, 22 + (py - 77) * 0.6, 1);
  }
  if (['home', 'abroad', 'birth', 'childhood', 'demonic'].indexOf(model.context) >= 0) {
    house(mid, P, 22, 80, 45, model.path === 'mortal', Boolean(model.run && model.run.flags && model.run.flags.fledWar));
    house(mid, P, 132, 81, 36);
    lantern(mid, P, 19, 45, t);
    lantern(mid, P, 174, 48, t);
  }
  if (model.context === 'travel') {
    house(mid, P, 132, 80, 30, true);
    px(mid, P.trunk, 52, 72, 1, 19);
    px(mid, P.wall, 42, 72, 13, 5);
    px(mid, P.roof, 43, 73, 10, 1);
  }
  var trees = [[6, 90], [176, 95], [120, 84]];
  for (var ti = 0; ti < trees.length; ti++) tree(mid, P, trees[ti][0], trees[ti][1]);
  if (model.context === 'valley') {
    for (var vi = 0; vi < 10; vi++) {
      var vx = 11 + vi * 15;
      var vy = 86 + (vi % 3) * 4;
      px(mid, P.soil, vx, vy, 10, 3);
      for (var vj = 0; vj < 3; vj++) {
        px(mid, P.tree2, vx + vj * 3, vy - 3, 1, 4);
        px(mid, P.treehi, vx + vj * 3 - 1, vy - 3, 3, 1);
        px(mid, P.gold, vx + vj * 3, vy - 5);
      }
    }
  }
  if (model.context === 'beast') {
    for (var si = 22; si < 56; si++) px(mid, P.stone, si, 74 - Math.floor(Math.sin(((si - 22) / 34) * Math.PI) * 15), 1, 11);
    px(mid, P.ol, 33, 68, 13, 12);
  }
  if (outer) {
    var poles = [135, 152];
    for (var pi = 0; pi < poles.length; pi++) {
      px(mid, P.ol, poles[pi], 51, 5, 33);
      px(mid, P.stone, poles[pi] + 1, 52, 3, 31);
    }
    for (var mi = 0; mi < 16; mi++) px(mid, P.me, 141 + (mi % 11), 56 + ((mi * 3) % 24));
  }
  var frontRocks = [[35, 104], [121, 100], [164, 91]];
  for (var fri = 0; fri < frontRocks.length; fri++) rock(front, P, frontRocks[fri][0], frontRocks[fri][1]);
  person(front, P, 86, 100, model.sex, model.age, model.robe, t,
    model.context === 'travel' ? 'work' : model.activity, model.path === 'beast');
  var robes = [P.sib, P.pt, P.par];
  for (var ci2 = 0; ci2 < model.companions.length; ci2++) {
    var p = model.companions[ci2];
    person(front, P, 102 + ci2 * 12, 99 - (ci2 % 2) * 2, p.sex, Math.min(75, model.age + 12),
      robes[ci2], t + ci2, 'rest');
  }
  if (model.context === 'valley' || outer) {
    for (var gi2 = 0; gi2 < 6; gi2++) px(front, P.gold, 79 + gi2 * 7, 92 + ((gi2 + t) % 7));
  }
}

module.exports = {
  W: W,
  H: H,
  buildModel: buildModel,
  drawScene: drawScene,
  PIXEL_STYLE: PIXEL_STYLE,
};
