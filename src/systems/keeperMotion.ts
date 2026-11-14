// 루미 동작 효과 (순수 로직, 2026-11-06 라이언 지시): 공격·피격·부활 때 시트의 작은 그림으로 바꾸지 않고, 지금 보이는
// 선명한 팩 그림(정지·걷기)을 눌렀다 늘이고 옮겨 동작을 보인다. 공격·피격은 처음(p=0)과 끝(p=1)이 기본값이라 어떤 상태로도
// 튀지 않고, 부활은 빛 속에서 나타나므로 투명하게 시작한다. 수치는 모두 제안: 기획서에 없음
// (ChatGPT 공격·피격 팩이 오면 그 프레임으로 바꾸고, 이 동작은 덧붙이는 맛으로만 남길 수 있다)

export type MotionKind = 'attack' | 'hit' | 'respawn';

/** 동작 길이(초) */
export const MOTION_SEC: Record<MotionKind, number> = { attack: 0.2, hit: 0.38, respawn: 0.42 };

/** 스프라이트에 더하는 값: 위치(게임 단위)·배율·회전(라디안)·투명도 */
export interface Pose {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  rot: number;
  alpha: number;
}

export const REST: Readonly<Pose> = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1 };

/** 공격: 조준 반대쪽으로 물러나며 웅크렸다가, 조준 쪽으로 내밀며 늘어난다 */
const ATTACK = { back: 4, forward: 9, lift: 3, squash: { sx: 1.06, sy: 0.93 }, stretch: { sx: 0.96, sy: 1.06 } };
/** 피격 (2026-11-14 라이언: 움찔이 잘 보이게 — 옛 눌림 1.08/0.9·흔들림 4는 거의 안 보였음):
 *  맞은 반대쪽으로 확 젖혀지며 납작 움츠렸다가(snapAt까지 빠르게), 잦아드는 흔들림과 함께 돌아온다 */
const HIT = { snapAt: 0.16, recoil: 10, squash: { sx: 1.16, sy: 0.8 }, shake: 5, tilt: 0.18 };
/** 부활: 가늘고 길게 나타났다가 제 모습으로 */
const RESPAWN = { from: { sx: 0.6, sy: 1.3 } };
/** 2.5D: 화면 세로 움직임은 줄인다 */
const DEPTH_Y = 0.6;

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const backOut = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

/** p = 동작 진행 0~1, angle = 조준 방향(공격만 씀) */
export function motionPose(kind: MotionKind, p: number, angle = 0): Pose {
  const t = Math.min(1, Math.max(0, p));
  if (t >= 1) return { ...REST };

  if (kind === 'attack') {
    const { back, forward, lift, squash: q, stretch: s } = ATTACK;
    let reach: number;
    let sx: number;
    let sy: number;
    let up: number;
    if (t < 0.3) {
      const k = smooth(t / 0.3);
      [reach, sx, sy, up] = [-back * k, lerp(1, q.sx, k), lerp(1, q.sy, k), 0];
    } else if (t < 0.6) {
      const k = smooth((t - 0.3) / 0.3);
      [reach, sx, sy, up] = [lerp(-back, forward, k), lerp(q.sx, s.sx, k), lerp(q.sy, s.sy, k), lift * k];
    } else {
      const k = smooth((t - 0.6) / 0.4);
      [reach, sx, sy, up] = [lerp(forward, 0, k), lerp(s.sx, 1, k), lerp(s.sy, 1, k), lerp(lift, 0, k)];
    }
    return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach * DEPTH_Y - up, sx, sy, rot: 0, alpha: 1 };
  }

  if (kind === 'hit') {
    // angle = 밀려나는 쪽(적에게서 루미 쪽). 순간 젖혀짐 snap: 0 → 1(빠르게) → 0(천천히)
    const snap = t < HIT.snapAt ? smooth(t / HIT.snapAt) : 1 - smooth((t - HIT.snapAt) / (1 - HIT.snapAt));
    const fade = 1 - t;
    const shake = t < HIT.snapAt ? 0 : Math.sin((t - HIT.snapAt) * Math.PI * 9) * HIT.shake * fade;
    const ax = Math.cos(angle);
    const ay = Math.sin(angle);
    return {
      dx: ax * HIT.recoil * snap + shake,
      dy: ay * HIT.recoil * snap * DEPTH_Y,
      sx: lerp(1, HIT.squash.sx, snap),
      sy: lerp(1, HIT.squash.sy, snap),
      // 밀려나는 쪽으로 몸이 기운다 (머리가 뒤로 젖혀지듯)
      rot: (ax >= 0 ? 1 : -1) * HIT.tilt * snap + Math.sin(t * Math.PI * 7) * 0.05 * fade,
      alpha: 1,
    };
  }

  const k = backOut(t);
  return { dx: 0, dy: 0, sx: lerp(RESPAWN.from.sx, 1, k), sy: lerp(RESPAWN.from.sy, 1, k), rot: 0, alpha: Math.min(1, t * 2.5) };
}
