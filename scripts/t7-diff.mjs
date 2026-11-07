#!/usr/bin/env node
/**
 * t7-diff.mjs —— T7 差异审查（**有意行为变更专用**）
 * ============================================================================
 *
 * ## 这道脚本干什么
 * ----------------
 * T7 是**有意行为变更**：修仙线 285 张卡的标题 / 正文 / 选项提示语全部重写。
 * AGENTS.md 要求这种阶段必须留三份东西：
 *   ① 变更前基线  ② 差异审查记录  ③ 变更后基线
 *
 * 本脚本就是②的机器部分：把「变更前」的基线与「变更后」的比对结果打出来，
 * 让人能**逐条看过**再签字 —— 而不是「跑一遍没报错」就算过。
 *
 * ## 它守什么
 * ----------
 *   1. **事实不许变**：正文里的数字（期限、代价、数量）与变更前必须一致。
 *      ⇒ 说法可以变，「三年」不能变成「五年」。
 *   2. **一条不许少**：285 张卡一张都不许消失。
 *   3. **选项数不许变**：每张卡的选项个数不许变。
 *   4. **专名不许丢**：变更前出现的人名地名物件名，变更后还得在。
 *   5. **变化幅度**：报出每张卡「改了多少字」，方便抽查改得最狠的几张。
 *
 * 用法：
 *   node scripts/t7-diff.mjs --before=<变更前基线.json> [--after=<变更后基线.json>]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {numberValues, sameNumbers} from './lib/text-numbers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const beforePath = argValue('--before');
const afterPath = argValue('--after') || path.join(ROOT, 'tests/fixtures/event-expressions.json');

if (!beforePath) {
  console.error('用法：node scripts/t7-diff.mjs --before=<变更前基线.json> [--after=<变更后基线.json>]');
  process.exit(2);
}

function argValue(flag) {
  const hit = args.find(a => a.startsWith(flag + '='));
  return hit ? hit.slice(flag.length + 1) : null;
}

var VOCAB = ['闻竹', '程照雪', '沈砚', '嵇萝', '宋却', '白渡', '陶宁', '许执事', '严衡', '陆行舟', '青岚大陆', '临潮大陆', '烬原大陆', '浮屿界', '渡云山', '望渡镇', '听潮港', '流沙驿', '悬桥书院', '浮屿书院', '临潮港', '炉城', '沉星洞府', '回风谷', '镜火盟', '藏经阁', '钟楼', '药圃', '练剑场', '筑基丹', '归山阵图', '药师行囊', '护身玉符', '引雨石', '月白矿', '定魂珠', '炉心', '地火炉心', '界心', '沉星钥', '界门锚', '浮屿天图', '回风灵种', '养魂莲', '传音符', '留声玉', '旧信', '顾魇', '白苓', '老猿', '山中老猿', '余衡', '宁素', '杜魁', '顾长老', '余掌柜', '阿栾', '幽灯堂主', '阿宁'];

var STOP = new Set([
  '什么', '一个', '这样', '那样', '于是', '然后', '但是', '所以', '因为', '如果', '或者', '还是', '已经', '可以', '不会', '不能', '没有', '现在', '当时', '之后', '之前', '以后', '以前', '这里', '那里', '东西', '事情', '自己', '他们', '她们', '我们', '你们', '这个', '那个', '怎么', '为什么', '不是', '就是', '只是', '不过', '而且', '一直', '忽然', '终于', '接着', '随后', '这时', '那时', '当年', '如今', '从前', '下来', '出来', '进去', '过去', '起来', '上来', '有人', '没人', '有些', '一起', '一切', '两种', '三个', '一句', '一段', '一行', '一条', '一件', '一年', '一天', '一次', '第一', '第二', '第三', '第四', '第五', '更多', '更少', '最好', '最先', '最后', '刚才', '方才', '正在', '将要', '应该', '必须', '需要', '可能', '也许', '大概', '几乎', '常常', '经常', '偶尔', '总是', '从没', '尚未', '即将', '这条', '那张', '那种', '这种', '多少', '几个', '几时', '哪一', '哪个', '它们', '此人', '对方', '彼此', '其中', '此外', '另外', '以及', '无论', '不管', '即使', '哪怕', '只要', '只有', '除非', '一旦', '既然', '假如', '与其', '不如', '宁可', '情愿', '只好', '只能', '没法', '几乎', '差点', '稍稍', '略微', '略略', '颇', '很', '非常', '十分', '格外', '尤其', '特别', '异常', '极', '极其', '过于', '过分', '相当', '万分', '无比', '至极', '这条', '那年', '这次', '那种', '此时', '此刻', '一件', '一炉', '一夜', '一天', '一季', '三年', '五月', '十岁',
]);

const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}

console.log('T7 差异审查（说法重写 · 事实不许变）\n');
console.log(`变更前：${path.relative(ROOT, beforePath)}（${Object.keys(before).length} 条）`);
console.log(`变更后：${path.relative(ROOT, afterPath)}（${Object.keys(after).length} 条）\n`);

const beforeIds = Object.keys(before);
const afterIds = Object.keys(after);

/* ── 1. 一条不许少 ─────────────────────────────────────────────────── */
const dropped = beforeIds.filter(id => !afterIds.includes(id));
const added = afterIds.filter(id => !beforeIds.includes(id));
ok(dropped.length === 0, `变更前有的卡一张都没少（少了 ${dropped.length} 张）`);
for (const id of dropped.slice(0, 10)) console.error(`      少了：${id}`);
ok(added.length === 0, `变更后没有多出规则层没有的卡（多了 ${added.length} 张）`);
for (const id of added.slice(0, 10)) console.error(`      多了：${id}`);

