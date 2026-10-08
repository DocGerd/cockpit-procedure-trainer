# M11 Cockpit re-layout (v0.12.0)

Milestone M11 is released as v0.(11+1).0, so this is v0.12.0. On GitHub it is milestone 12. It replaces the "own view per avionics device" arrangement with the device dock you decided on spike #339 (layout A): each device shows a live read-only mirror in its panel slot, selecting the slot opens the operable unit in a dock cell under the panel, and Guided opens the target device there instead of switching views.

This release also contains the first three M12 "Photorealistic panel" PRs, because they landed on `develop` before the cut: the spike and plan (#398), the glass layer, materials and perf harness (#401) and the demo backgrounds (#402). The rest of M12 landed before this release PR was merged, so v0.12.0 ships all of M12 as well; its summary is `docs/milestones/m12-photorealistic-panel.md`.

## What shipped

Visible in the app:

- **Device dock** (#384, for #349). A dock cell under the panel holds one operable device at a time, with a close button and an empty-state hint; in the tabs layout it sits below the tab panel and is shared by every tab. Every aircraft now declares a `dock` cell.
- **Live mirrors in the panel slots** (#386, for #348; #383, for #347). Each slot shows the device's read-only `Display` and is one button, named unit plus readout, that opens the unit in the dock. Every device package now exports `Screen`, `Display`, `readout` and `floor`.
- **CT Supralight in three views** (#387, for #351): panel, centre field, console. The `radios` and `gps` views are gone; COM, transponder and GPS sit in the panel. The panel floor is 950 px, which also removed the breaker-row target overlaps the floors test accepted before.
- **Demo radio section** (#397, for #352). A self-drawn RADIO bay below the controls holds the COM radio and transponder; the `avionics` view is gone, so the demo has panel and console.
- **Guided opens the device in the dock** (#400, for #353), rings its slot and the key to press, and never switches views. Practice opens and rings nothing; in Free explore a slot tap docks the unit.
- **Whole cockpit in a real 1080p window** (#399, for #388). Below the height the combined layout needs, the outside-view strip folds to a minimum band, then hides, before the layout falls back to tabs.
- **Header chip dialog opens under its chip** (#382, for #341), kept inside the window.
- **Checklist footer stays in view** (#410, for #408): the Restart button, and after review also the end-of-procedure actions, are pinned at the pane's bottom edge while it scrolls.

For contributors and the test suite:

- **Spec and docs for the dock** (#381, for #346): main spec decisions row, §4.3, §4.9 and Modes; one-viewport spec §1 to §5, §7 and new §4a; design brief S1, S2, S8 and S12.
- **Viewport matrix** (#406, for #355). `layout.spec.ts` runs one row per registered aircraft at 1920x1080, 1920x950, 3840x2160, 1024x768 and 768x1024, checking the layout and strip state against the production rule and an `expectedStates` table, floors, no page scroll, the footer, 44 px targets, panel colours and lettering. The CTSL indicator-face rows are `test.fail` with a pointer to #391, so they fail once the M12 art fixes them and the entry has to go. `CONTRIBUTING.md` documents the matrix.
- **`docs/adding-a-device.md` matches the code** (#405, for #404): `deviceEntries`, `unitNames`, the device-entry test tables, `readout(state, language, on)`.
- **Contract tests**: `tools/device-entry.test.ts` (every device's entry, mirror aspect and lettering, floors) and `apps/web/src/device-keys.test.tsx` (every Screen key carries `data-control`, and `data-position` where it stands for one position).
- Also in this release, outside the milestone: M12 #398, #401 and #402 (see above), and the OpenSSF silver learnings in `CLAUDE.md` (#380).
- From the release review: nothing needed fixing before release. Its verdict was "ship with follow-ups"; it filed #415 (spec and `docs/adding-an-aircraft.md` still call the dock cell optional and carry stale counts) and corrected the folded changelog bullets of #347, #351, #385, #389, #395 and #408 (wording, the M12 prefix, and the footer bullet widened to the end-of-procedure buttons).

## Decisions made

Your decisions on spike #339, recorded in the spec by #381: dock layout A, 950 px panel floor, an empty dock that Guided fills, a demo radio section. The spec's decisions table changed only in its "Cockpit layout" row, with your approval. The accessibility ranking (ADR-0002) shaped several choices below.

### Proposed CLAUDE.md replacements (your approval needed)

The dock PRs (#384, #386, #387, #397, #400) superseded two `CLAUDE.md` rules in their descriptions only. Proposed wording:

- Replace "Avionics devices get their own view (like `radios`/`gps`); a device in a scaled panel slot misses the 44 px touch targets." with: "Avionics devices install in panel slots as live read-only mirrors and open operable in the cockpit's required `dock` cell, which is at least every installed device's `floor` (a scaled slot misses the 44 px touch targets)."
- Replace "Adding an avionics device: … entries in `deviceRegistry` and `deviceScreens` …; see `docs/adding-a-device.md`." with: "Adding an avionics device: a new `packages/device-<id>` exporting `Screen`, `Display`, `readout` and `floor`, every Screen key carrying `data-control` (and `data-position` for a one-position key); its entries in `deviceRegistry` and `deviceEntries` in `apps/web/src/device-registry.ts`, its unit name in `unitNames`, its rows in the `tools/device-entry.test.ts` tables, and its workspace dependency in `apps/web/package.json`; see `docs/adding-a-device.md`."

### Agent decisions you may overrule

- **Dock contract** (#381, #384, #397): `dock` is a `CockpitCell` beside `views`, validator code `invalid-cockpit-dock`; optional while the CTSL moved over, required since #397. The floor check is a test (`aircraft-validation.test.ts`), not the validator. Only 950 px is stated in the spec; the floors test owns the other numbers.
- **No Esc route for the dock** (#384): not in the spec and accessibility ranks lowest; the close button returns focus to the opening slot. Auto-open in Guided does not move focus (#400).
- **Mirror details** (#383, #386): the bezel prints the literal unit name (COM, XPDR, GPS), unlocalized; the slot's accessible name is `<unit name>: <readout>` from a localized `unitNames` table; a dark unit reads "Off". `readout` takes bus power as a third argument because power lives in the session, not in device state. `floor` is the device frame at which the operable Screen is at natural scale (#383 has the measured sizes). The contract test pins sizes instead of running a browser, because `check` installs Chromium after the unit tests.
- **`slotMode()`** (#386) always returns `mirror` while `IN_SLOT_OPERATION` is false; #340 (operable in-slot devices, backlog) flips it.
- **Tabs layout reserves the empty dock** (#387, #397) so the footer stays in view at 768x1024 and 1024x768; a docked device scrolls the page there (tablets rank last).
- **CTSL dock and arrangement** (#387): panel over dock on the left, centre field over console on the right; the dock's minimum width is set by the tallest floor (GPS) at the cell's aspect, not by the widest. CTSL at 1920x980 is now tabs (#399 later brought it back to combined with the strip hidden).
- **Demo arrangement** (#397): radio section below the controls with the slots side by side, because a wider or taller panel broke the placards at 768x1024 or 1024x768. The dock cell is wider than the panel so the transponder's floor and the close button fit, which leaves unused space under the console at 1920x1080 (the demo has no centre field). The demo's overlap acceptances stay: spacing the toggles out would need a floor the layout cannot afford.
- **Strip fold** (#399), resolving the one-viewport spec's open question 1: whole, folded, hidden, then tabs; header, footer, checklist column and shell padding unchanged (Decision 3). The 72 px minimum band was chosen by eye on the CTSL outside images: narrower bands showed only the tree line, so below it the strip hides. No hard-coded breakpoint: `outsideViewFold` is per-aircraft arithmetic on the floors (#399 has the measured thresholds).
- **Demo strip thresholds moved** with the demo re-layout: #399 measured the demo before #397 landed, and the train's conflict resolution moved the demo's strip-height steps in `layout.spec.ts` (#399 has its pre-#397 numbers). Judgement call for you: the thresholds come from the rule, so the test follows the art; no issue filed.
- **Guided key ring** (#400): rings the keys of the step's position, else every key of the control, else the unit; done by `useKeyRing` after render, so Screens hold no mode logic. The dock opens once per step (a closed dock stays closed until the next step; a hand-docked unit is not swapped back). Guided to Practice leaves a docked unit in place. The lead widened #400's scope to the device Screens for `data-control`/`data-position`.
- **Chip placement** (#382): CSS-first at the chip's start edge, `end` when that leaves the viewport, the old header-edge position when neither fits; no inline style, so the CSP is untouched.
- **Viewport matrix states derived from the rule** (#406), with `expectedStates` pinning the spec's outcome so a rule change cannot pass unnoticed; the #391 rows are `test.fail` rather than `fixme` after review.
- **Checklist footer** (#410): the review extended the sticky footer to the end-of-procedure actions (`.checklist-actions`), which clipped the same way.

## Open questions for the owner

1. **Spec open question 1** is struck through as decided by #399 (strip folds, then hides, before tabs; 72 px minimum band). Confirm the wording and the band.
2. **Fidelity spike #360** (how much system logic to simulate, how to show wrong actions) is still open and unmilestoned: a spec decision for you.
3. **Indicator-face lettering below 10.5 px** on the CTSL is pre-existing, now caught by the matrix's `test.fail` rows, and is fixed by M12 #391 (also #297).
4. **ADR-0002 reading for M12**: hardware-recognisable realism counts as rank 2 (Training UX); finish beyond what makes the hardware recognisable counts as rank 6. Confirm before the M12 art tasks trade against it.
5. **What "photorealistic" means for M12**: the art is judged against a rubric the agents wrote (plan `docs/superpowers/plans/2026-10-07-m12-photorealistic-panel.md`, "Rubric for the ui-verifier"): each visual heading is scored 0 (absent) to 3 (could pass for a photograph) on crops at device scale factor 2, and an element passes when every heading scores at least 2 ("convincing: at a glance it reads as the real material") and the mean is at least 2.5. The furthest examples on `develop` are the demo panel and console backgrounds (#402: the implementer's self-scores are 2.75 to 3.0 on four headings, the independent ui-verifier gave 2.25 to 2.5 per crop, at or below the bar) and the CTSL airspeed indicator with its glass above the needle (#401, no recorded score; the plan says the ui-verifier scored the spike's airspeed specimen below the bar). Is that level what you mean by "photorealistic", or should the bar be raised before the remaining M12 PRs land?
6. **Demo at 1920x950 is combined by a few pixels of panel slack** (#411): any chrome change flips it to the folded strip. Accept the knife edge, or give the demo room?
7. **No priority viewport exercises the folded strip** (#412): the folded state is covered only by the strip-height steps, not by the matrix's full checks.
8. **Tablet checklist overlay** (#414, from the #410 review): at 1024x768 with a long procedure the overlay's footer sits below the fold.
9. **Demo dead space under the console** at 1920x1080 (#397): accept as the cost of the dock cell, or ask for a demo centre field.
10. **Stale milestone text**: `docs/milestones/m8-polish-hardening.md` still describes the old radios and GPS views (noted in #387); it is a historical record, so it is left as is unless you want a note added.
11. **Spec drift on the dock** (#415, from the release review): the one-viewport spec §3 and §8, the main spec §4.3 and `docs/adding-an-aircraft.md` still describe the dock cell as optional; a docs fix that changes no decision.
12. **Backlog**: #340 (operable in-slot devices, `slotMode()` prepared) and #354 (keyboard route, dropped by the accessibility ranking).

Follow-ups filed at this release, without milestone: #411, #412, #414 and #415.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`.
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e` (`E2E_PORT=<port>` when 4399 is busy). The viewport matrix is in `layout.spec.ts`; new or changed: `dock.spec.ts`, `demo-radio.spec.ts`, `modes-dock.spec.ts`, `demo-modes-dock.spec.ts`, `checklist-footer.spec.ts`, `floors.spec.ts`. CI runs them in the required `check` job.
- Final-state screenshots: the `m11-<aircraft>-<viewport>[-<device>|-guided].png` set in `/tmp/claude-1000/-home-pkuhn-gaproctrainer/ed6433f4-5a16-484c-8fdd-fabc147ddcef/scratchpad/` (both aircraft at the five priority viewports, dock empty and with each device docked, plus Guided at 1920x1080); not committed.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- In a browser at 1920x1080, CTSL and demo:
  1. The panel shows three (CTSL) or two (demo) device mirrors; there is no radios, GPS or radio-stack tab.
  2. Select a mirror: the unit opens in the dock under the panel; close it and focus returns to the slot.
  3. Start a procedure with radio and transponder steps in Geführt: on each device step the dock opens that unit with the key to press ringed, and the view does not change. In Üben nothing opens.
  4. Resize the window to about 950 px of viewport height: the CTSL strip hides and the cockpit stays combined; lower still, view tabs appear with the empty dock band below them.
  5. Click the aircraft or procedure chip: its dialog opens under the chip.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.12.0 --jq .tag_name` prints `v0.12.0`, and the prod footer reads `Version v0.12.0`.

### When you merge the release PR

Wait until the Deploy run's `prod-environment` job of the push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it. If it was cancelled, re-run it.
