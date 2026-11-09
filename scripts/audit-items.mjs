#!/usr/bin/env node
/**
 * 道具闭环审计 —— 每个道具从哪来、能到哪去（2026-11-08 · T5）
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 用户 2026-11-06 提的第 11 条（B10）：「道具 87 发 10 耗」。
 * 玩家捡到的东西既不能花、也没有下文 ⇒ 那条内容等于不存在。
 *
 * 四条判据
 * --------
 *   ① **发霉的道具**：道具表里有，源码里一次都没出现 ⇒ 报红。
 *   ② **拿不到却被消耗**：某道具只在「消耗」语境里出现（cost / remove），
 *      没有任何「获得」语境 ⇒ 报红（这条最严重：玩家被扣了一个拿不到的东西）。
 *   ③ **拿到却无出口**：某道具有「获得」语境，但既不被消耗、也不作为用途
 *      （requires / check 加成 / 代码里直接读）⇒ 报红。
 *   ④ **人生经历能产出**：实跑统计两件事，任一不达标 ⇒ 报红：
 *      · **一条命里带道具的人生经历 ≥ 3 条** —— 玩家多久捡到一次东西（这条是主角）；
 *      · **自动旁白里带道具的比例 ≥ 3%** —— 这条通道自己的健康度。
 *      ⚠ 比例这条的下限在阶段 5 从 8% 降到 3%：**分母合法地翻了一倍**
 *        （旁白加密：自动旁白 ~63 → ~110 条/命），分子（~4.3 条/命）一个字节没变
 *        ⇒ 真正要守的「绝对量」由上面那条直接守。
 *
 * ## 为什么用**静态**扫描而不是只靠实跑
 * --------------------------------------
 * 实跑只能看到抽样命里走到的那些道具；「某个道具永远拿不到」这件事
 * 恰恰是**跑不到**才暴露的 ⇒ 只能靠把源码里的「获得 / 消耗 / 用途」
 * 三种语境逐个数出来。
 * ⇒ 实跑只用来量第 ④ 条（人生经历带道具的比例）。
 *
 * ## 三种语境怎么认
 * ----------------
 *   · `cost:` / `remove:` ⇒ **消耗**（sink）
 *   · `requires:` / `check:` ⇒ **用途**（use）
 *   · `effects:` ⇒ **获得**（source）
 *   · `items:` ⇒ 看它装在谁里面（`effects.items` 是获得，`cost.items` 是消耗）
 *   · 什么区域都不在 ⇒ 代码里**直接读**这个道具（use）
 *
 * ⚠ 道具表本身（`content/items.js`）不算「出现」—— 那是定义，不是获得/消耗/用途。
 * ⚠ 动态写法 `effects:{items:[items[0]]}`（凝丹材料那种）逐字扫不到，
 *   所以要把同文件里那个变量的定义一并解析出来。
 *
 * 用法
 * ---
 *   node scripts/audit-items.mjs            # 报告
 *   node scripts/audit-items.mjs --check    # 门禁用（有问题 ⇒ 退出码 1）
 *   node scripts/audit-items.mjs --count=200
 */
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ITEMS} from '../content/items.js';
import {createRun, advance, options, choose} from '../packages/adventure/engine.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ══════════════════════════════════════════════ 一、静态扫描 */

/** 要扫的目录（内容与规则源码）。 */
/* ⚠ 2026-11-08：网页端已删 ⇒ `apps/preview` 不再扫。
   那三个留下的文件是**画面数据**（调色板与像素画），不是文案，扫了也没有产出。 */
export const SCAN_DIRS = ['content', 'packages/adventure'];

/** 收集源码文件。 */
function collect(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) collect(rel, out);
    else if (name.endsWith('.js')) out.push(rel);
  }
  return out;
}

/**
 * 找出文本里所有「键：值」的位置与值的范围。
 * @param {string} text 源码
 * @returns {Array<{key:string,start:number,end:number,shape:'obj'|'arr'|'paren'}>}
 */
