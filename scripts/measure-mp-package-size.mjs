#!/usr/bin/env node
/**
 * measure-mp-package-size.mjs — 微信小程序真编译包体实测（独立可执行入口）
 * ============================================================================
 *
 * 干什么
 * ------
 * 调**微信开发者工具 CLI** 做一次真编译 + 预览上传，拿到
 *   · 每个包（主包 / 各分包）**编译后**的真实字节数；
 *   · 一张预览二维码（真机扫码就能看）。
 * 并把结果写进 `docs/mp-package-size.json`。
 *
 * ⚠ **仓库原始字节 ≠ 上传包体**
 *   微信 IDE 自己会转译、压缩、抽公共模块。历史上实测：
 *   预压缩让仓库字节少了 207 KB，**编译后只差 990 字节**。
 *   ⇒ 唯一可信的判据是这份报告里的 `compiledBytes`。
 *
 * ⚠ **必须清完编译缓存再量**
 *   不清缓存直接 `cli preview` 量到的可能是**上一次的旧产物**
 *   （实测同���份源码：不清缓存 7,563,813 B，清完重跑 6,859,593 B，差 70 万）。
 *
 * 用法
 * ----
 *   node scripts/measure-mp-package-size.mjs
 *   node scripts/measure-mp-package-size.mjs --no-clean     # 不清缓存（不建议）
 *   node scripts/measure-mp-package-size.mjs --keep-qr       # 保留二维码文件
 *
 * 环境
 * ----
 *   · macOS：微信开发者工具在 /Applications/wechatwebdevtools.app
 *   · Windows：腾讯微信web开发者工具\cli.bat
 *   · IDE 必须用**干净环境**启动（带失效的 HTTP_PROXY 会在上传时超时）
 *
 * 退出码：0 = 各包都在硬上限内；1 = 有包超限或测量失败。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = (k, d) => {
  const hit = argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const has = (k) => argv.includes(`--${k}`);

const PROJECT = path.resolve(argOf('project', ROOT));
const LABEL = argOf('label', path.basename(PROJECT));
const OUT = path.resolve(argOf('out', path.join(ROOT, 'docs', 'mp-package-size.json')));
const DO_CLEAN = !has('no-clean');

/** 微信官方硬上限：每包 2 MiB；全部包合计 20 MiB。 */
const PACKAGE_LIMIT = 2097152;
const TOTAL_LIMIT = 20971520;

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 微信开发者工具 CLI 的位置（按平台分，别写死一条路径）。 */
function defaultCliPath() {
  if (process.platform === 'darwin') return '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
  if (process.platform === 'win32') {
    const cands = [
      'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
      'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
    ];
    for (const c of cands) if (fs.existsSync(c)) return c;
    return cands[0];
  }
  return '/opt/wechat-devtools/cli';
}
const CLI = argOf('cli', defaultCliPath());

function toolVersion() {
  if (process.platform === 'darwin') {
    const plist = '/Applications/wechatwebdevtools.app/Contents/Info.plist';
    try {
      const out = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', plist], { encoding: 'utf8' });
      const v = (out.stdout || '').trim();
      /* ⚠ Info.plist 里这两个键写的是 **Electron 版本**（36.x），不是微信开发者工具版本。
         工具版本要从 app.asar 里的 package.json 读（形如 2.02.2608080）。 */
      if (v) return `electron ${v}`;
    } catch { /* 读不到就算了 */ }
  }
  return 'unknown';
}

/** 微信开发者工具自己的版本号（从 app.asar 的 package.json 读）。 */
function ideVersion() {
  if (process.platform !== 'darwin') return 'unknown';
  const asar = '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar';
  try {
    const buf = fs.readFileSync(asar);
    const text = buf.toString('utf8');
    const m = /"name"\s*:\s*"[^"]*"\s*,\s*"version"\s*:\s*"(\d+\.\d+\.\d+)"/.exec(text.slice(0, 4 * 1024 * 1024));
    if (m) return m[1];
  } catch { /* 读不到就算了 */ }
  return 'unknown';
}

