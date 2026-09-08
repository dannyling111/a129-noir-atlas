"""Actual WebGL evidence; not generated artwork. Run with xvfb-run -a."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence-v53';OUT.mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':820},device_scale_factor=1)
 page.set_default_timeout(120000)
 page.set_content(html,wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__NOIR__?.ready',timeout=120000)
 page.evaluate("noirApp.setPaused(true);noirApp.renderer.resolution=1;noirApp.loadScene(9,false);noirApp.setPaused(true);noirApp.settings.zoom=.92;noirApp.exhibition.enabled=false;noirApp.dialogue.names=false;noirApp.draw();document.getElementById('hint').classList.remove('visible');")
 page.add_style_tag(content='#hint{display:none!important}')
 # Same viewport, actors, camera and time; only material mode changes.
 for mode in ['color','mono']:
  page.evaluate("mode=>{noirApp.setLook({mode},false);noirApp.setPaused(true);noirApp.draw();}",mode)
  page.screenshot(path=str(OUT/f'courtyard-{mode}.png'))
  print('captured',mode,flush=True)
 page.evaluate("noirApp.setLook({mode:'color'},false);noirApp.loadScene(7,false);noirApp.setPaused(true);noirApp.settings.zoom=1.10;noirApp.cameraRig.pitch=.74;noirApp.draw();")
 page.screenshot(path=str(OUT/'office-colour.png'));print('captured office',flush=True)
 # Source maps are real texture pixels retained by the GPU texture baker.
 data=page.evaluate('Array.from(noirApp.renderer.materialTextures.pixels)')
 (OUT/'texture-pixels.bin').write_bytes(bytes(data))
 page.close()
 mobile=b.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
 mobile.set_default_timeout(120000)
 mobile.set_content(html,wait_until='domcontentloaded',timeout=120000);mobile.wait_for_function('window.__NOIR__?.ready',timeout=120000)
 mobile.evaluate("noirApp.setPaused(true);noirApp.renderer.resolution=1;noirApp.loadScene(9,false);noirApp.setPaused(true);noirApp.settings.zoom=.85;noirApp.draw();document.getElementById('hint').classList.remove('visible');document.getElementById('look-toggle').click();")
 mobile.add_style_tag(content='#hint{display:none!important}')
 mobile.screenshot(path=str(OUT/'mobile-material-menu.png'));print('captured mobile menu',flush=True)
 b.close()
