# legacy/old-web —— 旧 0.2.0 产品「山海一生」的历史记录

**这是旧 0.2.0 产品的历史记录，现已下线，不再作为门禁运行。**

当前产品是「归山记」（网页端入口 `apps/preview/`）。本目录保存旧产品下线前的
完整源码快照，仅供查证旧行为、比对差异与回溯历史，**不属于产品源码**：

- 不被 `scripts/serve.mjs` 提供（`/apps/web/…` 一律 404）；
- 不被 `scripts/build.mjs` 打包进 `dist/`；
- 不在 `scripts/run-regression.mjs` 的门禁清单里；
- 不作为当前产品的依赖（当前产品只用 `packages/adventure/` + `packages/core/random.js` + `content/`）。

## 目录内容

| 路径 | 内容 |
| --- | --- |
| `apps/web/` | 旧 0.2.0 产品的页面（`index.html` / `app.js` / `views.js` / `dialogs.js` / `icons.js` / `game-api.js` / `style.css` / `favicon.svg`） |
| `packages/core/` | 旧引擎：`state.js` / `engine.js` / `migrate.js` / `legacy-v1.js` / `world-events.js` / `validate.js` |
| `packages/core/random.js` | 旧产品用的随机流。当前产品仍在用 `packages/core/random.js`；这里存的是同一份字节的冻结副本，让本快照可以独立运行 |
| `packages/storage/` | 旧存档协议：`store.js`（`SaveStore` / `STORAGE_KEY`）/ `fork.js` |
| `packages/render/` `packages/media/` | 旧产品的 Canvas 绘制与导出：`canvas.js` / `exports.js` / `audio.js` |
| `content/` | 旧产品内容：`world.js` / `stories.js` / `expansion.js` |
| `tests/` | 旧产品的单元测试：`engine.test.mjs` / `storage.test.mjs` / `feedback.test.mjs`，共用脚手架 `scenarios.mjs`，夹具 `fixtures/v0.1.0-archive.json` |
| `scripts/` | 旧产品的两道浏览器门禁：`verify-browser.mjs` / `verify-feedback-browser.mjs` |

## 手动运行（可选，不是门禁）

```sh
# 旧产品的单元测试
node --test legacy/old-web/tests/engine.test.mjs \
         legacy/old-web/tests/storage.test.mjs \
         legacy/old-web/tests/feedback.test.mjs

# 旧产品的两道浏览器门禁（需要 Chromium；macOS 可用 CHROME_BIN 指定）
CHROME_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  node legacy/old-web/scripts/verify-browser.mjs
CHROME_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  node legacy/old-web/scripts/verify-feedback-browser.mjs
```

两道浏览器门禁用 `scripts/serve.mjs` 的 `startServer({ root, entry, allow })` 把本目录
单独当根目录服务（`entry: '/apps/web/index.html'`），因此旧页面能在本目录内独立跑起来，
不会碰到当前产品的 `/`。

## 处置依据

哪些模块只服务旧产品、哪些测试覆盖的行为已被当前产品自己覆盖，见
[`docs/migration/web-cleanup.md`](../../docs/migration/web-cleanup.md)。
