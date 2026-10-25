import { ageOf, calendar, personById, personAge } from '../../packages/core/state.js';
import { incomePreview, travelPreview } from '../../packages/core/engine.js';
import { REGIONS, FACTIONS, ITEMS, REALMS, regionById, factionById } from '../../content/world.js';
import { STORIES } from '../../content/stories.js';
import { escapeHTML as e, relationLabel } from '../../packages/media/exports.js';
import { button, ageLabel } from './views.js';
import { icon } from './icons.js';

const labels = { plain: ['草庐', 0], bamboo: ['竹舍', 8], stone: ['石室', 24], cloud: ['云台', 48] };
const canAct = state => state?.phase === 'life' && !state.pending;
const reason = state => !state ? '入世后可用' : state.phase !== 'life' ? '此生已经结束' : state.pending ? '先回应眼前的抉择' : '';
const dateLabel = (state, month) => { const date = calendar(state, month); return '山海历 ' + date.year + ' 年 ' + date.month + ' 月'; };
const exportButtons = (id = '') => '<div class="export-grid">' + [['png', '纪念卡 · PNG'], ['html', '完整传记 · HTML'], ['csv', '年度年表 · CSV'], ['json', '此生档案 · JSON']].map(([format, label]) => '<button type="button" class="button" data-action="export" data-format="' + format + '" data-life="' + e(id) + '">' + icon('download') + label + '</button>').join('') + '</div>';
const storyLabel = detail => Object.values(STORIES).flatMap(item => item.choices).find(item => item[0] === detail)?.[1] || detail;
const archiveName = state => e(state.player.name) + (state.forkOf ? ' <span class="pill neutral">文件副本</span>' : '');

function journal(state, data) {
  const filter = data.filter || 'all', limit = data.limit || 80, field = data.field || 'realm';
  const kinds = { all: null, choice: ['choice'], relationship: ['relationship', 'memory'], world: ['world'], cultivation: ['cultivation', 'risk', 'retreat'] };
  const entries = state.log.filter(item => !kinds[filter] || kinds[filter].includes(item.kind));
  const html = '<p class="small muted">' + e(state.player.name) + ' · ' + ageLabel(state) + ' · ' + state.choices.length + ' 次回应 · ' + state.log.length + ' 条经历</p><div class="filters" aria-label="经历筛选">' + Object.entries({ all: '全部经历', choice: '人生抉择', relationship: '亲友与牵挂', world: '世事变化', cultivation: '修行与风险' }).map(([key, label]) => '<button type="button" class="' + (filter === key ? 'active' : '') + '" data-action="journal-filter" data-filter="' + key + '">' + label + '</button>').join('') + '</div><label class="small muted">回望此生 <select id="curve-field" aria-label="年表曲线指标">' + Object.entries({ realm: '境界', health: '体魄', mind: '心境', craft: '技艺', stones: '灵石' }).map(([key, label]) => '<option value="' + key + '" ' + (field === key ? 'selected' : '') + '>' + label + '</option>').join('') + '</select></label><canvas class="chart" data-canvas="curve" data-field="' + field + '" aria-label="' + ageOf(state) + ' 年人生曲线；详细数据可下载年表 CSV"></canvas><ul class="timeline">' + entries.slice(-limit).reverse().map(entry => '<li><time>' + Math.floor(entry.month / 12) + ' 岁 ' + entry.month % 12 + ' 月 · ' + dateLabel(state, entry.month) + '</time><p>' + e(entry.text) + '</p></li>').join('') + '</ul>' + (entries.length > limit ? '<div class="center" style="margin-top:20px">' + button('journal-more', '再往前翻 · 还有 ' + (entries.length - limit) + ' 条') + '</div>' : '') + '<div class="modal-section">' + exportButtons(data.lifeId || '') + '</div>';
  return { title: '此生的年表', kicker: '每一步，都有来处', html };
}

