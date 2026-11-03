import { SKILLS } from './adventure.js';
import { BIRTHPLACES, WORLD_ERAS } from './living-world.js';
import { activityContext, ordinaryLife, personHere } from '../packages/adventure/context.js';

const here = personHere;
const abroad = s => s.life.mode === 'abroad' && ordinaryLife(s);
const home = s => s.life.mode === 'home' && s.player.location === 'home' && ordinaryLife(s);
const closed = s => activityContext(s) === 'retreat';
const quiet = ordinaryLife;
const open = ordinaryLife;
const alive = (s, id) => s.people[id]?.status === 'alive';
const a = (id, title, body, when, effects = {}, data = {}) => ({ id, title, body, when, effects, kind: 'life', ...data });
const skill = s => SKILLS[s.journey?.practice || s.player.focus];

export const AUTOMATIC_EVENTS = [
  a('small_world', '世界起初只是一扇窗', s => '你在' + BIRTHPLACES[s.birth.continent].name + '的' + s.birth.address + '长大。家门外的路还很短，远处的' + BIRTHPLACES[s.birth.continent].sect + '只在大人偶尔提起时有名字。', s => s.life.mode === 'childhood', { stats: { mind: 1 } }, { once: true }),
  a('first_weather', '记住家门前的一场雨', '你最早记住的不是法术，是家里把漏下来的雨接进木盆。窗外有人踩着水回来，鞋子放在门外，饭留在灶上。', s => s.life.mode === 'childhood', { stats: { empathy: 1 } }, { once: true }),
  a('family_work', '一双手能做的事慢慢多了', s => s.birth.family === 'clan' ? '你能把灵草按火候分开了。家传符纹仍认不全，长辈却没有把未完成的笔画当作天命。' : s.birth.family === 'noble' ? '账房让你认第一张商路图，你才知道一笔进账要经过许多人的手。' : '你学会把药草晒在背风的一面，家里少了一点忙乱。村口卖药的人第一次叫你帮着算钱。', s => s.life.mode === 'childhood', { stats: { insight: 1 } }, { once: true }),
  a('first_friend', '另一个孩子记住了你的名字', '集市上有人与你交换了两块形状不同的石头。你们约好以后再见，后来才明白，许多最初的约定没有写在任何盟约里。', s => s.life.mode === 'childhood', { stats: { empathy: 2 } }, { once: true }),
  a('birth_world', '大人谈起外面的局势', s => WORLD_ERAS[s.birth.era].description + '你尚不明白这些话，只记得商旅这次回来得比往年晚。', s => s.life.mode === 'childhood', {}, { once: true, kind: 'world' }),
  a('root_seen', '灵息第一次在掌心停住', s => '家里认出了你的' + s.player.root + '。它还不能替你御剑，也不能替你长大；你开始在每次吐纳时记住自己的呼吸。', s => s.life.mode === 'childhood' && s.month >= 11 * 12, { stats: { insight: 2 } }, { once: true, kind: 'practice' }),
  a('older_hands', '家门里的活换到了你手上', '你已经能独自出门办事。旧屋的门槛仍是从前的高度，走出去时却不必再踮脚，家里的嘱托也变得更长了。', s => s.life.mode === 'childhood' && s.month >= 10 * 12, { stats: { courage: 2 } }, { once: true }),

  a('first_lesson', '夜课结束，山门还亮着灯', '闻竹教完调息便去巡阵，程照雪把新弟子的灯收好。沈砚坐在门边等你，第一回没有问谁的灵根更好，只问明早要不要一起去提水。', s => home(s) && ['master', 'sister', 'friend'].every(id => here(s, id)), { people: { friend: { bond: 2 } } }, { once: true }),
  a('breakfast', '饭有点焦，日子仍能过', '沈砚又把共灶的饭煮焦了一角。他自己留下焦饭，给你分到热的那一半，练剑的钟还没响，你们坐着多说了一会儿话。', s => open(s) && here(s, 'friend'), { stats: { mind: 2 }, people: { friend: { bond: 2 } } }),
  a('teacher_rain', '师父走过你留下的出口', '闻竹巡阵回来，特意从你标出的退路走了一遍。她没有多夸，只在次日夜课把那个出口画给所有弟子看。', s => home(s) && s.inventory.includes('return_chart') && here(s, 'master'), { skills: { array: 1 }, people: { master: { bond: 2 } } }, { once: true, kind: 'people' }),
  a('sister_practice', '今日对练，她终于没有替你挡剑', '程照雪只让了半步，你却比从前更早收住剑势。她把水放在石台上，示意明天仍来，修行在这些很小的进退之间变得真实。', s => home(s) && here(s, 'sister'), { skills: { sword: 1 }, people: { sister: { bond: 2 } } }, { kind: 'people' }),
  a('ordinary_task', '学会一件不写在剑谱里的事', s => '这几个月你照常练' + skill(s) + '，也替借住的屋修门、接水、认路。没有灵光冲天的一刻，但手上的活比以前稳了一点。', quiet, s => ({ skills: { [s.player.focus]: 0.6 }, stats: { mind: 1 } }), { kind: 'practice' }),
  a('market_herbs', '药篮里多了一份路上的药', '常来求药的山民把晒好的药草放在门口。你挑出能留在路上的一份，往后遇到伤病时，行囊里终于不只有钱。', s => home(s) && !s.inventory.includes('herb_kit'), { items: ['herb_kit'] }, { once: true, kind: 'gain' }),
  a('old_ward', '旧护符被重新描了一遍', '修器人替你描好一枚旧护符，说它能挡住一阵冲击，挡不住每一场贪心。你把它收在最容易摸到的地方。', s => open(s) && !s.inventory.includes('ward'), { items: ['ward'] }, { once: true, kind: 'gain' }),
  a('repair_roof', '漏雨时，屋檐真的有人来帮忙', '屋顶裂了一角，邻人提着木料来了。你们修到天黑，屋里的书与药没有被雨打湿，住处第一次像一段相处留下的地方。', s => open(s) && s.player.stones >= 3 && Object.values(s.life.properties).some(p => p.status === 'damaged' && p.location === s.player.location), s => ({ property: { [Object.values(s.life.properties).find(p => p.status === 'damaged' && p.location === s.player.location).id]: 'kept' }, stats: { stones: -3, mind: 3 } }), { kind: 'property' }),
  a('home_storm', '风过以后，旧屋少了半扇窗', '夜风吹坏了屋外的窗与阵台。积蓄拿去补屋，损坏记在家产册上；继续住在这里，要等真正修好之后。', s => open(s) && s.life.properties.dwelling?.status === 'kept' && s.life.properties.dwelling.location === s.player.location, { property: { dwelling: 'damaged' }, stats: { stones: -4 } }, { once: true, kind: 'loss' }),
  a('before_war', '过河的商旅比往年少了', '北面的关卡换了旗，几名商旅没有如期回来。山门仍照常开夜课，巡阵的灯却比以前多了一盏。日子继续，外面的局势也在变。', s => home(s) && s.month >= s.life.upheavalAt - 24, { flags: { tensionSeen: true } }, { once: true, kind: 'world' }),

  a('refuge_roof', '草棚里慢慢有了日常', '流亡者把篷布重新系紧，锅与药箱各有了位置。你开始记住谁怕夜风，谁能照看孩子；山门失去以后，一天仍需要认真过完。', s => open(s) && s.life.mode === 'refuge' && s.player.location === 'refuge', { stats: { mind: 2 } }, { once: true }),
  a('ferry_reply', '曾经放行的船又来了', '当年受过你帮助的船夫没有多问，把空出来的船舱留给伤员。你在水边认出那块引雨石，旧事第一次在后来的人生里有了回音。', s => open(s) && s.life.mode === 'refuge' && s.player.location === 'refuge' && s.flags.ferrymen, { stats: { stones: 4 }, survivors: 2 }, { once: true, kind: 'echo' }),
  a('missing_bowl', '空着的位置也要记下来', '点名时你仍停在失踪者的名字前。有人已经有了最后见面的地址，有人没有；没有回应不等于已经死去，也不等于回来时一定还在。', s => quiet(s) && Object.values(s.people).some(p => p.known && ['missing', 'captured'].includes(p.status)), { stats: { mind: -1 } }, { kind: 'people' }),
  a('teacher_letter', '闻竹寄来一页旧课', '信上没有催你破境，只画了一段可以绕开主阵的线。她写，外面的山很大，认清出口再进门。你把纸与旧图放在一起。', s => abroad(s) && alive(s, 'master') && s.people.master.location !== s.player.location, { skills: { array: 1 }, people: { master: { bond: 2 } } }, { once: true, kind: 'people' }),
  a('snow_letter', '师姐不再只报战况', '程照雪来信写了一段镇上的日常：一间药铺重新开门，一个失散者找到了旧友。你读到最后，才发现她又替你留了一句“若忙，就晚些回信”。', s => abroad(s) && alive(s, 'sister'), { stats: { mind: 2 }, people: { sister: { bond: 2 } } }, { kind: 'people' }),
  a('old_surname', '家里的旧姓又被人提起', '一个商旅循着旧契约找来，带回家里后来搬去的地址。你当年替家里跑过的那一年，没有在宗门劫难后失去所有意义。', s => abroad(s) && s.flags.familyContact, { stats: { stones: 6 }, flags: { familyLocated: true } }, { once: true, kind: 'echo' }),
  a('tide_work', '港口开始认得你的钟声', '海雾起时，船夫沿你留下的节奏敲钟。你不必每一回都亲自站到船头，也能在灯亮后认出今天有哪些人回来了。', s => abroad(s) && s.player.location === 'tide', { skills: { array: 0.8 }, stats: { stones: 3 } }),
  a('ember_work', '炉火从别人的屋里亮起来', '烬原的孩子学会了你教过的火候。夜里不只有自己的炉台在亮，隔街的人也能给药锅续火，你从日常里看见了留在这里的本事。', s => abroad(s) && s.player.location === 'ember', { skills: { alchemy: 0.8 }, stats: { mind: 2 } }),
  a('sky_work', '桥上的路标有人重新描过', '季风改了方向，书院弟子把旧路标挪到新桥。你写过的字被描得不一样了，船却仍照着它们找到有人等的岛。', s => abroad(s) && s.player.location === 'sky', { skills: { array: 0.8 }, people: { ally: { bond: 1 } } }),
  a('ally_night', '异乡也有人替你留晚饭', '嵇萝把门口的灯点亮，没有问这几年境界升了多少。你们谈起一条新航路，也谈起今天吃什么，修行暂时不是桌上唯一的话题。', s => open(s) && here(s, 'ally'), { stats: { mind: 3 }, people: { ally: { bond: 2 } } }, { kind: 'people' }),
  a('beast_echo', '留下的善意在夜里认出了你', '一只幼兽绕开城阵，在屋外留下温热的鳞粉。你认出当年拆笼时的气息；它没有成为可随时召来的兵器，只记得一双没有落锁的手。', s => abroad(s) && s.flags.beastMercy, { stats: { mind: 2 }, flags: { beastRemembered: true } }, { once: true, kind: 'echo' }),
  a('mirror_routes', '两岸的门第一次有了同一张时刻表', '修过的界门终于按同一套潮汐通行。船、药与回信少绕了一段路，你留下的图从个人行囊走进了许多人的生活。', s => abroad(s) && s.flags.linkedGates, { stats: { stones: 4 }, skills: { array: 1 } }, { once: true, kind: 'world' }),
  a('lost_purse', '一次盘查带走了路上的钱', '关卡临时征了通行费。你没与守卫冲突，把钱交出去才保住补给与图，少下来的灵石记在这一月的行囊账里。', s => open(s) && s.player.stones >= 10, { stats: { stones: -5 } }, { once: true, kind: 'loss' }),
  a('broken_ward', '护符挡住了坠下来的阵火', '修阵时一片残火落下，旧护符替你挡住了冲击，自己碎成了灰。你收好残片，行囊里不再有这一件护身之物，之后的冒险要重新衡量。', s => open(s) && s.inventory.includes('ward') && s.month > 28 * 12, { remove: ['ward'], stats: { health: -3 } }, { once: true, kind: 'loss' }),
  a('town_clue', '有人把沉星洞府的旧路画在了桌上', '修器的守门人认出了你讲过的阵纹，说异乡也有一座相似的封闭洞府。炼气进不去，金丹会惊醒阵灵，他把只有筑基能用的路线留给了你。', s => abroad(s) && s.player.realm === 2 && !s.flags.cavernClue, { flags: { cavernClue: true } }, { once: true, kind: 'world' }),

  a('retreat_breath', '炉火照常，灵息多稳住了一分', s => '石门里的年月仍在过去。你反复练' + skill(s) + '，把浮动的灵息一点点收住；突破尚未完成，门外的人也没有被提前写成获救。', closed, s => ({ stats: { mind: 1 }, skills: { [s.player.focus]: 0.5 } }), { kind: 'practice' }),
  a('retreat_rain', '门外传来一场隔着石壁的雨', '你听见有人把避雨的篷布系好，随后只剩雨声。药与炉火仍要照看，石门里的一年没有瞬间跳成已经完成的境界。', closed, { stats: { mind: 1 } }, { kind: 'practice' }),
  a('work_year', '工作台上的刻痕多了一道', '零件要一件件打磨，炉火要一次次停住。约好的报酬尚未到账，这一年里学会的手艺却已经落在手上。', s => ['ember_ruins', 'visit_ember', 'landing_ember'].includes(s.journey?.resolution?.event), { skills: { alchemy: 0.8 } }, { kind: 'practice' }),
  a('healing_year', '伤势开始有能忍过去的日子', '药师换了药方，夜里终于有几次不必惊醒。灵台还没完全修好，你却能把新的阵纹慢慢画完，康复在这些真实过去的年月里发生。', s => s.journey?.resolution?.event === 'golden_repair', { stats: { health: 1, mind: 1 } }, { kind: 'practice' }),

  a('valley_calendar', '谷中的日历写在绳结上', '陶宁每过一场灵潮便添一个绳结。外门的灯还在远处，药坡上的草也换过颜色，这一段试炼已经真实过去了几个月。', s => s.life.arc?.id === 'valley' && s.people.trialmate.status === 'alive', { people: { trialmate: { bond: 1 } } }, { kind: 'expedition' }),
  a('valley_trace', '风向改变，旧脚印没有白记', '夜里风桥换了方向，你依照先前记下的脚印挪开营地。没有新的宝匣弹到面前，但留下的路让这一夜有人可以安稳睡完。', s => s.life.arc?.id === 'valley' && s.flags.trialSideDoor, { skills: { array: 0.8 } }, { once: true, kind: 'expedition' }),
  a('valley_lamp', '有人沿你接好的绳走回外门', '远处的灯号短暂亮了一回。后来入谷的人沿着你接好的绳找到出口，他们还不知道你的名字，退路已经替你回答了一件事。', s => s.life.arc?.id === 'valley' && s.flags.trialBeacon, { stats: { mind: 2 }, survivors: 1 }, { once: true, kind: 'echo' }),
  a('valley_missing', '同行者的空铺没有撤掉', '你仍留着陶宁那张姓名牌。断涧暂时没有回音，夜里也没有第二个人来添绳结，留下的坐标是以后仍能寻找他的依据。', s => s.life.arc?.id === 'valley' && s.people.trialmate.status === 'missing', { stats: { mind: -1 } }, { once: true, kind: 'expedition' }),
  a('valley_supply', '药坡上的收成够多留一程', '你把成熟的药草分成两份，一份入行囊，一份留在后来的人能找到的石台上。试炼里的收获先让这个月过得下去。', s => s.life.arc?.id === 'valley', { stats: { stones: 2 }, skills: { alchemy: 0.5 } }, { kind: 'expedition' }),
  a('cavern_calendar', '没有日夜，也要知道过去了多久', '嵇萝在灯座下划出又一段月份。补给少了些，手里记下的阵纹多了些，洞府里的年月没有在下一次选择前消失。', s => s.life.arc?.id === 'cavern' && here(s, 'ally'), { people: { ally: { bond: 1 } } }, { kind: 'expedition' }),
  a('cavern_people', '曾经接出的前队送来另一盏灯', '前队修好了补给点的旧灯，把洞里认出的安全石台写在灯背。你们以后再经过这里，便不必只靠一份猜测中的地图。', s => s.life.arc?.id === 'cavern' && s.flags.cavernMapped, { skills: { array: 1 }, stats: { mind: 2 } }, { once: true, kind: 'echo' }),
  a('cavern_fire', '炉心尚未成形，火候先稳了', '你与嵇萝轮流看炉，知道哪一次要停火，哪一次要耐心等。约定的炉心尚未完成，手里的丹术却已有新的刻度。', s => s.life.arc?.id === 'cavern' && s.journey?.resolution?.choice === 'fire', { skills: { alchemy: 0.8 } }, { kind: 'practice' }),
  a('cavern_water', '洞中的水比灵光可靠', '你们找到了一处没被阵纹侵蚀的水源。灯可以少亮一点，水却不能省掉，补给点又向洞里挪进了一个能住人的位置。', s => s.life.arc?.id === 'cavern', { stats: { health: 1, mind: 1 } }, { kind: 'expedition' }),
  a('outer_calendar', '碎陆走远，绳结仍记着年月', '又一次星潮过去，残城不在昨天的方向。你与嵇萝照着绳结与星位认出彼此，域外的几年在这些很小的记号里没有丢失。', s => s.life.arc?.id === 'outer', { skills: { array: 0.6 } }, { kind: 'expedition' }),
  a('outer_saved_lamp', '残城的人替你守住另一端', '被救出的修士把求救灯改成了定位灯。你们修阵时，另一端有人按约亮灯，取核心的路开始有了活人共同守住的方向。', s => s.life.arc?.id === 'outer' && s.flags.outerFriends, { stats: { mind: 2 }, people: { ally: { bond: 1 } } }, { once: true, kind: 'echo' }),
  a('outer_anchor', '舍下的锚没有白留', '碎陆又错开了一次，留在界海的锚却稳住了定位绳。行囊里少了一件物品，门外的人也因此仍能看见你们的灯。', s => s.life.arc?.id === 'outer' && s.flags.outerBeacon, { skills: { array: 0.8 }, stats: { mind: 1 } }, { once: true, kind: 'echo' }),
  a('outer_supply', '在陌生的星空下分完最后一锅饭', '你们把补给算到下一处星位，谁也没有把同行者当成夺宝时的消耗。饭很少，能一起把它吃完仍是一件值得记下的事。', s => s.life.arc?.id === 'outer', { stats: { mind: 1 }, people: { ally: { bond: 1 } } }, { kind: 'expedition' }),

  a('new_roof', '新地方有了可以写在信里的地址', '你把屋外的牌子挂好，给旧友寄出新的地址。漂泊暂时有了一个能回来住的地方，家产册也记下了真正获得的这处住屋。', s => abroad(s) && !s.life.properties.dwelling && s.month - s.life.modeSince >= 12, { property: { dwelling: 'kept' }, stats: { mind: 3 } }, { once: true, kind: 'property' }),
  a('rebuilding_children', '后来的人把退路当成第一课', '年轻弟子沿新的路图练习出阵，先认出口，再学进门。你没有每一回都替他们决定，那些年轻的手已经能接过一段守门的年月。', s => open(s) && s.life.mode === 'settled', { stats: { mind: 2 }, skills: { array: 0.5 } }, { kind: 'people' }),
  a('old_seed', '带走的松种在另一处发芽', '那颗从旧山门带走的松种终于长到能遮住窗角。你记得它是在哪一次逃亡里收进衣襟的，树下如今却可以只谈明年的雨。', s => open(s) && s.life.mode === 'settled' && s.inventory.includes('home_seed'), { stats: { mind: 3 } }, { once: true, kind: 'echo' }),
  a('old_tools', '宝物之外，还有几件普通的旧工具', '你修好一把用过很多年的小刀，把不再需要的阵线分给年轻人。行囊里有些东西值钱，有些东西只是值得把来处说完。', s => open(s) && s.life.mode === 'settled', { stats: { stones: 2, empathy: 1 } }),
  a('survivor_reply', '曾经点过的名字又寄来近况', '旧名单上有人换了地方，有人收了学生，有人在新的药铺开门。你读过信，把还活着的人留在他们自己继续走的路上。', s => open(s) && s.life.mode === 'settled', { stats: { mind: 2 } }, { kind: 'echo' }),
];
