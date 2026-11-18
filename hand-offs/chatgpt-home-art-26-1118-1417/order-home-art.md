# 홈 화면 그림 다시 그리기 의뢰 (2026-11-18, Claude Code)

> 같이 올리는 파일
> - 이 의뢰서
> - 안내 그림 3장: `home-layout-guide.png`(게임 UI가 놓이는 자리), `tori-ribbon-guide.png`(토리 리본 귀), `title-reference.png`(그대로 둘 제목)
> - `current-home-art.png`: 지금 홈 그림(Moonlit Forest). 이 그림을 고친다.
> - 캐릭터 그림: `tori-concept.png` · `doto-concept.png` · `ref-lumi-portrait.png`
> - 라이언이 고른 참고 그림 3장: `ref-mood-thumbnail.png` · `ref-scene-leaflet.jpg` · `ref-gameplay-ui.png`
> - 기준 사실서 `light-defense-canon.md`
>
> 앞선 대화와 다르면 이 의뢰서와 기준 사실서를 따른다.

## 왜 다시 그리나

- 지금 그림의 세 친구는 뒷모습이다. 그런데 토리의 접힌 귀와 민트 리본이 **보는 사람의 오른쪽**, 곧 토리의 오른쪽 귀에 있다. 기준은 **토리 자신의 왼쪽 귀**다. 뒷모습이라면 보는 사람의 왼쪽에 와야 한다(`tori-ribbon-guide.png`).
- 라이언이 원하는 분위기: **어둠 속에서 은은하게 빛나는 차분한 밤**. 지금 그림은 보라가 짙고 밝은 곳이 많다.
- 홈 화면에 맞게: 게임이 그림 위에 단추·글자를 올린다. 그 자리에는 중요한 그림을 두지 않는다.

## 조건 (라이언)

1. **분위기**: 어둠 속에서 은은하게 빛나는 차분한 분위기.
   - 대부분 짙은 남보라 어둠이다.
   - 빛은 별 등불, 반딧불, 마을 창, 달에서만 은은하게 나온다.
   - 밝은 곳은 지금보다 적고 작게 둔다. 보라는 덜 짙게 한다.
   - 실루엣 포스터(`ref-mood-thumbnail.png`)의 차분함이 가깝다.
2. **게임 홈 화면에 맞는지 판단해서 그린다**: 아래 '자리'를 지키고, 한 장의 포스터로도 읽혀야 한다(가로 화면에서는 그림이 통째로 보인다).
3. **단추·UI·HUD 자리를 생각한다** (`home-layout-guide.png`)
   | 구역 (그림 높이 기준) | 게임이 올리는 것 | 그림에서 지킬 것 |
   |---|---|---|
   | 맨 위 1~7%, 왼쪽·오른쪽 끝 | 프로필(왼쪽), 설정 단추(오른쪽) | 잎·하늘 정도만 |
   | 8~30% | — | **제목** (지금 그대로) |
   | 31~37% | 한글 이름 '라이트 디펜스'와 슬로건 | 어두운 하늘만. 달·밝은 별을 두지 않는다 |
   | 42~78% | — | 세 친구 + 별 등불, 뒤로 언덕 위 마을과 달. 캐릭터는 가로 15~85% 안, 발은 78%보다 위 |
   | 80~100% | 메뉴 단추 5개 | 어둡고 차분한 앞쪽(풀·냇물·꽃). 중요한 것 없음 |
   | 좌우 9% | 세로로 긴 폰에서는 잘림 | 제목·캐릭터를 두지 않는다 |
4. **제목은 최신 그대로**: `title-reference.png`의 글자, 위의 별과 고양이 귀 모양 아치, 아래 장식선을 그대로 둔다. 제목 말고 다른 글자는 넣지 않는다.

## 캐릭터 (기준 사실서와 컨셉 그림 그대로)

- **루미**: 검은 고양이, 초록 눈, 작은 노란 별이 달린 주황 스카프. 빛을 보내는 아이다. 등불을 들지 않는다.
- **토리**: 흰 토끼, 남보라 눈. 접힌 귀와 민트 리본(매듭에 노란 별)은 **토리 자신의 왼쪽 귀**, 다른 귀는 곧게 선다. 정면이면 보는 사람의 오른쪽, 뒷모습이면 왼쪽이다. 귀까지 재면 루미보다 크다.
- **도토**: 작은 붉은 갈색 다람쥐. 크림색 배, 귀 끝 털, 이마의 짧은 줄무늬, S자 큰 꼬리, 별이 박힌 황금 도토리.
- 뒷모습으로 그린다면 고개를 조금 돌려 옆얼굴이 보여도 좋다. 그때도 리본 쪽을 다시 확인한다.

