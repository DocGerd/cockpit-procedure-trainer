# Design handoff

Reference only. The code never imports or reads these files; `../BRAND.md` holds every value the code depends on.

The artboards are exported unchanged from the product's design canvas. Nothing was scrubbed.

| Artboard | Title | Screens (`../brief.md`) |
|---|---|---|
| `Main.dc.html` | Trainer, Guided, light, generic GA panel | S1, S3 Guided, S4 |
| `Practice.dc.html` | Trainer, Practice, emergency, dark | S3 Practice, S4, S10 partly |
| `Explore.dc.html` | Trainer, Free explore, light | S3 Free explore, S7 as a pane |
| `Picker.dc.html` | Aircraft and procedure picker | S5 |
| `Summary.dc.html` | Procedure summary | S6 |

`canvas.json` is the canvas index: board titles, sizes and positions.

The screens the canvas does not draw are specified in `../brief.md`. The panel controls are stand-ins, not the target look (spec §6.2).
