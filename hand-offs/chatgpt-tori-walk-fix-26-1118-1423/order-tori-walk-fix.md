# 토리 걷기 고치기 의뢰 (2026-11-18 오후, Claude Code)

> 같이 올리는 파일: 이 의뢰서 · `tori-motion-guide.png`(움직임: 지금 4장의 머리·귀·발 높이와 목표) · `tori-eye-check.png`(눈: f01과 f02~f04 비교) · `tori_idle_090_right.png`(f01 = 기준) · `tori_walk_090_right_current.zip`(지금 4장, 고칠 대상) · `tori_idle_8D.zip`(대기 8장, 남은 방향용).
> 앞서 준 `order-tori-walk.md`와 다르면 **이 의뢰서를 따른다**(깡충 높이 '약 20px' 대신 아래 목표).

## 라이언이 본 것 (게임에서 오른쪽으로 걸어 봄)

1. **사이클이 빠르다** → 게임 쪽에서 고쳤다(아래 '게임 박자'). 그림은 이 박자에 맞게 차분하게 그린다.
2. **점프가 약간 과하다** → Claude가 재 보니 몸이 뜨는 높이(10px)보다 **머리와 귀의 오르내림이 크다**.
   - 눈 높이가 네 장 사이에서 57px까지 오르내린다.
   - 귀 끝이 60px까지 내려간다.
3. **눈 색이 맞지 않는다** → f01과 f02~f04의 눈이 다른 눈이다.

## 눈 (`tori-eye-check.png`)

| | f01 (대기 그림 = 기준) | f02~f04 (지금) |
|---|---|---|
| 색 | 짙은 남보라 (평균 `#4E4698`, 가장 짙은 곳 `#33216D`), 아래쪽이 밝은 하늘빛으로 번짐 | 밝은 파랑 (평균 `#4857CB`, 짙은 곳 `#1D2E98`) |
| 모양·크기 | 세로로 긴 타원, 약 26×53px | 더 작고 둥근 타원, 약 30×40px |

→ **f02~f04의 눈은 f01의 눈을 그대로 옮겨 그린다**: 홍채 색과 짙은 테두리, 흰 반짝임 두 개, 크기와 모양. 머리가 움직이는 만큼만 자리가 바뀐다.

## 움직임 목표 (`tori-motion-guide.png`, 앞으로 남은 방향도 모두)

| 항목 | 지금 | 목표 |
|---|---|---|
| f03 발이 뜨는 높이 | 10px | **약 6px** (f02·f04는 발이 바닥선에) |
| 눈 높이 (f01 기준) | f02 −42 · f03 −19 · f04 +15px | **f02·f04는 ±6px 안**, f03은 그만큼 + 뜨는 높이 |
| 귀 끝 (f01 기준) | f02 +19 · f03 +59 · f04 +60px | **±15px 안**. 귀는 살짝 뒤로 기울 수 있고, 접힌 귀는 계속 접혀 있다 |
| 몸 모양 | 크게 늘어나고 웅크림 | f01에 가깝게: 작게 박차고 부드럽게 내려앉음, 앞발은 조금만 뻗음 |

숫자는 512 캔버스 픽셀, − = 위로, + = 아래로.

## 게임 박자 (이미 게임에 넣음, 2026-11-18)

- 한 바퀴 = **f01 f01 · f02 · f03 · f04 f04**: 앉음과 착지는 두 박, 박차기와 공중은 한 박.
- 끝까지 밀어 걸으면 깡충 한 번에 **약 0.68초**다(전에는 0.27초).
- f01과 f04가 오래 보이니, 이 두 장이 특히 차분하고 서로 잘 이어져야 한다.

## 그대로 지킬 것

- 512×512 투명 PNG, 바닥선 y = 496, 몸은 x = 256 둘레.
- f01 = `tori_idle_090_right.png` 그대로(파일 복사).
- 민트 리본(노란 별)과 접힌 귀는 토리 자신의 왼쪽 귀. 90°에서는 먼 쪽 귀다. 뒤집지 않는다.
- 그림자·글자·소품 없음.

## 영문 프롬프트 (그대로 붙여 넣기)

```
Please redo TORI's 90° right walk frames (tori_walk_090_right_f02–f04) — calmer, and with the correct eyes. See tori-motion-guide.png and tori-eye-check.png; the current 4 frames are in tori_walk_090_right_current.zip and f01 is tori_idle_090_right.png.
1) Eyes: f02–f04 must use exactly the same eye as f01 — the deep indigo-violet iris (about #4E4698, darkest #33216D) that fades to light blue at the bottom, the same dark rim, the same two white highlights, the same tall oval shape and size (about 26x53 px). The current f02–f04 eyes are a brighter royal blue (#4857CB), smaller and rounder — that is wrong. Only the position may move with the head.
2) Calmer hop: in f03 the feet lift only about 6 px (now 10); in f02 and f04 the feet stay on the ground line y=496. Keep the head steady: the eye level stays within ±6 px of f01 in f02 and f04 (f03 = the same plus the lift); now it moves up to 57 px, which looks too jumpy. Ear tips stay within about ±15 px of f01 (now they drop 60 px); the ears may tilt back slightly and the folded ear stays folded. Body shapes stay close to f01: a small push-off and a soft landing, front paws reach only a little.
3) The game already plays one hop as f01 f01 · f02 · f03 · f04 f04 (about 0.68 s), so f01 and f04 are on screen longest — make them calm and make f04 flow smoothly back into f01.
4) Keep everything else: 512x512 transparent PNG, ground line y=496, body around x=256, f01 = the idle file copied unchanged, the mint ribbon with the yellow star and the folded ear on Tori's own LEFT ear (the far ear in this view), no mirroring, no shadow, no text.
Give me the 4 files tori_walk_090_right_f01.png … f04.png. Use the same rules for every remaining direction later.
```

## 받은 뒤 (Claude Code)

- 눈 색(평균 색·크기), 눈 높이·귀 끝·발 높이를 다시 재서 목표 안인지 알린다.
- 맞으면 팩 자리에 넣고 트라이얼에서 다시 확인하게 올린다.
