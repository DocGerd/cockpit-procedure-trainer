# Bootstrap and M0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public GitHub repo with the full backlog (50 issues in 8 milestones) and a working, tested, deployed workspace skeleton that later milestones build on.

**Architecture:** pnpm workspace with `packages/core`, `packages/panel-kit`, `packages/aircraft-demo` and `apps/web`. Packages are consumed as TypeScript source, so there is no per-package build. ESLint `no-restricted-imports` rules enforce the package boundaries and a test proves they fire.

**Tech Stack:** Node 24, pnpm, TypeScript (strict), React, Vite, Vitest, ESLint (flat config) with typescript-eslint, Prettier, GitHub Actions, GitHub Pages, gitflow with a UAT and a production site.

**Spec:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`

This is the first of one plan per milestone. M1 to M7 each get their own plan when they start.

## Global Constraints

- Repo: `DocGerd/cockpit-procedure-trainer`, public.
- Licence: MIT, holder line exactly `Copyright (c) 2026 Patrick Kuhn`. No company suffix, no ® or ™ anywhere.
- Package scope `@cpt/`: `@cpt/core`, `@cpt/panel-kit`, `@cpt/aircraft-demo`, `@cpt/web`.
- Boundaries (spec §3): `core` imports no UI, assets or workspace packages; aircraft packages import only `@cpt/core`; `panel-kit` imports no aircraft, device or web code; `apps/web` imports aircraft and devices only in `src/aircraft-registry.ts` and `src/device-registry.ts`.
- After Task 1, every change reaches the base branch through a PR whose body has `Closes #<n>`. The base is `main` until Task 4A creates `develop`, and `develop` from then on. No force-push, no `--no-verify`.
- From the gitflow switch (Task 4A) on, agents never merge into `main`, from any source; the bootstrap PRs before Task 4A merge into `main`. The release PR `develop` to `main` is opened by an agent and merged by the owner. Agents merge reviewed PRs into `develop` only.
- From Task 4A every PR adds a changelog fragment `changelog.d/<issue>.<category>.md` (`+<slug>.<category>.md` when there is no issue). Branch prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `ci/`, `release/`.
- Every PR is self-reviewed with `pr-review-toolkit:review-pr`: one inline thread per finding, fix, resolve every thread.
- Comments in code only where the code cannot say it. No dates, durations or measured figures in comments or docs unless they are requirements.
- Personal local tooling is never added to committed config, CLAUDE.md or CI; ignore its folders in `.git/info/exclude`.
- Shell scripts that call `gh`: `timeout -k 5 60 gh … </dev/null`; loop with `mapfile` + `for`, never `while read` around a spawned command.
- Commit identity: `user.email` is `13460098+DocGerd@users.noreply.github.com` (set in the repo's local git config). No other address may appear as author or committer. The owner's GitHub account keeps its email private, so merges made by GitHub also use the noreply address; merge reviewed PRs into `develop` with `gh pr merge --squash --delete-branch`.
- Nothing committed, and no issue or PR text, contains local absolute paths, machine or user names, or links to private artifacts.
- Commit trailer: the `Co-Authored-By:` line named by the running harness's attribution reminder. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Execution Model

The project is built entirely by agents. The owner steers and reviews at
milestone boundaries, not per task.

- The main session orchestrates: it dispatches each task to a subagent, has a
  separate reviewer check it, and keeps only decisions and verdicts.
- Decisions the spec settles are not escalated. Decisions it does not settle
  are made, recorded in the PR description, and listed in the milestone summary.
- A milestone ends with the release PR `develop` to `main`, opened by an agent and merged by the owner; a workflow then tags and publishes the release (Task 8).

| Task | Worker | Reviewer |
|---|---|---|
| 1 Baseline documents and repo | sonnet, medium | sonnet, high |
| 2 Labels, milestones, issues | sonnet, high | sonnet, high |
| 3 Workspace and boundary rules | sonnet, high | opus, xhigh (boundaries are architecture) |
| 4 CI | sonnet, high | sonnet, high |
| 4A Gitflow and UAT/prod environments | sonnet, high | opus, xhigh (rulesets and deploy are safety-critical) |
| 5 Pages | superseded by 4A | none |
| 6 Templates | sonnet, medium | sonnet, high |
| 7 ADR and content policy | sonnet, medium | opus, xhigh |
| 7A Claude Code project setup | sonnet, medium | sonnet, high |
| 7B Release-cycle skills | sonnet, high | opus, xhigh (contains the main-merge guard) |
| 8 Milestone release | sonnet, medium | opus, xhigh (whole-milestone review) |

Sequence: Task 3 (base `main`), then Task 4 (CI), then Task 4A (creates
`develop`, makes it the default branch, adds rulesets and the deploy and release
workflows), then Tasks 6, 7 and 7A in parallel in separate worktrees off
`origin/develop`, then Task 7B after Task 7A is merged (it edits 7A's
`.claude/settings.json`), then Task 8.
Rulesets need the `check` job from Task 4, and `Closes #<n>` only fires on the
default branch, which is why Task 4A comes before the rest.

## Review Focus

1. **Bootstrap script run twice** must not create duplicate labels, milestones or issues. Pinned in Task 2, Step 4.
2. **Pages base path**: assets requested from `/assets/…` instead of `/cockpit-procedure-trainer/assets/…` (or `…/uat/assets/…`) give a blank page. Pinned in Task 4A, Steps 6 and 9, on both the production and the UAT build.
3. **Test run that finds no tests** must fail, or CI is green while testing nothing. Pinned in Task 3, Step 9.
4. **Boundary rules that silently do not match** (wrong glob) give false safety. Pinned in Task 3, Step 3 (`tools/boundary.test.ts`).
5. **Manifest entry naming a label or milestone that does not exist** must stop the script before anything is created. Pinned in Task 2, Step 2 (validation block) and Step 3.
6. **Merge into `main` by an agent** must be impossible. The rulesets in Task 4A, Step 11 cannot stop it, because agents act under the owner's account and the rulesets require no approvals. The local guard is the fail-closed hook in Task 7B, Step 3 (probed in Step 5).

---

### Task 1: Baseline documents and public repo

**Files:**
- Create: `LICENSE`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: remote `origin` = `git@github.com:DocGerd/cockpit-procedure-trainer.git`, default branch `main`.

- [ ] **Step 1: Write `LICENSE`**

The standard MIT licence text with the holder line `Copyright (c) 2026 Patrick Kuhn`.

- [ ] **Step 2: Write `README.md`**

```markdown
# Cockpit Procedure Trainer

A browser-based trainer for practising cockpit procedures: where each control
sits and when to operate it. Pick an aircraft and a checklist, then work
through it on an interactive panel.

It is not a flight simulator. There is no flight physics.

**Training aid only.** The aircraft's handbook is authoritative. Do not use
this app in flight.

## Status

Early development. See the [design spec](docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md)
and the [milestones](https://github.com/DocGerd/cockpit-procedure-trainer/milestones).

## Development

Requires Node 24 and pnpm.

    pnpm install
    pnpm dev          # run the web app
    pnpm test         # unit tests
    pnpm lint && pnpm format:check && pnpm typecheck

## Licence

MIT. © 2026 Patrick Kuhn
```

- [ ] **Step 3: Write `CONTRIBUTING.md`**

```markdown
# Contributing

## Flow

1. Pick or open an issue.
2. Branch from `main`: `feat/<issue>-<slug>`, `fix/…`, `docs/…` or `chore/…`.
3. Open a pull request whose description contains `Closes #<issue>`.
4. `main` accepts changes only through pull requests with a green `check` job.

## Checks

    pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build

UI changes also need a pass in a real browser at tablet and desktop width.

## Package boundaries

- `packages/core`: contract and engines. No UI, no assets, no other workspace packages.
- `packages/panel-kit`: controls and gauges. Depends on `core` only.
- `packages/aircraft-*`: one aircraft each. Depends on `core` only.
- `apps/web`: the app. Imports aircraft only in `src/aircraft-registry.ts`
  and devices only in `src/device-registry.ts`.

ESLint enforces these.

## Aircraft content

Write checklists in your own words and use your own photos. Do not commit
scanned handbook pages or manufacturer artwork.
```

- [ ] **Step 4: Write `CLAUDE.md`**

```markdown
# Cockpit Procedure Trainer

Browser-based cockpit procedure trainer. Spec:
`docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`.
One implementation plan per milestone under `docs/superpowers/plans/`.

## Commands

- `pnpm dev` runs the web app
- `pnpm test` runs all unit tests (fails if none are found)
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`

## How work is done

- Agents build this project. The owner steers and reviews at milestone
  boundaries, so do not wait for approval mid-milestone on anything the spec
  or the milestone plan settles.
- One issue, one branch, one PR with `Closes #<n>`. Each PR is reviewed by a
  separate agent before merge.
- A decision the spec does not settle: make it, state it and its reason in the
  PR description, and carry it into the milestone summary.
- A milestone ends with a GitHub release whose notes are the owner's review
  summary: what shipped, decisions made, open questions, how to verify.
- Stop and ask only for: publishing content of unclear copyright, anything
  that changes the spec's decisions table, or destructive repo operations.

## Rules

- Package boundaries are in `CONTRIBUTING.md` and enforced by ESLint;
  `tools/boundary.test.ts` proves the rules fire. Extend that test when adding
  a package kind.
- Adding an aircraft: a new `packages/aircraft-<id>` plus one line in
  `apps/web/src/aircraft-registry.ts`. Nothing else in `apps/web` changes.
- Colours, type and spacing come only from `apps/web/src/styles/tokens.css`.
- The brand styles the app frame, never the cockpit panel. Status colours do
  not appear on the panel.
- No handbook scans or manufacturer artwork in the repo.
```

- [ ] **Step 5: Extend `.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
```

Personal tool folders are ignored in `.git/info/exclude`, never here.

- [ ] **Step 6: Commit**

```bash
git add LICENSE README.md CONTRIBUTING.md CLAUDE.md .gitignore
git commit -m "docs: add licence, readme, contributing guide and project instructions"
```

- [ ] **Step 7: Create the public repo and push**

```bash
gh repo create DocGerd/cockpit-procedure-trainer --public \
  --description "Browser-based cockpit procedure trainer for general aviation" \
  --source . --remote origin --push
```

- [ ] **Step 8: Verify**

Run: `gh api repos/DocGerd/cockpit-procedure-trainer --jq '[.visibility, .default_branch, .license.spdx_id] | @tsv'`
Expected: `public	main	MIT`

---

### Task 2: Labels, milestones and issues

**Files:**
- Create: `scripts/github/bootstrap.sh`
- Existing (committed with this plan): `scripts/github/backlog.json`

**Interfaces:**
- Consumes: `scripts/github/backlog.json` with keys `repo`, `spec`, `labels[] {name,color,description}`, `milestones[] {title,description}`, `issues[] {id,milestone,labels[],title,body}`.
- Produces: GitHub issues #1 to #48 whose numbers equal the manifest `id`. This holds only if the script runs before any PR is opened; Task 3 onwards rely on it.

- [ ] **Step 1: Confirm no issue or PR exists yet**

Run: `gh api "repos/DocGerd/cockpit-procedure-trainer/issues?state=all&per_page=1" --jq 'length'`
Expected: `0`. If not, stop: issue numbers will not match manifest ids.

- [ ] **Step 2: Write `scripts/github/bootstrap.sh`**

```bash
#!/usr/bin/env bash
# Creates labels, milestones and issues from backlog.json. Safe to re-run.
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="$dir/backlog.json"
repo="$(jq -r '.repo' "$manifest")"
spec="$(jq -r '.spec' "$manifest")"

gh_() { timeout -k 5 60 gh "$@" </dev/null; }

unknown="$(jq -r '
  (.labels | map(.name)) as $l | (.milestones | map(.title)) as $m
  | .issues[]
  | select((.milestone as $x | $m | index($x) | not) or (.labels - $l | length > 0))
  | "issue \(.id): unknown milestone or label"' "$manifest")"
if [[ -n "$unknown" ]]; then
  echo "$unknown" >&2
  exit 1
fi

mapfile -t labels < <(jq -c '.labels[]' "$manifest")
for l in "${labels[@]}"; do
  gh_ label create "$(jq -r '.name' <<<"$l")" --repo "$repo" --force \
    --color "$(jq -r '.color' <<<"$l")" \
    --description "$(jq -r '.description' <<<"$l")" >/dev/null
done

existing_ms="$(gh_ api --paginate "repos/$repo/milestones?state=all&per_page=100" --jq '.[].title')"
mapfile -t milestones < <(jq -c '.milestones[]' "$manifest")
for m in "${milestones[@]}"; do
  title="$(jq -r '.title' <<<"$m")"
  if ! grep -Fxq -- "$title" <<<"$existing_ms"; then
    gh_ api "repos/$repo/milestones" -f title="$title" \
      -f description="$(jq -r '.description' <<<"$m")" >/dev/null
  fi
done

ms_numbers="$(gh_ api --paginate "repos/$repo/milestones?state=all&per_page=100" \
  --jq '.[] | "\(.number)\t\(.title)"')"
existing_issues="$(gh_ api --paginate "repos/$repo/issues?state=all&per_page=100" \
  --jq '.[] | select(.pull_request | not) | .title')"

created=0
mapfile -t issues < <(jq -c '.issues | sort_by(.id) | .[]' "$manifest")
for i in "${issues[@]}"; do
  title="$(jq -r '.title' <<<"$i")"
  if grep -Fxq -- "$title" <<<"$existing_issues"; then
    continue
  fi
  ms_title="$(jq -r '.milestone' <<<"$i")"
  ms_number="$(awk -F'\t' -v t="$ms_title" '$2 == t { print $1 }' <<<"$ms_numbers")"
  body="$(jq -r '.body' <<<"$i")"$'\n\n'"Design spec: $spec"
  args=(-f title="$title" -f body="$body" -F milestone="$ms_number")
  mapfile -t issue_labels < <(jq -r '.labels[]' <<<"$i")
  for label in "${issue_labels[@]}"; do
    args+=(-f "labels[]=$label")
  done
  gh_ api "repos/$repo/issues" "${args[@]}" >/dev/null
  created=$((created + 1))
done

echo "created $created issues"
```

Make it executable: `chmod +x scripts/github/bootstrap.sh`

- [ ] **Step 3: Prove validation stops a bad manifest**

```bash
cp scripts/github/backlog.json /tmp/backlog.orig.json
jq '.issues[0].labels += ["nope"]' /tmp/backlog.orig.json > scripts/github/backlog.json
scripts/github/bootstrap.sh; echo "exit=$?"
cp /tmp/backlog.orig.json scripts/github/backlog.json
```

Expected: `issue 1: unknown milestone or label`, `exit=1`, and
`gh api "repos/DocGerd/cockpit-procedure-trainer/labels" --jq 'map(.name) | index("type:feature")'` prints `null` (nothing was created).

- [ ] **Step 4: Run it, then run it again**

Run: `scripts/github/bootstrap.sh`
Expected: `created 48 issues`

Run: `scripts/github/bootstrap.sh`
Expected: `created 0 issues`

- [ ] **Step 5: Verify numbering and counts**

Run: `gh api "repos/DocGerd/cockpit-procedure-trainer/issues/44" --jq '.title'`
Expected: `Device contract and runtime`

Run: `gh api "repos/DocGerd/cockpit-procedure-trainer/milestones?state=all" --jq '.[] | "\(.title): \(.open_issues)"'`
Expected: M0 7, M1 4, M2 9, M3 12, M4 5, M5 3, M6 7, M7 1.

- [ ] **Step 6: Commit through a PR and close issue #1**

```bash
git switch -c chore/5-backlog-bootstrap
git add scripts/github/bootstrap.sh
git commit -m "chore: add backlog manifest and GitHub bootstrap script"
git push -u origin chore/5-backlog-bootstrap
gh pr create --title "Add backlog manifest and bootstrap script" \
  --body "Labels, milestones and the 48 backlog issues are created from scripts/github/backlog.json. Part of #5. Closes #1"
```

Self-review, resolve threads, merge. Issue #1 closes with the merge (Task 1 delivered it).

---

### Task 3: Workspace, tooling and boundary rules (Closes #2)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `tools/boundary.test.ts`
- Create: `packages/core/{package.json,tsconfig.json,src/index.ts,src/index.test.ts}`
- Create: `packages/panel-kit/{package.json,tsconfig.json,src/index.ts,src/index.test.ts}`
- Create: `packages/aircraft-demo/{package.json,tsconfig.json,src/index.ts,src/index.test.ts}`
- Create: `apps/web/{package.json,tsconfig.json,vite.config.ts,index.html,src/main.tsx,src/App.tsx,src/aircraft-registry.ts,src/device-registry.ts,src/aircraft-registry.test.ts}`

**Interfaces:**
- Produces: `@cpt/core` exports `CONTRACT_VERSION: 1`. `@cpt/panel-kit` exports `PANEL_KIT_READY: true`. `@cpt/aircraft-demo` exports `demoAircraft: { id: 'demo'; contractVersion: number }`. `apps/web/src/aircraft-registry.ts` exports `aircraftRegistry: readonly { id: string }[]`; `device-registry.ts` exports `deviceRegistry: readonly { id: string }[]`.
- Produces scripts: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev`.
- Later milestones replace the placeholder exports; the registry file names and the script names are fixed.

- [ ] **Step 1: Branch and root files**

```bash
git switch main && git pull && git switch -c chore/2-workspace
```

`package.json`:

```json
{
  "name": "cockpit-procedure-trainer",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "pnpm --filter @cpt/web dev",
    "build": "pnpm --filter @cpt/web build",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "pnpm -r exec tsc --noEmit",
    "test": "vitest run"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  - apps/*
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

`.prettierrc.json`: `{ "singleQuote": true, "printWidth": 100 }`

`.prettierignore`:

```
pnpm-lock.yaml
dist
docs/design/handoff
```

Then pin the package manager and install tooling:

```bash
npm install -g pnpm@latest
npm pkg set packageManager="pnpm@$(pnpm --version)"
pnpm add -Dw typescript eslint @eslint/js typescript-eslint prettier vitest
```

- [ ] **Step 2: Packages**

`packages/core/package.json`:

```json
{
  "name": "@cpt/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

`packages/core/tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "include": ["src"] }`

`packages/core/src/index.ts`:

```ts
export const CONTRACT_VERSION = 1;
```

`packages/core/src/index.test.ts`:

```ts
import { expect, it } from 'vitest';
import { CONTRACT_VERSION } from './index';

it('exposes the contract version', () => {
  expect(CONTRACT_VERSION).toBe(1);
});
```

`packages/panel-kit/package.json`: as core, with `"name": "@cpt/panel-kit"` and `"dependencies": { "@cpt/core": "workspace:*" }`.
`packages/panel-kit/tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "lib": ["ES2022", "DOM"], "jsx": "react-jsx" }, "include": ["src"] }`

`packages/panel-kit/src/index.ts`:

```ts
export const PANEL_KIT_READY = true;
```

`packages/panel-kit/src/index.test.ts`:

```ts
import { expect, it } from 'vitest';
import { PANEL_KIT_READY } from './index';

it('loads', () => {
  expect(PANEL_KIT_READY).toBe(true);
});
```

`packages/aircraft-demo/package.json`: as core, with `"name": "@cpt/aircraft-demo"` and `"dependencies": { "@cpt/core": "workspace:*" }`.
`packages/aircraft-demo/tsconfig.json`: same as core's.

`packages/aircraft-demo/src/index.ts`:

```ts
import { CONTRACT_VERSION } from '@cpt/core';

export const demoAircraft = { id: 'demo', contractVersion: CONTRACT_VERSION } as const;
```

`packages/aircraft-demo/src/index.test.ts`:

```ts
import { CONTRACT_VERSION } from '@cpt/core';
import { expect, it } from 'vitest';
import { demoAircraft } from './index';

it('targets the current contract', () => {
  expect(demoAircraft.contractVersion).toBe(CONTRACT_VERSION);
});
```

- [ ] **Step 3: Write the failing boundary test**

`tools/boundary.test.ts`:

```ts
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function restricted(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath });
  return result?.messages.filter((m) => m.ruleId === 'no-restricted-imports').length ?? 0;
}

describe('package boundaries', () => {
  it('rejects UI imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import 'react';\n")).toBe(1);
  });

  it('rejects asset imports in core', async () => {
    expect(await restricted('packages/core/src/x.ts', "import './panel.png';\n")).toBe(1);
  });

  it('rejects panel-kit imports in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import '@cpt/panel-kit';\n")).toBe(1);
  });

  it('allows core imports in an aircraft', async () => {
    expect(await restricted('packages/aircraft-demo/src/x.ts', "import '@cpt/core';\n")).toBe(0);
  });

  it('rejects aircraft imports in panel-kit', async () => {
    expect(await restricted('packages/panel-kit/src/x.tsx', "import '@cpt/aircraft-demo';\n")).toBe(1);
  });

  it('rejects aircraft imports in the app outside the registry', async () => {
    expect(await restricted('apps/web/src/App.tsx', "import '@cpt/aircraft-demo';\n")).toBe(1);
  });

  it('allows aircraft imports in the registry', async () => {
    expect(
      await restricted('apps/web/src/aircraft-registry.ts', "import '@cpt/aircraft-demo';\n"),
    ).toBe(0);
  });

  it('rejects device imports in the app outside the device registry', async () => {
    expect(await restricted('apps/web/src/App.tsx', "import '@cpt/device-com';\n")).toBe(1);
  });
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.{ts,tsx}',
      'apps/*/src/**/*.test.{ts,tsx}',
      'tools/**/*.test.ts',
    ],
    passWithNoTests: false,
  },
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `pnpm vitest run tools/boundary.test.ts`
Expected: FAIL (no ESLint config yet, or the `toBe(1)` cases report 0).

- [ ] **Step 5: Write `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const ui = ['react', 'react/*', 'react-dom', 'react-dom/*', '@cpt/panel-kit', '@cpt/web'];
const assets = ['*.css', '*.svg', '*.png', '*.jpg', '*.webp'];
const content = ['@cpt/aircraft-*', '@cpt/device-*'];

const restrict = (group, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/design/handoff/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['packages/core/**/*.ts'],
    rules: restrict(
      [...ui, ...assets, ...content],
      'core is plain data and pure functions: no UI, assets or other workspace packages.',
    ),
  },
  {
    files: ['packages/aircraft-*/**/*.ts'],
    rules: restrict(
      [...ui, '@cpt/device-*'],
      'An aircraft depends only on @cpt/core and names widgets and devices by id.',
    ),
  },
  {
    files: ['packages/panel-kit/**/*.{ts,tsx}'],
    rules: restrict([...content, '@cpt/web'], 'panel-kit depends only on @cpt/core.'),
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/aircraft-registry.ts', 'apps/web/src/device-registry.ts'],
    rules: restrict(content, 'Import aircraft and devices only through the registries.'),
  },
);
```

The device-package rule (logic free of UI imports) is added with the device contract, issue #44.

- [ ] **Step 6: Run the boundary test**

Run: `pnpm vitest run tools/boundary.test.ts`
Expected: 8 passed.

- [ ] **Step 7: Web app**

```bash
pnpm --filter @cpt/web add react react-dom
pnpm --filter @cpt/web add -D vite @vitejs/plugin-react @types/react @types/react-dom
```

(Create `apps/web/package.json` first so the filter resolves.)

`apps/web/package.json`:

```json
{
  "name": "@cpt/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "@cpt/aircraft-demo": "workspace:*",
    "@cpt/core": "workspace:*",
    "@cpt/panel-kit": "workspace:*"
  }
}
```

`apps/web/tsconfig.json`: `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "lib": ["ES2022", "DOM", "DOM.Iterable"], "jsx": "react-jsx", "types": ["vite/client"] }, "include": ["src", "vite.config.ts"] }`

`apps/web/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
```

`apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cockpit Procedure Trainer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/aircraft-registry.ts`:

```ts
import { demoAircraft } from '@cpt/aircraft-demo';

