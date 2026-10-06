# M7 One-viewport Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a 1920x1080 desktop (and at 3840x2160) both aircraft show every cockpit view at once in a left-seat arrangement; smaller viewports keep view tabs; the switch follows the measured legibility floors.

**Design:** `docs/superpowers/specs/2026-10-06-one-viewport-cockpit-design.md` (all sections). Parent spec §4.3, §5 Screen, §8, §9.

**Issue:** #253. The work does not fit one PR: three tasks, three PRs. Tasks 1 and 2 need their own issues (the orchestrator files them before dispatch, `Refs #253` in each); Task 3 closes #253. A separate issue records target overlap (design Decision 7); no task here.

**Tech stack:** as M6. No new dependency.

## Pre-flight checks

**(a) #254 runs concurrently** and adds an airfield key to `AircraftDefinition`. Task 1 adds `cockpit`, a different optional key. Both edit `packages/core/src/contract/types.ts` and the validator; they touch different lines and different finding codes. Whichever lands second takes the other through the merge train; neither renames or moves shared code.

**(b) Default e2e viewport is 1280x800.** At that size both aircraft stay in tabs (design §5), so specs that click tabs today keep working through Task 3 without edits beyond the ones listed.

**(c) Floors are measured, not guessed.** Task 1 sets each `minWidth` by running `floors.spec.ts` at decreasing values until it fails, then keeps the last passing value. The design's §5 table is the starting point, not the answer.

**(d) The CTSL does not fit HD until Task 2 lands.** Task 3's HD assertion for the CTSL fails before Task 2; merge order is 1 → 2 → 3.

## Global constraints

- Everything in the M6 plan's Global Constraints applies (base `develop`, one issue per PR, fragments, separate-agent review via `pr-selfreview`, `merge-train`, tests first, the gate before every push: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`).
- Each task's **Files** list is its complete allowlist; a task that needs another file stops and reports.
- Colours, type and spacing from `apps/web/src/styles/tokens.css` only; no brand or status colour on the panel; every control keeps its printed label (`printed-labels.test.tsx`).
- Comments only where the code cannot say it; no measured figure in a comment (point to `floors.spec.ts`).
- E2E runs at 1920x1080 and 3840x2160 use `deviceScaleFactor: 1`.

## Dependency graph

```
Task 1 (contract, arrangements, floors, legibility helpers)
  ├── Task 2 (CTSL and device floors)      ─┐
  └── Task 3 (web combined layout, #253)  ──┴── merge after Task 2
```

Tasks 2 and 3 share no file and can run in parallel after Task 1.

---

### Task 1: Cockpit arrangement in the contract, floors and their test — wave 1

**Files:**
`packages/core/src/contract/types.ts`, `packages/core/src/contract/index.ts`, `packages/core/src/index.ts` (exports only), `packages/core/src/contract/fixtures.ts`, `packages/core/src/validator/validate-aircraft.ts`, `packages/core/src/validator/validate-cockpit.test.ts` (create), `packages/aircraft-demo/src/index.ts`, `packages/aircraft-demo/src/index.test.ts`, `packages/aircraft-ctsl/src/cockpit.ts` (create), `packages/aircraft-ctsl/src/index.ts` (one key), `packages/aircraft-ctsl/src/index.test.ts`, `apps/web/e2e/legibility.ts` (create), `apps/web/e2e/floors.spec.ts` (create), `apps/web/e2e/placards.spec.ts`, `apps/web/e2e/lettering.spec.ts`, `docs/adding-an-aircraft.md`, `changelog.d/<issue>.added.md`

**Goal:** the `cockpit` key exists, is validated, both aircraft declare an arrangement with honest floors, and a test proves each floor. Rendering does not change.

