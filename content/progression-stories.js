export const ADVANCEMENT_ITEMS={
 condensation_book:{name:'凝丹真解',detail:'经护法核过的凝丹篇章。'},beast_core:{name:'完整妖兽内丹',detail:'经辨认、可用于凝丹的内丹。'},false_core:{name:'驳杂假丹',detail:'灵力不纯，可代替内丹，但凝丹更难。'},golden_pill:{name:'定元凝丹丸',detail:'炼成的凝丹辅药。'},rough_pill:{name:'杂质凝丹丸',detail:'火候有误，药力不稳。'},soul_book:{name:'育婴真解',detail:'记录神魂与元婴相合的法门。'},soul_flower:{name:'养魂莲',detail:'孕育元婴所需的灵药。'},nascent_pill:{name:'护婴丹',detail:'护住孕婴时脆弱的神魂。'},rough_nascent:{name:'驳杂护婴丹',detail:'火候不足的护婴辅药。'},tribulation_array:{name:'避劫阵盘',detail:'承受最后雷劫的阵盘，不能保证渡劫成功。'},tribulation_medicine:{name:'护魂灵液',detail:'稳住渡劫时的神魂。'},old_enemy_seal:{name:'旧敌令印',detail:'撤离途中保存的敌宗印记；押给药商比对就换不回来了。'},
};
const ch=(id,label,hint,reply,data={})=>({id,label,hint,reply,...data});
const node=(id,title,text,choices)=>({id,act:0,title,text,choices,cultivationOnly:true});
const action=(kind,extra={})=>({system:{progression:kind,...extra}});
const long=(months,startReply,data={})=>({months,deferEffects:true,startReply,...data});
export function installProgressionEvents(events){
 const remit=(id,mode)=>ch(id,mode==='coin'?'请药商兑成粮钱，再送回家':'托药商将封好的灵石送回家',mode==='coin'?'先在坊市兑换，再沿商路转交给家人。':'写明收物的人和地址，由药商沿确认过的商路转交。','你把封好的物资交给熟悉的药商，写明收物的人和旧屋地址，等他带回家中的口信。',{cost:{stones:3},system:{progression:'remit',mode}});
 const support=events.family_support;support.choices=support.choices.filter(o=>o.id!=='send');support.choices.unshift(remit('send','coin'),remit('stones','stone'));
 const gate=events.family_gate;gate.choices[1]=remit(gate.choices[1].id,'coin');gate.choices.push(remit('stones','stone'));
 events.parcel_missing=node('parcel_missing','药商没有带回收物的回话','约定的回信迟迟没到。另一支商队说，托运人曾在中转坊市停留，后来没有跟原队继续走。家人只收到问候，没有收到你托送的灵石；暂时还不知道东西丢在何处。',[
  ch('search','请药商向中转坊市追查收据','先托熟悉的药商核实交接人，不把未知损失直接归到家人头上。','药商回信说，他找到被私自拆开的包封，坊市见证人催经手人交回物资。他将灵石兑成粮钱，再交到家中收物人手里。',long(24,'你把原收据交给药商，请他向中转坊市追查经手人，等待核实与交付的回话。',action('parcel'))),
  ch('leave','请家人保平安，暂不追查','物资没有到账，不能让家人先垫出这笔钱。','你托另一支商队告诉家人先照顾生活，暂时不为失踪物资奔走。这笔托送没有追回。',action('parcel')),
 ]);
 events.parcel_exposed=node('parcel_exposed','家中门外有人打听那只包裹','药商转来家人的口信：包裹到了，邻人却看见其中一枚会发光的石头。陌生修士开始问收物人的住处，家人把灵石藏进箱底，不敢拿出来使用。他们不知道来人会不会上门索取。',[
  ch('convert','请药商取回灵石，兑成粮钱','先用熟悉的商路处理包裹，再让家人安排普通生活。','药商取回灵石，在坊市兑成粮钱分批转交。家人不再保管修士能辨认的灵物，门外打听包裹的人没找到灵石。',long(12,'你让家人先不拿出包裹，托可信药商按旧地址取回灵石。',action('parcel'))),
  ch('guard','亲自回去，安排家人与物资','实际赶回故乡，不能隔着大陆直接守在家门前。','你回到旧屋，找守信的修士见证包裹来历，安排家人和保管处。灵石仍属于家人，你没有把它收进自己的行囊。',long(18,'你核过回乡的路线，先让家人到熟悉的药铺等候。',{...action('parcel'),system:{progression:'parcel',familyVisit:true}})),
  ch('leave','托家人暂避药铺，不赶回去','只能转交口信，包裹和住处仍需要家人自己处理。','家人带着旧衣去药铺暂住。后来回信说灵石已经被陌生修士拿走，药铺替他们留下了来人的衣纹与口音，你暂时没有追回物资。',action('parcel')),
 ]);
 for(let i=1;i<8;i++)for(const kind of ['missing','exposed']){const original=events['parcel_'+kind],id='parcel_'+kind+'_'+i;events[id]={...original,id,title:kind==='missing'?'另一份包裹未能按约转交':'家中又有人打听送来的灵物',choices:original.choices.map(o=>({...o,system:{...o.system}}))};}
 events.sect_return_0.title='山门传来破阵急讯';
 for(let tier=1;tier<=4;tier++){
  const exam=events['selection_'+tier];if(tier>=2){exam.title='堂院请你评议一份修行手稿';exam.text='堂院收到一份新的修行手稿，几名修士对其中的火候解释争执不下。教习请已有经验的人按自己熟悉的本事核对，不再安排入门选拔。';for(const o of exam.choices){o.label=({sword:'核对剑诀中的收势',alchemy:'核对药方的寒热',array:'核对阵图的出入'})[o.id]||'暂不参与这次评议';o.reply='你把有疑问的页角圈出，交给堂院约定核对日期。';o.hint='按这些年实际练过的本事核对手稿。';}}
 }
 for(let tier=3;tier<=4;tier++)for(let attempt=0;attempt<3;attempt++){
  const names=tier===3?['凝丹真解','妖兽内丹','凝丹辅药']:['育婴真解','养魂莲','护婴丹'];
  const items=tier===3?['condensation_book','beast_core','golden_pill']:['soul_book','soul_flower','nascent_pill'];
  for(let part=0;part<3;part++){
   const id=`advance_material_${tier}_${attempt}_${part}`,base=action('material',{tier,part});
   const text=part===0?`授业者翻到${tier===3?'凝丹':'育婴'}篇，指出你现在练的入门口诀没有写清这一段。旧经阁保留着${names[0]}，但要先学会其中的周天，再让护法核对。${attempt?'上次闭关失利后，你还需重新核过受损的经脉，不能照旧页直接再冲关。':''}`:part===1?`药师核过你的修行笔记，说还缺${names[1]}。${tier===3?'邻近荒山有一头守着灵泉的妖兽；坊市也有散修卖从残阵中炼出的假丹。':'旧洞天有一株养魂莲，守洞的修士只让愿意承担修阵差事的人进去。'}这些东西不能拿普通闭关药材代替。`:`药师摆出${names[2]}的药方。主药可以在药园培育，但炼制时必须按实际火候分清次序。你可以自己试炼，也可以给丹师做一段差事，换他亲手炼成的药。`;
   const choices=part===0?[
    ch('learn','留在经阁，逐段学清这篇法门','由护法核对经脉运行，期间停止旧法的急练。','护法核过你画的周天图，把这篇真解交给你，允许你按其中的步骤准备冲关。',long(tier===3?72:120,'你搬到经阁旁的小屋，先逐段练习新的周天，再请护法核对。',{...base,effects:{items:[items[0]],stats:{insight:3}}})),
    ch('copy','替经阁修补旧卷，换取授业','修卷和授业都要实际完成，不能只买一页口诀就冲关。','旧卷修补完毕，授业者核过你的练习，给你留下一份完整真解。',long(tier===3?96:144,'你接下修补旧卷的差事，空闲时跟授业者学习这一段法门。',{...base,effects:{items:[items[0]]}})),
   ]:part===1?[
    ch('search',tier===3?'结伴追踪守泉妖兽':'随守洞修士修阵，寻找养魂莲',tier===3?'妖兽能击破护身法器，遇险可能死亡。':'洞天深处有残阵，同行者先核回程与接应。',tier===3?'你们循足迹找到妖兽，合力破开它的护身妖气。药师核过取回的内丹，确认没有被邪术污染。':'旧阵修好，守洞修士带你取下成熟的养魂莲，留下根茎等待来年生长。',long(tier===3?60:120,'你与同行修士备好回程图和补给，沿确认过的路线寻找主药。',{...base,check:tier===3?{base:48,skill:'sword',scale:.3,failText:'妖兽冲破合围，护身法器碎裂，你没能离开荒山。',failure:{},failEnding:'battle_lost'}:undefined,effects:{items:[items[1]]}})),
    ch('exchange',tier===3?'替药商守一段商路，换内丹':'替守洞者照看药园，换养魂莲','先完成对方需要的差事，材料要交到手里才算备齐。','约定的差事做完，材料持有者当面交出主药，药师又核了一遍来历。',long(tier===3?96:180,'你问清材料的来历，接下对方提出的差事，先完成约定。',{...base,effects:{items:[items[1]]}})),
    ...(tier===3?[ch('substitute','取坊市残阵里的假丹','假丹的灵力驳杂，药师不能替它保证凝丹。','散修把假丹从残阵里取出。药师圈出其中的杂质，叮嘱你冲关时尤其留意经脉反噬。',long(36,'你跟散修核过残阵的位置，等待他取出尚有灵力的假丹。',{...base,effects:{items:['false_core']}}))]:[]),
   ]:[
    ch('refine','按药方自己试炼','需要多年辨药与控火；失手的丹药可能只剩部分药力。','你核过药方的寒热，丹药出炉后由药师试辨药性，留下可以使用的那几丸。',long(tier===3?60:120,'你逐批培育主药，照药方练习控火；成丹以前不算备齐辅药。',{...base,check:{base:35,skill:'alchemy',scale:.4,failText:'丹炉火候过急，丹药带着杂质。药师留下仍有药力的部分，但不把它当作足火成丹。',failure:{items:[tier===3?'rough_pill':'rough_nascent']}},effects:{items:[items[2]]}})),
    ch('commission','跟丹师照炉，换他亲手炼丹','先完成药园与照炉的差事，不是缴灵石便立刻拿药。','照炉的差事完成，丹师将验过火候的丹药封入玉瓶，交代保存办法。',long(tier===3?96:180,'你搬到药园附近，先种药和照炉，再等丹师开炉炼成辅药。',{...base,effects:{items:[items[2]]}})),
   ];
    choices.push(ch('leave','暂不为这次冲关奔走','保留已有物品，回到住处继续生活。','你收起药方和地图，暂时不接这项差事。',action('material_decline',{tier})));
   events[id]=node(id,`准备${tier===3?'凝丹':'育婴'} · ${names[part]}`,text,choices);
   events[id+'_resume']={...events[id],id:id+'_resume',text:'上次的差事被急讯打断，原来约定的材料尚未取得。授业者与你重新核过还能继续的安排。 '+text,choices:choices.map(o=>({...o,system:{...o.system}}))};
  }
  const br=events[`breakthrough_${tier}_${attempt}`];br.title=tier===3?'准备闭关凝结金丹':'准备闭关孕育元婴';br.text=`护法核过你的功法、主药和辅药，安排好${tier===3?'凝丹':'育婴'}的静室。${tier===3?'凝丹时必须将多年练成的真气收为一体；内丹只提供灵力，不能替你稳住周天。':'孕育元婴要让神魂与法力相合，闭关中途不能随意离开。'}这次冲关可能失败，出关后的修为要实际查验。`;
  br.choices=br.choices.filter(o=>o.id!=='service');const attemptChoice=br.choices.find(o=>o.id==='try');Object.assign(attemptChoice,{label:tier===3?'交代好外事，封门凝丹':'请护法守住静室，封门育婴',hint:'将已经备齐的主药与辅药用于这次冲关。',cost:{},months:tier===3?120:240,startReply:tier===3?'你交代好收信与护法，按凝丹真解封住静室，开始收束周天。':'你将护婴丹交给护法安排服用时辰，封门专心孕育元婴。',check:{base:tier===3?25:20,skill:'array',scale:.12,stat:'insight',statScale:.15,items:{golden_pill:8,nascent_pill:8},failText:'出关时，护法发现你没能越过这一境界。冲关消耗的材料已经用尽，你需要先恢复受损的经脉。',failure:{stats:{health:-28,mind:-12}}}});
 }
 events.sect_rebuild=node('sect_rebuild','撤离的人等你定下去处','旧山门已经无法居住。留下的弟子、伤员和掌事聚在临时营地，带出的粮药只能支撑一段时间。他们愿意听你安排去处，账册和物资却仍由掌事与守库弟子共同看管。',[
  ch('lead','留下建立新的山门','先安排伤员、食宿和护阵，再商议谁负责各项差事。','你们修好住处和小型护阵，掌事核过共同物资，弟子开始在新山门生活。你被推为领事人，但每次调用公产仍须留下账目。',long(24,'你带众人核过水源与退路，把粮药先留给伤员，开始搭建住处。',action('rebuild',{route:'lead'}))),
  ch('delegate','帮助安顿，交给留下的人管理','先完成安置，再与你信任的掌事交接账册和传音方式。','营地安顿下来，留下的掌事接管账册和护阵。你交回保管的钥匙，带自己的行囊出门，约定收到急讯时再决定是否回来。',long(24,'你先安排住处和伤员，找愿意留下的人逐项交接，不把公产装进行囊。',action('rebuild',{route:'delegate'}))),
  ch('revenge','先安顿众人，再查袭击者','旧敌令印只能帮助核实来历，不能证明所有同行者都有罪。','众人已有安全住处，你将账册交给掌事，带上撤离时留下的令印，开始查袭击者的去向。',long(24,'你先安置众人，把公产交给掌事，再整理袭击者留下的令印。',{...action('rebuild',{route:'revenge'}),effects:{items:['old_enemy_seal']}})),
 ]);
 for(let i=0;i<3;i++)events['sect_council_'+i]=node('sect_council_'+i,['新山门先修哪一处','矿脉的收支有了争执','新弟子与守山的人'][i],['掌事带来账册：护阵缺阵石，药房缺药，弟子也需要住处。眼前物资无法同时办完这三件事，长老请你商议先后。','运料弟子送来矿脉收支，盟友要求分成，守山者担心把本门仅有的阵石也交出去。各方把约定摆在案上，请你提出办法。','一批年轻人到新山门求学，守阵弟子却已经轮值多日。掌事问你，是先扩建弟子院，还是把已有的人安顿好再招收新人。'][i],[
  ch('ward','先保住护阵与现有弟子','掌事核过八枚公库灵石，交给修阵者购置阵石。','修阵者按清单补好阵眼，掌事记下实际支出。新山门仍不富裕，但守山弟子终于能轮换休息。',long(36,'你和掌事逐项核过预算，先修护阵与现有住处。',action('council',{priority:'ward',publicCost:8}))),
  ch('teach','安排授业与药园，慢慢恢复生计','掌事拨出六枚公库灵石，先买药苗与修屋材料。','药园重新成活，长老按已有本事安排授业。账册记录了药材与食宿的实际支出，新山门开始有稳定差事。',long(48,'你请药师与教习列出能承担的课程，先修药园，不承诺所有弟子马上得到资源。',action('council',{priority:'teach',publicCost:6}))),
  ch('earn','先接修阵与护商差事，补回公库','由愿意出门的弟子接取差事，所得先用于山门食宿与修补。','掌事核过几年差事的收支，将扣除食宿与修补后留下的六枚灵石收入公库，没有作为你的个人报酬。',long(60,'你和掌事挑能承担的修阵与护商差事，先问清弟子愿不愿意外出。',action('council',{priority:'earn'}))),
  ch('leave','交接管理，离开一段时间','由愿意留下的掌事接管；随身只带个人所有的物品。','掌事和两名长老核完交接，你交回公产钥匙，只带自己的法器与行囊离开。新山门仍会沿传音路线联系你。',action('council',{priority:'leave'})),
 ]);
 events.sect_revenge=node('sect_revenge','旧敌的令印指向另一座山门','药商辨出令印所属的支队，却说袭击者也可能受另一位长老指使。旧敌有金丹守关，贸然上山会连累跟随者；你现在只知道驻地和一名经手人的名字。',[
  ch('investigate','沿药商与运料人的口供继续查','先弄清命令从哪里来，不带新弟子正面冲山。','你核出发令者与运料路线，将亲历者的指认保存下来。附近宗门愿意共同追责，旧敌无法再把袭击说成无人认领的争斗。',long(72,'你让新山门留下的人守好住处，独自沿商路核实令印和经手人。',action('revenge'))),
  ch('fight','带法器去截袭击者的支队','对方有守关修士，正面冲突可能死亡。','你击退驻地的支队，找回被掠的一部分公产。掌事登记了归还的物资，敌宗也知道了你的名字。',long(36,'你先核退路和支队换岗，准备截住确认参与过袭击的人。',{...action('revenge'),check:{base:32,skill:'sword',scale:.35,realmScale:4,failText:'守关修士截断退路，你没有离开这场斗法。',failure:{},failEnding:'battle_lost'}})),
  ch('return','带线索回去，先守住新山门','不把未查清的指使者当作已知仇敌。','你交回令印与地图，请守山者记住已确认的敌宗路线，暂时不再追击。',action('revenge')),
 ]);
 for(let i=0;i<4;i++)events['years_practice_'+i]=node('years_practice_'+i,'准备离开日常事务一段时间',s=>s.player.health<65?'护法查出经脉尚有旧伤，劝你交代外事，留一段完整时间恢复。住处和收信的人需要先安排好。':s.life.cultivation.wanted?'熟悉的药商说有人正在打听你的旧地址。你可以换到有遮蔽的小洞府练习，也可以留下处理眼前的事。':'手里的功法已经练过多年，再进一层需要完整的静修。掌事可以替你接收来信，你也可以先留在外面处理旧事。',[
  ch('retreat','交代外事，封门静修','多年练习会持续消耗已备补给；出关后再查修为和消息。','你解开静室封符，护法带来这些年按时送达的消息。练过的周天仍记在笔记里，你先核经脉与行囊，再决定下一程。',long(240,'你安排住处、补给和代收消息的人，封门开始这一程静修。',action('years',{mode:'retreat'}))),
  ch('recover','留在静室恢复伤势','只在经脉或身体尚未恢复时安排这段调养。','旧伤终于不再牵动经脉，药师撤下静室外的看护牌。你出门先问这些年住处与旧人的近况。',long(120,'你请药师核伤，停下强行运功，留在静室恢复。',{...action('years',{mode:'recover'}),available:s=>s.player.health<80,reason:'身体没有需要长期恢复的伤势',effects:{stats:{health:25,mind:10}}})),
  ch('hide','改换住处，隐去旧地址','先核能藏身的洞府，再安排不暴露地址的传话办法。','你在遮蔽洞府住过这一段时间，药商核过外面的追查消息。旧恩怨没有自动消失，但你可以从新的落脚点再作安排。',long(180,'你收起会暴露身份的信物，沿药商确认的路进入遮蔽洞府。',{...action('years',{mode:'hide'}),available:s=>s.life.cultivation.wanted>0,reason:'眼前没有确认的追查',effects:{stats:{mind:4}}})),
  ch('stay','暂不封门，留在外面','继续眼前的差事，不承诺现在进入多年静修。','你告诉代收消息的人暂时不用替你看守静室，先把外面的事办完。',action('years',{mode:'stay'})),
 ]);
 events.tribulation_prepare=node('tribulation_prepare','护法指出最后一程要备的东西','你已孕育元婴，旧经卷记下了最后渡劫的法门。护法说雷劫尚未降临，先要炼成避劫阵盘、配好护魂灵液，再选择远离住户的地点。即使备齐，也不能保证活着走过雷劫。',[
  ch('prepare','与护法炼阵、配药，寻找渡劫地','需要完成炼制与勘地，准备期间不会提前引来雷劫。','阵盘与灵液炼成，护法核过避劫地的退路，让守阵者远离雷云将起的位置。你仍可以决定是否真正引劫。',long(180,'你逐段核对阵法，培育护魂药材，和护法寻找不会波及住户的渡劫地。',{...action('tribulation'),effects:{items:['tribulation_array','tribulation_medicine']}})),
  ch('decline','不引最后雷劫，安排往后的生活','把已经练成的本事留给愿意接手的人。','你合上渡劫卷，请护法撤去炼制安排，先处理身边的人和未尽的事。',action('tribulation',{decline:true})),
 ]);
 const final=events.system_final;const dao=final.choices.find(o=>o.id==='dao');Object.assign(dao,{label:'带上已备阵药，前往渡劫地',hint:'护法已核过渡劫地，最终雷劫仍有死亡危险。',cost:{items:['tribulation_array','tribulation_medicine']},requires:{realm:4},available:s=>s.life.cultivation.progression.tribulationReady,reason:'尚未完成护法安排与阵药准备',months:36,deferEffects:true,startReply:'你告别留在住处的人，带上已炼成的阵盘与灵液，进入核过的渡劫地。',check:{base:24,skill:'array',scale:.18,stat:'insight',statScale:.12,failText:'最后的雷劫穿过阵盘，护魂灵液没能保住你的神魂。这一程止在雷云中。',failure:{},failEnding:'battle_lost'}});
 final.text=s=>s.life.cultivation.path==='mortal'?'住处与活计已经安顿，邻里来问你愿不愿意带年轻人学本事。你可以接下这份责任，也可以安排安静的余生。':s.player.realm<4?'这些年你结识的修士各有去处，仍有人来请你指点。你可以留在这里照看后来者，也可以交代好住处与遗物，放下奔忙。':'护法带来已经核过的阵药清单。是否走向最后雷劫，仍由你决定；留下授业或安排安静的余生，也有人愿意接手你的差事。';
}
