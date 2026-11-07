#!/usr/bin/env node
/**
 * audit-completeness.mjs —— 内容完备度盘点 **兼门禁**（回答用户 2026-11-06 的第 12 条）
 * ============================================================================
 *
 * ## 用户问的是什么
 * ----------------
 * 「细节到底到哪了」—— 他想知道这套内容**覆盖了多少、缺什么**。
 * 这道脚本把答案变成可复算的数字，而不是靠印象。
 *
 * ## 它数什么
 * ----------
 *   ① **事件表**：修仙线 285 张 + 经典线 66 张，按故事线分类。
 *   ② **人物**：谁有名字、谁有身份注解、谁只有称谓。
 *   ③ **道具**：多少件、每件的来源与去处配对情况。
 *   ④ **境界**：每境寿元、每境实际发过多少种内容。
 *   ⑤ **结局**：有多少个、覆盖了多少种死法/了法。
 *   ⑥ **年龄段覆盖**：实跑一批人生，把发出的卡按岁数分档 ——
 *      「晚年线是空的」这个说法到底成不成立，靠数字说话。
 *   ⑦ **缺口清单**：哪些该有而没有（见下面「缺口怎么判」）。
 *
 * ## 缺口怎么判（2026-11-08 定的口径）
 * -------------------------------
 * 缺口分两种，**判法完全不同**：
 *
 *   · **硬底线**（`severity: 'hard'`）—— 量化下限，破了就是内容被削了 ⇒ 直接报红。
 *     故事线不许空、每境至少 5 种内容、每条长线至少 2 步、结局至少 20 个、
 *     每个灵根都要有说明、晚年至少 30 种卡。
 *
 *   · **已知缺口**（`severity: 'known'`）—— 「确实还缺，但补它要走行为变更那套流程」，
 *     所以它**不是**报错，而是**一条必须被登记在案的记录**。
 *     登记在 `tests/fixtures/completeness-gaps.json`（台账）里：
 *       · 台账里有、现在还成立 ⇒ 绿（这是**已知**的缺口，不是新问题）；
 *       · 台账里有、现在不成立了 ⇒ **报红**（缺口被补上了 ⇒ 该更新台账，
 *         否则文档会一直说「还缺」，而内容其实已经补了）；
 *       · 现在成立了、台账里没有 ⇒ **报红**（新缺口，必须登记）；
 *       · 台账里有脚本不认识的 ⇒ **报红**（台账过期）。
 *     ⇒ 台账就是一份**契约**：缺口清单变了，一定要有人 consciously 地改它。
 *
 * ⚠ **为什么「缺口被补上」也要报红**：
 *   只在「新缺口」时报红 ⇒ 有人把判据放松（比如把「收尾类」关键词放宽），
 *   缺口就会静悄悄地消失，门禁还是绿的 ⇒ **假门禁**。
 *   两个方向都盯住，才是真的在管事。
 *
 * ## 用法
 * ----
 *   node scripts/audit-completeness.mjs                 # 打印盘点报告
 *   node scripts/audit-completeness.mjs --json          # 机器可读
 *   node scripts/audit-completeness.mjs --check         # 门禁（退出码 0/1）
 *   node scripts/audit-completeness.mjs --write --reason="为什么改台账"
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {readFileSync, realpathSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CULTIVATION_EVENTS, ROAD_CHAINS} from '../content/cultivation-stories.js';
import {ROOTS, OFFICERS} from '../content/cultivation-world.js';
import {ITEMS} from '../content/items.js';
import {REALMS} from '../content/realms.js';
import {NODES} from '../content/adventure.js';
import {EPISODES} from '../content/living-episodes.js';
import {ALL_ENDINGS} from '../packages/adventure/engine.js';
import {EVENT_ROWS} from '../content/expressions/events/index.js';
import {collectLives, metricsOf, realmCountsOf, spanMedianOf, SPAN_TARGET} from './audit-metrics.mjs';
import {projectRoot} from './serve.mjs';
/* ⚠ 底线数字**只住这一份**（开发者面板也要用 ⇒ 这个文件不许 import node:*）。 */
import {
  REALM_KINDS_MIN, LATE_AGE, LATE_KINDS_MIN, LATE_DEDICATED_MIN,
} from './lib/completeness-limits.js';

