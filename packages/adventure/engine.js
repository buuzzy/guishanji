import {lifespan12,choice12,constitution12} from './story-rules12.js';
import {MUNDANE_ENDINGS} from '../../content/mundane-stories.js';
import { createStreams, random, hashText } from '../core/random.js';
import { NODES as ORIGINAL_NODES, ACTS, REALMS, REGIONS, CAST as ORIGINAL_CAST, ITEMS, ADVENTURE_VERSION, CONTENT_REVISION, ENDINGS as ORIGINAL_ENDINGS, SKILLS, LEGACY_VERSION, LEGACY_CONTENT_REVISION, PREVIOUS_VERSION, PREVIOUS_CONTENT_REVISION } from '../../content/adventure.js';
import { EPISODES } from '../../content/living-episodes.js';
import { NEW_CAST, EXTRA_ENDINGS, FAMILIES, BIRTHPLACES, WORLD_ERAS, LIFE_GOALS } from '../../content/living-world.js';
import { birthConfiguration } from './birth.js';
import { initializeLife, regionInfo, contextualText, openJourney, livingMonth, beginAction, completeAction, continuation, markEvent, respondToCrisis, emergencyArrival, income, practiceRate, trainingOptions } from './life.js';
import { activityContext, personHere } from './context.js';
import { titleAllows } from './gates.js';

import { makeReadable } from '../../content/expressions/index.js';
import { makeReadableEvents } from '../../content/expressions/events/index.js';
import { EXPEDITION_CHANGES, CLUE_EVENTS } from '../../content/expedition-changes.js';
import { FAMILY_EVENTS, familyState, familyAvailable } from './family.js';
import { breakthroughRecord } from './realm.js';
import {activeCultivation,canCultivate,hasMana,encounterPeople,introduceText} from './story-shared.js';
import {mundaneRequirements} from './mundane-life.js';
import { CULTIVATION_EVENTS } from '../../content/cultivation-stories.js';
import { ROOTS,SYSTEM_ENDINGS } from '../../content/cultivation-world.js';
import { annualCultivationSettlement,initializeCultivation,validateCultivation,finishTravel,beginTravel,changeActivity,withdrawCultivation,cultivationText,cultivationActionTrip,cultivationDeliveryMonths } from './cultivation.js';
import { PREVIEW3_VERSION,PREVIEW3_CONTENT_REVISION } from '../../content/adventure.js';
import {prose,progressionChoice} from './progression.js';
/*
 * ⚠ 表达域接管的范围（2026-11-08 · T10 补齐）：
 *   探险（expedition_*）、各处通知（valley / cavern / outer_notice）、
 *   家人（family_*）这 **9 张卡**原先**没进表达域** ——
 *   它们是后来才加进节点表的，加进来时没跟上表达域 ⇒
 *   玩家读到的还是规则层自己的老说法，而且**没有任何门禁盯着它们**。
 *   ⇒ 现在一并交给经典表达域（文字原样搬过去，一个字没改），
 *     门禁 `expressions` 会把它们一起盯住。
 */
const NODES = { ...makeReadable({ ...ORIGINAL_NODES, ...EPISODES, ...EXPEDITION_CHANGES, ...CLUE_EVENTS, ...FAMILY_EVENTS }) };
NODES.beacon.legacyOnly = true;
Object.assign(NODES,CULTIVATION_EVENTS);
for(const node of Object.values(CULTIVATION_EVENTS))node.cultivationOnly=true;
/*
 * 修仙线的说法交给**表达域**（2026-11-08 · T7）。
 *
 * 经典那条路的 66 张早就在表达域里（`makeReadable`），修仙这条路的 285 张却一张都没进去
 * ⇒ 玩家读到的全是「一句里塞三件事」的老写法（用户 2026-11-06 提的第 10 条：
 * 「表述优雅但难懂，不够通俗」）。
 *
 * ⚠ **只换说法，不换事实**：标题、正文、选项提示语三样换成表达域的版本；
 *   效果、判定、代价、月份、后续事件一个字都不动（那些是规则层的）。
 * ⚠ **只对当前版本（规则十二）生效**：历史版本（5–11）各有自己的事件表快照，
 *   那些快照一个字都不动（eventsfid 门禁盯着）。
 */
const READABLE_EVENTS=makeReadableEvents(CULTIVATION_EVENTS);
const CAST = { ...ORIGINAL_CAST, ...NEW_CAST };
const ENDINGS = { ...ORIGINAL_ENDINGS, ...EXTRA_ENDINGS, ...SYSTEM_ENDINGS,...MUNDANE_ENDINGS,childhood_illness:{title:'夭折于童年',text:'热病没能治好，家人守到了最后。短短的一生，留在他们记得的院落里。'},breakthrough_lost:{title:'陨落于冲关',text:'强行冲关伤断了心脉，石室外再没等到你的回音。留下的卷册与未用完的药，由相识的人收起。'} };
export { NODES as EVENTS, ENDINGS as ALL_ENDINGS };

export const cloneRun = state => JSON.parse(JSON.stringify(state));
const value = (entry, state) => typeof entry === 'function' ? entry(state) : entry;
const bound = (number, min, max) => Math.min(max, Math.max(min, number));
const statLabels = { health: '体力', mind: '心境', insight: '悟性', courage: '胆识', empathy: '仁心', stones: '灵石' };
export const ORIGINS = {
  village: { name: '山村药农', text: '识草药，背着一份普通人的嘱托出门。', stats: { empathy: 8 }, items: ['herb_kit'] },
  artisan: { name: '渡口匠人', text: '见过许多人远行，也知道器物要留下退路。', stats: { insight: 8 }, items: ['rainstone'] },
  wanderer: { name: '流浪少年', text: '没有豪门资助，但很早学会在陌生地方活下去。', stats: { courage: 8, stones: 10 }, items: ['ward'] },
  noble: { name: '名门大户', text: '有积蓄、有旧契，也有旁人记得的家产。', stats: { insight: 6 }, items: ['rainstone', 'ward'] },
  clan: { name: '修仙世家', text: '家传的护符与调息法，也伴着族中的旧盟。', stats: { insight: 5, courage: 4 }, items: ['ward', 'herb_kit'] },
};

export function age(state) { return (state.birth?.startAge ?? 16) + Math.floor(state.month / 12); }
export function date(state, month = state.month) { return { year: (state.birth?.year ?? 471) + Math.floor(month / 12), month: month % 12 + 1, age: (state.birth?.startAge ?? 16) + Math.floor(month / 12) }; }
export function duration(months) {
  if (months === 0) return '当下';
  const years = Math.floor(months / 12), rest = months % 12;
  return (years ? years + '年' : '') + (rest ? rest + '个月' : '');
}
function eventNode(state,id){
 const table=state.life?.cultivation?READABLE_EVENTS:undefined;
 return table&&Object.hasOwn(table,id)?table[id]:Object.hasOwn(NODES,id)?NODES[id]:undefined;
}
export function currentNode(state) { return state.pending ? eventNode(state,state.pending.event) : null; }
export function nodeText(node, state) { const text=value(node.text,state);return contextualText(state.life?.cultivation?cultivationText(text,state,node.id):text,state); }

function log(state, entry) {
  if(state.life?.cultivation){entry={...entry,title:prose(entry.title,state),body:prose(entry.body,state)};}
  /*
   * ⚠⚠ **冷却闸（旁白）**（2026-11-07 · T2）：同一句旁白，60 个月内不说第二遍。
   *
   * 为什么在这里判：
   *   自动旁白有两个入口 —— 规则层用 `cb.log` 记的，和「长行动」结束时引擎自己记的
   *   （`kind:'plan'` 那种）—— 只堵一个入口会漏。
   *   ⇒ 统一放在**所有人生经历的唯一入口**（这个函数），
   *     口径只有一份（`packages/adventure/gates.js` 的 `titleAllows`）。
   *
   * ⚠ **只对当前版本（规则十二）生效**：旧档（5–11）逐值全等，一个字节都不动。
   * ⚠ **只压自动旁白**：玩家的抉择记录（`kind:'choice'`）是**他自己的历史**，
   *   选过两次同一个选项就该记两次 —— 那不是「重复」，那是「他就是这么选的」。
   */
  if(state.life?.cultivation&&entry.automatic&&!titleAllows(state,entry.title))return;
  if(state.life?.cultivation){entry={...entry,body:introduceText(entry.body,state)};encounterPeople(state,entry.body,entry.event||'experience');}
  state.journal.push({ id: state.journal.length + 1, month: state.month, act: state.act, ...entry });
}

