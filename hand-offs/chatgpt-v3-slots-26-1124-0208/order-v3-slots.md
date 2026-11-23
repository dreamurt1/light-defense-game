# 라이트 디펜스 v3 그림 — 게임 자리 규격 (Claude Code → ChatGPT, 2026-11-24)

> **같이 올리는 파일** (이 순서로 읽기)
> 1. `light-defense-handoff-for-chatgpt.md` — 기준 사실서(claude.ai, 11-21): 세계·톤·팔레트·주인공 외형·금지 사항
> 2. `light-defense-v3-visual-brief.md` — v3 비주얼 브리프(claude.ai, 11-23): **무엇을 어떤 분위기로** 그릴지
> 3. **이 문서** — v3가 게임에 다 들어간 뒤(11-24) Claude Code가 정한 **게임 자리·캔버스·이름·칸 수**
> 4. `guide-maps-6.png` — 지금 게임의 격자 맵 6장(임시 코드 그림)
> 5. `guide-slots.png` — 지금 임시 그림이 들어 있는 자리(패시브·노월)와 바꿀 파일 이름
>
> **그림의 내용·분위기는 브리프, 크기·이름·칸 수·방향은 이 문서**를 따른다. 앞선 의뢰서와 다르면 이 문서가 맞다.
> 코드·기획 문서는 건드리지 않는다. 결과물은 브리프 4절의 `reference/<Pack>/` 폴더 + `README.md` + `manifest.json` + zip.

---

## 1. 지금 게임 (v3 구현 끝, 2026-11-24)

- 끝없는 연속 밤(한 밤 100초) → 아침 화면(다음 밤으로 / 집으로) → … 하트는 밤 사이에 이어진다. 라이브: https://light-defense-game.web.app
- 구간: 밤 1~2 **빛의 마을**(A) · 3~5 **경계의 숲**(B) · 6+ **어둠이 삼킨 외곽**(C). 맵 6장(33×19칸, 한 칸 96px):
  - A1 광장 · A2 강과 다리(세로 강) · **A3 꽃밭**(꽃 덤불 여덟 — 지금은 풀숲 그림)
  - B1 울타리 길 · **B2 강 건너 마을**(가로 강 + 다리 둘, 강 건너에 집과 등불)
  - **C1 외곽 · 돌담 미로**(돌담 고리와 가림벽 — 지금은 나무 울타리 그림)
  - 굵은 글씨 셋은 11-24에 새로 들어간 맵. `guide-maps-6.png` 참고.
- 어둠의 행렬(올빼미·나방·반딧불이)은 줄지어 맵을 가로지르고, 빛을 맞으면 **웅크림(0.6초) → 도망(2초)** 만 한다(반격 없음).
- 노월은 길에 따라 **찾아온 노월**(라벤더 눈 `#A89CD9`)과 **분노한 노월**(잔불 주황 눈 `#FF8C5A`).
- 지금 그림: 주인공 셋·홈·이펙트 일부만 생성 그림이고, **적·주민·패시브·노월·소품·아이콘은 모두 Claude 임시 코드 그림**이다. 아래 자리에 같은 이름으로 넣으면 코드 수정 없이 바뀐다(소품은 예외 — 6절).

---

## 2. 우선순위 (브리프 2-A 순서 그대로, 소품은 맨 뒤)

| 순서 | 무엇 | 장 수 | 바로 바뀌나 |
|---|---|---|---|
| 1 | 토리 앞모습 걷기 | 4 | ✓ (의뢰서 `chatgpt-tori-front-walk-26-1119-0106`) |
| 2 | 행렬 패시브 — 올빼미 | 걷기 12 + 웅크림 1 + 도망 2 = 15 | ✓ |
| 3 | 행렬 패시브 — 나방·반딧불이 | 각 걷기(날갯짓) 4 + 웅크림 1 + 도망 2 = 7 | ✓ |
| 4 | 노월 두 모습 | 5 (대기·시전 × 2모습 + 진정 공용 1) | ✓ |
| 5 | 아이콘 | 8 × 2벌(선·채움) | 받은 뒤 Claude가 연결(짧은 일) |
| 6 | 아침 배경 2 · 새 지역 카드 2 · 이야기 카드 2 | 6 | ✓ (자리 있음) |
| 7 | 격자 소품 | 6절 | Claude가 연결(긴 일 — 마지막에) |

