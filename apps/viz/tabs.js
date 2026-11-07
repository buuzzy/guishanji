/**
 * tabs.js —— 页签的骨架（页签条 + 切换）
 * ============================================================================
 *
 * ## 为什么有页签
 * ----------------
 * 面板原来是一页四块：人生进程 / 决策框 / 当前状态 / 世界结构。
 * 加上道具、完整地图细节、世界观（宗门功法）、人物、流水之后，
 * 一页放不下 ⇒ 拆成页签。
 *
 * ## 布局上的分界（用户拍板，别乱挪）
 * ------------------------------------
 *   上面 = **操作层**：人生进程（轴 + 曲线）+ 决策框（吸顶）
 *           ⇒ 一直都在，边看轴边做决定这件事不能被打断。
 *   下面 = **检视层**：页签区（当前状态 / 道具 / 地图 / 世界观 / 人物 / 流水）
 *           ⇒ 一次看一个角度，但**轴一直在上面** ⇒ 切到「道具」页时，
 *             「拿到道具的那一年」仍然对得上。
 *
 * ⚠ 决策框的位置（右上、吸顶）是用户拍板的，`verify-viz-panel.mjs`
 *   里有布局断言守着它被挪走就报红。
 */

const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

/** 页签清单 —— id 与 model.js 的 builder 对应。 */
export const TABS = [
  { id: 'state', label: '当前状态', hint: '此刻这个人是什么样' },
  { id: 'items', label: '道具', hint: '全表 · 这条命碰到过哪几件、哪个月' },
  { id: 'map', label: '地图', hint: '四块大陆 · 地名 / 特产 / 通路 / 能去哪儿' },
  { id: 'world', label: '世界观', hint: '宗门 / 功法 / 境界 / 灵根 / 体质 / 时代' },
  { id: 'people', label: '人物', hint: '主角 / 家人 / 后代 / 旧相识 / 宗门高管' },
  { id: 'journal', label: '流水', hint: '一生的正文 + 每一次抉择 + 批量实测的覆盖度' },
];

/**
 * 画页签条。
 * @param {string} current 当前页签 id
 */
export function renderTabs(current) {
  const buttons = TABS.map(tab => {
    const active = tab.id === current;
    return `<button type="button" class="viz-tab${active ? ' active' : ''}" data-tab="${esc(tab.id)}" aria-current="${active ? 'page' : 'false'}" title="${esc(tab.hint)}">${esc(tab.label)}</button>`;
  }).join('');
  return `<div class="viz-tabbar" role="tablist" aria-label="观测视角">${buttons}</div>`;
}
