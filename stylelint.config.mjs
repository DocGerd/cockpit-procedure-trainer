const spacing = [
  '/^margin/',
  '/^padding/',
  '/^inset/',
  'gap',
  'row-gap',
  'column-gap',
  'font-size',
  'line-height',
  'letter-spacing',
];

export default {
  ignoreFiles: ['apps/web/src/styles/tokens.css', 'docs/**', '**/dist/**', '**/node_modules/**'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
    ],
    'declaration-property-value-allowed-list': {
      'font-family': ['/^var\\(--font-/', 'inherit'],
    },
    'declaration-property-unit-disallowed-list': Object.fromEntries(
      spacing.map((property) => [property, ['px', 'rem', 'em']]),
    ),
  },
};
