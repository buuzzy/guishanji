/**
 * 卡的阶段声明 —— 「这张卡属于哪一段人生 / 哪个境界段」
 * ============================================================================
 *
 * ## 为什么要有这张表
 * ------------------
 * 用户 2026-11-06 提的第 15 条：**「按境界而非年龄编排事件」**。
 * 以前事件只按岁数排（十六岁干什么、七十岁干什么），
 * 于是会出现「四十岁的人收到一张幼年才该有的卡」「七十岁的人还在做筑基期的活」。
 *
 * ⇒ 现在每张**有明确人生位置**的卡都来这里声明一下：
 *   · `stage`  —— 它属于哪一段人生（幼年 / 少年 / 入门 / 立身 / 传灯 / 晚年）；
 *   · `realm`  —— 它属于哪一段境界（[最低, 最高]，含两端）；
 *   · `maxAge` —— 过了这个岁数就不该再出现。
 *
 * 规则层的阶段闸（`packages/adventure/gates.js`）照这张表判断：
 * 玩家不在那一段 ⇒ **这张卡现在发不出去**。
 *
 * ## 为什么要单独一张表，而不是写在事件表里
 * ----------------------------------------
 * 事件表（`content/cultivation-stories.js`）是**九个历史版本共用的** ——
 * 在那张表上动一个字段，等于把历史档的逐值全等门禁一起弄红。
 * ⇒ 声明另起一张表：老档一个字节都不动，新规则只管当前版本。
 *
 * ## 只写「真正会被闸管到」的卡
 * ----------------------------
 * 突破卡、长线卡、后续卡那些是**豁免**的（`gates.js` 的豁免名单）⇒
 * 给它们写声明等于写一句不会执行的话 ⇒ 不写。
 *
 * ## 写法
 * ------
 *   `'卡 id': {stage: 'child'}`          —— 精确匹配
 *   `'卡 id*': {realm: [2, 3]}`           —— 前缀匹配（`*` 收尾）
 *   不声明 = 不受阶段闸限制（绝大多数卡都是这样）。
 *
 * ⚠ 本文件进小程序包 ⇒ **不写 `?.` / `??`**。
 */

/**
 * 卡 → 阶段声明。
 * @type {Object<string, {stage?:string, realm?:number[], maxAge?:number}>}
 */
export const CARD_STAGES = {
  /* ── 幼年（0–15 岁）：身体、家人、最初的见识 ─────────────────────── */
  'r12_child_body': {stage: 'child'},
  'r12_child_fever': {stage: 'child'},
  'child_school': {stage: 'child'},
  'child_keeper': {stage: 'child'},
  'child_apothecary': {stage: 'child'},
  'child_clan': {stage: 'child'},
  'child_noble_school': {stage: 'child'},
  'child_caravan': {stage: 'child'},
  'child_friend': {stage: 'child'},
  'child_relic': {stage: 'child'},
  'child_secret': {stage: 'child'},
  'child_recruit': {stage: 'child'},
  'child_teacher': {stage: 'child'},
  'child_family_vow': {stage: 'child'},
  'child_noble_recommend': {stage: 'child'},

  /* ── 少年（16–29 岁）：入门那一套 ────────────────────────────────── */
  'reception': {stage: 'youth'},
  'root_result': {stage: 'youth'},
  'first_method': {stage: 'youth'},

  /* ── 境界段 ───────────────────────────────────────────────────────── */
  'r12_late_doubt': {realm: [0, 0]},    /* 凡身之人的犹豫 */
  'r12_patron': {realm: [0, 1]},        /* 宗门的供料签只给炼气前的人 */
  'r12_sect_clue': {realm: [1, 2]},     /* 宗门线索是筑基前后才碰得到的东西 */
  'root_review': {realm: [0, 1]},       /* 灵根复核 */
  'mortal_assessment': {realm: [0, 0]}, /* 凡人一辈子只在凡身时评过一回 */
};
