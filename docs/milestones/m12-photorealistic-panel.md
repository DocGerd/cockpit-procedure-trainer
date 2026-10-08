# M12 Photorealistic panel - verification draft

Draft by the verification task (#396) for the release summary; the release agent folds it into the four sections of `milestone-release`. On GitHub M12 is milestone 13. The open release PR #422 is to carry M11 and M12 together as v0.12.0; the release agent settles the version and which M12 PRs it lists.

## What shipped (M12 PRs after the spike, #401 and #402)

- **CTSL view backgrounds as painted panel metal** (#403, for #393): fine stipple, plate seams, panel screws, cutout shadows around every instrument and device seat.
- **CTSL controls as photoreal hardware** (#417, for #392): breakers, rockers, push-pulls, valves, flap selector, ignition, levers, handles and rescue handle, per position.
- **CTSL gauges** (#423, for #391): eight instruments with machined bezels, glass glare above the needle and stage-drawn needle shadows; secondary captions printed as on the real instrument (`data-lettering="secondary"`).
- **Generic panel widgets as real hardware** (#419, for #390): every panel-kit control and indicator from token gradients; `--panel-bezel`, `--panel-bezel-dark` and `--panel-dial` aligned to the plan's palette.
- **Device frames as anodised bezels behind glass** (#416, for #394), in the panel slot and in the dock.
- **Perf harness corrected** (#413, for #409): each paint counted once; P2 judges the view switch, the resize is printed as information.
- **Verification** (#396): this note, the plan's process rules, and the fix wave below.

## Verification (#396)

### Rubric, whole panel

Scored by the single M12 scorer on `develop` at 9d0a633 (all task PRs in), Free explore, 1920x1080 crops at device scale factor 2 and 3840x2160; 1024x768 checked for clipping and placard fit. Guided and Practice draw the same panel. Visual headings 0 to 3; the bar is every applicable heading at least 2 and their mean at least 2.5.

| View                   | Element type                                                  | Mean        |
| ---------------------- | ------------------------------------------------------------- | ----------- |
| CTSL panel             | Eight gauges, compass included                                | 2.5 to 2.67 |
| CTSL panel             | Breakers, dark lamps                                          | 2.6         |
| CTSL panel             | Panel and bay backgrounds                                     | 2.5 to 2.75 |
| CTSL panel             | COM, XPDR and GPS mirrors                                     | 2.75 to 3.0 |
| CTSL centre field      | Rockers, valves, flap selector, ignition, BAT and GEN, ground | 2.6 to 2.8  |
| CTSL centre console    | Levers, rescue handle, ground                                 | 2.6 to 2.8  |
| Demo panel             | Generic widgets                                               | 2.5 to 2.8  |
| Demo panel             | RADIO bay and mirrors                                         | 2.75        |
| Demo panel and console | Backgrounds                                                   | 2.5         |
| Demo console           | Sliders, knob, guarded handle                                 | 2.6 to 2.8  |
| Dock, both aircraft    | Device frames                                                 | 2.5         |

Pass/fail headings: no lettering below the minimum (the demo's DOM labels measured; CTSL lettering is SVG and owned by `lettering.spec.ts`), no status colour, nothing clipped at 4K or 1024x768, no console errors; G1 below.

Cross-element heading 10 (one light, one palette across widgets, backgrounds and device frames): 2 on every view. Light and shadow run up-left to down-right across every element. Residual mismatches the scorer named: CTSL gauge bezels read a little lighter than the dark panel plates; the demo's aluminium placards pulled the eye on the dark panel; the dock's black screen sits in a lighter frame than the panel mirrors.

One fail: the volume slider in the docked COM (CTSL) and radio (demo) Screens read as low contrast. The scorer's crops showed the unit unpowered, where a `--panel-screen` veil at 0.7 opacity dims the whole Screen by design. Powered, measured from rendered pixels in both themes: track against screen 4.15:1, but thumb against track 2.89:1.

Fix wave (#396):

- The volume thumb takes `--panel-legend` in the COM and SL40 stylesheets: thumb against track 4.23:1; `tools/device-css.test.ts` now requires 3:1 between thumb and track.
- The aluminium placard plate (`finish.aluminium` in panel-kit) drops one step, so it no longer pulls the eye on the dark panel.

Re-score of the changed crops after the wave: the powered docked COM 2.75 and demo radio 2.5 (the slider fail withdrawn), demo placard plates 2.67, cross-element heading 10 on the demo panel and console still 2, with the placards no longer dominating. Every element now meets the bar; no rubric failure is open.

### Performance budget (absolute, idle machine)

`pnpm test:perf` on the tree after the fix wave, load average 0.48 at the start and 1.69 at the end (a scorer's build may have overlapped; both under the idle bar of 2). 1024x768, CPU throttled 4x, median (min to max) of nine samples.

| Aircraft, view      | P1 needle frame (budget 4 ms) | P2 view switch (budget 33 ms) | Resize (information) | P3 filter uses |
| ------------------- | ----------------------------- | ----------------------------- | -------------------- | -------------- |
| CTSL panel          | 2.12 (1.93 to 2.20), 15 parts | 19.50 (18.55 to 20.22)        | 29.83                | 1 in 41 images |
| CTSL centre field   | no needles                    | 8.24 (7.71 to 10.04)          | 8.31                 | 1 in 25 images |
| CTSL centre console | no needles                    | 6.75 (6.33 to 7.30)           | 7.02                 | 1 in 15 images |
| Demo panel          | 1.46 (1.36 to 1.63), 6 parts  | 14.64 (14.08 to 15.58)        | 13.14                | 1 in 1 image   |
| Demo centre console | no needles                    | 7.04 (6.19 to 9.56)           | 7.28                 | 1 in 1 image   |

P4 payload (budget 3x the recorded baseline): CTSL 577,218 bytes, 1.45x; demo 186,641 bytes, 1.18x. Every budget holds with room; #421 (glass-layer cost) stays open as an optimisation, not a budget failure. The same run on `develop` before the fix wave gave the same picture (CTSL panel P2 18.97 ms).

### G1 audit (heading 11)

Every image in every aircraft and device package has a `LICENSES.md` row, every row names a file that exists, and no SVG embeds a raster image or an `<image>` element. The device packages ship no image files. The audit found the 18 outside-view `phase-*-running.svg` images (9 per aircraft, the propeller disc of #358) without rows; #396 adds them, and #424 proposes a contract test so a missing row fails CI. No image is traced: every licence file states the images were drawn for the project, and the art PRs drew from the plan's palette and the intake notes, never from `reference/`.

### Spec §1 success criteria

| Criterion                                                                                                                          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                | Gap                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A pilot can pick an aircraft and a procedure, operate every control on the panel, and be told what they did outside the checklist. | `procedure.spec.ts` (Guided run completes and the summary lists the deviation; Practice shows no deviation until the summary), `modes-dock.spec.ts` and `demo-modes-dock.spec.ts` (device keys in Guided, Practice and Free explore), `mode-switch.spec.ts`; every control is reachable at 44 px and labelled (`placards.spec.ts`, `layout.spec.ts`, `legibility.ts` artwork-control check, `printed-labels.test.tsx`). | No test operates every control of each aircraft through all its positions in the browser; the evidence proves every control is present, labelled and hittable, and samples operation: #425. |
| Wrong operation behaves as the aircraft would: turning the starter with the magnetos off does not start the engine.                | Demo: `packages/aircraft-demo/src/index.test.ts` ("turns the engine but does not start it with the magnetos off"). CTSL: `systems.test.ts` (no crank with BAT pulled, no start with the fuel valve closed, no cold start without choke or with the throttle open, stops with the ignition off).                                                                                                                         | Only the start side is modelled as inhibits; how much system logic to simulate and how to show wrong actions is spike #360, an owner decision.                                              |
| A developer adds an aircraft by writing one package and registering it. No engine or app code changes.                             | ESLint boundary rules and `tools/boundary.test.ts`; `apps/web` imports aircraft only in `aircraft-registry.ts`; `docs/adding-an-aircraft.md`. M12 drew all aircraft art inside `packages/aircraft-*` and generic widgets in `panel-kit`; no M12 PR added aircraft-specific code to `apps/web` or `core` (the glass layer in `core` is generic; since v0.12.0 only tests and shared tokens changed there).               | #415: the spec and the guide still call the dock cell optional.                                                                                                                             |
| The app installs on a desktop or tablet and works without a network at the airfield.                                               | `offline.spec.ts` (reload and start a procedure offline; update prompt), `apps/web/src/pwa/build.test.ts` (manifest, icons, precache of every aircraft image), `config.test.ts`.                                                                                                                                                                                                                                        | Install on a real tablet is #125 (UAT, open).                                                                                                                                               |

### Decisions in #396

- Score on `develop` plus one fix wave, not verification only as the issue first said: parts from different tasks meet only on the whole panel. The plan's Task 8 now says so.
- The volume fail was settled by measuring rendered pixels rather than redesigning the track: the track already met 3:1 against the screen when powered; the thumb against the track did not, and only that changed.
- The plan records the scoring process (one scorer, two-pass heading 10, self-scores as information), the interim P2 rule under load and the ADR 0002 readings of the milestone.

### Open questions for the owner

1. Is the rubric's bar (every heading at least 2, mean at least 2.5) what you mean by photorealistic? Every element meets it; the cross-element heading 10 sits at the bar (2), not above it.
2. The interim P2 rule under load (show at most 4 ms above base, or at most 25 ms) stays documented in the plan for future art PRs on a busy machine: keep it, or require the absolute run on every art PR?

### How to verify

- `pnpm test:perf` on an idle machine prints the table above; `pnpm vitest run tools/device-css.test.ts` holds the thumb rule.
- In the built app at 1920x1080 and 3840x2160, both aircraft, Free explore: every view in one viewport; dock the COM (CTSL) or radio (demo), turn on the battery and avionics, and drag VOL. Repeat at 1024x768 through the tabs. Light and dark chrome leave the panel unchanged.
- Final-state screenshots are taken by the verification task for the release PR: both aircraft at 1920x1080 (light and dark), 3840x2160 and 1024x768 (every tab), each with the dock empty and with a device docked.
