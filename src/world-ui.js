App.prototype.setupWorldUI=function(){
 $('world-guide').onclick=()=>{const open=$('places-panel').hidden;$('places-panel').hidden=!open;$('social-panel').hidden=true;$('settings').hidden=true;$('director-panel').hidden=true;};
 $('places-close').onclick=()=>$('places-panel').hidden=true;
 $('nearby').onclick=()=>{const b=this.living.nearest();if(b)this.openSocial(b.id);else this.toast('附近暂时没有可互动的人物。');};
 $('follow-world').onclick=()=>{this.cameraMode=this.cameraMode==='follow'?'fixed':'follow';this.focused=false;this.focusPoint=null;$('follow-world').textContent=this.cameraMode==='follow'?'返回全景':'跟随视角';this.syncV2Controls();};
 $('social-close').onclick=()=>$('social-panel').hidden=true;
 document.querySelectorAll('[data-social]').forEach(el=>el.onclick=()=>{this.living.interact(el.dataset.social,this.partnerId,true);$('social-panel').hidden=true;});
 $('take-control').onclick=()=>{const k=this.actors.findIndex(a=>a.id===this.partnerId);if(k>=0){this.selected=k;this.exhibition.takeover(this.actor);this.syncPose();this.focusPoint=null;}$('social-panel').hidden=true;};
 $('world-labels').onchange=e=>{this.showWorldLabels=e.target.checked;};
 $('stand-up').onclick=()=>{this.exhibition.takeover(this.actor);this.setPose('idle');this.toast('已起身，可以继续行走。');};
 this.refreshWorldUI();
};
App.prototype.refreshWorldUI=function(){const world=!!this.scene.world;document.body.classList.toggle('living-world',world);$('world-strip').hidden=!world;$('places-panel').hidden=true;$('social-panel').hidden=true;$('world-hud').innerHTML='';$('follow-world').textContent='跟随视角';$('stand-up').hidden=true;
 if(world){$('places-title').textContent=SCENE_META[this.scene.id].title+' · 可到达地点';$('place-list').replaceChildren();for(const s of this.scene.spots){const el=document.createElement('button');el.className='place-item';el.innerHTML='<span>'+s.name+'</span><small>'+(s.seat?'入座':'前往')+' ↗</small>';el.onclick=()=>{this.living.visit(this.actor,s.id,true);$('places-panel').hidden=true;};$('place-list').appendChild(el);}this.settings=cleanRenderSettings(this.settings);$('grain').value=0;}
 // Scroll the selected world into view without moving the browser document.
 const current=$('scene-dock').querySelector('[data-scene="'+this.scene.id+'"]');if(current){const dock=$('scene-dock');dock.scrollLeft=Math.max(0,current.offsetLeft-dock.clientWidth/2+current.clientWidth/2);}
};
App.prototype.openSocial=function(id){if(!this.scene.world)return;this.partnerId=id;$('places-panel').hidden=true;$('social-panel').hidden=false;const b=this.actors.find(a=>a.id===id);$('social-title').textContent='人物 '+String(id).padStart(2,'0');$('social-description').textContent=b?.seatId?'对方正在入座休息。互动时会先起身。':'走近、面对面，再通过动作回应。';};
App.prototype.spotAt=function(x,y){let found=null,best=16;if(!this.scene.world)return null;for(const s of this.scene.spots){if(!s.seat)continue;const p=this.screen([s.x,.53,s.z]),d=Math.hypot(p.x-x,p.y-y);if(d<best){best=d;found=s;}}return found;};
App.prototype.drawWorldHUD=function(){const hud=$('world-hud');if(!hud||!this.scene.world){if(hud)hud.replaceChildren();return;}
 const escape=s=>String(s).slice(0,80).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const nodes=[];for(const a of this.actors){if(a.speech&&a.speech.until>this.time){const p=this.screen([a.x,a.y+(a.seatId?1.65:2.18),a.z]);nodes.push(`<div class="speech-bubble" style="left:${p.x}px;top:${p.y}px">${escape(a.speech.text)}</div>`);}else if((this.cameraMode==='follow'||this.focused||this.settings.zoom>1.7)&&a.seatId){const p=this.screen([a.x,a.y+1.58,a.z]);nodes.push(`<div class="person-label" style="left:${p.x}px;top:${p.y}px">${labels[a.pose]||'休息'}</div>`);}}
 if(this.showWorldLabels&&!this.focused&&this.cameraMode==='fixed')for(const r of this.scene.rooms){const p=this.screen([r.x,.02,r.z]);nodes.push(`<div class="room-tag" style="left:${p.x}px;top:${p.y}px">${r.name}</div>`);}
 hud.innerHTML=nodes.join('');$('stand-up').hidden=!this.actor.seatId;
};

