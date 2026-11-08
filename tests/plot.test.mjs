/**
 * 剧情承接审计的单测 —— 证明那几条判据**真抓得住**。
 *
 * ⚠ 为什么要有这一份：
 *   这几条今天都已经修好了 ⇒ 门禁跑一遍当然绿。
 *   但「跑一遍没报错」证明不了它有用（护栏最常见的假绿）。
 *   ⇒ 这里逐条造坏数据，坏数据必须让对应判据报红。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkSetup, checkEntry, checkIntroductions, checkMarks, checkFirstMention, checkPeopleTable,
} from '../scripts/audit-plot.mjs';

/* ───────────────────── 判据① · 接引人必须先露过面 ───────────────────── */

test('判据①：队伍那张卡里没有那个穿黑衣的人 ⇒ 报红', () => {
  const bad = { reception: { title: '山门外的队伍', text: '陆行舟是接引弟子，负责带报名者测灵根。' } };
  const problems = checkSetup(bad);
  assert.ok(problems.some(p => p.includes('黑衣')), '没有铺垫必须报红：' + JSON.stringify(problems));
});

test('判据①：队伍那张卡里写了 ⇒ 不报红', () => {
  const good = { reception: { title: '山门外的队伍', text: '队伍外面站着一个穿黑衣的人，自称幽灯堂接引人。' } };
  assert.deepEqual(checkSetup(good), []);
});

/* ────────────────── 判据② · 选项得像玩家能做的一件事 ────────────────── */

test('判据②：选项写成招人告示 ⇒ 报红', () => {
  const bad = {
    root_result: {
      title: '测灵石上的记录', text: '许执事记下你的灵根。',
      choices: [{ id: 'dark', label: '听取幽灯堂招收弟子的条件', hint: '他说测灵石不收的禁术他肯教。' }],
    },
  };
  const problems = checkEntry(bad);
  assert.ok(problems.some(p => p.includes('招人告示')), '告示口气必须报红：' + JSON.stringify(problems));
});

test('判据②：提示语不按灵根等级分说法 ⇒ 报红', () => {
  const bad = {
    root_result: {
      title: 'x', text: 'y',
      choices: [{ id: 'dark', label: '问一问门外的黑衣修士', hint: '他说测灵石不收的禁术他肯教。' }],
    },
  };
  assert.ok(checkEntry(bad).some(p => p.includes('灵根等级')));
});

test('判据②：选项里点了顾魇的名字 ⇒ 报红', () => {
  const bad = {
    root_result: {
      title: 'x', text: 'y',
      choices: [{
        id: 'dark', label: '问一问门外的黑衣修士',
        hint: s => (s.player.root.grade < 0 ? '顾魇能教禁术。' : '他那里有些禁术。'),
      }],
    },
  };
  assert.ok(checkEntry(bad).some(p => p.includes('顾魇')));
});

test('判据②：改对了（动作式标签 + 按灵根分说法 + 不点名）⇒ 不报红', () => {
  const good = {
    root_result: {
      title: 'x', text: 'y',
      choices: [{
        id: 'dark', label: '问一问门外的黑衣修士',
        hint: s => (s.player.root.grade < 0 ? '他说测灵石不收的禁术他肯教。' : '他那里有些禁术。'),
        reply: '黑衣修士带你到药铺。',
      }],
    },
  };
  assert.deepEqual(checkEntry(good), []);
});

/* ───────────────────── 判据③ · 选项里的人名必须先被介绍过 ───────────────────── */

test('判据③：选项里出现没被介绍过的人名 ⇒ 报红', () => {
  const bad = {
    root_result: {
      title: '测灵石上的记录', text: '许执事记下你的灵根。',
      choices: [{ id: 'dark', label: '问一问', hint: '顾魇能教禁术。' }],
    },
  };
  const problems = checkIntroductions(bad, []);
  assert.ok(problems.some(p => p.includes('顾魇')), '没介绍过的人名必须报红：' + JSON.stringify(problems));
});

