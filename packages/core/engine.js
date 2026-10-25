import { REGIONS, FACTIONS, ROOTS, REALMS, TECHNIQUES, FOCUS, ITEMS, ENDINGS, ENTRY_PRACTICE, ENTRY_COST, ATTUNE_COST, HOME_STYLES, LOCAL_ACTIVITIES, regionById, factionById } from '../../content/world.js';
import { STORIES, AGE_EVENTS } from '../../content/stories.js';
import { SMALL_STORIES, STORY_VARIANTS, WORLD_EVENTS } from '../../content/expansion.js';
import { clone, clamp, ageOf, currentRealm, personById, personAge, makePerson, addLog, aliveFamily, familyAt, activeMourning, homeMourning } from './state.js';
import { random, integer, pick } from './random.js';
import { updateWorldYear, worldImpact, localWorldEvents, shuffled } from './world-events.js';

export { localWorldEvents, worldImpact } from './world-events.js';

export class GameError extends Error {
  constructor(message, code = 'action') { super(message); this.name = 'GameError'; this.code = code; }
}

function requireLife(state, pendingAllowed = false) {
  if (state.phase !== 'life') throw new GameError('这一生当前不能继续行动。');
  if (state.pending && !pendingAllowed) throw new GameError('请先回应眼前的抉择。', 'pending');
}

export function focusOptions(state) {
  return FOCUS.filter(item => ageOf(state) >= item.minAge && (!item.cultivation || state.player.realm > 0 || state.player.training.learned) && (item.id !== 'explore' || !homeMourning(state).length));
}

function parentOf(state) {
  return state.people.find(person => person.alive && ['mother', 'father', 'guardian'].includes(person.relation));
}

function queueEvent(state, event, payload = {}, due = state.month, key = null) {
  if (state.queue.some(item => item.event === event && item.payload.actorId === payload.actorId && item.payload.worldEventId === payload.worldEventId) || (state.pending?.event === event && state.pending.payload.actorId === payload.actorId)) return;
  if (key && state.flags['queued:' + key]) return;
  if (key) state.flags['queued:' + key] = true;
  if (STORY_VARIANTS[event] && payload.variant === undefined) payload = { ...payload, variant: (state.flags['count:' + event] || 0) % STORY_VARIANTS[event].length };
  state.queue.push({ id: state.id + ':event:' + state.sequence++, event, payload, due, order: state.sequence });
}

function ledger(state, label, money = 0, stones = 0, herbs = 0) {
  state.ledger.push({ month: state.month, label, money: money || 0, stones: stones || 0, herbs: herbs || 0 });
}

function spend(state, costs = {}) {
  for (const [key, value] of Object.entries(costs)) {
    if (!Number.isSafeInteger(value) || value < 0 || !['money', 'stones', 'herbs'].includes(key)) throw new GameError('资源条件无效。');
    if (state.player[key] < value) throw new GameError('眼下的' + ({ money: '铜钱', stones: '灵石', herbs: '灵草' })[key] + '不足。', 'resources');
  }
  for (const [key, value] of Object.entries(costs)) state.player[key] -= value;
}

function canAfford(state, costs) {
  return Object.entries(costs || {}).every(([key, value]) => state.player[key] >= value);
}

const resourceNames = { money: '铜钱', stones: '灵石', herbs: '灵草' };
export const costText = costs => Object.entries(costs).filter(([, value]) => value).map(([key, value]) => value + ' ' + resourceNames[key]).join('、') || '不花资源';

export function marketReason(state) {
  return state.phase !== 'life' ? '此生当前不能交易。' : state.pending ? '先回应眼前的抉择。' : ageOf(state) < 12 ? '12 岁后可独自去坊市。' : state.player.travel ? '正在行路，抵达后再去坊市。' : state.player.retreat ? '先出关，再去坊市交易或炼丹。' : '';
}

function entryReason(state) {
  const p = state.player;
  if (ageOf(state) < 12) return '12 岁后可学习调息。';
  if (p.realm) return '已经进入炼气或更高境界。';
  if (!p.training.learned) return '先学习调息。';
  if (p.root === 'none' && !p.training.awakened) return '未见灵根：18 岁后悟性达到 40，再用 6 灵石、8 灵草通窍。';
  if (p.training.progress < ENTRY_PRACTICE) return '先把引气练习积累到 12 点；选择调息修炼或点击练习一个月。';
  if (!canAfford(state, ENTRY_COST)) return '还缺 ' + costText(Object.fromEntries(Object.entries(ENTRY_COST).map(([key, value]) => [key, Math.max(0, value - p[key])]))) + '；可采药或在坊市兑换。';
  return '';
}

function attuneReason(state) {
  if (state.player.realm || state.player.root !== 'none' || state.player.training.awakened) return '这条通窍法只供尚未入道、未见灵根的人使用。';
  if (ageOf(state) < 18) return '18 岁后可通窍。';
  if (state.player.insight < 40) return '悟性需达到 40；识字求知每月增加悟性，论道和读书事件也有帮助。';
  return canAfford(state, ATTUNE_COST) ? '' : '通窍需要 ' + costText(ATTUNE_COST) + '。';
}

export function cultivationGuide(state) {
  const p = state.player, blocked = state.phase !== 'life' ? '此生当前不能行动。' : state.pending ? '先回应眼前的抉择，再按指引行动。' : p.travel ? '抵达后再学习或安排练习。' : '';
  const actions = [];
  const add = (id, label, reason = '', costs = {}) => actions.push({ id, label, costs, disabled: !!(blocked || reason), reason: blocked || reason });
  let title, text;
  if (p.realm) {
    const target = REALMS[p.realm + 1]?.name || '飞升';
    title = currentRealm(state).name + ' → ' + target;
    text = '已学' + TECHNIQUES.find(item => item.id === p.technique).name + '。修为 ' + Math.floor(p.progress) + ' / ' + currentRealm(state).threshold + '；达到关口会出现突破抉择，准备 ' + currentRealm(state).stones + ' 灵石、' + currentRealm(state).herbs + ' 灵草。悟性和心境影响积累速度。';
    add('practice-month', '修炼一个月', p.retreat ? '闭关已在进行，可推进至下一件要事。' : '');
    add('home', '安排闭关', homeMourning(state).length ? '守丧期间暂缓长期闭关。' : '');
  } else if (ageOf(state) < 12) {
    title = '十二岁后，师门与调息会进入人生';
    text = '眼下可识字、学艺与成长。12 岁师门抉择可由师长带你进入炼气；留乡也能在这里学调息。悟性是理解能力，境界需要完成入道步骤。';
  } else {
    title = !p.training.learned ? '第一步：学会调息' : p.root === 'none' && !p.training.awakened ? '准备通窍，让灵息能够留住' : p.training.progress < ENTRY_PRACTICE ? '第二步：按月练习引气' : '第三步：准备材料，凝聚气府';
    text = (p.training.learned ? '已学调息；引气练习 ' + Math.floor(p.training.progress) + ' / 12。' : '向本地医馆先生免费学习《调息篇》。') + '练习期间选择“调息修炼”，每月自动积累；达到 12 点后使用 12 灵石、3 灵草进入炼气，随后可闭关。' + (p.root === 'none' && !p.training.awakened ? '你未见天生灵根：18 岁、悟性 40 后可通窍，需 6 灵石、8 灵草；识字求知能提高悟性。' : '') + (p.training.progress >= ENTRY_PRACTICE && entryReason(state) ? entryReason(state) : '');
    if (!p.training.learned) add('learn-breath', '免费学习调息');
    if (p.root === 'none' && !p.training.awakened) add('attune', '请医馆指点通窍', attuneReason(state), ATTUNE_COST);
    if (p.training.learned) add('practice-month', '调息、引气一个月');
    if (p.training.learned && p.training.progress >= ENTRY_PRACTICE) add('initiate', '凝聚气府，进入炼气', entryReason(state), ENTRY_COST);
    add('inventory', '准备灵石与灵草');
  }
  return { title, text, actions, learned: p.training.learned, progress: p.training.progress, awakened: p.training.awakened };
}

export function localActivityPreview(state) {
  const source = LOCAL_ACTIVITIES[state.player.location];
  const reason = state.phase !== 'life' ? '这一生当前不能行动。' : state.pending ? '先回应眼前的抉择。' : ageOf(state) < 12 ? '12 岁后可独自参与。' : state.player.travel ? '先完成行程。' : state.player.retreat ? '先出关。' : homeMourning(state).length ? '先完成这一段返乡与守丧。' : state.month < (state.flags.nextLocalActivity || 0) ? '再过 ' + (state.flags.nextLocalActivity - state.month) + ' 个月可再做。' : !canAfford(state, source.costs) ? '需要 ' + costText(source.costs) + '。' : '';
  return { ...source, disabled: !!reason, reason };
}

function learnBreath(state) {
  if (state.player.training.learned) return;
  state.player.training.learned = true;
  addLog(state, '你在医馆学会《调息篇》的吐纳、引气和收息。接下来选择调息修炼，按月积累 12 点引气练习，再准备 12 灵石、3 灵草进入炼气。', 'cultivation');
}

function enterQi(state) {
  const p = state.player;
  p.realm = 1; p.progress = 0; p.training.progress = ENTRY_PRACTICE;
  p.lifespan = Math.max(p.lifespan, REALMS[1].lifespan); p.focus = 'cultivate'; p.role = 'cultivator';
  addLog(state, '调息、引气和凝聚气府的准备完成，你进入炼气期，寿元上限 ' + p.lifespan + ' 岁。选择调息修炼积累 100 修为，准备 38 灵石、5 灵草可尝试筑基；洞府现在可以安排闭关。', 'cultivation');
}

function applyAttune(state) {
  const reason = attuneReason(state);
  if (reason) throw new GameError(reason);
  spend(state, ATTUNE_COST); learnBreath(state); state.player.training.awakened = true;
  addLog(state, '医馆用 ' + costText(ATTUNE_COST) + '辅助你按通窍法练习，经脉开始留住灵息。天生灵根仍未测出，但已可按引气与凝聚气府的步骤入道；修炼效率按通窍路线计算。', 'cultivation');
}

function returnRoute(state, actor) {
  if (!actor || actor.location === state.player.location) return { months: 0, money: 0, stones: 0 };
  if (state.player.travel?.to === actor.location) return { months: state.player.travel.arrival - state.month, money: 0, stones: 0 };
  return travelPreview(state, actor.location, { onFoot: true });
}

function bump(state, values) {
  for (const [key, value] of Object.entries(values)) state.player[key] = clamp(state.player[key] + value, 0, 100);
}

function remember(state, actorId, type, detail) {
  const person = personById(state, actorId);
  if (person) person.memories.push({ month: state.month, type, detail });
}

