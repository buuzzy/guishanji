/**
 * 节奏域 —— 「这个月该不该发突破卡」的唯一判断。
 * ============================================================================
 *
 * ## 为什么单独一个文件
 * --------------------
 * 以前这句话被写在两个地方：
 *   · `packages/adventure/scheduler.js` 的里程碑档 —— 决定**发不发卡**；
 *   · `packages/adventure/story-rules12.js` 的 `month12` —— 决定**要不要改发别的卡**。
 *
 * 两处各写一遍，就会有「这里以为该发、那里以为不该发」的时候。
 * 实测就撞上过：修行指导卡（闭关四年）抢在突破卡前面发出去，
 * 等闭关出来，人已经 24 岁 —— **炼气窗口（12–22 岁）被这四年吞掉了**。
 *
 * ⇒ 现在：**判断只有这一份**（`breakthroughDue`），
 *   调度器照它发卡，指导卡照它让路。两边永远说同一句话。
 *
 * ## 本文件对外的两件事
 * --------------------
 *   · `breakthroughDue(state)` —— 这个月**该不该**发突破卡（发不发）；
 *   · `breakthroughStatus(state)` —— **离冲关还差什么**（发不发之外，界面要说的）。
 *
 * 后者是 2026-11-07 新增的：以前两端界面各写各的门槛、各写各的提示，
 * 规则层一改，界面就说谎（用户撞到的「进度条满了却几十年没动静」就是这么来的）。
 *
 * ## 这份判断归谁管
 * ----------------
 * 节奏域（`pace`）。它只读：
 *   · `content/cadence-table.js` —— 窗口、门槛、冲关参数（数据）；
 *   · `packages/adventure/progression.js` —— 材料槽（筑基以上要不要先备齐主药）；
 *   · `packages/adventure/story-rules10.js` —— 有没有灵根、能不能修行。
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 */
import {CADENCE, progressNeeded, METHOD_MONTHS, MATERIAL_TIERS, cadenceOf} from '../../content/cadence-table.js';
import {canCultivate} from './story-rules10.js';
import {materialSlots} from './progression.js';

/**
 * 年龄 —— 规则层各处都用同一口径（`Math.floor(month/12) + 出生年龄`）。
 * @param {object} state 当前人生状态
 * @returns {number} 年龄
 */
function ageOf(state) {
  return Math.floor(state.month / 12) + (state.birth.startAge || 0);
}

/**
 * 这一月要不要发突破卡？
 *
 * @param {object} state 当前人生状态
 * @returns {{realm:number,id:string,urgent:boolean}|null}
 *   `urgent` = 已经过了窗口上界（寿元不等人，这一发是强推）。
 */
