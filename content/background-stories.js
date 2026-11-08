/**
 * 背景故事线表（12 条）—— 玩家为什么走上（或走不上）修仙路
 * ============================================================================
 *
 * ## 这张表是什么
 * --------------
 * 用户 2026-11-06 的第一条主张：「角色要有**理由去修仙**；理由在**轮盘时**设定
 * （父母生病 / 救人一命 / 捡到法宝 / 生在宗门 / 名门望族 / 修仙世家…）。
 * 背景线索**只指向唯一结果**：一类指向「与修仙无缘」，一类指向「入宗门」。」
 *
 * ⇒ 以前这条主张**只落实了四分之一**：出身只分四种（ordinary / demonic / beast /
 *   loose），由 `hashText(seed+':early')` 抽出来，玩家看不出自己为什么走这条路；
 *   而 `early_demonic` / `early_beast` / `early_loose` 三张卡**本身就是岔路**
 *   （两张岔路、一个岔路），与「只指向一条路」正好相反。
 *
 * ## 结构（2026-11-08 · 阶段 3）
 * --------------------------
 * **一条背景 = 一张必答卡（不是岔路），两个选项，只指向一条路。**
 *   · **入宗门侧 8 条** —— 直接走到**测灵根**那张唯一的决策卡；
 *     排队那一段是**铺垫**（12 个月的等待本身就是排队），留在旁白里，
 *     决策卡只留真正的抉择 ⇒ 开局的卡数不增加，密度闸不会被开场塞满。
 *     其中「收养你的幽灯堂」「老猿教你控制妖身」两条入的不是同一座山门
 *     （山门队列只接引人），各接各的主线。
 *   · **与修仙无缘侧 4 条** —— 直接走进凡人的日子（`path:'mortal'`），
 *     之后由凡人线接手。
 *
 * ⚠⚠ **模数按「这条命能走的路」取，不是一律 % 12**：
 *   没有可修炼的根骨的命，只从「与修仙无缘」那 4 条里选；
 *   能修炼的命，只从「入宗门」那 8 条里选。
 *   ⇒ 否则会出现「故事说与修仙无缘、却有灵根」这种自相矛盾。
 *   ⚠ **不因此改灵根**（改了就与轮盘上看到的对不上，也会牵连历史版本）——
 *     路的归属由**灵根**决定，背景只负责讲清「你是从什么处境来的」。
 *
 * ## 规矩
 * ------
 *   · **正文 ≤ 90 字**（表达域门禁的判据）；提示语与选项字面照抄规矩。
 *   · **不许发明专名**（表达域门禁会抓）—— 这 12 张卡里一个人名都没有，
 *     只写「父亲」「药师」「族老」这种关系词。
 *   · **两个选项通向同一条路**：它们表达的是**两种态度**（急 / 稳），
 *     不是两条岔路 ⇒ 玩家在这张卡上做不了「改变命运」的决定，
 *     真正能改变命运的是后面的**测灵根**。
 *   · 本文件**不 import 任何东西**（内容层的叶子文件 ⇒ 永远不在环里）。
 */
