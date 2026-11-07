import {ROOTS,GEOGRAPHY,OFFICERS} from '../../content/cultivation-world.js';
import {NOVEL_NAMES} from '../../content/novel-names.js';
import {hashText,random} from '../core/random.js';

export const active10=s=>s.life?.cultivation?.rulesVersion>=10;
const c=s=>s.life.cultivation;
const r=s=>c(s).story10;
const age=s=>(s.birth.startAge||0)+Math.floor(s.month/12);
const seen=(s,id)=>s.pending?.event===id||s.decisions.some(d=>d.event===id);
const add=(s,cb,title,body)=>cb.log({kind:'life',title,body,automatic:true,location:s.player.location,context:c(s).context||'home'});
export function canCultivate(s){
 if(!active10(s))return true;
 return ROOTS[s.player.root].grade>=0||r(s)?.body==='nativeBeast';
}
export const hasMana=s=>!active10(s)||canCultivate(s)&&s.player.realm>=1;
export const rootLabel=s=>active10(s)&&r(s)?.rootStatus==='absent'?'无灵根':s.player.root;
export function rootDescription(s){
 if(!c(s).rootKnown)return '灵根尚未正式测定。';
 if(active10(s)&&r(s).rootStatus==='absent')return '药师两次测灵，并带你尝试引气，都未得到回应。普通吐纳与御剑功法无法修炼，识药、防身剑术与谋生手艺仍可学习。';
 return ROOTS[s.player.root].description;
}
export function initialize10(s){
 const cc=c(s);
 cc.story10={format:1,rootStatus:ROOTS[s.player.root].grade<0?'unverified':'present',body:s.birth.upbringing==='beast'?'nativeBeast':'human',reviewChecked:false,workChecked:false,workCount:0,workDue:240,contacts:[],echo:null,echoChecked:[],facts:{},daily:[],secularMonths:0};
 // These actors previously appeared only as literal names in prose.
 const roles={'宁素':'幽灯堂药师','杜魁':'血阵看守师兄','幽灯堂主':'幽灯堂堂主','老猿':'抚养你的山林长者','余掌柜':'运棺委托人'};
 for(const [alias,role] of Object.entries(roles)){
  if(!cc.progression.names[alias]&&!['老猿','幽灯堂主'].includes(alias)){
   const list=NOVEL_NAMES.filter(p=>p.sex===(alias==='宁素'?'F':'M'));
   const pool=list.length?list:NOVEL_NAMES;let index=hashText(s.seed+':story-person:'+alias)%pool.length;
   while(Object.values(cc.progression.names).includes(pool[index].name))index=(index+1)%pool.length;
   cc.progression.names[alias]=pool[index].name;
  }
 }
}
const EXTRA_ROLES={'白苓':'教人淬体的狐族修士','顾魇':'幽灯堂药库师兄','阿栾':'负责搬药箱的新弟子','宁素':'幽灯堂药师','杜魁':'看守血阵的师兄','顾长老':'丹堂长老','余掌柜':'委托运棺的掌柜','余衡':'童年教你辨药的药师','老猿':'山林长者','幽灯堂主':'幽灯堂堂主'};
function actors(s){
 const cc=c(s),names=cc.progression.names;
 return [...cc.officers.map(p=>({id:'officer:'+p.id,name:p.name,aliases:[p.name,names[OFFICERS.find(o=>o.id===p.id).name]].filter(Boolean),role:p.role,description:p.description,officer:p})),...Object.entries(EXTRA_ROLES).map(([alias,role])=>({id:'actor:'+alias,name:names[alias]||alias,aliases:[names[alias]||alias],role,description:role,alias}))];
}
export function introduceText(text,s){
 if(!active10(s))return text;
 let out=String(text||'');
 for(const p of actors(s).sort((a,b)=>b.name.length-a.name.length)){
  const alias=p.aliases.find(name=>out.includes(name));if(!alias)continue;const at=out.indexOf(alias);
  const tail=out.slice(at+alias.length,at+alias.length+5);
  if(tail.startsWith('（')||out.slice(Math.max(0,at-5),at).includes(p.role)||p.name.includes(p.role))continue;
  out=out.slice(0,at)+alias+'（'+p.role+'）'+out.slice(at+alias.length);
 }
 return out;
}
export function encounterPeople(s,text,event){
 if(!active10(s))return;
 const cc=c(s);
 for(const p of actors(s))if(p.aliases.some(alias=>String(text).includes(alias))&&!r(s).contacts.some(x=>x.id===p.id)){
  r(s).contacts.push({id:p.id,name:p.name,role:p.role,description:p.description,met:s.month,event,status:'已接触'});
 }
 for(const p of Object.values(s.people))if(String(text).includes(p.name)&&p.status==='alive')p.known=true;
}
export function storyPeople(s){
 if(!active10(s))return [];
 const known=new Set([...Object.values(s.people).filter(p=>p.known).map(p=>p.name),...(c(s).network.contacts||[]).map(p=>p.name)]);
 return r(s).contacts.filter(p=>!known.has(p.name)).map(p=>({...p,status:p.id.startsWith('officer:')?(c(s).officers.find(o=>'officer:'+o.id===p.id)?.status==='dead'?'已确认离世':c(s).path==='orthodox'?'本宗管理者':'原宗门管理者'):p.status}));
}
export function route(s,from,to){
 const todo=[[from]],visited=new Set([from]);
 while(todo.length){const path=todo.shift(),last=path.at(-1);if(last===to)return path;for(const next of GEOGRAPHY.find(g=>g.id===last).connections)if(!visited.has(next)&&!c(s).closed.includes([last,next].sort().join('-'))){visited.add(next);todo.push([...path,next]);}}
 return null;
}
export function echoKind(s){
 const m=c(s).network.marks;
 if(m.friend_witness||m.friend_hide)return 'friend';
 const teacher=!!(m.herbs||m.teacher_notes||m.teacher_route||m.route_contact);
 const relic=!!(m.old_page||m.relic_route);
 /*
  * 「铜匣换粮」也是铜匣线的一条（sold_page）——
  *   铜匣换成了两袋粮，玩家手里既没有旧页也没有拓印，
  *   原来这里**不认它** ⇒ 那次童年选择选完就断了，后面什么也没有。
  *   现在规则十二里它也算 relic 这条线（旧版本保持原样，逐值不变）。
  */
 const relic12=!!(m.old_page||m.relic_route||m.sold_page);
 /*
  * 「旧联系人」这条线，**先认出谁**决定了整条线走哪一版（friend / relic / teacher）。
  *
  * ⚠ 旧版本（5–11）保持原顺序（旧物在前）：逐值不变。
  * ⚠ 当前版本（规则十二）改成「授业者在前」——
  *   因为铜匣（child_relic）现在**人人都有**（10–12 岁那段），
  *   若仍按旧顺序，「旧联系人」对每个孩子都是铜匣那条 ⇒
  *   「授业者回响」整条线（echo_teacher / echo_teacher_check / echo_teacher_visit）
  *   **永远发不出来** ⇒ 实测 0/120 可达。
  */
 if(c(s).rulesVersion===12)return teacher?'teacher':relic12?'relic':null;
 return relic?'relic':teacher?'teacher':null;
}
/**
 * 「旧联系人」这条线的状态往前推一步。
 *
 * ## 为什么抽成函数（2026-11-08 · 世界域）
 * ----------------------------------------
 * 原来这段逻辑只写在**选项结算**里。而「前往旧联系人那里」这个选项带 `echoTravel`
 * ⇒ 那一程走的是「赶路」分支（`engine.js` 的 `finishJourney` → `finishTravel`），
 * **不会再走结算那条路** ⇒ 状态卡在「收到消息」，下一次检查会**重复发同一张卡**
 * ⇒ 而「同一张卡再发一次」的那个事件（`echo_<kind>_resume`）在事件表里**并不存在**
 * ⇒ 直接报「缺少故事」。
 *
 * ⚠ 这个问题一直潜伏着：那个选项要「商路可通」才能选，
 *   而玩家在旧版本里多半没离开过故乡 ⇒ 商路不通 ⇒ 选不到 ⇒ 碰不到。
 *   长线改成「该发就发」之后，玩家会真的离开故乡 ⇒ 商路通了 ⇒ 立刻撞上。
 *
 * ## 现在怎么算
 * ------------
 * **出发时**也推一次（当前版本规则十二），结算那一次保留给旧版本 ——
 * 旧版本的行为必须逐值不变（`eventsfid` / `eventseq` 门禁守着）。
 *
 * @param {object} s 当前人生状态
 * @param {string} kind 旧联系人的种类（friend / relic / teacher）
 * @param {string} origin 旧联系人所在的大陆
 * @param {string} id 玩家选的选项（forget = 记下不去了）
 */
