# Adding an aircraft

An aircraft is one package, `packages/aircraft-<id>`, that depends on `@cpt/core` only. It describes the aircraft as data and pure
functions with `defineAircraft`; the app draws and runs it. `packages/aircraft-demo`
is the worked example: a fictional single-engine piston aircraft that uses every
control kind and every generic widget. Spec: section 4 of the design spec.

## Content policy

Read `docs/content-policy.md` first. Write every checklist and description in your
own words. Commit no handbook scans or copied handbook tables, and no manufacturer
artwork, logos or marketing images. Images are drawings made for this project or
photos by club members who agree to publication.

## Package layout

    packages/aircraft-<id>/
      package.json          name @cpt/aircraft-<id>, exports "." -> ./src/index.ts
      tsconfig.json         as in packages/aircraft-demo
      README.md             "## Source revision"
      LICENSES.md           one entry per image file
      src/index.ts          the defineAircraft call, exports the aircraft
      src/*.ts              controls, indicators, systems, text and image URLs
      src/assets/           view backgrounds, phase images, artwork
      src/index.test.ts     the aircraft's own tests

`package.json` depends on `@cpt/core` as `workspace:*` and nothing else; see
`packages/aircraft-demo/package.json`. ESLint enforces the boundary: an aircraft
imports `@cpt/core` only, never `@cpt/panel-kit`, a device or another aircraft. It
refers to widgets and devices by id.

Images are plain files next to the code. `src/assets.ts` in the demo turns each
into a URL with `new URL('./assets/view-panel.svg', import.meta.url).href`, and
`src/image-url.d.ts` declares the two types that needs, because the package pulls
in no bundler types. Copy both.

## Registering the aircraft

The app imports aircraft in `apps/web/src/aircraft-registry.ts` and nowhere else:

    import { demoAircraft } from '@cpt/aircraft-demo';
    import type { Aircraft } from '@cpt/core';
    import { myAircraft } from '@cpt/aircraft-<id>';

    export const aircraftRegistry: readonly Aircraft[] = [demoAircraft, myAircraft];

Add `"@cpt/aircraft-<id>": "workspace:*"` to `dependencies` in
`apps/web/package.json` and run `pnpm install` so the lockfile gains the
workspace entry. Ids must be unique in the registry.

From then on every registered aircraft is checked by `apps/web`'s own tests
(`aircraft-validation.test.ts`, `aircraft-widgets.test.ts`,
`procedure-walkthrough.test.ts`), with no change to them.

## The contract

`defineAircraft` takes one object. Every field below is required unless marked
optional, and the compiler checks references between them: a procedure item that
names an unknown control, or a position the control does not have, fails to
type-check. Declare controls in their own file as `as const satisfies ControlRecord`
so their literal positions survive the move, as `src/controls.ts` in the demo does.

    defineAircraft({
      id, name, handbookRevision,
      controls, indicators, views,
      devices,            // optional, see below
      systems, failures, phases, procedures,
    })

The handbook revision, names, descriptions, guard names, failure names, titles and
item texts are a `Text`, `{ de, en }`, and both languages must be non-empty. The
demo wraps it as `text(de, en)` in `src/text.ts`.

### Controls

`controls` maps an id to a definition with a `kind`, a `name` and `description`
(both `Text`), an `initial` position, an optional `appearance` and an optional
`placard` (see [Printed labels](#printed-labels)).

| `kind`      | `positions`                       | Notes                                            |
| ----------- | --------------------------------- | ------------------------------------------------ |
| `toggle`    | list of names                     | two or more fixed positions                      |
| `rotary`    | list of names                     | optional `springBack: { detent: rest }`          |
| `lever`     | `'continuous'` or a list of names | continuous takes a number 0 to 1 as `initial`    |
| `momentary` | `[rest, held]`                    | active only while held                           |
| `guarded`   | list of names                     | needs `guard: { name: Text }`, opened before use |
| `breaker`   | exactly `['in', 'pulled']`        | a failure can trip it                            |

A `springBack` detent returns to its rest position when released, as the demo's
`annunciator` does with `springBack: { test: 'bright' }`. The demo keeps the
magneto key, a `rotary`, and the starter, a `momentary`, as separate controls.

Any control may declare `interlock: { control, at, holds }`: while the other
control stands at `at`, the pilot cannot move this one away from `holds`. The
CTSL's closed fuel valve holds the ignition key at `off` this way. Only pilot
moves are refused (result `locked`), and the app frame names the holding control;
phase entries and failures move freely. The other control must be a different one.

### Indicators

`indicators` maps an id to `{ name, select, appearance }`. `select` reads a value
from the trainer state, `{ controls, systems, devices }`, and returns a number,
boolean or string; indicators hold no state. `appearance` is required.

### Systems

`systems` is `{ initial, step }`. `step(state, { controls, failures, environment,
dtMs })` is pure and returns the next state. `failures` is a set of the active
failure ids, `environment` the phase's `airspeedKt`, `altitudeFt` and `onGround`.
`@cpt/core` ships building blocks to compose: `electricalBus` and
`pistonEngineStart`, each `{ initial, step(state, inputs, dtMs) }`. The demo's
`src/systems.ts` feeds them from the control positions and derives gauge values
(`rpm`, `oilPsi`, `amps`) in the same state. Wrong operation needs no special
code: it fails to satisfy the rules, so the engine does not start.

When the aircraft is split over files, the types come from `@cpt/core` and your
own state and failure types. Declare the failure ids as a union, `type DemoFailure =
'alternatorFailure'`, and type the step as `SystemsDefinition<DemoState,
DemoFailure>['step']` with `StepInput<DemoFailure>`, so `failures.has(...)` only
accepts declared ids. Type each selector's argument as `TrainerState<DemoState>`
(the demo names it `DemoTrainerState`), so `state.systems` is your state. The
blocks' input types are `ElectricalBusInputs` and `PistonEngineInputs`, and their
states `ElectricalBusState` and `PistonEngineState`. The keys of `failures` must
match the union, and the `failure` of an emergency procedure must be one of them;
the demo writes `'alternatorFailure' satisfies DemoFailure`.

### Failures

`failures` maps a failure id to `{ name, trips? }`. `trips` lists breaker control
ids pulled when the failure is injected; the validator rejects an id that is not a
`breaker`. The demo's `alternatorFailure` trips `alternatorBreaker`.

### Views and placements

`views` maps a view id to `{ name, image, size?, controls?, indicators? }`. Each placement
is `{ rect: { x, y, w, h } }` in the coordinate space of the view's background: an
SVG's `viewBox`, or a raster image's natural size. `position3d` and `orientation`
are optional and the 2D renderer ignores them. Every control and every indicator
must be placed in at least one view. The demo has a `panel` and a `console` view.

A view may also declare `size: { width, height }`, the coordinate space of its
placements with the origin at 0,0. The panel uses it in preference to the image's
`viewBox` or natural size, so the placements do not depend on how the image
reports its size. The validator reports a `size` that is not a positive, finite
width and height as `invalid-view-size`, and a control, indicator or device
placement that is not inside it as `placement-outside-view`.

### Cockpit arrangement

`cockpit` is optional. It describes the whole cockpit as one left-seat arrangement:
`size: { width, height }` is a coordinate space of your choosing (only proportions
matter), and `views` holds one cell per view id, `{ rect, minWidth }`. A view
without a cell fails to type-check, and so does a cell for a view that does not
exist. An aircraft without `cockpit` always shows its views as tabs.

Cells are spatial, not to scale: each view is contain-fit in its own cell, so a
radio stack can take far more screen per image unit than the panel. Keep the
left-seat relationships (what is above, below, left and right) and give each cell
the aspect of its view. Cells may touch but must not overlap or leave `size`.
Put the arrangement in its own file, `src/cockpit.ts`, and add it to the
definition with one line.

`minWidth` is the narrowest rendered width, in CSS px, at which the view stays
legible and operable: every touch target and installed-device button at least
`--size-target`, no placard overfull, all placards and lettering at least
`--text-2xs`, and no two operable targets of different controls overlapping, each
taken as its rendered box grown to at least `--size-target` around its centre.
Space placements apart to clear an overlap; one that only a higher floor could
clear is accepted by name in the test's `acceptedOverlaps`, with what a tap loses
there. The positions of one control may overlap: the panel kit clips each to the
points nearer its own centre, and `apps/web/e2e/reach.spec.ts` taps every
position. Do not guess it. `apps/web/e2e/floors.spec.ts` renders every view of
every registered aircraft at exactly its `minWidth`, in English and German, and
runs those checks. To find a floor, lower `minWidth` until the test fails and
keep the last passing value; to confirm one, run `pnpm test:e2e floors`. Size the
cell widths in proportion to the floors so the arrangement wastes no width.

The validator reports a `size` that is not a positive, finite width and height as
`invalid-cockpit-size`, a view without a cell as `missing-cockpit-view`, a cell for
a non-view as `unknown-cockpit-view`, a cell without a finite `rect` (positive `w` and
`h`) as `invalid-cockpit-cell-rect`, a cell outside `size` as `cockpit-cell-outside`,
overlapping cells as `cockpit-cells-overlap` and a `minWidth` that is not a positive,
finite number as `invalid-cockpit-min-width`. The required `dock` cell (same shape as a
view cell, held beside `views`, not in it) reports a missing cell, a malformed `rect` or
`minWidth`, a cell outside `size` and an overlap with a view cell as
`invalid-cockpit-dock`. The dock must be at least as wide and as tall as the floor of
every installed device, which `aircraft-validation.test.ts` checks.

### Phases

`phases` maps a phase id to `{ name, image, environment, entry }`. `image` is the
outside view. Draw it as the first-person view out of the windshield from the
pilot's seat, never as a third-person picture of the aircraft. `entry` is the snapshot a pilot gets when jumping to the phase:
`entry.controls` holds a position for every control, and `entry.state` is a systems
state. Derive the state instead of writing it out; the demo's `runningFrom(controls)`
steps the systems once from a running engine. Guards start closed unless
`entry.guards` names them `open`. A phase can also seed the state of an installed
device (`entry.deviceStates`, see Devices). A procedure starts from its
`startPhase` snapshot, so the snapshot must be a state the procedure's first item
makes sense in.

An aircraft with a propeller draws the stopped blade in `image` and sets `imageRunning`
on every phase to the same view with a static propeller-disc outline instead, plus a
top-level `engineRunning(state)` condition; the outside view shows `imageRunning` while it
holds. A phase with `imageRunning` and no `engineRunning` is
`running-image-without-engine`; an `engineRunning` with a phase lacking `imageRunning` is
`phase-without-running-image`. Mark the blade `id="propeller-blade"` in each `image` SVG
and the disc `id="propeller-disc"` in each `imageRunning` SVG; `tools/propeller-art.test.ts`
checks the markers in every `packages/aircraft-*/src/assets/phase-*.svg` (running images are
named `phase-<id>-running.svg`).

### Procedures

`procedures` maps an id to `{ title, type, startPhase, endPhase?, items }`. A
`normal` procedure has no `failure`; an `emergency` one names the failure to inject
in `failure`, which must be declared in `failures`. Each item has a `text` and one
of:

- `action`: `control` and `position` to reach, optionally `holdUntil` a condition
  on the state. It completes when the pilot sets the control to the position while
  the item is current, or ticks it verified, and `holdUntil` holds; it never
  completes just because the control already held. The demo holds the `starter` at
  `'held'` until the engine runs.
- `check`: a `target`, `{ indicator }` or `{ control }`, and a `condition` on the
  state. The pilot ticks it; ticking while the condition is false is recorded as
  an `unmet-check` deviation, not refused.
- `confirm`: no target, a visual or verbal check the pilot ticks.

Input is never blocked: operating a control other than the current item's is
recorded as an `unexpected-control` deviation.

**Flows.** A `normal` procedure may open with a flow: leading `action` items marked
`flow: true`, done from memory in any order. Each flow item ticks once its control
holds the position (and `holdUntil` holds), including one already in place when the
procedure starts, and the flow ends when all are ticked. While it runs, only a
change to a control outside the flow is a deviation; it carries `duringFlow: true`,
since it belongs to the flow rather than to one item. Repeat the flow's controls as
ordinary items after it, so the checklist verifies them; the demo's
`beforeLanding` does this. The validator reports `invalid-flow` for a flow item on
an emergency procedure, one that is not an action, one after the first ordinary
item, or one whose control no later action or control check verifies.

**Memory items.** An `emergency` procedure may open with memory items: leading items
of any kind marked `memory: true`, the immediate actions a pilot does from recall
before reading the checklist. They complete in list order like any item. Practice
withholds a memory item's text until it is done (Show me reveals it), and the pane
groups the block under a "Memory items" label in every mode. A memory item done only
after the pilot moved another control while it was due also records a
`late-memory-item` deviation when it completes. The demo's `alternatorFailure` opens
with one. The validator reports `invalid-memory` for a memory item on a `normal`
procedure or after an item that is not one.

Targets are declared, not inferred, so Guided mode knows what to highlight. An
action or check can target a device control as `<installId>.<controlId>`; see the
device section below.

**Lever rule.** An action item on a continuous lever may target only `0` or `1`,
because the end stops can always be reached exactly, while a slider cannot be
expected to land on an arbitrary fraction. The validator reports anything between as `inexact-lever-target`. To require an
in-between setting, either write a `check` item with a condition on an indicator
(the demo checks `tachometer` against a limit), or give the lever named notches
(`flaps` has `['up', 'takeoff', 'landing']`).

### Devices

An aircraft installs an avionics unit through the optional `devices` field; see
`docs/adding-a-device.md` for the install shape, the `<installId>.<controlId>`
targets, device entry positions and device entry state. The demo installs a COM radio (`radio`) and a transponder (`xpdr`).

## Appearance and artwork

A control or indicator names its `appearance`; it never contains rendering code.
Two forms:

**Generic widget**, `{ widget: '<id>', options? }`, for the panel-kit widget of
that id. `aircraft-widgets.test.ts` runs `checkAppearance` from `@cpt/panel-kit` over
every registered aircraft and fails on an unknown id, a widget that does not fit the
control kind or the indicator's value type, and invalid indicator options.

| For        | Widget ids                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| controls   | `toggle`, `rocker`, `key-switch`, `push-button`, `circuit-breaker`, `rotary-knob`, `lever`, `guarded-handle` |
| indicators | `round-gauge`, `annunciator`, `digital-readout`                                                              |

A control without an appearance uses the widget of its kind: `toggle`,
`rotary-knob`, `lever`, `push-button`, `guarded-handle`, `circuit-breaker`. An
indicator's options are read as follows, and the demo's `src/indicators.ts` shows
each:

- `round-gauge`: `min`, `max`, `units`, `ticks` (a count of intervals or a list of
  values) and `arcs`, a list of `{ from, to, colour }` with `colour` one of
  `green`, `yellow`, `red`, `white`.
- `annunciator`: `lamp`, one of `amber`, `red`, `green`, `blue`, `white`, and an
  optional `stateLabels: { lit, dark }`.
- `digital-readout`: `units` and `decimals`.

**Aircraft artwork**, `{ artwork: { face, moving, glass? } }`, for image files
shipped in the package. `face` is the static image URL and `moving` is one of:

- `needle`: `{ type: 'needle', image, pivot, angleRange, valueRange }`. Draw the
  needle image at 0 degrees, at the size of the face, with `pivot` in its pixels. The renderer rotates it
  clockwise about `pivot` by the absolute angle, which is `angleRange.min` at
  `valueRange.min` and `angleRange.max` at `valueRange.max`, and clamps outside.
- `positions`: `{ type: 'positions', images }`, one image per position at the size
  of the face, keyed by position name. The compiler requires a key for every position of the control and
  the validator rejects a key that is not one.
- `travel`: `{ type: 'travel', image, path }`, for a lever. Draw the image at the
  size of the face with its handle at the first path point; the renderer slides it
  along the polyline `path` by the lever value.

`glass` is an optional image at the size of the face, drawn above the moving part and
never moved: the glass glare and rim reflection of an instrument go there, so they lie
over the needle. The renderer stacks the three layers for a gauge like this:

```ts
artwork: {
  face: images.gaugeAirspeed, // bezel, dial, markings and lettering
  moving: { type: 'needle', image: images.needle, pivot, angleRange, valueRange },
  glass: images.glassGauge, // glare, rim highlight and hub cap, above the needle
},
options: { needleShadow: true },
```

With `options.needleShadow: true` on a needle, the renderer casts the needle image's
shadow down and to the right, away from the panel's light, outside the rotation, so it
never turns toward the light; the needle image then draws no shadow of its own.

An artwork control whose box reaches over a neighbour can confine its touch target per
position with `options.hitArea`, a `{ left, top, width, height }` box in fractions of
the face; a tap elsewhere in the box reaches the control beneath. The CTSL's open fuel
valve takes taps only in its slot, so the key switch below stays operable; closed, its
whole box does, as its handle covers the key slot.

If an image fails to load, the control or indicator shows its generic widget
instead. `validateAircraft` reports `artwork-glass-size` when glass and face differ in
size, if its context reads image sizes (`imageSize`). The demo declares generic widgets
only.

### Printed labels

Every control a view places prints its function on the panel, as a real cockpit
placard does: a short legend in capitals beside the control, such as `BAT`, `FUEL` or
`AVIONICS`. Declare it in one of three places:

- `placard: string` on the control, for a generic widget. The widget prints it above
  the control. It is the panel's own wording and does not follow the UI language, as
  a real placard does not. Without one, the widget prints the name.
- `lettering: string[]` on the `artwork`, the text the face image prints.
- `printed: string[]` on the placement, the text the view background prints beside
  the control; when it holds visible text, the widget prints no placard of its own.

The label must name the function: a placard or lettering of only position legends
(`ON`, `OFF`, `OPEN`, the control's own positions) does not count. `checkPlacards` from
`@cpt/panel-kit` reports a placed control without such a label, and
`apps/web/src/panel/printed-labels.test.tsx` runs it over every registered aircraft. That
test also reads the SVG images and fails when declared `lettering` is not a `<text>` of
the face, or `printed` text is not a `<text>` of the view near the placement. A placard
too long for its widget at the minimum text size is squeezed and marked `data-overfull`;
`apps/web/e2e/placards.spec.ts` fails on it at 768, 1024 and 1440 px, so shorten it.

## Validate and walk through

`validateAircraft(aircraft, { devices })` from `@cpt/core` returns a list of
`Finding`s, `{ aircraftId, code, id, message }`, and an empty list means valid. The
codes are `unknown-target`, `unplaced-control`, `unplaced-indicator`,
`missing-translation`, `phase-without-image`, `running-image-without-engine`,
`phase-without-running-image`, `phase-without-snapshot`,
`undeclared-failure`, `unknown-position`, `inexact-lever-target`, `unknown-device`,
`unknown-device-control`, `unknown-device-state`, `unplaced-device`, `invalid-install-id`,
`control-in-device-namespace`, `invalid-view-size`, `placement-outside-view`,
`artwork-glass-size`, `invalid-check-response`, `invalid-flow`, `invalid-memory` and the eight
`cockpit` codes above. `formatFinding` prints one.

`walkProcedure(aircraft, procedureId, { devices })` plays a procedure through a real
session from its `startPhase` snapshot, performing each item: it sets or presses
the control for an action, advances until a check's condition holds, and ticks a
confirm. It returns `{ ok: true }` or `{ ok: false, aircraft, procedure,
itemIndex, item, reason }`, so a procedure that cannot be completed as written
points at its item. It does a flow in the listed order, or in reverse with
`flowOrder: 'reversed'`. It also fails a spring-back press unless the control rests at the
position it springs back to, so a procedure must set that position first. `apps/web`
runs it for every procedure of every registered aircraft.

Put your own tests in `src/index.test.ts`, as the demo does:

- `expect(validateAircraft(aircraft, { devices })).toEqual([])`
- `expect(walkProcedure(aircraft, id, { devices })).toEqual({ ok: true })` for each
  procedure, emergencies included, since the app's walk-through skips them.
- Wrong-operation scenarios on a session from
  `createSession(aircraft, { devices, phase })`: press the starter with the magnetos
  off and expect the engine not to run. Use `session.set`, `press`, `release` and
  `advance(STEP_MS)`.

`devices` is the list of device definitions the aircraft installs. Without it the
validator reports `unknown-device` and the session and the walk-through throw for
any aircraft with installs. An aircraft cannot import a device package, so a test
installs stand-ins that share the real control ids; see
`packages/aircraft-demo/src/test-devices.ts`. An aircraft with no `devices` field
can omit the option.

Do not hard-code another aircraft's content in a test.

Then run the project checks from the repository root:

    pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e

`pnpm test:e2e` needs a Playwright browser, installed once with
`pnpm exec playwright install chromium`.

## Package documents

- `README.md` with a `## Source revision` section naming the handbook revision the
  content follows, or stating that the aircraft is fictional. `handbookRevision`,
  which the aircraft picker shows, is a `Text`: its `en` value carries the source
  wording of the README section, its `de` value is a translation of it. The README
  stays English.
- `LICENSES.md` with one entry per image file path, naming its author and licence,
  as `packages/aircraft-demo/LICENSES.md` does. State plainly that none is based on
  a manufacturer's artwork or a handbook scan.
