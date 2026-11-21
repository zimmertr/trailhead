# AI art in trailhead

How trailhead uses the `generate-image` skill. The skill covers the models, the loop and the tools; this page covers what is particular to this game. Where they disagree, this page wins.

## Picture or code

Use a picture when the thing passes all four tests:

1. **One of a kind**, or a small set of variants.
2. **Still.** Anything that moves is drawn by code, on top of the picture if need be.
3. **Settled.** Its size and place won't keep shifting with the map; if they do, the picture is made again.
4. **Hand-composed detail matters more than tweaking it.** A picture can't have one part nudged; it is regenerated or edited.

And it is at least about 32 map pixels across. Smaller sprites come out no better than drawn ones.

Landmarks, the far layers of side-on scenes, mountains in scene backgrounds, close-ups and signs usually pass. Anything placed by rule, swaying, flowing or animated stays code. Reflections are code, drawn from the same picture data.

## Two ways to use a picture

- **Drawn by the game from the picture.** The picture becomes data: its outline, what each pixel is (rock, snow, ice) and how light it is. The code that draws that material in the game colours it with its own ramps, streaks and outline. Set the lightness so each step of a ramp shows in the same proportions as in the code it replaces, and read it through a tall, narrow blur (about 3 wide, 7 high) to get the world's vertical banding. Tried on the Sideproject Spires, it read as part of the world by day and at Dusk, with the picture's silhouette; its surface came out softer than the code's own. Stretch the picture to its slot rather than painting it at the slot's shape (see Making a landmark).
- **A reference for code.** An agent studies the picture and writes or changes the drawing code to match it. It fits the world by construction and stays editable, but it can only go as far as code can draw. Reading the Spires' summit heights and gullies into the existing code's numbers moved the layout but kept the code's own character; matching the picture's shapes needs new shape functions.
- **Never lay a picture's own pixels over the map.** Matched to the palette and laid over the map as it was, the Spires picture looked foreign: darker, browner, and in a texture nothing else in the world has. It looked fine in crops beside the game's art, so judge only in place.

## The style model

`z-image-turbo-trailhead` is Z-Image with a LoRA trained on the game's own art, so it paints in trailhead's look from the start: its larches, ridges and softer palette.

- **Start every prompt with "pixel art, side view scene,"** and then the subject. Leave out the trigger word "trlhd": the LoRA is always on, and the word gets drawn as lettering on signs.
- **Never ask it for an overhead map.** It comes back as a generic piece of the map instead of the subject.
- **Use it to see a place or landmark before it's built, and as a reference for code.** It paints at about four times the game's pixel size with its own dither, so its pixels are never laid over the map either. Whether it can replace the first pass of the landmark recipe below is untested.

## The look

- **Whimsical, designed 16-bit pixel art**, never photographic. A real place is the model, never the target: "inspired by Mount Rainier", not a copy of a photo. Never name an existing game, film or artist in a prompt; describe the qualities instead.
- **One pixel size.** One picture pixel is one map pixel. Never chunky pixels beside fine ones.
- **Light from the upper left**, as the code lights everything.
- **The map's view.** Mountains stand against the sky seen from the front, with only the ground in front seen from above. So paint a landmark as a landscape looking slightly down across foothills, and use only the part above the trees. Side-on scenes are seen from the side.
- **Never** a floating island or diorama, a radial or evenly spaced pattern, or a perfect cone. Describe irregularity outright, because the models default to symmetry.

## Making a landmark

Three passes on `qwen-image-2.1`, then fitting it in.

**1. Paint the composition.** Prompt only, several seeds. Paint it at about 1024x640 with the whole subject inside, whatever the shape of its place in the game; step 4 stretches it to fit. Asked to fill the slot's wide shape instead, the model flattened the Spires' summits into a lumpy ridge and ran the rock to the picture's edges. The painting decides the layout, so spend the seeds here.

> A clean, crisp digital gouache illustration for a video game background, looking slightly down across rolling forested foothills toward one huge [subject] standing alone in the middle distance. It fills only the middle half of the picture's width. The whole [subject] is visible, with wide clear blue sky on both sides of it and above it, and its ridges come down to low ground well inside the picture. The ground continues past every edge of the picture. [What it's inspired by, its outline, and where each feature sits, left to right. Say which things vary in size and which are rare.] [What grows at its foot.] Flat shapes with hard edges, few colours, strong light from the upper left, no texture noise.

Negative prompt, extended with the subject's own likely failures: `floating island, diorama, isometric tile, radial symmetry, evenly spaced, cropped, haze, fog, mist, text, border, frame, blurry, photo, film grain, pixel art`

**2. Shrink it onto the game's colours.** `cutout` the sky, `scale` to about 400 wide with `--resample box`, `palette --groups` onto the ramps of the subject alone, lay it back over a flat sky colour from the game, then `scale` up to about 1024 wide with `--resample nearest`. Shrink to about 400 even when the footprint is smaller: the repaint draws pixels the size of its input's, so a picture shrunk to a small footprint comes back with coarse pixels and flat faces. The final shrink to the footprint comes after the repaint.

**3. Repaint it as pixel art.** `edit` with the shrunk picture. Don't skip it for a pale, far subject: matched straight onto the six far colours, a range shrunk 2.2 times came out speckled, and repainted first it came out clean. Describe the content, not pixel-art technique; words like "clusters", "limited palette" and "outline" make the pixels chunky.

