# Lumi Idle 8-Direction Sprite Pack

## Contents
- `PNG_256/`: 8 transparent RGBA sprites, each 256×256.
- `SVG_Vector/`: color-quantized, traced SVG path versions of the 8 sprites.
- `Parts_Reference_Crops/PNG/`: per-direction transparent crop references for head/face, eyes, body/legs, tail, scarf, and star badge.
- `manifest.json`: direction, angle, and asset metadata.

## Direction convention
0° front, 45° front-right, 90° right, 135° back-right, 180° back,
225° back-left, 270° left, 315° front-left.

The 225°, 270°, and 315° views are exact horizontal mirrors of the corresponding
135°, 90°, and 45° right-facing source views to enforce left/right consistency.

## Important production note
The `Parts_Reference_Crops` are transparent rectangular crops from the full sprite,
not fully isolated, independently riggable body-part layers. They are provided as
visual extraction references. For true skeletal/2.5D animation, each overlapping
part must be redrawn with hidden areas completed (head, torso, front/rear legs,
tail, scarf, eyes, badge) so that parts can move independently without gaps.

The SVG files are vector path traces of the raster sprites, using reduced color
palettes. They scale cleanly as vector artwork but may simplify fine painterly texture.
Use the PNGs when exact pixel appearance is preferred.
