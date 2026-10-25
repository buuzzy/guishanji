import { visualNoise } from '../core/random.js';
import { ageOf, apparentAge, calendar, lifeTitle, personAge } from '../core/state.js';
import { REGIONS, REALMS, regionById } from '../../content/world.js';

const W = 480, H = 196;
const cache = new Map();
const color = { jade: '#537e6d', ink: '#344f4b', paper: '#f7f1df', gold: '#cfac6a', water: '#94b6b0' };
const rect = (ctx, x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function path(ctx, points, fill) { ctx.fillStyle = fill; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
function circle(ctx, x, y, radius, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
function mountain(ctx, seed, y, amplitude, fill, shift = 0, width = W) {
  const points = [[0, H]];
  for (let x = 0; x <= width + 4; x += 4) {
    const height = Math.sin(x / 74 + shift) * amplitude * 0.48 + Math.sin(x / 29 + shift * 2) * amplitude * 0.25 + visualNoise(seed, x + shift * 81) * 6;
    points.push([x, Math.round(y - height)], [x + 4, Math.round(y - height)]);
  }
  points.push([width, H]); path(ctx, points, fill);
}
function pine(ctx, x, y, size, tint = '#547866') {
  rect(ctx, x - 1, y - size * 0.3, 2, size * 0.35, '#68735b');
  for (let i = 0; i < 4; i++) path(ctx, [[x, y - size + i * size * 0.16], [x - size * (0.18 + i * 0.05), y - size * (0.5 - i * 0.12)], [x + size * (0.18 + i * 0.05), y - size * (0.5 - i * 0.12)]], tint);
}
function tree(ctx, x, y, size, seed, autumn = false) {
  rect(ctx, x - 1, y - size * 0.5, 3, size * 0.52, '#7d7759');
  const shades = autumn ? ['#b89b62', '#a88a59', '#d1bb78'] : ['#64866c', '#78946d', '#91a37a'];
  for (let i = 0; i < 9; i++) rect(ctx, x - size * 0.55 + visualNoise(seed, i + x) * size, y - size + visualNoise(seed, i + y) * size * 0.5, size * 0.42, size * 0.26, shades[i % 3]);
}
function house(ctx, x, y, style = 'plain', realm = 0, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const walls = style === 'stone' ? '#b1aaa0' : style === 'cloud' ? '#e4e0ca' : '#d4bc8d';
  rect(ctx, -28, -24, 56, 28, walls); rect(ctx, -31, 2, 62, 4, '#85765c');
  path(ctx, [[-37, -25], [-22, -30], [0, -45], [24, -30], [37, -25]], style === 'bamboo' ? '#71816a' : realm > 1 || style === 'cloud' ? '#637e76' : '#8e8064');
  rect(ctx, -38, -25, 76, 3, '#6b725d');
  rect(ctx, -5, -15, 11, 20, '#776b52'); rect(ctx, -4, -14, 4, 19, '#8b7a58');
  for (const vx of [-21, 13]) { rect(ctx, vx, -16, 9, 9, '#ecd6a1'); rect(ctx, vx + 4, -16, 1, 9, '#93815e'); rect(ctx, vx, -12, 9, 1, '#93815e'); }
  if (style === 'cloud' || realm >= 3) { rect(ctx, -43, 4, 86, 4, '#9bac9b'); rect(ctx, -47, 8, 94, 2, '#bec8b0'); }
  if (style === 'bamboo') { pine(ctx, -45, 4, 33, '#71865c'); pine(ctx, 47, 4, 24, '#82956b'); }
  ctx.restore();
}

function baseScenery(state, dark, width = W) {
  const W = width;
  const region = regionById(state.player.location), season = calendar(state).season;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'), snow = region.biome === 'snow' || season === '冬';
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, dark ? '#253d45' : snow ? '#d8e5de' : '#e8e6d1');
  gradient.addColorStop(1, dark ? '#547267' : '#f2e9ce'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
  circle(ctx, W - 106, 35, 18, dark ? '#e2dcb7' : '#f4d79d');
  if (dark) circle(ctx, W - 115, 29, 16, '#2b4147');
  mountain(ctx, state.seed, 77, 42, dark ? '#526b6a' : '#bbc8b7', 2.1, W);
  mountain(ctx, state.seed, 103, 43, dark ? '#3f6260' : '#a1b8a6', 0.3, W);
  rect(ctx, 0, 99, W, 4, dark ? '#74908325' : '#f5f0d340');
  mountain(ctx, state.seed, 136, 47, dark ? '#35594f' : '#84a68c', 4, W);
  if (region.biome === 'coast') {
    rect(ctx, 0, 124, W, 72, dark ? '#426968' : '#a3beb3');
    for (let y = 130; y < H; y += 7) for (let x = 0; x < W; x += 21) if (visualNoise(state.seed, x * y) > 0.6) rect(ctx, x, y, 12, 1, dark ? '#729586' : '#cbd6bb');
    path(ctx, [[0, 151], [111, 148], [200, 165], [W, 170], [W, H], [0, H]], dark ? '#5e7058' : '#b2b587');
    rect(ctx, 90, 153, 55, 3, '#8f8060'); rect(ctx, 97, 154, 3, 16, '#887a5c'); rect(ctx, 133, 154, 3, 16, '#887a5c');
    path(ctx, [[315, 135], [344, 135], [339, 140], [321, 140]], '#807a5e'); rect(ctx, 328, 110, 2, 28, '#958b6a'); path(ctx, [[327, 110], [327, 132], [311, 130]], '#e8dfc0');
  } else {
    path(ctx, [[0, 158], [115, 146], [220, 164], [W, 144], [W, H], [0, H]], dark ? '#5f7658' : snow ? '#d0d7bc' : '#a6b17f');
    if (region.biome === 'valley') {
      path(ctx, [[163, 141], [151, 158], [168, 170], [139, H], [197, H], [192, 170], [171, 157], [175, 141]], dark ? '#6f9180' : '#bacbb5');
      for (let i = 0; i < 5; i++) { rect(ctx, 8 + i * 15, 171 - i * 3, 68, 2, '#7f9967'); rect(ctx, 260 + i * 23, 171 + i * 4, 98, 1, '#95a56d'); }
    } else {
      path(ctx, [[180, 142], [204, 145], [254, H], [184, H], [188, 170]], snow ? '#e0ddc7' : '#c4bc95');
    }
  }
  if (region.biome === 'rock') {
    for (let i = 0; i < 8; i++) { const x = 20 + visualNoise(state.seed, i) * 450, y = 155 + visualNoise(state.seed, i + 20) * 36; rect(ctx, x, y, 8 + i % 3 * 3, 4, '#9c9b7c'); }
    rect(ctx, 102, 117, 9, 40, '#afa889'); rect(ctx, 154, 117, 9, 40, '#afa889'); rect(ctx, 100, 115, 65, 8, '#7d8c74'); path(ctx, [[95, 115], [132, 99], [169, 115]], '#677e71');
  }
  const autumn = season === '秋';
  for (let i = 0; i < 18; i++) {
    const x = i < 9 ? 10 + i * 14 : W - 106 + (i - 9) * 11;
    const y = 146 + visualNoise(state.seed, i + 331) * 28;
    if (region.biome === 'valley' || region.biome === 'coast') tree(ctx, x, y, 17 + visualNoise(state.seed, i) * 17, state.seed, autumn);
    else pine(ctx, x, y, 21 + visualNoise(state.seed, i) * 23, snow ? '#6b8b7b' : '#537e69');
  }
  house(ctx, region.biome === 'coast' ? 66 : W - 161, 158, state.player.homeStyle, state.player.realm, 0.86);
  if (region.biome === 'snow') {
    for (let i = 0; i < 75; i++) rect(ctx, visualNoise(state.seed, i + 22) * W, 142 + visualNoise(state.seed, i + 33) * 53, 3, 1, '#edead6');
  }
  rect(ctx, 0, 192, W, 4, dark ? '#3c5745' : '#83956b');
  return canvas;
}

export function character(ctx, x, y, properties = {}) {
  const age = properties.age ?? 24, realm = properties.realm || 0, seed = properties.seed || 'person';
  const child = age < 12, baby = age < 3, height = baby ? 10 : child ? 18 : 28;
  const robe = properties.robe || (realm > 3 ? '#d2ddcc' : realm ? '#719d8e' : ['#b69472', '#a9a885', '#8b9f91'][Math.floor(visualNoise(seed, 2) * 3)]);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  if (properties.halo) {
    ctx.strokeStyle = '#d9d59b85'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, -height * 0.44, height * 0.58, height * 0.64, 0, 0, Math.PI * 2); ctx.stroke();
  }
  rect(ctx, -4, 0, 9, 2, '#46644b35');
  const seated = properties.seated, top = -height + (seated ? 7 : 0);
  if (baby) { rect(ctx, -4, -8, 8, 7, '#d6c39d'); rect(ctx, -2, -10, 4, 4, '#d5b28b'); ctx.restore(); return; }
  rect(ctx, -3, top + 3, 7, 7, '#dbc096');
  rect(ctx, -3, top, 7, 4, age > 55 ? '#cbc5ab' : '#475249'); rect(ctx, 3, top + 2, 2, 6, age > 55 ? '#cbc5ab' : '#475249');
  if (realm) rect(ctx, 1, top - 2, 2, 3, '#53645a');
  rect(ctx, -4, top + 10, 9, seated ? 10 : height - 14, robe);
  rect(ctx, -5, top + 11, 2, 7, robe); rect(ctx, 5, top + 11, 2, 7, robe);
  rect(ctx, -4, top + 16, 9, 2, '#5e7261');
  const walk = properties.walk ? Math.sin(properties.time / 180) > 0 : false;
  if (seated) { rect(ctx, -7, -4, 15, 3, robe); }
  else { rect(ctx, -3, -4, 3, 4 + (walk ? -1 : 0), '#5b6251'); rect(ctx, 2, -4, 3, 4 + (walk ? 1 : 0), '#5b6251'); }
  if (properties.sword) { rect(ctx, -7, top + 7, 2, 19, '#717f78'); rect(ctx, -9, top + 10, 6, 2, '#a09c72'); }
  ctx.restore();
}

function canvasContext(canvas, w, h) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; return ctx;
}

/** Pure projection. Pixel effects use their own hash and never consume game RNG. */
export function renderScene(canvas, state, { time = 0, dark = false, reduced = false, wide = false } = {}) {
  const width = wide ? 640 : W, shift = width - W;
  const ctx = canvasContext(canvas, width, H), date = calendar(state), region = regionById(state.player.location);
  const key = [state.seed, region.id, date.season, state.player.homeStyle, state.player.realm, dark, width].join(':');
  if (!cache.has(key)) { if (cache.size > 16) cache.delete(cache.keys().next().value); cache.set(key, baseScenery(state, dark, width)); }
  ctx.drawImage(cache.get(key), 0, 0);
  const phase = reduced ? 0 : time;
  for (let i = 0; i < 4; i++) {
    const x = (i * 136 + 16 + Math.floor(phase / 1300)) % (width + 90) - 60;
    rect(ctx, x, 22 + i % 2 * 14, 49, 3, dark ? '#9bb19b27' : '#fff9e755'); rect(ctx, x + 8, 19 + i % 2 * 14, 29, 3, dark ? '#9bb19b18' : '#fff9e735');
  }
  const p = state.player, seated = !!p.retreat || p.focus === 'cultivate';
  const posX = (p.travel ? 180 + (state.month - p.travel.departure) * 13 : seated ? 237 : p.focus === 'craft' ? 253 : 226) + shift;
  character(ctx, posX, 180, { age: apparentAge(state), realm: p.realm, seed: state.seed, sword: p.inventory.sword, seated, halo: p.realm >= 2 && seated, walk: p.focus === 'explore' || !!p.travel, time: phase });
  if (p.focus === 'craft') { rect(ctx, 239 + shift, 169, 30, 3, '#8c7c58'); rect(ctx, 242 + shift, 172, 3, 8, '#8c7c58'); rect(ctx, 264 + shift, 172, 3, 8, '#8c7c58'); rect(ctx, 254 + shift, 164, 7, 5, '#a9af82'); }
  const local = state.people.filter(person => person.alive && person.location === p.location && ['mother', 'father', 'guardian', 'partner', 'child', 'friend'].includes(person.relation)).slice(0, 3);
  local.forEach((person, i) => character(ctx, 296 + shift + i * 15, 179 + i % 2 * 3, { age: personAge(state, person), realm: person.realm, seed: person.id }));
  if (p.inventory.lamp) { rect(ctx, 280 + shift, 168, 3, 9, '#8a8064'); rect(ctx, 278 + shift, 165, 7, 5, '#dbb873'); rect(ctx, 280 + shift, 167, 3, 2, '#f6d595'); }
  if (state.world.weather === '细雨') {
    for (let i = 0; i < 45; i++) { const x = visualNoise(state.seed, i + 911) * width, y = (visualNoise(state.seed, i + 521) * H + phase / 55) % H; rect(ctx, x, y, 1, 3, dark ? '#c8d6c335' : '#e8eed660'); }
  }
  if (p.realm >= 2 && seated) for (let i = 0; i < 12; i++) {
    const theta = phase / 2400 + i * Math.PI * 2 / 12;
    rect(ctx, posX + Math.cos(theta) * 22, 163 + Math.sin(theta) * 11, 1, 1, '#ebdf9f');
  }
  if (state.phase === 'ended') { ctx.fillStyle = '#d5ccaa1c'; ctx.fillRect(0, 0, width, H); }
}

export function renderPortrait(canvas, state, person = null) {
  const ctx = canvasContext(canvas, 48, 48); ctx.clearRect(0, 0, 48, 48); rect(ctx, 0, 0, 48, 48, '#dfe4d1');
  rect(ctx, 0, 35, 48, 13, '#bdcbb2'); ctx.save(); ctx.translate(24, 42); ctx.scale(1.2, 1.2);
  character(ctx, 0, 0, { seed: person?.id || state.seed, age: person ? personAge(state, person) : apparentAge(state), realm: person?.realm ?? state.player.realm }); ctx.restore();
}

export function renderMap(canvas, state, dark = false) {
  const ctx = canvasContext(canvas, 640, 398); rect(ctx, 0, 0, 640, 398, dark ? '#34483f' : '#e9e6cc');
  for (let i = 0; i < 220; i++) {
    const x = visualNoise('map', i) * 640, y = visualNoise('map', i + 910) * 398;
    const h = 8 + visualNoise('map', i + 321) * 16;
    path(ctx, [[x - 10, y + h / 3], [x, y - h], [x + 13, y + h / 3]], dark ? '#67836b18' : '#8ea17930');
  }
  ctx.strokeStyle = dark ? '#96ad9170' : '#bdcbaa'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(180, 0); ctx.bezierCurveTo(300, 80, 55, 198, 245, 280); ctx.bezierCurveTo(290, 310, 403, 268, 590, 398); ctx.stroke();
  ctx.strokeStyle = dark ? '#c3c2a850' : '#adab8680'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
  const lines = [['hegu', 'landu'], ['hegu', 'zhaoshi'], ['zhaoshi', 'landu'], ['zhaoshi', 'wenxue'], ['zhaoshi', 'mulan']];
  for (const [a, b] of lines) { const from = regionById(a), to = regionById(b); ctx.beginPath(); ctx.moveTo(from.x * 6.4, from.y * 3.98); ctx.lineTo(to.x * 6.4, to.y * 3.98); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const region of REGIONS) {
    const x = region.x * 6.4, y = region.y * 3.98, current = state.player.location === region.id;
    circle(ctx, x, y, current ? 14 : 9, current ? '#6d967e' : '#b5ba98'); circle(ctx, x, y, 4, '#f2edd4');
    ctx.fillStyle = dark ? '#e5e6ce' : '#466557'; ctx.font = '600 18px "Songti SC", "SimSun", serif'; ctx.textAlign = 'center'; ctx.fillText(region.name, x, y + 33);
    ctx.fillStyle = dark ? '#a8bba3' : '#78846a'; ctx.font = '11px sans-serif'; ctx.fillText(current ? '你在此处' : state.player.visited.includes(region.id) ? '曾经走过' : '尚未到访', x, y + 49);
  }
  ctx.textAlign = 'left';
  if (state.player.travel) {
    const from = regionById(state.player.travel.from), to = regionById(state.player.travel.to);
    const ratio = (state.month - state.player.travel.departure) / (state.player.travel.arrival - state.player.travel.departure);
    circle(ctx, (from.x + (to.x - from.x) * ratio) * 6.4, (from.y + (to.y - from.y) * ratio) * 3.98, 5, '#c1935b');
  }
}

export function renderHome(canvas, state) {
  const ctx = canvasContext(canvas, 360, 180), style = state.player.homeStyle;
  rect(ctx, 0, 0, 360, 180, '#e9e3ce'); rect(ctx, 22, 20, 316, 138, style === 'stone' ? '#bcb9a6' : style === 'cloud' ? '#d4ddd0' : '#ccbc97');
  for (let x = 25; x < 337; x += 20) rect(ctx, x, 20, 1, 140, '#8f957b22');
  rect(ctx, 22, 139, 316, 20, '#b8b18a'); rect(ctx, 31, 31, 72, 56, '#819b88'); rect(ctx, 34, 34, 66, 50, '#bdcbbb');
  pine(ctx, 68, 84, 38); rect(ctx, 66, 31, 2, 56, '#b09f7a'); rect(ctx, 31, 58, 72, 2, '#b09f7a');
  rect(ctx, 243, 35, 70, 66, '#95845f');
  for (let y = 42; y < 92; y += 18) { rect(ctx, 246, y, 64, 2, '#bba579'); for (let x = 251; x < 307; x += 10) rect(ctx, x, y + 3, 7, 12, ['#a9b697', '#c5b681', '#869d8b'][Math.floor(x / 10) % 3]); }
  rect(ctx, 132, 110, 71, 7, '#89795b'); rect(ctx, 139, 117, 5, 21, '#89795b'); rect(ctx, 192, 117, 5, 21, '#89795b');
  rect(ctx, 260, 120, 55, 18, '#a99570'); rect(ctx, 263, 122, 49, 13, '#d0c09a');
  if (state.player.inventory.lamp) { rect(ctx, 164, 96, 3, 13, '#8b815f'); rect(ctx, 160, 92, 11, 8, '#e2bb75'); circle(ctx, 165, 96, 13, '#efd78a22'); }
  if (state.player.inventory.book) { rect(ctx, 143, 104, 13, 5, '#758f7b'); rect(ctx, 145, 104, 9, 1, '#d9d6b5'); }
  if (state.player.inventory.sword) { rect(ctx, 229, 67, 3, 61, '#7f9790'); rect(ctx, 223, 84, 15, 4, '#b8a16c'); }
  character(ctx, 114, 142, { age: apparentAge(state), realm: state.player.realm, seed: state.seed, seated: !!state.player.retreat });
  const local = state.people.filter(person => person.alive && person.location === state.player.location && ['partner', 'child', 'mother', 'father', 'guardian'].includes(person.relation)).slice(0, 2);
  local.forEach((person, i) => character(ctx, 218 + i * 27, 146, { age: personAge(state, person), realm: person.realm, seed: person.id }));
}

function wrapped(ctx, text, x, y, width, lineHeight, maxLines = 20) {
  let line = '', lines = 0;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > width) { ctx.fillText(line, x, y + lines++ * lineHeight); line = ch; if (lines >= maxLines) return y + lines * lineHeight; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, y + lines++ * lineHeight);
  return y + lines * lineHeight;
}