/** 缺口台账（跟着源码走 ⇒ 门禁只依赖跟着源码走的文件）。 */
const BASELINE_FILE = join(projectRoot, 'tests/fixtures/completeness-gaps.json');

/** 默认跑多少条命（**台账里记着这个数**，门禁按台账的数跑 ⇒ 可复算）。 */
const DEFAULT_LIVES = 120;

/**
 * 应当存在的故事线（11 条）。
 *
 * ⚠ 这是**声明**，不是「现在有什么」——
 *   少了哪条线，空线根本不会出现在统计里 ⇒ 缺口就看不见了。
 *   （2026-11-08 实测：确实有两条线曾经是空的，是靠这张声明抓出来的。）
 */
const EXPECTED_LINES = [
  '入山与测灵根', '突破', '突破材料', '宗门家族', '童年人脉',
  '童年', '散修魔道妖兽', '规则十二', '回响', '俗世生活', '选拔评议',
];

/** 各类下限（**口径都写在这里**，改一个数就能看出它守护的是什么）。 */
export const LIMITS = {
  lineCards: 1,      // 每条故事线至少 1 张卡
  realmKinds: REALM_KINDS_MIN, // 每个境界段至少 5 种内容（与指标审计的「节奏对齐」同口径）
  chainSteps: 2,     // 每条长线至少 2 步（起 + 承），不然玩家碰到开头就没有下文
  endings: 20,       // 结局至少 20 个
  lateKinds: LATE_KINDS_MIN,   // 晚年至少 30 种卡
  lateDedicated: LATE_DEDICATED_MIN, // 一张专讲「收尾」的卡，至少要发 3 次才算晚年有收尾内容
};

/**
 * 「收尾类」卡：标题直接讲身后事 / 交接 / 传承的那些。
 *
 * ⚠ 只看**玩家看到的标题**（表达域优先），不看正文 ——
 *   正文里顺带提一句「传承」不算（实测：备料卡的正文里就有「传承」两个字）。
 *   ⚠ 也不看选项文字：选项里「交代外事，封门静修」是闭关前的安排，不是身后事。
 */
const LATE_DEDICATED_WORDS = /遗物|身后|后事|托付|交给谁|交给后人|留给后人|传承|接班|接手新|下一代|收尾|了结|临终|遗言|葬/;

/* ── 故事线归类（与表达域九个分片同一套口径）───────────────────────── */

function lineOf(id) {
  if (id.startsWith('breakthrough_')) return '突破';
  if (id.startsWith('advance_material_')) return '突破材料';
  if (id.startsWith('m11_')) return '俗世生活';
  if (id.startsWith('parcel_')) return '童年';
  if (id.startsWith('loose_') || id.startsWith('dark_') || id.startsWith('beast_')) return '散修魔道妖兽';
  if (id.startsWith('sect_') || id.startsWith('family')) return '宗门家族';
  if (id.startsWith('child_') || id.startsWith('network_')) return '童年人脉';
  if (id.startsWith('r12_') || id.startsWith('thin_root_')) return '规则十二';
  if (id.startsWith('echo_')) return '回响';
  if (id.startsWith('selection_') || id.startsWith('years_practice_') || id.startsWith('sect_council_') || id.startsWith('sect_rebuild') || id.startsWith('sect_revenge')) return '选拔评议';
  return '入山与测灵根';
}

/** 玩家读到的标题（表达域优先 ⇒ 那是玩家真正看到的那句话）。 */
function playerTitle(id) {
  const row = EVENT_ROWS[id];
  if (row && row[0]) return String(row[0]);
  const ev = CULTIVATION_EVENTS[id];
  return (ev && ev.title) || id;
}

/* ── 判据 ─────────────────────────────────────────────────────────────── */

