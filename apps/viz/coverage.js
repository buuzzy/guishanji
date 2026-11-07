/**
 * coverage.js —— 内容覆盖表（画的部分）
 * ============================================================================
 *
 * ## 回答什么问题
 * ------------------
 * 「这个游戏的内容到底丰不丰富？哪里是死角？」——
 * 一条命看不出覆盖度，跑一批才看得出：
 *
 *   · 剧情卡覆盖了多少，**按规则版本分开算**（当前版本 / 旧版本专属 / 经典故事层）
 *   · 哪些卡**一族都没走到**（疑似死角），哪些只是「同场景的其它变体没轮到」
 *   · 哪些选项一条命都没被选过（死路候选）
 *   · 道具 / 地名 / 结局各碰到了多少
 *
 * ## ⚠ 为什么必须分桶
 * --------------------
 * 全部剧情卡 360 张，但**当前版本真正会走的只有 285 张**，另外 75 张是经典故事层
 * （攻城 / 战议 / 难民 / 大陆登陆那一整条线）—— 实测规则十二下一张都没出现。
 * 不分桶的话，「覆盖 55%」会让人以为另外 45% 的内容写废了。
 *
 * ⚠ 本文件只排版：**分桶、分类、命中集合全部来自 `model.js` 的 `buildCoverage()`**
 *   （那里读的是规则层的事件表），这里一个数都不自己算。
 */

import { md } from './md.js';

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const percent = (hit, total) => total ? ((hit / total) * 100).toFixed(1) + '%' : '—';

/** 一个覆盖条：已覆盖的部分填色。 */
function bar(hit, total) {
  const width = total ? Math.max(0, Math.min(100, (hit / total) * 100)) : 0;
  return `<span class="viz-cov-bar"><i style="width:${width.toFixed(1)}%"></i></span>`;
}

/** 一族没走到的卡，按族归拢。 */
function sceneFamilies(missed) {
  const families = new Map();
  for (const row of missed) {
    if (row.kind !== 'scene') continue;
    if (!families.has(row.family)) families.set(row.family, { family: row.family, label: row.label, size: row.familySize, ids: [] });
    families.get(row.family).ids.push(row.id);
  }
  return [...families.values()].sort((a, b) => b.ids.length - a.ids.length);
}

/** 一个分桶。 */
function bucket(row) {
  const missed = row.missed || [];
  const scenes = sceneFamilies(missed);
  const variants = missed.filter(item => item.kind === 'variant');
  const sceneList = scenes.map(family => `<li class="viz-cov-family">
      <span class="viz-cov-family-name">${esc(family.label)}</span>
      <span class="viz-cov-family-count mono">${family.ids.length} 张</span>
      <span class="viz-cov-family-ids mono">${esc(family.ids.join('、'))}</span>
    </li>`).join('');
  const note = row.id === 'classic'
    ? '<small>这一整条线（攻城 / 战议 / 难民 / 大陆登陆…）在当前版本不走 ⇒ 没出现是设计如此，不是缺口。</small>'
    : row.id === 'legacy' ? '<small>只在旧版本的事件表里，当前版本查不到。</small>' : '';
  /* ⚠ 别的线不列「一族没走到」—— 那不是死角，是另一条线。 */
  const missBlock = row.id !== 'current'
    ? (missed.length
      ? `<p class="viz-hint">这 ${missed.length} 张卡当前版本走不到（属于另一条线）。</p>`
      : (row.total ? '<p class="viz-hint">这一桶的卡全都被走到过。</p>' : '<p class="viz-hint">这一桶没有卡（当前版本的事件表已经包含旧版本的全部卡）。</p>'))
    : (missed.length
      ? `<div class="viz-cov-miss">
          <p class="viz-cov-miss-title">没出现 <b class="mono">${missed.length}</b> 张
            <small>${scenes.length ? '整族没走到 ' + scenes.length + ' 族' : ''}${scenes.length && variants.length ? ' · ' : ''}${variants.length ? '同场景的其它变体 ' + variants.length + ' 张' : ''}</small></p>
          ${sceneList ? `<ul class="viz-cov-families">${sceneList}</ul>` : ''}
          ${variants.length ? `<p class="viz-hint">另有 ${variants.length} 张是同一个场景的其它变体（一条命反复遇到同一处才轮到它们）⇒ 不是死角。</p>` : ''}
          ${scenes.length ? '<p class="viz-hint">' + md('「整族没走到」只是**这批命**没走到 —— 稀有还是写废了，得加大样本或换随机探索再验；别看到就改。') + '</p>' : ''}
        </div>`
      : '<p class="viz-hint">这一桶的卡全都被走到过。</p>');
  return `<div class="viz-cov-bucket">
      <div class="viz-cov-bucket-head">
        <span class="viz-cov-bucket-name">${esc(row.label)}${note}</span>
        <span class="viz-cov-bucket-count mono">${row.hit} / ${row.total}</span>
        <span class="viz-cov-bucket-pct mono">${percent(row.hit, row.total)}</span>
      </div>
      ${bar(row.hit, row.total)}
      ${missBlock}
    </div>`;
}