export function breakthroughChance(state) {
  const player = state.player;
  return clamp(0.3 + player.talent / 250 + player.insight / 500 + player.mind / 500 + player.health / 600 - player.realm * 0.025 + (state.flags.prepared ? 0.13 : 0), 0.2, 0.94);
}

function storyAllowed(state, event, payload = {}) {
  const actor = personById(state, payload.actorId);
  const p = state.player;
  if ((event === 'primer' && ageOf(state) < 6) || (event === 'path' && ageOf(state) < 12) || (event === 'profession' && ageOf(state) < 18)) return false;
  if (payload.actorId && !actor?.alive && !['farewell', 'inheritance', 'bereavement', 'memorial', 'mourningEnd'].includes(event)) return false;
  if (['farewell', 'inheritance', 'bereavement', 'memorial', 'mourningEnd'].includes(event) && (!actor || actor.alive)) return false;
  if (event === 'bereavement') return ['mother', 'father', 'guardian'].includes(actor.relation) && !p.mourning.some(item => item.actorId === actor.id);
  if (event === 'mourningEnd') return p.mourning.some(item => item.actorId === actor.id && item.stage === 'complete');
  if (event === 'initiation') return ageOf(state) >= 12 && !p.realm && !p.training.learned;
  if (event === 'entry') return !p.realm && p.training.learned && p.training.progress >= ENTRY_PRACTICE && (p.root !== 'none' || p.training.awakened);
  if (event === 'journey') return ageOf(state) >= 12 && !p.travel && !p.retreat && !homeMourning(state).length;
  if (payload.worldEventId && !localWorldEvents(state).some(item => item.id === payload.worldEventId)) return false;
  if (['gathering', 'encounter', 'market', 'danger', 'treasure', 'immortal', 'relic', 'caravan', 'alchemy', 'workshop'].includes(event) && (p.travel || p.retreat || homeMourning(state).length)) return false;
  if (event === 'relic' && p.realm < 1) return false;
  if (event === 'mentor') return !!personById(state, state.player.mentorId)?.alive;
  if (event === 'bond') return !state.player.partnerId && actor?.alive && personAge(state, actor) >= 18;
  if (event === 'family') return !!personById(state, state.player.partnerId)?.alive;
  if (event === 'care') return !!parentOf(state);
  if (event === 'homecoming') return familyAt(state, payload.region || p.birthRegion).length > 0 && !homeMourning(state).length;
  if (event === 'dispute' || event === 'leadership') return !!state.player.faction;
  if (event === 'teaching') return state.stats.students < 3 && (state.player.realm >= 2 || state.player.craft >= 30);
  if (event === 'breakthrough' || event === 'ascension') return state.player.realm > 0 && (event === 'ascension' ? state.player.realm === REALMS.length - 1 : state.player.realm < REALMS.length - 1) && state.player.progress >= currentRealm(state).threshold;
  return true;
}
export const decisionEligible = (state, event, payload = {}) => storyAllowed(state, event, payload);

function optionCosts(event, option, state, payload = {}) {
  if (event === 'journey' && regionById(option)) { const route = travelPreview(state, option); return { money: route.money, stones: route.stones }; }
  if (event === 'entry' && option === 'enter') return ENTRY_COST;
  if (event === 'immortal' && option === 'attune') return ATTUNE_COST;
  if (event === 'bereavement') { const actor = personById(state, payload.actorId); return { money: ({ full: 60, simple: 20, entrust: 40 })[option] + (option === 'entrust' ? 0 : returnRoute(state, actor).money) }; }
  if (event === 'care' && option === 'visit') { const actor = personById(state, payload.actorId) || parentOf(state); return { money: returnRoute(state, actor).money }; }
  if (event === 'homecoming' && option === 'hands') { const region = payload.region || state.player.birthRegion; return { money: returnRoute(state, { location: region }).money }; }
  if (event === 'breakthrough' || event === 'ascension') {
    if (option === 'attempt') return { stones: currentRealm(state).stones, herbs: currentRealm(state).herbs };
    if (option === 'prepare') return { stones: 6, herbs: 2 };
  }
  const costs = {
    care: { medicine: { herbs: 3, money: 40 } },
    promise: { keep: { stones: 8 } },
    market: { buy: { stones: 22 } },
    encounter: { help: { herbs: 2 } },
    dispute: { work: { stones: 6 } },
    homecoming: { repair: { money: 100 } },
    drought: { aid: { money: 60 } },
    war: { shelter: { herbs: 4 } },
    inheritance: { fund: { money: 80 } },
    famine: { aid: { money: 80 } }, flood: { repair: { money: 50 } }, quake: { medicine: { herbs: 4 } },
    levy: { hire: { money: 45 } }, regime: { register: { money: 20 }, shelter: { herbs: 3 } },
    demonwar: { shelter: { herbs: 5 } }, harvest: { sell: { herbs: 5 } }, trade: { goods: { money: 50 } },
    treasure: { open: { herbs: 2 }, expert: { money: 30 } }, immortal: { medicine: { herbs: 2 } },
    alchemy: { brew: { herbs: 3, stones: 1 } }, workshop: { work: { money: 20 } }, relic: { enter: { herbs: 3 } },
  };
  return costs[event]?.[option] || {};
}

export function decisionView(state, queued) {
  const event = queued.event;
  const source = STORIES[event];
  const actor = personById(state, queued.payload?.actorId);
  let title, text, kind, choices;
  if (event === 'breakthrough' || event === 'ascension') {
    const realm = currentRealm(state), next = REALMS[state.player.realm + 1];
    const target = next?.name || '此界天门';
    title = next ? '根基已成，向' + target + '迈一步' : '天门在长风之上';
    text = '你感到' + realm.name + '的积累已到一处关口。眼下尝试需 ' + realm.stones + ' 灵石、' + realm.herbs + ' 株灵草；按当前准备，成功机会约 ' + Math.round(breakthroughChance(state) * 100) + '%。失败会消耗资源并留下伤势。';
    kind = 'cultivation';
    choices = [['attempt', next ? '尝试突破' : '准备跨过天门', '承担已知的成本与风险。'], ['prepare', '先稳固根基', '花费 6 灵石与 2 灵草，提高下一次的准备。'], ['delay', '暂缓，继续这一生', '把时间留给积累或身边的人。']];
  } else {
    if (!source) throw new GameError('未知的故事节点。', 'content');
    ({ title, text, kind, choices } = source);
    const variant = STORY_VARIANTS[event]?.[queued.payload?.variant];
    if (variant) [title, text] = variant;
    text = text.replaceAll('{place}', regionById(state.player.location).name).replaceAll('{actor}', actor?.name || '一位旅人');
    if (actor) {
      if (event === 'farewell') text = actor.name + '在' + personAge(state, actor) + '岁时离开了。' + text;
      else if (!variant) text = ({ mother: '母亲', father: '父亲', guardian: '抚养人', mentor: '师长', partner: '伴侣', child: '孩子', friend: '同伴' }[actor.relation] || '故人') + actor.name + '：' + text;
    }
    if (event === 'journey') {
      choices = [...REGIONS.filter(region => region.id !== state.player.location).map(region => {
        const route = travelPreview(state, region.id), activity = LOCAL_ACTIVITIES[region.id], forecast = incomePreview({ ...state, player: { ...state.player, location: region.id } });
        return [region.id, '前往' + region.name, activity.name + '。路程 ' + route.months + ' 个月；按你当前职业与重心，年收入约 ' + forecast.money + ' 铜钱，家用 ' + forecast.living + ' 铜钱。'];
      }), ['stay', '这次留在原地', '保留现有生活；以后仍会遇到远行机会，也可随时在山河中选择目的地。']];
      title = '留在' + regionById(state.player.location).name + '，还是去另一处生活？';
    }
    if (event === 'care' || event === 'homecoming') {
      const destination = event === 'care' ? (actor || parentOf(state)).location : queued.payload?.region || state.player.birthRegion;
      const route = returnRoute(state, { location: destination });
      choices = choices.map(choice => choice[0] === (event === 'care' ? 'visit' : 'hands') ? [choice[0], choice[1], choice[2] + '目的地：' + regionById(destination).name + '，路程 ' + route.months + ' 个月。'] : choice);
    }
    if (event === 'bereavement') {
      const relation = ({ mother: '母亲', father: '父亲', guardian: '抚养人' })[actor.relation];
      const route = returnRoute(state, actor);
      title = relation + actor.name + '离世，享年 ' + personAge(state, actor) + ' 岁';
      text = '讣告来自' + regionById(actor.location).name + '。' + relation + '已在你 ' + Math.floor(actor.deathMonth / 12) + ' 岁时离世；养育、相处和未尽的话留在记忆里。' + (route.months ? '你与故乡相隔 ' + route.months + ' 个月路程，返乡路资 ' + route.money + ' 铜钱。' : '你就在当地，可以亲自料理丧事。') + '返乡治丧会中断闭关和原有行程，依次记下报丧、成服、入殓、安葬和守丧。钱不足可选择简葬，余款记欠账；24 / 6 个月为本作的节奏简化。';
    }
    if (event === 'memorial' || event === 'mourningEnd') title = actor.name + ' · ' + source.title;
    if (queued.payload?.worldEventId) {
      const impact = localWorldEvents(state).find(item => item.id === queued.payload.worldEventId), rule = WORLD_EVENTS.find(item => item.id === impact?.type);
      text = (impact?.region ? regionById(impact.region).name : '各地') + '：' + text + ' ' + (rule?.detail || '') + '这一轮还会持续 ' + (impact.end - state.month) + ' 个月，已纳入收入、家用和修炼计算。';
    }
    if (event === 'inheritance' && !familyAt(state, actor.location).length) {
      choices = choices.map(choice => choice[0] === 'fund' ? ['fund', '捐给故人当地的义仓', '当地已经没有在世的家人；花 80 铜钱帮助义仓，记下 1 份相助。'] : choice);
    }
  }
  const options = choices.map(([id, label, description]) => {
    const costs = optionCosts(event, id, state, queued.payload || {});
    let reason = canAfford(state, costs) || event === 'bereavement' ? '' : '资源不足：' + costText(costs);
    if (event === 'path' && ['songyin', 'zhaochuan'].includes(id) && state.player.root === 'none') reason = '此门眼下尚无适合未见灵根者的入门功法。';
    if ((event === 'latewish' || event === 'mourningEnd') && id === 'practice') {
      if (!state.player.realm && !state.player.training.learned) reason = '先在修行指引中免费学习调息，才能安排修炼。';
    }
    if (event === 'entry' && id === 'enter') reason = entryReason(state);
    if (event === 'immortal' && id === 'attune') reason = attuneReason(state);
    if (event === 'alchemy' && id === 'brew' && state.player.craft < 20) reason = '技艺需达到 20；可先称药、看火学习。';
    if ((event === 'demonwar' && id === 'guard') || (event === 'relic' && id === 'enter')) {
      if (state.player.realm < 1) reason = '需要炼气：先按修行指引学调息、练引气、凝聚气府。';
      else if (state.player.health < 40) reason = '需要至少 40 体魄；可用灵草或养元丹疗伤。';
    }
    if (event === 'farewell' && id === 'care' && !aliveFamily(state).length) reason = '此生已经没有在世的家人；可以留旧物或写下记忆。';
    if (event === 'journey' && id !== 'stay' && state.player.retreat) reason = '先出关再启程。';
    if (event === 'market' && id === 'trade' && state.player.craft < 20) reason = '需要技艺达到 20。';
    if (event === 'market' && id === 'buy' && state.player.inventory.book) reason = '已经拥有手抄丹书，可以交换心得或继续行路。';
    if ((event === 'breakthrough' || event === 'ascension') && id === 'prepare' && state.flags.prepared) reason = '这一次的根基已经稳固。';
    if ((event === 'war' && id === 'guard') || (event === 'danger' && id === 'fight')) {
      if (state.player.health < 35) reason = '伤势较重，眼下不宜正面应对。';
    }
    return { id, label, description, costs, disabled: !!reason, reason };
  });
  return { id: queued.id, event, month: state.month, title, text, kind, payload: clone(queued.payload || {}), options };
}

