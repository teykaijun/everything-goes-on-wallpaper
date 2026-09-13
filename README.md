# Everything Goes On — TFT Classroom

Version **2.4.0** is a Lively Wallpaper setup for a horizontal main monitor and a
vertical secondary monitor. It combines TFT's **Everything Goes On** arena and
instrumental soundtrack with a daytime classroom, desktop icons on the arena's
bench bands, an interactive native 3D **Chibi Star Guardian Lux**, and a separate
furnished, animated Star Guardian window view for the portrait display.

## Use the wallpaper

The current code is version **2.4.0**. The finished Lively package is saved
locally as `dist/Everything-Goes-On-TFT-Classroom-Lively.zip`. It is not
attached to a public release because it bundles extracted game media. Use the
build instructions below to assemble the package from your local assets.
Separate day and night portrait MP4s remain available in the
[v2.2.0 release](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/tag/v2.2.0).

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) and import the ZIP.
2. Choose independent wallpapers per display, then apply this project to both monitors.
3. In **Customize**, use soundtrack volume **21% on the main monitor** and **0% on the secondary monitor**.
4. Keep Lively's wallpaper input set to **Mouse**. Keyboard input is not required.

The **2560x1440 landscape view** shows the arena with **20 desks in four rows
of five**, matching the latest TFT gameplay screenshot. The screenshot was
aligned to shared arena landmarks before measuring tabletop centers, desk
widths, row spacing and perspective. Smaller golden-orange desks have low orange
chairs on the viewer side. Twenty distinct illustrated sprites retain individual
books, bags, pencil cases, bottles and small Star Guardian accessories.
Window-side shading and floor shadows integrate the furniture with the arena.
The artwork is a generated adaptation of the native appearance.

The added desks and chairs fade out at night; their collision obstacles and
desk-visit targets are removed too. The arena's original side chairs remain in
the source footage. Lux walks through the open night arena and navigates around
the daytime furniture.

The **1080×1920 portrait display** receives its own furnished window composition,
with the same rectangular frame, cream curtains, and room geometry across themes.
By day, a pink star planter, mint pencil cup, pastel books, and a wing-trimmed pink
satchel sit on the sill; white-and-pink trainers rest on the floor. Visible dust
and warm sunshafts move through the golden light.

At night, a cyan-purple plant, star lantern, open spellbook, and pink star crystal
light the sill. The bag moves to the left floor and violet light reflects from
the shoes. Four-point glints, orbiting gold stars, cyan-pink trails, and local prop
glows animate the scene. These effects are encoded into the MP4; the illustrated
props and window structure remain still within each theme. This portrait scene
is unchanged from v2.2; the bench icon positions and native Lux are also retained.

Defaults are **day 07:00–19:00**, night outside those hours, an **8-second
crossfade**, and **21% main-display soundtrack volume**, a 40% relative reduction
from the previous 35%. Both displays use the Windows local clock. Keep their schedules matched; Lively saves customization
per display. The live Lux companion and classroom furniture belong to the
landscape view.

## Lux interactions

Lux uses her native TFT model, textures, facial-expression meshes, Pet geometry,
and **17 original animation clips**. Travel speed follows the projected native
stride, turns precede travel, and a native stopping animation leads into idle.
The renderer preserves her original ground and animation bounce.

- Move the cursor near resting Lux and she turns toward it.
- Click an accessible floor position to ask her to visit it.
- Click Lux to trigger an emote, or open the **star menu at the bottom right**
  for **Dance, Laugh, Taunt, Joke, or Rest**.
- She also visits the actual left-wall poros and the daytime desks, facing the
  scenery while performing an emote. User-triggered emotes face the viewer.

Lux ignores clicks in reserved icon areas so desktop shortcuts remain usable.
Customize can toggle Lux and her mouse reactions and adjust her size and walking
speed. Her animation pauses with Lively playback. When furniture appears around
her at dawn, she steps onto clear floor before resuming her route.
Native face/Pet visibility follows the clips; see [source details](docs/SOURCES.md).

## Place Windows icons on the bench bands

The layout reserves **40 grouped icon positions: 18 on the upper bench band and
22 on the lower bench band**, outside the battlefield. These positions are
independent of the daytime classroom desks and remain available at night.

The local [desktop-layout helper](scripts/desktop-layout/README.md) positions
actual Windows icons through the documented Shell API. Importing the Lively ZIP
alone does not rearrange icons. Use a fresh inventory, review the grouped bench
plan, run its dry-run, and apply it with a new backup. The helper reads positions
back after applying them and writes an `.after.json` snapshot for verification.

The workstation's original **40-icon** layout remains backed up at
`build/desktop-layout/original.json`. It records native item identities, original
positions, icon size, spacing, view flags, and both monitors. Backups contain
local desktop data and are excluded from Git and the wallpaper package.

To restore the original layout from the repository root after building the helper:

```powershell
.\build\desktop-layout\bin\DesktopLayout.exe restore .\build\desktop-layout\original.json --backup .\build\desktop-layout\before-restore.json
```

Use a new backup filename if that file already exists. Add `--dry-run` to review
the restore without moving icons. A changed monitor arrangement or missing item
requires a reviewed mapping. The helper preserves the original backup, leaves
shortcut contents intact, and does not restart Explorer.

## Preview, media, and quality

Open the preview through a local server:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Visit `http://127.0.0.1:8765/wallpaper/index.html?preview=1`.
The browser may require **Enable soundtrack**. Preview controls are temporary;
use Lively's Customize menu to save settings.

The arena loops are **2560×1440 at 30 fps**, upscaled from Riot's 1080p reveal.
A small cleanup patch removes the Lux already baked into the footage, leaving
the live 3D companion as the moving character.