export const aircraftRegistry: readonly { id: string }[] = [demoAircraft];
```

`apps/web/src/device-registry.ts`:

```ts
export const deviceRegistry: readonly { id: string }[] = [];
```

`apps/web/src/aircraft-registry.test.ts`:

```ts
import { expect, it } from 'vitest';
import { aircraftRegistry } from './aircraft-registry';

it('has unique aircraft ids', () => {
  const ids = aircraftRegistry.map((a) => a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain('demo');
});
```

`apps/web/src/App.tsx`:

```tsx
import { CONTRACT_VERSION } from '@cpt/core';
import { aircraftRegistry } from './aircraft-registry';

export function App() {
  return (
    <main>
      <h1>Cockpit Procedure Trainer</h1>
      <p>Training aid only. The aircraft&apos;s handbook is authoritative.</p>
      <p>
        Contract v{CONTRACT_VERSION} · {aircraftRegistry.length} aircraft
      </p>
    </main>
  );
}
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Run everything**

Run: `pnpm install && pnpm format && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0; tests: 5 files, 12 passed; `apps/web/dist/index.html` exists.

- [ ] **Step 9: Prove an empty test run fails**

Run: `pnpm vitest run --dir docs; echo "exit=$?"`
Expected: `No test files found`, `exit=1`.

- [ ] **Step 10: Commit and PR**

```bash
git add -A
git commit -m "chore: set up pnpm workspace, tooling and package boundary rules"
git push -u origin chore/2-workspace
gh pr create --title "Set up workspace, tooling and boundary rules" --body "Closes #2"
```

Self-review, resolve threads, merge.

---

### Task 4: CI and dependency updates (Closes #3)

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`

**Interfaces:**
- Produces: a status check named `check`. Task 4A makes it required.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

If an action tag does not resolve, the run fails at once; use that action's current major.

- [ ] **Step 2: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      tooling:
        patterns: ['*']
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 3: Prove CI catches a failure**

```bash
git switch main && git pull && git switch -c chore/3-ci
git add .github && git commit -m "ci: add check workflow and dependency updates"
sed -i 's/toBe(1)/toBe(2)/' packages/core/src/index.test.ts
git commit -am "test: deliberate failure to verify CI"
git push -u origin chore/3-ci
gh pr create --title "Add CI and dependency updates" --body "Closes #3"
gh pr checks --watch; echo "exit=$?"
```

Expected: `check` fails, exit code neither 0 nor 8.

- [ ] **Step 4: Revert the deliberate failure**

```bash
git revert --no-edit HEAD && git push
gh pr checks --watch; echo "exit=$?"
```

Expected: `check` passes, `exit=0`. Self-review, resolve threads, merge.

---

### Task 4A: Gitflow and UAT/prod environments (Closes #50, Closes #4)

Runs after Tasks 3 and 4 are merged into `main`. From here on `develop` is the
default branch and the base of every PR. This task supersedes the single
Pages deploy that Task 5 used to describe.

**Files:**
- Modify: `.github/workflows/ci.yml`, `apps/web/vite.config.ts`, `apps/web/src/App.tsx`
- Create: `.github/workflows/deploy.yml`, `.github/workflows/release.yml`, `CHANGELOG.md`, `changelog.d/README.md`, `changelog.d/50.added.md`, `apps/web/src/deploy-env.ts`, `apps/web/src/deploy-env.test.ts`

**Interfaces:**
- Consumes: the status check `check` from Task 4, and `BASE_PATH` read by `apps/web/vite.config.ts` from Task 3.
- Produces: branch `develop` (default), two rulesets, the `Deploy` and `Release` workflows, the changelog fragment convention used by every later PR.

- [ ] **Step 1: Create `develop` and make it the default branch**

```bash
git switch main && git pull
git push origin main:refs/heads/develop
gh api --method PATCH repos/DocGerd/cockpit-procedure-trainer --raw-field default_branch=develop --jq '.default_branch'
```

Expected: `develop`.

- [ ] **Step 2: Enable Pages and set the environment branch policy**

```bash
gh api --method POST repos/DocGerd/cockpit-procedure-trainer/pages --raw-field build_type=workflow --jq '.html_url'
gh api --method PUT repos/DocGerd/cockpit-procedure-trainer/environments/github-pages \
  --field 'deployment_branch_policy[protected_branches]=false' \
  --field 'deployment_branch_policy[custom_branch_policies]=true' --jq '.name'
gh api --method POST repos/DocGerd/cockpit-procedure-trainer/environments/github-pages/deployment-branch-policies --raw-field name=main --raw-field type=branch --jq '.name'
gh api --method POST repos/DocGerd/cockpit-procedure-trainer/environments/github-pages/deployment-branch-policies --raw-field name=develop --raw-field type=branch --jq '.name'
gh api --method POST repos/DocGerd/cockpit-procedure-trainer/environments/github-pages/deployment-branch-policies --raw-field name='v*' --raw-field type=tag --jq '.name'
gh api repos/DocGerd/cockpit-procedure-trainer/environments/github-pages/deployment-branch-policies --jq '[.branch_policies[] | .name] | sort'
```

Expected: `https://docgerd.github.io/cockpit-procedure-trainer/` (a 409 means Pages is already enabled; continue), then `develop`, `main` and `v*` echoed, and the final list `["develop","main","v*"]`.

- [ ] **Step 3: Work on a branch from `develop`**

```bash
git switch develop && git pull && git switch -c ci/50-gitflow-environments
```

- [ ] **Step 4: CI also runs on pushes to `develop`**

In `.github/workflows/ci.yml` change `branches: [main]` to `branches: [main, develop]`.

- [ ] **Step 5: UAT is noindex and shows a badge in the app frame**

`apps/web/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const noindexForUat: Plugin = {
  name: 'noindex-for-uat',
  transformIndexHtml: () =>
    process.env.VITE_DEPLOY_ENV === 'uat'
      ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }]
      : [],
};

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), noindexForUat],
});
```

`apps/web/src/deploy-env.ts`:

```ts
export type DeployEnv = 'prod' | 'uat';

export function deployEnv(value: unknown): DeployEnv {
  return value === 'uat' ? 'uat' : 'prod';
}
```

`apps/web/src/deploy-env.test.ts`:

```ts
import { expect, it } from 'vitest';
import { deployEnv } from './deploy-env';

it('is uat only for the exact value uat', () => {
  expect(deployEnv('uat')).toBe('uat');
  expect(deployEnv('prod')).toBe('prod');
  expect(deployEnv(undefined)).toBe('prod');
  expect(deployEnv('UAT ')).toBe('prod');
});
```

`apps/web/src/App.tsx`. The badge belongs to the app frame (the header), never to the cockpit panel. It carries only a class name; its colours and spacing are styled from `apps/web/src/styles/tokens.css` when that file exists, and no literal is written here:

```tsx
import { CONTRACT_VERSION } from '@cpt/core';
import { aircraftRegistry } from './aircraft-registry';
import { deployEnv } from './deploy-env';

export function App() {
  const isUat = deployEnv(import.meta.env.VITE_DEPLOY_ENV) === 'uat';
  return (
    <main>
      <header>
        <h1>Cockpit Procedure Trainer</h1>
        {isUat && (
          <span role="status" className="uat-badge">
            UAT
          </span>
        )}
      </header>
      <p>Training aid only. The aircraft&apos;s handbook is authoritative.</p>
      <p>
        Contract v{CONTRACT_VERSION} · {aircraftRegistry.length} aircraft
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Write `.github/workflows/deploy.yml`**

One Pages site, two builds. Production is built from a checkout of `main` and served at the site root; UAT is built from `develop` and served under `/uat/`. Either push rebuilds both, so the site always shows the tips of both branches. A failing UAT build never blocks production: the UAT matrix entry is `continue-on-error`, and the deploy job publishes production alone with a warning.

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    continue-on-error: ${{ matrix.env == 'uat' }}
    strategy:
      matrix:
        include:
          - env: prod
            ref: main
            base: /cockpit-procedure-trainer/
          - env: uat
            ref: develop
            base: /cockpit-procedure-trainer/uat/
    env:
      BASE_PATH: ${{ matrix.base }}
      VITE_DEPLOY_ENV: ${{ matrix.env }}
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ matrix.ref }}
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Built page must reference the base path
        run: grep -q "src=\"${BASE_PATH}assets/" apps/web/dist/index.html
      - name: UAT is noindex, production is not
        run: |
          if [ "$VITE_DEPLOY_ENV" = uat ]; then
            grep -q 'name="robots"' apps/web/dist/index.html
          elif grep -q 'name="robots"' apps/web/dist/index.html; then
            exit 1
          fi
      - uses: actions/upload-artifact@v5
        with:
          name: dist-${{ matrix.env }}
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/download-artifact@v5
        with:
          name: dist-prod
          path: dist/prod
      - uses: actions/download-artifact@v5
        continue-on-error: true
        with:
          name: dist-uat
          path: dist/uat
      - name: Assemble the site
        run: |
          mkdir -p site
          cp -r dist/prod/. site/
          test -f site/index.html
          if [ -d dist/uat ]; then
            mkdir -p site/uat
            cp -r dist/uat/. site/uat/
          else
            echo "::warning::UAT build failed; deploying production without /uat/"
          fi
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

If an action tag does not resolve, the run fails at once; use that action's current major.

- [ ] **Step 7: Write `.github/workflows/release.yml`**

On every push to `main`, read the newest released version from `CHANGELOG.md` and create tag `vX.Y.Z` and its GitHub Release when they do not exist. Re-runs are harmless.

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          persist-credentials: false
      - name: Read the top released section of CHANGELOG.md
        id: notes
        run: |
          set -euo pipefail
          version="$(awk -F'[][]' '/^## \[[0-9]+\.[0-9]+\.[0-9]+\]/ { print $2; exit }' CHANGELOG.md)"
          if [ -z "$version" ]; then
            echo "::error::CHANGELOG.md has no released section"
            exit 1
          fi
          awk -v ver="$version" '
            /^## \[/ { if (found) exit; if (index($0, "## [" ver "]") == 1) found = 1; next }
            /^\[[^]]*\]: / { if (found) exit }
            found { print }
          ' CHANGELOG.md > "$RUNNER_TEMP/notes.md"
          if ! grep -q '[^[:space:]]' "$RUNNER_TEMP/notes.md"; then
            echo "::error::section [$version] is empty"
            exit 1
          fi
          echo "tag=v$version" >> "$GITHUB_OUTPUT"
      - name: Create tag and Release if missing
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ steps.notes.outputs.tag }}
        run: |
          set -euo pipefail
          if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
            echo "Release $TAG exists"
            exit 0
          fi
          gh release create "$TAG" --repo "$GITHUB_REPOSITORY" --target "$GITHUB_SHA" \
            --title "$TAG" --notes-file "$RUNNER_TEMP/notes.md" --latest
```

`gh release create` creates the tag at the pushed commit when it does not exist and reuses it when it does.

- [ ] **Step 8: Changelog and fragments**

`CHANGELOG.md`:

```markdown
# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
semantic versioning below 1.0: milestone Mn is released as v0.(n+1).0.

## [Unreleased]

Pending changes live in `changelog.d/` and are folded in at each release.
```

`changelog.d/README.md`:

```markdown
# Changelog fragments

Every pull request adds one file here: `<issue>.<category>.md`, for example
`50.added.md`. A pull request without an issue uses `+<slug>.<category>.md`.

Categories: `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`.

The file holds one line that describes the change for a user or contributor.
At release time the fragments are folded into `CHANGELOG.md` under the
matching `### Category` heading and deleted; this file stays.
```

`changelog.d/50.added.md`: `Gitflow with a develop branch, a UAT site under /uat/, and tags and releases created from CHANGELOG.md.`

- [ ] **Step 9: Verify locally**

Run: `pnpm install && pnpm format && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
Expected: all exit 0; the new test file passes.

Base-path guard on both builds, and the noindex split:

```bash
BASE_PATH=/cockpit-procedure-trainer/ VITE_DEPLOY_ENV=prod pnpm build
grep -q 'src="/cockpit-procedure-trainer/assets/' apps/web/dist/index.html; echo "prod base=$?"
grep -c 'name="robots"' apps/web/dist/index.html
BASE_PATH=/cockpit-procedure-trainer/uat/ VITE_DEPLOY_ENV=uat pnpm build
grep -q 'src="/cockpit-procedure-trainer/uat/assets/' apps/web/dist/index.html; echo "uat base=$?"
grep -c 'name="robots"' apps/web/dist/index.html
pnpm build
grep -q 'src="/cockpit-procedure-trainer/assets/' apps/web/dist/index.html; echo "no base=$?"
```

Expected: `prod base=0`, `0`, `uat base=0`, `1`, `no base=1` (without the base path the guard would fail).

- [ ] **Step 10: PR into `develop`, merge, confirm the issues close**

```bash
git add .github/workflows apps/web CHANGELOG.md changelog.d
git commit -m "ci: gitflow, UAT and production deploy, release workflow"
git push -u origin ci/50-gitflow-environments
gh pr create --base develop --title "Gitflow and UAT/prod environments" --body $'Closes #50\nCloses #4'
gh pr checks --watch
```

Self-review, resolve threads, merge with `gh pr merge --squash --delete-branch`. Then:

Run: `gh api repos/DocGerd/cockpit-procedure-trainer/issues/50 --jq .state; gh api repos/DocGerd/cockpit-procedure-trainer/issues/4 --jq .state`
Expected: `closed` twice. This proves a `Closes` PR merged into `develop` closes its issue because `develop` is the default branch.

- [ ] **Step 11: Rulesets for `main` and `develop`**

Before writing these, confirm in the GitHub REST documentation for repository rules that the `pull_request` rule has an `allowed_merge_methods` parameter (values `merge`, `squash`, `rebase`). The two rulesets differ only in the target branch and the allowed merge methods: `main` allows `merge` only; `develop` allows `squash` and `merge`. Feature PRs squash; only a `chore/backmerge` PR (`main` into `develop`) uses a merge commit, which keeps `main` an ancestor of `develop`. `15368` is the integration id of GitHub Actions. `strict_required_status_checks_policy` is `false` because the release PR `develop` to `main` is never up to date with `main`, which holds the previous release merge commit.

```bash
gh api --method POST repos/DocGerd/cockpit-procedure-trainer/rulesets --input - --jq '.name' <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "required_reviewers": [],
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [{ "context": "check", "integration_id": 15368 }]
      }
    }
  ]
}
JSON
```

Run the same command again with `"name": "protect-develop"`, `"include": ["refs/heads/develop"]` and `"allowed_merge_methods": ["squash", "merge"]`.

Expected: `protect-main`, then `protect-develop`.

- [ ] **Step 12: Prove the rulesets**

```bash
gh api repos/DocGerd/cockpit-procedure-trainer/rules/branches/main --jq '.[] | select(.type == "pull_request") | .parameters.allowed_merge_methods'
gh api repos/DocGerd/cockpit-procedure-trainer/rules/branches/develop --jq '.[] | select(.type == "pull_request") | .parameters.allowed_merge_methods'
git switch develop && git pull
git commit --allow-empty -m "test: direct push must be rejected"
git push origin develop; echo "exit=$?"
git reset --hard origin/develop
```

Expected: `["merge"]`, `["squash","merge"]`, then the push is rejected with a message that changes must be made through a pull request, `exit=1`.

- [ ] **Step 13: Verify the live sites**

After the Deploy run for the merge finishes (`gh run watch`):

```bash
curl -fsS https://docgerd.github.io/cockpit-procedure-trainer/uat/ | grep -c 'name="robots"'
curl -fsS https://docgerd.github.io/cockpit-procedure-trainer/ | grep -c 'name="robots"'
```

Expected: `1`, then `0`. Open both URLs in a real browser: the heading renders on both, and only UAT shows the "UAT" badge in the header.

---
### Task 5: GitHub Pages deployment (superseded)

Replaced by Task 4A, which deploys production from `main` and UAT from `develop`
in one workflow and carries `Closes #4`. Nothing is built in this task.

---

### Task 6: Issue and PR templates (Closes #5)

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature.yml`, `bug.yml`, `new-aircraft.yml`, `new-device.yml`, `config.yml`
- Create: `.github/pull_request_template.md`, `changelog.d/5.added.md`

Runs after Task 4A. Branch protection is no longer part of this task; Task 4A sets rulesets.

- [ ] **Step 1: Issue templates**

`.github/ISSUE_TEMPLATE/config.yml`: `blank_issues_enabled: true`

`.github/ISSUE_TEMPLATE/feature.yml`:

```yaml
name: Feature
description: A new capability
labels: ['type:feature']
body:
  - type: textarea
    id: scope
    attributes: { label: Scope, description: 'What this adds, in one or two sentences.' }
    validations: { required: true }
  - type: textarea
    id: done
    attributes: { label: Done when, description: 'Observable conditions, one per line.' }
    validations: { required: true }
  - type: input
    id: spec
    attributes: { label: Spec section, placeholder: '§4.7' }
```

`.github/ISSUE_TEMPLATE/bug.yml`:

```yaml
name: Bug
description: Something behaves wrongly
labels: ['type:bug']
body:
  - type: input
    id: aircraft
    attributes: { label: Aircraft and procedure }
  - type: textarea
    id: steps
    attributes: { label: Steps to reproduce }
    validations: { required: true }
  - type: textarea
    id: expected
    attributes: { label: Expected, description: What the real aircraft or the checklist does. }
    validations: { required: true }
  - type: textarea
    id: actual
    attributes: { label: Actual }
    validations: { required: true }
  - type: input
    id: device
    attributes: { label: Browser and device }
```

`.github/ISSUE_TEMPLATE/new-aircraft.yml`:

```yaml
name: New aircraft
description: Add an aircraft package
labels: ['type:feature', 'area:aircraft']
body:
  - type: input
    id: type
    attributes: { label: Aircraft type and variant }
    validations: { required: true }
  - type: input
    id: handbook
    attributes: { label: Handbook revision the content will follow }
    validations: { required: true }
  - type: textarea
    id: avionics
    attributes: { label: Installed avionics units }
  - type: checkboxes
    id: clearance
    attributes:
      label: Content clearance
      options:
        - label: Photos are our own and may be published
          required: true
        - label: Checklists will be written in our own words, with no handbook scans
          required: true
```

`.github/ISSUE_TEMPLATE/new-device.yml`:

```yaml
name: New avionics device
description: Add a device package
labels: ['type:feature', 'area:device']
body:
  - type: input
    id: unit
    attributes: { label: Manufacturer and model }
    validations: { required: true }
  - type: input
    id: manual
    attributes: { label: Manual revision the logic will follow }
    validations: { required: true }
  - type: textarea
    id: functions
    attributes: { label: Functions to model }
    validations: { required: true }
  - type: textarea
    id: excluded
    attributes: { label: Functions not modelled }
```

- [ ] **Step 2: `.github/pull_request_template.md`**

```markdown
Closes #

## What changed

## How it was verified

- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- [ ] Changelog fragment added in `changelog.d/`
- [ ] UI change: checked in a real browser at tablet and desktop width
- [ ] Aircraft or device content: own words and own photos only
```

- [ ] **Step 3: PR and merge**

`changelog.d/5.added.md`: `Issue forms for features, bugs, new aircraft and new devices, and a pull request template.`

```bash
git switch develop && git pull && git switch -c chore/5-templates
git add .github/ISSUE_TEMPLATE .github/pull_request_template.md changelog.d/5.added.md
git commit -m "chore: add issue and pull request templates"
git push -u origin chore/5-templates
gh pr create --base develop --title "Add issue and PR templates" --body "Closes #5"
```

Self-review, resolve threads, merge into `develop`.

---

### Task 7: ADR-0001 and content policy (Closes #6)

**Files:**
- Create: `docs/adr/0001-architecture-and-aircraft-contract.md`, `docs/content-policy.md`, `changelog.d/6.added.md`

- [ ] **Step 1: Write the ADR**

`docs/adr/0001-architecture-and-aircraft-contract.md`, with these sections and content taken from the spec sections named:

- **Status**: Accepted.
- **Context**: spec §1 (purpose, success criteria, out of scope).
- **Decision**, one paragraph each with its reason:
  1. Packages and boundaries (spec §3), reason: an aircraft is added without touching engine or app code.
  2. Aircraft as typed data plus one pure `step` function (spec §4.4), reason: wrong operation needs no scripting and the model is testable without a browser.
  3. Checklist engine observes and never blocks (spec §5), reason: wrong operation must be possible, and the engine stays independent of the systems model.
  4. Appearance named, not contained (spec §4.8), reason: aircraft stay UI-free, generic and real artwork are interchangeable, and the layers map to 3D later.
  5. Avionics as reusable device packages with logic and screen split (spec §4.9), reason: one unit serves many aircraft.
  6. Packages consumed as TypeScript source, no per-package build, reason: one toolchain step, acceptable while nothing is published to npm.
- **Consequences**: 2D placements and optional 3D positions live side by side; device screens are the one place React code sits next to content logic; publishing a package to npm later needs a build step.

- [ ] **Step 2: Write `docs/content-policy.md`**

```markdown
# Content policy

Applies to every aircraft and device package.

## Allowed

- Checklists and descriptions written in our own words.
- Photos taken by club members who agree to publication under the repo licence.
- Drawings made for this project.

## Not allowed

- Scanned or copied handbook pages, tables or figures.
- Manufacturer artwork, logos or marketing images.
- Photos from third parties without written permission.

## Required in each package

- The handbook or manual revision the content follows.
- A licence note for every image file.
- For devices: a list of functions that are not modelled.

## In the app

The start-up notice reads: "Training aid only. The aircraft's handbook is
authoritative. Do not use this app in flight." It is shown in German and
English and cannot be removed by an aircraft package.
```

- [ ] **Step 3: PR and merge**

```bash
git switch develop && git pull && git switch -c docs/6-adr-and-content-policy
git add docs/adr docs/content-policy.md changelog.d/6.added.md
git commit -m "docs: add ADR-0001 and content policy"
git push -u origin docs/6-adr-and-content-policy
gh pr create --base develop --title "Add ADR-0001 and content policy" --body "Closes #6"
gh pr checks --watch
```

`changelog.d/6.added.md`: `ADR-0001 on the architecture and aircraft contract, and the content policy.`

Self-review, resolve threads, merge into `develop`.

---

### Task 7A: Claude Code project setup (Closes #48)

Runs after Task 4A (it needs Prettier and `develop`). Committed configuration, so
every agent session and every worktree gets the same tooling;
`.claude/settings.local.json` is untracked and would be missing in worktrees.

**Files:**
- Create: `.claude/settings.json`, `.claude/agents/ui-verifier.md`, `.claude/skills/milestone-release/SKILL.md`, `changelog.d/48.added.md`
- Modify: `CONTRIBUTING.md` (machine prerequisites)

**Machine prerequisites (not in the repo):** `npm install --global typescript-language-server typescript` for the TypeScript language server plugin, and `jq` for the hook. Both are listed in the "Machine prerequisites" section of `CONTRIBUTING.md` (Step 5).

- [ ] **Step 1: `.claude/settings.json`**

```json
{
  "enabledPlugins": {
    "playwright@claude-plugins-official": true,
    "typescript-lsp@claude-plugins-official": true,
    "frontend-design@claude-plugins-official": true,
    "context7@claude-plugins-official": true,
    "pr-review-toolkit@claude-plugins-official": true,
    "superpowers@claude-plugins-official": true
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in \"$CLAUDE_PROJECT_DIR\"/*) pnpm exec prettier --write --ignore-unknown --log-level warn \"$f\" ;; esac; exit 0"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Prove the hook formats project files and ignores everything else**

```bash
export CLAUDE_PROJECT_DIR="$PWD"
hook="$(jq -r '.hooks.PostToolUse[0].hooks[0].command' .claude/settings.json)"
outside="$(mktemp --suffix=.ts)"
printf 'export const x   =   1\n' > packages/core/src/hook-probe.ts
printf 'export const x   =   1\n' > "$outside"
printf '{"tool_input":{"file_path":"%s"}}' "$PWD/packages/core/src/hook-probe.ts" | sh -c "$hook"; echo "exit=$?"
printf '{"tool_input":{"file_path":"%s"}}' "$outside" | sh -c "$hook"; echo "exit=$?"
printf '{"tool_input":{"file_path":"%s"}}' "$PWD/LICENSE" | sh -c "$hook"; echo "exit=$?"
cat packages/core/src/hook-probe.ts "$outside"
rm packages/core/src/hook-probe.ts "$outside"
```

Expected: `exit=0` three times, then `export const x = 1;` (inside the project, formatted) and `export const x   =   1` (outside the project, untouched).

- [ ] **Step 3: `.claude/agents/ui-verifier.md`**

```markdown
---
name: ui-verifier
description: Real-browser check of a UI change at tablet and desktop width. Use before merging any PR that changes what the app renders. Read-only on the codebase.
tools: Read, Glob, Grep, Bash, mcp__plugin_playwright_playwright__*
model: sonnet
---

You verify a UI change in a real browser. You do not edit code.

1. Start the app with `pnpm dev` in the background and wait for the URL it prints.
2. Check each flow named in your brief at 1024x768 (tablet, landscape) and at
   1440x900 (desktop). Operate controls with real clicks and, for tablet,
   touch-sized targets.
3. For each flow and width report: works or broken, what you saw, and a
   screenshot path. Wait on visible state, never on fixed delays.
4. Also report: console errors, anything clipped or overlapping, any status
   colour drawn on the cockpit panel, any control smaller than 44 px.

Return at most 25 lines: verdict first, then findings by severity.
```

- [ ] **Step 4: `.claude/skills/milestone-release/SKILL.md`**

```markdown
---
name: milestone-release
description: Cut a milestone release under gitflow - whole-milestone review, changelog fold, owner summary, and the release PR develop to main. Use when every issue of a milestone is closed. Never merges the release PR.
---

# Milestone release

Arguments: the milestone title, for example `M2 Core engine`. Milestone Mn is
released as `v0.(n+1).0`, so `M2` is `v0.3.0`. The slug is the title in
lower-case kebab form, for example `m2-core-engine`.

1. Confirm the milestone has no open issues. If it has, stop and list them.
   `git fetch origin`; work from `origin/develop`.
2. Dispatch one reviewer on the most capable model over the diff since the
   previous release tag (the first commit for the first release), with the spec
   and the milestone plan. Fix findings through PRs into `develop`.
3. Branch `release/vX.Y.Z` from `origin/develop`:
   - Fold every `changelog.d/<issue>.<category>.md` and `+<slug>.<category>.md` fragment into
     `CHANGELOG.md` as `## [X.Y.Z] - <UTC date>` (`date -u +%Y-%m-%d`), one
     `- <text>` bullet under a `### Category` heading, in the order Added,
     Changed, Deprecated, Removed, Fixed, Security. Delete the folded
     fragments and keep `changelog.d/README.md`. Keep `## [Unreleased]`
     empty. Update the link references at the bottom.
   - Write `docs/milestones/<slug>.md` with four sections: What shipped,
     Decisions made (from the PR descriptions, with reasons), Open questions
     for the owner, How to verify (commands and URLs).
   - Open a PR with base `develop`, review it with `pr-selfreview` and merge
     it into `develop` with `merge-train`.
4. Open the release PR: `gh pr create --base main --head develop --title "Release vX.Y.Z" --body-file docs/milestones/<slug>.md`.
5. Stop. NEVER merge the release PR: no `gh pr merge`, no auto-merge, no API
   merge. The owner merges it; the `Release` workflow then creates tag
   `vX.Y.Z` and the GitHub Release from the top section of `CHANGELOG.md`.
6. Give the owner the release PR URL and the open questions.
7. In the next session, after the owner's merge: confirm tag and Release exist
   and close the milestone. If `main` holds commits that `develop` lacks (a
   hotfix), open a PR `main` to `develop`.
```

- [ ] **Step 5: Document prerequisites, PR and merge**

Extend the existing "Machine prerequisites" section of `CONTRIBUTING.md` (it already lists Node 24, pnpm, `gh` and `jq`) with `typescript-language-server` for the TypeScript plugin, and note that the formatting hook uses `jq`.

`changelog.d/48.added.md`: `Committed Claude Code configuration: plugins, a formatting hook, a UI verifier agent and a milestone release skill.`

```bash
git switch develop && git pull && git switch -c chore/48-claude-code-setup
git add .claude CONTRIBUTING.md changelog.d/48.added.md
git commit -m "chore: add Claude Code project configuration"
git push -u origin chore/48-claude-code-setup
gh pr create --base develop --title "Add Claude Code project configuration" --body "Closes #48"
```

Self-review, resolve threads, merge into `develop`. In a fresh session, confirm with `/plugin`
that the six plugins show as enabled for this project.

---

### Task 7B: Release-cycle skills (Closes #51)

Depends on Task 7A: it edits `.claude/settings.json`, which Task 7A creates, so
start it only after Task 7A is merged.

Repo-local Claude Code tooling for a full release cycle: open PRs, review them,
fix findings, merge into `develop`, and cut a release that only the owner can
merge.

**Files:**
- Create: `.claude/commands/release-cycle.md`, `.claude/skills/pr-selfreview/SKILL.md`, `.claude/skills/merge-train/SKILL.md`, `.claude/hooks/block-main-merge.sh`, `changelog.d/51.added.md`
- Modify: `.claude/settings.json`

**Conventions for every file in this task:** no short option flags in `gh` calls (use `--raw-field` and `--field`); read issues and PRs through `gh api repos/DocGerd/cockpit-procedure-trainer/...` because `gh issue view` and `gh pr view --json` can fail on the classic-projects deprecation; `gh pr checks` has no `--json`, so poll `commits/<sha>/check-runs`.

- [ ] **Step 1: `.claude/skills/pr-selfreview/SKILL.md`**

```markdown
---
name: pr-selfreview
description: Self-review a pull request you authored - run a review, post one inline thread per finding, fix, reply, resolve every thread. Use whenever you open or update a PR of your own.
---

# Self-review a PR

Argument: the PR number `N`. Repo: `DocGerd/cockpit-procedure-trainer`.

1. **Review.** The base is `develop`. Get the diff with `gh pr diff N` and the
   head SHA with `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N --jq .head.sha`.
   Run `pr-review-toolkit:review-pr` on that diff.
2. **Post one inline thread per finding**, anchored to a changed line. A finding
   outside the diff becomes a PR-level comment.

       gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N/comments --method POST \
         --raw-field body='Narrow on the kind instead of casting.' \
         --raw-field commit_id=SHA --raw-field path=packages/core/src/index.ts \
         --field line=42 --raw-field side=RIGHT

   A body that contains a single quote goes through `--input` with a JSON file.
3. **Fix** every finding, commit, push. Never skip hooks, never force-push.
   Run `git push` and `gh api` in separate shell calls.
4. **Reply and resolve** each thread through GraphQL. Enumerate:

       gh api graphql --raw-field query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line}}}}}' \
         --raw-field o=DocGerd --raw-field r=cockpit-procedure-trainer --field n=N

   Reply, then resolve:

       gh api graphql --raw-field query='mutation($id:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$b}){comment{id}}}' \
         --raw-field id=THREAD_ID --raw-field b='Fixed in the latest commit.'
       gh api graphql --raw-field query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' \
         --raw-field id=THREAD_ID

