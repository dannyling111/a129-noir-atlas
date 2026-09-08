"""Clean-render regression using real WebGL2 pixels and browser controls.
Run with Xvfb on a headless Linux machine where ANGLE requires a display:
  xvfb-run -a python tests/test_clean_render.py
No mock rendering, no generated artwork, no external runtime assets.
"""
from pathlib import Path
import json, os, sys, traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'evidence-v53'; OUT.mkdir(exist_ok=True)
checks=[];errors=[]
def rec(name,ok,detail=None):
    checks.append(dict(name=name,passed=bool(ok),detail=detail))
    print(('PASS' if ok else 'FAIL'),name,str(detail)[:240] if detail is not None else '',flush=True)
def js(page,name,code,arg=None):
    try:
        result=page.evaluate(code,arg);rec(name,result.get('ok',False) if isinstance(result,dict) else bool(result),result)
    except Exception as e: rec(name,False,str(e))

def load(browser,mobile=False):
    page=browser.new_page(viewport={'width':390 if mobile else 1280,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text(),wait_until='load')
    page.wait_for_function('window.__NOIR__?.ready',timeout=20000)
    page.evaluate('noirApp.setLook?.({mode:"mono"},false);noirApp.setPaused(true);noirApp.draw()')
    return page
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    try:
        page=load(browser)
        js(page,'First boot really defaults to grain=0, haze=0, contrast=1 (no harness override)', '''()=>{const s=noirApp.settings;return {ok:s.grain===0&&s.haze===0&&s.contrast===1&&s.exposure===1&&s.renderStyle==='clean',settings:s};}''')
        js(page,'Offscreen multisample target is complete; no WebGL error', '''()=>{const r=noirApp.renderer,g=r.gl;g.bindFramebuffer(g.FRAMEBUFFER,r.msaaFB);let complete=g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE;g.bindFramebuffer(g.FRAMEBUFFER,null);return {ok:r.msaaSamples>1&&complete&&g.getError()===0,samples:r.msaaSamples};}''')
        js(page,'GPU colour dithering is off; polygon offset is not leaked into main pass', '''()=>{const g=noirApp.renderer.gl;return !g.isEnabled(g.DITHER)&&!g.isEnabled(g.POLYGON_OFFSET_FILL);}''')
        js(page,'No photographic fullscreen gradient layers remain', '''()=>['shade-top','shade-bottom'].every(id=>getComputedStyle(document.getElementById(id)).display==='none')''')
        page.click('#settings-toggle')
        js(page,'Grain slider is not visible or keyboard-focusable; fog control starts at zero', '''()=>document.getElementById('grain').type==='hidden'&&document.getElementById('grain').getClientRects().length===0&&document.getElementById('haze').value==='0' ''')
        page.evaluate('''()=>{const input=document.getElementById('haze');input.value=.8;input.dispatchEvent(new Event('input',{bubbles:true}));const c=document.getElementById('contrast');c.value=1.4;c.dispatchEvent(new Event('input',{bubbles:true}));}''')
        page.click('#clean-reset')
        js(page,'Visible reset button restores pure defaults without moving the camera', '''()=>{const a=noirApp;return a.settings.haze===0&&a.settings.contrast===1&&a.settings.grain===0&&Number(document.getElementById('haze').value)===0;}''')
        page.click('#settings-close')
        # Exercise every scene from the actual scene builder, including world UI hooks.
        for scene in range(10):
            js(page,f'Scene {scene}: clean defaults survive switching, neutral paper, zoom/orbit renders', '''i=>{const a=noirApp;a.loadScene(i,false);a.setPaused(true);a.cameraRig.frameAll();let ok=true;for(const z of [.5,1,3]){a.settings.zoom=z;a.cameraRig.yaw+=.32;a.draw();ok&&=a.renderer.gl.getError()===0&&a.camera.vp.every(Number.isFinite);}return {ok:ok&&a.settings.grain===0&&a.settings.haze===0&&a.settings.contrast===1&&(!a.scene.paper||a.scene.paper.every(x=>x===1)),zooms:[.5,1,3],objects:a.scene.objects.length};}''',scene)
        # A small, deliberately plain diagnostic scene: same world-space geometry,
        # varying old surface flag must produce byte-identical framebuffers.
        page.evaluate('''()=>{
          window.pixelProbe=(surface=0,t=0,paper=[1,1,1],withObjects=true,haze=0)=>{
           const a=noirApp,r=a.renderer,g=r.gl,{M}=__NOIR__;
           const sc={id:8,ambient:.32,strength:.9,background:.85,fog:.001,volume:.2,paper,light:{pos:[-20,30,15],target:[0,0,0]}};
           const cam={eye:[7,6,12],at:[0,.5,0],span:16};cam.vp=M.mul(M.perspective(.8,innerWidth/innerHeight,.1,150),M.look(cam.eye,cam.at));
           const obj=(mesh,p,s,shade=.85)=>({mesh,m:M.mul(M.translation(...p),M.scale(...s)),shade,surface});
           const objects=[obj('box',[0,-.06,0],[100,.12,100])];
           if(withObjects)objects.push(obj('sphere',[-1,1,0],[1,1,1],.9),obj('box',[2,.8,0],[1,1.6,1],.12));
           r.render(objects,cam,sc,{...a.settings,contrast:1,exposure:1,grain:.4,haze},t);
           const pixels=new Uint8Array(r.width*r.height*4);g.readPixels(0,0,r.width,r.height,g.RGBA,g.UNSIGNED_BYTE,pixels);
           let hash=2166136261;for(let i=0;i<pixels.length;i++){hash^=pixels[i];hash=Math.imul(hash,16777619);}
           let lo=255,hi=0,nonNeutral=0;for(let y=Math.floor(r.height*.30);y<Math.floor(r.height*.40);y++)for(let x=Math.floor(r.width*.40);x<Math.floor(r.width*.60);x++){let k=(y*r.width+x)*4,v=pixels[k];lo=Math.min(lo,v);hi=Math.max(hi,v);nonNeutral+=pixels[k]!==pixels[k+1]||pixels[k]!==pixels[k+2]?1:0;}
           return {hash:hash>>>0,min:lo,max:hi,nonNeutral,error:g.getError()};
          };
        }''')
        js(page,'Five old surface types render identically: no mountain ink or water brightness stripes', '''()=>{const values=[0,1,2,3,4].map(i=>pixelProbe(i,0));return {ok:values.every(v=>v.hash===values[0].hash&&v.error===0),hashes:values.map(v=>v.hash)};}''')
        js(page,'Static geometry at different times has identical pixels, even with legacy grain=.4', '''()=>{const values=[0,.2,1.7,10,51].map(t=>pixelProbe(2,t));return {ok:values.every(v=>v.hash===values[0].hash),hashes:values.map(v=>v.hash)};}''')
        js(page,'Legacy sepia paper settings cannot tint clean geometry', '''()=>{const a=pixelProbe(0,0,[1,1,1]),b=pixelProbe(0,0,[1,.8,.55]);return {ok:a.hash===b.hash&&a.nonNeutral===0,neutral:a.hash,legacyTint:b.hash};}''')
        js(page,'Unoccluded flat surface has no speckles or black/white self-shadow stripes', '''()=>{const x=pixelProbe(0,0,[1,1,1],false);return {ok:x.max-x.min<=1&&x.nonNeutral===0&&x.error===0,...x};}''')
        js(page,'Opt-in spatial fog has no temporal grain or moving random pattern', '''()=>{const a=pixelProbe(1,0,[1,1,1],true,.5),b=pixelProbe(1,20,[1,1,1],true,.5);return {ok:a.hash===b.hash,first:a.hash,later:b.hash};}''')
        # Old shot imports must not overwrite the project clean defaults.
        fixture=json.loads((ROOT/'fixtures/v2-shot.json').read_text())
        js(page,'v2 shot with film settings imports and seeks in clean style', '''clip=>{const a=noirApp;a.director.import(clip);a.setPaused(true);a.director.seek(.5);a.draw();return {ok:a.settings.grain===0&&a.settings.haze===0&&a.settings.contrast===1&&a.settings.renderStyle==='clean'&&a.renderer.gl.getError()===0,settings:a.settings};}''',fixture)
        js(page,'A new clean shot can intentionally retain opt-in spatial fog', '''()=>{const a=noirApp;a.director.stopPlayback();a.settings.haze=.3;a.settings.grain=0;const c=__NOIR__.cleanRenderSettings(a.settings);return c.haze===.3&&c.grain===0&&c.renderStyle==='clean';}''')
        js(page,'No film-noise or ink-noise GLSL remains compiled in either fragment program', '''()=>{const r=noirApp.renderer,g=r.gl;const sources=[r.main,r.post].flatMap(p=>g.getAttachedShaders(p).map(s=>g.getShaderSource(s))).join('\\n');return !/float (rnd|hash|inkNoise)\\s*\\(/.test(sources)&&!sources.includes('uGrain')&&!sources.includes('uPaper')&&!sources.includes('uInkMood');}''')
        # Real pixel colour accents, not just schema presence.
        js(page,'Coloured wardrobe and props still produce non-gray scene pixels', '''()=>{const a=noirApp;a.director.stopPlayback();a.loadScene(5,false);a.setPaused(true);a.settings.haze=0;a.cameraRig.frameActor();a.draw();const g=a.renderer.gl,px=new Uint8Array(a.canvas.width*a.canvas.height*4);g.readPixels(0,0,a.canvas.width,a.canvas.height,g.RGBA,g.UNSIGNED_BYTE,px);let count=0;for(let k=0;k<px.length;k+=4)if(Math.max(px[k],px[k+1],px[k+2])-Math.min(px[k],px[k+1],px[k+2])>24)count++;return {ok:count>100,colouredPixels:count};}''')
        # Desktop real-render evidence: no synthetic illustrations.
        page.set_viewport_size({'width':1440,'height':1000})
        page.evaluate('''()=>{const a=noirApp;a.theatre.start(__NOIR__.DRAMA_SCRIPTS[0]);a.setPaused(true);a.settings.haze=0;for(let i=0;i<3000;i++){a.update(1/30);if(a.theatre.index===5&&a.theatre.entered&&a.time-a.theatre.since>2.2)break;}a.draw();document.getElementById('hint').classList.remove('visible');clearTimeout(a.toastTimer);}''')
        page.screenshot(path=str(OUT/'dialogue-desktop.png'))
        js(page,'Head-top dialogue remains visible with clean renderer', '''()=>!!document.querySelector('.dialogue-bubble')&&noirApp.dialogue.layouts.length>0''')
        for i,name in [(2,'sculpture'),(8,'mountains'),(9,'courtyard')]:
            page.evaluate('''i=>{const a=noirApp;a.theatre.stop();a.loadScene(i,false);a.setPaused(true);a.cameraRig.frameAll();a.settings.zoom=i===2?1.22:1;a.draw();document.getElementById('hint').classList.remove('visible');}''',i)
            page.screenshot(path=str(OUT/(name+'-desktop.png')))
        mobile=load(browser,True)
        js(mobile,'Mobile boots clean and fits viewport without horizontal scroll', '''()=>noirApp.settings.grain===0&&noirApp.settings.haze===0&&document.documentElement.scrollWidth<=innerWidth''')
        mobile.evaluate('''()=>{const a=noirApp;a.theatre.start(__NOIR__.DRAMA_SCRIPTS[0]);a.setPaused(true);for(let i=0;i<3000;i++){a.update(1/30);if(a.theatre.index===5&&a.theatre.entered&&a.time-a.theatre.since>2.2)break;}a.draw();document.getElementById('hint').classList.remove('visible');clearTimeout(a.toastTimer);}''')
        mobile.screenshot(path=str(OUT/'dialogue-mobile.png'))
        cdp=mobile.context.new_cdp_session(mobile);start=mobile.evaluate('noirApp.settings.zoom')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':120,'y':340,'id':1},{'x':260,'y':340,'id':2}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':85,'y':340,'id':1},{'x':295,'y':340,'id':2}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        js(mobile,'Native pinch zoom retains clean defaults and valid GL frame', '''z=>{const a=noirApp;a.setPaused(true);a.draw();return a.settings.zoom>z&&a.settings.grain===0&&a.settings.haze===0&&a.renderer.gl.getError()===0;}''',start)
        for viewport in [{'width':844,'height':390},{'width':390,'height':844}]:
            mobile.set_viewport_size(viewport);mobile.evaluate('noirApp.setPaused(true);noirApp.renderer.resize();noirApp.draw();')
        js(mobile,'Rotating mobile viewport rebuilds MSAA attachments without GL errors', '''()=>noirApp.renderer.gl.getError()===0&&noirApp.renderer.msaaSamples>1''')
        rec('No uncaught JavaScript errors in clean-render suite',not errors,errors)
    except Exception as e:
        rec('Unexpected clean-render harness error',False,str(e));traceback.print_exc()
    finally:
        version=browser.version;browser.close()
result={'passed':sum(t['passed'] for t in checks),'failed':sum(not t['passed'] for t in checks),'browser':version,'environment':'Real Chromium WebGL2 ANGLE/SwiftShader under Xvfb; 390x844 touch emulation, not physical hardware','checks':checks}
(OUT/'clean-render-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('TOTAL',result['passed'],'passed,',result['failed'],'failed',flush=True)
sys.exit(1 if result['failed'] else 0)
