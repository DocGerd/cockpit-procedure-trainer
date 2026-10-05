# M2 Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@cpt/core` holds the aircraft contract and every engine the web app needs: `defineAircraft` with compile-time reference checks, the control store, the systems runtime, reusable electrical and engine-start blocks, failure injection, the checklist engine, phase handling, the device contract and the aircraft validator. Every registered aircraft is validated in CI. Released as v0.3.0.

**Architecture:** All engine code lives in `packages/core/src/`, one directory per issue, re-exported from `packages/core/src/index.ts`. Core stays plain data and pure functions: no DOM, no React, no assets, no timers. The app (M3) drives time by calling the runtime's step on a fixed interval. A session module (#17) composes the store, runtime, failures, checklist and devices into the one object the app will use. No new workspace package is created; the lint rules for future `packages/device-*` packages are added ahead of the first one.

**Tech Stack:** as M1. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, sections 3, 4 (all), 5, 8, 9 and 11 (M2 Core engine).

**Issues:** #11 contract and `defineAircraft`, #12 control store, #13 systems runtime, #14 system blocks, #15 failure injection, #16 checklist engine, #17 phase handling, #18 validator and CI, #44 device contract and runtime. Closed issues #91, #92 and #93 also sit in the milestone; see check (b).

## Pre-flight checks

