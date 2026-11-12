// 판 위의 광원들 (2026-11-12 새 기획): 중앙 광원 + 등불 스테이션 + 맵 전체 광도.
// 매 프레임 점화·광도를 갱신하고, 무대(빛 고임)·적(노릴 곳)·빛(맞힐 꺼진 등불)·HUD에 필요한 값을 내준다.
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각이다(판정은 systems/centralSource·lightStation·villageMood).
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { GameData } from '../../data';
import { CentralSource } from '../../entities/CentralSource';
import { LightStation } from '../../entities/LightStation';
import type { LightPool } from '../../entities/VillageStage';
import type { EnemyTarget } from '../../entities/enemies/Enemy';
import type { LightTarget } from '../../systems/LightSystem';
import type { Vec } from '../../systems/fan';
import type { Rect } from '../../systems/obstacles';
import { MapLight } from '../../systems/villageMood';

const CFG = GameData.game;

export class Sources {
  readonly central: CentralSource;
  readonly stations: LightStation[];
  readonly mapLight = new MapLight(CFG.village);

  constructor(scene: Phaser.Scene, rng: Rng, stationCount: number) {
    this.central = new CentralSource(scene, CFG.central, CFG.lightLevels.bands);
    this.stations = pickStations(rng, stationCount).map((p, i) => new LightStation(scene, i, p, CFG.station));
  }

  /** 지나갈 수 없는 받침·밑동 */
  get footprints(): Rect[] {
    return [this.central.footprint, ...this.stations.map((s) => s.footprint)];
  }

  get litCount(): number {
    return this.stations.filter((s) => s.state.lit).length;
  }

  get allLit(): boolean {
    return this.stations.length > 0 && this.litCount === this.stations.length;
  }

  /** 등불 점화 → 맵 전체 광도 → 중앙 광원. @returns 이번 프레임에 켜진 등불 */
  update(dt: number, progress: number): LightStation[] {
    const justLit = this.stations.filter((s) => s.update(dt, this.mapLight.level));
    this.mapLight.update(dt, progress, this.allLit);
    this.central.state.update(dt);
    this.central.update(dt);
    return justLit;
  }

  /** 각 등불이 보이는 광도 (맵 전체 광도를 따름) — 완전 승리 판정 */
  get stationLevels(): number[] {
    return this.stations.map((s) => s.state.level(this.mapLight.level));
  }

  /** 마을을 드러내는 빛 고임: 루미 주변(aura) + 중앙 광원(광도 비례) + 켜진 등불 */
  pools(aura: LightPool): LightPool[] {
    const c = CFG.central;
    const st = this.central.state;
    return [
      aura,
      { x: this.central.pos.x, y: this.central.pos.y, radius: st.out ? 0 : c.glowMin + (c.glowMax - c.glowMin) * st.ratio, alpha: 1 },
      ...this.stations.map((s) => ({ x: s.pos.x, y: s.pos.y, radius: s.radiusFor(this.mapLight.level), alpha: 1 })),
    ];
  }

  /** 화면 밖에서 알릴 곳: 꺼진 등불, 위험한(광도 '낮음') 중앙 광원 */
  beacons(): Vec[] {
    const out: Vec[] = this.stations.filter((s) => !s.state.lit).map((s) => s.pos);
    if (this.central.state.value < CFG.lightLevels.bands[0]) out.push(this.central.pos);
    return out;
  }

  /** 적이 노릴 곳: 중앙 광원과 켜진 등불 */
  enemyTargets(): EnemyTarget[] {
    return [
      { id: 'central', x: this.central.pos.x, y: this.central.pos.y, radius: CFG.central.radius },
      ...this.stations.filter((s) => s.state.lit).map((s) => ({ id: s.id, x: s.pos.x, y: s.pos.y, radius: s.radius })),
    ];
  }

  /** 빛이 맞힐 꺼진 등불 (음수 uid: -1 - 번호) */
  lightTargets(): LightTarget[] {
    return this.stations.filter((s) => s.state.mode === 'off').map((s) => ({ uid: -1 - s.index, x: s.pos.x, y: s.pos.y, radius: s.radius }));
  }

  stationByUid(uid: number): LightStation | undefined {
    return this.stations[-1 - uid];
  }

  stationById(id: string): LightStation | undefined {
    return this.stations.find((s) => s.id === id);
  }

  emitStations(): void {
    bus.emit('station:change', { lit: this.litCount, total: this.stations.length });
  }
}

/** 이번 스테이지의 등불 자리: map.json 후보 중 seed로 n곳 (XMind: 위치는 랜덤, 외곽, 중앙 광원에서 너무 멀지 않게) */
function pickStations(rng: Rng, n: number): { x: number; y: number }[] {
  const spots = [...GameData.map.stations];
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  return spots.slice(0, Math.min(n, spots.length));
}
