# 3D Cockpit View — Design

Status: Proposed — deferred by the owner on 2026-10-06, not approved; see #43.

Issue #43. Written 2026-10-06 as a design for a later 3D milestone.

Parent spec: `2026-10-05-cockpit-procedure-trainer-design.md` (§2 Cockpit view,
§4.3 Views). Quality order: `docs/adr/0002-quality-priorities.md`.

## Reconcile with the one-viewport cockpit first

This proposal predates the one-viewport combined cockpit (#253,
`docs/superpowers/specs/2026-10-06-one-viewport-cockpit-design.md`), which has
since shipped. Before any work starts it must be reconciled with that design:

- **Shared stage:** the combined layout renders each view as a `PanelView`
  cell inside `PanelArea.tsx`; #253 did not extract a separate `ViewStage`.
  The 3D view still needs the stage without the per-view zoom, so §10 point 1
  stands, but its extraction now starts from the shipped `PanelView` (with its
  `cellHeight` prop) and must keep the combined layout's tests green.
- **Presentation switch:** `tabs`, `combined` and `3d` become one choice in
  `PanelArea`, with the 3D switch overriding the viewport rule.
- **`cockpit` arrangement vs `frame3d`:** #253 added a top-level `cockpit`
  key with a 2D cell per view. Decide whether `frame3d` stays separate, is
  derived from, or replaces part of it, so the two never disagree.

Owner decision recorded 2026-10-06: the 2D/3D choice is not persisted.

## 1. Goal

The demo aircraft is operable in a 3D cockpit seen from the left seat, with
unchanged aircraft logic. The same aircraft package, control store, systems
runtime and checklist engine drive both the 2D panel and the 3D view; only the
presentation differs.

Done when:

- A pilot switches the cockpit between 2D and 3D in the app frame and flies
  every demo procedure in 3D in Guided, Practice and Free explore mode, by
  mouse, touch and keyboard.
- No file under `packages/core/src` outside `contract/` and `validator/`
  changes, and `packages/aircraft-demo` changes only by adding 3D data.
- Every contract test that holds for the 2D panel (printed labels, keyboard
  access, accessible names, Guided highlight) also holds in 3D.

Out of scope: modelled 3D geometry (meshes, glTF), lighting and shadows, a
right-seat or free camera, VR, the outside view drawn in the windshield, and
3D data for the CTSL (§12).

## 2. What exists

- `Placement` (`packages/core/src/contract/types.ts`) carries optional
  `position3d: Vec3` and `orientation: Vec3`. No unit, axis or rotation order
  is defined, no aircraft sets them (only `contract/fixtures.ts` and
  `apps/web/src/panel/test-aircraft.ts`), and the 2D renderer ignores them
  (`panel.test.tsx`, "ignore 3D position and orientation").
- Views have a name, an image and an optional coordinate `size`. Nothing
  places a view in space.
