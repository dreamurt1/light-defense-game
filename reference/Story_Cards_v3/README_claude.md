# 이야기 카드 팩 — Claude Code 점검 (2026-11-24)

기준: `order-v3-slots.md` 5절 · v3 비주얼 브리프 2-B · 기획 세션 검토 `hand-offs/chatgpt-v3-visual-26-1123-1526/review-2b-26-1124.md` · 지시서 `docs/plan/order-morning-cards-26-1124.md`(통과, 재의뢰 없음).

| 항목 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 크기 | 1280×720 불투명 | 두 장 모두 | ✓ |
| 2 광원이 꺼진 밤 | 꺼진 광원 곁 빛을 잃어 가는 주민 | 광장 가운데 꺼진 별 등불 + 흐려지는 주민 실루엣 넷 | ✓ |
| 4 두 목소리 | 루미 가운데, 토리·도토 | 루미 고심(등불 없음·초록 눈·주황 스카프) · 토리(리본·접힌 귀가 컨셉 그림과 같은 자리) 바깥을 가리킴 · 도토(별 도토리) 루미 쪽으로 손 내밈 · 셋 다 팔 둘·다리 둘 | ✓ |

- 4번은 폴더의 최신본 한 장(README '팔·다리 수 가독성 수정')만 씀.
- 자리: `art-src/backgrounds/story-02-source.png`·`story-04-voices.png` → `public/assets/backgrounds/story-0*.webp`.
- 쓰는 곳: 이야기 카드 6장 중 2번째('source')·4번째('voices') 그림 칸 — 16:9, 글 자리는 그대로(세로 = 그림 아래, 가로 = 그림 오른쪽). 그림을 못 불러오면 예전 초상·도형 구성으로(`src/ui/Story.ts composedArt`, 지우지 않음).
