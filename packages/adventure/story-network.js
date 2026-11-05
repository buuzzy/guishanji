import {random,hashText} from '../core/random.js';
import {active10,canCultivate} from './story-rules10.js';
import {CHILD_WINDOWS,METHODS,NETWORK_EVENTS} from '../../content/story-network.js';
const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
const seen=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;
const n=s=>s.life.cultivation.network;
const log=(s,cb,title,body)=>cb.log({kind:'institution',title,body,automatic:true,context:s.life.cultivation.context||'home',location:s.player.location});
const int=(v,max=13000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
function childEligible(s,id){
 if(id==='child_clan'||id==='child_family_vow')return s.birth.family==='clan'&&s.birth.upbringing==='ordinary';
 if(id==='child_keeper'||id==='child_secret')return ['demonic','beast'].includes(s.birth.upbringing);
 if(['demonic','beast'].includes(s.birth.upbringing))return ['child_teacher','child_relic','child_keeper','child_secret'].includes(id);
 return true;
}
export function initializeNetwork(s){
 const childhood=CHILD_WINDOWS.map(w=>{
  const pool=w.events.filter(id=>childEligible(s,id));
  const event=pool[Math.floor(random(s,'events')*pool.length)]||'child_teacher';
  return {event,due:(w.from+Math.floor(random(s,'events')*(w.to-w.from+1)))*12+Math.floor(random(s,'events')*10),done:false};
 });
 s.life.cultivation.network={format:1,childhood,marks:{},echoChecked:false,method:null,methods:[],methodDue:0,bottleneck:false,seekVolume:false,volumeChecked:false,offer:null,arc:null,next:null,offerCount:0,offerChecked:[],quietUntil:0,role:null,progressMonths:0,summary:{month:0,activity:'study',months:0,skill:6},clanChecked:false,seniorChecked:false};
}
export function networkRate(s){
 const info=n(s)?.method;if(!info)return 1;
 const m=METHODS[info.id],fit=m.root.some(x=>s.player.root.includes(x)||x==='木'&&s.player.root==='松骨灵根'||active10(s)&&s.player.root==='五行杂灵根');
 if(info.id==='ember'&&info.months>=60)return .75;
 return Math.min(m.rate,1+(info.months/60)*(m.rate-1))*(fit?1.03:1);
}
function offer(s,kind,reason,cb){
 const a=n(s),c=s.life.cultivation;
 if(a.offer||a.arc||a.offerCount>=3||s.month<a.quietUntil||c.path!=='orthodox'||c.continent!==s.birth.continent||!canCultivate(s))return;
 if(a.offerChecked.includes(kind))return;
 a.offerChecked.push(kind);
 // A deed can lead nowhere; the roll is taken once, never retried each year.
 if(random(s,'events')>.65)return;
 const due=s.month+3+Math.floor(random(s,'events')*9);a.offer={kind,reason,origin:c.continent,due,expires:due+24,danger:kind==='mentor'&&random(s,'events')<.3};a.offerCount++;
 log(s,cb,'证词与功劳送到各堂',reason+' 执事将署名记录送去相关堂院，尚未有人承诺职位或传承。');
}
function stopArc(s){const a=n(s);a.arc=null;a.next=null;a.quietUntil=s.month+60;s.life.cultivation.context=null;}
export function networkAction(s,event,id,success,cb){
 const a=n(s),c=s.life.cultivation,choice=NETWORK_EVENTS[event]?.choices.find(o=>o.id===id),op=choice?.system||{};
 if(op.childMark){a.marks[op.childMark]={month:s.month,event};const ticket=a.childhood.find(x=>x.event===event);if(ticket)ticket.done=true;}
 if(op.method&&success){
  if(a.method){const previous=a.methods.findLast(m=>m.id===a.method.id);if(previous)previous.months=a.method.months;}
  const method={id:op.method,acquired:s.month,months:0,source:event};
  a.methods.push(method);a.method={...method};
  log(s,cb,'主修心法已定',METHODS[op.method].name+'：'+METHODS[op.method].detail+' 灵根适配影响积累效率，熟悉周天仍需日常练习。');
 }
 if(event==='first_method'&&!a.methodDue)a.methodDue=s.month+6;
 if(op.childMark==='friend_witness'||op.childMark==='friend_hide')a.contacts=[{name:'阿宁',role:'童年一起捡柴的人',description:'母亲患病时替她领赊粮，后来是否走上修行尚不清楚。',status:'旧相识，去向尚未确认'}];
 if(event==='network_echo'&&id==='follow'&&a.contacts)a.contacts[0].status='已核过身份，替药师送货';
 if(event==='selection_1_result'&&success){
  const skill=s.player.focus;
  offer(s,skill==='alchemy'?'mentor':skill==='array'?'ward':'archive','教习把你在'+({sword:'试剑台',alchemy:'丹院',array:'经堂'})[skill]+'的表现写入授业记录。',cb);
 }
 if(['sect_repair_2','sect_feud_2','sect_trial_2'].includes(event)&&success&&id==='care'&&(!active10(s)||event!=='sect_repair_2'||s.life.cultivation.story10.facts.repairPlan)){
  const kinds=event==='sect_repair_2'?['ward','archive']:event==='sect_trial_2'?['mentor','archive']:['ward','mentor'];
  offer(s,kinds[Math.floor(random(s,'events')*kinds.length)],event==='sect_repair_2'?'严衡已核过你交出的阵石账与钥匙记录。':event==='sect_trial_2'?'值守药师记下你带回药材与伤员线索的经过。':'严衡记下你据实说明分泉和接回弟子的经过。',cb);
 }
 if(op.network==='echo'&&success&&!a.method&&c.path!=='mortal')a.methodDue=s.month+6;
 if(op.network==='seek_volume'){a.seekVolume=true;a.quietUntil=s.month+36;}
 if(op.network==='force_volume')a.bottleneck=true;
 if(['archive','volume','decline'].includes(op.network)){a.offer=null;a.quietUntil=s.month+60;}
 if(['mentor','ward','ward_rash'].includes(op.network)){
  const kind=op.network==='mentor'?'mentor':'ward';
  a.arc={kind,origin:c.continent,started:s.month,danger:!!a.offer?.danger,rash:op.network==='ward_rash'};
  a.offer=null;a.next={event:'network_'+kind+'_result',due:s.month+(kind==='mentor'?36:24)};c.context='work';
 }
 if(['mentor_finish','ward_finish'].includes(op.network)){
  if(success){c.rank='内门弟子';a.role=op.network==='mentor_finish'?'丹堂跟炉弟子':'北坡掌钥弟子';if(op.network==='mentor_finish')c.teacher='顾长老';cb.apply({skills:{[op.network==='mentor_finish'?'alchemy':'array']:4}});}
  stopArc(s);
 }
 if(['mentor_escape','mentor_end','ward_end'].includes(op.network)){
  if(op.network==='mentor_escape'){
   c.path='loose';c.rank='独立修士';s.player.home='坊市药铺借住';c.history.push({path:'loose',month:s.month});for(const p of ['master','sister','friend','trialmate'])s.people[p].known=false;
   s.life.properties.dwelling={id:'dwelling',name:s.player.home,location:s.player.location,continent:c.continent,status:'kept',acquired:s.month,changed:s.month,value:12};
  }
  stopArc(s);
 }
 if(event==='world_raid'&&a.arc){log(s,cb,'原来的试任被战事打断','山门急讯迫使你停止'+(a.arc.kind==='mentor'?'跟炉':'巡阵')+'差事。没有完成的考核不会发放职位，旧见闻仍在记录中。');stopArc(s);if(c.suspended)c.suspended.context=null;}
 if(op.network==='clan_refuse')a.marks.clan_refusal={month:s.month,event};
 if(op.network==='senior'&&success){c.rank='亲传弟子';a.role='堂院执教';}
 if(op.network==='senior_corrupt'){a.role=null;c.rank='外门弟子';}
 if(c.path!=='orthodox'&&a.offer){log(s,cb,'原堂院的邀请失效','你已经离开原宗门，旧名签不能用于别的师承。');a.offer=null;}
}
export function networkMonth(s,cb){
 const a=n(s),c=s.life.cultivation;
 if(!a)return false;
 const free=s.journey?.open&&!s.pending&&!c.detained&&!c.inquiry&&s.month>=c.punishmentUntil;
 const quiet=free&&!c.activeChain&&!c.context;
 if(a.method&&age(s)>=16&&!c.detained&&!c.inquiry&&s.month>=c.punishmentUntil&&!['travel','work'].includes(c.context)&&!s.journey?.resolution&&c.revision9?.methodFinishedAt!==s.month){a.method.months++;a.progressMonths++;}
 if(age(s)<16){
  if(free){const ticket=a.childhood.find(x=>!x.done&&x.due<=s.month);if(ticket){ticket.done=true;cb.arrive(ticket.event);return true;}}
  return false;
 }
 if(active10(s)&&!canCultivate(s))return false;
 // A world emergency has priority. Its existing transport rules decide whether it can arrive.
 if(c.queue.some(q=>q.event==='world_raid'&&q.due<=s.month))return false;
 if(a.offer&&s.month>a.offer.expires){log(s,cb,'这一轮名额已另作安排','你未在名签期限内到场，原堂院已安排其他弟子。没有获得职位或功法，旧功劳仍保留。');a.offer=null;}
 if(a.arc&&c.path!=='orthodox'){log(s,cb,'原师门的差事停止','你已改换住处与师承，原来的跟炉或巡阵试任不能在新地方继续结算。');stopArc(s);}
 if(a.arc){
  if(s.month%6===0){const key=a.arc.kind==='mentor'?'alchemy':'array';cb.apply({skills:{[key]:.3}});}
  if(free&&a.next&&s.month>=a.next.due){const id=a.next.event;a.next=null;cb.arrive(id);return true;}
  return !!free;
 }
 if(!quiet||!c.admissionDone||c.path==='mortal')return false;
 const notebooks=a.notebooks||=[];
 if(a.method&&a.method.months>=120&&s.month-(s.journal.at(-1)?.month||0)>=96&&s.month-(notebooks.at(-1)?.month||0)>=120&&notebooks.length<8){
  const subjects=[
   ['经脉起止','你把日常运气实际走过的经脉重新画出，纠正早年抄错的两处方向。图中没有添上自己没练过的部分。'],
   ['急火与停练','你整理过往练习中的失手，记下什么时候须停火、养伤，什么时候才可以重新运气。身受的教训比传闻更可信。'],
   ['用过的材料','你把实际用过的普通耗材与闭关材料分开记录，不把稀少的药材写成人人都有的东西。穷时做工的日子也留在页边。'],
   ['周天的细小差别','你对照早年与近年的行气记录，留下呼吸、停顿与换气的差别。这部笔记属于你的练习心得，不是新的境界。'],
   ['困住自己的瓶颈','你把已经经历过的瓶颈和未解之处分别圈出，不因年龄增长便宣称全都懂了。后来者能看到哪里仍需自己核实。'],
   ['护身时的运气','你重新整理已经学会的护身与收势，写明伤重时不可照常催动灵力。笔记里的每一步仍要亲自练习。'],
   ['可以讲清的基础','你只选已经稳定练过的基础，逐句改掉含混的说明。未掌握的禁术没有因为整理笔记便成为可传授的本事。'],
   ['这一部心法的旧批注','你将早年授业时留下的批注与如今的练习分开，不擅自把不同来源的口诀拼成全本。缺失的来源仍标在页末。'],
  ],[subject,body]=subjects[notebooks.length];
  notebooks.push({month:s.month,method:a.method.id,practiceMonths:a.method.months,subject});
  log(s,cb,'修行笔记 · '+subject,body+' 这页记的是你练'+METHODS[a.method.id].name+'的'+a.method.months+'个月经历，已收进自己的心得册。');
 }
 // Admission and already promised stages take priority over optional invitations.
 if(c.queue.some(q=>q.due<=s.month))return false;
 if(!a.clanChecked&&a.marks.clan_vow&&age(s)>=30&&c.familyPolicy!=='sever'&&c.continent===s.birth.continent){a.clanChecked=true;if(random(s,'events')<.6){cb.arrive('network_clan_call');return true;}}
 if(!a.seniorChecked&&a.role&&c.rank==='内门弟子'&&s.player.realm>=2&&s.month-(a.methods.at(-1)?.acquired||c.entered)>=180){a.seniorChecked=true;if(random(s,'events')<.65){cb.arrive('network_senior');return true;}}
 const last=a.summary,practice=c.activityMonths[c.activity]||0,skill=({sword:'sword',alchemy:'alchemy',array:'array',study:'array',work:'alchemy',social:'array',rest:'alchemy'})[c.activity];
 if(s.month-(s.journal.at(-1)?.month||0)>=60&&practice-last.months>=48&&s.player.skills[skill]>last.skill+1){
  const stories={sword:['把一套剑势练到能收住','你把散乱的出剑拆开，每天先练收势。早先急着追剑光时总会拉伤手腕，这几年终于能在转身前停稳，留出护住自己的空隙。'],alchemy:['从药渣里辨出不同的火候','你留下一排小药罐，对照自己练过的火候。几次药渣发黑后，你改掉急着添火的习惯，如今能分清药性变坏前的气味；炼大炉仍需有人指导。'],array:['把旧符纹从头接通','你将平日练过的符纹分段写在木板上，错一笔便重新接路。这些年的重复不是新奇遇，却让你逐渐认出哪一处会断灵，哪一处会倒转阵旗。'],study:['旧经书终于能读到下一页','你把不懂的经脉字句逐条留给授业者核对，不再见到口诀便急着模仿。几年里，有些旧批注被改过，有些终于对上自己运气时的感受。'],work:['手艺活里磨出来的熟练','你照着真实接过的修补活，逐件核对药包、封绳和器物。忙于谋生的几年没有变成离奇冒险，但反复经手的材料让你认得更多细小差别。']};
  if(stories[c.activity]){
   const memory=c.dailyMemory['summary-'+c.activity]||=[];
   if(memory.length<3){const [title,body]=stories[c.activity],phase=memory.length;memory.push(phase);
    const ending=phase===0?'你把练错的那一页留下，作为下一轮练习的起点。':phase===1?'再碰到旧错误时，你已经能自己停下修正，不必每次重新询问。':'你将这些年实际练过的步骤整理成自己的笔记；它们能供后来者参考，却不能代替亲自练习。';
    log(s,cb,title+' · 这'+Math.floor((s.month-last.month)/12)+'年',body+ending);
   }
   a.summary={month:s.month,activity:c.activity,months:practice,skill:s.player.skills[skill]};
  }
 }
 if(a.methodDue&&s.month>=a.methodDue&&!seen(s,'network_method')){cb.arrive('network_method');return true;}
 if(!active10(s)&&!a.echoChecked&&age(s)>=23&&s.month>=a.quietUntil){
  a.echoChecked=true;const related=['friend_witness','friend_hide','herbs','old_page','relic_route','teacher_notes','teacher_route','route_contact'].some(k=>a.marks[k]);
  if(related&&random(s,'events')<.65){cb.arrive('network_echo');return true;}
 }
 if(a.method?.id==='ember'&&a.method.months>=60&&!a.bottleneck&&!seen(s,'network_bottleneck')){a.bottleneck=true;cb.arrive('network_bottleneck');return true;}
 if(a.seekVolume&&!a.volumeChecked&&s.month>=a.quietUntil){a.volumeChecked=true;if(random(s,'events')<.8){cb.arrive('network_volume');return true;}log(s,cb,'书商只找到不同的残页','书商带回的火候图接不上旧页，没有收你的购卷钱。缺页仍未补全，你只能继续基础或另找完整心法。');}
 if(a.offer&&s.month>=a.offer.due&&c.continent===a.offer.origin&&!seen(s,'network_'+a.offer.kind)){cb.arrive('network_'+a.offer.kind);return true;}
 return false;
}
export function validateNetwork(s,fail){
 const a=n(s);if(!a||a.format!==1)fail('故事网络版本');
 if(!Array.isArray(a.childhood)||a.childhood.length!==3||a.childhood.some(x=>!NETWORK_EVENTS[x.event]||!int(x.due,191)||typeof x.done!=='boolean'))fail('童年经历');
 if(!a.marks||Array.isArray(a.marks)||Object.entries(a.marks).length>12||Object.values(a.marks).some(x=>!NETWORK_EVENTS[x.event]||!int(x.month)||x.month>s.month))fail('童年前因');
 for(const method of [...(a.methods||[]),...(a.method?[a.method]:[])])if(!METHODS[method.id]||!int(method.acquired)||method.acquired>s.month||!int(method.months)||method.months>s.month||typeof method.source!=='string')fail('功法来源');
 if(!Array.isArray(a.methods)||a.methods.length>8)fail('功法记录');
 if(!int(a.offerCount,3)||!Array.isArray(a.offerChecked)||a.offerChecked.length>3||a.offerChecked.some(k=>!['archive','mentor','ward'].includes(k)))fail('邀请次数');
 if(a.offer&&(!['archive','mentor','ward'].includes(a.offer.kind)||!int(a.offer.due)||!int(a.offer.expires)||a.offer.expires<a.offer.due||typeof a.offer.reason!=='string'||typeof a.offer.danger!=='boolean'))fail('邀请条件');
 if(a.arc&&(!['mentor','ward'].includes(a.arc.kind)||!int(a.arc.started)||a.arc.started>s.month||typeof a.arc.danger!=='boolean'||typeof a.arc.rash!=='boolean'))fail('试任阶段');
 if(a.next&&(!NETWORK_EVENTS[a.next.event]||!int(a.next.due)||!a.arc))fail('试任后续');
 for(const k of ['echoChecked','bottleneck','seekVolume','volumeChecked','clanChecked','seniorChecked'])if(typeof a[k]!=='boolean')fail('网络机会状态');
 if(!a.summary||!int(a.summary.month)||a.summary.month>s.month||!int(a.summary.months)||!Number.isFinite(a.summary.skill)||a.summary.skill<0||a.summary.skill>100)fail('平静修行记录');
 if(a.contacts&&(!Array.isArray(a.contacts)||a.contacts.length>2||a.contacts.some(p=>typeof p.name!=='string'||typeof p.description!=='string'||typeof p.status!=='string')))fail('童年相识');
 if(a.notebooks&&(!Array.isArray(a.notebooks)||a.notebooks.length>8||a.notebooks.some(p=>!int(p.month)||p.month>s.month||!METHODS[p.method]||!int(p.practiceMonths)||typeof p.subject!=='string')))fail('实际心得记录');
 for(const k of ['methodDue','quietUntil','progressMonths'])if(!int(a[k]))fail('网络时间');
}
