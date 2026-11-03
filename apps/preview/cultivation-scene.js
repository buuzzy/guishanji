// Original procedural cultivation scenery. Rendering never reads or advances game RNG.
import { activityContext, presentPeople } from '../../packages/adventure/context.js';

const models = new WeakMap();
const W = 960, H = 320;
export function registerScene(root, run, theme) {
  if (!root) return;
  for (const canvas of root.querySelectorAll('canvas')) { canvas.width = W; canvas.height = H; }
  const context = run?.life ? activityContext(run) : 'birth';
  const companions = run?.life ? presentPeople(run).slice(0, 3) : [];
  const recent = run?.journal?.slice(-3).find(e => e.kind === 'breakthrough');
  models.set(root, { run, theme, context, companions, recent, since: performance.now() });
  root.dataset.context = context; root.dataset.people = companions.length + 1;
  root.dataset.renderer = 'cultivation-original';
  root.setAttribute('aria-label', ({ retreat: '洞府中打坐修行', travel: '御器穿行山海', valley: '山谷药坡历练', cavern: '洞府石室探索', outer: '域外碎陆与定位阵' })[context] || '山门与修士的生活');
  drawScene(root, performance.now());
}
function polygon(c, points, color) { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); }
function person(c, x, y, color, sitting, t) {
  c.save(); c.translate(x, y + Math.sin(t) * (sitting ? 0 : 1.5));
  c.fillStyle = '#e4c7ad'; c.beginPath(); c.arc(0, -37, 7, 0, Math.PI * 2); c.fill();
  polygon(c, [[-6,-43],[4,-44],[7,-37],[-7,-38]], '#26323e');
  polygon(c, sitting ? [[-6,-28],[6,-28],[18,-4],[-18,-4]] : [[-6,-28],[6,-28],[12,0],[-12,0]], color);
  c.strokeStyle = '#d3b17c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10,-13); c.lineTo(10,-13); c.stroke();
  if (!sitting) { c.strokeStyle = '#354456'; c.lineWidth=3; c.beginPath(); c.moveTo(-5,0);c.lineTo(-5,7);c.moveTo(5,0);c.lineTo(5,7);c.stroke(); }
  c.restore();
}
function temple(c, x, y, size) {
  c.fillStyle = '#c8bca6'; c.fillRect(x-size*.38,y-size*.35,size*.76,size*.35);
  polygon(c, [[x-size*.52,y-size*.35],[x-size*.25,y-size*.58],[x+size*.25,y-size*.58],[x+size*.52,y-size*.35]], '#354e54');
  c.fillStyle='#46515a';c.fillRect(x-8,y-28,16,28);
  c.strokeStyle='#9b754d';c.lineWidth=3;c.beginPath();c.moveTo(x-size*.31,y);c.lineTo(x-size*.31,y-size*.32);c.moveTo(x+size*.31,y);c.lineTo(x+size*.31,y-size*.32);c.stroke();
}
export function drawScene(root, now, reduced = false) {
  const m=models.get(root); if (!m || !root.isConnected) return;
  const c=root.querySelector('canvas.mid').getContext('2d'), t=reduced ? 0 : now/1000;
  const dark=m.theme==='dark', outer=m.context==='outer', cave=['cavern','retreat'].includes(m.context), travel=m.context==='travel';
  const battle=m.run?.pending && /siege|battle|attack|ambush|resist|hunter/u.test(m.run.pending.event);
  c.clearRect(0,0,W,H);
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,outer?'#141c38':cave?'#263442':dark?'#1b3448':'#b9d4d7');sky.addColorStop(1,cave?'#52665b':dark?'#39514f':'#ecedcf');c.fillStyle=sky;c.fillRect(0,0,W,H);
  if (outer) {
    for(let i=0;i<48;i++){const x=(i*137)%W,y=(i*73)%180;c.globalAlpha=.35+.3*Math.sin(t+i);c.fillStyle='#c8dbec';c.fillRect(x,y,2,2);}c.globalAlpha=1;
    for(let i=0;i<5;i++){const x=70+i*205,y=220+Math.sin(t*.25+i)*12;polygon(c,[[x-50,y],[x+80,y-8],[x+25,y+65]],'#526876');polygon(c,[[x-50,y],[x+80,y-8],[x+45,y-30],[x-20,y-25]],'#78877e');}
  } else {
    for(let layer=0;layer<3;layer++){const pts=[[0,H]];for(let x=0;x<=W;x+=40)pts.push([x,150+layer*35+Math.sin(x*.009+layer*3)*35+Math.cos(x*.017)*18]);pts.push([W,H]);polygon(c,pts,['#7faaa8','#65908c','#497b70'][layer]);}
    for(let i=0;i<5;i++){c.fillStyle=dark?'#bfd1d00d':'#ffffff22';c.beginPath();c.ellipse((i*240+t*7)%1200-100,110+i*17,110,12,0,0,Math.PI*2);c.fill();}
  }
  if(cave){polygon(c,[[0,0],[W,0],[W,75],[750,35],[610,68],[470,25],[240,66],[120,34],[0,85]],'#253b40');polygon(c,[[0,0],[65,20],[100,230],[30,H],[0,H]],'#324c48');polygon(c,[[W,0],[875,35],[855,230],[W,H]],'#324c48');}
  if(!outer){polygon(c,[[0,275],[360,250],[650,260],[W,245],[W,H],[0,H]],'#60776a');c.strokeStyle='#b3b49a';c.lineWidth=20;c.beginPath();c.moveTo(420,H);c.quadraticCurveTo(470,270,600,245);c.stroke();}
  if(m.context==='valley'){for(let i=0;i<18;i++){const x=60+i*49,y=278+(i%3)*9;c.strokeStyle='#aec692';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-10);c.stroke();c.fillStyle='#d9bb95';c.fillRect(x+1,y-12,4,4);}}
  if(m.context==='retreat'||m.context==='cavern'){c.fillStyle='#7d8572';c.fillRect(300,250,350,20);c.fillStyle='#b89461';c.fillRect(655,225,25,32);c.fillStyle='#eec880';c.beginPath();c.arc(667,218,7+Math.sin(t*3),0,Math.PI*2);c.fill();}
  else if(!outer&&!travel){temple(c,190,268,m.context==='valley'?65:125);temple(c,735,260,82);}
  const y=travel?170:outer?215:260;
  if(travel){c.strokeStyle='#b7d6d9';c.lineWidth=3;c.beginPath();c.moveTo(250,225);c.quadraticCurveTo(480,235,680,175);c.stroke();polygon(c,[[450,y+10],[565,y+10],[580,y+6],[450,y+6]],'#dde3df');}
  person(c,490+Math.sin(t*.7)*(travel?25:0),y,m.run?.player.sex==='F'?'#8f6686':'#54778d',m.context==='retreat',t);
  m.companions.forEach((p,i)=>person(c,555+i*42,y+(i%2)*8,['#96816b','#6d8a79','#8c778f'][i],false,t+i));
  const glow=m.context==='retreat'||m.recent||outer;
  if(glow){c.save();c.translate(490,y-22);c.strokeStyle=m.recent?'#efcf81':'#92c7c5';c.globalAlpha=.55;c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,30+i*12+Math.sin(t+i)*4,10+i*5,t*.12,0,Math.PI*2);c.stroke();}c.restore();}
  if(battle){c.strokeStyle='#e2a27b';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(580+i*20,160+i*12);c.lineTo(460+i*10,240);c.stroke();}}
  for(let i=0;i<16;i++){const x=(i*67+Math.sin(t*.6+i)*12)%W,y=210+(i*19+t*5)%100;c.fillStyle=outer?'#dfc99188':'#d9e8ba55';c.beginPath();c.arc(x,y,1.5,0,Math.PI*2);c.fill();}
}
