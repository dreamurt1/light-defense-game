import { defineConfig } from 'vitest/config';
import pkg from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // 같은 와이파이의 휴대폰에서 dev 서버로 바로 열 수 있게
  server: { host: true },
  build: {
    target: 'es2020',
    // Phaser 단일 청크가 1MB를 넘는 건 정상
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
