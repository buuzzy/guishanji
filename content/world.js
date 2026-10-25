/** Original setting. All quantities below are authored game parameters. */
export const GAME_VERSION = '0.2.0';
export const RULES_VERSION = 'shanhai-rules-2';
export const CONTENT_VERSION = 'shanhai-world-2';
export const SAVE_VERSION = 1;
export const ENTRY_PRACTICE = 12;
export const ENTRY_COST = Object.freeze({ stones: 12, herbs: 3 });
export const ATTUNE_COST = Object.freeze({ stones: 6, herbs: 8 });
export const HOME_STYLES = Object.freeze({
  plain: { name: '草庐', stones: 0, practice: 1 },
  bamboo: { name: '竹舍', stones: 8, practice: 1.04 },
  stone: { name: '石室', stones: 24, practice: 1.1 },
  cloud: { name: '云台', stones: 48, practice: 1.16 },
});
export const ATTRIBUTES = Object.freeze([
  { id: 'health', name: '体魄', meaning: '当前健康与伤势；归零会身故，疗伤与休养可恢复。也影响突破机会。' },
  { id: 'mind', name: '心境', meaning: '情绪与专注的稳定程度；影响修炼效率和突破机会，丧亲与受伤会降低。' },
  { id: 'insight', name: '悟性', meaning: '读书与理解功法的能力；加快引气练习和修为积累。入道还需要学功法、练习和材料。' },
  { id: 'craft', name: '技艺', meaning: '谋生与制作的熟练程度；提高收入，20 点可炼丹、交换心得，30 点可授徒。' },
]);

export const REGIONS = Object.freeze([
  { id: 'hegu', name: '青禾谷', short: '青禾', x: 27, y: 67, biome: 'valley', color: '#719b76', description: '水田沿着溪流延伸，药农与凡人家族在此安居。', activity: '药圃、山路与炊烟', living: 58, herbs: 1.3, spirit: 0.9 },
  { id: 'landu', name: '岚渡山', short: '岚渡', x: 42, y: 30, biome: 'mountain', color: '#84a59e', description: '长风穿过山门，师承与修行在云雾间延续。', activity: '山门、松林与钟声', living: 70, herbs: 0.8, spirit: 1.12 },
  { id: 'zhaoshi', name: '照石关', short: '照石', x: 65, y: 50, biome: 'rock', color: '#b19a70', description: '匠人守着炉火，往来的旅人交换矿石与故事。', activity: '器坊、关隘与炉火', living: 78, herbs: 0.7, spirit: 1.02 },
  { id: 'mulan', name: '暮澜港', short: '暮澜', x: 75, y: 78, biome: 'coast', color: '#789fac', description: '船帆驶向远方，商路带来机会，也带来离别。', activity: '渡口、坊市与潮声', living: 84, herbs: 0.9, spirit: 0.96 },
  { id: 'wenxue', name: '问雪岭', short: '问雪', x: 72, y: 18, biome: 'snow', color: '#abb7ae', description: '雪线之上灵气清冷，来客须为长路做好准备。', activity: '雪松、古道与天光', living: 90, herbs: 1.05, spirit: 1.22 },
]);

export const FACTIONS = Object.freeze([
  { id: 'songyin', name: '松隐门', region: 'landu', type: 'sect', color: '#619482', discipline: '医药与守约', description: '重视根基，也看重弟子如何照顾身边的人。', technique: 'pine', income: 14 },
  { id: 'zhaochuan', name: '照川院', region: 'zhaoshi', type: 'sect', color: '#a69065', discipline: '剑修与担当', description: '愿意传授护身之术，要求弟子承担行路与守望。', technique: 'river', income: 17 },
  { id: 'yaohui', name: '青禾药会', region: 'hegu', type: 'guild', color: '#769765', discipline: '技艺与生计', description: '药师、农人与行商相互扶持，靠手艺留下名字。', technique: 'herbal', income: 9 },
]);

