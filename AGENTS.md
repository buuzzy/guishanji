# 归山记 · 开发约定

> 本仓库是「归山记 · 修仙人生」的**独立产品仓库**：一套共享剧情与规则源码，
> 两端界面（网页端 + 微信小程序端）。
> 2026-11-06 从 `buuzzy/1in8b` 与 `buuzzy/xianxia-life` 迁出独立。
> 迁移前的开发约定原文保留在 [docs/history/AGENTS-xianxia-life.md](docs/history/AGENTS-xianxia-life.md)，
> 那份里的「只做 HTML 试玩」「另机接入」等约定**已随迁移作废**，其余历史记录仍可查。

## 1. 仓库结构与唯一来源

| 位置 | 是什么 |
| --- | --- |
| `packages/adventure/`、`packages/core/`、`content/` | **当前剧情与规则的唯一编辑来源** |
| `apps/preview/` | 网页端源码（`apps/preview/pixel-style.js` 等三个画面文件同时是小程序画面的构建输入，**逐字节冻结**） |
| `miniprogram/` | 微信小程序端（主包 + `subpkg/xianxia/` 分包） |
| `miniprogram/subpkg/xianxia/runtime/engine.js` | **生成物**，由 `node scripts/build-xianxia-mp.mjs` 生成，禁止手改 |
| `vendor/xianxia-r12/`、`vendor/xianxia-r12-art/` | 迁移时从上游带来的**锁定快照**，作为历史证据保留，**不再是构建输入** |
| `reference/` | 官方对照源（1in8b 官方小程序样式与实现）+ 哈希锁；本仓库的「对齐基准」 |
| `docs/migration/` | 迁移台账、来源清单、路径映射 |

**硬规矩：**

- 改规则 = 改 `packages/adventure/` 或 `content/`，然后重新构建产物。
  **不许在生成物里改剧情**（下次构建会被覆盖，且「小程序里的规则 = 源码里那份」就不成立了）。
- 本仓库**不依赖** `../1in8b`、`../xianxia-life` 之类相邻目录，也不依赖任何远程 git / 网络资源。
  凡是引用这两个仓库的路径，都是**门禁会报红**的错误（CI 上那些目录不存在 ⇒ 假门禁）。
- 历史规则版本（rules8 / rules9 / rules10 / rules11 / rules12 的执行器）**在证明某个版本不再被
  任何支持版本使用之前不许删除**。旧档按它自己那一版继续跑。

## 2. 小程序端硬约束

- ES2019 可解析；**禁** `?.` / `??`；禁 ES2018 正则特性（`\p{...}`、`s` 标志）；**禁** `wx.request`（完全单机）。
- ⚠ **「Node 里跑得通」≠「微信里跑得通」** —— 微信转译会**改变作用域边界**。
  典型：`for (const t of …)` 的循环体里有闭包引用循环变量时，IDE 会把循环体抽成独立函数
  ⇒ 循环体里的 `var` 声明被「关进去」，而循环**头部**引用不到 ⇒ 运行时 `ReferenceError`（白屏）。
  降级 `?.` 时 babel 恰好会把临时变量 `var` 塞进 for-of 的循环体 ⇒ **必然踩到**。
  守卫口径见 `scripts/lib/es2015-downlevel.mjs::scanForOfVarScope`（四个条件同时成立才算命中）。
- WXML 的 `{{}}` **不支持字符串拼接**（`+` 是算术 ⇒ `NaN`）⇒ 整句在 JS 侧拼好。
- 选项按钮的直接子元素 ≤ 3（官方 `.dec .ch button` 是两列 grid，第一列只有 1.6em 宽，
  第 4 个直接子元素会掉进窄列被压成竖排）。
- 顶栏**不许**给微信胶囊让位（不许出现 `padding-right` / `topPadRight`）；
  弹层顶部让位只用 `sheetPadTop()`（胶囊底边 + 8px，兜底状态栏 + 44）。
- canvas 上的字体必须与 `app.wxss` 的变量同源（canvas 读不到 CSS 变量 ⇒ 字体族只能写死，
  但必须与 `--f-body` / `--f-mono` 逐字同源）。
- 视觉只用官方那套类名（`.topbar` / `.agebox` / `.speed .sps .sps-b` / `.panel` / `.dec` /
  `.ch` / `.cert` / `.roller` / `.shf` / `.idcard` …），**不许自造 `x-xxx` 视觉类**。

## 3. 门禁

```sh
node scripts/run-regression.mjs        # 全量回归
```

