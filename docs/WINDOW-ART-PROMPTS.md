# Arena window artwork — final prompts

Created with the built-in `image_gen` tool, not the API/CLI fallback.

Saved masters:

- `E:/WallpaperDesign/wallpaper/media/window/day.png`
- `E:/WallpaperDesign/wallpaper/media/window/night.png`

Both masters are 941×1672. The 1440×2560 MP4s are upscaled derivatives.

## Day prompt

Use case: stylized-concept. Asset type: portrait 9:16 desktop wallpaper artwork, intended to become a 1440x2560 MP4. Input image 1 is a STYLE AND ARCHITECTURE REFERENCE ONLY: the Everything Goes On TFT arena in warm daylight. Create a new close-up composition looking toward the SAME SCHOOL WINDOW style on the left wall of that reference. Tall ordinary RECTANGULAR school windows with thick muted lavender-brown/purple painted mullions and crossbars, multiple large rectangular glass panes, simple warm cream curtains gathered at the sides, soft chunky hand-painted stylized 3D game rendering. Window occupies almost the entire portrait image: tall frame, upper transom, central vertical division and horizontal crossbars, a modest wooden sill at the bottom; only a narrow strip of warm classroom wall and honey wooden floor. This is the same TFT classroom seen closer, not a different fantasy building. Golden afternoon sun comes through the panes, orange-yellow sky and a softly simplified distant school/city roofline outside; warm amber shafts and calm soft cloud shapes. Match the reference's purple window frames, cream fabric, golden orange light, gentle low-detail painted game materials and slightly rounded beveled edges. Composition nearly straight-on, modest perspective depth, clean readable window silhouette, fill all 9:16 edges, no borders. Keep curtains and window framing fixed and symmetrical enough to match a later night variant. No person or Lux, no furniture filling the foreground, no castle, no gothic arches, no hanging star mobile, no desk, no text, no logo, no watermark, no photorealism. Produce a polished full-resolution portrait illustration.

## Night edit prompt

Use case: lighting-weather. Asset type: night companion for an exactly matched portrait 9:16 desktop wallpaper pair. Input image 1, the generated portrait school window in golden daylight, is the EDIT TARGET. Input image 2, the wide purple Everything Goes On TFT arena screenshot, is ONLY the NIGHT LIGHTING / PALETTE reference. Change the portrait window artwork into the same arena's magical night theme. Preserve EXACTLY the target's window frame geometry, every rectangular pane boundary, central thick vertical mullion, horizontal bars, camera perspective, curtains and tie-back silhouettes, sill, wall and floor placement, and the 9:16 framing. The paired day/night images must align for a smooth crossfade. Relight the wooden window frames as electric periwinkle and cobalt-violet with soft cyan edge glow, matching the reference arena's left windows. Replace golden sky and distant city view within the glass with a beautiful soft magenta-purple-pink cosmic nebula, deep indigo areas and a few delicate white/cyan stars, so it looks out into the SAME glowing dreamlike night space as the arena. No moon, no sun. The cream curtains remain in the same exact positions, now dim lavender with pink and blue reflected light. Soft pink and blue rectangular light falls across the same sill and narrow floor strip. Rich night atmosphere with strong dark-light balance and restrained glow, legible 3D game-style bevels and hand-painted materials. No new decorations, no person, no Lux, no furniture, no castle, no arches, no text, no logos, no border, no watermark, no photorealism. Keep the structure locked; change only the illumination and the view through the panes. Full portrait resolution.

The selected night result retains the matching roofline under the cosmic sky. This is generated fan artwork inspired by the arena, not a native game asset extraction.

## MP4 animation

`python scripts/build_window_media.py both` creates the two 24-second, 30fps H.264 loops. The window structure stays fixed. A soft translucent light pulse and eight sparse dust/starlight particles move periodically; the loop returns to the same lighting. There is no embedded audio. Lively chooses day or night using the local clock and the same schedule as the main arena.
