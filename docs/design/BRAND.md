# Brand

## Origin

The product brand derives from the DocGerdSoft design system. Inherited
unchanged: the neutral core in light and dark, the delta mark, Geist and
Geist Mono, the 8-pt spacing scale, the radii and the status inks. Exactly one
product accent is added.

The values below were transcribed from the product's design canvas, which is
the source for them. The code reproduces this file; it never depends on the
design export.

## Accent

Violet: `#6A57C4` in the light theme, `#9A8BE8` in the dark theme.

- It is the family member furthest from the red, amber, green and blue a
  cockpit already uses.
- It reads like the magenta pilots know as active guidance.
- The dark value has the same lightness as the system's dark Azure and clears
  WCAG AA on the dark surface.
- Text on a dark-theme accent fill is `#0D0E10`.

## Tokens

Light is `:root`; dark is `[data-theme="dark"]`. A token that does not change
with the theme repeats its value in both columns. Rows marked "derived" are not
drawn on the canvas.

| Token                    | Light                                   | Dark                                    | Use                               |
| ------------------------ | --------------------------------------- | --------------------------------------- | --------------------------------- |
| `--color-bg`             | `#FBFBFC`                               | `#0D0E10`                               | page ground                       |
| `--color-surface`        | `#FFFFFF`                               | `#15171A`                               | header, panes, cards              |
| `--color-surface-subtle` | `#F4F5F7`                               | `#1B1E22`                               | group headers, tracks             |
| `--color-surface-muted`  | `#EEF0F2`                               | `#202428`                               | neutral chips; dark value derived |
| `--color-divider`        | `#E6E9EC`                               | `#202428`                               | rules inside a surface            |
| `--color-border`         | `#DCE0E4`                               | `#2A2E33`                               | outlines of controls and surfaces |
| `--color-text`           | `#14161A`                               | `#ECEEF1`                               | primary text                      |
| `--color-text-secondary` | `#3B4046`                               | `#C2C7CD`                               | secondary text                    |
| `--color-text-muted`     | `#5E646B`                               | `#969CA4`                               | eyebrows, meta                    |
| `--color-accent`         | `#6A57C4`                               | `#9A8BE8`                               | product accent                    |
| `--color-on-accent`      | `#FFFFFF`                               | `#0D0E10`                               | text on accent fill               |
| `--color-success`        | `#2E7D46`                               | `#5FBE7C`                               | status ink, chrome only           |
| `--color-warning`        | `#9A6B1A`                               | `#D6A23E`                               | status ink, chrome only           |
| `--color-danger`         | `#BC4438`                               | `#E0726A`                               | status ink, chrome only           |
| `--font-sans`            | `'Geist', system-ui, sans-serif`        | `'Geist', system-ui, sans-serif`        | UI text                           |
| `--font-mono`            | `'Geist Mono', ui-monospace, monospace` | `'Geist Mono', ui-monospace, monospace` | eyebrows, values, codes           |
| `--text-2xs`             | `11px`                                  | `11px`                                  | header eyebrow                    |
| `--leading-2xs`          | `14px`                                  | `14px`                                  | header eyebrow                    |
| `--text-xs`              | `12px`                                  | `12px`                                  | eyebrow                           |
| `--leading-xs`           | `16px`                                  | `16px`                                  | eyebrow; derived                  |
| `--text-sm`              | `13px`                                  | `13px`                                  | meta, mono values                 |
| `--leading-sm`           | `19px`                                  | `19px`                                  | meta, mono values                 |
| `--text-md`              | `14px`                                  | `14px`                                  | body                              |
| `--leading-md`           | `22px`                                  | `22px`                                  | body                              |
| `--text-lg`              | `16px`                                  | `16px`                                  | prominent body, buttons           |
| `--leading-lg`           | `26px`                                  | `26px`                                  | prominent body, buttons           |
| `--text-xl`              | `20px`                                  | `20px`                                  | section heading                   |
| `--leading-xl`           | `26px`                                  | `26px`                                  | section heading                   |
| `--text-2xl`             | `24px`                                  | `24px`                                  | pane heading                      |
| `--leading-2xl`          | `30px`                                  | `30px`                                  | pane heading                      |
| `--text-3xl`             | `36px`                                  | `36px`                                  | page heading                      |
| `--leading-3xl`          | `40px`                                  | `40px`                                  | page heading                      |
| `--weight-regular`       | `400`                                   | `400`                                   | body weight                       |
| `--weight-medium`        | `500`                                   | `500`                                   | emphasis                          |
| `--weight-semibold`      | `600`                                   | `600`                                   | headings, buttons                 |
| `--tracking-tight`       | `-0.02em`                               | `-0.02em`                               | headings                          |
| `--tracking-eyebrow`     | `0.16em`                                | `0.16em`                                | uppercase mono eyebrows           |
| `--space-1`              | `4px`                                   | `4px`                                   | half step of the 8-pt scale       |
| `--space-2`              | `8px`                                   | `8px`                                   | 8-pt scale                        |
| `--space-3`              | `12px`                                  | `12px`                                  | half step of the 8-pt scale       |
| `--space-4`              | `16px`                                  | `16px`                                  | 8-pt scale                        |
| `--space-5`              | `20px`                                  | `20px`                                  | half step of the 8-pt scale       |
| `--space-6`              | `24px`                                  | `24px`                                  | 8-pt scale                        |
| `--space-8`              | `32px`                                  | `32px`                                  | 8-pt scale                        |
| `--space-10`             | `40px`                                  | `40px`                                  | half step of the 8-pt scale       |
| `--space-12`             | `48px`                                  | `48px`                                  | 8-pt scale                        |
| `--radius-sm`            | `4px`                                   | `4px`                                   | small controls                    |
| `--radius-md`            | `6px`                                   | `6px`                                   | controls                          |
| `--radius-lg`            | `10px`                                  | `10px`                                  | cards, panes                      |
| `--radius-xl`            | `16px`                                  | `16px`                                  | dialogs                           |
| `--radius-pill`          | `100px`                                 | `100px`                                 | chips, pills                      |
| `--size-target`          | `44px`                                  | `44px`                                  | minimum touch target              |

## Delta mark

Two shapes on a 100-unit box, filled with the accent:

- `M50 17.09 L69.87 51.5 L30.13 51.5 Z`
- `M26.96 57 L73.04 57 L88 82.91 L12 82.91 Z`

The name beside the mark is "Procedure Trainer".

## Rules

- The brand styles the chrome only: header, checklist pane, outside-view frame,
  tabs and dialogs. It never styles the cockpit panel.
- Status inks (success, warning, danger) appear only in the chrome, never on
  the panel, where the same colours carry aircraft meaning.
- Panel colours (gauge arcs, lamps, switch caps, artwork) are aircraft content,
  not tokens, and are outside the literal rule.
- The one brand colour allowed over the panel is the accent, as the Guided
  highlight. It is paired with a shape cue (outline and pulse), so it does not
  depend on hue alone.
- Fonts are bundled with the app and never fetched from a font CDN, because the
  app must work offline.

## Legal

- Copyright line, exactly: "© 2026 Patrick Kuhn".
- No company suffix, and no registered-trademark or trademark symbols, anywhere.
- Geist and Geist Mono are under the SIL Open Font License 1.1.
