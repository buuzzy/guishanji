import { WORLD_EVENTS } from '../../content/expansion.js';
import { STORIES } from '../../content/stories.js';
import { regionById } from '../../content/world.js';
import { calendar, clamp, ageOf, addLog } from './state.js';
import { pick, random, integer } from './random.js';

export function shuffled(state, items, stream = 'story') {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = integer(state, 0, index, stream);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function localWorldEvents(state, region = state.player.location) {
  return state.world.activeEvents.filter(item => item.end > state.month && (!item.region || item.region === region));
}

/** Pure query; the same calculation is used for income, practice and displayed forecasts. */
export function worldImpact(state, region = state.player.location) {
  const events = localWorldEvents(state, region);
  return {
    income: Math.max(0.35, events.reduce((value, item) => value * item.income, 1)),
    living: events.reduce((value, item) => value + Math.max(item.living < 0 ? item.living : 0, item.living - (state.flags['relief:' + item.id] || 0)), 0),
    spirit: Math.max(0.4, events.reduce((value, item) => value * item.spirit, 1)),
    events,
  };
}

export function updateWorldYear(state, queue) {
  const date = calendar(state);
  state.world.weather = pick(state, ['晴', '细雨', '长风', '云起'], 'world');
  for (const region of state.world.regions) {
    region.prosperity = clamp(region.prosperity + integer(state, -3, 3, 'world'), 10, 95);
    region.danger = clamp(region.danger + integer(state, -2, 2, 'world'), 4, 70);
  }
  for (const faction of state.world.factions) faction.influence = clamp(faction.influence + integer(state, -2, 2, 'world'), 20, 90);
  for (const event of state.world.activeEvents.filter(item => item.end <= state.month)) {
    const text = (event.region ? regionById(event.region).name : '各地') + '的“' + STORIES[event.type].title + '”这一轮持续影响结束，之后的收入和家用按现况重新计算。';
    state.world.history.push({ month: state.month, text, type: 'recovery', region: event.region });
    addLog(state, text, 'world');
  }
  state.world.activeEvents = state.world.activeEvents.filter(item => item.end > state.month);
  if (ageOf(state) < 3 || ageOf(state) % 3 !== 0) return;
  if (!state.world.eventDeck.length) state.world.eventDeck = shuffled(state, WORLD_EVENTS.map(item => item.id), 'world');
  const type = state.world.eventDeck.shift(), source = WORLD_EVENTS.find(item => item.id === type);
  const region = source.global ? null : random(state, 'world') < 0.7 ? state.player.location : pick(state, state.world.regions, 'world').id;
  const label = region ? regionById(region).name : '各地';
  const previousRegime = state.world.regime;
  if (type === 'regime') {
    const regimes = ['澄川朝', '景澜朝', '延禾朝', '玄昭朝'];
    state.world.regime = regimes[(regimes.indexOf(previousRegime) + 1) % regimes.length];
  }
  const event = { id: state.id + ':world:' + state.month, type, region, start: state.month, end: state.month + source.duration, income: source.income, living: source.living, spirit: source.spirit };
  state.world.activeEvents.push(event);
  state.world.era = source.era;
  for (const local of state.world.regions.filter(item => !region || item.id === region)) {
    local.prosperity = clamp(local.prosperity + source.prosperity, 10, 95);
    local.danger = clamp(local.danger + source.danger, 4, 70);
  }
  const affected = !region || region === state.player.location;
  const text = label + '：' + STORIES[type].title + '。' + (type === 'regime' ? previousRegime + '的官府撤离，' + state.world.regime + '接管城镇。' : '') + source.detail + '持续 ' + source.duration + ' 个月。' + (affected ? '此事正在影响你所在的地域。' : '消息来自异地；你目前的收入与家用按所在地域计算。');
  state.world.history.push({ month: state.month, text, type, region, eventId: event.id });
  addLog(state, text, 'world');
  if (ageOf(state) >= 12 && affected) queue(state, type, { region, worldEventId: event.id }, state.month, 'world:' + state.month);
  if (state.player.faction && state.player.realm >= 2 && state.month >= (state.flags.nextLeadership || 0)) {
    state.flags.nextLeadership = state.month + 180;
    queue(state, 'leadership');
  }
}
