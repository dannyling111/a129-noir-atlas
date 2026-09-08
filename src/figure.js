function human(a,scene,time) {
  const out=[],c=poseControls(a,scene,time),air=isAirborne(a),R=rig(a);
  const root=compose(M.translation(a.x,baseY(a),a.z),M.ry(a.angle),M.rz(c.rootRoll),M.rx(c.rootTilt),M.scale(R.height,R.height,R.height));
  const appearance=appearanceOf(a),colour=castColour(a),hairCol=hairColourOf(a),female=appearance.body==='female';
  const cloth={shade:.63,tint:colour.rgb,emissive:.048,finish:'fabric',texLocal:true}, dark={shade:.045,emissive:.004};
  const hairMat={shade:.28,tint:hairCol.rgb,emissive:.02,finish:'fabric',texLocal:true};
  const add=(mesh,m,material=dark)=>out.push({mesh,m:M.mul(root,m),...material,actorId:a.id});
  const ball=(p,s,material)=>add('sphere',tr(p,s),material);
  const link=(p,q,r1,r2=r1,mesh='limb',material)=>add(mesh,linkMatrix(p,q,r1,r2),material);
  const pelvis=compose(M.translation(c.shiftX||0,c.pelvis,0),M.ry(c.hipYaw||0),M.rz(c.hipRoll||0));
  const hipR=R.hip, shR=R.shoulder, hs=R.head;
  const hipBulk=female?[.122,.072,.090]:[.137,.110,.094];
  add('sphere',M.mul(pelvis,tr([0,.055,-.010],[hipBulk[0]*R.body.hipWidth,hipBulk[1],hipBulk[2]*R.body.hipWidth])));
  add(female?'pelvisF':'pelvis',M.mul(pelvis,compose(M.translation(0,-.018,0),M.scale(R.body.hipWidth,1,R.body.hipWidth))));
  const torso=torsoMatrix(c,R);add(female?'torsoF':'torso',torso,cloth);const tp=p=>M.transform(torso,p).slice(0,3);
  const neckLen=.108*(female?1.22:1),neckR=female?.030:.034;
  const neckBase=tp([0,.468,0]),neckTop=tp([0,.468+neckLen,0]);
  link(neckBase,neckTop,neckR*1.08,neckR*.92,'limb');
  ball(neckBase,[neckR*1.12,.018,neckR*1.12]);
  ball(neckTop,[neckR*.95,.016,neckR*.95]);
  const headRoot=compose(torso,M.translation(0,.468+neckLen+.018,.006),M.ry(c.headYaw),M.rx(c.headPitch),M.scale(1,1/1.15,1));
  const head=(p,s)=>add('sphere',M.mul(headRoot,tr(p,s)));
  head([0,.002,-.006],[.080*hs,.113*hs,.081*hs]);head([0,-.060,.014],[.061*hs,.056*hs,.063*hs]);
  dressHair(add,headRoot,appearance,hairMat);
  dressHat(add,headRoot,appearance,cloth);
  a.headWorld=M.transform(M.mul(root,headRoot),[0,appearance.hat==='none'&&appearance.hair==='none'?.145:.195,0]).slice(0,3);
  a.bodyWorld=M.transform(root,tp([0,.23,0])).slice(0,3);
  for(const h of [.21,.29])add('sphere',M.mul(torso,tr([.003,h,.104*R.torsoZ],[.008,.008,.005])),{shade:.57});
  dressClothes(add,pelvis,torso,appearance,cloth,R);
  const audit={mode:air?'air':a.moving?'gait':a.pose,legs:[],arms:[],feet:[],forward:[Math.sin(a.angle),0,Math.cos(a.angle)],body:appearance.body};
  const sleeve=appearance.outfit==='sleeves'||appearance.outfit==='coat';
  [-1,1].forEach((side,i)=>{
    const hip=M.transform(pelvis,[side*hipR,0,0]).slice(0,3),kneePole=a.pose==='meditate'&&!a.moving?[side,0,.15]:[0,0,1];
    const leg=twoBone(hip,c.feet[i],R.upperLeg,R.lowerLeg,kneePole),knee=leg.joint,ankle=leg.end;
    const skirt=appearance.outfit==='dress';
    link(hip,knee,.083,.079,'limb',skirt?cloth:dark);ball(knee,[.046,.047,.043],skirt?cloth:dark);link(knee,ankle,.062,.061,'forelimb',skirt?cloth:dark);ball(ankle,[.028,.032,.029]);
    const foot=compose(M.translation(...ankle),M.ry(c.footYaw?.[i]||0),M.rx(c.pitches[i]));
    const fs=R.foot;
    add('sphere',M.mul(foot,tr([0,-.038,-.034],[.045*fs,.033*fs,.060*fs])));
    add('sphere',M.mul(foot,tr([0,-.040,.061],[.049*fs,.032*fs,.079*fs])));
    add('sphere',M.mul(foot,tr([0,-.043,.143],[.047*fs,.029*fs,.036*fs])));
    const shoulder=tp([side*shR,.363,0]),arm=twoBone(shoulder,c.hands[i],R.upperArm,R.lowerArm,c.poles[i]),elbow=arm.joint,wrist=arm.end;
    const armCloth=sleeve?cloth:dark;
    ball(shoulder,[.054*R.body.shoulderWidth+.012,.062,.056],armCloth);link(shoulder,elbow,.054,.051,'limb',armCloth);ball(elbow,[.032,.034,.031]);link(elbow,wrist,.042,.039,'forelimb',armCloth);ball(wrist,[.022*R.hand,.024*R.hand,.022*R.hand]);
    const d=V.norm(V.sub(wrist,elbow));
    const frame=linkMatrix(wrist,V.add(wrist,d),1,1);
    const hand=compose(frame,M.rx(c.wristFlex?.[i]||0),M.rz(c.wristWave?.[i]||0));
    const palm=[.029*R.hand,.014*R.hand],open=c.handOpen?.[i]??.15;
    const closed=open<.20;
    add('sphere',M.mul(hand,tr([0,closed?.037:.044,0],[palm[0],closed?.034:.045,closed?.022:palm[1]])));
    add('sphere',M.mul(hand,tr([0,closed?.069:.090,-(closed?.016:.017*(1-open))],[.028*R.hand,closed?.022:.028,.024*R.hand])));
    if(open>.6){for(let j=0;j<4;j++)add('sphere',M.mul(hand,tr([(j-1.5)*.014,.101-(Math.abs(j-1.5)-.5)*.006,0],[.008,.023,.010])));}
    const thumbBase=side*.027*R.hand;
    add('sphere',M.mul(hand,compose(M.translation(thumbBase,closed?.050:.037,closed?.022:.007),M.rz(-side*.30),M.scale(.012,.027,.012))));
    if(a.pose==='point'&&side===1)add('sphere',M.mul(hand,tr([-.014,.129,0],[.009,.041,.009])));
    audit.legs.push(leg);audit.arms.push(arm);audit.feet.push({local:ankle,world:M.transform(root,ankle).slice(0,3),sample:gaitSample(a.phase,side,a.pose==='run')});
  });
  a.rigAudit=audit;if(!a.moving&&a.pose==='read'){const book=compose(root,tr([0,.895,.42],[.30,.035,.23]));out.push({mesh:'box',m:book,shade:.8});}
  if(!a.moving&&a.pose==='tea'){const hand=c.hands[1];out.push({mesh:'sphere',m:M.mul(root,tr([hand[0],hand[1]+.025,hand[2]+.045],[.052,.064,.052])),shade:.78});}
  if(!a.moving&&(a.pose==='phone'||a.pose==='selfie')){const hand=c.hands[1];out.push({mesh:'box',m:M.mul(root,tr([hand[0],hand[1]+.02,hand[2]+.02],[.04,.08,.02])),shade:.15});}
  return out;
}
