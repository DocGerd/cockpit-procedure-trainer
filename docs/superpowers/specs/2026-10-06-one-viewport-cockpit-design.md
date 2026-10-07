# One-viewport cockpit — Design

Status: proposed 2026-10-06, revised for the device dock (#339, M11) · Issue #253 · Parent spec:
`2026-10-05-cockpit-procedure-trainer-design.md` §4.3, §5 (Screen), §9.

## 1. Goal

On a desktop viewport the pilot sees the whole cockpit at once: the panel, the
centre field, the centre console and one device dock under the panel, no tab
switching to fly any procedure. Holding the key on START while watching the rpm
(#226) then works on desktop. Tabs stay for viewports where the combined
cockpit would be too small to read and operate.

The avionics devices do not each get a view. Every device slot in the panel
shows a live read-only mirror of its device; activating a slot opens the
operable device in the dock (§4a). One dock, one device at a time, is what lets
the panel stay large enough to read.

Target sizes, in this order (ADR-0002, owner comment on #253):

1. **HD, 1920x1080 CSS px.** The arrangement is designed for it.
2. **4K, 3840x2160 CSS px** at device pixel ratio 1. The same arrangement,
   scaled up. A 4K monitor at 200 % OS scaling reports 1920x1080 CSS px and is
   the HD case, rendered sharper.
3. Tablet and smaller: stay usable through tabs. No layout work targets them.

Out of scope: a 3D renderer and the airfield definition of #254. In-slot
operation of a device on a large viewport (#340) is not built; §4a keeps it
possible.

## 2. The switch rule

**Combined when every view, at the size the combined layout gives it, is at
least as wide as its legibility floor. Tabs otherwise.**

- A view's **legibility floor** is the narrowest rendered width, in CSS px, at
  which every check of the existing legibility suite holds for that view:
  every touch target at least `--size-target`, no placard overfull, every
  placard, face legend and backdrop legend at least `--text-2xs` (with the
  suite's existing half-pixel tolerance). A device's own floor is separate:
  the smallest size at which its Screen keeps every button at least
  `--size-target` (§4a).
- The aircraft declares each floor as data (§3). The number is owned by a
  test, `apps/web/e2e/floors.spec.ts`, which renders every view at exactly its
  declared floor and runs the legibility checks there. A floor set too low
  fails that test; one set needlessly high only costs combined-layout reach.
- At runtime the decision is arithmetic, never a DOM probe: from the size of
  the cockpit region, compute the uniform scale of the arrangement, the
  contain-fit width of each view inside its cell, and compare with the floors.
  The dock's `minWidth` is compared the same way. The dock must meet the
  widest device floor in both width and height; a test in
  `apps/web/src/aircraft-validation.test.ts` checks that, because device floors
  come from the web device registry. `floors.spec.ts` keeps checking rendered
  touch targets and lettering.
  This is a pure function, `chooseLayout`, unit-tested on its own.

Why declared floors and not a computed rule: what makes a view illegible lives
in places the web app cannot see without rendering (widget hit geometry
in panel-kit, placard fitting, lettering inside self-drawn SVGs, and the device
screen buttons that the dock's floor covers). A probe would have to render the combined layout to decide whether
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
  /** Where the device dock sits; its `minWidth` is at least the widest device floor. Not a view. */
  readonly dock?: CockpitCell;
};

// AircraftDefinition gains:
readonly cockpit?: CockpitLayout<NoInfer<V>>;
```

- `views` is keyed by view id with the `NoInfer<V>` pattern `devices` already
  uses, so a missing or unknown view id fails to type-check in the aircraft
  package.
- The arrangement is spatial, not to scale. Each cell has its own scale, and
  the dock is its own cell, not an entry of `views`, so a device never needs a
  view of its own.
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
| `invalid-cockpit-cell-rect` | a cell's `rect` missing, or `x`/`y` not finite, or `w`/`h` not positive and finite |
| `cockpit-cell-outside` | a cell leaves `size` |
| `cockpit-cells-overlap` | two cells overlap |
| `invalid-cockpit-min-width` | `minWidth` not a positive, finite number |
| `invalid-cockpit-dock` | `dock` present but its `rect` or `minWidth` malformed, outside `size`, or overlapping a view cell |

The dock is optional in the contract so aircraft without one stay valid. A
test, not the validator, checks that the dock's `minWidth` reaches the floor of
every installed device (`apps/web/src/aircraft-validation.test.ts`).

The demo keeps working: it gains an arrangement in its `index.ts`, and the
validator test of every registered aircraft covers it.

## 4. Arrangements

The panel with the device dock under it; the centre field and the console
stacked on the right.

**CTSL**, three views and the dock:

```
+--------------------+-----------+
| panel              | centre    |
|                    | field     |
+--------------------+-----------+
| device dock        | console   |
+--------------------+-----------+
```

**Demo**, two views (panel, console) and the dock: the panel with the dock
under it, the console to the right. It has no centre field. The demo's radios
are an original, self-drawn radio section on its panel artwork, with its own
printed labels; it has no `avionics` view.

DOM order of the cells is the reading order above (left to right, top to
bottom).

## 4a. Device dock and slot mirrors

- **Slot.** Each installed device sits in a slot on a panel view. The slot
  shows the device's read-only Display as a live mirror, its unit name printed
  on the bezel (never "open"), and is one activation target of at least
  `--size-target`. Its accessible name is the unit name and the device readout.
- **Dock.** One non-modal region, under the panel, holding one device at a
  time. Activating a slot opens its operable Screen there; activating another
  swaps; a close button
  empties it. It starts empty, with a hint that is chrome text, never on the
  panel. The Screen renders at its floor size or larger.
- **Guided.** The device the current step targets opens in the dock and its
  slot is ringed; no view switches. Practice opens and rings nothing; in every mode, activating a
  slot docks its device. In Free explore the docked device's keys operate only
  under the existing operate-freely rule, as panel controls do.
- **Device exports.** Each device exports its Screen, a read-only Display sized
  for the slot's aspect, a `readout` text and a `floor` (the smallest size at
  which its Screen meets `--size-target`). The mirror frame scales with the
  slot; its lettering stays at least `--text-2xs` at the panel floor.
- **`slotMode(slotBox, floor, option)`** is a pure rule returning `mirror` or
  `operable` by contain-fit of the floor in the slot. In this version the
  option is off and it always returns `mirror`, so in-slot operation on large
  viewports (#340) stays possible without a layout change.
- **Tabs layout.** The dock sits below the tab panel and is shared across
  tabs.

## 5. Fit budget at HD

The floor test owns the numbers. Constraints this design sets:

- The CTSL panel floor is 950 px rendered width. The four breaker-row
  target-overlap acceptances of the CTSL are dropped; the panel is laid out
  and sized to have none.
- The panel and the dock share the left column, the centre field and the
  console stack in the right column, and all cells must reach their floors in
  the cockpit region at HD. The dock cell must also reach the widest device
  floor, in width and height.
- The radio stack and GPS views no longer exist, so their device-button floors
  apply only to the dock, where the Screen renders at its own floor size.

The HD layout test (§9) fails until it holds. The chrome stays as it is
(Decision 3). Where the floors cannot be met at full strip height, the outside
view folds (§6) before the layout falls back to tabs, so a browser window on a
1080p screen, which is shorter than the screen, still shows the whole cockpit.

## 6. Outside view and checklist

- **Outside view:** stays a strip above the cockpit, full width of the main
  column, at its usual height. Where the cockpit would otherwise fall below a
  floor, the strip folds: it shrinks, down to a thin band without caption, by
  just as much as the cockpit needs, and pulls closer to the cockpit. The fold
  is part of the switch rule: `outsideViewBand` asks `chooseLayout` how much
  height the cockpit needs, from the region the unfolded strip leaves, so the
  strip's own height is never an input and the choice cannot oscillate. The
  strip folds only if folding it reaches combined; otherwise it stays whole and
  the layout is tabs.
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
either arrangement's floors, so tablets, landscape and portrait, keep tabs.
That matches the owner's priority; a tablet-specific arrangement is not designed.

## 8. Rendering in `apps/web`

`apps/web` stays aircraft-agnostic: it reads `aircraft.cockpit` and the view
records only.

- `panel/cockpit-layout.ts` (new): `chooseLayout(cockpit, views, region)`
  returns `{ kind: 'tabs' }` or `{ kind: 'combined', scale, cells, dock }` with
  each cell's rect in CSS px and its view's contain-fit width, and the dock's
  rect. Pure, unit-tested.
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
- `Dock.tsx` (new) and `panel/slot-mode.ts` (new): the dock and the pure
  `slotMode` rule of §4a. The dock context turns the slot mirrors on; without
  it a device layer keeps drawing the operable Screen.
- `modes/PanelOverlay.tsx`: `GuidedOverlay` switches view only when the
  target's view is not visible, and moves focus only from the overlay of the
  view that holds the target. A device target resolves to its slot and device,
  not to a view. The ring already appears only where
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

- `chooseLayout`: picks combined exactly when every view's and the dock's
  fitted width reaches its floor; tabs one CSS px below; no arrangement → tabs; scale and
  cells for a known arrangement.
- Validator: one test per finding code; both registered aircraft pass. Every
  installed device's floor fits the aircraft's dock cell.
- `slotMode`: always `mirror` with the option off, `operable` once the floor
  fits the slot with it on.
- `PanelArea` in combined: every view rendered once with `data-view`, no
  tablist, cells in arrangement order; Guided in combined never calls
  `setView` and focuses the target in its own cell; keyboard zoom affects one
  cell.
- `printed-labels.test.tsx` and the other panel contract tests run unchanged.

**Browser (Playwright)**

- `layout.spec.ts` (new), at **1920x1080** and **3840x2160**,
  `deviceScaleFactor: 1`, both aircraft: `data-cockpit-layout="combined"`; no
  tablist; every view region fully inside the viewport and no page scroll;
  each view's rendered width ≥ its `minWidth`; the dock empty with its hint,
  then holding each device; the CTSL engine start in Guided
  holds the key on START while the tachometer is visible (#226). At 1024x768
  and 768x1024: tabs.
- `floors.spec.ts` (new): for every aircraft and view, a viewport at which the
  tabs layout renders the view at its declared `minWidth`, then the shared
  legibility checks.
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
   2); the strip is the outside view above the cockpit.
4. **Devices live in one dock under the panel; the panel slots mirror them
   (#339).** The CTSL has three views (panel, centre field, console) plus the
   dock, the demo two (panel, console); the `radios` and `gps` views are removed, and the demo gets a
   self-drawn radio section in place of its `avionics` view. Reason: five
   views side by side could not reach their floors at HD; one device at a time
   needs far less area. Quality sacrificed: operating a device in place on the
   panel (Training UX, rank 2) for a readable panel (rank 2); #340 may bring
   it back on large viewports.
5. **Tablets keep tabs; no tablet arrangement.** Reason: owner priority; the
   rule already yields tabs there.
6. **Zoom stays per view in combined.** Reason: least change; a pinch on one
   unit is what a pilot means.
7. **Target overlap is checked at the floors but does not set them.** The floor
   test fails when two operable targets of a view overlap, each taken as its
   rendered box grown to at least the touch target around its centre, whether
   positions of one control or two controls (#271). Overlaps that spacing can
   remove are fixed. The rest, the positions of small multi-position controls,
   would need higher floors and so the
   loss of the HD fit; `apps/web/e2e/floors.spec.ts` accepts each by name with
   what a tap loses there (a position only partly tappable, or its centre
   landing on the next position) and fails once an accepted overlap is gone.
   The four CTSL breaker-row acceptances are dropped (#339): the CTSL panel
   floor is raised to 950 px instead. Quality sacrificed: none ranked beyond
   the existing acceptances.
8. **4K means 3840x2160 CSS px at DPR 1.** Reason: that is the case with the
   most room; DPR 2 is the HD case.

## 11. Open questions

1. ~~Which chrome yields first when the floors cannot be met at HD?~~ Decided
   (#388): the outside strip folds to a thin band (§6) before the layout falls
   back to tabs; the checklist column and the header and footer stay. Decision 3
   holds: the strip stays on top, only its height folds.
2. ~~Target overlap (Decision 7): its own issue, and should the floor test
   gain a no-overlap check once the art allows it?~~ Superseded: the floor
   test checks it, with the remaining overlaps accepted by name (Decision 7).
