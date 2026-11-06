/**
 * 节奏表 —— 每一境界「该在哪一年到」，以及「死线在哪」。
 * ============================================================================
 *
 * ## 这张表治的是什么病
 * --------------------
 * 归山记原来的时间轴是错位的：内容按「理想修士」写（少年炼气、入门筑基、
 * 立身金丹、传灯元婴），但玩家实际 50 岁还在炼气。于是出现「72 岁去跟炉三年」
 * 这类说不清哪里怪的场面 —— 不是某张卡写坏了，是**整条时间轴对不上**。
 *
 * ⇒ 这张表把「一个修士这辈子大概什么时候到哪一境」写成**数据**，
 *   规则层照着它发卡，内容层照着它写卡。两边对同一份表说话。
 *
 * ## 三个概念，别混
 * ----------------
 *   · **窗口（from–to）**：这一境**该在哪几年之间**到。
 *     数字来自已拍板的目标节奏，依据见 `docs/内容架构重构方案-2026-11-06.md`：
 *       炼气 12–22（小说：10 岁入门、21 岁巅峰）
 *       筑基 28–42（普通修士 25–35 筑基，取上沿）
 *       金丹 95–150（普通约 150 结丹；筑基寿仅 210）
 *       元婴 200–290（普通 350–400 结婴；金丹寿 350）
 *
 *   · **死线（deathLine）**：**停在**这一境会活到几岁。
 *     直接由寿元表推导（`content/adventure.js` 的 REALMS），**不另写数字** ——
 *     写死一份数字就会和寿元表发霉。
 *
 *   · **阶段（STAGES）**：一生分成哪几段，用来量「这段人生有没有内容可看」。
 *
 * ## 怎么用
 * --------
 * 规则层拿 `CADENCE` 决定**什么时候发突破卡**：
 *   条件满足（进度 / 材料 / 功法）**且**年龄到了窗口下界 ⇒ 立刻发，不参与随机；
 *   年龄过了窗口上界 ⇒ 也立刻发（迟了不能再拖）。
 * 呈现层拿 `deathLine` 与当前年龄算「还能活几年」（S8）。
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 */
import {REALMS} from './adventure.js';

/** 境界名（下标 = 境界序号：0 凡身、1 炼气、2 筑基、3 金丹、4 元婴）。 */
export const REALM_NAMES = REALMS.map(r => r.name);

/**
 * 目标突破窗口 —— 每一境「该在哪几年之间到」。
 * 这是**拍板数字**，不要随手改；改之前先想清楚后果。
 */
export const CADENCE = [
  {realm: 1, name: '炼气', from: 12, to: 22},
  {realm: 2, name: '筑基', from: 28, to: 42},
  {realm: 3, name: '金丹', from: 95, to: 150},
  {realm: 4, name: '元婴', from: 200, to: 290},
];

/**
 * 长线的年龄上界 —— **按境界段推导，不手填**。
 *
 * ## 规则
 * ------
 *   `ageEnd = max(下一境界的窗口上界 − 30 年, 这条线自己的 age + 12 年)`
 *
 *   · 「下一境界的窗口上界」：这条线走完，人大致就该到下一境了 ——
 *     过了那个年纪，这条线就不该再出现（20 岁的宗门线拖到 80 岁才发，不像话）。
 *   · 「+ 12 年」是**下限保护**：一条三段剧情至少要留够走完的时间
 *     （实测三段走完要 3–6 年，12 年足够）。
 *   · 两个数取**较紧**的那个：窗口既不拖到不该出现的年纪，也不会短到走不完。
 *
 * ## 这份规则是**唯一**的
 * ----------------------
 * `content/cultivation-stories.js` 的 `ROAD_CHAINS` 里每条链的 `ageEnd` 照此填写；
 * `scripts/audit-chains.mjs` 用**同一个函数**核对 ——
 * ⇒ 谁想手填一个「看起来更合适」的值，门禁立刻报红。
 *
 * @param {number} realm 这条长线所属的境界（0 凡身 / 1 炼气 / 2 筑基）
 * @param {number} age 这条长线的起始年龄
 * @returns {number} 这条长线的年龄上界
 */
export function chainAgeEnd(realm, age) {
  const next = CADENCE.find(c => c.realm === realm + 1);
  const dead = next ? next.to : CADENCE[CADENCE.length - 1].to;
  return Math.max(dead - 30, age + 12);
}

