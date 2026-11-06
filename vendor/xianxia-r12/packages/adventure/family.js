import { hashText } from '../core/random.js';

export function familyState(state, migration=false) {
  const surname=state.player.name[0];
  const kind=state.birth.family;
  return { kind, bond: migration ? 45 : 65, reserve: kind==='clan'?80:kind==='noble'?100:28, nextAt: state.month+24, visits:0,
    members:[{id:'parent',name:surname+'氏长辈',role:kind==='clan'?'家族长辈，擅长调息与制符':kind==='noble'?'家中管事，熟悉商路与契约':'家中长辈，靠药田与手艺谋生',status:'alive',location:'home',deathAt:state.month+Math.max(12,55*12-state.month)},
      {id:'cousin',name:surname+['青禾','长平','若兰'][hashText(state.seed+'relative')%3],role:kind==='clan'?'族中堂亲，负责送药与传信':'家中亲人，照管旧屋与日常往来',status:'alive',location:'home',deathAt:state.month+Math.max(24,85*12-state.month)}] };
}
export function familyAvailable(state) { return state.life.family.members.some(p=>p.status==='alive') && state.life.family.bond>=25 && state.life.family.reserve>=12; }
export const FAMILY_EVENTS = {
  family_help: { id:'family_help',act:0,title:'家里问你缺什么',text:s=>{
    const f=s.life.family,p=f.members.find(p=>p.status==='alive');
    return p.name+'来信问你近况。'+(f.kind==='clan'?'族里还能提供一些药材，也有人熟悉护符和调息。':f.kind==='noble'?'家中商路还能接济路费，也能联系往来的药商。':'家里攒下了一点钱与药草，愿意给你送来。')+'他们的积蓄有限，你可以请求帮助，也可以先照顾家里。';},choices:[
    {id:'supplies',label:'请家里送些药与路费',hint:'告诉家人现在的住处。',reply:'家人的药和路费送到了，你回信报了平安。',startReply:'你写下所缺的药与现在的地址，等家里安排送来。',deferEffects:true,months:6,effects:{stats:{stones:10},items:['herb_kit'],flags:{familyReceived:true}}},
    {id:'teach',label:'请家中熟人指点本事',hint:'先把遇到的难题写清楚。',reply:'家中熟人给你寄来笔记，你照着修正练习，明白了以前漏掉的一步。',startReply:'你把练习中的难题写进信里，等家中人请教熟人。',deferEffects:true,months:12,effects:s=>({skills:{[s.player.focus]:5},flags:{familyTaught:true}})},
    {id:'send',label:'寄些灵石回去，问问家人的难处',hint:'先留够自己的生活费。',reply:'回信说家人修好了旧屋，也为需要离乡的亲人留了一份路费。',cost:{stones:12},months:0,effects:{flags:{familySupported:true},stats:{empathy:2}}},
  ]},
  family_reunion: {id:'family_reunion',act:2,title:'亲人找到你现在的住处',text:s=>s.life.family.members.find(p=>p.status==='alive').name+'托商旅问到了你的地址。家里近来的事很难只在信里说清，亲人想来看看你，也问这里是否能安顿普通人。',choices:[
    {id:'welcome',label:'安排渡船，接亲人来住一阵',hint:'先给渡船送路费。',cost:{stones:8},months:6,deferEffects:true,startReply:'你在信里附上船路与路费，安排亲人出发。',reply:'亲人抵达你住的城镇，你们坐下来讲了离家后的事。',effects:{flags:{familyReunited:true},stats:{mind:6}}},
    {id:'letter',label:'先回长信，说明这里的生活',hint:'让亲人自己决定是否远行。',months:0,reply:'你写清了住处、物价与附近危险，家人不再只知道你升了哪一境。',effects:{flags:{familyReunionClosed:true},stats:{mind:2}}},
  ]},
};
