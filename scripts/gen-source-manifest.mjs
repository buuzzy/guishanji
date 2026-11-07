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
 *   node scripts/gen-source-manifest.mjs --one8b=/path/to/1in8b
 *
 * ⚠ 2026-11-07：`buuzzy/xianxia-life` **已删除**（它的字节已完整迁入本仓库：
 *   规则进 `packages/` + `content/`，旧 0.2.0 产品进 git 历史，
 *   锁定快照进 `vendor/xianxia-r12/`）⇒ 本脚本**不再需要它**。
 *   它的 commit 记在下面的 `XL_COMMIT` 常量里，
 *   作为「这套规则最初是哪一版」的凭据（清单里仍然写着）。
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
    /* ⚠ 无值参数（`--offline`）要**去掉开头的两个横线**才是键名 ——
       否则键会变成 "--offline"，`args['offline']` 永远取不到。 */
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

const ONE = args['one8b'];
const OFFLINE = args['offline'] === true || args['offline'] === 'true';

/**
 * ⚠ `buuzzy/xianxia-life` 已于 2026-11-07 删除（见文件头）。
 *   它的字节已完整迁入本仓库 ⇒ 完整模式**只需要** `1in8b`。
 *   这里的 commit 是「规则来自哪一版」的凭据，写进清单里长期保留。
 */
const XL_COMMIT = 'b519ac066a3499e0aced0fd9b5bd15ae855c3c49';

/**
 * ⚠ `--offline` 模式（2026-11-06 加）
 * ---------------------------------------------------------------------------
 * 完整模式需要 `1in8b` 仓库在本机（`buuzzy/xianxia-life` 已于 2026-11-07 删除）。
 * 但**另一台电脑（Windows）通常只有本仓库** ⇒ 改了本轮新增的文件后，
 * 清单的哈希跟不上 ⇒ `import` 门禁报红，而**没法在 Windows 上重新生成**。
 *
 * ⇒ offline 模式：**只重算仓库内文件的哈希**，
 *   来源信息（source / 来源哈希 / 换位置记录）**原样保留**。
 *   ⚠ 这**不是**「重新核对来源」——
 *     它只解决「本轮自己写的文件改了哈希」这一种情况。
 *     「迁进来的文件被动过」这类问题，offline 模式**查不出来**
 *     （那需要真的比对来源仓库）⇒ 那种情况仍然必须回 macOS 上跑完整模式。
 *
 * 用法：node scripts/gen-source-manifest.mjs --offline
 */
if (!OFFLINE && !ONE) {
  console.error('用法：');
  console.error('  完整模式（重新核对来源，需要 1in8b 仓库）：');
  console.error('    node scripts/gen-source-manifest.mjs --one8b=<1in8b 目录>');
  console.error('  离线模式（只重算本仓库文件的哈希，不碰来源）：');
  console.error('    node scripts/gen-source-manifest.mjs --offline');
  process.exit(2);
}

