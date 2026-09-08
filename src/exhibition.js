class Exhibition {
  constructor(app){this.app=app;this.enabled=!matchMedia('(prefers-reduced-motion: reduce)').matches;}
  plan(a,index){
    const scene=this.app.scene,id=scene.id,off=index*.9;if(scene.world)return [];
    const walk=(x,z,label='缓步穿过画面')=>({kind:'travel',x:x+off,z:z-off,pose:'walk',label});
    const fly=(x,z,y,label='在留白中漂浮')=>({kind:'travel',x:x+off,z:z-off,y,pose:'float',label});
    const hold=(pose,seconds,look=null,label='停留')=>({kind:'hold',pose,seconds,look,label});
    if(id===0)return [hold('look',3+index*3,[0,-22],'望向光门'),walk(-3,-9,'走近光源'),hold('reach',4,[0,-23],'向光伸手'),walk(3,-14),hold('idle',5,[0,-22],'与影子停留'),walk(-4,6),hold('look',6)];
    if(id===1)return [hold('idle',3+index*4,[20,0],'望向高处'),walk(-4,1,'沿阶缓行'),hold('look',5,[22,0],'停步环顾'),walk(4,1),hold('stretch',4,[22,0],'在高处舒展'),walk(-10,2),hold('idle',6)];
    if(id===2)return [hold('look',4+index*2,[1,-3],'仰望悬石'),walk(-6,3,'绕过长影'),hold('reach',4,[1,-3],'触碰遥远'),walk(1,5),hold('idle',6,[1,-3],'与巨物对望'),walk(-9,7),hold('look',4)];
    if(id===3){const points=[.15,.37,.61,.78,.51,.2].map(v=>pointOnPath(scene.path.at(-1)[2]*v,scene.path));return points.flatMap((p,i)=>[walk(p[0],p[1],'沿折径漫步'),hold(i%2?'look':'idle',4+index,[-3,-27],'在转角停留')]);}
    if(id===4)return [hold('look',2+index*3,[7,-10],'听见柱林'),fly(-5,-3,3.0),hold('open',5,[7,-10],'在空中展开'),fly(-8,6,4.3),hold('look',6,[8,-10],'悬停观察'),fly(-6,2,2.8),hold('idle',4)];
    if(id===5)return [hold('look',2+index*5,[0,-9],'与日蚀对望'),walk(-3,3,'走进光环之下'),hold('open',5,[0,-9],'向光展开'),walk(3,1,'穿过长影'),hold('look',5,[0,-9],'抬头停留'),walk(-7,6),hold('idle',5,[0,-9])];
    return [hold('float',3+index*3,[0,-7],'停在两界之间'),fly(-3,2,2.0,'沿光隙漂移'),hold('open',5,[0,-9],'舒展身体'),fly(3,-1,2.6),hold('look',6,[0,-7],'悬停凝望'),fly(-5,2,2.0),hold('idle',4)];
  }
  setupScene(){this.app.actors.forEach((a,i)=>this.attach(a,i));this.sync();}
  attach(a,index){a.brain={manual:!this.enabled,index:0,entered:false,since:this.app.time,cycles:0,label:'准备展演',seed:index};a.score=this.plan(a,index);}
  takeover(a=this.app.actor){
    if(this.app.scene.world)this.app.living.cancel(a);if(!a.brain)this.attach(a,this.app.actors.indexOf(a));
    a.brain.manual=true;a.brain.label='手动接管';a.target=null;a.auto=false;this.sync();
  }
  toggle(){
    const anyManual=this.app.actors.some(a=>a.brain?.manual);
    if(!this.enabled||anyManual){if(this.app.cameraMode==='profile'){this.app.cameraMode='fixed';this.app.focused=false;this.app.focusPoint=null;this.app.motionRate=1;this.app.syncV2Controls();}this.enabled=true;if(this.app.scene.world)this.app.living.setup();this.setupScene();this.app.setPaused(false);this.app.toast('自动展演：人物会行走、停留、观察。随时触控接管。');}
    else {this.enabled=false;for(const a of this.app.actors){if(!a.brain?.manual){a.target=null;a.auto=false;}if(a.brain)a.brain.manual=true;}this.sync();}
  }
  pose(a,p){
    a.blendFrom=poseControls(a,this.app.scene,this.app.time);a.blendAt=this.app.time;
    a.pose=p;a.poseSince=this.app.time;a.auto=false;
    if(p==='float'&&!a.flying){a.airY=baseY(a);a.flightY=a.y+2.2;a.flying=true;a.jumpY=0;a.velocity=0;a.landing=false;}
  }
  update(a,dt){
    const app=this.app,b=a.brain;if(app.scene.world){app.living.update(a,dt);return;}if(!this.enabled||!b||b.manual||!a.score?.length)return;
    const cue=a.score[b.index%a.score.length];
    if(!b.entered){
      b.entered=true;b.since=app.time;b.label=cue.label;this.pose(a,cue.pose);a.target=null;
      if(cue.kind==='travel'){
        if(cue.y!==undefined){if(!a.flying){a.airY=baseY(a);a.flying=true;}a.flightY=cue.y;a.landing=false;}
        const q=a.flying?app.constrainAir(cue.x,cue.z,a.flightY):app.scene.constrain(cue.x,cue.z);
        a.target={x:q[0],z:q[1],s:q[2]};
      }
      a.scoreEvents??=[];a.scoreEvents.push({at:app.time,action:cue.pose,kind:cue.kind,label:cue.label});if(a.scoreEvents.length>32)a.scoreEvents.shift();
    }
    if(cue.kind==='hold'&&cue.look){
      const target=Math.atan2(cue.look[0]-a.x,cue.look[1]-a.z);
      a.angle+=clamp(angleDelta(a.angle,target),-dt*.7,dt*.7);
    }
    if((cue.kind==='hold'&&app.time-b.since>cue.seconds)||(cue.kind==='travel'&&((!a.target&&app.time-b.since>.4)||app.time-b.since>27))){
      b.index++;if(b.index%a.score.length===0)b.cycles++;b.entered=false;
    }
  }
  sync(){
    const el=document.getElementById('exhibition-toggle');if(!el)return;
    const a=this.app.actor,manual=a?.brain?.manual;
    el.textContent=!this.enabled?'自动展演':manual?'恢复展演':'展演中';
    el.classList.toggle('exhibiting',this.enabled&&!manual);el.setAttribute('aria-pressed',String(this.enabled&&!manual));
    const label=document.getElementById('exhibition-state');if(label)label.textContent=!this.enabled?'手动模式':manual?'手动接管 · 其他人物继续展演':a?.brain?.label||'自动展演';
  }
}

/* Local, deterministic life simulation. Affordance reservations + paired
   interactions. No generated claims of AI cognition or server dependencies. */
