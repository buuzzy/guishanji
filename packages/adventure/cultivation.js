import * as rules11 from './cultivation-v11.js';
import {initialize12,begin12,complete12,practiceFactor12,validate12,trainConstitution12,department12,methodId12} from './story-rules12.js';
import * as rules10 from './cultivation-v10.js';
import {initializeMundane,mundaneComplete,mundaneBegin,validateMundane,mundaneSettlement} from './mundane-life.js';
import * as rules9 from './cultivation-v9.js';
import {initialize10,canCultivate,hasMana,choose10,mundaneDaily,introduceText,validate10,advanceEcho} from './story-rules10.js';
import * as rules8 from './cultivation-v8.js';
import {initializeRevision9,revisionAction,validateRevision9} from './revision9.js';
import * as rules7 from './cultivation-v7.js';
import {initializeProgression,progressionAction,progressionBegin,progressionText,progressionChoice,validateProgression} from './progression.js';
import * as previousRules from './cultivation-v5.js';
import * as rules6 from './cultivation-v6.js';
import {initializeNetwork,networkAction,validateNetwork,networkRate} from './story-network.js';
import {scheduleMonth} from './scheduler.js';
import {automaticStory,aftermathStory,storyOpportunity,familyMessage} from '../../content/cultivation-daily.js';
import {economyQuote,settleEconomy} from './cultivation-economy.js';
import {random,hashText} from '../core/random.js';
import {PATHS,ROOTS,ACTIVITIES,GEOGRAPHY,OFFICERS} from '../../content/cultivation-world.js';
import {CONSTITUTION_GAIN} from '../../content/rules12-world.js';
import {ROAD_CHAINS,CULTIVATION_EVENTS,LEGACY_CULTIVATION_EVENTS} from '../../content/cultivation-stories.js';
import {SECT_BACKGROUNDS,MORTAL_BACKGROUNDS} from '../../content/background-stories.js';
import {JOINT_BY_CHAIN,JOINT_DELAY_MONTHS,JOINT_CARD_IDS} from '../../content/cultivation-joints.js';
import {allowDaily} from './gates.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
const age=s=>Math.floor(s.month/12)+(s.birth.startAge||0);
/*
 * 「这条队列项是不是**长线的后续阶段**」—— **队列过滤只有这一处说了算**。
 *
 * ⚠⚠ **为什么不能直接用 `startsWith(线名+'_')`**（2026-11-08 阶段 4 实测踩到）：
 *   接头卡的 id 是 `<线名>_joint_settled` / `_joint_pending` / `_joint_hidden`
 *   ⇒ **它以线名开头** ⇒ 凡是用 `startsWith(线名+'_')` 清队列的地方，
 *   都会把**接头卡一起清掉**。
 *   ⇒ 实测：`dark_sacrifice` 走完 24 次，接头卡只发出 **1 次**
 *   （幽灯堂的命走完这条线多半紧接着换路 ⇒ `setPath` 把队列里的接头卡一起清了）。
 *
 * ⇒ 这里把两类卡**分开**：阶段卡（`线名_0/_1/_2`）与接头卡（`线名_joint_*`）。
 *   阶段卡随线作废，接头卡是「这条线的回响」—— **线走了它也该发**（它是桥）。
 */
const JOINT_IDS=new Set(JOINT_CARD_IDS);
const isChainStage=event=>!JOINT_IDS.has(event)&&ROAD_CHAINS.some(a=>event.startsWith(a.id+'_'));
const seen=(s,id)=>s.decisions.some(d=>d.event===id)||s.pending?.event===id;
const delay=(s,min,max)=>min+Math.floor(random(s,'events')*(max-min+1));
export function initializeCultivation(s) {
 /*
  * 背景故事线（2026-11-08 · 阶段 3）—— 按 `hashText(seed+':background')` 抽一条。
  *
  * ⚠ **模数按「这条命能走的路」取，不是一律 % 12**：
  *   没有可修炼的根骨的命只从「与修仙无缘」那 4 条里选；
  *   能修炼的命只从「入宗门」那 8 条里选
  *   ⇒ 否则会出现「故事说与修仙无缘、却有灵根」这种自相矛盾。
  * ⚠ **不因此改灵根** —— 改了会跟轮盘上看到的对不上，也会牵连历史版本
  *   （出生事实是九个版本共用的）⇒ 路的归属由**灵根**决定，
  *   背景只负责讲清「你是从什么处境来的」。
  * ⚠ `s.birth.upbringing` **继续留着**（童年旁白池与旧档校验都读它），
  *   现在由这条背景决定 ⇒ 童年那一段与背景对得上。
  */
 const bgPool=ROOTS[s.player.root].grade<0?MORTAL_BACKGROUNDS:SECT_BACKGROUNDS;
 const bg=bgPool[hashText(s.seed+':background')%bgPool.length];
 s.birth.background=bg.id;
 s.birth.upbringing=bg.upbringing;
 const c={format:1,rulesVersion:12,opportunities:{},dailyMemory:{},economy:{received:0,spent:0,last:null},evidence:[],activityMonths:{},activityGains:{},inquiry:null,detained:false,path:'mortal',rank:'未入门',activity:'study',rootKnown:false,progress:0,entered:null,admissionDone:false,choiceAt:192,dailyAt:12,
  punishmentUntil:0,reputation:0,wanted:0,exam:null,attempts:[0,0,0,0,0],retryAt:0,context:null,activeChain:null,chains:{},queue:[],
  continent:s.birth.continent,closed:[],visited:[s.birth.continent],spot:s.birth.address,history:[],familyPolicy:'keep',mail:null,mailHistory:[],familyLoss:'',knownDeaths:[],
  familyAt:28*12,nextFamilyAt:40*12,aidPending:[],familyVisited:false,descendants:[],deathNews:[],routes:[],worldAt:(45+hashText(s.seed+':war')%60)*12,
  worldKind:hashText(s.seed+':world')%3,worldDone:false,finalOffered:false,readiness:0,turnAt:0,officers:OFFICERS.map(p=>({...p,status:'alive',location:'home'}))};
 s.life.cultivation=c;s.life.feedback=false;
 s.player.stones=({common:0,noble:6,clan:4})[s.birth.family];s.life.family.reserve=({common:0,noble:0,clan:12})[s.birth.family];
 s.life.family.members[0].deathAt=s.birth.family==='clan'?125*12:58*12;
 s.life.family.members[1].deathAt=s.birth.family==='clan'?180*12:82*12;
 initializeNetwork(s);initializeProgression(s);initializeRevision9(s);initialize10(s);initializeMundane(s);initialize12(s);alignChildhood(s);return c;
}
/**
 * 童年三段与「身体检查」对齐（2026-11-07 · T3）。
 *
 * ## 为什么需要这一步
 * ------------------
 * 童年卡排在**人脉网络**那块（`packages/adventure/story-network.js` 的
 * `network.childhood`），身体检查排在**规则十二**那块（`v12.childhood`）——
 * 两边各自初始化，谁也不知道对方。
 * 而规则是：**要查身体的孩子，6–9 岁那一段让给体检**
 * （体检不是「多一张卡」，是「那一年发生的是这件事」）。
 *
 * ## 为什么放在这里
 * ----------------
 * `packages/adventure/cultivation.js` 是**枢纽**（entry）：它同时看得见
 * 两个域的状态 ⇒ 只有它能做这个对齐。
 * ⚠ 因果域不许反过来依赖节奏域（`scripts/check-boundaries.mjs` 盯着），
 *   所以这个对齐**不能**写在网络模块里。
 *
 * ⚠ 只对当前版本（规则十二）做：旧版本（5–11）没有身体检查 ⇒ 不动它们。
 *
 * @param {object} s 当前人生状态
 */
