/**
 * page-model.js — 把修仙状态整理成**官方 1in8b 那套形状**的视图数据
 * ============================================================================
 *
 * 为什么单独一层
 * --------------
 * 修仙页面的**外壳**必须与官方小程序一致（顶栏 / 倍速条 / 面板 / 决策卡），
 * 否则就是「在官方小程序里塞了个外来页面」（2026-11-03 用户指出）。
 * 而修仙的**内容**又是它自己的一套（境界 / 灵石 / 灵根 / 大陆）。
 *
 * ⇒ 这一层负责把「修仙的状态」翻译成**官方那套字段名与排版**：
 *   · 顶栏：`.agebox`（年龄 / 年 · 名 / 进度条）
 *   · 状态条：`.minibar`（三格数值 + 重心 + 地图）
 *   · 人生纪录：`.feed-item`（年龄 + 一句话）
 *   · 决策卡：`.dec`（分类 / 年龄 · 年 / 标题 / 正文 / 事实 / 编号选项）
 *   · 登记卡：`.cert`（字段表两列 + 地图 + 一行事实）
 *
 * 字段名与结构**照官方 life.wxml / roll.wxml**，
 * 文案照上游修仙 HTML 端（`apps/preview/app.js`）。
 */
'use strict';

var engine = require('../runtime/engine.js');
var viewModel = require('./view-model.js');

/** 官方倍速档位（官方 life.js: `const SPEEDS = [1, 2, 4, 8, 12, 16];`）。 */
var SPEEDS = [1, 2, 4, 8, 12, 16];

function num(value) {
  var n = Number(value);
  return isFinite(n) ? n : 0;
}

/**
 * 起始年龄。
 * ⚠ **必须用 `??` 不能用 `||`**：
 *   上游 `birth.js:19` 写死 `startAge: 0`（新人生从 0 岁开始），
 *   `engine.js:493` 的校验是 `![0, 16].includes(birth.startAge)`
 *   ⇒ **0 与 16 都是合法起点**。
 *   用 `||` 会把 0 当成「没有值」⇒ 一出生就显示 16 岁。
 *   上游 `engine.js:38` 的口径是 `(state.birth?.startAge ?? 16)`。
 */
function startAgeOf(run) {
  var birth = run && run.birth;
  var value = birth ? birth.startAge : undefined;
  return value === undefined || value === null ? 16 : value;
}

function ageOf(run) {
  return Math.floor(run.month / 12) + startAgeOf(run);
}

function yearOf(run) {
  return (run.birth ? run.birth.year : 0) + Math.floor(run.month / 12);
}

/**
 * 能不能自己安排「重心」（状态条上的那颗按钮要不要出现）。
 *
 * ⚠ 口径来自上游 `packages/adventure/cultivation.js:65`：
 *   `else if (age(s) < 16) reason = '尚在成长，由家庭安排启蒙';`
 *   ⇒ **十六岁之前七个重心项全部 `enabled:false`**（不只是当前处境不允许改，
 *   而是根本不能进「自己安排」这条路）。
 *   上游初始化时 `activity:'study'`（同文件 `:19`）⇒ 少年时状态条上写着
 *   「重心：读经」，点进去七项全灰 —— 一个假入口（用户 2026-11-05 反馈）。
 *
 * ⇒ 十六岁前**根本不显示**「重心」按钮（`life.wxml` 的 `.mb-fo` 用
 *   `wx:if="{{canFocus}}"`）；满十六岁那一刻自动出现。
 *
 * ⚠ 年龄必须走 `ageOf()`：它用的是 `startAgeOf()`，**0 是合法起点**
 *   （上游 `birth.js:19` 写死 `startAge: 0`）⇒ 不能用 `||` 取值。
 */
function canFocus(run) {
  return ageOf(run) >= 16;
}