function offer(state) {
  if (state.pending || state.phase !== 'life') return;
  if (storyAllowed(state, 'entry') && state.month >= (state.flags.nextEntry || 0) && !state.player.travel) {
    queueEvent(state, 'entry');
    state.flags.nextEntry = state.month + 48;
  }
  if (state.player.realm && state.player.progress >= currentRealm(state).threshold && state.month >= (state.flags.nextBreakthrough || 0)) {
    const event = state.player.realm === REALMS.length - 1 ? 'ascension' : 'breakthrough';
    queueEvent(state, event, {}, state.month);
    state.flags.nextBreakthrough = state.month + 12;
  }
  const priority = item => item.due <= state.month ? item.event === 'bereavement' ? -2 : ['primer', 'path', 'profession'].includes(item.event) ? -1 : item.due : item.due;
  state.queue.sort((a, b) => priority(a) - priority(b) || a.order - b.order);
  while (state.queue.length && state.queue[0].due <= state.month) {
    const queued = state.queue.shift();
    if (!storyAllowed(state, queued.event, queued.payload)) continue;
    state.pending = decisionView(state, queued);
    state.flags['last:' + queued.event] = state.month;
    state.flags['count:' + queued.event] = (state.flags['count:' + queued.event] || 0) + 1;
    if (state.player.retreat) addLog(state, '闭关期间传来一件需要回应的事。你暂时停下调息。', 'retreat');
    return;
  }
}

export function beginLife(state) {
  if (state.phase !== 'birth') throw new GameError('请从出生卡开始这一生。');
  const next = clone(state);
  next.phase = 'life';
  next.revision++;
  addLog(next, '你开始了这一生。山外的路很长，眼前也有人为你留灯。', 'growth');
  return next;
}

export function setFocus(state, focus) {
  requireLife(state);
  if (state.player.retreat) throw new GameError('闭关期间专注调息；请先出关，再调整生活重心。');
  if (!focusOptions(state).some(item => item.id === focus)) throw new GameError('这一阶段还不能选择这种重心。');
  if (state.player.focus === focus) return state;
  const next = clone(state);
  next.player.focus = focus;
  next.revision++;
  addLog(next, '你把接下来的重心放在“' + FOCUS.find(item => item.id === focus).name + '”。', 'focus');
  return next;
}

export function incomePreview(state) {
  const player = state.player, age = ageOf(state), region = regionById(player.location);
  if (age < 16) return { money: 0, stones: 0, herbs: 0, living: 0 };
  const salary = { scholar: 105, farmer: 125, herbalist: 170, artisan: 185, merchant: 205, caregiver: 115, cultivator: 115, child: 120 }[player.role] || 120;
  const focus = player.focus === 'craft' ? 60 + Math.floor(player.craft * 1.4) : Math.floor(player.craft * 0.45);
  const realm = REALMS[player.realm];
  const local = state.world.regions.find(item => item.id === player.location);
  const prosperity = 0.8 + (local?.prosperity ?? 50) / 250;
  const impact = worldImpact(state), mourning = homeMourning(state).length ? 0.7 : 1;
  const specialty = ({ hegu: ['farmer', 'herbalist'], landu: ['cultivator', 'scholar'], zhaoshi: ['artisan'], mulan: ['merchant'], wenxue: ['cultivator'] })[player.location].includes(player.role) ? 1.12 : 1;
  const baseLiving = region.living + player.realm * 6 + Math.max(0, Math.floor(((local?.danger ?? 10) - 20) / 2)) + state.people.filter(person => person.alive && person.relation === 'child' && personAge(state, person) < 18 && person.location === player.location).length * 18;
  return {
    money: Math.round((salary + focus) * prosperity * impact.income * specialty * mourning),
    stones: realm.income + (player.faction ? 7 : 0) + (player.focus === 'craft' ? 3 + Math.floor(player.craft / 15) : player.role === 'merchant' ? 4 : 1),
    herbs: Math.max(1, Math.floor((player.focus === 'craft' ? 3 + player.craft / 22 : player.focus === 'explore' ? 5 : 1) * region.herbs)),
    living: Math.max(0, baseLiving + impact.living), baseLiving, worldLiving: impact.living, prosperityFactor: prosperity, specialty, mourningFactor: mourning, worldIncome: impact.income,
  };
}

function monthlyPractice(state) {
  const player = state.player, age = ageOf(state), focus = player.focus;
  player.health = clamp(player.health + (focus === 'family' ? 0.14 : 0.07), 0, 100);
  player.mind = clamp(player.mind + (focus === 'family' ? 0.12 : focus === 'cultivate' ? 0.02 : 0.04), 0, 100);
  if (focus === 'learn') player.insight = clamp(player.insight + (age < 18 ? 0.32 : 0.2), 0, 100);
  if (focus === 'craft' && age >= 6) player.craft = clamp(player.craft + 0.18 + (player.inventory.book ? 0.1 : 0), 0, 100);
  if (focus === 'explore' && age >= 12) player.insight = clamp(player.insight + 0.08, 0, 100);
  if (focus === 'cultivate' && !player.realm && player.training.learned) {
    player.training.progress = Math.min(ENTRY_PRACTICE, player.training.progress + (0.65 + player.insight / 200 + player.talent / 300) * (homeMourning(state).length ? 0.5 : 1));
    player.insight = clamp(player.insight + 0.12, 0, 100);
  }
  if (focus === 'family') {
    player.bond = clamp(player.bond + 0.08, 0, 100);
    for (const person of aliveFamily(state)) person.bond = clamp(person.bond + 0.12, 0, 100);
  }
  if (player.realm) {
    const root = ROOTS.find(item => item.id === player.root), technique = TECHNIQUES.find(item => item.id === player.technique);
    const intensity = focus === 'cultivate' ? 1 : focus === 'learn' ? 0.3 : focus === 'explore' ? 0.23 : 0.14;
    const affinity = player.root === 'none' && player.training.awakened ? 0.65 : root.affinity;
    const gain = (0.25 + player.talent / 100) * affinity * technique.affinity * (0.8 + player.mind / 250) * (0.7 + player.insight / 200) * regionById(player.location).spirit * currentRealm(state).growth * intensity * HOME_STYLES[player.homeStyle].practice * worldImpact(state).spirit * (homeMourning(state).length ? 0.5 : 1);
    player.progress = Math.min(currentRealm(state).threshold * 1.12, player.progress + gain);
  }
}

function updatePeople(state) {
  for (const person of [...state.people]) {
    if (!person.alive) continue;
    const age = personAge(state, person);
    if (['friend', 'child'].includes(person.relation) && age >= 18 && !state.flags['ownpath:' + person.id]) {
      state.flags['ownpath:' + person.id] = true;
      const learn = person.talent > 55 && random(state, 'people') < 0.6;
      person.goal = learn ? 'cultivate' : 'live';
      if (learn) { person.realm = 1; person.lifespan = REALMS[1].lifespan; }
      person.location = pick(state, REGIONS, 'people').id;
      person.history.push({ month: state.month, realm: person.realm, location: person.location, kind: 'path' });
      addLog(state, person.name + '开始了自己的道路，在' + regionById(person.location).name + (learn ? '学习调息。' : '安排生计。'), 'relationship', { actorId: person.id });
    }
    if (person.realm && person.goal === 'cultivate' && person.talent > 45 && age > 25 && age < person.lifespan - 5 && person.realm < 3 && random(state, 'people') < 0.035) {
      person.realm++;
      person.lifespan = Math.max(person.lifespan, REALMS[person.realm].lifespan);
      person.history.push({ month: state.month, realm: person.realm, location: person.location, kind: 'realm' });
      if (['mentor', 'friend', 'partner', 'student'].includes(person.relation)) addLog(state, person.name + '经过自己的积累，迈入了' + REALMS[person.realm].name + '。', 'relationship', { actorId: person.id });
    }
    if (age > person.lifespan * 0.75) person.health = Math.max(0, person.health - 0.8);
    if (age >= person.lifespan || person.health <= 0) {
      person.alive = false;
      person.deathMonth = state.month;
      person.history.push({ month: state.month, realm: person.realm, location: person.location, kind: 'death' });
      if (['mother', 'father', 'guardian', 'partner', 'child', 'friend', 'mentor', 'student'].includes(person.relation)) {
        const parent = ['mother', 'father', 'guardian'].includes(person.relation);
        const relation = ({ mother: '母亲', father: '父亲', guardian: '抚养人', partner: '伴侣', child: '孩子', friend: '同伴', mentor: '师长', student: '学生' })[person.relation];
        addLog(state, relation + person.name + '在' + regionById(person.location).name + '离世，享年 ' + age + ' 岁。' + (parent ? '故乡传来讣告，养育你的长辈已经不在；返乡、治丧与此后的生活需要郑重安排。' : '这段相处成为旧日记忆，你需要留出时间告别。'), 'memory', { actorId: person.id });
        bump(state, { mind: parent ? -18 : -7 });
        if (parent && state.player.retreat) { state.player.retreat = null; addLog(state, '得知' + relation + '离世，你立即结束闭关，停下原定安排，准备回应讣告。', 'retreat'); }
        queueEvent(state, parent ? 'bereavement' : 'farewell', { actorId: person.id }, state.month, 'farewell:' + person.id);
      }
      const faction = state.world.factions.find(item => item.leaderId === person.id);
      if (faction) {
        const successor = makePerson(state, { relation: 'elder', age: 35, realm: 2, faction: faction.id, location: factionById(faction.id).region });
        state.people.push(successor);
        faction.leaderId = successor.id;
        const text = factionById(faction.id).name + '由' + successor.name + '接过这一轮职责。';
        state.world.history.push({ month: state.month, text });
        if (state.player.faction === faction.id) addLog(state, text, 'world');
      }
    }
  }
  for (const person of state.people) {
    if (person.alive && person.relation === 'child' && personAge(state, person) >= 18 && !state.flags['grown:' + person.id]) {
      state.flags['grown:' + person.id] = true;
      person.goal = 'live';
      addLog(state, person.name + '开始安排自己的生活。你们的关系也有了新的形状。', 'relationship', { actorId: person.id });
    }
  }
}

