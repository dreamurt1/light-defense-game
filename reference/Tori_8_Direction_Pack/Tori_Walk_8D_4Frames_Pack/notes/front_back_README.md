# Tori Front / Back Walk Sprites

Two directions are included: 000° front and 180° back.

## Contents
- `000_front/`: f01–f04 individual 512×512 transparent PNGs
- `180_back/`: f01–f04 individual 512×512 transparent PNGs
- `strips/`: 2048×512 transparent four-frame strips

## Frame order
- f01: exact idle reference image copied unchanged
- f02: push-off
- f03: airborne (feet lifted about 6 px)
- f04: landing

## Technical notes
- Canvas: 512×512 RGBA PNG
- Ground line: y=496 for grounded frames
- Airborne frame feet: y≈490
- Character center: x≈256
- Same 1.06 scale factor applied to all six generated movement frames
- No mirroring
- Mint ribbon and folded ear stay on Tori's own left ear, as in each direction's idle reference
- No shadows, props, text, or background

The game can play f01 f01 · f02 · f03 · f04 f04 at its configured cadence.
