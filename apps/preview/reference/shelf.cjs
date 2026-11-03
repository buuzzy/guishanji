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
const { PxR, pxSprite, pxMix, pxRGB, pxPalette, ART } = require('../../../art/pixel');

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