export function createRun({ seed = '松风有信', id = 'life-' + hashText(seed).toString(36), name, origin, sex, goal = 'free', classic = false, rulesVersion = 12 } = {}) {
  if (typeof seed !== 'string' || !seed.trim() || seed.length > 80) throw new Error('机缘种子需要一至八十个字。');
  const config = birthConfiguration(seed.trim(), { name, origin, sex, goal:classic?goal:'free',classic });
  name = config.name; origin = config.origin; sex = config.sex;
  if (typeof name !== 'string' || !name.trim() || [...name.trim()].length > 12) throw new Error('名字需要一至十二个字。');
  if (!Object.hasOwn(ORIGINS, origin) || !['F', 'M'].includes(sex)) throw new Error('出身或外观无效。');
  if (origin === 'noble' || origin === 'clan') config.birth.family = origin;
  else if (origin !== FAMILIES[config.birth.family].origin) config.birth.family = 'common';
  const state = {
    product: 'gui-shan-preview', format: 1, version: ADVENTURE_VERSION, contentRevision: CONTENT_REVISION,
    id, seed: seed.trim(), revision: 0, phase: 'life', month: 0, act: 0,
    random: config.random, birth: config.birth,
    player: { name: name.trim(), origin, sex, root: config.root, realm: 0, focus: 'array', skills: { sword: 6, array: 6, alchemy: 6 }, health: 90, mind: 65, insight: 30, courage: 30, empathy: 30, stones: FAMILIES[config.birth.family].stones, location: 'home', home: config.birth.address + '家中旧屋', homeBeforeWar: null, practice: 0 },
    inventory: [], flags: {}, world: { threat: '', survivors: 18, masterDeadline: null },
    people: Object.fromEntries(Object.entries(CAST).map(([pid, p]) => [pid, { id: pid, ...p, known: false, alive: true, status: 'alive', deathMonth: null, location: ['master', 'sister', 'friend', 'trialmate'].includes(pid) ? 'home' : 'refuge', bond: { master: 35, sister: 25, friend: 30 }[pid] || 0 }])),
    pending: null, journey: null, waiting: false, result: null, ending: null, decisions: [], journal: [],
  };
  state.world.threat = random(state, 'world') < 0.5 ? 'beast' : 'sovereign';
  applyEffects(state, { stats: ORIGINS[origin].stats, items: ORIGINS[origin].items });
  const bonus = ['insight', 'courage', 'empathy'][Math.floor(random(state, 'birth') * 3)];
  state.player[bonus] += 6;
  initializeLife(state);
  if(!classic){if(rulesVersion!==12)throw Error('不支持创建此规则的人生');initializeCultivation(state);}
  log(state, { kind: 'birth', title: name + '出生了', body: '山历' + state.birth.year + '年，你出生在' + BIRTHPLACES[state.birth.continent].name + '的' + state.birth.address + '，来自' + FAMILIES[state.birth.family].name + '。'+(classic?'这一世处在'+WORLD_ERAS[state.birth.era].name+'。':({ordinary:'家人安排生计，邻里偶尔传来宗门的消息。',demonic:'战乱中，一名幽灯堂修士把你带离故乡，留下了今后需要面对的师承。',beast:'出生时的异象改变了你的身体，家人把你藏在山林，请老猿照看。',loose:'战乱中一名游方药师救下你，教你认字与辨药。'})[state.birth.upbringing]), automatic: true, context: 'childhood', location: 'home' });
  state.life.automaticCount = 1;
  if(state.life?.cultivation&&state.birth.family==='clan')log(state,{kind:'birth',title:'长辈为你留下的灵石',body:'族中长辈为你封存四枚灵石，归在你的名下；族库和其他家产仍由家人保管。',automatic:true,context:'childhood',location:'home'});
  openJourney(state);
  refreshLifespan(state);
  return validateRun(state);
}

/**
 * 把「这个人实际能活到几岁」写进状态。
 *
 * ## 为什么要写进状态
 * ------------------
 * 寿元的**唯一来源**是 `lifespan12()`（规则十二）：它按体质、旧伤、境界算，
 * 不是境界表里那个基础数字（`REALMS[realm].lifespan`）。
 * 呈现层（网页端、小程序端）以前各读各的 —— 小程序读的是境界基础寿元，
 * 于是登记卡上写的寿元与实际能活的岁数对不上。
 *
 * ⇒ 现在：**规则层算一次，写进 `state.life.cultivation.lifespanLimit`**，
 *   呈现层只读这个值，不再自己算、也不再读境界表。
 *
 * @param {object} state 当前人生状态
 * @param {boolean} onlyIfMissing 只在缺这个字段时补上（加载旧存档时用）
 * @returns {number|undefined} 实际寿元
 */
export function refreshLifespan(state, onlyIfMissing = false) {
  if (!state.life || !state.life.cultivation) return;
  /*
   * ⚠ 加载旧存档时**只补不覆盖**：存档读出来再存回去必须一模一样
   *   （`upgradeRun` 的契约：加载不改写、不重放旧年月）。
   */
  if (onlyIfMissing && state.life.cultivation.lifespanLimit !== undefined) return state.life.cultivation.lifespanLimit;
  state.life.cultivation.lifespanLimit = lifespan12(state);
  return state.life.cultivation.lifespanLimit;
}

/** Upgrade a validated copy; loading never writes or replays previous years. */
export const createClassicRun = input => createRun({...input,classic:true});
export const setActivity = (state,id) => changeActivity(state,id);
export const travelTo = (state,id) => beginTravel(state,id,callbacks(state));
export const leaveExpedition = state => withdrawCultivation(state,callbacks(state));
export function upgradeRun(input) {
  validateRun(input);
  if (input.version === ADVENTURE_VERSION) { const same = cloneRun(input); refreshLifespan(same, true); return same; }
  if(input.version===PREVIEW3_VERSION){const state=cloneRun(input);state.version=ADVENTURE_VERSION;state.contentRevision=CONTENT_REVISION;state.revision++;refreshLifespan(state, true);return validateRun(state);}
  if (input.version === PREVIOUS_VERSION) {
    const migrated = cloneRun(input); migrated.version = ADVENTURE_VERSION; migrated.contentRevision = CONTENT_REVISION; migrated.revision++;
    migrated.life.feedback = false; migrated.life.family = familyState(migrated, true);
    if (migrated.journey) migrated.journey.legacyTarget = Boolean(migrated.journey.target);
    refreshLifespan(migrated, true);
    return validateRun(migrated);
  }
  const state = cloneRun(input);
  state.version = ADVENTURE_VERSION; state.contentRevision = CONTENT_REVISION; state.revision++;
  state.birth = { startAge: 16, year: 471, era: 'tide', continent: 'home', family: 'common', address: '旧山门客舍', goal: 'free', legacy: true };
  for (const [id, p] of Object.entries(NEW_CAST)) state.people[id] = { id, ...p, known: false, alive: true, status: 'alive', deathMonth: null, location: 'home', bond: 0 };
  initializeLife(state, true);
  if (state.journey) state.journey.legacyTarget = true;
  refreshLifespan(state, true);
  return validateRun(state);
}
export function seekTraining(state, groundId) {
  const offered = trainingOptions(state).find(g => g.id === groundId);
  if (!offered || !offered.enabled) throw new Error(offered?.reasons.join('；') || '没有这处修炼场。');
  if (!state.journey?.open) throw new Error('先结束当前的安排。');
  state.revision++; arrive(state, offered.invitation); return state;
}

