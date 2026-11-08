/**
 * 背景故事线表（15 条）—— 玩家为什么走上（或走不上）修仙路
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
 *   · **入宗门侧 11 条** —— 直接走到**测灵根**那张唯一的决策卡；
 *     排队那一段是**铺垫**（12 个月的等待本身就是排队），留在旁白里，
 *     决策卡只留真正的抉择 ⇒ 开局的卡数不增加，密度闸不会被开场塞满。
 *     其中「收养你的幽灯堂」「老猿教你控制妖身」两条入的不是同一座山门
 *     （山门队列只接引人），各接各的主线。
 *   · **与修仙无缘侧 4 条** —— 直接走进凡人的日子（`path:'mortal'`），
 *     之后由凡人线接手。
 *
 * ⚠⚠ **模数按「这条命能走的路」取，不是一律 % 12**：
 *   没有可修炼的根骨的命，只从「与修仙无缘」那 4 条里选；
 *   能修炼的命，只从「入宗门」那 11 条里选。
 *   ⇒ 否则会出现「故事说与修仙无缘、却有灵根」这种自相矛盾。
 *   ⚠ **不因此改灵根**（改了就与轮盘上看到的对不上，也会牵连历史版本）——
 *     路的归属由**灵根**决定，背景只负责讲清「你是从什么处境来的」。
 *
 * ## 出身（2026-11-08 · 阶段一：出身真正驱动剧情）
 * --------------------------------------------------
 * ⚠⚠ **以前这张表是按「灵根」分池抽的，出身根本不参与** ⇒
 *   轮盘上写着「名门大户」，玩家却抽到「战乱里被游方药师救过」——
 *   实测（每种出身 400 条命）：名门大户只有 **10%** 抽到配得上的身世卡，
 *   修仙世家 11%，山村药农 **0%**。
 *   ⇒ 现在每条背景都写明 **`origins`：哪一种出身会抽到它**，
 *   规则层**先按出身过滤、再按灵根过滤**，最后才哈希抽 ⇒ 匹配率 100%。
 *
 * ⚠ **轮盘只有 3 种出身**（实测 2000 次）：
 *   山村药农（common）/ 名门大户（noble）/ 修仙世家（clan）。
 *   `packages/adventure/engine.js` 的 `ORIGINS` 里另有「渡口匠人」「流浪少年」，
 *   但 `FAMILIES` 只有三族 ⇒ 那两条**轮盘永远转不到**（登记为已知缺口，本轮不动）。
 *
 * ⚠ **`path` 与 `upbringing` 是两件事**（别再混用）：
 *   · `path` —— 这条身世把你送进**哪条路**（sect / loose / demonic / beast / mortal）。
 *   · `upbringing` —— 你**童年过的是什么日子**（ordinary 有人照看 / loose 跟着商路走 /
 *     demonic 魔道收养 / beast 妖身）⇒ 童年卡池与童年旁白读它。
 *   ⇒ 「家道中落」（名门大户当散修）这条路走 loose，但童年仍是 ordinary
 *     ⇒ **名门大户不会因为当散修就去跟商队跑货**。
 *
 * ## 规矩
 * ------
 *   · **正文 ≤ 90 字**（表达域门禁的判据）；提示语与选项字面照抄规矩。
 *   · **不许发明专名**（表达域门禁会抓）—— 这 15 张卡里一个人名都没有，
 *     只写「父亲」「药师」「族老」这种关系词。
 *   · **两个选项通向同一条路**：它们表达的是**两种态度**（急 / 稳），
 *     不是两条岔路 ⇒ 玩家在这张卡上做不了「改变命运」的决定，
 *     真正能改变命运的是后面的**测灵根**。
 *   · 本文件**不 import 任何东西**（内容层的叶子文件 ⇒ 永远不在环里）。
 */

/** 出身 → 家境（`birth.family`）。轮盘只转得出这三族。 */
export const ORIGIN_BY_FAMILY = {common: 'village', noble: 'noble', clan: 'clan'};

/**
 * 这条命是**哪一种出身**（抽身世卡时用）。
 * ⚠ `player.origin` 优先；缺了（探针状态 / 旧档）就从 `birth.family` 反推。
 * @param {object} state 当前人生状态
 * @returns {string} 'village' | 'noble' | 'clan' | 其它（显式传入的出身）
 */
export function originKey(state) {
  const o = state && state.player && state.player.origin;
  if (typeof o === 'string' && o) return o;
  return ORIGIN_BY_FAMILY[state && state.birth && state.birth.family] || 'village';
}

/**
 * 文案分支用哪一套说法：**只有三套**（山村药农 / 名门大户 / 修仙世家）。
 * ⚠ 与 `originKey` 的区别：`originKey` 认得出「渡口匠人」这种轮盘转不到的出身，
 *   而文案只有三套 ⇒ 不认识的出身按山村药农那套写。
 * @param {object} state 当前人生状态
 * @returns {'village'|'noble'|'clan'}
 */
export function originBranch(state) {
  const o = state && state.player && state.player.origin;
  if (o === 'noble' || o === 'clan') return o;
  return 'village';
}

