# M19 CTSL panel as D-MPGO (v0.20.0)

Milestone M19 is released as v0.(19+1).0, so this is v0.20.0; on GitHub it is milestone 20. The goal: make the CT Supralight panel look and behave like D-MPGO's: the layout of the whole panel, every gauge, the radio and the transponder. Only the CT Supralight changes for pilots. The Demo aircraft keeps its panel; the shared key-press fix (PR #751) changes the keys of every aircraft and device.

The final gates ran on develop at 7767530: a ui-verifier pass at 1920 and at tablet width, and a blind whole-panel photo-fidelity check against D-MPGO. Both passed every recognition criterion. PR #777 (the CHT checks) landed on develop after these gates, so the released head is newer than the gated one; #777 changes checklist logic only, which neither pass covered. The passes closed the gauge issues #721 and #670 (comments: https://github.com/DocGerd/cockpit-procedure-trainer/issues/721#issuecomment-6172667010 and https://github.com/DocGerd/cockpit-procedure-trainer/issues/670#issuecomment-6172667711).

## What shipped

For pilots:

- **Panel laid out as D-MPGO's** (PR #733 for #716 and #712; PR #749 for #741): three plates in one dark panel colour at the aircraft's positions, with the gauges at their photographed relative sizes. The FLARM display sits at the top left of the centre plate, the GPS in its own row below it, and the radio and transponder side by side under it (the slot sizes are laid out in PR #733). The plates have D-MPGO's proportions: a narrower left plate, an upright centre plate that the GPS nearly fills, and a right plate whose circuit breakers stand at the aircraft's own pitch, each still a full touch target. The "Push off" label is gone and the parachute placard is centred over the rescue handle (#729, see Decisions).
- **Every gauge drawn as D-MPGO's** (one PR each, #720 and #721 and #670): the airspeed indicator (PR #736) with its photographed arcs and a lance needle that rests at 12 o'clock; the vertical speed indicator (PR #734); the tachometer (PR #737); the CHT and oil temperature gauges (PR #738); the voltmeter and oil pressure gauges (PR #739); the slip indicator and the hour meter (PR #735).
- **A three-pointer altimeter with a setting knob you turn** (PR #740, #719): an hPa window, 101 settings from 950 to 1050 hPa, and a held press that repeats. Before take-off and descent, "altimeter set" is now a knob action, and Guided rings the knob.
- **The radio behaves as the original ATR833-OLED** (PR #732, #718): I/O held switches it off, SET steps VOL, SQL, DIM, VOX, DWM, INT and EXT, dual watch needs squelch 02, and the memory list has 100 entries that load straight into standby.
- **The radio no longer switches on by itself** (PR #723, #717): engine start presses its I/O key after the Avionics Master, and the before take-off checks no longer ask for a FLARM check.
- **Avionics behave as the real units when a breaker is pulled and pushed back** (PR #731, #727): each unit stays dark until switched on again.
- **Transponder flight level follows the altimeter at 1013 hPa** and rounds down (PR #744, #742).
- **A tap presses a key once** (PR #751, #748): the ATR833 swap and DW keys no longer switch straight back on release, and the same double press is gone from every other panel and device control.
- **CHT checks match the redrawn dial** (PR #777, #776): "in the green" in cruise accepts the dial's green arc, 90 to 110 °C; the run-up asks for a reading below the red line. This was the one blocking finding of the release review.

For maintainers:

- **Gauge artwork split into one module and one test per gauge** (PR #724, #722), so a gauge PR touches only its own files.
- **Artwork contract grew** (PR #740): the `needles` moving part (several hands on one value), artwork `windows` that print a selected value, a `holdRepeat` option for stepped knobs, and the validator codes `invalid-needles` and `unknown-window`. The contract version is unchanged because the change only adds.
- **Intake** (PRs #723, #725, #726, #730, #731, #732): the panel layout, the gauge faces, the owner's answers to questions 33 to 39, the ATR833A-OLED source (questions 64 and 65) and the power-cycle assumptions (questions 66 to 69). The specs name the ATR833A-OLED source and the new CTSL arrangement (PR #747, #746).
- **Test hardening** (PR #745, #743): ATR833, dock and slot-fit tests. The dock exemption is keyed on the aircraft id (`dockBesideSlots`).
- **Tooling:** cloud sessions start prepared (PRs #758 and #761: SessionStart hook, Node 24, dependencies, Playwright's Chromium, and a connector fallback in the skills); CodeQL init and analyze are pinned together and grouped for Dependabot (PR #762); action and tooling bumps (PRs #753 and #756).

## Decisions made

From the PR descriptions (reasons in the PRs):

1. **The panel floor stays 1110 px** (PR #733, PR #749). Below 1200 px the panel renders at most 1113 px wide, so the floor cannot rise. The view box narrowed from 2372 to 2110 units instead, which raises the scale at the floor so that D-MPGO's breaker pitch still holds 44 px targets.
2. **Breaker touch boxes sit off-centre** (PR #749). They cannot be centred on knobs 69 units apart without overlapping, so each box contains its knob and shifts to clear its neighbour. Sacrificed (ADR-0002): touch boxes cover part of the inert Instrument Light breaker face (#772). The "Circuit Breakers" header is 1.2 A wide against D-MPGO's 0.81 A, to keep the tablet lettering minimum (#773).
3. **Plates a little wider than true; units at D-MPGO's relative sizes** (PR #733, PR #749). The right plate is 610 units wide, not the intake's 565, so the breaker grid keeps touch pitch. The FLARM slot mirror is below the slot lettering floor and is read in the dock; its tap area grows to the 44 px target. Realism yields to touch targets and lettering minimums; gauge numerals print at the secondary floor, which keeps the gauges' relative sizes.
4. **"Push off" stays off the panel** (#729, owner). The label is printed on D-MPGO, but it reads as if a pushed-in breaker were off, so the trainer leaves it out by your decision. The intake records this as a deliberate deviation, not as a photo finding.
5. **Needles map value to angle linearly** (PRs #736 to #739). The renderer has one linear map, so faces carry the measured numerals, ticks and arcs while the needle follows a linear model that stays within the intake's tolerance (the airspeed needle reads 3 to 4° past the print from 260 to 300 km/h). The CHT and oil temperature needles use a compressed scale value above 120 °C (PR #738), and the oil pressure needle follows only the first segment, up to 7 bar (PR #739); the model never exceeds 6.5 bar. A piecewise value-to-angle table in core would remove these compromises.
6. **Small lettering is "secondary".** Gauge numerals and words fall below the 11 px floor at 1920 and carry `data-lettering="secondary"`, held to half the minimum and drawn about 20 percent above the photographed size. Legibility is given up for recognition (ADR-0002).
7. **The altimeter knob is a 101-detent rotary,** not a new control kind (PR #740). A new kind would touch core, panel-kit and the app. The cost: Explore's control details list all 101 positions. Hold-to-repeat is opt-in through `holdRepeat` so a held flap selector or trim does not run on. A small "hPa" is printed on the knob's lug, because the printed-labels rule reads the control's own face (labelled-control rule over print fidelity).
8. **Altimeter and transponder inputs are assumed** (PR #740, PR #744): field elevation 315 ft, QNH 1013 hPa and 27 ft per hPa (intake questions 46 to 49). The transponder follows QNH, not the altimeter knob. Parking, taxi and the holding point start with 1025 hPa set, so before take-off is a real turn of the knob. Rounding down is assumed (#770).
9. **The ATR833 follows the A-variant manual** (PR #732). Which keys leave a list, the 12 s list time-out, what `LST 00` holds, memory persistence and the defaults other than SQL 05 are assumptions listed in the intake (questions 64 and 65; #771 asks to verify them).
10. **COM switch-on sits in engine start, right after the Avionics Master** (PR #723), because the radio is needed for the taxi call and no handbook checklist names a COM step. The FLARM check before take-off is gone (owner answer).
11. **Avionics power-cycle assumptions** (PR #731): the TRT800H stays dark until I/O (Auto-On unknown), the aera returns by itself at its database page after a power loss, and the FLARM's only cut-off stays the Avionics Master. All marked assumed in the intake (questions 66 to 69).
12. **A touched key presses once** (PR #751): the fix is in panel-kit, because every held control had the defect, and a `detail` check swallows the click that follows `pointerup` instead of using a timer.
13. **The CHT run-up item reads "below the red line"** (PR #777), not "in the green": a quick pilot's tick would otherwise fail while the head is still warming. The cruise check keeps "in the green".

Orchestration decisions:

14. **#763 (outside view vanishes on short viewports) goes to the next milestone.** The fold logic is unchanged since v0.19.0, so this is shipped behaviour, not an M19 regression.
15. **Process.** The remaining M19 agents ran on Sonnet, with one release reviewer (Opus) and an Opus blind photo-fidelity judge for the final gate.
16. **Final gates passed on develop 7767530,** so #721 and #670 were closed (links above). Non-blocking fidelity notes: the plates are drawn charcoal, not brushed aluminium (a shade, non-blocking under the recognition-over-detail rule); the maker logos are replaced by generic marks (the repository bans manufacturer artwork); the lower switch console is laid out as boxes, not as D-MPGO's T-shaped stack, though its contents and order match.
17. **The airspeed arcs follow the intake's figures** (#769), where the blind checker's photo reading differs: the bezel lip hides the start of the arc.

## Open questions for the owner

1. **"Push off" breaker label (#729).** The label is on D-MPGO and the trainer leaves it out by your 2026-10-11 decision, because it reads as if a pushed-in breaker were off. Do you want it omitted for good, or replaced with a wording that cannot be misread? #729 holds only your clarification; no question of yours is waiting there.
2. **What comes next on the panel?** The blind check found two recognition gaps: the plate colour (charcoal, not brushed aluminium) and the shape of the lower switch console (boxes, not the T-shaped stack). Should either be the next milestone's work?
3. **Follow-up issues.** None blocks the release. The list is compiled from this milestone's issues and PRs, so an item you remember may be missing:

   - **Outside view:** #763, planned for the next milestone.
   - **Intake:** #764 (stale statements after the ASI, altimeter and voltmeter changes).
   - **ATR833:** #765 (opening a MEM or LST list loads standby, and LST 00 is stated as manual fact), #766 (dual watch survives SQL below 02; negative values print one digit), #767 (store keeps or ends dual watch; the CTSL COM power test uses a stand-in), #771 (verify list keys, list time-out, memory persistence and power-on defaults).
   - **CTSL panel:** #768 (the bottom-row Nav-column breaker has no "Cockpit Light" label), #769 (green and white arc positions of the airspeed indicator), #772 (Beacon Light touch box over the inert Instrument Light face), #773 (Circuit Breakers header wider than D-MPGO's).
   - **TRT800H:** #770 (flight-level rounding direction and negative altitude).
   - **Filed by the release review:** #774 (the artwork contract from this milestone is undocumented, and stops are not validated), #775 (stale docs: CTSL README instruments and the one-viewport spec's slot-mirror floor).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). One e2e test, `view-checklist.spec.ts` "the summary comes forward with the tablet drawer closed" (#618), fails on develop with and without these changes.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT at 1920x1080, with the CT Supralight in Free explore:

1. **Panel.** Three dark plates. Left: the airspeed indicator, the altimeter, the slip indicator and the vertical speed indicator. Centre: the FLARM top left, the aera 500 below it, the round radio and transponder side by side under it. Right: the tachometer, the CHT, oil temperature, oil pressure and voltage gauges, the hour meter and the breaker block. Compare each gauge with D-MPGO's photos: needles at rest, scales, arcs and screws.
2. **Altimeter.** Turn the setting knob: the hPa window and the reading follow it. Hold a press on the knob and the setting repeats.
3. **Breakers.** The "Circuit Breakers" header has no "Push off" under it. The parachute placard is centred over the rescue handle.
4. **Radio and transponder.** Run a normal procedure through engine start in Guided: engine start presses the radio's I/O after the Avionics Master. In the dock, tap the radio's swap and DW keys: each acts once. Hold SET to see the VOL, SQL, DIM, VOX, DWM, INT and EXT items.
5. **Transponder.** At 1013 hPa the flight level matches the altimeter and rounds down.
6. **CHT.** Run the cruise checks: "CHT in the green" ticks when the needle is inside the green arc, 90 to 110 °C.
7. **Tablet width.** Walk the panel at 1920 first, then resize to tablet width, where the checklist drawer covers the panel: the breakers keep their 44 px touch targets.