The portrait window MP4s are **1440×2560, 30 fps, 24-second seamless loops**.
They are upscaled from **941×1672 generated illustration masters**; the output
resolution does not imply native 1440×2560 source detail. Procedural lighting,
dust, glints, stars, and trails are encoded motion; the furnishings are part of
the fixed illustrations. The standalone window MP4s are silent, fixed-theme loops. The Lively ZIP
provides clock-based switching and separate full-length OGG music playback.
[Artwork process and masters](docs/ARTWORK.md) ·
[Window artwork prompts](docs/WINDOW-ART-PROMPTS.md) ·
[Classroom artwork prompts](docs/CLASSROOM-ART-PROMPTS.md).

The [v1.0 landscape MP4 exports](https://github.com/teykaijun/everything-goes-on-wallpaper/releases/tag/v1.0.0)
remain unchanged. The earlier v2.0 magical-study and v2.1 plain-window masters
are retained locally as historical sources. The current release retains v2.2's
furnished window masters in `wallpaper/media/window-magic/` and adds the painted
furniture atlas in `wallpaper/media/classroom-v4/desks.png`. Original game loops and
earlier artwork masters are retained when rebuilding the current media.

## Build locally

Requirements: Windows, Python 3.10+, Node.js with npm, the **.NET 10 SDK**, and
FFmpeg with H.264, VP9, AAC, and Vorbis support. The window builder uses
Pillow and imageio-ffmpeg. Lux conversion uses the separate
[lol2gltf release 2025-02-28-d36a532](https://github.com/Crauzer/lol2gltf/releases/tag/2025-02-28-d36a532).
Audio decoding uses [vgmstream CLI](https://github.com/vgmstream/vgmstream/releases).
The endpoint reader restores **LeagueToolkit 4.1.0-beta.53** from NuGet on its first
build. The finished wallpaper uses local assets and requires no network access.

Run these commands from the repository root.

### Dependencies and arena media

```powershell
npm ci
python -m pip install zstandard imageio-ffmpeg Pillow
```

Put the official reveal at `.sources/official-reveal.mp4`. Extract music from
your own game installation and build the original arena loops:

```powershell
python scripts/extract_arena_audio.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Maps\Shipping\Map22.wad.client" --decoder "C:\path\to\vgmstream-cli.exe"
python scripts/build_media.py --day-music ".sources/audio/647683973.wav" --night-music ".sources/audio/15668741.wav" --webm
```

The original media builder accepts `--ffmpeg PATH` or uses `imageio-ffmpeg`.
Its `--skip-visuals` option reuses existing visual renders.

### Native Lux and corrected clip endpoints

Save CommunityDragon's [hashes.game.txt.3](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.3)
and [hashes.game.txt.8](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.8)
in `.sources/lux/`, and place the lol2gltf executable at `.tools/lol2gltf.exe`.

```powershell
python scripts/extract_lux_assets.py --wad "C:\Riot Games\League of Legends\Game\DATA\FINAL\Companions.wad.client" --output ".sources/lux/extracted"
python scripts/extract_lux_glb.py --converter ".tools/lol2gltf.exe" --extracted ".sources/lux/extracted" --output "wallpaper/media/lux/star-guardian-lux.glb"
python scripts/build_lux_asset.py
npm run build:lux
```

The converter consumes `scripts/data/lux-native-animation-data.json` and runs
`scripts/extract_lux_endpoints.cs` in a temporary .NET 10 project at
`.sources/lux/EndpointReader/`. It evaluates each native animation's exact
endpoint and preserves the original duration before writing the GLB and
`animation-data.js`. NuGet packages are cached in `.tools/nuget/`.

### Cleanup and portrait window media

Supply the cleanup PNGs and the two window masters listed in
[ARTWORK.md](docs/ARTWORK.md). The current window masters are
`wallpaper/media/window-magic/day.png` and `wallpaper/media/window-magic/night.png`.
Also restore `wallpaper/media/classroom-v4/desks.png`, the 1254x1254 transparent
5x4 atlas used by the daytime furniture renderer. `wallpaper/classroom.js` draws
its twenty cells with SVG clipping, lighting and projected shadows;
`wallpaper/classroom-geometry.js` supplies the measured 20 placements and navigation data.
The [classroom prompts](docs/CLASSROOM-ART-PROMPTS.md) document the built-in
image generation and transparency pass; regenerating them produces new pixels.

```powershell
python scripts/build_v2_media.py --only arena
python scripts/build_window_media.py both
```

The first command creates `day-clean.webm` and `night-clean.webm` from the retained
arena loops and cleanup plates. The second creates the animated window
`day.mp4` and `night.mp4` beside their PNG masters. Pass `day` or `night` instead
of `both` to rebuild one window loop. `scripts/window_effects.py` draws the
procedural RGBA effects; the builder composites them over the unchanged masters.
Use `--preview-times 0,6,12,18` to save representative frames, `--output-dir PATH`
for a separate output folder. To read the retained v2.1 masters without replacing
their historical videos, combine `--media-dir wallpaper/media/window` with a
separate `--output-dir build/window-legacy-preview`. The older `build_v2_media.py --only study` path reproduces
the historical v2.0 study assets.

### Checks and package

```powershell
npm test
python scripts/package_wallpaper.py
dotnet build scripts/desktop-layout/DesktopLayout.csproj --configuration Release --output build/desktop-layout/bin
.\scripts\desktop-layout\Test-ReadOnly.ps1
```

The Lively output is `dist/Everything-Goes-On-TFT-Classroom-Lively.zip`.
Desktop helper checks perform inventory and dry-runs and verify that icon
positions remain unchanged. Game files are read without modifying the
installation. Game media, generated masters, local backups, and build packages
are excluded from Git.
