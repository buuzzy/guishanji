/**
 * es2015-downlevel.mjs — 把 ES2020 的两个语法降级掉
 * =========================================================================
 *
 * 为什么需要它
 * ------------
 * 2026-10-25 第一次真正上传小程序包（拿到真实 AppID 之后）才发现：
 *
 *   ① **微信上传时的语法校验拒收 ES2020 的 `?.`（可选链）和 `??`（空值合并）**：
 *      `invalid file: subpkg/dlc/src/core-content.js, 1:1796
 *       SyntaxError: Unexpected token .`
 *      实测同一个文件：把 `?.` / `??` 降级后立刻通过；
 *      而 ES2015 ~ ES2019 的写法（箭头函数 / const / 模板串 / 对象展开 /
 *      async-await / `**`）微信全都收。
 *
 *   ⇒ 结论：**小程序端的 JS 一律不用 ES2020 语法**。
 *      这条现在是**永久不变量**（`scripts/check-mp-syntax.mjs` 每次回归都查），
 *      不管开发者工具的转译开关是开是关 —— 万一哪天有人把转译关掉，
 *      或者给某个文件加了「跳过转译」，小程序端源码本身仍然是能过上传校验的。
 *
 * 降级到什么程度
 * --------------
 * 只动两样，其它语法**一律原样保留**（箭头函数、const/let、模板串、对象展开
 * 都留着）。所以不能上 `preset-env`（那会把整套 ES6 也转成 ES5，体积反而暴涨），
 * 只挂两个插件：
 *   - @babel/plugin-transform-optional-chaining
 *   - @babel/plugin-transform-nullish-coalescing-operator
 *
 * 语义与 babel 官方输出完全一致（`a?.b` → `a == null ? void 0 : a.b`）。
 *
 * ⚠ **不要在这里改成「全套 ES5」**：工具的转译必须开着（关了编译器就不产出 AST，
 *   模块注册链会断 ⇒ 真机整页白屏），详见 `docs/miniprogram-package-size.md` §3。
 *   本工具只负责让源码**本身**不含 ES2020 语法，不负责替工具转译。
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const babel = require('@babel/core');
const pluginOptionalChaining = require('@babel/plugin-transform-optional-chaining');
const pluginNullishCoalescing = require('@babel/plugin-transform-nullish-coalescing-operator');

/**
 * 把一段 JS 里的 `?.` 和 `??` 降级成 ES2015 写法。
 *
 * @param {string} code 源码
 * @param {{sourceType?: 'script'|'module', compact?: boolean}} [opts]
 * @returns {string} 降级后的源码
 */
export function downlevelEs2020(code, opts = {}) {
  const { sourceType = 'script', compact = true } = opts;
  const out = babel.transformSync(code, {
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    /* compact：不要换行和多余空格 —— 小程序端每一 KB 都要算进分包上限 */
    compact,
    comments: false,
    sourceType,
    /* 不做 polyfill、不注 helper：只改语法 */
    assumptions: {},
    plugins: [pluginOptionalChaining, pluginNullishCoalescing],
  });
  /* ⚠ 降级**之后**必须修 for-of 的 var 作用域（见 fixForOfVarScope 的说明）：
   *   babel 把可选链的临时变量声明塞进了 for-of 的循环体，
   *   而循环头部（迭代表达式）已经在用它 ⇒ 微信转译后头部引用不到变量 ⇒ 运行时炸。
   *   这一步放在降级之后，因为「临时变量」正是降级才产生的。 */
  return fixForOfVarScope(out.code);
}

