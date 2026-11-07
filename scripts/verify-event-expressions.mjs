#!/usr/bin/env node
/**
 * verify-event-expressions.mjs —— 修仙线表达域核对（⑤ 表达）
 * ============================================================================
 *
 * 修仙这条路上有 **285 张决策卡**，2026-11-07 之前**一张都没进过表达域**
 * （经典线那 66 张早就在 `content/expressions/` 里了）。
 * ⇒ 玩家读到的全是「一句里塞三件事」的老写法（用户 2026-11-06 提的第 10 条）。
 *
 * 这道门禁守修仙线表达域的六件事：
 *
 *   1. **一条不漏** —— 285 张卡每张都要有说法（漏了 ⇒ 引擎退回规则层说法）。
 *   2. **提示语数对齐** —— 提示语条数必须和规则层的选项一样多（对不上 = 内容漏写）。
 *   3. **正文 ≤ 90 字** —— 复盘 §10 的判据：正文别再又长又挤。
 *   4. **分支数一致** —— 表达域的函数正文不许偷偷少说一句或多说一句。
 *   5. **专名双向** —— 不许发明规则层没有的专名；也不许把规则层有的专名丢掉
 *      （`prose()` 靠名字替换、`introduceText()` 靠别名加身份注解）。
 *   6. **逐值全等** —— 表达域输出与基线 `tests/fixtures/event-expressions.json` 一致。
 *
 * ⚠ **只对当前版本（规则十二）生效**：旧版本（5–11）走各自的事件表快照，
 *   那些快照一个字都不动（`verify-events-fidelity` 门禁盯着）。
 *
 * 退出码：0 = 全部通过；1 = 有硬伤。
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {EVENT_ROWS, makeReadableEvents} from '../content/expressions/events/index.js';
import {cardFacts} from './lib/text-numbers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'tests/fixtures/event-expressions.json');
/** 变更前基线：**规则层原文**（没经过表达域）的那一份。 */
const PRE_BASELINE = path.join(ROOT, 'tests/fixtures/event-expressions-pre-rewrite.json');
const VOCAB_FILE = path.join(ROOT, 'docs/expression-vocabulary.json');

/** 正文字数上限（复盘 §10）。 */
const MAX_TEXT = 90;

/**
 * `--write` = 重生成基线（**只在有意行为变更时用**）。
 * 不带这个参数 = 只比对（回归门禁走这条）。
 * ⚠ 重生成基线前必须先审差异 —— 见 `docs/refactor-divergence.json`。
 *
 * `--write-before` = 重生成**变更前**基线（规则层原文，未经表达域）。
 * ⚠ 两份基线必须用**同一批探针状态**生成，否则差异审查会把
 *   「探针变了」误当成「文案变了」⇒ 差异审查就废了。
 *   ⇒ 所以两份都由这个脚本生成，探针只此一份。
 */
const WRITE = process.argv.includes('--write');
const WRITE_BEFORE = process.argv.includes('--write-before');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}

console.log('修仙线表达域核对（285 张卡 · 一条不漏 · 说人话 · 不发明事实）\n');

const eventIds = Object.keys(CULTIVATION_EVENTS);
const rowIds = Object.keys(EVENT_ROWS);

/* ── 1. 一条不漏 / 没有多余 ─────────────────────────────────────────── */

const missing = eventIds.filter(id => !Object.hasOwn(EVENT_ROWS, id));
const extra = rowIds.filter(id => !Object.hasOwn(CULTIVATION_EVENTS, id));
ok(missing.length === 0, `修仙线 ${eventIds.length} 张卡都有说法（缺 ${missing.length} 条，多余 ${extra.length} 条）`);
for (const id of missing.slice(0, 12)) console.error(`      缺说法：${id}`);
if (missing.length > 12) console.error(`      …还有 ${missing.length - 12} 条`);
for (const id of extra) console.error(`      多余（规则层没有这张卡）：${id}`);

/* ── 2. 提示语数对齐 ─────────────────────────────────────────────────── */

const misaligned = [];
for (const id of eventIds) {
  const row = EVENT_ROWS[id];
  if (!row) continue;
  const node = CULTIVATION_EVENTS[id];
  if (!Array.isArray(row) || row.length !== 3) { misaligned.push(`${id}（形状不是三段）`); continue; }
  if (!Array.isArray(row[2]) || row[2].length !== node.choices.length) {
    misaligned.push(`${id}（提示语 ${row[2] ? row[2].length : '?'} 条 vs 选项 ${node.choices.length} 个）`);
  }
}
ok(misaligned.length === 0, `每张卡的提示语数量都对得上选项数（对不上 ${misaligned.length} 条）`);
for (const line of misaligned.slice(0, 12)) console.error(`      ${line}`);
if (misaligned.length > 12) console.error(`      …还有 ${misaligned.length - 12} 条`);

