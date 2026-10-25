import { newLife, beginLife, advance, choose, setFocus, act } from '../apps/web/game-api.js';
import { validateState } from '../packages/core/validate.js';

const priorities = {
  cultivate: { primer: ['read'], path: ['songyin', 'zhaochuan', 'craft'], profession: ['cultivator', 'herbalist'], bond: ['friends'], care: ['medicine', 'letter'], family: ['wait'], farewell: ['remember'], latewish: ['practice', 'work'], war: ['shelter', 'stay'], leadership: ['practice'], research: ['study'], teaching: ['notes'] },
  family: { primer: ['company'], path: ['home'], profession: ['farmer'], bond: ['together'], care: ['visit'], family: ['raise'], farewell: ['care'], latewish: ['family'], war: ['stay'], leadership: ['serve'], research: ['rest'], teaching: ['notes'] },
  artisan: { primer: ['hands'], path: ['craft'], profession: ['artisan'], bond: ['friends'], care: ['letter'], family: ['wait'], farewell: ['remember'], latewish: ['work'], war: ['stay'], leadership: ['leave'], research: ['write'], teaching: ['notes'] },
  teacher: { primer: ['hands'], path: ['craft'], profession: ['herbalist'], teaching: ['teach', 'notes'], latewish: ['work'], care: ['letter'], farewell: ['remember'] },
  guardian: { primer: ['read'], path: ['home'], profession: ['herbalist'], war: ['shelter', 'guard'], drought: ['aid', 'skill'], encounter: ['help', 'guide'], promise: ['keep', 'listen'], teaching: ['notes'], latewish: ['family'] },
  wanderer: { primer: ['read'], path: ['home'], profession: ['merchant'], bond: ['friends'], care: ['letter'], family: ['wait'], farewell: ['journey'], teaching: ['decline'], latewish: ['road'], war: ['stay'], drought: ['save'], encounter: ['guide'], promise: ['listen'] },
  quiet: { primer: ['read'], path: ['home'], profession: ['farmer'], bond: ['friends'], care: ['letter'], family: ['wait'], farewell: ['remember'], teaching: ['decline'], latewish: ['road'], war: ['stay'], drought: ['save'], encounter: ['pass'], market: ['pass'], research: ['rest'], homecoming: ['later'], inheritance: ['share'] },
};

export function policyChoice(state, policy = 'family') {
  const event = state.pending.event, available = state.pending.options.filter(item => !item.disabled);
  let order = priorities[policy]?.[event] || [];
  if (['breakthrough', 'ascension'].includes(event)) order = ['prepare', 'attempt', 'delay'];
  return [...order, ...available.map(item => item.id)].find(id => available.some(item => item.id === id));
}

export function playLife(seed, policy = 'family', options = {}) {
  let state = beginLife(newLife({ seed, ...options })), steps = 0;
  const destinations = ['landu', 'zhaoshi', 'mulan', 'wenxue'];
  while (state.phase === 'life') {
    if (++steps > 3500) throw new Error('人生未能在约定边界内结束：' + seed + '/' + policy);
    if (state.pending) state = choose(state, policyChoice(state, policy));
    else {
      if (state.player.health < 45 && state.player.herbs >= 2) state = act(state, { type: 'heal' });
      if (policy === 'cultivate' && state.player.realm && state.player.focus !== 'cultivate' && !state.player.retreat) state = setFocus(state, 'cultivate');
      if (policy === 'artisan' && state.month >= 216 && state.player.focus !== 'craft' && !state.player.retreat) state = setFocus(state, 'craft');
      if (policy === 'quiet' && state.month >= 216 && state.player.focus !== 'learn' && !state.player.retreat) state = setFocus(state, 'learn');
      if (policy === 'wanderer' && state.month >= 216 && !state.player.travel) {
        const destination = destinations.find(id => !state.player.visited.includes(id));
        if (destination && state.player.money > 130) state = act(state, { type: 'travel', to: destination });
      }
      state = advance(state, 1200);
    }
    if (options.validateEach) validateState(state);
  }
  return validateState(state);
}

export function toAge(seed, age, policy = 'cultivate', options = {}) {
  let state = beginLife(newLife({ seed, ...options }));
  while (state.phase === 'life' && (state.month < age * 12 || state.pending)) {
    if (state.pending) state = choose(state, policyChoice(state, policy));
    else state = advance(state, Math.min(12, age * 12 - state.month));
  }
  return state;
}
