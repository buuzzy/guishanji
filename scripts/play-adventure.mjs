import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClassicRun as createRun, options, choose, acknowledge, advance, validateRun, review, currentNode, nodeText, EVENTS as NODES } from '../packages/adventure/engine.js';
import { monthSeconds } from '../packages/adventure/life.js';
import { hashText } from '../packages/core/random.js';
import { projectRoot } from './serve.mjs';

export const POLICIES = {
  rescuer: { entry: 'array', lesson: 'together', mission_array: 'keep', cave: 'ruin', omen: 'evacuate', war_council: 'escape', siege: 'archive', refugees: 'shelter', hunter: 'mercy', foundation: 'medicine', gate: 'sky', landing_sky: 'bridge', sky_archive: 'beast', sky_fall: 'network', crossroads: 'craft', visit_ember: 'work', relic_door: 'decode', golden: 'prepared', beast_attack: 'kinship', beast_wake: 'repair', letter: 'return', retreat: 'prepare', assemble: 'people', return_gate: 'inside', home_ruins: 'scout', enemy_terms: 'refuse', rescue: 'array', return_battle: 'seal', rebuild: 'network', final_choice: 'stay' },
  warrior: { entry: 'sword', lesson: 'honest', mission_sword: 'strike', cave: 'peak', omen: 'warn', war_council: 'defend', siege: 'last_stand', refugees: 'ferry', hunter: 'duel', foundation: 'storm', gate: 'tide', landing_tide: 'dive', tide_wreck: 'pearl', tide_storm: 'rescue', crossroads: 'near', relic_door: 'break', golden: 'risk', golden_repair: 'accept', beast_attack: 'resist', beast_wake: 'wait', letter: 'avenge', retreat: 'now', assemble: 'duel', return_gate: 'force', home_ruins: 'meet', enemy_terms: 'refuse', rescue: 'break', return_battle: 'duel', rebuild: 'rest', final_choice: 'wander' },
  healer: { entry: 'alchemy', lesson: 'together', mission_alchemy: 'village', cave: 'valley', omen: 'warn', war_council: 'medicine', siege: 'friend', refugees: 'shelter', hunter: 'mercy', foundation: 'medicine', gate: 'ember', landing_ember: 'dig', ember_caravan: 'return', ember_ruins: 'restore', crossroads: 'atlas', visit_sky: 'study', relic_door: 'slow', golden: 'prepared', beast_attack: 'kinship', beast_wake: 'rescue', letter: 'stay', far_cost: 'personally', far_finale: 'ordinary' },
  nascent: { entry: 'array', lesson: 'honest', cave: 'ruin', omen: 'warn', siege: 'master', foundation: 'repair', gate: 'ember', landing_ember: 'dig', ember_caravan: 'return', ember_ruins: 'restore', crossroads: 'near', relic_door: 'decode', golden: 'prepared', beast_attack: 'kinship', beast_wake: 'repair', letter: 'return', retreat: 'nascent', beacon: 'finish', assemble: 'strategic', return_gate: 'anchor', home_ruins: 'scout', enemy_terms: 'refuse', rescue: 'array', return_battle: 'allies', rebuild: 'open', final_choice: 'beyond' },
};
const episodes = { childhood: 'books', family_claim: 'contract', devouring_night: 'archive', fall_decree: 'archive', trial_invitation: 'enter', trial_entry: 'rope', trial_chasm: 'save', trial_core: 'unweave', trial_return: 'share', trial_echo: 'teach', cavern_invitation: 'enter', cavern_fork: 'map', cavern_heart: 'open', cavern_exit: 'network', outer_invitation: 'enter', outer_drift: 'rescue', outer_heart: 'weave', outer_return: 'share', treasure_claim: 'allies', last_vow: 'rest', urgent_message: 'continue' };
for (const policy of Object.values(POLICIES)) for (const [event, choice] of Object.entries(episodes)) policy[event] ??= choice;
POLICIES.rescuer.urgent_message = 'leave';
Object.assign(POLICIES.warrior, { trial_entry: 'race', trial_core: 'seize', cavern_fork: 'rush', cavern_heart: 'both', outer_drift: 'hunt', outer_heart: 'seize', treasure_claim: 'fight', last_vow: 'road' });
POLICIES.healer.urgent_message = 'aid';
POLICIES.dao = { ...POLICIES.nascent, urgent_message: 'continue', outer_return: 'share', treasure_claim: 'allies', last_vow: 'dao' };
POLICIES.keeper = { ...POLICIES.nascent, urgent_message: 'aid', last_vow: 'guard' };
POLICIES.collector = { ...POLICIES.nascent, outer_return: 'hide', cavern_exit: 'hide', treasure_claim: 'give', last_vow: 'road' };
export function selectOption(state, strategy, index = 0) {
  const available = options(state).filter(option => option.enabled);
  if (!available.length) throw new Error('所有选项不可用：' + state.pending.event);
  if (strategy === 'varied') return available[hashText(state.seed + ':' + state.pending.event + ':' + index) % available.length];
  const desired = POLICIES[strategy]?.[state.pending.event];
  return available.find(option => option.id === desired) || available.find(option => option.chance === null && !option.lethal) || available[0];
}
export function play({ seed, strategy = 'rescuer', origin, goal = strategy === 'dao' ? 'dao' : strategy === 'keeper' ? 'protect' : strategy === 'collector' ? 'wander' : 'free', offset = 0 }) {
  const state = createRun({ seed, origin, goal }); const transcript = []; let playbackSeconds = 0;
  for (let step = 0; step < 100 && state.phase !== 'ended'; step++) {
    while (!state.pending && state.phase !== 'ended') {
      if (state.waiting) {
        if (state.result?.completed && transcript.length) { transcript.at(-1).completion = state.result.body; transcript.at(-1).success = state.result.success; }
        acknowledge(state);
      }
      if (!state.pending && state.phase !== 'ended') {
        playbackSeconds += monthSeconds(state);
        if (!advance(state, 1)) throw new Error('人生未能继续：' + seed);
      }
    }
    if (state.phase === 'ended') break;
    validateRun(state);
    const node = currentNode(state), offered = options(state), selected = selectOption(state, strategy, step + offset);
    const text = nodeText(node, state), month = state.month;
    const result = choose(state, selected.id);
    transcript.push({ event: node.id, title: node.title, month, text, selected: selected.label, selectedId: selected.id, hint: selected.hint, offered: offered.map(o => ({ id: o.id, enabled: o.enabled, label: o.label, hint: o.hint, chance: o.chance })), result: result.body, success: result.success, months: result.months });
    validateRun(state);
  }
  if (state.phase !== 'ended') throw new Error('人生未能结束：' + seed);
  for (const row of transcript) {
    const completion = state.journal.find(entry => entry.kind === 'choice' && entry.event === row.event && entry.choice === row.selectedId && entry.month > row.month);
    if (completion) { row.completion = completion.body; row.success = completion.success; }
  }
  const characters = state.journal.reduce((sum, entry) => sum + [...entry.title + entry.body].length, 0) + transcript.reduce((sum, row) => sum + [...row.offered.map(o => o.label + o.hint).join('')].length, 0);
  return { seed, strategy, origin: state.player.origin, birth: state.birth, ending: state.ending.id, ...review(state), characters, automaticPlaybackSeconds: Math.round(playbackSeconds), estimatedReadingMinutes: { at450: Math.round(characters / 450 * 10) / 10, at650: Math.round(characters / 650 * 10) / 10 }, transcript, state };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/play-adventure.mjs')) {
  const count = Number(process.argv.find(arg => arg.startsWith('--count='))?.slice(8) || 240);
  const runs = [], coverage = new Set(), optionsCovered = new Set(), started = Date.now();
  for (let i = 0; i < count; i++) {
    const strategies = [...Object.keys(POLICIES), 'varied'], strategy = strategies[i % strategies.length];
    const run = play({ seed: '松风试走-' + i, strategy, offset: i });
    for (const choice of run.state.decisions) { coverage.add(choice.event); optionsCovered.add(choice.event + '/' + choice.choice); }
    runs.push(run);
  }
  const summary = { createdAt: new Date().toISOString(), scope: 'Deterministic simulated routes; reading-time model only, not human retention measurement', count, durationMs: Date.now() - started, nodes: Object.keys(NODES).length, visitedNodes: coverage.size, unvisited: Object.keys(NODES).filter(id => !coverage.has(id)), chosenOptions: optionsCovered.size, totalOptions: Object.values(NODES).reduce((sum, node) => sum + node.choices.length, 0), endings: Object.fromEntries([...new Set(runs.map(r => r.ending))].map(id => [id, runs.filter(r => r.ending === id).length])), range: { decisions: [Math.min(...runs.map(r => r.decisions)), Math.max(...runs.map(r => r.decisions))], characters: [Math.min(...runs.map(r => r.characters)), Math.max(...runs.map(r => r.characters))], age: [Math.min(...runs.map(r => r.age)), Math.max(...runs.map(r => r.age))] }, samples: runs.slice(0, 5).map(({ state, ...run }) => run) };
  await mkdir(join(projectRoot, 'artifacts'), { recursive: true });
  await writeFile(join(projectRoot, 'artifacts/adventure-playthroughs.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ ...summary, samples: summary.samples.map(({ transcript, people, ...run }) => run) }, null, 2));
}
