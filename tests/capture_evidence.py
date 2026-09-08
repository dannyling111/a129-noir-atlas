"""Capture the real v5.1 browser, at clean defaults; not generated artwork."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence-v52';OUT.mkdir(exist_ok=True)

def draw(page):
    page.evaluate('''()=>{const a=noirApp;a.setPaused(true);a.draw();document.getElementById('hint').classList.remove('visible');clearTimeout(a.toastTimer);}''')

def drama(page):
    page.evaluate('''()=>{const a=noirApp;a.cameraRig.projection='perspective';a.theatre.start(__NOIR__.DRAMA_SCRIPTS[0]);a.setPaused(true);for(let i=0;i<3000;i++){a.update(1/30);if(a.theatre.index===5&&a.theatre.entered&&a.time-a.theatre.since>2.2)break;}a.syncCameraUI();}''')
    draw(page)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for mobile in [False,True]:
        page=browser.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},has_touch=mobile,is_mobile=mobile)
        page.set_content((ROOT/'index.html').read_text(),wait_until='load');page.wait_for_function('window.__NOIR__?.ready');draw(page)
        if not mobile:page.screenshot(path=str(OUT/'default-desktop.png'))
        drama(page);page.screenshot(path=str(OUT/('dialogue-mobile.png' if mobile else 'dialogue-desktop.png')))
        if not mobile:
            for i,name in [(2,'sculpture'),(8,'mountains'),(9,'courtyard')]:
                page.evaluate('''i=>{const a=noirApp;a.theatre.stop();a.loadScene(i,false);a.setPaused(true);a.cameraRig.projection='perspective';a.cameraRig.frameAll();a.cameraRig.zoomBy(i===2?1.22:1);a.syncCameraUI();}''',i)
                draw(page);page.screenshot(path=str(OUT/(name+'-desktop.png')))
        page.close()
    browser.close()
