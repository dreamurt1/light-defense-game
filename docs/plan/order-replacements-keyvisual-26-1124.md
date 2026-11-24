# 지시서 — 교체본 2장 반영 + 키 비주얼 (2026-11-24 08:40, claude.ai 기획 세션 → Claude Code)

> ChatGPT 선택 2건이 왔고 둘 다 **통과**. 같은 이름으로 덮어쓴 **최신본**이므로 자리의 그림을 바꾸고 다시 빌드하면 된다. 홍보 키 비주얼 2장도 왔다(게임 안 그림 아님). 이것으로 ChatGPT 쪽 그림은 **이번 판 전부 도착** — 이후 그림 마감(11-26 12:00)까지 더 기다릴 것이 없다.

---

## 0. 받은 것

| 무엇 | 파일 | 바뀐 점 |
|---|---|---|
| 노월 진정(교체) | `reference/Nowol_Pack/witch_calmed.png` (+ README "2026-11-24 교체", `Nowol_Pack.zip`) | 눈 감은 미소 + 두 손 모음. 768×768, 발끝 744, 가운데 383.5, 높이 651 — 다른 네 장과 같은 축척 |
| 길 아이콘 채움(교체) | `reference/UI_Icons_v3/icon-path-expand-on.png` (+ README, `UI_Icons_v3.zip`) | 선 벌과 같은 세 갈래 빛살 + 등불. 128×128, 도형 21~107 |
| 키 비주얼(새) | `reference/Key_Visual_v3/night-outing-portrait.png` 1080×1920 · `night-outing-landscape.png` 1920×1080 (+ README·manifest, `Key_Visual_v3.zip`) | 불투명, 글자·UI 없음. 새벽, 등불 켜진 마을, 집으로 가는 루미 뒷모습, 먼 언덕의 행렬 |

## 1. 검토 결과

- `witch_calmed` — 192px로 줄여 `idle_calm`과 나란히 보면 이제 **한눈에 다르다**(감은 눈·모은 손). 같은 옷·같은 모자·같은 축척. ✓
- `icon-path-expand-on` — 선 벌과 모양 일치, 40px에서도 읽힘. 16장 모두 선·채움 짝이 맞게 됐다. ✓
- 키 비주얼 — 루미 등불 안 듦 ✓, 주황 스카프 ✓, 글자 없음 ✓. 먼 행렬은 작은 실루엣이라 올빼미·나방으로 읽히지는 않지만 홍보 그림으로는 충분. ✓

## 2. 할 일

1. **노월**: `witch_calmed.png`를 다시 art-check(발끝·가운데·축척) → 자리 덮어쓰기 → `npm run assets` → calmed 캡처 1장 다시. 지시서 `order-passive-nowol-icons-26-1124.md` 2-2의 "진정 연출(말풍선 + 기존 빛 한 번)"은 **그대로 둔다** — 그림이 달라졌어도 연출은 있는 편이 낫다.
2. **아이콘**: `icon-path-expand-on.png` 덮어쓰기 → `npm run assets`. 두 길 점은 여전히 **선 벌만**. 결과 화면의 길 제목 옆처럼 **이미 아이콘 자리가 있는 곳**에서만 `-on`을 써도 된다(민트/주황 테두리 규칙 그대로). 새 자리는 만들지 않는다.
3. **키 비주얼** (기능 동결 뒤 "배포·문서" 시간에, **30분 안에 끝날 때만**): `night-outing-landscape.png`를 1200×630으로 가운데 잘라 `public/og.png`(링크 미리보기 `og:image`) + 저장소 README 맨 위 그림. 세로본은 리플렛용이라 게임에는 쓰지 않는다. 시간이 없으면 보고에 "마감 때문에 뺌".
4. 세 폴더 `README_claude.md` 갱신(교체 날짜), 스킬 `characters.md` 노월 행 "진정 그림 11-24 교체". zip. 보고 맨 위 "zip 다시 올리기 필요".
5. 보고: calmed 캡처, 바뀐 파일, og.png 했는지.

## 3. 하지 말 것

그림 보정 · 옛 `witch_calmed`·옛 `icon-path-expand-on`을 따로 남겨 두기(덮어쓴 최신본만) · 키 비주얼을 게임 화면(홈·아침 배경)에 쓰기 · 새 자리·새 화면.

## 4. 순서

앞서 보낸 지시서가 아직이면 그 순서대로: `order-passive-nowol-icons-26-1124.md` → `order-morning-cards-26-1124.md` → 이 지시서. 셋을 한 번에 하면 노월·아이콘은 처음부터 최신본으로 넣으면 된다(교체 절차 생략).
