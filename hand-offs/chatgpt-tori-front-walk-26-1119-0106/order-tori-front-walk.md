# 토리 0°(앞모습) 걷기 4장 다시 — 눈은 한 번만 (2026-11-19 01:06, Claude Code)

> **같이 올리는 파일 6개**
> 1. 이 의뢰서
> 2. `tori-front-walk-guide.png`: 안내 그림 (지난번 눈 겹침 확대 + 4장 목표)
> 3. `tori_eye_fix.py`: 눈 색 고치기·점검 스크립트 (지난번과 같은 파일)
> 4. `tori_idle_000_front.png`: 0° 대기 그림 = **f01 그대로**
> 5. `tori_walk_045_315_reference.zip`: 이미 받아 게임에 쓰는 45°·315° 걷기 (다리 움직임·그림체 참고용)
> 6. `light-defense-canon.md`: 기준 사실서
>
> 앞선 의뢰서(`order-tori-walk.md`, `order-tori-walk-fix.md`, `order-tori-walk-eyes.md`)와 다르면 **이 의뢰서를 따른다**.
> 이번에는 **0° 한 방향만** 그린다. 다른 방향은 이미 게임에 들어가 있다.

## 왜

**라이언이 본 것**
- 남쪽(화면 아래)으로 걸을 때 토리 눈이 여러 개 겹쳐 보였다.
- 남쪽으로 걸을 때 깡충 뛰는 동작이 잘 안 보인다.

**Claude가 잰 것** (지난번 받은 0° 4장, 512 캔버스)

| 장 | 눈동자 덩이 (대기 = 2) | 눈 높이 (대기 297) | 귀 끝 | 판정 |
|---|---|---|---|---|
| f01 | 2 | 297 | 0 | 대기 그림과 같음 — 좋음 |
| f02 | **3** | 295 | −1 | 오른쪽 눈이 두 겹 |
| f03 | **3** | 290 | +10 | 눈 겹침 의심 |
| f04 | 2 (그래도 눈으로 보면 두 겹) | 301 | **+20** | 두 눈 모두 두 겹, 귀 끝 목표(±15) 넘음 |

- 원인: 대기 그림의 눈을 조금 어긋나게 **덧붙인** 흔적이다. 그래서 윤곽이 두 겹이 됐다.
- 조치: 이 4장은 게임에서 빼 두었다. 지금 남쪽 걷기는 대기 그림을 코드로 살짝 튀기는 임시 동작이다.

**앞모습 깡충이 잘 안 보이는 까닭 (Claude 판단)**
- 앞에서 다가오면 다리가 앞뒤로 움직이는 것이 거의 보이지 않는다.
- 앞에서는 **위아래 움직임**만 보인다. 몸이 눌렸다 펴지는 것, f03에서 발 밑에 생기는 틈이다.
- 그래서 이번에는 그 둘을 또렷하게 그린다. 대신 뜨는 높이는 지금처럼 약 6px로 차분하게 둔다.

## 만들 것

- 0° 앞모습 걷기 4장. `tori_walk_000_front_f01.png` ~ `f04.png`
- 게임 박자: f01 f01 · f02 · f03 · f04 f04 (한 바퀴 약 0.56초, 이어서 반복)

| 장 | 모습 |
|---|---|
| f01 | `tori_idle_000_front.png`를 **파일 그대로 복사** (다시 그리지 않음) |
| f02 | 박차기 전 웅크림. 몸이 살짝 낮고 넓다(높이 약 −4%). 두 발은 바닥 y 496 |
| f03 | 떠오름. 몸 전체가 약 6px 뜬다. **발 밑에 틈**이 보인다. 몸은 살짝 길어지고, 귀는 살짝 뒤로 흔들린다 |
| f04 | 내려앉음. 두 발이 바닥 y 496. 몸이 다시 살짝 눌린다. 다음 장(f01)으로 자연스럽게 이어진다 |

## 꼭 지킬 것

| 항목 | 기준 |
|---|---|
| **눈** | **한 장에 한 번만 그린다.** 대기 그림의 눈을 오려 붙이거나 덧그리지 않는다. 윤곽은 한 겹이어야 한다. 짙은 남보라 세로 타원, 흰 반짝임, 속눈썹 모양은 f01과 같은 느낌으로 |
| 눈 색 | 그림으로 고치지 않는다. 그린 뒤 `tori_eye_fix.py`만 돌린다. 결과에 다시 손대지 않는다 |
| f01 | 첨부한 `tori_idle_000_front.png`만 쓴다. 예전 `Tori_Idle_8Directions_512` 팩은 쓰지 않는다 |
| 리본·접힌 귀 | 토리 자신의 **왼쪽 귀**다. 앞모습에서는 **보는 쪽 오른쪽**에 있다. 뒤집지 않는다 |
| 눈 높이 | f01(y 297)과 ±6px |
| 귀 끝 | f01과 ±15px |
| 발끝 | f02·f04 = y 496. f03만 약 6px 뜬다 |
| 자리 | 몸 가운데 x 256 둘레, 제자리 걸음 |
| 캔버스 | 512×512 투명 PNG, 한 축척. 그림자·글자·소품·서명 없음. 투명이 안 되면 #FF00FF 바탕 |
| 그림체 | 45°·315° 걷기(첨부 zip)와 같은 선 굵기·채색 |

