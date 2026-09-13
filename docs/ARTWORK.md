# Artwork and scene composition

## Version 2.4 - TFT screenshot seating (current landscape)

The latest user-supplied TFT gameplay screenshot defines **20 seats in four rows of five**. Matching arena scenery landmarks registers that screenshot to the existing 2560x1440 scene; the measured tabletop centers, row spacing, widths and perspective determine the current geometry. The first-row desktops are about 102 pixels wide, increasing to about 127 pixels at the front. The chairs sit on the near/viewer side and their planted feet set depth ordering.

The built-in `image_gen` tool created **20 distinct golden-orange desk/chair sprites** with individual books, paper, bags, pencil cases, bottles and small Star Guardian accents. The selected **1254x1254 RGBA 5x4 atlas** is `wallpaper/media/classroom-v4/desks.png`. Two extraction attempts were needed; the selected PNG has real transparency. Viewports select original pixels without rewriting the master. Directional shading and restrained ground shadows blend the furniture into the original animated arena. [Exact prompts](CLASSROOM-ART-PROMPTS.md).

This is generated artwork adapted to the native furniture silhouette, material and reference composition. It is not a pixel-identical screenshot reproduction or an extracted game mesh. The previous furniture atlas remains locally in `media/classroom-v3/`. Night furniture removal, Lux interactions, bench icon placement, portrait window and the reduced 21% main volume remain active.

## Version 2.3 — natural daytime classroom (retained)

The daytime furniture now follows the user's September 13 classroom screenshot more closely: chairs sit on the near, viewer-facing side of the wooden tabletops. A transparent **1254×1254 RGBA atlas**, `wallpaper/media/classroom-v3/desks.png`, contains **12 painted variants in a 4×3 grid**, with different books, papers, bottles, and bags. The built-in `image_gen` tool produced the illustrations, followed by a second pass to extract them onto transparency. [Exact classroom prompts and saved paths](CLASSROOM-ART-PROMPTS.md).

The twelve illustrations repeat across **24 placements in four rows of six**. `wallpaper/classroom-geometry.js` adds small individual offsets, perspective scaling, and restrained rotations. `wallpaper/classroom.js` renders the atlas cells inside SVG containers with warm window-side shading and long projected floor shadows. Furniture remains still while the surrounding arena footage moves; it disappears at night with its collision footprints and desk-visit targets.

This is generated fan artwork adapted to the reference's orientation, materials, and lighting. It is not a one-to-one game asset reconstruction. The 40 bench icon positions, native Lux companion, arena cleanup, and v2.2 portrait window remain in place. Music now defaults to 21% on the main display and 0% on the secondary display, a 40% relative reduction from the previous main volume of 35%.

## Version 2.2 — furnished Star Guardian window (current portrait)

The current portrait scene adds personal belongings to the arena-style window while retaining the aligned rectangular frame, curtains, sill, and room geometry. Both 941×1672 masters were created with the built-in `image_gen` tool. They are generated fan illustrations, not extracted game assets. [Exact prompts and saved paths](WINDOW-ART-PROMPTS.md).

| Current asset | Dimensions | Purpose |
| --- | --- | --- |
| `wallpaper/media/window-magic/day.png` | 941×1672 | Furnished window in golden afternoon light |
| `wallpaper/media/window-magic/night.png` | 941×1672 | Aligned magical night window with relit and rearranged belongings |
| `wallpaper/media/window-magic/day.mp4` | 1440×2560 | 24-second day loop, 30 fps, silent |
| `wallpaper/media/window-magic/night.mp4` | 1440×2560 | 24-second night loop, 30 fps, silent |

**Day direction:** a pink star planter with green leaves and pink flowers, a mint pencil cup, pastel star books, and a wing-trimmed pink satchel on the sill. White-and-pink trainers sit on the right floor. Warm school rooftops and golden afternoon lighting remain visible through the window.

**Night direction:** the plant glows cyan-purple, with a cyan star lantern, open spellbook, and pink star crystal on the sill. The bag moves to the left floor, and the shoes pick up violet reflections. The window retains the arena's magenta-indigo cosmic palette.

The window structure and furnishings are fixed raster artwork within each theme. The MP4s add actual encoded motion: visible dust and sunshafts by day; four-point glints, orbiting gold stars with cyan-pink trails, and local prop glows by night. These original procedural effects are authored for the wallpaper and do not reproduce Riot's particle engine. The 1440×2560 output is upscaled from the 941×1672 masters, not native 2K illustration detail.

Rebuild the current loops with Python, Pillow, and imageio-ffmpeg:

```powershell
python -m pip install Pillow imageio-ffmpeg
python scripts/build_window_media.py both
```

The builder uses `scripts/window_effects.py` for the transparent effect layers. `--preview-times 0,6,12,18` saves representative frames; `--output-dir PATH` selects a separate output folder. Lively provides the local-clock theme switch, 8-second crossfade, and separate music. The standalone MP4s are silent fixed-theme videos.

Version 2.2 retained the v2.1 landscape scene while adding this furnished portrait view. Version 2.3 replaces the daytime desk artwork and placements as described above. The earlier window, study, and cleanup masters below remain available locally; current builds do not overwrite them.

## Version 2.1 retained window sources and daytime seats

Version 2.1 used a close view of the arena's ordinary rectangular school windows without the new sill and floor belongings. The aligned masters use warm afternoon and electric blue-magenta night palettes and were made with the built-in `image_gen` tool. These historical files are retained under `wallpaper/media/window/`.

