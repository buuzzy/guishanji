# 网页端独立化：旧 0.2.0 产品下线与依赖清理

- 阶段：迁移「阶段 2」——网页端从 1in8b 迁出后，改造成独立产品「归山记」。
- 分析基线：`migration/standalone` 分支 HEAD `b519ac066a3499e0aced0fd9b5bd15ae855c3c49`。
- 结论：**旧 0.2.0 产品「山海一生」已下线；当前产品只有一个网页首页（归山记）。**

---

## 1. 判定方法（不靠文件名或版本号猜）

用**实际 import 图**判定，而不是看文件叫 `engine.js` 还是 `v1.js`。

做法：解析仓库里每个 `.js` / `.mjs` / `.html` 的静态导入（`import … from './x'`、
`import('./x')`、`import './x'`，以及 HTML 的 `src=` / `href=`），把相对路径解析成
仓库内真实路径，再从两个入口各做一次可达性遍历：

- 旧产品入口：`apps/web/index.html`、`apps/web/app.js`
- 当前产品入口：`apps/preview/index.html`、`apps/preview/app.js`

「可达集合 A 只出现在旧入口的遍历结果里」⇒ 该文件**只服务旧产品**。
判定脚本跑在 HEAD 的树上（`git ls-tree` + `git show`），结论可复现。

### 1.1 当前产品的完整导入图（迁移后保留在产品树里的部分）

`apps/preview/index.html` 可达 **74** 个仓库内文件：

- 页面：`apps/preview/{index.html, app.js, life-panels.js, continent-atlas.js, cultivation-pixel.js, pixel-style.js}`
- 引擎：`packages/adventure/`（`engine.js` `store.js` `birth.js` `life.js` `context.js` `realm.js`
  `cultivation.js` `progression.js` `story-rules10.js` `story-rules12.js` `mundane-life.js`
  `auto-choice.js` `family.js` `cultivation-economy.js` 及各版本执行器）
- 内容：`content/`（`adventure.js` `living-world.js` `cultivation-world.js` `rules12-world.js`
  `readable-stories.js` `story-network.js` `cultivation-stories.js` `mundane-stories.js` …）

### 1.2 两个产品之间**唯一**的共享模块

`packages/core/random.js` —— 随机流（`createStreams` / `random` / `hashText`）。
两边都在用，所以留在产品树里 `packages/core/random.js`，没有搬走。

---

## 2. 只服务旧 0.2.0 产品的模块清单（含证据）

下表的「谁 import 它」一列是从 HEAD 的真实导入边读出来的，不是推测。

| 模块 | 谁 import 它 |
| --- | --- |
| `apps/web/index.html` | （旧产品的入口文件） |
| `apps/web/app.js` | `apps/web/index.html` |
| `apps/web/views.js` | `apps/web/app.js`、`apps/web/dialogs.js`、`tests/feedback.test.mjs` |
| `apps/web/dialogs.js` | `apps/web/app.js`、`tests/feedback.test.mjs` |
| `apps/web/icons.js` | `apps/web/dialogs.js`、`apps/web/views.js` |
| `apps/web/game-api.js` | `apps/web/app.js`、`scripts/verify-browser.mjs`、`tests/scenarios.mjs`、`tests/storage.test.mjs` |
| `packages/core/state.js` | `apps/web/{app,dialogs,game-api,views}.js`、`packages/core/{engine,migrate,world-events}.js`、`packages/render/canvas.js`、`packages/storage/{fork,store}.js`、`packages/media/exports.js`、`scripts/check.mjs`、`tests/{engine,feedback,storage}.test.mjs` |
| `packages/core/engine.js` | `apps/web/{dialogs,game-api,views}.js`、`packages/core/{migrate,validate}.js`、`packages/media/exports.js`、`scripts/verify-feedback-browser.mjs`、`tests/{engine,feedback}.test.mjs` |
| `packages/core/migrate.js` | `packages/storage/store.js`、`tests/feedback.test.mjs` |
| `packages/core/legacy-v1.js` | `packages/core/{migrate,validate}.js`、`packages/storage/store.js` |
| `packages/core/world-events.js` | `packages/core/engine.js`、`packages/render/canvas.js` |
| `packages/core/validate.js` | `packages/core/{migrate}.js`、`packages/storage/{fork,store}.js`、`scripts/{check,verify-browser,verify-build,verify-feedback-browser}.mjs`、`tests/{engine,feedback}.test.mjs`、`tests/scenarios.mjs` |
| `packages/storage/store.js` | `apps/web/app.js`、`scripts/{verify-browser,verify-build,verify-feedback-browser}.mjs`、`tests/{feedback,storage}.test.mjs` |
| `packages/storage/fork.js` | `packages/storage/store.js`、`tests/feedback.test.mjs` |
| `packages/render/canvas.js` | `apps/web/app.js`、`packages/media/exports.js` |
| `packages/media/exports.js` | `apps/web/{app,dialogs,views}.js` |
| `packages/media/audio.js` | `apps/web/app.js` |
| `content/world.js` | `apps/web/{dialogs,views}.js`、`packages/core/{state,migrate,world-events,engine,validate}.js`、`packages/render/canvas.js`、`packages/media/exports.js`、`scripts/{build,verify-build}.mjs`、`tests/feedback.test.mjs` |
| `content/stories.js` | `apps/web/dialogs.js`、`packages/core/{engine,validate,world-events}.js`、`scripts/check.mjs` |
| `content/expansion.js` | `content/stories.js`、`packages/core/{engine,validate,world-events}.js`、`tests/feedback.test.mjs` |