/** A pure requirement query. It never draws random numbers or changes the run. */
export function unmet(state, requires = {}) {
  requires = value(requires, state) || {};
  const reasons = mundaneRequirements(state,requires);
  if(requires.spirit&&!canCultivate(state))reasons.push('尚未能引气，不能修炼这门心法或术法');
  if(requires.mana&&!hasMana(state))reasons.push('尚未炼出法力，不能这样催动法器或斗法');
  if (requires.all) for (const part of requires.all) reasons.push(...unmet(state, part));
  if (requires.any && !requires.any.some(part => unmet(state, part).length === 0)) reasons.push(requires.any.map(part => unmet(state, part).join('、')).join(' 或 '));
  if (requires.realm && state.player.realm < requires.realm) reasons.push('达到' + REALMS[requires.realm].name);
  if (requires.maxRealm !== undefined && state.player.realm > requires.maxRealm) reasons.push('须在' + REALMS[requires.maxRealm].name + '阶段进入');
  for (const id of requires.peopleAlive || []) if (state.people[id]?.status !== 'alive') reasons.push('需要在世的' + CAST[id].name);
  for (const id of requires.peopleHere || []) if (!personHere(state, id)) reasons.push('需要与' + CAST[id].name + '在同一地域会合');
  if (requires.stones && state.player.stones < requires.stones) reasons.push('需要' + requires.stones + '灵石');
  for (const [skill, required] of Object.entries(requires.skills || {})) if (state.player.skills[skill] < required) reasons.push(SKILLS[skill] + '达到' + required);
  for (const item of requires.items || []) if (!state.inventory.includes(item)) reasons.push('携带' + ITEMS[item].name);
  for (const flag of requires.flags || []) if (!state.flags[flag]) reasons.push(({ mercy: '曾宽宥宋却', regionalAlly: '建立大陆援军' })[flag] || '已有' + flag);
  /*
   * ⚠ `flagsAbsent`：**反向**条件 —— 这个旗标**已经写下了** ⇒ 这个选项对你关着。
   *
   * 为什么要有它（2026-11-08 · 接头卡试点时踩到）：
   *   规则层本来只有正向的 `flags`（旗标必须在）。
   *   但「上一条线留了烂摊子 ⇒ 下一条路暂时不给你走」是**反向**的。
   *   ⇒ 一开始去改 `choice.available`，结果被 `progressionChoice`（`remit` 那几项）
   *     整个覆盖掉 ⇒ 旗标写了，选项照样能点 ⇒ **联动静默失效**。
   *   ⇒ 改成写在 `requires` 里：`requires` 只有极少数几处会改（`m11_*` 与突破卡），
   *     接头卡用的那几张卡都不在名单里 ⇒ 改不动。
   */
  if (requires.flagsAbsent) for (const flag of requires.flagsAbsent) if (state.flags[flag]) reasons.push((requires.flagsAbsentReasons || {})[flag] || requires.flagsAbsentReason || '当前条件不允许');
  if (requires.flagsAny && !requires.flagsAny.some(flag => state.flags[flag])) reasons.push('已有大陆援军');
  if (requires.aid && aid(state).length < requires.aid) reasons.push('至少' + requires.aid + '份援军承诺（当前' + aid(state).length + '份）');
  return reasons;
}

/** Each actual source counts once: an item and its associated promise are not two armies. */
export function aid(state) {
  const result = [];
  if (state.inventory.includes('tide_token')) result.push('潮舟');
  if (state.inventory.includes('ember_engine')) result.push('炉匠');
  if (state.inventory.includes('sky_scroll')) result.push('书院');
  if (state.flags.network) result.push('青岚旧友');
  if (state.flags.mercy) result.push('宋却');
  const mapped = { tide: '潮舟', ember: '炉匠', sky: '书院' }[state.flags.destination];
  if (state.flags.regionalAlly && mapped && !result.includes(mapped)) result.push(mapped);
  if (state.flags.extraAlly && result.length === 0) result.push('异乡药师');
  if (state.people.ally.known && state.people.ally.status === 'alive' && state.people.ally.bond >= 65) result.push('嵇萝与救援队');
  if (state.flags.trialAlly && state.people.trialmate?.status === 'alive') result.push('陶宁与试炼旧友');
  if (state.flags.outerFriends) result.push('域外归来者');
  return result;
}

export function chance(state, check) {
  if (!check) return null;
  let score = check.base || 0;
  score += (state.player.skills[check.skill] || 0) * (check.scale || 0);
  score += state.player.realm * (check.realmScale || 0);
  score += (state.player[check.stat] || 0) * (check.statScale || 0);
  for (const [item, bonus] of Object.entries(check.items || {})) if (state.inventory.includes(item)) score += bonus;
  for (const [flag, bonus] of Object.entries(check.flags || {})) if (state.flags[flag]) score += bonus;
  for (const [id, bonus] of Object.entries(check.allies || {})) if (state.people[id].status === 'alive' && state.people[id].known) score += bonus;
  /*
   * 「虚弱」是**临时状态**，不是永久减益。
   *
   * ⚠ 原来这里是「体力低于 40 就固定扣 10 分」—— 一刀切 ⇒ 只要体力一直回不来，
   *   这 10 分就一直挂着 ⇒ **越输越没戏**（实测：连输三次的修士后面几次冲关全败）。
   * ⇒ 改成**连续**：体力越低扣得越多（最多还是 10 分），体力一恢复就还回去。
   *
   * 「体魄」是**永久能力**（只增不减）：给的是稳定加成，不随体力起伏。
   */
  if (state.player.health < 40) score -= Math.round((40 - state.player.health) / 4);
  score += constitution12(state) * 0.12;
  if (state.birth && !state.birth.legacy) score += WORLD_ERAS[state.birth.era].check;
  return bound(Math.round(score), 5, 95);
}

export function options(state) {
  const node = currentNode(state);
  if (!node) return [];
  return node.choices.filter(o=>!o.visible||o.visible(state)).map(rawChoice => {
    const choice=choice12(state,progressionChoice(state,rawChoice,node.id),node.id);
    const cost = cloneRun(value(choice.cost, state) || {});
    if (node.id === 'gate' && state.birth && !state.birth.legacy) {
      const fee = WORLD_ERAS[state.birth.era].gateCost;
      cost.stones = Math.min(fee, state.player.stones); cost.debt = Math.max(0, fee - state.player.stones);
    }
    const reasons = unmet(state, choice.requires);
    if(node.id==='family_help' && choice.id!=='send' && !familyAvailable(state)) reasons.push('家中暂时没有能送出援助的人与积蓄');
    if(node.id==='expedition_companion' && choice.id==='heal' && !state.inventory.includes('herb_kit')) reasons.push('缺少随身伤药');
    if (choice.id === 'enter' && state.life) {
      const ground = trainingOptions(state).find(g => g.invitation === node.id);
      if (ground) reasons.push(...ground.reasons);
    }
    if (node.id === 'gate' && state.birth?.continent === choice.id) reasons.push('这是你的出生大陆，界门通往其他大陆');
    if (cost.stones && state.player.stones < cost.stones) reasons.push('还差' + Math.ceil(cost.stones - state.player.stones) + '灵石');
    for (const item of cost.items || []) if (!state.inventory.includes(item)) reasons.push('没有' + ITEMS[item].name);
    const revisited = node.id === 'crossroads' && choice.id === 'near' && state.decisions.some(d => d.event === 'relic_door');
    if(choice.available&&!choice.available(state))reasons.push(choice.reason||'当前条件不允许');
    if(state.life?.cultivation?.exam&&node.id.endsWith('_result')&&choice.id==='fair'&&state.month<state.life.cultivation.punishmentUntil)reasons.push('处分期间不能参加本届考核');
    if(state.life?.cultivation?.exam&&node.id.startsWith('selection_')&&node.id.endsWith('_result')&&choice.id!=='withdraw'&&state.month>state.life.cultivation.exam.deadline)reasons.push('已经错过本届考核，只能退出本届');
    const check=state.life?.cultivation?.exam&&node.id.startsWith('selection_')&&choice.check?{...choice.check,skill:state.life.cultivation.exam.skill,base:choice.check.base+Math.min(12,state.life.cultivation.exam.preparation/2)}:choice.check;
    return { id: choice.id, label: revisited ? '留在这里，整理已经走过的遗迹路线' : state.life?.cultivation?cultivationText(contextualText(value(choice.label,state),state),state,node.id,'option'):contextualText(value(choice.label,state),state), hint: revisited ? '不再重复已经完成的遗迹。继续异乡日常与新的机缘。' : prose(contextualText(value(choice.hint, state), state),state), enabled: reasons.length === 0, reasons, chance: chance(state, check), lethal: Boolean(choice.check?.failEnding || choice.ending === 'sacrifice'), cost, months: choice.months ?? node.months ?? 0 };
  });
}

