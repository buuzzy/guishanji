/**
 * xianxia-bundle.mjs — 把修仙规则的 ESM 源码打成一份小程序能跑的 CommonJS
 * ============================================================================
 *
 * 为什么不用现成的打包器
 * ----------------------
 * 仓库里没有 rollup / esbuild / webpack，也没有 @babel/plugin-transform-modules-commonjs
 * （只有 optional-chaining 与 nullish-coalescing 两个语法插件）。
 * 而 AGENTS 的「不加新依赖」口径要求我们能只用现有工具链完成这件事。
 *
 * 所以这里手写一个**只够用**的打包器：
 *   · 输入：若干 ESM 模块（文件路径 → 源码）
 *   · 输出：一个 CommonJS 文件（模块注册表 + 拓扑求值）
 *
 * 它只支持修仙源码里**实际出现**的语法（实测统计见下），
 * 出现不支持的写法就**直接报错退出**（宁可构建失败，也不要悄悄生成错的包）：
 *
 *   import {a, b as c} from 'p'     ✅
 *   import * as ns from 'p'         ✅
 *   export const/let/var             ✅
 *   export function / class          ✅
 *   export {a, b as c}               ✅
 *   export {a} from 'p'             ✅
 *   export default                   ❌ 报错
 *   export * from 'p'                ❌ 报错
 *   import(...) 动态导入              ❌ 报错
 *   import d from 'p'（默认导入）      ❌ 报错
 *
 * 为什么用「模块注册表」而不是直接拍平成一个大文件
 * ---------------------------------------------
 * 直接拍平需要做**作用域分析**（把 `a` 改写成 `__ns0.a`），
 * 那是真正的打包器才做得对的事，容易出错。
 * 注册表形式把每个模块原样包进一个函数，模块体里的标识符**一个字都不用改**，
 * 只有 import / export 两头被改写 ⇒ 语义风险最小。
 *
 * 依赖图实测**无环**（见 scripts/build-xianxia-mp.mjs 的自检），
 * 所以 `__req` 的懒求值 + 拓扑顺序与 ESM 的「先求值依赖」语义一致。
 * `__done` 标记只是兜底，万一将来出现环也不会无限递归。
 *
 * 三处必须做的额外改写
 * --------------------
 * ① **ES2021 逻辑赋值**（`||=` / `&&=` / `??=`）：实测修仙闭包里有 13 处
 *    （`c.network.visits ||= []`、`person.deathMonth ??= state.month` 等）。
 *    这是 ES2021 语法 ⇒ 小程序上传校验与「ES2019 可解析」门禁都会拒。
 *    babel 那两个插件管不了它，所以这里自己改写：
 *      - 左值是标识符  → `a || (a = v)` / `a && (a = v)` / `a ?? (a = v)`
 *      - 左值是成员表达式 → 用 IIFE 先取一次引用再写回（避免重复求值对象/下标）
 * ② **活绑定检查**：`import {a}` 我们拍平成 `var a = __ns0.a`（快照语义）。
 *    如果被导入的绑定在源模块里是 `let`/`var` 且**会被重新赋值**，
 *    快照就会失真 ⇒ 这种情况**直接报错退出**，不生成错的包。
 * ③ **语法降级**：`?.`（实测 434 处）与 `??`（14 处）由
 *    scripts/lib/es2015-downlevel.mjs 降级（babel，语义与官方一致）。
 *
 * 产物保证
 * --------
 * · 同样的输入 ⇒ 逐字节相同的输出（不写时间戳、不写绝对路径）
 * · 输出能被 ES2019 解析（acorn 自检，失败即报错）
 */
import {createRequire} from 'node:module';
import {downlevelEs2020} from './es2015-downlevel.mjs';

const require = createRequire(import.meta.url);
const acorn = require('acorn');
const terser = require('terser');

/** 解析 ESM 源码（修仙源码用到的语法都在 ES2022 之内）。 */
function parseModule(src, id) {
  try {
    return acorn.parse(src, {ecmaVersion: 2022, sourceType: 'module', locations: false});
  } catch (error) {
    throw new Error(`解析失败 ${id}：${error.message}`);
  }
}

