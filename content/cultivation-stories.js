export {CULTIVATION_EVENTS as RULES7_CULTIVATION_EVENTS} from './cultivation-stories-v7.js';
import {installProgressionEvents} from './progression-stories.js';
import {installStoryNetwork} from './story-network.js';
import {installLifeRevision} from './cultivation-revision.js';
import {PATHS,ROOTS} from './cultivation-world.js';
import {installDecisionDetails} from './decision-details.js';
import {installAllegianceStories} from './allegiance-stories.js';
const c=(id,label,hint,reply,data={})=>({id,label,hint,reply,...data});
const n=(id,title,text,choices,data={})=>({id,act:0,title,text,choices,...data});
const pay=stones=>({cost:{stones}});
const fate=(base=48,skill='sword',failure={stats:{health:-18}})=>({check:{base,skill,scale:.5,stat:'courage',statScale:.1,failText:'事情没有按你的打算发生。你带着伤退开，留下了无法当场解决的后果。',failure}});
export const CULTIVATION_EVENTS = {
 reception:n('reception','山门外的队伍','陆行舟是接引弟子，负责带报名者测灵根。许执事登记了你的家乡和年龄。有人带着家传信物，有人只带了一包干粮。',[
  c('test','排队接受测灵根','测灵石会留下记录。','陆行舟让你把手放到测灵石上。', {next:'root_result'}),
  c('leave','先去坊市谋生','山下有人招收学徒。','你离开队伍，在坊市找到了落脚的地方。',{system:{path:'loose'}}),
  c('home','回家，再想别的出路','家人还在故乡等消息。','你把这次报名的经历告诉家人，暂时留在故乡。',{system:{path:'mortal'}}),
 ]),
 root_result:n('root_result','测灵石上的记录',s=>'许执事记下：'+s.player.root+'。'+ROOTS[s.player.root].description+' 长老培养的名额有限，执事也在招收照料药田的杂役。',[
  c('join','接受宗门的安排','按测灵记录和考核分配身份。','许执事给你安排了身份、住处和第一份任务。',{system:{admit:true},available:s=>ROOTS[s.player.root].grade>=0,reason:'测灵石尚未发现可按本宗功法修炼的灵根'}),
  c('servant','留下做杂役，寻找学习机会','杂役需要做工，不能随意使用丹房。','你领到杂役木牌，住在药田旁。修行课需要另外争取。',{system:{path:'orthodox',rank:'杂役'}}),
  c('loose','去坊市找其他功法','宗门的标准并不代表所有师承。','你向游方药师打听功法，开始自己筹钱与练习。',{system:{path:'loose'}}),
  c('dark','跟随门外的黑衣修士','他自称幽灯堂接引人，没有说明全部门规。','你随黑衣修士离开正宗山门，进入幽灯堂。',{system:{path:'demonic'}}),
 ]),
 early_demonic:n('early_demonic','收养你的幽灯堂','小时候，一名幽灯堂修士把你带离战乱。他教你读字和打坐，如今要求你在堂中登记，师兄会检查你的练习。',[
  c('stay','留在堂中学法','你认识这里的人，但门规还需自己了解。','你领到堂中的弟子牌。',{system:{path:'demonic'}}),
  c('leave','趁商队经过，离开这里','山下还有其他谋生与学法的地方。','你带着旧笔记离开，幽灯堂记下了你的去向。',{system:{path:'loose'},effects:{flags:{darkDebt:true}}}),
 ]),
 early_beast:n('early_beast','老猿教你控制妖身','出生时的异象改变了你的身体。家人把你藏在山中，老猿教你控制爪牙和气息。猎人已经发现了附近的足迹。',[
  c('stay','随老猿守住山林','同族也需要安全的栖地。','你留在山林，与同族一起修行。',{system:{path:'beast'}}),
  c('town','收敛妖气，到人类坊市生活','进城需要谨慎隐藏来历。','你披上斗篷进入坊市，仍保留妖身的能力与秘密。',{system:{path:'loose'},effects:{flags:{hiddenBeast:true}}}),
 ]),
 early_loose:n('early_loose','游方药师留下的笔记','战乱中救过你的药师准备远行。他把基础功法与药方留给你，告诉你山门正在招人，坊市也缺会认药的学徒。',[
  c('learn','在坊市接活，继续学法','先有住处和收入。','你租下小屋，照着笔记练习。',{system:{path:'loose'}}),
  c('sect','前往山门报名','报名后仍要测灵根。','你沿着商路到达山门。',{next:'reception'}),
 ]),
 first_method:n('first_method','第一次授业',s=>PATHS[s.life.cultivation.path].teacher+'检查了你的基础练习。你已经可以选择一门常练的本事，日后也能通过重心调整。',[
  c('sword','先学剑术','从站姿、身法和护身练起。','你开始每天练习剑术。',{effects:{focus:'sword'},system:{activity:'sword'}}),
  c('array','先学经书与阵法','从认字、符纹和基础术法练起。','你开始整理经书与阵法笔记。',{effects:{focus:'array'},system:{activity:'study'}}),
  c('alchemy','先学药草与丹术','从辨药和照料药田练起。','你开始每天认药与练习控火。',{effects:{focus:'alchemy'},system:{activity:'alchemy'},available:s=>s.life.cultivation.rank!=='杂役'||s.flags.learningPermit,reason:'杂役需要先通过考核获得授业许可；可以先读经或练剑'}),
 ]),
 garden_accident:n('garden_accident','丹炉的火烧到了药田','沈砚赶考核时擅自点燃丹炉，火烧掉了一片药田。许执事封存了炉火记录，严衡长老来听取证词。你知道他借火的经过。',[
  c('honest','如实说明，陪他补种','调查会核对你们的说法。','严衡确认沈砚违规用火，暂停他使用丹房一年。你自愿补种，许执事安排了六个月杂务。',{months:6,deferEffects:true,startReply:'你提交了证词，接下六个月补种任务。',effects:{people:{friend:{bond:12}},flags:{gardenHonest:true}},system:{punishment:6}}),
  c('pay','承担药苗损失，请执事安排补救','药苗有明确的购置价。','许执事登记了赔偿，沈砚仍被暂停本届考核。你们按清单补回药苗。',{...pay(12),effects:{flags:{gardenPaid:true}},system:{punishment:3}}),
  c('frame','把责任推给巡夜弟子','巡夜记录和炉火记录还在。','严衡发现两份记录与你的证词矛盾，记下虚假证词。你被安排一年杂务，沈砚也受到处分。',{effects:{flags:{falseTestimony:true},stats:{empathy:-6}},system:{punishment:12,reputation:-15}}),
  c('flee','在审理前离开山门','离宗会留下未处理的赔偿。','你带行李离开，宗门将你的木牌列入追索名册。',{system:{path:'loose',wanted:1},effects:{flags:{unpaidGarden:true}}}),
 ]),
 family_rules:n('family_rules','执事问你如何安排家中',s=>'第一次入道后，'+(s.life.cultivation.path==='demonic'?'幽灯堂要求家人不得知道据点，愿意给一笔安家钱。':s.life.cultivation.path==='orthodox'?'许执事登记探亲安排。宗门允许报平安，但不得向外人泄露内门功法。':'你发现修行可能远比家人的寿命长。家里仍需要知道你住在哪里。')+' 家人还不知道你今后多久能回去。',[
  c('keep','留下家人的地址，保持联系','通过山门或坊市转交消息。','你登记了家乡和接收消息的地点。',{system:{familyPolicy:'keep'},effects:{flags:{familyAddress:true}}}),
  c('sever','领安家费，此后减少往来','这笔钱交给家中管事。','安家费由可靠的商队带回。你请家人不要再来寻找。',{effects:{stats:{stones:8}},system:{familyPolicy:'sever'}}),
  c('secret','秘密托药商报平安','药商只能沿仍开放的路线送信。','你与药商约好中转地点，往来不进入堂中名册。',{...pay(4),system:{familyPolicy:'secret'}}),
 ]),
 family_gate:n('family_gate','接待处转来家中口信',s=>s.life.cultivation.mail.body+' '+(s.life.cultivation.mail.delayed?'这件事发生在'+s.life.cultivation.mail.sentAge+'岁那年，消息到今天才送达。':'接待者请你留下处理办法。'),[
  c('return','亲自返乡或去接待处','先沿可用路线赶回去。','你赶回接待处，核实家人的近况。',{months:12,deferEffects:true,startReply:'你收好行囊，开始赶回故乡。',system:{familyVisit:true}}),
  c('aid','托接待者安排食宿，先送路费','消息与路费仍要经过中转。','接待者用路费安排了住处，并转交你的回话。',{...pay(6),system:{familyAid:true}}),
  c('refuse','请接待者劝家人回去','他们未必理解你的处境。','接待者转告了你的决定，家人留下口信后离开。',{system:{familyRefuse:true}}),
 ]),
 family_dispute:n('family_dispute','堂亲借你的名声收租','可靠的药商送来消息：堂亲自称有你撑腰，提高了邻里租钱。家中长辈希望你写明态度。',[
  c('stop','明确制止，要求退还多收的钱','先把要求交给可信的见证人。','家中账目留下了你的要求，堂亲退回了部分租钱，也与你疏远。',{system:{familyDispute:'stop'},effects:{stats:{empathy:3}}}),
  c('take','默认做法，让他送来一份钱','邻里知道了你与此事的关系。','堂亲送来钱，邻里将这件事记在你的名下。',{effects:{stats:{stones:14,empathy:-8}},system:{familyDispute:'take',reputation:-12}}),
  c('check','托药商查账，再作决定','药商需要实际走一趟。','药商查出租钱与家中欠账，你按查明的数目处理。',{...pay(4),months:6,deferEffects:true,startReply:'药商带着你的委托回乡查账。',system:{familyDispute:'check'}}),
 ]),
 family_support:n('family_support','中转者带来家中的回话',s=>'家人通过你登记的'+(s.life.cultivation.path==='orthodox'?'山门接待处':'坊市药铺')+'送来回话。'+(s.birth.family==='clan'?'族中还能送些药草和家传修行笔记。':s.birth.family==='noble'?'家中商队可以送路费与药材。':'家里攒下一点钱和药草，愿意接济你。')+' 家中积蓄有限，东西要沿实际路线送到。',[
  c('supplies','请家里送药与路费','先告诉中转者现在的地址。','中转者把药与路费送到，你核对后回话报平安。',{months:12,deferEffects:true,startReply:'请求送回家中，药与路费还在安排。',effects:{stats:{stones:10},items:['herb_kit']},system:{familySupport:12},available:s=>s.life.family.reserve>=12&&s.life.family.members.some(p=>p.status==='alive'),reason:'家中暂时没有能提供援助的人与积蓄'}),
  c('notes','请家中熟人寄来修行笔记','笔记经过中转后才能使用。','笔记送到，你照着修正练习。',{months:12,deferEffects:true,startReply:'中转者把练习中的难题带回家中。',effects:s=>({skills:{[s.player.focus]:5}}),system:{familySupport:12},available:s=>s.birth.family==='clan'&&s.life.family.reserve>=12&&s.life.family.members.some(p=>p.status==='alive'),reason:'需有仍在世的修仙家族成员和可用积蓄'}),
  c('send','先寄钱回家，问问他们的难处','路费与生活钱交给中转者。','家人用钱修补旧屋，给晚辈留下生活费。',{cost:{stones:8},system:{familySend:true}}),
 ]),
 family_grave:n('family_grave','旧屋里的下一代','药商核实旧屋的住户后送来消息：家中晚辈正在照管旧屋，早年的信仍保存在箱里。孩子们只从大人的话里认识你，想知道还能不能见到你。',[
  c('stay','返乡认识晚辈，帮忙整理旧屋','先沿已确认的路回去，再听他们讲这些年的生活。','你与晚辈一起修屋、整理旧信，家中记住了这次归来。',{months:12,deferEffects:true,startReply:'你安排返乡，抵达后再与晚辈相处。',system:{familyVisit:true,familyRemember:true}}),
  c('legacy','托药商送去手艺与生活钱','不把修行作为他们唯一的出路。','药商交还收据，晚辈收下手艺笔记和生活钱。',{...pay(10),months:6,deferEffects:true,startReply:'药商收下生活钱与笔记，沿中转路线送回。',system:{familyRemember:true}}),
  c('leave','回话报平安，继续自己的生活','旧屋的人已经有自己的日子。','你请药商转交新的地址，暂时没有安排返乡。',{system:{familyRemember:false}}),
 ]),
 road_turn:n('road_turn','旧师承之外的功法','坊市里出现一本禁术残卷，一名异族修士也愿意交换功法。旧师承的人提醒你，改修需要重新练习，也可能引来追索。',[
  c('keep','继续原来的功法','先解决已经遇到的问题。','你留下旧功法，继续积累。'),
  c('dark','购买残卷，寻找幽灯堂','残卷不是完整传承。','你买下残卷，找到幽灯堂接引人。旧关系没有因此消失。',{...pay(8),system:{path:'demonic',wanted:1}}),
  c('loose','脱离组织，自行修行','生活和材料要自己筹措。','你整理旧账后离开，开始独自谋生。',{system:{path:'loose'}}),
  c('beast','接受异族的传承，修炼妖身','对方要求先共同照看栖地。','你接受异族功法，开始适应新的修炼方式。',{system:{path:'beast'}}),
 ]),
 world_raid:n('world_raid','战事波及了你的住处',s=>'争夺灵泉的修士攻到'+s.player.home+'附近。'+(s.life.cultivation.path==='orthodox'?'沈宗主安排守阵，许执事组织杂役撤离。':'邻近住户和同伴正在寻找安全出口。')+' 你看到护阵已有缺口，仓库里还存着物资。',[
  c('defend','协助守住撤离路','敌人的法器已经逼近。','你们守住一段出口，接走了附近的人。',{...fate(55),effects:{flags:{defendedHome:true},stats:{health:-6}},system:{reputation:10}}),
  c('escape','带行囊撤向安全城镇','舍弃仍在住处的财产。','你沿商路撤离，住处被毁，行囊中的东西仍在。',{effects:{property:{dwelling:'lost'},flags:{fledWar:true}},system:{relocate:true}}),
  c('loot','趁乱拿走仓库里的法器','仓库有人值守。','你拿走法器，守仓人记下了你的样貌。',{...fate(42),effects:{items:['ward'],stats:{stones:12,empathy:-8}},system:{wanted:2,reputation:-15}}),
 ]),
 system_warrant:n('system_warrant','巡查者找来核对旧账',s=>'巡查者带来你过去的证词和物资记录。'+(s.flags.unpaidGarden?'其中包括离宗时未处理的药田赔偿。':s.flags.falseTestimony?'其中包括被查出的虚假证词。':'曾被你拿走物资或受到伤害的人，已经留下指认。')+' 他们要求你留下说法，旧师承也会收到消息。',[
  c('settle','归还物资，配合核对','先清点能交还的物品和赔偿。','巡查者核对赔偿与责任，结束本次追索。旧关系仍需时间修复。',{cost:{stones:12},system:{settleWanted:true}}),
  c('explain','提交记录，说明实际责任','对方会核对你过去的行为。','巡查者接受了一部分说明，要求你继续处理其余责任。',{check:{base:35,skill:'array',scale:.4,failText:'记录无法解释你做过的事，原有追索仍然有效。',failure:{stats:{mind:-4}}},system:{reduceWanted:true}}),
  c('flee','离开住处，绕开追查','留下的财产无法带走。','你离开住处，追查者继续寻找你的新地址。',{effects:{property:{dwelling:'lost'}},system:{path:'loose',wanted:1}}),
 ]),
 system_pursuit:n('system_pursuit','多年后的追索者','追索者沿你留下的交易与地址找到这里。他们带来曾受害者的新证词，也有人想趁机拿走你的法器。',[
  c('pay','偿还旧账，留下见证人','由见证人登记实际交还的物资。','旧账在见证人面前结清，仍有一些人不愿原谅你。',{cost:{stones:16},system:{settleWanted:true}}),
  c('fight','出手击退追索者','对方已经准备了法器。','你击退追索者，但他们的同门也得知了战斗。',{check:{base:40,skill:'sword',scale:.45,failText:'追索者的法器击碎护身符，你没有离开这场冲突。',failure:{},failEnding:'battle_lost'},system:{wanted:1}}),
  c('leave','舍弃争议法器，重新搬走','已在手里的其余物品仍可带走。','你留下争议物，搬到新的住处。',{effects:{remove:['ward']},system:{reduceWanted:true,relocate:true}}),
 ]),
 system_final:n('system_final','这一生接下来往哪里走',s=>s.life.cultivation.path==='mortal'?'这些年，你靠自己的手艺与活计在此安顿下来。邻里来问你是否愿意带几个年轻人学本事；故乡留下的旧物，也该找个能妥善保管的人。你可以接下这份责任，或放下奔忙，安排往后的生活。':'多年的奔波暂时告一段落，眼前没有尚待赴约的差事。年轻修士来请你指点，旧住处也有人愿意照看。你可以留下传授本事，安排安静的余生；若修为足够，也可以最后一次迎向道劫。',[
  c('dao','准备渡最后的道劫','雷劫已经在远处形成。','你走过道劫，留下这一生积累的传承。',{available:s=>s.player.realm>=3,reason:'尚未具备渡道劫的修为',check:{base:42,skill:'array',scale:.35,realmScale:5,failText:'道劫击碎了护身法器，你没能走出雷云。',failure:{},failEnding:'battle_lost'},ending:'dao'}),
  c('guard','留在这里，照看后来的人','让年轻人接手能承担的事务。','你把本事交给后来的人，留下处理旧恩怨的办法。',{next:null,system:{finish:'guard'}}),
  c('quiet','交代遗物，选择安静的余生','准备好住处与遗物的去向。','你交代好遗物与牵挂，放下未尽的争夺。',{ending:'release'}),
 ]),
};

