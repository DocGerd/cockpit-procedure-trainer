# Cockpit sounds — Design

Status: proposed 2026-10-15 · Owner: Patrick Kuhn · ADR:
`docs/adr/0003-synthesised-cockpit-audio.md` · Parent spec:
`2026-10-05-cockpit-procedure-trainer-design.md` §1 (Out of scope), §4.3, §4.9,
§5 (Screen, Persistence), §9.

This spec reconciles three design notes (engine synthesis, architecture, cue
inventory). Where they differed, §8 names the choice and the reason.

## 1. Objective

The pilot hears the cockpit. Every control the pilot operates makes its sound,
the engine cranks, catches, runs and stops audibly, the airflow rises with
speed, the flap motor runs, and the FLARM display beeps at start-up and on a
volume step. The point is recognition: a pilot hears that the engine caught,
that the rpm dropped on one magneto circuit, that the engine quit. This is
training realism (ADR-0002 rank 2); it adds no new procedure logic.

Sounds follow the trainer state. The systems model has no engine dynamics and
no flight dynamics (rpm comes from a detent table, airspeed from the phase set
point), so the audio layer makes run-up, run-down, the starter and the catch
itself, from state edges.

Users are club pilots on desktop first (ADR-0002 device priority). The owner
judges sound quality in a listening check; automated tests cannot hear.

### Owner decisions (2026-10-15, fixed)

| Topic         | Decision                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope         | Full cockpit audio: control clicks, engine, propeller, starter, airflow, electric motors, device beeps.                                            |
| Source        | Every sound is synthesised in the browser with Web Audio. No audio files.                                                                         |
| Controls      | A sound on/off toggle and a master volume slider.                                                                                                 |
| Waves         | Wave 1 needs no new aircraft facts. Wave 2 refines against facts an owner-run intake session adds later (`CPT_ALLOW_REFERENCE=1`).                |
| Aircraft      | Only the CTSL gets aircraft sounds. The demo aircraft is silent apart from the shared control clicks.                                            |
| Spec change   | The audio non-goal (spec §1, §4.9; ADR-0001) is lifted for synthesised cockpit and device sounds (ADR-0003).                                     |

### Out of scope

- Radio reception and transmission, intercom, audio selector, headset jacks,
  GPS sound and alarms. They need the outside world, and the intake excludes
  them (§3.3, §3.7, §3.8.1, §3.8.3).
- FLARM traffic and obstacle tones. There is no traffic (owner, 2026-10-11).
- A stall horn. The intake records the Generator lamp as the only warning
  (§2a), and the systems have no stall state. Wave 2 revisits it only if the
  intake session finds a horn (§13, question 5).
- Recorded samples, downloaded sounds, spatial or binaural audio.
- New screen-reader or keyboard work (ADR-0002 rank 7).

## 2. Tech stack

- Web Audio API, native nodes only: `AudioContext`, `OscillatorNode` with a
  `PeriodicWave`, `ConstantSourceNode`, `BiquadFilterNode`, `GainNode`, and an
  `AudioBuffer` filled with noise in JS.
- No `AudioWorklet`, no media elements, no new dependency.
- TypeScript, React, Vite, pnpm workspace (unchanged).
- Vitest with jsdom and a hand-written fake audio context; Playwright for the
  settings and CSP checks.

## 3. Commands

```
pnpm install                      # worktrees install their own dependencies
pnpm test                         # all unit tests
pnpm test:coverage                # what the required check job runs (statement threshold in vitest.config.ts)
pnpm test:e2e sound-settings      # one Playwright spec; E2E_PORT=<port> when the default port is busy
pnpm lint && pnpm format:check && pnpm typecheck && pnpm build
pnpm dev                          # listening check in a real browser
```

## 4. Project structure

