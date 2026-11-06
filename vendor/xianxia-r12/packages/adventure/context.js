/** Pure context queries shared by event admission, messages and the scene. */
import { cultivationContext } from './cultivation.js';
export const LOCATORS = ['moon_key', 'sky_scroll', 'gate_anchor'];
const RETREATS = ['foundation', 'golden', 'golden_repair', 'beacon', 'retreat'];

export function activityContext(state) {
  if(state.life?.cultivation)return cultivationContext(state);
  const journey = state.journey || state.life?.suspended;
  if (state.life?.arc) return state.life.arc.id;
  if (state.life?.mode === 'childhood') return 'childhood';
  const event = journey?.resolution?.event || journey?.event;
  if (journey?.interrupt || RETREATS.includes(event) && !(event === 'golden' && journey?.choice === 'remain')) return 'retreat';
  if (journey?.emergencyArrival || journey?.travelArrival || event === 'gate' || event === 'crossroads' && journey?.target?.startsWith('visit_') || event === 'return_gate') return 'travel';
  if (journey && !journey.open) return 'work';
  return state.life?.mode || 'home';
}

export function ordinaryLife(state) {
  return !['childhood', 'valley', 'cavern', 'outer', 'retreat', 'travel', 'work'].includes(activityContext(state));
}

export function personHere(state, id) {
  const person = state.people[id];
  return Boolean(person?.known && person.status === 'alive' && person.location === state.player.location);
}

export function messageChannel(state) {
  if (!state.inventory.includes('signal_talisman') && !state.inventory.includes('echo_jade')) return null;
  if (state.life?.arc?.id === 'outer' && !LOCATORS.some(id => state.inventory.includes(id)) && !state.flags.outerBeacon) return null;
  return state.inventory.includes('signal_talisman') ? 'voice' : 'message';
}

export function presentPeople(state) {
  const context = activityContext(state);
  if (context === 'retreat' || context === 'childhood' || context === 'confinement' || state.life?.cultivation?.detained) return [];
  const ids = context === 'valley' ? ['trialmate'] : ['cavern', 'outer'].includes(context) ? ['ally'] : Object.keys(state.people);
  return ids.filter(id => personHere(state, id)).map(id => state.people[id]);
}
