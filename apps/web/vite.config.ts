import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const noindexForUat: Plugin = {
  name: 'noindex-for-uat',
  transformIndexHtml: () =>
    process.env.VITE_DEPLOY_ENV === 'uat'
      ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }]
      : [],
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), noindexForUat],
});