/* ── 3. 正文 ≤ 90 字（每个分支都要够短）───────────────────────────── */

/* 函数的每个分支都要量 ⇒ 用一批探针状态把函数跑起来，逐个分支量。
 * 探针状态刻意做得彼此不同（灵根不同、身份不同、在世的人不同），
 * 好让同一张卡的不同分支都被量到。 */
const PROBES = probeStates();
const tooLong = [];
for (const id of eventIds) {
  const row = EVENT_ROWS[id];
  if (!row) continue;
  const node = CULTIVATION_EVENTS[id];
  /*
   * ⚠⚠ **要用分支探针，不能只用三态探针**（2026-11-08 实测踩到）：
   *   三态探针里 `network.offer` 是空的 ⇒ `network_mentor` 只量到「安全」那一支
   *   ⇒ **危险那一支 129 字，门禁完全没看见**。
   *   ⇒ 长度判据跟分支判据用**同一批探针**（`branchProbes()`，12 份），
   *   每个分支都量一遍。
   */
  for (const s of branchProbes()) {
    const text = typeof row[1] === 'function' ? row[1](s) : row[1];
    if (typeof text !== 'string') { tooLong.push(`${id}（正文不是字符串）`); break; }
    if (text.length > MAX_TEXT) { tooLong.push(`${id}（${text.length} 字：${text.slice(0, 18)}…）`); break; }
  }
}
ok(tooLong.length === 0, `每张卡的正文都不超过 ${MAX_TEXT} 字（超的 ${tooLong.length} 条）`);
for (const line of tooLong.slice(0, 12)) console.error(`      ${line}`);
if (tooLong.length > 12) console.error(`      …还有 ${tooLong.length - 12} 条`);

/* ── 4. 分支数一致（不许偷偷少说一句 / 多说一句）───────────────────── */

/*
 * ⚠⚠ **判据怎么定才算「真」**（2026-11-08 改过一次）
 * ---------------------------------------------
 * 早先的判据是「数规则层原函数源码里的字符串字面量个数」⇒ **能被绕过**：
 * 改写者把句子拼进模板字符串（`` ` ``），引号就没了 ⇒ 分支数对不上却查不出来。
 * （实测：分片作者正是这么绕过去的。）
 *
 * ⇒ 改成**看行为**：在一组**刻意不同**的探针状态下，
 *   分别跑规则层的原函数与表达域的新函数，
 *   数「能说出几种不同的话」（不同取值的个数）。
 *   ⇒ 模板字符串藏不住分支：分支还在，就还能说出不同的话。
 *
 * ⚠ 探针状态要够多才测得准（分支多、差异细的卡尤其）。
 *   这里用 8 份：身份（orthodox / demonic / loose / beast / mortal）× 灵根 × 在世的人。
 */
const branchMismatch = [];
for (const id of eventIds) {
  const row = EVENT_ROWS[id];
  if (!row) continue;
  const node = CULTIVATION_EVENTS[id];
  const original = node.text;
  if (typeof original !== 'function') {
    /* 规则层本来就说死一句 ⇒ 表达域也不许变成按情形说话（多写分支就是编内容）。 */
    if (typeof row[1] === 'function') branchMismatch.push(`${id}（原来就一句话，现在按情形分了支）`);
    continue;
  }
  if (typeof row[1] !== 'function') { branchMismatch.push(`${id}（原来按情形说话，现在写死了）`); continue; }
  const before = distinctSayings(original, branchProbes());
  const after = distinctSayings(row[1], branchProbes());
  if (before !== after) branchMismatch.push(`${id}（能说出的说法 ${before} 种 → ${after} 种）`);
}
ok(branchMismatch.length === 0, `按情形说话的卡，能说出的说法种数与规则层一致（不一致 ${branchMismatch.length} 条）`);
for (const line of branchMismatch.slice(0, 12)) console.error(`      ${line}`);
if (branchMismatch.length > 12) console.error(`      …还有 ${branchMismatch.length - 12} 条`);

/* ── 5. 专名双向（不许发明，也不许丢）──────────────────────────────── */

/*
 * ⚠⚠ **判据怎么定才算「真」**（2026-11-08 实测改过一次）
 * --------------------------------------------------
 * 早先的判据是「把每句末尾 2–4 个汉字当人名」⇒ **假阳性满屏**：
 * 「守魂口诀」「锁在堂中」这种正常改写被当成「发明了专名」。
 * 根因：中文没法可靠地自动分词 —— 句尾的词组与专名长得一模一样。
 *
 * ⇒ 改成**两个可靠的方向**：
 *   ① **不许丢**（防漏）：词表里的专名 + 规则层同卡原文里出现过的**已知人名**
 *      （人名清单是人工维护的，见 `PEOPLE_TERMS`），
 *      表达域必须原样保留。
 *   ② **不许编**（防发明）：表达域里出现的专名，
 *      必须都在词表里 —— **或者** 在规则层**全部卡**的原文里出现过。
 *      ⇒ 「编一个新的人名」会被抓住（规则层从没出现过），
 *        而「换个说法」不会（句尾词组不算专名）。
 */
