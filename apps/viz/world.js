/**
 * world.js —— 世界观页（画的部分）
 * ============================================================================
 *
 * ## 显示什么
 * ------------
 *   ① 宗门：名字、规模、原有最高修为、现在处于哪一阶段、公库、
 *      你的差事、议事了几次 ⇒ 以及这家宗门是什么路数。
 *   ② 功法：主修哪部、练了多久、实际倍率（**规则层算的**）、
 *      换过哪几部，以及全部 19 部功法的表。
 *   ③ 境界：这一境能干什么、该在几岁到、还差多少、冲关还差什么。
 *   ④ 灵根 / 体质 / 道途 / 出身 / 时代 / 修炼场 / 全部结局。
 *
 * ## ⚠ 数字全部来自 model.js
 * ----------------------
 * 功法倍率是规则层算的（灵根是否适配）、冲关还差什么是规则层拼的整句
 * ⇒ 本文件只排版，一行判断都不做。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const SECT_PHASE = { intact: '原山门', camp: '撤离后的临时营地', rebuilt: '重新建立的山门' };
const SECT_ROLE = { core: '守山与护法', leader: '领事与议事', supporter: '已交接管理' };

function rows(pairs) {
  return `<div class="viz-snap-rows">${pairs.map(([key, value]) => `<div class="viz-snap-row"><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join('')}</div>`;
}

/* ── 宗门 ─────────────────────────────────────────────────────────────── */

function sect(world) {
  if (!world.sect) return '<p class="viz-hint">这条命没有拜入宗门。</p>';
  const sect = world.sect;
  return `
    <div class="viz-sect-head">
      <b>${esc(sect.name)}</b>
      <span>${esc(sect.size)} · ${esc(SECT_PHASE[sect.phase] || sect.phase)}</span>
    </div>
    ${rows([
      ['原有最高修为', sect.npcHighest >= 0 ? (sect.npcHighest === 0 ? '凡身' : sect.npcHighest === 1 ? '炼气' : sect.npcHighest === 2 ? '筑基' : sect.npcHighest === 3 ? '金丹' : '元婴') : '—'],
      ['现在最高修为', sect.highest >= 0 ? (sect.highest === 0 ? '凡身' : sect.highest === 1 ? '炼气' : sect.highest === 2 ? '筑基' : sect.highest === 3 ? '金丹' : '元婴') : '—'],
      ['你的差事', sect.role ? (SECT_ROLE[sect.role] || sect.role) : '—'],
      ['公库', sect.treasury + ' 灵石'],
      ['安置与营建', sect.development ? sect.development + ' 项已办妥' : '尚待商议'],
      ['议事次数', sect.councils + ' 次'],
      ['闭关年头', sect.yearsCount + ' 次'],
    ])}
    ${sect.style ? `<p class="viz-hint">${esc(sect.style)}</p>` : ''}`;
}

/* ── 功法 ─────────────────────────────────────────────────────────────── */

function method(world) {
  if (!world.method) return '<p class="viz-hint">还没有正式授业。</p>';
  const method = world.method;
  return `
    <div class="viz-sect-head">
      <b>${esc(method.name)}</b>
      <span>实际倍率 ${method.rate.toFixed(2)}</span>
    </div>
    ${rows([
      ['已练', method.months + ' 个月'],
      ['入门于', method.acquired + ' 月'],
      ['适配灵根', method.root.join('、') || '—'],
      ['来源', method.source || '—'],
    ])}
    <p class="viz-hint">${esc(method.detail)}</p>
    ${world.history.length ? `<p class="viz-hint">换过：${world.history.map(row => esc(row.name)).join(' → ')}</p>` : ''}`;
}

function methodTable(world) {
  const rows = world.allMethods.map(method => `<div class="viz-method ${method.learned ? 'learned' : ''}">
    <span class="viz-method-name">${esc(method.name)}<small>${esc(method.root.join('、'))} · 倍率 ${method.rate.toFixed(2)}</small></span>
    <span class="viz-method-detail">${esc(method.detail)}</span>
  </div>`).join('');
  return `<div class="viz-methods">${rows}</div>`;
}