/** 三个出身都有的（凡人与修仙无缘那侧）。 */
const ALL = ['village', 'noble', 'clan'];

/*
 * ⚠ **路口卡（`reception` / `root_result`）的「去坊市」说法，按出身分三套**。
 *
 * 「16 岁去坊市接活」是玩家最先撞上的那句不对味的话 —— 它来自那两张卡，
 * 而选项以前**对所有出身一律照给**「山下有人招收学徒」
 * ⇒ 轮盘上写着「名门大户」的人，看到的却是「去坊市当学徒」。
 *
 * ⚠ 放在这个叶子文件里，是因为**规则层与表达域都要用同一份**：
 * 表达域会覆盖规则层的说法 ⇒ 两边不一样，玩家读到的和门禁量的就对不上。
 * ⚠ **只改说法，不改后果**：选项通向的路一个字没动（还是 `path:'loose'`）。
 */
export const MARKET_HINT = {
  village: '山下坊市有人招收学徒，先有住处和收入。',
  noble: '家道已经使不上力，山下坊市还认你一个出身。',
  clan: '族里断了月例，坊市还有别的去处。',
};
export const MARKET_REPLY = {
  village: '你离开队伍，在坊市找到了落脚的地方。',
  noble: '你没有走家里的门路，收拾包袱下了山。',
  clan: '你把族里的名字留在案上，独自去了山下。',
};
export const OTHER_PATH_HINT = {
  village: '宗门的标准并不代表所有师承。',
  noble: '家里的门路断了，宗门的标准也不代表所有师承。',
  clan: '族里的功法要族里点头，宗门的标准也不代表所有师承。',
};
export const OTHER_PATH_REPLY = {
  village: '你向游方药师打听功法，开始自己筹钱与练习。',
  noble: '你没有回去求族里，转去坊市向游方药师打听功法，自己筹钱与练习。',
  clan: '你没有回族里等点头，转去坊市向游方药师打听功法，自己筹钱与练习。',
};

