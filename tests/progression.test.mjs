import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,currentNode,nodeText,cloneRun,validateRun,upgradeRun} from './helpers/rules9-engine.mjs';
import {progressionMonth,prose,materialSlots,longAction,playbackSeconds,sceneFor} from '../packages/adventure/progression.js';
import {RULES7_CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {decide,playCultivation} from './helpers/rules9-play.mjs';
const cc=s=>s.life.cultivation;
function pending(event,seed='进阶核验') {const s=createRun({seed});s.month=240;cc(s).admissionDone=true;cc(s).worldDone=true;cc(s).dailyAt=10000;cc(s).choiceAt=10000;cc(s).queue=[];s.pending={event,month:s.month};s.journey=null;return s;}
function resolve(s){while(s.phase==='life'&&!s.pending&&s.journey&&!s.journey.open)advance(s,1);}
function probe(s){const rows=[];let arrived=null;progressionMonth(s,{log:r=>rows.push(r),arrive:id=>arrived=id,apply:effects=>Object.assign(s.player,effects)});return {rows,arrived};}
test('灵石急讯可暂停材料差事，远程处理后恢复原进度而不重复弹窗',()=>{
 const s=pending('advance_material_3_0_0');choose(s,'learn');const original=cloneRun(s.journey);cc(s).progression.parcel={mode:'stone',amount:3,sent:s.month,due:s.month,status:'awaiting',outcome:'exposed',origin:s.birth.continent,route:[s.birth.continent],recipient:s.life.family.members[0].id};advance(s,1);assert.equal(s.pending.event,'parcel_exposed');assert.equal(cc(s).progression.interrupted.journey.event,original.event);choose(s,'convert');advance(s,11);assert.equal(s.pending,null);assert.equal(s.journey.event,'parcel_exposed');assert.ok(!s.inventory.includes('condensation_book'));advance(s,7);assert.equal(cc(s).progression.parcel,null);assert.equal(s.journey.event,original.event);assert.equal(s.journey.to-s.month,original.to-(original.from+1));assert.ok(!s.inventory.includes('condensation_book'));resolve(s);assert.ok(s.inventory.includes('condensation_book'));assert.equal(s.decisions.filter(d=>d.event==='parcel_exposed').length,1);
});
test('每个出生类型在六岁前都有三段具体生活，查询不消耗随机流',()=>{
 const types=new Set();for(let i=0;i<60;i++){const s=createRun({seed:'幼年保证-'+i});advance(s,60);types.add(s.birth.upbringing);assert.ok(cc(s).progression.early.every(e=>e.done));assert.ok(s.journal.filter(e=>e.automatic&&e.month<72).length>=3);validateRun(s);const before=cloneRun(s);prose('许执事与闻竹',s);materialSlots(s,3);playbackSeconds(s);sceneFor(s);assert.deepEqual(s,before);}assert.ok(types.size>=3);
});
test('随机称谓不被二次替换，所有名册别称在渲染前后一致',()=>{for(let i=0;i<150;i++){const s=createRun({seed:'名字复核-'+i});for(const [old,name] of Object.entries(cc(s).progression.names)){assert.equal(prose(old,s),name);assert.equal(prose(prose(old,s),s),name);}}});
test('人物名册每局随机，同一局存取与事件称呼一致',()=>{
 const a=createRun({seed:'名册甲'}),b=createRun({seed:'名册乙'});assert.notDeepEqual(cc(a).progression.names,cc(b).progression.names);assert.notEqual(a.people.master.name,b.people.master.name);assert.equal(prose('闻竹',a),cc(a).progression.names['闻竹']);assert.deepEqual(upgradeRun(JSON.parse(JSON.stringify(a))),a);validateRun(a);
});
test('清理机制句，无伤准备不会提示养伤，有伤才出现恢复',()=>{
 const s=pending('breakthrough_3_0');s.player.health=100;assert.ok(!options(s).find(o=>o.id==='wait').hint.includes('伤'));s.player.health=40;assert.match(options(s).find(o=>o.id==='wait').hint,/伤势/);assert.equal(prose('境界不替你决定接下来的路。旧有的亲属、欠账和他人的记忆仍会继续影响你。',s),'');
});
test('金丹不能仅付灵石晋升，材料真实消耗而真解保留',()=>{
 const s=pending('breakthrough_3_0');s.player.realm=2;s.player.stones=100;cc(s).network.method={id:'clear',acquired:0,months:240};assert.equal(options(s).some(o=>o.id==='service'),false);assert.equal(options(s).find(o=>o.id==='try').enabled,false);s.inventory.push('condensation_book','beast_core','golden_pill');assert.equal(options(s).find(o=>o.id==='try').enabled,true);const original=s.player.realm;choose(s,'try');assert.ok(s.inventory.includes('condensation_book'));assert.ok(!s.inventory.includes('beast_core'));assert.ok(!s.inventory.includes('golden_pill'));assert.equal(s.player.realm,original);advance(s,119);assert.equal(s.player.realm,original);advance(s,1);assert.ok(s.player.realm===2||s.player.realm===3);assert.ok(!s.journey?.resolution);
});
test('最终引劫只给完成护法准备的元婴，阵药用于实际渡劫',()=>{
 const s=pending('system_final');s.player.realm=3;assert.equal(options(s).find(o=>o.id==='dao').enabled,false);s.player.realm=4;assert.equal(options(s).find(o=>o.id==='dao').enabled,false);cc(s).progression.tribulationReady=true;s.inventory.push('tribulation_array','tribulation_medicine');assert.equal(options(s).find(o=>o.id==='dao').enabled,true);choose(s,'dao');assert.equal(s.phase,'life');assert.ok(!s.inventory.includes('tribulation_array'));advance(s,35);assert.equal(s.phase,'life');advance(s,1);assert.equal(s.phase,'ended');
});
test('新山门的公产不能自由拿走，营建支出与个人灵石分开',()=>{
 const s=pending('sect_council_0');Object.assign(cc(s).progression.sect,{phase:'rebuilt',role:'leader',treasury:7});assert.equal(options(s).find(o=>o.id==='ward').enabled,false);cc(s).progression.sect.treasury=18;const stones=s.player.stones;choose(s,'ward');assert.equal(cc(s).progression.sect.treasury,10);assert.equal(s.player.stones,stones);assert.equal(cc(s).progression.sect.development,0);resolve(s);assert.equal(cc(s).progression.sect.development,1);
});
test('战后扎营有重建邀请，交接之后成为协助者',()=>{
 const s=pending('sect_return_2');choose(s,'care');resolve(s);assert.equal(cc(s).progression.sect.phase,'camp');assert.equal(sceneFor(s),'camp');cc(s).network.offer=null;cc(s).network.arc=null;assert.equal(s.pending?.event||probe(s).arrived,'sect_rebuild');s.pending={event:'sect_rebuild',month:s.month};s.journey=null;choose(s,'delegate');resolve(s);assert.equal(cc(s).progression.sect.phase,'rebuilt');assert.equal(cc(s).progression.sect.role,'supporter');assert.equal(cc(s).progression.sect.treasury,12);
});
test('多年行动整程稳定播放，逐月推进并在战事上暂停，逃离不发材料',()=>{
 const s=pending('advance_material_3_0_0');cc(s).worldDone=false;cc(s).worldAt=s.month+24;cc(s).worldKind=0;choose(s,'learn');const j=longAction(s);assert.equal(j.months,72);assert.ok(playbackSeconds(s)*j.months>=10);advance(s,24);assert.equal(s.pending.event,'world_raid');assert.ok(!s.inventory.includes('condensation_book'));choose(s,'escape');resolve(s);assert.ok(!s.inventory.includes('condensation_book'));assert.ok(cc(s).progression.materialAbandoned.includes('advance_material_3_0_0'));
});
test('资助兑换粮钱与直接送灵石分开，封路不立即到账，无收物人则退回',()=>{
 for(const mode of ['coin','stone']){const s=pending('family_support');s.player.stones=10;const before=s.life.family.reserve;choose(s,mode==='coin'?'send':'stones');assert.equal(s.player.stones,7);advance(s,5);assert.equal(s.life.family.money,0);assert.equal(s.life.family.reserve,before);advance(s,1);if(mode==='coin'){assert.equal(s.life.family.money,3000);assert.equal(s.life.family.reserve,before);}else assert.ok(cc(s).progression.parcel?.status==='awaiting'||s.life.family.reserve===before+3);}
 const s=pending('family_support');s.player.stones=10;choose(s,'send');for(const m of s.life.family.members)m.status='dead';advance(s,6);assert.equal(cc(s).progression.parcel.status,'returning');assert.equal(s.life.family.money,0);advance(s,6);assert.equal(cc(s).progression.parcel,null);assert.equal(cc(s).progression.parcels.at(-1).status,'returned');assert.equal(s.player.stones,10);
});
test('远处收到山门急讯不会伪造远行，也不会画角色身处战场',()=>{
 const s=pending('sect_return_0');assert.ok(!/远行途中/.test(currentNode(s).title));assert.match(nodeText(currentNode(s),s),/警钟/);cc(s).continent=s.birth.continent==='sky'?'home':'sky';assert.match(nodeText(currentNode(s),s),/传音阵/);assert.equal(sceneFor(s),null);
});
test('金丹以后完整人生不再出现基础考核，元婴结丹皆有材料故事前因',()=>{
 for(let i=0;i<30;i++){const s=playCultivation({seed:'高阶层级-'+i,path:'orthodox'}).state;const breakthrough=s.decisions.find(d=>d.event.startsWith('breakthrough_3_')&&d.success);if(breakthrough)assert.ok(!s.decisions.some(d=>d.month>breakthrough.month&&d.event.startsWith('selection_')));for(const d of s.decisions.filter(d=>/^breakthrough_[34]_/.test(d.event)&&d.choice==='try'))assert.ok(s.decisions.some(m=>m.month<d.month&&m.event.startsWith('advance_material_')));validateRun(s);}
});
test('真实规则7原档原样恢复并继续，不植入规则8字段',async()=>{
 const path=new URL('./fixtures/adventure-rules7-original.json',import.meta.url),raw=await readFile(path,'utf8'),original=JSON.parse(raw).state,s=upgradeRun(original);assert.deepEqual(s,original);assert.equal(cc(s).rulesVersion,7);assert.equal(cc(s).progression,undefined);advanceToChoice(s);assert.equal(currentNode(s),RULES7_CULTIVATION_EVENTS[s.pending.event]);choose(s,options(s).find(o=>o.enabled).id);resolve(s);validateRun(s);assert.equal(await readFile(path,'utf8'),raw);
});
test('规则8档拒绝负公库、错误童年窗口、未知包裹与伪造中断',()=>{
 const source=createRun({seed:'八代存档'});for(const mutate of [s=>cc(s).progression.sect.treasury=-1,s=>cc(s).progression.early[0].due=0,s=>cc(s).progression.parcels=[{mode:'gold'}],s=>cc(s).progression.interrupted={month:0,journey:{event:'unknown',resolution:{},to:1}}]){const s=cloneRun(source);mutate(s);assert.throws(()=>validateRun(s));}
});
