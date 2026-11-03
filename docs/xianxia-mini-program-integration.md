# 归山记接入 1in8b 微信小程序手册

更新时间：2026-11-03。本文是实施手册；本次交付仅包含 HTML 试玩源码、验收记录和本文，小程序接入尚未实施、编译或上传。

## 1. 交付基线与开始方式

接收方在现有 Mac 仓库拉取对应 PR 分支即可，不需要压缩包，也不要求重新 clone。先检查 `git status --short`；有未提交工作时先提交或自行保存，避免覆盖。两个仓库各有用途：

| 仓库 | 交付分支 | 用途 |
|---|---|---|
| `buuzzy/xianxia-life` | `feature/adventure-preview-v01` | HTML 试玩和同源修仙规则、内容、测试 |
| `buuzzy/1in8b` | `docs/xianxia-mini-program-integration` | 实际小程序仓库中的接入手册；仅文档 |

接入前，1in8b 应以当前 GitHub main `fe68acb58dff38459a8e8a736b802f6109a02f25` 或其后代为基础。该版本已经把小程序引擎升级到 v0.9.8，法律页仍保留 v0.8.51 来源，Web 静态快照为 v0.9.8。证据见 `docs/miniprogram-v0.9.8-upgrade-plan.md`、`vendor/mp-engine-snapshot.json` 和 `web-snapshot.json`。本机较旧 checkout 不能当接入基线。

本次通过 GitHub 精确提交读回了 app、boot、engine-loader、index/life 页面、storage/platform、两个 Canvas 组件和验收脚本。手册中的“现有”指上述代码；“待新增”指实施时才创建的代码，不能把本手册当成已经完成接入。

