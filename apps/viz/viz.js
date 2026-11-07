/**
 * viz.js —— 开发者面板的主控
 * ============================================================================
 *
 * ## 它是什么
 * ----------
 * 一个**给我们自己用**的观察台：把归山记的规则跑起来，
 * 然后把这一辈子摊开看 ——
 *   ① 人生进程（`axis.js` + `curve.js`）：时间线、抉择点、经历、突破，
 *      以及**五维属性 / 修行进度 / 灵石**随年龄变化的曲线
 *   ② 决策框（`decision.js`）：一张卡的全部选项、代价、把握、以及为什么点不了
 *   ③ 当前状态（`snapshot.js`）：身份、五维、修为、身家、人物
 *   ④ 世界结构（`map.js`）：四块大陆、哪条路封了、这条命走过哪儿
 *
 * ## ⚠ 它**不改规则**
 * ----------------
 * 面板调用的是 `packages/adventure/engine.js` 的 `createRun` / `options` /
 * `choose` / `advance` —— 和游戏本体**同一份代码**。
 * 选哪个选项的偏好用 `scripts/lib/decide-policy.js`（各审计脚本也在用同一份）。
 * ⇒ 面板跑出来的命，和门禁审计的命，是同一批数据。
 *
 * ## 布局上的一处讲究
 * ------------------
 * 人生进程轴与三张属性曲线**放进同一个横向滚动容器**，
 * 且共用同一把横轴尺子（`axisX`）⇒ 上下严格对齐：
 * 「31 岁突破筑基」与「31 岁体力掉到 40」能一眼对上。
 *
 * ## 给门禁留的接口
 * ----------------
 * `window.vizPanel` 暴露内部状态 ⇒ 浏览器门禁能直接比对
 * 「面板显示的」与「引擎当场说的」，而不是截图比像素。
 */

import { createRun, choose, advance, options, currentNode, nodeText, review } from '../../packages/adventure/engine.js';
import { REALMS } from '../../content/adventure.js';
import { decide } from '../../scripts/lib/decide-policy.js';
import { buildAxis, buildPending, buildMap, buildCurve, buildSnapshot, attachResults, ageAt, sampleCurve, presentOption, buildItems, buildWorld, buildPeople, buildJournal, buildComparison, buildStageCoverage, buildProgress, buildFindings, buildBatchSnapshot, diffBatchSnapshots } from './model.js';
import { renderAxis } from './axis.js';
import { renderCurves } from './curve.js';
import { renderDecision } from './decision.js';
import { renderSnapshot } from './snapshot.js';
import { renderMap, renderMapTab } from './map.js';
import { renderTabs, TABS } from './tabs.js';
import { renderItems } from './items.js';
import { renderWorld } from './world.js';
import { renderPeople } from './people.js';
import { renderJournal } from './journal.js';
import { readHistory, writeSnapshot, summarizeHistory } from './history.js';
import { runBatch, makeRng } from './batch.js';
import { buildCoverage } from './model.js';

const viz = {
  state: null,
  /** 面板记下的每一步（引擎的 decisions 才是权威，这一份带标题与当时的选项）。 */
  steps: [],
  /** 按月拍下的属性快照（引擎不保留属性的历史 ⇒ 面板自己拍）。 */
  curve: [],
  /** 按月 diff 出来的行囊变化（引擎只在日志里留「得到XX」字样，没有结构化字段）。 */
  itemTimeline: [],
  /** 当前看的是哪一步（null = 看眼下这张待决的卡）。 */
  selected: null,
  /** 当前在哪个页签（检视层）。 */
  tab: 'state',
  /** 批量实测的结果（跑一批命出来的覆盖度）。 */
  batch: null,
  /** 内容覆盖（按规则版本分桶）—— 由那批命本身重算。 */
  coverage: null,
  /** 两种玩法的并排比（固定偏好 vs 随机探索）—— 跑批的价值在差异，不在平均。 */
  compare: null,
  /** 「按阶段 / 境界」的内容覆盖 —— 这段人生有没有内容可看。 */
  stageCoverage: null,
  /** 另一种玩法的阶段覆盖（只有「两种都跑」时才有）。 */
  stageCoverageAlt: null,
  /** 角色进度：这批命怎么往上走（谁卡在哪一境、每境待了多久）。 */
  progress: null,
  /** 问题清单：跑完批，一眼看到有哪几类问题。 */
  findings: null,
  /** 与上一次跑批比：改完内容再跑，看变化（存浏览器本地，换台机器就没了）。 */
  history: null,
  /** 上一次批量跑的是「固定偏好」还是「随机探索」（或「both」= 两种都跑过）。 */
  batchMode: 'policy',
  /** 自动播放：人一个决定都不用做，让系统自己走这条命。 */
  auto: { on: false, mode: 'policy', timer: null, rng: null },
  policy: { path: 'orthodox', conduct: 'care', school: 'array' },
};

