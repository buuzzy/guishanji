import { createStreams, hashText, integer, pick, weighted } from './random.js';
import { GAME_VERSION, RULES_VERSION, CONTENT_VERSION, SAVE_VERSION, REGIONS, FACTIONS, ORIGINS, ROOTS, REALMS, FAMILY_NAMES, GIVEN_NAMES } from '../../content/world.js';

export const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const ageOf = state => Math.floor(state.month / 12);
export const personAge = (state, person) => Math.floor(((person.alive ? state.month : person.deathMonth) - person.bornMonth) / 12);
export const currentRealm = state => REALMS[state.player.realm];
export const personById = (state, id) => state.people.find(person => person.id === id);
export const aliveFamily = state => state.people.filter(person => person.alive && ['mother', 'father', 'guardian', 'partner', 'child'].includes(person.relation));

export function calendar(state, month = state.month) {
  const total = state.world.birthMonth - 1 + month;
  return { year: state.world.startYear + Math.floor(total / 12), month: total % 12 + 1, season: ['春', '夏', '秋', '冬'][Math.floor((total % 12) / 3)] };
}

export function addLog(state, text, kind = 'life', details = {}) {
  state.log.push({ id: state.id + ':log:' + state.sequence++, month: state.month, kind, text, ...details });
}

export function makePerson(state, properties = {}) {
  const stream = properties.stream || 'people';
  const id = properties.id || state.id + ':person:' + state.nextPerson++;
  const name = properties.name || pick(state, FAMILY_NAMES, stream) + pick(state, GIVEN_NAMES, stream);
  const realm = properties.realm ?? 0;
  const age = properties.age ?? integer(state, 18, 50, stream);
  return {
    id, name, gender: properties.gender || pick(state, ['F', 'M'], stream), bornMonth: state.month - age * 12,
    realm, lifespan: properties.lifespan ?? REALMS[realm].lifespan + integer(state, -8, 8, stream),
    health: properties.health ?? integer(state, 74, 95, stream), talent: properties.talent ?? integer(state, 25, 80, stream),
    relation: properties.relation || 'acquaintance', bond: properties.bond ?? 45, alive: true,
    location: properties.location || state.player.location, faction: properties.faction || null,
    goal: properties.goal || (realm ? 'cultivate' : 'live'), deathMonth: null, memories: [],
    history: [{ month: state.month, realm, location: properties.location || state.player.location, kind: 'meet' }],
  };
}