const vocab = fs.existsSync(VOCAB_FILE) ? JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8')) : {people: [], places: [], things: []};
const VOCAB_TERMS = [...(vocab.people || []), ...(vocab.places || []), ...(vocab.things || [])];

/** 已知人名（人工维护）：规则层里真正出现过的角色名与别名。 */
const PEOPLE_TERMS = [
  '闻竹', '程照雪', '沈砚', '嵇萝', '宋却', '白渡', '陶宁', '许执事', '严衡', '陆行舟',
  '顾魇', '白苓', '老猿', '山中老猿', '余衡', '宁素', '杜魁', '顾长老', '余掌柜', '阿栾',
  '幽灯堂主', '阿宁',
];

/**
 * 规则层**全部卡**的原文（用来判断某个词是不是「规则层早就有的」）。
 * ⚠ 标题 / 正文 / 提示语 / **回话（reply）** / **选项字面（label）** 全都要收 ——
 *   早先只收前三样 ⇒ 「顾长老」明明在回话里出现过却被判成「发明专名」。
 */
const RULE_BLOB = Object.values(CULTIVATION_EVENTS).map(node => {
  const parts = [typeof node.text === 'function' ? '' : String(node.text || ''), String(node.title || '')];
  for (const c of (node.choices || [])) {
    parts.push(typeof c.hint === 'function' ? '' : String(c.hint || ''));
    parts.push(typeof c.reply === 'function' ? '' : String(c.reply || ''));
    parts.push(typeof c.label === 'function' ? '' : String(c.label || ''));
  }
  return parts.join('\n');
}).join('\n');

const invented = [];
const dropped = [];
for (const id of eventIds) {
  const row = EVENT_ROWS[id];
  if (!row) continue;
  const node = CULTIVATION_EVENTS[id];
  const originalText = originalTextOf(node);
  const newText = typeof row[1] === 'function' ? row[1](PROBES[0]) : row[1];
  const newHints = (row[2] || []).map(h => (typeof h === 'function' ? h(PROBES[0]) : h)).join('');
  const newBlob = `${newText || ''}\n${newHints}`;
  const originalBlob = `${originalText}\n${(node.choices || []).map(c => (typeof c.hint === 'function' ? '' : c.hint)).join('')}`;

  /* ① 不许丢：原文里有的专名，表达域也得有。
   * ⚠ **地名要放行**：规则层用 `homeName(s)` 动态取出生地（青岚大陆 / 临潮大陆 …），
   *   那是**按玩家出生地变**的 ⇒ 表达域不许硬写某一个（写了就对别的出生地说错）。
   *   ⇒ 地名不参与「不许丢」的检查。
   */
  for (const t of [...PEOPLE_TERMS, ...(vocab.things || [])]) {
    if (originalBlob.includes(t) && !newBlob.includes(t)) { dropped.push(`${id}：${t}`); break; }
  }
  /* ② 不许编：表达域里的专名，必须词表里有，或规则层全部卡里出现过。 */
  for (const t of [...VOCAB_TERMS, ...PEOPLE_TERMS]) {
    if (newBlob.includes(t) && !VOCAB_TERMS.includes(t) && !RULE_BLOB.includes(t)) {
      invented.push(`${id}：${t}`);
      break;
    }
  }
}
ok(invented.length === 0, `表达域没有发明规则层没有的专名（发明了 ${invented.length} 处）`);
for (const line of invented.slice(0, 12)) console.error(`      ${line}`);
if (invented.length > 12) console.error(`      …还有 ${invented.length - 12} 处`);
ok(dropped.length === 0, `规则层有的专名表达域都留着（丢了 ${dropped.length} 处）`);
for (const line of dropped.slice(0, 12)) console.error(`      ${line}`);
if (dropped.length > 12) console.error(`      …还有 ${dropped.length - 12} 处`);

/* ── 6. 逐值全等（与基线一致）──────────────────────────────────────── */

