/**
 * 发卡闸 —— 密度、冷却、阶段
 * ============================================================================
 *
 * ## 为什么要有这个文件
 * --------------------
 * 以前这三件事**谁都不管**：
 *   · **密度**：一局人生里最挤的十年有 14 张抉择卡（实测 40 条命）——
 *     玩家在十六岁那年被 6 张卡同时追着打，喘不过气；
 *   · **冷却**：同一条旁白在 60 个月里重复出现 20 次（实测 40 条命）——
 *     同一句话反复说，像卡带了；
 *   · **阶段**：没有「这张卡属于哪一段人生」的概念 ⇒ 童年卡能在四十岁发出来。
 *
 * ⇒ 现在三道闸**只有这一份实现**（`packages/adventure/gates.js`），
 *   规则层用它、审计用它、门禁也用它 —— 谁都不许自己另写一份口径。
 *
 * ## 三道闸各管什么
 * -----------------
 *   · **密度闸**：日常卡每 10 年不超过 5 张、每 5 年不超过 3 张。
 *     突破卡、长线卡、后续卡**不算**（它们是人生节点，本来就该发生）。
 *   · **冷却闸**：同一张卡、同一句旁白，60 个月内不许再来一遍。
 *   · **阶段闸**：卡自己声明「我属于哪一段人生 / 哪个境界段」；
 *     玩家不在那一段 ⇒ 这张卡现在发不出去。
 *
 * ## 域归属
 * --------
 * **节奏域（`pace`）** —— 「时间怎么走」本来就管发卡的密度与冷却。
 * 它读「哪张卡属于哪一段人生」那份声明（`content/card-stages.js`，因果域）——
 * 方向是允许的（④节奏 → ③因果）。
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 */
import {STAGES} from '../../content/cadence-table.js';
import {CARD_STAGES} from '../../content/card-stages.js';
import {CHAIN_IDS} from '../../content/chain-ids.js';

/* ── 口径（数字只有这一份） ──────────────────────────────────────────── */

/**
 * **规格**（目标值）—— 玩家该得到的样子。
 *
 * ⚠ 指标审计（`scripts/audit-metrics.mjs`）按**这份**数字去量实测值。
 *   它与下面那份「闸的实现值」**必须一致**，但故意写成两个独立常量 ——
 *   这样才能做**反向验证**：把闸的实现值改松（冷却 60 → 12 个月），
 *   规格不动 ⇒ 实测立刻出现重复 ⇒ 门禁报红 ⇒ 证明这道闸真的在管事。
 *   （一致性由审计脚本与单元测试各查一遍。）
 */
export const SPEC = {density10: 5, density5: 3, cooldownMonths: 60};

/** 密度闸：十年窗口（120 个月）。 */
export const DENSITY_WINDOW_10Y = 120;
/** 密度闸：十年窗口内最多几张日常卡（实现值）。 */
export const DENSITY_MAX_10Y = 5;
/** 密度闸：五年窗口（60 个月）。 */
export const DENSITY_WINDOW_5Y = 60;
/** 密度闸：五年窗口内最多几张日常卡（实现值）。 */
export const DENSITY_MAX_5Y = 3;
/** 冷却闸：同一张卡 / 同一句旁白，多少个月内不许再来（实现值）。 */
export const COOLDOWN_MONTHS = 60;