function worldYear(state) {
  updateWorldYear(state, queueEvent);
}

function scheduleAgeEvents(state) {
  const age = ageOf(state);
  for (const rule of AGE_EVENTS) {
    if (age < rule.age || state.flags['queued:age:' + rule.age]) continue;
    let actorId;
    if (rule.condition === 'mentor') actorId = state.player.mentorId;
    if (rule.condition === 'friend') actorId = state.people.find(person => person.alive && person.relation === 'friend')?.id;
    if (rule.condition === 'parent') actorId = parentOf(state)?.id;
    if (rule.condition === 'partner') actorId = state.player.partnerId;
    if (['mentor', 'friend', 'parent', 'partner'].includes(rule.condition) && !personById(state, actorId)?.alive) { state.flags['queued:age:' + rule.age] = true; continue; }
    if (rule.condition === 'mortal' && (state.player.realm || state.player.training.learned)) { state.flags['queued:age:' + rule.age] = true; continue; }
    if (rule.condition === 'journey' && !storyAllowed(state, 'journey')) continue;
    if (rule.condition === 'experienced' && state.player.realm < 2 && state.player.craft < 30) continue;
    if (rule.condition === 'family' && !familyAt(state).length) { state.flags['queued:age:' + rule.age] = true; continue; }
    if (SMALL_STORIES.includes(rule.event) && state.month - (state.flags['last:' + rule.event] ?? -200) < 96) { state.flags['queued:age:' + rule.age] = true; continue; }
    queueEvent(state, rule.event, actorId ? { actorId } : {}, state.month, 'age:' + rule.age);
  }
}

function yearly(state) {
  updatePeople(state);
  worldYear(state);
  const player = state.player, age = ageOf(state), income = incomePreview(state);
  if (age >= 16) {
    player.money += income.money;
    player.stones += income.stones;
    player.herbs += income.herbs;
    const actualLiving = Math.min(player.money, income.living);
    player.money -= actualLiving;
    if (actualLiving < income.living) {
      player.debt = (player.debt || 0) + income.living - actualLiving;
      bump(state, { health: -2, mind: -2 });
      addLog(state, '家用暂时不足，你记下一笔 ' + (income.living - actualLiving) + ' 铜钱的欠账。', 'economy');
    }
    const repay = Math.min(player.money, player.debt || 0, Math.floor(income.money * 0.3));
    player.money -= repay;
    player.debt = (player.debt || 0) - repay;
    ledger(state, '一年谋生所得', income.money, income.stones, income.herbs);
    const normal = Math.min(actualLiving, income.baseLiving), extra = actualLiving - normal;
    ledger(state, '一年家用（地域、境界与同住孩子）', -normal);
    if (extra) ledger(state, '世局追加家用与税役', -extra);
    if (repay) ledger(state, '偿还欠账', -repay);
    addLog(state, '这一年在' + regionById(player.location).name + '谋生得到 ' + costText({ money: income.money, stones: income.stones, herbs: income.herbs }) + '；支付家用 ' + actualLiving + ' 铜钱' + (income.worldLiving ? '（世局变化 ' + (income.worldLiving > 0 ? '+' : '') + income.worldLiving + ' 铜钱）' : '') + (repay ? '、还欠账 ' + repay + ' 铜钱' : '') + '。' + (income.mourningFactor < 1 ? '因返乡守丧减少工时，谋生收入按平日的 70% 结算。' : ''), 'economy');
    state.stats.earnings += income.money;
  }
  if (player.focus === 'craft') state.stats.craft++;
  if (player.focus === 'family') state.stats.family++;
  if (age > player.lifespan * 0.76) player.health = clamp(player.health - 1.6, 0, 100);
  const place = regionById(player.location).name, relatives = aliveFamily(state), lastFlavor = state.flags['flavor:' + player.focus] ?? -1;
  const flavors = [0, 1, 2, 3, 4].filter(index => index !== lastFlavor), flavor = pick(state, flavors, 'story');
  state.flags['flavor:' + player.focus] = flavor;
  const details = {
    learn: ['你在书塾借书，抄下难字。', '你向医馆先生请教草药的用量。', '你核对账册中的收入与用料。', '你逐页整理自己读过的行气笔记。', '你为下一次问道记下需要请教的问题。'],
    family: relatives.length ? ['你与' + relatives[0].name + '通信，商量下一季的衣食。', '你替在世的亲人整理药材与家用。', '你把日子留给做饭、洒扫和探望亲友。', '你记下在世亲友的近况，安排自己的生活。', '你留好粮钱，也给亲友写了一封近况信。'] : ['家中已没有在世的亲人，你独自安排做饭、洒扫和家用。', '你整理故人留下的衣物与账册，记下彼此相处过的事。', '你去医馆查看自己的健康，为下季留够药材。', '你修补自己的衣物与工具，照料无人陪伴的日常。', '你独自清扫住处，给故人的旧物留了一个位置。'],
    craft: ['你按药铺的货单称药、晒药。', '你修补磨损的工具，记录用料。', '你把常做的工序写成了笔记。', '你替街坊验药、修器，收取工钱。', '你反复练习火候与尺寸，手艺更熟练。'],
    cultivate: player.realm ? ['你按功法完成每日行气。', '你核对灵草与灵石储备，为突破作准备。', '你在静室练习收放灵息。', '你复查经脉中的行气顺序。', '你把调息与休养排进每日的生活。'] : ['你练习吐纳、引气与收息。', '你照调息篇检查每一步吐纳。', '你向医馆复述引气时的感觉。', '你为凝聚气府清点灵草与灵石。', '你按月练习，不把读书的悟性当成已经入道。'],
    explore: ['你在本地山路探路，记下险处。', '你往返附近药坡，了解采集地点。', '你向商队问路，核对远行路资。', '你走访附近村镇，登记所见的药铺。', '你在当地历练，准备下一次迁居的路线。'],
  };
  addLog(state, age + ' 岁，你在' + place + '：' + details[player.focus][flavor] + (player.focus === 'cultivate' ? player.realm ? '当前修为 ' + Math.floor(player.progress) + ' / ' + currentRealm(state).threshold + '。' : '引气练习 ' + Math.floor(player.training.progress) + ' / 12。' : player.focus === 'learn' ? '悟性 ' + Math.round(player.insight) + '。' : player.focus === 'craft' ? '技艺 ' + Math.round(player.craft) + '。' : ''), 'year');
  scheduleAgeEvents(state);
  if (age >= 22 && state.month >= (state.flags.nextJourney || 0) && storyAllowed(state, 'journey')) {
    queueEvent(state, 'journey'); state.flags.nextJourney = state.month + (player.focus === 'explore' ? 60 : 96);
  }
  if (age >= 18 && state.month >= (state.flags.nextSmallStory || 0)) {
    state.flags.nextSmallStory = state.month + 24;
    if (!state.storyDeck.length) state.storyDeck = shuffled(state, SMALL_STORIES);
    const eligible = event => storyAllowed(state, event) && state.month - (state.flags['last:' + event] ?? -200) >= 96 && (event !== 'danger' || player.focus === 'explore');
    let index = state.storyDeck.findIndex(eligible);
    if (index < 0) { state.storyDeck = shuffled(state, SMALL_STORIES.filter(eligible)); index = state.storyDeck.length ? 0 : -1; }
    const event = index >= 0 ? state.storyDeck.splice(index, 1)[0] : null;
    let payload = {};
    if (event === 'encounter') {
      const stranger = makePerson(state, { relation: 'acquaintance', age: integer(state, 22, 48, 'people') });
      state.people.push(stranger);
      payload.actorId = stranger.id;
    }
    if (event) queueEvent(state, event, payload);
  }
  state.years.push({ month: state.month, age, realm: player.realm, health: Math.round(player.health), mind: Math.round(player.mind), stones: player.stones, money: player.money, location: player.location, craft: Math.round(player.craft) });
  if (age >= player.lifespan) finish(state, '寿元已尽');
  else if (player.health <= 0) finish(state, '伤势未能恢复');
}

function step(state) {
  state.month++;
  if (state.player.retreat && state.player.focus !== 'cultivate') {
    state.player.retreat = null;
    addLog(state, '你把时间交还给日常，提前结束了这一段闭关。', 'retreat');
  }
  monthlyPractice(state);
  const player = state.player;
  if (player.travel && state.month >= player.travel.arrival) {
    const completedTask = player.travel.task;
    player.location = player.travel.to;
    if (!player.visited.includes(player.location)) player.visited.push(player.location);
    state.stats.journeys++;
    addLog(state, '你抵达了' + regionById(player.location).name + '。' + regionById(player.location).description, 'travel');
    const activity = LOCAL_ACTIVITIES[player.location], forecast = incomePreview(state);
    addLog(state, '在' + regionById(player.location).name + '可以' + activity.name + '：' + activity.description + '按你眼下的职业与重心，年收入约 ' + forecast.money + ' 铜钱，家用 ' + forecast.living + ' 铜钱；修炼环境倍率 ' + regionById(player.location).spirit + '。', 'travel');
    player.travel = null;
    if (completedTask) completeTravelTask(state, completedTask);
  }
  updateMourning(state);
  if (state.month % 12 === 0) yearly(state);
  if (state.phase !== 'life') return;
  if (player.health <= 0 || ageOf(state) >= player.lifespan) { finish(state, player.health <= 0 ? '伤势未能恢复' : '寿元已尽'); return; }
  if (player.retreat && state.month >= player.retreat.until) {
    addLog(state, '这段闭关结束。你走出住处，重新看看身边的人与山河。', 'retreat');
    player.retreat = null;
  }
  offer(state);
}