test('判据③：同一张卡的正文里介绍过 ⇒ 不报红', () => {
  const good = {
    dark_invitation: {
      title: '药铺后堂的入堂条件', text: '接引人顾魇认出残卷上的药铺印记。',
      choices: [{ id: 'accept', label: '答应看炉', hint: '顾魇会盯着你。' }],
    },
  };
  assert.deepEqual(checkIntroductions(good, []), []);
});

test('判据③：同一条长线的另一张卡介绍过 ⇒ 不报红', () => {
  const chains = [{ id: 'dark_ledger', stages: [[], [], []] }];
  const events = {
    dark_ledger_0: { title: '药库少了三瓶养脉药', text: '管库师兄顾魇把三只空药匣放到桌上。', choices: [] },
    dark_ledger_2: { title: '核对账册', text: '执事问起那天的事。', choices: [{ id: 'cautious', label: '请顾魇一起作证', hint: '当面核对。' }] },
  };
  assert.deepEqual(checkIntroductions(events, chains), []);
});

/* ────────────────────── 判据④ · 童年卡的结果都要有下文 ────────────────────── */

test('判据④：童年标记接不上线 ⇒ 报红', () => {
  /* 故意让 sold_page 认不出来（就是这次修之前的毛病）。 */
  const broken = s => {
    const marks = s.life.cultivation.network.marks;
    if (marks.teacher_notes || marks.herbs) return 'teacher';
    if (marks.old_page || marks.relic_route) return 'relic';
    return null;
  };
  const problems = checkMarks(broken);
  assert.ok(problems.some(p => p.includes('sold_page')), '接不上的童年标记必须报红：' + JSON.stringify(problems));
});

test('判据④：旧联系人顺序被改 ⇒ 报红', () => {
  /*
   * ⚠ 2026-11-08（清旧档）：这条原来测的是「**旧版本**的旧联系人顺序」——
   *   规则 10/11 的执行器与事件表已经删干净了 ⇒ 那条断言不存在了。
   * ⇒ 改成测**规则十二自己**的那句（「认 sold_page、授业者在前」）：
   *   反向验证的形状不变（故意把顺序改坏 ⇒ 必须报红）。
   */
  const broken = s => {
    const marks = s.life.cultivation.network.marks;
    if (marks.sold_page || marks.old_page || marks.relic_route) return 'relic';
    return null;
  };
  const problems = checkMarks(broken);
  assert.ok(problems.some(p => p.includes('旧联系人顺序')), '旧联系人顺序被动过必须报红：' + JSON.stringify(problems));
});

test('判据④：改对了 ⇒ 不报红', () => {
  assert.deepEqual(checkMarks(), []);
});

/* ────────────── 判据⑤（跑一遍人生）· 顾魇首次出现前必有引子 ────────────── */

test('判据⑤：选项里先出现顾魇 ⇒ 报红', () => {
  const events = {
    root_result: { title: 'x', text: '许执事记下你的灵根。', choices: [{ id: 'dark', label: 'a', hint: '顾魇能教禁术。' }] },
  };
  const lives = [{ snapshots: [{ event: 'root_result' }] }];
  assert.ok(checkFirstMention(events, lives).some(p => p.includes('root_result')));
});

test('判据⑤：正文里先出现顾魇 ⇒ 不报红', () => {
  const events = {
    dark_invitation: { title: '药铺后堂的入堂条件', text: '接引人顾魇认出残卷上的药铺印记。', choices: [] },
  };
  const lives = [{ snapshots: [{ event: 'dark_invitation' }] }];
  assert.deepEqual(checkFirstMention(events, lives), []);
});

test('判据⑤：一条人生都没走到顾魇 ⇒ 报红（这条断言没被验过）', () => {
  const events = { root_result: { title: 'x', text: 'y', choices: [] } };
  const lives = [{ snapshots: [{ event: 'root_result' }] }];
  assert.ok(checkFirstMention(events, lives).some(p => p.includes('没被真正验过')));
});

/* ────────────────────────────── 人名表自检 ────────────────────────────── */

test('人名表里有已经不存在的人 ⇒ 报红', () => {
  const problems = checkPeopleTable({ a: { title: 'x', text: 'y' } });
  assert.ok(problems.length > 0, '人名表腐烂必须报红');
});