/** Tests may supply authored scenario overrides; ordinary play only supplies a seed/name. */
export function newLife(options = {}) {
  const seed = String(options.seed || '山海').normalize('NFC').slice(0, 160);
  const state = {
    format: SAVE_VERSION, version: GAME_VERSION, rulesVersion: RULES_VERSION, contentVersion: CONTENT_VERSION,
    id: 'life-' + hashText(seed).toString(36) + '-' + hashText(seed + ':id:' + (options.runId || '')).toString(36), seed,
    phase: 'birth', month: 0, sequence: 1, nextPerson: 1, revision: 0,
    random: createStreams(seed), player: {}, people: [], queue: [], pending: null, ending: null,
    flags: {}, log: [], years: [], ledger: [], choices: [],
    stats: { decisions: 0, breakthroughs: 0, failures: 0, help: 0, family: 0, craft: 0, journeys: 0, students: 0, earnings: 0, retreats: 0 },
    world: { startYear: 0, birthMonth: 1, era: '丰和', weather: '晴', regions: [], factions: [], history: [] },
  };
  const origin = options.origin ? ORIGINS.find(item => item.id === options.origin) : weighted(state, ORIGINS);
  const root = options.root ? ROOTS.find(item => item.id === options.root) : weighted(state, ROOTS);
  if (!origin || !root) throw new Error('未知的出生设定。');
  const region = options.region || origin.region;
  if (!REGIONS.some(item => item.id === region)) throw new Error('未知的出生地。');
  const talent = options.talent ?? integer(state, 30, 85, 'birth');
  const constitution = options.constitution ?? integer(state, 58, 94, 'birth');
  const name = options.name || pick(state, FAMILY_NAMES, 'birth') + pick(state, GIVEN_NAMES, 'birth');
  state.world.startYear = integer(state, 162, 190, 'birth');
  state.world.birthMonth = integer(state, 1, 12, 'birth');
  state.world.regions = REGIONS.map(item => ({ id: item.id, prosperity: integer(state, 42, 68, 'world'), danger: integer(state, 6, 18, 'world') }));
  state.world.factions = FACTIONS.map(item => ({ id: item.id, influence: integer(state, 45, 72, 'world'), leaderId: null, relations: {} }));
  state.player = {
    id: state.id + ':me', name, gender: options.gender || pick(state, ['F', 'M'], 'birth'), origin: origin.id,
    birthRegion: region, location: region, root: root.id, talent, constitution,
    health: 88, mind: 72, insight: 8, bond: 58, realm: 0, progress: 0,
    lifespan: 78 + Math.round(constitution / 10), technique: 'breath', focus: 'family', role: 'child',
    faction: null, mentorId: null, partnerId: null, home: 'hut',
    money: origin.money, stones: origin.stones, herbs: origin.herbs, craft: origin.craft, debt: 0,
    inventory: { charm: 0, sword: 0, book: 0, lamp: 0 }, visited: [region], travel: null, retreat: null,
    homeStyle: 'plain', keepsakes: [],
  };
  if (origin.id === 'ward') {
    state.people.push(makePerson(state, { id: state.id + ':guardian', relation: 'guardian', age: 42, bond: 82, realm: 1, lifespan: 126, goal: 'live' }));
  } else {
    const surname = Array.from(name)[0];
    state.people.push(makePerson(state, { id: state.id + ':mother', name: surname + pick(state, GIVEN_NAMES, 'people'), gender: 'F', relation: 'mother', age: integer(state, 23, 35, 'people'), bond: 86 }));
    state.people.push(makePerson(state, { id: state.id + ':father', name: surname + pick(state, GIVEN_NAMES, 'people'), gender: 'M', relation: 'father', age: integer(state, 25, 38, 'people'), bond: 82 }));
  }
  state.people.push(makePerson(state, { id: state.id + ':companion', relation: 'friend', age: 1, bond: 65, talent: integer(state, 25, 90, 'people') }));
  for (const faction of FACTIONS) {
    const elder = makePerson(state, { id: state.id + ':elder:' + faction.id, relation: 'elder', age: faction.type === 'sect' ? 48 : 38, realm: faction.type === 'sect' ? 2 : 1, faction: faction.id, location: faction.region, bond: 35 });
    state.people.push(elder);
    state.world.factions.find(item => item.id === faction.id).leaderId = elder.id;
  }
  state.birth = { origin: origin.name, region: REGIONS.find(item => item.id === region).name, story: origin.description, root: root.name, rootDescription: root.description };
  addLog(state, state.player.name + '出生在' + state.birth.region + '。' + origin.description, 'birth');
  state.revision++;
  return state;
}

export function apparentAge(state) {
  const age = ageOf(state);
  return state.player.realm < 2 ? age : Math.min(age, 27 + Math.floor(age / (state.player.realm * 18)));
}

export function renameBirth(state, value) {
  if (state.phase !== 'birth') throw new Error('姓名在入世前确定。');
  const name = String(value).trim().normalize('NFC');
  if (!name || Array.from(name).length > 16 || /[\u0000-\u001f]/u.test(name)) throw new Error('请填写 1 至 16 个字的姓名。');
  if (name === state.player.name) return state;
  const next = clone(state), old = next.player.name;
  next.player.name = name;
  if (next.log[0]?.text.startsWith(old)) next.log[0].text = name + next.log[0].text.slice(old.length);
  next.revision++;
  return next;
}

export function lifeTitle(state) {
  if (state.ending) return state.ending.title;
  if (state.player.realm) return currentRealm(state).name + '修士';
  return ({ child: '初入人间', scholar: '书院学生', herbalist: '药师', artisan: '匠人', merchant: '行商', farmer: '山村人家', caregiver: '守着灯火的人' })[state.player.role] || '此间行人';
}