/** 顶层遍历 AST。 */
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    walk(node[key], visit);
  }
}

/** 取变量声明里的名字（只支持简单标识符；解构模式报错）。 */
function declaredNames(declaration, id) {
  if (declaration.type === 'VariableDeclaration') {
    const names = [];
    for (const d of declaration.declarations) {
      if (d.id.type !== 'Identifier') {
        throw new Error(`${id}：暂不支持解构形式的导出（${d.id.type}）。`);
      }
      names.push(d.id.name);
    }
    return names;
  }
  if (declaration.id) return [declaration.id.name];
  return [];
}

/**
 * 把逻辑赋值（ES2021）改写成等价的 ES2019 写法。
 * 返回编辑列表（按位置排序、不重叠）。
 */
function logicalAssignmentEdits(ast, src, id) {
  const hits = [];
  walk(ast, (node) => {
    if (node.type === 'AssignmentExpression' && ['||=', '&&=', '??='].includes(node.operator)) {
      hits.push(node);
    }
  });
  if (!hits.length) return [];

  // 长的在前 ⇒ 先处理外层会让内层无法独立改写；
  // 实际上内层在外层范围内时，外层改写会把内层原文带进去，
  // 所以这里要求**互不重叠**：一旦重叠就报错（当前实测 13 处都互不重叠）。
  const sorted = hits.slice().sort((a, b) => (a.start - b.start) || (b.end - a.end));
  const edits = [];
  let lastEnd = -1;
  for (const node of sorted) {
    if (node.start < lastEnd) {
      throw new Error(`${id}：出现嵌套的逻辑赋值（${node.start}），需要人工处理。`);
    }
    lastEnd = node.end;
    const left = node.left;
    const rhs = src.slice(node.right.start, node.right.end);
    let text;
    if (left.type === 'Identifier') {
      const name = left.name;
      if (node.operator === '||=') text = `${name} || (${name} = ${rhs})`;
      else if (node.operator === '&&=') text = `${name} && (${name} = ${rhs})`;
      else text = `${name} ?? (${name} = ${rhs})`;
    } else if (left.type === 'MemberExpression') {
      const obj = src.slice(left.object.start, left.object.end);
      const key = left.computed
        ? src.slice(left.property.start, left.property.end)
        : src.slice(left.property.start, left.property.end);
      const write = left.computed ? `${obj}[__k] = __r` : `${obj}.${key} = __r`;
      const cond = node.operator === '||=' ? '!__r' : node.operator === '&&=' ? '__r' : '(__r === null || __r === undefined)';
      const head = left.computed
        ? `(function(){var __k = ${key};var __r = ${obj}[__k];`
        : `(function(){var __r = ${obj}.${key};`;
      text = `${head}if(${cond}){__r = ${rhs};${write};}return __r;})()`;
    } else {
      throw new Error(`${id}：暂不支持对 ${left.type} 做逻辑赋值。`);
    }
    edits.push({start: node.start, end: node.end, text});
  }
  return edits;
}

/**
 * 找出「被导出的绑定里，哪些是 let/var 且会被重新赋值」。
 * 这类绑定被 import 时会因快照语义而失真 ⇒ 必须报错。
 */
function liveBindingViolations(ast, exportedNames, id) {
  const kinds = new Map();
  for (const stmt of ast.body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id.type === 'Identifier') kinds.set(d.id.name, stmt.kind);
      }
    }
  }
  const risky = [...exportedNames].filter((name) => kinds.get(name) === 'let' || kinds.get(name) === 'var');
  if (!risky.length) return [];
  const set = new Set(risky);
  const hits = [];
  walk(ast, (node) => {
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && set.has(node.left.name)) {
      hits.push(node.left.name);
    }
    if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' && set.has(node.argument.name)) {
      hits.push(node.argument.name);
    }
  });
  if (hits.length) {
    throw new Error(
      `${id}：导出的绑定 ${[...new Set(hits)].join('、')} 是会被重新赋值的 let/var，` +
      '本打包器用快照式 import，会失真 ⇒ 请改用 const 或拆模块。'
    );
  }
  return risky;
}

