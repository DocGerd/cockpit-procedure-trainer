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

const systemColours = [
  'Canvas',
  'CanvasText',
  'LinkText',
  'VisitedText',
  'ActiveText',
  'ButtonFace',
  'ButtonText',
  'ButtonBorder',
  'Field',
  'FieldText',
  'Highlight',
  'HighlightText',
  'SelectedItem',
  'SelectedItemText',
  'Mark',
  'MarkText',
  'GrayText',
  'AccentColor',
  'AccentColorText',
];

const systemColour = new RegExp(`(?<![\\w-])(${systemColours.join('|')})(?![\\w-])`, 'i');

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
      font: ['inherit'],
      'font-family': ['/^var\\(--font-/', 'inherit'],
      'font-weight': ['/^var\\(--weight-/', 'inherit', 'normal'],
    },
    'declaration-property-value-disallowed-list': {
      '/(color|^background|^border|^outline|^fill|^stroke|shadow|^text-decoration|^column-rule)/': [
        systemColour,
      ],
    },
    'declaration-property-unit-disallowed-list': Object.fromEntries(
      spacing.map((property) => [property, ['px', 'rem', 'em']]),
    ),
  },
};