/** 从没被选过的选项。 */
function unusedOptions(rows) {
  if (!rows.length) return '<p class="viz-hint">出现过的卡里，每个选项都被选过。</p>';
  const list = rows.map(row => `<li class="viz-cov-unused">
      <span class="viz-cov-unused-card">${esc(row.cardLabel)}</span>
      <span class="viz-cov-unused-choice">${esc(row.label)}</span>
      <span class="viz-cov-unused-id mono">${esc(row.card)} · ${esc(row.choice)}</span>
    </li>`).join('');
  return `<ul class="viz-cov-unused-list">${list}</ul>`;
}

/** 道具 / 地名 / 结局：碰到多少、没碰到哪些。 */
function simpleList(title, hit, total, missed, labelOf) {
  const names = missed.map(labelOf);
  return `<div class="viz-cov-simple">
      <div class="viz-cov-simple-head">
        <span class="viz-cov-simple-name">${esc(title)}</span>
        <span class="viz-cov-simple-count mono">${hit} / ${total}</span>
        ${bar(hit, total)}
      </div>
      ${missed.length
        ? `<p class="viz-cov-simple-miss">没碰到（${missed.length}）：${esc(names.join('、'))}</p>`
        : '<p class="viz-hint">全都碰到了。</p>'}
    </div>`;
}

/** 角儿（人物）覆盖：每一组出现过几次、哪些角儿一次都没遇到。 */
function peopleCoverage(people) {
  if (!people || !people.groups.length) return '<p class="viz-hint">这批命里没有遇到任何角儿。</p>';
  const rows = people.groups.map(group => {
    const slots = group.slots
      .filter(slot => slot.lives > 0)
      .map(slot => `<span class="viz-cov-slot" title="${esc(slot.label)}">${esc(slot.label)}<small class="mono">${slot.lives}</small></span>`)
      .join('');
    const missed = group.slots.filter(slot => slot.lives === 0).map(slot => esc(slot.label));
    return `<div class="viz-cov-people-row">
        <span class="viz-cov-people-name">${esc(group.label)}</span>
        <span class="viz-cov-people-lives mono">${group.lives} 条命遇到过</span>
        <span class="viz-cov-people-median mono">每条命中位 ${group.median} · 最多 ${group.max}</span>
        <span class="viz-cov-people-slots">${slots}</span>
        ${missed.length ? `<span class="viz-cov-people-missed">没遇到过：${missed.join('、')}</span>` : ''}
      </div>`;
  }).join('');
  return `<div class="viz-cov-people">${rows}</div>`;
}

/**
 * 画内容覆盖表。
 * @param {object} coverage `model.js::buildCoverage()` 的结果
 */
