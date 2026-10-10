import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { contentSecurityPolicy } from './src/csp';
import { deployEnv } from './src/deploy-env';
import { pwaColors, pwaOptions } from './src/pwa/config';
import { latinFontFaces } from './src/styles/font-subsets';
import { copyrightNotice, latestRelease } from './src/version';

const base = process.env.BASE_PATH ?? '/';
const env = deployEnv(process.env.VITE_DEPLOY_ENV);
const repoFile = (name: string) =>
  readFileSync(resolve(import.meta.dirname, '../..', name), 'utf8');
const release = latestRelease(repoFile('CHANGELOG.md'));
const copyright = copyrightNotice(repoFile('LICENSE'));
if (release === undefined) throw new Error('CHANGELOG.md has no released version heading');
if (copyright === undefined) throw new Error('LICENSE has no copyright line');
const tokens = readFileSync(resolve(import.meta.dirname, 'src/styles/tokens.css'), 'utf8');

const noindexForUat: Plugin = {
  name: 'noindex-for-uat',
  transformIndexHtml: () =>
    env === 'uat'
      ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }]
      : [],
};

const charsetMeta = '<meta charset="utf-8" />';

// The policy only covers what follows it, and the charset must stay in the first bytes of the file.
const strictCsp: Plugin = {
  name: 'strict-csp',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => {
      if (!html.includes(charsetMeta)) throw new Error('index.html has no charset meta to follow');
      const policy = contentSecurityPolicy().replaceAll('"', '&quot;');
      return html.replace(
        charsetMeta,
        `${charsetMeta}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  },
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
        'data-scheme': theme,
      },
      injectTo: 'head',
    })),
};

const latinFontsOnly: Plugin = {
  name: 'latin-fonts-only',
  enforce: 'pre',
  transform: (code, id) =>
    /[\\/]@fontsource[\\/][\w-]+[\\/]\d+\.css$/.test(id) ? latinFontFaces(code) : undefined,
};

const preloadedFonts = ['geist-latin-400-normal', 'geist-latin-600-normal'];

const fontPreload: Plugin = {
  name: 'font-preload',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, { bundle }) =>
      preloadedFonts.map((name) => {
        const file = Object.keys(bundle ?? {}).find((key) =>
          new RegExp(`/${name}-[\\w-]+\\.woff2$`).test(key),
        );
        if (!file) throw new Error(`The build emitted no ${name}.woff2 to preload`);
        return {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            href: `${base}${file}`,
            crossorigin: '',
          },
          injectTo: 'head',
        };
      }),
  },
};

export default defineConfig({
  base,
  define: {
    'import.meta.env.VITE_APP_RELEASE': JSON.stringify(release),
    'import.meta.env.VITE_COPYRIGHT': JSON.stringify(copyright),
  },
  build: {
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  plugins: [
    react(),
    latinFontsOnly,
    noindexForUat,
    strictCsp,
    themeColorMeta,
    fontPreload,
    VitePWA(pwaOptions(base, env, pwaColors(tokens))),
  ],
});
