# Architecture

A client-only static web app: a browser-based cockpit procedure trainer. There
is no server, no account system and no runtime call to a third-party origin.
The authoritative design is the
[design spec](superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md)
and the [ADRs](adr/); this page is the short map.

## Packages

| Path                     | Role                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`          | Aircraft contract, systems runtime, checklist engine, validator. Plain data and pure functions: no DOM, React or assets                                           |
| `packages/panel-kit`     | Generic GA controls and gauges, and the layer renderer for aircraft artwork. Depends on `core` only                                                               |
| `packages/aircraft-<id>` | One aircraft each (a fictional demo aircraft and a real type). Declares controls, indicators, views, systems model, phases and procedures. Depends on `core` only |
| `packages/device-<id>`   | One avionics unit each (logic and screen), reusable across aircraft. Imports only `core` and `panel-kit`                                                          |
| `apps/web`               | The React app: panel, checklist pane, outside view, PWA shell, i18n, storage, styling tokens                                                                      |
| `tools/`                 | Cross-package contract tests (boundaries, device contracts, design literals)                                                                                      |

## Boundaries

The dependency rules above are enforced by ESLint, and `tools/boundary.test.ts`
proves the rules fire. `apps/web` imports aircraft only in
`src/aircraft-registry.ts` and devices only in `src/device-registry.ts`; adding
an aircraft or a device is a new package plus one registry entry
([adding an aircraft](adding-an-aircraft.md), [adding a device](adding-a-device.md)).
Colours, type and spacing come only from `apps/web/src/styles/tokens.css`.
Rationale: [ADR-0001](adr/0001-architecture-and-aircraft-contract.md).

## Data flow

1. The pilot operates a control; the control store records the new position.
2. The systems runtime steps and stores the new state.
3. Indicators redraw from the state.
4. The checklist engine only observes control changes and state, completes
   items and records deviations. It never blocks or alters input.

The validator in `core` runs in CI for every registered aircraft and rejects
inconsistent aircraft data.

## Persistence and network

`localStorage` holds theme, language, last aircraft and a per-procedure run history
(last and best result, validated and size-bounded) only (`apps/web/src/storage`);
the app works without it. Everything else is in memory. The app makes no
runtime requests beyond its own origin; the service worker precaches the app so
it works offline. The strict CSP in `apps/web/src/csp.ts` enforces this.

## Build and delivery

`pnpm build` produces a static bundle. GitHub Actions (`.github/workflows/`)
runs the required `check` job, deploys `develop` to `/uat/` and `main` to the
production root of GitHub Pages, and creates the GitHub Release from
`CHANGELOG.md` on `main`. Flow and checks: [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Quality priorities

[ADR-0002](adr/0002-quality-priorities.md) ranks the qualities and fixes the
gates (legal, security and privacy) that are never traded.
