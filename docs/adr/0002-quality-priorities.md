# ADR-0002: Quality-attribute priorities

## Status

Accepted, 2026-10-06.

## Context

Quality goals pull against each other: aircraft realism against convenience,
smooth interaction against offline caching, brand polish against a faithful
panel. Agents build this project and decide most trade-offs alone, so the owner
fixes the order once.

## Decision

**Gates.** Never traded off; a change that breaks one is not mergeable.

- **G1 Legal and copyright.** No handbook scans, manufacturer artwork or
  third-party photos in the repo. Art is self-drawn. Each aircraft states the handbook
  revision it follows (spec section 7).
- **G2 Security and privacy baseline.** Static app, no backend, no accounts.
  No tracking or telemetry, no runtime calls to third-party origins, a strict
  CSP, dependency hygiene (Dependabot, lockfile).

**Ranked qualities.** In a conflict the higher one wins.

1. **Procedural correctness.** The trainer never teaches a wrong flow; the
   systems model follows the aircraft handbook.
2. **Training UX.** Realism, learnability, printed panel labels, 44 px touch
   targets, lettering minimums legible at the panel floor. On the cockpit panel aircraft
   realism beats convenience; convenience (hints, checklist, zoom) lives only in
   the app frame.
3. **Performance.** Fast load, smooth panel interaction. Ranked above offline
   because feel is part of training UX.
4. **Reliability and offline.** The PWA works at the airfield without a
   network.
5. **Maintainability and extensibility.** Package boundaries, one package per
   aircraft, tests, lint.
6. **Visual polish and brand.** `tokens.css`; the brand styles the frame,
   never the panel.
7. **Accessibility.** Screen-reader names, keyboard routes, announcements,
   reduced motion, low-vision support. Existing support stays; new work does
   not spend effort on it, and reviews do not raise it as a finding above this
   rank.

**Device priority.** HD desktop (1920x1080) first, 4K second, tablet later;
phones stay out of scope (ADR-0001). The whole cockpit fits one viewport (issue #253).

**How to apply.** In a conflict pick the higher-ranked quality. A lower one is
sacrificed only if the PR description names the trade-off and the reason, and
the milestone summary carries it. Gates are never traded.

## Consequences

- Agents settle quality conflicts by this list without asking the owner.
- Tablet and offline work follow desktop work; they are not dropped.
- The spec's device decision now reads desktop first, superseding "Tablet and
  desktop; touch and mouse both first-class".
- Accessibility was moved from rank 2 to the lowest rank on 2026-10-07 (owner
  decision, #356): a pilot has high medical requirements and is not blind or
  bad-sighted.
