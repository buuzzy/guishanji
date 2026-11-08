#!/usr/bin/env node
/**
 * t9-reverse.mjs —— T9 内容完备度门禁的反向验证（**不是门禁，是门禁的体检**）
 * ============================================================================
 *
 * ## 为什么要有这个
 * ----------------
 * AGENTS.md 写得很直白：**「门禁必须是真门禁」** ——
 * 每条关键断言都要做反向验证（注入一个坏值，必须报红）。
 * 否则一个「跑一遍没报错」的假门禁，比没有门禁更糟。
 *
 * ## 这道脚本证明两件事
 * --------------------
 *   **A · 判据本身抓得住坏值**（十道）
 *     直接拿真实量出来的事实，**改一个数**，看对应判据会不会报红：
 *       ① 有故事线空了            → line-empty
 *       ② 有境界段内容太少        → realm-thin
 *       ③ 有长线只有一步          → chain-short
 *       ④ 结局太少                → endings-thin
 *       ⑤ 有灵根没说明            → root-no-description
 *       ⑥ 晚年内容太少            → late-too-thin
 *       ⑦ 判据被放松              → 台账比对必须报红（缺口「不见了」）
 *         ⚠ 用哪条缺口做，必须看台账里现在还有哪条（见下面 ⑦ 的注释）
 *       ⑧ 新缺口没登记            → 台账比对必须报红
 *       ⑨ 台账过期（写了脚本不认识的缺口）→ 台账比对必须报红
 *       ⑩ 台账漏登记（把已知缺口从台账里删掉）→ 台账比对必须报红
 *
 *   **B · 门禁真的会在 CLI 上退出码 1**（四道）
 *       ⑪ 台账文件没了        → 退出码 1
 *       ⑫ 台账里少了那条缺口  → 退出码 1
 *       ⑬ 台账里写了不认识的  → 退出码 1
 *       ⑭ **正面对照**：台账正常 → 退出码 0（证明它不是「永远报红」）
 *
 * ⚠ **⑭ 那道不能省**：只会证明「会报红」的脚本，也可能是「永远报红」。
 *   必须同时证明「该绿的时候它绿」。
 *
 * 用法：
 *   node scripts/t9-reverse.mjs            # 在**临时副本**上做，不碰工作区
 *   node scripts/t9-reverse.mjs --inplace  # 在工作区做（会改台账文件，用完还原）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPLACE = process.argv.includes('--inplace');
const LEDGER_REL = 'tests/fixtures/completeness-gaps.json';

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

console.log('T9 内容完备度门禁 · 反向验证（注入坏值，必须报红）\n');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsj-t9-reverse-'));
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

const {evaluate, compare, collectFacts, CRITERIA} = await import('./audit-completeness.mjs');

/** 事实的深拷贝（facts 里全是 JSON 能装的东西）。 */
function cloneFacts(facts) {
  return JSON.parse(JSON.stringify(facts));
}

/** 台账的深拷贝。 */
function cloneLedger(ledger) {
  return JSON.parse(JSON.stringify(ledger));
}