```
packages/core/src/contract/types.ts        Tone, SoundCue, DeviceSounds, SoundDefinition; optional `sounds` fields
packages/core/src/session/session.ts       Session.onControlChange, Session.epoch
packages/core/src/devices/device-cues.ts   deviceCues: the pure device-cue diff
packages/aircraft-ctsl/src/sounds.ts       CTSL voice declarations (selectors and options)
packages/device-flarm/src/logic/sounds.ts  FLARM beep table and cue diff
apps/web/src/audio/                        engine (context lifecycle), clicks, beeps, driver, AudioProvider, SoundControl
apps/web/src/audio/voices/                 the voiceFactories registry (step 2, empty); piston-engine, airflow, electric-motor (step 3a)
apps/web/src/audio/fake-audio-context.ts   test double, used only by tests
apps/web/src/storage/index.ts              setting keys 'sound' and 'volume'
apps/web/src/shell/Header.tsx              renders SoundControl beside LanguageSwitch
apps/web/src/aircraft-sounds.test.ts       every declared voice exists and its options are valid
apps/web/e2e/sound-settings.spec.ts        persistence and CSP with sound on
```

No new package kind (decision D1).

## 5. Capability map

Module ids are stable; plans, issues and PRs select work by them. An arrow means
"depends on". Nothing outside `apps/web/src/audio` depends on it except
`Header.tsx` and the trainer, which mounts the driver.

| Id                      | Responsibility                                                                                                      | Where                                                     | Depends on                                                                         | Wave, step |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| `spec-adr-0003`         | This spec, ADR-0003, the parent-spec and ADR-0001 edits                                                             | `docs/`                                                   | —                                                                                  | 1, step 0  |
| `sound-contract`        | Sound types and the optional `sounds` fields on aircraft and device                                                 | core `contract/types.ts`                                  | —                                                                                  | 1, step 1  |
| `session-epoch`         | `Session.epoch()` rises with every `runtime.reset`, inside its batch                                                | core `session/session.ts`                                 | —                                                                                  | 1, step 1  |
| `control-change-feed`   | `Session.onControlChange` forwards control changes after the session has settled                                   | core `session/session.ts`                                 | —                                                                                  | 1, step 1  |
| `device-cue-diff`       | `deviceCues(aircraft, registry, previous, next)`                                                                    | core `devices/device-cues.ts`                             | `sound-contract`                                                                   | 1, step 1  |
| `audio-settings`        | `sound` and `volume` keys, validation, defaults, `AudioProvider`                                                    | web `storage/`, `audio/`                                  | —                                                                                  | 1, step 2  |
| `audio-engine`          | Lazy `AudioContext`, unlock on gesture, master gain taper, suspend and resume, tab visibility                       | web `audio/`                                              | `audio-settings`                                                                   | 1, step 2  |
| `sound-control`         | Header button with a popover holding the toggle and the slider, en/de strings                                       | web `audio/`, `shell/Header.tsx`, `shell/header.messages.ts` | `audio-settings`                                                                | 1, step 2  |
| `control-clicks`        | `clickFor(definition, change)` and the click synthesis, with a rate cap and a voice cap                             | web `audio/`                                              | `audio-engine`                                                                     | 1, step 2  |
| `beep-voice`            | Plays a device's `Tone` sequence at a level                                                                         | web `audio/`                                              | `audio-engine`                                                                     | 1, step 2  |
| `cockpit-audio-driver`  | Connects a session to the engine: clicks, voices, device cues, baselines and jumps; the empty `voiceFactories` registry it looks voices up in | web `audio/`                                              | `control-change-feed`, `session-epoch`, `device-cue-diff`, `control-clicks`, `beep-voice` | 1, step 2  |
| `aircraft-voices`       | `piston-engine`, `airflow`, `electric-motor` voices; fills the `voiceFactories` registry                           | web `audio/voices/`                                       | `audio-engine`, `sound-contract`                                                   | 1, step 3a |
| `aircraft-sounds-check` | Test: every declared voice id exists, `problems(options)` is empty, selectors run on every entry state             | web `aircraft-sounds.test.ts`                             | `aircraft-voices`                                                                  | 1, step 3a |
| `ctsl-sounds`           | CTSL `sounds`: selectors over its state and the sound profile constants                                             | `aircraft-ctsl/src/sounds.ts`, one line in `index.ts`     | `sound-contract`                                                                   | 1, step 3a |
| `flarm-sounds`          | FLARM beep table and cue diff; the `notModelled` sound line and the intake §3.8.4 trainer paragraph                 | `device-flarm/src/logic/sounds.ts`                        | `sound-contract`                                                                   | 1, step 3b |
| `ctsl-sound-facts`      | Engine variant, gearbox ratio, blade count, starter character as `piston-engine` options; blade-pass tone          | `aircraft-ctsl/src/sounds.ts`, web `audio/voices/`        | `ctsl-sounds`, `aircraft-voices`                                                   | 2          |
| `flarm-beep-facts`      | Measured beep pitch, length, pattern and level ratios                                                               | `device-flarm/src/logic/sounds.ts`                        | `flarm-sounds`                                                                     | 2          |
| `ctsl-extra-cues`       | Only for what the intake session confirms: ELT buzzer, rescue deployment, distinct detents, flap end stop          | CTSL, web `audio/voices/`                                 | `ctsl-sound-facts`                                                                 | 2          |