/**
 * 修掉「for-of 头部引用了只声明在循环体内的 var」这种写法。
 *
 * ## 为什么要修
 * ------------
 * 2026-11-05 用户真机报「点归山记 → 空白页只剩『命盘转动』」。查出来的根因是：
 *
 *   ① 上游用了可选链 `s.journey?.cultivationTravel`；
 *   ② 本文件的降级把可选链展开成**带临时变量**的写法：
 *        `for (const t of [(_s$journey11 = s.journey) === null || … ]) { var _s$journey11, _s$journey12; … }`
 *      —— 注意 `var` 声明落在**循环体**里，而循环**头部**（for 的迭代表达式）
 *      已经在用它了。
 *   ③ Node 里 `var` 是函数级提升，所以**一切正常** ⇒ 所有 Node 门禁都测不出来。
 *   ④ 微信开发者工具做 ES6→ES5 转译时，把 for-of 的循环体**抽成独立函数**
 *      （`_loop3`）—— 因为循环体里有闭包引用了循环变量 `t`。
 *      `var` 声明跟着循环体一起被关进了那个函数，
 *      而循环头部的赋值留在函数**外面** ⇒ 头部引用了一个不存在的变量
 *      ⇒ `ReferenceError: _s$journey11 is not defined`（未捕获 ⇒ 页面初始化中断）。
 *
 * ## 为什么修在这里（降级器）而不是修引擎产物
 * --------------------------------------------
 * `runtime/engine.js` 是**生成物**（scripts/build-xianxia-mp.mjs 产出），
 * 手改它下次构建就被覆盖、而且「规则 = 上游那份」就不成立了。
 * 而这个坑的**来源就是降级这一步** ⇒ 在降级器里根治最合适：
 * 上游源码不用动、产物不用手改、以后上游再出同样的写法也不会复发。
 *
 * ## 怎么修
 * --------
 * 把 for-of 循环体**最前面**那条 `var` 声明（只处理 `kind === 'var'`）
 * **提到 for 语句之前**（同一个函数作用域内）。
 * 语义完全等价（`var` 本来就是函数级提升、循环外也能用），
 * 但转译后这条声明就留在循环体**外面** ⇒ 不再被关进抽出来的那个函数里。
 *
 * 只提「for 头部用到过」的那些变量 —— 其余的（只在循环体内用）挪动没有收益，
 * 且徒增 diff。
 *
 * @param {string} code 源码
 * @returns {string} 修好后的源码
 */
