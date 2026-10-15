# M21 Cockpit Sounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the pilot hears the cockpit. Controls click, the engine cranks, catches, runs and stops, the airflow follows the phase airspeed, the flap motor runs, and the FLARM display beeps at start-up and on a volume step, so a pilot recognises what the aircraft does by ear.

**Design:** `docs/superpowers/specs/2026-10-15-cockpit-sounds-design.md` (capability map §5, build order §5, success criteria §12, wave-2 questions §13) and `docs/adr/0003-synthesised-cockpit-audio.md`. ADR 0002: rank 2 training realism; rank 3 performance (the A/B perf run); accessibility ranks lowest, so no task adds screen-reader or keyboard work.

**Inputs:** the owner approved the spec and ADR-0003 on 2026-10-15 with three answers, recorded in the spec: sound defaults on, below full volume (D9); one header button with a popover holding the switch and the slider (D8); engine facts used only for sound (four cylinders, four-stroke, the cranking rpm) are general knowledge under the intake §9 ruling (D16).

**Milestone:** "M21 Cockpit sounds" (GitHub milestone number TBD). Every task below is one GitHub issue, one branch and one PR with `Closes #<n>`. `T0` to `T25d` are placeholders the orchestrator replaces with issue numbers when it files them; the issue body is the task's section below.

**Tech stack:** Web Audio native nodes only (spec §2). No new dependency, no `AudioWorklet`, no media elements, no audio files.

## Task index

Phase = spec build-order step (Phase 1 also takes `audio-engine` from step 2, decision 2). Group = tasks that may run at the same time; a letter group starts when its dependencies have landed.

| Task | Title                                                    | Capability ids (spec §5)               | Phase | Depends on      | Group      | Size | Changelog    |
| ---- | -------------------------------------------------------- | -------------------------------------- | ----- | --------------- | ---------- | ---- | ------------ |
| T0   | Land the sounds spec, ADR-0003 and this plan             | `spec-adr-0003`                        | 0     | —               | —          | M    | No changelog |
| T1   | Session control-change feed and reset epoch              | `control-change-feed`, `session-epoch` | 1     | T0              | 1A         | M    | No changelog |
| T2   | Sound contract types and validator rows                  | `sound-contract` (types)               | 1     | T0              | 1A         | M    | No changelog |
| T3   | Wave-1 click overrides as data                           | `sound-contract` (data)                | 1     | T2              | 1B         | M    | No changelog |
| T4   | Device cue diff and contract docs                        | `device-cue-diff`                      | 1     | T2              | 1B         | M    | No changelog |
| T5   | Audio engine lifecycle and fake context                  | `audio-engine`                         | 1     | T0              | 1A         | M    | No changelog |
| T6   | Control clicks: `clickFor` and click synthesis           | `control-clicks`                       | 2     | T2, T5          | 2A         | M    | No changelog |
| T7   | Sound settings keys and security docs                    | `audio-settings` (storage)             | 2     | T0              | 2A (or 1A) | M    | No changelog |
| T8   | AudioProvider and the E2E sound-off seed                 | `audio-settings` (provider)            | 2     | T5, T7          | 2B         | M    | No changelog |
| T9   | Beep voice                                               | `beep-voice`                           | 2     | T2, T5          | 2A         | S    | No changelog |
| T10  | Header sound control                                     | `sound-control`                        | 2     | T8              | 2C         | M    | `added`      |
| T11  | Cockpit audio driver: clicks (first audible slice)       | `cockpit-audio-driver` (clicks)        | 2     | T1, T3, T6, T10 | 2D         | M    | `added`      |
| T12  | Cockpit audio driver: voices, device cues, baselines     | `cockpit-audio-driver` (voices, cues)  | 2     | T4, T9, T11     | 2E         | M    | No changelog |
| T13  | Step-2 documentation                                     | owed docs (spec §15, step 2)           | 2     | T11             | 2E         | M    | No changelog |
| T14  | Piston-engine model (pure)                               | `aircraft-voices` (engine model)       | 3     | T12             | 3A         | S    | No changelog |
| T15  | Piston-engine voice graph                                | `aircraft-voices` (engine graph)       | 3     | T14             | 3B         | M    | No changelog |
| T16  | Airflow and electric-motor voices                        | `aircraft-voices` (airflow, motor)     | 3     | T15             | 3C         | M    | No changelog |
| T17  | CTSL sound declarations                                  | `ctsl-sounds`                          | 3     | T2, T14         | 3B         | M    | No changelog |
| T18  | FLARM beeps                                              | `flarm-sounds`                         | 3     | T2, T12         | 3A         | M    | `added`      |
| T19  | CTSL sounds wired, aircraft sounds check and perf A/B    | `aircraft-sounds-check`, `ctsl-sounds` | 3     | T15, T16, T17   | 3D         | S    | `added`      |
| T20  | Cockpit audio over the real aircraft                     | criteria 1, 2, 8 (spec §12)            | 3     | T18, T19        | 3E         | S    | No changelog |
| T21  | Sound-facts intake session (owner, blocked)              | wave-2 input (spec §13)                | 4     | T17, T18, owner | 4A         | S    | No changelog |
| T22  | Engine voice: blade-pass tone and fact options (blocked) | `ctsl-sound-facts` (panel-kit)         | 4     | T21, T19        | 4B         | M    | No changelog |
| T23  | CTSL engine sound facts (blocked)                        | `ctsl-sound-facts` (CTSL)              | 4     | T22             | 4C         | S    | `changed`    |
| T24  | FLARM beep facts (blocked)                               | `flarm-beep-facts`                     | 4     | T21, T18        | 4B         | S    | `changed`    |
| T25a | Detent clicks (blocked, conditional)                     | `ctsl-extra-cues`                      | 4     | T21, T3         | 4B         | M    | `changed`    |
| T25b | ELT buzzer (blocked, conditional)                        | `ctsl-extra-cues`                      | 4     | T23             | 4D         | M    | `added`      |
| T25c | Rescue-system deployment (blocked, conditional)          | `ctsl-extra-cues`                      | 4     | T25b or T23     | 4D         | M    | `added`      |
| T25d | Flap end stop (blocked, conditional)                     | `ctsl-extra-cues`                      | 4     | T25c or T23     | 4D         | M    | `added`      |

Counts: Phase 0 one task; Phase 1 five; Phase 2 eight; Phase 3 seven; Phase 4 four plus four conditional. A conditional task is filed only for an item the intake session confirms; the chain T25b → T25c → T25d skips any item not filed.

Branches: `docs/<n>-…` for T0, T13 and T21; `feat/<n>-…` for the rest (CONTRIBUTING.md Flow).

## Pre-flight checks

**(a) T0 has landed.** The spec reads "Approved 2026-10-15" and §14 holds only the three open questions.

**(b) The E2E seed before the first sound.** T8 seeds `cpt.sound=off` in the shared fixture; T11, the first PR that plays anything, depends on it through T10.

