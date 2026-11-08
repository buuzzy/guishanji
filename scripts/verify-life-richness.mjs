import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {playCultivation} from './play-cultivation.mjs';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {CHILD_WINDOWS} from '../content/story-network.js';
import {hashText} from '../packages/core/random.js';
const count=400,runs=[];
for(let i=0;i<count;i++)runs.push(playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast','mortal'][i%5],conduct:i%7===0?'selfish':i%3===0?'cautious':'care',ending:i%4===0?'dao':'guard',family:i%9===0?'sever':'keep',school:['sword','alchemy','array'][i%3],method:i%3===0?'ember':'clear',childhood:i%2?'bold':'care',invitation:i%7===0?'decline':'accept',material:i%3===0?'risk':i%3===1?'substitute':'safe',rebuild:['lead','delegate','revenge'][hashText('万千道途-'+i+':管理策略')%3],remit:i%2?'stone':'coin',years:i%4===0?'stay':'retreat'}));
let gap=0;const prose=new Set(),longGaps=[];
for(const r of runs){for(let i=1;i<r.state.journal.length;i++)gap=Math.max(gap,r.state.journal[i].month-r.state.journal[i-1].month);for(const e of r.state.journal)if(e.automatic&&e.body.length>45)prose.add(e.body);assert.ok(r.state.player.stones>=0);}
const chains=ROAD_CHAINS.map(c=>({id:c.id,opened:runs.filter(r=>r.events.includes(c.id+'_0')).length,completed:runs.filter(r=>r.events.includes(c.id+'_2')).length,stages:[0,1,2].map(i=>runs.filter(r=>r.events.includes(c.id+'_'+i)).length)}));
for(const c of chains){assert.ok(c.opened>0&&c.opened<count,c.id+' must be optional and reachable');assert.ok(c.stages.every(n=>n>0),c.id+' continuation coverage');}
const family=runs.filter(r=>r.events.includes('family_gate'));assert.ok(family.length>0&&family.length<count);
const paths=['orthodox','loose','demonic','beast','mortal'].map(path=>{const rows=runs.filter(r=>r.path===path);return {path,lives:rows.length,meanFinalStones:Math.round(rows.reduce((n,r)=>n+r.state.player.stones,0)/Math.max(1,rows.length)*10)/10,maxFinalStones:Math.max(0,...rows.map(r=>r.state.player.stones)),materialByLabour:rows.reduce((n,r)=>n+r.state.decisions.filter(d=>d.event.startsWith('breakthrough_')&&d.choice==='service').length,0)};});
const networks=runs.map(r=>r.state.life.cultivation.network);
const network={childhoodPatterns:new Set(runs.map(r=>r.events.filter(e=>e.startsWith('child_')).join('|'))).size,methods:[...new Set(networks.flatMap(n=>n.methods.map(m=>m.id)))],events:[...new Set(runs.flatMap(r=>r.events.filter(e=>e.startsWith('network_'))))],invitations:networks.reduce((v,n)=>v+n.offerCount,0),promotions:networks.filter(n=>n.role).length};
/*
 * ⚠ 2026-11-08（清旧档）：这道门禁以前量的是**规则十一**（`play-cultivation.mjs` 当时的默认版本），
 *   阈值是照规则十一的童年窗口表定的。仓库现在只剩规则十二 ⇒ 门禁量的是规则十二，
 *   阈值要重新定。
 *   ⚠ 已核对：HEAD 在**规则十二**下算出来的数字与现在逐值相同（童年组合 16 种、同样 11 张卡）
 *     ⇒ 这不是内容退化，是**阈值过时**（它从来没量过规则十二）。
 *
 * 童年口径（2026-11-08 重定）
 * ---------------------------
 * ① **不许发霉**：规则层声明的童年卡（`CHILD_WINDOWS`，从规则层读，不自己数）
 *    一张都不许发不出来。
 * ② **不许流水化**：不同的童年组合至少 8 种（规则十二实测 16 种；
 *    童年退化成一条流水线时这个数会掉到 1–2）。
 */
const declaredChildCards=[...new Set(CHILD_WINDOWS.flatMap(w=>w.events))];
const observedChildCards=new Set(runs.flatMap(r=>r.events.filter(e=>e.startsWith('child_'))));
const missingChildCards=declaredChildCards.filter(id=>!observedChildCards.has(id));
assert.deepEqual(missingChildCards,[],'童年卡一张都不许发霉（发不出来的是：'+missingChildCards.join('、')+'）');
assert.ok(network.childhoodPatterns>=8,'童年组合太单一（'+network.childhoodPatterns+' 种）');
network.childCards={declared:declaredChildCards,observed:[...observedChildCards],missing:missingChildCards};
/*
 * ⚠ `network_volume` **不再断言**：规则十二里它**结构性到不了**
 *   （`network_echo` 那张旧卡被 `installShared` 删掉了 ⇒ `seek_volume` 没有入口）
 *   ⇒ 已登记在 `tests/fixtures/reach-gaps.json` 的「人脉网络支线」族里。
 *   同一族的 `network_bottleneck` 也一样（它要 `ember` 心法，规则十二没有这个 id）。
 */
assert.ok(network.events.includes('network_archive')&&network.events.includes('network_ward_result')&&network.events.includes('network_mentor_result'));
const progression={events:[...new Set(runs.flatMap(r=>r.events.filter(id=>/^(advance_material_|sect_rebuild|sect_council_|sect_revenge|tribulation_prepare|years_practice_|parcel_)/u.test(id))))],goldenLives:runs.filter(r=>r.state.player.realm>=3).length,nascentLives:runs.filter(r=>r.state.player.realm>=4).length,remittances:runs.reduce((n,r)=>n+r.state.life.cultivation.progression.parcels.length,0),rebuilds:runs.filter(r=>r.events.includes('sect_rebuild')).length};
for(const run of runs)for(let i=1;i<run.state.journal.length;i++){const before=run.state.journal[i-1],after=run.state.journal[i],months=after.month-before.month;if(months>=120)longGaps.push({seed:run.state.seed,months,before:{month:before.month,title:before.title,body:before.body},after:{month:after.month,title:after.title,body:after.body}});}
longGaps.sort((a,b)=>b.months-a.months);progression.longJournalGaps=longGaps.slice(0,6);
assert.ok(progression.goldenLives>0&&progression.rebuilds>0);assert.ok(progression.events.includes('sect_council_0'));assert.ok(progression.events.some(id=>id.startsWith('advance_material_3_')));assert.ok(progression.events.some(id=>id.startsWith('years_practice_')));
const report={progression,createdAt:new Date().toISOString(),passed:true,rulesVersion:12,count,network,scope:'Actual integer-month simulation; policies are automated, not human enjoyment or retention',maximumJournalGapMonths:gap,distinctDetailedAutomaticProse:prose.size,chains,familyGate:{opened:family.length,ambushed:runs.filter(r=>r.events.includes('family_home_ambush')).length,origins:[0,1,2,3].map(id=>family.filter(r=>r.state.life.cultivation.familyOrigin===id).length)},paths};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/life-richness-simulation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
