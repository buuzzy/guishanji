# 浏览器门禁 → Node 门禁 · 断言对照表

> **日期**：2026-11-08（阶段 0 前置动作）
> **为什么有这份表**：阶段 0 要删掉网页端与 9 道 Chrome 浏览器门禁。
> 删之前必须先证明：**那些门禁里「状态类」的断言，Node 侧已经有人在守** ——
> 否则一删，游戏规则就没人守了，而且没人会发现。
> **DOM 类断言（元素数量、CSS 类名、滚动、截图、点击）直接作废** ——
> 它们验的是网页外壳，而网页外壳这次就是要删的东西。

---

## 0. 一句话结论

- 9 道浏览器门禁共 **59 条断言**：**26 条是 DOM**（随网页端一起删），
  **33 条是状态**（其中 **27 条 Node 侧已有等价断言**，
  **6 条没有** ⇒ 已在本轮**补进 Node 侧**，见 §3）。
- 另外发现 **5 道 Node 测试**直接 `import apps/preview/life-panels.js`
  （网页端的 HTML 面板模块）⇒ 删网页端前必须先搬（本轮已搬到小程序端）。

---

## 1. 逐门禁对照

> 「Node 侧覆盖」列给的是**真正在断言**的地方，不是「算过这个数的地方」。

### 1.1 `verify-cultivation-browser.mjs`（修仙主线）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 出生态 == 引擎态 | 状态 | `scripts/audit-story-rules12.mjs`「呈现不改变模拟」；`scripts/test-xianxia-equivalence.mjs`（runtime == source） |
| 点一次「下一个」后页面快照 == 引擎态 | 状态 | `tests/adventure.test.mjs`「批量/逐月/快进得到同一状态和随机流」 |
| **决策选项文本不含 `成功率/成功机会/这次安排/\d+%`** | 状态 | ⚠ **原为 NONE ⇒ 本轮补进 `scripts/verify-event-expressions.mjs` §5.5** |
| 存档通过 `validateRun` | 状态 | `tests/cultivation.test.mjs`（400 条命逐条验） |
| 无横向溢出 / 无章节条 / 弹层在视口内 / 记录倒序 | DOM | 网页布局 |
| 动画帧宽度有多个不同值、暂停后进度条不变 | DOM | 纯动画 |
| 自动童年（`automaticCount>=1`、`pending.event` 以 `child_` 开头） | 状态 | `tests/progression.test.mjs`「六岁前三段经历」 |
| 选完童年选项后时间继续走 | 状态 | `tests/adventure.test.mjs`（抉择期间时间冻结 / 选完继续） |
| 页面跑出的一生 == 独立跑出的同种子人生 | 状态 | `scripts/verify-event-sequence.mjs`（固定人生决策序列逐条钉住） |
| 五条道路各跑完一生 | 状态 | `tests/cultivation.test.mjs`；`scripts/verify-life-richness.mjs` |
| 魔道 + 利己那支**真的会死** | 状态 | `tests/fixtures/event-sequences.json` 五条命以 `battle_lost` 收尾 |
| 切换重心后状态一致 | 状态 | `tests/decision-clarity.test.mjs`「七种日常各 +6 月」 |
| **旅行：真扣路费、耗时走完、换大陆、`routes.at(-1)` == 路线** | 状态 | `tests/cultivation.test.mjs`「旅行扣实际路费」 |
| **撤出探险：取消未完成阶段、保留已得物品、`activeChain=null`** | 状态 | `tests/cultivation.test.mjs`「主动撤出取消后续并保留已得物品」 |
| **双标签页写冲突保护原存档** | 状态 | `tests/adventure.test.mjs`「两个页面的原文基线冲突阻止覆盖」 |
| **原生 JSON 导出保留未保存的选择** | 状态 | `tests/adventure.test.mjs`（导出后 `decisions.at(-1).choice` 正确） |
| **原生导入 preview.3 存档 == `upgradeRun(旧档)`、原文件字节不变** | 状态 | `tests/cultivation.test.mjs`（三项全等 + `.preserved.preview3.` 键） |
| 无运行时错误 / 无外部请求 | DOM | 网页运行时 |

