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

- `xianxia-life` 的 PR #2：~~仍未合并~~ → **2026-11-07 已合并**（main = `105da1f8`），
  随后该仓库已删除，见 §9。
- 两个来源仓库都打了本地备份标签 `migration/source-2026-11-06`（**未推送到那两个仓库**；
  需要时再推，不影响任何分支）。

## 2. 阶段 0：锁定来源与保护工作区

| 检查 | 结果 |
| --- | --- |
| 两仓库 HEAD 重新读取 | ✅ 与方案一致 |
| 工作区无未保护改动 | ✅ `1in8b` 工作区干净；`xianxia-life` 检出到 `b519ac06` 后干净 |
| 小程序锁的输入 vs 上游基线逐文件一致 | ✅ `vendor/xianxia-r12` **67/67**、`vendor/xianxia-r12-art` **3/3** 个模块，逐字节等于本仓库 `packages/`+`content/`+`apps/preview/` 的同路径源文件 |
| 来源清单 | ✅ `docs/migration/source-manifest.json`，按「未改动 / 有意改动 / 换位置 / 新增」四组登记 |

### 2.1 清单的两种刷新方式（两台机器各用一种）

清单里锁着每个文件的哈希 ⇒ **改了本轮自己写的文件**（`added` / `changed` / `moved` 组）后，
`import` 门禁会报红，必须刷新清单。两种刷新方式：

| 方式 | 命令 | 什么时候用 |
| --- | --- | --- |
| **完整模式** | `node scripts/gen-source-manifest.mjs --one8b=<1in8b 目录>` | macOS（本机有 1in8b）⇒ 顺便**重新核对来源** |
| **离线模式** | `node scripts/gen-source-manifest.mjs --offline` | Windows（**只有本仓库**）⇒ 只刷新本轮自己写的文件的哈希 |

⚠ 2026-11-07 起**完整模式不再需要 `xianxia-life`**（该仓库已删除，见 §9）⇒
只要 1in8b 在本机就能重新核对来源。

⚠ **离线模式故意不刷新 `unchanged` 组**：那一组的哈希含义是
「**与来源逐字节一致**」，凭据来自来源仓库 ⇒ 只有真的比对过来源才能刷新。
（第一版犯了这个错：改坏迁入的文件后跑一次离线就把证据抹了，门禁再也查不出来。已修正并做了反向验证。）

⇒ 也就是说：**在 Windows 上改了「本轮自己写的文件」，离线刷新即可；
   改了「迁进来的文件」，必须回 macOS 跑完整模式** —— 这是刻意的，
   不是漏洞。

⇒ 门禁报红时会**直接把该敲的命令打出来**，不用猜。

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
| **最后一轮 CI 的 6 个任务 0 步、2 秒就结束** | **GitHub 报：`The job was not started because recent account payments have failed or your spending limit needs to be increased.`** ⇒ **账户额度/付费问题，不是代码问题** | 需要人在 GitHub「Billing & plans」里处理；在此之前按方案 §8：**以本机实测为准，并把「job 没启动」和「代码失败」严格区分开** |

**CI 的证据边界（必须如实说）**：

- ✅ **Ubuntu**：全量通过（跑完了 37 道门禁，退出码 0）。
- ✅ **Windows**：修掉 Chrome 冷启动问题后，浏览器组与快组都通过。
- ⚠ **macOS**：前两轮都撞了 45 分钟超时（不是断言失败）；改成两个 job 之后**没来得及再跑一轮**
  —— 因为额度在这一刻用完了。
- ✅ **本机（macOS，Edge/Chromium）**：**37/37 全绿，退出码 0**（上面那条记录）。

⇒ **Windows 那台电脑必须自己再跑一遍同样的命令**，那是两端口径一致的最后一步：

```sh
git clone git@github.com:buuzzy/guishanji.git   # 或 git pull
cd guishanji && npm ci
node scripts/run-regression.mjs                  # 期望：REGRESSION PASS · 38 道全 0
```

⚠ **Windows 上如果 `import` 门禁报红**（说「新增文件与清单不一致」）：
那多半是你在 Windows 上改了**本轮自己写的文件** ⇒ 跑一次离线刷新即可：

```sh
node scripts/gen-source-manifest.mjs --offline
node scripts/run-regression.mjs
```

⚠ 但如果报的是「**未改动的 119 个文件**与来源不一致」⇒ 那是「迁进来的文件被动过」，
离线模式**查不出来**（这是刻意的，见 §2.1）⇒ **必须回 macOS 跑完整模式**核对。

### 6.2 macOS 这一档怎么办：**本机就是 macOS，本机跑就算**

