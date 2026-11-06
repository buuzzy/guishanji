/**
 * 调度器 —— 每个月「谁先说话」，只在这一处决定。
 * ============================================================================
 *
 * ## 为什么要有这个文件
 * --------------------
 * 一个月里，六套规则各自都可能「插话」（境界十二、修订九、规则十、俗世生活、
 * 长线推进、人脉网络）。以前它们的先后顺序散在 `cultivation.js` 的函数体里，
 * 想调整节奏就得回到那个大函数里找 —— 而那个文件同时管着「每月做什么」和
 * 「每件事归谁」，改一处就怕碰着另一处。
 *
 * ⇒ 现在：**顺序集中在这里一个列表里**，一眼看得见，改的时候只改这一处。
 *
 * ## 顺序不能随便调
 * ----------------
 * 下面的先后是**行为的一部分**，不是风格问题：
 *   · 「境界十二」最先 —— 它管突破与寿限，是每个月最硬的那件事；
 *   · 「修订九」只在没有俗世支线时插话（有支线就先处理支线）；
 *   · 「规则十」紧随其后 —— 它管能不能修炼、能不能考核；
 *   · 「俗世生活」「长线推进」「人脉网络」按各自的节奏收尾。
 *
 * 任何一次调换都会改变玩家看到的事件顺序 ⇒ 属于**有意行为变更**，
 * 必须走「变更前基线 → 差异审查 → 变更后基线」那套流程。
 *
 * ## 契约
 * --------
 * 每个 `monthXX(state, callbacks)`：
 *   · 返回 **true**  = 这个月它安排了事情（发了事件 / 开了行动），调用方立刻收手；
 *   · 返回 **false** = 它这个月没事，交给下一个。
 */
import {month12} from './story-rules12.js';
import {revisionMonth} from './revision9.js';
import {month10} from './story-rules10.js';
import {mundaneMonth} from './mundane-life.js';
import {progressionMonth} from './progression.js';
import {networkMonth} from './story-network.js';
import {breakthroughDue} from './cadence.js';
import {ROAD_CHAINS} from '../../content/cultivation-stories.js';
import {storyOpportunity} from '../../content/cultivation-daily.js';
import {canCultivate} from './story-rules10.js';
import {CADENCE,progressNeeded} from '../../content/cadence-table.js';

const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
const seen=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;

/**
 * 里程碑档 —— 「人生节点」优先于日常档。
 *
 * ## 为什么突破要单独一档
 * ----------------------
 * 以前突破卡和「花园事故」「宗门评比」「家常信」挤在同一个候选池里，
 * 每月随机抽一张。抽不中就再等一年 —— 于是出现「突破卡等了 38 年才发出来」。
 *
 * 突破不是「这个月抽到的好事」，而是**「这个岁数该发生的事」**：
 *   · 条件齐了 ⇒ 这个月就发，不跟别的卡抢；
 *   · 没到岁数 ⇒ 不发（你还没到那个年岁）；
 *   · 过了窗口上界 ⇒ 就算进度没攒够也发（寿元不等人）。
 *
 * ⇒ 窗口由 `content/cadence-table.js` 定，**上下界都由它保证**：
 *   突破年龄必然落在 [窗口下界, 窗口上界] 里。
 *
 * ## 判断在哪里
 * ------------
 * 「该不该发」这句话写在 `packages/adventure/cadence.js`（`breakthroughDue`）——
 * 那是**唯一一份**判断。`story-rules12.js` 的修行指导卡也要问同一句，
 * 两边才不会各说各话。
 *
 * ## 只管当前版本
 * --------------
 * 旧规则版本（5–11）各有自己的执行器与候选池，**一律照原样走** ——
 * 改它们会动到历史基线（rules5–rules11 的逐值全等门禁）。
 */
export function milestoneMonth(state, callbacks) {
  const due = breakthroughDue(state);
  if (!due) return false;
  callbacks.arrive(due.id);
  return true;
}

/**
 * 长线档 —— 「人生的某一段该开始的那件事」。
 *
 * ## 为什么长线也要单独一档（2026-11-08 · 世界域）
 * --------------------------------------------------
 * 以前长线是**混在候选池里随机抽**的（`packages/adventure/cultivation.js` 里
 * `possible[Math.floor(random(s,'events')*possible.length)]`）。后果是：
 *   · 长线在候选池里**排队**，轮不到就永远轮不到 ——
 *     窗口只有 12 年时，很多人生里一条长线都没能发出来
 *     （实测：加上年龄上界后，`sect_repair` 40 条人生只触发 2 条）。
 *   · 抽签结果依赖「这个月还有没有别的卡」，于是**改一处动一处** ——
 *     内容在不在，成了一件由抽签顺序说了算的事。
 *
 * ## 现在的做法
 * ------------
 * 长线**不跟别的卡抢**：条件齐了 ⇒ 这个月就发。
 * 条件全部写在 `longChainDue()` 里，**不含随机数** ⇒
 * 给定同一条人生，该发哪条长线、什么时候发，**每次都一样**。
 *
 * · 「有没有机会」由种子决定（`storyOpportunity` 里，当前版本用哈希而不是随机流）；
 * · 「发哪一条」按 `age` 升序取第一条满足的 ⇒ 不随机；
 * · 玩家在长线期间（`activeChain`）不会开新长线 ⇒ 长线之间不会打架。
 *
 * ⚠ 只管当前版本（规则十二）：旧规则版本（5–11）各有自己的候选池，一字未动。
 */