## 참고 그림을 쓰는 법 (Claude 점검)

- `ref-mood-thumbnail.png` (실루엣 포스터): **분위기 참고**. 그림 속 어둠의 주민(박쥐·새싹) 실루엣은 이번 홈 그림에 넣지 않아도 된다.
- `ref-scene-leaflet.jpg` (가로 장면): **캐릭터 모습·빛 표현 참고**. 이 그림의 토리는 정면이라 리본이 보는 쪽 오른쪽, 곧 왼쪽 귀로 맞다.
- `ref-gameplay-ui.png` (게임 화면 UI): **UI가 그림 위에 올라가는 느낌만 참고**. 이 그림의 능력 선택 카드, 불꽃 하트 5개, 미니맵은 지금 게임에 없다. 홈 그림에는 어떤 UI도 그리지 않는다.

## 받을 것

1. **9:16 세로 PNG 1080×1920** (최소 941×1672). 투명 배경은 필요 없다.
2. (되면) **제목만 투명 PNG**: 같은 디자인. 게임이 가로 화면·불러오기 화면에서 따로 쓸 수 있다.
3. (1번이 정해진 뒤, 선택) **16:9 가로 1920×1080**: 같은 장면. 제목은 왼쪽 절반, 캐릭터는 가운데에서 조금 왼쪽, 오른쪽 1/3은 메뉴 자리로 어둡고 차분하게.

## 영문 프롬프트 (그대로 붙여 넣기)

```
Redraw the HOME SCREEN art for my mobile game "Light Defense" (attached: current-home-art.png = the version to improve, home-layout-guide.png, tori-ribbon-guide.png, title-reference.png, the three character concept images, and three mood references).
Mood: a calm night that glows softly in the dark. Mostly deep navy-violet darkness; light comes gently only from the star lantern, fireflies, the village windows and the moon. Fewer and smaller bright areas than the current version, less saturated purple, warm quiet glow — not flashy. The silhouette poster reference is closest in mood.
Scene (keep from the current art): Lumi, Tori and Doto together beside a small lantern with a star inside, a village with warm windows on a distant hill, a full moon, a frame of forest leaves, a small stream in the foreground.
Characters must match the concept art exactly. Lumi: black cat, green eyes, orange scarf with a small yellow star; she does not hold the lantern. Tori: white rabbit, blue-violet eyes; the folded ear and the mint ribbon with a yellow star knot are on Tori's OWN LEFT ear, the other ear stands up — in a back view that ear is on the viewer's LEFT, in a front view on the viewer's RIGHT (the current art has it on the wrong ear). Doto: small red-brown squirrel, cream belly, ear-tip tufts, short forehead stripes, big S-shaped tail, golden acorn with a yellow star.
Title: keep the "LIGHT DEFENSE" title exactly as in title-reference.png (same lettering, the star and cat-ear arch above, the ornament line below). No other text anywhere.
This is a game home screen — the game draws its own buttons on top, so follow home-layout-guide.png (percentages of the image height): top 1–7% left and right corners stay simple (profile chip and settings button go there); title in 8–30%; 31–37% stays plain dark sky with no moon or bright stars (the game writes the Korean name and slogan there); the three friends, lantern, village and moon in 42–78%, characters inside 15–85% of the width with their feet above 78%; the bottom 80–100% is a dark, calm foreground (grass, stream, flowers) with nothing important (five menu buttons go there). Tall phones crop about 9% from each side, so keep the title and characters away from the side edges. In landscape the whole image is shown as one tall poster, so it must also work as a single poster.
Do not draw buttons, panels, HUD, icons, frames, watermark or signature, weapons, or other animals as main characters.
Output: a 9:16 portrait PNG at 1080x1920. If possible, also give me the title alone as a transparent PNG with the same design.
```

## 받은 뒤 (Claude Code)

- 리본 귀, 제목, 구역(특히 31~37%와 아래 20%), 좌우 9%를 재고 어긋나면 알린다.
- 맞으면 `art-src/backgrounds/home.png`를 바꾸고 `npm run assets`. 홈 배치(세로·가로)는 이미 이 구역에 맞춰 두었다.
- 제목 투명 PNG가 오면 가로 화면·불러오기 화면에 쓸지 제안한다.
