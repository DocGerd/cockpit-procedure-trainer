# M18 D-MPGO avionics (v0.19.0)

Milestone M18 is released as v0.(18+1).0, so this is v0.19.0; on GitHub it is milestone 19. The goal: replace the CT Supralight's avionics with the units installed in D-MPGO, as four new device packages, and install them in the panel's upper-centre field. The Demo aircraft's panel is unchanged; the shared panel-kit glare (PR #671) and the app frame's tablet header (PR #689) change for every aircraft, the Demo included.

## What shipped

For pilots:

- **Four new avionics units** (PRs #681 to #684 for the devices, PR #686 for the install, issue #678): the funkwerk ATR833-OLED COM radio (`atr833`), the funkwerk TRT800H-OLED transponder (`trt800h`), the Garmin aera 500 GPS in its cradle (`aera500`) and the classic FLARM external LED display (`flarm`). Each opens in the cockpit's dock, where its keys are operable, and mirrors live in its panel slot.
- **CTSL installs them** (PR #686, closes #678 and #633): they replace the Garmin SL40, GTX 327 and GPSMAP 496. The aircraft is now named "CT Supralight" in both languages. The FLARM runs on the avionics bus with no breaker of its own; the Com, Transponder and GPS breaker legends stay.
- **Procedures follow the units** (PR #686): the radio and transponder procedure uses FREQ, swap, I/O, VFR and MODE; before take-off presses the transponder's I/O, accepts the aera's databases, opens its map page and checks that the FLARM shows Power, GPS and TX lit. The GPS fix check reads the aera's own wording.
- **Softer glare over device screens** (PR #671, closes #657): the display reads through the glass.
- **Tablet header keeps the aircraft name whole** (PR #689, closes #661); secondary captions are guarded again in the e2e viewport matrix.
- **Whole-milestone review fixes** (PR #696, closes #692 and #691): a pilot who already accepted the aera's databases can tick that step instead of being stuck, and Guided no longer rings the aera's keys for it; the after-landing checklist sets the transponder to STBY; the TRT800H keeps I/O, VFR and ID above its display; the ATR833 ignores the release of a 5 s SET hold; the old units' READMEs no longer claim an installation.

For maintainers:

- **Intake and spec** (PR #680, closes #672): intake §2a items 5 to 9, new §3.8 with one paraphrased section per unit, §9 questions 33 to 39, the spec's "Avionics (CTSL)" row, and the M18 plan.
- **Slot-fit check moved to the installs** (PR #679, closes #673): `apps/web/src/devices/slot-fit.test.tsx` checks every registered aircraft's installs; `SLOT_OF` in `tools/device-entry.test.ts` is gone.
- **Old units kept unregistered:** `device-sl40`, `device-gtx327` and `device-gpsmap496` stay in the repository with their tests and READMEs; `UNREGISTERED` in `tools/device-entry.test.ts` pins them.

## Decisions made

Owner decisions and the identification outcome (intake §2a items 5 to 9, §3.8):

1. **D-MPGO's own avionics replace SL40, GTX 327 and GPSMAP 496** (spec change, approved; decisions-table row "Avionics (CTSL)"). The device ids are `atr833`, `trt800h`, `aera500` and `flarm`.
2. **COM is the funkwerk ATR833-OLED, not the ATR 500.** Its facts come only from the manufacturer-hosted ATR833-II manual, and only for controls on D-MPGO's face; II functions without a control on the face (push-to-talk, external interfaces) are out. Reason: the II manual is the only source the manufacturer hosts; an ATR833A-OLED cannot be ruled out, which is open question 3.
3. **Transponder is the TRT800H-OLED; round means H.** Settled by its round 57 mm housing.
4. **The FLARM is the rectangular classic FLARM LED display**, about twice as wide as tall, not the round 57 mm unit the owner expected. The owner approved the rectangular display and a full device.
5. **GPS is the aera 500**, confirmed from its bezel, in its panel cradle.
6. **The old devices stay** unregistered, and the generic `device-com` and `device-transponder` stay for the Demo aircraft (intake §2a item 8).
7. **"(representative panel)" is dropped** from the aircraft name when the units land (PR #686, intake §2a item 9): the panel follows D-MPGO's photos now.
8. **The FLARM is placed left of the GPS, not above it** for space (plan D12, the §3.2a compromise, PR #686). COM and transponder stay left under the GPS so the COM slot still reaches over the dock; the lower right of the field stays empty under the checklist placard.

Agent decisions (reasons in the PRs):

9. **Registered but uninstalled units carry "No changelog"** (plan D14, PRs #681 to #684): the entry lands once, with the install. The task briefs asked for fragments; the plan was followed.
10. **Dock screens narrowed to fit the CTSL dock at its narrowest, in both languages** (PR #686): the Close column and padding leave about 364 px at the dock's 480 px `minWidth`, and the plan's bound omitted that column. ATR833 keys 88 to 64 px, aera screen 456 to 336 px (map fields in two rows on the dock), FLARM window 384 to 320 px; every key is still 44 px. A wider dock would have moved the combined/tabs breakpoint or shrunk the centre cells. `layout.spec.ts` now fails whenever the CTSL dock scrolls; the Demo dock still scrolls in German at 1920x820 (#687).
11. **Qualities sacrificed (ADR 0002)** for legibility (PR #686): the round units draw at about 1.8 times and the FLARM at about twice their size; the frame prints `COM` and `ATC` across the top-left corner rather than vertically; the frame's corner screws sit under the knob discs.
12. **FLARM power on the avionics bus with no breaker** (plan D11): `bus.avionicsPowered`, `supplyVolts` reads `bus.volts`; the "avionics off before engine start" placard covers it.
13. **Bay captions `GPS`, `COM RADIO`, `TRANSPONDER` dropped:** D-MPGO prints none, and each sat under its mirror.
14. **Transponder check reads the unit's own `on`**, not the install's power: the TRT800H rests in STBY while off, so the old form passed before I/O.
15. **A press that switches a unit on is spent** (PRs #681 to #684): a long press does not switch off right after switching on, and a key held through power-up never fires.
16. **Mirrors leave out what does not fit at `--text-2xl`:** the FLARM mirror shows no Mode key or side words; the aera mirror keeps GS and BRG; the ATR833 shows a browsed memory frequency without its `SBY` label. All remain on the dock screen.
17. **Assumed constants, listed in each README:** `STORED_SHOW_MS`, the aera's POWER hold and receiver-status split, the FLARM self-test and confirmation timings, ATR833 ranges (VOL, SQL, VOX, BRT, EXT).
18. **`doneWhen` on action items** (PR #696): the aera's acceptance step ticks cleanly when its condition already holds, while a live press still completes it. Chosen over the reviewer's proposed check because the walk-through answers a check only by waiting, never by operating a control. Spec §4.7, `docs/adding-an-aircraft.md` and `docs/adding-a-device.md` amended; the decisions table is unchanged.
19. **Guided after an early accept cues nothing** (PR #696): the step has no current target, so no key is ringed.
20. **Header: a long procedure title truncates before the aircraft name** (PR #689): the name floors at its full width (capped 144 px). Sacrificed: full titles on a tablet for the longest names.
21. **Tablet breaker and dial captions stay small, no art change** (PR #689): reaching the minimum needs about 1.8 times the font, which does not fit the breaker pitch and would redraw rubric-passed art. The guard `SECONDARY_MIN_PX` (half `MIN_TEXT_PX`) is on, the CTSL tablet rows are known `test.fail` gaps, and the fix wave stopped there under the two-fix-wave rule (open question 4).
22. **Glare lowered, not removed** (PR #671): the depth shadow and the glass rim stay; a test ceiling keeps the shares at or below 18 percent (canopy band 6 percent).
23. **Old-unit READMEs now say unregistered** (PR #696, which completes the follow-up #688), and the mirror docs call `RADIO_MIRROR` and `GPS_MIRROR` mirror sizes.

## Open questions for the owner

1. **Assumptions in intake §9, questions 33 to 39** (all unverified): FLARM power on the avionics bus with no breaker (33); the FLARM check before take-off (34); ATR833 AUTO ON, so no COM switch-on step (35); ATR833 generation and the lower-right knob printed `FREQ` (36); TRT800H cradle, VFR code 7000 and the knob printed `CODE` (37); the aera's behaviour on cradle power loss, track-up orientation and data fields (38); FLARM hardware generation and pairing (39). Please correct any that differ from D-MPGO.
2. **Simulated FLARM traffic** would change the spec's scope (§4.9) and needs your decision. Not built: the display declares no traffic input, so RX stays dark.
3. **COM generation:** the only source is the II manual; an ATR833A-OLED cannot be ruled out, and II-only features without a model are REPLAY, memory names and the split sidetone items (the LST list is modelled).
4. **Tablet caption gaps (#661 follow-up):** breaker-row labels and dial captions are still about 5 to 6 px at 1024 px width; accepted under the two-fix-wave rule and tracked as #690. Decide whether the tablet needs an art pass.
5. **Open follow-ups:** #685 (ATR833 power-loss tests assert a state that was never set), #690 (above), #687 (Demo dock scrolls in German at 1920x820), #693 (FLARM Mode key between the LED column and the ring), #694 (one funkwerk look for the two mirrors), #695 (CLAUDE.md device touch points, via `/revise-claude-md` in the main session only). #618 (flaky tablet-drawer e2e) still fails locally on develop and passes in CI.
6. **Missing verifier passes and score:** no ui-verifier pass is recorded for #671, #686 and #696, and #686 has no blind rubric score, though the plan requires both before a render-changing PR leaves draft. Please review the panel and the TRT800H dock layout by eye in UAT, or ask for the passes before the release.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). Known flake: #618.
- Each task PR had a separate reviewer; ui-verifier passes on render-changing PRs: #689's returned a BLOCKER that the orchestrator accepted (decision 21, open question 4); the PR record shows no pass for #671, #686 or #696 (#696 was a draft awaiting one), and no blind rubric score for #686. Open question 6 asks you to treat these as unverified.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT at 1920x1080:

1. **Panel.** Pick the CT Supralight (named "CT Supralight") and Free explore: the FLARM display sits left of the aera 500, with the round COM and transponder units below; no bay captions.
2. **Power the avionics.** Switch on the battery and the avionics master: the ATR833 mirror shows its display (it is AUTO ON); the TRT800H mirror stays dark until its I/O key is pressed in the dock, then rests in STBY; the aera shows its start-up page and the FLARM runs its self-test, then the GPS search.
3. **Dock.** Open each device in the dock: ATR833 (FREQ, swap, I/O), TRT800H (I/O, VFR, MODE), aera 500 (accept, Map) and FLARM (Mode). No CTSL dock scrolls sideways; the Demo dock still does in German at 1920x820 (#687).
4. **Guided before take-off.** Run N6 in Guided: it presses the transponder's I/O, accepts the aera's databases, opens its map page, then checks the FLARM shows Power, GPS and TX lit. Repeat after accepting the databases early: the step is ticked, not stuck.
5. **After landing.** Run the After landing procedure (N15): two MODE presses leave the transponder at STBY.
6. **Header.** At 1024 px width the aircraft name is whole beside a long procedure title.