Done when the enumerate query shows `isResolved: true` for every thread. A
review with no findings posts one PR comment saying so and has no threads.
```

- [ ] **Step 2: `.claude/skills/merge-train/SKILL.md`**

```markdown
---
name: merge-train
description: Merge reviewed pull requests into develop, one at a time, after verifying checks, threads and head SHA. Never merges into main.
---

# Merge into `develop`

Argument: one or more PR numbers, merged in the order given.

For each PR `N`:

1. **Base.** `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N --jq .base.ref` must print
   `develop`. Anything else: stop. Merging into `main` is never done from here,
   by any source; the release PR `develop` to `main` is the owner's to merge.
2. **Head SHA.** The PR's `head.sha` must equal the tip of its branch
   (`git/ref/heads/<branch>`). A mismatch means GitHub missed a push event and
   the checks describe an older commit: stop and report.
3. **Checks.** `gh api repos/DocGerd/cockpit-procedure-trainer/commits/SHA/check-runs --jq '[.total_count, ([.check_runs[] | select(.conclusion != "success")] | length)]'`
   must print `[n, 0]` with `n` above zero. If checks are pending, poll this
   call; foreground-test the poll command once before arming a monitor.
4. **Threads.** Every review thread is resolved (enumerate query in
   `pr-selfreview`). One unresolved thread: stop.
