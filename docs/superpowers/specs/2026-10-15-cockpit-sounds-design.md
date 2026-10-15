# Cockpit sounds — Design

Status: Approved 2026-10-15 by the owner · Owner: Patrick Kuhn · ADR:
`docs/adr/0003-synthesised-cockpit-audio.md` · Parent spec:
`2026-10-05-cockpit-procedure-trainer-design.md` §1 (Out of scope), §4.1, §4.6,
§4.9, §5 (Screen, Persistence), §8, §9.

## 1. Objective

The pilot hears the cockpit. The controls the pilot operates make their sounds,
the engine cranks, catches, runs and stops audibly, the airflow follows the
phase airspeed, the flap motor runs, and the FLARM display beeps at start-up
and on a volume step. The point is recognition: a pilot hears that the engine
caught, that the rpm dropped on one magneto circuit, that the engine quit. This
is training realism (ADR-0002 rank 2); it adds no new procedure logic.

Sounds follow the trainer state. The systems model has no engine dynamics and
no flight dynamics (rpm comes from a detent table, airspeed from the phase set
point), so the audio layer makes run-up, run-down, the starter and the catch
itself, from state edges.

Users are club pilots on desktop first (ADR-0002 device priority). The owner
judges sound quality in a listening check; automated tests cannot hear.

### Owner decisions (2026-10-15, fixed)

| Topic            | Decision                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope            | Full cockpit audio: control clicks, engine, propeller, starter, airflow, electric motors, device beeps.                                       |
| Source           | Every sound is synthesised in the browser with Web Audio. No audio files.                                                                     |
| Controls         | A sound on/off toggle and a master volume slider.                                                                                             |
| Waves            | Wave 1 needs no new aircraft facts. Wave 2 refines against facts an owner-run intake session adds later (`CPT_ALLOW_REFERENCE=1`).            |
| Milestone        | Both waves are in one milestone, so its release waits for the owner's intake session.                                                         |
| Aircraft         | Only the CTSL gets aircraft sounds. The demo aircraft is silent apart from the shared control clicks.                                         |
| Spec change      | The audio non-goal (spec §1, §4.9; ADR-0001) is lifted for synthesised cockpit and device sounds (ADR-0003).                                  |
| Default          | Sound is on by default, below full volume (D9).                                                                                               |
| Header control   | One header button opens a popover with the on/off switch and the volume slider (D8).                                                          |
| Engine knowledge | Engine facts used only for sound (four cylinders, four-stroke, the cranking rpm) count as general knowledge under the intake §9 ruling (D16). |

### Out of scope

- Radio reception and transmission, intercom, audio selector, headset jacks,
  GPS sound and alarms. They need the outside world, and the intake excludes
  them (§3.3, §3.7, §3.8.1, §3.8.3).
- FLARM traffic and obstacle tones. There is no traffic (owner, 2026-10-11).
- A stall horn. The intake records the Generator lamp as the only warning lamp
  (§2a) and names no aural warning, and the systems have no stall state. Wave 2
  revisits it only if the intake session finds a horn (§13, question 5).
- Recorded samples, downloaded sounds, spatial or binaural audio.
- New screen-reader or keyboard work (ADR-0002 rank 7).

## 2. Tech stack

- Web Audio API, native nodes only: `AudioContext`, `OscillatorNode` with a
  `PeriodicWave`, `ConstantSourceNode`, `BiquadFilterNode`, `GainNode`, and an
  `AudioBuffer` filled with noise in JS.
- No `AudioWorklet`, no media elements, no new dependency.
- TypeScript, React, Vite, pnpm workspace (unchanged).
- Vitest with jsdom and a hand-written fake audio context whose state changes
  asynchronously; Playwright for the settings, context-state and CSP checks.

## 3. Commands

```
pnpm install                      # worktrees install their own dependencies
pnpm test                         # all unit tests
pnpm test:coverage                # what the required check job runs (statement threshold in vitest.config.ts)
pnpm test:e2e sound-settings      # one Playwright spec; E2E_PORT=<port> when the default port is busy
pnpm test:perf                    # local only; the step-3a A/B trace, sound on against sound off
pnpm lint && pnpm format:check && pnpm typecheck && pnpm build
pnpm dev                          # listening check in a real browser
```

## 4. Project structure

```
packages/core/src/contract/types.ts               ClickId, Tone, SoundCue, DeviceSounds, SoundDefinition; optional `click` on controls, `sounds` on aircraft and devices
packages/core/src/session/session.ts              Session.onControlChange (delivered from notify), Session.epoch
packages/core/src/devices/device-cues.ts          deviceCues: the pure device-cue diff
packages/core/src/validator/validate-aircraft.ts  rows `invalid-tone`, `beep-without-tones`
packages/panel-kit/src/audio/                     AudioOut, Voice, VoiceFactory; createAudioEngine; clickFor and click synthesis; beep synthesis; the voiceFactories registry
packages/panel-kit/src/audio/voices/              piston-engine, airflow, electric-motor (step 3a)
packages/panel-kit/src/audio/fake-audio-context.ts  test double, exported for tests only
packages/aircraft-ctsl/src/controls.ts            wave-1 `click` overrides (step 1)
packages/aircraft-ctsl/src/systems.ts             exports the rpm constants, `power` and `flapMotorRunning` (step 3a)
packages/aircraft-ctsl/src/sounds.ts              CTSL voice declarations (selectors and options)
packages/device-aera500/src/logic/aera500.ts      `click: 'silent'` on the touchscreen (step 1)
packages/device-flarm/src/logic/sounds.ts         FLARM beep table and cue diff, wired in logic/flarm.ts
apps/web/src/audio/                               AudioProvider (owns the engine), SoundControl, connectCockpitAudio, useCockpitAudio
apps/web/src/App.tsx                              mounts AudioProvider
apps/web/src/shell/TrainerLayout.tsx              mounts the driver (useCockpitAudio)
apps/web/src/shell/Header.tsx                     renders SoundControl beside LanguageSwitch
apps/web/src/storage/index.ts                     setting keys 'sound' and 'volume'
apps/web/src/aircraft-sounds.test.ts              every declared voice exists and its options are valid
apps/web/e2e/fixtures.ts                          seeds cpt.sound=off unless a spec opts out
apps/web/e2e/sound-settings.spec.ts               persistence, context state and CSP with sound on
```