| 名字 | 脚本 | 守什么 |
| --- | --- | --- |
| `import` | `scripts/verify-migration-import.mjs` | 迁移进来的每个文件与来源**逐字节一致** |
| `xianxiabuild` | `scripts/test-xianxia-build.mjs` | 生成物可复现、ES2019、无 `?.`/`??`、无浏览器全局 |
| `xianxiaeq` | `scripts/test-xianxia-equivalence.mjs` | 本仓库源码规则 vs 小程序产物**逐值全等** |
| `xianxiastore` | `scripts/test-xianxia-storage.mjs` | 分片 / 双槽 / 配额错误，且不碰官方键 |
| `xianxiaart` | `scripts/test-xianxia-art.mjs` | 画面与参考实现**逐笔一致** + 反向验证 |
| `xianxiamp` | `scripts/test-xianxia-mp.mjs` | 三页跑得动、分包与入口接线正确、七条真机问题逐条断言 |
| `xianxiastyle` | `scripts/test-xianxia-style.mjs` | 与官方**对齐**：样式逐字节一致、倍速/转盘/雕版同源、字号口径 |
| `xianxiastandalone` | `scripts/test-xianxia-standalone.mjs` | 独立产品：运行代码不碰 1in8b 任何路径与存档键 |
| `repohygiene` | `scripts/test-repo-hygiene.mjs` | 仓库不许长胖到把微信开发者工具压垮（文件数 / 体积 / 浏览器临时档案） |

- 门禁必须是**真门禁**：每条关键断言都要做**反向验证**（注入一个坏值，必须报红）。
- 孤儿门禁 = 假门禁 ⇒ 新增门禁要挂进 `scripts/run-regression.mjs`。
- 门禁只依赖**跟着源码走的文件**；被 `.gitignore` 忽略的本机文件不得进指纹。

## 3.1 ⚠ 仓库不许长胖（会把微信开发者工具压垮）

**微信开发者工具打开项目时会遍历整个项目目录**（算文件指纹、建文件监听）。
仓库里一旦堆了几万个临时文件 ⇒ IDE 编译子进程 `spawn EBADF` 崩掉 ⇒
弹「**编译进程崩溃**」或「**模拟器长时间没有响应**」——
**这两种报错长得像 IDE 的毛病，其实是仓库自己太胖**。

2026-11-06 实测：浏览器门禁每次跑都往 `<repo>/.local/browser-XXXX/` 留一个 Chromium profile，
跑几十次攒到 **50,422 个文件 / 32 GB** ⇒ 归山记在 IDE 里编译必崩；
而**同一个 IDE 打开一个空白小程序却秒过**。清掉 `.local/` 后（32 GB → 43.9 MB），
同一个 IDE、同一份代码，**模拟器一次就起来**。

⇒ 规矩：

- 浏览器临时档案**必须**放 `os.tmpdir()`，**跑完就删**（`scripts/lib/browser.mjs` 已改好）。
- 仓库文件数 ≤ 20,000、总大小 ≤ 512 MB ⇒ 由 `repohygiene` 门禁盯着。
- **以后再看到「编译崩溃 / 模拟器无响应」，先量仓库大小和文件数**，
  别一上来就怀疑 IDE 版本、网络或代码。

## 4. 跨平台一致性契约

- **单一代码路径**：不为某个平台写第二份实现；差异收敛到一个适配层。
- **路径大小写严格一致**（macOS/Windows 默认不区分大小写，写错了两端都不报错，只在 Linux 炸）。
- 行尾统一 LF（`.gitattributes` 已钉死）。
- 所有入口走 `node scripts/xxx.mjs`；`.sh` 只是 macOS/Linux 的薄包装。
- Node ≥ 22.4（锁定 22.22.2，见 `.node-version`）。

## 5. 发布前置（尚未完成，别当成已完成）

- [ ] 新小程序 **AppID**（`project.config.json` 现在是占位值 `touristappid`，上传前必须换）
- [ ] 新网页正式域名与部署目标
- [ ] 产品说明与隐私声明的正式文案（`miniprogram/pages/legal/` 现在是占位内容）
- [ ] 玩家存档导出 / 导入协议（**目前未实现**，见 [docs/migration/storage-migration.md](docs/migration/storage-migration.md)）
- [ ] 微信开发者工具真编译的包体台账（微信真编译体积与仓库字节无关）

## 6. 协作

- 两台电脑（macOS / Windows 11）改同一个仓库：本地 commit 允许；
  **推送、合并、公开部署需要用户明确授权**。
- 跨端交接用「分支 + 提交 SHA + 文件树 SHA」核对，不各写一份。
