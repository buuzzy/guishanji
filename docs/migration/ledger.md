# 归山记 · 迁移台账

> 记录本轮迁移的来源、命令、结果与**未执行项**。
> 规则：没跑的项写「未执行 + 原因」，不要写成通过。

- 日期：2026-11-06
- 执行环境：macOS（arm64），Node 22.22.2，Git over SSH
- 迁移方案：[plan.md](plan.md)
- 分支：`migration/standalone`（`main` 仍停在迁移基线 `b519ac06`）

## 0. 实施前拍板的事

| 项 | 取值 |
| --- | --- |
| 新仓库 | `buuzzy/guishanji`（**私有**） |
| Git 历史 | 导入 `xianxia-life` 的 `feature/adventure-preview-v01` **完整历史**（13 个提交，HEAD = `b519ac06`） |
| 本轮范围 | 方案**阶段 0 – 3**（阶段 4–7 另轮） |
| 推送授权 | 用户已授权创建仓库并推送 |

## 1. 来源基线（实施当天重新核对过）

| 来源 | 分支 | 提交 | 说明 |
| --- | --- | --- | --- |
| `buuzzy/xianxia-life` | `feature/adventure-preview-v01` | `b519ac066a3499e0aced0fd9b5bd15ae855c3c49` | 本仓库 Git 历史的来源；tree = `c780c6c425f0dda82a09d7a6a0d3bfa6b4878e06` |
| `buuzzy/1in8b` | `main` | `10fb833ed86b27e48718ccac94757445dccc9515` | 小程序适配代码与锁定快照的来源 |

- `xianxia-life` 的 PR #2 状态：`refs/pull/2/head` = `b519ac06…`（**仍未合并**，本轮不擅自合并）。
- 两个来源仓库都打了本地备份标签 `migration/source-2026-11-06`（**未推送到那两个仓库**；
  需要时再推，不影响任何分支）。

## 2. 阶段 0：锁定来源与保护工作区

| 检查 | 结果 |
| --- | --- |
| 两仓库 HEAD 重新读取 | ✅ 与方案一致 |
| 工作区无未保护改动 | ✅ `1in8b` 工作区干净；`xianxia-life` 检出到 `b519ac06` 后干净 |
| 小程序锁的输入 vs 上游基线逐文件一致 | ✅ `vendor/xianxia-r12` **67/67**、`vendor/xianxia-r12-art` **3/3** 个模块，逐字节等于本仓库 `packages/`+`content/`+`apps/preview/` 的同路径源文件 |
| 来源清单 | ✅ `docs/migration/source-manifest.json`，按「未改动 / 有意改动 / 换位置 / 新增」四组登记 |

## 3. 阶段 1：创建新仓库并迁入共享源码

| 项 | 结果 |
| --- | --- |
| 新仓库 | `buuzzy/guishanji`，私有，13 个上游提交完整保留 |
| 迁入内容 | 小程序分包 52 个文件、锁定快照 70 个文件、构建链 3 个脚本、门禁 6 个脚本、官方对照源 8 个文件、实施文档 2 份 |
| 逐字节核对 | ✅ `node scripts/verify-migration-import.mjs` → 未改动 119 + 有意改动 14 + 换位置 4 + 新增 29，**全部一致** |
| 依赖合并 | ✅ `acorn` / `terser` / `@babel/core` + 两个 babel 插件；`package-lock.json` 已生成（51 项） |

## 4. 阶段 2：独立网页（详见 [web-cleanup.md](web-cleanup.md)）

| 项 | 结果 |
| --- | --- |
| 根入口 | ✅ `/` 与 `/index.html` → 归山记页面；`/preview/` 兼容保留；`/apps/web/index.html` → 404 |
| 开发期文案 | ✅ 「修仙一生 · HTML 试玩」→「修仙人生」；页脚去掉「V0.1 试玩候选」 |
| 旧 `apps/web` 下线 | ✅ 依据**实际 import 图**判定出 20 个只服务旧产品的模块，**移入 `legacy/old-web/`**（保留历史，不删除） |
| 旧测试 | ✅ 移入归档且**仍跑得通**（49/49 单元、26/26 与 11/11 浏览器门禁），已从门禁清单里摘掉并注明原因 |

