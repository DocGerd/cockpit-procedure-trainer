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
