# Everything Goes On — Classroom Companion

Version **2.0** is a Lively Wallpaper setup for a horizontal main monitor and a
vertical secondary monitor. It combines TFT's **Everything Goes On** arena and
instrumental music with a classroom for desktop icons, a separate magical study,
and an interactive native 3D **Chibi Star Guardian Lux**.

## Use the wallpaper

Download `Everything-Goes-On-Classroom-Companion-Lively.zip` from the
[latest release](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/latest).

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) and import the ZIP.
2. Choose independent wallpapers per display, then apply this project to both monitors.
3. In **Customize**, set soundtrack volume to **35% on the main monitor** and **0% on the secondary monitor**.
4. Keep Lively's wallpaper input set to **Mouse**. Keyboard input is not required.

The **2560×1440 landscape view** shows the arena with **40 classroom desks** in
five rows of eight. The desks provide measured positions for actual Windows
desktop icons. Their colors transition with the arena, while Lux navigates the
aisles and visits the scenery.

The **1080×1920 portrait view** has its own magical study illustration, with a
window, Poro, and wand. Golden afternoon light changes to an indigo,
star-filled night. This independent vertical composition uses ambient effects;
the live Lux companion is enabled on the landscape classroom.

Defaults are **day 07:00–19:00**, night outside those hours, an **8-second
crossfade**, and **35% soundtrack volume**. Both displays use the Windows local
clock. Keep their schedules matched; Lively saves customization per display.

## Lux interactions

On the landscape classroom, Lux uses her native TFT model, textures, facial-expression meshes, Pet geometry,
and **17 original animation clips**. Travel speed follows her native stride,
turns precede travel, and a native stopping animation leads into idle. The
renderer preserves her original ground and animation bounce.

- Move the cursor near resting Lux and she turns toward it.
- Click an accessible floor position to ask her to visit it.
- Click Lux to trigger an emote, or open the **star menu at the bottom right**
  for **Dance, Laugh, Taunt, Joke, or Rest**.
- She also visits scenery and performs emotes automatically.

Clicks in the classroom's reserved icon areas are ignored by Lux so desktop
shortcuts remain usable. Customize can toggle Lux and her mouse reactions and
adjust her size and walking speed. Her animation pauses with Lively playback.
Native face/Pet visibility is timed to the clips; see [source details](docs/SOURCES.md)
for the scope of the adaptation.

## Place Windows icons on the desks

The live wallpaper supplies the desks and their coordinates. The local
[desktop-layout helper](scripts/desktop-layout/README.md) positions the actual
Windows icons through the documented Shell API, with a backup before any move.
Importing the Lively ZIP alone does not rearrange desktop icons.

For this workstation, the original **40-icon** layout is backed up at
`build/desktop-layout/original.json`. That backup includes native item
identities, original positions, icon size, spacing, view flags, and both monitors.
It is local and excluded from Git and the wallpaper package.

To restore it from the repository root after building the helper:

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe restore .\build\desktop-layout\original.json --backup .\build\desktop-layout\before-restore.json
```

Use a new backup filename if that file already exists. Add `--dry-run` to
review the restore without moving icons. A changed monitor arrangement or
missing item requires a reviewed mapping. The helper never overwrites the
original backup, edits shortcut contents, or restarts Explorer.

## Preview, media, and quality

Open the preview through a local server:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8765/wallpaper/index.html?preview=1`.
The browser may require **Enable soundtrack**. Preview controls are temporary;
use Lively's Customize menu to save settings.

The arena loops are **2560×1440 at 30 fps**, upscaled from Riot's 1080p reveal.
A small local cleanup patch removes the Lux already baked into the footage,
leaving the live 3D companion as the moving character. The portrait study uses
**1440×2560, 30 fps** video wrappers around generated illustrations; the live
player adds atmospheric motion. Illustration masters are 941×1672, so the
portrait export does not imply native 1440×2560 source detail.
[Artwork process and master files](docs/ARTWORK.md).

The [v1.0 landscape MP4 exports](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/tag/v1.0.0)
remain unchanged. The classroom, portrait study, native Lux, interactions, and
clock-based transitions are features of the live Lively package. Full-length OGG
music loops play independently of the shorter visuals.

## Build locally

Requirements: Python 3.10+, Node.js with npm, the **.NET 10 SDK**, and FFmpeg with
H.264, VP9, AAC, and Vorbis support. Lux conversion uses the separate
[lol2gltf release 2025-02-28-d36a532](https://github.com/Crauzer/lol2gltf/releases/tag/2025-02-28-d36a532).
Audio decoding uses [vgmstream CLI](https://github.com/vgmstream/vgmstream/releases).
The endpoint reader restores **LeagueToolkit 4.1.0-beta.53** from NuGet on its first
build. The finished wallpaper uses local assets and requires no network access.

Run these commands from the repository root.

### Dependencies and arena media

```powershell
npm ci
python -m pip install zstandard imageio-ffmpeg
```

Put the official reveal at `.sources/official-reveal.mp4`. Extract music from
your own game installation and build the original arena loops:

```powershell
python scripts/extract_arena_audio.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Maps\Shipping\Map22.wad.client" --decoder "C:\path\to\vgmstream-cli.exe"
python scripts/build_media.py --day-music ".sources/audio/647683973.wav" --night-music ".sources/audio/15668741.wav" --webm
```

The original media builder accepts `--ffmpeg PATH` or uses
`imageio-ffmpeg`. Its `--skip-visuals` option reuses existing visual renders.

### Native Lux and corrected clip endpoints

Save CommunityDragon's [hashes.game.txt.3](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.3)
and [hashes.game.txt.8](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.8)
in `.sources/lux/`, and place the lol2gltf executable at
`.tools/lol2gltf.exe`.

```powershell
python scripts/extract_lux_assets.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Companions.wad.client" --output ".sources/lux/extracted"
python scripts/extract_lux_glb.py --converter ".tools/lol2gltf.exe" --extracted ".sources/lux/extracted" --output "wallpaper/media/lux/star-guardian-lux.glb"
python scripts/build_lux_asset.py
npm run build:lux
```

The converter consumes `scripts/data/lux-native-animation-data.json` and
automatically runs `scripts/extract_lux_endpoints.cs` in a temporary .NET 10
project at `.sources/lux/EndpointReader/`. It evaluates each native animation's
exact endpoint and preserves the original duration before writing the GLB and
`animation-data.js`. NuGet packages are cached in `.tools/nuget/`.

### Cleanup and portrait artwork

Supply the four PNG masters listed in [ARTWORK.md](docs/ARTWORK.md), then build
the v2 media:

```powershell
python scripts/build_v2_media.py
```

This uses `imageio-ffmpeg` to create `day-clean.webm`,
`night-clean.webm`, and the portrait study MP4s. Use `--only arena`
or `--only study` to rebuild one part. Original loops and PNG masters are retained.

### Checks and package

```powershell
npm test
python scripts/package_wallpaper.py
dotnet build scripts/desktop-layout/DesktopLayout.csproj --configuration Release --output build/desktop-layout/bin
.\scripts\desktop-layout\Test-ReadOnly.ps1
```

The Lively output is `dist/Everything-Goes-On-Classroom-Companion-Lively.zip`.
Desktop helper tests perform inventory and dry-runs and verify that icon
positions remain unchanged. Game files are read without modifying the
installation. Game media, generated masters, local backups, and build packages
are excluded from Git.
