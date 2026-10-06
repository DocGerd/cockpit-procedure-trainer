import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { deployEnv } from './src/deploy-env';
import { pwaColors, pwaOptions } from './src/pwa/config';

const base = process.env.BASE_PATH ?? '/';
const env = deployEnv(process.env.VITE_DEPLOY_ENV);
const tokens = readFileSync(resolve(import.meta.dirname, 'src/styles/tokens.css'), 'utf8');

// The plugin's register module imports workbox-window, which only the plugin's own install can see.
const workboxWindow = resolve(
  dirname(
    createRequire(createRequire(import.meta.url).resolve('vite-plugin-pwa')).resolve(
      'workbox-window',
    ),
  ),
  '..',
);

const noindexForUat: Plugin = {
  name: 'noindex-for-uat',
  transformIndexHtml: () =>
    env === 'uat'
      ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }]
      : [],
};

const themeColorMeta: Plugin = {
  name: 'theme-color-from-tokens',
  transformIndexHtml: () =>
    (['light', 'dark'] as const).map((theme) => ({
      tag: 'meta',
      attrs: {
        name: 'theme-color',
        content: pwaColors(tokens, theme).themeColor,
        media: `(prefers-color-scheme: ${theme})`,
      },
      injectTo: 'head',
    })),
};

export default defineConfig({
  base,
  resolve: { alias: { 'workbox-window': workboxWindow } },
  plugins: [
    react(),
    noindexForUat,
    themeColorMeta,
    VitePWA(pwaOptions(base, env, pwaColors(tokens))),
  ],
});
