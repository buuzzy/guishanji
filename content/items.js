/** 道具总表 —— 世界域（①）：世界本身怎么运转。
 *
 *  基础道具写在本文件；「修订九」「俗世生活」「境界推进」三条线各自带来的道具
 *  由那三份内容表提供，在这里并进同一张总表（内容仍然只有一份，不复制）。
 */

import {REVISION9_ITEMS} from './revision9-stories.js';
import {MUNDANE_ITEMS} from './mundane-stories.js';
import {ADVANCEMENT_ITEMS} from './progression-stories.js';

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
