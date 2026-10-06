# M6 CTSL (v0.7.0)

Milestone M6 is released as v0.(6+1).0, so this is v0.7.0. M6 was taken before M7 3D on your call, because M7 needs its own design.

## What shipped

The club's Flight Design CT Supralight is the trainer's second aircraft. It is a **representative CTSL panel**, self-drawn from the handbook's description, not a photo-accurate D-MPGO panel; the app names it "CT Supralight (representative panel)" and shows the handbook revision it follows (AE04300003, revision 01) in the picker.

- Intake record and plan: every fact the package uses, the handbook contradictions and the questions for the club and instructor (#213, closes #37 without photos).
- The aircraft with its views and placements: panel, radio stack, GPS, centre field and centre console; eight phases from parking to parking and securing, each with an outside view from the left seat (#214, closes #38).
- Systems and failures: electrical system, engine, fuel valve, flaps with override and end switches, brakes with the parking-brake valve; generator failure, engine stoppage, engine fire, coolant loss, oil loss and flap control failure (#220, closes #39).
- 12 normal procedures, from pre-flight to shutdown (#231, closes #40).
- 8 emergency procedures with their failures: engine failure below 100 m, engine failure with restart, rescue system deployment, engine fire, coolant loss, oil loss, flap control failure and the club-authored generator failure (#230, closes #41).
- Drawn artwork for every gauge and control, with on-dial lettering (#221, closes #42); 79 self-drawn SVGs, each listed in `packages/aircraft-ctsl/LICENSES.md`.
- Avionics as their own device packages: Garmin SL40 COM radio (#219, closes #210), GTX 327 transponder with a radio and transponder checklist (#229, closes #211), GPSMAP 496 in its own view (#235, closes #212 and #47).
- Artwork controls step both ways without wrapping, by tap, arrow keys, Home and End (#227, closes #222); the arrows follow the drawn direction and focus returns to the ignition after START (#239, closes #238).
- Artwork gauges carry units, rounding and arcs, so their accessible names read e.g. "Airspeed indicator: 200 km/h" (#228, closes #223).
- A printed label beside every control on every aircraft, the demo included, with a contract test over all registered aircraft (#240, closes #236).
- CTSL lettering legible at tablet width (#242, closes #241).
- The README links the live app and the UAT preview (#218, closes #217).
- The PWA build test recognises base64-inlined SVGs (#216, closes #215).
- From the release review: the rescue-system safety pin is out from departure until parking and securing, the departure starts with flaps 0° as the take-off checklist leaves them, and the climb selects −12° only after confirming a safe height; a phase entry may now set guard positions (`entry.guards`) (#248, closes #247).
- A long-open app checks for a new version every hour and when it becomes visible again (#252, closes #250).
- The Pages deploy has a timeout and one retry, records `uat` and `prod` deployments, and checks after each deploy that the site serves the pushed commit (`version.json`) (#251, closes #249).

## Decisions made

The spec's decisions table is unchanged.

### Your decisions this milestone

- M6 before M7 3D.
- Panel variant: analog gauges with the GPSMAP 496; the avionics are the units the handbook lists for that variant (SL40, GTX 327, GPSMAP 496) (#213).
- No club photos: views, outside views and artwork are self-drawn and called a representative CTSL panel (#213).
- Engine (912 UL or ULS) and rescue system unknown: the most conservative limits are used (VNE 260 km/h, CHT red line 120 °C, oil 130 °C), each an open question (#213).
- Handbook contradictions: the conservative value or step, each listed for the instructor in intake §8 (#213).
- The README links the live app and the UAT preview (#218).
- Every control on every aircraft panel carries a printed label (#236, #240).

### Orchestrator and implementer decisions you may overrule

- **Placards are fixed English panel wording, not translated** with the UI language, like a real placard and the artwork lettering; accessible names stay localised (#240).
- **Ambient temperature is 15 °C** (`AMBIENT_TEMP_C`, ISA sea level) for the cold engine; the intake gives none (#214).
- **#39 trainer assumptions** where the intake gives no figure: rpm per throttle notch (idle 1400, warm-up 2500, run-up 4000, cruise 4800, full 5000 static, up to 5500 in flight); ignition-circuit drops 150 rpm (L) and 200 rpm (R); windmilling 2 rpm per km/h with relight at 200 rpm; flap end switches at −14° and 37° at 5°/s; warm-up, cool-down and oil-pressure time constants; oil-loss seizure after 60 s; 12 V and 14 V bus voltages (#220).
- A closed fuel valve blocks only the START detent; the key still switches OFF, L, R and BOTH, because E6 lists "ignition off" after closing the valve (#220).
- **Run-up tachometer check accepts 4000 ± 100 rpm**, a trainer tolerance; the intake gives 4000 only. The 120 rpm difference between the two drops is judged by the pilot from the item text (#231).
- **`takeoff` starts with a trainer-added parking-brake release** (valve open, then a check that it is released), because the holding-point snapshot has the brake set and N7 has no brake item (#231; intake §9 item 18).
- Every speed, height and attitude step is a confirm item, because the environment stays the start phase's for the whole procedure (#231).
- **The restart practises START without the below-200-rpm branch**: the checklist cannot branch, and at cruise the propeller windmills above 200 rpm, where the handbook says START is not needed. The instructor should confirm (#230).
- **Generator failure is club-authored** and its title says so in both languages; the handbook has none (#230).
- The engine fire never deploys the rescue system; rescue deployment is trained as an engine failure with no field within reach (#230).
- **Device assumptions**, because no pilot's guide revision could be confirmed: SL40 25 kHz spacing, band 118.000 to 136.975 MHz, monitor as a hold button (#219); GTX 327 IDENT 18 s, VFR key 7000 (Germany), power-up code 2000 as a placeholder (#229); the GPS always shows "NO POSITION" and models only power, backlight and pages (#235).
- The devices sit in their own views (radio stack, GPS) rather than the panel bezels, so every key reaches the 44 px touch minimum at tablet width (#219, #229, #235).
- Gauge names stay full in both languages as accessible names; short on-dial lettering is artwork (#214, #221).
- Notched artwork controls with three or more positions are sliders; two-position ones stay toggle buttons (#227, #239).
- For legibility, STROBE is lettered STRB and the avionics plate reads "AVIONICS OFF TO START AND STOP"; the knee-board cards keep only their titles (#242).
- The PWA build test was fixed, not the build: inlined SVGs stay inlined (#216).
- The pin is out from departure through parking and securing, because "Before take-off" removes it and only "Shutdown and securing" puts it back; the safe-height confirm names no height, because the intake gives none (#248).
- **The Pages deploy uses `cancel-in-progress: true`**: the observed stall sat at the environment gate, where a timeout and retry cannot help. Trade-off: a cancelled `main` run loses its prod deployment record and freshness check until the next run redeploys prod from `main` (#251).
- The comment policy in code is unchanged by this milestone.
- Branch `feat/41-ctsl-failure-procedures` avoids a word the project's tripwire hook refuses (#230).

## Open questions for the owner

1. **Club and instructor list** (`docs/aircraft/ctsl-intake.md` §9, 18 items, each with the value in use): engine 912 UL or ULS; rescue system type and with it VNE; whether D-MPGO has a carb-heat control and where; how the engine-fire procedure ends; every contradiction in §8; the club-authored generator failure; ELT at shutdown; ignition key labels; the second warning lamp; the large knob right of the parking-brake valve; the propeller type; the trim wheel position; the cockpit-light switch; the installed avionics and their guide revisions; a club checklist card; the handbook copy on board; climb speeds; the parking brake before take-off.
2. **Guard state for checks**: checks still cannot see guard state, an accepted limitation for this release; #247 only lets a phase entry set guards. A core change would let "rescue system armed" be a check instead of a confirm item. Worth an issue?
3. **Club checklist card**: none was supplied; the procedures follow the handbook in our words. A club card would replace them (spec §7).
4. **Device manual revisions**: the SL40, GTX 327 and GPSMAP 496 logic follows general knowledge; each package README lists its assumptions. The club's installed versions are unknown.
5. **Keep #212 (GPS)?** Resolved by shipping it as an operable unit (#235).
6. **Placards in English** regardless of UI language (#240): confirm, or ask for translated placards.
7. **Your ideas filed without milestone**: hover info for mouse users instead of the Operate controls toggle (#237); background sound spike (#234).

Follow-ups filed without milestone: #224, #225, #226, #232, #233, #234, #237, #243, #244; older #157–#162 and #178–#186. Filed for M7: #246 (app version, copyright notice and the UAT build's commit in the UI).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e`. CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- On UAT, pick "CT Supralight (representative panel)" and run in Guided:
  1. Engine start and taxi.
  2. Before take-off (run-up with the ignition-circuit checks).
  3. Engine fire.
  4. Rescue system: engine failure with no field within reach (the safety pin is already out; the handle pulls directly).
  5. Set the radio and the transponder (radio stack view).
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.7.0 --jq .tag_name` prints `v0.7.0`.

### When you merge the release PR

Watch the Deploy run of the push to `main`. It should now record a `prod` deployment and pass the freshness check (the site serves the pushed commit). If the deploy job sits in "waiting" for minutes, cancel the run by hand and re-run it.
