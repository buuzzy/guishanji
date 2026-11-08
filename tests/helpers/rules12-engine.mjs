// 所有测试都在**当前唯一在跑的规则版本（十二）**上跑。
// 旧档一律拒收 ⇒ 没有「再冻结一个旧版本」这回事。
export * from '../../packages/adventure/engine.js';
import {createRun as currentCreateRun} from '../../packages/adventure/engine.js';
export const createRun=input=>currentCreateRun({...input,rulesVersion:12});