**没有任何一个当前产品的文件出现在上表的导入方里** —— 反过来也成立：
`apps/preview/` 的 74 个可达文件里没有一个在上表。

### 2.1 处置：不是删除，是移出产品树

上表 20 个模块连同旧产品自己的页面、测试与浏览器门禁，整体移入
[`legacy/old-web/`](../../legacy/old-web/)，并保持原有的相对目录结构，
使 `../../packages/…`、`../apps/web/…` 这类相对导入**不需要改写**。

- 产品树（`apps/` `packages/` `content/` `scripts/` `tests/`）里不再有旧产品的任何一行代码；
- `legacy/old-web/` 是一份**自洽且仍可运行**的历史快照（见该目录的 README）；
- `legacy/old-web/packages/core/random.js` 是 `packages/core/random.js` 的冻结副本
  （同一份字节），只为让旧产品的 `packages/storage/store.js` 与 `packages/render/canvas.js`
  能在快照内解析到随机流；产品树里的那一份保持唯一权威。

---

## 3. 旧 web 的测试怎么处置（不是靠删测试换「全绿」）

### 3.1 逐条判断

| 旧测试 | 测的是什么 | 当前产品是否也需要 | 处置 |
| --- | --- | --- | --- |
| `tests/engine.test.mjs` | 旧引擎 `packages/core/engine.js`：年月推进、`focus`/`act`/`decision` 决策、收入预览 | **否**。当前产品的引擎是 `packages/adventure/engine.js`（`createRun`/`choose`/`advance`/`advanceToChoice`/`validateRun`），已有 `tests/adventure.test.mjs` 等 9 个测试文件覆盖 | 移入 `legacy/old-web/tests/` |
| `tests/storage.test.mjs` | 旧存档协议 `packages/storage/store.js`（`SaveStore`/`STORAGE_KEY`）+ `packages/storage/fork.js` | **协议本身需要，但当前产品有自己的一套**：`packages/adventure/store.js`（`AdventureStore`/`ADVENTURE_KEY`），并已由当前产品自己的测试覆盖 —— 迁移（`tests/adventure.test.mjs` 的 preview.1、`tests/cultivation.test.mjs` 的 preview.3）、配额（`tests/adventure.test.mjs:316-319`）、写冲突（`:323-325`）、备份与损坏原档保留（`:330-349`）、导入副本（`:338-340`） | 移入 `legacy/old-web/tests/`；当前产品的存档协议**继续有门禁**，没有丢覆盖 |
| `tests/feedback.test.mjs` | 旧页面的 `apps/web/views.js` / `dialogs.js` 渲染与文案 | **否**。当前产品对应的是 `tests/adventure-feedback.test.mjs`、`tests/decision-clarity.test.mjs` 与 `scripts/verify-cultivation-browser.mjs` 等浏览器门禁 | 移入 `legacy/old-web/tests/` |
| `tests/scenarios.mjs` | 旧引擎的脚手架（`playLife`/`toAge`/`policyChoice`） | **否**。当前产品的脚手架是 `tests/adventure-scenarios.mjs` | 移入 `legacy/old-web/tests/` |
| `scripts/verify-browser.mjs` | 旧页面的浏览器门禁（26 项） | **否** | 移入 `legacy/old-web/scripts/`，从门禁清单移除 |
| `scripts/verify-feedback-browser.mjs` | 旧页面的反馈/导入浏览器门禁（11 项） | **否** | 移入 `legacy/old-web/scripts/`，从门禁清单移除 |

