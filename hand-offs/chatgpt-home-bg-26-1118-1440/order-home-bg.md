# 홈 화면 배경 그림 의뢰 (2026-11-18, Claude Code) — 앞선 홈 그림 의뢰를 대체

> 같이 올리는 파일
> - 이 의뢰서
> - `home-wireframe-screens.png`: 화면 4종에서 게임이 무엇을 얹는지
> - `home-wireframe-art.png`: 그림 두 장의 구역과 잘리는 선
> - `title-reference.png`: 그대로 둘 제목
> - `current-home-art.png`: 지금 홈 그림. 분위기·소재 참고용이고, 캐릭터와 제목은 빼고 다시 그린다.
> - 분위기 참고: `ref-mood-thumbnail.png`, `ref-scene-leaflet.jpg`
> - 기준 사실서 `light-defense-canon.md`
>
> 앞선 홈 지시서(`order-home-art.md`, 2026-11-18 14:17)와 다르면 **이 의뢰서를 따른다**.

## 바뀐 생각 (왜)

- 지금까지는 그림 한 장에 제목·세 친구·등불을 다 넣었다. 그 결과 두 가지 문제가 생겼다.
  - 게임 버튼이 그림의 캐릭터·등불과 엇갈렸다.
  - 토리 리본이 두 번 다 반대쪽 귀였다.
- 이제는 **나눠서** 만든다.
  - **ChatGPT**: 배경 풍경(캐릭터 없음) 두 장 + 제목 투명 PNG.
  - **게임(Claude Code)**: 제목 얹기, 지금 고른 등불지기(루미·토리·도토)를 등불 옆 빈터에 세우기, 한글 이름·슬로건, 버튼 다섯 개, 프로필·설정.
- 그래서 그림에는 **캐릭터·동물·글자·버튼·UI를 하나도 그리지 않는다.** 등불지기가 설 빈자리를 비워 둔다.

## 받을 것

| # | 파일 | 크기 | 내용 |
|---|---|---|---|
| 1 | `home-bg-portrait.png` | **1080×2340** (9:19.5) | 세로 배경 |
| 2 | `home-bg-landscape.png` | **2340×1080** (19.5:9) | 가로 배경 (1번과 같은 장면을 가로로) |
| 3 | `home-title.png` | 가로 1200px 안팎, 투명 | 제목만 (`title-reference.png`와 같은 디자인) |

- 크기를 정확히 못 맞추면 **비율을 지키고 더 크게** 준다. Claude가 줄인다.

## 화면 4종 (라이언 지정)과 그림

| 화면 | 쓰는 그림 | 보이는 부분 |
|---|---|---|
| 모바일 세로 풀 화면 | 1번 | 전체 |
| PC 세로 화면 (9:16) | 1번 | 높이 9~91%만 (위아래 9%씩 잘림) |
| 모바일 가로 풀 화면 | 2번 | 전체 |
| PC 풀 화면 (16:9) | 2번 | 폭 9~91%만 (좌우 9%씩, 16:10은 13%씩 잘림) |

→ 무대·등불·달·마을은 가운데 안전 구역 안에. 바깥 띠에는 하늘·풀·숲처럼 잘려도 되는 것만 둔다.

## 구역 (그림 기준 %, `home-wireframe-art.png`)

**1번 세로 1080×2340**

| 높이 | 게임이 얹는 것 | 그림 |
|---|---|---|
| 0~14% 좌우 끝 | 프로필(왼쪽), 설정(오른쪽) | 잎·하늘만 |
| 7~34% | 제목 + 한글 이름·슬로건 | **어두운 빈 하늘**, 희미한 별만 (달·밝은 것 없음) |
| 34~46% | — | 달(x 65~85%), 멀리 언덕 위 마을의 따뜻한 창 |
| 46~70% 무대 | 고른 등불지기(발 x 42%·y 69%, 키 = 그림 높이의 18%) | 낮은 이끼 돌 빈터, **별 등불: 받침 아래 x 62%·y 68%**. x 30~54%는 비워 둔다 |
| 71~100% | 둥근 버튼 넷 + '게임하기' | **어둡고 차분한** 앞쪽 풀·작은 냇물·꽃. 중요한 것 없음 |

**2번 가로 2340×1080**

| 자리 | 게임이 얹는 것 | 그림 |
|---|---|---|
| x 6~47%, y 8~42% | 제목 + 한글 이름·슬로건 | **어두운 빈 하늘** |
| x 45~64%, y 8~45% | — | 달, 언덕 위 마을 |
| 무대 x 20~58%, y 50~88% | 고른 등불지기(발 x 33%·y 86%, 키 = 그림 높이의 32%) | 빈터, **별 등불: 받침 아래 x 45%·y 85%**. x 25~40%는 비워 둔다 |
| x 66~100% | 메뉴 열(둥근 버튼 2×2 + '게임하기') | **어둡고 차분한 숲 가장자리** |
| 왼쪽 아래 / 오른쪽 위 | 프로필 / 설정 | 단순하게 |

