# light-defense-game

The casual game by claude coding

**라이트 디펜스 (Light Defense)** — 작은 빛으로, 마을을 되찾아요.

고양이 루미가 중앙 광원의 파편으로 얻은 빛을 쏘며 밤의 마을을 돌아다니는 캐주얼 액션 디펜스 게임입니다. 중앙 광원을 지키고 외곽의 꺼진 등불을 켜며 약 100초 뒤 아침이 올 때까지 버팁니다. 빛은 공격이 아니라 되찾는 힘이라서, 빛을 잃은 친구는 구출하고 어둠의 주민은 돌려보내며 싸우기 싫은 주민은 그냥 지나가 주면(자비) 점수를 얻습니다.

- 플레이: https://light-defense-game.web.app (휴대폰·PC 브라우저, 가로·세로)
- 조작: 왼쪽 스틱 이동 / 오른쪽 스틱을 끌었다 놓으면 빛 (PC: WASD + 마우스 끌기, 아이템 Q·E)
- 지금은 팀 컨셉 시연판(2026-11-13)입니다. 그림은 루미를 빼고 모두 임시 그림이고, 소리는 Web Audio 합성음입니다.

## 개발

Phaser 3.90 · TypeScript · Vite · Vitest, 메뉴와 HUD는 HTML/CSS 오버레이, 배포는 Firebase Hosting.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run build      # dist/
```

Firebase 설정은 `.env.local`(키 이름은 `.env.example`)에서만 읽고 저장소에는 넣지 않습니다.
기획·규칙·결정 기록은 `CLAUDE.md`, 새 기획 문서는 `docs/design/`, 게임 바이블 스킬은 `docs/skill/`에 있습니다.
