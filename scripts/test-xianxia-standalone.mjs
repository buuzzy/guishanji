#!/usr/bin/env node
/**
 * test-xianxia-standalone.mjs — 「归山记是独立产品」门禁
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 归山记从 1in8b 小程序里**搬出来**了（小程序端整体迁移到本仓库）。
 * 搬出来最怕的是「嘴上说独立，代码里还牵着老产品的手」——
 * 只要还有一处跳去 `/subpkg/engine/...` 或读写 `one8b.*`，
 * 这份小程序就既跑不起来（那个页面已经不在这个仓库里了），
 * 也算不上独立产品。
 *
 * 这道门禁盯住：
 *   ① `miniprogram/` 里**运行代码**中不许出现 1in8b 的路径与存档键；
 *   ② `project.config.json` 里不许残留 1in8b 的 AppID；
 *   ③ 主包**不许引用分包代码**（微信规矩：分包要先下载才能用）；
 *   ④ 分包里的页面只许跳到本产品内部（不许跳去别的产品）；
 *   ⑤ 启动层保持极薄（不加载引擎 / 没有引擎屏障 / 不联网）；
 *   ⑥ 完全单机：不许有网络请求。
 *
 * ⚠ **只判运行代码，不判注释**：
 *   我们的注释里到处写着「不碰 one8b.* / o8b.*」这类说明，
 *   用文本扫会假红 ⇒ 用 AST 的**字符串字面量**判定（官方那道门禁也是这么做的）。
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MP = path.join(ROOT, 'miniprogram');

/** 递归列出目录下的文件（按名排序，结果稳定）。 */
function walk(dir, out) {
  const acc = out || [];
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch (error) {
    return acc;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/* ══════════════════════════════════════════════ ① 运行代码里没有 1in8b 的痕迹 */

/** 1in8b 的路径与存档键（前缀形态，出现在字符串里就是「牵着老产品的手」）。 */
const FORBIDDEN_PATTERNS = [
  {re: /\/subpkg\/(engine|logic|logic2|logic3|data|data2|ldata)\//, label: '1in8b 的分包路径'},
  {re: /^(one8b|o8b)\./, label: '1in8b 的存档键'},
];

section('运行代码里没有 1in8b 的路径与存档键');
{
  const files = walk(MP).filter((f) => f.endsWith('.js') || f.endsWith('.wxml') || f.endsWith('.json'));
  const hits = [];

  for (const file of files) {
    const rel = path.relative(MP, file);
    if (file.endsWith('.json')) {
      /* JSON 没有注释 ⇒ 整个文件都是「内容」，直接扫文本。 */
      const text = fs.readFileSync(file, 'utf8');
      for (const rule of FORBIDDEN_PATTERNS) {
        if (rule.re.test(text)) hits.push(`${rel}：${rule.label}`);
      }
      continue;
    }
    if (file.endsWith('.wxml')) {
      /* WXML：只看属性值（注释在 WXML 里不存在，文本扫即可）。 */
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\b(?:src|url|href|bind\w+)\s*=\s*"([^"]*)"/g)) {
        for (const rule of FORBIDDEN_PATTERNS) {
          if (rule.re.test(m[1])) hits.push(`${rel}：${rule.label}（${m[1]}）`);
        }
      }
      continue;
    }
    /* JS：**只判字符串字面量**（注释里的说明文字不算）。 */
    const code = fs.readFileSync(file, 'utf8');
    let parsed = null;
    try {
      parsed = acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
    } catch (error) {
      parsed = null;
    }
    if (!parsed) {
      hits.push(`${rel}：解析失败（ES2022 解析不了）`);
      continue;
    }
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (node.type === 'Literal' && typeof node.value === 'string') {
        for (const rule of FORBIDDEN_PATTERNS) {
          if (rule.re.test(node.value)) hits.push(`${rel}：${rule.label}（${node.value}）`);
        }
      }
      for (const k of Object.keys(node)) {
        if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
        visit(node[k]);
      }
    };
    visit(parsed);
  }

  ok(hits.length === 0, hits.length
    ? `还有 1in8b 的痕迹：${hits.slice(0, 5).join('；')}`
    : `运行代码里一处 1in8b 的痕迹都没有（扫了 ${files.length} 个文件）`);
}

/* ══════════════════════════════════════════════ ② project.config.json 不残留旧 AppID */

section('项目配置里没有 1in8b 的 AppID');
{
  const configPath = path.join(ROOT, 'project.config.json');
  ok(fs.existsSync(configPath), 'project.config.json 存在');
  if (fs.existsSync(configPath)) {
    const text = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(text);
    ok(config.appid !== 'wxbbf73e87e970cda8', `AppID 不是 1in8b 的那个（当前 ${config.appid}）`);
    ok(!text.includes('wxbbf73e87e970cda8'), '整个配置文件里没有 1in8b 的 AppID');
    ok(config.miniprogramRoot === 'miniprogram/', 'miniprogramRoot 指向 miniprogram/');
    ok(config.projectname === '归山记', `projectname 是「归山记」（当前 ${config.projectname}）`);
    ok(typeof config.description === 'string' && config.description.indexOf('归山记') >= 0,
      'description 写的是归山记');
  }
}

/* ══════════════════════════════════════════════ ③ 主包不许引用分包代码 */

