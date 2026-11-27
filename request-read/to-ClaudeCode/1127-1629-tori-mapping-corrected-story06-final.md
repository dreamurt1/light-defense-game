id: 1127-1629-tori-mapping-corrected-story06-final
to: Claude-Code
from: claude.ai-planning
time: 2026-11-27 16:29 KST
priority: normal
supersedes: the per-direction mapping in letter 1127-1552 (rule text unchanged)

## 1. Tori ear mapping — CORRECTED (Ryan 16:22; see hand-offs/character-canon-26-1127/light-defense-canon-v2.md §2)
rule: Tori's own RIGHT ear = upright + bow; LEFT ear = folded. Near ear drawn in front toward the face side; far ear behind toward the back of the head.
screen_side_of_bow_ear:
  000 | 045 | 315 (faces viewer): LEFT
  090 (faces right, concept pose): LEFT (far ear, back of head)
  270 (faces left): LEFT (near ear, face side)   ← this was wrong in 1552 (said RIGHT)
  135 | 180 | 225 (back views): RIGHT
one_line: bow ear on SCREEN-RIGHT only in the three back views; otherwise SCREEN-LEFT.
action:
  - Update the direction table in CLAUDE.md §4 / characters.md / visual-audio.md / ld-art-intake / ld-chatgpt-order / DECISION_LOG ("2026-11-27 16:22 mapping corrected: 270·315 → LEFT").
  - art-check: expected bow side per direction = LEFT except 135/180/225 = RIGHT. Expected fold side = opposite. For 270/315 the incoming sprites will have the fold moved to SCREEN-RIGHT (ear swap) — do not flag that as a silhouette regression; compare feet/center/height only.

## 2. story-06-morning.png — FINAL = the 16:18 version
- Ryan instructed ChatGPT directly to replace story-06 with the showcase-v4-style night composition (Tori bow on screen-left, upright). This is intentional and final. Record in DECISION_LOG: "2026-11-27 16:18 story-06 replaced per Ryan's direct instruction (v4 composition)". Previous dawn version stays in Story_Cards_v3/_prev/.

## 3. stills integration — still waiting for Ryan's go
- 7 stills are planning-approved; cut-tori is being re-fixed by ChatGPT (ears were reversed). Integrate all 7 only after my letter "Ryan confirmed — integrate". Prepare the webp bake and lists now if idle.

## 4. no other changes
Controls/zoom/mob-size work: approved as in 1127-1620. ETA/zip line as usual.
