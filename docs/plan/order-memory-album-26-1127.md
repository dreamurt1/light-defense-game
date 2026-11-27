# Order — "밤의 기억" album tab (collection of story cards + highlight cuts)
date: 2026-11-27 16:35 KST · from: claude.ai-planning → Claude-Code · decided by: Ryan (16:33)
priority: after current queue (Tori sprites 41 + 7-still integration). Not urgent. New screen = Ryan-approved exception.

## 1. Purpose
Highlight cuts show once and vanish; story cards cannot be re-viewed. The album turns them into a small collection (reward for rescuing Tori/Doto, meeting Nowol, first complete victory) and gives future cuts a home. No new art.

## 2. Placement
- Inside the existing "지난 밤들" screen (`RankingScreen` / records): add a second tab. Tab labels: "기록" (current content) · "밤의 기억" (new). No new home button.
- Landscape and portrait: reuse the shop's card grid (3 per row portrait, 5–6 per row landscape).

## 3. Entries (10) — order and unlock
| # | id | title (in-game, verbatim) | source image | unlocked when |
|---|---|---|---|---|
| 1 | story-01 | "마을" | Story_Cards_v3/story-01-village | story intro viewed once (`Progress.storySeen` or first run started) |
| 2 | story-04 | "두 목소리" | story-04-voices | same |
| 3 | story-02 | "광원이 꺼진 밤" | story-02-source | same |
| 4 | story-03 | "친구를 잃음" | story-03-lost-friends | same |
| 5 | story-05 | "파편" | story-05-shard | same |
| 6 | story-06 | "아침" | story-06-morning | same |
| 7 | cut-tori | "토리와 다시" | Highlight_Cuts_v1/cut-tori | `seenCuts` contains cut-tori |
| 8 | cut-three | "셋이 다시 모였어요" | cut-three | `seenCuts` contains cut-three |
| 9 | cut-nowol | "노월이 마음을 열었어요" | cut-nowol | `seenCuts` contains cut-nowol |
| 10 | cut-bright | "마을이 환해졌어요" | morning background (no dedicated art) | `seenCuts` contains cut-bright |
- Locked card: dark silhouette (image at 12% brightness + blur) + lock badge + one hint line (ASH): story cards → "이야기를 보면 열려요" / cut-tori → "토리를 되찾으면 열려요" / cut-three → "도토까지 되찾으면 열려요" / cut-nowol → "노월을 진정시키면 열려요" / cut-bright → "완전 승리를 하면 열려요".
- Unlocked card: thumbnail + title. Tap → full-screen viewer (same component as `HighlightCut`, read-only: image + title + the cut's dialogue line(s); story cards show their card text), swipe/arrows to prev/next, close button, system back closes.
- Counter in the tab header: "밤의 기억 {n}/10".

## 4. Data / code
- `src/data/album.json`: the 10 entries (id, title, image key, unlock key, hint). Images reuse the already-baked webp in `public/cuts/` and the story card assets — no new bakes.
- Unlock source of truth: `Progress.seenCuts` (cuts) + a new boolean `Progress.storySeen` (set true when the story intro finishes or is skipped). Keep backward-compat: if `storySeen` is undefined but `bestNight >= 1`, treat as true.
- Pure logic `systems/album.ts` (unlocked(entry, progress)) with Vitest.
- No new strings beyond the table above; add them to `world-and-story.md` 문장표 ("밤의 기억" section).

## 5. Do not
New home button · new art · changing `HighlightCut` behavior in-run · unlocking via test/tutorial runs (they don't write Progress) · forbidden words.

## 6. Tests / report
Vitest: unlock rules (storySeen fallback, each cut id), counter. `check:acceptance`: "지난 밤들 → 밤의 기억 탭 10칸, 잠금/열림". Captures: tab locked state, tab with 3 unlocked, viewer open (390×844 + 844×390). DECISION_LOG "2026-11-27 16:33 밤의 기억 앨범(라이언 확정)". Skill docs (`screens-and-services.md`) → zip → report to to-ClaudeAi with ETA; "zip 다시 올리기 필요" on top.
