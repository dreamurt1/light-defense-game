// 콤보 단계 연출의 금빛 휘두름 선 (2026-11-27 기기별 렉 점검): 그라데이션 색을 입힌 SVG 선을 처음 그릴 때
// GPU가 새 셰이더를 준비하느라 프레임이 200~250ms 멈췄다(첫 '콤보 ×5' 순간 한 번 툭 끊김 — 맥·갤럭시 흉내에서 재현, 두 번째부터는 8ms).
// → 같은 선을 처음 한 번 CPU 캔버스로 그림(PNG)으로 구워 <img>로 쓴다(모양·색 그대로 — icons.ts swooshArt와 같은 경로·색).
// 캔버스를 못 쓰면 옛 SVG 그대로.
import { swooshArt } from './icons';

/** 구울 배율 (viewBox 320×140 → 1280×560: 큰 가로 화면·배율 2에서도 또렷하게) */
const SCALE = 4;
let cached: string | null = null;

function bake(): string | null {
  try {
    const c = document.createElement('canvas');
    c.width = 320 * SCALE;
    c.height = 140 * SCALE;
    // willReadFrequently = 소프트웨어 캔버스(GPU 셰이더를 쓰지 않음)
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx || typeof Path2D === 'undefined') return null;
    ctx.scale(SCALE, SCALE);
    const g = ctx.createLinearGradient(0, 0, 320, 0);
    g.addColorStop(0, 'rgba(255, 200, 87, 0)');
    g.addColorStop(0.45, 'rgba(255, 215, 110, 0.95)');
    g.addColorStop(1, 'rgba(255, 241, 201, 0)');
    ctx.strokeStyle = g;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.stroke(new Path2D('M14 112C70 52 170 18 306 40'));
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3.5;
    ctx.stroke(new Path2D('M40 126C110 84 200 66 296 74'));
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** 휘두름 선 요소 (구운 그림, 못 구우면 SVG) */
export function swooshElement(): Element {
  cached ??= bake();
  if (cached) {
    const img = document.createElement('img');
    img.className = 'combo-burst__swoosh';
    img.src = cached;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.decoding = 'sync';
    return img;
  }
  const t = document.createElement('template');
  t.innerHTML = swooshArt.trim();
  return t.content.firstElementChild as Element;
}
