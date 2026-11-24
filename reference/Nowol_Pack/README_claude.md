# 노월 팩 — Claude Code 점검 (2026-11-24)

기준: `order-v3-slots.md` · v3 비주얼 브리프 · 기획 세션 검토 `hand-offs/chatgpt-v3-visual-26-1123-1526/review-owl-26-1124.md` · 지시서 `docs/plan/order-passive-nowol-icons-26-1124.md`(네 팩 통과, 재의뢰 없음). 잰 도구: 헤드리스 캔버스(알파 > 24를 몸으로), 확인용 그림 `sketches/v3-packs-26-1124-0740/`.

## 잰 것

| 항목 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 캔버스 | 768×768 투명 | 5장 모두 | ✓ |
| 발끝 | y 745 | 5장 모두 744 | ✓ |
| 가운데 | x 384 | 383~384 (cast_angry는 로브·구슬로 폭 602) | ✓ |
| 같은 축척 | | 높이 650~653, 머리 크기 같음 | ✓ |
| 두 모습 | 눈 라벤더 / 잔불 주황 | calm 라벤더 · angry 주황 + 박쥐 실루엣(떨어진 덩이 = 박쥐, 의도) | ✓ |

- `witch_calmed`는 `idle_calm`과 표정만 조금 다름 → 192px에서 거의 같음. 진정 순간은 게임 연출(말풍선 '…조금은 믿어 볼게' + 기존 부활 빛기둥 `fx-respawn` 한 번)로 보여 줌 — 새 이펙트 없음.
- 앳된 소녀 마녀로 나옴 — 기획 채택, 라이언 확인 항목.

## 넣은 자리 (기존 시트 `witch`·`witch-angry`, 칸 192 · 7칸)

| 받은 파일 | 게임 생성 그림 | 칸 |
|---|---|---|
| `witch_idle_calm.png` | `art-src/enemies/witch.idle.png` | `witch` 0~3(대기 — 위아래로 띄움 dy 0·−1·−2·−1) |
| `witch_cast_calm.png` | `art-src/enemies/witch.cast.png` | `witch` 4~5(시전) |
| `witch_calmed.png` | `art-src/enemies/witch.calmed.png` | `witch` 6(진정) |
| `witch_idle_angry.png` | `art-src/enemies/witch-angry.idle.png` | `witch-angry` 0~3 |
| `witch_cast_angry.png` | `art-src/enemies/witch-angry.cast.png` | `witch-angry` 4~5 |
| `witch_calmed.png`(공용) | `art-src/enemies/witch-angry.calmed.png` | `witch-angry` 6 |

- 분노한 노월은 찾아온 노월 축척을 빌림(`scaleFrom: 'witch'`) — 같은 사람 크기. 좌우 뒤집지 않음.

## 2026-11-24 교체

- `witch_calmed.png` 눈 감은 미소 + 두 손 모음 판(선택 수정)으로 교체 — 768×768, 발끝 744, 가운데 383, 같은 축척 → `art-src/enemies/witch.calmed.png`·`witch-angry.calmed.png` 다시 넣고 `npm run assets`. 진정 순간 연출(말풍선 + 부활 빛기둥)은 그대로.