**唯一的共享模块 `packages/core/random.js`（随机流）**：当前产品继续使用它，
其行为由当前产品自己的测试覆盖（`tests/adventure.test.mjs` 断言 `random` 各子流在
升级前后逐值相等、事件与日常抽取次数归零等），所以**不需要**为了它保留旧 web 的测试。

### 3.2 门禁清单的变化

`scripts/run-regression.mjs`：

- 删除 `browser`（旧 `scripts/verify-browser.mjs`）；
- 删除 `feedback-browser`（旧 `scripts/verify-feedback-browser.mjs`）；
- `engine-storage` 更名为 `unit`，并从测试清单里去掉 `tests/engine.test.mjs`、
  `tests/storage.test.mjs`、`tests/feedback.test.mjs`（其余当前产品的测试文件原样保留）。

**没有把旧测试删掉来换绿**：它们连同旧页面一起进了 `legacy/old-web/`，
并且**仍然跑得通**（见 §6 的实际执行结果）。

---

## 4. 根入口与构建产物的改动

| 位置 | 改动前 | 改动后 |
| --- | --- | --- |
| `scripts/serve.mjs` `/` 与 `/index.html` | `apps/web/index.html` | `apps/preview/index.html`（当前产品） |
| `scripts/serve.mjs` `/preview` 与 `/preview/` | 已是 `apps/preview/index.html` | 保持不变，老链接不 404 |
| `scripts/serve.mjs` 可服务前缀 | 含 `/apps/web/` | 只剩 `/apps/preview/`、`/preview/`、`/packages/`、`/content/` |
| `scripts/build.mjs` 复制目录 | `apps/web`、`apps/preview`、`packages`、`content` | `apps/preview`、`packages`、`content` |
| `scripts/build.mjs` 产物根 `index.html` | 来自 `apps/web/index.html` | 来自 `apps/preview/index.html`；`/preview/` 兼容副本保留 |
| `scripts/build.mjs` 产物清单 `product` | `shanhai-life` | `guishanji`（版本取 `content/adventure.js` 的 `ADVENTURE_VERSION`） |
| `scripts/start-local.mjs` 就绪判定 | 比对 `apps/web/index.html` | 比对 `apps/preview/index.html` |

`scripts/serve.mjs` 新增两个可选参数 `entry` / `allow`（默认值不变），
只给 `legacy/old-web/scripts/` 里的历史门禁用来把旧目录单独当根目录服务；
产品侧的默认值与行为不受影响。

---

## 5. 门禁本身的改造（守当前产品，不是守旧产品）

| 脚本 | 改动 |
| --- | --- |
| `scripts/check.mjs` | 去掉对 `content/stories.js`、`packages/core/state.js`、`packages/core/validate.js` 的依赖；「出生契约」检查改为对当前产品执行 `validateRun(createRun({ seed }))`（原来是对旧引擎执行 `validateState(newLife(...))`）。另外：① 跳过 `vendor/`、`reference/`（锁定的来源快照，不是活动源码）；② 小程序支线的 `scripts/test-xianxia-*.mjs`、`scripts/build-xianxia-mp.mjs` 由该支线自己的门禁守着导入依赖，本门禁不再对它们做「导入必须存在」的判定；③ 导入缺失改为一次性列全，不再遇到第一个就抛 |
| `scripts/verify-build.mjs` | 从「验旧页面的静态站点」改成「验当前产品的静态站点」：产物清单逐字节一致 → 产物不含任何 `apps/web/` 路径 → 全部文件经 HTTP 逐字一致、`/` 与 `/preview/` 都是归山记、`/apps/web/index.html` 返回 404 → 真实 Chromium 里从**产物根**完成「首页 → 出生 → 自动存档 → 刷新恢复」，并断言标题是「归山记 · 修仙人生」、页面上没有「试玩」字样、无外部请求与失败资源 |

