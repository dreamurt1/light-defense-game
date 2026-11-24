2026-11-24 13:38 KST
# ChatGPT — 재작업 결과 및 연결 시 참고

## 이번 변경 파일

- 개구리 정면·후면 f01 네 장(조각 제거, 동일한 서있는 크기, x=256 중심, 발끝 y=496):
  C:\Users\user\light_defense_game\reference\Lost_Pack\frog\frog_lost_walk_000_front_f01.png
  C:\Users\user\light_defense_game\reference\Lost_Pack\frog\frog_walk_000_front_f01.png
  C:\Users\user\light_defense_game\reference\Lost_Pack\frog\frog_lost_walk_180_back_f01.png
  C:\Users\user\light_defense_game\reference\Lost_Pack\frog\frog_walk_180_back_f01.png
- 강·다리 네 장(96×96 발자리 채움·중앙 정렬·흐름 방향 끝 픽셀 동일):
  C:\Users\user\light_defense_game\reference\Map_Props_Pack\prop-river-h-light.png
  C:\Users\user\light_defense_game\reference\Map_Props_Pack\prop-river-v-light.png
  C:\Users\user\light_defense_game\reference\Map_Props_Pack\prop-bridge-h-light.png
  C:\Users\user\light_defense_game\reference\Map_Props_Pack\prop-bridge-v-light.png
- 선택 작업: 잃어버린 모습 뒷방향 12장에 #A89CD9 외곽 빛 추가:
  C:\Users\user\light_defense_game\reference\Lost_Pack\frog\frog_lost_walk_180_back_f01.png ~ f04.png
  C:\Users\user\light_defense_game\reference\Lost_Pack\hedgehog\hedgehog_lost_walk_180_back_f01.png ~ f04.png
  C:\Users\user\light_defense_game\reference\Lost_Pack\redpanda\redpanda_lost_walk_180_back_f01.png ~ f04.png
- 문서·아카이브 갱신: frog/README.md + frog-pack.zip; hedgehog/README.md + hedgehog-pack.zip; redpanda/README.md + redpanda-pack.zip; Map_Props_Pack/README.md + map-props-light-pack.zip + map-props-pack.zip. 해당 폴더는 각각 위 Lost_Pack 및 Map_Props_Pack 경로입니다.

## 기준·요청 문서

- C:\Users\user\light_defense_game\docs\plan\order-art-connect-26-1124.md (13:14 연결 지시)
- C:\Users\user\light_defense_game\hand-offs\art-master-order-26-1124-1000\review-log.md (13:14 판정)
- C:\Users\user\light_defense_game\request-read\to-ChatGPT-Codex\1124-1306-frog-front-back-f01-fix.md
- C:\Users\user\light_defense_game\request-read\to-ChatGPT-Codex\1124-1314-review-lost-frontback-props-ground.md
- C:\Users\user\light_defense_game\request-read\to-ChatGPT-Codex\1124-1319-deadline-principle.md
- C:\Users\user\light_defense_game\hand-offs\art-master-order-26-1124-1000\art-master-order.md

## 연결 전 확인사항

- 개구리 앞·뒤 f01은 이번에 고친 판입니다. Claude.ai가 검토해 통과시키기 전까지 해당 4칸은 폴백 유지해 주세요.
- 강·다리 수정본도 Claude.ai 재검토 전까지는 기존 코드 그림을 유지해 주세요.
- 기존 지시에 따라 이미 통과한 고슴도치·레서판다 앞·뒤, 개구리 f02~f04, 소품 나머지 36장 및 바닥 3장은 기존 연결 우선순위와 절차대로 처리할 수 있습니다. 아직 연결하지 않았다면 `order-art-connect-26-1124.md`를 기준으로 하되 현재 플레이 소감·밸런스·버그 우선순위를 먼저 적용해 주세요.
- 뒷모습 외곽 빛 12장은 선택 작업으로 추가된 검토 대상입니다. 코드 연결 전에 비주얼 검토를 받아 주세요.
- 13:19 지침: 고정 날짜 마감은 없습니다. 최대한 빨리 진행하되 오류 없는 결과가 우선입니다. 테스트·check를 생략하지 말고 통과된 단위로 보고해 주세요.
- 통과된 파일 및 기존 루미·토리·도토/호스틸 팩은 수정하지 말아 주세요. 코드 그림 폴백을 유지해 주세요.

수정본을 넘겼습니다. 검토 및 연결 상태를 확인해 주세요.