**(a) Is `packages/core` scaffolded?** Yes. `packages/core` has `package.json` (`@cpt/core`, export `./src/index.ts`, no dependencies), `tsconfig.json`, and `src/index.ts` exporting `CONTRACT_VERSION = 1`, which `apps/web/src/App.tsx` and `packages/aircraft-demo` import. M2 creates no new package. It does add one new package _kind_ to the lint config: `packages/device-*` (#44). `eslint.config.js` builds per-package blocks from the directories that exist, so a device block built the same way would produce no rule while no device package exists and the boundary test would pass vacuously. #44 therefore uses static globs and extends `tools/boundary.test.ts` with virtual device paths.

**(b) Do closed #91–#93 pre-empt #11 or #12?** No. #91 (colour-scheme and favicon) changed `apps/web` only. #92 codified the `No changelog: <reason>` exemption, a process rule. #93 settled M1 UI questions (phase control in the header, no instant deviation banner in Practice, the selection outline). None touches core. #93's "phase is global session state" agrees with #17 owning phase in the session.

**(c) Where does `defineAircraft` land?** In `packages/core/src/contract/define-aircraft.ts`, re-exported from `@cpt/core`. An aircraft package calls it and exports the result; `apps/web/src/aircraft-registry.ts` is typed as `readonly Aircraft[]` and lists them. #18 makes that one-time change to the registry's element type and converts `packages/aircraft-demo` to a minimal valid aircraft. That is a contract change, not an aircraft addition; after it, adding an aircraft is again one new `packages/aircraft-<id>` plus one registry line.

**(d) Does #44 live in a separate package?** No. Spec §3 and §4.9 put the device _contract_ in core; a device _unit_ is a `packages/device-<id>`, and the first ones come with M4 (spec ticket 46). #44 edits `packages/core/src/contract/`, adds `packages/core/src/devices/`, extends the validator, the lint config, the boundary test, `CONTRIBUTING.md` and `apps/web/src/device-registry.ts`. It therefore cannot run alongside #11 or #18; it runs in wave 3 next to #15, whose files are disjoint.

## Global Constraints

- Base branch `develop`. One issue, one branch, one PR with `Closes #<n>`. Agents never merge into `main`.
- Every PR adds `changelog.d/<issue>.<category>.md` (all M2 issues: `added`).
- Every PR is reviewed by a separate agent with the `pr-selfreview` skill, then merged with the `merge-train` skill.
- Core boundary (`CONTRIBUTING.md`): no UI, no assets, no other workspace package, no timers, no `Date.now()` or randomness. Determinism is a requirement, not a style.
- Only #11 edits `packages/core/src/index.ts` and `packages/core/package.json`. Every other issue owns exactly its directory under `packages/core/src/`, including the stub `index.ts` #11 created there.
- Only #11 and, later, #44 edit `packages/core/src/contract/`. A later issue that finds it needs a contract change stops and reports it instead of editing.
- Tests first: every behaviour in an issue's "Done when" is a failing test before it is code. Compile-time rules are proven with `// @ts-expect-error` lines in test files; `pnpm typecheck` fails if such a line stops erroring.
- Every text an aircraft or device author writes is `Text = { de: string; en: string }`.
- Comments and docs: only what the code cannot say. No timings or measured figures unless they are requirements.
- `gh api` takes `--raw-field`/`--field`, spelled out. No `$` in gh endpoints. No Bash command contains the substring "merge" (also "emergency"); write such text with Write or Edit.
- Gate before every push: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.

## Vocabulary

- **step** (#13): one call of the aircraft's pure `step(state, input)`. The runtime calls it on every control change and on each **time step** `advance(dtMs)`.
- **check off** (#16): the pilot marking a check or confirm item done. The issue's "a tick on an unmet check" means a check-off. The word "tick" is not used in code for either.
- **source** of a control change: `pilot`, `spring` or `system` (see Decision 4).

## Execution Model

The main session orchestrates: it dispatches each task to a subagent in its own worktree off `origin/develop`, has a separate reviewer check it, and keeps only decisions and verdicts.

| Task                         | Worker       | Reviewer                                                         |
| ---------------------------- | ------------ | ---------------------------------------------------------------- |
| 1 Contract (#11)             | sonnet, high | opus, xhigh (every later issue builds on these types)            |
| 2 Control store (#12)        | sonnet, high | sonnet, high                                                     |
| 3 Systems runtime (#13)      | sonnet, high | sonnet, high                                                     |
| 4 System blocks (#14)        | sonnet, high | sonnet, high                                                     |
| 5 Checklist engine (#16)     | sonnet, high | sonnet, high                                                     |
| 6 Validator and CI (#18)     | sonnet, high | sonnet, high                                                     |
| 7 Failure injection (#15)    | sonnet, high | sonnet, high                                                     |
| 8 Device contract (#44)      | sonnet, high | opus, xhigh (contract edit plus lint rules, the boundary guards) |
| 9 Session and phases (#17)   | sonnet, high | opus, xhigh (integration of every engine)                        |
| 10 Release v0.3.0            | sonnet, high | opus, xhigh (whole-milestone review)                             |

## Dependency Graph

```
#11 → #12, #13, #14, #16, #18
#12 + #13 → #15
#18 → #44
#12 + #13 + #15 + #16 + #44 → #17
```

- #12, #13, #14, #16, #18 need #11 only.
- #15 needs #12 (system moves trip a breaker) and #13 (failure set reaches step).
- #44 needs #11 (contract) and #18 (it extends the validator); it uses #12 and #13 through their interfaces only.
- #17 needs #12, #13, #15, #16 and #44. #14 is not a dependency of any engine; it is a library aircraft use.

## Waves

Issues within a wave touch disjoint files and run in parallel. A wave starts when every PR of the previous wave is in `develop`. Each PR has its own changelog fragment, so fragments never collide.

| Wave | Issues                   | Agents | Files (beyond each issue's `changelog.d/<n>.added.md`)                                                                                                                                                                                                                  |
| ---- | ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | #11                      | 1      | `packages/core/src/index.ts`, `packages/core/src/index.test.ts`, `packages/core/src/contract/**`, stub `index.ts` in every directory below                                                                                                                              |
| 2    | #12, #13, #14, #16, #18  | 5      | #12 `core/src/controls/**` · #13 `core/src/runtime/**` · #14 `core/src/blocks/**` · #16 `core/src/checklist/**` · #18 `core/src/validator/**`, `packages/aircraft-demo/**`, `apps/web/src/aircraft-registry.ts`, `apps/web/src/aircraft-registry.test.ts`, `apps/web/src/aircraft-validation.test.ts` |
| 3    | #15, #44                 | 2      | #15 `core/src/failures/**` · #44 `core/src/devices/**`, `core/src/contract/**`, `core/src/validator/**`, `eslint.config.js`, `tools/boundary.test.ts`, `CONTRIBUTING.md`, `apps/web/src/device-registry.ts`, `apps/web/src/aircraft-validation.test.ts`               |
| 4    | #17                      | 1      | `core/src/phases/**`, `core/src/session/**`                                                                                                                                                                                                                                                 |
| then | release v0.3.0           | 1      | `CHANGELOG.md`, `changelog.d/**`                                                                                                                                                                                                                                        |

`core/` abbreviates `packages/core/`. No issue but #11 touches `packages/core/src/index.ts` or `packages/core/package.json`; no M2 issue touches `pnpm-lock.yaml`, `apps/web/src/App.tsx` or `.github/workflows/**`.

## Review Focus

1. **A compile-time rule that does not fire.** A loosely typed `defineAircraft` accepts an unknown target silently. Pinned in Task 1 by `@ts-expect-error` lines, which `pnpm typecheck` turns into failures when they stop erroring.
2. **A seam a later wave has to reopen.** If #12 or #13 lacks an interface listed under its Interfaces, #15, #17 or #44 would edit a wave-2 directory. Reviewers of Tasks 2 and 3 check every listed interface exists and is tested.
3. **Engine moves counted as deviations.** A spring return, a breaker trip or a snapshot load recorded against the pilot would make the §9 walk-through fail. Pinned in Task 5 (source filter) and Task 9 (walk-through-style test with no deviations).
4. **Non-determinism in core.** A timer, `Date.now()` or randomness breaks repeatable tests. Reviewers grep `packages/core/src` for `setTimeout`, `setInterval`, `Date`, `Math.random`, `performance`.
5. **Vacuous device lint rules.** A rule keyed on existing directories never fires before the first device package. Pinned in Task 8 by boundary tests on virtual `packages/device-x/` paths.

---

### Task 1: Contract types and `defineAircraft` (Closes #11)

**Files:**

- Create: `packages/core/src/contract/**` (types, `define-aircraft.ts`, tests), `changelog.d/11.added.md`
- Create stubs (`export {};` in `index.ts`): `packages/core/src/{controls,runtime,blocks,failures,checklist,phases,validator,devices,session}/index.ts`
- Modify: `packages/core/src/index.ts` (re-export `./contract` and every stub; keep `CONTRACT_VERSION`), `packages/core/src/index.test.ts`

**Dependencies:** none.

**Interfaces (produced):**

- `Text = { de: string; en: string }`.
- Controls declared as a record keyed by control id, each with `kind` (`toggle`, `rotary`, `lever`, `momentary`, `guarded`, `breaker`), positions, starting position, `name: Text`, `description: Text`. Rotary detents may name the detent they spring back to. Levers are continuous `0..1` or named notches. Guarded controls declare the guard. Breakers have positions `in` and `pulled`.
- Indicators keyed by id: a selector over `TrainerState` and a display declaration; no state of their own.
- Views: `image: string`, placements per control and indicator id (2D rectangle, optional 3D position and orientation).
- `systems: { initial: S; step(state: S, input: StepInput): S }`, `StepInput = { controls, failures: ReadonlySet<FailureId>, environment: Environment, dtMs: number }`.
- Failures keyed by id with `name: Text` and an optional list of breaker ids the failure trips.
- Phases keyed by id with `image: string`, `environment` (airspeed, altitude, on ground), `entry: { controls: positions; state: S }`.
- Procedures with `id`, `title: Text`, `type: 'normal' | 'emergency'`, `startPhase`, optional `endPhase`, `failure` (required when the type is `emergency`), and items: `action` (target control, position, optional `holdUntil: Condition`), `check` (target indicator or control, `condition: Condition`), `confirm` (no target). Every item has `text: Text`.
- `TrainerState<S> = { controls: positions; systems: S; devices: Readonly<Record<string, unknown>> }` and `Condition<S> = (state: TrainerState<S>) => boolean`. `devices` is empty until #44 fills it; reserving it now keeps #16's signature stable.
- `Aircraft` (the non-generic type the registry holds) and `defineAircraft(definition)`, generic over the control, indicator, failure and phase id unions so wrong references are type errors.

- [ ] **Step 1: Failing type tests.** `contract/define-aircraft.test.ts` with `// @ts-expect-error` cases: an action item targets an unknown control; a check targets an unknown indicator; a procedure names an unknown phase; an emergency procedure names an unknown failure or none; a failure trips an unknown control or a non-breaker; a `Text` lacks `de` or `en`; a placement names an unknown control. Plus runtime assertions that a valid fixture round-trips unchanged.
- [ ] **Step 2: Types and `defineAircraft`** until `pnpm typecheck` and `pnpm test` pass. `defineAircraft` returns its input; it adds no runtime checks (that is #18).
- [ ] **Step 3: Shared fixture.** `contract/fixtures.ts`: a small valid aircraft covering every control kind, one emergency procedure and two phases. Later issues import it read-only; one that needs more builds its own fixture in its own directory.
- [ ] **Step 4: Stubs and barrel.** Create the nine stub directories and re-export each from `index.ts`.
- [ ] **Step 5: Fragment** `changelog.d/11.added.md`: `Aircraft contract types and defineAircraft, with compile-time checks of every reference and bilingual text.`

**Definition of done:** every Step 1 case errors at compile time; the barrel exports the contract and the nine stubs; `CONTRACT_VERSION` is still exported. PR open with `Closes #11`, reviewed, in `develop`.

---

### Task 2: Control store (Closes #12)

**Files:** `packages/core/src/controls/**`, `changelog.d/12.added.md`

**Dependencies:** #11.

**Interfaces (produced; later waves rely on each):**

- `createControlStore(controls)` from a control record (aircraft controls, or aircraft plus namespaced device controls from #17).
- Pilot input: `set(id, position)`, `press(id, position?)`, `release(id)`, `openGuard(id)`, `closeGuard(id)`. Each returns whether the change applied, and why not (`guarded`).
- `systemSet(id, position)`: a move by the engine (breaker trip), ignoring guards, emitted with source `system`.
- `load(positions)`: replace all positions (phase entry snapshot), emitted as one `system` change per moved control.
- `positions()`, `subscribe(listener)` receiving `ControlChange = { id, from, to, source: 'pilot' | 'spring' | 'system' }`.

- [ ] **Step 1: Failing tests** for each "Done when": a spring-return detent goes back on `release` (change with source `spring`); a momentary control is active only between `press` and `release`; a guarded control refuses `set` while its guard is closed and accepts it once open. Plus: `systemSet` moves a guarded control; `load` emits only for controls that moved; unknown ids throw.
- [ ] **Step 2: Implement** until green.
- [ ] **Step 3: Fragment** `changelog.d/12.added.md`: `Control store with spring-return, momentary and guarded controls.`

**Definition of done:** every interface above exists and is tested. PR with `Closes #12`, reviewed, in `develop`.

---

### Task 3: Systems runtime (Closes #13)

**Files:** `packages/core/src/runtime/**`, `changelog.d/13.added.md`

**Dependencies:** #11.

**Interfaces (produced):**

- `createSystemsRuntime(systems, { environment })`.
- `onControlsChanged(positions)` steps with `dtMs: 0`; `advance(dtMs)` steps with that `dtMs`. The fixed step length is an exported constant the app's driver uses.
- `setEnvironment(environment)`, `setFailures(set)`: inputs to the next step.
- `reset(state)`: replace the state (phase entry snapshot) and clear an error.
- `state()`, `status()` (`running` or `failed` with the error), `subscribe(listener)`.

- [ ] **Step 1: Failing tests:** a fixture whose state counts elapsed time advances identically across runs for the same sequence of `advance` calls; the environment set from a phase reaches `step`; failures set via `setFailures` reach `step`; a `step` that throws leaves the last good state, sets `failed` with the error, notifies subscribers, and stops stepping until `reset`.
- [ ] **Step 2: Implement** until green. No timers in core.
- [ ] **Step 3: Fragment** `changelog.d/13.added.md`: `Systems runtime that steps the aircraft model on control changes and over time, and reports a failing step.`

**Definition of done:** each "Done when" has a test; every interface above exists. PR with `Closes #13`, reviewed, in `develop`.

---

### Task 4: Reusable system blocks (Closes #14)

**Files:** `packages/core/src/blocks/**`, `changelog.d/14.added.md`

**Dependencies:** #11 (types only).

**Interfaces (produced):** `electricalBus` and `pistonEngineStart`, each `{ initial, step(blockState, inputs, dtMs) }` over plain inputs (`masterOn`, `alternatorOn`, `starterEngaged`, `magnetos`, `busPowered`, failure flags). Blocks know no control ids; an aircraft maps its controls and failures to block inputs inside its own `step`.

- [ ] **Step 1: Failing tests** for each "Done when": starter with magnetos off does not start the engine; starter without bus power does nothing; a running engine keeps running after the starter is released. Plus: the engine catches only after the starter has cranked over successive steps; the alternator charges only with the engine running; an alternator failure flag stops charging.
- [ ] **Step 2: Implement** until green.
- [ ] **Step 3: Fragment** `changelog.d/14.added.md`: `Reusable electrical bus and piston-engine start blocks.`

**Definition of done:** the three "Done when" scenarios pass as tests through the blocks alone. PR with `Closes #14`, reviewed, in `develop`.

---

### Task 5: Checklist engine (Closes #16)

**Files:** `packages/core/src/checklist/**`, `changelog.d/16.added.md`

**Dependencies:** #11.

**Interfaces (produced):** a pure reducer: `startChecklist(procedure, state)`, `observeControl(checklist, change, state)`, `observeState(checklist, state)`, `checkOff(checklist, state)`. The checklist state holds the current item index, completed items, deviations (`{ kind: 'unexpected-control' | 'unmet-check', itemIndex, controlId? }`) and `done`.

- [ ] **Step 1: Failing tests** for each "Done when": an action item completes when its target reaches the position; with `holdUntil` it completes only once the condition also holds; check and confirm items complete on `checkOff`; a pilot change to a non-target control records a deviation; checking off an unmet check records a deviation and still completes the item. Plus: changes with source `spring` or `system` never record a deviation; an action item that becomes current while already satisfied completes at once; the engine never alters its inputs.
- [ ] **Step 2: Implement** until green.
- [ ] **Step 3: Fragment** `changelog.d/16.added.md`: `Checklist engine with action, check and confirm items, and deviation recording.`

**Definition of done:** each "Done when" and each Decision 5–7 rule has a test. PR with `Closes #16`, reviewed, in `develop`.

---

### Task 6: Aircraft validator and CI wiring (Closes #18)

**Files:**

- `packages/core/src/validator/**`
- `packages/aircraft-demo/**` (convert to a minimal valid `defineAircraft` aircraft; self-drawn placeholder SVGs only)
- `apps/web/src/aircraft-registry.ts` (element type `Aircraft`), `apps/web/src/aircraft-registry.test.ts`, create `apps/web/src/aircraft-validation.test.ts`
- `changelog.d/18.added.md`

**Dependencies:** #11.

**Interfaces (produced):** `validateAircraft(aircraft, context?)` returning `Finding[]`, each `{ aircraftId, code, id, message }`. Codes: `unknown-target`, `unplaced-control`, `unplaced-indicator`, `missing-translation` (empty `de` or `en`), `phase-without-image`, `phase-without-snapshot`, `undeclared-failure`. `context` is an extension point #44 uses for the device registry.

- [ ] **Step 1: Failing tests:** one fixture per code proves the finding, names the aircraft and the offending id; the #11 fixture yields no finding. Inputs that bypass the types (casts) are how the tests reach unknown targets.
- [ ] **Step 2: Implement** until green.
- [ ] **Step 3: Demo aircraft and registry.** Convert `aircraft-demo` to `defineAircraft` with one view, one control, one phase and one normal procedure; images are its own placeholder SVGs referenced as `new URL('./…svg', import.meta.url).href`. Type `aircraftRegistry` as `readonly Aircraft[]`.
- [ ] **Step 4: CI wiring.** `aircraft-validation.test.ts` runs the validator over every registry entry and fails listing every finding. It runs inside `pnpm test`, which the required `check` job runs.
- [ ] **Step 5: Fragment** `changelog.d/18.added.md`: `Aircraft validator, run in CI over every registered aircraft.`

**Definition of done:** each finding kind has a test; a deliberately broken registry entry fails `pnpm test` locally (shown in the PR, not committed); the demo aircraft passes. PR with `Closes #18`, reviewed, in `develop`.

---

### Task 7: Failure injection (Closes #15)

**Files:** `packages/core/src/failures/**`, `changelog.d/15.added.md`

**Dependencies:** #12, #13.

**Interfaces (produced):** `createFailureSet(aircraft, { store, runtime })` with `inject(id)`, `clear(id)`, `clearAll()`, `active()`. Injecting forwards the set to `runtime.setFailures` and moves each breaker the failure trips with `store.systemSet(id, 'pulled')`.

- [ ] **Step 1: Failing tests** for each "Done when": the active set reaches `step`; injecting an undeclared failure throws naming the id; a failure that trips a breaker pulls it with a `system` change. Plus: clearing a failure does not reset a tripped breaker (the pilot resets it).
- [ ] **Step 2: Implement** until green, using only #12 and #13's public interfaces.
- [ ] **Step 3: Fragment** `changelog.d/15.added.md`: `Failure injection, including circuit breakers tripped by a failure.`

**Definition of done:** each "Done when" has a test; no file outside `failures/` changed. PR with `Closes #15`, reviewed, in `develop`.

---

### Task 8: Device contract and runtime (Closes #44)

**Files:**

- `packages/core/src/devices/**`, `packages/core/src/contract/**` (device definition type; aircraft `devices` install field; device targets in items), `packages/core/src/validator/**` (device findings)
- `eslint.config.js`, `tools/boundary.test.ts`, `CONTRIBUTING.md` (package boundaries: device lines)
- `apps/web/src/device-registry.ts` (element type `DeviceDefinition`), `apps/web/src/aircraft-validation.test.ts` (pass the device registry)
- `changelog.d/44.added.md`

**Dependencies:** #11, #18. Uses #12 and #13 through their interfaces.

**Interfaces (produced):**

- `defineDevice({ id, manual: Text, notModelled: Text[], controls, initial, step })`, where `step(state, { controls, powered, inputs, dtMs })` is pure.
- Aircraft install: `devices: { [installId]: { device: string; view; placement; powered: Condition; inputs: { [name]: (state) => number | boolean | string } } }`. The device is named by id, never imported.
- Device controls appear in the store as `<installId>.<controlId>`; items target them by that id; device state appears in `TrainerState.devices[installId]` as `{ on: boolean; state }`.
- `stepDevices(...)` for #17 to call after the aircraft step; `on` equals `powered`.
- Validator codes: `unknown-device`, `unknown-device-control`, `unplaced-device`, checked against the device list passed in `context`.

- [ ] **Step 1: Failing tests** for each "Done when": a fixture device (in `devices/`, not a package) declares controls, initial state and a pure step; an aircraft installs it with placement, power and inputs; with its power condition false the device is `on: false`; a procedure action targets a device control and a check reads device state; boundary tests show a React or panel-kit import in `packages/device-x/src/logic/` is rejected, a panel-kit import in `packages/device-x/src/screen/` is allowed, and `@cpt/core` is allowed in both.
- [ ] **Step 2: Contract and devices** until green; the #11 type tests still pass.
- [ ] **Step 3: Lint rules** with static globs `packages/device-*/src/logic/**` (core only) and `packages/device-*/src/screen/**` (core and panel-kit); relative reach into another package rejected as for aircraft. `CONTRIBUTING.md` gains the two device lines.
- [ ] **Step 4: Validator and registry.** Device findings; `device-registry.ts` typed; the validation test passes the device registry.
- [ ] **Step 5: Fragment** `changelog.d/44.added.md`: `Device contract: a device declares controls, state and logic; an aircraft installs it with power and data wiring.`

**Definition of done:** each "Done when" has a test, the lint rules fire on virtual device paths, no device package is created. PR with `Closes #44`, reviewed, in `develop`.

---

### Task 9: Phase handling and session (Closes #17)

**Files:** `packages/core/src/phases/**` (pure phase-jump and snapshot functions), `packages/core/src/session/**` (composition), `changelog.d/17.added.md`

**Dependencies:** #12, #13, #15, #16, #44.

**Interfaces (produced):** `createSession(aircraft, { devices })` composing store, runtime, failures, checklist and devices, with `jumpToPhase(id)`, `startProcedure(id)`, pilot input forwarded to the store, `advance(dtMs)`, `checkOff()`, and `subscribe`. This is the object the M3 app uses.

- [ ] **Step 1: Failing tests** for each "Done when": jumping to a phase loads its entry snapshot (positions, systems state, environment); completing a procedure with an end phase moves to it; starting an emergency procedure injects its failure. Plus: a walk-through of the #11 fixture's normal procedure from its start phase completes with no deviations; snapshot loads and breaker trips record no deviation; a procedure end phase keeps positions, state and failures.
- [ ] **Step 2: Implement** until green, using only the other modules' public interfaces.
- [ ] **Step 3: Fragment** `changelog.d/17.added.md`: `Phase handling: entry snapshots, procedure start and end phases, failure injection on emergency procedures.`

**Definition of done:** each "Done when" has a test; no file outside the listed directories changed. PR with `Closes #17`, reviewed, in `develop`.

---

### Task 10: Release v0.3.0

Run the `milestone-release` skill once all nine open issues are closed: whole-milestone review, fragment fold into `CHANGELOG.md` on `release/v0.3.0`, owner summary, release PR `develop` to `main`. The owner reviews and merges it; agents do not.

The summary carries what shipped, the Decisions below and any made in PRs, the open questions, and how to verify (`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`; break the demo aircraft locally and see `pnpm test` fail with a named finding).

**Definition of done:** release PR open against `main` with the summary; nothing merged into `main` by an agent.

---

## Decisions

1. **One directory per issue, barrel pre-created by #11.** The barrel is the only file every issue would otherwise share; stubs let waves 2–4 run without touching it.
2. **Controls, indicators, failures and phases are records keyed by id.** Keys become literal type unions, which is what makes an unknown target a compile error (#11's done-when).
3. **Core owns no timers.** The runtime exposes `advance(dtMs)` and a fixed step constant; the app drives it. Tests then control time exactly.
4. **Every control change carries a source** (`pilot`, `spring`, `system`). Only `pilot` changes can be deviations; a spring return, breaker trip or snapshot load is the aircraft or the engine acting, not the pilot.
5. **The checklist follows the current item strictly.** A pilot change to any other control, including a later item's target, is a deviation; spec §5 defines deviation against the current item.
6. **An action item already satisfied when it becomes current completes at once,** so an out-of-order action is recorded once and never stalls the list.
7. **Checking off an unmet check completes it and records a deviation.** Spec §5 records it; the checklist never blocks.
8. **A throwing `step` freezes the runtime at the last good state with a `failed` status** until reset. Rethrowing would escape the app's interval driver; spec §8 asks for reporting, not swallowing.
9. **Starting a procedure loads its start phase's entry snapshot.** Spec §9's walk-through starts from that snapshot; a clean start makes a run reproducible.
10. **A procedure's end phase changes phase, environment and outside view, but keeps positions, systems state and failures.** Overwriting them would erase what the pilot just did. Only an explicit phase jump loads a snapshot, and it clears active failures.
11. **Blocks are pure over plain inputs and know no control ids.** Aircraft differ in switch layout; the mapping belongs in the aircraft's `step`.
12. **A failure declares the breakers it trips.** Placed in #11's contract so #15 needs no contract edit.
13. **Device power is a condition over the trainer state,** not a bus id. Aircraft with the electrical block write `powered: (s) => s.systems.electrical.avionicsBus`; #44 then needs nothing from #14.
14. **Device control ids are `<installId>.<controlId>`, checked by the validator, not the compiler.** An aircraft may not import a device package, so the device's control list is unknown to its types.
15. **No device package in M2.** #44 tests with an in-core fixture device; lint rules use static globs so they fire before the first device package (M4).
16. **Image fields are URL strings; the validator checks they are declared, not that the file exists.** Core cannot import assets; spec §8 gives a missing file a placeholder at runtime.
17. **#18 converts the demo aircraft to a minimal valid aircraft and types the registry.** "Validate every registered aircraft" needs registered aircraft to be contract values; M4 fills the demo out.
18. **Validation runs inside `pnpm test`, no separate CI step.** The required `check` job already runs it, so any finding fails CI; a second step would only repeat the run.
19. **`CONTRACT_VERSION` stays 1.** No aircraft contract was released before M2.

## Open questions for the owner

None blocking. Every point the spec leaves open for M2 is decided above; the owner reviews the decisions at the release.
