#!/usr/bin/env node
/**
 * test-repo-hygiene.mjs — 「仓库别长胖」门禁
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 微信开发者工具打开一个项目时，会**遍历整个项目目录**
 * （算文件指纹、建文件监听、决定哪些文件要打包）。
 * ⇒ 仓库里一旦堆了几万��临时文件，IDE 就会被压垮：
 *   编译子进程 `spawn EBADF` 崩掉 ⇒ 弹「编译进程崩溃，请重启工具重试」，
 *   或弹「模拟器长时间没有响应，请确认你的业务逻辑中是否有复杂运算，或者死循环」。
 *
 * ⚠ **这两种报错长得像 IDE 的毛病，其实是仓库自己太胖。**
 *   2026-11-06 实测：浏览器门禁每次跑都往 `<repo>/.local/browser-XXXX/`
 *   留一个 Chromium profile，跑几十次攒到 **50,422 个文件 / 32 GB** ⇒
 *   归山记在 IDE 里编译必崩，而**同一个 IDE 打开一个空白小程序却秒过**。
 *   清掉 `.local/` 后（仓库 32 GB → 53 MB），同一个 IDE、同一份代码，
 *   **模拟器一次就起来**，`spawn EBADF` 归零。
 *
 * ⇒ 这道门禁盯住两件事：
 *   ① 仓库里**不许有**浏览器临时档案目录（`.local/`）；
 *   ② 仓库**总文件数**和**总大小**不许超阈值 —— 超过就红。
 *
 * 为什么值得单独一道门禁
 * ----------------------
 * 这个坑的特征是「**代码没问题、IDE 报错**」⇒ 极难定位：
 * 第一次遇到会怀疑 IDE 版本、怀疑网络、怀疑 AppID、怀疑代码，
 *   绕一大圈才想到「目录太大」。
 * ⇒ 让机器替我们盯着这个数字，比下次再花两小时强。
 *
 * 阈值怎么定的
 * ------------
 * 实测：归山记**正常**状态 = 53 MB / 约 2,700 个文件（含 node_modules）。
 * 出事的那个状态 = 32 GB / 53,152 个文件。
 * ⇒ 阈值取「正常值的 4 倍」：总大小 ≤ 512 MB、文件数 ≤ 20,000。
 *   正常状态离阈值很远，出事状态远远超阈值 ⇒ 既不会假红，也一定抓得住。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}${detail ? '（' + detail + '）' : ''}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? '（' + detail + '）' : ''}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 递归统计文件数与总字节（跳过 .git —— 它是仓库的一部分，不算「垃圾」）。 */
function measure(dir, acc) {
  const out = acc || {files: 0, bytes: 0, big: []};
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) measure(full, out);
    else if (entry.isFile()) {
      let size = 0;
      try { size = fs.statSync(full).size; } catch { /* 读不到就当 0 */ }
      out.files++;
      out.bytes += size;
      if (size > 50 * 1024 * 1024) out.big.push([path.relative(ROOT, full), size]);
    }
  }
  return out;
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + ' MB';

console.log('═'.repeat(78));
console.log('  仓库卫生门禁（别让仓库长胖到把微信开发者工具压垮）');
console.log('═'.repeat(78));

/* ───────────────────────────────── ① 不许有浏览器临时档案目录 */

section('不许有浏览器临时档案目录');

/**
 * ⚠ 浏览器门禁的临时 profile **必须**放在系统临时目录。
 * 这道断言会盯住「有人又把 profile 写回仓库里」——
 * 只要 `.local/browser-*` 又出现，直接红。
 *
 * ⚠ 注意别误伤 `.local/previous-dist-*`：那是旧网页端构建（`scripts/build.mjs`，
 *   2026-11-08 已删）留下的「上一版产物」备份，不是垃圾，也不是浏览器档案。
 */
const LOCAL_DIR = path.join(ROOT, '.local');
let browserProfiles = [];
try {
  browserProfiles = fs.readdirSync(LOCAL_DIR).filter(name => name.startsWith('browser-'));
} catch { /* 没有 .local/ 就是最好的情况 */ }
ok(browserProfiles.length === 0,
  '仓库里没有 .local/browser-* 浏览器临时档案目录',
  browserProfiles.length ? `发现 ${browserProfiles.length} 个！profile 必须放系统临时目录` : '');

/* 再扫一遍源码，确认 profile 确实写在系统临时目录里。 */
section('浏览器临时档案写在系统临时目录（源码口径）');
const browserLib = fs.readFileSync(path.join(ROOT, 'scripts/lib/browser.mjs'), 'utf8');
/* 只看**代码行**，跳过注释（注释里可以提「原来写在 .local/」这种历史）。 */
const codeLines = browserLib.split('\n')
  .filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line))
  .join('\n');
ok(/tmpdir\(\)/.test(codeLines) && !/\.local/.test(codeLines),
  'scripts/lib/browser.mjs 用 os.tmpdir() 而不是仓库内的 .local/');