function applyEffects(state, input) {
  const effect = value(input, state) || {}, changes = [];
  if(state.life?.cultivation&&effect.realm>0&&!canCultivate(state))throw Error('没有引气资格，不能结算常规境界突破');
  for (const [stat, delta] of Object.entries(effect.stats || {})) {
    const before = state.player[stat];
    state.player[stat] = stat === 'stones' ? bound(before + delta, 0, 100000) : bound(before + delta, 0, 100);
    if(stat==='stones'&&state.life?.cultivation){const actual=state.player[stat]-before;state.life.cultivation.economy[actual>=0?'received':'spent']+=Math.abs(actual);}
    const actual = Math.round((state.player[stat] - before) * 10) / 10;
    if (actual) changes.push(statLabels[stat] + (actual > 0 ? '+' : '') + actual);
  }
  for (const [skill, delta] of Object.entries(effect.skills || {})) {
    const old = state.player.skills[skill];
    state.player.skills[skill] = bound(old + delta, 0, 100);
    const actual = Math.round((state.player.skills[skill] - old) * 10) / 10;
    if (actual) changes.push(SKILLS[skill] + '+' + actual);
  }
  for (const item of effect.items || []) {
    if (!ITEMS[item]) throw new Error('未知物品：' + item);
    if (!state.inventory.includes(item)) { state.inventory.push(item); changes.push('得到' + ITEMS[item].name); }
  }
  for (const item of effect.remove || []) {
    if (state.inventory.includes(item)) changes.push('失去' + ITEMS[item].name);
    state.inventory = state.inventory.filter(existing => existing !== item);
  }
  if (effect.realm !== undefined && effect.realm > state.player.realm) {
    const from=state.player.realm,actual=!!state.life?.cultivation,oldLimit=actual?lifespan12(state):null; state.player.realm=effect.realm; changes.push('踏入'+REALMS[effect.realm].name);
    /* 换境界 ⇒ 寿元变了 ⇒ 登记卡上写的岁数也得跟着变。 */
    if(actual){state.life.cultivation.lifespanLimit=lifespan12(state);}
    if(state.life) { state.life.lastBreakthrough=state.month; log(state,breakthroughRecord(from,effect.realm,state.month,state.life.cultivation?.rulesVersion,actual?{from:oldLimit,to:lifespan12(state)}:null)); }
  }
  if (effect.location) state.player.location = effect.location;
  if (effect.home) state.player.home = effect.home;
  if (effect.focus) state.player.focus = effect.focus;
  if (effect.survivors) state.world.survivors = bound(state.world.survivors + effect.survivors, 0, 256);
  if (effect.deadline !== undefined) state.world.masterDeadline = effect.deadline;
  if (effect.extendDeadline && state.world.masterDeadline !== null) state.world.masterDeadline += effect.extendDeadline;
  Object.assign(state.flags, effect.flags || {});
  for (const [id, change] of Object.entries(effect.people || {})) {
    const person = state.people[id];
    if (!person) throw new Error('未知人物：' + id);
    if (person.status === 'dead' && change.status && change.status !== 'dead') throw new Error('不能让已死人物复活：' + id);
    if (change.status) {
      if (person.status !== change.status) changes.push(person.name + ({ alive: '获救', dead: '离世', captured: '被困', missing: '失踪' }[change.status]));
      person.status = change.status; person.alive = change.status !== 'dead';
      if (!person.alive) person.deathMonth ??= state.month;
    }
    if (change.bond) person.bond = bound(person.bond + change.bond, 0, 100);
    if (change.location) person.location = change.location;
    if (change.known !== undefined) person.known = change.known;
  }
  for (const [id, status] of Object.entries(effect.property || {})) {
    if (!state.life) continue;
    const old = state.life.properties[id];
    if (!old && status !== 'kept') continue;
    const property = old || { id, name: state.player.home, location: state.player.location, acquired: state.month, value: 12 };
    if (old?.status !== status) changes.push(property.name + ({ kept: old ? '修好或重新安顿' : '获得', damaged: '损坏', lost: '失去' }[status]));
    property.status = status; property.changed = state.month;
    if (status === 'kept') { property.location = state.player.location; if (id === 'dwelling') property.name = state.player.home; }
    state.life.properties[id] = property;
  }
  return changes;
}

function arrive(state, event) {
  const node = eventNode(state,event);
  if(node&&state.life?.cultivation)encounterPeople(state,nodeText(node,state),event);
  if (!node) throw new Error('缺少故事：' + event);
  if (state.life?.queue?.event === event) state.life.queue = null;
  if (state.life && event.startsWith('visit_')) {
    const destination = event.slice(6), together = personHere(state, 'ally');
    applyEffects(state, { location: destination, home: regionInfo(state, destination).dwelling + '客舍', ...(together ? { people: { ally: { location: destination } } } : {}) });
  }
  state.journey = null; state.act = node.act;
  const entry = value(node.enter, state);
  if (state.life && node.id === 'beacon' && state.world.masterDeadline !== null && entry?.deadline !== null) entry.deadline = Math.min(entry.deadline, state.world.masterDeadline);
  applyEffects(state, entry);
  state.pending = { event, month: state.month };
  log(state, { kind: 'story', event, title: node.title, body: nodeText(node, state), ...(state.life ? { location: state.player.location, context: activityContext(state) } : {}) });
  if (state.life) markEvent(state, event);
}

function end(state, id, body = '') {
  if (!ENDINGS[id]) throw new Error('未知终章：' + id);
  state.ending = { id, ...ENDINGS[id], month: state.month, final: body };
  state.phase = 'ended'; state.pending = null; state.journey = null; state.waiting = false;
  if(state.life?.cultivation?.mundane){const m=state.life.cultivation.mundane;if(m.action)m.notes.push('unfinished:'+m.action.kind);m.action=null;m.arc=null;state.life.cultivation.context=null;}
  if (state.life?.arc) {
    state.life.expeditions.push({ ...cloneRun(state.life.arc), ended: state.month, status: 'died' });
    state.life.arc = null; state.life.suspended = null; state.life.queue = null;
  }
  if (state.life) { state.life.suspended = null; state.life.queue = null; state.life.arcPause = null; }
  log(state, { kind: 'ending', title: ENDINGS[id].title, body: state.life ? contextualText(ENDINGS[id].text, state) : ENDINGS[id].text });
}