## 5. 阶段 3：独立小程序（详见 [miniprogram-standalone.md](miniprogram-standalone.md)）

| 项 | 结果 |
| --- | --- |
| 启动层 | ✅ `app.js`（极薄：不加载引擎、无 `engineReady` 屏障、不联网）、`app.json`、`sitemap.json`、首页、说明页、隐私页 |
| 1in8b 运行依赖 | ✅ 两个 `wx.reLaunch('/subpkg/engine/...')` 兜底改跳新产品首页；全仓扫描只剩**注释里的历史说明**，无运行引用 |
| 全局样式 | ✅ `app.wxss` 由 `reference/official/app.wxss`（官方设计系统逐字节副本）逐条提取，34,280 → 23,298 字节 |
| 同源构建 | ✅ 构建来源 = 本仓库 `packages/`+`content/`+`apps/preview/pixel-style.js`；`vendor/*` 降级为历史证据 |
| 迁移等价性 | ✅ 新产物与「迁进来时那份」除文件头注释外**逐字节一致**（`engine.js` 1,737,779 B、`pixel-style.js` 4,496 B），基线留在 `reference/migrated-runtime/` |
| 来源登记 | ✅ `build-manifest.json` 分 `source`（本仓库）与 `upstreamOrigin`（上游 `b519ac06…`）两段，如实写「同一批字节的两个来源」 |

### 5.1 改造中发现并修掉的三个真问题

1. **官方 `app.wxss` 的注释里含 `}`** ⇒ 按花括号切规则会错位、生成坏 CSS。修法：先做注释掩码再切。
2. **本仓库 `package.json` 是 `type: module`** ⇒ 门禁里 `require()` 小程序文件必炸。修法：用 `vm` 装载并带模块缓存。
3. **人生页原来接的是 `lives[0]`（最老那段人生）** ⇒ 首页「继续人生」会跳到很久以前。改为接**最近动过**的那一段，并支持 `?resume=<编号>` 点名。**这是行为变化，真机需确认一次。**

### 5.2 七道小程序门禁（已挂进 `scripts/run-regression.mjs`）

| 名字 | 结果 |
| --- | --- |
| `xianxiabuild` | ✅ 29 / 0 |
| `xianxiaeq` | ✅ 14 / 0（12 种子、6452 个月、215 决策点逐值相同） |
| `xianxiastore` | ✅ 25 / 0 |
| `xianxiaart` | ✅ 18 / 0 |
| `xianxiamp` | ✅ 194 / 0（含首页仿真 13 条） |
| `xianxiastyle` | ✅ 58 / 0 |
| `xianxiastandalone`（新增） | ✅ 30 / 0 |

**反向验证 7/7 全部报红**：改产物字符 → build 红；改随机流初值 → equivalence 红；改分包 root → mp 红；
改存档命名空间 → storage 红（23 次越界）；改 `app.wxss` 字号 → style 红；改画布宽 192→193 → art 红；
首页塞一个 `/subpkg/engine/...` 字符串 → standalone 红。

## 6. 全量回归（最终一次，跑在最终工作树上）

```sh
CHROME_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  node scripts/run-regression.mjs
→ EXIT=0
REGRESSION PASS · preview-assets:0 check:0 unit:0 mundane-unit:0 rules12-unit:0
rules12-audit:0 mundane-audit:0 story-audit:0 life-simulation:0 build:0
adventure-browser:0 decision-browser:0 network-browser:0 progression-browser:0
revision9-browser:0 rules10-browser:0 mundane-browser:0 rules12-browser:0
family-browser:0 static-build:0 adventure-static:0 decision-static:0 network-static:0
progression-static:0 revision9-static:0 rules10-static:0 mundane-static:0
rules12-static:0 family-static:0 import:0 xianxiabuild:0 xianxiaeq:0
xianxiastore:0 xianxiaart:0 xianxiamp:0 xianxiastyle:0 xianxiastandalone:0
```

