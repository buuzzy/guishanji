#!/usr/bin/env node
/**
 * verify-expressions.mjs —— 表达域核对（⑤ 表达）
 * ============================================================================
 *
 * 表达域回答「这件事**怎么说**」。这道门禁守四件事：
 *
 *   1. **不许留 'pending'** —— 正式内容里不许有「这句话还没定稿」的事件。
 *      （`voice` 是表达成熟度位：'inline' = 已定稿，'pending' = 还没定稿。）
 *   2. **不许有孤儿** —— 表达域里的每个 id 都得在节点表里真实存在。
 *      少了就说明这条内容线被删了/改 id 了，而表达域还留着。
 *   3. **不许漏** —— 节点表里的每个 id 都得有表达域条目，
 *      而且**选项提示语的数量要和规则层给的选项一样多**（对不上就是内容漏写）。
 *   4. **不许悄悄改词** —— 表达域的输出（标题 / 正文 / 选项提示语）
 *      与基线 `tests/fixtures/expressions.json` **逐值全等**。
 *      搬迁是一次纯重构 ⇒ 一个字都不该变；真要改词，先改基线并说明理由。
 *
 * 另有一条**警告级**的检查（第 5 条）：表达域里出现、而规则层里从没出现过的三字组合
 * ⇒ 列进 `docs/expression-vocabulary-review.md` 供人工复核。
 *   这条**不报红** —— 中文没法可靠地自动分词，硬报红只会逼人绕过门禁。
 *   纪律不放弃，只是把机器判定换成人工判定（见 docs/结构章程.md）。
 *
 * 退出码：0 = 全部通过；1 = 有硬伤。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {NODES} from '../content/adventure.js';
import {EPISODES} from '../content/living-episodes.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {ROWS, DYNAMIC, makeReadable} from '../content/expressions/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'tests/fixtures/expressions.json');
const REVIEW = path.join(ROOT, 'docs/expression-vocabulary-review.md');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}

console.log('表达域核对（说法归表达域 · 不许留未定稿 · 不许有孤儿）\n');

/* ── 1. 不许留 'pending' ─────────────────────────────────────────────── */

const pending = Object.entries(CULTIVATION_EVENTS)
  .filter(([, node]) => node && node.voice === 'pending')
  .map(([id]) => id);
const noVoice = Object.entries(CULTIVATION_EVENTS)
  .filter(([, node]) => node && !node.voice)
  .map(([id]) => id);
ok(pending.length === 0, `正式内容里没有 voice:'pending' 的事件（当前 ${Object.keys(CULTIVATION_EVENTS).length} 条，待定 ${pending.length} 条）`);
if (pending.length) for (const id of pending) console.error(`      待定：${id}`);
ok(noVoice.length === 0, `每个事件条目都带 voice（缺 ${noVoice.length} 条）`);
if (noVoice.length) for (const id of noVoice.slice(0, 10)) console.error(`      缺 voice：${id}`);

/* ── 2 & 3. 孤儿 / 漏写 / 选项数对齐 ──────────────────────────────────── */

const nodeTable = {...NODES, ...EPISODES};
const nodeIds = Object.keys(nodeTable);
const exprIds = Object.keys(ROWS);

const orphans = exprIds.filter(id => !Object.hasOwn(nodeTable, id));
const missing = nodeIds.filter(id => !Object.hasOwn(ROWS, id));
ok(orphans.length === 0, `表达域里没有孤儿 id（${exprIds.length} 条，多余 ${orphans.length} 条）`);
for (const id of orphans) console.error(`      孤儿（节点表里没有）：${id}`);
ok(missing.length === 0, `节点表里的每条都有说法（${nodeIds.length} 条，缺 ${missing.length} 条）`);
for (const id of missing) console.error(`      缺说法：${id}`);

const misaligned = [];
for (const id of exprIds) {
  const row = ROWS[id];
  const node = nodeTable[id];
  if (!node) continue;
  if (!Array.isArray(row) || row.length !== 3) { misaligned.push(`${id}（形状不是三段）`); continue; }
  if (!Array.isArray(row[2]) || row[2].length !== node.choices.length) {
    misaligned.push(`${id}（提示语 ${row[2] && row[2].length} 条 vs 选项 ${node.choices.length} 个）`);
  }
}
ok(misaligned.length === 0, `每个说法的选项提示语数量都对得上（对不上 ${misaligned.length} 条）`);
for (const line of misaligned) console.error(`      ${line}`);

/* ── 3b. 分片之间不许有重复 id（汇总时后者会悄悄盖掉前者）────────────── */

