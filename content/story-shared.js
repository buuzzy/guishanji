import {ROOTS,PATHS,GEOGRAPHY} from './cultivation-world.js';
import {canCultivate,hasMana,rootLabel,route} from '../packages/adventure/story-shared.js';
const c=s=>s.life.cultivation;
const r=s=>c(s).story10;
const choice=(id,label,hint,reply,data={})=>({id,label,hint,reply,...data});
const node=(id,title,text,choices)=>({id,title,text,choices,act:0,cultivationOnly:true});
const long=(months,startReply,data={})=>({months,startReply,deferEffects:true,...data});
const value=(x,s)=>typeof x==='function'?x(s):x;
const mortal=s=>!canCultivate(s);
const homeName=s=>GEOGRAPHY.find(g=>g.id===s.birth.continent).name;
const oldFriend=s=>c(s).progression.names['阿宁']||'阿宁';
const marks=s=>c(s).network.marks;

export function installShared(events,chains){
 events.root_result.text=s=>'许执事在测灵簿上写下“'+rootLabel(s)+'”。'+(ROOTS[s.player.root].grade<0?'测石没有亮起，执事不肯发修炼弟子牌。外院缺人搬粮、洗药，愿供食宿，但不承诺教你引气。':' '+ROOTS[s.player.root].description+' 执事按资质分配住处和课程。');
 const root=events.root_result.choices;
 root.find(o=>o.id==='servant').reply=s=>mortal(s)?'你领到外院杂役木牌，住进粮房旁的通铺。管事教你认货签、搬药篮，丹房和练法室不向你开放。':'你领到杂役木牌，住在外院。执事让你先做杂务，授业名额还要另外争取。';
 root.find(o=>o.id==='servant').hint='外院供饭与住处，先做搬粮、洗药的活；留下不等于被收为修炼弟子。';
 root.find(o=>o.id==='loose').label='去坊市找活，再问测灵的事';
 root.find(o=>o.id==='loose').reply='你到坊市找了一份洗药的活，住在药铺后屋。掌柜只教识药，是否能引气还要另请药师核实。';
 root.push(choice('home','带测灵记录回家','不再等山门名额，先回家谋生。','你把测灵记录带回家，告诉亲人自己不再等山门的名额。屋里的活还等着做，家人替你留下了一副碗筷。',{system:{path:'mortal'}}));
 events.root_review=node('root_review','药师愿意再替你测一次','药师看过你先前的测灵记录，说旧测石有时认不出微弱灵息，但也有些人确实不能引气。他愿换一块小测石，再带你试基础吐纳。结果未明，他没有先收你的拜师钱。',[
  choice('test','留下复测，再试基础引气','测石与经脉都要检查；这不是保证能改命的丹药。','药师先查测石，再带你按最基础的口诀试引气。',{...long(6,'你住在药铺客房，跟药师试测与吐纳。结果要等他核对测石和实际练习。')}),
  choice('leave','不再求测，先把日子过好','没有测出灵根之前，不照陌生口诀强行运气。','你谢过药师，收好旧测灵记录。'),
 ]);
 const first=events.first_method;
 const originalText=first.text;
 first.text=s=>mortal(s)?'外院管事见你做完当天的活，给你看三样不用法力的本事：木剑防身、认字算账、辨药洗药。修士练法的院门仍关着，他没有把这些手艺说成仙法。':value(originalText,s);
 for(const o of first.choices){const reply=o.reply,available=o.available;o.reply=s=>mortal(s)?({sword:'你用木剑练站姿和格挡，先学躲开来招。院里的剑气练习由修士进行，你没有跟着催剑。',array:'管事教你读货签、写账目和辨认门上的禁符。你能看懂一些符纹，却不能凭自己法力布阵。',alchemy:'药师教你认叶、洗药和包扎，让你先用普通柴火煎药。丹炉仍由能运转法力的弟子掌管。'})[o.id]:value(reply,s);o.available=s=>mortal(s)||!available||available(s);}
 events.mortal_assessment=node('mortal_assessment','要挑一个带新人的熟手',s=>c(s).path==='orthodox'?'粮房管事把三批粮药摆在院里，要挑一个熟手带新杂役。考的是识药、货签和算账，不能动用法术。做得好可管外院交货与食宿，仍不是修炼弟子。':'药铺掌柜要你独自核一批货。药篮里夹着两包长得相似的草叶，账上还少了一笔运费。考核做得好，可以带新学徒，掌柜不会因此承诺仙法。',[
  choice('medicine','先辨药，再逐包核货','把止血草与毒草分开，按实际货签核对。','你把认不准的草药留给药师，没有混进交货的药篮。',{check:{base:45,skill:'alchemy',scale:.5,failText:'你把两包相似草叶分错了。药师重新验货，掌柜让你继续跟人做活，没有交出钥匙。',failure:{stats:{mind:-2}}},effects:{stats:{stones:1}}}),
  choice('ledger','逐笔对账，请送货人作证','让经手人说明漏掉的运费，不擅自抹平账目。','你找到漏写的运费，让送货人在账边按了手印。',{check:{base:45,skill:'array',scale:.5,failText:'少了一张货签，账目仍对不上。管事叫你先学会逐笔留下记录。',failure:{stats:{mind:-2}}},effects:{stats:{stones:1}}}),
  choice('decline','继续做熟悉的活，不争这把钥匙','保留住处和工钱，不接带新人的责任。','你把钥匙推回桌上，次日仍按原来的工簿领活。'),
 ]);
 const mundane=[
  ['新杂役求你替他瞒下破粮袋','新人搬粮时摔破一袋，怕被扣工钱，求你别报。你看见粮散在干净石地上，尚能收起，但破袋与损耗还要给管事说明。',[
   choice('help','帮他收粮，一起说明损耗','把能收回的粮先装好，不把损失推给别人。','你和新人收起散粮，管事按实际损耗扣了一小笔工钱，没有把整袋粮算成丢失。',{effects:{stats:{empathy:2}}}),
   choice('report','叫管事来，不替他隐瞒','让管事看见现场，新人可能怪你。','管事来验过粮袋，让新人补缝两天。你没有替他承担赔偿，也没添上未发生的损失。'),
   choice('take','藏下一把粮，假称都撒进泥里','搬粮的人看过现场，账目不一定瞒得住。','你把一把粮藏进袖里。新人发现数量不对，往后不再肯与你一起领活。',{effects:{stats:{empathy:-3}}}),
  ]],
  ['同批入门的人御剑离山了','一个同批上山的弟子从练法院出来，已经能驾剑低飞。他在外院停下，问你愿不愿随货车去坊市做活。路上由他护送，到城里仍要靠手艺谋生。',[
   choice('go','随货车去坊市，另找活计','乘车出山，护送到城门为止。','你随车到坊市，租下药铺后的一张床。护送弟子回了山门，你从验货与洗药重新接活。',{...long(6,'你交接外院的活，跟货车沿商路去坊市。'),system:{path:'loose'}}),
   choice('stay','留在外院，把手艺练熟','不随他远行，继续已有住处和差事。','你帮他把货箱系稳，目送剑光离开。天黑前，外院还有一批药篮等你验过。'),
   choice('home','回家看看，暂不求仙','向管事交清自己的活，再沿商路返乡。','你带工簿与积下的生活钱返乡，家人听你讲了山门里的日子。',{...long(12,'你向管事交清活计，随回乡商队走。'),system:{path:'mortal',familyVisit:true}}),
  ]],
  ['旧屋要不要留给晚辈','家中传来消息，晚辈准备修旧屋，想请你说清留下的工具与手艺笔记由谁保管。他们没有来问仙法，只想把日子过稳。',[
   choice('teach','把手艺笔记托商队送回','只教自己实际会的认药、算账与修补。','商队带回收信人的手印。晚辈照笔记修好第一只药柜，把难懂的字留给村塾先生核对。',{...long(6,'你整理实用的手艺页，托回乡商队交给晚辈。')}),
   choice('visit','交清活计，亲自返乡','沿已确认商路回去，不凭空到家。','你在旧院里教晚辈修工具、认草药，把用得上的本事留给他们。',{...long(12,'你安排返乡，与家里的人当面说。'),system:{familyVisit:true}}),
   choice('leave','回信说明工具归谁，继续现有生活','不安排远行，给家中一个明确答复。','你在回信里写清工具归谁，托商队带回。旧屋有人照看，你仍留在现在的住处。'),
  ]],
 ];
 mundane.forEach(([title,text,choices],i)=>events['mortal_life_'+i]=node('mortal_life_'+i,title,text,choices));

 installEcho(events);
 installBranches(events);
 // Explicit capability contracts. Knowledge and mundane work remain usable.
 for(const [id,event] of Object.entries(events))for(const o of event.choices){
  const op=o.system||{};
  const allSpiritual=/^(breakthrough_|advance_material_|years_practice_|network_(method|bottleneck|volume|archive|senior)|selection_)/.test(id);
  const spiritual=allSpiritual||op.method||op.breakthrough||op.retry||['learnManual','bloodLearn'].includes(op.revision)||id==='beast_acceptance'&&o.id==='join'||id==='thin_root_return'&&o.id==='learn'||id==='thin_root_price'&&o.id==='accept';
  if(spiritual&&!['wait','skip','withdraw','decline','leave','keep','escape'].includes(o.id))o.requires={...(o.requires||{}),spirit:true};
  const mana=id==='world_raid'&&o.id!=='escape'||id==='family_home_ambush'&&o.id==='fight'||id==='system_pursuit'&&o.id==='fight'||id==='system_final'&&o.id==='dao'||id==='custody_escape'&&o.id==='rush'||id==='custody_terms'&&o.id==='fight'||id==='system_warrant'&&o.id==='flee';
  if(mana)o.requires={...(o.requires||{}),mana:true};
 }
 events.world_raid.choices.find(o=>o.id==='escape').reply='你随撤离的人走上商路，带走能背动的私人物品。旧住处留在战火中，到了城外才重新找地方过夜。';
 events.system_final.text=s=>mortal(s)?'这些年，你靠认药、算账和修补在这里过活。年轻人来问你愿不愿教他们，旧屋与工具也该留下明确的去处。你可以继续带人做活，或交清事情，安顿余生。':'多年的奔波暂时停下，手头没有未赴的约。后来的修士来请教，旧住处也有人愿意照看。你可以留下授业，或交代遗物；只有备齐护法与阵药的人，才谈得上最后一次引劫。';
 delete events.network_echo;
}

