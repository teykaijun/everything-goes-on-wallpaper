# Media sources and credits

This is a personal fan wallpaper using the actual **Everything Goes On** arena
and **Chibi Star Guardian Lux** from Teamfight Tactics. It is not an official
Riot Games product.

## Visuals

- Riot Games, Teamfight Tactics: [Everything Goes On Arena](https://www.youtube.com/watch?v=CZ2_xdR4ts4).
- The reveal is embedded in Riot's official [Monsters Attack! Pass and More](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/monsters-attack-pass-and-more/) announcement.
- Production credits: [Kudos Productions — TFT Set 8 Arena Everything Goes On](https://kudos3d.artstation.com/projects/vDQvGY), and its [production showcase](https://www.youtube.com/watch?v=m0WojXky24A).

The wallpaper uses clean reveal sections at 00:06–00:15 (classroom/day) and
00:19–00:28 (starry alternate dimension/night). A one-second tail-to-head dissolve
makes each visual repeat smoothly. There is no AI-generated replacement artwork.

The source is 1920×1080 at 30 fps. Output is **2560×1440 at 30 fps**, scaled using
Lanczos. This is a QHD export, not native 1440p source detail.

Version 1.1 keeps the complete arena on landscape screens and centers the board
on portrait screens, with a cropped outer room and a blurred ambient extension
sampled from the same video. The 3D character and responsive composition are live
Lively features; the v1.0 landscape MP4 exports remain unchanged.

## Chibi Star Guardian Lux

Lux is the native **PetChibiLux / StarGuardian / Tier1** companion from the user's
locally installed `Game/DATA/FINAL/Companions.wad.client`. The extraction script
reads the WAD without modifying the game installation. Asset paths are resolved
with CommunityDragon's [game hash indexes](https://github.com/CommunityDragon/Data/tree/master/hashes/lol)
(`hashes.game.txt.3` and `hashes.game.txt.8`).

The source assets are under
`assets/characters/petchibilux/themes/starguardian/`:

- Native tier-one SKN geometry and SKL skeleton, using the initially visible
  `Body`, `Weapons`, `Face_Basic`, and `Face_Basic_Eyes` submeshes.
- Native body, eye-expression, and pet/staff TEX maps, decoded and embedded in the GLB.
- `petchibilux_starguardian_idle.anm`, exposed as `Idle` (1.9666668 seconds).
- `petchibilux_starguardian_run.anm`, exposed as `Walk` (0.73333335 seconds).
  The wallpaper controller supplies travel, turning, speed, and idle breaks.

The local conversion pipeline is `scripts/extract_lux_assets.py`,
`scripts/extract_lux_glb.py`, and `scripts/build_lux_asset.py`.
SKN/SKL/ANM/TEX conversion uses [Crauzer/lol2gltf](https://github.com/Crauzer/lol2gltf),
release [2025-02-28-d36a532](https://github.com/Crauzer/lol2gltf/releases/tag/2025-02-28-d36a532),
a GPL-3.0-licensed conversion tool. The converter is a separate build dependency
and is not bundled in the wallpaper. Lux's model, textures, and animations remain
Riot Games assets.

## Music

Riot's [patch 12.23 notes](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-12-23-notes/)
identify the arena soundtrack as an instrumental version of Porter Robinson's
**Everything Goes On**. The build reads the arena music banks from the user's
locally installed League of Legends / TFT game files. It does not use a vocal
cover or a synthesized imitation.

Music bank: `mus_map22_arenaskins_starguardian_classroom_audio.wpk`, in
`Game/DATA/FINAL/Maps/Shipping/Map22.wad.client`.

Selected in-game files: `647683973.wem` for day (128.40764 seconds) and
`15668741.wem` for night (154.39490 seconds), stereo at 44.1 kHz. These were
matched against the production showcase by waveform correlation (0.9561 day,
0.9213 night). Their original relative loudness is preserved. The full music
phrases loop independently of the short visual loops in Lively.

Extraction format references:

- [CommunityDragon hash index](https://github.com/CommunityDragon/Data/blob/master/hashes/lol/hashes.game.txt.8)
- [CommunityDragon WAD reader](https://github.com/CommunityDragon/CDTB/blob/master/cdtb/wad.py)
- [vgmstream decoder](https://github.com/vgmstream/vgmstream)

Artwork, character models, textures, animations, arena designs, and soundtrack
remain the property of their respective owners. No media redistribution license
is granted by this code repository. Source media, extracted character assets,
decoded game audio, and local export packages are excluded from Git.

## Runtime software

The character renderer bundles [Three.js](https://github.com/mrdoob/three.js),
version 0.186.0, including its GLTFLoader. Three.js is MIT licensed,
copyright © 2010–2026 three.js authors. Its full license accompanies the live
package at `vendor/THREE-LICENSE.txt`.

## Runtime references

- [Lively property controls](https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-%3A-Interaction)
- [Lively video codec support](https://github.com/rocksdanister/lively/wiki/Web-Guide-VI-%3A-Webpage-Video-Support)
- [Lively pause events](https://github.com/rocksdanister/lively/wiki/Web-Guide-V-%3A-System-Data)
- [Lively metadata example](https://github.com/rocksdanister/clouds/blob/main/LivelyInfo.json)
- [Lively per-display command-line controls](https://github.com/rocksdanister/lively/wiki/Command-Line-Controls)