try {
  console.log('A · 判据本身抓得住坏值');
  const facts = collectFacts(120);
  const ledger = JSON.parse(fs.readFileSync(path.join(workdir, LEDGER_REL), 'utf8'));

  /* ── ① 有故事线空了 ─────────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.lineCounts['俗世生活'] = 0;
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'line-empty'), '反向验证 ①「有故事线空了」判据报红');
  }

  /* ── ② 有境界段内容太少 ─────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.realmCounts['4'] = 1;
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'realm-thin'), '反向验证 ②「有境界段内容太少」判据报红');
  }

  /* ── ③ 有长线只有一步 ───────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.chains[0].steps = 1;
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'chain-short'), '反向验证 ③「有长线只有一步」判据报红');
  }

  /* ── ④ 结局太少 ─────────────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.endingCount = 10;
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'endings-thin'), '反向验证 ④「结局太少」判据报红');
  }

  /* ── ⑤ 有灵根没说明 ─────────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.rootsWithoutDescription = ['水木双灵根'];
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'root-no-description'), '反向验证 ⑤「有灵根没说明」判据报红');
  }

  /* ── ⑥ 晚年内容太少 ─────────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    f.lateKinds = 5;
    const gaps = evaluate(f);
    ok(gaps.some(g => g.kind === 'late-too-thin'), '反向验证 ⑥「晚年内容太少」判据报红');
  }

  /* ── ⑦ 判据被放松（缺口「不见了」）────────────────────────────────────
   * ⚠ 这一道最要紧：只盯「新缺口」的话，把判据放松就能让缺口消失 ⇒ 假门禁。
   *   这里假装判据被放宽（把「高境界段突破间隔」的实测当成达标）
   *   ⇒ 缺口不再成立 ⇒ 台账比对必须报红（否则文档会一直说「还缺」，而判据已经不管了）。
   *
   * ⚠⚠ **用哪条缺口做这件事，必须看台账里现在还有哪条**（2026-11-08 改）：
   *   原来用的是「晚年没有收尾类卡」。2026-11-08 剧情线试点把那条缺口顶过去了
   *   （实测从 2 次变成 3 次，跨过底线 3 次）⇒ 那条缺口不再登记在台账里
   *   ⇒ 拿它做反向验证就变成了「把一条不存在的缺口从台账里删掉」⇒ 永远报不了红
   *   ⇒ 这三道（⑦⑩⑫）全部改成盯台账里**还在**的那条：
   *     「高境界段的突破间隔太长」（`span-too-wide`）。
   *   ⚠ 台账里的缺口集合变了，这三道必须跟着换 —— 否则门禁是假的。
   */
  {
    const f = cloneFacts(facts);
    f.span.worst = 1; // 假装「每一段的突破间隔都达标」
    const gaps = evaluate(f);
    const problems = compare(gaps, ledger);
    ok(gaps.length === 0 || !gaps.some(g => g.kind === 'span-too-wide'),
      '反向验证 ⑦「突破间隔判据被放松」缺口不再成立');
    ok(problems.some(p => /现在不成立/.test(p)),
      '反向验证 ⑦「突破间隔判据被放松」台账比对报红');
  }

  /* ── ⑧ 新缺口没登记 ─────────────────────────────────────────────────── */
  {
    const f = cloneFacts(facts);
    /* 假装有一个「已知缺口」成立，但台账里没有它。 */
    const empty = cloneLedger(ledger);
    empty.knownGaps = [];
    const problems = compare(evaluate(f), empty);
    ok(problems.some(p => /新增缺口/.test(p)), '反向验证 ⑧「新缺口没登记」台账比对报红');
  }

  /* ── ⑨ 台账过期（写了脚本不认识的缺口）────────────────────────────── */
  {
    const stale = cloneLedger(ledger);
    stale.knownGaps = [...stale.knownGaps, {kind: 'some-gap-from-the-past', title: '以前的一条缺口'}];
    const problems = compare(evaluate(facts), stale);
    ok(problems.some(p => /脚本不认识/.test(p)), '反向验证 ⑨「台账过期」台账比对报红');
  }

  /* ── ⑩ 台账漏登记（把已知缺口从台账里删掉）────────────────────────── */
  {
    const missing = cloneLedger(ledger);
    missing.knownGaps = missing.knownGaps.filter(g => g.kind !== 'span-too-wide');
    const problems = compare(evaluate(facts), missing);
    ok(problems.some(p => /新增缺口/.test(p)), '反向验证 ⑩「台账漏登记」台账比对报红');
  }

  console.log('\nB · 门禁真的会在 CLI 上退出码 1');
  const ledgerPath = path.join(workdir, LEDGER_REL);
  const ledgerBefore = fs.readFileSync(ledgerPath, 'utf8');

  /* ── ⑪ 台账文件没了 ─────────────────────────────────────────────────── */
  {
    fs.rmSync(ledgerPath);
    const r = runScript(workdir, 'scripts/audit-completeness.mjs', ['--check']);
    fs.writeFileSync(ledgerPath, ledgerBefore);
    ok(r.code !== 0 && /没有台账文件/.test(r.out),
      `反向验证 ⑪「台账文件没了」报红（退出码 ${r.code}）`);
    if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
  }

  /* ── ⑫ 台账里少了那条缺口 ───────────────────────────────────────────── */
  {
    const broken = cloneLedger(JSON.parse(ledgerBefore));
    broken.knownGaps = broken.knownGaps.filter(g => g.kind !== 'span-too-wide');
    fs.writeFileSync(ledgerPath, JSON.stringify(broken, null, 2) + '\n');
    const r = runScript(workdir, 'scripts/audit-completeness.mjs', ['--check']);
    fs.writeFileSync(ledgerPath, ledgerBefore);
    ok(r.code !== 0 && /新增缺口/.test(r.out),
      `反向验证 ⑫「台账里少了那条缺口」报红（退出码 ${r.code}）`);
    if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
  }

  /* ── ⑬ 台账里写了脚本不认识的缺口 ─────────────────────────────────── */
  {
    const broken = cloneLedger(JSON.parse(ledgerBefore));
    broken.knownGaps = [...broken.knownGaps, {kind: 'some-gap-from-the-past', title: '以前的一条缺口'}];
    fs.writeFileSync(ledgerPath, JSON.stringify(broken, null, 2) + '\n');
    const r = runScript(workdir, 'scripts/audit-completeness.mjs', ['--check']);
    fs.writeFileSync(ledgerPath, ledgerBefore);
    ok(r.code !== 0 && /脚本不认识/.test(r.out),
      `反向验证 ⑬「台账里写了不认识的缺口」报红（退出码 ${r.code}）`);
    if (r.code === 0) console.error('      门禁没报红 ⇒ 这是假门禁');
  }

  /* ── ⑭ 正面对照：台账正常 ⇒ 退出码 0 ───────────────────────────────── */
  {
    const r = runScript(workdir, 'scripts/audit-completeness.mjs', ['--check']);
    ok(r.code === 0 && /硬底线都没破/.test(r.out),
      `反向验证 ⑭「台账正常时门禁是绿的」（退出码 ${r.code}）`);
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
