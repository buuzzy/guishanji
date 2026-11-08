import {ROOTS,GEOGRAPHY} from '../../content/cultivation-world.js';
import {METHODS} from '../../content/story-network.js';
import {random} from '../core/random.js';
import {canCultivate} from './story-shared.js';
const enabled=s=>!!s.life?.cultivation;
const state=s=>s.life.cultivation.revision9;
const age=s=>(s.birth.startAge||0)+Math.floor(s.month/12);
function followReachable(s,f){
 if(!f.origin)return true;
 const c=s.life.cultivation,todo=[[f.origin]],seen=new Set([f.origin]);
 while(todo.length){const route=todo.shift(),at=route.at(-1);
  if(at===c.continent)return s.month>=f.due+(route.length-1)*18;
  for(const next of GEOGRAPHY.find(g=>g.id===at).connections)if(!seen.has(next)&&!c.closed.includes([at,next].sort().join('-'))){seen.add(next);todo.push([...route,next]);}
 }
 return false;
}
const record=(s,cb,title,body)=>cb.log({kind:'institution',title,body,automatic:true,location:s.player.location,context:s.life.cultivation.context||'home'});
export function initializeRevision9(s){
 s.player.stones=s.birth.family==='clan'?4:0;
 s.autoPolicy={enabled:false,cursor:0};
 stateInit(s);
}
function stateInit(s){s.life.cultivation.revision9={format:1,membership:{path:'mortal',borrowed:false,departures:[]},returnForOath:false,exchange:null,follow:null,arc:null,arcStarted:0,arcNotes:0,hardshipChecked:false,hardship:'none',hardshipPath:null,returnChecked:false,lodging:null};}
function learn(s,id,months,source){
 const c=s.life.cultivation,a=c.network;
 if(a.method){const prior=a.methods.findLast(m=>m.id===a.method.id);if(prior)prior.months=a.method.months;}
 const learned={id,acquired:s.month,months,source};a.methods.push({...learned});a.method={...learned};state(s).methodFinishedAt=s.month;
}
function leaveLodging(s){const r=state(s);if(r.lodging){s.player.home=r.lodging.home;s.life.cultivation.spot=r.lodging.spot;r.lodging=null;}}
export function revisionChoice(s,raw,event){
 if(!enabled(s)||!raw)return raw;
 const c=s.life.cultivation,r=state(s),out={...raw};
 if(['dark_oath','dark_oath_return'].includes(event)){
  const borrowed=r.membership.borrowed&&r.membership.path!=='demonic';
  if(raw.id==='join'&&borrowed){out.available=()=>false;out.reason='借来的卷册还未交还；可以先辞师，或选择带卷私离';}
  if(['release','secret_join'].includes(raw.id)){out.available=()=>borrowed;out.reason='没有尚未交还的旧师门借卷';}
 }
 if(event==='departure_terms'&&raw.id==='settle'){
  out.cost=r.membership.borrowed?{stones:2}:{};
  out.effects={...(out.effects||{}),remove:['borrowed_volume']};
  if(!r.membership.borrowed){out.hint='没有尚未归还的借卷与药材钱，向管事说明离去便可。';out.reply='管事核过你没有未清的借用，把离去的口信写给接待弟子。';}
 }
 if(event==='thin_root_return'&&raw.id==='learn'&&s.inventory.includes('thin_root_pill')){
  out.cost={items:['thin_root_pill']};out.hint='将洗脉丹交给药师配药，花一年慢慢养脉，不能直接吞服。';out.reply='药师把洗脉丹配进解火的药汤，你与矿友练了一年调息。丹药已经用尽，火毒伤过的经脉逐渐恢复。';
 }
 if(/^selection_\d_result$/.test(event)&&raw.id==='cheat'){
  const skill=c.exam?.skill||s.player.focus;
  const variants={
   sword:['exam_sword_charm','趁换剑，催动藏好的借力剑符','剑台禁用外力；借符催剑会在木剑上留下别人的灵息。','剑堂教习按住你的木剑，找出剑柄下的借力符。'],
   alchemy:['exam_powder','趁添火，撒入藏好的辨药散','药散能改变药渣颜色；监考丹师会检查混入的药粉。','丹师从药渣里辨出混入的辨药散，叫你摊开手中的药袋。'],
   array:['exam_array_copy','藏着底图，照抄别人画好的阵眼','底图没有核过；教习会比对各人的错接符纹。','阵堂教习将两张底图并排，指出你照抄了同一处错接符纹。'],
  },v=variants[skill];
  out.label=v[1];out.hint=v[2];out.requires={items:[v[0]]};out.cost={items:[v[0]]};
  out.reply=v[3]+' 执法弟子废了你的本届成绩，封住法力，将你押进思过洞一年。';
 }
 return out;
}
export function revisionAction(s,event,id,success,cb){
 if(!enabled(s))return;
 const c=s.life.cultivation,r=state(s);
 if(/^selection_\d$/.test(event)&&c.exam){
  const skill=c.exam.skill,item={sword:'exam_sword_charm',alchemy:'exam_powder',array:'exam_array_copy'}[skill];
  // Only some sittings bring an opportunity; the material is really acquired.
  if(random(s,'events')<.34&&!s.inventory.includes(item)){
   cb.apply({items:[item]});record(s,cb,'散场前有人塞来一件东西',({sword:'旁边的报名者把借力剑符塞进你的剑袋，低声说能替你多撑两招。',alchemy:'同桌的报名者将辨药散放在你的药袋旁，说撒进药渣便能改色。',array:'有人将一张旧底图推到你的卷轴下面，说教习今年还会考这道阵。'})[skill]+' 你收下后还没有使用。');
  }
 }
 if(event==='dark_ledger_1'&&id==='cautious'&&success){
  r.exchange={month:s.month,with:'顾魇',book:'shadow_manual',concealed:true};r.follow={event:'manual_study',due:s.month+3};
 }
 if(event==='manual_study'){
  r.follow=null;
  if(id!=='keep'&&success){
   learn(s,'shadow',id==='gentle'?12:18,event);
   record(s,cb,'新心法的周天已经练过',id==='gentle'?'你把草药篇的行气路线写进日课，旧口诀另存为笔记。摄血篇还封着。':'你将兽血的剂量与逆气的征兆记进书边，不再照着书页盲目加量。');
  }
 }
 if(event==='dark_oath'&&id==='release')r.returnForOath=true;
 if(['dark_oath','dark_oath_return'].includes(event)&&id==='leave')r.returnForOath=false;
 if(event==='departure_terms'&&id==='stay')r.returnForOath=false;
 if(r.membership.path!==c.path){
  const previous={...r.membership};r.membership.departures.push({path:previous.path,month:s.month,settled:event==='departure_terms'&&id==='settle'});
  r.membership.path=c.path;r.membership.borrowed=canCultivate(s)&&['orthodox','demonic'].includes(c.path);
  if(r.membership.borrowed){cb.apply({items:['borrowed_volume']});record(s,cb,'授业前借出的卷册','授业弟子将一卷基础口诀交到你手里，留下一枚借阅签。你可抄自己的笔记，原卷离宗时须交还。');}
  if(c.path==='loose'&&r.returnForOath&&event==='departure_terms'&&id==='settle'){r.returnForOath=false;r.follow={event:'dark_oath_return',due:s.month+3};c.inquiry='demonic';}
 }
 if(event==='thin_root_offer'){
  r.hardshipPath=c.path;
  if(id==='keep'){r.hardship='patient';r.returnChecked=true;}
  else {r.arc=id==='mine'?'mine':'price';r.arcStarted=s.month;r.arcNotes=0;r.hardship=r.arc;c.context=id==='mine'?'work':'cavern';r.lodging={home:s.player.home,spot:c.spot};s.player.home=c.spot=id==='mine'?'地火矿守夜棚':'荒庙的侧殿';r.follow={event:id==='mine'?'thin_root_mine':'thin_root_price',due:s.month+(id==='mine'?24:3)};}
 }
 if(event==='thin_root_mine'){
  leaveLodging(s);
  r.arc=null;c.context=null;r.follow=id==='rob'?null:{event:'thin_root_return',due:s.month+48};r.returnChecked=id==='rob';r.hardship=id==='rob'?'robbed':id==='finish'&&success?'completed':'escaped';
 }
 if(event==='thin_root_price'){
  r.arc=null;c.context=null;r.follow=null;r.hardship=id==='accept'&&success?'blood':id==='rescue'&&success?'rescued':'refused';
  if(id==='accept'&&success){r.lodging=null;s.player.home=c.spot='荒庙的侧殿';c.teacher='游方修士';r.membership.borrowed=false;cb.apply({items:['blood_manual'],remove:['borrowed_volume']});learn(s,'blood',24,event);r.follow={event:'thin_root_hunt',due:s.month+36};c.progress=Math.min(1000,c.progress+60);record(s,cb,'荒庙的禁术留下了痕迹','你能借气血聚起灵力，掌心却常有寒意。寻人的修士在附近打听，原先的杂灵根仍在。');}
  else leaveLodging(s);
 }
 if(event==='thin_root_hunt')r.follow=null;
 /* T5 · 摄血经有了出口：它是一本**看过的书**，看过之后要么烧掉，要么带走。
  * ⚠ **只改当前版本（规则十二）** —— 旧档（5–11）的执行器一个字节都不许动。 */
 if(event==='thin_root_hunt'&&s.inventory.includes('blood_manual')){
  cb.apply({remove:['blood_manual']});
  record(s,cb,'摄血经不在你手上了',id==='fight'?'你把摄血经摊在灯下照着催动，念到一半时纸页已经被血浸透。你把剩下那几页丢进火里，看着它们卷起来发黑。':id==='escape'?'你把摄血经卷起来塞进袖子。逃命时带不走别的东西 —— 这本也算一个，只是它换不来第二条命。':'你把摄血经交了出来，连同取血的器皿。登记的人一页页翻过，问你从哪一页开始学的。你说了实话。');
 }
 if(event==='thin_root_return'){r.follow=null;r.returnChecked=true;}
 if(event==='world_raid'&&id!=='defend'&&r.arc){r.arc=null;r.follow=null;r.lodging=null;c.context=null;r.hardship='escaped';record(s,cb,'差事与旧约留在战乱后','你离开了原来的差事，没有领到尚未交付的报酬。旧约未完，眼前先要找一个能落脚的地方。');}
 if(r.follow&&!r.follow.origin)r.follow.origin=c.continent;
}
export function revisionMonth(s,cb){
 if(!enabled(s))return false;
 const c=s.life.cultivation,r=state(s),free=s.journey?.open&&!s.pending&&!c.detained&&s.month>=c.punishmentUntil;
 if(!free)return false;
 if(r.follow&&s.month>=r.follow.due&&followReachable(s,r.follow)&&!c.activeChain&&(!c.inquiry||r.follow.event==='dark_oath_return')){
  const event=r.follow.event;r.follow=null;cb.arrive(event);return true;
 }
 if(r.arc){
  if(r.arc==='mine'&&r.arcNotes<2&&s.month-r.arcStarted>=(r.arcNotes+1)*10){const notes=[['守夜队里少了一盏灯','夜里巡井，你发现最深的灯熄了。老矿工让你先拉回绳上的人，再换阵石。你们直到天亮才把一名昏过去的弟子抬上来，矿头却只在工簿上画了一道横线。'],['矿友把干净的水留给你','同队弟子发现你咳嗽，将剩下的净水推过来。他自己也受着火毒，仍说换岗时替你多守一刻。你们约好，离开矿口那天一起走，不把谁留在井下。']];const n=notes[r.arcNotes++];record(s,cb,n[0],n[1]);}
  return true;
 }
 /*
  * ⚠⚠ **规则十二：灵根薄那条支线挪到 27 岁以后**（2026-11-08 · 炼气期收束）。
  *
  * 「灵根薄 ⇒ 被矿上拉去挖矿」是一整条 5 张卡的支线
  * （thin_root_offer / mine / price / return / hunt）。
  * 实测它占前期提问的 5% ⇒ 炼气期只留主线，这条挪到后面再开。
  *
  * ⚠⚠ **为什么按「岁数」推迟，而不是按「境界」**：
  *   先前写成「筑基以后才开」（`realm >= 2`）⇒ 一辈子没筑基的命**永远遇不到**
  *   ⇒ 那 5 张卡变成**永不触发的死卡** ⇒ 发霉率从 173 涨到 183（门禁报红）。
  *   ⇒ 改成「**27 岁以后**」（与童年回响同一个界）⇒ 炼气期一样不打扰，
  *     而绝大多数命仍能遇到这条线 ⇒ 卡不会白死。
  *
  * ⚠ **只对当前版本（规则十二）生效** —— 规则 9 / 10 / 11 的执行器一个字节都不动。
  */
 const hardshipAge=27;
 if(canCultivate(s)&&age(s)>=hardshipAge&&age(s)<=55&&!r.hardshipChecked&&c.admissionDone&&ROOTS[s.player.root].grade<=0&&s.player.realm<=1&&!c.activeChain&&!c.inquiry&&s.month-c.entered>=60){
  /* ⚠ 闸检查**在置标记之前** —— 被拦就当这个月没这回事，下个月还会再抽一次。 */
  if(!cb.gate('thin_root_offer'))return false;
  /*
   * ⚠ 炼气期节拍：没到间隔就下个月再试。
   *   ⚠ `hardshipChecked` **不置** —— 置了就等于「已经查过了」，这条机会就永远没了。
   *   ⚠⚠ 返回值必须还是 true —— 「本月不抽随机卡」这件事不能变（`random` 是流式的）。
   */
  r.hardshipChecked=true;
  if(random(s,'events')<.8){cb.arrive('thin_root_offer');return true;}
 }
 return false;
}
export function validateRevision9(s,fail){
 if(!enabled(s))return;
 const r=state(s);if(!r||r.format!==1||!r.membership||!['mortal','orthodox','demonic','loose','beast'].includes(r.membership.path)||typeof r.membership.borrowed!=='boolean'||!Array.isArray(r.membership.departures)||r.membership.departures.length>24)fail('师承借阅记录');
 if(!s.autoPolicy||typeof s.autoPolicy.enabled!=='boolean'||!Number.isSafeInteger(s.autoPolicy.cursor)||s.autoPolicy.cursor<0||s.autoPolicy.cursor>1000)fail('自动抉择记录');
 const month=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.month;
 if(r.membership.departures.some(d=>!['mortal','orthodox','demonic','loose','beast'].includes(d.path)||!month(d.month)||typeof d.settled!=='boolean'))fail('离宗履历');
 if(!month(r.arcStarted)||!Number.isSafeInteger(r.arcNotes)||r.arcNotes<0||r.arcNotes>2||r.methodFinishedAt!==undefined&&!month(r.methodFinishedAt))fail('修炼与矿役年月');
 if(r.follow?.origin&&!GEOGRAPHY.some(g=>g.id===r.follow.origin))fail('后续消息来源');
 if(r.lodging&&(!['home','spot'].every(k=>typeof r.lodging[k]==='string'&&r.lodging[k].length<=60)))fail('临时住处');
 if(typeof r.hardshipChecked!=='boolean'||typeof r.returnChecked!=='boolean'||typeof r.returnForOath!=='boolean'||!['none','patient','mine','price','completed','escaped','robbed','blood','rescued','refused'].includes(r.hardship)||r.arc!==null&&!['mine','price'].includes(r.arc))fail('杂灵根困境');
 if(r.follow&&(!['manual_study','dark_oath_return','thin_root_mine','thin_root_price','thin_root_return','thin_root_hunt'].includes(r.follow.event)||!Number.isSafeInteger(r.follow.due)||r.follow.due<0||r.follow.due>13000))fail('困境与功法后续');
 if(r.exchange&&(r.exchange.book!=='shadow_manual'||r.exchange.concealed!==true||!Number.isSafeInteger(r.exchange.month)||r.exchange.month>s.month))fail('功法交换记录');
}
export function revisionProse(text){return String(text).replace('灵根适配影响积累效率，熟悉周天仍需日常练习。','你把每日要练的周天圈在书页边。').replace('这是改换生活和修炼办法，不是白得一副妖身。','她让你先住在族人的石穴旁，伤病与猎杀都得亲自面对。');}
METHODS.shadow={name:'幽灯养脉诀',root:['水','木','金','火','土'],detail:'经全卷核对后练过的新周天，以草药护脉或兽血试练；摄血章节仍有伤人风险。',rate:1.16};
METHODS.blood={name:'摄血经',root:['水','木','金','火','土'],detail:'跟游方修士练过两年的取血法门，以伤人代价聚气；不能改变原有灵根。',rate:1.2};
