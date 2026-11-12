// 개발 전용(lumi.html): 루미 캐릭터 에셋 시트를 잘라 프레임·파츠·표정·VFX를 투명 PNG로 만들고, 정지 8방향 팩을 같은 칸 규격으로 맞춘다.
// scripts/extract-lumi.mjs(npm run art:lumi)가 이 페이지를 열어 결과를 art-src/lumi/ 에 쓴다. 자르는 위치는 src/art/lumiSheet.ts.
import {
  alphaBounds,
  blobs,
  borderColor,
  colorToAlpha,
  defringeLight,
  feetCenterX,
  keepMainBlobs,
  removeCheckerboard,
  removeColors,
  pickPoses,
  type Pixels,
  type Rect,
} from '../art/cutout';
import {
  SET_FIT,
  BODY_H,
  CELL,
  FACES,
  FEET_Y,
  GRID,
  IDLE_PACK,
  LUMI_SHEET,
  PARTS,
  REFERENCE,
  TURNAROUND,
  VFX,
  WALK_PACK,
  WALK_SHEET,
  packDir,
  walkPackFile,
  type Backdrop,
  type GridState,
  type IdlePackManifest,
  type WalkPackManifest,
} from '../art/lumiSheet';
import { DIRS, type Dir } from '../systems/facing';

interface OutFile {
  path: string;
  dataUrl: string;
}

/** 배경을 지운 포즈 하나: 그림 영역만 잘린 캔버스와 발 가운데(캔버스 안 x) */
interface Pose {
  canvas: HTMLCanvasElement;
  feetX: number;
}

const files: OutFile[] = [];
const DEBUG = new URLSearchParams(location.search).has('debug');
const errors: string[] = [];
const S = LUMI_SHEET.scale;

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D];
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

const loadSheet = () => loadImage(LUMI_SHEET.url);

function crop(sheet: HTMLImageElement, r: Rect): HTMLCanvasElement {
  const [c, g] = canvasOf(r.w * S, r.h * S);
  g.drawImage(sheet, r.x * S, r.y * S, r.w * S, r.h * S, 0, 0, c.width, c.height);
  return c;
}

function pixels(c: HTMLCanvasElement): { px: Pixels; commit(): void } {
  const g = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const image = g.getImageData(0, 0, c.width, c.height);
  return { px: { data: image.data, width: c.width, height: c.height }, commit: () => g.putImageData(image, 0, 0) };
}

/** 배경을 지운다. keepMain이면 큰 덩어리만 남긴다(남은 눈금선·글자 조각 제거) */
function clean(c: HTMLCanvasElement, b: Backdrop, keepMain = true): Pixels {
  const { px, commit } = pixels(c);
  if (b.kind === 'panel') removeColors(px, [borderColor(px), ...(b.extra ?? [])], b.tolerance, b.feather);
  else if (b.kind === 'checker') {
    removeCheckerboard(px, b.tolerance, b.feather);
    defringeLight(px, 3, 105);
  }
  else colorToAlpha(px, borderColor(px));
  if (keepMain) keepMainBlobs(px, 0.06);
  commit();
  return px;
}

function cut(src: HTMLCanvasElement, r: Rect): HTMLCanvasElement {
  const [c, g] = canvasOf(r.w, r.h);
  g.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return c;
}

/** 한 줄에 나란히 있는 포즈 count개 */
function strip(sheet: HTMLImageElement, r: Rect, count: number, b: Backdrop, name: string): Pose[] {
  const c = crop(sheet, r);
  const px = clean(c, b, false);
  // 배경을 지운 줄 전체: 자르기 설정을 고칠 때만 (lumi.html?debug)
  if (DEBUG) save(`lumi/debug/${name}.png`, c);
  // 덩어리로 포즈를 찾는다: 눈금선·이웃 줄 조각은 지우고, 떨어진 별 조각은 가까운 포즈에 붙인다
  const boxes = pickPoses(px, count);
  // pickPoses가 지운 픽셀을 캔버스에 반영
  (c.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(px.data as Uint8ClampedArray<ArrayBuffer>, px.width, px.height), 0, 0);
  return boxes.map((box) => ({ canvas: cut(c, box), feetX: feetCenterX(px, box) - box.x }));
}

