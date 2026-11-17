# 라이트 디펜스 — 리플렛 그림 아래 글 (ChatGPT 전달용)

> **2026-11-17 기준 문서.** 이 게임은 Claude Code(게임 개발)와 ChatGPT(그림)를 함께 써서 만들고 있어요.
> 앞선 대화의 설정과 이 문서가 다르면 **이 문서를 따라 주세요.**

## 1. 할 일

첨부한 가로 그림(리플렛용, 1675×939) **아래에** 글 네 줄을 넣어요.

1. 게임 제목
2. 한 줄 소개
3. 장르
4. 개발자

그림은 다시 그리거나 자르거나 색을 바꾸지 않아요. 글을 그림 위에 겹치지도 않아요.

## 2. 넣을 글 — 글자 하나도 바꾸지 말 것

| 순서 | 항목 | 넣을 글 |
|---|---|---|
| 1 | 게임 제목 | 라이트 디펜스 |
| 1-1 | 영문 제목 (제목 아래 작게) | LIGHT DEFENSE |
| 2 | 한 줄 소개 | 고양이 루미가 작은 빛으로 친구들을 되찾고, 아침이 올 때까지 마을을 지켜요. |
| 3 | 장르 (앞에 작은 꼬리표 "장르") | 캐주얼 액션 디펜스 (모바일·PC 웹) |
| 4 | 개발자 (앞에 작은 꼬리표 "개발") | 라이언 |

- 줄을 더하거나 말을 다듬지 않아요. 영어 번역도 1-1 말고는 넣지 않아요.

## 3. 기준 사실 — 혼선 방지

| 항목 | 지금 기준 |
|---|---|
| 제목 | 라이트 디펜스 / Light Defense. 게임 홈 슬로건 "작은 빛으로, 마을을 되찾아요." |
| 장르·플레이 | 캐주얼 액션 디펜스. 두 스틱으로 마을을 걸으며 부채꼴 빛을 쏴, 아침(약 100초)이 올 때까지 마을 가운데의 중앙 광원과 외곽 등불을 지켜요. |
| 빛의 뜻 | 빛은 공격이 아니라 되찾아 주는 힘이에요. 빛을 잃은 주민은 제 모습을 되찾고, 어둠의 주민은 제 마을로 돌아가요. |
| 쓰지 않는 말·장면 | 죽음·처치·킬·실패, 피·폭발·무기 |
| 루미 (주인공) | 검은 아기 고양이, 주황 스카프(별 장식), 초록 눈. 등불을 손에 들지 않아요. |
| 토리 (친구) | 흰 아기 토끼, 한쪽 귀 끝이 접힘, 민트 리본(별 장식). 이름은 가칭이에요. |
| 도토 (친구) | 붉은 갈색 아기 다람쥐, 큰 S자 꼬리, 별이 박힌 황금 도토리 |
| 옛 설정 — 쓰지 않음 | 도토 = 햄스터, 강아지 친구, 루미가 든 등불 |
| 플레이 주소 | https://light-defense-game.web.app (휴대폰·PC 브라우저, 설치 없음) |
| 행사 | 청년 바이브 코딩 웹 게임 쇼케이스 부스 |

## 4. 글 배치

- **글 띠**: 그림 아래에 그림과 같은 폭으로 둬요. 바탕은 그림 아래쪽에서 부드럽게 이어지는 밤 남색 `#1B1F3B`예요.
- **크기 순서**
  1. 제목: 가장 크게, 호박빛 `#FFC857`, 은은한 빛
  2. 영문 제목: 작게, 종이색 `#F6F1E7`
  3. 한 줄 소개: 중간 크기, 종이색 `#F6F1E7`
  4. 장르·개발: 작게, 라벤더 `#A89CD9`. 꼬리표("장르"·"개발")는 한 단계 흐리게 `#8A8FA8`.
- **제목 꾸밈**: 세로 썸네일 로고와 같은 결로 맞춰요. 고양이 귀 모양의 얇은 호 위에 작은 네 갈래 반짝이 별을 둬요. 영문 LIGHT DEFENSE는 썸네일과 같은 세리프 대문자로 써요.
- **한글 글꼴**: 둥글고 읽기 쉬운 고딕(Pretendard·Noto Sans KR 결)을 써요. 장식 글꼴과 손글씨는 쓰지 않아요.
- **정렬**: 가운데 정렬이고, 여백을 넉넉히 둬요.

## 5. 한글 글자 확인

- 그림 생성에서는 한글이 깨지기 쉬워요. 다 만든 뒤 2절 표와 **한 글자씩** 대조해 주세요.
- 틀린 글자가 있으면 그 글자만 고쳐 다시 만들어요.
- 두세 번 해도 계속 틀리면 6-2 프롬프트로 **글 없는 빈 띠**만 만들어요. 글은 따로 얹어요.

## 6. 영문 프롬프트

### 6-1. 글 띠 붙이기

```
Use the attached horizontal illustration exactly as it is — do not redraw, crop, repaint, or recolor it.
Extend the canvas downward and add a text band below the illustration, the same width as the illustration.
Band background: deep night navy #1B1F3B, blending softly out of the bottom edge of the illustration.

Typeset these lines exactly, character for character. Do not add, remove, translate, or rephrase anything:

Line 1 — title, largest, warm amber #FFC857 with a soft glow:
라이트 디펜스
Under it, small, elegant serif all caps, paper white #F6F1E7:
LIGHT DEFENSE
Line 2 — one-line intro, medium size, paper white #F6F1E7:
고양이 루미가 작은 빛으로 친구들을 되찾고, 아침이 올 때까지 마을을 지켜요.
Line 3 — small, lavender #A89CD9, with the label "장르" in muted gray-blue #8A8FA8 before it:
장르  캐주얼 액션 디펜스 (모바일·PC 웹)
Line 4 — small, lavender #A89CD9, with the label "개발" in muted gray-blue #8A8FA8 before it:
개발  라이언

Title ornament: a thin arc shaped like two cat ears with a small four-point sparkle star above it, matching the logo style of the game's vertical thumbnail.
Korean font: clean, friendly rounded sans-serif (like Pretendard or Noto Sans KR). No decorative or handwritten fonts.
Centered layout with generous margins. Never place text over the illustration.
After generating, check every Korean character against the lines above and fix any mismatch.
```

### 6-2. 글이 계속 깨질 때: 빈 띠만

```
Use the attached horizontal illustration exactly as it is. Extend the canvas downward with an empty band of the same width,
deep night navy #1B1F3B blending softly out of the bottom edge of the illustration.
Add only the title ornament (a thin cat-ear arc with a small four-point sparkle star) near the top center of the band.
Do not add any text or letters.
```