function world(state) {
  const rows = REGIONS.map(region => {
    const detail = state.world.regions.find(item => item.id === region.id), preview = travelPreview(state, region.id);
    const here = region.id === state.player.location;
    const unavailable = reason(state) || (ageOf(state) < 12 ? '12 岁后可独自远行' : state.player.travel ? '行程尚未结束' : state.player.retreat ? '请先出关' : state.player.money < preview.money || state.player.stones < preview.stones ? '路资暂不足' : '');
    return '<article class="region-row"><div><h3>' + region.name + ' ' + (here ? '<span class="pill">此刻所在</span>' : '') + '</h3><p>' + region.description + '</p><p>繁荣 ' + Math.round(detail.prosperity) + ' · 风险 ' + Math.round(detail.danger) + (here ? '' : ' · 路程 ' + preview.months + ' 月 · ' + preview.money + ' 铜钱' + (preview.stones ? ' / ' + preview.stones + ' 灵石' : '')) + '</p>' + (unavailable && !here ? '<p>' + unavailable + '</p>' : '') + '</div><button type="button" class="button small" data-action="travel" data-to="' + region.id + '" ' + (here || unavailable ? 'disabled' : '') + '>' + (here ? '已在此处' : '前往此地') + '</button></article>';
  }).join('');
  const factions = FACTIONS.map(faction => {
    const current = state.world.factions.find(item => item.id === faction.id), leader = personById(state, current.leaderId);
    return '<article class="faction-row"><h4>' + faction.name + (state.player.faction === faction.id ? ' <span class="pill">你的师门</span>' : '') + '</h4><p>' + faction.description + '</p><p>职责：' + faction.discipline + ' · 积累 ' + Math.round(current.influence) + '</p><p>当前负责人：' + e(leader?.name || '待安排') + ' · ' + (leader ? REALMS[leader.realm].name : '') + '</p></article>';
  }).join('');
  return { title: '走过山河之间', kicker: state.world.era + '之年 · 这片天地也在前行', html: '<canvas class="map-canvas" data-canvas="map" aria-label="五地地图；下方列表可以选择目的地"></canvas><div class="region-list">' + rows + '</div><section class="modal-section"><h3>山门与同道</h3><div class="faction-grid">' + factions + '</div></section><section class="modal-section"><h3>历世大事</h3>' + (state.world.history.length ? '<ul class="timeline">' + state.world.history.slice(-30).reverse().map(entry => '<li><time>' + dateLabel(state, entry.month) + '</time><p>' + e(entry.text) + '</p></li>').join('') + '</ul>' : '<p class="small muted">世事才刚展开。往后的风雨、商路和交接会记在这里。</p>') + '</section>' };
}

function people(state) {
  const relevant = state.people.filter(person => person.relation !== 'elder');
  const rows = relevant.toSorted((a, b) => Number(b.alive) - Number(a.alive)).map(person => '<button type="button" class="person-row ' + (person.alive ? '' : 'departed') + '" data-action="person" data-person="' + e(person.id) + '"><canvas data-canvas="portrait" data-person="' + e(person.id) + '" aria-hidden="true"></canvas><span><strong>' + e(person.name) + '</strong><small>' + relationLabel(person.relation) + ' · ' + personAge(state, person) + ' 岁 · ' + REALMS[person.realm].name + '</small><small>' + regionById(person.location).name + ' · ' + (person.goal === 'cultivate' ? '追寻自己的修行' : '安排自己的生活') + '</small></span><span class="pill ' + (person.alive ? '' : 'neutral') + '">' + (person.alive ? '在世' : '已离世') + '</span></button>').join('');
  return { title: '此生牵挂的人', kicker: '相遇之后，他们也有自己的路', html: '<p class="small muted">' + relevant.filter(person => person.alive).length + ' 位仍在世，' + relevant.filter(person => !person.alive).length + ' 位留在记忆里。点击人物可回看对方的道路。</p><div class="person-list">' + rows + '</div>' };
}

function person(state, id) {
  const actor = personById(state, id);
  if (!actor) return { title: '这段相遇暂未找到', kicker: '此生的档案', html: button('people', '返回牵挂的人') };
  const history = actor.history.map(entry => {
    const text = ({ meet: '与你的这一生开始有了交集。', path: '开始自己的道路，在' + regionById(entry.location).name + (entry.realm ? '学习调息。' : '安排生计。'), realm: '经过自己的积累，迈入' + REALMS[entry.realm].name + '。', death: '这一段人生在此告一段落。' })[entry.kind];
    return '<li><time>' + dateLabel(state, entry.month) + ' · ' + Math.floor((entry.month - actor.bornMonth) / 12) + ' 岁</time><p>' + text + '</p></li>';
  }).join('');
  const memories = actor.memories.map(memory => '<li><time>你 ' + Math.floor(memory.month / 12) + ' 岁时</time><p>' + e(storyLabel(memory.detail)) + '</p></li>').join('');
  return { title: actor.name, kicker: relationLabel(actor.relation) + ' · ' + (actor.alive ? '仍在这片山河里' : '留在此生的记忆里'), html: '<div class="person-detail-head"><canvas data-canvas="portrait" data-person="' + e(actor.id) + '" aria-label="人物头像"></canvas><div><h3>' + e(actor.name) + ' · ' + personAge(state, actor) + ' 岁</h3><p class="small muted">' + REALMS[actor.realm].name + ' · ' + regionById(actor.location).name + ' · 寿元上限 ' + actor.lifespan + ' 岁</p><p class="small muted">彼此亲近 ' + Math.round(actor.bond) + ' / 100</p></div></div><h3>对方自己的道路</h3><ul class="timeline">' + history + '</ul><div class="modal-section"><h3>你们留下的相处</h3>' + (memories ? '<ul class="timeline">' + memories + '</ul>' : '<p class="small muted">日常相处正在积累，明确的托付与回应会记在这里。</p>') + '</div><div class="actions" style="margin-top:24px">' + button('people', '回到牵挂的人') + '</div>' };
}