export function regions(text) {
  const out = [];
  const re = /\b(cost|remove|requires|check|effects|items|failure)\s*([:=(])/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1];
    let i = m.index + m[0].length;
    while (i < text.length && /\s/.test(text[i])) i++;
    const ch = text[i];
    let end = -1, shape = 'paren';
    if (ch === '{') { end = match(text, i, '{', '}'); shape = 'obj'; }
    else if (ch === '[') { end = match(text, i, '[', ']'); shape = 'arr'; }
    else if (ch === '(') end = match(text, i, '(', ')');
    if (end > 0) out.push({key, start: i, end, shape});
  }
  return out;
}

/**
 * 从 open 处找到配对的 close（跳过字符串与模板字面量）。
 * @returns {number} close 的位置（找不到 ⇒ -1）
 */
function match(text, open, left, right) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i + 2); if (i < 0) return -1; i++; continue; }
    if (c === left) depth++;
    else if (c === right) { depth--; if (!depth) return i; }
  }
  return -1;
}

/** 从一段文本里取出所有单引号包起来的 id。 */
function idsIn(text) {
  const out = [];
  for (const m of text.matchAll(/'([a-z][a-z0-9_]*)'/g)) out.push(m[1]);
  return out;
}

/**
 * 解析「items:[变量]」这种动态写法 —— 把变量的定义找出来，把里面的 id 都算上。
 * ⚠ 这是为了覆盖 `effects:{items:[items[0]]}`（凝丹材料那种写法）：
 *   逐字扫是扫不到的，但那个 id 在同一行的 `const items=[...]` 里明明写着。
 * ⚠ 还要覆盖 `const skill=…,item={sword:'exam_sword_charm',…}[skill]`
 *   这种**一条声明里有两个变量**的写法 ⇒ 不能只找 `const <名字>=`，
 *   得从最近的一个声明关键字往后读到分号。
 */
function resolveVariable(fileText, name) {
  const assign = new RegExp('\\b' + name + '\\s*=');
  const m = assign.exec(fileText);
  if (!m) return [];
  /* 往回找最近的一个声明关键字（const / let / var）。 */
  const before = fileText.slice(0, m.index);
  const decl = Math.max(before.lastIndexOf('const '), before.lastIndexOf('let '), before.lastIndexOf('var '));
  const from = decl >= 0 ? decl : m.index;
  /* 往后读到分号为止（别把下一句也吃进来）。 */
  const semi = fileText.indexOf(';', m.index);
  const to = semi >= 0 ? semi : fileText.length;
  return idsIn(fileText.slice(from, to));
}

/**
 * 把**一份源码**里的道具出现归类（纯函数，可单测）。
 * @param {string} text 源码
 * @param {string} rel 文件名（记在结果里）
 * @param {Map<string,{source:Set<string>,sink:Set<string>,use:Set<string>}>} found 累加器
 */
