"""Encode aligned portrait window masters as gently animated, seamless MP4 loops."""
from pathlib import Path
import argparse, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/python'))
import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
DURATION, FPS, WIDTH, HEIGHT = 24, 30, 1440, 2560


def build(phase):
    media = ROOT / 'wallpaper/media/window'
    # The illustration and window frame stay fixed. Only illumination and sparse
    # dust/starlight change. All expressions repeat every 24 seconds.
    filters = []
    points = [(.29,.25),(.69,.28),(.26,.44),(.68,.44),(.29,.62),(.71,.63),(.30,.15),(.69,.14)]
    font = 'C\\:/Windows/Fonts/segoeui.ttf'
    color = 'fff0ca' if phase == 'day' else 'dbdcff'
    for i,(x,y) in enumerate(points):
        shift = i * .83
        filters.append(
            f"drawtext=fontfile='{font}':text='·':fontsize=12:fontcolor=0x{color}:"
            f"x='w*{x}+7*sin(2*PI*t/24+{shift})':"
            f"y='h*{y}+12*cos(2*PI*t/24+{shift})':"
            f"alpha='0.14+0.12*sin(2*PI*t/24+{shift})'")
    glow = '0xffe8c4@0.016' if phase == 'day' else '0xa28aff@0.016'
    graph = (f'[0:v]scale={WIDTH}:{HEIGHT}:flags=lanczos,setsar=1[base];'
             f'color=c={glow}:s={WIDTH}x{HEIGHT}:r={FPS}:d={DURATION},format=rgba,'
             'fade=t=in:st=0:d=8:alpha=1,fade=t=out:st=8:d=8:alpha=1[light];'
             '[base][light]overlay=shortest=1,' + ','.join(filters) + '[out]')
    target = media / f'{phase}.mp4'
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y','-loop','1',
                    '-framerate',str(FPS),'-i',str(media/f'{phase}.png'),'-t',str(DURATION),
                    '-filter_complex',graph,'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','18',
                    '-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart','-threads','6',str(target)],check=True)
    print(f'{phase}: {target} ({target.stat().st_size} bytes)',flush=True)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('phase',choices=['day','night','both'],default='both',nargs='?')
    args=parser.parse_args()
    for phase in (['day','night'] if args.phase=='both' else [args.phase]):build(phase)