function inventory(state) {
  const p = state.player, income = incomePreview(state);
  const items = ITEMS.map(item => {
    const amount = item.id === 'herbs' ? p.herbs : p.inventory[item.id], unique = ['sword', 'book', 'lamp'].includes(item.id), cost = item.price * (item.id === 'herbs' ? 5 : 1);
    const blocked = reason(state) || (ageOf(state) < 12 ? '12 岁后可独自交易' : unique && amount ? '已经备好' : p.stones < cost ? '灵石不足' : '');
    return '<article class="item"><span class="item-glyph">' + item.glyph + '</span><div><strong>' + item.name + ' <span class="small muted">× ' + amount + '</span></strong><small>' + item.description + '</small><small class="owned">' + (unique && amount ? '已在日常中使用' : '购入 ' + (item.id === 'herbs' ? '5 株' : '1 份') + ' · ' + cost + ' 灵石') + '</small>' + (blocked && !(unique && amount) ? '<small>' + blocked + '</small>' : '') + '</div><button type="button" class="button small" data-action="buy" data-item="' + item.id + '" ' + (blocked ? 'disabled' : '') + '>' + (unique && amount ? '已备' : '购入') + '</button></article>';
  }).join('');
  const healDisabled = !canAct(state) || p.herbs < 2 || p.health >= 99;
  const sellDisabled = !canAct(state) || p.herbs < 5 || ageOf(state) < 12;
  return { title: '坊市与行囊', kicker: '为日常与远行，留一份准备', html: '<p class="small muted">手边储备：' + p.money + ' 铜钱 · ' + p.stones + ' 灵石 · ' + p.herbs + ' 株灵草</p><div class="inventory-grid">' + items + '</div><div class="actions" style="margin-top:19px">' + button('heal', '药草疗伤 · 2 株 / 恢复 20 体魄', healDisabled ? 'disabled' : '') + button('sell', '出售 5 株灵草 · 换 5 灵石', sellDisabled ? 'disabled' : '') + '</div><section class="modal-section"><h3>一年生计</h3><p class="small">按当前重心与所在地域，年收入约 ' + income.money + ' 铜钱、' + income.stones + ' 灵石、' + income.herbs + ' 株灵草，家用 ' + income.living + ' 铜钱。' + (ageOf(state) < 16 ? '16 岁起开始自己的收入与支出。' : '随生活重心与当地境况重新计算。') + '</p>' + (p.debt ? '<p class="small">尚有欠账 ' + p.debt + ' 铜钱，将从收入中逐年偿还。</p>' : '') + '<div class="table-wrap"><table><thead><tr><th>年岁</th><th>收支缘由</th><th>铜钱</th><th>灵石</th><th>灵草</th></tr></thead><tbody>' + state.ledger.slice(-20).reverse().map(entry => '<tr><td>' + Math.floor(entry.month / 12) + ' 岁</td><td>' + e(entry.label) + '</td><td>' + entry.money + '</td><td>' + entry.stones + '</td><td>' + entry.herbs + '</td></tr>').join('') + '</tbody></table></div></section>' };
}