export function breakthroughDue(state) {
  const cultivation = state.life && state.life.cultivation;
  /* 只管当前版本 —— 旧规则版本（5–11）各有自己的执行器与候选池，一律照原样走。 */
  if (!cultivation || cultivation.rulesVersion !== 12) return null;

  const player = state.player;
  if (player.realm >= 4) return null;                 /* 已是最高境，没有下一境 */
  if (cultivation.path === 'mortal') return null;     /* 凡俗路不修行 */
  if (!canCultivate(state)) return null;             /* 没有灵根，练不了 */
  if (!cultivation.admissionDone) return null;       /* 还没入门 */
  if (!state.journey || !state.journey.open) return null;
  if (state.pending || state.waiting) return null;

  const realm = player.realm + 1;
  const window = CADENCE.find(w => w.realm === realm);
  if (!window) return null;
  const age = ageOf(state);

  /*
   * ⚠⚠ **窗口上界时，突破卡可以插队**（寿元不等人）。
   *
   * 为什么：
   *   长线一开，`activeChain` 就占住 ⇒ 突破卡发不出来 ⇒ 而长线三段要走好几年
   *   ⇒ 窗口会被吞掉（实测炼气突破卡最晚拖到 24 岁，超出 12–22 的窗口）。
   *   长线那边已经做了「给突破卡让路」（进度够就先突破），
   *   但**进度不够的人**仍会被卡住 ⇒ 需要这里留一个出口：
   *   **窗口到上界了 ⇒ 突破卡插队**，哪怕这次冲关大概率失败，
   *   也比「错过整个窗口、一辈子卡在炼气」强。
   *
   * ⚠ 只放宽 `activeChain` 这一条；队列里的事先办（家信、战事、长线步骤）仍然挡着 ——
   *   插队不能打断别人已经排好的行程。
   */
  const urgent = age >= window.to;
  if (cultivation.activeChain && !urgent) return null;
  if (cultivation.detained || cultivation.inquiry) return null;
  /* 排好的事先办（家信、战事、长线步骤）—— 里程碑不插队。 */
  if (cultivation.queue.some(q => q.due <= state.month)) return null;

  /*
   * ⚠⚠ **这里没有「不到岁数就不发」的判断**（2026-11-07 改掉）。
   *
   * 以前这里有一句 `if (age < window.from) return null;` ——
   * 「28 岁才能筑基、95 岁才能结丹」。这规矩在修仙小说里根本不存在：
   * 突破看的是积累、丹药、功法与感悟，年龄只通过**寿元**起作用。
   * 而且它正是 2026-11-07 用户撞到的那个病的根：
   * 规则层按 60 算、界面层按 260 画条 ⇒ 条满了也发不出卡 ⇒ 干等 22–90 年。
   *
   * ⇒ 现在：**门槛只认进度**（`progressNeeded`）。窗口降为「典型值」，
   *   只在过了上界时催一把（`urgent`），下界不再拦人。
   */
  const attempt = cultivation.attempts[realm];
  if (attempt >= 4) return null;                     /* 四次机会用完了 */
  if (state.month < cultivation.retryAt) return null; /* 上次尝试后要歇一阵 */

  /*
   * ⚠⚠ **入门链没走完（主修心法还没定）⇒ 不发炼气冲关卡**（2026-11-08 · 阶段 3.1 实测踩到）。
   *
   * ## 这条卡为什么会「点不动」
   * --------------------------
   * 冲关卡上有三条退路：
   *   · 「备好材料，开始闭关」—— 要灵石（炼气这一级 2 枚），常常点不动；
   *   · 「先为材料持有者做工，再闭关」—— **不花灵石**，是穷人的那条路；
   *   · 「再准备一段时间」—— 白等 12 个月冷却。
   * 而**中间那条的可见性判的是「主修心法已定」**
   * （`content/story-rules12.js`：`o.visible = s => ... && !!c(s).network.method && ...`）
   * ⇒ **心法没定 ⇒ 这张卡上只剩「点不动」与「白等」两条** ⇒ 一张废卡。
   *
   * ## 这是老毛病，不是新引入的
   * --------------------------
   * 实测 40 条命（阶段 3 之前的代码）：**7 条**踩到（冲关卡发出来时心法还没定）；
   * 阶段 3.1 在开局加了一张背景卡（把整条入门链往后推几个月）⇒ 变成 **13 条**，
   * 炼气踏入年龄的中位数从 22 岁被推到 25.5 岁 ⇒ **超了 12–22 的窗口**。
   *
   * ## 为什么这里修，而不是把心法卡往前挪
   * ------------------------------
   * 心法那张卡什么时候到，由「授业之后 12 个月」这条**内容里的时间**说了算
   * （`story-network.js` 的 `methodDue = first_method + 12`）；
   * 冲关卡什么时候到，由**进度够不够**说了算。
   * 两件事各算各的 ⇒ 谁先谁后**本来就没有保证** ⇒ 今天这次是心法在前、下次可能反过来。
   * ⇒ 只能由**唯一那份判断**来保证顺序（就像「金丹/元婴缺材料就不发卡」那样）。
   *
   * ## 判据：心法那张卡**还没出过**
   * --------------------------
   * 玩家可以在心法卡上选「继续已有的练习」（不要新心法）⇒
   * 那张卡**已经出过**了 ⇒ 冲关卡照旧发（行为一个字不变）。
   * ⇒ 只拦「那张卡还没发出来」的情况 ⇒ 拦的正是「心法还没定」这一种。
   */
  if (realm === 1) {
    const net = cultivation.network;
    const methodSeen = state.decisions.some(d => d.event === 'network_method')
      || (state.pending && state.pending.event === 'network_method');
    if (net && !net.method && !methodSeen) return null;
  }

  /*
   * 金丹与元婴要**主药与完整法门**才准发卡 —— 筑基不要。
   *
   * ## 为什么筑基不设材料门槛
   * --------------------------
   * 筑基这一级的卡上本来就有一条「不备齐护脉药，强行冲关」（可能死），
   * 而且筑基丹是**加成**不是门票（`packages/adventure/story-rules12.js` 里
   * 有丹 +16 分，没丹也能硬冲）—— 所以筑基不需要再拦一道。
   *
   * ## 为什么金丹与元婴要拦
   * ----------------------
   * 这两级的卡上**没有**「强行冲关」那条退路（只有「备好材料，开始闭关」
   * 与「再准备一段时间」）。若材料没齐也发卡，玩家只能选「再准备」，
   * 白等一年（冷却 12 个月）—— 那就是**发了一张什么也干不了的卡**。
   * ⇒ 所以这一级把材料与功法挡在**发卡之前**：不发卡，胜过发一张废卡。
   *
   * 门槛数字一律从表里读（`MATERIAL_TIERS` / `METHOD_MONTHS`），
   * 不在这里另写一份。
   */
  if (MATERIAL_TIERS.indexOf(realm) >= 0) {
    const slots = materialSlots(state, realm);
    if (!slots.every(x => x[0])) return null;
    const methodMonths = cultivation.network && cultivation.network.method
      ? cultivation.network.method.months : 0;
    if (methodMonths < (METHOD_MONTHS[realm] || 0)) return null;
  }

  /* 进度：攒够了就早突破；没攒够、又快过窗口上界了 ⇒ 强推（寿元不等人）。 */
  if (!urgent && cultivation.progress < progressNeeded(realm)) return null;

  const id = 'breakthrough_' + realm + '_' + attempt;
  /*
   * ⚠⚠ **「再准备一段时间」（wait）不算「这张卡已经答过」**。
   *
   * 以前这里是 `state.decisions.some(d => d.event === id)` ——
   * 于是玩家一旦在突破卡上选「再准备一段时间」，**这一境的突破卡就再也不发了**
   * （实测：选一次 wait 之后卡再也不来，人一辈子卡在凡身，79 岁还在原地）。
   * 而「再准备一段时间」的意思明明是「还没准备好，过些日子再来」——
   * 规则层也确实把冷却期设成 12 个月（`cultivation.js` 的 `retryAt`），
   * 显然是想让这张卡**过些日子再来**，结果却被这句判断挡死了。
   *
   * ⇒ 现在：只有**真的去冲了**（try / service / force，消耗一次机会）才算答过；
   *   选「wait」不消耗机会（机会只有四次，不能被「再等等」花光），
   *   冷却期过后同一张卡重新发出来。
   */
  const answered = state.decisions.some(d => d.event === id && d.choice !== 'wait');
  if (answered) return null;
  if (state.pending && state.pending.event === id) return null;

  return {realm, id, urgent};
}