const digest = (file) => {
  const b = fs.readFileSync(file);
  return {bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex')};
};
const headOf = (dir) => execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();

/* 本轮有意改过的文件：写清原因。
 *
 * ⚠⚠ 这张表是**分组的唯一来源**（2026-11-08 起）：
 *   清单里的 `changed` 组 = 「迁进来的文件里，表里登记过的那些」。
 *   表里有的文件 ⇒ 一定在 `changed` 组；表里没有的 ⇒ 一定在 `unchanged` 组。
 *   ⇒ 离线模式也能靠它把文件**自动搬到正确的组**（见下面的 regroup）。
 *
 *   为什么要有这个：以前改了迁入文件只能**手工编辑 JSON**，
 *   容易漏改（文件被改过却仍留在 `unchanged` 组 ⇒ import 门禁报红，
 *   而人不知道该改哪儿），也看不出「这处改动是谁登记的」。
 */
const CHANGED_REASON = {
  'miniprogram/subpkg/xianxia/bridge/session.js': '首页「继续人生」改为接最近动过的那一段人生（原来接最老那段），并支持 ?resume=<编号> 点名',
  'miniprogram/subpkg/xianxia/pages/life/life.js': '失败兜底不再跳 1in8b 的 /subpkg/engine/pages/index/index，改跳新产品首页；续档参数与上面一致；2026-11-08 T4 雷达换轴：雷达的轴列表与小程序端画布同步',
  'miniprogram/subpkg/xianxia/pages/past/past.js': '失败兜底不再跳 1in8b 的 /subpkg/engine/pages/index/index，改跳新产品首页',
  'miniprogram/subpkg/xianxia/pages/roll/roll.js': '命盘页适配独立启动层（首页进入路径）',
  'miniprogram/subpkg/xianxia/runtime/build-manifest.json': '生成物：来源改为本仓库源码，并新增 upstreamOrigin 段',
  'miniprogram/subpkg/xianxia/runtime/engine.js': '生成物：由本仓库源码重新构建（除文件头注释外与迁移进来的那份逐字节一致，见 reference/migrated-runtime/）',
  'miniprogram/subpkg/xianxia/runtime/pixel-style.js': '生成物：由本仓库源码重新构建（与迁移进来的那份逐字节一致）',
  'scripts/build-xianxia-mp.mjs': '构建来源改为本仓库自己的源码（vendor 快照降级为历史证据），新增 app.wxss 生成；2026-11-07 补充说明「上游 xianxia-life 已删除」；S8 表达域与呈现域：新增 mapView / lifespanPlan12 / 寿元句式的导出；S9 内容模块拆分：小程序端要的那几张表改从各自域文件取（content/realms.js、content/regions.js、content/items.js、content/ends.js），不再从什么都有的门面取；2026-11-08 T4 雷达换轴：导出表加 constitution12（雷达要读体魄）',
  'docs/miniprogram-xianxia-integration.md': '2026-11-07：给 --refresh=../xianxia-life 这条已失效的旧命令加提示（该仓库已删除，build 脚本现在只读本仓库源码）；正文其余部分保持原样',
  'docs/xianxia-mini-program-integration.md': '2026-11-07：给 --source=../xianxia-life 这条已失效的旧命令加提示（该仓库已删除，build 脚本现在只读本仓库源码）；正文其余部分保持原样',
  'scripts/test-xianxia-art.mjs': '对照基准改为本仓库 reference/ 与 apps/preview/，不再依赖 1in8b 的 frozen-baseline',
  'scripts/test-xianxia-build.mjs': '新增「与迁移进来的产物逐字节一致」断言；不再依赖 1in8b 的 frozen-baseline',
  'scripts/test-xianxia-equivalence.mjs': '对照源改为本仓库 packages/ + content/（源码 vs 产物逐值全等）',
  'scripts/test-xianxia-mp.mjs': '新增首页仿真断言；路径层级按独立启动层调整；2026-11-08 T4 雷达换轴：五轴断言改新轴（并断言体力不在雷达里）',
  'scripts/test-xianxia-storage.mjs': '不再依赖 1in8b 的 frozen-baseline，改用本仓库自己的哈希校验',
  'scripts/test-xianxia-style.mjs': '官方对照源改读 reference/official/（本仓库内的锁定副本）+ 新的 app.wxss',
  'miniprogram/subpkg/xianxia/bridge/page-model.js': 'S5 角色域：登记卡的「预期寿元」改读规则层算好的实际寿元；S8 呈现域：顶栏加「还能活多久」，登记卡加「下一境死线」（整句在 JS 侧拼好，WXML 不支持字符串拼接）',
  'miniprogram/subpkg/xianxia/bridge/view-model.js': 'S5 角色域：修行本事面板加「体魄」（只增不减的能力），体质行补「力竭」提示；2026-11-08 T4 雷达换轴：五轴改成「悟性/胆识/仁心/心境/体魄」（体力是资源，退回状态条）',
  'miniprogram/subpkg/xianxia/art/radar.js': '2026-11-08 T4 雷达换轴：五轴改成「悟性/胆识/仁心/心境/体魄」（体力是资源，退回状态条）',
  'miniprogram/subpkg/xianxia/components/radar/index.js': '2026-11-08 T4 雷达换轴：组件注释同步（轴的来源与顺序由桥接层给）',
  'miniprogram/subpkg/xianxia/pages/life/life.wxml': 'S5 角色域：修行本事面板加「体魄」一行；S8 呈现域：顶栏常驻显示「还能活多久」（用官方已有的 .age-yr .t 类，不新造视觉类）',
  'content/cultivation-stories.js': 'S7 表达域：事件条目统一带上 voice 字段（表达成熟度：inline=已定稿 / pending=未定稿），在装配链末尾补一次，保证每个条目都有',
  'content/readable-stories.js': 'S7 表达域：内容按故事线拆到 content/expressions/ 下，本文件改成门面转发（旧路径还有人在用）',
  'packages/adventure/engine.js': 'S7 表达域：makeReadable 改读新的表达域入口 content/expressions/index.js',
  'miniprogram/subpkg/xianxia/art/atlas.js': 'S8 呈现域：点阵地图从「一次画四块大陆」改成「只画当前所在 + 走过的大洲」并居中；「该显示哪几块」改由规则层给（engine.mapView）',
};

/* 本轮新增的文件（不是从来源迁入的）。
 * ⚠ 放在这里（离线模式之前），是因为**离线模式也要用它**：
 *   离线模式拿不到来源仓库，但「本轮新增」这一组的哈希本来就来自本仓库
 *   ⇒ 离线时把清单里缺的新增条目补上，是安全的（不会削弱任何证据）。 */
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
  /* 2026-11-06：仓库卫生门禁（防仓库长胖把微信 IDE 压垮）+ 量包体脚本 */
  'scripts/test-repo-hygiene.mjs', 'scripts/measure-mp-package-size.mjs',
  'AGENTS.md', 'README.md',
  'docs/migration/ledger.md', 'docs/migration/plan.md', 'docs/migration/storage-migration.md',
  'docs/migration/web-cleanup.md', 'docs/migration/miniprogram-standalone.md',
  /* 2026-11-08：S7 表达域 —— 说法按故事线拆到 content/expressions/ 下 */
  'content/expressions/index.js', 'content/expressions/people.js', 'content/expressions/lifespan.js',
  'content/expressions/mainline.js', 'content/expressions/tide.js', 'content/expressions/ember.js',
  'content/expressions/sky.js', 'content/expressions/journey.js', 'content/expressions/homecoming.js',
  'content/expressions/demonic.js', 'content/expressions/trial.js', 'content/expressions/cavern.js',
  'content/expressions/outer.js', 'content/expressions/beast.js', 'content/expressions/cultivation.js',
  'scripts/verify-expressions.mjs',
  'docs/expression-vocabulary.json',
  'docs/art-divergence.json',
  /* 2026-11-08：S9 内容模块拆分 —— 原来的 content/adventure.js 拆成五个域文件 + 门面 */
  'content/realms.js', 'content/items.js', 'content/regions.js',
  'content/ends.js', 'content/nodes.js',
  'scripts/verify-content-modules.mjs',
  'tests/fixtures/content-modules.json',
  /* 2026-11-07：S10 交付说明 */
  'docs/内容架构重构交付说明-2026-11-07.md',
  /* 2026-11-07：第二轮 —— 六项内容指标门禁（上一轮量指标的脚本没进过库） */
  'scripts/audit-metrics.mjs',
  'tests/fixtures/metrics-baseline.json',
  'docs/遗留问题清单-2026-11-07.md',
  /* 2026-11-08：T5 人生经历能产出 + 道具闭环 */
  'content/cultivation-findings.js',
  'scripts/audit-items.mjs',
  'tests/items.test.mjs',
  /* 2026-11-08：T4 雷达换轴 —— 两端雷达的轴必须一致（体力退出雷达、体魄进雷达） */
  'tests/radar.test.mjs',
  /* 2026-11-08：T6 剧情承接 —— 魔道入口有条件、选项里的人名先被介绍、童年结果都有下文 */
  'scripts/audit-plot.mjs',
  'tests/plot.test.mjs',
];


