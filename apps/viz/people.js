/**
 * people.js —— 人物页（画的部分）
 * ============================================================================
 *
 * ## 显示什么
 * ------------
 *   主角六位 + 家人 + 后代 + 旧相识 + 宗门高管 + 已故亲人，
 *   各自的状态、在哪、羁绊。
 *
 * ⚠ 早先的快照只列 `state.people`（六位主角）⇒ 家人、后代、旧相识
 *   全看不见 ⇒ 「这个角色这条命里从没出现」根本看不出来。
 *   现在按来源分组列全。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const STATUS_CLASS = { alive: 'ok', captured: 'warn', dead: 'bad', missing: 'warn', detained: 'warn' };

/* ⚠ `key` 必须与 `buildPeople` 返回的字段名**逐字一致** ——
   写错一个字母，这组人就**整组不显示**（而且不报错，只是静静地少一块）。
   ⇒ 门禁会拿「每个人名都得出现在页面上」来守着这条。 */
const GROUPS = [
  /* ⚠ 标签**不许写死人数**（早先写「主角六位」，实际是 7 位 ⇒ 标题与正文打架）。
     人数由 `<small>N 位</small>` 现算。 */
  { key: 'cast', label: '主角' },
  { key: 'relatives', label: '家人' },
  { key: 'descendants', label: '后辈' },
  { key: 'officers', label: '宗门职务' },
  { key: 'contacts', label: '旧相识' },
];

function personRow(person) {
  return `<div class="viz-person${person.known ? '' : ' unknown'}">
    <span class="viz-person-name">${esc(person.name)}<small class="viz-person-role">${esc(person.role)}</small></span>
    <span class="viz-person-status ${STATUS_CLASS[person.status] || ''}">${esc(person.statusLabel)}</span>
    <span class="viz-person-bond mono">${person.known ? person.bond : '—'}</span>
  </div>`;
}

function group(title, people) {
  if (!people.length) return '';
  const rows = people.map(personRow).join('');
  return `<section class="viz-people-group">
    <h4 class="viz-sub">${esc(title)}<small>${people.length} 位</small></h4>
    <div class="viz-people">${rows}</div>
  </section>`;
}

export function renderPeople(people) {
  const sections = GROUPS.map(entry => group(entry.label, people[entry.key])).join('');
  const family = people.family;
  const properties = people.properties.map(property => `<div class="viz-property ${esc(property.status)}">
    <span class="viz-property-name">${esc(property.name)}</span>
    <span class="viz-property-value">${esc(property.status === 'kept' ? '保有' : property.status === 'damaged' ? '损坏' : '已失去')} · 价值 ${property.value}</span>
  </div>`).join('');
  const deaths = people.knownDeaths.length
    ? `<p class="viz-hint">已故：${people.knownDeaths.map(id => {
      const person = people.all.find(row => row.id === id);
      return esc(person ? person.name : id);
    }).join('、')}</p>`
    : '';
  return `
    <div class="viz-people-summary">
      <span>家人羁绊 <b class="mono">${family.bond}</b></span>
      <span>家中积蓄 <b class="mono">${family.reserve}</b></span>
      <span>家中银钱 <b class="mono">${family.money}</b></span>
      <span>家产 <b class="mono">${people.properties.length}</b> 处</span>
    </div>
    ${deaths}
    ${sections}
    ${properties ? `<h4 class="viz-sub">家产</h4><div class="viz-properties">${properties}</div>` : ''}`;
}