const EXPR_DIR = path.join(ROOT, 'content/expressions');
const shardFiles = fs.readdirSync(EXPR_DIR)
  .filter(f => f.endsWith('.js') && f !== 'index.js' && f !== 'people.js')
  .sort();
const seen = new Map();
const dupIds = [];
for (const file of shardFiles) {
  const src = fs.readFileSync(path.join(EXPR_DIR, file), 'utf8');
  for (const m of src.matchAll(/^ {2}'?([A-Za-z0-9_]+)'?: \[/gm)) {
    const id = m[1];
    if (seen.has(id)) dupIds.push(`${id}（${seen.get(id)} 与 ${file}）`);
    else seen.set(id, file);
  }
}
ok(dupIds.length === 0, `各故事线分片之间没有重复 id（分片 ${shardFiles.length} 个，重复 ${dupIds.length} 处）`);
for (const line of dupIds) console.error(`      ${line}`);

/* ── 4. 输出逐值全等（与搬迁前的基线）────────────────────────────────── */

/* ⚠ 这三个状态变体与生成基线时用的完全一样（见 tests/fixtures/expressions.json）。
 *   变体覆盖了「按当时情形现写」的分支（闻竹三种下落、嵇萝两种、陶宁三种…）。 */
const VARIANTS = [
  {
    name: 'v1',
    people: {master:'captured', sister:'alive', friend:'alive', ally:'alive', rival:'alive', keeper:'alive', trialmate:'missing'},
    flags: {mercy:false, sectLost:false},
    world: {masterDeadline:null}, month: 12, birth: {family:'clan'}, inventory: [],
  },
  {
    name: 'v2',
    people: {master:'dead', sister:'alive', friend:'alive', ally:'dead', rival:'alive', keeper:'alive', trialmate:'dead'},
    flags: {mercy:true, sectLost:true},
    world: {masterDeadline:100}, month: 50, birth: {family:'noble'}, inventory: ['mirror_heart','ember_engine'],
  },
  {
    name: 'v3',
    people: {master:'alive', sister:'alive', friend:'alive', ally:'alive', rival:'alive', keeper:'alive', trialmate:'alive'},
    flags: {mercy:true, sectLost:false},
    world: {masterDeadline:0}, month: 0, birth: {family:'mortal'}, inventory: [],
  },
];
const stateOf = (v) => {
  const people = {};
  for (const [k, status] of Object.entries(v.people)) people[k] = {status};
  return {
    people, flags: {...v.flags}, world: {...v.world}, month: v.month,
    birth: {...v.birth}, inventory: [...v.inventory],
    life: {
      crisis: {channel: v.crisisChannel, message: '山下的人还在等回信。', travel: 3},
      activity: '练剑', arc: null,
      cultivation: {path: 'orthodox', rank: '内门'},
      goal: 'free',
    },
  };
};

function snapshot() {
  const readable = makeReadable({...NODES, ...EPISODES});
  const out = {};
  for (const id of Object.keys(readable).sort()) {
    const node = readable[id];
    const perVariant = {};
    for (const v of VARIANTS) {
      const s = stateOf(v);
      const text = typeof node.text === 'function' ? node.text(s) : node.text;
      perVariant[v.name] = {
        title: node.title,
        text: text === undefined ? null : text,
        hints: node.choices.map(c => (c.hint === undefined ? null : c.hint)),
      };
    }
    out[id] = perVariant;
  }
  return out;
}

if (!fs.existsSync(BASELINE)) {
  failures++;
  console.error(`  ✗ 缺少表达域基线：${path.relative(ROOT, BASELINE)}`);
} else {
  const expected = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const actual = snapshot();
  const diffs = [];
  const allIds = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  for (const id of allIds) {
    const e = expected[id];
    const a = actual[id];
    if (!e) { diffs.push(`${id}：基线里没有，现在多出来了`); continue; }
    if (!a) { diffs.push(`${id}：现在没有了，基线里有`); continue; }
    for (const v of VARIANTS) {
      const ev = e[v.name];
      const av = a[v.name];
      if (!ev || !av) { diffs.push(`${id}/${v.name}：变体对不上`); continue; }
      if (ev.title !== av.title) diffs.push(`${id}/${v.name}：标题「${ev.title}」→ 「${av.title}」`);
      if (ev.text !== av.text) diffs.push(`${id}/${v.name}：正文变了（${String(ev.text).slice(0, 24)}… → ${String(av.text).slice(0, 24)}…）`);
      if (JSON.stringify(ev.hints) !== JSON.stringify(av.hints)) diffs.push(`${id}/${v.name}：选项提示语变了`);
    }
  }
  ok(diffs.length === 0, `表达域输出与基线逐值全等（${allIds.length} 条 × ${VARIANTS.length} 个状态，差异 ${diffs.length} 处）`);
  for (const line of diffs.slice(0, 20)) console.error(`      ${line}`);
  if (diffs.length > 20) console.error(`      …还有 ${diffs.length - 20} 处`);
}

/* ── 6. 专有名词总表：表达域不许发明内容 ─────────────────────────────── */

/* 词表：人工维护（docs/expression-vocabulary.json）。
 * ⚠ 为什么是人工的：中文没法可靠地自动分词 —— 试过「三字滑窗」「专名后缀」
 *   几种口径，噪声都在两千条以上（正常改写也会产生大量没见过的三字组合）
 *   ⇒ 硬报红只会逼人绕过门禁。改成「人工建一次词表 + 机器双向核对」。 */
const VOCAB_FILE = path.join(ROOT, 'docs/expression-vocabulary.json');
if (!fs.existsSync(VOCAB_FILE)) {
  failures++;
  console.error(`  ✗ 缺少专有名词总表：${path.relative(ROOT, VOCAB_FILE)}`);
} else {
  const vocab = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
  const terms = [...(vocab.people || []), ...(vocab.places || []), ...(vocab.things || [])];

  /* 规则层文本：content/ 下所有内容文件里的中文字符串（不含表达域自己）。
   * ⚠ 这是「内容层」的全量文字 —— 专名必须在这里真实出现过。 */
  const contentDir = path.join(ROOT, 'content');
  let ruleBlob = '';
  for (const file of fs.readdirSync(contentDir).sort()) {
    if (!file.endsWith('.js')) continue;
    if (file === 'readable-stories.js') continue;
    if (file.startsWith('expressions')) continue;
    ruleBlob += fs.readFileSync(path.join(contentDir, file), 'utf8');
  }

  /* 表达域文本：正文 + 选项提示语 + 人物背景。 */
  const exprBlob = (() => {
    let blob = '';
    for (const row of Object.values(ROWS)) {
      if (typeof row[1] === 'string') blob += row[1];
      for (const hint of (row[2] || [])) if (typeof hint === 'string') blob += hint;
    }
    blob += fs.readFileSync(path.join(contentDir, 'expressions/people.js'), 'utf8');
    return blob;
  })();

  /* 断言 A：表里的每个词都必须在规则层真实存在。
   *   只有表达域认识、规则层不认识的词 ⇒ 表达域在发明内容 ⇒ 报红。
   * ⚠ 已知的例外登记在 knownDifferences 里（写清为什么、什么时候消）——
   *   和边界门禁的「许可证」一个路子：不沉默，但也不逼人硬改。 */
  const known = new Map((vocab.knownDifferences || []).map(d => [d.term, d]));
  const invented = terms.filter(t => !ruleBlob.includes(t) && !known.has(t));
  ok(invented.length === 0, `专有名词总表里的 ${terms.length} 个词都在规则层真实存在（只活在表达域的 ${invented.length} 个，已登记例外 ${terms.filter(t => !ruleBlob.includes(t) && known.has(t)).length} 个）`);
  for (const t of invented) console.error(`      只在表达域里出现：${t}`);

  /* 断言 B：表里的每个词都要被用上（不许发霉）。
   *   删了规则层里的一个专名、忘了从表里删 ⇒ 表就过期了 ⇒ 报红。 */
  const unused = terms.filter(t => !ruleBlob.includes(t) && !exprBlob.includes(t) && !known.has(t));
  ok(unused.length === 0, `专有名词总表里没有发霉的条目（完全没人用的 ${unused.length} 个）`);
  for (const t of unused) console.error(`      没人用：${t}`);

  /* 警告级：登记在案的老不一致，提醒人哪天把它消掉。 */
  for (const d of (vocab.knownDifferences || [])) {
    console.log(`  ⚠ 已知差异（已登记，不报红）：${d.term} —— ${d.why}`);
  }

  /* 警告级：表里登记了、但表达域一次都没用到的词（多半是别的故事线用的，或过期登记）。 */
  const notInExpr = terms.filter(t => !exprBlob.includes(t) && ruleBlob.includes(t));
  if (notInExpr.length) {
    console.log(`  ⚠ 警告级：总表里有 ${notInExpr.length} 个词表达域一次都没用（多半是修仙线的人名地名，确认是不是过期登记）`);
  }
}

if (failures) {
  console.error(`\n${failures} 处硬伤。`);
  process.exit(1);
}
console.log('\n结果：0 个问题');
