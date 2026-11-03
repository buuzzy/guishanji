const c = (id, label, hint, data={}) => ({ id, label, hint, reply: '你照这个办法安排了下一段路。', deferEffects: true, startReply: '你先收拾营地，开始处理眼前的难处。', ...data });
const n = (id, title, text, choices) => [id, { id, act: 2, title, text, choices }];
export const EXPEDITION_CHANGES = Object.fromEntries([
  n('expedition_supply', '药与粮快用完了', '你检查行囊，药与粮已经不够支撑下一段深入。附近还未找到补给点，回程也需要留出食物。要补给、减少负担继续，还是返回？', [
    c('buy','沿旧路寻找补给','先留足回程的食物。',{cost:{stones:12},months:6,effects:{flags:{supplyRestocked:true}}}),
    c('ration','分出回程粮，继续寻找水源','身体疲乏，附近是否有水还不确定。',{months:3,check:{base:40,skill:'alchemy',scale:.6,failText:'你没找到足够的药食，身体虚弱，只能收起深入的计划。',failure:{stats:{health:-22},flags:{expeditionWithdraw:true}}},effects:{flags:{supplyForaged:true}}}),
    c('leave','带着已有收获返回','先沿仍能辨认的路撤出。',{months:3,effects:{flags:{expeditionWithdraw:true}}}),
  ]),
  n('expedition_ambush', '有人埋伏在回程路上', '陌生修士占住路口，要求你交出行囊里的法宝。附近还有妖兽脚印，继续停留可能引来它们。你可以交涉、绕路或迎战。', [
    c('pay','交路费，让他们先放行','对方愿意收灵石，你先确认退路。',{cost:{stones:16},months:3,effects:{flags:{expeditionExposed:true}}}),
    c('detour','借石壁与旧阵绕开伏击','新路尚未核实，需要边走边查。',{months:6,check:{base:42,skill:'array',scale:.65,failText:'绕路时你跌进兽穴，受伤后沿来路撤开。',failure:{stats:{health:-20},flags:{expeditionWithdraw:true}}},effects:{skills:{array:3}}}),
    c('fight','拔剑迎击，抢回通路','对方人数比你多。',{months:3,check:{base:24,skill:'sword',scale:.65,realmScale:8,failText:'伏击者封住了退路，你没能从战阵中回来。',failure:{stats:{health:-100}},failEnding:'fallen'},effects:{stats:{health:-18},flags:{expeditionExposed:true}}}),
  ]),
  n('expedition_companion', '同伴被妖兽击伤', s => {
    const id=s.life.arc.id==='valley'?'trialmate':'ally';
    return s.people[id].name+'被妖兽爪伤，夜里开始发热。药师不在这里，继续赶路会加重伤势。你得先决定怎么照看同行者。';
  }, [
    c('heal','用随身药停下来治伤','先找能避风的营地。',{cost:{items:['herb_kit']},months:6,effects:{flags:{companionTreated:true},stats:{health:4}}}),
    c('carry','背着同伴寻找外面的药师','回程要多花力气。',{months:6,effects:{flags:{expeditionWithdraw:true,companionTreated:true},stats:{health:-8}}}),
    c('press','留下药与坐标，独自先去探路','无法确认多久能找到援手，同伴可能撑不住。',{months:3,check:{base:35,skill:'alchemy',scale:.5,failText:'你返回营地时，同伴已经没有呼吸。你埋好遗物，把名字与最后的位置记进路图。',failure:s=>({people:{[s.life.arc.id==='valley'?'trialmate':'ally']:{status:'dead'}},flags:{companionDied:true,expeditionWithdraw:true}})},effects:{flags:{companionTreated:true}}}),
  ]),
  n('expedition_obstacle','前面的路比预想更险','你发现一段新的崩塌，旧地图标出的路已经不存在。谷底有陌生兽鸣，身后的出口仍能辨认。修为让你能走到这里，不能替你找到下一段路。',[
    c('survey','扎营查路，再决定是否深入','先记录崩塌和兽群活动。',{months:6,effects:{skills:{array:3},flags:{expeditionSurveyed:true}}}),
    c('climb','试着从峭壁绕过去','岩石松动，负重攀爬可能受伤。',{months:3,check:{base:40,skill:'sword',scale:.55,failText:'落石打伤了你，原本的补给也散落崖下。你沿还能走的旧路撤开。',failure:{stats:{health:-18},flags:{expeditionWithdraw:true}}},effects:{flags:{expeditionSurveyed:true}}}),
    c('leave','不再深入，沿原路回去','先把已经取得的东西带出去。',{months:3,effects:{flags:{expeditionWithdraw:true}}}),
  ]),
]);
export const CLUE_EVENTS = Object.fromEntries([
  n('valley_notice','药圃正在招募采药队','药圃的新一批药苗需要回风谷的成熟灵草。陶宁说谷外守门人正在整理旧路，可以先去听安排，也可以暂时继续宗门生活。',[
    {id:'listen',label:'和陶宁核对路线',hint:'先问目的地和接应的人。',reply:'陶宁拿来旧路图。你们核对了药坡、营地和外门，闻竹答应替准备入谷的人检查行囊。',months:6,effects:{flags:{valleyBriefed:true}}},
    {id:'later',label:'这次先不参加',hint:'先留在宗门处理自己的事。',reply:'你没有报名，药圃继续找愿意同行的弟子。',months:0,effects:{flags:{valleySkipped:true}}},
  ]),
  n('cavern_notice','守门人带来失联队伍的路图','嵇萝带来一份沉星洞府残图。前队没有按约回信，守门人想找熟悉旧阵的人核实入口。你还不知道他们是迷路、受伤，还是遇到敌人。',[
    {id:'listen',label:'与嵇萝核实入口和信号',hint:'先查前队最后扎营的位置。',reply:'你们查过图与留言，找到前队入洞的位置。守门人着手准备外面的补给点。',months:6,effects:{flags:{cavernBriefed:true}}},
    {id:'later',label:'先把消息交给当地修士',hint:'自己暂时不入洞。',reply:'你把残图交给当地队伍，自己继续在城中修行。',months:0,effects:{flags:{cavernSkipped:true}}},
  ]),
  n('outer_notice','定位阵收到域外修士的回信','一群域外修士失联许久，最近再次发来星位。嵇萝请你帮忙核对，守门人准备另建接应阵。直接跨界仍有危险，需要先确认信号与归路。',[
    {id:'listen',label:'先帮忙核对星图和归路',hint:'不急着跨门，先确认另一端。',reply:'你与嵇萝核对星图，确认信号来自有人居住的残城。守门人开始搭设接应阵。',months:12,effects:{flags:{outerBriefed:true}}},
    {id:'later',label:'留在此界，转告其他队伍',hint:'暂不承担跨界接应。',reply:'你把消息交给守门人，留在此界继续生活。',months:0,effects:{flags:{outerSkipped:true}}},
  ]),
]);
