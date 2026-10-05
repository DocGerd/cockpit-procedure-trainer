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
- Gitflow: the base branch is `develop`. Agents merge reviewed PRs into
  `develop` and never merge into `main`, from any source.
- The release PR `develop` to `main` is opened by an agent and merged by the
  owner. A workflow then tags and publishes the release.
- Every PR adds a fragment `changelog.d/<issue>.<category>.md`.
- Branch prefixes: `feat/ fix/ chore/ docs/ ci/ release/`.
- A decision the spec does not settle: make it, state it and its reason in the
  PR description, and carry it into the milestone summary.
- A milestone ends with the release PR, whose summary is the owner's review:
  what shipped, decisions made, open questions, how to verify.
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
