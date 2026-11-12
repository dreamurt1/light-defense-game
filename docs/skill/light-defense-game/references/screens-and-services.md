# 화면 흐름, 서버, 수익 모델

> **2026-11-12 새 기획 개정 요약 (아래 본문보다 우선)**
> - 홈: **게임하기**(→ 캐릭터 선택) · 지난 밤들 · 상점 · ⚙. 테스트 판은 개발 모드에서만(정식 배포 판에는 없음). 첫 플레이는 튜토리얼 스테이지(짧은 스토리 소개) 필수, 이후 건너뛰기(Phase 6).
> - 캐릭터 선택: 루미·토리(토끼)·도토(다람쥐) 3명, 토리·도토는 잃어버린 친구 → 구출하면 해금. 장착물은 없어졌고 아이템(소모형 5종)을 시작 전에 챙긴다(Phase 4).
> - 설정(새 기획): 소리 켜기·끄기, **음량**, 가로/세로 화면, 스틱 좌우 바꾸기(Phase 6).
> - 결과 = 오늘 전투 개요: 기본 승리 / 완전 승리 / 오늘은 여기까지(하트 소진·중앙 광원 꺼짐). 통계 = 오늘 점수·최대 콤보·구출한 주민·돌려보낸 어둠의 주민·켠 등불.
> - 화면 방향: 웹·모바일 모두 가로 기본, 세로 제공(가로·세로 배치는 2026-11-06에 이미 완성).
> - 랭킹 제출 필드: 장착물 대신 `stageId`, outcome = victory·complete·over. 로컬 랭킹은 `ld.ranking.v2`로 새로 쌓는다. 인증·랭킹·상점·광고(수익: 템 샵·광고·기부)는 핵심 플레이 뒤.
> - 새 기획 판은 Firebase Hosting **미리보기 채널**로 먼저 보여 주고, 라이브 교체는 라이언 확인 뒤.


모든 화면은 모바일 세로(9:16) 기준. 화면은 다섯 개(엔트리·선택·플레이+HUD·결과·랭킹)를 뼈대로 최소화하고, 로그인 없이도 바로 한 판 할 수 있게 해서 **"탭 두 번에 시작"**을 지킨다.

## 화면 흐름 (DOM 화면 + Phaser 씬, 2026-10-28 개정)

메뉴 화면과 HUD는 Phaser 씬이 아니라 캔버스 위 **HTML/CSS 오버레이**(프레임워크 없이 TS)다. Phaser는 `BootScene → PreloadScene → PlayScene`만 돈다. 화면 이동은 `src/ui/Router.ts`(`#ui[data-screen]`)가 맡고, 메뉴 화면은 씬 없이 DOM 그림 배경(`assets/backgrounds/home.webp`) 위에 그린다. 씬 ↔ DOM UI는 `src/core/events.ts` 이벤트로만 주고받는다.

```
index.html 스플래시 → BootScene → PreloadScene ─(ui:load-progress)→ 스플래시가 사라짐
                                                      ↓
              지난 밤들(랭킹) · 상점 · ⚙ 설정  ⇄  홈(엔트리)  → 테스트(이웃 없는 판)
                                                      ↓ 오늘 밤 등불지기
                                        선택 (주인공 + 장착물, 한 화면)
                                                      ↓ 등불을 켜요
                            PlayScene + HUD(DOM)·두 스틱 ⇄ 일시정지 (잠시 쉬어요)
                                                      ↓
                    결과 시트 → (다시 한 번: 선택) / (홈으로: 홈) / (지난 밤들에 남기기)
```

