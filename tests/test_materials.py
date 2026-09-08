"""5.3 material/colour integration. Real GL, UI, offline, persistence and replay.
Run: xvfb-run -a python tests/test_materials.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,math,os,traceback,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence-v53';OUT.mkdir(exist_ok=True)
checks=[];errors=[]
def rec(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS' if ok else 'FAIL'),name,str(detail)[:400],flush=True)
def js(page,name,code,arg=None):
 try:
  r=page.evaluate(code,arg);rec(name,r.get('ok',False) if isinstance(r,dict) else bool(r),r)
 except Exception as e:rec(name,False,str(e))
def load(browser,mobile=False,storage=None,blocked_storage=False):
 context=browser.new_context(viewport={'width':390 if mobile else 760,'height':844 if mobile else 620},device_scale_factor=1,has_touch=mobile,is_mobile=mobile)
 context.route('**/*',lambda r:r.abort())
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 # Navigation is blocked by managed browser policy. Do not alter that policy.
 # In-memory document is offline; explicit Storage adapter tests only our API contract.
 if storage is not None:
  page.evaluate("data=>{window.__testStore={...data};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return window.__testStore[k]??null},setItem(k,v){window.__testStore[k]=String(v)},removeItem(k){delete window.__testStore[k]},clear(){window.__testStore={}}}})}",storage)
 if blocked_storage:page.evaluate("Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}})")
 page.set_content((ROOT/'index.html').read_text(),wait_until='domcontentloaded',timeout=120000)
 page.wait_for_function('window.__NOIR__?.ready',timeout=120000)
 page.evaluate('noirApp.setPaused(true);noirApp.renderer.resolution=.6;noirApp.draw();')
 return page
PIXELS=r'''()=>{const a=noirApp,r=a.renderer,g=r.gl;a.draw();const px=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,px);let hash=2166136261,colour=0;for(let i=0;i<px.length;i++){hash^=px[i];hash=Math.imul(hash,16777619);}for(let i=0;i<px.length;i+=4)if(Math.max(px[i],px[i+1],px[i+2])-Math.min(px[i],px[i+1],px[i+2])>3)colour++;return {hash:hash>>>0,colour,error:g.getError()};}'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 try:
  page=load(b)
  js(page,'Fresh profile defaults to colour; film grain and fog still default OFF',"()=>noirApp.look.mode==='color'&&noirApp.look.texture===.58&&noirApp.settings.grain===0&&noirApp.settings.haze===0")
  js(page,'Eight actual raster texture layers; complete nine-level mip chain and linear filtering',r'''()=>{const r=noirApp.renderer,g=r.gl,t=r.materialTextures;g.bindTexture(g.TEXTURE_2D_ARRAY,t.texture);const min=g.getTexParameter(g.TEXTURE_2D_ARRAY,g.TEXTURE_MIN_FILTER),wrap=g.getTexParameter(g.TEXTURE_2D_ARRAY,g.TEXTURE_WRAP_S);return {ok:t.layers===8&&t.mipLevels===9&&t.pixels.length===256*256*8*4&&min===g.LINEAR_MIPMAP_LINEAR&&wrap===g.REPEAT&&g.getError()===0,layers:t.layers,size:t.size,mipLevels:t.mipLevels,anisotropy:t.anisotropy,bytes:t.bytes};}''')
  js(page,'Texture layers contain different real values (not eight copies of a flat tint)',r'''()=>{const t=noirApp.renderer.materialTextures;let stats=[];for(let l=0;l<8;l++){let lo=255,hi=0,h=2166136261;for(let i=l*256*256*4;i<(l+1)*256*256*4;i+=4){lo=Math.min(lo,t.pixels[i]);hi=Math.max(hi,t.pixels[i]);h=Math.imul(h^t.pixels[i],16777619);}stats.push({lo,hi,hash:h>>>0});}return {ok:stats.every(s=>s.hi-s.lo>8)&&new Set(stats.map(s=>s.hash)).size===8,stats};}''')
  js(page,'Wall, floor, wood, metal, books and plant batches keep distinct material identities',"()=>{const names=[...new Set(noirApp.scene.objects.map(o=>o.finish))];return {ok:['stone','wood','plaster','metal','book','leaf'].every(s=>names.includes(s)),names};}")
  page.evaluate("window.stateBefore=JSON.stringify({actors:noirApp.snapshot().actors,camera:noirApp.cameraRig.state(),scene:noirApp.scene.id,settings:noirApp.settings,time:noirApp.time});window.geoBefore=noirApp.scene.objects;noirApp.setPaused(true);")
  page.click('#look-mode-mono');page.click('#look-mode-color')
  js(page,'Visible mode buttons preserve actor state, camera, timeline, settings and identical geometry array',"()=>({ok:window.stateBefore===JSON.stringify({actors:noirApp.snapshot().actors,camera:noirApp.cameraRig.state(),scene:noirApp.scene.id,settings:noirApp.settings,time:noirApp.time})&&window.geoBefore===noirApp.scene.objects&&document.getElementById('look-mode-color').getAttribute('aria-pressed')==='true'})")
  colour=page.evaluate(PIXELS);page.click('#look-mode-mono');mono=page.evaluate(PIXELS);page.click('#look-mode-color');again=page.evaluate(PIXELS)
  rec('Colour changes actual WebGL pixels; colour → mono → colour roundtrip is byte-identical',colour['hash']!=mono['hash'] and colour['hash']==again['hash'] and colour['colour']>2000,dict(color=colour,mono=mono,again=again))
  page.evaluate('noirApp.setLook({mode:"mono",keepAccents:false},false)')
  strict=page.evaluate(PIXELS);rec('Strict monochrome checkbox also removes character and prop colour',strict['colour']==0,strict)
  page.evaluate('noirApp.setLook({mode:"color",keepAccents:true},false)');page.click('#look-toggle')
  js(page,'Colour panel opens and has unique, labelled UI controls',"()=>{const all=[...document.querySelectorAll('[id]')].map(x=>x.id);return !document.getElementById('look-panel').hidden&&new Set(all).size===all.length&&document.getElementById('look-texture').getAttribute('aria-label')==='纹理强度';}")
  hashes=[]
  for preset in ['natural','warm','jade']:
   page.click('[data-look-preset="'+preset+'"]');hashes.append(page.evaluate(PIXELS)['hash'])
  rec('All three visible palette presets give different rendered colour',len(set(hashes))==3,hashes)
  js(page,'Custom wood picker alters wood colour without recolouring walls or moving geometry',r'''()=>{const a=noirApp,before=a.look.colours.wall,wood=a.look.colours.wood;const e=document.getElementById('look-colour-wood');e.value='#c6a075';e.dispatchEvent(new Event('input',{bubbles:true}));return a.look.colours.wood==='#c6a075'&&a.look.colours.wall===before&&a.look.colours.wood!==wood&&a.scene.objects===window.geoBefore;}''')
  page.evaluate('noirApp.setLook({texture:0},false)');flat=page.evaluate(PIXELS);page.evaluate('noirApp.setLook({texture:1},false)');textured=page.evaluate(PIXELS)
  rec('Texture-strength zero really disables surface texture sampling effect',flat['hash']!=textured['hash'] and flat['error']==textured['error']==0,dict(flat=flat,textured=textured))
  js(page,'Saturation control affects environment only; untextured props retain role colours',r'''()=>{const a=noirApp,r=a.renderer,g=r.gl;a.look.saturation=0;r.render(a.scene.objects,a.camera,a.scene,a.settings,a.time,a.look);const px=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,px);let bad=0;for(let i=0;i<px.length;i+=4)if(Math.max(px[i],px[i+1],px[i+2])-Math.min(px[i],px[i+1],px[i+2])>3)bad++;return {ok:bad===0,bad};}''')
  # Texture time invariance and camera round trip on real full scene.
  page.evaluate('noirApp.setLook(__NOIR__.normalizeLook(),false);noirApp.setPaused(true)')
  repeated=[page.evaluate(PIXELS)['hash'] for _ in range(3)]
  rec('Frozen scene/material renders are byte-identical; no temporal material noise',len(set(repeated))==1,repeated)
  for i in range(10):
   data=page.evaluate(r'''i=>{const a=noirApp;a.loadScene(i,false);a.setPaused(true);a.renderer.resolution=.5;let errors=[],matrices=[];for(const mode of ['mono','color'])for(const z of [.55,1.17,3]){a.look={...a.look,mode};a.cameraRig.yaw+=.71;a.cameraRig.pitch=.44+(z===3?.46:0);a.settings.zoom=z;a.draw();errors.push(a.renderer.gl.getError());matrices.push(Array.from(a.renderer.lastLightVP));}return {ok:errors.every(e=>e===0)&&a.scene.objects.every(o=>!!o.finish)&&matrices.every(m=>JSON.stringify(m)===JSON.stringify(matrices[0])),frames:6,materials:[...new Set(a.scene.objects.map(o=>o.finish))]};}''',i)
   rec(f'Scene {i}: both modes at three zoom/orbit views; same shadow matrix and all material IDs',data['ok'],data)
  # Mip/derivative shader contract + single-surface architecture, not extra decals.
  js(page,'Fragment shader uses explicit derivative texture lookup, not a screen-space overlay',r'''()=>{const r=noirApp.renderer,g=r.gl,fs=g.getAttachedShaders(r.main).map(s=>g.getShaderSource(s)).join('\n');return fs.includes('textureGrad(uMaterials')&&fs.includes('dFdx(q)')&&fs.includes('uLocalMap>.5?vLocal:vP')&&!fs.includes('uGrain');}''')
  js(page,'Court and office partition still have no overlapping caps or duplicate slab top',r'''()=>{for(const id of [7,9]){const s=__NOIR__.createWorld(id),f=s.floorLayout;for(let i=0;i<f.cells.length;i++)for(let j=i+1;j<f.cells.length;j++){const a=f.cells[i],b=f.cells[j];if(Math.min(a.r,b.r)>Math.max(a.l,b.l)+1e-8&&Math.min(a.b,b.b)>Math.max(a.t,b.t)+1e-8)return false;}const shell=s.customMeshes.floorShell;if(shell.ix.some(i=>shell.n[i*3+1]>.5))return false;}return true;}''')
  # Switching in a running drama must not restart it or clear a speech bubble.
  js(page,'Mode switch during short play preserves speaker, speech, current beat and actors',r'''()=>{const a=noirApp;a.theatre.start(__NOIR__.DRAMA_SCRIPTS[0]);a.setPaused(true);for(let i=0;i<2600;i++){a.update(1/30);if(a.theatre.script.beats[a.theatre.index]?.type==='say'&&a.theatre.entered&&a.time-a.theatre.since>1.5)break;}a.draw();const index=a.theatre.index,text=a.dialogue.layouts.map(x=>x.text).join('|'),positions=a.actors.map(x=>[x.x,x.y,x.z]);a.setLook({mode:'mono'},false);a.setLook({mode:'color'},false);return {ok:a.theatre.index===index&&a.theatre.active&&text===a.dialogue.layouts.map(x=>x.text).join('|')&&JSON.stringify(positions)===JSON.stringify(a.actors.map(x=>[x.x,x.y,x.z])),index,text};}''')
  js(page,'Record and seek restores the palette, texture strength and material colours',r'''()=>{const a=noirApp;a.theatre.stop();a.loadScene(5,false);a.exhibition.enabled=false;a.actor.brain.manual=true;a.setLook({...__NOIR__.normalizeLook(),palette:'warm',texture:.71},false);const wanted=JSON.stringify(a.look);a.director.start();a.setPaused(true);for(let i=0;i<12;i++)a.update(1/30);a.director.stop();a.setLook({palette:'jade',texture:.2},false);a.director.seek(.2);return {ok:JSON.stringify(a.look)===wanted&&a.director.clip.frames.every(f=>!!f.look),look:a.look};}''')
  js(page,'Manual mode override remains selectable during recorded camera playback',r'''()=>{const a=noirApp;a.director.play();a.setPaused(true);a.setLook({mode:'mono'},false);a.director.apply(.22);const ok=a.look.mode==='mono';a.director.stopPlayback();return ok;}''')
  js(page,'Style validator rejects invalid format/colours; clamps finite sliders safely',r'''()=>{let good={schema:'noir-atlas-look/1',look:__NOIR__.normalizeLook()};const mutations=[x=>x.schema='bad',x=>x.look.colours.wood='javascript:foo',x=>x.look.mode='bad',x=>x.look.texture='oops'];let n=0;for(const mutate of mutations){const c=JSON.parse(JSON.stringify(good));mutate(c);try{__NOIR__.validateLook(c);}catch(_){n++;}}const x=__NOIR__.normalizeLook({texture:Infinity,saturation:9,gloss:-1,colours:{wall:'BAD'}});return n===4&&x.texture===.58&&x.saturation===1.5&&x.gloss===0&&x.colours.wall==='#ece9df';}''')
  # Storage API roundtrip, with explicitly injected adapter. Native file-origin
  # persistence remains device-specific and is NOT claimed as verified.
  page.close();host=load(b,storage={})
  host.evaluate('noirApp.setLook({mode:"mono",texture:.77,palette:"jade",colours:{wood:"#babbad"}})')
  expected=host.evaluate('JSON.stringify(noirApp.look)');stored=host.evaluate('window.__testStore');host.close();host=load(b,storage=stored)
  rec('Storage API contract: custom material settings restore on new app boot (injected adapter, not native disk persistence)',host.evaluate('JSON.stringify(noirApp.look)')==expected)
  with host.expect_download() as di:host.evaluate('document.getElementById("look-save").click()')
  download=di.value;dest=OUT/'downloaded-palette.json';download.save_as(dest)
  data=json.loads(dest.read_text());rec('Visible export action produces a valid palette JSON file',data.get('schema')=='noir-atlas-look/1' and data['look']['colours']['wood']=='#babbad')
  host.evaluate('noirApp.setLook({mode:"color",texture:.1})');host.locator('#look-file').set_input_files(str(dest));host.wait_for_timeout(50)
  rec('Actual file upload restores the exported look',host.evaluate('JSON.stringify(noirApp.look)')==expected)
  blocked=load(b,blocked_storage=True)
  js(blocked,'Blocked storage does not prevent boot, palette changes or rendering',"()=>{noirApp.setLook({mode:'mono'});return __NOIR__.ready&&noirApp.look.mode==='mono'&&noirApp.lookSaved===false&&noirApp.renderer.gl.getError()===0;}")
  blocked.close()
  # Resource independence: runtime is one in-memory HTML document; all requests blocked.
  js(host,'No external texture/model requests or dependency scripts',"()=>performance.getEntriesByType('resource').filter(x=>!x.name.startsWith('blob:')).length===0&&[...document.scripts].every(s=>!s.src)")
  host.close();mobile=load(b,True)
  for size in [{'width':390,'height':844},{'width':768,'height':900},{'width':844,'height':390}]:
   mobile.set_viewport_size(size);mobile.evaluate('noirApp.setPaused(true);noirApp.draw()');mobile.locator('#look-toggle').click()
   info=mobile.evaluate(r'''()=>{const p=document.getElementById('look-panel'),r=p.getBoundingClientRect(),ids=['look-mode-mono','look-mode-color','look-toggle'];return {ok:document.documentElement.scrollWidth<=innerWidth&&r.x>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5&&r.height>150&&ids.every(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el||el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),panel:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight]};}''')
   rec(f'Material menu fits and header buttons are reachable at {size["width"]}×{size["height"]}',info['ok'],info)
   mobile.locator('#look-close').click()
  mobile.set_viewport_size({'width':390,'height':844});mobile.locator('#look-mode-mono').tap();mobile.locator('#look-mode-color').tap()
  js(mobile,'Native mobile taps switch modes without leaving pointer/flight inputs stuck',"()=>noirApp.look.mode==='color'&&noirApp.pointer===null&&noirApp.liftInput===0&&noirApp.joy.every(x=>x===0)")
  mobile.locator('#look-toggle').tap();mobile.keyboard.press('Escape');js(mobile,'Escape closes the material panel and updates expanded state',"()=>document.getElementById('look-panel').hidden&&document.getElementById('look-toggle').getAttribute('aria-expanded')==='false'")
  rec('No uncaught browser exceptions in colour/material tests',not errors,errors)
 except Exception as e:traceback.print_exc();rec('Harness completed',False,str(e))
 finally:b.close()
result={'passed':sum(x['passed'] for x in checks),'failed':sum(not x['passed'] for x in checks),'checks':checks,'environment':'Chromium WebGL2 / ANGLE SwiftShader with Xvfb. Mobile is emulated, not physical Android hardware.'}
(OUT/'material-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('TOTAL',result['passed'],'passed',result['failed'],'failed',flush=True)
sys.exit(1 if result['failed'] else 0)
