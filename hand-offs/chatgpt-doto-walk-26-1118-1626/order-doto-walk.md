# 도토 걷기 8방향 — 한 번에 (2026-11-18 16:26, Claude Code)

> **같이 올리는 파일 4개**:
> 1. 이 의뢰서
> 2. `doto-walk-guide.png`: 안내 그림
> 3. `doto_idle_8D.zip`: 지금 게임에 쓰는 도토 대기 8장, **이것만** 기준
> 4. `doto_concept.png`: 컨셉
>
> 기준 사실서 `light-defense-canon.md`를 함께 올려도 된다.

## 왜 이렇게 하나 (토리 걷기에서 배운 것)

라이언은 시간이 없어서 **한 번에 실행**한다. 그래서 ChatGPT가 틀리기 쉬운 일은 덜어 주고, Claude가 받아서 확실히 할 수 있는 일은 Claude가 한다. 토리 걷기에서 생긴 문제와 이번 대책은 이렇다.

| 토리 때 생긴 문제 | 이번 대책 |
|---|---|
| ChatGPT가 예전 자기 대기 그림을 첫 장으로 씀 | 첨부한 대기 그림**만** 쓴다. f01 = 파일 그대로 복사, 파이썬으로 같은지 확인 |
| 그림을 다시 그릴 때마다 눈·속눈썹이 바뀜 | 고친다고 장마다 다시 그리지 않는다. 눈은 대기 그림 눈 그대로, 한 번만 그린다 |
| 앞모습 걷기에 눈이 이중으로 그려짐 | "눈을 덧붙이지 말고 한 번만 그리기" |
| 머리를 쳐들고 크게 뛰어 머리가 40px까지 출렁임 | 작은 깡충: 발 6px만 뜨고, 머리는 6px 안에서만 움직이고, 뒷다리로 서지 않는다 |
| 시트 한 장에 이름표·빛무리가 붙어 옴 | 투명 바탕에 이름표·빛무리·칸 선 없이. 시트만 와도 Claude가 잘라 맞춘다 |

## 만들 것

- **5방향만 그린다**: 0° 앞, 45° 앞 오른쪽, 90° 오른쪽, 135° 뒤 오른쪽, 180° 뒤.
  - 225°·270°·315°는 Claude가 135°·90°·45°를 좌우로 뒤집어 만든다. 도토는 뒤집어도 되는 캐릭터다(기준 사실서).
- 방향마다 **4장**이다.
  - **f01** = 그 방향 대기 그림 그대로.
  - **f02** = 살짝 웅크려 박차기.
  - **f03** = 공중, 발이 약 6px 뜸.
  - **f04** = 부드럽게 착지.
  - 4장이 한 바퀴로 이어져 f04 다음에 f01이 자연스럽게 온다.
- 게임 박자: f01 f01 · f02 · f03 · f04 f04 (깡충 한 번 약 0.68초). 그래서 f01과 f04가 가장 오래 보인다.

## 꼭 지킬 것

| 항목 | 기준 |
|---|---|
| 모습 | 대기 그림·컨셉 그대로 (붉은 갈색 털, 크림색 배·꼬리 안쪽, 귀 끝 털, 이마 줄무늬, S자 큰 꼬리). 다시 디자인하지 않는다 |
| 도토리 | 별 박힌 황금 도토리를 **두 손에 계속** 쥔다. 크기·별 그대로. 뒷모습에서는 가려져도 된다 |
| 눈 | 대기 그림과 같은 갈색 눈, 같은 반짝임, 같은 크기. **한 번만** 그린다(겹친 윤곽 없음) |
| 움직임 | 작은 깡충이다. 뒷다리로 서기, 몸 늘이기, 크게 뛰기는 하지 않는다. 머리(눈) 높이는 f01에서 ±6px 안. 몸 크기는 그대로 |
| 꼬리 | 한 박자 늦게 따라온다: f02 살짝 내려감 → f03 살짝 들림 → f04 제자리. 옆으로는 대기 실루엣에서 ±12px 안. 캔버스 가장자리에서 8px 넘게 띄운다 |
| 축척·바닥 | 한 방향 4장은 같은 축척이다. f01·f02·f04는 발이 바닥 y 496에, f03은 약 y 490 |
| 기준 그림 | 첨부한 `doto_idle_8D.zip`만 쓴다. 예전 대화의 다른 도토 그림은 쓰지 않는다 |
| 넣지 않는 것 | 그림자, 글자, 이름표, 빛무리, 칸 선, 배경 소품. 흰색·검은색 배경 금지(투명, 안 되면 단색 `#FF00FF`) |

## 받을 것

1. **그림 두 장**(항상 받는다). `doto-walk-guide.png` 3번 배치를 따른다.
   - `doto_walk_sheet_A.png`: 0°·45°·90° 세 줄 × 4장
   - `doto_walk_sheet_B.png`: 135°·180° 두 줄 × 4장
   - 투명 바탕, 장 사이 40px 이상 띄움, 한 줄은 같은 축척·같은 바닥선, 꼬리 전체가 칸 안에.
