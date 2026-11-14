// 판 위의 광원들 (2026-11-12 새 기획): 중앙 광원 + 등불 스테이션 + 맵 전체 광도.
// 매 프레임 점화·광도를 갱신하고, 무대(빛 고임)·적(노릴 곳)·빛(맞힐 꺼진 등불)·HUD에 필요한 값을 내준다.
// PlayScene을 600줄 아래로 유지하려고 떼어 낸 조립 조각이다(판정은 systems/centralSource·lightStation·villageMood).
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { GameData, type EnemyId } from '../../data';
import { CentralSource } from '../../entities/CentralSource';
import type { Beacon } from '../../entities/EdgeArrows';
import { LightStation } from '../../entities/LightStation';
import type { LightPool } from '../../entities/VillageStage';
import type { EnemyTarget } from '../../entities/enemies/Enemy';
import type { LightTarget } from '../../systems/LightSystem';
import type { Rect } from '../../systems/obstacles';
import { MapLight } from '../../systems/villageMood';
import { wardRadius } from '../../systems/lampWard';
import type { Vitals } from '../../systems/vitals';
import type { ItemPlaces } from './Items';

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

  /** 등불 점화·자연 감소 → 맵 전체 광도 → 중앙 광원.
   *  꺼진 등불이 켜지면 중앙 광원 HP가 조금 오른다(2026-11-14 라이언). @returns 이번 프레임에 켜진 등불과 그 덕에 오른 중앙 광원 HP */
  update(dt: number, progress: number): { station: LightStation; heal: number }[] {
    const lit: { station: LightStation; heal: number }[] = [];
    let out = false;
    for (const s of this.stations) {
      const changed = s.update(dt);
      if (changed === 'out') {
        out = true;
        bus.emit('station:out', { x: s.pos.x, y: s.pos.y });
      } else if (changed === 'lit') {
        const heal = this.central.state.heal(CFG.station.centralHeal);
        if (heal > 0) this.central.healFrom(s.pos);
        lit.push({ station: s, heal });
      }
    }
    if (out) this.emitStations();
    this.mapLight.update(dt, progress, this.allLit);
    this.central.update(dt);
    return lit;
  }

  /** 각 등불이 켜져 있는지 — 완전 승리 판정 */
  get stationsOn(): boolean[] {
    return this.stations.map((s) => s.state.lit);
  }

  /** 마을을 드러내는 빛 고임: 루미 주변(aura) + 중앙 광원(광도 = HP 비례) + 켜진 등불(광도 = HP 비례) */
  pools(aura: LightPool): LightPool[] {
    const c = CFG.central;
    const st = this.central.state;
    return [
      aura,
      { x: this.central.pos.x, y: this.central.pos.y, radius: st.out ? 0 : c.glowMin + (c.glowMax - c.glowMin) * st.ratio, alpha: 1 },
      ...this.stations.map((s) => ({ x: s.pos.x, y: s.pos.y, radius: s.glowRadius, alpha: 1 })),
    ];
  }

  /** 등불지기를 가릴 수 있는 광원 그림들과 밑동 y (가리면 반투명, 2026-11-13) */
  occluders(): { art: Phaser.GameObjects.Image; depth: number }[] {
    return [{ art: this.central.art, depth: this.central.footprint.y + this.central.footprint.h }, ...this.stations.map((s) => ({ art: s.art, depth: s.footY }))];
  }

  /** 광원 자리 (적이 들이받는 효과의 위치) */
  posOf(id: string): { x: number; y: number } | null {
    return id === 'central' ? this.central.pos : (this.stationById(id)?.pos ?? null);
  }

  /** 노란 화살표로 가리킬 곳: 꺼진 등불, 위험한(광도 '낮음' = HP 25% 아래) 중앙 광원. lift = 그림 꼭대기 조금 위(연출 값) */
  beacons(): Beacon[] {
    const out: Beacon[] = this.stations.filter((s) => !s.state.lit).map((s) => ({ x: s.pos.x, y: s.pos.y, lift: s.arrowLift, drop: s.arrowDrop }));
    if (this.central.state.light < CFG.lightLevels.bands[0]) out.push({ x: this.central.pos.x, y: this.central.pos.y, lift: this.central.arrowLift, drop: this.central.arrowDrop });
    return out;
  }

  /** 적이 노릴 곳: 중앙 광원과 켜진 등불. 등불은 결계 반지름(밝기 비례 — 대부분의 적이 피함)과 광도도 함께 (2026-11-14) */
  enemyTargets(): EnemyTarget[] {
    return [
      { id: 'central', x: this.central.pos.x, y: this.central.pos.y, radius: CFG.central.radius },
      ...this.stations
        .filter((s) => s.state.lit)
        .map((s) => ({ id: s.id, x: s.pos.x, y: s.pos.y, radius: s.radius, light: s.state.light, ward: wardRadius(s.state.light, CFG.station.ward) })),
    ];
  }

  /** 아이템이 생길 곳 (2026-11-14 라이언): 대부분 켜진 등불 빛 안, 패배 위험이면 루미 곁 */
  itemPlaces(v: Vitals): ItemPlaces {
    const lowHp = v.hearts <= 1 && v.hp / v.maxHp <= CFG.items.dangerHpRatio;
    const lowCentral = this.central.state.light < CFG.lightLevels.bands[0];
    return { central: this.central.pos, lamps: this.stations.filter((s) => s.state.lit).map((s) => s.pos), danger: !v.down && (lowHp || lowCentral) };
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

  /** 적의 공격·노월의 구슬: 중앙 광원 또는 등불의 HP가 준다(광도도 함께). @returns 중앙 광원이 맞았으면 true */
  damage(target: string, amount: number, by: EnemyId, climax: boolean): boolean {
    if (target === 'central') {
      const c = this.central;
      c.state.damage(amount);
      c.hit();
      this.mapLight.hit('central', climax);
      bus.emit('central:hit', { hp: c.state.hp, by });
      return true;
    }
    const s = this.stationById(target);
    if (!s) return false;
    s.hit();
    if (s.state.damage(amount)) {
      bus.emit('station:out', { x: s.pos.x, y: s.pos.y });
      this.emitStations();
    }
    return false;
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