const dom = id => document.getElementById(id);

/* ── 跑一条命 ─────────────────────────────────────────────────────────── */

/** 拍一张属性快照。 */
function sample() {
  if (!viz.state) return;
  viz.curve.push(sampleCurve(viz.state));
  /* 顺带拍一张**行囊快照** ⇒ 事后 diff 就知道「哪件道具、哪个月进的行囊」。
     ⚠ 引擎只在日志的 changes 里留「得到凝丹真解」这类**文字**，
        没有结构化的「哪件道具、哪个月」字段 ⇒ 这一条只能靠采样还原。
     ⚠ 这是**采样**（把状态读下来），不是自己算规则。 */
  viz.itemTimeline.push({
    month: viz.state.month,
    age: ageAt(viz.state, viz.state.month),
    items: [...(viz.state.inventory || [])],
  });
}

/** 推进到下一张等着你点的卡（中间那些自动发生的年月直接跑完）。 */
function advanceToPending() {
  const state = viz.state;
  let guard = 0;
  while (state.phase === 'life' && !state.pending && guard++ < 20000) {
    if (!advance(state, 1)) break;
    sample();
  }
  /* ⚠ 最后再拍一张 ⇒ 曲线的**末端采样**永远等于当前状态
     （门禁 `assertCurveMatchesState` 就靠这一条）。 */
  sample();
}

/** 选一个选项，走一步。 */
function pick(id, { auto = false } = {}) {
  const state = viz.state;
  if (!state?.pending) return false;
  const node = currentNode(state);
  const offered = options(state);
  const step = {
    month: state.month,
    age: ageAt(state, state.month),
    event: node.id,
    title: node.title,
    text: nodeText(node, state),
    offered: offered.map(presentOption),
    picked: id,
  };
  let result = null;
  try {
    result = choose(state, id);
  } catch (error) {
    step.error = error.message;
  }
  step.result = {
    success: result?.success ?? null,
    body: result?.body ?? '',
    months: result?.months ?? 0,
  };
  viz.steps.push(step);
  sample();
  /* ⚠ 自动模式**不**一口气跑到下一张卡 —— 那样轴会「唰」地长完，看不出过程。
   *   自动模式一次只挪一点（下面的 `autoTick` 负责推进）。 */
  if (!auto) advanceToPending();
  return true;
}

/** 用偏好策略把剩下的路走完。 */
function runAll() {
  let guard = 0;
  while (viz.state?.phase === 'life' && viz.state.pending && guard++ < 600) {
    const option = decide(viz.state, viz.policy);
    if (!option) break;
    pick(option.id);
  }
}

/** 从头开始一条新命。 */
function boot() {
  stopAuto();
  const seed = dom('seed').value.trim() || '万千道途-0';
  viz.policy = {
    path: dom('path').value,
    conduct: dom('conduct').value,
    school: dom('school').value,
  };
  viz.state = createRun({ seed, rulesVersion: 12 });
  viz.steps = [];
  viz.curve = [];
  viz.selected = null;
  sample();
  advanceToPending();
  render();
}

/* ── 自动播放（让它自己走） ─────────────────────────────────────────────── */

/**
 * 让这条命自己走下去 —— **人一个决定都不用做**。
 *
 * ⚠ 这是「观测台」的看戏模式：轴自己长、曲线自己长，人只负责看。
 *   · 「按偏好」：与批量跑同一份策略（`decide-policy.js`）⇒ 和审计脚本跑的是同一条路；
 *   · 「随机」：在能点的选项里随机挑 ⇒ 能撞出偏好策略永远不走的分支。
 * ⚠ 随机数是**有种子**的（`makeRng`）⇒ 同一颗种子重跑一遍，结果完全一样。
 */
