import { summarize } from '../core/engine.js';
import { calendar, personAge } from '../core/state.js';
import { REALMS, regionById } from '../../content/world.js';
import { renderShareCard } from '../render/canvas.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/gu, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
export const relationLabel = relation => ({ mother: '母亲', father: '父亲', guardian: '抚养人', friend: '儿时同伴', partner: '伴侣', child: '孩子', mentor: '师长', student: '学生', elder: '山门长者', acquaintance: '相识之人' })[relation] || '故人';

export function annualCSV(state) {
  const rows = [['年龄', '纪年', '月份', '境界', '所在地域', '体魄', '心境', '技艺', '铜钱', '灵石']];
  for (const point of state.years) { const date = calendar(state, point.month); rows.push([point.age, date.year, date.month, REALMS[point.realm].name, regionById(point.location).name, point.health, point.mind, point.craft, point.money, point.stones]); }
  return '\uFEFF' + rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}

export async function sharePNG(state) {
  const canvas = document.createElement('canvas'); renderShareCard(canvas, state);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('纪念卡没有成功生成，请重试。')), 'image/png'));
}

export function biographyHTML(state) {
  const summary = summarize(state), card = document.createElement('canvas'); renderShareCard(card, state);
  const table = state.choices.map(item => '<tr><td>' + Math.floor(item.month / 12) + '岁</td><td>' + escapeHTML(item.title) + '</td><td>' + escapeHTML(item.label) + '</td></tr>').join('');
  const people = state.people.filter(person => !['elder', 'acquaintance'].includes(person.relation)).map(person => '<li><strong>' + escapeHTML(person.name) + '</strong> · ' + relationLabel(person.relation) + ' · ' + personAge(state, person) + '岁 · ' + (person.alive ? '在世' : '离世') + ' · ' + REALMS[person.realm].name + '</li>').join('');
  const log = state.log.filter(item => item.kind !== 'year').map(item => '<li><time>' + Math.floor(item.month / 12) + '岁 ' + item.month % 12 + '月</time><p>' + escapeHTML(item.text) + '</p></li>').join('');
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHTML(summary.name) + ' · 山海一生传记</title><style>body{margin:0;background:#f5f3e8;color:#4c6355;font:15px/1.9 system-ui,"Microsoft YaHei",sans-serif}main{max-width:850px;margin:40px auto;padding:0 25px}h1,h2{font-family:"Songti SC",SimSun,serif;color:#304c43;font-weight:500}h1{font-size:40px}h2{border-bottom:1px solid #d2dccc;padding-bottom:12px;margin-top:36px}img{width:300px;max-width:100%;float:right;margin:0 0 25px 25px;border-radius:8px}time{color:#879680;font-size:12px}li{margin-bottom:15px}p{margin:6px 0}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #d9e1d1;padding:12px;text-align:left}footer{clear:both;margin:40px 0;font-size:12px;color:#88977f}@media(max-width:600px){img{float:none;width:100%;margin:10px 0}h1{font-size:32px}}@media print{body{background:#fff}main{margin:0;max-width:none}img{width:220px}li,tr{break-inside:avoid}h2{break-after:avoid}}</style></head><body><main><p>山海一生 · 此生传记</p><h1>' + escapeHTML(summary.name) + '</h1><img alt="原创山水纪念卡" src="' + card.toDataURL('image/png') + '"><p>' + escapeHTML(state.ending?.title || '此生未完') + ' · ' + summary.age + '岁 · ' + summary.realm + '</p><p>' + escapeHTML(state.ending?.subtitle || '这段人生仍在继续。') + '</p><p>' + escapeHTML(state.birth.story) + '</p><p>此生走过：' + summary.places.map(escapeHTML).join('、') + '。</p><p>共作出 ' + summary.decisions + ' 次抉择，成功突破 ' + summary.stats.breakthroughs + ' 次，传授过 ' + summary.stats.students + ' 位学生。</p><h2>牵挂的人</h2><ul>' + people + '</ul><h2>此生的取舍</h2><table><thead><tr><th>年龄</th><th>遇见的事</th><th>你的回应</th></tr></thead><tbody>' + table + '</tbody></table><h2>一路经历</h2><ul>' + log + '</ul><footer>原创架空游戏记录 · 版本 ' + escapeHTML(state.version) + ' · 种子 ' + escapeHTML(state.seed) + '<br>此文件可离线阅读，也可通过浏览器打印另存为 PDF。</footer></main></body></html>';
}
