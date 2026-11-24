# 반딧불이 패시브 팩 `firefly` — Claude Code 점검 (2026-11-24)

기준: `order-v3-slots.md` · v3 비주얼 브리프 · 기획 세션 검토 `hand-offs/chatgpt-v3-visual-26-1123-1526/review-owl-26-1124.md` · 지시서 `docs/plan/order-passive-nowol-icons-26-1124.md`(네 팩 통과, 재의뢰 없음). 잰 도구: 헤드리스 캔버스(알파 > 24를 몸으로), 확인용 그림 `sketches/v3-packs-26-1124-0740/`.

## 잰 것

| 항목 | 목표 | 결과 | 판정 |
|---|---|---|---|
| 캔버스 | 512×512 투명 | 7장 모두 | ✓ |
| 몸 가운데(나는 종) | (256, 256) | 7장 모두 (255~256, 255~256) | ✓ |
| 한 종 한 축척 | 같은 배율 | 날갯짓·도망 높이 263~264 · 폭 404~430, 웅크림 279×299 | ✓ |
| 방향 | 옆은 오른쪽 | 날갯짓·도망 오른쪽 | ✓ |
| 웅크림 | 정면·겁먹은 눈(올빼미 기준) | 정면, 흰자 보이는 눈 | ✓ |
| 떨어진 조각·흰 가장자리 | 없음 | 7장 모두 덩이 1, 흰 가장자리 0 | ✓ |
| 작게 | 48px에서 읽힘 | 48px: 민트 빛나는 공 + 얼굴(의도대로) | ✓ |

- 민트 `#9ED9B5` 빛나는 배(큰 덩어리) + 작은 자두색 머리, 초록 눈. 배의 빛은 그림으로 충분 — 새 광원·이펙트는 만들지 않음(기획 지시서).

## 넣은 자리 (올빼미와 같은 기존 규칙)

| 받은 파일 | 게임 생성 그림 | 텍스처 키 · 애니 |
|---|---|---|
| `firefly_walk_090_right_f01~04.png` | `art-src/enemies/firefly.walk_090_right_f01~04.png` | `firefly` 칸 0~3 · `firefly-move`(8칸/초, 왼쪽은 뒤집기) |
| `firefly_cower.png` | `art-src/enemies/firefly-cower.cower.png` | `firefly-cower` 1칸(정면, 뒤집지 않음) |
| `firefly_flee_f01~02.png` | `art-src/enemies/firefly-flee.f01~02.png` | `firefly-flee` 2칸 · `firefly-flee-run`(8칸/초, 가로 부호로 뒤집기·세로로만 가면 직전 옆 방향) |

- 칸 48px, 앵커 = 몸 가운데(나는 종 상자 `align: 'center'`), 그림자는 기존 `CREATURES.firefly.cy`, 떠 있는 보브는 기존 ±4px(`Creature.animate`).
- 임시 코드 그림(`src/art/creatures.ts`)은 생성 그림 파일이 없을 때의 폴백으로 그대로.
