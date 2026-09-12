"""Encode portrait art with periodic procedural light, star and ribbon effects.

The PNG masters are read only by FFmpeg. Python renders transparent effect layers.
Defaults to the furnished window-magic art; --media-dir and --output-dir support
separate experiments without replacing the original window or study artwork.
"""
from pathlib import Path
import argparse
import hashlib
import os
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.tools/python'))
import imageio_ffmpeg
from window_effects import WindowEffects

FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
DURATION,FPS,WIDTH,HEIGHT=24,30,1440,2560


def build(phase,media_dir=None,output_dir=None,preview_times=()):
    media=Path(media_dir) if media_dir else ROOT/'wallpaper/media/window-magic'
    output=Path(output_dir) if output_dir else media
    source=media/f'{phase}.png'
    if not source.is_file():
        raise FileNotFoundError(f'Missing illustration master: {source}')
    output.mkdir(parents=True,exist_ok=True)
    target=output/f'{phase}.mp4'
    temporary=output/f'{phase}.building.mp4'
    effects=WindowEffects(phase,width=720,height=1280,duration=DURATION)
    first=effects.render(0).tobytes()
    if first!=effects.render(DURATION).tobytes():
        raise RuntimeError('Effect period does not close exactly')
    print(f'{phase}: exact {DURATION}s effect period verified ({hashlib.sha256(first).hexdigest()[:12]})',flush=True)
    graph=(f'[0:v]scale={WIDTH}:{HEIGHT}:flags=lanczos,setsar=1,format=rgba[base];'
           f'[1:v]scale={WIDTH}:{HEIGHT}:flags=lanczos,format=rgba[effects];'
           '[base][effects]overlay=shortest=1:format=auto,format=yuv420p[out]')
    command=[FFMPEG,'-hide_banner','-loglevel','warning','-y','-loop','1','-framerate',str(FPS),'-i',str(source),
             '-f','rawvideo','-pixel_format','rgba','-video_size','720x1280','-framerate',str(FPS),'-i','pipe:0',
             '-filter_complex',graph,'-map','[out]','-frames:v',str(DURATION*FPS),'-an','-c:v','libx264',
             '-preset','fast','-crf','18','-pix_fmt','yuv420p','-r',str(FPS),'-movflags','+faststart','-threads','6',str(temporary)]
    process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,
                             creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    try:
        for frame in range(DURATION*FPS):
            process.stdin.write(first if frame==0 else effects.render(frame/FPS).tobytes())
            if frame and frame%(FPS*6)==0:
                print(f'{phase}: rendered {frame/FPS:.0f}/{DURATION}s',flush=True)
        process.stdin.close()
        message=process.stderr.read().decode('utf-8',errors='replace')
        if process.wait():
            raise RuntimeError(message)
    except BaseException:
        if process.poll() is None:
            process.terminate()
        raise
    temporary.replace(target)
    print(f'{phase}: {target} ({target.stat().st_size} bytes)',flush=True)
    for seconds in preview_times:
        label=f'{seconds:.3f}'.replace('.','-')
        preview=output/f'{phase}-preview-{label}.jpg'
        subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-ss',str(seconds),'-i',str(target),
                        '-frames:v','1','-q:v','2','-update','1',str(preview)],check=True)
    return target


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase',choices=['day','night','both'],default='both',nargs='?')
    parser.add_argument('--media-dir',type=Path,help='Input folder containing day.png and night.png')
    parser.add_argument('--output-dir',type=Path,help='Separate MP4/preview output folder; defaults to the input folder')
    parser.add_argument('--preview-times',default='',help='Comma-separated times in seconds, for example 0,6,23.966')
    args=parser.parse_args()
    previews=[float(value) for value in args.preview_times.split(',') if value.strip()]
    for phase in (['day','night'] if args.phase=='both' else [args.phase]):
        build(phase,args.media_dir,args.output_dir,previews)