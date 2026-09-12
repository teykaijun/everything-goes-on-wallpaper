# Media sources and credits

This is a personal fan wallpaper using the actual **Everything Goes On** arena
from Teamfight Tactics. It is not an official Riot Games product.

## Visuals

- Riot Games, Teamfight Tactics: [Everything Goes On Arena](https://www.youtube.com/watch?v=CZ2_xdR4ts4).
- The reveal is embedded in Riot's official [Monsters Attack! Pass and More](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/monsters-attack-pass-and-more/) announcement.
- Production credits: [Kudos Productions — TFT Set 8 Arena Everything Goes On](https://kudos3d.artstation.com/projects/vDQvGY), and its [production showcase](https://www.youtube.com/watch?v=m0WojXky24A).

The wallpaper uses clean reveal sections at 00:06–00:15 (classroom/day) and
00:19–00:28 (starry alternate dimension/night). A one-second tail-to-head dissolve
makes each visual repeat smoothly. There is no AI-generated replacement artwork.

The source is 1920×1080 at 30 fps. Output is **2560×1440 at 30 fps**, scaled using
Lanczos. This is a QHD export, not native 1440p source detail.

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

Artwork, arena designs, and soundtrack remain the property of their respective
owners. No media redistribution license is granted by this code repository.
Source media, decoded game audio, and local export packages are excluded from Git.

## Runtime references

- [Lively property controls](https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-%3A-Interaction)
- [Lively video codec support](https://github.com/rocksdanister/lively/wiki/Web-Guide-VI-%3A-Webpage-Video-Support)
- [Lively pause events](https://github.com/rocksdanister/lively/wiki/Web-Guide-V-%3A-System-Data)
- [Lively metadata example](https://github.com/rocksdanister/clouds/blob/main/LivelyInfo.json)
