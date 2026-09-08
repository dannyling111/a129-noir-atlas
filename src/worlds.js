function triangleMesh(tris){const p=[],n=[],ix=[];for(const t of tris){const nn=V.norm(V.cross(V.sub(t[1],t[0]),V.sub(t[2],t[0]))),k=p.length/3;for(const v of t){p.push(...v);n.push(...nn);}ix.push(k,k+1,k+2);}return {p,n,ix};}
Geo.roof=function(){const t=[],N=16;const y=(x,z)=>.84*Math.pow(Math.max(0,1-Math.abs(z)*2),1.6)*Math.min(1,(.58-Math.abs(x))/.24)+.12*(Math.pow(Math.abs(x)*2,6)+Math.pow(Math.abs(z)*2,6));for(let i=0;i<N;i++)for(let j=0;j<N;j++){let x=i/N-.5,z=j/N-.5,X=(i+1)/N-.5,Z=(j+1)/N-.5;const a=[x,y(x,z),z],b=[X,y(X,z),z],c=[X,y(X,Z),Z],d=[x,y(x,Z),Z];t.push([a,d,c],[a,c,b]);}return triangleMesh(t);};
Geo.mountain=function(seed=1){const p=[],n=[],ix=[],N=48,H=28;
 const point=(u,v)=>{const r=Math.pow(Math.max(.0001,1-v),.47)*(1+.10*Math.sin(u*5+seed)+.045*Math.cos(u*9+v*5+seed));return [Math.cos(u)*r+.13*Math.sin(v*4+seed)*v,v,Math.sin(u)*r+.09*Math.cos(v*6+seed)*v];};
 for(let j=0;j<=H;j++)for(let i=0;i<=N;i++){const u=i/N*Math.PI*2,v=j/H,q=point(u,v),du=V.sub(point(u+.001,v),point(u-.001,v)),dv=V.sub(point(u,Math.min(1,v+.001)),point(u,Math.max(0,v-.001)));p.push(...q);n.push(...V.norm(V.cross(dv,du)));}
 for(let j=0;j<H;j++)for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+1,c=a+N+2,d=a+N+1;ix.push(a,c,b,a,d,c);}return {p,n,ix};};
/* 5.2: one visible surface per floor location. A stack of coplanar boxes
   is NOT a material layer: it causes depth fighting even with shadows off.
   Partition all material rectangles on shared x/z edges, including junctions.
   The structural slab has sides and a bottom ONLY; the partition is its cap. */
Geo.openTopBox=function(){
 const source=Geo.box(),ix=[];
 for(let i=0;i<source.ix.length;i+=3){
  if(source.n[source.ix[i]*3+1]>.5)continue;
  ix.push(source.ix[i],source.ix[i+1],source.ix[i+2]);
 }
 return {p:source.p,n:source.n,ix};
};
function partitionFloor(width,depth,shade,patches=[]){
 const x0=-width/2,x1=width/2,z0=-depth/2,z1=depth/2;
 const rects=patches.map(p=>({...p,l:clamp(p.x-p.w/2,x0,x1),r:clamp(p.x+p.w/2,x0,x1),t:clamp(p.z-p.d/2,z0,z1),b:clamp(p.z+p.d/2,z0,z1)})).filter(p=>p.r>p.l&&p.b>p.t);
 const xs=[...new Set([x0,x1,...rects.flatMap(p=>[p.l,p.r])])].sort((a,b)=>a-b);
 const zs=[...new Set([z0,z1,...rects.flatMap(p=>[p.t,p.b])])].sort((a,b)=>a-b);
 const groups=new Map(),cells=[];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const l=xs[i],r=xs[i+1],t=zs[j],b=zs[j+1],x=(l+r)/2,z=(t+b)/2;
  let material={shade,tag:'rim'};
  for(const p of rects)if(x>p.l&&x<p.r&&z>p.t&&z<p.b)material=p;
  cells.push({l,r,t,b,shade:material.shade,tag:material.tag||'floor'});
  // A hole belongs to another physical surface (e.g. pond), not the ground.
  if(material.shade===null)continue;
  if(!groups.has(material.shade))groups.set(material.shade,[]);
  const tris=groups.get(material.shade),a=[l,0,t],c=[r,0,b];
  tris.push([a,[l,0,b],c],[a,c,[r,0,t]]);
 }
 return {groups,cells,width,depth,y:0};
}
class WorldBuilder {
 constructor(sc){this.sc=sc;sc.blockers=[];sc.spots=[];sc.rooms=[];sc.customMeshes={roof:Geo.roof(),mountain:Geo.mountain(2),mountain2:Geo.mountain(7),twig:Geo.loft([[0,1,1],[1,.32,.32]],6),foliage:Geo.sphere(10,6,.25)};}
 obj(mesh,p,s,shade=.6,rot=0,extra={}){const o={mesh,m:tr(p,s,rot),shade,static:true,...extra};this.sc.objects.push(o);return o;}
 box(p,s,shade=.6,rot=0,extra={}){return this.obj('box',p,s,shade,rot,extra);}
 floor(width,depth,thickness,rimShade,patches){
  const layout=partitionFloor(width,depth,rimShade,patches);
  this.sc.customMeshes.floorShell=Geo.openTopBox();
  this.obj('floorShell',[0,-thickness/2,0],[width,thickness,depth],rimShade);
  let id=0;
  for(const [shade,tris]of layout.groups){
   const name='floor-cap-'+id++;
   this.sc.customMeshes[name]=triangleMesh(tris);
   const finish=this.sc.id===7?(shade===.86?'stone':shade===.40?'stone':'wood'):(shade===.77?'paving':shade>.85?'path':'stone');
   this.obj(name,[0,0,0],[1,1,1],shade,0,{surface:4,finish});
  }
  this.sc.floorLayout={width,depth,y:0,cells:layout.cells,shell:'floorShell',partitioned:true};
 }