export function renderCoverage(coverage) {
  if (!coverage) return '<p class="viz-hint">还没跑过批量实测 ⇒ 没有覆盖度可看。</p>';
  const buckets = coverage.cards.buckets.map(bucket).join('');
  const current = coverage.cards.buckets.find(row => row.id === 'current');
  const classic = coverage.cards.buckets.find(row => row.id === 'classic');
  const legacy = coverage.cards.buckets.find(row => row.id === 'legacy');
  return `
    <div class="viz-cov-stats">
      <span>跑完 <b class="mono">${coverage.finished}</b> 条</span>
      <span>剧情卡（当前版本）<b class="mono">${current ? current.hit : '—'}</b> / ${current ? current.total : '—'}</span>
      ${legacy && legacy.total ? `<span>旧版本专属 <b class="mono">${legacy.hit}</b> / ${legacy.total}</span>` : ''}
      ${classic && classic.total ? `<span>经典故事层 <b class="mono">${classic.hit}</b> / ${classic.total}<small> 当前版本不走</small></span>` : ''}
      <span>选项 <b class="mono">${coverage.choices.picked}</b> 个</span>
      <span>道具 <b class="mono">${coverage.items.hit}</b> / ${coverage.items.total}</span>
      <span>地名 <b class="mono">${coverage.places.hit}</b> / ${coverage.places.total}</span>
      <span>结局 <b class="mono">${coverage.endings.hit}</b> / ${coverage.endings.total}</span>
      <span>角儿 每条命中位 <b class="mono">${coverage.people.perLifeMedian}</b> · 最多 <b class="mono">${coverage.people.perLifeMax}</b></span>
    </div>
    <h4 class="viz-sub">剧情卡覆盖<small>按规则版本分桶</small></h4>
    <div class="viz-cov-buckets">${buckets}</div>
    <h4 class="viz-sub">从没被选过的选项<small>${coverage.choices.unused.length} 个</small></h4>
    ${unusedOptions(coverage.choices.unused)}
    <h4 class="viz-sub">道具 / 地名 / 结局</h4>
    <div class="viz-cov-simples">
      ${simpleList('道具', coverage.items.hit, coverage.items.total, coverage.items.missed, row => row.name)}
      ${simpleList('地名', coverage.places.hit, coverage.places.total, coverage.places.missed, row => row.id)}
      ${simpleList('结局', coverage.endings.hit, coverage.endings.total, coverage.endings.missed, row => row.title)}
    </div>
    <h4 class="viz-sub">角儿<small>这一批命遇到过哪些人</small></h4>
    ${peopleCoverage(coverage.people)}`;
}

/**
 * 两种玩法并排比（固定偏好 vs 随机探索）。
 *
 * ⚠ 「跑一批」的价值在**差异**，不在平均 ——
 *   · 只 A 走到的 ⇒ 只有那条路才碰得到的内容；
 *   · 只 B 走到的 ⇒ 偏好策略永远不走的分支（= 死角候选）；
 *   · 两种都没走到 ⇒ 这一版谁都没碰到的内容。
 *
 * @param {object} cmp `model.js::buildComparison()` 的结果
 */
export function renderComparison(cmp) {
  if (!cmp) return '<p class="viz-hint">还没跑过对比 ⇒ 在「批量观测台」把玩法选成「两种都跑」。</p>';
  const row = (label, left, right, unit) => `<div class="viz-cmp-row">
      <span class="viz-cmp-label">${esc(label)}</span>
      <span class="viz-cmp-value mono">${left === null ? '—' : esc(String(left))}${unit ? ' ' + esc(unit) : ''}</span>
      <span class="viz-cmp-value mono">${right === null ? '—' : esc(String(right))}${unit ? ' ' + esc(unit) : ''}</span>
    </div>`;

  const rows = cmp.rows.map(item => row(item.label, item.left, item.right, item.unit)).join('');

  const diffList = (title, diff, note) => {
    if (!diff.cards.length && !diff.items.length && !diff.endings.length) {
      return `<div class="viz-cmp-diff"><span class="viz-cmp-diff-title">${esc(title)}</span><p class="viz-hint">两边一样，没差别。</p></div>`;
    }
    const part = (label, rows) => rows.length
      ? `<p class="viz-cmp-diff-line"><b>${esc(label)}</b>（${rows.length}）${esc(rows.slice(0, 12).map(item => item.label).join('、'))}${rows.length > 12 ? ' …' : ''}</p>`
      : '';
    return `<div class="viz-cmp-diff">
        <span class="viz-cmp-diff-title">${esc(title)}</span>
        ${part('剧情卡', diff.cards)}
        ${part('道具', diff.items)}
        ${part('结局', diff.endings)}
        ${note ? `<p class="viz-hint">${esc(note)}</p>` : ''}
      </div>`;
  };

  const people = cmp.peopleDiff.length
    ? cmp.peopleDiff.map(item => `<div class="viz-cmp-people">
        <span class="viz-cmp-people-name">${esc(item.label)}</span>
        <span class="viz-cmp-people-count mono">${item.left} 条命</span>
        <span class="viz-cmp-people-count mono">${item.right} 条命</span>
      </div>`).join('')
    : '<p class="viz-hint">两种玩法遇到的角儿一样。</p>';

  return `
    <div class="viz-cmp-head">
      <span class="viz-cmp-label"></span>
      <span class="viz-cmp-head-name">${esc(cmp.left.label)}</span>
      <span class="viz-cmp-head-name">${esc(cmp.right.label)}</span>
    </div>
    <div class="viz-cmp-rows">${rows}</div>
    <div class="viz-cmp-diffs">
      ${diffList('只「' + cmp.left.label + '」走到', cmp.onlyLeft, '')}
      ${diffList('只「' + cmp.right.label + '」走到', cmp.onlyRight, '这些是偏好策略永远走不到的分支 ⇒ 值得当成死角候选查一查。')}
      <div class="viz-cmp-diff">
        <span class="viz-cmp-diff-title">两种都没走到</span>
        <p class="viz-cmp-diff-line">剧情卡（${cmp.neither.cards.length} 张）：${esc(cmp.neither.cards.slice(0, 12).map(item => item.label).join('、'))}${cmp.neither.cards.length > 12 ? ' …' : ''}</p>
      </div>
    </div>
    <h4 class="viz-sub">角儿差异<small>两种玩法分别遇到过几次</small></h4>
    <div class="viz-cmp-people-list">${people}</div>`;
}