GitHub 的 macOS 虚拟 runner 在这件事上**不比本机更有代表性**——它更慢、更干净但也更陌生。本机是真 macOS 26.4.1，
浏览器门禁就在真实系统上跑。所以 macOS 这一档的结论**以本机实测为准**，不需要等 GitHub。

配套改动：`scripts/lib/browser.mjs` 现在会**自动找 Chrome 或 Edge**
（macOS 的 Edge 路径、Windows 的 Edge 路径都列进去了），
所以两台机器都**不用设 `CHROME_BIN`**，直接 `node scripts/run-regression.mjs` 就能跑。
（之前本机必须手动带 `CHROME_BIN=.../Microsoft Edge`，Windows 那台同理。）

CI 仍然保留三系统：它的价值是「干净环境 + 自动」的交叉验证，不是因为 macOS 只能靠它。

**CI 现在的结构（解决「盲等」）**：

- `fast` job（18 道：单元测试 / 静态检查 / 七道小程序门禁）—— 几分钟出结果；
- `browser` job（19 道浏览器门禁）—— 独立跑、独立超时；
- 回归脚本现在**实时打印每一道门禁的 PASS/FAIL 与耗时**，GitHub 网页端边跑边看；
- 还能单跑一道：`node scripts/run-regression.mjs --only=<名字>`；列清单：`--list`。

⚠ **实测不要用 `--parallel`**：两路 Chromium 抢 CPU，单道门禁从 1–3 分钟变成 6–12 分钟，
整体反而更慢（本地并行 40 分钟没跑完，串行只要 28 分钟）。

## 7. 本轮**未执行**的项

### 7.1 微信 IDE 真编译与包体台账：✅ **已跑通（2026-11-06 16:13）**

`scripts/measure-mp-package-size.mjs`（本仓库独立入口，不依赖 1in8b 工作区）：
清 IDE 编译缓存 → `cache --clean compile` → 关项目重开 → `cli preview` 真编译 + 上传 →
从 `info-output` 读**编译后**每个包的字节数 → 写 `docs/mp-package-size.json` → 顺带出预览二维码。

#### 之前为什么一直失败：**不是 IDE 的毛病，是我们仓库自己太胖**

一开始的症状有两种，都长得像「IDE 坏了」：

- 弹「**编译进程崩溃**，请重启工具重试」；
- 弹「**模拟器长时间没有响应**，请确认你的业务逻辑中是否有复杂运算，或者死循环」。

IDE 后端日志里的真错是：`TaskService.runTask failed Error: spawn EBADF`（`fork` 编译子进程时坏文件描述符）。

排查过程（每一步都排除了一个猜测）：

| 排查 | 结果 |
| --- | --- |
| 网络 | ✅ 直连 `mp.weixin.qq.com` HTTP 200（**shell 里挂着 `HTTPS_PROXY=127.0.0.1:7897`，而 Clash Verge 没在跑 ⇒ 走代理的请求全断**；所有 IDE 命令都用干净环境启动） |
| AppID | ✅ IDE 认了：`✔ Using AppID: wx0675a9d47174331e` |
| 系统代理 / IDE 进程环境 | ✅ `scutil --proxy` 全 0，IDE 进程只带 `NO_PROXY` |
| IDE 缓存 / 完整重启 | ✅ 缓存已清、IDE 已重启，**仍然失败** |
| 同一个 IDE 打开**空白小程序** | ✅ **一次就编译成功、模拟器秒起** ⇒ IDE 本身没坏 |
| **同一个 IDE 打开 1in8b** | ✅ 能编译 ⇒ 不是「这台机器的 IDE 整体坏了」 |
| **仓库目录有多大** | ❌ **`.local/` 里 50,422 个文件、32 GB** ⇒ **就是它** |

**根因**：浏览器门禁（`scripts/lib/browser.mjs`）每次跑都往 `<repo>/.local/browser-XXXX/`
留一个 Chromium profile（Chromium 会往里写上百个文件），跑几十次就攒成 5 万多个文件、32 GB。
**微信开发者工具打开项目时会遍历整个项目目录**（算文件指纹、建文件监听）⇒ 被这堆文件压垮
⇒ 编译子进程 `spawn EBADF` ⇒ 弹出上面那两种报错。

⚠ 这个坑的特征是「**代码没问题、IDE 报错**」⇒ 第一次遇到会怀疑 IDE 版本、怀疑网络、
怀疑 AppID、怀疑代码，绕一大圈才想到「目录太大」。

**修法**（三处）：

1. `scripts/lib/browser.mjs`：profile 改放 `os.tmpdir()`，并且**关掉浏览器后连目录一起删**；
2. 清掉已经攒下的 `.local/`（32 GB → 仓库 43.9 MB，走系统废纸篓，可恢复）；
3. 新增第 8 道小程序端门禁 `scripts/test-repo-hygiene.mjs`（`repohygiene`）盯住：
   不许再有 `.local/browser-*`、仓库文件数 ≤ 20,000、总大小 ≤ 512 MB、
   源码里 profile 必须写 `os.tmpdir()` 且跑完要删。
   **已做反向验证**：造一个 `.local/browser-faketest/` ⇒ 门禁报红且退出码 1。

