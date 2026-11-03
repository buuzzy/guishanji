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
const { pxRGB, pxMix } = require('../../../art/pixel');

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