function home(state) {
  const p = state.player, disabled = !canAct(state) || ageOf(state) < 18;
  const styles = Object.entries(labels).map(([id, [label, price]]) => '<button type="button" class="style-button ' + (p.homeStyle === id ? 'active' : '') + '" data-action="home-style" data-style="' + id + '" aria-pressed="' + (p.homeStyle === id) + '" ' + (disabled || price > p.stones || p.homeStyle === id ? 'disabled' : '') + '><strong>' + label + '</strong><small>' + (p.homeStyle === id ? '此刻的住处' : price ? price + ' 灵石' : '随手整理') + '</small></button>').join('');
  const canRetreat = canAct(state) && p.realm && !p.travel && !p.retreat;
  let retreat = p.retreat ? '<p class="small">这段闭关已过 ' + (state.month - p.retreat.start) + ' 个月，还余 ' + (p.retreat.until - state.month) + ' 个月。</p><div class="actions" style="margin-top:15px">' + button('retreat-until', '推进至出关或下一件要事', state.pending ? 'disabled' : '') + button('leave-retreat', '提前出关', state.pending ? 'disabled' : '') + '</div>' : '<p class="small muted">一段专注的时光。闭关共用平常的年月；突破、家中消息与大事会使你停下来回应。</p><div class="retreat-years">' + [1, 3, 5, 10].map(years => '<button type="button" class="button small" data-action="retreat" data-years="' + years + '" ' + (!canRetreat ? 'disabled' : '') + '>' + years + ' 年闭关</button>').join('') + '</div>';
  if (!p.realm) retreat += '<p class="small muted" style="margin-top:12px">学会调息、踏入炼气后，可在此安排闭关。</p>';
  return { title: p.realm ? '山间一处洞府' : '为日子留一个家', kicker: regionById(p.location).name + ' · 归来时，总有一个位置', html: '<canvas class="home-canvas" data-canvas="home" aria-label="原创住处画面，显示已有物品与同住亲友"></canvas><p class="small muted">' + (ageOf(state) < 18 ? '成年后可以独自安排住处。' : '改造外观会花费列出的灵石；书、剑和灯也会显示在这里。') + '</p><div class="style-grid">' + styles + '</div><section class="modal-section"><h3>闭关与出关</h3>' + retreat + '</section>' + (p.keepsakes.length ? '<section class="modal-section"><h3>留下的旧物</h3><p class="small">' + p.keepsakes.map(e).join('、') + '</p></section>' : '') };
}

function history(data) {
  const lives = [...data.lives].reverse();
  return { title: '前世录', kicker: '已经走过的，仍值得翻阅', html: lives.length ? '<p class="small muted">' + lives.filter(state => state.phase === 'ended').length + ' 段终章，' + lives.filter(state => state.phase !== 'ended').length + ' 段仍可继续的人生。每段人生保留自己的完整经历。</p><div class="archive-list">' + lives.map(state => '<button type="button" class="archive-card" data-action="archive" data-life="' + state.id + '"><span class="seal">' + (state.ending?.seal || '未完') + '</span><div><h3>' + archiveName(state) + '</h3><p>' + e(state.ending?.title || '此生仍在途中') + ' · ' + state.birth.region + '</p><p>' + state.birth.root + ' · ' + state.choices.length + ' 次抉择</p></div><div class="right"><span>' + ageOf(state) + ' 岁</span><p>' + REALMS[state.player.realm].name + '</p></div></button>').join('') + '</div>' : '<div class="empty-state"><p class="serif">还没有落下第一笔</p><p>开启一世后，经历会自动留在本地档案。走过的终章和暂时停下的人生都能在这里找到。</p></div>' };
}

function archive(state, data) {
  return { title: state.player.name + ' · ' + (state.ending?.seal || '此生未完'), kicker: '这一生的档案', html: '<p class="intro">' + e(state.ending?.subtitle || '这段人生仍在山河之间，可以随时回来继续。') + '</p><p class="small muted">' + ageLabel(state) + ' · ' + REALMS[state.player.realm].name + ' · ' + state.choices.length + ' 次抉择</p><canvas class="map-canvas" data-canvas="scene" aria-label="这段人生的山水场景"></canvas><div class="actions" style="margin-top:18px">' + (state.phase !== 'ended' ? '<button type="button" class="button primary" data-action="activate-life" data-life="' + state.id + '">继续此生 ' + icon('arrow') + '</button>' : '') + '<button type="button" class="button" data-action="archive-journal" data-life="' + state.id + '">翻阅完整年表</button>' + button('history', '回到前世录') + '</div><div class="modal-section">' + exportButtons(data.lifeId) + '</div>' };
}