 line(a,b,r=.028,shade=.16,extra={}){const o={mesh:'twig',m:linkMatrix(a,b,r,r),shade,static:true,...extra};this.sc.objects.push(o);return o;}
 block(x,z,w,d,h=3){this.sc.blockers.push({kind:'rect',x,z,w,d,h});}
 circle(x,z,r,h=4){this.sc.blockers.push({kind:'circle',x,z,r,h});}
 spot(id,name,x,z,angle=0,kind='view',extra={}){const s={id,name,x,z,angle,kind,duration:kind==='view'?5:9,...extra};this.sc.spots.push(s);return s;}
 chair(x,z,angle=0,kind='seat',name='坐下',id=null){const trp=(dx,y,dz)=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),y,z-dx*Math.sin(angle)+dz*Math.cos(angle)];this.box(trp(0,.45,0),[.53,.09,.54],.24,angle,{finish:'wood'});this.box(trp(0,.79,-.235),[.53,.62,.075],.22,angle,{finish:'wood'});for(const dx of [-.21,.21])for(const dz of [-.20,.20])this.box(trp(dx,.22,dz),[.035,.44,.035],.16,angle,{finish:'metal'});return this.spot(id||'seat-'+this.sc.spots.length,name,x,z,angle,kind,{seat:true,approach:[x+Math.sin(angle)*.95,z+Math.cos(angle)*.95]});}
 desk(x,z,angle=0){this.box([x,.77,z],[2.1,.10,1.0],.49,angle,{finish:'wood'});for(const dx of [-.9,.9])for(const dz of [-.39,.39])this.box([x+dx*Math.cos(angle)+dz*Math.sin(angle),.38,z-dx*Math.sin(angle)+dz*Math.cos(angle)],[.06,.76,.06],.22,angle,{finish:'metal'});this.box([x,1.1,z-.2],[.79,.49,.055],.13,angle,{finish:'metal'});this.box([x,1.1,z-.164],[.68,.38,.012],.74,angle,{emissive:.08,finish:'neutral'});this.box([x,.848,z+.23],[.67,.028,.23],.20,angle,{finish:'metal'});this.block(x,z,2.1,1.0,1.4);}
 pine(x,z,h=4,seed=1,y=0){const sway=.45*Math.sin(seed*2);this.line([x,y,z],[x+sway,y+h,z+.1],h*.046,.105,{surface:1,finish:'wood'});for(let j=0;j<4;j++){const a=j*2.37+seed,lev=.4+j*.15,c=[x+sway*lev,y+h*lev,z+.1*lev],e=[c[0]+Math.cos(a)*h*(.5-j*.065),c[1]+h*.075,c[2]+Math.sin(a)*h*(.5-j*.065)];this.line(c,e,h*.019,.12,{finish:'wood'});for(let m=0;m<3;m++){const q=[e[0]+Math.cos(a+m*1.6)*h*.13,e[1]+h*.07,e[2]+Math.sin(a+m*1.6)*h*.13];this.obj('foliage',q,[h*.32,h*.072,h*.24],.15+(j%2)*.03,seed,{surface:1,finish:'leaf'});for(let k=0;k<7;k++){const a1=k/7*Math.PI*2;this.line(q,[q[0]+Math.cos(a1)*h*.33,q[1]+h*.035,q[2]+Math.sin(a1)*h*.26],h*.003,.11,{finish:'leaf'});}}}if(y===0)this.circle(x,z,h*.12,h);}
 roof(x,y,z,w,d,h=1.7,shade=.22){this.obj('roof',[x,y,z],[w,h,d],shade,0,{surface:1,finish:'roof'});const Y=(a,b)=>.84*Math.pow(Math.max(0,1-Math.abs(b)*2),1.6)*Math.min(1,(.58-Math.abs(a))/.24)+.12*(Math.pow(Math.abs(a)*2,6)+Math.pow(Math.abs(b)*2,6));for(let i=0;i<=Math.floor(w/.34);i++){const u=i/Math.floor(w/.34)-.5;for(let j=0;j<10;j++){const v=j/10-.5,Vv=(j+1)/10-.5;this.line([x+u*w,y+Y(u,v)*h+.025,z+v*d],[x+u*w,y+Y(u,Vv)*h+.025,z+Vv*d],.025,shade+.11,{finish:'roof'});}}this.line([x-w*.28,y+.88*h,z],[x+w*.28,y+.88*h,z],.075,shade+.04,{finish:'roof'});}
 pavilion(x,z,w=4,d=4){for(const dx of [-w*.38,w*.38])for(const dz of [-d*.36,d*.36]){this.box([x+dx,1.5,z+dz],[.15,3,.15],.2,0,{finish:'lacquer'});this.circle(x+dx,z+dz,.12,3);}this.roof(x,3.0,z,w,d,1.6,.20);this.box([x,3,z],[w*.9,.13,d*.8],.26,0,{finish:'wood'});}
 hall(x,z,w,d,h=3.5,roofShade=.26){this.box([x,.1,z],[w+.6,.2,d+.6],.55);this.box([x,h/2,z],[w,h,d],.69,0,{surface:1,finish:'plaster'});this.block(x,z,w+.25,d+.25,h+3);this.roof(x,h,z,w+1.4,d+1.4,2.0,roofShade);for(let i=0;i<5;i++){const px=x+(i-2)*w*.18;this.box([px,h*.42,z+d/2+.035],[w*.13,h*.65,.05],.14,0,{finish:'lacquer'});for(let j=-1;j<=1;j++)this.box([px+j*w*.032,h*.42,z+d/2+.074],[.018,h*.63,.022],.55,0,{finish:'wood'});}for(const px of [x-w*.46,x+w*.46])this.box([px,h/2,z+d/2+.15],[.17,h,.17],.22,0,{finish:'lacquer'});this.spot('hall-'+this.sc.spots.length,'屋檐下停留',x,z+d/2+1.15,Math.PI,'view');}
}
/* Flatten stationary architecture into per-material meshes. Humans, accents,
   water and waterfalls remain independent. Batches stay under Uint16 limits. */