/**
 * 单个模块：ESM → 模块体（CommonJS 风格）。
 * @param {string} id 模块 id（仓库相对路径，POSIX 分隔符）
 * @param {string} src 源���码
 * @param {(spec:string)=>string} resolve 相对路径 → 模块 id
 * @returns {{body:string, deps:string[]}}
 */
export function transformModule(id, src, resolve) {
  const ast = parseModule(src, id);
  const edits = [];
  const preamble = [];
  const tail = [];
  const deps = [];
  const exportedNames = new Set();
  let nsIndex = 0;

  /** 取一个命名空间变量名。 */
  const nsVar = () => `__ns${nsIndex++}`;

  for (const stmt of ast.body) {
    if (stmt.type === 'ImportDeclaration') {
      const spec = stmt.source.value;
      if (!spec.startsWith('.')) {
        throw new Error(`${id}：不支持的模块说明符「${spec}」（只允许相对路径）。`);
      }
      const depId = resolve(spec);
      if (!depId) throw new Error(`${id}：找不到依赖「${spec}」。`);
      deps.push(depId);
      const ns = nsVar();
      const lines = [];
      for (const s of stmt.specifiers) {
        if (s.type === 'ImportDefaultSpecifier') {
          throw new Error(`${id}：不支持默认导入（${s.local.name}）。`);
        }
        if (s.type === 'ImportNamespaceSpecifier') {
          lines.push(`var ${s.local.name} = ${ns};`);
        } else if (s.type === 'ImportSpecifier') {
          const imported = s.imported.name || s.imported.value;
          lines.push(`var ${s.local.name} = ${ns}.${imported};`);
        }
      }
      preamble.push(`var ${ns} = __req(${JSON.stringify(depId)});`);
      preamble.push(...lines);
      edits.push({start: stmt.start, end: stmt.end, text: ''});
    } else if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.declaration) {
        // export const/let/var/function/class
        const names = declaredNames(stmt.declaration, id);
        for (const name of names) {
          exportedNames.add(name);
          tail.push(
            `Object.defineProperty(exports, ${JSON.stringify(name)}, {get: function(){return ${name};}, enumerable: true, configurable: true});`
          );
        }
        // 去掉 `export ` 关键字（stmt.start → declaration.start）
        edits.push({start: stmt.start, end: stmt.declaration.start, text: ''});
      } else if (stmt.source) {
        // export {a as b} from 'p'
        const depId = resolve(stmt.source.value);
        if (!depId) throw new Error(`${id}：找不到重导出来源「${stmt.source.value}」。`);
        deps.push(depId);
        const ns = nsVar();
        preamble.push(`var ${ns} = __req(${JSON.stringify(depId)});`);
        for (const s of stmt.specifiers) {
          const exported = s.exported.name || s.exported.value;
          const imported = s.local.name || s.local.value;
          exportedNames.add(exported);
          tail.push(
            `Object.defineProperty(exports, ${JSON.stringify(exported)}, {get: function(){return ${ns}.${imported};}, enumerable: true, configurable: true});`
          );
        }
        edits.push({start: stmt.start, end: stmt.end, text: ''});
      } else {
        // export {a, b as c}
        for (const s of stmt.specifiers) {
          const exported = s.exported.name || s.exported.value;
          const local = s.local.name || s.local.value;
          exportedNames.add(exported);
          tail.push(
            `Object.defineProperty(exports, ${JSON.stringify(exported)}, {get: function(){return ${local};}, enumerable: true, configurable: true});`
          );
        }
        edits.push({start: stmt.start, end: stmt.end, text: ''});
      }
    } else if (stmt.type === 'ExportAllDeclaration') {
      throw new Error(`${id}：不支持 export * from（修仙源码里不应出现）。`);
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      throw new Error(`${id}：不支持 export default（修仙源码里不应出现）。`);
    }
  }

  liveBindingViolations(ast, exportedNames, id);
  const all = [...edits, ...logicalAssignmentEdits(ast, src, id)].sort((a, b) => a.start - b.start);

  // 应用编辑（区间互不重叠，已由 liveBinding/logicalAssignment 检查保证）
  let out = '';
  let cursor = 0;
  for (const edit of all) {
    if (edit.start < cursor) throw new Error(`${id}：编辑区间重叠（${edit.start}）。`);
    out += src.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  out += src.slice(cursor);

  const body = [...preamble, out, ...tail].join('\n');
  return {body, deps: [...new Set(deps)], exports: [...exportedNames]};
}

