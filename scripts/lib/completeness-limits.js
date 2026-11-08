/**
 * completeness-limits.js —— 内容完备度的**底线数字**（唯一一份）
 * ============================================================================
 *
 * ## 为什么单独一个文件
 * ------------------
 * 这些数字原来写在两个脚本里：
 *   · `scripts/audit-metrics.mjs` 的 `HARD_LIMIT.realmContentMin`（每境至少几种内容）；
 *   · `scripts/audit-completeness.mjs` 的 `LIMITS.realmKinds` / `lateKinds` 与 `LATE_AGE`。
 *
 * 而这两个脚本都 import 了 `node:fs` ⇒ 别处想用同一份数字时，只能自己抄一份
 * ⇒ 抄一份就会发霉（这边说 5、那边说 3，谁也不报警）。
 *
 * ⇒ 现在：数字只住在这里，各处**都从这里取**。
 *
 * ## ⚠ 这个文件不许 import `node:*`
 * --------------------------
 * 不许碰文件系统 —— 它只是一份纯数字，谁都能 import 同一份。
 */

/**
 * 每个境界段**一条命实际**至少要发出过多少种内容。
 *
 * ⚠ 口径：**取每条命里最多的那一档**（不是把所有人的并起来）——
 *   并集会把「只有极少数命走到的内容」算进去，看着好看，其实玩家碰不到。
 *   （`scripts/audit-metrics.mjs` 的 `realmCountsOf` 与面板的「单条命最多」同一口径。）
 */
export const REALM_KINDS_MIN = 5;

/** 「晚年」从几岁算起。 */
export const LATE_AGE = 75;

/** 晚年（`LATE_AGE` 岁以后）至少要碰到多少种卡。 */
export const LATE_KINDS_MIN = 30;

/** 晚年一张专讲「收尾 / 身后事」的卡，至少要发几次才算晚年有收尾内容。 */
export const LATE_DEDICATED_MIN = 3;

/**
 * 同一境界段的突破卡，间隔中位数**该是多少年**（规格目标）。
 *
 * ⚠ 出处：`docs/内容架构重构方案-2026-11-06.md` 六项指标第 6 条。
 * ⚠ 实测**尚未达标**（炼气 5 · 筑基 4 · 金丹 27 · 元婴 51）⇒
 *   这条已登记成**已知缺口**（门禁 `completeness` 的缺口台账里），
 *   门禁本身只守「不许变得更宽」。
 */
export const SPAN_TARGET = 15;
