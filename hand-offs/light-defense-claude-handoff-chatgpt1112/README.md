# LIGHT DEFENSE — Claude Code 인계 패키지

이 패키지는 2026-11-12 제공된 `light-defense-xmind-1112(1).pdf`의 기획을 바탕으로 작성한 개발 인계 문서입니다.

## 사용 방법
1. 이 압축을 기존 게임 프로젝트의 루트에 풀거나, `docs/`와 `config/` 내용을 기존 프로젝트에 복사합니다.
2. 기존 코드와 에셋을 먼저 백업하거나 Git 커밋합니다.
3. Claude Code에서 `CLAUDE.md`를 읽게 한 뒤, `docs/IMPLEMENTATION_PLAN.md`의 Phase 0부터 진행하도록 요청합니다.
4. Claude가 기존 프로젝트 구조·프레임워크·Firebase 설정을 확인하기 전에는 대규모 파일 교체나 재작성을 허용하지 않습니다.

## 파일 구성
- `CLAUDE.md`: Claude Code 작업 원칙과 프로젝트 핵심 규칙
- `docs/GAME_DESIGN.md`: 현재 기획 기준 게임 디자인 명세
- `docs/IMPLEMENTATION_PLAN.md`: 기존 코드 분석부터 구현까지의 단계
- `docs/ACCEPTANCE_CRITERIA.md`: 기능별 완료 조건 및 테스트 항목
- `docs/OPEN_QUESTIONS.md`: 기획에서 아직 확정되지 않은 사항
- `docs/ASSET_MANIFEST.md`: 캐릭터·스프라이트·오디오 에셋 요구사항
- `config/game-balance.json`: 초기 밸런스 설정 초안

## 중요한 주의
이 문서만으로 기존 게임을 무조건 새로 만들지 마세요. 기존 프로젝트의 기술 스택, 구현된 기능, 데이터 구조, 에셋 경로를 먼저 조사하고 재사용 가능한 부분을 보존해야 합니다. Firebase 프로젝트 ID, API 키, 비밀값은 문서나 코드에 임의로 기입하지 않습니다.