ok(/rm\(profile/.test(browserLib),
  'scripts/lib/browser.mjs 关掉浏览器后会删掉 profile 目录');

/* ───────────────────────────────── ② 仓库体积与文件数 */

section('仓库体积与文件数');

const stats = measure(ROOT);
const FILES_LIMIT = 20000;
const BYTES_LIMIT = 512 * 1024 * 1024;

ok(stats.files <= FILES_LIMIT,
  `文件数不超过 ${FILES_LIMIT.toLocaleString('en-US')}`,
  `实际 ${stats.files.toLocaleString('en-US')} 个`);

ok(stats.bytes <= BYTES_LIMIT,
  `总大小不超过 512 MB`,
  `实际 ${mb(stats.bytes)}`);

for (const [rel, size] of stats.big) {
  ok(false, `没有超过 50 MB 的单个文件`, `${rel} = ${mb(size)}`);
}

/* ───────────────────────────────── ③ 旧产物不许回来 · 门禁依赖不许丢 */

section('旧产物不许回来，门禁依赖不许丢');

/**
 * 2026-11-07 清理过一次：
 *   · `legacy/old-web/` —— 旧 0.2.0 产品「山海一生」的完整快照，与归山记无关
 *     （历史仍在 git 里，需要时用 `git log -- legacy/old-web` 找回来）；
 *   · 5 个没人调用的孤儿脚本。
 *
 * ⇒ 这道断言盯住「别又把旧产物拷回来」——
 *   仓库要保持「只有归山记」这一件事，不掺别的产品。
 */
ok(!fs.existsSync(path.join(ROOT, 'legacy', 'old-web')),
  '旧 0.2.0 产品的快照没有回来（legacy/old-web/）');

/**
 * ⚠ 反过来：这几处**不许**被当成"旧产物"清掉 ——
 *   它们是门禁正在用的对照物，删了门禁立刻红：
 *   · `vendor/xianxia-r12/`      —— 规则 12 当年锁下的字节（build 门禁读它的 lock 文件）
 *   · `vendor/xianxia-r12-art/`  —— 画面锁定快照（art 门禁逐笔比对）
 *   · `reference/migrated-runtime/` —— 迁移进来的那份产物（build 门禁逐字节比对）
 *   · `reference/official/`      —— 官方设计系统的逐字节副本（style / mp 门禁比对）
 */
for (const dir of ['vendor/xianxia-r12', 'vendor/xianxia-r12-art',
  'reference/migrated-runtime', 'reference/official']) {
  ok(fs.existsSync(path.join(ROOT, dir)),
    `门禁在用的对照物还在：${dir}/`);
}

/**
 * ⚠ `buuzzy/xianxia-life` 已于 2026-11-07 删除 ⇒ 源码里**不许**再去读它。
 *
 * ⚠ 判定口径要准（第一版太粗，自己抓到了自己）：
 *   只看**路径被当成文件去操作**的写法（读文件 / require / import / 拼路径），
 *   **不**看纯文案 —— 比如「旧命令是 `--refresh=../xianxia-life`，现已不适用」
 *   这类说明文字必须留（否则后人照着做），它不该被判红。
 */
const DEAD_REPO_PATTERNS = [
  /\b(?:readFileSync|readFile|existsSync|statSync|require|createRequire)\s*\(\s*['"`][^'"`]*xianxia-life/iu,
  /\bimport\s*\(\s*['"`][^'"`]*xianxia-life/iu,
  /path\.(?:join|resolve)\s*\([^)]*xianxia-life/iu,
  /\bfrom\s*['"`][^'"`]*xianxia-life/iu,
];
const deadRepo = [];
const scanDirs = ['scripts', 'tests', 'apps', 'packages', 'content', 'miniprogram'];
const walk = (dir) => {
  let entries;
  try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { return; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(mjs|js|cjs)$/u.test(entry.name)) continue;
    let text;
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    const code = text.split('\n')
      .filter(line => !/^\s*(\*|\/\/|\/\*)/u.test(line))
      .join('\n');
    if (DEAD_REPO_PATTERNS.some(re => re.test(code))) deadRepo.push(path.relative(ROOT, full));
  }
};
for (const dir of scanDirs) walk(path.join(ROOT, dir));
ok(deadRepo.length === 0,
  '代码里没有再指向已删除的 xianxia-life 仓库',
  deadRepo.length ? `还有 ${deadRepo.length} 处：${deadRepo.slice(0, 3).join('、')}` : '');

console.log('');
console.log(`  参考：正常状态 53 MB / 约 2,700 个文件；出事状态 32 GB / 53,152 个文件。`);
console.log(`  实测：${mb(stats.bytes)} / ${stats.files.toLocaleString('en-US')} 个文件`);
console.log('');

console.log('─'.repeat(78));
console.log(`  结果：${pass} 通过 / ${fail} 失败`);
console.log('─'.repeat(78));

process.exit(fail === 0 ? 0 : 1);
