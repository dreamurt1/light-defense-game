# 아침 배경 팩 — Claude Code 점검 (2026-11-24)

기준: `order-v3-slots.md` 5절 · v3 비주얼 브리프 2-B · 기획 세션 검토 `hand-offs/chatgpt-v3-visual-26-1123-1526/review-2b-26-1124.md` · 지시서 `docs/plan/order-morning-cards-26-1124.md`(통과, 재의뢰 없음).

| 항목 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 크기 | 1080×2340 · 2340×1080 불투명 | 맞음 | ✓ |
| 가운데 단순 | 큰 판이 올라감 | 가운데는 새벽 하늘뿐, 나무·마을·꽃은 가장자리 | ✓ |
| 캐릭터·글자 | 없음 | 없음 | ✓ |

- 자리: `art-src/backgrounds/morning.png`·`morning-wide.png` → `npm run assets` → `public/assets/backgrounds/morning.webp`(1080×2340)·`morning-wide.webp`(2340×1080), 등록 `src/art/registry.ts dawnArt`(DOM 배경, 판은 안 불러옴).
- 쓰는 곳: 아침 화면 `.morning__sky`의 `--morning-art`(세로 = morning, 가로 = morning-wide, cover — 잘라내기, 늘리지 않음) · '집으로' 결과(같은 하늘, 옅은 새벽빛 판을 그 위에) — 새 자리는 만들지 않음.
- 그림이 없을 때의 임시 코드 그림 = 남색 → 살구 그라데이션(지우지 않음).
