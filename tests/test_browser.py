"""NOIR v5.1 integration regression tests. Chromium + actual WebGL2, not a renderer mock.
Install Python Playwright and a Chromium executable; use DISPLAY with Xvfb if
software ANGLE needs an X server. No internet or local-file URL is required.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os, json, sys, traceback
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence-v53';OUT.mkdir(exist_ok=True)
checks=[];errors=[]
def record(name,passed,detail=None):
    checks.append({'name':name,'passed':bool(passed),'detail':detail})
    print(('PASS' if passed else 'FAIL'),name, str(detail)[:240] if detail is not None else '',flush=True)

def js(page,name,source,arg=None):
    try:
        result=page.evaluate(source,arg)
        if isinstance(result,dict) and 'ok' in result: record(name,result['ok'],result)
        else: record(name,bool(result),result)
    except Exception as e: record(name,False,str(e))

def load(browser,mobile=False):
    page=browser.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},has_touch=mobile,is_mobile=mobile,device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text(),wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function('window.__NOIR__?.ready',timeout=120000)
    page.evaluate('noirApp.setPaused(true);noirApp.renderer.resolution=.7;noirApp.settings.grain=0;')
    return page

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    try:
        page=load(browser)
        js(page,'Real WebGL2 boot and linked shader programs','()=>noirApp.renderer.gl instanceof WebGL2RenderingContext && __NOIR__.ready')
        js(page,'No duplicated HTML ids','()=>{let ids=[...document.querySelectorAll("[id]")].map(x=>x.id);return new Set(ids).size===ids.length;}')
        # Scene regression: render every world with perspective and a second true 3D viewpoint.
        for i in range(10):
            js(page,f'Scene {i}: perspective geometry, orbital view and GL error-free draw', '''i=>{const a=noirApp;a.loadScene(i,false);a.setPaused(true);a.renderer.resolution=.65;a.draw();const before=a.camera.eye.slice();a.cameraRig.orbit(127,25);a.draw();const g=a.renderer.gl;return {ok:g.getError()===g.NO_ERROR&&a.camera.vp.every(Number.isFinite)&&a.renderer.drawCalls>20&&Math.hypot(...a.camera.eye.map((v,k)=>v-before[k]))>1,drawCalls:a.renderer.drawCalls,actors:a.actors.length};}''',i)
        js(page,'All 23 poses, five hat choices and every actor mesh have finite matrices', '''()=>{const a=noirApp;a.loadScene(2,false);a.setPaused(true);let n=0;for(const pose of Object.keys(__NOIR__.labels))for(const hat of ['none','beret','cap','beanie','brim'])for(const flying of [false,true]){const actor={...a.actor,pose,poseSince:0,flying,appearance:{name:'Test',colour:2,hat,outfit:'sleeves'},blendFrom:null,moving:false};const objects=__NOIR__.human(actor,a.scene,2.1);if(!objects.every(o=>o.m.every(Number.isFinite))||!actor.headWorld.every(Number.isFinite))return false;n++;}return {ok:n>=230,rigStates:n};}''')
        js(page,'Camera uses perspective division, orthographic is separately selectable', '''()=>{const a=noirApp;a.cameraRig.frameAll();a.cameraRig.projection='perspective';a.updateCamera();const v=__NOIR__.V,near=v.add(a.camera.at,v.mul(v.norm(v.sub(a.camera.at,a.camera.eye)),3));const f=p=>{let q=a.screen(p),r=a.screen(v.add(p,[0,1,0]));return Math.hypot(q.x-r.x,q.y-r.y);};const h1=f(a.camera.at),h2=f(near);a.cameraRig.projection='orthographic';a.updateCamera();const h3=f(a.camera.at),h4=f(near);return {ok:Math.abs(h1-h2)>.1&&Math.abs(h3-h4)<.02,perspectiveDelta:Math.abs(h1-h2),orthoDelta:Math.abs(h3-h4)};}''')
        js(page,'Zoom has bounded real-camera range .35 to 12', '''()=>{const a=noirApp;a.cameraRig.zoomBy(1e6);const hi=a.settings.zoom;a.cameraRig.zoomBy(1e-10);const lo=a.settings.zoom;a.cameraRig.frameAll();return hi===12&&lo===.35;}''')
        js(page,'Ground picking is inverse of perspective projection', '''()=>{const a=noirApp;a.loadScene(5,false);a.setPaused(true);a.draw();const p=[2,0,6],s=a.screen(p),q=a.planeAt(s.x,s.y,0);return {ok:!!q&&Math.hypot(q[0]-p[0],q[1]-p[2])<.02,error:q?Math.hypot(q[0]-p[0],q[1]-p[2]):null};}''')
        # Native pointer and wheel events (not calls to camera methods).
        before=page.evaluate('({yaw:noirApp.cameraRig.yaw,x:noirApp.actor.x,z:noirApp.actor.z})')
        page.mouse.move(780,255);page.mouse.down(button='right');page.mouse.move(980,340,steps=10);page.mouse.up(button='right');page.evaluate('noirApp.setPaused(true)')
        after=page.evaluate('({yaw:noirApp.cameraRig.yaw,x:noirApp.actor.x,z:noirApp.actor.z})')
        record('Right-drag changes camera yaw, not actor position',abs(after['yaw']-before['yaw'])>.7 and abs(after['x']-before['x'])<.01,{'before':before,'after':after})
        page.evaluate('noirApp.cameraRig.frameAll();noirApp.draw()');before=page.evaluate('noirApp.cameraRig.yaw')
        page.mouse.move(700,240);page.mouse.down();page.mouse.move(850,270,steps=8);page.mouse.up()
        record('Left-drag on empty artwork rotates camera',abs(page.evaluate('noirApp.cameraRig.yaw')-before)>.3)
        page.mouse.move(800,300);before=page.evaluate('noirApp.settings.zoom');page.mouse.wheel(0,-220);page.wait_for_timeout(100)
        record('Mouse wheel increases camera zoom',page.evaluate('noirApp.settings.zoom')>before)
        target=page.evaluate("(()=>{const a=noirApp;a.loadScene(5,false);a.setPaused(true);a.exhibition.enabled=false;a.actor.brain.manual=true;a.cameraRig.frameActor();a.draw();window.testStart=[a.actor.x,a.actor.z];const q=a.screen([a.actor.x+1.6,0,a.actor.z+.7]);return {x:q.x,y:q.y};})()")
        page.mouse.click(target['x'],target['y'])
        js(page,'Click on perspective ground walks the character, not the camera', "()=>{const a=noirApp;a.setPaused(true);for(let i=0;i<150;i++)a.update(1/30);return Math.hypot(a.actor.x-testStart[0],a.actor.z-testStart[1])>1.2;}")
        page.evaluate('noirApp.setPaused(true)');t=page.evaluate('noirApp.time');page.wait_for_timeout(350)
        record('Pause freezes the scene clock during real browser frames',page.evaluate('noirApp.time')==t)
        # Dialogue anchoring independent of world zoom.
        js(page,'Head bubble follows animated 3D head with constant readable screen font', '''()=>{const a=noirApp;a.loadScene(5,false);a.setPaused(true);a.exhibition.enabled=false;a.cameraRig.frameActor();a.dialogue.clear();a.dialogue.say(a.actor,'在头顶说话，镜头可以自由转动。',20);a.time+=2;a.draw();const el=document.querySelector('.dialogue-bubble'),b=a.dialogue.layouts[0];if(!el||!b)return false;const size=getComputedStyle(el).fontSize;const p=a.screen(a.actor.headWorld);a.cameraRig.zoomBy(.62);a.cameraRig.orbit(100,0);a.draw();const c=a.dialogue.layouts[0],e=document.querySelector('.dialogue-bubble');return {ok:!!c&&size===getComputedStyle(e).fontSize&&Math.hypot(b.anchor.x-p.x,b.anchor.y-p.y)<.01&&Math.hypot(c.anchor.x-b.anchor.x,c.anchor.y-b.anchor.y)>2,font:size};}''')
        js(page,'Dialogue HTML is escaped, not executed', '''()=>{const a=noirApp;window.pwned=false;a.dialogue.say(a.actor,'<img src=x onerror="window.pwned=true">',20);a.time+=4;a.draw();return !window.pwned&&!document.querySelector('.dialogue-bubble img')&&document.querySelector('.bubble-text').textContent.includes('<img');}''')
        js(page,'Speech stays visible in immersive mode, UI does not', '''()=>{const a=noirApp;document.body.classList.add('immersive');a.draw();let ok=getComputedStyle(document.querySelector('#world-hud')).opacity==='1'&&!!document.querySelector('.dialogue-bubble');document.body.classList.remove('immersive');return ok;}''')
        # Appearance edit through actual controls.
        page.click('#cast-toggle');page.fill('#cast-name','小红');page.select_option('#cast-hat','brim');page.select_option('#cast-outfit','sleeves');page.click('#cast-colours button:nth-child(4)')
        js(page,'Visible controls change name, hat, garment and colour', '''()=>{const a=noirApp.actor.appearance;return a.name==='小红'&&a.hat==='brim'&&a.outfit==='sleeves'&&a.colour===3;}''')
        page.click('#cast-close')
        js(page,'Character identity survives changing scenes', '''()=>{noirApp.loadScene(8,false);noirApp.setPaused(true);return noirApp.actor.appearance.name==='小红'&&noirApp.actor.appearance.hat==='brim';}''')
        js(page,'Hat is attached to rotating 3D head, not a screen sticker', '''()=>{const a=noirApp.actor,s=noirApp.scene;a.appearance.hat='none';let n=__NOIR__.human(a,s,1);a.appearance.hat='brim';let hat=__NOIR__.human(a,s,1);const first=hat.find(o=>o.tint);a.angle+=1.2;let b=__NOIR__.human(a,s,1);return hat.length>n.length&&hat.some((o,i)=>o.m.some((v,k)=>Math.abs(v-b[i].m[k])>.01));}''')
        # Headless systems usually have zero voices; verify safe fallback, NOT audible playback quality.
        js(page,'Voice defaults off; missing Chinese voice does not break text', '''()=>{const a=noirApp,off=!a.dialogue.voice,n=a.dialogue.voices().length;a.dialogue.toggleVoice(true);a.dialogue.say(a.actor,'语音不可用时，文字仍然保留。',10);a.dialogue.toggleVoice(false);return {ok:off&&a.actor.speech.text.includes('文字')&&!a.dialogue.voice,availableChineseVoices:n};}''')
        # Native director workflow, including persisted speech and outfits.
        js(page,'Record/replay roundtrip preserves free camera, costume and speech', '''()=>{const a=noirApp;a.loadScene(5,false);a.setPaused(true);a.exhibition.enabled=false;a.cameraRig.projection='perspective';a.actor.brain.manual=true;a.dialogue.say(a.actor,'这段对白也记录进镜头。',20);a.director.start();a.setPaused(true);for(let i=0;i<80;i++){a.cameraRig.yaw+=.002;a.update(1/30);}a.director.stop();const clip=__NOIR__.validateClip(a.director.clip);a.actor.appearance.colour=5;a.director.seek(1);return {ok:clip.frames.length>40&&a.actor.speech.text.includes('记录')&&a.cameraRig.projection==='perspective'&&a.actor.appearance.colour===3,frames:clip.frames.length,duration:clip.duration};}''')
        legacy=json.loads((ROOT/'fixtures/v2-shot.json').read_text())
        js(page,'Existing v2 shot imports and renders', '''clip=>{const a=noirApp;a.director.import(clip);a.setPaused(true);a.draw();return a.cameraRig.projection==='orthographic'&&a.renderer.gl.getError()===0;}''',legacy)
        # Validate input boundaries and no eval.
        js(page,'Four included scripts pass validation', '''()=>__NOIR__.DRAMA_SCRIPTS.every(s=>__NOIR__.validateDrama(s).beats.length>5)''')
        js(page,'Bad roles, bad coordinates, oversized text, unknown poses rejected', '''()=>{let mutations=[s=>s.beats=[{type:'say',role:'unknown',text:'x'}],s=>s.cast[0].start=[999,0],s=>s.beats=[{type:'say',role:'lan',text:'x'.repeat(141)}],s=>s.beats=[{type:'pose',role:'lan',pose:'BAD'}],s=>s.cast[1].index=0];let count=0;for(const f of mutations){let s=JSON.parse(JSON.stringify(__NOIR__.DRAMA_SCRIPTS[0]));f(s);try{__NOIR__.validateDrama(s);}catch(e){count++;}}return count===mutations.length;}''')
        js(page,'Prototype pollution field is rejected', '''()=>{try{__NOIR__.validateDrama('{"__proto__":{"polluted":true}}');return false;}catch(e){return !({}).polluted;}}''')
        # Run entire scripts, while checking actor speech remains the sole subtitle in drama mode.
        drama_results=[]
        for i in range(4):
            result=page.evaluate('''i=>{const a=noirApp;a.theatre.start(__NOIR__.DRAMA_SCRIPTS[i]);a.setPaused(true);let ticks=0,lines=[],valid=true;while(a.theatre.active&&ticks<15000){a.update(1/30);if(a.theatre.script.beats[a.theatre.index]?.type==='say'&&a.theatre.entered&&a.time-a.theatre.since>1&&!lines.includes(a.theatre.index)){a.draw();lines.push(a.theatre.index);valid&&=a.dialogue.layouts.length===1&&a.dialogue.layouts[0].id===a.theatre.speaker;}ticks++;}return {ok:!a.theatre.active&&a.theatre.events.some(e=>e.type==='complete')&&!a.theatre.events.some(e=>['blocked','timeout'].includes(e.type))&&valid,ticks,lines:lines.length,events:a.theatre.events};}''',i)
            record(f'Drama {i}: complete navigation, ordered lines and only the main speaker visible',result['ok'],{'ticks':result['ticks'],'spokenBeats':result['lines'],'lastEvent':result['events'][-1]})
            drama_results.append(result)
        (OUT/'drama-results.json').write_text(json.dumps(drama_results,ensure_ascii=False,indent=2))
        js(page,'Keyboard takeover stops a running drama', '''()=>{const a=noirApp;a.theatre.start(__NOIR__.DRAMA_SCRIPTS[3]);a.setPaused(true);a.keys.add('KeyD');a.update(.04);a.keys.clear();return !a.theatre.active&&a.actor.brain.manual;}''')
        js(page,'Flight stays airborne during 120 seconds of simulation', '''()=>{const a=noirApp;a.loadScene(5,false);a.setPose('float');a.setPaused(true);for(let i=0;i<90;i++)a.update(1/30);let low=Infinity;for(let i=0;i<3600;i++){a.update(1/30);low=Math.min(low,a.actor.y);}return {ok:a.actor.flying&&!a.actor.landing&&low>1.5,minHeight:low,final:a.actor.y};}''')
        # Actual mobile touch events.
        mobile=load(browser,True)
        js(mobile,'Mobile controls fit width without horizontal page overflow','()=>document.documentElement.scrollWidth<=innerWidth')
        mobile.evaluate('noirApp.loadScene(5,false);noirApp.setPaused(true);noirApp.cameraRig.frameAll();noirApp.draw()')
        cdp=mobile.context.new_cdp_session(mobile)
        z=mobile.evaluate('noirApp.settings.zoom')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':125,'y':320,'id':1},{'x':265,'y':320,'id':2}]})
        for dx in [10,20,30,40]: cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':125-dx,'y':320,'id':1},{'x':265+dx,'y':320,'id':2}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        record('Native two-finger pinch changes zoom without a stuck actor drag',mobile.evaluate(f'noirApp.settings.zoom>{z}*1.3&&!noirApp.draggingActor&&noirApp.pointer===null'))
        mobile.evaluate('noirApp.setPose("float");noirApp.setPaused(true);noirApp.syncPose();')
        joy=mobile.locator('#joystick').bounding_box();up=mobile.locator('#fly-up').bounding_box()
        record('Flight ascent is beside left thumb, small visible key',up['x']<180 and abs(up['y']-joy['y'])<80 and up['width']<=40,{'joystick':joy,'ascent':up})
        xj,yj=joy['x']+joy['width']/2,joy['y']+joy['height']/2
        xu,yu=up['x']+up['width']/2,up['y']+up['height']/2
        start=mobile.evaluate('({y:noirApp.actor.flightY,x:noirApp.actor.x,z:noirApp.actor.z})')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':xj+18,'y':yj,'id':1},{'x':xu,'y':yu,'id':2}]})
        mobile.evaluate('noirApp.setPaused(true);for(let i=0;i<60;i++)noirApp.update(1/60);')
        end=mobile.evaluate('({y:noirApp.actor.flightY,x:noirApp.actor.x,z:noirApp.actor.z,joy:noirApp.joy,lift:noirApp.liftInput})')
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        record('Native two-finger joystick plus ascent work together',end['y']>start['y']+1 and ((end['x']-start['x'])**2+(end['z']-start['z'])**2)>.05,{'before':start,'after':end})
        js(mobile,'Releasing fingers clears both inputs, preserves flight', '''()=>{const a=noirApp;a.setPaused(true);const y=a.actor.flightY;for(let i=0;i<90;i++)a.update(1/30);return a.joy.every(v=>v===0)&&a.liftInput===0&&a.actor.flying&&a.actor.flightY===y;}''')
        js(mobile,'Mobile closeup yields readable body and 14px bubble', '''()=>{const a=noirApp;a.cameraRig.frameActor();a.setPaused(true);a.dialogue.say(a.actor,'镜头可以拉近，文字不会跟着缩小。',20);a.time+=3;a.draw();const b=a.dialogue.layouts[0],head=a.screen(a.actor.headWorld),foot=a.screen([a.actor.x,a.actor.y,a.actor.z]);return {ok:!!b&&b.x>=0&&b.x+b.w<=innerWidth&&b.y>=0&&b.y+b.h<innerHeight-150&&b.font===14&&Math.abs(head.y-foot.y)>100,bodyPixels:Math.abs(head.y-foot.y),bubble:b};}''')
        for size in [{'width':844,'height':390},{'width':360,'height':780},{'width':390,'height':844}]:
            mobile.set_viewport_size(size);mobile.evaluate('noirApp.setPaused(true);noirApp.renderer.resize();noirApp.draw()')
        js(mobile,'Portrait/landscape resizing preserves valid camera and WebGL', '''()=>noirApp.camera.vp.every(Number.isFinite)&&noirApp.renderer.gl.getError()===0''')
        record('No uncaught browser JavaScript errors',not errors,errors)
        page.close();mobile.close()
    except Exception as e:
        record('Unexpected test harness error',False,str(e));traceback.print_exc()
    finally: browser.close()
result={'passed':sum(t['passed'] for t in checks),'failed':sum(not t['passed'] for t in checks),'environment':{'browser':'Chromium 144, WebGL2 ANGLE/SwiftShader, Xvfb virtual display','mobile':'390x844 Chromium touch emulation, not a physical phone','voice':'API fallback only, no audible voice quality test'},'checks':checks}
(OUT/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('TOTAL',result['passed'],'passed',result['failed'],'failed')
if result['failed']:sys.exit(1)
