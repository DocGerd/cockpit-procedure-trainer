# M4 Demo Aircraft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fictional demo aircraft proves the contract end to end: controls of every kind, two views, a systems model built from core's blocks, two normal procedures and one emergency, a generic COM radio and transponder installed in it, a walk-through test that performs every normal procedure of every registered aircraft, browser tests in CI, and the authoring guides for aircraft and devices. Shipped together with M3 and M5 in the single release v0.6.0 (see the M5 plan, Task 6).

**Architecture:** Content lives in packages: `packages/aircraft-demo` (aircraft), `packages/device-com` and `packages/device-transponder` (devices, `src/logic/` on core only, `src/screen/` on panel-kit). `apps/web` changes only in its two registries and in tests that iterate the registries. The walk-through driver is a pure core function (`packages/core/src/walkthrough/`), so it is testable against core alone and runs alongside M3's UI work. Browser tests drive the built app with Playwright.

**Tech Stack:** as M3. `@playwright/test` (dev, root) is added by Task 3 of the M5 plan, together with M5's PWA plugin, so the browser-test PR touches no lockfile.

**Spec:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, sections 1 (Success criteria), 3, 4 (all), 4.9, 7, 9 and 11 (M4 Demo aircraft). Content policy: `docs/content-policy.md`. M3 plan: `docs/superpowers/plans/2026-10-06-m3-web-shell.md` (waves 1–5, Decisions 1–15).

**Issues:** #30 demo aircraft, #31 procedure walk-through test, #32 browser tests, #33 authoring guide (aircraft), #46 COM radio and transponder plus device authoring guide, and #123 (Task 4: install the devices in the demo aircraft).

## Pre-flight checks

