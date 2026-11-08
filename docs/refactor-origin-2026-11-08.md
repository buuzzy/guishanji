# 阶段一 · 出身真正驱动剧情（2026-11-08）

> 起因：用户实测发现剧情「很奇怪」——轮盘写着「名门大户」，玩家却看到
> 「战乱里一名游方药师救下你」，16 岁又去坊市当学徒成了散修。
> 查源码才明白：**出身根本没参与抽卡**（身世卡只按「有没有灵根」分池 + 种子哈希抽）。
> 实测：名门大户只有 **10%** 抽到配得上的身世卡，修仙世家 11%，山村药农 **0%**。

---

## 一、这一轮改了什么

| 层 | 文件 | 改动 |
| --- | --- | --- |
| 内容 | `content/background-stories.js` | 每条身世加 `origins`（哪种出身会抽到它）；新增 3 条（`background_noble_recommend` 郡里的名帖 / `background_noble_exile` 家道中落 / `background_clan_legacy` 家传护符与旧盟）；`road` 改成 `path`（路）与 `upbringing`（童年）**分开**；新增 `originKey` / `originBranch` 与路口那三套说法 |
| 内容 | `content/cultivation-stories.js` | 身世卡按 `bg.path` 决定走哪条路（不再看 `upbringing`）；路口卡「去坊市谋生 / 去坊市找其他功法」按出身分三套说法 |
| 内容 | `content/story-network.js` | 新增 2 张名门专属童年卡（`child_noble_school` 家塾里的先生 / `child_noble_recommend` 郡中来的人）；`child_relic`（旧屋铜匣）按出身分两套说法 |
| 内容 | `content/expressions/events/entry.js`、`child.js` | 表达域同步改成分支（规则层与表达域**用同一份判断**） |
| 内容 | `content/card-stages.js` | 2 张新童年卡的阶段声明 |
| 规则 | `packages/adventure/cultivation.js` | 抽身世卡**先按出身过滤、再按灵根过滤**，最后才哈希抽（池子空了回退整池并喊一声） |
| 规则 | `packages/adventure/story-network.js` | `child_school` 收窄到「寻常人家」（代码本来就该这样，注释一直这么写）；加 2 张名门卡的判定；「读过书」的由头加上家塾 |
| 门禁 | `scripts/audit-origin-match.mjs`（新） | 出身门禁：匹配率 100% / 名门不许抽到「没人照看」那三张 / 每出身身世卡 ≥ 4 且专属童年卡 ≥ 2 / 路口那两句规则层与表达域一致 |
| 门禁 | `scripts/run-regression.mjs` | 注册 `originbg` |
| 门禁 | `scripts/t10-reverse.mjs` | 反向验证 ⑰–㉑（含一道**真改规则层源码**） |

### 身世卡分配（15 条）

| 出身 | 身世卡 |
| --- | --- |
| 山村药农 | 父亲的咳疾 / 你救过的那个人 / 生在宗门人家 / 游方药师留下的笔记（散修）/ 收养你的幽灯堂（魔道）/ 老猿教你控制妖身（妖身） + 凡人 4 条 |
| 名门大户 | 名门望族 / 郡里的名帖（新）/ 家道中落（新，散修）/ 修仙世家的旁支 + 凡人 4 条 |
| 修仙世家 | 修仙世家的旁支 / 生在宗门人家 / 家传护符与旧盟（新） + 凡人 4 条 |

---

## 二、差异审查（三件套）

### ① 变更前基线（已存）

| 文件 | 内容 |
| --- | --- |
| `tests/fixtures/event-sequences-pre-origin.json` | 12 条人生 / 366 步决策序列 |
| `tests/fixtures/events-versions-pre-origin.json` | 事件表 347 张卡的摘要 |
| `tests/fixtures/event-expressions-pre-origin.json` | 表达域 347 条 × 3 个状态 |
| `tests/fixtures/reach-gaps-pre-origin.json` | 触达台账（旧） |
| `tests/fixtures/metrics-baseline.json` | 指标基线（旧） |

### ② 差异审查记录

**决策序列（12 条人生逐条看过）**

