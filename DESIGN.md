---
name: 라이트 디펜스 (Light Defense)
description: 작은 빛으로, 마을을 되찾아요. 남색 밤 마을 위에 호박빛이 번지는 모바일 우선(가로 기본·세로 제공) 캐주얼 액션 디펜스.
colors:
  night: "#1b1f3b"
  dusk: "#2a2f5a"
  predawn: "#120f24"
  dawn: "#f2b880"
  amber: "#ffc857"
  mint: "#9ed9b5"
  lavender: "#a89cd9"
  ember: "#ff8c5a"
  paper: "#f6f1e7"
  ash: "#8a8fa8"
  paper-soft: "color-mix(in srgb, #f6f1e7 74%, #8a8fa8)"
  hairline: "color-mix(in srgb, #f6f1e7 14%, transparent)"
  hud-band: "rgba(17, 18, 40, 0.9)"
  hud-floor: "#14152e"
  panel-top: "#262a56"
  panel-bottom: "#181b3a"
  track-night: "#33365e"
  track-meter: "#1d1f3d"
  glass-top: "#34396c"
  amber-light: "#ffd77a"
  amber-deep: "#f2ad3f"
  amber-gloss-top: "#ffdc85"
  amber-gloss-bottom: "#f0a43a"
  amber-rim: "#d08a2c"
  combo-gold: "#ffd76e"
  combo-stroke: "#5a3212"
  light-core: "#fff1c9"
  village-ground-dark: "#211d33"
  village-stone-dark: "#302b46"
  village-ground-lit: "#4a2a16"
  village-stone-lit: "#ad6c3c"
  village-leaf-dark: "#2b4a4a"
  village-flower-dark: "#7d6fc0"
  village-wall-dark: "#3a2f45"
  card-top: "#262a54"
  card-bottom: "#1a1c3a"
  arch-top: "#2e3166"
  switch-off: "#3a3f6b"
  lit-card-top: "#4c3624"
  lit-card-bottom: "#2a201f"
  shop-wood-top: "#3b2a33"
  shop-wood-bottom: "#2a1f2e"
  shop-shelf: "#6b4a2e"
  witch-plum: "#2b1b3d"
  witch-glow: "#ecdcff"
  witch-fill-light: "#d9ccff"
typography:
  display:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "11.111cqw"
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  wordmark:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "12.222cqw"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  score:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "11.111cqw"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "7.037cqw"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  screen-title:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "4.444cqw"
    fontWeight: 800
    lineHeight: 1.3
  title:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "3.333cqw"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "tnum"
  button:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "3.519cqw"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "3.148cqw"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif"
    fontSize: "2.778cqw"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  pill: "999px"
  sheet: "5.185cqw"
  slot: "2.222cqw"
  card: "2.593cqw"
  card-lg: "3.333cqw"
  round: "50%"
spacing:
  gap-sm: "2.222cqw"
  hud-inset: "4.074cqw"
  screen-inset: "4.815cqw"
  gap-md: "5.185cqw"
  sheet-inset: "6.667cqw"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.night}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 3.704cqw"
    height: "max(48px, 11.111cqw)"
  button-secondary:
    backgroundColor: "{colors.glass-top}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 3.704cqw"
    height: "max(48px, 11.111cqw)"
  button-secondary-disabled:
    textColor: "{colors.paper-soft}"
  button-round:
    backgroundColor: "{colors.glass-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.round}"
    size: "max(48px, 10.370cqw)"
  hud-top:
    backgroundColor: "{colors.hud-band}"
    textColor: "{colors.paper}"
    typography: "{typography.title}"
    padding: "3.333cqw 4.074cqw 2.963cqw"
  hud-bottom:
    backgroundColor: "{colors.hud-floor}"
    padding: "2.963cqw 4.074cqw 3.333cqw"
  stick-move:
    backgroundColor: "{colors.glass-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.round}"
    size: "25.926cqw"
  stick-move-knob:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.round}"
    size: "11.481cqw"
  stick-light:
    backgroundColor: "{colors.glass-top}"
    textColor: "{colors.amber}"
    rounded: "{rounded.round}"
    size: "27.778cqw"
  stick-light-knob:
    backgroundColor: "{colors.amber-light}"
    textColor: "{colors.night}"
    rounded: "{rounded.round}"
    size: "13.333cqw"
  stick-light-cancel:
    textColor: "{colors.ash}"
  sheet-panel:
    backgroundColor: "{colors.panel-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    padding: "7.407cqw 6.667cqw 5.556cqw"
  night-bar:
    backgroundColor: "{colors.track-night}"
    rounded: "{rounded.pill}"
    height: "2.037cqw"
  light-meter:
    backgroundColor: "{colors.track-meter}"
    rounded: "{rounded.pill}"
    height: "2.778cqw"
  station-count:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    width: "8.148cqw"
  toast:
    backgroundColor: "{colors.predawn}"
    textColor: "{colors.amber}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "1.481cqw 3.704cqw"
  combo-burst:
    textColor: "{colors.combo-gold}"
    typography: "{typography.display}"
  button-ghost:
    textColor: "{colors.paper-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "max(48px, 11.111cqw)"
  icon-button:
    backgroundColor: "{colors.glass-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.round}"
    size: "max(44px, 9.630cqw)"
  screen-bar:
    textColor: "{colors.paper}"
    typography: "{typography.screen-title}"
  tab:
    backgroundColor: "{colors.card-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    height: "max(44px, 9.259cqw)"
  tab-on:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.night}"
  card:
    backgroundColor: "{colors.card-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
  card-selected:
    backgroundColor: "{colors.lit-card-top}"
    textColor: "{colors.paper}"
  shop-card:
    backgroundColor: "{colors.card-top}"
    textColor: "{colors.paper-soft}"
    rounded: "{rounded.card-lg}"
    padding: "1.852cqw"
  rank-row:
    backgroundColor: "{colors.card-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "0 2.963cqw"
    height: "10.741cqw"
  rank-row-me:
    backgroundColor: "{colors.lit-card-top}"
    textColor: "{colors.paper}"
  switch:
    backgroundColor: "{colors.switch-off}"
    rounded: "{rounded.pill}"
    width: "max(52px, 11.852cqw)"
    height: "max(30px, 6.296cqw)"
  switch-on:
    backgroundColor: "{colors.mint}"
  input:
    backgroundColor: "{colors.card-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.card}"
    padding: "0 2.963cqw"
    height: "max(44px, 9.630cqw)"
  boss-bar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.witch-glow}"
    rounded: "{rounded.pill}"
    width: "77.778cqw"
  boss-bar-track:
    backgroundColor: "{colors.witch-plum}"
    rounded: "{rounded.pill}"
    height: "2.593cqw"
  result-panel:
    backgroundColor: "{colors.panel-top}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    padding: "5.926cqw 5.556cqw 3.704cqw"
---

# Design System: 라이트 디펜스 (Light Defense)

