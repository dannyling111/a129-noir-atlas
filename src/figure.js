function human(a,scene,time) {
  const out=[],c=poseControls(a,scene,time),air=isAirborne(a);
  const root=compose(M.translation(a.x,baseY(a),a.z),M.ry(a.angle),M.rz(c.rootRoll),M.rx(c.rootTilt));
  const appearance=appearanceOf(a),colour=castColour(a);
  const cloth={shade:.63,tint:colour.rgb,emissive:.048,finish:'fabric',texLocal:true}, dark={shade:.045,emissive:.004};
  const add=(mesh,m,material=dark)=>out.push({mesh,m:M.mul(root,m),...material,actorId:a.id});
  const ball=(p,s,material)=>add('sphere',tr(p,s),material);
  const link=(p,q,r1,r2=r1,mesh='limb',material)=>add(mesh,linkMatrix(p,q,r1,r2),material);
  const pelvis=compose(M.translation(c.shiftX||0,c.pelvis,0),M.ry(c.hipYaw||0),M.rz(c.hipRoll||0));
  add('sphere',M.mul(pelvis,tr([0,.061,-.012],[.137,.110,.094])));
  add('pelvis',M.mul(pelvis,M.translation(0,-.018,0)));
  const torso=torsoMatrix(c);add('torso',torso,cloth);const tp=p=>M.transform(torso,p).slice(0,3);
  ball(tp([0,.462,0]),[.044,.069,.044]);
  const headRoot=compose(torso,M.translation(0,.584,.008),M.ry(c.headYaw),M.rx(c.headPitch),M.scale(1,1/1.15,1));
  const head=(p,s)=>add('sphere',M.mul(headRoot,tr(p,s)));
  head([0,.002,-.006],[.080,.113,.081]);head([0,-.060,.014],[.061,.056,.063]);
  // No nose, eyes or mouth: a deliberately featureless head.
  dressHat(add,headRoot,appearance,cloth);
  a.headWorld=M.transform(M.mul(root,headRoot),[0,appearance.hat==='none'?.145:.195,0]).slice(0,3);
  a.bodyWorld=M.transform(root,tp([0,.23,0])).slice(0,3);
  for(const h of [.21,.29])add('sphere',M.mul(torso,tr([.003,h,.104],[.008,.008,.005])),{shade:.57});
  const audit={mode:air?'air':a.moving?'gait':a.pose,legs:[],arms:[],feet:[],forward:[Math.sin(a.angle),0,Math.cos(a.angle)]};
  [-1,1].forEach((side,i)=>{
    const hip=M.transform(pelvis,[side*.088,0,0]).slice(0,3),kneePole=a.pose==='meditate'&&!a.moving?[side,0,.15]:[0,0,1];
    const leg=twoBone(hip,c.feet[i],.43,.42,kneePole),knee=leg.joint,ankle=leg.end;
    link(hip,knee,.083,.079);ball(knee,[.046,.047,.043]);link(knee,ankle,.062,.061,'forelimb');ball(ankle,[.028,.032,.029]);
    const foot=compose(M.translation(...ankle),M.ry(c.footYaw?.[i]||0),M.rx(c.pitches[i]));
    add('sphere',M.mul(foot,tr([0,-.038,-.034],[.045,.033,.060])));
    add('sphere',M.mul(foot,tr([0,-.040,.061],[.049,.032,.079])));
    add('sphere',M.mul(foot,tr([0,-.043,.143],[.047,.029,.036])));
    const shoulder=tp([side*.181,.363,0]),arm=twoBone(shoulder,c.hands[i],.305,.255,c.poles[i]),elbow=arm.joint,wrist=arm.end;
    ball(shoulder,[.060,.066,.061],appearance.outfit==='sleeves'?cloth:dark);link(shoulder,elbow,.054,.051,'limb',appearance.outfit==='sleeves'?cloth:dark);ball(elbow,[.032,.034,.031]);link(elbow,wrist,.042,.039,'forelimb',appearance.outfit==='sleeves'?cloth:dark);ball(wrist,[.022,.024,.022]);
    const d=V.norm(V.sub(wrist,elbow));
    // Palm & thumb are attached in a wrist-local frame, never in world axes.
    const frame=linkMatrix(wrist,V.add(wrist,d),1,1);
    const hand=compose(frame,M.rx(c.wristFlex?.[i]||0),M.rz(c.wristWave?.[i]||0));
    const palm=[.029,.014],open=c.handOpen?.[i]??.15;
    // Running uses a relaxed closed hand, not rigid, extended 'tray' fingers.
    const closed=open<.20;
    add('sphere',M.mul(hand,tr([0,closed?.037:.044,0],[palm[0],closed?.034:.045,closed?.022:palm[1]])));
    add('sphere',M.mul(hand,tr([0,closed?.069:.090,-(closed?.016:.017*(1-open))],[.028,closed?.022:.028,closed?.024:.012])));
    // Slightly separated fingertips only when the palm is deliberately open.
    if(open>.6){for(let j=0;j<4;j++)add('sphere',M.mul(hand,tr([(j-1.5)*.014,.101-(Math.abs(j-1.5)-.5)*.006,0],[.008,.023,.010])));}
    const thumbBase=side*.027;
    add('sphere',M.mul(hand,compose(M.translation(thumbBase,closed?.050:.037,closed?.022:.007),M.rz(-side*.30),M.scale(.012,.027,.012))));
    if(a.pose==='point'&&side===1)add('sphere',M.mul(hand,tr([-.014,.129,0],[.009,.041,.009])));
    audit.legs.push(leg);audit.arms.push(arm);audit.feet.push({local:ankle,world:M.transform(root,ankle).slice(0,3),sample:gaitSample(a.phase,side,a.pose==='run')});
  });
  a.rigAudit=audit;if(!a.moving&&a.pose==='read'){const book=compose(root,tr([0,.895,.42],[.30,.035,.23]));out.push({mesh:'box',m:book,shade:.8});}
  if(!a.moving&&a.pose==='tea'){const hand=c.hands[1];out.push({mesh:'sphere',m:M.mul(root,tr([hand[0],hand[1]+.025,hand[2]+.045],[.052,.064,.052])),shade:.78});}
  return out;
}

