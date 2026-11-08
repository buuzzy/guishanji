// Integer stones: secular families use ordinary money; cultivation materials
// and actual paid work use scarce spirit stones. No annual grant to children.
import {mundaneStoneQuote} from './mundane-life.js';
import {activeCultivation,canCultivate} from './story-shared.js';
export function economyQuote(s){
 const c=s.life.cultivation;
 if(Math.floor(s.month/12)+(s.birth.startAge||0)<16)return {gross:0,upkeep:0,net:0,reason:'家中以粮食和铜钱维持生活'};
 if(c.detained||c.inquiry||s.month<c.punishmentUntil&&c.punishmentKind==='confinement')return {gross:0,upkeep:0,net:0,reason:'被看管或商谈期间不领取月例，食宿由所在院落承担'};
 if(!canCultivate(s))return mundaneStoneQuote(s);
 if(activeCultivation(s)&&!canCultivate(s))return {gross:c.activity==='work'&&s.month%36===0?1:0,upkeep:0,net:c.activity==='work'&&s.month%36===0?1:0,reason:'粮钱与食宿随活计结清；偶尔替药铺交货才能换到灵石，不领修炼月例'};
 if(c.v12?.action)return {gross:c.v12.action.kind==='work'?1:0,upkeep:0,net:c.v12.action.kind==='work'?1:0,reason:c.v12.action.kind==='work'?'替材料持有者做工，工钱与换料报酬分别结清':'多年修行使用已备补给，不叠加日常月例'};
 if(c.v12?.patron.stopped&&c.activity!=='work')return {gross:0,upkeep:0,net:0,reason:'宗门已停供基础耗材，靠现有积蓄与普通活计生活'};
 if(c.network?.arc){const gross=c.rank==='内门弟子'?3:2;return {gross,upkeep:2,net:gross-2,reason:'堂院试任按原弟子待遇供食宿与材料，不另叠加自由做工收入'};}
 const field=s.journey?.cultivationTravel||['travel','valley','cavern','outer','work'].includes(c.context),retreat=s.journey?.resolution?.event?.startsWith('breakthrough_');
 if(field||retreat)return {gross:0,upkeep:0,net:0,reason:retreat?'闭关材料已在开始时支付，不另领日常月例':'外出以已备补给度日，不按住处重心领取工钱'};
 const stipend=c.path==='orthodox'?({'杂役':1,'外门弟子':2,'内门弟子':3,'亲传弟子':4}[c.rank]||1):c.path==='demonic'?2:0;
 const work=c.activity==='work'?3+(s.birth.era==='ebb'?1:0)+(s.player.skills.alchemy>=35?1:0):0;
 const gross=s.month<c.punishmentUntil?1:Math.max(stipend,work),upkeep=c.path==='mortal'?0:(s.birth.era==='ebb'?3:2)+(s.player.realm>=2?1:0)+(s.player.realm>=3?1:0);
 return {gross,upkeep,net:gross-upkeep,reason:'月例与手艺工钱扣除住宿、修补器物和普通修行耗材；闭关与远行另付'};
}
export function settleEconomy(s){
 const q=economyQuote(s),c=s.life.cultivation,paid=Math.min(q.upkeep,s.player.stones+q.gross),net=q.gross-paid;
 c.economy.received+=q.gross;c.economy.spent+=paid;
 c.economy.last={month:s.month,gross:q.gross,upkeep:paid,shortfall:q.upkeep-paid,net,balance:s.player.stones+net};
 if(paid<q.upkeep){
  // Food is not death-by-zero-wallet. Selling ordinary labour covers survival,
  // but the year is not counted as free cultivation or a new stone grant.
  //
  // ⚠ **不倒扣进度**。
  //   旧写法是「欠一枚灵石就扣三点进度」：杂役月例 1 灵石、吃住花销 2 灵石 ——
  //   入门期几乎人人都欠一点，倒扣之下每年净攒不到 1 点，练一辈子也进不了炼气。
  //   ⇒ 代价改由**别处**承担（突破材料要现钱、要做工换）。
 }
 return {...q,net};
}
