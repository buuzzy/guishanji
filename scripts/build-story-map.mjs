#!/usr/bin/env node
/**
 * 筑基前决策故事线 · 交互式 HTML 生成器 v2（2026-11-09）
 * ============================================================================
 * v2：显式表达「触发与挑选逻辑」——每张卡标注触发方式：
 *   sequence   固定顺序（上一张答完隔 N 个月发下一张）
 *   pool       窗口池：窗口内按出身筛出一池，随机流抽一张（一窗口一张，抽不到留空）
 *   threshold  进度阈值：本章进度到达 X% 即发
 *   milestone  里程碑：条件齐了自动发，不与候选卡竞争
 *   opportunity 候选池：到点抽签（哈希概率），错过窗口不再来
 *   conditional 条件触发：特定前情标记满足时
 *   chain      长线：按年龄窗口排队，步与步相接
 * 渲染上：池选的成员卡画进虚线池框；固定顺序画箭头；其余按类型挂角标。
 */
import {writeFileSync} from 'node:fs';
import {createRun, EVENTS} from '../packages/adventure/engine.js';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {ITEMS} from '../content/items.js';

const OUTPUT = '/Users/nakocai/Desktop/归山记-筑基前决策故事线.html';

const STAT_NAMES = {stones: '灵石', mind: '心性', courage: '胆识', empath: '同理心', empathy: '同理心', insight: '悟性', health: '体魄', sword: '剑术', alchemy: '丹术', array: '阵法'};
const PATH_NAMES = {orthodox: '宗门', loose: '散修', demonic: '魔修（幽灯堂）', beast: '妖身', mortal: '凡俗', all: '全路线'};
const KIND_NAMES = {sequence: '固定顺序', pool: '窗口池选', threshold: '进度阈值', milestone: '里程碑自动发', opportunity: '候选池抽签', conditional: '条件触发', chain: '长线排队'};

