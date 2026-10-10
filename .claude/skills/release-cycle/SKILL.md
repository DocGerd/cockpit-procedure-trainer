---
name: release-cycle
description: Run one milestone through the release cycle (triaging the backlog when none is open), from implementation and review to the release PR, close-out and session end. Use for /release-cycle and for any /goal session that builds, finishes or releases a milestone.
argument-hint: '[milestone number or title, or steering text]'
---

Input: $ARGUMENTS. It is a milestone number or title, free-text steering
(e.g. "only aircraft content"), or empty. In a `/goal` session the goal text
is the steering: it names the milestone and may add issues, order or limits
(a time box, steps that must run in parallel); the goal governs where it is
more specific than a phase below.

- A token matching an existing milestone number or title is a milestone;
  anything else is steering text.
- Milestone: it must exist and be open, else stop and say so.
- Empty: pick the lowest-numbered open milestone that has open issues without
  the `blocked` label, and name it back before proceeding.
- Steering text with such a milestone open: name the conflict and ask which
  governs.
- No such milestone, or steering text it governs: run the Triage phase, then
  Phase 0. An open milestone that is empty or all blocked is reused: triage
  fills it instead of creating a new one.

You are the orchestrator. Read `CLAUDE.md` first; it is binding. Plan the whole
session before executing it. The main session holds decisions and verdicts;
agents do the reading and the writing.

Skills used here: `pr-selfreview` (review, threads, fixes), `merge-train`
(merge into `develop`), `milestone-release` (the release PR).

## Triage phase - no milestone to run

Read [triage.md](triage.md) and follow it, then continue with Phase 0.

## Phase 0 - State

`git fetch origin`. List the milestone's open issues through
`gh api "repos/DocGerd/cockpit-procedure-trainer/issues?milestone=<n>&state=open"`. Skip issues
labelled `blocked`. Confirm `develop` is green: the `check` run of its tip is
`success`. If the list is empty, go to Phase 4.

## Phase 1 - Plan

Group the issues into waves of file-disjoint work; issues that touch the same
files run in separate waves. State the number of agents per wave before
starting. Stop and ask only for the conditions `CLAUDE.md` lists.

## Phase 2 - Implement

One implementer agent per issue, each in its own worktree created from
`origin/develop`. Branch prefix by label: `feat/` for `type:feature`, `fix/`
for `type:bug`, `docs/` for `type:docs`, `chore/` for `type:chore`, `ci/` for
workflow changes. Each implementer:

1. Works test-first and runs the project checks before pushing.
2. Adds `changelog.d/<issue>.<category>.md`; every PR carries one.
3. Opens a PR with base `develop`, body starting `Closes #<issue>`, a
   `## Decisions` section for anything the spec and plan do not settle, and the
   attribution line `CLAUDE.md` requires.
4. Writes its report to a scratch location outside the repository, because a
   worktree agent cannot write elsewhere, and returns the PR number, the head
   SHA and a summary of at most 25 lines.

## Phase 3 - Review, fix, merge

A reviewer agent that is not the implementer runs the `pr-selfreview` skill on
each PR. Reviewers must be an agent type that can run `gh` and post comments;
a read-only agent type cannot post review threads. The implementer fixes the
findings and the reviewer's threads are resolved. At most two fix waves per
PR; leftovers become follow-up issues.
Then the `merge-train` skill merges the PRs into `develop`, one at a time.
Never merge into `main`; a tripwire hook denies the usual forms, but the rule
is yours to keep.

## Phase 4 - Cut

When the milestone has no open issues, run the `milestone-release` skill. It
ends with the release PR `develop` to `main` open. You never merge it. Report
to the owner: the release PR URL, decisions made, open questions, how to
verify. The owner merges; a workflow tags and publishes the release.
Then wait for the owner to report the merge and continue with Phase 5; if the
session ends first, run Session end.

## Phase 5 - Close out

Once the owner reports the release PR merged, in this session or the next, read [close-out.md](close-out.md) and follow it.

## Session end

Runs once whenever the session ends: after Phase 4 while the owner holds the
release PR, after Phase 5, or when the time box runs out.

1. Follow-ups: every open decision or question in the owner summary that
   needs work gets an issue without milestone (one per topic, grouped where
   small), unless one exists. Questions only the owner can check get none.
2. CLAUDE.md: if the session taught something durable that `CLAUDE.md` lacks
   or gets wrong, the main session runs `/revise-claude-md` itself, never a
   subagent (it reflects on this session's transcript). The main-checkout
   guard refuses that edit there, so first create a worktree on
   `chore/claude-md-<slug>` from `origin/develop`. The command has no Bash, so
   verify each empirical claim before invoking it, and have a delegated agent
   commit and open the PR afterwards. Approved edits ship like any change: an
   issue, a PR reviewed with `pr-selfreview`, the `merge-train`. Nothing
   durable: say so and open no PR. Once per session.
3. Processes: stop every dev server, poll loop and background task this
   session's agents started, by PID; agents leave servers behind and later
   misread them as another session's, so match by the ports you assigned.
4. Report to the owner in one block: the follow-up issues, the CLAUDE.md PR
   or "none", and the processes stopped.
5. Run `remember:remember` last.
