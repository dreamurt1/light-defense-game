# 기술 구조와 개발 로드맵

> **2026-11-13 팀 컨셉 시연판 (아래 본문·11-12 요약보다 우선)** — 라이언: 13시 팀 시연, 전체 Phase를 한 번에 가볍게. 치명적이지 않으면 Claude 판단, 그림은 임시, 사운드는 Web Audio 합성만, 디자인보다 기능 우선.
> - 스테이지(`stages.json`): tutorial(필수, 6단계) · stage-1 빛의 마을 등불 1 · stage-2 경계 등불 2 + 토리 구출 · stage-3 어둠의 마을 등불 3 + 도토 구출 · stage-4 등불 4 + 노월 · trial(트라이얼 — 마을 곳곳 8곳에 고정된 적 8종, 공격할 수 있는 몹은 루미가 아주 가까우면 제자리에서 들이받음, 쓰러지면 2.5초 뒤 같은 자리에, 끝없음 `endless`, 2026-11-14). 진행 `src/core/Progress.ts`(앞 스테이지를 깨면 열림, 선택 화면 '시연: 모두 열기').
> - 적 9종 구현(`entities/enemies/Creature.ts` 데이터 구동): 호스틸 역할 role(박쥐 추적·웨어울프 중앙 광원·뱀파이어 등불), 잃어버린 주민 구출, 패시브 떠돌기·빛 피하기·대사, **자비**(곁 200 안 1.5초, 300점) · **분노**(맞으면 주인공을 쫓음). 빛을 잃은 친구 `tori-lost`·`doto-lost` → `friend:rescued` → 해금.
> - 아이템(`scenes/play/Items.ts`, `systems/inventory.ts`): 칸 2개, 빛의 부적 기본 1개, 광원·켜진 등불 둘레에 생김, PC Q·E. 노월(`scenes/play/Boss.ts`): 둘레를 돌며 박쥐 소환·어둠 구슬, HP 200, 진정 = 바로 아침(이유 boss).
> - 맵: `map.json` wall·fence 미로 요소(걷는 적은 막히고 우회, 나는 적은 넘음). 풀숲에 4초 넘게 있으면 들킴(`systems/stealth.ts`). 테마 = `VillageStage.setTheme` 색조.
> - UI: 이야기 카드(`ui/Story.ts`) → 튜토리얼 안내 띠(`tutorial:step`), 선택 화면 스테이지 4칸, 결과 '다음 밤으로', 설정 스틱 좌우·이야기 다시 보기, 사운드 `src/audio/*`.
> - 미룬 것: 강·다리·건물·구획 시야, 필살기, 시작 전 아이템 고르기, 녹음 음원, 음량 슬라이더.

> **2026-11-12 새 기획 개정 요약 (아래 본문보다 우선)**
> - 마일스톤 M0~M6 → **Phase 0~6**(`docs/design/IMPLEMENTATION_PLAN.md`): 0 감사(완료) · 1 핵심 판(완료 2026-11-12) · 2 광도·등불·맵 · 3 적 무리·자비 · 4 아이템·점수 · 5 맵 3종·스테이지·구출 해금·보스 · 6 튜토리얼·설정·사운드·배포.
> - 구조 추가: `src/scenes/play/EnemyField.ts`(스폰·적 이동), `src/scenes/play/Sources.ts`(중앙 광원·등불·맵 광도), 엔티티 `CentralSource`·`LightStation`·`enemies/Frog`, 순수 로직 `systems/vitals.ts`·`lightPoints.ts`·`lightLevel.ts`·`centralSource.ts`·`lightStation.ts`·`stageOutcome.ts`(+ `tests/stage.test.ts`). 데이터 `stages.json` 추가, `waves.json`·`equipment.json` 삭제, `Lantern` 엔티티 삭제.
> - 저장소: 2026-11-12 git 시작(첫 커밋 = 구 기획 스냅샷).
> - 결정(2026-11-12): 최근 수정된 것을 따른다 / 루미는 빛을 발사(손 등불 없음) / 장착물 → 아이템 / 하트를 잃으면 HP 100% / 기본 승리 = 하트 ≥1 / 반자동은 대상이 없으면 쏘지 않음 / 맵 3종 = 스테이지 테마 / 시너지·대광원 없앰 / 세부 수치는 Claude 판단(첫 스테이지는 쉽게). 자비 대상 = 어둠의 패시브 주민(라이언 확정) / 라이브 반영(피드백용) / 정해진 에셋(루미) 외 그림은 Claude가 임시 그림을 직접 그림 / 1스테이지 등불 1개 / 기획서 개정판 PDF를 새 기획 전체로 다시 만듦(`npm run doc:plan`, 옛 원본은 더 붙이지 않음).
> - 완료 보고: 바꾼 파일, 동작, 실행·빌드·테스트 결과, 남은 문제·미확정 기획, 수동 확인 방법, "제안" 값·새 문구.


