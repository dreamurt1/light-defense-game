// 상점에서 고른 빛 색 (2026-11-18): 빛을 보낼 때의 별·휘두름 궤적·조준 원뿔에 입힌다. 기본 호박빛이면 null(원래 색 그대로).
// 고른 색을 갖고 있지 않으면(진행을 지웠을 때 등) 기본으로. 마을을 드러내는 빛 자체는 바꾸지 않는다.
// 2026-11-23: 빛 색은 별가루로 산다(cosmetics.json price, Progress.owns).
import { GameData } from '../data';
import { Progress } from './Progress';
import { loadSettings, onSettingsChange } from './Settings';

let chosen = 'amber';
try {
  chosen = loadSettings().lightColor;
} catch {
  // 저장소를 못 쓰면 기본
}
onSettingsChange((d) => (chosen = d.lightColor));

/** 지금 입힐 빛 색 (0xRRGGBB), 기본이면 null */
export function lightTint(): number | null {
  const c = GameData.cosmetics.lightColors.find((x) => x.id === chosen);
  if (!c || c.price <= 0 || !Progress.owns(c.id, c.price)) return null;
  return parseInt(c.color.slice(1), 16);
}
