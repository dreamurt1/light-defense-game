---
name: ld-screen-check
description: 라이트 디펜스 화면(홈·선택·상점·지난 밤들·트라이얼 판)을 라이언 지정 화면 크기 4종(PC 풀 화면·PC 세로 화면·모바일 세로·모바일 가로)과 태블릿·16:10·작은 폰에서 창 없이 한 번에 찍고, 버튼·제목·그림 속 물체가 겹치는지 숫자로 확인할 때 쓴다. UI·배치·CSS를 바꾼 뒤, 그림을 넣은 뒤, "화면 확인해봐" 요청이면 먼저 연다.
---

# 화면 점검 (헤드리스)

창을 띄우지 않는다(playwright MCP 금지). 헤드리스 크롬 `scripts/lib/chrome.mjs`.

## 1. 준비
- dev 서버: `npm run dev`를 백그라운드로(5173). 이미 떠 있으면 그대로.
- 그림을 바꿨다면 먼저 `npm run assets`.

## 2. 찍기 — `node scripts/screens.mjs`
```
node scripts/screens.mjs --screen home --sizes required \
  --overlap ".home-badge,.home__start|.home__logo,.home__slogan,.logo__ko" \
  --out sketches/<주제>-YY-MMDD-HHMM/screens.png
```
- `--screen` home | select | shop | ranking | trial(지정 캐릭터로 트라이얼 판)
- `--char` lumi | tori | doto (홈 프로필·트라이얼 등불지기)
- `--sizes required`(4종) | `all`(+ 태블릿 세로 820×1180 · 4:3 1180×820 · 16:10 1440×900 · 16:9 작은 폰 360×640)
- `--overlap "A|B,C|D"`: 겹치면 안 되는 두 무리(선택자 목록). 결과가 0이 아니면 종료 코드 2.
- 콘솔 오류도 함께 센다.

## 3. 그림 속 물체와의 겹침
- 배경 그림 속 물체(홈의 등불·마을)는 DOM이 아니라서 위 겹침에 안 잡힌다 → 그림 % 상자를 장면 상자(`.home__scene`)에 곱해 직접 잰다.
  - 세로 홈 등불 x 0.70~0.84 · y 0.585~0.705, 가로 홈 등불 x 0.465~0.57 · y 0.73~0.985, 가로 마을 x 0.65~0.88 · y 0.38~0.62.
  - 필요하면 `page.evaluate`로 `.home__scene`의 getBoundingClientRect에 곱한 상자와 버튼 상자를 비교(예시는 git 기록의 홈 작업).

## 4. 판 안 확인 (트라이얼)
- 캐릭터 걷기: 트라이얼에서 WASD를 눌러 방향마다 몇 장 잘라 모으고, `__game.scene.getScene('Play').keeper.sprite.anims.currentAnim.key`·`frame.name`으로 쓰는 칸을 기록.
- 한 판을 끝까지: `?autoplay=초` 등 개발 URL 옵션(CLAUDE.md 9절).

## 5. 반드시 할 것
- 모음 그림을 **Read로 열어 눈으로 본다**(겹침 숫자가 0이어도 어색함·가독성).
- 보고에 화면 목록·겹침 결과·콘솔 오류 수를 적는다. 라이언에게 보여 줄 그림은 SendUserFile.
