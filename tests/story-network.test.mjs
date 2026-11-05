import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,currentNode,nodeText,cloneRun,validateRun,upgradeRun,setActivity} from './helpers/rules9-engine.mjs';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {monthSeconds} from '../packages/adventure/life.js';
import {automaticStory} from '../content/cultivation-daily.js';
import {RULES6_CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {networkRate} from '../packages/adventure/story-network.js';
import {playCultivation,decide} from './helpers/rules9-play.mjs';
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
 const s=find('network_echo'),marks=s.life.cultivation.network.marks;assert.ok(['friend_witness','friend_hide','herbs','old_page','relic_route','teacher_notes','teacher_route','route_contact'].some(k=>marks[k]));choose(s,'follow');const count=s.decisions.filter(d=>d.event==='network_echo').length;for(let i=0;i<12&&s.phase==='life';i++){advanceToChoice(s);if(s.pending)choose(s,decide(s).id);}assert.equal(s.decisions.filter(d=>d.event==='network_echo').length,count);validateRun(s);
});
test('境界与身份独立，测灵优异也不会直接发亲传弟子牌',()=>{
 const s=find('root_result',s=>s.player.root==='松骨灵根');choose(s,'join');assert.equal(s.life.cultivation.rank,'外门弟子');assert.equal(s.player.realm,0);
});
test('完整心法由实际授业产生，只读查询不增长熟练或消耗随机流',()=>{
 const s=find('network_method');choose(s,'clear');assert.equal(s.life.cultivation.network.method.source,'network_method');const before=cloneRun(s);for(let i=0;i<20;i++)networkRate(s);assert.deepEqual(s,before);advance(s,3);assert.equal(s.life.cultivation.network.method.months,3);validateRun(s);
});
test('残卷瓶颈来自多年练习，补卷或换法需实际完成重练',()=>{
 const s=find('network_bottleneck',()=>true,{path:'loose',method:'ember'}),before=cloneRun(s);assert.ok(s.life.cultivation.network.method.months>=60);choose(s,'replace');advance(s,11);assert.equal(s.life.cultivation.network.method.id,'ember');assert.equal(s.player.realm,before.player.realm);advance(s,1);assert.equal(s.life.cultivation.network.method.id,'stone');assert.equal(s.life.cultivation.network.method.acquired,before.month+12);validateRun(s);
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
 const s=find('family_support',s=>s.birth.family==='common');assert.equal(options(s).some(o=>o.id==='supplies'),false);assert.equal(options(s).find(o=>o.id==='notes').enabled,false);assert.match(nodeText(currentNode(s),s),/旧衣|没有.*灵石/);const garden=find('garden_accident');choose(garden,'silent');assert.equal(garden.flags.unpaidGarden,undefined);assert.equal(garden.life.cultivation.wanted,0);validateRun(garden);
});
test('同一生的自动日常不重复，不同人生的童年与邀请组合不同',()=>{
 const patterns=new Set();for(let i=0;i<80;i++){const s=playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast'][i%4],method:i%3===0?'ember':'clear',childhood:i%2?'bold':'care'}).state;const prose=s.journal.filter(e=>e.automatic&&e.kind==='life').map(e=>e.body);assert.equal(new Set(prose).size,prose.length);patterns.add(s.decisions.filter(d=>d.event.startsWith('child_')||d.event.startsWith('network_')).map(d=>d.event+'/'+d.choice).join('|'));validateRun(s);}assert.ok(patterns.size>30);
});
test('新版时间节奏不再一秒过一年，重要任务不会随着高境界极速略过',()=>{
 const s=createRun({seed:'慢读节奏'});assert.equal(monthSeconds(s)*12,3);const childhood=find('child_school');assert.equal(monthSeconds(childhood)*12,6);const duty=find('network_ward');assert.equal(monthSeconds(duty)*12,8);choose(duty,'accept');resolve(duty);assert.equal(monthSeconds(duty)*12,8);
});
test('凡人不必等待寿命以外的世界变故，安顿余生的收尾仍可自然抵达',()=>{
 const s=playCultivation({seed:'万千道途-109',path:'mortal',family:'sever',childhood:'bold'}).state;
 const end=s.decisions.find(d=>d.event==='system_final');assert.ok(end);assert.ok(end.month>=45*12&&end.month<50*12);assert.ok(s.life.cultivation.worldAt>end.month);assert.equal(s.life.cultivation.network.arc,null);assert.equal(s.life.cultivation.network.offer,null);validateRun(s);
});
test('未入道的凡人经历实际坊市生活，不会练出凭空的灵光或同一日常循环',()=>{
 const s=playCultivation({seed:'万千道途-74',path:'mortal'}).state;
 const prose=s.journal.filter(e=>e.automatic&&e.kind==='life'&&e.month>=192).map(e=>e.body);assert.ok(prose.some(t=>t.includes('学徒')||t.includes('契书')));assert.ok(prose.every(t=>!t.includes('掌心灵光')&&!t.includes('护身术')));assert.equal(new Set(prose).size,prose.length);const returnIndex=prose.findIndex(t=>t.includes('师傅嫌他算料太慢'));if(returnIndex>=0)assert.ok(prose.findIndex(t=>t.includes('没被宗门收下'))>=0&&prose.findIndex(t=>t.includes('没被宗门收下'))<returnIndex);validateRun(s);
});
test('真实规则6原档原样恢复，选择与随机流不换成新规则',async()=>{
 const path=new URL('./fixtures/adventure-rules6-original.json',import.meta.url),raw=await readFile(path,'utf8'),original=JSON.parse(raw).state,s=upgradeRun(original);assert.deepEqual(s,original);assert.equal(s.life.cultivation.rulesVersion,6);assert.equal(s.life.cultivation.network,undefined);advanceToChoice(s);assert.equal(currentNode(s),RULES6_CULTIVATION_EVENTS[s.pending.event]);choose(s,options(s).find(o=>o.enabled).id);resolve(s);validateRun(s);assert.equal(await readFile(path,'utf8'),raw);
});
test('新存档拒绝伪造童年窗口、未知功法、负熟练和倒置邀请期限',()=>{
 const source=createRun({seed:'网络存档'});for(const mutate of [s=>s.life.cultivation.network.childhood[0].due=192,s=>s.life.cultivation.network.method={id:'fake',acquired:0,months:0},s=>s.life.cultivation.network.methods=[{id:'clear',acquired:0,months:-1}],s=>s.life.cultivation.network.offer={kind:'archive',due:40,expires:20,danger:false,reason:'some'}]){const s=cloneRun(source);mutate(s);assert.throws(()=>validateRun(s));}
});
