/** 门面（原 content/adventure.js）—— 各域内容已拆开，本文件只做转发。
 *
 *  拆分的理由：这个文件原来把版本号、幕、地区、境界、技艺、道具、人物、
 *  冒险节点、结局全挤在一起，改一处要找半天。现在按六域拆开：
 *
 *    content/realms.js   境界与技艺（角色域）
 *    content/items.js    道具总表（世界域）
 *    content/regions.js  地区与人物（世界域）
 *    content/ends.js     版本号、幕、结局（因果域）
 *    content/nodes.js    冒险线节点表（因果域）
 *
 *  旧路径（from './adventure.js'）仍然能用 —— 仓里还有十几处这么写。
 *  Times are integer months.
 */
export {PREVIOUS_VERSION, PREVIOUS_CONTENT_REVISION, PREVIEW3_VERSION, PREVIEW3_CONTENT_REVISION, ADVENTURE_VERSION, CONTENT_REVISION, LEGACY_VERSION, LEGACY_CONTENT_REVISION, ACTS, ENDINGS} from './ends.js';
export {REALMS, SKILLS} from './realms.js';
export {REGIONS, CAST} from './regions.js';
export {ITEMS} from './items.js';
export {NODES} from './nodes.js';