function geoName(id) {
  var list = engine.GEOGRAPHY || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* ───────────────────────────── 顶栏 ───────────────────────────── */

/**
 * 寿元计划 —— **只读规则层算好的数字**（`lifespanPlan12`），呈现层不自己算。
 *
 * ⚠ 规则层没带这个函数时（老存档 / 老版本）⇒ 返回 null ⇒ 那一行就不显示，
 *   宁可少一行，也不要显示一个编出来的数。
 */
function lifespanPlan(run) {
  if (!engine.lifespanPlan12) return null;
  try {
    return engine.lifespanPlan12(run);
  } catch (error) {
    return null;
  }
}

/**
 * 顶栏那一行：寿尽 X 岁 · 还能活 Y 年。
 * ⚠ **整句在 JS 侧拼好**（WXML 的 {{}} 不支持字符串拼接）。
 */
function lifespanLine(run) {
  var plan = lifespanPlan(run);
  if (!plan) return '';
  var template = (engine.LIFESPAN_TEXT && engine.LIFESPAN_TEXT.line) || '寿尽 {limit} 岁 · 还能活 {left} 年';
  if (engine.fillLifespan) return engine.fillLifespan(template, plan);
  return template.replace('{limit}', String(plan.limit)).replace('{left}', String(plan.left));
}

/**
 * 下一境界的「死线」：不突破到下一境，这一世最多活到那一年。
 */
function lifespanNext(run) {
  var plan = lifespanPlan(run);
  if (!plan) return '';
  if (plan.next === null || plan.next === undefined) return (engine.LIFESPAN_TEXT && engine.LIFESPAN_TEXT.last) || '';
  var template = (engine.LIFESPAN_TEXT && engine.LIFESPAN_TEXT.next) || '下一境（{nextRealm}）最多活到 {next} 岁';
  if (engine.fillLifespan) return engine.fillLifespan(template, plan);
  return template.replace('{nextRealm}', String(plan.nextRealm)).replace('{next}', String(plan.next));
}

/** 官方 `.agebox`：年龄大字 + 「年 · 名 · 1月≈N秒」+ 进度条。 */
function topbar(run) {
  var seconds = 12;
  try {
    if (engine.monthSeconds) seconds = engine.monthSeconds(run);
  } catch (error) {
    seconds = 12;
  }
  return {
    age: ageOf(run),
    year: yearOf(run),
    name: run.player.name,
    monthSec: Math.round(seconds * 100) / 100,
    /* ⚠ 顶栏显示「1年≈X秒」（官方原文：`1년 ≈ ${Math.round(S.yearSec)}초`）。
       ⚠ WXML 的 `{{}}` 不支持字符串拼接 ⇒ 整句在 JS 侧拼好。 */
    yearSec: Math.round(seconds * 12),
    /* 官方 yearProgress()：((month % 12 + fraction) / 12 * 100) */
    prog: Math.round(((run.month % 12) / 12) * 100),
    /* ⚠ 还能活多久（整句在 JS 侧拼好，WXML 不支持字符串拼接）。 */
    lifespanText: lifespanLine(run),
  };
}

/* ───────────────────────────── 状态条 ───────────────────────────── */

/**
 * 官方 `.minibar` 的四格数值。
 *
 * ⚠ **口径照上游修仙网页端**（`apps/preview/app.js` 的 `statBar()`）：
 *   体力 / 心境 / 悟性 / 胆识 —— 四格，**不含灵石**。
 *   灵石在「灵石与家产」面板里已经有专门的行（「随身灵石」），
 *   再放进状态条就是同一个数出现两处（用户 2026-11-03 指出）。
 *   官方 1in8b 小程序那一套是「健康 / 幸福 / 知识 / 关系」，那是官方人生的内容。
 *
 * ⚠ `bar` 是**钳位后**的条形图宽度（0–100）：
 *   官方网页端是 `clamp(r,0,100)`（`ui.pl.0.9.8.js` 的 `renderMini()`），
 *   不钳位的话值一超 100 就会把条撑破。
 */
function stats(run) {
  var player = run.player || {};
  var rows = [
    {k: 'health', n: '体力', v: num(player.health)},
    {k: 'mind', n: '心境', v: num(player.mind)},
    {k: 'insight', n: '悟性', v: num(player.insight)},
    {k: 'courage', n: '胆识', v: num(player.courage)},
  ];
  for (var i = 0; i < rows.length; i++) {
    rows[i].v = Math.round(rows[i].v);
    rows[i].bar = Math.max(0, Math.min(100, rows[i].v));
    rows[i].c = 'var(--stamp)';
  }
  return rows;
}

/** 官方 `.minibar` 里那个「重心」按钮上显示的名字。 */
function focusName(run) {
  var activities = viewModel.activities(run);
  for (var i = 0; i < activities.length; i++) if (activities[i].current) return activities[i].name;
  return '未定';
}

/* ───────────────────────────── 人生纪录 ───────────────────────────── */

/**
 * 官方 `.feed-item`：左边年龄，右边一句话。
 *
 * ⚠ **内容照上游修仙网页端**（`apps/preview/app.js:130-136` 的 timelineMarkup）：
 *   每条记录 = 年龄 + 年.月 + 标题 + 正文 + 变化清单。
 *   之前这里只取 `entry.title || entry.body` ⇒ 正文与变化整段丢了
 *   （用户 2026-11-04 真机反馈：「非决策卡的人生记录都是非常简单的一句话」）。
 *
 * 壳（`.feed-item` / `.age` / `.txt` / `.f` / `.stb`）照官方 1in8b 小程序。
 */
function feedRows(run, limit) {
  var rows = [];
  var journal = run.journal || [];
  for (var i = journal.length - 1; i >= 0; i--) {
    var entry = journal[i];
    rows.push({
      li: entry.id,
      a: ageAt(run, entry.month),
      ageText: ageAt(run, entry.month) + '岁',
      ym: yearMonthOf(run, entry.month),
      t: entry.title || '',
      f: entry.body || '',
      chg: (entry.changes || []).join(' · '),
      k: entry.kind || '',
      automatic: !!entry.automatic,
    });
  }
  if (limit && limit > 0 && rows.length > limit) rows = rows.slice(0, limit);
  return rows;
}

/** 记录抬头那句「N段 · M次抉择」（上游同款口径）。 */
function feedMeta(run) {
  return {
    total: (run.journal || []).length,
    decisions: (run.decisions || []).length,
    label: (run.journal || []).length + '段 · ' + (run.decisions || []).length + '次抉择',
  };
}

/**
 * 全屏记录弹层的分组（官方 `.decs` 年代分组按钮）。
 * ⚠ 官方按「年代」分组；修仙没有年代概念 ⇒ **按山历年份分组**，
 *   结构与 `jumpDec` 行为照官方。
 */
function feedGroups(run) {
  var rows = feedRows(run);
  var groups = [];
  var index = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var key = row.ym.split('.')[0];
    if (!index[key]) {
      index[key] = groups.length;
      groups.push({d: key, label: key + ' 年', items: []});
    }
    groups[index[key]].items.push(row);
  }
  return groups;
}

