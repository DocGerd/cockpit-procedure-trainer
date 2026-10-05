# M0 Foundation (v0.1.0)

## What shipped

- Public repository with licence (MIT for code), README, `CONTRIBUTING.md`, project `CLAUDE.md`, issue forms and a pull request template.
- pnpm workspace (`core`, `panel-kit`, `aircraft-demo`, `apps/web`) with strict TypeScript, Prettier, Vitest and ESLint package-boundary rules. `tools/boundary.test.ts` proves the rules fire.
- CI: one required job, `check` (lint, format, typecheck, test, build), plus weekly Dependabot updates.
- Gitflow: `develop` is the default branch, `main` holds releases. Rulesets protect both.
- Two sites on one GitHub Pages deployment:
  - Prod: https://docgerd.github.io/cockpit-procedure-trainer/ (updates when this release PR is merged).
  - UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ (built from `develop`, UAT badge, `noindex`).
- Release automation: merging into `main` runs the `Release` workflow, which tags `v0.1.0` and publishes the GitHub Release from the top `CHANGELOG.md` section.
- Changelog fragments in `changelog.d/`, folded into `CHANGELOG.md` at each release.
- ADR-0001 (architecture and aircraft contract) and the content policy.
- Claude Code project configuration: plugins, a formatting hook, a UI verifier agent, the `/release-cycle` command, the `pr-selfreview`, `merge-train` and `milestone-release` skills, and a hook that guards merges into `main`.

## Decisions made

- Gitflow was added mid-milestone at the owner's request. `develop` is the default branch, because GitHub closes issues only on merges into the default branch.
- Feature PRs squash into `develop`. Only `chore/backmerge` uses a merge commit, and `main` accepts merge commits only, so the two branches keep a shared history.
- Agents never merge into `main`. The owner merges the release PR, which is the only manual step, because the `Release` workflow does the rest.
- Milestone Mn ships as v0.(n+1).0, so M0 is v0.1.0.
- Changelog fragments avoid conflicts between parallel PRs.
- UAT and prod share one Pages site: `main` at the root, `develop` under `/uat/`. A failing UAT build never blocks the prod deploy.
- Rulesets on `main` and `develop` require a PR, the `check` job and resolved threads, and forbid deletion and force pushes. They require no approvals, because a single-owner account cannot approve its own PRs.
- Strict up-to-date checks are off, because the release PR is never up to date with `main`.
- The main-merge hook is an accident tripwire, not a security boundary: agents use the owner's account, so the server cannot tell them apart. It allows one literal merge shape into `develop` and denies anything else merge-like, and it accepts false denials on text that merely mentions the word.
- The bootstrap PRs before the gitflow switch (workspace, CI, plan amendment) went into `main` directly.
- Boundary lint also blocks dynamic `import()` and `import.meta.glob` of aircraft or device packages outside the registries. Computed specifiers cannot be checked statically.
- Spec and plan files are excluded from Prettier, because reformatting renumbered the spec's ticket lists.
- TypeScript stays below 6.1 until typescript-eslint supports newer versions; Dependabot ignores those versions and `@types/node` majors above the Node engine.
- The content policy publishes only the club's own photos, under a per-package licence note. MIT covers code only.
- ADR-0001 records "TypeScript source, no per-package build" as decision 6, which the spec does not fix.
- Each commit's co-author trailer names the model that wrote it.

## Open questions for the owner

1. Which licence should the club's panel photos carry? Spec section 7 leaves this to a per-package licence note.
2. Please confirm once that a direct push to `develop` or `main` is rejected. The ruleset read-back shows PR-only, but no live rejection test was run.
3. In a fresh Claude Code session, run `/plugin` once to confirm the project's plugin list loads.
4. Consider a separate bot account or GitHub App for agents, so rulesets could stop agent merges into `main` server-side instead of relying on the tripwire.
5. M5 (offline): should the service worker for `/uat/` be scoped separately from prod at the root?
6. Dependabot PRs #65 to #68 (deploy action bumps) are held until after v0.1.0. `upload-artifact` 5 to 7 must pair with a matching `download-artifact`.
7. M6 still needs panel photos and the list of installed avionics units.
8. M1 Design starts from the owner's refined design canvas and gets its own plan.

## How to verify

- Prod and UAT: open the two URLs above.
- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- An empty test run fails: `pnpm exec vitest run --dir docs` exits 1.
- Rulesets: `gh api repos/DocGerd/cockpit-procedure-trainer/rulesets`
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.1.0 --jq .tag_name` prints `v0.1.0`.

## Carried findings

The whole-milestone review found no critical issues. Its two important findings (a skill command the guard denied, and release notes missing the #1 to #3 deliverables) and the cheap minors were fixed in #72. Nineteen minor findings were triaged as safe to carry and are tracked in #71:

- `readdirSync('packages')` in the boundary test depends on the working directory; tests always run from the root.
- `typescript` is `^6.0.3` rather than `~`; the lockfile pins it and Dependabot ignores 6.1 and above.
- The web tsconfig `types: node` leaks Node globals; revisit with real UI.
- The core asset-extension rule misses `.jpeg`, audio, `?raw` and `?url`; extend it with the engine work.
- The relative-path boundary rule can false-positive on folder names; it fails loud.
- Boundary rules cover only `.ts` and `.tsx`; there are no `.js` sources.
- `tsc` skips `tools/` and config files; Vitest and ESLint still execute them.
- `cancel-in-progress` cancels push runs on `main` and `develop`; the newer run still reports `check`.
- CI has no `timeout-minutes`; cost only.
- The Dependabot npm group batches majors; ignores cover the known breakers.
- The `Release` workflow fails on `main` pushes before a released section exists; the first push is the release itself.
- A failing UAT build drops the previous `/uat/` content; by design, with a warning annotation.
- `.uat-badge` is unstyled until M1 adds `tokens.css`.
- `role="status"` on a static badge is an accessibility nit for M1.
- An empty `CLAUDE_PROJECT_DIR` makes the format hook a no-op; the merge guard then fails closed.
- The `/plugin` check in a fresh session is pending (open question 3).
- A JSON `\u0000` inside a merge command is allowed; Node spawn rejects NUL, so it cannot execute.
- A missing `jq` denies only merge-like commands; `jq` is a documented prerequisite.
- The guard hook's expansion check covers only the first two `gh` words, the `gh api` endpoint and the first URL-like token; an expansion in a later positional or a second URL is unchecked. Exploiting it needs the merge word hidden in a variable, which is deliberate obfuscation outside the tripwire's scope. Hardening: allow expansions only in values of known non-routing flags and check every positional and URL.
