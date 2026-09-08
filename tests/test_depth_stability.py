"""Regression for the user's rotating-ground stripes, using real WebGL pixels.
The exact v5.1 HTML is a negative control. Shadows are temporarily disabled ONLY
in the ground-material diagnostic, proving this is geometry depth fighting.
Normal fully-lit rotation captures and shadow preservation are also checked.
Run: xvfb-run -a python tests/test_depth_stability.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os, json, math, base64, traceback
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence-v53';OUT.mkdir(exist_ok=True)
checks=[];results={};errors=[]
def record(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail))
 print(('PASS' if ok else 'FAIL'),name,str(detail)[:280],flush=True)
def load(browser,path):
 page=browser.new_page(viewport={'width':640,'height':540},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(path.read_text());page.wait_for_function('window.__NOIR__?.ready',timeout=30000)
 page.evaluate('noirApp.setLook?.({mode:"mono"},false);noirApp.setPaused(true);noirApp.renderer.resolution=1;')
 return page
PROBE=r'''config=>{
 const a=noirApp,r=a.renderer,g=r.gl,{M}=__NOIR__,i=config.scene;
 if(a.scene.id!==i){a.loadScene(i,false);a.setPaused(true);}
 const raw=__NOIR__.createWorld(i);
 const objects=raw.floorLayout?raw.objects.filter(o=>o.mesh==='floorShell'||o.mesh.startsWith('floor-cap-')):raw.objects.slice(0,i===7?8:5);
 a.focused=false;a.cameraMode='fixed';a.focusPoint=null;a.cameraRig.pan=[0,0,0];a.cameraRig.storyTarget=null;
 a.cameraRig.yaw=config.yaw;a.cameraRig.pitch=config.pitch;a.cameraRig.projection=config.projection||'perspective';a.settings.zoom=config.zoom;a.updateCamera();
 r.render(objects,a.camera,{...a.scene,ambient:1,strength:0,volume:0},{...a.settings,haze:0,contrast:1,exposure:1},0);
 const pixels=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,pixels);
 const patches=i===9?[
  {x:0,z:0,w:3,d:35.5,shade:.90}, {x:0,z:1.2,w:32,d:2.4,shade:.87},
  {x:0,z:-12.2,w:31,d:2,shade:.87}, {x:-10,z:8.2,w:9,d:7.6,shade:null}
 ]:[-9,0,9].flatMap(x=>[-5.8,5.8].map(z=>({x,z,w:8.65,d:7.8,shade:z<0?.79:.74})));
 const limits=i===9?[16,17.8]:[13.5,9.8],base=i===9?.77:.86;
 let total=0,bad=0,maxError=0,expectedSum=0,actualSum=0;
 for(let y=3;y<r.height-3;y+=4)for(let x=3;x<r.width-3;x+=4){
  const u=(x+.5)/r.width*2-1,v=(y+.5)/r.height*2-1;
  const p=M.transform(a.camera.inv,[u,v,-1]),q=M.transform(a.camera.inv,[u,v,1]);
  const from=p.slice(0,3).map(t=>t/p[3]),to=q.slice(0,3).map(t=>t/q[3]),dy=to[1]-from[1];
  if(Math.abs(dy)<1e-8)continue;
  const t=-from[1]/dy;if(t<0||t>1)continue;
  const wx=from[0]+(to[0]-from[0])*t,wz=from[2]+(to[2]-from[2])*t;
  if(Math.abs(wx)>limits[0]||Math.abs(wz)>limits[1])continue;
  let shade=base,edge=false;
  for(const patch of patches){
   const l=patch.x-patch.w/2,rr=patch.x+patch.w/2,top=patch.z-patch.d/2,b=patch.z+patch.d/2;
   if(Math.min(Math.abs(wx-l),Math.abs(wx-rr),Math.abs(wz-top),Math.abs(wz-b))<.26)edge=true;
   if(wx>l&&wx<rr&&wz>top&&wz<b)shade=patch.shade;
  }
  if(shade===null||edge)continue;
  const expected=Math.round(shade*255),actual=pixels[(y*r.width+x)*4],err=Math.abs(expected-actual);
  total++;bad+=err>4?1:0;maxError=Math.max(maxError,err);expectedSum+=expected;actualSum+=actual;
 }
 return {total,bad,maxError,error:g.getError(),near:a.camera.near||.08,far:a.camera.far||600,matrix:Array.from(r.lastLightVP)};
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  for label,path in [('baseline',ROOT/'fixtures/v51-before-depth-fix.html'),('fixed',ROOT/'index.html')]:
   page=load(browser,path);results[label]={}
   for scene in [7,9]:
    frames=[]
    # Twelve view directions x three zooms. Includes both zooms from screenshots.
    for yaw_index in range(12):
     for zoom,pitch in [(.55,.46),(1.17,.78),(1.63,1.14)]:
      c=dict(scene=scene,yaw=yaw_index*math.tau/12+.04,pitch=pitch,zoom=zoom)
      frames.append(dict(config=c,**page.evaluate(PROBE,c)))
    total=sum(f['total'] for f in frames);bad=sum(f['bad'] for f in frames)
    results[label][str(scene)]=dict(frames=frames,totalSamples=total,badSamples=bad,badFraction=bad/max(total,1))
    if label=='baseline':record(f'Negative control: original scene {scene} reproduces incorrect ground pixels with shadows OFF',bad>50,dict(frames=len(frames),total=total,bad=bad))
    else:
     record(f'Scene {scene}: ground materials correct through 36 orbit/zoom views',bad==0 and total>5000,dict(frames=len(frames),total=total,bad=bad,maxError=max(f['maxError'] for f in frames)))
     record(f'Scene {scene}: camera movement does not change directional shadow matrix',all(f['matrix']==frames[0]['matrix'] for f in frames))
     record(f'Scene {scene}: all 36 diagnostic draws are GL-error-free',all(f['error']==0 for f in frames))
   page.close()
  page=load(browser,ROOT/'index.html')
  for scene in [7,9]:
   data=page.evaluate(r'''i=>{const s=__NOIR__.createWorld(i),f=s.floorLayout,c=f.cells;let overlap=0,area=0,holes=0;for(let i=0;i<c.length;i++){
    const a=c[i];area+=(a.r-a.l)*(a.b-a.t);if(a.shade===null)holes+=(a.r-a.l)*(a.b-a.t);
    for(let j=i+1;j<c.length;j++){const b=c[j];if(Math.min(a.r,b.r)-Math.max(a.l,b.l)>1e-8&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>1e-8)overlap++;}
   }
   const shell=s.customMeshes.floorShell;let topTriangles=0;for(let i=0;i<shell.ix.length;i+=3)if(shell.n[shell.ix[i]*3+1]>.5)topTriangles++;
   const caps=Object.entries(s.customMeshes).filter(([k])=>k.startsWith('floor-cap-')).map(([k,v])=>v);
   return {overlap,area,expectedArea:f.width*f.depth,holes,topTriangles,allCapsLevel:caps.every(g=>g.p.every((v,k)=>k%3!==1||v===0)),cells:c.length,walkHeight:s.height(0,1.2)};
   }''',scene)
   record(f'Scene {scene}: cap partition has no overlap or gaps; structural slab has no duplicate top',data['overlap']==0 and abs(data['area']-data['expectedArea'])<1e-6 and data['topTriangles']==0 and data['allCapsLevel'] and data['walkHeight']==0,data)
  data=page.evaluate('''()=>{const r=noirApp.renderer,g=r.gl,s=[r.main,r.post].flatMap(p=>g.getAttachedShaders(p).map(s=>g.getShaderSource(s))).join('\\n');return {shadow:/uniform highp sampler2D uShadow/.test(s),post:/uniform highp sampler2D uColor,uDepth,uShadow/.test(s),blurDefault:r.msaaSamples};}''')
  record('Depth textures explicitly use highp samplers in surface and atmosphere programs',data['shadow'] and data['post'],data)
  # True full-scene render, no substitutions. Two projections x near/far rotation.
  matrices=[];count=0;glErrors=[]
  for scene in [7,9]:
   for projection in ['perspective','orthographic']:
    for j in range(24):
     data=page.evaluate('''c=>{const a=noirApp;if(a.scene.id!==c.scene){a.loadScene(c.scene,false);a.setPaused(true);}a.cameraRig.projection=c.projection;a.cameraRig.yaw=c.yaw;a.cameraRig.pitch=c.pitch;a.settings.zoom=c.zoom;a.focused=false;a.cameraMode='fixed';a.focusPoint=null;a.draw();return {error:a.renderer.gl.getError(),matrix:Array.from(a.renderer.lastLightVP),near:a.camera.near,far:a.camera.far};}''',dict(scene=scene,projection=projection,yaw=j*math.tau/24,pitch=.3+j%4*.3,zoom=[.35,1,1.17,1.63,3,8][j%6]))
     glErrors.append(data['error']);count+=1
  record('96 full-scene views: wide/close zoom and 360° orbit in BOTH 3D projections',not any(glErrors),dict(frames=count,zoomRange=[.35,8]))
  # Negative reference: temporarily suppress only the shadow draw, then restore.
  data=page.evaluate('''()=>{const a=noirApp,r=a.renderer,g=r.gl;a.loadScene(9,false);a.setPaused(true);a.cameraRig.frameAll();a.draw();const before=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,before);const original=r.draw;r.draw=function(objects,p,depth){if(depth)return;return original.call(this,objects,p,depth);};a.draw();const after=new Uint8Array(before.length);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,after);r.draw=original;a.draw();let darkened=0;for(let i=0;i<before.length;i+=4)if(after[i]-before[i]>20)darkened++;return {darkened,error:g.getError()};}''')
  record('Final renderer still casts real building/person shadows; not a shadows-off workaround',data['darkened']>500 and data['error']==0,data)
  # Revisit same pose and camera while stopped: no temporal noise or resampling.
  data=page.evaluate('''()=>{const a=noirApp,r=a.renderer,g=r.gl;a.setPaused(true);let hashes=[];for(let t=0;t<4;t++){a.draw();const px=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,px);let h=2166136261;for(const v of px){h^=v;h=Math.imul(h,16777619);}hashes.push(h>>>0);}return hashes;}''')
  record('Repeated frozen render is byte-identical (no added dithering or random jitter)',len(set(data))==1,data)
  record('No uncaught JavaScript errors in regression or negative control',not errors,errors)
 except Exception as e:
  traceback.print_exc();record('Harness completed',False,str(e))
 finally:browser.close()
results['checks']=checks
(OUT/'depth-stability-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('TOTAL',sum(x['passed'] for x in checks),'passed',sum(not x['passed'] for x in checks),'failed',flush=True)
raise SystemExit(any(not c['passed'] for c in checks))