/** 山历年份 + 月（上游 `date()` 的 `年.月` 两段格式）。 */
function yearMonthOf(run, month) {
  var d = null;
  if (engine.date) {
    try {
      d = engine.date(run, month);
    } catch (error) {
      d = null;
    }
  }
  if (!d) return '';
  var m = d.month < 10 ? '0' + d.month : String(d.month);
  return d.year + '.' + m;
}

function ageAt(run, month) {
  return Math.floor((month || 0) / 12) + startAgeOf(run);
}

/* ───────────────────────────── 决策卡 ───────────────────────────── */

/**
 * 官方 `.dec` 形状的决策卡。
 * ⚠ 文案照上游修仙 HTML 端（app.js 的 showDecision），**不显示成功率**。
 */
function decisionCard(run) {
  if (!run.pending) return null;
  var node = engine.currentNode(run);
  if (!node) return null;
  var offered = engine.options(run) || [];
  var realm = (engine.REALMS[run.player.realm] || {}).name;
  var region = engine.regionInfo ? engine.regionInfo(run).name : '';
  var choices = [];
  for (var i = 0; i < offered.length; i++) {
    var option = offered[i];
    var cost = option.cost || {};
    var meta = '';
    if (option.enabled) {
      if (option.lethal) meta += '可能危及性命 · ';
      if (cost.stones) meta += '花费 ' + cost.stones + ' 灵石';
      if (cost.debt) meta += ' · 路费欠账 ' + cost.debt + ' 灵石';
      if (cost.items && cost.items.length) {
        meta += ' · 使用' + cost.items.map(function (id) {
          return (engine.ITEMS[id] && engine.ITEMS[id].name) || id;
        }).join('、');
      }
    } else {
      meta = '暂时无法这样做：' + (option.reasons || []).join('；');
    }
    choices.push({
      k: option.id,
      no: String(i + 1).padStart(2, '0'),
      label: option.label,
      sub: (option.hint ? option.hint : '') + (meta ? (option.hint ? ' · ' : '') + meta : ''),
      enabled: !!option.enabled,
    });
  }
  return {
    /* ⚠ 抬头照上游网页端（`apps/preview/app.js:193` 的 showDecision）：
     *   「N岁 · 这一刻由你决定」。官方那一套是动态分类 `dec.view.cat`，
     *   修仙没有官方那套分类体系 ⇒ 用网页端口径（用户 2026-11-03 拍板）。 */
    cat: ageOf(run) + '岁 · 这一刻由你决定',
    age: ageOf(run),
    year: yearOf(run),
    title: node.title,
    body: engine.nodeText(node, run),
    fact: region + ' · ' + realm + ' · ' + Math.round(num(run.player.stones)) + ' 灵石',
    choices: choices,
    note: '未回应时，年月暂停。选好之后，日子继续往前走。',
  };
}

