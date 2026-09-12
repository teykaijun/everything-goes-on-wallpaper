"""Render seamless 2560x1440 arena loops from the official Riot reveal.

Requires FFmpeg on PATH, --ffmpeg, or imageio-ffmpeg installed locally.
Source media and game music are supplied locally and never downloaded here.
"""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]


def find_ffmpeg(explicit=None):
    if explicit:
        return str(Path(explicit).resolve())
    if shutil.which("ffmpeg"):
        return shutil.which("ffmpeg")
    sys.path.insert(0, str(ROOT / ".tools" / "python"))
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        raise SystemExit("FFmpeg is required. Install it or pass --ffmpeg PATH.")


def run(ffmpeg, *args):
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", *map(str, args)], check=True)


def render_visual(ffmpeg, source, name, start):
    target = ROOT / "build" / f"{name}-visual.mp4"
    # Shift the loop origin by one second. The final second blends the original
    # tail into its head, ending at precisely the new first-frame position.
    graph = (
        "[0:v]fps=30,format=yuv420p,settb=AVTB,split[a][b];"
        "[a][b]xfade=transition=fade:duration=1:offset=8,"
        "trim=start=1:end=9,setpts=PTS-STARTPTS,"
        "scale=2560:1440:flags=lanczos,setsar=1,fps=30,format=yuv420p[v]"
    )
    run(ffmpeg, "-ss", start, "-t", 9, "-i", source,
        "-filter_complex", graph, "-map", "[v]", "-an",
        "-c:v", "libx264", "-preset", "slow", "-crf", 18,
        "-r", 30, "-movflags", "+faststart", "-threads", 4, target)
    return target


def mux(ffmpeg, visual, music, target):
    # Loop the visual for the full musical phrase, keeping the soundtrack intact.
    with wave.open(str(music), "rb") as track:
        duration = track.getnframes() / track.getframerate()
    run(ffmpeg, "-stream_loop", -1, "-i", visual, "-i", music,
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k", "-t", duration, "-movflags", "+faststart", target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / ".sources" / "official-reveal.mp4")
    parser.add_argument("--day-music", type=Path)
    parser.add_argument("--night-music", type=Path)
    parser.add_argument("--ffmpeg")
    parser.add_argument("--skip-visuals", action="store_true")
    parser.add_argument("--webm", action="store_true", help="Also build VP9/Opus files for CefSharp")
    args = parser.parse_args()
    ffmpeg = find_ffmpeg(args.ffmpeg)
    if not args.source.is_file() and not args.skip_visuals:
        parser.error("The official reveal source is missing. See docs/SOURCES.md.")
    (ROOT / "build").mkdir(exist_ok=True)
    media = ROOT / "wallpaper" / "media"
    media.mkdir(parents=True, exist_ok=True)
    for name, start, music in [("day", 6, args.day_music), ("night", 19, args.night_music)]:
        visual = ROOT / "build" / f"{name}-visual.mp4"
        if not args.skip_visuals:
            print(f"Rendering {name} visual at 2560x1440 / 30 fps", flush=True)
            render_visual(ffmpeg, args.source, name, start)
        if not visual.is_file():
            parser.error(f"Missing visual: {visual}")
        if music:
            if not music.is_file():
                parser.error(f"Missing music: {music}")
            mux(ffmpeg, visual, music, media / f"{name}.mp4")
            run(ffmpeg, "-i", music, "-vn", "-c:a", "libvorbis", "-q:a", 6,
                media / f"{name}.ogg")
        else:
            shutil.copyfile(visual, media / f"{name}.mp4")
        if args.webm:
            run(ffmpeg, "-i", visual, "-c:v", "libvpx-vp9", "-crf", 26,
                "-b:v", 0, "-row-mt", 1, "-threads", 4, "-an",
                media / f"{name}.webm")
    run(ffmpeg, "-ss", 1, "-i", ROOT / "build" / "night-visual.mp4",
        "-frames:v", 1, "-vf", "scale=480:270", "-update", 1,
        ROOT / "wallpaper" / "thumbnail.jpg")
    print("Media saved in", media)


if __name__ == "__main__":
    main()
