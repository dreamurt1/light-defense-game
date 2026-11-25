2026-11-25 16:57
[Claude Code → claude.ai 기획 세션 — ② 태블릿 렉 2단계 라이브 · 덤: 판 중 세로↔가로 뒤 빛 층 깨짐(라이브 버그) 고침 · 1508 일감 모두 끝]
zip 다시 올리기 필요 — C:\Users\user\light_defense_game\docs\skill\light-defense-game.zip

■ 처리한 지시문
C:\Users\user\light_defense_game\request-read\to-ClaudeCode\1125-1508-swipe-rule-final-self-directed.md  (② — 이것으로 ①②③④ 모두 끝)

■ 파일
빛 층  C:\Users\user\light_defense_game\src\entities\VillageStage.ts
가벼운 모드  C:\Users\user\light_defense_game\src\core\perfGuard.ts
가벼운 모드 1280×800(배포판)  C:\Users\user\light_defense_game\sketches\lite2-26-1125\prod-lite-1280x800.png
판 중 세로→가로 뒤(배포판)  C:\Users\user\light_defense_game\sketches\lite2-26-1125\prod-lite-rotate.png
판 중 회전 뒤 — 고치기 전(옛 코드)  C:\Users\user\light_defense_game\sketches\lite2-26-1125\rotate-before-fix.png
판 중 회전 뒤 — 고친 뒤  C:\Users\user\light_defense_game\sketches\lite2-26-1125\rotate-off-1-landscape.png

■ 보고
1) ② 라이브(커밋 ad84e5b): 가벼운 모드 안에서만 빛 층(켜진 마을 RenderTexture)을 가로·세로 절반 해상도로 그려 2배로 늘려 올림. 잘 도는 기기는 가벼운 모드가 켜지지 않으니 그대로, ?debug에 '빛 층 ½'.
   - 측정: 이 PC 그래픽 드라이버가 멈춰 헤드리스를 마이크로소프트 소프트웨어 렌더러(WARP — CPU로 칠함, 칠하기 비용이 그대로 드러남)로 돌림. 층 하나씩 끄면 빛 층이 가장 큰 몫(+23%, 바닥 타일·어두운 마을 그림은 측정 흔들림 안), 빛 층 절반으로 초당 프레임 약 +20~25%(1280×800: 15.4→20.8 · 17.8→20.6 · 16.2→19.6 / 800×1280: 18→18 · 15.4→24 · 18→20). 실제 태블릿 GPU에서의 체감은 라이언 확인 필요(?debug 사진이 오면 더 정확히).
   - 처음 시도는 그림이 깨졌음(빛이 1/4 자리에) — Phaser 3.90 DynamicTexture는 resize()가 GPU 버퍼를 바꾸지 않음 → 크기가 바뀌면 빛 층을 새로 만들게 바꿈. 배포 전 헤드리스 그림으로 잡음.
2) 덤 — 같은 원인의 **라이브 버그**를 찾아 고침: 판 중에 휴대폰을 세로↔가로로 돌리면(일시정지 → 계속) 빛 층이 옛 크기 버퍼에 그려져 광원 둘레 빛이 사라지고 엉뚱한 곳에 빛 띠가 생겼음(옛 코드로 재현 확인). 이제 회전하면 빛 층을 새 크기로 다시 만듦.
3) 확인: 완료 기준 43/43(I20 새로 — 가벼운 모드 버퍼 절반·회전 뒤 버퍼 크기, WARP WebGL로), 배포판 미리보기·라이브에서 가벼운 모드 1280×800·판 중 세로→가로 화면 정상, 콘솔 오류 0. 점검 코드는 느린 렌더러에서도 흔들리지 않게(홈 버튼 기다리기 등) 다듬음.

■ 유의
- 1508 일감(①②③④) 모두 끝. 남은 것: 라이언 플레이 소감·태블릿 ?debug 사진(가벼운 모드 체감 확인).
- 라이언에게 부탁한 그래픽 드라이버 재시작(윈도우+Ctrl+Shift+B)은 이제 급하지 않음 — WARP로 우회. 다만 멈춘 그래픽 프로세스 몇 개가 남아 있어 다음 재부팅 때 정리됨.
