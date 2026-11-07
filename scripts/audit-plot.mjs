#!/usr/bin/env node
/**
 * 剧情承接审计 —— 四个判据（2026-11-07 · T6）
 * ============================================================================
 *
 * 守什么
 * ------
 * 用户 2026-11-06 提的三条剧情问题（依据 `docs/剧情复盘-2026-11-06.md` §2、§3）：
 *
 *   · **幽灯堂选项突兀** —— 十六岁「测灵石上的记录」那张卡上，
 *     「幽灯堂招弟子」像一则告示贴在玩家面前：玩家不是幽灯堂弟子，
 *     那个接引人也是凭空出现的（先看见一个陌生人管他叫「顾魇」）。
 *   · **顾魇凭空出现** —— 选项提示里先抛出一个玩家还没见过的名字。
 *     （实测：54 条人生里提到顾魇，54 条都是「第一次提到他之前没有任何介绍」。）
 *   · **铜匣线接不上童年钩子** —— 童年卡「旧屋梁上落下一只铜匣」有一个结果
 *     （交给家人换粮）选完就没有下文。
 *
 * 四条判据
 * --------
 * ① **接引人必须先露过面。**
 *    「山门外的队伍」（reception）的正文里必须有那个穿黑衣的人 ——
 *    玩家是先见过他，后来才谈得上「问一问他」。
 *
 * ② **选项得像玩家能做的一件事，不像招人告示。**
 *    选项的字样不许是「招弟子」那种从招人的人那边写的口吻；
 *    提示语必须**按灵根等级分两种说法**（同一条路，对不同处境的人意义不同）；
 *    选项里不许点名顾魇（他这时还没被介绍过）。
 *
 * ③ **选项里出现的人名必须先被介绍过。**
 *    ⚠ 选项的提示语（`label` / `hint`）**不经过**人物身份注解 ——
 *      只有卡面正文才会在人名后面补上「（幽灯堂药库师兄）」这样的身份。
 *    ⇒ 人名一旦先出现在选项提示里，玩家看到的就是一个不认识的名字。
 *    判据：选项里出现的人名，必须在同一张卡（或它所在的那条长线）的正文/标题里出现过。
 *
 * ④ **童年卡的结果都要有下文。**
 *    童年卡用 `marks` 记下「那一年发生了什么」（留下旧物 / 换出去 / 请人拓印…），
 *    后面的「旧联系人」那条线（`echo_*`）按这些标记决定走哪一条。
 *    ⇒ 每个标记都必须能接上一条线，否则玩家那次选择等于没选。
 *
 * 为什么它是护栏 ⇒ 靠反向验证证明它有用
 * ---------------------------------------
 * 这几条今天都已经修好了 ⇒ 门禁跑一遍当然绿。
 * 那绿说明不了它有用 ⇒ `tests/plot.test.mjs` 造坏数据逐条证明判据真抓得住。
 *
 * 用法
 * ----
 *   node scripts/audit-plot.mjs                # 跑一遍
 *   node scripts/audit-plot.mjs --count=120    # 多跑几条人生（默认 120）
 */
import { CULTIVATION_EVENTS, ROAD_CHAINS } from '../content/cultivation-stories.js';
import { echoKind } from '../packages/adventure/story-rules10.js';
import { playCultivation } from './play-cultivation.mjs';

/**
 * 会反复出现的人名。
 *
 * ⚠ 与 `packages/adventure/story-rules10.js` 的 `EXTRA_ROLES`、
 *   `content/cultivation-world.js` 的 `OFFICERS` 对应。
 *   改人物表就同步这里 —— 门禁会检查「表里有没有已经不存在的人」，
 *   免得这张表慢慢腐烂成一份没人看的名单。
 */
export const PEOPLE = [
  '陆行舟', '许执事', '严衡', '沈宗主',   // 宗门管事
  '沈砚', '闻竹', '陶宁', '嵇萝', '阿宁', // 同门、同行与童年旧识
  '白苓', '顾魇', '阿栾', '宁素', '杜魁',  // 幽灯堂与妖族
  '顾长老', '余掌柜', '余衡', '老猿', '幽灯堂主',
];

