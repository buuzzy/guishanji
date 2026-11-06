import { GAME_VERSION, RULES_VERSION, CONTENT_VERSION, ENTRY_PRACTICE } from '../../content/world.js';
import { clone, addLog } from './state.js';
import { validateState } from './validate.js';
import { isLegacyState } from './legacy-v1.js';
import { decisionView, decisionEligible } from './engine.js';

/** Upgrade a copy without drawing RNG, changing dates, or rewriting lived history. */
export function migrateState(source) {
  if (!isLegacyState(source)) return validateState(source);
  validateState(source, { legacy: true });
  const state = clone(source), previousPending = clone(state.pending);
  state.version = GAME_VERSION; state.rulesVersion = RULES_VERSION; state.contentVersion = CONTENT_VERSION;
  state.player.training = { learned: state.player.realm > 0 || !!state.player.faction, progress: state.player.realm ? ENTRY_PRACTICE : 0, awakened: false };
  state.player.mourning = []; state.player.inventory.pill = 0; state.storyDeck = [];
  state.world.regime = '澄川朝'; state.world.eventDeck = []; state.world.activeEvents = [];
  state.migration = { from: '0.1.0', month: state.month, previousPending };
  const upgradedEvent = queued => queued.event === 'farewell' && state.people.some(person => person.id === queued.payload.actorId && ['mother', 'father', 'guardian'].includes(person.relation)) ? 'bereavement' : queued.event;
  for (const queued of state.queue) queued.event = upgradedEvent(queued);
  for (const choice of state.choices) {
    state.flags['last:' + choice.event] = choice.month;
    state.flags['count:' + choice.event] = (state.flags['count:' + choice.event] || 0) + 1;
  }
  if (previousPending) {
    const event = upgradedEvent(previousPending);
    if (decisionEligible(state, event, previousPending.payload)) {
      state.pending = decisionView(state, { ...previousPending, event });
      state.flags['last:' + event] = state.month;
      state.flags['count:' + event] = (state.flags['count:' + event] || 0) + 1;
    } else {
      state.pending = null;
      addLog(state, '旧档中待回应的“' + previousPending.title + '”已不适用于当前在世人物、家庭所在地或境界。原抉择全文保留在升级记录中，已经历的年月、选择与机缘不变。', 'migration');
    }
  }
  state.revision++;
  return validateState(state);
}