---

## 3. 행렬 패시브 (올빼미 `owl` · 나방 `moth` · 반딧불이 `firefly`)

게임 안 크기가 **아주 작다**: 올빼미 칸 72px(몸 약 58px), 나방 64px, 반딧불이 48px. 512로 그리되 **작게 줄여도 읽히는 큰 덩어리·굵은 선·큰 눈**으로.

| 자세 | 파일 이름(ChatGPT가 줄 이름) | 방향 | 비고 |
|---|---|---|---|
| 걷기 옆 4장 | `owl_walk_090_right_f01~f04.png` | **오른쪽을 봄** | 왼쪽은 게임이 뒤집는다 — 왼쪽 그림은 만들지 않음 |
| 걷기 앞 4장 | `owl_walk_000_front_f01~f04.png` | 정면 | **올빼미만**(걷는 종) |
| 걷기 뒤 4장 | `owl_walk_180_back_f01~f04.png` | 뒷모습 | **올빼미만** |
| 날갯짓 4장 | `moth_walk_090_right_f01~f04.png`, `firefly_walk_090_right_f01~f04.png` | 오른쪽 | 나방·반딧불이는 **옆 4장뿐**(나는 종은 게임이 옆모습만 씀) |
| 웅크림 1장 | `owl_cower.png` · `moth_cower.png` · `firefly_cower.png` | 오른쪽(옆) | 날개·앞발로 얼굴 가림, 눈 질끈. 제자리 |
| 도망 2장 | `owl_flee_f01~f02.png` · `moth_flee_f01~f02.png` · `firefly_flee_f01~f02.png` | 오른쪽(옆) | 종종걸음·등을 살짝 돌림, f01·f02가 번갈아 한 바퀴 |

- 캔버스 512×512 투명. **걷는 종(올빼미)**: 발끝 y = 496(97%), 몸 가운데 x = 256. **나는 종(나방·반딧불이)**: 몸 가운데가 (256, 256).
- **한 종의 모든 장은 같은 축척**(게임이 한 종의 모든 자세를 같은 배율로 줄인다 — 웅크림만 크면 웅크릴 때 커져 보임).
- 게임이 발밑 그림자를 따로 그린다 → **바닥 그림자 넣지 않음**.
- 눈: 패시브 = 회청색 몸 + **흰자가 보이는 동그란 눈**(호스틸의 라벤더 눈과 구별), 무기·이빨·발톱 없음.

---

## 4. 노월 (보스)

| 자세 | 파일 이름 | 게임 칸 |
|---|---|---|
| 찾아온 노월 대기 | `witch_idle_calm.png` | `witch` 대기 0~3칸(게임이 위아래로 살짝 띄움 — 한 장이면 됨) |
| 찾아온 노월 시전 | `witch_cast_calm.png` | `witch` 시전 4~5칸 |
| 분노한 노월 대기 | `witch_idle_angry.png` | `witch-angry` 0~3칸 |
| 분노한 노월 시전 | `witch_cast_angry.png` | `witch-angry` 4~5칸 |
| 진정(공용) | `witch_calmed.png` | 두 모습의 6칸(진정되면 이 한 장) |

- 캔버스 **768×768** 투명, 발끝 y = 745(97%), 몸 가운데 x = 384, **다섯 장 같은 축척**. 게임 칸 192px.
- 앞을 보는 3/4 정면 한 방향(좌우 뒤집지 않음). 분노한 노월의 다른 점은 **눈빛 `#FF8C5A`·휘날리는 로브·뒤쪽 박쥐 실루엣**뿐 — 같은 사람으로 보이게.

---