section('主包没有引用分包代码（微信规矩）');
{
  const appJson = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));
  const pkg = (appJson.subPackages || appJson.subpackages || []).find((p) => p.root === 'subpkg/xianxia');
  ok(!!pkg, 'app.json 里注册了 subpkg/xianxia 分包');
  ok(pkg && pkg.name === 'xianxia', '分包有 name（微信要求）');

  const mainFiles = walk(MP).filter((f) => {
    if (!f.endsWith('.js')) return false;
    const rel = path.relative(MP, f);
    return !rel.startsWith('subpkg' + path.sep);
  });
  const offenders = [];
  for (const file of mainFiles) {
    const code = fs.readFileSync(file, 'utf8');
    for (const m of code.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), spec);
      if (resolved.startsWith(path.join(MP, 'subpkg'))) {
        offenders.push(`${path.relative(MP, file)} → ${spec}`);
      }
    }
  }
  ok(offenders.length === 0, offenders.length
    ? `主包引用了分包：${offenders.join('、')}`
    : `主包（${mainFiles.length} 个文件）没有引用分包代码`);

  /* 反过来：分包**可以**引用主包（微信允许），但必须真的存在。 */
  const subFiles = walk(path.join(MP, 'subpkg')).filter((f) => f.endsWith('.js'));
  const missing = [];
  for (const file of subFiles) {
    const code = fs.readFileSync(file, 'utf8');
    for (const m of code.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), spec);
      if (!fs.existsSync(resolved)) missing.push(`${path.relative(MP, file)} → ${spec}`);
    }
  }
  ok(missing.length === 0, missing.length
    ? `有 require 指向不存在的文件：${missing.join('、')}`
    : '所有 require 的相对路径都指向真实存在的文件');
}

/* ══════════════════════════════════════════════ ④ 跳转只在本产品内部 */

section('页面跳转只在本产品内部');
{
  const offenders = [];
  for (const file of walk(MP).filter((f) => f.endsWith('.js'))) {
    const code = fs.readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:reLaunch|redirectTo|navigateTo)\s*\(\s*\{[^}]*url:\s*'([^']+)'/g)) {
      if (!m[1].startsWith('/subpkg/xianxia/') && !m[1].startsWith('/pages/')) {
        offenders.push(`${path.relative(MP, file)} → ${m[1]}`);
      }
    }
  }
  ok(offenders.length === 0, offenders.length
    ? `有跳去别处的：${offenders.join('、')}`
    : '所有跳转都在本产品内部');
}

/* ══════════════════════════════════════════════ ⑤ 启动层保持极薄 */

section('启动层是极薄的（不加载引擎 / 没有引擎屏障 / 不联网）');
{
  const appJs = fs.readFileSync(path.join(MP, 'app.js'), 'utf8');
  /* ⚠ 用 AST 判，别扫文本 —— 我们的**注释**里就写着「没有 engineReady 屏障」，
   *   文本扫会假红。 */
  const appAst = acorn.parse(appJs, {ecmaVersion: 2022, sourceType: 'script'});
  const identifiers = new Set();
  const requires = [];
  const calls = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node.type === 'Identifier') identifiers.add(node.name);
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
      calls.add(node.callee.name);
      if (node.callee.name === 'require' && node.arguments[0]
          && node.arguments[0].type === 'Literal') {
        requires.push(node.arguments[0].value);
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      visit(node[k]);
    }
  };
  visit(appAst);
  ok(!identifiers.has('engineReady'), 'app.js 里没有引擎屏障');
  ok(requires.length === 0, 'app.js 不 require 任何模块（不加载引擎、不加载音乐）');
  ok(!/music|audio/i.test(appJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')),
    'app.js 里没有音乐');
  ok(!calls.has('request'), 'app.js 里没有网络请求');

  const appJson = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));
  ok(appJson.window && appJson.window.navigationBarTitleText === '归山记',
    `窗口标题是「归山记」（当前 ${appJson.window && appJson.window.navigationBarTitleText}）`);
  ok(appJson.style === 'v2', '保留 style: v2');
  ok(!!appJson.lazyCodeLoading, '保留 lazyCodeLoading');
  ok(!!appJson.sitemapLocation, '登记了 sitemap.json');
  ok(fs.existsSync(path.join(MP, 'sitemap.json')), 'sitemap.json 存在');
  ok(appJson.pages[0] === 'pages/home/home', '第一个页面是首页');
  for (const page of appJson.pages) {
    ok(fs.existsSync(path.join(MP, `${page}.js`)), `主包页面存在：${page}`);
  }
  for (const p of appJson.subPackages || []) {
    for (const page of p.pages) {
      const file = path.join(MP, p.root, `${page}.js`);
      ok(fs.existsSync(file), `分包页面存在：${p.root}/${page}`);
    }
  }
}

/* ══════════════════════════════════════════════ ⑥ 完全单机 */

section('完全单机（没有网络请求）');
{
  const offenders = [];
  for (const file of walk(MP).filter((f) => f.endsWith('.js'))) {
    const code = fs.readFileSync(file, 'utf8');
    if (/wx\.request\s*\(/.test(code)) offenders.push(path.relative(MP, file));
  }
  ok(offenders.length === 0, offenders.length
    ? `有网络请求：${offenders.join('、')}`
    : '一处网络请求都没有');
}

/* ══════════════════════════════════════════════ ⑦ 存档命名空间 */

section('存档只写 xianxia.v1.*');
{
  const storage = fs.readFileSync(path.join(MP, 'bridge', 'storage.js'), 'utf8');
  ok(/NAMESPACE\s*=\s*'xianxia\.v1\.'/.test(storage), '存档命名空间是 xianxia.v1.');
  const keys = [...storage.matchAll(/'(xianxia\.[^']*)'/g)].map((m) => m[1]);
  ok(keys.length > 0, `存档键都在 xianxia.v1.* 下（看到 ${keys.length} 处）`);
  ok(keys.every((k) => k.startsWith('xianxia.v1.')), '没有一个键跑到命名空间外面');
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