function prepareWorld(renderer,sc){if(sc.world)assignWorldFinishes(sc);else assignAbstractFinishes(sc);if(!sc.customMeshes)return;renderer._worldNames??=[];for(const name of renderer._worldNames){const mesh=renderer.meshes[name];if(mesh){renderer.gl.deleteVertexArray(mesh.vao);renderer.gl.deleteBuffer(mesh.vb);renderer.gl.deleteBuffer(mesh.eb);}delete renderer.meshes[name];}renderer._worldNames=[];for(const [name,g]of Object.entries(sc.customMeshes)){renderer.meshes[name]=renderer.mesh(g);renderer._worldNames.push(name);}
 const sources={box:Geo.box(),sphere:Geo.sphere(24,16),rock:Geo.sphere(48,32,.055),...sc.customMeshes},groups=new Map(),live=[];
 for(const o of sc.objects){if(!o.static||!sources[o.mesh]){live.push(o);continue;}const key=JSON.stringify([o.shade,o.tint,o.emissive,o.surface,o.finish]);if(!groups.has(key))groups.set(key,{items:[],material:o});groups.get(key).items.push(o);}
 let count=0;for(const group of groups.values()){let p=[],n=[],ix=[];const flush=()=>{if(!p.length)return;const name='world-batch-'+count++;renderer.meshes[name]=renderer.mesh({p,n,ix});renderer._worldNames.push(name);const o=group.material;live.push({mesh:name,m:M.identity(),shade:o.shade,tint:o.tint,emissive:o.emissive,surface:o.surface,finish:o.finish});p=[];n=[];ix=[];};for(const o of group.items){const g=sources[o.mesh];if(p.length/3+g.p.length/3>60000)flush();const k=p.length/3,inv=M.inverse(o.m);for(let i=0;i<g.p.length;i+=3){p.push(...M.transform(o.m,g.p.slice(i,i+3)).slice(0,3));const v=g.n.slice(i,i+3);n.push(...V.norm([inv[0]*v[0]+inv[1]*v[1]+inv[2]*v[2],inv[4]*v[0]+inv[5]*v[1]+inv[6]*v[2],inv[8]*v[0]+inv[9]*v[1]+inv[10]*v[2]]));}for(const v of g.ix)ix.push(k+v);}flush();}sc.sourceObjectCount=sc.objects.length;sc.objects=live;}