function installEcho(events){
 const intro={
  friend:s=>'商队从'+homeName(s)+'带来一封署名'+oldFriend(s)+'的信。'+(marks(s).friend_witness?'你想起当年，他替病母领赊粮被人追赶，是你带他去粮铺查清。':'你想起当年，他替病母领赊粮被人追赶，是你带他躲进柴棚。')+'他后来跟运药车谋生，如今托商队问你的近况。信里附了药铺地址，希望有机会见一面。',
  relic:s=>'商队带来修器匠的消息。'+(marks(s).relic_route?'他翻出当年替你留下的铜匣印记拓本，发现旧书摊的一页残卷画着相似的记号。':'他记得你家旧屋发现的铜匣，请你把保存的旧页或渡口图拿来对照，不能只凭记忆认定残卷有关。')+'匠铺仍在'+homeName(s)+'的旧商路旁。他只认出记号相似，还不知道口诀真假。',
  teacher:s=>marks(s).herbs?'童年教你辨药的余衡托商队送来一张药铺地址。他现在在那里验药，想知道你这些年是否仍记得辨认草叶。信里没有许诺收徒，只说可以到铺里谈谈。':marks(s).teacher_notes||marks(s).teacher_route?'商队送来童年授业者的新落脚地址。你对照旧笔记背面的字，认出他当年留下的记号。他愿意再见你，却没有在信里许诺新的传承。':'当年你提醒过的商队又有人走这条路。领队托人介绍一间药铺，说那里缺认货签的帮手。药师与你并不相识，须到铺里谈条件，不能把商队的推荐当作拜师凭证。',
 };
 const titles={friend:'捡柴伙伴托商队来信',relic:'铜匣上的记号有了新线索',teacher:'旧联系人留下新的去处'};
 for(const kind of Object.keys(intro)){
  const id='echo_'+kind;
  events[id]=node(id,titles[kind],intro[kind],[
   choice('follow',kind==='friend'?'回信核对旧事与药铺地址':kind==='relic'?'托商队核对匠铺与记号':'核对来信与落脚地址','先回信问清消息来源，不直接答应拜师。','你写下能核对的旧事，请商队把回话带到信上的地址。',{...long(6,'你托商队核对消息来源，眼下还没有出发拜访。')}),
   choice('wait','留下地址，安顿后再问','保存联系人，过一段时间再安排核实。','你把地址夹进旧册，托商队说眼下还有活计，稍后再回话。'),
   choice('forget','谢过传话人，不安排这次拜访','托商队带一句谢意，这次不赴约。','你托商队报平安，没有答应这次拜访。'),
  ]);
  events[id+'_check']=node(id+'_check','回信说清了见面的地方',s=>kind==='friend'?'回信核对了当年粮铺的事，'+oldFriend(s)+'在末尾写清药铺和接货人的名字。你还没见到他，若要重逢，须先交接手头的活，再沿商路去。':kind==='relic'?'匠铺回信附了记号的简单摹图，和你记得的铜匣纹路相近。匠人请你带能取得的旧页或图去对照，真假与来历还不能靠一封信定下。':'传话商队核过药铺门牌和接待者。铺里愿让你来谈一次，但没有给修炼名额；已学过的本事能否用上，要见面才知道。',[
   choice('visit','交接活计，沿商路前往','先确认路线能走；到场之后再谈条件。','你抵达信上所写的药铺或匠铺，先向接待的人说明来意。',{...long(12,'你收好回信，交接手头的活，按已确认的商路赶去。'),available:s=>!!route(s,c(s).continent,r(s).echo?.origin||s.birth.continent),reason:'前往旧联系人的商路目前不通',system:{echoTravel:true}}),
   choice('decline','知道地址就够了，暂不再追寻','托传话人告知对方，这次不再约见。','你收好回信，告诉传话人不再约这次见面。'),
  ]);
 }
 events.echo_resume=node('echo_resume','旧册里的地址还没有用过',s=>'你安顿下来，翻到之前保存的'+({friend:'旧友来信',relic:'铜匣线索',teacher:'联系人地址'})[r(s).echo.kind]+'。之前只是留下消息，并没有见面或拿到新功法。如今可以继续问，也可以明确回绝。',[
  choice('continue','重新托商队问消息','接着未办完的核实或拜访安排，不领取过去没取得的奖励。','你托商队说明现在的落脚点，接着之前未办完的事。'),
  choice('forget','回信谢绝这次约见','让传话人转达谢意，不再劳烦对方等候。','你回信说明不再安排拜访，把旧信收好。'),
 ]);
 events.echo_friend_visit=node('echo_friend_visit','药车旁站着当年的伙伴',s=>oldFriend(s)+'在药车旁等你，先提起那年病母的粮袋。你们终于认出了彼此。他如今靠运药过活，药铺只教识药和验货，不会教御剑。'+(c(s).network.method?'得知你已有师承，他改问能否帮忙辨一批混货，没让你从头做学徒。':'掌柜愿让你看看验货的活，但工钱和住处还要当面谈。'),[
  choice('help','替他验一批货，再互留地址','只做会认的药，不擅自开方炼丹。','你把几包混货分开，交给掌柜复核。旧友与你互留了地址，往后传话不必再猜人在哪里。',{...long(6,'你留下帮他核货，先辨清自己认得的草药。'),effects:{skills:{alchemy:2},stats:{stones:1}}}),
  choice('talk','只叙旧，听他说这些年的生活','不答应拜师或新差事。','你们坐在货车旁谈到暮色落下。他讲起离开渡口后的活计，你也告诉他自己的去处。',{effects:{stats:{mind:2}}}),
  choice('leave','见过他后辞行，继续自己的路','重逢已经发生，不再接药铺的活。','你向伙伴辞行，带着自己的行囊离开药铺。'),
 ]);
 events.echo_relic_visit=node('echo_relic_visit','匠人把两处记号并排放好','匠人让你说清旧页从哪里来，再把残卷的摹图摆在旁边。两处记号像是旧时运药船的货印，并不能证明它们出自同一部仙法。书贩却想用“古宗传承”抬价，你可以让匠人继续对照，也可以到此为止。',[
  choice('compare','请匠人逐笔对照，不买传承许诺','查的是来历，不照残卷强行运气。','匠人查到相同货印曾在旧船籍里出现，只能确认与运药船有关。你留下核对记录，书贩没能把它说成完整仙法。',{...long(6,'你和匠人对照记号，再请旧船户查货印。'),effects:{stats:{insight:3}}}),
  choice('leave','收好旧页，结束这次查访','没有取得完整功法，旧物仍按实际保管。','你收好自己的记录，谢过匠人，没有为猜测中的传承买单。'),
 ]);
 events.echo_teacher_visit=node('echo_teacher_visit','药铺里谈的是具体的本事',s=>c(s).network.method?'接待者看过你已有的练习笔记，没有另许一份入门传承。他拿出两包混药，请你辨清能认出的部分；双方若愿意，往后可以交换实用的验货记录。':mortal(s)?'掌柜先问你会不会认药和写账。你说起测灵没有回应，他便收起吐纳口诀，改拿验货册给你看。铺里的活能养人，却不能保证让人修仙。':'接待者听过你的来意，拿出完整的基础口诀，让你先看能懂的字。能否正式运气仍要按你的资质授业，他没有让你把借页当成已学会的仙法。',[
  choice('notes',s=>mortal(s)||c(s).network.method?'交换验货笔记，学实用手艺':'请他核对入门笔记，再约授业','只取得实际核过的内容，不立刻改变境界和师承。','接待者圈出笔记里两处错误，教你如何核对来源。你留下自己的回信地址，约好下次有疑问再问。',{...long(6,'你留在药铺核对笔记，不把未学会的内容写成自己的本事。'),effects:{stats:{insight:2}}}),
  choice('leave','谢过接待者，不接新的安排','见面到此结束，保留原来的生活。','你交还借看的册页，带自己的笔记离开。'),
 ]);
 events.echo_resume_after_war={...events.echo_resume,id:'echo_resume_after_war',title:'战后重新翻开旧信'};
 for(const kind of ['friend','relic','teacher'])for(const stage of ['check','visit']){const id='echo_'+kind+'_'+stage;events[id+'_resume']={...events[id],id:id+'_resume',title:'重新安排：'+events[id].title,choices:events[id].choices.map(o=>({...o}))};}
}

