// 등불의 결계 (순수 로직, 2026-11-14 라이언: 적의 이동 경로·플레이어의 동기·등불의 존재 이유를 자연스럽게).
//  - 켜진 등불의 빛 둘레(반지름 = 밝기에 비례)는 대부분의 어둠의 주민이 피해 돌아간다. 등불이 어두워질수록 둘레가 줄어
//    가까이 다가오고, 아주 흐려지면(둘레가 등불 몸에 닿을 만큼) 등불도 공격한다. 등불을 노리는 뱀파이어는 예외(Enemy).
//  - 켜진 등불 쪽에서는 적이 덜 나온다. 등불이 어두워질수록 그쪽에서 나오는 적이 늘어난다(라이언 정정 — 꺼지면 평소대로).
// 수치는 game.json station.ward (모두 제안).
import type { Vec } from './fan';

export interface Ward {
  x: number;
  y: number;
  /** 결계 반지름 (0이면 없음) */
  r: number;
}

export interface WardConfig {
  /** 가득 밝을 때 결계 반지름 */
  maxRadius: number;
  /** 결계 안에 들어와 있던 적이 밀려나는 빠르기 (초당, 갑자기 켜졌을 때 순간 이동하지 않게) */
  pushPerSec: number;
  /** 결계 바깥 이만큼 앞에서부터 옆으로 비켜 간다 */
  steerBuffer: number;
  /** 가득 밝은 등불 바로 곁에서 적이 나올 확률을 이만큼 줄인다 (0~1) */
  spawnAvoid: number;
  /** 이 거리 밖에서는 나오는 확률에 영향이 없다 */
  spawnRadius: number;
}

/** 결계 반지름: 광도(0~100)에 비례 */
export function wardRadius(light: number, cfg: Pick<WardConfig, 'maxRadius'>): number {
  return Math.max(0, Math.min(1, light / 100)) * cfg.maxRadius;
}

/** 적이 나올 자리 p의 가중치(0~1): 켜진 등불에 가깝고 밝을수록 작다 */
export function spawnWeight(p: Vec, lamps: readonly { x: number; y: number; light: number }[], cfg: Pick<WardConfig, 'spawnAvoid' | 'spawnRadius'>): number {
  let w = 1;
  for (const l of lamps) {
    const near = Math.max(0, 1 - Math.hypot(p.x - l.x, p.y - l.y) / cfg.spawnRadius);
    w *= 1 - cfg.spawnAvoid * Math.max(0, Math.min(1, l.light / 100)) * near;
  }
  return w;
}

/** 결계 안이면 밖으로 밀어낸 자리 (한 프레임에 최대 maxStep) */
export function keepOut(pos: Vec, radius: number, wards: readonly Ward[], maxStep: number): Vec {
  let { x, y } = pos;
  for (const w of wards) {
    const R = w.r + radius;
    if (w.r <= 0) continue;
    const dx = x - w.x;
    const dy = y - w.y;
    const d = Math.hypot(dx, dy);
    if (d >= R) continue;
    const ax = d > 1e-6 ? dx / d : 1;
    const ay = d > 1e-6 ? dy / d : 0;
    const step = Math.min(R - d, maxStep);
    x += ax * step;
    y += ay * step;
  }
  return { x, y };
}

/**
 * 결계를 비켜 가는 방향: 목적지가 결계 너머(결계 밖)에 있는데 결계 쪽으로 가고 있으면, 가까워질수록 둘레(접선) 쪽으로 튼다.
 * 목적지가 결계 안이면(예: 등불 곁에 선 루미) 비켜 가지 않고 곧장 다가가 결계 가장자리에서 멈춘다(keepOut).
 */
export function steerAround(pos: Vec, dir: Vec, radius: number, goal: Vec | null, wards: readonly Ward[], buffer: number): Vec {
  let x = dir.x;
  let y = dir.y;
  for (const w of wards) {
    if (w.r <= 0) continue;
    const R = w.r + radius;
    if (goal && Math.hypot(goal.x - w.x, goal.y - w.y) < R) continue;
    const dx = pos.x - w.x;
    const dy = pos.y - w.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (d > R + buffer) continue;
    const ax = dx / d;
    const ay = dy / d;
    if (x * ax + y * ay >= 0) continue; // 이미 멀어지는 중
    let tx = -ay;
    let ty = ax;
    if (tx * x + ty * y < 0) {
      tx = -tx;
      ty = -ty;
    }
    const k = Math.min(1, Math.max(0, (R + buffer - d) / buffer));
    x = x * (1 - k) + tx * k;
    y = y * (1 - k) + ty * k;
    const len = Math.hypot(x, y) || 1;
    x /= len;
    y /= len;
  }
  return { x, y };
}
