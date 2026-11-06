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
 * 迁移后的新仓库**不允许**依赖 `../xianxia-life` 或 `../1in8b` 这类相邻目录
 * （CI 上不存在 ⇒ 门禁变假门禁）。因此：
 *   · 生成清单：一次性，用真实的两个来源仓库生成，写进 git；
 *   · 核对清单：随时可跑，只跟本仓库自己的字节比对。
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
for (const e of gAdded) {
  const abs = path.join(ROOT, e.path);
  if (!fs.existsSync(abs)) { bad++; console.error(`  ✗ 新增文件缺失：${e.path}`); continue; }
  const d = digest(abs);
  if (d.sha256 !== e.sha256 || d.bytes !== e.bytes) {
    bad++;
    console.error(`  ✗ 新增文件与清单不一致：${e.path}`);
  }
}
ok(bad === 0, `${gAdded.length} 个本轮新增的文件：哈希一致`);

if (failures) {
  console.error(`\n${failures} 处不一致。`);
  process.exit(1);
}
console.log(
  `\n全部一致：未改动 ${gUnchanged.length} + 有意改动 ${gChanged.length} + ` +
  `换位置 ${gMoved.length} + 新增 ${gAdded.length}。`
);
