# 原创实现与参考记录

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