for(let tier=1;tier<=4;tier++) {
 const exam='selection_'+tier;
 CULTIVATION_EVENTS[exam]=n(exam,'这一届的考核开始报名',s=>(s.life.cultivation.path==='orthodox'?'许执事公布剑术、丹术与阵法三堂的考核。长老会核对日常练习和现场表现。':'本地修士准备切磋、辨药和阵法比试。胜出者可以与授业者交换笔记。')+' 本届报名在两年后截止，不参加也能继续自己的修行。',[
  c('sword','报名剑术比试','先准备身法与护身。','你交了报名材料。',{next:exam+'_result',system:{exam:{tier,skill:'sword'}}}),
  c('alchemy','报名丹术考核','考官要求辨药和控制炉火。','你提交了辨药记录。',{next:exam+'_result',system:{exam:{tier,skill:'alchemy'}}}),
  c('array','报名经书与阵法考核','考官会检查符纹与基础术法。','你提交了经书笔记。',{next:exam+'_result',system:{exam:{tier,skill:'array'}}}),
  c('skip','这一届先不参加','留下时间做其他事情。','执事记下你不参加本届考核。'),
 ]);
 CULTIVATION_EVENTS[exam+'_result']=n(exam+'_result','来到考核现场','报名期限到了。监考修士检查了准备记录，其他报名者也已到场。你可以展示所学，或退出这一届。',[
  c('fair','按规则完成考核','场上表现与平日准备都会被检查。','监考修士认可了你的表现，授业者给你留下进一步学习的机会。',{...fate(40,'array',{stats:{mind:-5}}),system:{examResult:true}}),
  c('cheat','偷偷使用事先藏好的符纸','监考修士会检查法力来源。','藏好的符纸被查出，你被取消本届成绩，留下处分记录。',{system:{punishment:12,reputation:-10},effects:{flags:{examCheat:true}}}),
  c('withdraw','退出本届考核','保留自己的行囊和练习记录。','你收好笔记退出，没有得到本届的奖励。'),
 ]);
 for(let attempt=0;attempt<3;attempt++) {
  const id='breakthrough_'+tier+'_'+attempt;
  CULTIVATION_EVENTS[id]=n(id,'准备突破'+['','炼气','筑基','金丹','元婴'][tier],s=>PATHS[s.life.cultivation.path].teacher+'核对了你积累的功法与修行记录。'+(tier===1?'基础引气已经能持续完成，可以尝试第一次入道。':'你已积累到这一阶段的门槛，但突破仍可能失败。')+' 这次闭关原定'+[0,1,2,3,5][tier]+'年，出关之后才能确认结果。',[
   c('try','备好材料，开始闭关','先安排收信和看护住处的人。','这一程闭关结束，你完成了境界突破。',{cost:{stones:[0,4,12,24,36][tier]},months:[0,12,24,36,60][tier],deferEffects:true,startReply:'你封好住处，开始按功法尝试突破。',effects:{realm:tier,stats:{health:8}},...(tier===1?{}:{check:{base:48,skill:'array',scale:.25,stat:'insight',statScale:.15,failText:'闭关结束，你仍未越过这一境界。你先养伤，检查功法与材料。',failure:{stats:{health:-12,mind:-6}}}}),system:{breakthrough:tier}}),
   c('wait','再准备一段时间','先养伤、学习或积攒材料。','你暂缓突破，继续准备。',{system:{retry:tier}}),
  ],{context:'retreat'});
 }
}

