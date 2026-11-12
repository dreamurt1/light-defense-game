// 공격 범위 표시 벡터 (2026-11-04 라이언 지시: 독립적인 벡터 그래픽, 영문 지시서: 반투명 주황, 원형·원뿔형).
// npm run assets가 public/assets/ui/aim-cone.svg · aim-circle.svg로 그대로 쓴다. 원형은 PreloadScene이 load.svg로 불러오고,
// 원뿔은 반지름 길이만 바뀌어야 해서 AimGuide가 같은 모양·색으로 그때그때 그린다.
// 둘 다 8단위 여백을 둔 528×528. 원뿔은 꼭짓점 (8, 264)에서 반지름 512, 원은 가운데 (264, 264) 반지름 248.

/** 대광원 원형 범위 그림: 528×528 안에 반지름 248 */
export const AIM_CIRCLE = { size: 528, radius: 248 } as const;

/**
 * 조준 원뿔 (2026-11-06 라이언 지시): 60°, 면은 밝은 노랑 50%, 선 없음. 게임은 이 그림을 늘이지 않고
 * AimGuide가 같은 색으로 지금 반지름에 맞춰 다시 그린다(끄는 거리에 따라 반지름 길이만 바뀜). 이 파일은 독립 벡터 원본
 */
export const AIM_CONE_FILL = { color: 0xffe66d, css: '#FFE66D', alpha: 0.5 } as const;

export const AIM_CONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 528 528" width="528" height="528">
  <path d="M0 256 L443.4 0 A512 512 0 0 1 443.4 512 Z" fill="${AIM_CONE_FILL.css}" fill-opacity="${AIM_CONE_FILL.alpha}"/>
</svg>`;

/** 원형 범위(대광원): 가운데가 비고 가장자리로 갈수록 진한 호박빛, 굵은 테두리, 안쪽 점선 원 */
export const AIM_CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -8 528 528" width="528" height="528">
  <defs>
    <radialGradient id="ring-fill" cx="256" cy="256" r="248" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFD27A" stop-opacity="0"/>
      <stop offset=".7" stop-color="#FFC857" stop-opacity=".12"/>
      <stop offset="1" stop-color="#FFB04A" stop-opacity=".3"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#ring-fill)" stroke="#FFC857" stroke-width="8" stroke-opacity=".9"/>
  <circle cx="256" cy="256" r="196" fill="none" stroke="#FFF1C9" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 16" stroke-opacity=".55"/>
</svg>`;

export const VECTOR_FILES: Record<string, string> = {
  'aim-cone': AIM_CONE_SVG,
  'aim-circle': AIM_CIRCLE_SVG,
};
