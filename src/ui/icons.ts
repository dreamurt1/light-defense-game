// 직접 그린 아이콘. 레퍼런스(reference/ChatGPT-Images)의 둥글고 따뜻한 결로 맞춘다.

export const moonIcon = `
<svg class="icon icon--moon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M15.5 3.2A9 9 0 1 0 20.8 15 7.2 7.2 0 0 1 15.5 3.2Z" fill="currentColor"/>
  <path d="M19 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z" fill="currentColor" opacity=".8"/>
</svg>`;

/** 네 갈래 별 (진행 바 위치·끝, 콤보 연출, 장착물 칸) */
export const starIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 1.5c.5 5.2 2.8 8 10.5 10.5C14.8 14.5 12.5 17.3 12 22.5 11.5 17.3 9.2 14.5 1.5 12 9.2 9.5 11.5 6.7 12 1.5Z" fill="currentColor"/>
</svg>`;

/** 다섯 갈래 별 (장착물 칸) */
export const badgeStarIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

/** 등불 HP 불꽃: 레퍼런스의 주황·노랑 불 */
export const flameIcon = `
<svg class="flame" viewBox="0 0 28 36" aria-hidden="true">
  <path class="flame__outer" d="M14 1.2c1.3 3.9 5.7 6.8 7.9 10.6 1.5 2.5 2.3 5 2.3 7.9 0 6-4.6 10.8-10.2 10.8S3.8 25.7 3.8 19.7c0-3.9 1.8-6.7 4.1-9 .1 2.4 1 4.2 2.6 5.1-.4-5.1 1.3-10.2 3.5-14.6Z"/>
  <path class="flame__inner" d="M14.2 13.6c1.2 2.6 4.6 4.5 4.6 8.4 0 3-2.2 5.4-4.8 5.4s-4.8-2.4-4.8-5.4c0-1.9.8-3.3 1.9-4.4.2 1.2.7 2 1.5 2.5-.2-2.3.5-4.5 1.6-6.5Z"/>
  <ellipse class="flame__core" cx="14" cy="24" rx="2" ry="2.6"/>
</svg>`;

/** 시너지 게이지 앞의 새싹 */
export const sproutIcon = `
<svg class="icon icon--sprout" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>
  <path d="M12 13C12 8 8.5 5.5 3.5 6c0 4.6 3.4 7.4 8.5 7Z" fill="currentColor"/>
  <path d="M12 12c0-4.4 3-6.7 8.5-6.4 0 4.1-3 6.6-8.5 6.4Z" fill="currentColor" opacity=".8"/>
  <circle cx="12" cy="21" r="2.4" fill="#FFC857"/>
</svg>`;

export const pauseIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="6.5" y="5" width="3.8" height="14" rx="1.6" fill="currentColor"/>
  <rect x="13.7" y="5" width="3.8" height="14" rx="1.6" fill="currentColor"/>
</svg>`;

/** 버튼 아이콘: 다시 하기(재생 삼각형), 계속, 랭킹(시상대) */
export const playIcon = `
<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.6-6.8c.6-.4.6-1.3 0-1.7L9.6 4.4C8.9 3.9 8 4.4 8 5.2Z" fill="currentColor"/>
</svg>`;

export const podiumIcon = `
<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="9" y="6" width="6" height="14" rx="1.2" fill="currentColor"/>
  <rect x="2.5" y="11" width="6" height="9" rx="1.2" fill="currentColor" opacity=".75"/>
  <rect x="15.5" y="13" width="6" height="7" rx="1.2" fill="currentColor" opacity=".75"/>
</svg>`;

/** 콤보 단계 글자 뒤를 휘감는 빛줄기 */
export const swooshArt = `
<svg class="combo-burst__swoosh" viewBox="0 0 320 140" aria-hidden="true">
  <defs>
    <linearGradient id="swoosh-g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#FFC857" stop-opacity="0"/>
      <stop offset=".45" stop-color="#FFD76E" stop-opacity=".95"/>
      <stop offset="1" stop-color="#FFF1C9" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path d="M14 112C70 52 170 18 306 40" fill="none" stroke="url(#swoosh-g)" stroke-width="7" stroke-linecap="round"/>
  <path d="M40 126C110 84 200 66 296 74" fill="none" stroke="url(#swoosh-g)" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
</svg>`;

