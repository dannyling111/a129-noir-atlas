// v5.1 clean materials are the project-wide default, including older shot imports.
const CLEAN_RENDER_DEFAULTS=Object.freeze({lightShift:0,contrast:1,haze:0,grain:0,zoom:1,exposure:1,accents:true,renderStyle:'clean'});
function cleanRenderSettings(input={}){
 const settings={...CLEAN_RENDER_DEFAULTS,...input,grain:0,renderStyle:'clean'};
 if(input.renderStyle!=='clean'){settings.haze=0;settings.contrast=1;}
 return settings;
}
const $=id=>document.getElementById(id);
const labels={idle:'静立',walk:'漫步',run:'奔跑',float:'漂浮',reach:'伸手',wave:'挥手',point:'指向',open:'张开双臂',look:'环顾',bow:'鞠躬',crouch:'下蹲',kneel:'单膝',sit:'坐下',meditate:'盘坐',balance:'单脚平衡',stretch:'舒展',turn:'转身',dance:'轻舞',chair:'椅上坐姿',work:'办公',read:'阅读',tea:'喝茶',talk:'交谈',arms_crossed:'抱臂',hands_pocket:'插兜',hug_self:'抱住自己',think:'思考',phone:'打电话',clap:'鼓掌',shrug:'耸肩',raise:'举手',cheer:'欢呼',hold:'举着',kick:'踢腿',listen:'倾听',nod:'点头',shake_head:'摇头',facepalm:'扶额',punch:'出拳',carry:'搬东西',selfie:'自拍',lie:'躺下'};
const icons=[`<path d="M5 39 18 19 27 19 44 39" fill="#aaa" opacity=".5"/><path d="M18 20V4h10v16" stroke="#eee" fill="#ddd"/>`,`<path d="M3 39v-5h7v-6h7v-6h7v-6h7v-6h7V4h8v35Z" fill="#bbb"/>`,`<ellipse cx="25" cy="17" rx="18" ry="12" fill="#ccc"/><ellipse cx="29" cy="38" rx="18" ry="2" fill="#777"/>`,`<path d="m3 40 36-12-29-9L34 8 22 4" stroke="#ddd" stroke-width="5" fill="none"/>`,`<path d="M14 42V24M21 42V13M28 42V3M35 42V10M42 42V0" stroke="#bbb" stroke-width="4"/>`];
class App {
 constructor(){this.canvas=$('stage');this.renderer=new Renderer(this.canvas);this.scene=createScene(0);this.actors=[];this.selected=0;this.time=0;this.last=performance.now();this.paused=false;this.keys=new Set();this.joy=[0,0];this.settings=cleanRenderSettings();this.look=readLook();this.liftInput=0;this.motionRate=1;this.cameraMode="fixed";this.cameraOrbit=0;this.accents=[];this.director=new Director(this);this.exhibition=new Exhibition(this);this.living=new LivingWorld(this);this.cameraRig=new CameraRig(this);this.dialogue=new Dialogue(this);this.theatre=new Theatre(this);this.focused=false;this.focusPoint=null;this.camera={};this.pointer=null;this.draggingActor=false;this.clockSamples=[];this.uiTick=0;this.frames=0;this.lastFps=this.last;this.fps=0;this.renderCount=0;this.setupUI();this.loadScene(7,false);this.events();this.setupV2();this.setupWorldUI();this.setupV5();this.setupLookUI();this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);setTimeout(()=>this.toast('拖空白旋转三维镜头；点击地面移动。点“短剧”看人物表演。',4600),900);}
 setupUI(){SCENE_META.forEach((m,i)=>{$('scene-dock').insertAdjacentHTML('beforeend',`<button class="scene-button ${i===0?'active':''}" data-scene="${i}" aria-label="场景 ${i+1}：${m.title}" aria-pressed="${i===0}"><span class="scene-num">${String(i+1).padStart(2,'0')}</span><span><span class="scene-name">${m.title}</span><div class="scene-en">${m.en}</div></span><span class="scene-icon" aria-hidden="true"><svg viewBox="0 0 48 44">${icons[i]||'<circle cx=24 cy=21 r=16 fill=none stroke="#ccc" stroke-width=2 />'}</svg></span></button>`);$('scene-rail').insertAdjacentHTML('beforeend',`<button class="rail-dot ${i===0?'active':''}" data-scene="${i}" aria-label="切换到${m.title}">${String(i+1).padStart(2,'0')}</button>`);});document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>this.loadScene(Number(b.dataset.scene)));document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>this.setPose(b.dataset.pose));
 $('settings-toggle').onclick=()=>{$('motion-panel').hidden=true;$('director-panel').hidden=true;let open=$('settings').hidden;$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));};$('settings-close').onclick=()=>{$('settings').hidden=true;$('settings-toggle').setAttribute('aria-expanded','false');};
 $('clean-reset').onclick=()=>{this.setLook?.({mode:'mono'});Object.assign(this.settings,{contrast:1,haze:0,grain:0,exposure:1,renderStyle:'clean'});for(const k of ['contrast','haze']){$(k).value=this.settings[k];$(k+'-value').value=this.settings[k].toFixed(2);}this.draw();this.toast('已恢复纯净黑白：无颗粒、无纹理、无暗角。');};
 for(const key of ['light','contrast','haze','zoom']){$(key).oninput=e=>{let val=Number(e.target.value);this.settings[key==='light'?'lightShift':key]=val;$(key+'-value').value=val.toFixed(key==='light'?1:2);if(key==='zoom'){this.focused=false;$('focus').setAttribute('aria-pressed','false');}};}
 $('focus').onclick=()=>{this.cameraMode='fixed';this.focused=!this.focused;$('focus').setAttribute('aria-pressed',String(this.focused));$('focus').textContent=this.focused?'返回全景':'人物特写';};
 $('pause').onclick=()=>this.setPaused(!this.paused);$('reset').onclick=()=>this.loadScene(this.scene.id,false);$('add-person').onclick=()=>this.addPerson();$('jump').onclick=()=>this.jump();$('help-open').onclick=()=>{$('help').hidden=false;$('help-close').focus();};$('help-close').onclick=()=>{$('help').hidden=true;$('help-open').focus();};$('help').onclick=e=>{if(e.target===$('help'))$('help').hidden=true;};$('immersive').onclick=()=>this.immersive(true);$('restore').onclick=()=>this.immersive(false);$('screenshot').onclick=()=>this.export();
 }
 createActor(x,z,pose,angle){let p=this.scene.constrain(x,z),y=this.scene.height(p[0],p[1]),flying=pose==='float',flightY=y+2.3;return {appearance:defaultAppearance(this.actors.length+1),id:this.actors.length+1,x:p[0],z:p[1],y:flying?flightY:y,s:p[2]||0,pose,poseSince:this.time,angle,phase:0,target:null,moving:false,auto:false,autoDir:1,jumpY:0,velocity:0,flying,flightY,airY:flying?flightY:y,landing:false,blendFrom:null,blendAt:this.time,speed:0,accel:0,turnRate:0,gaitWeight:0,runWeight:0,feetPlant:[null,null]};}

 loadScene(id,transition=true){if(transition){$('transition').classList.add('on');clearTimeout(this.sceneTimer);this.sceneTimer=setTimeout(()=>{this.loadScene(id,false);$('transition').classList.remove('on');},160);return;}this.director?.stop();this.director?.stopPlayback();this.liftInput=0;this.keys.clear();this.cameraMode="fixed";this.cameraOrbit=0;this.scene=createScene(id);this.cameraRig.reset();prepareWorld(this.renderer,this.scene);this.accents=createAccents(this.scene);document.body.classList.toggle('light-scene',[1,2,4,5,6,7,8,9].includes(id));this.actors=[];for(const [x,z,pose,angle]of this.scene.spawns)this.actors.push(this.createActor(x,z,pose,angle));this.selected=0;this.focused=false;this.focusPoint=null;this.pointer=null;this.draggingActor=false;this.joy=[0,0];$('knob').style.transform='';this.settings.lightShift=0;$('light').value=0;$('light-value').value='0';this.settings.zoom=1;$('zoom').value=1;$('zoom-value').value='1.00';$('focus').setAttribute('aria-pressed','false');$('focus').textContent='人物特写';this.setPaused(false);let meta=SCENE_META[id];$('headline').textContent=meta.line;$('scene-en').textContent=meta.en;$('scene-note').textContent=meta.note;$('top-count').textContent=String(id+1).padStart(2,'0');document.querySelectorAll('[data-scene]').forEach(b=>{let active=Number(b.dataset.scene)===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});this.living.setup();this.exhibition.setupScene();this.refreshWorldUI?.();this.syncPose();this.updateCamera();this.syncV2Controls();document.title=`${meta.title} · NOIR ATLAS 5.4 / 双模式材质微剧场`;}
 get actor(){return this.actors[this.selected];}
 syncPose(){let a=this.actor;if(!a)return;$('actor-id').textContent=String(a.id).padStart(2,'0');$('actor-state').textContent=a.landing?'准备着陆':a.flying?`${a.moving?'飞行':'悬停'} · ${labels[a.pose]}`:a.moving?(a.pose==='run'?'奔跑中':'行走中'):labels[a.pose];document.querySelectorAll('[data-pose]').forEach(b=>{let active=b.dataset.pose===a.pose;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('flight-controls').hidden=!a.flying;$('flight-altitude').textContent=`${a.flightY.toFixed(1)}m`;document.body.classList.toggle('is-flying',a.flying);this.exhibition?.sync();}

 setPose(pose){let a=this.actor;if(!labels[pose])return;this.exhibition.takeover(a);this.director?.stopPlayback();this.setPaused(false);a.blendFrom=poseControls(a,this.scene,this.time);a.blendAt=this.time;a.pose=pose;a.poseSince=this.time;a.target=null;a.autoHeading=a.angle;a.autoDir=1;a.auto=pose==='walk'||pose==='run';a.moving=false;a.turnFrom=a.angle;
 if(pose==='float'){if(!a.flying){a.airY=baseY(a);a.flightY=baseY(a)+2.3;a.flying=true;}a.landing=false;a.jumpY=0;a.velocity=0;this.toast('持续飞行：摇杆移动，↑ / ↓ 调高度；只有“着陆”会回地面。',3400);}
 if(a.auto)this.autoTarget(a);this.syncPose();}

 autoTarget(a){if(this.scene.nav&&!a.flying){const p=this.scene.constrain(a.x+Math.sin(a.angle)*4,a.z+Math.cos(a.angle)*4);if(!this.living.route(a,...p)||Math.hypot(a.x-p[0],a.z-p[1])<.5){const s=this.scene.spots[(a.id+(a.life?.cycle||0))%this.scene.spots.length];this.living.route(a,s.x,s.z);}return;}const constrain=(x,z)=>a.flying?this.constrainAir(x,z,a.flightY):this.scene.constrain(x,z);if(this.scene.path&&!a.flying){let s=a.s+5*a.autoDir;if(s>this.scene.path.at(-1)[2]||s<0){a.autoDir*=-1;s=a.s+5*a.autoDir;}let p=pointOnPath(s,this.scene.path);a.target={x:p[0],z:p[1],s:clamp(s,0,this.scene.path.at(-1)[2])};}else{let dir=(a.autoHeading??a.angle)+(a.autoDir===1?0:Math.PI);let p=constrain(a.x+Math.sin(dir)*4,a.z+Math.cos(dir)*4);if(Math.hypot(p[0]-a.x,p[1]-a.z)<1){a.autoDir*=-1;dir+=Math.PI;p=constrain(a.x+Math.sin(dir)*4,a.z+Math.cos(dir)*4);}a.target={x:p[0],z:p[1]};}}
 addPerson(){if(this.actors.length>=(this.scene.world?10:5)){this.toast('此场景已达到人物上限。');return;}let a=this.actor,p=this.scene.constrain(a.x+2,a.z+1.5);this.actors.push(this.createActor(p[0],p[1],'idle',a.angle+.4));this.selected=this.actors.length-1;this.exhibition.attach(this.actor,this.selected);this.syncPose();this.toast('已添加人物 '+String(this.actor.id).padStart(2,'0')+'。点击人物可切换。');}
 setPaused(p){this.paused=p;document.body.classList.toggle('paused',p);$('pause').setAttribute('aria-pressed',String(p));$('pause').setAttribute('aria-label',p?'继续动画':'暂停动画');}
 jump(){let a=this.actor;this.director?.stopPlayback();if(a.flying){a.flightY=Math.min(52,a.flightY+.8);a.landing=false;this.toast('提高悬停高度。可按住 ↑ 持续上升。');return;}if(a.jumpY>0)return;this.setPose('idle');a.velocity=4.8;a.jumpY=.001;this.syncPose();}

 toast(text,duration=2300){$('hint').textContent=text;$('hint').classList.add('visible');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('hint').classList.remove('visible'),duration);}
 async immersive(enable){document.body.classList.toggle('immersive',enable);if(enable){$('settings').hidden=true;try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch(e){this.toast('已隐藏界面；当前浏览器未允许系统全屏。');}}else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch(e){}}}
 export(){try{this.draw();let link=document.createElement('a');link.download=`noir-atlas-${this.scene.id+1}-${Date.now()}.png`;link.href=this.canvas.toDataURL('image/png');link.click();this.toast('已保存当前实时画面，不含操作界面。');}catch(e){this.toast('保存失败：'+e.message);}}
 updateCamera(){document.body.classList.toggle('close-up',this.focused);const sc=this.scene,aspect=innerWidth/innerHeight,a=this.actor;let at=sc.at.slice(),span=(aspect<.85?sc.span*(sc.world?.87:.52):sc.span)/this.settings.zoom;
 if(this.focused||this.cameraMode==='profile'){at=[a.x,baseY(a)+.98,a.z];span=(aspect<.85?3.8:6.8)/this.settings.zoom;}
 else if(this.cameraMode==='follow'){at=[a.x,baseY(a)+1.9,a.z];span=(aspect<.85?12:23)/this.settings.zoom;}
 else if(this.cameraMode==='orbit'){at=[a.x,baseY(a)+1.9,a.z];span=(aspect<.85?13:25)/this.settings.zoom;}
 if(!this.focusPoint)this.focusPoint=at;this.focusPoint=this.focusPoint.map((v,i)=>lerp(v,at[i],this.paused?1:.15));let offset=V.sub(sc.eye,sc.at);
 if(this.cameraMode==='orbit'){const r=M.ry(this.cameraOrbit);offset=M.transform(r,offset,0).slice(0,3);}
 if(this.cameraMode==='profile'){offset=[Math.cos(a.angle)*14+Math.sin(a.angle)*2,3,-Math.sin(a.angle)*14+Math.cos(a.angle)*2];}
 const verticalHalf=span/(2*aspect),cosPitch=Math.hypot(offset[0],offset[2])/Math.hypot(...offset),nearBottom=this.focusPoint[1]+offset[1]-verticalHalf*cosPitch;if(nearBottom<2&&offset[1]>1)offset=V.mul(offset,1+(2-nearBottom)/offset[1]);let eye=V.add(this.focusPoint,offset);const view=M.look(eye,this.focusPoint),proj=M.ortho(-span/2,span/2,-span/(2*aspect),span/(2*aspect),.1,500);this.camera={eye,at:this.focusPoint.slice(),view,proj,vp:M.mul(proj,view),span};this.camera.inv=M.inverse(this.camera.vp);}

 screen(p){let q=M.transform(this.camera.vp,p);return {x:(q[0]/q[3]*.5+.5)*innerWidth,y:(.5-q[1]/q[3]*.5)*innerHeight};}
 ray(x,y){let ndc=[x/innerWidth*2-1,1-y/innerHeight*2];let a=M.transform(this.camera.inv,[...ndc,-1]),b=M.transform(this.camera.inv,[...ndc,1]);a=a.slice(0,3).map(v=>v/a[3]);b=b.slice(0,3).map(v=>v/b[3]);return {a,d:V.sub(b,a)};}
 groundAt(x,y){if(this.actor.flying){let p=this.planeAt(x,y,this.actor.flightY);return p?this.constrainAir(p[0],p[1],this.actor.flightY):null;}let {a,d}=this.ray(x,y);if(Math.abs(d[1])<1e-8)return null;let t=-a[1]/d[1];if(this.scene.id===1){let best=Infinity;for(let i=0;i<56;i++){let h=(i+1)*.4,ti=(h-a[1])/d[1],px=a[0]+d[0]*ti,pz=a[2]+d[2]*ti;if(ti>0&&ti<best&&px>=-24.08+i*.86&&px<=-24.08+(i+1)*.86&&Math.abs(pz)<=4.5)best=ti;}if(best<Infinity)t=best;else t=(this.actor.y-a[1])/d[1];}return this.scene.constrain(a[0]+d[0]*t,a[2]+d[2]*t);}
 actorAt(x,y){let nearest=-1,best=matchMedia('(pointer:coarse)').matches?30:23;this.actors.forEach((a,i)=>{let rise=0,p=this.screen([a.x,a.y+.83+rise+a.jumpY,a.z]),feet=this.screen([a.x,a.y+rise+a.jumpY,a.z]),h=Math.max(25,Math.abs(p.y-feet.y)*1.7),distance=Math.hypot((x-p.x),Math.max(0,Math.abs(y-p.y)-h*.33));if(distance<best){best=distance;nearest=i;}});return nearest;}
 navigate(x,z,s){this.director?.stopPlayback();let a=this.actor;this.exhibition.takeover(a);a.auto=false;if(!a.flying&&a.pose!=='run')a.pose='idle';if(this.scene.nav&&!a.flying){if(!this.living.route(a,x,z))this.toast('目的地与当前位置不连通。');}else a.target={x,z,s};this.setPaused(false);this.syncPose();}
 events(){window.addEventListener('resize',()=>{this.renderer.resize();this.updateCamera();});window.addEventListener('blur',()=>{this.keys.clear();this.joy=[0,0];this.liftInput=0;$('knob').style.transform='';this.pointer=null;this.draggingActor=false;});document.addEventListener('visibilitychange',()=>{this.last=performance.now();if(document.hidden){this.keys.clear();this.joy=[0,0];this.liftInput=0;}});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('immersive');});
 window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement)return;if(e.code==='Escape'){$('social-panel').hidden=true;$('places-panel').hidden=true;$('help').hidden=true;$('settings').hidden=true;$('motion-panel').hidden=true;$('director-panel').hidden=true;this.immersive(false);return;}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();if(e.code==='Space'&&!this.actor.flying){if(!e.repeat)this.jump();}else{this.director?.stopPlayback();this.keys.add(e.code);this.setPaused(false);}}});window.addEventListener('keyup',e=>this.keys.delete(e.code));
 this.canvas.addEventListener('pointerdown',e=>{this.director?.stopPlayback();let accent=this.accentAt(e.clientX,e.clientY);if(accent>=0){const o=this.accents[accent],q=this.planeAt(e.clientX,e.clientY,o.y);this.pointer={id:e.pointerId,accent,x:e.clientX,y:e.clientY,moved:0,offset:q?[o.x-q[0],o.z-q[1]]:[0,0]};this.canvas.setPointerCapture(e.pointerId);this.toast(o.name+' · 拖动摆放，不设置收集或任务。');return;}let who=this.actorAt(e.clientX,e.clientY);if(this.scene.world&&who>=0&&who!==this.selected){this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,who,moved:0,social:this.actors[who].id};this.canvas.setPointerCapture(e.pointerId);return;}if(who>=0){this.selected=who;this.exhibition.takeover(this.actor);this.syncPose();}let feet=this.screen([this.actor.x,baseY(this.actor),this.actor.z]);this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,who,dy:feet.y-e.clientY,moved:0};this.canvas.setPointerCapture(e.pointerId);});
 this.canvas.addEventListener('pointermove',e=>{let p=this.pointer;if(!p||p.id!==e.pointerId)return;p.moved=Math.hypot(e.clientX-p.x,e.clientY-p.y);if(p.social!==undefined)return;if(p.accent!==undefined){const o=this.accents[p.accent],q=this.planeAt(e.clientX,e.clientY,o.y);if(q){o.x=clamp(q[0]+p.offset[0],this.scene.bounds[0],this.scene.bounds[1]);o.z=clamp(q[1]+p.offset[1],this.scene.bounds[2],this.scene.bounds[3]);this.setPaused(false);}return;}if(p.who>=0&&p.moved>4){let q=this.groundAt(e.clientX,e.clientY+p.dy);if(q){let a=this.actor,dx=q[0]-a.x,dz=q[1]-a.z,d=Math.hypot(dx,dz);if(this.scene.nav&&!a.flying){this.living.route(a,q[0],q[1]);p.walkDrag=true;return;}a.x=q[0];a.z=q[1];a.s=q[2]||0;if(d>.006){a.angle=Math.atan2(dx,dz);if(!a.flying)a.phase+=phaseForDistance(Math.min(d,.6),a.pose==='run');}a.target=null;a.auto=false;if(!a.flying&&a.pose!=='run')a.pose='idle';a.moving=true;this.draggingActor=true;this.setPaused(false);}}});
 const pointerUp=e=>{let p=this.pointer;if(!p||p.id!==e.pointerId)return;if(p.social!==undefined){if(p.moved<8)this.openSocial(p.social);this.pointer=null;return;}if(p.accent===undefined&&p.moved<5&&p.who<0){if(this.scene.world){const spot=this.spotAt(e.clientX,e.clientY);if(spot){this.living.visit(this.actor,spot.id,true);this.pointer=null;return;}}let q=this.groundAt(e.clientX,e.clientY);if(q)this.navigate(q[0],q[1],q[2]);}this.pointer=null;this.draggingActor=false;this.actor.moving=false;this.actor.speed=0;this.syncPose();};this.canvas.addEventListener('pointerup',pointerUp);this.canvas.addEventListener('pointercancel',()=>{this.pointer=null;this.draggingActor=false;});
 this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.settings.zoom=clamp(this.settings.zoom-e.deltaY*.001,.65,2.4);$('zoom').value=this.settings.zoom;$('zoom-value').value=this.settings.zoom.toFixed(2);},{passive:false});
 let joyId=null;const readJoy=e=>{let r=$('joystick').getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,max=r.width*.32,len=Math.hypot(dx,dy),scale=Math.min(1,max/Math.max(len,.001));this.joy=[dx*scale/max,dy*scale/max];$('knob').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;this.setPaused(false);};$('joystick').onpointerdown=e=>{this.director?.stopPlayback();this.exhibition.takeover(this.actor);joyId=e.pointerId;$('joystick').setPointerCapture(e.pointerId);readJoy(e);};$('joystick').onpointermove=e=>{if(e.pointerId===joyId)readJoy(e);};const stopJoy=e=>{if(e.pointerId===joyId){joyId=null;this.joy=[0,0];$('knob').style.transform='';}};$('joystick').onpointerup=stopJoy;$('joystick').onpointercancel=stopJoy;$('joystick').onlostpointercapture=stopJoy;
 this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;$('error').textContent='图形上下文已中断。\n请刷新页面恢复场景。';});
 }
 update(dt){
  if(this.director?.tick(dt))return;
  const sc=this.scene;this.time+=dt;this.theatre.tick(dt);this.living.tick(dt);this.dialogue.tick();if(this.cameraMode==='orbit')this.cameraOrbit+=dt*.07;
  for(const a of this.actors){
    const selected=a===this.actor,oldX=a.x,oldZ=a.z,oldAngle=a.angle,oldSpeed=a.speed||0;
    const inputX=selected?this.joy[0]+(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0):0;
    const inputY=selected?this.joy[1]+(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0):0;
    const vertical=selected?this.liftInput+(this.keys.has('KeyE')||this.keys.has('Space')?1:0)-(this.keys.has('KeyQ')||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?1:0):0;
    const manual=Math.hypot(inputX,inputY)>.1||Math.abs(vertical)>.01;
    if(manual&&(this.theatre.active||!a.brain?.manual||sc.world&&(a.seatId||a.life?.task||this.living.pairs.some(p=>p.a===a.id||p.b===a.id))))this.exhibition.takeover(a);
    this.exhibition.update(a,dt);
    const scripted=this.exhibition.enabled&&!a.brain?.manual;
    let maxSpeed=a.flying?2.7:GAITS[a.pose==='run'?'run':'walk'].speed;
    if(scripted)maxSpeed*=a.flying?.45:.72;
    if(sc.id===1&&!a.flying)maxSpeed=Math.min(maxSpeed,.78);
    if(a.flying&&Math.abs(vertical)>.01){a.landing=false;a.flightY=clamp(a.flightY+vertical*2.2*dt,.45,52);}
    let direction=null,distance=Infinity,pathDelta=null,strength=1;
    if(Math.hypot(inputX,inputY)>.1){
      a.target=null;a.auto=false;a.landing=false;if(!a.flying&&a.pose!=='run')a.pose='idle';
      const view=this.camera.view,right=[view[0],0,view[8]],forward=V.norm([this.camera.at[0]-this.camera.eye[0],0,this.camera.at[2]-this.camera.eye[2]]);
      direction=V.norm(V.add(V.mul(right,inputX),V.mul(forward,-inputY)));strength=Math.min(1,Math.hypot(inputX,inputY));
    }else if(a.target){
      if(sc.path&&!a.flying){
        pathDelta=a.target.s-a.s;
        if(!Number.isFinite(pathDelta)){a.target=null;pathDelta=null;}
        else {distance=Math.abs(pathDelta);const q=pointOnPath(a.s+Math.sign(pathDelta)*Math.min(1,distance),sc.path);direction=V.norm([q[0]-a.x,0,q[1]-a.z]);}
      }else{const dx=a.target.x-a.x,dz=a.target.z-a.z;distance=Math.hypot(dx,dz);direction=distance>.001?[dx/distance,0,dz/distance]:null;}
      if(distance<.045){a.target=null;direction=null;if(a.auto&&!a.route?.length){a.autoDir*=-1;this.autoTarget(a);}}
    }
    let goal=0;
    if(direction&&!(selected&&this.draggingActor)){
      const facing=Math.atan2(direction[0],direction[2]),delta=angleDelta(a.angle,facing);
      // First turn, then advance. This prevents reversed feet when changing direction.
      a.angle+=clamp(delta,-dt*(a.flying?2.8:3.8),dt*(a.flying?2.8:3.8));
      const alignment=a.flying?1:Math.pow(Math.max(0,Math.cos(angleDelta(a.angle,facing))),2);
      goal=Math.min(maxSpeed*strength,Math.sqrt(2*2.6*Math.max(0,distance)))*alignment;
      // Keep autonomous performers from walking through one another.
      if(scripted&&!sc.world)for(const other of this.actors){if(other===a)continue;const dx=other.x-a.x,dz=other.z-a.z;if(Math.abs(other.y-a.y)<1&&Math.hypot(dx,dz)<.65&&dx*direction[0]+dz*direction[2]>.1)goal=0;}
    }
    a.speed=approach(oldSpeed,goal,dt*(goal>oldSpeed?(a.pose==='run'?4.2:2.8):4.5));
    if(a.speed<.004)a.speed=0;
    if(!(selected&&this.draggingActor)&&a.speed>0){
      let x=a.x,z=a.z;
      if(pathDelta!==null&&a.target){a.s+=Math.sign(pathDelta)*Math.min(Math.abs(pathDelta),a.speed*dt);const q=pointOnPath(a.s,sc.path);x=q[0];z=q[1];}
      else {
        // Follow the collision-checked path rather than cutting a corner while turning.
        const dir=direction&&(a.flying||(sc.nav&&a.target))?direction:[Math.sin(a.angle),0,Math.cos(a.angle)];
        const d=Math.min(a.speed*dt,distance);x+=dir[0]*d;z+=dir[2]*d;
      }
      const q=a.flying?this.constrainAir(x,z,a.flightY):sc.nav?this.living.move(a,x,z,dt):sc.constrain(x,z);a.x=q[0];a.z=q[1];if(sc.path&&!a.flying)a.s=q[2];
    }
    const moved=Math.hypot(a.x-oldX,a.z-oldZ);
    a.moving=moved>.00002||(selected&&this.draggingActor);a.accel=(a.speed-oldSpeed)/Math.max(dt,.0001);a.turnRate=angleDelta(oldAngle,a.angle)/Math.max(dt,.0001);
    if(moved>.00001&&!a.flying)a.phase+=phaseForDistance(moved,a.pose==='run');
    if(!direction&&a.pose==='turn'&&!a.moving){const u=clamp((this.time-a.poseSince)/1.75,0,1);a.angle=(a.turnFrom??a.angle)+Math.PI*smoother01(u);}
    if(a.flying){
      const floor=this.airFloor(a.x,a.z);
      if(a.landing&&!a.target){
        const ground=sc.height(a.x,a.z);a.airY=Math.max(ground,a.airY-dt*1.6);a.flightY=a.airY;
        if(a.airY<=ground+.012){const q=sc.constrain(a.x,a.z);a.x=q[0];a.z=q[1];a.s=q[2]||0;a.flying=false;a.landing=false;a.pose='idle';a.poseSince=this.time;a.y=ground;a.jumpY=0;a.velocity=0;a.blendFrom=null;}
      }else a.flightY=Math.max(a.flightY,floor+.45);
      if(a.flying){if(!a.landing||a.target)a.airY=lerp(a.airY,a.flightY,1-Math.exp(-dt*4));a.y=a.airY+(a.landing?0:.035*Math.sin(this.time*.75+a.id));a.jumpY=0;a.velocity=0;}
    }else{
      a.y=lerp(a.y,sc.height(a.x,a.z),1-Math.exp(-dt*15));
      if(a.jumpY>0||a.velocity>0){a.velocity-=11*dt;a.jumpY+=a.velocity*dt;if(a.jumpY<=0){a.jumpY=0;a.velocity=0;}}
    }
    updateContactRig(a,sc,dt,moved);
  }
  for(const f of sc.dynamic)f(this.time);this.director?.capture();
 }

 draw(){this.updateCamera();let objects=this.scene.objects.slice();objects.push(...accentObjects(this.accents,this.time,this.settings.accents));for(const a of this.actors)objects.push(...human(a,this.scene,this.time));this.renderer.render(objects,this.camera,this.scene,this.settings,this.time,this.look);this.renderCount++;this.drawWorldHUD?.();let a=this.actor,p=this.screen([a.x,a.y+.01,a.z]);$('marker').style.left=p.x+'px';$('marker').style.top=p.y+'px';$('marker').style.display=this.focused||a.flying?'none':'block';}
 animate(now){const raw=(now-this.last)/1000;this.last=now;let dt=clamp(raw,0,.08);if(!this.paused&&!document.hidden)this.update(dt*this.motionRate);const signature=JSON.stringify([this.paused,this.time,this.scene.id,this.focused,this.cameraMode,this.cameraOrbit,this.settings,this.cameraRig.state(),this.dialogue.enabled,this.dialogue.names,this.dialogue.fontSize,this.selected,this.actors.map(a=>[a.x,a.y,a.z,a.angle,a.pose,a.phase,a.jumpY,a.appearance,a.speech]),innerWidth,innerHeight,this.renderer.resolution]);if(!this.paused||this.lastSignature!==signature){this.draw();this.lastSignature=signature;}this.frames++;if(now-this.lastFps>1500){this.fps=Math.round(this.frames*1000/(now-this.lastFps));$('performance').textContent=this.paused?'PAUSED':`${this.fps} FPS`;this.frames=0;this.lastFps=now;if(!this.paused&&this.fps<23&&this.renderer.resolution>.75&&this.renderCount>30){this.renderer.resolution=Math.max(.75,this.renderer.resolution-.15);}}if(now-this.uiTick>150){this.syncPose();this.uiTick=now;}requestAnimationFrame(this.animate);}

 setupV2(){
  $('exhibition-toggle').onclick=()=>this.exhibition.toggle();
  $('run-view').onclick=()=>{this.inspectMotion('run');};
  $('walk-view').onclick=()=>{this.inspectMotion('walk');};

  $('more-actions').onclick=()=>{const open=$('motion-panel').hidden;$('settings').hidden=true;$('motion-panel').hidden=!open;$('director-panel').hidden=true;$('more-actions').setAttribute('aria-expanded',String(open));};
  $('motion-close').onclick=()=>{$('motion-panel').hidden=true;$('more-actions').setAttribute('aria-expanded','false');};
  $('director-toggle').onclick=()=>{const open=$('director-panel').hidden;$('settings').hidden=true;$('director-panel').hidden=!open;$('motion-panel').hidden=true;$('director-toggle').setAttribute('aria-expanded',String(open));};
  $('director-close').onclick=()=>{$('director-panel').hidden=true;$('director-toggle').setAttribute('aria-expanded','false');};
  $('accents-toggle').onchange=e=>{this.director.stopPlayback();this.settings.accents=e.target.checked;};
  $('motion-rate').oninput=e=>{this.motionRate=Number(e.target.value);$('motion-rate-value').value=this.motionRate.toFixed(2)+'×';};
  $('gait-view').onclick=()=>this.inspectMotion('walk');
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>{this.director.stopPlayback();this.cameraMode=b.dataset.camera;this.focused=false;this.focusPoint=null;this.setPaused(false);this.syncV2Controls();});
  for(const [id,d] of [['fly-up',1],['fly-down',-1]]){const el=$(id);el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);this.director.stopPlayback();this.exhibition.takeover(this.actor);this.liftInput=d;this.actor.landing=false;this.setPaused(false);};const stop=()=>{this.liftInput=0;};el.onpointerup=stop;el.onpointercancel=stop;el.onlostpointercapture=stop;}
  $('land').onclick=()=>this.land();
  $('record-shot').onclick=()=>this.director.recording?this.director.stop():this.director.start();
  $('play-shot').onclick=()=>this.director.playing?this.director.stopPlayback():this.director.play();
  $('export-shot').onclick=()=>this.director.export();
  $('import-shot').onclick=()=>$('shot-file').click();
  $('shot-file').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{if(file.size>12*1024*1024)throw new Error('镜头文件不能超过 12 MB。');this.director.import(await file.text());}catch(error){this.toast(error.message,5000);}finally{e.target.value='';}};
  $('shot-scrub').oninput=e=>this.director.seek(Number(e.target.value));this.director.sync();
 }
 syncV2Controls(){
  if(!$('accents-toggle'))return;$('accents-toggle').checked=this.settings.accents;
  $('focus').textContent=this.focused?'返回全景':'人物特写';$('focus').setAttribute('aria-pressed',String(this.focused));
  document.querySelectorAll('[data-camera]').forEach(b=>{b.classList.toggle('active',b.dataset.camera===this.cameraMode);b.setAttribute('aria-pressed',String(b.dataset.camera===this.cameraMode));});
  for(const key of ['light','contrast','haze','zoom']){const value=this.settings[key==='light'?'lightShift':key];$(key).value=value;$(key+'-value').value=value.toFixed(2);}
 }
 inspectMotion(pose){this.exhibition.enabled=false;this.exhibition.setupScene();if(this.actor.flying){this.actor.flying=false;this.actor.y=this.scene.height(this.actor.x,this.actor.z);}this.cameraMode='profile';this.focused=true;this.settings.zoom=1;this.focusPoint=null;this.motionRate=.5;$('motion-rate').value='.5';$('motion-rate-value').value='0.50×';$('motion-panel').hidden=true;this.setPose(pose);this.syncV2Controls();}
 planeAt(x,y,height){const {a,d}=this.ray(x,y);if(Math.abs(d[1])<1e-6)return null;const t=(height-a[1])/d[1];return [a[0]+d[0]*t,a[2]+d[2]*t];}
 airFloor(x,z){if(this.scene.world)return this.scene.height(x,z);return this.scene.id===1&&Math.abs(z)<=4.5&&x>=-24.08&&x<=24.08?this.scene.height(x,z):0;}
 constrainAir(x,z,y){
  const sc=this.scene;x=clamp(x,sc.bounds[0],sc.bounds[1]);z=clamp(z,sc.bounds[2],sc.bounds[3]);
  // Flight is free of walkway centre-line snapping. Tall columns still obstruct it.
  if(sc.world){for(const o of sc.blockers){if(y>o.h+.05)continue;if(o.kind==='circle'){let dx=x-o.x,dz=z-o.z,len=Math.hypot(dx,dz),rr=o.r+.25;if(len<rr){if(len<.001){dx=1;dz=0;len=1;}x=o.x+dx/len*rr;z=o.z+dz/len*rr;}}else {const l=o.x-o.w/2-.25,r=o.x+o.w/2+.25,t=o.z-o.d/2-.25,b=o.z+o.d/2+.25;if(x>l&&x<r&&z>t&&z<b){const d=[x-l,r-x,z-t,b-z],k=d.indexOf(Math.min(...d));if(k===0)x=l;else if(k===1)x=r;else if(k===2)z=t;else z=b;}}}return [x,z];}if(sc.id===4){const p=sc.constrain(x,z);x=p[0];z=p[1];}
  if(sc.id===2&&y+1.85>6&&y<16){const dx=(x-1)/8.65,dz=(z+3)/6.65,len=Math.hypot(dx,dz);if(len<1){const nx=len<.001?1:dx/len,nz=len<.001?0:dz/len;x=1+nx*8.65;z=-3+nz*6.65;}}
  return [x,z];
 }
 accentAt(x,y){if(!this.settings.accents)return -1;let hit=-1,best=16;this.accents.forEach((p,i)=>{const projected=this.screen([p.x,p.y+.10*Math.sin(this.time*.7+p.phase),p.z]),d=Math.hypot(x-projected.x,y-projected.y);if(d<best){best=d;hit=i;}});return hit;}
 land(){this.director.stopPlayback();const a=this.actor;this.exhibition.takeover(a);if(!a.flying)return;const p=this.scene.constrain(a.x,a.z);a.landing=true;a.auto=false;a.target=Math.hypot(p[0]-a.x,p[1]-a.z)>.03?{x:p[0],z:p[1],s:p[2]}:null;this.liftInput=0;this.setPaused(false);this.toast('返回可站立的地面后缓慢着陆。');}
 snapshot(){return {version:'5.4.3',look:normalizeLook(this.look),scene:this.scene.id,sceneName:SCENE_META[this.scene.id].title,selected:this.selected,actors:this.actors.map(a=>({appearance:appearanceOf(a),speech:a.speech,headWorld:a.headWorld,id:a.id,x:a.x,y:a.y,z:a.z,s:a.s,angle:a.angle,pose:a.pose,seatId:a.seatId,life:a.life,route:a.route,moving:a.moving,jumpY:a.jumpY,phase:a.phase,speed:a.speed,gaitWeight:a.gaitWeight,brain:a.brain,scoreEvents:a.scoreEvents,flying:a.flying,flightY:a.flightY,airY:a.airY,landing:a.landing})),paused:this.paused,settings:{...this.settings},time:this.time,renderCount:this.renderCount,drawCalls:this.renderer.drawCalls,focus:this.focused,cameraRig:this.cameraRig.state(),dialogue:{enabled:this.dialogue.enabled,fontSize:this.dialogue.fontSize,history:this.dialogue.history},theatre:{active:this.theatre.active,index:this.theatre.index,events:this.theatre.events},cameraMode:this.cameraMode,motionRate:this.motionRate,exhibition:{enabled:this.exhibition.enabled},accents:this.accents.map(p=>({...p})),director:{recording:this.director.recording,playing:this.director.playing,duration:this.director.clip?.duration||0},anatomy:{maleHeight:1.82,femaleHeight:1.69,headHeight:.234,bodies:2,headCount:7.78},actionCount:Object.keys(labels).length,actlib:ACTLIB_ACTS.length,world:this.scene.world?{spots:this.scene.spots,pairs:this.living.pairs,events:this.living.events,navComponents:this.scene.nav.componentCount,sourceObjects:this.scene.sourceObjectCount}:null,webgl:2};}

}