function alignChildhood(s){
 const c=s.life.cultivation;
 if(!c||c.rulesVersion!==12)return;
 const childhood=c.v12&&c.v12.childhood;
 if(!childhood||!childhood.worthy)return;
 const tickets=c.network&&c.network.childhood;
 if(!tickets||!tickets.length)return;
 /* 6–9 岁那一张（第一段）让给体检。 */
 tickets[0].done=true;
}
function revised_currentContinent(s){return s.life?.cultivation?.continent||(['home','refuge'].includes(s.player.location)?s.birth.continent:s.player.location);}
function revised_cultivationActionTrip(s,op={}){
 if(!s.life?.cultivation)return null;
 const c=s.life.cultivation,target=op.return12?c.v12.visit?.origin:op.echoTravel?c.story10.echo.origin:op.familyVisit||op.progression==='rebuild'&&op.route!=='delegate'||op.chain==='sect_return'&&op.step===0&&op.conduct==='care'?s.birth.continent:op.chain==='loose_portal'&&op.step===2?c.chains.loose_portal?.origin:null;
 if(!target)return null;const r=routeOptions(s).find(p=>p.id===target);if(!r?.route)throw Error('没有已确认的返程路线');return {location:target,route:copy(r.route),months:r.months};
}
function revised_beginCultivationAction(s,selected){mundaneBegin(s,selected);progressionBegin(s,selected);const c=s.life.cultivation,op=selected.system||{};begin12(s,selected);if(op.punishment){c.punishmentKind=op.confinement?'confinement':'service';c.punishmentUntil=s.month+op.punishment;c.activity='work';s.player.focus=ACTIVITIES.work.skill;}
/*
 * 「前往旧联系人」那一程带 `echoTravel` ⇒ 走的是**赶路**分支（`finishJourney` → `finishTravel`），
 * 不会再走选项结算那条路 ⇒ 「旧联系人」的状态没人推进，卡在「收到消息」，
 * 下一次检查会重复发同一张卡 ⇒ 而那张卡在事件表里并不存在 ⇒ 整局卡死。
 * ⇒ **当前版本（规则十二）在出发时就把状态推一步**。
 * ⚠ 旧版本（7–11）保持原样 —— 它们的行为必须逐值不变。
 */
if(op.echoTravel&&c.story10&&c.story10.echo)advanceEcho(s,c.story10.echo.kind,c.story10.echo.origin,selected.id);}
function revised_cultivationContext(s) {
 const c=s.life.cultivation;
 if(age(s)<16)return 'childhood';
 if(s.month<c.punishmentUntil&&c.punishmentKind==='confinement')return 'confinement';
 if(s.journey?.cultivationTravel||s.journey?.cultivationActionTravel?.route.length>1||s.journey?.event==='loose_portal_0'&&s.journey.choice==='care')return 'travel';
 if(s.journey?.resolution?.event?.startsWith('breakthrough_'))return s.journey.choice==='service'&&s.month-s.journey.from<12?'work':'retreat';
 return c.context||(['demonic','beast'].includes(c.path)?c.path:currentContinent(s)===s.birth.continent?'home':'abroad');
}
function revised_cultivationActivity(s) {
 const c=s.life.cultivation,context=cultivationContext(s);
 if(context==='childhood')return '在'+s.birth.address+'长大';
 const event=s.journey?.event;if(event?.startsWith('advance_material_'))return s.result?.title||'跟授业者准备冲关所需的法门与灵药';
 if(event==='sect_rebuild'||event?.startsWith('sect_council_'))return '与掌事安排住处、护阵和山门差事';
 if(event==='tribulation_prepare')return '与护法炼阵、配药，勘查渡劫地';
 if(c.v12?.action)return ({retreat:'在石室中闭关细练',travel:'随商队在本大陆历练',work:'完成约定的换料差事'})[c.v12.action.kind];
 if(c.detained)return '被看管在药院，等待下一次换岗';
 if(c.inquiry)return c.inquiry==='beast'?'与白苓相处，了解淬体功法':'核实新功法与离开师门的条件';
 if(context==='travel')return '沿已确认的路线赶路';
 if(context==='retreat')return '在洞府中修炼与调养';
 if(['valley','cavern','outer'].includes(context))return ({valley:'山谷',cavern:'洞府遗迹',outer:'域外'})[context]+'中的探索';
 if(s.month<c.punishmentUntil)return c.punishmentKind==='confinement'?'封住法力，在思过洞禁闭':'在山门服役，偿还损失';
 return ACTIVITIES[c.activity].name+' · '+s.player.home;
}
function revised_activityOptions(s) {
 const c=s.life.cultivation,context=cultivationContext(s);
 return Object.entries(ACTIVITIES).map(([id,a])=>{
  let reason='';
  if(s.pending||s.waiting||s.phase!=='life')reason='先回应当前事件';
  else if(c.v12?.visit)reason='先处理返乡安排';
  else if(c.mundane?.arc)reason='先处理正在进行的差事或安排';
  else if(c.revision9?.arc)reason='先完成矿役或问清眼前的传承条件';
  else if(c.detained||c.inquiry)reason=c.detained?'被看管期间不能自由安排日常':'先处理正在了解的拜师或离开条件';
  else if(age(s)<16)reason='尚在成长，由家庭安排启蒙';
  else if(['travel','retreat','valley','cavern','outer','work'].includes(context))reason='先结束或离开当前经历';
  else if(s.month<c.punishmentUntil&&(c.punishmentKind==='confinement'||id!=='work'&&id!=='rest'))reason=c.punishmentKind==='confinement'?'思过洞禁闭未满，不能自行安排修行':'服役期间只能做工或调养';
  else if(c.rank==='杂役'&&['alchemy','array'].includes(id)&&!s.flags.learningPermit&&canCultivate(s))reason='需先获得授业许可；可以读经或做工';
  return{id,...a,enabled:!reason,reason};
 });
}
function revised_changeActivity(s,id) {
 const o=activityOptions(s).find(a=>a.id===id);
 if(!o?.enabled)throw Error(o?.reason||'没有这项日常活动');
 const c=s.life.cultivation;c.activity=id;s.player.focus=o.skill;s.journey.practice=o.skill;s.life.activity=cultivationActivity(s);s.revision++;
 return s;
}
function revised_cultivationIncome(s) {return economyQuote(s).net;}
export function annualCultivationSettlement(s){return s.life?.cultivation?.rulesVersion===12?settleEconomy(s):s.life?.cultivation?.rulesVersion===11?rules11.annualCultivationSettlement(s):s.life?.cultivation?.rulesVersion===10?rules10.annualCultivationSettlement(s):s.life?.cultivation?.rulesVersion===9?rules9.annualCultivationSettlement(s):s.life?.cultivation?.rulesVersion===8?rules8.annualCultivationSettlement(s):s.life?.cultivation?.rulesVersion===7?rules7.annualCultivationSettlement(s):s.life?.cultivation?.rulesVersion===6?rules6.annualCultivationSettlement(s):null;}
function schedule(s,event,months=0){const c=s.life.cultivation;if(!seen(s,event)&&!c.queue.some(q=>q.event===event))c.queue.push({event,due:s.month+months});}
function record(s,cb,title,body,kind='life'){cb.log({kind,title,body,automatic:true,location:s.player.location,context:cultivationContext(s)});s.life.automaticCount++;}
function addEvidence(s,event,choice,description,authority){
 const c=s.life.cultivation;if(c.rulesVersion<5)return;
 if(c.evidence.some(e=>e.event===event&&e.choice===choice))return;
 c.evidence.push({event,choice,description:typeof description==='string'?description:'领用簿和当事人留下的指认',authority:authority||c.history.at(-1)?.path||c.path,origin:currentContinent(s),month:s.month,due:s.month+12,settled:false});
}
function revised_discoverableEvidence(s){
 const c=s.life.cultivation;if(c.rulesVersion<5)return c.wanted>0?{}:null;
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
 if(!canCultivate(s))c.rank=path==='orthodox'?'凡俗杂役':path==='demonic'?'药房苦役':path==='mortal'?'家中后辈':'坊市学徒';
 c.admissionDone=true;c.entered=s.month;c.context=null;c.inquiry=null;c.activeChain=null;c.queue=c.queue.filter(q=>!isChainStage(q.event));
 c.spot=!canCultivate(s)&&path==='orthodox'?'外院粮房旁的通铺':PATHS[path].home;s.player.home=c.spot;registerDwelling(s);c.history.push({path,month:s.month});
 if(path==='orthodox') {cb.apply({items:['signal_talisman'],people:{master:{known:true,location:s.player.location},sister:{known:true,location:s.player.location},friend:{known:true,location:s.player.location}}});}
 else for(const id of ['master','sister','friend','trialmate'])s.people[id].known=false;
 if(old!==path)record(s,cb,canCultivate(s)?'进入'+PATHS[path].name+'的生活':'安顿新的住处与活计','你现在住在'+s.player.home+'。');
 /*
  * ⚠ **留下「你走了哪条路」的印记**（2026-11-08 · 炼气期重构）。
  *
  * 为什么要留：用户要的是「**做完一次决策，然后在非决策卡里展示若干后果**」。
  * 「入宗 / 散修 / 幽灯 / 山林」是整段人生里**最高频的一个决定**（实测 88 次/120 条命）
  * ⇒ 它留下的印记最该被后来的旁白读到。
  *
  * ⚠ 旗标名用驼峰（不许带下划线）且**是新名字** ⇒
  *   不会被任何 `requires.flags` 命中 ⇒ **旧档逐值不变**。
  * ⚠ 只对当前版本（规则十二）生效。
  */
 if(c.rulesVersion===12)cb.apply({flags:{[({orthodox:'pathSect',loose:'pathLoose',demonic:'pathDark',beast:'pathBeast',mortal:'pathMortal'})[path]||'pathMortal']:true}});
 /*
  * ⚠ **入门那一串（交接文档 §3.2 的「必答串五环」）在这里排队**：
  *   测灵根 → 宗门部门 → 心法选定 → 重心（首次授业）→ 弟子修炼 → 炼气突破
  *
  * 规矩是「**背景说的那条路，就是后来走的那条**」：
  *   · 走宗门路的 ⇒ 先定**部门**（丹房 / 药田 / 器堂 / 执事房），再定**入门心法**；
  *   · 散修 / 幽灯堂 / 妖身 ⇒ 没有宗门，没有部门，直接定**入门心法**；
  *   · 凡俗路 ⇒ 整个入门串不启动（凡人线接手）。
  *
  * ⚠ 以前这里排的是 `first_method`（重心卡），心法要等授业之后 12 个月才发
  *   ⇒ 两张卡的先后**没有保证** ⇒ 「心法还没定就发冲关卡」那种废卡就是这么来的
  *   （实测 40 条命里 7 条踩到）。⇒ 现在入门串是**一条链**，顺序写死在规则层。
  *
  * ⚠ `openingChain` 只排一次：中途改路（离开幽灯堂、被逐出宗门）不该重排入门串。
  */
 if(path!=='mortal'&&!c.openingChain){
  c.openingChain=true;
  schedule(s,path==='orthodox'?'sect_department':'method_choice',2);
 }
}
function revised_completeCultivationAction(s,event,choiceId,cb) {
 const c=s.life.cultivation,node=(c.rulesVersion<5&&LEGACY_CULTIVATION_EVENTS[event])||CULTIVATION_EVENTS[event],choice=node?.choices.find(o=>o.id===choiceId),op=choice?.system||{};
 const decision=s.decisions.find(d=>d.event===event&&d.choice===choiceId),success=decision?.success!==false;
 if(event.startsWith('m11_')){mundaneComplete(s,event,choiceId,cb);if(s.phase==='life')cb.open();return;}
 const previousPath=c.path;
 if(event==='root_result')c.rootKnown=true;
 if(op.admit)setPath(s,'orthodox',cb,ROOTS[s.player.root].grade===0?'杂役':'外门弟子');
 if(op.path&&success)setPath(s,op.path,cb,op.rank);
 /*
  * ⚠ **宗门部门（交接文档 §3.2）** —— 卡上只写「你被分到了某个堂口」的标记，
  *   到底是哪一个由规则层按「入门身份 + 灵根」算（`department12`）⇒
  *   必答卡上的两个选项走的是**同一个部门**（表达的是两种态度，不是两条岔路）。
  * ⚠ 只对当前版本（规则十二）生效。
  */
 if(c.rulesVersion===12&&op.department12&&success){c.v12.department=department12(s);}
 /*
  * ⚠ **入门心法（交接文档 §3.2）** —— 同样由规则层算（`methodId12`），
  *   算完**写进状态**（`c.v12.entryMethod`）⇒
  *   因果域的「人脉网络」（`packages/adventure/story-network.js`，域序号 3）
  *   **只读状态**，不反过来依赖节奏域（域序号 4）⇒ 不越界。
  * ⚠ 入口层（`cultivation.js` 是枢纽）是**唯一**同时能看见节奏域与因果域的地方
  *   ⇒ 跨域的接线放在这里，两边都不越界。
  */
 if(c.rulesVersion===12&&op.method12&&success){c.v12.entryMethod=methodId12(s);}
 /*
  * ⚠ **入门串的下一环**（§3.2）：
  *   · 心法选定那张卡答完 ⇒ 排「重心」（第一次授业）—— 以前重心卡排在最前面，
  *     心法要等 12 个月才发 ⇒ 顺序没有保证（废卡的根因）。
  *   · 部门那张卡靠选项上的 `next` 接到心法（见 `revised_cultivationAction`）。
  */
 if(c.rulesVersion===12&&event==='method_choice'&&success)schedule(s,'first_method',2);
 if(op.teacher&&success)c.teacher=op.teacher;
 if(op.activity){c.activity=op.activity;s.player.focus=ACTIVITIES[op.activity].skill;
  /* ⚠ **留下「你练的是哪门」的印记**（2026-11-08）—— 择路是玩家自己的第一个印记。 */
  if(c.rulesVersion===12)cb.apply({flags:{[({sword:'focusSword',study:'focusArray',alchemy:'focusAlchemy'})[op.activity]||'focusArray']:true}});}
 if(op.punishment){const remaining=Math.max(0,op.punishment-(choice.months||0));c.punishmentUntil=s.month+remaining;c.activity='work';record(s,cb,'师门惩戒',remaining?(c.punishmentKind==='confinement'?'严衡收走弟子牌，用禁灵符封住你的法力。思过洞的石门落下，送饭弟子只从门缝递水与冷饭。还须禁闭'+remaining+'个月，期间不得修行、领月例或外出。':'你被派去修复山道与照料受损田地，剩余'+remaining+'个月不得进入三堂听课。'):(event==='garden_accident'?'补种的药苗终于成活，许执事沿药畦逐株验过，又让药师核对缺掉的药种。六个月服役结束，你领回弟子牌，重新获得听课资格。':'最后一段山道补好，许执事验过伤员能否通行，才把弟子牌还给你。服役结束，重新获得听课资格。'),'institution');if(!remaining)delete c.punishmentKind;}
 if(op.reputation)c.reputation=clamp(c.reputation+op.reputation,-100,100);
 if(op.wanted){c.wanted=clamp(c.wanted+op.wanted,0,10);if(c.rulesVersion>=5)addEvidence(s,event,choiceId,choice.reply,previousPath);}
 if(op.offense){c.wanted=clamp(c.wanted+1,0,10);addEvidence(s,event,choiceId,op.offense,previousPath);}
 if(op.settleWanted&&(success||c.rulesVersion<5)){c.wanted=0;if(c.evidence)c.evidence.forEach(e=>e.settled=true);c.reputation=clamp(c.reputation+6,-100,100);}
 if(op.reduceWanted&&success)c.wanted=clamp(c.wanted-1,0,10);
 if(op.familyPolicy){c.familyPolicy=op.familyPolicy;if(op.familyPolicy==='sever'){s.life.family.money+=2000;s.life.family.bond=clamp(s.life.family.bond-10);}}
 if(op.familySupport){s.life.family.reserve=clamp(s.life.family.reserve-op.familySupport,0,1000);s.life.family.bond=clamp(s.life.family.bond+5);}
 if(op.familySend){s.life.family.reserve=clamp(s.life.family.reserve+3,0,1000);s.life.family.bond=clamp(s.life.family.bond+8);}
 if(op.exam){
  /*
   * ⚠⚠ **考核期限要比「结果卡到达」晚 12 个月**（2026-11-08 实测踩到）。
   *
   * 症状：玩家报名后整整 50 年什么都没发生，最后老死在炼气（`scripts/audit-story-rules12.mjs`
   * 实测：600 条命里 17.5% 出现超过 15 年的沉默，最长 50.6 年；改动前最长 11.8 年）。
   *
   * 根因：期限原本与结果卡的到达月**完全相同**（`deadline = s.month+24`、结果卡也排 24 个月后）
   *   ⇒ 结果卡只要被挡一下（「正在赶路」「长线占着」「不在山门所在的大陆」）晚几个月，
   *     这届考核就作废 ⇒ 玩家拿不到内门身份 ⇒ 后面整条宗门与突破的路都断了。
   *
   * 修法：期限留 12 个月余量 ⇒ 结果卡晚到，考核仍然算数。
   *   （「本届」的窗口从 24 个月变成 36 个月 —— 那是「来回路上的时间」，不是新的规则。）
   */
  c.exam={...op.exam,deadline:s.month+24+12,started:s.month,preparation:0};schedule(s,event+'_result',24);}
 if(op.examResult){
  const result=s.journal.findLast(e=>e.event===event&&e.kind==='choice');if(result){result.body=success?'教习让你先退到台边，逐一指出方才的得失。你等着他决定是否收你入堂。':'教习圈出失败的那一步，你把卷册抱回怀里。山阶上还有许多人在等自己的结果。';}
  if(success&&c.exam&&s.month>=c.punishmentUntil){const skill=c.exam.skill;cb.apply({skills:{[skill]:8},stats:{stones:1},flags:{learningPermit:true}});if(c.path==='orthodox'&&c.rank==='杂役')c.rank='外门弟子';const advanced=c.exam.tier>=2;const body=advanced?({sword:'你按实战中练过的收势指出剑诀的缺页，堂院修士补上注解，请你共同核对下一卷。',alchemy:'你辨出药方中两味药的寒热冲突，丹师在旧注旁写下实际试炼的火候，请你带回研究。',array:'你指出阵图中无法维持的回路，守阵者与你修正阵眼位置，把核过的拓图留给你。'})[skill]:({sword:s.player.realm>=1?'你在最后一剑收势时稳住了手腕。剑堂教习递来一柄木剑，让你次日到后山学御剑。':'你在最后一剑收势时稳住了手腕。剑堂教习递来一柄木剑，让你次日到后山练步法与收剑；御剑要等炼出法力后再学。',alchemy:'你从烧焦的药渣里辨出混入的寒砂。丹堂教习把辨药册放到你手里，准许你从旁观炉开始学。',array:'你找到了让阵旗倒转的那枚符纹。经堂教习撤去障眼法，让你留下一起修补古阵。'})[skill];if(result){result.title=advanced?'堂院核过了你的评议':c.path==='orthodox'?'获准进入专业堂院':'切磋之后的指点';result.body=progressionText(body+' 堂院交给你一枚灵石作此次差事的报酬。',s,event,'reply');result.kind='institution';}else record(s,cb,'考核结束',body,'institution');}
  else {const body=c.exam?'教习在你的卷册上圈出失误，叫你把这一页带回去重练。山阶上有人欢呼，也有人低着头。你收起笔记，未能领到这一届的奖励。':'散场钟响过，你没有上场。教习收走空着的名签，你把笔记带回住处。';if(result){result.title='山阶上散去的人';result.body=body;result.kind='institution';}else record(s,cb,'山阶上散去的人',body,'institution');}
 }
 if(event.startsWith('selection_')&&event.endsWith('_result'))c.exam=null;
 /* 冲关失败后休养一年就够 —— 原来歇三年，等于把突破窗口直接拖没了。 */
 /*
  * ⚠ **「再准备一段时间」（retry）歇六年，冲关失败（breakthrough）歇一年**。
  *
  * 为什么要分开：
  *   · 冲关失败 ⇒ 一年后可以再试（这是「再来一次」的节奏，一年够）；
  *   · 「再准备」⇒ 六年后这张卡才再来（2026-11-07 修）——
  *     以前是一年，而且选完之后这张卡**再也不来**（引擎把「已答过」当成「不必再发」）。
  *     现在卡会回来，但间隔要够长：
  *       ① 一年一次太密 —— 同一张卡反复出现在 60 个月内，内容指标门禁会记成「冷却重复」
  *          （那是「同一件事说两遍」的意思，玩家看到的也是这个）；
  *       ② 一生抉择不超过 100 条（存档硬上限，顶破了整局判无效）——
  *          间隔越长，一生能塞进去的「再准备」次数越少 ⇒ 越碰不到那条上限。
  */
  if(op.breakthrough||op.retry){const tier=op.breakthrough||op.retry;if(op.breakthrough)c.attempts[tier]++;c.retryAt=s.month+(op.breakthrough?12:72);if(success&&op.breakthrough){c.progress=0;if(!seen(s,'family_rules')&&storyOpportunity(s,'family_rules',age(s),age(s)+5,.65))schedule(s,'family_rules',12);}}
 if(op.chain){
  const chain=ROAD_CHAINS.find(a=>a.id===op.chain),previous=c.chains[chain.id];c.chains[chain.id]={origin:previous?.origin||currentContinent(s),originHome:previous?.originHome||s.player.home,departed:previous?.departed||false,step:op.step,conduct:op.conduct,month:s.month};
  /*
   * ⚠ **留下「你做事的方式」的印记**（2026-11-08）——
   *   长线那三步是玩家反复做的同一类决定（认真 / 留退路 / 自己拿），
   *   ⇒ 它的印记最该被后来的旁白读到。
   */
  if(c.rulesVersion===12)cb.apply({flags:{[({care:'conductCare',cautious:'conductCautious',selfish:'conductSelfish'})[op.conduct]||'conductCare']:true}});
  if(op.conduct==='selfish'&&!op.concealed){c.reputation=clamp(c.reputation-8,-100,100);c.wanted=clamp(c.wanted+1,0,10);if(c.rulesVersion>=5)addEvidence(s,event,choiceId,choice.reply);}
  if(chain.id==='sect_trial'&&op.step===1&&op.conduct==='selfish'){cb.apply({people:{trialmate:{status:'missing'}}});}
  if(chain.id==='sect_return'&&op.step===0&&op.conduct==='selfish'){c.activeChain=null;c.context=null;c.chains[chain.id].skipped=true;}
  else if(op.stopChain){c.activeChain=null;c.context=null;c.chains[chain.id].skipped=true;}
  else if(op.step<2){c.activeChain=chain.id;c.context=chain.id==='dark_method'&&op.step===0&&op.conduct==='care'?'valley':chain.context;schedule(s,chain.id+'_'+(op.step+1),op.conduct==='cautious'?6:delay(s,12,30));}
  else {
   c.activeChain=null;c.context=null;
   if(op.conduct==='selfish'&&c.path==='orthodox'){c.punishmentUntil=s.month+12;c.activity='work';c.punishmentKind='confinement';record(s,cb,'执法堂落下石门','严衡把失窃库物摆在案上，命人收走弟子牌。你被封住法力，押入思过洞一年，听课、月例和外出都被暂停。','institution');}
   /*
    * **接头卡** —— 线走完的那一刻，发一张承接它的卡。
    *
    * 为什么在这里（而不是靠 `choice.next`）：
    *   `next` 走的是 `schedule(s, choice.next, delay(s,2,6))`，
    *   `delay` 要从 `events` 随机流里抽一次 ——
    *   而**同一条流决定随机池抽哪张卡** ⇒ 每条命后面所有不相干的随机卡全变
    *   ⇒ 差异审查淹在噪音里，看不出「多了什么」。
    * ⇒ 这里用**固定 3 个月**（不抽随机数）：差异里只看得到多插了一张接头卡。
    *
    * 为什么只在这一支（线真的走完了）：
    *   `op.stopChain`（中途退出）与 `sect_return` 的特例走的是上面两支
    *   ⇒ 那两条线**没有走完** ⇒ 不该有桥。
    *
    * ⚠ 只对当前版本（规则十二）生效：这个函数只服务规则十二，
    *   规则 5–11 各跑自己的执行器 ⇒ 旧档一个字节都不动。
    */
   if(op.step===chain.stages.length-1){
    const joint=JOINT_BY_CHAIN[chain.id]&&JOINT_BY_CHAIN[chain.id][op.conduct];
    if(joint)schedule(s,joint,JOINT_DELAY_MONTHS);
   }
  }
  if(op.step===0&&chain.id==='loose_portal'&&op.conduct==='care'&&success){const from=currentContinent(s),dest=GEOGRAPHY.find(p=>p.id===from).connections.find(id=>id!==s.birth.continent)||GEOGRAPHY.find(p=>p.id===from).connections[0];c.continent=dest;c.chains[chain.id].departed=true;cb.apply({location:dest,home:GEOGRAPHY.find(p=>p.id===dest).places[1]+'落脚点'});c.spot=s.player.home;if(!c.visited.includes(dest))c.visited.push(dest);c.routes.push([from,dest]);record(s,cb,'跨界后确认落脚点','你在新的大陆核对了回程地点与定位物。');}
  if(op.step===0&&chain.id==='sect_return'&&op.conduct==='care'){c.continent=s.birth.continent;cb.apply({location:'home',home:'故乡接待处'});}
 }
 const returnTrip=s.journey?.cultivationActionTravel;
 if(returnTrip){c.continent=returnTrip.location;if(returnTrip.route.length>1)c.routes.push(copy(returnTrip.route));if(op.chain==='loose_portal')cb.apply({location:returnTrip.location,home:c.chains.loose_portal.originHome});c.spot=s.player.home;}
 if(returnTrip&&op.echoTravel){cb.apply({location:returnTrip.location,home:'旧联系人药铺旁的客房'});c.spot=s.player.home;registerDwelling(s);}
 if(op.familyVisit&&s.life.family.members.some(p=>p.status==='alive')&&storyOpportunity(s,'family_home_ambush',age(s),age(s)+1,.3))schedule(s,'family_home_ambush',2);
 if(op.familyVisit&&c.rulesVersion!==12){const member=s.life.family.members.find(p=>p.status==='alive');c.familyVisited=true;const from=currentContinent(s);c.continent=s.birth.continent;cb.apply({location:'home',home:PATHS[c.path].home});c.spot=s.player.home;if(from!==s.birth.continent)c.routes.push([from,s.birth.continent]);if(member)record(s,cb,'见到家中来人',member.name+'为你开门，先问你这些年住在哪里。'+(c.network.visits?.length?'上次返乡后，旧屋仍由他们照看；你拿出旧回信，核对哪些事情已经办妥。':'你从山门或坊市带回近况，亲人拿出这些年保存的信，问清收不到回音的那段日子。')+'你们把还未办妥的事写给往来的药商，约好下次如何传话。');else{const child=c.descendants.find(p=>p.status==='alive');record(s,cb,'旧屋里已换了一代人',child?child.name+'为你打开旧院门，把长辈留下的信从箱里取出来。你们在檐下谈到天黑，家里终于知道你这些年去了哪里。':'旧院没有亲人来开门，邻人替你找到保存旧信的箱子。你坐在旧屋里读了很久，离世的人不会因为这次归来重新醒来。');}for(const p of s.life.family.members)if(p.status==='dead'&&!c.knownDeaths.includes(p.id))c.knownDeaths.push(p.id);for(const p of c.descendants)p.known=true;(c.network.visits||=[]).push({month:s.month,reserve:s.life.family.reserve});}
 if(op.familyAid){s.life.family.reserve=clamp(s.life.family.reserve+2,0,1000);s.life.family.bond=clamp(s.life.family.bond+8);}
 if(op.familyRefuse){s.life.family.bond=clamp(s.life.family.bond-15);}
 if(op.familyDispute)c.reputation=clamp(c.reputation+(op.familyDispute==='take'?-8:4),-100,100);
 if(op.familyRemember!==undefined){c.familyVisited=op.familyRemember;if(op.familyRemember)for(const p of c.descendants)p.known=true;}
 if(event==='family_gate'){if(c.mail){c.mailHistory.push({...c.mail,received:s.month});c.mail=null;}}
 if(op.relocate){c.spot='安全城镇的租屋';s.player.home=c.spot;c.context=null;c.activeChain=null;c.queue=c.queue.filter(q=>!isChainStage(q.event));}
 if(op.inquiry)c.inquiry=op.inquiry;
 if(op.trial)c.context=op.trial==='beast'?'home':'work';
 if(op.cancelInquiry){c.inquiry=null;c.context=null;if(!c.admissionDone)setPath(s,'loose',cb);}
 if(op.registeredTransfer&&success&&previousPath!==c.path){
  // Registration is known at the new teacher's address, not instant global knowledge.
  c.history.at(-1).registered=true;
  const old=c.history.at(-2)?.path;
  if(c.rulesVersion<9&&['orthodox','demonic'].includes(old)){c.wanted=clamp(c.wanted+1,0,10);addEvidence(s,event,choiceId,'原组织点名发现缺席，借阅簿尚未注销；新入堂登记留下了去向',old);}
 }
 if(event==='dark_sacrifice_2'&&success&&choiceId!=='selfish')setPath(s,'loose',cb);
 if(op.detain){c.detained=true;c.inquiry=null;c.context='work';}
 if(op.coercivePay&&!success){if(!seen(s,'custody_terms')){c.detained=true;c.inquiry=null;c.context='work';schedule(s,'custody_terms',2);}else{record(s,cb,'药商出面阻拦','药商叫来坊市守卫，来人未能再把你押回院中，但没有交还收据，旧账仍在。');}}
 if(op.release){c.detained=false;c.inquiry=null;c.context=null;if(c.path==='demonic')setPath(s,'loose',cb);}
 if(op.evade){for(const e of c.evidence||[])if(!e.settled)e.hiddenUntil=s.month+36;}
 if(op.requestDeparture){
  c.inquiry=null;
  if(c.path==='demonic'){c.detained=true;c.context='work';schedule(s,'custody_terms',2);}
  else setPath(s,'loose',cb);
 }
 networkAction(s,event,choiceId,success,cb);
 progressionAction(s,event,choiceId,success,cb);
 revisionAction(s,event,choiceId,success,cb);
 choose10(s,event,choiceId,success,cb);
 complete12(s,event,choice,success,cb);
 let resumed=c.progression.resumeJourney||null;delete c.progression.resumeJourney;
 if(event==='world_raid'&&choiceId==='defend'&&c.suspended){c.context=c.suspended.context;c.activeChain=c.suspended.chain;for(const q of c.suspended.queue)c.queue.push({event:q.event,due:s.month+q.remaining});if(c.suspended.journey){resumed=c.suspended.journey;if(!resumed.open)resumed.to+=s.month-c.suspended.month;}delete c.suspended;}
 else if(event==='world_raid'){
  const abandoned=c.suspended?.journey?.resolution?.event;
  if(abandoned?.startsWith('advance_material_')&&!c.progression.materialAbandoned.includes(abandoned))c.progression.materialAbandoned.push(abandoned);
  if(abandoned?.startsWith('breakthrough_')){const [,tier,attempt]=abandoned.split('_');c.attempts[Number(tier)]=Math.max(c.attempts[Number(tier)],Number(attempt)+1);c.retryAt=s.month+36;record(s,cb,'闭关中止','战事迫使你放弃本次闭关。尚未完成的突破不会结算，调养后才可重新尝试。');}
  c.context=null;c.activeChain=null;delete c.suspended;
 }
 if(op.finish){if(!canCultivate(s)){cb.end('mundane_settled');return;}cb.end(({orthodox:'guardian',loose:'loose_home',demonic:'demon_oath',beast:'wild_king',mortal:'mortal_home'})[c.path]);return;}
 /*
  * ⚠⚠ **入门那一串要拉开**（2026-11-08 · 炼气期收束）。
  *
  * 以前 `reception → root_result` 只隔 2–6 个月，`root_result → first_method` 也只隔 2 个月
  * ⇒ 玩家 16–17 岁一口气被问三遍（实测「山门 → 测灵根 → 第一份心法」全在 16 岁）。
  * ⇒ 现在：**测灵根隔 12 个月**、**第一份心法隔 12 个月**、
  *   入门那一串变成 16 / 17 / 18 岁，一年一张。
  *
  * ⚠⚠ **`delay(s,2,6)` 照样要调** —— `random(state, stream)` 是**流式**的，
  *   少调一次 ⇒ 后面几十年的每一次抽签结果全变 ⇒ 差异审查会被噪音淹掉。
  */
 if(choice?.next){const gap=delay(s,2,6);schedule(s,choice.next,choice.next==='root_result'?12:gap);}
 c.choiceAt=s.month+delay(s,24,42);s.life.choiceAt=c.choiceAt;s.life.queue=null;if(resumed)s.journey=resumed;else cb.open();s.life.activity=cultivationActivity(s);
}
function revised_routeOptions(s) {
 const here=currentContinent(s),c=s.life.cultivation;
 return GEOGRAPHY.map(place=>{
  const queue=[[here]],visited=new Set([here]);let route=null;
  while(queue.length){const path=queue.shift(),at=path.at(-1);if(at===place.id){route=path;break;}for(const dest of GEOGRAPHY.find(p=>p.id===at).connections){if(c.closed.includes([at,dest].sort().join('-'))||visited.has(dest))continue;visited.add(dest);queue.push([...path,dest]);}}
  const fee=route?Math.max(0,route.length-1)*(s.birth.era==='ebb'?3:2):0,months=route?Math.max(0,route.length-1)*12:0;
  let reason=c.mundane?.arc?'先处理眼前的差事或离开这次安排':place.id===here?'已经在这里':!route?'目前没有已确认的通路':s.pending?'先回应当前事件':c.detained?'被看管期间不能自由离开':c.inquiry?'先处理正在商谈的师承安排':s.month<c.punishmentUntil?'师门惩戒未满，不得离开':!s.journey?.open||c.activeChain||c.revision9?.arc?'先结束或离开当前经历':age(s)<16?'尚在成长':place.id==='sky'&&s.player.realm<2?'跨界阵需要筑基修为':s.player.stones<fee?'路费不足':'';
  return{...place,route,fee,months,enabled:!reason,reason};
 });
}
function revised_beginTravel(s,id,cb){const r=routeOptions(s).find(p=>p.id===id);if(!r?.enabled)throw Error(r?.reason||'没有这个目的地');s.player.stones-=r.fee;s.life.cultivation.economy.spent+=r.fee;s.journey={from:s.month,to:s.month+r.months,target:null,practice:s.player.focus,cultivationTravel:{location:id,route:r.route}};s.revision++;record(s,cb,'出发前往'+r.name,'路费'+r.fee+'灵石，按已确认的路线赶路，预计'+r.months+'个月。抵达后再寻找住处。','plan');return s;}
function revised_finishTravel(s,cb){const trip=s.journey.cultivationTravel,c=s.life.cultivation;c.continent=trip.location;cb.apply({location:trip.location,home:GEOGRAPHY.find(p=>p.id===trip.location).places[1]+'租屋'});c.spot=s.player.home;registerDwelling(s);for(const id of trip.route)if(!c.visited.includes(id))c.visited.push(id);if(trip.route.length>1)c.routes.push(copy(trip.route));record(s,cb,'抵达新的住处','你到达'+s.player.home+'，沿路经过的地点已记入地图。');cb.open();}
function revised_withdrawCultivation(s,cb){const c=s.life.cultivation;if(!c.activeChain||s.pending||s.phase!=='life')throw Error('目前没有可离开的探险');const chain=c.activeChain;c.queue=c.queue.filter(q=>!(isChainStage(q.event)&&q.event.startsWith(chain+'_')));c.context=null;c.activeChain=null;s.journey={from:s.month,to:s.month+6,target:null,practice:s.player.focus,cultivationTravel:{location:currentContinent(s),route:[currentContinent(s)]}};s.revision++;record(s,cb,'离开当前探险','你带走已取得的物品，沿已知出口返回。尚未取得的奖励与后续阶段取消。','plan');return s;}
function automaticCultivation(s,cb){const c=s.life.cultivation;if(!canCultivate(s)||c.v12?.action||c.v12?.visit)return;if(c.revision9?.arc||s.month<c.dailyAt)return;const mundane=mundaneDaily(s),row=mundane===undefined?automaticStory(s,cultivationContext(s)):mundane;if(row){/* T5 · 人生经历能产出：这条旁白捡到的东西要真的进行囊；东西用旧了就真的少了（每条最多一件）。 */if(row.items)cb.apply({items:row.items});if(row.discard)cb.apply({remove:row.discard});record(s,cb,row.title,row.body);}/* 印记后果旁白：独立通道 ——「做完决定之后，后果在旁白里陆续显现」。 ⚠ 不许顶掉上面那条日常/拾遗旁白（顶掉会让「人生经历带道具的比例」掉下去，还会把下一次拾遗顺延 24–48 个月）。 */const mark=(s.journey?.resolution||s.pending)?null:aftermathStory(s);if(mark)record(s,cb,mark.title,mark.body);c.dailyAt=s.month+delay(s,c.activeChain?18:24,c.activeChain?36:48);}
/**
 * 发卡闸的回调外套 —— 把「发卡」这件事过一遍闸。
 *
 * ⚠ 只有当前版本（规则十二）用得上；旧版本各有自己的执行器，不走这里。
 *
 * @param {object} s 当前人生状态
 * @param {object} cb 引擎给的回调
 * @returns {object} 包过闸的回调
 */
