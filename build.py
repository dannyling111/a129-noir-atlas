"""Build one dependency-free HTML. Run: python build.py"""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
ORDER=['math.js','geometry.js','materials.js','renderer.js','motion.js','cast.js','figure.js','scenes.js','navigation.js','worlds.js','accents.js','director.js','exhibition.js','living.js','camera-3d.js','dialogue.js','stories.js','theatre.js','app.js','world-ui.js','v5-ui.js','look-ui.js','boot.js']
def build():
    src=ROOT/'src'
    code='\n'.join((src/f).read_text(encoding='utf-8') for f in ORDER)
    html=(src/'head.html').read_text(encoding='utf-8')+'<style>'+(src/'styles.css').read_text(encoding='utf-8')+'\n'+(src/'v5.css').read_text(encoding='utf-8')+'\n'+(src/'look.css').read_text(encoding='utf-8')+'</style>'+(src/'ui.html').read_text(encoding='utf-8')+"<script>\n(()=>{\n'use strict';\n"+code+"\n})();\n</script></body></html>\n"
    (ROOT/'index.html').write_text(html,encoding='utf-8')
    print(f'Built {ROOT / "index.html"} ({len(html.encode()):,} bytes)')
if __name__=='__main__':build()
