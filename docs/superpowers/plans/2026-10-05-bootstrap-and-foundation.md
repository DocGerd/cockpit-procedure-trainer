# Bootstrap and M0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public GitHub repo with the full backlog (48 issues in 8 milestones) and a working, tested, deployed workspace skeleton that later milestones build on.

**Architecture:** pnpm workspace with `packages/core`, `packages/panel-kit`, `packages/aircraft-demo` and `apps/web`. Packages are consumed as TypeScript source, so there is no per-package build. ESLint `no-restricted-imports` rules enforce the package boundaries and a test proves they fire.

**Tech Stack:** Node 24, pnpm, TypeScript (strict), React, Vite, Vitest, ESLint (flat config) with typescript-eslint, Prettier, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`

This is the first of one plan per milestone. M1 to M7 each get their own plan when they start.

## Global Constraints

- Repo: `DocGerd/cockpit-procedure-trainer`, public.
- Licence: MIT, holder line exactly `Copyright (c) 2026 Patrick Kuhn`. No company suffix, no ® or ™ anywhere.
- Package scope `@cpt/`: `@cpt/core`, `@cpt/panel-kit`, `@cpt/aircraft-demo`, `@cpt/web`.
- Boundaries (spec §3): `core` imports no UI, assets or workspace packages; aircraft packages import only `@cpt/core`; `panel-kit` imports no aircraft, device or web code; `apps/web` imports aircraft and devices only in `src/aircraft-registry.ts` and `src/device-registry.ts`.
- After Task 1, every change reaches `main` through a PR whose body has `Closes #<n>`. No force-push, no `--no-verify`.
- Every PR is self-reviewed with `pr-review-toolkit:review-pr`: one inline thread per finding, fix, resolve every thread.
- Comments in code only where the code cannot say it. No dates, durations or measured figures in comments or docs unless they are requirements.
- Personal local tooling is never added to committed config, CLAUDE.md or CI; ignore its folders in `.git/info/exclude`.
- Shell scripts that call `gh`: `timeout -k 5 60 gh … </dev/null`; loop with `mapfile` + `for`, never `while read` around a spawned command.
- Commit identity: `user.email` is `13460098+DocGerd@users.noreply.github.com` (set in the repo's local git config). No other address may appear as author or committer. Merges made by GitHub use the account's own email setting, so until the owner confirms "Keep my email addresses private" is on, merge a reviewed PR by fast-forwarding `main` to the PR head locally and pushing; do not use the merge button or `gh pr merge`.
- Nothing committed, and no issue or PR text, contains local absolute paths, machine or user names, or links to private artifacts.
- Commit trailer: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Execution Model

The project is built entirely by agents. The owner steers and reviews at
milestone boundaries, not per task.

- The main session orchestrates: it dispatches each task to a subagent, has a
  separate reviewer check it, and keeps only decisions and verdicts.
- Decisions the spec settles are not escalated. Decisions it does not settle
  are made, recorded in the PR description, and listed in the milestone summary.
- A milestone ends with a GitHub release and a summary for the owner (Task 8).

| Task | Worker | Reviewer |
|---|---|---|
| 1 Baseline documents and repo | sonnet, medium | sonnet, high |
| 2 Labels, milestones, issues | sonnet, high | sonnet, high |
| 3 Workspace and boundary rules | sonnet, high | opus, xhigh (boundaries are architecture) |
| 4 CI | sonnet, high | sonnet, high |
| 5 Pages | sonnet, high | sonnet, high |
| 6 Templates and branch protection | sonnet, medium | sonnet, high |
| 7 ADR and content policy | sonnet, medium | opus, xhigh |
| 7A Claude Code project setup | sonnet, medium | sonnet, high |
| 8 Milestone release | sonnet, medium | opus, xhigh (whole-milestone review) |

Tasks 4, 5, 6, 7 and 7A are independent once Task 3 is merged and can run in
parallel in separate worktrees.

## Review Focus

1. **Bootstrap script run twice** must not create duplicate labels, milestones or issues. Pinned in Task 2, Step 4.
2. **Pages base path**: assets requested from `/assets/…` instead of `/cockpit-procedure-trainer/assets/…` give a blank page. Pinned in Task 5, Step 2 (workflow check).
3. **Test run that finds no tests** must fail, or CI is green while testing nothing. Pinned in Task 3, Step 9.
4. **Boundary rules that silently do not match** (wrong glob) give false safety. Pinned in Task 3, Step 3 (`tools/boundary.test.ts`).
5. **Manifest entry naming a label or milestone that does not exist** must stop the script before anything is created. Pinned in Task 2, Step 2 (validation block) and Step 3.

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
- Produces: a status check named `check`. Task 6 makes it required.

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

### Task 5: GitHub Pages deployment (Closes #4)

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: Enable Pages with the workflow source**

Run: `gh api -X POST repos/DocGerd/cockpit-procedure-trainer/pages -f build_type=workflow --jq '.html_url'`
Expected: `https://docgerd.github.io/cockpit-procedure-trainer/`

- [ ] **Step 2: Write `.github/workflows/pages.yml`**

```yaml
name: Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    env:
      BASE_PATH: /cockpit-procedure-trainer/
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Built page must reference the base path
        run: grep -q 'src="/cockpit-procedure-trainer/assets/' apps/web/dist/index.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: apps/web/dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Check the base-path guard locally**

Run: `pnpm build && grep -q 'src="/cockpit-procedure-trainer/assets/' apps/web/dist/index.html; echo "exit=$?"`
Expected: `exit=1` (built without the base path, so the guard would fail).

Run: `BASE_PATH=/cockpit-procedure-trainer/ pnpm build && grep -q 'src="/cockpit-procedure-trainer/assets/' apps/web/dist/index.html; echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: PR, merge, verify the live site**

```bash
git switch main && git pull && git switch -c chore/4-pages
git add .github/workflows/pages.yml && git commit -m "ci: deploy web app to GitHub Pages"
git push -u origin chore/4-pages
gh pr create --title "Deploy to GitHub Pages" --body "Closes #4"
```

Self-review, resolve threads, merge. After the Pages run finishes:

Run: `curl -fsS https://docgerd.github.io/cockpit-procedure-trainer/ | grep -c 'cockpit-procedure-trainer/assets/'`
Expected: `1` or more. Then open the URL in a real browser and confirm the heading renders.

---

### Task 6: Templates and branch protection (Closes #5)

**Files:**
- Create: `.github/ISSUE_TEMPLATE/feature.yml`, `bug.yml`, `new-aircraft.yml`, `new-device.yml`, `config.yml`
- Create: `.github/pull_request_template.md`

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
    attributes: { label: Scope, description: What this adds, in one or two sentences. }
    validations: { required: true }
  - type: textarea
    id: done
    attributes: { label: Done when, description: Observable conditions, one per line. }
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
- [ ] UI change: checked in a real browser at tablet and desktop width
- [ ] Aircraft or device content: own words and own photos only
```

- [ ] **Step 3: PR and merge**

```bash
git switch main && git pull && git switch -c chore/5-templates
git add .github && git commit -m "chore: add issue and pull request templates"
git push -u origin chore/5-templates
gh pr create --title "Add issue and PR templates" --body "Closes #5"
```

Self-review, resolve threads, merge.

- [ ] **Step 4: Protect `main`**

```bash
cat > /tmp/protection.json <<'JSON'
{
  "required_status_checks": { "strict": false, "contexts": ["check"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON
gh api -X PUT repos/DocGerd/cockpit-procedure-trainer/branches/main/protection --input /tmp/protection.json --jq '.required_status_checks.contexts'
```

Expected: `["check"]`

- [ ] **Step 5: Prove a direct push is rejected**

```bash
git switch main && git pull
git commit --allow-empty -m "test: direct push must be rejected"
git push; echo "exit=$?"
git reset --hard origin/main
```

Expected: push rejected with a protected-branch message, `exit=1`.

---

### Task 7: ADR-0001 and content policy (Closes #6)

**Files:**
- Create: `docs/adr/0001-architecture-and-aircraft-contract.md`, `docs/content-policy.md`

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
git switch main && git pull && git switch -c docs/6-adr-and-content-policy
git add docs/adr docs/content-policy.md
git commit -m "docs: add ADR-0001 and content policy"
git push -u origin docs/6-adr-and-content-policy
gh pr create --title "Add ADR-0001 and content policy" --body "Closes #6"
gh pr checks --watch
```

Self-review, resolve threads, merge.

---

### Task 7A: Claude Code project setup (Closes #48)

Runs any time after Task 3 (it needs Prettier). Committed configuration, so
every agent session and every worktree gets the same tooling;
`.claude/settings.local.json` is untracked and would be missing in worktrees.

**Files:**
- Create: `.claude/settings.json`, `.claude/agents/ui-verifier.md`, `.claude/skills/milestone-release/SKILL.md`

**Machine prerequisite (not in the repo):** `npm install -g typescript-language-server typescript` for the TypeScript language server plugin.

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
            "command": "jq -r '.tool_input.file_path // empty' | xargs -r pnpm exec prettier --write --ignore-unknown --log-level warn"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Prove the hook formats and tolerates non-code files**

```bash
printf 'export const x   =   1\n' > /tmp/hook-probe.ts && cp /tmp/hook-probe.ts packages/core/src/hook-probe.ts
echo '{"tool_input":{"file_path":"packages/core/src/hook-probe.ts"}}' | jq -r '.tool_input.file_path // empty' | xargs -r pnpm exec prettier --write --ignore-unknown --log-level warn
cat packages/core/src/hook-probe.ts; rm packages/core/src/hook-probe.ts
echo '{"tool_input":{"file_path":"LICENSE"}}' | jq -r '.tool_input.file_path // empty' | xargs -r pnpm exec prettier --write --ignore-unknown --log-level warn; echo "exit=$?"
```

Expected: `export const x = 1;` then `exit=0`.

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
description: Close a milestone - whole-milestone review, owner summary and GitHub release. Use when every issue of a milestone is closed.
disable-model-invocation: true
---

# Milestone release

Argument: the milestone title, for example `M2 Core engine`.

1. Confirm the milestone has no open issues. If it has, stop and list them.
2. Dispatch one reviewer on the most capable model over the diff since the
   previous milestone's release tag, with the spec and the milestone plan.
   Fix findings through PRs.
3. Write `docs/milestones/<slug>.md` with four sections: What shipped,
   Decisions made (from the PR descriptions, with reasons), Open questions for
   the owner, How to verify (commands and URLs). Merge it through a PR.
4. Create the release: `gh release create <slug> --target main --title "<title>" --notes-file docs/milestones/<slug>.md`
5. Close the milestone on GitHub.
6. Give the owner the release URL and the open questions.
```

- [ ] **Step 5: PR and merge**

```bash
git switch main && git pull && git switch -c chore/48-claude-code-setup
git add .claude && git commit -m "chore: add Claude Code project configuration"
git push -u origin chore/48-claude-code-setup
gh pr create --title "Add Claude Code project configuration" --body "Closes #48"
```

Self-review, resolve threads, merge. In a fresh session, confirm with `/plugin`
that the six plugins show as enabled for this project.

---

### Task 8: Milestone release and owner summary

**Files:**
- Create: `docs/milestones/m0-foundation.md`

- [ ] **Step 1: Confirm every M0 issue is closed**

Run: `gh api "repos/DocGerd/cockpit-procedure-trainer/milestones?state=all" --jq '.[] | select(.title == "M0 Foundation") | "\(.open_issues) open, \(.closed_issues) closed"'`
Expected: `0 open, 7 closed`

- [ ] **Step 2: Whole-milestone review**

Dispatch one reviewer over `git diff <first commit>..origin/main` with the spec
and this plan. Fix findings through PRs before continuing.

- [ ] **Step 3: Write `docs/milestones/m0-foundation.md`**

Four sections, each a short list: **What shipped** (with the Pages URL),
**Decisions made** (anything not settled by the spec, with reasons, collected
from the PR descriptions), **Open questions for the owner**, **How to verify**
(the commands and URLs from this plan's verification steps).

Merge it through a PR (`docs/m0-summary`, no closing issue).

- [ ] **Step 4: Release and close the milestone**

```bash
gh release create m0-foundation --target main --title "M0 Foundation" \
  --notes-file docs/milestones/m0-foundation.md
number="$(gh api "repos/DocGerd/cockpit-procedure-trainer/milestones" --jq '.[] | select(.title == "M0 Foundation") | .number')"
gh api -X PATCH "repos/DocGerd/cockpit-procedure-trainer/milestones/$number" -f state=closed --jq '.state'
```

Expected: a release URL, then `closed`.