### 1.2 `verify-decision-clarity-browser.mjs`（抉择清晰度）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 主栏元素计数（`.activity-tile`、`[data-value]`、雷达标签数） | DOM | 删网页端后已改问**小程序端面板**（`tests/decision-clarity.test.mjs`） |
| **地图只画「已解锁大陆」之间的通路** | 状态 | `scripts/test-xianxia-art.mjs`（**不用 `mapView()`，独立重算** unlocked 集合再比对点阵数与通路条数） |
| **地图标的「当前所在」与存档一致** | 状态 | ⚠ **原为 NONE ⇒ 本轮补进 `tests/story-rules12.test.mjs`** |
| 买禁术残卷 + 半年试学不改变师承；试学后反悔仍回原路 | 状态 | `tests/decision-clarity.test.mjs`（`wanted=0`、`inquiry='demonic'`、第 6 个月才发 `dark_oath`） |
| 妖修线：师父叫白苓、半年相处、三年淬体、道路真的变成 `beast` | 状态 | `tests/decision-clarity.test.mjs`（`teacher==='白苓'`、35 月未变 / 第 36 月变） |
| 魔道线：投案 → 服劳 → `detained=true` → `custody_escape` → 潜逃 | 状态 | `tests/decision-clarity.test.mjs`「先认怂再逃有真实苦役时段」 |
| 触屏缩放、世界地图弹层 | DOM | 网页专属 |

### 1.3 `verify-family-transfer-browser.mjs`（家计交付）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| **如实作证：月份不变、灵石不变、`punishmentUntil=0`** | 状态 | `tests/cultivation.test.mjs`「药田事故有实际处分」 |
| **三枚灵石 → 六个月后家中钱 +3000、`reserve` 不变** | 状态 | `tests/life-richness.test.mjs`（5 个月未到账 / 第 6 个月到账） |
| 无溢出；主栏无活动磁贴 / 家眷面板 / 道具按钮 | DOM | 网页专属 |
| 刷新后存档逐值恢复 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |

### 1.4 `verify-mundane-browser.mjs`（凡人世事）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 静态服务器吐出文件与源码逐字节一致 | DOM | 网页静态产物 |
| 出生态 == 引擎态、`rulesVersion===11` | 状态 | `tests/mundane-life.test.mjs` |
| 页面出现「钱粮与家产」面板 | DOM | ⇒ 改问**规则层**（钱粮账与家产）；见 §4 缺口 ① |
| **页面能看见实际结识的每个人名** | DOM | ⇒ 改问**规则层名册**；见 §4 缺口 ① |
| **`m11_*` 卡（正文 + 选项）不含 `\d+%`** | 状态 | ⚠ **原为部分（只量正文）⇒ 本轮补上选项** |
| 刷新后存档逐值恢复 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |
| **自然迟入：走到 `m11_gift_3` 且境界 ≥ 1** | 状态 | ⚠ **原为 NONE ⇒ 本轮补进 `tests/mundane-life.test.mjs`** |
| **收殓路线永远走不到 `m11_corpse_2`** | 状态 | ⚠ **原为 NONE ⇒ 本轮补进 `tests/mundane-life.test.mjs`** |

### 1.5 `verify-progression-browser.mjs`（进阶线）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 六岁前三段童年经历都发生 + 首个童年抉择前 ≥3 条自动旁白 | 状态 | `tests/progression.test.mjs`（逐条对应） |
| 围城 → 扎营 → 新山门；公库扣款与玩家灵石分开 | 状态 | `tests/progression.test.mjs`（`'ward'` 那条） |
| **`'teach'` 公库扣 6 枚、`'lead'` ⇒ `role==='leader'`** | 状态 | ⚠ **原为 NONE ⇒ 本轮补进 `tests/progression.test.mjs`** |
| 多年行动整程 72 个月、途中不发材料 | 状态 | `tests/progression.test.mjs` |
| 长行动结束后行囊里真的有 `condensation_book` | 状态 | `tests/progression.test.mjs` |
| 元婴人生：渡劫前不许用 `dao`，`prepare` 后才解禁 | 状态 | `tests/progression.test.mjs` |
| `sceneFor(s)` 与页面 `data-scene` 一致 | DOM | 网页专属 |

