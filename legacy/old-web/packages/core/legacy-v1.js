/** The published 0.1.0 choice contract, used only to validate before migration. */
export const LEGACY_VERSION = Object.freeze({ format: 1, version: '0.1.0', rulesVersion: 'shanhai-rules-1', contentVersion: 'shanhai-world-1' });
export const LEGACY_OPTIONS = Object.freeze({
  primer: ['read', 'hands', 'company'], path: ['songyin', 'zhaochuan', 'craft', 'home'],
  profession: ['cultivator', 'herbalist', 'artisan', 'merchant', 'farmer'], mentor: ['people', 'books', 'honest'],
  bond: ['together', 'friends', 'later'], care: ['visit', 'medicine', 'letter'], family: ['raise', 'adopt', 'wait'],
  promise: ['keep', 'listen', 'decline'], teaching: ['teach', 'notes', 'decline'], market: ['buy', 'trade', 'pass'],
  gathering: ['near', 'deep', 'share'], encounter: ['help', 'guide', 'pass'], dispute: ['listen', 'work', 'distance'],
  danger: ['retreat', 'protect', 'fight'], homecoming: ['repair', 'hands', 'later'], drought: ['aid', 'skill', 'save'],
  war: ['shelter', 'guard', 'stay'], inheritance: ['keep', 'share', 'fund'], research: ['study', 'write', 'rest'],
  farewell: ['remember', 'care', 'journey'], latewish: ['practice', 'family', 'work', 'road'], leadership: ['serve', 'practice', 'leave'],
  breakthrough: ['attempt', 'prepare', 'delay'], ascension: ['attempt', 'prepare', 'delay'],
});

export const isLegacyState = state => Object.entries(LEGACY_VERSION).every(([key, value]) => state?.[key] === value);

export function legacyEligible(state, event, payload = {}) {
  const actor = state.people.find(item => item.id === payload.actorId), p = state.player;
  if ((event === 'primer' && state.month < 72) || (event === 'path' && state.month < 144) || (event === 'profession' && state.month < 216)) return false;
  if (payload.actorId && !actor?.alive && !['farewell', 'inheritance'].includes(event)) return false;
  const alive = relation => state.people.some(item => item.alive && relation.includes(item.relation));
  if (event === 'mentor') return state.people.some(item => item.id === p.mentorId && item.alive);
  if (event === 'bond') return !p.partnerId && actor?.alive && state.month - actor.bornMonth >= 216;
  if (event === 'family') return state.people.some(item => item.id === p.partnerId && item.alive);
  if (event === 'care') return alive(['mother', 'father', 'guardian']);
  if (event === 'homecoming') return alive(['mother', 'father', 'guardian', 'partner', 'child']);
  if (['dispute', 'leadership'].includes(event)) return !!p.faction;
  if (event === 'teaching') return state.stats.students < 3 && (p.realm >= 2 || p.craft >= 30);
  if (event === 'breakthrough') return p.realm > 0 && p.realm < 5 && p.progress >= [0, 100, 180, 270, 430, 620][p.realm];
  if (event === 'ascension') return p.realm === 5 && p.progress >= 620;
  return !!LEGACY_OPTIONS[event];
}

export function legacyOptionsValid(state) {
  const pending = state.pending, expected = LEGACY_OPTIONS[pending.event], p = state.player;
  if (!expected || !Array.isArray(pending.options) || pending.options.length !== expected.length) return false;
  const costsByEvent = { care: { medicine: { herbs: 3, money: 40 } }, promise: { keep: { stones: 8 } }, market: { buy: { stones: 22 } }, encounter: { help: { herbs: 2 } }, dispute: { work: { stones: 6 } }, homecoming: { repair: { money: 100 } }, drought: { aid: { money: 60 } }, war: { shelter: { herbs: 4 } }, inheritance: { fund: { money: 80 } } };
  return pending.options.every((option, index) => {
    const costs = ['breakthrough', 'ascension'].includes(pending.event) ? option.id === 'attempt' ? { stones: [0, 38, 125, 300, 650, 1500][p.realm], herbs: [0, 5, 10, 18, 30, 50][p.realm] } : option.id === 'prepare' ? { stones: 6, herbs: 2 } : {} : costsByEvent[pending.event]?.[option.id] || {};
    let disabled = Object.entries(costs).some(([key, value]) => p[key] < value);
    if (pending.event === 'path' && ['songyin', 'zhaochuan'].includes(option.id) && p.root === 'none') disabled = true;
    if ((pending.event === 'profession' && option.id === 'cultivator') || (pending.event === 'latewish' && option.id === 'practice')) disabled ||= !p.realm;
    if (pending.event === 'market' && option.id === 'trade') disabled ||= p.craft < 20;
    if (pending.event === 'market' && option.id === 'buy') disabled ||= !!p.inventory.book;
    if (['breakthrough', 'ascension'].includes(pending.event) && option.id === 'prepare') disabled ||= !!state.flags.prepared;
    if ((pending.event === 'war' && option.id === 'guard') || (pending.event === 'danger' && option.id === 'fight')) disabled ||= p.health < 35;
    return option.id === expected[index] && JSON.stringify(option.costs) === JSON.stringify(costs) && option.disabled === disabled && typeof option.label === 'string' && typeof option.description === 'string' && typeof option.reason === 'string';
  });
}