5. **Merge.** `gh pr merge N --squash --delete-branch --match-head-commit SHA`.
   The one exception is a backmerge PR (branch `chore/backmerge`, `main` into
   `develop`): merge it with `--merge` instead of `--squash`, so `main` becomes
   an ancestor of `develop`.
6. **Confirm.** `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N --jq .merged` prints `true`, and
   each `Closes #n` issue reads `closed`. If the merge call errored, read
   `.merged` before any retry; never retry blind.
7. **Next PR.** If the next PR is behind `develop`, run
   `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/M/update-branch --method PUT`,
   wait for its checks again, and restart at step 2 for it.
```

- [ ] **Step 3: `.claude/hooks/block-main-merge.sh`**

Blocks any merge whose target is `main`, and fails closed: if the target cannot be determined, or `jq` is missing, the command is denied. Needs `jq` and `gh`.

```bash
#!/usr/bin/env bash
set -uo pipefail

deny() {
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg reason "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
  else
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  fi
  exit 0
}

command -v jq >/dev/null 2>&1 || deny "jq is not installed, so the main-merge guard cannot inspect the command."

cmd="$(jq -r '.tool_input.command // empty')"
flat="$(tr -s '[:space:]' ' ' <<<"$cmd")"

case "$flat" in
  *"gh api"*"/merge"*) deny "Merging through the API is not allowed. Use gh pr merge on a PR whose base is develop." ;;
  *"gh api graphql"*mergePullRequest*) deny "Merging through GraphQL is not allowed. Use gh pr merge on a PR whose base is develop." ;;
  *"gh api graphql"*"--input"* | *"gh api graphql"*@*) deny "GraphQL calls must pass the query inline so it can be inspected." ;;
