# vendor/xianxia-r12 —— **历史证据**，不再是构建输入

## 这是什么

2026-11-05 从 `1in8b` 小程序迁进本仓库时，随修仙规则一起搬过来的**锁定快照**：
当年那份规则字节（`packages/adventure/` + `content/` + `packages/core/random.js`）的逐字节副本。

- `baseline.lock.json` 记着每个文件的 SHA-256 与字节数，以及它来自上游
  `buuzzy/xianxia-life` 的哪个提交（`feature/adventure-preview-v01`，
  commit `b519ac06…` / tree `c780c6c4…`）。
- 快照里的文件**一个字节都不要改**：改了，`scripts/test-xianxia-build.mjs`
  会立刻报红（它逐个核对哈希）。

## ⚠ 现在它**不是**构建输入

归山记是**独立产品**，规则代码已经**在本仓库里**（`packages/adventure/`、`content/`、
`packages/core/random.js`），小程序端那份规则由

```sh
node scripts/build-xianxia-mp.mjs        # 从本仓库源码构建
node scripts/build-xianxia-mp.mjs --check # 逐字节校验产物是不是最新的
```

生成 —— **只读本仓库**，不读这个目录，也不需要任何相邻目录
（CI 与 Windows 那台机器上都没有 `../xianxia-life`，靠它当输入就是**假门禁**）。

## 那它还有什么用

1. **历史证据**：这份字节当初是从上游哪个提交搬过来的，`baseline.lock.json` 记得清清楚楚。
2. **交叉校验**：`scripts/test-xianxia-build.mjs` 会核对
   **本仓库源码 ≡ 这个快照**（逐字节）。这是「同一批字节的两个来源」那句话的依据 ——
   `build-manifest.json` 里的 `source`（本仓库）与 `upstreamOrigin`（上游）两段，
   就是这么来的。
3. **防手滑**：快照被人改过 ⇒ 门禁红。

## 迁移等价性

从 1in8b 迁进来时的那份**产物**另存在
`reference/migrated-runtime/engine.js`（与 `reference/migrated-runtime/pixel-style.js`）。
`scripts/test-xianxia-build.mjs` 会断言：新构建的产物与它**除文件头注释外逐字节一致**
⇒ 「迁移过程中没偷偷改过规则」这句话是可证的，不是嘴上说说。
