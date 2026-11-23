// 텍스처마다의 픽셀 배율(manifest의 res). 생성 그림은 2~3배 해상도로 들어오므로,
// 화면에 놓을 때 1/res를 곱하면 코드 그림과 같은 크기로 보인다.
const resByKey = new Map<string, number>();
/** 생성 그림(art-src)에서 온 텍스처 — 코드 대체 그림과 구별 (행렬 패시브 자세 그림 자리, 2026-11-24) */
const artKeys = new Set<string>();

export function setTextureRes(key: string, res: number, source: 'art' | 'code' = 'code'): void {
  resByKey.set(key, res);
  if (source === 'art') artKeys.add(key);
  else artKeys.delete(key);
}

/** 이 텍스처가 생성 그림인가 (manifest source 'art') */
export function isArtTexture(key: string): boolean {
  return artKeys.has(key);
}

/** 이 텍스처를 디자인 크기로 보이게 하는 배율 */
export function texScale(key: string): number {
  return 1 / (resByKey.get(key) ?? 1);
}