/* ── 2. 选项数不许变 ───────────────────────────────────────────────── */
const choiceChanged = [];
for (const id of beforeIds) {
  if (!after[id]) continue;
  const b = before[id].v1, a = after[id].v1;
  if (!b || !a) continue;
  if ((b.hints || []).length !== (a.hints || []).length) {
    choiceChanged.push(`${id}（${(b.hints || []).length} → ${(a.hints || []).length}）`);
  }
}
ok(choiceChanged.length === 0, `每张卡的选项数都没变（变了的 ${choiceChanged.length} 张）`);
for (const line of choiceChanged.slice(0, 10)) console.error(`      ${line}`);

/* ── 3. 事实不许变（数量必须一致）──────────────────────────────────── */
/*
 * ⚠ **正文与提示语要分开判**（2026-11-08 实测改过一次）
 * -----------------------------------------------------------
 *   · **正文（标题 + 正文）**：数量一个都不许变 ——
 *     「三年」不能变成「五年」，「十二枚」不能变成「三枚」。
 *   · **提示语**：只许用**规则层本来就知道的数** ——
 *     写作规范要求把「要多久」「代价多少」挪到提示语里，
 *     所以提示语里**新出现**「六个月」「两枚灵石」是照抄事实，不是编事实。
 *     判据：这些数必须能在规则层那张卡的事实数字里找到（见 `cardFacts`）。
 *
 * ⚠ **比数值，不比字面**：「门后两名杂役」→「门后两个杂役」是量词换了字，人数没变。
 * ⚠ **「一」不算数量**：「一种活法」「一条路」是不定量说法，不是事实数字。
 */
const proseChanged = [];
const hintInvented = [];
let skippedNull = 0;
for (const id of beforeIds) {
  if (!after[id]) continue;
  const facts = new Set((before[id].v1 && before[id].v1.facts) || []);
  for (const v of ['v1', 'v2', 'v3']) {
    const b = before[id][v], a = after[id][v];
    if (!b || !a) continue;
    if (b.text === null && b.text !== undefined) { skippedNull++; continue; }
    const bp = numberValues(`${b.title || ''}${b.text || ''}`);
    const ap = numberValues(`${a.title || ''}${a.text || ''}`);
    if (!sameNumbers(bp, ap)) {
      proseChanged.push(`${id}/${v}（${bp.join(',') || '无'} → ${ap.join(',') || '无'}）`);
    }
    const ah = numberValues((a.hints || []).join(''));
    const invented = ah.filter(n => !facts.has(n));
    if (invented.length) {
      hintInvented.push(`${id}/${v}（提示语里多出 ${invented.join(',')}）`);
    }
  }
}
ok(proseChanged.length === 0, `正文里的数量一个都没变（变了 ${proseChanged.length} 张，跳过 ${skippedNull} 格「变更前没测出来」）`);
for (const line of proseChanged.slice(0, 15)) console.error(`      ${line}`);
if (proseChanged.length > 15) console.error(`      …还有 ${proseChanged.length - 15} 张`);
ok(hintInvented.length === 0, `提示语里的数规则层本来就知道（编出来的 ${hintInvented.length} 张）`);
for (const line of hintInvented.slice(0, 15)) console.error(`      ${line}`);
if (hintInvented.length > 15) console.error(`      …还有 ${hintInvented.length - 15} 张`);

