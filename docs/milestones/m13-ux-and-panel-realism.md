# M13 UX and panel realism (v0.14.0)

Milestone M13 is released as v0.(13+1).0, so this is v0.14.0; on GitHub it is milestone 14. There is no v0.13.0: that number belonged to M12, which shipped inside v0.12.0. The goal (plan `docs/superpowers/plans/2026-10-08-m13-ux-and-panel-realism.md`, #435): the trainer follows general UX and procedure-trainer practice, and a pilot leaves it knowing which controls the aircraft has and where they are. Its inputs were three audits of v0.12.0 (panel fidelity P1 to P8, trainer flow T1 to T12, heuristic UX H1 to H13).

A post-milestone re-audit in the browser found 29 of its 37 findings fixed, 7 partially and 1 open (T11 exam mode, which you declined). Its verdict: the UX side of the goal is met at 1920x1080; the realistic-panel side is met provisionally, because it rests on facts recorded as assumed (unverified), which only you or the club can confirm (open question 1). The two gaps it rated highest after that, invented captions on the panel at 4K and the GPS without a position in flight, were fixed before this release (#500, #501).

## What shipped

The CT Supralight cockpit, closer to the aircraft:

- **Field arrangement** (#436): the centre field hangs below the junction of the two upper panel fields; the console sits beside it, the device dock to its left, still under the panel.
- **Centre field and the key/valve interlock** (#447, #468): the closed fuel valve's handle covers the key slot; the key will not go in or turn out of OFF until the valve is open, and comes out only with the valve closed. Cold and dark parks with the key out. Avionics Master larger, ELT remote switch with ON and ARM, flap selector right of centre.
- **Console and bulkhead** (#449, #487): BRAKE, THROTTLE and CHOKE as horizontal levers stacked top to bottom, the trim as a wheel with its indicator; the rescue handle on its own view, the main bulkhead between the seats; the safety pin disappears once pulled.
- **Panel view** (#444): a small reversed-card compass top left of the right field, a round CHARGE lamp, the breaker header "Circuit Breakers - Push off".
- **Rockers read the right way** (#464): OFF and ON paddles on the side of their legend, so cold and dark looks off.
- **Phase states** (#466, #476): every phase starts the way a day-VFR flight is flown (lined up with flaps 15°, parking brake released, pin out, transponder ALT squawk 7000, GPS on; landing light on in the approach).
- **Non-locking brake** (#465): the lever brakes only while held; the parking brake is the valve closed, then pull and release.
- **GPS in flight** (#501): a position fix, ground speed, track and a schematic track-up map instead of NO POSITION.
- **Failure cues** (#233): an engine fire shows smoke over the windscreen and rising CHT and oil temperature; a flap control failure trips the flap breaker and the readout goes dark.

Shared phases and procedures:

- **One phase set** (#482): every aircraft has the same ten phases, with a new Taxi out phase and outside view; Engine start ends on the taxiway.
- **Taxi out procedure** (#496): the CTSL brake and steering checks moved into it, on the taxiway instead of at the parking position.
- **Transponder before take-off** (#473): the pilot sets standby and the line checks it, instead of confirming a state nobody set.

The trainer, closer to procedure-trainer practice:

- **Checklist engine** (#442): an action already set is verified (operate it or tick Verified), never ticked for you; a control left at the wrong position and a step done early are deviations of their own; the CTSL run-up rpm check takes a reading (challenge-response).
- **Deviation feedback and debrief** (#445): a stray action says where the control went and where to put it back, rings it until it is back, and offers Retry this item; the debrief shows time, assists, deviations by kind with expected against actual, Go to item, and Repeat first after a deviation.
- **Practice recall and Show me** (#448): Hide upcoming items turns a run into recall; Show me reveals the current item and rings it, counted as an assist.
- **Flows** (#452, #453): a normal procedure may open with a flow done from memory in any order, then verified by the checklist. Guided rings every flow target, numbered as a scan path. CTSL Engine start, Before take-off and After landing open with one; the demo's Before landing too.
- **Memory items** (#450): emergencies open with their memory items, grouped in the pane, hidden in Practice until done, and a late one is a deviation. Five CTSL emergencies and the demo's alternator failure have them.
- **Drills** (#446): a surprise failure appears unannounced in a phase you choose (time to recognise and right checklist in the debrief), a random emergency, and Practise next from your history.
- **Full flight** (#479, #499): every normal procedure in order from cold and dark to securing, each leg continuing from the cockpit the last one left, with the next phase's heading and environment; ends with a table of every leg.
- **Local history** (#443): last and best result per procedure, in the browser only, shown in the picker.

Screens and navigation:

- **Picker** (#437): Mode and Start stay in view, helper lines, "Start in phase", Free explore outside the Guided/Practice segments, a notice when Practice switches to Guided.
- **Checklist pane** (#438): title and progress pinned, the current item clear of the footer, the deviation banner no longer shifts the list (also closed #414).
- **Dock** (#439): dark panel hardware with a slim hint and a labelled close button.
- **Navigation guards** (#441): Restart, Change aircraft and Change procedure ask before discarding progress and say what would be lost; header chips act in one click.
- **4K** (#440, #457, #500): the chrome scales with the panel at 3840x2160, no empty band under the CTSL panel, and indicators no longer print their accessible name as a caption.
- **Demo** (#470): every position of the annunciator switch can be tapped.

For contributors: CI headroom and a Playwright browser cache (#493); `CONTRACT_VERSION` 2 (#495); new optional contract fields for interlocks, device states per phase, outside cues, guard-open art and phase carry-over; the contract test for printed labels now covers indicators at 4K size.

Release checks: the whole-milestone review's verdict and the perf result are under How to verify.

## Decisions made

Your decisions (2026-10-08):

- **Flows added** (T5): the decisions-table "Step order" row, spec §4.7 and §5 step 4 were amended in the plan PR #451 with your approval. No other row changed.
- **Exam mode excluded** (T11): out of scope.
- **Missing panel facts use best knowledge**: agents used general CT Supralight knowledge where the intake is silent, flagged each fact in its PR, and recorded it in `docs/aircraft/ctsl-intake.md` §9 as assumed (unverified).
- **Rocker sense confirmed** (#464) and **brake lever non-locking** (#465), from your review of the panel.

Agent decisions you may overrule (reasons in the PRs):

1. **Console beside the centre column** (#458, for #436): stacked under the panel, the console does not fit one HD viewport at the legibility floors, so the plan's fallback was taken. Console position and the column's width yield to legibility and one viewport (ADR 0002).
2. **`CONTRACT_VERSION` 1 to 2** (#495, for #482): the shared phase set adds required phases and removes `PhaseDefinition.name`, a breaking change. The additive fields of #452, #450, #476, #233 and #499 kept their version.
3. **Guided and stray rings keep the accent token** (#472, for #445): the stray ring differs only by a dashed style. See open question 4.
4. **E8 key-out order** (#485, for #468): E8 takes the key out before closing the valve, which E6 makes impossible; the trainer closes the valve first, recorded as a row in intake §8. See open question 2.
5. **Flow items already in place tick at the start** (#467, for #452): a flow is a scan and the checklist after it verifies. The re-audit questions this in Practice (#505, open question 5).
6. **One verify rule in every mode** (#462, for #442): Guided does not auto-complete an already-set action either, so the engine stays mode-free; the Verified tick shows on every action that does not spring back, so it gives nothing away.
7. **Interlock in core** (#471, #485): an optional `interlock` list on controls, enforced by the session; a refused move shows a notice in the app frame and is not a deviation.
8. **Full-flight carry rule** (#492, for #479): a leg carries the cockpit when it starts in the phase the last leg ended in or the next one; a leg that skips a phase loads its own start state. The issue's literal rule could not chain the demo's procedures.
9. **Surprise failures run in Practice** (#480, for #446): only failures with a panel cue are in the pool; T4 is read as covered by the decisions-table "Procedures" row (failure injection), unchanged.
10. **Practice recall is an option inside Practice, not a fourth mode** (#477, #488): the §5 Practice and Guided row texts changed; the "Modes" row did not. Show me on a flow reveals the whole flow as one assist.
11. **Memory items without a timer** (#486): a memory item is late when other actions were recorded while it was due; no time limit, since no source gives one.
12. **Holding keeps the transponder off** (#478, for #466), so Before take-off's standby step still trains something.
13. **GPS without map data** (#504, for #501): a blank schematic track-up map, no airfield or terrain data until a licence is chosen (#483); ground speed equals airspeed, no wind.
14. **Touch areas share overlaps** (#474, for #470): positions of crowded controls split the overlap by nearest centre, so one direction may fall under 44 px; `reach.spec.ts` guards that each position stays reachable.
15. **History** (#460, for #443): stored in `localStorage` only, finished runs only; "best" is fewest deviations across Guided and Practice. SECURITY.md and the assurance case were updated.
16. **Browser checks by the reviewer**: #460, #477, #486 and #489 got their browser verification from the PR reviewer, not the implementer.

## Open questions for the owner

1. **Verify the assumed CTSL facts on D-MPGO.** Intake §9 questions 19 to 30, each answered by assumption pending your or the club's check:
   19 field proportions and where the console starts; 20 compass type, card, size and mount; 21 ELT remote legends and lamp colour; 22 CHARGE legend and colour (the second lamp is still unidentified); 23 which emergency steps are memory items, and whether best glide is flown from memory; 24 which switches are on in each phase; 25 console lever travel and sense (forward drawn to the left) and the trim indicator; 26 rescue handle height, grip and safety pin; 27 whether the key can go in while the closed valve covers the slot; 28 engine fire cues; 29 flap control failure cue; 30 which procedures open with a flow, and in which order.
2. **E6 against E8 key-out order** (intake §8): E8 says key out, then fuel valve closed; E6 says the key comes out only with the valve fully closed. The trainer closes the valve first. Which does the club teach?
3. **Airfield data licence** (spike #483): pre-selected airfields with frequencies and traffic-pattern positions need a data source (OurAirports, openAIP, DFS or OpenStreetMap). Which licence is acceptable?
4. **Accent colour on the panel**: Guided rings, numbered flow rings and the dashed stray ring use the app's accent token on top of the panel. The rule is "no brand or status colour on the panel". Accept the accent for overlays, or ask for a panel-neutral ring?
5. **Flow items already in place tick themselves** (#505), even in Practice with Hide upcoming items. Keep, or require a touch or a Verified tick on them in Practice?
6. **GPS after a breaker reset**: restoring the GPS breaker leaves the unit off until you press POWER, as on the real unit. Intended?
7. **Parking-brake valve lettering** (from the release review, older than M13): the panel prints PARK BRAKE where intake §3.4 says "Brake". Which does D-MPGO print?

Follow-ups, without milestone (none blocks the release):

- From the re-audit: #505 flow items tick themselves (question 5); #506 a surprise failure opens with an unrelated checklist shown; #507 4K dock hint and phase badge stay small; #508 the interlock notice shows far from the centre field; #509 check items give the expected value away, few CTSL checks take a reading (T10); #510 full flight cannot combine with a surprise failure or recall; #511 Guided engine fire rings the next item's controls.
- From the M13 PRs and the plan: #483 airfield data spike; #360 system-fidelity spike; #415 spec and guide still call the dock optional; #237 hover info instead of the Operate toggle (H8 folded there); #425 an e2e that operates every control.
- From the release review: #515 the picker's Best mixes Guided and Practice runs; #516 a history test asserts the deviation count against itself; #517 during a surprise failure only non-normal checklists can be run, so a wrong pick of a normal one cannot happen; #518 the full-flight walk covers the CT Supralight only; #519 in a full flight the GPS and intercom stay off, because carried legs do not re-seed device state and no step switches them on; #520 the rescue safety pin is only confirmed, never moved, so it is drawn wrong through a full flight; #521 the key can come out from BOTH by keyboard; #522 a panel-kit test does not check its clip polygons.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when 4399 is busy).
- Perf: `E2E_PERF=1 pnpm test:perf` on a quiet machine. At the release cut it passed the absolute budget on every view of both aircraft, and every view stayed within the plan's A/B margin of v0.12.0; the figures are in the release preparation PR.
- Whole-milestone review: one reviewer over the diff since v0.12.0, with sub-reviews of core, web, aircraft content, and docs, panel-kit and changelog. Verdict: ship, no blockers. Fixed before the release: FIXPRS. Folded into the release preparation PR: spec, architecture, aircraft-guide, CT Supralight README and intake text that M13 had made stale (contract version 2, interlock refusal, phase device states and carry-over, flow latching, GPS fix, persisted options, indicator lettering, the walk-through's scope), the Taxi parking-brake release marked as a trainer addition, and changelog wording. The rest is filed as follow-ups above.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the merge: https://docgerd.github.io/cockpit-procedure-trainer/.

A ten-minute walk-through at 1920x1080, CT Supralight, English:

1. **Cold and dark.** Pick Engine start in Guided with Start in phase Parking. Every rocker shows OFF, the key is out, and the fuel valve handle covers the slot. Try to turn the key: a notice names the fuel valve. Follow the numbered flow rings, then the checklist.
2. **Full flight.** Back in the picker, Drills: Full flight in Guided. Fly the legs; set a switch in one leg and see it stay set in the next. At line-up the compass reads the runway heading, the transponder is at ALT 7000 and the GPS has a fix. Make one stray move: the cue says where to put the control back and rings it. The last leg ends with the table of every leg.
3. **Surprise drill.** Drills: Surprise failure, phase Cruise. Watch the gauges until something drifts (or smoke shows), open the matching checklist and run it; the debrief shows the time to recognise.
4. **Practice with recall.** Pick Before take-off in Practice, tick Hide upcoming items, and run it from memory; use Show me once. The debrief counts the assist. Back in the picker, the procedure shows its last run and Practise next suggests it.
5. **Guards and 4K.** Mid-run, press Restart: the dialog states the progress you would lose. At 3840x2160 the chrome scales with the panel and the panel prints only its own lettering.

When you merge the release PR: wait until the Deploy run's `prod-environment` job of the push to `main` has finished before any push to `develop`. Then the next session confirms tag `v0.14.0` and the Release (`gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.14.0 --jq .tag_name`), closes milestone 14, and opens a backmerge only if `main` holds a hotfix.
