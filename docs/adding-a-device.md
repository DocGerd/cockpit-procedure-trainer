# Adding a device

A device is one avionics unit (a radio, a transponder, a display) that many
aircraft can install. It is a package of its own, `packages/device-<id>`, with
logic that depends on `@cpt/core` only and a screen that depends on
`@cpt/panel-kit`. `packages/device-com` and `packages/device-transponder` are
complete examples. Spec: section 4.9 of the design spec.

## Content policy

Read `docs/content-policy.md` first. A device models the specific unit an
aircraft carries (spec section 4.9): no manufacturer artwork, logos or lettering,
no handbook text. Write every text in your own words, in German and English.

## Package layout

    packages/device-<id>/
      package.json          name @cpt/device-<id>, exports "." -> ./src/index.ts
      tsconfig.json         as in packages/device-com
      README.md             "## Source revision", "## Controls", "## Not modelled"; "## Display"
                            as in the other devices
      LICENSES.md           one entry per image file, or a note that there is none
      src/index.ts          re-exports logic, screen, the entry and the display
      src/entry.ts          the DeviceScreenEntry: Screen, Display, readout, floor
      src/logic/            the device definition and readout, depends on @cpt/core only
      src/screen/           the operable screen, depends on @cpt/panel-kit
      src/display/          the read-only display for the panel slot

`package.json` depends on `@cpt/core` and `@cpt/panel-kit` as `workspace:*`.
React, React DOM and their types are dev dependencies (the screen tests render) and React is a peer dependency, as
in `packages/panel-kit`. `pnpm-workspace.yaml` already covers `packages/*`; run
`pnpm install` so the lockfile gains the new workspace entry. ESLint enforces the
boundaries: logic imports `@cpt/core` only and no UI or assets, a screen imports
`@cpt/core` and `@cpt/panel-kit`, and no device imports another package by a
relative path.

## Logic

Build the device with `defineDevice` from `@cpt/core`:

- `id`: the id aircraft use to install it.
- `manual`: a `Text` naming the revision the logic follows. A unit modelled from a general pattern says so.
- `notModelled`: a list of `Text`, one per function left out. The README's
  `## Not modelled` bullets repeat the English texts.
