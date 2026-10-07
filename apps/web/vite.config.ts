import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { contentSecurityPolicy } from './src/csp';
import { deployEnv } from './src/deploy-env';
import { pwaColors, pwaOptions } from './src/pwa/config';
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

export default defineConfig({
  base,
  define: {
    'import.meta.env.VITE_APP_RELEASE': JSON.stringify(release),
    'import.meta.env.VITE_COPYRIGHT': JSON.stringify(copyright),
  },
  plugins: [
    react(),
    noindexForUat,
    strictCsp,
    themeColorMeta,
    VitePWA(pwaOptions(base, env, pwaColors(tokens))),
  ],
});
