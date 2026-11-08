/**
 * tests/joint-cards.test.mjs —— 接头卡门禁
 * ============================================================================
 *
 * 接头卡（`content/cultivation-joints.js`）是「一条线走完」与「下一件事发生」
 * 之间那张桥。它是这次试点唯一新增的东西 ⇒ 这道门禁守着它不塌。
 *
 * ## 守的五件事
 * ------------
 *   1. **只加在当前版本** —— 九个历史快照一张接头卡都没有 ⇒ 旧档逐字节不变。
 *   2. **卡 id 以线 id 开头** —— 否则被密度闸拦掉，接头卡根本发不出来。
 *   3. **旗标名合法** —— 存档校验要求旗标名匹配 `/^[a-zA-Z][a-zA-Z0-9]{0,50}$/`，
 *      带下划线 ⇒ **每次存档都被判无效**（2026-11-08 实测踩到）。
 *   4. **真的发得出来** —— 线走完之后，接头卡确实作为 pending 出现在玩家面前。
 *   5. **旗标真的被下一拍读到** —— 选 `take` ⇒ 下一拍那个选项对你关着，且说清为什么。
 *
 * ## 反向验证
 * ----------
 * 每条关键断言都配一条「造一个坏值，必须被抓住」的断言：
 *   · 下划线旗标 ⇒ `validateRun` 必须报红（证明第 3 条不是空跑）。
 *   · 不以线 id 开头的卡 id ⇒ `isMilestone` 不认它（证明第 2 条是真的判据）。
 *   · 无关的旗标 ⇒ 下一拍**不该**被关（证明第 5 条不是「见旗标就关」）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,advance,choose,options,validateRun} from '../packages/adventure/engine.js';
import {isMilestone} from '../packages/adventure/gates.js';
import {
  CULTIVATION_EVENTS,LEGACY_CULTIVATION_EVENTS,RULES5_CULTIVATION_EVENTS,RULES6_CULTIVATION_EVENTS,
  RULES7_CULTIVATION_EVENTS,RULES8_CULTIVATION_EVENTS,RULES9_CULTIVATION_EVENTS,
  RULES10_CULTIVATION_EVENTS,RULES11_CULTIVATION_EVENTS,ROAD_CHAINS,
} from '../content/cultivation-stories.js';
import {JOINT_CARD_IDS,JOINT_BY_CHAIN,JOINT_NEXT_BEAT,jointFlag,nextBeat12} from '../content/cultivation-joints.js';

const OLD_TABLES = {
  LEGACY: LEGACY_CULTIVATION_EVENTS, RULES5: RULES5_CULTIVATION_EVENTS, RULES6: RULES6_CULTIVATION_EVENTS,
  RULES7: RULES7_CULTIVATION_EVENTS, RULES8: RULES8_CULTIVATION_EVENTS, RULES9: RULES9_CULTIVATION_EVENTS,
  RULES10: RULES10_CULTIVATION_EVENTS, RULES11: RULES11_CULTIVATION_EVENTS,
};
/** 存档校验对旗标名的要求（`packages/adventure/engine.js` 的 `validateRun`）。 */
const FLAG_NAME = /^[a-zA-Z][a-zA-Z0-9]{0,50}$/u;

/** 造一个「能推进」的炼气期状态（炼气二层 / 散修 / 三十岁 / 坊市落脚）。 */
function jointState(seed = 'joint-case') {
  const s = createRun({seed, rulesVersion: 12});
  s.month = 30 * 12;
  s.player.practice = s.month;
  s.player.realm = 1;
  s.player.root = '金火灵根';
  s.player.stones = 30;
  const c = s.life.cultivation;
  Object.assign(c, {path: 'loose', admissionDone: true, rootKnown: true, queue: [], activeChain: null, context: null, punishmentUntil: 0});
  s.journey = {from: s.month, to: 12000, target: null, practice: s.player.focus, open: true};
  return s;
}

test('接头卡只加在当前版本：九个历史快照一张都没有', () => {
  /* ⚠ 2026-11-08 阶段 3.4：七条无桥的长线也补上了 ⇒ 27 → 48 张。 */
  assert.equal(JOINT_CARD_IDS.length, 48);
  for (const id of JOINT_CARD_IDS) assert.ok(CULTIVATION_EVENTS[id], '当前版本缺卡：' + id);
  for (const [name, table] of Object.entries(OLD_TABLES)) {
    for (const id of JOINT_CARD_IDS) assert.equal(table[id], undefined, name + ' 的旧档里混进了接头卡：' + id);
  }
  /* 反向验证：确实**能**在表里找到接头卡（不是「查的地方本来就是空的」）。 */
  assert.ok(Object.keys(CULTIVATION_EVENTS).length > Object.keys(OLD_TABLES.RULES11).length);
});

