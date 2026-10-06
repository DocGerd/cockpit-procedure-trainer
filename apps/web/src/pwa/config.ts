import type { VitePWAOptions } from 'vite-plugin-pwa';
import type { DeployEnv } from '../deploy-env';

export type TokenTheme = 'light' | 'dark';

export type PwaColors = { themeColor: string; backgroundColor: string };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function tokenColor(css: string, name: string, theme: TokenTheme): string {
  const block = css.match(
    new RegExp(`${theme === 'dark' ? "\\[data-theme='dark'\\]" : ':root'}\\s*\\{([^}]*)\\}`),
  );
  const value = block?.[1]?.match(new RegExp(`${escapeRegExp(name)}:\\s*([^;]+);`))?.[1];
  if (!value) throw new Error(`Token ${name} not found in the ${theme} block of tokens.css`);
  return value.trim();
}

export function pwaColors(css: string, theme: TokenTheme = 'light'): PwaColors {
  return {
    themeColor: tokenColor(css, '--color-surface', theme),
    backgroundColor: tokenColor(css, '--color-bg', theme),
  };
}

export const precacheExtensions = ['html', 'js', 'css', 'svg', 'png', 'woff2'];

const icons = [
  { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export function pwaOptions(
  base: string,
  env: DeployEnv,
  colors: PwaColors,
): Partial<VitePWAOptions> {
  return {
    registerType: 'prompt',
    injectRegister: false,
    includeManifestIcons: false,
    base,
    scope: base,
    manifest: {
      id: base,
      name: env === 'uat' ? 'Cockpit Procedure Trainer (UAT)' : 'Cockpit Procedure Trainer',
      short_name: env === 'uat' ? 'Trainer UAT' : 'Trainer',
      lang: 'en',
      start_url: base,
      scope: base,
      display: 'standalone',
      theme_color: colors.themeColor,
      background_color: colors.backgroundColor,
      icons,
    },
    workbox: {
      cacheId: env,
      globPatterns: [`**/*.{${precacheExtensions.join(',')}}`],
      navigateFallback: 'index.html',
      navigateFallbackDenylist: env === 'prod' ? [new RegExp(`^${escapeRegExp(base)}uat/`)] : [],
      cleanupOutdatedCaches: env !== 'prod',
      clientsClaim: true,
      skipWaiting: false,
    },
  };
}