**(c) A mute before the first sound.** UAT is `develop`, deployed per push, and the default is sound on (D9). T10 (the header control) lands before T11 (the first click).

**(d) Facts come from the intake.** Wave 1 reads intake §4.2 (engine), §4.3 (airspeed red line), §4.4 (flap motor, overload cut-out) and §3.8.4 (FLARM) only. `reference/` is never read; wave-2 PRs read only what T21 lands in the intake.

**(e) Numbered lists.** Wave 1 adds no intake §9 question: T17 annotates question 1, T18 edits the §3.8.4 trainer paragraph. T21 owns the new questions 71 to 79 (see Shared files). If another PR takes any of those numbers first, the orchestrator renumbers here before T21 starts.

## Global constraints

- Everything in the M12 plan's Global constraints applies: base `develop`, one issue per PR with `Closes #<n>`, a fragment or a `No changelog:` line, separate-agent review via `pr-selfreview`, `merge-train`, tests first, and the Checks chain before every push.
- **Checks chain** (CONTRIBUTING.md Checks; the required `check` job): `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm test:e2e`. Iterate with `pnpm test`; filter E2E with `pnpm test:e2e <spec>`; set `E2E_PORT=<port>` when the default port is busy.
- An issue's **Files** list is its allowlist: at most five files, not counting the changelog fragment and the barrel or registry rows pre-assigned under Shared files. A task that needs another file names it and why in the PR.
- Synthesise at runtime with native nodes. No audio file, recording, `blob:` or `data:` audio, media element or `AudioWorklet`; `apps/web/src/csp.ts` has no diff (spec §11).
- Unit tests use the panel-kit `FakeAudioContext` and an injected clock; no test asserts audible output; no autoplay flags. Coverage stays at or above the `vitest.config.ts` threshold with no new excludes.
- Colours, type and spacing come only from `apps/web/src/styles/tokens.css`; the sound control stays in the app frame, nothing on the panel.
- Comments only where the code cannot say it; no tuned value, timing or measured figure in a comment (constants and the intake own them).
- Every implementer stops the dev servers, watchers and poll loops it started before handing back; never `pkill` by name.

## Shared files: pre-assigned edits

| File                                                                             | Owner tasks and position                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`          | T0: §1, §4.9 (done). T4: §4.1 (`click`), new §4.10 Sounds, §8 (two validator rows). T13: §5 Screen and Persistence, §9 Testing. No other task.                                                                                                                                                                                       |
| `docs/aircraft/ctsl-intake.md`                                                   | T17: a "Trainer (sounds)" note under §9 question 1 and one clause in the §9 owner-ruling paragraph (D16). T18: the §3.8.4 "Trainer (M18)" paragraph's sound sentence. T21: §9 answers to questions 1 and 11, new questions 71 to 79, §4.2 and §3.8.4 facts. T17 and T18 run in parallel on disjoint sections; T21 starts after both. |
| `packages/panel-kit/src/index.ts`                                                | T5 only: `export * from './audio';`.                                                                                                                                                                                                                                                                                                 |
| `packages/panel-kit/src/audio/index.ts`                                          | T5 creates it (`audio-engine`, `fake-audio-context`). T9 inserts `beep-voice` as the first line. T6 appends `click-for` and `clicks` at the end. T12 appends `voice-factories` after T6's lines. Voices export nothing here.                                                                                                         |
| `packages/panel-kit/src/audio/voice-factories.ts`                                | T12 creates the empty registry and the `Voice`, `VoiceFrame` and `VoiceFactory` types. T15 adds `'piston-engine'`; T16 adds `airflow` and `'electric-motor'`; T25b to T25d add their voice ids, in that order.                                                                                                                       |
| `packages/panel-kit/src/audio/voices/noise.ts`                                   | T15 creates the shared noise buffer; T16 reuses it.                                                                                                                                                                                                                                                                                  |
| `apps/web/src/audio/index.ts`                                                    | T8 creates it (`AudioProvider`); T10 adds `SoundControl`; T11 adds `useCockpitAudio`. Serial chain.                                                                                                                                                                                                                                  |
| `apps/web/src/audio/connect-cockpit-audio.ts`                                    | T11 creates it; T12 extends it.                                                                                                                                                                                                                                                                                                      |
| `apps/web/e2e/fixtures.ts`                                                       | T8 only.                                                                                                                                                                                                                                                                                                                             |
| `apps/web/src/App.tsx`                                                           | T8 only.                                                                                                                                                                                                                                                                                                                             |
| `apps/web/src/shell/Header.tsx`, `header.messages.ts`, `header.css`              | T10 only.                                                                                                                                                                                                                                                                                                                            |
| `apps/web/src/shell/TrainerLayout.tsx`                                           | T11 only.                                                                                                                                                                                                                                                                                                                            |
| `packages/core/src/session/session.ts`                                           | T1 only.                                                                                                                                                                                                                                                                                                                             |
| `packages/core/src/contract/types.ts`                                            | T2; T25a only if a confirmed detent needs a new `ClickId`.                                                                                                                                                                                                                                                                           |
| `packages/aircraft-ctsl/src/controls.ts`                                         | T3; T25a.                                                                                                                                                                                                                                                                                                                            |
| `packages/aircraft-ctsl/src/sounds.ts`                                           | T17 creates it; T23, then T25b, T25c, T25d, serially.                                                                                                                                                                                                                                                                                |
| `packages/aircraft-ctsl/src/systems.ts`, `index.ts`                              | `systems.ts`: T17 only (exports). `index.ts`: T19 only (the `sounds` line).                                                                                                                                                                                                                                                          |
| `packages/device-flarm/src/logic/sounds.ts`, `README.md`                         | T18; T24.                                                                                                                                                                                                                                                                                                                            |
| `CLAUDE.md` app-settings line (`sound`, `volume`, seeded off)                    | The orchestrator, in the main session, after T8 lands. Not an issue.                                                                                                                                                                                                                                                                 |
| `apps/web/src/devices/messages.ts`, `device-registry.ts`, `aircraft-registry.ts` | No task touches them.                                                                                                                                                                                                                                                                                                                |

**Voice options contract (T16 and T17 run in parallel on it):** `airflow` takes `{ referenceKmh }`, the airspeed red line from intake §4.3; `electric-motor` takes no required option (its timbre is a voice default). `piston-engine` options are whatever T14 defines; T17 starts after T14.

**Intake §9 numbers for T21:** 71 relight threshold (spec §13 question 3), 72 starter and start (q4), 73 aural warnings (q5), 74 ELT (q6), 75 FLARM tones (q7), 76 flap actuator (q8), 77 rescue-system deployment (q9), 78 other units with a sounder (q10), 79 detents (q11). Spec §13 questions 1 and 2 answer the existing §9 questions 1 and 11.

## Waves and agents

| Phase | Tasks                                    | Starts when                               | Agents                                                                                                                                    |
| ----- | ---------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | T0                                       | now                                       | this branch; 1 reviewer, 1 merge train                                                                                                    |
| 1     | T1, T2, T5; then T3, T4                  | T0 landed                                 | 5 implementers (`sonnet`, high; T5 `opus`, the browser-lifecycle risk), 5 reviewers, 1 merge train; no ui-verifier (nothing renders)      |
| 2     | T6, T7, T9; T8; T10; T11; then T12, T13  | Phase 1 checkpoint                        | implementers (`sonnet`, high; T11 and T12 `opus`), reviewers, 1 ui-verifier for T10, a doc-writer plus a committer for T13, 1 merge train |
| 3     | T14, T18; T15, T17; T16; T19; T20        | Phase 2 checkpoint                        | implementers (`sonnet`, high; T15 `opus`), reviewers, 1 merge train; the orchestrator runs the review-toolkit passes reviewers ask for    |
| 4     | T21 (owner); T22, T24, T25a; T23; T25b–d | the owner's intake session                | the owner's `CPT_ALLOW_REFERENCE=1` session for T21; then as Phase 3                                                                      |
| End   | release PR                               | Phase 3 checkpoint (see Open questions 1) | `milestone-release`                                                                                                                       |

## Dependency graph

```
Phase 0  T0 ─────────────────────────────────────────────────────────────┐
Phase 1  T1 (session)     T2 (contract) ──┬── T3 (click data)            T5 (engine)
                                          └── T4 (cue diff, docs)
