# Contributing

## Flow

1. Pick or open an issue.
2. Branch from `develop`: `feat/<issue>-<slug>`, `fix/…`, `chore/…`, `docs/…`, `ci/…` or `release/…`.
3. Add a changelog fragment `changelog.d/<issue>.<category>.md` (categories:
   `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`). Without an
   issue, name it `+<slug>.<category>.md`. Dependabot pull requests are exempt:
   they cannot add a fragment, and a pushed commit stops Dependabot rebasing its
   branch. A pull request with no user-visible effect (e.g. internal docs,
   CI-only, tests-only, agent config, plans or specs that do not change product
   behaviour) may skip the fragment if its description has a line
   `No changelog: <reason>`.
4. Open a pull request against `develop` whose description contains `Closes #<issue>` (not
   required for Dependabot pull requests, which have no issue).
5. `develop` and `main` accept changes only through pull requests with a green
   `check` job and all review threads resolved. `develop` takes squash merges, except a `chore/backmerge`
   PR (`main` into `develop`), which uses a merge commit.

## Releases

`develop` is the default branch and feeds the UAT site under `/uat/`. `main`
holds released state and feeds the production site.

1. A `release/vX.Y.Z` branch folds the fragments into `CHANGELOG.md` and merges
   into `develop`.
2. A release pull request `develop` to `main` is opened and merged with a merge
   commit by the owner. Since the gitflow switch, no agent merges into `main`.
   A Claude Code hook (`.claude/hooks/block-main-merge.sh`) denies merge-like
   commands except a plain `gh pr merge` of a PR based on `develop` and a plain
   `git merge` or `git merge-base`, which touch no pull request. It is an
   accident tripwire, not a security boundary: the base can change between its
   check and the merge, and anything with the owner's token can still merge
   into `main`. The `protect-main` ruleset blocks direct pushes to `main`, not
   PR merges by the owner account. Deliberate obfuscation (shell expansion
   tricks, clients other than `gh`, `curl` and `wget` such as python) is out of
   scope for the tripwire.
3. A workflow reads the top released section of `CHANGELOG.md` and creates tag
   `vX.Y.Z` and the GitHub Release.

Versions are semantic and below 1.0: milestone Mn is released as v0.(n+1).0.

## Machine prerequisites

Node 24, pnpm, `gh` and `jq`. The Claude Code formatting hook uses `jq`. The
TypeScript language server plugin needs
`npm install --global typescript-language-server typescript`.

## Checks

    pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e

`pnpm test:e2e` builds the app and drives it in Chromium; install the browser once with
`pnpm exec playwright install chromium`. The required `check` job runs all of these.

UI changes also need a pass in a real browser at tablet and desktop width.

## Package boundaries

- `packages/core`: contract and engines. No UI, no assets, no other workspace packages.
- `packages/panel-kit`: controls and gauges. Depends on `core` only.
- `packages/aircraft-*`: one aircraft each. Depends on `core` only.
- `packages/device-*`: one avionics unit each. Of the workspace packages, any file may
  import only `core` and `panel-kit`. `src/logic/` imports `core` only, with no UI or
  assets. A device never reaches another package, another device included, by relative
  path.
- `apps/web`: the app. Imports aircraft only in `src/aircraft-registry.ts`
  and devices only in `src/device-registry.ts`.

ESLint enforces these. A package under `packages/` of any other kind fails
`pnpm lint` until `eslint.config.js` gives its kind a boundary block and the kind is listed in
`knownPackageKinds`; extend `tools/boundary.test.ts` in the same change.

Colours, type and spacing come only from `apps/web/src/styles/tokens.css`. ESLint and Stylelint enforce
this in `apps/web/src` and in the package sources and stylesheets (`pnpm lint` runs both);
`tools/design-literals.test.ts` proves it.

## Aircraft content

Write checklists in your own words and use your own photos. Do not commit
scanned handbook pages or manufacturer artwork.