- `controls`: the same control kinds as an aircraft (`toggle`, `rotary`, `lever`,
  `momentary`, `guarded`). Each has a `name` and `description` in both languages.
  A control clicks by its kind when the pilot moves it, and may name its own `click`
  (a `ClickId` from `@cpt/core`, or `silent`) on the same rule as an aircraft
  control; see Controls in [adding-an-aircraft.md](adding-an-aircraft.md#controls).
- `initial`: the starting state.
- `step(state, { controls, powered, inputs, dtMs })`: a pure function returning the
  next state. `controls` holds the device's own controls by local id, `powered` is
  the install's bus condition, `inputs` are the aircraft values the install passes
  in, and `dtMs` is the time since the last step.

Rules that follow from how the session runs devices:

- The session calls `step` after every control change with `dtMs` of zero, and on
  every advance. A button press is therefore visible to `step` as its position
  while held. Count a press by remembering the last position in the state and acting
  only on the change, so a held button counts once.
- There is no relative-knob control kind. Model a knob that steps a value as a
  `rotary` with `springBack` detents (for example `rest`, `down`, `up` with
  `springBack` mapping `down` and `up` to `rest`), and a button as `momentary`.
  A value the pilot dials absolutely is a `rotary` with one position per value.
- Keep everything the screen draws in the state. A screen receives the state and
  nothing else, not the control positions.
- When `powered` is false, ignore the controls, clear anything transient and keep
  the settings the pilot made. Still record the control positions you saw, so a
  button held during power-up does not fire.
- A continuous lever can only be targeted by a procedure action at `0` or `1`.
  Use it for a knob the pilot sets by feel, such as volume.
- A position no key prints, such as a knob's `down` or a key's `pressed`,
  declares `legends: { position: { state, restore } }` (see Cues under
  [Printed labels](adding-an-aircraft.md#printed-labels)), so cues name it in
  words.

### Sounds

A device that sounds its own tones (a start-up chirp, a key beep) declares
`sounds: { beeps, cues }` in `defineDevice`. Spec section 4.10.

- `beeps` maps a beep id to its tones, a list of `{ hz, ms, pauseMs? }` played in
  order, `pauseMs` being the silence after that tone. Every tone needs a finite,
  positive `hz` and `ms` and, when given, a finite `pauseMs` of at least 0, and a
  beep needs at least one tone; the validator reports `invalid-tone` and
  `beep-without-tones` otherwise.
- `cues(previous, next)` is a pure function of the device's own state before and
  after a change, returning `{ beep, level? }` for each beep to sound. `level`
  multiplies the beep's gain, is finite and not negative, and is 1 when left out.
  Return an empty list when nothing sounds. `cues` sees neither the step's
  `powered` input nor the install's `on` flag, so keep in the state whatever a
  cue compares, as the FLARM keeps `powered`. Detect an edge by comparing the two
  states, never by reading a clock or anything outside the state:
  `!previous.powered && next.powered ? [{ beep: 'startup' }] : []`.
- The beep ids are inferred from the `beeps` keys, so a cue naming a beep the
  device does not declare fails to compile. A cue inside a conditional spread,
  `...(edge ? [{ beep: 'startup' }] : [])`, widens its id to `string`: write
  `'startup' as const` there, or return a plain conditional as above.
- The session runs `step` first, so `next` is the state the change produced;
  `deviceCues` in `@cpt/core` pairs each install's previous and next state with
  the device's `cues` and tags each cue with the install and device id. The app
  plays them; a `cues` that throws mutes the cockpit audio, not the trainer. A
  device without `sounds` plays no tones; its controls still click, as the
  `controls` bullet above says.

Export the device, its state type and any constant a test or another package needs
(ranges, durations, input names) from `src/logic/index.ts`.

## Screen, Display, readout and floor

A device exports one `DeviceScreenEntry` from `@cpt/panel-kit` (`<id>ScreenEntry`,
built in `src/entry.ts`) with four members: the operable `Screen`, a read-only
`Display`, a `readout` and a `floor`. The `Screen` opens in the device dock; the
`Display` is the live mirror in the aircraft's panel slot (spec section 4.9).

A screen is a `ComponentType<DeviceScreenProps>` from `@cpt/panel-kit`:

    { on: boolean; state: unknown; send(controlId, action, position?): void }

- Cast `state` to the device's state type.
- `send` takes the device's local control id (`coarse`, not `radio.coarse`); the
  panel routes it to the session as `<installId>.<controlId>`. Use `'set'` for a
  position, and `'press'` then `'release'` for a momentary or spring-back control.
- A framed screen draws display contents only. The bezel, the glass, the keycaps and
  the dark powered-off screen come from the panel's device frame: it lays glass
  over the screen's first block, so put the display window first, and moulds every
  `<button>` as a keycap. Blank the display when `on` is false. A device that draws
  its own face gets none of this ("A device that draws its own face" below).
- Every operable element is a native `<button>` or a native range input with an
  accessible name, so keyboard operation needs no device code. Screens have no
  language prop, so use unit-neutral aviation labels (`SWAP`, `STBY MHz +`).
- Every key carries `data-control`, the device-local control id it operates, and a
  key that stands for one position also carries `data-position`, that position as
  a string. Guided rings the keys for the step's position (else every key of the
  control) in the docked unit; without them it rings the whole unit.
  `apps/web/src/device-keys.test.tsx` checks every registered device.
- Colours come from `var(--panel-*)` only, type and spacing from the token scale in
  `apps/web/src/styles/tokens.css`. No status colours, no brand accent. Panel
  widgets draw their own focus ring from `var(--panel-focus)`.

### Display, readout and floor

- `Display` is a `ComponentType<DeviceDisplayProps>`, `{ on: boolean; state: unknown }`:
  the same display contents as the screen, with no buttons and no `send`. Wrap it
  in `DeviceDisplayFrame` from `@cpt/panel-kit` with `RADIO_MIRROR` (a 520 by 150
  radio or transponder) or `GPS_MIRROR` (a 400 by 300 GPS), or pass a
  device-local `MirrorSize` for a unit of another shape, as the CTSL's units do; the
  frame scales with the slot. Its printed label is the unit's face word or name (for
  example `COM`, `ATC`, `GPS`), never "open". Keep the display lettering readable at the panel
  floor.
- `readout(state, language, on)` returns a short text of what the display shows,
  in `'de'` or `'en'`, and a text for the powered-off unit when `on` is false. It
  is `src/logic/readout.ts` in the existing devices. The slot's accessible name is the unit name
  followed by the readout.
- `floor` is `{ width, height }`, the smallest size at which the `Screen` keeps
  every button at least `--size-target`. The dock renders the screen at that
  size or larger, and a test checks the aircraft's dock cell against it.
- `face` is `'framed'` (the default) or `'own'`; see the next section.
- A slot mirrors the device: `IN_SLOT_OPERATION` is off, and `slotMode()` in the
  app is the pure rule that could let a large slot be operated in place. Only where the cockpit has no dock (an aircraft without
  `cockpit`) is the `Screen` itself drawn in the slot.

### A device that draws its own face

A unit whose real face has no square bezel (a round radio, a slate traffic display, a
GPS in its cradle) sets `face: 'own'` in its entry. The dock and the in-slot frame
then draw no bezel, screws, recess, glass, keycaps or off scrim: the `Screen` sits
on a borderless brushed plate of panel metal (`--panel-metal-light`) and draws the
whole face itself, darkening its own window while `on` is false. The frame keeps its
`role="group"` named by the device id and its `data-on`.

- The `Display` passes `face="own"` to `DeviceDisplayFrame` with a `labelAt` of
  `{ left, top, vertical? }`: the label's centre in fractions of the mirror box,
  stacked upright when `vertical`. The label stays one text node at its framed size,
  in `--panel-legend`, and the mirror box keeps its `MirrorSize`, so the slot fit
  measures it the same way. The face fills the whole box.
- Put the `pk-glass` class on the display window to give it the framed units'
  glass. The class positions the window; set `position: absolute` inline to place it.
  An evenly lit screen sets its `.pk-glass::after` to `var(--pk-glass-sheen)`, the
  glass without its depth shade at the bottom.
- `FaceKey` is one key printed as a legend above a round cap: its hit box covers
  both, from the top of the legend to the bottom of the cap, and is never smaller
  than `--size-target`. Its `cap` centre is in fractions of the face width (x) and
  height (y), `capSize` in fractions of the width, `legendGap` from the legend's
  centre down to the cap's centre in fractions of the height, and `aspect` the
  face's width over its height. It needs a positioned parent at the face's size.
  The face's art draws the cap; the key shades it while pressed.
- `KnobHelpers` stand in for a knob too small to turn by finger: `+` over `−`, each
  a `--size-target` button named `<word> +` and `<word> −`, with the knob word
  printed above them. They press the knob's `up` and `down` positions (or the ones
  given) while held. Place them on the plate beside the knob, outside the face.