function gitInfo(dir) {
  const g = (...args) => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    return r.status === 0 ? (r.stdout || '').trim() : null;
  };
  return {
    commit: g('rev-parse', 'HEAD'),
    tree: g('rev-parse', 'HEAD^{tree}'),
    branch: g('rev-parse', '--abbrev-ref', 'HEAD'),
    dirty: (g('status', '--porcelain', '--untracked-files=all') || '') !== '',
  };
}

/** IDE 的环境变量要干净：带着失效代理会在上传那一步超时。 */
function cleanEnv() {
  const env = { ...process.env };
  for (const k of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete env[k];
  return env;
}

function runCli(args) {
  return spawnSync(CLI, args, { encoding: 'utf8', env: cleanEnv(), timeout: 15 * 60 * 1000 });
}

/** 项目配置：AppID 来源 + 实际生效的关键开关。 */
function projectConfig() {
  const pubPath = path.join(PROJECT, 'project.config.json');
  const privPath = path.join(PROJECT, 'project.private.config.json');
  const pub = fs.existsSync(pubPath) ? JSON.parse(fs.readFileSync(pubPath, 'utf8')) : {};
  const priv = fs.existsSync(privPath) ? JSON.parse(fs.readFileSync(privPath, 'utf8')) : null;
  const s = pub.setting || {};
  return {
    appid: priv?.appid || pub.appid || null,
    appidSource: priv?.appid ? 'project.private.config.json' : (pub.appid ? 'project.config.json' : 'none'),
    libVersion: priv?.libVersion || pub.libVersion || null,
    miniprogramRoot: pub.miniprogramRoot || '',
    compileType: pub.compileType || null,
    effectiveSettings: {
      es6: s.es6, enhance: s.enhance, minified: s.minified, postcss: s.postcss,
      ignoreUploadUnusedFiles: s.ignoreUploadUnusedFiles, ignoreDevUnusedFiles: s.ignoreDevUnusedFiles,
      bigPackageSizeSupport: s.bigPackageSizeSupport, useMultiFrameRuntime: s.useMultiFrameRuntime,
      useIsolateContext: s.useIsolateContext, bundle: s.bundle, minifyWXSS: s.minifyWXSS,
      useCompilerModule: s.useCompilerModule, packNpmManually: s.packNpmManually,
    },
  };
}

/* ── 原始源码体积（按 app.json 的分包根目录切） ─────────────────────────── */

function rawBytes() {
  const cfg = projectConfig();
  const mpRoot = path.join(PROJECT, cfg.miniprogramRoot || 'miniprogram');
  const appJson = path.join(mpRoot, 'app.json');
  const subRoots = [];
  if (fs.existsSync(appJson)) {
    const app = JSON.parse(fs.readFileSync(appJson, 'utf8'));
    for (const sp of app.subPackages || app.subpackages || []) subRoots.push({ root: sp.root, name: sp.name || sp.root });
  }
  const sizeOf = (dir) => {
    let total = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else total += fs.statSync(p).size;
      }
    };
    if (fs.existsSync(dir)) walk(dir);
    return total;
  };
  const packages = { '/': sizeOf(mpRoot) };
  /**
   * 主包体积要**排除**分包目录的内容 —— 分包的文件不算在主包里。
   * 按相对 miniprogramRoot 的相对路径判断归属。
   */
  const relOf = (p) => path.relative(mpRoot, p).split(path.sep).join('/');
  const mainOnly = (dir) => {
    let total = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else {
          const rel = relOf(p);
          if (subRoots.some((sp) => rel === sp.root || rel.startsWith(sp.root + '/'))) continue;
          total += fs.statSync(p).size;
        }
      }
    };
    if (fs.existsSync(dir)) walk(dir);
    return total;
  };
  packages['/'] = mainOnly(mpRoot);
  for (const sp of subRoots) packages['/' + sp.root.replace(/\\/g, '/') + '/'] = sizeOf(path.join(mpRoot, sp.root));
  return packages;
}

