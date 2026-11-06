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
 * ## 这份判断归谁管
 * ----------------
 * 节奏域（`pace`）。它只读：
 *   · `content/cadence-table.js` —— 窗口、门槛、冲关参数（数据）；
 *   · `packages/adventure/progression.js` —— 材料槽（筑基以上要不要先备齐主药）；
 *   · `packages/adventure/story-rules10.js` —— 有没有灵根、能不能修行。
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**（微信转译会改变作用域边界）。
 */
import {CADENCE, progressNeeded} from '../../content/cadence-table.js';
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

  if (age < window.from) return null;                /* 还没到岁数 */
  const attempt = cultivation.attempts[realm];
  if (attempt >= 4) return null;                     /* 四次机会用完了 */
  if (state.month < cultivation.retryAt) return null; /* 上次尝试后要歇一阵 */

  /* 筑基以上还要材料与功法 —— 这两样不是「攒进度」能替代的。 */
  if (player.realm >= 2) {
    const slots = materialSlots(state, realm);
    if (!slots.every(x => x[0])) return null;
    const methodMonths = cultivation.network && cultivation.network.method
      ? cultivation.network.method.months : 0;
    if (methodMonths < (realm === 3 ? 120 : 240)) return null;
  }

  /* 进度：攒够了就早突破；没攒够、又快过窗口上界了 ⇒ 强推（寿元不等人）。 */
  if (!urgent && cultivation.progress < progressNeeded(realm)) return null;

  const id = 'breakthrough_' + realm + '_' + attempt;
  if (state.decisions.some(d => d.event === id)) return null;
  if (state.pending && state.pending.event === id) return null;

  return {realm, id, urgent};
}
