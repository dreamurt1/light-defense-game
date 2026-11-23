// 행렬 패시브의 웅크림·도망 그림 자리 (2026-11-24): 텍스처 키가 manifest에 있고, 생성 그림일 때만 Creature가 바꿔 낀다
import { describe, expect, it } from 'vitest';
import { GameData } from '../src/data';
import { paradeFleeAnim, paradePoseKey, type CreatureId } from '../src/art/creatures';
import { isArtTexture, setTextureRes } from '../src/core/textureRes';
import type { Manifest } from '../src/art/manifest';
import manifestJson from '../public/assets/manifest.json';

const manifest = manifestJson as unknown as Manifest;
const sheet = (key: string) => manifest.sheets.find((s) => s.key === key);

describe('행렬 패시브 자세 그림 자리', () => {
  const kinds = GameData.nights.parade.kinds as CreatureId[];
  it('행렬 종마다 <id>-cower 1칸 · <id>-flee 2칸(브리프 "도망 2칸", 애니 <id>-flee-run), 걷는 그림과 같은 칸 크기', () => {
    expect([...kinds].sort()).toEqual(['firefly', 'moth', 'owl']);
    for (const id of kinds) {
      const walk = sheet(id);
      const cower = sheet(paradePoseKey(id, 'cower'));
      const flee = sheet(paradePoseKey(id, 'flee'));
      expect(walk, id).toBeTruthy();
      expect(cower?.frames).toBe(1);
      expect(flee?.frames).toBe(2);
      expect(flee?.anims.map((a) => a.key)).toEqual([paradeFleeAnim(id)]);
      for (const s of [cower!, flee!]) {
        expect([s.frameWidth, s.frameHeight]).toEqual([walk!.frameWidth, walk!.frameHeight]);
        expect(s.load).not.toBe(false);
      }
    }
  });
  it('생성 그림(source art)만 바꿔 낄 대상 — 코드 대체 그림이면 아니다', () => {
    setTextureRes('test-pose', 2, 'art');
    expect(isArtTexture('test-pose')).toBe(true);
    setTextureRes('test-pose', 1, 'code');
    expect(isArtTexture('test-pose')).toBe(false);
    setTextureRes('test-pose-2', 1);
    expect(isArtTexture('test-pose-2')).toBe(false);
  });
});
