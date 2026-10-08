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
7. **Decision (#409): P2 judges the view switch; the resize is information.** A resize mostly measures every artwork SVG `<img>` being re-recorded at a new size, which only fewer or simpler images reduce, and it swings with machine load; a view switch is what a user triggers on every tab change. The resize sample stays in the printed table so a growing image count shows up. The first harness also summed `PaintImage` on top of the `Paint` that contains it, which inflated the resize sample by about a third; that is corrected (Harness method).

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
| Needle shadow outside the rotation (stage or TSX); its offset shows the needle's height above the dial | 1–1.5 %, 2–2.5 % | 0.5–0.8 % in the stage; none in TSX | 0.5 |
| Rotation-safe needle shadow inside a needle image (until Task 1) | centred | 0.85 % | 0.7 |
| Recess (dial, well, screen): radial gradient whose centre sits down-right of the opening's | centre 1.6–1.75 %, 2.4–2.5 % | stops over the outer 15 % of the radius | 0 → 0.3 → 0.7 |
| Glass glare: one sweep from the upper left | | linear gradient | 0.3 → 0.08 → 0 |
| Glass rim highlight: a crisp arc, upper left | | none | 0.45 |
| Specular edge on metal or plastic, upper left | | linear gradient | 0.55–0.75 → 0 |

**Reference specimens.** The spike's files show the technique and the light every task follows: `gauge-airspeed.svg` and `needle-airspeed.svg` (bezel, lip, recess, glass, screws, needle), `rocker-beacon.svg` with `rocker-on.svg` and `rocker-off.svg` (frame, well, paddle), and `RoundGauge.tsx` (the same materials from tokens). They do not set the finish: the ui-verifier scored them below the rubric's bar ("good drawings, not photographs"), so every task goes beyond them with the photoreal devices below.

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

**Photoreal devices.** A palette and a light make a good drawing; these make a part read as a photograph of the hardware. Every task applies the devices of the parts it draws. Gradients and `<pattern>` fills are cheap and free under P3; blur filters count against P3.

| Part | Devices (all required) | Cost |
|---|---|---|
| Instrument and device bezel (machined, anodised) | outer ring with a multi-stop gradient (at least four stops: lit, base, deep, shade) along the light axis; a narrow chamfer band at the outer edge, bright up-left and dark down-right; an inner lip with the reversed gradient; a thin dark seam between lip and dial or screen; corner screws where the hardware has them | gradients |
| Glass | one soft glare sweep up-left; one crisp rim reflection, a thin bright arc just inside the upper-left bezel edge; a faint counter-reflection down-right; glare drawn above the needle (Task 1's glass layer) | gradients, strokes |
| Cast shadow | every instrument, device and raised control casts its own shadow down-right onto the panel, soft at its outer edge, at the reference strength; drawn in the part's margin or, where the box has no room, in the view background (Task 5) | one blur filter, or a gradient fall-off |
| Printed dial | matte black with a fine grain (a small `<pattern>` tile of dots or hatch at 4–8 % opacity); markings and numerals in off-white ink (`#ECEAE3`), never pure white; the recess shadow inside the bezel | pattern |
| Needle | a tapered blade with a visible stem into the hub; a counterweight; a domed hub cap with a slotted hub screw; a soft shadow offset down-right that shows its height above the dial (stage-drawn after Task 1) | gradients; the stage shadow per P3 |
| Rocker, toggle, push button keycap (moulded plastic) | a rounded moulded edge band; a thin specular line along the lit edge; a pressed and a raised end that read by shading alone; the cap sits in a housing recess with an inner shadow and a frame that casts its own shadow | gradients |
| Knob, lever, handle | a turned or knurled rim (repeated thin lines or a pattern); a top face with a radial highlight up-left; a shadow that lengthens with height (pulled knobs) | gradients, pattern |
| Placard and legend | sits on something: printed ink on the panel paint (no outline, no shadow, ink colour from the palette) or an engraved or printed plate with its own bevel, fixing screws and, when engraved, letters with an inner shadow on the lit side; a legend never floats over a part | gradients |
| Panel | painted metal with a fine stipple (one `feTurbulence` per view background at most), plate seams and panel screws | one filter per background |

## Rubric for the ui-verifier

Judged on screenshots of both aircraft at 1920x1080 and 3840x2160 in Guided and Free explore, plus 1024x768 for touch. The ui-verifier crops each element at device scale factor 2 and scores every visual heading that applies to it (1–5, 7, 10, 12) from 0 to 3:

- **0** absent: the effect is not there.
- **1** drawn: the effect is there but reads as a diagram or icon.
- **2** convincing: at a glance the element reads as the real material and form.
- **3** photographic: at that crop it could pass for a photograph of the hardware.

**Bar.** An element passes when every applicable visual heading scores at least 2 and their mean is at least 2.5, and every pass/fail heading (6, 8, 9, 11) passes. Lettering passes only at 10.5 px or more rendered (`MIN_TEXT_PX` minus 0.5, as `lettering.spec.ts` measures) at 1920x1080; a secondary caption marked `data-lettering="secondary"` is exempt (Readings below). The verdict lists every element's scores and every failure.

**Scoring process** (settled in Tasks 2 to 7):

- One scorer, the same ui-verifier agent for every task PR and for Task 8, so every score is on one calibration. An implementer gets that scorer's verdict before it reports or pushes, and is given the crops that already scored 3 as anchors.
- Self-scores are information, never the verdict: on every art PR the implementer's own scores ran above the scorer's.
- Heading 10 is scored in two passes. Per task, on each crop, on the element's own parts alone: graded, height-scaled shadows and highlights from one gradient axis, palette tones. The comparison across elements (generic widgets beside aircraft art, backgrounds, device frames) is scored once, at Task 8, on the whole panel of each view.

1. **Bezel depth.** Every bezel shows a lit edge up-left, a shaded edge down-right, a chamfer and a reversed inner lip, and reads as machined metal.
2. **Glass glare.** Every glass-covered face (gauges, compass, lamp lenses, device screens) shows one soft reflection up-left and a crisp rim highlight; glare never hides a numeral or a legend.
3. **Cast shadow.** Every raised part casts a soft shadow down-right onto what is beneath it; every recess shows its inner shadow on the lit side.
4. **Panel texture.** At 4K a fine stipple is visible on every panel surface (none is one flat fill); at 1920x1080 no surface shows coarse noise or stepped gradient bands.
5. **Needle.** Every needle shows its stem, hub screw and a shadow that never points toward the light and shows its height above the dial; the compass card shows its shadow.
6. **Lettering** (pass/fail). All printed lettering, gauge faces included, renders at 10.5 px or more at 1920x1080, except secondary captions marked `data-lettering="secondary"`; `lettering.spec.ts` and `placards.spec.ts` pass.
7. **State at a glance.** Every two- and multi-position control shows its position without hovering: pressed and raised rocker ends, pulled breaker band, lever and knob positions.
8. **No status colours** (pass/fail) on the panel; lit lamps only in lamp colours.
9. **Touch targets** (pass/fail). 44 px targets intact; artwork changes never move a hit region (`placards.spec.ts` touch checks, `touch.test.tsx`).
10. **One light, one palette.** Compared with the reference specimens, every element has its lit edges up-left, its shadows down-right at the reference strength and its materials in the palette's tones; no element is a flat fill next to a shaded neighbour. Per task it is scored on the element's own parts; across elements only at Task 8 (Scoring process).
11. **Self-drawn** (pass/fail). Every new or changed image has its `LICENSES.md` row and no traced manufacturer artwork (G1).
12. **Material.** Every part reads as its material through the photoreal devices of its kind: anodised metal, moulded plastic, printed dial, printed or engraved placard, painted panel.

## Performance budget

These are requirements; each task's PR reports its own numbers against them, taken with `pnpm test:perf` (Task 1).

**Harness method.** The spike's scripts were not committed. Task 1 rebuilds them to this method, which is how the spike measured the numbers the budget rests on:

- Built app (`vite preview`; the spike used the dev server). Chromium through Playwright, viewport 1024x768, dark colour scheme, CPU throttled four times with CDP `Emulation.setCPUThrottlingRate { rate: 4 }`. The aircraft is opened through the picker and a procedure started in Guided; at this size the cockpit is tabbed, so a view is opened by its tab.
- One sample is one trace (`browser.startTracing` with the categories `devtools.timeline` and `disabled-by-default-devtools.timeline`) around one action. Its cost is the summed `dur` of the complete (`ph: 'X'`) events named `Paint`, `RasterTask`, `Decode Image` and `ImageDecodeTask`, counting only events not nested in another counted event on the same thread (every `PaintImage` lies inside a `Paint`, and a `Decode Image` inside a `RasterTask` is already part of that task's time; a decode on a worker thread has its own task and is counted there). A result is the median of nine samples, printed with its minimum and maximum.
- **Needle frame (P1):** in the page, set the `transform` of every needle overlay `image` in the view (`[data-moving="needle"] image`) to `rotate(-135 + 9i, pivot)` for 30 frames, one `requestAnimationFrame` each, then restore it; the sample is the total over 30. Panel-kit gauges rotate `[data-needle]` and the needle shadow the same way.
- **Re-raster (P2):** resize the viewport to 1025x768 and back (one pixel wider: narrower crosses the shell header's `min-width` rule and measures a re-layout), waiting for the paint after each (total over 2); and hide and show the view's `[role="tabpanel"]` with `visibility` twice, a double `requestAnimationFrame` after each (total over 2). The hide-and-show ("show") sample is the P2 budget; the resize sample is printed as information only.
- **Filters (P3):** for every `img[src]` and `image[href]` in the view, read the SVG (decoding data URIs, else fetching the URL) and count `filter="url(` and `filter='url(` uses; in panel-kit TSX, count `<filter>` in the view's DOM.
- **Payload (P4):** bytes of each aircraft's `assets/` SVG files, against a baseline the harness records when Task 1 lands, committed beside the specs.

- **P1 Needles.** While every CTSL needle sweeps at once, paint and raster per frame stay at or below 4 ms. Needles and the compass card render on their own layer (spike).
- **P2 Full re-raster.** Switching to any one view costs at most 33 ms of paint and raster (two frames). A one-pixel resize is measured and printed, not judged.
- **P3 Filters.** At most one `<filter>` in a static artwork image, at most one in a needle image, none in a positions or travel image, none in panel-kit TSX. `feTurbulence` texture only in view backgrounds.
- **P4 Payload.** All artwork and view-background SVGs of one aircraft together stay at or below three times the harness's recorded baseline, so the offline precache stays small.

If realism and the budget conflict, realism that lets a pilot recognise the hardware (shape, position, state, lettering) is ADR rank 2 and wins; finish beyond that (glare softness, texture, shadow blur) is rank 6 and gives way. The PR names what it gave up.

**Interim rule under load.** The budget is absolute, and only an idle machine gives absolute numbers (`CONTRIBUTING.md`, Checks). While parallel agents load the machine, a task PR passes P2 by alternating base and PR runs, three rounds, medians of each: it passes when in every round the PR's show sample is at most 4 ms above the base's, or at most 25 ms (three quarters of the budget). The delta guards against noise; the 25 ms bound keeps a PR from cutting finish to beat noise on a view far inside the budget. P1, P3 and P4 stay absolute. Task 8 runs the absolute budget once on an idle machine.

## Readings of ADR 0002 taken in this milestone

- Realism that lets a pilot recognise the hardware (shape, position, state, lettering) is rank 2; finish beyond that (glare softness, texture, shadow blur) is rank 6. Perf (rank 3) therefore sits between them: it cuts finish, never recognisability.
- A real instrument's face wording beats the 10.5 px floor for secondary captions. The floor binds primary numerals and units; a secondary caption printed small on the real instrument carries `data-lettering="secondary"` and `legibility.ts` skips it (`CONTRIBUTING.md`, Viewport matrix).

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

**Files:** `packages/core/src/contract/types.ts`, `packages/core/src/validator/*` (artwork checks only), `packages/core/src/contract/fixtures.ts`, `packages/panel-kit/src/artwork/ArtworkStage.tsx`, `packages/panel-kit/src/artwork/artwork.css`, `packages/panel-kit/src/artwork/artwork.test.tsx`, `packages/panel-kit/src/materials/` (create: the `Gradient`/`Materials` helpers lifted from the `RoundGauge` prototype), `packages/panel-kit/src/indicators/RoundGauge.tsx` (import the helpers), `apps/web/src/styles/tokens.css`, `docs/design/BRAND.md`, `apps/web/e2e/perf/` (create), `apps/web/playwright.config.ts` (a perf project, ignored by the default run), `eslint.config.js` and `tools/e2e-imports.test.ts` (only if the perf specs need their own import rule; they import `test` from `../fixtures` like every spec), `apps/web/package.json` and root `package.json` (`test:perf` script only), `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md` (§4.8 wording), `docs/adding-an-aircraft.md` (artwork section), the airspeed prototype's glass split (`packages/aircraft-ctsl/src/assets/artwork/gauge-airspeed.svg`, `glass-airspeed.svg` (create), `needle-airspeed.svg`, `packages/aircraft-ctsl/src/artwork.ts`, `packages/aircraft-ctsl/src/artwork.test.ts`, `packages/aircraft-ctsl/LICENSES.md`), `changelog.d/<issue>.added.md`

**Dependencies:** spike #385 merged.

- [ ] **Step 1: Failing tests** for an optional `artwork.glass` image: drawn above the moving part, never transformed, same size as the face (validator finding when it is not), absent glass renders as today, a failed glass image falls back like a failed face.
- [ ] **Step 2: Contract and stage** until Step 1 is green; §4.8 names the glass layer; the authoring guide shows face, moving part and glass for a gauge.
- [ ] **Step 3: Fixed-direction needle shadow.** The stage draws a needle's shadow from the same image (darkened, translated down-right outside the rotation) when the artwork asks for it (`options.needleShadow`), so a needle image no longer bakes its own; test the transform order.
- [ ] **Step 4: Materials.** Lift the gradient helpers into `packages/panel-kit/src/materials/`; add the plastic, screw and lamp-glow tokens the brief names (`--panel-plastic-*`, `--panel-lamp-glow-*` or similar, in `tokens.css` and `BRAND.md` with the same value in both themes).
- [ ] **Step 5: Perf harness** under `apps/web/e2e/perf/`, built to the Harness method above, in its own Playwright project that `pnpm test:e2e` skips, run by `pnpm test:perf`; records the P4 baseline, prints a table (with each artwork part's rendered size in a 1920x1080 window, for the Size rule), fails on P1 to P4.
- [ ] **Step 6: Fragment:** `Instrument artwork can carry a glass layer above the needle.`

**Definition of done:** stage, validator and token tests green; `pnpm test:perf` runs locally and passes on `develop`; the airspeed prototype still renders unchanged, now with its glare above the needle; the ui-verifier scores the stage's glass layer and needle shadow at least 2 on headings 2 and 5 on the airspeed prototype.

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

**Definition of done:** panel-kit tests and `printed-labels.test.tsx` green; every widget in the gallery meets the rubric's bar on headings 1–3, 5–9 and 12 (every applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px) at 1920x1080 and 4K; P1 and P2 hold on the demo panel.

---

### Task 3: CTSL gauges

**Issue:** #391

**Scope:** the eight CTSL instruments (airspeed, altimeter, VSI, tachometer, oil pressure, oil temperature, CHT, compass) as photorealistic face, needle or card, and glass images. Out of scope: view backgrounds, controls.

**Files:** `packages/aircraft-ctsl/src/assets/artwork/gauge-*.svg`, `needle*.svg`, `compass-*.svg`, glass images (create), `packages/aircraft-ctsl/src/artwork.ts`, `packages/aircraft-ctsl/src/artwork.test.ts`, `packages/aircraft-ctsl/LICENSES.md`, `apps/web/e2e/legibility.ts` and `apps/web/e2e/lettering.spec.ts` (gauge-face lettering check), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1; #388 (the 1080p layout that sets the Size rule's rendered sizes).

- [ ] **Step 1:** One shared photorealistic needle replaces `needle.svg` and the spike's `needle-airspeed.svg` (or one per needle style the CTSL panel shows); glare and hub move to glass images.
- [ ] **Step 2: Failing lettering check for gauge faces.** `letteringProblems` checks control faces only; extend it to indicator faces, so gauge lettering below 10.5 px at 1920x1080 fails (the airspeed indicator's AIRSPEED and km/h do today).
- [ ] **Step 3:** Redraw the airspeed indicator, altimeter, VSI, tachometer, oil pressure, oil temperature, CHT and compass (face, card, glass) to the brief. Scales, arcs and pivots unchanged; lettering grows where Step 2 needs it, staying clear of the needle sweep; `artwork.test.ts` sweep and lettering checks green.
- [ ] **Step 4:** `LICENSES.md` rows for every new file; drop rows of removed files.
- [ ] **Step 5: Fragment:** `The CT Supralight instruments look like real gauges: metal bezels, glass glare and shadowed needles.`

**Definition of done:** CTSL tests, `lettering.spec.ts` (gauge faces included) and `placards.spec.ts` green; all eight instruments meet the rubric's bar on headings 1, 2, 3, 5, 6, 8 and 12 (every applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px); P1, P3 hold.

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

**Definition of done:** CTSL and panel tests and e2e green; every control meets the rubric's bar on headings 1, 3, 6–9 and 12 (every applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px); P2, P3 hold.

---

### Task 5: CTSL view backgrounds and panel texture

**Issue:** #393

**Scope:** the three CTSL view backgrounds (panel, centre, console): panel paint, seams, screws, cutout shadows, placards. Out of scope: any control or gauge image.

**Files:** `packages/aircraft-ctsl/src/assets/view-panel.svg`, `view-centre.svg`, `view-console.svg`, `packages/aircraft-ctsl/LICENSES.md`, `packages/aircraft-ctsl/src/artwork.test.ts` (backdrop checks only), `changelog.d/<issue>.changed.md`

**Dependencies:** Tasks 3 and 4 (so cutout shadows match the parts); #351 (landed) set the three views and the panel floor.

- [ ] **Step 1:** Painted panel texture (fine stipple, one `feTurbulence` per background at most), plate seams, panel screws, cutout shadows around every instrument and device slot, printed and engraved placards per the brief.
- [ ] **Step 2:** Backdrop lettering keeps its scale (`lettering.spec.ts`); the compass placement checks in `artwork.test.ts` still find their plates and bay.
- [ ] **Step 3: Fragment:** `The CT Supralight panel reads as painted metal with shadows around its instruments.`

**Definition of done:** the CTSL panel, centre and console views meet the rubric's bar on headings 3, 4, 6, 10 and 12 (every applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px) at 1920x1080 and 4K; P2, P4 hold.

---

### Task 6: Device Display and Screen frames

**Issue:** #394

**Scope:** the shared bezel of every avionics device, in its panel slot (Display) and in the dock (Screen). Out of scope: what the screens show.

**Files:** `packages/panel-kit/src/device-screen/DeviceDisplayFrame.tsx`, `DeviceScreenFrame.tsx`, `device-screen.css`, their tests, `packages/device-*/src/screen/*.css` (bezel only), `tools/device-css.test.ts` (if a new rule needs it), `apps/web/src/styles/tokens.css` and `docs/design/BRAND.md` (tokens only), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1; #351 and #352 (slot sizes).

- [ ] **Step 1:** Shared device bezel: metal or plastic frame per the brief, screen recess with inner shadow, glass glare over the display; device lettering and button legends unchanged.
- [ ] **Step 2:** Screen content (LCD and LED segments, pages) unchanged; contract tests in `tools/` green.
- [ ] **Step 3: Fragment:** `Avionics units sit in shaded bezels behind glass.`

**Definition of done:** device and `tools/` tests green; every device meets the rubric's bar on headings 1–3, 6, 9 and 12 (every applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px) in its slot and in the dock.

---

### Task 7: Demo aircraft

**Issue:** #395

**Scope:** the demo aircraft's view backgrounds, including the radio section #352 adds, to the brief. Out of scope: panel-kit widgets (Task 2).

**Files:** `packages/aircraft-demo/src/assets/` (view backgrounds), `packages/aircraft-demo/LICENSES.md` (or its licence list), `packages/aircraft-demo/src/index.test.ts` (backdrop checks only), `changelog.d/<issue>.changed.md`

**Dependencies:** Task 2; #352 (the demo's own radio section).

- [ ] **Step 1:** Demo panel and console backgrounds to the brief (texture, cutout shadows, placards); the demo keeps generic widgets only.
- [ ] **Step 2: Fragment:** `The demo aircraft's panel matches the new look.`

**Definition of done:** demo tests and e2e green; every element of the demo meets the rubric's bar on every applicable heading (every visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px) at 1920x1080, 4K and 1024x768.

---

### Task 8: Verification pass and spec §1 audit

**Issue:** #396

**Scope:** the milestone-end check on `develop` with all task PRs in: the rubric on both aircraft, including the cross-element heading 10 pass, then one fix wave for what fails; the absolute perf budget on an idle machine; the spec §1 success criteria and the G1 audit. What one wave does not fix is filed as issues. Parts drawn by different tasks meet only here (cutout shadows of the backgrounds beside the bezels' own shadows, the token alignment beside the device frames), so this task fixes rather than only reports.

**Files:** `docs/milestones/m12-photorealistic-panel.md` (create), this plan (the process rules above), the files that own a failing element (aircraft art SVGs and `LICENSES.md`, panel-kit widgets and materials, `device-screen.css`), `apps/web/e2e/perf/` (thresholds only, if a requirement changes with owner approval), `changelog.d/<issue>.changed.md` if the fix wave changes what renders

**Dependencies:** Tasks 1–7.

- [ ] **Step 1:** `ui-verifier` against the full rubric, both aircraft, 1920x1080, 3840x2160, 1024x768, light and dark chrome, Guided, Practice and Free explore, plus the cross-element heading 10 pass per view; one fix wave in the owning files, re-scored; what still fails becomes an issue in this milestone.
- [ ] **Step 2:** `pnpm test:perf` on the built app after the fix wave, on an idle machine (absolute budget, not the interim rule); the milestone note records the numbers against P1–P4.
- [ ] **Step 3: Spec §1 success criteria,** walked in the built app: pick an aircraft and a procedure, operate every control, see deviations; wrong operation behaves as the aircraft would (starter with magnetos off); adding an aircraft still touches no `apps/web` file beyond its registry line and workspace dependency; the app installs and works offline (`offline.spec.ts`).
- [ ] **Step 4:** G1 audit: every image in every aircraft and device package has a licence row; none is traced.

**Definition of done:** the milestone note lists every element's rubric scores (each applicable visual heading at least 2, mean at least 2.5, crops at device scale factor 2, lettering at least 10.5 px), perf numbers and the §1 audit with no open failure, or each open failure as a filed issue the owner accepts at the release review.
