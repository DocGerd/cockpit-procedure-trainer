---
description: Run one milestone through the release cycle - implement every open issue as a PR into develop, review, fix, merge, then cut the release PR for the owner.
argument-hint: '[milestone title, e.g. M2 Core engine - discovered if omitted]'
---

Milestone: $ARGUMENTS. If empty, pick the lowest-numbered open milestone that
has open issues without the `blocked` label, and name it back before
proceeding. If set, verify it exists and is open.

You are the orchestrator. Read `CLAUDE.md` first; it is binding. Plan the whole
session before executing it. The main session holds decisions and verdicts;
agents do the reading and the writing.

Skills used here: `pr-selfreview` (review, threads, fixes), `merge-train`
(merge into `develop`), `milestone-release` (the release PR).

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
