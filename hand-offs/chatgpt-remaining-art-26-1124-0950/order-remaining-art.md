# 의뢰서 — 남은 그림 전부: 중앙 광원 · 등불 · 아이템 · 격자 소품 · 바닥 (claude.ai 기획 세션 → ChatGPT, 2026-11-24 09:50)

> 라이언 지시(11-24 09:45): **남은 그림을 전부, 최대한 빨리.** 2-C 의뢰(`order-2c-hostile-lost-26-1124-0848.md`, 호스틸·주민·잠든 모습 99장)는 그대로 진행하고, 이 의뢰는 **같은 프로젝트의 다른 대화에서 나란히** 돌린다(한 줄기가 다른 줄기를 기다리지 않게).
> 아래 순서는 **게임에 바로 들어가는 것부터**다. ①②는 자리가 이미 있어 받는 즉시 들어가고, ③④⑤는 Claude Code 쪽 연결 작업이 커서 마감(기능 동결 11-26 23:00) 안에 못 들어가면 다음 판에 들어간다 — 그래도 만든다.
> 규격 공통: 투명 PNG, 글자·서명·테두리 없음, 흰·검은 배경 금지, 그림체는 루미 시트·홈 배경·통과한 아침 배경과 같은 결(부드러운 2.5D, 자두색 외곽선, 호박빛 테두리 빛). **그림 마감 11-26 12:00(KST).**

---

## ① 중앙 광원 3장 — `reference/Source_Pack/`

광장 한가운데의 **세 단 돌 제단 + 금 간 큰 결정**(지금 게임 모습과 같은 물건 — 이야기 카드의 별 등불과는 다른 것이니 결정으로). 약간 기울인 톱다운(홈·맵과 같은 시점). 광도 4단계는 게임이 둘레 빛 크기로 그리므로 **그림은 세 장**이면 된다.

| 파일 | 모습 |
|---|---|
| `source_bright.png` | 결정이 환하게 빛남(호박 `#FFC857` 속에 종이색 심), 제단 둘레에 작은 불빛·이끼·꽃 |
| `source_dim.png` | 같은 제단, 결정 빛이 약하고 붉은 주황으로 식어 감(`#FF8C5A` 기운), 둘레 불빛 반 꺼짐 |
| `source_off.png` | 같은 제단, 결정이 잿빛으로 꺼짐, 빛 없음. 무섭지 않게 쓸쓸하게 |

- 캔버스 **512×688** 투명. 제단 바닥이 **y 667(97%)** 에 닿고 가운데 x 256. 세 장 같은 축척·같은 제단 위치(겹쳐 보면 제단이 딱 맞게). 결정 둘레의 빛은 그림 안에 조금만(게임이 큰 빛을 따로 그림). 바닥 그림자 없음.

## ② 등불 스테이션 3장 — `reference/Lantern_Pack/`

외곽의 큼직한 놋쇠 등불(지금 게임 모습과 같은 물건). 켜지면 게임이 둘레에 결계 원을 그린다.

| 파일 | 모습 |
|---|---|
| `lantern_on.png` | 유리 안 불꽃 환함(호박빛), 테 금속 따뜻하게 반짝 |
| `lantern_dim.png` | 불꽃 작고 붉게 흔들림, 유리 반쯤 어두움 |
| `lantern_off.png` | 불꽃 없음, 유리 안 어두운 남보라, 금속 차갑게 |

- 캔버스 **448×640** 투명. 등불 바닥이 **y 621(97%)**, 가운데 x 224. 세 장 같은 축척·같은 위치. 바닥 그림자 없음.

## ③ 스폰 아이템 5장 — `reference/Item_Icons_v3/`

맵 바닥에 놓이고 HUD 칸에도 쓰이는 둥근 아이콘. 통과한 `UI_Icons_v3`의 채움 벌과 같은 선(남색 `#1B1F3B` 굵은 외곽선, 단순한 큰 모양)에 **제 색**을 채운다. 배지 원은 그리지 않는다.

| 파일 | 무엇 | 색 |
|---|---|---|
| `item-wind-feather.png` | 바람 깃털(이동 빨라짐) | 민트 `#9ED9B5` |
| `item-star-necklace.png` | 별 목걸이(적 느려짐) — 루미 목걸이와 같은 별 | 라벤더 `#A89CD9` |
| `item-firefly-jar.png` | 반딧불 병(LP 회복) — 병 안에 빛점 | 호박 `#FFC857` |
| `item-golden-acorn.png` | 황금 도토리(구출한 주민이 잠깐 함께) — 도토의 도토리를 금빛으로 | 금갈색 |
| `item-light-charm.png` | 빛의 부적(HP·LP 회복) — 준비물 아이콘의 부적과 같은 모양, 종이색 | 종이색 `#F6F1E7` + 호박 별 |

- **128×128** 투명, 도형은 가운데 약 88px 안. 5장 같은 굵기·같은 크기감.

## ④ 격자 소품 — `reference/Map_Props_Pack/` (규격은 `order-v3-slots.md` 6절 그대로)