## 스택 (결정됨)

| 계층 | 선택 | 이유 |
|---|---|---|
| 엔진 | **Phaser 3.80+ + TypeScript 5** | WebGL 우선·Canvas 폴백, 터치·사운드·스케일 매니저 내장, 2D 아케이드 사례 풍부 |
| 빌드 | **Vite** | 빠른 개발 서버, 에셋 최적화 |
| 테스트 | **Vitest** | 순수 TS 로직 단위 테스트 |
| 2.5D | 2D 스프라이트 + 깊이 정렬 + 그림자·빛 오버레이 | 진짜 3D 없이 입체감, 모바일 성능 부담 적음 |
| UI 레이어 | 메뉴·HUD는 캔버스 위 **HTML/CSS 오버레이**, 프레임워크 없이 TS (2026-10-28 개정) | 글자·버튼·safe area를 CSS로 다루기 쉬움 |
| 아트 | 분리된 투명 PNG 스프라이트 시트 `public/assets/<분류>/` + `manifest.json`. 실제 그림은 라이언이 ChatGPT로 생성 → `art-src/` → `npm run art:import` (2026-11-04 개정) | 그림과 코드 분리, 같은 키로 교체 |
| 배포 | **Firebase Hosting** (2026-10-28 개정, 원안: 정적 CDN + 소형 VPS) | M1부터 휴대폰으로 손맛 확인 |
| 인증 (M5) | **Firebase Authentication (Google)** (2026-10-28 개정, 원안: Google OAuth 2.0 직접 구현) | 서버 없이 소셜 로그인 |
| DB (M5) | **Cloud Firestore** `asia-northeast3` 서울 (2026-10-28 개정, 원안: Node.js + Fastify + PostgreSQL) | `RemoteRanking`이 SDK로 직접 읽고 씀, 서버 운영 없음 |

- 설치: `npm create vite@latest light-defense -- --template vanilla-ts` → `npm i phaser` → `npm i -D vitest`. Firebase SDK(`firebase` npm)는 M5에서 붙인다.
- `tsconfig`: `strict: true`, `resolveJsonModule: true`, `noImplicitOverride: true`.
- 기준: 모바일 브라우저 60fps, 한 사람이 유지보수 가능.
- 레이아웃: 9:16 컨테이너(높이 `100dvh` 기준, PC는 가운데 + 양옆 배경) 안에 Phaser 캔버스(`Scale.FIT`)와 `#ui` 오버레이를 같은 박스로 겹친다. 오버레이 크기는 컨테이너 쿼리 단위(`cqw`/`cqh`), safe area는 `env(safe-area-inset-*)`.

## 프로젝트 구조

2026-10-28 개정: `server/` 폴더는 만들지 않고(Firebase), 기획서의 `HudScene`과 Phaser `ui/*.ts`(버튼·토스트·불꽃 바·쿨다운 링·카드)는 `src/ui/`의 DOM 컴포넌트로 만든다. 2026-11-04 개정: `TapInput` 대신 두 스틱(DOM `src/ui/Sticks.ts`, 판정 `movement.ts`·`aimStick.ts`, PC `src/input/DesktopControls.ts`), `Placeholder.ts` 대신 그림 파이프라인(`src/art/*`, `art-src/`).

