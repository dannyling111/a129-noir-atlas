const SCENE_META=[
 {title:'光之门',en:'THE THRESHOLD',line:'在无声处，\n走向一束光。',note:'一道门，一片黑。光在等待你的影子。',tag:'光束 · 长影'},
 {title:'无尽之阶',en:'INFINITE ASCENT',line:'每一步，\n都是新的高度。',note:'没有终点的上升。脚下的阴影与台阶相遇。',tag:'阶梯 · 斜光'},
 {title:'悬石',en:'THE WEIGHT',line:'渺小，\n也是一种力量。',note:'巨石悬于寂静之上。你与它共用一束光。',tag:'巨物 · 悬浮'},
 {title:'折返',en:'THE PASSAGE',line:'路会转弯。\n光不会。',note:'在空白与深渊之间，沿着折线行走。',tag:'曲径 · 深渊'},
 {title:'柱之林',en:'THE SILENCE',line:'秩序之中，\n留一点自由。',note:'向上生长的几何，与自由的身体。',tag:'柱阵 · 雾境'},
 {title:'日蚀',en:'AN ECLIPSE, SLOWLY',line:'光的缺口，\n容得下一个人。',note:'一道悬置的光环。身体、影子与一点颜色，缓缓经过。',tag:'光环 · 负空间'},
 {title:'双界',en:'BETWEEN WORLDS',line:'在两种寂静之间，\n轻轻悬停。',note:'巨大的曲面，让出一线光。人不必落地，也可以停留。',tag:'曲面 · 光隙'}
];
function createScene(id){if(id>=7)return createWorld(id);let objects=[],dynamic=[],path=null;const box=(p,s,shade=.5,rot=0,extra={})=>{let o={mesh:'box',m:tr(p,s,rot),shade,...extra};objects.push(o);return o;};
 let sc={id,objects,dynamic,background:.06,ambient:.09,strength:1.15,fog:.002,volume:1,span:48,eye:[27,19,39],at:[0,2,-5],light:{pos:[-12,23,-21],target:[0,0,5]},bounds:[-18,18,-20,20],height:()=>0,spawns:[[-3,5,'idle',-.4],[5,-4,'reach',-.6]],obstacles:[]};
 if(id===0){
  sc.background=.032;sc.ambient=.085;sc.strength=1.55;sc.fog=.0017;sc.volume=1.12;sc.eye=[23,17,40];sc.at=[0,2,-6];sc.span=49;sc.light={pos:[0,4.1,-26],target:[0,-1,9],spot:true,cone:.80,fov:1.5};
  box([0,-.42,4],[95,.8,120],.84);
  // Three solid wall pieces leave a real opening, not a painted rectangle.
  box([-20.25,14,-22],[36.5,28,1.1],.15);box([20.25,14,-22],[36.5,28,1.1],.15);box([0,18,-22],[4,20,1.1],.13);
  box([0,4,-23.6],[3.99,8,.12],1,0,{emissive:1.8});
  box([-2.08,4,-21.7],[.12,8,.6],.65);box([2.08,4,-21.7],[.12,8,.6],.65);
  sc.spawns=[[-1.8,5,'idle',2.7],[6,-5,'reach',2.9]];sc.bounds=[-20,20,-20,25];
 }else if(id===1){
  sc.background=.72;sc.ambient=.15;sc.strength=.9;sc.volume=.18;sc.fog=.0014;sc.span=54;sc.eye=[8,19,47];sc.at=[0,10,0];sc.light={pos:[-31,45,16],target:[2,9,0]};
  const N=56,step=.86,rise=.40,start=-24.08;
  for(let i=0;i<N;i++){let h=(i+1)*rise;box([start+(i+.5)*step,h/2-17,0],[step+.006,h+34,9],.24);}
  // Steps are actual traversable surfaces; feet query the same height function.
  sc.height=x=>clamp(Math.floor((x-start)/step)+1,1,N)*rise;
  sc.bounds=[-23.8,23.4,-4.1,4.1];sc.spawns=[[-10.8,2,'idle',Math.PI/2],[7.5,-.7,'reach',Math.PI/2]];
 }else if(id===2){
  sc.background=.53;sc.ambient=.17;sc.strength=1.0;sc.volume=.20;sc.fog=.002;sc.span=46;sc.eye=[23,16,42];sc.at=[0,5,-2];sc.light={pos:[-30,42,24],target:[2,1,2]};
  box([0,-1,0],[120,2,100],.75);
  const rock={mesh:'rock',m:tr([1,11,-3],[8.2,4.7,6.2]),shade:.40};objects.push(rock);dynamic.push(t=>rock.m=compose(M.translation(1,11+Math.sin(t*.32)*.28,-3),M.ry(.15+Math.sin(t*.10)*.027),M.scale(8.2,4.7,6.2)));
  sc.spawns=[[-8,7,'idle',2.2]];sc.bounds=[-18,18,-15,19];
 }else if(id===3){
  sc.background=.19;sc.ambient=.22;sc.strength=1.08;sc.volume=.42;sc.fog=.002;sc.span=58;sc.eye=[17,29,40];sc.at=[0,3,0];sc.light={pos:[-26,40,20],target:[0,0,-7]};
  path=PATH_POINTS.map(p=>p.slice());let s=0;path=path.map((p,i)=>{if(i)s+=Math.hypot(p[0]-path[i-1][0],p[1]-path[i-1][1]);return [...p,s];});
  objects.push({mesh:'walkway',m:M.identity(),shade:.70});
  box([-24.5,14,-28],[39,28,1],.055);box([20.5,14,-28],[43,28,1],.055);box([-3,19,-28],[4,18,1],.055);box([-3,4,-28.6],[3.8,8,.12],1,0,{emissive:1.4});
  sc.path=path;sc.spawns=[[-7.6,16.1,'idle',2.0],[0,-10.3,'reach',2.2]];sc.bounds=[-13,11,-27.4,19];
 }else if(id===4){
  sc.background=.76;sc.ambient=.22;sc.strength=.85;sc.volume=.24;sc.fog=.004;sc.span=47;sc.eye=[22,14,39];sc.at=[0,7,-2];sc.light={pos:[-19,38,-22],target:[8,3,3]};
  box([0,-.5,0],[100,1,100],.76);
  for(let row=0;row<7;row++)for(let col=0;col<7;col++){let x=3+col*1.15,z=-17+row*2.5,h=9+((row*19+col*13)%17)*1.15+col*1.0;box([x,h/2,z],[.52,h,.68],.30+((row+col)%4)*.055);sc.obstacles.push({x,z,r:.67});}
  sc.spawns=[[-7,5,'float',.55]];sc.bounds=[-18,12,-17,18];
  }else if(id===5){
  sc.background=.66;sc.ambient=.17;sc.strength=1.08;sc.volume=.23;sc.fog=.0018;
  sc.span=43;sc.eye=[13,13,42];sc.at=[0,7,-3];sc.light={pos:[-26,30,-12],target:[0,0,5]};
  box([0,-.52,0],[130,1,140],.88);
  // Sculptural eclipse: a real luminous disc, offset dark lens, and hairline orbit.
  objects.push({mesh:'disc',m:tr([0,11,-10],[9.3,9.3,1]),shade:1,emissive:1.35});
  const lens={mesh:'artSphere',m:tr([.7,11.3,-8.9],[8.65,8.65,1.1]),shade:.018};objects.push(lens);
  const orbit={mesh:'thinRing',m:compose(M.translation(0,11,-10),M.ry(-.14),M.scale(10.25,10.25,10.25)),shade:.47};objects.push(orbit);
  dynamic.push(t=>{lens.m=tr([.70+.12*Math.sin(t*.065),11.30+.07*Math.sin(t*.10),-8.9],[8.65,8.65,1.1]);orbit.m=compose(M.translation(0,11,-10),M.ry(-.14+Math.sin(t*.045)*.065),M.scale(10.25,10.25,10.25));});
  box([-12,.012,5],[.035,.025,13],.09,-.12);
  sc.spawns=[[-6.8,6,'idle',2.9],[6.8,-1,'look',3.0]];sc.bounds=[-16,16,-5,19];
 }else if(id===6){
  sc.background=.76;sc.ambient=.09;sc.strength=1.20;sc.volume=.32;sc.fog=.0024;
  sc.span=43;sc.eye=[8,10,43];sc.at=[0,5,-2];sc.light={pos:[-25,26,-16],target:[0,0,6]};
  box([0,-.07,0],[120,.14,110],.80);
  const upper={mesh:'artSphere',m:tr([0,25,-11],[37,18,22]),shade:.025};
  const lower={mesh:'artSphere',m:tr([0,-14.5,-8],[39,14,28]),shade:.035};
  objects.push(upper,lower);
  dynamic.push(t=>{upper.m=tr([0,25+.12*Math.sin(t*.1),-11],[37,18,22]);});
  // A small vertical light slit is not a screen overlay: it is occluded in 3D.
  box([7.8,4,-18],[.06,6,.06],.9,0,{emissive:.7});
  sc.spawns=[[-5,2,'float',2.9],[7,0,'look',3.0]];sc.bounds=[-16,16,-8,17];
 }
 sc.constrain=(x,z)=>{x=clamp(x,sc.bounds[0],sc.bounds[1]);z=clamp(z,sc.bounds[2],sc.bounds[3]);if(sc.path){let p=nearestPath(x,z,sc.path);return [p.x,p.z,p.s];}for(const o of sc.obstacles){let dx=x-o.x,dz=z-o.z,l=Math.hypot(dx,dz);if(l<o.r){let d=l||1;x=o.x+(dx||o.r)*o.r/d;z=o.z+dz*o.r/d;}}return [x,z];};
 return sc;
}

/* 4.0 — radius-aware A*, connected walkable regions, no diagonal corner cutting.
   Destination projection is separate from swept movement: a blocked click may
   project onto nearby ground; a moving person must never teleport through a wall. */