- In the dock the plate keeps a `--space-2` margin around the `Screen`. The room
  is tightest in the combined layout with the dock at its `minWidth` in German,
  whose Close label is the wider; in the tabs layout the device is as tall as its
  `floor` or `6 × --space-12`, whichever is more. Set the `floor` to at least the
  natural size plus `2 × --space-2`; `apps/web/e2e/layout.spec.ts` checks both.
- In a slot mirror, lettering the real unit prints small (face legends, LED
  captions, on-screen captions, small readouts) carries `data-lettering="secondary"`
  and is held to half the lettering minimum; main values and the slot label keep
  the full minimum (`apps/web/src/devices/slot-fit.test.tsx`). The dock prints all
  lettering at the full minimum.

## Installing in an aircraft

An aircraft places the device in a view through its `devices` entry. The key is
the install id, which prefixes the device's control ids:

    devices: {
      radio: {
        device: 'com',
        view: 'panel',
        placement: { rect: { x: 40, y: 200, w: 160, h: 80 } },
        powered: (state) => state.systems.avionicsBusOn,
        inputs: {},
      },
    }

- `device` is the device id, `view` an existing view id and `placement` the slot
  where the mirror is drawn. Activating the slot opens the device in the dock.
  The device has no view of its own.
- The aircraft's `cockpit` arrangement needs a `dock` cell, and the dock must be
  at least as wide and as tall as the `floor` of every installed device
  (`docs/adding-an-aircraft.md`, Cockpit arrangement). The dock's Close button
  stands beside the device, so at the dock's `minWidth` (the narrowest it renders
  before the cockpit falls back to tabs) it must hold the widest installed floor plus
  that column, whose German label is the wider, and the dock's padding and border;
  its height at that scale must hold the tallest floor and the padding. The validator
  checks the bare floor only. `apps/web/e2e/layout.spec.ts` docks every device and
  fails when the dock scrolls: at each priority viewport, and in both languages just
  above the breakpoint of each aircraft in its `narrowDocks` table.
