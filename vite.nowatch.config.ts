// 밸런스 측정 전용 (2026-11-24): 파일을 고쳐도 열린 창을 다시 불러오지 않게(HMR·감시 끔) — 측정 중에 다른 일을 해도 런이 처음부터 다시 돌지 않도록.
// npx vite --config vite.nowatch.config.ts --port 5181 --strictPort
import base from './vite.config';
import type { ConfigEnv, UserConfig } from 'vite';

export default (env: ConfigEnv): UserConfig => {
  const c = (typeof base === 'function' ? base(env) : base) as UserConfig;
  return { ...c, server: { ...(c.server ?? {}), hmr: false, watch: { ignored: ['**/*'] } } };
};
