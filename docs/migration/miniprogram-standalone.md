# 小程序端独立化（阶段 3 + 阶段 4 的同源构建部分）

> 这份文档记录：**归山记**（修仙人生）从小程序依附 1in8b，到**独立小程序产品**的这一轮改造。
> 落点：分支 `migration/standalone`，HEAD `b519ac06…`。
> 网页端由另一位同事并行改造，本轮**没有碰** `apps/**` 与旧的网页门禁。

---

## 0. 一句话

> 修仙玩法从小程序里的一个「入口」变成了**一个独立小程序**：
> 有自己的启动层、自己的首页、自己的存档层、自己的同源构建，
> **运行代码里一处 1in8b 的痕迹都没有**，而且七道门禁全部能在这台机器上独立跑通。

---

## 1. 目录与路由

### 1.1 新结构

```
miniprogram/
  app.js                     启动层（极薄：不加载引擎 / 无引擎屏障 / 不联网）
  app.json                   主页 pages/home/home + 分包 subpkg/xianxia
  app.wxss                   ★生成物★：从 reference/official/app.wxss 逐条提取
  sitemap.json
  bridge/                    ★主包★：主包与分包都要用的那一层
    storage.js               存档层（xianxia.v1.* 命名空间）
    hash.js                  自带的 SHA-256
    theme.js                 日读 / 夜读 / 跟随系统
    safe-area.js             微信胶囊避让
  pages/
    home/home.*              首页：进入命盘 / 继续人生 / 往期人生 / 加载失败重试
    legal/about/about.*      说明页（占位文案，发布前需按新产品实际情况改写）
    legal/privacy/privacy.*  隐私页（同上）
  subpkg/xianxia/            分包：规则运行时 + 三页 + 画面 + 官方样式副本
    runtime/engine.js        ★生成物★：规则（rulesVersion 12）
    runtime/pixel-style.js   ★生成物★：画面调色板
    runtime/build-manifest.json  ★生成物★：来源与哈希
    bridge/                  只有分包才用的那一层（session / view-model / page-model …）
    art/  components/  styles/  pages/{roll,life,past}/
project.config.json          AppID = touristappid（占位，上传前必须换正式 AppID）
reference/
  official/app.wxss          官方设计系统（= 1in8b 的 app.wxss，逐字节副本）
  official/sources/*.js      官方 life.js / roll.js / idcard.js / safe-area.js
  official/styles/*.wxss     官方 life / roll / sheet / shelf 四份样式
  migrated-runtime/          ★迁移基线★：从 1in8b 迁进来时的那份产物
vendor/xianxia-r12/          历史证据（不再是构建输入）—— 见其 README
vendor/xianxia-r12-art/      历史证据（不再是参考实现的来源）—— 见其 README
```

### 1.2 路由

| 页面 | 路径 | 所在包 |
|---|---|---|
| 首页 | `/pages/home/home` | 主包 |
| 说明 | `/pages/legal/about/about` | 主包 |
| 隐私 | `/pages/legal/privacy/privacy` | 主包 |
| 命盘（出生） | `/subpkg/xianxia/pages/roll/roll` | 分包 |
| 人生 | `/subpkg/xianxia/pages/life/life` | 分包 |
| 往期人生 | `/subpkg/xianxia/pages/past/past` | 分包 |

---

## 2. ⚠ 为什么共享层（存档层）放**主包**

微信小程序的规矩：

* **主包不能同步引用分包代码**（分包代码要先下载下来才能用）；
* **分包可以引用主包**（这个是可以的）。

于是：凡是**主包与分包都要用**的东西，一律放主包 —— 本轮就是
`bridge/{storage,hash,theme,safe-area}.js`：

* 主包的首页要列存档清单（读这一层）；
* 分包的人生页要写存档（也用这一层）。

而**只有分包才用**的东西（规则引擎 1.7 MB、会话、视图模型）留在分包 ——
放主包会把主包顶到 2 MB 上限。

⇒ `scripts/test-xianxia-standalone.mjs` 有一条断言专门守这件事：
主包里**不许**出现指向 `subpkg/` 的 `require`。

---

## 3. 同源构建

### 3.1 唯一来源 = 本仓库自己的源码

```sh
node scripts/build-xianxia-mp.mjs          # 从本仓库源码构建
node scripts/build-xianxia-mp.mjs --check  # 逐字节校验产物是不是最新的
```

