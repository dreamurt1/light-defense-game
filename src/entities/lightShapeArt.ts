// 빛 모양 코드 그림 (2026-11-24 상점 꾸미기): 달(초승달 — 뿔이 진행 방향 반대) · 씨앗(뾰족한 쪽이 앞인 물방울 + 꼬리에 작은 잎).
// 지금 별(fx-star)과 같은 크기로 보이게 SIZE×SIZE 캔버스를 두 배로 굽고, 그림은 오른쪽(+x)이 진행 방향.
// 색은 별과 같은 호박빛 결 — 고른 빛 색은 별처럼 tint로 입힌다. 한 번만 굽는다.
import type Phaser from 'phaser';

/** 화면에서의 한 변(px) — fx-star 칸 폭 44와 같음 */
export const SHAPE_SIZE = 44;
const RES = 2;

export function lightShapeTexture(scene: Phaser.Scene, shape: 'moon' | 'seed'): string {
  const key = `light-shape-${shape}`;
  if (scene.textures.exists(key)) return key;
  const N = SHAPE_SIZE * RES;
  const tex = scene.textures.createCanvas(key, N, N);
  if (!tex) return key;
  const ctx = tex.getContext();
  const c = N / 2;
  const glow = (fill: () => void) => {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 200, 87, 0.9)';
    ctx.shadowBlur = N * 0.12;
    fill();
    ctx.restore();
  };
  const amber = ctx.createRadialGradient(c + N * 0.06, c, N * 0.02, c, c, N * 0.36);
  amber.addColorStop(0, '#FFF6D8');
  amber.addColorStop(0.45, '#FFD77A');
  amber.addColorStop(1, '#F2A93F');
  if (shape === 'moon') {
    // 둥근 앞(+x) · 뿔은 뒤(−x): 큰 원에서 왼쪽으로 비킨 원을 도려냄
    glow(() => {
      ctx.fillStyle = amber;
      ctx.beginPath();
      ctx.arc(c, c, N * 0.34, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(c - N * 0.17, c, N * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // 물방울 씨앗: 뾰족한 끝 = 앞(+x), 둥근 몸 = 뒤, 꼬리에 잎 하나
    glow(() => {
      ctx.fillStyle = amber;
      ctx.beginPath();
      ctx.moveTo(c + N * 0.38, c);
      ctx.bezierCurveTo(c + N * 0.12, c - N * 0.2, c - N * 0.1, c - N * 0.24, c - N * 0.2, c - N * 0.08);
      ctx.bezierCurveTo(c - N * 0.28, c + N * 0.06, c - N * 0.14, c + N * 0.24, c + N * 0.06, c + N * 0.16);
      ctx.bezierCurveTo(c + N * 0.2, c + N * 0.1, c + N * 0.3, c + N * 0.04, c + N * 0.38, c);
      ctx.closePath();
      ctx.fill();
    });
    // 꼬리의 잎 (밝은 종이색 — 빛 색 tint가 그대로 먹게)
    ctx.fillStyle = '#FFF1C9';
    ctx.beginPath();
    ctx.ellipse(c - N * 0.3, c - N * 0.16, N * 0.11, N * 0.05, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFE19A';
    ctx.lineWidth = N * 0.02;
    ctx.beginPath();
    ctx.moveTo(c - N * 0.2, c - N * 0.06);
    ctx.lineTo(c - N * 0.36, c - N * 0.2);
    ctx.stroke();
  }
  tex.refresh();
  return key;
}

/** 이 텍스처를 별과 같은 크기로 보이게 하는 배율 (scale = 별에 쓰던 배율) */
export const shapeScale = (scale: number): number => scale / RES;
