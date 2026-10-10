# M17 Panel from photos (v0.18.0)

Milestone M17 is released as v0.(17+1).0, so this is v0.18.0; on GitHub it is milestone 18. The goal: rework the CT Supralight panel from the owner's photos of D-MPGO, first in the intake, then in the panel's legends, console art, gauges and layout. M17 was a full rework of the CTSL panel; the Demo aircraft and the app frame are unchanged.

## What shipped

For pilots:

- **Photo survey in the intake** (PR #628): the D-MPGO photos recorded in `docs/aircraft/ctsl-intake.md` (§2a), with which earlier answers they replace.
- **Legends and texts** (#629, PR #635): ignition OFF, 1, 2, 1+2, START; rockers with two-word legends and I/O symbols; flap selector "up manually" / "down manually"; BAT and GEN under a boxed "Master"; "Stabilator Trim", "Choke", "Throttle", "Brake" titles; the parking-brake valve reads Off, Brake, On. Checklist texts follow in EN and DE.
- **Console art** (#630, PR #643): the throttle strip prints only Full and Idle; the large knob is gone; the parking-brake valve's lever sits in a curved slot on the right side; aileron- and rudder-trim wheels and a parachute placard as inert art; new grips (blue throttle, black knurled brake crossbar, ribbed choke); green stabilator strip; red centred rescue handle with a flagged pin; red fuel-valve grip with an Open / Fuel Valve / Closed strip.
- **Airspeed and vertical speed indicators** (#631, PR #645): ASI 40 to 340 km/h, numbered every 40, ticks every 20, arcs white 72-115, green 94-245, yellow 245-300, red line at 300 (VNE 300 km/h, 162 kt); maximum flap speed at -12 degrees is 300 km/h. VSI in ft/min, plus or minus 2000, ticks every 500, printed as thousands.
- **Panel layout** (#632, PR #656): four fields as in the aircraft: 2x2 instruments upper left; GPS, COM and transponder in a new upper-centre field with a FLARM display and a glareshield strip as inert art; tachometer, engine gauges, a new voltmeter, the red Generator lamp and a two-row breaker strip with full-word legends upper right. The panel compass and the second lamp are gone, and N7/N8 no longer open with the compass.
- **Owner questions answered by the photos:** #536 (no large knob; cabin heat is the glareshield knob), #537 (ignition legends), #538 (lever order trim wheel, choke, throttle, brake), #570 (throttle strip prints only Full and Idle).

Filed along the way, without milestone: #657 (softer device-screen glare in panel-kit, outside T4's scope), #658 (call the parking brake a valve, not a lever, in the README, intake, M17 plan and a test name). The remaining T2 art gaps went to #569 as a comment; new local evidence for the flaky tablet-drawer e2e went to #618.

## Decisions made

Agent and owner decisions (reasons in the PRs):

1. **The photos win.** The D-MPGO photos (2026-10-10) take precedence over the owner's 2026-10-08 confirmations; items the photos do not show keep the earlier answers (intake §2a).
2. **VNE and ASI follow the photos:** VNE 300 km/h (162 kt), recorded as assumed (unverified); the handbook's BRS figure is 276 km/h. ASI 40-340 numbered every 40, arcs white 72-115, green 94-245, yellow 245-300 (PR #645).
3. **ASI numerals every 40, not every 20** (PR #645): the lettering floor does not fit 15 three-digit numerals on the ring; ticks every 20 keep the reading resolution.
4. **VSI plus or minus 2000 ft/min** (PR #645): the model keeps m/s and the indicator converts; half-step numerals and the caption are secondary lettering, as on the real dial.
5. **Ignition OFF / 1 / 2 / 1+2 / START** (PR #635): 1+2 and START are not legible in the photos and are assumed (unverified). Position ids are unchanged.
6. **Parking brake is a valve** titled "Brake": Off is the open valve, On the shut valve (PR #635, PR #643). Its place on the real arc is assumed.
7. **Avionics replacement is a separate milestone** (#633, owner-gated): the CTSL keeps its current devices, and the aircraft name keeps "(representative panel)" until then.
8. **T2 and T4 art accepted below the 2.5 rubric bar** by pinned A/B under the owner rule (no regression against the pinned baseline, every heading at 2 or above). The remaining gaps are listed on #569.
9. **The green stabilator strip is an aircraft marking**, the legend strip on the console's left edge as in the photos, not a status colour, so the "no status colours on the panel" rule holds.
10. **Rescue handle label "Parachute"** (PR #643): the printed-labels contract needs a label and the photos show none on the handle; assumed, recorded in the intake. Placard, rudder-trim and "Fuel" valve wordings are paraphrased or assumed likewise.
11. **Choke grip drawn although the photos show none** (PR #643): a trainer choice so the lever reads as a control.
12. **Flap legends below the lettering floor** (PR #635): "up manually" / "down manually" are secondary lettering; realism beats the floor here (ADR 0002, equal rank).
13. **Panel floor 950 to 1110 px, viewBox 2372** (PR #656): side-by-side radios need a wider panel; slots are the old sizes scaled by 1.07. The upper-centre field placement is a compromise, assumed (unverified, intake §3.2a).
14. **Voltmeter dial 9 to 17 V** reading the bus (PR #656), assumed (unverified). The Generator lamp keeps the id `chargeLamp`.
15. **Breakers:** eight trainer breakers keep their controls under full-word secondary captions; the rest are inert caps without legends (PR #656).
16. **Compass removed** (PR #656): the photos show none on the panel; the two compass checks in N7 and N8 went with it.

## Open questions for the owner

1. **VNE 300 km/h** is unverified: the photos' red line against the handbook's BRS figure of 276 km/h. Confirm which the trainer should teach.
2. **Ignition 1+2 and START legends** are assumed (not legible in the photos). Confirm the wording.
3. **Follow-ups without milestone:** #657 (device-screen glare in panel-kit), #658 (valve wording in README, intake, M17 plan and a test name), #569 (remaining console art gaps, comment added), #618 (flaky tablet-drawer e2e; fails locally on develop, passes in CI).
4. **Avionics:** #633 (replace the CTSL avionics with D-MPGO's installed units) waits for your go.
5. **Housekeeping note:** T2's squash message (c3120df) carries old "Closes" lines for #536 and #570; both were already closed, so this is harmless.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). Known flake: #618.
- Each task PR had a separate reviewer and a ui-verifier pass; T2 and T4 art were scored by pinned A/B.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT at 1920x1080, comparing with the D-MPGO photos:

1. **Panel.** Pick the CT Supralight and Free explore: four fields; 2x2 instruments upper left; GPS, COM and transponder upper centre; tachometer, engine gauges, voltmeter, Generator lamp and breaker strip upper right; no compass.
2. **Gauges.** The ASI reads 40-340 with the arcs above and a red line at 300; the VSI reads ft/min to 2000 each way.
3. **Centre.** The ignition reads OFF, 1, 2, 1+2, START; rockers show two-word legends with I/O; BAT and GEN sit under "Master".
4. **Console.** Trim wheel with green strip, choke, throttle (Full / Idle only), brake; the parking-brake valve in its curved slot on the right; aileron- and rudder-trim wheels and the parachute placard; the red rescue handle centred aft.
5. **Procedures.** Run N3 Engine start and N7 in Guided: items name the new legends and the Generator lamp; nothing asks for the compass.