/** 把一段内容（字符串或函数）转成可检索的文本。函数按源码取 —— 不求值。 */
export function textOf(value) {
  return typeof value === 'function' ? String(value) : String(value ?? '');
}

/* ══════════════ 判据① · 接引人必须先露过面 ══════════════ */

export function checkSetup(events) {
  const problems = [];
  const reception = events.reception;
  if (!reception) return ['事件表里没有 reception（山门外的队伍）'];
  const text = textOf(reception.text);
  if (!text.includes('黑衣')) {
    problems.push('「山门外的队伍」里没有那个穿黑衣的人 —— 他会凭空出现在后面那张卡上');
  }
  return problems;
}

/* ══════════════ 判据② · 选项得像玩家能做的一件事 ══════════════ */

export function checkEntry(events) {
  const problems = [];
  const card = events.root_result;
  if (!card) return ['事件表里没有 root_result（测灵石上的记录）'];
  const dark = card.choices.find(o => o.id === 'dark');
  if (!dark) return ['root_result 上没有通往幽灯堂的选项'];
  const label = textOf(dark.label);
  if (/招弟子|招收弟子/.test(label)) {
    problems.push('幽灯堂的选项写成了一则招人告示（「' + label + '」）—— 玩家不是幽灯堂弟子');
  }
  const hint = textOf(dark.hint);
  if (!/grade/.test(hint)) {
    problems.push('幽灯堂的选项没有按灵根等级分说法（同一条路，对不同处境的人意义不同）');
  }
  const spoken = label + '\n' + hint + '\n' + textOf(dark.reply);
  if (/顾魇/.test(spoken)) problems.push('幽灯堂的选项里点了顾魇的名字 —— 他这时还没被介绍过');
  return problems;
}

/* ══════════════ 判据③ · 选项里的人名必须先被介绍过 ══════════════ */

/**
 * 一条长线（chain）的所有卡的正文/标题合起来 —— 长线里的角色在第一张卡就被介绍了，
 * 后面的卡可以放心直接叫他的名字。
 */
export function chainTexts(events, chains) {
  const out = new Map();
  for (const chain of chains) {
    const parts = [];
    for (let i = 0; i < chain.stages.length; i++) {
      const card = events[chain.id + '_' + i];
      if (!card) continue;
      parts.push(textOf(card.title), textOf(card.text));
    }
    out.set(chain.id, parts.join('\n'));
  }
  return out;
}

export function checkIntroductions(events, chains = ROAD_CHAINS) {
  const problems = [];
  const scope = chainTexts(events, chains);
  for (const [id, card] of Object.entries(events)) {
    const chain = chains.find(ch => ch.stages.some((_, i) => ch.id + '_' + i === id));
    const known = textOf(card.title) + '\n' + textOf(card.text) +
      (chain ? '\n' + scope.get(chain.id) : '');
    for (const choice of card.choices || []) {
      const said = textOf(choice.label) + '\n' + textOf(choice.hint);
      for (const name of PEOPLE) {
        if (said.includes(name) && !known.includes(name)) {
          problems.push('「' + id + '」的选项里出现「' + name +
            '」，但这张卡（或它所在的长线）的正文里没有介绍过他');
        }
      }
    }
  }
  return problems;
}

/* ══════════════ 判据④ · 童年卡的结果都要有下文 ══════════════ */

/** 造一个最小状态：`echoKind` 只看 `life.cultivation.network.marks` 与规则版本。 */
export function marksState(rulesVersion, marks) {
  return { life: { cultivation: { rulesVersion, network: { marks } } } };
}

/** 每个童年标记应当接到哪条「旧联系人」线。 */
export const MARK_LINES = [
  ['old_page', 'relic'], ['sold_page', 'relic'], ['relic_route', 'relic'],
  ['teacher_notes', 'teacher'], ['herbs', 'teacher'], ['teacher_route', 'teacher'],
  ['route_contact', 'teacher'],
  ['friend_witness', 'friend'], ['friend_hide', 'friend'],
];