允许进入产物的只有四样：

| 路径 | 是什么 |
|---|---|
| `packages/adventure/` | 修仙规则（引擎、境界、剧情、宗门…） |
| `content/` | 修仙内容表（人物、大陆、事件、故事…） |
| `packages/core/random.js` | 随机流（种子 ⇒ 同一串随机数） |
| `apps/preview/pixel-style.js` | 画面调色板与人物像素（纯数据） |

明确排除：`content/world.js` / `content/stories.js` / `content/expansion.js`
（旧 0.2.0 Web 产品的表，与修仙那套**同名但不同源**）。

⇒ **构建只读本仓库**，不依赖任何相邻目录（`../xianxia-life`、`../1in8b` 都不存在也能构建）。
上一轮那种「拿 `../xianxia-life` 当输入」的写法在 CI 与 Windows 那台机器上就是**假门禁**，已经去掉。

### 3.2 产物

| 文件 | 说明 |
|---|---|
| `miniprogram/subpkg/xianxia/runtime/engine.js` | 规则（67 个模块） |
| `miniprogram/subpkg/xianxia/runtime/pixel-style.js` | 画面调色板 |
| `miniprogram/subpkg/xianxia/runtime/build-manifest.json` | 来源与哈希 |
| `miniprogram/app.wxss` | 全局样式（从官方 app.wxss 逐条提取，见 §4） |

### 3.3 `build-manifest.json` 的两段来源（如实写，不伪造）

```jsonc
"source": {          // 本仓库：现在改的就是它
  "repo": "buuzzy/guishanji",
  "branch": "migration/standalone",
  "commit": "b519ac06…",
  "tree": "c780c6c4…",
  "paths": ["packages/adventure/", "content/", "packages/core/random.js",
            "apps/preview/pixel-style.js"]
},
"upstreamOrigin": {  // 上游：这份字节当初是从哪儿搬过来的
  "repo": "buuzzy/xianxia-life",
  "branch": "feature/adventure-preview-v01",
  "commit": "b519ac06…",
  "tree": "c780c6c4…"
}
```

两个来源指的是**同一批字节**（`scripts/test-xianxia-build.mjs` 逐个文件核对：
本仓库源码 ≡ `vendor/xianxia-r12/` 快照，67 个文件全部一致）。
**不合并、不假装只有一个来源。**

`source` 里的 git 身份是**快照信息**（记的是构建那一刻仓库的状态），
它**不参与**逐字节复现校验 —— 否则每次提交都会假红；
复现由 `inputs` / `output` 的 SHA-256 保证。

### 3.4 迁移等价性（可证）

`reference/migrated-runtime/engine.js` 是**从 1in8b 迁进来时**的那份产物。
新构建的产物与它**除文件头注释外逐字节一致**：

| 文件 | 除头注释外的字节数 | SHA-256（前 16 位） |
|---|---|---|
| `engine.js` | 1,737,779 | `e23b0afac050dc55` |
| `pixel-style.js` | 4,496 | `afe1b4d529fa6c46` |

⇒ 「迁移过程中没偷偷改过规则」这句话是可证的，不是嘴上说说。

### 3.5 `--verify-upstream`（只读核对工具，不是构建路径）

```sh
node scripts/build-xianxia-mp.mjs --verify-upstream=<某个 checkout 目录>
```

它**不写**任何文件，只回答「本仓库现在的源码，还跟上游那份一样吗？」，
差集列出来是为了让人知道「哪几个文件开始分家了」。
旧的 `--refresh` / `--source=` 参数**已移除**（它们是「构建路径依赖相邻目录」的根源）。

---

## 4. `app.wxss` 是怎么来的

`miniprogram/app.wxss` 是**生成物**（`node scripts/build-xianxia-mp.mjs` 产出）：

* 来源：`reference/official/app.wxss`（= 1in8b 官方设计系统的逐字节副本）；
* 做法：**只保留本小程序真正用得到的那些规则**，其余整条删掉
  （34,280 字节 → 23,298 字节，保留 90 段）。

### 为什么删掉是**可证明**安全的

一条 CSS 规则只可能作用在**带它那些类名**的元素上。
我们只删「它的类名在本小程序里根本不会出现」的规则 ⇒ 被删的规则**永远匹配不到**
任何一个元素 ⇒ 删掉它对渲染**零影响**。