/** 포즈를 128×128 칸에: 배율 s로 줄이거나 늘리고, 발 가운데를 (64, FEET_Y)에 */
function toCell(p: Pose, s: number, flip = false): HTMLCanvasElement {
  const [c, g] = canvasOf(CELL, CELL);
  g.imageSmoothingQuality = 'high';
  const w = p.canvas.width * s;
  const h = p.canvas.height * s;
  g.save();
  if (flip) {
    g.translate(CELL, 0);
    g.scale(-1, 1);
  }
  g.drawImage(p.canvas, CELL / 2 - p.feetX * s, FEET_Y - h, w, h);
  g.restore();
  return c;
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

function save(path: string, c: HTMLCanvasElement): void {
  files.push({ path, dataUrl: c.toDataURL('image/png') });
}

/** 확인용 한 장에 붙일 칸들 */
interface Shelf {
  title: string;
  rows: { label: string; cells: HTMLCanvasElement[] }[];
}
const shelves: Shelf[] = [];

/** 팩 그림 한 장을 캔버스에. 몸 안쪽 알파가 252~253이라 어두운 마을 위에서 살짝 비치므로 거의 불투명한 곳은 불투명으로 */
function solid(img: HTMLImageElement): { canvas: HTMLCanvasElement; px: Pixels } {
  const [c, g] = canvasOf(img.naturalWidth, img.naturalHeight);
  g.drawImage(img, 0, 0);
  const { px, commit } = pixels(c);
  for (let i = 3; i < px.data.length; i += 4) if (px.data[i] >= 240) px.data[i] = 255;
  commit();
  return { canvas: c, px };
}

/** 그림 한 장의 투명 부분을 걷어 내고 발 가운데를 잰다 */
function poseOf(img: HTMLImageElement): Pose | null {
  const { canvas, px } = solid(img);
  const box = alphaBounds(px, 24);
  return box ? { canvas: cut(canvas, box), feetX: feetCenterX(px, box) - box.x } : null;
}

/** 팩 그림 크기가 manifest와 다르면 알린다 */
function checkSize(img: HTMLImageElement, canvas: { width: number; height: number }, name: string): void {
  if (img.naturalWidth !== canvas.width || img.naturalHeight !== canvas.height)
    errors.push(`${name}: ${img.naturalWidth}×${img.naturalHeight} (manifest는 ${canvas.width}×${canvas.height})`);
}

function mirrored(p: Pose): Pose {
  const [c, g] = canvasOf(p.canvas.width, p.canvas.height);
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(p.canvas, 0, 0);
  return { canvas: c, feetX: c.width - p.feetX };
}

/** 정지 8방향 팩: manifest.json의 각도·파일대로 읽어 칸에 놓는다 → lumi/idle/<방향>.png. 걷기 팩이 크기를 맞추도록 포즈·배율을 돌려준다 */
async function idlePack(): Promise<{ poses: Map<Dir, Pose>; scale: number }> {
  const man = (await (await fetch(`${IDLE_PACK.dir}/manifest.json`)).json()) as IdlePackManifest;
  const poses = new Map<Dir, Pose>();
  const missing: IdlePackManifest['directions'] = [];
  for (const d of man.directions) {
    try {
      const img = await loadImage(`${IDLE_PACK.dir}/${IDLE_PACK.png}/${d.file}.png`);
      checkSize(img, man.canvas, `대기 팩 ${d.file}`);
      const p = poseOf(img);
      if (p) poses.set(packDir(d.angle), p);
      else errors.push(`대기 팩 ${d.file}: 비어 있음`);
      // 선택·홈·상점 초상: 이 각도의 팩 그림을 줄이지 않고 그대로 (registry가 초상 규격으로 맞춘다)
      if (p && d.angle === IDLE_PACK.portraitAngle) save('characters/portrait-lumi.png', p.canvas);
    } catch {
      missing.push(d);
    }
  }
  // 파일이 없으면 manifest의 derived_by("horizontal mirror of 135°")대로 반대쪽을 뒤집는다
  for (const d of missing) {
    const from = Number(/mirror of (\d+)/.exec(d.derived_by ?? '')?.[1]);
    const src = Number.isFinite(from) ? poses.get(packDir(from)) : undefined;
    if (src) poses.set(packDir(d.angle), mirrored(src));
    else errors.push(`대기 팩 ${d.file}: 파일 없음`);
  }

  const s = (BODY_H * IDLE_PACK.fit) / median([...poses.values()].map((p) => p.canvas.height));
  const cells: HTMLCanvasElement[] = [];
  for (const d of DIRS) {
    const p = poses.get(d);
    if (!p) {
      errors.push(`대기 팩: ${d} 방향 없음`);
      continue;
    }
    const cell = toCell(p, s);
    save(`lumi/idle/${d}.png`, cell);
    cells.push(cell);
  }
  shelves.push({ title: '정지 8방향 (ChatGPT 대기 팩 — 게임의 대기 모습)', rows: [{ label: DIRS.join(' · '), cells }] });
  return { poses, scale: s };
}

/**
 * 걷기 8방향 팩: manifest.json의 방향·프레임 수와 README의 파일 이름 규칙대로 읽는다 → lumi/walk8/<방향>_<0~3>.png.
 * 같은 방향의 정지 모습과 키를 맞추고, 네 프레임은 한 기준점(발 가운데 평균·바닥선)에 놓는다
 */
async function walkPack(idle: { poses: Map<Dir, Pose>; scale: number }): Promise<void> {
  const man = (await (await fetch(`${WALK_PACK.dir}/manifest.json`)).json()) as WalkPackManifest;
  const rows = new Map<Dir, HTMLCanvasElement[]>();
  for (const d of man.directions) {
    const dir = packDir(d.degrees);
    const frames: { canvas: HTMLCanvasElement; box: Rect; feetX: number }[] = [];
    for (let n = 0; n < d.frames; n++) {
      const file = walkPackFile(d.degrees, d.name, n);
      try {
        const img = await loadImage(`${WALK_PACK.dir}/${WALK_PACK.png}/${file}`);
        checkSize(img, man.canvas, `걷기 팩 ${file}`);
        const { canvas, px } = solid(img);
        const box = alphaBounds(px, 24);
        if (box) frames.push({ canvas, box, feetX: feetCenterX(px, box) });
        else errors.push(`걷기 팩 ${file}: 비어 있음`);
      } catch {
        errors.push(`걷기 팩 ${file}: 파일 없음`);
      }
    }
    if (frames.length !== d.frames) continue;
    const h = median(frames.map((f) => f.box.h));
    const s = idle.scale * ((idle.poses.get(dir)?.canvas.height ?? h) / h) * WALK_PACK.fit;
    const ax = frames.reduce((sum, f) => sum + f.feetX, 0) / frames.length;
    const base = Math.max(...frames.map((f) => f.box.y + f.box.h));
    rows.set(
      dir,
      frames.map((f, n) => {
        const [c, g] = canvasOf(CELL, CELL);
        g.imageSmoothingQuality = 'high';
        g.drawImage(f.canvas, CELL / 2 - ax * s, FEET_Y - base * s, f.canvas.width * s, f.canvas.height * s);
        save(`lumi/walk8/${dir}_${n}.png`, c);
        return c;
      }),
    );
  }
  const shelf: Shelf = { title: `걷기 8방향 × 4프레임 (ChatGPT 걷기 팩 — ${(man.frame_order ?? []).join(' → ')})`, rows: [] };
  for (const d of DIRS) {
    const cells = rows.get(d);
    if (cells) shelf.rows.push({ label: d, cells });
    else errors.push(`걷기 팩: ${d} 방향 없음`);
  }
  shelves.push(shelf);
}

async function run(): Promise<void> {
  const sheet = await loadSheet();

  // 1) 8방향 턴어라운드 → 대기 기준 모습
  const turn = strip(sheet, TURNAROUND.rect, 8, TURNAROUND.backdrop, 'turn');
  const sTurn = (BODY_H / median(turn.map((p) => p.canvas.height))) * SET_FIT.turn;
  const turnCells = turn.map((p, i) => {
    const cell = toCell(p, sTurn);
    save(`lumi/turn/${TURNAROUND.order[i]}.png`, cell);
    return cell;
  });
  shelves.push({ title: '8방향 턴어라운드 (시트, 잘라 두기만 함)', rows: [{ label: TURNAROUND.order.join(' · '), cells: turnCells }] });

  // 1-2) 정지·걷기 모습: ChatGPT 대기 8방향 팩, 걷기 8방향 × 4프레임 팩
  await walkPack(await idlePack());

  // 2) 애니메이션 표: 8줄 × 상태
  const gridPoses: Record<string, Pose[][]> = {};
  for (const [state, col] of Object.entries(GRID.states)) {
    gridPoses[state] = GRID.rows.map((row, r) => {
      try {
        return strip(sheet, { x: col.x, y: row.y, w: col.w, h: row.h }, col.count, GRID.backdrop, `grid-${state}-r${r + 1}`);
      } catch (e) {
        errors.push(`표 ${state} ${r + 1}줄: ${(e as Error).message}`);
        return [];
      }
    });
  }
  const idleH = gridPoses.idle.flat().map((p) => p.canvas.height);
  const sGrid = (BODY_H / median(idleH)) * SET_FIT.grid;
  const gridShelf: Shelf = { title: '애니메이션 표 (줄 = 시트의 1~8줄)', rows: [] };
  for (let r = 0; r < GRID.rows.length; r++) {
    const cells: HTMLCanvasElement[] = [];
    for (const state of Object.keys(GRID.states) as GridState[]) {
      gridPoses[state][r].forEach((p, i) => {
        const cell = toCell(p, sGrid);
        save(`lumi/grid/${state}/r${r + 1}_${i}.png`, cell);
        cells.push(cell);
      });
    }
    gridShelf.rows.push({ label: `${r + 1}줄`, cells });
  }
  shelves.push(gridShelf);

  // 3) 아래쪽 이동 시트(체크무늬): 표의 걷기와 같은 크기로
  const walkSheet = WALK_SHEET.rows.map((row, r) => {
    try {
      return strip(sheet, { x: WALK_SHEET.x, y: row.y, w: WALK_SHEET.w, h: row.h }, WALK_SHEET.count, WALK_SHEET.backdrop, `walk-r${r + 1}`);
    } catch (e) {
      errors.push(`이동 시트 ${r + 1}줄: ${(e as Error).message}`);
      return [];
    }
  });
  const gridWalkH = median(gridPoses.walk.flat().map((p) => p.canvas.height));
  const sWalk = ((sGrid / SET_FIT.grid) * gridWalkH * SET_FIT.walk) / median(walkSheet.flat().map((p) => p.canvas.height));
  const walkShelf: Shelf = { title: '이동 스프라이트 시트 (줄 = 시트의 1~6줄)', rows: [] };
  walkSheet.forEach((poses, r) => {
    const cells = poses.map((p, i) => {
      const cell = toCell(p, sWalk);
      save(`lumi/walk/r${r + 1}_${i}.png`, cell);
      return cell;
    });
    walkShelf.rows.push({ label: `${r + 1}줄`, cells });
  });
  shelves.push(walkShelf);

  // 4) 초상은 정지 8방향 팩에서 (idlePack)

  // 5) 파츠: 덩어리마다 한 장
  {
    const c = crop(sheet, PARTS.rect);
    const px = clean(c, PARTS.backdrop, false);
    const parts = blobs(px, 40).map((r, i) => {
      const part = cut(c, r);
      save(`lumi/parts/part-${String(i + 1).padStart(2, '0')}.png`, part);
      return part;
    });
    shelves.push({ title: `파츠 (${parts.length}조각)`, rows: [{ label: '', cells: parts }] });
  }

  // 6) 표정 12개
  {
    const faces: HTMLCanvasElement[] = [];
    FACES.rows.forEach((y, r) =>
      FACES.cols.forEach((x, c) => {
        const name = FACES.names[r * FACES.cols.length + c];
        const cv = crop(sheet, { x, y, w: FACES.w, h: FACES.h });
        const px = clean(cv, FACES.backdrop);
        const box = alphaBounds(px, 24);
        if (!box) return errors.push(`표정 ${name}: 비어 있음`);
        const face = cut(cv, box);
        save(`lumi/faces/${name}.png`, face);
        faces.push(face);
      }),
    );
    shelves.push({ title: '표정', rows: [{ label: FACES.names.join(' · '), cells: faces }] });
  }

  // 7) VFX: 색 → 투명
  {
    const fx = VFX.map(({ name, rect }) => {
      const c = crop(sheet, rect);
      const px = clean(c, { kind: 'glow' }, false);
      const box = alphaBounds(px, 16) ?? { x: 0, y: 0, w: c.width, h: c.height };
      const out = cut(c, box);
      save(`lumi/vfx/${name}.png`, out);
      // 가져오기 도구(registry의 fx-* 시트)가 바로 쓰는 자리
      save(`effects/fx-${name}.png`, out);
      return out;
    });
    shelves.push({ title: 'VFX (색 → 투명)', rows: [{ label: VFX.map((v) => v.name).join(' · '), cells: fx }] });
  }

  // 8) 참고 칸은 배경째 그대로
  for (const { name, rect } of REFERENCE) save(`lumi/ref/${name}.png`, crop(sheet, rect));

  Object.assign(window, { __lumiFiles: files, __lumiContact: contact(), __lumiErrors: errors, __lumiReady: true });
}

/** 확인용 한 장: 체크무늬 위에 칸들을 줄지어 */
function contact(): string {
  const CELL_VIEW = 96;
  const PAD = 18;
  let height = PAD;
  for (const s of shelves) height += 34 + s.rows.length * (CELL_VIEW + 22);
  const maxCells = Math.max(...shelves.flatMap((s) => s.rows.map((r) => r.cells.length)));
  const [c, g] = canvasOf(PAD * 2 + 70 + maxCells * (CELL_VIEW + 6), height + PAD);
  g.fillStyle = '#0d0c1c';
  g.fillRect(0, 0, c.width, c.height);
  let y = PAD;
  for (const s of shelves) {
    g.fillStyle = '#ffc857';
    g.font = '700 18px "Malgun Gothic", sans-serif';
    g.fillText(s.title, PAD, y + 20);
    y += 34;
    for (const row of s.rows) {
      g.fillStyle = '#c9c6d6';
      g.font = '13px "Malgun Gothic", sans-serif';
      g.fillText(row.label.slice(0, 60), PAD, y + CELL_VIEW + 16);
      row.cells.forEach((cell, i) => {
        const x = PAD + 70 + i * (CELL_VIEW + 6);
        for (let cy = 0; cy < CELL_VIEW; cy += 12)
          for (let cx = 0; cx < CELL_VIEW; cx += 12) {
            g.fillStyle = (cx + cy) % 24 ? '#2a2c4a' : '#22243e';
            g.fillRect(x + cx, y + cy, 12, 12);
          }
        const k = Math.min(CELL_VIEW / cell.width, CELL_VIEW / cell.height, cell.width === CELL ? 0.75 : 1.4);
        g.drawImage(cell, x + (CELL_VIEW - cell.width * k) / 2, y + (CELL_VIEW - cell.height * k) / 2, cell.width * k, cell.height * k);
      });
      g.fillStyle = 'rgba(0,0,0,0)';
      y += CELL_VIEW + 22;
    }
  }
  return c.toDataURL('image/png');
}

run().catch((e) => Object.assign(window, { __lumiErrors: [String(e)], __lumiReady: true, __lumiFiles: files, __lumiContact: null }));