export function advance(state, months = 1) {
  if (!Number.isSafeInteger(months) || months < 0 || months > 12000) throw new GameError('推进月份超出允许范围。');
  if (state.phase !== 'life' || state.pending || months === 0) return state;
  const next = clone(state);
  for (let index = 0; index < months && next.phase === 'life' && !next.pending; index++) step(next);
  next.revision++;
  return next;
}

export function advanceToDecision(state, maxMonths = 1200) {
  return advance(state, maxMonths);
}

function join(state, factionId) {
  const faction = factionById(factionId);
  state.player.faction = factionId;
  state.player.location = faction.region;
  if (!state.player.visited.includes(faction.region)) state.player.visited.push(faction.region);
  const elder = state.people.find(person => person.alive && person.faction === factionId && person.relation === 'elder');
  if (elder) { elder.relation = 'mentor'; elder.bond = 62; state.player.mentorId = elder.id; remember(state, elder.id, 'apprenticeship', '成为师长'); }
  state.player.technique = faction.technique;
  state.player.training.learned = true;
  if (state.player.root !== 'none') {
    state.player.realm = 1;
    state.player.training.progress = ENTRY_PRACTICE;
    state.player.lifespan = REALMS[1].lifespan;
    state.player.role = 'cultivator';
    state.player.focus = 'cultivate';
  } else {
    state.player.role = 'herbalist';
    state.player.focus = 'craft';
  }
  addLog(state, '山门接送你到' + regionById(faction.region).name + '，你进入' + faction.name + '，向' + (state.player.mentorId ? personById(state, state.player.mentorId).name : '师长') + '学习' + TECHNIQUES.find(item => item.id === state.player.technique).name + '。' + (state.player.realm ? '师长指导你完成调息、引气与凝聚气府，免费进入炼气期。选择调息修炼积累修为，达到 100 后准备 38 灵石、5 灵草尝试筑基。' : '你暂未见灵根，先学习辨药与调息；成年后悟性 40 可通窍，具体步骤在修行指引中。'), 'turning');
}

function risk(state, chance, successText, failureText, damage = 20) {
  const danger = state.world.regions.find(item => item.id === state.player.location)?.danger || 0;
  if (random(state, 'life') < clamp(chance - danger / 250, 0.05, 0.96)) {
    addLog(state, successText, 'chance');
    return true;
  }
  let wound = damage;
  if (state.player.inventory.charm > 0) { state.player.inventory.charm--; wound = Math.ceil(wound * 0.45); }
  bump(state, { health: -wound, mind: -4 });
  addLog(state, failureText + '（体魄 −' + wound + '）', 'risk');
  return false;
}

function completeTravelTask(state, task) {
  if (task.kind === 'care') {
    const actor = personById(state, task.actorId);
    if (!actor?.alive || actor.location !== state.player.location) {
      addLog(state, '你到达了约定的探望地点，但长辈已经离世或离开当地；这次探望未能完成，后续安排按亲友的现况处理。', 'relationship');
      return;
    }
    bump(state, { bond: 8, mind: 3 }); state.stats.family += 4; actor.bond = clamp(actor.bond + 12, 0, 100);
    remember(state, actor.id, 'care', '抵达后亲自探望，帮忙料理日常');
    addLog(state, '你抵达后亲自探望' + actor.name + '，帮忙料理饭食、洒扫与药材。牵挂增加 8、心境增加 3；彼此亲近增加 12。', 'relationship', { actorId: actor.id });
  } else if (task.kind === 'repair') {
    if (!familyAt(state, task.region).length) {
      addLog(state, '你回到故乡时旧屋已无人居住；原定为家人修屋的安排取消，你整理故人留下的旧物。', 'memory');
      return;
    }
    bump(state, { craft: 4, bond: 4 }); state.stats.family++;
    addLog(state, '你在故乡与仍住在这里的亲人一起补屋梁、修院墙；亲手修缮完成，技艺与牵挂各增加 4。', 'relationship');
  }
}

function startTravel(state, destination, route, purpose = '远行', task = null) {
  const p = state.player;
  if (destination === p.location) { if (task) completeTravelTask(state, task); return; }
  if (p.travel?.to === destination) { if (task) p.travel.task = task; return; }
  if (p.retreat) { p.retreat = null; addLog(state, '你提前出关，为' + purpose + '准备行程。', 'retreat'); }
  if (p.travel) addLog(state, '你中断了原定前往' + regionById(p.travel.to).name + '的行程，已付的路资不退还。', 'travel');
  p.travel = { from: p.location, to: destination, departure: state.month, arrival: state.month + route.months };
  if (task) p.travel.task = task;
  addLog(state, '你为' + purpose + '从' + regionById(p.location).name + '启程前往' + regionById(destination).name + '，行路 ' + route.months + ' 个月，路资 ' + costText({ money: route.money, stones: route.stones }) + '。途中亲友、世界与生计仍按月前行。', 'travel');
}

function beginMourning(state, actor, mode) {
  const p = state.player, route = returnRoute(state, actor);
  if (p.retreat) { p.retreat = null; addLog(state, '你结束闭关，准备料理' + actor.name + '的丧事。', 'retreat'); }
  const remote = mode === 'entrust';
  if (!remote) startTravel(state, actor.location, route, '返乡奔丧');
  const ritesAt = state.month + (remote ? 0 : route.months + 1);
  p.mourning.push({ actorId: actor.id, region: actor.location, mode, stage: remote ? 'observance' : route.months ? 'returning' : 'rites', start: state.month, ritesAt, until: ritesAt + (mode === 'full' ? 24 : 6) });
  p.focus = 'family'; state.stats.family += 3;
  remember(state, actor.id, 'mourning', remote ? '未能亲自返乡，委托乡邻安葬并寄回祭文' : '返乡报丧、成服、安葬，选择' + (mode === 'full' ? '24' : '6') + '个月守丧');
  addLog(state, remote ? '你委托' + regionById(actor.location).name + '的乡邻料理' + actor.name + '的丧事，寄回祭文和 40 铜钱；未能亲自返乡的这份遗憾被记下，周年仍可追思。' : '你为' + actor.name + '准备棺木、素麻衣与安葬，治丧费 ' + (mode === 'full' ? 60 : 20) + ' 铜钱；' + (route.months ? '按月返乡，抵达后完成治丧。' : '在当地先报丧、成服并料理丧事。') + '安葬后守丧 ' + (mode === 'full' ? 24 : 6) + ' 个月，期间暂缓远行与闭关、谋生收入按 70% 结算。', 'memory', { actorId: actor.id });
  queueEvent(state, 'memorial', { actorId: actor.id }, Math.max(state.month + 1, actor.deathMonth + 12), 'memorial:' + actor.id);
}

function updateMourning(state) {
  for (const item of activeMourning(state)) {
    const actor = personById(state, item.actorId);
    if (item.stage === 'returning' && state.player.location === item.region) item.stage = 'rites';
    if (item.stage === 'rites' && state.month >= item.ritesAt && state.player.location === item.region) {
      item.stage = 'observance';
      const kin = familyAt(state, item.region).map(person => person.name).join('、');
      addLog(state, '你为' + actor.name + '报丧、成服，穿上素麻衣，与乡邻一起完成入殓、送葬与安葬。' + (kin ? '仍在当地的亲人' + kin + '与你一同料理后事。' : '当地已没有在世的家人，乡邻协助你料理后事。') + '这一段治丧用去 1 个月，之后开始 ' + (item.mode === 'full' ? 24 : 6) + ' 个月守丧。此为月时钟下的游戏简化。', 'memory', { actorId: actor.id });
      remember(state, actor.id, 'burial', '亲自成服、送葬与安葬');
    }
    if (item.stage === 'observance' && state.month >= item.until) {
      item.stage = 'complete';
      addLog(state, '为' + actor.name + '安排的这一段守丧期满。你收好素麻衣，保留旧物与祭奠记忆，现在可以重新安排远行和闭关。', 'memory', { actorId: actor.id });
      queueEvent(state, 'mourningEnd', { actorId: actor.id }, state.month, 'mourning-end:' + actor.id);
    }
  }
}