function installBranches(events){
 const f=s=>r(s).facts.feud||{};
 events.sect_repair_0.text='外门许执事发现护山阵缺了一枚阵钉，同门沈砚最后进过仓库，巡夜簿却还有陌生人的记录。负责查案的严衡长老让你随巡阵弟子核对货签和钥匙，你是查访者，不负责判罪。';
 events.sect_repair_1.text=s=>'雨夜护山阵再次走火，师姐闻竹在阵台外发现旧图与现有阵钉不合。'+(r(s).facts.repairRecords?'你带着先前核对过的巡夜簿，知道有哪些人借过钥匙。':'你没查清全部巡夜记录，执事另让管库人保留账册。')+'长老只准进废阵室寻找旧图，不许你独自开启旧阵。';
 events.sect_repair_2.text=s=>'严衡长老把管库人的账册摆在石桌上，问你查访经过。'+(r(s).facts.repairPlan?'你带回的原图也放在桌边。':'原图没有带回来，师姐请巡阵弟子另找旧档。')+'长老先问你亲眼看见什么，再让管库人对照账册；失职者须到执法堂受审。';
 events.sect_repair_2.choices[0].reply=s=>r(s).facts.repairPlan?'严衡把原图与钥匙簿交给巡阵弟子复核，再按证词处置失职者。你完成了查访，堂院是否另给机会还须送来名签。':'你如实说明未带回原图，严衡没有把不完整的调查说成已查清。执法堂继续核查，只记下你实际提供的见闻。';
 const outside=events.sect_trial_0.choices.find(o=>o.id==='cautious');outside.system={...outside.system,stopChain:true};outside.reply='你留在谷口照看补给，接过返程弟子的粮袋与名单，没有深入兽群所在的山谷。补给差事结束，你回山门交差，未领深谷采药的奖赏。';
 events.loose_relic_2.text=s=>'你沿已走过的出口离开洞府，同行的嵇萝在补给点等你。'+(r(s).facts.relicDispute?'另一队也来核对药室中的约定，双方都不肯吃亏。':'你先前已退出药室，没有替争来的宝物作过分配承诺。另一队只来确认谁占过通道。')+'领队让各人打开行囊清点，洞中药物若没有带出，就不列进分配单。';
 events.loose_relic_2.choices[1].label=s=>r(s).facts.relicDispute?'请同行者核过争议，带无争议物品离开':'说明退出药室的经过，带行囊离开';
 events.loose_relic_2.choices[1].reply='你把实际经过说清，同行者核过各自的行囊。同行者确认无争议的东西仍归各人。你收好行囊，离开补给点。';
 events.loose_portal_2.title='界门旁准备回程';events.loose_portal_2.text='同行者在修过的阵台旁重新核星位，准备沿已走过的出口返回。守阵的白渡还在原大陆等消息，他要的是实际往返记录，不是未经查证的安全许诺。回程物资还须清点，众人还在异界，过阵之后才走回原来的坊市。';
 events.beast_war_1.text=s=>r(s).facts.evacuatedBeasts?'你先把幼兽送到山后，守在原水源旁的同族派人来报：凶兽堵住界门，修阵的人被困。你可以回去接应，也可以继续带人沿陆路迁移。':'凶兽堵在界门前，阵台被撞断。同族与受袭的人类阵师都想修出口，却怕另一边先逃。幼兽还需撤走，你要决定自己守哪一段路。';
 events.beast_form_1.choices[1].reply=s=>r(s).facts.formMedicine?'你停下用药，请同族守住洞口，等药师重新核过剂量。':'你没有服用未核过的替代药，请同族看好洞口，等药师查配方。';
 events.sect_feud_0.text='邻宗扣住本宗两名运粮弟子，称界碑旁的灵泉被侵占。外门许执事将两张标界不同的旧图交给你，让你随粮队送到会面处。执法长老严衡负责交涉，泉水归属由两宗长老商定；你可以送图、接粮，也可以私自采取更危险的行动。';
 events.sect_feud_1.text=s=>'两宗在界碑旁会面，被扣弟子由邻宗护卫带到石台边。严衡负责交涉，你只说明亲眼见闻。'+(f(s).evidence?'你先前找到的水位刻痕拓在纸上，严衡请你拿出来对照。':f(s).grain?'粮车已经接回，你没有亲自察看水槽；长老让你先照看等候的运粮弟子。':f(s).assault?'你截粮的事传到会面处，邻宗护卫指着你拔剑，长老还要先处理这场袭击。':'你没带回新的证据，严衡安排巡水弟子另查石槽。')+'邻宗一个护卫先拔了剑，石台边的人群乱起来。';
 const evidence=events.sect_feud_1.choices[0];evidence.label=s=>f(s).evidence?'交出旧图与刻痕，退到长老身后':'交还旧图，说明自己实际做过的事';evidence.reply=s=>f(s).evidence?'你把刻痕拓纸交给严衡，两宗长老压住弟子，先对照水线。':'你交还旧图，没有编造自己发现的水痕。严衡另派巡水弟子查水槽，叫你退到石台后。';
 events.sect_feud_1.choices[1].reply='邻宗长老暂准运粮弟子退到粮路旁等候，护卫仍跟在后面。你带人离开拔剑的人群，正式放人的约定还要等两宗谈妥。';
 events.sect_feud_2.text=s=>'巡水弟子把石槽和旧水线的记录送到石台。'+(f(s).evidence?'你的拓纸也放在旁边，几处刻痕能够对上。':'你没有参加这次查水，记录由巡水弟子提供。')+'两宗长老决定重新划分取水口，邻宗答应签约后放人。严衡请你只说明自己的经过，不让你替宗门承诺泉水份额。'+(f(s).assault?'邻宗另列了你袭击粮车或护卫的账，这件事并未随分泉消失。':'');
 const claim=events.sect_feud_2.choices[2];claim.available=s=>!!f(s).assault;claim.reason='没有发生过袭击，不能隐瞒一件不存在的事';
 events.loose_escort_0.text='余掌柜来到你接活的药铺，请你护送一具封棺。他是死者的叔父，想把被逐出宗门的侄儿送回故乡。商队怕旧仇追来，只肯送到有人接应的驿站。掌柜拿出剩下的盘缠与路线图，先问你愿意护送多远。';
 events.loose_escort_1.text=s=>r(s).facts.coffin?.at==='station'?'你按约把棺送到驿站，掌柜在这里等家人接应。一个持刀修士来查棺，说死者偷了宗门功法。掌柜拿出血字反驳，双方都没有旁证。你已完成送到驿站的委托，可以作证，也可以离开。':'你随棺车来到桥头，一名持刀修士拦住去路，说死者偷了宗门功法。余掌柜拿出临终血字，说侄儿替同门顶罪；两人的说法都还没有旁证。桥脚可绕行，却不能带车下去。';
 events.loose_escort_1.choices[1].label=s=>r(s).facts.coffin?.at==='station'?'留棺在驿站，带掌柜避开争执':'弃车走桥脚，先带掌柜避开';
 events.loose_escort_1.choices[1].reply=s=>r(s).facts.coffin?.at==='station'?'你请驿站见证人留下棺车，带掌柜退到后院，没有把棺说成已经送回故乡。':'你与掌柜走下桥脚，棺车留在桥头，无法随你们一起绕过水流。';
 events.loose_escort_2.text=s=>'掌柜托商队把途中消息送回故乡，亲人在渡口挂起白灯。'+({station:'棺仍由驿站见证人看管，亲人须另派人去接。',bridge:'棺车留在桥头，亲人还不知道是否能接回。',road:'棺车到了故乡，亲人先核对封符和随车的人。'})[r(s).facts.coffin?.at||'road']+'你要说明亲眼看过的事，临终血字不能单独证明旧案清白。';
 // A decision to stay outside or stay behind ends the expedition instead of
 // forcing the player into a later room or across a portal.
 for(const id of ['loose_relic_0','loose_portal_0']){
  const o=events[id].choices.find(o=>o.id==='cautious');o.system={...o.system,stopChain:true};o.reply=id==='loose_relic_0'?'你留在洞外看潮水，记下入口何时被淹，没进入药室。探洞的人自行准备下一次出发，你没有领取洞中宝物。':'你留下协助看守旧阵，等探路队回话，没有跨过界门。修阵差事结束，你回到原来的住处。';
 }
 events.loose_portal_0.choices.find(o=>o.id==='selfish').system.stopChain=true;
 events.dark_method_0.text='堂中药师宁素检查你学过的禁术，指出下一段要以精血养脉。她并不掌地牢，只能提供兽血样本或试草药配方。管库师兄顾魇掌着取药与地牢领用签，愿放你去取囚犯的血。你知道囚犯是被抓来的修士，这不是无人的药材。';
 events.dark_method_1.text=s=>r(s).facts.bloodSource==='herbs'?'你留在药房试草药配方，没有取人血或兽血。宁素发现一味药使胸口发闷，要求先停药查剂量。顾魇仍劝你换摄血法，你尚未答应。':'取血法练过一段时间，胸口开始疼，宁素查到行气与用量不合。'+(r(s).facts.bloodSource==='prisoner'?'地牢里被取血的人已经衰弱，继续取血可能让他死去。':'你先前用的是兽血，药师劝你先停下，不能拿囚犯的命来试药。');
 events.dark_method_1.choices[2].available=s=>r(s).facts.bloodSource==='prisoner';events.dark_method_1.choices[2].reason='先前未取囚犯的血，不能继续一件未发生的事';
 events.beast_form_1.text=s=>r(s).facts.formMedicine?'你按药师所教试了换来的药，夜里却难以控制妖身。同族守住洞口，药师要看用量记录，先查清是药性还是剂量出了问题。':'你没有取得化形草。药师让你先看替代药的配方，还没让你服药；同族在洞外守着，担心你急着试未核过的药。';
 events.beast_form_1.choices[2].available=s=>!!r(s).facts.formMedicine;events.beast_form_1.choices[2].reason='还未取得并服用化形药，不能继续加量';
}
