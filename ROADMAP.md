# Roadmap

**Intent, not commitment.** This is the direction of the Cockpit Procedure
Trainer for roughly the next year. It is not a schedule or a promise; items
move, slip and get dropped, and dates are absent on purpose because a
single-maintainer project cannot honour them (see [`GOVERNANCE.md`](GOVERNANCE.md)).

The authoritative, current view is the
[issue tracker](https://github.com/DocGerd/cockpit-procedure-trainer/issues)
and its [milestones](https://github.com/DocGerd/cockpit-procedure-trainer/milestones);
what has shipped is in [`CHANGELOG.md`](CHANGELOG.md). Quality priorities that
shape ordering are in [ADR-0002](docs/adr/0002-quality-priorities.md).

## Now and next

The open milestone holds the current work: a cockpit re-layout that places
avionics devices in the panel with a dock, and the practice modes built on it.
Check the milestone page, not this file, for its contents.

## Themes for the next year

- **Cockpit realism and layout.** Devices in panel slots, a one-viewport
  cockpit on desktop first (1920x1080), then 4K, then tablet. Phones stay out
  of scope ([ADR-0001](docs/adr/0001-architecture-and-aircraft-contract.md)).
- **Procedural correctness.** More faithful systems logic and clearer feedback
  on wrong actions; more aircraft and checklists, written in our own words from
  paraphrased intake notes.
- **Supply-chain and project hygiene.** A coverage threshold, signed release
  artifacts, keeping CodeQL scanning and Dependabot current, and keeping the
  OpenSSF Best Practices badge
  ([project 15281](https://www.bestpractices.dev/projects/15281)) current.
- **Maintainability.** Keep package boundaries enforced and the add-an-aircraft
  path cheap.

## Explicitly not planned

- A backend, accounts, telemetry or tracking.
- Flight physics: this is a procedure trainer, not a simulator.
- Handbook scans or manufacturer artwork in the repository.
- Phone layouts.

Proposals are welcome as issues; see [`CONTRIBUTING.md`](CONTRIBUTING.md).