> 이 문서는 출하된 코드에서 기록했다. M1(플레이 + HUD + 일시정지 + 결과)과 2026-10-30 메뉴 화면 위에, 2026-11-04 빌드(두 스틱 조작, 조준 부채꼴과 화면 밖 화살표, 재질 층 `finish.css`, 홈·메뉴의 그림 배경, 카메라가 따라가는 넓은 마을), 2026-11-06 가로 화면, 그리고 2026-11-12 새 기획 Phase 1 빌드(아래 HUD = 하트·HP · 빛(LP) · 중앙 광원 · 켠 등불, 화면 밖 등불 표지, 홈 메뉴 `게임하기`, 캐릭터 3명과 빛을 잃은 모습 초상, 새 결과·토스트 문구, 중앙 광원·등불 스테이션·개구리 그림)를 반영해 갱신했다. 기준 소스는 `src/style.css`(CSS 사용자 속성, HUD, 시트), `src/ui/screens.css`(메뉴 화면), `src/ui/sticks.css`(두 스틱), `src/ui/finish.css`(재질 층, 마지막에 불러와 앞의 면·그림자를 덮음; 불러오는 순서는 `src/main.ts`), `src/ui/Hud.ts`·`src/ui/Toast.ts`·`src/ui/screens/*.ts`·`src/ui/*Sheet.ts`·`src/ui/BossBar.ts`·`src/ui/Sticks.ts`(마크업), `src/art/village.ts`(마을 `DARK`/`LIT` 톤, `drawWorld`), `src/art/objects.ts`·`enemies.ts`·`friends.ts`(중앙 광원 토템, 개구리, 토리·도토 초상), `src/entities/VillageStage.ts`·`CentralSource.ts`·`LightStation.ts`·`Lightkeeper.ts`·`AimGuide.ts`·`EdgeArrows.ts`(빛 고임·광원·등불·조준·표지)이다. 화면 전환은 `#ui[data-screen]` 하나(`src/ui/Router.ts`)로 하고, HUD와 스틱은 `play`일 때만 보인다. 배치의 기준은 `reference/ChatGPT-Images/light_defense_ui_screen_sheet.png`이고 기획서와 다른 점은 `docs/reference-crosscheck.md`가 정한다. 월드 아트와 초상(192px)은 `src/art/*`에서 내보낸 투명 PNG 시트(`public/assets/<분류>/`, `manifest.json`)이고, 홈 그림은 레퍼런스 그림을 잘라 정리한 `public/assets/backgrounds/home.webp`다. 그림이 바뀌어도 이 문서의 색 역할과 규칙은 이어받는다. 2026-11-12 정리: 하트는 잔불(ember), HP 막대 채움은 잔불 → 새벽빛(dawn)으로 팔레트 안에 넣었고(빨강 없음), 잠긴 주요 알약("아직 잠겨 있어요")은 호박 채움 대신 어두운 유리 + paper-soft 글자, 잠긴 로스터 칸 바탕은 predawn, 장착물·노월 줄의 남은 CSS는 지웠다.

## Overview

**Creative North Star: "빛이 닿은 곳만 켜지는 밤 마을"**

화면 전체는 살짝 기울여 내려다본 작은 동물 마을의 판석 광장이다. 마을(16:9 3200×1800 월드, 2026-11-06)은 늘 차가운 남색·보랏빛으로 잠들어 있고, 가운데에 금이 간 결정을 띄운 돌 받침의 **중앙 광원**이, 외곽에 바닥에 놓인 **등불 스테이션**이 있다. 루미는 등불을 들지 않고(2026-11-12) 맨몸으로 걸어 다니며, 카메라가 부드럽게 따라간다. 빛은 루미 둘레·중앙 광원·켜진 등불 세 곳에 고이고, 빛을 보내면 루미의 중심에서 60° 호박빛 부채꼴이 퍼지며 그 안의 돌·나무·풀숲만 **같은 마을의 '켜진' 판**(호박 갈색 돌, 따뜻한 나무, 올리브 잎, 분홍빛 꽃)으로 드러난다. 빛은 새 색을 칠하지 않고 이미 있는 마을을 깨운다. 콤보가 쌓이면 창문과 처마 등불이 하나씩 켜지고 반딧불이 늘어, 판의 성과가 점수판이 아니라 마을의 밝기로 보인다.

UI는 마을을 덮지 않는 두 개의 어두운 띠(위: 시간·진행·점수·콤보, 아래: 하트·HP · 빛(LP)·중앙 광원 막대 · 켠 등불 수 · 일시정지), 아래 띠 바로 위 양쪽 엄지 자리의 두 스틱(왼쪽 연보라 이동, 오른쪽 호박 빛), 그리고 필요할 때만 위·아래에서 미끄러져 들어오는 남색 판으로 이뤄진다. 스틱 사이와 광장 가운데는 비워 둔다. 글자는 Pretendard 한 가족이고 굵기로만 위계를 나눈다. 강조는 호박색 하나이며, 순간의 손맛(콤보 단계)은 진한 갈색 외곽선을 두른 큰 금빛 글자와 네 갈래 별로 터진다.

떠 있는 것은 모두 '만든 물건'의 재질을 가진다. 호박 알약은 윗면 광택 띠와 진한 호박 테두리를 두른 사탕 같고, 보조 알약·원 버튼·스틱 바닥은 위가 조금 밝은 남색 유리이며, 판과 카드는 아주 옅은 종이 결과 윗변의 가는 빛줄을 가진다. 메뉴 화면도 같은 밤 마을 위에 얹힌다. 홈은 등불을 든 루미의 마을 그림을 그대로 깔고 위아래만 가라앉혀 로고와 메뉴를 얹고, 선택·상점·지난 밤들은 같은 그림을 흐리고 어둡게 깐 위에 남색 막을 덮고 남색 카드를 쌓는다. 카드 묶음 안에서 '지금 고른 것'만 따뜻한 갈색으로 켜진다. 고르는 일도 빛이 닿는 일이다.

확인된 거부: 무기·폭발·체력바 문법의 판타지 디펜스·쿼터뷰 RPG, 평평한 톱다운 맵(Super Animal Royale 같은 인상), 피·붉은 피격 표현.

**Key Characteristics:**
- 차가운 남색 바탕 + 빛과 주인공에만 호박빛.
- 모든 월드 요소를 어두운 판과 켜진 판 두 벌로 칠하고, 빛은 마스크로 켜진 판을 드러낸다.
- 위아래 어두운 HUD 띠(가로 화면에서는 위 띠는 얇게, 아래는 가운데 작은 판), 아래 띠 위 양쪽 엄지 자리에 스틱 둘, 그 사이와 가운데 광장은 비운다.
- 메뉴는 남색 카드 묶음, 고른 카드 하나만 호박 테두리 + 따뜻한 갈색으로 켜진다.
- 떠 있는 면은 광택·유리·종이 결·윗변 빛줄의 재질을 갖는다. 평평한 단색 도형으로 두지 않는다.
- 알약과 원, 둥근 모서리만. 날카로운 각진 UI 없음.
- 반응은 그림자보다 빛의 번짐(글로우)으로.
- 모든 크기는 짧은 변 540 기준 단위로 비례한다.

## Colors

남색·보라의 차가운 밤 위에 호박·잔불·새벽빛의 따뜻한 색이 '빛'으로만 얹히는 2톤 팔레트다. 10색 기본 팔레트는 라이언이 확정한 값이고, 나머지는 그 팔레트에서 섞어 빌드에 실제로 쓰인 파생값이다.

### Primary
- **등불 호박 (amber)**: 유일한 강조색. 주요 알약 버튼과 켜진 탭의 채움, 빛 스틱 테두리·대기 링, HUD 콤보 숫자와 유지 시간 밑줄, 빛(LP) 막대의 별 아이콘, 모든 등불이 켜졌을 때의 등불 아이콘, 토스트 글자, 결과 점수(단색 + 은은한 글로우), 켜진 창문 유리, 등불·광원 글로우 틴트, 켜진 등불 스테이션의 광도 게이지, 화면 밖의 꺼진 등불을 가리키는 마름모 표지, 포커스 링과 텍스트 선택.
- **호박 광택 (amber-gloss-top → amber 52% → amber-gloss-bottom, amber-rim)**: 주요 알약과 켜진 탭의 채움 그라데이션. 주요 알약은 여기에 1.5u `amber-rim` 테두리를 두른다. 호박을 '사탕처럼 만든 면'으로 보이게 하는 짝이다.
- **밝은 호박 (amber-light → amber-deep)**: 빛 스틱 손잡이(`#fff4d2` → amber-light 45% → amber-deep 방사 그라데이션)와 금빛 별 장식(`--spark`)의 색.
- **콤보 금빛 (combo-gold)** + **콤보 외곽선 (combo-stroke)**: 콤보 단계 연출 글자 전용. 금빛 글자에 진한 갈색 외곽선을 둘러 어떤 마을 색 위에서도 읽힌다. 빛(LP) 막대 채움(`combo-gold` → `#f5a646`)의 시작색이기도 하다.
- **빛 심지 (light-core)**: 부채꼴·결정·등불의 가장 밝은 중심, 중앙 광원 막대 채움의 끝색(`#ffb35c` → light-core), 꺼진 등불이 켜지는 1.2초 동안의 게이지, 마름모 표지의 심, 맞은 중앙 광원의 번쩍임.