export const ORIGINS = Object.freeze([
  { id: 'herbal', name: '药农之家', weight: 26, region: 'hegu', money: 140, stones: 2, herbs: 5, description: '家中经营一小片药田。父母教你辨认叶脉，也教你记住四时。', profession: '药农', craft: 8 },
  { id: 'farmer', name: '山村人家', weight: 25, region: 'hegu', money: 85, stones: 0, herbs: 2, description: '你的家在溪边。收成随雨水变化，日子靠一家人共同承担。', profession: '农人', craft: 2 },
  { id: 'artisan', name: '匠人之家', weight: 20, region: 'zhaoshi', money: 180, stones: 3, herbs: 1, description: '你在炉火与敲打声中长大。父母相信，熟练的双手能托住一个家。', profession: '匠人', craft: 12 },
  { id: 'merchant', name: '渡口商户', weight: 18, region: 'mulan', money: 260, stones: 6, herbs: 2, description: '家中铺面迎来送往。你很早就听过远山、坊市和不同的人生。', profession: '行商', craft: 5 },
  { id: 'ward', name: '山门寄养', weight: 11, region: 'landu', money: 110, stones: 5, herbs: 3, description: '一位守山人将你抚养长大。你不清楚自己的来处，却有人为你留着灯。', profession: '守山人', craft: 4 },
]);

export const ROOTS = Object.freeze([
  { id: 'single', name: '清灵根', weight: 12, affinity: 1.2, description: '灵息较易汇聚，仍须功法、资源与心境相合。' },
  { id: 'dual', name: '双灵根', weight: 30, affinity: 1.06, description: '两种灵息相伴，适合在长期练习中寻找自己的节奏。' },
  { id: 'mixed', name: '杂灵根', weight: 43, affinity: 0.89, description: '凝聚灵息需要更多耐心，技艺与机缘也能打开道路。' },
  { id: 'none', name: '未见灵根', weight: 15, affinity: 0, description: '天生难以留住灵息。18 岁后悟性达到 40，可用 6 灵石、8 灵草尝试通窍，再按入门步骤修行；也可继续凡人的生活。通窍是本作的架空设定。' },
]);

export const REALMS = Object.freeze([
  { id: 'mortal', name: '凡身', short: '凡', lifespan: 86, threshold: 0, stones: 0, herbs: 0, income: 0, growth: 0 },
  { id: 'qi', name: '炼气', short: '气', lifespan: 118, threshold: 100, stones: 38, herbs: 5, income: 16, growth: 1 },
  { id: 'foundation', name: '筑基', short: '基', lifespan: 200, threshold: 180, stones: 125, herbs: 10, income: 34, growth: 1.15 },
  { id: 'core', name: '金丹', short: '丹', lifespan: 340, threshold: 270, stones: 300, herbs: 18, income: 64, growth: 1.3 },
  { id: 'nascent', name: '元婴', short: '婴', lifespan: 560, threshold: 430, stones: 650, herbs: 30, income: 112, growth: 1.48 },
  { id: 'spirit', name: '化神', short: '神', lifespan: 900, threshold: 620, stones: 1500, herbs: 50, income: 190, growth: 1.62 },
]);

export const TECHNIQUES = Object.freeze([
  { id: 'breath', name: '调息篇', affinity: 0.96, description: '简单的入门法，帮助你听见体内的灵息。' },
  { id: 'pine', name: '松风养元诀', affinity: 1.08, description: '循序渐进，注重调息与修复。' },
  { id: 'river', name: '照川行气法', affinity: 1.12, description: '灵息如水，适合在行动与修行之间求平衡。' },
  { id: 'herbal', name: '青禾调息法', affinity: 1.02, description: '从草木与四时中学习缓慢积累。' },
]);

export const FOCUS = Object.freeze([
  { id: 'learn', name: '识字求知', glyph: '书', description: '读书、请教，积累悟性与见识。', minAge: 0 },
  { id: 'family', name: '照顾牵挂', glyph: '缘', description: '与亲友相处，守住身边人的生活。', minAge: 0 },
  { id: 'craft', name: '磨炼技艺', glyph: '艺', description: '练习手艺，获得收入与修行材料。', minAge: 6 },
  { id: 'cultivate', name: '调息修炼', glyph: '修', description: '先学习调息，再按月练习引气；进入炼气后积累修为。', minAge: 12, cultivation: true },
  { id: 'explore', name: '行路历练', glyph: '行', description: '走入山野，遇见资源、机会与风险。', minAge: 12 },
]);

