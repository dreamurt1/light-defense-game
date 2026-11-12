# Asset Manifest — Art, Animation, Audio
> 2026-11-12: 여우·삵은 넣지 않는다(라이언). 루미는 등불을 들지 않고 스스로 빛을 쏜다. 장착물 그림은 필요 없다.

## 캐릭터
### 플레이어블
- Lumi (cat): starter
- Rabbit (토리 `tori`): unlock after rescue stage
- Squirrel (도토 `doto`): unlock after rescue stage

### Lost light residents
- Frog
- Hedgehog
- Red panda

### Hostile darkness residents
- Bat
- Werewolf
- Vampire

### Passive darkness residents
- Owl
- Moth
- Firefly

### Boss
- Witch Nowol (working name)

## Sprite states
주인공과 주요 적은 가능한 범위에서 다음 상태를 지원한다.
- Idle
- 이동 8방향
- 빛 공격/공격
- 피격
- 특수 공격 또는 필살기
- HP 0/퇴장 또는 구출
- 승리/패배 반응(필요 시)

기존 루미 스프라이트가 프로젝트에 존재하면 재생성하지 말고 재사용한다. 에셋 파일명/프레임 규칙을 먼저 조사하고, 에셋 로더에서 매핑한다.

## World assets
- Central Source: 중앙 광원/토템
- Light Station: 비활성/활성/피격/광도 저하 상태
- Obstacles: 바위, 건물, 울타리
- River and bridge
- Bush/shelter
- Light/dark region ground tiles
- Item pickups: 바람 깃털, 별 목걸이, 반딧불 병, 황금 도토리, 빛의 부적

## VFX
- 빛 공격 발사/적중
- 적 피격/움찔/빛 회피
- 잃어버린 주민의 원래 모습 회복 및 귀환
- 등불 점화/광도 상승/피격
- 중앙 광원 피격/위기
- LP 부족
- 아이템 획득/사용
- 콤보 시작/증가/종료
- 자비 점수 획득
- 일반 승리/완전 승리/패배

## Audio
- Home, gameplay, shop/tutorial background music
- Light shot, hit, lantern activation, lantern damage
- Lost resident rescue
- Item pickup/use
- Combo
- Player damage/respawn
- Central source danger
- Boss appearance/attack/clear
- Victory/complete victory/defeat

## Art direction
- Main palette: 기존 프로젝트 에셋과 사용자 지정 팔레트를 우선 확인. 현재 XMind에는 색상 코드가 확정되어 있지 않다.
- Cozy, readable, cute animal silhouettes.
- Light and darkness must be distinguishable without relying only on hue; use value/brightness, outline, particles and animation.
- Passive residents should look non-threatening and visibly react by avoiding light rather than attacking.
