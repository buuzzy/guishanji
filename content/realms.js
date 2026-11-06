/** 境界基础表与技艺表 —— 角色域（②）：人是谁、能走多远。
 *
 *  REALMS 是「凡人 / 炼气 / 筑基 / 金丹 / 元婴」五档的**基础寿元**（不是最终寿元：
 *  最终寿元由规则层按体质与境界算好后写进存档，见 packages/adventure/story-rules12.js）。
 *  SKILLS 是三种入门技艺的名字。
 */

export const REALMS = [
  { name: '凡身', lifespan: 88 }, { name: '炼气', lifespan: 120 },
  { name: '筑基', lifespan: 210 }, { name: '金丹', lifespan: 350 },
  { name: '元婴', lifespan: 560 },
];
export const SKILLS = { sword: '御剑', array: '阵法', alchemy: '丹术' };