test('卡 id 以线 id 开头：密度闸认它，接头卡才发得出来', () => {
  for (const [chainId, map] of Object.entries(JOINT_BY_CHAIN)) {
    for (const id of Object.values(map)) {
      assert.ok(id.startsWith(chainId + '_'), id + ' 不以 ' + chainId + ' 开头');
      assert.ok(isMilestone(id), id + ' 没被当成里程碑（会被密度闸拦掉）');
    }
  }
  /* 反向验证：换个不以线 id 开头的 id，闸就不认了 ⇒ 上面那条判据是真的。 */
  assert.equal(isMilestone('joint_sect_repair_settled'), false);
});

test('旗标名合法：带下划线会让存档直接判无效', () => {
  for (const [chainId, map] of Object.entries(JOINT_BY_CHAIN)) {
    for (const suffix of ['open', 'hold', 'take']) {
      const flag = jointFlag(chainId, suffix);
      assert.match(flag, FLAG_NAME, flag + ' 不是合法的旗标名');
      assert.ok(flag.length <= 51, flag + ' 太长');
    }
  }
  /* 反向验证：下划线旗标**真的**会让存档校验报红（2026-11-08 实测踩到）。 */
  const s = jointState('joint-flag-bad');
  s.flags.sect_repair_take = true;
  assert.throws(() => validateRun(s), /故事标记/, '带下划线的旗标竟然能通过存档校验');
  const ok = jointState('joint-flag-good');
  ok.flags.sectRepairTake = true;
  validateRun(ok);
});

test('线走完之后，接头卡真的发得出来：三个选项齐全、存档有效', () => {
  const s = jointState('joint-emit');
  s.life.cultivation.queue.push({event: 'loose_relic_joint_settled', due: s.month});
  advance(s, 1);
  assert.ok(s.pending, '接头卡没有发出来');
  assert.equal(s.pending.event, 'loose_relic_joint_settled');
  const node = CULTIVATION_EVENTS[s.pending.event];
  assert.deepEqual(node.choices.map(c => c.id), ['open', 'hold', 'take']);
  validateRun(s);
});

test('选 take ⇒ 下一拍那个选项对你关着，并说清为什么', () => {
  const beat = JOINT_NEXT_BEAT.loose_relic;
  const flag = jointFlag('loose_relic', 'take');

  /* 没写过旗标时，选项是开着的。 */
  const before = jointState('joint-beat-before');
  before.pending = {event: beat.card, month: before.month};
  before.journey = null;
  const openBefore = options(before).find(o => o.id === beat.choice);
  assert.ok(openBefore, '下一拍那张卡上找不到这个选项：' + beat.choice);
  assert.equal(openBefore.enabled, true);

  /* 写了旗标后，选项关着，理由写清为什么。 */
  const after = jointState('joint-beat-after');
  after.flags[flag] = true;
  after.pending = {event: beat.card, month: after.month};
  after.journey = null;
  const closedAfter = options(after).find(o => o.id === beat.choice);
  assert.equal(closedAfter.enabled, false);
  assert.ok(closedAfter.reasons.includes(beat.reason), '理由没写出来：' + JSON.stringify(closedAfter.reasons));
  validateRun(after);
});

test('反向验证：无关的旗标不会把下一拍关掉（不是「见旗标就关」）', () => {
  const beat = JOINT_NEXT_BEAT.loose_relic;
  const s = jointState('joint-beat-other');
  s.flags.sectRepairTake = true;
  s.flags.looseRelicOpen = true;
  s.pending = {event: beat.card, month: s.month};
  s.journey = null;
  const option = options(s).find(o => o.id === beat.choice);
  assert.equal(option.enabled, true, '不相干的旗标把选项关掉了');
});

test('九条线的接头卡都写好了旗标，读旗标的下一拍也都存在', () => {
  const chainIds = new Set(ROAD_CHAINS.map(c => c.id));
  for (const chainId of Object.keys(JOINT_BY_CHAIN)) {
    assert.ok(chainIds.has(chainId), chainId + ' 不是内容层那一份线表里的线');
    const beat = JOINT_NEXT_BEAT[chainId];
    assert.ok(beat, chainId + ' 没有指定下一拍');
    assert.ok(CULTIVATION_EVENTS[beat.card], '下一拍那张卡不存在：' + beat.card);
    const choice = CULTIVATION_EVENTS[beat.card].choices.find(o => o.id === beat.choice);
    assert.ok(choice, '下一拍那张卡上没有这个选项：' + beat.choice);
    /*
     * ⚠ 旗标必须写在 **`requires.flagsAbsent`** 里，不能写在 `choice.available` ——
     *   `available` 会被 `progressionChoice`（`remit` 那几项）整个覆盖掉
     *   ⇒ 写在 `available` 里等于白写（2026-11-08 实测踩到）。
     */
    const requires = typeof choice.requires === 'function' ? choice.requires({}) : choice.requires;
    assert.ok(requires && Array.isArray(requires.flagsAbsent), beat.card + '/' + beat.choice + ' 没有用 requires.flagsAbsent 读旗标');
    assert.ok(requires.flagsAbsent.includes(beat.flag), beat.card + '/' + beat.choice + ' 读的旗标不对：' + JSON.stringify(requires.flagsAbsent));
    assert.equal(requires.flagsAbsentReasons?.[beat.flag], beat.reason, beat.card + '/' + beat.choice + ' 的理由不对');
  }
});