function applyStory(state, event, choice, payload) {
  const p = state.player, actor = personById(state, payload.actorId);
  const costs = optionCosts(event, choice, state, payload);
  if (event === 'bereavement') {
    const actual = Math.min(p.money, costs.money);
    p.money -= actual; p.debt += costs.money - actual;
    if (actual < costs.money) addLog(state, '治丧与返乡需 ' + costs.money + ' 铜钱，现付 ' + actual + ' 铜钱，余下 ' + (costs.money - actual) + ' 铜钱记入欠账，后续从收入偿还。', 'economy');
  } else if (!(event === 'immortal' && choice === 'attune')) spend(state, costs);
  if (event === 'breakthrough' || event === 'ascension') {
    if (choice === 'delay') { state.flags.nextBreakthrough = state.month + 24; bump(state, { mind: 2 }); return; }
    if (choice === 'prepare') { state.flags.prepared = true; state.flags.nextBreakthrough = state.month + 6; bump(state, { mind: 5 }); addLog(state, '你认真稳固根基，为下一次尝试多做了一份准备。', 'cultivation'); return; }
    const success = random(state, 'life') < breakthroughChance(state);
    state.flags.prepared = false;
    state.flags.nextBreakthrough = state.month + 24;
    if (success) {
      state.stats.breakthroughs++;
      if (event === 'ascension') { finish(state, '跨过此界天门', 'ascension'); return; }
      p.realm++;
      p.lifespan = Math.max(p.lifespan, REALMS[p.realm].lifespan);
      p.progress = 0;
      bump(state, { health: 10, mind: 9, insight: 3 });
      addLog(state, '灵息重新凝聚。你迈入' + currentRealm(state).name + '，寿元的边界也随之延伸。眼前的人与旧日的承诺仍然存在。', 'cultivation');
    } else {
      state.stats.failures++;
      p.progress *= 0.58;
      bump(state, { health: -integer(state, 14, 28), mind: -9 });
      addLog(state, '这次尝试未能成功，资源已经消耗，伤势需要恢复。你仍可以重新积累，也可以调整接下来的生活。', 'risk');
    }
    return;
  }
  switch (event) {
    case 'initiation':
      if (choice === 'learn') { learnBreath(state); p.focus = 'cultivate'; }
      break;
    case 'entry':
      if (choice === 'enter') enterQi(state);
      if (choice === 'earn') p.focus = 'craft';
      state.flags.nextEntry = state.month + 48;
      break;
    case 'journey':
      state.flags.nextJourney = state.month + (p.focus === 'explore' ? 60 : 96);
      if (choice !== 'stay') startTravel(state, choice, travelPreview(state, choice), '迁居与谋生');
      break;
    case 'bereavement':
      beginMourning(state, actor, choice);
      break;
    case 'memorial':
      if (choice === 'keep') { if (!p.keepsakes.includes(actor.name + '的旧物')) p.keepsakes.push(actor.name + '的旧物'); p.inventory.lamp = 1; bump(state, { mind: 5 }); }
      if (choice === 'read') bump(state, { insight: 3 });
      remember(state, actor.id, 'memorial', choice === 'keep' ? '周年点灯，保存旧物' : '周年整理留下的手记');
      addLog(state, '你在' + actor.name + '的周年重新整理旧物，记下' + (choice === 'keep' ? '点灯追思与保存遗物。' : '对方留下的生活与手记。'), 'memory', { actorId: actor.id });
      break;
    case 'mourningEnd':
      p.focus = ({ family: 'family', practice: 'cultivate', work: 'craft' })[choice]; bump(state, { mind: 6 });
      break;
    case 'primer':
      if (choice === 'read') { bump(state, { insight: 12 }); p.focus = 'learn'; }
      if (choice === 'hands') { bump(state, { craft: 9 }); p.focus = 'craft'; }
      if (choice === 'company') { bump(state, { bond: 9, mind: 5 }); state.stats.family += 3; }
      break;
    case 'path':
      if (['songyin', 'zhaochuan'].includes(choice)) join(state, choice);
      if (choice === 'craft') { join(state, 'yaohui'); p.role = 'herbalist'; p.focus = 'craft'; bump(state, { craft: 10 }); }
      if (choice === 'home') { p.role = 'scholar'; bump(state, { insight: 8, bond: 8 }); p.focus = 'family'; }
      break;
    case 'profession':
      p.role = choice;
      if (choice === 'cultivator') { if (!p.realm) learnBreath(state); p.focus = 'cultivate'; }
      if (choice === 'artisan' || choice === 'herbalist') { p.focus = 'craft'; bump(state, { craft: 9 }); }
      if (choice === 'merchant') { bump(state, { insight: 7 }); p.focus = 'explore'; }
      if (choice === 'farmer') { p.focus = 'family'; bump(state, { bond: 6, mind: 4 }); }
      if (p.realm && p.faction) addLog(state, '你在既有的修行与职责之外，也为生计留下了一门手艺。', 'economy');
      break;
    case 'mentor':
      if (choice === 'people') { bump(state, { bond: 6 }); p.stones += 5; state.stats.help++; }
      if (choice === 'books') bump(state, { insight: 9 });
      if (choice === 'honest') bump(state, { mind: 5 });
      remember(state, p.mentorId, 'trust', choice);
      break;
    case 'bond':
      if (choice === 'together' && actor) { actor.relation = 'partner'; actor.bond = 82; p.partnerId = actor.id; actor.location = p.location; bump(state, { bond: 10, mind: 6 }); remember(state, actor.id, 'partnership', '共同安排生活'); }
      if (choice === 'friends') { bump(state, { bond: 6 }); if (actor) actor.bond += 8; }
      if (choice === 'later') bump(state, { mind: 3 });
      break;
    case 'care': {
      const parent = actor?.alive ? actor : parentOf(state);
      if (choice === 'visit') { if (parent) startTravel(state, parent.location, returnRoute(state, parent), '探望长辈', { kind: 'care', actorId: parent.id }); p.focus = 'family'; }
      if (choice === 'medicine') { if (parent) parent.health = clamp(parent.health + 12, 0, 100); state.stats.help++; bump(state, { bond: 6 }); }
      if (choice === 'letter') bump(state, { bond: 2 });
      if (choice !== 'visit') remember(state, parent?.id, 'care', choice);
      break;
    }
    case 'family':
      if (choice !== 'wait') {
        const child = makePerson(state, { relation: 'child', age: choice === 'adopt' ? 3 : 0, bond: 85, goal: 'live' });
        state.people.push(child);
        state.stats.family += 6;
        p.focus = 'family';
        bump(state, { bond: 8, mind: 4 });
        addLog(state, child.name + '成为你们新的牵挂。接下来的生活里，多了一份共同的责任。', 'relationship', { actorId: child.id });
      } else bump(state, { mind: 3 });
      break;
    case 'promise':
      if (choice === 'keep') { p.herbs += 8; state.stats.help += 2; bump(state, { bond: 6 }); }
      if (choice === 'listen') { bump(state, { insight: 5, bond: 3 }); }
      if (choice === 'decline') bump(state, { mind: 3 });
      remember(state, payload.actorId, 'promise', choice);
      break;
    case 'teaching':
      if (choice === 'teach') {
        const student = makePerson(state, { relation: 'student', age: 17, realm: p.realm ? 1 : 0, bond: 75, faction: p.faction, goal: 'cultivate' });
        state.people.push(student);
        state.stats.students++;
        bump(state, { insight: 5, bond: 5 });
        addLog(state, student.name + '开始向你学习。你们的师承会随着时间继续变化。', 'relationship', { actorId: student.id });
      }
      if (choice === 'notes') { state.stats.help++; bump(state, { craft: 5, insight: 4 }); }
      if (choice === 'decline') bump(state, { mind: 3 });
      break;
    case 'market':
      if (choice === 'buy') { p.inventory.book = 1; bump(state, { craft: 5 }); }
      if (choice === 'trade') { bump(state, { craft: 8, insight: 3 }); }
      break;
    case 'gathering':
      if (choice === 'near') p.herbs += 4;
      if (choice === 'share') { p.herbs += 5; bump(state, { bond: 4 }); }
      if (choice === 'deep' && risk(state, 0.55 + p.realm * 0.055 + (p.inventory.sword ? 0.08 : 0), '你从深处带回了更好的药草。', '山路上遇了险，你放慢脚步返回。', 17)) { p.herbs += 10; p.stones += 5; }
      break;
    case 'encounter':
      if (choice === 'help') { state.stats.help++; bump(state, { bond: 5 }); if (actor) { actor.bond += 15; remember(state, actor.id, 'help', '留下药草'); queueEvent(state, 'promise', { actorId: actor.id }, state.month + 60); } }
      if (choice === 'guide') { bump(state, { bond: 2 }); if (actor) actor.bond += 5; }
      break;
    case 'dispute':
      if (choice === 'listen') bump(state, { bond: 5, insight: 3 });
      if (choice === 'work') { state.stats.help++; bump(state, { bond: 8 }); }
      if (choice === 'distance') bump(state, { mind: 4 });
      break;
    case 'danger':
      if (choice === 'retreat') { p.herbs = Math.max(0, p.herbs - 2); bump(state, { mind: 1 }); }
      if (choice === 'protect') { if (risk(state, clamp(0.6 + p.realm * 0.045, 0, 0.92), '你带着同行的人回到了安全的山路。', '撤离时你受了伤，同行的人协助你返回。', 22)) state.stats.help += 2; }
      if (choice === 'fight') { if (risk(state, clamp(0.36 + p.realm * 0.09 + (p.inventory.sword ? 0.12 : 0), 0, 0.93), '你应对了险情，带回一些修行资源。', '这次应对未能成功，你带着伤势撤回。', 32)) { p.stones += 16; p.herbs += 6; } }
      break;
    case 'homecoming':
      if (choice === 'repair') { if (p.location === p.birthRegion) p.home = 'wood'; state.stats.family += 3; bump(state, { bond: 7 }); addLog(state, '你寄出 100 铜钱，请故乡的匠人修缮亲人仍居住的旧屋。', 'relationship'); }
      if (choice === 'hands') { const region = payload.region || p.birthRegion; startTravel(state, region, returnRoute(state, { location: region }), '返乡修屋', { kind: 'repair', region }); }
      if (choice === 'later') bump(state, { mind: 1 });
      break;
    case 'drought':
      if (choice === 'aid') { state.stats.help += 2; bump(state, { bond: 5 }); }
      if (choice === 'skill') { p.money += 30; bump(state, { craft: 4 }); }
      if (choice === 'save') bump(state, { mind: 3 });
      break;
    case 'war':
      if (choice === 'shelter') { state.stats.help += 3; bump(state, { bond: 6 }); }
      if (choice === 'guard') { if (risk(state, clamp(0.5 + p.realm * 0.07 + (p.inventory.sword ? 0.08 : 0), 0, 0.93), '你帮助一队行人走过了危险的关隘。', '护送途中你受了伤，需要恢复。', 26)) { state.stats.help += 4; p.stones += 12; } }
      if (choice === 'stay') { p.focus = 'family'; bump(state, { mind: 3 }); }
      break;
    case 'inheritance':
      if (choice === 'keep') { p.inventory.lamp = 1; p.keepsakes.push((actor?.name || '故人') + '的旧灯'); state.stats.family += 2; }
      if (choice === 'share') { state.stats.help++; bump(state, { insight: 6 }); }
      if (choice === 'fund') { if (familyAt(state, actor.location).length) { state.stats.family += 3; bump(state, { bond: 5 }); } else { state.stats.help++; addLog(state, '故人当地已没有在世的家人，你将 80 铜钱捐给' + regionById(actor.location).name + '的义仓。', 'memory', { actorId: actor.id }); } }
      break;
    case 'famine':
      if (choice === 'aid') { state.stats.help += 3; const local = state.world.regions.find(item => item.id === p.location); local.prosperity = clamp(local.prosperity + 2, 0, 100); }
      if (choice === 'work') { bump(state, { craft: 3 }); state.stats.help++; }
      break;
    case 'flood':
      if (choice === 'repair') { state.stats.help += 2; const local = state.world.regions.find(item => item.id === p.location); local.danger = clamp(local.danger - 3, 0, 100); }
      if (choice === 'rescue' && risk(state, 0.75, '你把被困住户送到高处，救治棚接手照料。', '搬运门板时你被急流撞伤，乡邻把你拉回堤上。', 18)) state.stats.help += 3;
      break;
    case 'quake':
      if (choice === 'medicine') state.stats.help += 3;
      if (choice === 'build') { bump(state, { craft: 4 }); state.stats.help++; }
      if (choice === 'rest') bump(state, { health: 5 });
      break;
    case 'tax':
      if (choice === 'petition') { bump(state, { insight: 3 }); state.stats.help++; if (payload.worldEventId) state.flags['relief:' + payload.worldEventId] = 10; }
      if (choice === 'work') { p.money += 30; bump(state, { craft: 2 }); }
      break;
    case 'levy':
      if (choice === 'hire') { const active = localWorldEvents(state).find(item => item.id === payload.worldEventId); if (active) active.income = 0.95; addLog(state, '你雇人分担这一轮徭役，当前收入影响由 −20% 调整为 −5%，持续到这轮劳役结束。', 'economy'); }
      if (choice === 'work') { p.money += 20; bump(state, { craft: 3 }); state.stats.help++; }
      if (choice === 'stay') bump(state, { mind: -2 });
      break;
    case 'regime':
      if (choice === 'register') { bump(state, { mind: 3 }); addLog(state, '你将旧契和户册交给' + state.world.regime + '官吏登记，支付 20 铜钱，自己的住处与身份记入新册。', 'world'); }
      if (choice === 'shelter') state.stats.help += 3;
      if (choice === 'wait') bump(state, { insight: 2 });
      break;
    case 'demonwar':
      if (choice === 'shelter') state.stats.help += 4;
      if (choice === 'guard' && risk(state, clamp(0.55 + p.realm * 0.065, 0, 0.94), '你护送乡民撤到阵外，守山修士支付 20 灵石酬劳。', '护山阵的裂隙卷来术法，你受伤撤回。', 28)) { p.stones += 20; state.stats.help += 4; }
      break;
    case 'harvest':
      if (choice === 'sell') p.stones += 8;
      if (choice === 'help') { p.money += 25; bump(state, { craft: 2 }); }
      break;
    case 'trade':
      if (choice === 'goods') { p.stones += 5; bump(state, { craft: 2 }); }
      if (choice === 'work') { p.money += 35; bump(state, { insight: 2 }); }
      break;
    case 'treasure':
      if (choice === 'open' && risk(state, 0.7, '残阵散去，铜匣里有 18 灵石和 6 灵草。', '铜匣残阵伤及手臂，你退回井口。', 14)) { p.stones += 18; p.herbs += 6; }
      if (choice === 'expert') { p.stones += 8; p.herbs += 3; }
      if (choice === 'report') state.stats.help++;
      break;
    case 'immortal':
      if (choice === 'learn') { if (!p.realm) { learnBreath(state); p.training.progress = Math.min(ENTRY_PRACTICE, p.training.progress + 4); p.focus = 'cultivate'; } else p.progress = Math.min(currentRealm(state).threshold * 1.12, p.progress + 10); bump(state, { insight: 4 }); }
      if (choice === 'attune') applyAttune(state);
      if (choice === 'medicine') { state.stats.help += 2; bump(state, { craft: 3 }); }
      break;
    case 'alchemy':
      if (choice === 'brew') { p.inventory.pill++; bump(state, { craft: 2 }); }
      if (choice === 'learn') bump(state, { craft: 5 });
      break;
    case 'workshop':
      if (choice === 'work') { p.money += 40; p.stones += 3; bump(state, { craft: 4 }); }
      if (choice === 'study') bump(state, { craft: 5 });
      break;
    case 'caravan':
      if (choice === 'work') { p.money += 45; bump(state, { insight: 2 }); }
      if (choice === 'road') queueEvent(state, 'journey');
      break;
    case 'relic':
      if (choice === 'enter' && risk(state, Math.min(0.94, 0.6 + p.realm * 0.05), '你带出药箱和行气笔记：24 灵石、8 灵草，修为积累 8。', '石室顶部落石，你护住药箱后带伤撤出。', 24)) { p.stones += 24; p.herbs += 8; p.progress = Math.min(currentRealm(state).threshold * 1.12, p.progress + 8); }
      if (choice === 'copy') bump(state, { insight: 5 });
      if (choice === 'mark') state.stats.help++;
      break;
    case 'research':
      if (choice === 'study') { bump(state, { insight: 7, craft: 3 }); if (p.realm) p.progress = Math.min(currentRealm(state).threshold * 1.12, p.progress + 8); }
      if (choice === 'write') { bump(state, { craft: 7, bond: 3 }); state.stats.craft += 2; }
      if (choice === 'rest') bump(state, { health: 10, mind: 10 });
      break;
    case 'farewell':
      if (choice === 'remember') { p.keepsakes.push((actor?.name || '故人') + '的旧物'); p.inventory.lamp = 1; bump(state, { mind: 5 }); }
      if (choice === 'care') { p.focus = 'family'; state.stats.family += 2; bump(state, { bond: 5, mind: 3 }); }
      if (choice === 'journey') { p.focus = 'explore'; bump(state, { mind: 4, insight: 3 }); }
      queueEvent(state, 'inheritance', payload, state.month + 6, 'inheritance:' + (payload.actorId || state.month));
      break;
    case 'latewish':
      p.focus = ({ family: 'family', work: 'craft', road: 'explore', practice: 'cultivate' })[choice];
      bump(state, { mind: 4 });
      break;
    case 'leadership':
      if (choice === 'serve') { state.stats.help += 2; bump(state, { bond: 6, insight: 4 }); queueEvent(state, 'teaching'); }
      if (choice === 'practice' && p.realm) p.focus = 'cultivate';
      if (choice === 'leave') { p.faction = null; p.focus = 'explore'; addLog(state, '你商量结束了山门职责，带着已有的师承与积累独自行路。', 'turning'); }
      break;
    default: throw new GameError('这个故事尚未有可执行的回应。', 'content');
  }
}