### Secondary
- **새싹 민트 (mint)**: '자라는 것'의 색. 밤 진행 바 채움(`#c8f1e1` → mint), 빛(LP) 막대 테두리, 막대 홈 바깥의 가는 테두리(35%), 루미의 눈, 테스트 판의 시계 글자. 버튼에는 쓰지 않는다.
- 민트는 설정 스위치가 켜진 상태에도 쓴다(스위치는 행동이 아니라 상태 표시다).
- **새벽빛 (dawn)**: 시간이 흘렀다는 따뜻함. HUD 구분선(45% 투명), 클리어 결과 판 위쪽의 34% 빛 웅덩이와 테두리, 새벽 시간대 덮개, 선택 화면의 능력치 줄, 지난 밤들에서 새벽까지 버틴 기록 옆의 작은 별.

### Tertiary
- **라벤더 (lavender)**: 어둠의 주민과 노월의 색, 그리고 '아직 닿지 않은 것'의 색. 빛을 잃은 모습(검은 털뭉치)의 눈빛, 꺼진 등불 스테이션 틴트(`#b8a8e0`), 풀숲의 보라 꽃(`village-flower-dark`), 선택 화면 아치 테두리(50%)와 잠긴 친구의 안내 글자·초상 후광, 판 위쪽의 14% 달빛 웅덩이, 화면 밖 적을 가리키는 가장자리 삼각 화살표, 이동 스틱의 연보라 원판과 구슬 손잡이.
- **노월 자두 (witch-plum, witch-glow, witch-fill-light)**: 보스 노월 전용. 체력바 홈과 얼굴 원 바탕은 깊은 자두색, 이름은 아주 옅은 라벤더, 채움은 `witch-fill-light` → lavender. 빨강·잔불로 칠하지 않는다.
- **잔불 (ember)**: 위험의 유일한 표현. 저HP일 때 HP 막대 채움과 화면 가장자리가 1초 주기로 잔불색으로 맥박친다. 중앙 광원 광도가 '낮음'이면 광원 막대 채움이 잔불색이 되고 테두리가 1초 주기로 잔불색으로 맥박치며, 광원이 맞으면 막대에 잔불 70% 12u 번짐이 0.35초 스친다. 등불 스테이션 게이지도 35% 아래면 잔불색이다. 빨강은 쓰지 않는다.

### Neutral
- **밤 (night)**: 기본 남색. 주요 버튼 글자색, 빛 스틱 별 아이콘, 한밤중 덮개.
- **초저녁 (dusk)**, **새벽 전 (predawn)**: 시간대 덮개 색. predawn은 페이지 바탕과 Phaser 배경, 그림 배경이 늦게 뜰 때의 바탕, 토스트 바탕(88%).
- **종이 (paper)**: 모든 기본 글자와 아이콘, 보조 알약·원 버튼의 테두리, 이동 스틱 손잡이(`#fffaf0` → paper 55% → `#d6cfc2`).
- **흐린 종이 (paper-soft)**: 보조 글자(부제, 통계 라벨, 비활성 버튼 글자, 조작 안내의 PC 줄). 남색 위 4.5:1 이상.
- **재 (ash)**: 가장 약한 정보(결과 구석의 seed), 지나지 않은 진행 바 눈금, 그리고 '지금은 안 나간다'(빛 스틱 취소 테두리, 대기 중 조준 부채꼴).
- **실선 (hairline)**: 아래 HUD 윗선과 패널 테두리 계열(14~16% 종이).
- **HUD 띠 (hud-band, hud-floor)**, **게이지 홈 (track-night, track-meter)**: 마을보다 한 단계 깊은 남색 면. 위 띠와 아래 띠에도 종이 결을 깐다. track-meter는 빛(LP)·중앙 광원 막대의 홈이자 로스터 칸의 바탕이다.
- **남색 유리 (glass-top → hud-floor, 92%)**: 보조 알약·메뉴 원 버튼·일시정지 원의 면. 위에서 흰 10% 광택이 절반까지 내려오고 윗변에 종이 16% 빛줄이 있다. 원 버튼은 같은 두 색을 위 35% 중심 방사로 쓴다. 스틱 바닥은 LUMI 시트 '조작 UI'를 따른 반투명 보라 유리(`rgba(126,104,196,0.42)` → `rgba(52,40,96,0.5)`)다.
- **판 (panel-top → panel-bottom)**: 결과·일시정지·설정 판. 종이 결 + 위쪽 라벤더 14% 웅덩이 + 세로 그라데이션. 클리어 결과는 `#2c2c55` → `#1b1d3c` 위에 dawn 웅덩이.
- **카드 (card-top → card-bottom)**: 메뉴 카드의 기본 면(꺼진 탭, 로스터 칸, 상점 카드, 순위 줄, 설정 입력칸과 도움말 우물). 종이 결 + 흰 6% 윗광 + 세로 그라데이션. 선택 아치는 `arch-top` → `#1b1d3c` 위에 바닥 호박 36% 원광과 위 라벤더 30% 달빛을 둔다.
- **스위치 꺼짐 (switch-off)**: 설정 스위치의 꺼진 홈. 켜지면 민트.

### Lit surfaces (켜진 면)
빛이 닿은 마을처럼, UI에서도 '빛을 받은' 면만 따뜻한 어두운 톤을 쓴다.
- **고른 카드 (lit-card-top → lit-card-bottom)**: 지금 고른 캐릭터의 로스터 칸, 장착 중인 상점 카드, 지난 밤들의 내 기록 줄. 종이 결 + 위쪽 호박 28% 웅덩이 + 따뜻한 갈색 그라데이션, 윗변 크림 22% 빛줄, 호박 38% 16u 글로우. 언제나 호박 테두리(3u, 내 기록 줄은 1.5u)와 함께 쓴다.
- **가게 나무 (shop-wood-top → shop-wood-bottom, shop-shelf)**: 상점 위쪽 230u 띠. 걸린 등불 둘(호박 32% 원광 두 개) 아래의 자줏빛 갈색 벽이 아래로 남색에 녹아들고, 제목 아래 갈색 선반 한 줄(9u, 모서리 3px)이 걸린다. 상점에만 쓰는 장면 색이다.

### Village tones (월드)
`src/art/village.ts`의 `DARK`와 `LIT`는 같은 키(ground, stones[5], stoneHi/Lo, crack, moss, ring, wall, roof, wood, leaf×3, flower, trunk, rock, cloth, windowOff, shadow)를 가진 짝이고, `drawWorld`가 3200×1800 월드 전체를 두 벌로 그려 `village-dark`·`village-lit` 그림으로 내보낸다. 어두운 판은 남보라 돌(`village-stone-dark` 계열 5색), 짙은 청록 잎(`village-leaf-dark`), 보라 꽃, 자줏빛 나무 벽(`village-wall-dark`)이고, 켜진 판은 호박 갈색 돌(`village-stone-lit` 계열), 올리브 잎, 분홍 꽃, 따뜻한 나무다. 어두운 판에만 위쪽 안개(haze 0.6)와 비네트(0.7)가 있어 먼 쪽이 어둡다. 월드 위의 새 사물도 같은 짝을 따른다: 중앙 광원 토템은 회보라 돌 받침(`#5B5670`~`#7F7998`) 위의 결정이 밝음(호박 22 글로우)·약함·꺼짐 세 칸이고, 개구리는 빛을 잃은 검은 털뭉치(`frog-dark`)와 제 색(`frog-true`) 두 벌, 토리·도토 초상도 제 모습과 빛을 잃은 모습(검은 털 `#1f1b2e` + 옅은 라벤더 눈 `#d6ccff`) 두 벌이다.

### Named Rules
**The 차가운 바탕, 따뜻한 빛 Rule.** 따뜻한 색(amber, ember, dawn, 켜진 톤)은 빛·등불·주인공·주요 행동(빛 스틱 포함)·점수, 그리고 빛을 받은 면(고른 카드, 등불 아래 가게)에만 쓴다. 배경, 띠, 패널, 기본 카드, 꺼진 마을은 언제나 남색·보라다.

**The 고른 것은 켜진다 Rule.** 카드 묶음에서 '지금 고른 것'은 하나뿐이고, 호박 테두리 + lit-card 갈색 그라데이션으로 켜진다. 고르지 않은 카드는 card 남색 그라데이션과 종이 14% 실선으로 둔다.