No new package kind (decision D1).

## 5. Capability map

Module ids are stable; plans, issues and PRs select work by them. An arrow means
"depends on". Inside `apps/web`, only `App.tsx`, `Header.tsx` and
`TrainerLayout.tsx` reach `src/audio`.

| Id                      | Responsibility                                                                                                                                                                       | Where                                                                                   | Depends on                                                                                | Wave, step |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `spec-adr-0003`         | This spec, ADR-0003, the parent-spec and ADR-0001 edits                                                                                                                              | `docs/`                                                                                 | —                                                                                         | 1, step 0  |
| `sound-contract`        | Sound types, `ClickId`, the optional `click` on controls and `sounds` on aircraft and devices, the validator rows; the wave-1 `click` overrides as data (§6.4)                       | core `contract/types.ts`, `validator/`; CTSL `controls.ts`; aera 500 `logic/aera500.ts` | —                                                                                         | 1, step 1  |
| `session-epoch`         | `Session.epoch()` rises with every `runtime.reset`, inside its batch                                                                                                                 | core `session/session.ts`                                                               | —                                                                                         | 1, step 1  |
| `control-change-feed`   | `Session.onControlChange` delivers queued control changes from `notify()`, after the state listeners                                                                                 | core `session/session.ts`                                                               | —                                                                                         | 1, step 1  |
| `device-cue-diff`       | `deviceCues(aircraft, registry, previous, next)`                                                                                                                                     | core `devices/device-cues.ts`                                                           | `sound-contract`                                                                          | 1, step 1  |
| `audio-engine`          | Lazy `AudioContext`, unlock on gesture, `live()`, master gain taper, suspend and resume, tab visibility; the fake context; the `Voice` types and the empty `voiceFactories` registry | panel-kit `audio/`                                                                      | —                                                                                         | 1, step 2  |
| `audio-settings`        | `sound` and `volume` keys, validation, defaults; `AudioProvider`, which owns the engine                                                                                              | web `storage/`, `audio/`, `App.tsx`                                                     | `audio-engine`                                                                            | 1, step 2  |
| `sound-control`         | Header button with a popover holding the switch and the slider, en/de strings                                                                                                        | web `audio/`, `shell/Header.tsx`, `shell/header.messages.ts`                            | `audio-settings`                                                                          | 1, step 2  |
| `control-clicks`        | `clickFor(definition, change)` (the control's `click`, else the kind table) and the click synthesis, with a rate cap and a voice cap                                                 | panel-kit `audio/`                                                                      | `sound-contract`, `audio-engine`                                                          | 1, step 2  |
| `beep-voice`            | Plays a device's `Tone` sequence at a level                                                                                                                                          | panel-kit `audio/`                                                                      | `audio-engine`                                                                            | 1, step 2  |
| `cockpit-audio-driver`  | Connects a session to the engine on the trainer screen: clicks, voices, device cues, baselines, jumps, error containment                                                             | web `audio/`, `shell/TrainerLayout.tsx`                                                 | `control-change-feed`, `session-epoch`, `device-cue-diff`, `control-clicks`, `beep-voice` | 1, step 2  |
| `aircraft-voices`       | `piston-engine`, `airflow`, `electric-motor` voices; fills the `voiceFactories` registry                                                                                             | panel-kit `audio/voices/`                                                               | `audio-engine`, `sound-contract`                                                          | 1, step 3a |
| `aircraft-sounds-check` | Test: every declared voice id exists, `problems(options)` is empty, selectors run on every entry state                                                                               | web `aircraft-sounds.test.ts`                                                           | `aircraft-voices`, `ctsl-sounds`                                                          | 1, step 3a |
| `ctsl-sounds`           | CTSL `sounds`: selectors over its state and the sound profile; the general-knowledge engine values recorded beside intake §9 question 1                                              | `aircraft-ctsl/src/sounds.ts`, `systems.ts` exports, one line in `index.ts`; intake §9  | `sound-contract`                                                                          | 1, step 3a |
| `flarm-sounds`          | FLARM beep table and cue diff; the README and the intake §3.8.4 trainer paragraph                                                                                                    | `device-flarm/src/logic/sounds.ts`, `logic/flarm.ts`, `README.md`; intake §3.8.4        | `sound-contract`                                                                          | 1, step 3b |
| `ctsl-sound-facts`      | Engine variant, gearbox ratio, blade count, starter character as `piston-engine` options; blade-pass tone                                                                            | `aircraft-ctsl/src/sounds.ts`, panel-kit `audio/voices/`                                | `ctsl-sounds`, `aircraft-voices`                                                          | 2          |
| `flarm-beep-facts`      | Measured beep pitch, length, pattern and level ratios                                                                                                                                | `device-flarm/src/logic/sounds.ts`                                                      | `flarm-sounds`                                                                            | 2          |
| `ctsl-extra-cues`       | Only for what the intake session confirms: ELT buzzer, rescue deployment, detent clicks (`click` overrides), flap end stop                                                           | CTSL, panel-kit `audio/voices/`                                                         | `ctsl-sound-facts`                                                                        | 2          |

**Build order** (one issue, one PR per step):

0. `spec-adr-0003`.
1. `sound-contract`, `session-epoch`, `control-change-feed`, `device-cue-diff`:
   pure, unit-tested in core, plus the `click` overrides as data; nothing
   audible.
2. `audio-engine`, `audio-settings`, `sound-control`, `control-clicks`,
   `beep-voice`, `cockpit-audio-driver`: the first audible PR (clicks on both
   aircraft). The E2E fixture seeds sound off in the same PR; a ui-verifier
   pass on the header.
3. In parallel:
   - 3a. `aircraft-voices`, `aircraft-sounds-check`, `ctsl-sounds`.
   - 3b. `flarm-sounds`.

   They share only `docs/aircraft/ctsl-intake.md`, in different sections (3a:
   §9 question 1; 3b: §3.8.4). The merge train lands one and updates the other
   from `develop`.

4. Owner listening check (§12, criterion 13).
5. Wave 2, after the intake session: `ctsl-sound-facts`, `flarm-beep-facts`,
   then `ctsl-extra-cues` for each confirmed item.

Wave 2 adds no contract field: facts land as voice `options`, beep tables,
selectors and `click` overrides inside the aircraft and device packages, plus,
where a confirmed sound needs one, a new voice id in panel-kit or a new click
id (core `ClickId` and its panel-kit synthesis). `apps/web` does not change.

## 6. Design

### 6.1 Contract additions (core)

The new fields are optional, so the contract version does not change (the
`outsideCues` precedent, parent spec §4.6). Step 1 documents them in parent
spec §4.1 (`click`) and a new §4.10 Sounds (aircraft and device `sounds`).

```ts
export type ClickId =
  'rocker' | 'detent' | 'notch' | 'key' | 'push-pull' | 'latch' | 'handle' | 'soft';
// ControlBase gains: readonly click?: ClickId | 'silent'

export type Tone = { readonly hz: number; readonly ms: number; readonly pauseMs?: number };
export type SoundCue<B extends string = string> = { readonly beep: B; readonly level?: number };
export type DeviceSounds<D, B extends string = string> = {
  readonly beeps: { readonly [id in B]: readonly Tone[] };
  cues(previous: D, next: D): readonly SoundCue<B>[];
};
// DeviceDefinition gains: readonly sounds?: DeviceSounds<D, B>; defineDevice infers B

export type SoundDefinition<S> = {
  readonly voice: string;
  readonly options?: JsonObject;
  readonly inputs?: { readonly [name: string]: (state: TrainerState<S>) => number };
  /** Inputs that follow the phase set point: they jump on a carried phase change (§6.3). */
  readonly carried?: readonly string[];
};
// AircraftDefinition gains: readonly sounds?: { readonly [id: string]: SoundDefinition<S> }

export type DeviceCue = SoundCue & { readonly install: string; readonly device: string };
export function deviceCues(
  aircraft: Aircraft,
  registry: readonly Device[],
  previous: DeviceStates,
  next: DeviceStates,
): readonly DeviceCue[];
```

- An aircraft names voices by id, as it names panel-kit widgets; panel-kit
  implements them. Selectors and `cues` are pure functions over state, which
  keeps core and the packages free of audio APIs.
- `cues` sees only the device's own state `D`, as `step` does; `deviceCues`
  passes each install's `state`.
- `defineDevice` infers `B` from the `beeps` keys, so a cue naming an
  undeclared beep fails to compile.
- A voice silences itself from its inputs: there is no `on` condition, and a
  boolean passes as an input of 0 or 1.
- New validator rows (parent spec §8), over every device in the validation
  context: `invalid-tone` (a tone's `hz` and `ms` are finite and positive,
  `pauseMs` finite and not negative) and `beep-without-tones` (a beep with an
  empty sequence). Voice ids and options are checked by
  `aircraft-sounds-check`, since the voices live outside core.

### 6.2 Session additions (core)

```ts
// Session gains:
onControlChange(listener: (change: ControlChange) => void): () => void;
epoch(): number;
```

- `onControlChange` is not a second store subscriber. The session's own store
  subscriber queues each `ControlChange`, and `notify()` delivers the queue
  when the batch depth is 0, after the state listeners, with the same
  collect-then-rethrow loop. A listener therefore sees a change once the
  systems, devices and checklist have settled, including after a batched load,
  and a throwing listener can neither keep the store's other listeners from a
  change nor leave a load half done. The change carries the store's source
  union: `'pilot' | 'spring' | 'system'`.
- `epoch()` rises wherever the cockpit is set rather than flown into its state:
  every `runtime.reset` (`loadSnapshot`, `retryItem`, `restartLeg`). It rises
  inside the batch, so the batched `Session.subscribe` notification already
  shows the new epoch with the settled state.

### 6.3 Event sources, baselines and jumps

- **Screen**: the driver runs only on the trainer screen. `TrainerLayout`
  mounts it with `useCockpitAudio()`, an effect on `[session, aircraft, engine]`
  that returns the disconnect. The picker and the error screen unmount
  `TrainerLayout`, so every voice fades out there, although the advance timer
  keeps the session running (a cruise left for the picker keeps its engine
  state). Returning to the trainer is a new connection, so a baseline.
- **Clicks** come from `onControlChange` and play at the event's
  `context.currentTime`.
- **Continuous voices and device cues** read `session.state()` on
  `Session.subscribe`. It fires on every advance, on every control change and
  once per batched load, so the driver never counts callbacks as time: every
  voice update carries `nowMs` from an injected monotonic clock.
- **Device cues** are a diff between successive notifications. The device
  settles inside the control change (for example the FLARM steps volume on the
  key release), so the cue plays at that same notification, without waiting
  for the next tick.
- **One-shot cues and continuous voices.** A one-shot cue is a click, a beep,
  the starter engaging, the catch or the start of a run-down. A continuous
  voice is the engine, the airflow or the flap motor.
- **Baseline** (no cue diff, every input jumps): the first state of a
  connection, and every epoch change. A phase load that lands with the FLARM
  powered therefore makes no start-up beep, and the engine does not wind up
  audibly from 0 to cruise rpm.
- **Carried phase change** (no new baseline): `phase()` changed while
  `epoch()` did not. Two paths reach it: `track()` entering a procedure's
  `endPhase` (inside an advance, a check-off or a control change), and
  `startLeg` stepping one phase forward. Devices are settled, not reloaded, so
  the cue diff continues. Only the inputs a sound lists as `carried` jump;
  every other input, edge and fade plays out, so the flap motor that stops at
  the check ending a leg is still heard winding down.
- **Context creation, switching sound on, and resuming after the tab is
  shown**: every input jumps.
- **`live()`**: sound is on, the context exists and is not closed, the tab is
  visible, and the context is running or starting. Every create-or-resume
  from a gesture ends in a `resume()` call, and the context counts as starting
  until that promise settles; a touch `pointerdown` that builds a suspended
  context is therefore starting until the `touchend` resume. Clicks and cues
  schedule at `currentTime` whenever `live()` holds, so the click of the
  gesture that creates the context, and a FLARM start-up that the same gesture
  causes, play once the context runs. They are dropped, not queued, only while
  `live()` is false: a late start-up beep is wrong.
- **While not `live()`** the pure voice models keep stepping and no automation
  is issued; when `live()` returns, the driver passes one jump.
- **Runtime failure** (`status()` is failed): every voice fades out.
- **Containment**: the driver wraps every voice, click and cue call in
  `try`/`catch`. On the first error it logs once, stops every voice and stays
  silent until the next connection. It never rethrows, so `session.advance` in
  the timer and the pilot's press keep working.

### 6.4 Control clicks

A click plays only for `source === 'pilot'`. `clickFor(definition, change)`
takes the control's own `click` when it declares one, else the kind table, over
the aircraft's and its devices' controls (the same set the session builds with
`deviceControls`).

| Kind and change                                   | Fallback click                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `toggle`                                          | `rocker`                                                              |
| `rotary`                                          | one `detent` per position stepped, rate-capped                        |
| `rotary`, a move into a `springBack` position     | one `detent`, whatever the index distance (a radio knob's up or down) |
| `lever` with listed positions                     | `notch`                                                               |
| `lever` with `positions: 'continuous'`            | silent                                                                |
| `momentary` press                                 | `key`                                                                 |
| `breaker` (also BAT and GEN)                      | `push-pull`                                                           |
| `guarded`, `kind: 'guard'` change                 | `latch`                                                               |
| `guarded`, position change                        | `handle`                                                              |
| any `spring` or `system` change, any refused move | silent                                                                |

Wave-1 overrides, declared in step 1 where the kind would give a sound the real
control does not make:

| Control                               | `click`  | Reason                                                  |
| ------------------------------------- | -------- | ------------------------------------------------------- |
| CTSL `throttle`, `trim`               | `silent` | their listed positions are trainer detents, not notches |
| CTSL `brake`                          | `silent` | a hydraulic lever (intake §4.4), not a key              |
| CTSL `fuelValve`, `parkingBrakeValve` | `soft`   | a slide lever and a valve, not rockers                  |
| CTSL `choke`, `carbHeat`              | `soft`   | push-pull knobs, not notched levers                     |
| aera 500 `touch`                      | `silent` | a touchscreen                                           |

`soft` is a neutral, low click for a control whose own sound the intake does
not record. Every other control keeps the kind fallback; §13 question 11 asks
which have a distinct detent.

- `clickFor` uses `satisfies Record<ControlKind, …>`, so a new control kind
  fails to compile until it has a click or a stated silence.
- Device keys click like any momentary control: that is the key itself, not
  the unit's audio.
- A failure that trips a breaker (`system`) makes no click; a surprise is heard
  only through its effect, such as the engine quitting.
- One-shot sounds stop and disconnect themselves; a cap bounds how many play at
  once.

### 6.5 Aircraft voices

The CTSL declares (in `ctsl-sounds`):

| Sound id  | Voice            | Inputs                      | `carried`     |
| --------- | ---------------- | --------------------------- | ------------- |
| `engine`  | `piston-engine`  | `rpm`, `running`, `starter` | `rpm`         |
| `airflow` | `airflow`        | `airspeedKmh`               | `airspeedKmh` |
| `flaps`   | `electric-motor` | `driving`                   | —             |

- `starter` is 1 while the key is at START with BAT in. It follows the
  controls, not the systems' `starter.cranking`: that flag is the trainer's
  lockout, which drops at the starter time limit, stays false through the
  cool-down and drops at the catch. Held past the limit or during the
  cool-down, the starter still turns and the engine cannot catch; the lockout
  stands for the limit the pilot must respect (intake §4.2).
- `driving` is 1 while the flap motor turns: `flapMotorRunning(state)`,
  exported from `systems.ts`, applies the flap step's own overload cut-out, so
  the motor is silent while extension is held back above the flap speed
  (intake §4.4).
- The idle and maximum continuous rpm and the power share come from
  `systems.ts` exports (`IDLE_RPM`, `MAX_CONTINUOUS_RPM`, `power`), not copies.
- Options carry the profile; the voices know nothing about any aircraft, and
  `problems(options)` rejects a missing or out-of-range option.

Wave-1 values that are not intake facts:

| Value                                 | Used for                      | Status                                                                                                                                  |
| ------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Four cylinders, four-stroke           | firing frequency, uneven beat | general knowledge of the Rotax 912 the intake names (§4.2), accepted by the owner (D16); step 3a records it beside intake §9 question 1 |
| Cranking rpm                          | starter pulses                | general knowledge (D16), a voice default tuned by ear; recorded beside §9 question 1; §13 question 4 replaces it                        |
| Starter whine, levels, time constants | timbre and dynamics           | voice defaults tuned by ear, not aircraft facts                                                                                         |
| Airspeed reference                    | airflow level                 | intake §4.3, the airspeed red line                                                                                                      |
| Flap motor                            | `electric-motor`              | intake §4.4, electric spindle motor                                                                                                     |

The intake §9 owner ruling covers general knowledge of the CT Supralight where
a panel fact is missing. The owner extended it on 2026-10-15 to engine facts
heard only in sound (D16), so these values are recorded beside intake §9
question 1 as general knowledge, not as assumed (unverified).

#### Engine synthesis: native oscillator bank

- A `ConstantSourceNode` "rpm bus" carries the cycle frequency and drives the
  `frequency` of oscillators whose own value is 0 (an AudioParam's value is its
  own value plus its connected inputs).
- **Firing voice**: one oscillator with a `PeriodicWave` whose energy sits on
  the firing orders, with small lower orders for the uneven four-stroke beat.
  Low-passed noise added to the bus gives cycle-to-cycle variation.
- **Exhaust**: looping noise through a band-pass into a gain that a second
  oscillator on the bus modulates at the firing frequency.
- **Starter**: a whine plus compression pulses at the cranking rpm with no
  combustion.
- **Airflow** (its own voice): the same noise through a low-pass whose cutoff
  rises with speed.
- **Flap motor** (its own voice): a small electric-motor whine that fades in
  and out with `driving`.

Why this approach, over an AudioWorklet pulse train and pre-rendered loops:
every node is native, so the main thread makes a few `setTargetAtTime` calls
per change and none while targets hold; it needs no module of its own, so the
build and the precache list gain no entry; and a fake context can test every
node. The worklet's extra pulse detail is not what recognition rewards;
pre-rendered loops beat against each other when crossfaded and still need a
synthesiser to render from. If the listening check finds the bank too
synthetic, a worklet voice replaces it behind the same `Voice` interface (§14,
question 2).

#### Parameter mapping

`rpm` is engine rpm: the tachometer reads it, and the systems' idle and limits
are the Rotax engine's (intake §3.10.5, §4.2).

- Cycle frequency f_c = rpm / 120 Hz (one four-stroke cycle per two
  revolutions); this is the bus value.
- Firing frequency f_f = rpm / 60 × cylinders / 2, harmonic `cylinders` of
  f_c.
- Level: p = `power(rpm)`. Gain in dB rises from an idle level to 0 with p;
  below idle (cranking, run-down, windmilling) it is also scaled by rpm / idle.
- Brightness: the firing low-pass sits at f_f times a fixed harmonic count, so
  the tone colour follows pitch, and opens further with p.
- Exhaust: band-pass centre proportional to f_f; modulation depth falls as p
  rises (pulsing idle, smoother power).
- Airflow: gain (v / v_ref)², cutoff rising with v. Airspeed steps with the
  phase set point; the smoothing turns each step into a short swell.
- Blade-pass tone: wave 2 only, f_b = rpm / ratio / 60 × blades, once the
  intake gives the gearbox ratio and blade count.

#### Dynamics: a pure model, then smoothing

A pure `step(previous, input, dtMs)` holds the smoothed values with the same
first-order `approach` the CTSL systems use (§9). Separate time constants for
throttle up, throttle down, the catch (shortest), run-down (longest) and wind
live in the profile and are tuned by ear. The graph then calls
`setTargetAtTime(value, currentTime, SMOOTHING_S)` only for a target that
changed, with `SMOOTHING_S = STEP_MS / 3 / 1000` (AudioParam times are in
seconds, `STEP_MS` in milliseconds), so each step is nearly done within one
tick.

Edges the model reacts to:

1. `starter` rises: starter whine on; with the engine stopped, rpm moves to
   the cranking rpm. Over a running engine (the key turned to START by
   mistake) only the whine is added; rpm keeps the state value.
2. `running` rises while the starter turns or the engine windmills: the catch.
   Firing gain to full; rpm to the state value at the catch time constant.
3. `starter` falls without `running` (a failed start: no choke when cold, the
   key released before the catch, an engine failure, or the trainer's starter
   lockout): whine down; rpm to 0 at the run-down time constant.
4. `running` falls: ignition cut. Firing gain to 0 at once; rpm to the state
   value (0, or windmill rpm in flight) at the run-down time constant.
5. Not running with rpm above 0 (in flight only): windmilling, swish and wind
   without firing — what a pilot hears as "engine quit".
6. A jump (§6.3): each listed input's smoothed values take their target at
   once.

Because the state's rpm follows the magneto selection, the drop on one circuit
is heard as a pitch change by the rpm ratio.

### 6.6 Device beeps

- A device declares `sounds: { beeps, cues }`. `deviceCues` walks the
  aircraft's installs, calls each device's `cues(previous, next)` on the
  install's previous and next device `state` and tags each
  cue with the install and device id. The driver plays the named beep through
  `beep-voice` at the cue's level.
- **FLARM** (intake §3.8.4):
  - every cue needs `!next.lowSupply`: below the supply limit the unit does not
    operate;
  - start-up: `powered` false to true gives one short beep at loud, the level
    the unit starts in. It runs off the avionics bus, so the power-on paths are
    the Avionics Master on with BAT in, and BAT in with the Avionics Master on;
  - volume step: `previous.powered && next.powered`, a changed `volume`, and a
    new volume other than `silent` give one tone at the new level. A power-on
    resets the volume to loud; that is a start-up, not a step;
  - the FLARM's own `volume` scales its cues; `silent` mutes them;
  - no tone on the step into `silent` is **inferred**: the intake gives a tone
    at the new level and records nothing for silent;
  - the mode swap and its LED run make no sound in wave 1 (the intake names
    none).
- Pitch, length and the loud, medium and quiet ratios are **assumed
  (unverified)** in wave 1 and come from the intake session in wave 2.
- No other device declares beeps in wave 1. The ATR833, TRT800H and aera 500
  audio stays excluded; the demo's com and transponder declare none.

### 6.7 Audio engine lifecycle

In panel-kit:

```ts
export type AudioOut = { readonly context: BaseAudioContext; readonly input: AudioNode };
export type AudioEngine = {
  setEnabled(on: boolean): void;
  setVolume(level: number): void;
  out(): AudioOut | undefined;
  live(): boolean;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};
export function createAudioEngine(target: Document, create?: () => AudioContext): AudioEngine;

export type VoiceFrame = {
  readonly nowMs: number;
  readonly live: boolean;
  /** The inputs that take their target at once (§6.3). */
  readonly jump: readonly string[];
};
export type Voice = {
  update(inputs: Readonly<Record<string, number>>, frame: VoiceFrame): void;
  stop(): void;
};
export type VoiceFactory = {
  create(out: AudioOut, options: JsonObject): Voice;
  problems(options: JsonObject): readonly string[];
};
export function clickFor(definition: ControlDefinition, change: ControlChange): ClickId | undefined;
```

In `apps/web`:

```ts
export function connectCockpitAudio(
  session: Session,
  aircraft: Aircraft,
  registry: readonly Device[],
  engine: AudioEngine,
  clock?: () => number,
): () => void;
```

- The context is created lazily, only while sound is on, from capture-phase
  listeners on the document for `pointerdown`, `pointerup`, `click`,
  `touchend` and `keydown`. A browser grants audio only to a user activation:
  `pointerdown` counts for a mouse only, a touch counts on `pointerup` or
  `touchend`, and iOS Safari unlocks only on `touchend` or `click`. Each of
  these events calls create-or-resume (always ending in `resume()`) while sound
  is on and the context is not running. The listeners come off once the context runs and are installed again
  on every `statechange` away from running (a failed resume, Safari's
  interrupted state). With sound off from the start, no context is ever built.
- A capture-phase listener runs before the control's own handler, so the click
  of that gesture schedules on the starting context (§6.3, `live()`).
- `setEnabled` keeps only the latest request. Off: cancel the master gain's
  scheduled values, ramp it to 0, then `suspend()` only if sound is still off.
  On: cancel, `resume()` (pressing the switch is the gesture), ramp to the
  volume; the driver passes a jump.
- Tab hidden: `suspend()`. Visible again: `resume()` if sound is on; if the
  browser refuses without a gesture, the listeners wait for the next one.
- A voice's pure model keeps its state through mute; its graph jumps to it on
  the way back.
- Without `AudioContext` (jsdom), the trainer stays silent and works.

### 6.8 Settings and header control

- `SettingKey` gains `'sound'` (`on` or `off`) and `'volume'` (an integer 0 to
  100 stored as a string). Reads are validated like `theme` and `language` (an
  allow-list, plus an integer range for the volume), not like `recall`, which
  its caller compares with `'on'`; an invalid or unreadable value falls back to
  the default.
- Default: sound on, volume a constant below full scale (D9).
- Master gain is (volume / 100)², a perceptual taper.
- `AudioProvider` sits between `ThemeProvider` and `TrainerProvider` in
  `App.tsx` and reads and writes settings as the theme provider does. It
  creates the engine inside its own effect and returns `dispose` as that
  effect's cleanup, exposing the engine through state. Under StrictMode the
  remount then builds a fresh engine instead of keeping a disposed one.
- `SoundControl` is one icon button beside `LanguageSwitch`, the same
  footprint as `ThemeSwitch`, in both header variants. Its speaker or
  speaker-off icon shows the state. It opens a popover (the `aria-haspopup`
  pattern of `AppFooter`, outside-click close as in `ControlDetails`) with the
  on/off switch (`role="switch"`, `aria-checked`) and a range slider at least
  `--size-target` tall, disabled while sound is off.
- App frame only: colours, type and spacing from `tokens.css`; nothing on the
  panel.
- Strings in `shell/header.messages.ts`: en "Sound", "Sound on", "Sound off",
  "Volume"; de "Ton", "Ton an", "Ton aus", "Lautstärke".

## 7. Cue inventory

| Cue                                              | Type       | Trigger                                                      | Wave             |
| ------------------------------------------------ | ---------- | ------------------------------------------------------------ | ---------------- |
| Control clicks                                   | one-shot   | pilot `ControlChange`, by `click` or kind (§6.4)             | 1, both aircraft |
| FLARM start-up beep                              | one-shot   | FLARM power-on edge with supply                              | 1                |
| FLARM volume tone                                | one-shot   | brief push steps the volume; none at silent                  | 1                |
| Starter and catch                                | one-shot   | key at START with BAT in; `engine.running` edges             | 1                |
| Engine                                           | continuous | `rpm`, `engine.running`; magneto drop heard as pitch         | 1                |
| Windmilling                                      | continuous | not running, rpm above 0, in flight                          | 1                |
| Airflow                                          | continuous | `airspeedKmh`                                                | 1                |
| Flap motor                                       | continuous | `flapMotorRunning`                                           | 1                |
| Blade-pass tone                                  | continuous | `rpm`, once ratio and blade count are known                  | 2                |
| ELT, rescue system, detent clicks, flap end stop | one-shot   | only if the intake session confirms them                     | 2                |
| Stall horn                                       | continuous | only if the intake finds one; needs a stall state (§14)      | 2, conditional   |
| Never                                            | —          | FLARM traffic and obstacle tones; radio, intercom, GPS audio | —                |

## 8. Decisions

- **D1 Voices, clicks, beeps and the context lifecycle live in panel-kit;
  `apps/web` owns the settings, the header control and the driver. No new
  package kind.** An aircraft names a voice as it names a widget (ADR-0001
  decisions 1 and 4), so an aircraft that needs a new voice adds it to
  panel-kit and `apps/web` stays untouched. Panel-kit already depends on core
  only and runs in the browser; a separate audio package would need a new
  ESLint package kind and a `tools/boundary.test.ts` row for no gain.
- **D2 Sounds are declared, not contained.** Aircraft and devices declare
  data plus pure selectors; panel-kit implements voices by id. Adding an
  aircraft stays one package and one registry line.
- **D3 Clicks only for `source === 'pilot'`; `spring` is silent.** One action,
  one click: a tap on a key is a press and a release a fraction of a second
  apart, and two clicks would read as a double press. The ignition key's
  return from START is heard as the starter stopping. `system` covers loads,
  retries and failure trips, and a click on a trip would give a surprise away.
- **D4 One `piston-engine` voice owns starter, catch and run-down; airflow and
  flap motor are their own voices.** The catch is an edge between the starter
  and `running` and shares the smoothed rpm with the starter, so they belong in
  one model; airflow depends only on airspeed.
- **D5 Native oscillator bank, no worklet in wave 1** (§6.5): no module of its
  own in the build or the precache, and a fake context tests every node.
- **D6 `epoch` marks resets; a carried phase change jumps only the `carried`
  inputs and keeps the cue diff** (§6.3). A reset sets the cockpit; a carried
  change flies into the next phase, where the set point moves at once but
  edges and fades are real.
- **D7 Device beeps are a pure diff, not a condition.** The FLARM tones mark
  changes (power-on, a new volume); a condition would repeat or need state.
  Cues are dropped only while `live()` is false.
- **D8 Header control is one button with a popover.** `shell.spec.ts` keeps
  the header in one row in German with the longest titles, and every item
  clear of the others at every tested viewport; a second 44 px item would have
  to pass both again. Cost: turning sound off takes two clicks. Confirmed by
  the owner 2026-10-15.
- **D9 Sound defaults to on, below full volume.** Training realism ranks above
  polish; the owner asked for full cockpit audio; browsers stay silent until
  the first gesture, so the first sound answers the pilot's own click. The
  shared E2E fixture seeds sound off, so only `sound-settings.spec.ts` meets
  the default. Confirmed by the owner 2026-10-15.
- **D10 `beep-voice` ships with the driver in step 2**, which keeps the driver
  in one PR and lets 3a and 3b touch disjoint code.
- **D11 Engine facts unknown to the intake stay out of wave 1.** The 912
  variant, gearbox ratio and propeller are unknown (intake §4.2, §9 questions 1
  and 11), so wave 1 has no blade-pass tone; the values it does use are listed
  in §6.5 with their status.
- **D12 The demo aircraft declares no sounds.** It plays the shared control
  clicks only (owner decision).
- **D13 A control may name its click.** The kind gives the fallback; a control
  whose real counterpart sounds different declares its own click or silence
  (§6.4). Recognition over detail: a key click on a hydraulic brake lever
  teaches a sound that does not exist.
- **D14 Audio plays only on the trainer screen** (§6.3), since the session
  keeps advancing behind the picker and the error screen.
- **D15 The starter sound follows the key, not the lockout** (§6.5), so the
  audio does not teach that the starter stops itself.
- **D16 Engine facts used only for sound are general knowledge.** The owner
  extended the intake §9 ruling on 2026-10-15 to the four cylinders, the
  four-stroke cycle and the cranking rpm. They are recorded beside intake §9
  question 1 as general knowledge, not as assumed (unverified); §13 questions 1
  and 4 still refine them. Any other general knowledge keeps the §9 marking
  (§11).

## 9. Code style

The voice model uses the same first-order smoothing as the CTSL systems model
(`packages/aircraft-ctsl/src/systems.ts`):

```ts
const approach = (value: number, target: number, dtMs: number, timeConstantMs: number) =>
  target + (value - target) * Math.exp(-dtMs / timeConstantMs);
```

- Pure functions for everything testable without audio (`clickFor`, the
  engine model, `deviceCues`, the FLARM `cues`); audio nodes only in voices
  and the engine.
- Kebab-case voice and click ids; named exports; Prettier (single quotes,
  print width 100).
- `satisfies Record<ControlKind, …>` for kind tables.
- The `AudioContext` factory and the clock are injected; only the default
  factory line is untested.
- Constants carry their meaning and unit in their name; comments only for a
  non-obvious why, never a tuned value or timing.

## 10. Testing strategy

- **Core (Vitest).** `onControlChange`: a pilot press emits `pilot`, a release
  `spring`, a load only `system`; the listener runs after the state listeners,
  with state settled; a throwing listener leaves a `jumpToPhase` load complete
  and the other listeners served. `epoch` rises on every reset path and not on
  `takeChecklist` or a carried phase change. The validator rows
  `invalid-tone` and `beep-without-tones`. `deviceCues` tags install and
  device, and returns nothing for devices without sounds.
- **Packages.** FLARM cues fed by the real `step`: each power-on path gives one
  start-up cue; brief pushes give one tone per step and none at silent; set
  quiet, cycle the supply: exactly one cue, the start-up; no cue with low
  supply. CTSL selectors over a real start: crank, catch, idle, full, magneto
  check, shutdown, failed start (no choke when cold; key released before the
  catch), key held past the lockout (starter on, no catch), windmill relight,
  flap motor off during the overload cut-out.
- **Pure mappers.** A table test over kind × change × source to click or
  silence: a declared `click` wins; a spring-back knob gives one click up and
  one click down; the aera 500 touchscreen is silent.
- **Engine model.** Sequences assert smoothed rpm, gains and edges with no
  audio; the clock is injected; with `live` false no automation is issued, and
  the next live frame jumps.
- **Graph (fake context).** A hand-written `FakeAudioContext` records node
  creation, connections, AudioParam automation with its arguments,
  `start`/`stop`, `suspend` and `resume`, with a settable `currentTime`; its
  state stays `suspended` until a microtask runs after creation or `resume()`.
  It asserts: every voice reaches the master gain and the master the
  destination; master gain equals the taper; with sound off the factory is
  never called; the bus equals rpm / 120; one automation call per changed
  target, with the time constant `SMOOTHING_S`, and none while steady; live
  nodes return to baseline after many clicks; the voice cap holds; the first
  gesture's click is scheduled on the starting context; a first gesture that
  powers the FLARM schedules its start-up beep; off then on in quick
  succession leaves the context running; `addModule` and
  `createMediaElementSource` are never called.
- **Driver.** Connects only on the trainer screen; a baseline on connect and
  on an epoch change; a carried phase change through `track()` and through
  `startLeg` jumps only the `carried` inputs, keeps the cue diff and lets the
  flap motor fade; a fake node that throws leaves `session.advance` and a press
  working, logs once and silences audio.
- **App.** `aircraft-sounds-check` over the registry. Settings round-trip,
  garbage values and throwing storage fall back to defaults. Testing Library:
  `AudioProvider` rendered in StrictMode keeps the unlock listeners installed;
  the popover; the switch's `aria-checked`; slider disabled while off; en/de
  labels.
- **Coverage.** Statements stay at or above the `vitest.config.ts` threshold
  with no new excludes.
- **E2E.** The auto fixture in `apps/web/e2e/fixtures.ts` seeds
  `cpt.sound=off` through an init script when the key is absent, behind a
  fixture option that `sound-settings.spec.ts` turns off; `pnpm test:perf`
  runs through the same fixture, and only its local sound-on A/B arm
  (`E2E_SOUND=on`) turns the option off. `sound-settings.spec.ts` (importing from
  `./fixtures`, so the CSP fixture applies): sound off survives a reload; the
  volume survives a reload; with sound on, an init script wraps `AudioContext`
  so the spec reads `state` and sees `running` after the first panel press;
  operating BAT and the ignition key to START gives no CSP violation and no
  `pageerror`. No spec asserts audible output; no autoplay flags. The
  `shell.spec.ts` header tests run unchanged.
- **Performance** (step 3a, ADR-0002 rank 3). An A/B `pnpm test:perf` run on
  the same build, sound on against sound off; the PR names any cost. No pinned
  number.
- **ui-verifier** for step 2: 1920x1080 and 3840x2160 first, then 1024x768, in
  en and de and both themes. The button meets the touch target at every size
  and overlaps nothing; the popover opens and closes on an outside click; the
  slider works by touch at 1024; the state survives a reload; no console
  errors; the panel is unchanged.
- **Owner listening check** after step 3, listed in the release summary
  (criterion 13).

## 11. Boundaries

**Always**

- Synthesise at runtime; keep `csp.ts` unchanged.
- Take aircraft facts only from the intake, paraphrased; mark general
  knowledge **assumed (unverified)**, record it beside its intake §9 question
  and list it in the PR. The engine facts of D16 are recorded as general
  knowledge instead.
- Tie a unit's beep to its power-on path, never to page or phase load.
- Seed `cpt.sound=off` in the shared E2E fixture; only the sound spec opts out,
  besides the local perf A/B arm with sound on (§10), which never runs in CI.
- Use the fake context in unit tests; never require audible output.
- Colours, type and spacing from `tokens.css`; the control stays in the app
  frame.

**Ask first**

- A stall state, flight or engine dynamics in the systems model (exporting
  existing constants and `flapMotorRunning` is not one).
- An `AudioWorklet` voice (a built same-origin module and a precache change).
- A new dependency, a new package kind, or any change to the parent spec's
  decisions table.
- Changing the sound default the owner confirmed (D9).

**Never**

- Radio, intercom, audio selector or GPS audio; FLARM traffic or obstacle
  tones.
- Recorded, downloaded or manufacturer sounds, or any audio file in the repo
  (gate G1).
- `blob:` or `data:` audio, media elements, or a relaxed CSP.
- Aircraft sounds for the demo aircraft.
- Reading `reference/` in an implementation agent; wave-2 facts come through
  the intake.

## 12. Success criteria

1. On a phase load, a retry or a leg restart, no one-shot cue fires and every
   continuous voice takes its target with a full jump: for every ordered pair
   of `phaseOrder` ids, for `retryItem` and `restartLeg`, in the CTSL and the
   demo.
2. Exactly one FLARM beep per power-on (Avionics Master on with BAT in; BAT in
   with the Avionics Master on), also from a volume other than loud; none on
   page or phase load or with low supply; one tone per brief push, none at
   silent.
3. Each pilot change of every control gives its click or a documented silence;
   a spring-back knob gives one click per move either way; `spring`, `system`
   and refused moves are silent.
4. A click starts at its event's `currentTime`; the first click after load, by
   mouse, keyboard or touch, creates or resumes the context and plays once it
   runs.
5. With sound off from the start, no `AudioContext` is constructed; switching
   off suspends it.
6. Engine pitch follows rpm, and a magneto drop changes the frequency target
   by the rpm ratio.
7. A catch is heard only when `running` rises while the starter turns or the
   engine windmills; shutdown runs down, not cut off.
8. Live voices stay bounded and return to baseline (fake clock).
9. `csp.ts` has no diff and the E2E CSP fixture is green.
10. Coverage at or above the threshold with no new excludes; lint, typecheck
    and `tools/boundary.test.ts` green.
11. The `shell.spec.ts` header tests pass unchanged at every tested viewport in
    en and de, and the ui-verifier passes.
12. `cpt.sound` and `cpt.volume` survive a reload; invalid values fall back to
    the defaults.
13. In the owner listening check, the start and catch, the magneto drop, the
    cruise drone with airflow, the flap motor and the FLARM power-up beep are
    each recognised.
14. No voice plays on the picker or the error screen.
15. An exception in audio never escapes `session.advance` or a press.

## 13. Wave 2: questions for the intake session

The owner runs these with `CPT_ALLOW_REFERENCE=1`; the answers land in
`docs/aircraft/ctsl-intake.md`, paraphrased, and wave-2 PRs read only the
intake.

1. **Engine**: 912 UL or ULS (§9 question 1)? Gearbox reduction ratio;
   confirm four cylinders, four-stroke.
2. **Propeller**: make and blade count (§9 question 11), for the blade-pass
   tone.
3. **Relight threshold**: the intake gives windmill relight from about 200
   propeller rpm, and the systems compare it with engine rpm. With the ratio
   from question 1 it converts to engine rpm (a systems-model fix, outside this
   spec).
4. **Starter and start**: engagement sound, cranking rate, typical crank time
   to the catch, the flare at the catch, run-down length, rpm on choke.
5. **Aural warnings**: confirm none (horn, buzzer, tone into the intercom).
6. **ELT**: which unit; does it or its remote switch sound in the cabin when
   on or in its self-test?
7. **FLARM** (display sheet V5.1e, manual 242): pitch, length and pattern of
   the start-up beep and the volume tone; loud, medium and quiet relative to
   each other; a tone on the step into silent; does the mode swap sound?
8. **Flap actuator**: is it audible in the cabin? Different extending and
   retracting? An end-stop sound?
9. **Rescue system**: what the pilot hears on pulling the handle (the intake
   has the rocket exiting through the top, §4.5).
10. **Other units**: any panel unit besides the FLARM with its own speaker or
    buzzer (key or power-on tones), not via the intercom? The existing
    exclusions stay.
11. **Detents**: which controls have a distinct audible detent or sound (fuel
    valve, parking-brake valve, choke, carb heat, throttle, trim, flap
    selector, altimeter knob, BAT and GEN, ignition key)? Is the owner's pilot
    knowledge an acceptable source?

## 14. Open questions

The owner answered the sound default (D9), the header control (D8) and the
engine general knowledge (D16) on 2026-10-15.

1. **Click overrides** (owner). The wave-1 silent and `soft` list (§6.4) until
   §13 question 11 is answered.
2. **Engine voice quality** (owner, listening check). If the oscillator bank
   sounds too synthetic, an `AudioWorklet` voice replaces it behind the same
   interface, shipped as a built same-origin module under `script-src 'self'`.
3. **Stall horn** (owner, only if question 5 of §13 finds one). It needs a
   stall state the systems lack; that is a spec change.

## 15. Document changes

Made with this spec: parent spec §1 Out of scope and §4.9 scope boundary;
ADR-0001 Status and Out of scope; ADR-0003.

Owed by the implementing PRs:

- Step 1: parent spec §4.1 (the optional `click`), a new §4.10 Sounds (aircraft
  and device `sounds`), §8 (the rows `invalid-tone` and `beep-without-tones`);
  `docs/adding-an-aircraft.md`, `docs/adding-a-device.md`.
- Step 2: parent spec §5 Screen (header items) and Persistence (`cpt.sound`,
  `cpt.volume`), §9 Testing (a row for audio); `docs/architecture.md`
  (Persistence; panel-kit audio and the `apps/web` audio folder);
  `CONTRIBUTING.md` Package boundaries (panel-kit holds controls, gauges and
  audio); `SECURITY.md` and `docs/security-assurance-case.md` C2 (the
  persisted settings) and the `input_validation` row of
  `docs/openssf-best-practices-badge.md` (the new keys' validation). The
  `CLAUDE.md` app-settings line (`sound`, `volume`, seeded off by the E2E
  fixture) is the orchestrator's change, in the main session, landed as its
  own issue and PR from a worktree.
- Step 3a: intake §9 question 1 (the general-knowledge engine values of §6.5,
  D16).
- Step 3b: `packages/device-flarm/README.md` in the same PR as the
  `notModelled` text, which `tools/device-readme.test.ts` keeps equal:
  Controls (the volume tone), Power cycle (the start-up beep), Not modelled
  (the sound line is rewritten, not dropped, since traffic tones already sit
  under "Traffic and obstacle warnings"); the intake §3.8.4 trainer paragraph
  that says the volume is never heard.