const VARIANTS = ['v1', 'v2', 'v3'];
if (WRITE || WRITE_BEFORE) {
  /*
   * ⚠ `--write` 走**独立分支**、直接写完就退出 ——
   *   早先它排在断言之后 ⇒ 前面任何一条断言报红就永远走不到这儿，
   *   「写基线」这个动作反而被「检查」卡住（鸡生蛋问题）。
   * ⇒ 重生成基线是**独立动作**，不依赖其它断言是否通过。
   */
  const target = WRITE_BEFORE ? PRE_BASELINE : BASELINE;
  const source = WRITE_BEFORE ? CULTIVATION_EVENTS : makeReadableEvents(CULTIVATION_EVENTS);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, JSON.stringify(snapshot(source), null, 2) + '\n');
  console.log(`  ✓ 已重生成${WRITE_BEFORE ? '变更前（规则层原文）' : '变更后'}基线：`
    + `${path.relative(ROOT, target)}（${Object.keys(source).length} 条 × ${VARIANTS.length} 个状态）`);
  console.log('\n结果：已重生成基线（请接着跑 scripts/t7-diff.mjs 审差异）');
  process.exit(0);
}
if (!fs.existsSync(BASELINE)) {
  failures++;
  console.error(`  ✗ 缺少修仙线表达域基线：${path.relative(ROOT, BASELINE)}`);
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
      const ev = e[v];
      const av = a[v];
      if (!ev || !av) { diffs.push(`${id}/${v}：变体对不上`); continue; }
      if (ev.title !== av.title) diffs.push(`${id}/${v}：标题「${ev.title}」→ 「${av.title}」`);
      if (ev.text !== av.text) diffs.push(`${id}/${v}：正文变了（${String(ev.text).slice(0, 20)}… → ${String(av.text).slice(0, 20)}…）`);
      if (JSON.stringify(ev.hints) !== JSON.stringify(av.hints)) diffs.push(`${id}/${v}：选项提示语变了`);
    }
  }
  ok(diffs.length === 0, `表达域输出与基线逐值全等（${allIds.length} 条 × ${VARIANTS.length} 个状态，差异 ${diffs.length} 处）`);
  for (const line of diffs.slice(0, 20)) console.error(`      ${line}`);
  if (diffs.length > 20) console.error(`      …还有 ${diffs.length - 20} 处`);
}

/* ── 工具 ───────────────────────────────────────────────────────────── */

/** 规则层原正文（函数就取第一个探针状态下的结果）。 */
function originalTextOf(node) {
  if (typeof node.text === 'function') {
    for (const s of PROBES) {
      try { const t = node.text(s); if (typeof t === 'string' && t) return t; } catch { /* 探针状态不全，跳过 */ }
    }
    return '';
  }
  return String(node.text || '');
}

/**
 * 探针状态：一份人生切片的骨架。
 *   · 灵根 —— 触达灵根分支；
 *   · 身份（path）—— 触达师承分支；
 *   · 在世的人 —— 触达人物分支；
 *   · 境界（realm）—— 触达阶段分支。
 */
function probeStates() {
  const make = (root, path, people, extra) => ({
    player: {name: '陆青', root, realm: 1, focus: 'array', skills: {sword: 6, array: 6, alchemy: 6}, health: 90, mind: 65, insight: 30, courage: 30, empathy: 30, stones: 40, location: 'home', home: '望渡镇旧屋'},
    people: Object.fromEntries(Object.entries(people).map(([id, status]) => [id, {id, status, known: true, alive: status === 'alive', name: id, location: 'home'}])),
    flags: {}, world: {threat: '', survivors: 18, masterDeadline: null},
    month: 30, act: 1, seed: '松风有信',
    birth: {family: 'common', continent: 'home', startAge: 16, year: 471, upbringing: 'village', address: '望渡镇'},
    inventory: [], decisions: [], journal: [], pending: null, journey: null, result: null, ending: null, waiting: false,
    life: {
      family: {members: [{id: 'mother', name: '陆母', status: 'alive', location: 'home', relation: 'mother'}], money: 600, notes: [], messages: []},
      activity: '练剑', arc: null, crisis: {channel: 'letter', message: '山下的人还在等回信。', travel: 3},
      queue: null, expedition: null, expeditions: [], suspended: null,
      cultivation: {
        rulesVersion: 12, path, rank: '外门弟子', teacher: '陆行舟', context: 'home', offers: [],
        progress: 130, want: '筑基', body: {type: 'ordinary', damage: 0}, patron: {until: 40}, visit: null,
        exam: null, chains: {}, network: {method: {months: 24}, marks: {}, contacts: [], arc: null, offer: null, volume: null},
        progression: {names: {'阿宁': '阿宁', '许执事': '许执事'}, descendants: [], notes: [], parcels: [], notices: [], objects: {}, facts: {}},
        story10: {facts: {}, contacts: [], rootStatus: null},
        mundane: null, descendants: [], deathNews: [], knownDeaths: [], closed: [], history: [], v12: null,
      },
    },
    ...extra,
  });

  const base = make('松骨灵根', 'orthodox', {master: 'alive', sister: 'alive', friend: 'alive', ally: 'alive', rival: 'alive', keeper: 'alive', trialmate: 'alive'});
  const demonic = make('水木灵根', 'demonic', {master: 'dead', sister: 'alive', friend: 'missing', ally: 'dead', rival: 'alive', keeper: 'alive', trialmate: 'missing'});
  const mortal = make('三相灵根', 'mortal', {master: 'captured', sister: 'alive', friend: 'alive', ally: 'alive', rival: 'dead', keeper: 'dead', trialmate: 'dead'});
  /* 规则十二的字段（v12 / story10 / network）补齐，让判定函数能取到值。 */
  for (const s of [base, demonic, mortal]) fillCultivation(s);
  return [base, demonic, mortal];
}