/* ───────────────────────────── 出生登记卡 ───────────────────────────── */

/**
 * 官方 `.cert` 形状的「山海行籍」登记卡。
 * 字段表格式与官方 `idcard.certFields()` 一致：
 *   [{k: 标签, v: [{t}|{small}|{b}|{nw}|{dots:[0/1…]}]}]
 */
function certPage(run) {
  var birth = run.birth || {};
  var cultivation = run.life && run.life.cultivation;
  var continent = geoName(birth.continent) || {name: '', specialty: ''};
  var era = (engine.WORLD_ERAS && engine.WORLD_ERAS[birth.era]) || {name: '山历'};
  var family = (engine.FAMILIES && engine.FAMILIES[birth.family]) || {name: '普通人家'};
  var path = cultivation && engine.PATHS ? engine.PATHS[cultivation.path] : null;
  var realm = (engine.REALMS[run.player.realm] || {name: '凡身', lifespan: 88});
  /*
   * 预期寿元 —— 读**规则层算好的实际寿元**（`state.life.cultivation.lifespanLimit`），
   * 不再读境界表里的基础数字。
   *
   * ⚠ 为什么：实际寿元按体质、旧伤、境界算（`lifespan12()`），
   *   与境界表那个基础值不是一个数 ⇒ 以前登记卡上写的岁数与实际能活的岁数对不上。
   *   寿元的唯一来源是规则层；呈现层只读，不自己算。
   */
  var lifespanLimit = cultivation && cultivation.lifespanLimit ? cultivation.lifespanLimit : realm.lifespan;
  var rootKnown = !(cultivation && cultivation.rootKnown === false);
  var rootInfo = (engine.ROOTS || {})[run.player.root];
  var grade = rootKnown && rootInfo ? rootInfo.grade : null;

  var fields = [];
  fields.push({k: '性别', v: [{t: run.player.sex === 'F' ? '女' : '男'}]});
  fields.push({k: '出生大陆', v: [{t: continent.name}]});
  fields.push({k: '出生地', v: [{t: birth.address || ''}]});
  fields.push({k: '出身', v: [{t: family.name}]});
  fields.push({k: '灵根', v: rootKnown
    ? [{t: run.player.root + ' '}, {dots: [0, 1, 2, 3].map(function (i) { return grade != null && i <= grade ? 1 : 0; })}]
    : [{t: '尚未测定'}]});
  fields.push({k: '道路', v: [{t: path ? path.name + ' · ' + (cultivation.rank || '') : realm.name}]});
  fields.push({k: '起始境界', v: [{t: realm.name}]});
  fields.push({k: '山历', v: [{t: String(birth.year)}]});
  fields.push({k: '预期寿元', v: [{t: lifespanLimit + ' 岁'}]});
  /* ⚠ 下一境界的「死线」：不突破到下一境，这一世最多活到那一年。
     ⚠ 出生命盘那一刻还不算「还能活多久」（那是出生就定了的数）⇒ 这里给的是**目标**。 */
  var nextLine = lifespanNext(run);
  if (nextLine) fields.push({k: '下一境死线', v: [{t: nextLine}]});

  var seconds = 12;
  try {
    if (engine.monthSeconds) seconds = engine.monthSeconds(run);
  } catch (error) {
    seconds = 12;
  }

  return {
    name: run.player.name,
    cert: '你在' + continent.name + (birth.address ? '的' + birth.address : '') + '出生，' + family.name + '。'
      + era.name + '年间，这方山海的规矩由' + (path ? path.name : '凡尘') + '撑着。',
    certPace: '活到预期寿元约需 ' + Math.round(lifespanLimit * 12 * seconds) + ' 秒（1 月 ≈ '
      + Math.round(seconds * 100) / 100 + ' 秒）…中途离开也会保存。',
    fields: fields,
    certMapCap: continent.name + ' · ' + (birth.address || ''),
    oddsPre: '此世纪元 · ',
    oddsShare: era.name,
    oddsPost: ' · ' + (continent.specialty || ''),
    regNo: 'No. ' + (birth.era || 'shan') + '-' + birth.year + '-' + String(Math.floor(Math.random() * 9000000) + 1000000),
    continentId: birth.continent,
  };
}

