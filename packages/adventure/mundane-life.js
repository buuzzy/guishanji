import {hashText} from '../core/random.js';
import {GEOGRAPHY} from '../../content/cultivation-world.js';
import {NOVEL_NAMES} from '../../content/novel-names.js';
import {MUNDANE_KEPT} from '../../content/mundane-kept.js';
import {canCultivate,route} from './story-rules10.js';

export const activeMundane=s=>s.life?.cultivation?.rulesVersion>=11;
export const mundane=s=>s.life?.cultivation?.mundane;
const c=s=>s.life.cultivation;
const years=s=>(s.birth.startAge||0)+Math.floor(s.month/12);
const roll=(s,key)=>hashText(s.seed+':mortal11:'+key)%100;
/*
 * ⚠ **凡人线五张直线**（2026-11-08 · 阶段 3.3）
 * ------------------------------------------------
 * 交接文档要求：**凡人线单命触发 ≤ 5 张卡**（改前实测 12–20 张）。
 *
 * ⇒ 新的人生（规则十二）走 `MUNDANE_KEPT` 那五张：
 *   起（落选选活计）→ 承（立业）→ 转（成家的打算）→ 合（河滩遗物与代价）→ 结（交代后事）。
 *
 * ⚠ **只有新人生走这条路**：
 *   · 规则十一（旧版本）的事件表是冻结快照 ⇒ 它的人生必须继续走原来的弧制
 *     ⇒ `step` 只在规则十二的新人生里才有；
 *   · 阶段 3.3 之前存的规则十二旧档也没有 `step` ⇒ 继续走原来的弧制（**旧档不卡住**）。
 *
 * ⚠ **停用的 45 张卡一个字都没删**（正文、选项、表达域说法全在），
 *   只是不再发出去 ⇒ 放回来只要改 `content/mundane-kept.js` 一处。
 */