/* 触发机制注记（口径与实现一致） */
const TRIGGERS = {
  r12_child_body: {kind: 'conditional', when: '6–9 岁 · 只给体弱或无人照看的孩子，且占掉该窗口唯一的位置'},
  r12_child_fever: {kind: 'conditional', when: '同上：身体事件的另一版，与体检卡互斥'},
  child_school: {kind: 'pool', when: '6–9 岁窗口 · 按出身筛池后抽一张（村塾：普通人家常见）', pool: 'w69'},
  child_apothecary: {kind: 'pool', when: '6–9 岁窗口 · 按出身筛池后抽一张（药铺学徒）', pool: 'w69'},
  child_clan: {kind: 'pool', when: '6–9 岁窗口 · 族学类，世家子弟才进池', pool: 'w69'},
  child_noble_school: {kind: 'pool', when: '6–9 岁窗口 · 名门大户专属家塾', pool: 'w69'},
  child_keeper: {kind: 'pool', when: '6–9 岁窗口 · 收养出身专属（魔道/妖身/散修人家的孩子）', pool: 'w69'},
  child_friend: {kind: 'pool', when: '6–9 岁窗口 · 渡口人家的孩子', pool: 'w69'},
  child_caravan: {kind: 'pool', when: '6–9 岁窗口 · 商户人家的孩子', pool: 'w69'},
  child_secret: {kind: 'pool', when: '6–9 岁窗口 · 宗门杂役出身', pool: 'w69'},
  child_relic: {kind: 'milestone', when: '10–12 岁 · 人人有这一张（铜匣线的钩子，覆盖率必须高）'},
  child_recruit: {kind: 'pool', when: '13–15 岁窗口 · 宗门来招（普通出身的主要由头）', pool: 'w1315'},
  child_teacher: {kind: 'pool', when: '13–15 岁窗口 · 要有「读过书 / 学过药」的由头才进池', pool: 'w1315'},
  child_family_vow: {kind: 'pool', when: '13–15 岁窗口 · 世家子弟的举荐线', pool: 'w1315'},
  child_noble_recommend: {kind: 'pool', when: '13–15 岁窗口 · 名门大户的郡中名帖', pool: 'w1315'},
  reception: {kind: 'sequence', when: '16 岁 · 入门串第一步（固定顺序）'},
  root_result: {kind: 'sequence', when: 'reception 答完 +12 个月 · 测灵判决'},
  sect_department: {kind: 'sequence', when: 'root_result 答完 +2 个月'},
  method_choice: {kind: 'sequence', when: '其后 · 授业者按路数定心法'},
  first_method: {kind: 'sequence', when: '其后 · 第一次授业，重心在此定下'},
  r12_peer_first: {kind: 'conditional', when: '凡身章后段 · 岑野（固定 18 岁）已入道而你还没有时，一次'},
  r12_peer_shiweng: {kind: 'threshold', when: '凡身章进度约一成半 · 首次指导卡之前，一次'},
  r12_qi_practice_0: {kind: 'threshold', when: '凡身章进度三成（约 14 点），一次'},
  r12_qi_practice_1: {kind: 'threshold', when: '凡身章进度七成（约 34 点），一次'},
  r12_direction_0: {kind: 'conditional', when: '20 岁起 · 修为不达冲关线时的指导卡（修士必经）'},
  selection_1: {kind: 'opportunity', when: '18 岁后 · 日常候选池抽签（与其他候选竞争）'},
  garden_accident: {kind: 'opportunity', when: '20–36 岁 · 日常机会池，五成机会，错过不再来'},
  network_echo: {kind: 'conditional', when: '童年线索（阿宁 / 铜匣 / 余衡）在册时，回响卡'},
  network_clan_call: {kind: 'conditional', when: '30 岁后 · 族中有旧举荐情分，六成机会'},
  r12_stage_1: {kind: 'threshold', when: '炼气章进度两成半，一次'},
  r12_stage_2: {kind: 'threshold', when: '炼气章进度五成，一次'},
  r12_stage_3: {kind: 'threshold', when: '炼气章进度七成半，一次'},
  r12_qi_adventure: {kind: 'threshold', when: '炼气章进度三成八，一次'},
  r12_peer_xiaoman: {kind: 'threshold', when: '炼气章进度四成半，一次'},
  r12_peer_letter: {kind: 'threshold', when: '炼气章进度八成半，且距小满那张 ≥12 个月，一次'},
  r12_direction_1: {kind: 'conditional', when: '炼气章 · 修为不达筑基线时的指导卡'},
  r12_patron: {kind: 'conditional', when: '筑基预备 · 供料年限到期时'},
  r12_foundation_supply: {kind: 'conditional', when: '筑基预备 · 筑基丹的来路'},
  r12_sect_clue: {kind: 'conditional', when: '筑基预备 · 井中灵息的来路'},
  r12_sealed_warning: {kind: 'conditional', when: '灵息来源被查觉时'},
  breakthrough_1_0: {kind: 'milestone', when: '里程碑：修为满 48 点 + 已获心法 + 18–27 岁窗口，条件齐自动发'},
  breakthrough_1_1: {kind: 'milestone', when: '首试失败后的重试（里程碑档按次序发）'},
  breakthrough_1_2: {kind: 'milestone', when: '第二次重试'},
  breakthrough_1_3: {kind: 'milestone', when: '最后一次机会（授业者亲自护法）'},
  breakthrough_2_0: {kind: 'milestone', when: '里程碑：修为满 120 点 + 主药齐，闭关 24 个月判定'},
  breakthrough_2_1: {kind: 'milestone', when: '首试失败后的重试'},
  breakthrough_2_2: {kind: 'milestone', when: '第二次重试'},
  breakthrough_2_3: {kind: 'milestone', when: '最后一次机会'},
};

const POOLS = {
  w69: {label: '6–9 岁窗口池 · 一生只抽一张', note: '按出身筛出一池，随机流抽签定哪张、窗口内哪个月到；体弱/无人照看的孩子由身体卡占掉这一格'},
  w1315: {label: '13–15 岁窗口池 · 一生只抽一张', note: '要有「上山由头」才进池；抽不到由头 ⇒ 这几年没人来找你，格子留空'},
};

function repStates() {
  const mk = (path, realm) => {
    const s = createRun({seed: '故事线图-' + path, rulesVersion: 12, conduct: 'care'});
    s.month = 22 * 12; s.player.practice = s.month;
    s.player.root = path === 'mortal' ? '未显灵根' : '三相灵根';
    s.player.realm = realm; s.player.stones = 30;
    Object.assign(s.life.cultivation, {rootKnown: true, path, admissionDone: true, entered: 192, worldDone: true, queue: [], activeChain: null, context: null, punishmentUntil: 0});
    s.life.cultivation.story10.rootStatus = 'present'; s.life.cultivation.story10.body = 'human';
    s.life.cultivation.network.method = {id: 'clear', source: 'first_method', months: 144, acquired: 192};
    s.life.cultivation.network.methods = [{...s.life.cultivation.network.method}];
    s.life.cultivation.v12.entryMethod = 'clear';
    s.pending = null; s.journey = {open: true, from: s.month, to: 13000, target: null, practice: 'array'};
    return s;
  };
  return {orthodox: mk('orthodox', 1), loose: mk('loose', 1), demonic: mk('demonic', 1), beast: mk('beast', 1), mortal: mk('mortal', 0), all: mk('orthodox', 1)};
}
const STATES = repStates();
const ev = (value, lane) => {
  if (typeof value !== 'function') return String(value ?? '');
  try { return String(value(STATES[lane] || STATES.all) ?? ''); } catch { return '(按情形变化)'; }
};