/* ── 4. 专名不许丢 ─────────────────────────────────────────────────── */
/*
 * ⚠ 只认**词表里的专名** —— 早先还猜「句尾 2–4 个汉字」⇒ 满屏假阳性
 *   （"借用炉房""求你清账"这种句尾词组全被当成人名）。
 *   ⇒ 与门禁 `verify-event-expressions.mjs` 用同一套词表。
 *
 * ⚠ **大陆名是动态值，放行**（2026-11-08 实测踩到）：
 *   规则层用 `homeName(s)` 取「玩家的出生大陆」——
 *   探针里出生地是青岚大陆，所以变更前的正文里会出现「青岚大陆」。
 *   表达域把它写成「老家」才是**对的**（换个出生地也对）；
 *   照抄「青岚大陆」反而会对别的出生地说错。
 *   ⇒ 大陆名不参与「不许丢」检查（与门禁「地名放行」同口径）。
 */
const DYNAMIC_PLACES = ['青岚大陆', '临潮大陆', '烬原大陆', '浮屿界'];
const termDropped = [];
for (const id of beforeIds) {
  if (!after[id]) continue;
  const b = before[id].v1, a = after[id].v1;
  if (!b || !a) continue;
  const bt = termsIn(`${b.title || ''}${b.text || ''}${(b.hints || []).join('')}`);
  const at = termsIn(`${a.title || ''}${a.text || ''}${(a.hints || []).join('')}`);
  for (const t of bt) {
    if (DYNAMIC_PLACES.includes(t)) continue;
    if (!at.has(t)) { termDropped.push(`${id}：${t}`); break; }
  }
}
ok(termDropped.length === 0, `变更前的专名都还在（丢了 ${termDropped.length} 张）`);
for (const line of termDropped.slice(0, 15)) console.error(`      ${line}`);
if (termDropped.length > 15) console.error(`      …还有 ${termDropped.length - 15} 张`);

/* ── 5. 变化幅度（给人抽查用）──────────────────────────────────────── */
const changes = [];
for (const id of beforeIds) {
  if (!after[id]) continue;
  const b = before[id].v1, a = after[id].v1;
  if (!b || !a) continue;
  const bt = `${b.title || ''}${b.text || ''}${(b.hints || []).join('')}`;
  const at = `${a.title || ''}${a.text || ''}${(a.hints || []).join('')}`;
  const lenB = bt.length, lenA = at.length;
  changes.push({id, before: lenB, after: lenA, delta: lenA - lenB});
}
changes.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
const beforeTotal = changes.reduce((a, c) => a + c.before, 0);
const afterTotal = changes.reduce((a, c) => a + c.after, 0);
console.log(`\n  字数：合计 ${beforeTotal} → ${afterTotal}（${afterTotal - beforeTotal >= 0 ? '+' : ''}${afterTotal - beforeTotal}，${((afterTotal / beforeTotal - 1) * 100).toFixed(1)}%）`);
console.log(`  改动最大的 10 张（人工抽查用）：`);
for (const c of changes.slice(0, 10)) {
  console.log(`    ${c.id}：${c.before} → ${c.after} 字（${c.delta >= 0 ? '+' : ''}${c.delta}）`);
}

/* ── 工具 ───────────────────────────────────────────────────────────── */

/**
 * 文本里的数字。
 * ⚠ 已挪到共用工具 `scripts/lib/text-numbers.mjs`
 *   （门禁与差异审查必须同一套算法，否则两边各说各话）。
 *   口径见那边的注释：「一」不算数量、比数值不比字面、规则层的结构化数据也是事实。
 */
function numbersIn(text) {
  return numberValues(text);
}

/**
 * 文本里像专名的词。
 * ⚠ 词表用 `var`（函数级提升）：这个函数在文件前面的判据里就要用，
 *   而声明在后面 ⇒ `const` 会撞 TDZ（同一个坑踩了三次了）。
 */
function termsIn(text) {
  const found = new Set();
  const t = String(text || '');
  /* 只认词表里的专名 —— 猜「句尾 2–4 个汉字」会满屏假阳性。 */
  for (const term of VOCAB) if (t.includes(term)) found.add(term);
  return found;
}

if (failures) {
  console.error(`\n${failures} 处硬伤。`);
  process.exit(1);
}
console.log('\n结果：0 个问题');
