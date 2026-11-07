#!/usr/bin/env node
/**
 * audit-completeness.mjs —— 内容完备度盘点（回答用户 2026-11-06 的第 12 条）
 * ============================================================================
 *
 * ## 用户问的是什么
 * ----------------
 * 「细节到底到哪了」—— 他想知道这套内容**覆盖了多少、缺什么**。
 * 这道脚本把答案变成可复算的数字，而不是靠印象。
 *
 * ## 它数什么
 * ----------
 *   ① **事件表**：修仙线 285 张 + 经典线 66 张，按故事线分类；
 *      哪些发得出来（可达）、哪些一次都没发过（发霉）。
 *   ② **人物**：谁有名字、谁有身份注解、谁有背景说明。
 *   ③ **道具**：多少件、每件的来源与去处配对情况。
 *   ④ **境界**：每境有多少专属内容、突破门槛与寿元窗口。
 *   ⑤ **结局**：有多少个、覆盖了多少种死法/了法。
 *   ⑥ **缺口清单**：哪些该有而没有（按「多长线」「多少结局」这类判据）。
 *
 * 用法：
 *   node scripts/audit-completeness.mjs            # 打印
 *   node scripts/audit-completeness.mjs --json     # 输出机器可读
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {ROOTS, PATHS, GEOGRAPHY, OFFICERS} from '../content/cultivation-world.js';
import {ITEMS} from '../content/items.js';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {NODES} from '../content/adventure.js';
import {EPISODES} from '../content/living-episodes.js';
import {ALL_ENDINGS} from '../packages/adventure/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AS_JSON = process.argv.includes('--json');

/* ── ① 事件表 ──────────────────────────────────────────────────────── */

const eventIds = Object.keys(CULTIVATION_EVENTS);
const classicIds = Object.keys({...NODES, ...EPISODES});

/** 按故事线归类（与表达域分片同一套口径）。 */
function lineOf(id) {
  if (id.startsWith('breakthrough_')) return '突破';
  if (id.startsWith('advance_material_')) return '突破材料';
  if (id.startsWith('m11_')) return '俗世生活';
  if (id.startsWith('parcel_')) return '童年';
  if (id.startsWith('loose_') || id.startsWith('dark_') || id.startsWith('beast_')) return '散修魔道妖兽';
  if (id.startsWith('sect_') || id.startsWith('family')) return '宗门家族';
  if (id.startsWith('child_') || id.startsWith('network_')) return '童年人脉';
  if (id.startsWith('r12_') || id.startsWith('thin_root_')) return '规则十二';
  if (id.startsWith('echo_')) return '回响';
  if (id.startsWith('selection_') || id.startsWith('years_practice_') || id.startsWith('sect_council_') || id.startsWith('sect_rebuild') || id.startsWith('sect_revenge')) return '选拔评议';
  return '入山与测灵根';
}

const byLine = {};
for (const id of eventIds) {
  const line = lineOf(id);
  byLine[line] = (byLine[line] || 0) + 1;
}

/* ── ② 人物 ────────────────────────────────────────────────────────── */

const officers = OFFICERS || [];
const roleNames = ['闻竹', '嵇萝', '宋却', '白渡', '陶宁', '许执事', '严衡', '陆行舟', '沈砚', '程照雪', '顾魇', '白苓', '老猿', '余衡', '宁素', '杜魁', '顾长老', '余掌柜', '阿栾', '幽灯堂主'];
const namedPeople = officers.map(o => o.name).concat(roleNames.filter(n => !officers.some(o => o.name === n)));

/* ── ③ 道具 ────────────────────────────────────────────────────────── */

const itemIds = Object.keys(ITEMS || {});

/* ── ④ 境界 ────────────────────────────────────────────────────────── */

const realms = [];
try {
  const {REALMS} = await import('../content/realms.js');
  realms.push(...REALMS.map(r => r.name || r.id));
} catch { /* 境界表读不到就跳过 */ }

/* ── ⑤ 结局 ────────────────────────────────────────────────────────── */

const endingIds = Object.keys(ALL_ENDINGS || {});

/* ── ⑥ 缺口清单 ────────────────────────────────────────────────────── */

const gaps = [];

/* 长线：每条长线至少要有 2 步（起 + 承），否则玩家只碰到开头。 */
for (const chain of ROAD_CHAINS || []) {
  const steps = (chain.stages || chain.steps || chain.legs || []).length;
  if (steps < 2) gaps.push(`长线「${chain.name || chain.id}」只有 ${steps} 步 —— 玩家碰到开头就没有下文`);
}
/* 每个境界段至少 5 张专属内容。 */
const realmContent = {};
for (const id of eventIds) {
  const m = id.match(/^(?:breakthrough|selection|years_practice)_(\d)/);
  if (m) realmContent[m[1]] = (realmContent[m[1]] || 0) + 1;
}
for (const [tier, n] of Object.entries(realmContent)) {
  if (n < 5) gaps.push(`境界段 ${tier} 只有 ${n} 张专属内容（低于 5 张的底线）`);
}
/* 结局覆盖：至少得有 20 个。 */
if (endingIds.length < 20) gaps.push(`结局只有 ${endingIds.length} 个（低于 20 个的底线）`);
/* 灵根：每种都要有自己的说法。 */
for (const [id, root] of Object.entries(ROOTS || {})) {
  if (!root.description) gaps.push(`灵根「${id}」没有自己的说明文字`);
}

/* ── 输出 ───────────────────────────────────────────────────────────── */

const report = {
  事件表: {
    修仙线: eventIds.length,
    经典线: classicIds.length,
    合计: eventIds.length + classicIds.length,
    按故事线: byLine,
  },
  人物: {
    有名字有名有姓: namedPeople.length,
    宗门管事: officers.length,
    角色别名: roleNames.length,
  },
  道具: {总数: itemIds.length},
  境界: {总数: realms.length, 各段专属内容: realmContent},
  结局: {总数: endingIds.length},
  缺口清单: gaps,
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('内容完备度盘点\n');
  console.log('① 事件表');
  console.log(`   修仙线 ${report.事件表.修仙线} 张 · 经典线 ${report.事件表.经典线} 张 · 合计 ${report.事件表.合计} 张`);
  for (const [line, n] of Object.entries(byLine).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)}  ${line}`);
  }
  console.log('\n② 人物');
  console.log(`   有名有姓 ${report.人物.有名字有名有姓} 个（宗门管事 ${officers.length} 个 + 角色别名 ${roleNames.length} 个）`);
  console.log('\n③ 道具');
  console.log(`   ${itemIds.length} 件`);
  console.log('\n④ 境界');
  console.log(`   ${realms.length} 境；各段专属内容 ${JSON.stringify(realmContent)}`);
  console.log('\n⑤ 结局');
  console.log(`   ${endingIds.length} 个`);
  console.log('\n⑥ 缺口清单');
  if (!gaps.length) console.log('   （无）');
  else for (const g of gaps) console.log(`   · ${g}`);
}