/**
 * 豁免名单 —— 这些卡**不受密度与冷却限制**，分成**两类**。
 *
 * ## 豁免的不是「不重要」，而是「**不能拦**」
 * ---------------------------------------
 *   · **突破卡与它的前置**（备主药、闭关、渡劫、筑基丹、修行指导卡）
 *     —— 拦住 ⇒ 玩家永远攒不够条件，这一境就废了；
 *   · **宗门考核**（`selection_*`）—— 拦住 ⇒ 玩家拿不到内门身份，
 *     后面一整条宗门线都开不了；
 *   · **长线卡**（`ROAD_CHAINS` 的三段）—— 拦住中间一段 ⇒ 这条线断掉，
 *     而且长线本身是「人生的某一段」，不是日常；
 *   · **一串里的后续卡**（入门那三步、回家链、集市后续、经历回响、
 *     人脉网络整条线、俗世生活线、修订九的后续、看管与入路那几张）
 *     —— 它们是上一张卡的**后果**或**下一步**，上一张已经发过了，
 *     后果不能不落地；把它们拦掉 = 让人家白等；
 *   · **终章与急讯**（`system_final` / `urgent_message` / `world_raid`）
 *     —— 一生一次的事，拦它等于让这一局结束不了。
 *
 * ## 为什么拆成两类（2026-11-08 · 阶段 2）
 * ---------------------------------------
 * 以前这是一份**多类理由的并集**，而密度指标只问一句「豁免还是豁免」
 * ⇒ 387 张里豁免了 263 张（68%）⇒ 指标只量了剩下那 124 张
 * ⇒ **密度指标永远是绿的**（假绿灯：实测「最挤 10 年 4 张」，上限 5；
 *   而玩家真正常遇到的是「最挤 10 年 15 张」）。
 *
 * ⇒ 现在按**这张卡是什么性质**分开，**每一条都写清理由**
 *   （不许靠前缀形状猜 —— 猜出来的分类没人能审）：
 *   · **结构性**（`structural`）—— 人生节点：一生就那么几次。
 *     突破与前置、入门那三步、宗门考核、长线、终章与急讯、凡人一生。
 *   · **日常**（`daily`）—— 玩家的日常决定，以及**承接上一张卡的后果**
 *     （回家链、集市后续、经历回响、人脉网络、俗世生活线、看管与入路…）。
 *     后果卡闸**不能拦**（拦了线就断了），但它们本质是日常节奏的一部分。
 *
 * ⚠ **闸的豁免范围一个字没变**：两类加起来还是原来那份并集
 *   （`isMilestone` 的行为逐条不变，由 `tests/gates.test.mjs` 拿
 *   `tests/fixtures/gate-exemptions.json` 逐条比对着）。
 *   拆分类是为了让**指标**能说清「挤在一起的是人生节点还是日常决定」，
 *   **不是**为了让闸拦得更少。
 *
 * ⚠ 豁免名单只增不减「无关紧要」的卡 —— 每加一个，
 *   密度闸就松一分（实测密度就是这么被放开的）。要加，先问两句：
 *   「这张卡被拦下来，玩家会不会永远等不到它？」
 *   「这张卡是某一段的**后果**吗？」
 */

/** **结构性**卡（按前缀）：人生节点 —— 一生就那么几次。 */
const STRUCTURAL_PREFIXES = [
  ['breakthrough_', '突破卡：冲关本身是人生节点'],
  ['advance_material_', '备主药：突破的前置，拦住这一境就废了'],
  ['years_practice_', '闭关：突破的前置，拦住这一境就废了'],
  ['tribulation_', '渡劫：突破的前置，拦住就渡不了劫'],
  ['r12_direction_', '修行指导卡：闭关准备'],
  ['r12_foundation_supply', '筑基丹：关键资源'],
  ['selection_', '宗门考核：拦住就拿不到内门身份'],
  ['mortal_life_', '凡人一生：另一条人生主线'],
];

/** **结构性**卡（单张）：人生节点。 */
const STRUCTURAL_EXACT = [
  ['reception', '入门第一步：山门外的队伍'],
  ['root_result', '入门第二步：测灵石上的记录'],
  ['first_method', '入门第三步：第一份心法'],
  ['system_final', '终章：一生一次'],
  ['urgent_message', '急讯：一生一次'],
  ['world_raid', '战事：一生一次'],
];

/** **日常**卡（按前缀）：承接上一张卡的后果 —— 闸不能拦，但本质是日常节奏。 */
const DAILY_PREFIXES = [
  ['r12_home_', '回家链：上一张卡的后果'],
  ['r12_bazaar_', '集市后续：上一张卡的后果'],
  ['r12_sealed_', '借灵息的后果提醒：上一张卡的后果'],
  ['network_', '人脉网络整条线：功法与授业机会'],
  ['echo_', '经历回响：旧事重提'],
  ['m11_', '俗世生活线：一条完整的人生主线'],
];

/** **日常**卡（单张）：承接上一张卡的后果。 */
const DAILY_EXACT = [
  ['custody_terms', '看管条款：上一张卡的后果'],
  ['custody_escape', '脱身：上一张卡的后果'],
  ['dark_invitation', '幽灯堂的邀约：入路那一步'],
  ['dark_oath', '幽灯堂的誓约：入路那一步'],
  ['beast_invitation', '妖身的邀约：入路那一步'],
  ['beast_acceptance', '妖身的接纳：入路那一步'],
  ['departure_terms', '出走的条件：入路那一步'],
  ['family_gate', '家门关着：排好队的事'],
  ['family_rules', '家规：排好队的事'],
  ['family_home_ambush', '回家路上的伏击：上一张卡的后果'],
  ['manual_study', '研读心得：修订九的后续'],
  ['dark_oath_return', '誓约之后：修订九的后续'],
  ['thin_root_mine', '灵根薄·下矿：支线的后果'],
  ['thin_root_price', '灵根薄·价：支线的后果'],
  ['thin_root_return', '灵根薄·回：支线的后果'],
  ['thin_root_hunt', '灵根薄·追：支线的后果'],
  ['echo_resume_after_war', '战后再遇：修订九的后续'],
];

