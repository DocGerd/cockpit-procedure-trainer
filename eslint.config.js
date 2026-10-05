import js from '@eslint/js';
import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const ui = ['react', 'react/*', 'react-dom', 'react-dom/*'];
const assets = ['*.css', '*.svg', '*.png', '*.jpg', '*.webp'];
const content = ['@cpt/aircraft-*', '@cpt/device-*'];
const otherThanCore = ['@cpt/*', '!@cpt/core'];

const workspaceDirs = ['packages', 'apps'].flatMap((root) =>
  readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);

const reachesOtherPackage = (own) =>
  workspaceDirs
    .filter((name) => name !== own)
    .flatMap((name) => [`../**/${name}`, `../**/${name}/**`]);

const restrict = (own, groups) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        ...groups,
        {
          group: reachesOtherPackage(own),
          message: 'Import another package by its name, never by a relative path.',
        },
      ],
    },
  ],
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/design/handoff/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: restrict('core', [
      {
        group: [...ui, ...assets, ...otherThanCore],
        message:
          'core is plain data and pure functions: no UI, assets or other workspace packages.',
      },
    ]),
  },
  ...workspaceDirs
    .filter((name) => name.startsWith('aircraft-'))
    .map((name) => ({
      files: [`packages/${name}/**/*.{ts,tsx}`],
      rules: restrict(name, [
        {
          group: [...ui, ...otherThanCore],
          message: 'An aircraft depends only on @cpt/core and names widgets and devices by id.',
        },
      ]),
    })),
  {
    files: ['packages/panel-kit/**/*.{ts,tsx}'],
    rules: restrict('panel-kit', [
      { group: otherThanCore, message: 'panel-kit depends only on @cpt/core.' },
    ]),
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict('web', [
      { group: content, message: 'Import aircraft and devices only through the registries.' },
    ]),
  },
  {
    files: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict('web', []),
  },
);
