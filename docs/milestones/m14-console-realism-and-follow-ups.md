# M14 Console realism and follow-ups (v0.15.0)

Milestone M14 is released as v0.(14+1).0, so this is v0.15.0; on GitHub it is milestone 15. The goal: a pilot finds the CT Supralight's console controls where the aircraft has them and operates them the way the aircraft does, corrected from the handbook check of intake PR #529 (lever block, rescue handle, printed legends). The milestone also cleared the follow-ups of the M13 release review and the post-M13 UX re-audit. Owner-gated issues (#505, #536, #537) were taken out of the milestone and stay open as questions below.

## What shipped

The CT Supralight console, from the handbook:

- **Console from above** (#534): trim wheel, choke, throttle and brake side by side, left to right, each sliding fore and aft in its own slot beside its legend strip; the parking-brake valve aft of the lever row, the carb heat (still provisional) outboard on the right-seat side. The trim indicator is a pointer that travels beside the wheel.
- **Rescue handle** (#535): low at the aft end of the console between the seats, pulled forward, hard, to the stop; the safety pin goes through the release lever. The main-bulkhead view is gone and the console cell takes its height. The large knob now sits aft of the valve, as unlabelled artwork.
- **Printed legends** (#531, #532): the throttle prints only FULL and IDLE, the trim only DOWN forward and UP aft; cues name the unprinted stops (low, run-up, cruise power, neutral trim) in words.
- **Key out only from OFF** (#521): never straight from L, R, BOTH or START, also by keyboard.
- **Flap readout blinks** (#533) while the flaps travel, and keeps blinking while airspeed holds an extension off.
- **Safety pin through a flight** (#520): Before take-off pulls it and Shutdown and securing fits it again, through a new guard item kind.
- **GPS and intercom in a full flight** (#519): Engine start switches the intercom on, Before take-off the GPS, with a check of its position fix.

The trainer:

- **Interlock refusal rings the holder** (#508): a refused key move rings the fuel valve on the panel, not only a notice in the header.
- **Checks name what to read** (#509): in Practice a CT Supralight check reads "Flap readout" and keeps "15°" back until it is ticked; the flap, oil, CHT and rpm checks take the value the pilot reads.
- **Surprise failures** (#506, #517): a surprise opens with no checklist shown, and "Run this checklist" is offered for every procedure, so a wrong pick of a normal checklist is recorded.
- **Full flight with a surprise and recall** (#510): a Practice full flight can carry an unannounced failure in a chosen or random phase and start with Hide upcoming items; the checklist taken becomes the flight's last leg.
- **Guided engine fire** (#511): the smoke check rings nothing instead of the next item's fuel valve and key.
- **Best in Practice** (#515): the picker's Best counts only Practice runs and says so.
- **Device cue wording** (#526): cues name radio, transponder and GPS keys in words the unit prints, held by a test.
- **4K** (#507): the dock hint and the phase badge scale with the chrome.
- **Demo full flight** (#518): the demo's shutdown opens with "Throttle idle", so its whole flight can be walked.

For contributors: new optional contract fields `onlyFrom` on rotaries, `guard` items with `guard.legends`, indicator `blink`, check `expected`, and a check `target` that may be left out; `CONTRACT_VERSION` stays 2. Test pins in #516 and #522; the intake records the owner answers of 2026-10-08 and reserves §9 questions 31 and 32 (#530).

## Decisions made

Agent decisions you may overrule (reasons in the PRs):

1. **Console landed below the rubric mean** (#534, PR #555): the ui-verifier re-score had every M12 rubric heading at 2 or above but a mean of 2.17, below the 2.5 bar. The orchestrator landed it because every control's position and state reads at a glance; the finish gap (bezel depth, cast shadow, material, palette) was handed to #535. **#535 did not close it**: PR #558 left the lever, valve and carb-heat art as #555 scored it, said outright that it does not claim the 2.5 mean, and no rubric re-score was recorded on it. The gap stays open (open question 6).
2. **Throttle detent ticks** (#534): the throttle has an unworded detent tick at each of its five stops, so the stops can be told apart and counted. This is a trainer addition: the aircraft's placard prints only FULL and IDLE (open question 5).
3. **Large knob place** (#534, #535): #555 drew the knob right of the parking-brake valve, not aft of it, because the cell had no room aft once the levers were long enough, and shrinking the valve would drop its lettering below the 11 px floor. **#535 moved it directly aft of the valve**, using the bulkhead cell's height, with the valve kept at full size. It stays inert artwork until #536 settles what it is.
4. **Lever order trim, choke, throttle, brake** (#534, #529): inferred from the handbook figure read as a top view with forward to the left (HB 7-19, 7-12), and marked assumed (unverified) at intake §9 question 31 (#538).
5. **Carb heat outboard** (#534): moved off the place the handbook figure shows the large knob, and out of the lever row so it does not read as a fifth engine lever. Assumed, §9 question 3.
6. **Rescue handle a little to the pilot's side** (#535): the knob holds the column aft of the valve, so the handle cannot sit on the centreline. Assumed, §9 question 26.
7. **`onlyFrom` as a new rotary field** (#521): the interlock shape cannot express "out only from OFF". A refusal reuses the `locked` result, so it shows no notice and no ring (follow-up #560).
8. **One `guard` item kind** (#520): moving the guard does the item; a guard move is never a deviation; a carried leg keeps the guard as the pilot left it.
9. **Ring the holder, not the refused control** (#508), as a double accent outline, so it reads apart from the Guided and stray rings on the same control.
10. **The surprise in a full flight comes after a random item of the leg** (#510), not after a time delay, since short legs end before any delay; the failure leg ends the flight. Only phases where a leg starts are offered, so the demo has no surprise select.
11. **Any checklist can be taken in a surprise** (#517): picking the right one is the skill the drill trains.
12. **Check tolerances are the trainer's own** (#509): rpm ±100, oil pressure ±0.5 bar, temperatures ±5 °C, flaps ±0.5°; the magneto-drop checks take no reading; only normal procedures changed.
13. **Practice-only Best** (#515): stored Guided bests are dropped on read, not migrated.
14. **No device-state re-seeding in a full flight** (#519): the checklists switch the GPS and intercom on instead. Assumed, §9 question 32.
15. **The blink rate is a trainer value** (#533); under reduced motion the digits dim instead of blinking.
16. **The demo shutdown check became an action** (#518) rather than teaching the walker to set controls for checks.

## Open questions for the owner

1. **Preset flow items tick themselves** (#505), even in Practice with Hide upcoming items. Keep, or require a touch or a Verified tick in Practice?
2. **Large knob** (#536, intake §9 questions 10 and 11): propeller lever or cabin heat? It is drawn aft of the valve as inert artwork until you decide.
3. **Ignition legends** (#537, §9 question 8): OFF, 1, 2, 1+2, START or OFF, L, R, BOTH, START? The handbook leans to numbers.
4. **Console lever order** (#538, §9 question 31): trim wheel, choke, throttle, brake from the pilot's side outward. Is that D-MPGO?
5. **Throttle detent marks**: does D-MPGO's throttle quadrant have detent marks? The trainer draws unworded ticks at its five stops.
6. **Console finish below the rubric bar**: accept the console at a mean of 2.17, or file a finish issue (bezel depth, cast shadow, material, palette)?
7. **Airfield data licence** (spike #483): OurAirports, openAIP, DFS or OpenStreetMap for pre-selected airfields?
8. **The M14 plan is not in the repository.** The milestone description names `docs/superpowers/plans/2026-10-08-m14-console-realism-and-follow-ups.md`, which was never committed; its content lives in the issues and PRs above. Commit it after the fact, or leave M14 without a plan file?
9. **Assumed (unverified) facts this milestone added to the intake**, for you or the club to check on D-MPGO:
   - §9 q3: the carb-heat knob's place, right-seat side of the console top, outboard of the levers.
   - §9 q25 and §3.4: the THROTTLE and TRIM titles (the handbook gives only the end legends); the throttle's unworded detent ticks (question 5 above).
   - §9 q26: the T-grip on a release lever in a fore-and-aft slot with a guide block; the plate printing RESCUE and PULL HARD with forward chevrons; a pin with a ring and no remove-before-flight flag; the handle's place across the aft shelf.
   - §9 q29: the flap readout's blink rate.
   - §9 q31: the lever order (question 4 above).
   - §9 q32: the intercom switched on in Engine start after Avionics Master on, the GPS in Before take-off after the transponder, with a position-fix check.

Follow-ups, without milestone (none blocks the release):

- From the whole-milestone review: #560 a key-out refusal from `onlyFrom` shows no notice and no ring; #561 Hide upcoming items in the Full flight drill changes the setting for every Practice run; #562 the spec should say outright that a surprise opens with no checklist and offers Run this checklist for every procedure.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when 4399 is busy).
- Perf: `E2E_PERF=1 pnpm test:perf` on a quiet machine. At the release cut it passed: over three A/B rounds against v0.14.0, every view of both aircraft stayed within the plan's A/B margin; the taller console view measured faster, and the main-bulkhead view is gone. The figures are in the release preparation PR.
- Whole-milestone review: three reviewers over the diff since v0.14.0 (aircraft content, core and web, docs and changelog). Verdict: ship, no blockers. Folded into the release preparation PR: intake text M14 had made stale (the N3 intercom order, q10, q20 to q22, q25, q26 and the large knob's "not modelled" line), the CT Supralight README (key out only at OFF, the unprinted lever stops, the blinking flap readout), the aircraft guide (check `expected` and `response`, indicator `blink`), the device guide (device `legends` and the test that checks them), the spec (`onlyFrom`, the refusal ringing the holder, readout blink) and one changelog checklist name. The rest is filed as follow-ups above.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the merge: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through at 1920x1080, CT Supralight, English:

1. **Console.** Pick Before take-off in Guided. The console is drawn from above: trim, choke, throttle, brake side by side, the valve aft of them, the knob aft of the valve, the rescue handle low at the aft end with its pin in. Drag the throttle through its stops; only FULL and IDLE are printed.
2. **Refusals.** In Free explore from Parking, with the fuel valve closed, try to put the key in: the notice names the fuel valve and the valve is ringed. Open the valve, put the key in and turn it to BOTH; close the valve, then try to take the key out: the key stays, with no notice yet (#560).
3. **Checks.** Run Before take-off in Practice: a check names what to read and asks for the value; the flap readout blinks while the flaps travel.
4. **Full flight with a surprise.** Drills: Full flight in Practice, surprise in Cruise, Hide upcoming items on. Fly until the failure shows, pick a checklist and run it; the summary ends the flight with the failure leg. The safety pin is out from Before take-off on and goes back in during Shutdown and securing.
5. **Surprise drill.** Drills: Surprise failure. It opens with no checklist shown; every procedure offers Run this checklist.

When you merge the release PR: wait until the Deploy run's `prod-environment` job of the push to `main` has finished before any push to `develop`. Then the next session confirms tag `v0.15.0` and the Release (`gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.15.0 --jq .tag_name`), closes milestone 15, and opens a backmerge only if `main` holds a hotfix.
