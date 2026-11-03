// Fictional rules informed by cultivation fiction; no novel plot is reproduced.
export const PATHS = {
 orthodox:{name:'宗门修士',home:'外门弟子院',teacher:'闻竹',description:'由宗门授业，受门规约束，以任务与考核取得资源。'},
 loose:{name:'散修',home:'坊市租屋',teacher:'游方药师',description:'自行买书、做工与结伴，修行材料需要自己筹集。'},
 demonic:{name:'魔修',home:'幽灯堂弟子院',teacher:'幽灯堂主',description:'修习禁术，堂中以实力分配资源，离开也可能被追索。'},
 beast:{name:'妖修',home:'山林石穴',teacher:'山中老猿',description:'以妖身修行，守住栖地，与同族和人类打交道。'},
 mortal:{name:'凡俗生活',home:'故乡旧屋',teacher:'村中先生',description:'做工、读书与照顾亲人，仍可能遇到修行机缘。'},
};
export const ROOTS = {
 '松骨灵根':{grade:3,rate:1.25,description:'单灵根，吸纳灵气较快，容易得到长老的培养。'},
 '水木灵根':{grade:2,rate:1.05,description:'双灵根，适合药田与丹术，需按部就班积累。'},
 '金火灵根':{grade:2,rate:1.05,description:'双灵根，适合御剑与炉火，仍要准备突破材料。'},
 '三相灵根':{grade:1,rate:.8,description:'杂灵根，入门较慢，常从外门任务起步。'},
 '五行杂灵根':{grade:0,rate:.55,description:'五行混杂，宗门可能只收为杂役，其他师承仍有机会。'},
 '未显灵根':{grade:-1,rate:.4,description:'常规测灵石未能发现灵根，需另寻功法或走凡俗道路。'},
};
export const ACTIVITIES = {
 study:{name:'读经',description:'读术法笔记，增长悟性与阵法基础；积累突破所需的修行。',skill:'array',insight:.35,progress:1},
 sword:{name:'练剑',description:'练习身法与御剑，提高实战本领。',skill:'sword',courage:.2,progress:1.2},
 alchemy:{name:'丹术',description:'照料药草、辨药与练习控火。',skill:'alchemy',progress:1.1},
 array:{name:'研阵',description:'学习布阵、制符与修复法器。',skill:'array',progress:1.1},
 work:{name:'做工',description:'接取杂务与手艺活，积攒生活和修行的钱。',skill:'alchemy',income:5,progress:.45},
 social:{name:'交游',description:'与同门、坊市熟人相处，增长仁心；修行积累较慢。',skill:'array',trainSkill:false,empathy:.3,progress:.55},
 rest:{name:'调养',description:'休息养伤，恢复体力与心境；修行积累较慢。',skill:'alchemy',trainSkill:false,health:1,mind:.6,progress:.35},
};
export const OFFICERS = [
 {id:'reception',name:'陆行舟',role:'接引弟子',realm:1,description:'在山门接待来访者、核实身份和传递消息。'},
 {id:'steward',name:'许执事',role:'外门执事',realm:2,description:'分配杂务、月例和住处，登记任务完成情况。'},
 {id:'discipline',name:'严衡',role:'执法长老',realm:3,description:'调查事故，听取证词，决定赔偿与处分。'},
 {id:'head',name:'沈宗主',role:'宗主',realm:4,description:'决定宗门战事、外交和重要资源的分配。'},
];
export const GEOGRAPHY = [
 {id:'home',name:'青岚大陆',outline:[[3,13],[5,10],[7,11],[8,8],[10,8],[12,4],[14,6],[17,3],[19,6],[22,5],[24,8],[26,8],[26,11],[29,12],[27,14],[28,17],[25,19],[27,21],[24,23],[23,27],[20,26],[18,29],[15,27],[12,28],[12,25],[9,25],[7,22],[4,22],[5,19],[2,17]],pin:[16,15],places:['竹溪村','清河城','渡云宗','回风谷'],description:'北面的雪山隔开几家争夺灵泉的宗门。清河自山口流向东岸，沿河有清河城与竹溪村。渡云宗建在南部山谷，回风谷在山门西侧，深谷常有兽群。',connections:['tide','ember'],specialty:'药草、剑术与宗门授业'},
 {id:'tide',name:'临潮大陆',outline:[[34,7],[36,5],[38,7],[40,4],[43,5],[44,7],[47,6],[49,9],[47,11],[49,13],[47,14],[46,17],[43,16],[42,19],[39,18],[37,20],[35,17],[33,16],[34,13],[32,11]],pin:[40,10],places:['小潮湾','听潮港','听潮门','碧礁岛'],description:'听潮港在西岸，渡船由这里往来青岚。听潮门守着岛上的灵泉；东南碧礁岛有沉入潮水的洞府，退潮时才露出入口。出海前需打听封航与妖兽。',connections:['home','sky'],specialty:'坊市、航路与海岛遗迹'},
 {id:'ember',name:'烬原大陆',outline:[[6,37],[9,35],[12,36],[15,33],[18,35],[21,32],[23,35],[27,35],[29,38],[32,39],[32,42],[35,44],[31,46],[28,45],[25,49],[22,48],[20,50],[17,48],[14,49],[12,46],[9,46],[7,43],[4,42]],pin:[20,40],places:['赤沙井','流沙驿','赤炉宗','地火矿'],description:'流沙驿沿沙漠商路建起，旅队靠赤沙井补水。赤炉宗在东部火山旁掌握地火，矿洞开在山脚；矿石运往其他大陆，换回药草与粮食。',connections:['home','sky'],specialty:'地火、矿石与炼器'},
 {id:'sky',name:'浮屿界',outline:[[57,25],[60,23],[63,24],[64,21],[67,23],[70,22],[72,25],[70,27],[73,28],[72,31],[69,32],[68,35],[65,34],[63,37],[60,35],[59,32],[56,30],[57,28]],pin:[65,27],places:['明霞屿','悬桥市','悬灯院','裂隙域外'],description:'几座浮岛以悬桥相连，悬桥市供旅人补给。悬灯院管理跨界阵；东侧裂隙通向域外，必须带定位物才能寻找回程。普通跨界阵要求筑基修为。',connections:['tide','ember'],specialty:'阵法、界门与域外探索'},
];
export const SYSTEM_ENDINGS = {
 battle_lost:{title:'道途止于此处',text:'你没能从这场冲突中回来。尚未得到的宝物没有进入行囊，留下的人继续自己的生活。'},
 loose_home:{title:'坊市灯火',text:'你留下修行笔记与手艺，照看自己的住处，不再追逐每一处遗迹。'},
 demon_oath:{title:'幽灯未熄',text:'你接过幽灯堂的传承，也接过了它留下的恩怨。怎样对待后来的人，仍由你决定。'},
 wild_king:{title:'山林有主',text:'你守住族群的栖地，留下与人类往来的规矩。族中幼兽会在此继续长大。'},
 mortal_home:{title:'故乡岁月',text:'你把日子留在故乡，靠手艺、亲人和邻里走完这一生。修行没有成为衡量这一生的唯一尺度。'},
};
