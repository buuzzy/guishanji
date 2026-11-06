import {GEOGRAPHY} from '../../content/cultivation-world.js';
import {mapView} from '../../packages/adventure/cultivation.js';
const K=12,W=960,H=624;
// The fine dot field follows the authorized world map; no population is invented.
const extras={tide:[[[47,21],[50,19],[53,22],[51,25],[48,26],[46,24]]],sky:[[[72,36],[75,33],[78,36],[76,40],[72,40]],[[56,40],[59,37],[62,40],[60,44],[57,43]]]};
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;
}return yes;}
function smooth(points){const out=[];for(let i=0;i<points.length;i++){
 const p=points[i],prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
 const a=[(prev[0]+p[0])/2,(prev[1]+p[1])/2],b=[(p[0]+next[0])/2,(p[1]+next[1])/2];
 for(let k=0;k<5;k++){const t=k/5;out.push([(1-t)**2*a[0]+2*(1-t)*t*p[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*p[1]+t*t*b[1]]);}
}return out;}
const masks=GEOGRAPHY.map(g=>({id:g.id,polys:[g.outline,...(extras[g.id]||[])].map(smooth)}));
const dots=masks.map(g=>({id:g.id,points:[]}));
for(let i=0;i<masks.length;i++)for(let y=2;y<51;y+=.5)for(let x=1;x<79;x+=.5)if(masks[i].polys.some(poly=>inside(x,y,poly)))dots[i].points.push([x*K,y*K]);
/**
 * 把要画的那几块大陆挪到画布中间。
 *
 * ⚠ 只画当前所在 + 走过的大陆 ⇒ 不挪的话，画面会偏在一角、一大半是空的。
 * ⚠ 挪动只改**画到哪里**，不改画什么（笔序、笔数不变）⇒ 画面门禁照样逐笔可比。
 * ⚠ 别把内容推出画布：先居中，推出去就拉回来。
 * ⚠ 这段必须与小程序端 `art/atlas.js` 的同名函数**逐字对应**。
 */
function offsetFor(shown){
  if(!shown.length)return{x:0,y:0};
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const g of shown)for(const p of g.points){
    if(p[0]<minX)minX=p[0];
    if(p[0]>maxX)maxX=p[0];
    if(p[1]<minY)minY=p[1];
    if(p[1]>maxY)maxY=p[1];
  }
  const margin=24;
  let ox=(W-(minX+maxX))/2,oy=(H-(minY+maxY))/2;
  if(ox<margin-minX)ox=margin-minX;
  if(ox>W-margin-maxX)ox=W-margin-maxX;
  if(oy<margin-minY)oy=margin-minY;
  if(oy>H-margin-maxY)oy=H-margin-maxY;
  return{x:ox,y:oy};
}
export function mapMarkup(id='life-map'){return `<div class="wmap"><canvas id="${id}" width="960" height="624" role="img" aria-label="点阵山海地图：现在所在的大陆与实际走过的地方"></canvas><div class="map-legend"><span>◎ 当前大陆</span><span>虚线 · 已知通路</span><span>墨绿 · 已走路线</span><span>× 暂不通行</span><button class="ghost sm" data-action="map-zoom">放大地图</button></div></div>`;}
export function drawMap(root,s,theme='light'){
 if(!root)return;
 const c=root.getContext('2d'),dark=theme==='dark',view=s?mapView(s):{current:null,visited:[],unlocked:[]},current=view.current,visited=view.visited,unlocked=view.unlocked,closed=s?.life?.cultivation?.closed||[];
 const p=dark?{land:'#8a9a96',hot:'#4cc0af',route:'#a3b2af',ink:'#cbd5d1',accent:'#e2678a'}:{land:'#5f6e72',hot:'#0f6e68',route:'#4a5a61',ink:'#5f6e72',accent:'#8c1d3c'};
 root.dataset.renderer='cultivation-dot-map';root.dataset.current=current||'';c.clearRect(0,0,W,H);
 /* 只画「当前所在 + 走过」的大陆：没去过、也没在的地方不占画面。 */
 const shown=dots.filter(g=>unlocked.includes(g.id)),off=offsetFor(shown);
 for(const g of shown){const hot=g.id===current||visited.includes(g.id);c.fillStyle=hot?p.hot:p.land;c.globalAlpha=hot?.52:.25;for(const [x,y] of g.points){c.beginPath();c.arc(x+off.x,y+off.y,1.55,0,Math.PI*2);c.fill();}}

 c.globalAlpha=1;const edges=new Set(),walked=new Set();
 for(const g of GEOGRAPHY)for(const b of g.connections)if(unlocked.includes(g.id)&&unlocked.includes(b))edges.add([g.id,b].sort().join('-'));
 for(const r of s?.life?.cultivation?.routes||[])for(let i=1;i<r.length;i++)walked.add([r[i-1],r[i]].sort().join('-'));
 for(const edge of edges){const [a,b]=edge.split('-'),A=GEOGRAPHY.find(g=>g.id===a).pin,B=GEOGRAPHY.find(g=>g.id===b).pin,done=walked.has(edge),blocked=closed.includes(edge);
  c.strokeStyle=done?p.hot:p.route;c.globalAlpha=blocked?.25:done?.9:.35;c.lineWidth=done?2.2:1.4;c.setLineDash(done?[]:[5,6]);c.beginPath();c.moveTo(A[0]*K+off.x,A[1]*K+off.y);c.lineTo(B[0]*K+off.x,B[1]*K+off.y);c.stroke();c.setLineDash([]);c.globalAlpha=1;
  if(blocked){c.fillStyle=p.accent;c.textAlign='center';c.font='20px sans-serif';c.fillText('×',(A[0]+B[0])*K/2+off.x,(A[1]+B[1])*K/2+off.y);}
 }
 for(const g of GEOGRAPHY){if(!unlocked.includes(g.id))continue;const [x,y]=g.pin.map(v=>v*K);c.fillStyle=g.id===current?p.hot:p.ink;c.textAlign='center';c.font=Math.max(18,Math.round(W/Math.max(320,root.clientWidth)*12))+'px sans-serif';c.fillText(g.name,x+off.x,y+off.y-30);
  if(g.id===current){c.strokeStyle=p.hot;c.lineWidth=2;c.beginPath();c.arc(x+off.x,y+off.y,16,0,Math.PI*2);c.stroke();c.beginPath();c.arc(x+off.x,y+off.y,5,0,Math.PI*2);c.fill();}
  else if(visited.includes(g.id)){c.beginPath();c.arc(x+off.x,y+off.y,4,0,Math.PI*2);c.fill();}
  if(s?.birth?.continent===g.id){c.font=Math.max(12,Math.round(W/Math.max(320,root.clientWidth)*9))+'px sans-serif';c.fillText('出生地',x+off.x,y+off.y+32);}
 }
 root.dataset.connections=String(edges.size);
}