Phase 2  T7 (keys) ── T8 (provider, seed) ── T10 (header) ──┐
         T6 (clicks: T2, T5) ───────────────────────────────┼── T11 (driver: clicks; T1, T3)
         T9 (beep: T2, T5) ──────────────────┐              │
                                             └── T12 (driver: voices, cues; T4, T11)
                                                 T13 (docs; T11)
Phase 3  T14 (engine model) ──┬── T15 (engine graph) ── T16 (airflow, motor) ──┐
                              └── T17 (CTSL sounds) ───────────────────────────┼── T19 (wire, check, perf) ──┐
         T18 (FLARM beeps; T12) ───────────────────────────────────────────────┴────────────────────────────┴── T20 (real aircraft)
         Checkpoint: owner listening check (criterion 13)
Phase 4  owner session ── T21 (intake) ──┬── T22 (engine facts) ── T23 (CTSL facts) ── T25b ── T25c ── T25d
                                         ├── T24 (FLARM facts)
                                         └── T25a (detent clicks)
```

## Tasks

### Phase 0

#### T0 Land the sounds spec, ADR-0003 and this plan

**Description:** the PR from `docs/sounds-spec`: the approved spec with the owner's three answers (D8, D9, D16), ADR-0003, the ADR-0001 and parent-spec edits that lift the audio non-goal, and this plan with the filed issue numbers in place of the placeholders.

**Acceptance criteria:**

- [ ] The spec status reads Approved 2026-10-15; D8, D9 and D16 record the owner's answers; §14 holds three open questions.
- [ ] Every filed task's placeholder in this plan names its issue (T25a to T25d stay placeholders until T21); the milestone exists.
- [ ] No closing keyword in prose besides the PR's own `Closes` line.

**Verification:** Checks chain (`pnpm format:check` covers the ADRs; `docs/superpowers` is prettier-ignored, so the spec and plan are checked with `pnpm exec prettier --check --ignore-path /dev/null <file>`).

**Dependencies:** none.

**Files:** `docs/superpowers/specs/2026-10-15-cockpit-sounds-design.md`, `docs/adr/0003-synthesised-cockpit-audio.md`, `docs/adr/0001-architecture-and-aircraft-contract.md`, `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, `docs/superpowers/plans/2026-10-15-cockpit-sounds.md`. `No changelog: spec, ADR and plan; the behaviour lands with T10, T11, T18 and T19, each with its fragment.`

**Size:** M.

### Phase 1: core contract and the audio engine (nothing audible)

#### T1 Session control-change feed and reset epoch

**Description:** `Session.onControlChange` and `Session.epoch()` (spec §6.2). The session's own store subscriber queues each `ControlChange`; `notify()` delivers the queue at batch depth 0 after the state listeners, with the collect-then-rethrow loop. `epoch()` rises inside the batch on every `runtime.reset` (`loadSnapshot`, `retryItem`, `restartLeg`).

**Acceptance criteria:**

- [ ] A pilot press emits `pilot`, its release `spring`, a load only `system`; the listener runs after the state listeners with settled state, also after a batched load.
- [ ] A throwing listener leaves a `jumpToPhase` load complete and the other listeners served.
- [ ] `epoch()` rises on each reset path and not on `takeChecklist` or a carried phase change; the batched `subscribe` notification already shows the new epoch.

**Verification:** Checks chain; `pnpm test` while iterating.

**Dependencies:** T0. **Group 1A**, parallel-safe with T2 and T5.

**Files:** `packages/core/src/session/session.ts`, `packages/core/src/session/session.test.ts`. `No changelog: core session API with no user-visible effect.`

**Size:** M.

#### T2 Sound contract types and validator rows

**Description:** the optional contract additions of spec §6.1: `ClickId`, `Tone`, `SoundCue`, `DeviceSounds`, `SoundDefinition`, `DeviceCue`; `click?` on `ControlBase`; `sounds?` on `AircraftDefinition` and `DeviceDefinition`; `defineDevice` infers the beep ids. Validator rows `invalid-tone` and `beep-without-tones` over every device in the validation context. The contract version does not change.

**Acceptance criteria:**

- [ ] The types match spec §6.1; existing aircraft and devices compile unchanged.
- [ ] A type-level test shows a cue naming an undeclared beep fails to compile.
- [ ] `invalid-tone` (non-finite or non-positive `hz` or `ms`, negative or non-finite `pauseMs`) and `beep-without-tones` fire on test-local devices.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T0. **Group 1A**, parallel-safe with T1 and T5.

**Files:** `packages/core/src/contract/types.ts`, `packages/core/src/devices/define-device.ts`, `packages/core/src/validator/validate-aircraft.ts`, `packages/core/src/validator/validate-devices.test.ts`, `packages/core/src/contract/device-contract.test.ts`. `No changelog: optional contract fields; nothing declares sounds yet.`

**Size:** M.

#### T3 Wave-1 click overrides as data

**Description:** the spec §6.4 override table as data: CTSL `throttle`, `trim` and `brake` declare `click: 'silent'`; `fuelValve`, `parkingBrakeValve`, `choke` and `carbHeat` declare `'soft'`; the aera 500 `touch` declares `'silent'`. `docs/adding-an-aircraft.md` gains the optional `click` and the aircraft `sounds` (voice ids from panel-kit).

**Acceptance criteria:**

- [ ] Each override in the spec §6.4 table is declared and asserted by a test in its package.
- [ ] Both aircraft and every device still pass the validator.
- [ ] `docs/adding-an-aircraft.md` states when a control names its click and how an aircraft declares `sounds`.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T2. **Group 1B**, parallel-safe with T4 (and T1, T5).

