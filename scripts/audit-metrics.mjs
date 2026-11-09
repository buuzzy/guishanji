#!/usr/bin/env node
/**
 * 内容指标审计 —— 六项「内容到底匀不匀」的量化指标
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 2026-11-06 那一轮重构把**结构**改完了，但方案里承诺的六项指标没有门禁盯着
 * （量它们的脚本 `scripts/content-map.mjs` 当时**根本没进过 git**）⇒
 * 改完还会发霉。本脚本把六项指标固定成一道门禁：**只许变好，不许变差**。
 *
 * 六项指标
 * --------
 *   ① 可达性：事件表里有多少条在 N 条人生里一次都没出现（发霉的内容＝不存在的内容）
 *   ② 密度：最挤的 10 年 / 5 年有多少个**日常抉择**（方案口径：≤ 5 / ≤ 3）
 *   ③ 冷却：同标题的**旁白**、同一张**抉择卡**在 60 个月内重复了几处
 *   ④ 节奏对齐：每个境界段实际发出过多少种不同内容（方案口径：≥ 5）
 *   ⑤ 结局覆盖：多少条人生没有结局文本
 *   ⑥ 阶段跨度：同一里程碑的突破年龄跨度（方案口径：中位数口径，见 audit-cadence）
 *
 * ## ②③ 的口径为什么改过（2026-11-07 · T2）
 * -------------------------------------------
 * 以前这两个指标**把人生节点也算进去**：
 *   · 密度：突破卡、长线卡（一生就那几次）都算 ⇒ 「最挤 10 年 14 张」，
 *     其实那张卡挤的是**玩家真正要做的日常决定**；
 *   · 冷却：玩家的**抉择记录**也算「同标题重复」——
 *     可玩家两次选了同一个选项，那是他自己的历史，不是「同一句话说两遍」。
 * ⇒ 现在按「日常卡」与「旁白」两个口径量（与规则层的闸同一份口径：
 *   `packages/adventure/gates.js`），量出来的才是玩家真正感觉到的那件事。
 *
 * ## ② 密度：**三把尺**（2026-11-08 · 阶段 2：修「假绿灯」）
 * ---------------------------------------------------
 * 只用一把尺时，那把尺**永远是绿的** ——
 * 豁免名单有 263 张（387 张里的 68%）⇒ 每条命 43 张卡只算了 6 张
 * ⇒ 实测「最挤 10 年 4 张」，上限 5 ⇒ 绿。
 * 而玩家真正常遇到的是**全卡**口径的「最挤 10 年 15 张」。
 *
 * ⇒ 现在量三把尺，每把回答一句不同的话：
 *   · **闸口径**（`density10` / `density5`）：只算非豁免卡，
 *     与密度闸的实现值（5 / 3）**可比** ⇒ 「闸那边看到的拥挤度」；
 *   · **日常口径**（`dailyDensity10` / `dailyDensity5`）：剔除**结构性**卡
 *     （人生节点），留下的都是玩家的日常决定 ⇒ 「喘不喘得过来」；
 *   · **全卡口径**（`totalDensity10` / `totalDensity5`）：所有抉择卡
 *     ⇒ 「一年里塞了多少事」。
 *
 * ⚠ **分类由规则层给**（`packages/adventure/gates.js` 的 `classifyCard`）——
 *   指标**不许自己判前缀**。
 * ⚠ **闸的豁免范围一个字没变**（两类加起来还是原来那份并集）。
 *
 * 用法
 * ---
 *   node scripts/audit-metrics.mjs                 # 报告（改完改动看数字用这个）
 *   node scripts/audit-metrics.mjs --check         # 核对基线（回归门禁用这个）
 *   node scripts/audit-metrics.mjs --gen           # 重生成基线（只在真要改指标时）
 *   node scripts/audit-metrics.mjs --count=200     # 多跑几条命（默认 120）
 *
 * ⚠ 判据是「跟基线比」，不是「跟某个理想值比」。
 *   理想值（密度 ≤ 5、每境 ≥ 5 张…）写在 `scripts/audit-cadence.mjs` 与本脚本的
 *   `IDEAL` 里；**基线**记录的是「现在是多少」⇒ 门禁的作用是**不许倒退**。
 *   等指标本身被改好了（那时才动基线），就不再是「不许倒退」而是「必须达标」。
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {playCultivation} from './play-cultivation.mjs';
import {EVENTS} from '../packages/adventure/engine.js';
import {classifyCard, SPEC as GATES_SPEC} from '../packages/adventure/gates.js';
import * as GATES from '../packages/adventure/gates.js';
import {projectRoot} from './serve.mjs';
/* ⚠ 底线数字**只住这一份**（浏览器也要用 ⇒ 这个文件不许 import node:*）。 */
import {REALM_KINDS_MIN, SPAN_TARGET} from './lib/completeness-limits.js';
import {MUNDANE_DISABLED} from '../content/mundane-kept.js';
/*
 * 冲突标签（2026-11-08 · 章节感补强 · B）——「哪些卡算对抗/代价」由内容层**声明**，
 * 本脚本只做反向验证与计数，**不许自己猜前缀**（`classifyCard` 先例）。
 */