esac

check_merge() {
  local words word num="" seen=0
  read -ra words <<<"$1"
  for word in "${words[@]}"; do
    if [ "$seen" = 1 ] && [[ "$word" =~ ^([0-9]+)$ || "$word" =~ /pull/([0-9]+) ]]; then
      num="${BASH_REMATCH[1]}"
      break
    fi
    [ "$word" = merge ] && seen=1
  done
  [ -n "$num" ] || deny "Name the PR by number or URL so its base branch can be checked."
  local base
  base="$(timeout -k 5 20 gh api "repos/{owner}/{repo}/pulls/$num" --jq .base.ref </dev/null)" \
    || deny "Could not read the base branch of PR $num."
  [ -n "$base" ] || deny "Could not read the base branch of PR $num."
  [ "$base" != main ] || deny "PR $num targets main. Agents never merge into main; the owner merges the release PR."
}

mapfile -t segments < <(sed -e 's/&&/\n/g' -e 's/||/\n/g' -e 's/[;|]/\n/g' <<<"$cmd")
for segment in "${segments[@]}"; do
  segment="$(tr -s '[:space:]' ' ' <<<"$segment")"
  if [[ "$segment" =~ gh([[:space:]]+[^[:space:]]+)*[[:space:]]+pr[[:space:]]+merge ]]; then
    check_merge "$segment"
  fi
