// All camera operations transform actual mesh vertices, never the canvas bitmap.
class CameraRig {
 constructor(app){this.app=app;this.projection='perspective';this.lock=false;this.pan=[0,0,0];this.yaw=.6;this.pitch=.58;this.storyTarget=null;this.storySpan=null;this.revision=0;}
 reset(){const sc=this.app.scene,o=V.sub(sc.eye,sc.at);this.yaw=Math.atan2(o[0],o[2]);this.pitch=clamp(Math.atan2(o[1],Math.hypot(o[0],o[2])),.13,1.48);this.pan=[0,0,0];this.storyTarget=null;this.storySpan=null;this.revision++;}
 state(){return {projection:this.projection,yaw:this.yaw,pitch:this.pitch,pan:this.pan.slice(),storyTarget:this.storyTarget?.slice()||null,storySpan:this.storySpan};}
 restore(s){if(!s)return;this.projection=s.projection==='orthographic'?'orthographic':'perspective';this.yaw=s.yaw;this.pitch=clamp(s.pitch,.13,1.48);this.pan=s.pan.slice();this.storyTarget=s.storyTarget?.slice()||null;this.storySpan=s.storySpan??null;this.revision++;}
 orbit(dx,dy){this.yaw-=dx*.006;this.pitch=clamp(this.pitch+dy*.0048,.13,1.48);this.app.cameraMode='fixed';this.revision++;this.app.syncCameraUI?.();}
 panBy(dx,dy){const app=this.app,s=app.camera.span/innerWidth,right=[Math.cos(this.yaw),0,-Math.sin(this.yaw)],forward=[Math.sin(this.yaw),0,Math.cos(this.yaw)];this.pan=V.add(this.pan,V.add(V.mul(right,-dx*s),V.mul(forward,-dy*s/Math.max(Math.sin(this.pitch),.25))));this.pan[0]=clamp(this.pan[0],-100,100);this.pan[2]=clamp(this.pan[2],-100,100);this.revision++;}
 zoomBy(factor){this.app.settings.zoom=clamp(this.app.settings.zoom*factor,.35,12);this.revision++;this.app.syncCameraUI?.();}
 frameActor(){this.app.cameraMode='follow';this.app.focused=true;this.pan=[0,0,0];this.storyTarget=null;this.storySpan=null;this.app.settings.zoom=1;this.app.focusPoint=null;this.pitch=.30;this.revision++;this.app.syncV2Controls();this.app.syncCameraUI?.();}
 frameAll(){this.app.cameraMode='fixed';this.app.focused=false;this.app.settings.zoom=1;this.app.focusPoint=null;this.reset();this.app.syncV2Controls();this.app.syncCameraUI?.();}
 update(){const app=this.app,sc=app.scene,a=app.actor;if(!a)return;
  document.body.classList.toggle('close-up',app.focused);const aspect=innerWidth/innerHeight;
  let at=sc.at.slice(),span=(aspect<.85?sc.span*(sc.world?.84:.55):sc.span)/app.settings.zoom;
  if(app.focused||app.cameraMode==='profile'){at=[a.x,baseY(a)+(a.seatId?.67:.98),a.z];span=(aspect<.85?3.65:6.8)/app.settings.zoom;}
  else if(app.cameraMode==='follow'||app.cameraMode==='orbit'){at=[a.x,baseY(a)+1.1,a.z];span=(aspect<.85?9:19)/app.settings.zoom;}
  if(this.storyTarget){at=this.storyTarget.slice();span=(this.storySpan||9)/app.settings.zoom;if(aspect<.85)span*=.80;}
  at=V.add(at,this.pan);if(!app.focusPoint)app.focusPoint=at.slice();app.focusPoint=app.focusPoint.map((v,i)=>lerp(v,at[i],app.paused?1:.16));
  let yaw=this.yaw+(app.cameraMode==='orbit'?app.cameraOrbit:0),pitch=this.pitch;
  if(app.cameraMode==='profile'){yaw=a.angle+Math.atan2(14,2);pitch=.18;}
  const fov=.75,halfV=span/(2*aspect),distance=this.projection==='perspective'?Math.max(1.4,halfV/Math.tan(fov/2)):Math.max(50,halfV*2.5);
  const dir=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
  let eye=V.add(app.focusPoint,V.mul(dir,distance));eye[1]=Math.max(eye[1],.28);
  // Retain near contact in close-up; allocate more depth precision to distant
  // architecture when zoomed out. Orthographic depth does not need this scaling.
  const near=this.projection==='perspective'?clamp(distance*.003,.10,.80):.10;
  const far=Math.max(360,distance+220);
  const view=M.look(eye,app.focusPoint),proj=this.projection==='perspective'?M.perspective(fov,aspect,near,far):M.ortho(-span/2,span/2,-halfV,halfV,near,far);
  app.camera={eye,at:app.focusPoint.slice(),view,proj,vp:M.mul(proj,view),span,near,far,projection:this.projection};app.camera.inv=M.inverse(app.camera.vp);
 }
 bind(){const app=this.app,canvas=app.canvas;let drag=null,touches=new Map(),pinch=null;
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
   if(e.pointerType==='touch')touches.set(e.pointerId,[e.clientX,e.clientY]);
   if(touches.size===2){const q=[...touches.values()];pinch={d:Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]),zoom:app.settings.zoom,c:[(q[0][0]+q[1][0])/2,(q[0][1]+q[1][1])/2]};drag=null;app.pointer=null;app.draggingActor=false;canvas.setPointerCapture(e.pointerId);stop(e);return;}
   if(touches.size>2){stop(e);return;}
   const hit=app.actorAt(e.clientX,e.clientY),accent=app.accentAt(e.clientX,e.clientY);
   if(e.button===2||e.button===1||this.lock||(hit<0&&accent<0)){
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY,moved:false,pan:e.button===1||e.shiftKey,exclusive:e.button!==0||this.lock};
    if(drag.exclusive){app.pointer=null;canvas.setPointerCapture(e.pointerId);stop(e);}
   }
  },true);
  canvas.addEventListener('pointermove',e=>{
   if(touches.has(e.pointerId))touches.set(e.pointerId,[e.clientX,e.clientY]);
   if(pinch&&touches.size===2){const q=[...touches.values()],d=Math.hypot(q[0][0]-q[1][0],q[0][1]-q[1][1]),c=[(q[0][0]+q[1][0])/2,(q[0][1]+q[1][1])/2];app.settings.zoom=clamp(pinch.zoom*d/Math.max(pinch.d,1),.35,12);this.panBy(c[0]-pinch.c[0],c[1]-pinch.c[1]);pinch.c=c;app.pointer=null;app.draggingActor=false;app.syncCameraUI?.();stop(e);return;}
   if(!drag||drag.id!==e.pointerId)return;
   if(Math.hypot(e.clientX-drag.ox,e.clientY-drag.oy)>6)drag.moved=true;
   if(drag.moved){app.director.stopPlayback();if(drag.pan)this.panBy(e.clientX-drag.x,e.clientY-drag.y);else this.orbit(e.clientX-drag.x,e.clientY-drag.y);app.pointer=null;app.draggingActor=false;canvas.setPointerCapture(e.pointerId);stop(e);}
   else if(drag.exclusive)stop(e);drag.x=e.clientX;drag.y=e.clientY;
  },true);
  const end=e=>{const multi=!!pinch;touches.delete(e.pointerId);if(multi){app.pointer=null;if(touches.size<2)pinch=null;drag=null;stop(e);return;}if(drag?.id===e.pointerId){const block=drag.moved||drag.exclusive;drag=null;if(block){app.pointer=null;stop(e);}}};
  canvas.addEventListener('pointerup',end,true);canvas.addEventListener('pointercancel',e=>{end(e);drag=null;pinch=null;touches.clear();app.pointer=null;},true);
  canvas.addEventListener('wheel',e=>{this.zoomBy(Math.exp(-e.deltaY*.0015));stop(e);},{capture:true,passive:false});
  window.addEventListener('blur',()=>{drag=null;pinch=null;touches.clear();});
 }
}
