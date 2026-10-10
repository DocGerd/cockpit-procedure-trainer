# Cockpit Procedure Trainer

Browser-based cockpit procedure trainer. Spec:
`docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`.
Milestone plans (where written): `docs/superpowers/plans/`; milestone
summaries: `docs/milestones/`. Codebase map: `docs/architecture.md`.

## Commands

- `pnpm dev` runs the web app
- `pnpm test` runs all unit tests (fails if none are found); `pnpm test:coverage`
  is what the `check` job runs (statement threshold in `vitest.config.ts`)
- `pnpm test:e2e` runs the Playwright browser tests (once:
  `pnpm exec playwright install chromium`); `E2E_PORT=<port>` when the default
  port is busy (parallel agents). Stop only processes you started; never
  `pkill` by name (it kills other agents' servers). Wait loops wait on a PID,
  never on `pgrep -f` of text in their own command line (it matches itself
  forever); verifier scripts live in the scratchpad, never in another agent's
  worktree. `pnpm test:e2e <spec>` filters (after `--` it runs every spec); a
  direct `playwright test` runs from `apps/web`
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`
- `pnpm test:perf` runs locally only (not in CI), for panel-art PRs; see
  `CONTRIBUTING.md` Checks

## How work is done

- Agents build this project. The owner steers and reviews at milestone
  boundaries, so do not wait for approval mid-milestone on anything the spec
  or the milestone plan settles.
- Branch prefixes, squash/backmerge and releases follow `CONTRIBUTING.md`
  (Flow, Releases). Review, merging and the release PR run through the skills
  `pr-selfreview`, `merge-train` and `milestone-release` in `.claude/skills/`;
  the `release-cycle` skill drives a whole milestone, in `/release-cycle` and
  in `/goal` sessions, and its Session end closes every such session.
- One issue, one branch, one PR with `Closes #<n>`. Each PR is reviewed by a
  separate agent before merge.
- A squash makes the PR body the commit message: close/fix/resolve before
  `#N` closes that issue or PR, so prose writes `Refs #N`.
- Every PR adds `changelog.d/<issue>.<category>.md`, or carries a body line
  `No changelog: <reason>` when it has no user-visible effect.
- Agents merge reviewed PRs into `develop` only, never into `main`. An agent
  opens the release PR `develop` to `main`; the owner merges it.
- While a release PR is open, its head is `develop`, so whatever lands there
  ships in that release: other sessions land nothing until the owner merges
  it, unless the release needs the change.
- Before a PR, run the `CONTRIBUTING.md` Checks chain (the required `check`
  job); a PR that changes what the app renders also gets a `ui-verifier` pass.
  A failed pass blocks landing until a re-run on the final head passes.
- App settings (language, Hide upcoming) persist in browser storage: browser
  checks set them explicitly. At tablet width the drawer covers the panel, so
  walk the panel at 1920 and then resize.
- A PR scored against a visual rubric stays a draft until a ui-verifier passes
  it; workflows and the merge train do not check scores. Brief scorers blind:
  no prior scores or "be strict" notes (they anchor).
- Subagents cannot spawn agents: the orchestrator runs the ui-verifier and
  review-toolkit passes that a reviewer agent asks for.
- The main checkout is pulled only at close-out, so it lags `develop`: give
  read-only checkers (`intake-checker` has no git) a detached worktree at the
  PR head or `origin/develop` and a saved diff.
- One agent owns a worktree at a time. A message to a finished subagent
  resumes it with that order, so wait for its hand-back before giving the
  worktree to another agent.
- Every agent works in its own git worktree; never switch branches or edit
  files in the main checkout. `.claude/hooks/main-checkout-guard.sh` refuses
  such edits (including `/revise-claude-md` and `.claude/settings.local.json`
  in a main-checkout session; `.remember/` is exempt); the owner overrides with
  `CPT_ALLOW_MAIN_EDIT=1`.
- Harness worktrees start on a `worktree-agent-*` branch: switch to the work
  branch from `origin/develop` first; cleanup deletes both branches.
- Agents wait on CI in the foreground (a bounded `gh pr checks` loop); a
  background monitor or an idle agent may never wake, so when a wait runs long
  the orchestrator reads `commits/<sha>/check-runs` itself.
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
  and the PR names any sacrificed quality. Accessibility ranks lowest: existing
  support stays, but briefs and reviews add no new screen-reader or
  keyboard-route work.
- Cross-package contract tests (device CSS, device READMEs) live in `tools/`,
  discover `packages/device-*` themselves, and are typechecked by
  `tsc -p tools`; packages never import from `tools/`. Package boundaries
  (`CONTRIBUTING.md`) are ESLint-enforced; a new package kind extends
  `tools/boundary.test.ts`.
- Adding an aircraft: a new `packages/aircraft-<id>`, one line in
  `apps/web/src/aircraft-registry.ts` and its workspace dependency in
  `apps/web/package.json`. Nothing else in `apps/web` changes.
- Adding an avionics device: a new `packages/device-<id>`, its entries in
  `deviceRegistry` and `deviceEntries` in `apps/web/src/device-registry.ts`
  (`deviceScreens` is derived), its `unitNames` row in
  `apps/web/src/devices/messages.ts`, its rows in `tools/device-entry.test.ts`,
  and its workspace dependency in `apps/web/package.json`; see
  `docs/adding-a-device.md`.
- Outside-view images are first-person views out of the cockpit from the
  pilot's seat, never the aircraft seen from outside.
- Colours, type and spacing come only from `apps/web/src/styles/tokens.css`.
- The brand styles the app frame, never the cockpit panel. Status colours do
  not appear on the panel.
- No handbook scans or manufacturer artwork in the repo.
- Every operable control shows a printed label on the panel (`placard`,
  artwork `lettering` or view `printed`), in the panel's own fixed wording; the
  contract test in `apps/web/src/panel/printed-labels.test.tsx` enforces it.
  A placard never names a trainer view or app UI.
- No inline `<style>`/`<script>`: the build ships a strict CSP
  (`apps/web/src/csp.ts`); every e2e spec fails on a violation via the
  `apps/web/e2e/fixtures.ts` auto fixture. Specs import `test`/`expect` from
  `./fixtures` (lint-enforced).
- Avionics devices have no view of their own: a device installs in a panel
  slot as a live mirror and opens in the cockpit's required `dock` cell, where
  its keys are operable; slots stay mirror-only unless `IN_SLOT_OPERATION` in
  `apps/web/src/panel/slot-mode.ts` is on (scaled slots miss the 44 px
  targets). Guided opens the target device in the dock and rings its key
  (`data-control`/`data-position` on Screen keys).
- Aircraft facts come from `docs/aircraft/<id>-intake.md` (paraphrased);
  `reference/` is local-only — never read it in implementation agents, never
  commit or quote it. `.claude/hooks/reference-guard.sh` (file tools) and
  `bash-reference-guard.sh` (Bash) enforce it; the owner overrides with
  `CPT_ALLOW_REFERENCE=1` for intake work.
- `.claude/hooks/block-main-merge.sh` refuses any Bash command containing the
  substring "merge" (also "emergency", `--no-merges`, jq `mergeCommit`,
  `merged_at`), except one plain `gh pr merge` of a `develop` PR or a plain
  `git merge`/`merge-base`; for `--no-merges` use
  `git log --max-parents=1 A..B`. It also refuses chained commands that
  contain it (a newline in a quoted body
  counts as chaining) and, in gh, curl and wget commands, any expansion in the
  subcommand, endpoint, GraphQL query or URL: write such text to a file
  (`--body-file`), spell endpoints literally, run
  `git pull --ff-only origin develop` on its own. A global force-push guard
  also refuses `--noEmit` and `+0`-like text in commands.
- Once the release-prep PR has folded `changelog.d`, a PR landing before the
  release edits the CHANGELOG.md section instead of adding a fragment.
- `gh pr merge --delete-branch` errors when a worktree holds the branch (the
  PR still lands); delete branches after removing the worktree.
- After landing a PR, check its `Closes` issue is closed; if not, PATCH
  `repos/<owner>/<repo>/issues/<n>` with `state=closed`, `state_reason=completed`.
- The OpenSSF Best Practices badge rests on
  `docs/openssf-best-practices-badge.md`, `SECURITY.md`, `GOVERNANCE.md` and
  `docs/security-assurance-case.md`: a PR that changes a workflow, security
  behaviour or process they describe updates them in the same PR.
- Every action in `release.yml` is pinned by full commit SHA (its output is
  attested).
- Local `gh` lacks `gh attestation`: verify a release with a current gh release
  binary unpacked in the scratchpad (`docs/verifying-a-release.md`).
- Review replies: POST `…/pulls/<n>/comments/<id>/replies` with
  `--field body=@file` (`--raw-field` posts the literal `@file`); resolve
  threads via GraphQL. `gh pr edit` fails on the Projects-classic error: PATCH
  `repos/<owner>/<repo>/pulls/<n>` with `--field body=@file` instead; clear a milestone by PATCHing
  `…/issues/<n>` with `--input` on a file holding `{"milestone": null}`.
- Agents share the session scratchpad: prefix temp files with the issue number.
- Agents that read the design canvas or post review threads need claude.ai
  artifact access and gh write access; read-only agent types cannot.
- `doc-writer` cannot run git or gh: pair it with an agent that commits and
  opens the PR.
