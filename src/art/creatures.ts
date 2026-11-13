// 2026-11-13 컨셉 시연판: 새 적·주민 임시 코드 그림 규격 (registry가 PNG로 내보냄, 게임은 entities/enemies/Creature.ts).
// 키 규칙: 호스틸·잃어버린 주민 = `${id}-dark`, 잃어버린 주민 제 모습 = `${id}-true`, 패시브 = `${id}`.
// 애니메이션 = `${키}-move` (frames 칸을 돌림). cy = 발(바닥에 닿는 곳) 또는 나는 종은 몸 가운데.
import type { Ctx } from './kit';

export type CreatureId = 'werewolf' | 'vampire' | 'hedgehog' | 'redpanda' | 'owl' | 'moth' | 'firefly';
export type CreatureLook = 'dark' | 'true' | 'plain';

export interface CreatureArt {
  size: number;
  cy: number;
  frames: number;
  looks: readonly CreatureLook[];
  flies: boolean;
}

export const CREATURES: Record<CreatureId, CreatureArt> = {
  werewolf: { size: 96, cy: 84, frames: 2, looks: ['dark'], flies: false },
  vampire: { size: 80, cy: 44, frames: 2, looks: ['dark'], flies: true },
  hedgehog: { size: 64, cy: 54, frames: 2, looks: ['dark', 'true'], flies: false },
  redpanda: { size: 72, cy: 62, frames: 2, looks: ['dark', 'true'], flies: false },
  owl: { size: 72, cy: 62, frames: 2, looks: ['plain'], flies: false },
  moth: { size: 64, cy: 32, frames: 2, looks: ['plain'], flies: true },
  firefly: { size: 48, cy: 24, frames: 2, looks: ['plain'], flies: true },
};

export const creatureKey = (id: CreatureId, look: CreatureLook): string => (look === 'plain' ? id : `${id}-${look}`);
export const creatureAnim = (id: CreatureId, look: CreatureLook): string => `${creatureKey(id, look)}-move`;
export const isCreature = (id: string): id is CreatureId => id in CREATURES;

/** 임시 자리표시 그림 (에이전트가 종별 그림으로 채운다) */
export function drawCreature(ctx: Ctx, id: CreatureId, look: CreatureLook, frame: number): void {
  const a = CREATURES[id];
  const r = a.size * 0.32;
  ctx.fillStyle = look === 'dark' ? '#14111F' : look === 'true' ? '#D9A066' : '#8A8FA8';
  ctx.beginPath();
  ctx.arc(a.size / 2, a.cy - r + (frame % 2) * 2, r, 0, Math.PI * 2);
  ctx.fill();
}