/* ── 清 IDE 编译缓存（macOS） ─────────────────────────────────────────── */

function purgeIdeCompileCache() {
  const removed = [];
  const base = path.join(os.homedir(), 'Library', 'Application Support', '微信开发者工具');
  if (!fs.existsSync(base)) return removed;
  for (const dir of fs.readdirSync(base)) {
    const cacheRoot = path.join(base, dir, 'WeappCache', 'WeappCompileCache');
    if (!fs.existsSync(cacheRoot)) continue;
    for (const e of fs.readdirSync(cacheRoot)) {
      const p = path.join(cacheRoot, e);
      try { fs.rmSync(p, { recursive: true, force: true }); removed.push(p); } catch { /* 忽略 */ }
    }
  }
  return removed;
}

/**
 * 小程序源码指纹：把 miniprogram/ 与项目配置的所有文件（路径 + 大小 + 内容哈希）
 * 算成一个 sha256。
 * 为什么不用 commit SHA：这份报告本身要进仓库 ⇒ 提交它就会改变 commit
 * ⇒ 「报告里的 commit == 当前 commit」永远不成立。
 */
function sourceFingerprint() {
  const cfg = projectConfig();
  const mpRoot = path.join(PROJECT, cfg.miniprogramRoot || 'miniprogram');
  const files = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(mpRoot);
  for (const extra of ['project.config.json', 'project.private.config.json']) {
    const p = path.join(PROJECT, extra);
    if (fs.existsSync(p)) files.push(p);
  }
  files.sort();
  const hash = crypto.createHash('sha256');
  for (const p of files) {
    const bytes = fs.readFileSync(p);
    hash.update(path.relative(PROJECT, p).split(path.sep).join('/'));
    hash.update(String(bytes.length));
    hash.update(crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  return { hash: hash.digest('hex'), files: files.length };
}

/* ── 走一遍 IDE ─────────────────────────────────────────────────────────── */

log(`▸ 测量目标：${PROJECT}`);
log(`▸ 标签：${LABEL}`);
log(`▸ IDE CLI：${CLI}（微信开发者工具 ${ideVersion()} / ${toolVersion()}）`);

const git = gitInfo(PROJECT);
const cfg = projectConfig();
log(`▸ 代码：${git.commit}（树 ${git.tree}）`);
log(`▸ AppID：${cfg.appid}（来源 ${cfg.appidSource}）`);

if (!fs.existsSync(CLI)) {
  console.error(`✖ 找不到微信开发者工具 CLI：${CLI}`);
  process.exit(1);
}

if (DO_CLEAN) {
  const removed = purgeIdeCompileCache();
  log(`▸ 清 IDE 编译缓存：${removed.length} 个目录`);
  const c = runCli(['cache', '--clean', 'compile', '--project', PROJECT]);
  log(`  cache --clean compile 退出码 ${c.status}`);
  log('▸ 关项目 → 重开项目');
  runCli(['close', '--project', PROJECT]);
  await sleep(3000);
  const o = runCli(['open', '--project', PROJECT]);
  log(`  open 退出码 ${o.status}`);
  await sleep(8000);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const qrPath = path.join(os.tmpdir(), `guishanji-qr-${stamp}.png`);
const infoPath = path.join(os.tmpdir(), `guishanji-info-${stamp}.json`);
fs.writeFileSync(qrPath, '');

log('▸ cli preview（真编译 + 预览上传）');
const started = Date.now();
const pv = runCli([
  'preview', '--project', PROJECT,
  '--qr-format', 'image', '--qr-output', qrPath,
  '--info-output', infoPath,
]);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);
log(`  preview 退出码 ${pv.status}，用时 ${elapsed}s`);
if ((pv.stdout || '').trim()) log((pv.stdout || '').trim().split('\n').slice(-6).join('\n'));
if ((pv.stderr || '').trim()) log((pv.stderr || '').trim().split('\n').slice(-6).join('\n'));

let compiled = null;
let compileError = null;
if (fs.existsSync(infoPath)) {
  try {
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    const pkgs = (info?.size?.packages || []).filter((p) => p.name !== 'TOTAL');
    const totalEntry = (info?.size?.packages || []).find((p) => p.name === 'TOTAL');
    compiled = {
      total: totalEntry ? totalEntry.size : (info?.size?.total ?? null),
      packages: Object.fromEntries(pkgs.map((p) => [p.name, p.size])),
    };
  } catch (e) {
    compileError = 'info-output 解析失败：' + String(e);
  }
} else {
  compileError = '没有生成 info-output 文件（预览上传没成功）';
}
if (!compiled && !compileError) compileError = 'info-output 里没有体积数字';

const raw = rawBytes();
const rows = [];
if (compiled) {
  for (const [name, bytes] of Object.entries(compiled.packages)) {
    rows.push({
      name,
      compiledBytes: bytes,
      rawBytes: raw[name] ?? null,
      limitBytes: PACKAGE_LIMIT,
      headroomToLimit: PACKAGE_LIMIT - bytes,
      withinHardLimit: bytes <= PACKAGE_LIMIT,
      status: bytes <= PACKAGE_LIMIT ? 'ok' : 'over-limit',
    });
  }
}
const totalCompiled = compiled ? compiled.total : null;
const totalRaw = Object.values(raw).reduce((a, b) => a + b, 0);
const fingerprint = sourceFingerprint();

const report = {
  label: LABEL,
  measuredAt: new Date().toISOString(),
  sourceFingerprint: fingerprint.hash,
  sourceFiles: fingerprint.files,
  machine: { os: `${os.platform()} ${os.release()}`, node: process.version, arch: process.arch },
  code: git,
  tool: { cli: CLI, version: toolVersion(), ideVersion: ideVersion() },
  config: cfg,
  compiled: { total: totalCompiled, packages: compiled ? compiled.packages : null, error: compileError },
  rawBytes: { ...raw, total: totalRaw },
  packages: rows,
  limits: { packageLimit: PACKAGE_LIMIT, totalLimit: TOTAL_LIMIT },
  passed: !!compiled && rows.every((r) => r.withinHardLimit) && totalCompiled <= TOTAL_LIMIT,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
log(`▸ 报告：${path.relative(ROOT, OUT)}`);

if (!compiled) {
  console.error('✖ 没量到编译后体积：' + compileError);
  if (fs.existsSync(qrPath) && fs.statSync(qrPath).size > 0) log(`  （二维码还是生成了：${qrPath}）`);
  process.exit(1);
}

log('');
log('包体（编译后 = 真正的上传体积）');
for (const r of rows) {
  const head = r.headroomToLimit >= 0 ? `余 ${r.headroomToLimit.toLocaleString('en-US')} B` : `超 ${(-r.headroomToLimit).toLocaleString('en-US')} B`;
  log(`  ${r.name.padEnd(22)} ${String(r.compiledBytes).padStart(9)} B  （仓库原始 ${String(r.rawBytes ?? '-').padStart(9)} B）  ${head}  ${r.status}`);
}
log(`  ${'合计'.padEnd(20)} ${String(totalCompiled).padStart(9)} B  （上限 ${TOTAL_LIMIT.toLocaleString('en-US')} B）`);
log('');
if (fs.existsSync(qrPath) && fs.statSync(qrPath).size > 0) {
  log(`▸ 预览二维码：${qrPath}`);
  if (!has('keep-qr')) {
    // 二维码只对交付有意义，默认留在临时目录；报告里记了路径。
  }
} else {
  log('▸ 没有生成二维码（预览上传失败）');
}
log(report.passed ? '✔ 包体全部在硬上限内' : '✖ 有包超限');

if (!report.passed) process.exitCode = 1;