**The 잠긴 친구는 빛을 잃은 모습 Rule.** 잠긴 친구는 필터로 누른 실루엣이 아니라 따로 그린 '빛을 잃은 모습' 초상(검은 털 + 옅게 빛나는 라벤더 눈)으로 두고, 큰 초상에는 라벤더 45% 10u 후광, 아래에 라벤더 700 안내 글자를 붙인다. 구출할 친구가 어둠의 주민과 같은 모습으로 보인다. 회색 반투명이나 밝기 필터로 잠금을 표현하지 않는다.

**The 두 벌의 마을 Rule.** 월드에 새로 그리는 모든 바닥·소품은 `DARK`와 `LIT` 두 톤으로 같은 모양을 두 번 칠한다. 빛의 표현은 켜진 판을 마스크로 드러내는 것이지, 어두운 판 위에 주황을 덧칠하는 것이 아니다.

**The 하나의 강조 Rule.** 한 화면의 주요 행동은 호박 하나다(메뉴와 판에서는 호박 알약, 플레이에서는 빛 스틱). 같은 화면의 다른 행동은 보조(종이 테두리 유리) 알약이나 종이색 손잡이, 가장 덜 중요한 행동(지난 밤들에 남기기, 일시정지의 설정)은 흐린 알약이 된다. 호박 채움은 그 밖에 켜진 탭(현재 선택 상태)과 '장착 중' 꼬리표에만 쓴다.

**The 아직 아니면 재 Rule.** '지금 놓으면 빛이 안 나간다'는 상태는 호박을 빼거나 낮춰 보여 준다. 끌었다 가운데로 되돌린 취소는 재색 테두리와 채도 낮춤, 대기 중 조준 부채꼴은 같은 노랑을 22%로 흐린다. 빨강이나 경고 아이콘을 쓰지 않는다.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, Noto Sans KR, system-ui)
**Body Font:** 같은 가족
**Label/Mono Font:** 별도 없음. 모든 숫자는 `tabular-nums`

**Character:** 한 가족의 둥글고 고른 한글 고딕을 400~900 굵기로만 나눈다. 장식 서체 대신 크기·굵기·외곽선으로 손맛을 낸다.

### Hierarchy
크기는 짧은 변 540 기준 단위 `--u`(세로 `100cqw / 540`, 가로 `100cqh / 540`)의 배수다. 프론트매터의 `cqw` 값은 그 환산이다.
- **Display** (900, 60u, 자간 −0.01em): 콤보 단계 연출 "콤보 ×N" 전용. 금빛 + 3u 갈색 외곽선(`paint-order: stroke fill`) + 호박 후광, −6° 기울임.
- **Wordmark** (900, 66u, 행간 0.92, 기울임): 홈의 "LIGHT DEFENSE" 로고 전용. 레퍼런스 홈 화면의 로고를 따른 식별 자산으로, 금빛 세로 그라데이션 글자(`#fff3cf` → combo-gold → `#f3a63c`) + 1.5u 갈색 55% 외곽선 + 아래로 떨어지는 갈색 그림자와 호박 45% 22u 후광, 끝에 26u 금빛 네 갈래 별을 붙인다. 아래에 한글 "라이트 디펜스"(700, 20u, 자간 0.32em, paper)가 붙는다. 이 처리는 로고에만 있는 예외이며(`.impeccable/config.json`에 기록) 다른 제목·숫자에 옮기지 않는다.
- **Score** (800, 60u, 행간 1, −0.02em, tabular): 결과 판의 오늘 점수, 0.9초 카운트업. 단색 amber + 아래 갈색 그림자와 호박 35% 18u 글로우.
- **Headline** (800, 38u, 행간 1.2, −0.02em, `text-wrap: balance`): 시트 제목("아침이 왔어요", "마을이 환해졌어요", "오늘은 여기까지"). 일시정지 시트는 30u.
- **Screen title** (800, 24u): 메뉴 화면 위쪽 막대의 가운데 제목. 선택 화면의 캐릭터 이름은 800 30u(옆에 영문 이름 600 16u paper-soft).
- **Title** (600, 18u, tabular): 위 HUD 한 줄(밤 mm:ss, 점수). 콤보는 같은 크기 700 + 호박. 아래 HUD의 켠 등불 수("0/1")는 700 15u tabular paper.
- **Button** (700, 19u): 알약 버튼 글자, 토스트. 주요 알약 글자에는 크림 70% 1px 윗빛(새긴 듯한 결)이 있다.
- **Body** (400, 17u): 시트 부제("중앙 광원을 지켰어요 · 남은 하트 2개", "버틴 시간 01:12 · 구출한 주민 3명"), 홈 슬로건(paper-soft). 결과 통계 값은 700, 20u.
- **Label** (400, 15u): 결과 통계 라벨, 카드 설명과 선택 화면 소개·능력치·안내 줄(14~16u, paper-soft·dawn·lavender). 가장 작은 글자는 조작 안내 둘째 줄(13u), seed(12u, 최소 11px).
- 입력칸 글자는 iOS 확대를 막기 위해 `max(16px, 18u)`.

### Named Rules
**The 한 가족 Rule.** Pretendard → Noto Sans KR 외의 서체를 들이지 않는다. 위계는 굵기와 크기로만 만든다.

**The 숫자는 흔들리지 않는다 Rule.** 시간·점수·콤보·통계 등 모든 바뀌는 숫자는 `font-variant-numeric: tabular-nums`로 폭을 고정한다(점수 6자리, 콤보 3자리까지 깨지지 않게).

**The 숫자는 단색 Rule.** 점수·콤보 같은 숫자는 단색(amber 또는 combo-gold)에 외곽선·글로우로만 힘을 준다. 그라데이션 채움 글자는 로고 하나뿐이다.

## Layout

화면은 상자 하나이고 `<html data-layout>`이 세로·가로를 정한다. 세로 상자는 `min(100vw, 100dvh × 9/16)` × `100dvh`(PC에서는 가운데에 놓여 양옆이 predawn 바탕), 가로 상자는 높이 540 기준에 폭이 720~1280(4:3~21:9)인 창을 꽉 채운다(PC 기본, 휴대폰은 눕히면). 짧은 변이 540으로 고정되어 물체 크기는 그대로이고 보는 프레임만 바뀐다. 상자 안에 Phaser 캔버스와 HTML UI 층이 같은 크기로 겹친다. UI 층은 `container-type: size`의 컨테이너 단위로 `--u`(세로 `100cqw / 540`, 가로 `100cqh / 540`)를 정의하고 모든 치수를 `--u`의 배수로 쓴다. 9:16보다 긴 폰에서는 위아래 남는 띠를 HUD가 차지해 월드를 덜 가린다.

- 월드: 16:9 3200×1800 마을을 카메라가 루미를 따라가며 비춘다(경계 고정). 첫 화면은 가운데(1600, 900)의 중앙 광원과 루미를 비춘다. 빛 부채꼴은 루미의 중심에서 나오고, 등불 스테이션은 중앙에서 약 340~370 떨어진 바닥에 놓인다(2026-11-12 당김).
- 위 HUD: 좌우 22u, 위 `max(18u, safe-area-inset-top)`. 한 줄에 달 + 밤 시계 · 진행 바(남는 폭 전부) · 점수 · 구분선 · 콤보. 터치 요소 없음.
- 아래 HUD: 좌우 22u, 아래 `max(18u, safe-area-inset-bottom)`, 간격 14u. 하트·HP(92u 폭) · 구분선 · 빛(LP)·중앙 광원 막대 두 줄(남는 폭, 줄 간격 6u) · 켠 등불 수(최소 44u) · 일시정지. 엄지 영역.
- 가로 화면: 위 띠는 아래로 옅어지는 막 하나에 가운데 760u 폭으로 모으고, 아래 띠는 걷어 내 가운데의 둥근 판(최대 500u, 모서리 30u, `rgba(20,21,46,0.86)`, 종이 16% 실선)만 남긴다. 판 밖은 터치를 통과시키고, 두 스틱은 양 아래 구석의 마을 위에 놓인다. 하트는 22u.
- 두 스틱: 아래 HUD 바로 위 220u 높이 띠, 바닥은 띠 위 14u. 왼쪽 이동 스틱은 왼쪽 22u에서 210u 정사각 손 닿는 영역 안에 140u 바닥 원, 오른쪽 빛 스틱은 오른쪽 34u에서 176u 영역 안에 150u 바닥 원. 손잡이는 바닥 반지름의 0.62배까지 움직인다. 두 스틱 사이 빈 곳은 터치를 받지 않아 월드가 그대로 보인다. PC는 WASD로 걷고 마우스로 겨눈다.
- 가운데: 비운다. 화면 밖 표지(적 화살표·등불 마름모)는 화면 가장자리에서 좌우 16u, 위 96u, 아래 132u(가로는 좌우 28, 위 78, 아래 96) 들인 안쪽 사각형 테두리 위에만 뜬다(HUD 띠와 스틱을 피한다).
- 시트: 결과는 아래에서, 일시정지는 위에서. 안쪽 여백 좌우 36u, 버튼은 2열 그리드(간격 12u).
- 리듬: 6·7·12·14·22·28·36u 단계가 반복된다.