export function choose(state, choiceId) {
  if (state.phase !== 'life' || !state.pending || state.waiting) throw new Error('目前没有可以回应的事件。');
  const node = currentNode(state), original = choice12(state,progressionChoice(state,node.choices.find(choice => choice.id === choiceId),node.id),node.id);
  const selected = original && state.life?.feedback && node.id === 'retreat' && choiceId === 'nascent' ? { ...original, interrupt: undefined, deferEffects: true, startReply: '你备好炉心与药，安排收信的人，开始尝试孕育元婴。', effects: { realm: 4, flags: { nascent: true }, stats: { health: 10 } }, reply: '你完成了这一程闭关，元婴在体内成形。出关后，你先查看这些年收到的来信，再决定接下来的路。' } : original;
  if (!selected) throw new Error('没有这个选项。');
  const presented = options(state).find(option => option.id === choiceId);
  if (!presented) throw new Error('当前故事没有这个选项。');
  if (!presented.enabled) throw new Error(presented.reasons.join('；'));
  const before = cloneRun(state);
  // All presentation and conditional effects use the same pre-choice snapshot.
  const cost = presented.cost;
  const success = !selected.check || random(state, 'story') * 100 < presented.chance;
  const revisited = node.id === 'crossroads' && choiceId === 'near' && state.decisions.some(d => d.event === 'relic_door');
  let reply = revisited ? '你把已经走过的遗迹路线补完整，留给后来要进门的人。这段经历不再重演，新的消息仍会在往后的年月里抵达。' : contextualText(value(success ? selected.reply : selected.check.failText, before), before);
  if(before.life?.cultivation)reply=cultivationText(reply,before,node.id,'reply');
  const chosenEffects = value(success ? selected.effects : selected.check.failure, before);
  state.pending = null;
  if (cost.stones){state.player.stones -= cost.stones;if(state.life?.cultivation)state.life.cultivation.economy.spent+=cost.stones;}
  if (cost.debt) state.flags.debt = (state.flags.debt || 0) + cost.debt;
  for (const item of cost.items || []) state.inventory = state.inventory.filter(existing => existing !== item);
  const changes = [];
  if (cost.stones) changes.push('花费' + cost.stones + '灵石');
  if (cost.debt) changes.push('欠下' + cost.debt + '灵石路费，之后从净结余偿还');
  for (const item of cost.items || []) changes.push('用掉' + ITEMS[item].name);
  if (node.id === 'siege') state.player.homeBeforeWar = state.player.home;
  const deferred = Boolean(selected.deferEffects);
  changes.push(...applyEffects(state, node.after), ...applyEffects(state, selected.immediate));
  if (!deferred) changes.push(...applyEffects(state, chosenEffects));
  if (node.id === 'siege') {
    const rescued = (state.flags.evacuated ? 12 : 0) + (state.flags.escapeReady && state.flags.escapeWay ? 8 : 0) + (state.flags.fieldMedicine ? 6 : 0);
    state.world.survivors = bound(state.world.survivors + rescued, 0, 256);
    if (rescued) changes.push('前期准备多保全' + rescued + '人');
  }
  const ending = success ? selected.ending : selected.check?.failEnding;
  const authoredNext = value(!success && selected.check?.failNext ? selected.check.failNext : selected.next ?? node.next, state);
  const next = state.life ? continuation(state, node.id, selected, success, authoredNext) : authoredNext;
  const actionTrip=cultivationActionTrip(state,selected.system);
  const months = Math.max(cultivationDeliveryMonths(state,selected),actionTrip?.months||0,!success && selected.check?.failMonths !== undefined ? selected.check.failMonths : selected.months ?? node.months ?? 0);
  state.decisions.push({ event: node.id, choice: choiceId, month: state.month, success, chance: presented.chance });
  let start = deferred ? contextualText(value(selected.startReply, before), before) : reply;
  if(before.life?.cultivation)start=cultivationText(start,before,node.id,'reply');
  log(state, { kind: deferred ? 'plan' : 'choice', event: node.id, choice: choiceId, title: presented.label, body: start, success: deferred ? true : success, changes });
  state.result = { event: node.id, title: presented.label, body: start, success: deferred ? true : success, chance: presented.chance, changes, months, next: next || null, planned: selected.interrupt ? months : null, provisional: deferred, completed: false };
  state.revision++;
  if (state.life && node.id === 'urgent_message') {
    respondToCrisis(state, choiceId, callbacks(state));
    state.waiting = false;
    return state.result;
  }
  if (state.life) beginAction(state, node.id, selected);
  if (ending && !(state.life && deferred)) end(state, ending, reply);
  else {
    if ((!state.life || next) && !eventNode(state,next)) throw new Error('故事没有后续：' + node.id + '/' + choiceId);
    state.waiting = !state.life;
    state.journey = { from: state.month, to: state.month + months, target: next || null, event: node.id, choice: choiceId, practice: state.player.focus, ...(actionTrip?{cultivationActionTravel:actionTrip}:{}), ...(selected.interrupt ? { interrupt: { month: state.month + selected.interrupt.after, target: selected.interrupt.target } } : {}), ...(deferred ? { resolution: { event: node.id, choice: choiceId, title: presented.label, body: reply, success, chance: presented.chance, effects: chosenEffects || {}, ...(ending ? { ending } : {}) } } : {}) };
    if (state.life && months === 0) finishJourney(state);
  }
  return state.result;
}

export function acknowledge(state) {
  if (state.phase === 'ended' || (state.life && !state.waiting)) return state;
  state.waiting = false; state.revision++;
  if (state.journey && state.journey.to <= state.month) arrive(state, state.journey.target);
  return state;
}

function callbacks(state) {
  return { apply: effect => applyEffects(state, effect), log: entry => log(state, entry), arrive: event => arrive(state, event),open:()=>openJourney(state),end:id=>end(state,id), gate: () => true };
}

function finishJourney(state) {
  if(state.journey.cultivationTravel){finishTravel(state,callbacks(state));return;}
  const journey = state.journey, resolution = journey.resolution;
  if (state.life && journey.travelArrival) {
    const { location, companions } = journey.travelArrival;
    applyEffects(state, { location, home: regionInfo(state, location).dwelling + '借住', people: Object.fromEntries(companions.filter(id => state.people[id].status === 'alive').map(id => [id, { location }])) });
    arrive(state, journey.target); return;
  }
  if (state.life && journey.emergencyArrival) {
    const event = emergencyArrival(state, callbacks(state));
    arrive(state, event); return;
  }
  if (state.life && !resolution) {
    if (journey.legacyTarget) arrive(state, journey.target);
    else completeAction(state, journey.event, journey.choice, journey.target, callbacks(state));
    return;
  }
  if (!resolution) { arrive(state, journey.target); return; }
  const changes = applyEffects(state, resolution.effects);
  log(state, { kind: 'choice', event: resolution.event, choice: resolution.choice, title: resolution.title, body: resolution.body, success: resolution.success, changes });
  state.result = { event: resolution.event, title: resolution.title, body: resolution.body, success: resolution.success, chance: resolution.chance, changes, months: 0, next: journey.target, planned: null, provisional: false, completed: true };
  if (state.life) {
    state.waiting = false;
    if (resolution.ending) end(state, resolution.ending, resolution.body);
    else if (journey.legacyTarget) arrive(state, journey.target);
    else completeAction(state, resolution.event, resolution.choice, journey.target, callbacks(state));
    return;
  }
  state.waiting = true;
  state.journey = { from: state.month, to: state.month, target: journey.target, practice: state.player.focus };
}

