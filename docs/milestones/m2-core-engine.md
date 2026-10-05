# M2 Core engine (v0.3.0)

## What shipped

The engine lives in `@cpt/core` (`packages/core/src/`), one directory per issue. The engine is not visible in the web app yet; M3 builds the UI on the session. The only visible changes are the theme-aware native controls and the favicon (#98).

- M2 implementation plan (#99).
- Aircraft contract types and `defineAircraft`, with compile-time checks of every reference, position and bilingual text (#100, closes #11).
- Systems runtime: steps the aircraft model on every control change and on `advance(dtMs)`, reports a failing step (#102, closes #13).
- Electrical bus and piston-engine start system blocks (#103, closes #14).
- Checklist engine with action, check and confirm items, completion and deviation recording (#104, closes #16).
- Control store with spring-return, momentary and guarded controls (#105, closes #12).
- Aircraft validator, run over every registered aircraft; the demo aircraft is now a minimal valid `defineAircraft` aircraft (#106, closes #18).
- Failure injection, including circuit breakers tripped by a failure (#107, closes #15).
- Device contract and runtime: a device declares controls, state and logic; an aircraft installs it with a power condition and data inputs; ESLint rules for `packages/device-*` (#108, closes #44).
- Phase handling and the session (`createSession`), the object the M3 app drives (#109, closes #17).
- Carried from M1: `color-scheme` and favicon (#98, closes #91), the `No changelog:` exemption (#97, closes #92), M1 design open questions settled (#96, closes #93).
- Whole-milestone review fixes: one shared position check for the control store and the validator, so a continuous lever value outside 0 to 1 is a validator finding; a test that starts a session and enters every phase of every registered aircraft; `SessionControlResult` exported (#112, closes #111).

## Decisions made

Each was made in the PR named and checked against the merged code on `develop`.

Contract (#100, #11):

- Control positions are type-checked through `PositionOf` (a typo such as `'onn'` fails `pnpm typecheck`); the validator also checks them at runtime (`unknown-position`) for aircraft that bypass the types.
- Procedures are a record keyed by id, like controls, phases and views, so a duplicate id cannot compile and `startProcedure(id)` is unambiguous.
- `ControlChange` is a discriminated union on `kind` (`position` or `guard`), with source `pilot`, `spring` or `system`.
- Phases carry a bilingual `name`, because the header phase control (#93) needs a label and the translation rule then covers it.
- Aircraft carry `id`, `name` and `handbookRevision` (spec §7); views are keyed by id.

System blocks (#103, #14):

- The blocks are factories, `electricalBus({ batteryVolts, chargingVolts })` and `pistonEngineStart({ crankMsToStart })`, with no defaults: each aircraft supplies its crank time and voltages, so core pins no aircraft's figures.

Runtime (#102, #13):

- A throwing listener is an app bug, not a systems failure: it does not set `failed`, every listener still runs and the first error is rethrown.
- A `dtMs` that is not finite or is negative throws `RangeError` before stepping, and leaves state and status unchanged.
- A throwing aircraft `step` freezes the runtime at the last good state with `failed` status until `reset` (plan Decision 8).

Control store (#105, #12):

- `load` is partial: controls missing from the snapshot keep their position, so device controls survive an aircraft-only snapshot. `load` also closes every open guard, so a snapshot never starts with a stale open cover.

Devices (#108, #44):

- Device power is a condition over the trainer state that reads the bus, not a bus id. This departs from the "power bus" wording of spec §4.9 and #44; the spec's decisions table is unchanged.
- `AircraftDefinition.devices` and the phase `entry.devices` are optional.
- A dotted install id is rejected by the validator only (`invalid-install-id`); the type does not reject it, because a key-level check would need another type parameter.
- Device texts (manual, not-modelled entries, control names, descriptions and guard names) are checked for `missing-translation`.
- The duplicate, stale `deviceRegistry` export in `apps/web/src/aircraft-registry.ts` was deleted; `apps/web/src/device-registry.ts` is the single device registry.

Session (#109, #17):

- A phase load (procedure start or phase jump) builds a complete snapshot (phase controls plus every device control at its entry or initial position), closes guards, clears failures and resets systems and devices, so runs are reproducible.
- A procedure's end phase keeps positions, systems state, devices and failures; only the phase id and environment change.
- `jumpToPhase` abandons the active procedure, because a jump clears the failures an emergency checklist depends on.
- There is no direct failure injection on the session: the spec ties failures to emergency procedures, and only `startProcedure` of an emergency procedure injects one.
- A throwing device `step` sets session status `failed`, like a throwing aircraft step; pilot input then returns `{ applied: false, reason: 'failed' }`, and a phase load recovers.
- `state()`, `guards()` and `failures()` return cached snapshots, rebuilt only after a change, so they bind directly to `useSyncExternalStore`.

Review fixes (#112, #111):

- One position check, `isPosition`, lives in `contract/` and is used by both the control store and the validator, so they cannot drift; the type `PositionOf` stays `number` for a continuous lever, because a range cannot be expressed in the type.

Process:

- The validator runs inside `pnpm test`, which the required `check` job runs, not as a separate CI step (plan Decision 18; see open question 1).
- The plan PR #99 carries no changelog fragment (`No changelog:` line, per #92).

## Open questions for the owner

1. Spec §10 lists the aircraft validator as its own CI item. Plan Decision 18 runs it inside `pnpm test`, which the required `check` job runs. Confirm, or ask for a named CI step.
2. A pilot moving the current action item's own control through a wrong in-between position is not a deviation; the item just stays current (spec §5 judges by target only). Changing this would change the spec.
3. `jumpToPhase` abandons the active procedure (see Decisions). M3's header phase control (#93) will trigger this mid-procedure. Confirm.
4. An action item on a continuous lever completes only when the lever sits at exactly the target value; a dragged lever will practically never land on it. Settle before M3 builds the lever widget: snap the lever to declared steps, add a tolerance or range to continuous action targets, or allow only notched levers in action items and express throttle settings as check items.

Owner-only items carried over:

5. #94: check `BRAND.md` against the DocGerdSoft brand bundle (needs the owner's design login).
6. From #71 (finding 16): run `/plugin` once in a fresh Claude Code session to confirm the project's plugin list loads.
7. Local cleanup: the `.claude/worktrees/agent-*` git worktrees and their local branches in the owner's checkout are left over from agent runs and can be removed (`git worktree list`, `git worktree remove`, `git branch -D`).

Follow-ups filed for later milestones: #101 (readable errors for position typos) and #110 (the session still steps systems while a device step has failed).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- The engine is covered by unit tests under `packages/core/src/**` (`pnpm test`); `packages/core/src/session/` holds the walk-through tests that drive a fixture aircraft through phases and procedures.
- `apps/web/src/aircraft-validation.test.ts` validates every registered aircraft; a broken aircraft fails `pnpm test` with one line per finding.
- `packages/core/src/contract/define-aircraft.test.ts` holds the `@ts-expect-error` cases; `pnpm typecheck` fails if a wrong reference stops being a compile error.
- `tools/boundary.test.ts` proves the new `packages/device-*` lint rules fire.
- The app is otherwise unchanged, with the favicon and theme-aware scrollbars: UAT https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.3.0 --jq .tag_name` prints `v0.3.0`.

## Carried findings

The whole-milestone review over `v0.2.0..26af6b6` found no blocker; lint, typecheck and all 437 tests passed. Its one major finding (the validator accepted any number for a continuous lever while the control store throws outside 0 to 1, so an aircraft could pass CI and then fail to start a session) and two nits (`SessionControlResult` not exported, the #17 changelog line not naming the session) were fixed in #112. Carried:

- The validator accepts a momentary control's held position, or a spring-back detent such as ignition START, as a starting or phase entry position, so a snapshot could start with the starter engaged and nobody holding it. A new validator rule; not needed until an aircraft declares such a control.
- Exact-equality completion of action items on a continuous lever: open question 4.
