import { createStreams, random } from '../core/random.js';
import { BIRTHPLACES, WORLD_ERAS, FAMILIES, LIFE_GOALS } from '../../content/living-world.js';
import { NOVEL_NAMES } from '../../content/novel-names.js';

const take = (state, list) => list[Math.floor(random(state, 'birth') * list.length)];
export function birthConfiguration(seed, overrides = {}) {
  const temporary = { random: createStreams(seed) };
  const era = take(temporary, Object.keys(WORLD_ERAS));
  const continent = take(temporary, Object.keys(BIRTHPLACES));
  const family = take(temporary, Object.keys(FAMILIES));
  const address = take(temporary, BIRTHPLACES[continent].addresses);
  const selected = take(temporary, NOVEL_NAMES);
  const name = selected.name;
  const sex = selected.sex;
  const root = take(temporary, overrides.classic ? ['松骨灵根', '水木灵根', '金火灵根', '三相灵根'] : ['水木灵根','金火灵根','三相灵根','三相灵根','五行杂灵根','五行杂灵根','未显灵根','松骨灵根']);
  const goal = overrides.goal || 'free';
  if (!Object.hasOwn(LIFE_GOALS, goal)) throw new Error('这一生的志向无效。');
  return {
    birth: { era, continent, family, address, startAge: 0, year: WORLD_ERAS[era].year, goal },
    name: overrides.name?.trim() || name, sex: overrides.sex || sex, root,
    origin: overrides.origin || FAMILIES[family].origin,
    random: temporary.random,
  };
}
/** A pure preview: the wheel and createRun use identical seed-derived facts. */
export function birthFacts(seed, overrides) {
  const config = birthConfiguration(seed, overrides);
  const { birth } = config;
  return { ...birth, name: config.name, sex: config.sex, root: config.root, origin: config.origin, world: WORLD_ERAS[birth.era], place: BIRTHPLACES[birth.continent], household: FAMILIES[birth.family] };
}
export const classicBirthFacts = (seed,overrides={}) => birthFacts(seed,{...overrides,classic:true});
