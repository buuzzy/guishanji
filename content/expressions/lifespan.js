/**
 * 表达域 · 寿元怎么说
 * ============================================================================
 *
 * 「还能活多久」这句话归表达域管；**数字**归规则层管
 * （`lifespanPlan12()` 是寿元的唯一来源）。
 *
 * ⚠ 这里只放**句式**，不放数字 ——
 *   呈现层拿规则层算好的数字来填，填完再整句显示。
 * ⚠ `{占位}` 用 `{}` 写，替换时由呈现层做（小程序端 WXML 不支持字符串拼接
 *   ⇒ 整句必须在 JS 侧拼好再绑定）。
 */
export const LIFESPAN_TEXT = {
  /** 顶栏那一行：寿尽 X 岁 · 还能活 Y 年 */
  line: '寿尽 {limit} 岁 · 还能活 {left} 年',
  /** 下一境界的死线：下一境（筑基）最多活到 210 岁 */
  next: '下一境（{nextRealm}）最多活到 {next} 岁',
  /** 登记卡上的一格：还能活 63 年 */
  cell: '还能活 {left} 年',
  /** 已经是最后一境 */
  last: '已至此世尽头',
};

/**
 * 把句式里的占位符换掉。
 * @param {string} template 句式（带 {占位}）
 * @param {object} values 数值
 * @returns {string} 整句
 */
export function fillLifespan(template, values) {
  /* ⚠ 用 ES5 的写法（不用 Object.hasOwn —— 那是 ES2022 的东西，
   *   小程序端虽然有垫片，但这里没必要依赖它）。 */
  return String(template).replace(/\{(\w+)\}/g, (all, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : all
  );
}
