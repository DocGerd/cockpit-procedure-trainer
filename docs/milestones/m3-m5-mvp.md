# M3–M5 MVP (v0.6.0)

One release for three milestones: M3 Web shell, M4 Demo aircraft and M5 Offline and tablet. Milestone M5 is released as v0.(5+1).0, so this is v0.6.0; v0.4.0 and v0.5.0 are skipped on purpose. The M5 plan's release task supersedes the M3 plan's.

## What shipped

The trainer is now usable end to end in the browser: pick the demo aircraft and a procedure, fly it in Guided, Practice or Free explore on a panel of generic GA widgets and two device screens, in German or English, light or dark, on a desktop or a tablet, installed as an app and offline.

### M3 Web shell

- App shell: layout for tablet and desktop, header, aircraft and procedure picker, theme switch and the trainer store the features use (#127, closes #19).
- German and English interface: per-feature message files with a compile-time and a scanned key parity check, and a remembered language switch (#129, closes #28).
- Panel renderer: view tabs, background and placements, fitted to the viewport (#141, closes #20).
- Generic GA control widgets (#135, closes #21) and indicators (#130, closes #22) in the panel kit.
- Layer renderer for aircraft artwork with a fallback to the generic widget (#131, closes #23).
- Panel-kit gallery page, development builds only (#139, closes #24).
- Checklist pane with item states and check-off, and the deviation summary (#134, closes #25).
- Guided, Practice and Free explore modes (#147, closes #26).
- Outside-view strip and the header phase control with a confirmation (#137, closes #27).
- Error boundary with reset, image placeholder and training-aid notice (#132, closes #29).
- Device screens in the panel, with a dark screen when unpowered (#146, closes #45).
- Widget legibility, overflow and guarded-handle focus (#144, closes #140).
- Brand tokens checked against the DocGerdSoft brand bundle (#120, closes #94); type and spacing literals linted in TS/TSX (#121, closes #95).
- Remaining screens drawn on the product's design canvas, with the corrections listed under open question 5 (#150, closes #77).
- Carried from M2: readable errors for control position typos (#116, closes #101), the validator rejects inexact lever targets (#119, closes #118), the session no longer steps systems while failed (#115, closes #110).
- Plans: M3 web shell (#117, synced with the final shell interface in #128), M4 and M5 (#122).

### M4 Demo aircraft

- A fictional demo aircraft with three views (panel, console, radio stack), three normal procedures and an alternator-failure procedure (#138, closes #30).
- Generic COM radio and transponder devices and the device authoring guide (#133, closes #46), installed in the demo with a radio procedure (#151, closes #123).
- Optional declared size for panel views (#143, closes #142).
- Procedure walk-through test over every normal procedure of every registered aircraft (#126, closes #31).
- Authoring guide for adding an aircraft (#145, closes #33).
- Browser tests in CI (#164, closes #32), extended with a Practice run and an offline reload (#177, closes #168).
- One deviation per operation of a held control (#167 pins it with tests; fixed in #165, closes #166). Each spring-back action item needs its own press (#154, closes #153).

### M5 Offline and tablet

- PWA: manifest, service worker, offline after one visit, update prompt (#148, closes #34); the Playwright and PWA plugin dependencies came first (#136, closes #124).
- Touch polish: hit areas, press-and-hold, pinch zoom and pan (#149, closes #35).
- Accessibility: keyboard operation of every control, accessible names and positions, reduced motion, checklist announcements (#165, closes #36).
- Device screens scale to their install box (#156, closes #152); the demo's stacked radio stack keeps them legible and operable at tablet width (#200, closes #198).
- Tablet landscape fit: one-row header, panel height, device names in the summary (#163, closes #155).
- Guided deviations on the closed tablet checklist toggle, and the picker fits without page scroll (#201, closes #199 and #183).
- Whole-release review fixes: documentation drift (#173, closes #171), the prod worker no longer deletes the UAT precache (#174, closes #169), coalesced drag deviations (#175, closes #170), widget fit and options checked in CI (#176, closes #172), touch gate for pinches, corrected Free explore copy and Guided pan into view (#197, closes #196).

## Decisions made

Each was made in the PR named. The spec's decisions table is unchanged.

### M3 Web shell

- An action item on a continuous lever may target only 0 or 1 (M2 open question 4, plan Decision 9). Intermediate settings are check items or notches; the validator reports `inexact-lever-target` (#117, #119).
- Translations live in one `messages.ts` per feature built with `defineMessages`, so parallel features never share a dictionary file; a scan over every messages file catches a plain object that bypasses the helper (#117, #129).
- The default language is the stored choice, else German when the browser language starts with `de`, else English; `<html lang>` follows it (#129).
- Panel hardware colours are their own theme-independent `--panel-*` token group. The panel has its own neutral focus colour, `--panel-focus`, which is neither the brand accent nor a status colour (#127).
- The desktop layout starts at 1200 px wide, above a landscape tablet, where a docked pane would squeeze the panel (#127).
- The phase control is a native select with a visible label, not the canvas's pill row, so it stays compact for any phase count. A phase jump asks first in an in-app dialog; Free explore asks the same before ending a procedure. The confirmation dialog is one shared component (#137, #128).
- The Free explore confirmation now says it resets the cockpit to the start of the current phase. The old copy said the controls stay where they are, which was false; the behaviour is unchanged (#197).
- Practice shows no deviation information at all until the summary: no banner, no per-item mark, no footer count. Guided shows a banner and marks deviated items (#134, canvas aligned in #150; see open question 6).
- Item states differ by glyph and accessible name, never by colour alone (#134).
- The round gauge has a fixed 270-degree sweep and is a `meter` for assistive technology; an invalid indicator option renders an unmarked placeholder instead of throwing (#130).
- Panel text never renders below the smallest type size: a widget placed too small drops numerals, then units, then legends. Position legends are upper-case placards, not translated text (#144).
- Device screen legends are hardware markings in English, not translated; device groups are named by the device id, because a device has no translatable name yet (#133, #146, #165).
- A device screen that is off shows a dark scrim that does not block input, because the transponder's mode keys are how a pilot turns it on (#146).
- Image coordinates come from the view's declared size first, then the SVG viewBox, then the extent of the placements (#141, #143).
- Panel arc and lamp colours are instrument markings drawn from `--panel-arc-*` and `--panel-lamp-*` tokens, not app status colours (#127; see open question 3).
- Panel-kit consumers' type checks see its CSS declarations through a triple-slash reference in the artwork stage (#133).

### M4 Demo aircraft

- The demo gained a fourth phase, `departure`, so the phase control has several entries (#138).
- Device controls with relative knobs are rotaries with spring-back detents; volume is a continuous lever, so procedures target only its stops (#133).
- The devices sit in a third view, the radio stack, because the screens need a wide, short view to keep a usable scale (#151).
- Each spring-back action item needs its own press, so two consecutive identical presses no longer complete on one. The checklist receives the control definitions to know which positions spring back (#154).
- Repeated identical deviations from one drag are coalesced into one; any other control change, completion or check-off ends the run (#175).
- One operation of a held control records one deviation: held-Enter key repeats no longer re-operate it (#165, guarded by the tests of #167).
- The release review found that #164 had dropped the Practice and offline browser flows without a tracked decision; #177 added both, with the offline flow in its own project that allows the service worker.
- The views can declare their size; `invalid-view-size` and `placement-outside-view` are new validator findings (#143).
- The aircraft guide tells authors to add the aircraft's workspace dependency to `apps/web/package.json` besides the registry entry (#145; see open question 8).

### M5 Offline and tablet

- Each environment's service worker is scoped to its own base path with its own cache. The production worker skips `cleanupOutdatedCaches`, because workbox matches caches by scope and the prod scope is a prefix of the UAT one; UAT keeps the cleanup (#122, #174).
- The first install controls the page at once; later versions wait until the pilot accepts the update prompt. "Later" lasts until the next start (#148).
- The UAT install carries a `UAT` suffix and its own manifest id, so both installs can live on one device (#148).
- Pinch zoom runs from 1 to 4 times the fitted size. A touch that starts on a control is held by a gate until it is the only touch: it operates once it drifts, lifts or is held briefly, and a second finger before then discards it. The gate is scoped to the touched control; mouse, pen and keyboard stay immediate (#149, #197).
- Discrete controls keep the `radiogroup`/`radio` roles rather than the M5 plan's `slider` (Decision 6), with arrow, Home and End keys and spring detents on key down and up (#165; see open question 7).
- Checklist steps and completion are announced in a polite live region that never carries deviation information. Focus that was lost moves to the current item; the tablet drawer manages its own focus (#165).
- On a tablet with the checklist closed, a Guided deviation shows as a count badge on the checklist toggle, in its accessible name and in the live region. The compact picker layout now applies up to 1024 px viewport height (#201).
- The demo's radio stack is stacked so the device screens meet at least 11 px text and 44 px targets at tablet width; the review measured 15 px text and 47 px buttons at every tested viewport, 768 by 1024 included (#200).
- The aircraft appearance check validates widget ids, widget fit to the control kind and indicator options, using the widgets' own option readers; artwork appearances are not checked (#176).

## Open questions for the owner

1. **Real-tablet check (#125) gates your merge of this release PR.** Touch, pinch zoom, install, offline and the update prompt; also a tap right after a pan, and the device screens at portrait width.
2. **M2 open questions still unanswered:** (a) the aircraft validator runs inside `pnpm test`, not as a named CI step — confirm or ask for the step; (b) moving the current item's own control through a wrong in-between position is not a deviation; (c) `jumpToPhase` abandons the active procedure, which the header phase control now triggers. (d) is settled as M3 Decision 9: lever action targets only 0 or 1, enforced by `inexact-lever-target`.
3. **Panel arc and lamp colours.** The green, yellow, red and white gauge arcs and the lamp colours are instrument markings from the `--panel-arc-*` and `--panel-lamp-*` tokens, ruled allowed on the panel because they are not app status colours. Confirm.
4. **Device-screen legibility.** Resolved for the demo by #200. #159 stays open for aircraft with smaller install boxes.
5. **Design canvas versus the app (from #77).** The summary is a pane in the app but a full page on the canvas; the checklist value column; the language switch is two buttons in the app and a toggle on the canvas; the brand mark size; the coverage table in `docs/design/brief.md` is stale (#161). Pick which side wins for each.
6. **Practice shows no deviation information until the summary**, stricter than the design brief's footer count. Confirm.
7. **Discrete controls use `radiogroup`/`radio` roles, not `slider`**, a deviation from M5 plan Decision 6. Confirm.
8. **Adding an aircraft also needs a workspace dependency.** `CLAUDE.md` says an aircraft is one line in `aircraft-registry.ts` and nothing else in `apps/web`; it also needs the dependency in `apps/web/package.json`. The wording fix is proposed to you separately for approval.
9. **The spec lags the contract (#162):** `ViewDefinition.size`, annunciator `stateLabels`, `startChecklist` taking the control definitions with each spring-back press counted, and `inexact-lever-target`.
10. **Browser test coverage:** picker, language, theme, Guided with a deviation, Practice, the phase dialog and an offline reload. Zoom and device screens are not covered by browser tests.
11. **Freeze:** nothing is merged into `develop` until you have merged this release PR; the proposed `CLAUDE.md` fix lands in the next session.

Follow-ups filed for later: #157, #158, #159, #160, #161, #162, #178, #179, #180, #181, #182, #183, #184, #185, #186, and the owner-only #125.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- Browser tests: `pnpm exec playwright install --with-deps chromium` once, then `pnpm test:e2e`. CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- Panel-kit gallery: `pnpm dev`, then open `/gallery.html` (development only, not on UAT).
- Manual script on UAT or `pnpm dev`:
  1. Pick the demo aircraft, choose Engine start in Guided.
  2. Operate a control the current item does not ask for; the banner names the deviation. Finish the procedure and read the summary.
  3. Switch to Free explore and confirm the reset; tap a control to read its details.
  4. Still in Free explore, turn on Operate controls, open the Radio stack view, swap the COM frequencies and set a squawk.
  5. Install or load the app once, go offline and reload; the picker and a procedure still load.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.6.0 --jq .tag_name` prints `v0.6.0`.
