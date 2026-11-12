// 텍스처·애니메이션 키는 여기 한 곳에서 관리한다. 값은 public/assets/manifest.json의 key와 같다(src/art/registry.ts).
// 실제 일러스트로 바꿀 때는 같은 키·파일 이름·프레임 규격으로 PNG만 교체한다.
export const TextureKeys = {
  villageDark: 'village-dark',
  villageLit: 'village-lit',
  hangingLantern: 'hanging-lantern',
  glow: 'glow',
  glowMask: 'glow-mask',
  fanLight: 'fan-light',
  fanMask: 'fan-mask',
  sparkle: 'sparkle',
  star: 'star',
  footShadow: 'foot-shadow',
  lantern: 'lantern',
  batDark: 'bat-dark',
  batTrue: 'bat-true',
  witch: 'witch',
  fxReturn: 'fx-return',
  /** 루미 8방향 시트 (정지·걷기 = ChatGPT 8방향 팩, 애니메이션 키는 lumi-<idle|walk>-<방향>, lumi-ko·stun. 공격·피격·부활은 동작 효과) */
  lumi: 'lumi-8dir',
  // LUMI 시트 VFX
  fxStar: 'fx-star',
  fxImpact: 'fx-impact',
  fxHurt: 'fx-hurt',
  fxRespawn: 'fx-respawn',
  fxSwing: 'fx-swing',
  fxStun: 'fx-stun',
  // 공격 범위 표시 벡터 (public/assets/ui/*.svg)
  aimCircle: 'aim-circle',
  // 마을 소품 (0 = 어두운 밤, 1 = 빛 받음). 풀숲·장애물로 세운다(entities/MapProps.ts)
  villageBush: 'village-bush',
  villageRock: 'village-rock',
  villageBarrel: 'village-barrel-banner',
  villageLampPost: 'village-lamp-post',
} as const;

export const AnimKeys = {
  batDarkFly: 'bat-dark-fly',
  batTrueFly: 'bat-true-fly',
  witchIdle: 'witch-idle',
  fxReturn: 'fx-return',
} as const;

export type TextureKey = (typeof TextureKeys)[keyof typeof TextureKeys];
