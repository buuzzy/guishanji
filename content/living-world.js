/** Original fictional world parameters. These describe the actual simulation. */
export const WORLD_ERAS = {
  tide: {
    name: '灵潮复苏', year: 471, practice: 1.2, gateCost: 4, check: 3,
    description: '枯竭百年的灵脉重新涌动。新洞府接连出世，诸宗争夺泉眼与通路，凡人的城镇夹在宗门势力之间。',
    map: '四地尚有通航，跨界门掌握在宗门、港邦与书院手中。旧疆界正在被新灵脉打破。',
  },
  ebb: {
    name: '灵气衰退', year: 738, practice: 0.8, gateCost: 12, check: -4,
    description: '灵气逐年退潮，修炼场按境界限额开放。宗门封存灵泉，炉匠与药师成为维系城镇的人，域外的许诺也更容易诱人。',
    map: '大路仍在，界门耗费更多灵石。青岚守灵脉、临潮守航路、烬原守地火、浮屿守天图，没有一处能独自撑过寒潮。',
  },
  fracture: {
    name: '诸界断裂', year: 906, practice: 1, gateCost: 8, check: -1,
    description: '天穹曾经破碎，各大陆散落在界海两岸。漂移的门会带来遗迹，也会带来异界凶兽；修行者必须先学会认路。',
    map: '青岚、临潮、烬原与浮屿由不稳定界门相接。筑基能借守门人跨界，金丹才可进入未稳定的域外空间。',
  },
};
export const BIRTHPLACES = {
  home: {
    name: '青岚大陆', addresses: ['竹溪村', '清河城', '渡云山麓'],
    sect: '渡云宗', mountain: '渡云山', refuge: '望渡镇', art: 'EA',
    rule: '山民、散修与山门共用河谷；镜火盟正在吞并北境宗门。',
  },
  tide: {
    name: '临潮大陆', addresses: ['小潮湾', '听潮港', '碧礁岛'],
    sect: '听潮门', mountain: '碧礁山', refuge: '旧帆镇', art: 'SEA',
    rule: '城邦靠潮舟相连，港主与宗门共管潮阵；镜火盟在外海设卡。',
  },
  ember: {
    name: '烬原大陆', addresses: ['赤沙井', '流沙驿', '赤炉谷'],
    sect: '赤炉宗', mountain: '赤炉山', refuge: '荒灯镇', art: 'ME',
    rule: '灵脉稀薄，炉匠以地火养器；镜火盟正收购各城的炉心。',
  },
  sky: {
    name: '浮屿界', addresses: ['明霞屿', '悬桥市', '照星台'],
    sect: '悬灯院', mountain: '悬灯山', refuge: '落云镇', art: 'EA',
    rule: '书院、漂流岛与渡船结成松散联盟；镜火盟要把悬桥接入供奉阵。',
  },
};
export const FAMILIES = {
  common: { name: '普通人家', origin: 'village', stones: 24, text: '靠药田与手艺过活，能给你的钱不多，但家里愿意替你留一盏灯。' },
  noble: { name: '名门大户', origin: 'noble', stones: 106, text: '商路与家产让起步宽裕，也会引来征用、债约与争夺。' },
  clan: { name: '修仙世家', origin: 'clan', stones: 76, text: '家传护符与调息法能帮你入门，族中旧盟与敌人也会记得你的姓氏。' },
};
export const LIFE_GOALS = {
  free: { name: '先活过这一生', text: '不预定终点，遇到人和事之后再决定。' },
  dao: { name: '向大道问一次路', text: '追求修为与界外机缘，最后仍由你决定是否渡劫。' },
  protect: { name: '守住值得守的东西', text: '师门、同行者与各界的安危，都可能成为你愿意停下来的理由。' },
  wander: { name: '看遍山河与诸界', text: '离开出生地，结识异乡的人，找到能去也能回的路。' },
};
export const TRAINING_GROUNDS = [
  { id: 'valley', name: '回风谷', realm: 1, maxRealm: 1, location: 'home', description: '山门按届开放的炼气试炼。谷内有药坡、断涧与旧坛，师长守住外门，深入后要自己找退路。', invitation: 'trial_invitation' },
  { id: 'cavern', name: '沉星洞府', realm: 2, maxRealm: 2, description: '筑基修士可入的封闭遗迹。需要先在异乡安顿并获得路线，洞府会随潮汐合拢。', invitation: 'cavern_invitation' },
  { id: 'outer', name: '裂隙域外', realm: 3, maxRealm: 4, description: '金丹起才可承受的域外空间。须与异乡友人建立信任，携带定位之物；宝物与归途都可能被夺走。', invitation: 'outer_invitation' },
];
export const NEW_CAST = {
  trialmate: { name: '陶宁', role: '试炼同伴', born: -2 * 12, realm: 1, sex: 'M' },
};
export const EXTRA_ENDINGS = {
  trial_lost: { title: '谷中未归', text: '你没有走出那片修炼场。宝物留在闭合的阵中，同行者把你的名字带回了外门。这是一场选择造成的死亡，这一生到此结束。' },
  void_lost: { title: '界海无灯', text: '裂隙吞没了归途，你没能返回。你留下的退路与信仍被在世的人使用，却不会让你重新醒来。' },
  dao: { title: '问道有答', text: '你带着这一生留下的伤、名字与承诺走过道劫。门后没有替你抹去失去的人；所谓得道，是终于能守住自己选择的路。' },
  guardian: { title: '诸界守灯人', text: '你把界心留在两岸之间，让城镇、渡船与山门不再以活人为阵眼。余生守的是人能自由来往的世界，直到最后一盏灯交到别人手中。' },
  release: { title: '松下归寂', text: '你在漫长的一生之后放下未尽的争夺，把物件与路图交给后来的人。最后一夜山风很轻，亲友在旁，这一生安静地走到了尽头。' },
};