/* ═══════════════════════════ 离线模式 ═══════════════════════════
 *
 * 只重算**本仓库内文件**的哈希，来源信息（source / 来源哈希 / 换位置记录）原样保留。
 * 用途：另一台电脑（Windows）通常只有本仓库，改了本轮自己写的文件后
 *      清单哈希跟不上 ⇒ 没法重新生成清单 ⇒ `import` 门禁红。
 *
 * ⚠ 它**不能**发现「迁进来的文件被动了」——
 *   那需要真的比对来源仓库 ⇒ 那种情况必须回 macOS 跑完整模式。
 *
 * ⚠⚠ **因此 offline 模式绝不更新 `unchanged` 组的哈希**：
 *   那一组的哈希含义是「**与来源逐字节一致**」，
 *   凭据来自来源仓库 ⇒ 只有真的比对过来源才能刷新。
 *   若 offline 也刷新它 ⇒ 有人改了迁入的文件，跑一次 offline 就把证据抹掉了
 *   ⇒ 门禁再也查不出来（实测：改坏 guilloche.js 后跑 offline，仍报「全部一致」）。
 *   ⇒ offline 只刷新 `added`（本轮自己写的文件）、`changed`、`moved`
 *     —— 这三组的哈希含义是「现哈希」，本来就该跟着工作区走。
 *
 * ⚠ 这段必须放在**构建 MAP 之前**：MAP 依赖两个来源仓库，
 *   离线模式下它们根本不在本机 ⇒ 早退才不会炸。
 */
