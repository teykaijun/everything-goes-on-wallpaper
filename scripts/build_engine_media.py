"""Encode the existing portrait MP4 masters as Wallpaper Engine-compatible WebM."""
from pathlib import Path
import argparse, subprocess
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--ffmpeg',help='FFmpeg executable; defaults to imageio-ffmpeg')
    parser.add_argument('--overwrite',action='store_true')
    args=parser.parse_args()
    if args.ffmpeg: executable=args.ffmpeg
    else:
        import imageio_ffmpeg
        executable=imageio_ffmpeg.get_ffmpeg_exe()
    for phase in ['day','night']:
        output=ROOT/'wallpaper/media/window-magic'/f'{phase}.webm'
        source=output.with_suffix('.mp4')
        if output.exists() and not args.overwrite:
            print(f'Reusing {output}');continue
        subprocess.run([executable,'-hide_banner','-loglevel','error','-y','-i',str(source),'-an','-c:v','libvpx-vp9','-crf','28','-b:v','0','-deadline','good','-cpu-used','4','-row-mt','1','-threads','6','-pix_fmt','yuv420p',str(output)],check=True)
        print(output)
if __name__=='__main__':main()
