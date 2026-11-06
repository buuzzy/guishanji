import {hashText} from '../core/random.js';
import {REALMS} from '../../content/adventure.js';
import {BODY_TYPES,SECT_PROFILES,REGIONAL_METHODS} from '../../content/rules12-world.js';
import {ROOTS,GEOGRAPHY} from '../../content/cultivation-world.js';
import {canCultivate,route} from './story-rules10.js';
const c=s=>s.life.cultivation;
export const active12=s=>s.life?.cultivation?.rulesVersion===12;
export const rules12=s=>c(s).v12;
const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
const roll=(s,key)=>hashText(s.seed+':rules12:'+key)%10000;
const log=(s,cb,title,body,kind='life')=>cb.log({title,body,kind,automatic:true,location:s.player.location,context:c(s).context||'home'});
const done=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;
export const sectProfile=s=>SECT_PROFILES.find(p=>p.id===rules12(s).sect);
export const homeReceiver12=s=>s.life.family.members.find(p=>p.status==='alive')||c(s).descendants.find(p=>p.status==='alive'&&p.location==='home')||null;
export function initialize12(s){
 const b=roll(s,'body')%100,key=b<15?'frail':b<36?'sturdy':b<38?'mighty':'ordinary',type=BODY_TYPES[key];
 const profiles=SECT_PROFILES.filter(p=>p.region===s.birth.continent),sect=profiles[roll(s,'sect')%profiles.length];
 const highest=c(s).progression.sect.highest;
 c(s).v12={format:1,body:{type:key,natural:type.min+roll(s,'span')%type.span,loss:0,damage:0,illness:false,treated:false,diagnosed:false},sect:sect.id,
  patron:{until:highest===2?45:highest===3?60:75,noticed:false,stopped:false},
  childhood:{due:30+roll(s,'childhood')%36,kind:roll(s,'illness')<2000?'fever':'ordinary',done:false},
  practice:{stage:0,offered:[],next:20*12,notes:[],materialsDue:0},action:null,visit:null,visits:0,clue:{checked:false,due:0,accepted:false,lossAt:0},facts:{}};
 s.player.health=type.health;
 const names=c(s).progression.names;names['渡云宗']=sect.name;c(s).progression.sect.name=sect.name;
 for(const m of s.life.family.members){if(s.birth.family!=='clan')m.deathAt=(m.id==='parent'?38:49)*12+(roll(s,'relative:'+m.id)%20)*12;}
}
export function lifespan12(s){
 if(!active12(s))return REALMS[s.player.realm].lifespan;
 const b=rules12(s).body,base=s.player.realm===0?b.natural:s.player.realm===1?b.natural+45:REALMS[s.player.realm].lifespan+(b.natural-66);
 return Math.max(age(s),Math.round(base-b.loss));
}
export function stage12(s){
 if(!active12(s)||s.player.realm!==1)return '';
 const p=c(s).progress;return p<65?'炼气初期':p<130?'炼气中期':p<210?'炼气后期':'炼气圆满';
}
export function practiceFactor12(s){
 if(!active12(s))return 1;const r=rules12(s),b=r.body,a=r.action;
 return BODY_TYPES[b.type].rate*Math.max(.55,1-b.damage*.015)*(a?.kind==='retreat'?1.65:a?.kind==='travel'? .65:1);
}
export function choice12(s,choice,event){
 if(!active12(s)||!choice)return choice;const o={...choice},r=rules12(s);
 if(event.startsWith('breakthrough_')){
  const tier=Number(event.split('_')[1]);
  if(o.id!=='wait'){
   const grade=ROOTS[s.player.root].grade,older=tier===2?Math.max(0,age(s)-55)*.8:0;
   const pill=s.inventory.includes('foundation_pill');
   o.check={...(o.check||{}),base:(o.check?.base||44)+(grade>=2?10:grade===1?0:-12)-r.body.damage-older+(tier===2&&pill?16:0),skill:o.check?.skill||'array',scale:o.check?.scale??.2,stat:'insight',statScale:.12,
    failText:tier===1?'灵气几次散出经脉，胸口疼得无法继续。看护者叫你停下，先休养再试；这次没有炼出稳定法力。':'药力散尽，真气却没能凝稳。你吐出一口血，护脉者把你扶出石室；这次冲关没有成功。',failure:{stats:{health:tier===1?-10:-18,mind:-4}}};
   if(tier>=3){o.check={...choice.check,base:choice.check.base-r.body.damage};}
   if(tier===2&&pill)o.cost={...o.cost,items:[...(o.cost?.items||[]),'foundation_pill']};
   if(o.id==='service'){o.months=(tier===1?24:36)+(tier===1?12:24);o.system={...o.system,service12:true};o.startReply='你先替授业者做完约定的差事，换取这一份材料，再封门尝试冲关。';}
  }
 }
 return o;
}
export function begin12(s,choice){
 if(!active12(s))return;const r=rules12(s),op=choice.system||{};
 if(/^r12_direction_[0-5]$/.test(s.result?.event)&&!r.practice.offered.includes(s.result.event))r.practice.offered.push(s.result.event);
 if(op.familyVisit&&!r.visit)r.visit={index:r.visits,origin:c(s).continent,home:s.player.home,location:s.player.location,arrived:false,resolved:false,due:0};
 if(op.plan12){r.action={kind:op.plan12,from:s.month,to:s.month+(choice.months||0),notes:0,origin:c(s).continent,home:s.player.home};c(s).context=op.plan12==='retreat'?'retreat':op.plan12==='travel'?'travel':'work';}
}
function setMethod(s,id,event,cb){
 const a=c(s).network;if(a.method?.source===event){a.method.id=id;const last=a.methods.at(-1);if(last)last.id=id;}
 else {a.method={id,source:event,months:0,acquired:s.month};a.methods.push({...a.method});}
 log(s,cb,'授业者展开了新卷',REGIONAL_METHODS[id]?.name+'的第一幅行气图画在卷首。授业者让你照图走过一遍，遇到旧习惯冲突的地方便停下重练。','institution');
}
export function complete12(s,event,choice,success,cb){
 if(!active12(s)||!choice)return;const r=rules12(s),op=choice.system||{},id=choice.id;
 if(op.breakthrough){if(success){r.practice.stage=0;r.practice.next=s.month+48;}else{r.body.damage=Math.min(30,r.body.damage+(op.breakthrough===1?2:5));r.body.loss+=op.breakthrough===1?1:3;}}
 if(op.method&&REGIONAL_METHODS[op.method]&&success)setMethod(s,op.method,event,cb);
 if(op.regionalCore12&&success)setMethod(s,sectProfile(s).core,event,cb);
 if(op.method&&!REGIONAL_METHODS[op.method]&&success&&c(s).network.method?.id!==op.method){const a=c(s).network;a.method={id:op.method,source:event,months:0,acquired:s.month};a.methods.push({...a.method});}
 if(event==='world_raid'&&r.action){if(choice.id==='defend'&&c(s).suspended){r.action.to+=s.month-c(s).suspended.month;}else{r.action=null;c(s).context=null;}}
 if(event==='world_raid'&&r.visit&&choice.id!=='defend'){r.facts.homeInterrupted=true;r.visit=null;r.visits++;log(s,cb,'家事被战火打断','你还没办完这次家事，就被迫离开。原来的交代尚未兑现，先前没有修好的屋子也不能算已经修好；安顿后只能再找人核实故乡的情况。','people');}
 if(event==='root_result'&&['join','servant'].includes(id))log(s,cb,'在'+sectProfile(s).name+'安顿下来',sectProfile(s).style+'。教习把可学的课程指给你看，内门全卷仍由长老保管。','institution');
 if(op.body12){r.childhood.done=true;r.body.diagnosed=true;
  if(op.body12==='healer'||op.body12==='immortal'){if(success){r.body.treated=true;r.body.illness=false;}else{r.body.damage+=3;r.body.loss+=5;}}
  if(op.body12==='rest'){r.body.illness=false;r.body.loss+=3;}
  if(op.body12==='immortal'&&success){r.facts.immortalHelp=true;if(roll(s,'latent')<600&&ROOTS[s.player.root].grade<0){s.player.root='五行杂灵根';c(s).story10.rootStatus='present';log(s,cb,'药师换过了测石','治病的药师复查经脉，发现先前的测石漏掉了极弱的五行灵息。他只准你先练最慢的基础吐纳，尚未许下入宗名额。','institution');}}
 }
 if(op.familyVisit&&r.visit){
  r.visit.arrived=true;c(s).continent=s.birth.continent;s.player.location='home';s.player.home=s.birth.address+'家中旧屋';c(s).spot=s.player.home;r.visit.due=s.month+1;
  const p=homeReceiver12(s);c(s).familyVisited=true;for(const m of s.life.family.members)if(m.status==='dead'&&!c(s).knownDeaths.includes(m.id))c(s).knownDeaths.push(m.id);for(const d of c(s).descendants)if(d.location==='home')d.known=true;(c(s).network.visits||=[]).push({month:s.month,reserve:s.life.family.reserve});
  log(s,cb,'走到了家中的院门',p?p.name+'为你开了院门。你先坐下听这些年家里发生的事，原住处的差事已经托人照看。':'邻人替你开了旧院门，亲人已不在。箱子里留着他们的旧信，你坐在屋里，把未能赶回来的那些年慢慢读完。','people');
 }
 if(op.home12){r.visit.resolved=true;r.visit.due=s.month+1;s.life.family.bond=Math.min(100,s.life.family.bond+4);if(op.home12==='money')s.life.family.money+=1000;if(op.home12==='repair'&&s.life.properties.family_home){s.life.properties.family_home.status='kept';s.life.properties.family_home.changed=s.month;}}
 if(op.return12&&r.visit){const v=r.visit;c(s).continent=v.origin;s.player.location=v.location;s.player.home=v.home;c(s).spot=v.home;log(s,cb,'回到离开时的住处','你沿原先约定的路回来，把行囊放进'+v.home+'。家事已经交代清楚，出发时托人代管的东西也逐件领回。','people');r.visit=null;r.visits++;c(s).context=null;}
 if(op.stay12){r.visit=null;r.visits++;c(s).path='mortal';c(s).rank='家中长辈';c(s).context=null;}
 if(op.plan12){r.action=null;c(s).context=null;r.practice.next=s.month+36;}
 if(/^r12_direction_[0-5]$/.test(event)){if(!r.practice.offered.includes(event))r.practice.offered.push(event);}
 if(op.patron12){r.patron.noticed=true;if(op.patron12==='leave'){c(s).path='loose';c(s).rank='独立修士';s.player.home=c(s).spot='坊市药铺旁的租屋';}}
 if(op.clue12){r.clue.checked=true;if(op.clue12==='accept'&&success){setMethod(s,sectProfile(s).source,event,cb);r.clue.accepted=true;r.clue.lossAt=s.month+60;}if(op.clue12==='report')log(s,cb,'旧井的抄本送出了山门','你把见到的刻文交给过路阵师。长老暂时封起旧井，门内少了一处灵气来源，没人敢保证下一批耗材。','world');}
 if(op.foundation12&&success)cb.apply({items:['foundation_pill']});
 if(op.sealed12==='stop'){r.clue.accepted=false;setMethod(s,sectProfile(s).base,event,cb);}
 if(event==='road_turn'&&id==='book')r.facts.bazaarBook=true;
 if(event.startsWith('sect_trial_')){const f=r.facts.trial||={entered:false,rescued:false,stolen:false,herbs:false};if(event==='sect_trial_0'){f.entered=success;f.herbs=success&&id!=='cautious';}if(event==='sect_trial_1'){f.rescued=success&&id==='care';f.stolen=success&&id==='selfish';if(id==='cautious')f.herbs=false;}}
 if(op.return12&&s.life.properties.dwelling){s.life.properties.dwelling.name=s.player.home;s.life.properties.dwelling.location=s.player.location;s.life.properties.dwelling.continent=c(s).continent;}
}
export function month12(s,cb){
 if(!active12(s))return false;const r=rules12(s),cc=c(s),open=s.journey?.open&&!s.pending;
 if(!r.childhood.done&&s.month>=r.childhood.due&&age(s)<16&&open){
  if(r.childhood.kind==='fever'){r.body.illness=true;cb.apply({stats:{health:-18}});cb.arrive('r12_child_fever');}
  else cb.arrive('r12_child_body');return true;
 }
 if(r.visit){if(open&&r.visit.arrived&&s.month>=r.visit.due)cb.arrive((r.visit.resolved?'r12_home_leave':'r12_home_resolve')+(r.visit.index?'_'+r.visit.index:''));return true;}
 const follow=cc.queue.find(q=>q.event==='r12_bazaar_follow');if(follow){if(open&&s.month>=follow.due){cc.queue=cc.queue.filter(q=>q!==follow);cb.arrive(follow.event);}return true;}
 if(r.action){const a=r.action;
  if(a.kind!=='work'&&cc.network.method&&canCultivate(s))cc.network.method.months++;
  if(s.month-a.from>=Math.floor((a.to-a.from)/3)*(a.notes+1)&&a.notes<2){
   const texts=a.kind==='retreat'?['石门内，最初几个月总有真气散开。你不再追着旧口诀硬冲，把运气时胸闷的地方圈出来，逐段重练。','经脉渐渐能留住灵气，你停下急着添药的念头，将最后一份材料封好，留待冲关。']:a.kind==='travel'?['你随商队走过荒岭，看到散修为一处小灵泉争执。夜里你靠在石壁边运气，白天仍要跟紧队伍。','山外的灵气远不如传闻充足。你学会分清能借宿的药铺与设伏的废院，把回去的路另外记下。']:['第一批料被重新验过，掌柜没有因为你有修为就免去差错。你一边领活，一边记下换料所欠的工期。','最后几箱药材封好，掌柜把约定的报酬放在桌边，等交接完毕才让你取走。'];
   log(s,cb,a.kind==='retreat'?'石室里的修炼':a.kind==='travel'?'山外的日子':'换料差事的进展',texts[a.notes]);a.notes++;
  }return true;
 }
 const task=s.journey?.resolution,span=s.journey?s.journey.to-s.journey.from:0;
 if(task&&span>=120){
  const key=task.event+':'+s.journey.from,notes=r.facts.longNotes||={},number=notes[key]||0;
  if(number<2&&s.month-s.journey.from>=Math.floor(span/3)*(number+1)){
   notes[key]=number+1;const material=task.event.startsWith('advance_material_');
   log(s,cb,material?'跟授业者准备主药':'多年修炼中的一次停练',material?(number?'授业者重新验过药性，让你把药力不稳的那几株另外养着。余下的材料还没交到手里，你继续按约定做完差事。':'你先把最容易养坏的药苗分开，跟授业者学辨药性。几季过去，药园的成活数有了变化，主药仍要等对方验过才能领取。'):(number?'你停下催动真气，重新对照入关时的笔记。能走稳的周天已经写清，没能贯通的地方仍留着空白；护法在石门外换过一次药。':'长时间运气后，你发现真气总在一处经脉急转。你不再强行冲过去，把这一段拆开细练，洞府外的守门人按约定送来补给。'));
  }
 }
 const free=open&&!cc.activeChain&&!cc.context&&!cc.detained&&!cc.inquiry&&!cc.exam&&!cc.network.arc&&!cc.revision9.arc&&!cc.mundane?.arc&&s.month>=cc.punishmentUntil;
 if(!free||age(s)<16||!cc.admissionDone||!canCultivate(s))return false;
 if(r.clue.accepted&&cc.network.method?.id==='sealed'&&s.month>=r.clue.lossAt){r.body.loss+=2;r.body.damage=Math.min(30,r.body.damage+2);r.clue.lossAt=s.month+60;log(s,cb,'借来的灵息回到了井下','又一次运气后，你比从前更疲惫。井底的阵纹亮起，抽走一缕养在经脉里的气息。药师说这不是普通寒症，让你仔细考虑是否继续借井修炼。');if(!done(s,'r12_sealed_warning')){cb.arrive('r12_sealed_warning');return true;}}
 if(cc.path==='orthodox'&&s.player.realm<2&&!r.patron.noticed&&age(s)>=r.patron.until-5){cb.arrive('r12_patron');return true;}
 if(cc.path==='orthodox'&&s.player.realm<2&&age(s)>=r.patron.until&&!r.patron.stopped){r.patron.stopped=true;log(s,cb,'执事收回了耗材领取签','先前说过的供料年限已到。执事收回领取基础耗材的木签，住处与已借到的卷册仍准你保留；往后的修行材料要另筹。','institution');}
 if(cc.queue.some(q=>q.due<=s.month))return false;
 if(s.player.realm===0&&age(s)>=r.body.natural-12&&!done(s,'r12_late_doubt')){cb.arrive('r12_late_doubt');return true;}
 if(cc.path==='orthodox'&&!r.clue.checked&&age(s)>=38&&(cc.rank==='内门弟子'||s.flags.learningPermit)&&roll(s,'secret')<1200){r.clue.checked=true;cb.arrive('r12_sect_clue');return true;}
 if(s.player.realm===1&&cc.progress>=200&&!done(s,'r12_foundation_supply')&&(cc.rank==='内门弟子'||s.birth.family==='clan'||ROOTS[s.player.root].grade>=2)&&roll(s,'pill')<2200){cb.arrive('r12_foundation_supply');return true;}
 const ready=cc.progress>=(s.player.realm===0?80:260)&&s.month>=cc.retryAt&&cc.attempts[s.player.realm+1]<3;
 if(s.player.realm<=1&&!ready&&cc.network.method&&s.month>=r.practice.next&&s.month-(s.decisions.at(-1)?.month||0)>=24){
  const index=r.practice.offered.length;if(index<6){cb.arrive('r12_direction_'+index);return true;}
 }
 if(s.player.realm===1){const stage=cc.progress<65?0:cc.progress<130?1:cc.progress<210?2:3;if(stage>r.practice.stage){r.practice.stage=stage;log(s,cb,'修到了'+stage12(s),'你把真气沿已练熟的经脉运转，过去总会散开的那一段终于接稳。'+(stage===3?'教习让你停下强行加快周天，筑基所需的丹药与护脉准备还没有因此齐全。':'教习让你用这一段稳定的真气练护身，新的口诀仍要慢慢学。'),'cultivation');}}
 return false;
}
export function validate12(s,fail){
 if(!active12(s))return;const r=rules12(s),int=(n,max=13000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 if(!r||r.format!==1||!SECT_PROFILES.some(p=>p.id===r.sect))return fail('规则12宗门');
 const b=r.body;if(!b||!BODY_TYPES[b.type]||!int(b.natural,90)||b.natural<40||!int(b.loss,200)||!int(b.damage,30)||['illness','treated','diagnosed'].some(k=>typeof b[k]!=='boolean'))fail('规则12体质');
 if(!r.patron||!int(r.patron.until,100)||typeof r.patron.noticed!=='boolean'||typeof r.patron.stopped!=='boolean')fail('规则12资助');
 if(!r.practice||!Array.isArray(r.practice.offered)||r.practice.offered.length>6||r.practice.offered.some(id=>!/^r12_direction_[0-5]$/.test(id))||new Set(r.practice.offered).size!==r.practice.offered.length||!int(r.practice.next)||!int(r.practice.stage,3))fail('规则12修行');
 if(r.action&&(!['retreat','travel','work'].includes(r.action.kind)||!int(r.action.from)||r.action.from>s.month||!int(r.action.to)||r.action.to<r.action.from||!int(r.action.notes,2)))fail('规则12多年安排');
 if(!int(r.visits,6)||r.visit&&(!int(r.visit.index,5)||!GEOGRAPHY.some(p=>p.id===r.visit.origin)||typeof r.visit.home!=='string'||!int(r.visit.due)||typeof r.visit.arrived!=='boolean'||typeof r.visit.resolved!=='boolean'))fail('规则12返乡');
 if(!r.childhood||!int(r.childhood.due,190)||!['fever','ordinary'].includes(r.childhood.kind)||typeof r.childhood.done!=='boolean')fail('规则12童年');
 if(!r.clue||!int(r.clue.lossAt)||typeof r.clue.checked!=='boolean'||typeof r.clue.accepted!=='boolean'||!r.facts||Array.isArray(r.facts))fail('规则12线索');
}
export function returnMonths12(s){const v=rules12(s).visit,p=v&&route(s,c(s).continent,v.origin);return p?Math.max(3,(p.length-1)*12):null;}