export const BACKGROUND_STORIES = [
  /* ── 入宗门侧 11 条 ────────────────────────────────────────────────── */
  {
    id: 'background_ill_parent',
    road: 'sect',
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['village'],
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
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['village'],
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
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['village', 'clan'],
    title: '生在宗门人家',
    /* ⚠ 世家与山村不是一回事 ⇒ 正文分两套说法。 */
    text: s => (originBranch(s) === 'clan'
      ? '族里与山门有旧交，管事年年上门问一次这一房的孩子。今年又来问了，问的还是你。'
      : '家里世代给山门挑人，管事年年上门问一次。今年又来问了，问的还是你。'),
    options: [
      {id: 'go', label: '跟着管事走', hint: '山门认得你家里。', reply: '你随管事上了路。'},
      {id: 'ask', label: '先问清楚今年收什么人', hint: '多问一句总不吃亏。', reply: '你问过明白，才随管事上路。'},
    ],
  },
  {
    id: 'background_noble_house',
    road: 'sect',
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['noble'],
    title: '名门望族',
    text: '家里在郡里排得上号，早年替你在山门报过名。那张名帖一直压在你母亲手里。',
    options: [
      {id: 'take', label: '接过那张名帖', hint: '名帖在手，入门的门路就宽。', reply: '你接过名帖，随家人上了路。'},
      {id: 'ask', label: '先问名帖的用处', hint: '问明白了再走，也不迟。', reply: '你问过名帖的用处，才动身。'},
    ],
  },
  {
    id: 'background_noble_recommend',
    road: 'sect',
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['noble'],
    title: '郡里的名帖',
    text: '郡里有人替你保举过，话递到山门就没了回音。那张名帖留在别人手上，要你自己去取一趟。',
    options: [
      {id: 'go', label: '去取那张名帖', hint: '路远，去了也可能扑空。', reply: '你取了名帖，随路上的人上了山。'},
      {id: 'ask', label: '先问清是谁递的话', hint: '问明白了再走，也不迟。', reply: '你问过那番话的来路，才动身。'},
    ],
  },
  {
    id: 'background_noble_exile',
    road: 'sect',
    path: 'loose',
    upbringing: 'ordinary',
    origins: ['noble'],
    title: '家道中落',
    text: '铺子被收，长辈获罪，家里贴不起膏药了。你把一卷旧账收进包袱，山下的坊市还在招人。',
    options: [
      {id: 'go', label: '去坊市找活计', hint: '先有住处和收入，账以后再算。', reply: '你在坊市租下小屋，先找了一份能糊口的活。'},
      {id: 'ask', label: '先问清旧账还剩多少', hint: '问明白了再走，也不迟。', reply: '你问过旧账的数目，收好包袱上路。'},
    ],
  },
  {
    id: 'background_cultivator_family',
    road: 'sect',
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['noble', 'clan'],
    title: '修仙世家的旁支',
    /* ⚠ 名门大户不是修仙世家 ⇒ 正文分两套说法。 */
    text: s => (originBranch(s) === 'noble'
      ? '家里在郡里排得上号，也出过修仙的远亲。你这一房不在族里说话算数的那一支，族老说根骨未显也可以去山门碰碰运气。'
      : '族里出过修仙的人，你这一房却分在了旁支。族老说，根骨未显也可以去山门碰碰运气。'),
    options: [
      {id: 'go', label: '去碰一次运气', hint: '收不收，看测灵根。', reply: '你带着族里的话上了山。'},
      {id: 'ask', label: '先问族里借不借得上人', hint: '旁支出门，总要有个说法。', reply: '你问清了族里的意思，才走。'},
    ],
  },
  {
    id: 'background_clan_legacy',
    road: 'sect',
    path: 'sect',
    upbringing: 'ordinary',
    origins: ['clan'],
    title: '家传护符与旧盟',
    text: '族里给了你一枚旧护符和半卷调息法。护符是家传的，族中旧盟与旧怨也一并不认外人。',
    options: [
      {id: 'take', label: '收下那枚护符', hint: '东西有用，账也算在你头上。', reply: '你收下护符，随族中长辈上了路。'},
      {id: 'ask', label: '先问清族里要你做什么', hint: '问明白了再接，也不迟。', reply: '你问过族里的安排，才收下护符。'},
    ],
  },
  {
    id: 'background_healer_note',
    road: 'sect',
    path: 'loose',
    upbringing: 'loose',
    origins: ['village'],
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
    path: 'demonic',
    upbringing: 'demonic',
    origins: ['village'],
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
    path: 'beast',
    upbringing: 'beast',
    origins: ['village'],
    title: '老猿教你控制妖身',
    text: '出生时的异象改变了你的身体。家人把你藏在山中，老猿教你控制爪牙和气息，猎人已经发现了附近的足迹。',
    options: [
      {id: 'stay', label: '随老猿守住山林', hint: '同族也需要安全的栖地。', reply: '你留在山林，随同族修行。'},
      {id: 'hide', label: '先问清怎么藏住气息', hint: '山外的人认得这身异相。', reply: '老猿教你怎么藏住气息，猎人没找上来。'},
    ],
  },

  /* ── 与修仙无缘侧 4 条（三家出身都有）───────────────────────────────── */
  {
    id: 'background_weak_body',
    road: 'mortal',
    path: 'mortal',
    upbringing: 'ordinary',
    origins: ALL,
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
    path: 'mortal',
    upbringing: 'ordinary',
    origins: ALL,
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
    path: 'mortal',
    upbringing: 'ordinary',
    origins: ALL,
    title: '家里欠着债',
    /* ⚠ 三家欠的东西不一样 ⇒ 正文分三套说法。 */
    text: s => ({
      village: '家里欠着药钱，你十二岁就跟着船老大做工。管事说，旁的孩子这时候还在念书。',
      noble: '家里欠着债，铺子的账要有人顶。你十二岁就跟着老账房做工。管事说，旁的孩子这时候还在念书。',
      clan: '族里欠着库里的账，这一房停了月例。你十二岁就跟着族中执事做事。管事说，旁的孩子这时候还在念书。',
    })[originBranch(s)],
    options: [
      {id: 'accept', label: '把工接着做完', hint: '债压着，人就得挣钱。', reply: '你接着做工，把债一点点还上。'},
      {id: 'keep', label: '还想抽空认几个字', hint: '识字总比不识字强。', reply: '你抽空认了字，工也没落下。'},
    ],
  },
  {
    id: 'background_orphan_war',
    road: 'mortal',
    path: 'mortal',
    upbringing: 'ordinary',
    origins: ALL,
    title: '战乱里失了父母',
    /* ⚠ 三家失散的方式不一样 ⇒ 正文分三套说法。 */
    text: s => ({
      village: '战乱里父母都没了，你跟着流民走了两年，住在别人家灶房的边上。活下来靠的是会看脸色。',
      noble: '战乱里城破了，家人和你走散。你在城里躲了两年，住在别人家灶房的边上。活下来靠的是会看脸色。',
      clan: '战乱里族里分了头，你跟着长辈逃了两年，住在别人家灶房的边上。活下来靠的是会看脸色。',
    })[originBranch(s)],
    options: [
      {id: 'accept', label: '就这样活下去', hint: '活着已经是本事。', reply: '你跟着流民安顿下来，先找口饭吃。'},
      {id: 'keep', label: '还想给以后攒一点', hint: '手边省下的都是以后的。', reply: '你一点点攒下东西，为以后留了条路。'},
    ],
  },
];

/** 按 id 查（规则层与内容层都用它）。 */
export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUND_STORIES.map(b => [b.id, b]));

/** 入宗门侧（能修炼的命从这 11 条里选）。 */
export const SECT_BACKGROUNDS = BACKGROUND_STORIES.filter(b => b.road === 'sect');
/** 与修仙无缘侧（没有可修炼根骨的命从这 4 条里选）。 */
export const MORTAL_BACKGROUNDS = BACKGROUND_STORIES.filter(b => b.road === 'mortal');
