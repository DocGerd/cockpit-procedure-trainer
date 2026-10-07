# Brand

## Origin

The product brand derives from the DocGerdSoft design system. Inherited
unchanged: the neutral core in light and dark, the delta mark, Geist and
Geist Mono, the 8-pt spacing scale, the radii and the status inks. Exactly one
product accent is added.

The values below were transcribed from the product's design canvas and checked
against the DocGerdSoft brand bundle, whose stylesheet is the token source of
truth for every inherited value. The code reproduces this file; it never
depends on the design export or the bundle.

Where the bundle and this file name a token differently, the value is what
matches:

- Neutrals: `--color-bg` is the bundle's paper, `--color-surface-subtle` its
  mist-2, `--color-surface-muted` its mist, `--color-divider` its hairline-2,
  `--color-border` its hairline, `--color-text` its ink, `--color-text-secondary`
  its graphite-strong and `--color-text-muted` its graphite.
- Type: `--text-sm` and `--text-md` are the bundle's caption and small steps,
  `--text-lg` its body, `--text-xl`, `--text-2xl` and `--text-3xl` its H4, H3
  and H2.
- Radii: `--radius-sm` is the bundle's extra-small radius; `--radius-md`,
  `--radius-lg` and `--radius-xl` are its small, medium and large radii.
- Spacing: `--space-N` is N times 4px. The bundle's s1 to s7 (4, 8, 12, 16, 24,
  32 and 48px) are `--space-1`, `-2`, `-3`, `-4`, `-6`, `-8` and `-12`. The
  bundle's s5 (24px) is not `--space-5` (20px).
- Eyebrow tracking: the bundle README gives the kicker 0.16em, while its
  stylesheet `.kicker` rule uses 0.18em. `--tracking-eyebrow` keeps 0.16em,
  where the README, the stylesheet's `.sublabel` rule and the canvas agree.

Product tokens the bundle does not define: the Violet accent in the dark theme,
`--color-on-accent`, `--text-xs` and `--leading-xs`, `--leading-2xs`,
`--tracking-eyebrow`, `--space-5`, `--space-10` and `--size-target`. The bundle
tokens the product does not use (display and H1 sizes, the 64px and larger
spacing steps, shadows, layout widths) are not reproduced.

## Accent

Violet: `#6A57C4` in the light theme, `#9A8BE8` in the dark theme.

- It is the family member furthest from the red, amber, green and blue a
  cockpit already uses.
- It reads like the magenta pilots know as active guidance.
- The dark value clears WCAG AA on the dark surface.
- Text on a dark-theme accent fill is `#0D0E10`.

## Tokens

Light is `:root`; dark is `[data-theme="dark"]`. A token that does not change
with the theme repeats its value in both columns. Rows marked "derived" are not
drawn on the canvas.