done
exit 0
```

Every `gh pr merge` in the command is checked, across lines and across `&&`, `||`, `;` and `|` segments; any one that targets `main`, or whose target cannot be read, denies the whole command.

`chmod +x .claude/hooks/block-main-merge.sh`.

- [ ] **Step 4: Wire the hook into `.claude/settings.json`**

Add next to the existing `PostToolUse` key. The wrapper denies when the script is missing or not executable, so the guard cannot go inert silently:

```json
"PreToolUse": [
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "H=\"$CLAUDE_PROJECT_DIR/.claude/hooks/block-main-merge.sh\"; if [ -x \"$H\" ]; then exec \"$H\"; else echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"main-merge guard script missing or not executable\"}}'; fi",
        "timeout": 30
      }
    ]
  }
]
```

- [ ] **Step 5: Prove the hook with a stub `gh`**

```bash
stub="$(mktemp --directory)"
empty="$(mktemp --directory)"
printf '#!/bin/sh\ncase "$*" in *pulls/13*) echo main ;; *) echo develop ;; esac\n' > "$stub/gh" && chmod +x "$stub/gh"
probe() { printf '{"tool_input":{"command":"%s"}}' "$1" | PATH="$stub:$PATH" .claude/hooks/block-main-merge.sh; echo "[$1] exit=$?"; }
probe 'gh pr merge 13 --squash --delete-branch'
probe 'gh pr merge 12 --squash --delete-branch'
probe 'gh pr merge --squash'
probe 'gh api repos/o/r/pulls/12/merge --method PUT'
probe 'gh pr list'
probe 'gh api graphql --raw-field query=mutation{mergePullRequest(input:{pullRequestId:X}){clientMutationId}}'
probe 'gh pr merge 12 --squash && gh pr merge 13 --merge'
probe 'gh pr merge 12 --squash\ngh pr merge 13 --merge'
probe 'gh api graphql --input query.json'
printf '{"tool_input":{"command":"gh pr merge 12 --squash"}}' | PATH="$empty" "$(command -v bash)" .claude/hooks/block-main-merge.sh; echo "[no jq] exit=$?"
rm -r "$stub" "$empty"
```

Expected: probes 1, 3, 4, 6, 7, 8, 9 and the `no jq` run print a JSON object whose `permissionDecision` is `deny`; probes 2 and 5 print nothing before their `exit=0` line. Every line ends with `exit=0` (the decision is in the JSON, not the exit code).

- [ ] **Step 6: `.claude/commands/release-cycle.md`**

```markdown
---
description: Run one milestone through the release cycle - implement every open issue as a PR into develop, review, fix, merge, then cut the release PR for the owner.
argument-hint: "[milestone title, e.g. M2 Core engine - discovered if omitted]"
---

