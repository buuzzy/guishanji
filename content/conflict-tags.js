/**
 * 冲突标签 —— 「这张卡是对抗还是代价」的**声明表**（内容层叶子文件）
 * ============================================================================
 *
 * ## 为什么单独一个文件（2026-11-08 · 章节感补强 · B）
 * --------------------------------------------------
 * 设计原则里新增了一条规格：**每个境界章至少一次对抗或代价**。
 * 要把这条规格变成门禁，先得回答「哪些卡算冲突」——
 * 这个判断**不许让审计脚本去猜**（猜前缀出的分类没人能审，
 * `packages/adventure/gates.js` 的 `classifyCard` 先例）⇒ 由内容层**声明**。
 *
 * ## 声明与验证的分工
 * ------------------
 *   · 本文件声明：`卡id → { kind, note }`；
 *   · 审计反向验证（`scripts/audit-metrics.mjs`）：
 *       - `clash` ⇒ 该卡至少一个选项带**成败判定**（`check`），失败有实际代价；
 *       - `cost`  ⇒ 该卡至少一个选项带**代价**（`cost`）或判定失败分支。
 *     声明与结构不符 ⇒ 门禁报红（防「改卡忘改标签」漂移）。
 *   · ⚠ 反向只验声明→结构这一向；结构→声明的方向（带判定的卡没登记）
 *     只出**提示清单**不报红——漏标不该卡死门禁，但要看得见。
 *
 * ## 指标口径（与 audit-metrics 的 `conflictRealmMin` 一致）
 * ------------------------------------------------------
 *   · 只统计**修仙路**（获得功法/心法之后）的章；
 *   · 一个章 = 该命在某一境界里实际度过的卡窗（跨度 ≥24 个月才参与）；
 *   · 指标 = 章内冲突卡张数，跨命取**最小值**（人人都该至少遇到一次）；
 *   · 终身凡人另计（`mortalConflictCount`，只观察不设限，等凡尘线补完再上门禁）。
 *
 * ⚠ 叶子文件纪律：不 import 任何东西 ⇒ 谁都能读、永不在环里。
 * ⚠ 新增冲突卡（如 r12_qi_practice_1 / r12_qi_adventure）随卡片落地在此登记。
 */

/** 展开助手：给一条长线的**第 1 步**登记冲突标签——
 *  16 条线的成败判定全部在第 1 步（0 步是接活、2 步是收尾，结构核对见 2026-11-08 审计），
 *  整线登记会被反向验证打红。 */
function clashStep1(id, note) {
  return {[id + '_1']: {kind: 'clash', note}};
}

export const CONFLICT_TAGS = {
  /* 16 条长线：冲突集中在第 1 步（判定 + 失败代价），全部如实登记。 */
  ...clashStep1('sect_repair', '护阵抢修：斗法判定，失败有代价'),
  ...clashStep1('sect_trial', '兽群搜救：成败判定，失败同伴出事'),
  ...clashStep1('sect_return', '返乡之路：劫道判定'),
  ...clashStep1('sect_feud', '两宗争水：谈判与斗法，失败即battle_lost'),
  ...clashStep1('loose_contract', '散修契约会面：谈崩即翻脸'),
  ...clashStep1('loose_relic', '遗迹夺宝：争夺判定'),
  ...clashStep1('loose_portal', '界门前：拦截判定'),
  ...clashStep1('dark_ledger', '幽灯堂的账：对账即对峙'),
  ...clashStep1('dark_method', '魔功反噬：压不住即出事'),
  ...clashStep1('dark_pursuit', '旧账追索：追杀判定'),
  ...clashStep1('beast_home', '妖山立足：兽群判定'),
  ...clashStep1('beast_form', '化形关：天劫判定'),
  ...clashStep1('beast_war', '妖战：战场判定'),
  ...clashStep1('loose_escort', '护棺：旧仇沿途追杀'),
  ...clashStep1('dark_sacrifice', '血阵：瞒与献的周旋，selfish 有 failEnding'),
  ...clashStep1('beast_eclipse', '蚀月之变：大变判定'),
  /* 看管与脱身。 */
  custody_escape: {kind: 'clash', note: '看管中脱身：斗法判定，三选皆可能死'},
  custody_terms: {kind: 'cost', note: '看管条款：人身受限，认或不认都有代价'},
  /* 章节感补强 A2（2026-11-08）：凡身章与炼气章的新冲突卡。 */
  r12_qi_practice_1: {kind: 'cost', note: '行气走岔：硬闯会磨伤经脉，重理折损两成修为'},
  r12_qi_adventure: {kind: 'clash', note: '废弃洞府：深入石室带判定，失败受轻伤'},
  /* 故事重写 W1（2026-11-09）：小满下山的代价冲突——六枚灵石换她留下。 */
  r12_peer_xiaoman: {kind: 'cost', note: '小满下山：留人要掏六枚灵石与一张药方，掏不出就只能送她走'},
};