/* ── 境界 / 灵根 / 体质 ───────────────────────────────────────────────── */

function realm(world) {
  const realm = world.realm;
  const need = realm.needed;
  const percent = need ? Math.min(100, realm.progress / need * 100) : 100;
  return `
    ${rows([
      ['当前境界', realm.name + (realm.window ? `（该在 ${realm.window.from}–${realm.window.to} 岁）` : '')],
      ['寿元上限', realm.lifespan + ' 岁'],
      ['修行进度', Math.round(realm.progress) + (need ? ' / ' + need : '')],
    ])}
    <div class="viz-snap-meter"><i style="width:${percent.toFixed(1)}%"></i></div>
    <p class="viz-hint">${esc(realm.ability)}</p>
    ${realm.advice ? `<p class="viz-world-advice">${esc(realm.advice)}</p>` : ''}`;
}

function root(world) {
  if (!world.root) return '<p class="viz-hint">灵根尚未测定。</p>';
  return rows([
    ['灵根', world.root.name],
    ['品级', world.root.grade >= 2 ? '上等' : world.root.grade === 1 ? '中等' : world.root.grade === 0 ? '下等' : '未显'],
    ['修炼速率', world.root.rate.toFixed(2)],
  ]) + `<p class="viz-hint">${esc(world.root.description)}</p>`;
}

function body(world) {
  if (!world.body) return '<p class="viz-hint">还没到能练的时候。</p>';
  return rows([
    ['体质', world.body.type],
    ['体魄', world.body.constitution],
    ['旧伤', world.body.damage ? world.body.damage + ' 处' : '无'],
    ['损耗', world.body.loss ? world.body.loss : '无'],
  ]);
}

/* ── 出身 / 修炼场 / 结局 ─────────────────────────────────────────────── */

function origin(world) {
  const origin = world.origin;
  return rows([
    ['时代', origin.era ? origin.era.name : '—'],
    ['出生地', origin.continent + ' · ' + origin.address],
    ['本地宗门', origin.sect || '—'],
    ['家境', origin.family],
    ['人生目标', origin.goal],
  ]) + `<p class="viz-hint">${esc(origin.era ? origin.era.description : '')}</p>
    <p class="viz-hint">${esc(origin.familyText)}</p>
    <p class="viz-hint">${esc(origin.goalText)}</p>`;
}

function grounds(world) {
  const rows = world.grounds.map(ground => `<div class="viz-ground">
    <span class="viz-ground-name">${esc(ground.name)}<small>需 ${esc(['凡身', '炼气', '筑基', '金丹', '元婴'][ground.realm] || '')} 修为</small></span>
    <span class="viz-ground-detail">${esc(ground.description)}</span>
  </div>`).join('');
  return `<div class="viz-grounds">${rows}</div>`;
}

function endings(world) {
  const rows = world.endings.map(ending => `<span class="viz-ending-chip${ending.reached ? ' reached' : ''}">${esc(ending.title)}</span>`).join('');
  return `<div class="viz-ending-chips">${rows}</div>`;
}

export function renderWorld(world) {
  return `
    <div class="viz-world-grid">
      <section class="viz-world-block">
        <h4 class="viz-sub">宗门</h4>
        ${sect(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">主修功法</h4>
        ${method(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">境界与修行</h4>
        ${realm(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">灵根</h4>
        ${root(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">体质</h4>
        ${body(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">道途</h4>
        ${world.path ? rows([['道途', world.path.name], ['住处', world.path.home], ['授业者', world.path.teacher]]) + `<p class="viz-hint">${esc(world.path.description)}</p>` : '<p class="viz-hint">—</p>'}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">出身与时代</h4>
        ${origin(world)}
      </section>
      <section class="viz-world-block">
        <h4 class="viz-sub">修炼场</h4>
        ${grounds(world)}
      </section>
      <section class="viz-world-block wide">
        <h4 class="viz-sub">全部功法（${world.methodCount} 部）</h4>
        ${methodTable(world)}
      </section>
      <section class="viz-world-block wide">
        <h4 class="viz-sub">全部结局（${world.endings.length} 个）</h4>
        ${endings(world)}
      </section>
    </div>`;
}
