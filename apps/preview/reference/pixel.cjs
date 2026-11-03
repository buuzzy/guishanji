/**
 * 像素画引擎：调色板、像素缓冲、精灵栅格化。
 *
 * 与官方使用同一套调色板（PX_PAL）与人物像素图（PX_PEOPLE），
 * 因此画风、配色、人物比例完全一致；只把渲染目标换成小程序的 Canvas 2D。
 */

/*
 * 注意：小程序的模块系统只认 .js —— 把 './art.json' 当成 require 目标，
 * 实际会去解析 'art/art.json.js'，运行时报
 * 「module 'art/art.json.js' is not defined」。
 * 所以美术数据用模块形态的 art.js（内容与官方 art.json 逐字节等价）。
 * web 侧的 legacy/data/art.json 仍保持 .json（browserify 读的是那个）。
 */
const ART = require('./art.js');

/* --------------------------------------------------------------- 调色板 */

/** '#RRGGBB' → [r,g,b] */
const pxRGB = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};

/** 线性混色 */
const pxMix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * 取一套调色板
 * @param {'light'|'dark'} mode
 */
function pxPalette(mode) {
  const src = ART.PAL[mode === 'dark' ? 'dark' : 'light'];
  const P = { dark: mode === 'dark' };
  for (const k in src) P[k] = typeof src[k] === 'string' ? pxRGB(src[k]) : src[k];
  P.shade = (c, k) => pxMix(c, P.ol, k);
  P.light = (c, k) => pxMix(c, [255, 255, 255], k);
  return P;
}

/** 有序抖动阈值矩阵 */
const PX_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/* ------------------------------------------------------------- 像素缓冲 */

class PxR {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  disc(cx, cy, r, c) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        if (i * i + j * j <= r * r + r * 0.8) this.px(cx + i, cy + i === 0 ? cy + j : cy + j, c);
      }
    }
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  dither(x, y, c, t) {
    if (t > PX_BAYER[(y & 3) * 4 + (x & 3)]) this.px(x, y, c);
  }
  blit(s, x, y, outline) {
    for (let j = -1; j <= s.h; j++) {
      for (let i = -1; i <= s.w; i++) {
        const v = s.get(i, j);
        if (v) this.px(x + i, y + j, v);
        else if (outline && (s.get(i - 1, j) || s.get(i + 1, j) || s.get(i, j - 1) || s.get(i, j + 1))) {
          this.px(x + i, y + j, outline);
        }
      }
    }
  }
}

/** 由 ASCII 行 + 颜色映射生成精灵 */
function pxSprite(rows, map) {
  const s = new PxR(Math.max.apply(null, rows.map((r) => r.length)), rows.length);
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] !== '.') s.px(x, y, map[r[x]]);
  });
  return s;
}

/** 把像素缓冲画到小程序 Canvas 上 */
function drawPxR(ctx, s, x, y, scale, outline) {
  if (!s) return;
  for (let j = 0; j < s.h; j++) {
    for (let i = 0; i < s.w; i++) {
      const v = s.get(i, j);
      if (!v) continue;
      ctx.fillStyle = `rgb(${v[0]},${v[1]},${v[2]})`;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  }
  if (outline) {
    ctx.fillStyle = outline;
    for (let j = -1; j <= s.h; j++) {
      for (let i = -1; i <= s.w; i++) {
        if (s.get(i, j)) continue;
        if (s.get(i - 1, j) || s.get(i + 1, j) || s.get(i, j - 1) || s.get(i, j + 1)) {
          ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
        }
      }
    }
  }
}

module.exports = { ART, pxRGB, pxMix, pxPalette, PX_BAYER, PxR, pxSprite, drawPxR };
