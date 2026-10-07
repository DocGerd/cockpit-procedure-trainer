# Adding a device

A device is one avionics unit (a radio, a transponder, a display) that many
aircraft can install. It is a package of its own, `packages/device-<id>`, with
logic that depends on `@cpt/core` only and a screen that depends on
`@cpt/panel-kit`. `packages/device-com` and `packages/device-transponder` are
complete examples. Spec: section 4.9 of the design spec.

## Content policy

Read `docs/content-policy.md` first. A device is generic: no manufacturer or
model name, no manufacturer layout or artwork, no handbook text. Write every
text in your own words, in German and English.

## Package layout

    packages/device-<id>/
      package.json          name @cpt/device-<id>, exports "." -> ./src/index.ts
      tsconfig.json         as in packages/device-com
      README.md             "## Source revision", "## Controls", "## Not modelled"
      LICENSES.md           one entry per image file, or a note that there is none
      src/index.ts          re-exports logic and screen
      src/logic/            the device definition, depends on @cpt/core only
      src/screen/           the screen component, depends on @cpt/panel-kit

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
- `manual`: a `Text` naming the revision the logic follows. A generic unit says so.
- `notModelled`: a list of `Text`, one per function left out. The README's
  `## Not modelled` bullets repeat the English texts.
- `controls`: the same control kinds as an aircraft (`toggle`, `rotary`, `lever`,
  `momentary`, `guarded`). Each has a `name` and `description` in both languages.
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

Export the device, its state type and any constant a test or another package needs
(ranges, durations, input names) from `src/logic/index.ts`.

## Screen

A screen is a `ComponentType<DeviceScreenProps>` from `@cpt/panel-kit`:

    { on: boolean; state: unknown; send(controlId, action, position?): void }

- Cast `state` to the device's state type.
- `send` takes the device's local control id (`coarse`, not `radio.coarse`); the
  panel routes it to the session as `<installId>.<controlId>`. Use `'set'` for a
  position, and `'press'` then `'release'` for a momentary or spring-back control.
- The screen draws display contents only. The bezel and the dark powered-off
  screen come from the panel's device frame. Blank the display when `on` is false.
- Every operable element is a native `<button>` or a native range input with an
  accessible name, so keyboard operation needs no device code. Screens have no
  language prop, so use unit-neutral aviation labels (`SWAP`, `STBY MHz +`).
- Colours come from `var(--panel-*)` only, type and spacing from the token scale in
  `apps/web/src/styles/tokens.css`. No status colours, no brand accent. Panel
  widgets draw their own focus ring from `var(--panel-focus)`.

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

- `device` is the device id, `view` an existing view id and `placement` where the
  screen is drawn.
- `powered` is the bus condition. The device is off when it is false.
- `inputs` maps each input name the device reads to a function of the state. The
  transponder reads `pressureAltitude`; the COM radio takes none.
- A phase can set device controls on entry with `entry.devices`, keyed by install
  id and local control id.

## Procedure items on device controls

An action item targets `<installId>.<controlId>`, for example `radio.swap` at
`pressed` or `xpdr.mode` at `alt`, and may carry `holdUntil`. A check item can
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
- `deviceScreens`: the screen, keyed by device id.

Both are added in the app's registry file and nothing else in `apps/web` changes.

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
`send` calls.
