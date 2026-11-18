# 토리 걷기 — 눈 색 확실히 고치기 + 135° 다시 (2026-11-18 16:00, Claude Code)

> **같이 올리는 파일 8개**:
> 1. 이 의뢰서
> 2. `tori-eye-fix-guide.png`: 안내 그림
> 3. `tori_eye_fix.py`: 눈 색 고치는 스크립트
> 4. `tori_idle_135_back_right.png`: 135° 첫 장, 이 그림이 기준
> 5. `tori_idle_8D.zip`: 지금 쓰는 대기 8장
> 6. `Tori_045_135_Walk_4Frames.zip`: 받은 45°·135° 걷기
> 7. `tori_walk_090_right_current.zip`: 지금 게임에 쓰는 90° 걷기
> 8. `light-defense-canon.md`: 기준 사실서
>
> 앞선 의뢰서(`order-tori-walk.md`, `order-tori-walk-fix.md`)와 다르면 **이 의뢰서를 따른다**. 특히 바뀐 점이 있다.
> - 전에는 "f02~f04의 눈을 f01처럼 다시 그린다"였다.
> - 이제는 **"눈 색은 그림을 다시 그리지 않고 스크립트로만 고친다"**.

## 왜

**라이언이 본 것**
- 45°·135° 걷기의 눈 색이 흐릿하다.
- 여러 번 고쳐 달라고 하면 속눈썹(마스카라)이 바뀌거나, 눈 색이 그대로다.

**원인 (Claude 판단)**
- 그림 생성은 고칠 때마다 그림 **전체를 새로 그린다**. 그래서 다시 그릴 때마다 속눈썹과 눈 모양이 달라진다.
- "색만 바꿔"라는 편집은 픽셀을 정확히 맞추지 못한다. 그래서 색이 거의 그대로다.
- 정리하면, 그림 생성으로는 정확한 눈 색을 **보장할 수 없다**.

**해결: 눈 색은 `tori_eye_fix.py`로만 고친다**
- 눈 픽셀만 바꾼다. f01(대기 그림)의 홍채 색을 밝기 순서대로 그대로 옮긴다.
- 모양·속눈썹·흰 반짝임·털·리본·윤곽선은 한 픽셀도 바뀌지 않는다.
- 같은 그림을 넣으면 언제나 같은 결과가 나온다.
- 끝나면 스스로 점검한다.
  - 눈 색이 f01과 같은지
  - 눈 밖이 바뀌지 않았는지
  - 눈이 겹치지 않았는지(눈동자 덩이 수)
  - f01이 우리 대기 그림과 같은지

**Claude가 잰 것** (눈 픽셀 평균 색, 512 캔버스)

| 방향 | f01 = 대기 (기준) | 받은 f02 · f03 · f04 | 같은 계산으로 고친 뒤 |
|---|---|---|---|
| 45° | `#4D489A` 짙은 남보라 + 아래 하늘빛 | `#6655B4` · `#6957B7` · `#6856B6` (연보라, 흐림) | 세 장 모두 `#4D489A` |
| 90° (지금 게임) | `#4E4698` | `#4E4AC2` · `#4A56CD` · `#4755CA` (너무 파람) | 세 장 모두 `#4E4698` |

→ `tori-eye-fix-guide.png`의 1·2번에서 고치기 전과 후를 볼 수 있다. 속눈썹은 그대로다.

**135°는 첫 장부터 틀렸다**
- f01이 우리가 준 대기 그림이 아니다. manifest에는 "byte-for-byte"라고 적혀 있지만 실제로는 다른 그림이다.
- 예전 ChatGPT 자체 팩(`Tori_Idle_8Directions_512`)의 135°를 썼다. 그 그림은 **리본이 반대 귀**(보는 쪽 오른쪽)에 있어서 이미 바꾼 그림이다.
- f02~f04는 그 옛 머리를 따라 그려졌다. 그래서 머리와 리본이 올바른 f01보다 약 40px 높다. 다시 그린다.

**45° 몸 움직임 (Claude 판단)**
- f03에서 눈이 몸보다 약 25px 더 올라간다(목표 ±6).
- 이번에는 **다시 그리지 않는다**. 다시 그리면 눈과 속눈썹이 또 달라질 위험이 더 크다. 게임 화면에서는 약 6px 차이다.

## 할 일 (순서)

1. **45°**: 다시 그리지 않는다. 받은 4장 그대로 스크립트만 돌린다.
2. **135°**: `tori_idle_135_back_right.png`를 f01로 쓴다(파일 그대로 복사). f02~f04를 **그 그림의 머리**에 맞춰 다시 그린 뒤 스크립트를 돌린다.
3. **90°**: `tori_walk_090_right_current.zip`의 4장에 스크립트만 돌린다.
4. 스크립트 출력이 `RESULT: ALL OK`여야 한다. 나온 `*_eyefix` 폴더를 zip 두 개로 묶는다. 출력 전문도 답에 붙인다.
5. 앞으로 남은 방향(225°·270°·315°, 0° 다시)도 같은 순서로 한다: **그리기 → 스크립트 → ALL OK → zip**.
   - 0°는 "눈을 덧붙이지 말고 한 번만 그리기"를 지킨다.
   - 눈이 겹치면 스크립트가 눈동자 덩이 수로 잡는다.

## 꼭 지킬 것

