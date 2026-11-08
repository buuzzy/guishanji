#!/usr/bin/env node
/**
 * 触达门禁 —— 「两种玩法都走不到，才算真零触达」
 * ============================================================================
 *
 * ## 守什么
 * --------
 * 一张卡如果玩家一辈子都遇不到，那它等于不存在 —— 而玩家不会知道自己错过了什么。
 *
 * ⚠⚠ **但「一次都没遇到」有两种完全不同的原因**（2026-11-08 阶段 4 实测才分清）：
 *   ① **走不进去** —— 条件写错 / 队列被占 / 优先级不对 ⇒ **缺陷，要修**；
 *   ② **这条偏好没选过** —— 卡在那儿，只是我们用的那套固定偏好没走到 ⇒ **不是缺陷**。
 *
 * ⇒ 以前只看一种偏好，量出来的「零触达」大半是 ② ⇒ **量错了**。
 *   实测：固定偏好下 134 张卡「零触达」，换成**两种策略的并集**（固定偏好 ∪ 随机探索）
 *   之后，真正的零触达是 115 张 —— 而这 115 张里 **45 张是凡人线有意停用**，
 *   其余是「同一事件再来一次」的备用编号、矩阵空格、兜底 id ⇒ **结构性到不了，不是缺口**。
 *
 * ⇒ 所以这道门禁**两种策略都跑**：
 *   · **固定偏好**（`scripts/lib/decide-policy.js`）：命与命之间可比；
 *   · **随机探索**（在能点的选项里随机挑）：能撞出偏好策略**永远不走**的分支。
 *
 * ## 四条断言
 * ----------
 *   1. **零崩溃** —— 两种策略跑下来一条都不许抛异常。
 *      （2026-11-08 实测抓到过：行动进行中收到「家中有人打听包裹」的急讯时，
 *       被打断的行动不在校验白名单里 ⇒ 存档校验直接报错 ⇒ **整局崩掉**。）
 *   2. **真零触达不许超出台账** —— 台账 `tests/fixtures/reach-gaps.json` 记着
 *      「已知到不了、且确认不是缺口」的卡。新出现的零触达 ⇒ 报红。
 *   3. **台账不许过期** —— 台账里记着的卡若已经被走到 ⇒ 报红（说明修好了，该更新台账）。
 *   4. **每条长线至少发过 1 次**，且**「有机会就一定发出」= 100%**
 *      （不是 80% —— 实测 16 条线全部是 100%，80% 那 20% 容差是多余的）。
 *
 * ## 用法
 * ------
 *   node scripts/audit-reach.mjs                # 跑一遍并打印
 *   node scripts/audit-reach.mjs --check        # 判定（回归门禁用这个）
 *   node scripts/audit-reach.mjs --count=200    # 样本量（**台账绑在这个数上**）
 *   node scripts/audit-reach.mjs --json         # 机器可读
 *   node scripts/audit-reach.mjs --write        # 重写台账（改过内容才用）
 */