/** 把规则十二 / 故事十 / 俗世 的字段补齐，让判定函数取得到值。 */
function fillCultivation(s) {
  s.life.cultivation.v12 = {
    body: {type: 'ordinary', damage: 0}, action: {kind: 'practice'}, facts: {trial: null, feud: null},
    sect: 'pine', patron: {until: 40}, visit: null, chains: {}, network: {marks: {}},
  };
  s.life.cultivation.story10 = {facts: {}, contacts: [], rootStatus: null};
  /* `echo` 那组回响卡的正文读 `r(s).echo.kind`（= `story10.echo.kind`）——
     少了这个字段，规则层那边在探针下就一条分支都测不出来。 */
  s.life.cultivation.story10.echo = {kind: 'friend', origin: 'home', status: 'message', sent: 10, due: 40, stage: 0};
  s.life.cultivation.network = {
    method: {months: 24}, marks: {}, contacts: [], arc: null,
    /* ⚠ 授业邀请要用**真实取值**（理由就是规则层那句原话）：
     *   少了它 ⇒ `network_mentor` 的正文开头是 "undefined"，
     *   基线里就存着一串 "undefined …"；而且长度判据量到的不是玩家真看到的字数。 */
    offer: {reason: '教习把你的表现写进了授业记录。', danger: false, due: 40, expires: 64},
    volume: null,
  };
  s.life.cultivation.mundane = {
    money: 600, home: '望渡镇', residence: '望渡镇', people: [], spouse: null, child: null,
    notes: [], arc: null, action: null, job: null, evidence: [], items: [], history: [],
  };
  /* ⚠⚠ **俗世生活线（`m11_*`）的正文有二十来张是「按状态说话」的**
   *   —— 谁跟你一起交货、死者是不是被害弟子、家人还在不在、有没有留下旧债……
   *   它们读的是 `s.life.cultivation.mundane`（规则层 `mundane(s)` 取的就是它）。
   *   少了 people / corpse / spouse / child 这些字段 ⇒ 规则层那边读到就崩
   *   ⇒ 算出「0 种说法」⇒ 门禁把**写得对的表达域**误判成「多说了」。
   *   ⇒ 探针里必须放一份**真的像那么回事**的俗世状态（见 `mundaneVariants()`）。 */
  s.life.cultivation.mundane = mundaneVariants()[0];
  /* ⚠ 下面这些字段也是函数正文要读的 —— 少了它们，规则层那边会算出「0 种说法」，
     门禁就会把**正确的表达域**误判成「多说了」。 */
  s.life.cultivation.mail = {sent: 10, sentAge: 30, due: 40, body: '家里问你好不好。', delayed: false};
  s.life.cultivation.exam = {skill: 'sword', deadline: 60, preparation: 12, passed: false};
  s.life.cultivation.wanted = {reason: '有人追查你的来历。', month: 30};
  s.life.cultivation.chains = {};
  /* 修订九那条线要的字段（`revision9-stories.js` 里 `c.revision9.membership`）。 */
  s.life.cultivation.revision9 = {membership: {kind: 'none', since: 0, rights: []}, flags: {}, notes: []};
}

/**
 * 俗世生活线的四份状态切片（`s.life.cultivation.mundane`）。
 *
 * ⚠ 为什么单独写一份
 * ------------------
 * 修仙线末尾那段「不再做修士的日子」有二十来张卡的正文是**按状态说话**的：
 * 谁跟你一起交货（worker 的名字与身份）、死者是不是被害弟子（corpse.taken/trace/truth）、
 * 家人还在不在（spouse/child）、有没有留下旧债（debt）……
 * 规则层那边读的是 `mundane(s)`，也就是 `s.life.cultivation.mundane`。
 * 探针里少了这些字段 ⇒ 规则层读到就崩 ⇒ 算出「0 种说法」
 * ⇒ 门禁会把**写得对的表达域**误判成「多说了」（实测踩过 5 次）。
 *
 * 四份切片刻意把每个分支点都拉开：
 *   · worker 的名字与身份（四种）        → 交货 / 成家那两张卡
 *   · corpse.taken / trace / truth        → 河滩旧物那三张卡
 *   · spouse / child 在不在、在不在世    → 成家 / 孩子那几张卡
 *   · notes（凭据 / 旧事标记）            → 有没有证据、有没有躲过追查
 *   · job（外院 / 药铺 / 田户 / 商队）    → 带新人那段话
 */