**37 / 37 全绿**（快组 18 道 + 浏览器组 19 道）。
浏览器门禁跑在 **Microsoft Edge（Chromium）** 上（本机没有 Google Chrome）。

## 6.1 CI 上踩到的三件事（都不是代码 bug）

| 现象 | 真因 | 处理 |
| --- | --- | --- |
| Windows 上只有第一道浏览器门禁红，报「独立 Chrome 调试入口未启动」，同一台机器后面 17 道全过 | Chrome **冷启动慢**（首次建 profile + 杀软扫描），10 秒等待不够 | `scripts/lib/browser.mjs`：等待 10 → 30 秒，且失败时换新 profile **重试一次** |
| macOS 连续两轮「被取消」 | 撞了 45 分钟 job 超时（`The operation was canceled.`），不是失败 | 超时放宽；更重要的是把回归**拆成快组 / 浏览器组两个独立 job** |
| macOS runner 跑不完 18 道浏览器门禁 | macOS runner 约比本机慢一倍 | 见下：CI 改成两个 job |

**CI 现在的结构（解决「盲等」）**：

- `fast` job（18 道：单元测试 / 静态检查 / 七道小程序门禁）—— 几分钟出结果；
- `browser` job（19 道浏览器门禁）—— 独立跑、独立超时；
- 回归脚本现在**实时打印每一道门禁的 PASS/FAIL 与耗时**，GitHub 网页端边跑边看；
- 还能单跑一道：`node scripts/run-regression.mjs --only=<名字>`；列清单：`--list`。

⚠ **实测不要用 `--parallel`**：两路 Chromium 抢 CPU，单道门禁从 1–3 分钟变成 6–12 分钟，
整体反而更慢（本地并行 40 分钟没跑完，串行只要 28 分钟）。

## 7. 本轮**未执行**的项

| 项 | 原因 |
| --- | --- |
| 微信 IDE **真编译与包体台账** | 本机有开发者工具，CLI 也连上了，但 IDE 拒绝打开占位 AppID（`不存在此 AppID`）⇒ **必须先有正式 AppID**。仓库原始字节仅供参考：主包 69,056 B、分包 2,007,168 B（其中 `engine.js` 1,738,682 B）——**这不是上传体积**（历史上预压缩省了 207 KB 仓库字节，编译后只差 990 字节） |
| 阶段 5 玩家存档迁移（导出/导入） | 协议已设计（[storage-migration.md](storage-migration.md)），**实现未做**；端到端验证需要新 AppID |
| 阶段 6 新产品发布 | 新 AppID / 域名 / 微信后台配置均未准备（属用户与后台操作） |
| 阶段 7 清理 1in8b | 必须等新产品发布后按三步下线顺序做，**不能提前删**（否则玩家失去导出机会） |
| `xianxia-life` PR #2 的合并与归档 | 方案 §10.6：不擅自合并；新产品稳定后再决定 |
| 网页端部署（预览环境 / 正式域名） | 需要域名与部署授权 |

## 8. 需要用户/运营决定的事

- [ ] 新小程序 **AppID**（`project.config.json` 现在是占位值 `touristappid`，上传前必须换；**绝不能沿用 1in8b 的 `wxbbf73e87e970cda8`**）
- [ ] 新网页的预览地址与正式域名、部署平台
- [ ] 产品说明与隐私声明的正式文案（`miniprogram/pages/legal/` 现在是占位内容，缺运营主体/联系方式/备案号）
- [ ] 网页端存档键 `ADVENTURE_KEY` 仍是 `shanhai.adventure.v01` —— **本轮有意不改**（换了会让玩家现有存档失联），是否改由你定
- [ ] 旧入口的迁移说明文案、导出通道与下线窗口（天数由运营确认）
- [ ] 是否把 `migration/source-2026-11-06` 标签推送到两个来源仓库
- [ ] 真机确认一次「继续人生」接最近那段人生的行为变化
