import {ROOTS} from './cultivation-world.js';
import {REGIONAL_METHODS} from './rules12-world.js';
import {canCultivate,route} from '../packages/adventure/story-rules10.js';
import {rules12,sectProfile,returnMonths12,stage12,homeReceiver12,department12,DEPARTMENTS} from '../packages/adventure/story-rules12.js';
import {NETWORK_EVENTS} from './story-network.js';
const c=s=>s.life.cultivation;
const v=(x,s)=>typeof x==='function'?x(s):x;
const choice=(id,label,hint,reply,extra={})=>({id,label,hint,reply,...extra});
const node=(id,title,text,choices)=>({id,title,text,choices,act:0,cultivationOnly:true});
const long=(months,startReply,extra={})=>({months,deferEffects:true,startReply,...extra});
const feud=s=>c(s).story10.facts.feud||{};
const trial=s=>rules12(s).facts.trial||{};
export function installRules12(events){
 events.r12_child_body=node('r12_child_body','家人请先生看看你的身体',s=>rules12(s).body.type==='frail'?'你比同龄孩子容易疲倦，跑一会儿就要坐下喘气。家人请来行医先生，问你平日最难受的时候，也商量以后学什么。':rules12(s).body.type==='mighty'?'你把大人才能提起的水桶搬到了门边，家人又惊又怕。行医先生摸过你的筋骨，说先学会收住力气，不要拿别的孩子试手。':'你已能跟家人走到集市，先生看过身体，没有发现严重病症。家人商量让你学一点本事，先从自己能做的事开始。',[
  choice('learn','跟先生学认药','先生愿教你辨认村里的常见药草。','你认清止血草和毒草，把最容易混淆的两片叶子夹进旧书。',{system:{body12:'learn'},effects:{skills:{alchemy:2}}}),
  choice('practice','跟家人练身体','不硬撑，先练搬物与走路。','家人教你怎样搬东西不伤腰，累时就在树荫下休息。',{system:{body12:'practice'},effects:{stats:{health:3,courage:2}}}),
 ]);
 events.r12_child_fever=node('r12_child_fever','高热退不下去','你烧得认不清屋里的人，母亲守了一夜，普通草药也没退热。村里的先生愿再开药，路过的仙长则要把你带到山中查看经脉。',[
  choice('medicine','留在家中，请先生治病','家人凑诊钱，先生不能保证退热。','热终于退了，你还很虚弱。家人按先生的嘱咐喂药，让你慢慢恢复。',{...long(3,'家人请先生守在床边，先用药试着退热。'),check:{base:75,stat:'health',statScale:.1,failText:'热病反复，药没能留住你。家人一直守在床边，这一生停在了童年。',failure:{},failEnding:'childhood_illness'},system:{body12:'healer'},effects:{stats:{health:15}}}),
  choice('immortal','随仙长去山中诊治','仙长愿治病，尚未答应收徒。','仙长疏开了堵塞的经脉，让家人接你回去养病。他留下复诊地址，没有把治病当作入宗承诺。',{...long(6,'家人抱着你随仙长上山，夜里在山门外等诊。'),check:{base:80,stat:'health',statScale:.05,failText:'病已经伤到心脉，仙长也没能救回你。家人带着你的旧衣下山。',failure:{},failEnding:'childhood_illness'},system:{body12:'immortal'},effects:{stats:{health:20}}}),
  choice('rest','留在家中，用现有药慢慢养','病可能恶化，家里还要继续照料你。','高热渐渐消退，长时间卧床却让身体弱了许多。你从走到院门开始重新学着活动。',{...long(8,'家人留下现有的药，轮流守着你。'),check:{base:62,stat:'health',statScale:.1,failText:'病情在夜里突然恶化，家人来不及再求医。你没能度过这次高热。',failure:{},failEnding:'childhood_illness'},system:{body12:'rest'},effects:{stats:{health:8}}}),
 ]);
 events.network_method.text=s=>c(s).path==='orthodox'?'教习在'+sectProfile(s).name+'的小院里展开入门卷，示范当地的行气法。'+sectProfile(s).style+'。你可以跟着练，也可以继续已有功法。':c(s).path==='demonic'?'幽灯堂授业者展开守魂口诀，让你先稳住自己的气息。更深的禁术仍锁在堂中，不在这次授业里。':c(s).path==='beast'?'老猿在石壁前示范换气与淬身，先叫你练筋骨，再试引气。来往修士的口诀与这副身体并不完全相同。':'药师给你看两份完整的基础口诀，愿先带你走过最慢的一段周天。没有授业者解释的残页，他不让你急着练。';
 events.network_method.choices=[
  ...['mountain','frost','cinder','wind'].map(id=>choice(id,'跟教习学'+REGIONAL_METHODS[id].name,REGIONAL_METHODS[id].detail,'教习先纠正你呼吸的停顿，再让你沿卷首的经脉图缓缓引气。',{visible:s=>c(s).path==='orthodox'&&sectProfile(s).base===id,requires:{spirit:true},system:{method:id}})),
  choice('clear','学清息诀','药师会带你练完整的基础周天。','你跟着药师练吐纳，遇到胸闷就先停下。',{visible:s=>c(s).path==='loose',requires:{spirit:true},system:{method:'clear'}}),
  choice('stone','学磐石吐纳法','不用药浴，先练负重与调息。','药师让你背着轻石行走，气息稳了才添重量。',{visible:s=>c(s).path==='loose',requires:{spirit:true},system:{method:'stone'}}),
  choice('shade','跟幽灯堂授业者学守魂诀','先守住魂魄，不学摄魂。','授业者让你面对熄灯的铜盏静坐，散乱的气息慢慢收拢。',{visible:s=>c(s).path==='demonic'&&!c(s).detained,requires:{spirit:true},system:{method:'shade'}}),
  choice('beast','跟老猿学淬身法','这门练法需要妖族授业者指导。','老猿带你练奔行与换气，没有先让你吞下不明兽血。',{visible:s=>c(s).path==='beast',requires:{spirit:true},system:{method:'beast'}}),
  choice('keep','继续已有的练习','暂不领新卷。','你把卷册放回，继续之前已经学清的步骤。'),
 ];
 // Core volumes inherit the actual region and an established teacher.
 for(const id of ['network_archive','network_volume'])if(events[id])for(const o of events[id].choices){if(o.system?.method){o.label=s=>'请教习带练'+REGIONAL_METHODS[sectProfile(s).core].name;o.visible=s=>c(s).path==='orthodox'&&(s.flags.learningPermit||c(s).rank==='内门弟子');o.reply='教习把内门全卷展开，先核对你已经练熟的周天，再逐段解释新增的口诀。';o.system={...o.system,regionalCore12:true};delete o.system.method;}}
 events.r12_home_resolve=node('r12_home_resolve','先把家里的事安顿好',s=>homeReceiver12(s)?homeReceiver12(s).name+'把家里的旧物拿给你看，问起你这些年的去处。'+(s.life.family.money<1000?'生活钱不宽裕，屋子也有需要修补的地方。':'家中已有一些积蓄，屋子与往后的照应仍要商量。')+'他们没有求仙丹，只想和你把眼前的日子说清。':'旧屋里只剩长辈留下的工具与信。邻人愿替你看门，但遗物如何安放、往后由谁照料，还要你交代。',[
  choice('repair','留下修屋，陪家人一段日子','先用普通木料补屋，不把灵石交给陌生人。','你找来木匠补好屋顶，陪着家里人把借据与旧物理清。离开的年月没有补回来，眼前的生活终于有了着落。',{...long(6,'你住进旧屋，先找木匠看漏雨的地方。'),system:{home12:'repair'},effects:{stats:{mind:4}}}),
  choice('money','换成生活钱，交给家里','支付一枚灵石，先在集市兑换铜钱。','你在熟悉的铺子把灵石换成钱，陪家人结清修屋的小账，余下的钱由他们保管。',{...long(2,'你去集市换钱，请家里信得过的人一同结账。'),cost:{stones:1},system:{home12:'money'}}),
  choice('talk','把能做的事说清，先报平安','不许下自己负担不起的承诺。','你说清眼下的处境，帮着挪好屋里怕雨的东西，留下可以转交消息的地址。家人知道你会离开，也知道下一次该托谁找你。',{...long(1,'你陪家人理清未办的事，约好往后怎样传话。'),system:{home12:'talk'}}),
 ]);
 const homeChoices=events.r12_home_resolve.choices;
 homeChoices[0].label=s=>homeReceiver12(s)?'留下修屋，陪家人一段日子':'留下修屋，安放长辈的遗物';
 homeChoices[0].reply=s=>homeReceiver12(s)?'你找来木匠补好屋顶，陪着家里人把旧物理清。眼前的住处有了着落。':'你找木匠补好屋顶，将长辈的工具与旧信收进干燥的箱子，托邻人照看院门。';
 homeChoices[1].visible=s=>!!homeReceiver12(s);
 homeChoices[1].reply='你在熟悉的铺子把灵石换成钱，交给家里信得过的人，留作日常开销。';
 homeChoices[2].label=s=>homeReceiver12(s)?'把能做的事说清，先报平安':'向邻人问清旧事，安排院落照看';
 homeChoices[2].startReply=s=>homeReceiver12(s)?'你陪家人理清未办的事，约好往后怎样传话。':'你向邻人问起长辈最后的日子，商量旧屋由谁照看。';
 homeChoices[2].reply=s=>homeReceiver12(s)?'你说清眼下的处境，留下可以转交消息的地址。家人知道下一次该托谁找你。':'你听邻人讲完旧事，收好长辈的信，留下能转交消息的地址，请他帮忙照看院门。';
 events.r12_home_leave=node('r12_home_leave','院门外已经有了回程的车',s=>'家事已经交代，'+(rules12(s).visit?.home||'原住处')+'还有你留下的东西。商队要沿来时的路回去，你可以随车离开，也可以决定留在故乡。',[
  choice('return','回到离开时的住处','沿已经确认的路返回。','你走完回程，在旧住处领回托管的物品。',{...long(3,'你与家人道别，随回程商队离开旧屋。'),available:s=>returnMonths12(s)!==null,reason:'回程商路暂时中断',system:{return12:true}}),
  choice('stay','留在故乡，重新安排生活','不再回去接原来的日常差事。','你托商队送回话，说明自己暂不返回。旧屋从短住的地方变成今后的家，你开始另找本地的活。',{system:{stay12:true}}),
 ]);
 events.r12_home_leave.choices[0].startReply=s=>homeReceiver12(s)?'你与家人道别，随回程商队离开旧屋。':'你向照看院落的邻人道别，随回程商队离开旧屋。';
 for(let i=1;i<6;i++)for(const id of ['r12_home_resolve','r12_home_leave'])events[id+'_'+i]={...events[id],id:id+'_'+i,choices:events[id].choices.map(o=>({...o,system:{...o.system}}))};
 for(let i=0;i<6;i++)events['r12_direction_'+i]=node('r12_direction_'+i,['这些年的修行卡在了一处','旧口诀接不上新的周天','同批上山的人已经远行','药师问你为何迟迟不敢封门','又一批年轻人来到山门','你重新整理这一生的功法'][i],s=>[
  (s.player.realm===0?'你照口诀吐纳，灵气却总在经脉里散开。':'你已到'+stage12(s)+'，新的周天比从前难走。')+'授业者让你选择一段能坚持的生活，不要只对着旧卷着急。',
  '你在几次运气时都停在同一个地方。授业者看过旧卷，叫你先把这段练稳；关门细练、出门问学，或攒够药材再试，都要留出真实的年月。',
  '同批上山的人收好行囊，已经能独自御器远行。你送他们走过山阶，回屋看见仍未解开的卷册，决定下一段日子要把力气用在哪里。',
  (s.player.health<75?'药师检查了你的旧伤，叮嘱养好经脉再冲关。':'药师看过你的行气记录，问你是不是一直担心冲关失败。')+'他没有催你用掉最后一份药，让你自己决定继续练、外出，或先攒材料。',
  '新来的弟子围在教习身旁，念着你早年学过的口诀。你想起第一次上山时的自己，把尚缺的材料写在纸上：是再封门几年，还是去山外寻一个答案？',
  '你把散落的卷册摊开，划去了从未练成的招式。经过这些年的尝试，你清楚自己最难走的那段经脉，下一段修行可以认真安排，也可以继续眼前的日子。',
 ][i],[
  choice('retreat','闭关细练数年','先交代住处；期间不接普通差事。','你推开石门，重新对照入关前的记录。真气比从前稳了一些，下一次冲关的准备仍要逐项核过。',{...long(i===0?48:72,'你交代好住处，带着已学的卷册关上石门。'),system:{plan12:'retreat'},effects:{stats:{mind:3}}}),
  choice('travel','随商队去山外历练','修行不会像安稳闭关那么快。','你跟商队走完这几年的路，带回见闻与旧地图。回到原来的住处后，才有空把练习里没解的地方留给授业者看。',{...long(36,'你把住处托人照看，随商队沿本大陆的道路出发。'),system:{plan12:'travel'},check:{base:68,skill:'sword',scale:.2,failText:'山路遭遇劫修，你舍掉一部分补给逃回。伤好之前，不能继续强行运气。',failure:{stats:{health:-14},remove:['herb_kit']}},effects:{skills:{sword:3}}}),
  choice('work','做工攒一份修行材料','交货验收后才领取换料报酬。','掌柜验完最后一批货，交给你两枚灵石。你记下这份材料花去的工期，回住处重新安排修行。',{...long(30,'你接下药铺的长期活计，先学验货，再分批交货。'),system:{plan12:'work'},effects:{stats:{stones:2}}}),
  choice('continue','维持眼下的生活','先不安排多年闭关或远行。','你把新安排暂且放下，次日仍照原来的重心练习。',{system:{}}),
 ]);
 events.r12_patron=node('r12_patron','师门供料的年限将到',s=>'管耗材的执事叫你核对领取签。山门资源有限，未筑基弟子供料到'+rules12(s).patron.until+'岁；之后仍可留住处，但修行材料须自己筹。他让你提前打算，不要等最后一份药用完。',[
  choice('prepare','留下，开始准备下一段闭关','尚缺丹药时仍要另寻材料。','你抄下停供的年限，把缺的药材列在卷末，开始按实际积蓄做准备。',{system:{patron12:'prepare'}}),
  choice('work','先做工，自己积攒材料','山门不会补上没挣到的工钱。','你请执事留下住处，另接验药与修补的活，今后不再只等师门发料。',{system:{patron12:'work',activity:'work'}}),
  choice('leave','交接差事，去坊市另寻机会','已有功法可以带走，借物须交还。','你交回领取签与借物，带自己的卷册搬到坊市，先找了能维持生活的活计。',{system:{patron12:'leave'}}),
 ]);
 events.r12_late_doubt=node('r12_late_doubt','这副身体还要再等多少年','练气的蒲团已经坐旧，你起身时要扶一下石壁。同批的人有的远行，有的早已离世。药师看过经脉，没有替你许下入道的保证，问你是否还愿把余下的年月留给这一卷。',[
  choice('practice','再闭关一段，认真核过最后的基础','仍可能没有炼出法力。','你走完这段闭关，能练稳的步骤都记在卷边。成不成还要看下一次实际引气，晚年的年月没有因此重新来过。',{...long(36,'你整理旧卷，带着仅有的药材再次封门。'),system:{plan12:'retreat'}}),
  choice('home','回乡或在坊市安顿，不再只等入道','准备一份能维持生活的活计。','你把修行卷册收好，不再日日等着灵气回应。旧住处的东西交接清楚，你开始按自己的本事安排余生。',{system:{path:'mortal'}}),
  choice('continue','继续眼前的日子，不急着决定','照已有的重心生活与练习。','你谢过药师，回到自己的住处。次日仍按熟悉的步骤练习，也留出时间做能让自己吃饱的活。'),
 ]);
 events.r12_foundation_supply=node('r12_foundation_supply','丹师留下了一枚筑基丹','丹师整理旧炉，留下一枚药性完整的筑基丹。授业者肯为你引荐，却要你先照看一季药田；这一枚只归完成差事的人，其他弟子也在等。',[
  choice('serve','接下药田差事，争取这枚丹','半年后验田，未完成不能领丹。','丹师验过成活的药苗，才把封好的筑基丹交给你，嘱咐冲关前先养好经脉。',{...long(6,'你接下药田，逐畦核过水路与病叶。'),system:{foundation12:true},check:{base:60,skill:'alchemy',scale:.25,failText:'几畦药苗没能养活。丹师取消这次赠丹，让你先把损失的苗补上。',failure:{stats:{mind:-3}}}}),
  choice('decline','不接差事，继续自己筹料','丹师会把机会留给别人。','你谢过引荐，把名额留给另一位弟子，仍照自己的积蓄准备。'),
 ]);
 events.r12_sect_clue=node('r12_sect_clue','修炼的灵气从旧井里来',s=>sectProfile(s).source==='sealed'?'夜里运气时，你听见井下有人咳嗽。守井长老让你继续领这股灵气，不许掀开阵板。药师见你越来越疲惫，低声说井下封着的可能不是灵脉。':'修缮旧殿时，你发现石刻上的口诀与授业卷不同。长老说石刻来自外域残殿，缺了半部，愿让你跟着核对；照错一步就可能伤经脉。',[
  choice('accept',s=>sectProfile(s).source==='sealed'?'跟长老借井下灵息修炼':'跟长老核过石刻，再试着练','来源未明，练错可能伤身。','你跟着长老核过能练的部分，开始尝试这份陌生传承。',{...long(12,'你先把旧口诀逐句抄出，跟长老核对能练的部分。'),system:{clue12:'accept'},check:{base:55,skill:'array',scale:.25,failText:'新口诀与旧周天相冲，你在疼痛中停下，没有练成这份传承。',failure:{stats:{health:-16}}}}),
  choice('report','请过路阵师核查来源','长老可能不愿你把消息带出山门。','你没有急着运气，先把亲眼见到的刻文留给外来阵师。',{system:{clue12:'report'}}),
  choice('decline','不碰陌生口诀，继续已有功法','不领这份额外的灵气。','你合上抄本，不再去旧井旁修炼。原来的卷册仍在手里。',{system:{clue12:'decline'}}),
 ]);
 installBranches(events);
 events.r12_sealed_warning=node('r12_sealed_warning','井下的气息正在消耗你','药师把两次诊脉记录放在一起，指出你的经脉越来越虚。长老仍让你领井气，说停下就会失去这份额外资源；你已亲身感到代价，不能再把它当普通灵脉。',[
  choice('stop','停用井气，重练山门基础功法','修炼会慢下来，已经受的伤仍需调养。','你不再去旧井旁运气，重新按基础卷册练吐纳。药师替你调养旧伤，借来的灵息不再继续抽走精力。',{system:{sealed12:'stop'}}),
  choice('continue','继续借井气，争取尽快突破','已经知道借息会伤身。','你仍在旧井旁练习，每次运气都记下身体的变化，试着在伤势加深前跨过瓶颈。',{system:{sealed12:'continue'}}),
 ]);
 for(let tier=1;tier<=4;tier++)for(let attempt=0;attempt<3;attempt++){
  const n=events['breakthrough_'+tier+'_'+attempt];
  n.text=s=>tier===1?'授业者检查过你练习吐纳的记录，灵气已能走过一段经脉。这次要试着把它留在体内，才算真正入道；资质差或伤病未愈时，灵气仍可能散掉。':tier===2?'你已练到炼气圆满。授业者让你先核护脉药，再看有没有筑基丹；年岁渐长，经脉不再像少年时柔韧。这次凝聚真气可能失败，伤重还会损寿。':'授业者先验主药与完整法门，再给你指明闭关时最容易伤到经脉的地方。材料齐全也不能保证凝成新的境界，护法仍要在石室外守候。';
  n.choices=n.choices.filter(o=>o.id!=='service'||tier<=2);
  if(tier===2)n.choices.push(choice('force','不备齐护脉药，强行冲关','真气失控可能死亡。','你从最险的一段经脉冲过，终于稳住真气，醒来时身上已添了几处难愈的伤。',{...long(18,'你拒绝再等护脉药，独自封住石室，试着强行凝聚真气。'),requires:{spirit:true},effects:{realm:2,stats:{health:-15}},check:{base:28,skill:'array',scale:.15,failText:'真气冲破了受损的心脉，你没能走出石室。',failure:{},failEnding:'breakthrough_lost'},system:{breakthrough:2}}));
  for(const o of n.choices){if(o.id==='service'){o.visible=s=>c(s).path!=='mortal'&&!!c(s).network.method&&c(s).continent===s.birth.continent&&s.player.stones<(tier===1?2:6);o.hint='先替授业者完成长期差事，换料后再闭关。';}if(o.id==='try'){o.reply='石门打开时，你已经能稳住新一层的真气。授业者核过经脉，确认这次冲关成功，再让你慢慢适应新学的术法。';}if(o.id==='wait')o.hint='继续核对功法，准备还缺的材料。';}
 }
 /*
  * 第四「最后的机会」。
  *
  * 原来每境只有三次机会，用完就再也拿不到突破卡 —— 于是出现「进度攒到五百点、
  * 五十岁还卡在炼气」这种说不通的人生。**寿元不等人，但机会不该只有三次。**
  *
  * ⚠ 这张卡只加在**当前版本**（本函数是装配链的最后一步）：
  *    旧版本（5–11）的执行器各自按自己的三次上限走，历史基线一个字节都不动。
  */
 for(let tier=1;tier<=4;tier++){
  const src=events['breakthrough_'+tier+'_2'],id='breakthrough_'+tier+'_3';
  events[id]={...src,id,title:'最后的冲关',text:s=>tier===1?'授业者把你的记录看了很久，没有再问要不要再等。他把最后一份材料放在石室门口：「这一回，成不成都在这里了。」':tier===2?'你把护脉药摊开，最后一次核对经脉。授业者说，筑基只剩这一次机会 —— 再不成，你得换一条路走。':'护法在石室外站了很久。主药已经用尽，凝丹也好、育婴也好，都没有下一次了。',choices:src.choices.map(o=>({...o,system:o.system?{...o.system}:undefined,check:o.check?{...o.check}:undefined}))};
 }
 // A family with secular means sends household news, not spirit cultivation aid.
 events.family_support.text=s=>s.birth.family==='clan'?'族中管事经商队问起你的修炼，愿按族中剩下的积蓄送来家传笔记或药材。东西还在族里，必须有人走完商路才能交到你手中。':'家人托熟悉的商队送来旧屋近况，信里说粮价又涨了。他们没有能助你修炼的丹药，只问你在外是否安顿，也想知道以后该把消息送到哪里。';
 for(const o of events.family_support.choices)if(['supplies','notes'].includes(o.id))o.visible=s=>s.birth.family==='clan';

 /*
  * ══════════════════════════════════════════════════════════════════════
  * 入门串的另外两环（交接文档 §3.2「必答串五环」）
  * ══════════════════════════════════════════════════════════════════════
  *
  * 整条串是：**测灵根 → 宗门部门 → 心法选定 → 重心（首次授业）→ 炼气突破**。
  * 测灵根本身是**唯一决策点**；其余几环都是**必答**（两个选项通向同一条路，
  * 表达的是两种态度，不是两条岔路）。
  *
  * ⚠ **部门与心法都由规则层算**（`packages/adventure/story-rules12.js` 的
  *   `department12` / `methodId12`）⇒ 卡上只写一个标记（`department12` / `method12`），
  *   具体是哪一个由「入门身份 + 灵根」与「你走的那条路」定 ⇒
  *   **两个选项走的是同一个部门、同一门心法** ⇒ 这两张卡是真的必答。
  *
  * ⚠ **为什么这两张卡放在这份文件里**（而不是 `content/cultivation-stories.js`）：
  *   装配链的顺序是「九个历史快照 → 规则十二专属内容」。
  *   这份文件是**最后一步**才装的 ⇒ 规则 5–11 的事件表一个字都不变
  *   （`scripts/verify-events-fidelity.mjs` 逐值全等）。
  */

 /* ── 宗门部门（丹房 / 药田 / 器堂 / 执事房）────────────────────────── */
 const dept=s=>DEPARTMENTS[department12(s)];
 events.sect_department=node('sect_department','分到哪一处的差事',s=>{
  const d=dept(s);
  return '执事念完你的名字，领你去'+d.name+'。'+d.line+'——这里的活计与别处不同：'
   +({dan:'炉子常年不熄，认错一味药就废掉一炉。',tian:'灵草按节气种，误了浇水要补一季。',qi:'法器与阵钉堆在架上，登记错一件就得赔。',zhi:'名册、差事与月例都从这里过，学的是怎么跟人打交道。'})[department12(s)]
   +' 教习问你打算怎么上手。';
 },[
  choice('go','先接下手上的活','活先做起来，规矩边做边学。','你领了差事，从最笨的活学起。',{system:{department12:true},next:'method_choice'}),
  choice('ask','先问清这里的规矩','规矩不明，往后处处被动。','你问过规矩，才接下差事。',{system:{department12:true},next:'method_choice'}),
 ]);

 /* ── 心法选定（必答：走哪一门由规矩定）────────────────────────────── */
 events.method_choice=node('method_choice','授业者给你定下第一门心法',s=>{
  /*
   * ⚠ 正文**只按「走的是哪条路」分说法**（四种），**不写心法名** ——
   *   ① 表达域门禁要求「能说出的说法种数」与规则层一致 ⇒ 正文每多一个变量就多一种说法；
   *   ② 心法名**紧跟着这一卡就会报出来**（人脉网络域的「主修心法已定」）
   *   ⇒ 名字放在那行日志里，比塞在正文里更合时机。
   */
  return (s.life.cultivation.path==='orthodox'
   ?'宗门按你这一脉的路数，把入门心法定给了你。先练吐纳与护身，其余的等授业再说。'
   :s.life.cultivation.path==='demonic'
   ?'幽灯堂只授基础守魂诀，不准偷看摄魂章节。先稳住魂魄，再谈别的。'
   :s.life.cultivation.path==='beast'
   ?'老猿用自己的步法示范换气与淬身，要你先养稳筋骨，再试引气。'
   :'药师把两册基础口诀摊开，只肯先带你走过最慢的一段周天。残页没有他解释，不能当全本修炼。')
   +' 你的灵根是'+s.player.root+'。';
 },[
  choice('take','照着教，先把第一段练熟','练熟一段再往下走。','你把心法的第一段抄进册子，从吐纳开始练。',{system:{method12:true}}),
  choice('ask','先问这门心法的短处','心里有个数，后面少走弯路。','授业者讲了这门心法在哪儿容易走偏，你记下来了。',{system:{method12:true}}),
 ]);
 /*
  * ⚠ `method_choice` 也要挂进 `NETWORK_EVENTS` ——
  *   「主修心法已定」这件事是**人脉网络域**写的
  *   （`packages/adventure/story-network.js` 的 `networkAction` 只认自己表里的卡）
  *   ⇒ 不挂进去，心法就定不下来 ⇒ 冲关卡那张废卡的根还留着。
  * ⚠ 挂的**时机**很重要：本函数是装配链的**最后一步**，
  *   而 `content/cultivation-stories.js` 里的 `sharedNodes`
  *   （规则七 / 八 共用的活节点表）**早就建好了** ⇒
  *   新挂的这张卡**不会**流进规则七 / 八 ⇒ 旧版本逐值不变。
  */
 NETWORK_EVENTS.method_choice=events.method_choice;

 /*
  * ⚠ **山门外的队伍保持原样**（它**不在**入门串五环里）。
  *
  * 交接文档 §3.2 的五环是：**测灵根 → 宗门部门 → 心法选定 → 弟子修炼 → 炼气突破** ——
  * 「山门外的队伍」在**五环之前**（是铺垫），背景故事卡更在它前面。
  * ⇒ 「入门串从岔路变成必答串、测灵根只出 1 张决策卡」管的是**五环之内**，
  *   不是整个开场。
  *
  * ⚠⚠ 之前把排队那张卡也改成必答（两个选项都走向测灵根）**是错的**：
  *   ① 排队那张卡上的「回家，再想别的出路」是**有灵根但选择不修仙**的唯一出口 ——
  *      拿掉它 ⇒ 这类命落进「走凡俗路、却又不是无缘修仙」的空档（凡俗内容只在
  *      「不能引气」时启动）⇒ 一辈子没有内容；
  *   ② 它还是**决策策略**（`scripts/lib/decide-policy.js`）在旧版本（规则 5–11）
  *      上的取值依据 ⇒ 改了它，旧版本的固定人生序列会跟着变。
  * ⇒ 恢复原样。真正做成必答的是五环里新加的两张卡（部门 / 心法）。
  */

 /*
  * ⚠ **部门只影响后续卡的可选项，不改数值**（交接文档 §9.2 第 3 条）。
  * 落在**宗门考核报名**那张卡上：每个堂口只考自己管的本事，外加一门通识。
  * ⇒ 执事房三个都能报；丹房 / 药田 / 器堂各关掉一门。
  */
 for(const o of events.selection_1.choices||[]){
  if(o.id==='skip')continue;
  o.available=s=>dept(s).exam.includes(o.id);
  o.reason='这一堂的考核不归你所在的堂口管';
 }

 installPlotFixes(events);
}
function installBranches(events){
 events.road_turn.title='书商拿出一页残卷';
 events.road_turn.text='坊市书商把一页旧口诀压在柜上，说是从破洞府里收来的。纸上只留半个署名，连书商也不知道原主人是谁。可以买来慢慢核实，不能把这一页当完整传承。';
 events.road_turn.choices=[
  choice('book','买残页，请药师辨认','花费两枚灵石；买卷不等于拜师。','药师看过纸上的署名，认出幽灯堂旧印，让你先问清授业者的条件，不要急着照残页运气。',{cost:{stones:2},next:'r12_bazaar_follow',system:{}}),
  choice('keep','不买，继续已有功法','不照来历不明的残页练气。','你把残页放回柜上，带着自己的卷册离开。'),
 ];
 events.r12_bazaar_follow=node('r12_bazaar_follow','药师认出了卷上的旧印','药师替你找到了幽灯堂代收消息的药铺。掌柜说堂里愿收试学者，但要先看身体与旧师承情况，未答应给完整功法。你可以让他传话，也可以收起残页。',[
  choice('ask','请掌柜转话，先问试学条件','先见授业者，不直接改投师门。','掌柜核过你的住处，把问话交给往来药商。',{system:{inquiry:'demonic'},next:'dark_invitation'}),
  choice('leave','收起残页，不再追问','仍练已经学清的功法。','你收回残页，没有登记试学，旧日的生活照常继续。'),
 ]);
 events.sect_feud_0.text='邻宗扣住了运粮弟子，说你们用了他们的泉水。管外门差事的许执事请你送一份旧约，执法长老严衡负责谈放人；对方肯先让粮车沿旧路回去。';
 events.sect_feud_0.choices[0].label='送旧约，协助长老谈放人';events.sect_feud_0.choices[0].hint='长老谈泉水归属，你只交自己核过的旧约。';events.sect_feud_0.choices[0].reply='你找到旧约上的取水位置，沿岸核过改道的痕迹，把见闻记下交给长老。';
 events.sect_feud_1.text=s=>feud(s).grain?'粮车已经接回，被扣弟子却还没能回山。严衡在两宗会面处谈放人，叫你先照看等候的人；你没有查泉水，不必替长老说明水路。':feud(s).assault?'你截粮的事传到了会面处，邻宗护卫指着你拔剑。严衡要求先把这次袭击说清，否则对方不肯继续谈放人。':'你把旧约送到会面处，严衡让你说明亲眼看过的水路。邻宗认为旧约已经失效，护卫争吵着拔出剑，长老叫你退到身后。';
 events.sect_feud_1.choices[0].label=s=>feud(s).grain?'说明粮车已经接回':'交旧约，说明亲眼见闻';
 events.sect_feud_1.choices[0].hint='不替别人补证词，让长老继续谈放人。';
 events.sect_feud_2.title='运粮弟子走回了山门';
 events.sect_feud_2.text=s=>feud(s).assault?'两宗谈好了暂时取水的办法，被扣弟子终于能回山。邻宗另列出你袭击粮车的账，严衡要你说明动手的经过；这件事没有随放人结清。':feud(s).grain?'长老谈妥了放人的约定，运粮弟子走回山门。粮车先前已由你接回，许执事叫你核对交粮的人数，不让你再替两宗谈水泉。':'长老根据送来的旧约暂定了取水办法，被扣弟子回到山门。严衡让你核对送约和会面的经过，许执事先给归来的弟子安排食宿。';
 events.sect_feud_2.choices[2].visible=s=>!!feud(s).assault;
 events.sect_feud_2.choices[0].label='说明实际经过，交接归来的弟子';events.sect_feud_2.choices[0].hint='先把放人和交粮的事办清。';events.sect_feud_2.choices[0].reply=s=>feud(s).grain?'你与许执事逐一核过弟子和粮车，归来的人吃上热饭。长老把泉水争议另存卷宗，没有让你替宗门承担未谈完的事。':'你把亲眼见闻交清，执事安排归来的弟子休息。长老另留水泉卷宗，下次交涉仍由两宗负责。';
 events.sect_trial_2.text=s=>trial(s).rescued?'你扶着受伤的陶宁回到谷口，药师先给他止血。执事看过你带回的药包，等伤势稳住才问兽群堵住了哪条路，想给下一队换条走法。':s.people.trialmate.status!=='alive'?'你回到谷口，陶宁没有跟回来。搜救弟子请你指出最后见到他的地方，药师则先验你实际带回的药；没有人把未归者算成已经获救。':'你随返程队走出谷口，执事核过人数与手中的药包。没有伤员要先救治，他只问这次走过的路和实际采到的药。';
 events.sect_trial_2.choices[0].label='把实际走过的路告诉执事';events.sect_trial_2.choices[0].hint=s=>trial(s).rescued?'药师先治同伴的伤，你说明兽群堵路的位置。':'说明自己见到的事，不替未到过的地方作证。';
 events.sect_trial_2.choices[1].hint=s=>trial(s).herbs?'先让药师验过手里的药，再问下一次授业。':'只交实际带回的药，没有药便先说明撤退原因。';
 events.sect_trial_2.choices[0].reply=s=>trial(s).rescued?'你画出绕行的山路，陶宁在药师身边补上堵路的位置。执事收好记录，安排他回药院休养，又请你下次替新队带路。':'你只标出自己走过的路，执事按实际名单处理归来与未归的人，把下一队的行程另作安排。';
 events.garden_accident.choices=events.garden_accident.choices.filter(o=>o.id!=='leave');
}
/*
 * ══════════════════════════════════════════════════════════════════════
 * 剧情承接（T6 · 规则十二专属）
 * ══════════════════════════════════════════════════════════════════════
 *
 * 依据：`docs/剧情复盘-2026-11-06.md` §2（幽灯堂的选项为什么突兀）与 §3（铜匣剧情的承接断了在哪）。
 *
 * ① **幽灯堂的接引人先在山门外露过面。**
 *    突兀的根子不是「条件」，而是**这个人是凭空出现的**：
 *    玩家刚测完灵根，就看见一个陌生人管他叫「顾魇」，还知道他刚测完灵根。
 *    ⇒ 现在排队那张卡（reception）里先铺一句：
 *      **队伍外面站着一个穿黑衣的人，自称幽灯堂接引人，从队头看到队尾。**
 *      玩家是先见过他，后来才谈得上「问一问他」。
 *
 * ② **选项改回「玩家能做的动作」，不再是一则招人告示。**
 *    原来那句「听取幽灯堂招收弟子的条件」是**从招人的人那边写的口吻** ——
 *    玩家不是幽灯堂弟子，看到「幽灯堂招弟子」当然突兀。
 *    现在是「问一问门外的黑衣修士」；而且**提示语按灵根等级分两种说法**：
 *      · 测灵石没收下你 ⇒「他说测灵石不收的禁术他肯教，但要先见堂规；现在还没有拜师。」
 *      · 宗门已经收下你 ⇒「他说他那里有些测灵石不收的禁术；先听条件还是随执事进山门，由你定。」
 *    同一条路，对不同处境的人意义不同 —— 这就是「条件化」。
 *    ⚠ 这条**不能藏**（`visible`）：藏了以后，十六岁入幽灯堂这条路就没了，
 *      魔道那几条长线（药库、禁术、追捕、献祭）在模拟里一条都发不出来
 *      （实测 `chains` 门禁直接报红：dark_method 1→0、dark_pursuit 2→0）。
 *      ⇒ 改成「同一张卡、两种说法」，魔道路线与全部内容覆盖都不受影响。
 *
 * ③ **选项里不再点名顾魇。**
 *    顾魇第一次出现应当在「药铺后堂的入堂条件」（dark_invitation）那张卡的正文
 *    —— 那里会给他的身份注解（幽灯堂药库师兄），玩家才知道他是谁。
 *    原来选项提示里先抛出「顾魇能教测灵石不收的禁术」，
 *    而这张卡的正文里根本没有他 ⇒ 玩家先看见一个不认识的名字
 *    （实测：54 条人生里提到顾魇，54 条都是「第一次提到他之前没有任何介绍」）。
 *
 * ④ **铜匣换粮那条路也有下文。**
 *    童年卡「旧屋梁上落下一只铜匣」（child_relic）三个结果：
 *    留下口诀（old_page）／换粮（sold_page）／请匠人拓印（relic_route）。
 *    原来只有「留下口诀」与「请匠人拓印」接得上「旧联系人」那条线（echo_relic），
 *    「交给家人换粮」那个换了两袋粮食就没了 ⇒ 选完等于没选。
 *    现在 sold_page 也算铜匣线（`packages/adventure/story-rules10.js` 的 echoKind），
 *    并且三张回响卡按「匣子已经转手」另写一版 ——
 *    这条线要找的不再是「残卷的真伪」，而是「那只匣子去了哪里」。
 *
 * ⚠⚠ 为什么这几处**只在规则十二**改，不去改共享文件：
 *   `content/decision-details.js` 与 `content/story-network.js` 是**九个版本共用**的
 *   （装配链在「规则五」那一段就装了它们）⇒ 改它们会让规则 5–11 的事件表也变，
 *   违反「旧版本逐值不变」这条硬规矩。
 *   ⇒ 全部改在规则十二专属的这份文件里（装配链的最后一步才装）。
 */