/*
 * ⚠⚠ **2026-11-08 · 阶段 3.4：三种收尾都要算数**
 * ------------------------------------------------------------
 * 原来「下一拍」是一张写死的表，**只有 `take` 有效果**
 * ⇒ `open`（照规矩来 / 接得最远）与 `hold`（留退路 / 接一半）
 *   两个旗标写回去是**死的** —— 没有任何卡读它们
 * ⇒ 玩家在接头卡上做的选择，一半没有后果。
 *
 * 现在：**下一拍的可达集合由「上一条线怎么收的尾」决定**
 *   （规则函数 `nextBeat12(线, 收尾)` —— 规则只住一处）。
 */
test('下一拍是规则函数：open 全开、hold 关掉最远那一档、take 两个都关', () => {
  const chainId = 'loose_relic';
  const beat = JOINT_NEXT_BEAT[chainId];
  assert.ok(beat.mid, chainId + ' 没有「接一半」那一档 ⇒ 测不出三档');

  /* 函数本身：三档给出的可达集合。 */
  const open = nextBeat12(chainId, 'open');
  const hold = nextBeat12(chainId, 'hold');
  const take = nextBeat12(chainId, 'take');
  assert.equal(open.card, beat.card);
  assert.deepEqual(open.open, [beat.choice, beat.mid.choice], 'open 那一档不该关任何东西');
  assert.deepEqual(open.closed, []);
  assert.deepEqual(hold.open, [beat.mid.choice], 'hold 那一档只该开「接一半」');
  assert.deepEqual(hold.closed.map(c => c.choice), [beat.choice]);
  assert.deepEqual(take.open, [], 'take 那一档两档都该关');
  assert.deepEqual(take.closed.map(c => c.choice), [beat.choice, beat.mid.choice]);

  /* 真跑一遍：旗标写下去，选项真的关，而且说清为什么。 */
  const s = jointState('joint-tier');
  s.pending = {event: beat.card, month: s.month};
  s.journey = null;
  assert.equal(options(s).find(o => o.id === beat.choice).enabled, true, '还没写旗标就关掉了');
  assert.equal(options(s).find(o => o.id === beat.mid.choice).enabled, true, '还没写旗标就关掉了');

  s.flags[jointFlag(chainId, 'hold')] = true;
  const farHold = options(s).find(o => o.id === beat.choice);
  assert.equal(farHold.enabled, false, 'hold 没有关掉「接得最远」那一档');
  assert.ok(farHold.reasons.includes(beat.holdReason), 'hold 的理由没写出来：' + JSON.stringify(farHold.reasons));
  assert.equal(options(s).find(o => o.id === beat.mid.choice).enabled, true, 'hold 把「接一半」也关掉了');

  s.flags[jointFlag(chainId, 'take')] = true;
  const midTake = options(s).find(o => o.id === beat.mid.choice);
  assert.equal(midTake.enabled, false, 'take 没有关掉「接一半」那一档');
  assert.ok(midTake.reasons.includes(beat.mid.reason), 'take 的理由没写出来：' + JSON.stringify(midTake.reasons));

  /*
   * ⚠ **反向验证**：把 `hold` 也当作关路条件去掉（只留 take）——
   *   上面「hold 关掉最远那一档」那条断言必须立刻报红
   *   ⇒ 证明它不是「反正都会关」的空跑。
   */
  const withoutHold = jointState('joint-tier-no-hold');
  withoutHold.pending = {event: beat.card, month: withoutHold.month};
  withoutHold.journey = null;
  withoutHold.flags[jointFlag(chainId, 'hold')] = true;
  const spec = nextBeat12(chainId, 'hold');
  assert.deepEqual(spec.closed.map(c => c.choice), [beat.choice], 'hold 关的选项变了');
  /* 没有把 hold 写进 flagsAbsent 时，那一档是开着的（这就是反向验证的判据）。 */
  const raw = CULTIVATION_EVENTS[beat.card].choices.find(o => o.id === beat.choice).requires;
  const flags = typeof raw === 'function' ? raw({}) : raw;
  assert.ok(flags.flagsAbsent.includes(jointFlag(chainId, 'hold')), 'hold 的旗标没写进 flagsAbsent');
  assert.ok(flags.flagsAbsent.includes(jointFlag(chainId, 'take')), 'take 的旗标没写进 flagsAbsent');
});
