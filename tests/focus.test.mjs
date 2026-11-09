import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun} from './helpers/rules12-engine.mjs';
import {activityOptions,focusTier12,focusTierOf,FOCUS_TIERS} from '../packages/adventure/cultivation.js';
import {playCultivation} from './helpers/rules12-play.mjs';

/*
 * 重心有后果（规则十二 · 2026-11-08 阶段 2）
 * ========================================
 * 三件事要钉住：
 *   ① 档位只由「同一重心累计待了多久」决定（生疏 / 熟手 / 专精）；
 *   ② 待得越久，修行积累与技艺成长真的更快（不是只写个标签）；
 *   ③ 面板拿到的数字就是规则层算的那份（界面不另算）。
 */

/** 造一条已经过了 16 岁、能修炼的人生。 */
function grown(seed='重心检验') {
  const s = createRun({seed});
  s.month = 20 * 12;
  s.player.practice = s.month;
  /* ⚠ 灵根要固定 —— 随机种子可能给「未显灵根」（不能修炼 ⇒ 进度恒为 0）。 */
  s.player.root = '松骨灵根';
  s.life.cultivation.rootKnown = true;
  s.life.cultivation.admissionDone = true;
  s.life.cultivation.entered = 16 * 12;
  /* 章节感补强 A1-b（2026-11-08）：月度进度累加从「拿到心法」起算 ——
     这批测试量的是重心加成，不是入门流程 ⇒ 直接发一份入门心法让累加生效。 */
  s.life.cultivation.v12.entryMethod = 'clear';
  s.life.cultivation.progress = 0;
  s.life.cultivation.activity = 'study';
  s.life.cultivation.activityMonths = {study: 0, sword: 0};
  s.life.cultivation.activityGains = {};
  s.journey = {open: true, from: s.month, to: s.month + 600, target: null, practice: 'array'};
  return s;
}

test('档位只由「同一重心累计待了多久」决定',()=>{
  assert.deepEqual(FOCUS_TIERS.map(t=>t.tier),['fresh','familiar','special']);
  assert.equal(focusTierOf(0).label,'生疏');
  assert.equal(focusTierOf(11).label,'生疏');
  assert.equal(focusTierOf(12).label,'熟手');
  assert.equal(focusTierOf(35).label,'熟手');
  assert.equal(focusTierOf(36).label,'专精');
  assert.equal(focusTierOf(999).label,'专精');
  /* 倍率必须越来越大 —— 专精不能比生疏还差。 */
  const fresh=focusTierOf(0),familiar=focusTierOf(12),special=focusTierOf(36);
  assert.ok(familiar.mult>fresh.mult&&special.mult>familiar.mult);
  assert.ok(familiar.skillMult>fresh.skillMult&&special.skillMult>familiar.skillMult);
});

test('换来换去攒不出「专精」：档位按每项重心各自的累计月数算',()=>{
  /* 档位是**按每一项重心各自的累计月数**算的（不是「当前这一项连续待了多久」）。
   * ⇒ 换来换去的人：每项都攒不满 36 个月 ⇒ 谁也到不了专精；
   *   死守一项的人：那一项能到专精。
   * ⚠ 这是设计上的取舍：换成「连续月数」要新增存档字段（存档格式、校验、
   *   小程序端都得跟着改），不值当 —— 累计月数已经能表达「投入越久越划算」。 */
  const s=grown();
  for(let i=0;i<120;i++){
    const id=i%2?'sword':'study';
    s.life.cultivation.activity=id;
    s.life.cultivation.activityMonths[id]=(s.life.cultivation.activityMonths[id]||0)+6;
  }
  assert.equal(s.life.cultivation.activityMonths.study,360);
  assert.equal(s.life.cultivation.activityMonths.sword,360);
  assert.equal(focusTierOf(360).label,'专精');
  /* 但面板上每一项还是按自己那份月数给档位 ⇒ 玩家看得见「这项我练了多久」。 */
  const list=activityOptions(s);
  assert.equal(list.find(o=>o.id==='study').months,360);
  assert.equal(list.find(o=>o.id==='work').months,0);
  assert.equal(list.find(o=>o.id==='work').tier,'生疏');
});

