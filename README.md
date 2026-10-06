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
    pnpm test:e2e     # browser tests; first run: pnpm exec playwright install chromium

To add an aircraft, see [Adding an aircraft](docs/adding-an-aircraft.md).

## Licence

MIT. © 2026 Patrick Kuhn

Geist and Geist Mono are under the SIL Open Font License 1.1; see apps/web/public/licenses/.
