// Historical browser gates retain their original rules11 scenarios.
// Default rules12 is exercised by the independent rules12 gates.
export * from '../../packages/adventure/engine.js';
import {createRun as latest} from '../../packages/adventure/engine.js';
export const createRun=input=>latest({...input,rulesVersion:input?.rulesVersion??11});