function badges(choice) {
  const out = [];
  const cost = choice.cost || {};
  if (cost.stones) out.push({t: 'lose', s: '灵石 −' + cost.stones});
  if (cost.items) for (const it of cost.items) out.push({t: 'lose', s: '消耗 ' + (ITEMS[it] ? ITEMS[it].name : it)});
  const fx = choice.effects || {};
  if (fx.items) for (const it of fx.items) out.push({t: 'gain', s: '获得 ' + (ITEMS[it] ? ITEMS[it].name : it)});
  if (fx.remove) for (const it of fx.remove) out.push({t: 'lose', s: '失去 ' + (ITEMS[it] ? ITEMS[it].name : it)});
  for (const [k, v] of Object.entries(fx.stats || {})) {
    if (k === 'stones') out.push({t: v >= 0 ? 'gain' : 'lose', s: '灵石 ' + (v >= 0 ? '+' : '') + v});
    else out.push({t: v >= 0 ? 'gain' : 'lose', s: (STAT_NAMES[k] || k) + ' ' + (v >= 0 ? '+' : '') + v});
  }
  if (fx.flags && Object.keys(fx.flags).length) out.push({t: 'mark', s: '印记：' + Object.keys(fx.flags).join('、')});
  const sys = choice.system || {};
  if (sys.realm !== undefined || fx.realm !== undefined) out.push({t: 'realm', s: '境界进阶'});
  if (sys.path) out.push({t: 'path', s: '转向「' + (PATH_NAMES[sys.path] || sys.path) + '」'});
  if (sys.breakthrough) out.push({t: 'realm', s: '境界冲关（闭关 ' + (choice.months || 0) + ' 个月，判定见下）'});
  if (sys.exam) out.push({t: 'realm', s: '报名「' + (STAT_NAMES[sys.exam.skill] || sys.exam.skill) + '」考核'});
  if (sys.plan12) out.push({t: 'mark', s: sys.plan12 === 'retreat' ? '闭关计划（多年）' : sys.plan12 === 'travel' ? '游历计划（多年）' : '做工计划'});
  if (sys.qi12) out.push({t: sys.qi12 === 'rebuild' ? 'lose' : 'mark', s: sys.qi12 === 'rebuild' ? '散功重修：修为折损两成' : sys.qi12 === 'push' ? '强行行气' : sys.qi12 === 'wait' ? '休养' : '行气抉择'});
  if (sys.peer12) out.push({t: 'mark', s: '同门伏笔：' + (PEER_NOTES[sys.peer12] || sys.peer12)});
  if (sys.punishment) out.push({t: 'lose', s: '师门处分 ' + sys.punishment + ' 个月'});
  if (sys.wanted) out.push({t: 'lose', s: '被记名追索 +' + sys.wanted});
  if (sys.familyVisit) out.push({t: 'mark', s: '返乡安排'});
  if (sys.relocate) out.push({t: 'mark', s: '迁居'});
  if (choice.months && !sys.breakthrough && !sys.plan12) out.push({t: 'time', s: '耗时 ' + choice.months + ' 个月'});
  if (choice.check) {
    const c = choice.check;
    out.push({t: 'check', s: '判定：基础 ' + c.base + ' + ' + (STAT_NAMES[c.skill] || c.skill || '悟性') + ' 加成' + (c.failEnding === 'battle_lost' ? '，失败可能战死' : c.failText ? '，失败：' + String(c.failText).slice(0, 24) + '…' : '，失败有代价')});
  }
  if (choice.ending) out.push({t: 'realm', s: '通向结局「' + choice.ending + '」'});
  if (choice.reason) out.push({t: 'gate', s: '门槛：' + choice.reason});
  return out;
}
const PEER_NOTES = {
  congrats: '与岑野的饭堂夜谈（无标记）', race: '标记 rival：卡四「该你先走了」',
  ask: '标记 askedWhy：「为什么修」——卡四兑现，筑基篇收口', take: '石瓮的心意（道具见获得徽章）',
  learn: '无标记，自力更生', joke: '标记 shiwengJoke：突破失败文案改提「篮底字条」',
  send: '小满下山 · 标记 xiaomanSent', keep: '小满留下（六灵石）· 标记 xiaomanKept',
  asked: '小满下山，话说开了 · 标记 xiaomanAsked', reply: '回信', store: '收进心里',
};