var MUNDANE_VARIANTS = null;
function mundaneVariants() {
  if (MUNDANE_VARIANTS) return MUNDANE_VARIANTS;
  const mk = (cfg) => ({
    format: 1, started: true, job: cfg.job, home: 'home', money: 240, grain: 4,
    debt: cfg.debt, earned: 0, spent: 0, workMonths: 24, trust: 1, stage: 1,
    next: 0, quietAt: 0, lastVisible: 0, cycle: 0, daily: [], done: [], arc: null, action: null,
    people: [
      {id: 'employer', name: cfg.names[0], role: cfg.roles[0], status: 'alive', known: true},
      {id: 'worker', name: cfg.names[1], role: cfg.roles[1], status: 'alive', known: true},
      {id: 'boatman', name: cfg.names[2], role: cfg.roles[2], status: 'alive', known: true},
      {id: 'healer', name: cfg.names[3], role: cfg.roles[3], status: 'alive', known: true},
    ],
    spouse: cfg.spouse ? {id: 'spouse', name: '沈氏', status: cfg.spouse, known: true} : null,
    child: cfg.child ? {id: 'child', name: '小满', status: cfg.child, root: cfg.childRoot || null, known: true} : null,
    lifeOrder: [], local: {place: 'home', regime: 0, kind: null, until: 0, tax: 0, history: []},
    corpse: cfg.corpse ? {taken: cfg.corpse.taken, trace: cfg.corpse.trace, truth: cfg.corpse.truth} : null,
    gift: null, ledger: null, notes: cfg.notes.slice(), assets: [], lastChoice: 0,
  });
  MUNDANE_VARIANTS = [
    mk({
      job: 'shop', debt: 0,
      names: ['周掌柜', '阿宁', '老船工', '苏大夫'],
      roles: ['药铺师傅', '同住的伙计', '运药船工', '游方修士，懂残缺植灵法'],
      spouse: 'alive', child: 'alive', childRoot: '杂灵根',
      corpse: {taken: false, trace: false, truth: 1}, notes: [],
    }),
    mk({
      job: 'carrier', debt: 120,
      names: ['沈掌柜', '陆行舟', '何老', '林大夫'],
      roles: ['商队管事', '同队脚夫', '摆渡老人', '行医修士'],
      spouse: 'alive', child: 'alive', childRoot: '杂灵根',
      corpse: {taken: true, trace: true, truth: 1}, notes: ['cargo-evidence', 'worker-betrayed'],
    }),
    mk({
      job: 'farm', debt: 0,
      names: ['崔掌柜', '余衡', '石翁', '钟大夫'],
      roles: ['田主', '邻田农户', '撑船老手', '游方修士'],
      spouse: 'dead', child: 'missing', childRoot: null,
      corpse: {taken: false, trace: false, truth: 0}, notes: ['corpse-evacuated'],
    }),
    mk({
      job: 'yard', debt: 48,
      names: ['郑掌柜', '何九', '江伯', '苏大夫'],
      roles: ['外院管事', '同住杂役', '河上船家', '游方修士，懂残缺植灵法'],
      spouse: 'dead', child: 'dead', childRoot: null,
      corpse: {taken: false, trace: true, truth: 0},
      notes: ['corpse-evacuated', 'corpse-protected', 'sluice-witness', 'neighbour-betrayed', 'false-medicine'],
    }),
  ];
  return MUNDANE_VARIANTS;
}

/**
 * 分支探针状态：八份刻意不同的人生切片。
 * ⚠ **用 `var` 而不是 `let`**：第 4 条判据在文件前面（131 行）就要用它，
 *   而声明在后面 ⇒ `let`/`const` 会撞上 TDZ（`ReferenceError`）——
 *   这是这个脚本里第三次踩同一个坑（见 STOPWORDS、BRANCH_PROBES）。
 *   `var` 是函数级提升，没有 TDZ。
 */
var BRANCH_PROBES = null;
function branchProbes() {
  if (!BRANCH_PROBES) BRANCH_PROBES = buildBranchProbes();
  return BRANCH_PROBES;
}

/**
 * 分支探针：八份刻意不同的人生切片。
 * ⚠ 这份是给「能说出的说法种数」用的 —— 状态要够杂，分支才测得准。
 *   · 身份五种（orthodox / demonic / loose / beast / mortal）
 *   · 灵根四种（金 / 木 / 水 / 无）
 *   · 在世的人三种（都在 / 都死 / 失踪）
 *   · 境界三种（炼气 / 筑基 / 金丹）
 */
