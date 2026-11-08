#!/usr/bin/env node
/**
 * t11-reverse.mjs —— 2026-11-08 新增断言的反向验证（**不是门禁，是门禁的体检**）
 * ============================================================================
 *
 * ## 为什么要有这个
 * ----------------
 * 2026-11-08 清理网页端时，9 道浏览器门禁里有 **6 条状态类断言**在 Node 侧
 * **没人守**（逐条对照见 `docs/browser-gate-coverage.md` §3）。
 * 那 6 条已经补进 Node 侧，但按 AGENTS.md 的口径：
 * **「跑一遍没报错」证明不了它有用** —— 断言写错了也可能是绿的。
 *
 * 这道脚本给那 6 条各注入一个坏值，**每一条都必须报红**，
 * 再跑一遍**正面对照**（不注入 ⇒ 必须绿），证明它们不是「永远绿」也不是「永远红」。
 *
 * | # | 断言 | 注入的坏值 | 跑什么 |
 * | --- | --- | --- | --- |
 * | ① | 选项与提示语不泄露内部成功率 | 一张卡的选项提示语里塞「成功率 40%」 | `scripts/verify-event-expressions.mjs` |
 * | ② | 凡人线卡片的**选项**也不含百分比 | 一张凡人卡的选项名里塞「成功率 80%」 | `tests/mundane-life.test.mjs` |
 * | ③ | 凡人线可以迟入（走到 m11_gift_3 且境界 ≥ 1） | 把迟入那一步的选择改掉 | `tests/mundane-life.test.mjs` |
 * | ④ | 收殓之后走不到 m11_corpse_2 | 把「收殓」的走法改成「取物」 | `tests/mundane-life.test.mjs` |
 * | ⑤ | 地图标的「当前所在」与存档一致 | 让 mapView 报一个错的大陆 | `tests/story-rules12.test.mjs` |
 * | ⑥ | `'teach'` 公库扣 6 枚、`'lead'` 才是领队 | 把公库支出改成 5 枚 / 把领队改成协助者 | `tests/progression.test.mjs` |
 *
 * 用法：
 *   node scripts/t11-reverse.mjs            # 在**临时副本**上做，不碰工作区
 *   node scripts/t11-reverse.mjs --inplace  # 在工作区做（会改文件，用完还原）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPLACE = process.argv.includes('--inplace');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}

console.log('T11 · 2026-11-08 新增断言的反向验证（注入坏值，必须报红）\n');

/** 在指定根目录跑一个脚本，返回 {code, out}（**不抛异常**）。 */
function runScript(root, args) {
  try {
    const out = execFileSync(process.execPath, args, {
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsj-t11-reverse-'));
  for (const rel of ['content', 'packages', 'scripts', 'tests', 'docs', 'miniprogram']) {
    fs.cpSync(path.join(ROOT, rel), path.join(dir, rel), {recursive: true});
  }
  fs.cpSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) {
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  }
  return dir;
}

const workdir = INPLACE ? ROOT : makeCopy();
console.log(`工作副本：${workdir}${INPLACE ? '（⚠ 工作区本体！）' : '（临时目录，工作区不受影响）'}\n`);

/** 改一个文件里的唯一一段文字。 */
function patchFile(rel, from, to) {
  const file = path.join(workdir, rel);
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes(from)) throw new Error(`补丁锚点没找到：${rel} · ${from.slice(0, 50)}`);
  fs.writeFileSync(file, before.replace(from, to));
  return () => fs.writeFileSync(file, before);
}

/** 一条反向验证：注入坏值 ⇒ 必须报红（且要说清是为什么报红）。 */
function expectRed(name, {patch, run, expect}) {
  const restore = patch();
  try {
    const {code, out} = run();
    const red = code !== 0;
    const why = expect.test(out);
    ok(red && why, `${name} 报红${red ? '' : '（❌ 竟然没报错 ⇒ 这是假门禁）'}`);
    if (!red) console.error('      退出码是 0 ⇒ 注入的坏值没被抓住');
    if (red && !why) console.error('      报红了，但不是要找的那条：\n' + out.slice(-1200));
  } finally {
    restore();
  }
}

/** 正面对照：不注入 ⇒ 必须绿。 */
function expectGreen(name, run) {
  const {code, out} = run();
  ok(code === 0, `${name} 正常时是绿的`);
  if (code !== 0) console.error(out.slice(-1200));
}

const TEST = (file) => ['--test', `tests/${file}`];

try {
  /* ── ① 选项不许泄露内部成功率 ─────────────────────────────────────── */

  console.log('① 选项与提示语不泄露内部成功率');
  expectRed('把「成功率 40%」塞进一张卡的选项提示语', {
    patch: () => patchFile(
      'content/cultivation-stories.js',
      "c('test','排队接受测灵根','测灵石会留下记录。'",
      "c('test','排队接受测灵根','测灵石会留下记录，成功率 40%。'"
    ),
    run: () => runScript(workdir, ['scripts/verify-event-expressions.mjs']),
    expect: /泄露内部成功率/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, ['scripts/verify-event-expressions.mjs']));

  /* ── ② 凡人线卡片的选项也不含百分比 ───────────────────────────────── */

  console.log('\n② 凡人线卡片的选项也不含百分比');
  expectRed('把「成功率 80%」塞进一张凡人卡的选项名', {
    patch: () => patchFile(
      'content/mundane-stories.js',
      "choice('start','yard','留在山门外院'",
      "choice('start','yard','留在山门外院，成功率 80%'"
    ),
    run: () => runScript(workdir, TEST('mundane-life.test.mjs')),
    expect: /内部成功率/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, TEST('mundane-life.test.mjs')));

  /* ── ③ 凡人线可以迟入 ─────────────────────────────────────────────── */

  console.log('\n③ 凡人线可以迟入（走到 m11_gift_3 且境界 ≥ 1）');
  expectRed('把「迟入」时给的那一重境界扣掉', {
    patch: () => patchFile(
      'packages/adventure/mundane-life.js',
      "if(id==='learn'){g.stage='entered';cb.apply({realm:1});",
      "if(id==='learn'){g.stage='entered';"
    ),
    run: () => runScript(workdir, TEST('mundane-life.test.mjs')),
    expect: /迟入/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, TEST('mundane-life.test.mjs')));

  /* ── ④ 收殓之后走不到 m11_corpse_2 ────────────────────────────────── */

  console.log('\n④ 收殓之后走不到 m11_corpse_2');
  expectRed('把「收殓」的走法改成「取物」', {
    patch: () => patchFile(
      'scripts/audit-mundane-life.mjs',
      "mode==='burial'?'bury'",
      "mode==='burial'?'take'"
    ),
    run: () => runScript(workdir, TEST('mundane-life.test.mjs')),
    expect: /取物出售|收殓/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, TEST('mundane-life.test.mjs')));

  /* ── ⑤ 地图标的「当前所在」与存档一致 ─────────────────────────────── */

  console.log('\n⑤ 地图标的「当前所在」与存档一致');
  expectRed('让 mapView 报一个错的大陆', {
    patch: () => patchFile(
      'packages/adventure/cultivation.js',
      'return {current,visited,unlocked};',
      "return {current:'sky',visited,unlocked};"
    ),
    run: () => runScript(workdir, TEST('story-rules12.test.mjs')),
    expect: /当前所在/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, TEST('story-rules12.test.mjs')));

  /* ── ⑥ 议事的两笔公产支出与领队身份 ───────────────────────────────── */

  console.log('\n⑥ 议事的两笔公产支出与领队身份');
  expectRed('把「安排授业与药园」的公库支出从 6 枚改成 5 枚', {
    patch: () => patchFile(
      'content/progression-stories.js',
      "action('council',{priority:'teach',publicCost:6})",
      "action('council',{priority:'teach',publicCost:5})"
    ),
    run: () => runScript(workdir, TEST('progression.test.mjs')),
    expect: /六枚|treasury/,
  });
  expectRed('把「留下建山门」的领队改成协助者', {
    patch: () => patchFile(
      'packages/adventure/progression.js',
      "pp.sect.role=choiceId==='lead'?'leader':'supporter'",
      "pp.sect.role='supporter'"
    ),
    run: () => runScript(workdir, TEST('progression.test.mjs')),
    expect: /领队|role/,
  });
  expectGreen('没注入坏值时', () => runScript(workdir, TEST('progression.test.mjs')));
} catch (error) {
  failures++;
  console.error('\n反向验证脚本自己出错了：' + (error.stack || error.message));
}

if (failures) {
  console.error(`\n${failures} 处没通过。`);
  process.exit(1);
}
console.log('\n结果：0 个问题');
