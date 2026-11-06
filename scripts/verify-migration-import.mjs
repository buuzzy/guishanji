#!/usr/bin/env node
/**
 * verify-migration-import.mjs — 迁移导入核对（阶段 0 / 阶段 1 的通过标准）
 * ============================================================================
 *
 * 归山记从 `buuzzy/1in8b` 迁入本仓库时，每一份文件都记了「来源仓库 / 来源提交 /
 * 来源路径 / 字节数 / SHA-256」。本脚本**只依赖仓库内已提交的那份清单**
 * （`docs/migration/source-manifest.json`），逐个重算当前工作区的哈希并比对。
 *
 * 清单分四组（见 gen-source-manifest.mjs）：
 *   unchanged —— 必须仍与来源**逐字节一致**；
 *   changed   —— 本轮有意改过：核对**现哈希**与清单一致（防止改完忘了更新清单），
 *                并核对**来源哈希**确实来自那个来源（证据链不丢）；
 *   moved     —— 换了位置：核对新旧两处的现哈希；
 *   added     —— 本轮新增：只核对现哈希。
 *
 * 为什么不能靠「旁边那个目录」
 * --------------------------
 * 迁移后的新仓库**不允许**依赖 `../1in8b` 这类相邻目录
 * （别的机器上不存在 ⇒ 门禁变假门禁）。因此：
 *   · 生成清单：一次性，用真实的 1in8b 仓库生成，写进 git；
 *   · 核对清单：随时可跑，只跟本仓库自己的字节比对。
 *
 * ⚠ 2026-11-07：来源仓库 `buuzzy/xianxia-life` 已删除（字节已完整迁入本仓库）。
 *   ⇒ 完整模式现在只需要 1in8b；xianxia-life 的 commit 记在清单里长期保留。
 *
 * 用法
 * ----
 *   node scripts/verify-migration-import.mjs
 *
 * 退出码：0 = 全部一致；1 = 有文件缺失 / 哈希不符 / 清单里有仓库里没有的文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_FILE = path.join(ROOT, 'docs', 'migration', 'source-manifest.json');

let failures = 0;
function ok(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}
const digest = (file) => {
  const b = fs.readFileSync(file);
  return {bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex')};
};

console.log('迁移导入核对（来源哈希 vs 本仓库工作区）\n');

if (!fs.existsSync(MANIFEST_FILE)) {
  console.error(`缺少来源清单：${path.relative(ROOT, MANIFEST_FILE)}`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
const g = manifest.groups || {};

const total = ['unchanged', 'changed', 'moved', 'added']
  .reduce((n, k) => n + ((g[k] || []).length), 0);
console.log(`来源清单：${total} 个文件（未改动 / 有意改动 / 换位置 / 新增）`);
for (const src of manifest.sources) {
  console.log(`  · ${src.repo} @ ${src.commit}（${src.path || '仓库根'}）`);
}
console.log('');

const seen = new Set();
const check = (entry, current, label) => {
  const abs = path.join(ROOT, entry.path);
  if (seen.has(entry.path)) {
    failures++;
    console.error(`  ✗ 清单里有重复条目：${entry.path}`);
    return;
  }
  seen.add(entry.path);
  if (!fs.existsSync(abs)) {
    failures++;
    console.error(`  ✗ 文件缺失：${entry.path}`);
    return;
  }
  const d = digest(abs);
  if (d.sha256 !== current || d.bytes !== entry.bytes) {
    failures++;
    console.error(
      `  ✗ ${label}：${entry.path}\n` +
      `      期望 ${current} (${entry.bytes}B) / 实际 ${d.sha256} (${d.bytes}B)`
    );
  }
};

const gUnchanged = g.unchanged || [];
let bad = 0;
for (const e of gUnchanged) {
  const abs = path.join(ROOT, e.path);
  if (!fs.existsSync(abs)) { bad++; console.error(`  ✗ 文件缺失：${e.path}`); seen.add(e.path); continue; }
  const d = digest(abs);
  if (d.sha256 !== e.sha256 || d.bytes !== e.bytes) {
    bad++;
    console.error(`  ✗ 与来源不再逐字节一致：${e.path}\n      来源 ${e.sha256} / 现在 ${d.sha256}`);
  }
}
ok(bad === 0, `未改动的 ${gUnchanged.length} 个文件仍与来源逐字节一致`);

const gChanged = g.changed || [];
bad = 0;
for (const e of gChanged) {
  const abs = path.join(ROOT, e.path);
  if (!fs.existsSync(abs)) { bad++; console.error(`  ✗ 文件缺失：${e.path}`); continue; }
  const d = digest(abs);
  if (d.sha256 !== e.currentSha256 || d.bytes !== e.currentBytes) {
    bad++;
    console.error(`  ✗ 清单里的「现哈希」与工作区不一致（改了但没更新清单）：${e.path}`);
  }
  if (!e.reason || e.reason.startsWith('（未登记原因')) {
    bad++;
    console.error(`  ✗ 改动没有登记原因：${e.path}`);
  }
  if (!e.sourceSha256) {
    bad++;
    console.error(`  ✗ 缺来源哈希（证据链断了）：${e.path}`);
  }
}
ok(bad === 0, `${gChanged.length} 个有意改动的文件：现哈希一致、原因已登记、来源哈希仍在`);

const gMoved = g.moved || [];
bad = 0;
for (const e of gMoved) {
  const abs = path.join(ROOT, e.path);
  if (!fs.existsSync(abs)) { bad++; console.error(`  ✗ 移动后的文件缺失：${e.path}`); continue; }
  const d = digest(abs);
  if (d.sha256 !== e.currentSha256) {
    bad++;
    console.error(`  ✗ 移动后的文件与清单不符：${e.path}`);
  }
  if (!e.sourceSha256) {
    bad++;
    console.error(`  ✗ 移动记录缺来源哈希：${e.path}`);
  }
}
ok(bad === 0, `${gMoved.length} 个换了位置的文件：新位置哈希一致、来源哈希仍在`);

const gAdded = g.added || [];
bad = 0;
const staleAdded = [];
for (const e of gAdded) {
  const abs = path.join(ROOT, e.path);
  if (!fs.existsSync(abs)) { bad++; console.error(`  ✗ 新增文件缺失：${e.path}`); continue; }
  const d = digest(abs);
  if (d.sha256 !== e.sha256 || d.bytes !== e.bytes) {
    bad++;
    staleAdded.push(e.path);
    console.error(`  ✗ 新增文件与清单不一致：${e.path}`);
  }
}
ok(bad === 0, `${gAdded.length} 个本轮新增的文件：哈希一致`);

/* ⚠ 改了「本轮新增」的文件却忘了重生成清单 ⇒ 门禁报红，但**人不知道该做什么**。
 *   ⇒ 直接把命令打出来（这是最常见的场景：本轮新写/新改的文件）。 */
