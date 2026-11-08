/**
 * 长线 id 的**唯一清单**（16 条）。
 *
 * ## 为什么单独一个文件
 * ------------------
 *   「这 16 条线豁免密度闸与节拍闸」这件事，**两边都要知道**：
 *     · 规则层（`packages/adventure/gates.js`）—— 判定某张卡是不是长线卡；
 *     · 内容层（`content/cultivation-stories.js`）—— 真正的线在那儿。
 *
 *   以前规则层是**反向**去读内容层的（`gates.js` import `content/cultivation-stories.js`），
 *   代价是：**加载顺序依赖** —— 只 import 闸的单测里内容层还没加载 ⇒ 名单是空的
 *   ⇒ `isMilestone('sect_repair_0')` 悄悄变成 false ⇒ 长线被拦掉 ⇒ 整条线断掉，
 *   而门禁还显示绿（2026-11-08 实测踩到）。
 *
 *   改法：清单挪到这里（**内容层的一个叶子文件**）——
 *     · 谁都能读（规则层 import 内容层，是**允许**的方向）；
 *     · 它不 import 任何东西 ⇒ **永远不在环里**（`scripts/test-xianxia-cycle.mjs` 守着）；
 *     · 内容层加载时**自己核对**自己那份 `ROAD_CHAINS` 与这份清单是否一致，对不上当场抛错。
 *
 * ⚠ **改这条清单时，两边都要对得上** ——
 *   内容层加了线却没改这里 ⇒ 那条线会被密度闸拦掉 ⇒ 线断了，而门禁显示绿。
 *   （内容层那份核对会当场抛错，所以不会静悄悄。）
 */

/** 长线 id（宗门三条、散修三条、魔道三条、灵兽三条，外加四条后期线）。 */
export const CHAIN_IDS = [
  'sect_repair', 'sect_trial', 'sect_return',
  'loose_contract', 'loose_relic', 'loose_portal',
  'dark_ledger', 'dark_method', 'dark_pursuit',
  'beast_home', 'beast_form', 'beast_war',
  'sect_feud', 'loose_escort', 'dark_sacrifice', 'beast_eclipse',
];
