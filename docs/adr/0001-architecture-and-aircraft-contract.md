# ADR-0001: Architecture and aircraft contract

## Status

Accepted.

## Context

The project is a browser-based procedure trainer for a flying club. Pilots
practise where each control sits and when to operate it by working through
checklists on an interactive cockpit panel. It is not a flight simulator: there
is no flight physics and no flying task.

Success criteria:

- A pilot can pick an aircraft and a procedure, operate every control on the
  panel, and be told what they did outside the checklist.
- Wrong operation behaves as the aircraft would: turning the starter with the
  magnetos off does not start the engine.
- A developer adds an aircraft by writing one package and registering it. No
  engine or app code changes.
- The app installs on a tablet and works without a network at the airfield.

Out of scope:

- Flight physics, navigation, scoring or exam mode.
- Avionics behaviour that needs the outside world: audio, reception,
  navigation databases, moving maps.
- Pilot accounts, a backend, instructor dashboards.
- Adding aircraft by any means other than code (no editor, no upload).
- Phones as a target device.

## Decision

1. **Packages and boundaries.** The code is a pnpm workspace of `core`,
   `panel-kit`, `device-<id>`, `aircraft-<id>` and `apps/web`. `core` is plain
   data and pure functions with no DOM, React or asset imports. `panel-kit`
   and aircraft packages depend on `core` only; an aircraft refers to
   panel-kit widgets and devices by id, not by import. A device's logic
   depends on `core` only and its screen may use `panel-kit`. `apps/web`
   reaches aircraft and devices only through its two registries, and ESLint
   enforces the `core`, `panel-kit`, aircraft and registry rules; the rule for
   device packages is not in place yet. Reason: an aircraft is added without touching engine or
   app code.
2. **Aircraft as typed data plus one pure `step` function.** An aircraft
   declares its controls, indicators, views, failures, phases and procedures as
   typed data, with every text in German and English, and its systems model as an
   initial state and a pure `step(state, input)`. A validator in `core` checks
   the contract for every registered aircraft in CI. `core` ships reusable
   building blocks that an aircraft composes. Reason: wrong operation needs no scripting, because it simply
   fails to satisfy the rules, and the model is testable without a browser.
3. **The checklist engine observes and never blocks.** It watches control
   changes and state, completes items, and records actions outside the current
   item as deviations. It never alters or refuses input. Reason: wrong
   operation must be possible, and the engine stays independent of the systems
   model.
4. **Appearance is named, not contained.** Each control and indicator names a
   generic panel-kit widget or describes aircraft artwork as layers; it never
   holds rendering code. A control with no declared appearance falls back to
   the generic widget for its kind. Reason: aircraft stay UI-free, generic and
   real artwork are interchangeable, and the layer description maps onto a 3D
   model later.
5. **Avionics as reusable device packages with logic and screen split.** A
   device is its own package: pure logic (controls, starting state, `step`)
   that depends on `core`, and a screen that draws the display and bezel and
   may use `panel-kit`. An aircraft installs a device by id. Reason: one unit
   serves many aircraft.
6. **Packages consumed as TypeScript source, no per-package build.** Workspace
   packages export their source and the app's bundler compiles them. Reason:
   one toolchain step, acceptable while nothing is published to npm.

## Consequences

- 2D placements and optional 3D positions live side by side in the contract, so
  a 3D renderer is a later milestone rather than a rewrite.
- Device screens are the one place React code sits next to content logic.
- Publishing a package to npm later needs a build step.
