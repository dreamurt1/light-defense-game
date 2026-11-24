[Claude Code — 적 "빛 게이지"(발밑·차오름) · 주인공 머리 위 HP 없음 · 마지막 하트 위험 링 · 2026-11-24 15:03]
(생성 2026-11-24 15:03, claude.ai 기획 세션 — 라이언 결정 15:00)

■ 파일
생성  C:\Users\user\light_defense_game\docs\plan\order-enemy-light-gauge-26-1124.md  (값·자리·모양·테스트 전부)

■ 지시
docs/plan/order-enemy-light-gauge-26-1124.md대로. 새 시스템 없음 — 값·연출만, 값은 전부 game.json.
① 적 빛 게이지: hostile·lost만(passive·노월·어둠 구슬 제외). 빛에 맞아 HP가 줄었는데 0이 아닐 때만 1.2초 보이고 0.3초 페이드(다시 맞으면 리셋), HP 0이면 안 그림.
   채움 = 1 − HP/maxHP(차오름, 숫자 없음). 자리는 머리 위가 아니라 발밑(걷는 종 발끝 +6px, 나는 종 몸 가운데 앵커 아래). 36×4 둥근 끝,
   바탕 NIGHT 0.6 · 채움 AMBER. 월드 그래픽(카메라 따라감), 값이 바뀔 때만 다시 그림.
   키: enemyGauge { enabled, showMs 1200, fadeMs 300, width 36, height 4, offsetY 6, kinds ["hostile","lost"] }.
② 주인공 머리 위 HP는 넣지 않음 — DECISION_LOG 한 줄만.
③ 위험 링(라이언 확인 항목): 하트 1 + HP ≤ 50%일 때 루미 발밑 EMBER 링(반지름 34·선 2px·1.2초 주기 숨쉬기), 넘으면 0.3초 페이드.
   쓰러짐·부활 무적 중엔 끔. 키: dangerRing { enabled, hpRatio 0.5, radius 34, pulseMs 1200 }.
테스트(게이지 상태·제외 종·비율, 위험 링 조건)·check:acceptance 갱신 → 캡처 5장(웨어울프 한 방·고슴도치 두 방·빛을 잃은 토리 두 방·클라이맥스 다수·위험 링) → DECISION_LOG → 스킬 visual-audio·gameplay-systems → zip → 보고.

■ 유의
- 하지 말 것: 주인공 머리 위 HP, 패시브·노월·구슬 게이지, 상시 막대, 붉은색·숫자, HUD 변경, HP·위력·적 수치 변경.
- 순서: 긴급 아님. 진행 중인 구조 보강 ② → ①과 스프라이트·소품·바닥 연결을 끝낸 뒤. 긴급 편지는 예외.
- 클라이맥스(동시 8마리+)에서 게이지가 소음이면 캡처와 함께 보고만(값은 라이언이 정함). 보고 맨 위 "zip 다시 올리기 필요".