한 칸 96px. **캔버스 = 차지하는 칸 × 96 + 사방 48 여백**(1×1 → 192×192, 2×2 → 288×288, 3×3 → 384×384, 2×3 → 288×384, 2×1 → 288×192). 발자리는 캔버스 가운데, 이끼·풀·그림자는 여백으로 삐져나와도 됨. **집 지붕만** 위로 더 넘어도 됨(그때 캔버스 위쪽만 96 더: 2×2 집 → 288×384, 발자리 아래쪽). 약간 기울인 톱다운, 가장자리 불규칙하게(격자 티 없이). 이름 `prop-<종류>-<폭>x<높이>-<테마>.png`, 선형 조각은 `prop-fence-h-<테마>.png` 식.

**④-1 `light` 한 벌 17장 (먼저)** — 빛의 마을: 따뜻한 색, 창문 켜짐, 꽃.

| 종류 | 장 | 파일 |
|---|---|---|
| 바위 | 2 | `prop-rock-1x1-light`, `prop-rock-2x2-light` |
| 집 | 3 | `prop-house-2x2-light`, `prop-house-3x3-light`, `prop-house-2x3-light` (지붕 경사·벽면 보이게, 창문 켜짐) |
| 술통 | 1 | `prop-barrel-1x1-light` |
| 건초더미 | 2 | `prop-hay-2x1-light`, `prop-hay-3x1-light` (게임이 세로로도 돌림) |
| 꽃 덤불 | 2 | `prop-bush-2x2-light`, `prop-bush-3x3-light` — 주인공이 숨는 곳, 안이 안 보이게 빽빽이, 연한 꽃 점점이(A3 꽃밭) |
| 울타리 | 3 | `prop-fence-h-light`, `prop-fence-v-light`, `prop-fence-end-light` (나무 울타리 한 칸, 이어 붙여도 이음새 안 보이게) |
| 강 | 2 | `prop-river-h-light`, `prop-river-v-light` (한 칸, 끝에서 끝까지 이어짐 — 좌우/상하 이음새 없음) |
| 다리 | 2 | `prop-bridge-h-light`(가로 강용), `prop-bridge-v-light`(세로 강용) — 판자 다리 1×1 |

**④-2 `dark`·`border` 최소 6장 (다음)** — 지금 맵에 꼭 필요한 것만.

| 파일 | 모습 |
|---|---|
| `prop-fence-h-dark`, `prop-fence-v-dark`, `prop-fence-end-dark` | **돌담**(C1 돌담 미로): 낮은 짙은 돌담, 이끼, 이어 붙여도 이음새 없음 |
| `prop-house-2x2-dark` | 창문 꺼진 집, 짙은 남보라 |
| `prop-bush-2x2-border`, `prop-bush-3x3-border` | 경계의 숲 풀숲: 어두운 청록, 꽃 없음, 빽빽이 |

**④-3 나머지 테마 변형 (시간 남을 때)** — `border` 바위·집·울타리·건초, `dark` 바위·술통·건초·풀숲. 없으면 Claude Code가 `light`의 색조를 바꿔 쓴다.

## ⑤ 바닥 타일 3장 — `reference/Ground_Pack/` (맨 뒤, 시간 남을 때)

맵 바닥. **384×384(4×4칸) 이음새 없는 타일**(상하좌우로 붙여도 경계가 안 보이게), 판석·이끼·풀이 섞인 돌길 느낌, 격자 티 없이. `ground-light.png`(따뜻한 판석, 이끼 조금) · `ground-border.png`(차갑고 풀 많음) · `ground-dark.png`(짙은 돌, 이끼 많음).

## 만들지 않는 것

이펙트(빛줄기·별·결계 원·빛기둥 — 코드로 그림), HUD 막대·화살표·일시정지, 노월 어둠 구슬, 이야기 카드 1·3·5·6, 2-C에 이미 있는 것. 기존 팩 수정 금지.

## 순서 한 줄

**① 광원 3 → ② 등불 3 → ③ 아이템 5 → ④-1 소품 light 17 → ④-2 dark·border 6 → ⑤ 바닥 3 → ④-3 나머지.** 폴더마다 `README.md` + `manifest.json` + zip, 한 묶음이 끝날 때마다 올리고 경로를 알려 준다. ①②③(11장)은 **11-24 안에**, ④-1은 **11-25 안에**, 나머지는 11-26 12:00까지.

## 영문 프롬프트 머리말

```
Hand-painted 2.5D game asset for a cozy night village, slightly tilted top-down, soft amber rim light, dark plum outlines, same style as the attached home background and Lumi sheet. Transparent PNG, no text, no signature.
[central source, bright] a three-tiered round stone altar with a large cracked crystal on top glowing warm amber (#FFC857) with a pale core; small candle lights, moss and tiny flowers around the base. Canvas 512x688, altar base touching y=667, centered at x=256.
[lantern station, on] a big brass outdoor lantern with a warm flame behind glass. Canvas 448x640, base at y=621, centered at x=224.
[flowering bush, 2x2 cells] a dense round shrub dotted with small pale flowers, thick enough to hide a small cat. Canvas 288x288, the 192x192 footprint centered, moss and petals may spill into the 48px margin.
[stone wall segment, horizontal, 1 cell, dark theme] a low dark mossy dry-stone wall piece that tiles seamlessly left-right. Canvas 192x192, footprint 96x96 centered.
[ground tile, light theme] a seamless 384x384 tile of warm flagstones with a little moss and grass between them, no visible grid.
```
