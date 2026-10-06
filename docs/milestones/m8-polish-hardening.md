# M8 Polish & hardening (v0.9.0)

Milestone M8 is released as v0.(8+1).0, so this is v0.9.0. On GitHub it is milestone 9. You scoped it on 2026-10-06 from the M7 follow-ups plus the Content-Security-Policy gate: no new aircraft or feature, but a strict CSP, fixes to what M7 left visibly rough, and tests that guard the one-viewport cockpit against regressions.

## What shipped

- **Strict Content-Security-Policy** (#291, closes #258; ADR-0002 gate G2). The built app carries a CSP `<meta>` that loads scripts, workers, connections, images, fonts and the manifest from the app's own origin (plus `data:` URLs for images and fonts), with no `'unsafe-inline'` or `'unsafe-eval'` anywhere. The device screens' inline styles moved into stylesheets. `csp.spec.ts` visits every view of every aircraft, with the service worker blocked and active (including an offline reload), and fails on any policy violation. `pnpm dev` is unaffected.
- **Neighbouring touch targets checked for overlap** (#299, closes #271). `floors.spec.ts` now fails when two operable targets of a view overlap at its floor, in English and German. Two real overlaps on the demo switch row were fixed by re-spreading the row; the rest are accepted by name with a reason (see Decisions and Open question 1).
- **Header chips** (#290, closes #232): long procedure titles and the aircraft name end in an ellipsis inside their own chip instead of spilling over the phase selector; at 1920x1080 and 4K they show in full.
- **CTSL compass enlarged** (#293, closes #281): a larger compass with larger card lettering, so the take-off compass check reads at the panel's smallest size; an e2e test measures the card lettering.
- **CTSL blanking plates** (#296, closes #259): the empty radio, transponder and GPS bays on the Panel view are drawn as blanking plates with bare unit placards, and the two lamp recesses read as lamps.
- **CTSL knee-board cards** (#288, closes #243): drawn smaller, with the rule line clear of the title; `kneeboard.spec.ts` checks it.
- **Handbook revision localised** (#289, closes #260 and #158): the picker card shows each aircraft's handbook revision in German as well as English; the validator reports an empty translation.
- **No page scroll in the tabs layout** (#292, closes #278): the panel's fit now leaves room for the footer, so the demo no longer scrolls at 1024x768 or in a short desktop window.
- **Cockpit arrangement hardened** (#294, closes #280): a new validator finding for an invalid cell rectangle, the layout choice falls back to tabs for an uncovered view or an unusable cell, and the demo's keyboard and screen-reader order now follows its panel layout (panel, radios, console).
- **Shared spring-aware procedure walker** (#295, closes #267): the core `walkProcedure` now enforces spring rest positions, so the per-aircraft test copies are gone. Aircraft authors note: a procedure that presses a spring-back position while its control is away from rest now fails the walk (documented in `docs/adding-an-aircraft.md`).
- `CLAUDE.md` tightened after the M7 audit, and `reference/` added to `.gitignore` (#287, closes #286).
- From the release review: package stylesheets are now linted by the tokens rule too (#303, closes #300).
- Also in this release, outside the milestone: the deferred 3D renderer design (#268), stored as a proposal only (status "Proposed — deferred"), not built.

## Decisions made

The spec's decisions table is unchanged. The one-viewport design's Decision 7 is rewritten by #299: target overlap is now checked at the floors but does not set them, and its open question 2 is marked superseded.

### Your decisions this milestone

- Milestone scope: the M7 follow-ups plus the CSP gate (2026-10-06).
- The `CLAUDE.md` audit edits you approved (#287).

### Agent decisions you may overrule

- **The automation recommender was not run** alongside the `CLAUDE.md` audit: the repository already has its own skills, agents and guard hooks, and generic recommendations would mostly duplicate or collide with them.
- **CSP as a build-only meta tag** placed at the top of `<head>` (#291), because GitHub Pages cannot send response headers. No `style-src` directive, so styles fall back to `default-src 'self'`; inline device styles moved to stylesheets rather than hashed. The service-worker-active CSP run lives in the `chromium` Playwright project instead of the `offline` project.
- **Handbook revision becomes localised `Text`, `CONTRACT_VERSION` stays 1** (#289): nothing checks the version at runtime and all aircraft packages live in this repository (plan M2 decision 19). For aircraft authors this is a contract change (a plain string no longer typechecks); `docs/adding-an-aircraft.md` says so. The German CTSL revision is our translation; the document number stays verbatim. #158 asked exactly for this and is closed with it.
- **Knee-board cards drawn smaller instead of filled** (#288): the intake's speeds are unlabelled numbers and a card line holds only a few characters at the placard minimum; VNE stays out while it is open in the intake (§9).
- **Blanking plates with bare unit placards** (`COM RADIO`, `TRANSPONDER`, `GPS`) rather than drawn unit faces or a "see … view" pointer (#296): the units are operated in their own views, and a real panel plate never names a trainer view. The second warning lamp stays unlabelled because the intake lists it as unidentified.
- **Compass: larger placement plus larger lettering** (#293). No floor or cell moved. The lettering check was not extended to all indicator artwork, because every CTSL gauge would fail it and fixing them would threaten the HD one-viewport fit (filed as #297).
- **Header chips** lose their fixed maximum width and shrink only when the header runs out of room (#290), so the desktop sizes show full text and tablets still truncate.
- **Tabs-layout fit measures the footer in script** (#292), shared with the combined layout's measurement, because the footer wraps to two lines on narrow widths.
- **Demo cockpit cells reordered** (panel, radios, console) rather than rewording the design (#294); this changes the demo's keyboard and reading order, so it has a changelog entry. The validator and the layout choice share one usable-rectangle check.
- **Core `walkProcedure` changed in place** (#295): a spring-back press from a non-rest position now fails the walk. The test fixture gained an "Ignition BOTH" step. The M7 summary is left untouched as a historical record.
- **Touch-target overlap model** (#299): each target counts as its rendered box grown to at least the touch-target size around its centre. Overlaps inside small multi-position controls and the CTSL breaker rows as fitted would need higher floors and so lose the HD fit; they are accepted by placement id in `floors.spec.ts`, each with what a tap loses there, and the test fails once an accepted overlap disappears. The CTSL breaker rows are not re-laid out because the intake (§3.2) fixes them as fitted. Quality sacrificed (ADR-0002): touch precision on those controls, for the whole cockpit in view at HD and realism.

## Open questions for the owner

1. **Touch operability vs the HD fit** (#299): several stacked positions of small multi-position controls are only partly tappable at their floors, and for some a tap at their centre lands on the next position. The measured table is in the body of PR #299 (the worst cases are the demo BAT and ALT OFF positions). Accept, or raise those controls' floors or rework the position buttons, at the cost of the HD fit?
2. **CTSL gauge lettering** (#297): the gauge lettering renders well below the legibility minimum at the panel floor. Any fix touches the HD one-viewport decision. Schedule it?
3. **Truncated header chips** (#298): touch users have no way to see the full text of a truncated chip.
4. Should the app frame point users from the CTSL blanking plates to the Radio stack and GPS views (#296 kept any pointer off the panel)?
5. **Clickjacking**: a meta CSP cannot set `frame-ancestors`. Protection needs a host that sends response headers, and hosting is a spec decision. Wanted?
6. **Carried over from M7**: if the HD fit ever falls short, which chrome gives way first (a collapsible checklist column, or the outside view folded into it); and the club and instructor list in `docs/aircraft/ctsl-intake.md` §9 (VNE, the second warning lamp and the rest).

Follow-ups filed without milestone: #297 (CTSL gauge lettering), #298 (full text of truncated header chips); from the release review, #301 (fail every e2e spec on a CSP violation, not only the view walk) and #302 (a stale validator comment and a test-typing workaround).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e` (includes `csp.spec.ts`, `floors.spec.ts`, `kneeboard.spec.ts`, `lettering.spec.ts` and `layout.spec.ts`). CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- In a browser at 1920x1080 CSS px:
  1. View the page source: a `Content-Security-Policy` meta tag sits at the top of `<head>`. Open DevTools and use every view of both aircraft: the console shows no CSP violation.
  2. CTSL Panel view: the compass is larger and its card letters are readable; the empty radio, transponder and GPS bays are blanking plates with placards; the knee-board cards' rule line clears their titles.
  3. Start a long procedure such as the CTSL rescue-system procedure: the header shows the full title; narrow the window to 1440 px and it ends in an ellipsis inside its chip.
  4. Switch the language to German: the picker cards show the handbook revision in German.
  5. Demo at 1024x768 (DevTools device toolbar): the page does not scroll and the footer is fully in view.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.9.0 --jq .tag_name` prints `v0.9.0`, and the prod footer reads `Version v0.9.0`.

### When you merge the release PR

Wait until the Deploy run's `prod-environment` job of the push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it. If it was cancelled, re-run it.
