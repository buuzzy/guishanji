// Historical contract suites deliberately create frozen rules9 lives.
// New rules10 behavior is checked separately in story-rules10.test.mjs.
export * from '../../packages/adventure/engine.js';
import {createRun as currentCreateRun} from '../../packages/adventure/engine.js';
export const createRun=input=>currentCreateRun({...input,rulesVersion:9});