### 1.6 `verify-revision9-browser.mjs`（规则九）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 服务器吐出的文件与源码哈希一致 | DOM | 网页静态产物 |
| 新人生 == 源码引擎；自动抉择默认关 | 状态 | `scripts/test-xianxia-mp.mjs`「自动抉择默认关闭」 |
| 「稍后」/ Escape 取消自动抉择：不推进时间、不消耗随机数 | DOM | 取消是纯 UI 状态，引擎没有「取消」这个 API；**cursor 语义**由 `tests/revision9.test.mjs` 守 |
| 自动选择 == 独立纯策略算出的那一个；只挑可用项；cursor 恰好 +1 | 状态 | `tests/revision9.test.mjs`（逐条对应） |
| 重载后策略开关与 cursor 复原 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |
| 关掉自动后手选不被顶掉、cursor 保持 | 状态 | `tests/revision9.test.mjs` |
| 师兄以全卷换隐瞒，再另起一年苦修才登记新心法 | 状态 | `tests/revision9.test.mjs`（逐条对应） |
| 矿役线：两段相关经历、没有丹药、中途撤出、之后还有回访 | 状态 | `tests/revision9.test.mjs`（逐条对应） |
| 手机视口不溢出、无报错、无外部请求 | DOM | 网页专属 |

### 1.7 `verify-story-network-browser.mjs`（宗门网络）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 真实童年抉择落库并改前因 | 状态 | `tests/story-network.test.mjs`（逐条对应） |
| 日志结果可读停留、月份不前进 | DOM | 停留是网页行为；「有抉择时时间冻结」由 `tests/adventure.test.mjs` 守 |
| 试任真正完成才授职 | 状态 | `tests/story-network.test.mjs`（逐条对应） |
| 换功法要真的练满十二个月 | 状态 | `tests/story-network.test.mjs`（逐条对应） |
| 雷达五轴标签、5 轴 | DOM | 源同源断言在 `tests/radar.test.mjs`（小程序端 canvas 与喂图两份代码比对） |
| 往回滚旧日志会暂停播放 / 点一下回到最新 | DOM | 网页专属 |
| 重载后宗门网络、当前心法、职位都还在 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |

### 1.8 `verify-story-rules10-browser.mjs`（规则十）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 服务器吐出文件逐字节一致 | DOM | 网页静态产物 |
| 出生态 == 引擎态、`rulesVersion===10` | 状态 | `tests/story-rules10.test.mjs` |
| `sect_feud_0`：恰好两位管事登记在册；卡上写明「两宗长老」 | 状态 | `tests/story-rules10.test.mjs`（逐条对应） |
| `echo_friend` 卡写的是「病母」这件事 | 状态 | `tests/story-rules10.test.mjs`（逐条对应） |
| 刷新后存档逐值恢复 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |
| 无引气资格 ⇒ 境界必须为 0 | 状态 | `tests/story-rules10.test.mjs`；`scripts/audit-story-rules10.mjs` |
| 旧友线：暂缓后仍能续上 | 状态 | `tests/story-rules10.test.mjs`（逐条对应） |
| 无灵根人生：境界 0 且没有心法 | 状态 | `tests/story-rules10.test.mjs`（逐条对应） |
| 页面上能看到那些名字 | DOM | 网页专属 |

### 1.9 `verify-story-rules12-browser.mjs`（规则十二）

| 断言 | 类 | Node 侧覆盖 |
| --- | --- | --- |
| 服务器吐出文件逐字节一致 | DOM | 网页静态产物 |
| 出生态 == 引擎态、`rulesVersion===12` | 状态 | `tests/story-rules12.test.mjs` |
| 页面显示的选项 id 列表 == 引擎 `options()` 的 id 列表 | DOM | 渲染保真（网页专属）；小程序侧是结构保证：`view-model.js` 直接用 `engine.options(run).map(...)` |
| 决策卡正文 ≤ 160 字 | 状态 | `scripts/verify-event-expressions.mjs` §3（**≤ 90 字**，更严，覆盖它） |
| 无关师承选项完全隐藏 | 状态 | `tests/story-rules12.test.mjs`（四条道路逐一断言） |
| 刷新后存档逐值恢复 | 状态 | `tests/adventure.test.mjs`；`scripts/test-xianxia-storage.mjs` |
| 人生跑完、无报错、不溢出 | DOM | 结束态由 `scripts/audit-story-rules12.mjs` 守 |

---

## 2. 五道 Node 测试对网页端的依赖（删网页端前必须搬）

