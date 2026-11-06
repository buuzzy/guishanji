#!/usr/bin/env node
/**
 * gen-source-manifest.mjs — 一次性生成迁移来源清单
 * ============================================================================
 *
 * **这不是门禁**，是一次性工具：需要同时能访问两个来源仓库时才能跑。
 * 生成结果写进 `docs/migration/source-manifest.json` 并提交；
 * 日常核对用 `scripts/verify-migration-import.mjs`（只依赖仓库内清单）。
 *
 * 清单分四组，把「迁进来的证据」和「本轮有意改的」分开记：
 *   unchanged —— 迁进来后**一个字没动**，必须仍与来源逐字节一致；
 *   changed   —— 本轮**有意改过**（改了什么、为什么），记来源哈希与现哈希；
 *   moved     —— 换了位置（内容基本不变），记来源路径与新路径；
 *   added     —— 本轮**新增**的文件（不是迁入的），只记现哈希。
 *
 * 用法
 * ----
 *   node scripts/gen-source-manifest.mjs \
 *     --xianxia-life=/path/to/xianxia-life \
 *     --one8b=/path/to/1in8b
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.+)$/.exec(a);
    return m ? [m[1], m[2]] : [a, true];
  })
);

const XL = args['xianxia-life'];
const ONE = args['one8b'];
if (!XL || !ONE) {
  console.error('用法：node scripts/gen-source-manifest.mjs --xianxia-life=<目录> --one8b=<目录>');
  process.exit(2);
}

const digest = (file) => {
  const b = fs.readFileSync(file);
  return {bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex')};
};
const headOf = (dir) => execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();

/* 来源路径 → 本仓库路径。 */
const MAP = [];
const pushTree = (srcRoot, prefix) => {
  const walk = (rel) => {
    const abs = path.join(srcRoot, rel);
    for (const e of fs.readdirSync(abs, {withFileTypes: true})) {
      const child = path.posix.join(rel, e.name);
      if (e.isDirectory()) walk(child);
      else MAP.push({src: child, out: child});
    }
  };
  walk(prefix);
};
const pushOne = (src, out) => MAP.push({src, out});

pushTree(ONE, 'miniprogram/subpkg/xianxia');
pushTree(ONE, 'vendor/xianxia-r12');
pushTree(ONE, 'vendor/xianxia-r12-art');

for (const f of ['scripts/build-xianxia-mp.mjs', 'scripts/lib/xianxia-bundle.mjs',
  'scripts/lib/es2015-downlevel.mjs', 'scripts/test-xianxia-build.mjs',
  'scripts/test-xianxia-mp.mjs', 'scripts/test-xianxia-storage.mjs',
  'scripts/test-xianxia-style.mjs', 'scripts/test-xianxia-art.mjs',
  'scripts/test-xianxia-equivalence.mjs',
  'docs/miniprogram-xianxia-integration.md', 'docs/xianxia-device-checklist.md']) {
  pushOne(f, f);
}

/* 官方对照源：来源是 1in8b 的官方文件，落到本仓库 reference/official/ 下。 */
pushOne('miniprogram/app.wxss', 'reference/official/app.wxss');
pushOne('miniprogram/roll.js', 'reference/official/sources/roll.js');
pushOne('miniprogram/idcard.js', 'reference/official/sources/idcard.js');
pushOne('miniprogram/subpkg/engine/pages/life/life.js', 'reference/official/sources/life.js');
for (const f of ['life', 'roll', 'sheet', 'shelf']) {
  pushOne(`miniprogram/subpkg/engine/styles/${f}.wxss`, `reference/official/styles/${f}.wxss`);
}

/* 本轮有意改过的文件：写清原因。 */
const CHANGED_REASON = {
  'miniprogram/subpkg/xianxia/bridge/session.js': '首页「继续人生」改为接最近动过的那一段人生（原来接最老那段），并支持 ?resume=<编号> 点名',
  'miniprogram/subpkg/xianxia/pages/life/life.js': '失败兜底不再跳 1in8b 的 /subpkg/engine/pages/index/index，改跳新产品首页；续档参数与上面一致',
  'miniprogram/subpkg/xianxia/pages/past/past.js': '失败兜底不再跳 1in8b 的 /subpkg/engine/pages/index/index，改跳新产品首页',
  'miniprogram/subpkg/xianxia/pages/roll/roll.js': '命盘页适配独立启动层（首页进入路径）',
  'miniprogram/subpkg/xianxia/runtime/build-manifest.json': '生成物：来源改为本仓库源码，并新增 upstreamOrigin 段',
  'miniprogram/subpkg/xianxia/runtime/engine.js': '生成物：由本仓库源码重新构建（除文件头注释外与迁移进来的那份逐字节一致，见 reference/migrated-runtime/）',
  'miniprogram/subpkg/xianxia/runtime/pixel-style.js': '生成物：由本仓库源码重新构建（与迁移进来的那份逐字节一致）',
  'scripts/build-xianxia-mp.mjs': '构建来源改为本仓库自己的源码（vendor 快照降级为历史证据），新增 app.wxss 生成',
  'scripts/test-xianxia-art.mjs': '对照基准改为本仓库 reference/ 与 apps/preview/，不再依赖 1in8b 的 frozen-baseline',
  'scripts/test-xianxia-build.mjs': '新增「与迁移进来的产物逐字节一致」断言；不再依赖 1in8b 的 frozen-baseline',
  'scripts/test-xianxia-equivalence.mjs': '对照源改为本仓库 packages/ + content/（源码 vs 产物逐值全等）',
  'scripts/test-xianxia-mp.mjs': '新增首页仿真断言；路径层级按独立启动层调整',
  'scripts/test-xianxia-storage.mjs': '不再依赖 1in8b 的 frozen-baseline，改用本仓库自己的哈希校验',
  'scripts/test-xianxia-style.mjs': '官方对照源改读 reference/official/（本仓库内的锁定副本）+ 新的 app.wxss',
};