- [ ] **Step 1: Failing validator tests** in `validate-cockpit.test.ts`, one per finding code of design §3 (`invalid-cockpit-size`, `missing-cockpit-view`, `unknown-cockpit-view`, `cockpit-cell-outside`, `cockpit-cells-overlap`, `invalid-cockpit-min-width`), plus: an aircraft without `cockpit` has no cockpit finding; cells that touch at an edge do not overlap.
- [ ] **Step 2: Contract types** `CockpitCell`, `CockpitLayout<V>` and `cockpit?: CockpitLayout<NoInfer<V>>` on `AircraftDefinition` exactly as design §3; export them. A type test (`@ts-expect-error`) in the fixture tests: a cell for an unknown view, and a missing view, fail to compile. `CONTRACT_VERSION` unchanged.
- [ ] **Step 3: Validator** until Step 1 is green.
- [ ] **Step 4: Shared legibility helpers.** Move the in-page geometry of `placards.spec.ts` (placard text, overfull, inside placement, not under a control, touch targets, clear of moving parts) and of `lettering.spec.ts` (backdrop and face lettering scale, face aspect) into `e2e/legibility.ts`, scoped to a view root (`[data-view="<id>"]` when present, else the tabpanel). Add `deviceTargets(root)`: every button inside `[data-kind="device"]` at least `--size-target`. Both specs keep their viewports and pass unchanged.
- [ ] **Step 5: Failing floor test** `floors.spec.ts`: for each registered aircraft with `cockpit` and each view, find the viewport width (fixed tall height, tabs layout) at which `.panel-image` renders at `minWidth` (binary search, rendered width within one CSS px at or above `minWidth`), then run every helper of Step 4 on that view in English and German. Fails until Step 6.
- [ ] **Step 6: Arrangements.** Demo in `index.ts`, CTSL in `src/cockpit.ts`, cells per design §4, rects sized to each view's aspect. Set each `minWidth` per pre-flight (c). Aircraft tests: `validateAircraft` stays empty; every view has a cell.
- [ ] **Step 7: Authoring guide.** A section in `docs/adding-an-aircraft.md`: what the arrangement is, that cells are spatial not to scale, and how to find a floor with `floors.spec.ts`.
- [ ] **Step 8: Fragment:** `Aircraft can describe their whole cockpit as one left-seat arrangement.`

**Definition of done:** validator, aircraft and floor tests green for both aircraft; `placards.spec.ts` and `lettering.spec.ts` unchanged in outcome; the app renders exactly as before (tabs everywhere).

---

### Task 2: Lower the CTSL legibility floors — wave 2