export function checkMarks(kindOf = echoKind) {
  const problems = [];
  for (const [mark, want] of MARK_LINES) {
    const got = kindOf(marksState(12, { [mark]: true }));
    if (got !== want) {
      problems.push('规则十二：童年标记「' + mark + '」没有接上「' + want +
        '」这条线（现在接到 ' + String(got) + '）');
    }
  }
  /* 旧版本不许变：它们按自己那一版继续跑。 */
  for (const version of [10, 11]) {
    if (kindOf(marksState(version, { sold_page: true })) !== null) {
      problems.push('规则' + version + ' 不该认 sold_page（旧版本必须逐值不变）');
    }
    if (kindOf(marksState(version, { old_page: true, teacher_notes: true })) !== 'relic') {
      problems.push('规则' + version + ' 的旧联系人顺序被改了（旧版本应当旧物在前）');
    }
  }
  if (kindOf(marksState(12, { old_page: true, teacher_notes: true })) !== 'teacher') {
    problems.push('规则十二的旧联系人顺序不是「授业者在前」');
  }
  return problems;
}

/* ══════════════ 判据⑤（跑一遍人生）· 顾魇首次出现前必有引子 ══════════════ */

export function checkFirstMention(events, lives) {
  const problems = [];
  let introduced = 0;
  for (const run of lives) {
    for (const step of run.snapshots) {
      const card = events[step.event];
      if (!card) continue;
      const body = textOf(card.title) + '\n' + textOf(card.text);
      if (body.includes('顾魇')) { introduced++; break; }
      const said = (card.choices || []).map(o => textOf(o.label) + '\n' + textOf(o.hint)).join('\n');
      if (said.includes('顾魇')) {
        problems.push('「' + step.event + '」的选项里先出现顾魇，而这张卡的正文没有介绍他');
        break;
      }
    }
  }
  if (!introduced) problems.push('没有一条人生走到顾魇出场的那张卡 —— 这条断言没被真正验过');
  return problems;
}

/* ══════════════════════ 人名表自检 ══════════════════════ */

export function checkPeopleTable(events) {
  const all = Object.values(events).map(c => textOf(c.title) + textOf(c.text)).join('\n');
  return PEOPLE.filter(name => !all.includes(name)).map(name =>
    '人名表里已经没有「' + name + '」了 —— 改人物表后请同步 scripts/audit-plot.mjs 的 PEOPLE');
}

/* ══════════════════════════ 跑一遍 ══════════════════════════ */

export function runAudit({ count = 120 } = {}) {
  const problems = [
    ...checkSetup(CULTIVATION_EVENTS),
    ...checkEntry(CULTIVATION_EVENTS),
    ...checkIntroductions(CULTIVATION_EVENTS, ROAD_CHAINS),
    ...checkMarks(),
    ...checkPeopleTable(CULTIVATION_EVENTS),
  ];
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  const lives = [];
  for (let i = 0; i < count; i++) {
    lives.push(playCultivation({
      seed: '万千道途-' + i,
      path: paths[i % 5],
      conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
      ending: i % 4 === 0 ? 'dao' : 'guard',
      family: i % 9 === 0 ? 'sever' : 'keep',
      school: ['sword', 'alchemy', 'array'][i % 3],
    }));
  }
  problems.push(...checkFirstMention(CULTIVATION_EVENTS, lives));
  return { problems, lives: lives.length };
}

/* CLI：只有在**被直接运行时**才跑（被 import 时不跑 ⇒ 单测可以拿里面的纯函数）。 */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*?(?=\/)/, ''))) {
  const args = process.argv.slice(2);
  const count = Number(args.find(a => a.startsWith('--count='))?.split('=')[1] || 120);
  const { problems, lives } = runAudit({ count });

  console.log('剧情承接审计');
  console.log('  事件表 ' + Object.keys(CULTIVATION_EVENTS).length + ' 条 · 长线 ' + ROAD_CHAINS.length + ' 条 · 人生 ' + lives + ' 条');
  if (problems.length) {
    console.error('问题：');
    for (const p of problems) console.error('  ✗ ' + p);
    console.error('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('结果：0 个问题');
}
