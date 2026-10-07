# Cockpit Procedure Trainer

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15281/badge)](https://www.bestpractices.dev/projects/15281)

A browser-based trainer for practising cockpit procedures: where each control
sits and when to operate it. Pick an aircraft and a checklist, then work
through it on an interactive panel.

It is not a flight simulator. There is no flight physics.

**Training aid only.** The aircraft's handbook is authoritative. Do not use
this app in flight.

**Live app:** https://docgerd.github.io/cockpit-procedure-trainer/

**UAT preview:** https://docgerd.github.io/cockpit-procedure-trainer/uat/ — the
unreleased `develop` state, auto-deployed on every push to `develop`. It may be
unstable, is not indexed by search engines, and is not the productive version;
use the live app link above for training.

## Status

Actively maintained, in early development (pre-1.0). See the [design spec](docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md)
and the [milestones](https://github.com/DocGerd/cockpit-procedure-trainer/milestones).

## Quick start

Requires Node 24 and pnpm.

    pnpm install
    pnpm dev          # run the web app
    pnpm test         # unit tests
    pnpm lint && pnpm format:check && pnpm typecheck
    pnpm test:e2e     # browser tests; first run: pnpm exec playwright install chromium

To add an aircraft, see [Adding an aircraft](docs/adding-an-aircraft.md); for an
avionics unit, [Adding a device](docs/adding-a-device.md).

## Documentation

- [Architecture](docs/architecture.md) and the [design spec](docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md)
- [Contributing](CONTRIBUTING.md), [Governance](GOVERNANCE.md), [Roadmap](ROADMAP.md), [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md) (report vulnerabilities privately there) and the [security assurance case](docs/security-assurance-case.md)

## Accessibility

Quality priorities are ranked in [ADR-0002](docs/adr/0002-quality-priorities.md).
Existing accessibility support (screen-reader names, keyboard routes,
reduced motion, low-vision support) is kept, but new work does not spend effort
on it, because the audience is pilots who meet medical standards. Touch targets
of at least 44 px, legible panel lettering and a printed label on every
operable control remain requirements. Phones are out of scope.

## Licence

MIT. © 2026 Patrick Kuhn

Geist and Geist Mono are under the SIL Open Font License 1.1; see apps/web/public/licenses/.