## 분위기 (라이언 조건)

- **어둠 속에서 은은하게 빛나는 차분한 밤.** 대부분 짙은 남보라 어둠이다.
- 빛은 별 등불, 반딧불 몇 개, 마을 창, 달에서만 은은하게 나온다.
- 지금 그림보다 어둡고 보라를 덜 짙게 한다. 밝은 곳은 작고 적게 둔다.
- 등불 빛이 빈터를 따뜻하게 비춘다. 게임이 세우는 등불지기가 이 빛 안에 서게 된다.
- 소재: 나뭇잎 틀, 언덕 위 마을, 보름달, 작은 냇물, 은은한 꽃(지금 그림에서 가져오되 더 차분하게).

## 제목 (`home-title.png`)

- `title-reference.png`의 'LIGHT DEFENSE' 글자, 위의 별과 고양이 귀 모양 아치, 아래 장식선을 **그대로** 둔다.
- 배경 없이 투명하게. 부드러운 빛 번짐은 있어도 된다.
- 배경 그림 1·2번에는 제목을 넣지 않는다.

## 넣지 말 것

- 캐릭터·동물·실루엣(루미·토리·도토 포함 — 게임이 세운다)
- 글자(제목 PNG 말고), 버튼·패널·아이콘·HUD·테두리
- 서명·워터마크

## 영문 프롬프트 (그대로 붙여 넣기)

```
New plan for my game's HOME SCREEN. From now on the game itself places the title, the characters and all buttons, so I need clean BACKGROUND art plus a separate title image. See home-wireframe-screens.png (what the game puts on top on 4 screen sizes) and home-wireframe-art.png (zones and crop lines).
Make three images:
1) home-bg-portrait.png, 1080x2340 (9:19.5).
2) home-bg-landscape.png, 2340x1080 (19.5:9), the same scene composed for landscape.
3) home-title.png: only the "LIGHT DEFENSE" title on a transparent background, exactly as in title-reference.png (same lettering, the star and cat-ear arch above, the ornament line below), about 1200 px wide, soft glow allowed.
The backgrounds must contain NO characters, NO animals or silhouettes, NO text or title, NO buttons, panels, icons, HUD, frames, signature or watermark — the game adds all of that.
Scene and mood: a calm night that glows softly in the dark. Mostly deep navy-violet darkness; gentle light only from one small star lantern, a few fireflies, warm windows of a village on a distant hill, and a full moon. Darker and less saturated than current-home-art.png; keep its elements (leaf frame, village on a hill, moon, small stream, soft flowers) but quieter. The star lantern stands on a short stone post in a small mossy clearing and lights it warmly — the game will place the chosen hero standing in that light just to the LEFT of the lantern, so keep that spot empty.
Exact zones (percent of each image):
Portrait 1080x2340 — 0–14% top corners: simple leaves/sky (profile and settings go there); 7–34%: plain dark sky with only faint stars, no moon (title and Korean subtitle go there); 34–46%: moon at x 65–85% and the far village; 46–70%: the clearing, with the lantern's base at x 62%, y 68%, and an empty spot at x 30–54% where the game puts the hero (feet at y 69%); 71–100%: dark calm foreground of grass, a small stream and flowers, nothing important (buttons go there). Mobile shows the whole image; a 9:16 PC window shows only 9–91% of the height; very tall phones lose about 6% at each side.
Landscape 2340x1080 — x 6–47%, y 8–42%: plain dark sky (title goes there); moon and village at x 45–64%, y 8–45%; the clearing at x 20–58%, y 50–88%, with the lantern's base at x 45%, y 85%, and an empty spot at x 25–40% for the hero (feet at y 86%); x 66–100%: a dark, calm forest edge (the menu column goes there); bottom-left and top-right corners simple. Mobile shows the whole image; a 16:9 PC screen shows only 9–91% of the width.
If you cannot hit the exact pixel sizes, keep the aspect ratios and go larger.
```

## 받은 뒤 (Claude Code)

- 크기·비율, 캐릭터·글자가 없는지, 구역(빈 하늘·빈터·버튼 자리), 등불 위치, 제목이 원본과 같은지 잰다. 어긋나면 알린다.
- 맞으면 `docs/design/HOME_SCREEN.md` 5절대로 홈 화면을 새로 만든다. 무대 등불지기와 버튼은 게임이 그린다.