**Files:** `packages/aircraft-ctsl/src/assets/view-panel.svg`, `view-centre.svg`, `view-console.svg`, the CTSL control face SVGs under `packages/aircraft-ctsl/src/assets/artwork/` whose lettering binds a floor, `packages/aircraft-ctsl/src/cockpit.ts` (`minWidth` values only), `packages/aircraft-ctsl/LICENSES.md` (if an entry's wording changes), the screen layout and screen tests of `packages/device-sl40`, `packages/device-gtx327`, `packages/device-gpsmap496`, `changelog.d/<issue>.changed.md`

**Dependencies:** Task 1.

**Goal:** every CTSL view's floor at or below three quarters of its Task 1 value, so the CTSL arrangement fits the HD cockpit region with the chrome unchanged (design §5).

- [ ] **Step 1: Failing test.** Lower each CTSL `minWidth` to three quarters of its Task 1 value; `floors.spec.ts` fails, naming the binding check per view.
- [ ] **Step 2: Lettering.** Raise the smallest legends of the binding backdrops and faces (`lettering.spec` names them) until the panel, centre-field and console floors pass. Keep each legend inside its plate and clear of moving parts (the face-legend clearance test); keep the panel looking like the aircraft.
- [ ] **Step 3: Device buttons.** In each device's own coordinate space, enlarge the screen buttons of the SL40, GTX 327 and GPSMAP 496 until the radio-stack and GPS floors pass. No CSS minimum size on device buttons (neighbours would overlap). Device screen tests updated for the new geometry.
- [ ] **Step 4: Re-measure** each `minWidth` downward per pre-flight (c); keep the lowest passing value.
- [ ] **Step 5: Fragment:** `Larger CT Supralight legends and avionics buttons, so the whole cockpit fits one HD screen.`

**Definition of done:** `floors.spec.ts` green at the new floors; `placards.spec.ts`, `lettering.spec.ts`, device specs green; `ui-verifier` confirms the panel still reads as the CTSL. The PR names the realism trade-off (design Decision 4).

---

### Task 3: Combined cockpit layout in the web app (Closes #253) — wave 2

**Files:** `apps/web/src/panel/cockpit-layout.ts` (create), `apps/web/src/panel/cockpit-layout.test.ts` (create), `apps/web/src/panel/use-cockpit-layout.ts` (create), `apps/web/src/panel/PanelArea.tsx`, `apps/web/src/panel/panel.css`, `apps/web/src/panel/fit.ts`, `apps/web/src/panel/active-view.tsx`, `apps/web/src/panel/panel.test.tsx`, `apps/web/src/panel/combined.test.tsx` (create), `apps/web/src/panel/touch-css.test.ts`, `apps/web/src/modes/PanelOverlay.tsx`, `apps/web/src/modes/*.test.tsx` (Guided overlay cases only), `apps/web/src/shell/TrainerLayout.tsx`, `apps/web/src/shell/shell.css`, `apps/web/src/shell/layout.test.tsx`, `apps/web/e2e/layout.spec.ts` (create), `apps/web/e2e/trainer.ts`, `apps/web/e2e/placards.spec.ts` and `apps/web/e2e/lettering.spec.ts` (viewport lists and tab handling only), `changelog.d/253.added.md`

**Dependencies:** Task 1; merges after Task 2.

**Goal:** design §8 and §9.

- [ ] **Step 1: `chooseLayout` tests** (`cockpit-layout.test.ts`): combined exactly when every view's contain-fit width in its cell reaches `minWidth`; tabs when one view is one CSS px short; tabs without `cockpit`; scale and cell rects for a fixture arrangement; a region of zero size gives tabs.
- [ ] **Step 2: Implement `chooseLayout`** (pure) and `useCockpitLayout` (region measured as design §2; ResizeObserver plus window resize).
- [ ] **Step 3: Failing component tests** (`combined.test.tsx`) with a stubbed layout of `combined`: every view rendered once inside `[data-view]` with its name as `aria-label`; no tablist; cells in arrangement order; each cell has its own device layer and overlay; zooming one cell leaves the others; the reset button resets all. In tabs (`panel.test.tsx`): the tabpanel carries `data-view`.
- [ ] **Step 4: `PanelArea` combined mode,** cell-driven stage fit in `fit.ts` and `panel.css`, until Step 3 is green; tabs path unchanged.
- [ ] **Step 5: Failing Guided tests:** in combined, a target in another view never calls `setView`, the ring shows only in the target's cell, focus moves to the target widget in its cell; in tabs, today's behaviour holds.
- [ ] **Step 6: `ActiveView.visible`** and the `GuidedOverlay` change until Step 5 is green.
- [ ] **Step 7: Shell.** `TrainerLayout` passes the region, sets `data-cockpit-layout`; header, outside view and checklist placement unchanged (`layout.test.tsx` asserts both shell layouts with both cockpit layouts).
- [ ] **Step 8: E2E.** `trainer.ts` gains `showView`. `placards.spec.ts` and `lettering.spec.ts` add 1920x1080 and 3840x2160 and use `showView`. `layout.spec.ts` per design §9: combined at both desktop sizes for both aircraft, every view inside the viewport, no page scroll, each view at or above its `minWidth`; CTSL engine start in Guided holding START with the tachometer visible (#226); tabs at 1024x768 and 768x1024.
- [ ] **Step 9: Fragment:** `On a desktop screen the whole cockpit shows at once, as from the left seat; small screens keep the view tabs.`

**Definition of done:** #253's three done-bullets: both aircraft combined at 1920x1080 and 3840x2160 with no tab switching needed for any procedure; tabs on small viewports by the rule; touch targets, placards, lettering and all existing e2e green in both layouts. `ui-verifier` at 1920x1080 and 3840x2160, light and dark, every mode, plus one tablet size.

## Review focus

1. The rule never measures the DOM of the layout it is deciding about; the region it reads is the same element in both layouts.
2. `apps/web` names no aircraft, view id or floor.
3. Guided in combined: exactly one ring, no view switch, focus lands in the right cell.
4. Every `minWidth` is backed by a green `floors.spec.ts` run at that value.
5. Task 2 keeps legends inside their plates and the panel recognisable.