#### 实测结果（**本仓库自己的数**，不是参考值）

| 包 | 编译后字节 | 仓库原始字节 | 硬上限 2,097,152 | 余量 |
| --- | --- | --- | --- | --- |
| `main` | 32,018 | — | — | ✅ |
| `/subpkg/xianxia/` | 1,978,117 | 2,007,168 | 2,097,152 | ✅ 余 **119,035 B（5.7%）** |
| **合计** | **2,010,135** | 2,076,224 | 20,971,520（总包上限） | ✅ |

工具：微信开发者工具 2.02.2608080（Electron 36.6.0）/ macOS 26.4.1 / Node 22.22.2。
源码指纹、commit、树哈希都记在 `docs/mp-package-size.json` 里。

⚠ 再次强调：**仓库原始字节 ≠ 上传包体**（本仓库实测：分包原始 2,007,168 B → 编译后 1,978,117 B，
**编译后反而小了 29,051 B**；历史上预压缩省了 207 KB 仓库字节，编译后只差 990 字节）
⇒ **判据只能是 IDE 真编译的数**。

⚠ **余量只剩 5.7%**：下一版规则（rules13）之前必须先拆包或让上游出瘦身版，
否则上传会被微信拒（`exceed max limit 2048KB`）。

| 项 | 原因 |
| --- | --- |
| ~~微信 IDE 真编译与包体台账~~ | ✅ **已完成**（2026-11-06）：编译后主包 32,018 B / 分包 1,978,117 B / 合计 2,010,135 B，全部在上限内；预览码已出。详见 §7.1 |
| 阶段 5 玩家存档迁移（导出/导入） | 协议已设计（[storage-migration.md](storage-migration.md)），**实现未做**；端到端验证需要新 AppID |
| 阶段 6 新产品发布 | 新 AppID / 域名 / 微信后台配置均未准备（属用户与后台操作） |
| 阶段 7 清理 1in8b | 必须等新产品发布后按三步下线顺序做，**不能提前删**（否则玩家失去导出机会） |
| ~~`xianxia-life` PR #2 的合并与归档~~ | ✅ **已完成**（2026-11-07）：PR #2 已合并（main = `105da1f8`），来源仓库已删除。详见 §9 |
| 网页端部署（预览环境 / 正式域名） | 需要域名与部署授权 |

## 8. 需要用户/运营决定的事

- [x] 新小程序 **AppID** —— 已填测试号 `wx0675a9d47174331e`（2026-11-06）。
      ⚠ **AppSecret 不入库**（本产品完全单机，用不到密钥）；**绝不能沿用 1in8b 的 `wxbbf73e87e970cda8`**。
      正式发布前需要换成正式小程序的 AppID。
- [ ] 新网页的预览地址与正式域名、部署平台
- [ ] 产品说明与隐私声明的正式文案（`miniprogram/pages/legal/` 现在是占位内容，缺运营主体/联系方式/备案号）
- [ ] 网页端存档键 `ADVENTURE_KEY` 仍是 `shanhai.adventure.v01` —— **本轮有意不改**（换了会让玩家现有存档失联），是否改由你定
- [ ] 旧入口的迁移说明文案、导出通道与下线窗口（天数由运营确认）
- [x] 备份标签 `migration/source-2026-11-06` —— 已推到 **1in8b**（`refs/tags/migration/source-2026-11-06` → `10fb833e`）；
      `xianxia-life` 那个仓库 2026-11-07 已删除，标签随仓库消失，
      但**完整 Git 历史已存成本地 bundle**（`_archive/xianxia-life-git-2026-11-06-final.bundle`，验证过「complete history」）。
- [ ] 真机确认一次「继续人生」接最近那段人生的行为变化

---

## 10. 2026-11-07：移除 GitHub Actions（网页端暂不上线）

### 10.1 为什么删

| 理由 | 说明 |
| --- | --- |
| **网页端暂不上线** | 浏览器组 19 道门禁验的全是 `apps/preview`（实测 `verify-build` 明确读 `apps/preview`）⇒ 暂时用不上 |
| **额度/付费一直失败** | GitHub 原话：`The job was not started because recent account payments have failed…` ⇒ 任务 0 步 2 秒结束，CI 实际没在跑 |
| **小程序端覆盖一点不丢** | 小程序端 9 道门禁（`xianxiabuild` / `eq` / `store` / `art` / `mp` / `style` / `standalone` + `import` + `repohygiene`）**全在快组**，与浏览器组无关 |