- 메뉴 화면: 같은 상자를 채우는 층. 안쪽 여백 위 `max(18u, safe-area)`, 좌우 26u, 아래 `max(26u, safe-area)`. 위쪽 막대는 왼쪽 뒤로 원 버튼 · 가운데 제목 · 오른쪽 같은 폭의 빈칸(제목을 정확히 가운데에). 나타날 때 10u 아래에서 0.35초 올라온다.
- 홈: 홈 그림을 cover로 깔고(가로 32% 기준), 로고는 왼쪽 위(44u 아래), 설정 원 버튼은 오른쪽 위, 메뉴 알약 셋(게임하기·지난 밤들·상점, 개발 빌드에서만 넷째 테스트)은 오른쪽 아래 250u 폭 세로 묶음(간격 12u, 왼쪽 정렬), 슬로건은 로고 아래 14u, 프로필 칩은 왼쪽 아래. 가운데는 그림 속 등불지기와 빛이 보이도록 비운다.
- 선택: 아치 초상(270u)과 좌우 화살표가 아래쪽 무게중심에, 그 아래 이름 · 소개 · 능력치 · (잠기면) 안내 줄, 가운데 맞춘 3칸 로스터(104u 정사각, 간격 14u), 안내 한 줄("아이템은 곧 챙겨 갈 수 있어요"), 맨 아래 주 버튼(330u 가운데). 가로에서는 왼쪽에 아치(300×330u), 오른쪽에 나머지를 쌓는다.
- 상점·지난 밤들: 3칸 탭(간격 8u) 아래 3열 카드 그리드(간격 12u) 또는 세로 순위 목록(줄 간격 8u). 내 기록 줄은 목록 아래 고정되어 스크롤되지 않는다.
- 결과: 화면 아래, 좌우 24u 떨어져 뜬 판. 버튼은 2열, 흐린 알약은 아래 한 줄 전체. 일시정지는 위에서 내려오는 판에 2×2 버튼.
- 노월 체력바: 위 HUD 바로 아래 가운데 420u.

**The 540 단위 Rule.** UI 치수는 px가 아니라 `--u` 배수로 쓴다. 예외는 접근성 하한뿐이다: 알약 `max(48px, …)`, 원 버튼·탭·입력칸·로스터 칸 `max(44px, …)`, 스위치 `max(52px, …)`×`max(30px, …)`, 입력 글자 `max(16px, …)`, seed 글자 `max(11px, …)`. 스틱은 하한이 필요 없을 만큼 크다(가장 작은 손 닿는 영역 176u).

**The 엄지 자리 Rule.** 플레이 중 상시 터치 요소는 아래 HUD 띠와 그 바로 위 양쪽 엄지 자리의 두 스틱뿐이다. 왼쪽은 걷기, 오른쪽은 빛이며 자리를 바꾸지 않는다. 스틱 사이와 광장 가운데에는 상시 UI를 두지 않는다.

**The 빈 광장 Rule.** HUD·스틱·시트 외에 광장 위에 상시 떠 있는 UI를 두지 않는다. 일시적인 것(콤보 연출 27% 높이, 토스트 120u 높이, 조준 부채꼴, 가장자리 화살표)은 터치를 받지 않는다(`pointer-events: none` 또는 캔버스 그림).

## Elevation & Depth

깊이는 세 가지로 만든다. 월드는 기울인 시점(위로 갈수록 작고 납작한 판석)과 먼 쪽 안개, 소품 아래 블러 있는 부드러운 투영 그림자(캔버스 `shadowBlur` 6~14, 남보라 55%)로 공간감을 낸다. UI는 떠 있는 물건마다 재질을 준다: 윗변의 가는 빛줄(블러 없는 inset 하이라이트), 면 위쪽의 흰 광택 또는 라벤더·호박 빛 웅덩이, 아주 옅은 종이 결(`--grain`, SVG fractal noise 약 5.5%), 그리고 아래로 떨어지는 넓고 흐린 그림자 하나. 그리고 '살아 있는 것'은 그림자 대신 빛이 번진다(호박·민트·잔불 글로우).

### Shadow Vocabulary
- **판 그림자** (`0 14u 40u` var(--shadow) = `rgba(5,4,12,0.55)`): 결과·일시정지·설정 판이 마을 위에 떠 있을 때.
- **판 이중 테두리** (`inset 0 0 0 1u` 종이 5% + `inset 0 1.5u 0` 종이 14%): 판의 안쪽 가는 테두리와 윗변 빛줄.
- **주요 알약** (`inset 0 2u 0` 크림 65% 윗빛 + `inset 0 −4u 6u` 갈색 38% 아랫면 두께 + `0 6u 14u rgba(110,54,10,0.42)` 따뜻한 갈색 바닥 그림자): 호박 사탕의 윗면·아랫면·놓인 자리. 켜진 탭은 같은 결을 조금 약하게(`inset 0 −3u 5u` 35%, `0 4u 10u` 35%).
- **유리 버튼** (`inset 0 1.5u 0` 종이 16% + `0 5u 12u` 어둠 40%, 원 버튼은 `0 4u 10u`): 보조 알약·메뉴 원 버튼·일시정지 원.
- **카드** (`inset 0 1u 0` 종이 10% + `0 4u 10u` 어둠 32%): 메뉴 카드·꺼진 탭·입력칸·도움말 우물.
- **고른 것의 빛** (`inset 0 1.5u 0` 크림 22% + `0 0 16u` 호박 38%): 고른 로스터 칸·장착 중 상점 카드·내 기록 줄. 잠긴 큰 초상은 그림자 대신 라벤더 45% 10u `drop-shadow`. 상점의 등불·빛 색 견본은 호박 60~70% 12~18u 후광.
- **아치** (`inset 0 0 0 4u` 남색 50% + `inset 0 2u 0` 종이 18% + `0 10u 30u` 어둠 45%): 선택 화면 초상 틀.
- **막대 홈** (`inset 0 2u 3u` 어둠 50% + `0 0 0 1u` 민트 35%): HP·빛(LP)·중앙 광원 막대의 파인 홈.
- **스틱 바닥** (`inset 0 2u 0` 흰 8% + `0 6u 18u` 어둠 40%), **손잡이** (`0 4u 10~12u` 어둠 45% + 아래쪽 안쪽 그림자). 빛 스틱 손잡이는 호박 45% 16u 후광을 늘 갖고, 겨누는 중에는 바닥이 호박 50% 26u로 번진다.
- **글로우** (`drop-shadow` / `box-shadow 0 0 Nu`): 진행 바 별(민트 90%, 5u), 콤보 별(호박 90%, 10u), 판 모서리 별(호박 70%, 6u), 모든 등불이 켜진 등불 아이콘(호박 60%, 6u), 맞은 중앙 광원 막대(잔불 70%, 12u, 0.35초), 버튼 호버(호박 40% 16u / 종이 25% 14u), 누름(호박 55% 24u / 종이 30% 20u).
- **가장자리 맥박** (`inset 0 0 90u 8u` 잔불 55%): 저HP. 피격은 같은 자리에 어둠(`rgba(5,4,12,0.75)`)이 0.35초 스쳤다 사라진다.
- **메뉴 막**: 선택·상점·지난 밤들은 홈 그림을 `blur(7px) brightness(0.55) saturate(0.85)`로 깔고(가장자리가 보이지 않게 1.06배) 그 위에 `rgba(17,18,40,0.72 → 0.88)` 세로 막. 홈은 위 34%·아래 32%만 78%/80%에서 투명으로.
- **선반** (`0 4u 6u rgba(0,0,0,0.4)`): 상점 선반 아래의 짧고 흐린 그림자.
- **스테이지** (`0 30px 90px rgba(0,0,0,0.55)`): PC에서 9:16 상자를 바탕에서 띄운다.