/**
 * 组装成最终的 CommonJS 文件。
 *
 * @param {Map<string,{src:string}>} modules 模块表（id → 源码）
 * @param {string[]} entryIds 需要在文件末尾求值的入口（顺序即求值顺序）
 * @param {{exportsMap?:Record<string,string[]>}} [opts]
 *        exportsMap：{模块 id: [要导出的名字…]}；不写则导出入口模块的全部导出
 * @returns {string}
 */
export function bundle(modules, entryIds, opts = {}) {
  const ids = [...modules.keys()];
  const bodies = new Map();
  const moduleExports = new Map();

  for (const id of ids) {
    const resolve = (spec) => {
      const base = spec.startsWith('./') ? spec.slice(2) : spec;
      const dir = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
      const joined = dir ? `${dir}/${base}` : base;
      const normalized = joined.split('/').reduce((acc, part) => {
        if (part === '.' || part === '') return acc;
        if (part === '..') return acc.includes('/') ? acc.slice(0, acc.lastIndexOf('/')) : '';
        return acc ? `${acc}/${part}` : part;
      }, '');
      return modules.has(normalized) ? normalized : null;
    };
    const {body, exports: names} = transformModule(id, modules.get(id).src, resolve);
    bodies.set(id, body);
    moduleExports.set(id, names);
  }

  const prelude = `/* 修仙规则运行时的兼容垫片：只在小程序分包内生效，不污染官方模式。 */
if (typeof String.prototype.replaceAll !== 'function') {
  String.prototype.replaceAll = function replaceAll(find, replacement) {
    var s = String(this);
    if (find === '') return s.split('').join(String(replacement));
    var parts = s.split(String(find));
    return parts.join(String(replacement));
  };
}
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
  };
}
if (typeof Array.prototype.at !== 'function') {
  Object.defineProperty(Array.prototype, 'at', {
    configurable: true, writable: true,
    value: function at(index) {
      var len = this.length;
      var i = index < 0 ? len + index : index;
      return i < 0 || i >= len ? undefined : this[i];
    }
  });
}
`;

  const registry = ids
    .map((id) => `__M[${JSON.stringify(id)}] = {e: {}, f: function (exports, __req) {\n${bodies.get(id)}\n}};`)
    .join('\n');

  const exportLines = [];
  const exportsMap = opts.exportsMap || {};
  if (Object.keys(exportsMap).length) {
    for (const [modId, names] of Object.entries(exportsMap)) {
      if (!modules.has(modId)) throw new Error(`导出表里的模块不存在：${modId}`);
      const missing = names.filter((n) => !moduleExports.get(modId).includes(n));
      if (missing.length) {
        throw new Error(`模块 ${modId} 没有导出：${missing.join('、')}（导出表写错了）。`);
      }
      for (const name of names) {
        exportLines.push(`  out[${JSON.stringify(name)}] = __m_${modId.replace(/[^a-zA-Z0-9]/g, '_')}.${name};`);
      }
    }
  } else {
    for (const id of entryIds) {
      for (const name of moduleExports.get(id) || []) {
        exportLines.push(`  out[${JSON.stringify(name)}] = __m_entry.${name};`);
      }
    }
  }

  // 每个要引用的模块先求值
  const needVars = new Set();
  for (const modId of Object.keys(exportsMap)) {
    needVars.add(`var __m_${modId.replace(/[^a-zA-Z0-9]/g, '_')} = __req(${JSON.stringify(modId)});`);
  }
  for (const id of entryIds) {
    needVars.add(`var __m_entry = __req(${JSON.stringify(id)});`);
  }

  const code = `${prelude}
(function () {
var __M = {};
function __req(id) {
  var m = __M[id];
  if (!m.__done) { m.__done = true; m.f(m.e, __req); }
  return m.e;
}
${registry}
${[...needVars].join('\n')}
var out = {};
${exportLines.join('\n')}
module.exports = out;
})();
`;
  return code;
}