/**
 * 突破状态 —— 「离冲关还差什么」的一份**只读**答案。
 *
 * ## 谁在用
 * --------
 * 两端界面都要回答同一个问题：**进度条满了，接下来还缺什么？**
 * 以前两边各写一份（还各写各的门槛）⇒ 一次规则改动就让界面说谎。
 * ⇒ 现在只问规则层这一份函数，两端都照它渲染。
 *
 * ## 字段
 * -----
 *   realm / realmName  即将突破到的境界
 *   progress / need / pct  修为：当前值、门槛、百分比（进度条就画这个）
 *   ready              条件是否齐了（进度够 + 主药齐 + 完整心法够）
 *   materials          主药槽逐项（`{ready, label}`）
 *   methodMonths / methodNeed  完整心法：已练月数 / 还差多少月（0 = 这一级不限）
 *   yearsLeft          还能活几年（寿元压力；不知道时为 null）
 *   window             这一境的典型年龄窗口 `{from, to}`
 *   advice             一句话：还差什么（界面直接显示这句，不自己拼）
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 *
 * @param {object} state 当前人生状态
 * @returns {object|null} 没有下一境时返回 null
 */
export function breakthroughStatus(state) {
  const cultivation = state.life && state.life.cultivation;
  if (!cultivation) return null;
  const player = state.player;
  if (player.realm >= 4) return null;

  const realm = player.realm + 1;
  const window = cadenceOf(realm);
  const need = progressNeeded(realm);
  const progress = cultivation.progress || 0;
  const pct = need ? Math.min(100, progress / need * 100) : 100;

  /* 主药槽：只有金丹与元婴要（筑基不设材料门槛）。 */
  const slots = MATERIAL_TIERS.indexOf(realm) >= 0 ? materialSlots(state, realm) : [];
  const materials = slots.map(x => ({ready: !!x[0], label: x[1]}));

  /* 完整心法：练够多少个月才准冲关。 */
  const methodNeed = METHOD_MONTHS[realm] || 0;
  const methodMonths = cultivation.network && cultivation.network.method
    ? cultivation.network.method.months : 0;

  /* 寿元：读规则层算好的实际寿元（`state.life.cultivation.lifespanLimit`）。
     ⚠ 刻意**不** import `story-rules12.js` —— 那个文件 import 本文件，
        反向 import 会成环（小程序打包会直接崩）。 */
  const limit = cultivation.lifespanLimit;
  const yearsLeft = typeof limit === 'number' && limit > 0 ? limit - ageOf(state) : null;

  const missing = [];
  if (need > 0 && progress < need) missing.push('修为还差 ' + Math.ceil(need - progress) + ' 点');
  const lack = materials.filter(x => !x.ready);
  if (lack.length) missing.push('主药还缺 ' + lack.length + ' 样（' + lack.map(x => x.label).join('、') + '）');
  if (methodNeed > 0 && methodMonths < methodNeed) {
    missing.push('完整心法还差 ' + Math.ceil((methodNeed - methodMonths) / 12) + ' 年');
  }

  const parts = missing.slice();
  if (yearsLeft !== null) parts.push('还能活 ' + Math.max(0, yearsLeft) + ' 年');

  return {
    realm,
    realmName: window ? window.name : '',
    progress,
    need,
    pct,
    ready: need === 0 || (progress >= need && lack.length === 0 && (methodNeed === 0 || methodMonths >= methodNeed)),
    materials,
    methodMonths,
    methodNeed,
    yearsLeft,
    window: window ? {from: window.from, to: window.to} : null,
    missing,
    advice: parts.join(' · '),
  };
}
