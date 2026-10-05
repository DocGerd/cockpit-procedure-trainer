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

// esquery regex literals cannot contain a slash, so match it by code point.
const slash = '\\x2f';
const dynamicSource = (pattern) => `ImportExpression[source.value=/${pattern}/]`;

const dynamicReach = (own) =>
  dynamicSource(
    `^\\.\\.${slash}(.*${slash})?(${workspaceDirs.filter((name) => name !== own).join('|')})(${slash}|$)`,
  );
const dynamicOtherThanCore = dynamicSource(`^@cpt${slash}(?!core$)`);
const dynamicContent = dynamicSource(`^@cpt${slash}(aircraft|device)-`);
const globContent =
  'CallExpression[callee.object.type="MetaProperty"][callee.property.name="glob"]:has(Literal[value=/(aircraft|device)-/])';

const hexColour = '#[0-9a-fA-F]{3,8}\\b';
const colourFunction = '\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(';
const colourMessage = 'Colours come only from apps/web/src/styles/tokens.css.';
const colourLiterals = [hexColour, colourFunction].flatMap((pattern) => [
  { selector: `Literal[value=/${pattern}/]`, message: colourMessage },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message: colourMessage },
]);

const restrict = (own, groups, selectors = []) => ({
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
  'no-restricted-syntax': [
    'error',
    {
      selector: dynamicReach(own),
      message: 'Import another package by its name, never by a relative path.',
    },
    ...selectors,
  ],
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/design/handoff/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: restrict(
      'core',
      [
        {
          group: [...ui, ...assets, ...otherThanCore],
          message:
            'core is plain data and pure functions: no UI, assets or other workspace packages.',
        },
      ],
      [{ selector: dynamicOtherThanCore, message: 'core imports no other workspace package.' }],
    ),
  },
  ...workspaceDirs
    .filter((name) => name.startsWith('aircraft-'))
    .map((name) => ({
      files: [`packages/${name}/**/*.{ts,tsx}`],
      rules: restrict(
        name,
        [
          {
            group: [...ui, ...otherThanCore],
            message: 'An aircraft depends only on @cpt/core and names widgets and devices by id.',
          },
        ],
        [{ selector: dynamicOtherThanCore, message: 'An aircraft depends only on @cpt/core.' }],
      ),
    })),
  {
    files: ['packages/panel-kit/**/*.{ts,tsx}'],
    rules: restrict(
      'panel-kit',
      [{ group: otherThanCore, message: 'panel-kit depends only on @cpt/core.' }],
      [{ selector: dynamicOtherThanCore, message: 'panel-kit depends only on @cpt/core.' }],
    ),
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict(
      'web',
      [{ group: content, message: 'Import aircraft and devices only through the registries.' }],
      [
        {
          selector: dynamicContent,
          message: 'Import aircraft and devices only through the registries.',
        },
        {
          selector: globContent,
          message: 'Import aircraft and devices only through the registries.',
        },
        ...colourLiterals,
      ],
    ),
  },
  {
    files: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict('web', [], colourLiterals),
  },
);