/**
 * 宗门的供料年限 —— **按角色自己的进度算，不按宗门强弱**。
 *
 * ## 以前怎么算的（2026-11-08 改掉）
 * -----------------------------------
 * 「按宗门强弱给 45 / 60 / 75 岁」：宗门最高境界是金丹就给 45 岁，元婴给 60，渡劫给 75。
 * ⇒ 这是把**别人家的实力**当成了「你该被供多久」的理由 ——
 *   同一个你，换一家宗门就多领几年料，这跟你的修行进度没关系。
 *   而且实测里那三个数只有一个（45）真的生效（判定本来就要求「还没筑基」）。
 *
 * ## 现在怎么算
 * ----------------
 * 「你走到哪一境，宗门就供到哪一境的窗口上界」：
 *   · 境界 0（还没引气入道）⇒ 供到**炼气**窗口上界（22 岁）——
 *     22 岁还没能引气，宗门就不再把你当新弟子养；
 *   · 境界 1（炼气）⇒ 供到**筑基**窗口上界（42 岁）——
 *     42 岁还没筑基，宗门收走基础耗材的领取签（见 `story-rules12.js` 的 `patron`）；
 *   · 境界 2 及以上 ⇒ 已经是内门，往后的材料另算，这条限制不再适用
 *     （**沿用最后一个数**，不跳到 150 / 290 —— 免得文案上的年限忽然变了）。
 *
 * ⚠ 这个数是**跟着境界走的**，所以每次判定前都要按当前境界重算 ——
 *   写进 `state.life.cultivation.v12.patron.until`，呈现层与文案都只读那一个值。
 */
export function supplyUntil(realm) {
  /*
   * 供料年限 = **你筑基的窗口上界**（42 岁）。
   *
   * ⚠ 为什么不是「按境界各给一个数」？
   *   这条限制本来就只对**还没筑基的人**适用（判定里写着 `realm < 2`），
   *   所以「下一境的窗口上界」永远是筑基那一档 ⇒ 恒定 42。
   *   而「按境界分段」反而会给出怪数：境界 0（还没引气入道）会算出 22 岁 ——
   *   「你 22 岁还没引气，宗门不再养你」听着合理，但配套的通知会提前到 17 岁
   *   （提醒你「供料年限将到」），一个刚入门的杂役收到这话并不像话。
   *
   * ⇒ 依据从「**别人家的实力**」（宗门强弱 45/60/75，其中只有一个真的生效）
   *   换成「**你自己的进度表**」（筑基窗口 42 岁）。
   */
  const band = CADENCE.find(c => c.realm === 2);
  return band ? band.to : 42;
}

/**
 * 境界门槛 —— 进入这一境要攒够多少「修行进度」。
 *
 * 这些数字**跟着窗口一起定**：窗口是「该在哪几年到」，门槛是「到之前得练够多少」。
 * 两者必须对得上 —— 门槛太高，窗口就形同虚设（人卡在门槛前，窗口过了还没到）。
 *
 * 进度每月涨多少因人而异（灵根、体质、功法、宗门供给都算数），
 * 所以门槛定的是「**大多数人在窗口前段就能攒够**」，攒不够的人由
 * 「窗口上界强推」兜底（见 `packages/adventure/scheduler.js` 的里程碑档）。
 */
export const REQUIRED_PROGRESS = {
  1: 18,   /* 炼气：入门后攒三年就够（窗口 12–22，入门最早 16 岁 ⇒ 19–21 岁可发卡） */
  2: 60,   /* 筑基：从炼气到筑基还要一段实打实的功夫（窗口 28–42） */
  3: 220,  /* 金丹：材料与功法另算（窗口 95–150） */
  4: 320,  /* 元婴：材料与功法另算（窗口 200–290） */
};

/**
 * 冲关参数 —— 每一境「冲得成不成、失败了伤多深」。
 *
 * ## 为什么要有这张表
 * --------------------
 * 实测（`scripts/audit-cadence.mjs`，40 条命）发现三个说不通的地方：
 *   · **金丹只有三成把握、元婴只有一成** —— 修士攒了几十年的功夫，
 *     到了最要紧的一关反而最容易失手；
 *   · **一次失败扣 28 点体力**（高阶的旧检查值）⇒ 连输三次人已经半残，
 *     后面几次冲关连「体力不足」的额外扣分都吃上了 ⇒ **越输越没戏**；
 *   · **高阶的检查被整块覆盖**，灵根加成与「最后的机会」加成全丢。
 *
 * ⇒ 数字集中在这里，规则层照着它算，**改一处就够**。
 *
 * ## 怎么定的
 * ----------
 *  · `base` 底分：按「这一关该有多难」分档。境界越高越难，但高阶修士
 *    技艺与悟性已经攒了几十年，所以底分不必压得太低。
 *  · `scale` / `statScale`：技艺与悟性各值多少分。
 *  · `harm` 失败留多少**旧伤**（永久的痕迹，影响修行速度与寿元）。
 *    ⚠ 失败**不再扣体力** —— 体力是资源，扣它会让人「越输越没戏」。
 *  · `service` 做工换料要走多少个月：穷修士的额外代价。
 *
 * ⚠ 这张表进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 */