2. **파이썬으로 자른 팩**(할 수 있으면): `Doto_Walk_5D_4Frames.zip`

```
Doto_Walk_5D_4Frames/
  000_front/doto_walk_000_front_f01.png ~ f04.png
  045_front_right/doto_walk_045_front_right_f01.png ~ f04.png
  090_right/doto_walk_090_right_f01.png ~ f04.png
  135_back_right/doto_walk_135_back_right_f01.png ~ f04.png
  180_back/doto_walk_180_back_f01.png ~ f04.png
  sheets/doto_walk_sheet_A.png, doto_walk_sheet_B.png
  manifest.json, README.md
```

- f01은 첨부한 대기 그림 파일을 **그대로 복사**한다. 파이썬으로 바이트가 같은지 확인하고 결과를 답에 적는다.
- f02~f04를 자르는 방법:
  1. 시트에서 그 줄의 첫 장(f01)이 대기 그림의 몸 범위(위~발끝)와 같아지는 배율을 구한다.
  2. 그 배율 **하나로** 줄의 모든 장을 512 캔버스에 옮긴다.
  3. 발끝을 496에 맞추고(f03은 그 줄에서 뜬 만큼), 가로는 대기 그림 몸 자리에 맞춘다.
- 자르기가 어렵거나 결과가 이상하면 1번 그림 두 장만 보내도 된다. Claude Code가 잘라 맞춘다.

## 영문 프롬프트 (그대로 붙여 넣기)

```
Make DOTO's walk animation in ONE go. Read doto-walk-guide.png first. Use ONLY the attached doto_idle_8D.zip as the reference — not any older Doto images from earlier chats.

What to draw: only 5 directions — 0° front, 45° front-right, 90° right, 135° back-right, 180° back. (Claude Code mirrors them for 225°, 270°, 315°; Doto may be mirrored.) For each direction 4 frames that loop: f01 = that direction's idle image exactly, f02 = small crouch / push-off, f03 = in the air with the feet only about 6 px up (512 canvas), f04 = soft landing that flows back into f01. The game plays f01 f01 · f02 · f03 · f04 f04 (one hop ≈ 0.68 s), so f01 and f04 are seen longest.

Keep it a calm little bounce, NOT a leap: no rearing up on the hind legs, no stretching, same body size; the head/eyes move at most about 6 px from f01. The big S-tail follows one beat late (dips a little in f02, lifts a little in f03, settles in f04) and stays within about ±12 px of the idle silhouette sideways, fully inside the image. Doto keeps holding the golden acorn with the yellow star in both paws in every frame (it may be hidden in back views). Same design as the idle images and doto_concept.png: red-brown fur, cream belly and tail inside, ear-tip tufts, short forehead stripes. Eyes exactly like the idle (same brown, same highlight, same size), drawn once — never add a second set of eyes. Do not regenerate single frames to fix small details; Claude Code will check colors and placement.

Output 1 (always): two images with a fully transparent background — doto_walk_sheet_A.png (rows: 0°, 45°, 90°; 4 frames each, f01→f04 left to right) and doto_walk_sheet_B.png (rows: 135°, 180°). No labels, no glow, no grid lines, no shadow; at least 40 px gap between frames; the same scale and the same ground line within a row; the whole tail inside each frame's area.

Output 2 (if you can): with Python, cut them into Doto_Walk_5D_4Frames.zip — folders 000_front, 045_front_right, 090_right, 135_back_right, 180_back with doto_walk_<angle>_<name>_f01..f04.png (512x512 transparent PNG). f01 = the attached idle PNG copied unchanged (check byte-equality in Python and report it). For f02–f04 use ONE scale per row: the factor that makes the row's sheet f01 match the idle image's body height; feet on y=496 (f03 about y=490), body at the same x as the idle. Put the two sheets in sheets/, add manifest.json and README.md.
If the cutting step fails or looks wrong, just give me the two images — Claude Code will cut and fit them.

Show both images in your reply.
```

## 받은 뒤 (Claude Code)

- 그림 두 장(또는 팩)을 잘라 대기 그림과 같은 축척·발끝·몸 자리에 맞춘다. 토리 225°·270°·315° 때와 같은 방법이다.
- 225°·270°·315°는 좌우로 뒤집어 만든다.
- `scripts/art-check.mjs`로 잰다: f01, 발 뜸, 눈 높이, 꼬리가 칸 안에 있는지, 눈 겹침. 얼굴 확대는 눈으로 본다.
- 꼬리 끝이 게임의 128 칸 밖으로 나가는지도 본다. 몸 기준점 표 `anchorX`도 확인한다.
- 맞으면 팩 자리 `reference/Doto_8_Direction_Pack/Doto_Walk_8D_4Frames_Pack/`에 넣고, 트라이얼에서 도토로 확인하게 올린다.