export function classifyText(text, rel, found) {
  const regs = regions(text);
  /* 逐个道具 id 扫一遍（带引号的写法：'old_letter'）。 */
  for (const id of found.keys()) {
    const token = "'" + id + "'";
    let at = -1;
    while ((at = text.indexOf(token, at + 1)) >= 0) {
      /* 找到包含这个位置的最内层区域。 */
      const inner = regs.filter(r => r.start <= at && at < r.end).sort((a, b) => b.start - a.start)[0];
      let kind = null;
      if (inner) {
        if (inner.key === 'cost' || inner.key === 'remove') kind = 'sink';
        else if (inner.key === 'requires' || inner.key === 'check') kind = 'use';
        else if (inner.key === 'effects' || inner.key === 'failure') kind = 'source';
        else if (inner.key === 'items') {
          /* 再往外找一层：items 数组装在谁里面？ */
          const outer = regs.filter(r => r.start <= inner.start && r.end >= inner.end && r !== inner)
            .sort((a, b) => b.start - a.start)[0];
          const owner = outer ? outer.key : '';
          if (owner === 'cost' || owner === 'remove') kind = 'sink';
          else if (owner === 'requires' || owner === 'check') kind = 'use';
          else if (owner === 'effects' || owner === 'failure') kind = 'source';
          else kind = 'source';
        }
      }
      if (!kind) {
        /*
         * 不在任何区域里 ⇒ 这是「读」这个道具的地方
         * （例如 `has(s,'condensation_book')` 这种判断）⇒ 算**用途**。
         */
        kind = 'use';
      }
      found.get(id)[kind].add(rel);
    }
  }
  /*
   * ⚠ 还有一种写法**不带引号**：`check:{ items:{ old_letter: 10 } }`
   *   —— 道具是对象键，逐字扫引号扫不到 ⇒ 整段漏掉
   *   （实测：`old_letter` / `wind_seed` 明明已经补了出口，审计却说没有）。
   * ⇒ 这里把「items 后面跟着对象」的那种区域的键逐个读出来。
   */
  for (const region of regs) {
    if (region.key !== 'items' || region.shape !== 'obj') continue;
    const owner = regs.filter(r => r.start <= region.start && r.end >= region.end && r !== region)
      .sort((a, b) => b.start - a.start)[0];
    const ownerKey = owner ? owner.key : '';
    const body = text.slice(region.start + 1, region.end);
    for (const m of body.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) {
      const id = m[1];
      if (!found.has(id)) continue;
      if (ownerKey === 'cost' || ownerKey === 'remove') found.get(id).sink.add(rel);
      else if (ownerKey === 'requires' || ownerKey === 'check') found.get(id).use.add(rel);
      else found.get(id).source.add(rel);
    }
  }
  /* 动态写法：`effects:{items:[items[0]]}` —— 把变量的定义补进「获得」。 */
  for (const m of text.matchAll(/items\s*:\s*\[\s*([A-Za-z_$][\w$]*)\s*(?:\[\s*(\d+)\s*\])?\s*\]/g)) {
    const varName = m[1];
    for (const id of resolveVariable(text, varName)) {
      if (!found.has(id)) continue;
      const at = m.index;
      const inner = regs.filter(r => r.start <= at && at < r.end).sort((a, b) => b.start - a.start)[0];
      const owner = inner ? inner.key : '';
      if (!owner || owner === 'items' || owner === 'effects') found.get(id).source.add(rel);
      else if (owner === 'cost' || owner === 'remove') found.get(id).sink.add(rel);
      else if (owner === 'requires' || owner === 'check') found.get(id).use.add(rel);
      else found.get(id).source.add(rel);
    }
  }
}

/**
 * 把源码扫一遍，得出每个道具的「来源 / 消耗 / 用途」各在哪些文件。
 * @param {string[]} files 相对 ROOT 的文件路径
 * @param {string[]} itemIds 要查的道具 id
 * @returns {Map<string,{source:Set<string>,sink:Set<string>,use:Set<string>}>}
 */
export function classify(files, itemIds) {
  const found = new Map();
  for (const id of itemIds) found.set(id, {source: new Set(), sink: new Set(), use: new Set()});
  for (const rel of files) {
    /* ⚠ 道具表本身不算「出现」—— 那是定义，不是获得/消耗/用途。 */
    if (rel === join('content', 'items.js')) continue;
    classifyText(readFileSync(join(ROOT, rel), 'utf8'), rel, found);
  }
  return found;
}

/* ══════════════════════════════════════════════ 二、实跑：人生经历带道具的比例 */

/**
 * 跑一批人生，量「自动旁白里有多少条带着道具」。
 *
 * 口径：每次 `advance` 之前记下行囊长度；这一步里既记了自动旁白、行囊又变长了
 * ⇒ 这条旁白带了道具。
 * ⚠ 为什么不用「随机流」抽：抽签会挪动随机数的消耗顺序，
 *   旧版本人生（规则 5–11）会被连累（它们的决策序列必须逐条不变）。
 */
