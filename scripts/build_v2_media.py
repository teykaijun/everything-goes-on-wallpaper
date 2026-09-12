"""Blend image-generated Lux cleanup plates into arena loops and encode study scenes.
The original loops and illustration masters are retained unchanged.
"""
from pathlib import Path
import argparse,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/python'))
import imageio_ffmpeg
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()

def run(args):
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y',*map(str,args)],check=True)

def clean(phase):
    source=ROOT/f'wallpaper/media/{phase}.webm'
    plate=ROOT/f'wallpaper/media/cleanup/{phase}.png'
    target=ROOT/f'wallpaper/media/{phase}-clean.webm'
    feather="255*min(1,min(min(X,W-1-X),min(Y,H-1-Y))/12)"
    graph=f"[1:v]scale=2560:1440:flags=lanczos,crop=208:166:400:808,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='{feather}'[patch];[0:v][patch]overlay=400:808:shortest=1,format=yuv420p[out]"
    run(['-i',source,'-loop','1','-i',plate,'-filter_complex',graph,'-map','[out]','-an','-r','30','-c:v','libvpx-vp9','-b:v','0','-crf','22','-row-mt','1','-threads','8',target])
    print(f'Cleaned {phase}: {target.stat().st_size} bytes',flush=True)

def study(phase):
    source=ROOT/f'wallpaper/media/study/{phase}.png'
    target=source.with_suffix('.mp4')
    # Runtime adds gentle light and motes. A still 2-second video keeps the existing
    # tested media/soundtrack scheduler, with no repeated decoder or network load.
    run(['-loop','1','-i',source,'-t','2','-vf','scale=1440:2560:flags=lanczos,setsar=1','-an','-r','30','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',target])
    print(f'Study {phase}: {target.stat().st_size} bytes',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--only',choices=['arena','study']);args=p.parse_args()
    for phase in ['day','night']:
        if args.only!='study':clean(phase)
        if args.only!='arena':study(phase)
