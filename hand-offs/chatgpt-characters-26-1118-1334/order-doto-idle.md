# 도토 대기(정지) 스프라이트 의뢰 (2026-11-18, Claude Code)

> 같이 올리는 파일: 이 의뢰서 · `doto-idle-guide.png`(안내 그림) · `doto-concept.png`(기본 그림 — 전에 ChatGPT가 만들어 고른 컨셉) · `ref-lumi-sheet.png`(8방향 돌려보기 형식) · 캐릭터 브리프 · 기준 사실서.
> 브리프와 다르면 **이 의뢰서를 따른다**(더 최신).

## 만들 것

- 도토가 8방향으로 서 있는(정지) 그림. **방향마다 1장**, 모두 8장.
- 루미·토리 대기 팩과 같은 형식이다. 게임에서도 똑같이 쓰인다: 멈추면 바라보던 방향의 그림이 나온다.
- 모습은 **`doto-concept.png` 그대로**다. 다시 디자인하지 않는다. 45° 앞 오른쪽이 컨셉 그림의 자세에 가깝다.
  - 붉은 갈색 털(`#C8743C`, 그늘 `#9A5226`), 크림색 배와 꼬리 안쪽(`#F7E3C6`)
  - 귀 끝의 작은 털 뭉치, 이마의 짧은 줄무늬
  - 몸만 한 S자 큰 꼬리
  - 두 손에 꼭 쥔, 별이 박힌 황금 도토리 (뒷모습에서는 가려져도 됨)

## 꼭 지킬 것

| 항목 | 규격 |
|---|---|
| 캔버스 | 512×512 투명 PNG (루미·토리 팩과 같음) |
| 바닥선 | 발이 y = 496 (위에서 96.9%) |
| 위 | 가장 높은 곳(귀 끝 털 또는 꼬리 끝)이 y = 48 근처 |
| 가운데 | 몸(머리·몸통, 꼬리 빼고)이 x = 256. 꼬리는 한쪽으로 나가도 됨 |
| 축척 | 8장 모두 **한 축척**. 한 번 정하면 장마다 다시 맞추지 않는다(꼬리가 크게 보이는 방향에서 몸이 작아지면 안 됨). 꼬리가 잘리지 않게 8px 넘게 여백 |
| 뒤집기 | 도토는 **해도 된다**: 225°·270°·315° = 135°·90°·45°를 좌우로 뒤집기 |
| 넣지 않는 것 | 그림자, 글자, 배경 소품. 흰색·검은색 배경 금지(투명, 안 되면 단색 `#FF00FF`) |

## 파일

```
Doto_Idle_8D_Pack/
├─ doto_idle_000_front.png … doto_idle_315_front_left.png   (8장: 000_front · 045_front_right · 090_right ·
│                                                             135_back_right · 180_back · 225_back_left · 270_left · 315_front_left)
├─ sheet/doto_idle_sheet.png    (8방향을 한 장에 그린 원본)
├─ manifest.json
└─ README.md
```

- `manifest.json`: `pack`, `version`, `canvas`({ width, height, format }), `directions`: `{ "angle": 0, "name": "front", "file": "doto_idle_000_front" }` × 8. 뒤집은 방향에는 `"derived_by": "horizontal mirror of 135°"`처럼 적는다.

## 영문 프롬프트 (그대로 붙여 넣기)

```
Make DOTO's idle sprites for the game: 8 directions, one still image each, in the same pack format as Lumi's and Tori's idle packs (see doto-idle-guide.png). The design is exactly the attached doto_concept.png — red-brown fur, cream belly and tail inside, ear-tip tufts, short forehead stripes, big S-shaped tail, golden acorn with a yellow star held in both paws. Do not redesign.
Directions: 0° front, 45° front-right (close to the concept pose), 90° right, 135° back-right, 180° back, 225° back-left, 270° left, 315° front-left. 225/270/315 may be horizontal mirrors of 135/90/45.
Rules: each a 512x512 transparent PNG; feet on y=496; the highest point (ear tuft or tail tip) near y=48; the body (head and torso, not the tail) centered on x=256; ONE scale for all 8 images — set it once and never re-fit each image separately; keep at least 8 px margin so the tail is never cut. No shadow, no text, no props, no white or black background (solid #FF00FF only if transparency is impossible).
How: draw all 8 on one turnaround sheet with the same scale and a shared ground line (row 1: 0°, 45°, 90°, 135°; row 2: 180°, 225°, 270°, 315°). Then with Python cut them out, scale every pose by the same factor, and put the feet on y=496 and the body center on x=256 in a 512x512 canvas. Name them doto_idle_000_front.png … doto_idle_315_front_left.png in Doto_Idle_8D_Pack/, keep the sheet as sheet/doto_idle_sheet.png, write manifest.json (pack, version, canvas, directions[{angle, name, file, derived_by for mirrored ones}]) and README.md, and zip it.
Show me the sheet first. If the Python step fails, just give me the sheet — Claude Code will cut and fit it.
```

## 받은 뒤 (Claude Code)

- 8장이 같은 축척·바닥선인지, 컨셉 그림과 같은 모습(색·줄무늬·도토리 별)인지, 몸이 가운데인지 잰다.
- 게임에서 도토가 멈추면 바라보던 방향의 그림이 나오게 한다(루미·토리와 같음). 도토 걷기는 그다음 의뢰.
