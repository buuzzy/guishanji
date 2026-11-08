/**
 * view-model.js — 修仙状态 → 页面数据
 * ============================================================================
 *
 * 这一层只做**搬运与格式化**：把引擎的 state 变成 WXML 能直接用的对象。
 * 它不改状态、不做规则判断、不发请求。
 *
 * 文案口径照 HTML 试玩页（apps/preview/life-panels.js 与 app.js:193），
 * 逐条对齐的地方：
 *   · 决策卡的选项 meta（危险提示 / 灵石 / 欠账 / 物品名）—— **不显示成功率**；
 *   · 不可选时显示「暂时无法这样做：…」；
 *   · 五轴固定：悟性 / 胆识 / 仁心 / 体力 / 心境；
 *   · 公库 = 宗门公库的灵石数（不是玩家自己的）；
 *   · 行囊 = 随身物品的标签。
 */
'use strict';

var engine = require('../runtime/engine.js');

/* 与 HTML 端一致的标签表。 */
var LABELS = {
  progress: '修行', sword: '御剑', array: '阵法', alchemy: '丹术',
  insight: '悟性', courage: '胆识', empathy: '仁心', health: '体力', mind: '心境', constitution: '体魄',
};
/* 五轴的固定顺序（五边形雷达的角序）。
 * ⚠ 2026-11-07 · T4：体力（资源）出雷达、体魄（能力）进雷达 ——
 *   与网页端 apps/preview/life-panels.js 的 abilityRadar() 同一份顺序。 */
var ABILITY_KEYS = ['insight', 'courage', 'empathy', 'mind', 'constitution'];
var SECT_PHASES = {intact: '原山门', camp: '撤离后的临时营地', rebuilt: '重新建立的山门'};
var SECT_ROLES = {core: '守山与护法', leader: '领事与议事', supporter: '已交接管理'};
var PROPERTY_STATUS = {kept: '保有', damaged: '损坏', lost: '已失去'};
/* 人物状态名（照上游 apps/preview/app.js:19 的 statusNames）。 */
var STATUS_NAMES = {alive: '在世', dead: '已逝', captured: '被困', missing: '失踪'};
/* 纪元说明（照上游 apps/preview/app.js:205 的 showWorld 三选一）。 */
var ERA_TEXT = {
  tide: '灵气正在恢复，新药田与遗迹陆续出现，宗门争夺灵泉。',
  ebb: '灵气逐渐减少，修行较慢，宗门对材料和名额的限制更严格。',
  fracture: '大陆之间的界门不稳定，传送与域外探索需要核对路线。',
};
/* 地图图例（照上游 apps/preview/continent-atlas.js:17 的 map-legend）。 */
var MAP_LEGEND = ['◎ 当前大陆', '虚线 · 已知通路', '墨绿 · 已走路线', '× 暂不通行'];

function num(value) {
  var n = Number(value);
  return isFinite(n) ? n : 0;
}

/**
 * 起始年龄。
 * ⚠ **必须用 `??` 不能用 `||`**：上游 `birth.js:19` 写死 `startAge: 0`
 *   （新人生从 0 岁开始），`engine.js:493` 校验 `![0,16].includes(...)`
 *   ⇒ 0 是合法起点；用 `||` 会把 0 当成「没有值」⇒ 一出生就 16 岁。
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

function geographyName(id) {
  var list = engine.GEOGRAPHY || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
  return '';
}

/**
 * 规则12 的那段状态（体质 / 宗门 / 多年安排 …）。
 *
 * ⚠ 只有第 12 版的人生才有 `v12`；第 8 版的旧存档**没有**这个字段
 *   ⇒ 这里统一返回 null，调用方按「没有就退回旧口径」处理。
 */
function v12(run) {
  try {
    if (!run || !run.life || !run.life.cultivation) return null;
    if (run.life.cultivation.rulesVersion !== 12) return null;
    if (!engine.rules12) return null;
    return engine.rules12(run) || null;
  } catch (error) {
    return null;
  }
}

/**
 * 寿元上限。
 *
 * ⚠ 不能直接用 `REALMS[realm].lifespan`：
 *   规则12 的人物有**随机体质与自然寿限**（45–84 岁不等），
 *   寿元要读 `lifespan12(state)`（它内部会按版本分派，
 *   第 8 版的人生仍返回境界基础值）。
 */
function lifespanOf(run) {
  try {
    if (engine.lifespan12) {
      var value = engine.lifespan12(run);
      if (typeof value === 'number' && isFinite(value)) return value;
    }
  } catch (error) {
    /* 落到下面的旧口径 */
  }
  return (engine.REALMS[run.player.realm] || {}).lifespan;
}

/** 当前处境（引擎抛错时退回空串，不让整页挂掉）。 */
function contextOf(run) {
  try {
    return engine.activityContext(run);
  } catch (error) {
    return '';
  }
}

/** 顶栏：名字 / 境界 / 年龄 / 灵石 / 所在。 */
function topbar(run) {
  var cultivation = run.life && run.life.cultivation;
  var realm = engine.REALMS[run.player.realm] || {name: '凡身'};
  var place = cultivation && cultivation.continent ? geographyName(cultivation.continent) : (run.player.home || '');
  return {
    name: run.player.name,
    realm: realm.name,
    age: ageOf(run),
    year: (run.birth ? run.birth.year : 0) + Math.floor(run.month / 12),
    month: run.month,
    stones: Math.floor(num(run.player.stones)),
    place: place,
    context: contextOf(run),
    phase: run.phase,
  };
}

/**
 * 决策卡。字段与 HTML 端逐字一致（apps/preview/app.js 的 showDecision）。
 * ⚠ **不含成功率**（option.chance）—— HTML 端也不给玩家看。
 * ⚠ 不可选时的说法是「暂时无法这样做：…」；可选时那一行只写代价。
 */
