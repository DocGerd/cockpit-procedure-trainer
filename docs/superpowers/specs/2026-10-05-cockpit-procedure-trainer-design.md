# Cockpit Procedure Trainer — Design

Status: approved 2026-10-05 · Owner: Patrick Kuhn

## 1. Purpose

A browser-based procedure trainer for a flying club. Pilots practise where each
control sits and when to operate it by working through checklists on an
interactive cockpit panel. It is **not** a flight simulator: there is no flight
physics and no flying task.

The first real aircraft is the Flight Design CTSL. Its photos and handbook
arrive in a later session; this spec covers the project foundation and the
architecture that lets aircraft be added.

### Success criteria

- A pilot can pick an aircraft and a procedure, operate every control on the
  panel, and be told what they did outside the checklist.
- Wrong operation behaves as the aircraft would: turning the starter with the
  magnetos off does not start the engine.
- A developer adds an aircraft by writing one package and registering it. No
  engine or app code changes.
- The app installs on a tablet and works without a network at the airfield.

### Out of scope

- Flight physics, navigation, scoring or exam mode.
- Avionics behaviour that needs the outside world: audio, reception,
  navigation databases, moving maps (§4.9).
- Pilot accounts, a backend, instructor dashboards.
- Adding aircraft by any means other than code (no editor, no upload).
- Phones as a target device.

## 2. Decisions

| Topic | Decision |
|---|---|
| Cockpit view | 2D layered panel now. The aircraft contract carries optional 3D positions so a 3D renderer is a later milestone, not a rewrite. |
| Behaviour | Rule-based systems model per aircraft, including failures. |
| Modes | Guided, Practice, Free explore. |
| Step order | Never block input. Record actions outside the current item as deviations. |
| Procedures | Normal and emergency (failure injection). |
| Languages | German and English, for UI and aircraft content. |
| Devices | Tablet and desktop; touch and mouse both first-class. |
| Hosting | Static site on GitHub Pages, installable and offline-capable (PWA). |
| Repo | Public, `DocGerd/cockpit-procedure-trainer`, MIT, © 2026 Patrick Kuhn. |
| Stack | TypeScript, React, SVG panel, Vite, pnpm workspace. |
| Visual design | Product brand derived from the DocGerdSoft design system, screens designed in Claude Design. |

## 3. Architecture

```
packages/core            aircraft contract, systems runtime, checklist engine, validator
packages/panel-kit       realistic generic GA controls and gauges, and the layer renderer for aircraft artwork
packages/device-<id>     one avionics unit: logic and screen, reusable across aircraft
packages/aircraft-demo   small fictional aircraft that proves the contract
packages/aircraft-ctsl   later session
apps/web                 React app: panel, checklist pane, outside view, PWA
docs/                    spec, ADRs, design, authoring guide
```

Boundaries, enforced by lint:

- `core` has no DOM, React or asset imports. It is plain data and pure functions.
- `panel-kit` depends only on `core`. It draws a control or indicator from its
  declared appearance and current value; it knows nothing about checklists.
- An aircraft package depends only on `core`. It refers to panel-kit widgets
  and devices by id, not by import.
- A device's logic depends only on `core`; its screen may use `panel-kit`.
  The web app registers devices in `apps/web/src/device-registry.ts`.
- `apps/web` depends on `core` and on aircraft packages only through
  `apps/web/src/aircraft-registry.ts`, the single list of available aircraft.

Adding an aircraft is one new `packages/aircraft-<id>` plus one line in the
registry.

## 4. Aircraft contract

An aircraft is a typed TypeScript module built with `defineAircraft`. Types
catch wrong references at compile time; the validator (§8) catches the rest.
The shapes below are illustrative; exact types are settled in the core tickets.

### 4.1 Controls

Each control has an id, a kind, its positions, a starting position, and a name
and description in German and English.

| Kind | Example | Notes |
|---|---|---|
| `toggle` | master switch | two or more fixed positions |
| `rotary` | ignition key, fuel selector | detents; a detent may spring back (START) |
| `lever` | throttle, flaps, trim | continuous 0–1 or named notches |
| `momentary` | starter button, PTT | active only while held |
| `guarded` | BRS handle | needs the guard removed first |
| `breaker` | circuit breaker | in or pulled; a failure can trip it |

