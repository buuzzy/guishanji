import { REGIONS, FACTIONS, ROOTS, REALMS, TECHNIQUES, FOCUS, ITEMS, ENDINGS, regionById, factionById } from '../../content/world.js';
import { STORIES, AGE_EVENTS, YEAR_FLAVORS } from '../../content/stories.js';
import { clone, clamp, ageOf, calendar, currentRealm, personById, personAge, makePerson, addLog, aliveFamily } from './state.js';
import { random, integer, pick } from './random.js';

export class GameError extends Error {
  constructor(message, code = 'action') { super(message); this.name = 'GameError'; this.code = code; }
}

function requireLife(state, pendingAllowed = false) {
  if (state.phase !== 'life') throw new GameError('这一生当前不能继续行动。');
  if (state.pending && !pendingAllowed) throw new GameError('请先回应眼前的抉择。', 'pending');
}

export function focusOptions(state) {
  return FOCUS.filter(item => ageOf(state) >= item.minAge && (!item.cultivation || state.player.realm > 0));
}

function parentOf(state) {
  return state.people.find(person => person.alive && ['mother', 'father', 'guardian'].includes(person.relation));
}

function queueEvent(state, event, payload = {}, due = state.month, key = null) {
  if (key && state.flags['queued:' + key]) return;
  if (key) state.flags['queued:' + key] = true;
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
  if ((event === 'primer' && ageOf(state) < 6) || (event === 'path' && ageOf(state) < 12) || (event === 'profession' && ageOf(state) < 18)) return false;
  if (payload.actorId && !actor?.alive && event !== 'farewell' && event !== 'inheritance') return false;
  if (event === 'mentor') return !!personById(state, state.player.mentorId)?.alive;
  if (event === 'bond') return !state.player.partnerId && actor?.alive && personAge(state, actor) >= 18;
  if (event === 'family') return !!personById(state, state.player.partnerId)?.alive;
  if (event === 'care') return !!parentOf(state);
  if (event === 'homecoming') return aliveFamily(state).length > 0;
  if (event === 'dispute' || event === 'leadership') return !!state.player.faction;
  if (event === 'teaching') return state.stats.students < 3 && (state.player.realm >= 2 || state.player.craft >= 30);
  if (event === 'breakthrough' || event === 'ascension') return state.player.realm > 0 && (event === 'ascension' ? state.player.realm === REALMS.length - 1 : state.player.realm < REALMS.length - 1) && state.player.progress >= currentRealm(state).threshold;
  return true;
}
export const decisionEligible = (state, event, payload = {}) => storyAllowed(state, event, payload);

