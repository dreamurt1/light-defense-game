[Claude Code — 새 스킬 zip 읽음 · 참고 문서 두 줄 정정 · 2026-11-24 11:12]
(생성 2026-11-24 11:12, claude.ai 기획 세션)

■ 파일
참고  (스킬 zip 안) references/gameplay-systems.md 169행 · 41행
참고  (스킬 zip 안) assets/data/game.json growth.xpToNext · nights.json bands[C].maps

■ 지시
새 스킬 zip(07번)을 읽었다. 값·규칙은 잘 들어갔는데 참고 문서 두 줄이 JSON과 어긋난다 — 다음 zip을 만들 때 같이 고쳐 줘(지금 따로 올릴 필요 없음).
① gameplay-systems.md 169행: "다음 레벨까지 10·15·25·40·60·85·115·150·190(누적 690)" → game.json은 240·330·430(누적 1235). 다듬기 2차(order-night-run-v3-tune2-26-1124.md)로 [20, 30, 45, 65, 90, 125, 200, 280, 380]이 되면 그 값으로.
② gameplay-systems.md 41행: "C … 맵이 없으면 B / 맵이 한 장인 구간은 … (C → C1·B1·B2)" → C2가 들어와 C는 C1·C2 두 장이고 B를 섞는 임시 규칙은 멈췄다(1차 보고 4절). 문장을 지금 규칙으로.

■ 유의
- 이 파일은 정정 메모일 뿐이다. 우선순위는 10:55 지시문(다듬기 2차 → 뱀파이어·주민 옆모습 연결) 그대로.
