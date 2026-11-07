/**
 * 发卡闸的单元测试 —— 密度、冷却、阶段三道闸
 * ============================================================================
 *
 * 为什么要有这个测试
 * ------------------
 * 三道闸是**护栏**：今天的内容本来就达标（日常卡最挤 10 年 4 张），
 * 所以闸在正式跑里**很少真的拦下什么** ⇒ 光看「跑一遍没报错」证明不了它有用。
 *
 * ⇒ 这个测试用**造出来的状态**逐条证明：
 *   · 密度闸真的会拦（塞够日常卡 ⇒ 拦得住）；
 *   · 冷却闸真的会拦（同一张卡 60 个月内再来 ⇒ 拦得住）；
 *   · 阶段闸真的会拦（玩家不在它该出现的阶段 ⇒ 拦得住）；
 *   · 人生节点（突破卡、长线卡、后续卡）**永远不被拦**；
 *   · 闸的口径与指标审计的规格一致（密度 5/3、冷却 60 个月）。
 *
 * ⚠ 反向验证：这些断言自己也要经得起「注入坏值」——
 *   谁把闸改松了（上限调大、冷却缩短），这个测试立刻报红。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allowDaily, blockedReason, isMilestone, dailyCount, densityAllows,
  cooldownAllows, titleAllows, stageAllows, currentStage,
  DENSITY_MAX_10Y, DENSITY_MAX_5Y, COOLDOWN_MONTHS,
} from '../packages/adventure/gates.js';
import {SPEC} from '../packages/adventure/gates.js';

/**
 * 造一条最小的人生状态（够闸判断就行）。
 * @param {object} opts 月份、境界、已有抉择、已有旁白
 */
function makeState(opts = {}) {
  const month = opts.month ?? 300;
  const decisions = [];
  for (const d of opts.decisions || []) {
    decisions.push({event: d.event, choice: 'x', month: d.month, success: true});
  }
  const journal = [];
  for (const j of opts.journal || []) {
    journal.push({id: journal.length + 1, month: j.month, title: j.title, body: '', automatic: true});
  }
  return {
    month,
    birth: {startAge: 0},
    player: {realm: opts.realm ?? 1},
    life: {cultivation: {rulesVersion: 12}},
    decisions,
    journal,
  };
}

/* ── 豁免：人生节点永远不被拦 ──────────────────────────────────────── */

test('人生节点不受三道闸限制', () => {
  /* 密度已经爆表、冷却期没过、阶段也不对 —— 突破卡照样发。 */
  const state = makeState({
    month: 300,
    realm: 3,
    decisions: [
      {event: 'child_school', month: 290},
      {event: 'child_caravan', month: 280},
      {event: 'child_friend', month: 270},
      {event: 'child_relic', month: 260},
      {event: 'child_secret', month: 250},
      {event: 'child_teacher', month: 240},
      {event: 'breakthrough_1_0', month: 295},
    ],
  });
  assert.equal(isMilestone('breakthrough_1_0'), true);
  assert.equal(isMilestone('sect_repair_0'), true);
  assert.equal(isMilestone('echo_teacher_visit'), true);
  assert.equal(isMilestone('network_method'), true);
  assert.equal(isMilestone('r12_direction_0'), true);
  assert.equal(isMilestone('child_teacher'), false);
  assert.equal(allowDaily(state, 'breakthrough_1_0'), true, '突破卡不该被拦');
  assert.equal(allowDaily(state, 'garden_accident'), false, '日常卡该被拦（密度已满）');
});

/* ── 密度闸 ────────────────────────────────────────────────────────── */

test('密度闸：日常卡每 10 年不超过 5 张、每 5 年不超过 3 张', () => {
  /* 刚好卡在上限之内：十年里 4 张、五年里 2 张 ⇒ 还能再发一张（发完正好到 5 / 3）。 */
  const ok = makeState({
    month: 300,
    decisions: [
      {event: 'child_school', month: 295},
      {event: 'child_caravan', month: 285},
      {event: 'child_friend', month: 195},
      {event: 'child_relic', month: 185},
    ],
  });
  assert.equal(dailyCount(ok, 120), 4);
  assert.equal(dailyCount(ok, 60), 2);
  assert.equal(densityAllows(ok), true);
  assert.equal(allowDaily(ok, 'garden_accident'), true);

  /* 再加一张（十年内）⇒ 到 5 张 ⇒ 十年窗口满了 ⇒ 拦。 */
  const full = makeState({
    month: 300,
    decisions: [
      {event: 'child_school', month: 295},
      {event: 'child_caravan', month: 285},
      {event: 'child_friend', month: 195},
      {event: 'child_relic', month: 185},
      {event: 'child_secret', month: 250},
    ],
  });
  assert.equal(dailyCount(full, 120), 5);
  assert.equal(densityAllows(full), false, '十年窗口满 5 张就该拦');
  assert.equal(allowDaily(full, 'garden_accident'), false);
  assert.match(blockedReason(full, 'garden_accident'), /太密了/);

  /* 五年窗口更严：3 张就满。 */
  const five = makeState({
    month: 300,
    decisions: [
      {event: 'child_school', month: 295},
      {event: 'child_caravan', month: 290},
      {event: 'child_friend', month: 285},
    ],
  });
  assert.equal(dailyCount(five, 60), 3);
  assert.equal(densityAllows(five), false, '五年窗口满 3 张就该拦');

  /* 超出窗口的老卡不算数。 */
  const old = makeState({
    month: 300,
    decisions: [
      {event: 'child_school', month: 100},
      {event: 'child_caravan', month: 110},
      {event: 'child_friend', month: 120},
    ],
  });
  assert.equal(dailyCount(old, 120), 0);
  assert.equal(densityAllows(old), true);
});

