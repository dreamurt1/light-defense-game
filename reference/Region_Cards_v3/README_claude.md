# 새 지역 카드 팩 — Claude Code 점검 (2026-11-24)

기준: `order-v3-slots.md` 5절 · v3 비주얼 브리프 2-B · 기획 세션 검토 `hand-offs/chatgpt-v3-visual-26-1123-1526/review-2b-26-1124.md` · 지시서 `docs/plan/order-morning-cards-26-1124.md`(통과, 재의뢰 없음).

| 항목 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 크기 | 1024×512 불투명 | 두 장 모두 | ✓ |
| 지도·글 자리 | 왼쪽 1/3 위 · 오른쪽을 어둡고 단순하게 | 두 곳 모두 거의 단색으로 어두움 | ✓ |
| 내용 | 경계의 숲 / 어둠이 삼킨 외곽 | 울타리 길·바위·덤불 / 돌담·꺼진 등불·달 | ✓ |

- 자리: `art-src/backgrounds/region-border.png`·`region-dark.png` → `public/assets/backgrounds/region-*.webp`.
- 쓰는 곳: 아침 화면 새 지역 카드 `.morning__region` — B 구간 첫 아침 = region-border, C 구간 첫 아침 = region-dark(`data-band`), cover. 작은 지도 왼쪽·글 오른쪽 그대로, 어두운 반투명 판 없이 글(민트 제목·종이색 줄).
- 라이언 확인 항목: 휴대폰 밝은 곳에서 검은 띠로 보이는지(보이면 다음 판에서 한 단계 밝은 판 의뢰).
