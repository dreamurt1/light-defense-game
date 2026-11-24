# 중앙 광원 팩 — Claude Code 점검·적용 (2026-11-24)

ChatGPT 남은 그림 의뢰서 ① → 기획 세션 통과(`docs/plan/order-art-connect-26-1124.md`) → `central-source` 시트 3칸.

| 항목 | 잰 값 | 기준 |
|---|---|---|
| 캔버스 | 3장 512×688 RGBA, 덩이 1·흰 가장자리 0 | 512×688 투명 |
| 제단 바닥 | 666 (세 장 같음) | 667 |
| 가운데 | 256 | 256 |
| 몸 상자 | 465×643~644, 위 23~24 — 세 장 같은 자리 | 같은 축척·같은 제단 |

## 자리
- `source_bright` → `art-src/objects/central-source.bright.png` → 칸 0 · `source_dim` → `.dim` → 칸 1 · `source_off` → `.off` → 칸 2.
- 칸 176×236(×2 해상도), 그림 상자 `{4, 2, 168, 226}` 발끝 정렬 — 줄임 0.35, 제단 바닥 = 칸 228줄(96.6%, 기획 97%), 기준점(판정·그림자)은 지금처럼 224줄.
- 광도 4단계는 그대로 둘레 빛 크기로: 밝음·중간·크게 밝음 = 칸 0, 낮음(<25) = 칸 1, 꺼짐 = 칸 2(`CentralSource` — 규칙 변경 없음). 둘레 빛·판정 그대로, 그림만 교체.
- 제단 오른쪽 아래 바닥의 둥근 문양은 마을 배경 그림(`village-dark`)에 구운 것 — 광원과 무관, 옛 코드 그림 때도 같은 자리.

## 확인
- `sketches/hostile-intake-26-1124-1014/`: `source-check.png`(받은 3장), `c5-source-bright.png` · `c6-source-low.png` · `c7-source-off.png`(판 위, HUD 포함 — 칸 0·1·2 실측), `c2-werewolf-hit.png`(밝음, 가까이).
