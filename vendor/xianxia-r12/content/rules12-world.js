export const BODY_TYPES={
 ordinary:{name:'常人体质',min:58,span:18,health:88,rate:1},
 frail:{name:'先天孱弱',min:45,span:18,health:70,rate:.88},
 sturdy:{name:'筋骨健壮',min:65,span:16,health:94,rate:1.04},
 mighty:{name:'天生神力',min:68,span:17,health:98,rate:1.04},
};
export const REGIONAL_METHODS={
 mountain:{name:'青岚引息诀',root:['木','土'],rate:1.07,detail:'借山林灵气温养经脉，先练吐纳与护身。'},
 frost:{name:'寒潮吐纳经',root:['水','金'],rate:1.08,detail:'在寒潮间收敛真气，先护住心脉，再练水雾与寒息。'},
 cinder:{name:'赤砂运火诀',root:['火','土'],rate:1.08,detail:'以细小地火练收放灵力，入门先学控火，不直接用烈焰冲脉。'},
 wind:{name:'浮岚引气篇',root:['木','金'],rate:1.07,detail:'配合山风练呼吸与身法，先稳住周天，再学御器。'},
 mountain_core:{name:'松岳剑心经',root:['木','金'],rate:1.18,detail:'山地剑宗的内门心法，以稳住气息配合剑势，须有教习带练。'},
 frost_core:{name:'回潮凝霜录',root:['水','金'],rate:1.19,detail:'海隅宗门以潮息凝练真气的全卷，寒气过重时必须停练。'},
 cinder_core:{name:'地火护脉经',root:['火','土'],rate:1.2,detail:'赤地丹宗的全卷，以丹火温养经脉，需辨认火候与药性。'},
 wind_core:{name:'风雷定息录',root:['木','金'],rate:1.18,detail:'悬岭宗门的护身心法，先练收束真气，后学驾风。'},
 ancient:{name:'归墟残照经',root:['水','木'],rate:1.24,detail:'外域石刻核实过的半部经文，强行跨过缺页会伤经脉。'},
 sealed:{name:'地脉借息术',root:['土','火'],rate:1.28,detail:'从地下封印借来的灵息，练习者每隔数年会被抽走精力。'},
};
export const SECT_PROFILES=[
 {id:'pine',region:'home',name:'松岳剑宗',base:'mountain',core:'mountain_core',style:'山林剑修，先练护身与御剑',source:'ancient'},
 {id:'spring',region:'home',name:'青泉阵门',base:'mountain',core:'mountain_core',style:'山泉阵修，以护阵与引水为业',source:'sealed'},
 {id:'ice',region:'tide',name:'寒汀宗',base:'frost',core:'frost_core',style:'海隅寒地，常练寒息与护脉',source:'ancient'},
 {id:'wave',region:'tide',name:'听澜水府',base:'frost',core:'frost_core',style:'依海取灵，以水法与潮阵守岛',source:'sealed'},
 {id:'furnace',region:'ember',name:'赤砂丹宗',base:'cinder',core:'cinder_core',style:'地火炼丹，辨药与控火是基础',source:'ancient'},
 {id:'rift',region:'ember',name:'地渊门',base:'cinder',core:'cinder_core',style:'守着旧地火井，以火法换取物资',source:'sealed'},
 {id:'gale',region:'sky',name:'浮岚宗',base:'wind',core:'wind_core',style:'悬岭风修，先学身法与护身',source:'ancient'},
 {id:'thunder',region:'sky',name:'悬雷书院',base:'wind',core:'wind_core',style:'高山风雷，以阵法保护来往修士',source:'sealed'},
];