### Named Rules
**The 빛이 곧 반응 Rule.** 반응(호버·누름·겨눔·가득 참)은 오프셋 그림자가 아니라 색 있는 글로우로 표현한다. 바깥으로 떨어지는 어두운 그림자는 놓인 자리를 보여 줄 뿐 상태에 따라 변하지 않으며, 언제나 흐리게(블러 6u 이상) 쓴다.

**The 만든 물건 Rule.** 떠 있는 면(알약, 원 버튼, 스틱, 판, 카드)은 윗변 빛줄 하나와 위가 밝은 면, 흐린 바닥 그림자를 갖는다. 판과 카드에는 종이 결(`--grain`)을 깐다. 블러 없는 선은 안쪽 하이라이트(윗변 1~2u)에만 쓴다.

## Shapes

UI의 형태는 알약(999px), 원(일시정지·아이콘 버튼·아바타·스위치 손잡이·스틱 바닥과 손잡이·빛 대기 링), 둥근 사각, 시트(28u)로 끝난다. 둥근 사각은 크기에 따라 반경이 커진다: 탭·순위 줄·입력칸·도움말 우물 14u(`card`), 로스터 칸 16u, 상점 카드 18u(`card-lg`), 가로 화면의 아래 HUD 판 30u. 상점 선반만 3px 모서리의 가는 막대다. 시트는 일시정지가 아래 두 모서리만, 설정이 위 두 모서리만 둥글고, 결과는 화면 가장자리에서 떨어져 네 모서리가 다 둥글다. 결과·설정 판의 위 두 모서리 안쪽에는 크기가 다른 금빛 네 갈래 별 둘(16u 왼쪽, 11u 오른쪽)이 걸린다. 선택 화면의 초상 틀은 위가 반원(135u)이고 아래가 22u인 아치다. 게이지(밤 진행, HP, 빛(LP), 중앙 광원, 노월)는 모두 알약이다. 월드의 등불 스테이션 게이지만 46×6 직사각 막대(바닥에 붙은 표지)다. 아이콘은 직접 그린 둥근 SVG(초승달, 네 갈래 별, 하트, 결정, 등불, 둥근 일시정지 막대, 재생 삼각, 집, 시상대, 가게, 톱니, 발자국, 자물쇠, 꺾쇠)이며 `currentColor`로 칠한다. 월드의 판석은 모서리를 둥글린 불규칙 다각형이고, 창문은 원형과 아치형, 지붕은 비늘 기와 곡선이다. 캔버스의 조준 부채꼴은 60° 원호 조각, 가장자리 화살표는 11px 둥글지 않은 작은 삼각형, 등불 표지는 17px 마름모(월드 위 표지라 예외)다. 직각 모서리는 HUD 띠의 화면 가장자리뿐이다.

## Components

### Buttons
따뜻하고 통통한 알약. 누르면 살짝 부풀며 빛난다.
- **Shape:** 완전한 알약 (999px), 최소 높이 `max(48px, 60u)`, 좌우 20u, 아이콘 22u + 간격 10u.
- **Primary:** 흰 50% 광택 띠(위 46%까지) 위에 호박 광택 그라데이션(`amber-gloss-top` → amber 52% → `amber-gloss-bottom`), 1.5u `amber-rim` 테두리, 글자 night + 크림 윗빛, 주요 알약 그림자(Elevation 참조). 홈의 "게임하기", 선택의 "빛을 밝혀요", 결과의 "다시 한 번", 일시정지의 "계속", 설정의 "닫기".
- **Secondary:** 2u 종이 55% 테두리 + 남색 유리 면, 글자 paper. 홈의 "지난 밤들"·"상점"(개발 빌드의 "테스트"도), 결과의 "홈으로", 일시정지의 "다시 한 번". (2026-10-30 라이언의 레퍼런스 맞춤 지시로 민트 테두리에서 바뀐 값이다.)
- **Hover / Focus / Active:** 호버는 마우스 기기에서만(`@media (hover: hover)`) 글로우. 누르면 `scale(1.04)` + 더 큰 글로우(0.12초 ease-out). 포커스는 호박 2px 외곽선, 3px 간격.
- **Disabled:** 테두리 재 55%, 글자 paper-soft, 커서 기본.
- **Ghost (흐린 알약):** 1.5u 종이 28% 테두리, 종이 5%에서 투명으로 내려가는 아주 옅은 면, 글자 paper-soft 600. 화면에서 가장 덜 중요한 행동(결과의 "지난 밤들에 남기기", 일시정지의 "설정").
- **Round (일시정지):** `max(48px, 56u)` 원, 2.5u 종이 85% 테두리, 남색 유리 면(방사), 같은 누름·호버 규칙. 아래 HUD의 유일한 터치 요소.
- **Icon button (메뉴 원 버튼):** `max(44px, 52u)` 원, 2u 종이 55% 테두리, 남색 유리 면(방사), 26u 아이콘, 같은 누름·호버 규칙. 뒤로·설정. 선택 화면의 좌우 화살표만 호박 아이콘 + 호박 55% 테두리.
- **알약 안 아이콘:** 모두 22u, 글자 앞(재생·집·시상대·가게·톱니).

### 두 스틱 (Signature)
플레이 중 손이 닿는 유일한 큰 조작. 남색 유리 바닥 원 위에 둥근 손잡이가 엄지를 따라간다.
- **이동 스틱 (왼쪽):** 140u 바닥 원, 2.5u 연보라 70% 테두리, 보라 유리 면과 세모·십자 눈금 무늬. 62u 연보라 구슬 손잡이(`#f1ecff` → `#c9b8f4` → `#8f78d4` 방사, 위 왼쪽이 밝음). 잡고 있는 동안 테두리가 더 밝은 연보라 95%. 놓으면 손잡이가 0.12초 `cubic-bezier(0.16, 1, 0.3, 1)`로 가운데에 돌아온다.
- **빛 스틱 (오른쪽):** 150u 바닥 원(같은 보라 유리), 2.5u 호박 70% 테두리. 72u 밝은 호박 손잡이 + 32u night 네 갈래 별 + 호박 후광.
- **겨눔:** 끌면 바닥 테두리가 amber로, 호박 50% 26u 글로우. 동시에 월드에 조준 부채꼴이 보인다.
- **취소:** 끌었다가 가운데로 되돌리면 테두리 ash, 그림자 없음, 손잡이 `grayscale(0.85) brightness(0.8)`. 이때 놓으면 빛이 나가지 않는다. 짧게 탭하면 사거리 안 가장 가까운 적에게 반자동으로 쏘고, 사거리 안에 적이 없으면 쏘지 않는다.
- **대기 링:** 쏜 뒤 대기 시간(캐릭터별 `--cool`, 기본 0.4초) 동안 바닥 바깥 7u에 4u 두께 호박 링이 `conic-gradient`로 한 바퀴 차오르고(불투명 90%, linear), 손잡이는 `saturate(0.6) brightness(0.88)`로 잠깐 흐려진다.
- **호버(마우스):** 테두리가 밝아진다(빛은 amber).

### Navigation (위쪽 막대와 탭)
- **위쪽 막대:** 뒤로 원 버튼 · Screen title 가운데 · 같은 폭 빈칸. 아래 16u.
- **탭:** 3칸 그리드, `max(44px, 50u)` 높이 14u 둥근 사각, 카드 재질 + 종이 14% 실선, 17u 600. 켜진 탭은 테두리 없이 흰 45% 광택 + 호박 광택 그라데이션 + night 800. 상점(스킨·등불·빛 색)과 지난 밤들(오늘·이번 주·전체)이 같은 탭을 쓴다.

