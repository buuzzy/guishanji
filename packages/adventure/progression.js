import {revisionChoice,revisionProse} from './revision9.js';
import {hashText,random} from '../core/random.js';
import {NOVEL_NAMES} from '../../content/novel-names.js';
import {ROOTS,GEOGRAPHY} from '../../content/cultivation-world.js';
import {mundaneChoice} from './mundane-life.js';
import {progressNeeded,METHOD_MONTHS} from '../../content/realm-thresholds.js';
const active=s=>s.life?.cultivation?.rulesVersion>=8;
const c=s=>s.life.cultivation,p=s=>c(s).progression;
const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
const seen=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;
const has=(s,id)=>s.inventory.includes(id);
const add=(s,cb,title,body,kind='institution')=>cb.log({kind,title,body,automatic:true,location:s.player.location,context:c(s).context||'home'});
const usedNames=new Set(),reservedAliases=new Set();
const EXTRA_NAMES=[['余衡','M'],['阿宁','M'],['白苓','F'],['杜魁','M'],['顾长老','M'],['余掌柜','M'],['顾渊','M'],['陆岑','M'],['秦岳','M'],['顾临川','M'],['沈长老','M'],['林长老','M']];
function routeFrom(s,from,target){const cc=c(s),todo=[[from]],visited=new Set([from]);while(todo.length){const route=todo.shift(),at=route.at(-1);if(at===target)return route;for(const next of GEOGRAPHY.find(g=>g.id===at).connections){if(visited.has(next)||cc.closed.includes([at,next].sort().join('-')))continue;visited.add(next);todo.push([...route,next]);}}return null;}
function homeRoute(s){return routeFrom(s,c(s).continent,s.birth.continent);}
function notify(s,cb,title,body){if(s.journey?.open&&!s.pending)add(s,cb,title,body,'people');else p(s).notices.push({month:s.month,title,body});}
function nameFor(s,id,sex='M',suffix=''){
 const list=NOVEL_NAMES.filter(n=>n.sex===sex);let i=hashText(s.seed+':人物:'+id)%list.length;
 for(let k=0;k<list.length;k++){const candidate=list[(i+k)%list.length].name;if(!usedNames.has(candidate)&&!usedNames.has(suffix?candidate[0]+suffix:candidate)&&![...reservedAliases].some(alias=>(suffix?candidate[0]+suffix:candidate).includes(alias))){usedNames.add(candidate);if(suffix)usedNames.add(candidate[0]+suffix);return candidate;}}
 return list[i].name+['川','衡','宁'][hashText(id)%3];
}
export function initializeProgression(s){
 const cc=c(s);usedNames.clear();usedNames.add(s.player.name);reservedAliases.clear();for(const name of [...Object.values(s.people).map(p=>p.name),...cc.officers.map(p=>p.name),...EXTRA_NAMES.map(([name])=>name),...s.life.family.members.map(p=>p.name)])reservedAliases.add(name);const names={};
 for(const [id,person] of Object.entries(s.people)){const old=person.name;person.name=nameFor(s,id,person.sex);names[old]=person.name;}
 const highest=2+hashText(s.seed+':宗门战力')%3,size=highest===2?'小宗门':highest===3?'中等宗门':'大宗门';
 for(const officer of cc.officers){const old=officer.name,personName=names[old]||nameFor(s,'officer-'+officer.id,'M',old.includes('执事')?'执事':old.includes('宗主')?'宗主':'');officer.name=personName;officer.realm=Math.min(officer.realm,highest);names[old]=old.includes('执事')?personName[0]+'执事':old.includes('宗主')?personName[0]+'宗主':personName;}
 for(const person of Object.values(s.people))if(['master','sister','friend','trialmate'].includes(person.id))person.realm=Math.min(person.realm,highest);
 for(const [old,sex] of EXTRA_NAMES)if(!names[old]){const n=nameFor(s,'extra-'+old,sex,old.endsWith('长老')?'长老':old.endsWith('掌柜')?'掌柜':'');names[old]=old.endsWith('长老')?n[0]+'长老':old.endsWith('掌柜')?n[0]+'掌柜':n;}
 const prefixes=['栖云','照水','青衡','松岚','归鹤','玄溪','临月','回霜'],sectName=prefixes[hashText(s.seed+':山门')%prefixes.length]+(highest===2?'门':'宗');names['渡云宗']=sectName;
 for(const member of s.life.family.members){const old=member.name,n=nameFor(s,'family-'+member.id,member.id==='parent'?'M':'F');member.name=s.player.name[0]+n.slice(1);names[old]=member.name;}
 cc.progression={format:1,names,early:[{due:12,done:false},{due:30,done:false},{due:54,done:false}],sect:{name:sectName,size,highest,npcHighest:highest,phase:'intact',role:null,treasury:0,care:0,development:0,councils:0},materialDeclined:[],materialAbandoned:[],notices:[],parcel:null,parcels:[],yearsCount:0,yearsDue:0,tribulationReady:false,tribulationDeclined:false,lastRealm:0,scene:null};
 s.life.family.money=0;
 if(cc.rulesVersion===9)for(const alias of ['顾魇','阿栾'])cc.progression.names[alias]=nameFor(s,'revision9-'+alias,'M');
}
export function prose(input,s){
 let text=String(input??'');if(!active(s))return text;if(s.life.cultivation.rulesVersion>=9)text=revisionProse(text);
 for(const sentence of ['旧有的亲属、欠账和他人的记忆仍会继续影响你。','境界不替你决定接下来的路。','担任执教可以领取亲传待遇，但不是境界自动换来的身份。','境界高不代表一定教得好。','尚未到场前不能算救回堂兄。','日后族人可能凭信来求助。'])text=text.replaceAll(sentence,'');
 const names=p(s).names,keys=Object.keys(names).sort((a,b)=>b.length-a.length);text=text.replace(new RegExp(keys.map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu'),key=>names[key]);return text.trim();
}
export function materialSlots(s,tier){
 return tier===3?[[has(s,'condensation_book'),'凝丹真解','condensation_book'],[has(s,'beast_core')||has(s,'false_core'),'妖兽内丹或可用假丹',has(s,'beast_core')?'beast_core':'false_core'],[has(s,'golden_pill')||has(s,'rough_pill'),'凝丹辅药',has(s,'golden_pill')?'golden_pill':'rough_pill']]:[[has(s,'soul_book'),'育婴真解','soul_book'],[has(s,'soul_flower'),'养魂莲','soul_flower'],[has(s,'nascent_pill')||has(s,'rough_nascent'),'护婴丹',has(s,'nascent_pill')?'nascent_pill':'rough_nascent']];
}
export function progressionChoice(s,choice,event){
 if(!active(s)||!choice)return choice;let out={...choice};
 if(event.startsWith('breakthrough_')){
  const tier=Number(event.split('_')[1]);if(choice.id==='wait'){out.label=s.player.health<75?'先恢复受损的经脉':'留在住处继续准备';out.hint=s.player.health<75?'请药师核过伤势，再决定何时封门。':tier>=3?'先核功法与主药，不急着封门。':'继续学习功法，积攒还缺的闭关材料。';out.reply=s.player.health<75?'你请药师核过经脉，暂时停下冲关。':'你收起封门符，继续学习功法与准备材料。';}
  if(tier>=3&&choice.id==='try'){
   const slots=materialSlots(s,tier),missing=slots.filter(x=>!x[0]).map(x=>x[1]);out.requires={...(out.requires||{}),items:slots.filter(x=>x[0]).map(x=>x[2])};out.available=()=>!missing.length&&(c(s).network.method?.months||0)>=(METHOD_MONTHS[tier]||0);out.reason=missing.length?'尚缺 '+missing.join('、'):'这份主修心法还需完整练过一段时间';out.cost={items:slots.slice(1).filter(x=>x[0]).map(x=>x[2])};out.check={...out.check,base:out.check.base+(has(s,'false_core')?-6:0)+(ROOTS[s.player.root].grade>=2?3:0)};
  }
 }
 const op=choice.system||{};
 if(op.progression==='parcel'&&['search','convert'].includes(choice.id)&&p(s).parcel){out.months=Math.max(out.months||0,12+6+(p(s).parcel.route.length-1)*18);}
 if(op.progression==='parcel'&&choice.id==='guard'){const route=homeRoute(s);out.available=()=>!!route;out.reason='回乡的通路已经中断';out.cost={stones:route?(route.length-1)*(s.birth.era==='ebb'?3:2):0};}
 if(op.progression==='remit'){out.available=()=>!p(s).parcel&&s.life.family.members.some(m=>m.status==='alive')&&homeRoute(s)!==null;out.reason=p(s).parcel?'前一份物资还没有交接清楚':'家中没有确认在世的收物人，或商路已经中断';}
 if(op.progression==='rebuild'&&c(s).continent!==s.birth.continent){if(op.route==='delegate'){out.startReply='你留在当前住处，托传音阵请掌事与留下的长老核过水源和账册，安排伤员食宿。';out.reply='掌事送来住处修好和账册交接的回信，你仍在原落脚点，约定以后按传音路线联系。';}else{const route=homeRoute(s);out.cost={stones:route?(route.length-1)*(s.birth.era==='ebb'?3:2):0};out.available=()=>!!route;out.reason='没有已经确认的返程路线';}}
 if(op.publicCost){const allowed=p(s).sect.treasury>=op.publicCost;out.available=()=>allowed;out.reason='掌事核过账册，目前公产不足以支付这项安排';}
 if(op.progression==='years'){
  const months=op.mode==='retreat'?180+s.player.realm*60:op.mode==='recover'?120:180;
  out.months=months;out.cost=op.mode==='stay'?{}:{stones:Math.min(s.player.stones,op.mode==='recover'?2:4)};
 }
 return mundaneChoice(s,revisionChoice(s,out,event),event);
}
export function progressionText(input,s,event,kind){
 let text=String(input||'');if(!active(s))return text;
 if(event==='sect_return_0'&&kind==='node')text=c(s).continent===s.birth.continent?'山门的警钟突然响起。守阵弟子奔来告知：敌宗切断了山下水路，许执事正在转移弟子，闻竹留在阵门阻挡追兵。你当前的差事只能先放下，去接应同门或请附近宗门援助。':'传音阵亮起旧山门的灯号，陆行舟核过你的落脚点才送来急讯：敌宗切断了山下水路，许执事正在转移弟子，闻竹仍在守阵。消息到达时战事已起，是否返程需要看眼前仍开放的路线。';
 if(event==='sect_return_0'&&kind==='option'&&c(s).continent===s.birth.continent)text=text.replaceAll('赶回','赶到山门').replaceAll('继续远行','留在当前住处');
 if(event?.startsWith('selection_')&&Number(event.split('_')[1])>=2&&kind==='reply')text=text.replaceAll('报名','约定评议').replaceAll('被收下','取得新的指点');
 return prose(text,s);
}
function departEvent(s,id,cb,scene=null){const cc=c(s);if(seen(s,id))return false;cc.progression.scene=scene;cb.arrive(id);return true;}
export function progressionMonth(s,cb){
 if(!active(s))return false;const cc=c(s),pp=p(s);
 if(cc.descendants.length){pp.namedDescendants||=[];for(const person of cc.descendants.filter(d=>!pp.namedDescendants.includes(d.id))){const old=person.name,list=NOVEL_NAMES.filter(n=>n.sex==='F'),name=s.player.name[0]+list[hashText(s.seed+':后辈:'+person.id)%list.length].name.slice(1);person.name=name;pp.names[old]=name;pp.namedDescendants.push(person.id);}}
 const early=pp.early.find(x=>!x.done&&s.month>=x.due);if(early&&age(s)<6){early.done=true;const i=pp.early.indexOf(early);const family=s.life.family.members[0].name;
  const ordinary=[['学着喊出家人的名字',family+'把你抱到院里，指着门边的人教你叫名字。你先认出每天给你端饭的人，堂亲从屋里拿来一只拨浪鼓。'],['跟着大人走过集市',family+'带你去集市，货摊和牲口挤在路旁。你走累了，被抱到背篓边；回家时仍记得药铺门前那只会响的铜铃。'],['第一次帮家中照看东西','大人修屋时，把几件小工具放到你面前。你照着交代一件件递过去，认不清的先举起来问；家人留下一块平整木片，让你学着写自己的名字。']];
  const special=[['照看者记住了你的声音','照看你的长辈听见你醒来，放下手里的卷册，把温水端到床边。门外仍有守卫，你最先认得的是每天替你换被褥的人。'],['院门内的一次探路','你跟照看者走到院门，看到外面还有其他孩子和送饭的人。守门者不让孩子独自出去，长辈牵着你回屋，教你认回床边的路。'],['有人教你认第一行字','照看者在旧纸上写下你的名字，让你用木炭慢慢描。隔壁孩子凑来看，你们把纸放在窗边，轮流认上面的字。']];
  const row=s.birth.upbringing==='ordinary'?ordinary[i]:special[i];add(s,cb,row[0],row[1],'life');
 }
 if(s.journey?.event?.startsWith('years_practice_')&&s.journey.choice==='retreat'&&cc.network.method){cc.network.method.months++;cc.network.progressMonths++;}
 if(pp.parcel?.status==='returning'&&s.month>=pp.parcel.due){const parcel=pp.parcel;s.player.stones+=parcel.amount;cc.economy.received+=parcel.amount;parcel.status='returned';pp.parcels.push({...parcel,received:s.month});pp.parcel=null;notify(s,cb,'没有收物人的包裹退回了','药商未能找到仍在世的收物人，按原约定退回物资，将粮钱兑回灵石与你交接。家中没有因此收到一笔新的资助。');}
 if(pp.parcel&&s.month>=pp.parcel.due&&pp.parcel.status==='sent'){
  const parcel=pp.parcel,route=routeFrom(s,parcel.origin,s.birth.continent);const blocked=parcel.route.slice(1).some((at,i)=>cc.closed.includes([parcel.route[i],at].sort().join('-')));
  if(blocked){parcel.due=s.month+(route?6+(route.length-1)*18:12);if(route)parcel.route=route;if(!parcel.delayed){parcel.delayed=true;notify(s,cb,'托送的商队被关卡拦住','药商核过封航消息，原定的路已经不能走。包裹仍未交付，商队要等通路恢复，或改走另一条确认过的商路。');}}
  else if(!s.life.family.members.some(m=>m.status==='alive')){parcel.status='returning';parcel.due=s.month+6+(parcel.route.length-1)*18;notify(s,cb,'旧屋里已经没有原收物人','药商到旧屋才确认原收物人已经离世，没有把包裹交给陌生住户，正在按约定退回。');}
  else{parcel.status='awaiting';const roll=random(s,'events');parcel.outcome=parcel.mode==='coin'?'delivered':roll<.22?'missing':roll<.5?'exposed':'delivered';
   if(parcel.outcome==='delivered'){parcel.status='delivered';if(parcel.mode==='coin')s.life.family.money+=3000;else s.life.family.reserve+=parcel.amount;pp.parcels.push({...parcel,received:s.month});pp.parcel=null;notify(s,cb,'家中送回了收物的口信',parcel.mode==='coin'?'药商按约定把灵石兑成粮钱，交到家中仍在世的人手里。回信说漏雨的屋顶已经请匠人看过，余钱留作粮食与日常开销。':'家人收到封好的灵石，托药商报了平安。东西仍由他们保管，你没有亲眼看到后来的安排。');}
  }
 }
 if(pp.parcel?.status==='awaiting'&&!s.pending&&!s.journey?.event?.startsWith('parcel_')){const base=pp.parcel.outcome==='missing'?'parcel_missing':'parcel_exposed',event=[base,...Array.from({length:7},(_,i)=>base+'_'+(i+1))].find(id=>!seen(s,id));
  if(!event)return false;
  if(s.journey?.open&&!cc.activeChain&&!cc.network.arc)return departEvent(s,event,cb);
  if(pp.parcel.outcome==='exposed'&&s.journey?.resolution&&!pp.interrupted&&!cc.suspended){pp.interrupted={journey:JSON.parse(JSON.stringify(s.journey)),context:cc.context,month:s.month};add(s,cb,'代收消息的人送来家中急讯','守在住处的护法核过传音口信，通知你家中有人打听送去的灵物。这一程行动先停在眼前的进度，你可以托人处理，或放下当前事情亲自回去。','people');return departEvent(s,event,cb);}
 }
 if(pp.notices.length&&s.journey?.open&&!s.pending){const notice=pp.notices.shift();add(s,cb,notice.title,notice.month<s.month?'这封口信先前已送到代收处，你现在才打开。 '+notice.body:notice.body,'people');}
 if(!s.journey?.open||s.pending||cc.activeChain||cc.detained||cc.inquiry||cc.network.arc||cc.network.offer||cc.exam||age(s)<16||s.month<cc.punishmentUntil)return false;
 if(pp.sect.phase==='camp'&&!seen(s,'sect_rebuild'))return departEvent(s,'sect_rebuild',cb,'camp');
 if(pp.sect.revengeDue&&s.month>=pp.sect.revengeDue&&!seen(s,'sect_revenge'))return departEvent(s,'sect_revenge',cb,'camp');
 if(pp.sect.phase==='rebuilt'&&pp.sect.role==='leader'&&pp.sect.councils<3&&s.month>=pp.sect.nextCouncil){return departEvent(s,'sect_council_'+pp.sect.councils,cb,'settlement');}
 const tier=s.player.realm+1;
 /* 攒够这一境的门槛才开始备主药 —— 门槛从规则层读，不在这里另写一份。 */
 if(tier>=3&&tier<=4&&cc.progress>=progressNeeded(tier)&&s.month>=cc.retryAt){
  const attempt=cc.attempts[tier];if(attempt<3&&!pp.materialDeclined.includes(tier)){
   const slots=materialSlots(s,tier),part=slots.findIndex(x=>!x[0]);if(part>=0){let id=`advance_material_${tier}_${attempt}_${part}`;if(seen(s,id)&&pp.materialAbandoned.includes(id))id+='_resume';if(!seen(s,id))return departEvent(s,id,cb,part===1?'valley':'retreat');}
  }
 }
 if(s.player.realm>=4&&!pp.tribulationReady&&!pp.tribulationDeclined&&cc.worldDone&&!seen(s,'tribulation_prepare'))return departEvent(s,'tribulation_prepare',cb,'retreat');
 if(s.player.realm>=3&&pp.yearsCount<4&&s.month>=Math.max(pp.yearsDue,cc.choiceAt)&&s.month-(s.decisions.at(-1)?.month||0)>=24){return departEvent(s,'years_practice_'+pp.yearsCount,cb);}
 return false;
}
export function progressionBegin(s,selected){
 if(!active(s))return;const op=selected.system||{},pp=p(s);
 if(op.publicCost){if(pp.sect.treasury<op.publicCost)throw Error('公产不足');pp.sect.treasury-=op.publicCost;}
 if(op.progression==='material')c(s).context=op.part===1?(selected.id==='search'?'valley':'work'):op.part===2&&selected.id==='commission'?'work':'retreat';
 if(op.progression==='years')c(s).context=op.mode==='stay'?null:'retreat';
 if(op.progression==='tribulation')c(s).context=op.decline?null:'retreat';
 if(['rebuild','council'].includes(op.progression))c(s).context='work';
 if(selected.months>=60){pp.scene=op.progression==='years'?op.mode==='hide'?'hide':'retreat':op.progression==='material'&&op.part===1?'valley':op.progression==='revenge'?'travel':op.progression==='council'?'settlement':op.progression==='rebuild'?'camp':'retreat';}
}
export function progressionAction(s,event,choiceId,success,cb){
 if(!active(s))return;const cc=c(s),pp=p(s),decision=s.decisions.findLast(d=>d.event===event&&d.choice===choiceId);pp.scene=null;
 if(/^(advance_material_|years_practice_|tribulation_prepare|sect_rebuild|sect_council_|sect_revenge|parcel_)/u.test(event))cc.context=null;
 if(event==='sect_return_2'&&choiceId==='care'&&success){pp.sect.phase='camp';pp.sect.treasury=18;pp.sect.care=0;if(cc.continent===s.birth.continent)cb.apply({home:'旧山门下的临时营地'});add(s,cb,'撤离者在安全处扎营','带出的粮药交给掌事逐项登记，伤员先安置在有水源的棚屋。弟子请你商议接下来的去处，旧山门还不能回住。');}
 if(s.player.realm>pp.lastRealm){
  pp.lastRealm=s.player.realm;
  if(s.player.realm>=3&&cc.path==='orthodox'){const title=s.player.realm>=pp.sect.npcHighest?'山门请你参与守山议事':'长老请你担任护法';if(pp.sect.role!=='leader'&&pp.sect.role!=='supporter'){pp.sect.role='core';cc.rank=s.player.realm>=pp.sect.npcHighest?'守山长老':'宗门护法';}pp.sect.highest=Math.max(pp.sect.highest,s.player.realm);add(s,cb,title,pp.sect.name+'原有长老中最高修为是'+['凡身','炼气','筑基','金丹','元婴'][pp.sect.npcHighest]+'，他们来信请你承担护法与守山的一部分事务。掌事仍保管粮药与阵石，每次领用需与守库者核过。');}
 }
 const material=event.match(/^advance_material_(\d)_(\d)_(\d)(?:_resume)?$/u);if(material&&choiceId==='leave')pp.materialDeclined.push(Number(material[1]));
 if(event.startsWith('years_practice_')){pp.yearsCount++;pp.yearsDue=s.month+(choiceId==='stay'?60:24);if(choiceId==='hide')for(const e of cc.evidence||[])if(!e.settled)e.hiddenUntil=s.month+60;}
 if(event==='tribulation_prepare'){pp.tribulationReady=choiceId==='prepare'&&success;pp.tribulationDeclined=choiceId==='decline';}
 if(event==='sect_rebuild'&&success){pp.sect.phase='rebuilt';pp.sect.role=choiceId==='lead'?'leader':'supporter';pp.sect.nextCouncil=s.month+48;cc.rank=choiceId==='lead'?'新山门领事人':cc.rank;pp.sect.treasury=Math.max(0,pp.sect.treasury-6);if(cc.continent===s.birth.continent)cb.apply({home:choiceId==='lead'?'新山门弟子院':'山下坊市租屋'});if(choiceId==='revenge')pp.sect.revengeDue=s.month+12;add(s,cb,'新山门的账册留下两份','掌事与守库弟子各留一份账册，共同物资没有算进你的行囊。住处和护阵已经能用，后续差事仍要逐项安排。');}
 if(event.startsWith('sect_council_')){pp.sect.councils++;pp.sect.nextCouncil=s.month+60;if(choiceId==='leave')pp.sect.role='supporter';else if(success){pp.sect.development++;pp.sect.treasury+=choiceId==='earn'?6:choiceId==='teach'?4:2;}}
 if(event==='sect_revenge'&&success&&choiceId==='fight')pp.sect.treasury+=6;
 /* T5 · 旧敌令印有了出口：拿去查，就得押出去。
  * ⚠ **只改当前版本（规则十二）** —— 旧档（5–11）的执行器与事件表一个字节都不许动。
  * ⚠ 为什么是「押出去」而不是「用完」：令印是唯一的凭据，查完就交回不来了；
  *   玩家因此要想清楚，要不要为「把发令者查清楚」花掉这件东西。 */
 if(cc.rulesVersion===12&&event==='sect_revenge'&&success&&choiceId==='investigate'){
  cb.apply({remove:['old_enemy_seal']});
  add(s,cb,'令印押给了药商','你把撤离时留下的敌宗令印押给药商，请他按印记上的旧记号去比对。药商要押物作保，先说三个月未必有回音；后来寄回来的只有一张写明来处的纸。令印没有还你。');
 }
 if(event.startsWith('parcel_missing')||event.startsWith('parcel_exposed')){
  const parcel=pp.parcel;if(parcel){if(choiceId==='search'||choiceId==='convert'){s.life.family.money+=3000;parcel.status='recovered';}else if(choiceId==='guard'){s.life.family.reserve+=parcel.amount;parcel.status='delivered';}else parcel.status='lost';pp.parcels.push({...parcel,received:s.month});pp.parcel=null;}
  if(pp.interrupted){const old=pp.interrupted;if(choiceId!=='guard'){old.journey.to+=s.month-old.month;pp.resumeJourney=old.journey;cc.context=old.context;add(s,cb,'回到原来停下的进度','代收人处理好传话，你回到先前停下的练习。用于处理急讯的年月另计，原行动还需完成余下的部分。');}else{if(old.journey.event?.startsWith('breakthrough_')){const tier=Number(old.journey.event.split('_')[1]);cc.attempts[tier]=Math.min(3,cc.attempts[tier]+1);cc.retryAt=s.month+36;}if(old.journey.event?.startsWith('advance_material_'))pp.materialAbandoned.push(old.journey.event);add(s,cb,'原来的行动没有完成','你放下先前的差事，亲自回乡。未取得的材料和未完成的冲关不会在这次归来时发放。');}delete pp.interrupted;}
 }
 if(['family_support','family_gate'].includes(event)&&['send','aid','stones'].includes(choiceId)){
  const isRemit=choiceId==='stones'||(choiceId==='send')||(event==='family_gate'&&choiceId==='aid');if(isRemit){const route=homeRoute(s);if(!route)throw Error('商路已经中断');pp.parcel={mode:choiceId==='stones'?'stone':'coin',amount:3,sent:s.month,due:s.month+6+(route.length-1)*18,status:'sent',origin:cc.continent,route,recipient:s.life.family.members.find(m=>m.status==='alive')?.id};}
 }
 // Contacts generated by the earlier story network share this life's name map.
 for(const contact of cc.network.contacts||[]){contact.name=prose(contact.name,s);contact.description=prose(contact.description,s);}
}
export function longAction(s){if(!active(s))return null;const j=s.journey;if(!j||j.open||!j.resolution||j.to-j.from<(c(s).rulesVersion===11&&j.event?.startsWith('m11_')?24:60))return null;return {from:j.from,to:j.to,months:j.to-j.from,event:j.event};}
export function playbackSeconds(s){const j=longAction(s);return j?Math.max(10,Math.min(18,j.months/24))/j.months:(age(s)<6?3:age(s)<16?6:8)/12;}
export function sceneFor(s){if(!active(s))return null;const pp=p(s),cc=c(s),event=s.pending?.event||s.journey?.event;if(cc.rulesVersion===11&&event?.startsWith('m11_siege_'))return event==='m11_siege_0'?'siege':'camp';if(cc.rulesVersion===11&&event==='m11_corpse_0')return 'travel';if(cc.rulesVersion===11&&event?.startsWith('m11_gift_')&&s.journey?.resolution)return 'retreat';if(s.journey?.cultivationActionTravel?.route.length>1&&s.month<s.journey.to)return 'travel';if(event?.startsWith('sect_return_'))return cc.continent===s.birth.continent?'siege':null;if(event==='world_raid')return cc.suspended?.journey&&!cc.suspended.journey.open?cc.suspended.context:'siege';if(cc.revision9?.arc==='mine'||event==='thin_root_mine')return 'mine';if(pp.scene)return pp.scene==='camp'&&cc.continent!==s.birth.continent?null:pp.scene;if(pp.sect.phase==='camp'&&cc.continent===s.birth.continent)return 'camp';if(pp.sect.phase==='rebuilt'&&cc.continent===s.birth.continent)return 'settlement';if(event==='tribulation_prepare'||event==='system_final'&&pp.tribulationReady)return 'tribulation';return null;}
export function validateProgression(s,fail){
 if(!active(s))return;const pp=p(s);if(!pp||pp.format!==1||!pp.names||Array.isArray(pp.names)||Object.keys(pp.names).length>128||Object.values(pp.names).some(n=>typeof n!=='string'||!n||n.length>16))fail('人物名册');
 if(!Array.isArray(pp.early)||pp.early.length!==3||pp.early.some((e,i)=>e.due!==[12,30,54][i]||typeof e.done!=='boolean'))fail('幼年经历');
 const sect=pp.sect;if(!sect||!['intact','camp','rebuilt'].includes(sect.phase)||![2,3,4].includes(sect.highest)||![2,3,4].includes(sect.npcHighest)||sect.highest<sect.npcHighest||!Number.isInteger(sect.treasury)||sect.treasury<0||sect.treasury>1000||!Number.isInteger(sect.councils)||sect.councils<0||sect.councils>3||!['core','leader','supporter',null].includes(sect.role))fail('宗门状态');
 if(!Array.isArray(pp.materialDeclined)||pp.materialDeclined.some(t=>![3,4].includes(t))||!Number.isInteger(pp.yearsCount)||pp.yearsCount<0||pp.yearsCount>4||typeof pp.tribulationReady!=='boolean'||typeof pp.tribulationDeclined!=='boolean')fail('多年修行与渡劫');
 if(!Array.isArray(pp.parcels)||pp.parcels.length>8)fail('家中物资');for(const parcel of [pp.parcel,...pp.parcels].filter(Boolean))if(!['coin','stone'].includes(parcel.mode)||!Number.isSafeInteger(parcel.sent)||!Number.isSafeInteger(parcel.due)||parcel.sent>s.month||parcel.due<parcel.sent||parcel.due>13000||!['sent','awaiting','delivered','lost','recovered','returning','returned'].includes(parcel.status)||parcel.amount!==3||!Array.isArray(parcel.route)||!parcel.route.length||parcel.route.some(id=>!GEOGRAPHY.some(g=>g.id===id)))fail('家中运送记录');
 if(!Array.isArray(pp.notices)||pp.notices.length>16||pp.notices.some(n=>!Number.isSafeInteger(n.month)||n.month>s.month||typeof n.body!=='string'||n.body.length>600)||!Array.isArray(pp.materialAbandoned)||pp.materialAbandoned.length>12||pp.materialAbandoned.some(id=>!/^advance_material_[34]_[012]_[012](?:_resume)?$/u.test(id)))fail('代收消息与中断记录');
 if(pp.interrupted&&(!Number.isSafeInteger(pp.interrupted.month)||pp.interrupted.month>s.month||!pp.interrupted.journey?.resolution||pp.interrupted.journey.to<pp.interrupted.month||!/^advance_material_|^years_practice_|^breakthrough_|^sect_|^tribulation_prepare$/u.test(pp.interrupted.journey.event)))fail('急讯暂停的行动');
 if(!Number.isFinite(s.life.family.money)||s.life.family.money<0)fail('家中粮钱');
}
