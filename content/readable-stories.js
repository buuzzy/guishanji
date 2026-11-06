/**
 * 表达域 · 门面（兼容旧路径）
 * ============================================================================
 *
 * 表达域的内容已经按故事线拆到 `content/expressions/` 下了：
 *   · `content/expressions/mainline.js`   主线（入门与宗门战事）
 *   · `content/expressions/tide.js`       临潮港
 *   · ……
 *   · `content/expressions/index.js`      汇总入口（makeReadable）
 *   · `content/expressions/people.js`     人物背景
 *
 * ⚠ 这个文件**只做转发**，不再放内容 ——
 *   新的说法请写进对应故事线的分片文件。
 *
 * ⚠ 它留着的原因：老路径还有人在用（迁移进来的文件、外部引用）。
 *   等所有引用都换成新路径后，这个门面就可以删掉。
 */
export { PEOPLE_BACKGROUNDS } from './expressions/people.js';
export { makeReadable, ROWS, DYNAMIC } from './expressions/index.js';