### Cards / Containers (시트)
- **Corner Style:** 28u. 일시정지는 위에서(아래 두 모서리), 설정은 아래에서(위 두 모서리), 결과는 좌우 24u·아래 `max(28u, safe-area)` 떨어져 뜬 판(네 모서리).
- **Background:** 종이 결 + 위 라벤더 14% 웅덩이 + `panel-top` → `panel-bottom`. 클리어 결과는 위쪽에 dawn 34% 웅덩이, 테두리 dawn 60%.
- **Shadow Strategy:** 판 그림자 + 판 이중 테두리 (Elevation 참조).
- **Border:** 종이 16% 1px, 화면 가장자리에 붙은 변은 없음.
- **장식:** 결과·설정 판 위 모서리 안쪽의 금빛 별 둘(불투명 85%, 호박 글로우, 터치 없음). 일시정지 판에는 없다.
- **Internal Padding:** 결과 32u / 30u / 20u(가운데 정렬), 일시정지 `max(44u, safe-area + 24u)` / 36u / 40u.
- **결과 통계:** 제목·부제 아래 dt/dd 줄 목록: 오늘 점수 · 최대 콤보 · 구출한 주민 · 돌려보낸 어둠의 주민 · 켠 등불("1 / 1"). 줄마다 최소 46u, 라벨 왼쪽 · 값 오른쪽, 종이 14% 실선으로 나눈다(마지막 줄 없음). "오늘 점수" 값은 Score 결의 호박. 기본 승리("아침이 왔어요")와 완전 승리("마을이 환해졌어요")는 새벽빛 판, "오늘은 여기까지"는 기본 판.
- **Scrim:** 뒤쪽 마을은 `rgba(8,6,20,0.35)`로만 살짝 어두워져 마을이 계속 보인다.
- **Motion:** 결과는 0.6초, 설정은 0.5초 올라오고, 일시정지는 0.45초 내려온다(`cubic-bezier(0.16, 1, 0.3, 1)`).

### 메뉴 카드
- **로스터 칸 (선택):** 가운데 맞춘 3칸(루미·토리·도토), 104u 정사각(가로 92u), 16u, 카드 재질 + 1.5u 실선, 초상이 칸을 채운다. 현재 칸은 3u 호박 테두리 + 고른 카드 재질(잠긴 친구를 보고 있어도 켜진다). 잠긴 칸은 빛을 잃은 모습 초상 + 한 단계 깊은 바탕(predawn) + 오른쪽 아래 22u 자물쇠(paper-soft).
- **선택 화면 글줄:** 소개(paper-soft), 능력치 "사거리 · 위력 · 특성"(dawn, tabular), 잠기면 "잃어버린 친구예요. 구출하면 함께해요"(lavender 700), 로스터 아래 "아이템은 곧 챙겨 갈 수 있어요"(14u paper-soft). 주 버튼은 잠긴 친구일 때 "아직 잠겨 있어요"로 바뀌고 비활성.
- **상점 카드:** 3열, 가로세로 0.82, 18u, 카드 재질 + 실선, 그림이 위에 이름·꼬리표가 아래에 붙는다. 장착 중이면 3u 호박 테두리 + 고른 카드 재질 + paper 글자, "장착 중"은 호박 채움 알약 꼬리표(13u 800, night). 아직 없는 칸은 점선 원(종이 22%) + "준비 중". 빛 색 견본은 light-core → amber 55% → `#f0a040` 방사 원.
- **순위 줄:** 최소 58u, 14u, 카드 재질 + 실선, 열은 순위(40u) · 이름 · 버틴 시간(14u paper-soft) · 점수(800), 모두 tabular. 1~3위 순위 숫자는 호박, 새벽까지 버틴 기록은 이름 뒤 16u dawn 별. 내 기록 줄은 목록 아래 고정, 1.5u 호박 테두리 + 고른 카드 재질.
- **빈 목록:** 가운데 17u paper-soft 한 줄.

### 프로필 칩 (홈)
알약, 종이 14% 실선, hud-floor 88% 바탕, 16u 글자. 46u 원형 아바타(초상 위쪽 15%를 가운데로)에 2px ember 테두리. 닉네임은 말줄임.

### 설정 시트와 입력
- **시트:** 아래에서 0.5초 올라오는 판(안쪽 34u/32u). 줄은 최소 58u, 18u 글자, 아래 종이 14% 실선. 맨 아래 주 버튼 하나("닫기", 240u 가운데).
- **스위치:** `max(52px, 64u)`×`max(30px, 34u)` 알약. 꺼짐 switch-off, 켜짐 mint. 손잡이는 paper 원, 0.2초 `cubic-bezier(0.16, 1, 0.3, 1)`로 미끄러진다.
- **입력칸:** `max(44px, 52u)`, 14u, 카드 재질, 1.5u 종이 30% 테두리. 포커스는 전역 호박 2px 외곽선.
- **도움말 우물:** 카드 재질 14u 상자 안에 작은 두 스틱 그림 SVG(종이 손잡이 · 호박 손잡이와 부채꼴) + 두 줄(본문 한 줄, 아래 13u paper-soft로 PC 조작 한 줄).

### 노월 체력바 (Boss)
위 HUD 아래 420u 알약, night 92% 바탕, 1.5u 라벤더 60% 테두리. 왼쪽 42u 얼굴 원(witch-plum 바탕, 2px 라벤더 테두리, 노월 시트 첫 칸의 얼굴), 이름 17u 800 witch-glow, 14u 높이 witch-plum 홈(라벤더 30% 안쪽 실선)에 `witch-fill-light` → lavender 채움이 0.3초 ease-out으로 줄어든다. 노월은 쓰러지는 것이 아니라 깨어나는 것이므로 빨강·잔불을 쓰지 않는다.

### HUD 띠
- **위:** `hud-band`(90%) + 종이 결, 아래로 22u 높이로 투명해지는 막이 이어져 마을 위에 얹힌 느낌. 글자 paper, 콤보만 amber.
- **아래:** 불투명 `hud-floor` + 종이 결 + 종이 14% 윗선과 1.5u 종이 10% 안쪽 윗빛.
- **구분선:** 1px 세로선. 위는 dawn 45%(26u), 아래는 종이 22%(44u).

### 밤 진행 바 (Signature)
11u 높이 `track-night` 알약 + 종이 22% 안쪽 실선, 민트 그라데이션 채움(0.25초 linear). 시간대 경계 눈금 2개(지나면 paper, 아니면 ash 70%), 현재 위치는 민트 글로우를 두른 흰 네 갈래 별, 끝에는 종이색 새벽 별.

### 콤보 표시와 콤보 연출 (Signature)
- **HUD 콤보:** "콤보 ×N" 호박 700. 아래 2u 호박 밑줄이 콤보 유지 시간(`--window`) 동안 줄어든다. 늘면 숫자가 1.3배에서 0.22초에 돌아오고, 절반으로 줄면 0.6초 흐려졌다 돌아온다. 콤보 0이면 구분선과 함께 숨는다.
- **콤보 단계 연출(5·10·20·30):** 화면 27% 높이에 Display 글자 + 호박 곡선 휙 + 네 갈래 별 6개가 바깥으로 흩어진다(1.1초). 동시에 월드에서 창문·처마 등불이 하나씩 켜진다.