function nodeData(id, lane) {
  const node = EVENTS[id];
  if (!node) return null;
  const tg = TRIGGERS[id] || {kind: 'conditional', when: ''};
  return {
    id, lane,
    kind: tg.kind, when: tg.when, pool: tg.pool || null,
    title: ev(node.title, lane),
    text: ev(node.text, lane).slice(0, 220),
    choices: (node.choices || []).map(c => ({
      id: c.id, label: ev(c.label, lane), hint: ev(c.hint, lane), reply: ev(c.reply, lane), badges: badges(c),
    })),
  };
}

const CHAPTERS = [
  {id: 'birth', name: '序章 · 出身与童年前段（0–12 岁）', sub: '三个童年窗口依次到来，但窗口内部不是顺序：按出身筛池、随机流抽一张。你的一生只有两三张童年卡——图里画的 11 张是全部候选，不是你都会遇到。'},
  {id: 'teen', name: '少年 · 童年后段与上山由头（13–15 岁）', sub: '最后一个童年窗口：要有「读过书 / 学过药 / 家里有人举荐」这类由头才进池；没有由头 ⇒ 这几年没人来找你，格子留空。'},
  {id: 'entry', name: '入门串 · 一次定终身（16–18 岁）', sub: '这一段是真·固定顺序：上一张答完隔固定月数发下一张，测灵只在这条链上讲一次。'},
  {id: 'mortal', name: '凡身章 · 修行从拿到心法开始（16–24 岁）', sub: '混合触发：进度阈值卡（铺练）按修为发，候选池卡抽签，条件卡看前情标记。修为 48 点 + 心法 ⇒ 进冲关。'},
  {id: 'qi', name: '炼气章 · 朝筑基积累（24–36 岁）', sub: '阶段节点卡（两成半 / 五成 / 七成半）与奇遇卡（三成八）、同门卡（四成半 / 八成半）按本章进度发；筑基准备卡看前情。'},
  {id: 'gate', name: '筑基关口', sub: '里程碑档：条件齐了自动发，不与候选卡竞争、不受发卡冷却。四张 = 首试 → 三次重试，每次文案不同。'},
  {id: 'chains', name: '长线支线（20–42 岁 · 按路线分道）', sub: '每条线三步排队：步与步相接，整线按年龄窗口排队进闸。判定失败的风险在每步详情里。'},
];
const NODES = {
  birth: [
    ['child_school', 'all'], ['child_apothecary', 'all'], ['child_clan', 'all'],
    ['child_noble_school', 'all'], ['child_keeper', 'all'], ['child_friend', 'all'],
    ['child_caravan', 'all'], ['child_secret', 'all'],
    ['r12_child_body', 'all'], ['r12_child_fever', 'all'], ['child_relic', 'all'],
  ],
  teen: [
    ['child_recruit', 'all'], ['child_teacher', 'all'], ['child_family_vow', 'all'], ['child_noble_recommend', 'all'],
  ],
  entry: [
    ['reception', 'all'], ['root_result', 'all'], ['sect_department', 'all'],
    ['method_choice', 'all'], ['first_method', 'all'],
  ],
  mortal: [
    ['r12_peer_first', 'orthodox'], ['r12_peer_shiweng', 'orthodox'], ['r12_qi_practice_0', 'all'],
    ['r12_direction_0', 'all'], ['selection_1', 'orthodox'], ['garden_accident', 'orthodox'],
    ['r12_qi_practice_1', 'all'], ['network_echo', 'all'], ['network_clan_call', 'all'],
  ],
  qi: [
    ['r12_stage_1', 'all'], ['r12_qi_adventure', 'all'], ['r12_peer_xiaoman', 'orthodox'],
    ['r12_stage_2', 'all'], ['r12_stage_3', 'all'], ['r12_peer_letter', 'orthodox'],
    ['r12_direction_1', 'all'], ['r12_patron', 'all'], ['r12_foundation_supply', 'all'],
    ['r12_sect_clue', 'all'], ['r12_sealed_warning', 'all'], ['family_gate', 'all'], ['family_support', 'all'],
  ],
  gate: [
    ['breakthrough_1_0', 'all'], ['breakthrough_1_1', 'all'], ['breakthrough_1_2', 'all'], ['breakthrough_1_3', 'all'],
    ['breakthrough_2_0', 'all'], ['breakthrough_2_1', 'all'], ['breakthrough_2_2', 'all'], ['breakthrough_2_3', 'all'],
  ],
};

