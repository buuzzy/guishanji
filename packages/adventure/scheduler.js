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
