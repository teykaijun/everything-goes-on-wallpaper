# Everything Goes On — Day & Night with Chibi Lux

A local Lively Wallpaper project featuring TFT's **Everything Goes On** arena,
the actual instrumental arena music, and automatic transitions based on the
Windows clock. Version **1.1** adapts to landscape and portrait displays and adds
the native 3D **Chibi Star Guardian Lux**, who patrols the board and pauses to idle.

## Use the wallpaper

Download the ready-to-use Lively ZIP from the
[latest release](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/latest).

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/).
2. Drag `Everything-Goes-On-Dual-Monitor-Lux-Lively.zip` into Lively, or use **Add wallpaper → Choose a file**.
3. Choose independent wallpapers per display, then apply this wallpaper to each monitor.
4. Right-click its library card and choose **Customize** for each display. Set soundtrack volume to **35% on the main monitor** and **0% on the secondary monitor** to hear one music stream.

Landscape displays show the full arena. Portrait displays keep the playable board
centered, crop the outer room, and blend the scene into a softly animated ambient
extension above and below. The layout adapts automatically, including a
**2560×1440 horizontal main display** and **1080×1920 vertical secondary display**.

Lux uses her original TFT model, textures, idle animation, and movement animation.
She turns as she travels and takes short idle breaks. Customize lets you toggle
Lux, adjust her size from **65–160%**, and change walking speed from **50–150%**.
Her animation and the ambient effects pause with Lively's playback state.

Defaults: **day 07:00–19:00**, night outside those hours, an **8-second crossfade**,
and **35% soundtrack volume**. Times use your computer's local timezone; no
internet or location access is needed. Equal start times mean day all day.

The desktop shows the arena and Lux without preview controls. Lively stores
customization per display; use matching schedules on both monitors.
Use Lively's global sound and fullscreen/battery pause settings as desired.

Open `wallpaper/index.html?preview=1` through a local server to try the controls:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:8765/wallpaper/index.html?preview=1`.
The browser may require **Enable soundtrack** before playing sound.
Preview settings are temporary; use Lively's Customize menu for saved settings.

## MP4 exports and quality

The [v1.0 MP4 exports](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/tag/v1.0.0)
remain unchanged. `wallpaper/media/day.mp4` and `wallpaper/media/night.mp4` are
standalone landscape videos with the corresponding full instrumental mix.
**Lux, the adaptive monitor layout, and clock-based switching are features of the
live Lively package only.** The Lively package uses shorter
WebM visual loops with independent OGG audio so the musical phrase continues
across visual repeats. Only the current theme plays outside transitions.

The arena video assets are **2560×1440, 30 fps**. Riot's clean source footage is
1080p, so the export is upscaled with Lanczos. Source detail is not native 1440p.
The live layout and 3D character render for each display's viewport.
[Source details and credits](docs/SOURCES.md).

## Build locally

Requirements: Python 3.10+, Node.js with npm, and FFmpeg with H.264, VP9, AAC,
and Vorbis support. The WAD extractors need Python's `zstandard` package.
Audio decoding uses a local [vgmstream CLI](https://github.com/vgmstream/vgmstream/releases).
Lux conversion uses [lol2gltf](https://github.com/Crauzer/lol2gltf/releases/tag/2025-02-28-d36a532)
and an installed .NET runtime. The conversion script enables major-version runtime
roll-forward; the converter is not included in the repository or wallpaper.

Run the following commands from the repository root.

1. Install the locked JavaScript dependencies and the Python extraction dependency:

```powershell
npm ci
python -m pip install zstandard
```

2. Put the official arena reveal source at `.sources/official-reveal.mp4`, then
extract audio from your game installation:

```powershell
python scripts/extract_arena_audio.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Maps\Shipping\Map22.wad.client" --decoder "C:\path\to\vgmstream-cli.exe"
```

3. Supply the selected day/night instrumental WAVs and build the arena media:

```powershell
python scripts/build_media.py --day-music ".sources/audio/647683973.wav" --night-music ".sources/audio/15668741.wav" --webm
```

FFmpeg can be supplied with `--ffmpeg PATH`. A local `imageio-ffmpeg` installation
is also supported. Use `--skip-visuals` when only changing soundtracks.

4. Save CommunityDragon's [hashes.game.txt.3](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.3)
and [hashes.game.txt.8](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.8)
in `.sources/lux/`, and place the lol2gltf executable at `.tools/lol2gltf.exe`.
Extract Lux from your local game, convert her native assets, and embed the model
for offline playback:

```powershell
python scripts/extract_lux_assets.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Companions.wad.client" --output ".sources/lux/extracted"
python scripts/extract_lux_glb.py --converter ".tools/lol2gltf.exe" --extracted ".sources/lux/extracted" --output "wallpaper/media/lux/star-guardian-lux.glb"
python scripts/build_lux_asset.py
npm run build:lux
```

5. Check the player and create the portable Lively package:

```powershell
npm test
python scripts/package_wallpaper.py
```

The output is `dist/Everything-Goes-On-Dual-Monitor-Lux-Lively.zip`. The extraction
scripts read the game installation and write local copies; they do not modify
game files. The completed wallpaper uses local assets and needs no network access.

This repository contains the player, tests, extraction/build tools and credits.
Game media and local output packages are excluded from version control.