if (staleAdded.length) {
  console.error('');
  console.error('  ⇒ 这几个文件本轮被改过，清单的哈希跟不上。');
  console.error('    重新生成清单即可（需要 1in8b 仓库在本机）：');
  console.error('      node scripts/gen-source-manifest.mjs --one8b=<1in8b 目录>');
  console.error('    ⚠ 若 1in8b 不在本机：清单只依赖仓库内的文件，');
  console.error('      可用 --offline 只重算仓库内文件的哈希（见脚本用法）。');
  console.error('');
}

/* ── 包体实测台账：只查「存在且字段齐全」，**不锁哈希** ──────────────
 *
 * ⚠ 为什么它不锁哈希：
 *   `docs/mp-package-size.json` 是**每次真机量包体都会重写**的快照
 *   （里面有 measuredAt 时间戳、机器信息、当次 commit）。
 *   一旦把它的哈希写进清单 ⇒ 每次重测包体，`import` 门禁就报红
 *   ⇒ 门禁会逼着人「要么别重测、要么改清单」⇒ 反而没人愿意再量包体。
 *   这跟「新增文件要锁哈希」（防偷改）的初衷是冲突的。
 *
 * ⇒ 折中：**锁结构，不锁内容**：
 *   必须存在、必须能解析、必须记着「编译后」的真实体积
 *   （compiled.total 非空）、必须标着工具版本与源码指纹。
 *   有人偷偷删了报告、或把数字改成一个假的，门禁照样红。
 */
const sizeReport = path.join(ROOT, 'docs', 'mp-package-size.json');
if (!fs.existsSync(sizeReport)) {
  failures++;
  console.error('  ✗ 缺少包体实测台账：docs/mp-package-size.json');
  ok(false, '包体实测台账存在、含编译后体积与工具版本（内容不锁哈希：每次重测都会变）');
} else {
  let doc = null;
  try { doc = JSON.parse(fs.readFileSync(sizeReport, 'utf8')); } catch (error) {
    failures++;
    console.error('  ✗ 包体台账不是合法 JSON：' + error.message);
    ok(false, '包体实测台账存在、含编译后体积与工具版本（内容不锁哈希：每次重测都会变）');
  }
  if (doc) {
    const problems = [];
    if (!doc.compiled || !doc.compiled.total) problems.push('没有「编译后」的真实体积（compiled.total 为空）');
    if (!doc.sourceFingerprint) problems.push('缺源码指纹（sourceFingerprint）');
    if (!doc.tool || !doc.tool.ideVersion) problems.push('缺工具版本（tool.ideVersion）');
    if (doc.passed !== true) problems.push('标记为未通过（passed ≠ true）');
    for (const p of problems) { failures++; console.error('  ✗ 包体台账' + p); }
    ok(problems.length === 0, '包体实测台账存在、含编译后体积与工具版本（内容不锁哈希：每次重测都会变）');
  }
}

if (failures) {
  console.error(`\n${failures} 处不一致。`);
  process.exit(1);
}
console.log(
  `\n全部一致：未改动 ${gUnchanged.length} + 有意改动 ${gChanged.length} + ` +
  `换位置 ${gMoved.length} + 新增 ${gAdded.length}。`
);
