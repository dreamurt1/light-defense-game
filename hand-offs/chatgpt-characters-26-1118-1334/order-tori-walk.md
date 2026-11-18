# 토리 걷기 스프라이트 의뢰 (2026-11-18, Claude Code)

> 같이 올리는 파일: 이 의뢰서 · `tori-walk-guide.png`(안내 그림) · `tori_idle_8D.zip`(토리 대기 8장, 512×512, 135°는 11-18 고친 판) · `tori-concept.png` · 캐릭터 브리프 · 기준 사실서.
> 브리프와 다르면 **이 의뢰서를 따른다**(더 최신).

## 만들 것

- 토리가 8방향으로 움직이는 그림. **한 방향에 4장**, 모두 32장.
- **첫 장(f01)은 그 방향의 대기 그림을 그대로** 쓴다. 다시 그리지 않고 파일을 복사한다.
- f01 → f02 → f03 → f04 → 다시 f01로 **자연스럽게 한 바퀴** 이어진다. 게임은 1초에 약 9장으로 되풀이한다(한 바퀴 약 0.45초).
- 움직임은 토끼답게 **제자리에서 작게 깡충 뛰기**다. 실제로 앞으로 가는 것은 게임이 한다.
  - **f01 앉아 모은 자세**: 대기 그림 그대로.
  - **f02 박차기**: 뒷발로 밀며 몸이 앞·위로 늘어나고, 앞발이 앞으로 뻗고, 귀가 살짝 뒤로 간다. 뒷발 끝은 아직 땅에 있다.
  - **f03 공중**: 몸 전체가 약 20px 떠오른다(발이 바닥선에서 떨어짐). 몸이 가장 길고, 귀는 뒤로 날리고, 꼬리가 올라간다.
  - **f04 착지**: 앞발이 먼저 닿고 뒷발이 몸 아래로 당겨진다. 몸이 살짝 눌리며 f01로 돌아갈 준비를 한다.
  - **정면(0°)·뒷모습(180°)**: 같은 깡충을 앞·뒤에서 본 모습이다. f02는 몸이 솟으며 늘어나고, f03은 20px 떠서 앞발을 모으고 귀가 출렁이고, f04는 살짝 눌리며 내려앉는다.
  - **대각선(45°·135°·225°·315°)**: 옆모습과 앞·뒷모습의 움직임을 섞는다.

## 꼭 지킬 것

| 항목 | 규격 |
|---|---|
| 캔버스 | 512×512 투명 PNG (대기 팩과 같음) |
| 축척 | 대기 그림과 같은 크기의 토리. **프레임마다 따로 잘라 맞추지 않는다** |
| 바닥선 | y = 496 (위에서 96.9%). 땅에 닿은 발은 이 줄에 |
| 가운데 | 몸이 x = 256 둘레에 머문다. 앞뒤로 16px 안에서 움직였다 돌아온다 |
| 여백 | 떠올라도 귀 끝 위로 8px 넘게 남긴다 |
| 리본 | 민트 리본(매듭에 노란 별)과 접힌 귀 = 토리 자신의 **왼쪽 귀**. 32장 모두 그 방향 대기 그림과 같은 귀. 방향별로 보이는 쪽은 안내 그림 ① |
| 뒤집기 | **하지 않는다.** 왼쪽 3방향(225°·270°·315°)도 그 방향의 대기 그림에서 만든다 |
| 넣지 않는 것 | 그림자, 글자, 배경 소품. 흰색·검은색 배경 금지(투명, 안 되면 단색 `#FF00FF`) |

## 파일

```
Tori_Walk_8D_4Frames_Pack/
├─ 000_front/tori_walk_000_front_f01.png … tori_walk_000_front_f04.png
├─ 045_front_right/ … 315_front_left/      (8폴더 × 4장: 000_front · 045_front_right · 090_right ·
│                                            135_back_right · 180_back · 225_back_left · 270_left · 315_front_left)
├─ strips/tori_walk_strip_000_front.png …  (방향마다 4장을 가로로 이은 원본)
├─ manifest.json
└─ README.md
```

- `manifest.json`
  - `pack`, `canvas`: `{ "width": 512, "height": 512, "format": "png" }`
  - `directions`: `{ "degrees": 0, "name": "front", "frames": 4 }` × 8
  - `frame_order`: `["f01 idle (copied from tori_idle_<dir>.png)", "f02 push-off", "f03 airborne", "f04 landing"]`
  - `fps_hint`: 9, `generation_notes`: 어느 방향을 어떻게 만들었는지

## 순서 (한 번에 다 하지 말고 나눠서)

1. 90° 오른쪽 4장 → 라이언이 보고 괜찮으면 다음
2. 0° 정면 · 180° 뒤
3. 45° · 135°
4. 270° · 315° · 225° (뒤집지 않고 왼쪽 대기 그림에서)
5. manifest · README · zip

## 영문 프롬프트 (그대로 붙여 넣기)

```
Make TORI's walk sprites — a small in-place bunny hop — using the attached idle pack (tori_idle_8D.zip, 512x512) and tori-walk-guide.png. 8 directions x 4 frames.
1) f01 of each direction IS that direction's idle file. Copy it unchanged; do not redraw it.
2) f02 push-off, f03 airborne (the whole body about 20 px above the ground line), f04 landing. f04 must flow back into f01 so the 4 frames loop smoothly (the game plays about 9 frames per second).
3) Same canvas and scale as the idle pack: 512x512 transparent PNG, ground line at y=496, body centered on x=256 (it may move up to 16 px forward and back). Never re-crop or re-center frames one by one.
4) The mint ribbon (with the yellow star) and the folded ear are always on Tori's own LEFT ear — the same ear as in that direction's idle image. Never mirror Tori; make 225/270/315 from their own idle images.
5) No shadow, no text, no props, no white or black background.
How: for one direction at a time, draw the 4 frames side by side in one strip on a shared ground line, starting from the idle image as f01. With Python, scale the whole strip so its f01 matches the idle file exactly (same size and position), apply that same scale and offset to f02-f04, cut it into four 512x512 files, then replace f01 with the original idle file. Save as Tori_Walk_8D_4Frames_Pack/<deg>_<dir>/tori_walk_<deg>_<dir>_f01.png … _f04.png, keep the strips in strips/, write manifest.json and README.md, and zip it.
Start with 90° right only and show me the 4 frames before doing the other directions. If the Python fitting fails, just give me the strips — Claude Code will cut and fit them.
```

## 받은 뒤 (Claude Code)

- f01이 대기 그림과 같은지, 32장이 같은 축척·바닥선인지, 리본 귀가 맞는지, f04 → f01이 튀지 않는지 잰다.
- 게임에서 토리가 걸을 때 이 4장을 되풀이하고, 멈추면 대기 그림(= f01)으로 돌아간다.
