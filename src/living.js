class LivingWorld {
 constructor(app){this.app=app;this.pairs=[];this.events=[];this.reserved=new Map();this.serial=0;this.nextSocial=0;}
 setup(){this.pairs=[];this.events=[];this.reserved.clear();this.nextSocial=this.app.time+10;this.app.actors.forEach((a,i)=>{a.life={task:null,next:this.app.time+.3+i*.6,cycle:0,seed:i};a.route=[];a.seatId=null;a.speech=null;});}
 event(text){this.events.push({time:this.app.time,text});if(this.events.length>40)this.events.shift();}
 cancel(a){if(!a)return;if(a.seatId){this.reserved.delete(a.seatId);a.blendFrom=poseControls(a,this.app.scene,this.app.time);a.blendAt=this.app.time;}if(a.life?.task?.spot)this.reserved.delete(a.life.task.spot);a.seatId=null;a.route=[];a.target=null;a.speed=0;a.gaitWeight=0;a.speech=null;const pair=this.pairs.find(p=>p.a===a.id||p.b===a.id);if(pair){this.endPair(pair);this.pairs=this.pairs.filter(p=>p!==pair);}if(a.life){a.life.task=null;a.life.next=this.app.time+3;}if(['work','read','tea','chair','talk'].includes(a.pose)){a.pose='idle';a.poseSince=this.app.time;}}
 pose(a,pose){this.app.exhibition.pose(a,pose);a.speed=0;a.gaitWeight=0;a.moving=false;}
 route(a,x,z){const app=this.app;if(a.flying){const p=app.constrainAir(x,z,a.flightY);a.route=[];a.target={x:p[0],z:p[1]};return true;}const q=app.scene.nav.route(a.x,a.z,x,z);if(!q)return false;a.route=q.slice(1);a.target=q.length?{x:q[0][0],z:q[0][1]}:null;a.auto=false;return true;}
 visit(a,spotId,manual=false){const app=this.app,s=app.scene.spots.find(p=>p.id===spotId);if(!s)return false;if(a.flying){if(manual)app.toast('请先着陆，再使用椅子、桌子或参观点。');return false;}if(this.reserved.has(s.id)&&this.reserved.get(s.id)!==a.id){if(manual)app.toast('这里有人，换一张座位吧。');return false;}this.cancel(a);if(manual){a.brain.manual=true;app.director.stopPlayback();}a.life??={cycle:0,seed:0,next:0};this.reserved.set(s.id,a.id);a.life.task={kind:'spot',spot:s.id,stage:'walking',manual,since:app.time};this.pose(a,'idle');const p=s.approach||[s.x,s.z];if(!this.route(a,...p)){this.reserved.delete(s.id);a.life.task=null;if(manual)app.toast('这个位置暂时没有连通的行走路线。');return false;}a.brain.label='前往'+s.name;if(manual){app.setPaused(false);app.toast('前往'+s.name+' · 自动绕开障碍');}return true;}
 finishTask(a){const task=a.life.task;if(task?.spot)this.reserved.delete(task.spot);a.seatId=null;this.pose(a,'idle');a.life.task=null;a.life.next=this.app.time+1.6+(a.id%3);a.life.cycle++;a.route=[];a.target=null;}
 nextTask(a){const sc=this.app.scene,i=a.life.seed,cycle=a.life.cycle;const preferred=sc.id===7?['studio-desk','seat-2','library-seat','south-desk','tea-one','gallery-art']:sc.id===8?['pine-pavilion','stone-seat','river-east','falls','south-pine']:['gate','town-tea-a','pond-edge','town-tea-b','pond-bridge','market-6.5','hall-0'];let s=sc.spots.find(p=>p.id===preferred[(i+cycle)%preferred.length]);if(!s||this.reserved.has(s.id)){const choices=sc.spots.filter(s=>!this.reserved.has(s.id));s=choices[(i*3+cycle*5)%choices.length];}if(s){if(!this.visit(a,s.id,false)){a.life.next=this.app.time+3;a.life.cycle++;}}}
 update(a,dt){const app=this.app,sc=app.scene;if(!sc.world)return;const b=a.brain;if(!a.life)a.life={task:null,next:app.time+1,cycle:0,seed:a.id};
 if(!a.target&&a.route?.length){const p=a.route.shift();a.target={x:p[0],z:p[1]};}
 const pair=this.pairs.find(p=>p.a===a.id||p.b===a.id);if(pair)return;
 const task=a.life.task;if(task?.kind==='spot'){
  const s=sc.spots.find(s=>s.id===task.spot);if(!s){this.finishTask(a);return;}
  if(task.stage==='walking'&&!a.target&&!a.route.length){if(s.seat&&Math.hypot(a.x-s.x,a.z-s.z)>.06){this.route(a,s.x,s.z);task.stage='align';}else {task.stage='align';}}
  if(task.stage==='align'&&!a.target&&!a.route.length){const d=angleDelta(a.angle,s.angle);a.angle+=clamp(d,-dt*2,dt*2);if(Math.abs(d)<.05){a.angle=s.angle;task.stage='using';task.since=app.time;a.seatId=s.seat?s.id:null;const p=s.kind==='work'?'work':s.kind==='read'?'read':s.kind==='tea'?'tea':s.kind==='meet'?'talk':s.seat?'chair':'look';this.pose(a,p);a.brain.label=s.name;this.event('人物 '+a.id+' · '+s.name);}}
  if(task.stage==='using'){a.target=null;a.route=[];a.speed=0;a.moving=false;if(!task.manual&&app.time-task.since>s.duration+((a.id*7)%5))this.finishTask(a);}
  if(task.stage!=='using'&&app.time-task.since>55){this.finishTask(a);}
  return;
 }
 if(app.exhibition.enabled&&!b?.manual&&!a.flying&&app.time>=a.life.next)this.nextTask(a);
 }
 nearest(a=this.app.actor){return this.app.actors.filter(b=>b!==a&&!b.flying&&!this.pairs.some(p=>p.a===b.id||p.b===b.id)).sort((b,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(a.x-c.x,a.z-c.z))[0];}
 interact(kind='talk',id=null,manual=true){const app=this.app,a=app.actor,b=id?app.actors.find(b=>b.id===id):this.nearest(a);return this.startPair(a,b,kind,manual);}
 startPair(a,b,kind='talk',manual=false){const app=this.app,nav=app.scene.nav;if(!b||a===b||a.flying||b.flying){if(manual)app.toast('先着陆，并选择一位地面上的人物。');return false;}
 this.cancel(a);this.cancel(b);this.pose(a,'idle');this.pose(b,'idle');if(manual)a.brain.manual=true;
 const angle=Math.atan2(a.x-b.x,a.z-b.z),candidates=[];for(let i=0;i<12;i++){const r=angle+(i%2?1:-1)*Math.ceil(i/2)*.42,q=[b.x+Math.sin(r)*1.15,b.z+Math.cos(r)*1.15];if(nav.valid(...q)&&nav.clear(q,[b.x,b.z])){const route=nav.route(a.x,a.z,...q);if(route)candidates.push({q,len:route.length});}}
 if(!candidates.length){if(manual)app.toast('两人之间有障碍，先走到同一片空地。');return false;}const q=candidates.sort((x,y)=>x.len-y.len)[0].q;this.route(a,...q);const pair={id:++this.serial,a:a.id,b:b.id,kind,stage:'approach',since:app.time,manual,bManual:!!b.brain?.manual};this.pairs.push(pair);b.target=null;b.route=[];b.brain.label='等待来人';a.brain.label='走近人物 '+b.id;this.event('人物 '+a.id+' → 人物 '+b.id+'：'+(kind==='wave'?'打招呼':kind==='follow'?'同行':'交谈'));if(manual){app.setPaused(false);app.toast(kind==='follow'?'走近对方，然后一起散步。':'先走近对方，再面对面互动。');}return true;}
 endPair(pair){for(const id of [pair.a,pair.b]){const a=this.app.actors.find(a=>a.id===id);if(!a)continue;a.speech=null;a.route=[];a.target=null;if(a.life){a.life.task=null;a.life.next=this.app.time+3;a.life.socialUntil=this.app.time+23;}this.pose(a,'idle');a.brain.label='停留';}pair.done=true;}
 tick(dt){const app=this.app,sc=app.scene;if(!sc.world)return;
 for(const p of this.pairs){const a=app.actors.find(a=>a.id===p.a),b=app.actors.find(a=>a.id===p.b);if(!a||!b){p.done=true;continue;}
 if(p.stage==='approach'){
  b.angle+=clamp(angleDelta(b.angle,Math.atan2(a.x-b.x,a.z-b.z)),-dt,dt);
  if(Math.hypot(a.x-b.x,a.z-b.z)<1.53&&sc.nav.clear([a.x,a.z],[b.x,b.z])){a.target=null;b.target=null;a.route=[];b.route=[];p.stage='greeting';p.since=app.time;this.pose(a,'wave');this.pose(b,'wave');a.angle=Math.atan2(b.x-a.x,b.z-a.z);b.angle=a.angle+Math.PI;a.speech={text:sc.id===7?'忙完了？':'你好。',until:app.time+3.4};b.speech={text:sc.id===7?'休息一会儿。':'一起走走吧。',until:app.time+3.4};}
  if(app.time-p.since>50)this.endPair(p);
 }else if(p.stage==='greeting'&&app.time-p.since>3.1){
  if(p.kind==='wave'){this.endPair(p);continue;}
  if(p.kind==='follow'){p.stage='following';p.since=app.time;p.repath=0;const spots=sc.spots.filter(s=>s.kind==='view'&&Math.hypot(a.x-s.x,a.z-s.z)>4&&!this.reserved.has(s.id));const goal=spots[(a.id+b.id)%Math.max(spots.length,1)];this.pose(a,'idle');this.pose(b,'idle');if(goal)this.route(a,goal.x,goal.z);else this.endPair(p);}
  else {p.stage='talking';p.since=app.time;this.pose(a,'talk');this.pose(b,'talk');a.speech={text:sc.id===7?'这里的光很好。':sc.id===8?'听，水声。':'到茶亭坐坐？',until:app.time+4};b.speech={text:'嗯，慢慢来。',until:app.time+5};}
 }else if(p.stage==='talking'){a.angle=Math.atan2(b.x-a.x,b.z-a.z);b.angle=a.angle+Math.PI;if(app.time-p.since>6)this.endPair(p);}
 else if(p.stage==='following'){
  if(app.time>(p.repath||0)){p.repath=app.time+.8;const gap=Math.hypot(a.x-b.x,a.z-b.z);if(gap>1.1)this.route(b,a.x-Math.sin(a.angle)*.95,a.z-Math.cos(a.angle)*.95);if(gap>3.2)a.speed=Math.min(a.speed,.25);}
  if((!a.target&&!a.route?.length&&app.time-p.since>2)||app.time-p.since>40)this.endPair(p);
 }
 }
 this.pairs=this.pairs.filter(p=>!p.done);
 if(app.exhibition.enabled&&app.time>this.nextSocial){this.nextSocial=app.time+14;const free=app.actors.filter(a=>!a.brain.manual&&!a.flying&&!a.seatId&&!(a.life.socialUntil>app.time)&&!a.life.task?.manual&&!this.pairs.some(p=>p.a===a.id||p.b===a.id));let best=null,d=4.5;for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){const v=Math.hypot(free[i].x-free[j].x,free[i].z-free[j].z);if(v<d&&sc.nav.clear([free[i].x,free[i].z],[free[j].x,free[j].z])){best=[free[i],free[j]];d=v;}}if(best)this.startPair(...best,'talk',false);}
 }
 move(a,x,z,dt){const sc=this.app.scene,q=sc.nav.move(a.x,a.z,x,z);for(const b of this.app.actors){if(a===b||b.flying||Math.abs(a.y-b.y)>.6)continue;if(Math.hypot(q[0]-b.x,q[1]-b.z)<.40){a.waited=(a.waited||0)+dt;if(a.waited>.9){const dx=q[0]-a.x,dz=q[1]-a.z,len=Math.hypot(dx,dz)||1;for(const side of [1,-1]){const off=[a.x-dz/len*.4*side,a.z+dx/len*.4*side];if(sc.nav.clear([a.x,a.z],off)&&this.app.actors.every(o=>o===a||Math.hypot(off[0]-o.x,off[1]-o.z)>.48)){const p=sc.nav.move(a.x,a.z,a.x+(off[0]-a.x)*dt*2,a.z+(off[1]-a.z)*dt*2);return p;}}}return [a.x,a.z];}}a.waited=0;return q;}
}