> Repaint this [subject] as a detailed, beautiful 16-bit pixel art illustration of [what it's inspired by]. Keep the exact outline, position and size of [the subject and its main features], and keep [the ground around it] where it is. Keep the exact silhouette of every summit as it is in this picture: [the shapes, for example the blunt square tops, the leaning one]. Do not sharpen any summit into a point. [The surface detail wanted, feature by feature, and how far each one reaches.]

Negative prompt for the repaint, extended the same way: `brick, masonry, stone blocks, tiles, grid, evenly spaced, identical towers, pointed peaks, needles, daggers, text, border, blurry`

- The repaint sharpens summits into points unless told to keep their silhouettes, so name the shapes it must keep.
- Whatever you name gets drawn everywhere. "Ledges, ribs and cracks" turned a whole rock face into brickwork, and "an icefall of blue blocks" put blue blocks over the whole glacier. So say how far each thing reaches: "a few ledges near the top", "blue ice only in the icefall".
- Every word is drawn literally. "A square summit block" and "a flat-topped tower" became chimneys, "smooth slabs" became a blank face, and "water streaks" became icicles. Describe shapes as rough and broken rather than as solids, and say what a thing is not ("dark grey stains, not ice").

**4. Shrink it to the footprint and fit it in.** `cutout` the sky again, `scale` to the footprint's `--width` and `--height` with `--resample box`, which usually stretches it about 1.75 times taller (the world's mountains are vertically exaggerated), match it again with the same groups, then fit it in and review it in the game. Leave out mist and haze: the game draws its own over the picture.

## Making a scene backdrop

A side-on scene's far layer is a wide strip that wraps round as it scrolls.

1. **Paint it side-on.** `--size 1024x384`: "seen straight from the side at eye level, filling the bottom half of the picture, with its foot along the bottom edge", running from edge to edge, with "no foreground, no trees". Paint it crisp and in full colour. Never ask for haze or distance: the far ramps make it far, and "pale and hazy" washed it out to almost white.
2. **Make it wrap** with the skill's recipe for a strip that tiles: `roll` by half, then `edit` to fill the join in the middle.
3. **Cut and match.** `cutout` the sky, crop off anything below the foot, `scale` to the strip's width, and match it to the far ramps.
4. **Repaint it if it shrinks much.** A strip painted at close to its final width matched cleanly as it was. Shrunk about 2 times or more, take it through the landmark's repaint first.

## Lettering

- **Only fixed words go in a picture**, and only those that are part of an object: a name routed into a sign, a label on a box. Words that change, or that are read as content (entries, distances that may move, anything on a card), are drawn by code in the game's fonts.
- **At least about 7 map pixels tall** after the final shrink. Smaller letters turn lumpy; draw those in the game's font on top of the picture instead.
- **Either model spells.** Use Ideogram when each line must sit in an exact place, Qwen otherwise, then the landmark passes from step 2. Put "Keep the lettering exactly as it is, letter for letter:" with the words in the repaint, and check the spelling after every step.
- **Paint the background crisp**, never out of focus: blur turns into flat blobs on the game's colours.

## Colours

- **Match each picture only to its material's ramps** with `palette --groups`. Matched to the whole palette, neighbouring pixels of one material land on unrelated ramps: it looks noisy and turns mottled at Dusk. Matched to its own ramps it looks like the game's own art.
- **Cut away the sky and the green first**, then match to the ramps of what's left, at both shrinks. Every other ramp you allow steals pixels: a rock face matched with the green ramps allowed put dark green in every shadow, and pale granite brighter than the top of its ramp fell onto the snow, sky or larch ramp, whichever was allowed.
- **Split materials that share a brightness.** Sunlit rock and snow are both near white, so in one match the rock fell onto the snow ramp. Pick out the snow by how it looks with `palette --part`: for example `--groups far --part 'farsnow:light>215,sat<40,blue>0'`.
- **Dusk comes free.** A picture made of palette indices turns to Dusk with everything else; never paint a separate Dusk picture.
- **Existing ramps first.** Add a ramp only when the existing ones visibly can't hold the look, give it Dusk colours, and say so first.
- **The palette file** for `--groups` comes from the game itself: load every module, then write `DAY`, `DUSK` and each entry's ramp name (`"names": {"57": "snow[2]"}`). Make it again whenever a ramp changes.

## Fitting a picture into the game

- **Become the same data as the code.** A picture is turned into exactly what the code it replaces returns: palette indices with `0` for nothing, a mask of its own pixels, and its outline. The game can't tell the difference.
- **Take the outline from the picture.** The top of the cut-out in each column is the skyline, and the ground's heights follow it.
- **Cut away the sky**, and **leave out the green** at the foot: the game's own trees and flowers go there, and they sway.
- **Keep margins.** Generate with sky on both sides and fit the whole subject inside its frame. A crop through a flank leaves a hard vertical edge.
- **Fit the footprint.** Scale to the ground it stands on, not past it.
- **Fade the foot** into the game's trees, never a straight cut.
- **Keep the source.** Each picture's chosen source PNG, its `log.jsonl` and the step that builds the game data from it go in Git beside the art. Candidates stay in the scratchpad. Move PNGs to Git LFS once the art passes about 50 to 100 MB.

## Reviewing a picture

The skill's review list, plus:

- Put it in place in the game before judging it at all, and look by day and at Dusk, beside what it replaces and its neighbours. Crops side by side hide a mismatch that is plain in place.
- No hard edges where it meets the land.
- The same pixel size and light as everything around it.

## Limits

- A picture doesn't move. Moving parts are code layers on top.
- When the layout moves, the picture is made again; its prompt log makes that quick.
- Below about 32 map pixels, draw it in code.
- Giving a model a crop of the map and asking it to copy that look doesn't work: over two rounds it gave a striped caricature, blue ice for rock, or ignored the crop. Use the style model for the look.
