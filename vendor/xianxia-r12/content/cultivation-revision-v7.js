const choice=(id,label,hint,reply,extra={})=>({id,label,hint,reply,...extra});
const additions=[
 {id:'sect_feud',path:'orthodox',age:26,realm:1,context:'home',stages:[
  ['山下的弟子被扣住了','邻宗扣下运粮的外门弟子，称渡云宗侵占了界碑内的水泉。许执事拿出两张相互矛盾的旧图，严衡要派人去会面。扣押者只肯在界碑旁放行粮车。',
   ['带旧图去界碑旁交涉','先听双方说清哪条水路有争议；对方可能拒绝放人。','你在界碑旁找到洪水冲移过的石槽，留下两宗都认得的水位刻痕。'],
   ['先沿旧路接回粮车','只去双方同意放行的粮路，不闯扣押弟子的营地。','粮车沿旧路回到山下，被扣弟子仍等着两宗会面。'],
   ['截走邻宗粮车逼他们放人','粮车有持剑弟子护送，强夺会把争水变成流血冲突。','你截走一车粮，对方把运粮弟子也列为参与袭击的人。']],
  ['会面时有人先拔了剑','邻宗长老指认旧图被改，外门弟子争吵起来。严衡挡在两宗之间，却命你交出找到的刻痕。你认得一名拔剑者正是绘图弟子的师兄。',
   ['把两张图与刻痕交给长老','证据可以当场对照，但近处已有拔出的剑，争执可能伤人。','两宗长老压住弟子，让刻痕与旧图先摆上石台对照。'],
   ['护着被扣弟子先退到粮路','不争谁先服软，沿已经放行的粮路撤开，避开两宗持剑的人群。','你将弟子带到粮车旁，交涉留给长老，没再被卷进拔剑的人群。'],
   ['趁混乱斩伤绘图弟子的师兄','你想用对方的血逼出供词，但两宗都有人持剑在旁。','对方倒地，两宗的护卫同时把目光转向你。']],
  ['界碑前重新分泉','旧刻痕证实洪水改过水路，两宗却都不肯少拿一份灵泉。严衡让你说明自己的见闻，邻宗同意先放回其余弟子，条件是留下新的分水约定。',
   ['据实说出见闻，守住放人约定','不替任何一方伪造图；两宗仍会为灵泉争执。','其余弟子越过界碑归来，两宗在石上刻了新的分水线，旧仇没有因此消失。'],
   ['接回弟子后退出争泉','把接人的经过讲清，不接管泉眼，也不替任何一宗改写旧图。','你带回弟子，把临时放行的约定交回山门，没拿争来的泉水作奖赏。'],
   ['隐去自己的袭击，冒领救人赏赐','拔剑者与运粮人都看过你的行为，作伪可能送进执法堂。','你的说法与运粮人的证词对不上，严衡收走弟子牌，叫护卫把你带走。']]],
 },
 {id:'loose_escort',path:'loose',age:25,realm:1,context:'travel',stages:[
  ['没有宗门敢接的护送','余掌柜要把一具封着怨气的棺送回故乡。死者是被敌宗逐出的弟子，商队怕遭追杀，只肯把车停在城门口。他能付的不是巨款，而是剩下的盘缠与一张出城路图。',
   ['验过封棺符，随车走旧商路','先查封符与身份；护送可能被死者的仇人拦住。','你检查封棺符，随余掌柜离城，路图上的第一处驿站仍有人守夜。'],
   ['只把棺送到有人接应的驿站','这段路有人往来，你只负责送到驿站，后面的路须等亲人接应。','你把棺送到驿站，余掌柜在那里等亲人接应。'],
   ['拆开棺盖，搜走死者的法器','封符锁着怨气，开棺会放出你不了解的东西。','你撕开一角封符，取走棺中的护身物，驿站里随即响起低低的哭声。']],
  ['桥上等着的是追杀者','一名持刀修士拦住车，说棺里的人偷了宗门功法。余掌柜说死者是替同门顶罪，拿出临终留下的血字，两人的说法还没有旁证。桥下能绕行，但水流湍急。',
   ['出示血字，争取放棺归乡','请对方辨认字迹；他若坚持抢棺，近距离交涉有危险。','对方停刀核对血字，你把棺车退到桥头，争来让亲人到场的时间。'],
   ['弃车走桥下，先带掌柜避开','车上的货与棺会留下，先从已看清的桥脚找退路。','你与余掌柜沿桥脚退开，棺车留在追杀者眼前。'],
   ['夺刀反杀，拿走对方储物袋','对方是追来的战修，夺刀失败可能当场死去。','你夺下储物袋，桥上的血让这件旧案再也无法悄悄收场。']],
  ['故乡有人点起白灯','余掌柜的亲人在渡口挂起白灯。你手里的血字是死者最后的说法，亲人要知道途中发生过什么；若棺车未到，他们只能先立衣冠冢。',
   ['交还血字，说明护送经过','把亲眼见过的事讲清，不承诺棺和旧案已经妥善解决。','亲人收下血字，按送达的消息安排丧事，并记下该去寻找棺车的地方。'],
   ['留下驿站路图，自行离开','指出最后确认棺车与追杀者的位置，让亲人决定是否继续查找。','你把路图留在白灯下，带着这趟路上已得的物品离开。'],
   ['编造死者欠账，向亲人索赔','他们知道委托的价钱，也会保留你留下的索赔话。','你拿走亲人攒下的盘缠，白灯下没有人向你道谢。']]],
 },
 {id:'dark_sacrifice',path:'demonic',age:30,realm:1,context:'cavern',stages:[
  ['堂主让弟子住进阵眼','幽灯堂主称山腹血阵能助弟子精进，命三名弟子搬进石室。师兄杜魁负责锁门。你从旧血槽看到几枚上一批弟子的木牌，石室里却没有他们的铺位。',
   ['查旧木牌，问清阵眼用途','先找上一批弟子的去向；杜魁不准外传石室的事。','你在石室外找到废弃铺位，旧木牌上的名字与领料册一一对上。'],
   ['称旧伤未愈，暂住外院','请求延期，不进去运功；堂主可能继续催你。','杜魁暂时给你外院铺位，却把你的名字留在下一轮入阵名单上。'],
   ['推同门先入阵，自己取材料','你要别人先承受未知的阵法，领料册会记下换人的事。','同门被推进石室，你取走原分给他的材料，杜魁在领料册上添了你的名字。']],
  ['石门里的喊声停了','半夜血槽发热，一名弟子的喊声忽然断掉。杜魁让你进去接替他的位置，称退出就是叛堂。你已看清侧洞通往废矿，但守卫提着摄魂灯站在洞口。',
   ['毁掉锁门符，救人一起出逃','锁符牵连血阵，破坏时可能受伤；救出多少人尚不确定。','锁符碎开一角，你带能动的人冲向废矿，身后摄魂灯亮了起来。'],
   ['先答应入阵，借取水寻找出口','先装作服从，沿已确认的侧洞寻找离开机会。','你借取水走到侧洞，趁运矿的人换班离开石室，没有答应永远留下。'],
   ['抢摄魂灯，正面杀开洞口','守卫的灯能摄走魂魄，争抢失败可能死在洞口。','你夺灯穿过洞口，守卫身后的血阵却已记住你的气息。']],
  ['出洞之后仍能听见追铃','废矿外是商路，幽灯堂的追铃从山里传来。杜魁带着领料册追出洞，你可以交证据给当地巡守，也可以舍弃旧木牌藏进人群；没有人保证替魔修主持公道。',
   ['带旧木牌求巡守核查血阵','把名字和洞口位置讲清，求的是查案，不是保证获救。','巡守封存旧木牌，派人向洞口核查，允许你暂住城外候讯。'],
   ['藏起旧木牌，随商队离开','借商队遮掩去向，先保住自己；留在血阵的人未必能等到救援。','你收好木牌混入商队，离开洞口；追铃渐远，血阵的旧案仍未结。'],
   ['卖掉木牌，引追兵去同门藏身处','你知道他们藏在哪里，泄露位置会让曾同行的人遭追捕。','买家拿走木牌和藏身处的位置，追铃转向了你指的山坳。']]],
 },
 {id:'beast_eclipse',path:'beast',age:28,realm:1,context:'valley',stages:[
  ['月蚀之夜幼兽失踪','月光被黑影遮住后，三只幼兽没有回窝。白苓在水边捡到一根陌生骨笛，笛身刻着引兽的符；另一族妖修恰好也在找自己的孩子，双方都怀疑对方。',
   ['与另一族对照足迹寻幼兽','先查骨笛与失踪时间，不把对方的孩子当筹码。','两族沿足迹找到一处捕兽网，网绳带着坊市匠铺的印记。'],
   ['先把剩下幼兽迁到高处','不沿陌生笛声追去，先保护还在身边的孩子。','你把幼兽搬到高洞，留下轮值看守；失踪者还没有找到。'],
   ['扣住另一族幼兽逼他们交人','尚无证据证明对方掳人，扣孩子会引来成年妖修。','另一族知道你扣了孩子，派成年妖修守住山口，不肯再交换消息。']],
  ['骨笛声从废塔里传来','废塔中有人用兽血画阵，笼里还关着幼兽。塔主是一名炼器修士，声称妖族的魂魄可以炼进护身珠。水沟通向笼后，但塔门挂着会示警的铜镜。',
   ['从水沟拆笼，先救出幼兽','铜镜可能发现你；救援失败会受伤，幼兽也可能没能出来。','你从水沟拆开笼锁，把能找到的幼兽交给塔外接应者。'],
   ['画下笼位，先找两族一起救援','不单独闯塔，位置与警戒方法会交给接应者。','两族收到笼位与铜镜的位置，开始从塔后寻找接近的路。'],
   ['闯进塔门，夺魂珠反杀塔主','魂珠里囚着别的妖魂，塔主能驱使它们攻击你。','你夺走魂珠，塔中的哭声追着珠光涌出。']],
  ['塔下要怎样认回孩子','逃出塔的幼兽认不清两族的气味，惊恐地蜷在一起。白苓说先让它们安静下来，另一族却要立刻分出谁家的孩子。旧骨笛仍在你手里。',
   ['放下骨笛，让两族慢慢认领','把引兽法器放远，让两族按幼兽的旧伤、叫声与熟悉气味辨认。','两族轮流靠近，幼兽终于认出熟悉的叫声，塔的位置也被共同记住。'],
   ['留下骨笛作证，带自己族人回窝','把废塔位置告知另一族，带已确认的族人回窝，不替对方认领孩子。','你交出塔边的线索，带确认认回的族人回窝，余下孩子由另一族照料。'],
   ['用魂珠控制幼兽，收为自己的部众','孩子无法反抗摄魂法器，成年族人会把你视为新的捕兽者。','魂珠压住幼兽的挣扎，两族都记住了你驱使孩子的模样。']]],
 },
];
export function installLifeRevision(events,chains){
 const currency=text=>String(text).replace(/(十六|十二|八|\b16|\b12|\b8)(枚?灵石)/gu,(_,v,suffix)=>({十六:'五',十二:'四',八:'三',16:'5',12:'4',8:'3'}[v])+suffix);
 const rewrite=value=>typeof value==='function'?s=>currency(value(s)):currency(value);
 for(const node of Object.values(events)){
  node.text=rewrite(node.text);
  for(const o of node.choices)for(const k of ['label','hint','reply','startReply'])if(o[k])o[k]=rewrite(o[k]);
 }
 for(const chain of additions){chains.push(chain);chain.stages=chain.stages.map((stage,step)=>{
  const [title,text,...opts]=stage,id=chain.id+'_'+step;
  events[id]={id,act:0,title,text,context:chain.context,choices:opts.map(([label,hint,reply],i)=>{
   const conduct=['care','cautious','selfish'][i];return choice(conduct,label,hint,reply,{months:step===0?6:3,deferEffects:true,startReply:'你决定'+label+'。'+hint,system:{chain:chain.id,step,conduct},effects:step===2?{stats:{stones:i===2?3:i===0?2:0,empathy:i===2?-5:1}}:{},...(step===1?{check:{base:i===2?40:i===0?56:80,skill:i===2?'sword':'array',scale:.45,failText:i===2?'对方的法器先击中你，你没能从这场冲突中活着离开。':'行动被守卫打断，你负伤撤开，未能完成原先的救援与交涉。',failure:i===2?{}:{stats:{health:-16}},...(i===2?{failEnding:'battle_lost'}:{})}}:{})});
  })};return [title,text,...opts.map(o=>o[0]),...opts.map(o=>o[2])];
 });}
 // Review the whole currency network, retaining known-stakes decision hints.
 for(const node of Object.values(events))for(const o of node.choices){
  if(o.cost?.stones)o.cost={...o.cost,stones:Math.max(1,Math.round(o.cost.stones/3))};
  if(o.effects?.stats?.stones)o.effects={...o.effects,stats:{...o.effects.stats,stones:Math.max(1,Math.round(o.effects.stats.stones/4))}};
 }
 for(let tier=1;tier<=4;tier++){
  const node=events['selection_'+tier+'_result'];
  node.text=s=>({sword:'剑台上的风吹得旗绳作响。剑堂教习让你以木剑挡住三道来招，陶宁的名签排在旁边。你练过的收势与身法，今天都要在别人面前使出来。',alchemy:'丹房摆着三盘外形相近的药材，另有一盏随时可能熄灭的炉火。丹堂教习要你辨出不能混用的两味药，再守住火候，不准带入预先配好的药散。',array:'经堂的石台上摆着一道错接的护栏阵。教习要你找出让阵旗倒转的符纹，自己接好，再让一盏灯穿过阵门。旁边有人急着落笔，也有人一直未敢碰阵旗。'})[s.life.cultivation.exam?.skill||'array'];
  node.choices[0].reply='你依照平日练过的办法完成了这一场展示，教习当场指出其中的得失。';
  // options() uses the enrolled skill and actual preparation at resolution.
  node.choices[0].check={base:40,skill:'array',scale:.5,stat:'courage',statScale:.1,failText:'你在场上失了手，没能完成教习要求的展示。教习指出错误，让你带回去重练。',failure:{stats:{mind:-5}}};
  node.choices[1].system={...node.choices[1].system,confinement:true};
  node.choices[1].reply='教习从你袖中抖出预制符纸。严衡当场收走弟子牌，以禁灵符封住法力，将你押入思过洞一年；这一届成绩被废除。';
 }
 const garden=events.garden_accident;
 garden.choices[2].system={...garden.choices[2].system,confinement:true};
 garden.choices[2].reply='炉火记录与巡夜簿当面对不上。严衡命你重说，你仍坚持推给巡夜弟子。长老收走弟子牌，封住法力，把你押入思过洞一年；沈砚则被罚修补药田。';
 for(let tier=1;tier<=4;tier++)for(let attempt=0;attempt<3;attempt++){
  const node=events['breakthrough_'+tier+'_'+attempt],paid=node.choices[0];paid.cost={stones:[0,2,6,12,20][tier]};
  paid.hint='须支付 '+paid.cost.stones+' 枚灵石购买闭关材料；准备好后才封门。';
  node.choices.splice(1,0,{...paid,id:'service',label:'先为材料持有者做工，再闭关',hint:'用一年看守库房与修补器物换取材料，无需先付灵石。此后仍要完成闭关，突破可能失败。',cost:{},months:paid.months+12,startReply:'你接下一年守库与修器的委托，以劳作换取材料。这段时间不照常练习；做完后才开始闭关。',reply:'你做完约定的劳作，领到材料，随后完成了这一轮闭关。'});
 }
 events.family_rules.choices.find(o=>o.id==='sever').effects={};
 events.family_support.choices.find(o=>o.id==='supplies').effects={stats:{stones:2},items:['herb_kit']};
 events.family_support.choices.find(o=>o.id==='send').hint='须支付 3 枚灵石；消息与钱通过商路送回，不是瞬间到账。';
 events.family_support.choices.find(o=>o.id==='send').cost={stones:3};
 for(const o of events.family_support.choices.filter(o=>['supplies','notes'].includes(o.id))){
  o.system={...o.system,familySupport:3};
  o.available=s=>s.life.family.reserve>=3&&s.life.family.members.some(p=>p.status==='alive')&&(o.id!=='notes'||s.birth.family==='clan');
  o.reason='家中需有仍在世的亲人和至少三枚灵石的积蓄。';
 }
 const sent=events.family_support.choices.find(o=>o.id==='send');
 Object.assign(sent,{months:6,deferEffects:true,startReply:'你把三枚灵石交给可靠的商队，托他们沿仍开放的路线送回故乡。'});
 events.family_support.choices.push(choice('peace','先报平安，不要家里接济','不花灵石，托中转者告诉家人自己仍有住处与活计。','你托中转者报了平安，让家里先顾好自己的生计。'));
 events.family_gate.title='故乡传来的音讯';
 events.family_gate.choices[0].label='回故乡，亲自问清近况';
 events.family_gate.choices[0].reply='你沿已经确认的商路回到故乡，推开记忆里的院门，亲自问清这几年的事。';
 Object.assign(events.family_gate.choices[1],{label:'托中转者送生活钱与回话',hint:'支付两枚灵石，沿仍开放的路线送回；六个月后再确认交付。',cost:{stones:2},months:6,deferEffects:true,startReply:'你把生活钱交给商队，写明旧屋的地址与可以转交的人，托他们带回故乡。',reply:'商队带回转交的回执，生活钱送到了旧屋，家里可以自己安排怎样使用。'});
 events.family_gate.choices[2].label='先托人报平安，暂时不返乡';
 events.family_gate.choices[2].hint='不支付灵石，也不亲自回去，只托中转者带话说明眼下的处境。';
 events.family_gate.choices[2].reply='你把近况交给中转者，解释自己暂时不能回乡。未亲自见到的事，仍只能等下一次消息。';
 events.sect_trial_2.text=s=>'谷口的灯亮着，许执事与值守药师先清点归来的人。'+(s.people.trialmate.status==='dead'?'陶宁没能活着走出谷口，药师要你指出最后见到他的地方。':s.people.trialmate.status==='missing'?'陶宁仍未归来，搜救弟子拿着路图等你说明失散处。':'陶宁坐在药师身边，腿上的绷带还没拆。')+' 行囊里的药要分开验过，长老也要听谁越过了禁路。';
 events.sect_trial_2.choices[0].reply=s=>s.people.trialmate.status==='alive'?'你把堵路的兽群与绕行处画给药师看。陶宁指着图补了几句话，执事让伤员先回院休养，之后才接过你们的药包。':'你把失散或遇袭处标在图上，搜救弟子接过图，长老追问补给为何未能送到。你没有把未归者算成已经获救。';
 events.sect_trial_2.choices[2].reply='药包铺开时，药师当场发现你报的数量没有对应药草。严衡拦住你离开谷口，叫人收走弟子牌，先把伤亡与私藏的经过查清。';
 events.family_home_ambush={id:'family_home_ambush',act:0,title:'村口有人等你的旧弟子牌',text:'回乡后，一名陌生修士堵住村口。他从亲人进山寻你的事猜出你是修士，称家中欠了保护费，已经把堂亲叫到路边。村人远远围着，谁也不敢上前。',choices:[
  choice('witness','请村人作证，先问清是谁立的债','保护费没有旧契；你要对方当众说明来由，可能激怒持剑的修士。','村人拿出旧契，对方说不清欠账。你带亲人退到有人看守的院里，没把争执留在路边。',{check:{base:55,skill:'array',scale:.35,failText:'对方拒绝听证，剑风划伤你的手臂。你趁村人奔来，把亲人带回院内。',failure:{stats:{health:-12}}}}),
  choice('pay','用三枚灵石换他立即放人','明确支付三枚灵石，买的是眼前放人，不保证以后无人再来。','对方收走灵石，放亲人回到你身边。你把他的衣纹与法器模样记下。',{cost:{stones:3}}),
  choice('fight','出剑逼他放人','对方已持剑堵路，斗法有死亡危险；亲人不能替你挡住法器。','你逼退堵路的修士，亲人从路边跑回院里。',{check:{base:45,skill:'sword',scale:.4,failText:'对方的法器击穿护身之物，你没能从村口的斗法中回来。',failure:{},failEnding:'battle_lost'}}),
  choice('retreat','先带亲人避入村祠，不与他斗法','祠堂有人看守，先撤离路边；债的争执尚未解决。','你借围观人群遮挡，带亲人走入村祠。修士没有追进有人守着的院里，旧争执仍需日后处理。'),
 ]};
 for(const chain of additions)for(let step=0;step<3;step++){
  const node=events[chain.id+'_'+step];
  if(chain.id==='loose_escort'&&step===0)node.choices[2].effects={items:['ward'],stats:{empathy:-4}};
  if(chain.id==='dark_sacrifice'&&step===0)node.choices[2].effects={stats:{stones:1,empathy:-4}};
  if(chain.id==='beast_eclipse'&&step===1)node.choices[2].effects={items:['ward'],stats:{empathy:-4}};
 }
}
