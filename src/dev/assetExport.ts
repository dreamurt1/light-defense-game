// 개발 전용(assets.html): registry의 모든 시트를 만들어 보여 주고, 내보내기 스크립트가 가져갈 수 있게 window에 올린다.
// art-src/<분류>/에 생성 그림(ChatGPT)이 있으면 그 그림을 다듬어(배경 지우기·포즈 나누기·같은 배율로 상자에 넣기) 쓰고,
// 없으면 src/art의 코드 그림을 쓴다. 규격은 registry의 art, 주문서는 docs/art-order.md.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { alphaBounds, containScale, hasOpaqueBackground, removeBackground, splitColumns, type Pixels } from '../art/cutout';
import { SHEETS, sheetFile, type ArtSpec, type AssetCategory, type SheetDef } from '../art/registry';
import * as icons from '../ui/icons';
import { VECTOR_FILES } from '../art/vectors';

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  characters: '캐릭터',
  enemies: '적 (어둠에 변한 이웃)',
  objects: '오브젝트',
  effects: '이펙트',
  backgrounds: '배경',
};

interface ExportedSheet {
  key: string;
  category: AssetCategory;
  label: string;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  res: number;
  source: 'art' | 'code';
  load: boolean;
  anims: { key: string; frames: number[]; frameRate: number; repeat: number }[];
  dataUrl: string;
}

/** art-src 안의 그림 파일: '/art-src/characters/keeper-lumi.idle.png' → URL */
const SOURCES = import.meta.glob('/art-src/**/*.{png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;
const EXT = /\.(png|webp|jpe?g)$/i;

function findSource(category: string, name: string): string | null {
  return findPath(`${category}/${name}`);
}

/** art-src 아래 경로(확장자 없이) → URL */
function findPath(path: string): string | null {
  const hit = Object.keys(SOURCES).find((p) => p.replace(EXT, '').toLowerCase() === `/art-src/${path}`.toLowerCase());
  return hit ? SOURCES[hit] : null;
}

/** 여러 그림을 엮는 시트(build)용: 없으면 null */
async function loadArt(path: string): Promise<CanvasImageSource | null> {
  const url = findPath(path);
  return url ? loadCanvas(url) : null;
}

/** 포즈별 파일(<키>.<포즈>.png) 또는 한 장(<키>.png). 없으면 null */
function sourcesFor(s: SheetDef, spec: ArtSpec): { single: string } | { poses: string[] } | null {
  const perPose = spec.poses.map((p) => findSource(s.category, `${s.key}.${p}`));
  if (perPose.every((u): u is string => u !== null)) return { poses: perPose };
  const single = findSource(s.category, s.key);
  return single ? { single } : null;
}

async function loadCanvas(url: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d')?.drawImage(img, 0, 0);
  return c;
}

function pixelsOf(c: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; image: ImageData; px: Pixels } {
  const ctx = c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const image = ctx.getImageData(0, 0, c.width, c.height);
  return { ctx, image, px: { data: image.data, width: c.width, height: c.height } };
}

function crop(src: HTMLCanvasElement, r: { x: number; y: number; w: number; h: number }): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = r.w;
  c.height = r.h;
  c.getContext('2d')?.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return c;
}

/** 투명 배경 스프라이트로: 칠해진 배경이면 지우고, 포즈마다 그림 영역만 잘라 낸다 */
async function cutPoses(src: { single: string } | { poses: string[] }, count: number): Promise<HTMLCanvasElement[]> {
  const prepare = async (url: string) => {
    const c = await loadCanvas(url);
    const { ctx, image, px } = pixelsOf(c);
    if (hasOpaqueBackground(px)) {
      removeBackground(px);
      ctx.putImageData(image, 0, 0);
    }
    return { c, px };
  };
  if ('poses' in src) {
    return Promise.all(
      src.poses.map(async (url) => {
        const { c, px } = await prepare(url);
        const r = alphaBounds(px);
        if (!r) throw new Error(`${url}: 그림이 비어 있습니다`);
        return crop(c, r);
      }),
    );
  }
  const { c, px } = await prepare(src.single);
  return splitColumns(px, count).map((span) => {
    const r = alphaBounds(px, 10, span);
    if (!r) throw new Error(`${src.single}: 포즈 영역이 비어 있습니다`);
    return crop(c, r);
  });
}