| Retained v2.1 asset | Dimensions | Purpose |
| --- | --- | --- |
| `wallpaper/media/window/day.png` | 941×1672 | Window in golden classroom light |
| `wallpaper/media/window/night.png` | 941×1672 | Same window under the cosmic night palette |
| `wallpaper/media/window/day.mp4` | 1440×2560 | 24-second day loop, 30fps |
| `wallpaper/media/window/night.mp4` | 1440×2560 | 24-second night loop, 30fps |

The MP4s are upscaled exports with periodic illumination and drifting dust/starlight. The window frames remain still. Lively supplies automatic clock switching and the 8-second transition; an MP4 by itself does not read the Windows clock.

Version 2.1's daytime classroom had 24 individually styled desk-and-seat combinations: differently placed books, papers, pencil cases, bottles and bags. These repo-native SVG details were inspired by the belongings visible in the user's [reference at 0:13](https://www.youtube.com/watch?v=XF4bOEyCRtc&t=13s). They are an adaptation rather than a seat-for-seat model extraction. Added furniture disappears at night. Desktop icons now occupy compact upper/lower bench bands outside the battlefield and are independent of the furniture.

## Version 2.0 retained sources

The earlier study masters and original cleanup plates below are retained locally. They are not the active portrait design in the current release.

Version 2.0 combines original arena footage, a small generated cleanup patch,
original vector classroom furniture, and an independent generated portrait study.
All four PNG masters below were created or edited with the built-in
`image_gen` tool. The prompt descriptions are summaries of the requested
art direction, not exact generation transcripts.

## Version 2.0 generated masters

| Master path | Dimensions | Purpose |
| --- | --- | --- |
| `wallpaper/media/study/day.png` | 941×1672 | Portrait magical study in golden afternoon light |
| `wallpaper/media/study/night.png` | 941×1672 | Matching study in indigo, star-filled night |
| `wallpaper/media/cleanup/day.png` | 1672×941 | Day arena frame with the baked-in Lux locally removed |
| `wallpaper/media/cleanup/night.png` | 1672×941 | Night arena frame with the baked-in Lux locally removed |

Masters and derived media remain local under `wallpaper/media/` and are
excluded from Git. Retain these files to reproduce the same build; a new image
generation from the prompt summaries will produce different pixels.

## Version 2.0 portrait study prompt summaries

**Day:** create a cohesive vertical magical study suitable for a portrait
wallpaper, with a prominent window, a Poro, a wand, and a welcoming desk/study
setting. Use warm golden afternoon light, soft illustrated materials, and an
uncluttered foreground. Compose the room for a tall monitor rather than
cropping a landscape arena.

**Night:** preserve the study's composition, furniture, window, Poro, and wand
while changing the lighting to a deep indigo magical night with stars. Keep the
day/night views aligned so their crossfade reads as a change of time in the same
room.

The study is AI-generated fan artwork; it is not an extracted TFT arena or a
captured in-game scene. The portrait presentation uses room artwork and ambient
effects. Native 3D Lux is enabled on the landscape classroom.

`scripts/build_v2_media.py` encodes each master into a silent two-second
**1440×2560, 30 fps H.264 MP4** using Lanczos scaling. These are still-image video
wrappers for the existing media scheduler. The live player supplies gentle
atmospheric motion. Export resolution exceeds the
941×1672 illustration masters and should not be described as native 2K detail.

## Arena cleanup prompt summaries and scope

For each day/night reference frame, remove only the small Lux already visible
near the lower-left part of the arena. Reconstruct the floor/background behind
her while preserving the scene's geometry, lighting, palette, and surrounding
details. The task is a local object removal, not a redesign of the arena.

The full cleanup master is scaled to the 2560×1440 arena canvas, but only this
rectangle is composited into the original moving loop:

- **x:** 400
- **y:** 808
- **width:** 208
- **height:** 166

The patch uses a **12-pixel feather**. Output files are
`wallpaper/media/day-clean.webm` and `wallpaper/media/night-clean.webm`.
The remaining frame retains the original arena footage; the original
`day.webm` and `night.webm` loops and v1.0 MP4 exports are retained.

## Version 2.0 classroom furniture and icon composition

Version 2.0's `wallpaper/classroom.js` drew **40 original SVG desks** in five rows of eight,
with perspective sizing, teal framing, wooden tops, chairs, shadows, and colors
that blend between the arena's day/night themes. This furniture is authored as
vector code and was not produced by image generation or extracted from Riot's
game files.

The composition follows the user's
[classroom desktop reference](https://www.youtube.com/shorts/XF4bOEyCRtc),
especially **00:13**, where shortcuts sit on classroom tables. The implementation
provided 40 desk slots to accommodate the workstation inventory and exported
obstacle and aisle data for Lux. Since v2.1, icons use the separate bench bands
and the daytime classroom uses 24 placements. Version 2.3 replaces the vector desk artwork with twelve painted atlas variants.

Actual Windows icons are positioned separately with the documented Shell helper.
The artwork does not contain screenshots, copies, or baked-in pictures of those
shortcuts. The original desktop layout is kept in the local, Git-excluded
`build/desktop-layout/original.json` backup.

## Rebuild the historical v2.0 media

After restoring the PNG masters and original arena loops:

```powershell
python scripts/build_v2_media.py
```

Use `--only arena` for the cleanup loops or `--only study` for the portrait
wrappers. The script requires `imageio-ffmpeg`. See [SOURCES.md](SOURCES.md) for
Riot footage, native character, music, software, and reference credits.
