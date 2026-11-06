/**
 * 表达域 · 入口
 * ============================================================================
 *
 * 表达域回答的是「这件事**怎么说**」，不回答「发生了什么、有什么后果」。
 *
 * 这里做三件事：
 *   1. 把各条故事线的分片汇总成一张表（`ROWS`）和一张动态文本表（`DYNAMIC`）；
 *   2. `makeReadable(nodes)` 把规则层给的节点换成人话版本；
 *   3. 两个人名相关的修补（同行者死了要换称呼、死人不再被算进效果）。
 *
 * ⚠ 各分片文件只放**内容**（标题 / 正文 / 选项提示语），
 *   这里的 `makeReadable` 只做**装配** —— 别把剧情写进这个文件。
 */
import {rows as MAINLINE_ROWS, dynamic as MAINLINE_DYNAMIC} from './mainline.js';
import {rows as TIDE_ROWS, dynamic as TIDE_DYNAMIC} from './tide.js';
import {rows as EMBER_ROWS, dynamic as EMBER_DYNAMIC} from './ember.js';
import {rows as SKY_ROWS, dynamic as SKY_DYNAMIC} from './sky.js';
import {rows as JOURNEY_ROWS, dynamic as JOURNEY_DYNAMIC} from './journey.js';
import {rows as HOMECOMING_ROWS, dynamic as HOMECOMING_DYNAMIC} from './homecoming.js';
import {rows as DEMONIC_ROWS, dynamic as DEMONIC_DYNAMIC} from './demonic.js';
import {rows as TRIAL_ROWS, dynamic as TRIAL_DYNAMIC} from './trial.js';
import {rows as CAVERN_ROWS, dynamic as CAVERN_DYNAMIC} from './cavern.js';
import {rows as OUTER_ROWS, dynamic as OUTER_DYNAMIC} from './outer.js';
import {rows as BEAST_ROWS, dynamic as BEAST_DYNAMIC} from './beast.js';
import {rows as CULTIVATION_ROWS, dynamic as CULTIVATION_DYNAMIC} from './cultivation.js';
import {PEOPLE_BACKGROUNDS} from './people.js';

/* 人物背景也放在表达域里 ⇒ 这里一并带出去（小程序端要显示「这个人是谁」）。 */
export {PEOPLE_BACKGROUNDS};

/* 各故事线的分片汇总。⚠ 加新线时：先建分片文件，再在这里加一行。 */
export const ROWS = {
  ...MAINLINE_ROWS, ...TIDE_ROWS, ...EMBER_ROWS, ...SKY_ROWS,
  ...JOURNEY_ROWS, ...HOMECOMING_ROWS, ...DEMONIC_ROWS, ...TRIAL_ROWS,
  ...CAVERN_ROWS, ...OUTER_ROWS, ...BEAST_ROWS, ...CULTIVATION_ROWS,
};
export const DYNAMIC = {
  ...MAINLINE_DYNAMIC, ...TIDE_DYNAMIC, ...EMBER_DYNAMIC, ...SKY_DYNAMIC,
  ...JOURNEY_DYNAMIC, ...HOMECOMING_DYNAMIC, ...DEMONIC_DYNAMIC, ...TRIAL_DYNAMIC,
  ...CAVERN_DYNAMIC, ...OUTER_DYNAMIC, ...BEAST_DYNAMIC, ...CULTIVATION_DYNAMIC,
};

/**
 * 把规则层给的节点换成人话版本。
 *
 * 规矩：
 *   · 表达域里必须有这条，且**选项提示语的数量要和规则层的选项一样多**
 *     —— 对不上直接报错（这是「内容漏了」最早的信号）。
 *   · 正文写好了就直接用；没写好（null）就按当时的情形现写一段。
 */
export function makeReadable(nodes) {
  return Object.fromEntries(Object.entries(nodes).map(([id, node]) => {
    const row = ROWS[id];
    if (!row || row[2].length !== node.choices.length) throw new Error('Missing readable scene: ' + id);
    const dyn = DYNAMIC[id];
    const text = row[1] || (dyn ? (state) => dyn(node, state) : (state) => contextualScene(id, node, state));
    return [id, { ...node, title: row[0], text:s=>adaptCompanion(typeof text==='function'?text(s):text,s), choices: node.choices.map((c, i) => ({ ...c, hint: row[2][i], effects:s=>safePeople(typeof c.effects==='function'?c.effects(s):c.effects,s), reply:s=>adaptCompanion(typeof c.reply==='function'?c.reply(s):c.reply,s), ...(c.check?{check:{...c.check,failure:s=>safePeople(typeof c.check.failure==='function'?c.check.failure(s):c.check.failure,s),failText:s=>adaptCompanion(typeof c.check.failText==='function'?c.check.failText(s):c.check.failText,s)}}:{}), ...(id==='foundation'&&c.id==='medicine'?{label:'用随身药材调养，尝试筑基'}:{}), ...(id==='retreat'&&c.id==='nascent'?{cost:s=>s.life?.feedback?{items:['ember_engine']}:{}}:{}) })) }];
  }));
}

/* 同行者死了 ⇒ 文中提到她时换成中性说法。 */
function adaptCompanion(text,s){
  return String(text||'').replaceAll('嵇萝',s.people.ally.status==='dead'?'接应的修士':'嵇萝');
}

/* 已经死了的人，不该再出现在效果里。 */
function safePeople(input,s){
 const effect=JSON.parse(JSON.stringify(input||{}));
 for(const id of Object.keys(effect.people||{}))if(s.people[id]?.status==='dead')delete effect.people[id];
 return effect;
}

/* 表达域没写正文、这条线也没专门的动态文本 ⇒ 退回规则层自己的说法。 */
function contextualScene(id,node,s) {
  return typeof node.text==='function'?node.text(s):node.text;
}
