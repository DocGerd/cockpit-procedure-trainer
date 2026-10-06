# Cockpit Procedure Trainer

Browser-based cockpit procedure trainer. Spec:
`docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`.
One implementation plan per milestone under `docs/superpowers/plans/`.

## Commands

- `pnpm dev` runs the web app
- `pnpm test` runs all unit tests (fails if none are found)
- `pnpm test:e2e` runs the Playwright browser tests (once:
  `pnpm exec playwright install chromium`)
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`

## How work is done

- Agents build this project. The owner steers and reviews at milestone
  boundaries, so do not wait for approval mid-milestone on anything the spec
  or the milestone plan settles.
- One issue, one branch, one PR with `Closes #<n>`. Each PR is reviewed by a
  separate agent before merge.
- Gitflow: the base branch is `develop`. Agents merge reviewed PRs into
  `develop`. From the gitflow switch (Task 4A) on, agents never merge into
  `main`, from any source.
- Feature PRs are squash-merged into `develop`; only a `chore/backmerge` PR
  (`main` into `develop`) uses a merge commit.
- The release PR `develop` to `main` is opened by an agent and merged by the
  owner. A workflow then tags and publishes the release.
- Every PR adds a fragment `changelog.d/<issue>.<category>.md`; Dependabot PRs
  are exempt (no fragment, no `Closes`). A PR with no user-visible effect may
  skip the fragment with a body line `No changelog: <reason>`.
- Branch prefixes: `feat/ fix/ chore/ docs/ ci/ release/`.
- Every agent works in its own git worktree; never switch branches or edit
  files in the main checkout.
- Rebase only before a branch's first push (force-push is blocked); after
  that the merge train updates the branch from `develop`.
- A decision the spec does not settle: make it, state it and its reason in the
  PR description, and carry it into the milestone summary.
- A milestone ends with the release PR, whose summary is the owner's review:
  what shipped, decisions made, open questions, how to verify.
- Stop and ask only for: publishing content of unclear copyright, anything
  that changes the spec's decisions table, or destructive repo operations.
- After the owner merges a release PR, let the `main` Deploy run's
  `prod-environment` job finish before any push to `develop` (backmerge):
  Pages deploys cancel in-progress runs.

## Rules

- Quality trade-offs follow `docs/adr/0002-quality-priorities.md`: gates
  (legal, security/privacy) are never traded; otherwise the higher rank wins
  and the PR names any sacrificed quality.
- Package boundaries are in `CONTRIBUTING.md` and enforced by ESLint;
  `tools/boundary.test.ts` proves the rules fire. Extend that test when adding
  a package kind.
- Adding an aircraft: a new `packages/aircraft-<id>`, one line in
  `apps/web/src/aircraft-registry.ts` and its workspace dependency in
  `apps/web/package.json`. Nothing else in `apps/web` changes.
- Outside-view images are first-person views out of the cockpit from the
  pilot's seat, never the aircraft seen from outside.
- Colours, type and spacing come only from `apps/web/src/styles/tokens.css`.
- The brand styles the app frame, never the cockpit panel. Status colours do
  not appear on the panel.
- No handbook scans or manufacturer artwork in the repo.
- Every operable control shows a printed label on the panel (`placard`,
  artwork `lettering` or view `printed`), in the panel's own fixed wording; the
  contract test in `apps/web/src/panel/printed-labels.test.tsx` enforces it.
- Avionics devices get their own view (like `radios`/`gps`); a device in a
  scaled panel slot misses the 44 px touch targets.
- Aircraft facts come from `docs/aircraft/<id>-intake.md` (paraphrased);
  `reference/` is local-only — never read it in implementation agents, never
  commit or quote it.
- `.claude/hooks/block-main-merge.sh` refuses any Bash command containing the
  substring "merge" (also "emergency", jq `mergeCommit`, `merged_at`), chained
  commands that contain it, and `$` in gh endpoints: write such text with
  Write/Edit, spell endpoints literally, run `git pull --ff-only origin
develop` on its own. A global force-push guard also refuses `--noEmit` and
  `+0`-like text in commands.
- Agents that read the design canvas or post review threads need claude.ai
  artifact access and gh write access; read-only agent types cannot.
- `doc-writer` cannot run git or gh: pair it with an agent that commits and
  opens the PR.