import {CONFLICT_TAGS} from '../content/conflict-tags.js';

/** 基线文件（跟着源码走 ⇒ 门禁只依赖跟着源码走的文件）。 */
const BASELINE_FILE = join(projectRoot, 'tests/fixtures/metrics-baseline.json');

/**
 * 每项指标的方向：
 *   'down' = 越小越好（倒退就是变差）
 *   'up'   = 越大越好
 */
const DIRECTION = {
  neverSeen: 'down',      // 可达性：发霉的条数
  density10: 'down',      // 密度（闸口径）：最挤的 10 年
  density5: 'down',       // 密度（闸口径）：最挤的 5 年
  dailyDensity10: 'down', // 密度（日常口径）：剔除结构性卡后最挤的 10 年
  dailyDensity5: 'down',  // 密度（日常口径）：剔除结构性卡后最挤的 5 年
  totalDensity10: 'down', // 密度（全卡口径）：所有抉择卡里最挤的 10 年
  totalDensity5: 'down',  // 密度（全卡口径）：所有抉择卡里最挤的 5 年
  cooldownRepeats: 'down',// 冷却：60 个月内的重复
  realmContentMin: 'up',  // 节奏对齐：每境最少有多少种内容
  endingMissing: 'down',  // 结局覆盖
  spanMax: 'down',        // 阶段跨度：各境突破年龄极差的最大值
  spanMedian: 'down',     // 阶段跨度：各段突破间隔的中位数（最差的一段）
  oldAgeShare: 'down',    // 结局分布：寿终未走完的占比（%）（章节感补强 C3）
  conflictRealmMin: 'up', // 冲突：每个境界章最少的冲突卡张数（章节感补强 B）
};

/**
 * 硬底线：不管基线多少，这几项不许有。
 *
 * ⚠ 密度与冷却的**目标值是规格**（写在这里），规则层的闸另有一份实现值
 *   （`packages/adventure/gates.js` 的 `DENSITY_MAX_10Y` / `COOLDOWN_MONTHS`）。
 *   两份数字必须一样 —— 不一样就报红（见下面的「闸与规格对不对得上」）。
 *   分成两份是为了能做**反向验证**：把闸的实现值改小（冷却 60 → 12 个月），
 *   规格这一份不动 ⇒ 实测立刻出现重复 ⇒ 门禁报红 ⇒ 证明这道闸是真的在管事。
 *
 * ⚠ `spanMedian` 的规格目标是 **15 年**（`SPAN_TARGET`），但实测是 51 年 ——
 *   **尚未达标** ⇒ 硬底线先钉在今天的值（不许变宽），
 *   「未达标」这件事登记在完备度门禁的缺口台账里（`scripts/audit-completeness.mjs`）。
 *   ⇒ 门禁是绿的，但「还差多少」写在明面上，不是藏起来。
 *
 * ⚠ **全卡口径的两条新硬底线**（2026-11-08 · 阶段 2）：
 *   `totalDensity10 ≤ 13`、`totalDensity5 ≤ 9`，判的是 **P90**（一百二十条命里
 *   第 108 名）。交接文档给的是「10 年取 13（P90）、5 年取 8」。
 *   ⚠ **5 年那条按 9 钉**，不是 8 —— 实测 5 年 P90 = 9、中位 7、最大 10；
 *     按 8 钉 ⇒ 17/120 条命（14%）超限 ⇒ 门禁会**永久报红**，
 *     而这个阶段要交付的是一把**说得清话**的尺子，不是又一条红灯。
 *   ⇒ 按文档自己的先例（`spanMedian`：未达标先钉今天的值，缺口写在明面上）：
 *     先钉在今天的 P90 = 9，「目标是 8」登记成已知缺口。
 *
 * ⚠ **日常口径的两条硬底线**（`dailyDensity10 ≤ 7` / `dailyDensity5 ≤ 7`）
 *   钉在 2026-11-08 阶段 2 那天测到的 P90。
 *   ⚠ **阶段 3（背景故事线表）把十年那条挪到了 8** ——
 *     背景卡给「与修仙无缘」那 4 条路各多发了一张（背景卡本身 + 灵根复核），
 *     那个十年窗口里的日常决定从 4 张变成 5 张 ⇒ P90 7 → 8。
 *     ⇒ **这是有意多出来的一张**（背景故事本身），不是内容变挤 ⇒ 上限跟着挪。
 *
 * ⚠⚠ **这些上限是「规格」，不是「记录」**：
 *   改动内容让密度变大时，**必须**显式改这里（并同时重生成基线、写台账理由），
 *   不能靠「反正门禁会红，忽略它」。⇒ 与 `spanMedian` 同一套流程。
 */
