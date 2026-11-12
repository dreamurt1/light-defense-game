// public/assets/manifest.json의 형태. 게임은 이 파일만 보고 에셋을 불러온다(그리는 코드에 의존하지 않음).
import type { AnimDef, AssetCategory } from './registry';

export const MANIFEST_URL = 'assets/manifest.json';

export interface ManifestSheet {
  key: string;
  category: AssetCategory;
  label: string;
  /** assets/ 기준 경로 */
  file: string;
  /** 디자인 단위 프레임 크기. 파일 속 실제 픽셀 = × res */
  frameWidth: number;
  frameHeight: number;
  frames: number;
  /** 픽셀 배율: 생성 그림은 2~3배로 내보내고 게임이 1/res로 줄여 같은 크기로 보여 준다 */
  res: number;
  /** 'art' = art-src의 생성 그림, 'code' = src/art의 대체 그림 */
  source: 'art' | 'code';
  /** false면 Phaser가 불러오지 않는다 (DOM에서만 쓰는 그림) */
  load: boolean;
  anims: AnimDef[];
}

export interface Manifest {
  version: number;
  generatedAt: string;
  sheets: ManifestSheet[];
  /** UI 아이콘 SVG (assets/ui/<이름>.svg) */
  ui: string[];
}