| 测试文件 | 原来 import / 读什么 | 现在改成问什么 |
| --- | --- | --- |
| `tests/radar.test.mjs` | `abilityRadar()`（网页端 SVG 雷达） | 小程序端 `art/radar.js`（canvas）+ `bridge/view-model.js`；**补上旧档没有「体魄」时的画法** |
| `tests/decision-clarity.test.mjs` | `lifePanels()`（网页端面板 HTML） | 小程序端 `bridge/view-model.js` 的 `practice` / `statusPanel` / `inventory` + `life.wxml` 的面板标题 |
| `tests/mundane-life.test.mjs` | `lifePanels()`（含「钱粮与家产」） | 规则层（`mundanePeople` / `mundane(s).money`） |
| `tests/story-rules10.test.mjs` | `practicePanel()`（网页端修行本事面板） | 规则层 `rootLabel()` / `rootDescription()` |
| `tests/story-rules12.test.mjs` | `lifePanels()`（含「炼气圆满」「寿元上限 N」） | 小程序端 `practice()`（`realm` 与 `hint`） |

> 新增 `tests/helpers/mp-view.mjs`：装载小程序端的 CommonJS 视图模型
> （本仓库是 `"type": "module"` ⇒ 不能直接 `require()`，要用 `vm`）。

---

## 3. 本轮补进 Node 侧的 6 条断言（原来没人守）

| # | 断言 | 落在哪 | 反向验证 |
| --- | --- | --- | --- |
| 1 | 285 张卡的所有选项名 / 提示语（含表达域那份）都不泄露内部成功率 | `scripts/verify-event-expressions.mjs` §5.5 | ✅ 注入 `成功率 40%` ⇒ 报红 |
| 2 | 凡人线 `m11_*` 卡的**选项**也不含百分比（原来只量正文） | `tests/mundane-life.test.mjs` | ✅ |
| 3 | 自然迟入：`m11_gift_3` 真的出现，且境界 ≥ 1 | `tests/mundane-life.test.mjs` | ✅ |
| 4 | 收殓路线**永远走不到** `m11_corpse_2` | `tests/mundane-life.test.mjs` | ✅ |
| 5 | 地图标的「当前所在」与存档一致（期望值**不从 `mapView()` 拿**） | `tests/story-rules12.test.mjs` | ✅ |
| 6 | `'teach'` 公库扣 6 枚、玩家灵石不动；`'lead'` ⇒ `role==='leader'` | `tests/progression.test.mjs` | ✅ |

---

## 4. 已知缺口（**不是**门禁能关掉的，是产品真的缺）

> 这些是「网页端有、小程序端没有」的内容。删网页端就暴露出来了。
> 登记在 `docs/story-gap-ledger.md`，随阶段 3（剧情结构）一起补。

### 缺口 ① · 凡人线结识的人，没有在小程序端落屏

- **网页端**：`life-panels.js` 的 `personRows()` 会把 `mundanePeople(s)` 逐个人名画出来。
- **小程序端**：`bridge/view-model.js` 的 `people()` 只列 **家人 / 后代 / 旧相识 / 同行者**，
  **没有凡人线的人**（药铺师傅、同住的伙计、雇主…）。
- **钱粮**部分还在：小程序端「灵石与家产」面板的说明写着「平日工钱用铜钱结算…」，
  家产（家中旧屋）也列着 —— **只是钱粮的具体数字没显示**。
- **处置**：阶段 3.3（凡人线精简到 5 张）时一起补：凡人线的人物与钱粮要落屏。

### 缺口 ② · 「没有灵根也还能学什么」这句话，小程序端没有对应说法

- **网页端**：`life-panels.js` 画「你练的是防身剑术、认药与识字，不是御剑和术法。」
- **规则层有**：`packages/adventure/story-rules10.js` 的 `rootDescription(s)`。
- **小程序端**：没有引用 `rootDescription`，身份牌只显示灵根名。
- **处置**：阶段 3 顺带把规则层这句话接到小程序端的面板上。

---

## 5. 这次清理**没有**动的东西（避免误伤）

| 东西 | 为什么留着 |
| --- | --- |
| `apps/preview/pixel-style.js` | 小程序包的构建输入（`build-xianxia-mp.mjs` 的 `ALLOWED`）；也是画面门禁比对调色板的基准 |
| `apps/preview/cultivation-pixel.js`、`continent-atlas.js` | 画面锁定清单三文件之一（`vendor/xianxia-r12-art/baseline.lock.json`） |
| `apps/preview/reference/` | 官方 1in8b 逐字节副本（`provenance.json` 有哈希）；`art.cjs` 是生成 `pixel-style.js` 的源 |
| `apps/viz/` | 开发者面板（给我们自己看的），见交接文档 §9.1 选项 A |
| `reference/`、`vendor/` | 官方对照源与锁定快照，历史证据 |
