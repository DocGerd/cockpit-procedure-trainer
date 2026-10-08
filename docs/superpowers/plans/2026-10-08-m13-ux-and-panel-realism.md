# M13 UX and Panel Realism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the trainer's UX follows general UX practice and procedure-trainer practice, and a pilot leaves it prepared for a real flight in the aircraft: knowing which controls exist and where they are. A realistic panel layout is central.

**Design:** parent spec §2 (decisions table), §4.7 (checklist items), §5 (modes, runtime, persistence); `2026-10-06-one-viewport-cockpit-design.md` §4 (arrangements); `docs/aircraft/ctsl-intake.md` §3 (panel inventory). ADR 0002: rank 1 procedural correctness, rank 2 realism; accessibility ranks lowest, so no task adds screen-reader or keyboard-route work.

**Inputs:** three read-only audits of `develop` at 9a05695 (v0.12.0) and their triage: panel fidelity (findings P1 to P8), trainer flow against procedure-trainer conventions (T1 to T12) and a heuristic UX review at 1920x1080 and 3840x2160 (H1 to H13). Audit ids are quoted in each issue.

**Milestone:** M13 (GitHub milestone 14), released as v0.14.0. Plan issue: #435.

**Tech stack:** as M12. No new dependency.

## Issues

| Task | Issue | Audit items | Area | Wave |
|---|---|---|---|---|
| P1 Arrange CTSL fields as in the aircraft | #436 | P1 | aircraft | 1 |
| A Picker layout and wording | #437 | H1, H12, H13 | web | 1 |
| C Checklist pane layout | #438 | H6 | web | 1 |
| K Dock surface | #439 | H4 | web | 1 |
| L 4K chrome scaling | #440 | H5 | web | 1 |
| B Navigation guards and header | #441 | H2, H3, H10 | web | 2 |
| D Checklist engine rules | #442 | T1, T7, T10 | core, web | 2 |
| I Local history | #443 | T8b | web | 2 |
| M CTSL panel view | #444 | P5a, P8a | aircraft | 2 |
| E Deviation feedback and debrief | #445 | T6/H7, T8a/H11, H9a, H9b | web, core | 3 |
| H Scenario sessions | #446 | T4, T12, T9 | core, web | 3 |
| N CTSL centre field | #447 | P2, P7 | aircraft | 3 |
| Q Flow contract and engine | #452 | T5 | core | 3 |
| F Practice recall and assists | #448 | T2 | web | 4 |
| O CTSL console | #449 | P3, P4, P8c | aircraft | 4 |
| G Memory items, CTSL included | #450 | T3a, T3b | core, web, aircraft | 5 |
| R Flows in the trainer, CTSL flows | #453 | T5 | web, aircraft | 5 |

P5b and P8b are part of #444 (M), P6 of #447 (N), T3b of #450 (G) and the P1 proportions of #436, under the owner's ruling on missing panel facts (see Owner answers).

Each issue holds its problem, likely files, dependencies and acceptance criteria; the issue is the task's brief. Group letters follow the triage, so J is missing (see Excluded).

## Pre-flight checks

**(a) P1 may not fit at today's floors.** Stacking the centre field and the console under the panel needs more height than the HD cockpit region has at the current `minWidth` values; M11 put them on the right. #436 proves its arrangement with `floors.spec.ts` and `layout.spec.ts` at 1920x1080 and 1920x950, and if it does not fit, takes one of two fallbacks and states it: larger legends to lower the binding floors (the M7 Task 2 precedent), or the console beside the centre column with only the centre column under the junction.

**(b) The dock stays under the panel.** The decisions table says "device dock under the panel" and `layout.spec.ts` asserts it. #436 moves the dock left or right of the centre column, still below the panel; never beside the panel.

**(c) One decisions-table change, already made.** This plan's PR (#451) amends the "Step order" row, §4.7 and §5 step 4 for flows, owner-approved 2026-10-08. No task changes a decisions-table row. D, F, G, H, I and R amend spec §4.7 or §5 text (R the Guided and Practice rows of §5 Modes); each PR states the reason. Where an item sits close to a row (T7 and "Step order", T4 and "Procedures", T2 and "Modes"), the PR flags it and the milestone summary carries it to the owner.

**(d) `ChecklistPane.tsx` is the hotspot.** B, C, D, E, F, G and R edit it; D, Q and G edit `checklist.ts` in that order. C lands first; later tasks touch different regions (restart handler, item rendering, banner, Practice option, memory mark). The second of two same-wave PRs takes the other through the train.

## Global constraints

- Everything in the M12 plan's Global constraints applies: base `develop`, one issue per PR with `Closes #<n>`, a fragment or a `No changelog:` line, separate-agent review via `pr-selfreview`, `merge-train`, tests first, the CONTRIBUTING Checks chain before every push.
- An issue's **Files** list is its likely allowlist; a task that needs another file names it and why in the PR.
- Colours, type and spacing from `apps/web/src/styles/tokens.css` only; no brand or status colour on the panel; every control keeps its printed label (`printed-labels.test.tsx`); a placard never names a trainer view.
- Panel facts come from `docs/aircraft/ctsl-intake.md`, paraphrased; where it lacks one, general knowledge of the CT Supralight, listed in the PR description and recorded in the intake as **assumed (unverified)** (owner ruling 2026-10-08). `reference/` is never read.
- Panel art follows the M12 art-direction brief and must score at least 2 on every applicable heading of the M12 rubric (`ui-verifier`).
- Comments only where the code cannot say it; no measured figure in a comment.
- Every PR that changes what the app renders gets a `ui-verifier` pass (1920x1080, plus 3840x2160 for L and P1).

