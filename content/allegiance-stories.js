const choice=(id,label,hint,reply,extra={})=>({id,label,hint,reply,...extra});
const node=(id,title,text,choices)=>({id,act:0,title,text,choices,cultivationOnly:true});
const clash=(base,failText,failEnding='battle_lost')=>({base,skill:'sword',scale:.45,realmScale:4,failText,failure:{},failEnding});
export function installAllegianceStories(events){
 events.road_turn=node('road_turn','坊市里两份陌生的功法',s=>'你在'+s.player.home+'附近的坊市遇到书贩。他卖的残卷夹着一张幽灯堂药铺的领书凭据：买卷的人可以去药铺问下一卷，但这不是入堂凭证。另一边，化成人形的狐族修士白苓在收购养脉草。她解释，自己学过一门让人借妖血淬体的功法，想找人一起照料受伤族人。'+(['orthodox','demonic'].includes(s.life.cultivation.path)?'你仍是原组织的弟子；功法借阅、月例和弟子牌都有登记。私下读书不等于已经背叛师门，正式转投他人则要处理这些关系。':'你可以先了解条件，再决定是否接受新的老师。'),[
  choice('keep','不接新功法，继续自己的生活','只听坊市见闻，保留现有修炼办法。','你没有买卷，也没有答应白苓，继续原来的修炼。'),
  choice('dark','买残卷，去药铺问清来历','残卷附着领书凭据；买下后先问门规，不会立刻成为魔修。','你买下残卷，按凭据找到药铺。柜上人约你夜里详谈。',{cost:{stones:8},effects:{flags:{darkFragment:true}},next:'dark_invitation',system:{inquiry:'demonic'}}),
  choice('loose','结清组织内的借用，独自修行','先问清哪些法器和卷册属于组织；离开需要自己找收入。','你开始清点借来的物品，向管事说明离开打算。',{next:'departure_terms',system:{inquiry:'loose'}}),
  choice('beast','去山外落脚处，看族人伤势','先了解功法与照料要求；还没有答应修炼妖身。','白苓带你去落脚处，介绍了受伤族人和所用药物。',{next:'beast_invitation',system:{inquiry:'beast'}}),
 ]);
 events.dark_invitation=node('dark_invitation','药铺后堂的入堂条件',s=>'接引人顾魇认出残卷上的药铺印记，拿出后半卷。他说幽灯堂能教你禁术，但要先替药库看炉半年，再登记弟子牌。堂规写着：私逃者须归还卷册，掌握秘密的人还可能被抓回审问。你看见后堂地牢的钥匙挂在他腰间。'+(s.life.cultivation.path==='demonic'?'你本来就是幽灯堂的人；这次能申请的是另一处药库的功法。':'你还可以带走自己的残卷，拒绝入堂。'),[
  choice('accept','答应看炉，试学后半卷','先做半年差事。完成后还可以拒绝正式入堂，旧师承不会自动改变。','半年看炉结束，你学完试读章节，顾魇拿来了入堂名册。',{months:6,deferEffects:true,startReply:'你搬进药铺客房，开始轮值看炉；现在还没有登记为幽灯弟子。',next:'dark_oath',system:{trial:'demonic'}}),
  choice('refuse','拒绝入堂，带残卷离开','不把原来的师门、住处和家人交给对方登记。','你拒绝看炉，带着买来的残卷离开。',{system:{cancelInquiry:true}}),
 ]);
 events.dark_oath=node('dark_oath','顾魇把弟子牌放在你面前','试学结束。顾魇要求你交代旧师门，并登记能找到你的住处。他说入堂后由堂中授业、发月例，但私传功法、帮助囚犯和带卷私逃都受惩处。你看见一名欠药的弟子被押去地牢。登记并不是领一本书那么简单。',[
  choice('join','登记入堂，接受幽灯堂授业','这一步才正式转为魔修。登记人知道你的来历；旧师门须有线索才能查到。','顾魇登记了你的来历，你正式领取幽灯弟子牌，开始按堂中功法练习。',{system:{path:'demonic',registeredTransfer:true,cancelInquiry:true}}),
  choice('leave','放弃登记，离开药铺','归还试读卷，保留自己买来的残卷和原有修炼道路。','你还了后半卷，没有领取弟子牌，离开药铺。',{system:{cancelInquiry:true}}),
 ]);
 events.beast_invitation=node('beast_invitation','白苓的族人住在山外','白苓是筑基妖修，擅长疗伤和藏匿气息，族人却在猎杀中受伤。她拿出祖传淬体功法：人类也能借少量妖血逐步锻炼身体，但须先用药草试练，不能直接变成妖族。她愿意教你，条件是照料族人半年，再一起决定是否结为师徒。',[
  choice('help','帮忙养伤，先试药草淬体','先相处半年，试练不改变师承；身体不适就停止。','半年后，白苓的族人伤势稳定，你也完成了基础试练。',{months:6,deferEffects:true,startReply:'你留下帮忙换药、采草，在白苓照看下试练基础淬体法。',next:'beast_acceptance',system:{trial:'beast'}}),
  choice('leave','只交换药草，不学新功法','不许诺师徒关系，也不尝试妖血淬体。','你交换了所需药草，向白苓辞行。',{system:{cancelInquiry:true}}),
 ]);
 events.beast_acceptance=node('beast_acceptance','要不要拜白苓为师','白苓说基础试练只证明你能学，后面的妖血淬体还需要三年。拜师后，你要和族人守住栖地，面对猎妖修士；原先组织的法器和卷册也不能随意带走。这是改换生活和修炼办法，不是白得一副妖身。',[
  choice('join','拜白苓为师，开始妖血淬体','在她照看下修炼三年，完成后走妖修道路；原灵根与境界仍保留。','三年的淬体完成，你能收敛新生的妖气，正式随白苓守护栖地。',{months:36,deferEffects:true,startReply:'你拜白苓为师，留下药物与回话地址，开始逐步适应妖血淬体。',system:{path:'beast',teacher:'白苓',registeredTransfer:true,cancelInquiry:true}}),
  choice('leave','结束试练，沿原来的路走','已学到的见闻留下，师承和身体不发生新的改变。','你没有继续妖血淬体，向白苓与族人辞行。',{system:{cancelInquiry:true}}),
 ]);
 events.departure_terms=node('departure_terms','离开前，管事要你清账',s=>s.life.cultivation.path==='demonic'?'顾魇拿来借阅簿，要求归还后半卷、交十二灵石药钱。他说不会让知道地牢位置的弟子随意离开。门口两名炼气修士正在看守，你不知道堂主会不会批准。':s.life.cultivation.path==='orthodox'?'许执事核对借阅簿：你要归还宗门卷册，交十二灵石补足材料费用，交回弟子牌。自己的行囊和家传物不在借用清单里。':'你清点租屋和药铺的欠账，离开前要付十二灵石结清借用材料。自己买的物品仍属于你。',[
  choice('settle','按清单归还卷册、结清材料钱','支付十二灵石。幽灯堂仍可能把离开申请当作审问理由。','你交回借用卷册与材料钱，等待管事处理离开申请。',{cost:{stones:12},system:{requestDeparture:true}}),
  choice('secret','假称外出买药，带行囊偷走','借用簿仍有你的名字。点名缺席、查到路线后，管事才可能追查。','你借买药的机会离开，没向管事交回借阅记录。',{system:{path:'loose',offense:'带着未归还的借阅卷册离开，点名时被发现缺席'}}),
  choice('stay','暂不离开，继续现有差事','先保留现有住处与修炼办法，放下这次离开申请。','你暂时留下，管事收回清单。',{system:{cancelInquiry:true}}),
 ]);
 events.system_warrant=node('system_warrant','旧账沿着商路找来了',s=>'坊市药商认得你，今天替来人带路。对方拿着'+(s.life.cultivation.trackedEvidence?.description||'药库领用记录和当事人的证词')+'，要求你清账。'+(s.life.cultivation.trackedEvidence?.authority==='demonic'?'顾魇派来的师兄筑基修为，带着拘魂索。他称这是堂主命令，却不肯给你看处罚书。':'来人出示组织的印记和领用副本，但也想让你独自承担整批缺额。')+' 他们已经堵住院门；你可以交钱核对，也可以跟他们回去，或设法逃离。',[
  choice('settle','当着药商的面交钱，核对旧账','付十二灵石，请药商见证；对方可能收手，也可能拿钱后强行带你回去。','药商核对收据，来人收下赔偿，暂时撤走。',{cost:{stones:12},check:{base:60,skill:'array',scale:.3,failText:'来人收了钱却拒绝出具收据，说堂中还要审问。他们逼药商退开，把你带到临时审问院。',failure:{stats:{mind:-4}}},system:{settleWanted:true,coercivePay:true}}),
  choice('explain','拿出自己的记录反驳','查出经手人能减少责任；记录不全时，对方仍会坚持原要求。','药商核对你保留的记录，来人撤回一部分指控。',{check:{base:45,skill:'array',scale:.4,failText:'你拿出的记录缺了关键签名，来人不接受这份说法，旧账仍未解决。',failure:{stats:{mind:-4}}},system:{reduceWanted:true}}),
  choice('submit','先顺从，跟他们回去见管事','可能被关押审问。服从并不保证管事肯公正处理；也可到场后找逃走机会。','你暂时没有反抗，跟来人到临时审问院。他们关上门，收走出口钥匙。',{next:'custody_terms',system:{detain:true},available:s=>!s.decisions.some(d=>d.event==='custody_terms'),reason:'你已经见过这处审问院，来人不再接受自愿回去的说法'}),
  choice('flee','丢下住处，从后巷突围','来人已封住正门。带走随身物品，留在屋里的财产可能失去；突围可能死亡。','你打破侧门封符，绕过追捕者，放弃了旧住处。',{check:clash(48,'拘魂索缠住了你的手脚。你没能走出这条巷子。'),effects:{property:{dwelling:'lost'}},system:{relocate:true,evade:true}}),
 ]);
 events.custody_terms=node('custody_terms','处罚书背面的用途',s=>s.life.cultivation.path==='demonic'||s.life.cultivation.trackedEvidence?.authority==='demonic'?'顾魇只让你看处罚书正面：去地火室偿债。门后两名杂役低声说，那里的阵炉能把修士的气血炼进灯芯，进去的人极少回来。顾魇筑基修为，守卫是炼气修士，夜里运药会开一次侧门。':'管事说你须在封灵矿井服役。账册上的材料钱已经交过，处罚书却仍把你列为欠债人。一名看炉杂役说，井下护阵要抽走服役修士的法力，死伤也算偿债。管事比守卫修为高，夜里运药时会开侧门。',[
  choice('accept','接受服役，跟守卫进去','有人提醒阵炉会抽走气血。管事许诺还债后放人，但你无法核实；可能死亡。','你撑过阵炉，带伤离开。所谓偿债没有换回失去的气血。',{months:6,deferEffects:true,startReply:'你跟守卫进入服役处，阵炉开始抽取气血；管事没有交给你离开的凭证。',check:clash(25,'阵炉抽干了你的气血，管事把死亡记作一笔已偿债。'),effects:{stats:{health:-35,mind:-12}},system:{release:true,settleWanted:true,relocate:true}}),
  choice('fight','趁守卫开门，拼死夺钥匙','避开管事，先打倒守卫抢侧门钥匙；冲突可能惊动更高阶修士，可能死亡。','你夺下钥匙冲出侧门，仍听见管事在身后下令追赶。',{check:clash(43,'守卫拖住了你，管事赶来封住经脉，你没能活着离开。'),system:{release:true,evade:true,relocate:true},effects:{stats:{health:-16}}}),
  choice('pretend','低头认错，申请去药房做苦役','先让管事相信你会偿债。药房运药会开侧门，但需要等真实机会。','管事把你送去药房搬药，守卫每天点名。你记下了车队和换岗时间。',{months:3,deferEffects:true,startReply:'你认下差事，在守卫看管下搬药，悄悄观察车队与侧门。',next:'custody_escape',system:{detain:true,escapePreparation:true}}),
 ]);
 events.custody_escape=node('custody_escape','运药车停在了侧门','夜里，药车要运走废渣。守卫正核对药箱，一个相熟的杂役愿意留半车空位，却要八灵石。他也可能拿钱后告密。你已经记住侧门封符的位置，可以借药草灰遮气息，或抢车强闯。天亮前守卫会再次点名。',[
  choice('bribe','给杂役八灵石，藏进废渣车','藏身车里避开正门守卫；杂役是否守口未知，被搜出来可能死亡。','药车经过侧门，你在荒坡下车，循旧商路逃离。',{cost:{stones:8},check:{...clash(56,'守卫掀开药车，抓住了藏在废渣中的你。')},system:{release:true,evade:true,relocate:true}}),
  choice('stealth','用药草灰遮气息，绕过封符','按这几个月观察的换岗空隙潜行；封符尚未试过，失败可能死亡。','你沿排水沟绕过封符，在换岗前逃出了药院。',{check:{base:45,skill:'array',scale:.5,failText:'封符在你经过时亮起，守卫堵住排水沟。你没有逃出去。',failure:{},failEnding:'battle_lost'},system:{release:true,evade:true,relocate:true}}),
  choice('rush','抢下药车，撞开侧门','不等杂役帮忙，直接与守卫斗法；高阶管事可能追来，可能死亡。','你撞开侧门驾车冲下山，身后有人敲响警钟。',{check:clash(40,'守卫打断车轴，管事的法器从院内落下。你没能冲出山路。'),system:{release:true,evade:true,relocate:true},effects:{stats:{health:-18}}}),
 ]);
 events.system_pursuit=node('system_pursuit','又有人认出了你的旧法器',s=>'你在坊市修理法器时，店主认出器上的旧编号，把消息交给拿着旧卷宗的寻人者。'+(s.life.cultivation.trackedEvidence?.description||'过去的赔偿和逃离记录')+'仍在他们手里。他们不只要结账，还盯着你如今的行囊。你能请当地药商见证，也能假意回去，或与他们斗法。',[
  choice('pay','请药商见证，交钱换结案收据','付十六灵石，只结清有凭据的账；收据留在当地，降低再被勒索的机会。','药商登记了交还款物，对方出具收据离开。',{cost:{stones:16},system:{settleWanted:true}}),
  choice('fight','先下手击退来人','对方已经备好法器；你若出手，附近修士会听见斗法，可能死亡。','你击退来人，坊市守卫也记下了这场斗法。',{check:clash(40,'对方的法器击碎护身符，你没能离开这场冲突。'),system:{evade:true}}),
  choice('leave','交出有争议的法器，带其余行囊搬走','舍弃护身法器换离开的空隙；旧账未必完全消失。','你留下护身法器，趁他们清点时离开，搬到别处。',{effects:{remove:['ward']},system:{reduceWanted:true,relocate:true,evade:true}}),
  choice('submit','暂时答应，跟他们回去见管事','先避免街头斗法，但被带走后可能遭关押，也要寻找自己的退路。','你跟他们来到审问院，守卫收起了侧门钥匙。',{next:'custody_terms',system:{detain:true},available:s=>!s.decisions.some(d=>d.event==='custody_terms'),reason:'你已经见过这处审问院，来人不再接受自愿回去的说法'}),
 ]);
}