- `powered` is the bus condition. The device is off when it is false.
- `inputs` maps each input name the device reads to a function of the state. The
  transponder reads `pressureAltitude`; the COM radio takes none.
- A phase can set device controls on entry with `entry.devices`, keyed by install
  id and local control id.
- A phase can seed device state on entry with `entry.deviceStates`, keyed by install
  id: the named fields are laid over the device's `initial`. Each field must exist in
  `initial` and have the kind (string, number, boolean, array, object) of its value
  there, or the validator reports `unknown-device-state`; a field whose `initial` is
  `null` accepts any value. The lay-over is shallow: a nested object such as `held` is
  replaced, not combined. The seed is only the starting state; the device's `step`
  runs from it, so a field the step derives from controls or power is overwritten.

## Procedure items on device controls

An action item targets `<installId>.<controlId>`, for example `radio.swap` at
`pressed` or `xpdr.mode` at `alt`, and may carry `holdUntil`, or `doneWhen` for a
press whose key goes away once pressed (a touch key on a page the press leaves). A check item can
target a device control and read the device state with a condition:

    type TransponderReading = { readonly squawk: string };

    condition: (state) =>
      (state.devices.xpdr?.state as TransponderReading | undefined)?.squawk === '7000'

Aircraft cannot import a device, so declare the shape you read as a local type, as
above, or compare against plain values. Cast to `T | undefined` and read with `?.`:
a bare cast throws while the install is absent. The validator reports an unknown install, an
unknown device control and an impossible position.

## Registering the device

`apps/web/src/device-registry.ts` is the only place `apps/web` imports devices. Add
the package as a dependency of `apps/web` and register both halves:

- `deviceRegistry`: the logic, passed to the session.
- `deviceEntries`: the `<id>ScreenEntry` keyed by device id. `deviceScreens`, the
  operable screens, is derived from it; do not edit it.

Also add the unit's name in both languages to `unitNames` in
`apps/web/src/devices/messages.ts`; the slot's accessible name uses it, and
`unit-names.test.ts` fails without it. In `tools/device-entry.test.ts` add the
device to `NATURAL_SCREEN` (the powered `Screen`'s measured natural size). The
mirror's fit is checked per install, not per package: `apps/web/src/devices/slot-fit.test.tsx`
renders each installed device's `Display` against the slot its aircraft gives it
(same aspect, smallest lettering legible at the panel floor), and the package test
checks that the bezel's size parses. Nothing else in `apps/web` changes.

A package can stay in the repository without being registered, for example a unit
an aircraft no longer installs. Remove it from `deviceRegistry`, `deviceEntries`,
`unitNames` and the `apps/web` dependencies, and list its id in `UNREGISTERED` in
`tools/device-entry.test.ts`, which checks that every listed id is a package the app
does not register. Its own tests and the `tools/` per-package tests (including its
`NATURAL_SCREEN` row) still run.

## Checks

    pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e

`tools/device-readme.test.ts` checks every `packages/device-*` README against the
device's logic automatically; a new device needs no README test of its own. The
README needs the title `# @cpt/device-<id>`, each of `## Source revision`,
`## Controls` and `## Not modelled` once and non-empty, a `## Controls` bullet for
every declared control (a range such as `key0` to `key7` is allowed) and none for an
undeclared one, and `## Not modelled` bullets equal to the English `notModelled`
texts. The device must be exported from `src/logic/index.ts`.

Tests that every device package should have: logic tests for each behaviour in
`step`, including power off; a session test that installs the device in a small
test-local aircraft, runs the aircraft validator and walks a procedure with
`walkProcedure` (it fails a spring-back press unless the control rests at the
position it springs back to, so a procedure must set that position first);
screen tests for the display, the accessible names and the
`send` calls; `tools/` contract tests check the entry (`Display`, `readout` and
`floor`) of every `packages/device-*`, and `apps/web/src/device-keys.test.tsx` the
`data-control` and `data-position` of every registered device's keys;
`apps/web/src/checklist/position-legends.test.tsx` checks that every position of every
installed device reads as its printed key or a declared legend.
