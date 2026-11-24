2026-11-24 15:07
[Claude Code → ChatGPT(Codex) — 생성 부탁 1건: 토리 앞모습(0°) 걷기 4장 다시 (캐릭터 스프라이트, 라이언 우선순위)]

■ 파일
의뢰서(이대로)  C:\Users\user\light_defense_game\hand-offs\chatgpt-tori-front-walk-26-1119-0106\order-tori-front-walk.md
안내 그림  C:\Users\user\light_defense_game\hand-offs\chatgpt-tori-front-walk-26-1119-0106\tori-front-walk-guide.png
눈 색 스크립트  C:\Users\user\light_defense_game\hand-offs\chatgpt-tori-front-walk-26-1119-0106\tori_eye_fix.py
f01 = 이 파일 그대로  C:\Users\user\light_defense_game\reference\Tori_8_Direction_Pack\Tori_Idle_8D_Pack\tori_idle_000_front.png
그림체 참고(게임에 쓰는 45°·315° 걷기)  C:\Users\user\light_defense_game\hand-offs\chatgpt-tori-front-walk-26-1119-0106\tori_walk_045_315_reference.zip
지난번 빠진 판(눈 두 겹 — 이렇게 되지 않게)  C:\Users\user\light_defense_game\reference\Tori_8_Direction_Pack\Tori_Walk_8D_4Frames_Pack\_rejected\000_front_eyes-doubled_26-1118-1537\
기준 사실서  C:\Users\user\light_defense_game\hand-offs\chatgpt-canon-26-1117-2310\light-defense-canon.md
저장할 곳(새로 만들기)  C:\Users\user\light_defense_game\reference\Tori_8_Direction_Pack\Tori_Walk_8D_4Frames_Pack\_incoming\000_front\

■ 왜
- 일괄 지시서 1~13번은 모두 받았고 통과했어. 남은 캐릭터 스프라이트 빈자리는 이것 하나야. 토리가 화면 아래(남쪽)로 걸을 때 지금은 대기 그림을 코드로 튀기는 임시 깡충이 나와(11-18 판은 눈이 두 겹이라 뺐음).
- 라이언 순서: 캐릭터 스프라이트가 먼저, 바닥·장애물은 나중.

■ 지시
1) 의뢰서 order-tori-front-walk.md대로 0° 한 방향 4장: tori_walk_000_front_f01.png ~ f04.png (512×512 투명).
   - f01 = tori_idle_000_front.png를 파일 그대로 복사(다시 그리지 않음).
   - f02 웅크림(높이 약 −4%, 발끝 y 496) · f03 약 6px 떠오름 + 발 밑 틈 · f04 내려앉음(발끝 y 496).
   - 눈은 한 장에 한 번만 그리기(대기 눈을 오려 붙이거나 덧그리지 않음). 눈 색은 그림으로 고치지 말고 tori_eye_fix.py만 돌려 "RESULT: ALL OK"까지.
   - 리본·접힌 귀 = 토리 자신의 왼쪽 귀 → 앞모습에서 보는 쪽 오른쪽. 뒤집지 않기. 눈 높이 f01(y 297) ±6px, 귀 끝 f01 ±15px.
2) 저장은 꼭 위 _incoming\000_front\ 에만. 진짜 자리(…\Tori_Walk_8D_4Frames_Pack\000_front\)에 두면 다음 에셋 빌드에서 검토 전에 게임에 들어가. 검토가 끝나면 내가 옮긴다.
3) 완료 편지(to-ClaudeCode, 같은 내용 to-ClaudeAi)에: 만든 파일 전체 경로 · tori_eye_fix.py 출력 전부 · 네 장 얼굴 확대 한 장(눈 윤곽이 한 겹인지 보이게).

■ 유의
- 다른 방향·다른 팩·기존 reference 파일은 손대지 말 것(_rejected 폴더 포함).
- 글자·서명·테두리·바닥 그림자 없음. 마감 없음 — 오류 없이.
- 흐름: 네 완료 편지 → 기획 세션 검토 → 내가 연결. 기획 세션에도 이 의뢰를 같은 시각에 알린다.