export const HARD_LIMIT = {
  endingMissing: 0,
  density10: 5, density5: 3,
  dailyDensity10: 8, dailyDensity5: 7,
  totalDensity10: 16, totalDensity5: 12,
  /*
   * ⚠ 全卡口径两条上限 13/9 → **15/11**（2026-11-08 · 章节感补强，有意变更）：
   *   章节化之后每个境界章自带 4 张节点/奇遇卡（铺垫×2、奇遇×1、阶段节点×3 中的当章部分），
   *   与章内的长线、家事叠在同一个十年窗口 ⇒ 实测 P90 16/12（W1 同期弟子四卡并入后复核）。
   *   这是「一章该有的节拍」变多了，不是日常变挤——闸口径（4/3）与日常口径（8/6）都没变。
   *   台账理由见 metrics-baseline.json 的 history。 */
  cooldownRepeats: 0,
  realmContentMin: REALM_KINDS_MIN,
  spanMedian: 51,
  /*
   * oldAgeShare（2026-11-08 · 章节感补强 C3）：寿终未走完的结局占比（%）。
   *   400 命实测 2.3%（`audit-endings.mjs` 首轮基线）；120 命口径二项波动大
   *   （n=120、p≈0.023 的 P95 ≈ 4.6%）⇒ 钉 5 防门禁抖动。
   *   C1（road_turn 四选项）与 C2（志向生效）都会改分布 ⇒ 阶段三重算时按新分布重新定档，
   *   目标 ≤30% 是「不许涨回去」的上限，不是现状。
   */
  oldAgeShare: 5,
  /*
   * conflictRealmMin（2026-11-08 · 章节感补强 B）：每个境界章至少一次对抗或代价。
   *   ⚠ **先钉实测值 0**（`spanMedian` 先例：未达标先钉今天的值，缺口写在明面上）：
   *   凡身章与炼气章已有冲突卡（r12_qi_practice_1 / r12_qi_adventure，实测每命必发），
   *   但**金丹章与元婴章还没有任何声明过的冲突卡**（那两章现在只有备料/冲关/渡劫）⇒
   *   跨章取最小值仍为 0。「金丹/元婴章补冲突内容」登记为下一轮缺口，
   *   补完后把这条抬到规格目标 1，并写台账理由。
   */
  conflictRealmMin: 0,
};


/** 跑一条命，把它的指标事实收拢起来。 */
export function specFor(i) {
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  return {
    seed: '指标审计-' + i,
    /* 必须是当前版本 12 —— 旧版本各有自己的执行器与候选池。 */
    rulesVersion: 12,
    path: paths[i % 5],
    conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
    ending: i % 4 === 0 ? 'dao' : 'guard',
    family: i % 9 === 0 ? 'sever' : 'keep',
    school: ['sword', 'alchemy', 'array'][i % 3],
  };
}

/**
 * 最挤的那个窗口里有几张卡（窗口在 0..120 岁上滑动）。
 * @param {number[]} ages 这些卡发生的岁数
 * @param {number} span 窗口几年
 * @returns {number}
 */
export function worstWindow(ages, span) {
  let worst = 0;
  for (let start = 0; start <= 120; start++) {
    let n = 0;
    for (const age of ages) if (age >= start && age < start + span) n++;
    if (n > worst) worst = n;
  }
  return worst;
}

/**
 * 百分位（最近秩口径：P90 = 排好序后第 ⌈n×p⌉ 个）。
 * @param {number[]} values 样本
 * @param {number} p 0..1
 * @returns {number} 没有样本时返回 0
 */
export function percentile(values, p) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(s.length * p));
  return s[rank - 1];
}

/** 查这张卡的冲突标签；没有声明就返回 null。 */
export function conflictTagOf(eventId) {
  if (!eventId) return null;
  if (CONFLICT_TAGS[eventId]) return CONFLICT_TAGS[eventId];
  return null;
}

/**
 * 冲突标签的**反向验证**：声明与事件表结构必须对得上，不符就报红。
 *   · `clash` ⇒ 至少一个选项带成败判定（`check`）；
 *   · `cost`  ⇒ 至少一个选项带代价（`cost`）或判定。
 * 声明指向不存在的卡也报红（防改名后标签发霉）。
 * @returns {string[]} 问题清单（空 = 全对得上）
 */
export function conflictTagProblems() {
  const problems = [];
  for (const [id, tag] of Object.entries(CONFLICT_TAGS)) {
    const ev = EVENTS[id];
    if (!ev) { problems.push(`冲突标签指向不存在的卡：${id}`); continue; }
    const choices = ev.choices || [];
    const hasCheck = choices.some(c => c && c.check);
    const hasCost = choices.some(c => c && c.cost && Object.keys(c.cost).length);
    if (tag.kind === 'clash' && !hasCheck) problems.push(`${id} 声明 clash 但没有任何选项带判定`);
    if (tag.kind === 'cost' && !hasCost && !hasCheck) problems.push(`${id} 声明 cost 但没有任何选项带代价`);
  }
  return problems;
}

