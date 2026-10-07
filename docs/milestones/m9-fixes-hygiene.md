# M9 Fixes & hygiene (v0.10.0)

Milestone M9 is released as v0.(9+1).0, so this is v0.10.0. On GitHub it is milestone 10. You scoped it as the bug and hygiene backlog: no new aircraft or feature, but three visible fixes, contract tests that now discover every device and package kind by themselves, and spec and design docs brought in line with the code.

## What shipped

Visible in the app:

- **Full text of truncated header chips at tablet width** (#317, for #298). In the tablet layout the aircraft and procedure chips open a small dialog with the full name or title, wrapping and never clipped, plus a "Change aircraft" or "Change procedure" button that goes back to the picker. It works by tap and keyboard; Escape closes it and returns focus to the chip. On desktop nothing changes: one tap goes back to the picker and the hover title shows the full text.
- **Browser chrome colour follows the theme you pick** (#323, for #178). Choosing light or dark in the app now switches the `theme-color` meta tags, not only the system setting, and a stored choice applies on load. Browser support varies; see Decisions.
- **Round gauge captions clear the needle** (#320, for #184). At tablet portrait the caption moves down below the needle tip instead of being crossed by it; at design size nothing moves.

For contributors and the test suite:

- **Package boundary catch-all** (#314, for #181). Any file under `packages/` whose package is of no known kind fails `pnpm lint`, so a new package kind cannot ship without boundary rules. One `packageKinds` table in `eslint.config.js` drives the catch-all and every per-kind block; `tools/boundary.test.ts` proves the rules fire.
- **Every e2e spec fails on a CSP violation** (#324, for #301). A shared auto fixture in `apps/web/e2e/fixtures.ts` records `securitypolicyviolation` events in every page of the test's context. An ESLint rule bans value imports from `@playwright/test` in specs, so a new spec cannot skip the fixture. `fixtures.spec.ts` proves it fires.
- **Device README contract** (#313, for #182). One test, `tools/device-readme.test.ts`, discovers every `packages/device-*` and checks its README against `tools/readme-contract.ts`: title, `## Source revision`, `## Controls` (one bullet per declared control) and `## Not modelled` (equal to the device's `notModelled` texts). `## Controls` is now required in `docs/adding-a-device.md`. The five per-device copies are gone.
- **Device stylesheet checks in `tools/`** (#311, for #302). `tools/device-css.test.ts` replaces the two per-device CSS tests and covers every device stylesheet. `tools/` is now typechecked (`tsc -p tools` in `pnpm typecheck`, root `@types/node`). The stale validator comment is back above `validateAircraft`.
- **Placard clearance measures moving parts as drawn** (#318, for #244). Turned bars and round parts are measured by their own outline instead of the upright box around them, a control with no measurable moving part fails, and the geometry has unit tests in `pnpm test`.
- **PWA build test** (#315, for #224): both sides of the inlined-SVG comparison go through one normaliser, so they cannot drift.
- **`workbox-window` declared** as a dev dependency of `apps/web` (#312, for #157); the build-config alias that worked around its absence is gone.
- **Wrong transponder digit pinned** (#316, for #186): a test and a comment, no behaviour change.
- **Docs**: the spec documents the M3 to M5 contract additions (#322, for #162); the design spec no longer claims the dark accent matches dark Azure's lightness (#309, for #160); the design brief's coverage tables are current (#310, for #161).
- #180 (stylelint in packages) was closed as already done by #303 in v0.9.0.
- Also in this release, outside the milestone: the M8 cycle learnings in `CLAUDE.md` (#308).
- From the release review: nothing needed fixing before release. Its verdict was "ship with follow-ups", and the five follow-ups it filed are listed under Open questions.

## Decisions made

The spec's decisions table is unchanged: #309 and #322 change prose only.

### Your decisions this milestone

- Milestone scope: the bug and hygiene backlog.
- #297 (CTSL gauge lettering at the panel floor) moved out of M9 at your request, because it needs a decision that touches the spec decisions table.

### Agent decisions you may overrule

- **#180 closed as already done** by #303.
- **Header chip dialog at tablet width only** (#317). Desktop keeps the one-tap back-to-picker and the hover title, because desktop HD is the priority viewport and nothing truncates at 1920. At tablet, going back to the picker is now two taps. The dialog uses React state rather than the native popover attribute, takes focus on open, and handles Escape in the capture phase so one Escape closes only the dialog, not the checklist drawer behind it. Known gap, wider than the PR assumed: the release review measured both CTSL chips truncating in the desktop layout at 1200, 1280, 1366x1024 and 1440 wide, with only a hover title (Open question 2).
- **`theme-color` by switching `media`** (#323). The tag for the chosen theme gets `media="all"`, the other `media="not all"`, so no colour value is needed at runtime and colours stay build-time from `tokens.css`. The build tags carry `data-scheme` so the runtime does not parse media strings. There is no restore branch, because nothing in the app clears a choice; a future "system" option must reset the attributes itself. The update runs in an effect like the existing `data-theme` one, so a first-paint lag is accepted. A runtime `media` change cannot be verified headless: the e2e checks which tag the media queries leave active, not the chrome colour. Support (from #323): Chromium on Android, installed PWAs and Safari 15 to 18 honour it; Firefox ignores it; iOS 26 and later uses the page background.
- **A wrong digit on the current item's own control is no deviation** (#316, for #186). Intended: spec data-flow step 4 counts only changes to controls that are not the current item's target, and a stepped control has to pass through wrong values. Pinned by a test, no logic change, no spec change.
- **Gauge caption slides down rather than being dropped** (#320). Dropping it would trade a label for a collision the dial has room to avoid. Which texts show at each size is unchanged, and the caption width stays. Left alone: at 768x1024 the widest caption still crosses the ends of the coloured arc (filed as #321).
- **Contract tests live in `tools/`** (#311, #313), which is now typechecked. They discover every device by themselves, so a new device is covered without a new test, and no package imports from `tools/`. `## Inputs` stays optional in device READMEs because a device does not declare its inputs; the source revision is only checked as non-empty.
- **Boundary catch-all scope** (#314): it covers ts, tsx, mts, cts and the js family; the known kinds' rule blocks still match ts and tsx only (filed as #319).
- **CSP fixture on the browser context** (#324), so pages and popups a test opens are covered too. Untested residual: a popup opened by the page itself is assumed covered by the context-level listener. Violations raised inside the service worker stay out of scope.
- **Clearance check** (#318): the issue's premise differed (round and rotated handles were already caught); the real gaps were false positives from the upright box and a vacuous pass with no moving part, and both are fixed. No exemption mechanism; a part that cannot be measured fails; only the current position is measured. No real panel gained an overlap.
- **`workbox-window` as `^7.4.1`** (#312), the version the lockfile already resolved; a dev dependency because the plugin bundles it at build time.
- **PWA SVG comparison** (#315): already symmetric in effect, so the fix is one shared helper plus the missing regression test; the build is untouched.
- **Docs** (#310, #322): the brief's drawn table is grouped by artboard pair and states no count, so it does not go stale; its "Specification of the missing screens" heading is now slightly stale. `docs/adding-an-aircraft.md` already covered every contract addition, so only the spec changed.

## Open questions for the owner

1. **CTSL gauge lettering** (#297): the gauge lettering renders well below the legibility minimum at the panel floor, and any fix touches the HD one-viewport decision in the spec decisions table. Which direction?
2. **Header chips truncating in the desktop layout** (#325): the full-text dialog is tablet-only, but the chips also truncate between tablet width and HD (the review measured both CTSL chips at 1200, 1280, 1366x1024 and 1440 wide). The layout switch looks at width only, so a 12.9-inch tablet in landscape gets the desktop layout: touch and keyboard users there still cannot read the full text, which was the complaint in #298. Mouse users get the hover title. Nothing truncates at 1920x1080. Extend the dialog to any chip that truncates, or accept for now?
3. **Merged branches on the remote**: the 14 feature branches of this milestone are still on GitHub, because the merge train ran without `--delete-branch`. Delete them?
4. **Carried over, if still open**: if the HD fit ever falls short, which chrome gives way first (a collapsible checklist column, or the outside view folded into it); and the club and instructor list in `docs/aircraft/ctsl-intake.md` §9.

Follow-ups filed without milestone: #319 (boundary rules skip `.mts`/`.cts` files in known package kinds) and #321 (gauge caption crowds the arc ends and numerals at 768x1024); from the release review, #325 (header chips truncate at desktop widths, Open question 2), #326 (drive zoom and the update prompt in the browser tests, so the CSP fixture sees them), #327 (`lettering.spec.ts` reaches into panel-kit internals by relative path), #328 (the device stylesheet test can pass vacuously) and #329 (a garbled sentence in the design brief).

The review also suggests, for your next `/revise-claude-md`, that the `CLAUDE.md` CSP rule say every e2e spec fails on a violation through `apps/web/e2e/fixtures.ts`.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` (`pnpm typecheck` now includes `tsc -p tools`).
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e`. Every spec now fails on a CSP violation; `fixtures.spec.ts` proves the fixture fires. CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- In a browser:
  1. At 1024x768 (DevTools device toolbar), start a long procedure such as the CTSL rescue-system procedure. Tap the procedure chip: a dialog shows the full title and a "Change procedure" button. Escape closes it and focus returns to the chip. Repeat with the aircraft chip and in German.
  2. At 1920x1080 the chips show in full, and one click goes straight back to the picker.
  3. With the system set to light, switch the app to the dark theme with the theme button in the header, and reload. In DevTools, `document.querySelectorAll('meta[name=theme-color]')` shows the dark tag with `media="all"` and the light one with `media="not all"`. On Chromium for Android or the installed PWA, the browser chrome turns dark.
  4. Demo aircraft at 768x1024: no gauge caption touches the needle tip.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.10.0 --jq .tag_name` prints `v0.10.0`, and the prod footer reads `Version v0.10.0`.

### When you merge the release PR

Wait until the Deploy run's `prod-environment` job of the push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it. If it was cancelled, re-run it.