function buildBranchProbes() {
  const allAlive = {master: 'alive', sister: 'alive', friend: 'alive', ally: 'alive', rival: 'alive', keeper: 'alive', trialmate: 'alive'};
  const allDead = {master: 'dead', sister: 'dead', friend: 'dead', ally: 'dead', rival: 'dead', keeper: 'dead', trialmate: 'dead'};
  const allMissing = {master: 'captured', sister: 'missing', friend: 'missing', ally: 'missing', rival: 'missing', keeper: 'missing', trialmate: 'missing'};

  const mk = (root, path, people, realm, family, tweak) => {
    const s = probeStates()[0];
    s.player.root = root;
    s.player.realm = realm;
    s.life.cultivation.path = path;
    s.people = Object.fromEntries(Object.entries(people).map(([id, status]) => [id, {id, status, known: true, alive: status === 'alive', name: id, location: 'home'}]));
    s.life.family.members = family === 'none' ? [] : [{id: 'mother', name: '陆母', status: 'alive', location: 'home', relation: 'mother'}];
    fillCultivation(s);
    if (tweak) tweak(s);
    return s;
  };

  const delay = (s) => { s.life.cultivation.mail.delayed = true; s.life.cultivation.mail.sentAge = 12; };
  const withOffer = (s) => {
    s.life.cultivation.network.offer = {reason: '教习把你的表现写进了授业记录。', danger: true, due: 40, expires: 64};
    s.life.cultivation.network.arc = {danger: true, rash: true};
  };
  const withMarks = (s) => {
    s.life.cultivation.network.marks = {sold_page: true, old_page: true, friend_witness: true, teacher_notes: true};
    s.life.cultivation.story10.facts = {feud: {a: 'x'}, trial: {b: 'y'}};
  };
  /* 回响那组卡的正文读 `story10.echo.kind`（friend / relic / teacher）——
     探针要能拉开这三支，否则分支数测不准。 */
  const echoKind = (kind) => (s) => { s.life.cultivation.story10.echo.kind = kind; };

  const probes = [
    mk('松骨灵根', 'orthodox', allAlive, 0, 'yes'),
    mk('水木灵根', 'demonic', allDead, 1, 'yes', delay),
    mk('金火灵根', 'loose', allMissing, 2, 'yes'),
    mk('未显灵根', 'beast', allAlive, 3, 'none'),
    mk('三相灵根', 'mortal', allDead, 0, 'none'),
    mk('五行杂灵根', 'orthodox', allMissing, 1, 'yes', withOffer),
    mk('松骨灵根', 'loose', allAlive, 2, 'yes', withMarks),
    mk('未显灵根', 'demonic', allAlive, 1, 'none', withOffer),
    /* 再加四份：专门把 echo.kind 的三支与 marks 的两支拉开。 */
    mk('松骨灵根', 'orthodox', allAlive, 1, 'yes', echoKind('friend')),
    mk('水木灵根', 'orthodox', allAlive, 1, 'yes', echoKind('relic')),
    mk('金火灵根', 'orthodox', allAlive, 1, 'yes', echoKind('teacher')),
    mk('三相灵根', 'loose', allAlive, 1, 'yes', (s) => {
      s.life.cultivation.network.marks = {friend_witness: true};
      s.life.cultivation.story10.echo.kind = 'friend';
    }),
  ];
  /* ⚠ 俗世生活线的四份状态切片，四份探针一组地铺开
   *   （每份探针都带 ⇒ 规则层与表达域看到的是同一批状态 ⇒ 种数可比）。
   *   复制一份再挂上去，避免两边共用同一个对象被改出状态。 */
  const variants = mundaneVariants();
  for (let i = 0; i < probes.length; i++) {
    probes[i].life.cultivation.mundane = JSON.parse(JSON.stringify(variants[i % variants.length]));
  }
  return probes;
}

