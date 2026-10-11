# M18 D-MPGO avionics (v0.19.0)

Milestone M18 is released as v0.(18+1).0, so this is v0.19.0; on GitHub it is milestone 19. The goal: replace the CT Supralight's avionics with the units installed in D-MPGO, as four new device packages, and install them in the panel's upper-centre field. The Demo aircraft's panel is unchanged; the shared panel-kit glare (PR #671) and the app frame's tablet header (PR #689) change for every aircraft, the Demo included.

The milestone ran in two parts. The first wave built and installed the four units with framed faces. At UAT you rejected those faces because they did not look like D-MPGO's units. A face-fidelity wave (PRs #705 to #711, issues #698 to #704) then rebuilt all four faces from the photos, and repainted the CTSL centre panel as bare aluminium. Each rebuilt unit and the panel passed a blind photo-fidelity check before it landed.

## What shipped

For pilots:

- **Four new avionics units** (one device PR each, then PR #686 installs them for issue #678): the funkwerk ATR833-OLED COM radio (`atr833`, PR #684), the funkwerk TRT800H-OLED transponder (`trt800h`, PR #681), the Garmin aera 500 GPS in its cradle (`aera500`, PR #683) and the classic FLARM external LED display (`flarm`, PR #682). Each opens in the cockpit's dock, where its keys are operable, and mirrors live in its panel slot.
- **CTSL installs them** (PR #686, closes #678 and #633): they replace the Garmin SL40, GTX 327 and GPSMAP 496. The aircraft is now named "CT Supralight" in both languages. The FLARM runs on the avionics bus with no breaker of its own; the Com, Transponder and GPS breaker legends stay.
- **Faces that match D-MPGO's units** (face-fidelity wave). Each unit draws its own face, the same in the dock and in its slot, on bare panel metal with no square bezel:
  - **ATR833** (PR #710): a round black disc with three round keys above and three below the yellow OLED window, legends above the caps, `▲▼` swap glyph, the curved VOL/SEL legend, two knurled knobs outside the disc, two screws, and COM printed upright down the left.
  - **TRT800H** (PR #708): a round black disc with I/O, VFR and ID above and MODE, `▲▼` and `►` below the window, one knurled knob, three screws, ATC upright down the left and yellow OLED lines.
  - **aera 500** (PR #711): the touchscreen in its dark cradle with the latch rail and the POWER key on the top edge, a yellow-green VFR-chart map with its four fields where the unit prints them, the range at the map's lower right, and Out, In, Menu and Home soft keys down the screen's right side. Every touch key is on the glass; Menu is drawn but not operable.
  - **FLARM** (PR #709): a slate face with the four status LEDs, the Mode key in its printed frame, the above and below LEDs on their bar, and the ring of ten LEDs with spokes around a straight-wing aircraft.
  - In the dock, flat `+`/`−` touch helpers sit beside each knob, outside the unit (VOL/SEL and FREQ on the ATR833, CODE on the TRT800H).
- **Aluminium centre panel** (PR #707): the CTSL avionics field is brushed aluminium with no recesses, frame or GPS cradle drawn behind the units; the GPS slot grows from 400x250 to 440x275 at the same 8:5 aspect.
- **Procedures follow the units** (PR #686): the radio and transponder procedure uses FREQ, swap, I/O, VFR and MODE; before take-off presses the transponder's I/O, accepts the aera's databases, opens its map page and checks that the FLARM shows Power, GPS and TX lit. The GPS fix check reads the aera's own wording.
- **Softer glare over device screens** (PR #671, closes #657): the display reads through the glass.
- **Tablet header keeps the aircraft name whole** (PR #689, closes #661); secondary captions are guarded again in the e2e viewport matrix.
- **Whole-milestone review fixes** (PR #696, closes #692 and #691): a pilot who already accepted the aera's databases can tick that step instead of being stuck, and Guided no longer rings the aera's keys for it; the after-landing checklist sets the transponder to STBY; the TRT800H keeps I/O, VFR and ID above its display; the ATR833 ignores the release of a 5 s SET hold; the old units' READMEs no longer claim an installation.

For maintainers:

- **Own-face devices** (PR #706, closes #699): a `DeviceScreenEntry` may set `face: 'own'`. The dock then draws a borderless brushed plate and the mirror draws no bezel, label column or glass; the device draws its whole face. New panel-kit parts: `FaceKey` (one target from legend top to cap bottom), `KnobHelpers`, the `.pk-glass` window and a `labelAt` slot-label position. New panel tokens: `--panel-oled`, `--panel-face-slate`, `--panel-led-lit`, `--panel-body-grey` and four `--panel-chart-*` tokens. `slot-fit.test.tsx` holds mirror lettering marked `data-lettering="secondary"` to half the minimum. See "A device that draws its own face" in `docs/adding-a-device.md`.
- **Face layouts in the intake** (PR #705, closes #698): each of §3.8.1 to §3.8.4 gains a paraphrased "Face layout (photos)" block in normalised coordinates, with four corrections from the photos; the M18 plan gains the addendum "Face fidelity fix" (decisions D16 to D26).
- **Intake and spec** (PR #680, closes #672): intake §2a items 5 to 9, new §3.8 with one paraphrased section per unit, §9 questions 33 to 39, the spec's "Avionics (CTSL)" row, and the M18 plan.
- **Slot-fit check moved to the installs** (PR #679, closes #673): `apps/web/src/devices/slot-fit.test.tsx` checks every registered aircraft's installs; `SLOT_OF` in `tools/device-entry.test.ts` is gone.
- **Old units kept unregistered:** `device-sl40`, `device-gtx327` and `device-gpsmap496` stay in the repository with their tests and READMEs; `UNREGISTERED` in `tools/device-entry.test.ts` pins them.

## Decisions made

Owner decisions and the identification outcome (intake §2a items 5 to 9, §3.8):

1. **D-MPGO's own avionics replace SL40, GTX 327 and GPSMAP 496** (spec change, approved; decisions-table row "Avionics (CTSL)"). The device ids are `atr833`, `trt800h`, `aera500` and `flarm`.
2. **COM is the funkwerk ATR833-OLED, not the ATR 500.** Its facts come only from the manufacturer-hosted ATR833-II manual, and only for controls on D-MPGO's face; II functions without a control on the face (push-to-talk, external interfaces) are out. Reason: the II manual is the only source the manufacturer hosts; an ATR833A-OLED cannot be ruled out, which is open question 3.
3. **Transponder is the TRT800H-OLED; round means H.** Settled by its round 57 mm housing.
4. **The FLARM is the rectangular classic FLARM LED display**, not the round 57 mm unit you expected. You approved the rectangular display and a full device.
5. **GPS is the aera 500**, confirmed from its bezel, in its panel cradle.
6. **The old devices stay** unregistered, and the generic `device-com` and `device-transponder` stay for the Demo aircraft (intake §2a item 8).
7. **"(representative panel)" is dropped** from the aircraft name when the units land (PR #686, intake §2a item 9): the panel follows D-MPGO's photos now.
8. **The FLARM is placed left of the GPS, not above it** for space (plan D12, the §3.2a compromise, PR #686). COM and transponder stay left under the GPS so the COM slot still reaches over the dock; the lower right of the field stays empty under the checklist placard.
9. **Faces follow the real units** (your UAT rejection of the first faces): all four faces match D-MPGO's units; the dock shows the real face scaled up, plus touch helpers where a real control is awkward to touch; the slot mirror is the same face at panel scale.

Face-fidelity decisions (plan addendum D16 to D26, PRs #705 to #711). They supersede plan D3 ("no panel-kit change for round faces"), D6's `▼▲` swap glyph and its "no pictograms" clause, D15, and the plan's 456x303 dock cap:

10. **A device may own its whole face** (D16, `face: 'own'`), with a light brushed-metal dock plate (D18).
11. **Mirror lettering tier** (D17): face legends and secondary readouts are secondary lettering, held to half the lettering minimum at the panel floor; main values and the slot label keep the full minimum. Quality sacrificed: legibility of mirror legends, for realism, since the real units print them small. The alternative is caps without legends in the mirror.
12. **Knob touch helpers** (D19): a flat `+`/`−` pair beside each knob in the dock, outside the unit box, printing the knob word. Touch hit boxes may be larger than the drawn control and reach into non-operable bezel, but never overlap another operable control (D25).
13. **Labels** (D20, D21): the FLARM prints the unit word `FLARM` in the wordmark footprint, not the logo; the aera's "GPS" slot label sits in the body's bottom band, outside the brand footprint, and is not printed in the dock.
14. **aera soft keys** (D22): generic self-drawn pictograms; Menu is drawn and not operable, because page menus are not modelled. **The range label** prints at the map's lower right, right-aligned over DIST NEXT (PR #711; intake §3.8.3).
15. **The device draws the cradle** (D23); the panel art drops it. **Slot aspects are frozen** (D24): the panel PR could resize slots, not reshape them.
16. **Dock content cap measured, not taken from the plan** (D26, PRs #705 and #706): the German Close column limits the width, so own-face screens are sized to fit the German dock at its narrowest. The aera and FLARM are drawn about 7 percent smaller than the fix plan proposed.
17. **Legibility over realism (plan D4) where the photo check measured a delta:** the GPS slot is about 1.6 to 1.8 radio diameters wide, not the photographed 2.8 (rubric GPS-14): it fills the field height at the frozen 8:5 aspect and cannot grow without shrinking the round units or moving the checklist card. In the dock, the aera's corner field labels (GS, BRG, ETE NEXT, DIST NEXT) print at about 1.7 to 2 times the photographed footprint. The mirror COM and ATC labels are larger than the units' lettering because the frame label keeps the full minimum.
18. **The aluminium is SVG paint, not a token** (PR #707): the art is an image and cannot read CSS tokens; its gradient brackets `--panel-metal-light` so the field and the dock plate read as the same metal. The glareshield strip above the field stays dark.

Agent decisions from the first wave (reasons in the PRs):

19. **Registered but uninstalled units carry "No changelog"** (plan D14, PRs #681 to #684): the entry lands once, with the install. The face-wave PRs each carry a fragment.
20. **Dock screens narrowed to fit the CTSL dock at its narrowest, in both languages** (PR #686); every key is still 44 px. `layout.spec.ts` fails whenever the CTSL dock scrolls; the Demo dock still scrolls in German at 1920x820 (#687).
21. **FLARM power on the avionics bus with no breaker** (plan D11): `bus.avionicsPowered`, `supplyVolts` reads `bus.volts`; the "avionics off before engine start" placard covers it.
22. **Bay captions `GPS`, `COM RADIO`, `TRANSPONDER` dropped:** D-MPGO prints none.
23. **Transponder check reads the unit's own `on`**, not the install's power: the TRT800H rests in STBY while off, so the old form passed before I/O.
24. **A press that switches a unit on is spent** (PRs #681, #683 and #684): a long press does not switch off right after switching on. The FLARM (PR #682) has no switch-on key; its Mode key is ignored during the self-test.
25. **Assumed constants, listed in each README:** `STORED_SHOW_MS`, the aera's POWER hold and receiver-status split, the FLARM self-test and confirmation timings, ATR833 ranges (VOL, SQL, VOX, BRT, EXT).
26. **`doneWhen` on action items** (PR #696): the aera's acceptance step ticks cleanly when its condition already holds, while a live press still completes it. Spec §4.7, `docs/adding-an-aircraft.md` and `docs/adding-a-device.md` amended; the decisions table is unchanged. Guided after an early accept cues nothing.
27. **Header: a long procedure title truncates before the aircraft name** (PR #689). Sacrificed: full titles on a tablet for the longest names.
28. **Tablet breaker and dial captions stay small, no art change** (PR #689): reaching the minimum needs a font that does not fit the breaker pitch and would redraw rubric-passed art; the gaps are known `test.fail` rows (open question 4).
29. **Glare lowered, not removed** (PR #671): the depth shadow and the glass rim stay.

## Open questions for the owner

1. **Assumptions in intake §9, questions 33 to 39** (all unverified): FLARM power on the avionics bus with no breaker (33); the FLARM check before take-off (34); ATR833 AUTO ON, so no COM switch-on step (35); ATR833 generation and the lower-right knob printed `FREQ` (36); TRT800H cradle, VFR code 7000 and the knob printed `CODE` (37); the aera's behaviour on cradle power loss, track-up orientation and data fields (38); FLARM hardware generation and pairing (39). The aera's POWER legend, its Home grid and non-Map page layouts are assumed too (PR #711). Please correct any that differ from D-MPGO.
2. **Simulated FLARM traffic** would change the spec's scope (§4.9) and needs your decision. Not built: the display declares no traffic input, so RX and the ring stay dark.
3. **COM generation:** the only source is the II manual, and an ATR833A-OLED cannot be ruled out. REPLAY and memory names are not modelled; whether the original unit has the LST list and the split sidetone items is unconfirmed (intake §9 question 36).
4. **Tablet caption gaps (#690):** breaker-row labels and dial captions are still below the minimum at 1024 px width, and the face mirrors' secondary words fall below half the minimum there too. #689's ui-verifier reported this as a blocker; it was accepted under the two-fix-wave rule. Decide whether the tablet needs an art pass.
5. **Points from the face wave's ui-verifier passes** (all PASS):
   - **Centre field shade (PR #707):** the field renders mid-grey rather than the "light" aluminium the changelog says, and the mirror captions on it have low contrast. The blind photo check measured it inside the photos' range. Should it be lighter?
   - **FLARM LED green (PR #709):** please confirm the lit status-LED green against the unit.
   - **ATR833 (PR #710):** the VOL/SEL legend crowds the MEM legend; cosmetic.
6. **Follow-ups:** #685 (ATR833 power-loss tests assert a state that was never set), #687 (Demo dock scrolls sideways in German at 1920x820 with the transponder docked), #688 (old-unit README openings still name the analog panel variant), #690 (above), #695 (CLAUDE.md device touch points, via `/revise-claude-md` in the main session only). #693 (FLARM Mode key between the LED column and the ring) and #694 (one funkwerk look for the two mirrors) look settled by PRs #709, #708 and #710; please confirm, and they can be closed. #618 (flaky tablet-drawer e2e) still fails locally and passes in CI.
7. **No blind rubric score for #686:** the plan's whole-panel rubric score for the install (W3) was not run. The face wave's photo-fidelity checks since cover each unit and the centre field (PR #707), but not the whole panel against the rubric. Please review the CTSL panel by eye in UAT, or ask for the score.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). Known flake: #618.
- Each task PR had a separate reviewer. ui-verifier passes: #671, #686 and #696 PASS on their final heads; #689 reported a BLOCKER for the CTSL tablet captions, accepted (open question 4, #690); #707 to #711 PASS (#707 with the notes in open question 5). Blind photo-fidelity checks: ATR833, TRT800H, aera 500, FLARM and the centre field all passed; the aera's slot-mirror corner labels were fixed in PR #711 before it landed.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT at 1920x1080:

1. **Panel.** Pick the CT Supralight and Free explore: on a bare aluminium field, the FLARM display sits left of the aera 500 in its cradle, with the round ATR833 and TRT800H discs below; no recesses or bay captions. Compare with D-MPGO's photos.
2. **Power the avionics.** Switch on the battery and the avionics master: the ATR833 shows its yellow OLED lines (it is AUTO ON); the TRT800H stays dark until its I/O key is pressed in the dock, then rests in STBY; the aera shows its start-up page and the FLARM runs its self-test, then the GPS search.
3. **Dock.** Open each device in the dock: the same face, larger, on a metal plate. ATR833 (FREQ, swap, I/O, and the `+`/`−` helpers beside its knobs), TRT800H (I/O, VFR, MODE, CODE helpers), aera 500 (Press To Accept, Map, Out/In/Home; range at lower right) and FLARM (Mode). No CTSL dock scrolls sideways, in English or German.
4. **Guided before take-off.** Run N6 in Guided: it presses the transponder's I/O, accepts the aera's databases, opens its map page, then checks the FLARM shows Power, GPS and TX lit. Repeat after accepting the databases early: the step is ticked, not stuck.
5. **After landing.** Run the After landing procedure (N15): two MODE presses leave the transponder at STBY.
6. **Header.** At 1024 px width the aircraft name is whole beside a long procedure title.
