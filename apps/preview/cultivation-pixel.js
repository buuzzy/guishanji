// Own cultivation scenes use the authorized 1in8b palette and 192×108 pixel grid.
import {currentContinent} from '../../packages/adventure/cultivation.js';
import {PIXEL_STYLE} from './pixel-style.js';
import {activityContext,presentPeople} from '../../packages/adventure/context.js';
import {sceneFor} from '../../packages/adventure/progression.js';
const models=new WeakMap(),W=192,H=108;
const px=(c,color,x,y,w=1,h=1)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const mix=(a,b,t)=>{const rgb=v=>[1,3,5].map(i=>parseInt(v.slice(i,i+2),16));return '#'+rgb(a).map((v,i)=>Math.round(v+(rgb(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');};
function tree(c,P,x,y){px(c,P.trunk,x,y-25,2,25);for(let l=0;l<4;l++)for(let r=0;r<6;r++)px(c,r%3?P.tree2:P.treehi,x-5-l*2+r,y-34+l*6+r,13+l*4-r*2,1);}
function rock(c,P,x,y){px(c,P.ol,x,y,9,5);px(c,P.stone,x+1,y-1,7,4);px(c,P.pave,x+2,y-1,3,1);}
function house(c,P,x,y,w=42,hut=false,broken=false){
 px(c,P.ol,x,y-25,w,25);px(c,P.wall2,x+1,y-24,w-2,22);px(c,P.wall,x+2,y-23,w-6,18);px(c,P.pave2,x-2,y-1,w+4,3);
 for(let r=0;r<8;r++){const spread=8-r;px(c,P.ol,x-spread,y-33+r,w+spread*2,1);px(c,hut?P.thatch:r%2?P.roof2:P.roof,x-spread+1,y-33+r,w+spread*2-2,1);for(let z=x-spread+3;z<x+w+spread-2;z+=6)px(c,P.ol,z,y-33+r);}
 px(c,P.ol,x+w/2-5,y-13,11,12);px(c,P.trunk,x+w/2-4,y-12,9,11);px(c,P.gold,x+w/2+2,y-7);
 for(const z of [x+6,x+w-13]){px(c,P.ol,z,y-18,7,8);px(c,P.winlit,z+1,y-17,5,6);px(c,P.trunk,z+3,y-17,1,6);px(c,P.trunk,z+1,y-14,5,1);}
 for(const z of [x+1,x+w-4]){px(c,P.ol,z,y-25,3,24);px(c,P.brick,z+1,y-24,1,22);}
 px(c,P.ol,x+w/2-10,y-23,20,5);px(c,P.gold,x+w/2-9,y-22,18,3);for(let i=0;i<3;i++)px(c,P.roof2,x+w/2-6+i*5,y-22,2,2);
 if(broken){px(c,P.sky.d[1],x+w-15,y-31,10,9);for(let i=0;i<4;i++)rock(c,P,x+w-12+i*4,y+2);}
}
function person(c,P,x,y,sex,age,robe,t,action,beast=false){
 const stage=age<3?'baby':age<7?'small':age<13?'child':age<18?'teen':'adult',sprite=PIXEL_STYLE.PEOPLE[sex||'M'][stage],bob=['sword','work'].includes(action)?Math.floor(t/5)%2:0;
 const colors={H:age>100?P.hairold:P.hair,S:P.skin,E:P.ol,c:mix(P.skin,P.roof,.25),m:P.roof2,B:robe,b:mix(robe,P.ol,.25),P:robe,F:P.ol,D:robe,d:mix(robe,P.ol,.3)};
 for(let r=0;r<sprite.length;r++)for(let z=0;z<sprite[r].length;z++){const k=sprite[r][z];if(colors[k])px(c,k==='E'&&t%53===0?P.skin:colors[k],x+z,y-sprite.length+r+bob);}
 if(age>=13){px(c,P.gold,x+1,y-5+bob,7,1);px(c,robe,x+2,y-4+bob,5,2);px(c,P.hair,x+3,y-sprite.length-2,3,2);}
 if(action==='study'||action==='array'){px(c,P.ol,x+7,y-8,8,6);px(c,P.wall,x+8,y-7,6,4);px(c,P.trunk,x+10,y-7,1,4);}
 if(action==='sword'){for(let i=0;i<10;i++)px(c,P.metal,x+7+i,y-8-i+bob);px(c,P.gold,x+8,y-10,3,1);}
 if(beast){px(c,P.gold,x+1,y-sprite.length-2,1,3);px(c,P.gold,x+7,y-sprite.length-2,1,3);px(c,robe,x+8,y-4,5,1);}
}
function lantern(c,P,x,y,t){px(c,P.ol,x,y,1,7);px(c,P.ol,x-2,y+6,5,8);px(c,P.roof,x-1,y+7,3,6);px(c,t%3?P.gold:P.winlit,x,y+8,1,4);px(c,P.gold,x,y+14,1,3);}
function room(c,P,m,t){
 if(m.context==='confinement'||m.run?.life?.cultivation?.detained){
  px(c,P.ol,0,0,W,H);px(c,P.stone,0,15,W,93);for(let y=16;y<82;y+=12)for(let x=(y%24?0:12);x<W;x+=24){px(c,P.ol,x,y,24,1);px(c,P.ol,x,y,1,12);}
  px(c,P.soil2,0,85,W,23);px(c,P.ol,140,30,35,57);px(c,P.wall2,145,39,25,5);for(let x=143;x<175;x+=6)px(c,P.trunk,x,31,2,52);px(c,P.thatch,58,94,35,5);px(c,P.wall,103,95,7,2);
  for(let i=0;i<8;i++)px(c,P.wall2,18+i*4,57,1,5);person(c,P,74,96,m.run?.player.sex,m.age,m.robe,t,'rest',m.path==='beast');lantern(c,P,131,40,t);return;
 }
 px(c,P.wall2,0,22,W,61);px(c,P.wall,0,24,W,53);for(let x=0;x<W;x+=24)px(c,P.trunk,x,22,3,61);px(c,P.soil,0,83,W,25);for(let y=87;y<H;y+=6){px(c,P.soil2,0,y,W,1);for(let x=y%3*7;x<W;x+=32)px(c,P.soil2,x,y-4,1,4);}
 px(c,P.ol,10,30,45,30);px(c,P.win,11,31,43,28);px(c,P.far2,12,49,40,10);for(let x=14;x<52;x+=8)px(c,P.trunk,x,31,2,28);px(c,P.trunk,11,43,43,2);
 for(let r=0;r<3;r++){px(c,P.ol,127,30+r*12,53,11);px(c,P.trunk,128,39+r*12,51,2);for(let b=0;b<8;b++){px(c,[P.me,P.roof,P.gold,P.wall2][(b+r)%4],130+b*6,32+r*12,4,7);px(c,P.wall,131+b*6,34+r*12,2,1);}}
 px(c,P.ol,64,75,46,4);px(c,P.thatch,65,75,44,2);px(c,P.trunk,66,79,3,14);px(c,P.trunk,104,79,3,14);px(c,P.wall,70,71,13,4);px(c,P.ol,75,70,1,4);
 if(m.activity==='alchemy'){px(c,P.ol,89,59,13,15);px(c,P.metal,90,60,11,12);px(c,P.gold,92,73,7,2);px(c,P.winlit,93,68,5,3);px(c,P.roof,93,56,5,3);for(let i=0;i<3;i++)px(c,P.smoke,94+(i+t)%4,51-i*4,3,2);}
 if(m.context==='retreat'){px(c,P.thatch2,72,91,27,7);for(let x=57;x<112;x+=3)px(c,P.me,x,96+Math.floor(Math.sin(x+t*.1)*2),2,1);}
 person(c,P,80,96,m.run?.player.sex,m.age,m.robe,t,m.context==='retreat'?'rest':m.activity,m.path==='beast');lantern(c,P,113,39,t);
}
function specialScene(mid,front,P,m,t){
 const scene=m.scene;if(!['siege','camp','settlement','hide','tribulation'].includes(scene))return false;
 px(mid,P.soil,0,78,W,30);for(let i=0;i<50;i++)px(mid,i%2?P.soil2:P.grass2,i*31%W,80+i*17%27,2,1);
 if(scene==='siege'){
  house(mid,P,16,82,52,false,true);house(mid,P,131,83,42,false,true);
  for(const x of [24,39,145,157]){for(let k=0;k<4;k++){px(front,k%2?P.gold:P.roof,x+k%2,75-k*4-(t+k)%3,4-k%2,5);px(front,P.smoke,x+(t/3+k)%5,52-k*6,5,3);}}
  for(let y=48;y<99;y+=4){const x=92+Math.floor(Math.sin(y*.1+t*.1)*3);px(front,y%8?P.me:P.gold,x,y,1,3);}for(let x=77;x<111;x+=4)px(front,P.me,x,99+Math.floor(Math.sin(x+t*.1)),2,1);
  person(front,P,77,99,m.run?.player.sex,m.age,m.robe,t,'sword');person(front,P,111,98,'M',38,P.roof2,t+4,'sword');person(front,P,48,103,'F',23,P.pt,t,'work');
  for(const [x,y]of [[9,101],[39,106],[152,104],[177,95]])rock(front,P,x,y);
 }else if(scene==='camp'){
  for(const [x,y]of [[15,85],[111,86]]){for(let r=0;r<20;r++)px(mid,r%3?P.thatch:P.thatch2,x+20-r,y-20+r,r*2+1,1);px(mid,P.ol,x+18,y-11,7,10);px(mid,P.trunk,x+20,y-21,1,21);}
  px(mid,P.wall2,151,91,25,9);px(mid,P.ol,151,91,25,1);for(let x=156;x<174;x+=8)px(mid,P.trunk,x,92,1,8);px(mid,P.wall,158,87,13,4);px(mid,P.roof,165,88,2,2);
  px(front,P.stone,80,99,14,3);px(front,P.gold,85,91+(t%3),4,7);px(front,P.roof,84,96,6,3);person(front,P,65,104,m.run?.player.sex,m.age,m.robe,t,'rest');person(front,P,96,104,'M',31,P.par,t+3,'rest');person(front,P,47,99,'F',27,P.sib,t,'work');
 }else if(scene==='settlement'){
  house(mid,P,20,81,46);house(mid,P,127,82,43);px(mid,P.trunk,88,59,2,30);px(mid,P.wall,74,61,15,9);px(mid,P.me,75,62,13,7);px(mid,P.gold,80,63,2,5);
  for(let i=0;i<6;i++){px(mid,P.soil2,113+i*7,99,5,3);px(mid,P.tree2,115+i*7,94,1,6);px(mid,P.treehi,113+i*7,93,5,2);}
  person(front,P,84,103,m.run?.player.sex,m.age,m.robe,t,'study');person(front,P,47,101,'M',24,P.pt,t,'work');px(front,P.wall,51,91,8,6);px(front,P.trunk,53,91,1,6);person(front,P,111,101,'F',42,P.par,t,'array');
 }else if(scene==='hide'){
  for(let i=0;i<7;i++)tree(mid,P,9+i*27,90+i%2*6);for(let x=48;x<132;x++){const y=68-Math.floor(Math.sin((x-48)/84*Math.PI)*35);px(mid,P.stone,x,y,1,93-y);}
  px(mid,P.ol,75,57,32,40);px(mid,P.soil2,77,89,28,8);person(front,P,84,98,m.run?.player.sex,m.age,m.robe,t,'rest');for(let i=0;i<7;i++)px(front,P.tree2,70+i*6,98-i%2*3,4,2);
 }else{
  px(mid,P.cloudsh,0,0,W,28);for(let x=0;x<W;x+=19){px(mid,P.cloud,x,21+(x+t)%7,23,5);}
  for(let i=0;i<32;i++){const a=i*Math.PI/16;px(mid,i%3?P.me:P.gold,93+Math.cos(a)*30,94+Math.sin(a)*8,2,1);}
  if(t%7<3)for(let y=25;y<83;y+=3)px(front,P.sunhi,93+Math.floor(Math.sin(y*.19)*5),y,2,4);
  person(front,P,89,98,m.run?.player.sex,m.age,m.robe,t,'rest');person(front,P,40,102,'M',75,P.par,t,'array');person(front,P,143,102,'F',72,P.sib,t,'array');px(front,P.wall,86,101,7,3);px(front,P.gold,87,100,5,1);
 }
 return true;
}
export function registerScene(root,run,theme='light'){
 if(!root)return;for(const cv of root.querySelectorAll('canvas')){cv.width=W;cv.height=H;cv.getContext('2d').imageSmoothingEnabled=false;}
 const context=run?.life?activityContext(run):'birth',companions=run?.life?presentPeople(run).slice(0,3):[],path=run?.life?.cultivation?.path||'orthodox';
 const scene=run&&sceneFor(run);models.set(root,{run,theme,context,scene,companions,path,age:run?Math.floor(run.month/12)+(run.birth?.startAge||0):20,activity:context==='work'?'work':run?.life?.cultivation?.activity||'study'});
 root.dataset.context=context;root.dataset.scene=scene||context;root.dataset.people=companions.length+1;root.dataset.renderer='cultivation-original-pixel';root.setAttribute('aria-label','精细像素绘制的修仙生活场景');drawScene(root,performance.now());
}
export function drawScene(root,now,reduced=false){
 const m=models.get(root);if(!m)return;const P=PIXEL_STYLE.PAL[m.theme==='dark'?'dark':'light'],t=reduced?7:Math.floor(now/180);m.robe=({orthodox:P.me,loose:P.gold,demonic:P.roof2,beast:P.tree2,mortal:P.par})[m.path];
 const sky=root.querySelector('.sky').getContext('2d'),back=root.querySelector('.back').getContext('2d'),mid=root.querySelector('.mid').getContext('2d'),front=root.querySelector('.front').getContext('2d');for(const c of [sky,back,mid,front])c.clearRect(0,0,W,H);
 for(let y=0;y<H;y++)px(sky,mix(P.sky.d[0],P.sky.d[1],y/H),0,y,W,1);px(sky,P.sun,150,15,9,7);px(sky,P.sunhi,151,15,5,3);
 for(let i=0;i<5;i++){const x=(i*43+Math.floor(t/7))%210-14,y=13+i%3*6;px(sky,P.cloudsh,x,y+3,23,3);px(sky,P.cloud,x+4,y,16,5);px(sky,P.cloud,x+9,y-2,7,2);}
 for(let x=0;x<W;x++){const y=40+Math.floor(Math.sin(x*.07)*9+Math.sin(x*.023)*10);px(back,P.far1,x,y,1,H-y);const z=59+Math.floor(Math.sin(x*.05+1)*9);px(back,P.far2,x,z,1,H-z);}
 if(specialScene(mid,front,P,m,t))return;
 const indoor=m.context==='confinement'||m.run?.life?.cultivation?.detained||m.context==='retreat'||m.context==='cavern'||['study','alchemy','array'].includes(m.activity)&&!['travel','valley','outer','beast','childhood'].includes(m.context);if(indoor){room(mid,P,m,t);return;}
 px(mid,P.grass,0,77,W,31);for(let i=0;i<95;i++)px(mid,i%3?P.grass2:P.grasshi,i*37%W,79+i*19%29,2,1);
 const outer=m.context==='outer',water=m.run&&currentContinent(m.run)==='tide';if(water){px(mid,P.water,0,78,65,30);for(let i=0;i<12;i++)px(mid,P.water2,(i*13+t)%63,81+i*7%26,7,1);}
 if(outer){px(mid,P.sky.d[1],0,79,W,29);for(let i=0;i<4;i++){const x=12+i*46,y=84+i%2*5;px(mid,P.grass,x,y,31,3);for(let r=0;r<9;r++)px(mid,P.stone,x+r,y+3+r,31-r*2,1);}}
 else for(let y=77;y<H;y++)px(mid,y%5?P.pave:P.pave2,67-(y-77)/3,y,22+(y-77)*.6,1);
 if(['home','abroad','birth','childhood','demonic'].includes(m.context)){house(mid,P,22,80,45,m.path==='mortal',Boolean(m.run?.flags?.fledWar));house(mid,P,132,81,36);lantern(mid,P,19,45,t);lantern(mid,P,174,48,t);}
 if(m.context==='travel'){house(mid,P,132,80,30,true);px(mid,P.trunk,52,72,1,19);px(mid,P.wall,42,72,13,5);px(mid,P.roof,43,73,10,1);}
 for(const [x,y]of [[6,90],[176,95],[120,84]])tree(mid,P,x,y);
 if(m.context==='valley')for(let i=0;i<10;i++){const x=11+i*15,y=86+i%3*4;px(mid,P.soil,x,y,10,3);for(let j=0;j<3;j++){px(mid,P.tree2,x+j*3,y-3,1,4);px(mid,P.treehi,x+j*3-1,y-3,3,1);px(mid,P.gold,x+j*3,y-5);}}
 if(m.context==='beast'){for(let x=22;x<56;x++)px(mid,P.stone,x,74-Math.floor(Math.sin((x-22)/34*Math.PI)*15),1,11);px(mid,P.ol,33,68,13,12);}
 if(outer){for(const x of [135,152]){px(mid,P.ol,x,51,5,33);px(mid,P.stone,x+1,52,3,31);}for(let i=0;i<16;i++)px(mid,P.me,141+i%11,56+i*3%24);}
 for(const [x,y]of [[35,104],[121,100],[164,91]])rock(front,P,x,y);person(front,P,86,100,m.run?.player.sex,m.age,m.robe,t,m.context==='travel'?'work':m.activity,m.path==='beast');m.companions.forEach((p,i)=>person(front,P,102+i*12,99-i%2*2,p.sex,Math.min(75,m.age+12),[P.sib,P.pt,P.par][i],t+i,'rest'));if(m.context==='valley'||outer)for(let i=0;i<6;i++)px(front,P.gold,79+i*7,92+(i+t)%7);
}