/**
 * 每条判据返回「问题清单」：
 *   · `severity: 'hard'`  —— 清单非空 = **破了底线**，报红；
 *   · `severity: 'known'` —— 清单非空 = **缺口还成立**（要登记在台账里），
 *                            清单为空 = 缺口已经被补上（台账该更新了）。
 */
export const CRITERIA = [
  {
    kind: 'line-empty',
    severity: 'hard',
    title: '有故事线一张卡都没有',
    test: f => Object.entries(f.lineCounts)
      .filter(([, n]) => n < LIMITS.lineCards)
      .map(([k, n]) => `故事线「${k}」只有 ${n} 张卡（低于 ${LIMITS.lineCards} 张的底线）`),
  },
  {
    kind: 'realm-thin',
    severity: 'hard',
    title: '有境界段实际发出的内容太少',
    test: f => Object.entries(f.realmCounts)
      .filter(([, n]) => n < LIMITS.realmKinds)
      .map(([r, n]) => `境界段 ${r} 实际只发出过 ${n} 种内容（低于 ${LIMITS.realmKinds} 种的底线）`),
  },
  {
    kind: 'chain-short',
    severity: 'hard',
    title: '有长线只有开头没有下文',
    test: f => f.chains
      .filter(c => c.steps < LIMITS.chainSteps)
      .map(c => `长线「${c.name}」只有 ${c.steps} 步（低于 ${LIMITS.chainSteps} 步的底线）`),
  },
  {
    kind: 'endings-thin',
    severity: 'hard',
    title: '结局太少',
    test: f => (f.endingCount < LIMITS.endings
      ? [`结局只有 ${f.endingCount} 个（低于 ${LIMITS.endings} 个的底线）`] : []),
  },
  {
    kind: 'root-no-description',
    severity: 'hard',
    title: '有灵根没有自己的说明文字',
    test: f => f.rootsWithoutDescription.map(id => `灵根「${id}」没有说明文字`),
  },
  {
    kind: 'late-too-thin',
    severity: 'hard',
    title: '晚年能碰到的内容太少',
    test: f => (f.lateKinds < LIMITS.lateKinds
      ? [`${LATE_AGE} 岁以后只碰到过 ${f.lateKinds} 种卡（低于 ${LIMITS.lateKinds} 种的底线）`] : []),
  },
  {
    kind: 'late-aftermath-line',
    severity: 'known',
    title: '晚年没有专门面向「收尾 / 身后事」的卡',
    test: f => (f.lateDedicatedMax >= LIMITS.lateDedicated ? [] : [
      `${LATE_AGE} 岁以后最常发的那张「收尾类」卡只发了 ${f.lateDedicatedMax} 次`
      + `（低于 ${LIMITS.lateDedicated} 次的底线）—— 晚年发的还是备料与冲关，没有一条线专讲收尾`,
    ]),
  },
  {
    kind: 'span-too-wide',
    severity: 'known',
    title: '高境界段的突破间隔太长',
    /* 规格目标：每一段的突破间隔中位数 ≤ 15 年（`docs/内容架构重构方案-2026-11-06.md` 六项指标第 6 条）。
     * ⚠ 实测未达标（炼气 5 · 筑基 4 · 金丹 27 · 元婴 51 年）——
     *   原因多半是「备料要等」（金丹的内丹、元婴的主药不是想要就有）。
     *   ⇒ 改它要动内容与节奏 ⇒ 走「有意行为变更」流程 ⇒ 这里只登记，不自己动手。 */
    test: f => (f.span.worst <= SPAN_TARGET ? [] : [
      `各境界段的突破间隔中位数：${Object.entries(f.span.tiers)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([tier, n]) => `${tier} 段 ${n} 年`).join('、')}`
      + `；最差的一段 ${f.span.worst} 年，超过规格目标 ${SPAN_TARGET} 年`,
    ]),
  },
];

/* ── 量事实 ───────────────────────────────────────────────────────────── */

/**
 * 把一批人生 + 静态数据收成「事实」，供判据判断。
 * ⚠ 人生只跑**一批**（与指标审计共用同一批、同一套口径 ⇒ 两边数字必然一致）。
 */