function runOne(spec) {
  try {
    const run = playCultivation(spec);
    /*
     * 密度 —— **三把尺**（2026-11-08 · 阶段 2：修「密度指标假绿灯」）。
     *
     * ## 为什么以前那把尺永远是绿的
     * --------------------------
     * 以前只量「豁免名单之外」的卡，而豁免名单有 263 张（387 张里的 68%）
     * ⇒ 每条命 43 张卡只算了 6 张 ⇒ 实测「最挤 10 年 4 张」，上限 5 ⇒ 绿。
     * 而玩家真正常遇到的是**全卡**口径的「最挤 10 年 15 张」。
     *
     * ## 三把尺各回答一句什么话
     * ------------------------
     *   · **闸口径**（`density10` / `density5`）：只算**非豁免**的卡。
     *     与密度闸的实现值（5 / 3）**可比** ⇒ 回答「闸那边看到的拥挤度」。
     *   · **日常口径**（`dailyDensity10` / `dailyDensity5`）：剔除**结构性**卡
     *     （人生节点），留下的都是玩家的日常决定 ⇒ 回答「喘不喘得过来」。
     *   · **全卡口径**（`totalDensity10` / `totalDensity5`）：所有抉择卡
     *     ⇒ 回答「一年里塞了多少事」。
     *
     * ⚠ **分类由规则层给**（`classifyCard`）—— 指标不许自己判前缀。
     */
    const kinds = {};
    const agesGate = [], agesDaily = [], agesAll = [];
    for (const s of run.snapshots) {
      agesAll.push(s.age);
      if (kinds[s.event] === undefined) kinds[s.event] = classifyCard(s.event);
      const k = kinds[s.event];
      if (!k.exempt) agesGate.push(s.age);
      if (k.kind === 'daily') agesDaily.push(s.age);
    }
    const density10 = worstWindow(agesGate, 10);
    const density5 = worstWindow(agesGate, 5);
    const dailyDensity10 = worstWindow(agesDaily, 10);
    const dailyDensity5 = worstWindow(agesDaily, 5);
    const totalDensity10 = worstWindow(agesAll, 10);
    const totalDensity5 = worstWindow(agesAll, 5);
    /* 冷却：**旁白**同标题在 60 个月内重复（这是「同一件事说两遍」），
       加上**同一张抉择卡**在 60 个月内重复（这是「同一张卡又来了」）。
       ⚠ 玩家的抉择记录（选了两次同一个选项）**不算**重复 —— 那是他的历史。 */
    let cooldownRepeats = 0;
    const byTitle = {};
    for (const j of run.state.journal) {
      if (!j.automatic) continue;
      const list = byTitle[j.title] || (byTitle[j.title] = []);
      list.push(j.month);
    }
    for (const months of Object.values(byTitle)) {
      for (let i = 1; i < months.length; i++) {
        if (months[i] - months[i - 1] < GATES_SPEC.cooldownMonths) cooldownRepeats++;
      }
    }
    const lastCard = {};
    for (const d of run.state.decisions) {
      const last = lastCard[d.event];
      if (last !== undefined && d.month - last < GATES_SPEC.cooldownMonths) cooldownRepeats++;
      lastCard[d.event] = d.month;
    }
    /* 节奏对齐：每个境界段发出过多少种不同内容。 */
    const perRealm = {};
    for (const s of run.snapshots) {
      const set = perRealm[s.realm] || (perRealm[s.realm] = new Set());
      set.add(s.event);
    }
    /* 阶段跨度：各境突破年龄的极差。 */
    const spans = {};
    for (const s of run.snapshots) {
      if (!s.event.startsWith('breakthrough_')) continue;
      const tier = s.event.split('_')[1];
      const list = spans[tier] || (spans[tier] = []);
      list.push(s.age);
    }
    const spanByRealm = {};
    for (const [tier, list] of Object.entries(spans)) {
      spanByRealm[tier] = Math.max(...list) - Math.min(...list);
    }
    const spanMax = Object.values(spanByRealm).length ? Math.max(...Object.values(spanByRealm)) : 0;
    /*
     * 同一里程碑的突破间隔（**这条命里**）——
     *   `spanMax` 是「最差的一条命隔了多久」，一条命就能把它顶爆；
     *   这里要的是**中位数口径**（方案里的说法）：多数人隔多久。
     *   ⇒ 每条命记下「每一境隔了多少年」，由 `spanMedianOf` 汇总。
     */
    const tierSpans = {};
    for (const [tier, span] of Object.entries(spanByRealm)) {
      if (span > 0) tierSpans[tier] = span;
    }
    /*
     * 冲突（2026-11-08 · 章节感补强 B）：每个**境界章**内的冲突卡张数。
     *   · 章 = 相邻境界变化之间的快照段（realm 0 = 出生→炼气突破…）；
     *   · 跨度 ≥2 年（≈24 个月）的章才参与——一闪而过的章谈不上「这一章的张力」；
     *   · 终身凡人（path mortal）单独计数，不进修仙路的最小值；
     *   · 只数**声明过**的冲突卡（conflictTagOf）——未声明的判定卡不帮忙凑数。
     */
    const chapters = [];
    let current = null;
    for (const s of run.snapshots) {
      if (!current || current.realm !== s.realm) {
        current = {realm: s.realm, firstAge: s.age, lastAge: s.age, conflicts: 0, cards: 0};
        chapters.push(current);
      }
      current.lastAge = s.age;
      current.cards++;
      if (conflictTagOf(s.event)) current.conflicts++;
    }
    const isMortalLife = run.path === 'mortal';
    let chapterMin = null;
    for (const ch of chapters) {
      if (ch.lastAge - ch.firstAge < 2) continue;
      if (chapterMin === null || ch.conflicts < chapterMin) chapterMin = ch.conflicts;
    }
    return {
      ok: true,
      density10, density5, cooldownRepeats, spanMax,
      dailyDensity10, dailyDensity5,
      totalDensity10, totalDensity5,
      events: run.events,
      realmCounts: Object.fromEntries(Object.entries(perRealm).map(([k, v]) => [k, v.size])),
      noEnding: !(run.state.ending && run.state.ending.title && run.state.ending.text),
      tierSpans,
      isMortalLife,
      chapterMin,
      chapterWorstRealm: chapterMin !== null
        ? chapters.filter(c => c.lastAge - c.firstAge >= 2 && c.conflicts === chapterMin).map(c => c.realm)
        : [],
      mortalConflicts: isMortalLife ? chapters.reduce((n, c) => n + c.conflicts, 0) : 0,
      /* 每条命的卡序列快照（年龄 / 卡 id / 境界）——
       * 完备度盘点（`scripts/audit-completeness.mjs`）要用**同一批人生**算
       * 「哪一年发什么卡」，所以这里把它带出来，别让那边再跑一遍。 */
      snapshots: run.snapshots,
      ending: run.ending,
    };
  } catch (error) {
    return {ok: false, error: String(error && error.message || error)};
  }
}