| Token                    | Light                                                                         | Dark                                                                          | Use                               |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------- |
| `--color-bg`             | `#FBFBFC`                                                                     | `#0D0E10`                                                                     | page ground                       |
| `--color-surface`        | `#FFFFFF`                                                                     | `#15171A`                                                                     | header, panes, cards              |
| `--color-surface-subtle` | `#F4F5F7`                                                                     | `#141619`                                                                     | group headers, tracks             |
| `--color-surface-muted`  | `#EEF0F2`                                                                     | `#1B1E22`                                                                     | neutral chips                     |
| `--color-divider`        | `#E6E9EC`                                                                     | `#202428`                                                                     | rules inside a surface            |
| `--color-border`         | `#DCE0E4`                                                                     | `#2A2E33`                                                                     | outlines of controls and surfaces |
| `--color-text`           | `#14161A`                                                                     | `#ECEEF1`                                                                     | primary text                      |
| `--color-text-secondary` | `#3B4046`                                                                     | `#C2C7CD`                                                                     | secondary text                    |
| `--color-text-muted`     | `#5E646B`                                                                     | `#969CA4`                                                                     | eyebrows, meta                    |
| `--color-accent`         | `#6A57C4`                                                                     | `#9A8BE8`                                                                     | product accent                    |
| `--color-on-accent`      | `#FFFFFF`                                                                     | `#0D0E10`                                                                     | text on accent fill               |
| `--color-success`        | `#2E7D46`                                                                     | `#5FBE7C`                                                                     | status ink, chrome only           |
| `--color-warning`        | `#9A6B1A`                                                                     | `#D6A23E`                                                                     | status ink, chrome only           |
| `--color-danger`         | `#BC4438`                                                                     | `#E0726A`                                                                     | status ink, chrome only           |
| `--font-sans`            | `'Geist', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif` | `'Geist', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif` | UI text                           |
| `--font-mono`            | `'Geist Mono', ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace`   | `'Geist Mono', ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace`   | eyebrows, values, codes           |
| `--text-2xs`             | `11px`                                                                        | `11px`                                                                        | header eyebrow                    |
| `--leading-2xs`          | `14px`                                                                        | `14px`                                                                        | header eyebrow                    |
| `--text-xs`              | `12px`                                                                        | `12px`                                                                        | eyebrow                           |
| `--leading-xs`           | `16px`                                                                        | `16px`                                                                        | eyebrow; derived                  |
| `--text-sm`              | `13px`                                                                        | `13px`                                                                        | meta, mono values                 |
| `--leading-sm`           | `19px`                                                                        | `19px`                                                                        | meta, mono values                 |
| `--text-md`              | `14px`                                                                        | `14px`                                                                        | body                              |
| `--leading-md`           | `22px`                                                                        | `22px`                                                                        | body                              |
| `--text-lg`              | `16px`                                                                        | `16px`                                                                        | prominent body, buttons           |
| `--leading-lg`           | `26px`                                                                        | `26px`                                                                        | prominent body, buttons           |
| `--text-xl`              | `20px`                                                                        | `20px`                                                                        | section heading                   |
| `--leading-xl`           | `26px`                                                                        | `26px`                                                                        | section heading                   |
| `--text-2xl`             | `24px`                                                                        | `24px`                                                                        | pane heading                      |
| `--leading-2xl`          | `30px`                                                                        | `30px`                                                                        | pane heading                      |
| `--text-3xl`             | `36px`                                                                        | `36px`                                                                        | page heading                      |
| `--leading-3xl`          | `40px`                                                                        | `40px`                                                                        | page heading                      |
| `--weight-regular`       | `400`                                                                         | `400`                                                                         | body weight                       |
| `--weight-medium`        | `500`                                                                         | `500`                                                                         | emphasis                          |
| `--weight-semibold`      | `600`                                                                         | `600`                                                                         | headings, buttons                 |
| `--tracking-tight`       | `-0.02em`                                                                     | `-0.02em`                                                                     | headings                          |
| `--tracking-eyebrow`     | `0.16em`                                                                      | `0.16em`                                                                      | uppercase mono eyebrows           |
| `--space-1`              | `4px`                                                                         | `4px`                                                                         | half step of the 8-pt scale       |
| `--space-2`              | `8px`                                                                         | `8px`                                                                         | 8-pt scale                        |
| `--space-3`              | `12px`                                                                        | `12px`                                                                        | half step of the 8-pt scale       |
| `--space-4`              | `16px`                                                                        | `16px`                                                                        | 8-pt scale                        |
| `--space-5`              | `20px`                                                                        | `20px`                                                                        | half step of the 8-pt scale       |
| `--space-6`              | `24px`                                                                        | `24px`                                                                        | 8-pt scale                        |
| `--space-8`              | `32px`                                                                        | `32px`                                                                        | 8-pt scale                        |
| `--space-10`             | `40px`                                                                        | `40px`                                                                        | half step of the 8-pt scale       |
| `--space-12`             | `48px`                                                                        | `48px`                                                                        | 8-pt scale                        |
| `--radius-sm`            | `3px`                                                                         | `3px`                                                                         | small controls                    |
| `--radius-md`            | `6px`                                                                         | `6px`                                                                         | controls                          |
| `--radius-lg`            | `10px`                                                                        | `10px`                                                                        | cards, panes                      |
| `--radius-xl`            | `16px`                                                                        | `16px`                                                                        | dialogs                           |
| `--radius-pill`          | `100px`                                                                       | `100px`                                                                       | chips, pills                      |
| `--size-target`          | `44px`                                                                        | `44px`                                                                        | minimum touch target              |

## Panel hardware

The colours of the generic panel widgets: hardware, not brand. They do not
change with the theme, so both columns repeat the value. The neutrals come from
the generic GA panel on the design canvas; the lit lamp colours are not drawn
there. Aircraft artwork brings its own colours and does not use these.

