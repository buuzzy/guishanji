/** 冒险线节点表 —— 因果域（③）：发生什么、有什么后果。
 *
 *  这里是从「进山门」到「另一个地方安家」的整条冒险线（45 个节点）。
 *  每个节点写清：这一幕、正文、三个选项与各自的后果。
 *
 *  末尾那几行「修补」是给个别节点补后补的设置（延长期限、改提示语、改正文），
 *  写在表后面是为了让它们覆盖前面的默认值。
 *
 *  Times are integer months.
 */

const c = (id, label, hint, reply, data = {}) => ({ id, label, hint, reply, ...data });
const n = (id, act, title, text, choices, data = {}) => ({ id, act, title, text, choices, ...data });
const status = (s, id) => s.people[id].status;
const has = (s, item) => s.inventory.includes(item);
const homeLetter = s => status(s, 'master') === 'dead'
  ? '信封里夹着闻竹旧剑上的一小片锈。程照雪写：师父的墓被他们推平了，地牢里还有当年的同门。'
  : status(s, 'master') === 'captured'
    ? '信上写：闻竹还活着，却被锁在旧山门的阵眼里。镜火盟借她维持界门，下一次大潮就会耗尽她的寿元。'
    : '闻竹的笔迹比记忆里轻了许多：我们在山下接住了不少流亡者，可镜火盟又来索人。若你回来，不必为了旧殿丢掉新朋友。';