// Three connected stories per road. Individual scenes, choices and consequences are authored below.
export const ROAD_CHAINS = [
 {id:'sect_repair',path:'orthodox',age:20,realm:1,context:'home',stages:[
  ['护山阵的零件不见了','许执事发现阵台缺了一枚阵钉。沈砚最后检查过仓库，但巡夜记录里还有陌生人。长老请你核对记录。','查巡夜记录','先补阵钉','私藏找到的阵钉','你整理出陌生人进入仓库的时间。','你与同门修复了缺口。','仓库发现你带走了公物。'],
  ['旧阵在雨夜失灵','修好的阵台仍在雨夜漏电。闻竹发现旧图与现有阵钉不匹配，需要有人前往废弃阵室找原图。','一起查旧阵室','先报长老，留在外面','独自抢走阵室宝物','你找到了原图与被掩盖的维修记录。','长老安排另一队进去，你留下了交接记录。','你拿走器物，阵室的守卫也追了出来。'],
  ['长老核对维修账','严衡核对了阵图、仓库和证词。他请你说明这些年查到的事，许执事也在场。','交出完整记录','请沈砚一起作证','删去自己私藏的部分','长老根据记录处理了失职者，你获得新的任务资格。','沈砚讲明经过，你们共同承担该负的责任。','矛盾的账目被查出，你的任务资格受到限制。'],
 ]},
 {id:'sect_trial',path:'orthodox',age:28,realm:1,context:'valley',stages:[
  ['回风谷开放采药名额','许执事说明谷内路线：外坡采药，深谷有凶兽。陶宁负责辨药与警戒，你负责开路，补给点会等候一年。','带陶宁进谷','在外坡完成采药','偷偷沿禁路深入','你与陶宁带齐补给进入谷中。','你在外坡采药，记下深谷的入口。','你越过封条，失去了补给点的保护。'],
  ['补给路被兽群堵住','谷中兽群堵住了原路。陶宁受伤，剩下的药只能先救一个人。你找到一条绕行路，但路上有新鲜爪印。','救同伴后绕行','放下未采的药，撤回补给点','抢走同伴的药独自走','你给陶宁用药，共同寻找绕行出口。','你们舍弃未到手的药，向外撤退。','你带走药，陶宁留在了原地。'],
  ['谷外执事开始点名','你回到谷口，执事先核对人数和行囊，再听取谷内遭遇。陶宁的状态也被记入名单。','如实交代谷内经过','交药后申请再次学习','谎报采药数量','执事登记实际伤亡与收获，安排了后续照料。','药师检查了药草，给你留下进一步学习的机会。','多报的药不在行囊里，执事留下了处分。'],
 ]},
 {id:'sect_return',path:'orthodox',age:60,realm:2,context:'travel',stages:[
  ['远行途中收到山门急讯','陆行舟通过沿路宗门的传音阵通知你：敌宗切断了山下水路。许执事在转移弟子，闻竹仍在守阵。','赶回协助撤离','先请附近宗门派船','继续远行，留下回话','你收好行囊，沿尚开放的路线赶回。','附近宗门答应派船，仍需要时间抵达。','你继续远行，回话由中转阵送回。'],
  ['旧山门的阵已经破了','你来到故乡，发现旧殿受损，幸存者住在山下。许执事交给你名单，仍有人被困在敌方控制的院落。','带名单查找被困者','先安顿山下的人','投靠敌宗，换取资源','你找到被困者的位置，准备了撤离路。','你给幸存者安排了住处与药。','敌宗收下你的旧弟子牌，旧友得知了这件事。'],
  ['谁来接手新的山门','幸存者准备重建一处小山门。沈宗主让年轻弟子接手日常事务，请你决定留下什么。','留下功法与护阵','继续查找失散的人','拿走旧库，离开此地','新弟子学会了维护护阵与使用功法。','你留下寻找失散者的路线和名单。','你拿走旧库，幸存者记下了未交回的物资。'],
 ]},
 {id:'loose_contract',path:'loose',age:20,realm:0,context:'work',stages:[
  ['坊市药商招收帮手','药商请你辨药、看炉，工资按实际完成的批次结算。他愿意让你抄一份基础功法，但先要做好这批药。','按药方认真做','先查药材是否掺假','把剩余药材私下卖掉','药商核对批次，交给你工资和笔记。','你找到掺假的药，药商要求追查供货者。','药材短缺被登记，你收到了追索。'],
  ['供货商要求你闭嘴','供货商说掺假的药也能卖，让你收钱不再追问。药商还等着下一批药，坊市巡查者就在附近。','交证据给巡查者','退掉这批药，找新货源','收钱继续供货','巡查者封存了药材，要求当事人作证。','你找到新货源，损失了一部分工钱。','你收下钱，病人的投诉后来找到了你。'],
  ['药铺重新开门','药商结算了旧账，新病人开始来求药。他问你愿不愿意继续一起做，或带笔记自行生活。','留在药铺学丹术','租自己的屋，独立做工','带走店里的秘方','药商继续教你辨药与控火。','你结清旧账，租下自己的工作台。','药商发现秘方丢失，断开了与你的往来。'],
 ]},
 {id:'loose_relic',path:'loose',age:38,realm:1,context:'cavern',stages:[
  ['同行者拿来洞府旧图','嵇萝熟悉航路，她找到一张沉星洞府旧图。洞口随潮水关闭，先要核对入口、出口和补给。','共同核对后进入','只勘查洞口','隐瞒出口，独占宝物','你们核对出入口，共同进入洞府。','你在洞口记录潮汐，找到了安全的退路。','你隐瞒出口，同行者开始怀疑你的安排。'],
  ['洞府里出现另一支队伍','另一队修士也带着旧图，他们堵住药室。嵇萝担心打斗惊动守阵傀儡，墙后还有未查过的路。','协商分开搜索','沿墙后路线撤开','出手抢夺药室','双方分开搜索，留下互相识别的信号。','你们转入另一条路，舍弃药室里的东西。','你拿到药，另一队记下了你的法器。'],
  ['离开洞府后有人追来','洞口重新合拢，另一队在补给点等你。嵇萝请你把找到的东西和约定说清，先处理争执。','按约定分配收获','交出争议物，离开','卖掉争议物，换个住处','各人收下自己的东西，同行关系继续。','你交出争议物，保留已明确属于自己的物品。','你换到新住处，追索的人仍记得你。'],
 ]},
 {id:'loose_portal',path:'loose',age:70,realm:2,context:'outer',stages:[
  ['界门后的大陆发来信号','白渡维护跨界阵，他收到陌生大陆的星位。嵇萝愿意同行，但先要准备定位物和足够的回程补给。','带定位物跨界','先帮助白渡稳阵','卖掉收到的星位','你们带定位物进入另一片大陆。','你帮助白渡稳定阵法，留下以后能用的路线。','星位流入坊市，其他修士也找到了入口。'],
  ['异界凶兽毁掉落脚点','凶兽撞坏了临时阵台，补给散落在废墟里。同行者守住一道裂隙，你能先修回程阵或回收补给。','先修回程阵','回收能带走的补给','趁乱夺取凶兽幼崽','你修复了一段回程阵，让人能够退回。','你们收回部分补给，舍弃无法搬走的东西。','你带走幼崽，成年凶兽追踪到了你的气息。'],
  ['回到熟悉的坊市','你回到坊市，白渡核对了往返记录。有人要买新大陆的路线，也有人担心那里还有未撤回的人。','公开安全路线','留下私人路线继续探索','高价出售危险的假路线','往返修士能够沿已确认的路寻找同伴。','你保留路线，仍要为下一次远行准备。','有人沿假路线失踪，追责开始寻找你。'],
 ]},
 {id:'dark_ledger',path:'demonic',age:20,realm:0,context:'home',stages:[
  ['幽灯堂分配第一份差事','堂主让你看守药库。师兄说，完成差事的人可领功法，少了药却可能连累整组。账上有一笔不明去向。','查清药的去向','补足自己的账，先练功','把缺账推给新弟子','你找到师兄私取药的记录。','你完成自己的差事，暂时没有追问旧账。','新弟子受到审问，记住了你的证词。'],
  ['师兄要求你交出账册','师兄承认私取药材，让你交出记录。他愿意给你禁术残页，但堂主也正在检查药库。','把记录交给堂主','与师兄交换完整功法','偷偷复制后交出账册','堂主收下记录，重新分配药库差事。','你拿到功法，也欠下师兄的人情。','你留下副本，师兄暂时没有发现。'],
  ['新弟子来找你求助','受过审问的新弟子找你求助，师兄又让他承担缺账。堂主只愿意听有证据的话。','拿证据让他免受牵连','帮助他离开据点','让他替你继续做工','新弟子不再承担这笔缺账，与你有了新的关系。','你给他留出逃离路线，据点开始查问。','他被迫替你做工，也在寻找反抗的机会。'],
 ]},
 {id:'dark_method',path:'demonic',age:40,realm:1,context:'retreat',stages:[
  ['禁术需要新的修炼材料','残卷要求用大量精血催动。堂中药师说可以用妖兽血替代，但效果尚未证实，采集也有危险。','寻找妖兽血试炼','先研究替代药方','夺取被囚修士的精血','你开始寻找妖兽血，留下试炼记录。','你和药师整理了替代药方。','被囚者受到伤害，来寻找他们的人记下了你的身份。'],
  ['禁术反噬了经脉','试炼后经脉发痛，堂中药师检查了用药。有人建议继续加大用量，你也可以停下调养。','停下，配合药师调养','修改功法后再试','以别人的精血压住反噬','你停下禁术，按药师安排修复经脉。','你修正功法，承担再次试炼的风险。','反噬暂时缓解，受害者的关系与后果没有消失。'],
  ['堂主问你交不交功法','修改后的笔记已被堂主知道。他要求收入堂中，也允许你交代用法与限制。师兄想先拿走一份。','写明代价与限制','带笔记离开据点','隐瞒反噬，把功法卖出去','后来弟子知道了功法的限制。','你离开据点，追索者开始找你的去向。','有人按你的笔记受伤，旧账又回到你面前。'],
 ]},
 {id:'dark_pursuit',path:'demonic',age:75,realm:2,context:'travel',stages:[
  ['追捕者认出了你的木牌','外宗修士认出幽灯堂木牌，要求核对你曾经参与的事。堂中也有人要收回你的功法。','说明自己做过的事','藏起木牌，绕路离开','伏击追捕者','对方核对证据，区分了传闻与实际责任。','你绕路离开，旧身份仍可能被人认出。','追捕者受伤，他们的同门记住了你。'],
  ['旧同伴被困在据点','据点受到围攻，旧同伴通过中转药商请求帮助。你知道后院的出口，但那里有人巡查。','沿后院接人','先送药和出口图','把据点位置卖给敌人','你接出了能找到的同伴。','药与出口图送到，撤离仍要由他们自己完成。','敌人得到了位置，旧同伴知道了消息从哪里来。'],
  ['幽灯堂留下了空位','堂主离开后，据点剩下年轻弟子和未结的旧账。他们请你决定留下什么规矩。','废除牵连无关者的处罚','留下功法，自行远行','以实力夺取堂中资源','年轻弟子得到明确的门规与求助办法。','你留下功法，继续自己的路。','你取得资源，年轻弟子开始联合反抗。'],
 ]},
 {id:'beast_home',path:'beast',age:20,realm:0,context:'home',stages:[
  ['猎人进入幼兽的山谷','猎人找到幼兽的足迹，正在布网。老猿告诉你，人类村镇也遭到了野兽袭击，先查是谁越过了边界。','查清袭击与猎网','先带幼兽迁走','袭击猎人的村庄','你发现袭击者不是本族幼兽。','你带幼兽离开旧穴，保住了它们。','村镇记下袭击，更多猎人进入山林。'],
  ['山谷里的食物不够了','山谷里猎物减少，幼兽开始生病。附近药师愿意换药，但要求你不要伤害往来的村民。','与药师交换药草','去别处寻找食物','抢走药师的药箱','药师交药，与你约定了交换地点。','你找到新的食物，留下迁徙路线。','药师失去药箱，村民不再愿意靠近你。'],
  ['老猿让你安排栖地','幼兽逐渐长大，老猿让你安排新的栖地。村镇也希望知道哪些路可以通行。','划出共同认可的边界','带族群迁到深山','占领村镇附近的药田','双方记下可通行的路，冲突减少。','族群迁到深山，失去了便利的交换地点。','你得到药田，也面对村民的长期反抗。'],
 ]},
 {id:'beast_form',path:'beast',age:40,realm:1,context:'cavern',stages:[
  ['山中出现化形草','老猿找到化形草的生长地，附近守着另一族妖兽。药师愿意教你用法，但先要取得药草。','与守地族群交换','寻找其他药草','夺走守地族群的药','你交换到药草，也留下互相帮助的约定。','你找到替代药，效果仍需要试验。','你夺走药草，守地族群记下了你的气息。'],
  ['药性让你难以控制妖身','用药后你在夜里失控，族人守住了洞口。药师要求停药检查，陌生修士却要买走你剩下的药。','请药师检查','在同族照看下停药','继续大量服药','药师调整用量，你重新控制住妖身。','同族照看你度过停药时的变化。','你继续服药，留下需要长期调养的损伤。'],
  ['城门守卫检查来历','你来到人类城镇，守卫检查身份。药师认识你，同族也在城外等候。','请药师担保，按规矩进城','留在城外交换货物','伪造身份进入城镇','你以公开身份进城，留下交换记录。','你与药师在城外交换，保留了距离。','假身份被查到后，你的住处进入追查名单。'],
 ]},
 {id:'beast_war',path:'beast',age:75,realm:2,context:'valley',stages:[
  ['界门带来陌生凶兽','凶兽从裂隙出现，吞掉了族群的水源。老猿组织幼兽撤离，附近修士也受到攻击。','共同寻找凶兽弱点','先迁移幼兽与食物','引凶兽去人类村镇','双方找到了凶兽留下的伤口。','你迁移族群，失去旧栖地的一部分物资。','凶兽转向村镇，幸存者知道了你做的事。'],
  ['凶兽堵住了回程界门','它守在界门前，附近阵台已经断裂。同族和修士各有能修阵的人，但双方都担心被背叛。','共同修复出口','放弃界门，寻找陆路','趁合作时抢夺阵钥','双方修复了一段出口，开始分批撤离。','你带队改走陆路，舍弃了来不及搬走的物资。','阵钥到了你手中，双方都不再信任你。'],
  ['两族在新地方落脚','幸存者来到新的水源旁，准备划分住处。幼兽与人类孩子都需要安全的路。','共同制定往来规矩','分开生活，保留交换地点','夺取最好的水源','两族留下往来规矩和处理争执的人。','双方分开生活，仍能交换食物与药。','你占了水源，新的冲突在周围形成。'],
 ]},
];

