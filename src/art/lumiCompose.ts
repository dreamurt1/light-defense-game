// 루미 8방향 시트 묶기: art-src/lumi의 128×128 프레임을 LUMI_PLAN대로 방향(줄) × 상태(칸)로 놓는다.
// 마지막 줄은 방향 없는 연출(넉아웃·부활·기절). 프레임이 하나라도 없으면 null → 코드 그림 대체 시트를 쓴다.
import { DIRS } from '../systems/facing';
import { CELL, FEET_Y, LUMI_COLS, LUMI_EXTRA, LUMI_EXTRA_FRAMES, LUMI_PLAN, type LumiFrame, type LumiState } from './lumiSheet';
import type { AnimDef } from './registry';

const STATES = Object.keys(LUMI_COLS) as LumiState[];
export const LUMI_COLUMNS = STATES.reduce((n, s) => n + LUMI_COLS[s], 0);
export const LUMI_ROWS = DIRS.length + 1;

/** 상태가 시작하는 칸 */
function startCol(state: LumiState): number {
  let c = 0;
  for (const s of STATES) {
    if (s === state) return c;
    c += LUMI_COLS[s];
  }
  return c;
}

/** 애니메이션: lumi-<idle|walk>-<방향>, lumi-ko / lumi-stun (제안: 프레임 속도는 기획서에 없음) */
export function lumiAnims(): AnimDef[] {
  const RATE: Record<LumiState, { frameRate: number; repeat: number }> = {
    idle: { frameRate: 4, repeat: -1 },
    // 걷기 팩 README 권장 8~10fps. 걸음이 빠를수록 Lightkeeper가 timeScale을 0.6~1.1배로 바꾼다
    walk: { frameRate: 9, repeat: -1 },
  };
  const out: AnimDef[] = [];
  DIRS.forEach((d, row) => {
    for (const s of STATES) {
      const first = row * LUMI_COLUMNS + startCol(s);
      const frames = Array.from({ length: LUMI_COLS[s] }, (_, i) => first + i);
      out.push({ key: `lumi-${s}-${d}`, frames, ...RATE[s] });
    }
  });
  const extraRow = DIRS.length * LUMI_COLUMNS;
  LUMI_EXTRA.forEach((k, i) => out.push({ key: `lumi-${k}`, frames: [extraRow + i], frameRate: 1, repeat: 0 }));
  return out;
}

function place(g: CanvasRenderingContext2D, img: CanvasImageSource, f: LumiFrame, col: number, row: number): void {
  g.save();
  g.beginPath();
  g.rect(col * CELL, row * CELL, CELL, CELL);
  g.clip();
  g.translate(col * CELL + CELL / 2 + (f.dx ?? 0), row * CELL + FEET_Y + (f.dy ?? 0));
  if (f.rot) g.rotate(f.rot);
  g.scale((f.flip ? -1 : 1) * (f.sx ?? 1), f.sy ?? 1);
  g.drawImage(img, -CELL / 2, -FEET_Y);
  g.restore();
}

/** load('lumi/turn/s') → art-src/lumi/turn/s.png 이미지 (없으면 null) */
export async function composeLumi(load: (src: string) => Promise<CanvasImageSource | null>): Promise<HTMLCanvasElement | null> {
  const c = document.createElement('canvas');
  c.width = LUMI_COLUMNS * CELL;
  c.height = LUMI_ROWS * CELL;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.imageSmoothingQuality = 'high';
  for (const [row, d] of DIRS.entries()) {
    for (const s of STATES) {
      const frames = LUMI_PLAN[d][s];
      for (let i = 0; i < LUMI_COLS[s]; i++) {
        const f = frames[i % frames.length];
        const img = await load(`lumi/${f.src}`);
        if (!img) return null;
        place(g, img, f, startCol(s) + i, row);
      }
    }
  }
  for (const [i, k] of LUMI_EXTRA.entries()) {
    const f = LUMI_EXTRA_FRAMES[k];
    const img = await load(`lumi/${f.src}`);
    if (!img) return null;
    place(g, img, f, i, DIRS.length);
  }
  return c;
}