export function fixForOfVarScope(code) {
  const acorn = require('acorn');
  // 用 acorn 解析 → 找到需要改的 for-of → 用**文本切片**（不重新打印整个文件），
  // 这样除了移动那一条声明以外，产物其它部分逐字节不变。
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true });
  } catch {
    return code; /* 解析不了就原样返回，交给后面的门禁报错 */
  }

  /** 收集一个节点里出现过的所有标识符名 */
  const identifiersOf = (node) => {
    const names = new Set();
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'Identifier') names.add(n.name);
      for (const key of Object.keys(n)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
        walk(n[key]);
      }
    };
    walk(node);
    return names;
  };

  /** 找出所有 for-of / for-in，及其需要提前的声明 */
  const edits = [];
  const walk = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((x) => walk(x, parent)); return; }
    if ((node.type === 'ForOfStatement' || node.type === 'ForInStatement')
        && node.body && node.body.type === 'BlockStatement') {
      const headNames = identifiersOf(node.right);
      /* 循环体内第一条 var 声明（babel 的临时变量总是放在最前面） */
      const first = node.body.body[0];
      if (first && first.type === 'VariableDeclaration' && first.kind === 'var') {
        const needed = first.declarations
          .filter((d) => d.id.type === 'Identifier' && headNames.has(d.id.name))
          .map((d) => d.id.name);
        if (needed.length) {
          edits.push({node, first, needed, parent});
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      walk(node[key], node);
    }
  };
  walk(ast, null);

  if (!edits.length) return code;

  /* 从后往前改（前面的偏移不受后面影响） */
  edits.sort((a, b) => b.first.start - a.first.start);
  let out = code;
  for (const {node, first, needed, parent} of edits) {
    /* 按 declarator 的**精确 AST 位置**切分，不用正则拆逗号（避免误伤默认值里的逗号） */
    const decls = first.declarations;
    const moved = [];
    const kept = [];
    for (const d of decls) {
      const name = d.id.type === 'Identifier' ? d.id.name : null;
      if (name && needed.includes(name)) moved.push(d);
      else kept.push(d);
    }
    if (!moved.length) continue;

    /* 1) 把要搬的 declarator 原文切出来（保留各自的初始化表达式） */
    const movedText = moved
      .map((d) => out.slice(d.start, d.end))
      .join(', ');

    /* 2) 循环体里剩下的 declarator 重新拼一条声明（没有就整条删掉） */
    const keptText = kept.length
      ? `var ${kept.map((d) => out.slice(d.start, d.end)).join(', ')};`
      : '';

    /*
     * 3) `var` 只能插在**语句列表**里（block / program 的 body）。
     *    若这个 for 本身是某条语句的唯一子句（如 `if (s) for (…) {…}`），
     *    直接插 `var` 会变成 `if (s) var _x;` ⇒ **条件分支被改变**（语义变了）。
     *    ⇒ 这种情况改成「把整个 for 包进一个块」，`var` 放在块里：
     *       `if (s) { var _x; for (…) {…} }`
     *       `var` 仍是函数级提升 ⇒ 语义等价。
     */
    const inStatementList = parent
      && (parent.type === 'BlockStatement' || parent.type === 'Program');
    const movedDecl = `var ${movedText};`;

    /* 4) 三处切片：① for 之前插入搬走的声明 ② 删掉体内第一条声明 ③ 换回剩下的 */
    const leadingWs = /^[ \t]*\r?\n?/.exec(out.slice(first.end));
    const head = out.slice(0, node.start);
    const tail = out.slice(node.start);
    if (inStatementList) {
      out = `${head}${movedDecl}${tail}`;
    } else {
      /* 包块：把 for 整个裹进 { }，movedDecl 放块内最前 */
      out = `${head}{${movedDecl}${tail}}`;
    }
    /* 重新定位体内那条声明（前面插入了东西，偏移变了） */
    /* 包块时多了一个前导花括号 ⇒ 偏移 +1（结尾的花括号在整段之后，不影响此处） */
    const shift = inStatementList ? movedDecl.length : movedDecl.length + 1;
    const declStart = first.start + shift;
    const declEnd = first.end + shift;
    const before2 = out.slice(0, declStart);
    const after2 = out.slice(declEnd);
    const leadingWs2 = /^[ \t]*\r?\n?/.exec(after2);
    const afterTrimmed = leadingWs2 ? after2.slice(leadingWs2[0].length) : after2;
    out = before2 + keptText + afterTrimmed;
  }

  /*
   * 自检：改完必须还能被解析，而且**除移动那一条声明外内容不变**。
   * （纯文本切片很容易出现 off-by-one —— 开发时就踩到过一次：
   *   包块时多算了一个花括号 ⇒ `g(t)` 被改成 `v(t)`。）
   * ⇒ 这里做两道校验：① 能解析；② 标识符集合完全一致（多了少了都不行）。
   */
  try {
    acorn.parse(out, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
  } catch (error) {
    throw new Error(`fixForOfVarScope：改完之后解析失败（${error.message}）`);
  }
  const before = identifiersOf(ast);
  const after = identifiersOf(acorn.parse(out, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true}));
  const lost = [...before].filter((n) => !after.has(n));
  const gained = [...after].filter((n) => !before.has(n));
  if (lost.length || gained.length) {
    throw new Error(
      `fixForOfVarScope：改完之后内容变了（丢了 ${lost.join(',') || '无'}；多了 ${gained.join(',') || '无'}）`
    );
  }
  return out;
}

/**
 * 判断一段 JS 里有没有 ES2020 的 `?.` / `??`（用 AST 判断，不会被字符串骗）。
 * @param {string} code
 * @returns {{optionalChain:number, nullish:number}}
 */
export function countEs2020(code) {
  const acorn = require('acorn');
  let optionalChain = 0;
  let nullish = 0;
  const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true });
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'ChainExpression') optionalChain++;
    if (node.type === 'LogicalExpression' && node.operator === '??') nullish++;
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      walk(node[key]);
    }
  };
  walk(ast);
  return { optionalChain, nullish };
}

