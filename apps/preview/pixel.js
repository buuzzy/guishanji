// Existing 1in8b pixel renderer, statically wrapped for this HTML preview. No eval.
const factories = {
"art": (module, load) => {
module.exports = {"PAL":{"light":{"sky":{"m":["#A9D8E8","#F6E9D2"],"d":["#8FCFE3","#E8F2EC"],"e":["#D7A79E","#F4D29A"]},"sun":"#FFE39A","sunhi":"#FFF7DC","star":null,"cloud":"#FFFFFF","cloudsh":"#D6E4EC","cloudlow":"#BCC6CA","cloudlowsh":"#9DA9AE","far1":"#BCD7E0","far2":"#A3C3CD","hill1":"#B3D3C2","hill2":"#93BEA3","grass":"#8CC07A","grass2":"#5E9A5E","grasshi":"#B6DB8F","soil":"#7E6858","soil2":"#5F4D42","stone":"#A2917F","pave":"#CDD0C8","pave2":"#A9ADA6","road":"#6E7479","roadline":"#DDD6C6","sand":"#ECD5A2","sand2":"#D3B47E","water":"#6FB7CF","water2":"#B4E2EE","wall":"#F3EEE3","wall2":"#D5D9D3","wall3":"#AEB6B1","roof":"#C25550","roof2":"#953D3B","thatch":"#CBA968","thatch2":"#A6864A","mud":"#BB906A","brick":"#A86B4E","win":"#7FA9BA","winlit":"#F2C76E","ol":"#3B4046","tree":"#6FA766","tree2":"#4E8550","treehi":"#9DCD80","trunk":"#7A5A43","skin":"#CF9F7C","sk0":"#F2CDB0","sk1":"#E2B48F","sk2":"#CF9F7C","sk3":"#B07C58","sk4":"#8A583A","sk5":"#5E3A25","hair":"#3F3530","hairold":"#DDDAD3","pants":"#4F5661","me":"#1F8A80","pt":"#6C8091","kid":"#E2A33A","par":"#9AA8AE","sib":"#9A86C8","inlaw":"#B07A86","metal":"#8E979C","crane":"#E8B33A","smoke":"#A7AEB1","accent":"#BE4A52","stamp":"#2C8C82","gold":"#E2AE45","lit":false},"dark":{"sky":{"m":["#1F2E45","#3A3F52"],"d":["#17283A","#2C3F49"],"e":["#2A2238","#4B3838"]},"sun":"#E8D7A0","sunhi":"#FFF4CF","star":"#C9D3DA","cloud":"#4A5A64","cloudsh":"#3A4851","cloudlow":"#3A444A","cloudlowsh":"#2E363B","far1":"#2B3D48","far2":"#22323C","hill1":"#25382F","hill2":"#1E3029","grass":"#2F4B36","grass2":"#22382A","grasshi":"#3F6146","soil":"#2E2621","soil2":"#211B17","stone":"#40362F","pave":"#3A3F42","pave2":"#2E3336","road":"#262B30","roadline":"#6B6A60","sand":"#4A4030","sand2":"#3A3226","water":"#1F4554","water2":"#3A7A8E","wall":"#4B545A","wall2":"#3D464C","wall3":"#333B40","roof":"#7A3638","roof2":"#5A282A","thatch":"#6E5B3B","thatch2":"#574730","mud":"#5E4835","brick":"#5E3E30","win":"#2C3D47","winlit":"#F0C35E","ol":"#0D1114","tree":"#2F5A3E","tree2":"#224530","treehi":"#3F7350","trunk":"#4A3828","skin":"#A9876D","sk0":"#C6AE9B","sk1":"#B9997E","sk2":"#A9876D","sk3":"#90694D","sk4":"#714B33","sk5":"#4D3121","hair":"#1F1A17","hairold":"#A9A6A0","pants":"#2B3036","me":"#4CC0AF","pt":"#8C9DA3","kid":"#D9AF59","par":"#66777B","sib":"#9C8CC9","inlaw":"#B58A94","metal":"#5E676C","crane":"#B8902F","smoke":"#4A5357","accent":"#E2678A","stamp":"#4CC0AF","gold":"#D9AF59","lit":true}},"PEOPLE":{"M":{"adult":["..HHHHH..",".HHHHHHH.","HHHHHHHHH","HHSSSSHHH","HSSSSSSSH","SSESSSESS","ScSSSSScS",".SSSmSSS.","..SSSSS..",".BBBBBBB.","BBBBBBBBB","BbBBBBBbB","SbBBBBBbS","..PPPPP..","..PP.PP..","..PP.PP..","..FF.FF.."],"teen":["..HHHHH..",".HHHHHHH.","HHHHHHHHH","HHSSSSHHH","HSSSSSSSH","SSESSSESS","ScSSSSScS",".SSSmSSS.","..SSSSS..",".BBBBBBB.","BbBBBBBbB","SbBBBBBbS","..PPPPP..","..PP.PP..","..PP.PP..","..FF.FF.."],"child":[".HHHHH.","HHHHHHH","HHSSSHH","SESSSES","ScSSScS",".SSmSS.","..SSS..",".BBBBB.","BbBBBbB","SbBBBbS",".PPPPP.",".PP.PP.",".FF.FF."],"small":[".HHHHH.","HHSSSHH","SESSSES","ScSmScS",".SSSSS.",".BBBBB.","SBBBBBS",".PPPPP.",".PP.PP.",".FF.FF."],"baby":[".HHHH.","HSSSSH","SESSES","ScSScS",".SSSS.","BBBBBB","BB..BB"]},"F":{"adult":["..HHHHH..",".HHHHHHH.","HHHHHHHHH","HHSSSSHHH","HSSSSSSSH","HSESSSESH","HcSSSSScH","HHSSmSSHH","HHHSSSHHH","HBBBBBBBH","BBBBBBBBB","SbBBBBBbS",".DDDDDDD.",".DDDDDDD.","ddddddddd","..S...S..","..F...F.."],"teen":["..HHHHH..",".HHHHHHH.","HHHHHHHHH","HHSSSSHHH","HSSSSSSSH","HSESSSESH","HcSSSSScH","HHSSmSSHH","HHHSSSHHH","HBBBBBBBH","SbBBBBBbS",".DDDDDDD.","ddddddddd","..S...S..","..F...F.."],"child":[".HHHHH.","HHHHHHH","HHSSSHH","HESSSEH","HcSSScH","HSSmSSH","H.SSS.H",".BBBBB.","SbBBBbS",".DDDDD.","ddddddd",".S...S.",".F...F."],"small":[".HHHHH.","HHSSSHH","HESSSEH","HcSmScH","HSSSSSH",".BBBBB.","SDDDDDS","ddddddd",".S...S.",".F...F."],"baby":[".HHHH.","HSSSSH","SESSES","ScSScS",".SSSS.","BBBBBB","BB..BB"]}},"PET":{"d":["..BBB........",".EBBBB......T",".EBkBB......T","NBBBBB.....T.","..cBBBBBBBBB.","...BBBBBBBBB.","...BBwwwwBBB.","...B.B...B.B.","...B.B...B.B."],"c":["B.B.........","BBB........T","BkBB.......T","NBBB......T.",".BBBBBBBBBT.","..BBBBBBBB..","..BBwwwBBB..","..B.B..B.B.."]},"NEWBORN":["..WWWWW..",".WWHHHWW.",".WHSSSHW.",".WSESESW.",".WcSSScW.",".WWSSSWW.",".WwWWWwW.",".WWwWwWW.",".WWWwWWW.","..WWWWW..","...WWW..."]};

},
"pixel": (module, load) => {
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
const ART = load("art");

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

},
"room": (module, load) => {
/**
 * 房间调色板与常量（官方 v0.8.15 逐字移植）
 * ============================================================================
 *
 * 官方来源（冻结基线 vendor/official/ui.zh-hans.0.8.15.js）：
 *   RPAL / RC / rmix / rlite / rdark / rc   L2767–2777
 *   ROOM                                    L2780
 *   WIN                                     L2829
 *
 * 只放**调色板与常量**；房间画面的其余部分（墙 / 地板 / 家具 / 人物 / 窗户）
 * 在同分包的 ./room-art.js —— 那份是**脚本生成**的（scripts/port-room-art.mjs），
 * 移植区与官方逐字节相同，并有 scripts/test-room-fig.mjs 做逐像素等价自检。
 *
 * ⚠ 官方 `roomFloor()` 里有一处**官方自己的笔误**（颜色串写成 `'#CDA277'`），
 *   它会解析成一个深蓝色 —— 我们照抄不改（改了就不一致了）。
 */
const { pxRGB, pxMix } = load("pixel");

/* ── 官方房间调色板（L2767–2775，逐字移植） ───────────────────────── */

const RPAL = {
  ol: '#3B4046', wood: '#C29466', wood2: '#A27650', wood3: '#7C5A3D', woodhi: '#D9B488', white: '#F5F2EA', white2: '#DCD7CB', grey: '#A9B0B4', grey2: '#7F888D',
  red: '#C8555B', red2: '#9E3E45', blue: '#6A8FB8', blue2: '#4E7099', green: '#6FA766', green2: '#4E8550', greenhi: '#9DCD80', yellow: '#E9C25B', yellow2: '#C99B34',
  pink: '#EBA6B9', pink2: '#C97C93', cream: '#F1E4C8', cream2: '#D9C7A4', gold: '#E2AE45', gold2: '#B88628', glass: '#A9DCE8', glass2: '#7FB9CB', dark: '#4A5056',
  black: '#2E3236', brown: '#8A6142', teal: '#2C8C82', teal2: '#1F6D65', navy: '#3E4E72', navy2: '#2C3953', orange: '#E28B45', orange2: '#BD6A2C', purple: '#9C83C4',
  paper: '#FBF8EF', paper2: '#E6E0D0', skin: '#E2B48E', skin2: '#C8946E', blush: '#EE9E9A', hair: '#3F3530', hair2: '#2C2522', hairold: '#DDDAD3', hairold2: '#B9B5AD',
};
const RC = {}; for (const [k, v] of Object.entries(RPAL)) RC[k] = pxRGB(v);
const rmix = (a, b, t) => pxMix(a, b, t), rlite = (c, k) => pxMix(c, [255, 255, 255], k), rdark = (c, k) => pxMix(c, RC.ol, k);
const rc = (n) => RC[n] || pxRGB(n);

/** 官方 ROOM 常量（L2780） */
const ROOM = { W: 192, H: 108, WALL: 79, FLOOR: 82, FB: 90, PB: 101 };
/** 官方 WIN（窗户位置，L2829） */
const WIN = { x: 10, y: 12, w: 49, h: 43 };

module.exports = { RPAL, RC, rmix, rlite, rdark, rc, ROOM, WIN };

},
"shelf": (module, load) => {
/**
 * 「내 전생들」陈列架的像素小人 —— 官方 v0.8.15 逐字移植
 * ============================================================================
 *
 * 官方来源（冻结基线 vendor/official/ui.zh-hans.0.8.15.js，行号对应该文件）：
 *   SKIN_W / SKIN_C / SKIN_CI / SKIN_G / skinW   L634–643
 *   skinU / skinPick / skinMid / skinSeed / skinMix / skinMe   L644–651
 *   nmSeed（引擎段同名符号，官方 ui 包里没有，这里一并移植）      官方 bundle L14056
 *   OUTFITS / roomPal / chibi                   L2782–2784
 *   PX_PEOPLE / PX_PET / pxPet / pxPerson       L792–860
 *   SHELF_OT / shelfFig / lifeFig               L3850–3884
 *
 * 为什么逐字移植而不是进引擎
 * --------------------------
 * 官方这几个符号都在**引擎段切点之后**（引擎段止于 bundle L20577）⇒ 抽取器不收。
 * 而且 `SKIN_CI` 的初始化是一个**独立的 for 顶层语句**（`const SKIN_CI = {}` 之外
 * 那一行），按名拉取（UI_PULL）只会拿到空对象 ⇒ 肤色表会整体错位。
 * ⇒ 走本项目既有做法（official.js 的 statusLine / tgLine / splitBold …）：逐字移植 + 真等价自检。
 *
 * 与官方唯一的结构性差异
 * ----------------------
 * 官方 `skinMe()` 读**全局 S**；这里改成**显式传 S**（`skinMe(S)`）。
 * 调用点永远是「当前这一段人生」（人生页 onDeath 时 S 就是引擎当前人生）⇒ 行为等价。
 * 同理 `skinSeed(S)` / `skinMix(S)` / `nmSeed(S)`。
 *
 * 其余函数（skinW / skinPick / skinU / pxPerson / pxPet / chibi / shelfFig / lifeFig）
 * **逐字符照抄**，只把全局 `CBY` 改成参数 `CBY`（官方读全局 CBY，这里显式传入，
 * 取值完全相同 —— CBY 是引擎导出的国家表）。
 *
 * 美术数据（ART.PAL / ART.PEOPLE）与官方 PX_PAL / PX_PEOPLE **逐值相同**，
 * 由 scripts/test-shelf-fig.mjs 每次运行都重新断言。
 */
const { PxR, pxSprite, pxMix, pxRGB, pxPalette, ART } = load("pixel");

/* ── 肤色权重（官方 L634–643 逐字移植） ─────────────────────────────── */

const SKIN_W = { n: [36, 44, 15, 5, 0, 0], m: [3, 17, 42, 30, 8, 0], s: [0, 0, 14, 46, 34, 6], e: [22, 50, 28, 0, 0, 0], se: [0, 8, 44, 40, 8, 0],
  a: [0, 0, 0, 6, 36, 58], ha: [0, 0, 6, 32, 44, 18], l: [6, 22, 34, 26, 10, 2], c: [0, 0, 5, 15, 40, 40], ca: [6, 32, 44, 18, 0, 0], pa: [0, 0, 4, 24, 46, 26],
  sc: [16, 46, 28, 10, 0, 0], in: [0, 4, 30, 46, 20, 0], au: [0, 0, 5, 25, 40, 30], br: [0, 0, 10, 36, 34, 20], co: [0, 10, 36, 38, 16, 0], ro: [0, 10, 40, 40, 10, 0] };
const SKIN_C = { e: 'CHN,KOR,PRK,JPN,TWN,HKG,MNG,SGP', se: 'VNM,THA,LAO,KHM,MMR,MYS,IDN,PHL,TLS,BRN', s: 'IND,PAK,BGD,NPL,LKA,BTN,MDV,MUS', ca: 'KAZ,UZB,KGZ,TJK,TKM,AZE,GEO,ARM',
  m: 'TUR,IRN,ISR,AFG', c: 'HTI,JAM,DOM,CUB,TTO,GUY,SUR', sc: 'ARG,URY,CHL', pa: 'PNG,SLB,FJI,VUT', ha: 'ETH,ERI,SOM,DJI,SDN', n: 'BRA' };
const SKIN_CI = {}; for (const k in SKIN_C) for (const i of SKIN_C[k].split(',')) SKIN_CI[i] = k;
const SKIN_G = { us_black: 'a', gb_black: 'a', co_afro: 'a', ec_afro: 'a', za_black: 'a', br_negro: 'br', us_hisp: 'l', us_asian: 'e', my_chin: 'e', cn_min: 'e', cn_hui: 'e', jp_zai: 'e',
  us_native: 'in', ca_ind: 'in', mx_ind: 'in', gt_maya: 'in', bo_ind: 'in', pe_ind: 'in', ec_ind: 'in', co_ind: 'in', cl_mapu: 'in', nz_maori: 'in', nz_pasi: 'in', au_ind: 'au',
  gb_pak: 's', gb_ind: 's', my_ind: 's', lk_tamil: 's', za_ind: 's', in_adiv: 'ha', fr_magh: 'm', il_arab: 'm', tr_kurd: 'm', de_turk: 'm', roma: 'ro',
  th_malay: 'se', th_hill: 'se', vn_min: 'se', ru_turk: 'ca', za_white: 'n', za_col: 'co' };

/** 官方 skinW：CBY 由调用方传入（官方读全局，取值相同） */
function skinW(iso, e, CBY) {
  if (e && SKIN_G[e.g]) return SKIN_W[SKIN_G[e.g]];
  const c = CBY && CBY[iso];
  return SKIN_W[SKIN_CI[iso] || (c && { hi: 'n', eca: 'n', mena: 'm', sa: 's', eap: 'se', ssa: 'a', lac: 'l' }[c.p]) || 'n'];
}

const skinU = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; h = Math.imul(h ^ (h >>> 13), 2246822507) >>> 0; return (h >>> 0) / 4294967296; };
function skinPick(w, seed) { const t = w.reduce((a, b) => a + b, 0); let u = skinU(seed) * t; for (let i = 0; i < 6; i++) { u -= w[i]; if (u < 0) return i; } return 5; }
const skinMid = (a, b, seed) => skinU(seed) < 0.5 ? Math.floor((a + b) / 2) : Math.ceil((a + b) / 2);

/** 官方 nmSeed（官方 bundle L14056，逐字移植，S 显式传参） */
const nmSeed = (S) => (S && S.trans && S.trans.nm0) || (S && S.name && S.name.full) || '';
const skinSeed = (S) => nmSeed(S) + (S && S.born);
const skinMix = (S) => S.eth && S.eth.nat && (S.eth.g === 'kr_mix' || S.eth.g === 'jp_mix');

/** 官方 skinMe（S 显式传参，其余逐字照抄） */
function skinMe(S, CBY) {
  if (!S) return null;
  if (S.skn != null) return S.skn;
  if (S.adopt && S.adopt.mv != null) return (S.skn = S.adopt.sk != null ? S.adopt.sk : skinPick(skinW(S.adopt.from, S.adopt.k === 'dom' ? S.eth : null, CBY), (S.adopt.nm0 || '') + S.adopt.from));
  const sd = skinSeed(S);
  return (S.skn = skinMix(S) ? skinMid(skinPick(skinW(S.born, null, CBY), sd + 'h'), skinPick(skinW(S.eth.nat, null, CBY), sd + 'n'), sd) : skinPick(skinW(S.born, S.eth, CBY), sd));
}

/* ── 宠物（官方 L792–810 逐字移植） ─────────────────────────────────── */

const PX_PET = {
  d: ['..BBB........', '.EBBBB......T', '.EBkBB......T', 'NBBBBB.....T.', '..cBBBBBBBBB.', '...BBBBBBBBB.', '...BBwwwwBBB.', '...B.B...B.B.', '...B.B...B.B.'],
  c: ['B.B.........', 'BBB........T', 'BkBB.......T', 'NBBB......T.', '.BBBBBBBBBT.', '..BBBBBBBB..', '..BBwwwBBB..', '..B.B..B.B..'],
};
PX_PET.h = ['.B..B..', 'BBBBBB.', 'BkBBBBB', 'NBBBBBB', '.wwwww.'];
PX_PET.r = ['.B.....', '.BB....', '.BB....', 'BBBB...', 'kBBBBB.', 'NBBBBBw', '.BBBBBw', '..w..w.'];
PX_PET.b = ['..BB...', '.BkBB..', 'cBBBBB.', '.BBBww.', '..BBT..', 'yyyyyyy', '...y...', '...y...', '...y...', '..yyy..'];
PX_PET.f = ['GGGGGGGGGG', 'WWWWWWWWWW', 'WWWoWWWWWW', 'WWooWWWpWW', 'WWWoWWWpWW', 'WWWWWWpWWW', 'ssssssssss', 'GGGGGGGGGG', '.G......G.', '.G......G.'];

function pxPet(k, P) {
  if (!PX_PET[k]) k = 'c';
  if (k === 'f') return pxSprite(PX_PET.f, { G: P.ol, W: P.water2 || P.win, o: P.gold || P.accent, p: P.grass2, s: P.sand });
  const B = k === 'd' ? pxMix(P.trunk, P.sun || P.accent, 0.3) : k === 'h' ? pxMix(P.gold || P.sun, P.trunk, 0.35) : k === 'b' ? pxMix(P.grass, P.sun || P.accent, 0.25) : k === 'r' ? P.light(P.hairold, 0.3) : P.hairold, sh = P.shade(B, 0.28);
  return pxSprite(PX_PET[k], { B, E: sh, T: B, k: P.ol, N: k === 'b' ? P.gold || P.accent : P.ol, w: P.light(B, 0.4), c: k === 'b' ? P.gold || P.accent : P.accent, y: P.trunk });
}

/* ── 人物（官方 L812–860 逐字移植） ─────────────────────────────────── */

/** 官方 PX_PEOPLE；本项目的 ART.PEOPLE 与它逐值相同（test-shelf-fig 每次断言） */
const PX_PEOPLE = ART.PEOPLE;

function pxPerson(p, P, ot) {
  const kind = p.age < 3 ? 'baby' : p.age < 7 ? 'small' : p.age < 13 ? 'child' : p.age < 18 ? 'teen' : 'adult';
  const B = p.role === 'me' && ot ? ot[0] : P[p.role] || P.par, low = p.role === 'me' && ot ? ot[1] : P.pants;
  const D = p.sex === 'F' && p.role !== 'me' && p.role !== 'mourn' ? pxMix(B, P.light(B, 0.4), 0.3) : p.sex === 'F' ? B : low;
  const sk = p.sk != null && P['sk' + p.sk] ? P['sk' + p.sk] : P.skin;
  const map = { H: p.age >= 65 ? P.hairold : P.hair, S: sk, E: P.ol, c: pxMix(sk, P.accent, 0.38), m: P.shade(pxMix(sk, P.accent, 0.5), 0.2),
    B, b: P.shade(B, 0.22), P: low, D, d: P.shade(D, 0.25), F: P.ol };
  const s = pxSprite(PX_PEOPLE[p.sex === 'F' ? 'F' : 'M'][kind], map);
  if (p.aid === 'w' && kind !== 'baby') {
    const rows = PX_PEOPLE[p.sex === 'F' ? 'F' : 'M'][kind], hip = rows.findIndex(r => /[PDd]/.test(r));
    const W = s.w + 4, H = hip + 6, o = new PxR(W, H), fr = P.shade(P.trunk, 0.1), leg = p.sex === 'F' && map.D ? map.D : map.P;
    for (let j = 0; j < hip; j++) for (let i = 0; i < s.w; i++) { const c = s.get(i, j); if (c) o.px(i + 2, j + 1, c); }
    o.rect(3, hip + 1, s.w - 2, 2, leg);
    o.rect(4, hip + 3, 2, 1, leg); o.rect(s.w - 2, hip + 3, 2, 1, leg);
    o.rect(4, hip + 4, 2, 1, map.F); o.rect(s.w - 2, hip + 4, 2, 1, map.F);
    o.line(3, hip + 5, s.w, hip + 5, fr);
    for (const x of [0, W - 2]) { o.rect(x, hip - 1, 2, 6, P.ol); o.px(x + (x ? 0 : 1), hip - 2, P.ol); o.px(x + (x ? 0 : 1), hip + 5, P.ol); o.px(x + (x ? 1 : 0), hip + 2, fr); }
    o.line(1, hip - 5, 1, hip - 2, fr); o.line(W - 2, hip - 5, W - 2, hip - 2, fr);
    return o;
  }
  if (p.aid === 'c' && kind !== 'baby') {
    const o = new PxR(s.w + 2, s.h); o.blit(s, 0, 0, null);
    o.line(s.w - 1, Math.floor(s.h * 0.62), s.w + 1, s.h - 2, [239, 237, 230]); o.px(s.w + 1, s.h - 1, P.accent || P.ol);
    return o;
  }
  if (p.age < 75 || kind !== 'adult') return s;
  const o = new PxR(s.w + 2, s.h); o.blit(s, 0, 0, null);
  o.line(s.w + 1, 9, s.w + 1, s.h - 1, P.trunk); o.px(s.w, 9, P.trunk);
  return o;
}

/* ── 房间配色与服装（官方 L2782–2784 逐字移植） ─────────────────────── */

const OUTFITS = { ot_me: ['#2E9C90', '#3F4A57'], ot_navy: ['#3E4E72', '#2C3442'], ot_red: ['#C8555B', '#4A4F5C'], ot_yellow: ['#E9C25B', '#56606B'],
  ot_white: ['#F3F0E8', '#5B6470'], ot_pink: ['#EBA6B9', '#5A5F6E'], ot_green: ['#6FA766', '#4C5560'], ot_black: ['#3A3E44', '#2A2D31'] };

/** 官方 roomPal() = pxPalette('light')（官方 pxPalette 读 DOM，小程序版直接指定 light） */
const roomPal = () => pxPalette('light');

const chibi = (p, ot) => pxPerson(p, roomPal(), p.role === 'me' ? (OUTFITS[ot] || OUTFITS.ot_me).map(pxRGB) : null);

/* ── 陈列架（官方 L3850–3884 逐字移植） ─────────────────────────────── */

const SHELF_OT = ['ot_red', 'ot_yellow', 'ot_pink', 'ot_green', 'ot_navy', 'ot_me', 'ot_white'];

function shelfFig(f, CBY) {
  const P = roomPal(), sk = Number.isInteger(f.sk) && f.sk >= 0 && f.sk <= 5 ? f.sk : skinPick(skinW(f.iso, null, CBY), f.seed);
  const ot = f.ot && OUTFITS[f.ot] ? f.ot : SHELF_OT[Math.floor(skinU(f.seed + 'ot') * SHELF_OT.length)];
  const age = Math.max(0, Math.min(125, +f.age || 0)), p = { role: 'me', sex: f.sex === 'F' ? 'F' : 'M', age, sk };
  if ((f.ad === 'w' || f.ad === 'c') && age >= (+f.adA || 0) && !(f.ad === 'c' && age < 6)) p.aid = f.ad;
  const me = chibi(p, ot);
  const pet = f.pet && PX_PET[f.pet] ? pxPet(f.pet, P) : null;
  const r = new PxR(me.w + (pet ? pet.w + 2 : 0) + 2, Math.max(me.h, pet ? pet.h : 0) + 2);
  r.blit(me, 1, r.h - 1 - me.h, P.ol);
  if (pet) r.blit(pet, me.w + 3, r.h - 1 - pet.h, P.ol);
  return r;
}

/**
 * 官方 petOfRoom(rm)（官方 bundle L23582，逐字移植）：
 * 房间里养的是狗还是猫。
 */
const petOfRoom = (rm) => {
  const it = Object.values((rm && rm.it) || {});
  return it.includes('l_dog') ? 'd' : it.includes('l_cat') ? 'c' : undefined;
};

/**
 * 官方 shelfPetOf(St)：从人生里的场景记录统计出现最多的宠物。
 * （官方 bundle L23571，逐字移植）
 */
function shelfPetOf(St) {
  const n = {}; for (const y of (St && St.years) || []) { const k = y && typeof y.sc === 'string' ? y.sc.split('|')[7] : ''; if (k && PX_PET[k]) n[k] = (n[k] || 0) + 1; }
  let b = '', m = 0; for (const k in n) if (n[k] > m) { m = n[k]; b = k; }
  return b || undefined;
}

/**
 * 官方 lifeFig(l)：把一段人生摘要转成「画谁」的参数。
 * @param {object} l 人生摘要（官方 LIVES_KEY 的一行）
 * @param {object} mem 该人生对应的追思馆信息（官方 SH.mem[at] = {id, ot, pet}）
 */
function lifeFig(l, mem) {
  const m = mem && mem[String(l.at)];
  const f = { sex: l.sex, age: l.age, sk: l.sk, iso: l.iso, seed: (l.name || '') + l.iso, ot: m && m.ot, pet: l.pt || (m && m.pet) };
  if (l.ad) { f.ad = l.ad; f.adA = l.adA; }
  return f;
}

/**
 * 官方 roomFig(c)（官方 bundle L23580，逐字移植）：
 * 一间房对应的人物参数（房间里住的是哪一段人生）。
 */
function roomFig(c, mem) {
  const me = c.cm && (c.cm.people || []).find((p) => p.role === 'me');
  const f = { sex: c.sex, age: c.age, sk: me && me.sk, iso: c.iso, seed: (c.name || '') + c.iso, ot: c.rm && c.rm.ot, pet: petOfRoom(c.rm) };
  if (me && (me.aid === 'w' || me.aid === 'c')) f.ad = me.aid;
  return f;
}

module.exports = {
  SKIN_W, SKIN_C, SKIN_CI, SKIN_G,
  skinW, skinU, skinPick, skinMid, skinSeed, skinMix, skinMe,
  PX_PET, pxPet, PX_PEOPLE, pxPerson,
  OUTFITS, roomPal, chibi,
  SHELF_OT, shelfFig, lifeFig, shelfPetOf, petOfRoom, roomFig,
};

},
"scene": (module, load) => {
/**
 * 房间画面（官方 `pxRoom()` 整套）—— 官方 v0.8.51 AST 移植
 * ============================================================================
 *
 * 官方来源（冻结基线 vendor/official/ui.zh-hans.0.8.51.js）。
 * 以下行号是最初 v0.8.15 搬运记录；当前定位使用 AST 名称。
 *   lvRand                              L624
 *   PX                                  L724
 *   VIEW_M                              L2830
 *   rsp                                 L2776
 *   HOME / ROOM_SLOTS / SLOT_IDS / HOME_ITEMS / itemOf / isLifeItem /
 *   haveItem / LIFE_ORDER / PROP_LI / liOf / roomDefault / cleanRoom /
 *   photoMoms / roomOf                  L2668–2763
 *   roomWall / roomFloor                L2788 / L2810
 *   RX / itemArt / ITEM_CACHE / itemSprite / PHOTO_CACHE / photoWall /
 *   roomItemSp                          L2936–3348
 *   pxRoom / roomSpots / ROOM_ACT / ROOM_SEAT / ACT_LOOK / ROOM_SIGN  L3350–3412
 *   roomWindow / roomLight              L2907 / L2929
 *   roomCtxCard                         L3633
 *   窗外实时场景（整套场景系统）         L844–1250
 *   viewScene / photoPrint              L2831 / L3342
 *
 * 本文件是**脚本生成**的（scripts/port-room-art.mjs），
 * 移植区与官方**逐字节相同**；scripts/test-room-fig.mjs 会重新抠一遍来核对。
 *
 * 依赖来自同分包的另外两个模块（也都是逐字移植）：
 *   · ./room.js   → RC / rmix / rlite / rdark / rc / ROOM / WIN（调色板与常量）
 *   · ./shelf.js  → PX_PEOPLE / pxPerson / pxPet / chibi / roomPal
 *                   （官方 L780 / L806–836 / L792–805 / L2784 / L2783）
 *   · ../../../art/pixel.js → PxR / pxSprite / pxRGB / pxMix / pxPalette / PX_BAYER
 *
 * ✅ **窗外实时场景 + moment 场景都已搬**：
 *   · 窗外 15 种风景：官方 `viewScene()` 那一族（pxSceneLayers / pxSky /
 *     pxCloud / pxTree / pxHome / pxWork …，L844–1250）。
 *   · 相框里的**出生照**：官方「moment 场景」子系统（MO / pxMoment / moCast
 *     / moFig … 约 1150 行，L1474–2620）——
 *     官方 `pxScene()` 里 `if (m.act && typeof pxMoment === 'function')`
 *     这条分支，本项目现在**同样成立**（pxMoment 已搬）⇒ 行为与官方一致。
 *
 * ⚠ 搬运清单是**自动算闭包**出来的（scripts/lib/room-port.mjs +
 *   scripts/lib/scope-usage.mjs）：起点手写，依赖递归带进来
 *   ⇒ 不会「漏搬一个符号导致家具静默消失」（2026-10-24 实测过这个坑）。
 *
 * 坐标与官方完全一致（192×108）⇒ 与第八轮那版房间画面可直接对照。
 */
const { PxR, pxSprite, pxRGB, pxMix, pxPalette, PX_BAYER } = load("pixel");
const { RC, rmix, rlite, rdark, rc, ROOM, WIN } = load("room");
const { PX_PEOPLE, pxPerson, pxPet, chibi, roomPal } = load("shelf");

/* ═══ OFFICIAL-BEGIN: lvRand ═══ */
function lvRand(e){let t=2166136261;for(const a of String(e))t^=a.charCodeAt(0),t=Math.imul(t,16777619);return()=>(t^=t<<13,t^=t>>>17,t^=t<<5,(t>>>0)%1e5/1e5);}
/* ═══ OFFICIAL-END: lvRand ═══ */

/* ═══ OFFICIAL-BEGIN: PX ═══ */
const PX={W:192,H:60,G:48};
/* ═══ OFFICIAL-END: PX ═══ */

/* ═══ OFFICIAL-BEGIN: PX_NEWBORN ═══ */
const PX_NEWBORN=["..WWWWW..",".WWHHHWW.",".WHSSSHW.",".WSESESW.",".WcSSScW.",".WWSSSWW.",".WwWWWwW.",".WWwWwWW.",".WWWwWWW.","..WWWWW..","...WWW..."];
/* ═══ OFFICIAL-END: PX_NEWBORN ═══ */

/* ═══ OFFICIAL-BEGIN: pxNewborn ═══ */
function pxNewborn(e,t){const a=t.light(t[e.role]||t.par,.6),n=e.sk!=null&&t["sk"+e.sk]?t["sk"+e.sk]:t.skin;return pxSprite(PX_NEWBORN,{W:a,w:t.shade(a,.14),H:t.hair,S:n,E:t.ol,c:pxMix(n,t.accent,.38)});}
/* ═══ OFFICIAL-END: pxNewborn ═══ */

/* ═══ OFFICIAL-BEGIN: pxSky ═══ */
function pxSky(e,t,a,n){const[s,o]=t.mood==="low"?a.sky[t.stage].map(u=>pxMix(pxRGB(u),a.cloudlow,.35)):a.sky[t.stage].map(pxRGB),r=[0,1,2,3,4].map(u=>pxMix(s,o,u/4));for(let u=0;u<PX.G;u++){const d=u/(PX.G-6)*4,m=Math.min(3,Math.floor(d)),h=Math.min(1,d-m),g=m<3?Math.max(0,(h-.7)/.3):0;for(let p=0;p<PX.W;p++)e.px(p,u,g>PX_BAYER[(u&3)*4+(p&3)]?r[m+1]:r[m]);}if(a.star&&t.mood!=="low")for(let u=0;u<14;u++)e.px(n()*PX.W,n()*22,a.star);const[i,l,c]={m:[30,14,4],d:[98,9,4],e:[166,21,5]}[t.stage],f=t.mood==="low"?pxMix(a.sun,a.cloudlow,.55):a.sun;e.disc(i,l,c+2,pxMix(f,e.get(i,l-c-3)||f,.6)),e.disc(i,l,c+1,pxMix(f,e.get(i,l-c-3)||f,.3)),e.disc(i,l,c,f),e.disc(i-1,l-1,c-2,t.mood==="low"?f:a.sunhi);}
/* ═══ OFFICIAL-END: pxSky ═══ */

/* ═══ OFFICIAL-BEGIN: pxCloud ═══ */
function pxCloud(e,t,a,n,s,o,r){const i=new PxR(n+8,14),l=3+Math.floor(n/8),c=r?s.cloudlow:s.cloud,f=r?s.cloudlowsh:s.cloudsh;for(let u=0;u<l;u++){const d=4+(u+.5)*n/l,m=2+Math.round(o()*2)+(u>0&&u<l-1?1:0);i.disc(d,12-m,m,c);}i.rect(4,10,n,3,c);for(let u=0;u<i.w;u++)i.d[13*i.w+u]=null;for(let u=0;u<i.w;u++)i.get(u,12)&&i.px(u,12,f),i.get(u,11)&&o()<.5&&i.px(u,11,f);e.blit(i,Math.round(t-i.w/2),a-12,null);}
/* ═══ OFFICIAL-END: pxCloud ═══ */

/* ═══ OFFICIAL-BEGIN: pxBirds ═══ */
function pxBirds(e,t,a){for(let n=0;n<3;n++){const s=60+a()*70,o=6+a()*12;e.px(s-1,o-1,t.ol),e.px(s,o,t.ol),e.px(s+1,o-1,t.ol);}}
/* ═══ OFFICIAL-END: pxBirds ═══ */

/* ═══ OFFICIAL-BEGIN: pxBuilding ═══ */
function pxBuilding(e,t,a,n,s,o,r,i,l={}){const c=s-n;e.rect(t,c,a,n,o),e.rect(t,c,a,1,pxMix(o,[255,255,255],.12)),l.step&&a>7&&e.rect(t+2,c-3,a-4,3,o),l.antenna&&e.line(t+(a>>1),c-(l.step?3:0)-5,t+(a>>1),c-(l.step?3:0),o);for(let f=c+2;f<s-2;f+=3)for(let u=t+1;u<t+a-1;u+=2)i()<.7&&e.px(u,f,l.lit&&i()<.4?l.lit:r);}
/* ═══ OFFICIAL-END: pxBuilding ═══ */

/* ═══ OFFICIAL-BEGIN: pxHills ═══ */
function pxHills(e,t,a,n,s,o,r,i){const l=a()*6,c=a()*6;for(let f=0;f<PX.W;f++){const u=Math.round(s-o*(.6+.4*Math.sin(f*n+l))-o*.35*Math.sin(f*n*2.7+c));for(let d=u;d<PX.G;d++)e.px(f,d,r);i&&e.px(f,u,i);}}
/* ═══ OFFICIAL-END: pxHills ═══ */

/* ═══ OFFICIAL-BEGIN: pxTree ═══ */
function pxTree(e,t,a,n,s){if(n==="pine"){for(let o=0;o<9;o++){const r=1+(o>>1);for(let i=-r;i<=r;i++)e.px(t+i,a-12+o,i<0?s.tree2:s.tree);}e.rect(t,a-3,1,3,s.trunk),e.px(t,a-12,s.treehi);return;}if(n==="palm"){for(let i=0;i<11;i++)e.px(t+Math.round(Math.sin(i/4)*1.5),a-1-i,i%3?s.trunk:s.shade(s.trunk,.3));const o=t+Math.round(Math.sin(10/4)*1.5),r=a-12;for(const[i,l]of[[-5,3],[-4,-1],[0,-3],[4,-1],[5,3]])e.line(o,r,o+i,r+l,s.tree);e.px(o,r,s.tree2);return;}if(n==="acacia"){e.line(t,a-1,t,a-8,s.trunk),e.line(t,a-6,t-3,a-9,s.trunk),e.line(t,a-6,t+3,a-9,s.trunk),e.rect(t-7,a-11,15,2,s.tree),e.rect(t-5,a-12,11,1,s.treehi),e.rect(t-6,a-9,13,1,s.tree2);return;}e.rect(t,a-4,1,4,s.trunk),e.disc(t,a-8,4,s.tree),e.disc(t+1,a-7,2,s.tree2),e.px(t-2,a-10,s.treehi),e.px(t-1,a-11,s.treehi);}
/* ═══ OFFICIAL-END: pxTree ═══ */

/* ═══ OFFICIAL-BEGIN: pxTreeKind ═══ */
const pxTreeKind=e=>e==="ssa"?"acacia":["mena","lac","sa","\
eap"].includes(e)?"palm":e==="hi"||e==="eca"?"pine":"round";
/* ═══ OFFICIAL-END: pxTreeKind ═══ */

/* ═══ OFFICIAL-BEGIN: pxBackdrop ═══ */
function pxBackdrop(e,t,a,n){const s=PX.G;if(t.urban){let o=-4;for(;o<PX.W;){const r=6+Math.round(n()*9),i=10+Math.round(n()*17);pxBuilding(e,o,r,i,s-2,a.far1,pxMix(a.far1,a.wall,.35),n,{step:n()<.3,antenna:n()<.25}),o+=r+1+Math.round(n()*3);}for(o=10+Math.round(n()*10);o<PX.W;){const r=9+Math.round(n()*9),i=13+Math.round(n()*15);if(t.region==="mena"&&n()<.35){e.rect(o,s-10,14,10,a.far2),e.disc(o+7,s-11,5,a.far2),e.rect(o+16,s-24,3,24,a.far2),e.rect(o+15,s-25,5,1,a.far2),e.px(o+17,s-27,a.far2),o+=22;continue;}pxBuilding(e,o,r,i,s-1,a.far2,pxMix(a.far2,a.win,.5),n,{step:n()<.25,lit:a.lit?a.winlit:t.stage==="e"?pxMix(a.winlit,a.far2,.4):0}),n()<.2&&(e.rect(o+2,s-1-i-6,5,4,a.far2),e.line(o+3,s-1-i-2,o+3,s-1-i,a.far2),e.line(o+5,s-1-i-2,o+5,s-1-i,a.far2)),o+=r+8+Math.round(n()*16);}}else if(t.region==="mena")pxHills(e,a,n,.035,s-6,8,pxMix(a.sand,pxRGB(a.sky[t.stage][1]),.35),null),pxHills(e,a,n,.05,s-1,5,a.sand,a.light(a.sand,.2));else{pxHills(e,a,n,.04,s-10,8,a.hill1,a.light(a.hill1,.15));for(let o=0;o<18;o++){const r=n()*PX.W,i=s-6-n()*8;e.get(r,i)&&e.get(r,i)[0]===a.hill1[0]&&(e.px(r,i,a.tree2),e.px(r+1,i,a.tree),e.px(r,i-1,a.tree));}if(pxHills(e,a,n,.06,s-2,5,a.hill2,a.light(a.hill2,.15)),t.region==="sa"||t.region==="eap")for(let o=1;o<4;o++)for(let r=0;r<PX.W;r+=1){const i=s-2-o*2;e.get(r,i)&&e.get(r,i-1)&&(r+o)%3&&e.px(r,i,a.light(a.hill2,.25));}}if(t.war)for(const[o,r]of[[120,7],[138,5]])for(let i=r-1;i>=0;i--){const l=o+i*2+Math.round(Math.sin(i)*2),c=s-8-i*4,f=2+(i>>1);e.disc(l,c,f,a.shade(a.smoke,.15)),e.disc(l-1,c-1,f-1,i%2?a.smoke:a.light(a.smoke,.1));}}
/* ═══ OFFICIAL-END: pxBackdrop ═══ */

/* ═══ OFFICIAL-BEGIN: pxPole ═══ */
function pxPole(e,t,a,n){const s=n?a.metal:a.trunk,o=PX.G-30;e.rect(t,o,2,30,s),e.rect(t+1,o,1,30,a.shade(s,.25)),e.rect(t-5,o+3,12,1,s),e.rect(t-3,o+7,8,1,s);for(const i of[-5,6])e.px(t+i,o+2,a.wall2);const r=pxMix(a.ol,pxRGB(a.sky.d[1]),.4);for(const[i,l]of[[-5,3],[6,3]])for(let c=0;c<PX.W;c++){const f=c<t+i?[-40,t+i]:[t+i,PX.W+60],u=(c-f[0])/(f[1]-f[0]);e.px(c,Math.round(o+l+16*u*(1-u)),r);}}
/* ═══ OFFICIAL-END: pxPole ═══ */

/* ═══ OFFICIAL-BEGIN: pxFence ═══ */
function pxFence(e,t,a){if(!t.urban&&t.region==="mena")return;const n=PX.G,s=t.urban?a.metal:a.trunk,o=t.prop==="boat"?126:PX.W;for(let r=0;r<o;r++)e.px(r,n-4,s),t.urban||e.px(r,n-2,s),r%6===0&&e.rect(r,n-5,1,5,a.shade(s,.2));}
/* ═══ OFFICIAL-END: pxFence ═══ */

/* ═══ OFFICIAL-BEGIN: pxGround ═══ */
function pxGround(e,t,a,n){const s=PX.G,o=PX.W,r=PX.H;if(t.urban){e.rect(0,s,o,3,a.pave);for(let d=0;d<o;d+=7)e.px(d,s+1,a.pave2);e.rect(0,s+3,o,1,a.pave2),e.rect(0,s+4,o,r-s-4,a.road);for(let d=3;d<o;d+=12)e.rect(d,s+8,6,1,a.roadline);for(let d=0;d<o;d++)n()<.08&&e.px(d,s+5+n()*6,a.shade(a.road,.25));return;}const i=t.region==="mena",l=i?a.sand:a.grass,c=i?a.sand2:a.grass2,f=i?a.sand2:a.soil,u=i?a.shade(a.sand2,.2):a.soil2;e.rect(0,s,o,2,l),e.rect(0,s,o,1,i?a.light(a.sand,.2):a.grasshi),e.rect(0,s+2,o,r-s-2,f);for(let d=0;d<o;d++)n()<.5&&e.px(d,s+2,c),n()<.12&&e.px(d,s+3+n()*(r-s-4),n()<.5?u:a.stone),!i&&n()<.22&&(e.px(d,s-1,c),n()<.4&&e.px(d,s-2,l));e.rect(0,r-1,o,1,u);}
/* ═══ OFFICIAL-END: pxGround ═══ */

/* ═══ OFFICIAL-BEGIN: pxCurtain ═══ */
const pxCurtain=(e,t)=>t?e.shade(e.winlit,.3):e.dark?pxMix(e.win,e.accent,.3):e.light(e.accent,.55);
/* ═══ OFFICIAL-END: pxCurtain ═══ */

/* ═══ OFFICIAL-BEGIN: pxWindow ═══ */
function pxWindow(e,t,a,n,s,o,r=!0,i=4){const l=o?n.winlit:n.win,c=n.light(n.trunk,n.dark?.1:.25),f=pxCurtain(n,o);e.rect(t-1,a-1,i+2,5,c),e.rect(t,a,i,3,l),e.px(t+1,a,n.light(l,.4)),e.px(t+i-2,a+1,n.light(l,.25)),e.px(t,a,f),e.px(t+i-1,a,f),e.px(t,a+1,f),e.px(t+i-1,a+1,f),r&&(e.rect(t-1,a+4,i+2,1,n.light(s,.35)),e.rect(t-1,a+5,i+2,1,n.shade(s,.2)));}
/* ═══ OFFICIAL-END: pxWindow ═══ */

/* ═══ OFFICIAL-BEGIN: pxHouse ═══ */
function pxHouse(e,t,a,n,s,o,r={}){const i=new PxR(t+4+(r.wing||0),a+n),l=2+t/2-.5;for(let f=0;f<n;f++){const u=Math.round((f+1)*(t/2+2)/n),d=Math.ceil(l-u),m=Math.floor(l+u);for(let h=d;h<=m;h++)i.px(h,f,f===n-1?e.shade(s,.3):f%2?e.shade(s,.12):(h+f)%4?s:e.light(s,.12));f<n-1&&(i.px(d,f,e.light(s,.22)),i.px(m,f,e.shade(s,.2)));}if(r.thatch)for(let f=0;f<n;f++)for(let u=0;u<i.w;u++)i.get(u,f)&&(u+f*2)%3===0&&i.px(u,f,e.thatch2);if(i.rect(2,n,t,a,o),i.rect(2+t-2,n,2,a,e.shade(o,.1)),i.rect(2,n,t,1,e.shade(o,.22)),r.thatch)for(let f=n+3;f<n+a-1;f+=3)for(let u=3+f%2*2;u<2+t-2;u+=5)i.px(u,f,e.shade(o,.12));else for(let f=n+3;f<n+a-1;f+=3)i.rect(3,f,t-4,1,pxMix(o,e.shade(o,.1),.5));if(i.rect(2,n+a-1,t,1,r.thatch?e.shade(o,.25):pxMix(e.stone,o,.3)),r.chimney&&(i.rect(2+t-6,Math.max(0,n-7),3,4,e.brick),i.rect(2+t-7,Math.max(0,n-8),5,1,e.shade(e.brick,.25))),!r.noWin)for(const f of[4,2+t-7])pxWindow(i,f,n+3,e,o,r.lit);const c=Math.round(l)-1;return r.thatch?i.rect(c,n+a-6,3,6,e.ol):(i.rect(c-1,n+a-7,5,7,e.shade(o,.3)),i.rect(c,n+a-6,3,6,e.trunk),i.rect(c,n+a-6,1,6,e.light(e.trunk,.15)),i.px(c+2,n+a-3,e.gold),r.lit&&i.px(c+1,n+a-5,e.shade(e.winlit,.2))),r.wing&&(i.rect(2+t,n+a-10,r.wing,10,e.wall2),i.rect(2+t,n+a-11,r.wing,1,e.shade(e.wall2,.2)),i.rect(2+t,n+a-1,r.wing,1,pxMix(e.stone,e.wall2,.3)),pxWindow(i,2+t+3,n+a-7,e,e.wall2,r.lit)),i;}
/* ═══ OFFICIAL-END: pxHouse ═══ */

/* ═══ OFFICIAL-BEGIN: pxHome ═══ */
function pxHome(e,t,a){const n=t.lit||e.stage==="e";switch(e.home){case"tent":{const s=new PxR(26,14);for(let o=1;o<14;o++){const r=o;for(let i=13-r;i<13+r;i++)s.px(i,o,o===9||o===10?t.stamp:i<13?t.light(t.wall2,.25):t.wall2);}for(let o=7;o<14;o++){const r=1+(o-7>>1);for(let i=13-r;i<13+r;i++)s.px(i,o,t.ol);}return s.px(12,0,t.trunk),s.px(13,0,t.trunk),s;}case"prison":{const s=new PxR(42,24);s.rect(0,4,42,20,t.wall3),s.rect(0,4,42,1,t.light(t.wall3,.15));for(let o=0;o<42;o++)s.px(o,2+(o>>1)%2,t.ol);for(let o=0;o<4;o++){s.rect(4+o*10,9,5,5,t.ol);for(let r=1;r<5;r+=2)s.rect(4+o*10+r,9,1,5,t.metal);}return s.rect(17,18,6,6,t.shade(t.wall3,.35)),s;}case"hut":return pxHouse(t,18,9,10,t.thatch,t.mud,{thatch:!0,noWin:!0});case"flat":{const s=new PxR(30,40);s.rect(0,2,30,38,t.wall),s.rect(26,2,4,38,t.shade(t.wall,.1)),s.rect(0,2,30,1,t.shade(t.wall,.25)),s.rect(4,0,6,2,t.wall2),s.rect(20,0,3,2,t.metal);for(let o=0;o<5;o++){const r=5+o*6;s.rect(0,r+4,30,1,t.shade(t.wall,.12));for(let i=0;i<4;i++){const l=n&&a()<.5,c=l?t.winlit:t.win,f=3+i*7;s.rect(f-1,r-1,6,5,t.shade(t.wall,.16)),s.rect(f,r,4,3,c),s.px(f,r,t.light(c,.3)),s.px(f+3,r,pxCurtain(t,l)),a()<.3&&(s.rect(f-1,r+2,6,1,t.metal),s.px(f-1,r+3,t.metal),s.px(f+4,r+3,t.metal),a()<.5&&s.px(f+1+(a()*2|0),r+1,t.tree));}}return s.rect(11,33,8,1,t.accent),s.rect(11,34,8,6,t.shade(t.wall,.3)),s.rect(12,34,6,6,t.ol),s.rect(13,35,4,4,n?t.winlit:t.win),s.rect(15,35,1,4,t.shade(t.wall,.3)),s;}case"house":return pxHouse(t,26,13,10,t.roof,t.wall,{chimney:!0,lit:n});case"villa":{const s=pxHouse(t,32,15,11,t.roof,t.wall,{chimney:!0,lit:n,wing:12});for(let o=0;o<s.w;o++)s.px(o,s.h-1,t.tree2),o%3&&s.px(o,s.h-2,t.tree);return s;}case"small":return pxHouse(t,17,10,8,t.roof,t.wall,{lit:n});case"mansion":case"estate":{const s=e.home==="estate",o=s?36:32,r=s?28:21,i=11,l=pxHouse(t,o,r,i,t.roof2,t.wall,{chimney:!0,lit:n,wing:s?12:10});for(const[c,f]of s?[[0,i+10],[1,i+17]]:[[0,i+10]]){l.rect(2,f-2,o,1,t.shade(t.wall,.18));for(let u=0;u<4;u++)pxWindow(l,4+u*Math.round((o-8)/3),f,t,t.wall,n&&(u+c)%2,!1);}if(s){const c=Math.round(2+o/2)-1;for(const f of[-4,4])l.rect(c+f,i+r-7,1,7,t.wall2);for(let f=0;f<l.w;f++)l.px(f,l.h-1,t.tree2),f%4&&l.px(f,l.h-2,t.tree),f%6===1&&l.px(f,l.h-3,t.treehi);for(const f of[1,l.w-2])l.rect(f,l.h-6,1,5,t.ol),l.px(f,l.h-7,n?t.winlit:t.gold);}else for(let c=0;c<l.w;c++)l.px(c,l.h-1,t.tree2),c%3&&l.px(c,l.h-2,t.tree);return l;}default:return pxHouse(t,20,11,9,t.roof,t.wall,{lit:n});}}
/* ═══ OFFICIAL-END: pxHome ═══ */

/* ═══ OFFICIAL-BEGIN: pxCar ═══ */
function pxCar(e,t){return pxSprite(["....CCCCCC....","...CwwCwwwC....","..CCwwCwwwCC...","CCCCCCCCCCCCCCC","CCCCCCCCCCCCCCY","cc.OO.cccc.OO.c","...OO......OO.."],{C:t,c:e.shade(t,.3),w:e.win,O:e.ol,Y:e.gold});}
/* ═══ OFFICIAL-END: pxCar ═══ */

/* ═══ OFFICIAL-BEGIN: pxMoto ═══ */
function pxMoto(e,t){return pxSprite([t?"GGG.......HH..":"..........HH..",t?"GGG.SSSS..H...":"....SSSS..H...","..MMMMMMMMMMY.","..O...MM...O..",".OhO......OhO.","..O........O.."],{M:e.accent,G:e.gold,O:e.ol,S:e.ol,H:e.metal,h:e.metal,Y:e.gold});}
/* ═══ OFFICIAL-END: pxMoto ═══ */

/* ═══ OFFICIAL-BEGIN: pxWork ═══ */
function pxWork(e,t,a,n){const s=PX.G,o=a.lit||t.stage==="e";switch(t.prop){case"office":{pxBuilding(e,150,12,26,s,a.wall2,a.win,n,{lit:o?a.winlit:0});const r=new PxR(22,42);r.rect(0,2,22,40,a.wall3),r.rect(18,2,4,40,a.shade(a.wall3,.12)),r.rect(10,0,1,2,a.metal);for(let i=6;i<34;i+=4)for(let l=2;l<18;l+=4){const c=o&&n()<.45;r.rect(l,i,3,2,c?a.winlit:a.win);}r.rect(7,35,8,7,a.ol),r.rect(8,36,6,6,a.win),e.blit(r,164,s-42,a.ol),e.px(174,s-45,a.accent);return;}case"factory":{const r=new PxR(40,20);for(let i=0;i<3;i++)for(let l=0;l<5;l++){const c=Math.round((l+1)*12/5);r.rect(i*12+12-c,l,c,1,a.wall2),r.px(i*12+11,l,a.win);}r.rect(0,5,40,15,a.wall2),r.rect(0,9,40,2,a.win),r.rect(4,13,8,7,a.shade(a.wall2,.35)),e.blit(r,140,s-20,a.ol),e.rect(176,s-34,5,34,a.brick),e.rect(176,s-30,5,2,a.wall),e.rect(176,s-34,5,1,a.shade(a.brick,.3));for(let i=0;i<4;i++)e.disc(180+i*3,s-38-i*3,2+(i>>1),i%2?a.smoke:a.light(a.smoke,.15));return;}case"school":{const r=pxHouse(a,34,16,8,a.stamp,a.wall,{lit:!1});r.rect(18,4,3,3,a.wall),r.px(19,5,a.ol),e.blit(r,146,s-r.h,a.ol),e.line(164,s-r.h-1,164,s-r.h-12,a.metal),e.rect(165,s-r.h-12,6,4,a.stamp);return;}case"clinic":{const r=new PxR(32,22);r.rect(0,2,32,20,a.wall),r.rect(0,2,32,1,a.shade(a.wall,.2)),r.rect(28,2,4,20,a.shade(a.wall,.1)),r.rect(14,4,4,10,a.accent),r.rect(11,7,10,4,a.accent);for(const i of[3,23])r.rect(i,8,5,4,a.win);r.rect(13,15,6,7,a.ol),r.rect(14,16,4,6,a.win),e.blit(r,148,s-22,a.ol);return;}case"dome":{const r=new PxR(46,28);r.disc(23,13,9,a.wall2),r.rect(13,13,21,3,a.wall2);for(let i=16;i<31;i+=3)r.rect(i,8,1,6,a.light(a.wall2,.15));r.rect(2,15,42,2,a.wall),r.rect(4,17,38,11,a.wall);for(let i=6;i<42;i+=4)r.rect(i,18,2,10,a.shade(a.wall,.15));r.rect(19,21,8,7,a.ol),e.blit(r,142,s-28,a.ol),e.line(165,s-29,165,s-38,a.metal),e.rect(166,s-38,5,3,a.accent);return;}case"rocket":{for(let i=s-40;i<s;i++)e.px(176,i,a.metal),e.px(181,i,a.metal),(i&3)===0&&e.line(176,i,181,i+3,a.metal);const r=pxSprite(["..A..",".AAA.",".WWW.","WWWWW","WWOWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","WWWWW","AWWWA","AWWWA","A...A"],{A:a.accent,W:a.wall,O:a.win});e.blit(r,168,s-r.h-2,a.ol),e.rect(164,s-2,20,2,a.wall3);return;}case"crane":{const r=new PxR(24,18);for(let i=0;i<18;i+=5)r.rect(0,i,24,1,a.wall3);for(let i=0;i<24;i+=6)r.rect(i,0,1,18,a.wall3);r.rect(0,10,24,8,a.wall2),e.blit(r,138,s-18,a.ol);for(let i=s-42;i<s;i++)e.px(168,i,a.crane),e.px(171,i,a.crane),(i&3)===0&&e.line(168,i,171,i+3,a.crane);e.rect(146,s-43,46,2,a.crane),e.rect(150,s-46,6,3,a.wall3),e.line(186,s-41,186,s-28,a.ol),e.rect(183,s-28,7,3,a.wall3);return;}case"flag":{const r=pxHouse(a,22,12,4,a.wall3,a.wall2,{lit:!1});e.blit(r,146,s-r.h,a.ol),e.line(178,s-1,178,s-26,a.metal),e.rect(179,s-26,7,2,a.accent),e.rect(179,s-24,7,2,a.wall);return;}case"pole":{e.rect(170,s-34,2,34,a.trunk),e.rect(163,s-31,16,1,a.trunk),e.rect(165,s-22,6,6,a.metal),e.px(167,s-20,a.gold);for(let r=s-18;r<s;r+=3)e.rect(172,r,2,1,a.metal);return;}default:return;}}
/* ═══ OFFICIAL-END: pxWork ═══ */

/* ═══ OFFICIAL-BEGIN: pxFore ═══ */
function pxFore(e,t,a,n,s){const o=PX.G;switch(t.prop){case"crops":{e.rect(132,o,60,10,a.soil);for(let r=0;r<4;r++)e.rect(132,o+2+r*3,60,1,a.soil2);for(let r=0;r<4;r++)for(let i=134+r%2*2;i<190;i+=4){const l=o+1+r*3;e.px(i,l,a.tree2),e.px(i-1,l-1,a.tree),e.px(i+1,l-1,a.tree),e.px(i,l-2,r?a.tree:a.treehi);}return;}case"herd":{const r=pxSprite([".WWWW...","WWWWWWK.","WWWWWWKK","WWWWWW..",".K..K..."],{W:a.light(a.wall,.4),K:a.ol});for(const i of[140,156,172])e.blit(r,i,o-5,null);return;}case"boat":{e.rect(128,o,64,PX.H-o,a.water);for(let i=128;i<PX.W;i++)e.px(i,o,a.water2),i*7%11<2&&e.px(i,o+4+i%3*3,a.water2);const r=pxSprite(["........M.......",".......MSS......",".......MSSS.....",".......MSSSS....",".......MSSSSS...","HHHHHHHHHHHHHHHH",".hhhhhhhhhhhhhh.","..hhhhhhhhhhhh.."],{M:a.trunk,S:a.wall,H:a.brick,h:a.shade(a.brick,.3)});e.blit(r,150,o-5,a.ol);return;}case"stall":{const r=new PxR(34,16);for(let i=0;i<34;i++){const l=(i>>2)%2?a.wall:a.accent;r.rect(i,0,1,3,l),i%4<2&&r.px(i,3,l);}r.rect(1,4,1,12,a.trunk),r.rect(32,4,1,12,a.trunk),r.rect(2,9,30,2,a.trunk),r.rect(4,11,26,5,a.shade(a.trunk,.2));for(let i=4;i<30;i+=3)r.px(i,8,[a.gold,a.tree,a.accent][(i/3|0)%3]);e.blit(r,142,o-16,a.ol);return;}case"laundry":{e.line(140,o-1,140,o-18,a.trunk),e.line(184,o-1,184,o-18,a.trunk);for(let r=140;r<=184;r++){const i=(r-140)/44;e.px(r,o-17+4*i*(1-i)*3,a.ol);}[a.stamp,a.gold,a.accent,a.light(a.wall,.3),a.stamp].forEach((r,i)=>{const l=145+i*8,c=(l-140)/44,f=Math.round(o-16+4*c*(1-c)*3);e.rect(l,f,5,6+i%2*2,r);});return;}case"bench":{e.blit(pxSprite(["BBBBBBBBBBBB","............","BBBBBBBBBBBB","b..........b","b..........b"],{B:a.trunk,b:a.ol}),150,o-5,null),e.line(170,o-1,170,o-20,a.metal),e.rect(168,o-22,5,2,a.metal),e.px(170,o-20,a.gold);return;}case"sign":{e.line(160,o-1,160,o-18,a.trunk),e.blit(pxSprite(["SSSSSSSSS.","SSSSSSSSSS","SSSSSSSSS."],{S:a.stamp}),161,o-18,a.ol),e.blit(pxSprite([".SSSSSSSSS","SSSSSSSSSS",".SSSSSSSSS"],{S:a.stamp}),150,o-12,a.ol);return;}case"truck":{e.blit(pxSprite(["WWWWWWWWWWWW......","WWWWWWWWWWWWCCCC..","WWWWWWWWWWWWCwwCC.","WWWWWWWWWWWWCCCCCC","WWWWWWWWWWWWCCCCCY","cc.OO.cccccc.OO.cc","...OO........OO..."],{W:a.wall2,C:a.accent,c:a.shade(a.wall2,.3),w:a.win,O:a.ol,Y:a.gold}),150,o-7,a.ol);return;}case"moto":e.blit(pxMoto(a,!0),156,o-5,null);return;case"easel":{e.line(152,o-1,158,o-20,a.trunk),e.line(164,o-1,158,o-20,a.trunk),e.line(158,o-20,158,o-1,a.trunk),e.blit(pxSprite(["WWWWWWWWWW","WWWWWWWWWW","WWSSWWGGWW","WSSSWGGGWW","WWWWTTTTWW","WWWTTTTTTW","WWWWWWWWWW"],{W:a.light(a.wall,.3),S:pxRGB(a.sky.d[0]),G:a.gold,T:a.tree}),153,o-17,a.ol);return;}case"mic":{e.blit(pxSprite(["AAAAAAAAAA","AKKKKKKKKA","AKKkkkkKKA","AKkKKKKkKA","AKkKKKKkKA","AKKkkkkKKA","AKKKKKKKKA","AAAAAAAAAA"],{A:a.wall3,K:a.ol,k:a.metal}),146,o-8,a.ol),e.line(164,o-1,164,o-17,a.metal),e.line(161,o-1,167,o-1,a.metal),e.rect(163,o-20,3,3,a.ol),e.blit(pxSprite(["..H..","..N..","..N..","..N..","..N..","..N..",".BBB.","BBBBB","BBOBB","BBBBB",".BBB.","BBBBB","BBBBB",".BBB."],{H:a.ol,N:a.trunk,B:a.gold,O:a.ol}),172,o-14,a.ol);return;}case"bundle":e.blit(pxSprite([".GG.","GGGG","GGGG",".GG."],{G:a.thatch}),s+2,o-4,a.ol);return;case"toys":e.disc(s+4,o-2,2,a.accent),e.px(s+3,o-3,a.light(a.accent,.4));return;default:return;}}
/* ═══ OFFICIAL-END: pxFore ═══ */

/* ═══ OFFICIAL-BEGIN: pxPeopleLay ═══ */
function pxPeopleLay(e,t,a,n,s){const o=n+a.w+(e.car||e.moto?19:4),r=!e.prop||["none","toys","b\
undle"].includes(e.prop)?PX.W-2:136,i=e.pet?pxPet(e.pet,t).w+2:0,l=s.reduce((d,m)=>d+m.s.w,0),c=Math.max(0,s.length-1);let f=3;for(;f>1&&o+l+c*f+i>r;)f--;const u=l+c*f;return{x:Math.round(Math.max(o,Math.min(Math.max(86,108-u/2),r-u-i))),gap:f,tot:u};}
/* ═══ OFFICIAL-END: pxPeopleLay ═══ */

/* ═══ OFFICIAL-BEGIN: pxScene ═══ */
function pxScene(e,t){if(e&&e.act&&typeof pxMoment=="function"){const u=pxMoment(e,t);if(u){const d=new PxR(PX.W,PX.H);for(const m of["sky","back","mid","front"])d.blit(u[m],0,0,null);return d;}}const a=lvRand(e.seed),n=new PxR(PX.W,PX.H),s=PX.G;pxSky(n,e,t,a);const o=e.mood==="low"?5:e.mood==="mid"?3:2;for(let u=0;u<o;u++)pxCloud(n,14+(u+.3+a()*.5)*(PX.W-28)/o,10+Math.round(a()*12),16+Math.round(a()*(e.mood==="low"?22:16)),t,a,e.mood==="low");if(e.mood==="high"&&!t.dark&&pxBirds(n,t,a),e.nomad){n.blit(pxSprite([".......W.....","WWWWWWWWWWWW.",".WWWWWWWWWWWW","......W......"],{W:t.light(t.wall,.3)}),136,10,t.ol);for(let u=112;u<134;u+=3)n.px(u,12,t.cloud);}if(pxBackdrop(n,e,t,a),e.urban)pxTree(n,64,s,"round",t),n.rect(62,s-1,5,1,t.wall3);else for(const u of[58,66])pxTree(n,u+Math.round(a()*4),s,pxTreeKind(e.region),t);pxPole(n,76,t,e.urban),pxGround(n,e,t,a),pxFence(n,e,t),pxWork(n,e,t,a);const r=pxHome(e,t,a),i=4;n.blit(r,i,s-r.h,t.ol),e.car?n.blit(pxCar(t,t.accent),i+r.w+3,s-6,t.ol):e.moto&&n.blit(pxMoto(t,!1),i+r.w+4,s-5,null);const l=e.people.map(u=>({p:u,s:pxPerson(u,t)})),c=pxPeopleLay(e,t,r,i,l);let f=c.x;for(const{p:u,s:d}of l)n.blit(d,f,s-d.h+(u.role==="me"?1:0),t.ol),f+=d.w+c.gap;if(l.length&&(f+=3-c.gap),e.nomad&&n.blit(pxSprite([".HH.","CCCC","CCCC","CCCC","O..O"],{H:t.ol,C:t.accent,O:t.ol}),f,s-5,t.ol),e.pet){const u=pxPet(e.pet,t);n.blit(u,f,s-u.h,t.ol),f+=u.w+2;}return pxFore(n,e,t,a,f),n;}
/* ═══ OFFICIAL-END: pxScene ═══ */

/* ═══ OFFICIAL-BEGIN: pxSceneLayers ═══ */
function pxSceneLayers(e,t){if(e&&e.act&&typeof pxMoment=="function"){const p=pxMoment(e,t);if(p)return p;}const a=lvRand(e.seed),n=PX.G,s=()=>new PxR(PX.W,PX.H),o=s(),r=s(),i=s(),l=s();pxSky(o,e,t,a);const c=e.mood==="low"?5:e.mood==="mid"?3:2;for(let p=0;p<c;p++)pxCloud(o,14+(p+.3+a()*.5)*(PX.W-28)/c,10+Math.round(a()*12),16+Math.round(a()*(e.mood==="low"?22:16)),t,a,e.mood==="low");if(e.mood==="high"&&!t.dark&&pxBirds(o,t,a),e.nomad){o.blit(pxSprite([".......W.....","WWWWWWWWWWWW.",".WWWWWWWWWWWW","......W......"],{W:t.light(t.wall,.3)}),136,10,t.ol);for(let p=112;p<134;p+=3)o.px(p,12,t.cloud);}if(pxBackdrop(r,e,t,a),e.urban)pxTree(i,64,n,"round",t),i.rect(62,n-1,5,1,t.wall3);else for(const p of[58,66])pxTree(i,p+Math.round(a()*4),n,pxTreeKind(e.region),t);pxPole(i,76,t,e.urban),pxGround(i,e,t,a),pxFence(i,e,t),pxWork(i,e,t,a);const f=pxHome(e,t,a),u=4;i.blit(f,u,n-f.h,t.ol),e.car?i.blit(pxCar(t,t.accent),u+f.w+3,n-6,t.ol):e.moto&&i.blit(pxMoto(t,!1),u+f.w+4,n-5,null);const d=e.people.map(p=>({p,s:pxPerson(p,t)})),m=pxPeopleLay(e,t,f,u,d);let h=m.x;const g=[h,h+Math.max(0,m.tot)];for(const{p,s:b}of d)l.blit(b,h,n-b.h+(p.role==="me"?1:0),t.ol),h+=b.w+m.gap;if(d.length&&(h+=3-m.gap),e.nomad&&l.blit(pxSprite([".HH.","CCCC","CCCC","CCCC","O..O"],{H:t.ol,C:t.accent,O:t.ol}),h,n-5,t.ol),e.pet){const p=pxPet(e.pet,t);l.blit(p,h,n-p.h,t.ol),h+=p.w+2;}return pxFore(l,e,t,a,h),{sky:o,back:r,mid:i,front:l,people:g};}
/* ═══ OFFICIAL-END: pxSceneLayers ═══ */

/* ═══ OFFICIAL-BEGIN: MO ═══ */
const MO={};
/* ═══ OFFICIAL-END: MO ═══ */

/* ═══ OFFICIAL-BEGIN: pxMoment ═══ */
function pxMoment(e,t){const a=String(e.act||"").split(":"),n=MO[a[0]];if(!n)return null;const s=lvRand(String(e.seed||"")+e.act),o=()=>new PxR(PX.W,PX.H),r={m:e,P:t,R:s,a:a.slice(1),sky:o(),back:o(),mid:o(),front:o(),span:null,cast:moCast(e)};return n(r),{sky:r.sky,back:r.back,mid:r.mid,front:r.front,people:r.span||[78,114]};}
/* ═══ OFFICIAL-END: pxMoment ═══ */

/* ═══ OFFICIAL-BEGIN: moCast ═══ */
function moCast(e){const t=(e.people||[]).filter(s=>s&&s.age>=0),a=t.find(s=>s.role==="me")||{role:"me",sex:"F",age:30},n=s=>t.filter(o=>o.role===s);return{all:t,me:a,pt:n("pt"),kids:n("kid").filter(s=>!s.gk),gk:n("kid").filter(s=>s.gk),par:n("par"),sib:n("sib"),inlaw:n("inlaw"),sk:a.sk};}
/* ═══ OFFICIAL-END: moCast ═══ */

/* ═══ OFFICIAL-BEGIN: moGen ═══ */
function moGen(e,t,a,n,s){const o=e.R,r=e.cast.sk,i=r==null?null:Math.max(0,Math.min(5,r+(o()<.6?0:o()<.5?-1:1)));return{role:t,sex:a||(o()<.5?"F":"M"),age:Math.max(0,Math.round(n)),sk:i,gen:s||1,tc:Math.floor(o()*7)};}
/* ═══ OFFICIAL-END: moGen ═══ */

/* ═══ OFFICIAL-BEGIN: moWhite ═══ */
const moWhite=e=>e.light(e.wall,e.dark?.35:.8);
/* ═══ OFFICIAL-END: moWhite ═══ */

/* ═══ OFFICIAL-BEGIN: moNavy ═══ */
const moNavy=e=>pxMix(e.ol,pxRGB("#33507A"),.55);
/* ═══ OFFICIAL-END: moNavy ═══ */

/* ═══ OFFICIAL-BEGIN: moRGB ═══ */
const moRGB=e=>pxRGB(e);
/* ═══ OFFICIAL-END: moRGB ═══ */

/* ═══ OFFICIAL-BEGIN: moGenCol ═══ */
const moGenCol=(e,t)=>[e.gold,e.stamp,e.light(e.accent,.25),e.water,e.light(e.tree,.05),e.light(e.wall3,.05),pxMix(e.sib,e.accent,.4)][t%7];
/* ═══ OFFICIAL-END: moGenCol ═══ */

/* ═══ OFFICIAL-BEGIN: moFig ═══ */
function moFig(e,t,a={}){if(e.aid){const k=pxPerson(e,t);return k.hand=[k.w-2,Math.round(k.h*.55)],k;}const n=e.sex==="F"?"F":"M",s=e.age<3?"baby":e.age<7?"small":e.age<13?"child":e.age<18?"teen":"adult";let o=PX_PEOPLE[n][s].slice();const r=o.findIndex(k=>k.includes("E"));a.bald&&s!=="baby"&&(o=o.map((k,A)=>k.replace(/H/g,A<r?"S":"."))),a.beard&&n==="M"&&(s==="adult"||s==="teen")&&(o=o.map((k,A)=>A===r+1?k.replace(/^S/,"H").replace(/S$/,"H"):A===r+2?k.replace(/S/g,"H"):A===r+3&&!/[BbPDd]/.test(k)?k.replace(/S/g,"H"):k));const i=a.top||(e.gen&&e.tc!=null?moGenCol(t,e.tc):t[e.role]||t.par),l=a.bot||t.pants,c=a.dress||(n==="F"?a.top||e.role==="me"?i:pxMix(i,t.light(i,.4),.3):l),f=e.sk!=null&&t["sk"+e.sk]?t["sk"+e.sk]:t.skin,u={H:a.hair||(e.age>=65?t.hairold:t.hair),S:f,E:t.ol,c:pxMix(f,t.accent,.38),m:t.shade(pxMix(f,t.accent,.5),.2),B:i,b:t.shade(i,.22),P:l,D:c,d:t.shade(c,.25),F:t.ol},d=s==="baby"?"":a.pose||"",m=o.reduce((k,A,x)=>A[0]==="S"&&/[BbD]/.test(A)?x:k,-1),h=o.findIndex(k=>/B/.test(k)),g=o.findIndex((k,A)=>A>m&&/[PDd]/.test(k));if(d==="sit"&&g>0){const k=o[g].replace(/\.([PDd])/,"$1$1").replace(/([PDd])\.(?=\.*$)/,"$1$1");o=o.slice(0,g).concat([k],o.slice(-1));}d==="walk"&&(o=o.map((k,A)=>A<o.length-2?k:moSpread(k)));let p=pxSprite(o,u),b=0;if((d==="up"||d==="wave")&&m>0&&h>0){const k=new PxR(p.w+2,p.h);k.blit(p,1,0,null),b=1;for(const A of d==="up"?[0,1]:[1]){const x=A?p.w:1,v=A?p.w+1:0;for(let w=h+1;w<=m;w++)k.d[w*k.w+x]=null;for(let w=Math.max(0,h-3);w<=h;w++)k.px(v,w,w===h?u.b:i);k.px(v,Math.max(0,h-4),f),k.px(v,Math.max(0,h-5),f);}p=k;}if(d==="hold"&&m>0){const k=a.bun||t.light(t.kid,.55),A=5,x=Math.floor((p.w-A)/2),v=m-3,w=pxSprite([".WWW.","WSSSW","WWWWW",".WWW."],{W:k,S:t.light(f,.1)});p.d[m*p.w]=null,p.d[m*p.w+p.w-1]=null,p.blit(w,x,v,null),p.px(x,v+2,f),p.px(x+A-1,v+2,f);}return p.hand=[p.w-1,m>0?m:p.h-4],p.lhand=[0,m>0?m:p.h-4],p.ox=b,p.hw=s==="adult"||s==="teen"?9:s==="baby"?6:7,a.hat&&(p=moHat(p,a.hat,t,a.cap)),p;}
/* ═══ OFFICIAL-END: moFig ═══ */

/* ═══ OFFICIAL-BEGIN: moSpread ═══ */
const moSpread=e=>{const t=e.length,a=t>>1;let n="";for(let s=0;s<t;s++){const o=s<a?s+1:s>a?s-1:-1;n+=o>=0&&o<t&&e[o]!=="."&&(s<a?o<a:o>a)?e[o]:".";}return n;};
/* ═══ OFFICIAL-END: moSpread ═══ */

/* ═══ OFFICIAL-BEGIN: moHat ═══ */
function moHat(e,t,a,n){const s=t==="chef"||t==="party"?4:t==="turban"?3:t==="grad"?2:t==="veil"?0:1,o=t==="straw"||t==="grad"?2:0,r=new PxR(e.w+o*2,e.h+s);r.blit(e,o,s,null);const i=(e.ox||0)+o,l=e.hw,c=i+(l>>1),f=s,u=(d,m,h)=>r.px(i+d,f+m,h);if(t==="grad"){const d=n||moNavy(a);for(let m=-2;m<=l+1;m++)u(m,-1,d);for(let m=1;m<l-1;m++)u(m,0,d);u(l+1,0,a.gold),u(l+1,1,a.gold);}else if(t==="hard"){const d=n||a.crane;for(let m=2;m<l-2;m++)u(m,-1,d);for(let m=1;m<l-1;m++)u(m,0,d);for(let m=0;m<l;m++)u(m,1,a.shade(d,.1));u(2,-1,a.light(d,.4));}else if(t==="chef"){const d=moWhite(a);for(let m=-4;m<=0;m++)for(let h=1;h<l-1;h++)m===-4&&(h===1||h===l-2)||u(h,m,m===0?a.shade(d,.08):d);}else if(t==="straw"){const d=n||a.light(a.thatch,.25);for(let m=2;m<l-2;m++)u(m,-1,d),u(m,0,a.accent);for(let m=-2;m<l+2;m++)u(m,1,m<0||m>=l?a.shade(d,.08):d);}else if(t==="party"){const d=n||a.accent;u(c-i,-4,a.gold);for(let m=-3;m<=0;m++)for(let h=-(m+4>>1);h<=m+4>>1;h++)u(c-i+h,m,m&1?a.gold:d);}else if(t==="veil"){const d=a.light(a.wall,.85);for(let m=1;m<l-1;m++)u(m,0,d);u(l>>1,-0,a.gold);for(let m=1;m<13;m++)r.dither(i-1,f+m,d,.8),r.dither(i+l,f+m,d,.8);}else if(t==="mil"){const d=n||pxMix(a.tree2,a.ol,.25);for(let m=1;m<l-1;m++)u(m,-1,d);for(let m=0;m<l;m++)u(m,0,d);u(2,0,a.gold);}else if(t==="cap"){const d=n||a.accent;for(let m=1;m<l-1;m++)u(m,0,d);for(let m=l-3;m<l+2;m++)u(m,1,a.shade(d,.15));}else if(t==="kufi"){const d=n||moWhite(a);for(let m=3;m<l-3;m++)u(m,-1,d);for(let m=2;m<l-2;m++)u(m,0,d);for(let m=1;m<l-1;m++)u(m,1,a.shade(d,.06));}else if(t==="kippah"){const d=n||moRGB("#3D5A99");for(let m=3;m<l-3;m++)u(m,-1,d);for(let m=2;m<l-2;m++)u(m,0,d);}else if(t==="turban"){const d=n||a.accent,m=a.shade(d,.2);[[2,l-2],[1,l-1],[0,l],[0,l],[0,l],[0,l]].forEach(([h,g],p)=>{for(let b=h;b<g;b++)u(b,p-3,p===5||(b+p)%4===0?m:d);});}else if(t==="hood"){const d=n||a.ol;for(let m=2;m<l-2;m++)u(m,-1,d);for(let m=1;m<l-1;m++)u(m,0,d);}return r.hand=[e.hand[0]+o,e.hand[1]+s],r.lhand=[e.lhand[0]+o,e.lhand[1]+s],r.ox=i,r.hw=l,r;}
/* ═══ OFFICIAL-END: moHat ═══ */

/* ═══ OFFICIAL-BEGIN: MO_WEAR ═══ */
const MO_WEAR={suit:e=>({top:pxMix(e.ol,moRGB("#2F3A52"),.6),bot:pxMix(e.ol,moRGB("#2F3A52"),.45)}),bride:e=>{const t=e.light(e.wall,.9);return{top:t,dress:t,bot:t};},gown:e=>{const t=moNavy(e);return{top:t,bot:t,dress:t};},coat:e=>({top:moWhite(e),dress:moWhite(e)}),scrubs:e=>({top:pxMix(e.stamp,e.wall,.35),bot:pxMix(e.stamp,e.wall,.25),dress:pxMix(e.stamp,e.wall,.3)}),mil:e=>{const t=pxMix(e.tree2,e.ol,.2);return{top:t,bot:e.shade(t,.15),dress:e.shade(t,.15)};},school:e=>({top:moNavy(e),bot:e.light(e.wall3,.1),dress:pxMix(moNavy(e),e.wall3,.35)}),patient:e=>({top:e.light(e.water,.45),dress:e.light(e.water,.45),bot:e.light(e.water,.35)}),chef:e=>({top:moWhite(e),dress:moWhite(e)}),vest:e=>({top:pxMix(e.crane,e.accent,.35)}),black:e=>{const t=e.dark?e.light(e.ol,.28):e.light(e.ol,.16);return{top:t,bot:e.shade(t,.2),dress:t};},white:e=>{const t=e.light(e.wall,.82);return{top:t,bot:t,dress:t};},red:e=>({top:pxMix(e.accent,moRGB("#C0303A"),.6),dress:pxMix(e.accent,moRGB("#C0303A"),.6)})};
/* ═══ OFFICIAL-END: MO_WEAR ═══ */

/* ═══ OFFICIAL-BEGIN: moWear ═══ */
const moWear=(e,t)=>MO_WEAR[e]?MO_WEAR[e](t):{};
/* ═══ OFFICIAL-END: moWear ═══ */

/* ═══ OFFICIAL-BEGIN: moRow ═══ */
function moRow(e,t,a,n=PX.G,s=2){const o=t.reduce((l,c)=>l+c.s.w+(c.gap!=null?c.gap:s),-s);let r=Math.round(a-o/2);const i=[];for(const l of t)i.push(r),e.front.blit(l.s,r,n-l.s.h+(l.dy||0),e.P.ol),r+=l.s.w+(l.gap!=null?l.gap:s);return moSpan(e,Math.round(a-o/2),Math.round(a+o/2)),i;}
/* ═══ OFFICIAL-END: moRow ═══ */

/* ═══ OFFICIAL-BEGIN: moPut ═══ */
const moPut=(e,t,a,n,s)=>{(s||e.front).blit(t,Math.round(a),Math.round(n),e.P.ol);};
/* ═══ OFFICIAL-END: moPut ═══ */

/* ═══ OFFICIAL-BEGIN: moSpan ═══ */
function moSpan(e,t,a){e.span?e.span=[Math.min(e.span[0],t),Math.max(e.span[1],a)]:e.span=[t,a],e.span=[Math.max(0,e.span[0]),Math.min(PX.W,e.span[1])];}
/* ═══ OFFICIAL-END: moSpan ═══ */

/* ═══ OFFICIAL-BEGIN: moFam ═══ */
function moFam(e,t,a={}){const n=e.cast,s=[];for(const o of[...n.pt,...n.kids.slice().sort((r,i)=>r.age-i.age),...(a.noPar?[]:n.par),...n.sib,...n.gk,...n.inlaw])s.length<t&&s.push(o);return s;}
/* ═══ OFFICIAL-END: moFam ═══ */

/* ═══ OFFICIAL-BEGIN: moSky ═══ */
function moSky(e,t="d",a){const n=a||e.sky,s=e.P;if(t==="night"){const r=moRGB(s.dark?"#0E1526":"#1E2A4A"),i=moRGB(s.dark?"#28304A":"#4A4E78");for(let l=0;l<PX.H;l++)for(let c=0;c<PX.W;c++)n.dither(c,l,pxMix(r,i,Math.min(1,l/PX.G)),1);for(let l=0;l<30;l++)n.px(e.R()*PX.W,e.R()*30,l%5?s.light(moRGB("#C9D3DA"),.2):moRGB("#FFF4CF"));return;}if(t==="dusk"){const r=["#6A74A8","#A88DB6","#E79A8A","#F4B98E","#F8D9A0"].map(moRGB);for(let i=0;i<PX.H;i++){const l=Math.min(4,i/(PX.G-4)*4),c=Math.min(3,Math.floor(l)),f=Math.min(1,l-c),u=Math.max(0,(f-.72)/.28);for(let d=0;d<PX.W;d++)n.px(d,i,u>PX_BAYER[(i&3)*4+(d&3)]?r[c+1]:r[c]);}n.disc(150,34,6,moRGB("#FFE7A8")),n.disc(150,34,4,moRGB("#FFF5D6"));return;}pxSky(n,Object.assign({},e.m,{stage:t==="m"?"m":t==="e"?"e":"d",mood:e.m.mood==="low"?"mid":e.m.mood}),s,e.R);const o=2+(e.R()*2|0);for(let r=0;r<o;r++)pxCloud(n,20+(r+.3+e.R()*.4)*(PX.W-40)/o,10+Math.round(e.R()*10),14+Math.round(e.R()*14),s,e.R,!1);}
/* ═══ OFFICIAL-END: moSky ═══ */

/* ═══ OFFICIAL-BEGIN: moGrass ═══ */
function moGrass(e,t,a=PX.G){const n=t||e.mid,s=e.P;n.rect(0,a,PX.W,PX.H-a,s.grass),n.rect(0,a,PX.W,1,s.grasshi);for(let o=0;o<PX.W;o++)e.R()<.3&&n.px(o,a+1+e.R()*(PX.H-a-2),s.grass2),e.R()<.2&&n.px(o,a-1,s.grass2);}
/* ═══ OFFICIAL-END: moGrass ═══ */

/* ═══ OFFICIAL-BEGIN: moPave ═══ */
function moPave(e,t){const a=t||e.mid,n=e.P;a.rect(0,PX.G,PX.W,PX.H-PX.G,n.pave);for(let s=PX.G+3;s<PX.H;s+=4)a.rect(0,s,PX.W,1,n.pave2);for(let s=0;s<PX.W;s+=9)a.rect(s+(s/9&1)*4,PX.G,1,PX.H-PX.G,n.pave2);}
/* ═══ OFFICIAL-END: moPave ═══ */

/* ═══ OFFICIAL-BEGIN: moFar ═══ */
function moFar(e,t){const a=t||e.back,n=e.P,s=e.m;if(s.urban){let o=-3;for(;o<PX.W;){const r=6+Math.round(e.R()*8),i=8+Math.round(e.R()*14);pxBuilding(a,o,r,i,PX.G,n.far1,pxMix(n.far1,n.wall,.35),e.R),o+=r+1+Math.round(e.R()*4);}return;}pxHills(a,n,e.R,.04,PX.G-6,7,s.region==="mena"?pxMix(n.sand,n.far1,.4):n.hill1,null),pxHills(a,n,e.R,.07,PX.G-1,4,s.region==="mena"?n.sand:n.hill2,null);}
/* ═══ OFFICIAL-END: moFar ═══ */

/* ═══ OFFICIAL-BEGIN: moRoom ═══ */
function moRoom(e,t={}){const a=e.P,n=e.mid,s=PX.G,o=e.R,r=t.wall||(e.m.home==="hut"||e.m.home==="tent"?a.mud:e.m.home==="flat"?a.light(a.wall2,.25):a.wall);e.sky.rect(0,0,PX.W,PX.H,r),n.rect(0,0,PX.W,s,r);for(let c=2;c<s-9;c+=1)for(let f=c%6<3?0:3;f<PX.W;f+=6)c%3===0&&n.px(f,c,a.shade(r,.05));!t.plain&&e.m.home!=="hut"&&e.m.home!=="tent"&&(n.rect(0,s-9,PX.W,8,a.shade(r,.08)),n.rect(0,s-9,PX.W,1,a.light(r,.3))),n.rect(0,s-2,PX.W,2,a.shade(a.trunk,.1));const i=t.floor||(e.m.home==="hut"||e.m.home==="tent"?"mud":e.m.region==="eas"&&!e.m.urban?"mat":"wood"),l=i==="tile"?a.light(a.pave,.2):i==="mud"?a.soil:i==="mat"?a.light(a.thatch,.2):a.light(a.trunk,.25);n.rect(0,s,PX.W,PX.H-s,l);for(let c=s+2;c<PX.H;c+=3)n.rect(0,c,PX.W,1,a.shade(l,.12));if(i==="wood")for(let c=s;c<PX.H;c+=3)for(let f=(c/3&1)*11;f<PX.W;f+=22)n.rect(f,c,1,2,a.shade(l,.12));if(i==="tile")for(let c=0;c<PX.W;c+=8)n.rect(c,s,1,PX.H-s,a.shade(l,.1));for(const[c,f]of t.win||[])moWindow(e,c,8,f,22,t.view||"d");for(const c of t.frames||[])n.rect(c,12,9,7,a.trunk),n.rect(c+1,13,7,5,a.light(a.sky.d?moRGB(a.sky.d[0]):a.win,.2)),n.rect(c+2,15,3,3,a.tree),n.px(c+6,14,a.sun);if(t.lamp!=null){const c=t.lamp;n.rect(c,s-20,1,18,a.metal),n.rect(c-3,s-25,7,5,a.light(a.gold,.35)),n.rect(c-2,s-2,5,1,a.metal);for(let f=-10;f<=10;f++)for(let u=-12;u<=12;u++)u*u+f*f*2<140&&n.dither(c+u,s-22+f,a.light(a.gold,.6),.12);}}
/* ═══ OFFICIAL-END: moRoom ═══ */

/* ═══ OFFICIAL-BEGIN: moWindow ═══ */
function moWindow(e,t,a,n,s,o){const r=e.P,i=e.mid,l=r.light(r.trunk,r.dark?.1:.3),c=moRGB(o==="night"?"#26335A":o==="dusk"?"#E9A27F":r.sky.d[0]),f=moRGB(o==="night"?"#4A4E78":o==="dusk"?"#F7D49B":r.sky.d[1]);i.rect(t-1,a-1,n+2,s+2,l);for(let d=0;d<s;d++)for(let m=0;m<n;m++)i.px(t+m,a+d,pxMix(c,f,d/s));if(o==="night"){i.disc(t+n-5,a+4,2,moRGB("#FFF4CF"));for(let d=0;d<4;d++)i.px(t+2+e.R()*(n-4),a+2+e.R()*(s/2),moRGB("#E8ECF2"));}else o!=="dusk"&&pxCloud(i,t+n*.4,a+9,8,r,e.R,!1);if(e.m.urban)for(let d=0;d<n;d+=5){const m=4+d*7%6;i.rect(t+d,a+s-m,4,m,o==="night"?moRGB("#2E3550"):r.far1),o==="night"&&i.px(t+d+1,a+s-m+2,r.winlit);}else for(let d=0;d<n;d++){const m=3+Math.round(2*Math.sin((t+d)*.3));i.rect(t+d,a+s-m,1,m,o==="night"?moRGB("#2A3A3A"):r.hill2);}i.rect(t+(n>>1),a,1,s,l),i.rect(t,a+(s>>1),n,1,l),i.rect(t-1,a+s+1,n+2,1,r.light(l,.2));const u=o==="night"?r.shade(r.accent,.2):r.light(r.accent,.5);i.rect(t-3,a-2,3,s+4,u),i.rect(t+n,a-2,3,s+4,u),i.rect(t-3,a-2,1,s+4,r.shade(u,.12)),i.rect(t+n+2,a-2,1,s+4,r.shade(u,.12));}
/* ═══ OFFICIAL-END: moWindow ═══ */

/* ═══ OFFICIAL-BEGIN: moTable ═══ */
function moTable(e,t,a,n,s={}){const o=e.P,r=s.ly||e.front,i=s.cloth?moWhite(o):o.light(o.trunk,.15);if(r.rect(t,n,a,2,i),r.rect(t,n+2,a,1,o.shade(i,.2)),s.cloth){r.rect(t,n+3,a,3,i);for(let l=0;l<a;l+=3)r.px(t+l,n+5,o.shade(i,.15));}r.rect(t+1,n+3,1,PX.G-n-3,o.shade(o.trunk,.2)),r.rect(t+a-2,n+3,1,PX.G-n-3,o.shade(o.trunk,.2));}
/* ═══ OFFICIAL-END: moTable ═══ */

/* ═══ OFFICIAL-BEGIN: moCake ═══ */
function moCake(e,t,a,n=5){const s=e.P,o=e.front,r=s.light(s.wall,.8),i=s.light(s.accent,.5);o.rect(t,a-4,9,4,r),o.rect(t,a-5,9,1,i),o.px(t+2,a-3,s.accent),o.px(t+6,a-2,s.accent),o.rect(t,a-1,9,1,s.shade(r,.12));for(let l=0;l<Math.min(4,n);l++){const c=t+1+l*2;o.px(c,a-6,s.light(s.gold,.3)),o.px(c,a-7,s.light(s.gold,.3)),o.px(c,a-8,moRGB("#FFB43A")),o.dither(c,a-9,moRGB("#FFF0B0"),.6);}}
/* ═══ OFFICIAL-END: moCake ═══ */

/* ═══ OFFICIAL-BEGIN: moDishes ═══ */
function moDishes(e,t,a,n){const s=e.P,o=e.front;for(let r=2;r<a-3;r+=5){const i=[s.accent,s.gold,s.tree,s.light(s.wall,.8)][(r/5|0)%4];o.rect(t+r,n-2,4,2,s.light(s.wall,.85)),o.rect(t+r+1,n-3,2,1,i),r%10===2&&(o.px(t+r+1,n-5,s.light(s.smoke,.5)),o.px(t+r+2,n-6,s.light(s.smoke,.5)));}}
/* ═══ OFFICIAL-END: moDishes ═══ */

/* ═══ OFFICIAL-BEGIN: moBunting ═══ */
function moBunting(e,t,a=0,n=PX.W,s){const o=s||e.mid,r=e.P,i=[r.accent,r.gold,r.stamp,r.light(r.accent,.4),r.water];for(let l=a;l<n;l++){const c=(l-a)/(n-a),f=Math.round(t+4*Math.sin(c*Math.PI));if(o.px(l,f,r.ol),(l-a)%6===2){const u=i[((l-a)/6|0)%i.length];o.rect(l-1,f+1,3,1,u),o.px(l,f+2,u);}}}
/* ═══ OFFICIAL-END: moBunting ═══ */

/* ═══ OFFICIAL-BEGIN: moBalloons ═══ */
function moBalloons(e,t,a,n=3){const s=e.P,o=e.front,r=[s.accent,s.gold,s.water,s.stamp];for(let i=0;i<n;i++){const l=t+i*4-i%2,c=a-i%2*3;o.disc(l,c,2,r[i%r.length]),o.px(l-1,c-1,s.light(r[i%r.length],.5)),o.line(l,c+3,t+4,a+12,s.light(s.ol,.4));}}
/* ═══ OFFICIAL-END: moBalloons ═══ */

/* ═══ OFFICIAL-BEGIN: moFlowers ═══ */
function moFlowers(e,t,a,n,s=3,o){const r=n||e.front,i=e.P;for(let l=0;l<s;l++){const c=t+l*2,f=a-l%2;r.line(c,f,c,a+3,i.tree2),r.px(c,f-1,o||[i.accent,i.gold,i.light(i.wall,.8)][l%3]);}}
/* ═══ OFFICIAL-END: moFlowers ═══ */

/* ═══ OFFICIAL-BEGIN: moBouquet ═══ */
function moBouquet(e,t,a){const n=e.front,s=e.P;n.px(t,a+1,s.tree2),n.px(t,a+2,s.tree2),n.px(t-1,a-1,s.light(s.accent,.35)),n.px(t,a-1,s.light(s.wall,.85)),n.px(t+1,a-1,s.gold),n.px(t,a-2,s.light(s.accent,.35)),n.px(t-1,a,s.tree),n.px(t+1,a,s.tree),n.px(t,a,s.accent);}
/* ═══ OFFICIAL-END: moBouquet ═══ */

/* ═══ OFFICIAL-BEGIN: moSuitcase ═══ */
function moSuitcase(e,t,a,n){const s=e.front,o=e.P,r=n||o.accent;s.rect(t,a-6,5,6,r),s.rect(t,a-4,5,1,o.shade(r,.2)),s.rect(t+1,a-8,3,1,o.ol),s.px(t+1,a-7,o.ol),s.px(t+3,a-7,o.ol),s.px(t,a,o.ol),s.px(t+4,a,o.ol);}
/* ═══ OFFICIAL-END: moSuitcase ═══ */

/* ═══ OFFICIAL-BEGIN: moTreeBig ═══ */
function moTreeBig(e,t,a,n,s){pxTree(s||e.mid,t,a,n||pxTreeKind(e.m.region),e.P);}
/* ═══ OFFICIAL-END: moTreeBig ═══ */

/* ═══ OFFICIAL-BEGIN: moPlane ═══ */
function moPlane(e,t,a,n,s=1){const o=n||e.sky,r=e.P,i=r.light(r.wall,.75);if(s===1){o.rect(t,a,9,1,i),o.rect(t+3,a-1,2,1,i),o.rect(t+4,a+1,3,1,i),o.px(t,a-1,i);return;}o.rect(t,a,22,3,i),o.rect(t+1,a+3,20,1,r.shade(i,.15)),o.rect(t+22,a+1,2,1,i);for(let l=3;l<19;l+=2)o.px(t+l,a+1,r.win);o.rect(t-1,a-4,3,4,r.accent),o.rect(t+8,a+3,8,2,r.shade(i,.2)),o.rect(t+10,a-2,5,2,r.shade(i,.1));}
/* ═══ OFFICIAL-END: moPlane ═══ */

/* ═══ OFFICIAL-BEGIN: fxConfetti ═══ */
function fxConfetti(e,t=26,a=PX.G-2){const n=[e.P.accent,e.P.gold,e.P.stamp,e.P.water,e.P.light(e.P.accent,.4)];for(let s=0;s<t;s++){const o=e.R()*PX.W,r=2+e.R()*(a-2),i=n[s%n.length];e.front.px(o,r,i),s%3===0&&e.front.px(o+1,r,i);}}
/* ═══ OFFICIAL-END: fxConfetti ═══ */

/* ═══ OFFICIAL-BEGIN: fxPetals ═══ */
function fxPetals(e,t=20,a){const n=e.P,s=a?[a]:[n.light(n.accent,.55),n.light(n.wall,.85),n.light(n.accent,.7)];for(let o=0;o<t;o++){const r=e.R()*PX.W,i=e.R()*(PX.G-4);e.front.px(r,i,s[o%s.length]),o%4===0&&e.front.px(r+1,i+1,s[o%s.length]);}}
/* ═══ OFFICIAL-END: fxPetals ═══ */

/* ═══ OFFICIAL-BEGIN: fxRain ═══ */
function fxRain(e,t=70){const a=e.P.light(e.P.win,.35);for(let n=0;n<t;n++){const s=e.R()*(PX.W+10),o=e.R()*PX.H;e.front.px(s,o,a),e.front.px(s-1,o+1,a),e.front.px(s-1,o+2,pxMix(a,e.P.win,.5));}}
/* ═══ OFFICIAL-END: fxRain ═══ */

/* ═══ OFFICIAL-BEGIN: fxSnow ═══ */
function fxSnow(e,t=45){const a=e.P.light(e.P.wall,.9);for(let n=0;n<t;n++)e.front.px(e.R()*PX.W,e.R()*PX.H,a);}
/* ═══ OFFICIAL-END: fxSnow ═══ */

/* ═══ OFFICIAL-BEGIN: fxSpark ═══ */
function fxSpark(e,t,a,n=4){const s=e.P.light(e.P.gold,.4);for(let o=0;o<n;o++){const r=t+(e.R()-.5)*30,i=a+(e.R()-.5)*14;e.front.px(r,i,s),e.front.px(r-1,i,s),e.front.px(r+1,i,s),e.front.px(r,i-1,s),e.front.px(r,i+1,s);}}
/* ═══ OFFICIAL-END: fxSpark ═══ */

/* ═══ OFFICIAL-BEGIN: fxHeart ═══ */
function fxHeart(e,t,a,n){const s=n||e.P.light(e.P.accent,.2),o=pxSprite(["HH.HH","HHHHH",".HHH.","..H.."],{H:s});e.front.blit(o,t,a,null),e.front.px(t+1,a,e.P.light(s,.5));}
/* ═══ OFFICIAL-END: fxHeart ═══ */

/* ═══ OFFICIAL-BEGIN: fxNote ═══ */
function fxNote(e,t,a){const n=e.front,s=e.P.ol;n.rect(t+2,a,1,4,s),n.px(t+3,a,s),n.px(t+4,a+1,s),n.rect(t,a+3,2,2,s);}
/* ═══ OFFICIAL-END: fxNote ═══ */

/* ═══ OFFICIAL-BEGIN: fxLanterns ═══ */
function fxLanterns(e,t,a=0,n=PX.W,s){const o=s||e.mid,r=e.P;for(let i=a;i<n;i++){const l=(i-a)/Math.max(1,n-a),c=Math.round(t+5*Math.sin(l*Math.PI));if(o.px(i,c,r.ol),(i-a)%9===4){const f=[moRGB("#F2A23A"),moRGB("#E85A4F"),moRGB("#F6D365")][((i-a)/9|0)%3];o.rect(i-1,c+1,3,4,f),o.px(i,c+2,r.light(f,.5));for(let u=-3;u<=6;u++)for(let d=-4;d<=4;d++)d*d+u*u<18&&o.dither(i+d,c+2+u,r.light(f,.4),.15);}}}
/* ═══ OFFICIAL-END: fxLanterns ═══ */

/* ═══ OFFICIAL-BEGIN: fxRays ═══ */
function fxRays(e,t,a){const n=e.sky,s=e.P.light(e.P.sun,.5);for(let o=0;o<9;o++){const r=-Math.PI*(.1+o*.1);for(let i=8;i<60;i++)(i+o)%3&&n.dither(Math.round(t+Math.cos(r)*i),Math.round(a+Math.sin(r)*i),s,.35);}}
/* ═══ OFFICIAL-END: fxRays ═══ */

/* ═══ OFFICIAL-BEGIN: fxStars ═══ */
function fxStars(e,t=40,a){const n=a||e.sky;for(let s=0;s<t;s++){const o=e.R()*PX.W,r=e.R()*36;n.px(o,r,moRGB(s%6?"#E2E8F0":"#FFF4CF")),s%9===0&&(n.px(o-1,r,moRGB("#9AA6C0")),n.px(o+1,r,moRGB("#9AA6C0")));}}
/* ═══ OFFICIAL-END: fxStars ═══ */

/* ═══ OFFICIAL-BEGIN: MO_CX ═══ */
const MO_CX=96;
/* ═══ OFFICIAL-END: MO_CX ═══ */

/* ═══ OFFICIAL-BEGIN: moAround ═══ */
function moAround(e,t){const a=[],n=[];return t.forEach((s,o)=>(o%2?a:n).push(s)),[...a.reverse(),e,...n];}
/* ═══ OFFICIAL-END: moAround ═══ */

/* ═══ OFFICIAL-BEGIN: moAtTable ═══ */
function moAtTable(e,t,a,n,s={}){const o=moRow(e,t,a,PX.G-3,s.gap!=null?s.gap:3),r=Math.max(30,e.span[1]-e.span[0]+10),i=Math.round(a-r/2);return moTable(e,i,r,n,{cloth:s.cloth!==!1}),{xs:o,x:i,w:r};}
/* ═══ OFFICIAL-END: moAtTable ═══ */

/* ═══ OFFICIAL-BEGIN: moBed ═══ */
function moBed(e,t,a,n,s,o={}){const r=e.P,i=e.front,l=o.hosp?r.light(r.metal,.35):r.shade(r.trunk,.05),c=moWhite(r),f=o.blanket||(o.hosp?r.light(r.water,.55):r.light(r.accent,.45));if(i.rect(t,n-12,2,PX.G-n+12,l),i.rect(t+a-2,n-5,2,PX.G-n+5,l),i.rect(t+2,n,a-4,3,c),o.hosp){i.rect(t+2,n+3,a-4,1,l);for(const u of[t+4,t+a-6])i.rect(u,n+4,1,PX.G-n-5,l),i.px(u-1,PX.G-1,r.ol),i.px(u+1,PX.G-1,r.ol);}else i.rect(t+2,n+3,a-4,3,l),i.rect(t+2,n+6,2,PX.G-n-6,l),i.rect(t+a-4,n+6,2,PX.G-n-6,l);if(i.rect(t+2,n-4,8,4,c),i.rect(t+2,n-1,8,1,r.shade(c,.1)),s){const u=s.hand?s.hand[1]:s.h-5,d=new PxR(s.w,u+1);for(let m=0;m<=u;m++)for(let h=0;h<s.w;h++)d.d[m*s.w+h]=s.get(h,m);moPut(e,d,t+4,n-1-u),moSpan(e,t+2,t+a);}i.rect(t+3,n-1,a-5,4,f),i.rect(t+3,n-1,a-5,1,r.light(f,.3)),i.rect(t+3,n+2,a-5,1,r.shade(f,.15)),o.hosp&&(i.rect(t+a+3,n-22,1,PX.G-n+22,r.metal),i.rect(t+a+1,n-22,5,1,r.metal),i.rect(t+a+2,n-21,3,5,r.light(r.water2||r.win,.4)),i.line(t+a+3,n-16,t+a-6,n-2,r.light(r.metal,.3)));}
/* ═══ OFFICIAL-END: moBed ═══ */

/* ═══ OFFICIAL-BEGIN: moVase ═══ */
function moVase(e,t,a,n){const s=n||e.front,o=e.P;s.rect(t,a,8,1,o.light(o.trunk,.1)),s.rect(t+1,a+1,1,PX.G-a-1,o.trunk),s.rect(t+6,a+1,1,PX.G-a-1,o.trunk),s.rect(t+3,a-3,2,3,o.light(o.water,.4)),moFlowers(e,t+2,a-5,s,3);}
/* ═══ OFFICIAL-END: moVase ═══ */

/* ═══ OFFICIAL-BEGIN: moSome ═══ */
const moSome=(e,t,a,n,s)=>({p:moGen(e,t,a,n),s:moFig(moGen(e,t,a,n),e.P,s||{})});
/* ═══ OFFICIAL-END: moSome ═══ */

/* ═══ OFFICIAL-BEGIN: MO.born ═══ */
MO.born=e=>{const t=e.P,a=e.cast,n=e.m.urban&&!["hut","tent"].includes(e.m.home),s=a.par.find(i=>i.sex==="F")||(a.par.length?null:moGen(e,"par","F",28)),o=a.par.find(i=>i.sex==="M");moRoom(e,n?{wall:pxMix(t.wall,t.light(t.water,.6),.3),floor:"tile",win:[[22,26],[150,22]],plain:!0}:{win:[[24,22]],frames:[150,164]});const r=t.light(t.me,.55);if(s){const i=moFig(s,t,{pose:"\
hold",bun:r,top:n?moWear("patient",t).top:void 0});moBed(e,72,44,PX.G-(n?12:8),i,{hosp:n}),fxHeart(e,79,PX.G-(n?12:8)-i.hand[1]-8);}else{const i=pxNewborn(a.me,t);moBed(e,76,34,PX.G-9,null,{}),moPut(e,i,84,PX.G-20),moSpan(e,76,110);}if(o){const i=moFig(o,t,{});moPut(e,i,120,PX.G-i.h),moSpan(e,70,130);}for(const i of a.sib.slice(0,2)){const l=moFig(i,t,{pose:"wave"});moPut(e,l,o?132+a.sib.indexOf(i)*10:120+a.sib.indexOf(i)*10,PX.G-l.h);}moVase(e,56,PX.G-12),e.span=[70,114];};
/* ═══ OFFICIAL-END: MO.born ═══ */

/* ═══ OFFICIAL-BEGIN: MO.baby ═══ */
MO.baby=e=>{const t=e.P,a=e.cast,n=a.kids.filter(d=>d.age<=1).sort((d,m)=>d.age-m.age),s=n[0];moRoom(e,{win:[[28,22]],frames:[136,150],lamp:170});const o=[...a.pt,...a.kids.filter(d=>d!==s&&d.age>=2).slice(0,3),...a.par.slice(0,1)],r={p:a.me,s:moFig(a.me,t,{pose:"hold",bun:t.light(t.kid,.55)}),dy:1},i=n.length>1?o.find(d=>d.role==="pt"||d.role==="par"):null,l=moAround(r,o.map(d=>({p:d,s:moFig(d,t,d===i?{pose:"hold",bun:t.light(t.kid,.45)}:d.role==="kid"?{pose:"wave"}:{}),dy:0}))),c=moRow(e,l,MO_CX-10),f=e.span[1]+4,u=e.front;u.rect(f,PX.G-11,18,1,t.trunk);for(let d=0;d<18;d+=3)u.rect(f+d,PX.G-11,1,11,t.trunk);u.rect(f,PX.G-4,18,1,t.trunk),u.line(f+9,8,f+9,16,t.ol),u.rect(f+4,16,11,1,t.ol),[t.gold,t.accent,t.water].forEach((d,m)=>{u.px(f+4+m*5,17,t.ol),u.rect(f+3+m*5,18,3,2,d);}),fxHeart(e,MO_CX-14,18),fxHeart(e,MO_CX-2,14,t.light(t.gold,.2)),moSpan(e,e.span[0],f+18);};
/* ═══ OFFICIAL-END: MO.baby ═══ */

/* ═══ OFFICIAL-BEGIN: MO.school ═══ */
MO.school=e=>{const t=e.P,a=e.cast;moSky(e,"m"),moFar(e),moGrass(e);const n=pxHouse(t,58,18,7,t.stamp,t.wall,{});e.mid.blit(n,66,PX.G-n.h-2,t.ol),e.mid.rect(93,PX.G-n.h-1,5,4,t.wall),e.mid.px(95,PX.G-n.h,t.ol);for(const f of[56,132])e.mid.rect(f,PX.G-16,4,16,t.wall2),e.mid.rect(f-1,PX.G-17,6,2,t.shade(t.wall2,.2));e.mid.rect(60,PX.G-1,72,1,t.pave2);for(const f of[30,160])moTreeBig(e,f,PX.G,e.m.region==="hi"||e.m.region==="eap"?"round":null);const s=a.me.age>=18,o=s?a.kids.filter(f=>f.age>=4&&f.age<=13).sort((f,u)=>f.age-u.age)[0]||a.gk[0]||moGen(e,"kid",null,6):a.me,r=moFig(o,t,{pose:"wave"}),i=(s?[a.me,...a.pt.slice(0,1)]:a.par.slice(0,1)).map(f=>({p:f,s:moFig(f,t,{pose:"wave"})})),l=[moSome(e,"kid",null,o.age),moSome(e,"sib",null,o.age)],c=moRow(e,[l[0],{s:r,dy:1},...i,l[1]],MO_CX,PX.G,3);{const f=PX.G-r.h+1+r.hand[1]-4,u=t.accent;e.mid.rect(c[1]-1,f,r.w+2,5,u),e.mid.rect(c[1]-1,f,r.w+2,1,t.light(u,.3)),e.mid.rect(c[1]-1,f+4,r.w+2,1,t.shade(u,.25));}(e.m.region==="hi"||e.m.region==="eap")&&fxPetals(e,16);};
/* ═══ OFFICIAL-END: MO.school ═══ */

/* ═══ OFFICIAL-BEGIN: MO.grad ═══ */
MO.grad=e=>{const t=e.P,a=e.cast,n=+e.a[0]||3,s=n>=4;if(moSky(e,"d"),moFar(e),moGrass(e),s){const h=e.mid,g=58,p=76,b=t.light(t.wall,.3);for(let k=0;k<7;k++)h.rect(g+2+(6-k)*5,PX.G-34+k,p-4-(6-k)*10,1,k===6?t.shade(b,.15):b);h.rect(g+2,PX.G-27,p-4,3,b),h.rect(g+2,PX.G-24,p-4,1,t.shade(b,.2));for(let k=0;k<7;k++)h.rect(g+6+k*11,PX.G-23,3,18,b),h.rect(g+8+k*11,PX.G-23,1,18,t.shade(b,.12));h.rect(g,PX.G-5,p,2,t.shade(b,.08)),h.rect(g-3,PX.G-3,p+6,3,t.shade(b,.14));{const k=pxSprite([".KKK.","KKKKK",".KKKY","..K.Y"],{K:moNavy(t),Y:t.gold});for(let A=0;A<6;A++)e.front.blit(k,66+A*11+(e.R()*4|0),3+(e.R()*12|0),null);}}else{const h=pxHouse(t,70,16,6,t.stamp,t.wall,{});e.mid.blit(h,60,PX.G-h.h-1,t.ol),moBunting(e,PX.G-26,56,138);}const o=moWear(s?"gown":"school",t),r=moFig(a.me,t,Object.assign({pose:"up",hat:s?"grad":void 0},o)),i=[moSome(e,"sib",null,a.me.age,Object.assign({pose:"wave",hat:s?"grad":void 0},o)),moSome(e,"pt",null,a.me.age,Object.assign({hat:s?"grad":void 0},o))],l=(a.par.length?a.par:s?[moGen(e,"par","F",a.me.age+28),moGen(e,"par","M",a.me.age+30)]:[]).slice(0,2),c=[i[0],{s:r,dy:1},...l.map(h=>({s:moFig(h,t,{pose:"wave"})})),i[1]],f=moRow(e,c,MO_CX,PX.G,3),u=e.front,d=f[1]+r.w+1,m=PX.G-r.h+6;u.rect(d,m,5,2,moWhite(t)),u.px(d+2,m,t.accent),u.px(d+2,m+1,t.accent),!s&&(e.m.region==="hi"||e.m.region==="eap")&&moBouquet(e,f[1]-2,PX.G-r.h+9),fxConfetti(e,s?30:16,34);};
/* ═══ OFFICIAL-END: MO.grad ═══ */

/* ═══ OFFICIAL-BEGIN: MO.pass ═══ */
MO.pass=e=>{const t=e.P,a=e.cast;moRoom(e,{win:[[30,22]],frames:[140],lamp:168});const n=moFig(a.me,t,{pose:"up"}),s=moAround({s:n,dy:-2},moFam(e,4).map(i=>({s:moFig(i,t,{pose:i.role==="par"?"wave":"up"})}))),o=moRow(e,s,MO_CX),r=s.findIndex(i=>i.s===n);e.front.rect(o[r]-2,PX.G-n.h-6,4,3,moWhite(t)),e.front.px(o[r]-1,PX.G-n.h-5,t.accent),fxConfetti(e,22,40),fxSpark(e,MO_CX,16,3);};
/* ═══ OFFICIAL-END: MO.pass ═══ */

/* ═══ OFFICIAL-BEGIN: MO.study ═══ */
MO.study=e=>{const t=e.P,a=e.cast;moRoom(e,{win:[[58,24]],view:"night",frames:[140]});const n=moFig(a.me,t,{pose:"sit"}),s=MO_CX-4;moPut(e,n,s,PX.G-n.h-7),moSpan(e,s-18,s+26);const o=e.front;o.rect(s-16,PX.G-12,40,2,t.light(t.trunk,.1)),o.rect(s-15,PX.G-10,1,10,t.trunk),o.rect(s+22,PX.G-10,1,10,t.trunk),o.rect(s+12,PX.G-10,10,10,t.shade(t.trunk,.1)),[t.accent,t.stamp,t.gold].forEach((r,i)=>o.rect(s-14,PX.G-14-i*2,8,2,r)),o.rect(s+1,PX.G-13,7,1,moWhite(t)),o.line(s+18,PX.G-12,s+15,PX.G-20,t.ol),o.rect(s+13,PX.G-22,6,2,t.gold);for(let r=-6;r<=10;r++)for(let i=-14;i<=14;i++)i*i+r*r*2<170&&e.front.dither(s+14+i,PX.G-18+r,t.light(t.gold,.6),.1);};
/* ═══ OFFICIAL-END: MO.study ═══ */

/* ═══ OFFICIAL-BEGIN: MO.wed ═══ */
MO.wed=e=>{const t=e.P,a=e.cast,n=e.a[0]==="s",s=e.a[0]==="k"||n,o=e.a[0]==="g",r=e.m.region==="sa",i=e.m.urban&&!r;let l,c;if(o?(l=moGen(e,"inlaw","F",Math.max(24,a.me.age<30?a.me.age+2:28)),c=moGen(e,"inlaw","M",l.age+2)):s?(l={role:"kid",sex:e.a[1]==="M"?"M":"F",age:Math.max(18,+e.a[2]||28),sk:a.sk},c=n?moGen(e,"inlaw",l.sex,l.age+1):moGen(e,"inlaw",l.sex==="F"?"M":"F",l.age+(l.sex==="F"?2:-2))):(l=a.me,c=a.pt[0]||moGen(e,"pt",a.me.sex==="F"?"M":"F",a.me.age+(a.me.sex==="F"?2:-2))),i)moRoom(e,{wall:t.light(t.wall,.4),floor:"tile",plain:!0});else{moSky(e,"d"),moFar(e),moGrass(e);for(const w of[26,168])moTreeBig(e,w,PX.G);}if(i){const w=e.mid;for(const j of[40,152])w.rect(j,2,1,6,t.gold),w.disc(j,10,3,t.light(t.gold,.5)),w.px(j-2,12,moRGB("#FFF4CF")),w.px(j+2,12,moRGB("#FFF4CF"));for(let j=60;j<132;j++)e.mid.px(j,PX.G+4+j%2,t.light(t.accent,.5));e.mid.rect(60,PX.G+3,72,6,t.light(t.accent,.62));}const f=e.mid,u=MO_CX,d=16,m=r?[moRGB("#F2A23A"),moRGB("#E85A4F"),t.gold]:[t.light(t.accent,.55),t.light(t.wall,.85),t.light(t.accent,.35)];if(r){for(const w of[u-d,u+d-1])f.rect(w,PX.G-26,2,26,t.gold);f.rect(u-d-2,PX.G-28,d*2+4,3,moRGB("#C0303A"));for(let w=u-d-2;w<u+d+2;w+=2)f.px(w,PX.G-25,m[(w>>1)%3]),f.px(w+1,PX.G-24,m[(w>>1)%3]);}else{for(const w of[u-d,u+d-1])f.rect(w,PX.G-20,2,20,t.light(t.wall,.6));for(let w=0;w<=40;w++){const j=Math.PI*w/40,R=Math.round(u-Math.cos(j)*d),z=Math.round(PX.G-20-Math.sin(j)*9);f.px(R,z,t.tree),f.px(R,z-1,m[w%3]),w%2&&f.px(R+1,z,m[(w+1)%3]);}for(let w=PX.G-20;w<PX.G-2;w+=3)f.px(u-d-1,w,m[w%3]),f.px(u+d+1,w,m[(w+1)%3]),f.px(u-d-1,w+1,t.tree),f.px(u+d+1,w+1,t.tree);}const h=w=>r?w.sex==="F"?Object.assign(moWear("red",t),{hat:void 0}):{top:t.light(t.sand,.45),bot:t.light(t.sand,.3)}:w.sex==="F"?Object.assign(moWear("bride",t),{hat:"veil"}):moWear("suit",t),g=moFig(l,t,h(l)),p=moFig(c,t,h(c)),b=s||o?[Object.assign({},a.me),...a.pt,...(o?a.kids.slice(0,2):[])]:[...a.par,...a.sib.slice(0,2)];for(;b.length<4;)b.push(moGen(e,"sib",null,(s?l.age:a.me.age)+(e.R()<.5?0:25)));const k=[t.gold,t.stamp,t.light(t.accent,.25),t.water,t.light(t.tree,.1),t.light(t.wall3,.1)],A=b.slice(0,6).map((w,j)=>({s:moFig(w,t,Object.assign({pose:j%2?"wave":"up"},w.gen?{top:k[(j+(e.R()*6|0))%6]}:{})),dy:0})),x=A.filter((w,j)=>j%2===0),v=A.filter((w,j)=>j%2);if(moRow(e,[...x,{s:g,dy:1,gap:1},{s:p,dy:1,gap:3},...v].map((w,j,R)=>w),MO_CX,PX.G,2),!r&&(l.sex==="F"?0:c.sex==="F"?1:-1)>=0){const j=g.w+1+p.w,R=Math.round(MO_CX-(A.length,0));}fxPetals(e,26,r?moRGB("#F2A23A"):null);};
/* ═══ OFFICIAL-END: MO.wed ═══ */

/* ═══ OFFICIAL-BEGIN: MO.date ═══ */
MO.date=e=>{const t=e.P,a=e.cast,n=a.pt[0]||moGen(e,"pt",e.a[0]==="F"||e.a[0]==="M"?e.a[0]:a.me.sex==="F"?"M":"F",a.me.age+(e.R()*4-2));moSky(e,"dusk"),moFar(e),moGrass(e);for(const f of[44,150])moTreeBig(e,f,PX.G,"round");const s=e.mid;s.rect(130,PX.G-26,1,26,t.ol),s.rect(128,PX.G-28,5,2,t.ol),s.disc(130,PX.G-25,2,moRGB("#FFE7A8"));const o=moFig(a.me,t,{pose:"sit"}),r=moFig(n,t,{pose:"sit"}),i=PX.G-6;moRow(e,[{s:o},{s:r}],MO_CX,i+3,0);const l=e.span[0]-4,c=e.span[1]-e.span[0]+8;e.front.rect(l,i,c,2,t.trunk),e.front.rect(l,i+2,c,1,t.shade(t.trunk,.25)),e.front.rect(l+1,i+3,1,PX.G-i-3,t.ol),e.front.rect(l+c-2,i+3,1,PX.G-i-3,t.ol),e.mid.rect(l,i-8,c,2,t.trunk),e.mid.rect(l+1,i-6,1,6,t.trunk),e.mid.rect(l+c-2,i-6,1,6,t.trunk),fxHeart(e,MO_CX-3,i-24),fxHeart(e,MO_CX+6,i-30,t.light(t.accent,.45));};
/* ═══ OFFICIAL-END: MO.date ═══ */

/* ═══ OFFICIAL-BEGIN: MO.anniv ═══ */
MO.anniv=e=>{const t=e.P,a=e.cast,n=a.pt[0]||moGen(e,"pt",a.me.sex==="F"?"M":"F",a.me.age);moRoom(e,{win:[[40,30]],view:"night",frames:[140,154]}),moAtTable(e,[{s:moFig(a.me,t,{})},{s:moFig(n,t,{}),gap:6}],MO_CX,PX.G-8,{gap:10});const s=e.front,o=MO_CX;s.rect(o,PX.G-12,1,4,moWhite(t)),s.px(o,PX.G-13,moRGB("#FFB43A")),s.px(o,PX.G-14,moRGB("#FFF0B0"));for(const r of[o-6,o+5])s.rect(r,PX.G-12,2,2,t.light(t.accent,.2)),s.px(r,PX.G-10,t.light(t.wall,.6)),s.px(r+1,PX.G-10,t.light(t.wall,.6)),s.rect(r,PX.G-9,2,1,t.light(t.wall,.6));for(let r=-8;r<=4;r++)for(let i=-18;i<=18;i++)i*i+r*r*4<300&&e.mid.dither(o+i,PX.G-13+r,t.light(t.gold,.55),.18);fxHeart(e,o-2,8,t.light(t.accent,.3));};
/* ═══ OFFICIAL-END: MO.anniv ═══ */

/* ═══ OFFICIAL-BEGIN: MO.cake ═══ */
MO.cake=e=>{const t=e.P,a=e.cast,n=e.a[0]||"me";moRoom(e,{win:[[30,22]],view:"dusk",frames:[150]}),moBunting(e,3,50,142);let s=a.me;n==="kid"?s=a.kids.slice().sort((i,l)=>i.age-l.age)[0]||a.me:n==="gk"&&(s=a.gk[0]||moGen(e,"kid",null,6));const o=[a.me,...moFam(e,6)].filter(i=>i!==s).slice(0,5);for(;o.length<2;)o.push(moGen(e,"sib",null,a.me.age+(e.R()*10-5)));const r=moAround({s:moFig(s,t,{hat:"party",pose:"up"}),dy:s.role==="me"?1:0},o.map((i,l)=>({s:moFig(i,t,{hat:l<3?"party":void 0,cap:[t.gold,t.water,t.stamp][l%3]})})));moAtTable(e,r,MO_CX,PX.G-8),moCake(e,MO_CX-4,PX.G-8,5),moBalloons(e,e.span[0]-10,16),moBalloons(e,e.span[1]+4,14,2);};
/* ═══ OFFICIAL-END: MO.cake ═══ */

/* ═══ OFFICIAL-BEGIN: MO.meal ═══ */
MO.meal=e=>{const t=e.P,a=e.cast;moRoom(e,{win:[[28,22]],view:e.R()<.5?"dusk":"d",frames:[146,160]});const n=moFam(e,6);for(;n.length<2;)n.push(moGen(e,"sib",null,a.me.age));const s=moAround({s:moFig(a.me,t,{}),dy:1},n.map(r=>({s:moFig(r,t,{})})));moAtTable(e,s,MO_CX,PX.G-8),moDishes(e,e.span[0]-4,e.span[1]-e.span[0]+8,PX.G-8);const o=e.mid;o.rect(MO_CX,0,1,8,t.ol),o.rect(MO_CX-4,8,9,3,t.light(t.gold,.3));for(let r=0;r<=30;r++)for(let i=-30;i<=30;i++)i*i/4+r*r<600&&o.dither(MO_CX+i,11+r,t.light(t.gold,.6),.1);};
/* ═══ OFFICIAL-END: MO.meal ═══ */

/* ═══ OFFICIAL-BEGIN: MO.bed ═══ */
MO.bed=e=>{const t=e.P,a=e.cast;moRoom(e,{win:[[44,22]],view:"nigh\
t",frames:[148],plain:!0});let n,s;a.me.age<13?(n=a.me,s=a.par.find(l=>l.sex==="F")||a.par[0]||a.sib[0]||moGen(e,"par","F",a.me.age+28)):(n=a.kids.filter(l=>l.age<13).sort((l,c)=>l.age-c.age)[0]||a.gk[0]||moGen(e,"kid",null,6),s=a.me);const o=moFig(n,t,{top:t.light(n.role==="me"?t.me:t.kid,.3)});moBed(e,MO_CX-4,34,PX.G-9,o,{blanket:t.light(t.water,.35)});const r=moFig(s,t,{pose:"sit"});moPut(e,r,MO_CX-18,PX.G-r.h),moSpan(e,MO_CX-20,MO_CX+30);const i=e.front;i.rect(MO_CX-21,PX.G-6,9,1,t.trunk),i.rect(MO_CX-20,PX.G-5,1,5,t.trunk),i.rect(MO_CX-14,PX.G-5,1,5,t.trunk),i.rect(MO_CX-18+r.w-3,PX.G-r.h+r.hand[1]-3,4,3,t.accent),i.rect(MO_CX-18+r.w-2,PX.G-r.h+r.hand[1]-3,1,3,moWhite(t)),i.rect(MO_CX+34,PX.G-8,5,8,t.shade(t.trunk,.05)),i.rect(MO_CX+35,PX.G-12,3,4,t.light(t.gold,.4));for(let l=-10;l<=8;l++)for(let c=-14;c<=14;c++)c*c+l*l*2<170&&i.dither(MO_CX+36+c,PX.G-11+l,t.light(t.gold,.6),.14);fxStars(e,0);for(const[l,c]of[[MO_CX+6,12],[MO_CX+14,8],[MO_CX+22,13]])i.px(l,c,t.light(t.gold,.5)),i.px(l-1,c,t.light(t.gold,.5)),i.px(l+1,c,t.light(t.gold,.5)),i.px(l,c-1,t.light(t.gold,.5)),i.px(l,c+1,t.light(t.gold,.5));};
/* ═══ OFFICIAL-END: MO.bed ═══ */

/* ═══ OFFICIAL-BEGIN: MO.play ═══ */
MO.play=e=>{const t=e.P,a=e.cast;moSky(e,"d"),moFar(e),moGrass(e);for(const f of[30,62,160])moTreeBig(e,f,PX.G,"round");let n,s;a.me.age<13?(n=a.me,s=a.par.find(f=>f.sex==="M")||a.par[0]||moGen(e,"par","M",a.me.age+30)):(n=a.kids.filter(f=>f.age>=2&&f.age<13).sort((f,u)=>f.age-u.age)[0]||a.gk[0]||moGen(e,"kid",null,5),s=a.me);const o=e.a[0]||["sh","bike","kite"][Math.floor(e.R()*3)],r=moFig(s,t,{pose:o==="sh"?"up":o==="kite"?"wave":""}),i=moFig(n,t,{pose:o==="bike"?"":"up"}),l=e.front,c=MO_CX-4;if(o==="sh"){const f=PX.G-r.h+1;moPut(e,i,c+Math.round((r.w-i.w)/2),f-i.h+4),moPut(e,r,c,f),moSpan(e,c-6,c+r.w+6);}else if(o==="bike"){const f=c+4,u=PX.G-3,d=moFig(n,t,{pose:"sit"});for(const m of[f,f+12]){for(let h=0;h<24;h++){const g=h/24*Math.PI*2;l.px(Math.round(m+Math.cos(g)*3),Math.round(u+Math.sin(g)*3),t.ol);}l.px(m,u,t.metal);}moPut(e,d,f+2,u-4-d.h+3),l.line(f,u,f+6,u-1,t.accent),l.line(f+6,u-1,f+12,u,t.accent),l.line(f+4,u-4,f+6,u-1,t.accent),l.line(f+10,u-6,f+12,u,t.accent),l.rect(f+9,u-7,3,1,t.ol),l.rect(f+3,u-5,3,1,t.ol),moPut(e,r,f-10,PX.G-r.h+1),moSpan(e,f-12,f+16);}else{moPut(e,r,c-6,PX.G-r.h+1),moPut(e,i,c+r.w-3,PX.G-i.h),moSpan(e,c-8,c+20);const f=c+26,u=10;e.sky.px(f,u-3,t.accent);for(let d=-2;d<=2;d++)for(let m=-(2-Math.abs(d));m<=2-Math.abs(d);m++)e.sky.px(f+m,u+d,d<0?t.accent:t.gold);for(let d=0;d<1;d+=.02)e.sky.px(Math.round(f+(c+r.w+4-f)*d),Math.round(u+3+(PX.G-12-u)*d*d),t.light(t.ol,.3));}};
/* ═══ OFFICIAL-END: MO.play ═══ */

/* ═══ OFFICIAL-BEGIN: MO.hosp ═══ */
MO.hosp=e=>{const t=e.P,a=e.cast,n=e.a[0]||"me";moRoom(e,{wall:pxMix(t.wall,t.light(t.water,.6),.3),floor:"tile",win:[[22,26]],plain:!0});const o=(n==="kid"?a.kids.slice().sort((f,u)=>f.age-u.age)[0]:n==="pt"?a.pt[0]:n==="par"?a.par[0]||moGen(e,"par",null,a.me.age+28):a.me)||a.me,r=moFig(o,t,moWear("patient",t));moBed(e,MO_CX-22,42,PX.G-12,r,{hosp:!0});const i=(o===a.me?moFam(e,3):[a.me,...moFam(e,2).filter(f=>f!==o)]).slice(0,3);let l=MO_CX+28;for(const f of i){const u=moFig(f,t,{});moPut(e,u,l,PX.G-u.h+(f.role==="me"?1:0)),l+=u.w+2;}moSpan(e,MO_CX-24,Math.min(PX.W,l)),moVase(e,MO_CX-36,PX.G-12);const c=e.mid;c.rect(MO_CX+2,10,14,9,t.ol),c.rect(MO_CX+3,11,12,7,moRGB("#18302A"));for(let f=0;f<12;f++)c.px(MO_CX+3+f,14+(f===5?-2:f===6?2:0),moRGB("#6FE0A0"));};
/* ═══ OFFICIAL-END: MO.hosp ═══ */

/* ═══ OFFICIAL-BEGIN: MO.loss ═══ */
MO.loss=e=>{const t=e.P,a=e.cast,n=e.a[0]==="pet",s=Object.assign({},e.m,{mood:"low"});pxSky(e.sky,Object.assign(s,{stage:"e"}),t,e.R);for(let d=0;d<5;d++)pxCloud(e.sky,Math.round(10+d*42+e.R()*10),Math.round(12+e.R()*8),Math.round(24+e.R()*10),t,e.R,!0);moFar(e),moGrass(e);for(const d of[24,170])moTreeBig(e,d,PX.G,"pine");const o=e.mid,r=MO_CX+16,i=t.light(t.stone,.3);if(n)o.rect(r-6,PX.G-2,13,2,t.soil),o.disc(r,PX.G-1,3,t.soil),o.rect(r,PX.G-9,1,7,t.trunk),o.rect(r-2,PX.G-8,5,1,t.trunk);else{for(const d of[-38,36])o.rect(r+d-3,PX.G-8,7,8,t.shade(i,.1)),o.rect(r+d-2,PX.G-9,5,1,t.shade(i,.1));o.rect(r-5,PX.G-13,11,13,i),o.rect(r-4,PX.G-14,9,1,i),o.rect(r-3,PX.G-15,7,1,i),o.rect(r+4,PX.G-13,2,13,t.shade(i,.15)),o.rect(r-2,PX.G-10,5,1,t.shade(i,.25)),o.rect(r-2,PX.G-8,5,1,t.shade(i,.25));}moFlowers(e,r-4,PX.G-3,e.front,4,t.light(t.wall,.9)),moFlowers(e,r+3,PX.G-3,e.front,3,t.light(t.wall,.9));const l=[a.me,...moFam(e,3)].slice(0,4),c=moWear("black",t),f=[t.ol,t.shade(t.accent,.35),t.shade(t.stamp,.35),t.shade(t.wall3,.3)];let u=MO_CX-12-l.length*6;l.forEach((d,m)=>{const h=moFig(d,t,n?{}:c),g=u+(h.w>>1),p=PX.G-h.h-3+(d.role==="me"?1:0);if(moPut(e,h,u,PX.G-h.h+(d.role==="me"?1:0)),d.age>=7){const b=f[m%4];[2,4,6,6].forEach((k,A)=>{for(let x=-k;x<=k;x++)e.front.px(g+x,p-7+A,A===3&&(x+6)%4===0?t.light(b,.25):b);}),e.front.px(g,p-8,t.ol),e.front.line(g,p-3,g,p+3,t.ol);}u+=h.w+4;}),moSpan(e,MO_CX-12-l.length*6-4,r+8),fxRain(e,80);};
/* ═══ OFFICIAL-END: MO.loss ═══ */

/* ═══ OFFICIAL-BEGIN: MO.mem ═══ */
MO.mem=e=>{const t=e.P,a=e.cast;moSky(e,"e"),moFar(e),moGrass(e);for(const i of[30,164])moTreeBig(e,i,PX.G,"round");const n=e.mid,s=MO_CX+12,o=t.light(t.stone,.35);n.rect(s-5,PX.G-13,11,13,o),n.rect(s-4,PX.G-14,9,1,o),n.rect(s-3,PX.G-15,7,1,o),n.rect(s+4,PX.G-13,2,13,t.shade(o,.15)),moFlowers(e,s-4,PX.G-3,e.front,4),moFlowers(e,s+3,PX.G-3,e.front,3);const r=moFig(a.me,t,{});moPut(e,r,MO_CX-14,PX.G-r.h+1),moBouquet(e,MO_CX-14+r.w,PX.G-r.h+1+r.hand[1]-1),moSpan(e,MO_CX-20,s+10);for(let i=0;i<3;i++){const l=60+i*9,c=10+i%2*3;e.sky.px(l-1,c-1,t.ol),e.sky.px(l,c,t.ol),e.sky.px(l+1,c-1,t.ol);}};
/* ═══ OFFICIAL-END: MO.mem ═══ */

/* ═══ OFFICIAL-BEGIN: MO.friends ═══ */
MO.friends=e=>{const t=e.P,a=e.cast,n=e.R()<.4&&!e.m.urban;moSky(e,"night"),n?(moFar(e),moGrass(e)):(moFar(e),moPave(e));const s=[moGen(e,"sib",null,a.me.age+1),moGen(e,"pt",null,a.me.age-1),moGen(e,"inlaw",null,a.me.age+2)];if(n){const o=moAround({s:moFig(a.me,t,{pose:"sit"})},s.map((l,c)=>({s:moFig(l,t,{pose:c===0?"up":"sit"})})));moRow(e,o,MO_CX,PX.G-1,10);const r=e.front,i=MO_CX+1;r.rect(i-4,PX.G-1,9,2,t.trunk);for(let l=0;l<7;l++)for(let c=-3+(l>>1);c<=3-(l>>1);c++)r.px(i+c,PX.G-2-l,l<3?moRGB("#F2A23A"):moRGB("#FFD86A"));for(let l=-14;l<=4;l++)for(let c=-30;c<=30;c++)c*c+l*l*4<900&&e.mid.dither(i+c,PX.G-4+l,moRGB("#F2A23A"),.12);fxStars(e,30);}else{fxLanterns(e,2,30,162);const o=moAround({s:moFig(a.me,t,{pose:"up"}),dy:1},s.map((r,i)=>({s:moFig(r,t,{pose:i===1?"wave":""})})));moAtTable(e,o,MO_CX,PX.G-8,{cloth:!1});for(let r=0;r<4;r++){const i=e.span[0]+4+r*9;e.front.rect(i,PX.G-11,2,3,t.light(t.gold,.4)),e.front.px(i,PX.G-11,moWhite(t));}}};
/* ═══ OFFICIAL-END: MO.friends ═══ */

/* ═══ OFFICIAL-BEGIN: MO.walk ═══ */
MO.walk=e=>{const t=e.P,a=e.cast,n=(e.a[0]==="pt"||!e.a[0]&&a.pt.length)&&a.pt.length;moSky(e,"m"),fxRays(e,30,14),moFar(e),moGrass(e);const s=e.mid;for(let r=PX.G;r<PX.H;r++){const i=8+(r-PX.G)*3;s.rect(MO_CX-(i>>1)-(r-PX.G),r,i,1,t.light(t.sand,.2));}for(const r of[36,150,172])moTreeBig(e,r,PX.G-1);const o=n?[a.me,a.pt[0]]:[a.me];moRow(e,o.map(r=>({s:moFig(r,t,{pose:"walk"}),dy:r.role==="me"?1:0})),MO_CX,PX.G+2,0),n&&e.front.px(MO_CX,PX.G-6,t.skin);for(let r=0;r<3;r++){const i=120+r*8,l=12+r%2*2;e.sky.px(i-1,l-1,t.ol),e.sky.px(i,l,t.ol),e.sky.px(i+1,l-1,t.ol);}};
/* ═══ OFFICIAL-END: MO.walk ═══ */

/* ═══ OFFICIAL-BEGIN: MO_WORK ═══ */
const MO_WORK={clerk:"office",callc:"office",finance:"office",dev:"office",lawyer:"office",engineer:"office",civil:"office",social:"office",salesagent:"\
office",designer:"studio",teacher:"class",prof:"class",childcare:"class",boardpro:"class",progamer:"office",doctor:"clinic",nurse:"clinic",healthtech:"clinic",care:"clinic",farm:"field",farmhand:"field",agbiz:"field",herder:"herd",fisher:"sea",seafarer:"sea",vendor:"market",shop:"market",owner:"market",artisan:"market",hair:"market",mechanic:"market",construct:"site",miner:"site",welder:"site",electric:"site",factory:"factory",garment:"factory",warehouse:"factory",driver:"road",delivery:"road",cook:"kitchen",artist:"studio",creator:"studio",writer:"office",musician:"stage",idol:"stage",actor:"stage",dancer:"stage",athlete:"sport",coach:"sport",trainer:"sport",clergy:"church",soldier:"base",police:"base",service:"base",guard:"base",domestic:"house",cleaner:"house",homemaker:"house",childwork:"house",shelter:"factory",pilot:"sky",cabin:"sky",astro:"space",mp:"hall",leader:"hall"};
/* ═══ OFFICIAL-END: MO_WORK ═══ */

/* ═══ OFFICIAL-BEGIN: MO.work ═══ */
MO.work=e=>{const t=e.a[0]||"clerk",a=MO_WORK[t]||"office",n=e.a[1]||"";(MO_W[a]||MO_W.office)(e,t,n);const s=e.P;if(n==="rank"||n==="ret"){const o=[moGen(e,"pt",null,e.cast.me.age-6),moGen(e,"sib",null,e.cast.me.age+4)],r=[e.span?e.span[0]-12:MO_CX-30,e.span?e.span[1]+3:MO_CX+22];o.forEach((i,l)=>{const c=moFig(i,s,{pose:l?"wave":"up"});moPut(e,c,r[l],PX.G-c.h),moSpan(e,r[l]-1,r[l]+c.w+1);}),n==="rank"?fxSpark(e,MO_CX,14,4):(moBunting(e,3,MO_CX-50,MO_CX+50,e.front),fxPetals(e,10));}};
/* ═══ OFFICIAL-END: MO.work ═══ */

/* ═══ OFFICIAL-BEGIN: MO_W ═══ */
const MO_W={};
/* ═══ OFFICIAL-END: MO_W ═══ */

/* ═══ OFFICIAL-BEGIN: moTripWho ═══ */
function moTripWho(e,t){const a=e.cast,n=a.me;return t==="pt"&&a.pt.length?[a.pt[0]]:t==="dateF"||t==="dateM"?[moGen(e,"pt",t.slice(4),n.age)]:t==="fam"?[...a.pt,...a.kids.filter(s=>s.age<18).slice(0,3)]:t==="fr"?[moGen(e,"sib",null,n.age+1),moGen(e,"inlaw",null,n.age-1)]:t==="par"?a.par.length?a.par.slice(0,2):[moGen(e,"par","F",n.age+28),moGen(e,"par","M",n.age+30)]:t==="sib"?a.sib.length?a.sib.slice(0,2):[moGen(e,"sib",null,n.age+2)]:[];}
/* ═══ OFFICIAL-END: moTripWho ═══ */

/* ═══ OFFICIAL-BEGIN: MO.trip ═══ */
MO.trip=e=>{const t=e.P,a=e.cast,n=e.a[0]||"beach",s=e.a[1]||e.m.region,o=e.a[2]||"solo",r=Object.assign({},e.m,{region:s,urban:!1}),i=Object.assign({},e,{m:r});(MO_T[n]||MO_T.beach)(i,s),e.span=i.span;const l=moTripWho(e,o),c=!l.length,f=moAround({s:moFig(a.me,t,{pose:n==="mount"?"up":c?"wave":"up",hat:n==="beach"&&a.me.age>=13?"cap":void 0,cap:t.gold}),dy:1},l.map((d,m)=>({s:moFig(d,t,{pose:m%2?"wave":""})}))),u=i.gy||PX.G;if(moRow(e,f,i.gx||MO_CX,u,2),c){const d=e.front,m=e.span[1]+1,h=u-10;d.rect(m,h,3,2,t.ol),d.px(m+1,h-1,t.ol);}n!=="mount"&&moSuitcase(e,e.span[0]-7,u,t.accent);};
/* ═══ OFFICIAL-END: MO.trip ═══ */

/* ═══ OFFICIAL-BEGIN: MO_T ═══ */
const MO_T={};
/* ═══ OFFICIAL-END: MO_T ═══ */

/* ═══ OFFICIAL-BEGIN: MO.fly ═══ */
MO.fly=e=>{const t=e.P,a=e.cast;moRoom(e,{wall:t.light(t.wall2,.3),floor:"tile",plain:!0});const n=e.mid;n.rect(10,4,172,32,t.light(t.metal,.2));for(let l=11;l<181;l+=17)for(let c=5;c<35;c++)n.rect(l,c,16,1,pxMix(moRGB(t.sky.d[0]),moRGB(t.sky.d[1]),(c-5)/30));n.rect(11,30,170,5,t.pave2);for(let l=14;l<180;l+=10)n.rect(l,32,5,1,t.light(t.wall,.7));moPlane(e,120,14,n,2),n.line(116,20,104,26,t.light(t.wall,.5)),n.rect(22,38,30,7,t.ol);for(let l=0;l<3;l++)for(let c=24;c<50;c+=3)n.px(c,39+l*2,c%9?t.gold:t.tree);const s=[a.me,...a.pt,...a.kids.filter(l=>l.age<18)].slice(0,4),o=a.me.age<30?a.par.slice(0,2):[],r=moRow(e,s.map(l=>({s:moFig(l,t,{pose:l===a.me?"\
wave":""}),dy:l===a.me?1:0})),MO_CX+10);moSuitcase(e,e.span[1]+2,PX.G,t.accent),moSuitcase(e,e.span[0]-7,PX.G,t.stamp);let i=e.span[0]-12;for(const l of o){const c=moFig(l,t,{pose:"wave"});i-=c.w+2,moPut(e,c,i,PX.G-c.h),moSpan(e,i,e.span[1]);}};
/* ═══ OFFICIAL-END: MO.fly ═══ */

/* ═══ OFFICIAL-BEGIN: MO.back ═══ */
MO.back=e=>{const t=e.P,a=e.cast;moSky(e,"e"),moFar(e),moGrass(e);const n=pxHome(Object.assign({},e.m,{home:e.m.home==="flat"?"house":e.m.home}),t,e.R);e.mid.blit(n,20,PX.G-n.h,t.ol),moBunting(e,10,60,150);const s=[...a.par,...a.sib,...a.pt,...a.kids].slice(0,4);for(;s.length<2;)s.push(moGen(e,"sib",null,a.me.age+25));moRow(e,[...s.map(o=>({s:moFig(o,t,{pose:"up"})})),{s:moFig(a.me,t,{pose:"up"}),dy:1,gap:3}],MO_CX+6),moSuitcase(e,e.span[1]+2,PX.G,t.accent),fxSpark(e,MO_CX+6,16,3);};
/* ═══ OFFICIAL-END: MO.back ═══ */

/* ═══ OFFICIAL-BEGIN: MO.home ═══ */
MO.home=e=>{const t=e.P,a=e.cast;moSky(e,"d"),moFar(e),moGrass(e);const n=Object.assign({},e.m,{stage:"d"}),s=pxHome(n,t,e.R);e.mid.blit(s,MO_CX-(s.w>>1)+30,PX.G-s.h,t.ol),moTreeBig(e,26,PX.G),moTreeBig(e,170,PX.G);const o=moFig(a.me,t,{pose:"wave"}),r=moAround({s:o,dy:1},moFam(e,4,{noPar:!0}).map(f=>({s:moFig(f,t,{pose:f.age<13?"up":""})}))),i=moRow(e,r,MO_CX-14),l=r.findIndex(f=>f.s===o);e.front.rect(i[l]+o.w-1,PX.G-o.h+1-1,2,3,t.gold),e.front.px(i[l]+o.w,PX.G-o.h+3,t.gold);const c=e.span[0]-18;for(const[f,u,d]of[[0,0,10],[10,0,8],[3,-6,8]])e.front.rect(c+f,PX.G-6+u,d,6,t.light(t.trunk,.35)),e.front.rect(c+f+(d>>1),PX.G-6+u,1,6,t.light(t.sand,.5));moSpan(e,c,e.span[1]),fxConfetti(e,10,30);};
/* ═══ OFFICIAL-END: MO.home ═══ */

/* ═══ OFFICIAL-BEGIN: MO.car ═══ */
MO.car=e=>{const t=e.P,a=e.cast,n=e.a[0]==="moto";moSky(e,"d"),moFar(e),moPave(e);const s=e.front,o=MO_CX+2;if(n){const c=pxMoto(t,!1);s.blit(c,o,PX.G-c.h,null);}else{const c=t.accent,f=new PxR(32,13);f.rect(8,0,14,5,c),f.rect(10,1,4,3,t.win),f.rect(15,1,5,3,t.win),f.rect(0,5,32,5,c),f.rect(0,9,32,1,t.shade(c,.3)),f.rect(30,6,2,2,t.gold),f.rect(0,6,1,2,t.light(t.accent,.5)),s.blit(f,o,PX.G-14,t.ol);for(const d of[o+7,o+25])s.disc(d,PX.G-2,2,t.ol),s.px(d,PX.G-2,t.metal);const u=moRGB("#E04848");s.rect(o+14,PX.G-14,2,10,u),s.disc(o+15,PX.G-15,2,u),s.px(o+15,PX.G-15,t.light(u,.4));}const r=moFig(a.me,t,{pose:"wave"});moPut(e,r,o-r.w-4,PX.G-r.h+1),moSpan(e,o-r.w-6,o+(n?16:34));const i=moFam(e,2,{noPar:!0});let l=o-r.w-6;for(const c of i){const f=moFig(c,t,{pose:"up"});l-=f.w+2,moPut(e,f,l,PX.G-f.h),moSpan(e,l,e.span[1]);}fxSpark(e,o+14,18,3);};
/* ═══ OFFICIAL-END: MO.car ═══ */

/* ═══ OFFICIAL-BEGIN: MO.pet ═══ */
MO.pet=e=>{const t=e.P,a=e.cast,n=e.a[0]||e.m.pet||"d";moSky(e,"d"),moFar(e),moGrass(e);const s=pxHome(e.m,t,e.R);e.mid.blit(s,18,PX.G-s.h,t.ol),moTreeBig(e,170,PX.G);const o=moFig(a.me,t,{pose:"sit"}),r=MO_CX-8;moPut(e,o,r,PX.G-o.h);const i=pxPet(n,t);moPut(e,i,r+o.w-2,PX.G-i.h);const l=moFam(e,2);let c=r-2;for(const f of l){const u=moFig(f,t,{pose:"up"});c-=u.w+2,moPut(e,u,c,PX.G-u.h);}e.front.disc(r+o.w+i.w+6,PX.G-2,2,t.accent),e.front.px(r+o.w+i.w+5,PX.G-3,t.light(t.accent,.5)),fxHeart(e,r+o.w-2,PX.G-o.h-8),moSpan(e,c,r+o.w+i.w+10);};
/* ═══ OFFICIAL-END: MO.pet ═══ */

/* ═══ OFFICIAL-BEGIN: MO.grand ═══ */
MO.grand=e=>{const t=e.P,a=e.cast,n=e.a[0]==="new";moRoom(e,{win:[[30,22]],frames:[146,160],lamp:176});const s=e.front,o=MO_CX-26,r=52;s.rect(o,PX.G-12,r,3,t.light(t.accent,.35)),s.rect(o,PX.G-9,r,6,t.light(t.accent,.25)),s.rect(o-3,PX.G-14,4,11,t.light(t.accent,.3)),s.rect(o+r-1,PX.G-14,4,11,t.light(t.accent,.3)),s.rect(o+2,PX.G-3,2,3,t.trunk),s.rect(o+r-4,PX.G-3,2,3,t.trunk),e.mid.rect(o,PX.G-22,r,10,t.light(t.accent,.4));const i=a.gk.length?a.gk.slice(0,3):[moGen(e,"kid",null,6),moGen(e,"kid",null,3)],c=[{s:moFig(a.me,t,n?{pose:"hold",bun:t.light(t.kid,.55)}:{pose:"sit"}),dy:-3},...a.pt.slice(0,1).map(f=>({s:moFig(f,t,{pose:"sit"}),dy:-3})),...i.map(f=>({s:moFig(f,t,{pose:f.age<7?"up":"sit"}),dy:f.age<7?0:-3}))];moRow(e,c,MO_CX,PX.G-3+0,1),s.rect(o,PX.G-9,r,1,t.shade(t.light(t.accent,.25),.1)),fxHeart(e,MO_CX-2,10);};
/* ═══ OFFICIAL-END: MO.grand ═══ */

/* ═══ OFFICIAL-BEGIN: MO.phone ═══ */
MO.phone=e=>{const t=e.P,a=e.cast,n=e.a[0]==="gift";moRoom(e,{win:[[MO_CX-2,26]],frames:[40,150]});const s=moFig(a.me,t,{}),o=MO_CX-16;if(moPut(e,s,o,PX.G-s.h+1),e.front.rect(o+s.w-2,PX.G-s.h+1+4,2,3,t.ol),e.front.blit(pxSprite([".WWWWW.","WWWWWWW","WWWHWWW","WWWWWWW",".WWWWW.","....WW.",".....W."],{W:moWhite(t),H:t.light(t.accent,.1)}),o+s.w+2,PX.G-s.h-8,t.ol),n){const r=o+s.w+14;e.front.rect(r,PX.G-7,9,7,t.light(t.trunk,.35)),e.front.rect(r+4,PX.G-7,1,7,t.accent),e.front.rect(r,PX.G-5,9,1,t.accent),e.front.px(r+3,PX.G-8,t.accent),e.front.px(r+5,PX.G-8,t.accent);}moSpan(e,o-4,o+s.w+24);};
/* ═══ OFFICIAL-END: MO.phone ═══ */

/* ═══ OFFICIAL-BEGIN: MO.photos ═══ */
MO.photos=e=>{const t=e.P,a=e.cast;moRoom(e,{lamp:MO_CX-26});const n=e.mid;for(let i=0;i<9;i++){const l=62+i%5*14+(i>=5?7:0),c=8+(i>=5?12:0);n.rect(l,c,10,8,t.trunk),n.rect(l+1,c+1,8,6,t.light(t.wall,.65)),n.rect(l+3,c+3,4,4,[t.me,t.kid,t.pt,t.accent][i%4]),n.disc(l+5,c+3,1,t.skin);}const s=moFig(a.me,t,{pose:"sit"}),o=MO_CX-6,r=e.front;if(r.rect(o-4,PX.G-18,s.w+8,14,t.light(t.accent,.3)),moPut(e,s,o,PX.G-s.h-2),r.rect(o-5,PX.G-9,4,9,t.light(t.accent,.2)),r.rect(o+s.w+1,PX.G-9,4,9,t.light(t.accent,.2)),r.rect(o-3,PX.G-4,s.w+6,4,t.light(t.accent,.25)),r.rect(o+1,PX.G-10,7,3,moWhite(t)),r.rect(o+4,PX.G-10,1,3,t.shade(t.trunk,.2)),a.pt.length){const i=moFig(a.pt[0],t,{});moPut(e,i,o+s.w+8,PX.G-i.h);}moSpan(e,o-8,o+s.w+18);};
/* ═══ OFFICIAL-END: MO.photos ═══ */

/* ═══ OFFICIAL-BEGIN: MO.garden ═══ */
MO.garden=e=>{const t=e.P,a=e.cast;moSky(e,"e"),moFar(e),moGrass(e);const n=e.mid;n.rect(50,PX.G-2,92,8,t.soil);for(let l=0;l<4;l++){n.rect(50,PX.G+l*2,92,1,t.soil2);for(let c=54+l%2*3;c<140;c+=7)n.disc(c,PX.G-3+l*2,2,l%2?t.tree:t.light(t.tree,.2)),l===1&&n.px(c+1,PX.G-4,t.accent);}for(let l=0;l<PX.W;l+=5)n.rect(l,PX.G-9,1,9,t.light(t.trunk,.3));n.rect(0,PX.G-7,PX.W,1,t.light(t.trunk,.3));const s=moFig(a.me,t,{hat:"straw"}),o=MO_CX-10;moPut(e,s,o,PX.G-s.h+1);const r=pxSprite([".RGRYR.","TGRYGRT","TTTTTTT",".TTTTT."],{T:t.thatch,G:t.tree,R:t.accent,Y:t.gold});moPut(e,r,o+s.w,PX.G-s.h+1+s.hand[1]-1);const i=moFig(a.pt[0]||moGen(e,"par",null,a.me.age+2),t,{pose:"wave"});moPut(e,i,o+s.w+12,PX.G-i.h),moSpan(e,o-2,o+s.w+12+i.w+2);};
/* ═══ OFFICIAL-END: MO.garden ═══ */

/* ═══ OFFICIAL-BEGIN: MO.help ═══ */
MO.help=e=>{const t=e.P,a=e.cast;moSky(e,"d"),moFar(e),moPave(e);const n=pxHome(Object.assign({},e.m,{home:e.m.urban?"flat":e.m.home}),t,e.R);e.mid.blit(n,14,PX.G-n.h,t.ol);const s=new PxR(40,18);s.rect(0,0,28,14,t.light(t.wall,.5)),s.rect(28,4,11,10,t.stamp),s.rect(30,6,6,4,t.win),s.rect(0,13,40,2,t.shade(t.wall3,.2)),e.mid.blit(s,128,PX.G-17,t.ol);for(const f of[136,162])e.mid.disc(f,PX.G-1,2,t.ol);const o=moFig(a.me,t,{}),r=moFig(moGen(e,"par",null,a.me.age+6),t,{}),i=MO_CX-12;moPut(e,o,i,PX.G-o.h+1),moPut(e,r,i+o.w+8,PX.G-r.h);const l=PX.G-o.h+1+o.hand[1]-4;e.front.rect(i+o.w-2,l,12,6,t.light(t.trunk,.35)),e.front.rect(i+o.w+3,l,1,6,t.light(t.sand,.5));const c=moFig(moGen(e,"kid",null,6),t,{pose:"wave"});moPut(e,c,i+o.w+r.w+12,PX.G-c.h),moSpan(e,i-2,i+o.w+r.w+20);};
/* ═══ OFFICIAL-END: MO.help ═══ */

/* ═══ OFFICIAL-BEGIN: MO.fest ═══ */
MO.fest=e=>{const t=e.P,a=e.cast,n=e.m.region==="sa";moSky(e,"night"),moFar(e),moGrass(e),fxLanterns(e,4,10,182),fxLanterns(e,12,30,160,e.back);const s=[a.me,...moFam(e,3)];for(;s.length<5;)s.push(moGen(e,"sib",null,10+e.R()*50));if(moRow(e,s.map((o,r)=>({s:moFig(o,t,{pose:r%2?"wave":"up"}),dy:r%2-(o.role==="me",0)})),MO_CX,PX.G,4),n)for(let o=20;o<PX.W;o+=14)e.front.rect(o,PX.G-2,3,2,t.shade(t.trunk,.1)),e.front.px(o+1,PX.G-3,moRGB("#FFD86A"));else{const o=e.span[1]+10;e.front.rect(o-4,PX.G-1,9,2,t.trunk);for(let r=0;r<8;r++)for(let i=-3+(r>>1);i<=3-(r>>1);i++)e.front.px(o+i,PX.G-2-r,r<3?moRGB("#F2A23A"):moRGB("#FFD86A"));moSpan(e,e.span[0],o+6);}fxNote(e,MO_CX-20,18),fxNote(e,MO_CX+18,14);};
/* ═══ OFFICIAL-END: MO.fest ═══ */

/* ═══ OFFICIAL-BEGIN: MO.stars ═══ */
MO.stars=e=>{const t=e.P,a=e.cast;moSky(e,"night"),fxStars(e,90);for(let o=0;o<140;o++){const r=e.R(),i=r*PX.W,l=4+r*30+(e.R()-.5)*10;e.sky.dither(Math.round(i),Math.round(l),moRGB("#6B6E9A"),.6);}e.sky.line(150,8,162,12,moRGB("#FFF4CF")),pxHills(e.mid,t,e.R,.04,PX.G-3,5,moRGB("#2A3A44"),null),e.mid.rect(0,PX.G,PX.W,PX.H-PX.G,moRGB("#24343A"));for(let o=0;o<PX.W;o++)e.R()<.25&&e.mid.px(o,PX.G-1,moRGB("#2E4248"));const n=a.me.age<13?a.par[0]||moGen(e,"par","M",66):null,s=n?[n,a.me]:[a.me,...(a.gk[0]?[a.gk[0]]:a.kids[0]?[a.kids[0]]:a.pt.slice(0,1))];moRow(e,s.map(o=>({s:moFig(o,t,{pose:"sit"})})),MO_CX,PX.G-1,2),e.front.rect(e.span[0]-3,PX.G-2,e.span[1]-e.span[0]+6,2,t.light(t.accent,.2));};
/* ═══ OFFICIAL-END: MO.stars ═══ */

/* ═══ OFFICIAL-BEGIN: MO.rain ═══ */
MO.rain=e=>{const t=e.P,a=e.cast,n=e.a[0]==="snow";if(n){for(let r=0;r<PX.H;r++)e.sky.rect(0,r,PX.W,1,pxMix(t.light(t.wall3,.35),t.light(t.wall,.6),r/PX.G));moFar(e),e.mid.rect(0,PX.G-1,PX.W,PX.H-PX.G+1,t.light(t.wall,.85));for(let r=0;r<PX.W;r+=4)e.mid.px(r,PX.G+2+r%7,t.light(t.wall3,.5));}else{const r=Object.assign({},e.m,{mood:"low",stage:"d"});pxSky(e.sky,r,t,e.R);for(let i=0;i<5;i++)pxCloud(e.sky,Math.round(15+i*40),Math.round(14+e.R()*6),26,t,e.R,!0);moFar(e),moGrass(e);for(const i of[40,70,130,160])e.mid.rect(i,PX.G+4,10,1,t.light(t.water,.4));}const s=pxHome(e.m,t,e.R);e.mid.blit(s,16,PX.G-s.h,t.ol);const o=[a.me,...moFam(e,3)];for(;o.length<3;)o.push(moGen(e,"kid",null,8));if(moRow(e,o.map(r=>({s:moFig(r,t,{pose:"up"}),dy:r.role==="me"?1:0})),MO_CX+8,PX.G,4),n){const r=e.span[1]+8,i=t.light(t.wall,.9);e.front.disc(r,PX.G-3,3,i),e.front.disc(r,PX.G-8,2,i),e.front.px(r,PX.G-8,t.gold),e.front.px(r-1,PX.G-9,t.ol),e.front.px(r+1,PX.G-9,t.ol),moSpan(e,e.span[0],r+4),fxSnow(e,60);}else fxRain(e,90);};
/* ═══ OFFICIAL-END: MO.rain ═══ */

/* ═══ OFFICIAL-BEGIN: MO.talk ═══ */
MO.talk=e=>{const t=e.P,a=e.cast,n=e.a[0]||"fr",s=n==="par"?a.par[0]||moGen(e,"par","F",a.me.age+28):n==="pt"?a.pt[0]||moGen(e,"pt",null,a.me.age):n==="kid"?a.kids[0]||moGen(e,"kid",null,16):moGen(e,"sib",null,a.me.age);moSky(e,"dusk"),moFar(e),moGrass(e),moTreeBig(e,40,PX.G,"round"),moTreeBig(e,156,PX.G,"round");const o=PX.G-6;moRow(e,[{s:moFig(a.me,t,{pose:"sit"})},{s:moFig(s,t,{pose:"sit"})}],MO_CX,o+3,2);const r=e.span[0]-4,i=e.span[1]-e.span[0]+8;e.front.rect(r,o,i,2,t.trunk),e.front.rect(r+1,o+2,1,PX.G-o-2,t.ol),e.front.rect(r+i-2,o+2,1,PX.G-o-2,t.ol),e.mid.rect(r,o-8,i,2,t.trunk);for(const l of[MO_CX-9,MO_CX+7])e.front.rect(l,o-9,2,2,moWhite(t)),e.front.px(l,o-11,t.light(t.smoke,.5));};
/* ═══ OFFICIAL-END: MO.talk ═══ */

/* ═══ OFFICIAL-BEGIN: MO.mil ═══ */
MO.mil=e=>{const t=e.P,a=e.cast,n=e.a[0]==="out";moSky(e,"d"),moFar(e),moPave(e);for(const i of[60,132])e.mid.rect(i,PX.G-20,4,20,t.wall3),e.mid.rect(i-1,PX.G-21,6,2,t.shade(t.wall3,.2));e.mid.rect(64,PX.G-18,68,3,t.wall3),e.mid.line(150,PX.G-1,150,PX.G-32,t.metal),e.mid.rect(151,PX.G-32,10,6,t.accent),e.mid.rect(151,PX.G-29,10,1,t.light(t.wall,.7));const s=moFig(a.me,t,Object.assign({pose:"wave",hat:"mil"},moWear("mil",t))),o=[...a.par,...a.pt,...a.sib].slice(0,3),r=moRow(e,moAround({s,dy:1},o.map(i=>({s:moFig(i,t,{pose:n?"up":"wave"})}))),MO_CX);if(n){const i=Math.floor(o.length/2);moBouquet(e,r[Math.max(0,i-1)]+9,PX.G-9),fxConfetti(e,12,30);}};
/* ═══ OFFICIAL-END: MO.mil ═══ */

/* ═══ OFFICIAL-BEGIN: MO.award ═══ */
MO.award=e=>{const t=e.P,a=e.cast,n=e.a[0]||"prize";if(n==="medal"){moSky(e,"d");const c=e.back;c.rect(0,20,PX.W,PX.G-20,t.light(t.wall3,.2));for(let m=22;m<PX.G-2;m+=3)for(let h=m%6?0:2;h<PX.W;h+=4)c.px(h,m,[t.accent,t.water,t.gold,t.light(t.wall,.6)][(h+m)%4]);moPave(e);const f=e.front,u=moWhite(t);for(const[m,h,g]of[[-22,6,2],[-7,11,1],[8,4,3]])f.rect(MO_CX+m,PX.G-h,15,h,u),f.rect(MO_CX+m,PX.G-h,15,1,t.light(t.gold,.3)),f.rect(MO_CX+m+7,PX.G-h+2,1,2,t.ol);const d=moFig(a.me,t,{pose:"up",top:t.accent});moPut(e,d,MO_CX-7+(15-d.w>>1),PX.G-11-d.h),f.disc(MO_CX+(15-d.w>>1)+(d.w>>1)-7,PX.G-11-d.h+d.hand[1]-2,1,t.gold);for(const[m,h]of[[-22,6],[8,4]]){const g=moFig(moGen(e,"sib",a.me.sex,a.me.age),t,{pose:"wave",top:m<0?t.water:t.stamp});moPut(e,g,MO_CX+m+(15-g.w>>1),PX.G-h-g.h);}for(let m=0;m<3;m++)e.mid.line(70+m*26,PX.G-1,70+m*26,6,t.metal),e.mid.rect(71+m*26,6,10,6,[t.accent,t.water,t.gold][m]);moSpan(e,MO_CX-24,MO_CX+24),fxConfetti(e,24,30);return;}if(n==="elect"){moSky(e,"night"),moFar(e),moPave(e);const c=e.mid;c.rect(MO_CX-40,10,80,10,t.accent);for(let u=MO_CX-36;u<MO_CX+36;u+=4)c.rect(u,14,2,2,t.light(t.wall,.8));c.rect(MO_CX-50,PX.G-6,100,6,t.shade(t.trunk,.2));const f=moFig(a.me,t,Object.assign({pose:"up"},moWear("suit",t)));moPut(e,f,MO_CX-(f.w>>1),PX.G-6-f.h+1),a.pt.slice(0,1).forEach(u=>{const d=moFig(u,t,{pose:"wave"});moPut(e,d,MO_CX+10,PX.G-6-d.h);});for(let u=4;u<PX.W;u+=7)e.front.disc(u,PX.H-2,3,t.shade(t.hair,.05)),(u/7|0)%2&&(e.front.rect(u-2,PX.H-12,5,4,[t.light(t.wall,.85),t.light(t.accent,.3)][(u/14|0)%2]),e.front.px(u,PX.H-8,t.trunk));moSpan(e,MO_CX-16,MO_CX+20),fxConfetti(e,30,40);return;}if(n==="stage"){MO_W.stage(e,"idol");const c=e.front,f=MO_CX+4;c.rect(f,PX.G-12,3,3,t.gold),c.rect(f+1,PX.G-9,1,2,t.gold),c.rect(f-1,PX.G-7,5,1,t.gold),fxConfetti(e,22,36);return;}moRoom(e,{wall:t.shade(t.accent,.35),floor:"wood",plain:!0});const s=e.mid;for(let c=0;c<PX.W;c+=4)s.rect(c,0,2,PX.G-2,t.shade(t.accent,.45));for(let c=0;c<PX.G;c++)for(let f=-12;f<=12;f++)s.dither(MO_CX+f+Math.round((c-20)/4),c,t.light(t.gold,.5),.12);const o=moFig(a.me,t,Object.assign({pose:"wave"},moWear("suit",t)));moPut(e,o,MO_CX-(o.w>>1),PX.G-o.h+1);const r=e.front,i=MO_CX+(o.w>>1)+1,l=PX.G-o.h+1+o.hand[1]-6;r.rect(i,l,4,3,t.gold),r.rect(i+1,l+3,2,2,t.gold),r.rect(i,l+5,4,1,t.gold);for(let c=10;c<PX.W-8;c+=11)Math.abs(c-MO_CX)>18&&(r.disc(c,PX.H-2,2,t.light(t.hair,.15)),r.rect(c-3,PX.H-1,7,1,t.light(t.hair,.1)));moSpan(e,MO_CX-12,MO_CX+12),fxSpark(e,MO_CX,14,4);};
/* ═══ OFFICIAL-END: MO.award ═══ */

/* ═══ OFFICIAL-BEGIN: MO.shop ═══ */
MO.shop=e=>{const t=e.P,a=e.cast;moSky(e,"d"),moFar(e),moPave(e);const n=e.mid,s=MO_CX-30,o=60;n.rect(s,PX.G-30,o,30,t.light(t.wall,.3)),n.rect(s+4,PX.G-22,24,14,t.win),n.rect(s+36,PX.G-22,18,22,t.shade(t.trunk,.1)),n.rect(s+38,PX.G-20,14,18,t.light(t.win,.2));for(let c=s-2;c<s+o+2;c++){const f=(c-s>>2)%2?t.wall:t.stamp;n.rect(c,PX.G-34,1,4,f),(c-s)%4<2&&n.px(c,PX.G-30,f);}n.rect(s+10,PX.G-40,40,5,t.ol),n.rect(s+12,PX.G-39,36,3,t.gold);for(const c of[s-12,s+o+4])n.line(c+4,PX.G-1,c+4,PX.G-14,t.trunk),n.disc(c+4,PX.G-18,5,t.light(t.accent,.4)),n.disc(c+4,PX.G-18,3,t.light(t.wall,.8));const r=[a.me,...moFam(e,3)],i=moRow(e,r.map((c,f)=>({s:moFig(c,t,{pose:c===a.me?"":"up"}),dy:c===a.me?1:0})),MO_CX,PX.G,3),l=moRGB("#E04848");e.front.line(e.span[0]-6,PX.G-9,e.span[1]+6,PX.G-9,l),e.front.disc(MO_CX,PX.G-9,1,l),fxConfetti(e,14,30);};
/* ═══ OFFICIAL-END: MO.shop ═══ */

/* ═══ OFFICIAL-BEGIN: MO.flee ═══ */
MO.flee=e=>{const t=e.P,a=e.cast;pxSky(e.sky,Object.assign({},e.m,{stage:"e",mood:"low"}),t,e.R),moFar(e);for(const[r,i]of[[30,7],[56,5]])for(let l=i-1;l>=0;l--){const c=r+l*2,f=PX.G-10-l*4,u=2+(l>>1);e.back.disc(c,f,u,t.shade(t.smoke,.15)),e.back.disc(c-1,f-1,u-1,t.smoke);}const n=e.mid;n.rect(0,PX.G,PX.W,PX.H-PX.G,t.light(t.soil,.2));for(let r=PX.G;r<PX.H;r++)n.rect(60-(r-PX.G)*2,r,70+(r-PX.G)*4,1,t.light(t.sand,.15));const s=[a.me,...a.pt,...a.kids,...a.par,...a.sib].slice(0,5),o=moRow(e,s.map(r=>({s:moFig(r,t,{pose:"walk"}),dy:r.role==="me"?1:0})),MO_CX+10,PX.G+1,3);s.forEach((r,i)=>{if(r.age>=12){const l=moFig(r,t,{});e.front.rect(o[i]+1,PX.G-l.h-3,7,4,[t.light(t.accent,.3),t.light(t.water,.3),t.thatch][i%3]),e.front.rect(o[i]+2,PX.G-l.h-4,5,1,t.ol);}});for(let r=140;r<190;r+=14)for(let i=0;i<8;i++){const l=i;e.back.rect(r-l,PX.G-9+i,l*2,1,t.light(t.wall2,.2));}};
/* ═══ OFFICIAL-END: MO.flee ═══ */

/* ═══ OFFICIAL-BEGIN: MO.citizen ═══ */
MO.citizen=e=>{const t=e.P,a=e.cast;moRoom(e,{wall:t.light(t.wall2,.3),floor:"wood",plain:!0});const n=e.mid;n.line(130,PX.G-1,130,8,t.gold),n.rect(131,8,16,12,t.stamp),n.disc(139,14,3,t.gold),n.disc(139,14,1,t.stamp);const s=moFig(a.me,t,{pose:"wave"}),o=moRow(e,moAround({s,dy:1},moFam(e,3).map(i=>({s:moFig(i,t,{pose:"up"})}))),MO_CX-6),r=Math.floor(moFam(e,3).length/2)+(moFam(e,3).length%2,0);e.front.rect(MO_CX-6-2,PX.G-s.h-4,6,4,moWhite(t)),e.front.px(MO_CX-4,PX.G-s.h-2,t.gold),fxConfetti(e,12,30);};
/* ═══ OFFICIAL-END: MO.citizen ═══ */

/* ═══ OFFICIAL-BEGIN: MO.hobby ═══ */
MO.hobby=e=>{const t=e.P,a=e.cast,n=e.a[0]||"reading",s=n.startsWith("sp_"),o={sport:1,hiking:1,fishing:1,photo:1,garden:1,art:1,travel:1};if(n==="travel")return e.a=["mount","","solo"],MO.trip(e);if(n==="garden")return MO.garden(e);if(n==="hiking")return e.a=["mount","",a.pt.length?"pt":"solo"],MO.trip(e);if(n==="faith")return MO.fest(e);if(s||n==="sport"){moSky(e,"d"),moFar(e),moGrass(e),e.mid.rect(0,PX.G+4,PX.W,1,t.light(t.wall,.7));for(const u of[30,166])e.mid.rect(u,PX.G-14,1,14,moWhite(t)),e.mid.rect(u,PX.G-14,10,1,moWhite(t)),e.mid.rect(u+9,PX.G-14,1,14,moWhite(t));const c={sp_basketball:t.light(t.accent,.1),sp_cricket:t.accent,sp_baseball:moWhite(t),sp_tennis:t.light(t.gold,.2)}[n]||moWhite(t),f=moFig(a.me,t,{pose:"up",top:t.accent});moPut(e,f,MO_CX-6,PX.G-f.h+1);for(const[u,d]of[[-26,t.water],[16,t.accent],[28,t.water]]){const m=moFig(moGen(e,"sib",a.me.sex,a.me.age),t,{pose:u>20?"wave":"",top:d});moPut(e,m,MO_CX+u,PX.G-m.h);}e.front.disc(MO_CX+8,PX.G-22,1,c),e.front.px(MO_CX+8,PX.G-22,t.ol),moSpan(e,MO_CX-28,MO_CX+40);return;}if(n==="fishing"){moSky(e,"m"),moFar(e);const c=e.mid;c.rect(0,PX.G-6,PX.W,PX.H-PX.G+6,t.water);for(let m=0;m<PX.W;m++)m*7%11<2&&c.px(m,PX.G-3+m%3*3,t.water2);c.rect(40,PX.G-8,70,3,t.trunk);for(const m of[44,76,106])c.rect(m,PX.G-5,2,10,t.shade(t.trunk,.2));const f=moFig(a.me,t,{pose:"sit",hat:"cap",cap:t.stamp});moPut(e,f,MO_CX-10,PX.G-8-f.h+2);const u=MO_CX-10+f.w,d=PX.G-8-f.h+2+f.hand[1];e.front.line(u,d,u+16,d-14,t.trunk),e.front.line(u+16,d-14,u+18,PX.G-2,t.light(t.ol,.4)),e.front.rect(MO_CX-22,PX.G-13,6,5,t.metal),moSpan(e,MO_CX-24,MO_CX+26);return;}if(n==="photo")return e.a=["nature","","solo"],MO.trip(e);if(n==="art"){MO_W.studio(e,"artist");return;}if(n==="drama"||n==="dance"||n==="karaoke"){moRoom(e,{wall:t.shade(t.accent,.4),floor:"wood",plain:!0});const c=e.mid;for(let u=0;u<PX.W;u+=4)c.rect(u,0,2,PX.G-2,t.shade(t.accent,.5));for(let u=0;u<PX.G;u++)for(let d=-14;d<=14;d++)c.dither(MO_CX+d,u,t.light(t.gold,.5),.12);const f=[a.me,...(n==="karaoke"?[moGen(e,"sib",null,a.me.age),moGen(e,"pt",null,a.me.age)]:[moGen(e,"sib",null,a.me.age)])];if(moRow(e,f.map((u,d)=>({s:moFig(u,t,{pose:d?"wave":"up"})})),MO_CX,PX.G,6),n==="karaoke"){c.rect(MO_CX-16,6,32,18,t.ol),c.rect(MO_CX-15,7,30,16,t.light(t.water,.2));for(let u=0;u<3;u++)c.rect(MO_CX-12,17+u*2,24-u*6,1,t.light(t.wall,.8));}fxNote(e,MO_CX-22,12),fxNote(e,MO_CX+20,16);return;}if(n==="gym"){moRoom(e,{wall:t.light(t.wall3,.35),floor:"tile",plain:!0});const c=e.mid;c.rect(20,8,152,20,t.light(t.win,.35)),c.rect(140,PX.G-12,26,10,t.ol),c.rect(142,PX.G-14,22,2,t.metal);const f=moFig(a.me,t,{pose:"up",top:t.stamp});moPut(e,f,MO_CX-4,PX.G-f.h+1),e.front.rect(MO_CX-8,PX.G-f.h-2,f.w+8,1,t.metal),e.front.rect(MO_CX-10,PX.G-f.h-4,3,5,t.ol),e.front.rect(MO_CX+f.w-1,PX.G-f.h-4,3,5,t.ol),moSpan(e,MO_CX-12,MO_CX+16);return;}if(n==="board"){moRoom(e,{win:[[30,22]],frames:[150]});const c=[a.me,a.pt[0]||moGen(e,"sib",null,a.me.age+3)];moAtTable(e,c.map(u=>({s:moFig(u,t,{})})),MO_CX,PX.G-8,{gap:14,cloth:!1});const f=e.front;for(let u=0;u<8;u++)f.rect(MO_CX-6+u*2-2,PX.G-9,2,1,u%2?t.ol:t.light(t.wall,.8));f.px(MO_CX-3,PX.G-10,t.ol),f.px(MO_CX+3,PX.G-10,moWhite(t));return;}if(n==="cooking"){moRoom(e,{wall:t.light(t.wall,.5),floor:"tile"});const c=moFig(a.me,t,{});moPut(e,c,MO_CX-4,PX.G-c.h-2);const f=e.front;f.rect(MO_CX-22,PX.G-7,44,7,t.light(t.trunk,.2)),f.rect(MO_CX+6,PX.G-12,10,5,t.shade(t.metal,.2));for(let m=0;m<3;m++)f.px(MO_CX+8+m*3,PX.G-15-m%2,t.light(t.smoke,.5));const u=moFam(e,2);let d=MO_CX-24;for(const m of u){const h=moFig(m,t,{pose:"up"});d-=h.w+2,moPut(e,h,d,PX.G-h.h);}moSpan(e,d,MO_CX+22);return;}if(n==="crafts"){moRoom(e,{lamp:MO_CX+24,frames:[50]});const c=moFig(a.me,t,{pose:"sit"}),f=MO_CX-6,u=e.front;u.rect(f-4,PX.G-18,c.w+8,14,t.light(t.stamp,.35)),moPut(e,c,f,PX.G-c.h-2),u.rect(f-3,PX.G-4,c.w+6,4,t.light(t.stamp,.25)),u.disc(f+c.w+6,PX.G-2,2,t.accent),u.line(f+c.w+6,PX.G-2,f+c.w-1,PX.G-9,t.accent),u.rect(f+1,PX.G-10,6,2,t.light(t.accent,.3)),moSpan(e,f-6,f+c.w+10);return;}if(n==="music"){moSky(e,"e"),moFar(e),moGrass(e),moTreeBig(e,60,PX.G,"round");const c=moFig(a.me,t,{pose:"sit"}),f=MO_CX-6;moPut(e,c,f,PX.G-c.h);const u=e.front;u.rect(f-1,PX.G-c.h+c.hand[1]-2,7,4,t.gold),u.disc(f+1,PX.G-c.h+c.hand[1],1,t.ol),u.line(f+6,PX.G-c.h+c.hand[1]-1,f+13,PX.G-c.h+c.hand[1]-5,t.trunk),fxNote(e,f+14,PX.G-c.h-6),fxNote(e,f-10,PX.G-c.h-10),moSpan(e,f-12,f+20);return;}if(n==="games"||n==="screen"||n==="sns"){moRoom(e,{view:"night",win:[[24,20]]});const c=e.front,f=e.mid;f.rect(MO_CX+14,18,26,16,t.ol),f.rect(MO_CX+15,19,24,14,t.light(t.water,.25));for(let d=-10;d<=14;d++)for(let m=-30;m<=6;m++)m*m+d*d<600&&f.dither(MO_CX+20+m,26+d,t.light(t.water,.5),.12);c.rect(MO_CX-30,PX.G-12,40,4,t.light(t.accent,.3));const u=[a.me,...moFam(e,1)];moRow(e,u.map(d=>({s:moFig(d,t,{pose:"sit"})})),MO_CX-10,PX.G-2,2),c.rect(MO_CX-30,PX.G-8,40,5,t.light(t.accent,.22)),n==="games"&&c.rect(MO_CX-12,PX.G-9,4,2,t.ol);return;}moSky(e,"e"),moFar(e),moGrass(e);const r=e.mid;r.rect(MO_CX-22,PX.G-20,3,20,t.trunk),r.disc(MO_CX-20,PX.G-26,12,t.tree),r.disc(MO_CX-16,PX.G-24,7,t.tree2);const i=moFig(a.me,t,{pose:"sit"}),l=MO_CX-14;moPut(e,i,l,PX.G-i.h),e.front.rect(l+1,PX.G-i.h+i.hand[1]-2,7,3,t.accent),e.front.rect(l+4,PX.G-i.h+i.hand[1]-2,1,3,moWhite(t)),moSpan(e,MO_CX-34,MO_CX+4);};
/* ═══ OFFICIAL-END: MO.hobby ═══ */

/* ═══ OFFICIAL-BEGIN: HOME ═══ */
const HOME={lineMax:40};
/* ═══ OFFICIAL-END: HOME ═══ */

/* ═══ OFFICIAL-BEGIN: ROOM_SLOTS ═══ */
const ROOM_SLOTS={A:{x:4,w:56,sz:["big","small","tall"]},B:{x:64,w:30,sz:["small"]},C:{x:132,w:28,sz:["small"]},D:{x:162,w:28,sz:["small","tall"]},R:{x:86,w:72,sz:["rug"]},W1:{x:70,w:30,sz:["wall"]},W2:{x:112,w:30,sz:["wall"]},W3:{x:156,w:30,sz:["wall"]}};
/* ═══ OFFICIAL-END: ROOM_SLOTS ═══ */

/* ═══ OFFICIAL-BEGIN: SLOT_IDS ═══ */
const SLOT_IDS=Object.keys(ROOM_SLOTS);
/* ═══ OFFICIAL-END: SLOT_IDS ═══ */

/* ═══ OFFICIAL-BEGIN: HOME_ITEMS ═══ */
const HOME_ITEMS={wp_cream:["wp",""],wp_sky:["wp",""],wp_stripe:["wp",""],wp_dots:["wp",""],wp_check:["wp",""],wp_tile:["wp",""],wp_flower:["wp",""],wp_wood:["wp",""],wp_brick:["wp",""],wp_hanji:["wp",""],wp_star:["wp",""],fl_wood:["fl",""],fl_jangpan:["fl",""],fl_tatami:["fl",""],fl_tile:["fl",""],fl_carpet:["fl",""],fl_marble:["fl",""],wv_home:["wv",""],wv_city:["wv",""],wv_hills:["wv",""],wv_rain:["wv",""],wv_night:["wv",""],wv_sea:["wv",""],wv_snow:["wv",""],wv_bloom:["wv",""],wv_stars:["wv",""],wv_summer:["wv",""],wv_maple:["wv",""],wv_dusk:["wv",""],wv_moon:["wv",""],wv_firefly:["wv",""],wv_snownight:["wv",""],ot_me:["ot",""],ot_navy:["ot",""],ot_red:["ot",""],ot_yellow:["ot",""],ot_white:["ot",""],ot_pink:["ot",""],ot_green:["ot",""],ot_black:["ot",""],bgm_base:["bgm",""],bgm_box:["bgm",""],bgm_waltz:["bgm",""],bgm_rain:["bgm",""],bgm_night:["bgm",""],bgm_spring:["bgm",""],table:["it","big"],chair:["it","small"],plant:["it","small"],clock:["it","wall"],bed:["it","big"],sofa:["it","big"],desk:["it","big"],piano:["it","big"],tv:["it","big"],bike:["it","big"],shelf:["it","tall"],wardrobe:["it","tall"],gclock:["it","tall"],lamp:["it","tall"],xmas:["it","tall"],radio:["it","small"],tank:["it","small"],bear:["it","small"],globe:["it","small"],record:["it","small"],cake:["it","small"],bigplant:["it","small"],wshelf:["it","wall"],poster:["it","wall"],mirror:["it","wall"],paint:["it","wall"],lights:["it","wall"],calendar:["it","wall"],rug_round:["it","rug"],rug_stripe:["it","rug"],rug_persian:["it","rug"],rocking:["it","big"],fire:["it","big"],scope:["it","tall"],birdcage:["it","tall"],violin:["it","small"],drum:["it","small"],tea:["it","small"],chess:["it","small"],bonsai:["it","small"],cactus:["it","small"],suitcase:["it","small"],fruit:["it","small"],lantern:["it","small"],kite:["it","wall"],chime:["it","wall"],quilt:["it","wall"],rug_mat:["it","rug"],rug_kilim:["it","rug"],photos:["it","wall"],e_lamp:["it","small"],e_gramo:["it","small"],e_sew:["it","small"],e_type:["it","small"],e_dial:["it","small"],e_najeon:["it","tall"],e_yeontan:["it","small"],e_fan:["it","small"],e_cassette:["it","small"],e_crt:["it","small"],e_pc:["it","big"],e_aircon:["it","tall"],e_flatv:["it","wall"],e_purifier:["it","small"],l_dog:["it","small",1],l_cat:["it","small",1],l_guitar:["it","small",1],l_easel:["it","tall",1],l_medal:["it","wall",1],l_diploma:["it","wall",1],l_wed:["it","wall",1],l_fam:["it","wall",1],l_map:["it","wall",1],l_rocket:["it","small",1],l_flag:["it","small",1],l_books:["it","small",1],l_basket:["it","small",1],l_rod:["it","tall",1],l_tools:["it","small",1],l_kit:["it","small",1],l_pot:["it","small",1],l_laptop:["it","small",1],l_camera:["it","small",1],l_ball:["it","small",1],l_yarn:["it","small",1]};
/* ═══ OFFICIAL-END: HOME_ITEMS ═══ */

/* ═══ OFFICIAL-BEGIN: itemOf ═══ */
const itemOf=e=>Object.prototype.hasOwnProperty.call(HOME_ITEMS,e)?HOME_ITEMS[e]:null;
/* ═══ OFFICIAL-END: itemOf ═══ */

/* ═══ OFFICIAL-BEGIN: isLifeItem ═══ */
const isLifeItem=e=>{const t=itemOf(e);return!!(t&&t[2]===1);};
/* ═══ OFFICIAL-END: isLifeItem ═══ */

/* ═══ OFFICIAL-BEGIN: haveItem ═══ */
function haveItem(e,t,a){const n=itemOf(e);return n?n[2]===1?(t||[]).includes(e):n[2]===2?!!(a&&a.has(e)):!0:!1;}
/* ═══ OFFICIAL-END: haveItem ═══ */

/* ═══ OFFICIAL-BEGIN: LIFE_ORDER ═══ */
const LIFE_ORDER=["l_dog","l_cat","l_medal","l_rocket","l_guitar","l_easel","l_flag","l_wed","l_fam","l_diploma","l_map","l_books","l_basket","l_rod","l_tools","l_kit","l_pot","l_laptop","l_camera","l_ball","l_yarn"];
/* ═══ OFFICIAL-END: LIFE_ORDER ═══ */

/* ═══ OFFICIAL-BEGIN: PROP_LI ═══ */
const PROP_LI={mic:"l_guitar",easel:"l_easel",rocket:"l_rocket",dome:"l_flag",crops:"l_basket",boat:"l_rod",crane:"l_tools",clinic:"l_kit",office:"l_laptop"};
/* ═══ OFFICIAL-END: PROP_LI ═══ */

/* ═══ OFFICIAL-BEGIN: liOf ═══ */
function liOf(e){if(!e||typeof e!="object")return[];if(Array.isArray(e.li))return[...new Set(e.li.filter(isLifeItem))];const t=new Set();for(const a of Array.isArray(e.frames)?e.frames:[]){const n=a&&a.m;n&&(Array.isArray(n.people)&&(n.people.some(s=>s&&s.role==="pt")&&t.add("l_wed"),n.people.some(s=>s&&s.role==="kid")&&t.add("l_fam")),n.pet==="d"?t.add("l_dog"):n.pet==="c"&&t.add("l_cat"),a.a>=18&&PROP_LI[n.prop]&&t.add(PROP_LI[n.prop]),a.a>=25&&n.prop==="school"&&t.add("l_books"));}return[...t];}
/* ═══ OFFICIAL-END: liOf ═══ */

/* ═══ OFFICIAL-BEGIN: roomDefault ═══ */
function roomDefault(e){const t={A:"table",B:"chair",C:"",D:"plant",R:"",W1:"",W2:"clock",W3:""},a={small:["C","D","B"],tall:["D"],wall:["W1","W3","W2"]},n=LIFE_ORDER.filter(s=>(e||[]).includes(s));for(const s of[0,1])for(const o of n){if(Object.values(t).includes(o))continue;const r=(a[HOME_ITEMS[o][1]]||[]).find(i=>s?t[i]&&!isLifeItem(t[i]):!t[i]);r&&(t[r]=o);}return{wp:"wp_cream",fl:"fl_wood",wv:"wv_home",ot:"ot_me",bgm:"bgm_base",who:"me",it:t};}
/* ═══ OFFICIAL-END: roomDefault ═══ */

/* ═══ OFFICIAL-BEGIN: cleanRoom ═══ */
function cleanRoom(e,t,a){e=e&&typeof e=="object"?e:{};const n=l=>haveItem(l,t,a),s=(l,c,f)=>{const u=itemOf(c);return u&&u[0]===l&&n(c)?c:f;},o={wp:s("wp",e.wp,"wp_crea\
m"),fl:s("fl",e.fl,"fl_wood"),wv:s("wv",e.wv,"wv_home"),ot:s("ot",e.ot,"ot_me"),bgm:s("bgm",e.bgm,"bgm_base"),who:e.who==="fam"?"fam":"me",it:{}},r=e.it&&typeof e.it=="object"?e.it:{},i=new Set();for(const l of SLOT_IDS){const c=String(r[l]||""),f=itemOf(c);o.it[l]=f&&f[0]==="it"&&ROOM_SLOTS[l].sz.includes(f[1])&&n(c)&&!i.has(c)?c:"",o.it[l]&&i.add(o.it[l]);}return o;}
/* ═══ OFFICIAL-END: cleanRoom ═══ */

/* ═══ OFFICIAL-BEGIN: photoMoms ═══ */
function photoMoms(e,t){const a=new Set(t||[]),n=(e&&Array.isArray(e.frames)?e.frames:[]).filter((r,i)=>r&&r.m&&typeof r.m=="object"&&!a.has(i));if(n.length<=3)return n.map(r=>r.m);const s=r=>e.strip&&e.strip[r.a]!=null?e.strip[r.a]:50,o=n.length;return[0,1,2].map(r=>n.slice(Math.round(r*o/3),Math.round((r+1)*o/3)).reduce((i,l)=>s(l)>s(i)?l:i).m);}
/* ═══ OFFICIAL-END: photoMoms ═══ */

/* ═══ OFFICIAL-BEGIN: roomOf ═══ */
const roomOf=(e,t)=>{try{const a=typeof e=="string"?e?JSON.parse(e):null:e;return a&&typeof a=="object"&&a.it?a:roomDefault(t);}catch{return roomDefault(t);}};
/* ═══ OFFICIAL-END: roomOf ═══ */

/* ═══ OFFICIAL-BEGIN: rsp ═══ */
function rsp(e,t){const a={};for(const[n,s]of Object.entries(t))a[n]=typeof s=="string"?RC[s]||pxRGB(s):s;return pxSprite(e,a);}
/* ═══ OFFICIAL-END: rsp ═══ */

/* ═══ OFFICIAL-BEGIN: roomWall ═══ */
function roomWall(e,t,a){const n=ROOM.W,s=ROOM.WALL,o=(c,f,u)=>e.px(c,f,u),r=c=>e.rect(0,0,n,s,c),i={wp_cream:"#F2EADB",wp_sky:"#DCEAF0",wp_stripe:"#F2E5D6",wp_dots:"#F4E8EC",wp_check:"#EEF2E6",wp_tile:"#F3F3EF",wp_flower:"#F6EEE0",wp_wood:"#C9A47C",wp_brick:"#B9745A",wp_hanji:"#EFE6CF",wp_star:"#2F3B5E"}[t]||"#F2EADB",l=pxRGB(i);switch(r(l),t){case"wp_cream":case"wp_sky":for(let c=0;c<n;c+=9)for(let f=0;f<s;f++)(f+c)%3&&o(c,f,rdark(l,.025));break;case"wp_stripe":for(let c=0;c<n;c++)if(c%12<5)for(let f=0;f<s;f++)o(c,f,pxRGB("#E8D3BF"));else if(c%12===8)for(let f=0;f<s;f+=2)o(c,f,pxRGB("#E3CBB5"));break;case"wp_dots":for(let c=3;c<s;c+=8)for(let f=(c/8|0)%2?7:3;f<n;f+=8){const u=pxRGB("#DDB3C0");o(f,c,u),o(f+1,c,u),o(f,c+1,u),o(f+1,c+1,u);}break;case"wp_check":for(let c=0;c<s;c++)for(let f=0;f<n;f++){const u=f%10<4,d=c%10<4;u&&d?o(f,c,pxRGB("#C9D8BC")):(u||d)&&o(f,c,pxRGB("#DCE6D1"));}break;case"wp_tile":for(let c=0;c<s;c++)for(let f=0;f<n;f++){const u=c/5|0,d=u%2?5:0;c%5===4||(f+d)%10===9?o(f,c,pxRGB("#D6D8D1")):c%5===0&&o(f,c,pxRGB("#FBFBF8"));}break;case"wp_flower":for(let c=6;c<s;c+=12)for(let f=(c/12|0)%2*8+4;f<n;f+=16){const u=[pxRGB("#E7A3B3"),pxRGB("#E9C56A"),pxRGB("#A8BEDF")][((f+c)/4|0)%3],d=Math.round(a()*2)-1,m=f+d;o(m,c-1,u),o(m-1,c,u),o(m+1,c,u),o(m,c+1,u),o(m,c,pxRGB("#F7E7A8")),o(m+1,c+2,pxRGB("#9CC490"));}break;case"wp_wood":for(let c=0;c<n;c++){const f=c%9;for(let u=0;u<s;u++)f===8?o(c,u,pxRGB("#8E6A48")):f===0?o(c,u,pxRGB("#D8B790")):(u*7+c*3)%23===0&&o(c,u,pxRGB("#B78F66"));}break;case"wp_brick":for(let c=0;c<s;c++)for(let f=0;f<n;f++){const u=c/5|0,d=u%2?6:0;c%5===4||(f+d)%12===11?o(f,c,pxRGB("#D9C4AA")):(f*13+u*7)%29===0?o(f,c,pxRGB("#A6644B")):c%5===0&&o(f,c,pxRGB("#C8846A"));}break;case"wp_hanji":for(let c=0;c<520;c++){const f=a()*n|0,u=a()*s|0;o(f,u,a()<.6?pxRGB("#E3D7BA"):pxRGB("#F8F2E2"));}for(let c=0;c<s;c+=26)for(let f=0;f<n;f++)o(f,c,pxRGB("#E2D5B6"));break;case"wp_star":for(let c=0;c<70;c++){const f=a()*n|0,u=a()*(s-6)|0,d=a()<.3?pxRGB("#F5E6A8"):pxRGB("#9CA9CC");o(f,u,d),d[0]>200&&a()<.5&&(o(f-1,u,rmix(d,l,.5)),o(f+1,u,rmix(d,l,.5)),o(f,u-1,rmix(d,l,.5)),o(f,u+1,rmix(d,l,.5)));}break;}e.rect(0,0,n,2,rdark(l,.18)),e.rect(0,2,n,1,rdark(l,.08));}
/* ═══ OFFICIAL-END: roomWall ═══ */

/* ═══ OFFICIAL-BEGIN: roomFloor ═══ */
function roomFloor(e,t,a){const n=ROOM.W,s=ROOM.FLOOR,o=ROOM.H,r=(c,f,u)=>e.px(c,f,u),i=t==="fl_tatami"?RC.wood3:t==="fl_marble"||t==="fl_tile"?RC.white2:RC.wood2;e.rect(0,ROOM.WALL,n,3,i),e.rect(0,ROOM.WALL,n,1,rlite(i,.25));const l=c=>pxRGB(c);switch(t){case"fl_jangpan":{e.rect(0,s,n,o-s,rc("#E4BE6E"));for(let c=s;c<o;c++)for(let f=0;f<n;f++)(f-(c-s)*1.2)%22<1||(c-s)%9===8?r(f,c,rc("#D6AC5A")):(f*5+c*3)%37===0&&r(f,c,rc("#EDCB80"));break;}case"fl_tata\
mi":{e.rect(0,s,n,o-s,rc("#C8C48C"));for(let c=s;c<o;c++)for(let f=0;f<n;f++)c%2&&r(f,c,rc("#BDB97F")),(f%48<2||(c-s)%13===12)&&r(f,c,rc("#6E6B3F"));break;}case"fl_tile":{for(let c=s;c<o;c++)for(let f=0;f<n;f++){const u=((f/12|0)+((c-s)/6|0))%2;r(f,c,rc(u?"#E9E4D8":"#C9C1B1"));}break;}case"fl_carpet":{e.rect(0,s,n,o-s,rc("#8F5D66"));for(let c=s;c<o;c++)for(let f=0;f<n;f++)(f*3+c*5)%7===0?r(f,c,rc("#9C6A72")):(f+c*2)%11===0&&r(f,c,rc("#7F5059"));break;}case"fl_marble":{e.rect(0,s,n,o-s,rc("#ECE9E3"));for(let c=0;c<9;c++){let f=a()*n,u=s+a()*(o-s);for(let d=0;d<30;d++)r(f,u,rc("#D3CEC4")),f+=1,u+=(a()-.45)*1.6;}for(let c=s;c<o;c++)for(let f=0;f<n;f+=32)r(f,c,rc("#DAD6CE"));break;}default:for(let c=s;c<o;c++){const f=(c-s)/4|0,u=f*17%31;for(let d=0;d<n;d++){let m=f%2?rc("#B98B5E"):rc("#C3966A");(c-s)%4===3||(d+u)%31===0?m=rc("#9A7049"):(d*7+c*3)%19===0&&(m=rc("#CDA277")),r(d,c,m);}}}for(let c=0;c<n;c++)r(c,s,rdark(e.get(c,s)||RC.wood,.22)),r(c,s+1,rdark(e.get(c,s+1)||RC.wood,.1));for(let c=o-5;c<o;c++)for(let f=0;f<n;f++)(f+c)%2&&r(f,c,rdark(e.get(f,c)||RC.wood,.06));}
/* ═══ OFFICIAL-END: roomFloor ═══ */

/* ═══ OFFICIAL-BEGIN: VIEW_M ═══ */
const VIEW_M=e=>Object.assign({stage:"d",mood:"mid",urban:!1,region:"hi",home:"flat",prop:"none",car:!1,moto:!1,war:!1,nomad:!1,pet:"",people:[],seed:"view"},e);
/* ═══ OFFICIAL-END: VIEW_M ═══ */

/* ═══ OFFICIAL-BEGIN: viewScene ═══ */
function viewScene(e,t){const a=(i,l,c,f)=>{const u=pxSceneLayers(Object.assign({},i,{act:""}),l),d=new PxR(PX.W,PX.H);for(const m of["sky","back","mid"])d.blit(u[m],0,0,null),m==="sky"&&c&&c(d);return f&&f(d,(m,h,g)=>{u.back.get(m,h)||d.px(m,h,g);}),d;},n=pxPalette("light"),s=pxPalette("dark"),o=pxRGB,r=(i,l,c,f,u)=>{for(let d=0;d<l;d++)u(84+i()*46|0,c+i()*(f-c)|0,d);};switch(e){case"wv_city":return a(VIEW_M({urban:!0,seed:"city7"}),n);case"wv_night":return a(VIEW_M({urban:!0,stage:"e",seed:"city7"}),s);case"wv_hills":return a(VIEW_M({region:"eca",mood:"high",seed:"hill3"}),n);case"wv_rain":{const i=a(VIEW_M({region:"hi",mood:"low",seed:"rain2"}),n),l=lvRand("rain");for(let c=0;c<160;c++){const f=l()*PX.W|0,u=l()*50|0;i.px(f,u,pxRGB("#E2EEF2")),i.px(f-1,u+1,pxRGB("#C9DCE3"));}return i;}case"wv_snow":{const i=Object.assign({},n,{hill1:pxRGB("#E3ECF0"),hill2:pxRGB("#F4F8FA"),grass:pxRGB("#F7FAFB"),grass2:pxRGB("#DCE6EA"),grasshi:pxRGB("#FFFFFF"),soil:pxRGB("#D5DFE4"),soil2:pxRGB("#C2CFD5"),tree:pxRGB("#5E8C7A"),tree2:pxRGB("#456E5E"),treehi:pxRGB("#F4F8FA"),sky:{m:["#C9D9E6","#EEF2F5"],d:["#C9D9E6","#EEF2F5"],e:["#C9D9E6","#EEF2F5"]}}),l=a(VIEW_M({region:"eca",seed:"snow1"}),i),c=lvRand("snow");for(let f=0;f<120;f++)l.px(c()*PX.W,c()*56,pxRGB("#FFFFFF"));return l;}case"wv_bloom":{const i=Object.assign({},n,{tree:pxRGB("#F2B6C8"),tree2:pxRGB("#E392AA"),treehi:pxRGB("#FCDDE6")}),l=a(VIEW_M({region:"hi",mood:"high",seed:"bloom4"}),i),c=lvRand("petal");for(let f=0;f<40;f++)l.px(c()*PX.W,c()*48,pxRGB("#F7C7D6"));return l;}case"wv_stars":{const i=a(VIEW_M({region:"eca",stage:"e",mood:"high",seed:"star9"}),s),l=lvRand("stars");for(let c=0;c<90;c++){const f=l()*PX.W|0,u=l()*34|0;(i.get(f,u)||[0])[0]<80&&i.px(f,u,l()<.3?pxRGB("#\
FFF4CF"):pxRGB("#C9D3DA"));}return i;}case"wv_sea":{const i=a(VIEW_M({region:"eap",mood:"high",seed:"sea5"}),n),l=36;for(let f=l;f<PX.H;f++)for(let u=0;u<PX.W;u++)i.px(u,f,(u*3+f*7)%13===0?pxRGB("#BDE6F0"):pxRGB(f===l?"#9FD2E2":"#6FB7CF"));for(let f=l+2;f<PX.H;f+=3)for(let u=100;u<116;u+=2)i.px(u+f%2,f,pxRGB("#FFF2C4"));const c=pxSprite(["..W.",".WW.","WWW.","WWWW","BBBB"],{W:pxRGB("#FFFFFF"),B:pxRGB("#C25550")});return i.blit(c,92,l-4,null),i;}case"wv_summer":{const i=Object.assign({},n,{sky:Object.assign({},n.sky,{d:["#58ACDD","#D3EEF4"]}),hill1:o("#86BE72"),hill2:o("#5F9F55"),far1:o("#A9D3C6"),far2:o("#8CC0AE"),grass:o("#72B45C"),grass2:o("#4E8E48"),grasshi:o("#A2D67C"),tree:o("#4F9A4A"),tree2:o("#3C7E3C"),treehi:o("#86C46A")});return a(VIEW_M({region:"hi",mood:"high",seed:"summer3"}),i,l=>{const c=o("#FFFFFF"),f=o("#DCE8EE");for(const[u,d,m]of[[100,40,5],[108,37,6],[117,39,5],[124,41,4],[105,31,4],[112,28,5],[118,32,4],[110,22,4],[114,19,3]])l.disc(u,d,m,c);for(let u=96;u<129;u++)for(const d of[44,45])l.get(u,d-1)&&l.get(u,d-1)[0]===255&&l.px(u,d,f);for(const[u,d]of[[102,36],[113,33],[120,37],[111,26]])l.px(u,d,f);});}case"wv_maple":{const i=Object.assign({},n,{sky:Object.assign({},n.sky,{d:["#9DCAE0","#F4E7CF"]}),hill1:o("#DDA45C"),hill2:o("#C67A43"),far1:o("#D8C8AE"),far2:o("#C7AE92"),grass:o("#BCA45C"),grass2:o("#8E7844"),grasshi:o("#D9C47C"),tree:o("#D8643F"),tree2:o("#B04834"),treehi:o("#EFA45A")}),l=a(VIEW_M({region:"eca",mood:"high",seed:"maple2"}),i),c=lvRand("leaf"),f=[o("#D9653F"),o("#E9A24A"),o("#C2423A"),o("#E7C25A")];return r(c,22,16,50,(u,d,m)=>{const h=f[m%4];l.px(u,d,h),l.px(u+1,d,h),m%2&&l.px(u+1,d+1,rdark(h,.15));}),l;}case"wv_dusk":{const i=Object.assign({},n,{sky:Object.assign({},n.sky,{e:["#8C7DB4","#F5A963"]}),cloud:o("#F7CDAE"),cloudsh:o("#DE9C8C"),hill1:o("#8F7486"),hill2:o("#6B5669"),far1:o("#B48C98"),far2:o("#A07D8C"),grass:o("#707A58"),grass2:o("#566044"),grasshi:o("#8A9468"),tree:o("#5C5A52"),tree2:o("#46443E"),treehi:o("#76705E")});return a(VIEW_M({region:"\
eca",stage:"e",mood:"mid",seed:"dusk5"}),i,l=>{l.disc(107,32,9,rmix(o("#F5A963"),o("#FFE3A6"),.35)),l.disc(107,32,7,rmix(o("#F5A963"),o("#FFE3A6"),.65)),l.disc(107,32,5,o("#FFE7B0")),l.disc(106,31,3,o("#FFF3D6"));for(const[c,f,u]of[[86,104,25],[114,128,30],[92,100,33]])l.rect(c,u,f-c,1,o("#F7C7A4")),l.rect(c+2,u+1,f-c-4,1,o("#E9A28E"));});}case"wv_moon":return a(VIEW_M({region:"eca",stage:"e",mood:"high",seed:"moon3"}),s,null,(i,l)=>{const u=i.get(112,27)||o("#2A2238"),d=(m,h)=>{for(let g=-m;g<=m;g++)for(let p=-m;p<=m;p++)p*p+g*g<=m*m+m*.8&&l(121+p,27+g,h);};d(8,rmix(u,o("#E9DFB8"),.12)),d(6,rmix(u,o("#E9DFB8"),.26)),d(5,o("#F3EBCB"));for(const[m,h]of[[-2,-1],[-1,-1],[2,2],[1,-3],[-2,2]])l(121+m,27+h,o("#DCD2AE"));l(118,24,o("#FFFBEA"));});case"wv_firefly":{const i=Object.assign({},s,{sky:Object.assign({},s.sky,{e:["#1B2A3E","#2F4447"]}),hill1:o("#203B2F"),hill2:o("#183028"),grass:o("#26432F"),grass2:o("#1B3224"),grasshi:o("#335A3E")}),l=a(VIEW_M({region:"hi",stage:"e",mood:"high",seed:"fl\
y6"}),i),c=lvRand("fly");return r(c,16,30,52,(f,u)=>{const d=o("#F3F29A");for(const[m,h]of[[1,0],[-1,0],[0,1],[0,-1]]){const g=l.get(f+m,u+h);g&&l.px(f+m,u+h,rmix(g,o("#B9D66A"),.45));}l.px(f,u,d);}),l;}case"wv_snownight":{const i=Object.assign({},s,{sky:Object.assign({},s.sky,{e:["#27324C","#4C5872"]}),hill1:o("#5B6A7C"),hill2:o("#4A586B"),far1:o("#3E4A60"),far2:o("#36425A"),grass:o("#C2CCD8"),grass2:o("#A2AEBC"),grasshi:o("#E2E8EE"),soil:o("#9AA6B4"),soil2:o("#86929F"),tree:o("#2F4A46"),tree2:o("#243A37"),treehi:o("#CBD5DE")}),l=a(VIEW_M({region:"eca",stage:"e",seed:"snow3"}),i),c=lvRand("snown");for(const[f,u]of[[90,45],[95,44],[96,44],[121,46],[126,45]])l.px(f,u,o("#F0C35E"));return r(c,90,16,53,(f,u,d)=>l.px(f,u,d%5?o("#E6ECF2"):o("#FFFFFF"))),l;}default:{if(t)try{return a(Object.assign({},t,{people:[],prop:t.prop==="rocket"?"rocket":"none",pet:""}),n);}catch{}return a(VIEW_M({region:"hi",seed:"home"}),n);}}}
/* ═══ OFFICIAL-END: viewScene ═══ */

/* ═══ OFFICIAL-BEGIN: roomWindow ═══ */
function roomWindow(e,t,a,n){const{x:s,y:o,w:r,h:i}=WIN,l=s+2,c=o+2,f=r-4,u=i-6;let d=null;try{d=viewScene(t,a);}catch{d=null;}const m=84,h=Math.max(0,Math.min(PX.H-u,53-u));for(let A=0;A<u;A++)for(let x=0;x<f;x++)e.px(l+x,c+A,d&&d.get(m+x,h+A)||RC.glass);for(let A=0;A<7;A++)for(let x=0;x<2;x++){const v=l+3+A+x,w=c+9-A,j=e.get(v,w);j&&e.px(v,w,rlite(j,.28));}const g=RC.white,p=RC.white2;e.rect(s,o,r,2,g),e.rect(s,o+i-4,r,2,g),e.rect(s,o,2,i-2,g),e.rect(s+r-2,o,2,i-2,p),e.rect(s+(r>>1)-1,o,2,i-3,g),e.rect(s,o+17,r,1,p),e.rect(s-3,o+i-2,r+6,2,g),e.rect(s-3,o+i,r+6,1,rdark(g,.25));const b=rmix(rdark(n,.05),pxRGB("#E7B9A4"),.55),k=rdark(b,.2);for(const A of[0,1]){const x=A?s+r-3:s-3;for(let v=0;v<i+2;v++){const w=v>22&&v<26,j=v<22?0:Math.min(3,Math.round((v-22)/6)),R=w?4:6-(v>26?Math.max(0,2-j):0);for(let z=0;z<R;z++){const E=A?x+6-R+z:x+z;e.px(E,o-2+v,z===(A?0:R-1)||z%3===1?k:b);}w&&e.px(A?x+2:x+1,o-2+v,RC.gold);}}e.rect(s-5,o-4,r+10,2,RC.wood3),e.px(s-6,o-4,RC.gold),e.px(s+r+5,o-4,RC.gold);}
/* ═══ OFFICIAL-END: roomWindow ═══ */

/* ═══ OFFICIAL-BEGIN: roomLight ═══ */
function roomLight(e){for(let t=ROOM.FLOOR;t<ROOM.H-2;t++){const a=(t-ROOM.FLOOR)/(ROOM.H-ROOM.FLOOR),n=16+a*34,s=52+a*46;for(let o=Math.round(n);o<s;o++){const r=e.get(o,t);r&&PX_BAYER[(t&3)*4+(o&3)]<.5-a*.35&&e.px(o,t,rlite(r,.16));}}}
/* ═══ OFFICIAL-END: roomLight ═══ */

/* ═══ OFFICIAL-BEGIN: RX ═══ */
const RX=(e,t)=>new PxR(e,t);
/* ═══ OFFICIAL-END: RX ═══ */

/* ═══ OFFICIAL-BEGIN: itemArt ═══ */
function itemArt(e){const t=(a,n)=>rsp(a,n);switch(e){case"table":{const a=RX(30,14);return a.rect(9,2,6,4,rc("white")),a.rect(10,1,4,1,rc("white2")),a.px(12,0,rc("blue")),a.rect(9,4,6,1,rc("blue")),a.line(15,3,17,1,rc("white")),a.px(8,3,rc("white2")),a.px(8,4,rc("white2")),a.rect(19,3,4,3,rc("white")),a.rect(19,3,4,1,rc("brown")),a.px(23,4,rc("white2")),a.rect(0,6,30,2,rc("wood")),a.rect(0,6,30,1,rc("woodhi")),a.rect(1,8,28,1,rc("wood2")),a.rect(2,9,2,5,rc("wood2")),a.rect(26,9,2,5,rc("wood2")),a;}case"chair":{const a=RX(12,19);return a.rect(1,0,3,10,rc("wood")),a.rect(1,0,1,10,rc("woodhi")),a.rect(1,2,3,1,rc("wood2")),a.rect(1,5,3,1,rc("wood2")),a.rect(3,9,9,2,rc("red")),a.rect(1,11,11,2,rc("wood")),a.rect(1,11,11,1,rc("woodhi")),a.rect(1,13,2,6,rc("wood2")),a.rect(10,13,2,6,rc("wood\
2")),a;}case"plant":{const a=RX(14,20);for(const[n,s]of[[2,4],[4,1],[7,0],[10,1],[12,4],[5,6],[9,6]])a.line(7,12,n,s,rc("green2")),a.px(n,s,rc("green")),a.px(n+(n<7?1:-1),s,rc("greenhi")),a.px(n,s+1,rc("green"));return a.rect(2,12,10,2,rc("#D98A5E")),a.rect(3,14,8,6,rc("#C9744A")),a.rect(3,14,2,6,rc("#D98A5E")),a;}case"bigplant":{const a=RX(18,34),n=(s,o,r,i)=>{a.disc(s,o,r,i),a.px(s-1,o-1,rc("greenhi"));};return a.line(9,22,9,6,rc("green2")),a.line(9,16,3,9,rc("green2")),a.line(9,13,15,6,rc("green2")),n(4,8,3,rc("green")),n(14,5,3,rc("green")),n(9,4,3,rc("green2")),n(5,15,3,rc("green2")),n(13,13,3,rc("green")),n(9,10,2,rc("green")),a.rect(4,23,10,2,rc("#ECE6D8")),a.rect(5,25,8,9,rc("white")),a.rect(5,25,2,9,rc("white2")),a.rect(5,28,8,1,rc("teal")),a;}case"clock":{const a=RX(15,15);a.disc(7,7,7,rc("wood3")),a.disc(7,7,6,rc("wood")),a.disc(7,7,5,rc("paper"));for(const[n,s]of[[7,3],[11,7],[7,11],[3,7]])a.px(n,s,rc("dark"));return a.line(7,7,7,4,rc("black")),a.line(7,7,10,8,rc("black")),a.px(7,7,rc("red")),a;}case"bed":{const a=RX(54,24);a.rect(0,2,5,22,rc("wood2")),a.rect(0,0,5,3,rc("wood")),a.rect(1,3,1,19,rc("woodhi")),a.rect(50,8,4,16,rc("wood2")),a.rect(50,7,4,2,rc("wood")),a.rect(5,13,45,5,rc("white")),a.rect(5,17,45,1,rc("white2")),a.rect(6,8,11,6,rc("paper")),a.rect(6,12,11,2,rc("white2")),a.px(6,8,null),a.rect(15,9,35,6,rc("blue")),a.rect(15,9,35,1,rlite(rc("blue"),.3));for(let n=17;n<50;n+=5)a.px(n,11,rlite(rc("blue"),.45)),a.px(n+2,13,rlite(rc("blue"),.45));return a.rect(15,15,35,2,rc("blue2")),a.rect(5,18,45,2,rc("wood")),a.rect(6,20,2,4,rc("wood3")),a.rect(46,20,2,4,rc("wood3")),a;}case"sofa":{const a=RX(50,21),n=rc("#86A982"),s=rdark(n,.18),o=rlite(n,.2);a.rect(4,0,42,11,n),a.rect(4,0,42,1,o);for(const r of[18,32])a.rect(r,2,1,8,s);a.rect(4,11,42,5,o),a.rect(4,15,42,1,s);for(const r of[18,32])a.rect(r,11,1,4,s);return a.rect(0,6,6,12,n),a.rect(44,6,6,12,n),a.rect(0,6,6,1,o),a.rect(44,6,6,1,o),a.px(0,6,null),a.px(49,6,null),a.rect(0,16,50,2,s),a.rect(2,18,2,3,rc("wood3")),a.rect(46,18,2,3,rc("wood3")),a.rect(8,6,7,5,rc("yellow")),a.rect(8,6,7,1,rlite(rc("yellow"),.3)),a;}case"desk":{const a=RX(46,30);a.rect(5,12,7,2,rc("dark")),a.line(8,12,12,4,rc("dark")),a.line(12,4,17,6,rc("dark"));for(let n=0;n<4;n++)a.rect(14-n,4+n,6+n*2,1,rc(n?"yellow":"yellow2"));for(let n=8;n<14;n++)for(let s=10+(n-8);s<24-(n-8);s++)a.get(s,n)||a.px(s,n,rlite(rc("yellow"),.62));return a.rect(27,9,9,2,rc("red")),a.rect(28,11,8,2,rc("teal")),a.rect(27,13,9,1,rc("cream")),a.rect(0,14,46,2,rc("wood")),a.rect(0,14,46,1,rc("woodhi")),a.rect(30,16,15,14,rc("wood2")),a.rect(31,18,13,5,rc("wood")),a.rect(31,24,13,5,rc("wood")),a.px(37,20,rc("gold")),a.px(37,26,rc("gold")),a.rect(2,16,2,14,rc("wood2")),a;}case"piano":{const a=RX(44,30),n=rc("#3A2E2A"),s=rc("#2A2220"),o=rc("#5A4A44");a.rect(0,0,44,3,n),a.rect(0,0,44,1,o),a.rect(2,3,40,12,s),a.rect(2,3,1,12,o),a.rect(14,5,16,8,rc("paper")),a.rect(14,5,16,1,rc("paper2"));for(let r=7;r<12;r+=2)for(let i=15;i<29;i++)i%3&&a.px(i,r,rc("g\
rey"));a.rect(2,15,40,2,n),a.rect(4,17,36,3,rc("paper"));for(let r=5;r<40;r+=3)r%21!==11&&a.rect(r,17,1,2,rc("black"));return a.rect(2,20,40,4,s),a.rect(4,24,3,6,n),a.rect(37,24,3,6,n),a.rect(18,24,8,2,rc("gold2")),a;}case"tv":{const a=RX(34,30);a.line(12,0,16,5,rc("grey2")),a.line(22,0,18,5,rc("grey2")),a.rect(4,5,26,15,rc("#B7AFA2")),a.rect(4,5,26,1,rc("#D2CBBF")),a.rect(6,7,17,11,rc("#2E3B43"));for(let n=0;n<9;n++)for(let s=0;s<15;s++)(s+n)%2===0&&a.px(7+s,8+n,rmix(rc("#5F8FA6"),rc("#2E3B43"),n/12));return a.px(8,9,rc("white")),a.px(9,9,rc("white")),a.disc(26,9,1,rc("dark")),a.disc(26,14,1,rc("dark")),a.rect(0,20,34,10,rc("wood")),a.rect(0,20,34,1,rc("woodhi")),a.rect(2,22,14,7,rc("wood2")),a.rect(18,22,14,7,rc("wood2")),a.px(15,25,rc("gold")),a.px(18,25,rc("gold")),a;}case"bike":{const a=RX(40,23),n=s=>{a.disc(s,15,7,rc("dark")),a.disc(s,15,6,null);for(let o=0;o<6.28;o+=.08)a.px(s+Math.round(6*Math.cos(o)),15+Math.round(6*Math.sin(o)),rc("dark"));for(let o=0;o<6.28;o+=.08)a.px(s+Math.round(7*Math.cos(o)),15+Math.round(7*Math.sin(o)),rc("black"));a.line(s-4,15,s+4,15,rc("grey")),a.line(s,11,s,19,rc("grey")),a.px(s,15,rc("grey2"));};return n(8),n(31),a.line(8,15,16,7,rc("red")),a.line(16,7,28,7,rc("red")),a.line(19,15,16,7,rc("red")),a.line(19,15,28,7,rc("red")),a.line(28,7,31,15,rc("red")),a.line(8,15,19,15,rc("red")),a.rect(13,4,6,2,rc("black")),a.line(16,6,16,7,rc("dark")),a.line(28,7,27,2,rc("dark")),a.rect(25,1,5,1,rc("dark")),a.disc(19,15,2,rc("grey2")),a;}case"shelf":{const a=RX(26,48),n=rc("wood"),s=rc("wood2");a.rect(0,0,26,48,s),a.rect(2,2,22,44,rc("#6F5137")),a.rect(0,0,26,1,rc("woodhi"));const o=[rc("red"),rc("teal"),rc("yellow"),rc("navy"),rc("cream"),rc("green"),rc("pink2"),rc("orange"),rc("blue")];for(const[r,i]of[[0,2],[1,13],[2,24],[3,35]]){a.rect(2,i+9,22,2,n);let l=3,c=r*3;for(r===0&&(a.rect(16,i+5,6,4,rc("#C9744A")),a.disc(19,i+3,2,rc("green")),a.px(18,i+1,rc("greenhi")));l<(r===0?14:23);){const f=2+(c*7%3===0?1:0),u=5+c*5%4,d=o[c%o.length];if(l+f>23)break;a.rect(l,i+9-u,f,u,d),a.px(l,i+9-u,rlite(d,.3)),l+=f+(c%4===3?2:0),c++;}}return a.rect(0,46,26,2,n),a;}case"wardrobe":{const a=RX(26,50),n=rc("#B7865B"),s=rdark(n,.18);return a.rect(0,0,26,3,s),a.rect(0,0,26,1,rlite(n,.2)),a.rect(1,3,24,44,n),a.rect(12,3,2,44,s),a.rect(3,6,8,18,rlite(n,.1)),a.rect(15,6,8,18,rlite(n,.1)),a.rect(3,27,8,17,rlite(n,.1)),a.rect(15,27,8,17,rlite(n,.1)),a.px(10,25,rc("gold")),a.px(15,25,rc("gold")),a.rect(1,47,24,1,s),a.rect(2,48,2,2,s),a.rect(22,48,2,2,s),a;}case"gclock":{const a=RX(14,50),n=rc("wood3"),s=rc("wood2");a.rect(1,0,12,16,n),a.rect(0,0,14,2,s),a.disc(7,8,5,rc("paper")),a.disc(7,8,5,null);for(let o=0;o<6.28;o+=.1)a.px(7+Math.round(5*Math.cos(o)),8+Math.round(5*Math.sin(o)),rc("gold"));return a.disc(7,8,4,rc("paper")),a.line(7,8,7,5,rc("black")),a.line(7,8,9,9,rc("black")),a.rect(2,16,10,26,n),a.rect(4,18,6,20,rc("#2A2522")),a.line(7,18,7,31,rc("gold2")),a.disc(7,33,2,rc("gold")),a.rect(1,42,12,8,s),a.rect(1,42,12,1,rlite(s,.2)),a;}case"lamp":{const a=RX(14,44);for(let n=0;n<9;n++)a.rect(3-(n>>2),n,8+(n>>2)*2,1,n<1?rc("cream2"):rc("cream"));a.rect(1,9,12,1,rc("cream2"));for(let n=10;n<16;n++)for(let s=2+(n-10);s<12-(n-10)+1;s++)(s+n)%2&&a.px(s,n,rlite(rc("yellow"),.55));return a.line(7,10,7,41,rc("dark")),a.rect(3,42,9,2,rc("dark")),a.rect(4,41,7,1,rc("grey2")),a;}case"xmas":{const a=RX(26,46),n=[[2,8,3],[8,16,6],[15,25,9],[23,34,12]];for(const[o,r,i]of n)for(let l=o;l<r;l++){const c=(l-o+1)/(r-o),f=Math.round(i*c)+1;for(let u=13-f;u<=13+f;u++)a.px(u,l,u<13-f/2?rc("green2"):rc("green"));}const s=lvRand("xmas");for(let o=0;o<16;o++){const r=6+s()*27|0,i=Math.max(1,Math.round(r/34*10)),l=13+Math.round((s()*2-1)*i);a.get(l,r)&&a.px(l,r,[rc("red"),rc("gold"),rc("blue"),rc("white")][o%4]);}return a.px(13,0,rc("gold")),a.px(12,1,rc("gold")),a.px(13,1,rc("yellow")),a.px(14,1,rc("gold")),a.px(13,2,rc("gold")),a.rect(11,34,4,4,rc("wood3")),a.rect(7,38,12,8,rc("red")),a.rect(7,38,12,1,rlite(rc("red"),.3)),a.rect(12,38,2,8,rc("gold")),a;}case"radio":{const a=RX(20,24);a.rect(1,0,18,12,rc("#B98B5E")),a.rect(1,0,18,1,rc("woodhi")),a.rect(3,2,8,8,rc("#E8DCC0"));for(let n=3;n<9;n+=2)a.rect(3,n,8,1,rc("#CDBE9C"));return a.disc(15,4,1,rc("dark")),a.disc(15,8,1,rc("dark")),a.rect(13,1,1,1,rc("gold")),a.rect(0,12,20,2,rc("wood2")),a.rect(2,14,2,10,rc("wood3")),a.rect(16,14,2,10,rc("wood3")),a.rect(2,19,16,1,rc("wood3")),a;}case"tank":{const a=RX(26,31);return a.rect(0,1,26,15,rc("glass")),a.rect(0,0,26,1,rc("dark")),a.rect(1,3,24,12,rmix(rc("glass"),rc("blue"),.25)),a.rect(1,13,24,2,rc("#D9C9A2")),a.line(5,13,5,6,rc("green")),a.line(6,13,7,8,rc("green2")),a.line(20,13,20,7,rc("green")),a.line(21,13,22,9,rc("green2")),a.rect(10,7,3,2,rc("orange")),a.px(9,8,rc("orange2")),a.px(12,7,rc("white")),a.rect(15,10,2,1,rc("yellow")),a.px(14,10,rc("yellow2")),a.px(9,5,rc("white")),a.px(10,4,rc("white")),a.rect(1,16,24,2,rc("wood")),a.rect(2,18,22,13,rc("wood2")),a.rect(4,20,18,9,rc("wood")),a.px(13,24,rc("gold")),a;}case"bear":{const a=rc("#C08A5A"),n=rc("#9C6A40"),s=rc("#E8C9A0");return t([".BB......BB.","BbBB....BBbB",".BBBBBBBBBB.",".BBEBBBBEBB.",".BBBBmmBBBB.",".BBBmNNmBBB.","..BBBmmBBB..","..RRRRRRRR..",".BBBBBBBBBB.","BBBBmmmmBBBB","BBBmmmmmmBBB","BBBBmmmmBBBB",".BBBBBBBBBB.","mmBB....BBmm","mmBB....BBmm"],{B:a,b:n,E:rc("black"),m:s,N:rc("black"),R:rc("red")});}case"globe":{const a=RX(14,22);a.disc(7,7,6,rc("blue")),a.disc(7,7,6,null);for(let n=-6;n<=6;n++)for(let s=-6;s<=6;s++)s*s+n*n<=38&&a.px(7+s,7+n,rc("blue"));for(const[n,s]of[[4,4],[5,4],[5,5],[6,6],[4,9],[5,10],[9,3],[10,4],[9,5],[10,8],[11,9]])a.px(n,s,rc("green"));a.px(4,3,rlite(rc("blue"),.4)),a.px(3,4,rlite(rc("blue"),.4));for(let n=1.2;n<4.9;n+=.06)a.px(7+Math.round(8*Math.cos(n)),7+Math.round(8*Math.sin(n)),rc("gold2"));return a.line(7,14,7,18,rc("gold2")),a.rect(3,19,9,2,rc("wood2")),a.rect(2,21,11,1,rc("wood3")),a;}case"record":{const a=RX(24,27);a.rect(0,5,24,6,rc("#B98B5E")),a.rect(0,5,24,1,rc("woodhi")),a.rect(2,3,15,2,rc("black")),a.rect(4,2,11,1,rc("dark")),a.px(9,3,rc("red")),a.line(20,3,15,4,rc("grey")),a.px(20,2,rc("grey2")),a.disc(20,8,1,rc("dark")),a.line(6,2,2,-2,rc("gold")),a.rect(0,11,24,2,rc("wood2")),a.rect(1,13,22,14,rc("wood")),a.rect(3,15,18,10,rc("wood2"));for(let n=4;n<20;n+=3)a.rect(n,16,2,8,[rc("red"),rc("teal"),rc("yellow"),rc("navy"),rc("cream")][(n/3|0)%5]);return a;}case"cake":{const a=RX(18,26);for(const n of[5,9,13])a.rect(n,2,1,3,rc("cream")),a.px(n,1,rc("orange")),a.px(n,0,rc("yellow"));a.rect(3,5,12,2,rc("white")),a.rect(3,7,12,5,rc("pink")),a.rect(3,9,12,1,rc("white"));for(let n=4;n<15;n+=3)a.px(n,5,rc("red"));return a.rect(1,12,16,1,rc("white2")),a.rect(0,13,18,2,rc("white")),a.rect(8,15,2,9,rc("wood2")),a.rect(4,24,10,2,rc("wood2")),a;}case"wshelf":{const a=RX(28,17);return a.rect(0,13,28,2,rc("wood")),a.rect(0,13,28,1,rc("woodhi")),a.rect(3,15,1,2,rc("wood3")),a.rect(24,15,1,2,rc("wood3")),[[1,9,"red"],[3,10,"navy"],[5,8,"yellow"],[7,9,"teal"]].forEach(([n,s,o])=>{a.rect(n,13-s,2,s,rc(o)),a.px(n,13-s,rlite(rc(o),.3));}),a.line(10,12,13,6,rc("cream2")),a.rect(10,9,2,4,rc("cream")),a.rect(18,8,6,5,rc("white")),a.rect(18,8,6,1,rc("white2")),a.disc(21,5,2,rc("pink")),a.px(20,4,rlite(rc("pink"),.4)),a.px(21,7,rc("green")),a;}case"poster":{const a=RX(19,25);a.rect(0,1,19,24,rc("paper")),a.rect(1,2,17,17,rc("#F2D8B6")),a.disc(12,7,3,rc("orange"));for(let n=1;n<18;n++){const s=18-Math.round(6*Math.max(0,1-Math.abs(n-7)/7));for(let o=s;o<19;o++)a.px(n,o,rc(o===s?"green":"green2"));}return a.rect(3,21,13,1,rc("grey")),a.rect(5,23,9,1,rc("grey")),a.rect(7,0,5,2,rmix(rc("cream"),rc("white"),.5)),a;}case"mirror":{const a=RX(17,23);for(let n=0;n<23;n++)for(let s=0;s<17;s++){const o=(s-8)/8.5,r=(n-11)/11.5,i=o*o+r*r;i<=1&&a.px(s,n,i>.72?rc("gold"):rmix(rc("glass"),rc("white"),.35));}return a.line(5,7,9,3,rc("white")),a.line(5,10,11,4,rlite(rc("glass"),.6)),a;}case"paint":{const a=RX(27,19),n=VIEW_M({region:"eca",mood:"high",seed:"paint"});let s=null;try{s=viewScene("wv_hills");}catch{}a.rect(0,0,27,19,rc("gold2")),a.rect(1,1,25,17,rc("gold"));for(let o=0;o<13;o++)for(let r=0;r<21;r++)a.px(3+r,3+o,s&&s.get(70+r*3,20+o*2)||rc("glass"));return a;}case"lights":{const a=RX(28,11);for(let n=0;n<28;n++)a.px(n,Math.round(2+4*Math.sin(Math.PI*n/27)),rc("dark"));return[3,7,11,15,19,23].forEach((n,s)=>{const o=Math.round(2+4*Math.sin(Math.PI*n/27))+1,r=[rc("yellow"),rc("pink"),rc("teal"),rc("orange"),rc("glass"),rc("red")][s];a.rect(n,o,2,3,r),a.px(n,o,rlite(r,.5));}),a;}case"calendar":{const a=RX(14,18);a.rect(0,2,14,16,rc("paper")),a.rect(0,2,14,4,rc("red")),a.px(4,1,rc("dark")),a.px(9,1,rc("dark")),a.rect(2,3,10,1,rlite(rc("red"),.4));for(let n=8;n<17;n+=2)for(let s=1;s<13;s+=2)a.px(s,n,rc(s===9&&n===12?"red":"grey"));return a;}case"rug_round":{const a=RX(66,11);for(let n=0;n<11;n++)for(let s=0;s<66;s++){const o=(s-32.5)/33,r=(n-5)/5.5,i=o*o+r*r;i<=1&&a.px(s,n,i>.8?rc("#C9A9C2"):i>.45?rc("#E3CCDD"):rc("#D9BBD1"));}return a;}case"rug_stripe":{const a=RX(66,11);for(let n=0;n<9;n++)for(let s=2;s<64;s++)a.px(s,n+1,[rc("\
#E6D2A8"),rc("#7FA6A1"),rc("#E6D2A8"),rc("#D98A6E")][(n/2|0)%4]);for(let n=2;n<64;n+=2)a.px(n,0,rc("cream2")),a.px(n,10,rc("cream2"));return a;}case"rug_persian":{const a=RX(70,12);a.rect(1,0,68,12,rc("#8E3B3F")),a.rect(3,1,64,10,rc("#B5534F")),a.rect(6,3,58,6,rc("#7A2E35"));for(let n=8;n<62;n+=6)a.px(n,5,rc("gold")),a.px(n+1,6,rc("gold")),a.px(n+2,5,rc("gold"));for(let n=3;n<67;n+=3)a.px(n,1,rc("gold")),a.px(n,10,rc("gold"));return a.disc(35,6,2,rc("#E9D6A0")),a;}case"e_lamp":{const a=RX(16,28),n=rmix(rc("glass"),rc("white"),.45);return a.rect(6,0,4,1,rc("grey2")),[4,4,6,6,6,6,4].forEach((s,o)=>{for(let r=0;r<s;r++)a.px(8-(s>>1)+r,1+o,r===0||r===s-1?rdark(n,.12):n);}),a.px(7,4,rc("yellow")),a.px(8,4,rc("yellow")),a.px(7,3,rc("orange")),a.px(8,5,rc("orange")),a.px(7,5,rlite(rc("yellow"),.5)),a.rect(4,8,8,4,rc("gold")),a.rect(4,8,8,1,rlite(rc("gold"),.3)),a.rect(5,12,6,1,rc("gold2")),a.px(12,10,rc("gold2")),a.rect(0,13,16,2,rc("wood")),a.rect(0,13,16,1,rc("woodhi")),a.rect(3,13,10,1,rlite(rc("woodhi"),.3)),a.rect(1,15,2,13,rc("wood2")),a.rect(13,15,2,13,rc("wood2")),a.rect(3,22,10,1,rc("wood3")),a;}case"e_gramo":{const a=RX(24,33);for(let n=-6;n<=6;n++)for(let s=-6;s<=6;s++){const o=Math.sqrt(s*s+n*n)/5.8;o>1||a.px(7+s,6+n,o>.72?s+n<0?rlite(rc("gold"),.3):rc("gold"):o>.38?rc("gold2"):rc("#6E5024"));}return a.line(11,10,15,13,rc("gold")),a.line(10,11,14,14,rc("gold2")),a.px(15,14,rc("gold2")),a.rect(3,14,17,6,rc("wood2")),a.rect(3,14,17,1,rc("woodhi")),a.rect(5,13,10,1,rc("black")),a.px(10,12,rc("red")),a.line(20,16,22,15,rc("grey2")),a.rect(2,20,19,13,rc("wood")),a.rect(2,20,19,1,rc("woodhi")),a.rect(4,22,7,9,rc("wood2")),a.rect(12,22,7,9,rc("wood2")),a.px(10,26,rc("gold")),a.px(12,26,rc("gold")),a;}case"e_sew":{const a=RX(26,31),n=rc("#2C2A2E");a.rect(4,4,14,2,n),a.rect(15,4,4,7,n),a.rect(4,4,3,6,n),a.rect(3,10,18,2,n),a.px(5,10,rc("grey")),a.px(5,11,rc("grey"));for(const s of[8,11,14])a.px(s,5,rc("gold"));a.disc(20,6,2,rc("grey2")),a.px(20,6,rc("grey")),a.px(10,3,rc("red")),a.px(10,2,rc("red")),a.rect(0,12,26,2,rc("wood")),a.rect(0,12,26,1,rc("woodhi")),a.rect(1,14,6,4,rc("wood2")),a.px(4,16,rc("gold")),a.rect(2,18,2,13,n),a.rect(22,14,2,17,n),a.rect(1,30,4,1,n),a.rect(21,30,4,1,n);for(let s=0;s<6.28;s+=.15)a.px(17+Math.round(4*Math.cos(s)),21+Math.round(4*Math.sin(s)),n);a.line(17,17,17,25,n),a.line(13,21,21,21,n),a.line(17,15,17,17,n),a.rect(5,27,16,2,n);for(let s=6;s<20;s+=2)a.px(s,27,rc("grey2"));return a;}case"e_type":{const a=RX(22,27);a.rect(6,0,10,5,rc("paper"));for(const n of[1,3])a.rect(7,n,8,1,rc("grey"));a.rect(2,4,18,2,rc("black")),a.px(1,4,rc("grey2")),a.px(20,4,rc("grey2")),a.rect(3,6,16,6,rc("#3E4E46")),a.rect(3,6,16,1,rlite(rc("#3E4E46"),.25));for(let n=8;n<12;n+=2)for(let s=4+(n%4?1:0);s<18;s+=2)a.px(s,n,rc("paper2"));return a.rect(7,11,8,1,rc("paper2")),a.rect(0,12,22,2,rc("wood")),a.rect(0,12,22,1,rc("woodhi")),a.rect(1,14,2,13,rc("wood2")),a.rect(19,14,2,13,rc("wood2")),a.rect(3,21,16,1,rc("wood3")),a;}case"e_dial":{const a=RX(16,27),n=rc("#C8504F"),s=rdark(n,.2);a.rect(2,3,3,2,n),a.rect(11,3,3,2,n),a.rect(3,4,10,2,n),a.rect(3,4,10,1,rlite(n,.25)),a.rect(3,6,10,5,n),a.rect(2,9,12,2,s),a.disc(8,8,2,rc("paper")),a.px(8,8,s);for(const[o,r]of[[7,7],[9,7],[10,8]])a.px(o,r,rc("grey"));for(let o=0;o<4;o++)a.px(14+o%2,11+o,rc("dark"));a.rect(0,11,16,2,rc("wood")),a.rect(1,11,14,1,rc("white"));for(let o=1;o<15;o+=2)a.px(o,13,rc("white"));return a.rect(7,13,2,11,rc("wood2")),a.rect(4,24,8,2,rc("wood2")),a.rect(5,24,6,1,rc("wood")),a;}case"e_najeon":{const a=RX(26,48),n=rc("#2B2623"),s=rc("#3C332E"),o=[rc("#DDEFE9"),rc("#EEDDF0"),rc("#CFE2F2"),rc("#FFFFFF"),rc("#E9E2C9")];a.rect(0,0,26,2,s),a.rect(0,0,26,1,rlite(s,.15)),a.rect(1,2,24,43,n),a.rect(12,2,2,32,rc("#1E1A18")),a.rect(1,34,24,1,s),a.rect(1,39,24,1,s),a.rect(1,45,24,1,s),a.rect(2,46,3,2,s),a.rect(21,46,3,2,s),a.line(4,26,4,18,o[4]),a.line(3,19,7,15,o[0]),a.line(5,21,9,18,o[0]);for(const[r,i]of[[2,17],[8,16],[10,19],[6,13]])a.px(r,i,o[0]);a.px(7,7,o[3]),a.px(8,7,o[3]),a.px(9,6,o[3]),a.px(6,8,o[3]),a.px(10,8,o[1]),a.px(5,6,o[2]),a.px(9,9,rc("red"));for(const[r,i,l]of[[17,8,1],[19,9,1],[18,10,3],[16,10,1],[18,7,1],[21,14,2],[20,15,3],[22,15,2],[21,16,2],[17,20,0],[18,21,3],[16,21,0],[17,22,0],[22,25,1],[21,26,3],[20,28,0]])a.px(r,i,o[l]);a.line(18,12,19,24,rc("#5E7A68")),a.rect(10,18,6,5,rc("gold2")),a.rect(11,19,4,3,rc("gold")),a.px(12,20,rc("gold2"));for(const r of[36,41])a.px(7,r+1,rc("gold")),a.px(18,r+1,rc("gold")),a.px(4,r,o[0]),a.px(12,r+2,o[1]),a.px(21,r,o[2]);return a;}case"e_yeontan":{const a=RX(16,33),n=rc("#8E979C"),s=rc("#6E777C");return a.rect(11,0,3,13,s),a.rect(11,0,1,13,rlite(s,.25)),a.px(5,2,rc("white2")),a.px(6,1,rc("white2")),a.px(7,3,rc("white2")),a.rect(4,6,6,4,rc("#CFC8BA")),a.rect(4,6,6,1,rc("white")),a.px(10,8,rc("#CFC8BA")),a.px(11,7,rc("#CFC8BA")),a.line(5,5,8,5,rc("dark")),a.rect(2,10,12,2,rc("dark")),a.rect(3,12,10,17,n),a.rect(3,12,2,17,rlite(n,.2)),a.rect(11,12,2,17,s),a.rect(6,22,4,2,rc("orange")),a.px(7,22,rc("yellow")),a.rect(5,16,6,1,s),a.rect(3,29,2,3,rc("dark")),a.rect(11,29,2,3,rc("dark")),a;}case"e_fan":{const a=RX(16,33),n=rc("#9CCBE0");for(let s=0;s<6.28;s+=.12)a.px(8+Math.round(6*Math.cos(s)),7+Math.round(6*Math.sin(s)),rc("white2"));for(const s of[.4,2.5,4.6])for(let o=1;o<=5;o++){const r=8+o*Math.cos(s),i=7+o*Math.sin(s);a.px(r,i,n),a.px(r+Math.cos(s+1.57),i+Math.sin(s+1.57),rdark(n,.12));}return a.disc(8,7,1,rc("blue2")),a.rect(7,13,2,3,rc("white2")),a.rect(7,16,2,12,rc("white")),a.px(7,16,rc("white2")),a.rect(2,28,12,4,rc("white")),a.rect(2,28,12,1,rc("white2")),[rc("red"),rc("yellow"),rc("green"),rc("blue")].forEach((s,o)=>a.px(4+o*2,29,s)),a;}case"e_cassette":{const a=RX(26,25),n=rc("#6B7178"),s=rc("#50565C");a.line(22,3,25,0,rc("grey")),a.rect(6,1,14,1,rc("dark")),a.rect(6,1,1,3,rc("dark")),a.rect(19,1,1,3,rc("dark")),a.rect(1,4,24,11,n),a.rect(1,4,24,1,rlite(n,.3)),a.rect(1,14,24,1,s);for(const o of[6,20])a.disc(o,10,3,s),a.disc(o,10,2,rc("dark")),a.px(o,10,rc("grey"));return a.rect(10,7,6,6,rc("#3A3E44")),a.rect(11,8,4,2,rc("glass2")),a.px(11,9,rc("dark")),a.px(14,9,rc("dark")),a.rect(10,5,6,1,rc("white2")),a.px(12,5,rc("red")),a.rect(0,15,26,2,rc("wood")),a.rect(0,15,26,1,rc("woodhi")),a.rect(1,17,2,8,rc("wood2")),a.rect(23,17,2,8,rc("wood2")),a;}case"e_crt":{const a=RX(24,31),n=rc("#43474D");a.rect(2,0,20,16,n),a.rect(2,0,20,1,rlite(n,.2)),a.rect(4,2,13,11,rc("#2E3B43"));for(let s=0;s<9;s++)for(let o=0;o<11;o++)(o+s)%2===0&&a.px(5+o,3+s,rmix(rc("#6FA0B8"),rc("#2E3B43"),s/11));a.px(6,4,rc("white")),a.px(7,4,rc("white"));for(const s of[4,7,10])a.px(19,s,rc("grey"));return a.rect(18,12,3,1,rc("green")),a.rect(8,16,8,1,rdark(n,.2)),a.rect(0,17,24,14,rc("wood")),a.rect(0,17,24,1,rc("woodhi")),a.rect(3,19,18,3,rc("black")),a.rect(5,20,7,1,rc("dark")),a.px(18,20,rc("green")),a.rect(2,24,9,6,rc("wood2")),a.rect(13,24,9,6,rc("wood2")),a.px(10,27,rc("gold")),a.px(13,27,rc("gold")),a;}case"e_pc":{const a=RX(46,32),n=rc("#DCD5C1"),s=rc("#BDB5A0");a.rect(9,0,20,14,n),a.rect(9,0,20,1,rlite(n,.3)),a.rect(27,1,2,13,s),a.rect(11,2,15,10,rc("#3E6D92"));for(const[o,r,i]of[[12,3,6],[12,5,9],[12,7,4],[12,9,7]])a.rect(o,r,i,1,rc("#D6E6F0"));return a.px(25,13,rc("green")),a.rect(15,14,8,1,s),a.rect(10,15,16,1,rc("#EEE8D8")),a.rect(28,15,2,1,rc("#EEE8D8")),a.rect(0,16,46,2,rc("wood")),a.rect(0,16,46,1,rc("woodhi")),a.rect(1,18,3,14,rc("wood2")),a.rect(42,18,3,14,rc("wood2")),a.rect(32,19,8,13,n),a.rect(32,19,8,1,rlite(n,.3)),a.rect(33,21,6,1,s),a.rect(33,23,6,1,s),a.rect(34,26,4,1,rc("dark")),a.px(38,29,rc("green")),a;}case"e_aircon":{const a=RX(14,47);a.rect(1,0,12,45,rc("white")),a.rect(1,0,12,1,rc("paper")),a.rect(11,1,2,44,rc("white2")),a.rect(2,3,9,11,rc("white2"));for(let n=4;n<14;n+=2)a.rect(3,n,7,1,rc("grey"));a.rect(4,17,5,2,rc("#4C6A86")),a.px(5,17,rc("glass"));for(const[n,s,o]of[[5,28,"pink"],[4,29,"pink"],[6,29,"pink"],[5,30,"pink"],[5,29,"yellow"],[8,33,"pink2"],[7,34,"pink2"],[9,34,"pink2"],[8,35,"pink2"],[8,34,"yellow"]])a.px(n,s,rc(o));return a.line(5,31,6,38,rc("gr\
een")),a.line(8,36,7,39,rc("green")),a.rect(0,45,14,2,rc("white2")),a;}case"e_flatv":{const a=RX(27,17);a.rect(0,0,27,16,rc("black")),a.rect(1,1,25,14,rc("#2B3640"));for(let n=0;n<14;n++)for(let s=0;s<25;s++)s-n>8&&s-n<12&&a.px(1+s,1+n,rc("#34424D"));return a.rect(12,16,3,1,rc("dark")),a.px(24,15,rc("red")),a;}case"e_purifier":{const a=RX(12,25);a.rect(1,1,10,24,rc("white")),a.rect(1,1,10,1,rc("paper")),a.rect(9,2,2,23,rc("white2"));for(let n=2;n<6;n++)for(let s=2;s<9;s+=2)a.px(s+n%2,n,rc("grey"));return a.disc(5,10,1,rc("teal")),a.px(5,10,rc("glass")),a.rect(2,14,7,9,rc("paper")),a.rect(1,24,10,1,rc("white2")),a;}case"rocking":{const a=RX(34,33),n=rc("wood"),s=rc("wood2"),o=rc("wood3"),r=rc("woodhi"),i=rc("pink"),l=rc("pink2");for(let c=0;c<34;c++){const f=(c-17)/17,u=28+Math.round(3*(1-f*f));a.px(c,u,s),a.px(c,u+1,o);}a.rect(10,21,2,9,s),a.rect(24,21,2,9,s);for(let c=0;c<22;c++){const f=3+Math.round(c*6/21);a.px(f,c,r),a.px(f+1,c,n),a.px(f+2,c,s);}a.rect(2,0,5,2,n),a.rect(2,0,5,1,r),a.rect(8,19,19,2,n),a.rect(8,19,19,1,r),a.rect(10,17,15,2,rc("red")),a.rect(10,17,15,1,rlite(rc("red"),.3)),a.rect(8,11,18,2,n),a.rect(8,11,18,1,r),a.rect(23,13,2,6,s);for(let c=2;c<16;c++){const f=Math.round(c*6/21),u=c<5?7:4;for(let d=0;d<u;d++)a.px(f+d,c,c%2?d%2?i:rlite(i,.2):i);}for(let c=0;c<4;c+=2)a.px(Math.round(96/21)+c,16,l);return a;}case"fire":{const a=RX(42,33),n=rc("#BF7A60"),s=rc("#A5624C"),o=rc("#E3C9B4"),r=rc("#CFC6B8");a.rect(5,1,2,3,rc("cream")),a.px(5,0,rc("orange")),a.px(6,0,rc("yellow")),a.rect(16,0,6,4,rc("gold")),a.rect(17,1,4,2,rc("#CFE2F2")),a.px(18,2,rc("green")),a.rect(32,1,3,3,rc("teal")),a.px(33,0,rc("pink")),a.px(32,1,rlite(rc("teal"),.3)),a.rect(0,4,42,3,rc("wood")),a.rect(0,4,42,1,rc("woodhi")),a.rect(1,7,40,1,rc("wood3")),a.rect(2,8,38,22,n);for(let l=0,c=8;c<30;c+=3,l++){a.rect(2,c+2,38,1,o);for(let f=2+l%2*3;f<40;f+=6)a.rect(f,c,1,2,o),(f+l*5)%4===1&&a.rect(f+1,c,Math.min(5,39-f),2,s);}const i=(l,c)=>l<13-c?null:l===13-c?[14-c,27+c]:l===14-c?[12-c,29+c]:[11-c,30+c];for(let l=11;l<30;l++){const c=i(l,1);if(c)for(let f=c[0];f<=c[1];f++)a.px(f,l,r);}for(let l=12;l<30;l++){const c=i(l,0);if(c)for(let f=c[0];f<=c[1];f++)a.px(f,l,rmix(rc("#2E2624"),rc("#5A3A2A"),(l-13)/16));}for(const[l,c]of[[16,0],[17,1],[18,1],[19,2],[20,2],[21,3],[22,4],[23,5],[24,5],[25,6],[26,6]])for(let f=21-c;f<=21+c;f++){const u=Math.abs(f-21)/(c+1);a.px(f,l,u>.6?rc("orange"):u>.25?rc("yellow"):rlite(rc("yellow"),.65));}for(const[l,c]of[[15,21],[27,20]])for(let f=c;f<27;f++)a.px(l,f,rc("orange")),f>c+2&&a.px(l+(l<21?1:-1),f,rc("yellow"));return a.rect(13,27,17,2,rc("wood2")),a.rect(13,27,17,1,rc("wood")),a.px(13,27,rc("cream2")),a.px(29,28,rc("cream2")),a.px(18,28,rc("red")),a.px(24,28,rc("orange")),a.rect(0,30,42,3,r),a.rect(0,30,42,1,rlite(r,.3)),a.rect(0,32,42,1,rdark(r,.15)),a;}case"scope":{const a=RX(24,48),n=rc("navy"),s=rc("navy2"),o=rlite(rc("navy"),.3);a.line(12,22,3,47,rc("wood3")),a.line(13,22,22,47,rc("wood3")),a.line(12,22,12,46,rc("wood2")),a.line(6,38,19,38,rc("wo\
od3")),a.rect(10,18,5,4,rc("dark")),a.rect(10,18,5,1,rc("grey2"));const r=3,i=26,l=20,c=4,f=Math.hypot(l-r,c-i),u=(l-r)/f,d=(c-i)/f;for(let m=0;m<=f+1;m+=.35){const h=m/f,g=r+u*m,p=i+d*m,b=1.4+h*1.2;for(let k=-b;k<=b;k+=.35){const A=h>1?rc("glass"):h>.3&&h<.37||h>.9?rc("gold"):k<-b+.8?o:k>b-.8?s:n;a.px(g-d*k,p+u*k,A);}}return a.px(1,28,rc("grey2")),a.px(2,27,rc("grey")),a.px(1,29,rc("dark")),a;}case"birdcage":{const a=RX(22,46),n=rc("gold"),s=rc("gold2"),o=rmix(rc("paper"),rc("glass"),.25);a.px(11,0,s),a.px(10,1,s),a.px(12,1,s),a.px(11,2,s);const r=[4,10,14,16,18,18];for(let i=3;i<25;i++){const l=i<9?r[i-3]:18,c=11-l/2;for(let f=c;f<c+l;f++)a.px(f,i,f===c||f===c+l-1||i===3?s:(f-2)%3===0?n:o);}return a.rect(2,9,18,1,n),a.rect(2,16,18,1,rlite(n,.15)),a.rect(4,19,14,1,rc("wood3")),a.blit(rsp(["..YY...",".YYYEO.",".YYYY..","yYyyY..","yyYYY..","..k.k.."],{Y:"yellow",y:"yellow2",E:"black",O:"orange",k:"orange2"}),7,13,null),a.rect(14,21,3,2,rc("teal")),a.rect(1,24,20,3,n),a.rect(1,24,20,1,rlite(n,.3)),a.rect(1,26,20,1,s),a.rect(10,27,2,16,rc("wood3")),a.rect(10,27,1,16,rc("wood2")),a.rect(9,33,4,2,rc("wood2")),a.rect(5,44,12,2,rc("wood3")),a.rect(6,43,10,1,rc("wood2")),a;}case"violin":{const a=RX(15,27),n=rc("#B8642E"),s=rc("#8E4722"),o=rc("#D58E52"),r=rc("#2E2A28");return a.line(12,1,11,25,rc("wood3")),a.line(13,2,12,25,rc("white2")),a.rect(5,0,2,3,s),a.px(4,1,s),a.px(4,2,r),a.px(7,1,r),a.rect(6,3,1,8,r),[5,7,9,9,7,5,5,7,9,9,9,7,5].forEach((i,l)=>{for(let c=0;c<i;c++)a.px(6-(i>>1)+c,10+l,c===0||c===i-1?s:c===1?o:n);}),a.rect(6,10,1,5,r),a.px(4,16,s),a.px(4,17,s),a.px(8,16,s),a.px(8,17,s),a.rect(5,17,3,1,rc("cream")),a.rect(6,18,1,4,r),a.line(2,26,5,23,rc("dark")),a.line(10,26,7,23,rc("dark")),a;}case"drum":{const a=RX(20,21),n=rc("red"),s=rc("red2"),o=rlite(rc("red"),.25),r=rc("cream");for(let i=2;i<17;i++){const l=i>5&&i<14?1:0,c=2-l,f=17+l;for(let u=c;u<=f;u++)a.px(u,i,u<c+2?o:u>f-3?s:n);}a.rect(4,17,12,1,s);for(const i of[4,15])for(let l=3;l<17;l+=2)a.px(l,i,rc("gold"));return a.rect(2,9,16,1,rc("gold2")),a.rect(1,10,18,1,rc("blue")),a.rect(2,11,16,1,rc("gold2")),[[4,15],[2,17],[2,17],[4,15]].forEach(([i,l],c)=>{for(let f=i;f<=l;f++)a.px(f,c,c===3?rc("cream2"):c===0?rlite(r,.4):r);}),a.rect(4,18,2,3,rc("wood3")),a.rect(14,18,2,3,rc("wood3")),a.rect(4,18,12,1,rc("wood3")),a;}case"tea":{const a=RX(26,18),n=rc("#9CC4AE"),s=rdark(n,.15),o=rlite(n,.35);[6,8,10,10,10,8].forEach((r,i)=>{for(let l=0;l<r;l++)a.px(8-(r>>1)+l,4+i,l<2?o:l>=r-2?s:n);}),a.rect(5,3,6,1,s),a.rect(7,2,2,1,s),a.line(13,7,16,4,n),a.line(13,8,16,5,s),a.px(2,5,s),a.px(1,6,s),a.px(1,7,s),a.px(2,8,s);for(const r of[18,22])a.rect(r,7,3,3,rc("white")),a.rect(r,7,3,1,rc("paper")),a.px(r+2,8,rc("white2")),a.px(r+2,9,rc("white2")),a.rect(r,8,3,1,n);return a.rect(0,10,26,2,rc("wood")),a.rect(0,10,26,1,rc("woodhi")),a.rect(1,12,24,1,rc("wood2")),a.rect(2,13,2,5,rc("wood2")),a.rect(22,13,2,5,rc("wood2")),a.rect(4,13,18,1,rc("wood3")),a;}case"chess":{const a=RX(22,27),n=rc("white"),s=rc("#6B4A3A");for(let r=0;r<4;r++)for(let i=0;i<8;i++)a.rect(3+i*2,10+r,2,1,(i+r)%2?rc("green2"):rc("cream"));a.rect(2,14,18,1,rc("wood3"));const o=(r,i,l,c)=>a.blit(rsp(r,{P:c,a:rlite(c,.3),b:rdark(c,.15)}),i,l-r.length+1,null);return o([".P.","aPb",".P.","aPb",".P.",".P.","aPb"],4,11,n),o([".aP.","aPPb","..Pb",".aP.",".aP.","aPPb"],11,10,s),o([".P.","aPb",".P.","aPb"],16,12,n),a.rect(0,15,22,2,rc("wood")),a.rect(0,15,22,1,rc("woodhi")),a.rect(2,17,2,10,rc("wood2")),a.rect(18,17,2,10,rc("wood2")),a.rect(2,22,18,1,rc("wood3")),a;}case"bonsai":{const a=RX(24,22),n=rc("wood3"),s=(o,r,i)=>{a.rect(o+1,r,i-2,1,rc("greenhi")),a.rect(o,r+1,i,2,rc("green")),a.rect(o+1,r+3,i-2,1,rc("green2"));};return[12,12,11,10,10,10,11,12,12,11].forEach((o,r)=>a.rect(o,13-r,2,1,r>6?rc("brown"):n)),a.line(10,9,5,7,n),a.line(12,6,17,4,n),s(2,5,8),s(13,2,9),s(7,0,8),a.rect(4,13,16,1,rc("#7E95B3")),a.rect(5,14,14,3,rc("#56708F")),a.rect(5,14,2,3,rc("#6A84A4")),a.px(6,17,rc("#3F546E")),a.px(17,17,rc("#3F546E")),a.rect(1,18,22,1,rc("wood")),a.rect(1,19,22,1,rc("wood2")),a.rect(2,20,2,2,rc("wood3")),a.rect(20,20,2,2,rc("wood3")),a;}case"cactus":{const a=RX(14,27),n=rc("green"),s=rc("green2"),o=rc("greenhi"),r=(i,l,c,f)=>{for(let u=l;u<=c;u++)for(let d=0;d<f;d++)a.px(i+d,u,u===l&&(d===0||d===f-1)?null:d===0?o:d===f-1?s:n);};r(1,7,13,3),a.rect(2,12,4,2,n),r(10,5,11,3),a.rect(8,10,3,2,n),r(5,3,19,4),a.rect(7,4,1,15,rlite(n,.15));for(const[i,l]of[[6,7],[8,11],[6,15],[2,10],[11,7]])a.px(i,l,rc("white"));return a.px(6,2,rc("pink")),a.px(7,2,rc("pink")),a.px(6,1,rc("pink2")),a.px(7,1,rlite(rc("pink"),.4)),a.px(8,2,rc("pink2")),a.rect(2,20,10,2,rc("#D98A5E")),a.rect(3,22,8,5,rc("#C9744A")),a.rect(3,22,2,5,rc("#D98A5E")),a;}case"suitcase":{const a=RX(24,20),n=rc("#B07A50"),s=rdark(n,.2),o=rlite(n,.2);a.rect(9,0,6,1,rc("wood3")),a.rect(8,1,1,2,rc("wood3")),a.rect(15,1,1,2,rc("wood3")),a.rect(1,3,22,16,n),a.rect(0,4,24,14,n),a.rect(1,3,22,1,o),a.rect(0,7,24,1,s),a.rect(1,18,22,1,s),a.rect(5,3,2,16,s),a.rect(17,3,2,16,s),a.rect(5,9,2,2,rc("gold")),a.rect(17,9,2,2,rc("gold"));for(const[r,i]of[[0,4],[23,4],[0,17],[23,17],[9,7],[14,7]])a.px(r,i,rc("gold"));return a.disc(11,12,2,rc("red")),a.px(11,12,rc("paper")),a.rect(1,9,3,4,rc("teal")),a.px(2,10,rc("white")),a.rect(19,10,4,3,rc("yellow")),a.rect(19,11,4,1,rc("orange")),a.rect(13,14,3,3,rc("paper")),a.px(14,15,rc("blue")),a;}case"fruit":{const a=RX(22,27),n=rc("#C9A26B"),s=rc("#A9824F");for(let o=0;o<=Math.PI;o+=.05)a.px(11+Math.round(7*Math.cos(o)),7-Math.round(7*Math.sin(o)),s);a.line(8,4,12,3,rc("yellow")),a.line(8,5,12,4,rc("yellow2")),a.disc(6,6,2,rc("red")),a.px(5,5,rlite(rc("red"),.4)),a.px(6,3,rc("green")),a.disc(11,6,2,rc("orange")),a.px(10,5,rlite(rc("orange"),.4));for(const[o,r]of[[14,4],[16,4],[15,5],[17,5],[14,6],[16,6],[15,7]])a.px(o,r,rc("purple"));return a.px(14,4,rlite(rc("purple"),.35)),a.px(15,3,rc("green2")),[16,16,14,14,12,12].forEach((o,r)=>{for(let i=0;i<o;i++)a.px(11-o/2+i,7+r,(i+r)%2&&r%2?s:n);}),a.rect(3,7,16,1,rlite(n,.2)),a.rect(0,13,22,2,rc("wo\
od")),a.rect(0,13,22,1,rc("woodhi")),a.rect(2,15,2,12,rc("wood2")),a.rect(18,15,2,12,rc("wood2")),a.rect(2,21,18,1,rc("wood3")),a;}case"lantern":{const a=RX(16,32),n=rc("wood2"),s=rc("#FFF3CC");return a.rect(1,0,2,30,n),a.rect(1,0,1,30,rc("wood")),a.rect(1,0,10,2,n),a.rect(1,0,10,1,rc("wood")),a.px(10,2,rc("dark")),a.rect(0,30,5,2,rc("wood3")),a.rect(7,3,7,1,rc("dark")),[7,9,11,11,11,11,11,9,7].forEach((o,r)=>{for(let i=0;i<o;i++){const l=Math.abs(i-(o-1)/2)/((o-1)/2),c=l>.75?rc("orange"):l>.4?rc("yellow"):s;a.px(10-(o>>1)+i,4+r,r%2?c:rmix(c,rc("orange2"),.18));}}),a.rect(8,13,5,1,rc("dark")),a.px(10,14,rc("red")),a.px(10,15,rc("red")),a.px(9,16,rc("red2")),a.px(11,16,rc("red2")),a;}case"kite":{const a=RX(22,26),n=8,s=6;for(let r=0;r<=17;r++)for(let i=0;i<=16;i++)(r<=s?(s-r)/6.5:(r-s)/11.5)+Math.abs(i-n)/7.5<=1&&a.px(i,r,r<=s?i<=n?rc("red"):rc("yellow"):i<=n?rc("blue"):rc("paper"));a.line(n,0,n,17,rc("wood3")),a.line(1,s,15,s,rc("wood3"));const o=r=>[Math.round(n+r*.9),Math.round(17+r*.55+Math.sin(r*.7)*1.3)];for(let r=1;r<=14;r++)a.line(...o(r-1),...o(r),rc("paper2"));for(const[r,i]of[[4,"red"],[8,"teal"],[12,"yellow"]]){const[l,c]=o(r);a.rect(l-1,c-1,1,3,rc(i)),a.rect(l+1,c-1,1,3,rc(i)),a.px(l,c,rlite(rc(i),.3));}return a;}case"chime":{const a=RX(12,22),n=rc("#6E9C8C"),s=rdark(n,.2),o=rlite(n,.3);return a.rect(5,0,1,3,rc("wood3")),[3,5,7,7,7,7,9,11].forEach((r,i)=>{for(let l=0;l<r;l++)a.px(5-(r>>1)+l,3+i,l===0?o:l===r-1?s:n);}),a.rect(2,6,7,1,rc("gold2")),a.rect(0,10,11,1,rdark(n,.1)),a.px(5,11,rc("dark")),a.rect(5,12,1,4,rc("wood3")),a.blit(rsp(["...GGG....T",".GGGGGGG.TT","GGEGyGyGGT.",".GGGGGGG.TT","...GGG....T"],{G:"gold",y:"yellow",E:"dark",T:"gold2"}),0,16,null),a;}case"quilt":{const a=RX(26,25);return a.rect(0,0,26,2,rc("wood3")),a.rect(0,0,26,1,rc("wood2")),[[1,2,9,7,"#EBA6B9"],[10,2,6,5,"#F1E4C8"],[16,2,9,9,"#8FC7B0"],[10,7,6,6,"#F2D27A"],[1,9,5,8,"#A9CBE3"],[6,9,4,4,"#B9A6D9"],[6,13,10,4,"#E9967A"],[16,11,9,6,"#F6EEE0"],[1,17,7,8,"#B5D69A"],[8,17,9,8,"#C9B6E4"],[17,17,8,8,"#F4C7CF"]].forEach(([n,s,o,r,i])=>{a.rect(n,s,o,r,rc(i)),a.rect(n,s,o,1,rlite(rc(i),.25)),a.rect(n+o-1,s,1,r,rdark(rc(i),.12)),a.rect(n,s+r-1,o,1,rdark(rc(i),.12));}),a.rect(12,9,2,2,rc("red")),a;}case"rug_mat":{const a=RX(68,11),n=rc("#E5CF92"),s=rc("#D2B877"),o=rc("#BFA262");for(let r=0;r<11;r++)for(let i=0;i<68;i++)a.px(i,r,r===0||r===10?o:r%2?n:rmix(n,s,.5));for(let r=5;r<64;r+=4)for(let i=1;i<10;i+=2)a.px(r+(i%4===1?0:2),i,s);for(const r of[6,60])a.rect(r,1,1,9,rc("red")),a.rect(r+2,1,1,9,rc("green2"));return a.rect(0,0,2,11,rc("navy")),a.rect(66,0,2,11,rc("navy")),a;}case"rug_kilim":{const a=RX(70,11),n=rc("#B9584A"),s=rc("navy"),o=rc("#E3B55B"),r=rc("cream");a.rect(2,0,66,11,s),a.rect(3,1,64,9,n);for(let i=4;i<66;i+=2)a.px(i,1,o),a.px(i+1,9,o);for(const i of[11,23,35,47,59])for(let l=2;l<=8;l++)for(let c=-5;c<=5;c++){const f=Math.abs(c)/5.5+Math.abs(l-5)/3.5;f<=1&&a.px(i+c,l,f>.7?s:f>.38?o:r);}for(const i of[17,29,41,53])a.px(i,4,r),a.px(i-1,5,r),a.px(i,5,o),a.px(i+1,5,r),a.px(i,6,r);for(let i=0;i<11;i++)a.px(0,i,i%2?null:r),a.px(1,i,r),a.px(68,i,r),a.px(69,i,i%2?null:r);return a;}case"l_dog":return pxPet("d",roomPal());case"l_cat":return pxPet("c",roomPal());case"l_guitar":{const a=RX(13,30),n=rc("#D7A060"),s=rc("#B98446");a.rect(5,0,3,3,rc("wood3")),a.px(4,1,rc("grey")),a.px(8,1,rc("grey")),a.rect(6,3,1,11,rc("wood3"));for(let o=5;o<14;o+=3)a.px(6,o,rc("grey"));return[3,5,7,7,5,5,7,9,9,9,9,7,5].forEach((o,r)=>{for(let i=0;i<o;i++)a.px(6-(o>>1)+i,14+r,i===0||i===o-1?s:n);}),a.disc(6,20,1,rc("#4A3420")),a.rect(4,23,5,1,rc("wood3")),a.line(1,29,4,25,rc("dark")),a.line(11,29,8,25,rc("dark")),a;}case"l_easel":{const a=RX(24,42);a.line(4,41,12,0,rc("wood2")),a.line(20,41,12,0,rc("wood2")),a.line(12,4,12,41,rc("wood3")),a.rect(3,28,18,2,rc("wood2")),a.rect(2,6,20,22,rc("paper")),a.rect(3,7,18,13,rc("#9ED0E0")),a.disc(16,11,2,rc("yellow"));for(let n=0;n<18;n++){const s=19-Math.round(4*Math.max(0,1-Math.abs(n-6)/6));for(let o=s;o<20;o++)a.px(3+n,o,rc("green"));}return a.rect(3,20,18,7,rc("#E9D9B4")),a.px(6,22,rc("red")),a.px(9,23,rc("blue")),a.px(13,22,rc("yellow")),a;}case"l_medal":{const a=RX(19,25);return a.rect(0,0,19,25,rc("wood3")),a.rect(1,1,17,23,rc("navy")),a.line(5,2,9,12,rc("red")),a.line(6,2,10,12,rc("red")),a.line(13,2,9,12,rc("blue")),a.line(14,2,10,12,rc("blue")),a.disc(9,16,4,rc("gold")),a.disc(9,16,2,rc("yellow")),a.px(8,15,rc("white")),a.rect(5,21,9,1,rc("gold2")),a;}case"l_diploma":{const a=RX(25,19);a.rect(0,0,25,19,rc("wood3")),a.rect(1,1,23,17,rc("gold2")),a.rect(2,2,21,15,rc("paper")),a.rect(5,4,15,1,rc("dark"));for(const n of[7,9,11])a.rect(4,n,17,1,rc("grey"));return a.disc(19,13,2,rc("red")),a.px(18,16,rc("red")),a.px(20,16,rc("red")),a;}case"l_wed":{const a=RX(19,23);a.rect(0,0,19,23,rc("white2")),a.rect(1,1,17,21,rc("white")),a.rect(2,2,15,19,rc("#EADFD2"));const n=t([".HH.","HSSH",".SS.","WWWW","WWWW","WWWW","WWWW","WWWW","W..W"],{H:rc("hair"),S:rc("skin"),W:rc("white")}),s=t([".HH.","HSSH",".SS.","KwwK","KKKK","KKKK","KKKK","K..K","K..K"],{H:rc("hair"),S:rc("skin"),K:rc("navy2"),w:rc("white")});return a.blit(s,5,9,null),a.blit(n,10,9,null),a.px(4,5,rc("pink")),a.px(14,4,rc("pink")),a.px(9,4,rc("pink2")),a;}case"l_fam":{const a=RX(27,19);a.rect(0,0,27,19,rc("wood2")),a.rect(1,1,25,17,rc("#D6E5E8")),a.rect(1,14,25,4,rc("#A9CF94"));const n=[".HH.","HSSH","SSSS",".SS.","BBBB","BBBB","BBBB","BBBB","b..b"],s=[".HH.","HSSH",".SS.","BBBB","BBBB","b..b"],o=[".HH.","HSSH","HSSH","HSSH","BBBB","BBBB","BBBB","BBBB","b..b"],r=(i,l,c)=>a.blit(rsp(i,{H:"hair",S:"skin",B:c,b:"dark"}),l,17-i.length,null);return r(n,4,rc("navy")),r(o,9,rc("teal")),r(s,15,rc("yellow")),r(s,20,rc("pink")),a;}case"l_map":{const a=RX(28,20);a.rect(0,0,28,20,rc("paper2")),a.rect(1,1,26,18,rc("#A9D4E2"));const n=["......................","..GGG.GG.....GGGG.....",".GGGGGG.....GGGGGGGGG.","..GGGG.....GGGGGGGGGG.","...GG.......GGGGGG.G..","....GG.....GGG.GGG....",".....GG.....GG..GG....","......G......G....GG..",".....GG............G..",".....G......\
..GG......","..............GGG.....","......................"];a.blit(rsp(n,{G:"#86AE72"}),3,3,null);for(const[s,o]of[[8,6],[17,6],[21,9],[9,13]])a.px(s,o,rc("red")),a.px(s,o-1,rc("red2"));return a;}case"l_rocket":return t(["...R...","..RRR..","..WWW..",".WWWWW.",".WBBBW.",".WBGBW.",".WBBBW.",".WWWWW.",".WWWWW.",".WRRRW.",".WWWWW.",".WWWWW.","RWWWWWR","RWWWWWR","R.OYO.R","...Y...","...D...","...D...",".DDDDD.","DDDDDDD"],{R:rc("red"),W:rc("white"),B:rc("blue"),G:rc("glass"),O:rc("orange"),Y:rc("yellow"),D:rc("wood3")});case"l_flag":{const a=RX(14,27);return a.line(3,0,3,23,rc("gold2")),a.px(3,0,rc("gold")),a.rect(4,1,9,7,rc("teal")),a.rect(4,1,9,1,rlite(rc("teal"),.3)),a.px(8,3,rc("yellow")),a.px(7,4,rc("yellow")),a.px(8,4,rc("yellow")),a.px(9,4,rc("yellow")),a.px(8,5,rc("yellow")),a.rect(0,24,8,3,rc("wood3")),a.rect(1,23,6,1,rc("wood2")),a;}case"l_books":return t(["..RRRRRRRRRR....","..RrrrrrrrrR....","...NNNNNNNNNNN..","...NwwwwwwwwwN..",".YYYYYYYYYYYYY..",".YyyyyyyyyyyyY..","TTTTTTTTT\
TTTTTT.","TtttttttttttttT.","..GGGGGGGGGGGG..","..GggggggggggG.."],{R:rc("red"),r:rc("paper"),N:rc("navy"),w:rc("paper"),Y:rc("yellow"),y:rc("paper"),T:rc("teal"),t:rc("paper"),G:rc("green2"),g:rc("paper")});case"l_basket":return t(["....g..g.......","...ggggg..RR...","..OO.ggg.RRRR..",".OOOO.g.RRRRR..","WWWWWWWWWWWWWWW","WwWwWwWwWwWwWwW",".WWWWWWWWWWWWW.",".wWwWwWwWwWwWw.","..WWWWWWWWWWW.."],{g:rc("green"),O:rc("orange"),R:rc("red"),W:rc("#C9A26B"),w:rc("#A9824F")});case"l_rod":{const a=RX(22,48);a.line(2,47,19,0,rc("wood3")),a.line(19,0,21,9,rc("white2")),a.px(21,10,rc("red")),a.disc(6,37,2,rc("grey")),a.px(6,37,rc("dark")),a.rect(9,40,12,8,rc("#C9A26B")),a.rect(9,40,12,1,rc("#A9824F"));for(let n=10;n<21;n+=2)a.rect(n,41,1,7,rc("#A9824F"));return a.rect(13,38,4,2,rc("wood3")),a;}case"l_tools":return t(["......H.......",".....HHH......","......h.......","...KKKKKKK....","..K.......K...","RRRRRRRRRRRRRR","RRRRRRRRRRRRRR","RrrrrrrrrrrrrR","RRRRRRYYRRRRRR","RRRRRRRRRRRRRR"],{H:rc("grey2"),h:rc("wood3"),K:rc("dark"),R:rc("red"),r:rc("red2"),Y:rc("gold")});case"l_kit":return t(["....KKKKK.....","...K.....K....","WWWWWWWWWWWWWW","WWWWWWRRWWWWWW","WWWWWRRRRWWWWW","WWWWWWRRWWWWWW","WwwwwwwwwwwwwW","WWWWWWWWWWWWWW"],{K:rc("dark"),W:rc("white"),w:rc("white2"),R:rc("red")});case"l_pot":return t(["...s....s.....","....s..s......","...s....s.....","......K.......","..KKKKKKKKK...","HMMMMMMMMMMMH.",".MMMMMMMMMMM..",".MmmmmmmmmmM..",".MMMMMMMMMMM..","..MMMMMMMMM..."],{s:rc("white2"),K:rc("dark"),H:rc("dark"),M:rc("grey"),m:rc("grey2")});case"l_laptop":{const a=RX(22,25);return a.rect(4,0,13,9,rc("dark")),a.rect(5,1,11,7,rc("#7FB9CB")),a.rect(6,2,5,1,rc("white")),a.rect(6,4,8,1,rlite(rc("glass2"),.4)),a.rect(2,9,17,2,rc("grey")),a.rect(2,9,17,1,rlite(rc("grey"),.3)),a.rect(0,11,22,2,rc("wood")),a.rect(0,11,22,1,rc("woodhi")),a.rect(2,13,2,12,rc("wood2")),a.rect(18,13,2,12,rc("wood2")),a.rect(16,7,3,4,rc("white")),a;}case"l_camera":{const a=RX(16,30);return a.rect(2,2,12,8,rc("black")),a.rect(2,2,12,1,rc("dark")),a.disc(9,6,3,rc("dark")),a.disc(9,6,2,rc("glass2")),a.px(8,5,rc("white")),a.rect(3,0,4,2,rc("dark")),a.px(12,3,rc("red")),a.line(8,10,8,18,rc("grey2")),a.line(8,18,2,29,rc("grey2")),a.line(8,18,14,29,rc("grey2")),a.line(8,18,8,29,rc("grey2")),a;}case"l_ball":return t(["...WWWW...","..WKKWWW..",".WKKKWWKW.","WWWKWWKKKW","WWWWWWWKWW","WKWWWWWWWW","KKKWWKWWKW",".KWWKKKWW.","..WWWKWW..","...WWWW..."],{W:rc("white"),K:rc("black")});case"l_yarn":return t(["........n.n.....","..RRR...n.n.....",".RrRRR.BBB......",".RRrRRBbBBB.....","WWWWWWWWWWWWWWW.","WwWwWwWwWwWwWwW.",".WWWWWWWWWWWWW..","..WWWWWWWWWWW..."],{R:rc("red"),r:rc("pink"),B:rc("blue"),b:rc("glass"),n:rc("grey2"),W:rc("#C9A26B"),w:rc("#A9824F")});}return null;}
/* ═══ OFFICIAL-END: itemArt ═══ */

/* ═══ OFFICIAL-BEGIN: ITEM_CACHE ═══ */
const ITEM_CACHE={};
/* ═══ OFFICIAL-END: ITEM_CACHE ═══ */

/* ═══ OFFICIAL-BEGIN: itemSprite ═══ */
const itemSprite=e=>e in ITEM_CACHE?ITEM_CACHE[e]:ITEM_CACHE[e]=(()=>{try{return itemArt(e);}catch{return null;}})();
/* ═══ OFFICIAL-END: itemSprite ═══ */

/* ═══ OFFICIAL-BEGIN: PHOTO_CACHE ═══ */
const PHOTO_CACHE=new WeakMap();
/* ═══ OFFICIAL-END: PHOTO_CACHE ═══ */

/* ═══ OFFICIAL-BEGIN: photoWall ═══ */
function photoWall(e){const t=Array.isArray(e)?e:null;if(t&&PHOTO_CACHE.has(t))return PHOTO_CACHE.get(t);const a=RX(28,26),n=pxPalette("light");return[[0,7,15,13,"wood2"],[16,1,12,10,"white"],[16,14,12,11,"dark"]].forEach(([s,o,r,i,l],c)=>{a.rect(s,o,r,i,rc(l)),a.rect(s,o,r,1,rlite(rc(l),.25));const f=r-2,u=i-2,d=e&&e[c];let m=null;if(d)try{m=photoPrint(d,n,f,u);}catch{m=null;}for(let h=0;h<u;h++)for(let g=0;g<f;g++)a.px(s+1+g,o+1+h,m?m[h*f+g]:rc(h<u*.55?"#D7E8EE":"#C6D9B4"));}),t&&PHOTO_CACHE.set(t,a),a;}
/* ═══ OFFICIAL-END: photoWall ═══ */

/* ═══ OFFICIAL-BEGIN: photoPrint ═══ */
function photoPrint(e,t,a,n){const s=pxScene(e,t);let o=PX.W/2;try{const c=pxSceneLayers(e,t);c.people&&(o=(c.people[0]+c.people[1])/2);}catch{}const r=Math.round(Math.max(0,Math.min(PX.W-a*2,o-a))),i=Math.max(0,Math.min(PX.G+3-n*2,PX.G-16)),l=[];for(let c=0;c<n;c++)for(let f=0;f<a;f++)l.push(s.get(r+f*2,i+c*2)||RC.paper);return l;}
/* ═══ OFFICIAL-END: photoPrint ═══ */

/* ═══ OFFICIAL-BEGIN: roomItemSp ═══ */
const roomItemSp=(e,t)=>e==="photos"?photoWall(t&&t.ph):itemSprite(e);
/* ═══ OFFICIAL-END: roomItemSp ═══ */

/* ═══ OFFICIAL-BEGIN: pxRoom ═══ */
function pxRoom(e,t){e=e&&e.it?e:roomDefault([]),t=t||{};const a=new PxR(ROOM.W,ROOM.H),n=lvRand("room"+(t.seed||""));roomWall(a,e.wp,n),roomFloor(a,e.fl,n);const s=a.get(30,70)||RC.cream;roomWindow(a,e.wv,t.cm,s),roomLight(a),a.line(128,2,128,7,RC.dark);for(let h=0;h<4;h++)a.rect(124-h,8+h,9+h*2,1,h?RC.cream:RC.cream2);a.rect(126,12,5,1,rlite(RC.yellow,.4));const o=e.it||{},r=(h,g)=>{const p=o[h],b=p&&roomItemSp(p,t),k=ROOM_SLOTS[h];if(!b||!k)return;const A=k.x+k.w/2;if(h==="R"){a.blit(b,Math.round(122-b.w/2),92,null);return;}if(h[0]==="W"){a.blit(b,Math.round(A-b.w/2),Math.round(13+(26-b.h)/2),RC.ol);return;}const x=Math.round(A-b.w/2),v=ROOM.FB-b.h;for(let w=1;w<b.w-1;w++){const j=a.get(x+w,ROOM.FB);j&&a.px(x+w,ROOM.FB,rdark(j,.18));}a.blit(b,x,v,RC.ol);};for(const h of["W1","W2","W3"])r(h);r("R");for(const h of["A","B","C","D"])r(h);const i=t.cm&&Array.isArray(t.cm.people)?t.cm.people.find(h=>h.role==="me"):null,l=h=>h&&(h.aid==="w"||h.aid==="c")?{aid:h.aid}:{};let c=[Object.assign({role:"me",sex:t.sex==="F"?"F":"M",age:Math.max(18,Math.min(90,t.age==null?40:t.age)),sk:i&&i.sk!=null?i.sk:null},l(i))];e.who==="fam"&&t.cm&&Array.isArray(t.cm.people)&&t.cm.people.length>1&&(c=t.cm.people.slice(0,6).map(h=>Object.assign({role:h.role,sex:h.sex,age:h.age,sk:h.sk!=null?h.sk:null},l(h))));const f=c.map(h=>({p:h,s:chibi(h,e.ot)})),u=2,d=f.reduce((h,g)=>h+g.s.w+u,-u);let m=Math.round(122-d/2);for(const{p:h,s:g}of f){const p=ROOM.PB-g.h+(h.role==="me"?1:0);if(t.live&&h.role==="me"){a.me={s:g,x:m,y:p,aid:!!h.aid},m+=g.w+u;continue;}for(let b=1;b<g.w-1;b++){const k=a.get(m+b,p+g.h);k&&a.px(m+b,p+g.h,rdark(k,.2));}a.blit(g,m,p,RC.ol),m+=g.w+u;}return a;}
/* ═══ OFFICIAL-END: pxRoom ═══ */

/* ═══ OFFICIAL-BEGIN: ROOM_ACT ═══ */
const ROOM_ACT={table:"eat",chair:"sit",plant:"water",clock:"look",bed:"sleep",sofa:"sleep",desk:"read",piano:"play",tv:"watch",bike:"look",shelf:"read",wardrobe:"look",gclock:"look",lamp:"read",xmas:"love",radio:"listen",tank:"watch",bear:"\
love",globe:"think",record:"listen",cake:"eat",bigplant:"water",wshelf:"look",poster:"look",mirror:"look",paint:"look",lights:"love",calendar:"look",rug_round:"sit",rug_stripe:"sit",rug_persian:"sit",photos:"love",e_lamp:"read",e_gramo:"listen",e_sew:"work",e_type:"work",e_dial:"listen",e_najeon:"look",e_yeontan:"warm",e_fan:"look",e_cassette:"listen",e_crt:"watch",e_pc:"work",e_aircon:"look",e_flatv:"watch",e_purifier:"look",l_dog:"love",l_cat:"love",l_guitar:"play",l_easel:"work",l_medal:"love",l_diploma:"love",l_wed:"love",l_fam:"love",l_map:"think",l_rocket:"think",l_flag:"look",l_books:"read",l_basket:"love",l_rod:"look",l_tools:"work",l_kit:"work",l_pot:"eat",l_laptop:"work",l_camera:"look",l_ball:"love",l_yarn:"work",rocking:"sleep",fire:"warm",scope:"think",birdcage:"listen",violin:"play",drum:"play",tea:"eat",chess:"think",bonsai:"water",cactus:"water",suitcase:"think",fruit:"eat",lantern:"look",kite:"look",chime:"listen",quilt:"love",rug_mat:"sit",rug_kilim:"sit"};
/* ═══ OFFICIAL-END: ROOM_ACT ═══ */

/* ═══ OFFICIAL-BEGIN: ROOM_SEAT ═══ */
const ROOM_SEAT={chair:.55,sofa:.5,bed:.45,rocking:.55};
/* ═══ OFFICIAL-END: ROOM_SEAT ═══ */

/* ═══ OFFICIAL-BEGIN: ACT_LOOK ═══ */
const ACT_LOOK={play:["note","navy"],listen:["note","teal"],sleep:["z","blue"],love:["heart","red"],watch:["bang","orange"],think:["dots","dark"],read:["dots","dark"],work:["dots","dark"],water:["","","drop"],eat:["heart","pink","steam"],warm:["","","steam"],look:["",""],sit:["",""]};
/* ═══ OFFICIAL-END: ACT_LOOK ═══ */

/* ═══ OFFICIAL-BEGIN: ROOM_SIGN ═══ */
const ROOM_SIGN={note:["..##.","..#.#","..#..","###..","###.."],z:["####","..#.",".#..","####"],heart:[".#.#.","#####",".###.","..#.."],bang:["#","#","#",".","#"],dots:["#.#.#"]};
/* ═══ OFFICIAL-END: ROOM_SIGN ═══ */

/* ═══ OFFICIAL-BEGIN: roomSpots ═══ */
function roomSpots(e,t){const a=[],n=e&&e.it||{};for(const s of SLOT_IDS){const o=n[s],r=o&&roomItemSp(o,t),i=ROOM_SLOTS[s];if(!r||!i)continue;const l=i.x+i.w/2,c=s==="R"?{x:Math.round(122-r.w/2),y:92,w:r.w,h:r.h}:s[0]==="W"?{x:Math.round(l-r.w/2),y:Math.round(13+(26-r.h)/2),w:r.w,h:r.h}:{x:Math.round(l-r.w/2),y:ROOM.FB-r.h,w:r.w,h:r.h};a.push(Object.assign(c,{id:o,slot:s,cx:s==="R"?122:l,act:ROOM_ACT[o]||"look"}));}return a.push({id:"",slot:"win",x:WIN.x,y:WIN.y,w:WIN.w,h:WIN.h,cx:WIN.x+WIN.w/2,act:"look"}),a;}
/* ═══ OFFICIAL-END: roomSpots ═══ */

/* ═══ OFFICIAL-BEGIN: roomCtxD ═══ */
function roomCtxD(e,t,a){const n=e?memoCover(e,t!==null&&t!==void 0?t:-1,a):-1,s=n>=0?e.frames[n]:null,o=s&&s.m,r=o&&(o.people||[]).find(i=>i.role==="me");return{cm:o||null,sex:e&&e.sex,age:r?r.age:e?e.age:40,seed:e?e.name:"",ph:e?photoMoms(e,a):null};}
/* ═══ OFFICIAL-END: roomCtxD ═══ */

/* ═══ OFFICIAL-BEGIN: roomCtxCard ═══ */
function roomCtxCard(e){const t=e.cm&&(e.cm.people||[]).find(a=>a.role==="me");return{cm:e.cm||null,sex:e.sex,age:t?t.age:e.age,seed:e.name,ph:Array.isArray(e.ph)?e.ph:e.cm?[e.cm]:null};}
/* ═══ OFFICIAL-END: roomCtxCard ═══ */

/* ═══ OFFICIAL-BEGIN: SLOT_BOX ═══ */
const SLOT_BOX={A:[4,50,56,40],B:[64,56,30,34],C:[132,56,28,34],D:[162,38,28,52],R:[86,91,72,14],W1:[70,12,30,28],W2:[112,12,30,28],W3:[156,12,30,28]};
/* ═══ OFFICIAL-END: SLOT_BOX ═══ */

/* ═══ OFFICIAL-BEGIN: ITEM_ERA ═══ */
const ITEM_ERA={e_lamp:[1850,1970],e_gramo:[1900,1955],e_sew:[1890,1985],e_type:[1895,1990],e_dial:[1930,1990],e_najeon:[1965,1995,["KOR","PRK"]],e_yeontan:[1955,1995,["KOR","PRK"]],e_fan:[1955,2010],e_cassette:[1975,2002],e_crt:[1980,2008],e_pc:[1990,2008],e_aircon:[1995,2100,["KOR","CHN","TWN","HKG"]],e_flatv:[2008,2100],e_purifier:[2010,2100]};
/* ═══ OFFICIAL-END: ITEM_ERA ═══ */

/* ═══ OFFICIAL-BEGIN: eraFit ═══ */
function eraFit(e,t){const a=ITEM_ERA[e];if(!a||!t||!(t.by>0)||a[2]&&!a[2].includes(t.iso)&&!a[2].includes(t.where))return!1;const n=Math.max(0,t.age||0),s=n>=25?[t.by+20,t.by+Math.min(n,60)]:[t.by,t.by+n];return Math.min(s[1],a[1])-Math.max(s[0],a[0])>=Math.min(5,s[1]-s[0]);}
/* ═══ OFFICIAL-END: eraFit ═══ */

/* ═══ OFFICIAL-BEGIN: memoCover ═══ */
function memoCover(e,t,a){const n=e&&e.frames||[],s=new Set(a||[]);if(t>=0&&n[t]&&n[t].m&&!s.has(t))return t;let o=-1,r=-1;return n.forEach((i,l)=>{if(!i||!i.m||s.has(l))return;const c=e.strip&&e.strip[i.a]!=null?e.strip[i.a]:50;c>=r&&(r=c,o=l);}),o;}
/* ═══ OFFICIAL-END: memoCover ═══ */

/* ══════════════════════════════════════════════════════════════════════════
 * 以下是我们自己的接线（**不是**官方代码）
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * 画一间房（官方 `pxRoom()` 的薄封装）。
 * @param {object} rm 房间装饰数据（官方 /api/home/room 的 rm：{wp, fl, wv, ot, bgm, who, it}）
 * @param {object} o  房间上下文（官方 `roomCtxCard(c)` 的形状：{cm, sex, age, seed, ph}）
 * @returns {PxR} 192×108
 */
function roomPic(rm, o) {
  return pxRoom(rm, o);
}

/* ═══ OFFICIAL-BEGIN: pxFuneral ═══
 * 官方 raw/bundle.zh-hans.js 21154：葬礼像素画（回顾动画第三幕）。
 * 逐字移植；pxSky / pxCloud / pxBackdrop / pxGround / pxPerson 都是本包
 * 与 shelf.js 里已移植的官方部件；lvRand 也是本包的官方移植。 */
function pxFuneral(m, P, mourners) {
  const R = lvRand(m.seed + 'f'), r = new PxR(PX.W, PX.H), G = PX.G, ax = 96;
  pxSky(r, m, P, R);
  for (let i = 0; i < 2; i++) pxCloud(r, 30 + i * 110 + R() * 20, 12 + Math.round(R() * 8), 18 + Math.round(R() * 10), P, R, false);
  pxBackdrop(r, m, P, R);
  pxGround(r, m, P, R);
  const rel = m.rel || '', muslim = rel === 'M', lamps = rel === 'H' || rel === 'S';
  const flowersOn = !muslim && rel !== 'J', incense = !muslim && rel !== 'C' && rel !== 'J' && (rel === 'B' || m.fl === 'eas');
  const cloth = P.light(P.wall, P.dark ? 0.1 : 0.5), flower = lamps || m.fl === 'sa' ? P.gold : m.fl === 'eas' ? P.light(P.wall, 0.6) : P.light(P.wall, 0.45);
  r.rect(ax - 16, G - 7, 32, 7, P.shade(P.trunk, 0.15)); r.rect(ax - 17, G - 8, 34, 2, cloth); r.rect(ax - 16, G - 6, 32, 1, P.shade(cloth, 0.2));
  if (muslim) {
    const sh = P.light(P.wall, P.dark ? 0.55 : 0.85);
    r.rect(ax - 18, G - 9, 36, 1, P.shade(P.trunk, 0.05));
    r.rect(ax - 13, G - 12, 27, 3, sh); r.disc(ax - 13, G - 11, 2, sh); r.rect(ax - 12, G - 13, 24, 1, P.light(sh, 0.4));
    for (const x of [ax - 8, ax, ax + 8]) r.rect(x, G - 12, 1, 3, P.shade(sh, 0.18));
  } else {
    r.rect(ax - 7, G - 25, 14, 17, P.ol); r.rect(ax - 6, G - 24, 12, 15, P.light(P.wall2, 0.3));
    r.rect(ax - 3, G - 13, 6, 4, P.me); r.disc(ax, G - 17, 2, m.sk != null && P['sk' + m.sk] ? P['sk' + m.sk] : P.skin); r.rect(ax - 2, G - 20, 5, 2, m.old ? P.hairold : P.hair);
    if (lamps) { for (let k = 0; k <= 16; k++) { const y = G - 24 + k; r.px(ax - 8, y, k % 2 ? P.gold : P.accent); r.px(ax + 7, y, k % 2 ? P.accent : P.gold); } for (let k = 0; k < 7; k++) r.px(ax - 6 + k * 2, G - 8, k % 2 ? P.gold : P.accent); }
    else r.line(ax - 7, G - 22, ax - 4, G - 25, P.ol), r.line(ax + 6, G - 22, ax + 3, G - 25, P.ol);
    if (rel === 'C') { r.rect(ax, G - 31, 1, 5, P.ol); r.rect(ax - 1, G - 30, 3, 1, P.ol); }
  }
  if (flowersOn) {
    for (let k = 0; k < 6; k++) { r.disc(ax - 14 + k * 1.5, G - 9 - (k % 2), 1, flower); r.disc(ax + 7 + k * 1.5, G - 9 - (k % 2), 1, flower); }
    for (let k = 0; k < 4; k++) { r.px(ax - 13 + k * 2, G - 8, P.tree2); r.px(ax + 8 + k * 2, G - 8, P.tree2); }
  }
  if (lamps) for (const cx of [ax - 19, ax + 18]) { r.rect(cx - 1, G - 2, 3, 2, P.shade(P.trunk, 0.1)); r.px(cx, G - 3, P.gold); r.px(cx, G - 4, P.sunhi); }
  else if (!muslim) for (const cx of [ax - 19, ax + 18]) { r.rect(cx, G - 6, 1, 6, P.light(P.wall, 0.5)); r.px(cx, G - 7, P.gold); r.px(cx, G - 8, P.sunhi); }
  if (incense) {
    r.rect(ax - 2, G - 7, 5, 2, P.shade(P.metal, 0.1));
    for (const x of [ax - 1, ax, ax + 1]) { r.px(x, G - 8, P.trunk); r.px(x, G - 9, P.trunk); r.px(x, G - 10, P.accent); }
    for (const [dx, dy] of [[1, 12], [2, 14], [4, 16], [5, 18]]) r.px(ax + dx, G - dy, P.smoke);
  }
  P.mourn = m.wm ? P.light(P.wall, P.dark ? 0.45 : 0.8) : P.dark ? P.light(P.ol, 0.28) : P.light(P.ol, 0.16);
  const sprites = mourners.map(p => pxPerson(Object.assign({}, p, { role: 'mourn' }), P));
  const left = sprites.filter((_, i) => i % 2 === 0), right = sprites.filter((_, i) => i % 2 === 1);
  let x = ax - 23; for (const s of left) { x -= s.w; if (x < 2) break; r.blit(s, x, G - s.h, P.ol); x -= 3; }
  x = ax + 23; for (const s of right) { if (x + s.w > PX.W - 2) break; r.blit(s, x, G - s.h, P.ol); x += s.w + 3; }
  return r;
}
/* ═══ OFFICIAL-END: pxFuneral ═══ */

module.exports = {
  PX, ROOM, WIN,
  ROOM_SLOTS, SLOT_IDS, HOME_ITEMS, LIFE_ORDER, PROP_LI,
  itemOf, isLifeItem, haveItem, liOf, roomDefault, cleanRoom, photoMoms, roomOf,
  itemArt, itemSprite, photoWall, roomItemSp,
  ROOM_ACT, ROOM_SEAT, ACT_LOOK, ROOM_SIGN,
  roomWall, roomFloor, pxRoom, roomSpots, roomCtxCard, roomCtxD, memoCover, roomWindow, roomLight,
  SLOT_BOX, ITEM_ERA, eraFit, lvRand, rsp,
  // 窗外实时场景（官方 L844–1250 / L2831 / L3342）
  viewScene, photoPrint, pxScene, pxSceneLayers, pxFuneral,
  roomPic,
};

},
};
const cache = {};
function load(id) { if (!cache[id]) { const module = { exports: {} }; cache[id] = module; factories[id](module, load); } return cache[id].exports; }
export const { pxPalette, drawPxR, PxR, pxSprite } = load("pixel");
export const { pxScene, pxSceneLayers, PX } = load("scene");