export function advanceEcho(s,kind,origin,id){
 const c=s.life.cultivation,rr=c.story10;
 if(id==='forget'){rr.echo=null;return;}
 const hops=Math.max(0,(route(s,origin,c.continent)?.length||1)-1);
 rr.echo={kind,origin,status:id==='wait'?'deferred':'checking',due:s.month+(id==='wait'?24:hops*36),sent:s.month,stage:0};
}
export function choose10(s,event,id,success,cb){
 if(!active10(s))return;
 const cc=c(s),rr=r(s);
 if(event==='root_review'&&id==='test'){
  const m=cc.network.marks,clue=s.birth.family==='clan'||!!(m.old_page||m.relic_route);
  const hidden=clue&&hashText(s.seed+':hidden-root')%100<12;
  if(hidden){s.player.root='五行杂灵根';rr.rootStatus='present';cc.progress=0;add(s,cb,'第二块测灵石亮了微光','药师换用能察微弱灵息的小测石。石中终于浮起五色微光，他将结果写给你：五行杂灵根。你尚未炼出法力，需要重新求教入门周天。');cc.network.methodDue=s.month+6;}
  else {rr.rootStatus='absent';add(s,cb,'测灵与引气都没有回应','药师换过测石，又带你试了最基础的引气。石面始终不亮，经脉中也没有灵气停留。他收起口诀，劝你别再为普通吐纳功法花钱。');}
 }
 if(event==='root_review'&&id==='leave'){rr.reviewChecked=true;add(s,cb,'没有再买一份求仙的许诺','你收起先前的测灵记录，离开问诊的队伍。眼前的住处与活计仍要靠自己安排。');}
 if(/^mortal_assessment$/.test(event)&&id!=='decline'&&success){
  cc.rank=cc.path==='orthodox'?'外院管事':'药铺熟手';
  if(cc.path==='orthodox')add(s,cb,'管事交给你外院的钥匙','你核过药篮、粮袋和工钱。管事让你带两名新来的杂役，照管外院食宿与交货；丹房的钥匙仍由修士保管。');
  else add(s,cb,'掌柜把验货的桌子留给你','你核清这批药材与运费，掌柜让你带新学徒认货签、辨毒草。药铺后屋仍留着你的床，验货的事以后先由你经手。');
 }
 if(/^echo_(friend|relic|teacher)$/.test(event)){
  const kind=event.split('_')[1],origin=rr.echo?.origin||s.birth.continent;
  advanceEcho(s,kind,origin,id);
  if(id==='forget')return;
 }
 if(event==='echo_resume'||event==='echo_resume_after_war'){
  if(id==='forget'){rr.echo=null;return;}
  rr.echo.status=rr.echo.stage===1?'visiting':'checking';rr.echo.due=s.month;
 }
 if(/^echo_.*_check(?:_resume)?$/.test(event)){
  if(id==='decline'){rr.echo=null;return;}
  rr.echo.status='visiting';rr.echo.due=s.month;rr.echo.stage=1;
 }
 if(/^echo_.*_visit(?:_resume)?$/.test(event)){
  if(event.startsWith('echo_friend_visit')&&id!=='leave'&&cc.network.contacts?.[0])cc.network.contacts[0].status='重逢后互留了回信地址';
  if(event.startsWith('echo_relic_visit')&&id==='compare')rr.facts.relicCompared=true;
  if(event.startsWith('echo_teacher_visit')&&id==='notes'&&!cc.network.method&&canCultivate(s)){cc.network.methodDue=s.month+6;}
  rr.echo=null;
 }
 if(event==='world_raid'&&rr.echo&&['checking','visiting'].includes(rr.echo.status)){
  rr.echo.status='deferred';rr.echo.due=s.month+24;add(s,cb,'旧约被战事打断','你没能办完这次拜访，先随人撤开。对方的地址仍在册子里，安顿后才能再问消息。');
 }
 if(event.startsWith('sect_feud_')){
  const f=rr.facts.feud||={evidence:false,grain:false,assault:false,released:false};
  if(event==='sect_feud_0'){f.evidence=id==='care'&&success;f.grain=id==='cautious'&&success;f.assault=id==='selfish'&&success;}
  if(event==='sect_feud_1'){f.assault ||= id==='selfish'&&success;f.released=id==='cautious'&&success;}
  if(event==='sect_feud_2')f.released=success||f.released;
 }
 if(event==='loose_escort_0')rr.facts.coffin={at:id==='cautious'?'station':'road',opened:id==='selfish'&&success};
  if(event==='loose_escort_1'&&id==='cautious'&&rr.facts.coffin?.at!=='station')rr.facts.coffin.at='bridge';
 if(event==='loose_portal_0')rr.facts.crossed=id==='care'&&success;
 if(event==='loose_relic_0')rr.facts.enteredRelic=id!=='cautious'&&success;
 if(event==='loose_relic_1')rr.facts.relicDispute=id!=='cautious'&&success;
 if(event==='sect_repair_0')rr.facts.repairRecords=id==='care'&&success;
 if(event==='sect_repair_1')rr.facts.repairPlan=id==='care'&&success;
 if(event==='beast_home_0'&&id==='cautious'){s.player.home=cc.spot='深山幼兽临时栖地';}
 if(event==='beast_war_0')rr.facts.evacuatedBeasts=id==='cautious'&&success;
 if(event==='dark_method_0')rr.facts.bloodSource=id==='cautious'?'herbs':id==='selfish'?'prisoner':'beast';
 if(event==='beast_form_0')rr.facts.formMedicine=id!=='cautious'&&success;
 // No root can be created by a monthly multiplier, a path label or blood.
 if(!canCultivate(s)){
  cc.progress=0;cc.network.method=null;cc.network.methods=[];cc.network.methodDue=0;
  cc.network.offer=null;cc.network.arc=null;cc.network.next=null;
  if(['外门弟子','内门弟子','亲传弟子','独立修士','幽灯弟子'].includes(cc.rank))cc.rank=cc.path==='orthodox'?'凡俗杂役':cc.path==='demonic'?'药房苦役':'坊市学徒';
 }
}
export function month10(s,cb){
 if(!active10(s))return false;
 if(c(s).rulesVersion>=11&&c(s).mundane?.arc)return false;
 const cc=c(s),rr=r(s),free=s.journey?.open&&!s.pending&&!cc.detained&&!cc.inquiry&&!cc.activeChain&&!cc.context&&s.month>=cc.punishmentUntil;
 if(!canCultivate(s))cc.progress=0;
 if(!free||age(s)<16||!cc.admissionDone)return false;
 if(cc.queue.some(q=>q.due<=s.month))return false;
 if(!rr.reviewChecked&&rr.rootStatus==='unverified'&&rr.body==='human'&&age(s)>=18){
  /* ⚠ 闸检查**在置标记之前** —— 被拦就当这个月没这回事，下个月还会再抽一次。 */
  if(!cb.gate('root_review'))return false;
  rr.reviewChecked=true;cb.arrive('root_review');return true;}
 if(rr.echo){
  const e=rr.echo,path=route(s,e.origin,cc.continent);
  if(!path&&s.month-e.sent>=240){rr.echo=null;add(s,cb,'旧地址一直没有回音','商路多年不通，代收人未能核实旧联系人的去处。你收好旧信，结束这次未能赴约的安排。');}
  else if(path&&s.month>=e.due+(e.status==='message'?(path.length-1)*18:0)){
   let id=e.status==='message'?'echo_'+e.kind:e.status==='deferred'?'echo_resume':e.status==='checking'?'echo_'+e.kind+'_check':'echo_'+e.kind+'_visit';
   if(seen(s,id))id=id==='echo_resume'?'echo_resume_after_war':id+'_resume';
   /*
    * ⚠ 兜底：`echo_<kind>_resume`（同一张「收到消息」的卡再发一次）在事件表里**并不存在** ——
    *   只有 `echo_<kind>_check_resume` 与 `echo_<kind>_visit_resume`。
    *   ⇒ 统一回落到 `echo_resume_after_war`（它的正文按当前 kind 生成，三种 kind 都适用）。
    *   没有这一层就会报「缺少故事：echo_friend_resume」，整局卡死。
    */
   if(id==='echo_'+e.kind+'_resume')id='echo_resume_after_war';
   if(!seen(s,id)){cb.arrive(id);return true;}
  }
 }
 if(!cc.network.echoChecked&&age(s)>=23){
  cc.network.echoChecked=true;const kind=echoKind(s);
  if(kind&&random(s,'events')<.65){rr.echo={kind,origin:s.birth.continent,status:'message',sent:s.month,due:s.month,stage:0};return month10(s,cb);}
 }
 if(cc.rulesVersion===11&&!canCultivate(s))return false;
 if(!canCultivate(s)&&!rr.workChecked&&age(s)>=22){
  /* ⚠ 闸检查**在置标记之前** —— 被拦就当这个月没这回事，下个月还会再抽一次。 */
  if(!cb.gate('mortal_assessment'))return false;
  rr.workChecked=true;cb.arrive('mortal_assessment');return true;}
 if(!canCultivate(s)&&rr.workCount<3&&s.month>=rr.workDue&&age(s)>=26){
  const id='mortal_life_'+rr.workCount;rr.workCount++;rr.workDue=s.month+72;
  if(!seen(s,id)){cb.arrive(id);return true;}
 }
 if(!canCultivate(s))mundaneLater(s,cb);
 return false;
}
function mundaneLater(s,cb){
 const cc=c(s),rr=r(s),p=s.player;
 for(const milestone of [44,56,67]){
  const key='mundaneOlder'+milestone;if(age(s)<milestone||rr.facts[key])continue;rr.facts[key]=true;
  const skill=Object.entries(p.skills).sort((a,b)=>b[1]-a[1])[0][0];
  if(milestone===44){
   const rows={
    sword:['新来的伙计跟你练木剑','一个年轻伙计搬货时总被人推倒，来问你怎样站稳。你在空院里教他侧身、退步和护住手腕，再用木剑慢慢拆招。你们都没有法力，练的是遇到欺压时先护住自己。'],
    array:['一张旧货签帮新人查清工钱','年轻伙计拿着结工钱的纸来找你，疑惑为何比说好的少。你翻出当日货签，逐笔念出搬货和住店的费用；他带着写清的账目去问雇主，没有只凭一句“少了钱”争吵。'],
    alchemy:['药铺新人认错了两种草叶','新伙计把两种相似草叶包进同一袋。你让他拆开，逐片看叶背的细毛和断茎的汁液，再把有毒的一小把放到旁边。验药的修士来时，能直接看见你们分出的样本。'],
   };const row=rows[skill];add(s,cb,row[0],row[1]);
  }else if(milestone===56){
   const rows=rr.daily.includes(3)?[
    ['早年的家书已经发黄','你整理住处时，重新读到那封问你饭食是否够的家书。信里还提着修好的屋顶，那时家人不知道你能否有活计。你将纸展平，包在干布里，另放在随身的旧册旁。'],
    ['把家书从旧账册中取出','住处有年轻人来借账册，你翻页时发现早年的家书夹在里面。你把它取出另存，留给对方的是货签和算账的例子；纸上家人问过的近况，仍由自己收着。'],
   ]:[
    ['给常用的工具换一个柄','用了多年的木柄裂开了，铺里的人劝你买一套新的。你让匠人看过，保留还结实的部分，只换掉裂柄。新伙计试着握了握，终于知道你为何总提醒他先检查工具再领活。'],
    ['后来的人开始问旧路','年轻货商拿着新图来问从前的渡口。你用桌上的石子摆出当年走过的路，又指明哪些地方已经多年没去。商人另找现在的船户核实，不把你的旧记忆直接当成可走的捷径。'],
   ];const row=rows[hashText(s.seed+':mundane-middle')%rows.length];add(s,cb,row[0],row[1]);
  }else{
   const rows=[
    ['年轻人又要上山求仙','一个准备上山的年轻人向你问路，包里塞着父母留的干粮。你告诉他自己当年的测石没有亮，再把山门外能问食宿的地方说清。你没有替他断言前程，只让他把返乡的路也记住。'],
    ['把最难的一笔账讲给后来的人','年轻伙计来问一笔绕了三家铺子的旧账。你请他把各家货签分开，先查谁实际收了货，再问运费付给谁。他核清后独自去交货，你坐在门边，等他回来讲经过。'],
   ];const row=rows[hashText(s.seed+':mundane-old')%rows.length];add(s,cb,row[0],row[1]);
  }
 }
}
export function mundaneDaily(s){
 if(!active10(s)||canCultivate(s)||age(s)<16)return undefined;
 const cc=c(s),rr=r(s);if(cc.activeChain||cc.context||cc.detained||cc.inquiry)return null;
 const rows=[
  ['先把粮袋缝好再交货','雨水从屋檐落进粮房，你把靠墙的粮袋搬到木架上，缝好裂口。来领粮的人数过袋子，才将收粮木签交给你。'],
  ['木剑练的是脚下功夫','院里的修士能催出剑气，你却只能用木剑练步法。你退开他们练法的地方，在墙下反复练转身和格挡，记住普通人的身手挡不住飞来的法器。'],
  ['药篮里混进了毒草','你翻药篮时发现叶背不对，叫送货人停下。药师认出混入的毒草，重新验过这批货；当天的药没有送进病人的碗里。'],
  ['家里的回信送到了','熟悉的货商带来回信，家人说屋顶已经补过，问你现在是否有活计、饭食够不够。你把住处与近况写在纸上，请他下次经过时带回。'],
  ['替新来的杂役认清院门','新来的人把粮房当作丹房，差点推开贴着禁符的门。你带他走过外院，指出哪里能领饭、哪里不能进，没把修士的门规说成自己也会的本事。'],
  ['掌柜留下了你的货签','药铺一天收了三批货，你逐包写清是谁送来、谁领走。夜里有一包数目不对，掌柜照你的货签找到了搬错箱子的人。'],
 ];
 const available=rows.map((row,i)=>({row,i})).filter(x=>!rr.daily.includes(x.i)&&!(x.i===3&&(cc.familyPolicy==='sever'||!s.life.family.members.some(p=>p.status==='alive'))));
 if(!available.length)return null;
 const picked=available[hashText(s.seed+':mundane:'+rr.daily.length)%available.length];rr.daily.push(picked.i);
 return {title:picked.row[0],body:picked.row[1]};
}
export function validate10(s,fail){
 if(!active10(s))return;
 const rr=r(s),month=n=>Number.isSafeInteger(n)&&n>=0&&n<=13000;
 if(!rr||rr.format!==1||!['unverified','absent','present'].includes(rr.rootStatus)||!['human','nativeBeast'].includes(rr.body))fail('灵根资格');
 if(rr.body==='nativeBeast'&&s.birth.upbringing!=='beast'||rr.rootStatus==='present'&&ROOTS[s.player.root].grade<0||rr.rootStatus==='absent'&&ROOTS[s.player.root].grade>=0)fail('灵根来源');
 if(!canCultivate(s)&&(s.player.realm!==0||c(s).progress!==0||c(s).network.method))fail('无灵根修炼边界');
 if(!Array.isArray(rr.contacts)||rr.contacts.length>32||new Set(rr.contacts.map(p=>p.id)).size!==rr.contacts.length||rr.contacts.some(p=>!month(p.met)||p.met>s.month||typeof p.id!=='string'||typeof p.name!=='string'||typeof p.role!=='string'))fail('剧情人物');
 if(rr.echo&&(!['friend','relic','teacher'].includes(rr.echo.kind)||!['message','deferred','checking','visiting'].includes(rr.echo.status)||!GEOGRAPHY.some(g=>g.id===rr.echo.origin)||!month(rr.echo.due)||!month(rr.echo.sent)||rr.echo.sent>s.month))fail('童年消息后续');
 if(!['reviewChecked','workChecked'].every(k=>typeof rr[k]==='boolean')||!Number.isSafeInteger(rr.workCount)||rr.workCount<0||rr.workCount>3||!month(rr.workDue)||!Array.isArray(rr.daily)||rr.daily.some(i=>!Number.isInteger(i)||i<0||i>5)||new Set(rr.daily).size!==rr.daily.length||!rr.facts||Array.isArray(rr.facts))fail('凡俗与前因记录');
}
