// Deterministic unit tests; no browser or visual renderer required.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
let source=['math.js','geometry.js','motion.js','actlib-cast.js','cast.js','figure.js'].map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n');
source+=`\nglobalThis.engine={M,V,gaitSample,phaseForDistance,twoBone,poseControls,human,GAITS,TAU,applyRoster,CAST_ROSTER,rig,appearanceOf,BODY_FEMALE,BODY_MALE,ACTLIB_ACTS,labels:null};`;
const scope={console};vm.runInNewContext(source,scope);const e=scope.engine,tests=[];
function check(name,passed,detail=''){tests.push({name,passed:!!passed,detail});console.log(passed?'PASS':'FAIL',name,detail);}
const actor=()=>({id:1,x:0,y:0,z:0,s:0,angle:0,pose:'walk',poseSince:0,phase:0,moving:true,jumpY:0,flying:false,flightY:2.3,airY:0,velocity:0,blendFrom:null});
const scene={id:2,height:()=>0};
for(const run of [false,true]){
 const tag=run?'run':'walk',g=e.GAITS[tag];
 const a=e.gaitSample(.1*e.TAU,1,run),b=e.gaitSample(.2*e.TAU,1,run);
 check(tag+': planted foot travels backward locally',a.stance&&b.stance&&b.z<a.z&&a.lift===0&&b.lift===0);
 const c=e.gaitSample((g.duty+(1-g.duty)*.2)*e.TAU,1,run),d=e.gaitSample((g.duty+(1-g.duty)*.8)*e.TAU,1,run);
 check(tag+': lifted foot swings forward',!c.stance&&!d.stance&&d.z>c.z&&c.lift>0&&d.lift>0);
 let previous=null,maxSlip=0,samples=0;
 for(let i=0;i<500;i++){const a=actor();a.pose=tag;a.z=i*.004;a.phase=e.phaseForDistance(a.z,run);e.human(a,scene,2);const feet=a.rigAudit.feet;
 if(previous)feet.forEach((f,j)=>{const p=previous[j];if(f.sample.stance&&p.sample.stance&&f.sample.u>p.sample.u){maxSlip=Math.max(maxSlip,Math.hypot(f.world[0]-p.world[0],f.world[2]-p.world[2]));samples++;}});previous=feet;}
 check(tag+': straight-line contact foot is world-locked',maxSlip<.0001,`max slip ${maxSlip.toExponential(2)} m; ${samples} samples`);
 let x=actor(),y=actor();x.pose=y.pose=tag;for(let i=0;i<60;i++)x.phase+=e.phaseForDistance(g.speed/60,run);for(let i=0;i<20;i++)y.phase+=e.phaseForDistance(g.speed/20,run);
 check(tag+': phase is frame-rate independent',Math.abs(x.phase-y.phase)<1e-10);
}
const poses=['idle','walk','run','float','reach','wave','point','open','look','bow','crouch','kneel','sit','meditate','balance','stretch','turn','dance'];
let maxBoneError=0,allFinite=true,counts=new Set();
for(const pose of poses)for(const flying of [false,true])for(const t of [.05,.5,1.6,3.2]){const a=actor();a.pose=pose;a.moving=['walk','run'].includes(pose);a.flying=flying;a.phase=t*6;const meshes=e.human(a,scene,t);counts.add(meshes.length);allFinite&&=meshes.every(m=>[...m.m].every(Number.isFinite));for(const [links,lens]of [[a.rigAudit.legs,[.43,.42]],[a.rigAudit.arms,[.305,.255]]])for(const link of links){const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));maxBoneError=Math.max(maxBoneError,Math.abs(dist(link.start,link.joint)-lens[0]),Math.abs(dist(link.joint,link.end)-lens[1]));}}
check('All 18 poses × ground/air × 4 timestamps render finite matrices',allFinite,`${poses.length*2*4} rig states`);
check('All gesture bone lengths remain fixed',maxBoneError<1e-8,`maximum error ${maxBoneError.toExponential(2)} m`);
const a=actor();a.flying=true;a.pose='float';a.moving=true;e.human(a,scene,1);check('Airborne moving figure is never a grounded gait',a.rigAudit.mode==='air');
const maleA=actor();maleA.appearance=e.applyRoster({},e.CAST_ROSTER[0]);const femA=actor();femA.appearance=e.applyRoster({},e.CAST_ROSTER[1]);
e.human(maleA,scene,1);e.human(femA,scene,1);
const mR=e.rig(maleA),fR=e.rig(femA);
check('female is a distinct adult silhouette',fR.shoulder<mR.shoulder&&fR.hip>mR.hip&&fR.height<mR.height&&fR.chest>0&&mR.chest===0,`shoulder ${fR.shoulder.toFixed(3)}/${mR.shoulder.toFixed(3)} hip ${fR.hip.toFixed(3)}/${mR.hip.toFixed(3)}`);
check('female figure still has a featureless two-sphere head',femA.headWorld&&Number.isFinite(femA.headWorld[1]));
check('actlib maps 73 canon acts',e.ACTLIB_ACTS.length===73);
const extra=['arms_crossed','hands_pocket','hug_self','think','phone','clap','shrug','raise','cheer','hold','kick','listen','nod','shake_head','facepalm','punch','carry','selfie','lie'];
let extraFinite=true;
for(const pose of extra){const x=actor();x.pose=pose;x.moving=false;extraFinite&&=e.human(x,scene,1).every(m=>[...m.m].every(Number.isFinite));}
check('new actlib poses render finite matrices',extraFinite,`${extra.length} poses`);
const rest=actor();rest.moving=false;rest.pose='idle';const c=e.poseControls(rest,scene,0);rest.blendFrom=c;rest.blendAt=0;rest.pose='bow';const first=e.poseControls(rest,scene,0);check('Pose transition starts continuously',JSON.stringify(c)===JSON.stringify(first));
// Dense seam checks: continuity of foot position and horizontal velocity.
for(const run of [false,true]){
 const tag=run?'run':'walk',g=e.GAITS[tag],eps=1e-5;let posErr=0,velErr=0;
 for(const u of [0,g.duty]){const x=e.gaitSample((u-eps)*e.TAU,1,run),y=e.gaitSample(u*e.TAU,1,run),z=e.gaitSample((u+eps)*e.TAU,1,run);posErr=Math.max(posErr,Math.abs(x.z-z.z));velErr=Math.max(velErr,Math.abs((y.z-x.z)/eps-(z.z-y.z)/eps));}
 check(tag+': continuous foot velocity across contact boundaries',posErr<.0001&&velErr<.001,{posErr,velErr});
 let minY=Infinity,maxY=-Infinity,correlation=0;
 for(let k=0;k<240;k++){const a=actor();a.pose=tag;a.phase=k/240*e.TAU;a.gaitWeight=1;const c=e.poseControls(a,scene,5);e.human(a,scene,5);const shoulder=a.rigAudit.arms[1].start,elbow=a.rigAudit.arms[1].joint;minY=Math.min(minY,elbow[1]);maxY=Math.max(maxY,elbow[1]);correlation+=(elbow[2]-shoulder[2])*Math.cos(a.phase-.28);}
 check(tag+': upper arm opposes same-side leg, elbow follows an arc',correlation<0&&maxY-minY>.005,{correlation,verticalElbowArc:maxY-minY});
}
// A more finely sampled action set includes every phase of the wrist-wave loop.
let denseFinite=true,maxWristDelta=0,prev=null;
for(let i=0;i<900;i++){const a=actor();a.moving=false;a.pose='wave';const c=e.poseControls(a,scene,i/120);if(prev)maxWristDelta=Math.max(maxWristDelta,Math.hypot(...c.hands[1].map((v,j)=>v-prev[j])));prev=c.hands[1];denseFinite&&=e.human(a,scene,i/120).every(o=>[...o.m].every(Number.isFinite));}
check('Wave envelope is continuous through lift, waves and lowering',denseFinite&&maxWristDelta<.025,{maxWristDelta});
fs.writeFileSync(path.join(root,'evidence-v53' ,'motion-results.json'),JSON.stringify({passed:tests.filter(x=>x.passed).length,failed:tests.filter(x=>!x.passed).length,checks:tests},null,2));if(tests.some(x=>!x.passed))process.exitCode=1;
