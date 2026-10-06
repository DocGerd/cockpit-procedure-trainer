# Design handoff

Reference only. The code never imports or reads these files; `../BRAND.md` holds every value the code depends on.

The artboards are exported unchanged from the product's design canvas. Nothing was scrubbed.

| Artboard | Title | Screens (`../brief.md`) |
|---|---|---|
| `Main.dc.html` | Trainer, Guided, light, generic GA panel | S1, S3 Guided, S4, S9 |
| `GuidedDark.dc.html` | Trainer, Guided, dark | S1, S3 Guided, S4, S9, S10 |
| `Practice.dc.html` | Trainer, Practice, emergency, dark | S3 Practice, S4, S10 |
| `PracticeLight.dc.html` | Trainer, Practice, emergency, light | S3 Practice, S4, S10 |
| `Explore.dc.html` | Trainer, Free explore, light | S3 Free explore, S7 as a pane, S9 |
| `ExploreDark.dc.html` | Trainer, Free explore, dark | S3 Free explore, S7 as a pane, S9, S10 |
| `ExplorePopover.dc.html` | Free explore, control details popover | S7 |
| `Picker.dc.html` | Aircraft and procedure picker | S5 |
| `PickerDark.dc.html` | Aircraft and procedure picker, dark | S5, S10 |
| `Summary.dc.html` | Procedure summary | S6 |
| `SummaryDark.dc.html` | Procedure summary, dark | S6, S10 |
| `TabletCollapsed.dc.html` | Tablet, checklist collapsed | S2 |
| `TabletExpanded.dc.html` | Tablet, checklist expanded over the panel | S2 |
| `DeviceScreens.dc.html` | Device screens, powered and powered off | S8 |
| `ErrorBoundary.dc.html` | Error boundary | S11 |
| `MissingPanelImage.dc.html` | Missing panel image, dark | S10, S11 |

`canvas.json` is the canvas index: board titles, sizes and positions.

Opening an artboard makes a Google Fonts request. The artboards do not render standalone: `./support.js`, the editor runtime, is deliberately not committed.

Where an artboard and `../brief.md` disagree on behaviour, the brief wins. The panel controls are stand-ins, not the target look (spec §6.2).