| 항목 | 기준 |
|---|---|
| 눈 색 | **그림을 다시 생성하거나 편집해서 고치지 않는다.** 스크립트로만 고친다. 스크립트 결과에는 다시 손대지 않는다 |
| f01 | 첨부한 대기 그림을 파일 그대로 쓴다(`tori_idle_8D.zip`, 135°는 따로 첨부한 PNG). 예전 `Tori_Idle_8Directions_512`는 쓰지 않는다 |
| 리본·접힌 귀 | 토리 자신의 **왼쪽 귀**. 0°·45°·315°는 보는 쪽 오른쪽, 135°·180°·225°는 보는 쪽 왼쪽이다. 뒤집지 않는다 |
| 135° 머리 | f01의 머리 모양과 오른쪽 끝에 살짝 보이는 눈을 유지한다. 리본 높이 ±6px, 귀 끝 ±15px |
| 깡충 | f03만 약 6px 뜬다. f02·f04는 발이 바닥선 y 496에 닿는다. 몸은 x 256 둘레 |
| 캔버스 | 512×512 투명 PNG. 그림자·글자·소품 없음 |

## 스크립트 결과 읽기

```
045_front_right f01 = idle image you were given: YES
045_front_right f02: eye #6655B4 -> #4D489A (f01 #4D489A), distance 0.0, pixels changed outside eyes 0, pupil blobs 1 (f01 2) OK
...
RESULT: ALL OK
```

- `f01 = idle … NO`: f01이 첨부한 대기 그림이 아니다. f01을 바로잡고 다시 돌린다.
- `more pupil blobs than f01`: 그 장의 눈이 겹쳐 그려졌다. **그 장만** 눈을 한 번만 그려 다시 그린 뒤 다시 돌린다.
- `eye color still differs`: 다시 그리지 말고 그대로 알린다.
- `no eye visible — unchanged`: 뒷모습처럼 눈이 안 보이는 장이다. 정상이다.

## 파일 구조 (받을 것)

```
Tori_045_135_Walk_4Frames_eyefix.zip
  045_front_right/tori_walk_045_front_right_f01~f04.png
  135_back_right/tori_walk_135_back_right_f01~f04.png
  strips/ (스크립트가 다시 만듦), README.md, manifest.json
Tori_090_Walk_current_eyefix.zip
  090_right/tori_walk_090_right_f01~f04.png
```

## 영문 프롬프트 (그대로 붙여 넣기)

```
Tori walk — eye color fix + redo 135°. Please read tori-eye-fix-guide.png first.

Why: image generation redraws the whole picture, so every retry changes the lashes, and "edit" requests do not change the eye color reliably. From now on the eye color is fixed ONLY with the attached Python script tori_eye_fix.py — never by regenerating or editing the image.

Use your Python tool:
1) Unzip Tori_045_135_Walk_4Frames.zip, tori_walk_090_right_current.zip and tori_idle_8D.zip into one working folder and put tori_eye_fix.py and tori_idle_135_back_right.png there too. Use ONLY these idle images — your older "Tori_Idle_8Directions_512" pack is outdated (its 135° has the ribbon on the wrong ear).
2) 045_front_right: do NOT redraw. Keep the 4 frames exactly as they are.
3) 135_back_right: your f01 is the old idle, not ours. Replace that folder: f01 = tori_idle_135_back_right.png copied unchanged (byte-for-byte), renamed tori_walk_135_back_right_f01.png. Redraw f02–f04 to match THAT image: the same head, the same folded ear with the mint ribbon (yellow star) on Tori's own LEFT ear = the viewer's left in this rear view, the same small eye glimpse at the right edge. Small calm hop: only f03 lifts about 6 px; in f02 and f04 the feet stay on y=496; ribbon height within ±6 px of f01; ear tips within ±15 px. 512x512 transparent PNG, body around x=256, no mirroring, no shadow, no text. Draw the eyes once — never add or paste a second set of eyes.
4) Run the script in the working folder:
   import glob, sys; sys.path.insert(0, '.')
   import tori_eye_fix
   tori_eye_fix.main(['Tori_045_135_Walk_4Frames', '--idle', *glob.glob('tori_idle_*.png')])
   tori_eye_fix.main(['Tori_090_Walk_current', '--idle', *glob.glob('tori_idle_*.png')])
   It recolors ONLY the eye pixels of f02–f04 to f01's iris palette by brightness rank. Lashes, shapes, highlights, fur and ribbon stay exactly as drawn. Do not touch its output afterwards in any way.
5) Each run must end with "RESULT: ALL OK". Paste the full printed report in your reply.
   - "f01 = idle image you were given: NO" → f01 is not the attached idle; fix f01 and run again.
   - "more pupil blobs than f01 — eyes look doubled" → redraw only that frame with the eyes drawn once, then run again.
   - "eye color still differs" → tell me; do not try to fix it by redrawing.
6) Give me two zips of the folders the script made: Tori_045_135_Walk_4Frames_eyefix.zip and Tori_090_Walk_current_eyefix.zip.

For every remaining direction later (225°, 270°, 315° and a redo of 0°) use the same flow: draw → run tori_eye_fix.py → "RESULT: ALL OK" → zip the *_eyefix folder.
If your Python tool cannot run the script, say so clearly and send the frames without any eye edits.
```

## 받은 뒤 (Claude Code)

- `scripts/art-check.mjs`로 다시 잰다.
  - 눈 색 거리
  - 눈동자 덩이(겹침)
  - f01 = 대기 그림
  - 리본 쪽
  - 135° 머리 높이
  - 뜨는 높이
- 확인용 그림의 **얼굴 확대를 눈으로 본다**.
- 맞으면 팩 자리에 넣는다. 45°·135°는 새로 넣고, 90°는 바꾼다. 그다음 트라이얼에서 확인하게 올린다.
