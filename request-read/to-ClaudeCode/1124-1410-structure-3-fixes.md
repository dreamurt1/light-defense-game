[Claude Code — 구조 보강 3건(라이언 확정): 귀가 보너스 · 두 길 표시 · 노월 조건 · 2026-11-24 14:10]
(생성 2026-11-24 14:10, claude.ai 기획 세션 — 라이언 결정 14:09)

■ 파일
생성  C:\Users\user\light_defense_game\docs\plan\order-night-run-v3-structure-26-1124.md  (값·문구·테스트 전부)

■ 지시
docs/plan/order-night-run-v3-structure-26-1124.md대로. 셋 다 값·문구 단위, 서로 독립 — ③ → ② → ① 순서로 하나씩 배포.
③ nights.json witch: requiresFriends ["tori"], chancePerNight 0.18 (fromNight 5·guaranteedNight 10·oncePerRun·구출 밤 제외 그대로).
② 행렬 패시브 돌려보냄 토스트 "돌려보냈어요 · 빛이 멀리 뻗어요" + 아침 화면 "지금 길: 지키는 길 — 조용한 밤 / 넓히는 길 — 어둠이 거세져요 /
   사이 — 아직 정하지 않았어요"(길 색). HUD에는 안 넣음.
① 집으로 = 이번 나들이 별가루 +20%(올림, 최소 1; dust.homeBonusRatio 0.2·homeBonusMin 1), 버튼 "집으로 (별가루 +20%)", 집으로 결과에
   "무사히 돌아왔어요 · 별가루 +{n}", 아침에 다음 밤 미리 보기 한 줄 "다음 밤: {구간} · 등불 {n} · 적이 조금 더 거세요"(같으면 "오늘과 비슷해요").
테스트·check:acceptance 갱신 → 캡처 → DECISION_LOG → zip → 보고.

■ 유의
- 하지 말 것: 새 화면·새 시스템, 하트·아이템·적 수치, 광원이 잠든 런의 별가루 깎기(벌 없음), HUD 길 표시.
- 순서: 진행 중이던 일(13:42 연결·13:57 체험 ★)을 끊지 말고 그 다음에. 긴급 편지는 예외.
- ③ 측정 목표(노월 만난 런 비율 0.5 ≥ 20% · 1.0 ≥ 80%)를 벗어나면 보고만. 보고 맨 위 "zip 다시 올리기 필요".
