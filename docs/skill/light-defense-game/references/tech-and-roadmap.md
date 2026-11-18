# 기술 구조와 개발 단계

## 스택 (결정됨)

| 계층 | 선택 | 이유 |
|---|---|---|
| 엔진 | **Phaser 3.90 + TypeScript 5**(`strict`) | WebGL 우선·Canvas 폴백, 터치·사운드·스케일 매니저 내장 |
| 빌드·테스트 | **Vite** · **Vitest** | 빠른 개발 서버, 순수 TS 로직 단위 테스트 |
| 2.5D | 2D 스프라이트 + 깊이 정렬(`setDepth(y)`) + 그림자·빛 마스크 | 진짜 3D 없이 입체감, 모바일 부담 적음 |
| UI | 메뉴·HUD는 캔버스 위 **HTML/CSS 오버레이**, 프레임워크 없이 TS | 글자·버튼·safe area를 CSS로 |
| 그림 | 투명 PNG 시트 `public/assets/<분류>/` + `manifest.json`. 실제 그림은 ChatGPT 팩(`reference/…`) → `art-src/` → `npm run assets`. 아직 없는 것은 `src/art/*` 코드 그림 | 그림과 코드 분리, 같은 키로 교체 |
| 소리 | Web Audio 합성(`src/audio/*`) | 파일 없이 바로, 녹음 음원은 남은 일 |
| 배포 | **Firebase Hosting** https://light-defense-game.web.app | 테스터가 휴대폰으로 바로 확인 |
| 인증·DB (나중) | Firebase Authentication(Google) · Cloud Firestore 서울 | 서버 운영 없음. 지금 랭킹은 `LocalRanking`, `firestore.rules`는 전부 차단 |

- 기준: 모바일 브라우저 60fps(`fps: { target: 60, limit: 60 }`), 한 사람이 유지보수 가능.
- 화면: 짧은 변 540 기준. 세로 540×960, 가로는 높이 540·폭 720~1280. 물체 크기는 그대로이고 보는 프레임만 바뀐다.
- 레이아웃은 `<html data-layout>`(`src/ui/layout.ts`), UI 단위 `--u`, `.stage`가 size 컨테이너다. 바뀌면 Phaser 부모 크기를 다시 잰다.

## 프로젝트 구조

```
light_defense_game/
├─ index.html                  # viewport-fit=cover, 스플래시를 직접 그림
├─ assets.html                 # 그림 내보내기·시트 미리보기 (npm run assets)
├─ firebase.json  .firebaserc  firestore.rules  .env.example   # 설정은 .env.local의 VITE_FIREBASE_*
├─ src/
│  ├─ main.ts  config.ts  style.css
│  ├─ core/        RunState.ts(characterId·stageId·seed·test·trialCharacterId → keeperId)  Progress.ts(ld.progress.v1)
│  │               Settings.ts  rng.ts(난수는 여기만)  events.ts(이벤트 이름 + payload 타입)  layout.ts  TextureKeys.ts
│  ├─ data/        game.json characters.json enemies.json items.json map.json stages.json + index.ts(타입, GameData)
│  ├─ scenes/      BootScene  PreloadScene(manifest.json으로 시트 불러오기)  PlayScene(조립만, 600줄 아래)
│  │  └─ play/     EnemyField(스폰·적 이동·트라이얼 고정 적)  Sources(중앙 광원·등불·맵 광도)  Boss(노월)
│  │               Items(아이템)  StageRules(자비·은신·친구·튜토리얼)  Aiming(겨눔·마우스·반자동)  sceneKit
│  ├─ entities/    Lightkeeper(등불지기)  CentralSource  LightStation  SourceGauge  AimGuide  LightFx
│  │               VillageStage  MapProps  Occluders  EdgeArrows  Bubble
│  │  └─ enemies/  Enemy(공통 AI·몸박치기·트라이얼 고정)  Creature(데이터 구동 9종·친구)  Bat  Frog
│  ├─ systems/     (순수 로직, Vitest) movement aimStick autoFire fan obstacles stealth lampWard
│  │               LightSystem ComboSystem NightClock Spawner ScoreCalculator stageOutcome
│  │               vitals lightPoints lightLevel centralSource lightStation villageMood mercy inventory
│  │               tutorial keeperMotion facing critterView
│  ├─ input/       DesktopControls(WASD·방향키·마우스 끌기·스페이스)
│  ├─ ui/          Router  HistoryNav  PullRefresh  Splash  Hud  Sticks  BossBar  Toast  Story  TestSheet
│  │               PauseSheet  ResultSheet  SettingsSheet  layout  icons  dom
│  │  └─ screens/  HomeScreen  SelectScreen  ShopScreen  RankingScreen  common
│  ├─ audio/       AudioEngine  Bgm  Sound  Haptics
│  ├─ art/         registry(시트 규격)  friendSheet(토리·도토 팩)  lumiSheet·lumiCompose(루미 팩)  cutout(배경 지우기)
│  │               characters creatures enemies friends objects items effects village …(임시 코드 그림)
│  ├─ services/    Ranking(인터페이스)  LocalRanking(ld.ranking.v2)
│  └─ dev/         autoplay(?autoplay=…)  preview  assetExport  lumiExtract
├─ reference/      ChatGPT 팩·컨셉 원본(Lumi·Tori·Doto 8방향, Home_Art_Pack …)
├─ art-src/        게임에 넣을 원본 PNG
├─ public/assets/  npm run assets 결과 + manifest.json
├─ tests/          *.test.ts (순수 로직·조작·지도·스테이지·랭킹 …)
├─ scripts/        acceptance  art-check  screens  station  ship  shot  sync-skill  notify.ps1 …
└─ docs/           DECISION_LOG.md  design/  skill/  archive/
```