### 아래 HUD: 루미 · 빛 · 중앙 광원 · 등불 (Signature)
값이 바뀔 때만 다시 그리는 네 묶음. 모든 막대는 `--p`로 `scaleX`만 바꾼다(0.2초 ease-out).
- **루미 (하트 + HP):** 92u 폭 세로 묶음. 위에 26u 하트 3개(간격 4u, 잔불색 + 잔불 50% 4u 번짐), 아래에 9u 알약 HP 막대(막대 홈 재질, 채움 잔불 → 새벽빛). 빈 하트는 회남색 0.85배. 하트를 잃으면 0.5초 1.12배로 튀고, 잠든 동안 묶음이 55%로 흐려진다. 저HP면 HP 채움이 잔불색으로 1초 맥박. 하트·HP 채움 색은 아직 체계 밖이다(머리말의 어긋남 참고).
- **빛(LP)과 중앙 광원 막대:** 두 줄, 줄마다 20u 아이콘 + 15u 높이 `track-meter` 알약(2u 테두리, 막대 홈 재질, 안쪽 2u 띄운 채움). 빛은 amber 별 아이콘 · mint 테두리 · `combo-gold` → `#f5a646` 채움. 중앙 광원은 `#ffd98a` 결정 아이콘 · 호박 70%와 종이를 섞은 테두리 · `#ffb35c` → light-core 채움. 광도 단계는 `data-band`(0 낮음 ~ 3 크게 밝음)로 붙고, 0(낮음)이면 채움이 ember, 광원 테두리가 1초 잔불 맥박.
- **켠 등불 수:** 28u 등불 아이콘 아래 "켠 수/전체"(15u 700 paper). 아이콘은 평소 호박 45%를 남색에 섞은 꺼진 금빛, 모두 켜지면 amber + 호박 60% 6u 글로우, 하나 켜질 때마다 0.4초 튄다.
- **일시정지:** 오른쪽 끝 원 버튼(Buttons 참조).

### Toast
알약, predawn 88% 바탕, 호박 700 19u. 120u 높이에서 1.5초 동안 떠올랐다 사라진다. 터치를 받지 않는다. 문구는 짧은 한 줄: "등불이 켜졌어요" / "모든 등불이 켜졌어요!" / "하트 {n}개 남았어요", 판 시작 1.4초 뒤 한 번 "호박빛 표시를 따라 꺼진 등불을 켜요"(등불이 있는 스테이지만).

### 조준 부채꼴과 가장자리 표지 (World)
- **조준 부채꼴:** 빛 스틱을 끄는 동안(PC는 마우스를 누른 채 커서 쪽으로) 루미의 중심에서 60° 원호 조각을 바닥(루미·물체 아래)에 그린다. 밝은 노랑(`#FFE66D`) 50% 채움, 선 없음. 반지름만 끈 거리에 비례해 바뀌고 통째로 늘이지 않는다. 대기 중이면 같은 노랑을 22%로 흐린다.
- **가장자리 화살표 (적):** 화면 밖 적마다 화면 가운데에서 그 쪽으로 그은 선이 안쪽 사각형과 만나는 자리에 11px lavender 삼각형. 가까우면 불투명 0.95, 520px 이상 멀면 0.35까지 옅어진다.
- **등불 마름모 (꺼진 등불·위험한 광원):** 같은 자리에서 6px 안쪽으로 들인 17px amber 마름모(95%, predawn 80% 2px 외곽선, light-core 3px 심)와 그 둘레의 호박 원광(14~30%, 반지름 21~27px)이 약 1.6초 주기로 천천히 숨 쉰다(깜빡임 규칙 안). 적 화살표보다 크고 따뜻해서 '찾아갈 곳'으로 읽힌다.
- 둘 다 카메라에 고정되어 스크롤되지 않는다.

### 빛 부채꼴과 빛 고임 (World Signature)
루미는 등불을 들지 않는다. 빛은 루미 둘레(LP에 비례)·중앙 광원·켜진 등불 스테이션 세 곳에 고여 켜진 마을을 드러내고, 맵 전체 광도가 켜진 마을의 드러남과 어둠 덮개(`#0a0818`)를 정한다. 60° 부채꼴은 루미의 중심에서 `light-core` → amber → `#e08a3c` 그라데이션 텍스처를 ADD로 겹치고 0.25초에 퍼지며, 켜진 마을을 드러낸 채 다 퍼진 뒤 0.25초 남는다.
- **중앙 광원:** 돌 받침 위에 떠 있는 금 간 결정과 파편 셋. 밝음은 호박 글로우, 약함은 흐린 갈색 글로우, 꺼짐은 회보라 결정. 맞으면 light-core로 잠깐 채워진다.
- **등불 스테이션:** 등불 그림(켜짐·약함·꺼짐)을 바닥에 놓고, 발밑 12px 아래에 hud-floor 85% 바탕 + 종이 35% 1px 테두리의 46×6 광도 게이지. 켜지면 호박 글로우가 고이고, 꺼지면 그림이 라벤더 틴트로 가라앉는다. 부채꼴 안과 되돌림 지점에 흰색·`#ffd27a` 네 갈래 반짝이가 흩날린다. 반딧불은 `#ffd27a` ADD 점이고 켜진 불빛 수만큼 늘어난다. 시간대 덮개는 dusk 0 → night 22% → predawn 38%, 새벽은 dawn 18%로 1.5초에 바뀐다. 모든 등불이 켜지면 `#ffe0a8` 화면 전체가 ADD 22%로 잠깐 밝아지고 별 18개가 흩어진다.

## Do's and Don'ts

### Do:
- **Do** 새 화면의 주요 행동 하나를 호박 알약, 나머지를 종이 테두리 유리 알약, 가장 덜 중요한 것을 흐린 알약으로 만든다(최소 48×48, 누르면 1.04배 + 글로우).
- **Do** 새 메뉴 화면은 위쪽 막대(뒤로 원 버튼 + 가운데 제목) + 카드 재질 묶음으로 만들고, 고른 것 하나만 호박 테두리 + lit-card로 켠다.
- **Do** 새로 떠 있는 면에는 윗변 빛줄, 위가 밝은 면, 흐린 바닥 그림자를 주고, 판과 카드에는 `--grain`을 깐다.
- **Do** 잠긴 친구는 빛을 잃은 모습 초상과 라벤더 후광·안내 글자로 보여 준다.
- **Do** 모든 UI 치수를 `--u`(짧은 변 540 기준) 배수로 쓰고, 터치 표적만 px 하한을 둔다.
- **Do** 플레이 조작은 왼쪽 걷기·오른쪽 빛 두 스틱으로 두고, '아직 안 나간다'는 재색으로 알린다.
- **Do** 월드에 새 소품·배경을 그릴 때 `DARK`와 `LIT` 두 톤을 같이 정의하고, 빛은 켜진 판을 드러내는 방식으로 표현한다.
- **Do** 위험은 잔불색 맥박(HP 막대·중앙 광원 막대·화면 가장자리)과 막대가 줄어드는 것으로만 보여 준다.
- **Do** 성과(콤보·등불 점화)를 마을이 밝아지는 것(창문·등불·반딧불·화면 섬광)으로 함께 보여 준다.
- **Do** 바뀌는 숫자는 모두 tabular-nums와 단색으로 쓴다.
- **Do** 화면 밖 목표는 가장자리 표지로 알린다: 적은 라벤더 삼각형, 찾아갈 등불은 숨 쉬는 호박 마름모.
- **Do** 모든 연출에 `prefers-reduced-motion` 대체를 두고, 깜빡임은 초당 3회 이하로 둔다.

### Don't:
- **Don't** 배경·띠·패널·기본 카드·꺼진 마을에 따뜻한 색을 쓰지 않는다. 따뜻한 색은 빛의 것이고, 빛을 받은 면(고른 카드, 등불 아래 가게)만 예외다.
- **Don't** 빨강, 피, 폭발 파편, 붉은 체력바 같은 전투 문법을 쓰지 않는다. 피해는 어둠이 스치는 것, 저HP는 잔불, 노월의 바는 라벤더다.
- **Don't** 한 카드 묶음에서 두 개 이상을 켜지 않는다.
- **Don't** 평평한 톱다운 맵처럼 그리지 않는다. 판석은 위로 갈수록 작고 납작하게, 먼 쪽은 어둡게 둔다.
- **Don't** 보조 버튼 테두리를 민트로 되돌리지 않는다(2026-10-30 지시로 종이색).
- **Don't** Pretendard·Noto Sans KR 외의 서체나 글리프·이모지 아이콘을 들이지 않는다. 아이콘은 둥근 인라인 SVG로 그린다.
- **Don't** 로고 밖에서 그라데이션 채움 글자를 쓰지 않는다.
- **Don't** 블러 없는 바깥 오프셋 그림자를 쓰지 않는다. 블러 없는 선은 안쪽 윗변 빛줄에만 쓴다.
- **Don't** 광장 가운데나 두 스틱 사이에 상시 UI를 두거나, 일시적 연출이 탭·스틱을 가로채게 하지 않는다.