const plan12=s=>c(s).rulesVersion>=12&&typeof mundane(s).step==='number'&&mundane(s).step>=0;
/** 凡人的收尾之年（与版本无关的那个口径抽成一处）。 */
const endAge=s=>c(s).rulesVersion===12?Math.max(45,c(s).v12.body.natural-c(s).v12.body.loss-4):78;
const log=(s,cb,title,body,kind='life')=>{cb.log({kind,title,body,automatic:true,location:s.player.location,context:c(s).context||'home'});s.life.automaticCount++;mundane(s).lastVisible=s.month;};
export const JOBS={yard:'外院杂役',shop:'药铺伙计',farm:'田户',carrier:'商队脚夫'};
export function initializeMundane(s){
 const used=new Set([s.player.name,...Object.values(c(s).progression.names)]);
 function name(role,sex){const pool=NOVEL_NAMES.filter(p=>p.sex===sex);let i=hashText(s.seed+':mundane-person:'+role)%pool.length;for(let n=0;n<pool.length;n++,i=(i+1)%pool.length)if(!used.has(pool[i].name)){used.add(pool[i].name);return pool[i].name;}throw Error('人物姓名池耗尽');}
 c(s).mundane={format:1,started:false,job:null,home:c(s).continent,money:0,grain:0,debt:0,earned:0,spent:0,workMonths:0,trust:0,stage:0,next:0,quietAt:0,lastVisible:0,cycle:0,daily:[],done:[],arc:null,action:null,
  people:[{id:'employer',name:name('employer','M'),role:'药铺师傅',status:'alive',born:-360,deathAt:660,location:c(s).continent,known:false},{id:'worker',name:name('worker',s.player.sex==='M'?'F':'M'),role:'同住的伙计',status:'alive',born:-12,deathAt:1020,location:c(s).continent,known:false},{id:'boatman',name:name('boatman','M'),role:'运药船工',status:'alive',born:-240,deathAt:816,location:c(s).continent,known:false},{id:'healer',name:name('healer','F'),role:'游方修士，懂残缺植灵法',status:'alive',born:-720,deathAt:2400,location:c(s).continent,known:false}],
  spouse:null,child:null,lifeOrder:Array.from({length:12},(_,i)=>i).sort((a,b)=>hashText(s.seed+':life-card:'+a)-hashText(s.seed+':life-card:'+b)),local:{place:c(s).continent,regime:0,kind:null,until:0,tax:0,history:[]},corpse:null,gift:null,ledger:null,notes:[],assets:[],lastChoice:0,
 /* ⚠ 五张直线走到第几张了（**只有规则十二的新人生有**这个键；旧版本 / 旧档没有 ⇒ 走原来的弧制）。
    ⚠ 键是「有或没有」，不能写成 `step: undefined` —— 那会给存档多出一个空键。 */
 ...(c(s).rulesVersion>=12?{step:0}:{})};
}
export const person=(s,id)=>mundane(s).people.find(p=>p.id===id);
export const personName=(s,id)=>person(s,id)?.name||'当地人';
const sameHome=(s,p)=>p?.location===(mundane(s).residence||mundane(s).home);
export function mundanePeople(s){if(!activeMundane(s))return [];const m=mundane(s);return [...m.people,...[m.spouse,m.child].filter(Boolean)].filter(p=>p.known).map(p=>({...p,description:sameHome(s,p)?'在你现在的住处附近':'住在另一处地方',status:p.status==='dead'?(p.deathNotice?'已确认离世':'尚未收到近况'):p.status==='missing'?'下落未明':sameHome(s,p)?'在世':'最近消息说仍在世'}));}
export function mundaneRequirements(s,r){
 if(!activeMundane(s))return [];
 const m=mundane(s),out=[];
 if(r.money&&m.money<r.money)out.push('需要'+r.money+'文钱');
 if(r.mortalPerson&&![...m.people,m.spouse,m.child].some(p=>p&&p.id===r.mortalPerson&&p.status==='alive'&&sameHome(s,p)))out.push('对方须在世并与你同处一地');
 if(r.mortalItem&&!s.inventory.includes(r.mortalItem))out.push('尚未持有这件旧物');
 if(r.mortalEvidence&&!m.notes.includes(r.mortalEvidence))out.push('尚未取得对应证据');
 return out;
}
export function mundaneChoice(s,choice,event){
 if(!activeMundane(s)||!event.startsWith('m11_'))return choice;const out={...choice},a=mundane(s);
 if(event==='m11_inheritance_0'){
  const path=route(s,c(s).continent,s.birth.continent);out.months=Math.max(out.months||0,12+(path?path.length-1:0)*18);
  const own=out.available;out.available=()=>!!path&&(!own||own(s));out.reason='故乡商路不通，或家中没有可交的现钱';
 }
 if(event==='m11_corpse_3'&&choice.id==='stay'&&a.corpse?.truth===0)out.check={...out.check,base:65};
 if(event==='m11_shop_2'&&!a.notes.includes('shop:lease')){
  if(choice.id==='keep'){out.label='继续在铺里做验药熟手';out.hint='你领工钱验货，租钱与铺门由掌柜负责。';out.reply='新掌柜请你继续验药收货，按约付工钱；你没有接下铺子的租约。';}
  if(choice.id==='sell'){out.label='结清工钱，随商队另找活计';out.hint='向掌柜交清经手的货，带走自己的工钱。';out.reply='掌柜结清你的工钱，你交回货签，随商队另找搬货的活。';}
 }
 if(event==='m11_work_2'&&choice.id==='lead'){out.hint='带新人核对经手的货，不接管雇主全部财物。';out.reply='你领到带新人的册子，教他们核货认路，雇主仍另管账房与库房。';}
 if(event==='m11_family_2'&&a.spouse?.status!=='alive'&&choice.id==='remain'){out.label='整理共同住过的旧屋';out.hint='留下旧物，照看仍在身边的人。';out.reply='你整理共同住过的旧屋，收好留下的衣物，没有再安排孩子。';}
 if(event.startsWith('m11_life_')){
  const age=years(s),id=Number(event.slice('m11_life_'.length));
  if(age<50&&id>=6){out.hint=choice.id==='steady'?'先将熟悉的活做稳，再带新来的伙计。':out.hint;}
 }
 return out;
}
export function mundaneQuote(s){
 const m=mundane(s);if(!m?.started||!m.job||years(s)<16)return {gross:0,upkeep:0,net:0};
 const restricted=c(s).detained||c(s).inquiry||c(s).context==='retreat'||s.journey?.cultivationTravel||s.journey?.cultivationActionTravel;
 if(restricted)return {gross:0,upkeep:0,net:0};
 const wage=m.job==='yard'?8:m.job==='shop'?12:m.job==='carrier'?14:10;
 const gross=wage+(m.stage>=2?10:m.stage===1?4:0),upkeep=5+(m.spouse?.status==='alive'&&sameHome(s,m.spouse)?2:0)+(m.child?.status==='alive'&&sameHome(s,m.child)?3:0)+(m.local.place===c(s).continent&&m.local.until>s.month?m.local.tax:0);
 return {gross,upkeep,net:gross-upkeep};
}
export function mundaneStoneQuote(s){return {gross:0,upkeep:0,net:0,reason:'平日工钱用铜钱结算，灵石须由实际交易或仙门酬谢获得'};}
export function mundaneSettlement(s){
 const m=mundane(s),q=mundaneQuote(s);if(!m.started)return;
 m.money+=q.gross;m.earned+=q.gross;const paid=Math.min(m.money,q.upkeep);m.money-=paid;m.spent+=paid;if(paid<q.upkeep)m.debt+=q.upkeep-paid;
 const repaid=Math.min(m.debt,Math.floor(Math.max(0,m.money-24)/3));m.money-=repaid;m.spent+=repaid;m.debt-=repaid;
 m.grain=Math.max(0,Math.min(18,m.grain+(m.job==='farm'?2:1)-(m.local.place===c(s).continent&&m.local.kind==='water'&&m.local.until>s.month?2:1)));
 m.ledger={month:s.month,...q,paid,repaid,balance:m.money,debt:m.debt};
}
function takeMoney(s,n){const m=mundane(s);if(m.money<n)throw Error('文钱不足');m.money-=n;m.spent+=n;}
function earn(s,n){const m=mundane(s);m.money+=n;m.earned+=n;}
function changeJob(s,id){const m=mundane(s);m.job=id;m.stage=0;m.workMonths=0;m.home=c(s).continent;
 m.residence=m.home;
 c(s).activity='work';s.player.focus='alchemy';c(s).rank=JOBS[id];c(s).path=id==='yard'?'orthodox':'mortal';
 s.player.home=GEOGRAPHY.find(g=>g.id===m.home).places[id==='yard'?2:0]+(id==='yard'?'外院住处':id==='shop'?'药铺后屋':id==='farm'?'租住小院':'商队歇脚处');c(s).spot=s.player.home;
 person(s,'employer').location=m.home;person(s,'employer').known=id==='shop';person(s,'worker').location=m.home;person(s,'worker').role=id==='farm'?'邻田农户':id==='carrier'?'同队脚夫':id==='yard'?'同住杂役':'同住的伙计';person(s,'worker').known=!m.spouse;
}
function beginArc(s,cb,kind){const m=mundane(s);m.done.push(kind);m.arc={kind,stage:0,due:s.month,location:c(s).continent};
 if(['water','levy','siege'].includes(kind))m.local.place=c(s).continent;
 if(kind==='corpse'){
  const truth=roll(s,'corpse-truth')%3;m.corpse={truth,origin:c(s).continent,found:s.month,taken:false,witness:false,sale:false,report:false,buried:false,trace:false,closed:false,warning:false};
  person(s,'boatman').known=true;person(s,'boatman').location=c(s).continent;
 }
 if(kind==='water'||kind==='levy'){m.local.kind=kind;m.local.until=s.month+36;m.local.tax=kind==='water'?4:6;if(kind==='levy')m.local.regime++;m.local.history.push({kind,month:s.month,location:c(s).continent});}
 if(kind==='gift'){person(s,'healer').known=true;person(s,'healer').location=c(s).continent;m.gift={source:'river-remains',relicFound:m.corpse.found,stage:'offered',materials:false,changed:false,outcome:null};}
 if(kind==='siege'){c(s).worldDone=true;m.local.kind='siege';m.local.until=s.month+24;m.local.tax=4;m.local.history.push({kind,month:s.month,location:c(s).continent});}
 cb.arrive('m11_'+kind+'_0');m.lastVisible=s.month;
}
function done(s,delay=36){const m=mundane(s);m.arc=null;m.action=null;c(s).context=null;m.next=s.month+delay;m.lastChoice=s.month;}
function later(s,stage,months=12){const m=mundane(s);m.arc.stage=stage;m.arc.due=s.month+months;c(s).context=null;m.action=null;}
function alert(s,cb,id){cb.arrive(id);mundane(s).lastVisible=s.month;}

