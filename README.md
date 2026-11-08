# 归山记 · 修仙人生

> 松风有信，人生有归处。

一套共享剧情与修行规则源码，产品界面是**微信小程序端**
（网页端 2026-11-08 已清理 ⇒ 见 [docs/browser-gate-coverage.md](docs/browser-gate-coverage.md)）。
2026-11-06 从 `buuzzy/1in8b` 与 `buuzzy/xianxia-life` 迁出为独立产品。
2026-11-07 来源仓库 `buuzzy/xianxia-life` 已删除（字节已完整迁入本仓库）⇒
**本仓库自足**：不读任何相邻目录，不联网，构建与门禁都在这一份代码里跑。

## 快速开始

```sh
npm install          # 装依赖（acorn / terser / babel，仅构建与测试用）
npm run dev          # 本地起只读静态服务（看源码用；产品端是微信小程序）→ http://127.0.0.1:8866/
npm run regression   # 全量回归（规则层 + 小程序端门禁）
```

> ⚠ **没有自动检查了**（2026-11-07 删除了 GitHub Actions 配置）⇒
> **合并进 main 前手动跑一遍回归，并确认退出码是 0**：
> `node scripts/run-regression.mjs --group=fast`（快组 35 道，约 4 分钟）
> ／ `node scripts/run-regression.mjs`（全量 36 道，约 8 分钟）。

小程序端：

```sh
npm run build:mp     # 从本仓库源码生成 miniprogram/subpkg/xianxia/runtime/
npm run check:mp     # 逐字节校验产物可复现
```

微信开发者工具：打开本仓库根目录即可（`project.config.json` 里 `miniprogramRoot: miniprogram/`）。
⚠ **AppID 目前是占位值**，上传前必须换成正式 AppID。

## 目录

```text
apps/preview/        画面基准三文件 + 官方素材副本（不是网页端了）
packages/            共享状态、规则、推进、存档
content/             剧情、地域、功法、历史冻结表
miniprogram/         微信小程序端（主包 + subpkg/xianxia 分包）—— **当前唯一的产品界面**
reference/           官方对照源与哈希锁（对齐基准，不作远程依赖）
vendor/              迁移时带来的锁定快照（历史证据）
scripts/             构建、门禁、验收
tests/               单元测试与固定样本
docs/                设计、验收、迁移台账
```

> 旧 0.2.0 产品「山海一生」的快照（`legacy/old-web/`）已于 2026-11-07 清理，
> 它的历史仍在 git 里（`git log -- legacy/old-web`）。

## 规矩（几条最要紧的）

- **当前规则只有一份编辑来源**：`packages/adventure/` + `content/`。
  `miniprogram/subpkg/xianxia/runtime/engine.js` 是**生成物**，不许手改。
- **不许依赖相邻仓库**：本仓库不读 `../1in8b`，也不读任何相邻目录。
  来源仓库 `buuzzy/xianxia-life` 已于 2026-11-07 删除（字节完整迁入本仓库）。
- **旧档按它自己那一版跑**：规则 8 与规则 12 的执行器都留着。
- **不许为了「全绿」删测试**：门禁要真，要做反向验证。

详见 [AGENTS.md](AGENTS.md)。

## 迁移台账

- 迁移方案：[docs/migration/plan.md](docs/migration/plan.md)（原始方案）
- 来源清单：[docs/migration/source-manifest.json](docs/migration/source-manifest.json)
- 本轮台账：[docs/migration/ledger.md](docs/migration/ledger.md)