function gateCallbacks(s,cb){
 return {
  ...cb,
  gate:(event)=>allowDaily(s,event),
  arrive:(event)=>{if(!allowDaily(s,event))return;cb.arrive(event);},
  /*
   * `arriveRaw` —— **不过闸**地发一张卡。
   *
   * 给「已经排好了的事」用：队列里排好的家信／战事／长线步骤、
   * 长线本身的第一张卡。这些不是「这个月挑一张日常卡」，
   * 而是「早就说好的那一件事到了」⇒ 拦它＝让人家白等。
   */
  arriveRaw:(event)=>cb.arrive(event),
 };
}
function revised_cultivationMonth(s,cb){
 const c=s.life.cultivation,context=cultivationContext(s);
 /*
  * ⚠⚠ **发卡闸**（2026-11-07 · T2）：这里把回调**换一副**再往下传。
  *
  * 三道闸（密度 / 冷却 / 阶段）只有一份实现（`packages/adventure/gates.js`），
  * 全仓库谁都不许另写一份口径。这里是**发卡**的唯一接入点：
  *   · `arrive` —— 这张**日常卡**现在发不发得出去？
  *     发不出去就不发（规则层那个月就算没安排事），下个月条件合适了还会再发。
  *     豁免名单里的卡（突破卡、长线卡、后续卡、终章、入门那一串）不受影响。
  *   · `gate`   —— 规则层自己判断「这张卡现在发不发得出去」时用这一句
  *     （放在**置标记之前**，免得被拦一次那张卡就永远没了）。
  *
  * ⚠ 冷却闸（旁白那一半）**不在这里**：旁白有两个入口
  *   （规则层的 cb.log 与长行动结束时引擎自己记的），
  *   只堵一个会漏 ⇒ 它接在引擎记旁白的唯一入口
  *   （`packages/adventure/engine.js` 的 log）。
  *
  * ⚠ **只包当前版本（规则十二）**：旧版本（5–11）各有自己的执行器，
  *   一个字节都不动 ⇒ 历史基线逐值全等。
  */
 cb=gateCallbacks(s,cb);
 if(age(s)>=16){
  const activity=s.month<c.punishmentUntil?'work':c.activity,a=ACTIVITIES[activity],restricted=['travel','valley','cavern','outer','work'].includes(context)||c.detained||c.inquiry||s.month<c.punishmentUntil&&c.punishmentKind==='confinement';
  if(!restricted){
    const before=c.progress;c.progress=canCultivate(s)?clamp(c.progress+(a.progress||1)*ROOTS[s.player.root].rate*(s.birth.era==='ebb'?.8:1)*networkRate(s)*practiceFactor12(s),0,1000):0;
   if(c.rulesVersion>=5){c.activityMonths[activity]=(c.activityMonths[activity]||0)+1;const gains=c.activityGains[activity]||={};gains.progress=(gains.progress||0)+c.progress-before;}
   if(s.month%6===0){const beforeSkills=s.player.skills[a.skill],prior=Object.fromEntries(['insight','courage','empathy','health','mind'].map(k=>[k,s.player[k]]));cb.apply({skills:c.rulesVersion>=5&&a.trainSkill===false?{}:{[a.skill]:.5},stats:Object.fromEntries(['insight','courage','empathy','health','mind'].filter(k=>a[k]).map(k=>[k,a[k]]))});
    if(c.rulesVersion>=5){const gains=c.activityGains[activity];gains[a.skill]=(gains[a.skill]||0)+s.player.skills[a.skill]-beforeSkills;for(const k of Object.keys(prior))if(a[k])gains[k]=(gains[k]||0)+s.player[k]-prior[k];}
    /*
     * 体魄 —— **出力的事**才长（练剑、做工、丹术），静坐读书不长。
     * 只在当前版本（规则十二）有；旧版本照原样走（历史基线不能动）。
     */
    trainConstitution12(s,CONSTITUTION_GAIN[activity]||0);}
  }
  if(c.exam&&s.player.focus===c.exam.skill&&!restricted&&context!=='retreat'&&s.month<=c.exam.deadline)c.exam.preparation++;
 }
 for(const p of s.life.family.members)if(p.status==='alive'&&s.month>=p.deathAt){p.status='dead';c.familyLoss=p.name+'已经离世。家中仍有人保存旧信与遗物。';c.deathNews.push({id:p.id,due:s.month+(currentContinent(s)===s.birth.continent?3:18),occurred:s.month});}
 if(age(s)>=35&&!c.descendants.length&&s.life.family.members[1].status==='alive')c.descendants.push({id:'niece',name:s.player.name[0]+'小禾',relation:'堂亲的孩子',born:35*12,status:'alive',location:'home',known:false,deathAt:115*12});
 if(age(s)>=70&&c.descendants.length===1)c.descendants.push({id:'grandniece',name:s.player.name[0]+'安宁',relation:'家中下一代',born:70*12,status:'alive',location:'home',known:false,deathAt:150*12});
 for(const p of c.descendants)if(p.status==='alive'&&s.month>=p.deathAt)p.status='dead';
 for(const news of c.deathNews.filter(n=>s.month>=n.due&&!c.activeChain&&s.journey?.open&&c.familyPolicy!=='sever'&&routeOptions(s).find(r=>r.id===s.birth.continent)?.route)){if(!c.knownDeaths.includes(news.id)){c.knownDeaths.push(news.id);record(s,cb,'中转者送来家中讣告',s.life.family.members.find(p=>p.id===news.id).name+'已经离世。消息通过旧地址与中转者送到，故乡的生活仍在继续。','people');}}
 if(c.path!=='mortal'&&c.familyPolicy!=='sever'&&!seen(s,'family_gate')&&s.month>=c.familyAt&&!c.mail&&storyOpportunity(s,'family_gate',28,35)){
  const p=s.life.family.members.find(p=>p.status==='alive');
  if(p){c.mail={sent:s.month,sentAge:age(s),due:s.month+(currentContinent(s)===s.birth.continent?3:18),body:familyMessage(s,p),delayed:false};}
 }
 if(c.mail&&s.month>=c.mail.due&&s.journey?.open&&!c.activeChain&&routeOptions(s).find(r=>r.id===s.birth.continent)?.route){c.mail.delayed=s.month-c.mail.sent>24;schedule(s,'family_gate');}
 if(age(s)>=16&&!c.admissionDone&&!seen(s,'reception')&&!seen(s,'root_result')&&!c.queue.length){
  /*
   * 第一张卡 = **背景卡**（必答，不是岔路）。
   * ⚠ **旧档没有 `s.birth.background`**（这一版之前存的）⇒ 走原来的那张
   *   （early_demonic / early_beast / early_loose / reception），
   *   别让旧档读档后卡住 —— 那些卡**没删**，还在事件表里。
   */
  const first=s.birth.background||({ordinary:'reception',demonic:'early_demonic',beast:'early_beast',loose:'early_loose'})[s.birth.upbringing];
  if(first&&!seen(s,first))schedule(s,first);
 }
 if(c.punishmentKind&&s.month>=c.punishmentUntil){cb.apply({flags:{learningPermit:true}});record(s,cb,'重见山门晨光',c.punishmentKind==='confinement'?'石门终于打开，严衡解开禁灵符，把弟子牌扔回你手中。久不见光，你站在阶前眯了很久的眼；惩戒已满，听课与外出的禁令解除。':'许执事走过你补好的山道，把扣下的弟子牌还给你。服役结束，三堂恢复让你听课。','institution');delete c.punishmentKind;}
 automaticCultivation(s,cb);
 if(canCultivate(s)&&!c.mundane?.arc&&!c.worldDone&&s.month>=c.worldAt){
  c.worldDone=true;
  if(c.worldKind===0){
   schedule(s,'world_raid');
  }else {const edge=['home','tide'].sort().join('-');c.closed.push(edge);record(s,cb,c.worldKind===1?'海路暂时封航':'北境关卡易手','青岚与临潮之间的直达路线暂时中断，商队改走其他已确认的通路。','world');}
 }
 const alert=c.queue.find(q=>q.event==='world_raid'&&q.due<=s.month);
 if(alert&&!c.detained&&(context!=='outer'||['moon_key','gate_anchor','sky_scroll'].some(id=>s.inventory.includes(id)))){
  c.suspended={context:c.context,chain:c.activeChain,month:s.month,journey:copy(s.journey),queue:c.queue.filter(q=>isChainStage(q.event)).map(q=>({event:q.event,remaining:Math.max(1,q.due-s.month)}))};
  c.queue=c.queue.filter(q=>q!==alert&&!isChainStage(q.event));c.context=null;c.activeChain=null;
  record(s,cb,'中转者送来战事急讯','争夺灵泉的战事波及住处，可靠的中转者带来了具体位置。','world');cb.arriveRaw('world_raid');return;
 }
 if(scheduleMonth(s,cb))return;
 if(!s.journey?.open)return;
 const due=c.queue.filter(q=>q.due<=s.month&&(!c.detained||q.event.startsWith('custody_'))&&(!c.inquiry||['dark_invitation','dark_oath','beast_invitation','beast_acceptance','departure_terms'].includes(q.event))&&(!c.activeChain||q.event.startsWith(c.activeChain+'_'))&&(!q.event.startsWith('selection_')||!q.event.endsWith('_result')||c.path!=='orthodox'||currentContinent(s)===s.birth.continent)).sort((a,b)=>a.due-b.due);
 if(due.length){
  const picked=due[0];
  c.queue=c.queue.filter(q=>q!==picked);if(!seen(s,picked.event))cb.arriveRaw(picked.event);return;
 }
 if(c.activeChain||c.detained||c.inquiry||!c.admissionDone||s.month<c.choiceAt)return;
 const possible=[];
 /* 突破卡不在这里抽 —— 它归「里程碑档」管（packages/adventure/scheduler.js）：
    条件齐了就发，不跟别的卡抢，也不受发卡冷却牵制。 */
 if(c.path==='orthodox'&&currentContinent(s)===s.birth.continent&&s.player.realm>=1&&s.month>=c.punishmentUntil&&!seen(s,'garden_accident')&&storyOpportunity(s,'garden_accident',20,36,.5))possible.push('garden_accident');
 if(canCultivate(s)&&age(s)>=40&&!seen(s,'road_turn')&&storyOpportunity(s,'road_turn',40,55,.6))possible.push('road_turn');
 const evidence=discoverableEvidence(s);
 if(c.wanted>0&&evidence&&age(s)>=30&&!seen(s,'system_warrant'))possible.push('system_warrant');
 if(c.wanted>0&&evidence&&age(s)>=65&&seen(s,'system_warrant')&&!seen(s,'system_pursuit'))possible.push('system_pursuit');
 const tier=Math.max(1,s.player.realm);if(canCultivate(s)&&c.path!=='mortal'&&s.player.realm<3&&age(s)>=20&&s.month>=c.punishmentUntil&&!seen(s,'selection_'+tier)&&!c.exam&&(tier>1||!s.flags.learningPermit))possible.push('selection_'+tier);
 if(routeOptions(s).find(r=>r.id===s.birth.continent)?.route&&age(s)>=40&&c.familyPolicy!=='sever'&&!seen(s,'family_dispute')&&storyOpportunity(s,'family_dispute',40,52,.35))possible.push('family_dispute');
 if(routeOptions(s).find(r=>r.id===s.birth.continent)?.route&&age(s)>=35&&c.familyPolicy!=='sever'&&s.life.family.members.some(p=>p.status==='alive')&&!seen(s,'family_support')&&storyOpportunity(s,'family_support',35,48,.7))possible.push('family_support');
 if(routeOptions(s).find(r=>r.id===s.birth.continent)?.route&&age(s)>=83&&!seen(s,'family_grave')&&c.descendants.length&&storyOpportunity(s,'family_grave',83,100,.55))possible.push('family_grave');
 /*
  * 长线的发卡条件（**当前版本规则十二**）：
  *   · `age >= chain.age && age <= chain.ageEnd` —— 这条线该在哪个年纪出现，由内容说了算
  *     （`ageEnd` 的算法见 `content/cultivation-stories.js` 的 ROAD_CHAINS 说明）；
  *   · 机会窗口也用 `chain.age ~ chain.ageEnd` ——
  *     以前写的是 `age(s) ~ age(s)+12`，也就是「**第一次轮到抽签时**的年龄往后 12 年」，
  *     那个起点会随时序漂移 ⇒ 同一条线在不同人生里长度与位置都不一样。
  *     现在窗口直接由内容定 ⇒ 稳定。
  *   · 「有没有机会」的抽签在 `content/cultivation-daily.js` 里（当前版本由种子决定）。
  *
  * ⚠⚠ **长线不再进这个候选池**（2026-11-08 · 世界域）：
  *   长线改由 `packages/adventure/scheduler.js` 的**长线档**发 ——
  *   条件齐了就发，不跟别的卡抢，也不用随机抽。
  *   （原来在这里随机抽 ⇒ 长线在池里排队，轮不到就永远轮不到，
  *     实测加上年龄上界后 `sect_repair` 40 条人生只触发 2 条。）
  *
  * ⚠ 历史版本（5–11）各有自己的执行器（`cultivation-v5.js` … `cultivation-v11.js`），
  *   那些文件一个字都没动 ⇒ 旧档行为逐值不变。
  */
 // Offer a conclusion after a settled period, without cutting off a promised task.
 const settled=!c.network.offer&&!c.network.arc&&!c.network.next&&!c.queue.length&&!c.mail&&!c.story10.echo&&s.month-(s.decisions.at(-1)?.month||0)>=60;
 if(settled&&(!canCultivate(s)&&age(s)>=70||c.path==='mortal'&&age(s)>=45||c.worldDone&&age(s)>=100&&s.player.realm>=1||s.player.realm>=3&&Object.values(c.chains).filter(a=>a.step===2).length>=3&&age(s)>=100||age(s)>=180)){if(!seen(s,'system_final'))possible.push('system_final');}
 /*
  * ⚠ 闸：先过滤再抽签 —— 被拦的卡**不占这个月**，抽签也不白抽
  * （随机流保持干净：被拦的那次不消耗随机数）。
  * 池里全被拦住 ⇒ 下个月再试（`choiceAt` 推到下个月），
  * 条件合适了它还会再出现 —— 不会「一张卡被拦一次就永远没了」。
  */
 const allowed=possible.filter(id=>allowDaily(s,id));
 if(allowed.length){const id=allowed[Math.floor(random(s,'events')*allowed.length)];if(id==='system_warrant'||id==='system_pursuit')c.trackedEvidence=copy(evidence);cb.arrive(id);}
 else if(possible.length)c.choiceAt=s.month+1;
 else c.choiceAt=s.month+12;
 s.life.activity=cultivationActivity(s);
}
function revised_validateCultivation(s,fail){
 const c=s.life?.cultivation;if(!c)return;
 if(c.rulesVersion!==12)fail('修行规则版本');validate12(s,fail);validateNetwork(s,fail);validateProgression(s,fail);validateRevision9(s,fail);validate10(s,fail);validateMundane(s,fail);
 if(c.rulesVersion>=5){
  if(!c.opportunities||Array.isArray(c.opportunities)||Object.entries(c.opportunities).length>96||Object.entries(c.opportunities).some(([id,o])=>!CULTIVATION_EVENTS[id]&&!ROAD_CHAINS.some(a=>a.id===id)||typeof o.occurs!=='boolean'||!Number.isSafeInteger(o.from)||!Number.isSafeInteger(o.to)||o.from>s.month||o.to<o.from||o.to>13000))fail('故事机会窗口');
  if(!c.dailyMemory||Array.isArray(c.dailyMemory)||Object.entries(c.dailyMemory).some(([id,a])=>!Array.isArray(a)||a.length>64||a.some(v=>!Number.isInteger(v)||v<0||v>64)))fail('日常故事记忆');
  if(!c.economy||!['received','spent'].every(k=>Number.isFinite(c.economy[k])&&c.economy[k]>=0)||c.economy.last&&(!Number.isSafeInteger(c.economy.last.month)||c.economy.last.month>s.month||!['gross','upkeep','shortfall','balance'].every(k=>Number.isFinite(c.economy.last[k])&&c.economy.last[k]>=0)))fail('灵石收支');
  if(c.punishmentKind!==undefined&&!['confinement','service'].includes(c.punishmentKind))fail('师门惩戒类型');
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
 if(!Array.isArray(c.attempts)||c.attempts.length!==5||c.attempts.some(v=>!Number.isInteger(v)||v<0||v>4))fail('突破次数');
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
function revised_cultivationText(input,s,event,kind='node'){
 let text=String(input||'');
 if(s.life.cultivation.teacher==='白苓')text=text.replaceAll('山中老猿','白苓').replaceAll('老猿','白苓');
 if(event==='world_raid'&&(s.life.cultivation.suspended?.chain||s.life.cultivation.suspended?.journey&&!s.life.cultivation.suspended.journey.open)){
  if(kind==='node')text='中转者带来住处的战况：'+text.replaceAll('你看到','信中说');
  if(kind==='option')text=text.replaceAll('协助守住撤离路','传音告知守阵人撤离办法');
  if(kind==='reply')text=text.replaceAll('你们守住一段出口','同门按你转交的办法守住一段出口');
 }
 if(kind==='node'&&event?.startsWith('selection_')&&event.endsWith('_result')&&s.life.cultivation.exam&&s.month>s.life.cultivation.exam.deadline)text='本届考核已经结束。截止那天你没有到达考场，执事保留了报名记录，但没有给你登记成绩与奖励。你可以退出本届，日后准备下一阶段的考核。';
 if(kind==='node'&&event==='loose_relic_1'&&s.life.cultivation.chains.loose_relic?.conduct==='cautious')text='你在洞口勘查时，探路者送来消息：另一队修士堵住了药室。嵇萝请你决定是否进洞协商，或沿已查明的路离开。';
 if(event?.startsWith('loose_portal_')&&event!=='loose_portal_0'&&!s.life.cultivation.chains.loose_portal?.departed)text=kind==='option'?'请探路队'+text:'白渡通过已经稳住的阵台转告探路队消息：'+text.replaceAll('你','探路队');
 if(event?.startsWith('sect_return_')&&s.life.cultivation.chains.sect_return?.conduct==='cautious'&&currentContinent(s)!==s.birth.continent)text=kind==='option'?'请支援队'+text:'支援队经中转阵送来报告：'+text.replaceAll('你','支援队');
 if(kind==='reply'&&event==='dark_method_1')text=text.replaceAll('你停下禁术','你暂不使用原禁术');
 if(s.people.ally.status==='dead')text=text.replaceAll('嵇萝','当地接应的修士');
 if(s.people.trialmate.status==='dead'&&event!=='sect_trial_2')text=text.replaceAll('陶宁','另一位采药弟子');
 if(s.people.trialmate.status==='missing'&&event!=='sect_trial_2')text=text.replaceAll('陶宁','另一位采药弟子');
 return introduceText(progressionText(text,s,event,kind),s);
}

// Existing lives continue with their original scheduling, economy and choices.
/**
 * 地图视角 —— 「现在在哪 + 已经解锁了哪些地方」。
 *
 * ⚠ 呈现层（网页端点阵地图、小程序端点阵地图）**不许自己判断**该显示哪几块大陆：
 *   它只按这里给的 `unlocked` 清单画 ⇒ 两端画出来的东西必然一样
 *   （画面门禁要求两端「逐笔一致」）。
 *
 * ⚠ 「解锁」的口径 = **当前所在的大陆 + 真正走过的大陆 + 从这些地方能直接去的大陆**。
 *   · 前两项：你在哪、你去过哪。
 *   · 第三项：**直接相邻**（只隔一跳）的大陆也画上。
 *     为什么要有这一项：实测随机跑出来的 5 段人生**每一段都只在一块大陆上**
 *     （`visited` 里只有出生地）⇒ 若只画前两项，地图上一条路都没有，
 *     图例里的「虚线 · 已知通路 / 墨绿 · 已走路线 / × 暂不通行」全都用不上。
 *     画上相邻的大陆后：在青岚就看得见临潮与烬原，也看得见通往它们的路
 *     （路暂时不通的还会标 ×）⇒ 地图这才真的回答了「能去哪」。
 *   · 隔两跳的大陆不画（浮屿界在青岚看不到）⇒ 地图仍然聚焦，不会摊成一张世界全图。
 *   · 走过的路越多，画出来的大陆越多 ⇒ 地图会随旅程慢慢长齐。
 *
 * @param {object} s 当前人生状态（可为空）
 * @returns {{current:string|null, visited:string[], unlocked:string[]}}
 */
export function mapView(s){
 const c=s&&s.life?s.life.cultivation:null;
 const current=currentContinent(s);
 const visited=(c&&c.visited)||[];
 const unlocked=[];
 const push=id=>{if(id&&unlocked.indexOf(id)<0)unlocked.push(id);};
 push(current);
 for(let i=0;i<visited.length;i++)push(visited[i]);
 /* 再把「从这些地方能直接去的大陆」补上（只隔一跳）。 */
 const known=unlocked.slice();
 for(let i=0;i<known.length;i++){
  const g=GEOGRAPHY.find(x=>x.id===known[i]);
  if(!g)continue;
  const links=g.connections||[];
  for(let j=0;j<links.length;j++)push(links[j]);
 }
 return {current,visited,unlocked};
}
export function currentContinent(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_currentContinent(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).currentContinent(...args);}
export function cultivationActionTrip(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationActionTrip(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationActionTrip(...args);}
export function beginCultivationAction(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_beginCultivationAction(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).beginCultivationAction(...args);}
export function cultivationContext(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationContext(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationContext(...args);}
export function cultivationActivity(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationActivity(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationActivity(...args);}
export function activityOptions(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_activityOptions(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).activityOptions(...args);}
export function changeActivity(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_changeActivity(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).changeActivity(...args);}
export function cultivationIncome(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationIncome(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationIncome(...args);}
export function discoverableEvidence(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_discoverableEvidence(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).discoverableEvidence(...args);}
export function completeCultivationAction(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_completeCultivationAction(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).completeCultivationAction(...args);}
export function routeOptions(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_routeOptions(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).routeOptions(...args);}
export function beginTravel(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_beginTravel(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).beginTravel(...args);}
export function finishTravel(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_finishTravel(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).finishTravel(...args);}
export function withdrawCultivation(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_withdrawCultivation(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).withdrawCultivation(...args);}
export function cultivationMonth(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationMonth(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationMonth(...args);}
export function validateCultivation(...args){const version=args[0]?.life?.cultivation?.rulesVersion;return version===12?revised_validateCultivation(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).validateCultivation(...args);}
export function cultivationText(...args){const version=args[1]?.life?.cultivation?.rulesVersion;return version===12?revised_cultivationText(...args):(version===11?rules11:version===10?rules10:version===9?rules9:version===8?rules8:version===7?rules7:version===6?rules6:previousRules).cultivationText(...args);}

export function cultivationDeliveryMonths(s,selected){
 if(s.life?.cultivation?.rulesVersion===11)return rules11.cultivationDeliveryMonths(s,selected);
 if(s.life?.cultivation?.rulesVersion===10)return rules10.cultivationDeliveryMonths(s,selected);
 if(s.life?.cultivation?.rulesVersion===7)return rules7.cultivationDeliveryMonths(s,selected);
 if(s.life?.cultivation?.rulesVersion===8)return rules8.cultivationDeliveryMonths(s,selected);
 if(s.life?.cultivation?.rulesVersion!==12)return 0;
 const op=selected.system||{};
 if(!op.familySend&&!op.familySupport&&!op.familyAid&&!op.familyPolicy)return 0;
 const trip=routeOptions(s).find(r=>r.id===s.birth.continent);return trip?.route?6+(trip.route.length-1)*18:0;
}
