import { familyState, familyAvailable } from './family.js';
import {playbackSeconds} from './progression.js';
import { cultivationMonth, cultivationActivity, cultivationIncome, completeCultivationAction, currentContinent, beginCultivationAction } from './cultivation.js';
import { EXPEDITION_CHANGES } from '../../content/expedition-changes.js';
import { random, hashText } from '../core/random.js';
import { NODES, REGIONS, SKILLS } from '../../content/adventure.js';
import { EPISODES, ARC_EVENTS } from '../../content/living-episodes.js';
import { AUTOMATIC_EVENTS } from '../../content/automatic-life.js';
import { AUTOMATIC_TEXT } from '../../content/readable-automatic.js';
import { BIRTHPLACES, FAMILIES, TRAINING_GROUNDS, WORLD_ERAS } from '../../content/living-world.js';
import { LOCATORS, activityContext, ordinaryLife, personHere, messageChannel } from './context.js';

const copy = value => JSON.parse(JSON.stringify(value));
const draw = (s, min, max) => min + Math.floor(random(s, 'events') * (max - min + 1));
const known = (s, event) => s.decisions.some(d => d.event === event) || s.journal.some(e => e.kind === 'story' && e.event === event);
const age = s => (s.birth?.startAge ?? 16) + Math.floor(s.month / 12);
const regional = s => s.decisions.filter(d => /^(?:tide_|ember_|sky_|visit_|relic_|cavern_)/u.test(d.event)).length;
const isLong = s => Boolean(s.life.arc || s.journey?.resolution || s.journey?.interrupt);