export function renderShareCard(canvas, state) {
  const ctx = canvasContext(canvas, 960, 1160); rect(ctx, 0, 0, 960, 1160, '#f3efdf');
  ctx.strokeStyle = '#bbc7b0'; ctx.lineWidth = 2; ctx.strokeRect(28, 28, 904, 1104);
  ctx.textAlign = 'left'; ctx.fillStyle = '#7a8870'; ctx.font = '20px sans-serif'; ctx.fillText('山 海 一 生   ·   此 生 留 影', 66, 89);
  ctx.fillStyle = color.ink; ctx.font = '600 66px "Songti SC", "SimSun", serif'; ctx.fillText(state.player.name, 65, 189);
  ctx.font = '24px sans-serif'; ctx.fillStyle = '#6b7b64'; ctx.fillText(state.birth.origin + '  /  ' + state.birth.region + '  /  ' + state.birth.root, 67, 239);
  const scene = document.createElement('canvas'); renderScene(scene, state, { reduced: true }); ctx.drawImage(scene, 0, 295, 960, 392);
  ctx.fillStyle = color.ink; ctx.font = '600 36px "Songti SC", "SimSun", serif'; ctx.fillText(lifeTitle(state), 67, 764);
  ctx.fillStyle = '#7a866c'; ctx.font = '23px sans-serif'; ctx.fillText(ageOf(state) + ' 岁  ·  ' + REALMS[state.player.realm].name + '  ·  ' + state.choices.length + ' 次抉择  ·  ' + state.player.visited.length + ' 处山河', 67, 813);
  ctx.fillStyle = '#596c58'; ctx.font = '25px "Songti SC", "SimSun", serif';
  wrapped(ctx, state.ending?.subtitle || '山外的路很长，眼前也有人为你留灯。此生正在慢慢展开。', 67, 881, 820, 42, 3);
  ctx.strokeStyle = '#ccd1bd'; ctx.beginPath(); ctx.moveTo(67, 1040); ctx.lineTo(888, 1040); ctx.stroke();
  ctx.fillStyle = '#8b917e'; ctx.font = '17px sans-serif'; ctx.fillText('原创修仙人生模拟器  /  ' + calendar(state).year + ' 年 ' + calendar(state).month + ' 月', 67, 1085);
  rect(ctx, 824, 161, 60, 60, '#a7776040'); ctx.fillStyle = '#a16c52'; ctx.font = '27px "SimSun", serif'; ctx.fillText(state.ending?.seal || '此生', 826, 201);
}