export function choose(state, choiceId) {
  requireLife(state, true);
  if (!state.pending) throw new GameError('当前没有等待回应的抉择。');
  if (!storyAllowed(state, state.pending.event, state.pending.payload)) throw new GameError('这段抉择已经不适用于当前人物与经历。', 'choice');
  const fresh = decisionView(state, { id: state.pending.id, event: state.pending.event, payload: state.pending.payload });
  const option = fresh.options.find(item => item.id === choiceId);
  if (!option || option.disabled) throw new GameError(option?.reason || '无效的回应。', 'choice');
  const next = clone(state), pending = next.pending, before = clone(next.player), ledgerCount = next.ledger.length;
  next.pending = null;
  next.stats.decisions++;
  next.choices.push({ month: next.month, event: pending.event, title: pending.title, choice: choiceId, label: option.label, actorId: pending.payload.actorId || null });
  addLog(next, '面对“' + pending.title + '”，你选择了：' + option.label + '。', 'choice');
  applyStory(next, pending.event, choiceId, pending.payload);
  const changes = ['money', 'stones', 'herbs', 'health', 'mind', 'insight', 'craft', 'bond', 'progress'].filter(key => Math.abs(next.player[key] - before[key]) >= 0.05).map(key => ({ key, value: Math.round((next.player[key] - before[key]) * 10) / 10 }));
  if (changes.length) addLog(next, '这次回应的结果：' + changes.map(({ key, value }) => ({ ...resourceNames, health: '体魄', mind: '心境', insight: '悟性', craft: '技艺', bond: '牵挂', progress: '修为' })[key] + ' ' + (value > 0 ? '+' : '') + value).join('，') + '。', 'consequence');
  if (next.player.inventory.pill !== before.inventory.pill) addLog(next, '养元丹 ' + (next.player.inventory.pill > before.inventory.pill ? '+' : '') + (next.player.inventory.pill - before.inventory.pill) + ' 枚，现在可在坊市服用疗伤。', 'economy');
  const resourceChanges = ['money', 'stones', 'herbs'].map(key => next.player[key] - before[key]);
  if (next.ledger.length === ledgerCount && resourceChanges.some(value => value)) ledger(next, pending.title + ' · ' + option.label, ...resourceChanges);
  if (next.player.retreat && next.player.focus !== 'cultivate') {
    next.player.retreat = null;
    addLog(next, '你决定调整接下来的生活，提前结束这一段闭关。已经经历的年月与积累仍然保留。', 'retreat');
  }
  if (next.player.health <= 0 && next.phase === 'life') finish(next, '伤势未能恢复');
  next.revision++;
  if (next.phase === 'life') offer(next);
  return next;
}

export function autoChoice(state) {
  if (!state.pending) return null;
  const event = state.pending.event, focus = state.player.focus;
  const preferences = {
    initiation: ['later'], entry: ['enter', 'earn', 'wait'], journey: ['stay'],
    bereavement: focus === 'family' ? ['full', 'simple', 'entrust'] : ['simple', 'entrust'],
    memorial: ['keep'], mourningEnd: focus === 'cultivate' ? ['practice', 'work', 'family'] : ['family', 'work'],
    primer: focus === 'learn' ? ['read'] : focus === 'craft' ? ['hands'] : ['company'],
    path: state.player.root === 'none' || focus === 'craft' ? ['craft', 'home'] : focus === 'family' ? ['home', 'songyin'] : ['songyin', 'zhaochuan'],
    profession: focus === 'cultivate' ? ['cultivator', 'herbalist'] : focus === 'family' ? ['farmer'] : focus === 'explore' ? ['merchant'] : ['herbalist', 'artisan'],
    bond: focus === 'family' ? ['together', 'friends'] : ['friends'],
    care: focus === 'family' ? ['visit', 'medicine', 'letter'] : ['medicine', 'letter'],
    family: focus === 'family' ? ['raise', 'wait'] : ['wait'],
    breakthrough: breakthroughChance(state) > 0.67 && state.player.health > 60 ? ['attempt', 'prepare', 'delay'] : ['prepare', 'delay', 'attempt'],
    ascension: ['attempt', 'prepare', 'delay'],
    danger: state.player.health > 78 && state.player.realm >= 2 ? ['protect', 'retreat'] : ['retreat'],
    war: state.player.health > 72 && state.player.realm >= 2 ? ['guard', 'shelter', 'stay'] : ['shelter', 'stay'],
    farewell: focus === 'family' ? ['care', 'remember'] : focus === 'cultivate' ? ['remember'] : ['journey', 'remember'],
    latewish: focus === 'cultivate' ? ['practice', 'road'] : focus === 'family' ? ['family'] : ['work', 'road'],
    leadership: focus === 'cultivate' ? ['practice', 'serve'] : ['serve', 'leave'],
  };
  const options = decisionView(state, { id: state.pending.id, event, payload: state.pending.payload }).options.filter(item => !item.disabled);
  return (preferences[event] || []).find(id => options.some(item => item.id === id)) || options[0]?.id || null;
}

export function travelPreview(state, destination, { onFoot = false } = {}) {
  const target = regionById(destination);
  if (!target) throw new GameError('未知目的地。');
  const from = regionById(state.player.location);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  return { destination, months: destination === state.player.location ? 0 : Math.max(1, Math.ceil(distance / (!onFoot && state.player.realm >= 2 ? 32 : 16))), money: destination === state.player.location ? 0 : Math.ceil(distance * 1.1) + 12, stones: destination === state.player.location || onFoot ? 0 : state.player.realm >= 2 ? 2 : 0 };
}

