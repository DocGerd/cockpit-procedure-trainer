# M12 Photorealistic Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the application MVP with a panel that looks like a real GA cockpit panel: metal bezels with depth, glass with glare, cast shadows, a painted panel texture, screws, printed and engraved placards, needles with shadows, lit annunciators, and knobs, levers and rockers with real shading. Vector and self-drawn.

**Design:** parent spec §4.8 (artwork layers), §2 Cockpit view (2D layered panel; 3D #43 stays deferred), §3 (panel-kit: "realistic generic GA controls and gauges"), §6.2 (the panel looks like the aircraft, never the brand). ADR 0002: G1 (self-drawn, no manufacturer artwork, scans or photos), rank 2 realism, rank 3 performance, rank 6 visual polish.

**Spike:** #385. Its PR carries the prototypes (CTSL airspeed indicator, the CTSL rockers, the generic round gauge), the before/after screenshots and the measured numbers this plan's budget rests on.

**Tech stack:** as M11. No new dependency.

## What the spike settled

1. **The §4.8 pipeline carries photorealistic art with no contract change.** Face and moving images are self-contained SVG documents (gradients, clip paths and filters live in their own `<defs>`), loaded through `<img>` and `<image>`, so the CSP (`img-src 'self' data:`) and the lettering checks hold. The face keeps its lettering as `<text x y font-size … text-anchor …>` elements so `artwork.test.ts` can still check that no lettering sits under a needle's sweep.
2. **Two things the contract cannot draw yet.** Glare baked into a face sits under the needle, and any directional shading in a needle image turns with it. Task 1 adds an optional fixed `glass` layer drawn above the moving part. Until then a needle carries only rotation-safe shading: a centred soft shadow, a centreline ridge, a concentric hub.
3. **A face that fills its box has no room for its own cast shadow.** Artwork leaves a margin on the lower right for the shadow (the airspeed prototype's bezel stops short of the box edge); a part whose shadow would fall outside its box gets it from the view background (Task 5).
4. **A needle must not repaint its face.** Without a layer of its own, every needle move re-rasterises the face beneath it, filters included. The spike puts the moving image of a needle on its own compositor layer (`.cpt-artwork-moving[data-moving='needle']` in `artwork.css`); after that a sweeping photorealistic needle costs less than the flat one did. Positions and travel layers stay unpromoted: they change on a click, not every frame, and every layer costs memory.
5. **Blur filters are the expensive part of a static face.** With the moving layer split off they cost only on a full re-raster (view switch, resize, zoom), but there they dominate. Gradients do most of the work at a fraction of the cost.
6. **Generic widgets: token-driven gradients in TSX** (see Technique below).

## Technique for panel-kit generic widgets

**Decision: (i) gradients in TSX whose `<stop>` colours are `var(--panel-…)` tokens, defined per widget instance with ids from `useId()`, and no `<filter>` in panel-kit TSX.** Prototyped on `RoundGauge`: metal bezel, reversed inner lip, recess shadow, glossy hub, needle shadow and glass glare drawn above the needle. New material tokens in `tokens.css` and `docs/design/BRAND.md`: `--panel-metal-light`, `--panel-metal-shade`, `--panel-shadow`, `--panel-glare` (shadow and glare are applied by `stop-opacity`, so one token each serves every depth).

Why not the others:

- **(ii) A shared SVG art-kit file referenced from TSX:** Chromium does not resolve paint servers or filters in another document (`fill="url(kit.svg#metal)"`), only `<use href>`; colours in a `.svg` file bypass the token rule; a kit mounted once in the page couples every widget to a host that must remember to render it.
- **(iii) Generic faces as `.svg` files through the artwork stage:** generic widgets compute their faces from options and measured legibility (tick count, arcs, numeral size, N position legends, placard band); a static file cannot, and an `<img>` cannot read tokens.

Trade-offs taken:

- Every instance carries its own small `<defs>`; ids differ per mount, so a test that compares two renders normalises ids (`indicators.test.tsx`, "renders the same output for the same props").
- A paint check now allows `url(#…)` only when the referenced gradient's stops are panel tokens (`indicators.test.tsx`, "takes all its colours from panel tokens"); Task 2 moves that check to every widget.
- An inline-SVG widget repaints whole when its needle turns, gradients included. The demo has few gauges and stays inside the budget; if a widget breaks it, its moving part moves to its own overlay `<svg>` with the same layer rule as the artwork stage.
- Shadows in TSX are offset copies (the needle shadow is a darker, wider copy of the needle, translated down-right outside the rotation, so it never points toward the light) or gradients, never blur filters.

## Art-direction brief

**Light.** One key light for the whole panel, from the upper left and in front, as daylight through the canopy. Lit edges face up-left; shadows fall down and to the right. Nothing on the panel is lit from another side.

**Depth classes** (in the part's own image units, scaled with the part):

| Part | Stands proud of its ground by | Cast shadow |
|---|---|---|
| Instrument bezel, device bezel | medium | soft, down-right, onto the panel |
| Needle | small, above the dial | soft, rotation-safe (centred) until Task 1's glass layer, then down-right |
| Rocker paddle, raised end | medium | onto the pressed end and the well |
| Knob, lever handle, push-pull and breaker button | large | onto the panel or plate; grows when pulled |
| Placard (printed) | none | none: ink has no shadow |
| Placard (engraved) | negative | inner shadow on the lit side of the cut |

**Reference values.** Offsets and blur are fractions of the shorter side of the part's image (on a 200-unit gauge face, 1 % is 2 units); shadows are black at the stated opacity. Take these unless a part's PR names why not.

| Effect | Offset right, down | Blur (`stdDeviation`) | Opacity |
|---|---|---|---|
| Medium cast shadow (bezel, rocker frame) | 0.4–0.55 %, 1.1–1.7 % | 0.8–1.2 % | 0.6 |
| Large cast shadow (knob, handle, pulled button; no specimen yet) | about twice medium | about twice medium | 0.6 |
| Screw head shadow | 0, 0.45 % | none | 0.45 |
| Needle shadow outside the rotation (stage or TSX) | 0.6 %, 1.3 % | none in TSX | 0.45 |
| Rotation-safe needle shadow inside a needle image (until Task 1) | centred | 0.85 % | 0.7 |
| Recess (dial, well, screen): radial gradient whose centre sits down-right of the opening's | centre 1.6–1.75 %, 2.4–2.5 % | stops over the outer 15 % of the radius | 0 → 0.3 → 0.7 |
| Glass glare: one sweep from the upper left | | linear gradient | 0.3 → 0.08 → 0 |
| Glass rim highlight: a crisp arc, upper left | | none | 0.45 |
| Specular edge on metal or plastic, upper left | | linear gradient | 0.55–0.75 → 0 |

**Reference specimens.** The spike's files are the worked examples every task matches: `gauge-airspeed.svg` and `needle-airspeed.svg` (bezel, lip, recess, glass, screws, needle), `rocker-beacon.svg` with `rocker-on.svg` and `rocker-off.svg` (frame, well, paddle), and `RoundGauge.tsx` (the same materials from tokens). A task that departs from a specimen says so in its PR.

**Materials and palette** (hex values are for aircraft SVG files; panel-kit takes the same roles from the `--panel-*` tokens in the last column, and a token's value is the hex it stands for):

| Material | Base | Lit | Shade | Notes | Tokens (base / lit / shade) |
|---|---|---|---|---|---|
| Panel paint (matte, fine stipple) | `#26282C` | `#33363B` | `#1A1C1F` | texture only in view backgrounds | `--panel-surface` |
| Bezel (satin black anodised aluminium) | `#34383E` | `#6B717A` | `#0B0C0E` | lit outer edge up-left, inner lip reversed | `--panel-bezel`¹ / `--panel-metal-light` / `--panel-metal-shade` |
| Dial (matte black) | `#121316` | `#1B1D21` centre | `#0A0B0C` rim | recess shadow strongest on the lit side | `--panel-dial`¹ |
| Markings (paint) | white `#ECEAE3`, grey `#A3A7AC` | | | arcs are aircraft markings in paint tones |
| Glass | clear | white at low opacity | | one soft canopy reflection up-left, one crisp rim highlight |
| Needle | white blade `#FFFFFF` with `#BFC3C8` edges | | black counterweight | hub concentric, glossy |
| Switch plastic (satin black) | `#2E3136` | `#5E646C` | `#08090A` | raised end lit, pressed end in shadow |
| Screws (black oxide, slotted) | `#4A4F56` | `#A4AAB2` | `#1A1C1F` | slots at varied angles |
| Lamp lens (unlit) | `#1B1E22` | reflection only | | lit: lamp token core, glow by radial gradient, never a filter | `--panel-lamp-off` |

Shadows and glare take `--panel-shadow` and `--panel-glare` at the opacities above; the plastic, screw and lamp-glow tokens arrive with Task 1. ¹ `--panel-bezel`, `--panel-bezel-dark` and `--panel-dial` predate M12 and do not match this table yet; Task 2 aligns them (`--panel-bezel-dark` to `#1C1E22`, the deep bezel stop between base and shade in `gauge-airspeed.svg`), so a generic widget beside aircraft artwork shows one metal.

**Shadow rules.**

- S1 One light direction everywhere (above).
- S2 Cast shadows are soft, offset down-right in proportion to depth, and translucent black; a shadow never has a hard edge where its image box clips it.
- S3 A recess (dial, switch well, screen) is darkest on its inner edge nearest the light.
- S4 A part that turns carries only rotation-safe shading in its own image; directional highlights go on a fixed layer.
- S5 No shadow, glare or texture lowers a legend below the lettering minimums (`lettering.spec.ts`, `placards.spec.ts`).
- S6 No status colour on the panel; lamp colours come from lamp tokens or the aircraft's own lamp art; arcs are the aircraft's markings.

**Size.** Detail is drawn for the size the part renders at in the built app in a 1920x1080 browser window (the HD-first layout #388 settles); the perf harness prints each artwork part's rendered CSS size there. A bevel, rim highlight or screw that is under one CSS px at that size is dropped, not drawn faint.

## Rubric for the ui-verifier

Judged on screenshots of both aircraft at 1920x1080 and 3840x2160 in Guided and Free explore, plus 1024x768 for touch. Each criterion passes or fails per element; the verdict lists failures by element.

1. **Bezel depth.** Every bezel shows a lit edge up-left, a shaded edge down-right and a reversed inner lip.
2. **Glass glare.** Every glass-covered face (gauges, compass, lamp lenses, device screens) shows one soft reflection up-left and a crisp rim highlight; glare never hides a numeral or a legend.
3. **Cast shadow.** Every raised part casts a soft shadow down-right onto what is beneath it; every recess shows its inner shadow on the lit side.
4. **Panel texture.** At 4K a fine stipple is visible on every panel surface (none is one flat fill); at 1920x1080 no surface shows coarse noise or stepped gradient bands.
5. **Needle shadow.** Every needle and the compass card show a shadow that never points toward the light.
6. **Lettering.** All printed lettering stays legible at 1920x1080 and 4K; `lettering.spec.ts` and `placards.spec.ts` pass.
7. **State at a glance.** Every two- and multi-position control shows its position without hovering: pressed and raised rocker ends, pulled breaker band, lever and knob positions.
8. **No status colours** on the panel; lit lamps only in lamp colours.
9. **Touch targets.** 44 px targets intact; artwork changes never move a hit region (`placards.spec.ts` touch checks, `touch.test.tsx`).
10. **One light, one palette.** Compared with the reference specimens, every element has its lit edges up-left, its shadows down-right at the reference strength and its materials in the palette's tones; no element is a flat fill next to a shaded neighbour (milestone end only; mid-milestone, unfinished parts are listed, not failed).
11. **Self-drawn.** Every new or changed image has its `LICENSES.md` row and no traced manufacturer artwork (G1).

## Performance budget

These are requirements; each task's PR reports its own numbers against them, taken with `pnpm test:perf` (Task 1).

**Harness method** (the spike's scripts were not committed; Task 1 builds this):

- Built app (`vite preview`), Chromium through Playwright, viewport 1024x768, CPU throttled four times with CDP `Emulation.setCPUThrottlingRate`.
- One sample is one CDP trace (`Tracing.start`, categories `devtools.timeline` and `disabled-by-default-devtools.timeline`) around one action, after one untraced warm-up of the same action. Its cost is the summed duration of its `Paint`, `RasterTask`, `ImageDecodeTask` and `Decode Image` events. A result is the median of at least nine samples, taken in interleaved rounds.
- **Needle frame:** the needles are driven through the app's own state, every needle of the view changing in the same frame; the sample is that frame.
- **Re-raster:** a switch to the view and a window resize, sampled separately; the larger counts.
- **Filters:** `<filter>` elements counted in each image the view loads and in the view's DOM.
- **Payload:** bytes of each aircraft's `assets/` SVG files, against a baseline the harness records when Task 1 lands, committed beside the specs.

- **P1 Needles.** While every CTSL needle sweeps at once, paint and raster per frame stay at or below 4 ms. Needles and the compass card render on their own layer (spike).
- **P2 Full re-raster.** Switching to, or resizing, any one view costs at most 33 ms of paint and raster (two frames).
- **P3 Filters.** At most one `<filter>` in a static artwork image, at most one in a needle image, none in a positions or travel image, none in panel-kit TSX. `feTurbulence` texture only in view backgrounds.
- **P4 Payload.** All artwork and view-background SVGs of one aircraft together stay at or below three times the harness's recorded baseline, so the offline precache stays small.

If realism and the budget conflict, realism that lets a pilot recognise the hardware (shape, position, state, lettering) is ADR rank 2 and wins; finish beyond that (glare softness, texture, shadow blur) is rank 6 and gives way. The PR names what it gave up.

## Global constraints

- Everything in the M7 plan's Global Constraints applies (base `develop`, one issue per PR, fragments, separate-agent review via `pr-selfreview`, `merge-train`, tests first, the `CONTRIBUTING.md` Checks chain before every push).
- Each task's **Files** list is its complete allowlist; a task that needs another file stops and reports.
- Art is drawn, never traced from photos or handbooks; `reference/` is never read.
- Lettering, placards and hit regions do not move unless the task says so; every changed image keeps its lettering in the `<text>` form the tests parse.
- Comments only where the code cannot say it; no measured figure in a comment or doc except as a requirement (numbers go in the PR body).
- Every task that changes what the app renders gets a `ui-verifier` pass against the rubric above.

## Dependency graph

```
Task 1 #389 (glass layer, materials, perf harness)
  ├── Task 2 #390 (generic widgets) ──────── Task 7 #395 (demo aircraft, after #352)
  ├── Task 3 #391 (CTSL gauges, after #388)
  ├── Task 4 #392 (CTSL controls, after #388)
  │     └─(3, 4)── Task 5 #393 (CTSL view backgrounds and panel texture)
  └── Task 6 #394 (device Display and Screen frames, after #351/#352)
Task 8 #396 (verification and §1 audit) after all
```

Tasks 2, 3, 4 and 6 run in parallel after Task 1. Their files are disjoint except `tokens.css` and `BRAND.md`, where Tasks 2 and 6 may each add material tokens; whichever lands second takes the other in through the merge train.

---

### Task 1: Glass layer, panel materials and the perf harness

**Issue:** #389

**Scope:** the shared groundwork every art task builds on: an optional fixed glass layer in the artwork contract, a fixed-direction needle shadow in the stage, the panel-kit material helpers and tokens, and the perf harness. Out of scope: redrawing any widget or aircraft image.

**Files:** `packages/core/src/contract/types.ts`, `packages/core/src/validator/*` (artwork checks only), `packages/core/src/contract/fixtures.ts`, `packages/panel-kit/src/artwork/ArtworkStage.tsx`, `packages/panel-kit/src/artwork/artwork.css`, `packages/panel-kit/src/artwork/artwork.test.tsx`, `packages/panel-kit/src/materials/` (create: the `Gradient`/`Materials` helpers lifted from the `RoundGauge` prototype), `packages/panel-kit/src/indicators/RoundGauge.tsx` (import the helpers), `apps/web/src/styles/tokens.css`, `docs/design/BRAND.md`, `apps/web/e2e/perf/` (create), `apps/web/playwright.config.ts` (a perf project, ignored by the default run), `eslint.config.js` and `tools/e2e-imports.test.ts` (only if the perf specs need their own import rule; they import `test` from `../fixtures` like every spec), `apps/web/package.json` and root `package.json` (`test:perf` script only), `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md` (§4.8 wording), `docs/adding-an-aircraft.md` (artwork section), `changelog.d/<issue>.added.md`

**Dependencies:** spike #385 merged.

- [ ] **Step 1: Failing tests** for an optional `artwork.glass` image: drawn above the moving part, never transformed, same size as the face (validator finding when it is not), absent glass renders as today, a failed glass image falls back like a failed face.
- [ ] **Step 2: Contract and stage** until Step 1 is green; §4.8 names the glass layer; the authoring guide shows face, moving part and glass for a gauge.
- [ ] **Step 3: Fixed-direction needle shadow.** The stage draws a needle's shadow from the same image (darkened, translated down-right outside the rotation) when the artwork asks for it (`options.needleShadow`), so a needle image no longer bakes its own; test the transform order.
- [ ] **Step 4: Materials.** Lift the gradient helpers into `packages/panel-kit/src/materials/`; add the plastic, screw and lamp-glow tokens the brief names (`--panel-plastic-*`, `--panel-lamp-glow-*` or similar, in `tokens.css` and `BRAND.md` with the same value in both themes).
- [ ] **Step 5: Perf harness** under `apps/web/e2e/perf/`, built to the Harness method above, in its own Playwright project that `pnpm test:e2e` skips, run by `pnpm test:perf`; records the P4 baseline, prints a table (with each artwork part's rendered size in a 1920x1080 window, for the Size rule), fails on P1 to P4.
- [ ] **Step 6: Fragment:** `Instrument artwork can carry a glass layer above the needle.`

**Definition of done:** stage, validator and token tests green; `pnpm test:perf` runs locally and passes on `develop`; the airspeed prototype still renders unchanged.

---

### Task 2: Photorealistic generic widgets

**Issue:** #390

**Scope:** every panel-kit control and indicator drawn to the brief with the materials of Task 1. Out of scope: device frames (Task 6), aircraft artwork.

**Files:** `packages/panel-kit/src/controls/*.tsx`, `packages/panel-kit/src/controls/controls.css`, `packages/panel-kit/src/controls/*.test.tsx`, `packages/panel-kit/src/indicators/*.tsx`, `packages/panel-kit/src/indicators/indicators.test.tsx`, `packages/panel-kit/src/materials/`, `apps/web/src/styles/tokens.css` and `docs/design/BRAND.md` (material tokens and the palette alignment only), `apps/web/src/gallery/*` (only if a cell needs room), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1.

- [ ] **Step 1: Failing paint test for every widget:** every fill and stroke is a panel token or a `url(#…)` whose stops are panel tokens; no `<filter>`; render output equal across mounts once ids are normalised.
- [ ] **Step 2: Controls:** toggle, rocker, key switch, push button, circuit breaker, rotary knob, lever, guarded handle, each with material shading per the brief, state readable at a glance, placard band and legends unchanged.
- [ ] **Step 3: Token alignment:** set `--panel-bezel`, `--panel-bezel-dark` and `--panel-dial` (in `tokens.css` and `BRAND.md`) to the palette's values (footnote ¹), with every legend contrast test green.
- [ ] **Step 4: Indicators:** round gauge (finish the prototype: hub and glare per the brief), annunciator (unlit lens with reflection; lit core with radial glow from the lamp token), digital readout (recessed glass window).
- [ ] **Step 5: Gallery check** at every size: no new small-text warnings; `ui-verifier` on the gallery and the demo panel.
- [ ] **Step 6: Fragment:** `Generic panel controls and gauges look like real hardware: metal bezels, glass, shadows and shaded switches.`

**Definition of done:** panel-kit tests and `printed-labels.test.tsx` green; rubric items 1–3, 5–9 pass on the gallery at 1920x1080 and 4K; P1 and P2 hold on the demo panel.

---

### Task 3: CTSL gauges

**Issue:** #391

**Scope:** the eight CTSL instruments (airspeed, altimeter, VSI, tachometer, oil pressure, oil temperature, CHT, compass) as photorealistic face, needle or card, and glass images. Out of scope: view backgrounds, controls.

**Files:** `packages/aircraft-ctsl/src/assets/artwork/gauge-*.svg`, `needle*.svg`, `compass-*.svg`, glass images (create), `packages/aircraft-ctsl/src/artwork.ts`, `packages/aircraft-ctsl/src/artwork.test.ts`, `packages/aircraft-ctsl/LICENSES.md`, `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1; #388 (the 1080p layout that sets the Size rule's rendered sizes).

- [ ] **Step 1:** One shared photorealistic needle replaces `needle.svg` and the spike's `needle-airspeed.svg` (or one per needle style the CTSL panel shows); glare and hub move to glass images.
- [ ] **Step 2:** Redraw the airspeed indicator, altimeter, VSI, tachometer, oil pressure, oil temperature, CHT and compass (face, card, glass) to the brief. Scales, arcs, lettering positions and pivots unchanged; `artwork.test.ts` sweep and lettering checks stay green.
- [ ] **Step 3:** `LICENSES.md` rows for every new file; drop rows of removed files.
- [ ] **Step 4: Fragment:** `The CT Supralight instruments look like real gauges: metal bezels, glass glare and shadowed needles.`

**Definition of done:** CTSL tests, `lettering.spec.ts`, `placards.spec.ts` green; rubric items 1, 2, 3, 5, 6, 8 pass for all eight instruments; P1, P3 hold.

---

### Task 4: CTSL controls

**Issue:** #392

**Scope:** every CTSL control that has artwork, redrawn per position to the brief, plus artwork for the ELT switch and lamps where the generic widget falls short. Out of scope: gauges, view backgrounds.

**Files:** `packages/aircraft-ctsl/src/assets/artwork/` (breaker, rocker, push-pull, valve, flap, ignition, lever, handle, rescue images), `packages/aircraft-ctsl/src/artwork.ts`, `packages/aircraft-ctsl/src/controls.ts` (only to give the ELT toggle artwork), `packages/aircraft-ctsl/src/indicators.ts` (only to give the charge and ELT lamps artwork, if the brief's lamp needs more than the generic annunciator), `packages/aircraft-ctsl/src/artwork.test.ts`, `apps/web/src/panel/ctsl-artwork-direction.test.tsx` (only if a legend moves), `packages/aircraft-ctsl/LICENSES.md`, `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1 (harness); #388 (rendered sizes). Independent of Task 3.

- [ ] **Step 1:** Breakers (nine faces, in/pulled buttons with the pulled band), rockers (finish the prototype; the avionics master), fuel and park-brake valves, flap selector and knob positions, ignition and key, battery and generator push-pull, brake, choke, throttle, carb heat and trim levers and handles, rescue handle.
- [ ] **Step 2:** Per-position images keep the hit regions and the travel paths; every legend stays where `ctsl-artwork-direction.test.tsx` expects it.
- [ ] **Step 3:** `LICENSES.md` rows.
- [ ] **Step 4: Fragment:** `The CT Supralight switches, breakers, knobs and levers look like real hardware.`

**Definition of done:** CTSL and panel tests and e2e green; rubric items 1, 3, 6–9 pass for every control; P2, P3 hold.

---

### Task 5: CTSL view backgrounds and panel texture

**Issue:** #393

**Scope:** the three CTSL view backgrounds (panel, centre, console): panel paint, seams, screws, cutout shadows, placards. Out of scope: any control or gauge image.

**Files:** `packages/aircraft-ctsl/src/assets/view-panel.svg`, `view-centre.svg`, `view-console.svg`, `packages/aircraft-ctsl/LICENSES.md`, `packages/aircraft-ctsl/src/artwork.test.ts` (backdrop checks only), `changelog.d/<issue>.changed.md`

**Dependencies:** Tasks 3 and 4 (so cutout shadows match the parts); #351 (landed) set the three views and the panel floor.

- [ ] **Step 1:** Painted panel texture (fine stipple, one `feTurbulence` per background at most), plate seams, panel screws, cutout shadows around every instrument and device slot, printed and engraved placards per the brief.
- [ ] **Step 2:** Backdrop lettering keeps its scale (`lettering.spec.ts`); the compass placement checks in `artwork.test.ts` still find their plates and bay.
- [ ] **Step 3: Fragment:** `The CT Supralight panel reads as painted metal with shadows around its instruments.`

**Definition of done:** rubric items 3, 4, 6, 10 pass on the CTSL at 1920x1080 and 4K; P2, P4 hold.

---

### Task 6: Device Display and Screen frames

**Issue:** #394

**Scope:** the shared bezel of every avionics device, in its panel slot (Display) and in the dock (Screen). Out of scope: what the screens show.

**Files:** `packages/panel-kit/src/device-screen/DeviceDisplayFrame.tsx`, `DeviceScreenFrame.tsx`, `device-screen.css`, their tests, `packages/device-*/src/screen/*.css` (bezel only), `tools/device-css.test.ts` (if a new rule needs it), `apps/web/src/styles/tokens.css` and `docs/design/BRAND.md` (tokens only), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1; #351 and #352 (slot sizes).

- [ ] **Step 1:** Shared device bezel: metal or plastic frame per the brief, screen recess with inner shadow, glass glare over the display; device lettering and button legends unchanged.
- [ ] **Step 2:** Screen content (LCD and LED segments, pages) unchanged; contract tests in `tools/` green.
- [ ] **Step 3: Fragment:** `Avionics units sit in shaded bezels behind glass.`

**Definition of done:** device and `tools/` tests green; rubric items 1–3, 6, 9 pass for every device in its slot and in the dock.

---

### Task 7: Demo aircraft

**Issue:** #395

**Scope:** the demo aircraft's view backgrounds, including the radio section #352 adds, to the brief. Out of scope: panel-kit widgets (Task 2).

**Files:** `packages/aircraft-demo/src/assets/` (view backgrounds), `packages/aircraft-demo/LICENSES.md` (or its licence list), `packages/aircraft-demo/src/index.test.ts` (backdrop checks only), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 2; #352 (the demo's own radio section).

- [ ] **Step 1:** Demo panel and console backgrounds to the brief (texture, cutout shadows, placards); the demo keeps generic widgets only.
- [ ] **Step 2: Fragment:** `The demo aircraft's panel matches the new look.`

**Definition of done:** demo tests and e2e green; rubric passes on the demo at 1920x1080, 4K and 1024x768.

---

### Task 8: Verification pass and spec §1 audit

**Issue:** #396

**Scope:** the milestone-end check: the rubric on both aircraft, the perf budget, the spec §1 success criteria and the G1 audit. Out of scope: fixing what it finds (filed as issues).

**Files:** `docs/milestones/m12-photorealistic-panel.md` (create), `apps/web/e2e/perf/` (thresholds only, if a requirement changes with owner approval)

**Dependencies:** Tasks 1–7.

- [ ] **Step 1:** `ui-verifier` against the full rubric, both aircraft, 1920x1080, 3840x2160, 1024x768, light and dark chrome, Guided, Practice and Free explore; failures become issues in this milestone.
- [ ] **Step 2:** `pnpm test:perf` on the built app; the milestone note records the numbers against P1–P4.
- [ ] **Step 3: Spec §1 success criteria,** walked in the built app: pick an aircraft and a procedure, operate every control, see deviations; wrong operation behaves as the aircraft would (starter with magnetos off); adding an aircraft still touches no `apps/web` file beyond its registry line and workspace dependency; the app installs and works offline (`offline.spec.ts`).
- [ ] **Step 4:** G1 audit: every image in every aircraft and device package has a licence row; none is traced.

**Definition of done:** the milestone note lists rubric results, perf numbers and the §1 audit with no open failure, or each open failure as a filed issue the owner accepts at the release review.