/** The only monthly simulation step used by normal play, quick travel and tests. */
function tick(state) {
  state.month++;
  state.revision++;
  state.player.practice++;
  /* 寿元随境界与旧伤变动 ⇒ 每月刷新一次，呈现层读到的永远是当前值。 */
  refreshLifespan(state);
  if (!state.life?.cultivation && state.player.practice % 6 === 0 && (!state.life || age(state) >= 16)) {
    const skill = state.journey?.practice || state.player.focus;
    state.player.skills[skill] = Math.round(bound(state.player.skills[skill] + 0.45 * (state.life ? practiceRate(state) : 1), 0, 100) * 100) / 100;
    state.player.health = Math.round(bound(state.player.health + 0.6, 0, 100) * 100) / 100;
  }
  // Net income includes living and travel costs. The UI shows this same rule.
  if (state.month % 12 === 0) {
    const ledger=annualCultivationSettlement(state),earned=ledger?ledger.net:state.life?income(state):2,repaid=state.life?Math.min(Math.max(0,earned),state.flags.debt||0):0;
    if(ledger){state.life.cultivation.economy.last.repaid=repaid;state.life.cultivation.economy.last.balance=bound(state.player.stones+earned-repaid,0,100000);}
    state.player.stones = bound(state.player.stones + earned - repaid, 0, 100000);
    if (repaid) {
      state.flags.debt -= repaid;
      log(state, { kind: 'life', title: '从这一年的结余里还一份路费', body: '偿还' + repaid + '灵石，尚欠' + state.flags.debt + '灵石。路费没有被免去，也没有把人生卡在无钱可走的门前。', changes: ['偿还' + repaid + '灵石'], automatic: true, context: state.life.arc?.id || state.life.mode });
      state.life.automaticCount++;
    }
    if (!state.life && state.month % 120 === 0) log(state, { kind: 'years', title: '又过十年', body: '你仍在' + REGIONS[state.player.location].name + '。修炼、疗养与日常结余已结算。' });
  }
  if (state.people.master.status === 'captured' && state.world.masterDeadline !== null && state.month >= state.world.masterDeadline) {
    applyEffects(state, { people: { master: { status: 'dead' } } });
    if (state.journey?.resolution?.effects?.people?.master?.status === 'alive') delete state.journey.resolution.effects.people.master;
    log(state, { kind: 'loss', title: '阵眼耗尽了最后的灯', body: '求援期限到了，闻竹没能等到接替阵眼的炉火。她的死亡留在这一局中，后面的救援不能让她复活。' });
  }
  if (age(state) >= lifespan12(state)) { end(state, 'old_age'); return; }
  if (state.journey?.interrupt && state.month >= state.journey.interrupt.month) {
    const target = state.journey.interrupt.target;
    log(state, { kind: 'interrupt', title: '急报打断闭关', body: `原计划${duration(state.journey.to - state.journey.from)}，实际只过${duration(state.month - state.journey.from)}。余下年月尚未消耗。` });
    arrive(state, target);
  } else if (state.journey && !state.journey.open && state.month >= state.journey.to) finishJourney(state);
  if (state.life && state.phase === 'life' && !state.pending) livingMonth(state, callbacks(state));
}

export function advance(state, months = 1) {
  if (!Number.isSafeInteger(months) || months < 0 || months > 12000) throw new Error('推进月数无效。');
  if (state.phase !== 'life' || state.waiting || state.pending || !state.journey) return 0;
  let actual = 0;
  while (actual < months && state.phase === 'life' && !state.pending && !state.waiting && state.journey) { tick(state); actual++; }
  return actual;
}