**(a) What exists?** `packages/aircraft-demo` is a minimal valid aircraft: one breaker, one view (`panel.svg`), one phase (`parking.svg`), one procedure, a contract-version test. It is already registered in `apps/web/src/aircraft-registry.ts`. `apps/web/src/aircraft-validation.test.ts` and `aircraft-session.test.ts` iterate the registry with `deviceRegistry`. No device package exists; `deviceRegistry` is empty. `pnpm-workspace.yaml` covers `packages/*`, so a new package needs no root edit. ESLint already has blocks for `packages/device-*` and `packages/device-*/src/logic/`, and `tools/boundary.test.ts` covers them with virtual paths (M2 #44), so no package kind is new in M4.

**(b) How are device controls addressed?** As `<installId>.<controlId>` (`DeviceControlId` in `contract/types.ts`, built in `devices/device-runtime.ts`). Action and check items may target them; an action may carry `holdUntil`. `Session` offers `set`, `press`, `release`, `openGuard`, `closeGuard`, `advance`, `checkOff`, `startProcedure`, `jumpToPhase`. The walk-through (Task 2) needs nothing else.

**(c) Can M4 run alongside M3?** Partly, by file ownership against the M3 wave table:

1. `packages/aircraft-demo/**`, `packages/core/src/walkthrough/**`, `packages/core/src/index.ts` and new `packages/device-*` directories belong to no M3 task. `pnpm-lock.yaml` and every `package.json` belong to M3 #19 in wave 1 only.
2. `apps/web/src/device-registry.ts` belongs to M3 #45 (wave 5), and #45 also produces `deviceScreens` and the `DeviceLayer` a device screen renders in. Installing a device therefore waits for wave 5.
3. #30's widget-id test needs panel-kit's `controlWidgets` and `indicatorWidgets` maps (M3 #21, #22, wave 2).
4. Browser tests need the whole M3 UI and are most useful after the M5 UI changes, so #32 runs last.

**(d) Can #46 be one PR?** No. Its bullet "a demo procedure includes a device item" needs `packages/aircraft-demo/**` (#30) and `device-registry.ts` (M3 #45, wave 5), while the device logic, screens and `docs/adding-a-device.md` can start after M3 wave 1. Decision 1 splits it.

**(e) Does #118 (Decision 9 of M3) constrain the demo?** Yes: an action item on a continuous lever targets only `0` or `1`; an in-between setting is a check item with a condition, or the lever declares named notches. #118's own test asserts every registered aircraft yields no finding, so a demo that breaks the rule fails CI whichever lands first.

## Global Constraints

- Everything in the M3 plan's Global Constraints applies (base `develop`, one issue per PR with `Closes #<n>`, fragments, `pr-selfreview` review with mutation checks, `merge-train`, tests first, minimal comments, the gh and hook rules, the gate before every push).
- **Wave invariant across milestones:** M4 tasks run in M3's waves. No path appears under two issues of the same wave, M3 or M4. Each task's **Files** list is its complete allowlist; a task that needs another file stops and reports.
- **M3 tests never hard-code demo content.** #30 rewrites the demo while M3 is in flight; any M3 test that asserts on the demo's breaker or procedure breaks. M3 tests use the registry or a test-local fixture aircraft. The orchestrator puts this line into every M3 brief from wave 1 on.
- Aircraft and device content: own words, self-drawn SVGs, no manufacturer names, artwork or handbook text (`docs/content-policy.md`). Each package has a `README.md` with `## Source revision`, a `LICENSES.md` with one entry per image file, and devices a `## Not modelled` section matching their `notModelled` texts.
- Aircraft refer to widgets and devices by id, never by import. `apps/web` imports aircraft only in `aircraft-registry.ts` and devices only in `device-registry.ts`.
- Device screens use only `DeviceScreenProps` (from M3 #19) and panel-kit; every operable element is a native `<button>` with an accessible name, so M5's keyboard work never edits a device package. The bezel and the dark powered-off screen are M3 #45's `DeviceScreenFrame`; a screen draws its display contents only.
- Fragments: #30, #31, #46, #123: `added`; #32: `added`; #33: `added`.

## Vocabulary

- **walk-through** (#31): performing every item of a procedure in order from its start phase's entry snapshot, the way a pilot following the checklist would.
- **install**: an aircraft's `devices` entry placing a device by id in a view, with its bus and inputs.
- **lane N**: an M4 or M5 task that runs alongside M3 wave N. Waves 6 and 7 follow M3 wave 5 and hold only M4 and M5 tasks.

## Execution Model

| Task                                   | Worker         | Reviewer                                                  |
| -------------------------------------- | -------------- | --------------------------------------------------------- |
| 1 Demo aircraft (#30)                  | sonnet, high   | opus, xhigh (the reference every later aircraft copies)   |
| 2 Walk-through test (#31)              | sonnet, high   | sonnet, high                                              |
| 3 COM radio and transponder (#46)      | sonnet, high   | sonnet, high                                              |
| 4 Install devices in the demo (new)    | sonnet, high   | sonnet, high                                              |
| 5 Authoring guide: aircraft (#33)      | sonnet, medium | sonnet, high (follows the guide in a scratch worktree)    |
| 6 Browser tests (#32)                  | sonnet, high   | sonnet, high                                              |

Release: none in M4. The combined v0.6.0 release is the M5 plan's last task.

## Dependency Graph

```
M3 #21 + #22 (wave 2) → #30
#30 + M3 #20 (wave 4) → #33
M3 #19 (wave 1) → #46
#30 + #46 + M3 #45 (wave 5) → Task 4
M3 complete + M5 #34, #36 + Task 4 → #32
#31: none inside M3/M4 (core session only)
```

## Waves

M3's waves are repeated for the collision check. M5 tasks are listed for the same reason and planned in the M5 plan.

| Wave / lane | M3 issues and files                                                                                                     | M4 / M5 issues and files                                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | #19 (all manifests, lockfile, `web/src/{App.tsx,main.tsx,shell,theme,storage,trainer,styles}/**`, mount stubs), #95, #77, #118 | none                                                                                                                                                                                                                                                         |
| 2           | #28 `web/src/{i18n,shell}/**`, `App.tsx` · #21 · #22 · #23 (panel-kit `controls`, `indicators`, `artwork`)                | **#31** `core/src/walkthrough/**`, `core/src/index.ts`, `web/src/procedure-walkthrough.test.ts` · **#46** `packages/device-com/**`, `packages/device-transponder/**`, `pnpm-lock.yaml`, `docs/adding-a-device.md`                                              |
| 3           | #29 `web/src/errors/**` · #25 `web/src/checklist/**` · #24 `web/gallery.html`, `web/src/gallery/**`                      | **#30** `packages/aircraft-demo/**`, `web/src/aircraft-widgets.test.ts` · **#124** (M5) `package.json`, `web/package.json`, `pnpm-lock.yaml`                                                                                                               |
| 4           | #20 `web/src/panel/**`, `panel-kit/src/resolve/**`, stubs in `modes/`, `devices/` · #27 `web/src/outside-view/**`          | none                                                                                                                                                                                                                                                         |
| 5           | #26 `web/src/modes/**` · #45 `web/src/devices/**`, `web/src/device-registry.ts`, `panel-kit/src/device-screen/**`          | **#33** `docs/adding-an-aircraft.md`, `README.md` · **M5 #35** `panel-kit/src/controls/**`, `web/src/panel/**`, `web/src/styles/base.css`                                                                                                                                                                       |
| 6           | —                                                                                                                       | **#123** `web/package.json`, `pnpm-lock.yaml`, `web/src/device-registry.ts`, `packages/aircraft-demo/**` · **M5 #34** `web/vite.config.ts`, `web/src/pwa/**`, `web/src/App.tsx`, `web/public/**`, `web/index.html` · **M5 #36** `panel-kit/src/{controls,indicators,artwork,device-screen}/**`, `web/src/{panel,modes,devices}/**` |
| 7           | —                                                                                                                       | **#32** `web/e2e/**`, `web/playwright.config.ts`, `web/tsconfig.json`, `package.json` (scripts only), `.github/workflows/ci.yml`, `eslint.config.js`                                                                                                           |
| then        | —                                                                                                                       | release v0.6.0 (M5 plan Task 6)                                                                                                                                                                                                                                |

`core/`, `web/` and `panel-kit/` abbreviate `packages/core/`, `apps/web/` and `packages/panel-kit/`. Each PR also adds its own fragment. Earliest possible start differs from the planned lane for two tasks: #31 could start alongside wave 1 (it touches nothing of wave 1), and #46 could too except that wave 1's #19 owns the lockfile. Both are planned for lane 2 to keep wave 1's scaffold review undisturbed.

## Review Focus

1. **The demo breaking the lever rule.** An action item on a continuous lever with a target other than `0` or `1` is uncompletable in the UI. Reviewer of #30 greps the procedures and runs #118's validator test.
2. **A walk-through that cheats.** A driver that sets state directly, skips `holdUntil` or calls `checkOff` on a failing check would pass every aircraft. Pinned by Task 2's mutation cases.
3. **Device code leaking across boundaries.** A screen importing `@cpt/core` internals or another device, or `apps/web` importing a device outside `device-registry.ts`, is an ESLint error; reviewers confirm the lint ran on the new packages.
4. **Fixed waits in browser tests.** `waitForTimeout` or sleeps make CI flaky; #32's reviewer greps for them.
5. **Content policy.** No manufacturer name, model number, real frequency plan or handbook phrasing in the demo or the devices.

---

### Task 1: Fictional demo aircraft (Closes #30) — lane 3

**Files:** `packages/aircraft-demo/**` (sources, SVGs, tests, `README.md`, `LICENSES.md`), `apps/web/src/aircraft-widgets.test.ts`, `changelog.d/30.added.md`, and any existing test already in `develop` that pins the old demo content (only to make it use the registry or a fixture; not a test owned by an issue of the current wave, which stops and reports instead)

**Dependencies:** M3 #21 and #22 in `develop` (widget ids for the widget test). Respects M3 Decision 9 / #118.

**Goal:** a small single-engine piston aircraft, invented for this project, that exercises every contract feature the app renders.

**Content (minimum; names are the demo's own):**

- Controls covering every kind at least once: battery master and alternator switches (`toggle`), avionics master (`toggle` with a `rocker` widget), magneto key OFF/R/L/BOTH (`rotary`, `key-switch` widget), starter button (`momentary`, `push-button`), annunciator switch DIM/BRIGHT/TEST with TEST springing back (`rotary`), fuel selector (`rotary`, `rotary-knob` widget), throttle and mixture (`lever`, continuous), flaps (`lever`, named notches), a guarded fuel shut-off (`guarded`, `guarded-handle`), two breakers (`breaker`, `circuit-breaker`), one of them tripped by the alternator failure.
- Indicators covering every generic indicator widget: tachometer, oil pressure and ammeter (`round-gauge` with ranges, units and arcs), low-voltage and oil-pressure lamps (`annunciator`), an hour meter or OAT (`digital-readout`).
- Two views, panel and centre console, each with a self-drawn SVG background, so Guided view switching (M3 #26) has a target on each.
- Systems from core's blocks: `electricalBus` (battery, alternator, breakers) and `pistonEngineStart` (magnetos, fuel, starter, mixture). Failures: alternator failure (trips its breaker) and at least the one the emergency injects.
- Phases with self-drawn outside-view SVGs and entry snapshots: parking, holding point, cruise.
- Procedures: two normal (engine start from parking; before take-off checks at the holding point, ending in a phase change if useful), one emergency (alternator failure in cruise) naming its failure. Throttle and mixture action targets are `0` or `1` only; "set 1000 RPM" style steps are check items on the tachometer.
- No `artwork` appearance anywhere: generic widgets or none.

- [ ] **Step 1: Failing tests** in `packages/aircraft-demo/src/`: `validateAircraft` returns no finding; scenario: starter held with the magneto key OFF turns the engine but it does not start; scenario: starter held with the battery master off leaves the starter unpowered and the engine stopped; scenario: correct start runs the engine; the alternator failure trips its breaker and the low-voltage lamp lights; every control kind of the contract appears at least once, and at least one rotary detent springs back; no appearance is `artwork`. In `apps/web/src/aircraft-widgets.test.ts`: every `widget` id declared by any registered aircraft is a key of panel-kit's `controlWidgets` or `indicatorWidgets` (generic for every future aircraft, so it lives next to the validation test).
- [ ] **Step 2: Implement** until green. Keep the existing contract-version test.
- [ ] **Step 3: Package docs:** `README.md` with `## Source revision` ("fictional aircraft; no handbook"), `LICENSES.md` with one entry per SVG (drawn for this project, MIT).
- [ ] **Step 4: Fragment:** `A fictional demo aircraft with a full panel, two views, two normal procedures and an alternator-failure procedure.`

**Definition of done:** #30's three bullets each have a test; #118's registry test and the existing validation and session tests pass; no file outside the allowlist; every pinned-content test #30 updated is listed in the PR description and the report. No `ui-verifier` on this PR (no rendering code); the demo's look is checked by M3 #20's and #26's `ui-verifier` passes, which the orchestrator points at the new demo if #30 is in `develop` by then. PR with `Closes #30`, reviewed, in `develop`.

---

### Task 2: Generic procedure walk-through test (Closes #31) — lane 2

**Files:** `packages/core/src/walkthrough/**` (create), `packages/core/src/index.ts` (one export line), `apps/web/src/procedure-walkthrough.test.ts`, `changelog.d/31.added.md`

**Dependencies:** none inside M3/M4 (M2 session, M3 wave 0 #110 already in `develop`).

**Interfaces (produced):** `walkProcedure(aircraft, procedureId, { devices }) → { ok: true } | { ok: false; aircraft: string; procedure: string; itemIndex: number; item: string; reason: string }`. It creates a session in the procedure's start phase (entry snapshot), starts the procedure, and per item: **action** without `holdUntil`: open the guard if the control is guarded, then `set`; **action** with `holdUntil` or on a momentary control or spring-back detent: `press`, `advance` by core's exported step constant until the condition holds or a bound of steps (a named constant in the module) is exceeded, then `release`; **check**: `advance` by the step constant until the condition holds, up to the same bound (a pilot waits for oil pressure or RPM), then `checkOff`; if it never holds, fail with reason `condition not met`; **confirm**: `checkOff`. After the last item the checklist must be complete with zero deviations, else fail naming the first deviation. Device targets `<installId>.<controlId>` go through the same session calls.

- [ ] **Step 1: Failing tests** in `walkthrough/` with core's own fixtures: a fixture procedure completes; a fixture with a check whose condition the actions never establish fails naming that item; a fixture check whose condition becomes true only after some steps completes (a driver that does not advance before checking fails it); a fixture whose `holdUntil` never becomes true fails with the bound reason, not a hang; a guarded target is opened first; a device-control item completes (core's device fixtures); the failure object carries aircraft id, procedure id and item text (English). In `apps/web/src/procedure-walkthrough.test.ts`: `it.each` over every registered aircraft × every `normal` procedure, asserting `ok` and printing the failure fields in the message.
- [ ] **Step 2: Implement** until green. Pure: no timers, no randomness.
- [ ] **Step 3: Fragment:** `A walk-through test performs every normal procedure of every registered aircraft and fails naming the item that does not complete.`

**Definition of done:** #31's two bullets have tests; mutation: making `walkProcedure` skip `holdUntil`, check off a failing check, or check without advancing makes a test fail. PR with `Closes #31`, reviewed, in `develop`. No `ui-verifier`.

---

### Task 3: Generic COM radio and transponder; device authoring guide (Closes #46) — lane 2

**Files:** `packages/device-com/**`, `packages/device-transponder/**` (each: `package.json`, `tsconfig.json`, `src/index.ts`, `src/logic/**`, `src/screen/**`, `README.md`), `pnpm-lock.yaml`, `docs/adding-a-device.md`, `changelog.d/46.added.md`

**Dependencies:** M3 #19 (`DeviceScreenProps`, panel-kit React dependency, panel hardware tokens). M3 #95 (literal lint covers `packages/device-*/src/screen`).

**Interfaces (produced):** `comDevice` (id `com`) and `transponderDevice` (id `transponder`) built with `defineDevice`; `ComScreen` and `TransponderScreen` as `ComponentType<DeviceScreenProps>`. Package exports: `.` (logic and screen). Not registered anywhere yet (Task 4).

- COM: power (via the install's bus), volume knob, standby frequency entry with coarse and fine knobs on a fixed channel spacing and range, active/standby swap button. Inputs: none.
- Transponder: power, mode selector (OFF, STBY, ON, ALT), four-digit squawk entry (digits 0–7), IDENT button with a timed reply flag driven by `step`'s `dtMs`. Input: pressure altitude, shown in ALT.
- `notModelled` texts and the README `## Not modelled` list: audio, reception, intercom, memory channels, frequency database (COM); interrogation, replies, ADS-B, VFR-code button behaviour beyond setting the code (transponder), and anything else left out.

- [ ] **Step 1: Failing tests** (logic, node environment): power off shows nothing and ignores input; frequency entry wraps at the range ends and keeps the spacing; swap exchanges active and standby; squawk digits stay in 0–7; mode changes; IDENT sets the reply flag and clears it after the time the logic declares; ALT exposes the altitude input. Screen tests (jsdom docblock): the display shows the state; every operable element is a `<button>` (or a native range input) with an accessible name; pressing one calls `send` with the control id and action; no text other than unit-neutral display content and accessible names passed in.
- [ ] **Step 2: Implement** until green. Colours and sizes only through `var(--panel-*)` and the token scale.
- [ ] **Step 3: Docs:** each `README.md` (`## Source revision`: "generic unit, no manufacturer manual"; `## Not modelled`); `docs/adding-a-device.md`: package layout, logic shape, screen props, installing in an aircraft (bus, inputs, placement), registering in `device-registry.ts` (`deviceRegistry` and `deviceScreens`), procedure items on device controls, content policy.
- [ ] **Step 4: Fragment:** `Generic COM radio and transponder devices, and a guide to adding a device.`

**Definition of done:** #46's COM, transponder and "lists what it does not model" bullets have tests or docs; the "demo procedure includes a device item" bullet moves to Task 4 (Decision 1). `pnpm lint` passes on the new packages (boundary rules fire on them). No `ui-verifier` here (nothing mounted in the app); Task 4 verifies the screens. PR with `Closes #46`, reviewed, in `develop`.

---

### Task 4: Install the COM radio and transponder in the demo aircraft (Closes #123) — wave 6

#123 (M4) carries the bullet moved from #46 ("A demo procedure includes a device item") plus "both screens render and operate in the panel", and edits #46's body to point to it.

**Files:** `apps/web/package.json` (two workspace dependencies), `pnpm-lock.yaml`, `apps/web/src/device-registry.ts`, `packages/aircraft-demo/**`, `changelog.d/123.added.md`

**Dependencies:** #30, #46, M3 #45 (wave 5: `deviceScreens`, `DeviceLayer`).

- [ ] **Step 1: Failing tests:** the validation, session and walk-through registry tests now see two installs and still pass; a demo procedure (a new short normal one, or an item added to the before take-off checks) sets the transponder to a code and mode and the COM standby frequency, and the walk-through completes it; with the avionics bus off both devices are off.
- [ ] **Step 2: Implement:** installs in the demo (console view or panel, bus, altitude input to the transponder); register both devices and screens.
- [ ] **Step 3: Fragment:** `The demo aircraft has a COM radio and a transponder, with a procedure that uses them.`

**Definition of done:** the issue's bullets have tests; `ui-verifier` operates both screens in the panel at tablet and desktop, light and dark, including the dark powered-off screen. PR with `Closes #123`, reviewed, in `develop`.

---

### Task 5: Authoring guide: adding an aircraft (Closes #33) — lane 5

**Files:** `docs/adding-an-aircraft.md` (create), `README.md` (one link line under Development), `changelog.d/33.added.md`

**Dependencies:** #30 (the reference), #46 (links to the device guide), M3 #20 (wave 4: the resolver that picks a generic widget or artwork, which the appearance section describes).

- [ ] **Step 1: Write** the guide in this order: create the package (`package.json`, `tsconfig.json`, depends on `@cpt/core` only), the registry line, controls (kinds, positions, the lever rule of M3 Decision 9), indicators and selectors, views and placements, systems from core's blocks, failures, phases and entry snapshots, procedures (item kinds, `holdUntil`, emergency failure), appearance (generic widget ids and options; artwork layers: face, needle, per-position images, travel path), installing devices (link to `docs/adding-a-device.md`), content policy (README sections, `LICENSES.md`), and the checks that must pass (validator, walk-through, `pnpm test`). Code excerpts come from the demo by file reference, not copied wholesale.
- [ ] **Step 2: Verify:** the reviewer follows the guide in a scratch worktree, creates a minimal `packages/aircraft-scratch` with one view, one control and one procedure, registers it, and runs `pnpm test`; the validator and walk-through pass. The scratch work is not committed; the reviewer reports each step where the guide was unclear as a finding.
- [ ] **Step 3: Fragment:** `A guide to adding an aircraft.`

**Definition of done:** #33's two bullets: the walkthrough order above, and the reviewer's scratch aircraft validates. PR with `Closes #33`, reviewed, in `develop`. No `ui-verifier`.

---

### Task 6: Browser tests (Closes #32) — wave 7

**Files:** `apps/web/e2e/**` (create), `apps/web/playwright.config.ts`, `apps/web/tsconfig.json` (include `e2e` and the config), `package.json` (script `test:e2e` only; the dependency is already there from M5 Task 3), `.github/workflows/ci.yml`, `eslint.config.js` (an `e2e` block only if lint needs one), `changelog.d/32.added.md`

**Dependencies:** M3 complete, Task 4, M5 #34 (offline) and #36 (final roles and names) in `develop`.

**Goal:** Playwright against the production build served by `vite preview`, Chromium at tablet and desktop viewports.

- [ ] **Step 1: Tests:** pick the demo aircraft, run the engine-start procedure in Guided to the summary with zero deviations; run the before take-off checks in Practice with one deliberate deviation and see it in the summary; switch language and see shell and aircraft text change; offline reload (spec §9): visit once, wait for the service worker to control the page, go offline, reload, run a procedure. Selectors by role and accessible name; waits on state (`expect(...).toBeVisible()`, `toHaveText`, the service worker's ready promise), never `waitForTimeout`.
- [ ] **Step 2: CI:** steps inside the existing `check` job after `pnpm build`: install Chromium with its system dependencies, run `pnpm test:e2e`; upload the Playwright report on failure. Raise the job's `timeout-minutes` if needed. A separate job is not a required check without a ruleset change (Decision 6).
- [ ] **Step 3: Fragment:** `Browser tests run in CI: Guided and Practice procedures, language switch, offline reload.`

**Definition of done:** #32's three bullets; a grep shows no fixed timeout; the CI run on the PR executes the browser tests in `check`. PR with `Closes #32`, reviewed, in `develop`. No `ui-verifier` (the tests are the browser check).

---

## Decisions

1. **#46 is split.** #46 keeps the device packages and the device guide and starts in lane 2; #123 (Task 4) installs both devices in the demo, registers them, and takes #46's bullet "a demo procedure includes a device item". Reason: the install needs `device-registry.ts` (M3 #45, wave 5) and `packages/aircraft-demo/**` (#30); keeping #46 whole would push all device work behind M3 wave 5. Same precedent as M3's Task 4.
2. **The walk-through driver is a core function**, `walkProcedure` in `packages/core/src/walkthrough/`, and the registry-wide test lives in `apps/web/src/` next to the validation test. Reason: core cannot import aircraft; a pure driver is testable with core fixtures alone and lets authors run one procedure in their own package tests. It walks `normal` procedures only, as the spec says; emergencies are covered by the aircraft's scenario tests.
3. **The demo covers every control kind and every generic widget at least once,** with two views. Reason: M3's renderer, modes and M5's touch and keyboard work all need a real aircraft that exercises every widget; the gallery is development-only.
4. **Generic widget ids are checked by a registry test in `apps/web`** (`aircraft-widgets.test.ts`). Reason: an aircraft cannot import panel-kit, and an unknown id silently falls back to the kind's default, which the validator cannot see.
5. **Device screens draw contents only and use native buttons.** The frame and dark screen are M3 #45's; keyboard operation comes from the native elements, so M5 #36 needs no device edit.
6. **Browser tests run inside the `check` job.** Reason: `check` is the required status on `develop` and `main`; a new job would need a ruleset change by the owner.
7. **Browser tests run last (wave 7),** after the M5 UI changes, so their selectors target the final roles and names and the offline reload covers the real service worker.

## Open questions for the owner

1. None blocks M4. There is no copyright question: the aircraft is fictional, the devices are generic, and every image is drawn for the project.
2. The single release v0.6.0 for M3–M5 is recorded in the M5 plan's open questions.