```
light-defense/
├─ index.html                  # viewport meta: width=device-width, viewport-fit=cover. 스플래시·세로 안내를 직접 그림
├─ assets.html                 # 그림 내보내기·시트 미리보기 (npm run assets)
├─ firebase.json  .firebaserc  firestore.rules  firestore.indexes.json  .env.example
├─ src/
│  ├─ main.ts                  # Phaser.Game 생성, 씬 등록, DOM UI 붙이기
│  ├─ config.ts                # 처음 크기 = 화면 방식(세로 540x960 / 가로 높이 540), Scale.FIT + CENTER_BOTH, arcade 물리 (2026-11-06 개정: 크기는 ui/layout.ts가 바꿈)
│  ├─ style.css                # 9:16 컨테이너, 캔버스와 #ui 오버레이 겹치기
│  ├─ core/
│  │  ├─ RunState.ts           # 한 판 상태(선택 캐릭터, 장착물, 닉네임, seed, 직전 결과, 테스트 판 여부)
│  │  ├─ Progress.ts           # 해금 진행도(판 수, 아이템 수, 누적 시간, 최대 콤보), localStorage
│  │  ├─ rng.ts                # seedable RNG (mulberry32)
│  │  ├─ events.ts             # 이벤트 이름 상수 + payload 타입 (게임 ↔ DOM UI ↔ 스틱 입력)
│  │  ├─ Settings.ts           # BGM/SFX/진동/닉네임/devUnlockAll, localStorage
│  │  └─ TextureKeys.ts        # 텍스처·애니메이션(AnimKeys)·오디오 키 상수
│  ├─ data/                    # 이 스킬의 assets/data/*.json 복사
│  │  ├─ game.json  characters.json  enemies.json  items.json  equipment.json  waves.json  map.json
│  │  └─ index.ts              # 타입 붙여서 export (GameData)
│  ├─ scenes/                  # Phaser는 Boot → Preload → Play만 (메뉴는 씬 없이 DOM)
│  │  ├─ BootScene.ts  PreloadScene.ts  PlayScene.ts
│  ├─ entities/
│  │  ├─ Lightkeeper.ts        # 주인공: 걷기, 8방위 모습, 손에 든 등불, 특성 훅
│  │  ├─ Lantern.ts            # HP, 글로우, 불꽃 5개 상태 (등불지기 손을 따라감)
│  │  ├─ AimGuide.ts           # 조준 원뿔·대광원 원 (독립 벡터)
│  │  ├─ VillageStage.ts  MapProps.ts   # 마을 바닥·집·풀숲·장애물 (map.json)
│  │  ├─ EdgeArrows.ts         # 화면 밖 이웃 화살표
│  │  ├─ Item.ts
│  │  ├─ enemies/
│  │  │  ├─ Enemy.ts           # 공통(HP, 등불 쫓기, 등불 피해, 되돌림 연출)
│  │  │  ├─ Bat.ts Croc.ts Slime.ts Ghost.ts Hyena.ts Witch.ts
│  │  │  └─ index.ts           # id → 클래스 맵
│  ├─ systems/
│  │  ├─ movement.ts           # 이동 스틱·키보드 → 걷기 (순수 로직)
│  │  ├─ aimStick.ts           # 빛 스틱 겨눔·발사·자동 조준·취소, PC 끌기 조준 (순수 로직)
│  │  ├─ fan.ts                # inFan() 부채꼴 판정 (순수 로직)
│  │  ├─ obstacles.ts          # 장애물·풀숲 판정
│  │  ├─ keeperMotion.ts       # 공격·피격·부활 동작 효과
│  │  ├─ LightSystem.ts        # 발사(루미 중심), 실제 빛 길이, 대기, 대광원
│  │  ├─ ComboSystem.ts        # 콤보(절반 감소), 배율, 시너지 게이지 (순수 로직)
│  │  ├─ NightClock.ts         # 120초, 시간대, timeScale (순수 로직)
│  │  ├─ Spawner.ts            # waves.json 기반 스폰 (선택 로직은 순수)
│  │  ├─ ItemSystem.ts         # 생성·수명·빛으로 획득·킥킥 탈취
│  │  ├─ HazardSystem.ts       # 안개(사거리 ×0.65), 달그림자
│  │  ├─ ScoreCalculator.ts    # 점수 (순수 로직)
│  │  └─ AudioBus.ts  Haptics.ts
│  ├─ input/
│  │  └─ DesktopControls.ts    # PC: WASD·방향키, 마우스 누른 채 끌었다 놓기
│  ├─ ui/                      # DOM 컴포넌트 (HUD 위에서는 CSS pointer-events로 게임 입력을 막음)
│  │  ├─ Router.ts  Splash.ts  Hud.ts  Sticks.ts  BossBar.ts  Toast.ts
│  │  ├─ PauseSheet.ts  ResultSheet.ts  SettingsSheet.ts
│  │  ├─ screens/              # HomeScreen.ts  SelectScreen.ts  ShopScreen.ts  RankingScreen.ts
│  │  └─ screens.css  sticks.css  finish.css   # 배치 / 스틱 / UI 재질(광택·테두리·결·별 장식)
│  ├─ art/                     # 대체 그림(Canvas 2D 코드), 그림 규격 registry.ts, 배경 지우기 cutout.ts, 루미 시트 좌표 lumiSheet.ts
│  └─ services/
│     ├─ Ranking.ts            # 인터페이스 submit / top / me
│     ├─ LocalRanking.ts       # localStorage 구현 (M1~M4)
│     └─ RemoteRanking.ts      # Firestore 구현 (M5)
├─ art-src/<분류>/             # ChatGPT로 만든 원본 PNG (라이언)
├─ public/assets/<characters·enemies·objects·effects·backgrounds·ui>/ + manifest.json   # npm run art:import 결과
├─ public/audio/               # 있으면 사용, 없으면 합성음
├─ tests/                      # ComboSystem NightClock ScoreCalculator Spawner fan controls(스틱) obstacles … .test.ts
└─ shared/types.ts             # 랭킹 제출 타입 (M5)
```

