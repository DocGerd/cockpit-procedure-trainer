# M12 Photorealistic panel (v0.13.0) - verification draft

Draft by the verification task (#396) for the release summary; the release agent folds it into the four sections of `milestone-release`. Milestone M12 is released as v0.13.0; on GitHub it is milestone 13. The spike (#398), the glass layer, materials and perf harness (#401) and the demo backgrounds (#402) already shipped in v0.12.0.

## What shipped (since v0.12.0)

- **CTSL view backgrounds as painted panel metal** (#403, for #393): fine stipple, plate seams, panel screws, cutout shadows around every instrument and device seat.
- **CTSL controls as photoreal hardware** (#417, for #392): breakers, rockers, push-pulls, valves, flap selector, ignition, levers, handles and rescue handle, per position.
- **CTSL gauges** (#423, for #391): eight instruments with machined bezels, glass glare above the needle and stage-drawn needle shadows; secondary captions printed as on the real instrument (`data-lettering="secondary"`).
- **Generic panel widgets as real hardware** (#419, for #390): every panel-kit control and indicator from token gradients; `--panel-bezel`, `--panel-bezel-dark` and `--panel-dial` aligned to the plan's palette.
- **Device frames as anodised bezels behind glass** (#416, for #394), in the panel slot and in the dock.
- **Perf harness corrected** (#413, for #409): each paint counted once; P2 judges the view switch, the resize is printed as information.
- **Verification** (#396): this note, the plan's process rules, and the fix wave below.

## Verification (#396)

### Rubric, whole panel

SCORES

### Performance budget (absolute, idle machine)

PERF

### G1 audit (heading 11)

Every image in every aircraft and device package has a `LICENSES.md` row, every row names a file that exists, and no SVG embeds a raster image or an `<image>` element. The device packages ship no image files. The audit found the 18 outside-view `phase-*-running.svg` images (9 per aircraft, the propeller disc of #358) without rows; #396 adds them, and #424 proposes a contract test so a missing row fails CI. No image is traced: every licence file states the images were drawn for the project, and the art PRs drew from the plan's palette and the intake notes, never from `reference/`.

### Spec §1 success criteria

| Criterion                                                                                                                          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                | Gap                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A pilot can pick an aircraft and a procedure, operate every control on the panel, and be told what they did outside the checklist. | `procedure.spec.ts` (Guided run completes and the summary lists the deviation; Practice shows no deviation until the summary), `modes-dock.spec.ts` and `demo-modes-dock.spec.ts` (device keys in Guided, Practice and Free explore), `mode-switch.spec.ts`; every control is reachable at 44 px and labelled (`placards.spec.ts`, `layout.spec.ts`, `legibility.ts` artwork-control check, `printed-labels.test.tsx`). | No test operates every control of each aircraft through all its positions in the browser; the evidence proves every control is present, labelled and hittable, and samples operation: #425. |
| Wrong operation behaves as the aircraft would: turning the starter with the magnetos off does not start the engine.                | Demo: `packages/aircraft-demo/src/index.test.ts` ("turns the engine but does not start it with the magnetos off"). CTSL: `systems.test.ts` (no crank with BAT pulled, no start with the fuel valve closed, no cold start without choke or with the throttle open, stops with the ignition off).                                                                                                                         | Only the start side is modelled as inhibits; how much system logic to simulate and how to show wrong actions is spike #360, an owner decision.                                              |
| A developer adds an aircraft by writing one package and registering it. No engine or app code changes.                             | ESLint boundary rules and `tools/boundary.test.ts`; `apps/web` imports aircraft only in `aircraft-registry.ts`; `docs/adding-an-aircraft.md`. M12 drew all aircraft art inside `packages/aircraft-*` and generic widgets in `panel-kit`; no M12 PR added aircraft-specific code to `apps/web` or `core` (the glass layer in `core` is generic; since v0.12.0 only tests and shared tokens changed there).               | #415: the spec and the guide still call the dock cell optional.                                                                                                                             |
| The app installs on a desktop or tablet and works without a network at the airfield.                                               | `offline.spec.ts` (reload and start a procedure offline; update prompt), `apps/web/src/pwa/build.test.ts` (manifest, icons, precache of every aircraft image), `config.test.ts`.                                                                                                                                                                                                                                        | Install on a real tablet is #125 (UAT, open).                                                                                                                                               |

### Screenshots

SHOTS