### 提取口径

1. **永远保留**没有类名的规则：`page{…}`（CSS 变量与深色模式）、
   `@media (prefers-color-scheme: dark)`、元素选择器（`button` 等）。
2. 其余规则：**逗号分隔的每个选择器单独判** —— 只要其中**任意一个**选择器的
   全部类名都在「用得到的类名」集合里，就整条保留
   （`.wx-b, .wx-strong` 这种合写规则不能拆开判，否则会丢样式）。
3. 「用得到的类名」来自：本小程序所有 `.wxml` 的 `class="…"`（含 `{{…}}` 里的引号字符串）、
   本小程序所有 `.wxss`（页面层）的选择器。
4. `class="kind-{{item.k}}"` 这种**动态类名**：字面量部分 `kind-` 视为**前缀通配**
   ⇒ 官方所有 `kind-*` 的规则都保留（运行时才知道具体是哪个）。
5. 主题类 `.theme-light` / `.theme-dark` 恒定保留。

### ⚠ 提取时踩过的坑（已修）

官方 app.wxss 的**注释里含有右花括号**
（例如「官方 .agebox .age { … font-variant-numeric:tabular-nums }」那一行注释）。
直接按花括号数切块会**错位** ⇒ 切出来的块里多出注释的结尾符、少掉开头，
生成的 CSS 是坏的。
⇒ 修法：**先把注释内容替换成等长空白再数花括号，用原文切片输出**（注释逐字保留）。

---

## 5. 独立化：去掉 1in8b 的运行依赖

| 原来 | 现在 |
|---|---|
| `life.js` 离开时 `wx.reLaunch('/subpkg/engine/pages/index/index')` | `wx.reLaunch('/pages/home/home')` |
| `past.js` 返回失败时 `wx.reLaunch('/subpkg/engine/pages/index/index')` | `wx.reLaunch('/pages/home/home')` |

另外：

* 首页的「继续人生」会**点名**要接哪一段人生（`?resume=<编号>`），
  人生页按这个编号接；没点名就接**最近动过**的那一段
  （清单里的顺序是「按最后保存时间排的」，末尾才是最近动过的 ——
  取第一个会接到**最老**的那一段，那是老代码的毛病）。
* `scripts/test-xianxia-standalone.mjs` 扫全仓 `miniprogram/`：
  运行代码里出现 `/subpkg/engine`、`/subpkg/data`、`/subpkg/logic`、
  `one8b.`、`o8b.` 即红。

---

## 6. 门禁（7 道，全部独立可跑）

> 上一轮的 6 道门禁都 `import {ROOT} from './lib/frozen-baseline.mjs'` ——
> **那个文件在本仓库不存在** ⇒ 5 道门禁当时 import 即失败。
> 现在每道门禁自己算 `ROOT`（`path.resolve(dirname(fileURLToPath(import.meta.url)), '..')`），
> **不依赖任何相邻目录**。

| 门禁 | 守什么 |
|---|---|
| `scripts/test-xianxia-build.mjs` | 产物可复现、与源码一致、ES2019、无 `?.`/`??`、无浏览器全局、导出面完整、**迁移等价性**、**vendor 快照与本仓库源码逐字节一致** |
| `scripts/test-xianxia-mp.mjs` | 三页跑得动、分包与入口接线正确、不碰官方数据、七条真机问题逐条断言 |
| `scripts/test-xianxia-storage.mjs` | 分片/双槽/配额错误、官方键逐字节不变 |
| `scripts/test-xianxia-style.mjs` | 官方样式副本逐字节一致、倍速/转盘/雕版同源、字号口径、**app.wxss 与提取结果一致 + 类覆盖** |
| `scripts/test-xianxia-art.mjs` | 画面与参考实现逐笔一致 + 反向验证 |
| `scripts/test-xianxia-equivalence.mjs` | 本仓库源码 vs 小程序产物逐值全等（12 个种子、逐月对拍） |
| `scripts/test-xianxia-standalone.mjs` | ★新增★：运行代码里没有 1in8b 痕迹、AppID 没残留、**主包不引用分包**、跳转只在本产品内、启动层极薄、完全单机、存档命名空间 |

### ⚠ 一处技术改动：模块加载