Milestone: $ARGUMENTS. If empty, pick the lowest-numbered open milestone that
has open issues without the `blocked` label, and name it back before
proceeding. If set, verify it exists and is open.

You are the orchestrator. Read `CLAUDE.md` first; it is binding. Plan the whole
session before executing it. The main session holds decisions and verdicts;
agents do the reading and the writing.

## Phase 0 - State

`git fetch origin`. List the milestone's open issues through
`gh api "repos/DocGerd/cockpit-procedure-trainer/issues?milestone=<n>&state=open"`. Skip issues
labelled `blocked`. Confirm `develop` is green: the check-runs of its tip are
all `success`. If the list is empty, go to Phase 4.

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
2. Adds `changelog.d/<issue>.<category>.md`.
3. Opens a PR with base `develop`, body starting `Closes #<issue>`, a
   `## Decisions` section for anything the spec and plan do not settle, and the
   attribution line `CLAUDE.md` requires.
4. Returns the PR number and head SHA.

## Phase 3 - Review, fix, merge

A reviewer agent that is not the implementer runs the `pr-selfreview` skill on
each PR. The implementer fixes the findings and the reviewer's threads are
resolved. At most two fix waves per PR; leftovers become follow-up issues.
Then the `merge-train` skill merges the PRs into `develop`, one at a time.
Never merge into `main`.

