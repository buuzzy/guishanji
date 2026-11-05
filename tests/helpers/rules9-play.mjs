export {decide,naturalSeed} from '../../scripts/play-cultivation.mjs';
import {playCultivation as currentPlay} from '../../scripts/play-cultivation.mjs';
export const playCultivation=input=>currentPlay({...input,rulesVersion:9});