export function renderCurve(canvas, state, field = 'realm') {
  const ctx = canvasContext(canvas, 640, 220); ctx.clearRect(0, 0, 640, 220);
  const years = [{ month: 0, realm: 0, health: 88, mind: 72, stones: 0, craft: 0 }, ...state.years];
  const maxX = Math.max(12, state.month), maxY = field === 'realm' ? 5 : field === 'stones' ? Math.max(1, ...years.map(year => year.stones)) : 100;
  ctx.textAlign = 'right'; ctx.font = '12px sans-serif'; ctx.fillStyle = '#829076'; ctx.strokeStyle = '#acb79b35';
  for (let i = 0; i <= 4; i++) { const y = 183 - i * 38; ctx.beginPath(); ctx.moveTo(47, y); ctx.lineTo(622, y); ctx.stroke(); ctx.fillText(Math.round(maxY * i / 4), 37, y + 4); }
  ctx.strokeStyle = '#66927b'; ctx.lineWidth = 2; ctx.beginPath();
  years.forEach((point, i) => { const x = 48 + point.month / maxX * 572, y = 183 - point[field] / maxY * 152; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillText('0 岁', 48, 207); ctx.textAlign = 'right'; ctx.fillText(ageOf(state) + ' 岁', 623, 207); ctx.textAlign = 'left';
}