const out = {generatedAt: new Date().toISOString(), chapters: [], pools: POOLS};
for (const ch of CHAPTERS) {
  const section = {id: ch.id, name: ch.name, sub: ch.sub, nodes: [], chains: []};
  if (ch.id === 'chains') {
    for (const chain of ROAD_CHAINS) {
      if (chain.age > 40) continue;
      const stages = [];
      for (let i = 0; i < chain.stages.length; i++) {
        const nd = nodeData(chain.id + '_' + i, chain.path);
        if (nd) {nd.trigger = chain.age + '–' + chain.ageEnd + ' 岁 · ' + (PATH_NAMES[chain.path] || chain.path) + '路线 · 第 ' + (i + 1) + ' 步';nd.when = nd.trigger;stages.push(nd);}
      }
      if (stages.length) section.chains.push({id: chain.id, path: chain.path, age: chain.age, ageEnd: chain.ageEnd, stages});
    }
  } else {
    for (const [id, lane] of NODES[ch.id] || []) {
      const nd = nodeData(id, lane);
      if (nd) section.nodes.push(nd);
    }
  }
  out.chapters.push(section);
}
out.note = '未逐张画出：日常候选池杂卡（mission / omen / hunter / parcel 等约 30 张，同样由候选池抽签）、40 岁后的 road_turn（筑基之后）。';

const KIND_STYLE = {
  sequence: {bg: 'var(--blue-soft)', color: 'var(--blue-deep)'},
  pool: {bg: '#f1ecf8', color: 'var(--mark)'},
  threshold: {bg: '#fdf3e3', color: 'var(--realm)'},
  milestone: {bg: '#e6f4ec', color: 'var(--gain)'},
  opportunity: {bg: '#fbeae6', color: 'var(--lose)'},
  conditional: {bg: 'var(--gate-bg)', color: 'var(--gate)'},
};

