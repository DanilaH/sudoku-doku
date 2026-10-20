from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from pathlib import Path
root=Path(__file__).resolve().parents[1]
f=TTFont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'); gs=f.getGlyphSet()
paths=[]
# A 3x3 board, with optical centering by actual glyph bounds.
paths.append(('#D5E8FA',None,None,'M29 29H45.6667V45.6667H29Z'))
paths.append(('none','#365F8B','1.4','M29 29H79V79H29ZM45.6667 29V79M62.3333 29V79M29 45.6667H79M29 62.3333H79'))
for char,cx,cy in [('1',37.3333,37.3333),('9',54,54),('2',70.6667,70.6667)]:
 g=gs[f.getBestCmap()[ord(char)]];b=BoundsPen(gs);g.draw(b);x0,y0,x1,y1=b.bounds
 scale=10.4/(y1-y0);p=SVGPathPen(gs)
 g.draw(TransformPen(p,(scale,0,0,-scale,cx-(x0+x1)*scale/2,cy+(y0+y1)*scale/2)))
 paths.append(('#365F8B',None,None,p.getCommands()))
def svg():
 body=''.join(f'<path fill="{fill}"'+(f' stroke="{stroke}" stroke-width="{sw}"' if stroke else '')+f' d="{d}"/>' for fill,stroke,sw,d in paths)
 # Store/web artwork fills 72% of the canvas. Adaptive foreground remains mask-safe.
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#F7F8FC"/><g transform="translate(54 54) scale(1.5) translate(-54 -54)">'+body+'</g></svg>\n'
(root/'public/icon.svg').write_text(svg())
x='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n'
for fill,stroke,sw,d in paths:
 x+='  <path android:fillColor="'+('#00000000' if fill=='none' else fill)+'"'+(f' android:strokeColor="{stroke}" android:strokeWidth="{sw}"' if stroke else '')+' android:pathData="'+d+'"/>\n'
x+='</vector>\n'
(root/'android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml').write_text(x)
# Store media must always use the shared icon, not an independent hand-drawn copy.
p=root/'tools/store-media.mjs';s=p.read_text();a=s.index('await page.setContent(`<style>body{margin:0;background:#f7f8fc}');b=s.index('\nawait page.screenshot',a)
s=s[:a]+"await page.setContent(`<style>body{margin:0;background:#f7f8fc}svg{width:512px;height:512px}</style>${fs.readFileSync(new URL('../public/icon.svg',import.meta.url),'utf8')}`);"+s[b:];p.write_text(s)