## 핵심 설계 포인트

- **PlayScene은 조립만.** `update`에서 걷기·겨눔(`Aiming`) → `tick`을 부른다. `tick`의 순서:
  1. 시계
  2. 광원(등불 점화·광도)
  3. HP·LP
  4. 규칙(자비·은신·친구·튜토리얼)
  5. 스폰·적 이동
  6. 노월
  7. 아이템
  8. 빛 적중
  9. 콤보
  판정 결과는 이벤트로 흘려보낸다.
- **입력은 이벤트로만.** 두 스틱(DOM `ui/Sticks.ts`)은 `input:move · input:aim · input:auto · input:fire`를 보낸다. PC는 `DesktopControls`가 같은 동작을 만든다. PlayScene은 입력 장치를 모른다.
- **카메라**는 등불지기를 따라가고 마을 3200×1800 밖을 비추지 않는다.
- **순수 로직은 Phaser 없이** 쓴다(`systems/*`). 그래야 Vitest로 바로 테스트된다. 이동·대기·타이머는 dt로 잰다.
- **부채꼴 판정**은 순수 함수 `inFan(origin, angle, fanDeg, range, point, pointRadius)`다. 각도 차를 −180~180으로 정규화하고, 대상 반지름만큼 관대하게 본다. `origin` = 등불지기 중심.
- **충돌**은 원 대 원 거리 계산으로 직접 한다. 등불지기와 장애물은 발 위치로 판정한다.
- **씬 ↔ DOM**은 `src/core/events.ts` 이벤트로만 주고받는다. HUD는 값이 바뀔 때만 갱신한다.
- **일시정지**의 `anims.pauseAll`은 게임 전체에 걸린다. 판을 닫거나 새로 시작할 때 꼭 `freeze(scene, false)`.
- **데이터 타입**은 `src/data/index.ts`에서 한 번 정의한다. 예:

```ts
export interface CharacterDef {
  id: 'lumi' | 'tori' | 'doto';
  name: string; nameEn: string; animal: string; default?: boolean;
  lightRange: number; // 최대 사거리 (빛 길이 = lightRange × 끈 정도 × LP 약해짐)
  lightPower: number; lightCooldownMultiplier: number;
  trait: 'nightEyes' | 'quickFeet' | 'cheekPouch'; // 배율은 traitOf(def)
  traitParams: Record<string, number>;
  unlock: 'rescue' | null; // rescue = 구출 스테이지에서 구하면 해금
  color: string; blurb: string; voicePitchHz: number;
}
```

- **그림은 매니페스트로, 코드는 키만 안다.** `PreloadScene`이 `manifest.json`으로 시트를 불러온다. 키는 `TextureKeys`·`AnimKeys` 한 곳에 둔다.

## 개발 단계 (Phase 0~6, `docs/design/IMPLEMENTATION_PLAN.md`)

2026-11-13 팀 시연 때 라이언 지시로 전체를 한 번에 '컨셉 시연판'까지 돌렸다. 평소에는 한 Phase를 끝내고 검증·보고한 뒤 다음으로 간다.

| Phase | 목표 | 상태 |
|---|---|---|
| 0 | 기존 코드 감사(`docs/CODEBASE_AUDIT.md`) | 완료 2026-11-12 |
| 1 | 핵심 판: 중앙 광원·등불·루미 HP/하트/LP·박쥐·개구리·100초 승패·HUD·결과 | 완료 2026-11-12 |
| 2 | 광도·등불 여러 개·전체 버프·장애물·강·다리·울타리·오두막·풀숲 은신 시간 | 시연판 + 구획 시야(2026-11-18) |
| 3 | 적 무리 차별화(3·3·3)·자비·분노·대사·클라이맥스 | 시연판 + 필살기·종류별 빛 반응·패시브 분노 무리(2026-11-18) |
| 4 | 아이템 5종·점수·콤보·완전 승리·결과 요약 | 시연판 + 시작 전 아이템 고르기(2026-11-18) |
| 5 | 테마 3종·스테이지 1~4(등불 1→4)·토리·도토 구출 해금·노월 | 시연판 + 테마별 지도 모양·랜덤 이벤트(2026-11-18) |
| 6 | 튜토리얼·설정·사운드·모바일 마무리·배포 | 시연판(이야기·필수 튜토리얼·트라이얼·스틱 좌우·합성 사운드·라이브). 상점 = 빛 색(2026-11-18), 음량 슬라이더·휴대폰 방향 고정·녹음 음원 자리(2026-11-19) |