## 5. 아이콘 · 아침 · 카드

| 무엇 | 파일 이름 | 캔버스 | 게임 자리 |
|---|---|---|---|
| 별가루 ✦ | `icon-stardust.png` (+ 채움 `icon-stardust-on.png`) | 128×128 투명 | HUD·아침·상점의 ✦ |
| 빛 레벨 ★ | `icon-level.png` (+ `-on`) | 〃 | HUD·아침의 ★ |
| 준비물 4 | `icon-prep-lamp-oil.png` · `icon-prep-spare-heart.png` · `icon-prep-big-pouch.png` · `icon-prep-extra-charm.png` (+ `-on`) | 〃 | 아침 상점 4칸 (게임 id `lamp_oil`·`spare_heart`·`big_pouch`·`extra_charm` — 붙임표는 Claude가 맞춤) |
| 두 길 | `icon-path-keep.png` · `icon-path-expand.png` | 〃 | 결과·지난 밤들의 길 점 |
| 아침 배경 | `morning.png` 1080×2340 · `morning-wide.png` 2340×1080 | 불투명 | 아침 화면 뒤(가운데에 큰 판이 올라감) |
| 새 지역 카드 | `region-border.png` · `region-dark.png` 1024×512 | 불투명 | 카드 배경 — **왼쪽 1/3 위에 게임이 작은 지도, 오른쪽에 글**을 얹으니 그 두 곳은 어둡고 단순하게 |
| 이야기 카드 | `story-02-source.png` · `story-04-voices.png` 1280×720 | 불투명 | 이야기 카드 6장 중 2·4번째 |

- 아이콘 선 버전 = 연한 종이색 `#F6F1E7` 굵고 끝이 둥근 선(남색 유리 원 배지 안에 얹힘), 채움 버전 = 호박 `#FFC857` 채움 + 남색 `#1B1F3B` 선. 원 배지 자체는 그리지 않는다(게임이 그림).

---

## 6. 격자 소품 (마지막 — 받으면 Claude가 연결)

- **캔버스 = 차지하는 칸 × 96px + 사방 48px 여백**: 1×1 → 192×192, 2×2 → 288×288, 3×3 → 384×384, 2×3 → 288×384, 2×1 → 288×192. 차지하는 칸(발자리)은 캔버스 가운데. 이끼·풀·그림자는 여백까지 삐져나와도 되고, **집 지붕만 위 여백을 넘어도 됨**(그때는 캔버스 위쪽만 96px 더: 2×2 집 → 288×384, 발자리는 아래쪽 2×2).
- 이름: `prop-<종류>-<폭>x<높이>-<테마>.png`, 테마 = `light`(빛의 마을, 따뜻·창문 켜짐) · `border`(경계, 차갑고 풀 많음) · `dark`(어둠이 삼킨 외곽, 창문 꺼짐). 먼저 `light` 한 벌, `border`·`dark`는 다음(없으면 Claude가 색조를 바꿔 씀).

| 종류 | 크기(칸) | 비고 |
|---|---|---|
| rock 바위 | 1×1, 2×2 | |
| house 집 | 2×2, 3×3, 2×3 | 지붕 경사·벽면이 보이게 |
| barrel 술통 | 1×1 | 붙어 놓이면 칸마다 하나씩 |
| hay 건초더미 | 2×1, 3×1 | 세로로도 놓임(게임이 돌림) |
| bush 풀숲 | 2×2, 3×3 | 주인공이 숨는 곳 — 안이 보이지 않게 빽빽이. **`light` 테마는 꽃 덤불**(A3 꽃밭의 "꽃밭"이 이것) |
| fence 울타리 | 한 칸 조각: 가로 `prop-fence-h`, 세로 `prop-fence-v`, 끝 `prop-fence-end` | 게임이 줄로 이어 붙임. **`dark` 테마는 돌담**(C1 돌담 미로) |
| river 강 | 한 칸 조각: 가로 `prop-river-h`, 세로 `prop-river-v` | 맵 끝에서 끝까지 이어짐(굽이 없음) |
| bridge 다리 | 1×1, 가로 강용 `prop-bridge-h`·세로 강용 `prop-bridge-v` | 판자 다리 |