export const NODES = Object.fromEntries([
  n('entry', 0, '山门只收三个名字',
    '十六岁那年，你沿着松阶来到渡云宗。山门没有测灵石，只有闻竹摆出的三件东西：一把缺口木剑、一盘散乱阵棋、一篮濒死药苗。她说，来处只是起点，肯为谁停下来，才决定你往哪里走。程照雪抱着手等你，沈砚已经把行李放在你的铺边。', [
      c('sword', '拿起木剑，走到风里', '先学御剑。遇险时多一种正面破局的方法。', '闻竹没有传你杀招，只教你收剑。沈砚陪你练到天黑，程照雪把第一道伤口包好。', { effects: { focus: 'sword', skills: { sword: 12 }, stats: { courage: 8 }, people: { friend: { bond: 8 } } } }),
      c('array', '把散乱阵棋重新排好', '先学阵法。探索、界门与救援会用到它。', '你把逃生的出口留在阵棋边缘。闻竹笑了，说能让旁人活着离开的阵，也是一门好法术。', { effects: { focus: 'array', skills: { array: 12 }, stats: { insight: 8 }, people: { master: { bond: 8 } } } }),
      c('alchemy', '先救活药苗', '先学丹术。疗伤与突破可以少冒一些风险。', '程照雪给你腾出半片药圃。第二天，药苗重新发芽，沈砚说今后他的伤也交给你了。', { effects: { focus: 'alchemy', skills: { alchemy: 12 }, stats: { empathy: 8 }, people: { sister: { bond: 8 } } } }),
    ], { next: 'lesson', months: 6 }),

  n('lesson', 0, '一个可以认错的夜晚',
    '沈砚为赶上考核，偷偷借了丹房的火。你们赶到时药圃已烧掉一角，他站在焦土里不敢开口。程照雪准备替他背罚，闻竹却只问，明早谁来告诉那些等药的山民。你的第一次修炼没有卡在境界，而是卡在这一句问话上。', [
      c('together', '陪他认错，一起补回药圃', '花一年劳作，保住同门之间的信任。', '你们一户一户送药，听过责骂，也收到过热饭。后来沈砚遇见危险，总会先找你的眼睛。', { months: 12, effects: { stats: { empathy: 8 }, people: { friend: { bond: 20 }, sister: { bond: 8 } }, flags: { trusted: true } } }),
      c('cover', '悄悄炼药，把缺口补上', '需要八灵石。留下药师行囊，但事情仍会被记住。', '药补齐了，闻竹也知道是谁熬了一夜。她把行囊交给你：下次救人，可以不必先替人隐瞒。', { cost: { stones: 8 }, effects: { items: ['herb_kit'], skills: { alchemy: 8 }, people: { friend: { bond: 8 } } } }),
      c('honest', '独自说明经过，请他自行承担', '不花灵石，得到师父指点；沈砚会有些失落。', '闻竹罚沈砚补种，教你识别阵中的虚火。沈砚一阵子不再与你说笑，却仍给你留着晚饭。', { effects: { skills: { array: 8 }, stats: { insight: 6 }, people: { friend: { bond: -8 }, master: { bond: 12 } } } }),
    ], { next: s => 'mission_' + s.player.focus, months: 9, after: { realm: 1 } }),

  n('mission_sword', 0, '山下有人截住渡船',
    '你第一次带剑下山，渡口却被散修封住。船上是往丹房送药的山民，对方拿一名孩子抵住你的剑尖。程照雪没有替你出手，只往旁边退了一步，给你留出看清整座渡口的地方。', [
      c('detour', '沿河拆掉他们的退路，迫其放人', '阵法达到十八可用；保全渡船，得到归山阵图。', '你让浅滩亮起虚假的伏兵火光。散修弃船跑了，孩子记得的只有你把剑收回鞘的声音。', { requires: { skills: { array: 18 } }, effects: { items: ['return_chart'], stats: { courage: 6 }, flags: { ferrymen: true } } }),
      c('trade', '用路费换孩子，再护送众人绕行', '花十二灵石。山民将来会帮你接走难民。', '船绕出半日才回到主河道。船夫递给你一块引雨石，说下次过河只要报他的名字。', { cost: { stones: 12 }, effects: { items: ['rainstone'], flags: { ferrymen: true }, stats: { empathy: 7 } } }),
      c('strike', '出剑斩断拦船索', '可能受伤、耽误半年；不伤及人质。', '绳索落水，孩子被船夫抱进舱。程照雪替你挡住追来的飞刃，你第一次明白收剑也需要本事。', { check: { base: 56, skill: 'sword', scale: 0.7, allies: { sister: 6 }, failText: '索断了，飞刃也划伤你的肩。孩子获救，程照雪背你回山；你用了半年重新抬起剑。', failure: { stats: { health: -18 }, flags: { ferrymen: true } }, failMonths: 6 }, effects: { stats: { courage: 10 }, flags: { ferrymen: true }, people: { sister: { bond: 10 } } } }),
    ], { next: 'cave', months: 12 }),

  n('mission_array', 0, '一张多出来的地形图',
    '修补山门阵法时，你发现旧地图背面还有一条通往山外的暗渠。阵眼长老说那是废线，不必深究。闻竹却让你自己决定：把这条路堵死，还是留给某个还不知道名字的逃亡者。山外的钟声比去年密了。', [
      c('keep', '修复暗渠，把阵图留一份', '花十灵石。归途与山门救援会有一条隐秘路径。', '水重新流过石槽。你在图角写下自己的名字，却没有想到，这会成为全宗最后的出口。', { cost: { stones: 10 }, effects: { items: ['return_chart'], skills: { array: 8 }, flags: { escapeWay: true } } }),
      c('watch', '在废线外布警铃', '不花材料。战争来临时，可以提早发现敌军。', '程照雪帮你把铃埋进山风里。你们约定，如果有一天它响了，先去敲杂役院的门。', { effects: { flags: { warned: true }, people: { sister: { bond: 10 } }, skills: { array: 5 } } }),
      c('share', '先教山民辨认阵路', '留下引雨石和渡口人情；不保留阵图。', '山民记不住繁复符文，却记住哪盏灯熄了就要往河边跑。他们把引雨石当作谢礼。', { effects: { flags: { ferrymen: true }, items: ['rainstone'], stats: { empathy: 8 } } }),
    ], { next: 'cave', months: 12 }),

  n('mission_alchemy', 0, '药只够救一处',
    '山下爆发灵瘴。丹房剩的解瘴药，够救一名受伤修士，也够兑进一村人的饮水。修士许你一笔足以买洞府的灵石，村里的老人却连药方都看不懂。沈砚把药锅背过来，没有替你决定。', [
      c('village', '把药兑进村井，再寻找替代材料', '救村民，得到药师行囊与渡口人情。', '你们守井三夜，用剩下的药渣替修士稳住伤势。许多名字出现在你的药簿上，后来也出现在逃亡船上。', { effects: { items: ['herb_kit'], flags: { ferrymen: true }, stats: { empathy: 10 }, people: { friend: { bond: 10 } } } }),
      c('physician', '先救修士，托他运来更多药', '得到二十八灵石；村里损失无法挽回。', '援药赶到时已有三家挂起白布。修士兑现了钱与护符，你把那些来迟的名字记在簿底。', { effects: { stats: { stones: 28, empathy: -5 }, items: ['ward'], flags: { lateMedicine: true } } }),
      c('substitute', '冒险试炼新的解瘴方', '失败会损失药材并染瘴，休养一年；不会直接结束人生。', '新药在天亮前成了。沈砚把你的方子抄给附近村落，药师行囊从此再没有真正空过。', { check: { base: 45, skill: 'alchemy', scale: 0.75, failText: '试药失败，你也染上灵瘴。村民等到了丹房的下一批药，沈砚陪你休养一年；遗憾并未被治好。', failure: { stats: { health: -22 }, flags: { lateMedicine: true } }, failMonths: 12 }, effects: { items: ['herb_kit', 'rainstone'], flags: { ferrymen: true }, skills: { alchemy: 10 } } }),
    ], { next: 'cave', months: 12 }),

  n('cave', 0, '你想把哪一盏灯留下',
    '你终于能领一处洞府。山顶灵气最足，药谷有人共灶，废阵台便宜却常漏雨。闻竹提醒你，住处不只是修炼的地方：有人会到这里敲门，你也会在离开时决定带走什么。今晚沈砚与程照雪都提着灯来替你搬家。', [
      c('peak', '住山顶，向程照雪练剑', '花十八灵石，御剑提升；把洞府留作警戒点。', '你们轮流守望远山。程照雪不善闲谈，却在每次对练后给你留下比剑谱更长的指点。', { cost: { stones: 18 }, effects: { focus: 'sword', skills: { sword: 12 }, flags: { lookout: true }, people: { sister: { bond: 15 } }, home: '山顶小屋' } }),
      c('valley', '在药谷共灶，照看来求药的人', '花十二灵石，丹术提升，得到药师行囊。', '你学会在火候里听脚步声。沈砚常把饭煮焦，但每逢来客，总会先替你添一双筷子。', { cost: { stones: 12 }, effects: { focus: 'alchemy', skills: { alchemy: 12 }, items: ['herb_kit'], people: { friend: { bond: 15 } }, home: '药谷共灶' } }),
      c('ruin', '修补废阵台，把出山的路连起来', '花六灵石，阵法提升，保留归山阵图。', '你补好屋顶，也连通了暗渠。闻竹第一次在这里喝茶时说，旧的东西不一定只配被丢掉。', { cost: { stones: 6 }, effects: { focus: 'array', skills: { array: 12 }, items: ['return_chart'], flags: { escapeWay: true }, people: { master: { bond: 12 } }, home: '旧阵台' } }),
      c('borrow', '先借住同门屋檐下，不急着买洞府', '不花灵石。继续原有修行，与沈砚轮流照看共灶。', '你没有领独立洞府，屋里却有人替你留灯。沈砚把焦饭端走，说一间屋也装得下两个人的路。', { effects: { people: { friend: { bond: 12 } }, flags: { borrowedRoof: true }, home: '同门共灶屋' } }),
    ], { next: 'omen', months: 24 }),

  n('omen', 1, '远处的天少了一块',
    s => s.world.threat === 'beast'
      ? '一队商旅从北境回来，说一座山连同山上宗门一夜不见了。河水里漂着比船还大的鳞。镜火盟送来借阵的盟约，闻竹没有签。你梦见洞府的灯在巨口里亮着，醒来时警铃已经响了第一声。'
      : '北境的星空少了三颗星。商旅说有一位不露脸的域外尊者，让三座宗门把弟子送进镜里。镜火盟带来借阵的盟约，闻竹没有签。程照雪巡山时发现，每块界碑上都有同一枚陌生眼印。', [
      c('evacuate', '先把山民与杂役送往渡口', '损失十四灵石，但覆灭时会多救下十二人。', '不少人抱怨你惊扰生计。船真正载着他们离山时，抱怨变成了低声报出亲人的名字。', { cost: { stones: 14 }, effects: { flags: { evacuated: true }, stats: { empathy: 6 } } }),
      c('probe', '潜入镜火盟营地，查清他们要什么', '阵法越好把握越大；失败会受伤、被留下追猎标记。', '营图上圈出的不是藏经阁，而是旧阵台底下的界门。你带回一张归山阵图与一个更坏的消息。', { check: { base: 50, skill: 'array', scale: 0.8, items: { phantom_mask: 15 }, failText: '你看清了界门的位置，却被镜印扫中。伤养好了，追猎标记仍留在你身上。', failure: { stats: { health: -14 }, flags: { marked: true }, items: ['return_chart'] }, failMonths: 6 }, effects: { items: ['return_chart'], flags: { intelligence: true } } }),
      c('warn', '联络旧友，把预警传出去', '少练一年。让邻近散修成为之后的援军。', '有宗门闭门不见，也有人把警报传向下一座山。你记住肯回信的名字，给他们留下撤退的河道。', { months: 12, effects: { flags: { network: true, warned: true }, people: { master: { bond: 8 } }, stats: { courage: 6 } } }),
    ], { next: 'war_council', months: 6 }),

  n('war_council', 1, '不是每个人都能守住这里',
    '镜火盟的战舟停在山外，宗门护阵开始渗血。闻竹让你选最后一项准备，自己转身去守主阵。她没有许诺会赢，只说：弟子名单要带走，谁还活着，不能只记在长老心里。沈砚握着空药箱，程照雪等你一句话。', [
      c('escape', '把准备留给撤离，连通暗渠', '携带归山阵图；若已修过暗渠，再多救八人。', '你们把逃生的出口标在每间屋门上。钟声从此不只是召集令，也成了出山的信号。', { effects: { items: ['return_chart'], flags: { escapeReady: true } } }),
      c('defend', '与程照雪练一次合击', '御剑提升，最后守阵的成功机会增加。', '她把最危险的半边留给自己，让你记住撤剑的口令：听到“回家”，就带人走。', { effects: { skills: { sword: 10 }, flags: { combined: true }, people: { sister: { bond: 15 } } } }),
      c('medicine', '把灵石与丹药分给撤离者', '花十灵石。携带药师行囊，伤员不会拖慢全部队伍。', '你把每份药系在名字旁。沈砚终于不再握着空箱，挨个确认有人知道怎么用。', { cost: { stones: 10 }, effects: { items: ['herb_kit'], flags: { fieldMedicine: true }, people: { friend: { bond: 12 } } } }),
    ], { next: 'siege', months: 1 }),

  n('siege', 1, '渡云宗的最后一夜',
    '护山阵被从里面打开。火落进药谷，暗渠只能再过一队人。闻竹被钉在主阵上，沈砚困在藏经阁，阵图和弟子名单散在钟楼。你只能亲自赶往一处。程照雪喊出那句“回家”，随后转身替你守住岔路。', [
      c('master', '斩断阵钉，先把师父带走', '师父获救。沈砚会被俘，典籍失散。', '闻竹醒来第一句问沈砚在哪里。你答不上来。山门已经没了，但她握住你的手，说还有人等着被找回来。', { effects: { people: { master: { status: 'alive', location: 'refuge', bond: 20 }, friend: { status: 'captured', location: 'home' } }, flags: { savedMaster: true }, survivors: 8, items: ['home_seed'] } }),
      c('friend', '冲进藏经阁，把沈砚背出来', '沈砚获救。师父战死，留下旧剑；这一结果无法逆转。', '沈砚在你背上哭着说还有师父。闻竹的剑从主阵飞来，落在你脚边，剑身的灵火一点点熄了。', { effects: { people: { master: { status: 'dead', location: 'home' }, friend: { status: 'alive', location: 'refuge', bond: 25 } }, survivors: 10, items: ['teacher_blade', 'home_seed'], flags: { savedFriend: true } } }),
      c('archive', '带走阵图、典籍与弟子名单', '可多救十六人。师父被俘，沈砚失踪；归来能走阵法路线。', '你把纸卷背进水里，沿着名字一遍遍点人。名单没有烧掉，闻竹与沈砚的名字却暂时只能留在纸上。', { effects: { people: { master: { status: 'captured', location: 'home' }, friend: { status: 'missing', location: 'home' } }, items: ['return_chart', 'home_seed'], survivors: 16, flags: { archive: true } } }),
      c('last_stand', '与程照雪再守一刻，争取救出两人', '失败会重伤、师父战死、沈砚被俘；不会直接结束本世。', '你们撑住了那一刻。闻竹与沈砚从两边赶来，程照雪折剑退入暗渠。你救下了人，救不回山门。', { check: { base: 26, skill: 'sword', scale: 0.65, flags: { combined: 18, intelligence: 8 }, items: { ward: 10 }, failText: '合击被主阵反噬。程照雪拖着重伤的你跳入暗渠；闻竹战死，沈砚被留在火里俘去。', failure: { stats: { health: -32 }, people: { master: { status: 'dead', location: 'home' }, friend: { status: 'captured', location: 'home' } }, items: ['teacher_blade', 'home_seed'], survivors: 4 }, failMonths: 9 }, effects: { people: { master: { status: 'alive', location: 'refuge' }, friend: { status: 'alive', location: 'refuge', bond: 18 } }, survivors: 20, items: ['home_seed'], stats: { health: -12 } } }),
    ], { next: 'refugees', months: 2, after: { flags: { sectLost: true }, location: 'refuge', home: '渡口草棚', people: { sister: { status: 'alive', location: 'refuge' } } } }),

  n('refugees', 1, '人比行李多',
    s => `望渡镇的船不够，米也不够。你点出了${s.world.survivors}名幸存者，里面有人从未正式拜师。${status(s, 'friend') === 'alive' ? '沈砚开始替陌生人煮饭，故意把焦掉的那锅留给自己。' : '沈砚的位置空着，你仍多摆了一只碗。'}程照雪带来消息：旧阵台深处的界门还能开，但镜火盟的人很快就会追到这里。`, [
      c('shelter', '先安置大家，靠治病与修器攒路费', '多用两年，得到二十四灵石；记下难民去向。', '你在镇上有了第一批病人和顾客，也有了迟迟未走的理由。程照雪把分散的名字抄进旧信，交到你手里。', { months: 24, effects: { stats: { stones: 24, empathy: 6 }, items: ['old_letter'], flags: { sheltered: true }, survivors: 6 } }),
      c('ferry', '托付给渡口旧友，先去寻界门', '有渡口人情时无人掉队；否则迁徙会失去六名同行者。', s => s.flags.ferrymen ? '渡船为你亮灯。船夫把难民带往南岸，你得以轻装去找另一条生路。' : '南行的队伍在关卡被打散，六人选择就地谋生。你记下最后见面的渡口，没有把离散写成死亡。', { effects: s => ({ items: ['old_letter'], survivors: s.flags.ferrymen ? 0 : -6, flags: { dispersed: !s.flags.ferrymen } }) }),
      c('leave', '给大家留下药箱，单独引开追兵', '消耗药师行囊；没有行囊时要花十六灵石。', '你带着空行囊走上官道，故意让镜印照见自己。程照雪接住了你留下的人，她说山门可以晚些重建。', { cost: s => has(s, 'herb_kit') ? { items: ['herb_kit'] } : { stones: 16 }, effects: { flags: { marked: true, sheltered: true }, people: { sister: { bond: 18 } }, survivors: 8 } }),
    ], { next: 'hunter', months: 6 }),

  n('hunter', 1, '追你的人也有一封家书',
    '雨夜，镜火盟的宋却堵住你。他的飞剑断了一半，怀里却藏着交不起供奉的家书。他说只要带走你的镜印，家人才有活路。程照雪正在照顾另一批伤员，这一次没有人替你出剑。', [
      c('mercy', '用一份归途换他的家人平安', '花十灵石。宋却会记得这次放过；追猎标记解除。', '宋却把镜印压进泥里，告诉你守门人的名字。临走他没有道谢，只说有一天会把这条命还到该还的地方。', { cost: { stones: 10 }, effects: { flags: { mercy: true, marked: false }, people: { rival: { known: true, bond: 35 } }, items: ['phantom_mask'] } }),
      c('decoy', '留下假身，从河底脱身', '阵法越好把握越大；失败会受伤、延误半年。', '宋却带走一枚空镜印。你听见他在岸上喊家人的名字，没有回头拆穿最后一点希望。', { check: { base: 53, skill: 'array', scale: 0.8, items: { phantom_mask: 15 }, failText: '假身被识破，你带伤跃入河里。宋却没有继续追，镜印却没能洗掉。', failure: { stats: { health: -18 }, flags: { marked: true } }, failMonths: 6 }, effects: { flags: { marked: false }, skills: { array: 6 } } }),
      c('duel', '击败他，夺取追猎玉符', '可能重伤，休养一年。成功会得到护身玉符，宋却负伤离去。', '你打落他的剑，留下家书。宋却活着离开，今后却不会站到你的身边。', { check: { base: 40, skill: 'sword', scale: 0.7, items: { teacher_blade: 10 }, failText: '你们两败俱伤。宋却逃回营地，你休养一年，仍带着追猎标记。', failure: { stats: { health: -24 }, flags: { marked: true } }, failMonths: 12 }, effects: { items: ['ward'], stats: { courage: 7 }, people: { rival: { known: true, bond: -10 } }, flags: { marked: false } } }),
    ], { next: 'foundation', months: 18 }),

  n('foundation', 1, '筑基不是在按钮前等来的',
    '你在望渡镇修器、治伤、练剑，走过了足以筑基的年月。白渡找来时，只带了三种安排：借药铺静养，替镇民修阵后借阵筑基，或直面雷雨破关。程照雪准备远行照看散落同门，你们要在界门前暂时分开。', [
      c('medicine', '用药师行囊，稳稳筑基', '消耗行囊，闭关两年；确定成功，不需要刷材料。', '两年间有人把饭放在门外。你出关时，原先怕你的孩子已敢向你讨一枚避雨符。筑基成了。', { cost: { items: ['herb_kit'] }, months: 24, effects: { realm: 2, stats: { health: 18, mind: 8 }, flags: { stableFoundation: true } } }),
      c('repair', '替全镇修阵，以水磨功夫筑基', '花十八灵石，三年；确定成功，强化阵法。', '你先修好别人屋外的阵，最后坐进自己的阵心。三年没有白等：镇民能过安稳的雨季，你也踏入筑基。', { cost: { stones: 18 }, months: 36, effects: { realm: 2, skills: { array: 8 }, flags: { stableFoundation: true }, people: { keeper: { known: true, bond: 18 } } } }),
      c('storm', '踏进雷雨，尝试提前破关', '用半年尝试；失败损失体力，随后白渡会帮你稳妥补成。', '你在雷声中站稳灵台。筑基来得早，却没有让那些走散的人自动回来。', { months: 6, check: { base: 48, skill: 'alchemy', scale: 0.45, stat: 'insight', statScale: 0.18, items: { ward: 15 }, failText: '雷雨散了，你没能破关。白渡留你修阵两年，才帮你稳妥筑基；这一程多走了路，也留下旧伤。', failure: { realm: 2, stats: { health: -20 }, flags: { scarredFoundation: true } }, failMonths: 30 }, effects: { realm: 2, stats: { courage: 8 }, flags: { quickFoundation: true } } }),
    ], { next: 'gate', months: 6, after: { people: { keeper: { known: true, location: 'refuge' }, sister: { location: 'home' } } } }),

  n('gate', 2, '门后不是更大的宗门',
    '旧阵台下面，白渡守着三条会在黎明关闭的通路。临潮有海与潮契，烬原有地火与匠人，浮屿有漂流的书院。他能送你过去，却不能替你修好归门。你把渡云松种贴在胸前，第一次认真决定，要在怎样的世界活下去。', [
      c('tide', '去临潮，向海上的人借一条路', '潮舟、契约与海底遗迹。适合以人情集结援军。', '咸风穿过阵门，青岚的雨留在另一边。你握着一颗松种，走进一座不认识你的港口。', { next: 'landing_tide', effects: { location: 'tide', flags: { destination: 'tide' }, home: '港口借住' } }),
      c('ember', '去烬原，学会在贫瘠之地生火', '缺水、荒漠与地火。适合炼丹、修器与重建灵脉。', '门外的天空红得像未冷的炉。你第一次发现，灵气少的地方也有人认真过一生。', { next: 'landing_ember', effects: { location: 'ember', flags: { destination: 'ember' }, home: '驿站棚屋' } }),
      c('sky', '去浮屿，寻找界海真正的边缘', '悬桥、失落书页与漂流岛。适合阵法与跨界探索。', '你迈出门，脚下竟没有大地。有人抛来一条绳索，笑你还在等待山路出现。', { next: 'landing_sky', effects: { location: 'sky', flags: { destination: 'sky' }, home: '书院客舍' } }),
    ], { months: 1 }),

  n('landing_tide', 2, '这个港口只认做过的事',
    '临潮人不看宗门腰牌。嵇萝把你从一艘失控潮舟上拉下来，告诉你借住要先选工作：给海雾里的船领航，替潜水人治伤，或下海收回断掉的阵链。你问怎样回青岚，她说：先让这里有人愿意送你。', [
      c('guide', '替潮舟领航，记住每一处暗流', '阵法提升，攒十六灵石，与嵇萝结识。', '你们在雾里敲钟，直到最后一艘船入港。嵇萝把名字写进船籍，你不再只是异乡修士。', { effects: { skills: { array: 10 }, stats: { stones: 16 }, people: { ally: { known: true, bond: 20 } }, flags: { tideTrust: true } } }),
      c('heal', '照看潜水人，学海上的药方', '丹术提升，取得药师行囊。', '伤员先问你收多少钱，后来把家门的钥匙留在桌上。嵇萝带你认了一整条能敲门的街。', { effects: { skills: { alchemy: 10 }, items: ['herb_kit'], people: { ally: { known: true, bond: 25 } }, flags: { tideTrust: true } } }),
      c('dive', '潜入断链处，换回一份潮契', '失败会受伤、欠八灵石医药费；成功可直接拿到潮契。', '你把阵链拖出海面，港口的灯一起亮了。潮契不是施舍，是那条路愿意记住你。', { check: { base: 50, skill: 'sword', scale: 0.45, realmScale: 5, failText: '暗流撞坏了护体术。嵇萝拖你上岸，你欠下八灵石药钱，也欠了一次援手。', failure: { stats: { health: -18 }, flags: { debt: 8 }, people: { ally: { known: true, bond: 15 } } }, failMonths: 9 }, effects: { items: ['tide_token'], people: { ally: { known: true, bond: 20 } }, flags: { tideTrust: true } } }),
    ], { next: 'tide_wreck', months: 18, enter: { people: { ally: { location: 'tide', known: true } } } }),

  n('tide_wreck', 2, '沉船里传来孩子的呼吸',
    '潮汐退去，海底露出一艘旧舟。你与嵇萝下潜寻找界门材料，船舱里却有一只被锁住的幼兽。它每次呼吸都震落一片锈，锁链上刻着镜火盟的印。舱底的定魂珠能护你结丹，带走它就得再拆一道困兽阵。', [
      c('release', '先放幼兽，再拿定魂珠', '阵法达到三十可以兼得；不足时只能先救幼兽。', s => s.player.skills.array >= 30 ? '锁链解开，幼兽把定魂珠推到你掌心。它临走掉下一片鳞，仿佛也在记人情。' : '你耗尽灵力解开最后一道锁，潮水已淹过珠匣。幼兽拱你上浮，留下一片还温热的鳞。', { effects: s => ({ items: s.player.skills.array >= 30 ? ['beast_scale', 'spirit_pearl'] : ['beast_scale'], flags: { beastMercy: true }, people: { ally: { bond: 12 } } }) }),
      c('pearl', '带走定魂珠，把兽笼位置告知守港人', '取得定魂珠；幼兽会被港口转卖，之后无法借同族气息退敌。', '嵇萝把位置写进巡港册。你回头时听见幼兽仍在撞锁，那声音没有跟着定魂珠一起离开。', { effects: { items: ['spirit_pearl'], flags: { beastSold: true }, stats: { insight: 6 } } }),
      c('record', '不拆阵，拓下全部界门纹路', '取得归山阵图与十二灵石；救兽的机会留给港口。', '纹路与青岚暗渠相连，你终于知道界门不是孤岛。嵇萝给守港人另留了一笔拆笼费用。', { effects: { items: ['return_chart'], stats: { stones: 12 }, skills: { array: 10 }, flags: { linkedGates: true } } }),
    ], { next: 'tide_storm', months: 24 }),

  n('tide_storm', 2, '潮契要在风暴里兑现',
    '第一次大风暴来临，你住的街道开始倒灌。港主准备截断外港，把还在海上的人留在浪里。嵇萝站在锚边，问你：你是来拿这里的力量，还是也把这里当成住过的地方？', [
      c('hold', '把外港接入阵网，护最后一批船', '阵法达到三十五可用；得到潮契与援军承诺。', '船在灯灭前回港。嵇萝没再问你算不算这里的人，她把你的名字写在潮契第一行。', { requires: { skills: { array: 35 } }, effects: { items: ['tide_token', 'gate_anchor'], flags: { regionalAlly: true }, people: { ally: { bond: 25 } } } }),
      c('rescue', '借潮舟下海，与嵇萝逐船救人', '可能受伤、延误一年；成功得到潮契与界门锚。', '你们的潮舟最后才靠岸。许多人没有见过你拔剑，却愿意把下一次远航交到你手里。', { check: { base: 54, skill: 'sword', scale: 0.45, stat: 'empathy', statScale: 0.12, failText: '你们救回两艘船，自己却被浪击伤。港口仍记得你，潮契要等下一年补全。', failure: { stats: { health: -18 }, items: ['tide_token'], flags: { regionalAlly: true }, people: { ally: { bond: 12 } } }, failMonths: 12 }, effects: { items: ['tide_token', 'gate_anchor'], flags: { regionalAlly: true }, people: { ally: { bond: 25 } } } }),
      c('inland', '把街上居民送向内陆，保住陆上生计', '稳妥得到二十二灵石与药师行囊；海上援军减少。', '海上的灯灭了，内陆的灶却没有。嵇萝留下护船，你送孩子们翻过第一座山。', { effects: { stats: { stones: 22, empathy: 5 }, items: ['herb_kit'], people: { ally: { bond: 8 } }, flags: { inlandShelter: true }, survivors: 5 } }),
    ], { next: 'crossroads', months: 24 }),

  n('landing_ember', 2, '在这里，灵石换不到水',
    '烬原的泉眼干了。嵇萝用一柄废铁勺敲开石层，把最后一碗水递给驿站孩子。她看过你的宗门腰牌后说，若只想找灵气充足的洞府，来错了；若愿意学会给荒地生火，匠人不会把门关上。', [
      c('rain', '把从故乡带来的雨放进枯井', '消耗引雨石。全驿站会记住你，取得地火炉心。', '青岚的一场雨落在赤土里。嵇萝把祖传炉心交给你，说这东西的家，现在也可以是你走过的地方。', { cost: { items: ['rainstone'] }, effects: { items: ['ember_engine'], flags: { emberTrust: true }, people: { ally: { known: true, bond: 35 } }, survivors: 6 } }),
      c('dig', '留下挖井，靠丹术辨认地下水脉', '花两年，取得月白矿、药师行囊与驿站信任。', '水来得慢，你也学得慢，却没有人在门口催你升境。孩子长高了一截，枯井终于能照见星光。', { months: 24, effects: { items: ['lunar_ore', 'herb_kit'], skills: { alchemy: 10 }, people: { ally: { known: true, bond: 22 } }, flags: { emberTrust: true } } }),
      c('trade', '替驿站护送商队，换水与路费', '御剑提升，得到十八灵石；泉眼仍未解决。', '商队带回十桶水。嵇萝与你分着喝，说能让人活到明天的本事，也算修行。', { effects: { stats: { stones: 18 }, skills: { sword: 10 }, people: { ally: { known: true, bond: 18 } }, flags: { emberTrust: true } } }),
    ], { next: 'ember_caravan', months: 18, enter: { people: { ally: { location: 'ember', known: true } } } }),

  n('ember_caravan', 2, '沙尘追着一支没有货物的商队',
    '商队到了才发现，车里不是货，是被镜火盟追到烬原的炉匠。沙尘后面出现吞潮兽的影子，车辕下有一只不愿走的幼兽。炉匠承认，他们偷走它来换跨界的通行费。嵇萝把车停住，看你怎样让这队人继续走。', [
      c('return', '解开幼兽的锁，让它带大兽离开', '救下商队，得到鳞片；拒绝继续买卖凶兽。', '幼兽没有立刻走，它碰了碰你沾满沙的手。大兽的影子跟着退去，炉匠终于肯说出界门的真相。', { effects: { items: ['beast_scale', 'lunar_ore'], flags: { beastMercy: true }, people: { ally: { bond: 15 } } } }),
      c('bargain', '把幼兽转交守城人，用城阵驱散大兽', '取得地火炉心，但失去与凶兽和解的机会。', '城阵撑住沙尘，守城人却把笼子拖进了地下。炉心亮在你掌上，你听见一声越来越远的撞击。', { effects: { items: ['ember_engine'], flags: { beastSold: true }, people: { ally: { bond: -8 } } } }),
      c('guard', '让商队先走，亲自挡住沙尘', '失败会重伤并损失八名同行者；成功得到定魂珠。', '你把剑插进风里，直到最后一辆车入城。炉匠拿出原想卖掉的定魂珠，愿意欠你一次归途。', { check: { base: 38, skill: 'sword', scale: 0.55, items: { ward: 12 }, failText: '剑阵散了，商队有八人在风中失散。嵇萝拖你进城，之后一年，你都在帮他们寻找名字。', failure: { stats: { health: -28 }, survivors: -8, flags: { caravanLost: true } }, failMonths: 12 }, effects: { items: ['spirit_pearl'], flags: { regionalAlly: true }, people: { ally: { bond: 18 } } } }),
    ], { next: 'ember_ruins', months: 24 }),

  n('ember_ruins', 2, '荒原下面有一座会呼吸的炉',
    '嵇萝带你走进埋在沙下的炉城。这里的修士不求灵气，只把地火接进空荡的经脉。炉城将熄，匠人愿意教你留下炉心的方法，但要你先选：带走最好的一个，修好全城的旧炉，还是把经验换给远方的书院。', [
      c('restore', '用月白矿修炉，让整座城重新有火', '消耗月白矿。得到炉心、定魂珠与匠人援军。', '旧炉一盏盏亮起来。匠人送你护魂的珠与最稳的一颗炉心，说你回家时，缺什么便来信。', { cost: { items: ['lunar_ore'] }, effects: { items: ['ember_engine', 'spirit_pearl'], flags: { regionalAlly: true }, skills: { alchemy: 12 }, people: { ally: { bond: 22 } } } }),
      c('earn', '留在炉城做六年工，换一颗完整炉心', '时间会直接快转；确定得到炉心与界门锚。', '六年里你教孩子认药，也从老匠人手里学会停火。离开时他们把界门锚装进你的行囊。', { months: 72, effects: { items: ['ember_engine', 'gate_anchor'], flags: { regionalAlly: true }, skills: { alchemy: 15 }, people: { ally: { bond: 25 } } } }),
      c('copy', '把炉图抄给浮屿书院', '不取炉心。取得浮屿天图与二十灵石。', '书院的回信讲的是会漂流的路。你没有把炉城据为己有，却让两片大陆开始知道对方的名字。', { effects: { items: ['sky_scroll'], stats: { stones: 20 }, skills: { array: 10 }, flags: { linkedGates: true } } }),
    ], { next: 'crossroads', months: 24 }),

  n('landing_sky', 2, '岛屿在走，家不能只是一块地',
    '嵇萝把绳索拴在你腰上，带你穿过会随风漂移的悬桥。书院昨天还在东边，明天可能就在云下。这里没人问你准备在洞府住多久，只问，当桥断时你肯不肯把自己的绳留给后面的人。', [
      c('bridge', '修悬桥，给漂流的人留下路标', '阵法提升，得到浮屿天图与书院信任。', '你在桥上标出能撤退的结点。嵇萝说你很像她认识的某位守门人，你终于笑着提起白渡。', { effects: { skills: { array: 12 }, items: ['sky_scroll'], flags: { skyTrust: true }, people: { ally: { known: true, bond: 25 } } } }),
      c('garden', '帮书院迁移药圃，在浮岛间认药', '丹术提升，得到药师行囊与十二灵石。', '药圃被一篮篮送过云海，你又闻到故乡那次焦土的气味。这一次，没有谁要独自认错。', { effects: { skills: { alchemy: 10 }, items: ['herb_kit'], stats: { stones: 12 }, people: { ally: { known: true, bond: 20 } }, flags: { skyTrust: true } } }),
      c('escort', '替漂流书船护航', '御剑提升，取得十八灵石与护身玉符。', '你见过被风撕碎的岛，也见过人在碎岛上继续教孩子读书。书船的铃声成了你的新日历。', { effects: { skills: { sword: 10 }, stats: { stones: 18 }, items: ['ward'], people: { ally: { known: true, bond: 18 } }, flags: { skyTrust: true } } }),
    ], { next: 'sky_archive', months: 18, enter: { people: { ally: { location: 'sky', known: true } } } }),

  n('sky_archive', 2, '书院缺的不是天才，是送信的人',
    '一座孤岛将沉入界海，岛上的藏书人不肯走。他说还有一页没抄完，能解释为什么域外来客总从同一条裂隙出现。嵇萝愿意带你接人，但只剩一艘能回航的小船，船边还锁着从裂隙里捞起的幼兽。', [
      c('people', '接走藏书人，让他以后慢慢写', '取得定魂珠与域外来客情报；书页会失去一部分。', '老人上船时仍在写，后来却给书院多添了许多学生。你们丢了一页书，留下会写下一页的人。', { effects: { items: ['spirit_pearl'], flags: { intelligence: true }, people: { ally: { bond: 20 } } } }),
      c('beast', '先解开幼兽，借它拖船离岛', '得到鳞片与浮屿天图；藏书人也能获救。', '幼兽拖着小船跃过第一条裂隙。老人终于把笔收好，给它取了一个只在风里听得清的名字。', { effects: { items: ['beast_scale', 'sky_scroll'], flags: { beastMercy: true }, people: { ally: { bond: 15 } } } }),
      c('page', '冒险把最后的书页带回来', '失败会重伤并失去书页；嵇萝仍会接走老人。', '书页压在你怀里，记录着尊者的镜印并非真身。嵇萝把船驶入风里，没有让老人继续等。', { check: { base: 42, skill: 'array', scale: 0.65, items: { ward: 10 }, failText: '裂隙吞掉书页，你抓住了最后一根船索。老人活下来了，你用了两年恢复受损的灵台。', failure: { stats: { health: -25, mind: -8 } }, failMonths: 24 }, effects: { items: ['sky_scroll', 'spirit_pearl'], flags: { intelligence: true, linkedGates: true } } }),
    ], { next: 'sky_fall', months: 24 }),

  n('sky_fall', 2, '整座书院开始往下落',
    '季风提前停了。书院失去浮力，悬桥一根根断开。院主准备只保住主楼，嵇萝却把药圃、厨房与孩子都绑进你的旧路标。你没有足够高的境界托起整座岛，但也许还有别的办法。', [
      c('network', '用修过的悬桥结成一张网', '阵法达到三十五可用。得到界门锚与书院援军。', '岛落了一截，却被桥网接住。嵇萝站在网心向你挥手，像第一次把绳索抛过来时那样。', { requires: { skills: { array: 35 } }, effects: { items: ['gate_anchor', 'sky_scroll'], flags: { regionalAlly: true }, people: { ally: { bond: 25 } } } }),
      c('evacuate', '分批撤离，把人和能带走的书先送走', '花十四灵石。稳妥保住师生，取得天图与援军承诺。', '主楼落进云里，书却在船上重新摊开。院主把印章交给嵇萝，第一次承认书院可以换一个地方。', { cost: { stones: 14 }, effects: { items: ['sky_scroll'], flags: { regionalAlly: true }, people: { ally: { bond: 22 } }, survivors: 6 } }),
      c('hold', '以身托住断桥，争取更多撤离时间', '失败会重伤，少救八人；成功得到定魂珠与界门锚。', '断桥的重量把你压进云里。你没有托起一座岛，却托住了最后一艘过桥的书船。', { check: { base: 40, skill: 'sword', scale: 0.5, realmScale: 6, failText: '桥在最后一批人上船前断了。八人停留在另一片浮岛，嵇萝把你从云下救回来，寻找他们又用了两年。', failure: { stats: { health: -26 }, survivors: -8 }, failMonths: 24 }, effects: { items: ['spirit_pearl', 'gate_anchor'], flags: { regionalAlly: true }, people: { ally: { bond: 25 } } } }),
    ], { next: 'crossroads', months: 24 }),

  n('crossroads', 2, '你终于有余力再走一条路',
    '几年间，你在异乡有了住处，也有了愿意敲门的人。嵇萝把三张航路放在桌上：可以就近寻找结丹遗迹，也可以走一趟别的大陆。多走一程会多花年月，得到的却可能是归乡时最缺的一种本事。', [
      c('near', '留在这里，进入附近遗迹', '继续当前故事。少走路，保留灵石与同伴。', '你把门口的灯交给邻人照看，与嵇萝一同去找那座许久没人回来过的遗迹。', { next: 'relic_door', effects: { people: { ally: { bond: 8 } } } }),
      c('craft', s => s.flags.destination === 'ember' ? '去临潮，换一份潮舟的承诺' : '去烬原，寻找能修灵脉的炉心', '额外一段跨大陆故事，花十二灵石旅费。', '另一片大陆的路没有熟悉的山门标记。你带去自己的经验，也准备认真听当地人说话。', { cost: { stones: 12 }, next: s => s.flags.destination === 'ember' ? 'visit_tide' : 'visit_ember' }),
      c('atlas', s => s.flags.destination === 'sky' ? '去临潮，寻找海底的归门' : '去浮屿，弄清界海裂隙', '额外一段跨大陆故事，花十二灵石旅费。', '嵇萝与你约定，不论在哪片大陆，先认路，后谈力量。你没有把原来的住处退掉。', { cost: { stones: 12 }, next: s => s.flags.destination === 'sky' ? 'visit_tide' : 'visit_sky' }),
    ], { months: 24 }),

  n('visit_tide', 2, '远海也有人需要一个解释',
    '临潮港主想借你的跨界经验扣住一批外来船。船上人被怀疑给域外来客带路，实际上只是在找不必上供的土地。你不能替他们证明一生清白，却可以替他们把今天发生的事说清楚。', [
      c('witness', '留下作证，替他们修好失控潮阵', '阵法提升，取得潮契；多用两年。', '港主撤了扣船令，船主也把下一次航行写进潮契。你没有给这群人贴上盟友标签，他们却愿意再次见你。', { months: 24, effects: { location: 'tide', items: ['tide_token'], flags: { extraAlly: true }, skills: { array: 10 } } }),
      c('pay', '付清泊船费，先让孩子上岸', '花二十灵石。取得潮契、药师行囊。', '孩子踏上陆地时还在晃。医馆给你一份行囊，船主给你一份能叫来潮舟的承诺。', { cost: { stones: 20 }, effects: { location: 'tide', items: ['tide_token', 'herb_kit'], flags: { extraAlly: true } } }),
      c('quiet', '避开争执，只向潜水人买下界门图', '花六灵石。得到归山阵图，海上援军仍未建立。', '你认得了海底的阵纹，却没认得船上的人。回信时嵇萝只问，那些船后来有没有放行。', { cost: { stones: 6 }, effects: { location: 'tide', items: ['return_chart'], skills: { array: 6 } } }),
    ], { next: 'relic_door', months: 12 }),

  n('visit_ember', 2, '炉心不是一件可以买空的货',
    '烬原匠人愿意让你拿走炉心，但城里的药炉也靠它续命。商人说可以先卖给你，再从更远处找替代物。你想起渡云药圃烧掉那一角时，等药的人并不认识收钱的商人。', [
      c('work', '留四年，造出第二颗炉心', '多用四年，不花灵石；得到炉心与匠人援军。', '新炉亮了，旧炉没有熄。匠人把自己的名字刻在你的炉心背面，说这是保修，也是归途。', { months: 48, effects: { location: 'ember', items: ['ember_engine'], flags: { extraAlly: true }, skills: { alchemy: 12 } } }),
      c('ore', '用月白矿给旧炉续命，再带走炉心', '消耗月白矿。得到炉心与匠人援军。', '旧炉续起了火，你得以带走一颗完整炉心。没有谁必须为你的下一次突破挨过一个冷夜。', { cost: { items: ['lunar_ore'] }, effects: { location: 'ember', items: ['ember_engine'], flags: { extraAlly: true } } }),
      c('map', '只抄炉图，今后自己尝试', '不花材料。丹术提升，得到十八灵石修器报酬。', '你修好城门的火线，换到纸笔和路费。炉心留在药房，路却还可以往前走。', { effects: { location: 'ember', stats: { stones: 18 }, skills: { alchemy: 12 } } }),
    ], { next: 'relic_door', months: 12 }),

  n('visit_sky', 2, '天图还缺一座无名岛',
    '书院请你画完最后一座岛。那里没有灵脉，只有等待下一班船的凡人。院主说删去它也不影响天图精度，嵇萝却问，地图究竟是给阵法看的，还是给需要找到彼此的人看的。', [
      c('include', '绕行一年，把无名岛与船路补上', '取得浮屿天图、界门锚与书院援军。', '你在天图边缘添了一行小字。后来跨界的人不会知道是谁写的，却少等了很多不该等的年月。', { months: 12, effects: { location: 'sky', items: ['sky_scroll', 'gate_anchor'], flags: { extraAlly: true }, skills: { array: 12 } } }),
      c('study', '先学习界海周期，留下自己的归门记录', '取得浮屿天图与定魂珠，不建立额外援军。', '你弄清了门何时打开，也弄清尊者为何总提前一步。院主送你一颗定魂珠，提醒你别把自己也当成阵眼。', { effects: { location: 'sky', items: ['sky_scroll', 'spirit_pearl'], flags: { intelligence: true } } }),
      c('ship', '先筹船接人，不等地图完成', '花十八灵石。取得天图与书院援军。', '船比天图先到。院主后来亲自补上无名岛，给你寄去一张不再省略人的地图。', { cost: { stones: 18 }, effects: { location: 'sky', items: ['sky_scroll'], flags: { extraAlly: true }, stats: { empathy: 6 } } }),
    ], { next: 'relic_door', months: 12 }),

  n('relic_door', 2, '遗迹只给活人留下出口',
    '遗迹门上写着“以一人寿元，换一人金丹”。嵇萝停在门口。你观察很久，发现这可能是个诱人牺牲的旧阵：墙缝里有自然灵火，也有能护住神魂的珠。你已经筑基，不必为了追上谁，把同伴交给一句碑文。', [
      c('decode', '沿归山阵图寻找出阵之路', '需要归山阵图。取得定魂珠与界门锚。', '阵里所有“祭坛”原来都能成为出口。你带出护魂珠，也带出一批困在这里多年的人。', { requires: { items: ['return_chart'] }, effects: { items: ['spirit_pearl', 'gate_anchor'], skills: { array: 10 }, people: { ally: { bond: 15 } }, flags: { relicFreed: true } } }),
      c('slow', '在外缘修炼，花八年借自然灵火', '时间直接快转。稳妥取得定魂珠，丹术提升。', '八年里你们修过屋、种过药，也听过许多路人讲人生。最后灵火自己从墙缝出来，并不需要一个人先死。', { months: 96, effects: { items: ['spirit_pearl'], skills: { alchemy: 12 }, people: { ally: { bond: 18 } }, flags: { patientRelic: true } } }),
      c('break', '用剑斩开假碑，抢出其中灵火', '失败会损伤灵台、修复两年；成功可带出定魂珠与二十灵石。', '石碑裂开，里面不是天命，只是老旧的夺灵阵。嵇萝把出口撑到最后一人离开。', { check: { base: 38, skill: 'sword', scale: 0.55, realmScale: 4, items: { teacher_blade: 10, ward: 10 }, failText: '假碑碎了，夺灵阵却刺进你的灵台。嵇萝带你撤出，修复两年后才适合再尝试结丹。', failure: { stats: { health: -18, mind: -15 }, flags: { relicScar: true } }, failMonths: 24 }, effects: { items: ['spirit_pearl'], stats: { stones: 20 }, flags: { relicFreed: true } } }),
    ], { next: 'golden', months: 12 }),

  n('golden', 2, '你要怎样走过这一场雷',
    '十余年的修行已经够你尝试金丹。嵇萝没有替你找更长的闭关按钮，她带来护魂阵、药材与一封寄不出去的故乡信。雷劫会改写修行，却不会替你解决所有故事；你也可以先用筑基的本事把眼前的事做完。', [
      c('prepared', '以定魂珠护住灵台，慢慢结丹', '消耗定魂珠，花六年；准备充分，确定成功。', '雷声持续三夜，阵内只留下你平稳的呼吸。嵇萝在门外煮了三次饭，第四次你自己端起碗。金丹成了。', { cost: { items: ['spirit_pearl'] }, months: 72, effects: { realm: 3, stats: { health: 20, mind: 10 }, flags: { goldenPrepared: true } } }),
      c('risk', '让雷劫淬炼自己，尝试提前结丹', '失败后仍能继续，旧伤需要一次补救事件；现有护符会增加把握。', '你在雷光中守住了自己的名字，金丹于最后一道雷下凝成。你没有让嵇萝替你挡雷。', { months: 24, check: { base: 38, skill: 'alchemy', scale: 0.45, stat: 'insight', statScale: 0.22, flags: { stableFoundation: 10 }, items: { ward: 12, spirit_pearl: 20 }, failText: '雷劫击裂灵台，你仍是筑基。嵇萝把你接出阵，后面的选择会决定修复旧伤还是换一条路。', failure: { stats: { health: -30, mind: -10 }, flags: { goldenFailed: true } }, failNext: 'golden_repair', failMonths: 12 }, effects: { realm: 3, stats: { courage: 8 }, flags: { goldenRisk: true } } }),
      c('remain', '暂不结丹，先把界门与人情经营好', '继续筑基人生，得到二十四灵石；后续有阵法与盟友路线。', '你走出闭关处，先修好嵇萝家漏雨的屋顶。境界没有提升，能一起走的人却多了一些。', { months: 36, effects: { stats: { stones: 24, empathy: 6 }, skills: { array: 10 }, flags: { choseLowRealm: true } } }),
    ], { next: 'beast_attack', months: 12 }),

  n('golden_repair', 2, '一次失败不必重活一生',
    '灵台裂痕疼到夜里。有人让你再进一次雷阵，嵇萝却把药铺钥匙放在手边，说可以留十年治好，也可以只稳住伤，换一种本事继续走。你不用回到十六岁再领一遍同样的机缘。', [
      c('heal', '用药师行囊养十年，再稳妥结丹', '消耗行囊，十年；确定修复并结丹。', '你替别人看诊，也慢慢看清自己的伤。十年后那场雷没有再夺走什么，金丹平稳地亮起。', { cost: { items: ['herb_kit'] }, months: 120, effects: { realm: 3, stats: { health: 30, mind: 15 }, flags: { repaired: true } } }),
      c('accept', '稳住旧伤，继续筑基人生', '用两年恢复体力，强化阵法；不再强求这次金丹。', '你承认自己还会疼，也承认有些事并不需要金丹才能做。嵇萝与你照旧把门口的灯点亮。', { months: 24, effects: { stats: { health: 25, mind: 12 }, skills: { array: 12 }, flags: { choseLowRealm: true, repaired: true } } }),
      c('teacher', '把失败经过写成药方，请各地药师补全', '花二十二灵石、六年；确定结丹，并得药师相助。', '回信没有一句“你应当更强”，只有逐条修正的药方。六年后你结丹，也留下给后来者少走弯路的记录。', { cost: { stones: 22 }, months: 72, effects: { realm: 3, stats: { health: 25 }, flags: { extraAlly: true, repaired: true }, skills: { alchemy: 10 } } }),
    ], { next: 'beast_attack', months: 12 }),

  n('beast_attack', 3, '天外来客不等你修炼圆满',
    s => s.world.threat === 'beast'
      ? '界海忽然变黑。吞潮兽的头颅从天空压下来，比整座城还大。城阵挡不住它，嵇萝也没有等你再升一个境界：港口、驿站与书院同时来求援。有人说杀掉幼兽才能封住裂口，你记得那条刻着镜火盟印的锁链。'
      : '无面尊者从界门降下，只要每城交出百名修士作阵眼，便许诺千年安稳。嵇萝把被点名的孩子藏进你家，城主却已经开始登记。镜印与青岚的那枚一模一样，你终于知道师门当年面对的是什么。', [
      c('kinship', '借幼兽鳞片，引出真相并让它停手', '需要鳞片。凶兽路线可退敌；尊者路线能让凶兽撕开其假身。', s => s.world.threat === 'beast' ? '鳞片在你掌中发热。吞潮兽辨认出同族，循着镜火盟的锁链离开了城上空。不是每次活下来都要先杀死谁。' : '鳞片唤来的巨兽撕开尊者投影，你把被征召的人带出镜阵。他的真身仍在青岚，但不再像神一样不可违抗。', { requires: { items: ['beast_scale'] }, effects: { flags: { beastPeace: true, foreignStopped: true }, people: { ally: { bond: 20 } }, survivors: 12 } }),
      c('gates', '开启界门，先把城里的人接走', '需要界门锚，或阵法达到四十。保人，城会受到严重损毁。', '几片大陆的门同时亮起。你没有托住城墙，却给来不及变强的人留下了出口。嵇萝最后才穿过门。', { requires: { any: [{ items: ['gate_anchor'] }, { skills: { array: 40 } }] }, effects: { flags: { foreignStopped: true, cityDamaged: true, evacuationHero: true }, survivors: 16, people: { ally: { bond: 18 } } } }),
      c('resist', '借众人的力量正面抗住这一击', '失败会重伤、少救十二人，嵇萝被困；后面可救她。', '你站在由许多人接成的阵里，终于挡下那一击。对方没有死，城市也不再相信交出名字就能换来安稳。', { check: { base: 22, skill: 'sword', scale: 0.45, realmScale: 9, flags: { regionalAlly: 14, extraAlly: 8 }, items: { ember_engine: 10, tide_token: 8, sky_scroll: 8 }, failText: '城阵散了，你被反震击伤。十二人失散，嵇萝困在坍塌的外城，余下的人仍等着你回来组织救援。', failure: { stats: { health: -30 }, survivors: -12, people: { ally: { status: 'captured' } }, flags: { cityDamaged: true, foreignStopped: false } }, failMonths: 6 }, effects: { flags: { foreignStopped: true }, stats: { courage: 10 }, people: { ally: { bond: 18 } } } }),
      c('shelter', '暂时退向地下，把孩子与药先带走', '稳妥保护小队，城市失守；后面处理失守的后果。', '你承认自己挡不住天外来客。地下却还有灯、药和活人，他们没有因你的境界停在筑基就拒绝跟你走。', { effects: { flags: { cityDamaged: true, foreignStopped: false }, survivors: 6, stats: { empathy: 8 } } }),
    ], { next: 'beast_wake', months: 6 }),

  n('beast_wake', 3, '城破之后，还要决定怎样活',
    s => `${status(s, 'ally') === 'captured' ? '嵇萝被困在外城，她每晚敲三次残钟，让你知道她还在。' : '嵇萝在残墙下挨个认人，手边也摆着你那封旧信。'}域外来客暂时退去，留下的裂隙仍会开启。城主想重新上供，年轻人想立刻报仇，而你已经见过一座宗门怎样在急着证明自己时失去退路。`, [
      c('rescue', '先打通废墟，把困住的人接回来', '花十八灵石、两年。嵇萝获救，增加十二名同行者。', '残钟终于停了，嵇萝从你打开的洞里走出来。她不问你这次救人值不值得，只把最后一名伤者递给你。', { cost: { stones: 18 }, months: 24, effects: { people: { ally: { status: 'alive', bond: 22 } }, survivors: 12, flags: { rescuedForeign: true } } }),
      c('repair', '修好各地联络阵，组织长期救援', '阵法达到三十五可用；嵇萝获救，并得到界门锚。', '救援不再靠一人闯进废墟。各地按你的路标轮流来人，嵇萝回家时带着一张新名字册。', { requires: { skills: { array: 35 } }, months: 24, effects: { people: { ally: { status: 'alive', bond: 18 } }, items: ['gate_anchor'], flags: { regionalAlly: true, rescuedForeign: true }, survivors: 10 } }),
      c('wait', '集中药与食物，在地下等潮退', '用四年，穷尽普通办法把人救回来；损失八名同行者。', '潮退了，嵇萝跟着最后一队人走回地下。八个名字留在失散册上，这座城仍有继续生活的人。', { months: 48, effects: { people: { ally: { status: 'alive', bond: 8 } }, survivors: -8, stats: { health: 15 }, flags: { rescuedForeign: true } } }),
    ], { next: 'letter', months: 24 }),

  n('letter', 4, '一封终于送到的故乡信',
    s => `${homeLetter(s)}${status(s, 'friend') === 'missing' ? '名单里还添了一句：有人在旧牢见过沈砚，他没有忘记你的名字。' : status(s, 'friend') === 'captured' ? '沈砚被迫修补牢阵，偷偷把一条逃路画在信背。' : '沈砚也写了几笔：饭还是常煮焦，但大家已经吃得下了。'}嵇萝没有催你回去，只问，你想把这些年学来的本事用在哪里。`, [
      c('return', '回去，救还在等的人，再谈复仇', '进入归山篇。早期的人物、物品与承诺会参与救援。', '你把旧信摊在桌上，逐个念出要找的人。嵇萝开始收行囊，却让你先把归途留给所有同行者。', { next: 'retreat', effects: { flags: { returning: true }, people: { ally: { bond: 10 } } } }),
      c('avenge', '回去，让镜火盟为覆灭付出代价', '归山篇中可以决战；复仇优先会让援军更谨慎。', '你收起松种，先把剑磨好。嵇萝愿意同行，但说如果你只剩恨，她会先带伤者离开。', { next: 'retreat', effects: { flags: { returning: true, revenge: true }, stats: { courage: 8 }, people: { ally: { bond: -8 } } } }),
      c('stay', '接他们来异乡，不再重建旧山门', '进入另岸篇。仍需打通撤离通路，救人不是自动完成。', '你寄回一张新的安置图。故乡可以不在原来的山上，但那封信里的人必须真的有路走过来。', { next: 'far_cost', effects: { flags: { staying: true } } }),
    ], { months: 12 }),

  n('retreat', 4, '闭关要给急事留一道门',
    '对方不是只要升一境就能打败的敌人。嵇萝提议筹备援军，白渡来信说界门有十年周期。你也可以尝试养成元婴，但程照雪的信越来越急。闭关的门可以锁上，故乡的消息却不会因此停下来。', [
      c('prepare', '用三年演练阵法与撤退，把盟友接进来', '阵法提升，得到界门锚；不要求提升境界。', '你把每份援军的退路都画好，白渡终于愿意把界门锚交给你。归乡不再是一人的冲动。', { months: 36, next: 'assemble', effects: { skills: { array: 12 }, items: ['gate_anchor'], flags: { wellPrepared: true } } }),
      c('nascent', '以地火炉心闭关十年，尝试元婴', '需要金丹与炉心。急报会在第三年打断，届时由你决定是否继续。', '炉心点亮灵台。你交代嵇萝，不论关到哪一年，故乡急报都要送进来。', { requires: { realm: 3, items: ['ember_engine'] }, months: 120, next: 'assemble', interrupt: { after: 36, target: 'beacon' }, effects: { flags: { nascentAttempt: true } } }),
      c('now', '不再等待，先用现有本事归去', '少花三年；没有筹备加成，仍可借物品与人情破局。', '你把行囊装好，药与阵图放在剑前面。嵇萝提醒你，到了山下仍可以选择先救人。', { months: 6, next: 'assemble', effects: { stats: { courage: 8 }, flags: { rushed: true } } }),
    ]),

  n('beacon', 4, '十年闭关，只过了三年',
    '第三年，石门上的急铃响了。程照雪写：阵眼将在七年后的大潮耗尽，但山下已有伤员急需转移。你的闭关确实只过去三年；还有七年准备，并不等于能把求援当成背景音。', [
      c('leave', '现在出关，先组织救援', '放弃本次元婴；炉心保留，立即进入集结。', '你推开石门，把还未成形的婴火收回金丹。嵇萝等在门口，行囊已经装好了救人的药。', { next: 'assemble', months: 1, effects: { flags: { answeredBeacon: true }, stats: { empathy: 8 } } }),
      c('finish', '托盟友先救伤员，再完成余下七年', '需要已建立大陆援军。确定元婴，消耗炉心；盟友能稳住求援者。', '援军按先前留下的路图出发，你没有把求救留给一句“等我出关”。七年后元婴成形，归门也没有错过。', { requires: { flagsAny: ['regionalAlly', 'extraAlly'] }, cost: { items: ['ember_engine'] }, next: 'assemble', months: 84, effects: { realm: 4, flags: { nascent: true, aidSent: true }, stats: { health: 15 } } }),
      c('abandon', '让闭关停在这里，把炉心改成救援阵', '阵法提升，救援加成；不消耗炉心。', '你拆开闭关阵，把火接到界门旁。炼成元婴之外，也有值得把这几年留给它的事。', { next: 'assemble', months: 12, effects: { skills: { array: 12 }, flags: { wellPrepared: true, answeredBeacon: true } } }),
    ]),

  n('assemble', 4, '哪些承诺会真的来',
    s => `你把归途摊开。${has(s, 'tide_token') ? '潮契回了信，海上的船正等一次涨潮。' : ''}${has(s, 'ember_engine') ? '烬原匠人愿意携炉同行。' : ''}${has(s, 'sky_scroll') ? '书院照着天图标出不会被截断的路。' : ''}${s.flags.mercy ? '宋却也寄来一封没有署名的营图。' : ''}${homeLetter(s)}嵇萝问这次是为谁去，你不能只回答“为了变得更强”。`, [
      c('people', '给所有人留撤退顺序，先救被困者', '援军愿意跟随；强化救人路线。', '你念出的第一个名字不是镜火盟主，而是失散册里还没有划掉的人。嵇萝替你把退路再检查一遍。', { effects: { flags: { rescueFirst: true }, people: { ally: { bond: 15 } }, survivors: 6 } }),
      c('strategic', '以归山阵图与天图制定破阵方案', '需要阵图或天图。增加破阵把握。', '青岚的暗渠与界海的周期在纸上接成一条线。你这些年没有白走另一片大陆。', { requires: { any: [{ items: ['return_chart'] }, { items: ['sky_scroll'] }] }, effects: { flags: { plan: true }, skills: { array: 8 } } }),
      c('duel', '约战盟主，把敌军目光引到自己身上', '御剑提升；之后可单挑，也可以临场改成救援。', '战书先到，救援船随后。你答应嵇萝，决斗不是必须用命证明的诺言。', { effects: { skills: { sword: 10 }, flags: { duel: true }, stats: { courage: 6 } } }),
    ], { next: 'return_gate', months: 6 }),

  n('return_gate', 4, '归门前有人替你关上了追兵的门',
    s => s.flags.mercy
      ? '归门附近全是镜火盟。宋却穿着旧军服来见你，家书已经换成孩子的新字。他愿意关掉一侧镜阵，只求你别把营中的普通弟子全算成仇人。放过一个追你的人，如今变成了这条路上真正的岔口。'
      : '归门附近全是镜火盟。白渡说可以靠界门锚稳定通路，也可循掩息面具的旧术绕行。强闯最快，但先前救来的同伴都在你身后，这次失败受伤的不一定只有你。', [
      c('inside', '接受宋却的帮助，接走营中愿意离开的人', '需要当年的宽宥。无需赌战斗，宋却成为同行者。', '镜阵一侧熄了。宋却没有去找盟主邀功，而是牵着孩子走进你的退路里。', { requires: { flags: ['mercy'] }, effects: { location: 'home', flags: { openWay: true }, people: { rival: { location: 'home', bond: 30 }, ally: { location: 'home' } }, survivors: 8 } }),
      c('anchor', '用界门锚和天图绕开战阵', '需要界门锚、天图或掩息面具之一；稳妥到达。', '门开在松林后方，你们没有踏进盟主准备好的正面战场。第一队伤员沿反方向送往异乡。', { requires: { any: [{ items: ['gate_anchor'] }, { items: ['sky_scroll'] }, { items: ['phantom_mask'] }] }, effects: { location: 'home', flags: { openWay: true }, people: { ally: { location: 'home' } } } }),
      c('force', '破开一条路，赶在镜阵闭合前归去', '失败会重伤，损失十名同行者；仍能到达山下。', '你劈开镜阵，松风从门后扑来。归乡终于不再只是纸上的一句话。', { check: { base: 30, skill: 'sword', scale: 0.4, realmScale: 8, flags: { wellPrepared: 12, plan: 12 }, failText: '你们到了青岚，归门却被击坏。十人留在另一岸，你带伤抵达山下，必须重新安排撤离。', failure: { location: 'home', stats: { health: -22 }, survivors: -10, flags: { openWay: false }, people: { ally: { location: 'home' } } }, failMonths: 6 }, effects: { location: 'home', flags: { openWay: true }, people: { ally: { location: 'home' } } } }),
    ], { next: 'home_ruins', months: 2 }),

  n('home_ruins', 4, '山还是那座山，名字却不能照旧',
    s => `你回到${s.player.homeBeforeWar || '旧洞府'}的位置，那里只剩一段断墙。程照雪带人来接你，鬓边已有白发，腰间还是那把折剑。${status(s, 'master') === 'dead' ? '她把闻竹的墓址告诉你，没有谁在等一颗能让死人回来的仙丹。' : status(s, 'master') === 'captured' ? '她说闻竹还在主阵下面，阵眼已经开始耗尽她。' : '闻竹在山下等你，把茶又温了一遍。'}这座山有可以抢回的地方，也有再抢不回的年月。`, [
      c('meet', '先去山下见幸存者，把欠下的话说完', '花一年，恢复体力；让救援有明确的去处。', '你认出一些变了模样的人，也承认有些名字一直没找回来。程照雪坐在你旁边，终于不用再一边说话一边点人。', { months: 12, effects: { stats: { health: 15, mind: 10 }, flags: { grounded: true }, people: { sister: { bond: 20 } } } }),
      c('scout', '循旧阵图勘察，先查被囚者的位置', '需要归山阵图。救人和最终破阵获得加成。', '暗渠被封了一半，你却认得自己当年修过的石缝。名单上的人终于有了真正的位置。', { requires: { items: ['return_chart'] }, effects: { flags: { prisonersLocated: true, plan: true }, skills: { array: 8 }, people: { sister: { bond: 10 } } } }),
      c('grief', '先去旧墓与药圃，留下带回的松种', '消耗渡云松种。恢复心境，记下以后重建的位置。', s => status(s, 'master') === 'dead' ? '松种落进墓边的土里。你把这些年讲给闻竹听，没有把沉默当成她会复活的暗示。' : '药圃的土还认得故乡那场雨。你把松种留下，决定救出人之后再来谈这里该叫什么。', { cost: { items: ['home_seed'] }, effects: { stats: { mind: 18 }, flags: { seedPlanted: true }, people: { sister: { bond: 12 } } } }),
    ], { next: 'enemy_terms', months: 3 }),

  n('enemy_terms', 4, '盟主给你一张新的弟子名单',
    '镜火盟主在旧山门里等你。他许诺归还渡云宗，条件是你接管界门供奉，把下一批弟子送给域外来客。他说这叫活下去的规矩。你曾经也只有十六岁，如今不能不知道那张名单下面压着什么。', [
      c('refuse', '拒绝供奉，先救人再破阵', '保留援军支持。境界不足时也可走阵法路线。', '你把名单推回去，让山下先开救援灯。盟主终于明白你带回的不只有修为。', { next: 'rescue', effects: { flags: { refusedTribute: true } } }),
      c('fake', '假意签约，借换防机会救人', '阵法达到四十或有宋却的营图可用。强化救援。', '你签的是一张能自行焚尽的假纸。程照雪认得约定好的火色，在镜阵换防时带人下了暗渠。', { requires: { any: [{ skills: { array: 40 } }, { flags: ['mercy'] }] }, next: 'rescue', effects: { flags: { prisonersLocated: true, plan: true, openWay: true } } }),
      c('evacuate', '放弃旧山门，趁会面接走所有愿意走的人', '不争殿宇与宗主名位。转为保卫撤离队伍。', '你把松林外的界门亮给他们看。有人舍不得旧殿，你让他们带走牌位，却没有让活人继续留下作阵眼。', { next: 'last_rescue', effects: { flags: { abandoningSect: true }, survivors: 8 } }),
    ], { months: 1 }),

  n('rescue', 4, '名单上还没有划掉的名字',
    s => status(s, 'master') === 'captured'
      ? `你看见闻竹被锁在主阵里，仍按当年的节拍教囚徒留出口。${status(s, 'friend') !== 'alive' ? '沈砚在隔壁牢房，替伤员煮的饭又焦了。' : '沈砚跟在你身后，抱着终于装满的药箱。'}能强行斩锁，也能拆掉阵钉的回路。师父活下来之后，仍要真的离开阵眼。`
      : `地牢里关着当年分散的同门。${status(s, 'friend') !== 'alive' ? '沈砚听见你的脚步，先叫了一声不确定的名字。' : '沈砚带着药箱陪你认人。'}${status(s, 'master') === 'dead' ? '闻竹已经不在，可她教的逃生阵还被他们画在地上。' : '闻竹在山下准备接住他们。'}你要先认出牢里每一个名字，再把真正的出口交到他们手里。`, [
      c('array', '拆回阵钉，让牢阵自己变成出口', '阵法达到四十二，或有归山阵图。确定救出在世被囚者。', '锁链沿着你改过的回路松开。你把还活着的人一个个送到程照雪手里。囚徒报出那些你曾抄在纸上的名字，又报出这些年新认识的人。', { requires: { any: [{ skills: { array: 42 } }, { items: ['return_chart'] }] }, effects: s => ({ people: { ...(status(s, 'master') === 'captured' ? { master: { status: 'alive', location: 'refuge', bond: 20 } } : {}), ...(status(s, 'friend') !== 'dead' ? { friend: { status: 'alive', location: 'refuge', bond: 20 } } : {}) }, flags: { captivesSaved: true }, survivors: 16 }) }),
      c('trade', '用炉心置换阵眼，再带人离开', '消耗地火炉心。确定救出在世被囚者。', '炉心接住阵眼的火，你接住从阵里跌下来的人。烬原匠人的那几年，成了今天真正有用的力量。', { cost: { items: ['ember_engine'] }, effects: s => ({ people: { ...(status(s, 'master') === 'captured' ? { master: { status: 'alive', location: 'refuge', bond: 20 } } : {}), ...(status(s, 'friend') !== 'dead' ? { friend: { status: 'alive', location: 'refuge', bond: 20 } } : {}) }, flags: { captivesSaved: true }, survivors: 16 }) }),
      c('break', '斩断枷锁，让程照雪带人撤离', '失败可能令被囚师父身亡、少救八人；后果不可逆。', '剑光穿过枷锁，程照雪按当年的口令带人回家。你把旧信摊开照着上面的名字逐个对过去，牢里因此多认出了两个人。你终于听见沈砚把那封旧信念完。', { check: { base: 28, skill: 'sword', scale: 0.45, realmScale: 8, flags: { prisonersLocated: 14, rescueFirst: 10, plan: 8 }, items: { teacher_blade: 10, old_letter: 10 }, failText: s => status(s, 'master') === 'captured' ? '枷锁断了，阵眼却反噬闻竹。她把最后的出口留给弟子，生命停在你归来的这一天。沈砚与余下的人被程照雪接走。' : '反噬封住一半牢房，八人在混乱中失散。程照雪带出沈砚，你没有把不完整的救援写成全胜。', failure: s => ({ stats: { health: -22 }, people: { ...(status(s, 'master') === 'captured' ? { master: { status: 'dead' } } : {}), friend: { status: 'alive', location: 'refuge', bond: 10 } }, survivors: -8, flags: { captivesSaved: true, rescueLoss: true } }), failMonths: 6 }, effects: s => ({ people: { ...(status(s, 'master') === 'captured' ? { master: { status: 'alive', location: 'refuge', bond: 20 } } : {}), friend: { status: 'alive', location: 'refuge', bond: 18 } }, flags: { captivesSaved: true }, survivors: 16 }) }),
    ], { next: 'return_battle', months: 1 }),

  n('return_battle', 4, '归来不是站上最高的境界',
    s => `镜火盟打开了域外主门。${s.world.threat === 'beast' ? '吞潮兽的影子又覆盖青岚，这次你知道它为何沿着锁链而来。' : '无面尊者的真身在门后，所有假镜印一齐睁眼。'}程照雪守着救援队，嵇萝站在你留的退路旁。你可以破门、合阵、斩敌，也可以承认此刻最该保住的是人。`, [
      c('seal', '用天图或鳞片断开主门，解除域外控制', '需要天图或鳞片；阵法达到四十五。确定破局，无需最高境界。', s => s.world.threat === 'beast' ? '你拆掉困兽的镜链，引它沿天图回到界海。山上终于只剩山风，镜火盟再没有天外靠山。' : '镜印顺着你改过的阵纹彼此封死。尊者被关回界海，留下的盟主不再有谁替他许诺千年。', { requires: { all: [{ any: [{ items: ['sky_scroll'] }, { items: ['beast_scale'] }] }, { skills: { array: 45 } }] }, effects: { flags: { victory: true, sealVictory: true }, stats: { insight: 10 } }, next: 'rebuild' }),
      c('allies', '把潮舟、炉火与书院接成一座合阵', '需要至少两份有效援军或器物承诺；确定破局。', '你不是阵心里唯一的名字。海潮、地火与天图沿着人们愿意走来的路合在一起，主门在阵中合拢。', { requires: { aid: 2 }, effects: { flags: { victory: true, coalitionVictory: true }, people: { sister: { bond: 15 }, ally: { bond: 15 } } }, next: 'rebuild' }),
      c('duel', '独自迎击真身，把胜负押在自己的剑上', '高危：失败会战死，本世结束。胜利仍会留下重伤。', '你的剑斩进主门，真身随界门一同崩退。你活着落回松林，程照雪先骂你，再替你包扎。', { check: { base: 8, skill: 'sword', scale: 0.42, realmScale: 11, flags: { duel: 12, wellPrepared: 10 }, items: { teacher_blade: 10, ward: 8 }, failText: '主门吞没了剑光。你没有再走出那片松林。程照雪按早已写好的退路带走众人，这一世在此结束。', failure: { stats: { health: -100 }, flags: { fellInBattle: true } }, failEnding: 'fallen' }, effects: { flags: { victory: true }, stats: { health: -35 } }, next: 'rebuild' }),
      c('withdraw', '牵制主门，保卫撤离者，放下夺山', '确定把故事推进到撤离篇；旧山门暂时失去。', '你把最后一道阵改成逃生口。山留给敌人，人不必。嵇萝在另一边接住第一批伤员。', { effects: { flags: { abandoningSect: true } }, next: 'last_rescue' }),
    ], { months: 12 }),

  n('last_rescue', 5, '可以失去一座山，不能把人留成供奉',
    s => `${status(s, 'master') === 'captured' ? '闻竹仍在阵眼，你要在撤离前把她接出来。' : status(s, 'master') === 'dead' ? '闻竹的旧剑与墓土被程照雪带进小船，死去的人没有被遗忘。' : '闻竹替最后一名孩子系好衣领，催你先开门。'}沈砚${status(s, 'friend') === 'alive' ? '已经在队里' : '还被留在山中'}。这一次不争宗主之位，只决定有没有足够真实的路让他们离开。`, [
      c('gate', '借界门锚或潮契把两岸接成一条路', '需要界门锚或潮契。确定救出在世师父与沈砚，迁往异乡。', '船与界门轮流接人。最后一批名字从名单上移进安置册，渡云宗的牌位放在一间还有炊烟的屋里。', { requires: { any: [{ items: ['gate_anchor'] }, { items: ['tide_token'] }] }, effects: s => ({ location: s.flags.destination, flags: { relocated: true, captivesSaved: true }, survivors: 12, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination }, ally: { location: s.flags.destination } } }), next: 'far_finale' }),
      c('tunnel', '沿暗渠分批护送，花三年绕过主门', '不要求物品。用三年救回在世的人，十二名同行者离散。', '没有谁一次开出通天的门，你们却一趟趟把活人带下山。十二人留在别处生活，你保存了他们最后的地址。', { months: 36, effects: s => ({ location: s.flags.destination, flags: { relocated: true, captivesSaved: true }, survivors: -12, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination }, ally: { location: s.flags.destination } } }), next: 'far_finale' }),
      c('sacrifice', '燃尽自己的修为与寿元，撑住最后一门', '明确终局：你会身亡，所有在世被困者被救出。', '门在你身后开到最后一人走过。松风带走了你的名字，人们却在新屋里为你留了一盏不必等你回来的灯。', { effects: s => ({ flags: { relocated: true, captivesSaved: true }, survivors: 24, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination }, ally: { location: s.flags.destination } } }), ending: 'sacrifice' }),
    ]),

  n('rebuild', 5, '胜利后，山门该叫什么',
    s => `镜火盟散了，域外主门也不再征收名字。渡云山空出很多地方，${status(s, 'master') === 'dead' ? '闻竹的位置却永远空着' : '闻竹坐在台阶下，等你决定新弟子第一天学什么'}。程照雪不愿恢复旧供奉，嵇萝也不愿另一片大陆只被叫作机缘。你要给后来者怎样的家？`, [
      c('open', '重建渡云，先教每个人留下出口', '花二十四灵石。重建山门，不再以境界决定谁值得被救。', '新山门第一课不是测灵根，而是认清出山的路。你把不同大陆的法术都写进课册，把失散名字留在门内。', { cost: { stones: 24 }, effects: { flags: { rebuilt: true }, home: '重建的渡云山', stats: { empathy: 10 } } }),
      c('network', '把山门改成跨大陆的驿站与学舍', '需要界门锚或天图。不收供奉，让来往的人交换本事。', '炉匠、船夫、书院与青岚山民在同一张桌上吃饭。你终于不必从一个宗门证明自己走向另一个宗门。', { requires: { any: [{ items: ['gate_anchor'] }, { items: ['sky_scroll'] }] }, effects: { flags: { rebuilt: true, networkHome: true }, home: '界门学舍', stats: { insight: 8 } } }),
      c('rest', '把旧殿留作纪念，在山下种药过日子', '不花钱。保住人之后，可以选择普通而安稳的余生。', '你不再领宗主印，程照雪也把折剑挂在门边。山下药圃的火没有再熄，空下的时间终于可以用来煮好一顿饭。', { effects: { flags: { quietHome: true }, home: '山下药圃', stats: { health: 15, mind: 15 } } }),
    ], { next: 'final_choice', months: 120 }),

  n('final_choice', 5, '不必把余生也拿去赶下一境',
    '十年过去，年轻弟子已经能自己出门。你的故事没有停在击败敌人的那一瞬间：有人长大，有人老去，有人又把陌生人的名字带回来。门外还有路，屋里也有人等。接下来怎样活，不必由境界条替你决定。', [
      c('stay', '留下教人，在灯下走完余生', '终章：守山人。回顾这局保存的人、失去的人与重建的家。', '你把练习木剑递给新弟子，照旧先教收剑。窗外的松风很轻，灯有人接着点。', { ending: 'restore' }),
      c('wander', '与愿意同行的人再去一片大陆', '终章：长路未尽。把稳定的家留给后来者，自己继续远行。', '你们没有拆掉门口的灯。下一次出发不再是逃亡，行囊里装着足够从容的告别。', { ending: 'wander' }),
      c('beyond', '沿稳定的界门，去看界海另一边', '需要元婴或界门锚。终章：渡海人，不等于所有故事都已结束。', '你没有用一生证明自己该比谁更高。跨过界海时，你先寻找可以回来、也可以让别人过去的路。', { requires: { any: [{ realm: 4 }, { items: ['gate_anchor'] }] }, ending: 'beyond' }),
    ]),

  n('far_cost', 5, '让他们过来，需要真的有人去接',
    s => `${homeLetter(s)}你选择不夺回旧山门，便要让青岚的人有一条来异乡的路。嵇萝愿意负责安置，白渡愿意守归门。你还差一项：稳定门、买下船，或者亲自绕回青岚护送。放下旧山不等于放下旧人。`, [
      c('anchor', '用界门锚接人，让各地轮流照看', '需要界门锚。确定接回在世师父与沈砚，花三年。', '第一队人走出门时还把腰牌攥得很紧。嵇萝递来新屋钥匙，没有让他们先证明自己有用。', { requires: { items: ['gate_anchor'] }, months: 36, effects: s => ({ location: s.flags.destination, flags: { relocated: true, captivesSaved: true }, survivors: 18, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination } } }) }),
      c('fleet', '向潮契借船，或出钱雇足撤离的船', '有潮契时花十二灵石，否则花三十二；花四年。', '船来来回回走了四年。你没有夺回山，却把每一趟能接回的人送进真正亮着灯的屋。', { cost: s => ({ stones: has(s, 'tide_token') ? 12 : 32 }), months: 48, effects: s => ({ location: s.flags.destination, flags: { relocated: true, captivesSaved: true }, survivors: 12, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination } } }) }),
      c('personally', '回青岚，沿旧路一趟趟把人护送出来', '不要求物品，用八年；同行者会离散十人，但在世师父与沈砚获救。', '八年里你又走过许多次那座山。松阶没有回到从前，名单上还活着的人却终于能在异乡吃一顿热饭。', { months: 96, effects: s => ({ location: s.flags.destination, flags: { relocated: true, captivesSaved: true }, survivors: -10, people: { ...(status(s, 'master') !== 'dead' ? { master: { status: 'alive', location: s.flags.destination } } : {}), friend: { status: 'alive', location: s.flags.destination }, sister: { location: s.flags.destination } } }) }),
    ], { next: 'far_finale', months: 24 }),

  n('far_finale', 5, '新地方也要学会不收别人的一生',
    '异乡的新屋住满了人。有人提议按灵根高低分地，效率会更好；程照雪却把一名没有灵根的孩子领到你面前。你曾逃离一座把姓名交给供奉的山门，最后这一次决定，关乎你们会不会在新地方重来同样的事。', [
      c('school', '开一间不问灵根的学舍', '终章：另岸新火。法术、药方与凡人的手艺都能成为传承。', '孩子把自己的名字写得歪歪斜斜，你没有删掉。窗外有人把渡云松种种进了异乡的土。', { effects: { flags: { openSchool: true }, home: '另岸学舍' }, ending: 'exile' }),
      c('ordinary', '分田与药圃，让大家自己选择生计', '终章：人间有处。不必人人修仙，也能值得被记住。', '沈砚终于煮好一锅饭。你们围在普通的桌旁，谈明年种什么，没有催谁赶上下一境。', { effects: { flags: { quietHome: true }, home: '异乡药圃' }, ending: 'ordinary' }),
      c('road', '把安置交给可信的人，继续为流亡者找路', '终章：长路未尽。前一段苦难成为别人能借用的经验。', '你把自己的地图留了一份在门内。又一次走出去时，身后的人知道你是去找路，不是丢下他们。', { ending: 'wander' }),
    ]),
].map(node => [node.id, node]));