SCENE_META.push(
 {title:'灯下楼层',en:'ROOMS, WITHIN REACH',line:'一栋楼，\n六种日常。',note:'推门、入座、工作，或者与偶遇的人说句话。',tag:'房间 · 生活'},
 {title:'山水行旅',en:'MOUNTAINS IN MONOCHROME',line:'人在画中走，\n山水慢慢醒来。',note:'松风、飞瀑与曲桥。不是一张贴图，而是可以走入的山水。',tag:'山水 · 行旅'},
 {title:'庭院城记',en:'THE COURTYARD ATLAS',line:'一城烟火，\n在方寸之间。',note:'穿过院门，走过小桥。在街巷和茶亭与人相遇。',tag:'古建 · 庭院'}
);
function createWorld(id){const sc={id,objects:[],dynamic:[],background:.79,ambient:.36,strength:.92,fog:.0014,volume:.14,span:49,eye:[33,34,43],at:[0,0,-1],light:{pos:[-24,34,-28],target:[0,0,0]},bounds:[-14,14,-10,10],height:()=>0,spawns:[],obstacles:[],world:true,paper:[1,1,1]};const b=new WorldBuilder(sc);
 if(id===7){
  sc.background=.70;sc.span=44;sc.at=[0,.7,0];sc.eye=[28,33,40];sc.ambient=.30;sc.strength=1.1;sc.volume=.24;sc.light={pos:[-22,29,-30],target:[0,0,3]};sc.paper=[1,1,1];
  const rooms=[[-9,-5.8,'01  创作室'],[0,-5.8,'02  会议室'],[9,-5.8,'03  书房'],[-9,5.8,'04  工作室'],[0,5.8,'05  茶水间'],[9,5.8,'06  画廊']];
  b.floor(29,21,.7,.40,[{x:0,z:0,w:28,d:20,shade:.86,tag:'corridor'},...rooms.map(([x,z,name])=>({x,z,w:8.65,d:7.8,shade:z<0?.79:.74,tag:name}))]);
  for(const [x,z,name]of rooms)sc.rooms.push({x,z,name});
  // Open-roof cutaway. Collision uses the same door openings as the walls.
  for(const x of [-13.95,13.95]){b.box([x,x<0?1.55:.2,0],[.18,x<0?3.1:.4,20],.74);b.block(x,0,.18,20,3.1);}
  b.box([0,.18,9.98],[28,.36,.18],.67);b.block(0,9.98,28,.18,.36);
  for(const x of [-12,-6,0,6,12]){b.box([x,1.75,-10],[.2,3.5,.18],.37);b.block(x,-10,.2,.18,3.5);}
  b.box([0,.38,-10],[28,.76,.16],.8);b.box([0,3.5,-10],[28,.18,.16],.8);
  for(let x=-12;x<=12;x+=3){b.box([x,2,-10.03],[.045,2.35,.06],.31);b.box([x,1.94,-10.05],[2.90,.035,.06],.31);}
  for(const z of [-1.5,1.5]){for(const cx of [-9,0,9]){for(const side of [-1,1]){const x=cx+side*2.77,w=3.50;b.box([x,.85,z],[w,1.7,.16],.79);b.block(x,z,w,.16,2.8);}b.box([cx,2.85,z],[1.85,.11,.16],.34);for(const dx of [-.99,.99])b.box([cx+dx,1.42,z],[.06,2.84,.16],.30);}}
  for(const x of [-4.5,4.5])for(const z of [-5.75,5.75]){b.box([x,.95,z],[.16,1.9,8.3],.74);b.block(x,z,.16,8.3,2.9);}
  // North-west studio / southern workspace: seats align with real desks.
  b.desk(-10,-6.0);b.chair(-10,-4.90,Math.PI,'work','创作室 · 办公','studio-desk');
  b.desk(-8.1,6.6);b.chair(-8.1,7.70,Math.PI,'work','工作室 · 办公','south-desk');
  b.box([-11.8,.56,4.0],[2.6,1.12,.4],.56);b.block(-11.8,4,2.6,.4,1.12);
  b.box([0,.75,-6.0],[3.5,.12,2.0],.43);b.block(0,-6,3.5,2,1.0);for(const x of [-1.1,1.1]){b.chair(x,-4.4,Math.PI,'meet','会议室 · 入座');b.chair(x,-7.55,0,'meet','会议室 · 入座');}
  // Bookshelf with narrow alternating spines (not an image plane).
  b.box([10.0,1.2,-9.5],[6,2.4,.42],.31,0,{finish:'wood'});b.block(10,-9.5,6,.5,2.5);for(let row=0;row<4;row++){b.box([10,row*.55+.17,-9.18],[5.85,.05,.32],.7,0,{finish:'wood'});for(let k=0;k<22;k++)b.box([7.35+k*.25,.36+row*.55,-9.15],[.11,.34+(k%3)*.04,.23],.38+(k%5)*.08,0,{finish:'book'});}
  b.chair(9,-5.3,Math.PI*.73,'read','书房 · 读书','library-seat');b.spot('library-view','看书架',9,-7.8,Math.PI,'view');
  b.box([0,.77,7.2],[3.5,.12,1.7],.50);b.block(0,7.2,3.5,1.7,1);b.chair(-1,5.7,0,'tea','茶水间 · 喝茶','tea-one');b.chair(1,5.7,0,'tea','茶水间 · 喝茶','tea-two');for(const x of [-.8,.8]){b.obj('sphere',[x,.87,7.05],[.10,.09,.10],.64);b.obj('sphere',[x,.91,7.05],[.073,.04,.073],.18);}
  b.box([0,.55,9.35],[6,1.1,.65],.70);b.block(0,9.35,6,.65,1.1);b.box([1.4,1.38,9.2],[.6,.55,.48],.22);
  b.box([11.8,1.60,3.7],[2.3,2.6,.14],.2);b.box([11.8,1.60,3.79],[2.1,2.4,.015],.82);b.obj('sphere',[11.65,1.78,3.82],[.55,.55,.017],.14);b.line([11,1,3.85],[12.4,1.7,3.85],.014,.19);b.block(11.8,3.7,2.4,.16,3);b.spot('gallery-art','画廊 · 看画',11.7,6.25,Math.PI,'view');b.chair(7.3,6.6,1.1,'seat','画廊 · 静坐','gallery-seat');
  for(const [x,z]of [[-12.3,-8.2],[12.2,-2.8],[3.1,8.9],[-12.4,8.8]]){b.box([x,.25,z],[.58,.5,.58],.31);b.pine(x,z,1.7,x+z);}
  for(const [x,z]of [[-7,-5.8],[8.6,6.7],[2.2,-8.2]]){b.line([x,0,z],[x,2.3,z],.025,.25);b.obj('roof',[x,2.25,z],[.9,.4,.7],.68);}
  b.spot('corridor-west','西侧走廊',-8,0,Math.PI/2,'view');b.spot('corridor-east','东侧走廊',8,0,-Math.PI/2,'view');
  sc.spawns=[[-8,0,'idle',1.5],[1,-3.0,'idle',Math.PI],[7,-4,'idle',2.1],[-10,3.4,'idle',.2],[0,3.5,'idle',.2],[7,3.5,'idle',1.5]];
 }else if(id===8){
  sc.bounds=[-21,21,-18,19];sc.span=66;sc.eye=[23,30,50];sc.at=[0,7,-2];sc.background=.86;sc.ambient=.56;sc.strength=.69;sc.fog=.0048;sc.volume=.12;sc.paper=[1,1,1];sc.light={pos:[-25,42,-25],target:[0,0,0]};
  b.box([0,-.16,0],[260,.25,250],.91,0,{surface:4,finish:'grass'});
  // The river is a world-space curved ribbon, with two actual crossing zones.
  const rx=z=>-2.2+2.6*Math.sin(z*.15),river=[];for(let z=-70;z<=80;z+=1)river.push([rx(z),z]);
  sc.customMeshes.river=Geo.ribbon(river,3.0,.3);b.obj('river',[0,.015,0],[1,1,1],.49,0,{surface:2,static:false,finish:'water'});
  const bridges=[{z:3,x:rx(3)},{z:-9,x:rx(-9)}];sc.walkMask=(x,z,r)=>Math.abs(x-rx(z))>1.55+r||bridges.some(q=>Math.abs(z-q.z)<.83-r);
  for(const q of bridges){b.box([q.x,.07,q.z],[5.5,.14,1.7],.55,0,{finish:'wood'});for(const side of [-1,1]){for(let i=0;i<8;i++)b.box([q.x-2.55+i*.73,.5,q.z+side*.82],[.07,.9,.07],.36);b.line([q.x-2.6,.92,q.z+side*.82],[q.x+2.6,.92,q.z+side*.82],.045,.32);}b.spot('bridge-'+q.z,'曲桥 · 看水',q.x+.2,q.z,Math.PI/2,'view');}
  const mountains=[[-16,-13,6,17,5,.52],[0,-21,7.3,24,6,.73],[13,-16,5.8,18,6,.60],[-23,-23,8,23,8,.88],[22,-28,7,27,8,.91],[-13,1,4.2,7,4,.43],[13,2,4.0,6.5,3.2,.47]];
  mountains.forEach(([x,z,w,h,d,s],i)=>{b.obj(i%2?'mountain2':'mountain',[x,-.10,z],[w,h,d],s,0,{surface:1,finish:'stone'});if(x>-21&&x<21&&z>-18)b.circle(x,z,Math.max(w,d)*1.06,h);});
  // A pale falling ribbon with a clean solid surface; detached falling drops supply movement.
  const falls=[];for(let j=0;j<45;j++){const f=t=>{const y=18.0-t*17.9,cx=4.1+.42*Math.sin(t*6.2),width=.25+.6*t*t;return [[cx-width/2,y,-14.3+.55*t],[cx+width/2,y,-14.3+.55*t]];};const a=f(j/45),c=f((j+1)/45);falls.push([a[0],c[0],c[1]],[a[0],c[1],a[1]]);}sc.customMeshes.falls=triangleMesh(falls);b.obj('falls',[0,0,0],[1,1,1],.95,0,{surface:3,emissive:.20,static:false,finish:'neutral'});
  for(let i=0;i<12;i++){const o=b.obj('sphere',[4.2,1,-14],[.027,.34,.022],.86,0,{emissive:.1,static:false});sc.dynamic.push(t=>{o.m=tr([3.78+(i%5)*.14,18.9-((t*3+i*1.41)%18.3),-14.52],[.016,.2+(i%3)*.12,.016]);});}
  for(const [x,z,h,s]of [[-14,12,6,1],[-10,11,4.2,3],[14,11,5,5],[18,4,3.7,6],[8,-6,4,8],[-8,-8,3.2,2],[-17,-4,3.6,11]])b.pine(x,z,h,s);
  b.pine(-15,-13,3.6,4,13.1);b.pine(14,-16,3.0,2,12.5);b.pine(-22,-22,3,12,15);
  b.pavilion(8,-8,4.6,4.3);b.chair(8,-7.7,Math.PI*.7,'read','松风亭 · 读书','pine-pavilion');
  b.box([-7,.42,6],[2.6,.14,.62],.39);b.box([-8,.2,6],[.3,.4,.45],.34);b.box([-6,.2,6],[.3,.4,.45],.34);b.spot('stone-seat','临水石凳 · 静坐',-7,6,Math.PI/2,'seat',{seat:true});
  for(let i=0;i<40;i++){const z=15-i*.68,x=9+2.0*Math.sin(z*.19);if(sc.walkMask(x,z,.28)&&!sc.blockers.some(o=>o.kind==='circle'&&Math.hypot(x-o.x,z-o.z)<o.r+1))b.box([x,.018,z],[.8,.026,.42],.60,(i%5)*.12,{surface:1});}
  b.spot('falls','飞瀑 · 仰望',6.5,-12.3,Math.PI,'view');b.spot('south-pine','松下 · 停留',-10,8.5,-1.4,'view');b.spot('east-trail','山径 · 观景',10,6,-.2,'view');b.spot('river-east','溪畔 · 看水',4.1,2.7,-Math.PI/2,'view');b.spot('river-west','溪畔 · 歇脚',-6,-4,Math.PI/2,'view');
  sc.height=(x,z)=>bridges.some(q=>Math.abs(x-q.x)<=2.75&&Math.abs(z-q.z)<=.85)?.14:0;
  sc.spawns=[[7,10,'idle',Math.PI],[-7,8,'idle',-2],[8,-5,'idle',2.5],[-9,-5,'idle',1.5],[8,4,'idle',-1.2]];
  sc.rooms=[{name:'松风入画',x:-11,z:13},{name:'听瀑',x:7,z:-11},{name:'一水相逢',x:3,z:3}];
 }else{
  sc.bounds=[-17,17,-18.6,18.6];sc.span=59;sc.eye=[35,41,47];sc.at=[0,1,0];sc.background=.80;sc.ambient=.43;sc.strength=.80;sc.fog=.001;sc.volume=.10;sc.paper=[1,1,1];
  // Courtyard, crossroads and rim share vertices and height; no overlapping
  // slabs, millimetre-separated road decals or hidden coplanar base top.
  b.floor(35,38.5,.8,.36,[
   {x:0,z:0,w:34,d:37.2,shade:.77,tag:'courtyard'},
   {x:0,z:0,w:3,d:35.5,shade:.90,tag:'axial-path'},
   {x:0,z:1.2,w:32,d:2.4,shade:.87,tag:'cross-path'},
   {x:0,z:-12.2,w:31,d:2.0,shade:.87,tag:'rear-path'},
   {x:-10,z:8.2,w:9,d:7.6,shade:null,tag:'pond-opening'}
  ]);
  for(const x of [-16.8,16.8]){b.box([x,1.4,0],[.32,2.8,37.2],.83);b.block(x,0,.32,37.2,2.8);for(let z=-18;z<18;z+=3.5)b.roof(x,2.8,z+.5,.85,4.2,.55,.28);}
  b.box([0,1.45,-18.4],[34,2.9,.32],.80);b.block(0,-18.4,34,.32,2.9);b.roof(0,2.9,-18.4,35,.85,.65,.27);
  for(const x of [-10.2,10.2]){b.box([x,.5,18.4],[13.2,1,.3],.76);b.block(x,18.4,13.2,.3,2.9);b.roof(x,1.05,18.4,13.6,.9,.6,.24);}
  for(const x of [-2.9,2.9]){b.box([x,1.6,17.6],[1.15,3.2,1.4],.66);b.block(x,17.6,1.15,1.4,5);}b.roof(0,3.3,17.6,8,3.5,1.6,.27);b.box([0,3.0,18.38],[3,.7,.1],.19);b.spot('gate','院门 · 迎客',0,15.7,0,'view');
  b.hall(0,-8.0,9.3,5.7,4.2,.31);b.hall(-10,-5.5,5.6,6.0,2.85,.27);b.hall(10,-5.5,5.6,6.0,2.85,.27);b.hall(-9,-15,5.5,3.6,2.6,.29);b.hall(9,-15,5.5,3.6,2.6,.29);
  for(const x of [-4,4])for(const z of [-3.5,1,4.5]){b.box([x,.30,z],[.65,.6,.65],.48);b.obj('sphere',[x,.65,z],[.48,.45,.48],.20,0,{surface:1,finish:'leaf'});b.circle(x,z,.53,1.3);}
  // Pond cannot be crossed except over its bridge. Bridge has real rail openings.
  const pond={x:-10,z:8.2,w:9,d:7.6};b.box([pond.x,.015,pond.z],[pond.w,.04,pond.d],.43,0,{surface:2,static:false,finish:'water'});
  sc.walkMask=(x,z,r)=>!(x>-14.5-r&&x<-5.5+r&&z>4.4-r&&z<12+r)||Math.abs(z-8.15)<.82-r;
  b.box([-10,.13,8.15],[10.2,.26,1.65],.79,0,{finish:'stone'});for(const side of [-1,1]){b.line([-15,.95,8.15+side*.83],[-5,.95,8.15+side*.83],.05,.76);for(let i=0;i<14;i++)b.box([-15+i*.77,.57,8.15+side*.83],[.08,.92,.08],.73);}
  b.spot('pond-bridge','曲桥 · 观鱼',-10,8.15,0,'view');b.spot('pond-edge','池边 · 赏景',-4.5,6,-Math.PI/2,'view');
  b.pavilion(9.4,8.3,5.4,5.0);b.chair(8.6,8.3,Math.PI/2,'tea','茶亭 · 品茶','town-tea-a');b.chair(10.2,8.3,-Math.PI/2,'tea','茶亭 · 品茶','town-tea-b');b.box([9.4,.68,8.3],[.65,.1,.7],.5);b.block(9.4,8.3,.65,.7,.78);
  for(const x of [6.5,10.5]){b.box([x,.8,14.1],[2.8,.12,1.5],.49);b.block(x,14.1,2.8,1.5,1.4);for(const dx of [-1.3,1.3]){b.box([x+dx,1.4,14.7],[.09,2.8,.09],.22);}b.roof(x,2.8,14.1,3.4,2.5,.65,.34);for(let i=0;i<6;i++)b.obj('sphere',[x-1+i*.39,.97,14.0],[.11,.13,.13],.38);b.spot('market-'+x,'集市 · 看器物',x,12.6,0,'view');}
  for(const [x,z,h,s]of [[-14,1,4,1],[13,2,4.7,2],[-6,-15,3.4,3],[6,-15,4,4],[14,14,3.3,5],[-13,15,3.2,6]])b.pine(x,z,h,s);
  for(let i=0;i<5;i++){const o=b.obj('sphere',[-12+i,.05,6],[.12,.02,.30],.23,0,{static:false});sc.dynamic.push(t=>{o.m=tr([-10+2.7*Math.cos(t*.17+i*1.2),.05,6.0+Math.sin(t*.2+i)*.7],[.10,.018,.23],Math.PI/2+t*.2+i);});}
  sc.rooms=[{x:0,z:-4.4,name:'听雨堂'},{x:9.4,z:11,name:'茶亭'},{x:-10,z:13,name:'曲水'},{x:0,z:18,name:'院门'}];
  sc.height=(x,z)=>x>=-15.1&&x<=-4.9&&Math.abs(z-8.15)<=.825?.26:0;
  sc.spawns=[[0,13.5,'idle',Math.PI],[4,2,'idle',-1.5],[-3,-3,'idle',0],[8,11,'idle',2.6],[-4,8.15,'idle',-1.5],[2,-13,'idle',0],[-11,1,'idle',1.5]];
 }
 return installNavigation(sc);
}

// Small intentional islands of colour. They are objects in world-space,
// not a screen sticker layer; depth / occlusion use the normal scene buffer.
const ACCENT_PALETTE=[[1,.035,.18],[.025,.82,1],[1,.56,.015],[.64,.10,1],[.05,1,.35],[1,.11,.55]];
const ACCENT_NAMES=['朱红','电蓝','琥珀','紫罗兰','青绿','玫红'];
