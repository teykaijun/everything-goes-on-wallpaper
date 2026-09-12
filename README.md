# Everything Goes On — Day & Night

A local Lively Wallpaper project featuring TFT's **Everything Goes On** arena,
the actual instrumental arena music, and automatic transitions based on the
Windows clock.

## Use the wallpaper

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/).
2. Drag `dist/Everything-Goes-On-2K-Lively.zip` into Lively, or use **Add wallpaper → Choose a file**.
3. Apply it. Right-click its library card and choose **Customize** to change the schedule and volume.

Defaults: **day 07:00–19:00**, night outside those hours, an **8-second crossfade**,
and **35% soundtrack volume**. Times use your computer's local timezone; no
internet or location access is needed. Equal start times mean day all day.

The desktop shows only the arena. Lively stores customization per display.
Use Lively's global sound and fullscreen/battery pause settings as desired.

Open `wallpaper/index.html?preview=1` through a local server to try the controls:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/wallpaper/index.html?preview=1`.
The browser may require **Enable soundtrack** before playing sound.
Preview settings are temporary; use Lively's Customize menu for saved settings.

## MP4 exports and quality

`wallpaper/media/day.mp4` and `wallpaper/media/night.mp4` are standalone videos
with the corresponding full instrumental mix. The Lively package uses shorter
WebM visual loops with independent OGG audio so the musical phrase continues
across visual repeats. Only the current theme plays outside transitions.

All visuals are **2560×1440, 30 fps**. Riot's clean source footage is 1080p, so
the export is upscaled with Lanczos. Source detail is not native 1440p.
An MP4 cannot read the clock; automatic switching is provided by the Lively
package. [Source details and credits](docs/SOURCES.md).

## Build locally

Requirements: Python 3.10+, FFmpeg with H.264/VP9/Vorbis support, Node.js for tests.
The audio extractor additionally needs `zstandard` for compressed WAD entries,
and a local [vgmstream CLI](https://github.com/vgmstream/vgmstream/releases) to decode WEM audio.

1. Put the official arena reveal source at `.sources/official-reveal.mp4`.
2. Extract audio from your game installation:

```powershell
python scripts/extract_arena_audio.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Maps\Shipping\Map22.wad.client" --decoder "C:\path\to\vgmstream-cli.exe"
```

3. Supply the selected day/night instrumental WAVs and build media:

```powershell
python scripts/build_media.py --day-music ".sources/audio/647683973.wav" --night-music ".sources/audio/15668741.wav" --webm
node --test wallpaper/tests/*.test.js
python scripts/package_wallpaper.py
```

FFmpeg can be supplied with `--ffmpeg PATH`. A local `imageio-ffmpeg` installation
is also supported. Use `--skip-visuals` when only changing soundtracks.

This repository contains the player, tests, extraction/build tools and credits.
Game media and local output packages are excluded from version control.
