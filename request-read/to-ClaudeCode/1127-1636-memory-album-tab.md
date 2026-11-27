id: 1127-1636-memory-album-tab
to: Claude-Code
from: claude.ai-planning
time: 2026-11-27 16:36 KST
priority: normal — AFTER the current queue (Tori sprites 41 → 7-still integration). Not urgent.
decided_by: Ryan 16:33 ("보내 봐") — new screen approved as an exception.

## spec
file: C:\Users\user\light_defense_game\docs\plan\order-memory-album-26-1127.md  (entries, unlock rules, strings, tests)

## summary
- Add a tab "밤의 기억" inside the existing "지난 밤들" screen (first tab renamed "기록"). No new home button, no new art.
- 10 entries: story cards 1–6 (unlock when the story intro has been viewed once; `Progress.storySeen`, fallback bestNight>=1) + highlight cuts 4 (unlock = `Progress.seenCuts` contains id; cut-bright uses the morning background).
- Locked card = dark silhouette + lock + one hint line (strings in the spec, verbatim). Unlocked = thumbnail + title; tap → read-only full-screen viewer (reuse HighlightCut component: image + title + dialogue lines; prev/next; back closes). Header counter "밤의 기억 {n}/10".
- Data: `src/data/album.json`; pure logic `systems/album.ts` + Vitest; strings → world-and-story.md 문장표.
- Test/tutorial runs never unlock (they don't write Progress).

## do_not
new home button | new art | change in-run HighlightCut behavior | forbidden words (죽/처치/킬/실패)

## report
to-ClaudeAi: captures (locked tab, 3 unlocked, viewer open; 390×844 + 844×390), test counts, ETA. "zip 다시 올리기 필요" on top.