function decision(run) {
  if (!run.pending) return null;
  var node = engine.currentNode(run);
  if (!node) return null;
  var offered = engine.options(run) || [];
  var realm = (engine.REALMS[run.player.realm] || {}).name;
  var region = engine.regionInfo ? engine.regionInfo(run).name : '';
  var stones = Math.round(num(run.player.stones));
  return {
    id: run.pending.id,
    month: run.pending.month,
    head: ageOf(run) + '岁 · 这一刻由你决定',
    fact: region + ' · ' + realm + ' · ' + stones + ' 灵石',
    title: node.title,
    body: engine.nodeText(node, run),
    choices: offered.map(function (option, index) {
      var cost = option.cost || {};
      var meta = '';
      if (option.enabled) {
        /* 与 HTML 端完全同一串拼接顺序。 */
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
      return {
        id: option.id,
        k: String(index + 1).padStart(2, '0'),
        label: option.label,
        hint: option.hint,
        meta: meta,
        enabled: !!option.enabled,
        lethal: !!option.lethal,
      };
    }),
    note: '未回应时，年月暂停。选好之后，日子继续往前走。',
  };
}

/** 身份卡：山海行籍。 */
function identity(run) {
  var cultivation = run.life && run.life.cultivation;
  var family = (engine.FAMILIES && engine.FAMILIES[run.birth.family]) || {name: '普通人家'};
  var era = (engine.WORLD_ERAS && engine.WORLD_ERAS[run.birth.era]) || {name: '山历'};
  var path = cultivation && engine.PATHS ? engine.PATHS[cultivation.path] : null;
  var realm = engine.REALMS[run.player.realm] || {name: '凡身'};
  var roots = engine.ROOTS || {};
  var rootInfo = roots[run.player.root];
  var grade = cultivation && cultivation.rootKnown && rootInfo ? rootInfo.grade : null;
  return {
    era: era.name,
    age: ageOf(run),
    name: run.player.name,
    family: family.name,
    birthplace: (geographyName(run.birth.continent) ? geographyName(run.birth.continent) + ' · ' : '') + (run.birth.address || ''),
    path: path ? path.name + ' · ' + (cultivation.rank || '') : realm.name,
    root: run.player.root,
    rootGrade: grade,
    rootKnown: !(cultivation && cultivation.rootKnown === false),
    mrz: '山历 ' + run.birth.year + ' · ' + run.player.name + ' · ' + realm.name,
    address: run.birth.address || '',
    home: run.player.home || '',
  };
}

/**
 * 身份卡（山海行籍）的数据，形状照官方 `idcard.js` 的 `idFields()`：
 *   {top:[左,右], name, rows:[{k, v:[{t}|{small}|{b}|{dots}]}], mrz:[上,下]}
 *
 * ⚠ **内容照上游修仙网页端**（`apps/preview/life-panels.js` 的 `identity(s)`）：
 *   姓名 / 出身 / 出生地 / 道路 / 灵根 / 山历。
 *   官方那套身份卡是 1in8b 的人物（国家·城乡·家庭），内容不能搬，
 *   只借它的**结构与类名**（`.panel.idcard.p-id` + `.id-top` / `.id-name` /
 *   `.id-dl` / `.id-row` / `.id-dt` / `.id-dd` / `.mrz` / `.qdots`）。
 */
function identityCard(run) {
  var id = identity(run);
  var cultivation = run.life && run.life.cultivation;
  var realm = engine.REALMS[run.player.realm] || {name: '凡身'};
  var rows = [];
  rows.push({k: '出身', v: [{t: id.family}]});
  rows.push({k: '出生地', v: [{t: id.birthplace}]});
  rows.push({k: '道路', v: [{t: id.path}]});
  /* 灵根：四个点表示品级（官方 .qdots 的写法）。 */
  if (id.rootKnown) {
    rows.push({k: '灵根', v: [{t: id.root + ' '}, {dots: [0, 1, 2, 3].map(function (i) {
      return id.rootGrade != null && i <= id.rootGrade ? 1 : 0;
    })}]});
  } else {
    rows.push({k: '灵根', v: [{t: '尚未测定'}]});
  }
  return {
    top: ['山海行籍 · ' + id.era, id.age + ' 岁'],
    name: id.name,
    rows: rows,
    mrz: [id.mrz, id.address + ' / ' + id.home],
  };
}

/**
 * 雷达图下方那一句（2026-11-05 第五轮）。
 *
 * 上游原文是固定的一句（`life-panels.js:28`）：
 *   「仁心反映待人倾向；身体与心境会因伤病、遭遇改变。」
 * ⇒ 五个轴只解释了「仁心」，另外四个没有半个字（用户 2026-11-05 反馈）。
 *
 * 现在的写法：**先说当前最强与最弱的是哪两个轴**，再解释那几句会变的意思。
 *   · 前半句是本轮新增（用户已在示意稿上点头）；
 *   · 后半句沿用上游的说法，只是把轴名换成页面上的同一个词。
 *
 * ⚠ 2026-11-07 · T4：五轴换过（体力出去、体魄进来）⇒ 这句也跟着一改：
 *   「体力与心境会因伤病、遭遇改变」里的「体力」已经不是轴了
 *   （体力是资源，在顶部状态条里；体魄是能力，只增不减）⇒ 改成说体魄与心境。
 *
 * @param {Array} abilities [{key, label, value}]
 * @returns {string}
 */
function radarHint(abilities) {
  var list = (abilities || []).slice().sort(function (a, b) {
    return b.value - a.value;
  });
  var hi = list[0];
  var lo = list[list.length - 1];
  var head = '';
  if (hi && lo) {
    head = '当前最强：' + hi.label + ' ' + hi.value.toFixed(1)
      + '；最弱：' + lo.label + ' ' + lo.value.toFixed(1) + '。';
  }
  return head + '五根轴都是修出来的本事；'
    + LABELS.constitution + '是筋骨，只增不减；'
    + LABELS.mind + '会因伤病、遭遇改变。'
    + LABELS.health + '不在图上，它在页面顶部的状态条里。';
}

/** 修行本事：境界积累 + 三技艺 + 五轴 + 心法 + 高阶材料。 */
function practice(run) {
  var cultivation = run.life && run.life.cultivation;
  if (!cultivation) return null;
  var rules = v12(run);
  /**
   * 积累门槛 —— **只从规则层读**（`engine.progressNeeded`）。
   * ⚠ 以前这里写死 `[80,260,220,320]`，网页端也写死了一份 ⇒ 两处各写一份，
   *   规则层一改，界面就说谎（用户 2026-11-07 撞到的「进度条满了却几十年
   *   不给突破提示」就是这么来的：规则层按 60 算、界面层按 260 画条）。
   * ⇒ 现在两端都问规则层同一个函数，门槛只有一份。
   *   旧规则版本（5–11）仍按旧数组走（旧档一个字都不动）。
   */
  var threshold = rules && engine.progressNeeded
    ? engine.progressNeeded(run.player.realm + 1)
    : [80, 140, 220, 320][run.player.realm];
  var pct = threshold ? Math.min(100, (num(cultivation.progress) / threshold) * 100) : 100;
  var skills = [];
  var skillsMap = engine.SKILLS || {};
  Object.keys(run.player.skills || {}).forEach(function (key) {
    var value = num(run.player.skills[key]);
    skills.push({
      key: key,
      label: skillsMap[key] || LABELS[key] || key,
      value: value,
      /* 上游技能条是「条宽 = 值%」+ 数值保留一位小数 */
      pct: Math.max(0, Math.min(100, value)),
      text: value.toFixed(1),
    });
  });
  var abilities = ABILITY_KEYS.map(function (key) {
    /* 体魄不在 run.player 上（在规则层的 body 里）⇒ 数只能问引擎。 */
    return {key: key, label: LABELS[key], value: key === 'constitution' ? num(engine.constitution12(run)) : num(run.player[key])};
  });
  var network = cultivation.network || null;
  var method = network && network.method ? network.method : null;
  var advancement = [];
  /*
   * 主药清单（金丹 / 元婴两级才有）。
   * ⚠ 金丹 / 元婴两级才有主药清单。
   */
  if (run.player.realm >= 2 && run.player.realm < 4) {
    var slots = engine.materialSlots ? engine.materialSlots(run, run.player.realm + 1) : [];
    advancement = slots.map(function (slot) {
      return {ready: !!slot[0], label: slot[1]};
    });
  }
  /*
   * 「冲关还差」整句 —— **由规则层拼好**（`engine.breakthroughStatus`）。
   * ⚠ WXML 的 `{{}}` 不支持字符串拼接 ⇒ 整句必须在这里拼好再绑定。
   *   两端显示的是同一句（网页端读同一个函数）。
   */
  var advance = '';
  if (rules && engine.breakthroughStatus) {
    try {
      var status = engine.breakthroughStatus(run);
      advance = status && status.advice ? status.advice : '';
    } catch (error) {
      advance = '';
    }
  }
  /* 上游 methodPanel（life-panels.js:40-43）：差事与试任备注。 */
  var methodRole = network && network.role ? '宗门差事：' + network.role : '';
  var methodArc = '';
  if (network && network.arc && network.arc.kind) {
    methodArc = network.arc.kind === 'mentor'
      ? '正在丹堂跟炉试任；完成考核前不算正式晋升。'
      : '正在北坡巡阵试任；完成考核前不算正式晋升。';
  }
  /**
   * 副标题：炼气阶段（初 / 中 / 后 / 圆满），不是境界名。
   * ⚠ 只有炼气期才有阶段（上游 `stage12` 只在境界 1 时给值），
   *   其余境界照旧显示境界名。
   */
  var stage = '';
  if (rules && engine.stage12) {
    try {
      stage = engine.stage12(run) || '';
    } catch (error) {
      stage = '';
    }
  }
  /**
   * 体质（规则12）：常人体质 / 先天孱弱 / 筋骨健壮 / 天生神力。
   * ⚠ 体质名来自上游的 BODY_TYPES，**不许自己另写一套**。
   */
  var body = '';
  if (rules && rules.body && engine.BODY_TYPES) {
    var type = engine.BODY_TYPES[rules.body.type];
    if (type) {
      body = type.name + (rules.body.damage ? ' · 经脉受损' : '') + (rules.weak ? ' · 力竭（判定打折，调养可解）' : '');
    }
  }
  /**
   * 体魄（规则12）—— **能力**：只增不减，靠练剑、做工这类出力的事练出来。
   * ⚠ 与「体力」是两回事：体力是资源（会被耗掉，靠调养与丹药回），
   *   体魄是练出来的本事，不会因为一次失败就没了。
   */
  var constitution = null;
  if (rules && rules.body && typeof rules.body.constitution === 'number') {
    constitution = Math.round(rules.body.constitution);
  }
  return {
    realm: stage || (engine.REALMS[run.player.realm] || {}).name,
    body: body,
    constitution: constitution,
    progress: threshold ? Math.round(pct) : 100,
    progressText: threshold ? Math.round(pct) + '%' : '已臻元婴',
    skills: skills,
    abilities: abilities,
    method: method ? {
      name: method.name || method.id,
      detail: method.detail || '',
      months: method.months || 0,
      note: (method.months || 0) < 24 ? '尚在熟悉基础' : '已有稳定周天',
    } : null,
    methodRole: methodRole,
    methodArc: methodArc,
    role: network && network.role ? network.role : '',
    advancement: advancement,
    advance: advance,
    /* 雷达图下方那句（2026-11-05 第五轮：改成**动态句**）。
     *
     * 上游原文（`life-panels.js:28` 的 abilityRadar）是固定的一句：
     *   「仁心反映待人倾向；身体与心境会因伤病、遭遇改变。」
     * ⇒ 五个轴只提了「仁心」，另外四个没有任何说明（用户 2026-11-05 反馈）。
     *
     * 现在的写法：**先说当前最强与最弱是哪两个轴**，再说上游那句的后半段。
     *   · 前半句是本轮新增（用户已在示意稿上确认）；
     *   · 后半句逐字保留上游口径 ⇒ 内容对齐的底线没破。
     * 数值格式与上游一致（一位小数）。 */
    radarHint: radarHint(abilities),
    hint: (engine.REALM_ABILITIES && engine.REALM_ABILITIES[run.player.realm] || '') +
      '寿元上限 ' + (lifespanOf(run) || '—') + ' 岁。' +
      (threshold ? '积累到门槛后，再准备材料与闭关。' : ''),
  };
}

/** 宗门面板（只有正道路、且有宗门时才出现）。 */
function sect(run) {
  var cultivation = run.life && run.life.cultivation;
  if (!cultivation) return null;
  var sectInfo = cultivation.progression && cultivation.progression.sect;
  if (!sectInfo || cultivation.path !== 'orthodox') return null;
  /**
   * 宗门法门（规则12）：「山林剑修，先练护身与御剑」这类**地方风格**。
   * ⚠ 来自上游 `sectProfile(state).style`，一个字都不自己编。
   */
  var style = '';
  var rules = v12(run);
  if (rules && engine.sectProfile) {
    try {
      var profile = engine.sectProfile(run);
      style = profile && profile.style ? profile.style : '';
    } catch (error) {
      style = '';
    }
  }
  return {
    name: sectInfo.name,
    style: style,
    size: sectInfo.size,
    phase: SECT_PHASES[sectInfo.phase] || sectInfo.phase,
    highest: (engine.REALMS[sectInfo.highest] || {}).name,
    role: SECT_ROLES[sectInfo.role] || cultivation.rank,
    treasury: sectInfo.phase === 'intact' ? '由掌事保管' : sectInfo.treasury + ' 枚灵石',
    treasuryValue: num(sectInfo.treasury),
    development: sectInfo.development ? sectInfo.development + ' 项已办妥' : '尚待商议',
    showBar: sectInfo.phase !== 'intact',
    barPercent: Math.min(100, (num(sectInfo.treasury) / 24) * 100),
  };
}

/** 灵石与家产。 */
function wealth(run) {
  var cultivation = run.life && run.life.cultivation;
  var net = engine.income ? engine.income(run) : 0;
  var last = cultivation && cultivation.economy ? cultivation.economy.last : null;
  var properties = [];
  var owned = (run.life && run.life.properties) || {};
  Object.keys(owned).forEach(function (key) {
    var item = owned[key];
    properties.push({
      name: item.name,
      status: item.status,
      statusText: PROPERTY_STATUS[item.status] || item.status,
      place: geographyName(item.continent || run.birth.continent) || '旧住处',
    });
  });
  /* 上游 wealth()（life-panels.js:44-47）：月例与工钱 / 食宿与修行耗材 两行 + 那句说明。 */
  var quote = null;
  if (cultivation && engine.economyQuote) {
    try {
      quote = engine.economyQuote(run);
    } catch (error) {
      quote = null;
    }
  }
  var ledger = [];
  if (quote) {
    ledger.push({k: '月例与工钱 / 年', v: String(quote.gross)});
    ledger.push({k: '食宿与修行耗材 / 年', v: '−' + quote.upkeep});
  }
  /* 上游：「最近一年实收 X，实付 Y（还路费 N）。（耗材不足，修行积累已放缓）。」 */
  var lastText = '';
  if (last) {
    lastText = '最近一年实收 ' + last.gross + '，实付 ' + last.upkeep;
    if (last.repaid) lastText += '，还路费 ' + last.repaid;
    if (last.shortfall) lastText += '；耗材不足，修行积累已放缓';
    lastText += '。';
  }
  return {
    stones: Math.floor(num(run.player.stones)),
    net: net,
    netText: (net > 0 ? '+' : '') + net,
    ledger: ledger,
    ledgerNote: quote && quote.reason ? quote.reason + '。钱不够时靠零工维持生活，会减少修行积累。' : '',
    last: last ? {
      gross: last.gross,
      upkeep: last.upkeep,
      repaid: last.repaid,
      shortfall: last.shortfall,
    } : null,
    lastText: lastText,
    debt: run.flags && run.flags.debt ? num(run.flags.debt) : 0,
    properties: properties,
  };
}

/** 随身行囊。 */
function inventory(run) {
  var items = run.inventory || [];
  /* 上游：行囊下面还有「已建立的援手与承诺」（engine.aid）。 */
  var allies = [];
  if (engine.aid) {
    try {
      allies = engine.aid(run) || [];
    } catch (error) {
      allies = [];
    }
  }
  return {
    count: items.length,
    items: items.map(function (id) {
      return {id: id, name: (engine.ITEMS[id] && engine.ITEMS[id].name) || id};
    }),
    allies: allies,
    alliesLabel: allies.length ? '已建立的援手与承诺' : '',
  };
}

/**
 * 人物与牵挂。
 * ⚠ **四类都照上游**（apps/preview/app.js:110-120 的 personRows）：
 *   家人 / 后代 / 旧相识（network.contacts）/ 同行者（state.people）。
 */
function people(run) {
  var rows = [];
  var cultivation = run.life && run.life.cultivation;
  var knownDeaths = (cultivation && cultivation.knownDeaths) || [];

  /* ① 家人 */
  var family = (run.life && run.life.family && run.life.family.members) || [];
  for (var i = 0; i < family.length; i++) {
    var member = family[i];
    var dead = knownDeaths.indexOf(member.id) >= 0;
    rows.push({
      id: 'family-' + i,
      kind: 'family',
      initial: member.name ? member.name.slice(0, 1) : '·',
      name: member.name,
      role: member.role || '家人',
      note: dead ? '已确认离世' : (run.month < 192 ? '在故乡身边' : '故乡近况以已送达消息为准'),
      dead: dead,
    });
  }

  /* ② 后代 */
  var descendants = (cultivation && cultivation.descendants) || [];
  for (var j = 0; j < descendants.length; j++) {
    var desc = descendants[j];
    if (!desc.known) continue;
    rows.push({
      id: 'desc-' + desc.id,
      kind: 'desc',
      initial: desc.name ? desc.name.slice(0, 1) : '·',
      name: desc.name,
      role: desc.relation || '后辈',
      note: '最近一次家中消息提及',
      dead: false,
    });
  }

  /* ③ 旧相识（宗门的旧人） */
  var contacts = (cultivation && cultivation.network && cultivation.network.contacts) || [];
  for (var c = 0; c < contacts.length; c++) {
    var contact = contacts[c];
    rows.push({
      id: 'contact-' + c,
      kind: 'contact',
      initial: contact.name ? contact.name.slice(0, 1) : '·',
      name: contact.name,
      role: (contact.role ? contact.role + ' · ' : '') + (contact.description || ''),
      note: contact.status || '',
      dead: false,
    });
  }

  /* ④ 同行者（CAST） */
  var peopleMap = run.people || {};
  var unconfirmed = unreadPeople(run);
  Object.keys(peopleMap).forEach(function (id) {
    var person = peopleMap[id];
    if (!person.known) return;
    var unknown = unconfirmed.indexOf(id) >= 0;
    var background = '';
    if (engine.PEOPLE_BACKGROUNDS && engine.PEOPLE_BACKGROUNDS[id]) {
      background = engine.prose ? engine.prose(engine.PEOPLE_BACKGROUNDS[id], run) : engine.PEOPLE_BACKGROUNDS[id];
    }
    var where = '';
    if (engine.regionInfo) {
      try {
        where = engine.regionInfo(run, person.location).name;
      } catch (error) {
        where = '';
      }
    }
    var when = engine.date ? engine.date(run, person.deathMonth == null ? run.month : person.deathMonth) : null;
    var years = startAgeOf(run) + Math.floor(((person.deathMonth == null ? run.month : person.deathMonth) - (person.born || 0)) / 12);
    var note;
    if (unknown) {
      note = '远方近况尚待消息确认';
    } else {
      note = (STATUS_NAMES[person.status] || person.status) + (where ? ' · ' + where : '');
      if (person.status === 'dead') {
        note += when ? ' · 山历' + when.year + '年离世' : '';
      } else {
        note += ' · ' + years + '岁';
      }
    }
    rows.push({
      id: 'person-' + id,
      kind: 'person',
      initial: person.name ? person.name.slice(0, 1) : '·',
      name: person.name,
      role: person.role || '',
      desc: background,
      note: note,
      dead: person.status === 'dead',
      unknown: unknown,
    });
  });
  return rows;
}

/** 还没确认死讯的人（上游：state.life.unreadNews 里提到的那些）。 */
function unreadPeople(run) {
  var list = [];
  var life = run.life || {};
  var news = life.unreadNews || [];
  for (var i = 0; i < news.length; i++) {
    var ids = news[i].people || [];
    for (var j = 0; j < ids.length; j++) {
      if (list.indexOf(ids[j]) < 0) list.push(ids[j]);
    }
  }
  return list;
}

/** 时间线（从新到旧）。 */
function feed(run) {
  var journal = run.journal || [];
  var rows = [];
  for (var i = journal.length - 1; i >= 0; i--) {
    var entry = journal[i];
    rows.push({
      id: entry.id || (entry.month + '-' + i),
      month: entry.month,
      kind: entry.kind || '',
      title: entry.title || '',
      body: entry.body || '',
      automatic: !!entry.automatic,
      location: entry.location || '',
    });
  }
  return rows;
}

/** 大陆地图（点阵地图要用的数据）。 */
function map(run) {
  var cultivation = run.life && run.life.cultivation;
  var current = cultivation ? engine.currentContinent(run) : null;
  var list = engine.GEOGRAPHY || [];
  var era = (engine.WORLD_ERAS && engine.WORLD_ERAS[run.birth.era]) || {name: '山历'};
  return {
    current: current,
    closed: (cultivation && cultivation.closed) || [],
    visited: (cultivation && cultivation.visited) || [],
    routes: (cultivation && cultivation.routes) || [],
    /* 上游 showWorld（app.js:203-208）：纪元名 + 纪元说明。 */
    era: era.name,
    eraText: ERA_TEXT[run.birth.era] || '',
    legend: MAP_LEGEND,
    continents: list.map(function (g) {
      return {
        id: g.id,
        name: g.name,
        description: g.description || '',
        specialty: g.specialty || '',
        spots: (g.places || []).join(' · '),
        current: g.id === current,
        visited: (cultivation && cultivation.visited || []).indexOf(g.id) >= 0,
        birthplace: run.birth.continent === g.id,
        connections: g.connections || [],
        places: g.places || [],
      };
    }),
  };
}

/**
 * 重心选项的释义（照 HTML 端 life-panels.js 的 activityMeaning）。
 * ⚠ 这里**自己实现**而不是从 HTML 端引入：那个文件会拖进 190 KB 的像素资源，
 *   而这一行文字根本用不到画面。
 */
function activityMeaning(activity) {
  if (!activity) return '';
  var parts = [];
  if (activity.trainSkill !== false && engine.SKILLS && engine.SKILLS[activity.skill]) {
    parts.push(engine.SKILLS[activity.skill]);
  }
  ABILITY_KEYS.forEach(function (key) {
    if (activity[key]) parts.push(LABELS[key]);
  });
  if (activity.income) parts.push('工钱');
  return parts.filter(Boolean).join('、') + ' · 修行积累';
}

/** 重心可选项（activities）。
 *  ⚠ 用引擎的 `activityOptions(run)`（带 enabled / reason），
 *    不用静态表 ACTIVITIES —— 静态表不知道「现在能不能选」。
 */
function activities(run) {
  var list = engine.activityOptions ? engine.activityOptions(run) : [];
  var current = run.life && run.life.cultivation ? run.life.cultivation.activity : '';
  return list.map(function (item) {
    var meaning = activityMeaning(item);
    return {
      id: item.id,
      name: item.name,
      description: item.description || '',
      meaning: meaning,
      enabled: !!item.enabled,
      reason: item.reason || '',
      current: id2current(item.id, current),
      /* ⚠ 上游 showFocus 那一行有「说明 · 影响：… · 不可选的理由」三段；
       *   官方 `.dec .ch button` 的标记列右边只放得下两行 ⇒ 合成一行（见 places()）。 */
      line: [
        item.description || '',
        meaning ? ('影响：' + meaning) : '',
        item.reason || '',
      ].filter(Boolean).join(' · '),
    };
  });
}

function id2current(id, current) {
  return id === current;
}

/** 可去的地方（travelTo 的候选）。
 *  ⚠ 上游字段是 `reason`（单数），不是 `reasons`。
 */
function places(run) {
  var routes = engine.routeOptions ? engine.routeOptions(run) : [];
  var current = engine.currentContinent ? engine.currentContinent(run) : '';
  return routes.map(function (route) {
    return {
      id: route.id,
      name: route.name,
      description: route.description || '',
      specialty: route.specialty || '',
      spots: (route.places || []).join(' · '),
      enabled: !!route.enabled,
      reason: route.reason || '',
      fee: route.fee,
      months: route.months,
      current: route.id === current,
      /* ⚠ 整句在 JS 侧拼好 —— WXML 的 `{{}}` **不支持字符串拼接**
       *   （`+` 是算术，字符串相加会得到 NaN）。
       *   官方网页端也是这么做的：`前往 · N 灵石 · M 月`（showWorld）。
       * ⚠ 上游 showWorld 每张卡片有五段：名称 / 描述 / 地点列表 / 特色 / 按钮文案。
       *   官方 `.dec .ch button` 是**两列网格**（标记列 + 内容列）⇒ 标记右边
       *   只放得下**两行** ⇒ 内容必须并成一行（`line`），
       *   否则多出来的子元素会掉进 1.6em 的标记列被压成竖排（见 A4）。 */
      line: [
        route.description || '',
        (route.places || []).join(' · '),
        route.specialty || '',
        route.enabled ? ('前往 · ' + route.fee + ' 灵石 · ' + route.months + ' 月') : (route.reason || ''),
      ].filter(Boolean).join(' '),
      sub: route.enabled
        ? '前往 · ' + route.fee + ' 灵石 · ' + route.months + ' 月'
        : (route.reason || ''),
    };
  });
}

/** 修炼场（seekTraining 的候选）。 */
function grounds(run) {
  var list = engine.trainingOptions ? engine.trainingOptions(run) : [];
  return list.map(function (ground) {
    var low = (engine.REALMS[ground.realm] || {}).name || '';
    var high = ground.maxRealm !== ground.realm ? (engine.REALMS[ground.maxRealm] || {}).name : '';
    return {
      id: ground.id,
      name: ground.name,
      realm: high ? low + '至' + high : low,
      enabled: !!ground.enabled,
      reasons: (ground.reasons || []).join('；'),
      /* ⚠ 整句在 JS 侧拼好（WXML 不支持字符串拼接，见 places() 的说明）。 */
      sub: ground.enabled
        ? '任务与接应已核实，可以决定是否出发'
        : ((ground.reasons || []).join('；')),
    };
  });
}

/**
 * 五轴（悟性 / 胆识 / 仁心 / 心境 / **体魄**）的**快照**。
 * ⚠ 每次都造一个**新对象**：
 *   引擎是就地改 `run.player` 的 ⇒ 直接把 `run.player` 塞给组件，
 *   引用一直没变 ⇒ 小程序的数据监听可能不触发 ⇒ 雷达图不刷新。
 *   造一个新对象，引用必变 ⇒ 组件一定收到通知。
 *
 * ⚠ 2026-11-07 · T4：五轴里**没有体力**了 —— 体力是资源，在页面顶部的状态条里；
 *   这里放的是体魄（练出来的筋骨，只增不减）。数从引擎取（`constitution12`），
 *   旧档没有这个数时是 0（引擎自己兜底）。
 */
function axes(run) {
  return {
    insight: num(run.player.insight),
    courage: num(run.player.courage),
    empathy: num(run.player.empathy),
    mind: num(run.player.mind),
    constitution: num(engine.constitution12(run)),
  };
}

/** 终局回顾。⚠ 引擎的 review() 内部会先 validateRun，
 *  状态万一不合法它会抛错 ⇒ 这里**不能让整个视图挂掉**（页面会白屏）。 */
function reviewOf(run) {
  if (!engine.review) return null;
  try {
    return engine.review(run);
  } catch (error) {
    return null;
  }
}

/**
 * 当前处境（照上游 `apps/preview/app.js:104-109` 的 passageMarkup）。
 * · label  —— activityLabel(state)：此刻在做什么
 * · journey —— 长行动（闭关等）的进度条与时长
 * · exam    —— 本届考核截止提示
 *
 * ⚠ 2026-11-05（用户拍板，第五轮）：**删掉了上游那行状态文字**
 *   （「日子正在过去 / 人生已暂停」）。它原本在「当前处境」和「今年的重心」
 *   两张卡里各出现一次，纯冗余；暂停状态由顶栏的暂停键表达。
 *   ⇒ 这是本轮**三处偏离上游内容对齐的例外之一**（见实现文档 §13）。
 */
function passage(run) {
  var cultivation = run.life && run.life.cultivation;
  var label = '';
  try {
    label = engine.activityLabel ? engine.activityLabel(run) : '';
  } catch (error) {
    label = '';
  }
  var action = null;
  try {
    action = engine.longAction ? engine.longAction(run) : null;
  } catch (error) {
    action = null;
  }
  /**
   * 规则12 的多年安排（闭关 / 历练 / 做工筹料）。
   * ⚠ 它**不走** `state.journey`，而是记在 `v12.action` 里
   *   （起止月、类型、阶段记录）⇒ 进度条得从这里取，
   *   否则长行动期间「当前处境」那栏是空的（上游接入手册第 4 条）。
   */
  var rules = v12(run);
  var actionLabel = '';
  if (!action && rules && rules.action) {
    action = {from: rules.action.from, to: rules.action.to};
    actionLabel = rules.action.kind === 'retreat' ? '闭关'
      : rules.action.kind === 'travel' ? '历练'
      : rules.action.kind === 'work' ? '做工筹料' : '';
  }
  var journey = null;
  if (action) {
    var total = Math.max(1, action.to - action.from);
    journey = {
      progress: Math.max(0, Math.min(100, Math.round(((run.month - action.from) / total) * 100))),
      elapsed: engine.duration ? engine.duration(run.month - action.from) : '',
      total: engine.duration ? engine.duration(action.to - action.from) : '',
    };
  }
  var examText = '';
  var exam = cultivation && cultivation.exam;
  if (exam && exam.deadline != null && engine.date) {
    var d = engine.date(run, exam.deadline);
    examText = '本届考核：山历 ' + d.year + ' 年 ' + d.month + ' 月截止报名与准备';
  }
  return {
    label: label,
    actionLabel: actionLabel,
    journey: journey,
    exam: examText,
    pending: !!run.pending,
  };
}

/**
 * 修行有成公告（照上游 `app.js:148-152`）：
 * 最近 12 个月里最后一条 `kind === 'breakthrough'` 的日志。
 */
function breakthrough(run) {
  var journal = run.journal || [];
  for (var i = journal.length - 1; i >= 0; i--) {
    var entry = journal[i];
    if (entry.kind !== 'breakthrough') continue;
    if (run.month - entry.month >= 12) return null;
    return {title: entry.title || '', body: entry.body || ''};
  }
  return null;
}

/**
 * 状态面板（官方 `.p-stats` 的壳 + 上游 `sidebarMarkup()`「这一生的你」的内容）。
 * · bars —— 五维 0–100 条（悟性/胆识/仁心/体力/心境）
 * · rows —— 境界 / 灵石 / 每年净结余 / 未还路费 / 仁心 / 世界
 */
function statusPanel(run) {
  var realm = engine.REALMS[run.player.realm] || {name: '凡身', lifespan: '—'};
  var era = (engine.WORLD_ERAS && engine.WORLD_ERAS[run.birth.era]) || {name: '山历'};
  var net = engine.income ? engine.income(run) : 0;
  var rate = 1;
  try {
    rate = engine.practiceRate ? engine.practiceRate(run) : 1;
  } catch (error) {
    rate = 1;
  }
  var bars = ABILITY_KEYS.map(function (key) {
    var value = num(run.player[key]);
    return {
      k: key,
      n: LABELS[key],
      v: Math.round(value),
      bar: Math.max(0, Math.min(100, value)),
      c: 'var(--stamp)',
    };
  });
  var rows = [];
  rows.push({k: '境界', v: realm.name});
  rows.push({k: '灵石', v: String(Math.round(num(run.player.stones)))});
  rows.push({k: '每年净结余', v: (net > 0 ? '+' : '') + net + ' 灵石'});
  if (run.flags && run.flags.debt) rows.push({k: '未还路费', v: String(num(run.flags.debt))});
  rows.push({k: '仁心', v: String(Math.round(num(run.player.empathy)))});
  rows.push({k: '世界', v: era.name});
  var note = ageOf(run) < 16
    ? '幼年先经历成长与启蒙；十六岁后才开始修行与日常结余。'
    : '每年净结余 +' + net + ' 灵石，先还路费欠账。当前灵脉的修行倍率 ' + rate + '×。';
  return {bars: bars, rows: rows, note: note};
}

/**
 * 授业与记录（照上游 `apps/preview/app.js:213-217` 的 lifeDetails）。
 */
function details(run) {
  var cultivation = run.life && run.life.cultivation;
  if (!cultivation) return null;
  var path = engine.PATHS ? engine.PATHS[cultivation.path] : null;
  var realm = engine.REALMS[run.player.realm] || {name: '凡身'};
  var rootInfo = (engine.ROOTS || {})[run.player.root];
  var rootText = cultivation.rootKnown === false
    ? '灵根尚未正式测定。'
    : (rootInfo && rootInfo.description ? rootInfo.description : '');
  var net = engine.income ? engine.income(run) : 0;
  var rows = [];
  rows.push({k: '境界', v: realm.name});
  rows.push({k: '灵石', v: String(Math.round(num(run.player.stones)))});
  rows.push({k: '每年净结余', v: (net > 0 ? '+' : '') + net});
  var punishment = '';
  if (cultivation.punishmentUntil && run.month < cultivation.punishmentUntil) {
    punishment = '处分尚余 ' + (engine.duration ? engine.duration(cultivation.punishmentUntil - run.month) : '');
  }
  var officers = [];
  if (cultivation.path === 'orthodox' && cultivation.officers) {
    for (var i = 0; i < cultivation.officers.length; i++) {
      var officer = cultivation.officers[i];
      officers.push({
        name: officer.name,
        role: officer.role,
        desc: officer.description || '',
      });
    }
  }
  return {
    title: '授业与记录',
    path: path ? path.name + ' · ' + (cultivation.rank || '') : realm.name,
    rootText: rootText,
    abilityText: realm.name + ' · ' + ((engine.REALM_ABILITIES && engine.REALM_ABILITIES[run.player.realm]) || ''),
    rows: rows,
    punishment: punishment,
    officers: officers,
  };
}

/**
 * 终局回顾（照上游 `apps/preview/app.js:232-237` 的 renderEnding）。
 * · 不做：反馈表单、导出文件、分享（官方人生专属 / 本轮不做）。
 */
function ending(run) {
  var review = reviewOf(run);
  if (!review) return null;
  var end = run.ending || {};
  var metrics = [
    {v: review.age + '岁', k: '本页最后记录'},
    {v: review.realm, k: '这一生的境界'},
    {v: review.decisions + '次', k: '改变人生的抉择'},
    {v: review.survivors + '人', k: '当前同行与已安置者'},
  ];
  var visited = [];
  if (engine.regionInfo) {
    for (var i = 0; i < (review.visited || []).length; i++) {
      try {
        visited.push(engine.regionInfo(run, review.visited[i]).name);
      } catch (error) {
        /* 取不到就跳过这一处。 */
      }
    }
  }
  return {
    title: end.title || '',
    final: end.final || '',
    text: end.text || '',
    metrics: metrics,
    visited: visited.join(' → '),
    consequences: endingConsequences(run, review),
  };
}

/**
 * 终局那一段总结（照上游 `apps/preview/app.js:227-230` 的 endingConsequences）。
 */
function endingConsequences(run, review) {
  var parts = [];
  var peopleMap = run.people || {};
  var master = peopleMap.master;
  var friend = peopleMap.friend;
  if (master && master.known) {
    if (master.status === 'dead') {
      parts.push('闻竹已逝，她的名字与最后一课留在这一生里。');
    } else if (master.status === 'captured') {
      parts.push('闻竹仍被困在旧山门，终章没有抹掉这段遗憾。');
    } else {
      parts.push('闻竹仍在世，现居' + personPlace(run, master.location) + '。');
    }
  }
  if (friend && friend.known) {
    if (friend.status === 'alive') {
      parts.push('沈砚仍在世，现居' + personPlace(run, friend.location) + '。');
    } else {
      parts.push('沈砚仍留在未归者的名单里。');
    }
  }
  if (run.flags && run.flags.relocated) {
    parts.push('在世的师门中人迁到了异乡。');
  } else if (run.flags && run.flags.rebuilt) {
    parts.push('旧山门已经重建。');
  }
  var arcs = (run.life && run.life.expeditions) || [];
  if (arcs.length) {
    var returned = 0;
    var interrupted = 0;
    for (var i = 0; i < arcs.length; i++) {
      if (arcs[i].status === 'returned') returned++;
      if (arcs[i].status === 'interrupted') interrupted++;
    }
    parts.push('此生有' + returned + '次探险返回，' + interrupted + '次因急事中断。');
  }
  parts.push('共有' + (review.automatic || 0) + '段自动发生的经历与' + (review.failures || 0) +
    '次未达预期的冒险，获得、失去与未完成的事都留在记录里。');
  return parts.join('');
}

function personPlace(run, location) {
  if (!engine.regionInfo) return '';
  try {
    return engine.regionInfo(run, location).name;
  } catch (error) {
    return '';
  }
}

/** 全部视图数据。 */
function build(run) {
  if (!run) return null;
  return {
    topbar: topbar(run),
    decision: decision(run),
    identity: identity(run),
    axes: axes(run),
    practice: practice(run),
    sect: sect(run),
    wealth: wealth(run),
    inventory: inventory(run),
    people: people(run),
    feed: feed(run),
    map: map(run),
    identityCard: identityCard(run),
    activities: activities(run),
    places: places(run),
    grounds: grounds(run),
    passage: passage(run),
    breakthrough: breakthrough(run),
    statusPanel: statusPanel(run),
    details: details(run),
    ending: ending(run),
    pending: !!run.pending,
    waiting: !!run.waiting,
    ended: run.phase === 'ended',
    ending0: run.ending || null,
    review: reviewOf(run),
  };
}

module.exports = {
  build: build,
  decision: decision,
  feed: feed,
  people: people,
  map: map,
  activities: activities,
  places: places,
  grounds: grounds,
  topbar: topbar,
  identity: identity,
  identityCard: identityCard,
  practice: practice,
  sect: sect,
  wealth: wealth,
  inventory: inventory,
  passage: passage,
  breakthrough: breakthrough,
  statusPanel: statusPanel,
  details: details,
  ending: ending,
  LABELS: LABELS,
  ABILITY_KEYS: ABILITY_KEYS,
  STATUS_NAMES: STATUS_NAMES,
};
