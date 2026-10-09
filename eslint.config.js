import js from '@eslint/js';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import tseslint from 'typescript-eslint';

const ui = ['react', 'react/*', 'react-dom', 'react-dom/*'];
const assets = [
  '*.css',
  '*.svg',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.webp',
  '*.avif',
  '*.mp3',
  '*.wav',
  '*.ogg',
];
const assetQuery = '\\?(raw|url)([&#]|$)';
const content = ['@cpt/aircraft-*', '@cpt/device-*'];
const otherThanCore = ['@cpt/*', '!@cpt/core'];
const otherThanCoreAndPanelKit = ['@cpt/*', '!@cpt/core', '!@cpt/panel-kit'];

const workspaceDirs = ['packages', 'apps'].flatMap((root) =>
  readdirSync(resolve(import.meta.dirname, root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name),
);

// The one list of package kinds: every per-kind block and the catch-all derive from it.
const packageKinds = {
  core: 'packages/core',
  panelKit: 'packages/panel-kit',
  aircraft: 'packages/aircraft-*',
  device: 'packages/device-*',
};
const dirPrefix = (kind) => packageKinds[kind].slice('packages/'.length, -1);
const isDevice = (name) => name.startsWith(dirPrefix('device'));
const aircraftDirs = workspaceDirs.filter((name) => name.startsWith(dirPrefix('aircraft')));

// A device has no package name to exclude, so every device directory is reached by wildcard.
const reachableDirs = (own) =>
  own === null
    ? workspaceDirs.filter((name) => !isDevice(name))
    : workspaceDirs.filter((name) => name !== own);

const reachesOtherPackage = (own) => [
  ...reachableDirs(own).flatMap((name) => [`../**/${name}`, `../**/${name}/**`]),
  ...(own === null ? ['../**/device-*', '../**/device-*/**'] : []),
];

// esquery regex literals cannot contain a slash, so match it by code point.
const slash = '\\x2f';
const dynamicSource = (pattern) => `ImportExpression[source.value=/${pattern}/]`;

const dynamicReach = (own) =>
  dynamicSource(
    `^\\.\\.${slash}(.*${slash})?(${[...reachableDirs(own), ...(own === null ? [`device-[^${slash}]+`] : [])].join('|')})(${slash}|$)`,
  );
const dynamicOtherThanCore = dynamicSource(`^@cpt${slash}(?!core$)`);
const dynamicOtherThanCoreAndPanelKit = dynamicSource(`^@cpt${slash}(?!(core|panel-kit)$)`);
const dynamicUi = dynamicSource(`^(react|react-dom)(${slash}|$)`);
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

const typeSpacingMessage = 'Type and spacing come only from apps/web/src/styles/tokens.css.';
const cssLength = '\\d(px|rem|em)\\b';

const fontNames = [
  'Geist',
  'Geist Mono',
  'Inter',
  'Arial',
  'Helvetica',
  'Helvetica Neue',
  'Verdana',
  'Tahoma',
  'Georgia',
  'Times',
  'Times New Roman',
  'Courier',
  'Courier New',
  'Roboto',
  'Open Sans',
  'Segoe UI',
  'SF Pro',
  'Menlo',
  'Monaco',
  'Consolas',
  'JetBrains Mono',
  'Fira Code',
  'Fira Sans',
  'Source Sans Pro',
  'Source Code Pro',
  'Noto Sans',
  'Ubuntu',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
].join('|');
const fontFamilyName = `(^|,)\\s*['"]?(${fontNames})['"]?\\s*(,|$)`;
const fontFamilyToken = '^(var\\(--font-|inherit$)';
const nonZeroNumber = '^[0-9.]*[1-9]';
const nonZeroNumeral = '^[0-9.]*[1-9][0-9.]*$';
const spacingKey =
  '^(fontSize|lineHeight|letterSpacing|gap|rowGap|columnGap|(margin|padding|inset)([A-Z][A-Za-z]*)?)$';
const notFontToken = (path) =>
  `:not([${path}=/${fontFamilyToken}/]):not([${path}=/${fontFamilyName}/i])`;

const styleObject = [
  'JSXAttribute[name.name="style"] ObjectExpression',
  ...['TSSatisfiesExpression', 'TSAsExpression'].map(
    (type) => `${type}[typeAnnotation.typeName.name="CSSProperties"] > ObjectExpression`,
  ),
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.name="CSSProperties"] > ObjectExpression',
  'VariableDeclarator[id.typeAnnotation.typeAnnotation.typeName.right.name="CSSProperties"] > ObjectExpression',
];
const inStyleObject = (property) =>
  styleObject.map((object) => `${object} > ${property}[key.name=/${spacingKey}/]`);
const styleSpacing = [
  ...inStyleObject('Property').map((selector) => `${selector}[value.raw=/${nonZeroNumber}/]`),
  ...inStyleObject('Property').map(
    (selector) => `${selector} > Literal[value=/${nonZeroNumeral}/]`,
  ),
  ...inStyleObject('Property').map(
    (selector) => `${selector} > UnaryExpression > Literal[raw=/${nonZeroNumber}/]`,
  ),
];

const typeSpacingSelectors = [
  `Literal[value=/${cssLength}/]`,
  `TemplateElement[value.raw=/${cssLength}/]`,
  'TemplateLiteral > TemplateElement:not(:first-child)[value.raw=/^(px|rem|em)\\b/]',
  `Literal[value=/${fontFamilyName}/i]`,
  `Property[key.name="fontFamily"] > Literal${notFontToken('value')}`,
  ...styleSpacing,
  `JSXAttribute[name.name="fontFamily"] > Literal${notFontToken('value')}`,
].map((selector) => ({ selector, message: typeSpacingMessage }));