const json = JSON.stringify(out).replace(/</g, '\\u003c');
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>归山记 · 出生到筑基 · 决策故事线（含触发与挑选逻辑）</title>
<style>
  :root{
    --bg:#f6f7f9; --panel:#ffffff; --ink:#1c2330; --sub:#5b6472; --line:#dde3ea;
    --blue:#2f6fbf; --blue-soft:#e8f0fa; --blue-deep:#1c4e8e;
    --gain:#1d7a46; --gain-bg:#e6f4ec; --lose:#b0432f; --lose-bg:#fbeae6;
    --mark:#7a5aa8; --mark-bg:#f1ecf8; --realm:#8a5a16; --realm-bg:#fdf3e3;
    --check:#33636f; --check-bg:#e8f1f3; --gate:#8a8f98; --gate-bg:#eef0f2; --time:#5b6472; --time-bg:#eef0f2;
  }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 "PingFang SC","Microsoft YaHei",sans-serif}
  header{position:sticky;top:0;z-index:5;background:var(--panel);border-bottom:1px solid var(--line);padding:14px 22px 10px}
  h1{margin:0 0 6px;font-size:20px}
  .sub{color:var(--sub);font-size:13px;margin-bottom:10px}
  .filters{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .filters b{font-size:13px;color:var(--sub);margin-right:2px;font-weight:normal}
  .pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:3px 12px;font-size:13px;cursor:pointer;user-select:none}
  .pill.on{background:var(--blue);border-color:var(--blue);color:#fff}
  .sep{width:1px;height:18px;background:var(--line);margin:0 6px}
  main{max-width:1120px;margin:0 auto;padding:18px 22px 80px}
  .legend{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 6px;font-size:12px}
  .kindlegend{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;font-size:12px}
  .b{display:inline-block;border-radius:5px;padding:1px 8px;margin:2px 4px 2px 0;font-size:12px;white-space:nowrap}
  .b.gain{background:var(--gain-bg);color:var(--gain)} .b.lose{background:var(--lose-bg);color:var(--lose)}
  .b.mark{background:var(--mark-bg);color:var(--mark)} .b.realm{background:var(--realm-bg);color:var(--realm)}
  .b.check{background:var(--check-bg);color:var(--check)} .b.gate{background:var(--gate-bg);color:var(--gate)}
  .b.time{background:var(--time-bg);color:var(--time)} .b.path{background:var(--blue-soft);color:var(--blue-deep)}
  h2{font-size:17px;margin:34px 0 4px;padding-left:10px;border-left:4px solid var(--blue)}
  .ch-sub{color:var(--sub);font-size:13px;margin:0 0 12px 14px;max-width:860px}
  .row{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin-bottom:14px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px 13px;width:240px;cursor:pointer;position:relative;transition:box-shadow .15s,transform .15s}
  .card:hover{box-shadow:0 4px 14px rgba(47,111,191,.14);transform:translateY(-2px)}
  .card.new::after{content:"W1 新卡";position:absolute;top:-9px;right:10px;background:var(--blue);color:#fff;font-size:10px;border-radius:999px;padding:1px 8px}
  .card h3{margin:0 0 5px;font-size:14.5px}
  .card .n{color:var(--sub);font-size:12px;margin-top:5px}
  .arrow{align-self:center;color:var(--blue);font-size:20px;font-weight:bold}
  .poolbox{border:2px dashed #b9a5dd;border-radius:12px;padding:12px 14px;margin-bottom:14px;background:#fbf9fd}
  .poolbox .poolhead{font-size:13.5px;color:var(--mark);font-weight:bold;margin-bottom:2px}
  .poolbox .poolnote{font-size:12.5px;color:var(--sub);margin-bottom:10px}
  .poolbox .cards{display:flex;flex-wrap:wrap;gap:10px}
  .poolbox .card{background:#fff}
  .kindtag{position:absolute;top:-9px;left:10px;font-size:10px;border-radius:999px;padding:1px 8px}
  .chain{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:14px}
  .chain.hidden{display:none}
  .chain h3{margin:0 0 2px;font-size:14.5px}
  .chain .meta{color:var(--sub);font-size:12.5px;margin-bottom:10px}
  .steps{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
  .step{background:var(--blue-soft);border:1px solid #cfdff2;border-radius:8px;padding:9px 11px;width:210px;cursor:pointer}
  .step h4{margin:0 0 4px;font-size:13.5px;color:var(--blue-deep)}
  .step p{margin:0;font-size:12px;color:var(--sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .drawer{position:fixed;top:0;right:-520px;width:500px;max-width:94vw;height:100vh;background:var(--panel);border-left:1px solid var(--line);box-shadow:-8px 0 30px rgba(28,35,48,.12);transition:right .22s;z-index:20;display:flex;flex-direction:column}
  .drawer.open{right:0}
  .drawer .head{padding:16px 20px;border-bottom:1px solid var(--line)}
  .drawer .head h3{margin:0 0 4px;font-size:17px}
  .drawer .head .trg{color:var(--sub);font-size:13px}
  .drawer .body{overflow-y:auto;padding:14px 20px 40px;flex:1}
  .drawer .text{font-size:14px;margin:0 0 16px;padding:10px 12px;background:var(--blue-soft);border-radius:8px}
  .choice{border:1px solid var(--line);border-radius:9px;padding:10px 13px;margin-bottom:12px}
  .choice h4{margin:0 0 3px;font-size:14px}
  .choice .hint{color:var(--sub);font-size:12.5px;margin-bottom:4px}
  .choice .reply{font-size:12.5px;color:var(--ink);margin-bottom:4px}
  .badgebar{margin-top:6px}
  .dim{display:none !important}
  .foot{color:var(--sub);font-size:12.5px;margin-top:26px}
  .mask{position:fixed;inset:0;background:rgba(20,26,36,.25);z-index:15;display:none}
  .mask.on{display:block}
  @media(max-width:760px){.card{width:100%}.step{width:100%}}
</style>
</head>
<body>
<header>
  <h1>归山记 · 出生到筑基 · 决策故事线（含触发与挑选逻辑）</h1>
  <div class="sub">点击任意卡片查看正文与每个选项的获得 / 失去 / 道具 / 判定 / 伏笔。每张卡左上角标注它的触发方式；虚线框是「窗口池」——池内候选，一人只抽一张。</div>
  <div class="filters">
    <b>章节</b><span id="chapterPills"></span>
    <span class="sep"></span>
    <b>路线</b><span id="pathPills"></span>
  </div>
</header>
<main>
  <div class="legend">
    <span class="b gain">获得</span><span class="b lose">失去 / 花费</span><span class="b mark">标记与伏笔</span>
    <span class="b realm">境界相关</span><span class="b check">判定</span><span class="b gate">门槛</span><span class="b time">耗时</span><span class="b path">路线转向</span>
  </div>
  <div class="kindlegend">
    <b style="color:var(--sub)">触发方式</b>
    <span class="b" style="background:var(--blue-soft);color:var(--blue-deep)">固定顺序</span>
    <span class="b" style="background:#f1ecf8;color:var(--mark)">窗口池选（虚线框）</span>
    <span class="b" style="background:#fdf3e3;color:var(--realm)">进度阈值</span>
    <span class="b" style="background:#e6f4ec;color:var(--gain)">里程碑自动发</span>
    <span class="b" style="background:#fbeae6;color:var(--lose)">候选池抽签</span>
    <span class="b" style="background:var(--gate-bg);color:var(--gate)">条件触发</span>
  </div>
  <div id="content"></div>
  <div class="foot">__NOTE__<br><br>生成时间 __GEN__ · 数据取自引擎装配后的事件表（含 W1 同期弟子卡）· 本图不改变任何游戏内容。</div>
</main>
<div class="mask" id="mask"></div>
<aside class="drawer" id="drawer"><div class="head" id="dHead"></div><div class="body" id="dBody"></div></aside>
<script>
const DATA = __DATA__;
const NEW_CARDS = new Set(['r12_peer_first','r12_peer_shiweng','r12_peer_xiaoman','r12_peer_letter']);
const PATH_NAMES = {all:'全路线',orthodox:'宗门',loose:'散修',demonic:'魔修',beast:'妖身',mortal:'凡俗'};
const KIND_NAMES = {sequence:'固定顺序',pool:'窗口池选',threshold:'进度阈值',milestone:'里程碑自动发',opportunity:'候选池抽签',conditional:'条件触发',chain:'长线排队'};
let curChapter='all', curPath='all';
function pill(label,val,on,fn){const s=document.createElement('span');s.className='pill'+(on?' on':'');s.textContent=label;s.onclick=()=>fn(val);return s;}
function renderPills(){
  const cp=document.getElementById('chapterPills'),pp=document.getElementById('pathPills');
  cp.innerHTML='';pp.innerHTML='';
  cp.appendChild(pill('全部','all',curChapter==='all',v=>{curChapter=v;renderPills();renderContent();}));
  for(const c of DATA.chapters)cp.appendChild(pill(c.name.split(' ·')[0],c.id,curChapter===c.id,v=>{curChapter=v;renderPills();renderContent();}));
  pp.appendChild(pill('全路线','all',curPath==='all',v=>{curPath=v;renderPills();renderContent();}));
  for(const p of ['orthodox','loose','demonic','beast','mortal'])pp.appendChild(pill(PATH_NAMES[p],p,curPath===p,v=>{curPath=v;renderPills();renderContent();}));
}
const match=p=>curPath==='all'||p==='all'||p===curPath;
function kindTag(nd){
  if(!nd.kind)return document.createElement('span');
  const st={sequence:{bg:'var(--blue-soft)',color:'var(--blue-deep)'},pool:{bg:'#f1ecf8',color:'var(--mark)'},threshold:{bg:'#fdf3e3',color:'var(--realm)'},milestone:{bg:'#e6f4ec',color:'var(--gain)'},opportunity:{bg:'#fbeae6',color:'var(--lose)'},conditional:{bg:'var(--gate-bg)',color:'var(--gate)'}}[nd.kind]||{};
  const s=document.createElement('span');s.className='kindtag';
  s.style.background=st.bg;s.style.color=st.color;
  s.textContent=KIND_NAMES[nd.kind]||nd.kind;
  return s;
}
function cardEl(nd){
  const d=document.createElement('div');
  d.className='card'+(NEW_CARDS.has(nd.id)?' new':'')+(match(nd.lane)?'':' dim');
  d.appendChild(kindTag(nd));
  const h=document.createElement('h3');h.textContent=nd.title;d.appendChild(h);
  const t=document.createElement('div');t.style.cssText='color:var(--sub);font-size:12px;min-height:29px';t.textContent=nd.when||'';d.appendChild(t);
  const n=document.createElement('div');n.className='n';n.textContent=nd.choices.length+' 个选项 · 点击展开';d.appendChild(n);
  d.onclick=()=>openDrawer(nd);
  return d;
}
function poolBox(group,nodes){
  const d=document.createElement('div');
  d.className='poolbox';
  const h=document.createElement('div');h.className='poolhead';h.textContent=group.label;d.appendChild(h);
  const n=document.createElement('div');n.className='poolnote';n.textContent=group.note;d.appendChild(n);
  const cards=document.createElement('div');cards.className='cards';
  for(const nd of nodes)cards.appendChild(cardEl(nd));
  d.appendChild(cards);
  return d;
}
function chainEl(ch){
  const d=document.createElement('div');
  d.className='chain'+(match(ch.path)?'':' dim');
  d.innerHTML='<h3>'+ch.id+' <span class="b path">'+PATH_NAMES[ch.path]+'</span></h3><div class="meta">'+ch.age+'–'+ch.ageEnd+' 岁 · 三步一线，步与步排队相接</div>';
  const steps=document.createElement('div');steps.className='steps';
  ch.stages.forEach((nd,i)=>{
    const s=document.createElement('div');s.className='step';
    s.innerHTML='<h4>第'+(i+1)+'步 · '+nd.title+'</h4><p>'+nd.text.slice(0,64)+'…</p>';
    s.onclick=()=>openDrawer(nd);
    steps.appendChild(s);
    if(i<ch.stages.length-1){const a=document.createElement('div');a.className='arrow';a.textContent='→';steps.appendChild(a);}
  });
  d.appendChild(steps);
  return d;
}
function renderContent(){
  const root=document.getElementById('content');root.innerHTML='';
  for(const ch of DATA.chapters){
    if(curChapter!=='all'&&curChapter!==ch.id)continue;
    const h=document.createElement('h2');h.textContent=ch.name;
    const sub=document.createElement('div');sub.className='ch-sub';sub.textContent=ch.sub;
    root.appendChild(h);root.appendChild(sub);
    let i=0;
    while(i<ch.nodes.length){
      const nd=ch.nodes[i];
      if(nd.pool){
        let j=i;const group=[];
        while(j<ch.nodes.length&&ch.nodes[j].pool===nd.pool){group.push(ch.nodes[j]);j++;}
        const meta=DATA.pools[nd.pool];
        root.appendChild(poolBox({label:meta.label,note:meta.note},group));
        i=j;
      } else {
        const row=document.createElement('div');row.className='row';
        row.appendChild(cardEl(nd));
        let j=i+1;
        while(j<ch.nodes.length&&!ch.nodes[j].pool&&ch.nodes[j].kind==='sequence'&&nd.kind==='sequence'){
          const a=document.createElement('div');a.className='arrow';a.textContent='→';row.appendChild(a);
          row.appendChild(cardEl(ch.nodes[j]));j++;
        }
        root.appendChild(row);i=j;
      }
    }
    for(const c of ch.chains||[])root.appendChild(chainEl(c));
  }
}
function openDrawer(nd){
  document.getElementById('dHead').innerHTML='<h3>'+nd.title+'</h3><div class="trg">'+(nd.when||'')+(nd.lane&&nd.lane!=='all'?' · '+PATH_NAMES[nd.lane]:'')+'</div>';
  const b=document.getElementById('dBody');
  b.innerHTML='<div class="text">'+nd.text+'</div>';
  for(const c of nd.choices){
    const d=document.createElement('div');d.className='choice';
    let h='<h4>「'+c.label+'」</h4>';
    if(c.hint&&c.hint!==c.label)h+='<div class="hint">'+c.hint+'</div>';
    if(c.reply)h+='<div class="reply">'+c.reply+'</div>';
    if(c.badges.length)h+='<div class="badgebar">'+c.badges.map(x=>'<span class="b '+x.t+'">'+x.s+'</span>').join('')+'</div>';
    d.innerHTML=h;b.appendChild(d);
  }
  document.getElementById('drawer').classList.add('open');
  document.getElementById('mask').classList.add('on');
}
document.getElementById('mask').onclick=closeDrawer;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('mask').classList.remove('on');}
renderPills();renderContent();
</script>
</body>
</html>`;
const final = html
  .replace('__DATA__', json)
  .replace('__GEN__', out.generatedAt.slice(0, 16).replace('T', ' '))
  .replace('__NOTE__', out.note);
writeFileSync(OUTPUT, final);
console.log('✓ 已生成 ' + OUTPUT);
console.log('  章节 ' + out.chapters.length + ' | 卡 ' + out.chapters.reduce((n, c) => n + c.nodes.length, 0) + ' | 长线 ' + out.chapters.reduce((n, c) => n + c.chains.length, 0) + ' 条');