function startAuto() {
  if (viz.auto.on) return;
  viz.auto.on = true;
  viz.auto.rng = makeRng('自动-' + (viz.state?.seed ?? ''));
  const button = dom('auto-play');
  button.textContent = '停下';
  button.classList.add('primary');
  viz.auto.timer = setInterval(autoTick, 60);
  autoTick();
}

function stopAuto() {
  if (!viz.auto.on) return;
  viz.auto.on = false;
  clearInterval(viz.auto.timer);
  viz.auto.timer = null;
  const button = dom('auto-play');
  button.textContent = '让它自己走';
  button.classList.remove('primary');
}

/** 自动走一步：一张待决的卡（自己选），或一年的年月（没人要决定）。 */
function autoTick() {
  const state = viz.state;
  if (!state || state.phase !== 'life') { stopAuto(); render(); return; }
  if (state.pending) {
    const available = options(state).filter(option => option.enabled);
    if (!available.length) { stopAuto(); render(); return; }
    const choice = viz.auto.mode === 'random'
      ? available[Math.floor(viz.auto.rng() * available.length)]
      : (decide(state, viz.policy) || available[0]);
    pick(choice.id, { auto: true });
  } else {
    /* 没有待决的卡 ⇒ 往前挪一年（12 个月），让人看得出生长。 */
    for (let step = 0; step < 12 && viz.state.phase === 'life' && !viz.state.pending; step++) {
      if (!advance(viz.state, 1)) break;
      sample();
    }
  }
  render();
}

/* ── 画 ───────────────────────────────────────────────────────────────── */

/**
 * 画当前页签（检视层）。
 *
 * ⚠ 只画**当前**这一个页签 —— 六个页签全渲染会把首屏拖慢，
 *   而切页签时重画一遍的成本可以忽略。
 *
 * ⚠ `decisionHtml`：「眼下这张卡 / 回看某一步」的内容 ——
 *   它收在「当前状态」页里（以前是右边那个独立的框）。
 */
function renderTab(state, decisionHtml = '') {
  switch (viz.tab) {
    case 'items':
      return renderItems(buildItems(state, viz.itemTimeline));
    case 'map':
      return renderMapTab(buildMap(state));
    case 'world':
      return renderWorld(buildWorld(state));
    case 'people':
      return renderPeople(buildPeople(state));
    case 'journal':
      return renderJournal(buildJournal(state), viz.batch, viz.coverage, viz.compare, viz.stageCoverage, viz.stageCoverageAlt, viz.progress, viz.findings, viz.history);
    case 'state':
    default:
      return renderSnapshot(buildSnapshot(state), decisionHtml);
  }
}

/**
 * 决策区（眼下这张卡 / 回看某一步 / 终章）。
 *
 * ⚠ 自动播放时：显示它**刚刚自己选了什么**（只读）——
 *   人不用点，轴自己长；想手动介入就点「停下」。
 */
function decisionHtml(state) {
  const pending = buildPending(state);
  if (viz.auto.on && viz.steps.length) {
    /* ⚠ 自动播放时：显示它**刚刚自己选了什么**（只读）——
     *   人不用点，轴自己长；想手动介入就点「停下」。 */
    const step = viz.steps[viz.steps.length - 1];
    return renderDecision({
      event: step.event, title: step.title, text: step.text, age: step.age, month: step.month,
      offered: step.offered, picked: step.picked, result: step.result,
    }, { mode: 'step', auto: true });
  }
  if (viz.selected !== null && viz.steps[viz.selected]) {
    const step = viz.steps[viz.selected];
    return renderDecision({
      event: step.event, title: step.title, text: step.text, age: step.age, month: step.month,
      offered: step.offered, picked: step.picked, result: step.result,
    }, { mode: 'step' });
  }
  if (pending) return renderDecision(pending, { mode: 'pending' });
  const ending = state.ending || { title: '已终章', text: '这一条命走到了尽头。' };
  /* 终章那栏太空 ⇒ 补上这条命的几个关键数字（全部来自引擎）。 */
  const summary = review(state);
  const stats = [
    { label: '享年', value: summary.age + ' 岁' },
    { label: '抉择', value: summary.decisions + ' 次' },
    { label: '没成的', value: summary.failures + ' 次' },
    { label: '境界', value: summary.realm },
    { label: '同行者', value: summary.survivors + ' 人' },
    { label: '遇见过的人', value: summary.people.length + ' 位' },
  ];
  return renderDecision({ ...ending, stats }, { mode: 'ended' });
}

