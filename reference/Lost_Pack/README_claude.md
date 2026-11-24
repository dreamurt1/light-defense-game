# 잃어버린 주민 팩(Lost_Pack) — Claude Code 점검·적용 (2026-11-24)

ChatGPT 2-C 1-2절 → 기획 세션 통과(`docs/plan/order-art-connect-26-1124.md` 10:55 — 옆모습 24장) → 개구리·고슴도치·레서판다 두 모습 시트의 **옆 칸**.

## 옆모습 점검 (각 종 빛을 잃은 모습 4 + 제 모습 4)
| 종 | 캔버스 | 발끝 | 가운데(상자) | 두 모습 맞춤(f02~f04) | 눈 |
|---|---|---|---|---|---|
| 개구리 | 512 투명, 덩이 1 | 494~495 (공중 칸 f03 = 437 — 폴짝, 땅은 496 그대로) | 255~257 | 높이·발끝·가운데 ±1 | 빛을 잃은 = 라벤더 흰자 없음, 제 모습 = 순한 눈 |
| 고슴도치 | 〃 | 494~495 | 254~256 | ±2 | 〃 |
| 레서판다 | 〃 | 492~495 | 255~258 | ±5 | 〃 |

## 자리
| ChatGPT 파일 | 생성 그림(art-src/enemies) | 시트 · 칸 | 칸 · 앵커 |
|---|---|---|---|
| `frog_lost_walk_090_right_f01~04` / `frog_walk_090_right_f01~04` | `frog-dark.walk_090_right_f0N.png` / `frog-true.walk_090_right_f0N.png` | `frog-dark`·`frog-true` 0~3(옆) | 64 · 발끝(상자 아래 60줄) |
| `hedgehog_lost_walk_090_right_…` / `hedgehog_walk_090_right_…` | `hedgehog-dark.…` / `hedgehog-true.…` | 0~3(옆) | 64 · 발끝 |
| `redpanda_lost_walk_090_right_…` / `redpanda_walk_090_right_…` | `redpanda-dark.…` / `redpanda-true.…` | 0~3(옆) | 72 · 발끝 |

- **앞·뒤**(2026-11-24 기획 세션 13:14 통과): 고슴도치·레서판다 앞·뒤 32장 → `art-src/enemies/<id>-dark|true.walk_000_front_f01~04`·`walk_180_back_f01~04` → 칸 4~7·8~11(발끝 494~495, 가운데 254~258). ~~개구리 앞·뒤는 옆 4장으로 대신~~ → **2026-11-24 15:4x 개구리 앞·뒤 16장 연결**(f01 수정본 — 떨어진 조각 없음, 발끝 495~496·공중 칸 f03 436~437, 가운데 254~261, 두 모습 높이 차 ≤ 6) → 칸 4~7·8~11. 같은 때 **빛을 잃은 뒷모습 외곽 빛**(라벤더 `#A89CD9` 테두리, ChatGPT 13:33~13:36) 고슴도치·레서판다 각 4장도 교체(개구리는 16장에 포함) — 높이 +4~6(테두리), 발끝·가운데 그대로. 판 위 확인 `sketches/lost-frontback-26-1124-1545/` (앞모습·뒷모습·구출 순간 제자리 교체). 캡처 `sketches/lost-precheck-26-1124-1048/frontback-front.png`·`frontback-back.png`.
- **캔버스 앵커 그대로**(`register: 'canvas'`): 개구리는 이것이 없으면 공중 칸(f03)이 땅에 붙어 폴짝이 사라진다. 제 모습은 빛을 잃은 모습 축척을 빌림(구출 순간 제자리 교체).
- 받은 팩 파일은 손대지 않음. 코드 그림(`src/art/enemies.ts`·`creatures.ts`)은 폴백.
