import { REALMS } from '../../content/adventure.js';

export const REALM_ABILITIES = [
  '尚未入道，需要师长指导调息。',
  '能够运使护符、练习御剑和采炼灵药；可参加山门初阶历练。',
  '可以持续御器行路，并用自身真气维持小型阵法；有资格参加遗迹勘探。',
  '金丹能持续供给法力，御器和斗法更持久；可参与有定位阵保护的跨界探索。',
  '元婴能维持跨界大阵；集齐界心后，可以选择道劫或守护诸界。',
];
export function breakthroughRecord(from, to, month,rules=7) {
  const ability=rules===8&&to===4?'神魂与元婴相合，可以护持更大的阵法；最后的渡劫还需另备阵药、护法与渡劫地。':REALM_ABILITIES[to];
  return { kind: 'breakthrough', event: 'realm_' + to, title: '突破 · ' + REALMS[to].name, body: '你从' + REALMS[from].name + '踏入' + REALMS[to].name + '。' + ability + '寿元上限由' + REALMS[from].lifespan + '岁增至' + REALMS[to].lifespan + '岁。'+(rules===8?'':'境界不替你决定接下来的路。'), fromRealm: from, toRealm: to, month };
}
