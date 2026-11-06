# vendor/xianxia-r12-art —— **历史证据**，不再是参考实现的来源

## 这是什么

从 `1in8b` 小程序迁进本仓库时随画面参考实现一起搬过来的**锁定快照**：

- `apps/preview/pixel-style.js` —— 调色板与人物像素（纯数据）。
- `apps/preview/cultivation-pixel.js` —— 像素场景的参考实现。
- `apps/preview/continent-atlas.js` —— 点阵大陆地图的参考实现。

`baseline.lock.json` 记着每个文件的 SHA-256 与字节数，以及上游
`buuzzy/xianxia-life` 的对应提交（commit `b519ac06…` / tree `c780c6c4…`）。

## ⚠ 现在它**不是**参考实现的来源

这三个文件在**本仓库里也有**（`apps/preview/` 下的同名文件），而且与本快照**逐字节相同**
—— `scripts/test-xianxia-art.mjs` 会断言这一点（"vendor 画面快照与本仓库 apps/preview/
的副本逐字节一致"）。

⇒ 画面门禁现在直接读**本仓库的** `apps/preview/`，不再依赖任何相邻目录。
小程序端的调色板则由 `node scripts/build-xianxia-mp.mjs` 从
`apps/preview/pixel-style.js` 生成到 `miniprogram/subpkg/xianxia/runtime/pixel-style.js`。

## 那它还有什么用

1. **历史证据**：这批字节当初是从上游哪个提交搬过来的。
2. **交叉校验**：快照被人改过 ⇒ 门禁红；本仓库副本与快照分家 ⇒ 门禁也红。