**Build order** (one issue, one PR per step):

0. `spec-adr-0003`.
1. `sound-contract`, `session-epoch`, `control-change-feed`, `device-cue-diff`:
   pure, unit-tested in core, nothing audible.
2. `audio-settings`, `audio-engine`, `sound-control`, `control-clicks`,
   `beep-voice`, `cockpit-audio-driver`: the first audible PR (clicks on both
   aircraft), with a ui-verifier pass on the header.
3. In parallel, touching disjoint files:
   - 3a. `aircraft-voices`, `aircraft-sounds-check`, `ctsl-sounds`.
   - 3b. `flarm-sounds`.
4. Owner listening check (§11, criterion 13).
5. Wave 2, after the intake session: `ctsl-sound-facts`, `flarm-beep-facts`,
   then `ctsl-extra-cues` for each confirmed item.

Wave 2 changes no structure: facts land as voice `options`, beep tables and
selectors inside the aircraft and device packages, plus new voice ids where a
confirmed sound needs one.

## 6. Design

### 6.1 Contract additions (core)

Both new fields are optional, so the contract version does not change (the
`outsideCues` precedent, parent spec §4.3).

```ts
export type Tone = { readonly hz: number; readonly ms: number; readonly pauseMs?: number };
export type SoundCue = { readonly beep: string; readonly level?: number };
export type DeviceSounds<D> = {
  readonly beeps: { readonly [id: string]: readonly Tone[] };
  cues(previous: DeviceState<D>, next: DeviceState<D>): readonly SoundCue[];
};
// DeviceDefinition gains: readonly sounds?: DeviceSounds<D>

export type SoundDefinition<S> = {
  readonly voice: string;
  readonly options?: JsonObject;
  /** Absent: always on; the voice silences itself. */
  readonly on?: Condition<S>;
  readonly inputs?: { readonly [name: string]: (state: TrainerState<S>) => number };
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

An aircraft names voices by id, as it names panel-kit widgets; `apps/web`
implements them. Selectors and `cues` are pure functions over state, which
keeps core and the packages free of audio APIs.

### 6.2 Session additions (core)

```ts
// Session gains:
onControlChange(listener: (change: ControlChange) => void): () => void;
epoch(): number;
```

- `onControlChange` subscribes to the control store after the session's own
  subscriber, so the systems and devices have settled when audio sees the
  change. The change carries the store's real source union:
  `'pilot' | 'spring' | 'system'`.
- `epoch()` rises wherever the cockpit is set rather than flown into its state:
  every `runtime.reset` (`loadSnapshot`, `retryItem`, `restartLeg`). It rises
  inside the batch, so the batched `Session.subscribe` notification already
  shows the new epoch with the settled state.

### 6.3 Event sources, baselines and jumps

- **Clicks** come from `onControlChange` and play at the event's
  `context.currentTime`.
- **Continuous voices and device cues** read `session.state()` on
  `Session.subscribe`. It fires on every advance, on every control change and
  once per batched load, so the driver never counts callbacks as time: the
  voice model takes `dt` from an injected monotonic clock.
- **Device cues** are a diff between successive notifications. The device
  settles inside the control change (for example the FLARM steps volume on the
  key release), so the cue plays at that same notification, without waiting
  for the next tick.
- **Baseline** (no cue diff, voices jump): the first state the driver sees from
  a session (page load, aircraft switch), and every epoch change. A phase load
  that lands with the FLARM powered therefore makes no start-up beep, and the
  engine does not wind up audibly from 0 to cruise rpm.
- **Jump without a new baseline**: a carried phase change (a full-flight leg
  stepping one phase forward, `enterPhase` with `runtime.carry`). Devices are
  settled, not reloaded, so the cue diff continues; the phase set points jump,
  so continuous voices take their new targets at once.
- **Other jumps**: switching sound on and the context resuming. While the
  context is not running, cues are dropped, not queued: a late start-up beep
  is wrong.
- **Runtime failure** (`status()` is failed): every voice fades out.
- **Session change**: the driver disconnects and stops its voices; the trainer
  mounts it with `useEffect(() => connectCockpitAudio(...), [session, engine])`
  next to the advance timer.

### 6.4 Control clicks

A click plays only for `source === 'pilot'`. The timbre comes from the
control's `kind`, looked up over the aircraft's and its devices' controls (the
same set the session builds with `deviceControls`).

| Kind and change                                             | Click                                         |
| ----------------------------------------------------------- | --------------------------------------------- |
| `toggle`                                                    | rocker snap                                   |
| `rotary`, including spring-back device knobs and the ignition key | one detent per position stepped, rate-capped (the altimeter knob has many detents) |
| `lever` with listed positions (throttle, trim, choke)       | notch                                         |
| `lever` with `positions: 'continuous'`                      | silent                                        |
| `momentary` press                                           | key                                           |
| `breaker` (also BAT and GEN)                                | push-pull click                               |
| `guarded`, `kind: 'guard'` change                           | pin or latch                                  |
| `guarded`, position change                                  | handle                                        |
| any `spring` or `system` change, any refused move           | silent                                        |

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

| Sound id   | Voice            | `on`            | Inputs                          |
| ---------- | ---------------- | --------------- | ------------------------------- |
| `engine`   | `piston-engine`  | always          | `rpm`, `running`, `cranking`    |
| `airflow`  | `airflow`        | always          | `airspeedKmh`                   |
| `flaps`    | `electric-motor` | `flaps.moving`  | —                               |

Booleans pass as 0 or 1. Options carry the profile: cylinders and strokes,
idle and maximum continuous rpm (intake §4.2), the starter's cranking rpm, the
time constants, and for `airflow` the airspeed red line (intake §4.3) as the
reference speed. Four cylinders, four-stroke is general knowledge of the Rotax
912 and is used as **assumed (unverified)** under the intake §9 owner ruling
until the intake session confirms it. The voices know nothing about any
aircraft; `problems(options)` rejects a missing or out-of-range option.

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
- **Flap motor** (its own voice): a small electric-motor whine with a fade in
  and out.

Why this approach, over an AudioWorklet pulse train and pre-rendered loops:
every node is native, so the main thread makes a few `setTargetAtTime` calls
per change and none while targets hold; it needs no module URL, so `csp.ts`
and the precache list stay as they are; and a fake context can test it. The
worklet's extra pulse detail is not what recognition rewards; pre-rendered
loops beat against each other when crossfaded and still need a synthesiser to
render from. If the listening check finds the bank too synthetic, a worklet
voice replaces it behind the same `Voice` interface (§14, question 2).

#### Parameter mapping (`rpm` taken as engine rpm)

- Cycle frequency f_c = rpm / 120 Hz (one four-stroke cycle per two
  revolutions); this is the bus value.
- Firing frequency f_f = rpm / 60 × cylinders / 2, harmonic `cylinders` of
  f_c.
- Level: p = clamp((rpm − idle) / (max − idle)), the same share the systems
  model calls power. Gain in dB rises from an idle level to 0 with p; below
  idle (cranking, run-down, windmilling) it is also scaled by rpm / idle.
- Brightness: the firing low-pass sits at f_f times a fixed harmonic count, so
  the tone colour follows pitch, and opens further with p.
- Exhaust: band-pass centre proportional to f_f; modulation depth falls as p
  rises (pulsing idle, smoother power).
- Airflow: gain (v / v_ref)², cutoff rising with v.
- Blade-pass tone: wave 2 only, f_b = rpm / ratio / 60 × blades, once the
  intake gives the gearbox ratio and blade count.

#### Dynamics: a pure model, then smoothing

A pure `step(previous, input, dtMs)` holds the smoothed values with the same
first-order `approach` the CTSL systems use (§9). Separate time constants for
throttle up, throttle down, the catch (shortest), run-down (longest) and wind
live in the profile and are tuned by ear. The graph then calls
`setTargetAtTime(value, currentTime, STEP_MS / 3)` only for a target that
changed, so each step is nearly done within one tick.

Edges the model reacts to:

1. `cranking` rises: starter whine on; rpm moves to the cranking rpm.
2. `running` rises while cranking or windmilling: the catch. Firing gain to
   full; rpm to the state value at the catch time constant.
3. `cranking` falls without `running` (failed start: no choke when cold,
   magnetos off, the starter's time limit): whine down; rpm to 0 at the
   run-down time constant.
4. `running` falls: ignition cut. Firing gain to 0 at once; rpm to the state
   value (0, or windmill rpm in flight) at the run-down time constant.
5. not running with rpm above 0 (in flight only): windmilling, swish and wind
   without firing — what a pilot hears as "engine quit".
6. A jump (§6.3): every smoothed value takes its target at once.

Because the state's rpm follows the magneto selection, the drop on one circuit
is heard as a pitch change by the rpm ratio.

### 6.6 Device beeps

- A device declares `sounds: { beeps, cues }`. `deviceCues` walks the
  aircraft's installs, calls each device's `cues(previous, next)` and tags each
  cue with the install and device id. The driver plays the named beep through
  `beep-voice` at the cue's level.
- **FLARM** (intake §3.8.4):
  - start-up: `powered` false to true gives one short beep at loud, the level
    the unit starts in;
  - volume step: a change of `volume` while powered gives one tone at the new
    level; a step into `silent` gives none;
  - the FLARM's own `volume` scales its cues; `silent` mutes them;
  - the mode swap and its LED run make no sound in wave 1 (the intake names
    none).
- Pitch, length and the loud, medium and quiet ratios are **assumed
  (unverified)** in wave 1 and come from the intake session in wave 2.
- No other device declares beeps in wave 1. The ATR833, TRT800H and aera 500
  audio stays excluded; the demo's com and transponder declare none.

### 6.7 Audio engine lifecycle

```ts
export type AudioOut = { readonly context: BaseAudioContext; readonly input: AudioNode };
export type AudioEngine = {
  unlock(): void;
  setEnabled(on: boolean): void;
  setVolume(level: number): void;
  out(): AudioOut | undefined;
  running(): boolean;
  dispose(): void;
};
export function createAudioEngine(create?: () => AudioContext): AudioEngine;