function vault(state, data) {
  const doc = data.document;
  const backup = data.backup;
  let html = '<p class="small muted">当前档案保留 ' + (doc?.lives.length || 0) + ' 段人生。新人生会另起记录，已有的人生不会被清空。</p>';
  html += '<div class="export-grid">' + (state ? '<button type="button" class="button" data-action="export" data-format="json">' + icon('download') + '导出本页进度</button>' : '') + '<button type="button" class="button" data-action="export-archive" ' + (!doc ? 'disabled' : '') + '>' + icon('download') + '导出全量档案</button><button type="button" class="button" data-action="export-raw">导出原档文字</button><button type="button" class="button" data-action="reload-save">读取最新档案</button></div><label class="file-label"><strong class="small">导入此生或全量档案</strong><input type="file" id="import-file" accept=".json,application/json"><small class="muted">支持本作导出的 JSON 文件。会保留其他人生；遇到同一人生的不同进度时提示冲突。</small></label>';
  html += '<section class="modal-section"><h3>上一次的备份</h3>' + (backup ? '<p class="small">' + backup.lives.length + ' 段人生，备份时间 ' + e(backup.updatedAt ? new Date(backup.updatedAt).toLocaleString('zh-CN') : '尚未记录') + '。</p><div class="actions" style="margin-top:14px">' + button('recover-backup', '恢复这份备份') + button('export-backup', '另存备份文件') + '</div>' : '<p class="small muted">' + e(data.backupError || '入世并保存后，下一次写入前会保留上一份档案。') + '</p>') + '</section><div class="notice">空间不足、文件损坏或其他页面更新时，会暂停自动推进并提示你。恢复备份前会另存当前原始数据；不会自动删除其他人生腾出空间。换浏览器或清除网站数据前，请先下载全量档案。</div>';
  if (data.preserved?.length) html += '<section class="modal-section"><h3>恢复前另存的原档</h3><div class="person-list">' + data.preserved.map(item => '<div class="region-row"><div><p>' + (item.lives === null ? '原文未能解析，仍已保留' : item.lives + ' 段人生的原档') + ' · ' + Math.round(item.characters / 1024) + ' 千字文字</p></div><button type="button" class="button small" data-action="export-preserved" data-snapshot="' + e(item.id) + '">另存这份原档</button></div>').join('') + '</div></section>';
  return { title: '把这段人生带走', kicker: '本地存档与跨设备转移', html };
}