---

## 7. 꼭 지킬 것

| | |
|---|---|
| 배경 | 투명 PNG(안 되면 `#FF00FF` 단색 — Claude가 지움). 흰·검은 배경 금지 |
| 크기·위치 | 위 표의 캔버스·발끝·가운데. 못 맞추면 비율을 지켜 더 크게(Claude가 줄임) |
| 축척 | 한 팩(한 종·한 노월) 안에서 모든 장이 같은 축척 |
| 방향 | 옆모습은 **오른쪽**을 봄. 왼쪽은 게임이 뒤집는다 |
| 금지 | 글자·서명·테두리, 바닥 그림자(캐릭터), 피·불꽃·번개, 무기·이빨(패시브), 다른 동물 주인공 |
| 주인공 | 루미는 등불을 들지 않음, 토리 리본 = 토리 자신의 왼쪽 귀, 눈 색은 기준 그림 그대로 |

---

## 8. 영문 프롬프트 (브리프 5절에 덧붙임)

패시브 — 올빼미 걷기 한 장 (f02~f04, 앞·뒤도 같은 식으로):
```
Same art style as the attached Lumi sheet (chibi, big eyes, soft fur, dark plum outlines, faint amber rim light).
A small timid gray-blue owl of the dark village with round eyes showing their whites. No weapons, no fangs, no claws.
Side view facing RIGHT, walking in a line, frame 1 of a 4-frame walk cycle.
Transparent PNG 512x512. Feet touch y=496 (97% from top), body centered at x=256. Same scale for every frame. No ground shadow, no text.
Big simple shapes and thick outlines: it will be shown at about 60px tall.
```

패시브 — 웅크림 / 도망:
```
Same owl, same scale and canvas (512x512, feet at y=496, centered at x=256), side view facing RIGHT.
[cower] crouching in place, covering its face with its wings, eyes squeezed shut — "I don't want to fight".
[flee frame 1 / frame 2] scurrying away to the right with tiny quick steps, back slightly turned, a 2-frame loop.
Transparent PNG, no ground shadow, no text.
```
(나방·반딧불이는 owl을 moth / firefly로, "walking"을 "fluttering"으로, 위치는 "body centered at (256, 256)"으로.)

노월:
```
Nowol, a lonely dignified witch (see the v3 brief). Three-quarter front view, one direction only.
Transparent PNG 768x768, feet at y=745 (97% from top), centered at x=384. All five images (idle calm, cast calm, idle angry, cast angry, calmed) at the same scale.
Angry differs only by ember-orange #FF8C5A eyes, stirring robe and a few bat silhouettes behind. No blood, no fire, no lightning.
```

소품 — 꽃 덤불(빛의 마을) / 돌담(어둠이 삼킨 외곽):
```
Hand-painted 2.5D game prop for a cozy night village, slightly tilted top-down, soft amber rim light, dark plum outlines.
[flowering bush, 2x2 cells] a dense round shrub dotted with small pale flowers, thick enough to hide a small cat. Canvas 288x288: the 192x192 footprint is centered, moss and petals may spill into the 48px margin.
[stone wall segment, horizontal, 1 cell] a low dark mossy dry-stone wall piece that tiles seamlessly left-right. Canvas 192x192, footprint 96x96 centered.
Transparent PNG, no text.
```

---

## 9. 받은 뒤 Claude Code가 잴 것

- 캔버스·발끝 줄·가운데·투명·한 팩 같은 축척(`scripts/art-check.mjs`), 옆모습이 오른쪽인지, **얼굴을 확대해 눈**(겹친 윤곽·눈 색).
- 자리에 넣고 `npm run assets` → 헤드리스로 판 안에서 작게 줄인 모습이 읽히는지.
- 틀린 것은 그 팩의 `README_claude.md`로 돌려준다.