export function advanceToChoice(state) { return advance(state, 12000); }
export function validateRun(state) {
  const fail = message => { throw new Error('试玩存档无效：' + message); };
  const previous = state?.version === PREVIOUS_VERSION && state?.contentRevision === PREVIOUS_CONTENT_REVISION;
  const preview3 = state?.version === PREVIEW3_VERSION && state?.contentRevision === PREVIEW3_CONTENT_REVISION;
  const legacy = state?.version === LEGACY_VERSION && state?.contentRevision === LEGACY_CONTENT_REVISION;
  if (!state || state.product !== 'gui-shan-preview' || state.format !== 1 || (!legacy && !previous && !preview3 && (state.version !== ADVENTURE_VERSION || state.contentRevision !== CONTENT_REVISION))) fail('版本或产品不支持，原档仍保留。');
  if (typeof state.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/u.test(state.id) || typeof state.seed !== 'string' || !state.seed.trim() || state.seed.length > 80) fail('人生编号或种子');
  if (!Number.isSafeInteger(state.revision) || state.revision < 0 || !Number.isSafeInteger(state.month) || state.month < 0 || state.month > 12000 || !Number.isInteger(state.act) || state.act < 0 || state.act >= ACTS.length) fail('时间或进度');
  if (!['life', 'ended'].includes(state.phase)) fail('人生阶段');
  const p = state.player;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || [...p.name].length > 12 || !Object.hasOwn(ORIGINS, p.origin) || !['F', 'M'].includes(p.sex) || !Object.hasOwn(REGIONS, p.location) || !Object.hasOwn(SKILLS, p.focus) || !REALMS[p.realm] || !Number.isInteger(p.realm) || typeof p.home !== 'string' || p.home.length > 60 || !ROOTS[p.root]) fail('人物');
  if (!Number.isSafeInteger(p.practice) || p.practice < 0 || p.practice !== state.month) fail('修炼年月');
  for (const key of Object.keys(statLabels)) if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < 0 || p[key] > (key === 'stones' ? 100000 : 100)) fail('属性 ' + key);
  if (!p.skills || Object.keys(p.skills).length !== 3) fail('技艺');
  for (const key of Object.keys(SKILLS)) if (typeof p.skills[key] !== 'number' || !Number.isFinite(p.skills[key]) || p.skills[key] < 0 || p.skills[key] > 100) fail('技艺 ' + key);
  if (!Array.isArray(state.inventory) || state.inventory.length > Object.keys(ITEMS).length || new Set(state.inventory).size !== state.inventory.length || state.inventory.some(id => !Object.hasOwn(ITEMS, id))) fail('物品');
  if (!state.flags || Array.isArray(state.flags) || Object.keys(state.flags).length > 150) fail('故事标记');
  for (const [key, entry] of Object.entries(state.flags)) if (['constructor', 'prototype'].includes(key) || !/^[a-zA-Z][a-zA-Z0-9]{0,50}$/u.test(key) || !['boolean', 'number', 'string'].includes(typeof entry) || (typeof entry === 'number' && !Number.isFinite(entry)) || (typeof entry === 'string' && entry.length > 80)) fail('故事标记内容');
  if (state.flags.destination !== undefined && !['tide', 'ember', 'sky'].includes(state.flags.destination)) fail('异乡去处');
  if (!state.world || !['beast', 'sovereign'].includes(state.world.threat) || !Number.isInteger(state.world.survivors) || state.world.survivors < 0 || state.world.survivors > 256 || (state.world.masterDeadline !== null && (!Number.isInteger(state.world.masterDeadline) || state.world.masterDeadline < 0 || state.world.masterDeadline > 12000))) fail('世界');
  const castContract = legacy ? ORIGINAL_CAST : CAST;
  if (!state.people || Object.keys(state.people).length !== Object.keys(castContract).length) fail('人物列表');
  for (const id of Object.keys(castContract)) {
    const person = state.people[id];
    const revised=!!state.life?.cultivation,expectedName=revised?state.life.cultivation.progression?.names?.[CAST[id].name]:CAST[id].name,expectedRealm=revised&&['master','sister','friend','trialmate'].includes(id)?Math.min(CAST[id].realm,state.life.cultivation.progression?.sect.npcHighest):CAST[id].realm;
    if (!person || person.id !== id || person.name !== expectedName || person.born !== CAST[id].born || person.realm !== expectedRealm || person.sex !== CAST[id].sex || person.role !== CAST[id].role || !['alive', 'captured', 'missing', 'dead'].includes(person.status) || person.alive !== (person.status !== 'dead') || !Object.hasOwn(REGIONS, person.location) || typeof person.known !== 'boolean' || !Number.isFinite(person.bond) || person.bond < 0 || person.bond > 100) fail('人物状态 ' + id);
    if (person.status === 'dead' && (!Number.isInteger(person.deathMonth) || person.deathMonth < 0 || person.deathMonth > state.month)) fail('死亡时间');
    if (person.status !== 'dead' && person.deathMonth !== null) fail('在世人物的死亡记录');
  }
  const streams = ['birth', 'life', 'people', 'world', 'story', ...(legacy ? [] : ['events', 'daily'])];
  if (!state.random || Object.keys(state.random).length !== streams.length) fail('随机流');
  for (const key of streams) {
    const stream = state.random[key];
    if (!stream || !Number.isInteger(stream.value) || stream.value < 1 || stream.value >= 2147483647 || !Number.isSafeInteger(stream.draws) || stream.draws < 0) fail('随机状态');
  }
  if (!Array.isArray(state.decisions) || state.decisions.length > 100 || !Array.isArray(state.journal) || state.journal.length > 600 || typeof state.waiting !== 'boolean') fail('经历');
  const seen = new Set();
  /*
   * 「再答一次」的例外：**上一次选的是「再准备一段时间」**。
   *
   * 引擎的老规矩是「一个事件 id 一生只答一次」（`urgent_message` 是唯一的例外）。
   * 但突破卡上有一个「再准备一段时间」的选项：玩家说的是「还没准备好，过些日子再来」，
   * 规则层也真的把冷却期设上了（`cultivation.js` 的 `retryAt`）——
   * 显然是想让这张卡**过些日子再来**。
   *
   * ⇒ 以前那句判断把这条路堵死了：选一次「再准备」，**这一境的突破卡就再也不发** ——
   *   人一辈子卡在原地，进度条永远是满的（实测：79 岁还在凡身）。
   *   那正是用户 2026-11-07 报的「境界满 100% 不强制触发突破」的另一种形态。
   *
   * ⇒ 现在：上一次选「再准备」⇒ 这张卡允许再答一次。
   *   （引擎里只有突破卡会被重新发出来 —— 别的卡即使有「再准备」选项也没有重发的逻辑。）
   */
  const again = new Set();
  for (const d of state.decisions) {
    const repeatable = d.event === 'urgent_message' || again.has(d.event);
    if (!eventNode(state,d.event)?.choices.some(c => c.id === d.choice) || !Number.isInteger(d.month) || d.month < 0 || d.month > state.month || typeof d.success !== 'boolean' || (seen.has(d.event) && !repeatable)) fail('抉择记录');
    seen.add(d.event);
    if (d.choice === 'wait') again.add(d.event); else again.delete(d.event);
  }
  for (const [i, entry] of state.journal.entries()) if (entry.id !== i + 1 || !Number.isInteger(entry.month) || entry.month < 0 || entry.month > state.month || typeof entry.title !== 'string' || entry.title.length > 160 || typeof entry.body !== 'string' || entry.body.length > 2000 || (entry.changes !== undefined && (!Array.isArray(entry.changes) || entry.changes.some(c => typeof c !== 'string' || c.length > 100)))) fail('经历文字');
  if (state.result && (typeof state.result.title !== 'string' || typeof state.result.body !== 'string' || !Array.isArray(state.result.changes) || state.result.changes.some(c => typeof c !== 'string' || c.length > 100) || typeof state.result.success !== 'boolean' || !Number.isInteger(state.result.months) || state.result.months < 0 || state.result.months > 12000)) fail('抉择结果');
  if (state.journey?.resolution) {
    const r = state.journey.resolution;
    if (!eventNode(state,r.event)?.choices.some(choice => choice.id === r.choice && (choice.deferEffects || state.life?.feedback && r.event==='retreat' && r.choice==='nascent')) || typeof r.title !== 'string' || typeof r.body !== 'string' || r.body.length > 2000 || typeof r.success !== 'boolean' || !r.effects || Array.isArray(r.effects)) fail('待完成的修行');
    validateEffects(r.effects, state, fail);
  }
  if(state.life?.cultivation?.suspended?.journey?.resolution){const r=state.life.cultivation.suspended.journey.resolution;if(!eventNode(state,r.event)?.choices.some(c=>c.id===r.choice&&c.deferEffects)||typeof r.success!=='boolean')fail('中断的修行结果');validateEffects(r.effects,state,fail);}
  if (state.journey?.travelArrival && (!Object.hasOwn(REGIONS, state.journey.travelArrival.location) || !Array.isArray(state.journey.travelArrival.companions) || state.journey.travelArrival.companions.some(id => !Object.hasOwn(CAST, id)))) fail('行路抵达');
  if (state.phase === 'life') {
    if (state.ending) fail('未结束却已有终章');
    if (Boolean(state.pending) === Boolean(state.journey)) fail('待选与行程互斥');
    if (state.pending && (!eventNode(state,state.pending.event) || (seen.has(state.pending.event) && state.pending.event !== 'urgent_message' && !again.has(state.pending.event)) || state.waiting || state.pending.month !== state.month)) fail('待选事件');
    if (state.journey && (!(state.life && state.journey.target === null) && !eventNode(state,state.journey.target) || !Number.isInteger(state.journey.from) || !Number.isInteger(state.journey.to) || state.journey.from > state.month || state.journey.to < state.month || state.journey.to > 12000 || !Object.hasOwn(SKILLS, state.journey.practice))) fail('行程');
    if (state.journey?.interrupt && (!eventNode(state,state.journey.interrupt.target) || !Number.isInteger(state.journey.interrupt.month) || state.journey.interrupt.month <= state.journey.from || state.journey.interrupt.month > state.journey.to || state.journey.interrupt.month < state.month)) fail('中断事件');
    if (state.waiting && (!state.result || !state.journey)) fail('待读结果');
  } else if (!state.ending || !Object.hasOwn(ENDINGS, state.ending.id) || state.ending.title !== ENDINGS[state.ending.id].title || state.ending.text !== ENDINGS[state.ending.id].text || typeof state.ending.final !== 'string' || state.ending.final.length > 2000 || state.pending || state.journey || state.waiting || state.ending.month !== state.month) fail('终章');
  if (!legacy) validateLiving(state, fail);
  validateCultivation(state,fail);
  return state;
}