/** 跑一批人生，把每条命的事实收拢起来（**只跑，不管指标**）。 */
export function collectLives(count = 120) {
  const runs = [];
  for (let i = 0; i < count; i++) runs.push(runOne(specFor(i)));
  const good = runs.filter(r => r.ok);
  const failed = runs.filter(r => !r.ok);
  return {count, good, failed};
}

/**
 * 各境界段实际发出过多少种不同内容。
 *
 * ⚠ 口径：**取每条命里最多的那一档**，不是把所有人的并起来 ——
 *   并集会把「只有极少数命走到的内容」算进去，看着好看，其实玩家碰不到。
 *
 * 完备度盘点也用这个函数 ⇒ 两边**同一套口径**，数字必然一致
 * （不一致就说明有一边改过口径却没改另一边 ⇒ 那是要紧的事，不是噪音）。
 */
export function realmCountsOf(good) {
  const perRealm = {};
  for (const r of good) {
    for (const [realm, n] of Object.entries(r.realmCounts)) {
      perRealm[realm] = Math.max(perRealm[realm] || 0, n);
    }
  }
  return perRealm;
}

/**
 * 各境界段的「突破间隔中位数」（中位数口径）。
 *
 * ⚠ 口径：**一条命里**同一境界段的两次突破隔了多少年，再对所有命取中位数。
 *   为什么不用 `spanMax` 那个口径：它量的是「最差的一条命隔了多久」——
 *   一条命就能把它顶爆（实测 102 年），既不是典型情况，也不适合当底线。
 *
 * 规格目标：每段 ≤ 15 年（`docs/内容架构重构方案-2026-11-06.md` 六项指标第 6 条）。
 * ⚠ 实测**尚未达标**（炼气 5 · 筑基 4 · 金丹 27 · 元婴 51）⇒
 *   这条已登记成**已知缺口**（门禁 `completeness` 的缺口台账里），
 *   门禁本身只守「不许变得更宽」。
 *
 * @param {object[]} good 跑成功的命（每条带 `tierSpans`）
 * @returns {{tiers: object, worst: number, overall: number}}
 */
export function spanMedianOf(good) {
  const perTier = {};
  for (const life of good) {
    for (const [tier, span] of Object.entries(life.tierSpans || {})) {
      (perTier[tier] = perTier[tier] || []).push(span);
    }
  }
  const median = (list) => {
    if (!list.length) return null;
    const s = [...list].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };
  const tiers = {};
  for (const [tier, list] of Object.entries(perTier)) tiers[tier] = median(list);
  const numbers = Object.values(tiers).filter(v => v !== null);
  return {
    tiers,
    worst: numbers.length ? Math.max(...numbers) : 0,
    overall: numbers.length ? median(numbers) : 0,
  };
}

/** 规格里的目标值（第 6 条：跨度中位数 ≤ 15 年）。
 *  ⚠ 数字住在共享常量里（浏览器也要用 ⇒ 那个文件不许 import node:*）。 */
export {SPAN_TARGET};

/**
 * 算出一批人生的事实（**不跑人生**，只做汇总）。
 *
 * 拆出来是为了让完备度盘点能**只跑一批命**、同时拿到六项指标与逐年的卡分布
 * —— 两边共用同一批命 ⇒ 数字必然对得上。
 */
