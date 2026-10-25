# 山海一生

原创修仙人生模拟器的 Web 可玩原型，当前版本 **0.1.0**。开启一世后，成长、谋生、修炼、亲友与世事自动进入同一段人生；重要抉择出现时岁月暂歇，回应后继续。

本机项目目录为 `C:/Users/CaiYiyang/xianxia-life`。用户于 2026-10-25 将实施范围确定为纯 Web。

本机已启动的入口：**http://127.0.0.1:8866/**。

已有 Node 22.4 或以上时，在项目根目录运行：

```sh
node scripts/serve.mjs --port=8866
```

Windows 本机的 Node 尚未加入 PATH，可在 PowerShell 使用：

```powershell
cd C:\Users\CaiYiyang\xianxia-life
& 'C:\Users\CaiYiyang\.workbuddy\binaries\node\versions\22.22.2-6\node.exe' scripts/start-local.mjs
```

`start-local` 会隐藏启动本项目的后台服务，并把进程记录与日志写入 `.local/`。前台运行 `serve.mjs` 时，可用 Ctrl+C 停止。所有运行模块为原生 ESM，通过 HTTP 服务打开即可；不需要 npm 安装或第三方运行依赖。

首版可体验的内容：

- 五处山河、五种出身、四类灵根，以及从凡身至化神的六层境界。
- 出生重抽与改名、逐月流转、年度推进、快转至下次抉择、暂停与速度选择。
- 22 类原创故事与动态突破、飞升抉择；相助之后的承诺和离世之后的旧物有延迟后续。
- 药师、匠人、行商与田户的生计，真实扣除游戏资源的交易、疗伤和突破准备。
- 同伴、伴侣、孩子与师徒的成长、独立道路、突破和离世；宗门负责人会交接。
- 按月旅行、地域收入与风险变化、闭关与提前出关。选择转向其他生活重心会结束闭关。
- 原创 Canvas 山水、人物、地图和住处；日色、夜色、减少动态和可选的原创合成山音。
- 八种终章、完整年表与前世录、可继续的未完人生。
- 出生、当前人生和终章的 PNG 卡，独立 HTML 传记、CSV 年表与 JSON 档案。HTML 可离线阅读并通过浏览器打印另存 PDF。

游戏使用独立的 `shanhai.life.v1` 本地档案。新人生保留已有的人生；写入前备份上一份完整档案。损坏、配额不足和多页面冲突会提示处理，也能导出尚未写入的本页进度。导入同一人生的不同进度时，可预览后并存两份，采用文件副本继续。恢复备份前的原档也可从存档页面另存。

跨设备游玩：从偏好中的“存档、备份与导入”下载 JSON，在另一台设备运行相同版本后导入。站点域名、端口或浏览器变化会使用不同的本地存储位置，先导出全量档案再转移。

可运行的校验命令：

```sh
node scripts/check.mjs
node --test tests/engine.test.mjs tests/storage.test.mjs
node scripts/verify-browser.mjs
node scripts/build.mjs
node scripts/verify-build.mjs
node scripts/run-regression.mjs
```

浏览器检查自动启动独立 Chrome profile，使用临时端口与测试存档。可用 `CHROME_BIN` 指定 Chrome 路径。结果保存在忽略的 `artifacts/` 与 `.local/`；正式核验摘要见 [交付说明](docs/delivery.md)。

`build` 生成可部署到静态 HTTPS 站点的 `dist/`，保持 `/apps/web/`、`/packages/`、`/content/` 路径。重建时会将本项目已有 `dist` 保留至 `.local/previous-dist-*`，遇到其他项目或无标记输出会停止。可用 `node scripts/serve.mjs --dir=dist --port=8867` 验收构建。

本轮验收范围是 Windows Chrome 和移动视口模拟。macOS/Linux、Safari/Firefox、iOS/Android 真机需另行运行相应验收；云存档、公共传记、社区、视频以及更完整的炼丹炼器与洞府编辑列在后续计划中。功能状态见 [Web 路线图](docs/web-roadmap.md)，世界规则见 [世界设定](docs/world-bible.md)，来源见 [原创与参考记录](docs/provenance.md)。