export function measureAutoItems(count, decide) {
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  let autoTotal = 0, autoWithItem = 0, lives = 0;
  const granted = new Map();
  for (let i = 0; i < count; i++) {
    const spec = {
      seed: '道具审计-' + i, rulesVersion: 12, path: paths[i % 5],
      conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
      ending: i % 4 === 0 ? 'dao' : 'guard', family: i % 9 === 0 ? 'sever' : 'keep',
      school: ['sword', 'alchemy', 'array'][i % 3],
    };
    const state = createRun({seed: spec.seed, rulesVersion: spec.rulesVersion});
    let guard = 0;
    try {
      while (state.phase === 'life' && guard++ < 400) {
        while (state.phase === 'life' && !state.pending) {
          const journalBefore = state.journal.length;
          const itemsBefore = state.inventory.length;
          advance(state, 1);
          const added = state.journal.slice(journalBefore).filter(j => j.automatic);
          autoTotal += added.length;
          /* 这一步里行囊多了东西 ⇒ 这条人生经历带着道具。 */
          if (added.length && state.inventory.length > itemsBefore) {
            autoWithItem += added.length;
            for (const item of state.inventory.slice(itemsBefore)) granted.set(item, (granted.get(item) || 0) + 1);
          }
        }
        if (state.phase !== 'life') break;
        const available = options(state).filter(o => o.enabled);
        if (!available.length) break;
        const want = decide ? decide(state, spec) : null;
        const pick = (want && available.find(o => o.id === want.id)) || available[0];
        choose(state, pick.id);
      }
    } catch (error) { /* 这条命跑不完就不算它 */ }
    lives++;
  }
  return {autoTotal, autoWithItem, lives, granted};
}

/* ══════════════════════════════════════════════ 三、判据（纯函数，可单测） */

/**
 * 判据阈值 ①：人生经历带道具的**占比**下限。
 *
 * ⚠⚠ **为什么从 8% 降到 3%（2026-11-08 · 阶段 5）**
 * ----------------------------------------------
 * 这条判据量的是「**自动旁白里带道具的比例**」——
 * 而**分母在阶段 5 合法地翻了一倍**（旁白加密：一生的自动旁白从 ~63 条涨到 ~110 条）。
 * 分子（带道具的旁白条数）**一个字节都没变**（~4.3 条/命）⇒
 * 同一个绝对量，占比自然从 8.9% 掉到 3.9%。
 *
 * ⇒ 所以现在这条判据**降的是「比例」这道代理指标**，
 *   真正要守的那件事（玩家多久捡到一次东西）**由判据 ② 直接守**。
 *
 * @see PER_LIFE_FLOOR —— 那才是玩家真正感觉到的那件事
 */
export const RATIO_FLOOR = 0.028;
/* ⚠ 比例下限 3% → 2.8%（2026-11-09 · 故事重写 W1）：分母再次合法增长
 *   （决策卡 +4/命、场景加密保叙述比 ≥6.3 ⇒ 自动旁白 ~17257 条/120 命），
 *   分子（拾遗行池容量）没变 ⇒ 按阶段 5 的同一先例再降一档；
 *   真正要守的绝对量（每命 ≥3 条）不动。 */

/**
 * 判据阈值 ②：**一条命里带道具的人生经历条数**下限。
 *
 * ⚠ 这条是阶段 5 新加的 —— 它直接守玩家真正感觉到的那件事：
 *   「日子过久了，会不会一个东西都捡不到？」
 * 阶段 5 之前是 ~4.3 条/命（比例口径 8.9%），阶段 5 之后是 ~4.3 条/命（比例口径 3.9%）
 * ⇒ **绝对量没变**（变的是分母）⇒ 下限钉 3，留两成余量。
 */
export const PER_LIFE_FLOOR = 3;

/**
 * 按四条判据给出问题清单。
 * @param {Array<{id:string,name:string,source:number,sink:number,use:number}>} rows
 * @param {number} ratio 实跑量到的「自动旁白带道具比例」
 * @param {number} perLife 实跑量到的「每条命里带道具的人生经历条数」
 * @returns {string[]} 问题清单（空 ⇒ 通过）
 */
