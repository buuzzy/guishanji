/**
 * batch.js —— 批量实测（跑一批命，量内容覆盖度）
 * ============================================================================
 *
 * ## 它回答什么问题
 * ------------------
 * 一条命只能看出「这一条命怎么样」⇒ 覆盖度得**跑一批**才看得出：
 *   · 结局分布：玩家实际会走到哪些终章？
 *   · 道具命中：43 件道具，这条命碰到几件？**哪些一次都碰不到？**
 *   · 到达年龄：实测中位数 vs 节奏表里的窗口 —— 快了还是慢了？
 *
 * ## ⚠ 每条命都是引擎真跑出来的
 * ----------------------
 * 用的还是 `scripts/lib/decide-policy.js`（各审计脚本同一份策略）
 * ⇒ 面板跑出来的命，和门禁审计的是同一批数据。
 *
 * ⚠ 某条命中途报错 ⇒ 计入 lives 但不计入 finished，**不静默丢弃**。
 */

import { createRun, advance, choose, options } from '../../packages/adventure/engine.js';
import { currentStage } from '../../packages/adventure/gates.js';
import { decide } from '../../scripts/lib/decide-policy.js';
import { ITEMS } from '../../content/adventure.js';
import { buildBatch, ageAt } from './model.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const PATHS = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
const SCHOOLS = ['sword', 'alchemy', 'array'];

/**
 * 确定性随机数（同一串种子 ⇒ 同一串数）。
 *
 * ⚠ 为什么不用 `Math.random()`：浏览器与 Node 必须跑出**完全一样**的结果，
 *   否则门禁没法交叉比对（Node 侧算一遍、浏览器侧算一遍，两边对不上就不知道是谁错了）。
 */