/*
 * ⚠⚠ **长线 id 的清单**在 `content/chain-ids.js`（内容层的一个叶子文件）。
 *
 * ## 为什么清单不放在规则层
 * ------------------------
 *   以前这里是「规则层的静态清单 + 内容层注册进来」两份，
 *   两份必须逐条对得上，对不上就抛错。
 *   ⇒ 现在清单挪到**内容层的叶子文件**，两边都读它：
 *     · 内容层不需要反向依赖规则层（`content/` 不许依赖 `packages/adventure/`）；
 *     · 叶子文件不 import 任何东西 ⇒ **永远不在环里**
 *       （`scripts/test-xianxia-cycle.mjs` 守着这条）；
 *     · 只 import 闸的单测也能拿到完整名单（不依赖内容层是否被加载）。
 *   内容层加载时会**自己核对**自己的 `ROAD_CHAINS` 与那份清单
 *   （`content/cultivation-stories.js` 末尾）⇒ 对不上当场抛错，不会悄悄发霉。
 */
const EXEMPT_CHAIN_IDS = new Set(CHAIN_IDS);

/**
 * 这张卡是什么性质 —— **分类由规则层给**（别人不许自己判前缀）。
 *
 * ## 为什么要有这个函数
 * ----------------------
 * 豁免名单是**多类理由的并集**（不能拦的 / 后果卡 / 长线 / 终章），
 * 而指标只问一句「豁免还是豁免」⇒ 豁免了 387 张里的 263 张（68%）
 * ⇒ 密度指标只量了剩下 124 张 ⇒ **永远是绿的**（假绿灯）。
 *
 * ⇒ 现在把「这张卡是什么性质」也说出来：
 *   · `structural` —— 人生节点：一生就那么几次；
 *   · `daily` —— 日常决定（含**承接上一张卡的后果**那类）。
 *
 * ⚠ **分类只是给指标看的**：闸的豁免范围（`exempt`）一个字没变。
 *
 * @param {string} eventId 事件 id
 * @returns {{kind: 'structural'|'daily', exempt: boolean, reason: string}}
 */
export function classifyCard(eventId) {
  if (!eventId) return {kind: 'daily', exempt: false, reason: '日常决定'};
  for (const [id, reason] of STRUCTURAL_EXACT) {
    if (eventId === id) return {kind: 'structural', exempt: true, reason: reason};
  }
  for (const [prefix, reason] of STRUCTURAL_PREFIXES) {
    if (eventId.indexOf(prefix) === 0) return {kind: 'structural', exempt: true, reason: reason};
  }
  for (const [id, reason] of DAILY_EXACT) {
    if (eventId === id) return {kind: 'daily', exempt: true, reason: reason};
  }
  for (const [prefix, reason] of DAILY_PREFIXES) {
    if (eventId.indexOf(prefix) === 0) return {kind: 'daily', exempt: true, reason: reason};
  }
  /*
   * 长线卡（`ROAD_CHAINS` 的三段）—— 豁免，且是**结构性**的：
   * 一条线就是人生的一段，不是日常决定。
   *
   * ⚠ 长线 id **不许在这里另抄一份**：抄一份就会与内容层发霉
   *   （内容加了一条新线，闸不知道 ⇒ 那条线被密度闸拦掉 ⇒ 整条线断了）。
   * ⇒ 直接读内容层那一份（`content/chain-ids.js`）。
   */
  for (const id of EXEMPT_CHAIN_IDS) {
    if (eventId === id || eventId.indexOf(id + '_') === 0) {
      return {kind: 'structural', exempt: true, reason: '长线：这一条线是人生的一段'};
    }
  }
  return {kind: 'daily', exempt: false, reason: '日常决定'};
}

/**
 * 这张卡是不是「人生节点」（豁免密度与冷却）。
 * @param {string} eventId 事件 id
 * @returns {boolean}
 */
export function isMilestone(eventId) {
  return classifyCard(eventId).exempt;
}

/* ── 阶段 ─────────────────────────────────────────────────────────── */

/**
 * 玩家此刻处在哪一段人生（按岁数；与 `content/cadence-table.js` 的 STAGES 同源）。
 * @param {object} state 当前人生状态
 * @returns {string} 阶段 id（child / youth / entry / stand / lamp / late）
 */
export function currentStage(state) {
  const age = Math.floor(state.month / 12) + (state.birth && state.birth.startAge || 0);
  const stages = STAGES;
  for (const stage of stages) {
    if (age <= stage.to) return stage.id;
  }
  return stages[stages.length - 1].id;
}

/**
 * 查这张卡的阶段声明。
 * @param {string} eventId 事件 id
 * @returns {object|null} 声明（{stage?, realm?, maxAge?}），没有就返回 null
 */