export function act(state, action) {
  requireLife(state);
  if (['exchange', 'brew', 'buy', 'sell'].includes(action.type) && marketReason(state)) throw new GameError(marketReason(state));
  const next = clone(state), p = next.player;
  if (action.type === 'heal') {
    if (p.health >= 99) throw new GameError('眼下无需使用药草疗伤。');
    spend(next, { herbs: 2 }); bump(next, { health: 20, mind: 3 }); ledger(next, '药草疗伤', 0, 0, -2); addLog(next, '你用两株灵草处理伤势，留出一点恢复的时间。', 'health');
  } else if (action.type === 'learnBreath') {
    if (ageOf(next) < 12 || p.realm || p.training.learned || p.travel) throw new GameError('12 岁后在当地学习调息；已经学过或正在行路时无需重复学习。');
    learnBreath(next); p.focus = 'cultivate';
  } else if (action.type === 'practiceMonth') {
    if ((!p.realm && !p.training.learned) || p.travel || p.retreat || ageOf(next) < 12) throw new GameError('先学调息并结束行程，再按月练习；闭关中请使用岁月推进。');
    p.focus = 'cultivate'; next.revision++; return advance(next, 1);
  } else if (action.type === 'attune') {
    if (p.travel) throw new GameError('抵达后才能请医馆辅助通窍。');
    applyAttune(next); ledger(next, '医馆通窍', 0, -ATTUNE_COST.stones, -ATTUNE_COST.herbs);
  } else if (action.type === 'exchange') {
    if (ageOf(next) < 12) throw new GameError('12 岁后可独自兑换。');
    if (action.direction === 'stones') { spend(next, { money: 100 }); p.stones += 5; ledger(next, '100 铜钱兑换 5 灵石', -100, 5); addLog(next, '你在坊市支付 100 铜钱，兑换 5 灵石，可用于入道、丹药、物品与突破。', 'economy'); }
    else if (action.direction === 'money') { spend(next, { stones: 5 }); p.money += 80; ledger(next, '5 灵石兑回 80 铜钱', 80, -5); addLog(next, '你在坊市交出 5 灵石，兑回 80 铜钱，作为家用、路资或治丧费用。', 'economy'); }
    else throw new GameError('未知的兑换方向。');
  } else if (action.type === 'brew') {
    if (ageOf(next) < 12 || p.craft < 20 || p.travel || p.retreat) throw new GameError('技艺达到 20，在当地出关后可炼制养元丹。');
    spend(next, { herbs: 3, stones: 1 }); p.inventory.pill++; bump(next, { craft: 2 });
    ledger(next, '炼制养元丹', 0, -1, -3); addLog(next, '你称药、控火，花 3 灵草、1 灵石炼成 1 枚养元丹，技艺增加 2；可在坊市服用，恢复 30 体魄、5 心境。', 'economy');
    next.revision++; return advance(next, 1);
  } else if (action.type === 'usePill') {
    if (!p.inventory.pill || p.health >= 99) throw new GameError('需要持有养元丹，并且当前仍有伤势。');
    p.inventory.pill--; bump(next, { health: 30, mind: 5 }); addLog(next, '你服用 1 枚养元丹，体魄恢复至 ' + Math.round(p.health) + '、心境恢复至 ' + Math.round(p.mind) + '。', 'health');
  } else if (action.type === 'localActivity') {
    const preview = localActivityPreview(next);
    if (preview.disabled) throw new GameError(preview.reason);
    spend(next, preview.costs);
    const before = { money: p.money, stones: p.stones, herbs: p.herbs };
    for (const key of ['stones', 'herbs']) if (preview[key]) p[key] += preview[key];
    for (const key of ['insight', 'craft']) if (preview[key]) bump(next, { [key]: preview[key] });
    if (p.location === 'landu') { if (!p.realm) { learnBreath(next); p.training.progress = Math.min(ENTRY_PRACTICE, p.training.progress + 3); } else p.progress = Math.min(currentRealm(next).threshold * 1.12, p.progress + 5); bump(next, { mind: 2 }); }
    if (p.location === 'wenxue' && risk(next, 0.8, '你从雪岭药谷带回 9 灵草、4 灵石。', '药谷的碎石坡滑落，你带伤返回。', 12)) { p.herbs += 9; p.stones += 4; }
    ledger(next, regionById(p.location).name + ' · ' + preview.name, p.money - before.money - (preview.costs.money || 0), p.stones - before.stones - (preview.costs.stones || 0), p.herbs - before.herbs - (preview.costs.herbs || 0));
    addLog(next, '你在' + regionById(p.location).name + preview.name + '，花费 ' + costText(preview.costs) + '，安排 1 个月；' + preview.description, 'activity');
    next.flags.nextLocalActivity = next.month + 3; next.revision++;
    if (p.health <= 0) { finish(next, '伤势未能恢复'); return next; }
    return advance(next, 1);
  } else if (action.type === 'buy') {
    if (ageOf(next) < 12) throw new GameError('再长大一些，才能独自前往坊市。');
    const item = ITEMS.find(value => value.id === action.item);
    if (!item) throw new GameError('未知物品。');
    if (['sword', 'book', 'lamp'].includes(item.id) && p.inventory[item.id]) throw new GameError('你已经拥有这件物品。');
    const count = item.id === 'herbs' ? 5 : 1;
    const price = item.price * count;
    spend(next, { stones: price });
    if (item.id === 'herbs') p.herbs += count; else p.inventory[item.id] += count;
    ledger(next, '购入' + item.name, 0, -price, item.id === 'herbs' ? count : 0);
    addLog(next, '你在坊市购入' + count + '份' + item.name + '，花费 ' + price + ' 灵石。', 'economy');
  } else if (action.type === 'sell') {
    if (ageOf(next) < 12) throw new GameError('眼下还不能独自出售药草。');
    spend(next, { herbs: 5 }); p.stones += 5; ledger(next, '出售灵草', 0, 5, -5); addLog(next, '你将五株灵草交给坊市药商，换得五枚灵石。', 'economy');
  } else if (action.type === 'travel') {
    if (ageOf(next) < 12) throw new GameError('眼下还不宜独自远行。');
    if (p.travel) throw new GameError('请先完成当前的行程。');
    if (p.retreat) throw new GameError('请先结束闭关，再启程。');
    if (homeMourning(next).length) throw new GameError('返乡治丧和守丧期间暂缓另一次远行。');
    if (action.to === p.location) throw new GameError('你已经在这里。');
    const preview = travelPreview(next, action.to);
    spend(next, { money: preview.money, stones: preview.stones });
    startTravel(next, action.to, preview);
    ledger(next, '前往' + regionById(action.to).name, -preview.money, -preview.stones, 0);
  } else if (action.type === 'retreat') {
    if (!p.realm) throw new GameError('先学会调息入道，再安排闭关。');
    if (p.travel) throw new GameError('请先结束行程，再安排闭关。');
    if (p.retreat) throw new GameError('这一段闭关尚未结束。');
    if (homeMourning(next).length) throw new GameError('守丧期间暂缓长期闭关；日常仍可按月调息。');
    if (![1, 3, 5, 10].includes(action.years)) throw new GameError('请选择一、三、五或十年的闭关。');
    p.retreat = { start: next.month, until: next.month + action.years * 12 };
    p.focus = 'cultivate'; next.stats.retreats++;
    addLog(next, '你安排了 ' + action.years + ' 年闭关。山河与亲友仍会继续变化，重要消息会使你停下来回应。', 'retreat');
  } else if (action.type === 'leaveRetreat') {
    if (!p.retreat) throw new GameError('眼下没有闭关安排。');
    p.retreat = null;
    addLog(next, '你提前结束了这一段闭关，带着已经发生的积累回到日常。', 'retreat');
  } else if (action.type === 'initiate') {
    const reason = entryReason(next);
    if (reason || p.travel) throw new GameError(reason || '抵达后再凝聚气府。');
    spend(next, ENTRY_COST); enterQi(next); ledger(next, '凝聚气府，进入炼气', 0, -12, -3);
  } else if (action.type === 'home') {
    if (ageOf(next) < 18) throw new GameError('成年后才能独自安排自己的住处。');
    if (p.travel || p.retreat || homeMourning(next).length) throw new GameError('返乡治丧、守丧、行路和闭关期间暂缓改造住处。');
    if (!Object.hasOwn(HOME_STYLES, action.style)) throw new GameError('未知住处样式。');
    if (p.homeStyle === action.style) return state;
    const old = HOME_STYLES[p.homeStyle], target = HOME_STYLES[action.style], balance = p.stones;
    spend(next, { stones: target.stones }); p.homeStyle = action.style;
    ledger(next, old.name + '改为' + target.name, 0, -target.stones, 0); addLog(next, '你将' + regionById(p.location).name + '的住处由' + old.name + '改为' + target.name + '，一次支付 ' + target.stones + ' 灵石（余额 ' + balance + ' → ' + p.stones + '）。修炼环境加成由 ' + Math.round((old.practice - 1) * 100) + '% 调整为 ' + Math.round((target.practice - 1) * 100) + '%；当前年表与坊市账册均已记录这笔费用。', 'home');
  } else throw new GameError('未知行动。');
  next.revision++;
  return next;
}

function finish(state, cause, forced = null) {
  if (state.phase === 'ended') return;
  let type = forced;
  if (!type) {
    type = cause.includes('伤势') ? 'fallen' : state.stats.students >= 2 ? 'teacher' : state.stats.help >= 18 ? 'guardian' : state.player.visited.length >= 4 ? 'wanderer' : state.stats.family >= 22 ? 'family' : state.player.craft >= 55 || state.stats.craft >= 30 ? 'artisan' : 'quiet';
  }
  const definition = ENDINGS[type];
  state.phase = 'ended'; state.pending = null; state.queue = []; state.player.travel = null; state.player.retreat = null;
  state.ending = { type, ...definition, cause, month: state.month, age: ageOf(state), realm: currentRealm(state).name, location: regionById(state.player.location).name };
  addLog(state, '此生在' + regionById(state.player.location).name + '告一段落：' + cause + '。' + definition.subtitle, 'ending');
}

export function summarize(state) {
  return {
    id: state.id, name: state.player.name, seed: state.seed, phase: state.phase, age: ageOf(state), realm: currentRealm(state).name,
    birth: clone(state.birth), ending: state.ending ? clone(state.ending) : null, stats: clone(state.stats),
    places: state.player.visited.map(id => regionById(id).name), people: state.people.filter(person => ['mother', 'father', 'guardian', 'partner', 'child', 'mentor', 'student'].includes(person.relation)).map(person => ({ name: person.name, relation: person.relation, alive: person.alive, age: personAge(state, person), memories: person.memories.length })),
    days: state.month, decisions: state.choices.length, log: clone(state.log), years: clone(state.years),
  };
}