/** 화면 이동·메뉴 아이콘 (같은 2px 둥근 선 굵기) */
export const chevronLeftIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const chevronRightIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const gearIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm8 4.6-1.9.5a6.6 6.6 0 0 1-.6 1.5l1 1.7-1.6 1.6-1.7-1a6.6 6.6 0 0 1-1.5.6l-.5 1.9h-2.3l-.5-1.9a6.6 6.6 0 0 1-1.5-.6l-1.7 1-1.6-1.6 1-1.7a6.6 6.6 0 0 1-.6-1.5L4 13.2v-2.4l1.9-.5a6.6 6.6 0 0 1 .6-1.5l-1-1.7 1.6-1.6 1.7 1a6.6 6.6 0 0 1 1.5-.6l.5-1.9h2.3l.5 1.9a6.6 6.6 0 0 1 1.5.6l1.7-1 1.6 1.6-1 1.7c.3.5.5 1 .6 1.5l1.9.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`;

export const shopIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 9.5 5.6 4.5h12.8L20 9.5a2.7 2.7 0 0 1-5.3.4 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 9.5Z" fill="currentColor"/>
  <path d="M5.5 12.5V19h13v-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <rect x="10" y="14.5" width="4" height="4.5" rx="1" fill="currentColor"/>
</svg>`;

export const lockIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" fill="currentColor"/>
  <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/>
</svg>`;

/** 새싹 (홈의 `튜토리얼`: 처음 밤을 언제든 다시, 2026-11-13) */
export const tutorialIcon = `
<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 21v-8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  <path d="M12 13C12 8 8.5 5.5 3.5 6c0 4.6 3.4 7.4 8.5 7Z" fill="currentColor"/>
  <path d="M12 12c0-4.4 3-6.7 8.5-6.4 0 4.1-3 6.6-8.5 6.4Z" fill="currentColor" opacity=".8"/>
</svg>`;

/** 둥근 화살표 (당겨서 새로고침, 2026-11-13) */
export const refreshIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M19.6 3.6v5.2h-5.2Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

/** 발바닥 (홈의 `테스트`: 루미가 걸어 보는 판) */
export const pawIcon = `
<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 12.2c-3.1 0-6 2.8-6 5.6 0 1.6 1.2 2.6 2.7 2.6 1.3 0 2.1-.7 3.3-.7s2 .7 3.3.7c1.5 0 2.7-1 2.7-2.6 0-2.8-2.9-5.6-6-5.6Z" fill="currentColor"/>
  <ellipse cx="5.2" cy="10.4" rx="2" ry="2.5" transform="rotate(-20 5.2 10.4)" fill="currentColor"/>
  <ellipse cx="9.2" cy="6.4" rx="2.1" ry="2.7" transform="rotate(-8 9.2 6.4)" fill="currentColor"/>
  <ellipse cx="14.8" cy="6.4" rx="2.1" ry="2.7" transform="rotate(8 14.8 6.4)" fill="currentColor"/>
  <ellipse cx="18.8" cy="10.4" rx="2" ry="2.5" transform="rotate(20 18.8 10.4)" fill="currentColor"/>
</svg>`;

export const homeIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 11 12 4.5l8 6.5v8.5a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1V11Z" fill="currentColor"/>
</svg>`;

/** 하트 (2026-11-12 새 기획: 스테이지마다 3개). 빈 하트는 CSS로 흐리게 */
export const heartIcon = `
<svg class="heart" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 20.6 4.6 13.4C2.4 11.2 2.5 7.6 4.9 5.6c2.1-1.8 5.1-1.4 6.8.6l.3.4.3-.4c1.7-2 4.7-2.4 6.8-.6 2.4 2 2.5 5.6.3 7.8Z" fill="currentColor"/>
  <ellipse cx="8.2" cy="8.6" rx="1.7" ry="1.2" transform="rotate(-30 8.2 8.6)" fill="#fff" opacity=".45"/>
</svg>`;

/** 등불 스테이션 (HUD: 켠 등불 수) */
export const lampIcon = `
<svg class="icon icon--lamp" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M7 8.2C7 6.4 9.2 4.2 12 3.2c2.8 1 5 3.2 5 5Z" fill="currentColor" opacity=".85"/>
  <rect x="8" y="8.6" width="8" height="9" rx="2.2" fill="currentColor"/>
  <rect x="9.6" y="10.2" width="4.8" height="5.8" rx="1.4" fill="#FFF1C9" opacity=".9"/>
  <rect x="7" y="18.2" width="10" height="2.6" rx="1.2" fill="currentColor"/>
</svg>`;

/** 중앙 광원 결정 (HUD: 광원 광도) */
export const crystalIcon = `
<svg class="icon icon--crystal" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 2.2 17.4 10 12 21.8 6.6 10Z" fill="currentColor"/>
  <path d="M12 2.2 10.6 11.6 12 21.8" stroke="#FFF6DA" stroke-width="1.1" fill="none" opacity=".7"/>
  <path d="M4 15.2 5.4 12.8 6.8 15.2 5.4 18.4Z M18.6 13.4 19.8 11.6 21 13.4 19.8 15.8Z" fill="currentColor" opacity=".7"/>
</svg>`;