export const BREAKTHROUGH = {
  1: {base: 70, scale: 0.20, statScale: 0.12, harm: 1, service: 36},
  2: {base: 62, scale: 0.20, statScale: 0.12, harm: 1, service: 36},
  3: {base: 42, scale: 0.14, statScale: 0.14, harm: 2, service: 0},
  4: {base: 22, scale: 0.14, statScale: 0.14, harm: 2, service: 0},
};

/**
 * 灵根对冲关的加成：好灵根占优，杂灵根吃亏。
 * @param {number} grade 灵根等级（≥2 上等、1 中等、0 杂、−1 未显）
 * @returns {number} 加减分
 */
export function gradeBonus(grade) {
  if (grade >= 2) return 10;
  if (grade === 1) return 0;
  return -8;
}

/**
 * 某一境的冲关参数。
 * @param {number} realm 境界序号
 * @returns {object|null}
 */
export function breakthroughRule(realm) {
  const row = BREAKTHROUGH[realm];
  return row ? row : null;
}

/**
 * 某一境的突破门槛。
 * @param {number} realm 境界序号
 * @returns {number} 需要攒够的修行进度
 */
export function progressNeeded(realm) {
  return REQUIRED_PROGRESS[realm] === undefined ? 0 : REQUIRED_PROGRESS[realm];
}

/**
 * 人生阶段 —— 一生分成哪几段，以及**这一段该在哪个境界**。
 *
 * `primary` 是这一段的「主境界」：按上面的窗口推出来的。
 *   幼年（未入门）→ 凡身；少年（炼气）→ 炼气；入门（筑基初成）→ 筑基；
 *   立身（筑基立业）→ 筑基；传灯（金丹授徒）→ 金丹；晚年（元婴）→ 金丹 / 元婴。
 *
 * ⚠ 为什么「立身」是筑基、「传灯」是金丹：
 *   旧内容按「50–69 岁该是金丹、70–89 岁该是元婴」写，但节奏表把金丹定在 95–150。
 *   两边只能对上一个 —— **要么改内容，要么改节奏**。
 *   本轮选了改节奏（窗口是拍板数字），于是阶段的主境界跟着窗口走。
 *   ⇒ 金丹的内容落在「传灯」段，元婴的内容落在「晚年」段。
 *
 * `expected` 是这一段**允许**出现的境界（含还没到下一境的那批人）。
 */
export const STAGES = [
  {id: 'child', name: '幼年', from: 0, to: 15, primary: 0, expected: [0]},
  {id: 'youth', name: '少年', from: 16, to: 29, primary: 1, expected: [0, 1]},
  {id: 'entry', name: '入门', from: 30, to: 49, primary: 2, expected: [1, 2]},
  {id: 'stand', name: '立身', from: 50, to: 69, primary: 2, expected: [1, 2]},
  {id: 'lamp', name: '传灯', from: 70, to: 89, primary: 2, expected: [1, 2, 3]},
  {id: 'late', name: '晚年', from: 90, to: 999, primary: 3, expected: [2, 3, 4]},
];

/**
 * 死线：停在某一境会活到几岁（寿元表推导，不另写数字）。
 * @param {number} realm 境界序号
 * @returns {number} 寿尽年龄
 */
export function deathLine(realm) {
  const row = REALMS[realm];
  return row ? row.lifespan : 0;
}

/**
 * 某一境的目标窗口。
 * @param {number} realm 境界序号（1 炼气、2 筑基、3 金丹、4 元婴）
 * @returns {object|null} {realm, from, to}
 */
export function cadenceOf(realm) {
  return CADENCE.find(c => c.realm === realm) || null;
}

/**
 * 这个年龄该发突破卡了吗？（窗口下界之前不发 —— 你还没到那个岁数）
 * @param {number} realm 即将突破到的境界序号
 * @param {number} age 当前年龄
 * @returns {boolean}
 */
export function reachedWindow(realm, age) {
  const window = cadenceOf(realm);
  if (!window) return true;
  return age >= window.from;
}

/**
 * 过了窗口上界没有？（迟了 ⇒ 立刻发，不能再拖）
 * @param {number} realm 即将突破到的境界序号
 * @param {number} age 当前年龄
 * @returns {boolean}
 */
export function pastWindow(realm, age) {
  const window = cadenceOf(realm);
  if (!window) return false;
  return age > window.to;
}

/**
 * 某个阶段「应该」出现哪些境界的内容（覆盖矩阵检查用）。
 * @param {string} stageId 阶段 id
 * @returns {number[]} 境界序号数组
 */
export function expectedRealmBand(stageId) {
  const stage = STAGES.find(s => s.id === stageId);
  return stage ? stage.expected : [];
}

/**
 * 这个年龄属于哪一段人生。
 * @param {number} age 年龄
 * @returns {object} 阶段
 */
export function stageOf(age) {
  for (const stage of STAGES) if (age >= stage.from && age <= stage.to) return stage;
  return STAGES[STAGES.length - 1];
}
