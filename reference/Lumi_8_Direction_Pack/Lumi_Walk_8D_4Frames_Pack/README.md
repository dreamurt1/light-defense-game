# Lumi Walk Sprite Pack — 8 directions × 4 frames

## Included
- `PNG_256/`: 32 transparent 256×256 RGBA frames, grouped by direction.
- `SVG_Vector/`: 32 color-quantized vector-traced SVG versions.
- `SpriteSheets/`: 8 horizontal 4-frame sprite sheets (1024×256).
- `manifest.json`: directions, frame order, and source notes.

## Direction order
0° front, 45° front-right, 90° right, 135° back-right,
180° back, 225° back-left, 270° left, 315° front-left.

## Frame naming
`lumi_walk_<degrees>_<direction>_f<01-04>.png` (and `.svg`).

## Implementation suggestion
Use the PNG frames for runtime rendering. Play frames 01→02→03→04→01 at
6–10 FPS to start; adjust timing after testing. Keep the sprite origin and
ground baseline fixed. Movement/aiming direction should remain independent.

## Accuracy note
The uploaded reference archive contained one genuine 4-frame right-facing walk
cycle plus 8 idle directions. The 90° frames reuse that walk cycle; 270° frames
are exact horizontal mirrors. The other six directions are derived from the
matching idle views with subtle procedural body bob and lower-body deformation.
They are useful as a first-pass directional animation set, but their leg poses
are not individually hand-illustrated. Review in-game before treating them as
final polished animation. SVG files are traced vector paths and simplify some
raster shading and painterly texture.
