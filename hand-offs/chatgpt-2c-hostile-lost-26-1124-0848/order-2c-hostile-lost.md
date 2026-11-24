# 의뢰서 — 2-C 호스틸 3종 · 잃어버린 주민 3종 (claude.ai 기획 세션 → ChatGPT, 2026-11-24 08:48)

> 라이언이 게임을 보고 고른 2-C 목록이다. **지금 게임에서 Claude Code가 코드로 그린 임시 그림을 바꾸는 일**이며, 바꿀 것은 아래 여섯 종 + 주인공 셋의 **잠든 모습 3장**(1-3절, 11-24 09:00 덧붙임)이다. 빛을 잃은 토리·도토(맵 위 실루엣)는 **이 의뢰에 없다** — 만들지 말 것.
> 규격은 `order-v3-slots.md` 7절과 기준 사실서 8절 그대로(512×512 투명, 한 종 같은 축척, 옆은 오른쪽). 그림체는 루미 시트·통과한 올빼미 팩과 같은 결. **그림 마감 11-26 12:00(KST)** — 그 뒤 도착분은 다음 판.

---

## 1. 무엇을 (여섯 종, 두 묶음)

### 1-1. 어둠의 호스틸 3종 — `reference/Hostile_Pack/<id>/`

빛의 영역을 침범하고 광원을 끄려는 어둠의 주민. 빛을 맞으면 맵 밖으로 물러난다(돌려보냄). **무섭지 않게, 작고 귀엽게.** 눈은 **라벤더 `#A89CD9`에 흰자 없음**(패시브는 흰자 보이는 눈 — 이 차이로 구분한다). 무기·피·송곳니 강조 없음.

| id | 모습 | 장 수 | 파일 이름 | 게임 칸 | 앵커 |
|---|---|---|---|---|---|
| `bat` 박쥐 | 작은 보라 남색 박쥐. 가장 흔한 적 | **어둠 모습 날갯짓 4** + **되돌아온 모습 날갯짓 4** = 8 | `bat_fly_090_right_f01~f04.png` · `bat_true_fly_090_right_f01~f04.png` | 80px | 나는 종: 몸 가운데 (256, 256) |
| `werewolf` 웨어울프 | 어두운 회보라 털의 **둥근** 늑대. 셋 중 가장 큼. 느리고 단단함 | 걷기 **옆 4 · 앞 4 · 뒤 4** = 12 | `werewolf_walk_090_right_f01~f04.png` · `werewolf_walk_000_front_f01~f04.png` · `werewolf_walk_180_back_f01~f04.png` | 96px | 걷는 종: 발끝 y 496, 가운데 x 256 |
| `vampire` 뱀파이어 | 작은 망토를 두른 날아다니는 어둠 주민. 송곳니는 "느낌"만, 귀엽게 | 날갯짓 4 | `vampire_fly_090_right_f01~f04.png` | 80px | 나는 종: 몸 가운데 (256, 256) |

- 박쥐의 **되돌아온 모습**(`bat_true`)은 같은 박쥐가 빛을 받아 본래 모습으로 돌아온 것 — 연한 라벤더 털, 크림색 배, 순한 눈(흰자 보여도 됨), 같은 축척·같은 날갯짓 박자. 어둠 모습과 실루엣이 같아야 한다(게임이 제자리에서 바꿔 끼움).
- 웨어울프 앞·뒤 걷기는 올빼미 팩과 같은 식(`000_front`·`180_back`). 옆은 오른쪽, 왼쪽은 게임이 뒤집는다.

### 1-2. 잃어버린 빛의 주민 3종 — `reference/Lost_Pack/<id>/`

빛을 잃어 어둠에 적응한 마을 주민. 빛을 맞으면 **제 모습을 되찾아** 중앙으로 뛰어간다(구출). 각 종에 **두 모습**이 필요하고, 두 모습은 **같은 축척·같은 실루엣**이어야 한다(게임이 제자리에서 바꿔 끼움).

- **빛을 잃은 모습** `*_lost_*`: 검은 남보라 털뭉치(털 `#1F1B2E`), 눈 `#D6CCFF`(테두리 `#A89CD9`), 입·볼 없음, **실루엣만으로 종을 알아볼 수 있게**(개구리 다리·고슴도치 가시·레서판다 꼬리). 무섭지 않게 쓸쓸하고 길 잃은 느낌.
- **제 모습** `*_walk_*`: 귀엽고 제 색.