### 10.2 删了之后，谁来保证

⚠ **没有 PR 自动闸门了** ⇒ **合并进 main 前必须手动跑**，并**确认退出码是 0**：

```sh
node scripts/run-regression.mjs --group=fast   # 小程序端相关 19 道（约几分钟）
node scripts/run-regression.mjs                # 全量 38 道（网页端上线前必须跑）
```

⚠ 测退出码别用管道：`node … > log 2>&1; echo $?`（管道后面 `$?` 取到的是 `tail` 的码，不是 node 的）。

### 10.3 ⚠ 这件事**证明不了**什么（必须如实说）

**CI 与门禁都证明不了「小程序能在微信里跑起来」。** 它们证明的是「代码在别的机器上算出来一样」。

- 小程序能不能真跑起来 ⇒ 只有 **IDE 真编译 → 预览码 → 真机扫码** 能证明；
- 包体多大 ⇒ 只有**本地 IDE 真编译**的数才准；
- 真机显示效果 ⇒ 只能真机看。

⇒ **网页端不上线时，真正该盯的是真机那一步**，不是 CI。

### 10.4 顺带清理

- `.github/workflows/ci.yml` 已删（`.github/` 目录随之清空）；
- 清单里 `.github/workflows/ci.yml` 的登记同步移除（`added` 组 30 → 29）；
- 文档与脚本注释里「CI 上不存在 ⇒ 假门禁」的说法改成「别的机器上不存在」——
  意思不变，但不再依赖一个已经不存在的 CI。

---

## 9. 2026-11-07：来源仓库下线与旧产物清理

> 目标：**本仓库自足** —— 网页版 + 小程序端都在这里，构建与门禁不依赖任何相邻目录。

### 9.1 为什么能删 xianxia-life：字节有三份保障

逐文件比对过（199 个文件）：

| 保障 | 位置 | 状态 |
| --- | --- | --- |
| 活代码 | `packages/adventure/` + `content/` + `apps/preview/` | ✅ 182 个文件**逐字节一致**，其余 17 个是同位置的更新版 |
| 锁定快照 | `vendor/xianxia-r12/`、`vendor/xianxia-r12-art/`（`baseline.lock.json` 记着 `b519ac06`） | ✅ 在库，且**被 build / art 门禁逐个核对** |
| Git 历史 | 本仓库历史含上游 **13 个提交**（rules8 / rules11 / rules12，逐个 sha 验证） | ✅ 在库 |

⇒ 删掉来源仓库**不丢任何字节**。

### 9.2 删之前做的四件事

| # | 做了什么 | 结果 |
| --- | --- | --- |
| 1 | 合并 rules12 的 PR #2 | `main` = `105da1f8`（含 `b519ac06`） |
| 2 | 打包备份 | `_archive/xianxia-life-2026-11-06.tar.gz`（工作树）+ `_archive/xianxia-life-git-2026-11-06-final.bundle`（**完整 Git 历史**，验证过「records a complete history」，含合并后的 main = `105da1f8`） |
| 3 | 推备份标签到 1in8b | `refs/tags/migration/source-2026-11-06` → `10fb833e` |
| 4 | 改清单脚本 | 完整模式只要 1in8b；xianxia-life 的 commit 写成常量 `b519ac06…` 长期留在清单里 |

⚠ **`import` 门禁不受影响**：它只读仓库内那份清单、比对现文件哈希，
**从来不需要来源仓库在场**（这一条 2026-11-07 已逐行核对脚本确认）。

### 9.3 清理掉的旧产物

| 删了什么 | 为什么能删 |
| --- | --- |
| `legacy/old-web/`（31 个文件 / 596 KB） | 旧 0.2.0 产品「山海一生」的完整快照，与归山记无关；历史仍在 git 里（`git log -- legacy/old-web`） |
| 5 个没人调用的孤儿脚本 | `register-rules11/12-verification`、`research-adventure`、`verify-adventure-browser`、`verify-rules12-post-review` —— 全仓检索无人引用 |
| 本地 `dist/`、`artifacts/`、3 个回归日志（17 MB） | 构建产物与日志，可重建；已进系统废纸篓（可恢复） |

⚠ **没删**（门禁正在用，删了立刻红）：`vendor/xianxia-r12*`、`reference/official/`、
`reference/migrated-runtime/`。

### 9.4 清理本身也被门禁盯住

`repohygiene` 新增 3 组断言（**反向验证 3/3 全部报红，退出码 1**）：

- `legacy/old-web/` 不许再出现；
- `vendor/xianxia-r12/`、`vendor/xianxia-r12-art/`、`reference/migrated-runtime/`、
  `reference/official/` 必须在；
- 代码里不许再出现指向已删 `xianxia-life` 的路径。