const literalSelectors = [...colourLiterals, ...typeSpacingSelectors];

const e2eRelativePackageImport = {
  regex: '^\\.{1,2}/(?:.*/)?packages/',
  message: 'Import another package by its name, never by a relative path.',
};
const e2eDynamicPackageImport = {
  selector: dynamicSource(`^\\.{1,2}${slash}(.*${slash})?packages${slash}`),
  message: 'Import another package by its name, never by a relative path.',
};
const e2eFiles = 'apps/web/e2e/**/*.{ts,mts,cts}';
const e2eSpecFiles = 'apps/web/e2e/**/*.spec.{ts,mts,cts}';

const deviceGroups = [
  {
    group: otherThanCoreAndPanelKit,
    message: 'A device depends only on @cpt/core and @cpt/panel-kit.',
  },
];
const deviceSelectors = [
  {
    selector: dynamicOtherThanCoreAndPanelKit,
    message: 'A device depends only on @cpt/core and @cpt/panel-kit.',
  },
];

const panelKitGroups = [{ group: otherThanCore, message: 'panel-kit depends only on @cpt/core.' }];
const panelKitSelectors = [
  { selector: dynamicOtherThanCore, message: 'panel-kit depends only on @cpt/core.' },
];

const webGroups = [
  { group: content, message: 'Import aircraft and devices only through the registries.' },
];
const webSelectors = [
  {
    selector: dynamicContent,
    message: 'Import aircraft and devices only through the registries.',
  },
  {
    selector: globContent,
    message: 'Import aircraft and devices only through the registries.',
  },
];

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
    files: ['packages/*/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    ignores: Object.values(packageKinds).map((dir) => `${dir}/**`),
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            'This package matches no known kind. Add the kind to packageKinds with its boundary rules in eslint.config.js.',
        },
      ],
    },
  },
  {
    files: [`${packageKinds.core}/**/*.{ts,tsx,mts,cts}`],
    rules: restrict(
      'core',
      [
        {
          group: [...ui, ...assets, ...otherThanCore],
          message:
            'core is plain data and pure functions: no UI, assets or other workspace packages.',
        },
        {
          regex: assetQuery,
          message: 'core is plain data and pure functions: no assets.',
        },
      ],
      [{ selector: dynamicOtherThanCore, message: 'core imports no other workspace package.' }],
    ),
  },
  ...aircraftDirs.map((name) => ({
    files: [`packages/${name}/**/*.{ts,tsx,mts,cts}`],
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
    files: [`${packageKinds.device}/**/*.{ts,tsx,mts,cts}`],
    rules: restrict(null, deviceGroups, deviceSelectors),
  },
  {
    files: [`${packageKinds.device}/src/screen/**/*.{ts,tsx,mts,cts}`],
    rules: restrict(null, deviceGroups, [...deviceSelectors, ...literalSelectors]),
  },
  {
    files: [`${packageKinds.device}/src/logic/**/*.{ts,tsx,mts,cts}`],
    rules: restrict(
      null,
      [
        {
          group: [...ui, ...assets, ...otherThanCore],
          message:
            'Device logic is plain data and pure functions: only @cpt/core, no UI or assets.',
        },
        {
          regex: assetQuery,
          message: 'Device logic is plain data and pure functions: no assets.',
        },
      ],
      [
        { selector: dynamicOtherThanCore, message: 'Device logic imports only @cpt/core.' },
        { selector: dynamicUi, message: 'Device logic imports no UI.' },
      ],
    ),
  },
  {
    files: [`${packageKinds.panelKit}/**/*.{ts,tsx,mts,cts}`],
    rules: restrict('panel-kit', panelKitGroups, [...panelKitSelectors, ...literalSelectors]),
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx,mts,cts}'],
    ignores: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict('web', webGroups, [...webSelectors, ...literalSelectors]),
  },
  {
    files: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict('web', [], literalSelectors),
  },
  {
    files: [e2eFiles],
    rules: {
      'no-restricted-imports': ['error', { patterns: [e2eRelativePackageImport] }],
      'no-restricted-syntax': ['error', e2eDynamicPackageImport],
    },
  },
  {
    files: [e2eSpecFiles],
    rules: {
      'no-restricted-syntax': [
        'error',
        e2eDynamicPackageImport,
        {
          selector: dynamicSource(`^@playwright${slash}test$`),
          message: 'Import test and expect from ./fixtures so the spec fails on a CSP violation.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              allowTypeImports: true,
              message:
                'Import test and expect from ./fixtures so the spec fails on a CSP violation.',
            },
          ],
          patterns: [e2eRelativePackageImport],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.test.{ts,tsx,mts,cts}'],
    rules: restrict('web', webGroups, [...webSelectors, ...colourLiterals]),
  },
  {
    files: [`${packageKinds.panelKit}/**/*.test.{ts,tsx,mts,cts}`],
    rules: restrict('panel-kit', panelKitGroups, [...panelKitSelectors, ...colourLiterals]),
  },
  {
    files: [`${packageKinds.device}/src/screen/**/*.test.{ts,tsx,mts,cts}`],
    rules: restrict(null, deviceGroups, [...deviceSelectors, ...colourLiterals]),
  },
);