/* 本轮换了位置（内容基本没变）。 */
const MOVED = {
  'miniprogram/subpkg/xianxia/bridge/hash.js': 'miniprogram/bridge/hash.js',
  'miniprogram/subpkg/xianxia/bridge/safe-area.js': 'miniprogram/bridge/safe-area.js',
  'miniprogram/subpkg/xianxia/bridge/storage.js': 'miniprogram/bridge/storage.js',
  'miniprogram/subpkg/xianxia/bridge/theme.js': 'miniprogram/bridge/theme.js',
};

const unchanged = [];
const changed = [];
const moved = [];

for (const m of MAP) {
  const srcAbs = path.join(ONE, m.src);
  if (!fs.existsSync(srcAbs)) {
    console.error(`来源缺失，跳过：${m.src}`);
    continue;
  }
  const src = digest(srcAbs);
  const base = {sourceRepo: 'buuzzy/1in8b', sourceCommit: headOf(ONE), sourcePath: m.src, sourceBytes: src.bytes, sourceSha256: src.sha256};

  if (MOVED[m.src]) {
    const out = MOVED[m.src];
    const outAbs = path.join(ROOT, out);
    const cur = fs.existsSync(outAbs) ? digest(outAbs) : null;
    moved.push({...base, path: out, currentBytes: cur && cur.bytes, currentSha256: cur && cur.sha256,
      note: '换到主包（微信规矩：主包不能同步引用分包代码，分包可以引用主包）；仅补了说明性注释，代码未改'});
    continue;
  }

  const outAbs = path.join(ROOT, m.out);
  if (!fs.existsSync(outAbs)) {
    console.error(`本仓库缺少对应文件，跳过：${m.out}`);
    continue;
  }
  const cur = digest(outAbs);
  if (cur.sha256 === src.sha256) {
    unchanged.push({...base, path: m.out, bytes: cur.bytes, sha256: cur.sha256});
  } else {
    changed.push({...base, path: m.out, currentBytes: cur.bytes, currentSha256: cur.sha256,
      reason: CHANGED_REASON[m.out] || '（未登记原因，请补）'});
  }
}

/* 本轮新增的文件（不是从来源迁入的）。 */
const ADDED = [
  'miniprogram/app.js', 'miniprogram/app.json', 'miniprogram/app.wxss', 'miniprogram/sitemap.json',
  'miniprogram/pages/home/home.js', 'miniprogram/pages/home/home.json',
  'miniprogram/pages/home/home.wxml', 'miniprogram/pages/home/home.wxss',
  'miniprogram/pages/legal/about/about.js', 'miniprogram/pages/legal/about/about.json',
  'miniprogram/pages/legal/about/about.wxml', 'miniprogram/pages/legal/about/about.wxss',
  'miniprogram/pages/legal/privacy/privacy.js', 'miniprogram/pages/legal/privacy/privacy.json',
  'miniprogram/pages/legal/privacy/privacy.wxml', 'miniprogram/pages/legal/privacy/privacy.wxss',
  'project.config.json', 'scripts/verify-migration-import.mjs', 'scripts/gen-source-manifest.mjs',
  'scripts/test-xianxia-standalone.mjs',
  '.github/workflows/ci.yml', 'AGENTS.md', 'README.md',
  'docs/migration/ledger.md', 'docs/migration/plan.md', 'docs/migration/storage-migration.md',
  'docs/migration/web-cleanup.md', 'docs/migration/miniprogram-standalone.md',
  'legacy/old-web/README.md',
];
const added = [];
for (const p of ADDED) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) {
    console.error(`新增文件不存在，跳过：${p}`);
    continue;
  }
  const d = digest(abs);
  added.push({path: p, bytes: d.bytes, sha256: d.sha256});
}

const manifest = {
  label: '归山记 · 迁移导入来源清单',
  generatedAt: new Date().toISOString().slice(0, 10),
  sources: [
    {repo: 'buuzzy/1in8b', commit: headOf(ONE), path: '（小程序适配代码与锁定快照的来源）'},
    {repo: 'buuzzy/xianxia-life', commit: headOf(XL), path: 'feature/adventure-preview-v01（本仓库 Git 历史的来源）'}
  ],
  note: [
    'unchanged：迁进来后未改动，必须仍与来源逐字节一致。',
    'changed：本轮有意改过，记来源哈希与现哈希 + 改动原因。',
    'moved：本轮换了位置。',
    'added：本轮新增的文件（不是迁入的）。',
    '核对用 scripts/verify-migration-import.mjs。'
  ].join('\n'),
  groups: {unchanged, changed, moved, added},
};

const out = path.join(ROOT, 'docs', 'migration', 'source-manifest.json');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`已写出 ${path.relative(ROOT, out)}`);
console.log(`  unchanged=${unchanged.length} changed=${changed.length} moved=${moved.length} added=${added.length}`);
