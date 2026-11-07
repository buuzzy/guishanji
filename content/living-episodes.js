import { REGIONS } from './adventure.js';

const c = (id, label, hint, reply, data = {}) => ({ id, label, hint, reply, ...data });
const n = (id, act, title, text, choices, data = {}) => ({ id, act, title, text, choices, ...data });
const living = (s, id) => s.people[id].status === 'alive';
const has = (s, id) => s.inventory.includes(id);
const period = (data, startReply) => ({ ...data, deferEffects: true, startReply });

export const EPISODES = Object.fromEntries([
  n('urgent_message', 3, '一封急讯穿过了当前的修行', s => {
    const crisis = s.life.crisis;
    const opening = crisis.channel === 'voice' ? '传音符忽然亮起，旧灯号穿过了阵壁。' : '定位阵送来一段断续留言。';
    return opening + crisis.message + '你仍在' + s.life.activity + '，已经过去的年月不会退回。你可以离开这段经历去回应，也可以托人先接住急事，或继续自己的计划。';
  }, [
    c('leave', '中断当前经历，带已有收获去回应急事', s => '放弃尚未完成的奖励与修炼；' + (s.life.arc ? '结束本次探险，' : '') + '实际行路' + s.life.crisis.travel + '个月，抵达后进入危机事件。', '你收好已在行囊里的东西，把没完成的炉火与取宝计划放下。出发前，给仍在这里的人留下了明确的去处。', { months: 0 }),
    c('aid', '派出已有援手，自己继续当前经历', '需要实际建立的援军；花十二灵石。争取三年，原计划仍按剩余月份继续。', '你把路线与路费送出去，援手按已有承诺启程。炉火尚未完成，派人也不等于危机已被解决，下一段消息仍要等真实的年月。', { requires: { flagsAny: ['regionalAlly', 'extraAlly', 'trialAlly', 'outerFriends'] }, cost: { stones: 12 }, months: 0 }),
    c('continue', '继续当前计划，承受来不及赶回的后果', '不替你回应危机。原计划继续，宗门与城镇可能陷落，被困者的期限照常流逝。', '你把留言留在石壁边，继续原来的路。门外的年月没有暂停，后来收到的消息会保留这次未能回应的后果。', { months: 0 }),
  ]),
  n('childhood', 0, '家门外的第一条路', s => {
    const household = s.birth.family;
    return household === 'clan'
      ? '六岁那年，族里让你辨认家传符纹。有人说灵根决定一生，家中长辈却把账簿、药篮与旧剑一起摆出来，让你先选愿意学的东西。'
      : household === 'noble'
        ? '六岁那年，家里请来的先生问你想学什么。商路很长，书房很亮，街角药铺里的孩子却与你住着不同的世界。'
        : '六岁那年，你能跟着家人走出村口了。先生来村里借住，药铺也缺一个认草药的小帮手，河边的旅人则有很多没写在书里的故事。';
  }, [
    c('books', '跟先生认字，听他说山河', '悟性与阵法的起点提高。', '你学会把陌生地名写下来。多年以后，地图上再大的山也有了可以问路的名字。', { effects: { stats: { insight: 8 }, skills: { array: 4 }, flags: { childhoodBooks: true } } }),
    c('herbs', '跟家人去药铺，记住来求药的人', '丹术与仁心的起点提高。', '你起初只认得叶子的颜色，后来也认得那些常在门外等药的人。', { effects: { stats: { empathy: 8 }, skills: { alchemy: 4 }, flags: { childhoodHerbs: true } } }),
    c('roads', '听旅人讲故事，学着护住自己', '御剑与胆识的起点提高。', '你用树枝练过很多次出招，真正记住的却是旅人说的：出门先看哪里能回来。', { effects: { stats: { courage: 8 }, skills: { sword: 4 }, flags: { childhoodRoads: true } } }),
  ], { months: 0 }),

  n('family_claim', 0, '这份家产也有人在等', s => s.birth.family === 'clan'
    ? '族中寄来一封信：镜火盟要求各家交出护符与灵田，换取不被征召的资格。家里问你是否动用自己这一份灵石，保住旧屋与族人的退路。'
    : '商路断了一段，家里的旧契约被拿来追债。你有了修行的机会，家中人却仍要在明天开门做生意。信里没有催你，只列出了还差的钱。', [
    c('pay', '寄回二十灵石，给家里留一条退路', '家产暂时保全；宗门劫难后仍可能受损。', '钱沿渡船送到家门，旧屋没有被抵出去。你在回信里写：若再有事，不必替我瞒着。', { cost: { stones: 20 }, effects: { flags: { familyProtected: true }, stats: { empathy: 6 }, property: { family_home: 'kept' } } }),
    c('contract', '抄下契约，替家里找一个能讲理的人', '花一年，阵法与悟性提高，日后会收到对方回信。', '你沿着契约上的名字找了一年。门不是每一扇都开了，但有人记住了你没有把家产和家人分成两本账。', period({ months: 12, effects: { flags: { familyContact: true }, stats: { insight: 6 }, skills: { array: 6 } } }, '你收好契约，开始沿着商路问人。这一年先替家里把话说清楚。')),
    c('keep', '把余钱留给修行，请家里先舍下铺子', '保留灵石；一处家产实际失去。', '回信说家人搬进了小屋。铺子的招牌换了姓氏，这件事没有因为你后来变强就自动撤销。', { effects: { flags: { familySold: true }, property: { family_home: 'lost' }, stats: { mind: -5 } } }),
  ], { months: 3 }),

  n('devouring_night', 1, '整座山的影子消失了',
    '界门在夜里倒转，巨口遮住了星空。护山阵不是被攻破，而是一层层被吞进天外。镜火盟的战舟趁乱围住外门，闻竹撑着最后一道阵，沈砚被留在塌下的药库。程照雪把三条仍能走的路指给你。', [
      c('master', '接住师父，沿外门退走', '师父获救，同门被俘；旧屋与洞府毁坏。', '你接住闻竹，走出一条不断缩短的山路。她醒来时先问名单，沈砚的名字却只能留在被俘的一栏。', { effects: { people: { master: { status: 'alive', location: 'refuge' }, friend: { status: 'captured', location: 'home' } }, flags: { savedMaster: true }, items: ['home_seed'], survivors: 8 } }),
      c('archive', '带名单与阵图，护住出山的人', '多保全十六人，师父被俘，同门失踪。', '你把名单系在胸前，一路喊出还在回应的名字。闻竹的灯留在山上，后来的救援要从这份名单开始。', { effects: { people: { master: { status: 'captured', location: 'home' }, friend: { status: 'missing', location: 'home' } }, items: ['return_chart', 'home_seed'], flags: { archive: true }, survivors: 16 } }),
      c('resist', '把自己的灵息钉进裂隙，争取救出两人', '高危：失败会在吞噬中死亡；护符与试炼经验增加把握。', '裂隙在你脚下短暂停住，闻竹与沈砚终于赶上最后一队人。程照雪带你走时，山已经不在了。', { check: { base: 26, skill: 'array', scale: 0.55, realmScale: 8, flags: { trialBeacon: 12 }, items: { ward: 15, echo_jade: 10 }, failText: '你钉住了裂隙，却没能从塌下的山路上回来。最后一队人沿程照雪留下的退路离开，这一生在此结束。', failure: { stats: { health: -100 } }, failEnding: 'void_lost' }, effects: { people: { master: { status: 'alive', location: 'refuge' }, friend: { status: 'alive', location: 'refuge' } }, items: ['home_seed'], survivors: 18, stats: { health: -28 } } }),
    ], { months: 2, after: { flags: { sectLost: true }, location: 'refuge', home: '渡口草棚', people: { sister: { location: 'refuge' } }, property: { family_home: 'damaged', dwelling: 'lost' } } }),

  n('fall_decree', 1, '山门的名字被从盟册上抹去了',
    '一纸征召令送进山门：年轻弟子要被送往域外充当阵眼，旧殿则改成镜火盟的驻地。闻竹拒绝交人，夜里便被锁在主阵。程照雪带着退回来的腰牌找你，宗门已经被拆散，你必须决定最后留下什么。', [
      c('master', '趁换防救走师父，让同门随名单撤退', '师父获救，沈砚被俘。家产与洞府可能失去。', '你们没有敲响召集钟，沿暗渠把闻竹送了出去。沈砚的信在第二天被退回，纸上盖着征召的红印。', { effects: { people: { master: { status: 'alive', location: 'refuge' }, friend: { status: 'captured', location: 'home' } }, flags: { savedMaster: true }, survivors: 8, items: ['home_seed'] } }),
      c('archive', '抄走征召与弟子名单，先把人送出城', '多保全十六人，师父被俘、沈砚失踪；保留救援线索。', '你按名单挨户敲门，等天亮时已有人过了河。闻竹和沈砚没有回来，名字却没有被那张盟册决定。', { effects: { people: { master: { status: 'captured', location: 'home' }, friend: { status: 'missing', location: 'home' } }, flags: { archive: true }, items: ['return_chart', 'home_seed'], survivors: 16 } }),
      c('bargain', '交出积蓄与护符，换回师父和沈砚', '花四十灵石，用掉护身玉符；两人获救，旧山门失去。', '你把钱和护符留在桌上，等两人走出阵门才退开。镜火盟留下了旧山，不再留下你们的名字。', { cost: { stones: 40, items: ['ward'] }, effects: { people: { master: { status: 'alive', location: 'refuge' }, friend: { status: 'alive', location: 'refuge' } }, survivors: 12, items: ['home_seed'], flags: { redeemedFamily: true } } }),
    ], { months: 3, after: { flags: { sectLost: true }, location: 'refuge', home: '渡口草棚', people: { sister: { location: 'refuge' } }, property: { family_home: 'lost', dwelling: 'lost' } } }),

  n('trial_invitation', 0, '这一届，回风谷开门',
    '宗门开启回风谷，只准炼气弟子进入，筑基以上须留在外门护阵。谷内有药坡、断涧与古坛，灵潮退尽时门会合拢。陶宁问你是否同行，闻竹提醒你：宝物可以再找，出谷的路必须自己记住。', [
      c('enter', '与陶宁结伴入谷，先记住归路', '炼气可入；花八灵石。开启持续数年的试炼，后续能救人、取宝、深入或撤退。', '你与陶宁在外门留下姓名，把出谷的灯号记在同一块木牌上。', { requires: { realm: 1, maxRealm: 1 }, cost: { stones: 8 }, months: 12, next: 'trial_entry', immediate: { flags: { trialStarted: true }, people: { trialmate: { known: true, location: 'home' } } } }),
      c('stay', '留在外门接应，错过这一届入谷', '不冒入谷风险，得到接应经验；这一届机会不再重来。', '你守着外门的灯，接住出谷的人。有人抱着宝物，有人只抱着同伴，故事比名次长得多。', period({ months: 18, effects: { skills: { array: 6 }, flags: { trialDeclined: true }, stats: { empathy: 5 } } }, '你留下守外门。这一年半要接住回来的人，谷内的宝物由别人去争。')),
    ], { months: 3 }),

  n('trial_entry', 0, '药坡下有两种脚印',
    '入谷一年，陶宁已能认出妖兽与人的脚印。古坛只在每次灵潮回涌时显露，药坡却有稳定的收成。争先的人割断了后队的引路绳，你要决定这几年的修行如何继续。', [
      c('rope', '接好引路绳，沿药坡逐步推进', '花六灵石；用一年。留下安全退路，带出回风灵种。', '绳索接到了另一处石台，药坡上的灵种也在这一年成熟。你们走得慢，回头时却仍看得见外门。', period({ cost: { stones: 6 }, months: 12, effects: { items: ['wind_seed'], skills: { alchemy: 6 }, flags: { trialBeacon: true } }, next: 'trial_chasm' }, '你们重新接绳，沿药坡扎营。灵种要等成熟，安全退路先留给后来的人。')),
      c('track', '循陌生脚印，寻找古坛的另一处入口', '用半年；失败会受伤，路线仍会留下，之后继续试炼。', '你认出阵纹下的足迹，摸到了古坛侧门，也学会辨认灵潮何时回转。', period({ months: 6, check: { base: 46, skill: 'array', scale: 0.8, items: { return_chart: 12 }, failText: '侧门的毒雾伤了你，陶宁把你背回药坡。路线保住了，伤势也要跟着后面的路。', failure: { stats: { health: -20 }, flags: { trialSideDoor: true } } }, effects: { flags: { trialSideDoor: true }, skills: { array: 8 } }, next: 'trial_chasm' }, '你与陶宁开始追踪脚印，沿石壁一段段记下看不见的门。')),
      c('race', '抢在前队之前，跨过还未稳定的风桥', '高危：失败会死亡。成功先到古坛，带出护符；用三个月。', '你们赶在风桥散去前到达古坛，取到了守阵人遗留的护符。后队的灯暂时看不见了。', period({ months: 3, check: { base: 26, skill: 'sword', scale: 0.75, stat: 'courage', statScale: 0.18, items: { ward: 16 }, failText: '风桥在脚下断开。陶宁抓住了另一侧的绳，你却落进没有出口的灵潮里。', failure: { stats: { health: -100 } }, failEnding: 'trial_lost' }, effects: { items: ['ward'], flags: { trialAhead: true } }, next: 'trial_core' }, '你们把行囊系紧，开始尝试穿过尚未稳定的风桥。')),
    ]),

  n('trial_chasm', 0, '断涧把同行的人分开了',
    '第二次灵潮回转，断涧深处的旧阵突然苏醒。陶宁跌进石缝，前队留下的宝匣也被带到对岸。外门的灯还在，古坛的门却只会再开一次。救人、取宝与继续深入，开始争用同一段时间。', [
      c('save', '先把陶宁带出来，留到下一次潮回', '用一年，花四灵石。陶宁获救并欠下长期人情，失去这次宝匣。', '你们花了一年找落脚处，陶宁走出石缝时先把姓名牌挂回引路绳。宝匣被前队带走，人留在后面的路上。', period({ requires: { peopleAlive: ['trialmate'] }, cost: { stones: 4 }, months: 12, effects: { flags: { trialDebt: true, trialBeacon: true }, people: { trialmate: { bond: 35 } }, stats: { empathy: 8 } }, next: 'trial_core' }, '你停在断涧边，开始往石缝下放绳。下一年的灵潮要用来等一个人出来。')),
      c('cache', '先取宝匣，把陶宁的位置告诉外门', '得到留声玉；陶宁暂时失踪，往后可能凭路线重逢。用半年。', '玉里保存了过涧的路线，外门却没有及时找到陶宁。你留下他最后的坐标，名单从此多了一栏“未归”。', period({ months: 6, effects: { items: ['echo_jade'], flags: { trialLeftBehind: true }, people: { trialmate: { status: 'missing' } } }, next: 'trial_core' }, '你往宝匣的方向去，把陶宁的坐标系在外门的传信绳上。援手能否赶到仍没有回音。')),
      c('retreat', '放下古坛，把陶宁救出后一起退谷', '用一年；不取核心宝物，保住同伴和已有收获。', '你们没有再去古坛，沿旧绳回到了药坡。陶宁答应把这条路记一辈子，不让下次入谷的人独自找出口。', period({ requires: { peopleAlive: ['trialmate'] }, months: 12, effects: { flags: { trialDebt: true, trialRetreated: true }, people: { trialmate: { bond: 25 } } }, next: 'trial_return' }, '你把深入的计划收起，先下石缝救陶宁，再沿来时的路撤退。')),
    ]),

  n('trial_core', 0, '古坛只在这场潮里醒来', s =>
    '你走到了古坛。石台上的护魂珠不断吸走周围灵气，门后却写着要以一名同行者换它。' + (s.flags.trialSideDoor || s.flags.trialBeacon ? '此前留下的侧门与绳结让你看出，这不是天规，是夺灵阵。' : '你没有完整退路，只知道外门的灯正在变暗。') + (s.people.trialmate.status === 'missing' ? '陶宁仍未归来，姓名牌在你衣襟里。' : '陶宁仍与你隔着石台相望。'), [
      c('unweave', '沿留下的路线拆阵，让古坛退回普通石台', '需要安全路标或侧门；用两年，确定得到定魂珠与留声玉。', '阵纹一段段松开，古坛不再要求活人。你把珠与路线带了出来，没有把同伴留成阵眼。', period({ requires: { flagsAny: ['trialBeacon', 'trialSideDoor'] }, months: 24, effects: { items: ['spirit_pearl', 'echo_jade'], skills: { array: 8 }, flags: { trialUnsealed: true } }, next: 'trial_return' }, '你依照旧路开始拆阵。外门还在等回信，这两年要让石台自己松开。')),
      c('seize', '独自穿过夺灵阵，取最深处的护魂珠', '高危：失败会死亡；用一年。成功得到珠与沉星钥，可能失去护符。', '你从夺灵阵里走了出来，护符碎在第一道门前。回风灵种认得谷里的风向，迷障散开一条窄路，你才走得进去。珠与钥在掌心，伤也留进了这一生。', period({ months: 12, check: { base: 22, skill: 'sword', scale: 0.65, realmScale: 8, flags: { trialAhead: 12 }, items: { ward: 18, echo_jade: 12, wind_seed: 12 }, failText: '你越过了最后一盏灯，却没能越过夺灵阵。护魂珠留在古坛，这一生没有再走到外门。', failure: { stats: { health: -100 } }, failEnding: 'trial_lost' }, effects: { items: ['spirit_pearl', 'moon_key'], remove: ['ward'], stats: { health: -24 }, flags: { trialSeized: true } }, next: 'trial_return' }, '你独自进入夺灵阵，把护符放在最前面。宝物与归来都还没有保证。')),
      c('leave', '不回应祭坛，把已有的东西带回外门', '用半年，保住已有收获；没有定魂珠。', '外门点名时，你报出自己的名字，也报出陶宁最后的位置。没带出的宝物留在谷里，带出的路线留给了人。', period({ months: 6, effects: { flags: { trialRetreated: true }, skills: { array: 4 } }, next: 'trial_return' }, '你转身沿旧路离开，不把同伴和姓名交给古坛。')),
    ]),

  n('trial_return', 0, '外门点名，不问你拿了几件宝物', s =>
    '试炼持续了' + Math.floor((s.month - s.life.arc.started) / 12) + '年' + ((s.month - s.life.arc.started) % 12 ? (s.month - s.life.arc.started) % 12 + '个月' : '') + '。' + (s.flags.sectLost ? '外门已不再由旧宗门值守，你沿最后的路标走向渡口，幸存者仍在点名。' : '闻竹在外门一遍遍点名。') + '陶宁' + (s.people.trialmate.status === 'missing' ? '的位置仍空着。你要如何处理带回的路线与未归者的名字？' : '站在你身旁，鞋子比出发时短了一截。你要如何处理带回的路线？'), [
      c('share', '交出路线，答应以后仍找未归的人', '留下一条长期事件线；失散者可能重逢，同伴可能日后相助。', '你把路线抄成两份，自己留着未归者的名字。出谷不一定是这段故事的结束，你把这句话留在图角。', { months: 3, effects: { flags: { trialPromise: true, cavernClue: true }, items: ['echo_jade'], stats: { empathy: 5 } } }),
      c('keep', '把路线与宝物留在自己手里', '保留个人收获与洞府线索，后续有人可能争夺。', '你把原图收进衣襟，只在点名册上留下最后见过的坐标。多年以后，仍有人会记得这幅图属于谁。', { months: 3, effects: { flags: { trialKept: true, cavernClue: true }, stats: { stones: 12 } } }),
    ]),

  n('trial_echo', 2, '当年的姓名牌回来了', s => s.people.trialmate.status === 'missing'
    ? '一名旅人带来当年入谷的姓名牌与陶宁的留言。他在闭合的侧门里活了许多年，出谷后凭你留下的坐标把信送到了异乡。那道侧门正在吞掉后来的人，他在信里问你是否还记得答应过的话。'
    : '陶宁的来信夹着你们当年的姓名牌。他已经能独自护住一队弟子，回风谷的旧阵却又困住了人。多年以前救过他的那根绳，现在轮到他决定放给谁。', [
      c('aid', '把路线与灵石寄去，让他先救人', '花十二灵石，用一年；陶宁正式归来，往后可为救援提供帮助。', '陶宁救出了一队人，也把自己最后的失踪记录补成了回信。多年以前留下的路线终于又接住了别人。', period({ cost: { stones: 12 }, months: 12, effects: s => ({ people: { ...(s.people.trialmate.status !== 'dead' ? { trialmate: { status: 'alive', location: s.player.location, bond: 30 } } : {}) }, flags: { trialAlly: true }, items: ['moon_key'], skills: { array: 6 } }) }, '你寄出图与路费，等陶宁把困在侧门的人一批批接出来。')),
      c('teach', '把办法教给当地弟子，留下可重复的救援路', '用两年，不花灵石；获得同伴承诺和沉星钥。', '路图不再只属于你与陶宁。弟子们轮流守住出口，他在最后一封信里写：这次一个名字都没少。', period({ months: 24, effects: s => ({ people: { ...(s.people.trialmate.status !== 'dead' ? { trialmate: { status: 'alive', location: s.player.location, bond: 25 } } : {}) }, flags: { trialAlly: true }, items: ['moon_key'], skills: { array: 10 } }) }, '你开始教人读懂侧门，把当年的绳结画在新的图上。')),
      c('decline', '承认这次去不了，把最后坐标交给他', '不花年月与钱；保留遗憾，这份承诺不再算作援军。', '陶宁没有责怪你。信里仍有你的名字，救援却只能由他自己继续，后来不能把这段缺席算成一份援军。', { effects: { flags: { trialAlly: false, trialEchoClosed: true }, stats: { mind: -4 } } }),
    ]),

  n('cavern_invitation', 2, '沉星洞府只容筑基的灵息',
    '异乡的守门人照着你带来的旧路线，找到了一座沉星洞府。炼气无法抵住洞中灵压，金丹会惊醒最深处的阵灵，只有筑基可入。洞府一次闭合要等许多年，你与嵇萝必须带着补给进去，再自己找回来。', [
      c('enter', '与嵇萝入洞，带足一年补给', '筑基可入；花十二灵石。开启多年探险，能获得炉心、阵钥或长期伤势。', '你们在洞外留下补给点，把最后一盏灯交给守门人。', { requires: { realm: 2, maxRealm: 2 }, cost: { stones: 12 }, months: 12, next: 'cavern_fork', immediate: { flags: { cavernStarted: true } } }),
      c('wait', '不入封闭洞府，替返回的人修器', '用两年，获得灵石与阵法经验；错过这次入洞。', '你修过许多破损的灯，听见的故事有时比带回的宝物沉重。', period({ months: 24, effects: { stats: { stones: 18 }, skills: { array: 6 }, flags: { cavernDeclined: true } } }, '你留在补给点修器，等入洞的人回来。')),
    ]),

  n('cavern_fork', 2, '三条灵脉通向不同的门',
    '洞中一年没有真正的日夜。嵇萝发现地火沿右壁流动，左侧有保存姓名的玉壁，最深处的阵心则有一颗尚未冷却的炉心。你们的补给只够先走一条路，之后也许要以带着的东西换回程。', [
      c('map', '沿玉壁记录出口，先救被困的前队', '用两年，获得沉星钥与救援经验，后续避开夺灵阵。', '你们把前队接回补给点，玉壁上多了可以绕行的出口。嵇萝将沉星钥交给你，阵心还有一条不用献人的路。', period({ months: 24, effects: { items: ['moon_key'], flags: { cavernMapped: true }, skills: { array: 10 }, people: { ally: { bond: 12 } } }, next: 'cavern_heart' }, '你们沿玉壁抄图，开始寻找前队留下的灯。')),
      c('fire', '绕到地火源，慢慢养成自己的炉心', '用四年，确定得到地火炉心；可能错过阵心宝物。', '炉心用了四年才亮起来。你们认得了火候，也把这段漫长的时光留进了归途。', period({ months: 48, effects: { items: ['ember_engine'], flags: { cavernFire: true }, skills: { alchemy: 10 } }, next: 'cavern_exit' }, '你们在地火源搭起炉台，开始以水磨功夫养一颗属于自己的炉心。')),
      c('rush', '直入阵心，把回程押在最快的一条路上', '高危：失败会死亡。成功提前到阵心，损失一件护符；用半年。', '你赶在阵门移位前到了中心，护符却被烧成灰。嵇萝追上时，你们已没有完整的原路。', period({ months: 6, check: { base: 25, skill: 'sword', scale: 0.55, realmScale: 9, items: { ward: 15, moon_key: 12 }, flags: { trialBeacon: 8 }, failText: '阵门移位，你没有赶上最后一寸开口。嵇萝被留在另一侧，只有你的灯回到了补给点。', failure: { stats: { health: -100 } }, failEnding: 'trial_lost' }, effects: { flags: { cavernRushed: true }, remove: ['ward'], stats: { health: -18 } }, next: 'cavern_heart' }, '你开始沿最短的路深入，归途只剩一个尚未验证的坐标。')),
    ]),

  n('cavern_heart', 2, '阵心里的宝物也会看人',
    '阵心的定魂珠与炉心接在同一条夺灵线上。门正在合拢，嵇萝把最后一袋补给拆成两份。取两件宝物、只取一件、或把灵线改成出口，都要真正付出时间与风险。', [
      c('open', '用沉星钥改线，让宝物与人一起出来', '需要沉星钥；用两年，确定得到定魂珠与炉心。', '你把夺灵线改成出阵的路，炉心在门外才完全亮起。被困者走过你们留下的出口，之后也有人愿意回信。', period({ requires: { items: ['moon_key'] }, months: 24, effects: { items: ['spirit_pearl', 'ember_engine'], flags: { cavernOpened: true, regionalAlly: true }, people: { ally: { bond: 15 } }, skills: { array: 8 } }, next: 'cavern_exit' }, '你把钥放进阵眼，开始慢慢改线。门与宝物要等这两年的灵潮过去才会一起松开。')),
      c('one', '只取护魂珠，用积蓄赎回归路', '花十六灵石，用一年；得到定魂珠，保住同伴。', '珠带出来了，钱留在阵中作为稳门的灵源。嵇萝与你走回补给点，没有谁必须替另一人献出寿元。', period({ cost: { stones: 16 }, months: 12, effects: { items: ['spirit_pearl'], stats: { mind: 6 } }, next: 'cavern_exit' }, '你们把灵石分散在阵线里，只带走护魂珠，开始稳住回程。')),
      c('both', '强夺珠与炉心，硬穿将合的阵门', '高危：失败会死亡；成功也会重伤并失去护符。用半年。', '两件宝物落进你的行囊，阵火却把护符烧尽。嵇萝把重伤的你拖过门口，伤要留到往后的修行里。', period({ months: 6, check: { base: 20, skill: 'sword', scale: 0.65, realmScale: 10, items: { ward: 16, echo_jade: 10 }, flags: { cavernMapped: 15 }, failText: '你拿到了珠，却被合拢的阵线留在门内。嵇萝带走你的留信，没有人能以宝物把这一次死亡换回来。', failure: { stats: { health: -100 } }, failEnding: 'trial_lost' }, effects: { items: ['spirit_pearl', 'ember_engine'], remove: ['ward'], stats: { health: -35 }, flags: { cavernScar: true } }, next: 'cavern_exit' }, '你把行囊打开，准备硬穿阵门，宝物与生死都还没有落定。')),
      c('leave', '放下阵心宝物，只带路线与同行者回去', '用半年；保住已有物品，不赌性命。', '你们带出的不是阵心，而是一条以后能来回的路。门合拢时，嵇萝仍在你身旁。', period({ months: 6, effects: { flags: { cavernRetreated: true }, people: { ally: { bond: 10 } } }, next: 'cavern_exit' }, '你不再追逐阵心，开始沿还亮着的路撤出。')),
    ]),

  n('cavern_exit', 2, '出来的人已经换过几年面孔', s =>
    '沉星洞府过去了' + Math.max(1, Math.floor((s.month - s.life.arc.started) / 12)) + '年。守门人的学徒已能独自守灯，补给点却来了索要炉心的陌生修士。他们知道你曾深入阵心，后面的争夺可能跟着你回家。', [
      c('network', '把出口交给当地人，换共同守门的承诺', '建立长期盟友；自己保留已经拿到的宝物。', '出口不再只靠你与嵇萝。当地人轮流守门，争夺者没有再得到一个能堵住所有人的阵眼。', { months: 6, effects: { flags: { cavernCommunity: true, extraAlly: true }, people: { ally: { bond: 15 } } } }),
      c('hide', '隐去行迹，把宝物留给自己的修行', '得到掩息面具；争夺者之后仍可能追来。', '你换过住处，也换过走路的时间。宝物留下了，知道其来处的人却没有全都忘记你。', { months: 6, effects: { items: ['phantom_mask'], flags: { treasureRumour: true }, stats: { mind: -3 } } }),
    ]),

  n('outer_invitation', 3, '金丹的灵息才撑得住这扇门',
    '异乡友人找到了通往裂隙域外的短暂窗口。炼气与筑基无法抵住门后的灵压，金丹以上可入。空间里有脱离此界的核心，也有以核心为食的东西；一趟进去可能要许多年，故乡与家中仍会继续变化。', [
      c('enter', '带定位之物，与嵇萝进入裂隙', '金丹以上；花十八灵石，需要阵钥、天图或界门锚。开启域外长事件。', '你们把定位物系在同一条绳上，走过一扇没有山路的门。', { requires: { realm: 3, any: [{ items: ['moon_key'] }, { items: ['sky_scroll'] }, { items: ['gate_anchor'] }] }, cost: { stones: 18 }, months: 24, next: 'outer_drift', immediate: { flags: { outerStarted: true } } }),
      c('decline', '留在门外，替失联的人等灯', '用两年，增加阵法与友人信任；不进入域外。', '你等到过很多灯，也等过几盏没有回来的灯。门外的这两年仍留下了可以用的路。', period({ months: 24, effects: { skills: { array: 8 }, people: { ally: { bond: 10 } }, flags: { outerDeclined: true } } }, '你留下稳住定位阵，开始守门。')),
    ]),

  n('outer_drift', 3, '这里的日历只能写在绳上',
    '两年里，漂流的碎陆改变过三次方向。嵇萝沿绳结记年月，前方一座残城里有修士的求救灯，也有界心的脉动。门后的大能仍在索取供奉，它不会因为你入了金丹就把路让开。', [
      c('rescue', '先接住残城的人，借他们的星图认路', '用三年，得到天图与域外盟友，之后取核心更稳妥。', '残城的人报出仍亮着的星位，给你们画出界心不被吞没的方向。以后这批名字也会沿图回来。', period({ months: 36, effects: { items: ['sky_scroll'], flags: { outerMapped: true, outerFriends: true }, people: { ally: { bond: 15 } }, skills: { array: 10 } }, next: 'outer_heart' }, '你们往求救灯走，开始把残城里的人接到稳定的碎陆上。')),
      c('beacon', '舍下界门锚，把退路固定在碎陆之间', '需要界门锚；用两年，锚实际消耗，后续有稳妥归路。', '锚留在了界海，绳结不再随碎陆漂走。你少了一件宝物，却多了一条能回来、也能接人的路。', period({ requires: { items: ['gate_anchor'] }, cost: { items: ['gate_anchor'] }, months: 24, effects: { flags: { outerBeacon: true }, skills: { array: 12 } }, next: 'outer_heart' }, '你把界门锚留下，开始给碎陆之间固定退路。')),
      c('hunt', '追界心的脉动，穿过大能留下的猎场', '高危：失败会死亡；成功先到核心，重伤并失去护符。用一年。', '你们先到了核心，猎场却把护符吞尽。大能记住了这道灵息，之后不会再把你当作过客。', period({ months: 12, check: { base: 18, skill: 'sword', scale: 0.6, realmScale: 12, items: { ward: 15, mirror_heart: 10 }, flags: { cavernMapped: 10 }, failText: '猎场切断了定位绳。你没能回到碎陆，这一生在陌生的星空下结束。', failure: { stats: { health: -100 } }, failEnding: 'void_lost' }, effects: { flags: { outerHunted: true }, remove: ['ward'], stats: { health: -28 } }, next: 'outer_heart' }, '你们开始追踪界心，穿入尚未有人画完的猎场。')),
    ]),

  n('outer_heart', 3, '一颗界心，连着两边的命',
    '界心悬在残城上方，取走它会让这片空间崩散。大能的使者要你献出同行者换通行，嵇萝把定位绳递回你手里。你可以改线、交易、冒险强夺，或空手回去，前面留下的路会决定还有多少办法。', [
      c('weave', '用星图或退路改线，让界心有另一处归宿', '需要域外星图或已固定退路；用四年，确定带出界心与被困者。', '四年里你把旧供奉阵改成了归门。界心跟着活人来到门外，两边都没有再被留作猎场。', period({ requires: { flagsAny: ['outerMapped', 'outerBeacon'] }, months: 48, effects: { items: ['mirror_heart', 'gate_anchor'], flags: { outerSaved: true, outerFriends: true }, survivors: 10, skills: { array: 12 } }, next: 'outer_return' }, '你开始把界心接到另一边，旧阵还在转，这四年要把它一点点改成出口。')),
      c('trade', '交出炉心，为残城另留灵源', '消耗地火炉心，用三年；确定得到界心，残城得以撤离。', '炉心留在残城照最后一段路，界心在你的行囊里。被接出来的人愿意替你记住这次舍下的火。', period({ cost: { items: ['ember_engine'] }, months: 36, effects: { items: ['mirror_heart'], flags: { outerSaved: true }, survivors: 6 }, next: 'outer_return' }, '你把炉心接进残城，开始让界心慢慢脱离原来的灵线。')),
      c('seize', '强夺界心，独自挡住大能的真身', '高危：失败会死亡；成功重伤并失去护符。用一年。', '真身被击退，界心落在你手里。护符烧尽，嵇萝扶你走回定位绳，重伤留在往后的年月里。', period({ months: 12, check: { base: 12, skill: 'sword', scale: 0.6, realmScale: 13, items: { ward: 15, teacher_blade: 10 }, flags: { outerMapped: 12 }, failText: '大能的真身遮住了最后一处星位。你没有再走出裂隙，界心没有因为这一生结束就回到你手中。', failure: { stats: { health: -100 } }, failEnding: 'void_lost' }, effects: { items: ['mirror_heart'], remove: ['ward'], stats: { health: -40 }, flags: { outerHunted: true } }, next: 'outer_return' }, '你迎向真身，准备把界心与归途一同夺回。')),
      c('return', '放下界心，沿原来的定位绳回去', '用两年；若没有完整退路，要舍下一件定位宝物。保住性命。', '你们沿定位绳返回，门后的核心没有跟来。为稳住最后一段路而舍下的物件，也没有自动回到行囊。', period({ months: 24, effects: s => ({ remove: s.flags.outerMapped || s.flags.outerBeacon ? [] : [has(s, 'moon_key') ? 'moon_key' : has(s, 'sky_scroll') ? 'sky_scroll' : 'gate_anchor'], flags: { outerRetreated: true } }), next: 'outer_return' }, '你们收起取核心的计划，开始沿定位绳寻找回来的门。')),
    ]),

  n('outer_return', 3, '回来以后，谁知道你的行囊', s =>
    '这趟域外之行过去了' + Math.max(1, Math.floor((s.month - s.life.arc.started) / 12)) + '年。你与嵇萝回到' + REGIONS[s.player.location].name + '，家门外已有人追问界心与炉心。以前救过的人仍会来，想要宝物的人也会来。', [
      c('share', '与各地守门人共同保管路线，公开归来者名单', '保留已有宝物，建立守门承诺；以后有人能帮你抵御追索。', '名单沿渡船传出去，归来不再是一个人藏着宝物的秘密。你把退路交给愿意回信的人。', { months: 12, effects: { flags: { outerCommunity: true, extraAlly: true }, people: { ally: { bond: 20 } } } }),
      c('hide', '隐去行迹，独自保住带回的宝物', '得到掩息面具；今后仍可能被追索或失去宝物。', '你搬进一处不起眼的屋，行囊留在床边。知道宝物来处的人仍在另一端找你。', { months: 12, effects: { items: ['phantom_mask'], flags: { treasureRumour: true, outerHidden: true } } }),
    ]),

  n('treasure_claim', 3, '宝物的来处有人追到了门口', s =>
    '索宝的人没有找错。他们循着' + (has(s, 'mirror_heart') ? '界心' : has(s, 'ember_engine') ? '地火炉心' : '沉星钥') + '的灵息到了门外，也扣住了给你送补给的船。宝物不是永远安全地待在行囊里，你要决定怎样保住人、钱与退路。', [
      c('allies', '请当年救过的人作证，共同守住补给与宝物', '需要试炼、洞府或域外的援手；用一年，保住物品。', '当年接过你绳索的人站到了门前。索宝者退走，补给船重新回航，这份回响不是临时买来的。', period({ requires: { flagsAny: ['trialAlly', 'cavernCommunity', 'outerCommunity', 'outerFriends'] }, months: 12, effects: { flags: { claimSettled: true }, skills: { array: 6 } } }, '你开始送出求援信，把宝物的来处与补给船的名字写在一起。')),
      c('give', '舍下被追索的宝物，换补给船与住处平安', '实际失去界心、炉心或沉星钥中的一件；后续对应选项会改变。', '你把那件宝物放下，等补给船的人走出门才关上阵。行囊里留下了一处空位，后面的问道与救援必须重新找办法。', { effects: s => ({ remove: [has(s, 'mirror_heart') ? 'mirror_heart' : has(s, 'ember_engine') ? 'ember_engine' : 'moon_key'], flags: { surrenderedTreasure: true, claimSettled: true }, stats: { mind: -6 } }) }),
      c('fight', '独自迎击，赌宝物与人都能留下', '高危：失败会死亡。成功也会受伤、消耗护符，住处受损。', '索宝者退走，船获救，宝物仍在你手里。护符碎了，屋外的阵台也裂开，损失并没有被胜利抹掉。', { check: { base: 22, skill: 'sword', scale: 0.65, realmScale: 10, items: { ward: 15, mirror_heart: 10 }, failText: '门外的战阵压倒了你的护身灵息。补给船沿备用路离开，你却没有再回到这间屋里。', failure: { stats: { health: -100 } }, failEnding: 'fallen' }, effects: { remove: ['ward'], stats: { health: -26 }, property: { dwelling: 'damaged' }, flags: { claimSettled: true } } }),
    ], { months: 3 }),

  n('last_vow', 5, '最后一程，你愿把这一生留给哪里',
    '很多年过去，年轻的守门人已能认出你留下的图。修为没有替你决定终点，宝物也不是只能拿去换更高的境界。你仍可以问道、守门，或将这一生交还给山风。', [
      c('dao', '携界心渡最后一次道劫，向大道问路', '需要元婴与界心。高危：失败会死亡；成功得道，这一生结束。', '你带着名字、旧伤与未改过的承诺穿过最后一道雷。大道给了回答，却没有替你重写过去。', { requires: { realm: 4, items: ['mirror_heart'] }, check: { base: 20, skill: 'array', scale: 0.4, realmScale: 10, stat: 'insight', statScale: 0.15, items: { mirror_heart: 12 }, failText: '最后一道雷没有留下归路。你没能走过道劫，这一生在门前结束，留下的图仍由后来者使用。', failure: { stats: { health: -100 } }, failEnding: 'void_lost' }, ending: 'dao' }),
      c('guard', '留下界心，接过守护诸界的职责', '需要界心或已经解除域外控制；将守门的余生写成后记，结束本次游玩。', '你把往后的岁月留给两岸。此后的故事交给来往的船与年轻的守门人，这一页记下你接过灯的时刻。', { requires: { any: [{ items: ['mirror_heart'] }, { flags: ['sealVictory'] }, { flags: ['outerSaved'] }] }, ending: 'guardian' }),
      c('rest', '安排好遗物与人，选择松下归寂', '不再继续争夺；保留已经获得与失去的一切，结束这一生。', '你把行囊交给愿意接住它的人，亲自说过每一件物品的来处。风吹过松枝时，你不再等下一封战报。', { ending: 'release' }),
      c('road', '留下地图，继续走向未知的界海', '将这段人生记为长路未尽；结束本次游玩。', '你把旧图留下一份，再一次出门。此后仍有新的路，这一页记下的是你已经走过的一生。', { ending: 'beyond' }),
    ]),
].map(node => [node.id, node]));

export const ARC_EVENTS = {
  valley: ['trial_invitation', 'trial_entry', 'trial_chasm', 'trial_core', 'trial_return'],
  cavern: ['cavern_invitation', 'cavern_fork', 'cavern_heart', 'cavern_exit'],
  outer: ['outer_invitation', 'outer_drift', 'outer_heart', 'outer_return'],
};