export function metricsOf(good, count = good.length) {
  /*
   * ① 可达性：事件表里一次都没出现过的条数。
   *
   * ⚠ **有意停用的卡不计入「发霉」**（2026-11-08 · 阶段 3.3）：
   *   凡人线 45 张卡按交接文档 §3.3 **停用但不删**（正文、选项、表达域说法全在，
   *   只是不再发出去）⇒ 它们「一次都没出现」是**有意为之**，不是发霉
   *   ⇒ 算进「发霉」会把 45 张**故意停用**的卡说成内容烂掉了。
   * ⇒ 停用清单在 `content/mundane-kept.js`（内容层叶子文件）⇒ 规则层与本脚本读的是**同一份**。
   */
  const seen = new Set(good.flatMap(r => r.events));
  const allIds = Object.keys(EVENTS);
  const neverSeen = allIds.filter(id => !seen.has(id) && !MUNDANE_DISABLED.includes(id));

  /* ④ 节奏对齐：各境界段内容种数（口径见 `realmCountsOf`）。 */
  const realmCounts = realmCountsOf(good);
  const realmContentMin = Object.keys(realmCounts).length ? Math.min(...Object.values(realmCounts)) : 0;

  /* ⑥ 阶段跨度：各段突破间隔的**中位数**（口径见 `spanMedianOf`）。 */
  const span = spanMedianOf(good);

  /*
   * 冲突（2026-11-08 · 章节感补强 B）——口径见 `runOne`：
   *   · `conflictRealmMin`：修仙路各命「最少的章内冲突卡张数」的**最小值**
   *     （冲突要的是「人人都至少遇到一次」，取最小值才诚实，与 realmContentMin 相反）；
   *   · `mortalConflictCount`：终身凡人撞到的冲突卡总数（**只观察**，
   *     凡尘线内容补完之前不设硬限、不进 DIRECTION）。
   */
  const cultivatorMins = good.filter(r => !r.isMortalLife && r.chapterMin !== null).map(r => r.chapterMin);
  const conflictRealmMin = cultivatorMins.length ? Math.min(...cultivatorMins) : 0;
  const worstConflictLives = good.filter(r => !r.isMortalLife && r.chapterMin === conflictRealmMin).length;
  const mortalConflictCount = good.reduce((n, r) => n + (r.mortalConflicts || 0), 0);
  /* oldAgeShare（C3）：寿终未走完的结局占比（%）。 */
  const oldAgeN = good.filter(r => r.ending === 'old_age').length;
  const oldAgeShare = good.length ? Math.round(oldAgeN / good.length * 1000) / 10 : 0;

  /*
   * 密度三把尺（口径见 `runOne` 的注释）：
   *   · 闸口径 —— 与密度闸的实现值（5 / 3）可比 ⇒ 取**最差的一条命**（沿用旧口径）；
   *   · 日常口径与全卡口径 —— 上限按 **P90** 判（交接文档：「上限取 13（P90）」），
   *     统计量 = 一百二十条命里的第 108 名。
   * ⚠ 为什么新指标用 P90 而不是最大值：最大值由**一条命**就能顶爆
   *   （实测 15 / 10），拿它当上限 ⇒ 门禁一开就是红的，且说不清「多挤算超」。
   *   P90 = 「九成的命都不超过这条线」⇒ 正好是「上限」的日常说法。
   */
  const metrics = {
    neverSeen: neverSeen.length,
    density10: good.length ? Math.max(...good.map(r => r.density10)) : 0,
    density5: good.length ? Math.max(...good.map(r => r.density5)) : 0,
    dailyDensity10: percentile(good.map(r => r.dailyDensity10), 0.9),
    dailyDensity5: percentile(good.map(r => r.dailyDensity5), 0.9),
    totalDensity10: percentile(good.map(r => r.totalDensity10), 0.9),
    totalDensity5: percentile(good.map(r => r.totalDensity5), 0.9),
    cooldownRepeats: good.reduce((n, r) => n + r.cooldownRepeats, 0),
    realmContentMin,
    endingMissing: good.filter(r => r.noEnding).length,
    spanMax: good.length ? Math.max(...good.map(r => r.spanMax)) : 0,
    spanMedian: span.worst,
    oldAgeShare,
    conflictRealmMin,
  };
  /* 三把尺的完整分布（最差的一条命 / 中位 / P90）—— 报告用，不进基线。 */
  const density = {
    gate: {
      max10: metrics.density10, max5: metrics.density5,
      median10: percentile(good.map(r => r.density10), 0.5),
      median5: percentile(good.map(r => r.density5), 0.5),
    },
    daily: {
      p90_10: metrics.dailyDensity10, p90_5: metrics.dailyDensity5,
      max10: good.length ? Math.max(...good.map(r => r.dailyDensity10)) : 0,
      max5: good.length ? Math.max(...good.map(r => r.dailyDensity5)) : 0,
      median10: percentile(good.map(r => r.dailyDensity10), 0.5),
      median5: percentile(good.map(r => r.dailyDensity5), 0.5),
    },
    total: {
      p90_10: metrics.totalDensity10, p90_5: metrics.totalDensity5,
      max10: good.length ? Math.max(...good.map(r => r.totalDensity10)) : 0,
      max5: good.length ? Math.max(...good.map(r => r.totalDensity5)) : 0,
      median10: percentile(good.map(r => r.totalDensity10), 0.5),
      median5: percentile(good.map(r => r.totalDensity5), 0.5),
    },
  };
  return {count, good: good.length, metrics, density, realmCounts, span, neverSeenSample: neverSeen.slice(0, 10),
    conflict: {conflictRealmMin, worstConflictLives, mortalConflictCount, taggedCards: Object.keys(CONFLICT_TAGS).length},
    oldAge: {oldAgeShare, oldAgeN}};
}

