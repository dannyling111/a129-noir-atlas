"""Actual browser WebGL evidence; not generated imagery."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64,io,math,os,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'evidence-v52';OUT.mkdir(exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
frames={}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for label,path in [('before',ROOT/'fixtures/v51-before-depth-fix.html'),('after',ROOT/'index.html')]:
  page=browser.new_page(viewport={'width':880,'height':730},device_scale_factor=1)
  page.set_content(path.read_text());page.wait_for_function('window.__NOIR__?.ready')
  page.evaluate('''()=>{const a=noirApp;a.loadScene(9,false);a.setPaused(true);a.exhibition.enabled=false;a.renderer.resolution=1;a.settings.zoom=1.16;a.cameraRig.pitch=.85;a.time=0;document.getElementById('hint').classList.remove('visible');clearTimeout(a.toastTimer);}''')
  frames[label]=[]
  for j in range(25):
   data=page.evaluate('''angle=>{noirApp.cameraRig.yaw=angle;noirApp.draw();return noirApp.canvas.toDataURL('image/png');}''',.38+j*.018)
   img=Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB');frames[label].append(img)
   if j==15:img.save(OUT/(label+'-courtyard.png'))
  if label=='after':
   page.screenshot(path=str(OUT/'fixed-tablet-ui.png'))
   page.evaluate('noirApp.loadScene(7,false);noirApp.setPaused(true);noirApp.draw();')
   page.screenshot(path=str(OUT/'fixed-office-ui.png'))
  page.close()
 # Match touch layout, exercise actual pointer rotation and pinch in regressions.
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True)
 page.set_content((ROOT/'index.html').read_text());page.wait_for_function('window.__NOIR__?.ready')
 page.evaluate('noirApp.loadScene(9,false);noirApp.setPaused(true);noirApp.cameraRig.pitch=1.03;noirApp.draw();document.getElementById("hint").classList.remove("visible");')
 page.screenshot(path=str(OUT/'fixed-mobile-ui.png'))
 browser.close()
# Precise side-by-side layout of unchanged browser-rendered pixels.
def panel(a,b,width=560):
 h=round(a.height*width/a.width)
 c=Image.new('RGB',(width*2+14,h+54),(246,246,246));d=ImageDraw.Draw(c)
 d.text((14,9),'BEFORE / 5.1',font=font,fill=(30,30,30));d.text((width+22,9),'AFTER / 5.2',font=font,fill=(30,30,30))
 d.text((14,31),'Overlapping ground surfaces',font=small,fill=(70,70,70));d.text((width+22,31),'Single ground cap / shadows retained',font=small,fill=(70,70,70))
 c.paste(a.resize((width,h),Image.Resampling.LANCZOS),(0,54));c.paste(b.resize((width,h),Image.Resampling.LANCZOS),(width+14,54));return c
panel(frames['before'][15],frames['after'][15],680).save(OUT/'depth-fix-comparison.png')
sequence=[panel(frames['before'][i],frames['after'][i],480) for i in list(range(25))+list(range(23,0,-1))]
# A shared palette avoids introducing frame-local palette flashes in this preview.
ref=sequence[10].quantize(colors=128,method=Image.Quantize.MEDIANCUT)
sequence=[im.quantize(palette=ref,dither=Image.Dither.NONE) for im in sequence]
sequence[0].save(OUT/'depth-fix-rotation.gif',save_all=True,append_images=sequence[1:],duration=90,loop=0,optimize=False,disposal=2)
print('Captured before/after WebGL rotation + tablet, office and mobile screenshots.',flush=True)
