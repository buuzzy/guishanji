/**
 * 源码依赖图：找出「谁 import 了谁」，以及**环**。
 *
 * ## 为什么要有这个
 * ----------------
 *   小程序端的产物（`miniprogram/subpkg/xianxia/runtime/engine.js`）**不是原生 ESM**，
 *   而是一个手写的 CommonJS 小包。它的 `require` 在模块**正在加载时**会返回
 *   「半成品」（还没跑完的 exports 对象）⇒
 *   若两个模块互相依赖，且其中一个在**加载时**就读对方的顶层常量，
 *   那个常量会是 `undefined` ⇒ 运行时直接崩（小程序一打开就白屏）。
 *
 *   网页端（原生 ESM）靠「活绑定 + 求值顺序」扛过去了 ⇒ **网页端跑得通，小程序端崩**。
 *   这类 bug 在 Node 侧的门禁里也看不见（Node 侧求值顺序又不一样）。
 *
 *   2026-11-08 实测踩到的那一条：
 *     content/adventure.js → content/items.js → content/mundane-stories.js
 *       → packages/adventure/mundane-life.js → packages/adventure/story-shared.js
 *       → packages/adventure/gates.js → content/cadence-table.js → content/adventure.js
 *   ⇒ `content/cadence-table.js` 加载时读 `REALMS` ⇒ `REALMS` 是 undefined ⇒ `.map` 崩。
 *
 * ## 这里只做「找环」
 * ----------------
 *   规则层（`packages/`）依赖内容层（`content/`）是**正常的单向**；
 *   内容层依赖规则层也是**已有的**（内容层要挂事件）。
 *   ⇒ 环本身不是「原则上禁止」，但**必须是有意为之且不含「加载时读对方顶层量」**。
 *   这道门禁先把环**找出来给人看**（报告），并要求**没有环**。
 *
 * ## 解析口径
 * ----------
 *   · 静态 `import` 与 `export … from`（转发）都算边
 *     （`content/adventure.js` 那个门面就是靠转发语句接的，
 *       只认 `import` 会把最大的那条回路漏掉 —— 2026-11-08 踩过）。
 *   · 只认**相对路径**（`./` / `../`）；裸模块名（`node:fs` 之类）不在图里。
 *   · 动态 `import(...)` 不算边（仓库里没有；真出现了再说）。
 */

/**
 * 从源码里抽出「相对路径」的依赖说明符。
 * @param {string} code 源码
 * @returns {string[]} 形如 './x.js' 的说明符
 */
export function parseRelativeSpecifiers(code) {
  const out = [];
  /* 形如：具名导入 / 转发导出 / 侧效导入（说明文字，路径写在这里会骗过导入检查器） */
  const re = /(?:^|[\n;])\s*(?:import|export)\s+(?:[^'"();]*?\bfrom\s*)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    const spec = m[1];
    if (spec.startsWith('./') || spec.startsWith('../')) out.push(spec);
  }
  return out;
}

/**
 * 由「模块 id → 源码」建图。
 * @param {Map<string,string>|Record<string,string>} sources 模块 id → 源码
 * @param {(id:string)=>string} resolvePath 把说明符解析成模块 id
 * @returns {Map<string,string[]>} 模块 id → 它依赖的模块 id（只留图内的）
 */
export function buildGraph(sources, resolvePath) {
  const graph = new Map();
  const list = sources instanceof Map ? [...sources.keys()] : Object.keys(sources);
  for (const id of list) {
    const code = sources instanceof Map ? sources.get(id) : sources[id];
    const deps = [];
    for (const spec of parseRelativeSpecifiers(code || '')) {
      const target = resolvePath(id, spec);
      if (target && target !== id) deps.push(target);
    }
    graph.set(id, [...new Set(deps)]);
  }
  return graph;
}

/**
 * 找出图里的**环**（每个环给出一条具体回路，方便人照着改）。
 * @param {Map<string,string[]>} graph 模块 id → 依赖列表
 * @returns {string[][]} 每条环是一串模块 id（首尾同一个）
 */
export function findCycles(graph) {
  const cycles = [];
  const seen = new Set();

  /* 迭代式 DFS，避免深图爆栈。 */
  for (const start of graph.keys()) {
    if (seen.has(start)) continue;
    const path = [];
    const onPath = new Set();
    const stack = [{id: start, i: 0}];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const deps = graph.get(top.id) || [];
      if (top.i === 0) { path.push(top.id); onPath.add(top.id); }
      if (top.i >= deps.length) {
        stack.pop(); onPath.delete(path.pop()); seen.add(top.id); continue;
      }
      const next = deps[top.i++];
      if (onPath.has(next)) {
        const at = path.indexOf(next);
        cycles.push([...path.slice(at), next]);
      } else if (!seen.has(next) && graph.has(next)) {
        stack.push({id: next, i: 0});
      }
    }
  }
  return cycles;
}

/**
 * 把一条回路画成一行人话。
 * @param {string[]} cycle 模块 id 序列（首尾同一个）
 * @returns {string}
 */
export function formatCycle(cycle) {
  return cycle.join(' → ');
}