### 4.2 Indicators

Gauges, lamps and readouts. Each binds to a value in the aircraft state through
a selector function and declares how it shows it (needle range, lamp colour,
digits). Indicators never hold state of their own.

### 4.3 Views

One or more views (main panel, centre console, floor, overhead). Each has a
background image and one placement per control and indicator: a 2D rectangle in
image coordinates, plus an optional 3D position and orientation that the 2D
renderer ignores.

### 4.4 Systems model

```ts
systems: {
  initial: State,
  step(state: State, input: StepInput): State   // pure
}
// StepInput = { controls, failures, environment, dtMs }
```

`step` runs on every control change and on a fixed tick, so effects that take
time (engine spooling up, a starter held for two seconds) work. `core` ships
reusable building blocks (electrical bus, piston-engine start logic) so an
aircraft composes rather than rewrites them. Wrong operation needs no special
handling: it simply fails to satisfy the rules.

### 4.5 Failures

A list of named failures the model understands (`alternatorFailure`,
`engineFire`). The runtime passes the active set into `step`.

### 4.6 Phases

Parking, holding point, departure, cruise, approach and others the aircraft
defines. A phase supplies:

- the outside-view image,
- environment presets (airspeed, altitude, on ground) that feed `step`, since
  nothing computes them,
- an entry snapshot: control positions and systems state that make sense when a
  pilot jumps straight to that phase.

### 4.7 Procedures

A procedure has an id, a title, a type (`normal` or `emergency`), the phase it
starts in, optionally the phase it ends in, and its items. An emergency
procedure names the failure to inject.

Each item has text in both languages and one of:

- **action**: a target control and the position to reach, optionally held until
  a state condition is true (starter until engine running);
- **check**: a target indicator or control and a condition on the state, ticked
  by the pilot;
- **confirm**: no target (a visual or verbal check), ticked by the pilot.

Targets are declared, not inferred, so Guided mode knows what to highlight.

### 4.8 Appearance

Controls and indicators should look mostly like the real ones on the aircraft
whose panel is shown. Each control and indicator names its appearance; it never
contains rendering code, so aircraft packages stay free of UI dependencies.

Two sources, mixable within one aircraft:

- **Generic widget**: an id from the panel kit (§3) plus options, for example
  a round gauge with range, units and coloured arcs, or a rocker switch with a
  cap colour. The kit covers typical GA hardware and is the placeholder until
  an aircraft has its own artwork.
- **Aircraft artwork**: image files shipped in the aircraft package, described
  as layers: a static face and the moving part (needle with pivot and angle
  range, switch states as one image per position, lever travel as a path). The
  renderer animates the layers; the same description later maps onto a 3D
  model.

A control with no declared appearance falls back to the generic widget for its
kind, so a new aircraft is usable before any artwork exists.

### 4.9 Avionics devices

Pilots also practise operating the avionics, so each device carries the base
logic of the specific unit installed in the aircraft. A device (radio,
transponder, flight display, engine monitor) is the same in many aircraft, so
it is a reusable package of its own, `packages/device-<id>`, not part of an
aircraft.

A device package has two parts:

- **Logic** (depends on `core` only): its controls, a starting state and a pure
  `step` function, the same shape as the aircraft systems model. It models
  power-up, modes, value entry (frequency, squawk code, pressure setting),
  active/standby swap, and page navigation.
- **Screen** (depends on `panel-kit`): draws the display and bezel from the
  device state.

An aircraft installs a device by id: where it sits in a view, which electrical
bus powers it, and which aircraft values it receives (altitude for a
transponder, engine values for a monitor). Procedure items can target device
controls and test device state ("Transponder: 7000, ALT").

Scope boundary: everything the pilot does with the unit's knobs and buttons
works; nothing that needs the outside world does. No audio, no reception, no
navigation database, no moving map. Each device states the manual revision its
logic follows and lists the functions it does not model.

## 5. Runtime

1. The pilot operates a control; the control store records the new position.
2. The systems runtime calls `step` and stores the new state.
3. Indicators redraw from the state.
4. The checklist engine observes control changes and state:
   - an action item completes when its condition is met;
   - a check or confirm item completes when the pilot ticks it;
   - a control change that is not the current item's target is recorded as a
     deviation; so is ticking a check whose condition is not met.
