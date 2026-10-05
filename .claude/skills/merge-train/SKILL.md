---
name: merge-train
description: Merge reviewed pull requests into develop, one at a time, after verifying checks, threads and head SHA. Never merges into main.
---

# Merge into `develop`

Argument: one or more PR numbers, merged in the order given. Called by the
`/release-cycle` command after `pr-selfreview` has resolved every thread.

For each PR `N`:

1. **Base.** `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N --jq .base.ref` must print
   `develop`. Anything else: stop. Merging into `main` is never done from here,
   by any source; the release PR `develop` to `main` is the owner's to merge.
   A PreToolUse hook (`.claude/hooks/block-main-merge.sh`) is an accident
   tripwire, not a security boundary: it allows only the single plain
   `gh pr merge` shape in step 5 for a PR whose base is `develop`, and denies
   every other command that looks like a merge, including text that merely
   mentions the word. Its limits are that the base can change between its
   lookup and the merge, and that anything holding the owner's token can still
   merge a PR into `main`. The `protect-main` ruleset blocks direct pushes to
   `main` but not PR merges by the owner account, so this skill's rule above is
   what keeps agents out of `main`.
2. **Head SHA.** Read `head.sha` and `head.ref` from the same PR call. The tip
   of the branch,
   `gh api repos/DocGerd/cockpit-procedure-trainer/git/ref/heads/<head.ref> --jq .object.sha`,
   must equal `head.sha`. A mismatch means GitHub missed a push event and the
   checks describe an older commit: stop and report.
3. **Checks.** The `check` job of that SHA must have succeeded:
   `gh api repos/DocGerd/cockpit-procedure-trainer/commits/SHA/check-runs --jq '[.check_runs[] | select(.name == "check") | .conclusion]'`
   must print `["success"]`. `gh pr checks` has no `--json`, so poll this call
   while the run is pending, with sleeps of 30 seconds or less and a bounded
   number of tries; foreground-test the poll command once before arming a
   monitor. Any other conclusion: stop.
4. **Threads.** Every review thread is resolved (enumerate query in
   `pr-selfreview`). One unresolved thread: stop.
5. **Merge.** `gh pr merge N --squash --delete-branch --match-head-commit SHA`.
   Run it as a single plain command, with no `--auto`, no quotes, no shell
   expansion and nothing chained, and put the word merge in no other
   command (use `--body-file` for PR text). In other `gh`, `curl` and `wget`
   commands, an expansion (`$`, backtick, `%`) is denied only in the
   subcommand words, the `gh api` endpoint, a GraphQL query or the URL; spell
   those as literals. The deny message names the trigger. The one
   exception is a backmerge PR (branch `chore/backmerge`, `main` into
   `develop`): merge it with `--merge` instead of `--squash`, so `main` becomes
   an ancestor of `develop`.
6. **Confirm.** `gh pr view N --json state --jq .state` prints `MERGED`, and
   each `Closes #n` issue reads `closed`. If the merge call errored, read that
   state before any retry; never retry blind.
7. **Next PR.** If the next PR is behind `develop`, run
   `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/M/update-branch --method PUT`,
   wait for its checks again, and restart at step 2 for it.
