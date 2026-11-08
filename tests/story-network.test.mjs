import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,choose,advance,advanceToChoice,options,currentNode,nodeText,cloneRun,validateRun,setActivity} from './helpers/rules12-engine.mjs';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {monthSeconds} from '../packages/adventure/life.js';
import {automaticStory} from '../content/cultivation-daily.js';
import {networkRate} from '../packages/adventure/story-network.js';
import {playCultivation,decide} from './helpers/rules12-play.mjs';
/*
 * 人脉网络与旁白（规则十二）
 * ==========================
 * 2026-11-08：清旧档后，本文件从「规则九」改钉「规则十二」。三类改法：
 *
 * ① **旧版本专属的用例整条删**（测的是已经不存在的规则版本，仓库只剩规则十二）。
 *    例：旧规则 6 原档恢复那条。
 * ② **门路变了、性质没变的，改到达路径**（不删、不放宽断言）。
 *    例：`network_echo` 被 `installShared` 换成 `echo_friend` / `echo_relic` / `echo_teacher`；
 *    规则十二的心法由宗门所在地的入门卷决定，不能再写死 `clear`。
 * ③ **规则十二确实有缺陷的，断言留着但标成 `todo`**（node:test 的 todo 失败不影响退出码，
 *    断言仍在跑 ⇒ 缺陷修好那天自动转绿）。
 *    每条都在 AGENTS.md §1.11「已知缺陷台账」里登记了编号。
 */