修仙候选采用 `rulesVersion=8`，封套仍为 preview.4。验收见 [xianxia-life 交付分支的规则8记录](https://github.com/buuzzy/xianxia-life/blob/feature/adventure-preview-v01/docs/adventure-rules8-verification.json)：162 项测试、400 次模拟人生、18 阶段回归通过，包含源码与静态构建浏览器操作。它证明 HTML 候选的现有行为，不证明微信真机、审核、真人留存或最新反馈已经解决。

Mac 先在 xianxia-life 中体验这一交付：

```sh
git fetch origin
git switch feature/adventure-preview-v01
git pull --ff-only origin feature/adventure-preview-v01
node scripts/serve.mjs --port=8877
```

打开 `http://127.0.0.1:8877/preview/`。Node 要求 ≥22.4；试玩不需要安装运行依赖。若本地还没有该分支，fetch 后 `git switch --track origin/feature/adventure-preview-v01`。实施小程序时，在 1in8b 最新 main 上另建接入分支；本次不自动合并 PR，也不部署正式 Web。

## 2. 产品入口：原游戏内增加模式

现有启动页是 `miniprogram/pages/boot/boot`，它通过 `engine-loader.js` 等待官方引擎，再由用户点击进入；不能取消这次点击或改回自动跳转。实际首页在 `subpkg/engine/pages/index/index`。

第一版只在 index 的现有开始/继续区域附近增加一张沿用现有样式的“归山记 · 修仙人生”入口卡。点卡后进入修仙命盘，随机出生、自动开局；已有修仙人生时提供继续与另开一生。原 1in8b 的开始和继续仍读取原人生。life 更多菜单中的切换入口可后续增加，切换前必须保存并停止该页循环。

先把修仙入口加在 index，不改 boot 路由、默认继续逻辑或分享冷启动，是最小的接入步骤。首轮修仙不承诺人物分享、追思馆联网或跨端导入；只复用与本地模式相容的功能。

## 3. 分包布局与加载

现有 `app.json`：主包只有 boot；engine 有页面；data/data2/ldata/logic/logic2/logic3 是带 entry 的无页面分包。增加一个**普通分包**，不是 independent 分包：

```json
{
  "root": "subpkg/xianxia",
  "name": "xianxia",
  "pages": ["pages/roll/roll", "pages/life/life", "pages/past/past"]
}
```

此段追加到现有 `subPackages`，不能替换整个 app.json。初期把修仙页面、规则 bundle、专用组件和样式放在同一个包；实际编译超预算时，再按有证据的依赖边界拆分。HTML 构建总体积不是微信编译包体，不能据此保证一个分包装得下。

待新增布局：

```text
miniprogram/subpkg/xianxia/
  pages/{roll,life,past}/             页面四件套
  runtime/engine.js                  同源生成的 CommonJS 逻辑
  runtime/build-manifest.json        源提交、文件哈希、规则版本
  bridge/{session,view-model,storage,clock}.js
  components/{scene,atlas,abilities}/
  art/                              提取出的纯绘制模块
  styles/                           由现有样式受控复用的分包内 WXSS
scripts/build-xianxia-mp.mjs         待新增的独立构建入口
```

主包不能同步 require 分包，普通分包也不能默认同步 require 另一分包的 JS。跨包异步 JS 应用官方 `require.async`；跨分包组件须有官方要求的占位配置。首轮不依赖这种组件跨包特性：纯视觉模板与必要 WXSS 同源生成到修仙包，组件内部不得引用官方 engine/view/api。不要把大型规则和样式上移主包来绕过依赖限制。

index 点击入口可直接 `wx.navigateTo` 到修仙页，由导航下载页面所在分包；设置防重复点击与失败提示，失败允许重试。修仙页面创建自己的 session，不经过官方 engine-gate 求取修仙状态。需要多包时，新增自己的缓存 Promise 加载器，加载失败清理失败缓存，重试不得重复初始化人生。

现有无页面官方包曾在 preloadRule 编译中失败，已有 `check-mp-preload-rule.mjs` 守卫。首轮不增加预下载；如果后续为有页面的 xianxia 添加预下载，须同步调整该门禁并在实际工具中证明可用，不能绕过检查。

## 4. 具体复用清单

| 现有实现 | 复用方式 | 必须适配的边界 |
|---|---|---|
| index 命盘/开始、`pages/roll` | 保持轮盘与随机出生交互、主题样式 | 修仙大陆、家庭、姓名、灵根来自修仙出生模型 |
| life topbar、更多菜单、暂停、倍速 | 沿用交互和布局 | 接修仙 clock/session，不能调用官方 tick |
| life 决策卡、选择按钮、收起/展开 | 同样的卡片、危险提示和自动倒计时 | 接修仙 options/choose，不展示后台概率和未来结果 |
| life feed、展开历史、星标 | 从新到旧、分段展示 | 使用修仙稳定日志 ID，星标独立保存 |
| engine/styles 下的 theme/life/sheet | 小范围受控复用外壳与间距 | 保持 rpx，生成到本分包并记录来源；不重做设计系统 |
| `miniprogram/ui/safe-area.js` | 复用安全区处理 | 不把 DOM 测量方法照搬 |
| `miniprogram/art/pixel.js` | 复用纯色板、像素基础画法 | 确认其依赖是纯模块、主题一致 |
| `components/px-scene` | 复用节点获取、DPR、场景指纹方法 | 新建修仙场景组件，不能覆盖官方绘图或同步引用 room-art |
| `components/world-map` | 复用点阵外观、配色、容器 | 新建大陆/路线模型；现组件依赖地球国家和官方 engine |
| app prefs/音乐 | 可复用主题、安全区及已明确的偏好 | 修仙自动抉择、当前人生、速度单独保存；不要迁入未经授权的新音源 |
| app.saveCurrent、Past/纪念记录 | 只参考其交互 | 不复用官方数据保存或联网供奉路径 |

HTML 的 `life-panels.js` 返回 HTML/SVG 字符串，需要转 WXML 和数据模型。五轴能力图可用专属 Canvas；专业技能仍用现有刻度，行囊保持简洁标签，人物关系统一用“人物与牵挂”。不得把 HTML 页面套进 web-view 作为本次原生接入结果。

## 5. 同源引擎与构建合同

规则来源是 xianxia-life 的 `packages/adventure/`、`content/` 和它们实际引用的 core random 模块。采用一份源代码生成微信 CommonJS bundle，不手抄第二套事件表。与官方 `scripts/build-mp-engine.mjs` 完全分开；不修改官方 vendor、抽取器、既有产物或内容退役清洗。

待新增 build 接收明确的源 checkout 路径，记录源提交、源码是否干净、所有输入 SHA256、rulesVersion 和输出 SHA256。输入路径禁止依赖当前 Windows 绝对目录。源未提交或哈希不匹配时停止生成；同一输入应产生相同输出。调用命令形式约定为：

```sh
# 待 build-xianxia-mp.mjs 实施并验证后才可执行；当前尚不存在
node scripts/build-xianxia-mp.mjs --source=../xianxia-life --check
node scripts/build-xianxia-mp.mjs --source=../xianxia-life
```

构建做 ESM→CommonJS，并按仓库现有 ES2019 解析与 `es2015-downlevel.mjs` 约束降级。不能通过关闭 es6/enhance 来减少包体；现有项目有模块注册失败的历史证据。?.、?? 可由现有 Babel 工具链处理；`Object.hasOwn`、`structuredClone`、`replaceAll`、Error cause 等**运行 API**不会因语法降级自动可用，应对实际依赖逐个兼容或替换。不能照搬浏览器 crypto.randomUUID；新 ID 使用独立平台适配，不改变已存 seed 或模拟随机流。

不把 `apps/preview/app.js`、DOM、navigator.locks、浏览器 localStorage、Node fs、HTML markup、服务器脚本打进运行 bundle。Canvas 模块单独提取，规则不引用绘图。首轮独立微信新档可以只接受规则8；但若 bundle 保留原引擎的旧规则 imports，就必须完整闭包打包，不能留下缺失模块。以后支持 HTML 旧档导入，需要先实现并验证全部冻结规则及迁移合同；不能同时删旧规则、又宣称能继续原档。

## 6. 状态和界面适配

现有修仙引擎公开 API：`createRun`、`advance`、`advanceToChoice`、`options`、`currentNode`、`nodeText`、`choose`、`validateRun`、`setActivity`、`travelTo`、`leaveExpedition`、`review` 等。参数与返回值以源函数及测试为准，首次接入建立包装层，不假设所有操作都返回同一种状态：

| 界面动作 | 包装层调用 | 规则 |
|---|---|---|
| 随机出生 | createRun | 一次生成 seed/birth/NPC，重新渲染不得重抽 |
| 时间推进 | advance | 整数月；非抉择经历照常出现 |
| 打开决策 | currentNode、nodeText、options | 只用角色当前已知信息和有效选项 |
| 手动/自动选择 | 同一 choose 包装 | 再校验 pending ID、选项可用性，防止双击重复结算 |
| 调整重心 | setActivity | 遵守闭关、被看管和长事件限制 |
| 旅行/退出探索 | travelTo、leaveExpedition | 沿实际路线结算，取消尚未完成奖励 |
| 完结回顾 | review | 独立保存修仙前世，不写官方纪念记录 |

修仙 session 的 state 保存完整引擎状态；它不能被赋给 `api.S` 或 app.globalData 中的官方 current。view-model 纯查询只输出画面所需字段：年月、行动进度、属性、境界、技能、材料、个人灵石、公库、关系、当前位置、日志片段、决策和场景模型。查询与绘制不得消耗模拟随机数。

在 Page.setData 只发送当前视图模型，不发送完整随机流、全部冻结事件、所有历史或人物内存。复用 life 的快变/慢变差分：进度小补丁，日志、决策、属性、地图在签名变化时更新。首次显示6条经历，更多历史分批展示；稳定 log ID 防止新消息把玩家正在阅读的旧位置顶走。

## 7. 时间、阅读与生命周期

沿用现有 life 大约100ms 的逻辑循环和最多0.25秒的 dt 上限；小程序切后台不追补真实离线时间。onHide 停止逻辑与 Canvas、保存；onShow 只恢复一个循环并重置 lastTick；onUnload 清理 timer、回调和 session 引用。

修仙时钟需移植 HTML 的当前阅读节奏，而不是拿官方年龄速率直接替代。幼年经历与抉择、结果阅读停留、读旧日志暂停、关闭弹窗恢复都要保留。普通选择进入结果后应按阅读规则及时继续，不能新增固定1–2秒等待。

多年闭关、疗伤、隐匿用**整段行动平滑进度**，内部仍逐月调用同一结算路径。危机可中断；恢复只走剩余时间；提前结束不发尚未完成奖励。不能跳过几十年月结算后一次改年龄，也不能靠视觉高速循环年度条缩短后期。

平滑绘制可使用本页 Canvas.requestAnimationFrame 或受控视觉插值；画面时钟与逻辑月份分离。设上限保证一帧不塞入大量 setData；隐藏页面不继续绘制。材料、家资、宗门公库的收支必须来自引擎，不在 UI 额外发奖励。

## 8. 自动抉择的复用与待办

1in8b 当前 life 已实现自动抉择：`S.auto` 开启后，稳定决策约1200ms调用 `autoK`→`api.autoChoice`→统一 `onChoose`；收起卡片停止本次自动选择，重新展开再计时。

修仙采用相同菜单入口、等待、收起取消、关闭自动、手动抢先选择的交互。只复用计时和执行结构，**不调用官方 api.autoChoice**，因为两套选项状态不同。修仙策略尚未实施，应在用户反馈修订轮确定，并使 HTML 与小程序共用。

策略合同：只在当前 enabled 选项中选择；不读取后台成功率、下一阶段收益或未来死亡结果；随机策略使用自己的持久化选择随机流，不使用绘图或事件随机流。手动和自动都过同一 choose 校验，提交后立即使旧倒计时失效。保存开关、当前选择流和必要状态；离开页面或新 pending 出现时取消旧计时，恢复后不能用旧 ID 替玩家选。

第一版建议默认关闭、开启后各类决策均按确定的公开策略处理，包含可能死亡的选择；不要偷偷为危险事件挑“最安全答案”。需通过自动/手动同种子对照、双击与后台恢复验证；自动模拟结果不称为真人体验或留存。

## 9. 微信存档：必须重做持久化适配

官方 storage.js 给 localStorage 键加 `o8b.` 前缀，并调用 `content-retirement.cleanRaw`；app.saveCurrent/current/archive 也会清洗。它们不能直接接受修仙 state。官方当前 key 包括 `one8b.save.v3`、`one8b.lives.v1`、`one8b.past.v1`、`one8b.settings`，与桥接键可能并存，接入时都应保持隔离。

HTML AdventureStore 使用 `shanhai.adventure.v01`，最多3 MiB档案，另有 backup。微信官方文档规定单key最大1MB、全部缓存10MB；原HTML单键不能原样照搬，两个模式还共享同一缓存额度。

待新增存储层推荐 `xianxia.v1.*` 命名空间，按人生和代际分片，例如 manifest、life.<id>.<generation>.<part>、原始档备份。保守分片目标为UTF8序列化后≤512 KiB，不称为微信硬限制；用真实字节计算，不能依赖现有 platform.js 那个仅满足长度查询的 TextEncoder 占位。

写入顺序：校验 state → 写新代际全部片段 → wx.getStorage 实际读回并核对长度、hash和完整性 → 写两个交替的manifest槽之一 → 读回manifest → 才认可保存成功。manifest带单调revision、life/rulesVersion、分片数、hash与activeId；启动选最新且所有分片有效的一代，不只信一枚“当前指针”。这是应用层恢复协议，wx.storage 不提供多键事务。

写入中断、读回失败或额度不足时，保留旧manifest和完整旧代；不能先删除旧档腾空间。成功后只回收本命名空间中不再引用的代际，并保留最近一代可恢复备份。估算本次写入峰值须含现有官方缓存、新旧修仙两代与待保存日志；空间不足明确提示保存失败、允许导出/归档，不能清空官方数据或悄悄丢弃旧人生。

全生命周期保存用同一个串行写入队列；重要决策结算后即安排保存，避免只依赖onHide异步完成。后台/卸载时保证最新完整快照已进入恢复协议；同步fallback也必须有大小上限并实测，不用大JSON长期阻塞界面。明示“已保存”只发生在读回通过后。

微信首轮只建立新的修仙存档。HTML JSON跨端导入/导出作为独立后续能力；实现时校验产品、版本、大小和随机状态，升级只在副本上，保留原始字节。坏档不自动另开人生覆盖原文。存档隔离测试应记录官方全部键原文，修仙出生、保存、死亡、恢复后逐字节比较。

## 10. Canvas 与地图

现有 px-scene 是192×60、16:5；修仙 HTML 是192×108。保持同一色板、人物比例、像素硬边和卡片外壳，修仙组件使用16:9自身舞台，不为了复用把原场景拉伸。读取真实 scene model，境界、所在地、同行者、战乱、营地、重建、隐匿与渡劫分别对应现有修仙像素场景。

`apps/preview/cultivation-pixel.js` 含 document/DOM注册与绘制；提取为纯 `draw(ctx, model, palette, visualTime)`，由微信组件提供 canvas节点和尺寸。画布不依赖 global DOM、不消耗引擎随机流。

组件 ready 用 createSelectorQuery.select(...).fields({node:true,size:true}) 取得节点；按 wx.getWindowInfo().pixelRatio 设置实际width/height，统一逻辑坐标变换并关闭imageSmoothing。尺寸改变重建变换，避免多次scale累积。properties observer计算场景指纹，仅变化重画；动态场景使用canvas自身rAF，page hide/detached取消、show只恢复一套。缺节点重试有上限，失败不得无限轮询。

`continent-atlas.js` 分离大陆数据、状态投影、纯点阵渲染和点击坐标映射。不能用官方countryCode伪装四大陆，也不能把官方 world-map 的地球国家路径当修仙地图。主卡省略繁杂地形标注，保持1in8b点阵地图风格；路线弹窗再显示已知地点、可走路线、封锁和正在旅行的进度，未知目的地不泄露未来故事。

abilities 五轴读取悟性、胆识、仁心、心境、体力的实际值，轴标签固定、范围与引擎一致；不能把三项专业技能误画成五轴，也不能随机造数。人物死亡/离队、画面当前地区、公库与个人资产都应随引擎状态变化。

## 11. 实施步骤与完成标准

| 步骤 | 做什么 | 完成标准 |
|---|---|---|
| A 基线 | Mac拉取最新main、确认现有官方人生/存档/编译正常 | 原回归可复跑；记录工具、基础库、提交与源码指纹 |
| B 同源逻辑 | 新构建、接口包装、独立wx存档 | 同种子ESM/微信产物按月与选项逐值相同；故障恢复与隔离通过 |
| C 入口与最小人生 | index入口、命盘、自动年月、决策、死亡/回顾 | 原模式可继续；新模式无需每年点击；重复导航不多建人生 |
| D 视觉组件 | 样式外壳复用、关系/材料/公库、五轴、点阵大陆、专属Canvas | 与HTML候选行为对应，手机可读，暗色/安全区正常 |
| E 交互完善 | 重心、旅行、中断恢复、自动抉择、历史阅读 | 长事件地点过滤与年月一致；关闭/手动选择能取消自动 |
| F 包体与真机 | 干净编译、重新量包、预览和上传校验 | 每包达项目目标、总量合规；真机前后台/低性能无重复计时 |
| G 候选交付 | 更新台账、提交接入PR、Mac体验 | 记录真实结果与未测项，最后由用户决定审核/发布 |

步骤B应先于视觉搬运，避免做完页面才发现状态和存档混用。当前8条玩法反馈仍是候选待办；先在HTML确认修订，再固定源提交接入，避免将已知问题迁移进正式小程序。

## 12. 可以执行的现有检查

在 xianxia-life 交付分支，以下命令已存在：

```sh
node scripts/check.mjs
node scripts/run-regression.mjs --parallel
```

完整回归包含引擎/存档、400次人生、源码与静态浏览器。不要用 package.json 的简短 test 命令代替全量修仙回归。浏览器运行依赖机器可用的浏览器/CDP配置；错误应记录为未通过，不能把未运行写PASS。

在 1in8b 最新接入分支，先安装已有开发依赖，再跑现有门禁：

```sh
npm ci
node scripts/check-mp-syntax.mjs
node scripts/check-mp-bridge.mjs
node scripts/check-portability.mjs
node scripts/simulate-pages.mjs
node scripts/run-regression.mjs --with-browser
```

源码门禁通过不代表修仙已经受测试覆盖。实施时**待新增**并挂入回归：微信bundle等价测试、独立存档故障/隔离测试、入口加载失败与重复点击、修仙页面时钟/自动选择、Canvas生命周期/场景矩阵、地图可达路线、setData预算。已有 simulate-pages/mp-automate 的页面清单也须扩展到新增三页；原12页全绿不能作为修仙通过的证据。

Mac 有工具且已登录、开启服务端口后执行现有真实编译测量：

```sh
node scripts/measure-mp-package-size.mjs --label=xianxia-v01 --out=docs/mp-xianxia-package-size.json
node scripts/mp-automate.mjs --no-shot
```

measure脚本会按顺序清编译缓存、关项目、重开和preview，默认CLI路径为 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`；非默认安装用 `--cli=<实际路径>`。先阅读其缓存清理范围，关闭正在进行的工具操作。不要用旧包体报告或者 `--no-clean` 的对照数字代替新的正式测量。录入真实AppID与基础库私有配置但不提交凭据。

现有项目按每包≤2,097,152字节、总量≤20MiB守门，每包目标≤1,966,080字节、留128KiB是**项目余量目标**。本轮读取的官方使用分包页说明依赖规则，但没有列总量数字；这些字节阈值来源是项目当前测量脚本，实施时还要核对官方最新平台额度。bigPackageSizeSupport为true不能作为正式上传合格证明。测量报告必须记录原始与编译后体积、提交/树、源码指纹、IDE/基础库/实际配置和退出码；微信上传的后端检查是正式准入证据。

真机至少覆盖：Android和iOS、两模式各有未完人生、冷开修仙分包、断网首次下载失败/重试、后台返回、来电/锁屏、快速返回再进入、连点选择、自动选择中收起卡片、多年闭关遇急讯与撤离、死亡后恢复、额度不足/坏分片、主题切换和横竖屏尺寸变化。没有真机条件的项写未测，由Mac接收方补齐。

首轮分享不新增修仙路径；若以后开放分享，需改boot目标白名单并等待对应分包，路径不可直接携带完整存档或默认转回官方life。

## 13. 回退与发布

接入失败时移除新增入口与分包配置即可回到原玩法；保留修仙存档键用于后续恢复，不自动清理。官方引擎和默认路由应无修仙依赖。原存档、原回归和正式Web来源均需保持可核对。

新增玩法属于产品内容变化；此前已完成备案、申诉或审核不能自动覆盖这次新增内容。Mac可先预览、真机测试并提交接入PR，审核及发布按实际后台要求另行完成。本文没有承诺审核结果，也没有执行上传或发布。

## 14. 官方文档与本轮未解决反馈

以下官方页面在2026-11-03已真实读取，均返回HTTP200：

- [使用分包](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/basic.html)：普通分包依赖、页面与entry配置。
- [分包异步化](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/async.html)：require.async、跨包组件占位，基础库≥2.11.2。
- [Canvas](https://developers.weixin.qq.com/miniprogram/dev/api/canvas/Canvas.html)：Canvas节点、2D上下文、rAF/cancel，基础库≥2.7.0。
- [SelectorQuery.select](https://developers.weixin.qq.com/miniprogram/dev/api/wxml/SelectorQuery.select.html)：页面/组件节点查询。
- [wx.setStorage](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorage.html)：单键1MB、缓存总计10MB、保存与失败回调；开启encrypt会增加存储体积。
- [Page](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html)：onShow/onHide/onUnload、路由生命周期及高频setData注意事项。

当前反馈待下一轮设计与实现：凡人家庭出生资产来源；重复实时状态条；转师承的旧组织关系与消息来源；自动抉择；按专业和场景设计作弊选项；药库故事分层说明；隐瞒换功法的对价与因果；差灵根的长期困境与逐渐激烈的道路选择。本次源码提交保存当前候选，不把这些列为已修复。
