"""Generate editable SVGs. Rasterize at 2x with @resvg/resvg-js 2.6.2.
No external fetches, private data, or generated brand marks are used.
"""
from pathlib import Path
from html import escape
import re
ROOT = Path(__file__).resolve().parent

def image(name, x, y, size):
    p = ROOT / name if name == 'x-official.svg' else ROOT.parent / 'agents' / name
    s = p.read_text()
    view = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = s[s.index('>')+1:s.rindex('</svg>')]
    fill = re.search(r'<svg[^>]*fill="([^"]+)"', s).group(1)
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="{view}" fill="{fill}">{body}</svg>'

def text(x,y,value,size=24,weight=400,color='#111111'):
    return f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{escape(value)}</text>'

def rect(x,y,w,h,r=20,fill='white',stroke='#d9d9d9'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>'

def card(x,y,w,h,i,mobile):
    titles=['Save','Distill','Recall & cite']
    out=rect(x,y,w,h)+text(x+28,y+44,f'0{i+1}',20,500,'#666666')
    out+=text(x+28,y+91,titles[i],34,700)
    if i==0:
        out+=rect(x+w-84,y+28,52,52,12,'#000000','#000000')+image('x-official.svg',x+w-72,y+40,28)
        lines=['A guide worth keeping.','Keyboard navigation'] if mobile else ['A guide worth','keeping.']
        for j,line in enumerate(lines):out+=text(x+28,y+158+j*38,line,28,500 if j==0 else 400)
        out+=text(x+28,y+h-28,'Your authorized bookmarks',24,400,'#555555')
    elif i==1:
        # Generic document glyph, not a brand logo.
        out+=f'<g transform="translate({x+w-75},{y+30})" fill="none" stroke="#111" stroke-width="2.5"><rect width="40" height="50" rx="5"/><path d="M10 14h20M10 25h20M10 36h13"/></g>'
        for j,line in enumerate(['Purpose. Context.','Limits. Original source.']):out+=text(x+28,y+158+j*38,line,28 if mobile else 25)
        out+=text(x+28,y+h-28,'Saved in local memory',24,400,'#555555')
    else:
        out+=image('cursor.svg',x+w-112,y+42,28)+image('openai.svg',x+w-66,y+42,28)
        out+=text(x+28,y+158,'“Build a dialog.”',28,500)
        out+=text(x+28,y+204,'Find. Check fit. Cite.',28 if mobile else 26)
        out+=text(x+28,y+h-28,'Your Agent, when you ask',24,400,'#555555')
    return out

def make(mobile=False):
    w,h=(720,1370) if mobile else (1200,740)
    out=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">xrecall: saved today, useful when you build</title><desc id="desc">Illustrative workflow: save authorized X bookmarks, distill purpose and limitations into local resource memory, then ask your Agent to retrieve applicable notes and cite original sources. No automatic background sync or remote memory is shown.</desc><rect width="{w}" height="{h}" fill="#ffffff"/>'
    x=48 if mobile else 56
    out+=text(x,62,'xrecall',26,700)
    if mobile:
        out+=text(x,129,'Saved today.',48,700)+text(x,185,'Useful when you build.',48,700)
        for i in range(3):
            y=244+i*330
            out+=card(48,y,624,290,i,True)
            if i<2:out+=f'<path d="M360 {y+301}v18m-7-7 7 7 7-7" fill="none" stroke="#999" stroke-width="2"/>'
        out+=text(48,1283,'Local by default · Agent-led',27,500)
        out+=text(48,1325,'Illustrative example · Original sources kept',23,400,'#666666')
    else:
        out+=text(x,137,'Saved today. Useful when you build.',48,700)
        out+=text(x,183,'Your bookmarks, organized for your next task.',25,400,'#555555')
        for i in range(3):
            cx=56+i*376
            out+=card(cx,239,336,352,i,False)
            if i<2:out+=f'<path d="M{cx+348} 415h17m-6-6 6 6-6 6" fill="none" stroke="#999" stroke-width="2"/>'
        out+=text(56,655,'Local by default · Agent-led · Original sources kept',24,500)
        out+=text(56,699,'Illustrative example: a saved keyboard-navigation guide helps with a later UI task.',21,400,'#666666')
    out+='</svg>\n'
    (ROOT/('xrecall-hero-mobile.svg' if mobile else 'xrecall-hero.svg')).write_text(out)
make();make(True)