for(const chain of ROAD_CHAINS) for(let step=0;step<chain.stages.length;step++) {
 const [title,text,a,b,d,ra,rb,rd]=chain.stages[step],id=chain.id+'_'+step;
 CULTIVATION_EVENTS[id]=n(id,title,text,[
  c('care',a,'先核对眼前的人与情况。',ra,{months:step===0?12:step===2?6:3,deferEffects:true,startReply:'你开始按选定的办法行动，结果要等这一段事情实际完成。',system:{chain:chain.id,step,conduct:'care'},...(step===1?fate(56,chain.path==='beast'?'sword':'array'):{}),effects:step===2?{stats:{stones:8,empathy:3},items:[chain.context==='outer'?'gate_anchor':chain.context==='cavern'?'moon_key':'ward']}: {}}),
  c('cautious',b,'保留退路，处理已经知道的事。',rb,{months:step===0?6:3,deferEffects:true,startReply:'你先处理已经确认的事情，保留已有物品与退路。',system:{chain:chain.id,step,conduct:'cautious'},effects:step===2?{stats:{stones:4}}:{}}),
  c('selfish',d,'其他人也会记得你做过的事。',rd,{months:3,deferEffects:true,startReply:'你开始实施自己的打算，旁人也在作出回应。',system:{chain:chain.id,step,conduct:'selfish'},...(step===1?{check:{base:40,skill:'sword',scale:.45,failText:'争夺中你没能挡住对方的攻击，没能离开这里。',failure:{},failEnding:'battle_lost'}}:{}),effects:{stats:{stones:step===2?12:3,empathy:-4}}}),
 ],{context:chain.context});
 if(step===1&&['sect_trial','loose_relic','loose_portal'].includes(chain.id)){
  const peer=chain.id==='sect_trial'?'trialmate':'ally',failure=CULTIVATION_EVENTS[id].choices[0].check;
  if(failure){failure.failText='救援途中敌人逼近，同伴没能离开。你受伤撤出，将离世地点记了下来。';failure.failure=s=>({stats:{health:-18},...(s.people[peer].status==='alive'?{people:{[peer]:{status:'dead'}}}:{})});}
 }
 if(chain.id==='loose_portal'&&step===0)CULTIVATION_EVENTS[id].choices[0].effects={items:['gate_anchor']};
}
// Existing lives retain their pending choices and action rules. New lives use
// the reviewed decisions without redrawing births or resetting random streams.
export const LEGACY_CULTIVATION_EVENTS=Object.fromEntries(Object.entries(CULTIVATION_EVENTS).map(([id,node])=>[id,{...node,choices:node.choices.map(c=>({...c}))}]));
installDecisionDetails(CULTIVATION_EVENTS,ROAD_CHAINS);
installAllegianceStories(CULTIVATION_EVENTS);

export const RULES5_CULTIVATION_EVENTS=Object.fromEntries(Object.entries(CULTIVATION_EVENTS).map(([id,n])=>[id,{...n,choices:n.choices.map(c=>({...c,system:c.system?{...c.system}:undefined}))}]));
installLifeRevision(CULTIVATION_EVENTS,ROAD_CHAINS);

export const RULES6_CULTIVATION_EVENTS=Object.fromEntries(Object.entries(CULTIVATION_EVENTS).map(([id,n])=>[id,{...n,choices:n.choices.map(c=>({...c,system:c.system?{...c.system}:undefined}))}]));
installStoryNetwork(CULTIVATION_EVENTS);
installProgressionEvents(CULTIVATION_EVENTS);
