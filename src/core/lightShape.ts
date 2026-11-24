// 상점 꾸미기에서 고른 빛 모양·걸음 빛 (2026-11-24 15:58 기획 세션, 라이언 확정): 판을 만들 때 한 번 읽어 쓴다(LightFx·Trail).
// 고른 것을 갖고 있지 않으면(진행을 지웠을 때 등) 기본 — 빛 모양 별 · 걸음 빛 없음. 겉모습만.
import { GameData, type LightShapeDef, type TrailDef } from '../data';
import { effectiveSelection } from '../systems/cosmetics';
import { Progress } from './Progress';
import { loadSettings } from './Settings';

const owns = (id: string, price: number): boolean => Progress.owns(id, price);

/** 지금 쓰는 빛 모양 */
export function currentShape(): LightShapeDef['id'] {
  try {
    return effectiveSelection('lightShape', GameData.cosmetics.lightShapes, { owns, selected: loadSettings().lightShape }) as LightShapeDef['id'];
  } catch {
    return 'star';
  }
}

/** 지금 쓰는 걸음 빛 (없음이면 color 없음) */
export function currentTrail(): TrailDef | undefined {
  try {
    const id = effectiveSelection('trail', GameData.cosmetics.trails, { owns, selected: loadSettings().trail });
    return GameData.cosmetics.trails.find((t) => t.id === id);
  } catch {
    return undefined;
  }
}