**Files:** `packages/aircraft-ctsl/src/controls.ts`, `packages/aircraft-ctsl/src/index.test.ts`, `packages/device-aera500/src/logic/aera500.ts`, `packages/device-aera500/src/logic/aera500.test.ts`, `docs/adding-an-aircraft.md`. `No changelog: data with no reader until T11.`

**Size:** M.

#### T4 Device cue diff and contract docs

**Description:** `deviceCues(aircraft, registry, previous, next)` in core (spec §6.1, §6.6): walks the installs, calls each device's `cues`, tags each cue with install and device id. Documents the step-1 contract in the parent spec and `docs/adding-a-device.md`.

**Acceptance criteria:**

- [ ] `deviceCues` tags install and device id and returns nothing for devices without `sounds` (test-local aircraft and device).
- [ ] Parent spec §4.1 (`click`), a new §4.10 Sounds (aircraft and device `sounds`) and §8 (`invalid-tone`, `beep-without-tones`) describe T2's contract.
- [ ] `docs/adding-a-device.md` explains a device's `beeps` and pure `cues`.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T2. **Group 1B**, parallel-safe with T3.

**Files:** `packages/core/src/devices/device-cues.ts` (new), `packages/core/src/devices/device-cues.test.ts` (new), `packages/core/src/devices/index.ts`, `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, `docs/adding-a-device.md`. `No changelog: core diff and docs; no device declares beeps yet.`

**Size:** M.

#### T5 Audio engine lifecycle and fake context

**Description:** `createAudioEngine(target, create?)` in panel-kit (spec §6.7): lazy context from capture-phase gesture listeners, create-or-resume ending in `resume()`, `live()`, master gain taper, `setEnabled` keeping only the latest request, suspend on tab hidden, re-armed listeners on `statechange`. The hand-written `FakeAudioContext` (spec §10, Graph) ships here. Moved forward from step 2: it depends on nothing and carries the highest browser risk.

**Acceptance criteria:**

- [ ] With sound off from the start the factory is never called; with sound on, the first `pointerdown`, `pointerup`, `click`, `touchend` or `keydown` creates or resumes the context and `live()` holds while it starts; off then on quickly leaves it running.
- [ ] Master gain equals (volume / 100)²; off ramps to 0, then suspends only if still off; tab hidden suspends, visible resumes when on.
- [ ] Without `AudioContext` (jsdom) the engine stays silent and throws nothing; `addModule` and `createMediaElementSource` are never called.

**Verification:** Checks chain; `pnpm test:coverage` holds the threshold with no new excludes.

**Dependencies:** T0. **Group 1A**, parallel-safe with T1 and T2.

**Files:** `packages/panel-kit/src/audio/audio-engine.ts`, `packages/panel-kit/src/audio/audio-engine.test.ts`, `packages/panel-kit/src/audio/fake-audio-context.ts`, `packages/panel-kit/src/audio/index.ts`, `packages/panel-kit/src/index.ts`. `No changelog: the engine is not mounted until T8.`

**Size:** M.

#### Checkpoint: Phase 1

- [ ] T1 to T5 landed; Checks chain green on `develop`.
- [ ] `pnpm test:e2e` unchanged and green; the app plays nothing.
- [ ] The orchestrator compares T2's types and T5's API against spec §6.1 and §6.7 before Phase 2 builds on them.

### Phase 2: first audible slice (spec step 2)

#### T6 Control clicks: `clickFor` and click synthesis

**Description:** `clickFor(definition, change)` (spec §6.4): the control's `click`, else the kind table, with `satisfies Record<ControlKind, …>`. Click synthesis for every `ClickId`, one-shot nodes that stop and disconnect themselves, with a rate cap and a voice cap.

**Acceptance criteria:**

- [ ] A table test over kind × change × source: a declared `click` wins; one `detent` per rotary position stepped (rate-capped); a spring-back knob gives one click per move either way; a continuous lever, `spring`, `system` and refused moves are silent.
- [ ] On the fake context each click starts at the given time and disconnects itself; live nodes return to baseline after many clicks; the caps hold.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T2, T5. **Group 2A**, parallel-safe with T7 and T9.

**Files:** `packages/panel-kit/src/audio/click-for.ts`, `packages/panel-kit/src/audio/click-for.test.ts`, `packages/panel-kit/src/audio/clicks.ts`, `packages/panel-kit/src/audio/clicks.test.ts` (plus the `audio/index.ts` lines). `No changelog: not yet driven.`

**Size:** M.

#### T7 Sound settings keys and security docs

**Description:** `SettingKey` gains `'sound'` (`on` or `off`) and `'volume'` (an integer 0 to 100 stored as a string), validated like `recall`, defaulting to on and a constant below full scale (D9). The OpenSSF badge docs describe the new persisted keys and their validation in the same PR (CLAUDE.md rule).

**Acceptance criteria:**

- [ ] Settings round-trip; garbage values and throwing storage fall back to the defaults.
- [ ] `SECURITY.md`, `docs/security-assurance-case.md` C2 and the `input_validation` row of `docs/openssf-best-practices-badge.md` name the two keys and their validation.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T0. **Group 2A** (may start with 1A, decision 2), parallel-safe with T6 and T9.

**Files:** `apps/web/src/storage/index.ts`, `apps/web/src/storage/storage.test.ts`, `SECURITY.md`, `docs/security-assurance-case.md`, `docs/openssf-best-practices-badge.md`. `No changelog: setting keys with no reader yet.`

**Size:** M.

#### T8 AudioProvider and the E2E sound-off seed

**Description:** `AudioProvider` between `ThemeProvider` and `TrainerProvider` in `App.tsx` (spec §6.8) reads and writes the T7 settings, creates the engine in its own effect and returns `dispose` as the cleanup. The E2E auto fixture seeds `cpt.sound=off` through an init script when the key is absent, behind a fixture option a spec can turn off (spec §10, E2E).

**Acceptance criteria:**

- [ ] Rendered in StrictMode, the provider keeps the unlock listeners installed on a fresh engine; with sound off no context is constructed.
- [ ] The fixture seeds `cpt.sound=off` unless a spec opts out, and a fixture test proves both cases; every existing spec runs unchanged.

**Verification:** Checks chain; `pnpm test:e2e fixtures` while iterating, then the full `pnpm test:e2e`.

**Dependencies:** T5, T7. **Group 2B.**

**Files:** `apps/web/src/audio/AudioProvider.tsx`, `apps/web/src/audio/AudioProvider.test.tsx`, `apps/web/src/App.tsx`, `apps/web/e2e/fixtures.ts`, `apps/web/e2e/fixtures.spec.ts` (plus `apps/web/src/audio/index.ts`, new). `No changelog: the provider plays nothing; the seed is test-only.` After it lands, the orchestrator adds `sound` and `volume` (seeded off by the E2E fixture) to the `CLAUDE.md` app-settings line.

**Size:** M.

#### T9 Beep voice

**Description:** `beep-voice` in panel-kit (spec §6.6): plays a device's `Tone[]` sequence at a level through the master gain.

**Acceptance criteria:**

- [ ] On the fake context each tone starts at its offset with its `ms` and `pauseMs`, at the given level, and disconnects itself.
- [ ] A level of 0 schedules nothing.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T2, T5. **Group 2A**, parallel-safe with T6 and T7.

**Files:** `packages/panel-kit/src/audio/beep-voice.ts`, `packages/panel-kit/src/audio/beep-voice.test.ts` (plus the first `audio/index.ts` line). `No changelog: not yet driven.`

**Size:** S.

#### T10 Header sound control

**Description:** `SoundControl` (spec §6.8): one icon button beside `LanguageSwitch` with the `ThemeSwitch` footprint, in both header variants; speaker or speaker-off icon; a popover (the `AppFooter` `aria-haspopup` pattern, outside-click close as `ControlDetails`) with a `role="switch"` and a range slider at least `--size-target` tall, disabled while sound is off. Strings en "Sound", "Sound on", "Sound off", "Volume"; de "Ton", "Ton an", "Ton aus", "Lautstärke".

**Acceptance criteria:**

- [ ] Testing Library: the popover opens and closes on an outside click; the switch's `aria-checked` follows the setting; the slider is disabled while off; en and de labels.
- [ ] The `shell.spec.ts` header tests pass unchanged at every tested viewport in en and de.
- [ ] A ui-verifier passes: 1920x1080 and 3840x2160 first, then 1024x768, en and de, both themes; touch target and no overlap at every size; slider by touch at 1024; state survives a reload; panel unchanged.

**Verification:** Checks chain; `pnpm test:e2e shell`; ui-verifier pass (the orchestrator runs it).

**Dependencies:** T8. **Group 2C.**

**Files:** `apps/web/src/audio/SoundControl.tsx`, `apps/web/src/audio/SoundControl.test.tsx`, `apps/web/src/shell/Header.tsx`, `apps/web/src/shell/header.messages.ts`, `apps/web/src/shell/header.css`; `changelog.d/<n>.added.md` ("A sound button in the header turns cockpit sound on or off and sets its volume.").

**Size:** M.

#### T11 Cockpit audio driver: clicks (first audible slice)

**Description:** `connectCockpitAudio(session, aircraft, registry, engine, clock?)` and `useCockpitAudio()` (spec §6.3, §6.7), clicks only: `TrainerLayout` mounts the driver, which plays `clickFor`'s click for each pilot `ControlChange` at the event's `currentTime` while `live()` holds, and drops it otherwise. Contains every audio call in `try`/`catch`: on the first error it logs once and stays silent until the next connection. `sound-settings.spec.ts` lands here.

**Acceptance criteria:**

- [ ] Clicks play only on the trainer screen and only for `pilot` changes; the click of the gesture that creates the context is scheduled on the starting context; the picker and the error screen are silent.
- [ ] A fake node that throws leaves `session.advance` and a press working, logs once and silences audio.
- [ ] `sound-settings.spec.ts` (importing from `./fixtures`): sound off and the volume survive a reload; with sound on, a wrapped `AudioContext` reads `running` after the first panel press; BAT and the key to START give no CSP violation and no `pageerror`.

**Verification:** Checks chain; `pnpm test:e2e sound-settings`; `pnpm test:e2e csp`.

**Dependencies:** T1, T3, T6, T10 (and through T10, T8). **Group 2D.**

**Files:** `apps/web/src/audio/connect-cockpit-audio.ts`, `apps/web/src/audio/connect-cockpit-audio.test.ts`, `apps/web/src/audio/use-cockpit-audio.ts`, `apps/web/src/shell/TrainerLayout.tsx`, `apps/web/e2e/sound-settings.spec.ts`; `changelog.d/<n>.added.md` ("Controls click when the pilot operates them, in both aircraft.").

**Size:** M.

#### T12 Cockpit audio driver: voices, device cues, baselines

**Description:** the rest of `cockpit-audio-driver` (spec §6.3): the panel-kit `voiceFactories` registry (empty) with the `Voice`, `VoiceFrame` and `VoiceFactory` types (spec §6.7); voices built from the aircraft's `sounds`, fed on `Session.subscribe` with `nowMs` from the injected clock; device cues from `deviceCues` played through `beep-voice`; baselines (connect, epoch change, context creation, sound on, tab shown) and carried phase changes; failed runtime fades every voice. Tests use test-local voices and a test-local device with beeps.

**Acceptance criteria:**

- [ ] A baseline jumps every input and skips the cue diff; a carried phase change through `track()` and through `startLeg` jumps only the `carried` inputs, keeps the cue diff and lets a fading voice play out.
- [ ] Cues schedule at `currentTime` while `live()` holds and are dropped otherwise; while not live the voices keep stepping with no automation and the next live frame jumps.
- [ ] A throwing voice or cue logs once, stops every voice and leaves `session.advance` and a press working.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T4, T9, T11 (T1 through T11). **Group 2E**, parallel-safe with T13.

**Files:** `packages/panel-kit/src/audio/voice-factories.ts` (new), `apps/web/src/audio/connect-cockpit-audio.ts`, `apps/web/src/audio/connect-cockpit-audio.test.ts` (plus the `audio/index.ts` line). `No changelog: no aircraft or device declares sounds yet.`

**Size:** M.

#### T13 Step-2 documentation

**Description:** the docs spec §15 owes for step 2, other than the security docs T7 carries: parent spec §5 Screen (the header item) and Persistence (`cpt.sound`, `cpt.volume`), §9 Testing (an audio row); `docs/architecture.md` (Persistence; panel-kit audio; the `apps/web` audio folder); `CONTRIBUTING.md` Package boundaries (panel-kit holds controls, gauges and voices).

**Acceptance criteria:**

- [ ] Each section named above describes the landed code on `develop`, checked by the committer against the files.
- [ ] No other section changes.

**Verification:** Checks chain (`pnpm format:check` covers `docs/architecture.md` and `CONTRIBUTING.md`).

**Dependencies:** T11. **Group 2E**, parallel-safe with T12 and with every Phase 3 task. A doc-writer drafts; a committer agent opens the PR.

**Files:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, `docs/architecture.md`, `CONTRIBUTING.md`. `No changelog: docs only.`

**Size:** M.

#### Checkpoint: Phase 2

- [ ] T6 to T13 landed; Checks chain green on `develop`; the T10 ui-verifier pass is recorded on its PR.
- [ ] In `pnpm dev`, with sound on, the first press on BAT clicks once the context runs; sound off silences; both settings survive a reload.
- [ ] Owner listening (non-blocking, on UAT): clicks on a rocker, a breaker, a device key, and none on the CTSL brake and throttle.
- [ ] The `CLAUDE.md` app-settings line is updated (orchestrator).

### Phase 3: aircraft voices and FLARM beeps (spec step 3; 3a and 3b in parallel)

#### T14 Piston-engine model (pure)

**Description:** the pure `step(previous, input, dtMs)` of spec §6.5 with the CTSL systems' `approach`: smoothed rpm and gains, separate time constants for throttle up, throttle down, the catch, run-down and wind; the edges starter rises, catch, failed start, ignition cut, windmilling and jump. Defines the `piston-engine` option profile and its `problems(options)`.

**Acceptance criteria:**

- [ ] Sequence tests with an injected clock cover each edge of spec §6.5 (1 to 6), with no audio.
- [ ] A magneto drop changes the frequency target by the rpm ratio; f_c = rpm / 120 and f_f = rpm / 60 × cylinders / 2.
- [ ] `problems(options)` rejects a missing or out-of-range option.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T12. **Group 3A**, parallel-safe with T18.

**Files:** `packages/panel-kit/src/audio/voices/piston-engine-model.ts`, `packages/panel-kit/src/audio/voices/piston-engine-model.test.ts`. `No changelog: not yet registered.`

**Size:** S.

#### T15 Piston-engine voice graph

**Description:** the native oscillator bank of spec §6.5: the `ConstantSourceNode` rpm bus, the firing oscillator with its `PeriodicWave`, the exhaust noise band-pass modulated at the firing frequency, the starter whine and compression pulses. Creates the shared noise buffer; registers `'piston-engine'`. The highest sound-quality risk, so it opens Phase 3's critical path.

**Acceptance criteria:**

- [ ] On the fake context every node reaches the master gain; the bus equals rpm / 120; one `setTargetAtTime` per changed target with `SMOOTHING_S`, none while steady, none while not live, then one jump.
- [ ] `stop()` fades and disconnects every node; live nodes stay bounded over a start, a run and a shutdown.

**Verification:** Checks chain; `pnpm test`. Listening: the orchestrator may ask the owner for an early listen on UAT once T19 lands; the binding check is the Phase 3 checkpoint.

**Dependencies:** T14. **Group 3B**, parallel-safe with T17 and T18.

**Files:** `packages/panel-kit/src/audio/voices/piston-engine.ts`, `packages/panel-kit/src/audio/voices/piston-engine.test.ts`, `packages/panel-kit/src/audio/voices/noise.ts` (plus the registry row). `No changelog: no aircraft declares it yet.`

**Size:** M.

#### T16 Airflow and electric-motor voices

**Description:** `airflow` (the shared noise through a low-pass; gain (v / v_ref)², cutoff rising with v) and `electric-motor` (a small whine that fades in and out with `driving`), with the option names pre-assigned under Shared files.

**Acceptance criteria:**

- [ ] On the fake context: airflow gain and cutoff follow `airspeedKmh`, a step becomes a short swell, a jump takes the target at once; the motor fades with `driving`.
- [ ] Each `problems(options)` rejects a missing or out-of-range option; both ids registered.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T15. **Group 3C**, parallel-safe with T17 and T18.

**Files:** `packages/panel-kit/src/audio/voices/airflow.ts`, `packages/panel-kit/src/audio/voices/airflow.test.ts`, `packages/panel-kit/src/audio/voices/electric-motor.ts`, `packages/panel-kit/src/audio/voices/electric-motor.test.ts` (plus two registry rows). `No changelog: no aircraft declares them yet.`

**Size:** M.

#### T17 CTSL sound declarations

**Description:** `packages/aircraft-ctsl/src/sounds.ts` per spec §6.5: `engine` (`piston-engine`; `rpm`, `running`, `starter`; carried `rpm`), `airflow` (`airspeedKmh`, carried), `flaps` (`electric-motor`; `driving`). `starter` follows the key at START with BAT in; `driving` is `flapMotorRunning(state)`; `systems.ts` exports `IDLE_RPM`, `MAX_CONTINUOUS_RPM`, `power` and `flapMotorRunning`. Not yet wired into the aircraft definition (T19). Records the D16 values beside intake §9 question 1.

**Acceptance criteria:**

- [ ] Selector tests over a real start: crank, catch, idle, full, magneto check, shutdown, failed start (no choke when cold; key released before the catch), key held past the lockout (starter on, no catch), windmill relight, flap motor off during the overload cut-out.
- [ ] The rpm constants and `power` are imported from `systems.ts`, not copied; options use T14's profile and the pre-assigned airflow and motor options.
- [ ] Intake §9 question 1 carries a "Trainer (sounds)" note: four cylinders, four-stroke and the cranking rpm, general knowledge accepted by the owner 2026-10-15 (spec D16); the §9 owner-ruling paragraph gains one clause naming this exception to the assumed (unverified) marking.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T2, T14. **Group 3B**, parallel-safe with T15, T16 and T18 (intake: §9 question 1 only).

**Files:** `packages/aircraft-ctsl/src/sounds.ts` (new), `packages/aircraft-ctsl/src/sounds.test.ts` (new), `packages/aircraft-ctsl/src/systems.ts`, `packages/aircraft-ctsl/src/systems.test.ts`, `docs/aircraft/ctsl-intake.md`. `No changelog: declared, not wired until T19.`

**Size:** M.

#### T18 FLARM beeps

**Description:** the FLARM `sounds` (spec §6.6): a beep table and a pure `cues` diff, wired into `logic/flarm.ts`; the README (Controls: the volume tone; Power cycle: the start-up beep; Not modelled: the sound line rewritten, not dropped) and `notModelled` kept equal; the intake §3.8.4 trainer paragraph no longer says the volume is never heard. Pitch, length and level ratios are marked assumed (unverified).

**Acceptance criteria:**

- [ ] Fed by the real `step`: each power-on path (Avionics Master on with BAT in; BAT in with the Avionics Master on) gives one start-up cue at loud, also from another volume; set quiet and cycle the supply gives exactly one cue; low supply gives none.
- [ ] Brief pushes give one tone per volume step at the new level and none at silent; the FLARM `volume` scales cues and `silent` mutes them.
- [ ] `tools/device-readme.test.ts` passes; the validator passes the beep table.

**Verification:** Checks chain; `pnpm test`; `pnpm test:e2e flarm` unchanged.

**Dependencies:** T2, T12. **Group 3A**, parallel-safe with every 3a task (intake: §3.8.4 only).

**Files:** `packages/device-flarm/src/logic/sounds.ts` (new), `packages/device-flarm/src/logic/sounds.test.ts` (new), `packages/device-flarm/src/logic/flarm.ts`, `packages/device-flarm/README.md`, `docs/aircraft/ctsl-intake.md`; `changelog.d/<n>.added.md` ("The CTSL's FLARM display beeps at start-up and when its volume is stepped.").

**Size:** M.

#### T19 CTSL sounds wired, aircraft sounds check and perf A/B

**Description:** the CTSL definition declares its `sounds` (one line in `index.ts`), so the engine, starter, airflow and flap motor are heard. `apps/web/src/aircraft-sounds.test.ts` checks every registered aircraft. The A/B perf run of spec §10 (ADR-0002 rank 3).

**Acceptance criteria:**

- [ ] `aircraft-sounds.test.ts`: every declared voice id exists in `voiceFactories`, `problems(options)` is empty, and every selector runs on every entry state; the demo declares no sounds.
- [ ] An alternating A/B `pnpm test:perf` on the same build, sound on against sound off; the PR names any cost (no pinned number).

**Verification:** Checks chain; `pnpm test:perf` (local only, idle machine or A/B under load per CONTRIBUTING.md); owner listening check at the Phase 3 checkpoint.

**Dependencies:** T15, T16, T17. **Group 3D.**

**Files:** `packages/aircraft-ctsl/src/index.ts`, `apps/web/src/aircraft-sounds.test.ts` (new); `changelog.d/<n>.added.md` ("The CTSL's engine, starter, airflow and flap motor are heard: the start and catch, the magneto drop, the cruise drone and the shutdown.").

**Size:** S.

#### T20 Cockpit audio over the real aircraft

**Description:** driver tests with the registered CTSL and demo, a fake context and a fake clock, for the success criteria that need real aircraft content (spec §12).

**Acceptance criteria:**

- [ ] Criterion 1: for every ordered pair of `phaseOrder` ids, for `retryItem` and `restartLeg`, in the CTSL and the demo, no one-shot cue fires and every continuous voice jumps.
- [ ] Criterion 2: exactly one FLARM beep per power-on path, none on page or phase load or with low supply, one tone per brief push, none at silent.
- [ ] Criterion 8: live voices stay bounded and return to baseline over a full CTSL flight.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T18, T19. **Group 3E.**

**Files:** `apps/web/src/audio/cockpit-audio.aircraft.test.ts` (new). `No changelog: tests only.`

**Size:** S.

#### Checkpoint: Phase 3 (spec step 4)

- [ ] T14 to T20 landed; Checks chain green on `develop`; every spec §12 criterion traced to a test, a ui-verifier pass or the listening check.
- [ ] **Owner listening check** (criterion 13), on UAT or `pnpm dev`: the start and catch, the magneto drop, the cruise drone with airflow, the flap motor and the FLARM power-up beep are each recognised. The result goes into the release summary.
- [ ] If the engine sounds too synthetic: spec §14 question 2 (an `AudioWorklet` voice is an ask-first change, spec §11).
- [ ] The release runs per Open questions 1.

### Phase 4: wave 2 (blocked on the owner's intake session)

Every Phase 4 task is **blocked** until the owner runs the intake session with `CPT_ALLOW_REFERENCE=1`. Wave-2 PRs read only the intake; `apps/web` does not change (spec §5).

#### T21 Sound-facts intake session (owner)

**Description:** the owner's session answers spec §13 in `docs/aircraft/ctsl-intake.md`, paraphrased, with source and certainty: §9 question 1 (engine variant, gearbox ratio, cylinders and cycle), question 11 (propeller and blade count), and new questions 71 to 79 (pre-assigned under Shared files), plus §4.2 and §3.8.4 where facts land there.

**Acceptance criteria:**

- [ ] Each spec §13 question has an answer or stays open with the trainer value.
- [ ] Each confirmed extra cue (ELT, rescue deployment, detent clicks, flap end stop) is named, so the orchestrator files only those of T25a to T25d.

**Verification:** Checks chain (`pnpm format:check` covers the intake).

**Dependencies:** T17, T18, the owner's session. **Blocked.**

**Files:** `docs/aircraft/ctsl-intake.md`. `No changelog: intake facts; the sound changes land with T23 to T25d.`

**Size:** S.

#### T22 Engine voice: blade-pass tone and fact options

**Description:** `piston-engine` gains the blade-pass tone f_b = rpm / ratio / 60 × blades and options for the engine variant, gearbox ratio, blade count and starter character (spec §6.5, `ctsl-sound-facts`). The blade-pass tone is built only if T21 gives the ratio and the blade count; otherwise the task carries the other options alone.

**Acceptance criteria:**

- [ ] Model and graph tests cover the blade-pass frequency and the new options; `problems(options)` rejects bad values.
- [ ] Without the new options the voice behaves as in wave 1.

**Verification:** Checks chain; `pnpm test`.

**Dependencies:** T21, T19. **Group 4B**, parallel-safe with T24 and T25a. **Blocked.**

**Files:** `packages/panel-kit/src/audio/voices/piston-engine-model.ts`, `packages/panel-kit/src/audio/voices/piston-engine-model.test.ts`, `packages/panel-kit/src/audio/voices/piston-engine.ts`, `packages/panel-kit/src/audio/voices/piston-engine.test.ts`. `No changelog: no aircraft sets the options until T23.`

**Size:** M.

#### T23 CTSL engine sound facts

**Description:** the CTSL `sounds` carry T21's engine and propeller facts as `piston-engine` options, replacing the wave-1 voice defaults where the intake now has a value.

**Acceptance criteria:**

- [ ] `sounds.ts` options trace to intake §9 questions 1, 11 and 72; selector tests and `aircraft-sounds.test.ts` pass.
- [ ] Owner listening check: start, catch, cruise with the blade-pass tone.

**Verification:** Checks chain; `pnpm test`; owner listening check on UAT.

**Dependencies:** T22. **Group 4C.** **Blocked.**

**Files:** `packages/aircraft-ctsl/src/sounds.ts`, `packages/aircraft-ctsl/src/sounds.test.ts`; `changelog.d/<n>.changed.md`.

**Size:** S.

#### T24 FLARM beep facts

**Description:** the FLARM beep table takes the intake's pitch, length, pattern and loud, medium and quiet ratios; the step into silent and the mode swap follow the answers (spec §13 question 7, intake §9 question 75).

**Acceptance criteria:**

- [ ] The beep table and `cues` match the intake; tests updated; assumed markings removed where the intake confirms.
- [ ] README Source revision names the facts; `tools/device-readme.test.ts` passes.

**Verification:** Checks chain; `pnpm test`; owner listening check on UAT.

**Dependencies:** T21, T18. **Group 4B**, parallel-safe with T22 and T25a. **Blocked.**

**Files:** `packages/device-flarm/src/logic/sounds.ts`, `packages/device-flarm/src/logic/sounds.test.ts`, `packages/device-flarm/README.md`; `changelog.d/<n>.changed.md`.

**Size:** S.

#### T25a Detent clicks (conditional)

**Description:** `click` overrides for the controls T21 confirms (intake §9 question 79). A sound the click set lacks adds a `ClickId` and its panel-kit synthesis.

**Acceptance criteria:**

- [ ] Each confirmed control declares its click, asserted by a test; unconfirmed controls keep the wave-1 table.
- [ ] A new `ClickId`, if any, has synthesis and a `clickFor` table row.

**Verification:** Checks chain; `pnpm test`; owner listening check.

**Dependencies:** T21, T3. **Group 4B**, parallel-safe with T22 to T24 (`controls.ts`, not `sounds.ts`). **Blocked, conditional.**

**Files:** `packages/aircraft-ctsl/src/controls.ts`, `packages/aircraft-ctsl/src/index.test.ts`; only for a new click: `packages/core/src/contract/types.ts`, `packages/panel-kit/src/audio/clicks.ts`, `packages/panel-kit/src/audio/clicks.test.ts`; `changelog.d/<n>.changed.md`.

**Size:** M.

#### T25b, T25c, T25d ELT buzzer, rescue-system deployment, flap end stop (conditional)

**Description:** one issue per item T21 confirms (intake §9 questions 74, 77 and 76): a panel-kit voice that reacts to its input or edge, and its CTSL declaration. They all edit `sounds.ts`, so they land serially in the order b, c, d after T23.

**Acceptance criteria (each):**

- [ ] The voice is tested on the fake context; `problems(options)` rejects bad values; the CTSL selector follows the intake's trigger.
- [ ] `aircraft-sounds.test.ts` passes; owner listening check recognises the sound.

**Verification:** Checks chain; `pnpm test`; owner listening check.

**Dependencies:** T25b on T23; T25c on T25b (or T23 if T25b is not filed); T25d on T25c (or the last filed). **Group 4D**, serial. **Blocked, conditional.**

**Files (each):** `packages/panel-kit/src/audio/voices/<voice>.ts`, `packages/panel-kit/src/audio/voices/<voice>.test.ts`, `packages/aircraft-ctsl/src/sounds.ts`, `packages/aircraft-ctsl/src/sounds.test.ts` (plus the registry row); `changelog.d/<n>.added.md`.

**Size:** M.

#### Checkpoint: Phase 4

- [ ] Every filed wave-2 task landed; Checks chain green.
- [ ] Owner listening re-check of the refined engine, the FLARM tones and each extra cue.

## Not in this milestone

- **Relight threshold in engine rpm** (spec §13 question 3, intake §9 question 71): a systems-model fix outside the sounds spec; filed as its own issue once T21 gives the gearbox ratio.
- **Stall horn:** needs a stall state and a spec change (spec §14 question 3).
- **Radio, intercom, GPS audio, FLARM traffic tones:** out of scope (spec §1).

## Decisions (agent, overrulable)

1. **Spec steps are phases, not single PRs.** Spec §5 says "one issue, one PR per step"; steps 1 and 2 each span more than five files, so each phase holds several issues of at most five files. The capability ids and the step order stay as the spec has them.
2. **`audio-engine` moves into Phase 1.** It depends on nothing and carries the highest browser risk (unlock, iOS states, suspend and resume), so it starts first. Nothing mounts it before T8. T7 has no code dependency either: the orchestrator may start it with group 1A, which shortens the path to the first sound by one landing.
3. **The driver splits in two.** T11 (clicks, containment, the E2E settings spec) is the first audible vertical slice; T12 adds voices, cues, baselines and carried changes, tested with test-local voices.
4. **Settings keys ship with the security docs (T7).** CLAUDE.md requires the OpenSSF badge docs to change in the PR that changes the behaviour they describe; the rest of the step-2 docs go to T13.
5. **The mute lands before the first sound.** T10 precedes T11, because UAT deploys `develop` and sound defaults on.
6. **CTSL sounds are declared in T17 and wired in T19.** Develop never names a voice id the registry lacks, and T19's fragment is true when it lands.
7. **The piston engine splits into model (T14) and graph (T15).** The model fixes the option profile T17 needs, so the CTSL declarations run beside the graph.
8. **Criteria over real aircraft get their own task (T20),** which joins 3a and 3b.
9. **Plan file name.** Kept as `2026-10-15-cockpit-sounds.md` (as the bootstrap and 3D plans, without an `m<n>-` prefix) until the milestone number is fixed; the title names "M21" as the next number after M20.

## Risks and mitigations

| Risk                                                                               | Impact | Mitigation                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The oscillator-bank engine sounds too synthetic to recognise (criterion 13 fails)  | High   | T14 and T15 open Phase 3; the owner may listen on UAT once T19 lands; a worklet voice behind the same `Voice` interface is an ask-first fallback. |
| Browser audio unlock differs (touch, iOS `interrupted`, refused resume)            | High   | T5 first, with a fake context whose state settles asynchronously; re-armed listeners; E2E reads the context state; owner tablet check (#125).     |
| Audio errors break `session.advance` or a press                                    | High   | Containment in T11 and T12, tested with throwing fake nodes; criterion 15.                                                                        |
| An E2E spec meets sound on (flaky or audible CI)                                   | Medium | T8 seeds `cpt.sound=off` before any sound exists; only `sound-settings.spec.ts` opts out; no autoplay flags.                                      |
| A new 44 px header item breaks the one-row header in German or at 1024             | Medium | One button with a popover (D8); `shell.spec.ts` unchanged; ui-verifier at 1920, 4K and 1024 in en and de.                                         |
| Coverage drops below the threshold (browser-only paths)                            | Medium | Injected context factory and clock; only the default factory line is untested; no new excludes.                                                   |
| StrictMode builds two engines or keeps a disposed one                              | Medium | The provider creates the engine in its own effect and disposes on cleanup; T8 tests StrictMode.                                                   |
| Parallel PRs collide on barrels, the voice registry, the intake or the parent spec | Medium | Shared files table: positions pre-assigned, serial chains where a file has several owners; the merge train lands one at a time.                   |
| Main-thread cost of audio on the panel                                             | Medium | Native nodes, automation only on changed targets; T19 A/B perf run names the cost.                                                                |
| Wave 2 waits on the owner and holds the release                                    | Medium | Open questions 1: wave 2 in a follow-up milestone by default.                                                                                     |
| CSP violation from audio (`blob:`, `data:`, worklet module)                        | Low    | Native nodes only; `csp.ts` has no diff; the E2E CSP fixture runs with sound on in `sound-settings.spec.ts`.                                      |

## Open questions

1. **Wave 2 milestone** (orchestrator, owner). Wave-2 issues in this milestone would hold the release until the owner's intake session. Default: file T21 to T25d in a follow-up milestone and release wave 1 after the Phase 3 checkpoint.
2. **Click overrides** (owner; spec §14 question 1). The wave-1 silent and `soft` list stands until T21 answers intake §9 question 79.
3. **Engine voice quality** (owner; spec §14 question 2). Decided at the Phase 3 listening check.
4. **Stall horn** (owner; spec §14 question 3). Only if T21 finds one; it needs a spec change.
5. **Milestone title and number** (orchestrator). "M21 Cockpit sounds" is assumed; the plan file keeps its name either way.

## Review focus

1. Each PR stays inside its Files list and its Shared files positions.
2. No audio file, recording, `blob:` or `data:` audio, media element or worklet; `csp.ts` untouched.
3. Nothing audible lands before T8's seed and T10's control.
4. Tests use the fake context and the injected clock; coverage holds with no new excludes.
5. Every aircraft fact traces to the intake; the D16 engine values are recorded as general knowledge, every other assumption as assumed (unverified).