- `apps/web/src/panel/PanelArea.tsx` renders one view at a time in `tabs` and every view in `combined` (#253): a stage with
  the view image, one `ControlPlacement` or `IndicatorPlacement` per placed id
  (percent boxes from `rects.ts`), the `DeviceLayer` and the `PanelOverlay`
  (Guided ring, Free explore details), wrapped in a per-view zoom.
- Every control is a panel-kit React widget fed by `usePanelInput`
  (`apps/web/src/modes/panel-input.ts`), which calls `session.set`, `press`,
  `release`, `openGuard` and `closeGuard`, or selects the control in Free
  explore. Device screens are React DOM fed by `DeviceScreenProps.send`.
- The Guided overlay finds its target through `[data-placement]` in the DOM;
  Guided view switching goes through `ActiveViewContext.setView`.
- No Content-Security-Policy is set anywhere in the repo today (not in
  `index.html`, `vite.config.ts`, `public/` or the Pages workflow), although
  ADR-0002 G2 asks for a strict one.

## 3. Renderer technology

**Decision: CSS 3D transforms on the existing DOM panel. No 3D library, no
WebGL.**

Each view becomes a plane in cockpit space. The plane is the existing view
stage (image, placements, device layer, overlay) given a CSS `matrix3d`
transform; one scene root under a CSS `perspective` carries the camera. The
widgets inside are the same panel-kit components the 2D panel renders.

Options considered:

| Option                                                          | Licence / bundle                                                        | Offline, Pages             | Cost                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. CSS 3D on DOM planes (chosen)                                | none; a small pure geometry module                                      | nothing new to cache       | Planar surfaces only; no shading                                                                                                                                                                                         |
| B. three.js (MIT, checked with `pnpm view three license`), WebGL meshes and raycasting | a large new chunk, lazy-loadable; precached as `js` | works; WebGL in headless CI is a known source of flakiness | Every control becomes a mesh: keyboard access, accessible names, printed labels, device screens, Guided ring and Free explore rebuilt outside the DOM; mesh colours escape the `tokens.css` lint; geometry per aircraft |
| C. three.js shell in WebGL plus `CSS3DRenderer` for the widgets | as B                                                                    | as B                       | The DOM layer always draws above the canvas, so the shell cannot occlude a widget; a dependency for little visible gain over A                                                                                        |
| D. React Three Fiber (MIT)                                      | B plus a second React reconciler                                        | as B                       | As B, with a reconciler pinned to React releases                                                                                                                                                                         |

Reasons, in ADR-0002 order:

- **G1 Legal.** The 3D view draws only the aircraft's own self-drawn view
  images and widgets. No model files exist that could carry manufacturer
  geometry.
- **G2 Security.** No new runtime dependency, no third-party origin. CSS
  transforms need no `unsafe-eval` and no CSP change, so the missing CSP (§2)
  can be added later without touching this design.
- **1 Procedural correctness.** The 3D view calls the same `usePanelInput`
  handlers; there is no second input path that could diverge from 2D.
- **2 Training UX.** Printed labels, touch handling and the Guided highlight
  carry over because the widgets are the same DOM (keyboard operation, accessible
  names and reduced motion carry over too; accessibility ranks lowest in
  ADR-0002). Sacrificed: volumetric realism (a lever has no shaft, a knob no
  depth). Realism wins here, but the already-tested widget is kept for now, and B
  stays open for a later
  milestone because the 3D data in §5 is renderer-neutral.
- **3 Performance.** Camera moves change one transform on the scene root, set
  through a ref, so no widget re-renders while the pilot looks around. Nothing
  is added to the initial load.
- **4 Offline.** No new asset type; `precacheExtensions` is unchanged.
- **5 Maintainability.** One small pure package (§4) plus one presentation
  component in `apps/web`. No widget is written twice.

Constraints that follow from the choice:

- An element between the scene root and a plane must not set `overflow`
  other than `visible`, `filter`, `opacity` below 1, `clip-path`, `mask` or
  `isolation`, because each flattens `preserve-3d`. The 3D presentation has its
  own stage CSS for this reason; it does not reuse `.panel-stage`.
- Planes must not intersect. Browsers sort intersecting `preserve-3d` planes
  differently (WebKit splits them less reliably than Chromium). The authoring
  guide states the rule; the validator cannot see it, because it needs the
  rendered sizes.
- Browser hit-testing follows 3D transforms, so a click lands on the widget
  under the pointer. A widget that turns pointer coordinates into a value
  (`Lever`, from `clientY` against `getBoundingClientRect`) sees the projected
  bounding box of a tilted plane. The plan's interaction task tests a lever
  drag on the tilted console plane in a real browser. If the value mapping is
  not monotonic and does not reach both ends and every notch, panel-kit gains
  a `PointerSpace` context (default: identity) through which the 3D
  presentation supplies a client-to-plane mapping. The 2D panel is unaffected.

## 4. New package kind: `packages/cockpit-3d`

`@cpt/cockpit-3d` holds the cockpit geometry as plain data and pure functions:

- pose composition from the contract's `frame3d`, `position3d` and
  `orientation` (§5) to a 4x4 matrix, and to a CSS `matrix3d()` string in the
  scene's pixel space;
- the camera: eye at the origin, yaw, pitch and field of view, clamped;
- look-at: the yaw and pitch that centre a point, and the field of view that
  shows a box at a required minimum projected size;
- fit-all framing: the default yaw, pitch and field of view that show every
  plane;
- projection of a placement's corners to screen pixels, for the legibility
  checks and for `PointerSpace` if it is needed.

Boundaries, enforced by ESLint and proved in `tools/boundary.test.ts`:

- It imports `@cpt/core` only: no other workspace package, no UI (`react`,
  `react-dom`), no assets, no relative path into another package. The ESLint
  block mirrors core's.
- Its `tsconfig.json` sets `lib` without `DOM`, so a DOM global fails to
  type-check. This keeps it testable in Node and reusable by the #253 layout,
  which needs the same view geometry.
- `apps/web` imports it by name like `@cpt/panel-kit`. Aircraft, devices,
  `core` and `panel-kit` must not import it.

The React side (the 3D presentation, camera gestures, the switch) lives in
`apps/web/src/cockpit3d/`, because it composes `ControlPlacement`,
`DeviceLayer` and `PanelOverlay`, which depend on the trainer context. It is not
a package of its own: a package that needs the trainer context would have to
depend on `apps/web`.

CONTRIBUTING.md gains one bullet under "Package boundaries".

## 5. Contract additions (spec §4.3)

All additions are optional. An aircraft without them stays valid and 2D only.

```ts
/** Degrees. Applied as yaw about y, then pitch about x, then roll about z. */
export type Orientation = Vec3;

export type ViewFrame = {
  /** Cockpit position of the view's top-left corner (its 0,0), in metres. */
  readonly origin: Vec3;
  readonly orientation: Orientation;
  /** Metres covered by one unit of the view's coordinate space. */
  readonly scale: number;
};

// ViewDefinition gains:
readonly frame3d?: ViewFrame;
// Placement keeps position3d and orientation, now defined (below).
```

Coordinate system:

- Right-handed, metres. The origin is the left-seat design eye point. `x`
  points to the pilot's right, `y` up, `z` aft, so the pilot looks along `-z`.
- Orientation `{ x: 0, y: 0, z: 0 }` faces the pilot: the plane's normal is
  `+z`, image `x` runs along `+x`, image `y` along `-y`. Rotations are
  intrinsic in the order yaw (`y`), pitch (`x`), roll (`z`), the order CSS
  applies `rotateY() rotateX() rotateZ()`.
- A placement without `position3d` lies on its view's plane at its 2D rect.
- A placement with `position3d` is centred there, with its own `orientation`
  (the view's when absent), and keeps its rect's size scaled by the view's
  `scale`. This is for a part that stands off its view, such as a throttle
  quadrant above the console face.
- A device install's `placement` follows the same rules on its `view`.

Validator rules (spec §8), each with a test and an error code:

- `partial-3d`: some views have `frame3d` and others do not. 3D is offered
  only when every view has one.
- `position3d-without-frame`: a placement (control, indicator or device
  install) sets `position3d` or `orientation` on a view without `frame3d`.
- `invalid-frame`: `scale` not finite and positive, or any coordinate or angle
  not finite.

`CONTRACT_VERSION` stays 1: the change is additive and optional, nothing reads
the version to branch, and every existing aircraft validates unchanged.

`Placement.position3d`'s meaning changes from undefined to defined. No aircraft
sets it today, so nothing breaks; the two test fixtures that set it get values
that fit the new convention.

## 6. Interaction and the control store

Nothing in the control store, systems runtime or checklist engine changes.

- The 3D presentation renders the same `ControlPlacement`,
  `IndicatorPlacement`, `DeviceLayer` and `PanelOverlay` per view. Each
  `ControlPlacement` still gets its handlers from `usePanelInput`, through
  `useGatedInput`, so set, press and hold, release, guard open and close, spring
  return, momentary hold and Free explore selection behave exactly as in 2D.
- A pointer drag that starts on empty space or on a plane's background, not on
  a widget, looks around (§7). A drag that starts on a widget belongs to the
  widget. The touch gate keeps its role: a second finger turns the gesture into
  a camera pinch and cancels the widget's hold, as it does for the 2D zoom.
- Guided view switching calls `setView(viewId)`; in 3D, `setView` turns the
  camera to that view instead of swapping the stage.

## 7. Camera

- **Eye:** the left-seat design eye point, the origin of §5. No translation;
  the pilot turns their head, they do not move.
- **Default framing:** fit-all from `@cpt/cockpit-3d`, capped at a maximum
  field of view so the panel is not distorted. When a cockpit cannot fit under
  the cap, the default looks at the first view and the others are a look away.
- **Look around:** drag on empty space; arrow keys on the focused scene surface
  (the keys the 2D surface uses to pan); yaw and pitch clamped to a seated
  head's range.
- **Zoom:** wheel, pinch, and `+`, `-` on the surface narrow or widen the field
  of view; `0` resets to the default framing. These are the 2D surface's zoom
  keys; the surface keeps its role description, updated for 3D.
- **Look at views:** the view tabs stay and become look-at buttons: same names,
  same keyboard (arrows, Home, End), and the selected one is the view the
  camera faces. They keep Guided view switching and give a keyboard user a
  quick jump.
- **Follow focus:** when a control receives focus and its projected box is
  outside the viewport or below the legibility minimum (§8), the camera turns
  to it and, if needed, narrows the field of view until it meets the minimum.
- **Motion:** camera moves animate, except under `prefers-reduced-motion:
  reduce`, where they are instant. The reduced-motion hook the Guided overlay
  uses is shared, not copied.

## 8. Accessibility and keyboard parity

- **Same DOM, same order.** All views render at once in definition order, and
  within a view in placement order, so Tab reaches every control in 3D. This is
  the order #253's combined layout uses.
- **Legibility.** The #253 rule carries over: every operable control keeps a
  44 px target and every placard stays at the placard minimum. In 3D
  perspective shrinks far planes, so the rule applies to the focused or
  Guided-target control after follow-focus, not to every control at the
  default framing. A unit test computes projected sizes with
  `@cpt/cockpit-3d` for every 3D-capable registered aircraft at 1920x1080 and
  3840x2160.
- **Contract tests run in both presentations.** `printed-labels.test.tsx`,
  `keyboard.test.tsx` and the Guided and Free explore tests in
  `modes.test.tsx` are parameterised over `2d` and `3d`. A parity test asserts
  that both presentations expose the same set of controls with the same roles
  and accessible names.
- **Planes facing away** keep their widgets focusable; follow-focus brings them
  into view. `backface-visibility: hidden` hides only their drawing.
- **The scene** is the existing `tabpanel` surface with a role description and
  a hidden key hint, in German and English.

## 9. Switching 2D and 3D

- A two-option switch, "2D" and "3D", in the panel bar beside the view tabs.
  It is app frame, styled from `tokens.css`; it does not appear on the panel.
- It is shown only when the current aircraft is 3D-capable (every view has
  `frame3d`, §5). Picking an aircraft that is not shows 2D.
- The choice lives in trainer state for the session and is not persisted:
  spec §5 limits `localStorage` to language, theme and last aircraft. The owner
  decided on 2026-10-06 not to persist it.
- Switching keeps the session, mode, checklist and Free explore selection;
  only the presentation remounts. Focus moves to the switch.

## 10. Coexistence with #253 (one-viewport desktop layout)

#253 has shipped; this section was written while it was still a design and is
kept as the checklist for the reconciliation above. The presentation switch of
point 2 gains `3d` next to `tabs` and `combined`. #253 added its own `cockpit`
arrangement field, so the second branch of point 3 applies and the open choice
is the one named above.

1. **One view stage.** Both need a view's image, placements, devices and
   overlay as a component without the per-view zoom. The first implementation
   PR extracts `ViewStage` from `PanelView` in `PanelArea.tsx`; the other
   reuses it.
2. **One presentation switch.** `PanelArea` chooses a presentation: `tabs`
   (one view at a time, small screens), `combined` (#253, desktop) and `3d`.
   All three render `ViewStage` per view and share `ActiveViewContext`. The 3D
   switch overrides `tabs` and `combined`; turning it off returns to whichever
   the viewport rule picks.
3. **One spatial description, or two that do not conflict.** #253 needs the
   arrangement of views in a left-seat layout. `frame3d` already states where
   each view sits as seen from the left seat, so #253 may derive its 2D
   arrangement by projecting the frames with `@cpt/cockpit-3d`. If #253 instead
   adds its own arrangement field, this design does not read it, and neither
   design's validator rules may require the other's data.

The 3D view shows the whole cockpit in one viewport by construction, so it
also meets #253's goal on desktop for aircraft that have 3D data.

## 11. Asset policy

- **Self-made geometry only.** The geometry is the aircraft's own data
  (`frame3d`, `position3d`, `orientation`) and its own view images and
  artwork, which already follow `docs/content-policy.md`. No downloaded or
  purchased models, no manufacturer CAD, no photogrammetry of an aircraft.
- No model files in the first 3D release. If a later milestone adds them, they are modelled by
  the project, carry a licence note in the aircraft's `LICENSES.md`, and their
  extension is added to `precacheExtensions` in the same PR.
- The space around the planes is drawn with a new panel-hardware token in
  `tokens.css`; no colour literal is added elsewhere. Status inks and the brand
  accent stay off the planes, as on the 2D panel (spec §6.2).

## 12. Open questions

1. **CTSL in 3D.** Its intake record carries no cockpit dimensions, and
   aircraft facts come only from the intake. Adding 3D data for the CTSL needs
   measurements from the club's aircraft first; a follow-up issue, not part of the first 3D release.
2. **Persist the 2D/3D choice?** Settled by the owner: not persisted.
3. **Outside view in the windshield.** The first 3D release keeps the outside-view strip in the
   app frame. Drawing the phase image as a plane beyond the panel is possible
   with the same technique and is left for later.
4. **CSP.** G2 asks for a strict CSP, and none is set (§2). This design needs
   none of its relaxations, but the gap should get its own issue.

## 13. Spec changes proposed

This design changes one row of the parent spec's decisions table (§2). The
table is not edited here; the owner decides.

| Topic        | Current                                                                                                                                       | Proposed                                                                                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cockpit view | 2D layered panel now. The aircraft contract carries optional 3D positions so a 3D renderer is a later milestone, not a rewrite. | 2D layered panel, and a 3D cockpit view from the left seat that the pilot switches to. The 3D view places the same panel planes and widgets in space with CSS 3D transforms. The aircraft contract carries optional 3D frames per view and 3D poses per placement; an aircraft without them is 2D only. |

Checked and unchanged: the Stack row (no library is added; the panel stays
SVG in the DOM) and spec §5 Persistence (the 2D/3D choice is not persisted).
