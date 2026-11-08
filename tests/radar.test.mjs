import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRun} from '../packages/adventure/engine.js';
import {mpView} from './helpers/mp-view.mjs';

/**
 * 雷达图门禁（2026-11-07 · T4）
 * ============================================================================
 *
 * 守的是「**雷达只画能力，不画资源**」这条规矩：
 *   以前五根轴是 悟性 / 胆识 / 仁心 / **体力** / 心境 ——
 *   体力是资源（受伤就掉、调养就回），和其余四根能力混在一张图上，
 *   玩家会误以为「体力高 = 这个人强」。
 * ⇒ 现在五轴是 悟性 / 胆识 / 仁心 / 心境 / **体魄**（练出来的筋骨，只增不减）。
 *
 * ⚠ 同时守住两条不能破的：
 *   ① **两份代码必须一样** —— `art/radar.js`（画）与 `bridge/view-model.js`（喂）
 *      各写各的轴表 ⇒ 不比对就会走偏（画出来的图和喂进去的数不是一回事）。
 *   ② **体力不能消失** —— 它出雷达了，但还在页面顶部的状态条里。
 *
 * ⚠ 2026-11-08：网页端已清理 ⇒ 这里守的是**小程序端**（当前唯一的产品端）。
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 装载小程序里的 CommonJS 文件。
 * ⚠ 不能直接 require()：本仓库 package.json 是 `"type": "module"`，
 *   .js 会被当成 ESM ⇒ 文件里的 `module.exports` 直接炸。
 */
function loadCjs(file) {
  const code = readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const req = (id) => loadCjs(path.resolve(path.dirname(file), id));
  const fn = vm.runInThisContext(
    `(function (module, exports, require, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, req, console, globalThis);
  return mod.exports;
}

/** 五根轴的键（两端同一份顺序）。 */
const AXES = ['insight', 'courage', 'empathy', 'mind', 'constitution'];
/** 五根轴的名字。 */
const LABELS = ['悟性', '胆识', '仁心', '心境', '体魄'];
/** 资源（**不是**轴）。 */
const RESOURCE = '体力';

/** 记下每一次 fillText 的假画布。 */
function fakeCanvas(){
  const texts=[];
  return {
    texts,
    clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},
    fillText(t){texts.push(String(t));},
    set fillStyle(v){},get fillStyle(){return '';},
    set strokeStyle(v){},get strokeStyle(){return '';},
    set lineWidth(v){},get lineWidth(){return 0;},
    set font(v){},get font(){return '';},
    set textAlign(v){},get textAlign(){return '';},
  };
}

test('雷达的五轴是悟性 / 胆识 / 仁心 / 心境 / 体魄，体力不在图上（画图与喂图两份代码必须一致）',()=>{
  /* 小程序端：canvas 画的那张。 */
  const mpRadar = loadCjs(path.join(ROOT, 'miniprogram/subpkg/xianxia/art/radar.js'));
  assert.deepEqual(mpRadar.KEYS,AXES,'小程序端雷达的轴顺序不对');
  assert.deepEqual(mpRadar.LABELS,{insight:'悟性',courage:'胆识',empathy:'仁心',mind:'心境',constitution:'体魄'},'小程序端的轴名对不上');
  const canvas=fakeCanvas();
  mpRadar.drawRadar(canvas,{insight:40,courage:50,empathy:60,health:70,mind:30,constitution:45});
  const drawn=canvas.texts.filter(t=>!/[\d.]/.test(t));
  assert.deepEqual(drawn,LABELS,`小程序端画出来的轴名不对（实际 ${drawn.join('、')}）`);
  assert.ok(!canvas.texts.includes(RESOURCE),'小程序端雷达不该再画体力');
  /* 体魄的数要真的画出来（不能画成 0）。 */
  assert.ok(canvas.texts.includes('45.0'),'体魄的数没画出来');

  /* 小程序端的视图模型：喂给雷达的那五轴也必须是同一份。 */
  const mpView = loadCjs(path.join(ROOT, 'miniprogram/subpkg/xianxia/bridge/view-model.js'));
  assert.deepEqual(mpView.ABILITY_KEYS,AXES,'小程序端喂给雷达的轴不对');
  assert.equal(mpView.LABELS.constitution,'体魄','小程序端没有「体魄」这个词');
  assert.equal(mpView.LABELS.health,RESOURCE,'小程序端状态条里的体力还得在');

  /* 旧档没有体魄这个数时不能画崩，也不能凭空造一个数。 */
  const oldCanvas=fakeCanvas();
  mpRadar.drawRadar(oldCanvas,{insight:40,courage:50,empathy:60,health:70,mind:30});
  assert.ok(oldCanvas.texts.includes('体魄'),'旧档也要有体魄这一根轴');
  assert.ok(oldCanvas.texts.includes('0.0'),'旧档的体魄应是 0');
  assert.ok(!oldCanvas.texts.includes(RESOURCE),'旧档的雷达也不该画体力');
});

test('体力出雷达了，但还在页面顶部的状态条里（资源没丢）',()=>{
  /* 小程序端：状态条里也有体力。 */
  const pageModel=readFileSync(path.join(ROOT, 'miniprogram/subpkg/xianxia/bridge/page-model.js'),'utf8');
  assert.ok(/k:\s*'health',\s*n:\s*'体力'/.test(pageModel),'小程序端的状态条里没有体力');

  /* 说法也要一致：雷达下面那句话要说清「体力在状态条里」。 */
  const view=readFileSync(path.join(ROOT, 'miniprogram/subpkg/xianxia/bridge/view-model.js'),'utf8');
  assert.ok(view.includes('页面顶部的状态条里'),'小程序端没有说清体力去了哪儿');
  /* 且这句话是**当场生成出来**的，不只是写在源码里。 */
  const hint=mpView.practice(createRun({seed:'雷达校验',rulesVersion:12})).radarHint;
  assert.ok(hint.includes('页面顶部的状态条里'),'雷达下面那句话没生成出来');
  assert.ok(!hint.includes(RESOURCE+'在图上'),'雷达下面那句话不该说体力在图上');
});
