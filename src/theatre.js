// A small deterministic stage manager, not an LLM and not a pre-rendered video.
class Theatre {
 constructor(app){this.app=app;this.active=false;this.index=0;this.script=null;this.cast={};this.entered=false;this.since=0;this.speaker=null;this.events=[];this.tracking=null;}
 event(type,detail){this.events.push({time:this.app.time,type,detail});}
 start(input){const script=validateDrama(input);this.stop(false);const app=this.app,appearances=app.actors.map(a=>a.appearance);
  app.loadScene(script.scene,false);this.script=script;this.index=0;this.cast={};this.events=[];this.active=true;this.entered=false;this.speaker=null;
  const count=Math.max(...script.cast.map(r=>r.index))+1;
  while(app.actors.length<count){if(app.actors.length>=10)throw new Error('角色超过十人');const i=app.actors.length,p=app.scene.constrain(-4+i*1.2,8);const a=app.createActor(p[0],p[1],'idle',0);app.actors.push(a);app.exhibition.attach(a,i);a.life={task:null,next:app.time+3,cycle:0,seed:i};}
  for(const spec of script.cast){const a=app.actors[spec.index];app.living.cancel(a);a.appearance=appearances[spec.index]||a.appearance||defaultAppearance(a.id);if(spec.start){const p=app.scene.constrain(...spec.start);a.x=p[0];a.z=p[1];a.s=p[2]||0;}a.angle=spec.angle??a.angle;a.y=app.scene.height(a.x,a.z);a.flying=false;a.flightY=a.y;a.airY=a.y;a.landing=false;a.jumpY=0;a.velocity=0;a.pose='idle';a.poseSince=app.time;a.brain.manual=true;a.target=null;a.route=[];a.speed=0;a.gaitWeight=0;a.feetPlant=[null,null];a.blendFrom=null;this.cast[spec.role]=a.id;}
  app.dialogue.clear();app.dialogue.enabled=true;app.selected=script.cast[0].index;app.focused=false;app.cameraMode='fixed';app.settings.zoom=1;app.cameraRig.pan=[0,0,0];app.setPaused(false);document.body.classList.add('theatre-active');$('theatre-panel').hidden=true;app.renderCast?.();this.event('start',script.title);this.tick(0);this.sync();
 }
 actor(role){return this.app.actors.find(a=>a.id===this.cast[role]);}
 stop(resume=true,keepFrame=false){if(!this.active){if(!keepFrame&&this.app.cameraRig){this.app.cameraRig.storyTarget=null;this.app.cameraRig.storySpan=null;}return;}
  const app=this.app;for(const id of Object.values(this.cast)){const a=app.actors.find(a=>a.id===id);if(!a)continue;app.living.cancel(a);a.attention=null;a.speech=null;a.brain.manual=!resume;if(a.life)a.life.next=app.time+4;}
  this.active=false;this.speaker=null;this.tracking=null;app.dialogue.cancelVoice();if(!keepFrame){app.cameraRig.storyTarget=null;app.cameraRig.storySpan=null;}document.body.classList.remove('theatre-active');this.sync();
 }
 advance(){if(!this.active)return;for(const a of this.app.actors)if(a.speech)a.speech.until=Math.min(a.speech.until,this.app.time);this.app.dialogue.cancelVoice();this.index++;this.entered=false;this.speaker=null;this.sync();}
 frame(b){const people=b.roles.map(r=>this.actor(r)).filter(Boolean);if(!people.length)return;this.tracking=b.roles;const app=this.app;app.cameraRig.storyTarget=[people.reduce((n,a)=>n+a.x,0)/people.length,people.reduce((n,a)=>n+baseY(a)+(a.seatId?.82:1.05),0)/people.length,people.reduce((n,a)=>n+a.z,0)/people.length];app.cameraRig.storySpan=b.span||10;app.cameraRig.yaw=b.yaw??app.cameraRig.yaw;app.cameraRig.pitch=clamp(b.pitch??app.cameraRig.pitch,.13,1.48);app.cameraRig.pan=[0,0,0];app.focused=false;app.settings.zoom=1;app.cameraMode='fixed';app.syncCameraUI?.();}
 tick(dt){if(!this.active)return;const app=this.app,b=this.script.beats[this.index];if(!b){this.event('complete',this.script.title);this.stop(true,true);app.toast('短剧演完了。人物继续生活；可重播或自由操作。',4000);return;}
  if(this.tracking){const p=this.tracking.map(r=>this.actor(r)).filter(Boolean);app.cameraRig.storyTarget=[p.reduce((n,a)=>n+a.x,0)/p.length,p.reduce((n,a)=>n+baseY(a)+(a.seatId?.82:1.05),0)/p.length,p.reduce((n,a)=>n+a.z,0)/p.length];}
  if(!this.entered){this.entered=true;this.since=app.time;this.event('beat',`${this.index}:${b.type}`);
   if(b.type==='camera'){this.frame(b);this.advance();return;}
   if(b.type==='say'){const a=this.actor(b.role),to=b.to?this.actor(b.to):null;this.speaker=a.id;for(const o of app.actors)o.speech=null;if(to){a.attention=[to.x,to.z];to.attention=[a.x,a.z];if(!a.seatId)a.angle=Math.atan2(to.x-a.x,to.z-a.z);if(!to.seatId)to.angle=Math.atan2(a.x-to.x,a.z-to.z);}
    app.living.pose(a,b.pose||'talk');const speech=app.dialogue.say(a,b.text,b.seconds);this.until=speech.until;this.event('say',{role:b.role,text:b.text});}
   else if(b.type==='move'){for(const t of b.targets){const a=this.actor(t.role);app.living.cancel(a);a.attention=null;app.living.pose(a,'idle');a.brain.manual=true;let ok=true;if(t.place){ok=!!app.scene.spots?.some(s=>s.id===t.place)&&app.living.visit(a,t.place,false);if(a.life?.task)a.life.task.manual=true;}else if(app.scene.nav){ok=app.living.route(a,t.x,t.z);}else {const p=app.scene.constrain(t.x,t.z);a.target={x:p[0],z:p[1],s:p[2]};}if(!ok){this.event('blocked',t);this.stop(false);app.toast('短剧停在不可达的目标，请修改剧本中的地点。',5000);return;}}}
   else if(b.type==='pose'){app.living.pose(this.actor(b.role),b.pose);this.until=app.time+(b.seconds||2);}
   else if(b.type==='flight'){for(const r of b.roles){const a=this.actor(r);app.living.cancel(a);a.flying=true;a.landing=false;a.airY=a.y;a.flightY=app.scene.height(a.x,a.z)+b.height;a.pose='float';a.poseSince=app.time;a.jumpY=0;a.velocity=0;}this.until=app.time+(b.seconds||3);}
   else this.until=app.time+(b.seconds||2);this.sync();
  }
  if(b.type==='move'){
   const done=b.targets.every(t=>{const a=this.actor(t.role);return t.place?a.life?.task?.stage==='using':!a.target&&!a.route?.length;});
   if(done){this.advance();return;}if(app.time-this.since>48){this.event('timeout',this.index);this.stop(false);app.toast('演员暂时被挡住，短剧已停止。没有瞬移跳过路径。',5000);}
  }else if(app.time>=this.until)this.advance();
 }
 sync(){if(!$('theatre-bar'))return;$('theatre-bar').hidden=!this.active;$('theatre-title').textContent=this.script?.title||'微型剧场';$('theatre-progress').textContent=this.active?`${this.index+1} / ${this.script.beats.length}`:'';$('theatre-pause').textContent=this.app.paused?'▷':'Ⅱ';}
}