export function collectFacts(lives = DEFAULT_LIVES) {
  const {good, failed} = collectLives(lives);
  const metrics = metricsOf(good, lives);

  /* 事件表：修仙线 + 经典线，按故事线归类。 */
  const eventIds = Object.keys(CULTIVATION_EVENTS);
  const classicIds = Object.keys({...NODES, ...EPISODES});
  const lineCounts = {};
  for (const line of EXPECTED_LINES) lineCounts[line] = 0;
  for (const id of eventIds) {
    const line = lineOf(id);
    lineCounts[line] = (lineCounts[line] || 0) + 1;
  }

  /* 年龄段覆盖：把发出的卡按十岁分档。 */
  const ageBuckets = {};
  const lateCards = {};
  for (const life of good) {
    for (const snap of life.snapshots) {
      const decade = Math.floor(snap.age / 10) * 10;
      const key = decade + '–' + (decade + 9) + ' 岁';
      ageBuckets[key] = (ageBuckets[key] || 0) + 1;
      if (snap.age >= LATE_AGE) lateCards[snap.event] = (lateCards[snap.event] || 0) + 1;
    }
  }
  /* 分档要按岁数排，别按字符串排（「100–109」会排在「20–29」前面）。 */
  const ageBucketsSorted = Object.fromEntries(
    Object.entries(ageBuckets).sort((a, b) => Number(a[0].split('–')[0]) - Number(b[0].split('–')[0])),
  );
  const lateTop = Object.entries(lateCards).sort((a, b) => b[1] - a[1]);
  /* 晚年「收尾类」的卡：标题直接讲身后事 / 交接的那些。 */
  const lateDedicated = lateTop
    .filter(([id]) => LATE_DEDICATED_WORDS.test(playerTitle(id)))
    .map(([id, n]) => ({id, title: playerTitle(id), count: n}));
  const lateDedicatedMax = lateDedicated.length ? lateDedicated[0].count : 0;

  /* 人物：专名总表 + 宗门管事表，合并去重。 */
  const vocab = JSON.parse(readFileSync(join(projectRoot, 'docs/expression-vocabulary.json'), 'utf8'));
  const vocabPeople = vocab.people || [];
  const officers = OFFICERS || [];
  const namedPeople = new Set([...vocabPeople, ...officers.map(o => o.name)]);

  /* 道具 / 境界 / 结局。 */
  const itemIds = Object.keys(ITEMS || {});
  const realmCount = REALMS.length;
  const endingIds = Object.keys(ALL_ENDINGS || {});
  const rootsWithoutDescription = Object.entries(ROOTS || {})
    .filter(([, root]) => !root || !root.description)
    .map(([id]) => id);

  return {
    lives,
    goodLives: good.length,
    failedLives: failed.length,
    eventCount: eventIds.length,
    classicCount: classicIds.length,
    lineCounts,
    realmCounts: metrics.realmCounts,
    metrics: metrics.metrics,
    span: spanMedianOf(good),
    chains: (ROAD_CHAINS || []).map(c => ({
      id: c.id,
      name: c.name || c.id,
      steps: (c.stages || c.steps || c.legs || []).length,
    })),
    endingCount: endingIds.length,
    rootsWithoutDescription,
    lateKinds: lateTop.length,
    lateTop,
    lateDedicated,
    lateDedicatedMax,
    ageBuckets: ageBucketsSorted,
    namedPeople: [...namedPeople],
    officers: officers.length,
    vocabPeople: vocabPeople.length,
    itemCount: itemIds.length,
    realmCount,
  };
}

/* ── 缺口判定与台账比对 ───────────────────────────────────────────────── */

/**
 * 跑一遍判据，返回「当前成立的缺口」。
 * @returns {{kind:string,severity:string,title:string,problems:string[]}[]}
 */
