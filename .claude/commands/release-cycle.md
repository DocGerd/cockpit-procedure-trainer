---
description: Run one milestone through the release cycle (triaging the backlog into a proposed milestone when none is open) - implement every open issue as a PR into develop, review, fix, merge, cut the release PR for the owner, then close out after the owner's merge.
argument-hint: '[milestone number/title | steering text, e.g. "focus on perf debt" - empty: next open milestone, else backlog triage]'
---

Input: $ARGUMENTS. It is a milestone number or title, free-text steering
(e.g. "only aircraft content"), or empty.

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

Delegate it; the main session keeps only the proposal. Create and change
nothing before the owner approves.

1. One agent sweeps every open issue without a milestone
   (`gh api --paginate "repos/DocGerd/cockpit-procedure-trainer/issues?state=open&milestone=none&per_page=100"`;
   drop pull requests), reading body, labels, recent comments and linked open
   PRs. It writes its table to the scratchpad and returns a summary.
2. Classify each issue: ready; needs owner decision (label `question`, a
   change to the spec's decisions table, unclear copyright); blocked (label
   or open dependency); spike or idea needing scoping; stale or done (verify
   against `origin/develop` and open PRs; propose closing with the reason);
   duplicate (name the original).
3. Rank the ready issues: `docs/adr/0002-quality-priorities.md` order (gates
   first, never traded), then dependencies, then the steering text if given.
   No ready issue: stop after presenting the table; create nothing and do not
   go to Phase 4.
4. Propose ONE coherent milestone: title `M<n> <Theme>` with n one above the
   highest milestone, open or closed; each issue with a one-line reason;
   deferred issues with the reason (they stay unchanged); owner questions that
   block anything.
5. Present it as one scannable block and ask once with AskUserQuestion:
   approve, adjust, or an alternative theme. This is the owner's scope choice
   and the one approval stop.
6. On approval, one unchained REST call each, bodies from files: POST
   `milestones`; PATCH `issues/<n>` with the milestone; PATCH `issues/<n>`
   with `state=closed` and `state_reason` `completed` or `not_planned` (only
   approved closes); label changes. On a partial failure stop and report what
   was applied. Then continue with Phase 0. Without approval, stop with
   nothing changed.

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
Then wait for the owner to report the merge and continue with Phase 5.

## Phase 5 - Close out

Runs once the owner reports the release PR merged, in this session or the
next. Delegate each step; the main session keeps only verdicts.

1. Release: wait in the foreground until the `prod-environment` job of the
   Deploy workflow run on `main` finishes; push nothing to `develop` before
   that. Then run step 7 of the `milestone-release` skill (tag, Release,
   milestone, and the `chore/sync-main-to-develop` PR only if needed), verify
   the release per `docs/verifying-a-release.md`, and confirm prod serves the
   release commit: the deployed site's `version.json` `commit` equals the tag's
   commit.
2. Sync: `git fetch --prune origin`. If the main checkout is on `develop` and
   `git status --short` prints nothing, run `git pull --ff-only origin develop`
   on its own (the one allowed exception to the no-edit rule for the main
   checkout); otherwise report why and change nothing.
3. Housekeeping: remove this cycle's agent worktrees with
   `git worktree remove`, never forced (list a dirty one and skip it); then
   `git worktree prune`. Delete only branches whose PR landed: locally with
   `git branch -D` (squash-landed branches are not seen as integrated),
   remotely with
   `gh api --method DELETE repos/<owner>/<repo>/git/refs/heads/<branch>` if it
   still exists. Keep the branches of PRs closed without landing and say so.
   Stop every background task, monitor and dev server this session started, by
   ID or PID. Leave other sessions' worktrees and branches alone.
4. CLAUDE.md: if the cycle taught something durable that `CLAUDE.md` lacks or
   gets wrong, the main session runs `/revise-claude-md` itself, never a
   subagent (it reflects on this session's transcript). The main-checkout
   guard refuses that edit there, so first enter a worktree on
   `chore/claude-md-<slug>` from `origin/develop`. The command has no Bash, so
   verify each empirical claim before invoking it, and have a delegated agent
   commit and open the PR afterwards. Approved edits ship like any change: an
   issue, a PR reviewed with `pr-selfreview`, the `merge-train`. Nothing durable: say so and open no PR.
5. Report to the owner in one block: released version and prod state, what
   was cleaned up or skipped, the CLAUDE.md PR or "none", and the
   unmilestoned backlog for the next triage.