export const ITEMS = Object.freeze([
  { id: 'herbs', name: '灵草', glyph: '草', description: '2 株疗伤；3 株入道；3 株炼一枚养元丹；还用于通窍和突破。', price: 2 },
  { id: 'pill', name: '养元丹', glyph: '丹', description: '服一枚恢复 30 体魄、5 心境；技艺 20 可用 3 灵草、1 灵石自行炼制。', price: 8 },
  { id: 'charm', name: '护身符', glyph: '符', description: '遇险时减轻一次伤势。', price: 12 },
  { id: 'sword', name: '青锋剑', glyph: '剑', description: '行路时的一份依靠，增加历练的收获。', price: 28 },
  { id: 'book', name: '手抄丹书', glyph: '卷', description: '记载药材与火候，加快技艺积累。', price: 22 },
  { id: 'lamp', name: '长明灯', glyph: '灯', description: '为洞府和记忆留一盏灯。', price: 8 },
]);

export const ENDINGS = Object.freeze({
  ascension: { title: '长风入天门', subtitle: '你终于越过此界的山河。留下的牵挂，仍在别人的一生里延续。', seal: '飞升' },
  artisan: { title: '一炉火，照见一生', subtitle: '手艺留在书页、器物和后来者手中。你的名字有了自己的去处。', seal: '匠心' },
  family: { title: '灯火有人承', subtitle: '你将许多年留给了身边的人。有人记得你的声音，也有人接过你的灯。', seal: '家缘' },
  guardian: { title: '山河记得你', subtitle: '风雨来时，你曾为别人留出一条路。那些相助，成为另一种传承。', seal: '守望' },
  wanderer: { title: '走过山海之间', subtitle: '你见过不同的山门、潮水与人家。行路的记忆，让此生有了辽阔的形状。', seal: '远行' },
  teacher: { title: '松下有新声', subtitle: '你把自己的积累交给后来者。一次授业，可能延续到你看不见的年月。', seal: '传承' },
  quiet: { title: '人间一盏茶', subtitle: '此生有平常的清晨，也有独属于你的相遇。岁月至此，仍值得记下。', seal: '安然' },
  fallen: { title: '风止在归途', subtitle: '你的行路停在这里。曾经做出的选择，已经留在这片山河。', seal: '未竟' },
});

export const FAMILY_NAMES = ['许', '沈', '温', '苏', '江', '陆', '程', '顾', '叶', '林', '孟', '方'];
export const GIVEN_NAMES = ['云舟', '知微', '清禾', '予安', '南枝', '望舒', '景行', '听澜', '见山', '照宁', '时雨', '怀川', '疏桐', '归尘', '松月', '青岑', '闻溪', '长宁'];

export function regionById(id) { return REGIONS.find(item => item.id === id); }
export function factionById(id) { return FACTIONS.find(item => item.id === id); }
export function realmById(id) { return REALMS.find(item => item.id === id); }
export function focusById(id) { return FOCUS.find(item => item.id === id); }

/** Activities and numerical rules belong to this fictional world, not historical claims. */
export const LOCAL_ACTIVITIES = Object.freeze({
  hegu: { name: '在药圃采收', description: '花 1 个月，获得 5 灵草、1 技艺；每 3 个月可做一次。', costs: {}, herbs: 5, craft: 1 },
  landu: { name: '向山门请教调息', description: '花 1 个月，学习调息并增加 3 点引气练习；修士获得 5 修为、2 心境。', costs: {} },
  zhaoshi: { name: '接一单器坊修缮', description: '花 1 个月、20 铜钱买材料，获得 8 灵石、3 技艺。', costs: { money: 20 }, stones: 8, craft: 3 },
  mulan: { name: '随商队做一趟买卖', description: '花 1 个月、60 铜钱进货，获得 5 灵石、2 悟性。', costs: { money: 60 }, stones: 5, insight: 2 },
  wenxue: { name: '在雪岭药谷寻药', description: '花 1 个月；约 80% 减去当地风险影响后获得 9 灵草、4 灵石；失败损失 12 体魄。', costs: {} },
});
