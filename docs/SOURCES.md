# Media sources and credits

This personal fan wallpaper combines the **Everything Goes On** arena and
**Chibi Star Guardian Lux** from Teamfight Tactics with original furniture and
generated portrait artwork. It is not an official Riot Games product.

## Arena footage and design references

- Riot Games, Teamfight Tactics: [Everything Goes On Arena reveal](https://www.youtube.com/watch?v=CZ2_xdR4ts4), embedded in Riot's [Monsters Attack! Pass and More](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/monsters-attack-pass-and-more/) announcement.
- Production credits: [Kudos Productions — TFT Set 8 Arena Everything Goes On](https://kudos3d.artstation.com/projects/vDQvGY), and its [production showcase](https://www.youtube.com/watch?v=m0WojXky24A).
- User-supplied classroom composition reference: [YouTube Short](https://www.youtube.com/shorts/XF4bOEyCRtc), especially **00:13**, showing desktop icons arranged on classroom tables.
- Official character showcase reference: [Chibi Star Guardian Lux showcase](https://www.youtube.com/watch?v=A4iaVbYZbDg).

Arena loops use reveal sections at 00:06–00:15 (classroom/day) and 00:19–00:28
(starry alternate dimension/night), with a one-second tail-to-head dissolve.
The 1920×1080, 30 fps source is scaled to 2560×1440 with Lanczos.

Version 2.0 adds 40 original vector desks in a five-by-eight perspective layout.
These are authored in `wallpaper/classroom.js`, with coordinated daytime/nighttime
colors, icon slots, obstacles, and aisle waypoints. They are an adaptation inspired
by the reference rather than extracted Riot furniture meshes.

The small Lux already baked into the arena footage is removed with a generated
cleanup plate composited only within x=400, y=808, width=208, height=166 in the
2560×1440 output. The remaining arena composition uses the original footage.
The portrait monitor uses separate generated magical-study illustrations.
[Artwork masters and process](ARTWORK.md).

The v1.0 MP4 exports remain unchanged. The classroom, study, cleanup, and live
character composition belong to the v2 Lively package.

## Native Chibi Star Guardian Lux

Lux is the native **PetChibiLux / StarGuardian / Tier1** companion extracted
read-only from the user's installed `Game/DATA/FINAL/Companions.wad.client`.
Source paths are resolved with CommunityDragon's [game hash indexes](https://github.com/CommunityDragon/Data/tree/master/hashes/lol)
(`hashes.game.txt.3` and `hashes.game.txt.8`).

Geometry, skeleton, textures, and animations originate under
`assets/characters/petchibilux/themes/starguardian/`. The converted model
retains native Body, Weapons, Pet, and facial-expression submeshes. Body,
pet/staff, and expression TEX maps are decoded and embedded in the GLB. The asset
contains 13 submeshes, 11,306 vertices, and three embedded 512×512 RGBA texture maps.

The package contains these **17 native skeletal animation clips**:

| Purpose | Clips |
| --- | --- |
| Locomotion and rest | Idle, IdleIn, Run |
| Emotes | DanceIntro, DanceLoop, Laugh, LaughWacky, TauntIntro, TauntLoop, Joke |
| Additional native actions | Cast, CastLoop, ClassroomIntro, DiveIn, DiveOut, Hurt, Death |

The everyday companion uses locomotion, stopping, idle, and emote sequences.
The star menu exposes Dance, Laugh, Taunt, Joke, and Rest; the presence of the
other clips does not imply a corresponding menu control.

Face and Pet visibility timing is derived from
`data/characters/petchibilux/animations/starguardian.bin` and recorded in
`scripts/data/lux-native-animation-data.json`. The renderer follows those
18 visibility events while playing the original skeletal clips. Travel, navigation, turning,
scenery visits, and automatic emote selection are wallpaper behavior.

Conversion uses [Crauzer/lol2gltf](https://github.com/Crauzer/lol2gltf), release
[2025-02-28-d36a532](https://github.com/Crauzer/lol2gltf/releases/tag/2025-02-28-d36a532).
The .NET 10 endpoint reader uses [LeagueToolkit](https://github.com/LeagueToolkit/LeagueToolkit)
NuGet version **4.1.0-beta.53** to evaluate each animation at its native duration,
preserving the final sample omitted by the converter's frame sampling.
Both tools are GPL-3.0 licensed build dependencies and are not bundled in the
Lively wallpaper. The conversion and endpoint reader source is included in
`scripts/extract_lux_glb.py` and `scripts/extract_lux_endpoints.cs`.

The native model, textures, skeletal motion, and face/Pet visibility events are
retained. Riot's complete particle system and emote sound effects are not
recreated; effect/sound event metadata is preserved for reference. This is a
wallpaper adaptation, not a one-to-one reproduction of the TFT engine.

## Music

Riot's [patch 12.23 notes](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-12-23-notes/)
identify the arena soundtrack as an instrumental version of Porter Robinson's
**Everything Goes On**. The build reads the music banks from the user's local
League of Legends / TFT installation.

Music bank: `mus_map22_arenaskins_starguardian_classroom_audio.wpk`, in
`Game/DATA/FINAL/Maps/Shipping/Map22.wad.client`.

Selected files are `647683973.wem` for day (128.40764 seconds) and
`15668741.wem` for night (154.39490 seconds), stereo at 44.1 kHz. They were
matched against the production showcase by waveform correlation (0.9561 day,
0.9213 night). Original relative loudness is preserved; full music phrases loop
independently of the visuals. The dual-monitor setup uses one audible stream:
main display 35%, secondary display 0%, subject to Lively's global sound setting.

Extraction references:

- [CommunityDragon WAD reader](https://github.com/CommunityDragon/CDTB/blob/master/cdtb/wad.py).
- [vgmstream decoder](https://github.com/vgmstream/vgmstream).

## Runtime and desktop integration

The character renderer bundles [Three.js](https://github.com/mrdoob/three.js)
0.186.0 and its GLTFLoader, under the MIT license, copyright © 2010–2026
three.js authors. The full license accompanies the package at
`vendor/THREE-LICENSE.txt`.

The separate desktop-layout helper uses Microsoft's documented
[IFolderView positioning API](https://devblogs.microsoft.com/oldnewthing/20130318-00/?p=4933).
It saves actual desktop item identities and positions before changing them.
The workstation's original backup, `build/desktop-layout/original.json`, contains
local desktop data and is excluded from Git and releases.

- [Lively mouse input and property controls](https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-%3A-Interaction).
- [Lively video support](https://github.com/rocksdanister/lively/wiki/Web-Guide-VI-%3A-Webpage-Video-Support).
- [Lively pause events](https://github.com/rocksdanister/lively/wiki/Web-Guide-V-%3A-System-Data).
- [Lively per-display command-line controls](https://github.com/rocksdanister/lively/wiki/Command-Line-Controls).

Riot's artwork, character models, textures, animations, arena designs, and the
soundtrack remain the property of their respective owners. This code repository
grants no media redistribution license. Game media, generated artwork masters,
decoded audio, local icon backups, and output packages are excluded from Git.
