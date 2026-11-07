import {active12,rules12,lifespan12,stage12,sectProfile,constitution12} from '../../packages/adventure/story-rules12.js';
import {progressNeeded} from '../../content/cadence-table.js';
import {breakthroughStatus} from '../../packages/adventure/cadence.js';
import {BODY_TYPES} from '../../content/rules12-world.js';
import {activeMundane,mundane,mundaneQuote} from '../../packages/adventure/mundane-life.js';
import {materialSlots} from '../../packages/adventure/progression.js';
import {active10,canCultivate,rootLabel} from '../../packages/adventure/story-rules10.js';
import {METHODS} from '../../content/story-network.js';
import {REALMS,SKILLS,ITEMS} from '../../content/adventure.js';
import {FAMILIES,WORLD_ERAS} from '../../content/living-world.js';
import {PATHS,GEOGRAPHY,ROOTS} from '../../content/cultivation-world.js';
import {income} from '../../packages/adventure/life.js';
import {economyQuote} from '../../packages/adventure/cultivation-economy.js';
import {REALM_ABILITIES} from '../../packages/adventure/realm.js';
import {PIXEL_STYLE} from './pixel-style.js';
const esc=x=>String(x??'').replace(/[&<>"']/gu,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const labels={progress:'修行',sword:'御剑',array:'阵法',alchemy:'丹术',insight:'悟性',courage:'胆识',empathy:'仁心',health:'体力',mind:'心境',constitution:'体魄'};
const heading=(name,sub='')=>`<h3 class="panel-h"><span>${name}</span><span class="lbl">${sub}</span></h3>`;
export function activityMeaning(a,s){const mundane=s&&active10(s)&&!canCultivate(s);return [a.trainSkill===false?'':mundane?({sword:'剑术',array:'识字与符纹',alchemy:'辨药'})[a.skill]:SKILLS[a.skill],...['insight','courage','empathy','health','mind'].filter(k=>a[k]).map(k=>labels[k]),...(a.income?['工钱']:[])].filter(Boolean).join('、')+(mundane?'':' · 修行积累');}
function portrait(s){
 const age=Math.floor(s.month/12)+(s.birth.startAge||0),stage=age<3?'baby':age<7?'small':age<13?'child':age<18?'teen':'adult',sprite=PIXEL_STYLE.PEOPLE[s.player.sex||'M'][stage];
 const colors={H:age>100?'#aaa797':'#32383b',S:'#d9ac82',E:'#32383b',c:'#b48165',m:'#a56957',B:'#708d88',b:'#49615f',P:'#566c6b',F:'#32383b',D:'#708d88',d:'#49615f'};
 return `<svg viewBox="0 0 24 30" role="img" aria-label="${esc(s.player.name)}的像素肖像" shape-rendering="crispEdges"><path fill="#cbd5d1" d="M0 22h24v8H0z"/>${sprite.map((row,y)=>[...row].map((k,x)=>colors[k]?`<rect x="${x+7}" y="${y+25-sprite.length}" width="1" height="1" fill="${colors[k]}"/>`:'').join('')).join('')}</svg>`;
}
function identity(s){
 const p=s.player,c=s.life.cultivation,age=Math.floor(s.month/12)+(s.birth.startAge||0),grade=c?.rootKnown?ROOTS[p.root].grade:null;
 return `<section class="panel idcard cultivation-id"><div class="id-guilloche" aria-hidden="true"></div><div class="id-top"><span>山海行籍 · ${WORLD_ERAS[s.birth.era].name}</span><span>${age} 岁</span></div><div class="id-in"><div class="id-portrait">${portrait(s)}</div><div class="id-right"><div class="id-name">${esc(p.name)}</div><div class="id-dl">${[['出身',FAMILIES[s.birth.family].name],['出生地',GEOGRAPHY.find(g=>g.id===s.birth.continent).name+' · '+s.birth.address],['道路',c?PATHS[c.path].name+' · '+c.rank:REALMS[p.realm].name]].map(([k,v])=>`<div class="id-row"><span class="id-dt">${k}</span><span class="id-dd">${esc(v)}</span></div>`).join('')}<div class="id-row"><span class="id-dt">灵根</span><span class="id-dd">${grade===null?'尚未测定':esc(rootLabel(s))+' <span class="qdots" aria-label="测灵记录">'+[0,1,2,3].map(i=>'<i class="wx-i '+(i<=grade?'on':'')+'"></i>').join('')+'</span>'}</span></div></div></div></div><div class="mrz"><span class="mono">山历 ${s.birth.year} · ${esc(p.name)} · ${REALMS[p.realm].name}</span><span class="id-small">${esc(s.birth.address)} / ${esc(s.player.home)}</span></div></section>`;
}
const bar=(key,value,s)=>`<div class="visible-skill skill-row"><span>${active10(s)&&!canCultivate(s)?({sword:'防身剑术',array:'经书与识字',alchemy:'辨药手艺'})[key]:labels[key]}</span><div class="visible-meter meter"><i style="width:${value}%"></i></div><b class="mono" data-value="${key}">${value.toFixed(1)}</b></div>`;

/**
 * 五轴能力图 —— **只放能力，不放资源**。
 *
 * ## 为什么把「体力」换出去（2026-11-07 · T4）
 * ---------------------------------------------
 * 以前五根轴是 悟性 / 胆识 / 仁心 / **体力** / 心境。
 * 但「体力」是**资源**（受伤就掉、调养就回），其余四根是**能力**（只增不减或慢慢变）
 * ⇒ 把两者画在同一张图上，玩家会以为「体力高 = 这个人强」，
 *   而实际它只是「现在还有多少气力」。
 *
 * ⇒ 现在五轴是 悟性 / 胆识 / 仁心 / 心境 / **体魄**
 *   （体魄＝练出来的筋骨，只增不减；S5 起规则层就有这个数）。
 * ⇒ **体力不出雷达，但也没消失**：它在页面顶部的状态条里（`#miniBar` 的第一格），
 *   两端（网页端 / 小程序端）都看得到 ⇒ 资源没丢，只是不再冒充能力。
 *
 * @param {object} p 玩家状态（读 insight / courage / empathy / mind）
 * @param {number} constitution 体魄点数（0–100；旧档没有这个数 ⇒ 0）
 */
export function abilityRadar(p,constitution){
 const keys=['insight','courage','empathy','mind','constitution'],point=(i,r)=>{const a=-Math.PI/2+i*Math.PI*2/5;return [120+Math.cos(a)*r,112+Math.sin(a)*r];},points=r=>keys.map((_,i)=>point(i,r).join(',')).join(' ');
 const values=keys.map(k=>{const v=k==='constitution'?Number(constitution):Number(p[k]);return Number.isFinite(v)?Math.max(0,Math.min(100,v)):0;});
 const valuePoints=keys.map((_,i)=>point(i,values[i]*.76).join(',')).join(' ');
 return '<div class="ability-radar"><svg viewBox="0 0 240 226" role="img" aria-label="悟性、胆识、仁心、心境、体魄能力图">'+[19,38,57,76].map(r=>'<polygon class="radar-grid" points="'+points(r)+'"/>').join('')+keys.map((_,i)=>{const [x,y]=point(i,76);return '<path class="radar-grid" d="M120 112L'+x+' '+y+'"/>';}).join('')+'<polygon class="radar-shape" points="'+valuePoints+'"/>'+keys.map((key,i)=>{const [x,y]=point(i,99);return '<text x="'+x+'" y="'+y+'" text-anchor="middle" class="radar-label">'+labels[key]+'</text><text x="'+x+'" y="'+(y+13)+'" text-anchor="middle" class="radar-value">'+values[i].toFixed(1)+'</text>';}).join('')+'</svg><p class="hint">五根轴都是修出来的本事；体魄是筋骨，只增不减；心境会因伤病、遭遇改变。体力不在图上，它在页面顶部的状态条里。</p></div>';
}

export function practicePanel(s){
 const c=s.life.cultivation,p=s.player;if(!c)return '';
 if(active10(s)&&!canCultivate(s))return `<section class="panel practice-panel">${heading('修行本事','凡身')}${active12(s)?'<p class="hint">'+BODY_TYPES[rules12(s).body.type].name+'</p>':''} ${Object.entries(p.skills).map(([k,v])=>bar(k,v,s)).join('')}${abilityRadar(p,constitution12(s))}${methodPanel(s)}<p class="hint">${REALM_ABILITIES[0]}寿元上限 ${lifespan12(s)} 岁。</p></section>`;
 /*
  * 积累门槛 —— **只从规则层读**（`content/cadence-table.js` 的 `progressNeeded`）。
  *
  * ⚠ 以前这里写死 `[80,260,220,320]`，小程序端也写死了一份（`view-model.js`）。
  *   两处各写一份 ⇒ 规则层一改，界面就说谎 ——
  *   2026-11-07 用户撞到的「进度条满了却几十年不给突破提示」就是这么来的。
  * ⇒ 现在：**门槛只有一份**（规则层），两端都问它。
  *   旧规则版本（5–11）仍按旧数组走（旧档一个字都不动）。
  */
 const threshold=active12(s)?progressNeeded(p.realm+1):[80,140,220,320][p.realm],pct=threshold?Math.min(100,c.progress/threshold*100):100;
 /*
  * 「冲关还差什么」—— 整句由**规则层**拼好（`breakthroughStatus`），这里只负责显示。
  * ⚠ 小程序端也显示同一句（整句在 JS 侧拼好再绑定，WXML 不支持拼接）。
  */
 const status=active12(s)?breakthroughStatus(s):null;
 return `<section class="panel practice-panel">${heading('修行本事',stage12(s)||REALMS[p.realm].name)}${active12(s)?'<p class="hint">'+BODY_TYPES[rules12(s).body.type].name+(rules12(s).body.damage?' · 经脉受损':'')+(rules12(s).weak?' · 力竭（判定打折，调养可解）':'')+'</p>':''}${active12(s)?'<div class="stat-line"><span>体魄</span><b class="mono">'+Math.round(rules12(s).body.constitution||0)+'</b></div>':''}<div class="cultivation-progress"><div class="stat-line"><span>境界积累</span><b class="mono" data-value="progress">${threshold?Math.round(pct)+'%':'已臻元婴'}</b></div><div class="prog"><div data-progress-meter style="width:${pct}%"></div></div><div class="realm-steps">${REALMS.map((r,i)=>`<span class="${i<=p.realm?'reached':''}"><i></i>${r.name}</span>`).join('')}</div></div>${status&&status.advice?'<div class="stat-line"><span>冲关还差</span><b class="mono" style="flex:1 1 auto;text-align:right;overflow-wrap:anywhere">'+esc(status.advice)+'</b></div>':''}${Object.entries(p.skills).map(([k,v])=>bar(k,v,s)).join('')}${abilityRadar(p,constitution12(s))}${methodPanel(s)}${advancementPanel(s)}<p class="hint">${REALM_ABILITIES[p.realm]}寿元上限 ${lifespan12(s)} 岁。${threshold?'积累到门槛后，再准备材料与闭关。':''}</p></section>`;
}
function advancementPanel(s){
 if(s.life.cultivation.rulesVersion<8||s.player.realm<2||s.player.realm>=4)return '';
 return '<div class="method-record advancement-record"><div class="stat-line"><span>'+ (s.player.realm===2?'凝丹准备':'育婴准备')+'</span></div>'+materialSlots(s,s.player.realm+1).map(([ready,label])=>'<div class="stat-line"><span>'+esc(label)+'</span><strong>'+(ready?'已备':'尚缺')+'</strong></div>').join('')+'</div>';
}
function methodPanel(s){
 if(active10(s)&&!canCultivate(s))return '<div class="method-record"><div class="stat-line"><span>测灵结果</span><strong>'+esc(rootLabel(s))+'</strong></div><p>'+(s.life.cultivation.story10.rootStatus==='absent'?'两次测灵与引气都未成功。你练的是防身剑术、认药与识字，不是御剑和术法。':'测灵尚无回应。你先学认药、识字和防身，药师还没有确认能否引气。')+'</p></div>';
 const a=s.life.cultivation.network,m=a?.method;if(!a)return '';
 return '<div class="method-record"><div class="stat-line"><span>主修心法</span><strong>'+esc(m?METHODS[m.id].name:'尚未正式授业')+'</strong></div>'+(m?'<p>'+esc(METHODS[m.id].detail)+'</p><small>实际练习 '+m.months+' 个月 · '+(m.months<24?'尚在熟悉基础':m.id==='ember'&&m.months>=60?'缺页处未能贯通':'已有稳定周天')+'</small>':'')+(a.role?'<p>宗门差事：'+esc(a.role)+'</p>':'')+(a.arc?'<p>正在'+(a.arc.kind==='mentor'?'丹堂跟炉试任':'北坡巡阵试任')+'；完成考核前不算正式晋升。</p>':'')+'</div>';
}
function mundaneWealth(s){
 const m=mundane(s),q=mundaneQuote(s);
 return `<section class="panel wealth-panel">${heading('钱粮与家产','人间生计')}<div class="wealth-count"><div><small>随身铜钱</small><b data-value="money">${m.money}</b><small>文</small></div><div><small>备粮</small><strong>${m.grain}</strong><small>袋</small></div></div><div class="finance-ledger"><div class="stat-line"><span>灵石</span><b data-value="stones">${Math.floor(s.player.stones)}</b></div><div class="stat-line"><span>一年工钱</span><b>${q.gross} 文</b></div><div class="stat-line"><span>食宿与家用</span><b>${q.upkeep} 文</b></div><div class="stat-line"><span>未还粮钱</span><b data-value="mundaneDebt">${m.debt}</b></div></div>${m.assets.map(p=>`<div class="property-row ${p.status}"><strong>${esc(p.name)}</strong><small>${GEOGRAPHY.find(g=>g.id===p.location)?.name} · ${p.status==='kept'?'保有':'已交出或失去'}</small></div>`).join('')}</section>`;
}
function wealth(s){
 if(activeMundane(s)&&mundane(s).started)return mundaneWealth(s);
 const c=s.life.cultivation,q=c?.rulesVersion>=6?economyQuote(s):null,last=c?.economy?.last,net=income(s);
 return `<section class="panel wealth-panel">${heading('灵石与家产','收支有数')}<div class="wealth-count"><div><small>随身灵石</small><b id="stone-count" data-value="stones">${Math.floor(s.player.stones)}</b></div><div><small>当前每年收支</small><strong>${net>0?'+':''}${net}</strong><small>灵石</small></div></div>${q?`<div class="finance-ledger"><div class="stat-line"><span>月例与工钱 / 年</span><b>${q.gross}</b></div><div class="stat-line"><span>食宿与修行耗材 / 年</span><b>−${q.upkeep}</b></div></div><p class="hint">${q.reason}。钱不够时靠零工维持生活，会减少修行积累。</p>`:''}${last?`<p class="hint">最近一年实收 ${last.gross}，实付 ${last.upkeep}${last.repaid?'，还路费 '+last.repaid:''}${last.shortfall?'；耗材不足，修行积累已放缓':''}。</p>`:''}${s.flags.debt?`<div class="stat-line"><span>未还路费</span><b>${s.flags.debt}</b></div>`:''}<div class="property-list">${Object.values(s.life.properties).map(x=>`<div class="property-row ${x.status}"><strong>${esc(x.name)}</strong><small>${GEOGRAPHY.find(g=>g.id===(x.continent||s.birth.continent))?.name||'旧住处'} · ${{kept:'保有',damaged:'损坏',lost:'已失去'}[x.status]}</small></div>`).join('')}</div></section>`;
}
function inventory(s){return `<section class="panel belongings-panel">${heading('随身行囊',s.inventory.length+' 件')}<div class="inventory">${s.inventory.map(id=>`<span class="chip" data-item="${id}">${ITEMS[id].name}</span>`).join('')||'<span class="hint">行囊暂空。</span>'}</div></section>`;}
function sectPanel(s){
 const sect=s.life.cultivation?.progression?.sect;if(!sect||s.life.cultivation.path!=='orthodox')return '';
 const phases={intact:'原山门',camp:'撤离后的临时营地',rebuilt:'重新建立的山门'},roles={core:'守山与护法',leader:'领事与议事',supporter:'已交接管理'};
 return `<section class="panel sect-panel">${heading(sect.name,sect.size)}${active12(s)?'<p class="hint">'+esc(sectProfile(s).style)+'</p>':''}<div class="sect-banner"><span>${phases[sect.phase]}</span><b>${REALMS[sect.highest].name}坐镇</b></div><div class="sect-columns"><div><small>你的差事</small><strong>${roles[sect.role]||s.life.cultivation.rank}</strong></div><div><small>公库</small><strong>${sect.phase==='intact'?'由掌事保管':sect.treasury+' 枚灵石'}</strong></div><div><small>安置与营建</small><strong>${sect.development?sect.development+' 项已办妥':'尚待商议'}</strong></div></div>${sect.phase!=='intact'?'<div class="prog public-store"><div style="width:'+Math.min(100,sect.treasury/24*100)+'%"></div></div>':''}</section>`;
}
export function lifePanels(s){return identity(s)+practicePanel(s)+sectPanel(s)+wealth(s)+inventory(s);}