export function longChainMonth(state, callbacks) {
  const due = longChainDue(state);
  if (!due) return false;
  const cultivation = state.life.cultivation;
  cultivation.activeChain = due.chain.id;
  cultivation.context = due.chain.context;
  if (due.chain.path === 'orthodox') {
    callbacks.apply({people: {trialmate: {known: true, location: state.player.location}}});
  }
  if (due.chain.path === 'loose' && state.people.ally.status === 'alive') {
    callbacks.apply({people: {ally: {known: true, location: state.player.location}}});
  }
  callbacks.arrive(due.chain.id + '_0');
  return true;
}

/**
 * 「下一条该发的长线」—— **纯判断，不含随机数**。
 *
 * 条件与原来候选池里那一条一致，另外加了两条：
 *   · `age(s) <= chain.ageEnd` —— 长线有年龄上界（`content/cultivation-stories.js`）；
 *   · 机会窗口用 `chain.age ~ chain.ageEnd` —— 窗口由内容定，不随时序漂移。
 *
 * @returns {{chain: object}|null} 该发的长线（连同它自己），没有就返回 null
 */
export function longChainDue(state) {
  const cultivation = state.life.cultivation;
  if (cultivation.activeChain) return null;
  /*
   * ⚠⚠ 这几条检查与突破卡档（`cadence.js` 的 `breakthroughDue`）**一模一样** ——
   *   少了任何一条都会出事：
   *   · 没有 `journey.open` ⇒ 玩家正在赶路/闭关时，长线卡会插队发出来，
   *     **打断进行中的行动**（实测：人生从 306 岁掉到 63 岁，一半的人卡在凡身）；
   *   · 没有 `pending` / `waiting` ⇒ 玩家正要回应某张卡时又被塞一张；
   *   · 没有 `detained` / `inquiry` ⇒ 看管与查问期间不该开新线；
   *   · 没有「队列里有事先办」⇒ 长线自己的后续步骤（`_1`、`_2`）还在队列里，
   *     就会先开一条新的线，两条线打架。
   */
  if (!state.journey || !state.journey.open) return null;
  if (state.pending || state.waiting) return null;
  if (cultivation.detained || cultivation.inquiry) return null;
  if (cultivation.queue.some(q => q.due <= state.month)) return null;
  /* ⚠ `cultivation.continent` 一定是合法的大陆编号（`validateCultivation` 守着），
     ⇒ 这里直接读它即可，不必绕 `currentContinent`（那会引入循环依赖）。 */
  const here = cultivation.continent;
  /*
   * ⚠⚠ **长线给突破卡让路**（与 S4「修行指导卡给突破卡让路」同向）。
   *
   * 为什么必须有这条：
   *   长线一开，`activeChain` 就占住 ⇒ `breakthroughDue` 里的 `activeChain` 检查会挡住突破卡
   *   ⇒ 突破卡在长线走完之前发不出来。
   *   ⇒ 而长线三段要走好几年 ⇒ **窗口会被吞掉**：
   *   实测炼气突破卡最晚拖到 24 岁，超出 12–22 的窗口。
   *
   * ⇒ 玩家已经在某个境界的窗口里、进度也攒够了 ⇒ **先让他突破**，别用长线把他卡住。
   *   （进度不够、或四次机会用完了的人除外 —— 那种人生本来就该慢下来。）
   */
  const nextRealm = state.player.realm + 1;
  const band = CADENCE.find(w => w.realm === nextRealm);
  if (band && age(state) >= band.from
      && cultivation.progress >= progressNeeded(nextRealm)
      && (cultivation.attempts[nextRealm] || 0) < 4) return null;
  for (const chain of ROAD_CHAINS) {
    if (chain.path !== cultivation.path) continue;
    if (chain.id === 'dark_method' && !cultivation.network.method) continue;
    if (chain.path === 'orthodox' && chain.id !== 'sect_return' && here !== state.birth.continent) continue;
    if (!canCultivate(state)) continue;
    if (age(state) < chain.age || age(state) > chain.ageEnd) continue;
    if (state.player.realm < chain.realm) continue;
    if (seen(state, chain.id + '_0')) continue;
    if (state.month < cultivation.punishmentUntil) continue;
    if (!storyOpportunity(state, chain.id, chain.age, chain.ageEnd, chain.chance ?? .62)) continue;
    return {chain};
  }
  return null;
}

/**
 * 跑一遍这个月的调度。
 *
 * @param {object} state 当前人生状态
 * @param {object} callbacks 引擎给的一组回调（apply / arrive / log …）
 * @returns {boolean} 这个月有没有被某套规则安排了事情
 */
export function scheduleMonth(state, callbacks) {
  const cultivation = state.life.cultivation;
  /* 境界十二：突破与寿限 —— 最硬的那件事，先问它。 */
  if (month12(state, callbacks)) return true;
  /* 里程碑档：突破这种人生节点，不跟日常卡抢。 */
  if (milestoneMonth(state, callbacks)) return true;
  /* 长线档：人生某一段该开始的那件事，也不跟日常卡抢。 */
  if (longChainMonth(state, callbacks)) return true;
  /* 修订九：只在没有俗世支线时插话。 */
  if (!cultivation.mundane?.arc && revisionMonth(state, callbacks)) return true;
  /* 规则十：能不能修炼、能不能考核。 */
  if (month10(state, callbacks)) return true;
  /* 俗世生活。 */
  if (mundaneMonth(state, callbacks)) return true;
  /* 长线推进。 */
  if (progressionMonth(state, callbacks)) return true;
  /* 人脉网络。 */
  if (networkMonth(state, callbacks)) return true;
  return false;
}
