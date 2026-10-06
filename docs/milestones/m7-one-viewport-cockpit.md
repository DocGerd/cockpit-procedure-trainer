# M7 One-viewport cockpit (v0.8.0)

Milestone M7 is released as v0.(7+1).0, so this is v0.8.0. On GitHub it is milestone 8, still titled "M7 3D": you deferred the 3D view (#43) out of this milestone, so this release is the one-viewport cockpit, the runway-consistent compass and the version in the app frame. It contains no 3D.

## What shipped

- **The whole cockpit in one viewport on desktop** (#276, closes #253 and #226). At 1920x1080 and 3840x2160 both aircraft show every view at once, arranged as from the left seat, with the outside view on top and the checklist as a side column. Below the size where every view keeps its legibility floor (for example tablets at 1024x768 and 768x1024) the view tabs stay. #226 is met on desktop: holding the CTSL key on START keeps the tachometer in sight.
- Design and spec update for it (#269): the spec now targets desktop HD 1920x1080 first and 4K 3840x2160 second (you authorised this on #253), with a new "Cockpit layout" row in the decisions table. Design: `docs/superpowers/specs/2026-10-06-one-viewport-cockpit-design.md`; plan: `docs/superpowers/plans/2026-10-06-m7-one-viewport.md`.
- **Cockpit arrangement in the aircraft contract** (#275, closes #273): an optional `cockpit` key with one cell per view and a measured `minWidth` legibility floor per view, six new validator findings, and `floors.spec.ts`, which renders each view at its floor and runs the placard, touch-target and lettering checks.
- **CTSL bottom row made to fit HD** (#277, closes #274): larger self-drawn legends in the centre field and console, a GTX 327 laid out as a 3x7 key grid and a compact SL40. The CTSL arrangement is now 1396x596 and fits the HD region.
- **Runway-consistent headings** (#272, closes #254): each aircraft has one runway (CTSL runway 36, demo runway 27) and every phase heading derives from it, checked by a test. Both aircraft gain a lined-up-on-runway phase with its own outside view; the take-off starts with a compass-versus-runway check; the runway designator is painted in the outside views. The CTSL compass is now an indicator that turns with the phase heading, and the demo has a compass readout.
- **Version and copyright in the app frame** (#266, closes #246): production shows the released version, UAT adds the short commit; the copyright line comes from `LICENSE`. Works offline.
- **CTSL engine start fixed** (#265, closes #261): an "Ignition BOTH" step before "Key to START", so the guided run can reach START; spring-aware walk-through tests for both aircraft.
- From the release review: the version footer stays in view on the picker and also shows on the error screen (#282, closes #279).
- Also in this release, outside the milestone: quality-attribute priorities in ADR-0002 (#257, closes #256) and the M6 learnings in `CLAUDE.md` (#263, closes #262).

## Decisions made

The spec's decisions table gains the "Cockpit layout" row (#269, authorised by you on #253). The "Cockpit view" row (2D now, 3D later) is unchanged.

### Your decisions this milestone

- **3D (#43) deferred** out of this milestone. The design PR #268 stays parked as a draft.
- The 2D/3D choice will not be persisted (recorded on #268 for when 3D is built).
- Viewport priority: desktop HD first, 4K second; tablet and mobile later (#253).

### Agent decisions you may overrule

- **Ignition BOTH placement**: after "Propeller area clear", so the ignition is not live before the propeller is declared clear; the intake (N3) lists no BOTH step. The walk-through tests are per-aircraft copies because the core `walkProcedure` ignores spring rest positions; follow-up #267 (#265).
- **Version source** is the newest released heading in `CHANGELOG.md`, the same heading the release workflow tags from; no `package.json` carries a version. A build that cannot parse `CHANGELOG.md` or `LICENSE` fails (#266).
- **Runway definition stays aircraft-local**, not in the core contract: a core validator could not tell which phase lies on the runway without extra per-phase metadata. Cost: a near-duplicate `airfield.ts` in each aircraft (#272).
- **The CTSL compass check is a confirm item marked "trainer addition"**, because the intake's take-off checklists have no compass item (#272). The review of #272 turned the CTSL compass from background art into an indicator, because the heading bug you reported was still visible on the static card.
- The demo take-off procedure is titled "Take-off roll", so it does not collide with "Before take-off" in the picker tests (#272).
- **Layout switch is arithmetic on the declared floors**, not runtime measuring of legibility: combined is chosen exactly when every view, fitted into its cell, is at least its `minWidth` wide (#269, #276). Floors are measured by `floors.spec.ts` and are the exact lowest passing integer widths, with no margin, so a one-pixel renderer change shows as a test failure rather than an unnoticed regression (#275, #277). They are exact for the Chromium that the lockfile installs on CI; the CTSL artwork legends use system fonts (Helvetica or Arial), so a different Chromium or a different system font can also move a floor.
- **Chrome unchanged on desktop**: the outside view stays on top (the windscreen), the checklist stays a side column (Guided needs the current item in sight); tablets keep tabs; zoom stays per view (#269).
- **Zoom-reset button** floats over the top-right of the cockpit frame in the combined layout, so it never changes the measured region; while zoomed it can cover a corner of a cell, such as the GPS bezel (#276).
- **#226 is proven by holding START directly** in Guided with the tachometer and key in the viewport, not by walking the whole engine-start checklist, because the e2e helpers cannot drive the CTSL's artwork controls; the test does not prove the engine then runs (#276).
- **Radio stack floor 442 px**, 0.753 of before against a 0.75 target, accepted because the HD fit is met; reaching 0.75 needs a change to the shared device frame (#277).
- Some long CTSL legends are condensed (glyphs squeezed by up to about a quarter) to stay on their plates at the larger size (#277).
- Target overlap is not part of the layout rule; follow-up #271 (#269).
- **Sticky footer** on every screen except the trainer (picker and error screen), so it stays in view at any picker height; the trainer keeps its one-viewport layout (#282).
- **Error-screen footer outside the dialog**: it sits outside the `aria-modal` alert dialog, so assistive technology may treat it as inert while the error shows; it carries visual version information only (#282).

## Open questions for the owner

1. **Milestone title**: milestone 8 is still titled "M7 3D". Rename it (for example "M7 One-viewport cockpit") when you close it?
2. **When to schedule 3D** (#43, design in draft PR #268)? A CTSL 3D cockpit needs measured cockpit dimensions.
3. **If the HD fit ever falls short again**, which gives way first: a collapsible checklist column, or the outside view folded into the checklist column? (design §11)
4. **Compass legibility**: the new take-off item asks the pilot to read the CTSL compass card, whose lettering renders at only about 5 to 7 px on desktop; the legibility tests cover control faces, not indicator artwork. Filed as #281 without milestone; schedule it for the next milestone?
5. **Carried over**: the club and instructor list in `docs/aircraft/ctsl-intake.md` §9 (engine 912 UL or ULS, rescue system and with it VNE, carb heat, how the engine fire ends, and the rest).

Follow-ups filed without milestone: #267 (shared spring-aware procedure walker), #270 (strict Content-Security-Policy, which ADR-0002 asks for; it duplicates the earlier #258, so one of the two can be closed), #271 (overlapping 44 px touch targets), #278 (demo page scrolls by a few pixels at 1024x768 in the tabs layout); from the release review, #280 (cockpit arrangement hardening: uncovered views, cell rects, demo cell order) and #281 (compass card lettering).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e` (includes `layout.spec.ts` and `floors.spec.ts`). CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- In a browser viewport of 1920x1080 CSS px (a maximised window at 100 % OS scaling, or the DevTools device toolbar set to 1920x1080; 125 % scaling on a 1080p screen leaves about 1536 px, where the CTSL correctly keeps the tabs), and at 3840x2160 if you have it:
  1. Pick either aircraft: every view shows at once, no view tabs, no page scroll. Narrow the window to tablet size: the tabs return.
  2. CTSL, Guided, "Engine start and taxi": the checklist turns the key to BOTH, then holding START keeps the tachometer in sight.
  3. CTSL, "Normal take-off": the first item is the compass check ("Compass reads 360°, the heading of runway 36"); the compass card shows N under the lubber mark. Pick another phase in the header Phase selector (during a procedure it asks "End the procedure?"; confirm): the card turns with the heading, for example Cruise puts S under the mark.
  4. The footer shows the version and copyright; on UAT it adds the short commit.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.8.0 --jq .tag_name` prints `v0.8.0`, and the prod footer reads `Version v0.8.0`.

### When you merge the release PR

Wait until the Deploy run's `prod-environment` job of the push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it. If it was cancelled, re-run it.