export function declarationOf(eventId) {
  const decls = CARD_STAGES;
  const keys = Object.keys(decls);
  for (const key of keys) {
    if (key.charAt(key.length - 1) === '*') {
      if (eventId.indexOf(key.slice(0, -1)) === 0) return decls[key];
      continue;
    }
    if (key === eventId) return decls[key];
  }
  return null;
}

/**
 * 阶段闸 —— 这张卡现在发不发得出去。
 * @param {object} state 当前人生状态
 * @param {string} eventId 事件 id
 * @returns {boolean} true = 发得出去
 */
export function stageAllows(state, eventId) {
  const decl = declarationOf(eventId);
  if (!decl) return true;
  if (decl.stage && decl.stage !== currentStage(state)) return false;
  if (decl.realm) {
    const realm = state.player.realm;
    if (realm < decl.realm[0] || realm > decl.realm[1]) return false;
  }
  if (decl.maxAge !== undefined) {
    const age = Math.floor(state.month / 12) + (state.birth && state.birth.startAge || 0);
    if (age > decl.maxAge) return false;
  }
  return true;
}

/* ── 密度 ─────────────────────────────────────────────────────────── */

/**
 * 日常卡（不算人生节点）在最近若干个月里有几张。
 * @param {object} state 当前人生状态
 * @param {number} months 窗口长度（月）
 * @returns {number}
 */
export function dailyCount(state, months) {
  let count = 0;
  const decisions = state.decisions || [];
  for (const d of decisions) {
    if (state.month - d.month >= months) continue;
    if (isMilestone(d.event)) continue;
    count++;
  }
  return count;
}

/**
 * 密度闸 —— 这个月还能不能再发日常卡。
 * @param {object} state 当前人生状态
 * @returns {boolean} true = 还能发
 */
export function densityAllows(state) {
  if (dailyCount(state, DENSITY_WINDOW_10Y) >= DENSITY_MAX_10Y) return false;
  if (dailyCount(state, DENSITY_WINDOW_5Y) >= DENSITY_MAX_5Y) return false;
  return true;
}

/* ── 冷却 ─────────────────────────────────────────────────────────── */

/**
 * 冷却闸（卡）—— 这张卡最近发过没有。
 * @param {object} state 当前人生状态
 * @param {string} eventId 事件 id
 * @returns {boolean} true = 冷却期已过
 */
export function cooldownAllows(state, eventId) {
  const decisions = state.decisions || [];
  for (const d of decisions) {
    if (d.event !== eventId) continue;
    if (state.month - d.month < COOLDOWN_MONTHS) return false;
  }
  return true;
}

/**
 * 冷却闸（旁白）—— 这句话最近说过没有。
 * @param {object} state 当前人生状态
 * @param {string} title 旁白标题
 * @returns {boolean} true = 冷却期已过
 */
export function titleAllows(state, title) {
  if (!title) return true;
  const journal = state.journal || [];
  for (const entry of journal) {
    if (entry.title !== title) continue;
    if (state.month - entry.month < COOLDOWN_MONTHS) return false;
  }
  return true;
}

/* ── 总闸 ─────────────────────────────────────────────────────────── */

/**
 * 这张**日常卡**现在发不发得出去。
 *
 * @param {object} state 当前人生状态
 * @param {string} eventId 事件 id
 * @returns {boolean} true = 发得出去
 */
export function allowDaily(state, eventId) {
  if (!eventId) return false;
  if (isMilestone(eventId)) return true;
  if (!cooldownAllows(state, eventId)) return false;
  if (!stageAllows(state, eventId)) return false;
  if (!densityAllows(state)) return false;
  return true;
}

/**
 * 为什么发不出去（给审计与门禁看的「人话」）。
 * @param {object} state 当前人生状态
 * @param {string} eventId 事件 id
 * @returns {string|null} 拦它的理由；发得出去就返回 null
 */
export function blockedReason(state, eventId) {
  if (!eventId) return '没有事件 id';
  if (isMilestone(eventId)) return null;
  if (!cooldownAllows(state, eventId)) return '冷却期没过（60 个月）';
  if (!stageAllows(state, eventId)) {
    const decl = declarationOf(eventId);
    if (decl && decl.stage && decl.stage !== currentStage(state)) {
      return '不在它该出现的阶段（要 ' + decl.stage + '，现在是 ' + currentStage(state) + '）';
    }
    if (decl && decl.realm) return '不在它该出现的境界段';
    if (decl && decl.maxAge !== undefined) return '过了它该出现的岁数';
    return '阶段闸拦住';
  }
  if (!densityAllows(state)) {
    return '太密了（' + DENSITY_WINDOW_10Y / 12 + ' 年里已有 '
      + dailyCount(state, DENSITY_WINDOW_10Y) + ' 张日常卡）';
  }
  return null;
}
