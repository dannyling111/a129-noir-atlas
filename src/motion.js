// NOIR 3 — local +Z is forward. Metres, radians, seconds.
// Hand-authored procedural animation; NOT a motion-capture asset.
const TAU = Math.PI * 2;
const GAITS = {
  walk: {amplitude:.33, duty:.61, lift:.115, speed:1.12},
  run:  {amplitude:.34, duty:.39, lift:.40, speed:2.75}
};
const smooth01 = x => {x=clamp(x,0,1);return x*x*(3-2*x);};
const smoother01 = x => {x=clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const approach=(a,b,d)=>a+clamp(b-a,-d,d);
function cycleCurve(u,keys) {
  u=((u%1)+1)%1;
  let i=0;while(i<keys.length-2&&u>keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1],p=keys[(i-1+keys.length-1)%(keys.length-1)],q=keys[(i+2)%(keys.length-1)];
  const pt=i===0?p[0]-1:p[0],qt=i+2>=keys.length?q[0]+1:q[0];
  const d=b[0]-a[0],t=(u-a[0])/d;
  const m0=(b[1]-p[1])/(b[0]-pt),m1=(q[1]-a[1])/(qt-a[0]);
  return (2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*d*m0+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*d*m1;
}
function gaitSample(phase, side, run=false) {
  const g=GAITS[run?'run':'walk'];
  const u=((phase/TAU+(side===-1?.5:0))%1+1)%1,stance=u<g.duty;
  const v=stance?u/g.duty:(u-g.duty)/(1-g.duty);
  // Hermite swing keeps backward ankle velocity at toe-off AND heel strike.
  // The foot does not reverse abruptly at either contact boundary.
  const m=-2*g.amplitude*(1-g.duty)/g.duty;
  const z=stance?g.amplitude*(1-2*v):
    (-g.amplitude)*(2*v*v*v-3*v*v+1)+m*(v*v*v-2*v*v+v)+g.amplitude*(-2*v*v*v+3*v*v)+m*(v*v*v-v*v);
  const lift=stance?0:g.lift*Math.pow(Math.max(0,Math.sin(Math.PI*v)),1.4);
  const pitch=cycleCurve(u,run?
    [[0,.02],[.12,.04],[.28,.24],[.39,.70],[.56,.96],[.76,.18],[.90,-.18],[1,.02]]:
    [[0,-.22],[.10,0],[.42,0],[.61,.48],[.72,.32],[.83,-.16],[.94,-.24],[1,-.22]]);
  // The sole stays on the floor while the heel/toes roll.
  const ankleY=.073*Math.cos(pitch)+Math.max(-.09*Math.sin(pitch),.178*Math.sin(pitch));
  return {u,stance,v,z,lift,pitch,ankleY};
}
function phaseForDistance(distance, run=false) {
  const g=GAITS[run?'run':'walk'];return distance*TAU*g.duty/(2*g.amplitude);
}
function twoBone(start,desired,upper,lower,pole) {
  const d=V.sub(desired,start),raw=Math.hypot(...d),dir=raw>1e-8?V.mul(d,1/raw):[0,-1,0];
  const length=clamp(raw,Math.abs(upper-lower)+.00001,upper+lower-.00001),end=V.add(start,V.mul(dir,length));
  let bend=V.sub(pole,V.mul(dir,V.dot(pole,dir)));
  if(Math.hypot(...bend)<1e-6)bend=V.cross(dir,Math.abs(dir[0])<.9?[1,0,0]:[0,1,0]);
  bend=V.norm(bend);
  const along=(upper*upper-lower*lower+length*length)/(2*length),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {start,joint:V.add(V.add(start,V.mul(dir,along)),V.mul(bend,height)),end,requested:desired};
}
function blendControls(from,to,f) {
  if(Array.isArray(to))return to.map((v,i)=>blendControls(from?.[i]??v,v,f));
  if(typeof to==='number')return lerp(typeof from==='number'?from:to,to,f);
  if(to&&typeof to==='object')return Object.fromEntries(Object.entries(to).map(([k,v])=>[k,blendControls(from?.[k],v,f)]));
  return to;
}
function isAirborne(a){return !!a.flying;}
function baseY(a){return a.y+(a.jumpY||0);}
function localToWorld(a,p) {
  const c=Math.cos(a.angle),s=Math.sin(a.angle);
  return [a.x+p[0]*c+p[2]*s,a.y+p[1],a.z-p[0]*s+p[2]*c];
}
function worldToLocal(a,p) {
  const c=Math.cos(a.angle),s=Math.sin(a.angle),x=p[0]-a.x,z=p[2]-a.z;
  return [x*c-z*s,p[1]-a.y,x*s+z*c];
}
// Contact memory belongs to simulation, never to draw(). Rendering a paused
// frame twice must not move a foot or advance a gesture.
function updateContactRig(a,sc,dt,moved) {
  const active=!a.flying&&a.jumpY<.025&&moved>.00001;
  const weight=clamp((a.speed||0)/.35,0,1)*(active?1:0);
  a.gaitWeight=lerp(a.gaitWeight||0,weight,1-Math.exp(-dt*(active?9:12)));
  a.runWeight=lerp(a.runWeight||0,a.pose==='run'?1:0,1-Math.exp(-dt*8));
  a.feetPlant??=[null,null];
  if(!active){a.feetPlant=[null,null];return;}
  [-1,1].forEach((side,i)=>{
    const g=gaitSample(a.phase,side,a.pose==='run'),old=a.feetPlant[i];
    if(g.stance) {
      if(!old||!old.stance){
        const p=localToWorld(a,[side*.095*rig(a).body.hipWidth,0,g.z*(a.gaitWeight||0)]);
        a.feetPlant[i]={stance:true,x:p[0],z:p[2],floor:sc.height(p[0],p[2]),angle:a.angle};
      }
    } else a.feetPlant[i]={stance:false,x:old?.x??a.x,z:old?.z??a.z,floor:old?.floor??a.y,angle:a.angle};
  });
}

// Two adult silhouettes; bone lengths come from rig(a). Rebuilt shoulder-elbow-wrist chain.
function torsoMatrix(c,R){R=R||{torsoX:1,torsoY:1,torsoZ:1,height:1,shoulder:.181};return compose(M.translation(c.shiftX||0,c.pelvis+.125,0),M.ry(c.bodyYaw||0),M.rz(c.roll),M.rx(c.lean),M.scale(R.torsoX,1.15*R.torsoY,R.torsoZ));}
function armControls(c,side,swing,bend,spread=.06,twist=0,R) {
  R=R||{shoulder:.181,torsoY:1,upperArm:.305,lowerArm:.255,torsoX:1,torsoZ:1};
  const shoulder=M.transform(torsoMatrix(c,R),[side*R.shoulder,.363,0]).slice(0,3);
  const body=compose(M.ry(c.bodyYaw||0),M.rz(c.roll),M.rx(c.lean));
  const upper=compose(body,M.rz(side*spread),M.ry(twist),M.rx(-swing));
  const lower=M.mul(upper,M.rx(-bend));
  const elbow=V.add(shoulder,M.transform(upper,[0,-R.upperArm,0],0).slice(0,3));
  const wrist=V.add(elbow,M.transform(lower,[0,-R.lowerArm,0],0).slice(0,3));
  return {wrist,pole:V.sub(elbow,shoulder)};
}
function poseControls(a,scene,time) {
  const air=isAirborne(a),walk=!air&&(a.moving||(a.gaitWeight||0)>.006),run=a.pose==='run';
  const mode=air&&['walk','run','float'].includes(a.pose)?'float':walk?(run?'run':'walk'):a.pose;
  const t=Math.max(0,time-(a.poseSince||0)),p=a.phase||0,weight=a.gaitWeight??(a.moving?1:0);
  const breath=Math.sin(time*1.05+a.id*.83),R=rig(a),hip=R.hip;
  const hipShift=.009*Math.sin(p-.4)*weight;
  let c={pelvis:.9,lean:.007*breath,roll:0,shiftX:0,bodyYaw:0,hipYaw:0,hipRoll:0,headYaw:0,headPitch:0,rootTilt:0,rootRoll:0,
    feet:[[-hip,.073,-.025],[hip,.073,.025]],pitches:[0,0],footYaw:[-.055,.055],
    hands:[[-.218,.941,.038],[.218,.941,.038]],poles:[[-.12,-1,.15],[.12,-1,.15]],
    wristFlex:[.035,.035],wristWave:[0,0],handOpen:[.42,.42]};
  if(walk){
    const stepU=((p/TAU*2)%1+1)%1;
    const h=run?cycleCurve(stepU,[[0,.866],[.24,.805],[.50,.846],[.78,.91],[.90,.925],[1,.866]]):
      .850+.039*(.5-.5*Math.cos(p*2-.35));
    c.pelvis=lerp(.90,h,weight);c.shiftX=hipShift;c.hipRoll=.022*Math.sin(p)*weight;
    c.hipYaw=.055*Math.cos(p-.1)*weight;c.bodyYaw=-.055*Math.cos(p-.38)*weight;
    c.lean=(run?.115:.025)*weight+.01*clamp((a.accel||0)/4,-1,1);
    c.roll=-.018*Math.sin(p+.3)*weight-clamp(a.turnRate||0,-2,2)*.012*weight;
    c.headYaw=-c.bodyYaw*.65;c.headPitch=-c.lean*.28;
    [-1,1].forEach((side,i)=>{
      const g=gaitSample(p,side,run),u=g.u*TAU;
      c.pitches[i]=g.pitch*weight;c.feet[i]=[side*hip,lerp(.073,g.ankleY+g.lift,weight),g.z*weight];
      const swing=(run?-.57:-.25)*Math.cos(u-.28)*weight;
      const bend=lerp(.14,run?1.36+.15*Math.sin(u-.7):.18+.10*(.5+.5*Math.sin(u-.5)),weight);
      const fk=armControls(c,side,swing,bend,run?.095:.065,side*.045,R);
      c.hands[i]=fk.wrist;c.poles[i]=fk.pole;c.wristFlex[i]=.04+.025*Math.sin(u-.8);
      c.handOpen[i]=run?.03:.42;
    });
  } else {
    [-1,1].forEach((side,i)=>{const fk=armControls(c,side,.012,.14,.055,0,R);c.hands[i]=fk.wrist;c.poles[i]=fk.pole;});
  }
  if(air){
    c.pelvis=.90;c.rootTilt=a.moving?.13:.025;c.rootRoll=.016*Math.sin(time*.62+a.id);
    c.feet=[[-.105,.18,.045],[.115,.28,-.22]];
    c.hands=[[-.34,1.015,.10],[.34,1.025,.12]];c.poles=[[-.55,-.75,.12],[.55,-.75,.12]];c.handOpen=[.5,.5];
  }
  if(!walk)switch(mode){
    case 'sit':c.pelvis=.12;c.lean=.10;c.feet=[[-.16,.073,.70],[.16,.073,.70]];c.hands=[[-.15,.39,.35],[.15,.39,.35]];break;
    case 'crouch':c.pelvis=.42;c.lean=.32;c.feet=[[-.16,.073,-.13],[.16,.073,-.13]];c.hands=[[-.20,.53,.32],[.20,.53,.32]];break;
    case 'kneel':c.pelvis=.49;c.lean=.06;c.feet=[[-.15,.09,-.52],[.15,.073,.44]];c.hands=[[-.19,.67,.10],[.18,.68,.32]];break;
    case 'meditate':c.pelvis=.12;c.feet=[[-.08,.073,.31],[.08,.083,.31]];c.hands=[[-.30,.32,.25],[.30,.32,.25]];break;
    case 'reach':c.hands[1]=[.23,1.88,.24];c.poles[1]=[.5,-.18,.28];c.headPitch=-.16;c.handOpen[1]=.75;break;
    case 'wave':{
      // Lift -> two small wrist waves -> hold -> lower, with a quiet interval.
      const k=t%7.5,env=smoother01(k/.85)*(1-smoother01((k-4.4)/.9));
      const wave=env*Math.sin(Math.max(0,k-1)*4.0)*smooth01((k-1)/.3)*(1-smooth01((k-3.8)/.45));
      c.hands[1]=c.hands[1].map((v,i)=>lerp(v,[.32,1.77,.13][i],env));
      c.poles[1]=[.75,-.2,.08];c.wristWave[1]=wave*.23;c.handOpen[1]=.90;c.headYaw=.055*env;break;
    }
    case 'point':c.hands[1]=[.20,1.40,.515];c.poles[1]=[.15,-.65,.12];c.handOpen[1]=.04;c.headPitch=-.015;c.headYaw=.07;break;
    case 'open':c.hands=[[-.675,1.44,.11],[.675,1.44,.11]];c.poles=[[-.8,-.35,.1],[.8,-.35,.1]];c.headPitch=-.07;c.handOpen=[.9,.9];break;
    case 'look':c.headYaw=.38*Math.sin(t*.43);c.headPitch=-.12+.025*Math.sin(t*.3);c.bodyYaw=.045*Math.sin(t*.43-.5);break;
    case 'bow':{const e=smoother01(Math.min(t,1.6)/1.6);c.lean=.50*e;c.headPitch=.13*e;c.hands=[[-.19,.91,.33*e],[.19,.91,.33*e]];break;}
    case 'balance':c.feet=[[-.10,.073,0],[.17,.52,.31]];c.hands=[[-.67,1.44,.05],[.67,1.44,.05]];c.poles=[[-1,-.2,.1],[1,-.2,.1]];c.shiftX=-.055;c.rootRoll=.008*breath;c.handOpen=[.7,.7];break;
    case 'stretch':c.hands=[[-.18,1.94,.03],[.18,1.94,.03]];c.poles=[[-.6,.25,.12],[.6,.25,.12]];c.headPitch=-.08;c.handOpen=[.75,.75];break;
    case 'dance':c.pelvis=.86+.014*Math.sin(t*2);c.roll=.055*Math.sin(t*.9);c.lean=.022;c.bodyYaw=.09*Math.sin(t*.9);c.hands=[[-.46,1.34+.17*Math.sin(t*.9),.23],[.46,1.34-.17*Math.sin(t*.9),.23]];c.feet=[[-.14,.073,0],[.14,.073,0]];c.poles=[[-.6,-.6,.1],[.6,-.6,.1]];c.handOpen=[.7,.7];break;
    case 'arms_crossed':c.hands=[[.12,.98,.16],[-.12,.93,.18]];c.poles=[[.35,-.55,.2],[-.35,-.55,.2]];c.handOpen=[.05,.05];c.roll=.02;break;
    case 'hands_pocket':c.hands=[[-.16,.72,.10],[.16,.72,.10]];c.poles=[[-.2,-.85,.05],[.2,-.85,.05]];c.shiftX=.02;c.lean=.04;c.handOpen=[.02,.02];break;
    case 'hug_self':c.hands=[[.18,.95,.22],[-.18,.92,.20]];c.poles=[[.4,-.4,.25],[-.4,-.4,.25]];c.lean=.12;c.headPitch=.08;c.handOpen=[.3,.3];break;
    case 'think':c.hands[1]=[.16,1.42,.18];c.poles[1]=[.25,-.2,.3];c.headPitch=.16;c.headYaw=.08;c.handOpen[1]=.15;break;
    case 'phone':c.hands[1]=[.20,1.52,.08];c.poles[1]=[.45,-.15,.1];c.headYaw=.18;c.headPitch=-.04;c.handOpen[1]=.12;break;
    case 'clap':{const u=(Math.sin(t*8)+1)*.5;c.hands=[[-.06-u*.04,1.12,.28],[.06+u*.04,1.12,.28]];c.poles=[[-.2,-.5,.3],[.2,-.5,.3]];c.handOpen=[.5,.5];break;}
    case 'shrug':c.hands=[[-.42,1.18,.08],[.42,1.18,.08]];c.poles=[[-.5,-.3,.1],[.5,-.3,.1]];c.headPitch=-.04;c.handOpen=[.7,.7];break;
    case 'raise':c.hands[1]=[.22,1.92,.08];c.poles[1]=[.4,.2,.1];c.handOpen[1]=.55;c.headPitch=-.08;break;
    case 'cheer':c.hands=[[-.28,1.96,.10],[.28,1.96,.10]];c.poles=[[-.4,.3,.1],[.4,.3,.1]];c.headPitch=-.12;c.handOpen=[.7,.7];break;
    case 'hold':c.hands[1]=[.18,1.18,.42];c.poles[1]=[.25,-.4,.35];c.handOpen[1]=.2;c.headPitch=-.06;break;
    case 'kick':c.feet=[[-hip,.073,-.05],[hip*.4,.42,.55]];c.hands=[[-.34,1.10,.05],[.34,1.10,.05]];c.shiftX=-.04;c.rootRoll=.04;break;
    case 'listen':c.lean=.16;c.headPitch=.10;c.headYaw=.12;c.hands=[[-.20,.92,.22],[.20,.92,.22]];break;
    case 'nod':c.headPitch=.22*Math.sin(t*3.2);c.hands=[[-.20,.94,.04],[.20,.94,.04]];break;
    case 'shake_head':c.headYaw=.32*Math.sin(t*4.0);c.hands=[[-.20,.94,.04],[.20,.94,.04]];break;
    case 'facepalm':c.hands[1]=[.10,1.50,.14];c.poles[1]=[.22,-.12,.22];c.headPitch=.28;c.headYaw=.08;c.handOpen[1]=.45;break;
    case 'punch':c.hands[1]=[.06,1.20,.58];c.poles[1]=[.12,-.48,.18];c.hands[0]=[-.30,.92,-.14];c.poles[0]=[-.35,-.8,.05];c.lean=.10;c.bodyYaw=-.14;c.handOpen=[.05,.02];break;
    case 'carry':c.hands=[[-.16,1.04,.30],[.16,1.04,.30]];c.poles=[[-.22,-.48,.22],[.22,-.48,.22]];c.lean=.12;c.handOpen=[.12,.12];break;
    case 'selfie':c.hands[1]=[.24,1.64,.30];c.poles[1]=[.42,.04,.22];c.headYaw=.22;c.headPitch=-.08;c.handOpen[1]=.18;break;
    case 'lie':c.pelvis=.10;c.lean=.62;c.feet=[[-.20,.073,.70],[.20,.073,.78]];c.hands=[[-.30,.18,.48],[.30,.20,.52]];c.headPitch=.16;c.handOpen=[.35,.35];break;
  }
  if(!walk&&!air&&['chair','work','read','tea'].includes(mode)||(a.seatId&&mode==='talk')){
    c.pelvis=.455;c.lean=.055;c.feet=[[-.11,.073,.39],[.11,.073,.39]];c.hands=[[-.14,.76,.35],[.14,.76,.35]];c.poles=[[-.30,-.55,.10],[.30,-.55,.10]];c.handOpen=[.35,.35];
    if(mode==='work'){c.lean=.10;c.headPitch=.11;c.hands=[[-.14,.805+.004*Math.sin(t*5),.51],[.14,.805+.004*Math.sin(t*5+1),.51]];}
    if(mode==='read'){c.headPitch=.19;c.hands=[[-.14,.89,.37],[.14,.89,.37]];}
    if(mode==='tea'){const u=(Math.sin(t*.65-1)+1)*.5;c.hands[1]=[.15,lerp(.82,1.19,u),lerp(.35,.14,u)];c.headPitch=-.02*u;}
  }
  if(!walk&&!air&&mode==='talk'){
    // One restrained gesture per sentence, with relaxed pauses; not constant flapping.
    const u=(t%6.6),env=smoother01(u/.85)*(1-smoother01((u-3.9)/1.0)),side=a.id%2?1:-1,i=side===1?1:0;
    const y=a.seatId?.88:1.15,home=c.hands[i];c.hands[i]=home.map((v,k)=>lerp(v,[side*.27,y+.025*Math.sin(t*1.6),.31][k],env));
    c.poles[i]=[side*.5,-.65,.15];c.handOpen[i]=lerp(.42,.75,env);c.headPitch=.022*Math.sin(t*1.2);c.headYaw=.025*Math.sin(t*.65);
  }
  if(!walk&&a.attention){c.headYaw=clamp(angleDelta(a.angle,Math.atan2(a.attention[0]-a.x,a.attention[1]-a.z)),-.5,.5);}

  if(a.jumpY>.025&&!air){c.pelvis=.86;c.feet=[[-.1,.18,-.12],[.1,.25,.13]];c.hands=[[-.28,1.60,.15],[.28,1.60,.15]];}
  const lowPose=['sit','crouch','kneel','meditate','chair','work','read','tea','lie'].includes(mode)||!!a.seatId;
  if(!air&&a.jumpY<.025&&!lowPose){
    c.feet=c.feet.map((f,i)=>{
      const g=gaitSample(p,i===0?-1:1,run),plant=a.feetPlant?.[i];
      if(walk&&plant?.stance&&g.stance&&weight>.85){
        const local=worldToLocal(a,[plant.x,plant.floor+g.ankleY,plant.z]);
        // Limited release at an exceptional sharp pivot avoids leg stretching.
        if(Math.hypot(local[0],local[2])<.51){c.footYaw[i]=angleDelta(a.angle,plant.angle)+(i===0?-.055:.055);return local;}
      }
      if(scene.id===1||scene.world){
        const w=localToWorld(a,f),floor=scene.height(w[0],w[2]);
        if(walk&&!g.stance){
          const liftFrom=plant?.floor??a.y,landing=localToWorld(a,[f[0],0,GAITS[run?'run':'walk'].amplitude+.15]);
          const liftTo=scene.height(landing[0],landing[2]);
          f[1]+=lerp(liftFrom,liftTo,smoother01(g.v))-a.y+Math.abs(liftTo-liftFrom)*.5*Math.sin(Math.PI*g.v);
          f[1]=Math.max(f[1],floor-a.y+.074);
        }else f[1]+=floor-a.y;
      }
      return f;
    });
  }
  // Keep pelvis within the stance leg reach; never stretch the femur/tibia.
  if(walk&&!air){
    let ceiling=1.2;
    c.feet.forEach((f,i)=>{if(gaitSample(p,i===0?-1:1,run).stance){const dx=f[0]-(i===0?-R.hip:R.hip)-c.shiftX,reach=(R.upperLeg+R.lowerLeg)*.98;ceiling=Math.min(ceiling,f[1]+Math.sqrt(Math.max(.2,reach*reach-dx*dx-f[2]*f[2])));}});
    c.pelvis=Math.min(c.pelvis,ceiling);
  }
  if(a.blendFrom){const u=clamp((time-(a.blendAt||0))/.60,0,1);if(u<1)c=blendControls(a.blendFrom,c,smoother01(u));}
  return c;
}