export function dialogView(type, state, data = {}) {
  if (type === 'import-conflict') return { title: '同一人生，有了两份进度', kicker: '先保留，再选择怎样继续', html: '<p class="intro">浏览器与文件里的这段人生已经不同。可以将文件另存为副本继续，浏览器里的原进度仍会保留。</p><div class="person-list">' + data.conflicts.map(item => '<div class="notice"><strong>' + e(item.name) + '</strong><br>浏览器：' + item.currentAge + ' 岁，' + item.currentDecisions + ' 次抉择<br>文件：' + item.fileAge + ' 岁，' + item.fileDecisions + ' 次抉择</div>').join('') + '</div><div class="actions" style="margin-top:22px">' + button('import-fork', '保留两个进度，采用文件副本') + button('close-modal', '暂不导入') + '</div><p class="small muted" style="margin-top:16px">副本沿用文件中的人物、年月与机缘；已有的其他人生也会保留。</p>' };
  if (type === 'history') return history(data);
  if (type === 'vault') return vault(state, data);
  if (type === 'settings') return { title: '让岁月按你的节奏', kicker: '游玩偏好', html: '<label class="settings-row"><span><strong>山水明暗</strong><small>选择纸色，或在夜色中游玩。</small></span><span class="segmented"><button type="button" data-action="theme" data-theme="light" class="' + (data.preferences.theme === 'light' ? 'active' : '') + '">日色</button><button type="button" data-action="theme" data-theme="dark" class="' + (data.preferences.theme === 'dark' ? 'active' : '') + '">夜色</button></span></label><label class="settings-row"><span><strong>减少画面动态</strong><small>让云、水与人物安静下来，年月仍可推进。</small></span><input type="checkbox" id="reduced-motion" ' + (data.preferences.reduced ? 'checked' : '') + '></label><label class="settings-row"><span><strong>轻声山音</strong><small>原创五声音阶，默认关闭。</small></span><input type="checkbox" id="ambient-audio" ' + (data.preferences.audio ? 'checked' : '') + '></label><section class="modal-section"><h3>此生留档</h3><p class="small muted">在浏览器中保存；需要跨设备时，导出 JSON 再到另一台设备导入。</p><div class="actions" style="margin-top:15px">' + button('vault', icon('download') + ' 存档、备份与导入') + button('help', '阅读游玩指南') + '</div></section>' };
  if (type === 'help') return { title: '怎样走过这一生', kicker: '入山海之前，读几句话', html: '<p class="intro">来处由机缘生成，道路由你慢慢回应。修行与平常的日子，发生在同一段人生里。</p><ol class="help-list"><li><strong>先看看出生，给自己一个名字</strong><p>出身影响早年的资源，灵根影响调息的道路。可以重新看一份机缘，再按“以此身入世”。</p></li><li><strong>让岁月流转，遇事时停下来</strong><p>可以逐年度过，直接到下次抉择，或开启自动流转。每个重要抉择都要回应后才能继续；“随缘回应”会按当前重心选择一种可行回应，具体内容可在年表中查看。</p></li><li><strong>修行需要积累，也要准备资源</strong><p>12 岁时可以走近山门或药会，成年后有灵根的人也能自行入道。修为达到关口时自然出现突破抉择；灵石、灵草、体魄与心境都会影响准备。失败会消耗资源和修为，伤势可以用灵草恢复。</p></li><li><strong>亲友与世界，和你共用岁月</strong><p>闭关不会冻结别人的人生。你可以在“牵挂”查看同伴、师长、伴侣和孩子的道路，在“山河”旅行，在“坊市”准备物品，在“洞府”安排住处与闭关。</p></li><li><strong>平常的一生，也有完整的终章</strong><p>没有灵根也能经营生活、养育、传授技艺。终章按此生积累呈现，完整经历会留在前世录，也可以下载纪念卡与传记。</p></li><li><strong>带走存档，再去另一台设备</strong><p>本版本在浏览器本地保存，没有账号与云同步。请通过偏好中的存档入口下载 JSON，在另一台设备的同一游戏版本导入。清除网站数据前，先下载全量档案。</p></li></ol><div class="notice">键盘：<span class="shortcut">空格</span> 暂停 / 流转，<span class="shortcut">→</span> 度过一年。页面隐藏或打开详情时自动暂歇；保存失败时可以先导出本页进度。</div>' };
  if (type === 'about') return { title: '山海一生', kicker: '原创修仙人生 · Web 可玩原型 0.1.0', html: '<p class="intro">山河有常，人各有路。这里记录修行，也记录技艺、牵挂与平常的日子。</p><p class="small">世界、人物、剧情、像素画面与合成音乐均为独立编写的原创内容。境界、寿元与机会是架空游戏规则。</p><p class="small">当前版本提供可在浏览器游玩的完整人生闭环、独立本地档案和文件分享。公共传记、社区与云同步将按后续版本逐步建设。</p><div class="actions" style="margin-top:22px">' + button('help', '阅读游玩指南') + button('vault', '管理本地档案') + '</div>' };
  if (type === 'new-life') return { title: '再赴一场人生', kicker: '这一生可暂歇，下一生会另起一笔', html: '<p class="intro">' + e(state?.player.name || '') + ' 的经历会保留在档案里。另启一世后，仍可在前世录找到这段人生，回来继续。</p><div class="actions" style="margin-top:23px">' + button('prepare-new', '另启一世 ' + icon('arrow')) + button('close-modal', '继续眼前的人生') + '</div>' };
  if (!state) return { title: '入世后，再来看看', kicker: '山河正在等待', html: '<p>先开启一段人生，这里会随你的经历自然展开。</p><div class="actions" style="margin-top:20px">' + button('new-life', '赴一场人生') + '</div>' };
  if (type === 'world') return world(state);
  if (type === 'people') return people(state);
  if (type === 'person') return person(state, data.personId);
  if (type === 'inventory') return inventory(state);
  if (type === 'home') return home(state);
  if (type === 'journal' || type === 'archive-journal') return journal(state, data);
  if (type === 'archive') return archive(state, data);
  if (type === 'share') return { title: '留一份此生纪念', kicker: '山河与年月，都在这一页', html: '<canvas data-canvas="share" aria-label="此生 PNG 纪念卡预览" style="max-width:300px;margin:0 auto 23px;border:1px solid var(--line);border-radius:8px"></canvas>' + exportButtons() + '<p class="small muted" style="margin-top:18px">传记可离线阅读，也可用浏览器打印另存为 PDF。JSON 可用于恢复这一生，CSV 记录每年的实际数据。</p>' };
  return { title: '此生的山河', kicker: '', html: '' };
}
