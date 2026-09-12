# Artwork and scene composition

Version 2.0 combines original arena footage, a small generated cleanup patch,
original vector classroom furniture, and an independent generated portrait study.
All four PNG masters below were created or edited with the built-in
`image_gen` tool. The prompt descriptions are summaries of the requested
art direction, not exact generation transcripts.

## Generated masters

| Master path | Dimensions | Purpose |
| --- | --- | --- |
| `wallpaper/media/study/day.png` | 941×1672 | Portrait magical study in golden afternoon light |
| `wallpaper/media/study/night.png` | 941×1672 | Matching study in indigo, star-filled night |
| `wallpaper/media/cleanup/day.png` | 1672×941 | Day arena frame with the baked-in Lux locally removed |
| `wallpaper/media/cleanup/night.png` | 1672×941 | Night arena frame with the baked-in Lux locally removed |

Masters and derived media remain local under `wallpaper/media/` and are
excluded from Git. Retain these files to reproduce the same build; a new image
generation from the prompt summaries will produce different pixels.

## Portrait study prompt summaries

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

## Classroom furniture and icon composition

`wallpaper/classroom.js` draws **40 original SVG desks** in five rows of eight,
with perspective sizing, teal framing, wooden tops, chairs, shadows, and colors
that blend between the arena's day/night themes. This furniture is authored as
vector code and was not produced by image generation or extracted from Riot's
game files.

The composition follows the user's
[classroom desktop reference](https://www.youtube.com/shorts/XF4bOEyCRtc),
especially **00:13**, where shortcuts sit on classroom tables. The implementation
provides 40 slots to accommodate the actual workstation inventory. It also
exports obstacle and aisle data so Lux can move through the room.

Actual Windows icons are positioned separately with the documented Shell helper.
The artwork does not contain screenshots, copies, or baked-in pictures of those
shortcuts. The original desktop layout is kept in the local, Git-excluded
`build/desktop-layout/original.json` backup.

## Rebuild

After restoring the PNG masters and original arena loops:

```powershell
python scripts/build_v2_media.py
```

Use `--only arena` for the cleanup loops or `--only study` for the portrait
wrappers. The script requires `imageio-ffmpeg`. See [SOURCES.md](SOURCES.md) for
Riot footage, native character, music, software, and reference credits.
