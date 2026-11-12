// 텍스처마다의 픽셀 배율(manifest의 res). 생성 그림은 2~3배 해상도로 들어오므로,
// 화면에 놓을 때 1/res를 곱하면 코드 그림과 같은 크기로 보인다.
const resByKey = new Map<string, number>();

export function setTextureRes(key: string, res: number): void {
  resByKey.set(key, res);
}

/** 이 텍스처를 디자인 크기로 보이게 하는 배율 */
export function texScale(key: string): number {
  return 1 / (resByKey.get(key) ?? 1);
}