// These choices describe a period of work itself. Its rewards arrive after the
// stated months, instead of granting a finished cultivation at its start.
const PERIOD_CHOICES = {
  lesson: ['together'], refugees: ['shelter'], foundation: ['medicine', 'repair', 'storm'], gate: ['tide', 'ember', 'sky'],
  landing_ember: ['dig'], ember_ruins: ['earn'], visit_ember: ['work'],
  relic_door: ['slow'], golden: ['prepared', 'risk', 'remain'], golden_repair: ['heal', 'accept', 'teacher'],
  visit_tide: ['witness'], visit_sky: ['include'], beast_wake: ['rescue', 'repair', 'wait'], retreat: ['prepare'], return_gate: ['inside', 'anchor', 'force'], home_ruins: ['meet'],
  beacon: ['finish'], last_rescue: ['gate', 'tunnel'], far_cost: ['anchor', 'fleet', 'personally'],
};
const BEGIN_PERIOD = {
  lesson: '你陪沈砚认下过错，先去敲那些等药的山民的门。药圃要一点点补回，信任也要在日子里重新长出来。',
  refugees: '你在镇上留下来，给流亡者找住处，也靠治病与修器攒路费。大家开始等下一顿热饭，不必只等下一场逃亡。',
  foundation: '你与白渡约好守关的日子，把院里的灯交给他。炼气的灵息尚不稳，你要从这一程学会在每个雨夜里把它安住。',
  gate: '你告别守门人，带着行囊进入界门与渡船相接的航路。新的住处，要等真正抵达另一边之后才有地址。',
  landing_ember: '你在枯井旁支起药锅，和嵇萝一起辨认水脉。孩子们轮流送来能分出的一点水，泉眼重流的那天，你们约好一起吃饭。',
  ember_ruins: '你留下做工，让炉心慢慢成形。城里的孩子也会在这几年长大，你答应离开前教会他们看火。',
  visit_ember: '你在旧炉旁搭起工作台，准备造第二颗炉心。旧药炉照常有火，自己的归途先留在这几年的手艺里。',
  visit_tide: '你留下作证，开始修复潮阵。船上的人还在等待放行，这两年要把航路真正接通。',
  visit_sky: '你开始沿无名岛绕行，记录船路与每一个等待靠岸的地方。天图会在走完这一年后补全。',
  beast_wake: '你开始清点药与补给，组织废墟里的救援。受困者不会在这次安排说出口时就自动获救。',
  retreat: '你开始演练撤退阵，把已有的援军一批批接进来。接下来三年要把纸上的路变成真正能走的路。',
  return_gate: '你们收好行囊，沿选定的界门通路赶回故乡。还没有抵达的人，仍留在这一边的地址里。',
  home_ruins: '你从山下开始挨户探望，寻找那些搬过家、改过姓名的人。这一年也要把自己的伤慢慢养好。',
  relic_door: '你与嵇萝在遗迹外缘安顿下来，种药、修屋，等自然灵火沿着墙缝慢慢出来。没有同伴被留给祭坛。',
  golden: '你整理药与炉火，给门外的人留下一封信。下一程将尝试凝结金丹，嵇萝会守在阵外，等你亲自推开石门。',
  golden_repair: '你收起受损的飞剑，开始按药师的安排修复灵台。门外的灶照常有火，下一场雷可以等你真正养好再来。',
  beacon: '援军立即去接山下伤员，并给旧主阵接上备用炉火，为在世的闻竹多争出三年。你继续余下七年闭关，元婴尚未成形。',
  last_rescue: '你不争山门，先与程照雪画出分批护送的路。接下来三年要一趟趟走，最后到岸的人才能真正算作获救。',
  far_cost: '嵇萝开始安排异乡的屋与药，白渡守住第一段归门。你去接青岚的人，这段迁徙结束后，他们才会真正出现在新家。',
};
for (const [event, choices] of Object.entries(PERIOD_CHOICES)) for (const id of choices) {
  const choice = NODES[event].choices.find(c => c.id === id);
  choice.deferEffects = true; choice.startReply = BEGIN_PERIOD[event];
}
NODES.beacon.enter = s => ({ deadline: status(s, 'master') === 'captured' ? s.month + 84 : null });
NODES.beacon.choices.find(c => c.id === 'finish').immediate = { extendDeadline: 36, flags: { aidSent: true } };
NODES.beacon.choices.find(c => c.id === 'finish').hint = '需要已建立大陆援军。援军给阵眼续上三年，余下七年后确定元婴；消耗炉心。';
NODES.golden.choices.find(c => c.id === 'remain').startReply = '你暂不结丹，先把住处、界门与人情经营好。接下来三年仍走筑基的路，给后来要做的事攒下钱与本事。';
NODES.beast_attack.choices.find(c => c.id === 'shelter').reply = '你承认此刻挡不住天外来客。地下却还有灯、药和活人，你们先沿能走的路撤离，把之后的救援留给真实的年月。';
NODES.beacon.text = s => '第三年，石门上的急铃响了。程照雪报告了山下的伤员与旧主阵的变化。你的闭关只过去三年，还有七年计划未完成。' + (status(s, 'master') === 'captured' ? '闻竹的求援期限还剩' + Math.max(0, s.world.masterDeadline - s.month) + '个月，继续修行会真实占用这段时间。' : status(s, 'master') === 'dead' ? '闻竹已经离世，后来的元婴也不能重写这个结果。' : '闻竹仍在世，山下的人却仍需要有人先接住他们。');
NODES.beacon.choices.find(c => c.id === 'finish').reply = '七年真正过去，元婴成形。你沿援军留下的路赶往旧山门；谁仍在世、谁已错过期限，都留在实际发生的记录里。';
