/**
 * 文本里的「数量」—— 修仙线文案核对用的共用工具。
 * ============================================================================
 *
 * ## 为什么单独放一个文件
 * ----------------------
 * 「说法重写不许改事实」这条判据有两处要用它：
 *   · `scripts/verify-event-expressions.mjs`（门禁）
 *   · `scripts/t7-diff.mjs`（差异审查）
 * 两处必须**同一套算法** ⇒ 否则一个判「没问题」、另一个判「有毛病」，
 * 谁也说不清到底哪个对 ⇒ 放一起，改一处两边一起改。
 *
 * ## 三条判据口径（都是被假阳性逼出来的）
 * --------------------------------------
 * ① **「一」不算数量**。
 *    中文里「一种活法」「一条路」「一块木牌」「一把伞」都是**不定量**说法，
 *    不是事实数字。把它算进去 ⇒ 改写只是把「还需要三年」说成「还得练三年」
 *    就被判「多了个数」（实测 21 张卡误报）。
 *    ⚠ 代价是「一次机会」→「两次机会」要靠「两」才能抓住（实测能抓住）。
 *
 * ② **比数值，不比字面**。
 *    「门后两名杂役」→「门后两个杂役」是**量词换了字**，人数没变。
 *    按字面比 ⇒ 误报；按数值比（两名 = 两个 = 2）⇒ 不报。
 *
 * ③ **规则层的结构化数据也是「事实」**。
 *    选项的 `months`（要多久）、`cost`（要几枚灵石）本来就是这张卡的事实。
 *    写作规范要求把「要多久」「代价多少」挪到提示语里 ⇒ 提示语里**新出现**这些数
 *    是照抄事实，不是编事实。
 */

/**
 * 量词表：数字后面跟这些字，才算「数量」。
 * ⚠ 刻意**不含「分」** —— 「十分好」是副词，不是「十份」；
 *   也不能太宽（「万一」「千般」「百姓」这类会被误抓）。
 */
const CLASSIFIERS = '年月日天次枚份道味层个位只把条张片块颗粒斤成倍趟件场门级阶品种样'
  + '名头面座间扇盏杯束匹副台辆尾双对群队帮批桌席盘碗口笔封棵株回合堵柄';

/** 中文数字 → 数值。返回 null = 这串不是数字（「万一」「千般」）。 */
const DIGITS = {零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9};
const UNITS = {十: 10, 百: 100, 千: 1000};

/**
 * 一串中文数字算出来是多少。
 * 「两」单独算 2；「十」单独算 10；「三十六」= 36；「万一」不是数字（返回 null）。
 */
export function chineseNumber(text) {
  const s = String(text || '');
  if (!s) return null;
  if (s === '两') return 2;
  let section = 0;
  let num = 0;
  let seen = false;
  for (const ch of s) {
    if (Object.hasOwn(DIGITS, ch)) { num = DIGITS[ch]; seen = true; continue; }
    if (Object.hasOwn(UNITS, ch)) {
      section += (num || 1) * UNITS[ch];
      num = 0;
      seen = true;
      continue;
    }
    return null;
  }
  if (!seen) return null;
  return section + num;
}

/**
 * 文本里出现的**数量**（一组数值）。
 * ⚠ 「1」被丢掉（见上面的判据 ①）。
 * ⚠ 中文数字必须**带量词**才算数量（见上面的量词表说明）。
 * @returns {number[]} 排序去重后的数值
 */
export function numberValues(text) {
  const out = new Set();
  const t = String(text || '');
  for (const m of t.matchAll(/\d+(?:\.\d+)?/g)) {
    const n = Number(m[0]);
    if (Number.isFinite(n) && n !== 1) out.add(n);
  }
  const cn = new RegExp(`[零一二三四五六七八九十百千万两]+(?=[${CLASSIFIERS}])`, 'g');
  for (const m of t.matchAll(cn)) {
    const n = chineseNumber(m[0]);
    if (n === null) continue;
    if (n === 1) continue;
    out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** 两个数值集合是否一样（不看顺序）。 */
export function sameNumbers(a, b) {
  const x = [...new Set(a || [])].sort((p, q) => p - q);
  const y = [...new Set(b || [])].sort((p, q) => p - q);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * 这张卡「本来就知道哪些数」。
 *
 * 来源：卡面文字（标题 / 正文 / 选项字面 / 选项提示语 / 选项回话 / 起始回话）
 *      + 选项的结构化字段（`months` / `cost` / `requires` / `check.base` / 效果里的数）。
 *
 * ⚠ 「数字」只在**结构化字段**里取；文字里的数由 `numberValues` 负责。
 *   两边合起来 = 这条卡的事实数字全集。
 */
export function cardFacts(node) {
  const out = new Set();
  const addText = (t) => { for (const n of numberValues(t)) out.add(n); };
  if (!node) return [];
  addText(node.title || '');
  addText(typeof node.text === 'string' ? node.text : '');
  for (const c of node.choices || []) {
    addText(c.label || '');
    addText(typeof c.hint === 'string' ? c.hint : '');
    addText(c.reply || '');
    addText(c.startReply || '');
    const walk = (v, key) => {
      if (typeof v === 'number') { if (Number.isFinite(v) && v !== 1) out.add(v); return; }
      if (Array.isArray(v)) { v.forEach(x => walk(x, key)); return; }
      if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v)) walk(val, k);
      }
    };
    for (const key of ['months', 'cost', 'requires', 'check', 'effects', 'system', 'pay']) {
      if (c[key] === undefined) continue;
      walk(c[key], key);
    }
  }
  return [...out].sort((a, b) => a - b);
}
