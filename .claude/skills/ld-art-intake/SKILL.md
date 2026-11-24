---
name: ld-art-intake
description: 라이트 디펜스에서 ChatGPT가 만든 그림(캐릭터 대기·걷기 팩, 홈·배경, 제목, 초상 등 zip이나 PNG)을 받았을 때 쓴다. "바탕화면의 OO.zip 확인해서 적용", "토리/도토/루미에게 적용", "홈 화면으로 적용", "그림 받았어" 같은 요청이면 먼저 연다. 규격·기준과 대조(눈 겹침·리본 귀·크기·발끝 포함) → 제자리에 넣기 → 게임 적용 → 확인 → 기록·배포까지의 순서와 점검표.
---

# 그림 받기 (ChatGPT → 게임)

역할 분담: 그림은 ChatGPT, 대조·적용·기록은 Claude. **받는 즉시 대조하고, 어긋남은 보고 맨 앞에.** 외형은 바꾸지 않는다(다듬기는 크기·테두리·떨어진 조각 정도만, 그 밖은 라이언 승인).

## 1. 풀기 (안전하게)
- zip은 **새 빈 임시 폴더**에 푼다(스크립트 폴더와 따로): `tar.exe -x -f "<zip>"` (`C:/Windows/System32/tar.exe`).
- README·manifest를 읽고 무엇이 왔는지(방향·프레임·크기·제작 메모) 적어 둔다.

## 2. 재기 — `node scripts/art-check.mjs`
- 걷기 한 방향: `--dir <폴더> --char tori --view 000_front` (같은 방향 팩 대기 그림과 견줌)
- 대기 8장: `--dir <폴더> --char doto --kind idle` · 배경: `--kind bg`
- **그림 일괄 지시서**(2026-11-24 `hand-offs/art-master-order-26-1124-1000/`): 그림 마감 없음, 자리 있는 그림은 오는 대로(코드 변경 없는 교체는 동결 뒤에도), 소품·바닥 새 연결은 동결 전에 끝날 때만. 중앙 광원 `source_bright·dim·off` → `art-src/objects/central-source.bright·dim·off.png`, 등불 `lantern_on·dim·off` → `lantern.on·dim·off.png`, 아이템 `item-wind-feather.png` → `art-src/items/item-wind_feather.png`(붙임표 → 밑줄).
- **캔버스 앵커 팩**(2-C 호스틸·주민, 2026-11-24): 시트에 `register: 'canvas'`(나는 종은 시트 `art`, 걷는 종은 `CREATURES[id].register`) — 포즈마다 따로 자르면 날개·꼬리 자세로 몸이 흔들린다. 박쥐·웨어울프에 켬. 중앙 광원은 `art-src/objects/`(폴더 새로).
- 2-C(2026-11-24): 두 모습(빛을 잃은·제 모습, 박쥐 어둠·되돌아온) = `--kind pair --dir <A> --dir2 <B> --a <접두사> --b <접두사>`(같은 칸 높이·발끝·가운데 ±8px), 잠든 모습 = `--kind sleep --dir reference/Sleep_Pack`(축척 ±10%, X 눈·zzz·글자는 눈으로). 자리 대조표는 `docs/design/NIGHT_RUN.md` 14-4.
- 경고 기준: 512 캔버스 · 발끝 495~496 · f01 = 대기 그림 · 뜨는 높이 ≤ 8 · 눈 높이 ±6 · 귀 끝 ±15 · 눈 색 · **눈동자 덩이 수(눈 겹침)** · 토리 리본 쪽 · 가장자리 흰 줄 · 떨어진 조각.
- **확인용 그림(`_art-check.png`)을 반드시 Read로 열어 얼굴 확대 줄을 눈으로 본다.** 2026-11-18 앞모습 걷기의 눈 겹침은 평균 색·높이 수치로 잡히지 않았다.