5. Completing a procedure shows its deviations and, if the procedure names an
   end phase, moves to it.

The checklist engine only observes. It never blocks or alters input, which
keeps it independent of the systems model and testable alone.

### Modes

| Mode | Checklist | Highlight | Deviations |
|---|---|---|---|
| Guided | shown | current target highlighted, view switches to it | recorded, shown immediately |
| Practice | shown | none | recorded, summary at the end |
| Free explore | none | none | none; tapping a control shows name and purpose instead of operating it, with a toggle to operate freely |

### Screen

Outside-view strip on top, panel below with view tabs, checklist pane at the
side (collapsible on tablets). Header: aircraft, procedure, mode, phase,
language, theme.

### Persistence

`localStorage` holds language, theme and last aircraft only. Reads are guarded;
the app works without it.

## 6. Visual design

### 6.1 Brand

The product brand derives from the DocGerdSoft design system (the owner's
Claude Design project, handoff bundle `design_handoff_docgerdsoft_brand`). It
inherits unchanged: the neutral core in
light and dark, the delta mark, Geist and Geist Mono, the 8-pt spacing scale,
the radii, and the status inks. It adds exactly one product accent.

- **Accent: Violet**, `#6A57C4` light and `#9A8BE8` dark. It is the family
  member furthest from the red, amber, green and blue a cockpit already uses,
  and matches the magenta pilots read as active guidance. The dark value has
  the same lightness as the system's dark Azure and clears WCAG AA on the dark
  surface; text on a dark-theme accent fill is `#0D0E10`.
- Recorded in `docs/design/BRAND.md`, which also carries the brand's legal
  rules: copyright line "© 2026 Patrick Kuhn", no company suffix, no ® or ™.

### 6.2 Rules specific to this product

- The brand styles the **chrome** only: header, checklist pane, outside-view
  frame, tabs, dialogs. The panel looks like the aircraft (§4.8); the schematic
  controls on the design canvas are stand-ins, not the target look.
- Status inks (success, warning, danger) appear only in the chrome, never drawn
  on the panel, where the same colours carry aircraft meaning.
- The Guided highlight uses the accent plus a shape cue (outline and pulse), so
  it does not depend on hue alone.
- Fonts are bundled with the app, not loaded from Google Fonts, because the app
  must work offline. Both are OFL-licensed.

### 6.3 Process

1. Write `docs/design/BRAND.md` and a design brief listing screens and states:
   main layout on tablet and desktop, checklist pane in each mode, outside-view
   strip, aircraft and procedure picker, deviation summary, control info
   popover, light and dark.
2. Design the screens in Claude Design on the DocGerdSoft system.
3. Export the "Hand off to Claude Code" package to `docs/design/handoff/` as
   reference only.
4. Lock the design in one issue. Reproduce the values the code depends on in
   `BRAND.md`, so the code never depends on the export.
5. Port tokens to `apps/web/src/styles/tokens.css` (`:root` light,
   `[data-theme="dark"]` dark). It is the only place colours, type and spacing
   are defined; a lint rule rejects literals elsewhere.

The design blocks the web shell only. The core engine has no UI and proceeds in
parallel.

## 7. Content and legal

- Checklists are written in the club's own words; photos are the club's own.
  No scanned handbook pages or manufacturer artwork in the repo.
- Each aircraft package states the handbook revision its content follows.
- The app shows a notice on start: training aid only, the aircraft's handbook
  is authoritative, not for use in flight.
- The MIT licence covers code. Aircraft photos get an explicit licence note in
  the aircraft package.

## 8. Errors and validation

- **Validator** (`core`, run in CI for every registered aircraft): every
  procedure target exists; every control and indicator is placed in a view;
  every text has both languages; every phase has an image and an entry
  snapshot; every injected failure is declared.
- **Runtime**: an error boundary around the trainer shows a readable message and
  a reset. A missing image falls back to a labelled placeholder rather than a
  broken panel. `step` throwing is reported, not swallowed.

## 9. Testing