function renderStatus() {
  const state = viz.state;
  if (!state) return;
  const name = state.player?.name ?? '—';
  const realm = state.player?.realm ?? 0;
  /* ⚠ realm 是**境界序号**（0 凡身 / 1 炼气 / 2 筑基 / 3 金丹 / 4 元婴），
     不是「炼气第几阶」⇒ 早先写 `炼气${realm}阶` ⇒ 跑到元婴仍显示「炼气4阶」。 */
  const realmName = REALMS[realm]?.name ?? '—';
  const ending = state.ending ? state.ending.title : (state.phase === 'ended' ? '已终章' : '进行中');
  dom('status').innerHTML = `<b>${name}</b> · ${viz.policy.path} · ${realmName} · ${ageAt(state, state.month)} 岁 · ${state.decisions.length} 次抉择 · ${state.journal.length} 条经历 · ${ending}`;
}

function render() {
  const state = viz.state;
  if (!state) return;
  attachResults(state, viz.steps);
  const model = buildAxis(state, viz.steps);
  const curve = buildCurve(viz.curve);

  /* 轴与三张曲线在同一个滚动容器里 ⇒ 横轴严格对齐。 */
  dom('track').innerHTML = renderAxis(model) + renderCurves(curve);
  dom('tabs').innerHTML = renderTabs(viz.tab);
  /* ⚠ 决策区现在收在「当前状态」页里（不再是右边那个框）⇒
   *   先把它算出来，再交给页签渲染。 */
  dom('tabpanel').innerHTML = renderTab(state, decisionHtml(state));

  renderStatus();
  window.vizPanel = {
    seed: state.seed,
    state,
    steps: viz.steps,
    model,
    curve,
    snapshot: buildSnapshot(state),
    pending: buildPending(state),
    map: buildMap(state),
    /* 新页签的数据 —— 门禁逐条拿它们与引擎/内容源比对。 */
    items: buildItems(state, viz.itemTimeline),
    /** 行囊的按月采样 —— 门禁要拿它独立重推一遍「谁进过行囊」，跟页面上的记录逐条比。 */
    itemTimeline: viz.itemTimeline,
    world: buildWorld(state),
    people: buildPeople(state),
    journal: buildJournal(state),
    batch: viz.batch,
    /** 上一次批量跑的是「固定偏好」还是「随机探索」。 */
    batchMode: viz.batchMode,
    /** 内容覆盖（按规则版本分桶）—— 门禁要拿它跟那批命独立重算的结果逐条比。 */
    coverage: viz.coverage,
    /** 两种玩法的并排比 —— 门禁要拿它跟那两批命独立重算的结果逐条比。 */
    compare: viz.compare,
    /** 「按阶段 / 境界」的内容覆盖 —— 门禁要拿它跟那批命独立重算的结果逐条比。 */
    stageCoverage: viz.stageCoverage,
    /** 另一种玩法的阶段覆盖（只有「两种都跑」时才有）。 */
    stageCoverageAlt: viz.stageCoverageAlt,
    /** 角色进度 —— 门禁要拿它跟那批命独立重算的结果逐条比。 */
    progress: viz.progress,
    /** 问题清单 —— 门禁要拿它跟那三块源头独立重算的结果逐条比。 */
    findings: viz.findings,
    /** 与上一次跑批比 —— 门禁要拿它跟那批命独立重算的结果逐条比。 */
    history: viz.history,
    tab: viz.tab,
    selected: viz.selected,
    /**
     * 引擎**原样**给的选项（只压了形状，没经过面板的加工）。
     * ⇒ 门禁拿它和 `pending.offered` 逐条比：面板一旦自己改了数字，这里就对不上。
     */
    truthOptions: () => options(state).map(presentOption),
  };
}

/* ── 接线 ─────────────────────────────────────────────────────────────── */

/* ⚠ 以前这里量顶栏高度写进 `--viz-top-h`（给吸顶的决策框用）。
 *   决策卡 2026-11-08 起**不再吸顶**（用户拍板：不要悬浮的决策框）⇒
 *   这个变量没人用了，连同那段量高度的代码一起删掉。 */

