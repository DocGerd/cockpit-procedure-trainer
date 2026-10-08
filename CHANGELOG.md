# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
semantic versioning below 1.0: milestone Mn is released as v0.(n+1).0.

## [Unreleased]

Pending changes live in `changelog.d/` and are folded in at each release.

## [0.13.0] - 2026-10-08

### Changed

- Generic panel controls and gauges look like real hardware: metal bezels, glass, shadows and shaded switches.
- The CT Supralight instruments look like real gauges: metal bezels, glass glare and shadowed needles.
- The CT Supralight switches, breakers, knobs and levers look like real hardware.
- The CT Supralight panel reads as painted metal with shadows around its instruments.
- Avionics units sit in shaded bezels behind glass.
- The radio volume slider shows its position clearly against the track, and panel placards sit a shade darker beside the painted panel.

## [0.12.0] - 2026-10-07

### Added

- Every avionics device now has a read-only display for a panel slot, a short text readout of that display (used as the slot's accessible name) in German and English, and a declared floor size at which its operable screen keeps full touch targets.
- Each device slot in the panel shows a live read-only mirror with one button that opens the device in the dock, where the aircraft has a dock.
- A device dock under the panel holds one operable avionics device at a time, with a close button and an empty-state hint; aircraft declare its cell in their cockpit arrangement.
- Photorealistic panel (M12, in progress): instrument artwork can carry a glass layer above the needle.

### Changed

- The CT Supralight now has three views (panel, centre field, console). Its COM radio, transponder and GPS sit in the panel as live mirrors; selecting one opens the operable unit in the device dock under the panel. Showing the whole cockpit at once now needs a larger window than before; on smaller windows the cockpit falls back to view tabs.
- The demo aircraft has a radio section on its panel: its COM radio and transponder show as live mirrors there and open in the device dock, and its radio-stack view is gone.
- In Guided, a step that targets an avionics device now opens that device in the device dock and rings its panel slot and the key to press, instead of switching to another view; Practice opens and rings nothing, and Free explore docks a unit when you select its slot.
- Photorealistic panel (M12, in progress): the CT Supralight airspeed indicator and light rockers, and the generic round gauge, gain metal bezels, glass glare and shadows; a turning needle no longer repaints the face beneath it.
- Photorealistic panel (M12, in progress): the demo aircraft's panel and console are drawn as painted, recessed metal.

### Fixed

- The header chip dialogs now open attached under their chip, aligned to it and kept inside the window.
- On a 1920x1080 screen in a normal browser window, the whole cockpit now stays in one view: the outside-view strip above it folds, and hides where even that is not enough, before the layout falls back to view tabs.
- The checklist pane keeps its footer, with the Restart button, and the end-of-procedure buttons in view while the pane scrolls, so a short window no longer cuts them off.

## [0.11.1] - 2026-10-07

### Security

- Releases now ship the production web bundle as a `.tar.gz` asset signed with keyless Sigstore (GitHub artifact attestations); `docs/verifying-a-release.md` explains how to verify it.

## [0.11.0] - 2026-10-07

### Added

- Every mode now has a checklist selector in the checklist pane: any checklist of the aircraft can be opened and read, view-only. In Free explore the checklist is a static reference that ticks nothing; in Guided and Practice a viewed checklist leaves the running one untouched, with a button back to it.

### Fixed

- Round gauge captions are now fitted between the ends of the coloured arcs, so a long caption such as "Oil pressure" no longer crowds the arc ends at tablet portrait size. The smallest gauges drop a long caption slightly earlier instead.
- The header aircraft and procedure chips now open a panel with the full text and a "Change aircraft" or "Change procedure" button at every window width, so truncated names can be read by touch and keyboard.
- Switching from Free explore back to Guided or Practice now restarts the last procedure with its checklist; if no procedure is remembered (none started since the last return to the picker or aircraft change), it returns to the picker's procedure choice instead of leaving a mode with nothing to run.
- The outside view now shows the stopped propeller blade with the engine off in every phase, and a static propeller-disc outline while the engine runs, so a running engine is visible at a glance and not only on the RPM gauge.

## [0.10.0] - 2026-10-07

### Changed

- The web app declares `workbox-window` as a dev dependency; the build-config alias that worked around its absence is gone.
- Linting now fails any package under `packages/` of a kind with no boundary rules, so a new package kind cannot ship unbounded.
- Every end-to-end test now fails on a content security policy violation, not only the dedicated policy test, so an injection in any flow the browser tests drive no longer passes unnoticed.

### Fixed

- The browser chrome colour (`theme-color`) now follows a theme chosen in the app, not only the system setting.
- A round gauge's caption now sits below the needle tip at every size, so it no longer overlaps the needle at tablet portrait.
- At tablet width the header chips open a dialog with the full aircraft name or procedure title, so touch and keyboard users can read what the narrow header truncates.

## [0.9.0] - 2026-10-06

### Changed

- The demo cockpit's keyboard and screen-reader order now follows its panel layout: panel, radios, console.

### Fixed

- Long procedure titles and the aircraft name in the header now truncate inside their own chip instead of overlapping the phase selector.
- The CT Supralight knee-board cards are drawn smaller and the rule line clears the title.
- The CT Supralight panel draws its empty radio, transponder and GPS bays as labelled blanking plates, and its two top lamp recesses read as lamps.
- The aircraft picker shows each aircraft's handbook revision in the selected language, German or English.
- The demo panel's switch row is spaced so the annunciator knob's touch targets no longer overlap the avionics switch and the starter.
- The Demo aircraft no longer scrolls the page by a few pixels at 1024x768 or in a short desktop window: the panel now leaves room for the footer.
- The CTSL compass is drawn larger, with larger card lettering, so its heading reads at the panel's smallest size.

### Security

- Ship a strict Content-Security-Policy as a meta tag in the built app: scripts, workers, connections, images, fonts and the manifest load from the app's own origin only (images and fonts may also be `data:` URLs), with no inline or eval script. Inline device-screen styles moved into stylesheets.

## [0.8.0] - 2026-10-06

### Added

- The app frame always shows the running version and the copyright notice; UAT adds the short commit.
- On a desktop screen the whole cockpit shows at once, as from the left seat; small screens keep the view tabs.
- Aircraft can describe their whole cockpit as one left-seat arrangement.

### Changed

- Larger CT Supralight legends and avionics buttons, so the whole cockpit fits one HD screen.

### Fixed

- Each aircraft has one runway, so every phase heading follows from it; a lined-up-on-runway phase with its outside view and a compass-versus-runway check open the take-off, and the outside views show the runway designator. The CTSL compass card and a new demo compass readout now show the heading of each phase.
- The CTSL engine start turns the ignition key to BOTH before the START step, so the guided run can reach START.
- The version footer stays in view on the picker and also shows on the error screen.

## [0.7.0] - 2026-10-06

### Added

- The club's CT Supralight as a second aircraft: a representative analog panel in five views (panel, radio stack, GPS, centre field, centre console) with every control and gauge placed, and eight phases with outside views from the pilot's seat.
- The CT Supralight's electrical system, engine, fuel valve, flaps, brakes and failures behave as its handbook describes.
- The CT Supralight's normal checklists, from pre-flight to shutdown.
- The CT Supralight's emergency procedures with their failures: engine failure, fire, coolant and oil loss, flap control and generator failure, rescue system.
- The CT Supralight panel has its own drawn gauges and controls.
- An SL40 COM radio, installed in the CT Supralight.
- A GTX 327 transponder, installed in the CT Supralight, with a radio and transponder checklist.
- A GPSMAP 496 in the CT Supralight, in its own GPS view, with power, backlight and page keys.
- The README links the live app and the UAT preview.
- Every panel control prints its function on a placard beside it, such as BAT, FUEL or AVIONICS, in the panel's own wording; the COM and SL40 volume sliders are lettered VOL.

### Fixed

- The PWA build test now recognises small SVGs that Vite inlines as base64 data URIs.
- Notched artwork controls, such as flap selectors and ignition keys, now step one position each way without wrapping, by tap on the side to move toward and by arrow keys, Home and End.
- Artwork indicators take optional `options` (units, decimals, arcs) like the generic gauge, so their accessible name and fallback gauge keep units and rounding.
- Trim, throttle and the other notched controls now step the same way from a tap, the arrow keys and the printed legend, and focus returns to the ignition switch after holding START.
- The CT Supralight's printed labels, such as STRB, PUSH, FLAPS, INTERCOM, HEADSET, OPEN and SHUT, are lettered large enough to read at tablet width.
- In the CT Supralight, the rescue system's safety pin is out from departure until parking and securing, so the rescue deployment checklist only confirms it; the departure starts with flaps 0° as the take-off checklist leaves them, and the climb selects −12° only after confirming a safe height.
- The Pages deploy retries once when a deploy wedges, and the Deployments box now lists the `uat` and `prod` environments with their links.
- A long-open app now checks for a new version every hour and when it becomes visible again, so the update prompt appears without a navigation.

## [0.6.0] - 2026-10-06

### Added

- App shell: header, layout for tablet and desktop, aircraft and procedure picker, and a theme switch.
- German and English interface with a language switch; the choice is remembered.
- Panel renderer: view tabs, background and placements scaled with the panel.
- Generic GA control widgets: toggle, rocker, key switch, push button, circuit breaker, rotary knob, lever and guarded handle.
- Generic GA indicators: round gauge with needle, ticks and arcs, annunciator lamp, digital readout.
- Layer renderer for aircraft artwork: needles, per-position images and lever travel, with a fallback to the generic widget.
- Checklist pane with item states and check-off, and the end-of-procedure deviation summary.
- Guided, Practice and Free explore modes.
- Outside-view strip and the phase control in the header.
- Device screens in the panel, with input routing and a dark screen when unpowered.
- Generic COM radio and transponder devices, and a guide to adding a device.
- A fictional demo aircraft for a whole flight: three panel views (panel, console and radio stack); eight phases (parking, holding point, departure, cruise, approach, landing, taxi in, parking and securing), each with an outside view from the pilot's seat; six normal procedures (engine start, before take-off, radio and transponder, before landing, after landing, engine shutdown and securing); and an alternator-failure procedure.
- Error boundary with reset, labelled placeholder for missing images, training-aid notice; the app works without localStorage.
- The trainer installs as an app, works offline after one visit, and asks before switching to a new version.
- Touch polish: larger hit areas, reliable press-and-hold, pinch zoom and pan on the panel.
- Keyboard operation of every control, names and positions for assistive technology, and reduced motion throughout.
- Views can declare their coordinate size, so the panel no longer waits for the background image to place controls; the validator rejects placements outside it.
- The validator rejects an action item that targets a continuous lever anywhere but its end stops.
- The panel kit can check an aircraft's widget ids, widget fit and widget options, and CI runs it over every registered aircraft.
- A walk-through test performs every normal procedure of every registered aircraft and fails naming the item that does not complete.
- Browser tests run in CI: the picker, language and theme switches, a Guided procedure with a deviation in the summary, a Practice run, the phase-change confirmation, and reloading the trainer offline.
- Panel-kit gallery page for development builds.
- An authoring guide for adding an aircraft, with the demo aircraft as the worked example.

### Changed

- Brand tokens now match the DocGerdSoft brand bundle: the dark neutral surfaces, the full font stacks and the smallest radius.
- The design lint now also rejects type and spacing literals in TS/TSX, and covers panel-kit and device screens.
- Control position typos in a contract (`initial`, `springBack`, artwork image keys) now report an error naming the offending value and the control's valid positions.

### Fixed

- Panel widgets no longer render text below the smallest type size: a widget placed too small drops its numerals, then units, then legends. Position legends are upper-case placards, text and moving parts stay inside the widget box, the guarded handle opens by keyboard with the guard first and returns focus on Escape, and the circuit breaker and continuous lever show their label.
- Device screens now scale with their place on the panel instead of being clipped: the screen keeps its natural layout and is scaled to fit its install box, so every key stays visible and operable on narrow viewports. The COM volume slider is drawn from panel tokens instead of the browser accent.
- The demo's radio stack now stacks the COM radio above the transponder, and the transponder puts IDENT next to its mode keys, so on a 1024 by 768 tablet both screens render at their full size: every key is at least 44 px tall and no text is smaller than 11 px.
- Tablet landscape: the header fits one row at 1024 and 1280 wide, the outside view shrinks on short windows so the panel keeps its placards, the deviation summary names device controls by their name, and the picker fits 1024 by 768 without scrolling.
- In Guided on a tablet, a deviation now shows on the closed Checklist button as a count badge, the button's accessible name gains the deviation count, and the live region announces it. The procedure picker now fits 1440 by 900 and 768 by 1024 without page scroll.
- A pinch that starts with a finger on a control no longer operates it or records a false deviation in Practice and Guided, the Free explore confirmation now says it resets the cockpit to the start of the current phase, and a Guided target outside the zoomed view is panned into sight.
- Checklist actions on a spring-back or momentary control now each need their own press, so two consecutive identical presses no longer complete on one.
- Dragging an unrelated control in Practice or Guided now records one deviation instead of one per pointer move, so the count no longer depends on the event rate.
- Installing the production app no longer wipes the offline copy of the UAT app on a device that has both.
- Session no longer steps the systems while it is failed; a snapshot load resumes stepping.

## [0.3.0] - 2026-10-05

### Added

- Aircraft contract types and defineAircraft, with compile-time checks of every reference and bilingual text.
- Control store with spring-return, momentary and guarded controls.
- Systems runtime that steps the aircraft model on control changes and over time, and reports a failing step.
- Reusable electrical bus and piston-engine start blocks.
- Failure injection, including circuit breakers tripped by a failure.
- Checklist engine with action, check and confirm items, and deviation recording.
- A session that composes the engines, with phase handling: entry snapshots, procedure start and end phases, and failure injection on emergency procedures.
- Aircraft validator, run in CI over every registered aircraft.
- Device contract: a device declares controls, state and logic; an aircraft installs it with power and data wiring.

### Changed

- Pull requests with no user-visible change may skip the changelog fragment with a `No changelog: <reason>` line in the description.
- Settle the M1 design open questions: phase control stays in the header, Practice shows no immediate deviation banner, and the Explore selection outline is the second accent exception on the panel.

### Fixed

- Declare a light and dark `color-scheme` so native controls and scrollbars follow the theme, and add a favicon so the first load no longer logs a 404.
- The aircraft validator rejects a continuous lever value outside 0 to 1, as the control store does, and every registered aircraft is tested to start a session and enter each phase.

## [0.2.0] - 2026-10-05

### Added

- Product brand document with the inherited tokens, the Violet accent and the brand rules.
- Design brief listing every screen and state, with what the design canvas covers.
- Design handoff from the design canvas, committed as reference.
- Design tokens for light and dark, a lint rule against colour, type and spacing literals in the web app, and bundled Geist fonts.

### Changed

- Dependabot pull requests are exempt from the changelog fragment rule.

### Fixed

- Carried M0 review findings fixed or triaged, including CI cancellation, Dependabot grouping and the UAT badge.
- Design-literal lint now rejects the `font` shorthand and CSS system colours; doc and test fixes from the M1 review.

## [0.1.0] - 2026-10-05

### Added

- Baseline documentation and public repository: licence, README, contributing guide and project `CLAUDE.md`.
- pnpm workspace with strict TypeScript, Prettier and ESLint package-boundary rules proven by a test.
- Continuous integration (lint, format, typecheck, test and build on every pull request) and automated dependency updates.
- Issue forms for features, bugs, new aircraft and new devices, and a pull request template.
- ADR-0001 on the architecture and aircraft contract, and the content policy.
- Committed Claude Code configuration: plugins, a formatting hook, a UI verifier agent and a milestone release skill.
- Gitflow with a develop branch, a UAT site under /uat/, and tags and releases created from CHANGELOG.md.
- Release-cycle command and skills for review and merging into develop, and a hook that blocks merges into main.

### Changed

- Align deploy and release workflow action versions with CI, and ignore TypeScript 6.1 and above and `@types/node` majors above the supported Node major in Dependabot.

### Fixed

- Release-cycle skills and the main-merge guard: commands the guard denied, a clearer deny reason, a narrower expansion rule, and exemptions for release and backmerge PRs.

[Unreleased]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.13.0...HEAD
[0.13.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.3.0...v0.6.0
[0.3.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DocGerd/cockpit-procedure-trainer/releases/tag/v0.1.0
