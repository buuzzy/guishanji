/** 地区与人物 —— 世界域（①）：世界本身怎么运转。
 *
 *  REGIONS 是五处落脚点（青岚两处 + 临潮 + 烬原 + 浮屿）。
 *  CAST 是故事里的六个人（师父、师姐、同门、友人、追猎者、守门人）。
 */

export const REGIONS = {
  home: { name: '青岚大陆', dwelling: '渡云山', caption: '旧山门与松间灯火', art: 'EA' },
  refuge: { name: '青岚大陆', dwelling: '望渡镇', caption: '山下流亡者的暂居地', art: 'EA' },
  tide: { name: '临潮大陆', dwelling: '听潮港', caption: '以潮汐驱动阵法的海上城邦', art: 'SEA' },
  ember: { name: '烬原大陆', dwelling: '流沙驿', caption: '灵气稀薄，匠人用地火养器', art: 'ME' },
  sky: { name: '浮屿界', dwelling: '悬桥书院', caption: '岛屿漂流，路会随着季风改变', art: 'EA' },
};

export const CAST = {
  master: { name: '闻竹', role: '师父', born: -96 * 12, realm: 3, sex: 'F' },
  sister: { name: '程照雪', role: '师姐', born: -7 * 12, realm: 2, sex: 'F' },
  friend: { name: '沈砚', role: '同门', born: -12, realm: 1, sex: 'M' },
  ally: { name: '嵇萝', role: '异乡友人', born: -12 * 12, realm: 2, sex: 'F' },
  rival: { name: '宋却', role: '追猎者', born: -20 * 12, realm: 2, sex: 'M' },
  keeper: { name: '白渡', role: '守门人', born: -78 * 12, realm: 3, sex: 'M' },
};
