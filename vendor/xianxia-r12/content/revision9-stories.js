const choice=(id,label,hint,reply,data={})=>({id,label,hint,reply,...data});
const node=(id,title,text,choices)=>({id,act:0,title,text,choices,cultivationOnly:true});
const trial=(base,failText,extra={})=>({base,skill:'sword',scale:.3,failText,failure:{stats:{health:-15}},...extra});
export const REVISION9_ITEMS={
 shadow_manual:{name:'幽灯养脉诀·全卷',detail:'管库师兄为换回缺药账册交出的完整心法。卷中有护脉与摄血两种修法，取得卷册不等于已经学会。'},
 borrowed_volume:{name:'借阅的入门卷册',detail:'师门交给你暂用的卷册；正式离宗应交还，自己的笔记可以留下。'},
 exam_sword_charm:{name:'借力剑符',detail:'能短暂催动木剑的符纸；比试不允许借此冒充自己的本领。'},
 exam_powder:{name:'藏好的辨药散',detail:'能改变药渣颜色的药散，考核中偷用会留下混药痕迹。'},
 exam_array_copy:{name:'护栏阵底图',detail:'别的报名者偷偷传出的阵图；照抄会留下同样的错误。'},
 thin_root_pill:{name:'洗脉丹',detail:'以矿役或冒险换来的护脉丹，辅助下一次练习，不会把杂灵根变成天灵根。'},
 blood_manual:{name:'摄血经',detail:'游方修士传授的取血法门；为此看押伤者的事实不会因取得功法而消失。'},
};
export function installRevision9(events){
 events.dark_oath=node('dark_oath','药铺后堂，弟子牌还未刻名',s=>{
  const c=s.life.cultivation,old=c.revision9.membership;
  return '半年看炉结束，顾魇递来一块空白木牌：“入堂后，我教你下一卷。库中的药、堂里的囚犯，都不许私自带走。”你看见守卫将一名弟子押过门廊。'+(old.path==='demonic'?'你本来就在幽灯堂，这次只是调到另一处药库。':old.borrowed?'你还持有旧师门借出的卷册。顾魇问，你是先回去辞师，还是瞒着旧师门留下？':'你已不受旧师门的借阅约束，顾魇只问曾学过什么，免得两套功法相冲。');
 },[
  choice('join','领取木牌，留下学法','师承在领取木牌后改变；已结清的旧师门不再向你讨卷。','顾魇在木牌上刻下你的名字，带你去领药院的住处。',{system:{path:'demonic',registeredTransfer:true,cancelInquiry:true}}),
  choice('release','先向旧师门辞行','回山交还借卷与弟子牌，处理完后再回来决定。','你把空白木牌推回，托药商留好回话地址，先向旧师门申请离宗。',{next:'departure_terms',system:{inquiry:'loose',revision:'returnForOath'}}),
  choice('secret_join','藏起旧弟子牌，留在幽灯堂','你仍带着借卷；旧师门发现缺席、查到带卷的证人后可能来寻你。','你没有归还借卷，藏起旧弟子牌，在幽灯堂领了新住处。',{system:{path:'demonic',cancelInquiry:true,revision:'secretTransfer',offense:'带着未归还的借卷离宗；送药弟子看见你将卷册装进行囊'}}),
  choice('leave','归还试读卷，离开药铺','只归还这半年借读的章节；自己的残卷和笔记留下。','顾魇收回试读卷。你没有领取木牌，带着自己的东西离开药铺。',{system:{cancelInquiry:true}}),
 ]);
 events.departure_terms.text=s=>s.life.cultivation.path==='demonic'?'顾魇翻出你借读卷册的签名，要你交还原卷、补清两枚灵石的药材费用。你听见门后上了锁。他说，知道地牢出入口的人，须等堂主亲自问过才能走。':'许执事从架上取下你的借阅签，指着卷册说：“原卷还给藏经阁，自己的笔记带走。还有两枚灵石的药材钱，补清便给你离宗凭信。”他没有要求你交出家传法器，也没有问你下一位老师是谁。';
 events.departure_terms.choices[0]={...events.departure_terms.choices[0],hint:'交还原卷，补清已用的药材；幽灯堂会另行审问，普通宗门则给离宗凭信。',cost:{stones:2},reply:'你交回借卷和弟子牌，补清用过的药材。管事将离宗凭信盖上山门印记。'};
 events.dark_ledger_0=node('dark_ledger_0','药库少了三瓶养脉药','你守药库的第三日，管库师兄顾魇把三只空药匣放到桌上：“今夜补不齐，你们这组一起下地牢。”搬箱的小师弟阿栾连声说，自己从没拿过库钥匙。钥匙此刻就在顾魇腰间，领药簿却被他压在手下。',events.dark_ledger_0.choices.map(c=>({...c,label:c.id==='cautious'?'先交清自己领过的药':c.label,hint:c.id==='care'?'请顾魇拿出领药簿，核对每笔药是谁领走的。':c.id==='cautious'?'拿自己的领药凭据对账，先证明经手的药没有短缺；暂不揭别人的账。':'指称搬箱师弟偷药，把他交给顾魇；你并没有亲眼见他拿药。',reply:c.id==='cautious'?'你拿出领药凭据，交清自己经手的药。顾魇暂时没扣你的月例，仍让其他人补齐缺额。':c.reply})));
 events.dark_ledger_1=node('dark_ledger_1','师兄拿功法换你的账册',s=>s.life.cultivation.chains.dark_ledger?.conduct==='care'?'你找到的领药签上有顾魇的手印。夜里，他堵在药房门前，承认把药私卖了，递来《幽灯养脉诀》全卷：“把原账交给我，明日查库时别提这事。”他已翻开前后卷给你核对，堂主的查库钟还未响。':'顾魇夜里来取整组的领药簿。阿栾指着其中三笔手印，说领药的人都是顾魇。顾魇将《幽灯养脉诀》全卷塞到你面前：“把原账交给我，明日查库时别提。”你现在要决定是否替他隐瞒。',events.dark_ledger_1.choices.map(c=>c.id==='cautious'?{...c,label:'替师兄隐瞒，换取全卷心法',hint:'交出原账，拿走已经核过的全卷；阿栾仍可能被逼着补药。',reply:'你交出原账，查库时没有提起顾魇。他按约交给你《幽灯养脉诀》全卷；这笔交换两清，你也留下了替他隐瞒缺药的事实。',effects:{items:['shadow_manual']},system:{...c.system,revision:'manualExchange'}}:c));
 events.dark_oath_return=node('dark_oath_return','交还旧卷之后，重回药铺','你带着离宗凭信回到药铺。顾魇核过山门印记，收起先前留给你的回话：“旧卷已还，往后就在这里学法？”空白木牌仍放在桌上，你也可以就此离开。',events.dark_oath.choices.filter(c=>['join','leave'].includes(c.id)));
 events.manual_study=node('manual_study','换来的心法，藏着两种修法','你在灯下读完《幽灯养脉诀》。前卷以草药温养经脉，后卷却让人从活物身上摄取精血。书页边有顾魇旧日留下的血指印。这确实是一份全卷，怎样修炼仍由你决定。',[
  choice('gentle','只练草药养脉的周天','先花一年改练呼吸与运气，暂不碰摄血章节。','一年里，你从短周天重新练起。经脉渐渐适应新法，摄血篇被你夹在封纸之后。',{months:12,deferEffects:true,startReply:'你将摄血篇封起，开始按照草药篇重新练习运气。',system:{revision:'learnManual',method:'shadow'}}),
  choice('blood','拿野兽试练摄血篇','离开药院捕兽，亲自承担心法尚未练熟的危险。','你在荒岭捕兽试法，记下取血后的燥热与经脉痛处。',{months:18,deferEffects:true,startReply:'你备好药囊去荒岭捕兽，先以兽血试练。',check:trial(45,'兽血入脉后逆冲胸口，你停下试练，带伤回到药院。'),system:{revision:'learnManual',method:'shadow'}}),
  choice('keep','收好全卷，继续原来的功法','保留书，不改动现在的周天。','你把全卷包好收进行囊，照旧练习原来的功法。',{system:{revision:'keepManual'}}),
 ]);
 events.thin_root_offer=node('thin_root_offer','与同批弟子渐渐拉开的距离',s=>'与你一同入门的人，已有几个换了新的住处。你仍要反复运气，才能把散开的灵力收回。'+(s.life.cultivation.path==='orthodox'?'执事拿来一份矿役契：替宗门守地火矿三年，可以换一枚洗脉丹。':'坊市矿主招人守地火矿三年，答应以一枚洗脉丹抵工钱。')+'一名游方修士却说，他有更快的办法，只是不肯在人多处开卷。',[
  choice('keep','留下练功，兼做修器活','不接矿役或陌生功法，靠已经会的手艺准备下一次修炼。','你没有接契书，夜里练功，白日替人修补器物。有人先你一步离开，也有人后来回头找你帮忙。',{effects:{stats:{empathy:2}},system:{revision:'patient'}}),
  choice('mine','签下矿役契，去地火矿','矿道有塌方和火毒；先去核对工期与换丹条款。','你沿山路抵达地火矿，矿头将你编入守夜的一队。',{months:6,deferEffects:true,startReply:'你接过三年矿役契，沿已知山路去地火矿报到。',system:{revision:'mineStart'}}),
  choice('hear','跟游方修士去看那卷书','只听他的条件，尚未答应修炼。','游方修士将你带到荒庙，先在地上摆下取血的器皿。',{months:3,deferEffects:true,startReply:'你跟他去荒庙，先问清书中所需的药与祭物。',system:{revision:'hearStart'}}),
 ]);
 events.thin_root_mine=node('thin_root_mine','矿道里的火毒越来越重','守矿两年后，你与同队弟子常在夜里咳血。矿头承认深井的护阵坏了，却要求你们继续守满契期。一名老矿工知道废弃风井的出口，他的儿子仍在深井当班。矿役未满，那枚洗脉丹还没有交到你手中。',[
  choice('finish','护住同队，熬完剩下一年','修补浅井的通风阵，接应深井的人；火毒可能伤到经脉。','你带同队修通风井，熬过最后一年。矿头按契给了洗脉丹，老矿工的儿子也跟队走出矿口。',{months:12,deferEffects:true,startReply:'你先修风井，带人轮流守阵，继续履行最后一年的矿役。',check:trial(58,'风井在换岗时坍塌，你带伤撤出。矿役未满，矿头拒绝给丹。'),effects:{items:['thin_root_pill'],stats:{empathy:3}},system:{revision:'mineFinish'}}),
  choice('leave','带同队从风井离开','放弃换丹报酬；带走已经领到的私人物品。','你带人从废井撤出，将契书退给矿头。那枚洗脉丹没有拿到，同队的人仍活着。',{months:6,deferEffects:true,startReply:'你请老矿工带路，组织同队从风井撤离。',system:{revision:'mineFinish'}}),
  choice('rob','抢矿头的丹，独自突围','矿头有护身法器，护卫会追来；同队还困在井下。','你夺走丹瓶，沿废井突围。矿头把袭击与抢丹的经过交给了坊市巡查。',{months:3,deferEffects:true,startReply:'你趁矿头独处时动手抢丹，准备从风井冲出去。',check:trial(32,'矿头的法器封住风井，你没能闯过护卫。',{failure:{},failEnding:'battle_lost'}),effects:{items:['thin_root_pill'],stats:{empathy:-7}},system:{revision:'mineFinish',offense:'抢夺矿头丹药，矿头与护卫留下指认'}}),
 ]);
 events.thin_root_price=node('thin_root_price','荒庙里的修士说出代价','游方修士把卷册翻到取血的一页：“杂灵根留不住灵气，可以借旁人的气血。”帘后锁着一个受伤的散修，他求你别答应。修士说，先替他看住这个人，再教你摄血之法；门外还留着一道能退走的小路。',[
  choice('refuse','拒绝看押，沿小路离开','放弃这份传承，带走自己的行囊。','你没有接过锁链，趁他收卷时退到门外，沿小路离开荒庙。',{system:{revision:'priceFinish'}}),
  choice('rescue','割断锁链，带伤者突围','修士就在庙中，救人可能遭到反击。','你截断锁链，掩护伤者逃出荒庙。他留下自己的修行笔记，约你伤好后再见。',{months:3,deferEffects:true,startReply:'你佯装查看锁链，准备带伤者从侧门突围。',check:trial(40,'游方修士发现了你的打算。你负伤逃离，没能带出被囚者。'),effects:{stats:{empathy:5}},system:{revision:'priceFinish'}}),
  choice('accept','接过锁链，跟他修炼摄血法','协助囚禁眼前的散修，随后花两年试练禁术。','两年后，你学会借精血聚气。被囚的散修没能走出荒庙；前来寻他的同伴记下了看守者的相貌。',{months:24,deferEffects:true,startReply:'你接过锁链，留下看押散修，开始跟游方修士试练禁术。',effects:{stats:{empathy:-12}},system:{path:'demonic',revision:'bloodLearn',offense:'协助囚禁散修修炼禁术，寻人者在荒庙外见过你的相貌'}}),
 ]);
 events.thin_root_return=node('thin_root_return','旧矿友带来一张丹方',s=>'当年一起离开矿口的弟子找到了你。他的手仍有火毒留下的伤痕，怀里却护着药师新开的方子：“'+(s.inventory.includes('thin_root_pill')?'你那枚洗脉丹，不能直接吞。先配解火的药，才不至于伤上加伤。':'我没忘你领我们出矿。药师愿教我们熬药，先把这些年熬坏的经脉养回来。')+'”他没有带来能一步登天的仙丹，愿意与你再试一条慢路。',[
  choice('learn','跟矿友去药师处养脉','花一年练习调息与煎药，受损的经脉逐步恢复。','你与矿友轮流煎药，按药师所教练了一年呼吸。旧伤缓过一些，仍须自己积累修为。',{months:12,deferEffects:true,startReply:'你带上自己的药囊，跟矿友去药师处慢慢养脉。',effects:{stats:{health:10,mind:3}},system:{revision:'returnFinish'}}),
  choice('decline','谢过矿友，继续现有生活','留下药方，不离开眼前的差事。','你将药方夹进笔记，请矿友进屋歇脚，再向他问起其他人的近况。',{system:{revision:'returnFinish'}}),
 ]);
 events.thin_root_hunt=node('thin_root_hunt','寻人的修士认出了你',s=>'几年前被囚散修的师弟追到了'+s.player.home+'，认出你曾替人守门。他掌着照魂灯，要求你带路去找师兄最后被关的地方。游方修士从传音符里催你挡住来人，却没有答应接你撤走。你记得荒庙囚室在哪里，也知道那个人没能活着离开。',[
  choice('confess','说出囚室，交代自己做过的事','承认看押与试法，仍可能受到追责。','你把囚室和取血器皿的位置交代清楚，带来人找到遗骨。对方没有宽恕你，准你留下处理后事，日后到坊市见证人面前受审。',{months:12,deferEffects:true,startReply:'你放下法器，带寻人者去那间囚室，不再替游方修士遮掩。',effects:{stats:{mind:-8}},system:{revision:'huntFinish'}}),
  choice('escape','趁两人对峙，带自己的书逃走','放弃荒庙住处；追捕者可能循留下的线索来寻你。','你绕出侧门，舍弃了荒庙的住处。卷册带走了，见过你守门的人仍在追问。',{months:6,deferEffects:true,startReply:'你退向侧门，准备趁照魂灯转向游方修士时逃走。',check:trial(48,'照魂灯照住了你的去路，你负伤藏进山沟，遗失了新抄的书页。'),system:{revision:'huntFinish',path:'loose',evade:true}}),
  choice('fight','替游方修士挡住来人，动手斗法','来人带着照魂灯，斗法可能死亡；师父未必回来救你。','你击退来人，等到天亮却没见游方修士来接。传音符再没有亮过，他承诺的续卷和药也没有送来。',{months:3,deferEffects:true,startReply:'你挡住去路，按摄血法催动灵力，向照魂灯的持有者出手。',check:trial(30,'照魂灯截断了你的行气，来人的法器穿透胸口。',{failure:{},failEnding:'battle_lost'}),effects:{stats:{empathy:-6}},system:{revision:'huntFinish',offense:'袭击来寻找失踪师兄的修士，同行者目击了住处外的斗法'}}),
 ]);
}
