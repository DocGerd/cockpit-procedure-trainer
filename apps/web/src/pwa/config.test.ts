import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pwaColors, pwaOptions, tokenColor } from './config';

const tokens = readFileSync(resolve(import.meta.dirname, '../styles/tokens.css'), 'utf8');

describe('tokenColor', () => {
  const css = ":root { --color-bg: ivory; }\n[data-theme='dark'] { --color-bg: charcoal; }";

  it('reads the light value from :root and the dark value from the dark block', () => {
    expect(tokenColor(css, '--color-bg', 'light')).toBe('ivory');
    expect(tokenColor(css, '--color-bg', 'dark')).toBe('charcoal');
  });

  it('fails loudly for a missing token', () => {
    expect(() => tokenColor(css, '--color-missing', 'light')).toThrow('--color-missing');
  });

  it('finds the tokens the manifest needs in the real token file', () => {
    expect(pwaColors(tokens).backgroundColor).not.toBe('');
    expect(pwaColors(tokens, 'dark').themeColor).not.toBe(pwaColors(tokens).themeColor);
  });
});

describe('pwaOptions', () => {
  const colors = { themeColor: 'teal', backgroundColor: 'coral' };
  const prod = pwaOptions('/app/', 'prod', colors);
  const uat = pwaOptions('/app/uat/', 'uat', colors);

  it('asks before switching version', () => {
    expect(prod.registerType).toBe('prompt');
    expect(prod.workbox?.skipWaiting).toBe(false);
  });

  it('scopes each environment to its own base path', () => {
    expect(prod.scope).toBe('/app/');
    expect(prod.manifest).toMatchObject({ scope: '/app/', start_url: '/app/', id: '/app/' });
    expect(uat.scope).toBe('/app/uat/');
    expect(uat.manifest).toMatchObject({ scope: '/app/uat/', start_url: '/app/uat/' });
  });

  it('gives each environment its own cache id', () => {
    expect(prod.workbox?.cacheId).toBe('prod');
    expect(uat.workbox?.cacheId).toBe('uat');
  });

  it('keeps the production worker away from UAT page loads only', () => {
    const [deny] = prod.workbox?.navigateFallbackDenylist ?? [];
    expect(deny?.test('/app/uat/')).toBe(true);
    expect(deny?.test('/app/uat/index.html')).toBe(true);
    expect(deny?.test('/app/')).toBe(false);
    expect(deny?.test('/app/index.html')).toBe(false);
    expect(uat.workbox?.navigateFallbackDenylist).toEqual([]);
  });

  it('takes the manifest colours from the given tokens', () => {
    expect(prod.manifest).toMatchObject({ theme_color: 'teal', background_color: 'coral' });
  });
});