import {createRun, choose, advance, validateRun, options} from '../packages/adventure/engine.js';
import {decide} from './lib/decide-policy.js';
import {makeRng} from './lib/rng.js';
import {ROAD_CHAINS, CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_FILE = join(projectRoot, 'tests/fixtures/reach-gaps.json');

/** 样本按路径铺开，保证每条路径都有足够的人生。 */
const PATHS = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
const SCHOOLS = ['sword', 'alchemy', 'array'];
const CHAIN_IDS = ROAD_CHAINS.map(c => c.id);

/**
 * 跑一条命，返回这一条看到过的卡与出过的机会。
 *
 * @param {'fixed'|'random'} mode 固定偏好 / 随机探索
 */
function runLife(index, mode) {
  const spec = {
    seed: '长线审计-' + index,
    path: PATHS[index % PATHS.length],
    conduct: index % 7 === 0 ? 'selfish' : index % 3 === 0 ? 'cautious' : 'care',
    ending: index % 4 === 0 ? 'dao' : 'guard',
    school: SCHOOLS[index % SCHOOLS.length],
  };
  const rng = makeRng('随机实测-' + index);
  const state = createRun({seed: spec.seed, rulesVersion: 12});
  const seen = new Set();
  const chains = new Set();
  const opportunities = new Set();
  let error = null;
  let guard = 0;
  try {
    while (state.phase === 'life' && guard++ < 4000) {
      if (state.pending) {
        const event = state.pending.event;
        seen.add(event);
        const available = options(state).filter(o => o.enabled);
        if (!available.length) throw Error('没有可选项 ' + event);
        const picked = mode === 'random'
          ? available[Math.floor(rng() * available.length)]
          : decide(state, spec);
        choose(state, picked.id);
        validateRun(state);
        continue;
      }
      if (!state.journey) break;
      advance(state, 1);
    }
  } catch (err) {
    error = String(err && err.message || err);
  }
  const cultivation = state.life.cultivation || {};
  for (const id of CHAIN_IDS) {
    const opportunity = cultivation.opportunities && cultivation.opportunities[id];
    if (opportunity && opportunity.occurs) opportunities.add(id);
  }
  for (const event of seen) {
    for (const id of CHAIN_IDS) {
      if (event === id + '_0' || event === id + '_1' || event === id + '_2') chains.add(id);
    }
  }
  return {seen, chains, opportunities, error};
}

/** 跑一批人生（两种策略各一遍），返回报告。 */
export function collect(count) {
  const reached = new Map(Object.keys(CULTIVATION_EVENTS).map(id => [id, 0]));
  const chainFired = new Map(CHAIN_IDS.map(id => [id, 0]));
  const chainOpportunity = new Map(CHAIN_IDS.map(id => [id, 0]));
  const errors = [];
  for (let index = 0; index < count; index++) {
    for (const mode of ['fixed', 'random']) {
      const result = runLife(index, mode);
      if (result.error) errors.push({seed: '长线审计-' + index, mode, message: result.error});
      for (const event of result.seen) reached.set(event, (reached.get(event) || 0) + 1);
      for (const id of result.chains) chainFired.set(id, (chainFired.get(id) || 0) + 1);
      for (const id of result.opportunities) chainOpportunity.set(id, (chainOpportunity.get(id) || 0) + 1);
    }
  }
  const zeroReach = [...reached].filter(([, n]) => n === 0).map(([id]) => id).sort();
  return {
    count,
    lives: count * 2,
    reached: Object.fromEntries(reached),
    zeroReach,
    chains: CHAIN_IDS.map(id => ({id, fired: chainFired.get(id), opportunity: chainOpportunity.get(id)})),
    errors,
  };
}

/** 台账：已知到不了、且确认不是缺口的卡（按族记）。 */
const GROUPS = {
  '凡人线停用': '阶段 3.3 决定「凡人线只走五张」⇒ 其余 45 张 `m11_*` 停用不删（放回来只改 `content/mundane-kept.js` 一处）',
  '包裹备用编号': '`parcel_missing_1..7` / `parcel_exposed_1..7` 是「同一起事故再来一次」的备用编号；一条命极少遇到两次包裹事故 ⇒ 第 2 次以后用不到',
  '备主药矩阵空格': '`advance_material_<境>_<第几次>_<第几份>` 是三维矩阵；现实里走不到的那些格子（例：第 2 次尝试的第 3 份材料）⇒ 空着',
  '旧线索兜底': '`echo_<kind>_check_resume` / `_visit_resume` 是「同一张回响卡再发一次」的兜底编号；兜底实走的是 `echo_resume_after_war`',
  '规则十二备用编号': '`r12_home_resolve_2..5` / `r12_home_leave_2..5` 是同一张卡的第 3–6 份拷贝；`r12_direction_3..5` 是第四到第六种「方向」卡',
  '突破卡变体': '`breakthrough_<境>_3` 是「第三次冲关」的变体；玩家多数在前两次就过去了 ⇒ 实测极少走到（交接文档已登记为已知）',
  '宗门评议后段': '`selection_3/4` 及其 `_result`：宗门评议的第三、四轮，需要先当上掌事',
  '人脉网络支线': '`network_bottleneck` / `network_volume`：心法卡住之后的两张支线，需要特定心法与特定进度',
  '接头卡收尾档': '`_joint_pending` / `_joint_hidden`：接头卡的另两档；对应线的第 0 步选「留退路」/「自己拿」就是**主动退出这条线** ⇒ 线没走完 ⇒ 不发接头卡',
  '宗门复仇线': '`sect_revenge`：宗门被毁后的复仇，需要先经历宗门崩散（`sect.phase` 变 `camp`）',
  '其它': '散卡，各有各的前置（出身/选择顺序），实测 400 条命走不到',
};

/** 读台账。 */
function readLedger() {
  try {
    return JSON.parse(readFileSync(LEDGER_FILE, 'utf8'));
  } catch {
    return {createdAt: null, groups: {}};
  }
}

/** 台账展开成 id 集合。 */
function ledgerIds(ledger) {
  const ids = new Set();
  for (const list of Object.values(ledger.groups || {})) for (const id of list) ids.add(id);
  return ids;
}

/** 把零触达卡按族归类。 */
export function classify(zeroReach) {
  const out = {};
  for (const id of zeroReach) {
    let group = '其它';
    if (/^m11_/.test(id)) group = '凡人线停用';
    else if (/^parcel_/.test(id)) group = '包裹备用编号';
    else if (/^advance_material_/.test(id)) group = '备主药矩阵空格';
    else if (/^echo_/.test(id)) group = '旧线索兜底';
    else if (/^r12_/.test(id)) group = '规则十二备用编号';
    else if (/^breakthrough_/.test(id)) group = '突破卡变体';
    else if (/^selection_/.test(id)) group = '宗门评议后段';
    else if (/^network_/.test(id)) group = '人脉网络支线';
    else if (/_joint_/.test(id)) group = '接头卡收尾档';
    else if (/^sect_revenge$/.test(id)) group = '宗门复仇线';
    (out[group] = out[group] || []).push(id);
  }
  for (const list of Object.values(out)) list.sort();
  return out;
}

/** 判定：返回问题清单（空 = 全过）。 */
export function judge(report) {
  const problems = [];
  for (const err of report.errors.slice(0, 8)) {
    problems.push('有一条命崩了（' + err.seed + '·' + err.mode + '）：' + err.message);
  }
  if (report.errors.length > 8) problems.push('……另有 ' + (report.errors.length - 8) + ' 条命崩了');

  const ledger = readLedger();
  /*
   * ⚠ **台账与样本量绑定**（2026-11-08 阶段 4）。
   *   「零触达」本来就是**样本量**的函数：一条少见的卡，样本小的时候可能压根没撞上。
   *   ⇒ 台账按 `--count=200`（两种策略合计 400 条命）生成
   *   ⇒ 换样本量就**不能**拿「零触达集合」直接比（会把「这次没撞上」误判成「新缺口」）。
   *   ⇒ 样本量对不上时：**跳过台账那两条断言**，只跑崩溃与长线那几条，并说明原因。
   */
  const ledgerCount = Number(ledger.count || 0);
  if (ledgerCount && ledgerCount !== report.count) {
    const known = ledgerIds(ledger);
    const fresh = report.zeroReach.filter(id => !known.has(id));
    problems.push('（台账是按 ' + ledgerCount + ' 条命生成的，这次跑的是 ' + report.count
      + ' 条 ⇒ 「零触达」那两条断言已跳过；换样本量要重写台账）');
    if (fresh.length) {
      problems.push('样本量不同，但仍有 ' + fresh.length + ' 张卡不在台账里：'
        + fresh.slice(0, 8).join('、') + ' ⇒ 拿 200 条命重跑确认一下');
    }
    return problems;
  }
  const known = ledgerIds(ledger);
  const fresh = report.zeroReach.filter(id => !known.has(id));
  const stale = [...known].filter(id => report.reached[id] > 0);
  if (fresh.length) {
    problems.push('出现了台账之外的新零触达卡（' + fresh.length + ' 张，两种策略都走不到）：'
      + fresh.slice(0, 12).join('、') + (fresh.length > 12 ? '……' : '')
      + ' ⇒ 要么是缺陷（该修），要么确认不是缺口（登记进台账）');
  }
  if (stale.length) {
    problems.push('台账过期了：这 ' + stale.length + ' 张卡已经被走到 ⇒ 该把台账更新掉（' + stale.slice(0, 12).join('、') + '）');
  }
  for (const row of report.chains) {
    if (row.fired < 1) problems.push(row.id + '：两种策略都没发出来（内容等于不存在）');
    else if (row.opportunity > 0 && row.fired < row.opportunity) {
      problems.push(row.id + '：有机会却没发出来（有机会 ' + row.opportunity + '，发出 ' + row.fired + '）');
    }
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const count = Number((argv.find(a => a.startsWith('--count=')) || '').split('=')[1] || 200);
const report = collect(count);

if (argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (argv.includes('--write')) {
  const groups = classify(report.zeroReach);
  const payload = {
    createdAt: new Date().toISOString(),
    count: report.count,
    lives: report.lives,
    note: '两种策略（固定偏好 ∪ 随机探索）都走不到的卡；按族记，每族一句「为什么到不了」。'
      + '新出现的零触达卡会让门禁报红 ⇒ 那就得判断是缺陷（修）还是不是缺口（登记进这里）。',
    groups,
    reasons: GROUPS,
  };
  writeFileSync(LEDGER_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log('已重写台账：' + LEDGER_FILE + '（' + report.zeroReach.length + ' 张，' + Object.keys(groups).length + ' 族）');
  process.exit(0);
}

console.log('触达审计（实跑 ' + report.count + ' 条命 × 2 种策略 = ' + report.lives + ' 条）');
console.log('决策卡总数', Object.keys(CULTIVATION_EVENTS).length,
  '｜两种策略都发过', Object.keys(CULTIVATION_EVENTS).length - report.zeroReach.length,
  '｜真零触达', report.zeroReach.length,
  '｜崩了', report.errors.length, '条');
console.log('');
console.log('长线'.padEnd(16), '发出', '有机会', '缺口');
for (const row of report.chains) {
  console.log(row.id.padEnd(16), String(row.fired).padStart(4), String(row.opportunity).padStart(7),
    '  ' + (row.fired >= row.opportunity ? '0' : '✗ ' + (row.opportunity - row.fired)));
}
console.log('');
console.log('真零触达分族：');
const groups = classify(report.zeroReach);
for (const [group, ids] of Object.entries(groups)) {
  console.log('  ' + String(ids.length).padStart(4) + '  ' + group + '：' + ids.join(' '));
}

const problems = judge(report);
if (argv.includes('--check')) {
  if (problems.length) {
    console.log('\n════════ 触达 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('\n✓ 零崩溃；真零触达都在台账里；每条长线都发得出来，「有机会」必发出');
  process.exit(0);
}
console.log('\n（加 --check 判定；加 --json 出机器可读结果；加 --write 重写台账）');
