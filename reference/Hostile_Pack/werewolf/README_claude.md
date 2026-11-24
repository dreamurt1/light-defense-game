# 웨어울프 팩 — Claude Code 점검·적용 (2026-11-24)

ChatGPT 2-C 1-1절 팩(12장) → 기획 세션 통과(`docs/plan/order-hostile-connect-26-1124.md` 1절) → 게임 `werewolf-dark` 시트.

| 항목 | 잰 값 | 기준 |
|---|---|---|
| 캔버스 | 12장 512×512 RGBA, 덩이 1·떨어진 조각 0·흰 가장자리 0 | 512 투명 |
| 발끝 | 493~496 | 496 |
| 가운데(상자) | 앞·뒤 256, 옆 252~266(f03 꼬리) | 256 |
| 높이 | 앞 453 · 옆 431~435 · 뒤 437~439 (자세 차이, 머리 크기 같음) | 한 팩 한 축척 |
| 방향·눈 | 옆 오른쪽 · 라벤더 눈 흰자 없음 | ✓ |

## 자리
- `werewolf_walk_090_right_f01~04` → `art-src/enemies/werewolf-dark.walk_090_right_f01~04.png` → 칸 0~3 (옆, 왼쪽은 뒤집기)
- `_000_front_` → 칸 4~7 (앞) · `_180_back_` → 칸 8~11 (뒤). 칸 96px, 발끝 기준점 (48, 84).
- **캔버스 앵커 그대로**(`ArtSpec.register: 'canvas'`, `CREATURES.werewolf.register`): 열두 장을 같은 사각형으로 잘라 팩의 발끝 가운데(256, 496)가 칸의 발끝 자리에 온다(포즈마다 따로 자르면 꼬리 자세로 몸이 옆으로 흔들림).
- **앞·뒤 걷기 ±2px 출렁임**(`CREATURES.werewolf.walkBob: 2`, `Creature.animate`): 앞·뒤 그림의 다리 움직임이 작아서(기획 세션) 걷는 동안 한 걸음(2칸)에 한 번 — 생성 그림일 때만, 멈칫·붙잡힘 중엔 없음. 옆은 그림 안 걸음 그대로. 그림은 손대지 않음.

## 확인
- 구운 시트: `sketches/hostile-intake-26-1124-1014/baked-sheets.png`(12칸 발끝이 기준선)
- 판: `c1-werewolf-walk.png`(앞·옆, 광원으로), `c2-werewolf-hit.png`(빛 → 눈부셔.. 멈칫), `werewolf-1-walk.png`(뒤) — 같은 폴더. 출렁임 실측 −2.0~+2.0px.