export const BACKGROUND_STORIES = [
  /* ── 入宗门侧 8 条 ────────────────────────────────────────────────── */
  {
    id: 'background_ill_parent',
    road: 'sect',
    upbringing: 'ordinary',
    title: '父亲的咳疾',
    text: '父亲的咳疾拖了三年。村口的人说，山门收弟子，管住也管药。你把家里的铁器卖了，准备去问一条活路。',
    options: [
      {id: 'go', label: '当天就动身', hint: '走得早等得久，盘缠要自己备。', reply: '你在山门外排上了队。'},
      {id: 'settle', label: '把家里的事交代清楚再走', hint: '多留几天，少带些盘缠。', reply: '你交代完家事，才动身上路。'},
    ],
  },
  {
    id: 'background_saved_stranger',
    road: 'sect',
    upbringing: 'ordinary',
    title: '你救过的那个人',
    text: '你在河边救过一个赶路的人。他伤好之后说，山门收弟子，管住也管药，还指了条上山的路。',
    options: [
      {id: 'ask', label: '去问个准信', hint: '问清楚再走，免得白跑一趟。', reply: '你问明了报名的事，转身往山门去。'},
      {id: 'wait', label: '等他自己来讲', hint: '让救命之恩多放些日子。', reply: '他伤好之后带你上了路。'},
    ],
  },
  {
    id: 'background_born_sect',
    road: 'sect',
    upbringing: 'ordinary',
    title: '生在宗门人家',
    text: '家里世代给山门挑人，管事年年上门问一次。今年又来问了，问的还是你。',
    options: [
      {id: 'go', label: '跟着管事走', hint: '山门认得你家里。', reply: '你随管事上了路。'},
      {id: 'ask', label: '先问清楚今年收什么人', hint: '多问一句总不吃亏。', reply: '你问过明白，才随管事上路。'},
    ],
  },
  {
    id: 'background_noble_house',
    road: 'sect',
    upbringing: 'ordinary',
    title: '名门望族',
    text: '家里在郡里排得上号，早年替你在山门报过名。那张名帖一直压在你母亲手里。',
    options: [
      {id: 'take', label: '接过那张名帖', hint: '名帖在手，入门的门路就宽。', reply: '你接过名帖，随家人上了路。'},
      {id: 'ask', label: '先问名帖的用处', hint: '问明白了再走，也不迟。', reply: '你问过名帖的用处，才动身。'},
    ],
  },
  {
    id: 'background_cultivator_family',
    road: 'sect',
    upbringing: 'ordinary',
    title: '修仙世家的旁支',
    text: '族里出过修仙的人，你这一房却分在了旁支。族老说，根骨未显也可以去山门碰碰运气。',
    options: [
      {id: 'go', label: '去碰一次运气', hint: '收不收，看测灵根。', reply: '你带着族里的话上了山。'},
      {id: 'ask', label: '先问族里借不借得上人', hint: '旁支出门，总要有个说法。', reply: '你问清了族里的意思，才走。'},
    ],
  },
  {
    id: 'background_healer_note',
    road: 'sect',
    upbringing: 'loose',
    title: '游方药师留下的笔记',
    text: '战乱里救过你的药师要远行。他把基础功法与药方留给你，说坊市正缺会认药的学徒，山门那边也在招人。',
    options: [
      {id: 'learn', label: '在坊市接活，继续学法', hint: '先有住处和收入。', reply: '你租下小屋，照着笔记练习。'},
      {id: 'ask', label: '先问清坊市缺什么手艺', hint: '带着笔记去，心里更有底。', reply: '你问明坊市缺什么，收好笔记上路。'},
    ],
  },
  {
    id: 'background_dark_sect',
    road: 'sect',
    upbringing: 'demonic',
    title: '收养你的幽灯堂',
    text: '小时候，一名幽灯堂修士把你带离战乱。他教你读字和打坐，如今要在堂中登记你的名字。',
    options: [
      {id: 'stay', label: '在堂中登记', hint: '这里认你，也有规矩要守。', reply: '你领到堂中的弟子牌。'},
      {id: 'ask', label: '先问清堂里的规矩', hint: '规矩不明，往后处处被动。', reply: '你问过规矩，才在堂中登记。'},
    ],
  },
  {
    id: 'background_beast_born',
    road: 'sect',
    upbringing: 'beast',
    title: '老猿教你控制妖身',
    text: '出生时的异象改变了你的身体。家人把你藏在山中，老猿教你控制爪牙和气息，猎人已经发现了附近的足迹。',
    options: [
      {id: 'stay', label: '随老猿守住山林', hint: '同族也需要安全的栖地。', reply: '你留在山林，随同族修行。'},
      {id: 'hide', label: '先问清怎么藏住气息', hint: '山外的人认得这身异相。', reply: '老猿教你怎么藏住气息，猎人没找上来。'},
    ],
  },

  /* ── 与修仙无缘侧 4 条 ────────────────────────────────────────────── */
  {
    id: 'background_weak_body',
    road: 'mortal',
    upbringing: 'ordinary',
    title: '生下来就弱',
    text: '你生下来就比别的孩子弱，药汤没断过。大夫只让你做些轻省的活，重的活不许沾手。',
    options: [
      {id: 'accept', label: '先把身子养好', hint: '别的以后再说。', reply: '你留下来，先把自己的日子过好。'},
      {id: 'keep', label: '还是想去看一眼', hint: '看一眼也不费什么。', reply: '你去看过一眼，最后还是留了下来。'},
    ],
  },
  {
    id: 'background_root_hurt',
    road: 'mortal',
    upbringing: 'ordinary',
    title: '旧伤压住了根骨',
    text: '幼时从高处摔下，落下病根，阴雨天就疼。家里人说，旁的先不必想，把身子养好要紧。',
    options: [
      {id: 'accept', label: '听家里的话', hint: '身子要紧。', reply: '你把心思收回家里，先养着身子。'},
      {id: 'keep', label: '还是想试一试', hint: '试一试也不费什么。', reply: '你试过，最后还是留了下来。'},
    ],
  },
  {
    id: 'background_family_debt',
    road: 'mortal',
    upbringing: 'ordinary',
    title: '家里欠着债',
    text: '家里欠着药钱，你十二岁就跟着船老大做工。管事说，旁的孩子这时候还在念书。',
    options: [
      {id: 'accept', label: '把工接着做完', hint: '债压着，人就得挣钱。', reply: '你接着做工，把债一点点还上。'},
      {id: 'keep', label: '还想抽空认几个字', hint: '识字总比不识字强。', reply: '你抽空认了字，工也没落下。'},
    ],
  },
  {
    id: 'background_orphan_war',
    road: 'mortal',
    upbringing: 'loose',
    title: '战乱里失了父母',
    text: '战乱里父母都没了，你跟着流民走了两年，住在别人家灶房的边上。活下来靠的是会看脸色。',
    options: [
      {id: 'accept', label: '就这样活下去', hint: '活着已经是本事。', reply: '你跟着流民安顿下来，先找口饭吃。'},
      {id: 'keep', label: '还想给以后攒一点', hint: '手边省下的都是以后的。', reply: '你一点点攒下东西，为以后留了条路。'},
    ],
  },
];

/** 按 id 查（规则层与内容层都用它）。 */
export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUND_STORIES.map(b => [b.id, b]));

/** 入宗门侧（能修炼的命从这 8 条里选）。 */
export const SECT_BACKGROUNDS = BACKGROUND_STORIES.filter(b => b.road === 'sect');
/** 与修仙无缘侧（没有可修炼的根骨的命从这 4 条里选）。 */
export const MORTAL_BACKGROUNDS = BACKGROUND_STORIES.filter(b => b.road === 'mortal');
