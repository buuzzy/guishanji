import {random,hashText} from '../core/random.js';
import {PATHS,ROOTS,ACTIVITIES,GEOGRAPHY,OFFICERS} from '../../content/cultivation-world.js';
import {LEGACY_ROAD_CHAINS as ROAD_CHAINS,RULES5_CULTIVATION_EVENTS as CULTIVATION_EVENTS,LEGACY_CULTIVATION_EVENTS} from '../../content/cultivation-stories.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
const seen=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;
const delay=(s,min,max)=>min+Math.floor(random(s,'events')*(max-min+1));
export function initializeCultivation(s) {
 const roll=hashText(s.seed+':early')%100,kind=s.birth.era==='fracture'&&roll<9?'beast':roll<12?'demonic':roll<30?'loose':'ordinary';
 s.birth.upbringing=kind;
 const c={format:1,rulesVersion:5,evidence:[],activityMonths:{},activityGains:{},inquiry:null,detained:false,path:'mortal',rank:'未入门',activity:'study',rootKnown:false,progress:0,entered:null,admissionDone:false,choiceAt:192,dailyAt:12,
  punishmentUntil:0,reputation:0,wanted:0,exam:null,attempts:[0,0,0,0,0],retryAt:0,context:null,activeChain:null,chains:{},queue:[],
  continent:s.birth.continent,closed:[],visited:[s.birth.continent],spot:s.birth.address,history:[],familyPolicy:'keep',mail:null,mailHistory:[],familyLoss:'',knownDeaths:[],
  familyAt:28*12,nextFamilyAt:40*12,aidPending:[],familyVisited:false,descendants:[],deathNews:[],routes:[],worldAt:(45+hashText(s.seed+':war')%60)*12,
  worldKind:hashText(s.seed+':world')%3,worldDone:false,finalOffered:false,readiness:0,turnAt:0,officers:OFFICERS.map(p=>({...p,status:'alive',location:'home'}))};
 s.life.cultivation=c;s.life.feedback=false;
 s.life.family.members[0].deathAt=s.birth.family==='clan'?125*12:58*12;
 s.life.family.members[1].deathAt=s.birth.family==='clan'?180*12:82*12;
 return c;
}
export function currentContinent(s){return s.life?.cultivation?.continent||(['home','refuge'].includes(s.player.location)?s.birth.continent:s.player.location);}
export function cultivationActionTrip(s,op={}){
 if(!s.life?.cultivation)return null;
 const c=s.life.cultivation,target=op.familyVisit||op.chain==='sect_return'&&op.step===0&&op.conduct==='care'?s.birth.continent:op.chain==='loose_portal'&&op.step===2?c.chains.loose_portal?.origin:null;
 if(!target)return null;const r=routeOptions(s).find(p=>p.id===target);if(!r?.route)throw Error('没有已确认的返程路线');return {location:target,route:copy(r.route),months:r.months};
}
export function beginCultivationAction(s,selected){const c=s.life.cultivation,op=selected.system||{};if(op.punishment){c.punishmentUntil=s.month+op.punishment;c.activity='work';s.player.focus=ACTIVITIES.work.skill;}}
export function cultivationContext(s) {
 const c=s.life.cultivation;
 if(age(s)<16)return 'childhood';
 if(s.journey?.cultivationTravel||s.journey?.cultivationActionTravel?.route.length>1||s.journey?.event==='loose_portal_0'&&s.journey.choice==='care')return 'travel';
 if(s.journey?.resolution?.event?.startsWith('breakthrough_'))return 'retreat';
 return c.context||(['demonic','beast'].includes(c.path)?c.path:currentContinent(s)===s.birth.continent?'home':'abroad');
}
export function cultivationActivity(s) {
 const c=s.life.cultivation,context=cultivationContext(s);
 if(context==='childhood')return '在'+s.birth.address+'长大';
 if(c.detained)return '被看管在药院，等待下一次换岗';
 if(c.inquiry)return c.inquiry==='beast'?'与白苓相处，了解淬体功法':'核实新功法与离开师门的条件';
 if(context==='travel')return '沿已确认的路线赶路';
 if(context==='retreat')return '在洞府中修炼与调养';
 if(['valley','cavern','outer'].includes(context))return ({valley:'山谷',cavern:'洞府遗迹',outer:'域外'})[context]+'中的探索';
 if(s.month<c.punishmentUntil)return '完成执事安排的杂务';
 return ACTIVITIES[c.activity].name+' · '+s.player.home;
}
export function activityOptions(s) {
 const c=s.life.cultivation,context=cultivationContext(s);
 return Object.entries(ACTIVITIES).map(([id,a])=>{
  let reason='';
  if(s.pending||s.waiting||s.phase!=='life')reason='先回应当前事件';
  else if(c.detained||c.inquiry)reason=c.detained?'被看管期间不能自由安排日常':'先处理正在了解的拜师或离开条件';
  else if(age(s)<16)reason='尚在成长，由家庭安排启蒙';
  else if(['travel','retreat','valley','cavern','outer','work'].includes(context))reason='先结束或离开当前经历';
  else if(s.month<c.punishmentUntil&&id!=='work'&&id!=='rest')reason='处分期间只能完成杂务或调养';
  else if(c.rank==='杂役'&&['alchemy','array'].includes(id)&&!s.flags.learningPermit)reason='需先获得授业许可；可以读经或做工';
  return{id,...a,enabled:!reason,reason};
 });
}
export function changeActivity(s,id) {
 const o=activityOptions(s).find(a=>a.id===id);
 if(!o?.enabled)throw Error(o?.reason||'没有这项日常活动');
 const c=s.life.cultivation;c.activity=id;s.player.focus=o.skill;s.journey.practice=o.skill;s.life.activity=cultivationActivity(s);s.revision++;
 return s;
}
export function cultivationIncome(s) {
 if(age(s)<16)return 0;
 const c=s.life.cultivation;
 if(c.detained||c.inquiry)return 0;
 const stipend=c.path==='orthodox'?({'杂役':1,'外门弟子':3,'内门弟子':6,'亲传弟子':9}[c.rank]||1):c.path==='demonic'?3:1;
 return s.month<c.punishmentUntil?1:stipend+(ACTIVITIES[c.activity].income||0);
}
function schedule(s,event,months=0){const c=s.life.cultivation;if(!seen(s,event)&&!c.queue.some(q=>q.event===event))c.queue.push({event,due:s.month+months});}
function record(s,cb,title,body,kind='life'){cb.log({kind,title,body,automatic:true,location:s.player.location,context:cultivationContext(s)});s.life.automaticCount++;}
function addEvidence(s,event,choice,description,authority){
 const c=s.life.cultivation;if(c.rulesVersion!==5)return;
 if(c.evidence.some(e=>e.event===event&&e.choice===choice))return;
 c.evidence.push({event,choice,description:typeof description==='string'?description:'领用簿和当事人留下的指认',authority:authority||c.history.at(-1)?.path||c.path,origin:currentContinent(s),month:s.month,due:s.month+12,settled:false});
}
export function discoverableEvidence(s){
 const c=s.life.cultivation;if(c.rulesVersion!==5)return c.wanted>0?{}:null;
 return c.evidence.find(e=>{
  if(e.settled||s.month<(e.hiddenUntil||0))return false;
  const queue=[[e.origin]],visited=new Set([e.origin]);let hops=null;
  while(queue.length){const p=queue.shift(),at=p.at(-1);if(at===currentContinent(s)){hops=p.length-1;break;}for(const dest of GEOGRAPHY.find(g=>g.id===at).connections){if(visited.has(dest)||c.closed.includes([at,dest].sort().join('-')))continue;visited.add(dest);queue.push([...p,dest]);}}
  return hops!==null&&s.month>=e.due+hops*18;
 })||null;
}
function registerDwelling(s){s.life.properties.dwelling={id:'dwelling',name:s.player.home,location:s.player.location,continent:currentContinent(s),status:'kept',acquired:s.month,changed:s.month,value:12};}
function setPath(s,path,cb,rank){
 const c=s.life.cultivation,old=c.path;c.path=path;c.rank=rank||({orthodox:'外门弟子',loose:'独立修士',demonic:'幽灯弟子',beast:'山林族人',mortal:'家中后辈'}[path]);
 c.admissionDone=true;c.entered=s.month;c.context=null;c.activeChain=null;c.queue=c.queue.filter(q=>!ROAD_CHAINS.some(a=>q.event.startsWith(a.id+'_')));
 c.spot=PATHS[path].home;s.player.home=c.spot;registerDwelling(s);c.history.push({path,month:s.month});
 if(path==='orthodox') {cb.apply({items:['signal_talisman'],people:{master:{known:true,location:s.player.location},sister:{known:true,location:s.player.location},friend:{known:true,location:s.player.location}}});}
 else for(const id of ['master','sister','friend','trialmate'])s.people[id].known=false;
 if(old!==path)record(s,cb,'进入'+PATHS[path].name+'的生活','你现在住在'+s.player.home+'。旧有的亲属、欠账和他人的记忆仍会继续影响你。');
 if(path!=='mortal')schedule(s,'first_method',2);
}
export function completeCultivationAction(s,event,choiceId,cb) {
 const c=s.life.cultivation,node=(c.rulesVersion!==5&&LEGACY_CULTIVATION_EVENTS[event])||CULTIVATION_EVENTS[event],choice=node?.choices.find(o=>o.id===choiceId),op=choice?.system||{};
 const decision=s.decisions.find(d=>d.event===event&&d.choice===choiceId),success=decision?.success!==false;
 const previousPath=c.path;
 if(event==='root_result')c.rootKnown=true;
 if(op.admit)setPath(s,'orthodox',cb,ROOTS[s.player.root].grade>=3?'亲传弟子':ROOTS[s.player.root].grade===0?'杂役':'外门弟子');
 if(op.path)setPath(s,op.path,cb,op.rank);
 if(op.teacher&&success)c.teacher=op.teacher;
 if(op.activity){c.activity=op.activity;s.player.focus=ACTIVITIES[op.activity].skill;}
 if(op.punishment){const remaining=Math.max(0,op.punishment-(choice.months||0));c.punishmentUntil=s.month+remaining;c.activity='work';record(s,cb,'处分记录',remaining?'执事登记：'+remaining+'个月内完成指定杂务，暂停专业课程与本届考核。':'执事核对了已经完成的杂务，处分期满，可重新申请课程。','institution');}
 if(op.reputation)c.reputation=clamp(c.reputation+op.reputation,-100,100);
 if(op.wanted){c.wanted=clamp(c.wanted+op.wanted,0,10);if(c.rulesVersion===5)addEvidence(s,event,choiceId,choice.reply,previousPath);}
 if(op.offense){c.wanted=clamp(c.wanted+1,0,10);addEvidence(s,event,choiceId,op.offense,previousPath);}
 if(op.settleWanted&&(success||c.rulesVersion!==5)){c.wanted=0;if(c.evidence)c.evidence.forEach(e=>e.settled=true);c.reputation=clamp(c.reputation+6,-100,100);}
 if(op.reduceWanted&&success)c.wanted=clamp(c.wanted-1,0,10);
 if(op.familyPolicy){c.familyPolicy=op.familyPolicy;if(op.familyPolicy==='sever'){s.life.family.reserve=clamp(s.life.family.reserve+8,0,1000);s.life.family.bond=clamp(s.life.family.bond-10);}}
 if(op.familySupport){s.life.family.reserve=clamp(s.life.family.reserve-op.familySupport,0,1000);s.life.family.bond=clamp(s.life.family.bond+5);}
 if(op.familySend){s.life.family.reserve=clamp(s.life.family.reserve+8,0,1000);s.life.family.bond=clamp(s.life.family.bond+8);}
 if(op.exam){c.exam={...op.exam,deadline:s.month+24,started:s.month,preparation:0};schedule(s,event+'_result',24);}
 if(op.examResult){
  if(success&&c.exam&&s.month>=c.punishmentUntil){const skill=c.exam.skill;cb.apply({skills:{[skill]:8},stats:{stones:6},flags:{learningPermit:true}});if(c.path==='orthodox'&&c.rank!=='亲传弟子')c.rank=c.rank==='杂役'?'外门弟子':'内门弟子';record(s,cb,'考核待遇已登记','授业者检查了'+c.exam.preparation+'个月的准备，登记课程许可和本届奖励。','institution');}
  else record(s,cb,'本届考核未通过','你没有取得本届待遇。已有的修为、物品和日常练习仍保留。','institution');
 }
 if(event.startsWith('selection_')&&event.endsWith('_result'))c.exam=null;
 if(op.breakthrough||op.retry){const tier=op.breakthrough||op.retry;c.attempts[tier]++;c.retryAt=s.month+36;if(success&&op.breakthrough){c.progress=0;schedule(s,'family_rules',12);}}
 if(op.chain){
  const chain=ROAD_CHAINS.find(a=>a.id===op.chain),previous=c.chains[chain.id];c.chains[chain.id]={origin:previous?.origin||currentContinent(s),originHome:previous?.originHome||s.player.home,departed:previous?.departed||false,step:op.step,conduct:op.conduct,month:s.month};
  if(op.conduct==='selfish'&&!op.concealed){c.reputation=clamp(c.reputation-8,-100,100);c.wanted=clamp(c.wanted+1,0,10);if(c.rulesVersion===5)addEvidence(s,event,choiceId,choice.reply);}
  if(chain.id==='sect_trial'&&op.step===1&&op.conduct==='selfish'){cb.apply({people:{trialmate:{status:'missing'}}});}
  if(chain.id==='sect_return'&&op.step===0&&op.conduct==='selfish'){c.activeChain=null;c.context=null;c.chains[chain.id].skipped=true;}
  else if(op.step<2){c.activeChain=chain.id;c.context=chain.id==='dark_method'&&op.step===0&&op.conduct==='care'?'valley':chain.context;schedule(s,chain.id+'_'+(op.step+1),op.conduct==='cautious'?6:delay(s,12,30));}
  else {c.activeChain=null;c.context=null;if(op.conduct==='selfish'&&c.path==='orthodox'){c.punishmentUntil=s.month+12;c.activity='work';record(s,cb,'执事登记后续处分','库物和证词核对后，你被安排一年杂务；下一次课程资格仍需重新争取。','institution');}}
  if(op.step===0&&chain.id==='loose_portal'&&op.conduct==='care'&&success){const from=currentContinent(s),dest=GEOGRAPHY.find(p=>p.id===from).connections.find(id=>id!==s.birth.continent)||GEOGRAPHY.find(p=>p.id===from).connections[0];c.continent=dest;c.chains[chain.id].departed=true;cb.apply({location:dest,home:GEOGRAPHY.find(p=>p.id===dest).places[1]+'落脚点'});c.spot=s.player.home;if(!c.visited.includes(dest))c.visited.push(dest);c.routes.push([from,dest]);record(s,cb,'跨界后确认落脚点','你在新的大陆核对了回程地点与定位物。');}
  if(op.step===0&&chain.id==='sect_return'&&op.conduct==='care'){c.continent=s.birth.continent;cb.apply({location:'home',home:'故乡接待处'});}
 }
 const returnTrip=s.journey?.cultivationActionTravel;
 if(returnTrip){c.continent=returnTrip.location;if(returnTrip.route.length>1)c.routes.push(copy(returnTrip.route));if(op.chain==='loose_portal')cb.apply({location:returnTrip.location,home:c.chains.loose_portal.originHome});c.spot=s.player.home;}
 if(op.familyVisit){const member=s.life.family.members.find(p=>p.status==='alive');c.familyVisited=true;const from=currentContinent(s);c.continent=s.birth.continent;cb.apply({location:'home',home:PATHS[c.path].home});c.spot=s.player.home;if(from!==s.birth.continent)c.routes.push([from,s.birth.continent]);if(member)record(s,cb,'见到家中来人',member.name+'讲清了这几年的事。你亲自确认了家中消息。');else record(s,cb,'收到迟到的口信','来人已经离世，接待处只留下旧口信。你没有因为返程而改变这个结果。');for(const p of s.life.family.members)if(p.status==='dead'&&!c.knownDeaths.includes(p.id))c.knownDeaths.push(p.id);for(const p of c.descendants)p.known=true;}
 if(op.familyAid){s.life.family.bond=clamp(s.life.family.bond+8);}
 if(op.familyRefuse){s.life.family.bond=clamp(s.life.family.bond-15);}
 if(op.familyDispute)c.reputation=clamp(c.reputation+(op.familyDispute==='take'?-8:4),-100,100);
 if(op.familyRemember!==undefined){c.familyVisited=op.familyRemember;if(op.familyRemember)for(const p of c.descendants)p.known=true;}
 if(event==='family_gate'){if(c.mail){c.mailHistory.push({...c.mail,received:s.month});c.mail=null;}}
 if(op.relocate){c.spot='安全城镇的租屋';s.player.home=c.spot;c.context=null;c.activeChain=null;c.queue=c.queue.filter(q=>!ROAD_CHAINS.some(a=>q.event.startsWith(a.id+'_')));}
 if(op.inquiry)c.inquiry=op.inquiry;
 if(op.trial)c.context=op.trial==='beast'?'home':'work';
 if(op.cancelInquiry){c.inquiry=null;c.context=null;if(!c.admissionDone)setPath(s,'loose',cb);}
 if(op.registeredTransfer&&success&&previousPath!==c.path){
  // Registration is known at the new teacher's address, not instant global knowledge.
  c.history.at(-1).registered=true;
  const old=c.history.at(-2)?.path;
  if(['orthodox','demonic'].includes(old)){c.wanted=clamp(c.wanted+1,0,10);addEvidence(s,event,choiceId,'原组织点名发现缺席，借阅簿尚未注销；新入堂登记留下了去向',old);}
 }
 if(op.detain){c.detained=true;c.inquiry=null;c.context='work';}
 if(op.coercivePay&&!success){if(!seen(s,'custody_terms')){c.detained=true;c.inquiry=null;c.context='work';schedule(s,'custody_terms',2);}else{record(s,cb,'药商出面阻拦','药商叫来坊市守卫，来人未能再把你押回院中，但没有交还收据，旧账仍在。');}}
 if(op.release){c.detained=false;c.inquiry=null;c.context=null;if(c.path==='demonic')setPath(s,'loose',cb);}
 if(op.evade){for(const e of c.evidence||[])if(!e.settled)e.hiddenUntil=s.month+36;}
 if(op.requestDeparture){
  c.inquiry=null;
  if(c.path==='demonic'){c.detained=true;c.context='work';schedule(s,'custody_terms',2);}
  else setPath(s,'loose',cb);
 }
 let resumed=null;
 if(event==='world_raid'&&choiceId==='defend'&&c.suspended){c.context=c.suspended.context;c.activeChain=c.suspended.chain;for(const q of c.suspended.queue)c.queue.push({event:q.event,due:s.month+q.remaining});if(c.suspended.journey){resumed=c.suspended.journey;if(!resumed.open)resumed.to+=s.month-c.suspended.month;}delete c.suspended;}
 else if(event==='world_raid'){
  const abandoned=c.suspended?.journey?.resolution?.event;
  if(abandoned?.startsWith('breakthrough_')){const [,tier,attempt]=abandoned.split('_');c.attempts[Number(tier)]=Math.max(c.attempts[Number(tier)],Number(attempt)+1);c.retryAt=s.month+36;record(s,cb,'闭关中止','战事迫使你放弃本次闭关。尚未完成的突破不会结算，调养后才可重新尝试。');}
  c.context=null;c.activeChain=null;delete c.suspended;
 }
 if(op.finish){cb.end(({orthodox:'guardian',loose:'loose_home',demonic:'demon_oath',beast:'wild_king',mortal:'mortal_home'})[c.path]);return;}
 if(choice?.next)schedule(s,choice.next,delay(s,2,6));
 c.choiceAt=s.month+delay(s,24,42);s.life.choiceAt=c.choiceAt;s.life.queue=null;if(resumed)s.journey=resumed;else cb.open();s.life.activity=cultivationActivity(s);
}
export function routeOptions(s) {
 const here=currentContinent(s),c=s.life.cultivation;
 return GEOGRAPHY.map(place=>{
  const queue=[[here]],visited=new Set([here]);let route=null;
  while(queue.length){const path=queue.shift(),at=path.at(-1);if(at===place.id){route=path;break;}for(const dest of GEOGRAPHY.find(p=>p.id===at).connections){if(c.closed.includes([at,dest].sort().join('-'))||visited.has(dest))continue;visited.add(dest);queue.push([...path,dest]);}}
  const fee=route?Math.max(0,route.length-1)*(s.birth.era==='ebb'?10:6):0,months=route?Math.max(0,route.length-1)*12:0;
  let reason=place.id===here?'已经在这里':!route?'目前没有已确认的通路':s.pending?'先回应当前事件':c.detained?'被看管期间不能自由离开':c.inquiry?'先处理正在商谈的师承安排':!s.journey?.open||c.activeChain?'先结束或离开当前经历':age(s)<16?'尚在成长':place.id==='sky'&&s.player.realm<2?'跨界阵需要筑基修为':s.player.stones<fee?'路费不足':'';
  return{...place,route,fee,months,enabled:!reason,reason};
 });
}
export function beginTravel(s,id,cb){const r=routeOptions(s).find(p=>p.id===id);if(!r?.enabled)throw Error(r?.reason||'没有这个目的地');s.player.stones-=r.fee;s.journey={from:s.month,to:s.month+r.months,target:null,practice:s.player.focus,cultivationTravel:{location:id,route:r.route}};s.revision++;record(s,cb,'出发前往'+r.name,'路费'+r.fee+'灵石，按已确认的路线赶路，预计'+r.months+'个月。抵达后再寻找住处。','plan');return s;}
export function finishTravel(s,cb){const trip=s.journey.cultivationTravel,c=s.life.cultivation;c.continent=trip.location;cb.apply({location:trip.location,home:GEOGRAPHY.find(p=>p.id===trip.location).places[1]+'租屋'});c.spot=s.player.home;registerDwelling(s);for(const id of trip.route)if(!c.visited.includes(id))c.visited.push(id);if(trip.route.length>1)c.routes.push(copy(trip.route));record(s,cb,'抵达新的住处','你到达'+s.player.home+'，沿路经过的地点已记入地图。');cb.open();}
export function withdrawCultivation(s,cb){const c=s.life.cultivation;if(!c.activeChain||s.pending||s.phase!=='life')throw Error('目前没有可离开的探险');const chain=c.activeChain;c.queue=c.queue.filter(q=>!q.event.startsWith(chain+'_'));c.context=null;c.activeChain=null;s.journey={from:s.month,to:s.month+6,target:null,practice:s.player.focus,cultivationTravel:{location:currentContinent(s),route:[currentContinent(s)]}};s.revision++;record(s,cb,'离开当前探险','你带走已取得的物品，沿已知出口返回。尚未取得的奖励与后续阶段取消。','plan');return s;}
function automaticCultivation(s,cb){
 const c=s.life.cultivation,context=cultivationContext(s);if(s.month<c.dailyAt)return;
 const entries=age(s)<16?[
 ['家人教你认字',s.birth.family==='clan'?'长辈教你辨认护符上的字，也讲明哪些法器不能随意碰。':'家人带你认字、照料药草，村中先生也愿意教你。'],
 ['家中的一天','家人带你去集市。你认识了邻居，也听见远处宗门的消息。'],
 ['住处外的变化',s.birth.upbringing==='ordinary'?'附近商队带来新货，家人忙着安排生计。':'收养你的人讲起早年的战乱，你开始知道自己为何住在这里。'],
 ]:['valley','cavern','outer'].includes(context)?[
 ['检查补给','你清点干粮、药与路标，记下还可用的出口。'],['路上的足迹','你查看周围新留下的足迹，调整了巡查与休息的位置。'],['修复随身器物','你趁休息检查护符，把已有的伤口和破损记入笔记。'],
 ]:context==='retreat'?[
 ['闭关中的练习','你检查功法和经脉，按已经准备的步骤继续练习。'],['石门外的声音','看护者把可以保存的消息留在门外，等待你能接收时转交。'],
 ]:context==='travel'?[
 ['沿路歇脚','你在已确认的驿站歇脚，补充水和干粮。'],['查看下一段路线','你向来往商旅核对下一段路，住处仍留在出发地。'],
 ]:[
 ['这一年的练习','你在'+s.player.home+'坚持'+ACTIVITIES[c.activity].name+'，把学会的本事用于实际生活。'],
 ['授业者检查笔记',PATHS[c.path].teacher+'查看你这段时间的练习，指出遗漏的地方。'],
 ['住处的杂务','你修补住处、清点药与器物，旁人也继续各自的生活。'],
 ['与附近的人相处','你与附近的人交换消息，听见同伴的难处，也记住了可以求助的地方。'],
 ];
 const row=c.detained?['药院里的换岗','你随守卫搬药，记住侧门开闭和点名时辰，没有机会自由外出。']:c.inquiry?['商谈之间的日子','你核对借阅卷册和暂住处的安排，尚未接受新的师徒关系。']:entries[Math.floor(random(s,'daily')*entries.length)];record(s,cb,...row);c.dailyAt=s.month+(age(s)<16?delay(s,24,36):delay(s,24,48));
}
export function cultivationMonth(s,cb){
 const c=s.life.cultivation,context=cultivationContext(s);
 if(age(s)>=16){
  const activity=s.month<c.punishmentUntil?'work':c.activity,a=ACTIVITIES[activity],restricted=['travel','valley','cavern','outer'].includes(context)||c.detained||c.inquiry;
  if(!restricted){
   const before=c.progress;c.progress=clamp(c.progress+(a.progress||1)*ROOTS[s.player.root].rate*(s.birth.era==='ebb'?.8:1),0,1000);
   if(c.rulesVersion===5){c.activityMonths[activity]=(c.activityMonths[activity]||0)+1;const gains=c.activityGains[activity]||={};gains.progress=(gains.progress||0)+c.progress-before;}
   if(s.month%6===0){const beforeSkills=s.player.skills[a.skill],prior=Object.fromEntries(['insight','courage','empathy','health','mind'].map(k=>[k,s.player[k]]));cb.apply({skills:c.rulesVersion===5&&a.trainSkill===false?{}:{[a.skill]:.5},stats:Object.fromEntries(['insight','courage','empathy','health','mind'].filter(k=>a[k]).map(k=>[k,a[k]]))});
    if(c.rulesVersion===5){const gains=c.activityGains[activity];gains[a.skill]=(gains[a.skill]||0)+s.player.skills[a.skill]-beforeSkills;for(const k of Object.keys(prior))if(a[k])gains[k]=(gains[k]||0)+s.player[k]-prior[k];}}
  }
  if(c.exam&&s.player.focus===c.exam.skill&&!restricted&&context!=='retreat'&&s.month<=c.exam.deadline)c.exam.preparation++;
 }
 for(const p of s.life.family.members)if(p.status==='alive'&&s.month>=p.deathAt){p.status='dead';c.familyLoss=p.name+'已经离世。家中仍有人保存旧信与遗物。';c.deathNews.push({id:p.id,due:s.month+(currentContinent(s)===s.birth.continent?3:18),occurred:s.month});}
 if(age(s)>=35&&!c.descendants.length&&s.life.family.members[1].status==='alive')c.descendants.push({id:'niece',name:s.player.name[0]+'小禾',relation:'堂亲的孩子',born:35*12,status:'alive',location:'home',known:false,deathAt:115*12});
 if(age(s)>=70&&c.descendants.length===1)c.descendants.push({id:'grandniece',name:s.player.name[0]+'安宁',relation:'家中下一代',born:70*12,status:'alive',location:'home',known:false,deathAt:150*12});
 for(const p of c.descendants)if(p.status==='alive'&&s.month>=p.deathAt)p.status='dead';
 for(const news of c.deathNews.filter(n=>s.month>=n.due&&!c.activeChain&&s.journey?.open&&c.familyPolicy!=='sever')){if(!c.knownDeaths.includes(news.id)){c.knownDeaths.push(news.id);record(s,cb,'中转者送来家中讣告',s.life.family.members.find(p=>p.id===news.id).name+'已经离世。消息通过旧地址与中转者送到，故乡的生活仍在继续。','people');}}
 if(c.familyPolicy!=='sever'&&!seen(s,'family_gate')&&s.month>=c.familyAt&&!c.mail){
  const p=s.life.family.members.find(p=>p.status==='alive');
  if(p){c.mail={sent:s.month,sentAge:age(s),due:s.month+(currentContinent(s)===s.birth.continent?3:18),body:p.name+'来到'+(c.path==='orthodox'?'旧山门，陆行舟核实身份后，把口信交给沿路宗门的传音阵。':'故乡的药铺，药商核实你的旧地址，再托商队向中转坊市送出口信。'),delayed:false};}
 }
 if(c.mail&&s.month>=c.mail.due&&s.journey?.open&&!c.activeChain&&(!c.closed.length||currentContinent(s)===s.birth.continent)){c.mail.delayed=s.month-c.mail.sent>24;schedule(s,'family_gate');}
 if(age(s)>=16&&!c.admissionDone&&!seen(s,'reception')&&!seen(s,'root_result')&&!c.queue.length){schedule(s,({ordinary:'reception',demonic:'early_demonic',beast:'early_beast',loose:'early_loose'})[s.birth.upbringing]);}
 if(s.month>=c.punishmentUntil&&s.flags.falseTestimony&&!s.flags.learningPermit&&s.month%12===0){cb.apply({flags:{learningPermit:true}});record(s,cb,'杂务期满','执事核对任务记录，结束处分，你可以重新申请课程。','institution');}
 automaticCultivation(s,cb);
 if(!c.worldDone&&s.month>=c.worldAt){
  c.worldDone=true;
  if(c.worldKind===0){
   schedule(s,'world_raid');
  }else {const edge=['home','tide'].sort().join('-');c.closed.push(edge);record(s,cb,c.worldKind===1?'海路暂时封航':'北境关卡易手','青岚与临潮之间的直达路线暂时中断，商队改走其他已确认的通路。','world');}
 }
 const alert=c.queue.find(q=>q.event==='world_raid'&&q.due<=s.month);
 if(alert&&!c.detained&&(context!=='outer'||['moon_key','gate_anchor','sky_scroll'].some(id=>s.inventory.includes(id)))){
  c.suspended={context:c.context,chain:c.activeChain,month:s.month,journey:copy(s.journey),queue:c.queue.filter(q=>ROAD_CHAINS.some(a=>q.event.startsWith(a.id+'_'))).map(q=>({event:q.event,remaining:Math.max(1,q.due-s.month)}))};
  c.queue=c.queue.filter(q=>q!==alert&&!ROAD_CHAINS.some(a=>q.event.startsWith(a.id+'_')));c.context=null;c.activeChain=null;
  record(s,cb,'中转者送来战事急讯','争夺灵泉的战事波及住处，可靠的中转者带来了具体位置。','world');cb.arrive('world_raid');return;
 }
 if(!s.journey?.open)return;
 const due=c.queue.filter(q=>q.due<=s.month&&(!c.detained||q.event.startsWith('custody_'))&&(!c.inquiry||['dark_invitation','dark_oath','beast_invitation','beast_acceptance','departure_terms'].includes(q.event))&&(!c.activeChain||q.event.startsWith(c.activeChain+'_'))&&(!q.event.startsWith('selection_')||!q.event.endsWith('_result')||c.path!=='orthodox'||currentContinent(s)===s.birth.continent)).sort((a,b)=>a.due-b.due);
 if(due.length){const next=due[0];c.queue=c.queue.filter(q=>q!==next);if(!seen(s,next.event))cb.arrive(next.event);return;}
 if(c.activeChain||c.detained||c.inquiry||!c.admissionDone||s.month<c.choiceAt)return;
 const possible=[];
 if(c.path!=='mortal'&&s.player.realm<4&&c.progress>=([80,140,220,320][s.player.realm])&&s.month>=c.retryAt&&c.attempts[s.player.realm+1]<3){const id='breakthrough_'+(s.player.realm+1)+'_'+c.attempts[s.player.realm+1];if(!seen(s,id))possible.push(id);}
 if(c.path==='orthodox'&&currentContinent(s)===s.birth.continent&&s.player.realm>=1&&s.month>=c.punishmentUntil&&!seen(s,'garden_accident'))possible.push('garden_accident');
 if(age(s)>=40&&!seen(s,'road_turn'))possible.push('road_turn');
 const evidence=discoverableEvidence(s);
 if(c.wanted>0&&evidence&&age(s)>=30&&!seen(s,'system_warrant'))possible.push('system_warrant');
 if(c.wanted>0&&evidence&&age(s)>=65&&seen(s,'system_warrant')&&!seen(s,'system_pursuit'))possible.push('system_pursuit');
 const tier=Math.max(1,s.player.realm);if(c.path!=='mortal'&&age(s)>=20&&s.month>=c.punishmentUntil&&!seen(s,'selection_'+tier)&&!c.exam)possible.push('selection_'+tier);
 if(age(s)>=40&&c.familyPolicy!=='sever'&&!seen(s,'family_dispute'))possible.push('family_dispute');
 if(age(s)>=35&&c.familyPolicy!=='sever'&&s.life.family.members.some(p=>p.status==='alive')&&!seen(s,'family_support'))possible.push('family_support');
 if(age(s)>=83&&!seen(s,'family_grave'))possible.push('family_grave');
 for(const chain of ROAD_CHAINS)if(chain.path===c.path&&(chain.path!=='orthodox'||chain.id==='sect_return'||currentContinent(s)===s.birth.continent)&&age(s)>=chain.age&&s.player.realm>=chain.realm&&!seen(s,chain.id+'_0'))possible.push(chain.id+'_0');
 if(age(s)>=75&&c.path==='mortal'||(s.player.realm>=3&&Object.values(c.chains).filter(a=>a.step===2).length>=3&&age(s)>=100)||age(s)>=180){if(!seen(s,'system_final'))possible.push('system_final');}
 if(possible.length){const id=possible[Math.floor(random(s,'events')*possible.length)];if(id==='system_warrant'||id==='system_pursuit')c.trackedEvidence=copy(evidence);const chain=ROAD_CHAINS.find(a=>id===a.id+'_0');if(chain){c.activeChain=chain.id;c.context=chain.context;if(chain.path==='orthodox')cb.apply({people:{trialmate:{known:true,location:s.player.location}}});if(chain.path==='loose'&&s.people.ally.status==='alive')cb.apply({people:{ally:{known:true,location:s.player.location}}});}cb.arrive(id);}else c.choiceAt=s.month+12;
 s.life.activity=cultivationActivity(s);
}
export function validateCultivation(s,fail){
 const c=s.life?.cultivation;if(!c)return;
 if(c.rulesVersion!==undefined&&c.rulesVersion!==5)fail('修行规则版本');
 if(c.rulesVersion===5){
  if(!Array.isArray(c.evidence)||c.evidence.length>64||c.evidence.some(e=>!CULTIVATION_EVENTS[e.event]||!GEOGRAPHY.some(g=>g.id===e.origin)||!PATHS[e.authority]||typeof e.description!=='string'||e.description.length>1000||!Number.isSafeInteger(e.month)||e.month>s.month||!Number.isSafeInteger(e.due)||e.due<e.month||typeof e.settled!=='boolean'||e.hiddenUntil!==undefined&&!Number.isSafeInteger(e.hiddenUntil)))fail('追查证据');
  if(!c.activityMonths||!c.activityGains||Object.entries(c.activityMonths).some(([id,v])=>!ACTIVITIES[id]||!Number.isSafeInteger(v)||v<0||v>s.month)||Object.entries(c.activityGains).some(([id,gains])=>!ACTIVITIES[id]||!gains||Object.entries(gains).some(([k,v])=>!['progress','sword','alchemy','array','insight','courage','empathy','health','mind'].includes(k)||!Number.isFinite(v)||v<0)))fail('日常积累记录');
  if(typeof c.detained!=='boolean'||c.inquiry!==null&&!['demonic','beast','loose'].includes(c.inquiry))fail('拜师与看管状态');
  if(c.teacher!==undefined&&(typeof c.teacher!=='string'||c.teacher.length>20))fail('授业者');
 }
 if(c.format!==1||!PATHS[c.path]||!ACTIVITIES[c.activity]||!ROOTS[s.player.root]||!['ordinary','demonic','beast','loose'].includes(s.birth.upbringing))fail('修行道路');
 if(!GEOGRAPHY.some(p=>p.id===c.continent))fail('实际所在大陆');
 for(const p of Object.values(s.life.properties))if(p.continent&&!GEOGRAPHY.some(g=>g.id===p.continent))fail('财产所在大陆');
 for(const key of ['progress','reputation','wanted'])if(!Number.isFinite(c[key])||c[key]<(key==='reputation'?-100:0)||c[key]>(key==='progress'?1000:key==='wanted'?10:100))fail('修行积累');
 for(const key of ['choiceAt','dailyAt','punishmentUntil','retryAt','familyAt','nextFamilyAt','worldAt'])if(!Number.isSafeInteger(c[key])||c[key]<0||c[key]>13000)fail('修行时钟');
 if(typeof c.rank!=='string'||c.rank.length>20||typeof c.spot!=='string'||c.spot.length>60||!Array.isArray(c.queue)||c.queue.length>24||!Array.isArray(c.visited)||c.visited.some(id=>!GEOGRAPHY.some(p=>p.id===id)))fail('修行地点与后续');
 for(const q of c.queue)if(!CULTIVATION_EVENTS[q.event]||!Number.isSafeInteger(q.due)||q.due<0||q.due>13000||s.decisions.some(d=>d.event===q.event))fail('修行事件队列');
 if(!Array.isArray(c.attempts)||c.attempts.length!==5||c.attempts.some(v=>!Number.isInteger(v)||v<0||v>3))fail('突破次数');
 if(!['keep','secret','sever'].includes(c.familyPolicy)||!Array.isArray(c.mailHistory)||c.mailHistory.length>8)fail('俗缘');
 if(c.mail&&(!Number.isSafeInteger(c.mail.sent)||!Number.isSafeInteger(c.mail.due)||c.mail.sent>s.month||typeof c.mail.body!=='string'||c.mail.body.length>1000))fail('中转消息');
 if(c.exam&&(!['sword','array','alchemy'].includes(c.exam.skill)||!Number.isInteger(c.exam.deadline)||!Number.isInteger(c.exam.preparation)||c.exam.preparation<0))fail('考核记录');
 if(c.activeChain&&!ROAD_CHAINS.some(a=>a.id===c.activeChain))fail('长故事');
 if(!Array.isArray(c.routes)||c.routes.length>64||c.routes.some(r=>!Array.isArray(r)||r.length>8||r.some(id=>!GEOGRAPHY.some(p=>p.id===id))))fail('实际地图路线');
 if(!Array.isArray(c.descendants)||c.descendants.length>2||c.descendants.some(p=>!['alive','dead'].includes(p.status)||!Number.isSafeInteger(p.born)||p.born>s.month||typeof p.name!=='string'||p.name.length>16))fail('家中后代');
 if(!Array.isArray(c.deathNews)||c.deathNews.length>2||c.deathNews.some(p=>!Number.isSafeInteger(p.due)||!Number.isSafeInteger(p.occurred)||p.occurred>s.month))fail('家中讣告');
 if(!Array.isArray(c.knownDeaths)||c.knownDeaths.some(id=>!s.life.family.members.some(p=>p.id===id&&p.status==='dead')))fail('已确认的家中消息');
 if(!c.chains||Array.isArray(c.chains)||Object.keys(c.chains).some(id=>!ROAD_CHAINS.some(a=>a.id===id)))fail('故事记录');
 for(const a of Object.values(c.chains))if(!Number.isInteger(a.step)||a.step<0||a.step>2||!['care','cautious','selfish'].includes(a.conduct)||!Number.isSafeInteger(a.month)||a.month>s.month||!GEOGRAPHY.some(p=>p.id===a.origin))fail('故事阶段');
 if(c.suspended){const p=c.suspended;if(!Number.isSafeInteger(p.month)||p.month>s.month||!p.journey||!Number.isSafeInteger(p.journey.from)||p.journey.from>p.month||!Number.isSafeInteger(p.journey.to)||p.journey.to<p.month||!Array.isArray(p.queue)||p.queue.length>24||p.chain&&!ROAD_CHAINS.some(a=>a.id===p.chain))fail('中断的安排');for(const q of p.queue)if(!CULTIVATION_EVENTS[q.event]||!Number.isSafeInteger(q.remaining)||q.remaining<1||q.remaining>12000)fail('中断的故事阶段');}
 if(!Array.isArray(c.closed)||c.closed.length>8||c.closed.some(id=>!/^([a-z]+)-([a-z]+)$/u.test(id)))fail('封锁的路线');
 if(!Array.isArray(c.history)||c.history.length>24||c.history.some(h=>!PATHS[h.path]||!Number.isSafeInteger(h.month)||h.month>s.month))fail('师承变更');
 if(c.context&&!['home','work','travel','retreat','valley','cavern','outer'].includes(c.context))fail('修行情境');
 for(const t of [s.journey?.cultivationTravel,s.journey?.cultivationActionTravel].filter(Boolean))if(!GEOGRAPHY.some(p=>p.id===t.location)||!Array.isArray(t.route)||!t.route.length||t.route.at(-1)!==t.location||t.route.some(id=>!GEOGRAPHY.some(p=>p.id===id)))fail('实际行程');
}
export function cultivationText(input,s,event,kind='node'){
 let text=String(input||'');
 if(s.life.cultivation.teacher==='白苓')text=text.replaceAll('山中老猿','白苓').replaceAll('老猿','白苓');
 if(event==='world_raid'&&(s.life.cultivation.suspended?.chain||s.life.cultivation.suspended?.journey&&!s.life.cultivation.suspended.journey.open)){
  if(kind==='node')text='中转者带来住处的战况：'+text.replaceAll('你看到','信中说');
  if(kind==='option')text=text.replaceAll('协助守住撤离路','传音告知守阵人撤离办法');
  if(kind==='reply')text=text.replaceAll('你们守住一段出口','同门按你转交的办法守住一段出口');
 }
 if(kind==='node'&&event?.startsWith('selection_')&&event.endsWith('_result')&&s.life.cultivation.exam&&s.month>s.life.cultivation.exam.deadline)text='本届考核已经结束。截止那天你没有到达考场，执事保留了报名记录，但没有给你登记成绩与奖励。你可以退出本届，日后准备下一阶段的考核。';
 if(kind==='node'&&event==='dark_method_1'&&s.life.cultivation.chains.dark_method?.conduct==='cautious')text='药师把试药者的记录交给你：有人用原来的禁术伤了经脉。你还没有服用这份药，先决定怎样处理功法与药方。';
 if(kind==='node'&&event==='loose_relic_1'&&s.life.cultivation.chains.loose_relic?.conduct==='cautious')text='你在洞口勘查时，探路者送来消息：另一队修士堵住了药室。嵇萝请你决定是否进洞协商，或沿已查明的路离开。';
 if(event?.startsWith('loose_portal_')&&event!=='loose_portal_0'&&!s.life.cultivation.chains.loose_portal?.departed)text=kind==='option'?'请探路队'+text:'白渡通过已经稳住的阵台转告探路队消息：'+text.replaceAll('你','探路队');
 if(event?.startsWith('sect_return_')&&s.life.cultivation.chains.sect_return?.conduct==='cautious'&&currentContinent(s)!==s.birth.continent)text=kind==='option'?'请支援队'+text:'支援队经中转阵送来报告：'+text.replaceAll('你','支援队');
 if(kind==='reply'&&event==='dark_method_1')text=text.replaceAll('你停下禁术','你暂不使用原禁术');
 if(s.people.ally.status==='dead')text=text.replaceAll('嵇萝','当地接应的修士');
 if(s.people.trialmate.status==='dead'&&event!=='sect_trial_2')text=text.replaceAll('陶宁','另一位采药弟子');
 if(s.people.trialmate.status==='missing'&&event!=='sect_trial_2')text=text.replaceAll('陶宁','另一位采药弟子');
 return text;
}