export function evaluate(facts) {
  const gaps = [];
  for (const c of CRITERIA) {
    const problems = c.test(facts) || [];
    if (!problems.length) continue;
    /* `known` 的判据：清单非空 = 缺口还成立；`hard` 的判据：清单非空 = 破了底线。 */
    gaps.push({kind: c.kind, severity: c.severity, title: c.title, problems});
  }
  return gaps;
}

/**
 * 把「当前成立的缺口」与台账比一比。
 * @returns {string[]} 问题清单（空 = 通过）
 */
export function compare(gaps, ledger) {
  const problems = [];
  const known = (ledger && Array.isArray(ledger.knownGaps)) ? ledger.knownGaps : [];
  const knownKinds = new Map(known.map(g => [g.kind, g]));
  const scriptKinds = new Set(CRITERIA.filter(c => c.severity === 'known').map(c => c.kind));
  const openKnown = gaps.filter(g => g.severity === 'known');

  /* 硬底线：破了就报红。 */
  for (const g of gaps.filter(x => x.severity === 'hard')) {
    for (const p of g.problems) problems.push(`【${g.title}】${p}`);
  }
  /* 台账里有、现在不成立 ⇒ 缺口被补上了（或判据被放松了）⇒ 报红。 */
  for (const g of known) {
    if (!openKnown.some(x => x.kind === g.kind)) {
      problems.push(`台账里登记的缺口「${g.title}」现在不成立了`
        + ` —— 确认是补好了的话，跑 --write 更新台账；不是有意的，说明判据被动了。`);
    }
  }
  /* 现在成立、台账里没有 ⇒ 新缺口 ⇒ 报红。 */
  for (const g of openKnown) {
    if (!knownKinds.has(g.kind)) {
      problems.push(`新增缺口「${g.title}」—— ${g.problems.join('；')}（还没登记进台账，跑 --write 登记）`);
    }
  }
  /* 台账里有脚本不认识的 ⇒ 台账过期 ⇒ 报红。 */
  for (const g of known) {
    if (!scriptKinds.has(g.kind)) {
      problems.push(`台账里有一条脚本不认识的缺口「${g.title || g.kind}」—— 脚本里没有对应的判据`);
    }
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const livesArg = Number((argv.find(a => a.startsWith('--lives=')) || '').split('=')[1] || 0);

  /* 台账里的命数说了算（可复算 ⇒ 换机器跑出来的数字也一样）。 */
  let ledger = null;
  try {
    ledger = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
  } catch {
    ledger = null;
  }
  const lives = livesArg || (ledger && ledger.lives) || DEFAULT_LIVES;

  const facts = collectFacts(lives);
  const gaps = evaluate(facts);

  if (argv.includes('--json')) {
    console.log(JSON.stringify({...facts, 缺口: gaps}, null, 2));
    process.exit(0);
  }

  /* ── 报告模式 ───────────────────────────────────────────────────────── */
  const compact = argv.includes('--check');
  console.log('内容完备度盘点\n');
  console.log('① 事件表');
  console.log(`   修仙线 ${facts.eventCount} 张 · 经典线 ${facts.classicCount} 张 · 合计 ${facts.eventCount + facts.classicCount} 张`);
  for (const [line, n] of Object.entries(facts.lineCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)}  ${line}`);
  }
  console.log('\n② 人物');
  console.log(`   有名有姓 ${facts.namedPeople.length} 位（专名总表 ${facts.vocabPeople} 位 + 宗门管事表 ${facts.officers} 位，合并去重）`);
  console.log('\n③ 道具');
  console.log(`   ${facts.itemCount} 件`);
  console.log('\n④ 境界');
  console.log(`   ${facts.realmCount} 境；各境实际发出过的内容种数 ${JSON.stringify(facts.realmCounts)}`);
  console.log('\n⑤ 结局');
  console.log(`   ${facts.endingCount} 个`);
  console.log('\n⑥ 年龄段覆盖');
  console.log(`   实跑 ${facts.goodLives} 条命，按十岁分档：`);
  /* 门禁模式不铺 40 行年龄表（那是要给人读的，不是给机器读的）。 */
  if (!compact) {
    for (const [bucket, n] of Object.entries(facts.ageBuckets)) {
      console.log(`     ${String(n).padStart(5)}  ${bucket}`);
    }
  } else {
    const buckets = Object.entries(facts.ageBuckets);
    const busiest = buckets.reduce((a, b) => (b[1] > a[1] ? b : a), buckets[0]);
    const late = buckets.filter(([k]) => Number(k.split('–')[0]) >= 100).reduce((n, [, v]) => n + v, 0);
    console.log(`   ${buckets.length} 个岁数段，最挤的是 ${busiest[0]}（${busiest[1]} 张）；100 岁以后共 ${late} 张`);
  }
  console.log(`   ${LATE_AGE} 岁后共 ${facts.lateKinds} 种卡，最常发：${facts.lateTop.slice(0, 5).map(([id, n]) => `${id}×${n}`).join('、')}`);
  console.log(`   各境突破间隔（中位数）：${Object.entries(facts.span.tiers).sort((a, b) => Number(a[0]) - Number(b[0])).map(([tier, n]) => `${tier} 段 ${n} 年`).join('、')}（规格目标 ≤ ${SPAN_TARGET} 年）`);
  console.log(`   其中「收尾类」（标题直接讲身后事 / 交接）的卡：${facts.lateDedicated.length ? facts.lateDedicated.map(d => `${d.title}×${d.count}`).join('、') : '（无）'}`);
  console.log('\n⑦ 缺口清单');
  if (!gaps.length) console.log('   （无）');
  else for (const g of gaps) {
    console.log(`   · [${g.severity === 'hard' ? '硬底线' : '已知缺口'}] ${g.title}`);
    for (const p of g.problems) console.log(`       ${p}`);
  }
  /* ── 门禁模式 ───────────────────────────────────────────────────────── */
  if (argv.includes('--check')) {
    if (!ledger) {
      console.log('\n════════ 缺口核对 ════════');
      console.log(`  ✗ 没有台账文件：${BASELINE_FILE}`);
      console.log('    先跑 node scripts/audit-completeness.mjs --write --reason="第一次建台账"');
      console.log('\n结果：1 个问题');
      process.exit(1);
    }
    const problems = compare(gaps, ledger);
    if (problems.length) {
      console.log('\n════════ 缺口核对 ════════');
      for (const p of problems) console.log('  ✗ ' + p);
      console.log(`\n结果：${problems.length} 个问题`);
      process.exit(1);
    }
    console.log('\n✓ 硬底线都没破，已知缺口与台账一致');
    process.exit(0);
  }

  /* ── 写台账 ─────────────────────────────────────────────────────────── */
  if (argv.includes('--write')) {
    const reason = (argv.find(a => a.startsWith('--reason=')) || '').slice('--reason='.length);
    const old = ledger || {};
    const history = Array.isArray(old.history) ? old.history : [];
    const knownGaps = gaps
      .filter(g => g.severity === 'known')
      .map(g => {
        const prev = (old.knownGaps || []).find(x => x.kind === g.kind);
        return {
          kind: g.kind,
          title: g.title,
          detail: g.problems.join('；'),
          since: prev ? prev.since : new Date().toISOString().slice(0, 10),
        };
      });
    if (old.knownGaps && !reason && JSON.stringify(old.knownGaps) !== JSON.stringify(knownGaps)) {
      console.log('\n⚠ 这次改台账没有写理由（--reason=…）⇒ 台账里会记成「未说明」。');
    }
    if (old.knownGaps && reason) {
      history.push({
        at: new Date().toISOString(),
        reason,
        from: (old.knownGaps || []).map(g => g.kind),
        to: knownGaps.map(g => g.kind),
      });
    }
    const payload = {createdAt: new Date().toISOString(), lives, knownGaps, history};
    await mkdir(join(projectRoot, 'tests/fixtures'), {recursive: true});
    await writeFile(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
    console.log('\n✓ 缺口台账已写入 ' + BASELINE_FILE);
    process.exit(0);
  }

  process.exit(0);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
