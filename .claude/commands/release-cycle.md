---
description: Run one milestone through the release cycle (triaging the backlog into a proposed milestone when none is open) - implement every open issue as a PR into develop, review, fix, merge, then cut the release PR for the owner.
argument-hint: '[milestone number/title | steering text, e.g. "focus on perf debt" - empty: next open milestone, else backlog triage]'
---

Input: $ARGUMENTS. It is a milestone number or title, free-text steering
(e.g. "only aircraft content"), or empty.

- Milestone: verify it exists and is open.
- Empty: pick the lowest-numbered open milestone that has open issues without
  the `blocked` label, and name it back before proceeding.
- No such milestone, or steering text: run the Triage phase first, then
  Phase 0 with the milestone it creates.

You are the orchestrator. Read `CLAUDE.md` first; it is binding. Plan the whole
session before executing it. The main session holds decisions and verdicts;
agents do the reading and the writing.

Skills used here: `pr-selfreview` (review, threads, fixes), `merge-train`
(merge into `develop`), `milestone-release` (the release PR).

## Triage phase - no milestone to run

Delegate it; the main session keeps only the proposal. Create and change
nothing before the owner approves.

1. One agent sweeps every open issue without a milestone
   (`gh api "repos/DocGerd/cockpit-procedure-trainer/issues?state=open&milestone=none&per_page=100"`,
   paginated; drop pull requests), reading body, labels and recent comments.
   It writes its table to the scratchpad and returns a summary.
2. Classify each issue: ready; needs owner decision (label `question`, a
   change to the spec's decisions table, unclear copyright); blocked; spike or
   idea needing scoping; stale or done (propose closing with the reason);
   duplicate (name the original).
3. Rank the ready issues: `docs/adr/0002-quality-priorities.md` order (gates
   first, never traded), then dependencies, then the steering text if given.
4. Propose ONE coherent milestone: title `M<n> <Theme>` with n one above the
   highest existing milestone; a scope sized to what one session's waves can
   land (a guideline, not a quota); each issue with a one-line reason; deferred
   issues with the reason; owner questions that block anything; a draft wave
   plan of file-disjoint work.
5. Present it as one scannable block and ask once with AskUserQuestion:
   approve, adjust, or an alternative theme. This is the owner's scope choice
   and the one approval stop.
6. On approval: create the milestone and assign the issues through the REST
   API, apply the approved closes and labels (never close unapproved), then
   continue with Phase 0. Without approval, stop with nothing changed.

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
