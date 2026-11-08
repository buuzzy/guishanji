/**
 * 装载小程序端的视图模型（`miniprogram/subpkg/xianxia/bridge/view-model.js`）。
 *
 * ## 为什么需要它
 *
 * 2026-11-08 清理网页端之前，有五道 Node 测试直接 import
 * `apps/preview/life-panels.js`（网页端的 HTML 面板模块），
 * 断言「面板上写着灵石与家产 / 修行本事 / 五根轴 / 寿元上限」这些**面板内容**。
 *
 * 网页端删掉后，那些断言若原样保留 ⇒ 门禁守着一个**已经不存在的产品**；
 * 若直接删掉 ⇒ 「面板必须显示这些内容」这条规矩**没人守了**。
 *
 * ⇒ 现在这些断言改问**真正在跑的那一端**（小程序端）的视图模型。
 *   小程序端是当前唯一的产品端 ⇒ 守住它才是有意义的。
 *
 * ## ⚠ 为什么不直接 require()
 *
 * 本仓库 `package.json` 是 `"type": "module"` ⇒ `.js` 会被当成 ESM，
 * 文件里的 `module.exports` 直接炸 ⇒ 只能用 `vm` 跑（与 `tests/radar.test.mjs` 同一手法）。
 *
 * ## ⚠ 为什么可以拿**源码引擎**的 run 去问它
 *
 * 视图模型只做「搬运与格式化」：它读 state、问规则层的几个函数，不改 state。
 * 小程序端跑的是 `miniprogram/subpkg/xianxia/runtime/engine.js`（生成物），
 * 而它与 `packages/adventure/` 逐值全等 —— 由 `scripts/test-xianxia-equivalence.mjs` 守着。
 * ⇒ 用源码引擎造的 run 去问视图模型，问的是同一套规则。
 */
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** 装载小程序里的 CommonJS 文件。 */
export function loadCjs(file) {
  const code = readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const req = (id) => loadCjs(path.resolve(path.dirname(file), id));
  const fn = vm.runInThisContext(
    `(function (module, exports, require, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, req, console, globalThis);
  return mod.exports;
}

/** 小程序端的视图模型（`practice` / `wealth` / `inventory` / `people` / `map` / `statusPanel` …）。 */
export const mpView = loadCjs(path.join(ROOT, 'miniprogram/subpkg/xianxia/bridge/view-model.js'));

/** 小程序人生页（`life.wxml`）里那几块面板的标题 —— 从页面源码里读出来，不是写死的。 */
export function mpPanelTitles() {
  const wxml = readFileSync(path.join(ROOT, 'miniprogram/subpkg/xianxia/pages/life/life.wxml'), 'utf8');
  return [...wxml.matchAll(/<text class="t">([^<]+)<\/text>/g)].map((m) => m[1]);
}
