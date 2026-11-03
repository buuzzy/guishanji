import { createClassicRun as createRun, choose, acknowledge, advance, advanceToChoice, options, cloneRun } from '../packages/adventure/engine.js';
import { selectOption } from '../scripts/play-adventure.mjs';

/** Finds a state reached by actual choices; no realm, clock or RNG injection. */
export function reach(event, { seed, strategy = 'rescuer', origin, goal = strategy === 'dao' ? 'dao' : strategy === 'keeper' ? 'protect' : strategy === 'collector' ? 'wander' : 'free', overrides = {}, filter = () => true, limit = 600 } = {}) {
  for (let attempt = 0; attempt < (seed ? 1 : limit); attempt++) {
    const state = createRun({ seed: seed || '松风试走-' + attempt, origin, goal });
    for (let step = 0; step < 100 && state.phase !== 'ended'; step++) {
      if (state.waiting) acknowledge(state);
      if (!state.pending) advanceToChoice(state);
      if (state.phase === 'ended') break;
      if (state.pending.event === event && filter(state)) return state;
      const offered = options(state), selected = offered.find(o => o.id === overrides[state.pending.event] && o.enabled) || selectOption(state, strategy, step + attempt);
      choose(state, selected.id);
    }
  }
  throw new Error('没有从正常人生找到 ' + event + ' / ' + strategy);
}

export function choiceRun(seed) {
  const state = createRun({ seed }); advanceToChoice(state); return state;
}

/** Advance real months, responding only to urgent messages with continuation. */
export function advanceThroughMessages(state, targetMonth) {
  for (let guard = 0; state.month < targetMonth && state.phase !== 'ended' && guard < 50; guard++) {
    if (state.pending?.event === 'urgent_message') choose(state, 'continue');
    if (state.pending) throw new Error('途中出现了另一项抉择：' + state.pending.event);
    if (!advance(state, targetMonth - state.month)) throw new Error('实际月份没有继续');
  }
  return cloneRun(state);
}
