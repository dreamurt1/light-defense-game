import { describe, expect, it } from 'vitest';

// 2026-11-20: 배포판 줄인 Phaser(src/vendor/phaser-slim.cjs)에 add.text를 빠뜨려, 배포판에서만 적이 빛에 맞을 때 예외 → 판이 멈췄다
// (소스에서 'scene.add' 다음 줄의 '.text('라 한 줄 검색으로 못 찾음). 소스의 add.·make. 호출이 모두 줄인 Phaser에 있는지 확인한다.
const SOURCES = import.meta.glob(['../src/**/*.ts', '!../src/dev/**'], { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const SLIM = Object.values(import.meta.glob('../src/vendor/phaser-slim.cjs', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>)[0];

/** 'TextFactory' → 'text', 'RenderTextureCreator' → 'renderTexture' */
const methodOf = (file: string, suffix: string) => {
  const name = file.slice(0, -suffix.length);
  return name.charAt(0).toLowerCase() + name.slice(1);
};

describe('배포판 줄인 Phaser에 게임이 쓰는 것이 다 있다', () => {
  const factories = new Set([...SLIM.matchAll(/\/(\w+Factory)'\)/g)].map((m) => methodOf(m[1], 'Factory')));
  const creators = new Set([...SLIM.matchAll(/\/(\w+Creator)'\)/g)].map((m) => methodOf(m[1], 'Creator')));
  // GameObjectFactory 자체에 있는 것
  factories.add('existing');

  const used = { add: new Set<string>(), make: new Set<string>() };
  for (const text of Object.values(SOURCES)) {
    // 줄바꿈이 끼어도 잡는다: scene.add\n  .text(
    for (const m of text.matchAll(/\b(add|make)\s*\.\s*([a-zA-Z]+)\s*\(/g)) used[m[1] as 'add' | 'make'].add(m[2]);
  }

  it('소스를 실제로 읽었다', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(50);
    expect(SLIM.length).toBeGreaterThan(500);
  });

  it('this.add.xxx', () => {
    expect([...used.add].filter((k) => !factories.has(k))).toEqual([]);
    expect(used.add.has('text')).toBe(true); // 검색이 줄바꿈을 넘어 잡는지
  });

  it('this.make.xxx', () => {
    expect([...used.make].filter((k) => !creators.has(k))).toEqual([]);
  });
});