/**
 * 「按阶段 / 境界看内容」—— 回答**「不同阶段、境界的那段人生有没有内容可看」**。
 *
 * ⚠ 三块表：
 *   ① **按境界段** —— 这张卡是在哪一境发出的（采样）；
 *   ② **按人生阶段** —— 幼年 / 少年 / 入门 / 立身 / 传灯 / 晚年（采样 + `STAGES`）；
 *   ③ **阶段闸管的卡** —— 规则层**声明**了「这张卡属于哪一段 / 哪一境」的那些卡
 *      （供给侧，用的是阶段闸同一份 `declarationOf()`）。
 *
 * @param {object} coverage `model.js::buildStageCoverage()` 的结果
 */
export function renderStageCoverage(coverage) {
  if (!coverage) return '<p class="viz-hint">还没跑过批量实测 ⇒ 没有阶段覆盖可看。</p>';

  const head = (cells, cls) => `<div class="viz-cov-stage-head ${cls}">${cells}</div>`;

  const realmRows = coverage.realms.map(row => `<div class="viz-cov-stage-row t-realm${row.belowFloor ? ' below' : ''}">
      <span class="viz-cov-stage-name">${esc(row.name)}${row.belowFloor ? '<small class="viz-cov-stage-flag">低于底线</small>' : ''}</span>
      <span class="viz-cov-stage-cell mono">${row.kinds}</span>
      <span class="viz-cov-stage-cell mono">${row.perLifeMax}</span>
      <span class="viz-cov-stage-cell mono">${row.perLifeAvg}</span>
      <span class="viz-cov-stage-cell mono">${row.medianAge === null ? '—' : row.medianAge + ' 岁'}</span>
    </div>`).join('');

  const stageRows = coverage.stages.map(row => `<div class="viz-cov-stage-row t-stage${coverage.thinnest === row.id ? ' below' : ''}">
      <span class="viz-cov-stage-name">${esc(row.name)}${coverage.thinnest === row.id ? '<small class="viz-cov-stage-flag">最薄的一段</small>' : ''}</span>
      <span class="viz-cov-stage-cell mono">${row.from}–${row.to === 999 ? '∞' : row.to} 岁</span>
      <span class="viz-cov-stage-cell mono">${row.kinds}</span>
      <span class="viz-cov-stage-cell mono">${row.perLifeMax}</span>
      <span class="viz-cov-stage-cell mono">${row.perLifeAvg}</span>
      <span class="viz-cov-stage-cell">${esc(row.mainRealm)}</span>
    </div>`).join('');

  const declared = (rows, nameOf) => rows.map(row => {
    /* ⚠ 「0 张声明」要说清楚，不能写成「全都碰到了」（那会让人以为这一段有内容）。 */
    const missed = !row.total
      ? '<span class="viz-cov-stage-missed">这一段没有卡声明阶段</span>'
      : row.missed.length
        ? `<span class="viz-cov-stage-missed">没碰到：${esc(row.missed.map(item => item.label).join('、'))}</span>`
        : '<span class="viz-cov-stage-missed">全都碰到了</span>';
    return `<div class="viz-cov-stage-row t-decl">
        <span class="viz-cov-stage-name">${esc(nameOf(row))}</span>
        <span class="viz-cov-stage-cell mono">${row.total}</span>
        <span class="viz-cov-stage-cell mono">${row.hit}</span>
        <span class="viz-cov-stage-cell mono">${row.total - row.hit}</span>
        ${missed}
      </div>`;
  }).join('');

  const thin = coverage.stages.filter(row => row.perLifeMax > 0);
  const thinNote = thin.length
    ? `<p class="viz-hint">最薄的是 <b>${esc(thin.reduce((min, row) => (row.perLifeMax < min.perLifeMax ? row : min)).name)}</b>（一条命最多碰到 ${thin.reduce((min, row) => (row.perLifeMax < min.perLifeMax ? row : min)).perLifeMax} 种内容）。
       ⚠ 人生阶段这一层项目**还没定底线**（完备度盘点只给境界段与晚年定了）⇒ 这里只说「最薄」，不自己编一个数。</p>`
    : '<p class="viz-hint">这批命里每一段人生都碰到过内容。</p>';

  /* ⚠ 晚年：与「内容完备度盘点」同一口径（75 岁以后碰到过几种卡）、同一底线。 */
  const lateNote = `<p class="viz-hint">${coverage.late.age} 岁以后共碰到 <b class="mono">${coverage.late.kinds}</b> 种卡
    （底线 ${coverage.late.floor} 种${coverage.late.belowFloor ? ' —— <b class="below">低于底线</b>' : ' —— 达标'}）。
    ⚠ 这一条与「内容完备度盘点」是同一口径、同一底线数字（都取自 <code>scripts/lib/completeness-limits.js</code>）。</p>`;

  return `
    <div class="viz-cov-stage-block">
      <h5 class="viz-sub-sub">按境界段<small>这张卡是在哪一境发出的</small></h5>
      ${head('<span class="viz-cov-stage-name">境界</span><span class="viz-cov-stage-cell">合起来碰到几种</span><span class="viz-cov-stage-cell">单条命最多</span><span class="viz-cov-stage-cell">平均几张</span><span class="viz-cov-stage-cell">发卡年龄中位</span>', 't-realm')}
      <div class="viz-cov-stage-rows">${realmRows}</div>
      <p class="viz-hint">${md('「合起来碰到几种」是这批命**并起来**的数（看着好看）；「单条命最多」才是**一个玩家实际**能碰到的上限。')}
        底线 <b class="mono">${coverage.realms[0] ? coverage.realms[0].floor : '—'}</b> 种来自「内容完备度盘点」那一份 ⇒ 面板标的与门禁守的是同一个数。</p>
    </div>
    <div class="viz-cov-stage-block">
      <h5 class="viz-sub-sub">按人生阶段<small>幼年 / 少年 / 入门 / 立身 / 传灯 / 晚年</small></h5>
      ${head('<span class="viz-cov-stage-name">阶段</span><span class="viz-cov-stage-cell">年龄段</span><span class="viz-cov-stage-cell">合起来碰到几种</span><span class="viz-cov-stage-cell">单条命最多</span><span class="viz-cov-stage-cell">平均几张</span><span class="viz-cov-stage-cell">主要在哪个境界</span>', 't-stage')}
      <div class="viz-cov-stage-rows">${stageRows}</div>
      ${thinNote}
      ${lateNote}
    </div>
    <div class="viz-cov-stage-block">
      <h5 class="viz-sub-sub">阶段闸管的卡<small>规则层声明了「属于哪一段 / 哪一境」的那些</small></h5>
      ${head('<span class="viz-cov-stage-name">阶段</span><span class="viz-cov-stage-cell">声明几张</span><span class="viz-cov-stage-cell">碰到几张</span><span class="viz-cov-stage-cell">没碰到几张</span><span class="viz-cov-stage-cell"></span>', 't-decl')}
      <div class="viz-cov-stage-rows">${declared(coverage.declaredStages, row => row.name)}</div>
      ${head('<span class="viz-cov-stage-name">境界</span><span class="viz-cov-stage-cell">声明几张</span><span class="viz-cov-stage-cell">碰到几张</span><span class="viz-cov-stage-cell">没碰到几张</span><span class="viz-cov-stage-cell"></span>', 't-decl')}
      <div class="viz-cov-stage-rows">${declared(coverage.declaredRealms, row => row.name)}</div>
      <p class="viz-hint">${md('这一块用的是**阶段闸同一份**声明 ⇒ 面板说的与规则层管的是同一批卡。')}</p>
    </div>`;
}
