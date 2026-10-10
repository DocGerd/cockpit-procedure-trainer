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
4. Report to the owner in one block: released version and prod state, what
   was cleaned up or skipped, and the unmilestoned backlog for the next
   triage.
5. Run Session end in [SKILL.md](SKILL.md).
