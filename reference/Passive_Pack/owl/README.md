# Passive Owl Pack

First visual asset pack for LIGHT DEFENSE v3, prepared from the supplied visual brief, order specification, and guide images.

## Contents

- 4 right-facing side-walk frames (owl_walk_090_right_f01 through f04)
- 4 front-walk frames (owl_walk_000_front_f01 through f04)
- 4 back-walk frames (owl_walk_180_back_f01 through f04)
- 1 front-facing cower pose (owl_cower)
- 2 right-facing flee frames (owl_flee_f01 and owl_flee_f02)

All sprites are individual 512×512 transparent PNG files. Walking frames use the same scale within each direction, are horizontally centered at x=256, and place the feet baseline at y=496. No left-facing sheet is included; mirror the right-facing side in the game as specified. Flee frames are right-facing.

The owl is presented as a timid, non-hostile passive resident with muted gray-blue plumage, large eyes with visible whites, a simple silhouette, and restrained warm edge light. Low-alpha exterior glow in the flee renders was removed when preparing the transparent sprites.

Frame numbers are 1-based and intended to play in ascending order. See manifest.json for the complete file list and metadata.