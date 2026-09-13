# Classroom furniture artwork - v2.4

Created with the built-in image_gen tool using the latest user-supplied TFT gameplay screenshot as the furniture style reference. The screenshot was registered to the existing arena using common scenery landmarks to measure seat placement and scale.

## Saved asset

E:/WallpaperDesign/wallpaper/media/classroom-v4/desks.png - 1254x1254 RGBA, twenty distinct desk/chair sprites in five columns and four rows. Every seat has its own belongings. This generated artwork adapts the native furniture appearance; it is not an extracted game mesh or a pixel-identical reproduction.

The first two outputs contained an opaque checkerboard. The third output supplies real alpha. The original generated PNG is preserved; SVG viewports select its cells and a render-time alpha transfer suppresses faint matte residue. Source centers are x=[134,380.5,626,871.5,1117], with viewport top y=[45,340,639,937], width 248 and height 259. Each viewport maps to a 160x166 logical sprite. Desktop width is approximately 192 source pixels, tabletop center is logical y=38 and planted chair feet are logical y=158.

The previous v2.3 master remains at wallpaper/media/classroom-v3/desks.png.

## Atlas generation prompt

Use case: stylized-concept.
Asset type: transparent furniture sprite atlas for a desktop wallpaper using the Teamfight Tactics Everything Goes On classroom arena.
Input image: the latest user-attached TFT gameplay screenshot is the exact reference for the DESK AND CHAIR shape, camera angle, material, color and proportions. It is a style reference only, not an edit target.
Primary request: create exactly TWENTY separate matching desk-and-chair furniture sprites in a precisely regular FIVE COLUMN by FOUR ROW atlas on a genuinely transparent RGBA background. All sprites same camera and same scale, each centered in its own equal square cell, no overlap between cells. Square canvas, at least 1500px each side if possible.
Match the furniture visible in screenshot: very simple chunky warm GOLDEN ORANGE school desktop with a flat broad top, cut/chamfered front corners, shallow thick front fascia, slim straight pale tan legs and a dark recessed compartment underneath. Small chair is ON THE NEAR / VIEWER SIDE of desk, facing away toward desktop. Its low rounded angular orange wooden backrest and small orange seat have thin pale brown tubular rails. Reference chair is much narrower than desk, about half desktop width, and does not tower above desktop. Three-quarter high overhead TFT game camera, symmetrical front view: broad tabletop visible from above, desk front edge horizontal, chair directly below on screen. NOT an isometric side view. Each sprite total silhouette height about 1.16 times tabletop width. Desktop width about 67% of cell width; whole furniture stays within middle 80% of cell. Consistent sprite bottom and top across cells.
Style: actual simplified softly shaded 3D game prop as in screenshot, flat clean faceted orange wood, minimal wood grain, soft warm light upper left, brown recesses, no outlined comic art, no decorative gold metal, no gothic furniture, no realism or high detail.
Retain INDIVIDUAL CHARACTER of each seat with small restrained Star Guardian themed belongings that do not obscure the desk:
row 1: purple closed book and white paper / tiny pink star pencil pouch and blue backpack / open cream notebook and mint pencil / violet water bottle with pink satchel / two small lavender books and teal star charm.
row 2: blue paper notebook and purple bag / white papers and pink star eraser / open book and tan canvas bag / small blue bottle and mauve pencil case / mint notebook and tiny golden star charm.
row 3: purple book and pink backpack / pale pages and blue pencil case / open cream book and rose satchel / two muted blue books and little teal mascot / pink flask and lavender notebook.
row 4: notebook and tan satchel / violet book and blue backpack / loose papers and pink pencil case / open book and muted teal bag / purple flask and tiny pink star mascot.
Belongings are small accents (mostly less than one quarter of desktop), backpacks hang at a SIDE, never hide the chair back. Every chair shape remains visible. Each of the 20 units must include exactly one desk and one chair.
Constraints: authentic transparent empty background, real alpha channel, no checkerboard pixels baked into output, no floor tiles, no room, no characters, no lettering or labels, no UI, no inventory icons. No long cast shadows baked into sprites, only furniture self-shading. Keep cell gaps fully empty and transparent. Match the simple small orange seats in reference, not elaborate full-size classroom furniture.

## First alpha extraction prompt

Use case: background-extraction.
Input image 1 is the EDIT TARGET: the twenty orange classroom desks just created in a five-column by four-row atlas.
Remove the entire gray-and-white checkerboard background and replace it with ACTUAL transparent pixels in the PNG ALPHA CHANNEL. The checkerboard is currently baked into RGB and must be removed, not repainted.
Preserve every desk, near-side orange chair, book, paper, bottle, backpack and mascot exactly. Preserve all20 sprites' position, size, shape, soft shaded colors and camera angle. Do not redraw, reorganize, add or omit anything. Keep identical 1254x1254 framing.
Extract clean furniture silhouettes including every gap between desk legs and chair rails, between bags and desks, and around tiny accessories. Preserve opaque surfaces and fine softly antialiased edges. Remove checkerboard EVERYWHERE behind and between furniture. No halos or colored matte. Output an RGBA PNG with genuinely transparent background, not gray, white or simulated checkerboard.

## Final alpha extraction prompt (selected output)

Use case: background-extraction. The last image is an edit target. Perform a transparent-background cutout of the furniture, output actual RGBA PNG. Delete the gray checkered backdrop completely. Every background pixel must have alpha=0, including the empty spaces inside leg and chair frames. This is a request for a TRANSPARENT PNG with an alpha channel. Do not output an RGB image of furniture on a checkerboard. The previous result still had an opaque checkered background and cannot be used as sprites.
Preserve all 20 golden desks and small orange near-side chairs, all belongings, exact positions, same5columns4rows1254square dimensions. Preserve solid orange wood, brown rails, colored belongings. Alpha0 transparent empty space, alpha255 opaque furniture, antialias silhouettes. No floor or backdrop, no added checkers. Keep the whole atlas and all furniture geometry unchanged.