| id | 제 모습 | 움직임 | 장 수 | 파일 이름 | 게임 칸 |
|---|---|---|---|---|---|
| `frog` 개구리 | 초록 아기 개구리 | **폴짝폴짝** — f01 앉음 → f02 웅크림 → f03 공중 → f04 착지 | 두 모습 × (옆 4 · 앞 4 · 뒤 4) = 24 | `frog_lost_walk_090_right_f01~f04.png` … `frog_walk_180_back_f01~f04.png` | 64px |
| `hedgehog` 고슴도치 | 갈색 아기 고슴도치, 크림색 얼굴 | 느리고 곧게 종종걸음 | 24 | `hedgehog_lost_walk_…` · `hedgehog_walk_…` | 64px |
| `redpanda` 레서판다 | 붉은 갈색 레서판다, 줄무늬 꼬리 | 지그재그, 빠름 | 24 | `redpanda_lost_walk_…` · `redpanda_walk_…` | 72px |

- 개구리의 공중 칸(f03)은 발이 떠도 된다. 그래도 **캔버스의 y 496 줄이 "땅"** — 땅을 기준으로 띄운다(상자를 다시 가운데 맞추지 말 것).
- 걷는 종 셋 모두 발끝 y 496, 가운데 x 256. 한 종의 24장이 모두 같은 축척.

### 1-3. 주인공 셋의 잠든 모습 — `reference/Sleep_Pack/` (라이언 덧붙임, 11-24)

하트를 잃거나 "오늘은 여기까지"일 때 그 자리에 **쓰러졌으나 잠든** 모습. 이 게임에서 쓰러짐은 죽음이 아니라 **기절·잠듦**이다 — 그래서 **X 눈·혀·별·멍 금지**, 편안히 눈을 감고 옆으로 웅크려 누운 모습. 다친 느낌 없이, 밤에 잠깐 잠든 것처럼.

| 캐릭터 | 파일 이름 | 꼭 지킬 것 |
|---|---|---|
| 루미 | `lumi_sleep.png` | 검은 고양이, 주황 스카프·별 목걸이 그대로, 꼬리를 몸에 감음. 등불 들지 않음 |
| 토리 | `tori_sleep.png` | 흰 토끼. **리본 귀(토리 자신의 왼쪽 귀)가 위로 오게 오른쪽 옆구리로** 눕는다 — 토리는 게임이 뒤집지 않으므로 이 한 장이 그대로 쓰인다 |
| 도토 | `doto_sleep.png` | 다람쥐, 별 도토리를 품에 안고 눕는다. 줄무늬 꼬리를 이불처럼 |

- 512×512 투명, **누운 몸의 바닥이 y 496에 닿고** 가운데 x 256. 축척은 **각자의 8방향 팩(`reference/Lumi_8_Direction_Pack/` 등)과 같게** — 서 있는 그림과 같은 머리 크기여야 한다(게임이 제자리에서 바꿔 끼움).
- 머리가 **오른쪽**(루미·도토는 게임이 뒤집음). **zzz는 그리지 않는다** — 게임이 머리 위에 띄운다. 바닥 그림자 없음, 글자 없음.
- 3장, `README.md` + `manifest.json` + zip. **1차에 끼워서** 준다.

## 2. 순서와 마감 (장 수가 많으니 둘로 나눈다)

| 차례 | 무엇 | 장 수 | 언제까지 |
|---|---|---|---|
| **1차** | 호스틸 3종 전부(박쥐 8 · 웨어울프 12 · 뱀파이어 4) + 주민 3종의 **옆모습만** 두 모습(3 × 2 × 4) + **잠든 모습 3** | 24 + 24 + 3 = **51** | **11-25 18:00** |
| **2차** | 주민 3종의 **앞·뒤** 두 모습(3 × 2 × 8) | **48** | **11-26 12:00** |

1차가 먼저 통째로 오면 Claude Code가 바로 넣기 시작한다. 2차가 마감까지 못 오면 게임은 옆모습을 앞·뒤 자리에도 쓴다(다음 판에서 교체). **한 종이 끝날 때마다 그 종의 폴더(README·manifest·zip)를 올려 주면** 된다 — 여섯 종을 다 모아서 한꺼번에 줄 필요 없다.

## 3. 꼭 지킬 것