/** 数一个函数源码里的字符串字面量个数（**已不用**，留着备查）。 */
function countLiterals(source) {
  const stripped = source.replace(/`[^`]*`/g, '``');
  return (stripped.match(/'[^']*'/g) || []).length + (stripped.match(/"[^"]*"/g) || []).length;
}

/**
 * 在一组探针状态下，这个函数能说出**几种不同的话**。
 * ⚠ 判据只看「行为」⇒ 模板字符串藏不住分支（分支还在，就还能说出不同的话）。
 */
function distinctSayings(fn, probes) {
  const seen = new Set();
  for (const s of probes) {
    try {
      const out = fn(s);
      if (typeof out === 'string') seen.add(out);
    } catch {
      /* 探针状态不全 ⇒ 这份跳过（不算一种说法） */
    }
  }
  return seen.size;
}

/**
 * 分支探针状态：八份刻意不同的人生切片。
 *   · 身份：orthodox / demonic / loose / beast / mortal（触达师承分支）
 *   · 灵根：金 / 木 / 水 / 无（触达灵根分支）
 *   · 在世的人：师尊在世 / 已死 / 失踪，同伴在世 / 已死 / 失踪
 *   · 境界：炼气 / 筑基 / 金丹（触达阶段分支）
 */

/** 文本里出现的专名（总表词 + 规则层原文里像人名的中文串）。 */
function termsIn(blob) {
  const found = new Set();
  const text = String(blob || '');
  for (const term of VOCAB_TERMS) if (text.includes(term)) found.add(term);
  /* 人名：两到四字中文，后面接标点或结尾 —— 粗粒度，宁可多算。 */
  for (const m of text.matchAll(/[一-龥]{2,4}(?=[，。！？：；、」』）\s]|$)/g)) {
    const w = m[0];
    if (w.length >= 2 && w.length <= 4 && !stopwords().has(w)) found.add(w);
  }
  return found;
}

/** 常用词不算专名（否则「什么」「一个」全被当人名，门禁会满屏噪声）。 */
let STOPWORDS = null;
/**
 * 懒加载：第一次用到才建这个表。
 * ⚠ 早先写成顶层 `const`，而 `termsIn()` 在它之前被调用 ⇒
 *   任何分片一有内容就抛 `ReferenceError`（TDZ）⇒ **门禁自己崩了**。
 *   ⇒ 改成函数 + 惰性初始化，调用顺序不再有坑。
 */
function stopwords() {
  if (STOPWORDS) return STOPWORDS;
  STOPWORDS = new Set([
  '什么', '一个', '这样', '那样', '于是', '然后', '但是', '所以', '因为', '如果', '或者', '还是', '已经', '可以', '不会', '不能', '没有', '现在', '当时', '之后', '之前', '以后', '以前', '这里', '那里', '东西', '事情', '自己', '他们', '她们', '我们', '你们', '这个', '那个', '怎么', '为什么', '不是', '就是', '只是', '不过', '而且', '一直', '忽然', '终于', '接着', '随后', '这时', '那时', '当年', '如今', '从前', '以后', '下来', '出来', '进去', '过去', '起来', '上来', '有人', '没人', '有些', '一起', '一切', '两种', '三个', '一句', '一段', '一行', '一条', '一件', '一年', '一天', '一次', '第一', '第二', '第三', '第四', '第五', '更多', '更少', '最好', '最先', '最后', '刚才', '方才', '正在', '将要', '应该', '必须', '需要', '可能', '也许', '大概', '几乎', '常常', '经常', '偶尔', '总是', '一直', '从没', '尚未', '已经', '即将', '这条', '那张', '那种', '这种', '多少', '几个', '几时', '哪一', '哪个', '有人', '它们', '此人', '对方', '彼此', '其中', '其中', '此外', '另外', '以及', '或者', '无论', '不管', '即使', '哪怕', '只要', '只有', '除非', '一旦', '既然', '假如', '倘若', '与其', '不如', '宁可', '情愿', '只好', '只能', '没法', '不至于', '未必', '不曾', '并非', '绝不', '根本', '简直', '几乎', '恰恰', '正好', '刚好', '偏偏', '果然', '居然', '竟然', '原来', '后来', '当初', '当时', '从此', '向来', '一向', '素来', '历来', '素', '另', '另有一', '另有', '首先', '其次', '再次', '最后', '末了', '最终', '终于', '终究', '毕竟', '到底', '索性', '干脆', '何况', '况且', '更', '更兼', '乃至', '甚至', '甚而', '险些', '几乎', '差点', '稍稍', '略微', '略略', '颇', '颇为', '甚', '很', '非常', '十分', '格外', '尤其', '特别', '异常', '极', '极其', '过于', '过分', '相当', '万分', '无比', '至极',
  ]);
  return STOPWORDS;
}

/**
 * 基线快照：三份探针状态下的标题 / 正文 / 提示语 **+ 规则层这张卡的事实数字**。
 * ⚠ **求值要容错**：探针状态不可能覆盖规则层所有字段（实测踩到 `revision9.membership`、
 *   `exam.taken` 等），一缺就抛错 ⇒ 整个基线生成崩掉。
 *   ⇒ 抛错时记成 `null`（那一格没测出来），别让一格毁掉整份基线。
 *
 * ⚠ **`facts` 永远从规则层取**（不看当前那张卡长什么样）——
 *   它是「这条卡本来就知道哪些数」，用来判「表达域有没有编数字」。
 *   若从当前卡取 ⇒ 表达域写什么就等于「什么算数」⇒ 判据作废。
 */
function snapshot(source) {
  const readable = source || makeReadableEvents(CULTIVATION_EVENTS);
  const out = {};
  for (const id of Object.keys(readable).sort()) {
    const node = readable[id];
    const facts = cardFacts(CULTIVATION_EVENTS[id]);
    const perVariant = {};
    for (const [i, s] of PROBES.entries()) {
      let text = null;
      try {
        text = typeof node.text === 'function' ? node.text(s) : node.text;
      } catch {
        text = null;
      }
      perVariant[`v${i + 1}`] = {
        title: node.title,
        text: text === undefined ? null : text,
        hints: (node.choices || []).map(c => {
          if (typeof c.hint !== 'function') return c.hint;
          try { return c.hint(s); } catch { return null; }
        }),
        facts,
      };
    }
    out[id] = perVariant;
  }
  return out;
}

if (failures) {
  console.error(`\n${failures} 处硬伤。`);
  process.exit(1);
}
console.log('\n结果：0 个问题');
