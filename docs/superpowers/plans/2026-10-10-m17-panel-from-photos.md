# M17 Panel from Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the CTSL panel shows D-MPGO as it is today, so a pilot trained on it finds every control, legend and gauge where the aircraft has them.

**Design:** `docs/aircraft/ctsl-intake.md` §3.7 (photo survey of the owner's photos of 2026-10-10, with the photo-against-trainer table §3.7.2) and §2a (owner decisions 2026-10-10). ADR 0002: rank 1 procedural correctness, rank 2 realism; accessibility ranks lowest.

**Inputs:** the intake PR #628 (photo survey, §9 answers) and the owner's decisions of 2026-10-10:

1. The photos win over the 2026-10-08 confirmations. An item the photos do not show (the ELT remote, carb heat) stays as it is.
2. The avionics devices change in M18, not here.
3. The ASI follows the photos, with VNE 300 km/h.
4. M17 is a full rework of layout, gauges, breaker strip, console art, legends and texts.

**Milestone:** M17 (GitHub milestone 18). M18 "D-MPGO avionics" (GitHub milestone 19, #633) follows.

**Tech stack:** as M12. No new dependency.

## Issues

| Task                       | Issue | Also closes | Intake rows (§3.7.2)                                                                                                                                                                                                | Area     |
| -------------------------- | ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T1 Legends and texts       | #629  | #537        | ignition, rocker, flap-selector, master and lever-title legends; parking-brake legend                                                                                                                                | aircraft |
| T2 Console art             | #630  | #570, #536  | throttle strip, large knob, parking-brake place, rudder and aileron trim, rescue handle, grips, fuel valve                                                                                                          | aircraft |
| T3 Airspeed, VSI and limits | #631  |             | airspeed markings, VSI units                                                                                                                                                                                        | aircraft |
| T4 Panel layout            | #632  |             | panel fields, upper-left instruments, charge lamp, second lamp, compass, engine gauges, breaker block, lower column contents, cabin heat, FLARM and hour meter                                                       | aircraft |

#538 (lever order) is confirmed by the photos and needs no change; #628 closes it. Each issue holds its scope, likely files, acceptance criteria and the §9 questions it answers; the issue is the task's brief.

Not in M17:

- **Avionics units** (#633, M18, owner-gated).
- **Usable fuel:** the intake value stays 124 l and no code changes.
- **Wing-root fuel gauges:** outside the three views.
- **ELT remote and carb heat:** they stay, per owner decision 1.

## Pre-flight checks

**(a) Serial chain.** All four tasks edit `packages/aircraft-ctsl/src/artwork.ts`, and T1, T2 and T4 also edit `controls.ts` and `views.ts`. They run as a stacked serial chain, T1 → T2 → T3 → T4. Each branches from `develop` after its predecessor has landed, so no two M17 PRs are open on the same file at once.

**(b) Four fields at the floors.** T4 adds an upper-centre field and moves three device slots into it. It proves the arrangement with `floors.spec.ts` and `layout.spec.ts` at 1920x1080 and 1920x950. If the fields do not fit the floors, it keeps the M13 compromise (the console beside the centre column) and states that in the PR. The dock stays under the panel (decisions table "Cockpit layout").

**(c) No decisions-table change.** The avionics change that would touch spec §11 ticket 47 and intake §2 decision 1 is M18's, owner-gated. M17 moves the existing devices only.

**(d) Printed labels.** Every operable control keeps a printed label in the panel's own wording (`apps/web/src/panel/printed-labels.test.tsx`). Where the photos hide a legend (the Avionics Master rocker, the brake strip's forward end, ignition positions past 2), the intake value or an assumption stands, named in the PR and recorded in the intake as **assumed (unverified)**.

## Global constraints

- Everything in the M12 plan's Global constraints applies: base `develop`, one issue per PR with `Closes #<n>`, a fragment or a `No changelog:` line, separate-agent review via `pr-selfreview`, `merge-train`, tests first, and the CONTRIBUTING Checks chain before every push.
- An issue's **Files** list is its likely allowlist. A task that needs another file names it and why in the PR.
- Panel facts come from intake §3.7 and §2a, paraphrased. `reference/` is never read. No photo, crop or tracing of the owner's photos enters the repo: art is drawn for the project. Manufacturer lettering (the type-name script, unit logos) is not reproduced.
- Colours, type and spacing come from `apps/web/src/styles/tokens.css` only. No brand or status colour on the panel.
- Panel art follows the M12 art-direction brief and scores at least 2 on every applicable heading of the M12 rubric (`ui-verifier`). A rubric-scored PR stays a draft until a ui-verifier passes it.
- Every PR runs `floors.spec.ts` and `layout.spec.ts` at 1920x1080 and 1920x950, and gets a `ui-verifier` pass at 1920x1080 (T4 also at 3840x2160). T2 and T4 run `pnpm test:perf` locally.
- `walk-procedure` walks every CTSL procedure in T1 and T3, which change procedure text or limits.
- Comments only where the code cannot say it; no measured figure in a comment.

## Dependency graph

```
T1 #629 ── T2 #630 ── T3 #631 ── T4 #632 ── (M18 #633)
legends    console    dials      layout
```

## Tasks

### T1 Legends and texts (#629, closes #537)

- [ ] Ignition OFF, 1, 2, 1+2, START in the control, artwork, descriptions and every EN and DE procedure item that names L, R or BOTH (N3, N6, E4 and others found by grep). 1+2 and START are assumed (not legible in the photos).
- [ ] Rockers: two-word legends, I/O symbols. Flap selector "up manually" and "down manually". Boxed "Master". "Stabilator Trim".
- [ ] Parking-brake valve "Off", "Brake", "On". Update its name and description texts.
- [ ] Answers §9 q8 and q25 (trim title).

### T2 Console art (#630, closes #570 and #536)

- [ ] Remove the throttle detent ticks (#570).
- [ ] Remove the large knob (#536); record q10/q11 answered.
- [ ] Parking-brake lever in a curved slot on the right side.
- [ ] Aileron- and rudder-trim wheels as inert art, plus the parachute warning placard.
- [ ] Rescue handle red and centred on the aft face, pin with a flag.
- [ ] Grips: blue throttle, black knurled brake, plain choke.
- [ ] Fuel-valve strip and red grip on the column's left edge.
- [ ] Answers §9 q10, q11 and q26.

### T3 Airspeed, VSI and limits (#631)

- [ ] ASI 40 to 340 km/h; arcs white 72–115, green 94–245, yellow 245–300; red line 300.
- [ ] VNE 300 km/h (162 kt). Max flap speed at −12° is 300 km/h.
- [ ] VSI in ft/min, ±2000, ticks every 500.
- [ ] Every text naming 260 follows.
- [ ] Answers §9 q2 (VNE part).

### T4 Panel layout (#632)

- [ ] Four fields.
- [ ] Upper-left 2×2.
- [ ] Devices moved to the upper-centre field, plus inert FLARM art.
- [ ] Upper-right: tachometer, then the CHT / voltmeter / oil temperature / oil pressure 2×2 and the hour meter. The "Generator" lamp replaces CHARGE. No compass and no second lamp.
- [ ] Breaker strip: 2×7 plus 12V Outlet with full-word legends; unmodelled positions as inert caps.
- [ ] Glareshield "Cabin Heat" knob as inert art.
- [ ] Lower-column background as in the photos.
- [ ] Answers §9 q9, q13, q19, q20 and q22.

## Settled values (intake §2a, §4)

| Value             | Trainer uses                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| ASI scale         | 40–340 km/h, numbers every 20                                                                   |
| ASI arcs          | white 72–115, green 94–245, yellow 245–300 (white and green lower end not legible; values kept) |
| VNE / red line    | 300 km/h (162 kt)                                                                               |
| Max flap −12°     | 300 km/h (placard)                                                                              |
| VSI               | ±2000 ft/min, ticks every 500; phases about +600 and −400 ft/min                                |
| Usable fuel       | 124 l (62 per side; the wing-root placards print 63)                                            |
| Ignition legends  | OFF, 1, 2, 1+2, START (1+2 and START assumed)                                                   |
| Parking brake     | "Off", "Brake", "On"                                                                            |

## Decisions (agent, overrulable)

- **Serial, not waves.** The four tasks share `artwork.ts`, and three of them share `views.ts` and `controls.ts`. Running them in parallel would only produce rebase conflicts on a force-push-free repository.
- **Legends before geometry.** T1 changes words only and is the safest first step. T4, the largest change, comes last, so its rubric pass judges the final art.
- **Voltmeter modelled.** The photos show a voltmeter, and §3.5 said there was none. T4 adds it as an indicator reading a bus voltage. The value model is a trainer assumption, recorded in the intake.
- **Inert art.** The FLARM display, hour meter, cabin-heat knob, red-cross disc and rudder- and aileron-trim wheels are drawn but not operable. They are not used by any procedure, and the decisions table names no such control.
- **Aircraft name.** "CT Supralight (representative panel)" stays until the owner rules on dropping "representative" once T4 lands. The milestone summary asks.

## Review focus

1. Every panel fact traces to intake §3.7 or §2a. An assumed fact is listed in the PR and recorded in the intake.
2. No photo-derived image in the repo; no manufacturer lettering.
3. T4: the dock is under the panel, and every floor is backed by a green `floors.spec.ts` run at both heights.
4. T1 and T3: `walk-procedure` is green, and EN and DE texts match.