function installPlotFixes(events){
 /* ① 铺垫：山门外的队伍里，先有那个穿黑衣的人 */
 const reception=events.reception;
 if(reception){
  const base=reception.text;
  reception.text=s=>v(base,s)+'队伍外面站着一个穿黑衣的人，自称幽灯堂接引人，从队头看到队尾。';
 }
 /* ② + ③ 测灵石上的记录 —— 选项改回动作，提示按灵根分说，不点名顾魇 */
 const entry=events.root_result&&events.root_result.choices.find(o=>o.id==='dark');
 if(entry){
  entry.label='问一问门外的黑衣修士';
  entry.hint=s=>ROOTS[s.player.root].grade<0
   ?'他说测灵石不收的禁术他肯教，但要先见堂规；现在还没有拜师。'
   :'他说他那里有些测灵石不收的禁术；先听条件还是随执事进山门，由你定。';
  entry.reply='黑衣修士带你到药铺，拿出试读卷与堂规，让你先问清条件。';
 }
 /*
  * ④：铜匣换粮那条路的接续。
  *   「sold_page」这条线要找的不再是「残卷的真伪」，而是「那只匣子去了哪里」。
  */
 const sold=s=>!!c(s).network.marks.sold_page;
 const soldText={
  echo_relic:'商队带来修器匠的消息。他记得你家旧屋那只铜匣 —— 当年你家人拿它换了两袋粮，如今不知落在谁手里。他只能确认那只匣子曾在你家；要对上记号，得先把它找回来。',
  echo_relic_check:'匠铺回信附了记号的简单摹图，与你记忆里的铜匣纹路相近。匠人说当年那只匣子已经换给了走商的货商，他手里没有实物；他要你找到当年的买主，或去旧船籍上查同批货印。对错不能靠一封信定下。',
  echo_relic_visit:'匠人没有匣子可给你看，只摊开旧船籍抄本：那一批货印确实存在，装的是运药船的货。他能确认你家的匣子进了那批货，不能确认它后来落在谁手里、里面那页口诀是否真出自宗门。要不要接着追，由你决定。',
  echo_relic_check_resume:'匠铺回信附了记号的简单摹图，与你记忆里的铜匣纹路相近。匠人说当年那只匣子已经换给了走商的货商，他手里没有实物；他要你找到当年的买主，或去旧船籍上查同批货印。对错不能靠一封信定下。',
  echo_relic_visit_resume:'匠人没有匣子可给你看，只摊开旧船籍抄本：那一批货印确实存在，装的是运药船的货。他能确认你家的匣子进了那批货，不能确认它后来落在谁手里、里面那页口诀是否真出自宗门。要不要接着追，由你决定。',
 };
 const soldChoice={
  echo_relic:{id:'follow',label:'托商队打听铜匣的下落',reply:'你写下当年换粮的货商商号，请商队把问话带到信上的地址。'},
  echo_relic_visit:{id:'compare',label:'请匠人翻旧船籍，记下当年那条船',reply:'匠人翻出旧船籍，抄下当年那条船的编号和货主商号。船还在不在、货主是谁，得再沿商路问。他没有把这份记录说成传承。'},
  echo_relic_visit_resume:{id:'compare',label:'请匠人翻旧船籍，记下当年那条船',reply:'匠人翻出旧船籍，抄下当年那条船的编号和货主商号。船还在不在、货主是谁，得再沿商路问。他没有把这份记录说成传承。'},
 };
 for(const id of Object.keys(soldText)){
  const card=events[id];if(!card)continue;
  const text=card.text;
  card.text=s=>sold(s)?soldText[id]:(typeof text==='function'?text(s):text);
  const patch=soldChoice[id];if(!patch)continue;
  const choice=card.choices.find(o=>o.id===patch.id);if(!choice)continue;
  const label=choice.label,reply=choice.reply;
  choice.label=s=>sold(s)?patch.label:(typeof label==='function'?label(s):label);
  choice.reply=s=>sold(s)?patch.reply:(typeof reply==='function'?reply(s):reply);
 }
}
