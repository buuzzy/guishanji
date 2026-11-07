#!/usr/bin/env node
/**
 * t10-reverse.mjs —— 内容指标门禁的反向验证（**不是门禁，是门禁的体检**）
 * ============================================================================
 *
 * ## 为什么要有这个
 * ----------------
 * T0 把六项指标做成门禁时，**没有留下反向验证** ⇒ 按 AGENTS.md 的口径，
 * 「跑一遍没报错」证明不了它有用 —— 它可能只是「永远绿」。
 *
 * 这道脚本补上那块证据，给下面每条判据各注入一个坏值，**每一条都必须报红**：
 *
 *   门禁 `scripts/audit-metrics.mjs --check`
 *     ① 密度超标（最挤 10 年 > 5）      → 报红
 *     ② 冷却超标（60 个月内重复 > 0）   → 报红
 *     ③ 每境内容种数不足（< 5）         → 报红
 *     ④ 结局缺失（> 0）                 → 报红
 *     ⑤ 突破间隔变宽（中位数 > 棘轮）   → 报红
 *     ⑥ 可达性倒退（发霉条数变多）      → 报红
 *     ⑦ 闸与规格对不上（改规则层的闸）  → 报红（**真改源码**那道最要紧）
 *     ⑧ 基线里少了新指标                → 报红
 *     ⑨ 端到端：把基线改坏 ⇒ CLI 退出码 1
 *     ⑩ **正面对照**：基线正常 ⇒ CLI 退出码 0（证明它不是「永远报红」）
 *
 * ⚠ **⑩ 那道不能省**：只会证明「会报红」的脚本，也可能是「永远报红」。
 * ⚠ **⑦ 是真改源码**（在临时副本里改 `packages/adventure/gates.js`）——
 *   它证明「规格与实现值对不上时门禁真的会拦」，而不是只证明几个数字比较。
 *
 * 用法：
 *   node scripts/t10-reverse.mjs            # 在**临时副本**上做，不碰工作区
 *   node scripts/t10-reverse.mjs --inplace  # 在工作区做（会改文件，用完还原）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPLACE = process.argv.includes('--inplace');
const BASELINE_REL = 'tests/fixtures/metrics-baseline.json';
const GATES_REL = 'packages/adventure/gates.js';

/*
 * ⚠ **样本量必须与门禁一致（120 条命）**：
 *   「突破间隔中位数」是**中位数** ⇒ 换一批命，数字就会变（实测 40 条命 = 77 年，
 *   120 条命 = 51 年）⇒ 基线与门禁都固定在 `--count=120`，这里也一样。
 *   （这不是指标不稳，是中位数的性质；种子固定 ⇒ 同一批命永远同一个数。）
 */
const LIVES = 120;

let failures = 0;
let skipped = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}
function skip(msg) {
  skipped++;
  console.log(`  · 跳过：${msg}`);
}

console.log('T10 内容指标门禁 · 反向验证（注入坏值，必须报红）\n');

/** 在指定根目录跑一个脚本，返回 {code, out}（**不抛异常**）。 */
function runScript(root, rel, args) {
  const cmd = [path.join(root, rel), ...(args || [])];
  try {
    const out = execFileSync(process.execPath, cmd, {
      cwd: root, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {code: 0, out};
  } catch (err) {
    return {
      code: err.status === undefined ? 1 : err.status,
      out: `${err.stdout || ''}\n${err.stderr || ''}`,
    };
  }
}

/** 复制仓库到临时目录（只复制够门禁跑起来的部分）。 */
function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsj-t10-reverse-'));
  const copy = (rel) => {
    const from = path.join(ROOT, rel);
    const to = path.join(dir, rel);
    fs.mkdirSync(path.dirname(to), {recursive: true});
    fs.cpSync(from, to, {recursive: true});
  };
  for (const rel of ['content', 'packages', 'scripts', 'tests', 'docs']) copy(rel);
  copy('package.json');
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  }
  return dir;
}