## 핵심 설계 포인트

- **PlayScene은 조립만.** `create()`에서 시스템을 만들고 `update(dt)`에서 `nightClock.update → spawner.update → enemies.update → light.update → combo.update → hazards.update → items.update` 순으로 호출한다. 판정 결과는 이벤트로 흘려보낸다.
- **입력은 이벤트로만.** 두 스틱(DOM)은 `input:move / input:aim / input:fire`를 보내고, PC는 `DesktopControls`가 같은 동작을 만든다. PlayScene은 입력 장치를 모른다. 카메라는 등불지기를 따라가고 마을(2400×2400) 밖을 비추지 않는다.
- **순수 로직은 Phaser 의존 없이** 작성한다(`ComboSystem`, `NightClock`, `ScoreCalculator`, `Spawner`의 선택 로직, 부채꼴 각도 판정 함수, 스틱 판정). 그래야 Vitest로 바로 테스트된다.
- **부채꼴 판정**은 순수 함수 `inFan(origin, angle, fanDeg, range, point, pointRadius)`로 분리한다(각도 차를 -180~180으로 정규화해서 비교, 악당 반지름만큼 관대하게). `origin`은 루미의 중심이다(2026-11-06 개정).
- **물리는 Arcade**를 쓰되 충돌은 원 vs 원 거리 계산으로 직접 한다(개체 수 12 이하라 충분하고, 그림자 위치와 어긋나지 않는다). 등불지기와 장애물은 발 위치로 판정한다.
- **데이터 타입**은 `src/data/index.ts`에서 한 번 정의한다. 예:

```ts
export interface CharacterDef {
  id: 'lumi' | 'tori' | 'doto' | 'baru' | 'mong';
  name: string; nameEn: string; animal: string;
  lightRange: number; // 최대 사거리 (실제 빛 길이 = lightRange × 끈 정도)
  lightPower: number; lightCooldownMultiplier: number;
  trait: 'nightEyes' | 'quickPaw' | 'cheekPouch' | 'warmth' | 'bark';
  traitParams: Record<string, number>;
  color: string; blurb: string; voicePitchHz: number; default?: boolean;
}
```

- **그림은 매니페스트로, 코드는 키만 안다**(2026-11-04 개정, 기획서의 '플레이스홀더 먼저' 대신). 게임은 `PreloadScene`이 `manifest.json`으로 시트를 불러올 뿐 그림 코드를 쓰지 않는다. ChatGPT 그림이 없는 키는 `src/art/*` 코드 그림을 `npm run assets`로 내보낸 것이 대신한다. 키는 `TextureKeys`·`AnimKeys` 한 곳.

## 마일스톤별 작업

### M0 — 뼈대 (반나절)
- Vite + Phaser + TS 설정, `config.ts`(540×960), Boot/Preload/Play 씬 빈 껍데기, `data/` 복사 + 타입, `rng.ts`, `events.ts`.
- 완료: `npm run dev`에서 남색 세로 화면 PlayScene과 등불 원이 보인다.

### M1 — 코어 루프, 손맛 검증 (가장 중요)
- 순수 TS `ComboSystem`(절반 감소·배율·시너지), `NightClock`(120초·시간대), `ScoreCalculator` + Vitest.
- PlayScene: `Lightkeeper`(루미 고정), 두 스틱 조작(2026-11-04 개정, 기획서의 `TapInput` 대신)·넓은 마을·카메라, `Lantern`(HP·글로우·불꽃 5개), `LightSystem`(부채꼴 60°·최대 사거리 330·대기 0.4·넉백), `Enemy` + `Bat`, 단순 `Spawner`(2.5초마다 박쥐 떼), 게임 오버 → 결과, `LocalRanking`. Firebase Hosting으로 휴대폰 확인.
- 완료 기준: **본인이 10판 연속으로 하고 싶은가.** 재미없으면 수치(부채꼴 각도·대기·넉백·박쥐 속도)를 먼저 만진다. 여기서 라이언에게 실행을 보여주고 확인받는다.

