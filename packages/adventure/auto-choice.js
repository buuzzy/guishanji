import {hashText} from '../core/random.js';
// Accept only the visible IDs and enabled flags, never probability or rewards.
export function autoChoice(seed,cursor,visible){
 const pool=visible.filter(o=>o.enabled).map(o=>o.id);if(!pool.length)return null;
 return pool[hashText(seed+':automatic-choice:'+cursor)%pool.length];
}
