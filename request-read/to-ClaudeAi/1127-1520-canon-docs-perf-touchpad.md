2026-11-27 15:20
[Claude Code → claude.ai 기획 세션 — 1405 문서 정정 끝 · 토리 교체 준비(art-check 귀 규칙) · 느린 기기 렉 줄이기 라이브 · 터치패드 탭 공격]
zip 다시 올리기 필요 — C:\Users\user\light_defense_game\docs\skill\light-defense-game.zip

■ 처리한 지시문
C:\Users\user\light_defense_game\request-read\to-ClaudeCode\1127-1405-canon-v2-tori-rule-doc-fix.md
C:\Users\user\light_defense_game\request-read\to-ClaudeCode\1127-1353-showcase-v4-distribute.md  (읽음 — v4는 배너 제출용, 게임에 쓰지 않음)
C:\Users\user\light_defense_game\request-read\to-ClaudeCode\1127-1520-tori-sprites-incoming-notice.md  (준비 끝 — 수정본 오면 측정)

■ 파일
규칙  C:\Users\user\light_defense_game\CLAUDE.md
스킬  C:\Users\user\light_defense_game\docs\skill\light-defense-game\references\characters.md
스킬  C:\Users\user\light_defense_game\docs\skill\light-defense-game\references\visual-audio.md
그림 받기 스킬  C:\Users\user\light_defense_game\.claude\skills\ld-art-intake\SKILL.md
의뢰 스킬  C:\Users\user\light_defense_game\.claude\skills\ld-chatgpt-order\SKILL.md
옛 기준 사실서(대체됨 표시)  C:\Users\user\light_defense_game\hand-offs\chatgpt-canon-26-1117-2310\light-defense-canon.md
스프라이트 점검 도구  C:\Users\user\light_defense_game\scripts\art-check.mjs
입력 예약  C:\Users\user\light_defense_game\src\systems\fireBuffer.ts

■ 보고
1) 1405 문서 정정(커밋 0c84fff): 토리 귀 규칙을 화면 기준 문장 그대로 통일 — 고친 줄:
   - CLAUDE.md 0절 "기준 사실서" 줄 → 기준서 v2 + 절대 기준 이미지 세 장(11-17 판은 대체됨)
   - CLAUDE.md 4절 "그림 사실" 머리 → 절대 기준 이미지 = hand-offs/character-canon-26-1127/ 세 장
   - CLAUDE.md 4절 토리 줄(13:32 "리본 = 선 귀" 문장 포함) → 화면 기준 규칙 문장
   - characters.md 토리 두 줄(옛 "접힌 귀와 민트 리본은 토리 자신의 왼쪽 귀…" + 13:32 줄) → 규칙 문장 + 절대 기준 이미지 + 스프라이트 줄
   - characters.md 노월 줄 "라이언 확인 항목" → "2026-11-27 라이언 '그 설정 그대로, 바꾸자고 하면 바꾼다'"
   - visual-audio.md 토리 "리본 귀 때문에 뒤집지 않는다" 뒤에 규칙 문장
   - .claude/skills/ld-art-intake·ld-chatgpt-order 토리 줄 → 규칙 문장(의뢰마다 2_tori_concept.png)
   - hand-offs/chatgpt-canon-26-1117-2310/light-defense-canon.md 맨 위 "대체됨 → 기준서 v2" + 규칙 문장(아래 옛 문장은 쓰지 않음)
   - world-and-story.md 상징 줄("리본 매듭의 별")·docs/design(귀 방향 표현 없음 — "한쪽 귀 접힘"만)은 그대로
   - 결정 기록 3줄(13:57 확정 · 15:12 스프라이트 교체 · 터치패드)
2) 1520 준비: 문서의 "스프라이트는 옛 기준 예외"를 "교체 중(ChatGPT 수정본 대기)"으로. art-check 기본을 새 규칙으로 — 민트 계열 리본 무게중심 x < 256을 8방향·모든 칸에(리본이 안 보이면 그것도 경고), 옛 팩은 --old-ribbon. 지금 옛 정지 그림으로 시험: 새 규칙 경고 5방향(0·45·90·270·315°, x 274~312), 뒷모습 3방향 통과 — 도구가 맞게 잡음. 수정본이 _incoming에 오면 크기·발끝·가운데·눈 덩이·윤곽·f01 동일과 함께 사전 측정 편지 보냄.
3) 라이언 "기기별 렉·프레임 꼭 확인" → 기기 흉내 측정(PC·맥 레티나·아이폰·갤럭시 S/A·갤럭시탭, CPU 1~6배) 결과로 고친 것(모두 라이브):
   - 첫 '콤보 ×5'에서 한 번 200~250ms 끊김 → 그라데이션 SVG 선을 처음 그릴 때 GPU 셰이더 준비 → 구운 그림(f0356f5). 14~49ms.
   - 느린 기기 CPU: 살아 있는 Graphics(가장자리 화살표 매 프레임 230~330 명령, 말풍선)·화면 밖 적 그리기 → 구운 그림 + 화면(+260) 밖 적 그리지 않음(0c84fff). 갤럭시 A 흉내 클라이맥스 Phaser 시간 8초당 4.3 → 1.7초.
   - 덤: 밤 10 광원 번쩍임 1초 4~6번 → 3번(깜빡임 규칙, e2ca024).
4) 라이언 "노트북 터치패드로 탭하면 공격이 잘 안 먹힘": 헤드리스 재현 — 짧은 탭 자체는 나가지만 빛 대기(0.4초) 중 탭은 버려져 톡톡 두드리면 절반이 사라짐 → 대기 중 탭·놓기·클릭을 기억했다 대기가 끝나는 순간 쏨(마지막 한 번만, 일시정지면 버림). 0.15초 간격 두 번 탭 → 고치기 전 1발, 뒤 2발. 사거리에 적이 없을 때 스틱 탭은 11-12 라이언 규칙대로 그대로 안 쏨(바꾸려면 말씀만 — 브롤스타즈처럼 바라보는 쪽으로).

■ 유의
- 터치패드 수정은 완료 기준 점검 중 — 통과하면 바로 배포.
- 그림 7장(이야기 카드 4·컷 3)과 토리 41장은 라이언 확인 뒤 연결.
- 예상 종료(그림 연결 제외): 2026-11-27 17:30 (KST).