test('密度闸：人生节点不占日常卡的额度', () => {
  const state = makeState({
    month: 300,
    decisions: [
      {event: 'breakthrough_1_0', month: 295},
      {event: 'breakthrough_2_0', month: 290},
      {event: 'sect_repair_0', month: 285},
      {event: 'echo_teacher_visit', month: 280},
      {event: 'network_method', month: 275},
    ],
  });
  assert.equal(dailyCount(state, 120), 0, '人生节点不该计入密度');
  assert.equal(densityAllows(state), true);
});

/* ── 冷却闸 ────────────────────────────────────────────────────────── */

test('冷却闸：同一张卡 60 个月内不来第二遍', () => {
  const state = makeState({month: 300, decisions: [{event: 'r12_sect_clue', month: 280}]});
  assert.equal(cooldownAllows(state, 'r12_sect_clue'), false);
  assert.equal(allowDaily(state, 'r12_sect_clue'), false);
  assert.equal(cooldownAllows(state, 'root_review'), true);

  const past = makeState({month: 300, decisions: [{event: 'r12_sect_clue', month: 300 - COOLDOWN_MONTHS - 1}]});
  assert.equal(cooldownAllows(past, 'r12_sect_clue'), true, '过了冷却期就该放行');
});

test('冷却闸：同一句旁白 60 个月内不说第二遍', () => {
  const state = makeState({month: 300, journal: [{title: '石室里的修炼', month: 280}]});
  assert.equal(titleAllows(state, '石室里的修炼'), false);
  assert.equal(titleAllows(state, '另一句旁白'), true);
  const past = makeState({month: 300, journal: [{title: '石室里的修炼', month: 300 - COOLDOWN_MONTHS - 1}]});
  assert.equal(titleAllows(past, '石室里的修炼'), true);
});

/* ── 阶段闸 ────────────────────────────────────────────────────────── */

test('阶段闸：玩家不在它该出现的阶段就不发', () => {
  /* 幼年卡（0–15 岁）在 30 岁的人身上 ⇒ 拦。 */
  const grown = makeState({month: 30 * 12});
  assert.equal(currentStage(grown), 'entry');
  assert.equal(stageAllows(grown, 'child_teacher'), false);
  assert.equal(allowDaily(grown, 'child_teacher'), false);
  assert.match(blockedReason(grown, 'child_teacher'), /阶段/);

  /* 同一个玩家：成年人的卡照发。 */
  const adult = makeState({month: 30 * 12});
  assert.equal(stageAllows(adult, 'root_review'), true);

  /* 幼年人在幼年 ⇒ 童年卡放行。 */
  const kid = makeState({month: 8 * 12});
  assert.equal(currentStage(kid), 'child');
  assert.equal(stageAllows(kid, 'child_teacher'), true);
  assert.equal(allowDaily(kid, 'child_teacher'), true);
});

test('阶段闸：境界段不匹配也不发', () => {
  /* 灵根复核只在炼气前后（realm 0–1）。 */
  assert.equal(stageAllows(makeState({realm: 0}), 'root_review'), true);
  assert.equal(stageAllows(makeState({realm: 1}), 'root_review'), true);
  assert.equal(stageAllows(makeState({realm: 3}), 'root_review'), false);
});

/* ── 闸与指标审计的规格必须一致 ────────────────────────────────────── */

test('闸的口径与指标审计的规格一致', () => {
  assert.equal(DENSITY_MAX_10Y, SPEC.density10, '密度闸的十年上限与规格不一致');
  assert.equal(DENSITY_MAX_5Y, SPEC.density5, '密度闸的五年上限与规格不一致');
  assert.equal(COOLDOWN_MONTHS, SPEC.cooldownMonths, '冷却闸的月份与规格不一致');
});
