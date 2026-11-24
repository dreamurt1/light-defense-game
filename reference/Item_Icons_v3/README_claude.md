# 스폰 아이템 아이콘 v3 — Claude Code 점검·적용 (2026-11-24)

ChatGPT 남은 그림 의뢰서 ③ → 기획 세션 통과(`docs/plan/order-art-connect-26-1124.md` 10:35) → 아이템 시트 5개(바닥 아이템 + HUD 칸 + 선택 화면 챙겨 갈 아이템 칸, 같은 그림).

| 항목 | 잰 값 | 기준 |
|---|---|---|
| 캔버스 | 5장 128×128 RGBA, 덩이 1·흰 가장자리 0 | 128 투명 |
| 도형 | 62~77 × 83~93, 가운데 (64, 59~63) | 가운데 약 88px |
| 선·색 | 남색 `#1B1F3B` 굵은 외곽선, 제 색 채움 | UI_Icons_v3 채움 벌과 같은 선 |

## 대응표 (ChatGPT 이름 → 게임 id · 자리)
| ChatGPT 파일 | 아이템 | 게임 id | 생성 그림 → 시트 |
|---|---|---|---|
| `item-wind-feather.png` | 바람 깃털 | `wind_feather` | `art-src/items/item-wind_feather.png` → `item-wind_feather` |
| `item-star-necklace.png` | 별 목걸이 | `star_necklace` | `art-src/items/item-star_necklace.png` → `item-star_necklace` |
| `item-firefly-jar.png` | 반딧불 병 | `firefly_jar` | `art-src/items/item-firefly_jar.png` → `item-firefly_jar` |
| `item-golden-acorn.png` | 황금 도토리 | `golden_acorn` | `art-src/items/item-golden_acorn.png` → `item-golden_acorn` |
| `item-light-charm.png` | 빛의 부적 | `light_charm` | `art-src/items/item-light_charm.png` → `item-light_charm` |

- 칸 64(×2 해상도 = 128 PNG), 상자 `{3, 3, 58, 58}` 가운데 — 지금 코드 그림 아이콘(가장 긴 변 55~63)과 같은 크기감. HUD·선택 화면은 `assets/items/item-<id>.png`를 그대로 씀, 바닥은 같은 텍스처 × 0.75 + 게임이 그리는 색 빛 원(그대로). 효과·스폰 수치 그대로, 코드 그림(`src/art/items.ts`)은 폴백.

## 확인
- `sketches/art-intake-26-1124-1034/`: `items-check.png`(받은 5장), `items-1-ground-hud.png`(바닥 다섯 + HUD 칸 부적·도토리), `items-2-select.png`(휴대폰 가로 선택 화면 챙겨 갈 아이템 칸) — 콘솔 오류 0.
