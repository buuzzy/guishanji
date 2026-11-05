import {PATHS,ROOTS} from './cultivation-world.js';
import {REGIONAL_METHODS} from './rules12-world.js';
export const METHODS={
 ...REGIONAL_METHODS,
 clear:{name:'清息诀',root:['水','木'],detail:'宗门的完整入门心法，先疏通经脉，再稳住周天；进境不快，少有急火。',rate:1.06},
 stone:{name:'磐石吐纳法',root:['土','金'],detail:'游方修士传下的完整基础口诀，需配合负重与调息；不靠昂贵药浴。',rate:1.05},
 ember:{name:'离火养脉篇',root:['火'],detail:'只存前半卷，借细小炉火练习收放灵力；不能照残页擅自强冲下一层。',rate:1.12},
 shade:{name:'幽灯守魂诀',root:['水','金'],detail:'幽灯堂传授的基础口诀，先守住自己的魂魄；摄取他人魂魄的章节并未授予。',rate:1.08},
 beast:{name:'山骨淬身法',root:['土','木'],detail:'老猿传授的妖身练法，以奔行、养伤与换气逐步强健筋骨。',rate:1.08},
 river:{name:'回澜经',root:['水','木'],detail:'藏经阁保存的完整两卷，兼顾调息与护脉；学习新周天需要停下旧练法。',rate:1.16},
 iron:{name:'金庭运气录',root:['金','土'],detail:'剑堂保存的两卷心法，以呼吸配合剑势，需先学会收剑而不伤经脉。',rate:1.16},
 flame:{name:'离火养脉篇·续卷',root:['火'],detail:'补全旧残卷的后半部，须辨认真假火候图，不能只看口诀文字。',rate:1.2},
};
const c=(id,label,hint,reply,data={})=>({id,label,hint,reply,...data});
const node=(id,title,text,choices,data={})=>({id,act:0,title,text,choices,...data});
const child=(mark,effects={})=>({system:{childMark:mark},effects});
export const CHILD_WINDOWS=[
 {from:6,to:9,events:['child_school','child_apothecary','child_clan','child_keeper']},
 {from:10,to:12,events:['child_friend','child_relic','child_caravan','child_secret']},
 {from:13,to:15,events:['child_recruit','child_teacher','child_family_vow']},
];
export const NETWORK_EVENTS={
 network_clan_call:node('network_clan_call','族中拿着旧举荐信来找你','族中管事将你小时候接过的举荐信交给药商。信上的承诺是照看外出的族人，如今堂兄被困在同一大陆的旧矿口。矿主指称他偷了阵石，族中却只说他领货未归，没有拿出清白证据。你可以帮忙核查，不必替未知的行为认罪。',[
  c('check','先去矿口核对领货与扣押原因','矿主有持剑护卫，求证不等于保人清白；交涉也可能遇险。','你与运料人对过封签，发现堂兄的货签曾被换过。矿主答应把争议交给坊市见证人，堂兄先离开矿口候查。',{months:6,deferEffects:true,startReply:'你沿本大陆商路去旧矿口，先找运料人核对封签，未到场前不能算救回堂兄。',check:{base:56,skill:'array',scale:.3,failText:'护卫不肯让你看货签，冲突中你受伤退到驿站。堂兄仍被扣在矿口，旧承诺没有因此兑现。',failure:{stats:{health:-12}}},system:{network:'clan_help'}}),
  c('refuse','请族中拿出证据，不独自赴矿','你不会替堂兄担未知的罪，拒绝可能损伤族中关系。','你托药商退回口信，请族中先收集领货证据。管事对你不满，暂时不再送家族抄本，矿口的旧案仍未解决。',{effects:{stats:{mind:-2}},system:{network:'clan_refuse'}}),
  c('fight','闯矿口，强行带堂兄走','矿主有人守阵，强闯可能死亡；救走也不能证明堂兄清白。','你破开矿门带出堂兄，矿主把这次袭击记入坊市告示。原来的阵石争议仍在，你又多了一笔真实冲突。',{months:3,deferEffects:true,startReply:'你带着法器向矿口赶去，准备强行救人；堂兄此时仍未脱困。',check:{base:38,skill:'sword',scale:.4,failText:'矿口护阵截住你的去路，护卫的法器击穿了护身物。你没有走出矿场。',failure:{},failEnding:'battle_lost'},system:{network:'clan_help',offense:'强闯矿场带走被扣族人，矿主与护卫留下指认'}}),
 ]),
 network_senior:node('network_senior','堂院要你接手年轻弟子','你在堂院多年，已有内门差事。老教习准备退下，宗门问你是否愿意负责一批年轻弟子的基础课。名额不多，掌事要求先收有背景的人，几名没家族的杂役只能站在院外。担任执教可以领取亲传待遇，但不是境界自动换来的身份。',[
  c('teach','接下执教，要求按基础考核收人','会得罪想插队的管事，需要一年试教；境界高不代表一定教得好。','你试教一年，教年轻弟子辨经脉、收剑势，没有让他们靠家族信物跳过基础。长老核过授业记录，授你执教弟子牌和亲传待遇，管事仍对你不满。',{months:12,deferEffects:true,startReply:'你接下一年试教，先按实际基础分课；验收前保留原内门待遇。',check:{base:50,skill:'array',scale:.35,failText:'你没能把基础讲清，几名弟子照错口诀受伤。长老终止试教，保留你的原内门差事，没有授予亲传待遇。',failure:{stats:{mind:-5}}},system:{network:'senior'}}),
  c('sell','收家族的灵石，只给他们留名额','拿钱会改变谁能入课，原来的杂役也会记得被拒的经过。','你收下家族的灵石，名额给了举荐者。院外杂役把收费经过告诉巡查者，你被停去执教资格，原职位也要重新核查。',{effects:{stats:{stones:3,empathy:-6}},system:{network:'senior_corrupt',offense:'收钱排斥杂役，授业名额被家族买下'}}),
  c('decline','继续原差事，不接执教','保留现有身份，不替管事承诺收谁为徒。','你交回试教名签，仍做原来的堂院差事。长老另找执教者，你没有因此得到亲传待遇。'),
 ]),
 child_school:node('child_school','先生只剩一个免束脩的名额','村塾先生拿着三本旧书来到你家。家里只能负担一份学费，堂亲也到了读书的年纪。先生问你，愿意来塾里认字，还是先跟家人学一门谋生手艺？',[
  c('read','去村塾读书','每天须帮先生扫院、抄书，家里的活由其他人多承担。','你每天先扫净学堂，再坐到最后一排。先生教你认契书上的字，也记住了你的名字。',child('letters',{stats:{insight:4}})),
  c('craft','跟家人学手艺','先学修桶、缝补与算账，不急着接触修士。','家人教你修好第一只漏水木桶，村里人开始把小活送到门前。',child('craft',{stats:{courage:2}})),
  c('share','让堂亲读书，晚上借他的书','白天仍要做活，堂亲愿不愿认真教你，还要相处才知道。','堂亲把当天学的字写在灶灰上，你们轮流念完再擦掉。这个共同读书的人留在了童年的记忆里。',child('shared',{stats:{empathy:3}})),
 ]),
 child_apothecary:node('child_apothecary','药铺掌柜让你辨两篮草叶','邻镇药铺招学徒，只供饭，不给工钱。游方药师余衡暂住铺后，他把两篮外形相近的草叶放在你面前：一种能止血，一种会让伤口溃烂。你还不会法术，但可以从辨药学起。',[
  c('learn','留下跟药师学辨药','家人同意后住在铺里，从认叶、洗药与包扎学起。','余衡让你先记住叶背的绒毛，每次配药都再核对一遍。你收起他写的辨药小册，尚未学到炼丹。',child('herbs',{skills:{alchemy:3}})),
  c('home','回家，先照顾病中的亲人','把会认的草叶记下来，不把它当成已学会治病。','你带回药师包好的药，请大人照方煎好。病人夜里终于睡稳，家人记住了你没有离开的这几天。',child('care',{stats:{empathy:4}})),
  c('work','只做搬货和洗药的活','先换一口饭，不能独自抓药给人。','掌柜给你搬药篮的活，余衡提醒你不懂的药不能混放。你学会核对货签和分清谁领过哪一包。',child('ledger',{stats:{insight:2}})),
 ]),
 child_clan:node('child_clan','族学分下第一批练习护符','族中长辈检查了几个孩子的调息。护符不够每人一枚，堂兄提出与你共用，管事却说优秀者可以独占。你尚未测出完整灵根，长辈只允许练最基础的呼吸。',[
  c('share','与堂兄轮流使用','练习时间会少一些，两人要遵守约好的时辰。','你们在院中轮流调息，堂兄替你守住不被打断的半个时辰。族学先生在册上记下共同练习的名字。',child('clan_ally',{stats:{empathy:3}})),
  c('study','请先生先教不用护符的办法','进境慢些，不抢其他人的名额。','先生让你先走稳步法，再逐句解释口诀。你没有多领护符，却听懂了周天从哪里起。',child('foundation',{stats:{insight:4}})),
  c('claim','争取独占护符','管事会比较练习，落选者可能记住这次争夺。','管事准你先用护符，堂兄搬到另一侧练习。你得到了资源，也第一次见到族中孩子争名额后的冷脸。',child('clan_rival',{stats:{courage:3}})),
 ]),
 child_keeper:node('child_keeper','照看者藏起了一页旧名册',s=>s.birth.upbringing==='beast'?'猎人经过洞口后，老猿把一页写着山中族名的皮册藏进石缝。你听到幼兽哭声，山外又传来人类孩子的叫喊。老猿只允许你在能看见洞口的地方活动。':'收养者把旧名册锁入柜中。你认得上面一个故乡名字，守院师兄却说不许问过去。商队次日来取货，院门只会开一小会儿。',[
  c('ask','先问照看者那个人是谁','不偷偷离开，但对方可能不愿回答。','照看者承认名册里有战乱时失散的人，只告诉你一个旧渡口的名字。你把这个地名记了下来。',child('lost_origin',{stats:{insight:2}})),
  c('friend','安慰同住的孩子','留在院内或洞中，先照顾眼前的人。','你把晚饭分给哭泣的孩子，陪他等到天亮。他记住了你，却仍不知道自己的亲人去了哪里。',child('shelter_friend',{stats:{empathy:3}})),
  c('hide','记下名字，暂不声张','保留线索，不把偷听到的事情说成已经查明。','你在破布上记下那个名字，把布缝在衣里。之后仍按照看者的安排生活，没有擅自闯出门。',child('hidden_name',{stats:{courage:2}})),
 ]),
 child_friend:node('child_friend','渡口少年被追上了','与你一起捡柴的阿宁跑进渡口，后面两个大孩子说他偷了干粮。你看过粮袋，知道那是他替病母领的赊粮。船工只看见双方争执，没有看见领粮。',[
  c('witness','带他们去粮铺核实','由掌柜说明来由，不和大孩子打架。','粮铺掌柜翻出赊账纸，船工拦住追赶者。阿宁把病母的住处告诉你，说以后有难可以来找他。',child('friend_witness',{stats:{empathy:3}})),
  c('hide','带阿宁藏进熟悉的柴棚','先躲开追赶，粮铺的事暂时无人解释。','你们藏到天黑，阿宁带粮回家。追赶者没有听到解释，渡口仍有人传他偷粮。',child('friend_hide',{stats:{courage:3}})),
  c('leave','不作证，先回家','你没有参与偷粮，也不愿卷入争执。','你从另一条路回家。第二天柴堆旁不见阿宁，邻人说他带母亲离开了渡口，你不知道后来去了哪里。',child('friend_lost')),
 ]),
 child_relic:node('child_relic','旧屋梁上落下一只铜匣','修屋时，家人从梁上取出铜匣，里面是一页看不懂的口诀和半张渡口图。修器匠说图上有早年宗门的记号，来收旧货的人却愿意用粮食换走整个匣子。',[
  c('keep','留下口诀，请识字的人解释','先辨来历，不照着陌生口诀运气。','先生只认出几个吐纳用字，劝你收好等真正的修士辨认。铜匣留在家中，你记住图上的渡口。',child('old_page')),
  c('sell','交给家人换粮','眼前能改善家中生计，旧页会随货商离开。','家人换回两袋粮，货商拿走铜匣。后来你只记得纸上的一处火候图，没有完整口诀可练。',child('sold_page',{stats:{empathy:2}})),
  c('trace','请修器匠记下宗门印记','让匠人拓印，不把铜匣交给陌生货商。','匠人留下拓印，告诉你若要追查，先找旧渡口的船户。你收好了查来源的办法。',child('relic_route',{stats:{insight:2}})),
 ]),
 child_caravan:node('child_caravan','商队经过被冲断的桥','家人带你随商队送货。暴雨冲断木桥，领队想走小路，熟悉河水的船婆却说那里上个月才发生山滑。你只是随行孩子，可以提醒大人，也可以留下照看货物。',[
  c('warn','把船婆的话告诉领队','由领队决定路线，不独自去探山路。','领队问过船婆，改在驿站住了一夜。你认出了商队的旗，船婆也记下了你的名字。',child('route_contact',{stats:{insight:2}})),
  c('guard','守住家人的货，不随人探路','先做好眼前的事，等大人带回消息。','你守着货袋，拒绝把药箱交给不认识的来客。家人回来后检查封绳，教你怎样看转交凭记。',child('ledger',{stats:{courage:2}})),
  c('return','请家人先带你回驿站','不愿冒险，货物暂时不能送到。','家人带你退回驿站，领队另找送货的人。你们失去这一趟工钱，留下了安全回去的路。',child('cautious',{stats:{mind:2}})),
 ]),
 child_secret:node('child_secret','夜里的练习传来呼救','你住的院后有人呼救，守门师兄说是新弟子练法失手。地上拖过一条血迹，隔壁孩子认出呼救者的声音。你没有能与师兄斗法的本事。',[
  c('remember','记住时间和声音，白天再问','不闯禁地，留下可以核实的线索。','你记下换岗时辰，白天问到那名弟子被转入后院。师兄没有解释伤势，那个名字没有从你记忆里消失。',child('keeper_evidence',{stats:{insight:3}})),
  c('help','请照看你的长辈去查看','你先留在安全处，不承诺长辈一定救得了人。','长辈去后院问过，叫送水弟子带药进去。你知道有人受伤，也发现这里的伤员不能自由离开。',child('keeper_care',{stats:{empathy:3}})),
  c('silent','装作睡着，先保住自己','不向守门人追问，呼救的事仍未查明。','你等血迹被洗去才出门。隔壁孩子不再谈起那一晚，你学会了有些话在守卫面前不能说。',child('keeper_fear',{stats:{mind:2}})),
 ]),
 child_recruit:node('child_recruit','接引弟子在镇口停了三天','陆行舟随商队来到镇口，公布下一次山门招募。报名要家人同意，再去山门测灵根；他不会在镇口承诺收徒。你可以先问准备办法，也可以继续眼前的学徒生活。',[
  c('ask','问清测灵与上山需要什么','留下故乡地址，准备识字与基础步法。','陆行舟给你招募日期，告诉你带干粮、身份证明和一身能走山路的衣服。他记下了这个问得仔细的孩子。',child('recruit_contact',{stats:{insight:2}})),
  c('trade','先学足能养活自己的本事','以后仍可报名，眼下先在铺里做学徒。','你跟掌柜学会核货与收账，拿到一份学徒证明。家人没有替你决定一辈子的去处。',child('trade',{stats:{courage:2}})),
  c('family','与家人商量，上山后如何联络','先说清谁代收消息，不保证能经常返乡。','家人把消息寄托给常走山路的药商，你记下他的铺名。离家还没发生，传话的办法却有了。',child('family_route',{stats:{empathy:2}})),
 ]),
 child_teacher:node('child_teacher','授业者将要离开旧住处','教你认字与调息的人准备出远门。他能留一册基础笔记，也愿意带你走一段商路，但途中不一定能找到新的住处。家人或照看者还需要知道你的安排。',[
  c('notes','留下基础笔记，继续练习','保留完整的入门口诀，不自行补写缺失章节。','授业者逐句核过笔记，圈出不能急练的部分。你留下册子，约定日后通过商队问他的去处。',child('teacher_notes',{stats:{insight:3}})),
  c('route','先了解他的行程与落脚点','出发仍需征得照看者同意，不立刻离家。','他在地图上指出两处驿站，把能认他的人名写在背面。你得到了找老师的线索，而不是保证拜入名门的信。',child('teacher_route',{stats:{courage:2}})),
  c('stay','先留下照顾家中与同住的人','不随行，但仍可保存已经学过的基础。','授业者收起多余行囊，将常用的练习页留给你。临走前，他让你把家中的事做完，再决定远行。',child('care',{stats:{empathy:3}})),
 ]),
 child_family_vow:node('child_family_vow','族中准备举荐一个孩子','族中只有一封能送到宗门的举荐信。管事愿意给你，条件是日后替家族照看外出族人；堂兄也在争这个名额，信只能帮助报名，不能替代测灵与考核。',[
  c('accept','接受举荐，答应照看族人','记下具体承诺，日后族人可能凭信来求助。','管事封好举荐信，堂兄站在院外没有进来。你得到报名引荐，也留下了照看族人的约定。',child('clan_vow')),
  c('fair','请先生按练习选人','自己也可能落选，不用私下许诺换名额。','先生安排几个孩子展示基础。管事没有当场给你信，你决定到镇口走普通报名的路。',child('foundation',{stats:{mind:2}})),
  c('decline','不接承诺，另找报名机会','家族不替你举荐，族学中学过的东西仍属于你。','你把信推回案上，管事改叫堂兄进屋。以后上山时，你要自己准备证明与盘缠。',child('independent',{stats:{courage:2}})),
 ]),
 network_echo:node('network_echo','旧渡口的名字又出现了',s=>{
  const marks=s.life.cultivation.network.marks;
  return marks.friend_witness||marks.friend_hide?'一名运药人自称阿宁，说起你们小时候领赊粮的渡口。他现在替附近药师送货，手上有一份招学徒的地址，但不清楚药师是否还缺人。':marks.old_page||marks.relic_route?'修器匠托商队送来铜匣拓印，说火候图与坊市旧书摊的一页残卷相合。他没有鉴定功法真假，只留下书摊和匠铺的位置。':'商队带来余衡的口信。他认得你小时候学药或问路的经历，愿意告诉你一处能借阅基础口诀的药铺。是否收徒，要到了再谈。';
 },[
  c('follow','先核实地址与来人的身份','沿当前大陆的商路问清，旧相识只能引荐，不能保证传承。','你核过旧地名与铺印，得到一处实际可以借阅口诀的地址。掌柜允许你先看基础页，不收拜师钱。',{system:{network:'echo'},effects:{stats:{insight:2}}}),
  c('wait','留下口信，暂时不去','旧线索会保留，眼下不打断自己的生活。','你把铺名记在旧册旁，托来人报平安。这次没有安排拜访，也没有得到新功法。'),
  c('forget','不再追寻这条旧线索','不把陌生人的口信当成必须履行的任务。','你谢过送信人，没有留下下一次见面的约定。童年的这条线索到这里暂时止住。'),
 ]),
 network_method:node('network_method','授业者先问你怎样运气',s=>PATHS[s.life.cultivation.path].teacher+'检查你绕行经脉的办法。剑术与丹术要用灵力，但先得有主修心法。'+(s.life.cultivation.path==='demonic'?'堂里只授基础守魂诀，不准偷看摄魂章节。':s.life.cultivation.path==='beast'?'老猿用自己的步法示范，要求你先养稳筋骨。':'授业者拿出两册完整基础口诀和一页离火残卷，说明残页不能当全本修炼。')+' 你的灵根是'+s.player.root+'。',[
  c('clear','学习完整的清息诀','水木灵根较易适应；其他灵根也可练，先稳住呼吸与经脉。','授业者替你纠正第一轮周天，收起演示用的护符。你照完整口诀练习，不再凭零散见闻乱运气。',{system:{method:'clear'},available:s=>!['demonic','beast'].includes(s.life.cultivation.path),reason:'当前授业者没有这部心法'}),
  c('stone','学习磐石吐纳法','土金灵根较易适应，配合步法练习，不要求买药浴。','授业者让你走稳石阶，再逐句解释换气。基础口诀留在你手里，往后要靠真实练习逐步熟悉。',{system:{method:'stone'},available:s=>!['demonic','beast'].includes(s.life.cultivation.path),reason:'当前授业者没有这部心法'}),
  c('ember','先研究离火残页','只试基础火候；后半卷缺失，到了瓶颈必须补卷或另学完整心法。','授业者标出可练的三行，划掉残页上断掉的经脉图。你从小火入手，没有凭残页去冲下一层。',{system:{method:'ember'},available:s=>!['demonic','beast'].includes(s.life.cultivation.path),reason:'当前授业者没有这页残卷'}),
  c('shade','按授业者指导练守魂诀','先守住自己的魂魄；此时没有摄取他人魂魄的许可或口诀。','授业者熄去旁边的引魂灯，叫你先练不受灯声干扰。你学的是守魂基础，堂中的深层禁术仍未开放。',{system:{method:'shade'},available:s=>s.life.cultivation.path==='demonic',reason:'只有幽灯堂授业者持有这部口诀'}),
  c('beast','随老猿练山骨淬身法','先学换气与护住旧伤，不凭一场药浴改变身体。','老猿带你走过碎石坡，每停一次便检查呼吸。你开始照完整的淬身办法练习，受伤时必须停下养护。',{system:{method:'beast'},available:s=>s.life.cultivation.path==='beast',reason:'需要妖族授业者指导'}),
 ]),
 network_bottleneck:node('network_bottleneck','周天走到缺页的地方','你按离火残页练了多年，灵力每次走到肩背便失去后续口诀。强行照自己的猜测运气，胸口已经发痛。授业者指出：不是再加一把火就能解决，必须停下缺页部分。',[
  c('seek','停练缺页部分，托书商寻续卷','保留已有基础，寻找需要时间，也可能只找到假卷。','你标出断页位置交给书商，暂时只练已核过的基础。书商答应有同样火候图时再通知。',{system:{network:'seek_volume'}}),
  c('replace','请授业者改教完整的磐石法','换练法要花一年重新理顺周天，原来的境界不会消失。','授业者先封住旧火路，让你按完整吐纳重新练习。十二个月后，胸口运气不再卡在断页处。',{months:12,deferEffects:true,startReply:'你停止残页上的急火，随授业者重新辨认周天。一年练习完成前，不会得到新心法的熟练收益。',system:{method:'stone'}}),
  c('force','强行贯通缺失的经脉','你没有后续口诀，强运火路可能伤重或死亡。','你压住火路继续运气，险险稳住了灵力；缺失的口诀仍未补全。',{check:{base:32,skill:'alchemy',scale:.3,failText:'灵火沿错误经脉反噬，护脉之物也没能救回你。',failure:{},failEnding:'battle_lost'},effects:{stats:{health:-15}},system:{network:'force_volume'}}),
 ]),
 network_archive:node('network_archive','藏经阁门前留了你的名字',s=>s.life.cultivation.network.offer?.reason+' 藏经阁管事给你一次入阁阅卷的机会，须在两年内到场，只能选一部带出抄本，不能带走原卷。外面有人高价收买内门抄本，管事提醒你宗门会核对借阅印。',[
  c('river','选回澜经，请管事核过抄本','完整两卷，适合水木灵根；需一年改练周天，不能立刻叠加两部心法。','管事逐页核对抄本，盖上借阅印。你用一年改练周天，回澜经成为当前主修，旧心法仍留在记录中。',{months:12,deferEffects:true,startReply:'你选定回澜经，留在阅卷院辨认周天；完成一年练习后才正式改用新心法。',system:{method:'river',network:'archive'}}),
  c('iron','选金庭运气录，随剑堂重练','完整两卷，适合金土灵根；需一年练习收势与运气。','剑堂教习核过抄本，陪你重新练习收剑与换气。一年后，你把新的完整心法接进日常修行。',{months:12,deferEffects:true,startReply:'你取金庭运气录，开始一年基础重练；学会前仍按旧有积累生活。',system:{method:'iron',network:'archive'}}),
  c('decline','谢过管事，不进阁选卷','交回入阁签，继续现有练法；这轮阅卷名额不再为你保留。','你把入阁签交回管事，继续已有练法。藏经阁没有替你保留下一轮名额。',{system:{network:'decline'}}),
 ]),
 network_mentor:node('network_mentor','长老要你先跟炉三年',s=>s.life.cultivation.network.offer?.reason+' 丹堂顾长老缺一名跟炉弟子，愿意让你旁观控火，三年后再决定是否收徒。'+(s.life.cultivation.network.offer?.danger?'前任的铺位空着，领料册却仍每月写他的名字；送水弟子说夜间炉房会锁门，长老不许他们谈前任。':'前任已经转去药院，教习能指出他的住处；你可以先问过往跟炉的人。')+' 跟炉不是立即升为亲传。',[
  c('accept','先见前任与送水弟子，再试跟炉','核对能问到的人；一旦接受，须承担三年差事，炉火失控可能伤人。','你问过送水弟子，留下夜间换岗的记录，然后接下跟炉差事。顾长老仍没有承诺正式收徒。',{system:{network:'mentor'},months:6,deferEffects:true,startReply:'你先核对前任与换岗，再进入丹堂。半年熟悉炉房后，才开始承担后续差事。'}),
  c('outside','只在外院辨药，不进夜炉','拒绝三年跟炉，争取普通药院的活；身份仍按原弟子牌。','顾长老收回跟炉名签，让你留在外院辨药。你没有进入锁门的夜炉，也没有得到收徒承诺。',{system:{network:'decline'},effects:{skills:{alchemy:2}}}),
  c('decline','不接这次邀请','保留当前身份和练法，长老另找跟炉弟子。','你交回名签，顾长老叫下一名弟子进门。这次邀请到此结束。',{system:{network:'decline'}}),
 ]),
 network_mentor_result:node('network_mentor_result','夜炉最后一批材料',s=>s.life.cultivation.network.arc?.danger?'三年差事将满，顾长老让你独自守夜炉。送水弟子塞来前任的残牌：所谓养炉，是把弟子的灵力抽进炉心，前任没能走出门。长老已锁住正门，侧廊的换岗声刚响。':'三年里你看过开炉、收丹与失火补救。顾长老让你独立辨最后一批药材，称合格后可以留在丹堂做内门弟子。前任来院中帮忙，但不能替你完成考核。',[
  c('finish','按核过的办法完成最后一炉','若有人要把你留在封闭炉心，先停火拒绝入阵；普通考核也可能失手。','你依照核过的药性收住炉火，顾长老认可你的三年跟炉，给你丹堂内门弟子牌。',{available:s=>!s.life.cultivation.network.arc?.danger,reason:'炉心正在抽取弟子灵力，不能把它当普通考核',check:{base:48,skill:'alchemy',scale:.4,failText:'最后一炉混入了寒砂，你没能交出合格药丹。顾长老结束这次跟炉，没有收你入内门。',failure:{stats:{mind:-4}}},system:{network:'mentor_finish'}}),
  c('escape','借换岗从侧廊离开，带走残牌','有人看守侧廊；丢下差事可能受追问，成功后仍要找地方藏身。','你沿熟悉的侧廊带走前任残牌，没有进抽灵的炉心。坊市巡守接过证物，允许你暂住药铺；你已不能回原丹堂领月例。',{available:s=>!!s.life.cultivation.network.arc?.danger,reason:'眼下没有抽灵陷阱或被锁住的出口',check:{base:62,skill:'array',scale:.3,failText:'守卫在侧廊截住你，你负伤逃到外院，旧残牌留在炉房，未能揭开前任的去向。',failure:{stats:{health:-20}}},system:{network:'mentor_escape'}}),
  c('submit','相信长老，留在炉心运气','炉心有抽灵迹象，继续服从可能被炼化。','你在炉心撑到换岗，付出大量体力后被抬到外院；长老没有因此收你为徒。',{available:s=>!!s.life.cultivation.network.arc?.danger,reason:'普通考核不需要进入抽灵炉心',check:{base:18,skill:'alchemy',scale:.2,failText:'炉火把你的灵力抽尽，顾长老封住炉盖。你没有等到收徒的那一天。',failure:{},failEnding:'battle_lost'},effects:{stats:{health:-35}},system:{network:'mentor_end'}}),
  c('leave','放弃最后考核，退回原院','不争取内门名额；若炉房被锁，需改选侧廊逃离。','你交回跟炉名签，退回原来的院落。三年的见闻仍在，内门名额给了另一名弟子。',{available:s=>!s.life.cultivation.network.arc?.danger,reason:'正门已锁，必须先找到实际出口',system:{network:'mentor_end'}}),
 ]),
 network_ward:node('network_ward','巡阵堂缺一个掌钥的人',s=>s.life.cultivation.network.offer?.reason+' 巡阵堂要选一名试任弟子，守北坡阵眼两年。上一任掌钥人因私卖阵石被撤职，仓里还有几笔未查清的旧账；接差事能学阵法，也会让你接触旧案。',[
  c('accept','先封存旧账，再接试任钥匙','把接手前的欠账分清；两年里要在北坡当值，不能自由安排日常。','你与管事共同封好旧账，只签接手后的领料。北坡钥匙交到你手里，你成为试任巡阵弟子。',{months:3,deferEffects:true,startReply:'你先用三个月核对阵石与钥匙，再接北坡试任差事。',system:{network:'ward'}}),
  c('decline','只交出调查记录，不接职位','你不是旧账责任人，拒绝不会自动背上欠款。','管事收下记录，另找掌钥人。你保留原身份，没有签下未查清的旧账。',{system:{network:'decline'}}),
  c('take','不核旧账，先领钥匙和材料','接手册上还有缺数，日后可能分不清损失发生在哪一任。','你未核旧账便签名，接下北坡钥匙。旧册上的缺数也跟着你进了阵室。',{system:{network:'ward_rash'},effects:{stats:{stones:1}}}),
 ]),
 network_ward_result:node('network_ward_result','阵石短缺在换岗前暴露',s=>s.life.cultivation.network.arc?.rash?'换岗前，巡查者发现仓中阵石少了一箱。你的签名在接手册上，却没有封存旧账。上一任掌钥人的师兄声称全是你任内丢失，要求你带着缺数去执法堂。':'你封存的旧账证明缺失发生在接手之前。上一任的师兄提出私了，愿意给灵石换走原册。管事就在外院，巡查者也快到北坡。',[
  c('evidence','请管事当面对照旧账与领料','拿出真实记录，不能保证能查清未封存的旧账。','管事核对封条与领料时辰，确认你任内账物相符。巡阵堂准你正式掌钥，给你内门巡阵弟子的身份。',{available:s=>!s.life.cultivation.network.arc?.rash,reason:'你接手时没有封存旧账，不能凭空拿出封条',system:{network:'ward_finish'}}),
  c('investigate','请运料弟子作证，重新核查','可能查不清旧损失，调查期间暂停试任，不等于已经认罪。','运料弟子说明旧箱早已缺封，管事暂时收回钥匙，派人追查前任。你未被定罪，但没有获得正式掌钥职位。',{system:{network:'ward_end'}}),
  c('sell','收钱交出旧册，把短缺推给同门','对方是在买证据，销毁记录会让你成为掩盖旧案的人。','你交出旧册，收了私了钱。巡查者问到运料弟子，发现旧册被私卖，执法堂以毁证将你押入思过洞。',{effects:{stats:{stones:2,empathy:-5}},system:{network:'ward_end',punishment:12,confinement:true,offense:'私卖巡阵旧账以掩盖阵石失窃'}}),
 ]),
 network_volume:node('network_volume','书商找到两份不同的续卷','书商拿来两份离火续卷，火候图只有一份与旧页相接。卖家只让当场验图，一枚灵石买抄本；药师愿意先看断页，但要你留下册子一个月。购买不是拜入魔道，也不保证真假。',[
  c('verify','请药师验过接图，再购买','支付一枚灵石，一个月验图后才决定能否照卷重练。','药师核对经脉接图，剔去假卷。你买到真正的后半卷，用一年重新理顺火路，离火残篇终于补全。',{cost:{stones:1},months:13,deferEffects:true,startReply:'你把旧页与候选续卷交给药师，先验一个月，再用一年重练；此时还不能算已补全心法。',system:{method:'flame',network:'volume'}}),
  c('replace','不买陌生续卷，改练完整磐石法','需要一年重练，不因拒买而成为任何宗门的敌人。','你谢过书商，改练完整吐纳。一年后，残页只作为辨火笔记保存，不再承担主修周天。',{months:12,deferEffects:true,startReply:'你开始一年完整吐纳练习，停下残页中缺失的火路。',system:{method:'stone',network:'volume'}}),
  c('decline','暂不购买，保留已经练稳的基础','缺页瓶颈仍在，不会因为拒绝而自动补全。','书商收起续卷，你继续只练已核过的基础火路，瓶颈尚未解决。',{system:{network:'decline'}}),
 ]),
};
export function installStoryNetwork(events){
 Object.assign(events,NETWORK_EVENTS);
 const garden=events.garden_accident;
 garden.text='沈砚为了赶丹堂考核，擅自借用炉房，火星沿废药槽烧到药田。你在院外见过他进炉房，并没有参与点火或借钥匙。许执事封存了领料册，严衡长老请你作为目击者说明经过。沈砚在门外求你别把擅借炉房的事说出来。';
 garden.choices[0]=c('honest','如实作证，不替沈砚担责','你是目击者。说明亲眼所见，补种与赔偿由调查确认的责任人承担。','严衡核过领料册，责令沈砚补种、停用丹房一年。你只签下目击证词，没有被罚做工；沈砚看了你一眼，独自领走补种的木牌。',{effects:{flags:{gardenHonest:true},people:{friend:{bond:-4}}},system:{reputation:3}});
 garden.choices[1]=c('pay','自愿出三枚灵石帮他补药苗','这是帮朋友赔偿，不是认领点火责任；沈砚仍要受处分。','你交出三枚灵石用于购苗。严衡仍罚沈砚停用丹房，许执事给你一张自愿出资的凭记，没有把损失全记在你名下。',{cost:{stones:3},effects:{flags:{gardenPaid:true},people:{friend:{bond:8}}}});
 garden.choices[2].hint='领料册能核对。明知点火者是谁却诬陷巡夜弟子，会因虚假证词受罚。';
 garden.choices[3]=c('silent','不作证，请执事自行核查','不替任何人编造说法；执事仍可依据领料册调查，不会凭此给你挂赔偿。','你没有签证词。许执事转去核对领料与炉房钥匙，沈砚的违规仍被查出；巡夜弟子没有替他承担损失。');
 events.reception.text=s=>'陆行舟带新来的少年走过镇口山阶，许执事在测灵石旁核对家乡证明。'+(s.life.cultivation.network.marks.recruit_contact?'陆行舟认出你是镇口问过招募的孩子，先替你检查证明，但没有承诺收徒。':s.life.cultivation.network.marks.clan_vow?'你的家族举荐信让执事愿意核对来历，测灵与名额仍要依宗门规矩。':'有人持家传信物，有人只有干粮，进山前都要先测灵。');
 events.root_result.choices[0].reply=s=>'许执事核过测灵记录，发给你'+(ROOTS[s.player.root].grade===0?'杂役':'外门')+'弟子牌，指出住处和第一份差事。灵根优异者被列入长老观察名单，还须实际授业才能成为亲传。';
 Object.assign(events.family_rules.choices.find(o=>o.id==='sever'),{label:'请山门代送安家费，减少往来',hint:'山门出两枚灵石，商队六个月后交给家人；你不领取这笔钱。',months:6,deferEffects:true,startReply:'你留下家人能核实的地址，请商队代送安家费。交付前，家中尚未得到这笔钱。',reply:'商队带回转交凭记，家人收下山门的两枚安家费。你请他们减少进山寻人，仍没有抹去共同生活过的过去。'});
 events.family_dispute.text=s=>'药商带来故乡的租契与邻人证词：堂亲打着你的名号强收'+(s.birth.family==='clan'?'灵田租石':'粮钱')+'。你没有授权他收租，亲人请你说明态度。'+(s.birth.family==='clan'?'族中修士也在看你会不会给堂亲撑腰。':'凡人的粮钱不能当作修炼灵石，邻人担心你用法术替堂亲撑腰。');
 for(const o of events.family_dispute.choices){
  o.months=6;o.deferEffects=true;o.startReply='你将'+o.label+'的要求写给药商，附上已经核实的租契。药商沿商路转交，未到故乡前不能算事情已办妥。';
 }
 events.family_dispute.choices.find(o=>o.id==='take').effects=s=>({stats:{stones:s.birth.family==='clan'?2:0,empathy:-6}});
 events.family_dispute.choices.find(o=>o.id==='take').reply=s=>s.birth.family==='clan'?'堂亲送来两枚从灵田多收的租石。邻人保留你的回信，族中有人知道你同意过这次强收。':'堂亲把多收的粮钱留下供家中使用。你没有收到修炼灵石，邻人却拿着回信记住了你的纵容。';
 for(let tier=1;tier<=4;tier++)for(const o of events['selection_'+tier].choices){
  if(['sword','alchemy','array'].includes(o.id))o.reply=({sword:'剑堂教习核过弟子牌，让你在报名卷轴上落名。卷面亮起黄光，名签收入试剑台；传音告知两年后应试，期间可在西院练身法。',alchemy:'丹堂教习接过辨药册，核对署名后在报名卷轴上加盖炉印。你收到传音：两年后到丹院辨药、控火，考场不准带预配药散。',array:'经堂教习看过你的基础笔记，让你在卷轴上写下名字。阵纹亮起后，名签留在经堂；两年后须现场找错纹，不能带预制符纸。'})[o.id];
 }
 const family=events.family_support;
 family.title='家书里夹着一件旧物';
 family.text=s=>{
  const member=s.life.family.members.find(p=>p.status==='alive');
  return member.name+'托熟悉的药商转来家书。'+(s.birth.family==='clan'?'信里夹着族学旧页，管事说若你仍缺基础，可以出三枚灵石誊抄家传笔记；家族也希望你告诉他们是否愿意照看外出的晚辈。':s.birth.family==='noble'?'家中商队捎来旧行商旗，愿意介绍当前大陆的可靠驿站。信里说家中生意收缩，晚辈正商量怎样养活一家，不知道你的近况。':'包裹里只有家人补过的旧衣，信里问你是否吃得惯山上的饭。屋顶漏雨、亲人年老，他们没有供修炼用的灵石，却仍想知道你有没有安稳住处。')+' 药商核过你的现居地址，先送来消息；需要运送的钱与抄本另走实际商路。';
 };
 family.choices=family.choices.filter(o=>o.id!=='supplies');
 const notes=family.choices.find(o=>o.id==='notes');
 Object.assign(notes,{label:'请族中誊抄家传基础笔记',hint:'仅修仙世家有这份传承；家中出三枚灵石，抄本到达后可核对基础，不是高阶功法。',available:s=>s.birth.family==='clan'&&s.player.realm<=1&&s.life.family.reserve>=3&&s.life.family.members.some(p=>p.status==='alive'),reason:'需修仙世家在世亲人、三枚家中灵石，且你仍处于基础修炼阶段',effects:{stats:{insight:3}},months:12,startReply:'你托药商回话，请族中先誊抄基础页，再沿商路转送。一年内尚不能算已读到抄本。',reply:'药商带来族中核过的抄本。你照着修正两处基础运气，发现这份笔记能补启蒙，却不能代替高阶心法。'});
 family.choices.find(o=>o.id==='send').label='送三枚灵石回家，问清眼前的难处';
 family.choices.find(o=>o.id==='send').reply=s=>s.birth.family==='clan'?'族中来人交还三枚灵石的收讫凭记，管事将钱用于晚辈的基础药材。你已给过这一次帮助，仍没有答应替家族承担所有修行开销。':'药商带回家人收钱的消息，按坊市的兑价替他们换成粮钱。亲人先修漏雨的屋顶，留下余钱给晚辈谋生；一次寄钱没有永远解决家中生计。';
 const peace=family.choices.find(o=>o.id==='peace');peace.hint='托药商交代现居处与生活，暂不送财物，也不向凡人家中索取修炼资源。';
 for(const skill of ['sword','array','alchemy'])events.first_method.choices.find(o=>o.id===skill).reply=({sword:'教习先让你握木剑，练站姿和收势，不准对同门催动剑气。你每天到院中练基本身法，心法须另向授业者学。',array:'授业者将一枚错画的符纹放到石桌上，逐笔教你辨认经脉与阵路。你开始抄读基础经书，尚不会凭纸上符纹布大阵。',alchemy:'药师将两味相似草叶分开，指明一味止血、一味伤脉。你先学辨药和小火，正式炼丹还要懂运气与炉房规矩。'})[skill];
 events.sect_repair_2.choices[0].reply='严衡把原册与钥匙簿摆到失职弟子面前，查明阵石被私卖的经过。处分由执法堂执行。长老记下你的证词，若巡阵堂或藏经阁愿意给机会，须另送来具体名签；眼下没有凭空多出职位。';
}
