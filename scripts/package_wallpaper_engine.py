"""Build two local Wallpaper Engine web projects, with WebM-only media."""
from pathlib import Path
import json, re, shutil, zipfile
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'wallpaper'
OUTPUT = ROOT / 'dist' / 'wallpaper-engine'
COMMON = ['style.css', 'config.js', 'schedule.js', 'viewport.js', 'wallpaper.js', 'layout.js', 'thumbnail.jpg']
ARENA = ['bench-layout.js', 'classroom-geometry.js', 'classroom.js', 'classroom.css', 'lux.js', 'lux-motion.js', 'media/lux/animation-data.js', 'media/lux/model.js', 'vendor/THREE-LICENSE.txt', 'media/classroom-v4/desks.png', 'media/day-clean.webm', 'media/night-clean.webm', 'media/day.ogg', 'media/night.ogg']
WINDOW = ['media/window-magic/day.webm', 'media/window-magic/night.webm']
def main():
    for scene, folder, manifest, extra in [('arena','Everything-Goes-On-Arena','project.json',ARENA),('window','Everything-Goes-On-Star-Window','project-window.json',WINDOW)]:
        target = OUTPUT / folder
        target.mkdir(parents=True,exist_ok=True)
        for name in COMMON + extra + ['engine-'+scene+'.js']:
            dest = target / name
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(SOURCE / name, dest)
        shutil.copy2(SOURCE / manifest,target / 'project.json')
        html=(SOURCE/'index.html').read_text(encoding='utf-8')
        html=html.replace('<script src="config.js?v=3.0.0-final"></script>','<script src="config.js?v=3.0.0-final"></script>\n  <script src="engine-'+scene+'.js?v=3.0.0-final"></script>')
        if scene=='window':
            html=re.sub(r'^.*<(?:script|link) [^\n]*(?:bench-layout|classroom(?:-geometry)?|lux(?:-motion)?|media/lux/)[^\n]*\n','',html,flags=re.M)
        (target/'index.html').write_text(html,encoding='utf-8',newline='\n')
        shutil.copy2(ROOT/'docs/SOURCES.md',target/'CREDITS.md')
        shutil.copy2(ROOT/'docs/WALLPAPER-ENGINE.md',target/'WALLPAPER-ENGINE.md')
        # Check every script and stylesheet in the actual exported entry point.
        for ref in re.findall(r'(?:src|href)="([^"?]+)(?:\?[^" ]*)?"',html):
            if not (target/ref).is_file(): raise FileNotFoundError(target/ref)
        assert json.loads((target/'project.json').read_text())['type']=='web'
        print(target)
    package=ROOT/'dist/Everything-Goes-On-Wallpaper-Engine.zip'
    with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUTPUT.rglob('*')):
            if path.is_file(): archive.write(path,path.relative_to(OUTPUT))
    with zipfile.ZipFile(package) as archive: assert archive.testzip() is None
    print(f'{package} ({package.stat().st_size:,} bytes)')
if __name__=='__main__':main()
