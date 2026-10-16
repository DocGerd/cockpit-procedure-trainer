# M21 Cockpit sounds (v0.22.0)

Milestone M21 is released as v0.(21+1).0, so this is v0.22.0; on GitHub it is milestone 22. The goal: synthesised cockpit audio. The pilot hears controls click, the CT Supralight's engine, starter, airflow and flap motor, and the FLARM display's beeps, with a sound button and volume in the header. Sounds are built from native Web Audio nodes: no audio files, no recordings.

Both aircraft get the control clicks; only the CT Supralight has engine, airflow, flap-motor and FLARM sounds. The design is in `docs/superpowers/specs/2026-10-15-cockpit-sounds-design.md`, the task plan in `docs/superpowers/plans/2026-10-15-cockpit-sounds.md`.

## What shipped

For pilots:

- **A sound button in the header** (PR #853 for #810): an on/off switch and a volume slider in a popover. Sound defaults on, below full volume; the browser starts audio at the first gesture. The choice is stored locally like the theme.
- **Control clicks in both aircraft** (PR #858 for #811, PR #843 for #805, PR #841 for #802): a control clicks when the pilot operates it, a rotary moved several positions plays one click per detent, a spring-back move plays one, and a touchscreen stays silent. Clicks are declared as data per aircraft or device.
- **The CT Supralight's engine, starter, airflow and flap motor** (PR #864 for #819, built on PR #846, PR #852, PR #844, PR #832): the cranking and the catch, the magneto drop, the cruise drone, the shutdown and run-down, the airflow and the flap motor's run.
- **FLARM display beeps** (PR #863 for #818): at start-up and when the volume is stepped. The tones are assumed (see Decisions).
- **A relight fix** (PR #876 for #836): the engine relights from windmilling only at the handbook's 200 propeller rpm, no longer at ordinary glide speed.
- **Two review fixes** (PR #884 for #881, PR #883 for #882): the voices re-sync when sound is switched on or the tab shown again, so no stale engine or motor sound plays for a moment; the volume slider no longer re-renders the trainer layout while dragged.

For maintainers:

- **Specification** (PR #829 for #799): the sounds spec, ADR-0003, and the plan.
- **Core and contract** (PR #833, PR #830, PR #842): the session control-change feed and reset epoch, the optional sound declarations and validator rows, the device cue diff.
- **Panel-kit audio** (PR #835, PR #843, PR #851, PR #846, PR #852, PR #875): the audio engine lifecycle with a fake context, click synthesis, the beep voice, the piston-engine, airflow and electric-motor voices, and the voice options `gearboxRatio` and `bladeCount`.
- **Driver and settings** (PR #831, PR #845, PR #858, PR #862): validated sound and volume keys, `AudioProvider` with the e2e sound-off seed, and `connectCockpitAudio` with voices, device cues and baselines.
- **Checks and docs** (PR #864, PR #868, PR #860, PR #856, PR #857, PR #880): an aircraft sounds check, A/B perf arms, a cockpit-audio test over the real CTSL and demo, and the step-2 documentation.
- **Agent docs** (PR #798 for #797, PR #869 for #808): the M20 and M21 session learnings recorded in `CLAUDE.md`.
- **Sound-facts intake** (PR #872 for #821, PR #878 for #873, PR #880 for #879): the spec's wave-2 questions answered in `docs/aircraft/ctsl-intake.md` from the handbook and photos (intake §9 questions 71 to 79); PR #877 for #823 applies the engine facts to the CTSL.

Closed without a change: #825 to #828 (detent clicks, ELT buzzer, rescue deployment, flap end stop) as not planned, #834 and #848 as done, #855 as a duplicate of #866. #824 (FLARM beep facts) moved out of M21.

## Decisions made

1. **ADR-0003 lifts the spec's audio non-goal** (PR #829). Radio and intercom audio need other stations and equipment the trainer does not model, but the cockpit's own sounds follow from state it already has; hearing the engine catch or the rpm drop on one magneto is part of recognising what the aircraft does (ADR-0002 rank 2). Radio, intercom, audio selector, GPS sounds and FLARM traffic tones stay out. Sounds are synthesised with native nodes, so no third-party recording enters the repo and the strict CSP and offline use hold.
2. **Spec changes from the review of PR #829**, each reasoned in its review thread:
   - `cues` takes the device's own state, as `step` does, and `deviceCues` passes each install's state.
   - Stored sound settings are validated like `theme` and `language` (an allow-list, an integer range for volume), not read raw like `recall`.
   - "One detent whatever the distance" applies only to a move into a spring-back position, so the ignition key from OFF to both magnetos counts three detents, not one.
   - With the engine running, the key turned to START adds only the whine; the rpm moves to the cranking rpm only when the engine is stopped.
   - A jump (a phase load) fires no edge, so loading cruise plays no catch and loading parking starts no run-down.
   - The flap motor runs while `flaps.moving` holds, except while extending above the speed limit: a selector cannot see the failure set.
   - The starter lockout cannot make `starter` fall, because the selector follows the key.
   - Switching sound on from off-at-start must create or resume the context itself, inside the switch's user activation.
   - The spec now says the intake names no aural warning; the milestone holds both waves, so the release waits for the owner's intake session; the build order defers the PR split to the plan.
3. **`connectCockpitAudio` takes a clock argument** (PR #858 for #811, then PR #862 for #812). Spec §6.7 lists `clock?`, but only the voices use it, and they arrived with #812; an unused trailing parameter fails `@typescript-eslint/no-unused-vars`. So #811 shipped four parameters and #812 added the clock and `voices` together. The clock is injected so tests drive model time without audio and with a fake context; it defaults to `performance.now()`.
4. **Cranking rpm is a by-ear default** (`pistonEngineDefaults.crankingRpm`) until intake §9 question 72 (sounds spec §13 question 4) gets a source. The handbook gives the start procedure but no cranking rate, crank time, catch flare or run-down.
5. **The owner's listening check of wave 1 passed on UAT on 2026-10-15** (recorded on #821).
6. **Sound-facts intake from the handbook and photos** (PR #872 for #821): gearbox 2.273 : 1 standard and 2.43 : 1 optional, for both UL and ULS (the issue paired them with one variant each; the handbook corrects that); D-MPGO's standard gearbox is assumed (unverified); the engine variant and the propeller's blade count stay open; no stall warner (inferred from absence); relight at 200 propeller rpm. The intake PR needed three intake-checker fix rounds, one beyond release-cycle's two-wave cap, because CLAUDE.md's intake-checker gate outranks the cap.
7. **#825 to #828 closed as not planned**: the handbook and photos give no source for any of the four cues, and the trainer adds no sound without one.
8. **#824 (FLARM beep facts) moved out of M21, still blocked.** No FLARM document is among the sources, so the T18 tones stay assumed (unverified): levels loud 1, medium 0.5, quiet 0.25, one 2000 Hz tone per beep. This was the orchestrator's call, not the owner's; see the open questions.
9. **`gearboxRatio` and `bladeCount` voice options** (PR #875 for #822, PR #877 for #823): the blade-pass tone renders only when both are given. The CTSL passes the ratio only, since the blade count is open, so nothing audible changed.
10. **The relight fix shipped in M21** (PR #876 for #836; the plan had deferred it to its own issue). Relight compares propeller rpm, so a windmilling relight now needs about 228 km/h, above cruise and best glide: the starter is the normal restart in a glide. The windmill rate is unchanged (scope limit); follow-up #874.
11. **Intake polish** (PR #878 for #873, PR #880 for #879): questions 76 and 77 reworded against the handbook, and the engine's cylinder count and cycle recorded as handbook facts everywhere. ADR-0003's general-knowledge bullet was edited in place rather than by a dated note.
12. **Release review fixes**: PR #884 re-syncs the voices when the engine turns live (the listener tracks `live()` itself, so a mute and unmute with no session frame still jumps); PR #883 moves the engine into its own context, so the volume slider no longer re-renders the trainer.
13. **Release review process**: this session's PRs #872 to #884 each ran the pr-review-toolkit agents inside the wave workflow (the records are in the session, not on the PRs). A cumulative intake-checker pass over `v0.21.0..develop` aircraft and device content passed with non-blocking traceability notes (a follow-up issue is to come). The release-head ui-verifier pass is VERDICT: PASS with no blocking findings, on a production build of `origin/develop` 1351759 so the strict CSP applied ([recorded on #810](https://github.com/DocGerd/cockpit-procedure-trainer/issues/810#issuecomment-6218910434)).

## Open questions for the owner

1. **Confirm moving #824 out of M21** and supply the FLARM display sheet or manual for it; until then the FLARM tones are assumed (unverified).
2. **D-MPGO's engine and propeller**: UL or ULS, whether it has the standard gearbox, and the propeller's make and blade count. A blade count enables the blade-pass tone.
3. **A cranking-rpm source** (intake §9 question 72).
4. **Windmill relight at about 228 km/h**: acceptable, or does the windmill rate need work (#874)?
5. **Rescue handle location wording**: HB 3-4 puts it on the centre console, HB 7-13 on the main bulkhead; the intake now says "between the seats".
6. **ADR-0003's general-knowledge bullet** was edited in place by PR #880 rather than by a dated note. Acceptable?
7. **Local e2e failure**: `view-checklist.spec.ts:148` (tablet drawer closed) fails in full local runs and passes in CI (Refs #794).
8. **Non-blocking ui-verifier observations**: a press of the demo aircraft's COM radio makes no click (not investigated, probably no sound mapping for that unit), and on the 1024 px picker the open sound popover covers the Normal 7 procedure-tab rail until an outside tap.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). The one local failure is `view-checklist.spec.ts` "the summary comes forward with the tablet drawer closed" (Refs #794); `pnpm test:e2e sound-settings csp` covers the sound control and the CSP.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT, with sound on and the volume up:

1. **Header.** Press the speaker icon: a popover with a switch and a volume slider. Switch sound off: nothing plays; on again: the next control click is heard.
2. **Clicks.** In both aircraft press BAT and move a rotary: each click is heard, and the CT Supralight's flap selector plays one click per detent. A radio or GPS touchscreen stays silent.
3. **Engine.** On the CT Supralight, start from the parking phase: the starter whine, the catch, the idle, the drop on one magneto, the shutdown with the run-down. In Cruise, the engine drones with the airflow; operate the flaps for the motor.
4. **FLARM.** Switch the FLARM display on and step its volume: a start-up beep, then a shorter beep at each step.
5. **Sync.** Mute during the engine run and unmute: the engine sounds as the cockpit is now, not as it was.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