/**
 * 扫出「for-of / for-in 头部引用了只声明在循环体内的 var」这种**会在微信里炸**的写法。
 *
 * ## 为什么需要它
 * --------------
 * 这个形态在 Node 里完全正常（`var` 是函数级提升），
 * 所以**任何只在 Node 里跑的门禁都看不见它** ——
 * 而它在微信开发者工具 / 真机上会抛 `ReferenceError`（见 fixForOfVarScope 的说明）。
 * ⇒ 必须有一道**直接扫产物**的门禁，否则这类问题会再次溜到真机。
 *
 * ## 判定口径（四个条件同时成立才算命中）
 * ----------------------------------------
 *   ① 是 for-of / for-in，且循环体是一个 block；
 *   ② 循环体第一条语句是 `var` 声明（babel 的临时变量就放在这儿）；
 *   ③ 循环**头部**（迭代表达式）用到了 ② 里声明的变量名；
 *   ④ 循环体里有**闭包引用了循环变量**。
 *
 * ④ 是必需的，缺了它就误报 —— 实测（微信开发者工具 2.02.2608080）：
 *   · 体内有闭包引用循环变量 ⇒ IDE 把循环体抽成独立函数 `_loop3`
 *     ⇒ `var` 跟着被关进去、头部引用不到 ⇒ **炸**；
 *   · 体内没有闭包 ⇒ IDE 不抽函数、`var` 留在原作用域 ⇒ **不炸**。
 *
 * @param {string} code 源码
 * @returns {{count:number, hits:{vars:string[], line:number}[]}}
 */
export function scanForOfVarScope(code) {
  const acorn = require('acorn');
  let ast;
  try {
    ast = acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
  } catch (error) {
    throw new Error(`scanForOfVarScope：代码解析失败（${error.message}）`);
  }
  const identifiersOf = (node) => {
    const names = new Set();
    const walk = (n) => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.type === 'Identifier') names.add(n.name);
      for (const key of Object.keys(n)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
        walk(n[key]);
      }
    };
    walk(node);
    return names;
  };
  /** 循环体里是否有闭包（函数/箭头）引用了循环变量 */
  const hasClosureOver = (body, loopVar) => {
    let found = false;
    const walk = (n, inFn) => {
      if (!n || typeof n !== 'object' || found) return;
      if (Array.isArray(n)) { n.forEach((x) => walk(x, inFn)); return; }
      if (n.type === 'Identifier' && inFn && n.name === loopVar) { found = true; return; }
      const isFn = n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'
        || n.type === 'FunctionDeclaration';
      for (const key of Object.keys(n)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
        walk(n[key], inFn || isFn);
      }
    };
    walk(body, false);
    return found;
  };
  const hits = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if ((node.type === 'ForOfStatement' || node.type === 'ForInStatement')
        && node.body && node.body.type === 'BlockStatement') {
      const headNames = identifiersOf(node.right);
      const first = node.body.body[0];
      if (first && first.type === 'VariableDeclaration' && first.kind === 'var') {
        const vars = first.declarations
          .filter((d) => d.id.type === 'Identifier' && headNames.has(d.id.name))
          .map((d) => d.id.name);
        /* 循环变量名（for (const t of …) 的 t） */
        const loopVar = node.left.type === 'Identifier' ? node.left.name
          : (node.left.type === 'VariableDeclaration' && node.left.declarations[0]
            && node.left.declarations[0].id.type === 'Identifier'
            ? node.left.declarations[0].id.name : null);
        /* 体内有闭包引用循环变量 ⇒ 微信转译会抽走循环体 ⇒ 才会炸 */
        const risky = loopVar && hasClosureOver(node.body, loopVar);
        if (vars.length && risky) {
          hits.push({vars, line: node.loc ? node.loc.start.line : 0});
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      walk(node[key]);
    }
  };
  walk(ast);
  return {count: hits.length, hits};
}