| | |
|---|---|
| 캔버스 | 512×512 투명 PNG, 한 장에 한 자세. 흰·검은 배경 금지, 글자·서명·테두리 금지 |
| 앵커 | 걷는 종: 발끝 y 496(97%), 가운데 x 256. 나는 종: 몸 가운데 (256, 256) |
| 축척 | **한 종의 모든 장(두 모습 포함) 같은 축척.** 종끼리는 게임 칸 비율대로: 웨어울프(96) > 박쥐·뱀파이어(80) > 레서판다(72) > 개구리·고슴도치(64) |
| 방향 | 옆모습은 **오른쪽**. 왼쪽 그림은 만들지 않는다(게임이 뒤집음) |
| 걷기 | 4장이 f01 → f04 → f01로 한 바퀴. 눈은 한 장에 한 번만(겹친 눈 금지) |
| 그림자 | 바닥 그림자 없음(게임이 그림) |
| 눈 | 호스틸·빛을 잃은 주민 = 라벤더 눈, 흰자 없음 / 되돌아온 박쥐·제 모습 주민 = 순한 눈, 흰자 있어도 됨 |
| 금지 | 무기·피·불꽃·번개·비명, 날카로운 이빨·발톱 강조, 다른 주인공 동물, 기존 팩(루미·토리·도토·올빼미·나방·반딧불이·노월) 수정 |
| 맞은 모습 | **이번 판에는 없음**(게임이 흔들림·색으로 처리). 만들지 말 것 |
| 제출 | `reference/Hostile_Pack/<id>/`, `reference/Lost_Pack/<id>/`, `reference/Sleep_Pack/`에 PNG + `README.md`(무엇을 어떤 프롬프트로) + `manifest.json`(파일·자세·방향·프레임·앵커) + 폴더마다 zip. 전달 메시지에는 생성 파일 경로 전부 |

## 4. 지금 게임의 임시 그림 (참고용 — 그대로 베끼지 말고 "무엇이 어디에 쓰이는지"만)

`C:\Users\user\Desktop\file_station_for_ryan\ryan-read-me-2c-code-art-26-1124-0834\01~06-*.png` — Claude Code가 뽑은 지금 모습. 실루엣·색 분위기(박쥐 보라 남색, 웨어울프 회보라, 개구리 초록, 고슴도치 갈색, 레서판다 붉은 갈색)는 이어 가되 그림체는 루미 시트 기준으로 새로 그린다.

## 5. 영문 프롬프트 (브리프 5절 머리말에 덧붙임)

호스틸 — 웨어울프 걷기 한 장:
```
Same art style as the attached Lumi sheet (chibi, big eyes, soft fur, dark plum outlines, faint amber rim light).
A small round werewolf of the dark village: dusky gray-violet fur, lavender #A89CD9 eyes with no visible whites, no weapons, no blood, no sharp fangs. Cute, not scary.
Side view facing RIGHT, walking, frame 1 of a 4-frame walk cycle (frame 1 = standing pose).
Transparent PNG 512x512. Feet touch y=496 (97% from top), body centered at x=256. Same scale for every frame. No ground shadow, no text.
Big simple shapes and thick outlines: it will be shown at about 90px tall.
```
(앞 `000_front`·뒤 `180_back`은 "front view" / "back view"로. 박쥐·뱀파이어는 "flying, 4-frame wing flap, body centered at (256, 256)"으로, 박쥐 되돌아온 모습은 "the same bat restored by light: pale lavender fur, cream belly, gentle eyes, same silhouette and scale".)

잃어버린 주민 — 빛을 잃은 모습 / 제 모습:
```
[lost form] The same character as a "lost resident": a dark plum-black fluffy silhouette (#1F1B2E) with glowing lavender eyes (#D6CCFF, rim #A89CD9), no mouth, no blush — the species must still be recognizable from the silhouette alone (frog legs / hedgehog spines / red panda tail). Lonely, not scary.
[true form] The same character restored: cute, its own natural colors (green baby frog / brown baby hedgehog with cream face / red-brown red panda with a ringed tail), friendly eyes.
Both forms: identical silhouette and scale, transparent PNG 512x512, feet at y=496, centered at x=256, side view facing RIGHT, 4-frame walk (frog: sit → crouch → mid-air → land). No ground shadow, no text.
```

잠든 모습 — 루미:
```
Lumi from the attached Lumi sheet (same character, same scale and head size as the standing poses), curled up asleep on her side on the ground — eyes gently closed, calm face, tail wrapped around her body, orange scarf and star pendant as always. Not hurt, not dead: no X eyes, no tongue, no stars, no bruises. Just sleeping for a moment. Head to the RIGHT.
Transparent PNG 512x512, the body rests on y=496 (97% from top), centered at x=256. No "zzz", no ground shadow, no text.
```
(토리: "Tori, lying on her RIGHT side so the bow ear — her own left ear — is on top"; 도토: "Doto, hugging his star acorn, striped tail over him like a blanket".)

## 6. 받은 뒤 (Claude Code가 함)

`scripts/art-check.mjs`로 캔버스·발끝·가운데·투명·한 종 축척·오른쪽·눈을 재고, 두 모습의 실루엣이 맞는지 겹쳐 본다. 맞으면 자리에 넣고 `npm run assets`. 틀린 것은 그 폴더의 `README_claude.md`로 돌려준다. 임시 코드 그림은 **지우지 않고** 폴백으로 남긴다(그림이 깨질 때 대비 — 라이언 지시).
