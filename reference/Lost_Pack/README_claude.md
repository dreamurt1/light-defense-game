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

- **앞·뒤 칸(4~11)은 옆 4장으로 대신**(`ArtSpec.poseFallback`, 뒤집기 없음) — 앞·뒤 2차(통합 지시서 9번)가 기획 검토를 통과하면 같은 자리 이름(`walk_000_front_f0N`·`walk_180_back_f0N`)으로 넣는다.
- **캔버스 앵커 그대로**(`register: 'canvas'`): 개구리는 이것이 없으면 공중 칸(f03)이 땅에 붙어 폴짝이 사라진다. 제 모습은 빛을 잃은 모습 축척을 빌림(구출 순간 제자리 교체).
- 받은 팩 파일은 손대지 않음. 코드 그림(`src/art/enemies.ts`·`creatures.ts`)은 폴백.
