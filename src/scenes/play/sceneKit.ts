// PlayScene 도우미 (2026-11-13: 씬 파일을 600줄 아래로 유지하려고 떼어 냄) — 카메라 따라가기·결과 팬, 맴돌기 지점, HUD 값 알림.
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Rng } from '../../core/rng';
import { GameData } from '../../data';
import type { Vec } from '../../systems/fan';
import type { LightPoints } from '../../systems/lightPoints';
import type { Rect } from '../../systems/obstacles';
import type { Vitals } from '../../systems/vitals';
import type { CentralSourceState } from '../../systems/centralSource';

const CFG = GameData.game;
/** 카메라가 루미를 따라가는 부드러움 (제안) */
const FOLLOW_LERP = 0.14;
/**
 * 판이 끝나면 결과 판이 루미를 가리지 않게 월드를 민다 (제안: 기획서에 없음).
 * 세로: 결과 판이 아래에서 올라오므로 위로. 가로: 결과 판이 오른쪽에 서므로 왼쪽으로(화면 폭 비율)
 */
const END_PAN = { portraitY: 230, landscapeX: 0.22, ms: 700 };

/**
 * 카메라가 루미를 부드럽게 따라간다. Phaser의 startFollow는 그리기 직전에 스크롤을 바꿔
 * 이번 프레임 빛 마스크(VillageStage)가 한 프레임 늦게 어긋나므로, 직접 스크롤을 정한다.
 */
export function followCamera(cam: Phaser.Cameras.Scene2D.Camera, target: Vec, dt: number): void {
  const k = 1 - Math.pow(1 - FOLLOW_LERP, dt * 60);
  const tx = Math.min(CFG.world.width - cam.width, Math.max(0, target.x - cam.width / 2));
  const ty = Math.min(CFG.world.height - cam.height, Math.max(0, target.y - cam.height / 2));
  cam.setScroll(cam.scrollX + (tx - cam.scrollX) * k, cam.scrollY + (ty - cam.scrollY) * k);
}

export function panForResult(cam: Phaser.Cameras.Scene2D.Camera, keeper: Vec): void {
  const landscape = cam.width > cam.height;
  const x = keeper.x + (landscape ? cam.width * END_PAN.landscapeX : 0);
  const y = keeper.y + (landscape ? 0 : END_PAN.portraitY);
  cam.pan(x, y, END_PAN.ms, 'Cubic.easeOut');
}

/** 맴돌 다음 지점: 지금 자리에서 roamMin~roamMax 떨어진 마을 안 아무 곳 (제안) */
export function makeRoam(rng: Rng, area: Rect): (from: Vec) => Vec {
  return (from) => {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(CFG.hide.roamMin, CFG.hide.roamMax);
    return {
      x: Math.min(area.x + area.w, Math.max(area.x, from.x + Math.cos(a) * d)),
      y: Math.min(area.y + area.h, Math.max(area.y, from.y + Math.sin(a) * d)),
    };
  };
}

/** HUD 갱신: 값이 바뀌었을 때만 (force = 피격 등 바로) */
export class HudFeed {
  private shown = { hp: -1, lp: -1, central: -1 };

  emit(vitals: Vitals, lp: LightPoints, centralHp: number, force = false): void {
    const hp = Math.ceil(vitals.hp);
    if (force || hp !== this.shown.hp) {
      this.shown.hp = hp;
      bus.emit('player:vitals', { hp, maxHp: vitals.maxHp, hearts: vitals.hearts, maxHearts: CFG.stage.hearts });
    }
    const v = Math.round(lp.value);
    if (force || v !== this.shown.lp) {
      this.shown.lp = v;
      bus.emit('lp:change', { value: v, min: lp.min, max: lp.max });
    }
    // 남아 있는 동안 0으로 보이지 않게 올림 (주인공 HP와 같게)
    const central = Math.ceil(centralHp);
    if (force || central !== this.shown.central) {
      this.shown.central = central;
      bus.emit('central:change', { hp: central, maxHp: CFG.central.maxHp });
    }
  }
}

/** 일시정지: 트윈·애니메이션·타이머를 함께 멈춘다 (애니메이션을 안 멈추면 걷던 루미가 제자리 걸음, 2026-11-13).
 *  주의: 애니메이션 멈춤은 게임 전체(AnimationManager)에 걸린다 — 판을 닫거나 새로 시작할 때 꼭 freeze(scene, false)로 푼다 */
export function freeze(scene: Phaser.Scene, paused: boolean): void {
  if (paused) {
    scene.tweens.pauseAll();
    scene.anims.pauseAll();
  } else {
    scene.tweens.resumeAll();
    scene.anims.resumeAll();
  }
  scene.time.paused = paused;
}

/** 적 없는 순수 테스트·튜토리얼은 끝나지 않는다: 하트가 다시 차고 중앙 광원이 꺼지지 않는다 */
export function keepSafe(vitals: Vitals, central: CentralSourceState): void {
  if (!vitals.down) vitals.hearts = CFG.stage.hearts;
  central.hp = Math.max(central.hp, CFG.practice.centralFloor);
}