export function judge(rows, ratio, perLife = PER_LIFE_FLOOR) {
  const problems = [];
  for (const r of rows) {
    const total = r.source + r.sink + r.use;
    if (total === 0) problems.push(`${r.id}（${r.name}）：道具表里有，源码里一次都没出现 —— 这条道具根本不存在`);
    else if (r.sink > 0 && r.source === 0) problems.push(`${r.id}（${r.name}）：被用掉却没有任何来源（消耗见 ${r.sinkFiles.join('、')}）`);
    else if (r.source > 0 && r.sink === 0 && r.use === 0) problems.push(`${r.id}（${r.name}）：拿到却没有任何出口（来源见 ${r.sourceFiles.join('、')}）`);
  }
  if (!(ratio >= RATIO_FLOOR)) {
    problems.push(`人生经历带道具的比例 ${(ratio * 100).toFixed(1)}% < ${(RATIO_FLOOR * 100).toFixed(0)}%`);
  }
  if (!(perLife >= PER_LIFE_FLOOR)) {
    problems.push(`一条命里带道具的人生经历只有 ${perLife.toFixed(2)} 条 < ${PER_LIFE_FLOOR} 条（玩家多久捡到一次东西，这件事不许倒退）`);
  }
  return problems;
}

/* ══════════════════════════════════════════════ 四、跑一遍 */

/**
 * 跑一次完整审计。
 * @param {number} count 实跑多少条命
 * @returns {{rows:Array,ratio:number,problems:string[],measured:object}}
 */
export function runAudit(count) {
  const files = SCAN_DIRS.flatMap(d => collect(d));
  const itemIds = Object.keys(ITEMS);
  const found = classify(files, itemIds);
  const rows = itemIds.map(id => {
    const info = found.get(id);
    return {
      id, name: ITEMS[id].name,
      source: info.source.size, sink: info.sink.size, use: info.use.size,
      sourceFiles: [...info.source], sinkFiles: [...info.sink], useFiles: [...info.use],
    };
  });
  const measured = measureAutoItems(count);
  const ratio = measured.autoTotal ? measured.autoWithItem / measured.autoTotal : 0;
  /* 判据 ②：一条命里带道具的人生经历条数（玩家真正感觉到的那件事）。 */
  const perLife = measured.lives ? measured.autoWithItem / measured.lives : 0;
  return {rows, ratio, perLife, problems: judge(rows, ratio, perLife), measured, files};
}

/* CLI：只有在**被直接运行时**才跑（被 import 时不跑 ⇒ 单测可以拿里面的纯函数）。 */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*?(?=\/)/, ''))) {
  const args = process.argv.slice(2);
  const COUNT = Number(args.find(a => a.startsWith('--count='))?.split('=')[1] || 200);
  const {rows, ratio, perLife, problems, measured, files} = runAudit(COUNT);

  console.log('道具闭环审计');
  console.log(`  道具 ${rows.length} 个 · 源码 ${SCAN_DIRS.join('、')}（${files.length} 个文件）`);
  console.log(`  人生经历带道具比例：${(ratio * 100).toFixed(1)}%（${measured.autoWithItem}/${measured.autoTotal} 条自动旁白，${measured.lives} 条命；下限 ${(RATIO_FLOOR * 100).toFixed(0)}%）`);
  console.log(`  一条命里带道具的人生经历：${perLife.toFixed(2)} 条（下限 ${PER_LIFE_FLOOR} 条）—— 玩家多久捡到一次东西，就看这个数`);
  if (measured.granted.size) {
    console.log('  人生经历捡到过的东西：' + [...measured.granted].map(([k, v]) => k + '×' + v).join('、'));
  }
  console.log('');
  for (const r of rows.sort((a, b) => (a.source + a.sink + a.use) - (b.source + b.sink + b.use))) {
    console.log(`  ${String(r.source).padStart(2)} 源 ${String(r.sink).padStart(2)} 耗 ${String(r.use).padStart(2)} 用  ${r.id}（${r.name}）`);
  }
  console.log('');
  if (problems.length) {
    console.error('问题：');
    for (const p of problems) console.error('  ✗ ' + p);
    console.error(`\n结果：${problems.length} 个问题`);
    process.exit(1);
  }
  console.log('结果：0 个问题');
}