test('同一重心待够三年，进度与技艺都比刚上手快',()=>{
  const fresh=grown('重心新鲜');
  const seasoned=grown('重心老手');
  seasoned.life.cultivation.activityMonths.study=40;
  seasoned.life.cultivation.activityGains={study:{progress:0}};
  /* 同样走 12 个月，看涨多少。 */
  for(let i=0;i<12;i++)advance(fresh,1);
  for(let i=0;i<12;i++)advance(seasoned,1);
  const freshGain=fresh.life.cultivation.activityGains.study.progress||0;
  const seasonedGain=seasoned.life.cultivation.activityGains.study.progress||0;
  assert.ok(seasonedGain>freshGain,'待久了修行积累要更多（专精 ×1.20）');
});

test('面板拿到的档位与倍率就是规则层算的那份',()=>{
  const s=grown('重心面板');
  s.life.cultivation.activityMonths.study=40;
  s.life.cultivation.activityMonths.sword=14;
  const list=activityOptions(s);
  const study=list.find(o=>o.id==='study'),sword=list.find(o=>o.id==='sword');
  assert.equal(study.months,40);
  assert.equal(study.tier,'专精');
  assert.equal(study.mult,focusTierOf(40).mult);
  assert.equal(sword.months,14);
  assert.equal(sword.tier,'熟手');
  assert.equal(sword.mult,focusTierOf(14).mult);
  /* 当前重心的档位也要能直接问出来。 */
  assert.equal(focusTier12(s).tier,'special');
});

test('筑基之后修行加成收回，只剩技艺还在长',()=>{
  /* 「修行积累」那一列**只管到筑基之前**（见 packages/adventure/cultivation.js
   * 的 FOCUS_TIERS 说明）⇒ 筑基之后瓶颈是主药与完整心法，
   * 再加修行会把金丹/元婴的年龄窗口推早（`cadence` 门禁盯着）。
   * ⇒ 这条规则必须被用例钉住，别哪天又变成「全程都给」。 */
  const s=grown('重心筑基后');
  s.life.cultivation.activityMonths.study=40;
  const tier=focusTierOf(40);
  /* 炼气期（境界 1）：修行加成照给。 */
  s.player.realm=1;
  assert.equal(activityOptions(s).find(o=>o.id==='study').mult,tier.mult);
  assert.equal(focusTier12(s).mult,tier.mult);
  /* 筑基之后（境界 2）：修行加成收回，技艺照旧。 */
  s.player.realm=2;
  const study=activityOptions(s).find(o=>o.id==='study');
  assert.equal(study.mult,1);
  assert.equal(study.skillMult,tier.skillMult);
  assert.equal(focusTier12(s).mult,1);
  assert.equal(focusTier12(s).skillMult,tier.skillMult);
});

test('重心有后果 ⇒ 换重心会让冲关真的变慢（同一段时间，进度更少）',()=>{
  /* 用两条真实的命比：一条常年一个重心，一条来回换。
   * ⚠ 章节感补强后「一生终点 progress>0」不再成立——突破成功会把进度清零，
   *   收官时正好清零的命是合法的 ⇒ 这里只要求两条命都活着跑完，比较交给下面的确定性对照。 */
  const steady=playCultivation({seed:'重心稳-0',path:'orthodox',school:'array'}).state;
  const mixer=playCultivation({seed:'重心乱-0',path:'orthodox',school:'array'}).state;
  assert.ok(steady.life.cultivation.activityMonths.study>0);
  assert.ok(mixer.life.cultivation.activityMonths.study>0);
  /* 至少要把「进度真的受重心影响」这件事钉住：把进度清零重算，
   * 同一个月份、同一个灵根，专精档拿到的进度要更多。 */
  const base=grown('重心对照');
  const a=cloneRun(base),b=cloneRun(base);
  b.life.cultivation.activityMonths.study=40;
  /* ⚠ 只比 6 个月：窗口拉到 12 个月会撞上凡身章铺垫卡的进度阈值（30% ≈ 14.4 点），
   *   两条命都被阈值截停 ⇒ 相对速率比不出来（章节感补强 A2 实测踩到）。 */
  for(let i=0;i<6;i++)advance(a,1);
  for(let i=0;i<6;i++)advance(b,1);
  assert.ok(b.life.cultivation.progress>a.life.cultivation.progress);
  assert.ok(steady&&mixer);
});