### M2 — 악당과 웨이브
- `Croc`/`Slime`(분열)/`Ghost`(은신)/`Hyena`(무리·탈취)/`Witch`(방해), `waves.json` 기반 3단계 `Spawner`, `HazardSystem`(안개·달그림자, 예고 포함), `ItemSystem`(반딧불 병·별사탕, 빛으로 획득), 땅으로 걷는 이웃의 장애물 돌아가기, 클리어(새벽 연출), 시간대 배경 보간, HUD(DOM) 기본(진행 바·점수·콤보·게이지·불꽃·보스 체력바).
- 완료: 120초 난이도 곡선이 성립한다(초저녁 무난, 한밤 압박, 새벽 전 절반 탈락).

### M3 — 캐릭터와 장착물
- 주인공 5종 특성(`quickPaw`, `cheekPouch`, `warmth`, `bark`, `nightEyes`), 장착물 4종, 선택 화면(DOM, 한 화면) 동작, `Progress` + 해금 조건, 결과 시트(두 톤).
- 완료: 캐릭터마다 플레이 느낌이 다른가.

### M4 — 연출과 오디오
- 팔레트·폰트 적용, Entry·Result 연출(불씨, 여명), `AudioBus`(BGM 스템·효과음·목소리, 폴백 합성음), `Haptics`, 설정(소리·진동 적용), 세로 고정 안내, 첫 판 힌트, 지난 밤들(랭킹) 화면.
- 완료: 지인 테스트에서 세계관을 설명 없이 이해하는가.

### M5 — Firebase와 랭킹 (2026-10-28 개정)
- Firebase SDK, Authentication(Google), Firestore 랭킹, `RemoteRanking`, 게스트(익명 로그인 제안), 점수 검증(보안 규칙 또는 Cloud Functions — 정할 것), `firestore.rules` 컬렉션별 열기, 오프라인 폴백, 해금 진행도 동기화.
- 완료: 점수 제출 → 조회 왕복 정상 동작.

### M6 — 수익과 출시
- 기부 버튼, 보상형 광고 이어하기(`continued` 표시), 템 샵 기본 스킨 3종(`cosmetics.json`). 모두 밸런스 무관.
- 완료: 공개 링크 배포.

## 완료 보고 형식

각 마일스톤을 끝내면 라이언에게 짧게 알린다: 실행 방법(`npm run dev`), 조작법(왼쪽 스틱 걷기 · 오른쪽 스틱 끌었다 놓기 · 짧게 탭 자동 조준, PC는 WASD + 마우스 끌었다 놓기), 이번에 들어간 것, 확인해 달라는 포인트 1~2개(예: "부채꼴 60°가 너무 넓은지"), 기획서에 없어서 제안으로 넣은 값, 다음 단계.

## 결정된 사항 (2026-10-23 통합 기획서, 2026-11-06 개정)

| 항목 | 결정 |
|---|---|
| 세계관 톤 | 차분하고 은은하되 캐주얼하고 박진감 있게. 과도한 스토리 지양 |
| 조작 | 브롤스타즈식 두 스틱: 왼쪽 이동, 오른쪽 빛(끌어 겨눔·놓아 발사·짧게 탭 자동 조준·가운데로 되돌려 취소). PC는 WASD + 마우스 끌었다 놓기 (2026-11-04·11-06 개정, 기획서의 '탭 하나·이동 없음'을 대체) |
| 등불 | 등불지기가 손에 들고 다님. 이웃은 등불을 쫓아옴 (2026-11-04) |
| 빛 | 루미 중심에서 60° 부채꼴, 실제 길이 = 최대 사거리 × 끈 거리, 최대 사거리는 기획서의 1.5배 (2026-11-06) |
| 한 판 길이 | 120초, 새벽 클리어 있는 구조 (시간대 40/90/120) |
| 화면 | 세로 540×960 / 가로 높이 540·폭은 화면 비율 720~1280(짧은 변 540 고정 = 물체 크기는 그대로, 보는 프레임만 바뀜, 2026-11-06). 휴대폰은 기기 방향, PC는 창을 꽉 채우는 가로 + 세로 선택. 마을 16:9 3200×1800(2026-11-06, 처음 정사각 2400×2400과 면적 같음 — 풀숲·장애물은 크기 그대로 위치만 옮김), 시작 위치 가운데(1600, 900) (2026-11-06 개정) |
| 캐릭터 이름 | 한글 + 영문 병기 (루미 Lumi … / 그르르 Grumble …) |
| 콤보 감소 | 피격·유지 시간 초과 모두 절반(소수점 버림) |
| 화면 수 | 선택 화면 1개(주인공 + 장착물). 메뉴·HUD는 DOM/CSS 오버레이 (2026-10-28) |
| 아트 | 아트 디렉션은 `reference/ChatGPT-Images/`(1순위 「달빛 숲의 등불지기 고양이」, 2026-10-30), 그림은 라이언이 ChatGPT로 생성 → `art-src/` → `npm run art:import` (2026-11-04) |
| 서버 | Firebase(Hosting + Authentication + Firestore 서울) (2026-10-28 개정) |