function validateLiving(state, fail) {
  const birth = state.birth, life = state.life;
  if (!birth || !Object.hasOwn(BIRTHPLACES, birth.continent) || !Object.hasOwn(WORLD_ERAS, birth.era) || !Object.hasOwn(FAMILIES, birth.family) || !Object.hasOwn(LIFE_GOALS, birth.goal) || ![0, 16].includes(birth.startAge) || !Number.isInteger(birth.year) || typeof birth.address !== 'string' || birth.address.length > 60 || (birth.startAge === 16 && birth.legacy !== true)) fail('出生世界');
  if (!life || life.format !== 1 || !['childhood', 'home', 'refuge', 'abroad', 'return', 'settled'].includes(life.mode) || typeof life.activity !== 'string' || life.activity.length > 160 || !Number.isInteger(life.modeSince) || life.modeSince < 0 || life.modeSince > state.month || !Number.isInteger(life.activitySince) || life.activitySince < 0 || life.activitySince > state.month) fail('人生流转');
  for (const key of ['choiceAt', 'dailyAt', 'upheavalAt']) if (!Number.isInteger(life[key]) || life[key] < 0 || life[key] > 13000) fail('事件时钟');
  for (const key of ['foreignAt', 'letterAt', 'settlementEnd']) if (life[key] !== null && (!Number.isInteger(life[key]) || life[key] < 0 || life[key] > 13000)) fail('世界时钟');
  if (!['war', 'devour', 'decree'].includes(life.upheavalKind) || !Number.isInteger(life.automaticCount) || life.automaticCount < 0 || !Array.isArray(life.recent) || life.recent.length > 4 || !life.memory || Array.isArray(life.memory)) fail('自动经历');
  for (const [id, entry] of Object.entries(life.memory)) if (!/^[a-z_]{1,60}$/u.test(id) || !Number.isInteger(entry.count) || entry.count < 1 || entry.count > 3 || !Number.isInteger(entry.last) || entry.last < 0 || entry.last > state.month) fail('自动经历记忆');
  if (life.queue && (!eventNode(state,life.queue.event) || !Number.isInteger(life.queue.due) || life.queue.due < state.month || life.queue.due > 13000 || state.decisions.some(d => d.event === life.queue.event))) fail('因果后续');
  if (!Array.isArray(life.expeditions) || life.expeditions.length > 6 || !Array.isArray(life.interruptions) || life.interruptions.length > 12 || !Array.isArray(life.unreadNews) || life.unreadNews.length > 4) fail('长事件历史');
  for (const arc of [...life.expeditions, ...(life.arc ? [life.arc] : [])]) {
    if (!['valley', 'cavern', 'outer'].includes(arc.id) || !Number.isInteger(arc.started) || arc.started < 0 || arc.started > state.month || !Object.hasOwn(REGIONS, arc.region) || !eventNode(state,arc.stage) || !Array.isArray(arc.visited) || arc.visited.length > 16 || arc.visited.some(id => !eventNode(state,id))) fail('长事件状态');
    if (arc.ended !== undefined && (!Number.isInteger(arc.ended) || arc.ended < arc.started || arc.ended > state.month || !['returned', 'interrupted', 'died'].includes(arc.status))) fail('长事件结算');
  }
  if (life.crisis && (!['homeFall', 'cityAttack', 'homeCall'].includes(life.crisis.kind) || !eventNode(state,life.crisis.event) || !Number.isInteger(life.crisis.deadline) || life.crisis.deadline < 0 || life.crisis.deadline > 13000 || typeof life.crisis.message !== 'string' || life.crisis.message.length > 1000 || !Number.isInteger(life.crisis.travel) || life.crisis.travel < 1 || life.crisis.travel > 36 || ![null, 'voice', 'message'].includes(life.crisis.channel) || typeof life.crisis.notified !== 'boolean' || typeof life.crisis.resolved !== 'boolean')) fail('紧急传讯');
  if (life.crisis && !Object.hasOwn(REGIONS, life.crisis.location)) fail('急讯所在地域');
  if (state.pending?.event === 'urgent_message' && (!life.suspended || !life.crisis?.notified)) fail('急讯缺少被暂停的经历');
  if (life.suspended) {
    const journey = life.suspended;
    if (!Number.isInteger(journey.from) || !Number.isInteger(journey.to) || journey.from > state.month || journey.to < state.month || journey.to > 12000 || !Object.hasOwn(SKILLS, journey.practice)) fail('暂存的长事件');
    if (journey.resolution) validateEffects(journey.resolution.effects, state, fail);
  }
  if (life.family) {
    const f=life.family;
    if(!Object.hasOwn(FAMILIES,f.kind)||!Number.isFinite(f.bond)||f.bond<0||f.bond>100||!Number.isFinite(f.reserve)||f.reserve<0||f.reserve>1000||!Number.isInteger(f.nextAt)||!Array.isArray(f.members)||f.members.length!==2) fail('家族状态');
    for(const p of f.members) if(typeof p.name!=='string'||p.name.length>16||!['alive','dead'].includes(p.status)||!Object.hasOwn(REGIONS,p.location)||!Number.isInteger(p.deathAt)) fail('家中亲人');
  }
  if(life.arcPause){ const j=life.arcPause.journey; if(!j||!Number.isInteger(j.from)||!Number.isInteger(j.to)||!Number.isInteger(life.arcPause.month))fail('探险暂存');if(j.resolution)validateEffects(j.resolution.effects,state,fail); }
  if (!life.properties || Array.isArray(life.properties) || Object.keys(life.properties).length > 8) fail('财产');
  for (const [id, property] of Object.entries(life.properties)) if (!['family_home', 'dwelling'].includes(id) || property.id !== id || typeof property.name !== 'string' || property.name.length > 100 || !Object.hasOwn(REGIONS, property.location) || !['kept', 'damaged', 'lost'].includes(property.status) || !Number.isInteger(property.acquired) || property.acquired < 0 || property.acquired > state.month || !Number.isInteger(property.changed) || property.changed < 0 || property.changed > state.month || !Number.isFinite(property.value) || property.value < 0 || property.value > 10000) fail('财产记录');
}

function validateEffects(effect, state, fail) {
  if (Object.keys(effect).some(key => !['stats', 'skills', 'items', 'remove', 'realm', 'location', 'home', 'focus', 'survivors', 'flags', 'people', 'deadline', 'extendDeadline', 'property'].includes(key))) fail('待完成事件的效果');
  for (const [key, number] of Object.entries(effect.stats || {})) if (!Object.hasOwn(statLabels, key) || !Number.isFinite(number) || Math.abs(number) > 100000) fail('待完成事件的属性');
  for (const [key, number] of Object.entries(effect.skills || {})) if (!Object.hasOwn(SKILLS, key) || !Number.isFinite(number) || Math.abs(number) > 100) fail('待完成事件的技艺');
  for (const id of [...(effect.items || []), ...(effect.remove || [])]) if (!Object.hasOwn(ITEMS, id)) fail('待完成事件的物品');
  if (effect.realm !== undefined && (!Number.isInteger(effect.realm) || !REALMS[effect.realm])) fail('待完成事件的境界');
  if (effect.location && !Object.hasOwn(REGIONS, effect.location)) fail('待完成事件的地点');
  if (effect.focus && !Object.hasOwn(SKILLS, effect.focus)) fail('待完成事件的重心');
  if (effect.home !== undefined && (typeof effect.home !== 'string' || effect.home.length > 60)) fail('待完成事件的住处');
  if (effect.survivors !== undefined && (!Number.isInteger(effect.survivors) || Math.abs(effect.survivors) > 256)) fail('待完成事件的同行者');
  if (effect.deadline !== undefined && effect.deadline !== null && (!Number.isInteger(effect.deadline) || effect.deadline < 0 || effect.deadline > 12000)) fail('待完成事件的期限');
  if (effect.extendDeadline !== undefined && (!Number.isInteger(effect.extendDeadline) || effect.extendDeadline < 0 || effect.extendDeadline > 12000)) fail('待完成事件的延期');
  for (const [key, entry] of Object.entries(effect.flags || {})) if (!/^[a-zA-Z][a-zA-Z0-9]{0,50}$/u.test(key) || ['constructor', 'prototype'].includes(key) || !['boolean', 'number', 'string'].includes(typeof entry) || (typeof entry === 'number' && !Number.isFinite(entry))) fail('待完成事件的标记');
  if (effect.flags?.destination !== undefined && !['tide', 'ember', 'sky'].includes(effect.flags.destination)) fail('待完成事件的异乡');
  for (const [id, p] of Object.entries(effect.people || {})) {
    if (!Object.hasOwn(CAST, id) || Object.keys(p).some(key => !['status', 'bond', 'location', 'known'].includes(key)) || (p.status && !['alive', 'dead', 'captured', 'missing'].includes(p.status)) || (p.location && !Object.hasOwn(REGIONS, p.location)) || (p.bond !== undefined && (!Number.isFinite(p.bond) || Math.abs(p.bond) > 100))) fail('待完成事件的人物');
    if (state.people[id].status === 'dead' && p.status && p.status !== 'dead') fail('待完成事件会复活死者');
  }
  for (const [id, status] of Object.entries(effect.property || {})) if (!['family_home', 'dwelling'].includes(id) || !['kept', 'damaged', 'lost'].includes(status)) fail('待完成事件的财产');
}

export function review(state) {
  validateRun(state);
  const people = Object.values(state.people).filter(person => person.known).map(person => ({ ...person, age: (state.birth?.startAge ?? 16) + Math.floor(((person.deathMonth ?? state.month) - person.born) / 12) }));
  const visited = [...new Set(state.journal.filter(entry => entry.kind === 'story').map(entry => {
    const id = entry.event;
    return id.startsWith('landing_') ? id.slice(8) : id.startsWith('visit_') ? id.slice(6) : null;
  }).filter(Boolean))];
  return { age: age(state), decisions: state.decisions.length, failures: state.decisions.filter(d => !d.success).length, people, visited, aid: aid(state), survivors: state.world.survivors, realm: REALMS[state.player.realm].name, automatic: state.life?.automaticCount || 0, expeditions: cloneRun(state.life?.expeditions || []) };
}
