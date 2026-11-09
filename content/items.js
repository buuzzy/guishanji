/** 道具总表 —— 世界域（①）：世界本身怎么运转。
 *
 *  基础道具写在本文件；「修订九」「俗世生活」「境界推进」三条线各自带来的道具
 *  由那三份内容表提供，在这里并进同一张总表（内容仍然只有一份，不复制）。
 */

import {REVISION9_ITEMS} from './revision9-stories.js';
import {MUNDANE_ITEMS} from './mundane-stories.js';
import {ADVANCEMENT_ITEMS} from './progression-stories.js';

/**
 * 境界章编号对照（2026-11-08 · 章节感补强 A4，写死在头注释里，逐件标注以它为准）：
 *   0 凡身章（出生 → 炼气突破）  1 炼气章（炼气突破 → 筑基突破）
 *   2 筑基章（筑基突破 → 结丹）  3 金丹章（结丹 → 化婴）  4 元婴章（化婴 → —）
 * `stageRealm: n` = 此物属于第 n 境的章；突破**离开**第 n 境（进入 n+1）时清算移除。
 * 不标 stageRealm = 永久道具（信物、功法、凡俗线物件——跨章只带人生级变量）。
 * 清算本体在 `packages/adventure/engine.js` 的突破分支；重试冲关期间仍在本章，绝不清算。
 */
export const ITEMS = {
  foundation_pill: {name:'筑基丹',detail:'冲关时保护经脉，须实际得到并在闭关中用去；不能保证筑基成功。'},
  return_chart: { name: '归山阵图', detail: '旧山门的阵眼位置。归来时可以避开正面强攻。' },
  herb_kit: { name: '药师行囊', detail: '可用于救治、稳妥筑基与缓解金丹旧伤。' },
  ward: { name: '护身玉符', detail: '在追杀、遗迹和雷劫中提供一次额外保障。' },
  rainstone: { name: '引雨石', detail: '保存的一场山雨。能换取烬原的信任。' },
  old_letter: { name: '旧信', detail: '阿砚写给山门的信，记录流亡者的去向。' },
  tide_token: { name: '潮契', detail: '听潮港认你的承诺，潮舟会应约前来。' },
  ember_engine: { name: '地火炉心', detail: '烬原匠人的结晶。能稳定传送阵与破损灵脉。' },
  sky_scroll: { name: '浮屿天图', detail: '记录界海裂隙的周期，能绕开尊者的封锁。' },
  spirit_pearl: { name: '定魂珠', detail: '遗迹中的护魂之物，冒险结丹额外增加两成成功把握，也可消耗它稳妥结丹。' },
  beast_scale: { name: '幼兽鳞片', detail: '留下的善意。吞潮兽能辨认同族的气息。' },
  gate_anchor: { name: '界门锚', detail: '稳定跨界入口。可以接走难民、运送援军或继续远行。' },
  teacher_blade: { name: '闻竹的旧剑', detail: '师父留下的最后一课。斩开假身时增加把握。' },
  home_seed: { name: '渡云松种', detail: '山门有形的记忆，可在任何一片土地重新栽下。' },
  lunar_ore: { name: '月白矿', detail: '用于修复器物。可换取炉心或筑基材料。' },
  phantom_mask: { name: '掩息面具', detail: '避开追猎的标记。归途也能掩护同行者。' },
  wind_seed: { name: '回风灵种', detail: '回风谷带出的灵种。稳固筑基、辨认秘境风向，也能交给昔日同伴培育。' },
  moon_key: { name: '沉星钥', detail: '沉星洞府的阵钥。能够绕开裂隙里的夺灵阵，归来时也可打开被改造成牢阵的旧门。' },
  echo_jade: { name: '留声玉', detail: '保存试炼同行者的路线与名字。失散者能够凭它重逢，后来的救援也可以使用这些路径。' },
  mirror_heart: { name: '界心', detail: '域外空间带回的界门核心。能守住两岸、抵御归来之劫，也可用于最后一次问道。它并不保证永远留在你手中。' },
  signal_talisman: { name: '传音符', detail: '与山门留下的灯号相连。闭关与试炼中可以收到急讯，跨入域外后还须有定位之物，才不会隔着断裂的界海失联。' },
};
Object.assign(ITEMS,ADVANCEMENT_ITEMS,REVISION9_ITEMS,MUNDANE_ITEMS);

/* ── 章节感补强 A2/A4（2026-11-08）────────────────────────────────────
 * 炼气章的两件新收获（奇遇卡「废弃洞府」产出，定义放在并表之后防覆盖）+ 全表阶段标注。
 * `stageRealm: n` = 属于第 n 境的章，突破离开第 n 境（进入 n+1）时清算移除；
 * 重试冲关期间仍在本章，绝不清算（见 engine.js 突破分支）。
 * 永久道具不进这份表：信物（归山阵图/镜心/护符/药匣/传音符等）、功法（影册/血册/洗脉丹）、
 * 凡俗线 3 件、渡劫 2 件、借阅残卷；考场三件暂不标。 */
Object.assign(ITEMS,{
  qi_cave_map: {name:'洞府残图',detail:'半张手绘的阵基图，画的是这附近一片谷地。筑基冲关时心里更有底；入筑基之后，图上的东西就与你无关了。',stageRealm:1},
  qi_herb: {name:'百年灵草',detail:'废弃药圃里起出的一株百年分的灵草。药性养过经脉，筑基冲关时稳一些；放久了药力会随境界推移散逸。',stageRealm:1},
  /* 故事重写 W1（2026-11-09）：同期弟子的两件信物。 */
  shiweng_pot: {name:'石瓮的陶罐',detail:'石瓮塞给你的旧陶罐，闭关时接水省得开门。出关时心境踏实些——它不算冲关的把握，算有人替你操着心。',stageRealm:1},
  xiaoman_herbs: {name:'小满的药材包',detail:'小满下山前塞给你的药材，养过经脉。筑基冲关时稳一些；与百年灵草同一档，不叠加。',stageRealm:1},
});
const STAGE_REALM = {
  foundation_pill: 1,                                   /* 炼气章：冲关卡 cost 兜底，残留入筑基时清 */
  condensation_book: 2, beast_core: 2, false_core: 2,   /* 筑基章：结丹材料，入金丹时清 */
  golden_pill: 2, rough_pill: 2,
  soul_book: 3, soul_flower: 3, nascent_pill: 3,        /* 金丹章：化婴材料，入元婴时清 */
  rough_nascent: 3,
};
for(const [id,n] of Object.entries(STAGE_REALM))if(ITEMS[id])ITEMS[id].stageRealm=n;