채택하지 않은 과거 안: 대시, 가로 화면, 콤보 0 초기화, 분리된 선택 씬, 탭 하나 조작·등불 고정·단일 화면(2026-11-04 두 스틱으로 대체 — 주인공 이동은 이때 다시 들어옴), 자체 서버 Node.js + Fastify + PostgreSQL + Google OAuth 2.0(2026-10-28 Firebase로 대체), 비주얼 방향 '겹겹 종이 라이트박스'(2026-10-30 레퍼런스 이미지로 대체), Phaser Graphics 도형 플레이스홀더(2026-11-04 그림 파이프라인으로 대체).

## 남은 결정 사항 (라이언이 정할 것)

구현 중 이 항목에 걸리면 임의로 정하지 말고 묻는다. 기본값은 괄호 안.

1. 빛을 만들 때 등불 HP를 소모할지 (기본: 소모 안 함)
2. 노월을 되돌렸을 때 새벽이 당겨지는지 (기본: 당겨지지 않음, 보너스만)
3. 보상형 광고 이어하기 판의 랭킹 처리 (기본: 등록은 되되 `continued` 아이콘 표시)
4. 캐릭터 목소리를 실제 녹음할지, 합성할지 (기본: 합성음으로 시작)
5. 해금 조건 수치(3판 / 아이템 50개 / 누적 10분 / 콤보 20·30)가 적당한지 (기본: 그대로)
6. 바루 온기 상시 +0.5/s가 과한지 (기본: 그대로, 밸런스 체크리스트로 확인)
7. **콤보 유지 2.0초** — 초저녁 생성 간격 2.5초보다 짧아 초반 콤보가 끊기기 쉬움. 튜닝 1순위, 후보 3.0초 (기본: 2.0초)
8. 두 스틱 조작의 수치: 이동 속도 225(라이언 지시), 마을 크기 3200×1800(16:9), 스틱 데드존 0.18, 끌지 않고 놓으면 자동 조준(사거리 안 가장 가까운 이웃, 없으면 가장 가까운 이웃), 붙은 이웃은 등불이 닿는 거리×1.25 밖으로 멀어지면 떨어짐, PC 마우스 취소 반경 48(`controls.mouseCancelRadius`), 등불지기 발 판정 반지름 26(`keeper.radius`) (기본: 그대로, 휴대폰 체감 후 조정)
9. 장애물이 빛도 막는지 (기본: 막지 않음 — 브롤스타즈는 벽이 공격을 막음), 땅으로 걷는 이웃(그르르·말랑·킥킥, M2)이 장애물을 돌아가는지 (기본: M2에서 돌아가게)
10. 풀숲 숨기 수치: 알아채는 거리 140, 빛을 쏘면 1초 드러남, 숨었을 때 불투명도 0.45 (기본: 그대로, 체감 후 조정)

## 성능 (2026-11-06 개정)

- 게임은 초당 60번 상한(`fps: { target: 60, limit: 60 }`): 120Hz 휴대폰에서 부담·발열을 절반으로.
- 모양이 변하지 않는 도형은 Graphics로 매 프레임 그리지 않고 `generateTexture`로 한 번 구워 이미지로 쓴다(Phaser Graphics는 매 프레임 다시 쪼개 그린다). 예: 창문 유리빛, 조준 원뿔(면만 있어 늘여도 반지름만 바뀜).
- 버벅임은 헤드리스 크롬 + CPU 4배 느림으로 프레임 시간 분포·프로파일을 재서 찾는다.