2026-11-18 점검: 자동 플레이로 1~4스테이지 완전 승리, 노월 진정, 패배 흐름, 토리 구출 해금을 확인했다(콘솔 오류 0).

2026-11-19 완료 기준(`docs/design/ACCEPTANCE_CRITERIA.md`)을 채웠다: 단위 테스트 + 헤드리스 점검 `npm run check:acceptance`(`scripts/acceptance.mjs`, 22항목) + 자동 플레이. 사람이 볼 것만 남음 — 실제 휴대폰(특히 아이폰 사파리), 밸런스·손맛 체감.

## 완료 보고 형식

- 한국어로 쓴다(코드 식별자·명령·ChatGPT 영문 프롬프트만 영어).
- 담을 것: 바꾼 것, 동작, 테스트·빌드 결과, 남은 문제, 수동 확인 방법, "제안" 값, 새 문구.
- 스킬 zip이 바뀌었으면 맨 위에 "zip 다시 올리기 필요".

## 결정된 사항

| 항목 | 결정 |
|---|---|
| 톤 | 차분하고 은은하되 플레이는 캐주얼·박진감. 짧은 이야기 카드와 대사, 긴 설명은 피함 |
| 조작 | 브롤스타즈식 두 스틱. 왼쪽 이동, 오른쪽 빛(끌어 겨눔·놓아 발사·짧게 탭 자동 조준·누르고 있으면 반자동 연사·가운데로 되돌려 취소). PC는 WASD + 마우스 끌었다 놓기 + 스페이스 |
| 빛 | 등불지기 중심에서 60° 부채꼴, 길이 = 최대 사거리 × 끈 거리. **루미는 등불을 들지 않는다** |
| 한 판 | **100초**, 시간대 0~40% · 40~70% · 70%~ 클라이맥스, 끝 = 아침 |
| 지킬 것 | 중앙 광원(꺼지면 끝)·등불 스테이션(1~4개). 등불지기 = HP·하트 3·LP |
| 콤보 | 3초 안에 다음 처리가 없으면 **0으로**(reset), 배율 최대 4 |
| 캐릭터 | 루미·토리·도토 3명(토리·도토는 구출 해금). 장착물 대신 소모형 아이템 |
| 화면 | 짧은 변 540, 휴대폰은 기기 방향, PC는 가로 기본(설정에서 세로). 마을 3200×1800 |
| 그림·역할 | 실제 그림 = ChatGPT, 기획·개발 정본 = Claude Code. 받은 그림은 기준과 대조한 뒤 넣는다 |
| 서버 | Firebase(Hosting, 나중에 Auth·Firestore 서울) |
| 노월 | 진정시키면 1000점 + 바로 아침 |

채택하지 않은 과거 안은 `docs/archive/`에 남아 있다: 하룻밤 120초, 손에 든 등불(불꽃 5개), 등불지기 5종, 장착물·시너지·대광원, 방해 요소(안개·달그림자), 옛 적 명단, 콤보 절반 감소, 탭 하나 조작, 자체 서버.

## 남은 결정 (라이언이 정할 것)

구현 중 여기에 걸리면 임의로 정하지 말고 묻는다. 기본값은 괄호 안.

1. 랭킹을 계속 이 기기에만 둘지, 온라인으로 할지 (기본: 지금은 로컬)
2. 보상형 광고 이어하기 판의 랭킹 처리 (기본: 등록은 되되 `continued` 아이콘 표시)
3. 캐릭터 목소리·배경음을 실제 녹음할지 (기본: 합성음)
4. 장애물이 빛을 막는지 (기본: 막지 않음)
5. 조작 수치 — 이동 스틱 데드존 0.18, 빛 스틱 겨눔 문턱 0.35, 반자동 기다림 0.12초, PC 마우스 취소 반경 48, 발 판정 반지름 26 (기본: 그대로, 휴대폰 체감 후 조정)
6. 풀숲 수치 — 알아채는 거리 140, 들킴 4초, 빛을 쏘면 1초 드러남, 반투명 0.45 (기본: 그대로)
7. 버벅임 재검증·사람 감각의 밸런스 확인 (라이언이 해 보고 알려 줌)

## 성능

- 게임은 초당 60번 상한이다. 120Hz 휴대폰에서 부담·발열을 절반으로 줄인다.
- 모양이 변하지 않는 도형은 `generateTexture`로 한 번 구워 이미지로 쓴다. Phaser Graphics는 매 프레임 다시 쪼개 그린다.
- Phaser 도형 길이는 `setScale`·`setSize`로 바꾼다.
- 버벅임은 헤드리스 크롬 + CPU 4배 느림으로 프레임 시간 분포·프로파일을 재서 찾는다.
