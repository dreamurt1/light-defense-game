import { defineConfig } from 'vitest/config';
import pkg from './package.json';

/** Phaser 원본의 기능 스위치(webpack에서 'typeof X'를 값으로 바꾸던 것). 배포판에서만 바꾼다 */
const PHASER_FLAGS: Record<string, boolean> = {
  WEBGL_RENDERER: true,
  CANVAS_RENDERER: true,
  FEATURE_SOUND: false,
  PLUGIN_CAMERA3D: false,
  PLUGIN_FBINSTANT: false,
  WEBGL_DEBUG: false,
  EXPERIMENTAL: false,
};
const FLAG_RE = new RegExp(String.raw`typeof (${Object.keys(PHASER_FLAGS).join('|')})\b`, 'g');

export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // Phaser 원본(src)의 global.Phaser = … 를 브라우저에서
    ...(command === 'build' ? { global: 'globalThis' } : {}),
  },
  // 배포판 크기 줄이기 (2026-11-20): 'phaser'를 게임이 쓰는 기능만 묶은 src/vendor/phaser-slim.cjs로. 개발 서버·테스트는 전체 Phaser 그대로
  resolve:
    command === 'build'
      ? { alias: [{ find: /^phaser$/, replacement: '/src/vendor/phaser-slim.cjs' }] }
      : {},
  plugins: [
    {
      name: 'phaser-feature-flags',
      apply: 'build',
      transform(code: string, id: string) {
        if (!/[\\/]phaser[\\/]src[\\/]/.test(id) || !code.includes('typeof ')) return null;
        // WEBGL_DEBUG가 꺼져도 번들러는 죽은 가지의 require('phaser3spectorjs')(디버그 도구, 설치 안 됨)를 찾으려 한다 → 지운다
        const out = code.replace(FLAG_RE, (_m, k: string) => String(PHASER_FLAGS[k])).replace(/require\(['"]phaser3spectorjs['"]\)/g, 'null');
        return { code: out, map: null };
      },
    },
  ],
  // 같은 와이파이의 휴대폰에서 dev 서버로 바로 열 수 있게
  server: { host: true },
  build: {
    target: 'es2020',
    // Phaser 단일 청크가 크게 나오는 건 정상
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
