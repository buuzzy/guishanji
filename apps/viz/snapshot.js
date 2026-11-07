/**
 * snapshot.js —— 「此刻这个人是什么样」的快照（画的部分）
 * ============================================================================
 *
 * ## 画的是什么
 * --------------
 * 身份（五维之外的那些）、五维属性的当前值、修行进度与门槛、
 * 身家与行囊、以及**这条命里遇到的每个人**（在世 / 被俘 / 已故 / 羁绊）。
 *
 * ## ⚠ 数字全部读状态
 * ------------------
 * 境界名来自境界表、灵根来自规则层、人物名字也是状态里那份（已被规则层替换过）——
 * 本文件不重算任何东西，只负责排版。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const STATUS_CLASS = { alive: 'ok', captured: 'warn', dead: 'bad', missing: 'warn', detained: 'warn' };

function identity(snapshot) {
  const rows = [
    ['年龄', snapshot.age + ' 岁'],
    ['境界', snapshot.realmName + (snapshot.realmWindow ? `（该在 ${snapshot.realmWindow.from}–${snapshot.realmWindow.to} 岁）` : '')],
    ['灵根', snapshot.root],
    ['道途', snapshot.path],
    ['差事', snapshot.rank],
    ['出生地', snapshot.continent + ' · ' + snapshot.origin],
  ];
  return `<div class="viz-snap-rows">${rows.map(([key, value]) => `<div class="viz-snap-row"><span>${esc(key)}</span><b>${esc(value)}</b></div>`).join('')}</div>`;
}

function attributes(snapshot) {
  const rows = snapshot.attributes.map(attribute => {
    const percent = Math.max(0, Math.min(100, attribute.value));
    return `<div class="viz-snap-attr">
      <span class="viz-snap-attr-label">${esc(attribute.label)}</span>
      <span class="viz-snap-attr-meter"><i class="swatch-fill swatch-fill-${esc(attribute.key)}" style="width:${percent.toFixed(1)}%"></i></span>
      <b class="mono">${Math.round(attribute.value)}</b>
    </div>`;
  });
  return `<div class="viz-snap-attrs">${rows.join('')}</div>`;
}

function resources(snapshot) {
  const need = snapshot.progressNeeded;
  const percent = need ? Math.max(0, Math.min(100, snapshot.progress / need * 100)) : 100;
  return `<div class="viz-snap-rows">
    <div class="viz-snap-row"><span>修行进度</span><b class="mono">${Math.round(snapshot.progress)}${need ? ` / ${need}` : ''}</b></div>
    <div class="viz-snap-row"><span>寿元上限</span><b class="mono">${snapshot.lifespan} 岁</b></div>
    <div class="viz-snap-row"><span>灵石</span><b class="mono">${snapshot.stones}</b></div>
    ${snapshot.debt ? `<div class="viz-snap-row"><span>欠账</span><b class="mono">${snapshot.debt} 灵石</b></div>` : ''}
  </div>
  <div class="viz-snap-meter"><i style="width:${percent.toFixed(1)}%"></i></div>
  ${snapshot.inventory.length ? `<p class="viz-snap-inv">行囊：${snapshot.inventory.map(esc).join('、')}</p>` : '<p class="viz-snap-inv">行囊空着</p>'}`;
}

function people(snapshot) {
  const rows = snapshot.people.map(person => `
    <div class="viz-person${person.known ? '' : ' unknown'}">
      <span class="viz-person-name">${esc(person.name)}<small class="viz-person-role">${esc(person.role)}</small></span>
      <span class="viz-person-status ${STATUS_CLASS[person.status] || ''}">${esc(person.statusLabel)}</span>
      <span class="viz-person-bond mono">${person.known ? person.bond : '—'}</span>
    </div>`).join('');
  return `<div class="viz-people">${rows}</div>`;
}

/**
 * 「当前状态」页。
 *
 * ⚠ `decisionHtml`：**眼下这张卡 / 回看某一步**（代价、把握、为什么点不了）。
 *   它以前是右边那个独立的框（还会悬浮、盖住内容）⇒ 现在收在这一页最上面：
 *   不点选项也能看（自动播放时显示系统刚选了什么），想手动介入时才点。
 */
export function renderSnapshot(snapshot, decisionHtml = '') {
  const decision = decisionHtml
    ? `<section class="viz-decision-block">
        <h4 class="viz-sub">眼下这张卡<small>代价、把握、以及为什么点不了</small></h4>
        ${decisionHtml}
      </section>`
    : '';
  return `
    ${decision}
    <div class="viz-snap-head">
      <b class="viz-snap-name">${esc(snapshot.name)}</b>
      <span class="viz-snap-sub">${esc(snapshot.path)} · ${esc(snapshot.realmName)}</span>
    </div>
    ${identity(snapshot)}
    <h4 class="viz-sub">五维属性</h4>
    ${attributes(snapshot)}
    <h4 class="viz-sub">修为与身家</h4>
    ${resources(snapshot)}
    <h4 class="viz-sub">人物与牵挂</h4>
    ${people(snapshot)}`;
}