/**
 * 转盘的一帧事实。
 *
 * ⚠ **口径照上游修仙网页端**（`apps/preview/app.js:91,95`）：
 *   大字（`.roller-name`）= **角色名**；
 *   小字（`.roller-meta`）= `大陆 · 住址 · 出身`。
 *   上游中间帧的机制是 `birthFacts(seed + ':轮转:' + turn++)`
 *   ⇒ 每帧换**一整套**出生事实（名字/大陆/住址/出身一起换）。
 *
 * ⚠ `birthFacts` 与 `createRun(seed)` **同源**（引擎里同一份出生逻辑），
 *   所以最后一帧拿到的名字就是这段人生真正的名字。
 */
function factsOf(facts) {
  if (!facts) return {name: '', meta: ''};
  var parts = [];
  if (facts.place && facts.place.name) parts.push(facts.place.name);
  if (facts.address) parts.push(facts.address);
  if (facts.household && facts.household.name) parts.push(facts.household.name);
  return {name: facts.name || '', meta: parts.join(' · ')};
}

/** 中间帧的事实（每一帧换一套）。 */
function rollerFacts(seed, turn) {
  if (!engine.birthFacts) return {name: '', meta: ''};
  return factsOf(engine.birthFacts(seed + ':轮转:' + turn));
}

/** 定格那一帧的事实（= 这段人生真正的出生事实）。 */
function finalFacts(seed) {
  if (!engine.birthFacts) return {name: '', meta: ''};
  return factsOf(engine.birthFacts(seed));
}

/** 当前所在纪元名（登记卡上的一行事实）。 */
function era(run) {
  var birth = run && run.birth;
  if (!birth) return '';
  var info = (engine.WORLD_ERAS && engine.WORLD_ERAS[birth.era]) || null;
  return info ? info.name : '';
}

/** 当前出生地的大陆名。 */
function continentOf(run) {
  var birth = run && run.birth;
  if (!birth) return '';
  var g = geoName(birth.continent);
  return g ? g.name : '';
}

module.exports = {
  SPEEDS: SPEEDS,
  topbar: topbar,
  stats: stats,
  focusName: focusName,
  feedRows: feedRows,
  feedMeta: feedMeta,
  feedGroups: feedGroups,
  decisionCard: decisionCard,
  certPage: certPage,
  rollerFacts: rollerFacts,
  finalFacts: finalFacts,
  era: era,
  continentOf: continentOf,
  ageOf: ageOf,
  startAgeOf: startAgeOf,
  canFocus: canFocus,
  yearOf: yearOf,
};