/**
 * 降级 + 自检：把产物降到 ES2019 能解析，并确认没有 ?. / ?? 残留。
 *
 * ⚠ 用**紧凑输出**（compact）：产物是生成物，不需要可读性，
 *   而小程序分包每 KB 都要算进 2 MB 上限 —— 实测紧凑比不紧凑省约 30%。
 *
 * @param {string} code
 * @returns {string}
 */
export function downlevelAndVerify(code) {
  const out = downlevelEs2020(code, {sourceType: 'script', compact: true});
  const counts = countForbidden(out);
  if (counts.optionalChain || counts.nullish) {
    throw new Error(
      `降级后仍有 ?. × ${counts.optionalChain}、?? × ${counts.nullish}（微信上传校验会拒收）。`
    );
  }
  try {
    acorn.parse(out, {ecmaVersion: 2019, sourceType: 'script', allowReturnOutsideFunction: true});
  } catch (error) {
    throw new Error(`产物不能被 ES2019 解析：${error.message}`);
  }
  return out;
}

/**
 * 压缩 + 自检：把产物再压一道，省分包体积。
 *
 * 为什么需要这一道
 * ----------------
 * 规则从第 8 版升到第 12 版后，引擎产物从 981 KB 涨到 1,945 KB
 * ⇒ 修仙分包离微信 2 MB 的硬上限只剩 110 KB。
 * babel 的紧凑输出已经省掉约 30%，但**变量名与死代码**还在
 * ⇒ 再用 terser 压一道，实测又省 207 KB（1,945,182 → 1,737,779 字节）。
 *
 * ⚠ 三条自检（少一条就不许产出）：
 *   ① 压缩后仍能被 **ES2019** 解析；
 *   ② 压缩后没有残留 `?.` / `??`（微信上传校验拒收）；
 *   ③ 压缩是**确定**的：同样输入 ⇒ 逐字节相同（terser 的改名顺序是稳定的）。
 *
 * ⚠ 压缩**只动我们自己的产物**，不碰上游源码：
 *   规则那份「等于上游」的保证来自 vendor 快照逐字节哈希，与这里无关。
 */
export function minifyAndVerify(code) {
  const result = terser.minify_sync(code, {
    ecma: 5,
    compress: {passes: 2},
    mangle: true,
    format: {comments: false},
  });
  if (!result || typeof result.code !== 'string') {
    throw new Error('压缩失败：terser 没有产出代码。');
  }
  const counts = countForbidden(result.code);
  if (counts.optionalChain || counts.nullish) {
    throw new Error(
      `压缩后仍有 ?. × ${counts.optionalChain}、?? × ${counts.nullish}（微信上传校验会拒收）。`
    );
  }
  try {
    acorn.parse(result.code, {ecmaVersion: 2019, sourceType: 'script', allowReturnOutsideFunction: true});
  } catch (error) {
    throw new Error(`压缩后的产物不能被 ES2019 解析：${error.message}`);
  }
  return result.code;
}

/** 统计 ?. 与 ??（AST 口径，不被字符串骗）。 */
export function countForbidden(code) {
  let optionalChain = 0;
  let nullish = 0;
  const ast = acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
  walk(ast, (node) => {
    if (node.type === 'ChainExpression') optionalChain++;
    if (node.type === 'LogicalExpression' && node.operator === '??') nullish++;
  });
  return {optionalChain, nullish};
}