| Token                     | Light     | Dark      | Use                                 |
| ------------------------- | --------- | --------- | ----------------------------------- |
| `--panel-surface`         | `#26282C` | `#26282C` | panel ground                        |
| `--panel-frame`           | `#3B4046` | `#3B4046` | panel frame, group rules            |
| `--panel-face`            | `#0B0C0E` | `#0B0C0E` | instrument case, switch body, label |
| `--panel-dial`            | `#121316` | `#121316` | gauge dial                          |
| `--panel-bezel`           | `#34383E` | `#34383E` | bezel ring, outlines                |
| `--panel-bezel-dark`      | `#1C1E22` | `#1C1E22` | inner ring, needle hub              |
| `--panel-cap`             | `#8C9199` | `#8C9199` | switch cap, knob                    |
| `--panel-cap-light`       | `#C2C7CD` | `#C2C7CD` | raised face of a cap                |
| `--panel-legend`          | `#ECEEF1` | `#ECEEF1` | legends, ticks                      |
| `--panel-legend-muted`    | `#969CA4` | `#969CA4` | units, secondary legends            |
| `--panel-needle`          | `#FFFFFF` | `#FFFFFF` | needle                              |
| `--panel-screen`          | `#050607` | `#050607` | display glass, unpowered screen     |
| `--panel-lamp-off`        | `#1B1E22` | `#1B1E22` | unlit annunciator                   |
| `--panel-lamp-amber`      | `#F0A830` | `#F0A830` | lit amber annunciator               |
| `--panel-lamp-red`        | `#E5483C` | `#E5483C` | lit red annunciator                 |
| `--panel-lamp-green`      | `#3FBF5F` | `#3FBF5F` | lit green annunciator               |
| `--panel-lamp-blue`       | `#4A90E2` | `#4A90E2` | lit blue annunciator                |
| `--panel-lamp-white`      | `#F4F5F7` | `#F4F5F7` | lit white annunciator               |
| `--panel-arc-green`       | `#3FA35B` | `#3FA35B` | gauge arc, normal range             |
| `--panel-arc-yellow`      | `#E0B43A` | `#E0B43A` | gauge arc, caution range            |
| `--panel-arc-red`         | `#D8483C` | `#D8483C` | gauge arc, limit                    |
| `--panel-arc-white`       | `#ECEEF1` | `#ECEEF1` | gauge arc, flap range               |
| `--panel-focus`           | `#FFFFFF` | `#FFFFFF` | keyboard focus ring on the panel    |
| `--panel-metal-light`     | `#6B717A` | `#6B717A` | lit side of a metal bezel or cap    |
| `--panel-metal-shade`     | `#0B0C0E` | `#0B0C0E` | shaded side of a metal bezel or cap |
| `--panel-shadow`          | `#000000` | `#000000` | cast and recess shadows, by opacity |
| `--panel-glare`           | `#FFFFFF` | `#FFFFFF` | glass glare, by opacity             |
| `--panel-plastic`         | `#2E3136` | `#2E3136` | moulded switch plastic              |
| `--panel-plastic-light`   | `#5E646C` | `#5E646C` | lit edge of moulded plastic         |
| `--panel-plastic-shade`   | `#08090A` | `#08090A` | shaded edge of moulded plastic      |
| `--panel-screw`           | `#4A4F56` | `#4A4F56` | black-oxide screw head              |
| `--panel-screw-light`     | `#A4AAB2` | `#A4AAB2` | lit side of a screw head            |
| `--panel-screw-shade`     | `#1A1C1F` | `#1A1C1F` | shaded side of a screw head         |
| `--panel-lamp-glow-amber` | `#FFE3A8` | `#FFE3A8` | hot core of a lit amber lamp        |
| `--panel-lamp-glow-red`   | `#FFC2B8` | `#FFC2B8` | hot core of a lit red lamp          |
| `--panel-lamp-glow-green` | `#C4F5CF` | `#C4F5CF` | hot core of a lit green lamp        |
| `--panel-lamp-glow-blue`  | `#CFE3FF` | `#CFE3FF` | hot core of a lit blue lamp         |
| `--panel-lamp-glow-white` | `#FFFFFF` | `#FFFFFF` | hot core of a lit white lamp        |

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
- Status inks used as text (success, warning, danger) sit
  only on `--color-bg` or `--color-surface`.
- The generic panel widgets take their colours (gauge arcs, lamps, switch caps)
  only from the panel hardware tokens. Aircraft artwork is aircraft content and
  outside the literal rule.
- The one brand colour allowed over the panel is the accent, in two places: the
  Guided highlight (outline and pulse) and the selected control in Free explore
  (outline). Each is paired with a shape cue, so it does not depend on hue alone.
- Fonts are bundled with the app and never fetched from a font CDN, because the
  app must work offline.

## Legal

- Copyright line, exactly: "© 2026 Patrick Kuhn".
- No company suffix, and no registered-trademark or trademark symbols, anywhere.
- Geist and Geist Mono are under the SIL Open Font License 1.1.
