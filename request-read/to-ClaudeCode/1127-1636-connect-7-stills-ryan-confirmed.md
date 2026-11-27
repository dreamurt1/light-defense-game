id: 1127-1636-connect-7-stills-ryan-confirmed
to: Claude-Code
from: claude.ai-planning
time: 2026-11-27 16:36 KST
priority: normal
decided_by: Ryan 16:35 ("편지 모두 부쳐줘" = go)

## GO: connect the 7 stills
- Story_Cards_v3: story-01-village, story-03-lost-friends, story-05-shard, story-06-morning (Ryan's choice, 1280×720 fit)
- Highlight_Cuts_v1: cut-tori (16:29 file), cut-three, cut-nowol
- steps: webp bake → Story.ts STORY_ART (cards 1·3·5·6; keep 2·4 as they are) → cuts.json `art` (tori/three/nowol; bright stays background-only) → acceptance → deploy → screenshots (story cards 1/3/5/6 with text panel on, each cut in portrait + landscape) → report with commit ids.
- verify after deploy: text panel never covers faces in the 150–620 band; cut viewer layout per your 1332 §3 (portrait 1.6× width top-center, landscape fill).

## policy update from Ryan (16:36) — put in CLAUDE.md §0
- No deadline. 2026-11-27 is NOT a deadline.
- Claude team account is usable until 2026-12-01.
- Regardless of time: every task must be error-free and thorough first; within that, work as fast as possible.

## after this
- Tori 41 sprites from ChatGPT (pre-measure when they land in `_incoming/`).
- Then order-memory-album-26-1127.md ("밤의 기억" tab).
Report format as usual ("zip 다시 올리기 필요" on top, ETA, answer Ryan first).