function optionCosts(event, option, state) {
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
    if (actor) {
      if (event === 'farewell') text = actor.name + '在' + personAge(state, actor) + '岁时离开了。' + text;
      else text = actor.name + '与你有关的这段相遇，到了一个需要回应的时刻。' + text;
    }
  }
  const options = choices.map(([id, label, description]) => {
    const costs = optionCosts(event, id, state);
    let reason = canAfford(state, costs) ? '' : '资源不足：' + Object.entries(costs).map(([key, value]) => value + ' ' + ({ money: '铜钱', stones: '灵石', herbs: '灵草' })[key]).join('、');
    if (event === 'path' && ['songyin', 'zhaochuan'].includes(id) && state.player.root === 'none') reason = '此门眼下尚无适合未见灵根者的入门功法。';
    if ((event === 'profession' && id === 'cultivator') || (event === 'latewish' && id === 'practice')) {
      if (!state.player.realm) reason = '需要先踏入炼气。';
    }
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
  if (state.player.realm && state.player.progress >= currentRealm(state).threshold && state.month >= (state.flags.nextBreakthrough || 0)) {
    const event = state.player.realm === REALMS.length - 1 ? 'ascension' : 'breakthrough';
    queueEvent(state, event, {}, state.month);
    state.flags.nextBreakthrough = state.month + 12;
  }
  state.queue.sort((a, b) => a.due - b.due || a.order - b.order);
  while (state.queue.length && state.queue[0].due <= state.month) {
    const queued = state.queue.shift();
    if (!storyAllowed(state, queued.event, queued.payload)) continue;
    state.pending = decisionView(state, queued);
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
  return {
    money: Math.round((salary + focus) * prosperity),
    stones: realm.income + (player.faction ? 7 : 0) + (player.focus === 'craft' ? 3 + Math.floor(player.craft / 15) : player.role === 'merchant' ? 4 : 1),
    herbs: Math.max(1, Math.floor((player.focus === 'craft' ? 3 + player.craft / 22 : player.focus === 'explore' ? 5 : 1) * region.herbs)),
    living: region.living + player.realm * 6 + Math.max(0, Math.floor(((local?.danger ?? 10) - 20) / 2)) + state.people.filter(person => person.alive && person.relation === 'child' && personAge(state, person) < 18).length * 18,
  };
}

function monthlyPractice(state) {
  const player = state.player, age = ageOf(state), focus = player.focus;
  player.health = clamp(player.health + (focus === 'family' ? 0.14 : 0.07), 0, 100);
  player.mind = clamp(player.mind + (focus === 'family' ? 0.12 : focus === 'cultivate' ? 0.02 : 0.04), 0, 100);
  if (focus === 'learn') player.insight = clamp(player.insight + (age < 18 ? 0.32 : 0.2), 0, 100);
  if (focus === 'craft' && age >= 6) player.craft = clamp(player.craft + 0.18 + (player.inventory.book ? 0.1 : 0), 0, 100);
  if (focus === 'explore' && age >= 12) player.insight = clamp(player.insight + 0.08, 0, 100);
  if (focus === 'family') {
    player.bond = clamp(player.bond + 0.08, 0, 100);
    for (const person of aliveFamily(state)) person.bond = clamp(person.bond + 0.12, 0, 100);
  }
  if (player.realm) {
    const root = ROOTS.find(item => item.id === player.root), technique = TECHNIQUES.find(item => item.id === player.technique);
    const intensity = focus === 'cultivate' ? 1 : focus === 'learn' ? 0.3 : focus === 'explore' ? 0.23 : 0.14;
    const gain = (0.25 + player.talent / 100) * root.affinity * technique.affinity * (0.8 + player.mind / 250) * (0.7 + player.insight / 200) * regionById(player.location).spirit * currentRealm(state).growth * intensity;
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
        addLog(state, person.name + '在' + age + '岁时离开了。你记得彼此相处的那些日常。', 'memory', { actorId: person.id });
        bump(state, { mind: -7 });
        queueEvent(state, 'farewell', { actorId: person.id }, state.month, 'farewell:' + person.id);
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
  const date = calendar(state);
  state.world.weather = pick(state, ['晴', '细雨', '长风', '云起'], 'world');
  for (const region of state.world.regions) {
    region.prosperity = clamp(region.prosperity + integer(state, -3, 3, 'world'), 20, 90);
    region.danger = clamp(region.danger + integer(state, -2, 2, 'world'), 4, 35);
  }
  for (const faction of state.world.factions) faction.influence = clamp(faction.influence + integer(state, -2, 2, 'world'), 20, 90);
  if (date.year % 8 !== state.world.startYear % 8) return;
  const type = pick(state, ['harvest', 'drought', 'trade', 'war'], 'world');
  const region = pick(state, state.world.regions, 'world');
  const label = regionById(region.id).name;
  const text = ({ harvest: label + '这一年收成较好，坊市渐渐热闹。', drought: label + '雨水偏少，人们开始互相安排生计。', trade: label + '开通了新的商路，物资与消息往来更频繁。', war: label + '附近势力发生冲突，行路与生活多了风险。' })[type];
  state.world.era = ({ harvest: '丰和', drought: '待雨', trade: '通商', war: '风雨' })[type];
  region.prosperity = clamp(region.prosperity + (type === 'war' ? -9 : type === 'drought' ? -5 : 6), 15, 95);
  region.danger = clamp(region.danger + (type === 'war' ? 12 : -2), 4, 45);
  state.world.history.push({ month: state.month, text, type, region: region.id });
  addLog(state, text, 'world');
  if (ageOf(state) >= 16 && ['war', 'drought'].includes(type)) queueEvent(state, type, {}, state.month, 'world:' + date.year);
  if (state.player.faction && state.player.realm >= 2 && state.month > (state.flags.nextLeadership || 0)) {
    state.flags.nextLeadership = state.month + 180;
    queueEvent(state, 'leadership');
  }
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
    if (rule.condition === 'experienced' && state.player.realm < 2 && state.player.craft < 30) continue;
    if (rule.condition === 'family' && !aliveFamily(state).length) { state.flags['queued:age:' + rule.age] = true; continue; }
    queueEvent(state, rule.event, actorId ? { actorId } : {}, state.month, 'age:' + rule.age);
  }
}

function yearly(state) {
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
    ledger(state, '一年生计与家用', income.money - actualLiving - repay, income.stones, income.herbs);
    state.stats.earnings += income.money;
  }
  if (player.focus === 'craft') state.stats.craft++;
  if (player.focus === 'family') state.stats.family++;
  if (age > player.lifespan * 0.76) player.health = clamp(player.health - 1.6, 0, 100);
  addLog(state, pick(state, YEAR_FLAVORS[player.focus] || YEAR_FLAVORS.family, 'story'), 'year');
  updatePeople(state);
  worldYear(state);
  scheduleAgeEvents(state);
  if (age >= 18 && state.month >= (state.flags.nextSmallStory || 0)) {
    state.flags.nextSmallStory = state.month + 48;
    const deck = ['gathering', 'encounter', 'research'];
    if (player.stones >= 15 || player.craft >= 20) deck.push('market');
    if (player.faction) deck.push('dispute');
    if (player.focus === 'explore') deck.push('danger');
    if (aliveFamily(state).length) deck.push('homecoming');
    if (player.realm >= 2 || player.craft >= 30) deck.push('teaching');
    const event = pick(state, deck, 'story');
    let payload = {};
    if (event === 'encounter') {
      const stranger = makePerson(state, { relation: 'acquaintance', age: integer(state, 22, 48, 'people') });
      state.people.push(stranger);
      payload.actorId = stranger.id;
    }
    queueEvent(state, event, payload);
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
    player.location = player.travel.to;
    if (!player.visited.includes(player.location)) player.visited.push(player.location);
    state.stats.journeys++;
    addLog(state, '你抵达了' + regionById(player.location).name + '。' + regionById(player.location).description, 'travel');
    player.travel = null;
  }
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
  if (state.player.root !== 'none') {
    state.player.realm = 1;
    state.player.lifespan = REALMS[1].lifespan;
    state.player.role = 'cultivator';
    state.player.focus = 'cultivate';
  } else {
    state.player.role = 'herbalist';
    state.player.focus = 'craft';
  }
  addLog(state, '你进入' + faction.name + '，从' + (state.player.mentorId ? personById(state, state.player.mentorId).name : '身边的人') + '那里开始学习。职责与师承，一起进入了你的生活。', 'turning');
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

function applyStory(state, event, choice, payload) {
  const p = state.player, actor = personById(state, payload.actorId);
  const costs = optionCosts(event, choice, state);
  spend(state, costs);
  if (Object.keys(costs).length) ledger(state, STORIES[event]?.title || '突破准备', -(costs.money || 0), -(costs.stones || 0), -(costs.herbs || 0));
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
      if (choice === 'cultivator') p.focus = 'cultivate';
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
      if (choice === 'visit') { p.focus = 'family'; bump(state, { bond: 8, mind: 3 }); state.stats.family += 4; if (parent) parent.bond = clamp(parent.bond + 12, 0, 100); }
      if (choice === 'medicine') { if (parent) parent.health = clamp(parent.health + 12, 0, 100); state.stats.help++; bump(state, { bond: 6 }); }
      if (choice === 'letter') bump(state, { bond: 2 });
      remember(state, parent?.id, 'care', choice);
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
      if (choice === 'repair') { p.home = 'wood'; state.stats.family += 3; bump(state, { bond: 7 }); }
      if (choice === 'hands') { bump(state, { craft: 4, bond: 4 }); state.stats.family++; }
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
      if (choice === 'keep') { p.inventory.lamp = 1; p.keepsakes.push('家中的旧灯'); state.stats.family += 2; }
      if (choice === 'share') { state.stats.help++; bump(state, { insight: 6 }); }
      if (choice === 'fund') { state.stats.family += 3; bump(state, { bond: 5 }); }
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
  const next = clone(state), pending = next.pending;
  next.pending = null;
  next.stats.decisions++;
  next.choices.push({ month: next.month, event: pending.event, title: pending.title, choice: choiceId, label: option.label, actorId: pending.payload.actorId || null });
  addLog(next, '面对“' + pending.title + '”，你选择了：' + option.label + '。', 'choice');
  applyStory(next, pending.event, choiceId, pending.payload);
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

export function travelPreview(state, destination) {
  const target = regionById(destination);
  if (!target) throw new GameError('未知目的地。');
  const from = regionById(state.player.location);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  return { destination, months: Math.max(1, Math.ceil(distance / (state.player.realm >= 2 ? 32 : 16))), money: Math.ceil(distance * 1.1) + 12, stones: state.player.realm >= 2 ? 2 : 0 };
}

export function act(state, action) {
  requireLife(state);
  const next = clone(state), p = next.player;
  if (action.type === 'heal') {
    if (p.health >= 99) throw new GameError('眼下无需使用药草疗伤。');
    spend(next, { herbs: 2 }); bump(next, { health: 20, mind: 3 }); ledger(next, '药草疗伤', 0, 0, -2); addLog(next, '你用两株灵草处理伤势，留出一点恢复的时间。', 'health');
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
    if (action.to === p.location) throw new GameError('你已经在这里。');
    const preview = travelPreview(next, action.to);
    spend(next, { money: preview.money, stones: preview.stones });
    p.travel = { from: p.location, to: action.to, departure: next.month, arrival: next.month + preview.months };
    ledger(next, '前往' + regionById(action.to).name, -preview.money, -preview.stones, 0);
    addLog(next, '你启程前往' + regionById(action.to).name + '，预计行路 ' + preview.months + ' 个月。', 'travel');
  } else if (action.type === 'retreat') {
    if (!p.realm) throw new GameError('先学会调息入道，再安排闭关。');
    if (p.travel) throw new GameError('请先结束行程，再安排闭关。');
    if (p.retreat) throw new GameError('这一段闭关尚未结束。');
    if (![1, 3, 5, 10].includes(action.years)) throw new GameError('请选择一、三、五或十年的闭关。');
    p.retreat = { start: next.month, until: next.month + action.years * 12 };
    p.focus = 'cultivate'; next.stats.retreats++;
    addLog(next, '你安排了 ' + action.years + ' 年闭关。山河与亲友仍会继续变化，重要消息会使你停下来回应。', 'retreat');
  } else if (action.type === 'leaveRetreat') {
    if (!p.retreat) throw new GameError('眼下没有闭关安排。');
    p.retreat = null;
    addLog(next, '你提前结束了这一段闭关，带着已经发生的积累回到日常。', 'retreat');
  } else if (action.type === 'initiate') {
    if (p.realm || p.root === 'none' || ageOf(next) < 18) throw new GameError('眼下不具备自行调息入道的条件。');
    spend(next, { stones: 12, herbs: 3 }); p.realm = 1; p.lifespan = REALMS[1].lifespan; p.technique = 'herbal'; p.focus = 'cultivate';
    ledger(next, '调息入道', 0, -12, -3); addLog(next, '你借着手边的功法和积累，终于感知到体内灵息，踏入炼气。', 'cultivation');
  } else if (action.type === 'home') {
    if (ageOf(next) < 18) throw new GameError('成年后才能独自安排自己的住处。');
    const costs = { plain: 0, bamboo: 8, stone: 24, cloud: 48 };
    if (!Object.hasOwn(costs, action.style)) throw new GameError('未知住处样式。');
    if (p.homeStyle === action.style) return state;
    spend(next, { stones: costs[action.style] }); p.homeStyle = action.style;
    ledger(next, '安排住处', 0, -costs[action.style], 0); addLog(next, '你重新安排了自己的住处，给接下来的日常留一个位置。', 'home');
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