export function regionInfo(state, id = state.player.location) {
  if(state.life?.cultivation&&arguments.length===1){const actual=currentContinent(state);return {...REGIONS[actual],name:BIRTHPLACES[actual].name,dwelling:state.player.home};}
  if (id !== 'home' && id !== 'refuge') return REGIONS[id];
  const origin = BIRTHPLACES[state.birth?.continent || 'home'];
  return { ...REGIONS[id], name: origin.name, art: origin.art, dwelling: id === 'home' ? origin.mountain : origin.refuge, caption: id === 'home' ? origin.sect + '与周围的城镇' : '离宗者与伤员暂居的渡口' };
}
export function contextualText(input, state) {
  const original = BIRTHPLACES[state.birth?.continent || 'home'];
  if(state.life?.cultivation)return String(input||'').replaceAll('渡云宗',original.sect).replaceAll('渡云山',original.mountain).replaceAll('望渡镇',original.refuge);
  return String(input || '').replaceAll('渡云宗', original.sect).replaceAll('渡云山', original.mountain).replaceAll('望渡镇', original.refuge).replaceAll('青岚', original.name.replace(/大陆$/u, ''));
}
export function inferMode(state) {
  if (age(state) < 16) return 'childhood';
  if (state.flags.rebuilt || state.flags.relocated || state.pending?.event === 'final_choice' || state.pending?.event === 'far_finale') return 'settled';
  if (state.flags.returning || state.flags.staying) return 'return';
  if (state.flags.destination) return 'abroad';
  if (state.flags.sectLost) return 'refuge';
  return 'home';
}
export function initializeLife(state, migration = false) {
  for (const key of ['events', 'daily']) state.random[key] = { value: hashText(state.seed + ':' + key) % 2147483646 + 1, draws: 0 };
  // Migration does not draw any random number or replay elapsed months.
  const timer = (min, max, salt) => migration ? min + hashText(state.seed + ':' + salt) % (max - min + 1) : draw(state, min, max);
  const mode = inferMode(state);
  state.life = {
    feedback: !migration, family: familyState(state,migration), lastBreakthrough: null, arcPause: null,
    format: 1, mode, modeSince: state.month, activity: '', activitySince: state.month,
    choiceAt: state.month + (mode === 'childhood' ? 72 : timer(9, 14, 'choice')),
    dailyAt: state.month + (mode === 'childhood' ? 12 : timer(4, 8, 'daily')),
    recent: [], memory: {}, automaticCount: 0, queue: null, arc: null, expeditions: [],
    upheavalAt: (state.birth.startAge === 0 ? 16 * 12 : 0) + timer(84, 300, 'upheaval'),
    upheavalKind: ['war', 'devour', 'decree'][timer(0, 2, 'kind')],
    foreignAt: mode === 'abroad' ? state.month + timer(72, 144, 'foreign') : null,
    letterAt: mode === 'abroad' ? state.month + timer(156, 228, 'letter') : null,
    settlementEnd: mode === 'settled' ? state.month + timer(120, 216, 'settled') : null,
    crisis: null, suspended: null, interruptions: [], unreadNews: [],
    properties: {
      family_home: { id: 'family_home', name: migration ? '故乡旧屋' : state.birth.family === 'noble' ? '家中旧铺与宅屋' : state.birth.family === 'clan' ? '家中灵田与宅屋' : '家中旧屋', location: 'home', status: state.flags.sectLost ? 'lost' : 'kept', acquired: 0, changed: state.month, value: state.birth.family === 'noble' ? 80 : 28 },
    },
  };
  if (mode !== 'childhood') state.life.properties.dwelling = { id: 'dwelling', name: state.player.home, location: state.player.location, status: 'kept', acquired: state.month, changed: state.month, value: 12 };
  state.life.activity = activityLabel(state);
  return state;
}
export function activityLabel(state) {
  if(state.life?.cultivation)return cultivationActivity(state);
  if (state.life.arc) return TRAINING_GROUNDS.find(g => g.id === state.life.arc.id).name + '中的修行与探索';
  if (state.life.mode === 'childhood') return '在' + state.birth.address + '长大';
  const journey = state.journey || state.life.suspended;
  if (activityContext(state) === 'travel') return '在界门与渡船之间赶路';
  if (journey?.resolution) return journey.resolution.title;
  if (journey?.interrupt) return '石门内的闭关';
  if (state.life.mode === 'return') return '为归来与救援行路';
  if (state.life.mode === 'settled') return '安顿后来的人，继续' + SKILLS[state.player.focus] + '修行';
  if (state.life.mode === 'refuge') return '在渡口修器、疗伤，照看离散的人';
  return '在' + regionInfo(state).dwelling + '练' + SKILLS[state.player.focus] + '，过寻常日子';
}
export function monthSeconds(state) {
  if(state.life?.cultivation?.rulesVersion>=8)return playbackSeconds(state);
  if(state.life?.cultivation?.rulesVersion===7){
    const years=age(state),c=state.life.cultivation;
    const seconds=years<6?3:years<16?6:c.activeChain||c.network?.arc?8:state.journey?.resolution?6:years<30?8:state.player.realm<2?6:state.player.realm<3?4:3;
    return seconds/12;
  }
  if (age(state) < 16) return 1 / 12;
  if(state.life?.cultivation){const pace=({0:6,1:6,2:4,3:2.8,4:2})[state.player.realm];return Math.min(pace,age(state)>=100?2.8:age(state)>=65?4:6)/12;}
  return ({ 0: 6, 1: 6, 2: 4, 3: 2.8, 4: 2 }[state.player.realm] || 6) / 12;
}
export function income(state) { return state.life?.cultivation ? cultivationIncome(state) : age(state) < 16 ? 0 : state.birth.family === 'noble' ? 4 : state.birth.family === 'clan' ? 3 : 2; }
export function practiceRate(state) { return state.birth.legacy ? 1 : WORLD_ERAS[state.birth.era].practice; }
export function openJourney(state) {
  state.journey = { from: state.month, to: 12000, target: null, practice: state.player.focus, open: true };
  state.life.activity = activityLabel(state); state.life.activitySince = state.month;
}
function gap(state) {
  if (state.life.mode === 'childhood') return Math.max(1, 16 * 12 - state.month);
  if (state.life.mode === 'refuge') return draw(state, 8, 18);
  if (state.life.mode === 'settled') return draw(state, 30, 60);
  return draw(state, 18, 36);
}
export function trainingOptions(state) {
  if(state.life?.cultivation)return [];
  return TRAINING_GROUNDS.map(ground => {
    const reasons = [];
    if (age(state) < 16) reasons.push('尚未入门');
    if (state.player.realm < ground.realm) reasons.push('需达到' + ['凡身', '炼气', '筑基', '金丹'][ground.realm]);
    if (state.player.realm > ground.maxRealm) reasons.push('当前境界不适合此处灵压');
    if (ground.id === 'valley' && (state.life.mode !== 'home' || state.player.location !== 'home' || state.flags.sectLost)) reasons.push('须在仍开放的本宗山门');
    if (ground.id !== 'valley' && state.life.mode !== 'abroad') reasons.push('须先在异乡安顿');
    if (ground.id === 'cavern' && !state.flags.cavernClue) reasons.push('尚未获得洞府路线');
    if (ground.id === 'outer' && !LOCATORS.some(id => state.inventory.includes(id))) reasons.push('须有阵钥、天图或界门锚');
    if (ground.id === 'outer' && (!state.people.ally.known || state.people.ally.status !== 'alive' || state.people.ally.bond < 35)) reasons.push('须有信任你的异乡同行者');
    if (ground.id === 'cavern' && (!state.people.ally.known || state.people.ally.status !== 'alive')) reasons.push('须有在世的异乡同行者');
    if (ground.id !== 'valley' && state.people.ally.known && state.people.ally.status === 'alive' && !personHere(state, 'ally')) reasons.push('须与嵇萝在同一地域会合');
    if (known(state, ground.invitation) && state.pending?.event !== ground.invitation) reasons.push('这一轮机会已作回应');
    if(state.life.feedback && !state.flags[ground.id+'Briefed']) reasons.push('尚未核实任务、路线与接应');
    if(state.life.feedback && state.life.lastBreakthrough!==null && state.month-state.life.lastBreakthrough<12) reasons.push('刚出关，先安顿日常再准备远行');
    if (state.life.arc || state.journey && !state.journey.open) reasons.push('须先结束或中断当前经历');
    if (state.pending && state.pending.event !== ground.invitation || state.waiting || state.phase !== 'life') reasons.push('当前有待回应事件');
    return { ...ground, enabled: reasons.length === 0, reasons };
  });
}
export function markEvent(state, event) {
  if (state.life.arc && ARC_EVENTS[state.life.arc.id].includes(event)) {
    if (!state.life.arc.visited.includes(event)) state.life.arc.visited.push(event);
    state.life.arc.stage = event;
  }
  state.life.activity = activityLabel(state);
}
export function beginAction(state, event, selected) {
  if(state.life?.cultivation){beginCultivationAction(state,selected);state.life.activity=activityLabel(state);state.life.activitySince=state.month;return;}
  for (const [id, events] of Object.entries(ARC_EVENTS)) if (event === events[0] && selected.id === 'enter') {
    state.life.arc = { id, started: state.month, tier: TRAINING_GROUNDS.find(g => g.id === id).realm, stage: event, region: state.player.location, visited: [event], supplies: 20, threatAt: state.month + draw(state,18,30), hazardCount: 0 };
    state.flags.expeditionWithdraw=false; state.flags.companionDied=false;
  }
  if (['siege', 'devouring_night', 'fall_decree'].includes(event)) {
    state.life.mode = 'refuge'; state.life.modeSince = state.month;
    if (state.life.crisis?.kind === 'homeFall') state.life.crisis.resolved = true;
  }
  if (event === 'letter') { state.life.mode = 'return'; state.life.modeSince = state.month; }
  if (event === 'beast_attack') {
    state.flags.foreignSeen = true;
    if (state.life.crisis?.kind === 'cityAttack') state.life.crisis.resolved = true;
  }
  if (event === 'cave') {
    state.life.properties.dwelling = { id: 'dwelling', name: state.player.home, location: state.player.location, status: 'kept', acquired: state.month, changed: state.month, value: selected.cost?.stones || 6 };
  }
  state.life.activity = activityLabel(state); state.life.activitySince = state.month;
}
export function continuation(state, event, selected, success, authoredNext) {
  if(state.life?.cultivation)return null;
  if (event === 'urgent_message' || Object.hasOwn(EXPEDITION_CHANGES,event) || event.endsWith('_notice') || event.startsWith('family_')) return null;
  if (Object.values(ARC_EVENTS).some(events => events.includes(event))) return selected.next || null;
  if (event === 'childhood' || event === 'family_claim' || event === 'trial_echo' || event === 'treasure_claim') return null;
  if (event === 'golden' && !success) return 'golden_repair';
  if (event === 'crossroads' && authoredNext && known(state, authoredNext)) return null;
  if (['gate', 'crossroads', 'letter', 'retreat', 'beacon', 'assemble', 'return_gate', 'home_ruins', 'enemy_terms', 'rescue', 'return_battle', 'last_rescue', 'far_cost'].includes(event)) return authoredNext;
  if (event === 'beast_attack' && (!success || selected.id === 'shelter')) return 'beast_wake';
  return null;
}
export function completeAction(state, event, choice, next, callbacks) {
  if(state.life?.cultivation){completeCultivationAction(state,event,choice,callbacks);return;}
  if(event==='family_help') {
    const f=state.life.family;
    if(choice==='send'){f.reserve=Math.min(1000,f.reserve+12);f.bond=Math.min(100,f.bond+10);}else{f.reserve=Math.max(0,f.reserve-12);f.visits++;}
    f.nextAt=state.month+72;
  }
  if(event==='family_reunion' && choice==='welcome') for(const p of state.life.family.members)if(p.status==='alive')p.location=state.player.location;
  if(Object.hasOwn(EXPEDITION_CHANGES,event) && state.life.arcPause) {
    const saved=state.life.arcPause; state.life.arcPause=null;
    if(state.flags.expeditionWithdraw) {
      const exit={valley:'trial_return',cavern:'cavern_exit',outer:'outer_return'}[state.life.arc.id];
      state.life.queue={event:exit,due:state.month+3};openJourney(state);return;
    }
    if(choice==='buy'||state.flags.supplyForaged){state.life.arc.supplies=20;state.flags.supplyForaged=false;}
    const elapsed=state.month-saved.month;
    state.journey=saved.journey; if(!state.journey.open)state.journey.to+=elapsed;
    state.life.queue=saved.queue;if(state.life.queue)state.life.queue.due+=elapsed;
    state.life.arc.threatAt=state.month+draw(state,18,36);return;
  }
  if (event === 'gate') {
    state.life.mode = 'abroad'; state.life.modeSince = state.month;
    state.life.foreignAt = state.month + draw(state, 96, 180);
    state.life.letterAt = state.month + draw(state, 276, 396);
    callbacks.apply({ property: { dwelling: 'kept' } });
  }
  const exits = { trial_return: 'valley', cavern_exit: 'cavern', outer_return: 'outer' };
  if (exits[event] && state.life.arc?.id === exits[event]) {
    state.life.expeditions.push({ ...copy(state.life.arc), ended: state.month, status: state.flags.expeditionWithdraw ? 'interrupted' : 'returned' });
    state.life.arc = null;
    if (state.flags.sectLost && state.life.mode === 'home') {
      state.life.mode = 'refuge'; state.life.modeSince = state.month;
      callbacks.apply({ location: 'refuge', home: '渡口草棚' });
    }
  }
  if (event === 'rebuild' || event === 'last_rescue' || event === 'far_cost') {
    state.life.mode = 'settled'; state.life.modeSince = state.month;
    state.life.settlementEnd = state.month + draw(state, 120, 216);
    if (event === 'rebuild') next = null;
    if (event === 'last_rescue' || event === 'far_cost') next = null;
  }
  if (event === 'childhood') state.life.choiceAt = 16 * 12 + 9;
  else state.life.choiceAt = state.month + gap(state);
  state.life.queue = next ? { event: next, due: state.month + draw(state, 3, 8) } : null;
  openJourney(state);
}
function chooseWeighted(state, entries, stream) {
  let pick = random(state, stream) * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of entries) { pick -= entry.weight; if (pick < 0) return entry.id; }
  return entries.at(-1).id;
}
function candidates(state) {
  const out = [], add = (id, weight, condition = true) => { if (condition && !known(state, id)) out.push({ id, weight }); };
  const mode = state.life.mode, yearsHere = (state.month - state.life.modeSince) / 12;
  if (mode === 'childhood') { add('childhood', 1, age(state) >= 6); return out; }
  if (!ordinaryLife(state)) return out;
  if (mode === 'home') {
    if (!known(state, 'entry')) { add('entry', 1); return out; }
    add('lesson', 1.3, state.player.realm >= 1 && state.people.friend.status === 'alive');
    add('mission_' + state.player.focus, 1.4, state.player.realm >= 1);
    add('cave', 1.6, state.player.realm >= 1 && yearsHere >= 2);
    add('family_claim', 0.9, !state.birth.legacy && state.birth.family !== 'common');
    add('omen', 2.4, state.month >= state.life.upheavalAt - 18 && state.life.upheavalKind !== 'devour');
    add('war_council', 2.5, state.month >= state.life.upheavalAt - 6 && (state.flags.warned || known(state, 'omen')));
  }
  if (mode === 'refuge') {
    add('refugees', 2.5);
    add('hunter', state.flags.marked ? 4 : 0.8, yearsHere >= 1);
    add('foundation', 3, state.player.realm === 1 && age(state) >= 20);
    add('gate', 4, state.player.realm >= 2);
  }
  if (mode === 'abroad') {
    const loc = state.player.location;
    if (loc === 'tide') {
      add('tide_wreck', 1.4, !state.flags.beastMercy && !state.flags.beastSold);
      add('tide_storm', 1.2, yearsHere >= 3);
    } else if (loc === 'ember') {
      add('ember_caravan', 1.4, !state.flags.beastMercy && !state.flags.beastSold);
      add('ember_ruins', 1.2, yearsHere >= 2);
    } else if (loc === 'sky') {
      add('sky_archive', 1.4, yearsHere >= 1);
      add('sky_fall', 1.2, yearsHere >= 3);
    }
    add('crossroads', 1.0, regional(state) >= 1 && yearsHere >= 3 && personHere(state, 'ally'));
    add('relic_door', 1.1, state.player.realm === 2 && yearsHere >= 2 && personHere(state, 'ally'));
    add('golden', state.birth.goal === 'dao' ? 2.6 : 1.5, state.player.realm === 2 && age(state) >= 30 && regional(state) >= 2 && personHere(state, 'ally'));
    add('trial_echo', 1.5, state.flags.trialPromise && state.people.trialmate.status !== 'dead' && state.life.expeditions.some(e => e.id === 'valley' && state.month - e.ended >= 96));
    add('treasure_claim', 1.4, state.flags.treasureRumour && ['mirror_heart', 'ember_engine', 'moon_key'].some(id => state.inventory.includes(id)));
  }
  if (mode === 'settled') {
    add('trial_echo', 1, state.flags.trialPromise && state.people.trialmate.status !== 'dead');
    add('treasure_claim', 1.3, state.flags.treasureRumour && ['mirror_heart', 'ember_engine', 'moon_key'].some(id => state.inventory.includes(id)));
  }
  if(state.life.feedback && state.life.family.members.some(p=>p.status==='alive')) {
    add('family_help',2,state.month>=state.life.family.nextAt && familyAvailable(state));
    add('family_reunion',1,mode==='abroad' && state.month-state.life.modeSince>=48 && state.life.family.bond>=25);
  }
  if(state.life.feedback) {
    add('valley_notice',1.5,mode==='home'&&state.player.realm===1&&yearsHere>=2&&!state.flags.valleySkipped);
    add('cavern_notice',1.5,mode==='abroad'&&state.player.realm===2&&state.flags.cavernClue&&yearsHere>=2&&!state.flags.cavernSkipped&&personHere(state,'ally'));
    add('outer_notice',1.8,mode==='abroad'&&state.player.realm>=3&&yearsHere>=4&&!state.flags.outerSkipped&&personHere(state,'ally')&&LOCATORS.some(id=>state.inventory.includes(id)));
  }
  for (const ground of trainingOptions(state)) add(ground.invitation, ground.id === 'outer' && state.birth.goal === 'dao' ? 3 : 1.6, ground.enabled);
  return out;
}
function autoInterval(state) {
  const span = state.life.mode === 'childhood' ? [18, 30] : state.player.realm >= 3 ? [18, 32] : state.player.realm === 2 ? [12, 22] : [8, 13];
  return span[0] + Math.floor(random(state, 'daily') * (span[1] - span[0] + 1));
}
function automatic(state, callbacks) {
  if (state.month < state.life.dailyAt) return;
  const entries = AUTOMATIC_EVENTS.filter(entry => {
    const record = state.life.memory[entry.id];
    return entry.when(state) && !(entry.once && record) && (!record || record.count < 3 && state.month - record.last >= 60) && !state.life.recent.includes(entry.id);
  });
  if (entries.length) {
    const id = chooseWeighted(state, entries.map(e => ({ id: e.id, weight: e.once ? 1.4 : 1 })), 'daily');
    const entry = AUTOMATIC_EVENTS.find(e => e.id === id), changes = callbacks.apply(typeof entry.effects === 'function' ? entry.effects(state) : entry.effects);
    callbacks.log({ kind: entry.kind, event: id, title: entry.title, body: contextualText(AUTOMATIC_TEXT[id] || (typeof entry.body === 'function' ? entry.body(state) : entry.body), state), changes, automatic: true, location: state.player.location, context: activityContext(state) });
    const old = state.life.memory[id];
    state.life.memory[id] = { count: (old?.count || 0) + 1, last: state.month };
    state.life.recent.push(id); if (state.life.recent.length > 4) state.life.recent.shift();
    state.life.automaticCount++;
  }
  state.life.dailyAt = state.month + autoInterval(state);
}
const channel = messageChannel;
function prepareCrisis(state) {
  if (state.life.crisis && !state.life.crisis.resolved) return;
  const l = state.life;
  if ((!l.feedback || state.flags.tensionSeen || known(state,'omen')) && !state.flags.sectLost && !state.flags.homeNoticeSent && state.month >= l.upheavalAt - 12 && isLong(state)) {
    l.crisis = { kind: 'homeFall', event: 'war_council', location: 'home', deadline: l.upheavalAt, travel: l.arc?.id === 'valley' ? 3 : 6, message: '山门正在遭到围攻，外门还能坚持一年。闻竹让仍在试炼的人先认清回来的路，若不赶回，宗门的陷落会在门外真实发生。', channel: null, notified: false, resolved: false };
    state.flags.homeNoticeSent = true;
  } else if (l.mode === 'abroad' && l.foreignAt !== null && !state.flags.cityNoticeSent && !state.flags.foreignSeen && state.month >= l.foreignAt - 12 && (isLong(state) || state.player.location !== state.flags.destination)) {
    l.crisis = { kind: 'cityAttack', event: 'beast_attack', location: state.flags.destination, deadline: l.foreignAt, travel: l.arc?.id === 'outer' || state.player.location !== state.flags.destination ? 12 : 3, message: regionInfo(state, state.flags.destination).name + '的城阵遭到天外来客攻击，补给点与居民正在撤离。你可以放下当前的取宝与闭关，返回城池加入另一场救援。', channel: null, notified: false, resolved: false };
    state.flags.cityNoticeSent = true;
  } else if (l.mode === 'abroad' && l.letterAt !== null && state.month >= l.letterAt && !state.flags.homeCallSent && isLong(state)) {
    l.crisis = { kind: 'homeCall', event: 'letter', location: state.player.location, deadline: state.month + 120, travel: l.arc?.id === 'outer' ? 12 : 3, message: '程照雪从故乡发来求援：旧山门仍在征召活人，名单上的被困者只有十年的援救期限。离开当前经历可以提前组织归来，继续修行也会真实消耗这段期限。', channel: null, notified: false, resolved: false };
    if (state.people.master.status === 'captured' && state.world.masterDeadline === null) state.world.masterDeadline = l.crisis.deadline;
    state.flags.homeCallSent = true;
  }
}
function resolveUnanswered(state, callbacks) {
  const crisis = state.life.crisis;
  if (!crisis || crisis.resolved || state.month < crisis.deadline) return;
  let entry;
  if (crisis.kind === 'homeFall' && !state.flags.sectLost) {
    callbacks.apply({ flags: { sectLost: true, absentAtFall: true }, people: {
      ...(state.people.master.status !== 'dead' ? { master: { status: crisis.aided ? 'alive' : 'captured', location: crisis.aided ? 'refuge' : 'home' } } : {}),
      ...(state.people.friend.status !== 'dead' ? { friend: { status: 'missing', location: 'home' } } : {}),
      sister: { location: 'refuge' },
    }, survivors: crisis.aided ? 6 : -4, property: { family_home: 'lost', dwelling: 'lost' } });
    entry = { kind: 'crisis', title: '山门在你未归的年月里陷落', body: '一年已过，旧宗门失去山门。援手是否出发决定了部分人的退路，尚未亲自救回的人仍留在被困与失踪的记录里。', automatic: true, context: 'emergency' };
  } else if (crisis.kind === 'cityAttack') {
    callbacks.apply({ flags: { cityDamaged: true, foreignSeen: true, absentAtCity: true }, property: state.life.properties.dwelling?.location === crisis.location ? { dwelling: 'damaged' } : {}, survivors: crisis.aided ? -2 : -8 });
    entry = { kind: 'crisis', title: '归途的城池失守了', body: '天外来客攻破了城阵。你仍在原来的经历中，补给点受损，未来回去要先接住尚未结束的救援。没有因为继续取宝就暂停城外的一年。', automatic: true, context: 'emergency' };
  }
  if (entry) {
    if (crisis.notified) callbacks.log(entry);
    else state.life.unreadNews.push({ ...entry, occurred: state.month, deliverAfter: state.month + 6, people: crisis.kind === 'homeFall' ? ['master', 'sister', 'friend'] : [] });
  }
  crisis.resolved = true;
}
export function suspendForCrisis(state) {
  state.life.suspended = copy(state.journey);
  state.life.suspended.continuationQueue = copy(state.life.queue);
  state.life.queue = null;
  state.life.crisis.channel = channel(state); state.life.crisis.notified = true;
}
export function respondToCrisis(state, choice, callbacks) {
  const crisis = state.life.crisis, suspended = state.life.suspended;
  if (!crisis || !suspended) throw new Error('没有可回应的长事件急讯。');
  state.life.suspended = null;
  if (choice === 'leave') {
    state.life.arcPause = null;
    const started = state.life.arc?.started ?? suspended.from;
    const plannedTo = suspended.open ? suspended.continuationQueue?.due ?? null : suspended.to;
    state.life.interruptions.push({ event: suspended.resolution?.event || state.life.arc?.stage || 'retreat', month: state.month, from: started, plannedTo, completedMonths: state.month - started, reason: crisis.kind });
    if (state.life.arc) { state.life.expeditions.push({ ...copy(state.life.arc), ended: state.month, status: 'interrupted' }); state.life.arc = null; }
    callbacks.log({ kind: 'interrupt', title: '中断当前经历，启程回应急事', body: '这段经历已过' + (state.month - started) + '个月，' + (suspended.open ? '后续探索就此放下。' : '余下' + Math.max(0, suspended.to - state.month) + '个月的计划取消。') + '已经得到的物品保留，尚未完成的奖励不再发放。', changes: [], location: state.player.location, context: 'emergency' });
    state.journey = { from: state.month, to: state.month + crisis.travel, target: crisis.event, practice: state.player.focus, emergencyArrival: true, event: 'urgent_message' };
    state.life.activity = '离开当前经历，行路回应急讯'; state.life.activitySince = state.month;
  } else {
    if (choice === 'aid') {
      state.flags.emergencyAid = true;
      crisis.aided = true;
      crisis.deadline += 36;
      if (crisis.kind === 'homeFall') state.life.upheavalAt += 36;
      if (crisis.kind === 'cityAttack') state.life.foreignAt += 36;
      if (crisis.kind === 'homeCall' && state.world.masterDeadline !== null) state.world.masterDeadline += 36;
    }
    state.life.queue = suspended.continuationQueue || null;
    delete suspended.continuationQueue;
    state.journey = suspended;
    state.life.activity = activityLabel(state);
  }
  return state;
}
export function emergencyArrival(state, callbacks) {
  const crisis = state.life.crisis;
  let event = state.journey.target;
  if (crisis?.kind === 'homeFall') {
    if (state.flags.sectLost) { callbacks.apply({ location: 'refuge', home: '渡口草棚' }); state.life.mode = 'refuge'; event = 'refugees'; }
    else { callbacks.apply({ location: 'home' }); state.life.mode = 'home'; event = known(state, 'war_council') ? ({ war: 'siege', devour: 'devouring_night', decree: 'fall_decree' }[state.life.upheavalKind]) : 'war_council'; }
  } else if (crisis?.kind === 'cityAttack') {
    const together = personHere(state, 'ally');
    callbacks.apply({ location: crisis.location, ...(together ? { people: { ally: { location: crisis.location } } } : {}) });
    if (state.flags.absentAtCity) event = 'beast_wake';
  }
  if (crisis) crisis.resolved = true;
  return event;
}
/** Called from the same integer-month tick as all cultivation, travel and deadlines. */
export function livingMonth(state, callbacks) {
  if(state.life?.cultivation){cultivationMonth(state,callbacks);return;}
  const l = state.life;
  if(l.family) for(const p of l.family.members)if(p.status==='alive'&&state.month>=p.deathAt){p.status='dead';callbacks.log({kind:'people',title:p.name+'离世',body:'家里送来讣告：'+p.name+'已经离世。你保存好旧信，往后的家中往来由仍在的人接手。',automatic:true,context:'family'});}
  if(l.feedback && !state.flags.sectLost && state.month>=l.upheavalAt-36 && !state.flags.tensionSeen){state.flags.tensionSeen=true;callbacks.log({kind:'world',title:'镜火盟开始征用附近村镇',body:'商旅带来确切消息：镜火盟扣下了粮船，要求附近宗门交出护阵。闻竹安排弟子巡查，山门开始准备撤离物资。',automatic:true,context:l.mode});}
  if(state.flags.sectLost&&l.family)for(const p of l.family.members)if(p.status==='alive'&&p.location==='home')p.location='refuge';
  if (l.mode === 'childhood' && age(state) >= 16) {
    callbacks.apply({ people: { master: { known: true, location: 'home' }, sister: { known: true, location: 'home' }, friend: { known: true, location: 'home' } }, items: ['signal_talisman'], home: BIRTHPLACES[state.birth.continent].sect + '新弟子客舍' });
    l.mode = 'home'; l.modeSince = state.month; l.choiceAt = state.month + draw(state, 9, 14);
    l.dailyAt = state.month + 2;
    callbacks.log({ kind: 'life', title: '十六岁，走进故乡的山门', body: '你离开' + state.birth.address + '，拜入' + BIRTHPLACES[state.birth.continent].sect + '。闻竹、程照雪与沈砚从这一刻成为身边的人，山门给你留下了一枚能接收急讯的传音符。', automatic: true, context: 'home', changes: ['得到传音符'] });
    l.automaticCount++; l.activity = activityLabel(state);
  }
  if (state.player.realm === 0 && age(state) >= 18 && known(state, 'entry')) {
    callbacks.apply({ realm: 1 });
    callbacks.log({ kind: 'practice', title: '灵息终于稳在气府里', body: '两年的学习与练习真正过去，第一次入道在师长的照看下完成。你能开始运使护符与练习御剑，先把学到的本事用在日常里。', automatic: true, context: l.mode, changes: ['踏入炼气'] });
    l.automaticCount++;
  }
  prepareCrisis(state); resolveUnanswered(state, callbacks);
  if (l.crisis && !l.crisis.resolved && !l.crisis.notified && channel(state)) {
    suspendForCrisis(state); callbacks.arrive('urgent_message'); return;
  }
  automatic(state, callbacks);
  if(l.feedback && l.arc && !l.arcPause && state.month%6===0)l.arc.supplies=Math.max(0,l.arc.supplies-1);
  if(l.feedback && l.arc && !['trial_return','cavern_exit','outer_return'].includes(l.arc.stage) && !l.arcPause && state.month>=l.arc.threatAt && (l.arc.hazardCount<2 || l.arc.supplies<8&&!known(state,'expedition_supply'))){
    const companion=state.people[l.arc.id==='valley'?'trialmate':'ally'];
    const possible=(l.arc.hazardCount>=2 ? ['expedition_supply'] : ['expedition_obstacle','expedition_ambush',...(companion.status==='alive'?['expedition_companion']:[]),...(l.arc.supplies<10?['expedition_supply']:[])]).filter(id=>!known(state,id));
    if(possible.length && random(state,'events')<.65){
      const event=possible[draw(state,0,possible.length-1)];l.arcPause={journey:copy(state.journey),queue:copy(l.queue),month:state.month};l.queue=null;l.arc.hazardCount++;callbacks.arrive(event);return;
    }
    l.arc.threatAt=state.month+draw(state,18,36);
  }
  if (!state.journey?.open) return;
  if (l.unreadNews.length && ordinaryLife(state)) {
    const delivered = l.unreadNews.filter(news => state.month >= news.deliverAfter);
    l.unreadNews = l.unreadNews.filter(news => state.month < news.deliverAfter);
    for (const news of delivered) callbacks.log({ ...news, body: news.body + '这是山历' + (state.birth.year + Math.floor(news.occurred / 12)) + '年' + (news.occurred % 12 + 1) + '月的消息，如今才随送信的人抵达。' });
  }
  if (l.queue) {
    if (state.month >= l.queue.due) { const event = l.queue.event; l.queue = null; callbacks.arrive(event); }
    return;
  }
  if (l.arc) return;
  if (l.mode === 'home' && !state.flags.sectLost && state.month >= l.upheavalAt) {
    callbacks.arrive({ war: 'siege', devour: 'devouring_night', decree: 'fall_decree' }[l.upheavalKind]); return;
  }
  if (l.mode === 'home' && state.flags.sectLost) { l.mode = 'refuge'; l.modeSince = state.month; callbacks.apply({ location: 'refuge', home: '渡口草棚' }); }
  if (l.mode === 'abroad' && state.people.ally.status === 'captured' && !known(state, 'beast_wake')) { callbacks.arrive('beast_wake'); return; }
  if (l.mode === 'abroad' && state.flags.absentAtCity && !known(state, 'beast_wake')) {
    if (l.unreadNews.length) return;
    if (state.player.location !== state.flags.destination) {
      state.journey = { from: state.month, to: state.month + 12, target: 'beast_wake', practice: state.player.focus, travelArrival: { location: state.flags.destination, companions: personHere(state, 'ally') ? ['ally'] : [] } };
      callbacks.log({ kind: 'plan', title: '回到受袭的异乡城镇', body: '消息已经送达，你收起手边的日常，沿界门行路一年。救援会在真正抵达后开始。', location: state.player.location, context: 'travel' });
    } else callbacks.arrive('beast_wake');
    return;
  }
  if (l.mode === 'abroad' && l.foreignAt !== null && state.month >= l.foreignAt && !state.flags.foreignSeen) { callbacks.arrive('beast_attack'); return; }
  if (l.mode === 'abroad' && l.letterAt !== null && state.month >= l.letterAt && state.flags.foreignSeen && !known(state, 'letter')) { callbacks.arrive('letter'); return; }
  if (l.mode === 'settled' && l.settlementEnd !== null && state.month >= l.settlementEnd) {
    if (state.flags.relocated && state.birth.goal === 'free' && !known(state, 'far_finale')) callbacks.arrive('far_finale');
    else callbacks.arrive(state.birth.goal !== 'free' || state.inventory.includes('mirror_heart') || random(state, 'events') < 0.35 ? 'last_vow' : 'final_choice');
    return;
  }
  if (state.month < l.choiceAt) return;
  const pool = candidates(state);
  if (pool.length) callbacks.arrive(chooseWeighted(state, pool, 'events'));
  else l.choiceAt = state.month + 6;
}