dom('run-form').addEventListener('submit', event => { event.preventDefault(); boot(); });
dom('run-all').addEventListener('click', () => { stopAuto(); runAll(); render(); });

dom('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme === 'dark';
  if (dark) delete root.dataset.theme;
  else root.dataset.theme = 'dark';
  dom('theme').textContent = dark ? '深色' : '浅色';
});

/* 页签切换：只换渲染，不重跑命。 */
dom('tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  const tab = button.dataset.tab;
  if (!TABS.some(entry => entry.id === tab)) return;
  viz.tab = tab;
  render();
});

/** 跑完批一句话报数：查出了几类要查的问题。 */
function findingCount(findings) {
  const warn = (findings || []).filter(row => row.severity === 'warn').length;
  return warn ? ('查出 ' + warn + ' 类问题') : '没查出问题';
}

/**
 * 把这一批的**关键数字**存下来，并跟**上一次同玩法的跑批**比。
 *
 * ⚠ 按玩法分开存（固定偏好 / 随机探索各存一份）⇒
 *   同一个玩法的两次跑批之间才可比（换个玩法去比，数字没有可比性）。
 * ⚠ 存的是**已经算好的数**，不是规则 ⇒ 面板不许自己另算一遍。
 * ⚠ 存浏览器本地（`localStorage`）⇒ 换台机器 / 清缓存就没了，
 *   但这本来就不是玩家存档，不许跟游戏的存档键混在一起。
 *
 * @param {object} snapshots `{ policy?: snapshot, random?: snapshot }`
 * @returns {object} `{ policy?: entry, random?: entry }`，entry = `{mode, previous, next, rows}`
 */
function saveHistory(snapshots) {
  const stored = readHistory();
  const history = {};
  for (const [mode, snapshot] of Object.entries(snapshots)) {
    const previous = stored[mode] || null;
    history[mode] = { mode, previous, next: snapshot, rows: diffBatchSnapshots(previous, snapshot) };
    writeSnapshot(mode, snapshot);
  }
  return history;
}

/** 状态栏后面接一句「跟上次比」。 */
function diffSuffix() {
  const text = summarizeHistory(viz.history);
  return text ? (' ⇒ ' + text) : '';
}

/* 「跑一批」：批量实测，量内容覆盖度。
 * ⚠ 条数与玩法由「批量观测台」上的控件决定（固定偏好 / 随机探索 / 两种都跑）。
 *
 * ⚠ 「两种都跑」= 各跑一遍再**并排比** ——
 *   跑批的价值不在平均数，在**差异**：
 *   · 只固定偏好走到 ⇒ 只有那条路才碰得到的内容；
 *   · 只随机探索走到 ⇒ 偏好策略永远不走的分支（= 死角候选）；
 *   · 两种都没走到 ⇒ 这一版谁都没碰到的内容。
 */