## 3. 기준 (틀리기 쉬운 것)
- **토리**: 접힌 귀 + 민트 리본(노란 별) = 토리 자신의 **왼쪽 귀**. 보는 쪽 오른쪽 = 0°·45°·315°, 왼쪽 = 135°·180°·225°, 옆모습 90°·270°는 귀 위치로 판단. **왼쪽 방향은 뒤집기 금지.** 눈 = 짙은 남보라(#4E4698 둘레) 세로 타원.
- **도토**: 뒤집기 허용. 팩이 꼬리 포함 실루엣 가운데로 오면 몸 기준점 표 `anchorX`(`src/art/friendSheet.ts`)로 맞춘다.
- **루미**: 등불을 들지 않는다.
- **팩 규격**: 512×512 투명, 발끝 y 496, 귀 끝 약 48, 한 팩 한 축척. 걷기 = 방향마다 4장, f01 = 그 방향 대기 그림 그대로.
- **홈 배경**: 캐릭터·글자·버튼 없음(라이언 결정), 구역은 `docs/design/HOME_SCREEN.md`.
- 크기가 다르게 오면(예: 1254×1254) 몸 범위(귀 끝~발끝)를 48~495줄·가로 가운데로 두 단계 축소해 맞춘다(2026-11-18 토리 135° 방식). 받은 원본은 따로 보관.

## 4. 판단
- **적용**: 경고가 없거나 작은 것뿐.
- **적용 + 알림**: 목표보다 조금 큰 수치(귀 끝 +20 등). 보고와 재의뢰 자료에 적는다.
- **눈 색만 다름**: 다시 그리게 하지 않는다(속눈썹이 바뀜). `tori_eye_fix.py`(`hand-offs/chatgpt-tori-eye-fix-26-1118-1600/`)를 ChatGPT가 돌리게 재의뢰하거나, 라이언이 허락하면 Claude가 같은 계산(눈 픽셀만 f01 색을 밝기 순서로)으로 맞춘다.
- **f01이 대기 그림과 다름**(manifest가 'byte-for-byte'라 해도): 그 방향은 적용하지 않는다 — ChatGPT가 옛 자기 팩을 쓴 것(2026-11-18 135°).
- **빼기**: 눈 겹침·리본 반대 귀·잘림처럼 바로 보이는 오류. 그 방향만 `_rejected/<방향>_<이유>_YY-MMDD-HHMM/`로 옮겨 게임이 대기 그림 임시 깡충을 쓰게 한다.

## 5. 넣기 (이름·자리)
| 받은 것 | 자리 |
|---|---|
| 토리·도토 대기 | `reference/<Char>_8_Direction_Pack/<Char>_Idle_8D_Pack/<char>_idle_<각도3>_<이름>.png` |
| 걷기 | `reference/<Char>_8_Direction_Pack/<Char>_Walk_8D_4Frames_Pack/<각도3>_<이름>/<char>_walk_<각도3>_<이름>_f01~04.png` (strip은 `strips/`, 메모는 `notes/`) |
| 초상 | 대기 45°를 `art-src/characters/portrait-<char>.png`로 복사 |
| 홈·배경·제목 | 원본 `reference/Home_Art_Pack/`, 다듬은 판 `art-src/backgrounds/<키>.png` (`src/art/registry.ts` 키) |
| 행렬 패시브 팩(2026-11-24 올빼미 — `reference/Passive_Pack/<id>/`, 15장) | 걷기 `<id>_walk_<각도>_fNN` → `art-src/enemies/<id>.walk_<각도>_fNN.png`, 웅크림 `<id>_cower` → `<id>-cower.cower.png`, 도망 `<id>_flee_fNN` → `<id>-flee.fNN.png`(2장). 웅크림이 정면이면 전 방향 공용·뒤집지 않음(기획 세션이 받아들임), 도망은 옆(오른쪽) — 가로 부호로 뒤집기. 점검 기록 `README_claude.md`, 판 위 캡처는 행렬을 그 종으로 바꿔 당겨 찍음(`rules.parade.queue` kind·at) |
| 받은 zip | 바탕화면 station 해당 묶음의 `received/`로 옮김 |
| v3 브리프 그림(아침·새 지역 카드·이야기 카드 2장·아이콘·노월 낱장·패시브 웅크림/도망·격자 소품) | `docs/design/NIGHT_RUN.md` 13절 끝 **그림 이름 ↔ 게임 자리 대조표**대로 — 패시브 = `art-src/enemies/<id>-cower.cower.png`·`<id>-flee.f01~f04.png`(2026-11-24 자리 있음), 노월 낱장은 `WITCH_FRAME` 순서로 시트에, 준비물 아이콘 붙임표 → 밑줄 |
- 각도·이름: 000_front · 045_front_right · 090_right · 135_back_right · 180_back · 225_back_left · 270_left · 315_front_left.

## 6. 적용·확인
1. `npm run assets` → `public/assets/` 갱신(친구 시트는 `friendSheet.ts`가 팩 파일을 읽음).
2. 화면 확인: `node scripts/screens.mjs` (스킬 `ld-screen-check`). 캐릭터는 트라이얼에서 그 캐릭터로 8방향 걸어 보기.
3. 점검 기록: 팩 폴더의 `README_claude.md` 또는 `notes/<묶음>_claude_check.md`(표: 항목·결과·목표).
4. `docs/DECISION_LOG.md`에 한 줄, CLAUDE.md 4절 '받은 상태'를 갱신.
5. 마무리·배포는 스킬 `ld-ship`.

## 7. 보고 (한국어, 맨 앞에 어긋남)
- 어긋남·오류 → 점검 결과 표 → 바꾼 것·자리 → 확인한 화면 → 남은 것과 ChatGPT에 전할 말(한 줄 메시지).
