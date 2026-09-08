function createAccents(scene) {
 const initial=scene.spawns[0],x=initial[0],z=initial[1];
 const raw=scene.id===5?[[-3.8,4,1.6],[4,1,2.1],[-7,-1,3.5]]:scene.id===6?[[-2,2,2.7],[4,-2,3.3],[8,1,1.4]]:scene.path? [8,23,38,54,68,80].map((s,i)=>{let p=pointOnPath(s,scene.path);return [p[0],p[1],i===3?3.6:1.2+i%3*.5];}):[
  [x+2.3,z-.9,1.6],[x-2.1,z-3.7,2.7],[x+5.0,z-6.1,1.1],
  [x-5,z-5.5,4.2],[x+1,z+5,1.0],[x+8.1,z-9.8,3.1]];
 return raw.map((p,i)=>{const q=scene.constrain(p[0],p[1]);return {id:i,x:q[0],z:q[1],y:scene.height(q[0],q[1])+p[2],tint:ACCENT_PALETTE[i].slice(),type:['sphere','ring','diamond','sphere','box','sphere'][i],size:[.145,.25,.24,.12,.23,.13][i],name:ACCENT_NAMES[i],phase:i*1.7};});
}
function accentObjects(accents,time,enabled=true){
 if(!enabled)return [];
 return accents.map(p=>({mesh:p.type==='diamond'?'box':p.type==='ring'?'torus':p.type,
  m:compose(M.translation(p.x,p.y+.10*Math.sin(time*.7+p.phase),p.z),M.ry(time*.24+p.phase),M.rz(p.type==='diamond'?Math.PI/4:p.type==='ring'?.35:0),M.rx(p.type==='diamond'?.6:0),M.scale(p.size,p.size,p.size)),
  shade:.30,tint:p.tint,emissive:.72+.08*Math.sin(time*.8+p.phase),castShadow:true,accent:true}));
}

// A small, reproducible single-shot recorder. This records engine state, NOT
// screen video. JSON clips can be scrubbed/replayed/imported, offline.