| Level | What |
|---|---|
| Unit (Vitest) | `core`: control store, runtime tick, checklist engine, validator |
| Aircraft scenarios (Vitest) | per aircraft: wrong-operation cases such as starter without magnetos |
| Procedure walk-through (Vitest, generic) | for every aircraft and every normal procedure: starting from the phase entry snapshot, performing each item completes the procedure with no deviations |
| Browser (Playwright) | pick aircraft, run one procedure in Guided and one in Practice, switch language, offline reload |
| Manual | real-browser pass at tablet and desktop size for every UI ticket |

## 10. Project setup

- pnpm workspace, strict TypeScript, ESLint with boundary rules, Prettier.
- GitHub Actions: lint, typecheck, unit, validator, browser tests on every PR;
  deploy to GitHub Pages on `main`.
- Branch protection on `main`: PRs only, checks required.
- Issue templates (feature, bug, new aircraft), PR template, labels, milestones.
- `README`, `CONTRIBUTING`, `LICENSE`, project `CLAUDE.md`, ADRs under
  `docs/adr/`, authoring guide `docs/adding-an-aircraft.md`.
- Automated dependency updates.

## 11. Milestones and tickets

**M0 Foundation**
1. Create repo, licence, README, contributing guide, project `CLAUDE.md`
2. pnpm workspace, TypeScript, ESLint with boundary rules, Prettier
3. CI: lint, typecheck, test
4. GitHub Pages deployment from `main`
5. Issue and PR templates, labels, milestones, branch protection
6. ADR-0001: architecture and aircraft contract; content and licensing policy
48. Claude Code project setup: plugins, hooks, agents and skills

**M1 Design** (blocks M3 only)
7. `BRAND.md`: product brand derived from DocGerdSoft, accent decision
8. Design brief: screens and states
9. Claude Design pass and handoff export
10. Lock design; tokens file and no-literals lint rule; bundled fonts

**M2 Core engine**
11. Contract types and `defineAircraft`
12. Control store, including spring-return and momentary controls
13. Systems runtime: `step` loop, tick, environment from phase
14. Reusable blocks: electrical bus, piston-engine start
15. Failure injection
16. Checklist engine: item kinds, completion, deviations
17. Phase handling: entry snapshots, procedure end phase
18. Aircraft validator and CI wiring
44. Device contract and runtime: logic shape, power and data wiring from the aircraft, device registry

**M3 Web shell**
19. App shell: layout, header, theme, aircraft registry
20. Panel renderer: views, placements, tabs
21. Panel kit: generic GA controls with realistic look, touch and mouse (toggle, rocker, key switch, push button, circuit breaker, rotary knob, lever, guarded handle)
22. Panel kit: generic GA indicators with realistic look (round gauge with needle and arcs, annunciator lamp, digital readout)
23. Panel kit: layer renderer for aircraft artwork (face plus moving part, per-position images, lever travel)
24. Panel kit gallery page showing every widget in every state
25. Checklist pane and deviation summary
26. Modes: Guided highlight and view switching, Practice, Free explore
27. Outside-view strip
28. Translations: UI dictionary with parity check, language switch
29. Error boundary, image fallback, start-up notice
45. Device screens in the panel: placement, input routing, powered-off state

**M4 Demo aircraft**
30. Fictional demo aircraft: controls, views, systems, two normal procedures, one emergency
31. Generic procedure walk-through test
32. Browser tests
33. Authoring guide: adding an aircraft, including appearance and artwork
46. Generic COM radio and transponder devices for the demo aircraft; authoring guide: adding a device

**M5 Offline and tablet**
34. PWA: manifest, service worker, offline caching, update prompt
35. Touch polish: hit targets, press-and-hold, pinch zoom on the panel
36. Accessibility: keyboard operation, labels, reduced motion

**M6 CTSL** (next session, tickets refined once material is in hand)
37. Content intake: photos, handbook revision, clearance check
38. Views and placements
39. Systems model and scenario tests
40. Normal procedures
41. Emergency procedures and failures
42. Control and gauge artwork matching the real panel, replacing generic widgets
47. Avionics devices installed in the club's CTSL, one ticket per unit once identified at intake

Ticket numbers are spec ids, not GitHub issue numbers.

**M7 3D** (later)
43. 3D renderer on the same aircraft data
