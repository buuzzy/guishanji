# 原创实现与参考记录

> 本文记录旧 0.2.0 产品「山海一生」的原创实现。2026-11-06 网页端独立化后，旧产品的页面与
> 专属模块已整体移入 [`legacy/old-web/`](../legacy/old-web/)（例如原文提到的 `packages/render/canvas.js`、
> `packages/media/audio.js`、`apps/web/` 现在都在那里）；当前产品「归山记」的来源记录见
> [`docs/migration/source-manifest.json`](migration/source-manifest.json)。本文正文保持原样，不回改历史。

本项目在用户确定纯 Web 方向后，独立建立于 `C:/Users/CaiYiyang/xianxia-life`。代码、世界、剧情、图形和音乐在本项目编写。

| 内容 | 实现与来源 |
|---|---|
| 世界、人物与故事 | `content/` 的原创架空设定与选项文本 |
| 人生内核 | 本项目的原生 JavaScript；整数月、独立随机流、事件队列、稳定人物 ID 和明确终章 |
| 随机算法 | 自行实现标准 Park–Miller 递推与 FNV 风格文字哈希；算法名称不是本项目的原创数学发明 |
| 画面与图标 | `packages/render/canvas.js`、Web 内的 SVG 与 CSS；运行时程序绘制，无抓取的游戏图片 |
| 音乐 | `packages/media/audio.js` 中自行编排的五声音阶短句，通过 Web Audio 合成 |
| 字体 | 系统中文与系统界面字体；没有捆绑、下载或依赖远程字体 |
| 运行与校验 | 原生浏览器 API、Node 内置模块、独立 Chrome CDP 验证；没有第三方运行依赖 |

1in8b 作为人生模拟玩法与工程组织的研究参考。上一阶段规划已读取 [1in8b 官方条款](https://1in8b.life/en/terms/)，并确定此新产品采用独立编写路径。未将其官方源码、剧情、素材、音乐、国家数据或玩家存档导入本项目；现有参考仓库仍独立保留。

本轮没有从修仙小说摘录人物、地点、剧情或长段文字。修行、师承与灵石等使用通行的类型概念，其组合、数值和文本由本作设定。它们在游戏中作为架空规则呈现。

0.2.0 根据用户建议，通过搜索服务查询并读回《觅长生》《鬼谷八荒》《了不起的修仙模拟器》的官方 Steam 介绍，参考时间成本、修行准备、地域机会、丹药与 NPC 自主人生等机制。没有实际游玩或检查其源码；本作没有导入这些游戏的代码、素材、剧情或专名，具体数量与实现由本项目编写。

父母讣告、返乡、成服、安葬及周年追思参考宁县政府礼俗资料、北京大学托管的传统礼制研究与湖南政府的土家族习俗资料。资料的地域、时代与民族范围分别保留；24/6 月守丧、收费和收益折扣是游戏节奏设计。依据、短引文、采用范围与下一阶段机制见 [研究记录](feedback-research.md) 和 [来源核验摘要](feedback-sources.json)。

技术参考入口：

- [Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
- [Canvas.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
- [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

本轮的实现验收依据本机代码和独立测试结果。技术链接用于接口参考；先前规划资料中涉及其他平台的能力结论不扩展为本项目的验收结果。

2026-11-02 的独立 HTML 冒险试玩 `apps/preview/` 遵照用户明确要求，改为复用其现有 1in8b 前端设计与像素模块。原 Web 0.2.0 的独立实现说明仍指向 `apps/web/`；新试玩复用的五个绘图模块及四份 WXSS（主题、生活、卡片、出生命盘）原路径、原始 SHA-256、换行规范后的 SHA-256 位于 `apps/preview/reference/provenance.json`。`scripts/build-preview-assets.mjs` 仅转换单位、DOM 选择器并静态包装 CommonJS，没有引入 1in8b 的人生剧情、生产数据、远程服务或存档。新剧情、人物、选择、跨大陆规则与月份结算在本工作树原创编写。

冒险节奏参考直接读回的发行商介绍：[觅长生](https://store.steampowered.com/app/1189490/)、[鬼谷八荒](https://store.steampowered.com/app/1468810/)、[了不起的修仙模拟器](https://store.steampowered.com/app/955900/)、[Cultist Simulator](https://store.steampowered.com/app/718670/)、[Roadwarden](https://store.steampowered.com/app/1155970/)。采用范围是有限时间的旅行、人物关系、宗门危机、卡片选择与长期后果，没有实际游玩这些竞品，也未导入其内容或素材。中国哲学书电子化计划的山海经目录仅用于古典题材索引，不作为已通读经典的证据。读回时间、响应与正文哈希保存在忽略的 `.local/adventure-research/manifest.json`。

新试玩的真人时长与重玩意愿需用户体验确认。规则模拟的完成数、真实浏览器点选的人生、移动视口和构建门禁分别记录在 `artifacts/`，不代称微信开发者工具、真机、线上部署或真人留存验证。

2026-11-03 根据用户最新要求，HTML 试玩 Canvas 改由本项目独立的 cultivation-scene.js 程序绘制，不再导入、构建或随静态产物包含旧 pixel.js。主题、卡片和命盘样式仍沿用已有设计；旧绘图参考原件仅作为来源证据保留。用户要求轮盘使用热门小说角色全名，novel-names.js 保存经公开角色条目核对的姓名、外观、作品与来源 URL；这是姓名参考，不将原作人物能力与剧情移入本作。检索中无法确认的名称没有收录。


preview.4 按用户确认的方案重新复用现有前端布局、操作和细致像素画风。运行绘图为 `apps/preview/cultivation-pixel.js`，色板和人物基础比例从授权引用的 `reference/art.cjs` 生成 `pixel-style.js`；修仙建筑、家具、动作、山林、界门及大陆轮廓由本作程序绘制。构建核验引用文件 SHA-256，排除旧 pixel.js 和简化 cultivation-scene.js，浏览器不运行 CommonJS 包装器。

本轮读回的公开作品简介：[凡人修仙传](https://zh.wikipedia.org/wiki/凡人修仙传) 的太南山小会、升仙令、黄枫谷与师承转换；[诛仙](https://zh.wikipedia.org/wiki/诛仙) 的青云七脉、首座与弟子层级，以及张小凡的出身和身份变化。仅核对公开简介，未通读小说全文；仙逆页面未提取到所需片段，一念永恒正文读取失败，二者没有作为本轮细节核验依据。具体门规、人物、关系、事件和数值均为本作架空设计。读取记录保存在忽略的 `.local/cultivation-research/report.json`。