export type Voice = {
  update(on: boolean, inputs: Readonly<Record<string, number>>, jump: boolean): void;
  stop(): void;
};
export type VoiceFactory = {
  create(out: AudioOut, options: JsonObject): Voice;
  problems(options: JsonObject): readonly string[];
};
export function clickFor(definition: ControlDefinition, change: ControlChange): ClickId | undefined;
export function connectCockpitAudio(
  session: Session,
  aircraft: Aircraft,
  registry: readonly Device[],
  engine: AudioEngine,
): () => void;
```

- The context is created lazily, only while sound is on, from a capture-phase
  `pointerdown` or `keydown` listener on `document`. That listener runs before
  the control's own handler, so the first click is heard. It is removed once
  the context runs. With sound off from the start, no context is ever built.
- Off: ramp the master gain to 0, then `suspend()`. On: `resume()`; pressing
  the toggle is the gesture.
- Tab hidden: `suspend()`. Visible again: `resume()` if sound is on, or else
  wait for the next gesture.
- Voices keep their state through mute and stop when the session changes.
- Without `AudioContext` (jsdom), the trainer stays silent and works.

### 6.8 Settings and header control

- `SettingKey` gains `'sound'` (`on` or `off`) and `'volume'` (an integer 0 to
  100 stored as a string). Reads are validated like `recall`; an invalid or
  unreadable value falls back to the default.
- Default: sound on, volume a constant below full scale (D9).
- Master gain is (volume / 100)², a perceptual taper.
- `AudioProvider` sits between `ThemeProvider` and `TrainerProvider` in
  `App.tsx` and reads and writes settings as the theme provider does.
- `SoundControl` is one icon button beside `LanguageSwitch`, the same
  footprint as `ThemeSwitch`, in both header variants. Its speaker or
  speaker-off icon shows the state. It opens a popover (the `aria-haspopup`
  pattern of `AppFooter`, outside-click close as in `ControlDetails`) with the
  on/off switch and a range slider at least `--size-target` tall, disabled
  while sound is off.
- App frame only: colours, type and spacing from `tokens.css`; nothing on the
  panel.
- Strings in `shell/header.messages.ts`: en "Sound", "Sound on", "Sound off",
  "Volume"; de "Ton", "Ton an", "Ton aus", "Lautstärke".

## 7. Cue inventory

| Cue                  | Trigger                                                     | Wave         |
| -------------------- | ----------------------------------------------------------- | ------------ |
| Control clicks       | pilot `ControlChange`, by kind (§6.4)                       | 1, both aircraft |
| FLARM start-up beep  | FLARM power-on edge                                         | 1            |
| FLARM volume tone    | brief push steps the volume; none at silent                 | 1            |
| Starter and catch    | `starter.cranking`, `engine.running` edges                   | 1            |
| Engine               | `rpm`, `engine.running`; magneto drop heard as pitch         | 1            |
| Windmilling          | not running, rpm above 0, in flight                         | 1            |
| Airflow              | `airspeedKmh`                                               | 1            |
| Flap motor           | `flaps.moving`                                              | 1            |
| Blade-pass tone      | `rpm`, once ratio and blade count are known                 | 2            |
| ELT, rescue system, distinct detents, flap end stop | only if the intake session confirms them | 2 |
| Stall horn           | only if the intake finds one; needs a stall state (§14)     | 2, conditional |
| Never                | FLARM traffic and obstacle tones; radio, intercom, GPS audio | —           |

## 8. Decisions

- **D1 Synth code lives in `apps/web/src/audio/`; no new package kind.** Core
  and device logic are plain data and pure functions, an aircraft names
  widgets and devices by id, and the app would be the only consumer of an
  audio package, which would also need a new ESLint package kind and a
  `tools/boundary.test.ts` row. The notes differed on the folder name
  (`audio/` and `sound/`); `audio/` is used throughout.
- **D2 Sounds are declared, not contained.** Aircraft and devices declare
  data plus pure selectors; the app implements voices by id. Adding an
  aircraft stays one package and one registry line.
- **D3 Clicks only for `source === 'pilot'`; `spring` is silent.** One action,
  one click: a tap on a key is a press and a release a fraction of a second
  apart, and two clicks would read as a double press. The ignition key's
  return from START is heard as the starter stopping. The notes differed (one
  sounded spring returns); the cue inventory's rule is kept. `system` covers
  loads, retries and failure trips, and a click on a trip would give a
  surprise away.
- **D4 One `piston-engine` voice owns starter, catch and run-down; airflow and
  flap motor are their own voices.** The catch is an edge between `cranking`
  and `running` and shares the smoothed rpm with the starter, so they belong
  in one model; airflow depends only on airspeed. The architecture note left
  the voice list to the sound design, and the engine note's model is used.
- **D5 Native oscillator bank, no worklet in wave 1** (§6.5). `csp.ts` stays
  unchanged and no file joins the precache.
- **D6 `epoch` marks resets; a carried phase change jumps voices but keeps the
  cue diff.** The engine note jumped on any phase change, the architecture
  note on resets only; both are kept for their own case (§6.3).
- **D7 Device beeps are a pure diff, not a condition.** The FLARM tones mark
  changes (power-on, a new volume); a condition would repeat or need state.
  Cues are dropped while the context is not running.
- **D8 Header control is one button with a popover.** `shell.spec.ts` keeps
  the header in one row in German with the longest titles, and every item
  clear of the others at every tested viewport; a second 44 px item would
  have to pass both again. Cost: turning sound off takes two clicks. The
  architecture note placed the toggle and slider inline; the popover is used.
- **D9 Sound defaults to on, below full volume.** Training realism ranks above
  polish; the owner asked for full cockpit audio; browsers stay silent until
  the first gesture, so the first sound answers the pilot's own click; E2E sets
  the settings explicitly, so no test depends on the default. Listed for owner
  confirmation (§14, question 1).
- **D10 `beep-voice` ships with the driver in step 2.** The architecture note
  put it in 3b; moving it keeps the driver in one PR and lets 3a and 3b touch
  disjoint files.
- **D11 Engine facts unknown to the intake stay out of wave 1.** The 912
  variant, gearbox ratio and propeller are unknown (intake §4.2, §9 questions 1
  and 11), so wave 1 has no blade-pass tone; the cylinder count is assumed
  (unverified).
- **D12 The demo aircraft declares no sounds.** It plays the shared control
  clicks only (owner decision).

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
- The `AudioContext` factory is injected; only the default factory line is
  untested.
- Constants carry their meaning in their name; comments only for a
  non-obvious why, never a tuned value or timing.

## 10. Testing strategy

- **Core (Vitest).** `onControlChange`: a pilot press emits `pilot`, a release
  `spring`, a load only `system`, and the listener runs after state has
  settled. `epoch` rises on every reset path and not on `takeChecklist` or a
  carried leg step. `deviceCues` tags install and device, and returns nothing
  for devices without sounds.
- **Packages.** FLARM cues fed by the real `step`: power toggled gives one
  start-up cue; brief pushes give one tone per step and none at silent. CTSL
  selectors over a real start: crank, catch, idle, full, magneto check,
  shutdown, failed start, windmill relight.
- **Pure mappers.** A table test over kind × change × source to click or
  silence.
- **Engine model.** Sequences assert smoothed rpm, gains and edges with no
  audio; the clock is injected.
- **Graph (fake context).** A hand-written `FakeAudioContext` records node
  creation, connections, AudioParam automation, `start`/`stop`, `suspend` and
  `resume`, with a settable `currentTime`. It asserts: every voice reaches the
  master gain and the master the destination; master gain equals the taper;
  with sound off the factory is never called; the bus equals rpm / 120; one
  automation call per changed target and none while steady; live nodes return
  to baseline after many clicks; the voice cap holds; `addModule` and
  `createMediaElementSource` are never called.
- **App.** `aircraft-sounds-check` over the registry. Settings round-trip,
  garbage values and throwing storage fall back to defaults. Testing Library:
  popover, `aria-pressed`, slider disabled while off, en/de labels.
- **Coverage.** Statements stay at or above the `vitest.config.ts` threshold
  with no new excludes.
- **E2E** (`sound-settings.spec.ts`, importing from `./fixtures`, so the CSP
  fixture applies). Sound off survives a reload; the volume survives a reload;
  with sound on, operating BAT and the ignition key to START gives no CSP
  violation and no `pageerror`. No spec asserts audible output; no autoplay
  flags. The `shell.spec.ts` header tests run unchanged.
- **ui-verifier** for step 2: 1920 first, then 1440 and 1024, en and de, both
  themes. The button meets the touch target and overlaps nothing; the popover
  opens and closes on an outside click; the slider works by touch at 1024; the
  state survives a reload; no console errors; the panel is unchanged.
- **Owner listening check** after step 3, listed in the release summary
  (criterion 13).

## 11. Boundaries

**Always**

- Synthesise at runtime; keep `csp.ts` unchanged.
- Take aircraft facts only from the intake, paraphrased; mark general
  knowledge **assumed (unverified)** and list it in the PR.
- Tie a unit's beep to its power-on path, never to page or phase load.
- Set `cpt.sound` and `cpt.volume` explicitly in browser checks.
- Use the fake context in unit tests; never require audible output.
- Colours, type and spacing from `tokens.css`; the control stays in the app
  frame.

**Ask first**

- A stall state, flight or engine dynamics in the systems model.
- An `AudioWorklet` voice (a built same-origin module and a precache change).
- A new dependency, a new package kind, or any change to the parent spec's
  decisions table.
- Changing the sound default after the owner answers §14 question 1.

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

1. No cue plays on a phase load, retry or leg restart, in every CTSL phase
   pair (ground to cruise included) and in the demo.
2. Exactly one FLARM beep per power-on (BAT in, supply cycle) and none on page
   or phase load; one tone per brief push, none at silent.
3. Each pilot change of every control kind gives its click or a documented
   silence; `spring`, `system` and refused moves are silent.
4. A click starts at its event's `currentTime`; the first click after load
   creates and resumes the context and still plays.
5. With sound off from the start, no `AudioContext` is constructed; switching
   off suspends it.
6. Engine pitch follows rpm, and a magneto drop changes the frequency target
   by the rpm ratio.
7. A catch is heard only when `running` rises while cranking or windmilling;
   shutdown runs down, not cut off.
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

## 13. Wave 2: questions for the intake session

The owner runs these with `CPT_ALLOW_REFERENCE=1`; the answers land in
`docs/aircraft/ctsl-intake.md`, paraphrased, and wave-2 PRs read only the
intake.

1. **Engine**: 912 UL or ULS (§9 question 1)? Gearbox reduction ratio;
   confirm four cylinders, four-stroke.
2. **Propeller**: make and blade count (§9 question 11), for the blade-pass
   tone.
3. **rpm unit**: the intake gives windmill relight in propeller rpm, the
   systems compare it with the engine-rpm field. Which does the rpm gauge
   show? (The audio layer treats the field as engine rpm.)
4. **Starter and start**: engagement sound, cranking rate, typical crank time
   to the catch, the flare at the catch, run-down length, rpm on choke.
5. **Aural warnings**: confirm none besides the Generator lamp (horn, buzzer,
   tone into the intercom).
6. **ELT**: which unit; does it or its remote switch sound in the cabin when
   on or in its self-test?
7. **FLARM** (display sheet V5.1e, manual 242): pitch, length and pattern of
   the start-up beep and the volume tone; loud, medium and quiet relative to
   each other; does the mode swap sound?
8. **Flap actuator**: audible? Different extending and retracting? An end-stop
   sound? Does it run while extension is held back above the flap speed (the
   model reports it moving then)?
9. **Rescue system**: rocket or spring, and what the pilot hears on pulling
   the handle.
10. **Other units**: any panel unit besides the FLARM with its own speaker or
    buzzer (key or power-on tones), not via the intercom? The existing
    exclusions stay.
11. **Detents**: which controls have a distinct audible detent (fuel valve,
    parking-brake valve, BAT and GEN, ignition key)? Is the owner's pilot
    knowledge an acceptable source?

## 14. Open questions

1. **Sound default** (owner). Used until answered: on, below full volume (D9).
2. **Engine voice quality** (owner, listening check). If the oscillator bank
   sounds too synthetic, an `AudioWorklet` voice replaces it behind the same
   interface, shipped as a built same-origin module under `script-src 'self'`.
3. **Stall horn** (owner, only if question 5 of §13 finds one). It needs a
   stall state the systems lack; that is a spec change.
4. **rpm unit** (systems model, §13 question 3). If the field is propeller
   rpm, the windmill relight comparison and the voice mapping both change.

## 15. Document changes

Made with this spec: parent spec §1 Out of scope and §4.9 scope boundary;
ADR-0001 Status and Out of scope; ADR-0003.

Owed by the implementing PRs:

- Step 1: parent spec §4.3 and §4.9 (the optional `sounds` fields),
  `docs/adding-an-aircraft.md`, `docs/adding-a-device.md`.
- Step 2: parent spec §5 Screen (header items) and Persistence (`cpt.sound`,
  `cpt.volume`), §9 Testing (a row for audio), `docs/architecture.md`
  (Persistence; the audio folder in the `apps/web` row).
- Step 3b: the FLARM `notModelled` sound line ("kept but never heard") and the
  intake §3.8.4 trainer paragraph that says the same.
