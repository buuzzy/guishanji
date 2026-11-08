/**
 * decide-policy.mjs —— 「遇到这张卡，按这个偏好选」的策略表
 * ============================================================================
 *
 * ## 为什么单独抽出来
 * ------------------
 * 这段策略原本长在 `scripts/play-cultivation.mjs` 里，而那个脚本顶部有
 * `import {writeFile,mkdir} from 'node:fs/promises'` ⇒ **浏览器不能 import 它**
 * （Node 内置模块在浏览器里直接报「Failed to resolve module specifier」）。
 *
 * 而 `apps/viz/` 那个开发者面板要在浏览器里**用同一份策略**跑人生
 * —— 否则面板跑出来的命和门禁审计的命不是一回事，看的就不是同一批数据。
 *
 * ⇒ 把纯逻辑搬到这里，`play-cultivation.mjs` 继续转发导出（既有调用方一个字不用改）。
 *
 * ## 这里面**没有规则**
 * --------------------
 * 只有「偏好哪个选项」。规则（代价、把握、能不能点、后果）一律由
 * `packages/adventure/engine.js` 的 `options()` / `choose()` 说了算。
 * 本文件不许自己算代价、不许自己判成败 —— 只回答「点哪个」。
 *
 * ⚠ 函数体是**从原文件逐字搬过来的**（只改了 import 行）⇒ 行为必然一致。
 *
 * ⚠ **2026-11-08 · 阶段 3.2**：`reception`（山门外的队伍）**保持原样**（岔路）。
 *   交接文档 §3.2 的「必答串五环」管的是**五环之内**
 *   （测灵根 → 宗门部门 → 心法选定 → 重心 → 炼气突破），
 *   排队那张卡在**五环之前**（铺垫）⇒ 不动它。
 *   ⚠ 特别提醒：**这张卡上的「回家」是「有灵根但选择不修仙」的唯一出口**
 *   ⇒ 拿掉它，那类命会落进「走凡俗路、却又不是无缘修仙」的空档 ⇒ 一辈子没有内容。
 *   ⚠ 它还是**规则 5–11**（旧版本）固定人生序列的取值依据
 *   ⇒ 改了它，旧版本的决策序列会跟着变。
 */
import { options } from '../../packages/adventure/engine.js';
import { ROAD_CHAINS } from '../../content/cultivation-stories.js';

export function decide(s,{path='birth',conduct='care',ending='guard',family='keep',school='array',method='clear',childhood='care',invitation='accept',material='safe',rebuild='lead',remit='coin',years='retreat'}={}){
 const id=s.pending.event,available=options(s).filter(o=>o.enabled),preferred=[];
 if(id.startsWith('advance_material_'))preferred.push(id.split('_')[4]==='0'?'learn':id.split('_')[4]==='1'?material==='risk'?'search':material==='substitute'?'substitute':'exchange':material==='risk'?'refine':'commission');
 if(id==='sect_rebuild')preferred.push(rebuild);
 if(id.startsWith('sect_council_'))preferred.push('teach','earn','ward');
 if(id==='sect_revenge')preferred.push(conduct==='selfish'?'fight':'investigate');
 if(id==='tribulation_prepare')preferred.push(ending==='dao'?'prepare':'decline');
 if(id.startsWith('years_practice_'))preferred.push(years,'stay');
 if(id==='family_support')preferred.push(remit==='stone'?'stones':'send','peace');
 if(id.startsWith('parcel_missing'))preferred.push('search');
 if(id.startsWith('parcel_exposed'))preferred.push(conduct==='selfish'?'guard':'convert');
 if(id==='reception')preferred.push(path==='mortal'?'home':path==='loose'?'leave':'test');
 if(id==='root_result')preferred.push(path==='demonic'?'dark':path==='loose'?'loose':path==='mortal'?'loose':'join','servant');
 if(id==='early_demonic')preferred.push(path==='loose'?'leave':'stay');
 if(id==='early_loose')preferred.push(path==='orthodox'?'sect':'learn');
 if(id==='early_beast')preferred.push(path==='loose'?'town':'stay');
 if(id==='first_method')preferred.push(school);
 if(id.startsWith('child_')&&childhood==='bold')preferred.push('claim','hide','trace','warn','accept','ask');
 if(id==='network_method')preferred.push(method,'clear','shade','beast','stone');
 if(id==='network_archive')preferred.push(invitation==='decline'?'decline':school==='sword'?'iron':'river');
 if(id==='network_mentor'||id==='network_ward')preferred.push(invitation==='decline'?'decline':'accept');
 if(id==='network_mentor_result')preferred.push('finish','escape','leave');
 if(id==='network_ward_result')preferred.push('evidence','investigate');
 if(id==='network_bottleneck')preferred.push('seek');
 if(id==='network_volume')preferred.push('verify','replace','decline');
 if(id==='garden_accident')preferred.push(conduct==='selfish'?'frame':'honest');
 if(id==='family_rules')preferred.push(family);
 if(id==='family_gate')preferred.push('return');
 if(id==='family_dispute')preferred.push(conduct==='selfish'?'take':'stop');
 if(id==='family_grave')preferred.push('stay');
 if(id.startsWith('breakthrough_'))preferred.push('try','service','wait');
 if(id.startsWith('selection_'))preferred.push(id.endsWith('_result')?'fair':school,'withdraw');
 if(id==='road_turn')preferred.push('keep');
 if(id==='world_raid')preferred.push(conduct==='selfish'?'loot':'escape');
 if(id==='system_final')preferred.push(ending,'guard');
 if(ROAD_CHAINS.some(a=>id.startsWith(a.id+'_')))preferred.push(conduct);
 return available.find(o=>preferred.includes(o.id)&&o.id===preferred.find(p=>available.some(a=>a.id===p)))||available[0];
}