/** 생성 그림으로 시트를 만든다. 그림이 없으면 null (코드 그림을 쓴다) */
async function artSheet(s: SheetDef): Promise<HTMLCanvasElement | null> {
  const spec = s.art;
  if (!spec) return null;
  let src = sourcesFor(s, spec);
  let derive: ArtSpec['derive'] | undefined;
  if (!src && spec.derive) {
    const from = SHEETS.find((d) => d.key === spec.derive?.from);
    src = from?.art ? sourcesFor(from, from.art) : null;
    derive = spec.derive;
  }
  if (!src) return null;

  const { res } = spec;
  const fw = s.frameWidth * res;
  const fh = s.frameHeight * res;
  const out = document.createElement('canvas');
  out.width = Math.round(fw * s.frames);
  out.height = Math.round(fh);
  const ctx = out.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';

  if (spec.fit === 'cover') {
    const pic = await loadCanvas('single' in src ? src.single : src.poses[0]);
    const k = Math.max(fw / pic.width, fh / pic.height);
    const w = pic.width * k;
    const h = pic.height * k;
    if (derive) ctx.filter = derive.filter;
    ctx.drawImage(pic, (fw - w) / 2, (fh - h) / 2, w, h);
    ctx.filter = 'none';
    if (derive?.warm) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = derive.warm;
      ctx.fillRect(0, 0, fw, fh);
      ctx.globalCompositeOperation = 'source-over';
    }
    return out;
  }

  const poses = await cutPoses(src, spec.poses.length);
  const box = spec.box ?? { x: 0, y: 0, w: s.frameWidth, h: s.frameHeight };
  const k = containScale(
    poses.map((p) => ({ w: p.width, h: p.height })),
    { w: box.w * res, h: box.h * res },
  );
  const feet = (spec.align ?? 'feet') === 'feet';
  spec.frames.forEach((f, i) => {
    const pose = poses[f.pose];
    const w = pose.width * k;
    const h = pose.height * k;
    ctx.save();
    ctx.beginPath();
    ctx.rect(i * fw, 0, fw, fh);
    ctx.clip();
    // 기준점: 상자 아래 가운데(발) 또는 상자 가운데. 늘이기·옮기기는 이 점을 기준으로
    ctx.translate(i * fw + (box.x + box.w / 2 + (f.dx ?? 0)) * res, (box.y + (feet ? box.h : box.h / 2) + (f.dy ?? 0)) * res);
    ctx.scale(f.sx ?? 1, f.sy ?? 1);
    if (f.filter) ctx.filter = f.filter;
    ctx.drawImage(pose, -w / 2, feet ? -h : -h / 2, w, h);
    ctx.restore();
  });
  return out;
}

function codeSheet(s: SheetDef): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = s.frameWidth * s.frames;
  canvas.height = s.frameHeight;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  for (let f = 0; f < s.frames; f++) {
    ctx.save();
    // 프레임 칸 밖으로 그림이 새지 않게 잘라 낸다 (프레임 정렬)
    ctx.beginPath();
    ctx.rect(f * s.frameWidth, 0, s.frameWidth, s.frameHeight);
    ctx.clip();
    ctx.translate(f * s.frameWidth, 0);
    s.draw(ctx, f);
    ctx.restore();
  }
  return canvas;
}

async function build(): Promise<void> {
  const root = document.getElementById('sheets');
  const out: ExportedSheet[] = [];
  const errors: string[] = [];
  let lastCategory: AssetCategory | null = null;

  for (const s of SHEETS) {
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = s.build ? await s.build(loadArt) : await artSheet(s);
    } catch (e) {
      errors.push(`${s.key}: ${(e as Error).message}`);
    }
    const source = canvas ? 'art' : 'code';
    const res = canvas ? (s.build ? (s.buildRes ?? 1) : (s.art?.res ?? 1)) : 1;
    canvas ??= codeSheet(s);
    const webp = s.format === 'webp';
    out.push({
      key: s.key,
      category: s.category,
      label: s.label,
      file: sheetFile(s),
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
      frames: s.frames,
      res,
      source,
      load: s.load ?? true,
      anims: s.anims ?? [],
      dataUrl: canvas.toDataURL(webp ? 'image/webp' : 'image/png', webp ? 0.88 : undefined),
    });

    if (s.category !== lastCategory) {
      const h = document.createElement('h2');
      h.textContent = CATEGORY_LABEL[s.category];
      root?.append(h);
      lastCategory = s.category;
    }
    const box = document.createElement('figure');
    box.className = 'sheet';
    box.style.margin = '0 16px 16px 0';
    const label = document.createElement('span');
    label.textContent = `${s.label} · ${s.key} · ${s.frameWidth}×${s.frameHeight} × ${s.frames} · ${source === 'art' ? `그림 ×${res}` : '코드 그림'}`;
    canvas.style.width = `${Math.min(s.frameWidth * s.frames, s.category === 'backgrounds' ? 270 : 640)}px`;
    box.append(canvas, label);
    root?.append(box);
  }

  // UI 아이콘: DOM에서 쓰는 SVG를 그대로 파일로
  const uiIcons: Record<string, string> = {};
  for (const [name, markup] of Object.entries(icons)) {
    if (typeof markup !== 'string' || !markup.includes('<svg')) continue;
    const file = name.replace(/(Icon|Art)$/, '').replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
    uiIcons[file] = markup.trim().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" color="#F6F1E7" ');
  }

  Object.assign(window, { __assetSheets: out, __uiIcons: uiIcons, __vectors: VECTOR_FILES, __assetErrors: errors, __assetsReady: true });
}

void build();