| 화면 | 구현 | 역할 | 핵심 요소 |
|---|---|---|---|
| 스플래시 (2026-11-04) | `index.html` + `src/ui/Splash.ts` | 스크립트보다 먼저 보이는 첫 화면 | 흐린 홈 그림·일렁이는 등불·금빛 로고·슬로건·불러오기 막대·`등불을 켜는 중…`. Preload 진행(`ui:load-progress`)을 채운 뒤 최소 1.2초 후 사라짐 |
| `BootScene` | Phaser | 설정·진행도 로드(localStorage), 스케일 설정 | — |
| `PreloadScene` | Phaser | 데이터 JSON·오디오·`manifest.json`의 텍스처 로드 | 진행을 스플래시 막대로 보냄 |
| 홈(엔트리) | `src/ui/screens/HomeScreen.ts` | 타이틀, 슬로건, 시작, 랭킹, 상점, 테스트, 설정, 프로필 | 「달빛 숲의 등불지기 고양이」 그림 배경, `bgm_entry` |
| 선택 | `SelectScreen.ts` | 큰 초상 + 좌우 화살표 + 이름·한 줄 소개 + 아래 주인공 5칸(잠긴 칸은 어둡게 + 해금 조건), 장착물 4종, 맨 아래 `등불을 켜요` | 카드 탭 시 `voice_<id>_light` 미리듣기. 직전 선택을 기본값으로. 해금·장착물 고르기는 M3 |
| 상점 | `ShopScreen.ts` | 외형(스킨·등불 외형·빛 색) | M6, 지금은 `준비 중` |
| 지난 밤들(랭킹) | `RankingScreen.ts` | Top 100, 내 순위, 기간 탭(오늘/이번 주/전체) | Firebase 연동(M5) 전엔 로컬 |
| 플레이 | `PlayScene` + `src/ui/Hud.ts`·`Sticks.ts`·`BossBar.ts`·`Toast.ts` | 게임 로직·마을 렌더(Phaser), HUD·두 스틱·보스 체력바·토스트(DOM) | 시스템 조립. HUD 위에서는 CSS `pointer-events`로 게임 입력을 막음 |
| 일시정지 | `src/ui/PauseSheet.ts` | 위에서 내려오는 패널 `잠시 쉬어요` | `계속` / `다시 한 번` / `홈으로` / `설정` |
| 결과 | `src/ui/ResultSheet.ts` | 결과, 랭킹 등록, 재시작 | 게임 오버/클리어 두 톤, 마을 위 가운데 패널, 통계 줄은 점수·최대 콤보만 |
| 설정 | `src/ui/SettingsSheet.ts` | 배경음악/효과음/진동, 닉네임, 조작 설명 1장(두 스틱 그림) | 홈의 ⚙와 일시정지에서 연다 |

- 판 단위 상태(플레이어 id, 닉네임, 선택 캐릭터·장착물, seed, 직전 결과, 테스트 판 여부 `test`)는 `src/core/RunState.ts` 객체 하나로 공유하고 `scene.start(key, data)`로 넘기지 않는다.
- 결과의 "다시 한 번"은 엔트리를 거치지 않고 선택 화면으로 바로 간다(직전 선택이 기본값이라 탭 한 번이면 재시작). 일시정지의 "다시 한 번"은 같은 선택으로 바로 새 밤을 시작한다.
- 게임 중 버튼 `마을로`는 `홈으로`로 바뀌었다(2026-11-06 개정).
- 보스 체력바는 위 HUD 아래, 노월의 얼굴·이름·체력. 기획서 팔레트대로 라벤더(레퍼런스 시트의 빨강은 쓰지 않음).
- 로그인은 랭킹 등록이나 해금 동기화를 원할 때만 거치는 선택 경로.
- 화면별 구성·상태 브리프는 프로젝트의 `.impeccable/surfaces/index-html.md`, 전 화면 캡처는 `sketches/screens/`·`sketches/screens-overview.png`.

## 엔트리 페이지 상세

배치는 UI Screen Sheet(위 로고, 오른쪽 메뉴, 왼쪽 아래 프로필, 뒤에 등불 곁의 루미), 메뉴 이름은 기획서를 따른다.

- 상단: 로고 "라이트 디펜스" + `탭 한 번, 빛 한 줄기. 오늘 밤도 끝까지.`
- 오른쪽 메뉴: 주요 버튼 `오늘 밤 등불지기`(→ 선택), 보조 버튼 `지난 밤들`(→ 랭킹), `상점`, 맨 아래 `테스트`(발바닥 아이콘, 2026-11-06 추가 — 이웃 없는 판), ⚙ 설정.
- 왼쪽 아래 프로필: 루미 초상(`lumi_idle_045_front_right.png`) + 닉네임.
- 하단(M5~M6): 로그인 상태(게스트 `이름 없는 등불지기 #1234` 또는 Google 닉네임), 버전, 기부 링크(작게).
- 처음 방문이면 닉네임 입력 모달(건너뛰면 게스트 이름 자동 생성). 닉네임은 설정에서도 바꾼다.
- 레퍼런스 시트의 재화·레벨은 기획서에 없어 넣지 않는다.

## 로그인 / 서버 (M5)

M4까지는 서버 없이 동작해야 한다. 게임 로직은 클라이언트에, 서버(Firebase)는 **저장·조회·검증만**.

**2026-10-28 개정: 직접 운영하는 서버(Node.js + Fastify + PostgreSQL, Google OAuth 2.0 직접 구현, `server/` 폴더, 정적 CDN + 소형 VPS)는 만들지 않고 Firebase로 전부 대체한다.**