const workdir = INPLACE ? ROOT : makeCopy();
console.log(`工作副本：${workdir}${INPLACE ? '（⚠ 工作区本体！）' : '（临时目录，工作区不受影响）'}\n`);

const {check} = await import('./audit-metrics.mjs');

/** 拿真实的报告当底稿，逐项改坏。 */
const baseline = JSON.parse(fs.readFileSync(path.join(workdir, BASELINE_REL), 'utf8'));

/** 造一份「只把某项改坏」的报告。 */
function reportWith(patch) {
  return {
    metrics: {...baseline.metrics, ...patch},
    realmCounts: {},
  };
}

/** 判据级：改坏一项，`check()` 必须报出对应的问题。 */
function expectRed(name, patch, expect) {
  const problems = check(reportWith(patch), baseline);
  const hit = problems.some(p => expect.test(p));
  ok(hit, `${name} 报红`);
  if (!hit) {
    console.error('      判据没报红 ⇒ 这是假门禁');
    console.error('      实际问题清单：' + (problems.join('；') || '（空）'));
  }
}

try {
  console.log('A · 判据本身抓得住坏值');
  expectRed('反向验证 ①「密度超标」', {density10: 6}, /density10 超过硬底线/);
  expectRed('反向验证 ②「冷却超标」', {cooldownRepeats: 1}, /cooldownRepeats 超过硬底线/);
  expectRed('反向验证 ③「每境内容种数不足」', {realmContentMin: 4}, /realmContentMin 低于硬底线/);
  expectRed('反向验证 ④「结局缺失」', {endingMissing: 1}, /endingMissing 超过硬底线/);
  expectRed('反向验证 ⑤「突破间隔变宽」', {spanMedian: 60}, /spanMedian/);
  expectRed('反向验证 ⑥「可达性倒退」', {neverSeen: 200}, /neverSeen 变差了/);

  console.log('\nB · 门禁真的会在 CLI 上退出码 1');
  const baselinePath = path.join(workdir, BASELINE_REL);
  const baselineBefore = fs.readFileSync(baselinePath, 'utf8');

  /* ── ⑦ 闸与规格对不上（**真改规则层源码**）──────────────────────────── */
  {
    const gatesPath = path.join(workdir, GATES_REL);
    const gatesBefore = fs.readFileSync(gatesPath, 'utf8');
    /* 把规则层的十年密度上限从 5 改成 9 —— 规格那一份不动。 */
    const patched = gatesBefore.replace('export const DENSITY_MAX_10Y = 5;', 'export const DENSITY_MAX_10Y = 9;');
    if (patched === gatesBefore) {
      skip('反向验证 ⑦「闸与规格对不上」（注入点找不到）');
    } else {
      fs.writeFileSync(gatesPath, patched);
      const r = runScript(workdir, 'scripts/audit-metrics.mjs', ['--count=120', '--check']);
      fs.writeFileSync(gatesPath, gatesBefore);
      ok(r.code !== 0 && /密度闸的十年上限与规格不一致/.test(r.out),
        `反向验证 ⑦「闸与规格对不上」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
    }
  }

  /* ── ⑧ 基线里少了新指标 ─────────────────────────────────────────────── */
  {
    const broken = JSON.parse(baselineBefore);
    delete broken.metrics.spanMedian;
    fs.writeFileSync(baselinePath, JSON.stringify(broken, null, 2) + '\n');
    const r = runScript(workdir, 'scripts/audit-metrics.mjs', ['--count=120', '--check']);
    fs.writeFileSync(baselinePath, baselineBefore);
    ok(r.code !== 0 && /基线里没有这一项/.test(r.out),
      `反向验证 ⑧「基线里少了新指标」报红（退出码 ${r.code}）`);
    if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
  }

  /* ── ⑨ 端到端：把基线改坏（密度降到 2）⇒ CLI 退出码 1 ─────────────── */
  {
    const broken = JSON.parse(baselineBefore);
    broken.metrics.density10 = 2;
    fs.writeFileSync(baselinePath, JSON.stringify(broken, null, 2) + '\n');
    const r = runScript(workdir, 'scripts/audit-metrics.mjs', ['--count=120', '--check']);
    fs.writeFileSync(baselinePath, baselineBefore);
    ok(r.code !== 0 && /density10 变差了/.test(r.out),
      `反向验证 ⑨「把基线改坏」报红（退出码 ${r.code}）`);
    if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
  }

  /* ── ⑩ 正面对照：基线正常 ⇒ 退出码 0 ───────────────────────────────── */
  {
    const r = runScript(workdir, 'scripts/audit-metrics.mjs', ['--count=120', '--check']);
    ok(r.code === 0 && /六项指标都不比基线差/.test(r.out),
      `反向验证 ⑩「基线正常时门禁是绿的」（退出码 ${r.code}）`);
    if (r.code !== 0) {
      console.error('      门禁一直报红 ⇒ 那也是假门禁');
      console.error('      输出尾部：' + String(r.out).split('\n').slice(-6).join('\n      '));
    }
  }

  console.log('\nC · 表达域「360 条全覆盖」这条新判据');
  const EXPR_BASELINE_REL = 'tests/fixtures/expressions.json';

  /* ── ⑪ 抽掉一条说法 ⇒ 「没说法」必须报红 ────────────────────────────── */
  {
    /* ⚠ 抽的是**修仙线**那条（`content/expressions/events/entry.js`）——
     *   抽经典线的会让 `makeReadable` 直接抛错（崩），那是崩不是报红 ⇒ 证明不了判据。 */
    const shard = path.join(workdir, 'content/expressions/events/entry.js');
    const before = fs.readFileSync(shard, 'utf8');
    const patched = before.replace(/^ {2}early_demonic: \[\n[\s\S]*?\n {2}\],/m, '');
    if (patched === before) {
      skip('反向验证 ⑪「抽掉一条说法」（注入点找不到）');
    } else {
      fs.writeFileSync(shard, patched);
      const r = runScript(workdir, 'scripts/verify-expressions.mjs');
      fs.writeFileSync(shard, before);
      ok(r.code !== 0 && /没说法/.test(r.out),
        `反向验证 ⑪「抽掉一条说法」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
    }
  }

  /* ── ⑫ 把基线里一条说法改坏 ⇒ 逐值全等必须报红 ─────────────────────── */
  {
    const p = path.join(workdir, EXPR_BASELINE_REL);
    const before = fs.readFileSync(p, 'utf8');
    const doc = JSON.parse(before);
    const id = Object.keys(doc).find(k => doc[k].v1 && doc[k].v1.title);
    if (!id) {
      skip('反向验证 ⑫「把基线里一条说法改坏」（基线里没有可改的条目）');
    } else {
      doc[id].v1.title = '故意改坏的一句';
      fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
      const r = runScript(workdir, 'scripts/verify-expressions.mjs');
      fs.writeFileSync(p, before);
      ok(r.code !== 0 && /标题/.test(r.out),
        `反向验证 ⑫「把基线里一条说法改坏」报红（退出码 ${r.code}）`);
      if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
    }
  }

  /* ── ⑬ 正面对照：基线正常 ⇒ 经典门禁是绿的 ─────────────────────────── */
  {
    const r = runScript(workdir, 'scripts/verify-expressions.mjs');
    ok(r.code === 0 && /结果：0 个问题/.test(r.out),
      `反向验证 ⑬「基线正常时经典门禁是绿的」（退出码 ${r.code}）`);
    if (r.code !== 0) {
      console.error('      门禁一直报红 ⇒ 那也是假门禁');
      console.error('      输出尾部：' + String(r.out).split('\n').slice(-6).join('\n      '));
    }
  }
} finally {
  if (!INPLACE) {
    fs.rmSync(workdir, {recursive: true, force: true});
    console.log(`\n临时副本已删除：${workdir}`);
  }
}

if (failures) {
  console.error(`\n${failures} 道反向验证没通过。`);
  process.exit(1);
}
console.log(`\n结果：0 个问题${skipped ? `（跳过 ${skipped} 道）` : ''}`);