---

## 6. 对 CI 里另外两道门禁的影响

`.github/workflows/ci.yml` 除了全量回归，还跑两道门禁。清理旧产品是否影响它们，逐条实测：

| 门禁 | 是否受影响 | 依据 |
| --- | --- | --- |
| `node scripts/verify-migration-import.mjs`（迁移导入逐字节核对） | **否** | `docs/migration/source-manifest.json` 的 137 条只覆盖小程序支线的输入（`miniprogram/subpkg/` 46、`vendor/xianxia-r12/` 68、`vendor/xianxia-r12-art/` 4、`reference/official/` 8、`scripts/` 里的小程序脚本 9、两份文档），**不含** `apps/web/`、`apps/preview/`、`packages/core/`、`content/world.js` 等本次清理的文件 ⇒ 实测 137/137 逐字节一致 |
| `node scripts/build-xianxia-mp.mjs --check`（小程序产物可复现） | **否** | 该脚本的快照输入只有 `packages/adventure/` + `packages/core/random.js` + `content/`；旧产品独占的 `content/{world,stories,expansion}.js` **本来就不在快照里**（快照的 `content/` 43 个文件与清理后的 `content/` 逐个同名）⇒ 实测「逐字节相同」 |

清理没有触碰任何规则执行器：`packages/adventure/` 下的 rules8 / 9 / 10 / 11 / 12 执行器
（`cultivation-v8.js`、`story-rules10.js`、`story-rules12.js` …）与 `content/` 里对应的冻结表
全部原地保留，符合 AGENTS.md「未证明某历史模块不再被任何支持版本使用前不删除它」。

---

## 7. 实际执行结果

全量回归 `node scripts/run-regression.mjs`：**29 / 29 全绿，退出码 0**
（`REGRESSION PASS · preview-assets:0 check:0 unit:0 mundane-unit:0 rules12-unit:0 rules12-audit:0
mundane-audit:0 story-audit:0 life-simulation:0 build:0 adventure-browser:0 decision-browser:0
network-browser:0 progression-browser:0 revision9-browser:0 rules10-browser:0 mundane-browser:0
rules12-browser:0 family-browser:0 static-build:0 adventure-static:0 decision-static:0
network-static:0 progression-static:0 revision9-static:0 rules10-static:0 mundane-static:0
rules12-static:0 family-static:0`）。

旧产品下线后（**不在门禁清单里**，手动跑仍然全绿）：

| 命令 | 结果 |
| --- | --- |
| `node --test legacy/old-web/tests/{engine,storage,feedback}.test.mjs` | **49 项全过**，退出码 0 |
| `node legacy/old-web/scripts/verify-browser.mjs` | **26/26 全过**，退出码 0 |
| `node legacy/old-web/scripts/verify-feedback-browser.mjs` | **11/11 全过**，退出码 0 |

清理前后的对照：清理前的基线回归是 31 项里 **30 绿 1 红**，红的那一项是 `check`，
原因是小程序支线的 `scripts/test-xianxia-*.mjs` 依赖尚未落地的 `scripts/lib/frozen-baseline.mjs`
（属于另一条工作流，不在本次职责内）。改造后的 `check` 把小程序支线的导入判定交还给该支线
自己的门禁，并改用当前产品的 `validateRun(createRun(...))` 做出生契约检查 ⇒ 全绿。

浏览器门禁跑在 **Microsoft Edge（Chromium）** 上，通过 `scripts/lib/browser.mjs` 现有的
`CHROME_BIN` 入口指定；本机没有 Google Chrome。

---

## 8. 明确没有改的东西

- `docs/adventure-rules8/9/10/11/12-verification.json`、`docs/web-verification.json`、
  `docs/verification-v0.1.0.json` 里的 `apps/web` 哈希条目 —— **历史台账，不改**。
- `package.json` —— 由主会话统一改。
- `miniprogram/`、`scripts/test-xianxia-*.mjs`、`scripts/lib/xianxia-bundle.mjs`、
  `scripts/lib/es2015-downlevel.mjs`、`scripts/build-xianxia-mp.mjs` —— 另一条工作流在改，只读。
- `vendor/`、`reference/` —— 锁好的来源证据，未动。