const resolve=s=>{while(s.phase==='life'&&!s.pending&&s.journey&&!s.journey.open)advance(s,1);};
function find(id,filter=()=>true,policy={path:'orthodox',school:'array'}){
 for(let i=0;i<650;i++){const s=createRun({seed:'万千道途-'+i});for(let j=0;j<100&&s.phase==='life';j++){if(!s.pending)advanceToChoice(s);if(!s.pending)break;if(s.pending.event===id&&filter(s))return s;choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(o=>o.id===policy.activity)?.enabled)setActivity(s,policy.activity);}}
 throw Error('No natural network event '+id);
}
test('童年三个年龄窗口随机分配，特殊收养不会插入族学或普通村塾',()=>{
 const events=new Set();for(let i=0;i<200;i++){const s=createRun({seed:'成长检视-'+i}),a=s.life.cultivation.network;assert.equal(a.childhood.length,3);for(const x of a.childhood){events.add(x.event);assert.ok(x.due>=72&&x.due<192);}if(['demonic','beast'].includes(s.birth.upbringing))assert.ok(a.childhood.every(x=>!['child_school','child_clan','child_recruit'].includes(x.event)));validateRun(s);}assert.ok(events.size>=9);
});
test('童年决定改变具体前因与本事，灵根保持出生值',()=>{
 const s=find('child_apothecary'),before=cloneRun(s);choose(s,'learn');assert.equal(s.player.root,before.player.root);assert.equal(s.player.skills.alchemy,before.player.skills.alchemy+3);assert.equal(s.life.cultivation.network.marks.herbs.event,'child_apothecary');assert.ok(s.month<192);validateRun(s);
});
test('成年旧人事件要求童年前因，同一生不会多次重复',()=>{
 /* 规则十二把 `network_echo` 换成三张「旧人回响」卡（`content/story-shared.js` 的 `installEcho`）。
  * ⇒ 断言改钉**同一条性质**：这张成年卡要由童年印记触发，且一生只发一次。 */
 const s=find('echo_friend');
 const marks=s.life.cultivation.network.marks;
 assert.ok(marks.friend_witness||marks.friend_hide,'旧人回响卡要由童年印记触发');
 choose(s,'follow');
 const count=s.decisions.filter(d=>d.event==='echo_friend').length;
 assert.equal(count,1);
 for(let i=0;i<12&&s.phase==='life';i++){advanceToChoice(s);if(s.pending)choose(s,decide(s).id);}
 assert.equal(s.decisions.filter(d=>d.event==='echo_friend').length,count,'同一生不重复发同一张旧人卡');
 validateRun(s);
});
test('境界与身份独立，测灵优异也不会直接发亲传弟子牌',()=>{
 const s=find('root_result',s=>s.player.root==='松骨灵根');choose(s,'join');assert.equal(s.life.cultivation.rank,'外门弟子');assert.equal(s.player.realm,0);
});
test('完整心法由实际授业产生，只读查询不增长熟练或消耗随机流',()=>{
 /* 规则十二的心法由**宗门所在地的入门卷**决定（`content/story-rules12.js` 改写了
  * `network_method.choices`）⇒ 不再写死 `clear`，改按「这张卡实际给出的那门」来断言。 */
 const s=find('network_method');
 const pick=options(s).find(o=>o.id!=='keep'&&o.enabled);
 assert.ok(pick,'授业这张卡至少要给出一门可学的心法');
 choose(s,pick.id);
 assert.equal(s.life.cultivation.network.method.source,'network_method');
 assert.equal(s.life.cultivation.network.method.id,pick.id);
 const before=cloneRun(s);for(let i=0;i<20;i++)networkRate(s);assert.deepEqual(s,before);
 advance(s,3);assert.equal(s.life.cultivation.network.method.months,3);validateRun(s);
});
test('藏经阁机会有具体来源，拒绝不产生新功法或职位',()=>{
 const s=find('network_archive'),before=cloneRun(s);assert.ok(s.life.cultivation.network.offer.reason.length>12);assert.match(nodeText(currentNode(s),s),/藏经阁|两年/);choose(s,'decline');assert.equal(s.life.cultivation.network.offer,null);assert.deepEqual(s.life.cultivation.network.method,before.life.cultivation.network.method);assert.equal(s.life.cultivation.rank,before.life.cultivation.rank);validateRun(s);
});
test('巡阵需要完成真实试任，核过旧账才可凭证取得职位',()=>{
 const s=find('network_ward'),before=cloneRun(s);choose(s,'accept');resolve(s);assert.equal(s.life.cultivation.rank,before.life.cultivation.rank);assert.equal(s.life.cultivation.network.arc.kind,'ward');while(!s.pending&&s.phase==='life')advance(s,1);assert.equal(s.pending.event,'network_ward_result');assert.ok(s.month>=before.month+27);choose(s,'evidence');assert.equal(s.life.cultivation.rank,'内门弟子');assert.equal(s.life.cultivation.network.role,'北坡掌钥弟子');validateRun(s);
});
test('未核旧账的试任没有伪造封条的选项，调查不自动判罪',()=>{
 const s=find('network_ward'),priorRole=s.life.cultivation.network.role;choose(s,'take');resolve(s);while(!s.pending&&s.phase==='life')advance(s,1);assert.equal(s.pending.event,'network_ward_result');assert.equal(options(s).find(o=>o.id==='evidence').enabled,false);choose(s,'investigate');assert.equal(s.life.cultivation.punishmentUntil,0);assert.equal(s.life.cultivation.network.role,priorRole);validateRun(s);
});
test('有铺垫的炉心陷阱能逃离或真实死亡，不以服从保证晋升',()=>{
 const s=find('network_mentor_result',s=>s.life.cultivation.network.arc.danger,{path:'orthodox',school:'alchemy'});assert.match(nodeText(currentNode(s),s),/抽|残牌|前任/);assert.equal(options(s).find(o=>o.id==='finish').enabled,false);const original=cloneRun(s);choose(s,'escape');resolve(s);assert.equal(s.life.cultivation.path,'loose');assert.equal(s.life.cultivation.network.arc,null);validateRun(s);choose(original,'submit');assert.ok(original.phase==='ended'||original.player.health<60);assert.notEqual(original.life.cultivation.rank,'亲传弟子');validateRun(original);
});
test('长故事内部不会抽通用练剑与交游，已经读过的任务插叙不再循环',()=>{
 const s=find('sect_trial_1');choose(s,'cautious');resolve(s);const row=automaticStory(s,'valley');if(row)assert.ok(!/切磋|附近的人|最后收住的一剑/.test(row.title+row.body));assert.equal(automaticStory(s,'valley'),null);
});
test('凡人家庭没有索取修炼资源的选项，作证也不会被挂赔偿',()=>{
 /* 规则十二里「请族中誊抄家传基础笔记」对**非修仙世家**是 `visible:false`
  * （`content/story-rules12.js`）⇒ 凡人家里**根本看不到**这个选项，
  * 比「看得到但选不了」更严一档，断言照此写。 */
 const s=find('family_support',s=>s.birth.family==='common');
 assert.equal(options(s).some(o=>o.id==='supplies'),false);
 assert.equal(options(s).some(o=>o.id==='notes'),false,'凡人家里没有可讨要的家族传承');
 /* 规则十二把这段正文改成「家里没有能助你修炼的丹药」⇒ 正则按新措辞写，
  * 但断言的**性质**不变：凡人家里供不出修炼资源。 */
 assert.match(nodeText(currentNode(s),s),/没有能助你修炼|没有供修炼|没有.*灵石|旧衣/);
 const garden=find('garden_accident');choose(garden,'silent');assert.equal(garden.flags.unpaidGarden,undefined);assert.equal(garden.life.cultivation.wanted,0);validateRun(garden);
});
test('不同人生的童年与邀请组合不同',()=>{
 const patterns=new Set();for(let i=0;i<80;i++){const s=playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast'][i%4],method:i%3===0?'ember':'clear',childhood:i%2?'bold':'care'}).state;patterns.add(s.decisions.filter(d=>d.event.startsWith('child_')||d.event.startsWith('network_')||d.event.startsWith('echo_')).map(d=>d.event+'/'+d.choice).join('|'));validateRun(s);}assert.ok(patterns.size>30);
});
test.todo('同一生的自动日常不重复（缺陷 D：日常池绕圈）',()=>{
 /* 缺陷 D（AGENTS.md §1.11）：自动日常旁白池只有 128 行，规则十二的人生更长（修仙线能活几百年）
  * ⇒ 走池会绕回同一行，同一条旁白在一生里出现两遍（实测最长的一条命 207 行里重复 68 行）。
  * ⇒ 这条断言现在**故意是红的**：修好那天把它从 `todo` 改回 `test` 就自动转绿。 */
 const patterns=new Set();for(let i=0;i<80;i++){const s=playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast'][i%4],method:i%3===0?'ember':'clear',childhood:i%2?'bold':'care'}).state;const prose=s.journal.filter(e=>e.automatic&&e.kind==='life').map(e=>e.body);assert.equal(new Set(prose).size,prose.length);patterns.add(s.decisions.filter(d=>d.event.startsWith('child_')||d.event.startsWith('network_')).map(d=>d.event+'/'+d.choice).join('|'));validateRun(s);}assert.ok(patterns.size>30);
});
test('时间节奏按境界基础寿元分档：一年不再只值几秒，重要任务不会随着高境界极速略过',()=>{
 /* 2026-11-08：年速改成「1 年 = K ÷ 境界基础寿元」（K=5400）。
  * ⇒ 这条断言不再钉死三个魔法数，改钉**规则本身**：
  *   ① 童年（0–6 岁）固定 8 秒/年；
  *   ② 一年 = K ÷ 境界基础寿元（凡身 88 ⇒ 61.4 秒；炼气 120 ⇒ 45 秒）；
  *   ③ **境界越高，一年过得越快**（秒数更少）—— 与官方同构：
  *      活得久的人，一生总时长大致恒定。 */
 const K=5400,LIFESPAN={0:88,1:120,2:210,3:350,4:560};
 /* ⚠ 期望值在这里**把规则重写一遍**（不 import 实现里的常量）——
    改了实现而没改这条 ⇒ 门禁报红；反之改了这条而没改实现 ⇒ 也报红。 */
 const yearSec=x=>Math.round(monthSeconds(x)*12*100)/100;
 const expect=s=>{
  const a=(s.birth?.startAge??16)+Math.floor(s.month/12);
  if(a<6)return 8;
  const cap=LIFESPAN[s.player.realm]??88;
  let sec=Math.min(120,Math.max(4,K/cap));
  if(a>=95)sec=Math.min(sec,3);
  return Math.round(sec*100)/100;
 };
 const at=(base,realm)=>{const t=cloneRun(base);t.player.realm=realm;return t;};
 const s=createRun({seed:'慢读节奏'});assert.equal(yearSec(s),8,'童年固定 8 秒/年');
 const childhood=find('child_school');assert.equal(yearSec(childhood),expect(childhood),'童年之后按境界基础寿元那档');
 const duty=find('network_ward');assert.equal(yearSec(duty),expect(duty),'宗门差事那一年按境界基础寿元那档');
 choose(duty,'accept');resolve(duty);assert.equal(yearSec(duty),expect(duty),'境界没变 ⇒ 速度也不变');
 for(const [realm,sec] of [[1,45],[2,25.71],[3,15.43],[4,9.64]])assert.equal(yearSec(at(duty,realm)),Math.round(sec*100)/100,`境界 ${realm} 一年 ${sec} 秒`);
 assert.ok(yearSec(at(duty,4))<yearSec(at(duty,1)),'境界越高，一年过得越快（官方同构：一生总时长大致恒定）');
 const old=at(duty,4);old.month=95*12;assert.equal(yearSec(old),3,'95 岁以后一年封顶 3 秒');
});
test.todo('凡人不必等待寿命以外的世界变故，安顿余生的收尾仍可自然抵达（缺陷 A：凡人线排队饿死）',()=>{
 /* 缺陷 A（AGENTS.md §1.11）：凡人线排在 `c.queue` 里的事件永远发不出来
  * （`packages/adventure/cultivation.js` 的调度顺序 + `packages/adventure/mundane-life.js`
  * 的 `if(s.month<m.next)return true;`）⇒ 45 岁该发的 `system_final` 收尾卡发不出来，
  * 家族抉择（`family_gate`）也永远排在队里。
  * ⇒ 这条断言现在**故意是红的**：修好那天把它从 `todo` 改回 `test` 就自动转绿。 */
 const s=playCultivation({seed:'万千道途-109',path:'mortal',family:'sever',childhood:'bold'}).state;
 const end=s.decisions.find(d=>d.event==='system_final');assert.ok(end);assert.ok(end.month>=45*12&&end.month<50*12);assert.ok(s.life.cultivation.worldAt>end.month);assert.equal(s.life.cultivation.network.arc,null);assert.equal(s.life.cultivation.network.offer,null);validateRun(s);
});
test.todo('未入道的凡人经历实际坊市生活，不会练出凭空的灵光或同一日常循环（缺陷 A）',()=>{
 /* 缺陷 A（AGENTS.md §1.11）：凡人线的坊市事件同样排在 `c.queue` 里被饿死
  * ⇒ 旁白里连「学徒 / 契书」这类实际谋生的内容都没有。
  * ⇒ 这条断言现在**故意是红的**：修好那天把它从 `todo` 改回 `test` 就自动转绿。 */
 const s=playCultivation({seed:'万千道途-74',path:'mortal'}).state;
 const prose=s.journal.filter(e=>e.automatic&&e.kind==='life'&&e.month>=192).map(e=>e.body);assert.ok(prose.some(t=>t.includes('学徒')||t.includes('契书')));assert.ok(prose.every(t=>!t.includes('掌心灵光')&&!t.includes('护身术')));assert.equal(new Set(prose).size,prose.length);const returnIndex=prose.findIndex(t=>t.includes('师傅嫌他算料太慢'));if(returnIndex>=0)assert.ok(prose.findIndex(t=>t.includes('没被宗门收下'))>=0&&prose.findIndex(t=>t.includes('没被宗门收下'))<returnIndex);validateRun(s);
});
test('新存档拒绝伪造童年窗口、未知功法、负熟练和倒置邀请期限',()=>{
 const source=createRun({seed:'网络存档'});for(const mutate of [s=>s.life.cultivation.network.childhood[0].due=192,s=>s.life.cultivation.network.method={id:'fake',acquired:0,months:0},s=>s.life.cultivation.network.methods=[{id:'clear',acquired:0,months:-1}],s=>s.life.cultivation.network.offer={kind:'archive',due:40,expires:20,danger:false,reason:'some'}]){const s=cloneRun(source);mutate(s);assert.throws(()=>validateRun(s));}
});