export function makeRng(seed) {
  let hash = 2166136261 >>> 0;
  const text = String(seed);
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let a = hash >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 跑一条命（用偏好策略把路走完）。
 *
 * ⚠ `mode`：
 *   · `policy` 固定偏好（各审计脚本同一份策略）⇒ 命与命之间可比；
 *   · `random` 随机探索（在能点的选项里随机挑）⇒ 能撞出偏好策略永远不走的分支。
 *   两种都要有：固定策略用来对比，随机用来撞死角。
 *
 * ⚠ `spots`：**住处 / 所在地的采样**。
 *   引擎只留「当前在哪」，不留「去过哪些地方」⇒ 每轮把当前所在地与住处记下来，
 *   覆盖统计据此还原「去过的地名」（采样，不是算规则 —— 跟道具进出时间线一个道理）。
 *
 * ⚠ `issued`：**这张卡是在哪个境界、哪一段人生发出的**。
 *   引擎只留「当前在哪」，不留「这张卡当时属于哪一段」⇒ 这一条只能采样还原
 *   （跟道具进出时间线、地名覆盖一个道理）。
 *   阶段用规则层的 `currentStage()` ⇒ 与阶段闸是同一份口径。
 *
 * @returns {object} { state, seed, error, spots, issued }
 */
function runOne(index, policy, mode = 'policy') {
  const seed = '批量实测-' + index;
  const state = createRun({ seed, rulesVersion: 12 });
  const spec = {
    path: PATHS[index % PATHS.length],
    conduct: index % 3 === 0 ? 'selfish' : index % 5 === 0 ? 'cautious' : 'care',
    school: SCHOOLS[index % SCHOOLS.length],
    ending: index % 4 === 0 ? 'dao' : 'guard',
  };
  const rng = makeRng('随机实测-' + index);
  const spots = new Set();
  const issued = [];
  let guard = 0;
  try {
    while (state.phase === 'life' && guard++ < 400) {
      while (state.phase === 'life' && !state.pending) {
        if (!advance(state, 1)) break;
      }
      if (state.phase !== 'life') break;
      const cultivation = state.life?.cultivation;
      if (cultivation?.spot) spots.add(cultivation.spot);
      if (state.player?.home) spots.add(state.player.home);
      const available = options(state).filter(option => option.enabled);
      if (!available.length) break;
      /* ⚠ 采样「这张卡是在哪个境界、哪一段人生发出的」。 */
      issued.push({
        event: state.pending.event,
        realm: state.player?.realm ?? 0,
        stage: currentStage(state),
        age: ageAt(state, state.month),
      });
      let pick;
      if (mode === 'random') {
        pick = available[Math.floor(rng() * available.length)];
      } else {
        const want = decide(state, spec);
        pick = (want && available.find(option => option.id === want.id)) || available[0];
      }
      choose(state, pick.id);
    }
  } catch (error) {
    return { state, seed, error: error.message, spots: [...spots], issued };
  }
  return { state, seed, error: null, spots: [...spots], issued };
}

/**
 * 跑一批命（分批让出主线程，别把界面冻住）。
 *
 * ⚠ 返回 `{ batch, runs }` 两样：
 *   `batch` 是统计（页面画它）；`runs` 是那批命本身 ——
 *   门禁要拿 `runs` **独立重算一遍**统计，再跟 `batch` 逐条比
 *   （否则统计数字没人核对，就成了自己报自己的分）。
 *
 * @param {number} count 跑多少条
 * @param {function} onProgress 每批跑完回调一次（已跑 / 共计）
 * @param {object} options `{ mode: 'policy' | 'random' }` —— 固定偏好还是随机探索
 */
export async function runBatch(count, onProgress, options = {}) {
  const runs = [];
  const total = Math.max(1, Math.min(200, count));
  const mode = options.mode === 'random' ? 'random' : 'policy';
  for (let index = 0; index < total; index++) {
    runs.push(runOne(index, null, mode));
    /* 每 8 条让出一次主线程 ⇒ 界面还能动。 */
    if ((index + 1) % 8 === 0) {
      if (onProgress) onProgress(index + 1, total);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (onProgress) onProgress(total, total);
  return { batch: buildBatch(runs), runs, mode };
}

/**
 * 画覆盖度表。
 */
export function renderBatch(batch) {
  if (!batch) return '<p class="viz-hint">还没跑过批量实测。</p>';
  const endings = Object.entries(batch.endings).sort((a, b) => b[1] - a[1])
    .map(([title, count]) => `<div class="viz-batch-row">
      <span class="viz-batch-name">${esc(title)}</span>
      <span class="viz-batch-bar"><i style="width:${(count / Math.max(1, batch.finished) * 100).toFixed(1)}%"></i></span>
      <span class="viz-batch-count mono">${count}</span>
    </div>`).join('');
  const reach = batch.reach.map(row => `<div class="viz-batch-row">
    <span class="viz-batch-name">${esc(row.name)}</span>
    <span class="viz-batch-bar"><i style="width:${(row.count / Math.max(1, batch.finished) * 100).toFixed(1)}%"></i></span>
    <span class="viz-batch-count mono">${row.count} 条 · 中位 ${row.medianAge === null ? '—' : row.medianAge + ' 岁'}</span>
  </div>`).join('');
  const items = batch.items.map(id => `<span class="viz-item-chip">${esc(ITEMS[id]?.name ?? id)}</span>`).join('');
  return `
    <div class="viz-batch-stats">
      <span>跑了 <b class="mono">${batch.lives}</b> 条</span>
      <span>跑完 <b class="mono">${batch.finished}</b> 条</span>
      ${batch.broken ? `<span class="viz-batch-broken">中断 <b class="mono">${batch.broken}</b> 条</span>` : ''}
      <span>道具命中 <b class="mono">${batch.itemCount}</b> / ${batch.itemTotal}</span>
      <span>抉择共 <b class="mono">${batch.decisions}</b> 次</span>
      <span>经历共 <b class="mono">${batch.journal}</b> 条</span>
    </div>
    <h4 class="viz-sub">结局分布</h4>
    <div class="viz-batch">${endings}</div>
    <h4 class="viz-sub">各境到达年龄<small>中位数 vs 节奏表的窗口</small></h4>
    <div class="viz-batch">${reach || '<p class="viz-hint">这批命里没有突破记录。</p>'}</div>
    <h4 class="viz-sub">这批命碰到的道具</h4>
    <div class="viz-item-chips">${items || '<p class="viz-hint">一件都没碰到。</p>'}</div>`;
}