## Dependency graph

```
P1 (#436) ── M (#444) ── N (#447) ── O (#449)        views.ts chain; O also edits cockpit.ts
A (#437) ─┬─ I (#443) ── H (#446)                     Picker.tsx chain
          └──────────────┘
E (#445) ── H (#446)                                  H also waits for E (`DeviationSummary.tsx`)
C (#438) ─┬─ B (#441)
          ├─ D (#442) ── E (#445) ── F (#448) ─┬─ G (#450)
          └──────────────┘                     └─ R (#453)
D (#442) ── Q (#452) ─┬─ G (#450)                     checklist.ts chain
                      └─ R (#453)
K (#439), L (#440)                                     independent
```

## Waves

A wave is a set whose members may run in parallel: their dependencies have landed and they share no file region.

| Wave | Tasks | Shared files to watch |
|---|---|---|
| 1 | P1, A, C, K, L | A and L both edit `shell.css` (picker rules vs trainer grid); P1 and L both edit `layout.spec.ts` |
| 2 | B, D, I, M | B and D edit different regions of `ChecklistPane.tsx`; B and I both edit `shell/messages.ts` and may both touch `trainer/index.tsx` |
| 3 | E, H, N, Q | E and H edit different actions of `DeviationSummary.tsx` and both may edit `session.ts`; H lands after E |
| 4 | F, O | none |
| 5 | G, R | different regions of `ChecklistPane.tsx` and different CTSL procedure files; both edit `DeviationSummary.tsx` and `checklist/messages.ts` |

## Decisions (agent, overrulable)

- **P1 is no-gate.** The decisions-table row "Cockpit layout" requires one viewport and a dock under the panel, nothing about field positions; the M11 summary records today's arrangement as an agent decision the owner may overrule. Intake §3 states the relative arrangement (centre column low between the upper fields, console below it); the proportions are an assumption under the owner's ruling (intake question 19). The dock remains a required cell under the panel; the implementer picks its side of the centre column.
- **P1 lands before M, N and O.** All four change the CTSL cockpit's geometry, and M, N, O share `views.ts` (O also `cockpit.ts`); one at a time keeps each rubric pass meaningful.
- **Missing panel facts are folded into the existing issues.** P5b and P8b join #444 (they are on the panel view), P6 joins #447 (centre field), T3b joins #450 (memory items). Each acceptance list requires the assumption to be named in the PR and recorded in the intake.
- **Flows split into two issues.** #452 (contract, engine, validator, demo flow) and #453 (pane, Guided scan path, debrief, CTSL flows) split cleanly at the package boundary; #452 follows D on `checklist.ts`, and #453 follows F on `ChecklistPane.tsx`.
- **H9b moves into E.** The triage gated the "hold the annunciator switch at TEST" item on the intake, but that item belongs to the demo aircraft, our own fictional content with no intake; so it needs no external fact and is part of #445.
- **T2 is an option inside Practice.** The three modes stay as the decisions table lists them; only the §5 Practice row text changes.
- **Milestone name.** "M13 UX and panel realism", following the `M<n> <title>` convention of earlier milestones.

## Owner answers (2026-10-08)

- **T5 Flow vs checklist: add flows.** A normal procedure may open with a flow done from memory in any order, verified by the checklist that follows (AC 120-71B). The decisions-table "Step order" row, §4.7 and §5 step 4 are amended in this plan's PR, owner-approved 2026-10-08. Issues #452 and #453.
- **T11 Scoring or exam mode: declined.** It stays out of scope (spec §1, "Modes" row). Not filed.
- **Missing panel facts: use best knowledge.** Agents may use general aviation knowledge of the CT Supralight where the intake is silent, flag every such fact in the PR description, and record it in `docs/aircraft/ctsl-intake.md` as **assumed (unverified)**. Intake questions 19 to 23 stay open, marked answered by assumption pending owner verification.

## Excluded

- **J Explore discoverability (H8):** folded into #237 (hover info instead of the Operate toggle) as a comment, since its fix is that idea's decision. The Explore subtitle is part of #437.
- **Accessibility:** no new work (ADR 0002).

## Intake questions added

`docs/aircraft/ctsl-intake.md` §9, each with the value the trainer uses today and the issue that answers it by assumption, pending owner verification:

19. Field proportions and the console's start (P1, #436).
20. Compass type, card sense, size and mount (P5b, #444).
21. ELT remote switch legends and lamp colour (P6, #447).
22. Charge lamp legend and colour (P8b, #444).
23. Which emergency steps are memory items (T3b, #450).

## Related open issues

#360 (system fidelity and showing wrong actions) is the design home for D, E and H; #233 (engine fire cue) relates to H; #363 (summary hidden while another checklist is viewed) and #414 (tablet footer below the fold) sit next to E and C, and a PR that closes one says so.

## Review focus

1. P1: the arrangement matches intake §3's relative positions, the dock is under the panel, and every floor is backed by a green `floors.spec.ts` run.
2. Panel tasks: every panel fact is backed by intake text, or listed in the PR as assumed and recorded at its intake question.
3. Engine tasks: `walk-procedure` walks every procedure of both aircraft; stepped controls stay exempt from wrong-position.
4. No task changes a decisions-table row; flagged items reach the milestone summary.
5. History stays in the browser (G2); no request leaves it.