/** 跑一批人生，算出六项指标。 */
export function collect(count = 120) {
  const {good, failed} = collectLives(count);
  return {...metricsOf(good, count), failed};
}

/** 核对基线：只许变好，不许变差。 */
export function check(report, baseline) {
  const problems = [];
  /* 冲突标签的声明与结构必须先对得上（标签漂移 ⇒ 指标失真 ⇒ 先报这个）。 */
  problems.push(...conflictTagProblems());
  const metrics = report.metrics;
  for (const [key, direction] of Object.entries(DIRECTION)) {
    const now = metrics[key];
    const before = baseline.metrics ? baseline.metrics[key] : undefined;
    if (before === undefined) { problems.push(`${key}：基线里没有这一项（先跑 --gen 生成基线）`); continue; }
    if (direction === 'down' && now > before) {
      problems.push(`${key} 变差了：${before} → ${now}（只许变好，不许变差）`);
    }
    if (direction === 'up' && now < before) {
      problems.push(`${key} 变差了：${before} → ${now}（只许变好，不许变差）`);
    }
    const limit = HARD_LIMIT[key];
    if (limit !== undefined) {
      /*
       * ⚠ 硬底线的比较方向**必须跟着指标方向走**：
       *   `density10` 越小越好 ⇒ 超过上限就报红；
       *   `realmContentMin` 越大越好 ⇒ **低于**下限才报红。
       *   （早先写成一律「超过就报红」⇒ 把「6 种内容 ≥ 下限 5 种」误判成超标。）
       */
      if (direction === 'down' && now > limit) {
        problems.push(`${key} 超过硬底线：${now} > ${limit}`);
      } else if (direction === 'up' && now < limit) {
        problems.push(`${key} 低于硬底线：${now} < ${limit}`);
      }
    }
  }
  /*
   * ⚠ **闸与规格对不对得上** —— 两份数字必须一致。
   *
   * 规则层的闸（`packages/adventure/gates.js`）有一份实现值，
   * 本脚本有一份规格值（`SPEC`）。两边不一样 ⇒ 有人的闸已经不听规格了 ⇒ 报红。
   * （这一条也让「反向验证」站得住：把闸的实现值改小，规格不动 ⇒ 这里立刻报红。）
   */
  if (GATES.DENSITY_MAX_10Y !== GATES_SPEC.density10) {
    problems.push(`密度闸的十年上限与规格不一致：闸 ${GATES.DENSITY_MAX_10Y} ≠ 规格 ${GATES_SPEC.density10}`);
  }
  if (GATES.DENSITY_MAX_5Y !== GATES_SPEC.density5) {
    problems.push(`密度闸的五年上限与规格不一致：闸 ${GATES.DENSITY_MAX_5Y} ≠ 规格 ${GATES_SPEC.density5}`);
  }
  if (GATES.COOLDOWN_MONTHS !== GATES_SPEC.cooldownMonths) {
    problems.push(`冷却闸的月份与规格不一致：闸 ${GATES.COOLDOWN_MONTHS} ≠ 规格 ${GATES_SPEC.cooldownMonths}`);
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

/*
 * ⚠ 这一段**只在直接运行时**才做（`node scripts/audit-metrics.mjs …`）。
 *   因为别的脚本要 import 本文件里的 `collectLives` / `realmCountsOf` / `specFor`
 *   （完备度盘点要用**同一批人生、同一套口径**算「哪一年发什么卡」）
 *   ⇒ import 时不能顺手把报告打出来、更不能 `process.exit`。
 */
async function main() {
  const argv = process.argv.slice(2);
  const count = Number(argv.find(a => a.startsWith('--count='))?.split('=')[1] || 120);
  const report = collect(count);

  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log(`内容指标审计（实跑 ${report.count} 条命，成功 ${report.good} 条）\n`);
  console.log('  可达性（发霉的条数）  ' + report.metrics.neverSeen + ' / ' + Object.keys(EVENTS).length + ' 条事件');
  console.log('  密度 · 闸口径（只算非豁免卡，最差的一条命）  '
    + report.density.gate.max10 + ' / ' + report.density.gate.max5 + ' 个抉择'
    + `（上限 ${HARD_LIMIT.density10} / ${HARD_LIMIT.density5}）`);
  console.log('  密度 · 日常口径（剔除结构性卡，P90）  '
    + report.density.daily.p90_10 + ' / ' + report.density.daily.p90_5 + ' 个抉择'
    + `（中位 ${report.density.daily.median10} / ${report.density.daily.median5}，最差 ${report.density.daily.max10} / ${report.density.daily.max5}）`);
  console.log('  密度 · 全卡口径（所有抉择卡，P90）  '
    + report.density.total.p90_10 + ' / ' + report.density.total.p90_5 + ' 个抉择'
    + `（中位 ${report.density.total.median10} / ${report.density.total.median5}，最差 ${report.density.total.max10} / ${report.density.total.max5}）`);
  console.log(`    ⚠ 全卡口径的硬底线是 ${HARD_LIMIT.totalDensity10} / ${HARD_LIMIT.totalDensity5}（P90）`
    + '；5 年那条的目标是 8，**尚未达标**（今天实测 P90 = 9 ⇒ 先钉在 9，缺口登记在完备度台账里）');
  console.log('  冷却（60 个月内重复）  ' + report.metrics.cooldownRepeats + ' 处');
  console.log('  节奏对齐（各境内容种数）  ' + JSON.stringify(report.realmCounts));
  console.log('  结局覆盖（缺结局的人生）  ' + report.metrics.endingMissing + ' 条');
  console.log('  oldAgeShare（寿终未走完的占比）  ' + report.metrics.oldAgeShare + '%'
    + `（硬底线 ${HARD_LIMIT.oldAgeShare}%；400 命细分布见 audit-endings.mjs）`);
  console.log('  冲突（每章最少的冲突卡张数，修仙路）  ' + report.metrics.conflictRealmMin
    + `（最差命 ${report.conflict.worstConflictLives} 条落在该值；硬底线 ${HARD_LIMIT.conflictRealmMin}`
    + '；⚠ 规格目标 1，新冲突卡落地后阶段三抬线）');
  console.log('  冲突（终身凡人撞到的张数，只观察）  ' + report.conflict.mortalConflictCount
    + `（声明冲突卡共 ${report.conflict.taggedCards} 张）`);
  console.log('  阶段跨度（最差的一条命）  ' + report.metrics.spanMax + ' 年');
  const spanText = Object.entries(report.span.tiers)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([tier, n]) => `境界 ${tier} ${n} 年`)
    .join(' · ');
  console.log('  突破间隔（中位数口径）  ' + spanText + `（最差一段 ${report.metrics.spanMedian} 年）`);
  console.log(`    ⚠ 规格目标是每段 ≤ ${SPAN_TARGET} 年 —— 金丹以后**尚未达标**`
    + '（已登记在完备度门禁的缺口台账里；改它要走「有意行为变更」流程）');
  if (report.failed.length) console.log('  ⚠ ' + report.failed.length + ' 条命没跑完（已排除）');

  if (argv.includes('--gen')) {
    /*
     * 重生成基线 —— **基线文件自带变更台账**（`history`）。
     *
     * 为什么要台账：
     *   这道门禁的判据是「只许变好，不许变差」⇒ 基线就是一道**棘轮**。
     *   棘轮要挪，只许在「有意变更」时挪 ⇒ 那一次挪动必须留下理由与前后数字，
     *   否则半年后没人说得清「为什么这一步允许倒退」。
     *
     * 用法：`node scripts/audit-metrics.mjs --gen --reason="为什么允许这次变化"`
     */
    const reason = (argv.find(a => a.startsWith('--reason=')) || '').slice('--reason='.length);
    let history = [];
    try {
      const old = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
      if (old && Array.isArray(old.history)) history = old.history;
      if (old && old.metrics && !reason) {
        console.log('\n⚠ 这次重生成没有写理由（--reason=…）⇒ 台账里会记成「未说明」。');
      }
      if (old && old.metrics && reason) {
        history.push({
          at: new Date().toISOString(),
          reason,
          from: old.metrics,
          to: report.metrics,
        });
      }
    } catch {
      /* 第一次生成，没有旧基线 */
    }
    const payload = {createdAt: new Date().toISOString(), count: report.count, metrics: report.metrics, history};
    await mkdir(join(projectRoot, 'tests/fixtures'), {recursive: true});
    await writeFile(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
    console.log('\n✓ 基线已写入 ' + BASELINE_FILE);
    process.exit(0);
  }

  let baseline = null;
  try {
    baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
  } catch {
    console.log('\n✗ 没有基线文件：' + BASELINE_FILE + '（先跑 node scripts/audit-metrics.mjs --gen）');
    process.exit(1);
  }

  if (argv.includes('--check')) {
    const problems = check(report, baseline);
    if (problems.length) {
      console.log('\n════════ 指标核对 ════════');
      for (const p of problems) console.log('  ✗ ' + p);
      console.log('\n结果：' + problems.length + ' 个问题');
      process.exit(1);
    }
    console.log('\n✓ 六项指标都不比基线差');
    process.exit(0);
  }

  /* 报告模式：顺手写一份本机快照（不进仓库）。 */
  await mkdir(join(projectRoot, 'artifacts'), {recursive: true});
  await writeFile(join(projectRoot, 'artifacts/metrics.json'), JSON.stringify(report, null, 2) + '\n');
  process.exit(0);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