dom('run-batch').addEventListener('click', async () => {
  const button = dom('run-batch');
  const count = Number(dom('batch-count').value) || 40;
  const chosen = dom('batch-mode').value;
  const status = dom('batch-status');
  button.disabled = true;
  status.textContent = '跑一批中…';
  try {
    if (chosen === 'both') {
      const label = (done, total) => { status.textContent = '跑一批中… 固定偏好 ' + done + '/' + total; };
      const left = await runBatch(count, label, { mode: 'policy' });
      const label2 = (done, total) => { status.textContent = '跑一批中… 随机探索 ' + done + '/' + total; };
      const right = await runBatch(count, label2, { mode: 'random' });
      /* ⚠ 两边各自的覆盖度都要由**那批命本身**重算（不是另跑一遍）。 */
      const leftCoverage = buildCoverage(left.runs, { rulesVersion: 12 });
      const rightCoverage = buildCoverage(right.runs, { rulesVersion: 12 });
      viz.batch = left.batch;
      viz.coverage = leftCoverage;
      viz.compare = buildComparison(
        { label: '固定偏好', batch: left.batch, coverage: leftCoverage },
        { label: '随机探索', batch: right.batch, coverage: rightCoverage },
        { rulesVersion: 12 },
      );
      viz.batchMode = 'both';
      /* ⚠ 阶段覆盖也要由**那批命本身**重算（不是另跑一遍）。 */
      viz.stageCoverage = buildStageCoverage(left.runs, { rulesVersion: 12 });
      viz.stageCoverageAlt = buildStageCoverage(right.runs, { rulesVersion: 12 });
      viz.progress = buildProgress(left.runs);
      viz.findings = buildFindings({ coverage: viz.coverage, stageCoverage: viz.stageCoverage, progress: viz.progress });
      /* ⚠ 存下这次的数字 ⇒ 下次跑批能跟这次比（改完内容到底有没有用，看这里）。 */
      const at = new Date().toISOString();
      viz.history = saveHistory({
        policy: buildBatchSnapshot(
          { coverage: leftCoverage, stageCoverage: viz.stageCoverage, progress: viz.progress },
          { at, mode: 'policy', count: left.batch.lives },
        ),
        random: buildBatchSnapshot(
          { coverage: rightCoverage, stageCoverage: viz.stageCoverageAlt, progress: buildProgress(right.runs) },
          { at, mode: 'random', count: right.batch.lives },
        ),
      });
      status.textContent = '跑完了 ' + left.batch.lives + ' + ' + right.batch.lives + ' 条（两种玩法）⇒ ' + findingCount(viz.findings) + ' ⇒ 并排比在「流水」页' + diffSuffix();
    } else {
      const mode = chosen === 'random' ? 'random' : 'policy';
      const result = await runBatch(count, (done, total) => { status.textContent = '跑一批中… ' + done + '/' + total; }, { mode });
      viz.batch = result.batch;
      /* ⚠ 覆盖度必须由**那批命本身**重算（不是另跑一遍）⇒ 用同一批 runs。 */
      viz.coverage = buildCoverage(result.runs, { rulesVersion: 12 });
      viz.batchMode = result.mode;
      /* ⚠ 换了玩法 ⇒ 旧的对比作废（那是上一批的数字，留着会骗人）。 */
      viz.compare = null;
      viz.stageCoverage = buildStageCoverage(result.runs, { rulesVersion: 12 });
      viz.stageCoverageAlt = null;
      viz.progress = buildProgress(result.runs);
      viz.findings = buildFindings({ coverage: viz.coverage, stageCoverage: viz.stageCoverage, progress: viz.progress });
      /* ⚠ 存下这次的数字 ⇒ 下次跑批能跟这次比（改完内容到底有没有用，看这里）。 */
      const at = new Date().toISOString();
      viz.history = saveHistory({
        [mode]: buildBatchSnapshot(
          { coverage: viz.coverage, stageCoverage: viz.stageCoverage, progress: viz.progress },
          { at, mode, count: result.batch.lives },
        ),
      });
      status.textContent = '跑完了 ' + result.batch.lives + ' 条（' + (mode === 'random' ? '随机探索' : '固定偏好') + '）⇒ ' + findingCount(viz.findings) + ' ⇒ 结果在「流水」页' + diffSuffix();
    }
  } finally {
    button.disabled = false;
    button.textContent = '跑一批';
  }
  render();
});

/* ⚠ 决策区收在「当前状态」页里 ⇒ 页签内容每次渲染都会被重建
 *   ⇒ 只能用**事件委托**（直接绑在 #decision 上，重建后就失效了）。 */
dom('tabpanel').addEventListener('click', event => {
  const button = event.target.closest('[data-pick]');
  if (!button || button.disabled) return;
  pick(button.dataset.pick);
  /* 选完就回到「眼下这张卡」⇒ 可以接着一路点下去；
     想回看哪一步 ⇒ 点轴上的那个点。 */
  viz.selected = null;
  render();
});

dom('track').addEventListener('click', event => {
  const point = event.target.closest('[data-step]');
  if (!point) return;
  viz.selected = Number(point.dataset.step);
  /* ⚠ 回看的那一步画在「当前状态」页里 ⇒ 顺手切过去，
     否则点了轴什么也没发生（看起来像点不动）。 */
  viz.tab = 'state';
  render();
});

/* 「让它自己走」：人一个决定都不用做，系统自己选。 */
dom('auto-play').addEventListener('click', () => {
  if (viz.auto.on) { stopAuto(); render(); return; }
  viz.auto.mode = dom('auto-mode').value === 'random' ? 'random' : 'policy';
  startAuto();
});

boot();