## Phase 4 - Cut

When the milestone has no open issues, run the `milestone-release` skill. It
ends with the release PR `develop` to `main` open. You never merge it. Report
to the owner: the release PR URL, decisions made, open questions, how to
verify. The owner merges; a workflow tags and publishes the release.
```

- [ ] **Step 7: PR into `develop`**

```bash
git switch develop && git pull && git switch -c chore/51-release-cycle-skills
git add .claude changelog.d/51.added.md
git commit -m "chore: add release-cycle skills and main-merge guard hook"
git push -u origin chore/51-release-cycle-skills
gh pr create --base develop --title "Add release-cycle skills" --body "Closes #51"
gh pr checks --watch
```

`changelog.d/51.added.md`: `Release-cycle command and skills for review and merging into develop, and a hook that blocks merges into main.`

Self-review, resolve threads, merge into `develop`.

---

### Task 8: Milestone release for the owner

Runs after Tasks 4A, 6, 7, 7A and 7B are merged into `develop`. The session
ends with the release PR open. Agents never merge into `main`: the owner merges
the release PR, and the `Release` workflow then creates tag `v0.1.0` and the
GitHub Release.

**Files:**
- Create: `docs/milestones/m0-foundation.md` (by the skill)

- [ ] **Step 1: Confirm every M0 issue is closed**

Run: `gh api "repos/DocGerd/cockpit-procedure-trainer/milestones?state=all" --jq '.[] | select(.title == "M0 Foundation") | "\(.open_issues) open, \(.closed_issues) closed"'`
Expected: `0 open, 9 closed`

- [ ] **Step 2: Run the milestone-release skill**

Run: `/milestone-release M0 Foundation`

The steps are defined once, in Task 7A, Step 4. They cover the whole-milestone
review, the changelog fold as `## [0.1.0]`, `docs/milestones/m0-foundation.md`
and the release PR `develop` to `main`. The skill does not merge that PR.

- [ ] **Step 3: Confirm the outcome**

```bash
gh api repos/DocGerd/cockpit-procedure-trainer/contents/docs/milestones/m0-foundation.md --raw-field ref=develop --jq .name
gh api repos/DocGerd/cockpit-procedure-trainer/pulls/<release PR number> --jq '{base: .base.ref, state: .state, merged: .merged}'
```

Expected: `m0-foundation.md`, then `{"base":"main","merged":false,"state":"open"}` (`gh --jq` prints keys in sorted order).

Give the owner the release PR URL, the open questions and the milestone summary.
**The session ends here.**

- [ ] **Step 4: After the owner's merge (next session)**

```bash
gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.1.0 --jq .tag_name
number="$(gh api "repos/DocGerd/cockpit-procedure-trainer/milestones" --jq '.[] | select(.title == "M0 Foundation") | .number')"
gh api --method PATCH "repos/DocGerd/cockpit-procedure-trainer/milestones/$number" --raw-field state=closed --jq '.state'
```

Expected: `v0.1.0`, then `closed`. If the release is missing, read the `Release` workflow run on `main` and report; do not create the tag by hand.