if (OFFLINE) {
  const MANIFEST = path.join(ROOT, 'docs', 'migration', 'source-manifest.json');
  if (!fs.existsSync(MANIFEST)) {
    console.error('离线模式需要已存在的清单（本仓库内）：' + MANIFEST);
    process.exit(2);
  }
  const old = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const g = old.groups || {};
  let refreshed = 0, missing = 0;
  const refresh = (entry, hashField, bytesField) => {
    const abs = path.join(ROOT, entry.path);
    if (!fs.existsSync(abs)) { missing++; console.error(`  ⚠ 文件不在了：${entry.path}`); return; }
    const d = digest(abs);
    if (entry[hashField] !== d.sha256) { refreshed++; }
    entry[hashField] = d.sha256;
    entry[bytesField] = d.bytes;
  };
  /* ── 重新分组（2026-11-08 加）──────────────────────────────────
   *
   * 问题：`unchanged` 组的哈希含义是「**与来源逐字节一致**」。
   *   一旦有意改了某个迁进来的文件，它就**不再**属于 unchanged，
   *   而该进 `changed` 组（记来源哈希 + 现哈希 + 改动原因）。
   *   以前这一步只能**手工编辑 JSON** ⇒ 容易漏
   *   （文件被改过却仍留在 unchanged 组 ⇒ import 门禁报红，
   *     而人不知道该改哪儿 —— 这正是这次 S5 踩的坑）。
   *
   * 做法：分组的**唯一来源**是本文件顶部的 CHANGED_REASON 表。
   *   表里登记过的 ⇒ 在 changed 组；
   *   没登记的 ⇒ 在 unchanged 组（且必须仍与来源逐字节一致）。
   *
   * ⚠ 这里**不**刷新 unchanged 组的哈希 ——
   *   它的凭据来自来源仓库，只有真的比对过来源才能刷新。
   *   本段只在「文件确实已改」时才动它（改了就该离开 unchanged）。
   */
  const regroup = [];
  const stillUnchanged = [];
  for (const e of g.unchanged || []) {
    const reason = CHANGED_REASON[e.path];
    if (!reason) { stillUnchanged.push(e); continue; }
    const abs = path.join(ROOT, e.path);
    if (!fs.existsSync(abs)) {
      console.error(`  ⚠ 文件不在了：${e.path}`);
      stillUnchanged.push(e);
      continue;
    }
    const d = digest(abs);
    if (d.sha256 === e.sourceSha256) {
      /* 改动已经撤回（文件又变回与来源一致）⇒ 回到 unchanged 组。 */
      stillUnchanged.push({...e, bytes: d.bytes, sha256: d.sha256});
      regroup.push(`${e.path}：已改回与来源一致 ⇒ 留在 unchanged`);
      continue;
    }
    /* 确实改过 ⇒ 搬进 changed 组（来源哈希从原条目带过来）。 */
    g.changed = (g.changed || []).concat([{
      sourceRepo: e.sourceRepo,
      sourceCommit: e.sourceCommit,
      sourcePath: e.sourcePath,
      sourceBytes: e.sourceBytes,
      sourceSha256: e.sourceSha256,
      path: e.path,
      currentBytes: d.bytes,
      currentSha256: d.sha256,
      reason,
    }]);
    regroup.push(`${e.path}：有意改过 ⇒ 移到 changed`);
  }
  g.unchanged = stillUnchanged;

  /* 反向核对：changed 组里的文件必须登记过原因。
   *   没登记 ⇒ 要么是表里漏了，要么是有人把改动悄悄撤了登记。
   *   两种都不该悄悄放过 ⇒ 直接停下报错，让人去把表补齐。 */
  for (const e of g.changed || []) {
    if (!CHANGED_REASON[e.path]) {
      console.error(`  ✗ ${e.path} 在 changed 组，但 CHANGED_REASON 表里没登记改动原因`);
      console.error('    ⇒ 去 scripts/gen-source-manifest.mjs 顶部的 CHANGED_REASON 补一条，再重跑本脚本');
      process.exit(1);
    }
  }

  /* ⚠ unchanged 组**不刷新**（见上面的说明）。 */
  for (const e of g.added || []) refresh(e, 'sha256', 'bytes');
  for (const e of g.changed || []) refresh(e, 'currentSha256', 'currentBytes');
  for (const e of g.moved || []) refresh(e, 'currentSha256', 'currentBytes');

  /* ⚠ 清单里缺的新增条目 ⇒ 补上。
   *   「本轮新增」这一组的哈希**来自本仓库**（不是来源仓库）⇒ 离线补它不削弱证据。
   *   不补的后果：本轮新写的文件在清单里没有影子 ⇒ 清单跟仓库对不上，
   *   而清单的作用正是「本仓库现在长什么样」的可核对记录。 */
  const addedPaths = new Set((g.added || []).map(e => e.path));
  let addedNew = 0;
  for (const p of ADDED) {
    if (addedPaths.has(p)) continue;
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) { console.error(`  ⚠ 新增文件不存在，跳过：${p}`); continue; }
    const d = digest(abs);
    g.added = (g.added || []).concat([{path: p, bytes: d.bytes, sha256: d.sha256}]);
    addedNew++;
  }
  if (addedNew) console.log(`  补上了 ${addedNew} 个清单里缺的新增文件`);

  old.generatedAt = new Date().toISOString().slice(0, 10);
  /* ⚠ note 只追加一次（重复跑 offline 不会堆成一长串）。 */
  const OFFLINE_NOTE = '（本次用 --offline 生成：只刷新了本轮自己写的文件（added/changed/moved）的哈希；' +
    '并按 CHANGED_REASON 表把「有意改过的迁入文件」自动搬到 changed 组；' +
    'unchanged 组保持不变（它的凭据来自来源仓库，只能靠完整模式重新核对）。）';
  old.note = String(old.note || '').split('\n').filter(line => !line.startsWith('（本次用 --offline 生成')).join('\n');
  old.note = old.note + '\n' + OFFLINE_NOTE;
  fs.writeFileSync(MANIFEST, JSON.stringify(old, null, 2) + '\n');
  console.log(`已离线刷新 ${path.relative(ROOT, MANIFEST)}`);
  console.log(`  刷新了 ${refreshed} 个文件的哈希${missing ? `，${missing} 个文件不在了` : ''}`);
  if (regroup.length) {
    console.log(`  重新分组了 ${regroup.length} 个文件：`);
    for (const line of regroup) console.log(`    · ${line}`);
  } else {
    console.log('  分组没变（没有需要搬的迁入文件）');
  }
  console.log('  ⚠ 离线模式**没有**重新比对来源仓库 ⇒ 「迁进来的文件被动过」这类问题查不出来');
  console.log('    （unchanged 组的哈希**故意没刷新**，好让门禁仍然报红）。');
  process.exit(0);
}

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

const out = path.join(ROOT, 'docs', 'migration', 'source-manifest.json');

/* 完整模式：写清单。 */
const manifest = {
  label: '归山记 · 迁移导入来源清单',
  generatedAt: new Date().toISOString().slice(0, 10),
  sources: [
    {repo: 'buuzzy/1in8b', commit: headOf(ONE), path: '（小程序适配代码与锁定快照的来源）'},
    {repo: 'buuzzy/xianxia-life', commit: XL_COMMIT, path: 'feature/adventure-preview-v01（本仓库 Git 历史的来源；该仓库已于 2026-11-07 删除，字节已完整迁入本仓库）'}
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

fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`已写出 ${path.relative(ROOT, out)}`);
console.log(`  unchanged=${unchanged.length} changed=${changed.length} moved=${moved.length} added=${added.length}`);