## 파일 구조 (받을 것)

```
Tori_Front_Walk_4Frames_eyefix.zip
  000_front/tori_walk_000_front_f01.png ~ f04.png
  strips/tori_walk_strip_000_front.png   (스크립트가 만듦, 없어도 됨)
```

## 스크립트 결과 읽기

```
000_front f01 = idle image you were given: YES
000_front f02: eye #.... -> #4D479C (f01 #4D479C), distance 0.0, pixels changed outside eyes 0, pupil blobs 2 (f01 2) OK
...
RESULT: ALL OK
```

- `f01 = idle … NO`: f01이 첨부한 대기 그림이 아니다. f01을 바로잡고 다시 돌린다.
- `more pupil blobs than f01 — eyes look doubled`: 그 장의 눈이 겹쳤다. **그 장만** 눈을 한 번만 그려 다시 그린 뒤 다시 돌린다.
- `eye color still differs`: 다시 그리지 말고 그대로 알린다.

## 영문 프롬프트 (그대로 붙여 넣기)

```
Tori front (0°) walk — redo 4 frames. Please look at tori-front-walk-guide.png first.

Why: last time f02 and f04 had DOUBLED eyes — a second copy of the idle eyes was pasted slightly offset over the drawn eyes, so each eye had two outlines. Also, seen from the front the hop was hard to notice.

Make 4 frames, 512x512 transparent PNG, one scale, body centered around x=256, in place:
- f01 = tori_idle_000_front.png copied unchanged (byte-for-byte), renamed tori_walk_000_front_f01.png. Use ONLY this idle image — not your older "Tori_Idle_8Directions_512" pack.
- f02 = crouch before the hop: body slightly lower and wider (about 4% shorter), both feet on the ground line y=496.
- f03 = lift: the whole body rises about 6 px with a clearly visible small gap under the feet; body slightly stretched; ears sway slightly back.
- f04 = landing: both feet on y=496, body slightly squashed again, flowing back into f01.
Game timing is f01 f01 · f02 · f03 · f04 f04 (about 0.56 s per loop).

Rules:
- EYES: draw each eye ONCE per frame, one clean outline. Never paste, overlay or trace the idle eyes on top of drawn eyes. Same look as f01: dark indigo-violet vertical ovals, white highlights, same lash shape.
- Eye height within ±6 px of f01 (eye center y≈297). Ear tips within ±15 px of f01.
- The mint ribbon with the yellow star and the folded ear are on Tori's own LEFT ear = the viewer's RIGHT in this front view. Never mirror.
- Same line weight and coloring as the attached 45°/315° walk frames (tori_walk_045_315_reference.zip).
- No shadow, no text, no props, no signature. If transparency fails, use a flat #FF00FF background.

Then use your Python tool (Pillow + numpy):
1) Put the 4 frames in Tori_Front_Walk_4Frames/000_front/ and put tori_eye_fix.py and tori_idle_000_front.png in the working folder.
2) Run:
   import sys; sys.path.insert(0, '.')
   import tori_eye_fix
   tori_eye_fix.main(['Tori_Front_Walk_4Frames', '--idle', 'tori_idle_000_front.png'])
   It recolors ONLY the eye pixels of f02–f04 to f01's iris palette. Do not touch its output afterwards in any way.
3) It must end with "RESULT: ALL OK". Paste the full printed report in your reply.
   - "f01 = idle image you were given: NO" → fix f01 and run again.
   - "more pupil blobs than f01 — eyes look doubled" → redraw only that frame with the eyes drawn once, then run again.
   - "eye color still differs" → tell me; do not try to fix it by redrawing.
4) Give me Tori_Front_Walk_4Frames_eyefix.zip (the folder the script made).
If your Python tool cannot run the script, say so clearly and send the 4 frames without any eye edits.
```

## 받은 뒤 (Claude Code)

- `scripts/art-check.mjs --char tori --view 000_front --kind walk`로 다시 잰다: f01 = 대기, 눈동자 덩이, 눈 색, 눈 높이, 귀 끝, 뜨는 높이, 리본 쪽.
- **얼굴 확대를 꼭 눈으로 본다.** 지난번 f04처럼 덩이 수가 2개여도 두 겹일 수 있다(수치가 놓침).
- 맞으면 `reference/Tori_8_Direction_Pack/Tori_Walk_8D_4Frames_Pack/000_front/`에 넣는다. 그러면 게임의 임시 깡충이 진짜 걷기로 바뀐다(8방향 모두 그림). 그다음 트라이얼에서 확인하게 올린다.