| # | 种子 | 第一处不同在 | 旧 → 新 |
| --- | --- | --- | --- |
| 1 | 序列基线-0 | 第 0 步 | `child_school` → `child_clan` |
| 2 | 序列基线-1 | 第 0 步 | `child_school` → `child_noble_school` |
| 3 | 序列基线-2 | 第 0 步 | `child_secret` → `child_friend` |
| 4 | 序列基线-3 | 第 0 步 | `child_keeper` → `child_clan` |
| 5 | 序列基线-4 | 第 0 步 | `child_friend` → `child_noble_school` |
| 6 | 序列基线-5 | 第 16 步（末尾） | 旧序 16 步 / 新序 11 步，结尾同为 `m11_end` |
| 7 | 序列基线-6 | 第 3 步 | `background_noble_house` → `background_cultivator_family` |
| 8 | 序列基线-7 | 第 13 步（末尾） | `echo_teacher_check` 之后分叉 |
| 9 | 序列基线-8 | 第 0 步 | `child_school` → `child_noble_school` |
| 10 | 序列基线-9 | 第 2 步 | `background_ill_parent` → `background_noble_house` |
| 11 | 序列基线-10 | 第 3 步 | `background_cultivator_family` → `background_born_sect` |
| 12 | 序列基线-11 | 第 0 步 | `child_caravan` → `child_noble_school` |

⇒ **12 条里 10 条的第一处不同就落在童年卡或身世卡**（本轮改的那两块），
其余 2 条是后续连锁。**没有任何一处差异来自别的地方。**

**表达域**：`node scripts/t7-diff.mjs --before=… --allow-added='background_*,child_noble_*'`
⇒ 一条没少、选项数没变、正文里的数量一个没变、专名一个没丢、**结果：0 个问题**。

**触达台账（逐族看）**：

| 族 | 变化 |
| --- | --- |
| 旧线索兜底 | **新变零触达 1 张**：`echo_resume_after_war`（1200 条命里也没撞上；与它已登记的兄弟们同一族 ⇒ 确认不是缺陷） |
| 规则十二备用编号 | **不再零触达 1 张**：`r12_direction_3`（变好了 ⇒ 从台账里移除） |
| 其余 9 族 | 完全不变 |

零触达总数 **115 → 115**；16 条长线全部 **100%「有机会必发出」**；崩了 0 条。

**指标基线**：可达性 138 → 143、全卡口径 10 年密度 12 → 13（= 硬底线 13，未超限）。
⇒ 多出来的 5 张**全是妖身路径的接头卡**（`beast_form` / `beast_war` / `beast_eclipse`）与 1 张封印提醒：
妖身现在只有山村药农能走 ⇒ 120 条命里妖身命从约 10 条降到约 4 条 ⇒ 这批卡在这批样本里没撞上。
**不是内容被删** —— 触达门禁（400 条命 × 2 策略）证实它们仍发得出来。
理由已写进 `tests/fixtures/metrics-baseline.json` 的 `history`。

### ③ 变更后基线（已更新）

`event-sequences.json`（12 条 / 348 步）、`events-versions.json`（352 张）、
`event-expressions.json`（352 条 × 3 状态）、`reach-gaps.json`（115 张 / 11 族）、
`metrics-baseline.json`。

---

## 三、两条测试期望跟着改了（都写清了原因）

| 文件 | 改动 | 为什么 |
| --- | --- | --- |
| `tests/cultivation.test.mjs` | 取样窗口 250 → 800 | 序列位移 ⇒「家族基础抄本」那张卡（要 clan 出身 + 散修路 + 窗口未关）在第 508 条才第一次出现。**放宽窗口不改变任何断言**（循环仍是「碰到第一条就返回」）。 |
| `tests/story-shared.test.mjs` | 种子 `echo-audit-1` → `echo-audit-6` | 那个写死的种子不再走到 `sect_feud_0`；重挑了一个能走到、正文与人物查询都对得上的。**这张卡没有失联**（`sect_feud` 线 36/36 全发得出）。 |

---

## 四、这一轮**没有**做的事（登记为已知缺口）

| 事项 | 说明 |
| --- | --- |
| **名门大户开局 0 灵石** | 轮盘写「有积蓄、有旧契」，修仙线实际开局 0 灵石、家里 reserve 0（`packages/adventure/revision9.js:19` + `cultivation.js:62`）。**这一轮没动** —— 改了会牵动经济与旧基线，另立一轮。 |
| **决策文档 B 组剩下 4 条** | 「谁会来找你」「未解问题」「选项提示语格式」「出身自带初始事件链与权重」都没做（`BACKGROUND_BY_ID` 仍是死代码）。阶段二。 |
| **`ORIGINS` 里两条死条目** | 「渡口匠人」「流浪少年」轮盘永远转不到（`FAMILIES` 只有三族）。只记录，不清。 |
| **魔道 / 妖身只对山村药农开放** | 本轮默认（用户批准）。代价：妖身路径的 4 张接头卡在 120 条命的样本里发霉（见上）。若要让名门/世家也能走妖身，说一声即可。 |