| 역할 | 원안 | 변경 |
|---|---|---|
| 배포 | 정적 CDN + VPS | **Firebase Hosting** (`dist/` → https://light-defense-game.web.app). M1부터 `npm run build && firebase deploy --only hosting`으로 휴대폰 확인 |
| 로그인 | Google OAuth 2.0 직접 구현 | **Firebase Authentication (Google)** |
| 랭킹·진행도 | PostgreSQL + REST `/api/*` | **Cloud Firestore** (`asia-northeast3` 서울), `RemoteRanking`이 Firestore SDK로 직접 읽고 씀 |

- Firebase 프로젝트 id `light-defense-game`. SDK 설정은 `.env.local`의 `VITE_FIREBASE_*`를 `import.meta.env`로 읽는다(키 이름은 `.env.example`). 설정값을 코드에 하드코딩하지 않는다.
- 연결 파일: `.firebaserc`, `firebase.json`(Hosting + Firestore), `firestore.rules`(M5 전까지 전부 차단, M5에서 컬렉션별로 연다), `firestore.indexes.json`.
- Firebase SDK(`firebase` npm)는 M5에서 붙인다. 구글 로그인 공급자는 Firebase 콘솔에서 라이언이 켠다.
- **그대로 유지하는 것**
  - 점수 제출 필드: `{ playerId, nickname, score, survivedSec, characterId, equipmentId, maxCombo, seed, clientVersion, outcome: 'clear' | 'over', continued?: boolean }` → 제출 결과로 `{ rank }`.
  - 조회: 기간별 Top 100 `[{ rank, nickname, score, survivedSec, characterId, outcome, createdAt }]`, 내 순위 `{ rank, best }`.
  - **랭킹 규칙**: 일간 / 주간(월요일 0시 기준) / 전체. 정렬은 점수 → 버틴 시간 → 먼저 등록한 순. `continued`(광고 이어하기) 판은 별도 아이콘으로 구분.
  - **클라이언트 구현**: `Ranking` 인터페이스(`submit / top / me`) 하나에 `LocalRanking`(localStorage, 최대 100행, M1~M4)과 `RemoteRanking`(Firestore, M5) 두 구현. 오프라인이거나 서버 오류면 로컬로 폴백하고 토스트 `지금은 마을 밖과 연결이 안 돼요`.
- **M5에서 정할 것** (제안: 기획서에 없음)
  - 게스트: 기기 UUID(`localStorage`) 대신 Firebase 익명 로그인, Google 전환 시 `linkWithPopup`으로 계정을 연결해 기록·해금 진행도를 유지.
  - 점수 검증(목표는 그대로: 120초 동안 이론상 최대치를 넘는 점수 거부, 제출 간격 제한): (a) 보안 규칙에서 상한·필드·제출 간격 검사(무료 Spark 요금제) 또는 (b) Cloud Functions 검증(Blaze 종량제 필요).

## 수익 모델 (M6) — 밸런스에 영향 없음 원칙

세 모델을 모두 열어 두되, 출시 초기에는 **기부 + 가벼운 광고**만 운영하고 템 샵은 리텐션이 확인된 뒤 연다. 상점 화면 자리는 이미 있고 지금은 `준비 중`이다.

| 모델 | 내용 | 세계관과의 연결 | 금지 |
|---|---|---|---|
| 템 샵 | 주인공 스킨(색·모자·목도리), 등불 외형, 빛 색상. 성능 영향 없음. 기본 스킨 3종으로 시작 | "마을 잡화점" | 능력치 판매(장착물·아이템은 전부 무료 해금) |
| 광고 | 게임 오버 후 선택형 보상 광고 1회 → 등불 HP 30으로 이어하기. 랭킹에는 `continued`로 표시 | "이웃이 등불을 다시 켜줌" | 강제 전면 광고, 플레이 중 배너 |
| 기부 | 원하는 금액 기부(외부 후원 페이지), 감사 표시로 반딧불 배지 + 등불 외형 1종 | "등불에 기름을 붓다" | — |

## 플레이 환경 체크리스트 (마인드맵 "플레이 환경")

- [ ] 시각 효과 변화: 시간대 배경 보간, 콤보 단계마다 "콤보 ×N"과 마을 창문·등불, 피격 시 가장자리 어두워짐, 안개 비네트, 저HP 펄스 (`visual-audio.md`)
- [ ] 상단 UI: 달 아이콘 / 밤 시간·진행 바 / 점수 / 콤보 (safe area, 터치 요소 없음) · 하단 UI: 불꽃 5개 / 시너지 게이지 / 장착물 / 일시정지 (엄지 영역, 44px 이상) · 그 위 양쪽 두 스틱
- [ ] 진동: 피격 1회, 콤보 돌파·대광원 2회, 설정에서 끄기, 미지원 기기는 조용히 건너뜀
- [ ] 조작법: 설정에 조작 설명 1장(두 스틱 그림 + `왼쪽으로 걷고, 오른쪽으로 겨눠요` / `PC는 WASD로 걷고, 마우스를 끌었다 놓아 빛을 보내요`). 첫 판 힌트 문구는 두 스틱에 맞게 다시 정해야 한다(`world-and-story.md`)
- [ ] 가로 화면(2026-11-06 개정): 세로·휴대폰 가로·PC 가로에서 모든 화면이 잘리지 않는가(등불지기 2열, 상점 6칸, 설정 2열, 결과 판 오른쪽). 판 중에 돌리면 자동 일시정지
- [ ] 성능: 모바일 60fps, 파티클 상한, 분류별 스프라이트 시트 + `manifest.json`
