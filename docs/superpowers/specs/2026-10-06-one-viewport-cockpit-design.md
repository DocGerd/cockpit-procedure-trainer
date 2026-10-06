# One-viewport cockpit — Design

Status: proposed 2026-10-06 · Issue #253 · Parent spec:
`2026-10-05-cockpit-procedure-trainer-design.md` §4.3, §5 (Screen), §9.

## 1. Goal

On a desktop viewport the pilot sees the whole cockpit at once, arranged as
from the left seat: every view of the aircraft (panel, centre field, centre
console, radio stack, GPS) side by side, no tab switching to fly any
procedure. Holding the key on START while watching the rpm (#226) then works
on desktop. Tabs stay for viewports where the combined cockpit would be too
small to read and operate.

Target sizes, in this order (ADR-0002, owner comment on #253):

1. **HD, 1920x1080 CSS px.** The arrangement is designed for it.
2. **4K, 3840x2160 CSS px** at device pixel ratio 1. The same arrangement,
   scaled up. A 4K monitor at 200 % OS scaling reports 1920x1080 CSS px and is
   the HD case, rendered sharper.
3. Tablet and smaller: stay usable through tabs. No layout work targets them.

Out of scope: a 3D renderer, the airfield definition of #254, target overlap
between neighbouring controls (Decision 7).

## 2. The switch rule

**Combined when every view, at the size the combined layout gives it, is at
least as wide as its legibility floor. Tabs otherwise.**

- A view's **legibility floor** is the narrowest rendered width, in CSS px, at
  which every check of the existing legibility suite holds for that view:
  every touch target at least `--size-target`, no placard overfull, every
  placard, face legend and backdrop legend at least `--text-2xs` (with the
  suite's existing half-pixel tolerance), and, new, every button of an
  installed device at least `--size-target`.
- The aircraft declares each floor as data (§3). The number is owned by a
  test, `apps/web/e2e/floors.spec.ts`, which renders every view at exactly its
  declared floor and runs the legibility checks there. A floor set too low
  fails that test; one set needlessly high only costs combined-layout reach.
- At runtime the decision is arithmetic, never a DOM probe: from the size of
  the cockpit region, compute the uniform scale of the arrangement, the
  contain-fit width of each view inside its cell, and compare with the floors.
  This is a pure function, `chooseLayout`, unit-tested on its own.

Why declared floors and not a computed rule: what makes a view illegible lives
in four places the web app cannot see without rendering (widget hit geometry
in panel-kit, placard fitting, lettering inside self-drawn SVGs, device screen
buttons). A probe would have to render the combined layout to decide whether
to render it, and would flicker on resize. The floors are the same facts,
measured once per change by a test, so the rule stays measured and the runtime
stays a comparison.

The region measured is the same element in both layouts (the cockpit section
below the outside view, its height running to the viewport bottom less the
existing reserve), so switching layout never changes the input of the rule and
the choice cannot oscillate. The tab bar's height is only subtracted in the
tabs layout, which makes combined the easier of the two to satisfy, never the
harder.

An aircraft without an arrangement always uses tabs. Both registered aircraft
get one.

## 3. Contract addition

A new optional top-level key `cockpit` on `AircraftDefinition`, in
`packages/core/src/contract/types.ts`. It is independent of the airfield key
#254 adds; the two never share a type, a validator rule or a test.

```ts
export type CockpitCell = {
  /** Where the view sits in the cockpit arrangement; the view is contain-fit inside it. */
  readonly rect: Rect;
  /** Narrowest rendered width, in CSS px, at which the view stays legible and operable. Owned by the floor test. */
  readonly minWidth: number;
};

export type CockpitLayout<V extends string> = {
  /** The arrangement's coordinate space, origin 0,0. Its unit is the author's; only proportions matter. */
  readonly size: ViewSize;
  readonly views: { readonly [K in V]: CockpitCell };
};

// AircraftDefinition gains:
readonly cockpit?: CockpitLayout<NoInfer<V>>;
```

- `views` is keyed by view id with the `NoInfer<V>` pattern `devices` already
  uses, so a missing or unknown view id fails to type-check in the aircraft
  package.
- The arrangement is spatial, not to scale. Each cell has its own scale: the
  radio stack and GPS need far more screen per image unit than the panel, so a
  physically uniform scale would make the panel huge. Cells keep the
  left-seat relationships (what is above, below, left, right).
- `minWidth` sits in the arrangement and not in `ViewDefinition` because it is
  a fact about putting the view on a screen next to others; the view itself
  stays a pure image-and-placements description (§4.3 of the spec).
- `contractVersion` does not change: the key is optional and older aircraft
  stay valid.

**Validator** (`packages/core/src/validator/validate-aircraft.ts`), new
finding codes, each with a test:

| Code | When |
|---|---|
| `invalid-cockpit-size` | `size` not a positive, finite width and height |
| `missing-cockpit-view` | a view of the aircraft has no cell (runtime check of what the type enforces, for untyped callers) |
| `unknown-cockpit-view` | a cell names no view |
| `cockpit-cell-outside` | a cell leaves `size` |
| `cockpit-cells-overlap` | two cells overlap |
| `invalid-cockpit-min-width` | `minWidth` not a positive, finite number |

The demo keeps working: it gains an arrangement in its `index.ts`, and the
validator test of every registered aircraft covers it.

## 4. Arrangements

The cockpit order a pilot in the left seat reads: panel ahead, the centre
field below its middle, the console between the seats, the radio stack and
GPS to the right of the pilot's instruments.

**CTSL**, five views:

```
+--------------------------------+-----------+
| panel                          | gps       |
+----------------+---------------+-----------+
| centre field   | console       | radios    |
+----------------+---------------+-----------+
```

The panel spans above the centre field and the console; the GPS and the radio
stack form a column on the right. The exact cell rects are sized to each
view's aspect, so contain-fit wastes no width.

**Demo**, three views: panel above the console, the radio stack to the right.

```
+--------------------+-----------+
| panel              |           |
+--------------------+  radios   |
| console            |           |
+--------------------+-----------+
```

DOM order of the cells is the reading order above (left to right, top to
bottom), which is also the keyboard Tab order.

## 5. Fit budget at HD — evidence and the work it implies

Evidence at the time of this design, from a width sweep of each view in the
tabs layout on `develop` (the floor test owns these numbers from now on):

| Aircraft | View | Floor (rendered width) | Bound by |
|---|---|---|---|
| Demo | panel | ≈ 654 | a placard overfull |
| Demo | console | ≈ 504 | a placard overfull |
| Demo | radio stack | ≈ 644 | device button size |
| CTSL | panel | ≈ 684 | breaker face and backdrop lettering |
| CTSL | radio stack | ≈ 594 | device button size |
| CTSL | GPS | ≈ 544 | device button size |
| CTSL | centre field | ≈ 604 | backdrop, ignition and BAT face lettering |
| CTSL | console | ≈ 664 | trim and brake face lettering |

The cockpit region at 1920x1080, with the header, the outside-view strip and
the checklist column as they are today, is about 1520 x 787 CSS px. Packing
the floors into the arrangements of §4:

- **Demo** fits with headroom (uniform scale ≈ 1.16 at HD, ≈ 2.6 at 4K).
- **CTSL** does not fit today: the §4 arrangement needs ≈ 1894 x 721 at its
  floors, so the region allows a scale of ≈ 0.80. Even the best packing of the
  five floors without left-seat constraints reaches only ≈ 0.86 with today's
  chrome. At 4K the CTSL fits (≈ 1.8).

Only the bottom row binds. At the floors, centre field, console and radio
stack side by side are ≈ 1894 wide, while the panel and GPS above them need
only ≈ 1244, and the height has slack (≈ 721 of 787). So combined CTSL at HD
needs the floors of those three views lowered by about a quarter; the panel
and GPS keep theirs, since lowering them gains nothing at HD. Both binding
kinds are in self-drawn or own-package art, so this is content work, not a
chrome compromise:

- **Lettering-bound views** (CTSL centre field, console): raise the smallest
  lettering in their backdrops and control faces so those floors drop to
  ≤ 0.75 of today. Lettering is self-drawn (G1 safe); the cockpit still looks
  like the aircraft, with slightly larger legends.
- **Device-bound view** (CTSL radio stack): make the device screen buttons of
  `device-sl40` and `device-gtx327` keep `--size-target` at a smaller rendered
  device width, by laying the buttons out larger in the device's own space
  (not by a CSS minimum, which would make neighbouring buttons overlap).
  Target: that floor ≤ 0.75 of today.

With both, the CTSL arrangement reaches a uniform scale of about 1.05 at HD.
The floor test is the judge; the HD layout test (§9) fails until it holds.

The chrome stays as it is (Decision 3). If the floor work falls short, the
fallback is an owner question (Open question 1), not a silent compromise.

## 6. Outside view and checklist

- **Outside view:** stays a strip above the cockpit, full width of the main
  column, as today. From the left seat the windscreen is above the glareshield,
  so the strip completes the left-seat picture rather than competing with it.
  Its height rule is unchanged.
- **Checklist:** stays the side column at desktop widths (≥ the existing
  `DESKTOP_MIN_WIDTH`), always visible, as today. Guided mode depends on the
  current item being in sight while the pilot looks for the control, and the
  combined layout removes the reason it ever had to move (the view switch).
  Below desktop width it remains the drawer.
- The two layout decisions are independent: the shell layout (`desktop` or
  `tablet`, by width) places the chrome; the cockpit layout (`combined` or
  `tabs`, by the rule of §2) fills whatever region the chrome leaves.

## 7. Tablet landscape

No special case: the rule decides. At 1024x768 the cockpit region is far below
either arrangement's floors (demo scale ≈ 0.5, CTSL ≈ 0.35 at today's floors),
so tablets, landscape and portrait, keep tabs. That matches the owner's
priority; a tablet-specific arrangement is not designed.

## 8. Rendering in `apps/web`

`apps/web` stays aircraft-agnostic: it reads `aircraft.cockpit` and the view
records only.

- `panel/cockpit-layout.ts` (new): `chooseLayout(cockpit, views, region)`
  returns `{ kind: 'tabs' }` or `{ kind: 'combined', scale, cells }` with each
  cell's rect in CSS px and its view's contain-fit width. Pure, unit-tested.
- `panel/use-cockpit-layout.ts` (new): measures the region (ResizeObserver
  plus window resize, as `usePageTop` does) and calls `chooseLayout`.
- `PanelArea.tsx`: in `tabs`, unchanged. In `combined`, no tablist; one
  absolutely positioned cell per view inside a `.cockpit` box sized to the
  arrangement, each cell a `PanelView` with its own surface, stage, zoom,
  device layer and overlay. Every view region carries `data-view="<id>"` and
  `aria-label` with the view name; in tabs the single tabpanel carries
  `data-view` too, so tests locate views the same way in both layouts.
- `panel/fit.ts` and `panel.css`: the stage's contain-fit takes its box from
  the cell in `combined` instead of the viewport height.
- `panel/active-view.tsx`: `ActiveView` gains `visible(viewId): boolean`. In
  tabs only the selected view is visible and `setView` switches; in combined
  every view is visible and `setView` does nothing.
- `modes/PanelOverlay.tsx`: `GuidedOverlay` switches view only when the
  target's view is not visible, and moves focus only from the overlay of the
  view that holds the target. The ring already appears only where
  `targetBox` finds the target, so in combined exactly one cell rings.
- Zoom stays per view: a pinch or zoom key zooms that cell, clipped to it; the
  reset button appears when any cell is zoomed and resets all.
- `shell/TrainerLayout.tsx`, `shell/shell.css`: the panel section passes its
  measured region to `PanelArea`; the shell sets `data-cockpit-layout` for
  tests and styles. No change to header, outside view or checklist placement.
- Colours, spacing and sizes come from `tokens.css` only; the cells use the
  existing panel surface tokens; no brand colour on the panel.

## 9. Checks

**Unit (Vitest)**

- `chooseLayout`: picks combined exactly when every view's fitted width
  reaches its floor; tabs one CSS px below; no arrangement → tabs; scale and
  cells for a known arrangement.
- Validator: one test per finding code; both registered aircraft pass.
- `PanelArea` in combined: every view rendered once with `data-view`, no
  tablist, cells in arrangement order; Guided in combined never calls
  `setView` and focuses the target in its own cell; keyboard zoom affects one
  cell.
- `printed-labels.test.tsx` and the other panel contract tests run unchanged.

**Browser (Playwright)**

- `layout.spec.ts` (new), at **1920x1080** and **3840x2160**,
  `deviceScaleFactor: 1`, both aircraft: `data-cockpit-layout="combined"`; no
  tablist; every view region fully inside the viewport and no page scroll;
  each view's rendered width ≥ its `minWidth`; the CTSL engine start in Guided
  holds the key on START while the tachometer is visible (#226). At 1024x768
  and 768x1024: tabs.
- `floors.spec.ts` (new): for every aircraft and view, a viewport at which the
  tabs layout renders the view at its declared `minWidth`, then the shared
  legibility checks, including device buttons.
- `placards.spec.ts` and `lettering.spec.ts`: add 1920x1080 and 3840x2160 to
  their viewports; locate views by `data-view` and click a tab only when a
  tablist exists, so the same assertions run in both layouts. Their geometry
  and lettering checks move into a shared `e2e/legibility.ts` used by both and
  by `floors.spec.ts`.
- `trainer.ts`: a `showView(page, viewId)` helper that clicks the tab in tabs
  and does nothing in combined. The default Playwright viewport (1280x800)
  stays tabs for both aircraft, so specs that click tabs today are unaffected.

**Manual (`ui-verifier`)**: 1920x1080 and 3840x2160 for both aircraft, light
and dark, each mode; one tablet size to confirm tabs still work.

## 10. Decisions

1. **Rule = declared per-view floors, verified by a test; runtime is
   arithmetic.** Reason: legibility depends on rendering facts the app cannot
   compute without rendering; a probe would flicker. Quality sacrificed: none
   ranked; a floor needs a test run to update (maintainability, rank 5).
2. **The arrangement is a new optional `cockpit` key, separate from views and
   from #254's airfield.** Reason: keeps views pure, keeps the two concurrent
   contract changes independent, and old aircraft valid.
3. **Chrome unchanged at desktop: outside strip on top, checklist column at
   the side.** Reason: Guided needs the checklist in sight (Training UX, rank
   2); the strip is the windscreen of the left-seat picture.
4. **CTSL fits HD by lowering the floors that bind its arrangement (centre
   field, console, radio stack: larger self-drawn lettering, larger device
   buttons), not by shrinking chrome.** Reason: the measured budget shows the
   CTSL ≈ 20 % short, all of it in the bottom row; both binding kinds are our
   own art. Quality
   sacrificed: a little panel realism (legend size, rank 2 realism) for
   operability (rank 2 accessibility); named in that PR.
5. **Tablets keep tabs; no tablet arrangement.** Reason: owner priority; the
   rule already yields tabs there.
6. **Zoom stays per view in combined.** Reason: least change; a pinch on one
   unit is what a pilot means.
7. **Target overlap is not part of the rule.** The sweep shows neighbouring
   44 px targets overlapping when a placement is narrower than the target
   (CTSL breakers, the demo's three-position annunciator rocker), in the tabs
   layout today. The owner's rule does not include it and adding it would
   raise the floors past any HD fit. Recorded for a separate issue.
8. **4K means 3840x2160 CSS px at DPR 1.** Reason: that is the case with the
   most room; DPR 2 is the HD case.

## 11. Open questions

1. If the CTSL floor work cannot reach the HD budget without making the panel
   look wrong, which chrome yields first: the checklist as a collapsible
   column at HD, or the outside view folded into the checklist column? (Either
   alone gains less than the floor work; the plan does not assume one.)
2. Target overlap (Decision 7): its own issue, and should the floor test
   gain a no-overlap check once the art allows it?
