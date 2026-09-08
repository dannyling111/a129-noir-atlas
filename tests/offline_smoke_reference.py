from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'index.html'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ctx=b.new_context(viewport={'width':1000,'height':850},offline=True)
 page=ctx.new_page();errors=[];network=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:network.append(r.url) if r.url.startswith(('https:','http:')) else None)
 page.set_content(path.read_text());page.wait_for_function('window.__NOIR__?.ready',timeout=25000)
 result=page.evaluate('''()=>{const a=noirApp;a.loadScene(9,false);a.setPaused(true);a.settings.zoom=1.63;a.cameraRig.orbit(80,40);a.draw();const gl=a.renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');return {version:__NOIR__.version,glError:gl.getError(),scene:a.scene.id,grain:a.settings.grain,haze:a.settings.haze,groundCells:a.scene.floorLayout.cells.length,brand:document.querySelector('.brand-sub').textContent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown'};}''')
 result.update(errors=errors,networkRequests=network,source=str(path),browser=b.version,loadMethod='set_content exact final HTML, network offline',fileUrlVerification='not attempted by this inline-only offline test')
 assert result['version']=='5.2.0' and result['glError']==0 and not errors and not network
 print(json.dumps(result,ensure_ascii=False,indent=2))
 (ROOT/'evidence-v52/offline-inline-repeat.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 b.close()
