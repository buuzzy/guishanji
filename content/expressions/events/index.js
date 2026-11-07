/**
 * 表达域 · 修仙线（事件表）的接管入口
 * ============================================================================
 *
 * ## 这份文件解决什么
 * --------------------
 * 用户 2026-11-06 提的第 10 条：「表述优雅但难懂，不够通俗」。
 * 实测：修仙这条路上 **285 张决策卡**，正文里一句同时塞「是什么 + 会怎样 + 但有个限制」
 * 的写法占绝大多数；经典那条路的 66 张早就口语化过了（`content/expressions/index.js`），
 * 修仙这条路的卡却**一张都没进过表达域** ⇒ 玩家读到的全是原来那种密度。
 *
 * ## 规矩
 * ------
 *   · 一条卡一行：`[标题, 正文, [每个选项的提示语……]]`。
 *   · **提示语的数量必须和规则层的选项一样多** —— 对不上就是内容漏了。
 *   · **只改说法，不改事实**：数字、期限、代价、后果一个都不能动；
 *     人名、地名、物件名照抄（后面还有名字替换与身份注解两道工序）。
 *   · 规则层的事件表一个字都不许在这里改 —— 这里是**表达域**（⑤），
 *     那里是**因果域**（③）。
 *
 * ## 为什么这里只接管三样
 * ----------------------
 * 标题、正文、选项提示语 —— 这三样是玩家读得最多的文字。
 * 选项的字面（label）与结算后的回话（reply）留在规则层：
 * 它们多半是动作本身（「先回信核对旧事」），改写的收益小、改坏的风险大。
 *
 * ## 降级而不是崩
 * --------------
 * 缺一行就退回规则层自己的说法，并在控制台喊一声 ——
 * 修仙线是**在线产品**，一条内容写漏不该让整局白屏；
 * 真正把住这件事的是门禁 `scripts/verify-expressions.mjs`（一条不漏 + 提示语数对齐）。
 */
import { rows as ENTRY_ROWS } from './entry.js';
import { rows as TRIAL_ROWS } from './trial.js';
import { rows as SECT_ROWS } from './sect.js';
import { rows as WILD_ROWS } from './wild.js';
import { rows as CHILD_ROWS } from './child.js';
import { rows as MATERIAL_ROWS } from './material.js';
import { rows as TWELVE_ROWS } from './twelve.js';
import { rows as ECHO_ROWS } from './echo.js';
import { rows as MUNDANE_ROWS } from './mundane.js';

/** 修仙线全部卡的说法（按故事线分片，见上面九行）。 */
export const EVENT_ROWS = {
  ...ENTRY_ROWS, ...TRIAL_ROWS, ...SECT_ROWS, ...WILD_ROWS, ...CHILD_ROWS,
  ...MATERIAL_ROWS, ...TWELVE_ROWS, ...ECHO_ROWS, ...MUNDANE_ROWS,
};

/**
 * 把修仙线的事件表换成「人话」版本。
 *
 * ⚠ 只换三样：标题、正文、选项提示语。
 *   效果、判定、代价、月份、后续事件 —— **一个字都不动**（那些是规则层的）。
 *
 * @param {object} events 规则层的事件表（修仙线那张）
 * @returns {object} 说法换过之后的事件表
 */
export function makeReadableEvents(events) {
  const out = {};
  const missing = [];
  for (const [id, node] of Object.entries(events)) {
    const row = EVENT_ROWS[id];
    if (!row) {
      /* 缺一行 ⇒ 用规则层自己的说法（门禁会报红，别让一格漏字把整局白屏）。 */
      missing.push(id);
      out[id] = node;
      continue;
    }
    if (!Array.isArray(row[2]) || row[2].length !== node.choices.length) {
      throw new Error('表达域的提示语数量对不上：' + id + '（' + row[2].length + ' vs ' + node.choices.length + '）');
    }
    out[id] = {
      ...node,
      title: row[0],
      text: row[1],
      choices: node.choices.map((choice, i) => ({ ...choice, hint: row[2][i] })),
    };
  }
  if (missing.length && typeof console !== 'undefined' && console.warn) {
    console.warn('表达域还缺 ' + missing.length + ' 条内容（先用规则层的说法顶着）：' + missing.slice(0, 5).join('、'));
  }
  return out;
}
