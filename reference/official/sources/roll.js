/**
 * roll.js — 出生转盘（小程序端）
 * =================================
 *
 * 位置：**主包**。
 * 官方 v0.8.13 的引擎把分包（subpkg/engine）挤到只剩 3.2 KB 余量；
 * 本模块**不 require 官方引擎**（引擎 API 由调用方当参数传进来），
 * 所以搬到主包，给分包腾出 3.9 KB。微信允许分包 require 主包，反过来不行。
 *
 * 官方口径（engine: chooseCountry）：
 *   按出生数抽取 → 每个国家权重 = 该国当年的出生数 c.b
 *   按人口抽取   → 权重 = 该国当年的人口 c.pop
 *   「过去的世界」→ 先用 eraAt() 把国家数据换算到那一年，再取权重
 *
 * 转盘本身：这段人生在开跑前就已经抽定（官方也是如此），
 * 转盘只是把「抽定的结果」演出来 —— 最后一帧必须落在真正出生的国家。
 * 中间帧按真实占比随机滚动，所以看起来和官方一样是「转出来的」。
 */
/** 帧数（官方转盘的滚动帧数） */
const FRAMES = 26;

/** 出生年：现在=当年，过去=指定年，未来=指定年 */
const NOW_Y = 2026;
const ERA_Y0 = 1950;

/**
 * 建池：按官方口径算出每个国家的权重。
 * @param {object} api  官方引擎 API
 * @param {object} S    当前人生
 * @param {string} mode 'birth' | 'pop'
 */
function buildPool(api, S, mode) {
  const by = S.era && S.era !== 'now' ? S.by : null;
  const list = [];
  let totalB = 0;
  let totalP = 0;
  for (const c0 of api.COUNTRIES) {
    const c = by && api.eraAt ? api.eraAt(c0, by) : c0;
    const b = c.b > 0 ? c.b : 0;
    const p = c.pop > 0 ? c.pop : 0;
    totalB += b;
    totalP += p;
    const w = mode === 'pop' ? p : b;
    if (w > 0) list.push({ id: c.id, name: c.ko, w, c });
  }
  return { list, totalB, totalP, by, mode };
}

/** 按权重抽一个国家 */
function pick(pool) {
  const total = pool.mode === 'pop' ? pool.totalP : pool.totalB;
  const r = Math.random() * total;
  let acc = 0;
  for (const it of pool.list) {
    acc += it.w;
    if (r <= acc) return it;
  }
  return pool.list[pool.list.length - 1];
}

/**
 * 开跑转盘。
 *
 * 官方节奏（ui.zh-hans:26798-26806）逐字照抄：
 *   const frames = 26; let i = 0;
 *   const step = () => {
 *     i++;
 *     const c = i >= frames ? target : EL[wpick(w)];
 *     $('#rollName').textContent = c.ko;
 *     $('#rollMeta').textContent = rndY ? `확률 …` : `확률 …`;
 *     if (i < frames) setTimeout(step, 40 + Math.pow(i / frames, 3) * 380);
 *     else setTimeout(showCert, 650);
 *   };
 *   step();
 *
 * @param {object} pool    buildPool 的结果
 * @param {string} targetId 真正出生的国家（最后一帧强制停在这里）
 * @param {function} onFrame 每帧回调 (frame)
 * @param {function} onDone  定格回调
 */
function create(pool, targetId, onFrame, onDone) {
  let i = 0;
  let timer = null;
  let stopped = false;

  const step = () => {
    if (stopped) return;
    i++;
    const last = i >= FRAMES;
    const it = last ? pool.list.find((x) => x.id === targetId) || pick(pool) : pick(pool);
    onFrame({ name: it.name, id: it.id, i, last, share: shareOfItem(it, pool) });
    if (!last) {
      // 官方：40 + (i/frames)^3 * 380 —— 越接近定格越慢
      timer = setTimeout(step, 40 + Math.pow(i / FRAMES, 3) * 380);
      return;
    }
    // 官方：最后一帧之后等 650ms 再出登记卡
    timer = setTimeout(() => { if (!stopped) onDone(); }, 650);
  };

  step();   // 官方：第一次立刻走，没有额外延时

  return {
    stop() {
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
}

/** 出生年的概率份额（官方 ui:7252 share） */
function shareOf(c, pool) {
  const total = pool.mode === 'pop' ? pool.totalP : pool.totalB;
  const w = pool.mode === 'pop' ? c.pop : c.b;
  return total > 0 ? w / total : 0;
}

/** 池里某一项的份额（官方 share(c) 用的是那一国的出生数/人口） */
function shareOfItem(it, pool) {
  return it && it.c ? shareOf(it.c, pool) : 0;
}

module.exports = { FRAMES, NOW_Y, ERA_Y0, buildPool, create, shareOf, shareOfItem };
