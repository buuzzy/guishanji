/**
 * map.js —— 世界结构图（画的部分）
 * ============================================================================
 *
 * ## 和游戏里那张画不一样在哪
 * --------------------------------
 * 游戏那张（`apps/preview/continent-atlas.js`）是**玩家视角**：
 * 没去过、也不在的地方**故意不画**，免得剧透。
 *
 * 这里是**开发者视角** ⇒ 四块大陆全画，标出：
 *   · 当前在哪、走过哪些、知道但没去、连听说过都没有
 *   · 哪条路被封了（×）、哪些路线真的走过
 *
 * ⚠ 这张图**不是点阵山海图**（那是玩家端的画面）：
 *   点阵那套要动 `apps/preview/continent-atlas.js` 与小程序端两份实现
 *   （还牵动画面门禁与包体台账）⇒ 本轮不碰。
 *   ⇒ 这里补的是**内容维度**：每块大陆的地名 / 描述 / 特产，
 *     以及「现在去哪儿」（路费 / 耗时 / 为什么去不了）。
 *
 * 位置用 `GEOGRAPHY` 里的坐标（那是内容的唯一来源，不是这里编的）。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const W = 80, H = 52;

/* 颜色全在 CSS 里（浅色/深色两套）⇒ 这里只标状态，不写死颜色。 */
const NODE_CLASS = { current: 'current', visited: 'visited', known: 'known', unknown: 'unknown' };

export function renderMap(model) {
  const parts = [];
  const at = id => model.nodes.find(node => node.id === id);

  for (const edge of model.edges) {
    const from = at(edge.a), to = at(edge.b);
    if (!from || !to) continue;
    const cls = edge.closed ? 'closed' : edge.walked ? 'walked' : 'plain';
    parts.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="viz-map-edge ${cls}" />`);
    if (edge.closed) {
      parts.push(`<text x="${((from.x + to.x) / 2).toFixed(1)}" y="${((from.y + to.y) / 2).toFixed(1)}" class="viz-map-cross" text-anchor="middle">×</text>`);
    }
  }

  for (const node of model.nodes) {
    const cls = NODE_CLASS[node.status] || 'unknown';
    parts.push(`<circle cx="${node.x}" cy="${node.y}" r="2.1" class="viz-map-node ${cls}" />`);
    parts.push(`<text x="${node.x}" y="${node.y - 3.6}" class="viz-map-name" text-anchor="middle">${esc(node.name)}</text>`);
    if (model.birth === node.id) {
      parts.push(`<text x="${node.x}" y="${node.y + 5.2}" class="viz-map-birth" text-anchor="middle">出生地</text>`);
    }
  }

  const legend = [
    ['current', '当前'],
    ['visited', '走过'],
    ['known', '知道但没去'],
    ['unknown', '没听说过'],
  ].map(([key, text]) => `<span class="viz-map-key"><i class="viz-map-dot ${key}"></i>${text}</span>`).join('');

  /* ⚠ svg 与图例必须**包在同一个块里** ——
     否则它们会各占 grid 的一个格子，把「现在去哪儿」挤到下一行去。 */
  return `<div class="viz-map-block">
      <svg class="viz-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="世界结构与走过的路线">${parts.join('')}</svg>
      <div class="viz-map-legend">${legend}<span class="viz-map-key"><i class="viz-map-line walked"></i>走过</span><span class="viz-map-key"><i class="viz-map-line closed"></i>封了</span></div>
    </div>`;
}

/* ── 大陆详情（内容表原文） ───────────────────────────────────────────── */

/** 一块大陆的详情：地名 / 描述 / 特产 / 状态。 */
function continent(node, model) {
  const statusLabel = { current: '现在在这', visited: '走过', known: '知道但没去', unknown: '没听说过' }[node.status] || node.status;
  const places = node.places.length ? node.places.map(place => `<span class="viz-place">${esc(place)}</span>`).join('') : '<span class="viz-hint">—</span>';
  return `<div class="viz-continent ${node.status}">
    <div class="viz-continent-head">
      <b>${esc(node.name)}</b>
      <span class="viz-continent-status">${esc(statusLabel)}</span>
    </div>
    <div class="viz-continent-places">${places}</div>
    <p class="viz-continent-text">${esc(node.description)}</p>
    <p class="viz-continent-specialty"><span>特产</span>${esc(node.specialty)}</p>
  </div>`;
}

/** 「现在去哪儿」——路费 / 耗时 / 为什么去不了，全部由规则层给。 */
function destinations(model) {
  const rows = model.routes.map(route => {
    const path = route.path ? route.path.map(id => {
      const node = model.nodes.find(item => item.id === id);
      return node ? node.name : id;
    }).join(' → ') : '—';
    const detail = route.enabled
      ? `路费 ${route.fee} 灵石 · ${route.months} 个月`
      : `<span class="viz-map-blocked">${esc(route.reason)}</span>`;
    return `<div class="viz-dest ${route.enabled ? 'ok' : 'no'}">
      <span class="viz-dest-name">${esc(route.name)}</span>
      <span class="viz-dest-path">${esc(path)}</span>
      <span class="viz-dest-detail">${detail}</span>
    </div>`;
  }).join('');
  return `<div class="viz-dests">${rows}</div>`;
}

export function renderMapTab(model) {
  const continents = model.nodes.map(node => continent(node, model)).join('');
  return `
    <div class="viz-map-wrap">
      ${renderMap(model)}
      ${destinations(model)}
    </div>
    <h4 class="viz-sub">四块大陆</h4>
    <div class="viz-continents">${continents}</div>`;
}