const dailyRows={
 yard:[['灶房先留了一锅粥','雨夜有几名受伤弟子回山，你和灶房的人把湿柴搬开，留出热粥。修士先取伤药，凡人随后才端到饭；同住的伙计替你守了后半夜。'],['山门外的旧梯','伙计爬梯修屋时，旧榫突然松开。你扶住梯脚，请木匠换掉裂榫，把坏梯横放在墙边；次日没人再拿它登高。'],['被退回的竹筐','丹房退回一筐发霉的草叶。你拆开湿底，让送货人当面看见坏叶，留好两张交货签，免得下次把损耗算到搬筐的人头上。'],['外院的冬衣','山上提前落雪，你和伙计把旧棉衣补好。接引处带来两名新杂役，你们让出靠灶的床，新人帮你们把积雪铲出院门。']],
 shop:[['船户多算的一程钱','货单上的渡船钱比原约多了一程。你把收货日期和旧底单摆在桌上，船户发现记串了账，退回差额，答应下次给你带沿途物价的消息。'],['师傅留下的药样','验货时有人送来叶形相近的两包药。你对照师傅留下的干药样，挑出叶背有刺的那包，写清退货原因；病人的药没有因此配错。'],['伙计第一次独自收货','你陪伙计验完最后一袋货，才把秤和货签交给她。她第一次独自收货，天黑后拿着两张签回屋，请你核对自己有没有漏记。'],['铺前的雨棚','连日下雨，病人挤在药铺门前等开门。你请木匠补了雨棚，邻铺借来两条长凳；雨停以后，两家各把借来的物件还清。']],
 farm:[['留下过冬的种粮','收成不多，你将干燥的种粮另装一袋，没和口粮混在一起。邻人来借种时，你记下归还的时节，先留够自己下一季播种的份。'],['旧渠边的新刻痕','修渠时你在石槽上刻了水位。两户人后来争谁先放水，你把当时的水痕指给他们看，让他们各请一个见证人再排轮次。'],['赶集换一把新锄','旧锄柄磨得握不住，你赶集时带去一篮普通菜蔬，换了木匠削好的柄。回家将旧柄截成短木，留作生火，没有买仙家的器物。'],['邻人的屋顶倒了一角','邻人屋顶被风掀开，你帮他把还完整的瓦片收回，借他一卷草席遮雨。他留下两袋柴，等你下次修屋时来还这份人情。']],
 carrier:[['改走山脚的驿道','旧桥的木板腐了，领队让你先问守桥人。你们绕山脚多走半日，把实际经过的驿站记在货单上，没向下一队保证旧桥还能过。'],['货绳里的暗结','卸货时你发现货绳被割后重新打过结。领队当面重数箱子，货物没少；你们换掉坏绳，让出货人再封一次箱。'],['夜里没有灭的灯','同行的年轻脚夫走丢了一段路，你们在驿门留灯，轮流去路口喊人。他带着扭伤的脚回来，领队重新安排了明日谁替他搬货。'],['商队里换了一位领路人','老领队不再走远路，将最近一年真正走过的线路交给后来的人。你指出仍未通的路口，新队伍另请驿站确认，不拿旧图直接赶路。']]
};
function ordinary(s,cb){const m=mundane(s),pool=dailyRows[m.job]||dailyRows.carrier,eligible=pool.map((row,i)=>({row,key:m.job+':'+i})).filter(r=>!m.daily.includes(r.key));
 if(eligible.length){const p=eligible[roll(s,'daily:'+m.daily.length)%eligible.length];m.daily.push(p.key);log(s,cb,...p.row);}
  else {const months=s.month-m.lastVisible;log(s,cb,'这一段日子留下的活计',`这${Math.max(1,Math.floor(months/12))}年，你在${s.player.home}做${JOBS[m.job]}。${m.debt?'工钱先偿旧债，尚欠'+m.debt+'文。':'扣过食宿，手中积下'+m.money+'文钱。'}${m.spouse?.status==='alive'&&sameHome(s,m.spouse)?'两个人一起照看住处。':m.job==='farm'?'你把几季的播种与收成分别记下，留下下一季够用的种粮。':m.stage>=1?'年轻伙计开始把难验的货交给你看。':'你把常走的路和交过的货留在册中。'}下一段日子，你仍能换活计或另找住处。`);}
 m.quietAt=s.month+24+roll(s,'quiet:'+s.month)%19;
}
export function mundaneMonth(s,cb){
 if(!activeMundane(s))return false;const m=mundane(s);
 // New contacts age at their actual location; no off-screen resurrection.
 for(const p of [...m.people,m.spouse,m.child].filter(Boolean))if(p.status==='alive'&&s.month>=p.deathAt)p.status='dead';
 const contactFree=!s.pending&&!c(s).activeChain&&!c(s).context&&!c(s).detained&&!c(s).inquiry&&(!s.journey||s.journey.open)&&s.month>=c(s).punishmentUntil;
 if(contactFree)for(const p of [...m.people,m.spouse,m.child].filter(Boolean))if(p.known&&p.status==='dead'&&!p.deathNotice&&p.location.split(':')[0]===c(s).continent){
  p.deathNotice=s.month||1;log(s,cb,p.name+'走完了这一生',sameHome(s,p)?p.name+'的住处收起了旧衣与工具。相识的人一起料理留下的事，你收好了对方的旧物。':'同大陆的商队在歇脚处带来消息：'+p.name+'已经离世。你向来人问清旧址与身后事，收下带来的口信。','people');
 }
 if(!m.started&&canCultivate(s))return false;
 if(years(s)<16||!c(s).admissionDone)return false;
 const free=s.journey?.open&&!s.pending&&!c(s).activeChain&&!c(s).context&&!c(s).detained&&!c(s).inquiry&&s.month>=c(s).punishmentUntil;
 if(!m.started){if(!free)return true;
  m.started=true;m.money=24;m.grain=3;m.next=s.month;m.quietAt=s.month+24;alert(s,cb,'m11_start');return true;}
 if(s.month%12===0)mundaneSettlement(s);
 if(!canCultivate(s)&&m.job&&!c(s).context&&!c(s).detained&&!c(s).inquiry&&!s.journey?.cultivationTravel)m.workMonths++;
 if(m.local.kind&&s.month>=m.local.until){const old=m.local.kind;m.local.kind=null;m.local.tax=0;if(free&&m.local.place===c(s).continent&&old!=='siege')log(s,cb,old==='water'?'水渠重新放了水':'征粮的队伍离开了',old==='water'?'水闸按新约轮流开放，田里恢复灌水。你拿着旧借据，再同雇主商量下一季的活。':'地方结束这次征粮，粮价渐渐回落。债主仍认原来的借据，你把当时交过粮的凭据另外收好。','world');}
 if(m.home!==c(s).continent&&free){if(m.arc){m.notes.push('interrupted:'+m.arc.kind);m.arc=null;}changeJob(s,'carrier');log(s,cb,'在异乡重新找活计','原来铺子的差事没有跟着你过海。你先给当地商队搬货，在歇脚处落脚；旧址的人和留下的东西仍在原处。');}
 if(canCultivate(s)&&!m.arc)return false;
 if(!free)return true;
 if(m.arc){
  if(s.month>=m.arc.due){const id='m11_'+m.arc.kind+'_'+m.arc.stage;
   if(m.arc.location!==c(s).continent){done(s);log(s,cb,'旧差事暂且放下','你已经离开约定的地方，没能完成这一段差事，也没有领取尚未交付的报酬。');}
   else alert(s,cb,id);
  }return true;
 }
 if(m.child?.status==='alive'&&!m.child.tested&&s.month-m.child.born>=120&&!plan12(s)){m.child.tested=true;beginArc(s,cb,'child');return true;}
 if(s.month>=m.quietAt)ordinary(s,cb);
 if(s.month<m.next)return true;
 /*
  * ⚠⚠ **五张直线**（规则十二 · 阶段 3.3）——
  *   只发 `MUNDANE_KEPT` 那五张，其余 45 张**保留但不再发**。
  *   ⇒ 凡人线单命触发 ≤ 5 张（交接文档的验收口径）。
  *
  * ⚠ **「结」那张不是接在「合」后面就发** —— 它要等到寿限那几年
  *   （与原来的口径一样：凡人的收尾在将尽之年，不在壮年）。
  */
 if(plan12(s)){
  const next=MUNDANE_KEPT[m.step];
  if(next==='m11_end'){
   if(years(s)>=endAge(s)){alert(s,cb,'m11_end');return true;}
   m.next=s.month+12;return true;
  }
  if(next){alert(s,cb,next);return true;}
 }
 if(years(s)>=endAge(s)){alert(s,cb,'m11_end');return true;}
 const candidates=[];
 if(m.workMonths>=24&&!m.done.includes('work')&&roll(s,'work')<75)candidates.push('work');
 if(m.job==='shop'&&m.workMonths>=72&&person(s,'employer').status==='alive'&&!m.done.includes('shop')&&roll(s,'shop')<70)candidates.push('shop');
 if(years(s)>=24&&years(s)<48&&!m.spouse&&!m.done.includes('family')&&!m.notes.includes('worker-betrayed')&&person(s,'worker').status==='alive'&&roll(s,'family')<60)candidates.push('family');
 if(m.workMonths>=48&&!m.done.includes('water')&&roll(s,'water')<55)candidates.push('water');
 if(m.workMonths>=96&&!m.done.includes('levy')&&roll(s,'levy')<60)candidates.push('levy');
 if(m.workMonths>=60&&!m.done.includes('corpse')&&c(s).continent!=='sky'&&roll(s,'corpse')<45)candidates.push('corpse');
 if(years(s)>=27&&!m.done.includes('visitor')&&roll(s,'visitor')<35)candidates.push('visitor');
 if(m.job==='yard'&&years(s)>=40&&!m.done.includes('siege')&&roll(s,'siege')<35)candidates.push('siege');
 if(m.job==='carrier'&&m.workMonths>=48&&!m.done.includes('route')&&roll(s,'route')<60)candidates.push('route');
 if(years(s)>=50&&years(s)<60&&!m.done.includes('inheritance')&&route(s,c(s).continent,s.birth.continent)&&s.life.family.members.some(p=>p.status==='alive')&&roll(s,'inheritance')<45)candidates.push('inheritance');
 if(m.corpse?.closed&&s.inventory.includes('mortal_wood')&&!m.done.includes('gift')&&s.month-m.corpse.found>=120&&roll(s,'gift')<20)candidates.push('gift');
 if(candidates.length){beginArc(s,cb,candidates[roll(s,'offer:'+s.month)%candidates.length]);return true;}
 if(m.cycle<12){const id=m.lifeOrder.find(i=>!s.decisions.some(d=>d.event==='m11_life_'+i)&&years(s)>=({9:55,10:50,11:65}[i]||16));if(id!==undefined){alert(s,cb,'m11_life_'+id);m.cycle++;return true;}}
 m.next=s.month+24;return true;
}
export function mundaneBegin(s,selected){
 if(!activeMundane(s)||!selected.system?.mundane)return;
 const m=mundane(s),op=selected.system.mundane;if(op.pay)takeMoney(s,op.pay);
 m.action={kind:op.kind,id:op.id,from:s.month};
 if((selected.months||0)>0)c(s).context=op.kind==='gift'&&op.id==='attempt'?'retreat':'work';
}
export function mundaneComplete(s,event,id,cb){
 const m=mundane(s);if(!m?.started)return;const success=s.decisions.find(d=>d.event===event&&d.choice===id)?.success!==false;
 c(s).context=null;m.action=null;m.lastVisible=s.month;
 if(event==='m11_start'){changeJob(s,id);if(plan12(s))m.step=1;done(s,24);return;}
 /*
  * ⚠⚠ **五张直线**（规则十二 · 阶段 3.3）——
  *   这三张原来是各自弧里的**某一步**，各有各的前因；
  *   现在它们**单独成卡** ⇒ 前因由这里就地补上（自足）。
  *
  * ⚠ **旧档 / 规则十一**不走这里（`plan12` 为假）⇒ 继续走原来的弧制，一字不改。
  */
 if(plan12(s)){
  if(event==='m11_work_2'){
   /* 承：立业 —— 管事把带新人的差事交给你；或你交清旧活，去药铺谋生。 */
   if(id==='lead'){m.stage=2;c(s).rank={yard:'外院管事',shop:'药铺熟手',farm:'田庄熟手',carrier:'商队领工'}[m.job];}
   if(id==='leave')changeJob(s,'shop');
   m.step=2;done(s,24);return;
  }
  if(event==='m11_family_1'){
   /* 转：一次意外（家事）—— 同住熟人问你要不要正式一起过日子。 */
   if(id==='marry'){const p=person(s,'worker');m.spouse={...p,id:'spouse',role:'伴侣',known:true};p.known=false;m.trust+=4;}
   m.step=3;done(s,24);return;
  }
  if(event==='m11_corpse_0'){
   /* 合：转机与代价 —— 河滩上那具修士尸身，取走还是报信。 */
   const truth=roll(s,'corpse-truth')%3;
   m.corpse={truth,origin:c(s).continent,found:s.month,taken:false,witness:false,sale:false,report:false,buried:false,trace:false,closed:false,warning:false};
   person(s,'boatman').known=true;person(s,'boatman').location=c(s).continent;
   if(id==='report')m.corpse.report=true;
   if(id==='bury'){m.corpse.buried=true;m.notes.push('corpse-mark');}
   if(id==='take'){m.corpse.taken=true;m.corpse.witness=true;cb.apply({items:['mortal_wood','mortal_sword']});}
   if(id==='leave')m.corpse.closed=true;
   m.step=4;done(s,24);return;
  }
 }
 if(event.startsWith('m11_life_')){
  if(id==='move'){changeJob(s,m.job==='shop'?'carrier':'shop');log(s,cb,'在镇上安顿新的活计','你交清旧雇主的差事，在'+s.player.home+'落脚。原来的工具和积下的工钱没有因此变成仙家资源。');}
  if(id==='steady'){m.stage=Math.min(2,m.stage+1);m.trust+=2;earn(s,12);}
  if(id==='family'&&m.spouse?.status==='alive'&&m.spouse.location===m.home)m.trust+=3;
  if(id==='speculate'){if(success)earn(s,48);else m.debt+=24;}
  done(s,42+roll(s,'life-gap:'+m.cycle)%19);return;
 }
 if(event==='m11_end'){cb.end(m.debt?'mundane_unpaid':m.spouse||m.child?'mundane_family':'mundane_craft');return;}
 const kind=m.arc?.kind;if(!kind||event!=='m11_'+kind+'_'+m.arc.stage)throw Error('凡俗故事阶段不对应');
 const step=m.arc.stage;
 if(kind==='siege'){
  if(step===0){m.notes.push('siege:'+id);const old=m.home;c(s).progression.sect.phase='camp';c(s).progression.sect.role=null;s.player.home=GEOGRAPHY.find(g=>g.id===old).places[0]+'撤离营地';c(s).spot=s.player.home;m.residence=old+':camp';for(const p of [m.spouse,m.child].filter(Boolean))if(p.status==='alive'&&p.location===old)p.location=m.residence;later(s,1,6);}
  else if(step===1){if(id==='store'){m.trust+=3;m.notes.push('camp-store');}if(id==='sell'){earn(s,36);m.notes.push('camp-sold');}later(s,2,12);}
  else {if(id==='stay'){m.job='yard';c(s).rank='营地粮房管事';m.stage=1;if(m.notes.includes('camp-sold')){m.debt+=36;m.trust-=3;log(s,cb,'掌事查出了多分的粮袋','掌事对照户数查出你多分的一袋粮，要求你赔三十六文，核粮时另派一人与你同行。公粮仍不归你支配。');}}else changeJob(s,'carrier');done(s,48);}return;
 }
 if(kind==='inheritance'){
  if(step===0){m.notes.push('inheritance:'+id);const receiver=s.life.family.members.find(p=>p.status==='alive');
   if(id==='send'){if(receiver&&route(s,c(s).continent,s.birth.continent))s.life.family.money+=12;else{earn(s,12);log(s,cb,'没有收物人的钱退回来了','商队未找到仍在世的原收物人，按约把十二文退回给你，没有把钱交给陌生人。');}}
   if(id==='take'&&receiver&&s.life.family.money>=24){earn(s,24);s.life.family.money-=24;m.notes.push('family-property-taken');}later(s,1,12);}
  else {if(id==='copy')m.notes.push('family-account-copy');done(s,42);}return;
 }
 if(kind==='route'){
  if(step===0){m.notes.push('route:'+id);later(s,1,12);}
  else {if(id==='honest'){earn(s,24);m.notes.push('known-route');}if(id==='double'){earn(s,48);m.notes.push('route-double-sold');}done(s,42);}return;
 }
 if(kind==='work'){
  if(step===0){m.notes.push(id==='reveal'?'cargo-evidence':id==='hide'?'cargo-hidden':'cargo-refused');later(s,1,1);}
  else if(step===1){if(id==='evidence'){m.trust+=4;m.stage=1;earn(s,18);}if(id==='blame'){m.trust-=4;earn(s,24);m.notes.push('worker-betrayed');}later(s,2,12);}
  else {if(id==='lead'){m.stage=2;c(s).rank={yard:'外院管事',shop:'药铺熟手',farm:'田庄熟手',carrier:'商队领工'}[m.job];}if(id==='leave')changeJob(s,'shop');done(s,36);}return;
 }
 if(kind==='shop'){
  if(step===0){m.notes.push('shop:'+id);if(id==='lease'){m.debt+=72;m.assets.push({name:'药铺租契',location:m.home,status:'kept'});}later(s,1,18);}
  else if(step===1){if(id==='deliver'){earn(s,48);m.trust+=2;}if(id==='fake'){earn(s,64);m.notes.push('false-medicine');}later(s,2,12);}
  else{if(id==='keep'){m.stage=2;c(s).rank=m.notes.includes('shop:lease')?'药铺掌柜':'药铺熟手';if(m.notes.includes('false-medicine')){m.debt+=48;m.trust-=4;log(s,cb,'药师把退药的账留下','药师比对货签确认你替换过草药，要求退赔四十八文，未验过的存药暂不得出售。你还要慢慢偿还这份旧账。');}}if(id==='sell'){earn(s,30);m.assets.forEach(p=>p.status='lost');changeJob(s,'carrier');}done(s,36);}return;
 }
 if(kind==='water'||kind==='levy'){
  if(step===0){m.notes.push(kind+':'+id);if(id==='borrow')m.debt+=48;if(id==='steal'){earn(s,36);m.notes.push('sluice-witness');}if(id==='inform'){earn(s,36);m.notes.push('neighbour-betrayed');}later(s,1,12);}
  else if(step===1){if(id==='move'){changeJob(s,'carrier');m.assets.forEach(a=>a.status='lost');}if(id==='petition'){m.local.tax=Math.max(0,m.local.tax-2);m.trust+=2;}later(s,2,12);}
  else {if(id==='repay'){const n=Math.min(m.money,24,m.debt);takeMoney(s,n);m.debt-=n;}if(id==='work'){earn(s,18);m.stage=Math.max(1,m.stage);}done(s,36);}return;
 }
 if(kind==='family'){
  if(step===0){if(id==='single'){done(s);return;}m.notes.push('courtship');later(s,1,12);}
  else if(step===1){if(id==='marry'){const p=person(s,'worker');m.spouse={...p,id:'spouse',role:'伴侣',known:true};p.known=false;m.trust+=4;later(s,2,24);}else done(s);}
  else {if(id==='child'&&m.spouse?.status==='alive'){m.child={id:'child',name:s.player.name[0]+personName(s,'healer').slice(1),role:'孩子',known:true,status:'alive',born:s.month,deathAt:s.month+84*12,location:m.home,tested:false,root:roll(s,'child-root')<35,admitted:false};log(s,cb,'家中多了一个孩子',m.spouse.name+'与你给孩子留出一张小床，取名'+m.child.name+'。粮钱里从此要另留一份抚养的开销。','people');}done(s,42);}return;
 }
 if(kind==='child'){
  if(step===0){m.notes.push('child-test:'+id);if(id==='wait'){done(s);return;}later(s,1,6);}
  else if(step===1){if(!m.child||m.child.status!=='alive'){done(s);return;}if(id==='send'&&m.child.root){m.child.admitted=true;m.child.role='在山门修炼的孩子';m.child.location=m.home+':sect';}later(s,2,36);}
  else {if(m.child?.status==='alive'&&id==='letter'){m.notes.push('child-address');log(s,cb,'孩子托接引弟子带回口信',m.child.name+'让接引处带话：'+(m.child.admitted?'还在练最基础的周天，尚不能自己御剑回家。':'在镇里做学徒，已经能核清自己的工钱。')+'你收好实际能送信的地址，没有把他的一次来信当作得道。','people');}done(s,36);}return;
 }
 if(kind==='visitor'){
  if(step===0){m.notes.push('visitor:'+id);if(id==='sell')earn(s,42);later(s,1,6);}
  else {if(id==='witness'){m.trust+=3;earn(s,12);}if(id==='help'){m.notes.push('refuge-contact');cb.apply({items:['mortal_charm']});}done(s,42);}return;
 }
 if(kind==='corpse'){
  const p=m.corpse;
  if(step===0){p.report=id==='report';p.buried=id==='bury';p.taken=id==='take';p.witness=p.taken;if(p.taken)cb.apply({items:['mortal_wood','mortal_sword']});if(p.buried)m.notes.push('corpse-mark');if(id==='leave'){p.closed=true;done(s);return;}later(s,1,12);}
  else if(step===1){p.sale=id==='sell';p.trace=p.taken&&(p.sale||id==='inspect');if(p.sale){s.inventory=s.inventory.filter(i=>i!=='mortal_sword');earn(s,32);}if(id==='return'){s.inventory=s.inventory.filter(i=>!['mortal_wood','mortal_sword'].includes(i));p.taken=false;p.trace=false;}if(!p.taken){if(p.report||p.buried){earn(s,18);m.notes.push('burial-witness');}p.closed=true;done(s);return;}later(s,2,18);}
  else if(step===2){p.warning=true;m.notes.push('corpse-warning:'+id);if(id==='hand'){s.inventory=s.inventory.filter(i=>!['mortal_wood','mortal_sword'].includes(i));p.taken=false;}if(id==='move'){m.notes.push('corpse-evacuated');const old=m.home;changeJob(s,'carrier');m.residence=old+':refuge';s.player.home=GEOGRAPHY.find(g=>g.id===old).places[0]+'城外驿房';for(const q of [m.spouse,m.child].filter(Boolean))if(q.status==='alive'&&q.location===old)q.location=m.residence;}if(id==='sell'){earn(s,64);m.notes.push('corpse-double-deal');}later(s,3,6);}
  else if(step===3){
   if(id==='stay'&&!success){const local=[m.spouse,m.child].filter(q=>q?.status==='alive'&&q.location===p.origin&&!m.notes.includes('corpse-evacuated'));for(const q of local){q.status='dead';q.deathAt=s.month;q.deathNotice=s.month||1;}s.player.health=Math.max(1,s.player.health-35);m.assets.filter(a=>a.location===p.origin).forEach(a=>a.status='lost');log(s,cb,'追查者闯进了旧住处',local.length?local.map(q=>q.name).join('、')+'没有逃出起火的院子。你从后门带伤离开，旧住处和留下的家业都毁了。':'旧住处被搜砸，你带伤从后门离开。住在别处的人没有因此被记作死者。','people');}
   if(id==='stay'&&!success&&p.truth===2&&roll(s,'corpse-last-escape')<25){cb.end('battle_lost');return;}
   if(id==='escape'||id==='charm'){
    const old=m.home;for(const q of [m.spouse,m.child].filter(Boolean))if(q.status==='alive'&&q.location===old)q.location=old+':refuge';
    m.residence=old+':refuge';m.notes.push('corpse-survivor');s.player.home=GEOGRAPHY.find(g=>g.id===old).places[0]+'城外驿房';
   }
   if(id==='testify'){m.notes.push('corpse-protected');s.player.home=GEOGRAPHY.find(g=>g.id===m.home).places[0]+'接待屋';}later(s,4,24);
  }else {if(id==='seek'){m.notes.push('corpse-proof-kept');}if(id==='settle'){changeJob(s,'shop');}p.closed=true;done(s,48);}return;
 }
 if(kind==='gift'){
  const g=m.gift;
  if(step===0){if(id==='decline'){g.stage='declined';done(s);return;}g.stage='verified';later(s,1,6);}
  else if(step===1){if(id==='leave'){g.stage='declined';done(s);return;}g.materials=true;g.stage='prepared';if(id==='labour')m.notes.push('gift-earned-materials');later(s,2,6);}
  else if(step===2){
   if(id==='pass'){g.stage='given-away';s.inventory=s.inventory.filter(i=>i!=='mortal_wood');done(s);return;}
   if(id==='decline'){g.stage='declined';done(s);return;}
   if(!g.materials||!s.inventory.includes('mortal_wood'))throw Error('植灵来源或材料不完整');
   s.inventory=s.inventory.filter(i=>i!=='mortal_wood');g.outcome=success?'changed':'failed';
   if(!success){g.stage='failed';s.player.health=Math.max(1,s.player.health-24);log(s,cb,'灵气没能在体内留下','药液用尽，残页上的引气法仍没能在经脉里留下灵气。医者让你停下，身体的旧伤需要慢慢养；这次材料已经耗尽。');done(s,48);return;}
   g.changed=true;g.stage='changed';g.terminal=s.player.health<35||years(s)>=85;s.player.root='五行杂灵根';c(s).story10.rootStatus='present';c(s).progress=0;later(s,3,6);
  }else {if(id==='learn'){g.stage='entered';cb.apply({realm:1});c(s).path='loose';c(s).rank='迟入道的散修';log(s,cb,'第一次把灵气留在掌心','你照着医者教的周天练了数月，掌心终于留住一点灵气。木剑仍是木剑，御剑和术法还得另外学；旧债与在世的家人没有随境界消失。');if(g.terminal){log(s,cb,'灯火向指间偏来','灯焰第一次向你的指间偏来，你看了很久。植灵后的身体已经衰弱到无法再承受修行，医者守在床边，没再让你尝试下一轮周天。');cb.end('mundane_glimmer');return;}c(s).network.methodDue=s.month+6;}done(s,36);}return;
 }
 throw Error('未知凡俗故事 '+kind);
}
export function validateMundane(s,fail){
 const m=mundane(s);if(!m||m.format!==1)fail('凡俗人生格式');
 const int=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
 for(const k of ['money','grain','debt','earned','spent','workMonths','next','quietAt','lastVisible','cycle','lastChoice'])if(!int(m[k]))fail('凡俗钱粮与时钟');
 if(m.money!==24*(m.started?1:0)+m.earned-m.spent)fail('凡俗钱粮不守恒');
 if(m.job!==null&&!JOBS[m.job]||!GEOGRAPHY.some(g=>g.id===m.home)||m.cycle>12||m.stage<0||m.stage>2)fail('凡俗活计');
 if(!Array.isArray(m.done)||new Set(m.done).size!==m.done.length||m.done.some(id=>!['work','shop','water','levy','family','child','corpse','gift','visitor','siege','route','inheritance'].includes(id)))fail('凡俗故事记录');
 if(!Array.isArray(m.notes)||m.notes.length>100||!Array.isArray(m.daily)||m.daily.length>16)fail('凡俗证据');
 if(!Array.isArray(m.lifeOrder)||m.lifeOrder.length!==12||new Set(m.lifeOrder).size!==12||m.lifeOrder.some(i=>!Number.isInteger(i)||i<0||i>11))fail('人生选择次序');
 if(!Array.isArray(m.people)||m.people.length!==4||new Set(m.people.map(p=>p.name)).size!==4)fail('凡俗人物');
 for(const p of [...m.people,m.spouse,m.child].filter(Boolean))if(!['alive','dead','missing'].includes(p.status)||!Number.isSafeInteger(p.born)||!int(p.deathAt)||p.born>s.month||typeof p.name!=='string'||p.name.length>16||typeof p.location!=='string')fail('凡俗人物生平');
 if(m.child&&!m.spouse)fail('孩子没有家庭前因');
 if(m.arc&&(!m.done.includes(m.arc.kind)||!int(m.arc.due)||!Number.isSafeInteger(m.arc.stage)||m.arc.stage<0||m.arc.stage>4||!GEOGRAPHY.some(g=>g.id===m.arc.location)))fail('凡俗长事件');
 if(s.pending?.event.startsWith('m11_')&&!['m11_start','m11_end'].includes(s.pending.event)&&!s.pending.event.startsWith('m11_life_')&&!(plan12(s)&&MUNDANE_KEPT.includes(s.pending.event))&&(!m.arc||s.pending.event!=='m11_'+m.arc.kind+'_'+m.arc.stage))fail('凡俗待选与故事不对应');
 /* ⚠ 五张直线的进度（规则十二的新人生才有；旧版本 / 旧档没有这个字段）。 */
 if(m.step!==undefined&&(!Number.isSafeInteger(m.step)||m.step<0||m.step>MUNDANE_KEPT.length))fail('凡俗进度');
 if(m.action&&(!int(m.action.from)||m.action.from>s.month||!s.journey&&!s.pending))fail('凡俗未完成行为');
 if(m.gift?.changed&&(!m.gift.materials||m.gift.source!=='river-remains'||!m.corpse||m.gift.relicFound!==m.corpse.found||!['changed','entered'].includes(m.gift.stage)))fail('植灵没有真实来源');
 if(m.gift&&!['offered','verified','prepared','declined','failed','given-away','changed','entered'].includes(m.gift.stage))fail('植灵阶段');
 if(m.corpse&&(!int(m.corpse.found)||m.corpse.found>s.month||![0,1,2].includes(m.corpse.truth)))fail('遗物来历');
 if(!m.local||!int(m.local.until)||!int(m.local.tax)||!Array.isArray(m.local.history)||m.local.history.length>3)fail('地方变局');
}
