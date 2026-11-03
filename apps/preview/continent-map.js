import { GEOGRAPHY } from '../../content/cultivation-world.js';
import { currentContinent } from '../../packages/adventure/cultivation.js';
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
export function mapMarkup(id='life-map'){return '<div class="wmap"><canvas id="'+id+'" width="640" height="416" role="img" aria-label="四片大陆、出生地与已经走过的路线"></canvas></div>';}
export function drawMap(root,s,theme='light'){
 if(!root)return;const c=root.getContext('2d'),dark=theme==='dark',current=s?currentContinent(s):null,visited=s?.life?.cultivation?.visited||[s?.birth?.continent].filter(Boolean);
 c.clearRect(0,0,640,416);root.dataset.renderer='cultivation-dot-map';root.dataset.current=current||'';
 c.fillStyle=dark?'#17283A':'#F6F5F0';c.fillRect(0,0,640,416);
 for(let y=0;y<52;y++)for(let x=0;x<80;x++){
  const continent=GEOGRAPHY.find(p=>inside(x+.5,y+.5,p.outline));
  if(continent){c.fillStyle=continent.id===current?(dark?'#4CC0AF':'#2C8C82'):visited.includes(continent.id)?(dark?'#66777B':'#A9B0AD'):(dark?'#36454F':'#D4D8D2');c.fillRect(x*8+1,y*8+1,4,4);}
  else if((x+y)%4===0){c.fillStyle=dark?'#243C46':'#E4ECEA';c.fillRect(x*8+2,y*8+2,2,2);}
 }
 const routes=s?.life?.cultivation?.routes||[];
 for(const route of routes){const path=route.map(id=>GEOGRAPHY.find(p=>p.id===id)).filter(Boolean);if(path.length>1){c.strokeStyle=dark?'#E2678A':'#BE4A52';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();path.forEach((p,i)=>i?c.lineTo(p.pin[0]*8,p.pin[1]*8):c.moveTo(p.pin[0]*8,p.pin[1]*8));c.stroke();c.setLineDash([]);}}
 for(const p of GEOGRAPHY){const x=p.pin[0]*8,y=p.pin[1]*8;c.fillStyle=dark?'#E6E3DA':'#3B4046';c.font='20px sans-serif';c.textAlign='center';c.fillText(p.name,x,y+34);if(p.id===current){c.fillStyle=dark?'#E2678A':'#BE4A52';c.fillRect(x-4,y-4,8,8);c.font='16px sans-serif';c.fillText('你在这里',x,y+54);}if(s?.birth?.continent===p.id){c.strokeStyle=dark?'#E2AE45':'#A77D39';c.strokeRect(x-7,y-7,14,14);}}
}