本仓库 `package.json` 是 `"type": "module"` ⇒ `.js` 会被 Node 当成 ESM
⇒ 门禁里 `require('…/bridge/storage.js')` 会炸（`module is not defined in ES module scope`）。
⇒ 门禁改用 `vm.runInThisContext` 在 CommonJS 形状的沙箱里装载，
**并带模块缓存**（真机上同一个模块只有一份；不缓存的话
「页面用的 session」与「门禁用的 session」会是两个实例，测的就不是同一条链路）。

---

## 7. ⚠ 已知遗留 / 需要主会话决定的事

1. **七道门禁还没挂进 `scripts/run-regression.mjs`** ——
   按 AGENTS 的规矩「孤儿门禁 = 假门禁 ⇒ 必须挂进 `run-regression.mjs`」，
   它们应该进总回归。但 `run-regression.mjs` 在本轮的**禁改清单**里
   （网页端同事正在并行改它），所以本轮**没有动**。
   ⇒ 需要主会话在合并时补上这一行（建议）：
   ```js
   { name: 'xianxiabuild', cmd: 'node', args: ['scripts/test-xianxia-build.mjs'] },
   { name: 'xianxiaeq',    cmd: 'node', args: ['scripts/test-xianxia-equivalence.mjs'] },
   { name: 'xianxiastore', cmd: 'node', args: ['scripts/test-xianxia-storage.mjs'] },
   { name: 'xianxiaart',   cmd: 'node', args: ['scripts/test-xianxia-art.mjs'] },
   { name: 'xianxiamp',    cmd: 'node', args: ['scripts/test-xianxia-mp.mjs'] },
   { name: 'xianxiastyle', cmd: 'node', args: ['scripts/test-xianxia-style.mjs'] },
   { name: 'xianxiastandalone', cmd: 'node', args: ['scripts/test-xianxia-standalone.mjs'] },
   ```

2. **`scripts/verify-migration-import.mjs` 现在是红的**（18 处不一致）——
   这是**预期后果**，如实报备：
   `docs/migration/source-manifest.json`（已跟踪、禁改）记的是**迁移那一刻**每个文件的字节哈希；
   本轮改了 `miniprogram/**`、`scripts/build-xianxia-mp.mjs`、`scripts/lib/**`、
   `scripts/test-xianxia-*`、`vendor/**` ⇒ 那些哈希自然对不上。
   迁移的**证据本身没有丢**：迁进来时的那份产物另存在
   `reference/migrated-runtime/`（逐字节保留），并由 `test-xianxia-build.mjs`
   以「除文件头注释外逐字节一致」的断言继续守着。
   ⇒ 要么由主会话重新生成迁移清单（`scripts/gen-source-manifest.mjs`），
   要么在 `verify-migration-import.mjs` 里显式豁免「本轮已改造的文件」。

3. **真实 AppID** —— `project.config.json` 现在是占位值 `touristappid`。
   **上传前必须换成正式 AppID**，并且**绝对不能**用 1in8b 的 `wxbbf73e87e970cda8`。

4. **微信 IDE 真编译与包体实测** —— 本轮**未做**（见交付说明）。
   仓库原始字节供参考：主包 ≈ 69 KB，分包 `subpkg/xianxia` ≈ 2,007,168 字节
   （其中 `engine.js` 1,738,682 字节）。
   ⚠ **仓库原始字节 ≠ 上传体积**：微信 IDE 会转译、压缩、剔除无用文件，
   真正的数只能走 `cli preview`（含删 IDE 编译缓存那一步）。
   ⚠ 分包里 1.7 MB 是规则引擎本体 —— 与 1in8b 时期相比，
   共享层（存档层）挪到主包让分包**变小**了，但规则升版仍会顶到 2 MB 上限，
   下一版规则前仍需拆包或出瘦身版。

5. **说明页 / 隐私页是占位文案** —— 发布前必须按归山记这个新产品的实际情况改写
   （运营主体、联系方式、备案号、生效日期），不能照抄别的产品的文字。

6. **首页的「继续人生」是新增交互** —— 老代码在人生页里接的是
   `lives[0]`（最老的那一段）。本轮改成接**最近动过**的那一段，
   并支持首页点名 `?resume=<编号>`。
   ⇒ 这是**行为变化**，虽然更合理，但值得在真机上确认一下。
