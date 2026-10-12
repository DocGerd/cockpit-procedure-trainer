# CTSL intake record

The source every M6 implementer works from. Implementers have no access to the
flight manual; this file carries the facts they need, written in our own words.
Plan: `docs/superpowers/plans/2026-10-06-m6-ctsl.md`. Content rules:
`docs/content-policy.md`.

Nothing here is copied from the handbook: no sentences, tables or drawings. Limits
and speeds are facts restated in our own layout. German appears only as control or
checklist labels, in parentheses. "HB 4-3" means handbook chapter 4, page 3.

## 1. Handbook and aircraft

| Field                   | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aircraft type           | Flight Design CT Supralight (CTSL): high wing, stabilator with anti-tab, tricycle gear, two side-by-side seats, gull-wing doors. Not the CTLS.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Handbook                | CT Supralight flight and maintenance manual (Flug- und Wartungshandbuch), document AE04300003, revision 01 of 14 Jan 2010 (revision 00 was 28 Oct 2009).                                                                                                                                                                                                                                                                                                                                                                                                         |
| Club aircraft           | D-MPGO, Sportfliegerclub Schwetzingen, Herrenteich (EDEH). The handbook copy does not name the registration, and its equipment list and weighing report are factory examples, not D-MPGO's.                                                                                                                                                                                                                                                                                                                                                                      |
| `handbookRevision` text | `Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)`. The package `README.md` `## Source revision` uses the same words.                                                                                                                                                                                                                                                                                                                                                                                             |
| Panel wording           | The app and the package call the panel a **representative CTSL panel** drawn from the handbook's description, not a photo of D-MPGO's panel. Aircraft name: "CT Supralight (representative panel)", German "CT Supralight (repräsentatives Panel)". **Superseded 2026-10-10** (§2a): M17 redraws the panel from the owner's photos of D-MPGO; whether the name drops "representative" is settled by §2a item 9: it drops when the M18 units land. **Trainer (M18, #678):** dropped; the app and the package name the aircraft "CT Supralight" in both languages. |
| Photo survey            | Eight photos of D-MPGO's cockpit taken by the owner on 2026-10-10 and supplied for this intake: the panel from the left seat (four views), the lower centre field and console, the console between the seats aft to the bulkhead, and the two wing-root fuel sight gauges. Local-only: no photo, crop or derived image is in the repo. Findings in §3.7, answers in §9.                                                                                                                                                                                          |

## 2. Owner decisions (2026-10-06)

1. **Panel variant: analog gauges with a panel-mounted handheld GPS** (the handbook's
   first variant, HB 7-16). Avionics: COM radio Garmin SL40, Mode A/C transponder
   Garmin GTX 327 with an altitude encoder, GPS Garmin GPSMAP 496. Where the handbook
   leaves an item optional, the analog variant's default is taken and flagged (§9).
   **Superseded (M18, §2a item 5):** the CTSL carries D-MPGO's own units instead:
   funkwerk ATR833-OLED COM radio, funkwerk TRT800H-OLED transponder, Garmin aera 500
   GPS and the classic FLARM LED display (§3.8). The three Garmin devices stay in the
   repository, unregistered.
2. **No club photos.** View backgrounds, outside views and artwork are drawn for
   this project from the descriptions below and labelled a representative CTSL
   panel. No photos, scans, handbook drawings or manufacturer artwork in the repo.
   Outside views are first-person from the left seat.
   **Superseded in part (M18, §2a items 1 and 9):** the panel follows D-MPGO's photos
   and the name no longer says "representative panel"; the rest stands.
3. **Engine (912 UL or ULS) and rescue system are unknown.** The most conservative
   limits apply (§4) and each is an open question (§9).
4. **Handbook contradictions:** the conservative value or step is used (§8) and
   each is listed for the instructor.
5. **Checklists in the club's own words**, English with German control labels as
   the app already does. The package states the handbook revision. Glider and
   banner tow procedures are out of scope, although the club aircraft has a tow
   coupling.

Decision 1 is superseded by §2a item 5: milestone M18 replaces these three devices
with D-MPGO's own units (§3.8).

## 2a. Owner decisions (2026-10-10)

1. **The photos win.** The owner's photos (§3.7) show D-MPGO as it is today.
   Where they contradict a 2026-10-08 owner confirmation, the photo stands (the
   parking-brake valve's identity is inferred from its place and legend): the
   only warning lamp is the red "Generator" lamp in the upper-right field (not
   CHARGE in the upper-left); the parking-brake valve reads "Off", "Brake", "On";
   there is no panel compass; the panel has four fields, with an upper-centre
   field for the avionics. The superseded answers stay in this file, marked. An
   item the photos do not show (the ELT remote switch, the carb-heat control)
   keeps its current intake answer and stays as the trainer draws it.
2. **Avionics move, not change, in M17.** The installed units (FLARM display, a
   Garmin aera-like GPS, funkwerk COM and transponder; §3.7) replace SL40,
   GTX 327 and GPSMAP 496 in a separate milestone, M18 "D-MPGO avionics". In M17
   the existing devices move into the upper-centre field.
3. **The airspeed indicator follows the photos.** Its scale, red line and the
   limit-speed placard replace VNE 260 km/h (§4.1, §4.3, §8), and every procedure
   or text naming the old value follows. VNE 300 km/h is the owner's decision
   against the handbook's BRS value of 276 km/h (§8); the red line is read from
   the dial at about 300, so it stays **assumed (unverified)** until read on the
   aircraft.
4. **M17 is a full rework** of the CTSL panel from the photos: layout, gauges,
   breaker strip, console art, legends and texts. Plan:
   `docs/superpowers/plans/2026-10-10-m17-panel-from-photos.md`.

Milestone M18 "D-MPGO avionics" (issue #633, plan
`docs/superpowers/plans/2026-10-10-m18-d-mpgo-avionics.md`) rests on these owner
decisions of 2026-10-10:

5. **D-MPGO's own avionics replace SL40, GTX 327 and GPSMAP 496 in the CTSL** (a
   spec change, approved; decisions table row "Avionics (CTSL)"). The units are the
   Garmin aera 500 in its panel cradle; the funkwerk ATR833-OLED COM radio and the
   funkwerk TRT800H-OLED transponder, both round 57 mm; and the classic FLARM
   external LED display, built as a full device. **Identification outcome** (§3.8):
   the GPS is confirmed from its bezel; the COM radio is most likely the original
   ATR833-OLED (an ATR833A-OLED cannot be ruled out); the transponder is the
   TRT800H-OLED, settled by its round housing; and the FLARM display is
   **rectangular**, about 1.8 times as wide as tall, not the round 57 mm unit the owner
   expected, so the owner approved the rectangular display. The device ids are
   `atr833`, `trt800h`, `aera500` and `flarm`.
6. **COM facts come only from the ATR833A-OLED manual** (document 01.1411.010.71e,
   revision 3.00, read on ManualsLib), and only for controls on D-MPGO's face. The
   owner chose it on 2026-10-11 (#718) in place of the ATR833-II manual; that the A
   variant behaves like the original unit is §9 question 64. A function whose control
   the face lacks (for example the push-to-talk and external interfaces) is out.
7. **Sources for the rest:** the TRT800H manual, revision 3.00; for the FLARM display
   the EDIATec display sheet V5.1e and the FLARM operating manual; for the GPS the
   aera 500 Series Pilot's Guide. All are paraphrased, never copied (§3.8,
   `docs/content-policy.md`).
8. **The old devices stay.** `device-sl40`, `device-gtx327` and `device-gpsmap496` stay
   in the repository with their tests and READMEs, unregistered. The generic
   `device-com` and `device-transponder` stay as they are (demo aircraft).
9. **The aircraft name drops "(representative panel)"** when the units land, resolving
   the open point of §1. The Com, Transponder and GPS breaker legends stay.

Milestone M19 "D-MPGO panel layout" (issues #716 and #712) rests on this owner
decision of 2026-10-11:

10. **D-MPGO as a pilot recognises it.**
    - **Fidelity is recognition.** A pilot who trained on the trainer must strongly
      recognise D-MPGO's real panel: positions on the panel, relative sizes, dial type
      and pointer arrangement, where zero or the stop sits and which way the scale
      sweeps, numerals and units, the places of the coloured arcs, controls and
      windows (such as the altimeter's knob and pressure window). Colours, stickers,
      logos, fonts and fine ticks are optional. Positions and sizes: §3.9.
    - **The centre field is the outer panel's colour** (#716); the bare aluminium
      centre field of #707 is wrong. Label colour and contrast on it do not matter.
      Which colour that is, given that the photos show aluminium on every plate, is
      §9 question 40.
    - **Slot aspects are no longer frozen** (decision D24 of M18 lifted). Slot aspect
      ratios still stay unless the photos contradict them; they do not (§3.9.3).
    - **The COM radio is the original ATR833-OLED.** This settles the generation part
      of §9 question 36.
    - **No simulated FLARM traffic.** The FLARM display's receive LED and traffic ring
      stay dark outside the self-test; this settles the traffic part of §9 question 39.
    - **No tablet art pass** in M19.

## 3. Panel inventory (analog variant; superseded in part 2026-10-10, §2a)

The panel has three fields: upper left, upper right, and a narrow lower centre
column. An engine control unit sits on the centre console below it. Everything is
laid out for the left seat (pilot in command). The trainer draws three views:
`panel` (both upper fields), `centre` (lower centre field) and `console` (the
console top down to the rescue handle at its aft end, between the seats).

§3.1 to §3.6 record the handbook's analog variant. The owner's photos of D-MPGO
(§3.7) differ in many places and win (§2a), so the trainer follows the photos
where they differ: the **Trainer** and **Superseded 2026-10-10** notes in each
section say what it draws. §3.7.2 lists each difference against the trainer as
it stood before M17.

### 3.1 Upper-left field (view `panel`)

- Round airspeed indicator, left. Altimeter right of centre, a smaller vertical
  speed indicator between them at the top. A slip ball below, between airspeed and
  VSI (drawn in the background; not an indicator).
- Two round warning lamps at the top centre. One is the charge warning lamp
  (Ladekontrolle), driven by the generator rectifier. The second is unidentified
  for this variant (§9) and is drawn unlit in the background. The charge lamp's
  legend and colour are owner-confirmed (§9, question 22). **Superseded 2026-10-10** (§2a, decision 1): the
  only lamp is the red "Generator" lamp at the top right of the upper-right field;
  there is no second lamp.
- COM radio, then transponder below it, stacked in the lower centre of the field
  (device slots).
- Two placards at the far left: a short take-off checklist and a limits placard.
  Draw them as placards with our own short wording, not the handbook's.

**Trainer, M17 T4 (2026-10-10, §3.7):** four instruments in a 2×2: airspeed and
altimeter above, a slip indicator (background art, not an indicator) and the vertical
speed indicator below; no lamp. The radios and the GPS moved to the upper-centre field
(§3.2a). Placards in our own wording: "Takeoff Checklist" at the top (the summary
body is drawn as rules, since body print falls below the lettering floor) and, in
German as on the aircraft, "Kunstflug und Trudeln verboten" at the bottom.
The airspeed indicator stays 220 units wide because its numerals set the smallest
size that reads at the lettering floor (§4.3).

**Trainer, M19 (2026-10-11):** the positions, sizes and the plate's place in the panel
described here and in the M17 note above are superseded by §3.9 (§3.9.2 for the
gauges, §3.9.5 for the placards): the left plate is the widest, the instruments sit
in its inner three-quarters, and the registration lettering stands over the airspeed
indicator. Which instruments and legends are present stays as above.

### 3.2 Upper-right field (view `panel`)

- GPS in its cradle in the centre (device slot).
- Below it, four round engine gauges in a row: a larger tachometer on the left,
  then oil pressure, oil temperature and cylinder head temperature (CHT).
- A small item at the top left next to the type name: the magnetic
  compass. The trainer models it as an indicator that reads the heading of each
  phase from the airfield of `src/airfield.ts`. Its type, card sense and size are
  owner-confirmed (§9, question 20); the type name is not printed. **Superseded 2026-10-10** (§2a, decision 1):
  there is no panel compass.
- The circuit-breaker block at the right edge, push to reset, labelled "Circuit
  Breakers - Push off". Rows, as fitted in the analog variant: COM; transponder,
  position lights, intercom; GPS, strobe, landing light; 12 V outlet. The D-180
  and autopilot positions are not fitted in this variant (draw blanks).

**Trainer, M17 T4 (2026-10-10, §3.7):** the tachometer is the large gauge at the top
left; right of it a 2×2 of CHT and a voltmeter above, oil temperature and oil
pressure below, then the hour meter (inert art, no running value) and the red
"Generator" lamp at the top right. There is no compass. The breaker strip runs along
the lower edge, "Circuit Breakers" and "Push off" in the free space right of the
single "12V Outlet" breaker in the third row (the header's place is **assumed
(unverified)**). Top row: Com, Nav, Transponder, Autopilot, HS34, EFIS, EMS; bottom row:
Landing Light, Cockpit Light, Instrument Light, Beacon Light, Position Light,
Intercom, GPS. Com, Transponder, Landing Light, Beacon Light, Position Light, Intercom,
GPS and 12V Outlet carry the trainer's breakers; Nav, Autopilot, HS34, EFIS, EMS,
Cockpit Light and Instrument Light are inert caps drawn in the background, without
legends (the trainer's cockpit light has no breaker). Two of these differ from the
photos (§3.7.1), **assumed (unverified)**: the photos show EMS fitted, but the analog
variant has no EMS (E10), so it is drawn as a cap; they show Intercom as a plain cap,
but the handbook gives the intercom a 2 A breaker (§3.6) and the photo does not show
whether the cap is a blank, so the trainer keeps that breaker. The legends of the eight trainer
breakers print in full words on the control faces, small as on the aircraft: captions
marked secondary, an ADR 0002 trade-off (realism against the lettering minimum, equal
rank), because a legend like "Transponder" at the minimum does not fit the strip's
pitch. The inert caps carry no legend for the same reason, since background lettering
has no such exemption; the slip indicator, FLARM display and hour meter carry no
wording either. The type-name script lettering is not reproduced.

**Trainer, M19 (2026-10-11):** the layout of the right plate described above is
superseded by §3.9.2 and §3.9.4: the small engine gauges sit below the tachometer
(not beside it), the Generator lamp stands at the plate's horizontal middle, and the
breaker block spans seven columns with the 12V Outlet breaker under the second one
(not under the first). The set of instruments, breakers and legends stays as above.

### 3.2a Upper-centre field (view `panel`), M17 T4

- A glareshield strip across the top: the "Cabin Heat" knob and, beside it, a plain
  disc with a red cross (not identified), both inert art.
- The FLARM display left of the GPS; the GPS in its cradle; the COM radio and the
  transponder side by side below the GPS. All four are device slots of D-MPGO's own
  units since M18 (§3.8). **Corrected from the photos (face fidelity fix):** the
  aircraft has no recess, frame or caption around any unit, so the panel art draws
  none. The field is light brushed aluminium (§3.7.1), and each unit draws its own
  whole face on it, the aera 500's cradle included.
- **Layout compromises, assumed (unverified):** each slot keeps its mirror's aspect and
  is at least its natural size, because the mirror lettering must stay legible at the
  panel floor (1110 px for the 2372-unit panel): FLARM 320 by 160 units, GPS 440 by
  275, COM and transponder 272 by 272 each. The round units are drawn at about 1.8
  times their 57 mm and the FLARM display at about twice its size, so the field reads
  fuller than the aircraft. The GPS takes the whole height between the glareshield
  strip and the radio row, and so reaches about 1.6 D wide against its photographed
  2.8 D (§3.8): it cannot grow further without shrinking the round units below their
  legible size or moving the take-off checklist summary beside it.
  The upper-centre field is wider than the lower column and sits about 40 px left of
  it at HD, so that the radio slot reaches over the device dock, which stays left of
  the column under the panel. The FLARM display sits left of the GPS, not above it as
  in the photos (the field cannot hold the FLARM, the GPS and the radio row stacked at
  legible sizes). The second copy of the take-off checklist summary stands right of the
  GPS (heading and rules only), an **assumed (unverified)** place. The blank version
  label under the FLARM display is not drawn: its wording is unknown, so it would be a
  plate with no function.

**Trainer, M19 (2026-10-11):** the compromises above (slot sizes, the field's width,
its 40 px offset to the left of the column and the FLARM display left of the GPS) are
superseded by §3.9.3 and §3.9.7: the photos put the FLARM display top left, the GPS
centred under it and the radios side by side below, in the narrowest plate, with the
column hanging 0.37 A left of that plate's centre line (§3.9.6). The owner lifted the
frozen slot aspects (§2a item 10); the photos confirm today's aspects (§3.9.3). Sizes
and the remaining trade-offs are §9 questions 40 to 45. Two facts above are corrected:
the photographed GPS cradle is 2.50 D wide (1.80 A), not 2.8 D (§3.9.3), and the
version label is the yellow strip above the checklist copy at the plate's top right,
not a tab under the FLARM display (§3.9.5); it stays undrawn.

### 3.3 Lower centre field (view `centre`), top to bottom

- Rocker-switch row, left to right: **Avionics Master** (larger; checklist label
  Avionik), Beacon Light,
  Position Light, Intercom, Cockpit Light, Landing Light. A placard under the row
  says to switch the avionics off before engine start and stop.
- Below the row: 12 V socket marked "MAX 20A" (left), a fuel-capacity placard
  (62 l usable per side) and a limit-speed placard (flap setting against km/h,
  §3.7), all background art. **Trainer, M17 T4:** the intercom panel, the audio
  selector and the jacks are gone from the background (§3.7). The "Instrument
  Light" legend at the bottom centre is art, with no control.
- ELT remote switch (ELT Fernschalter; checklist label Notsender) with its lamp,
  left of centre.
- Flap position indicator (Klappenstellungsanzeige): a red seven-segment readout
  labelled "Flaps", centre. To its right the flap breaker (Klappensicherung, 8 A,
  thermal), then two headset emergency jacks (background). The readout blinks
  while the drive runs to the selected setting and shows steady once there; if it
  keeps blinking while the flaps extend, the drive's overload protection has
  stopped it (HB 7-12). The trainer blinks it the same way (#533).
- Fuel valve (Brandhahn), left: a vertical slide lever, open up (HB 4-3), closed
  down. When closed, its handle covers the ignition key slot (HB 3-6); the valve is
  shaped so the key can hardly be operated past it (HB 4-6). Assumed (unverified),
  from general knowledge of the CT Supralight (#447): the slide runs straight
  above the key switch and its handle comes down over the slot, so the key cannot
  be turned out of OFF while the valve is closed; the valve still closes with the
  key turned on, as E6 requires; legends FUEL VALVE, OPEN and CLOSED beside the slide.
  **Superseded 2026-10-10** (§2a, decision 1): the strip prints "Open", "Fuel",
  "Valve", "Closed" top to bottom, as the photos show (§3.7).
  For the key going in and out under the handle, see the ignition key below.
- Flap selector (Klappenwahlschalter), a rotary knob centre right, detents
  −12°, 0°, 15°, 30°, 35°, with an overtravel position beyond each end detent
  ("up" past −12°, "down" past 35°) for the manual override.
  The trainer prints "up manually" and "down manually" (§3.7, M17 T1) on one line
  each, beside its override detents at the ring's lower left and lower right; the
  photos stack each over two lines, both on the ring's left. That placement is a
  trainer departure.
- Ignition key switch with starter (Zündschalter), bottom left, labelled
  "Ignition": OFF, left circuit, right circuit, both, START (springs back to both).
  The dial legends cannot be read in the handbook's figure (HB 7-18); its restart
  item names the both position 1 + 2 (HB 3-5), which points to numbered positions
  (§9, question 8). **Superseded 2026-10-10** (§2a, decision 1): the trainer prints
  OFF, 1, 2, 1+2, START (M17 T1); 1+2 and START are assumed (unverified).
  The key goes in and comes out at OFF, and comes out only with the fuel valve
  fully closed (E6). Assumed (unverified), from the handle covering the slot and
  N3's order (#468): the key goes in only with the valve open (§9, key and fuel valve cover).
- Master plate, bottom right: two round push-pull breaker switches, **BAT** (25 A,
  master switch, Hauptschalter) and **GEN** (30 A, generator, Generatorschalter).
- Breaker legends: the BAT, GEN and flap breaker legends are correct as drawn,
  **owner-confirmed** 2026-10-08.

### 3.4 Centre console (view `console`)

Handbook facts (checked 2026-10-08):

- **Engine control unit** (Motorbedieneinheit): on top of the centre console,
  just aft of the lower centre field, reachable from both seats but laid out for
  the left seat (HB 7-19).
- **Lever layout**: the levers lie side by side across the console top, each
  sliding fore and aft in its own slot with a legend strip beside it. The
  handbook's figure shows them in one row: brake, throttle, choke, then the trim
  wheel. Oriented by the forward ends of the legend strips and by the trim wheel
  sitting left of the throttle (HB 7-12), the order from the pilot's side outward
  is **trim wheel, choke, throttle, brake** (inferred from the figure; §9,
  questions 25 and 31).
- **THROTTLE** (Gashebel): legend strip with FULL at the forward end and IDLE at
  the aft end, nothing between (HB 7-20). Push forward for power. At start the
  throttle opens no more than about a tenth (HB 4-6).
- **CHOKE**: legend strip with OFF forward and ON aft (HB 7-21). Pulled fully for
  a cold start with the throttle closed, then eased off over the first half
  minute (HB 4-6).
- **BRAKE** (Bremshebel), the single hydraulic brake lever: legend strip with OFF
  forward and ON aft (HB 7-21). It sits on the console directly behind the engine
  controls (HB 7-10). Non-locking: it brakes only while held and springs back when
  released (owner ruling #465).
- **Stabilator trim wheel** (Trimmrad): left of the throttle, its indicator
  directly beside the wheel; turning it forward trims nose-heavy (HB 7-12). Its
  legend strip has DOWN forward and UP aft, with no neutral mark (HB 7-21);
  the take-off placard (HB 7-20) is what asks for it neutral at take-off.
- **Parking-brake valve** (Rückflusshahn): close the valve first, then apply the
  brake lever; the pressure holds until the valve is opened again, all with one
  hand (HB 7-10). The figure shows a small lever with a printed tag aft of the
  lever row; the handbook's placard list names no legend for it. Its legends
  PARK BRAKE, OPEN and SHUT are correct as drawn, **owner-confirmed** 2026-10-08.
  **Superseded 2026-10-10** (§2a, decision 1): the valve is a small lever in a curved slot on the console's
  right side, printed "Off" (forward), "Brake", "On" (aft) (§3.7). Read as a
  two-position valve under the title "Brake": "Off" is the open valve (brake
  free), "On" the shut valve (pressure held); this mapping is **inferred
  (unverified)**.
  Assumed (unverified): closing the valve while the lever is held traps it as well.
- **Large knob aft of the valve** (§9, question 10): the hydraulic in-flight
  adjustable propeller is set by a lever on the centre console behind the engine
  control unit, with several detents and a catch under the grip that is lifted to
  move it (HB 7-5). That is the likely identity of the knob if D-MPGO has that
  propeller. A cabin heater is optional equipment (HB 6-8, 8-7) and gives a
  second candidate. **Settled 2026-10-10** (M17 T2, #536): the photos show no such
  knob and no propeller lever on the console, so the trainer draws none (§9,
  questions 10 and 11).
- **Carb heat** (Vergaservorwärmung): pulled to apply (HB 4-11, 4-13); named in
  seven checklists and on the take-off placard, but no figure or text shows the
  control (§9, question 3).
- **Rescue-system handle** (Rettungsgerät): on the centre console between the
  seats, at the main bulkhead, low at the console's aft end (HB 3-4, 7-13; the
  passenger briefing calls it the handle on the centre shelf, HB 4-5). It pulls a
  cable to the rocket. Deploy by pulling it forward, hard, to the stop (HB 3-4).
  Secured on the ground by a pin through the release lever (HB 8-1). The rocket and
  canopy sit in the upper compartment behind the bulkhead (HB 7-13).
- Not modelled: the fire extinguisher (pocket behind the passenger seat), the
  fuel dipstick, and the aileron- and rudder-trim wheels (drawn as inert art, M17 T2).

What the trainer draws today, and where it departs from the above:

- The console is drawn from above, forward up and the pilot's seat on the left
  (#534). The trim wheel, CHOKE, THROTTLE and BRAKE lie side by side in that
  order, left to right; the order is **assumed (unverified)** (§9, question 31).
  Each slides up (forward) and down (aft) in its own slot with its legend strip
  beside it: the throttle pushes up to Full, the brake and choke pull down to On,
  and the trim wheel's rim shows in a fore-and-aft slot with its indicator beside
  it, Down forward. The strips print their legends in the photos' mixed case
  (§3.7.1): "Off" and "On" (choke, brake), "Full" and "Idle", "Down" and "Up".
  The photos hide the brake's forward legend, so its "Off" is **assumed
  (unverified)** in the case of the "On" beside it. The parking-brake lever sits on the console's right side, aft of
  the lever row (M17 T2). The grips follow the photos: a blue cylindrical throttle
  grip, a black knurled crossbar on the brake lever, a small ribbed metal choke grip (the photo shows none; a trainer choice so the lever reads as a control), a green
  trim strip, and a small stud slot beside the trim wheel for its indicator.
- The throttle prints "Full" at the forward end and "Idle" at the aft end, as the
  photos show (§3.7.1). **Superseded 2026-10-10** (photos): the handbook's FULL
  and IDLE in capitals (#531); its title "Throttle" is the photos' too. The handbook treats the throttle as
  continuous; the trainer keeps it stepped, with three trainer stops between the
  ends (low, run-up and cruise power) that drive the rpm model and the procedures.
  The strip prints nothing between Full and Idle (M17 T2, #570). Cues name those
  stops in words, not as printed legends.
- The trim placard prints "Down" at the forward end and "Up" at the aft end, with
  no neutral mark, as the aircraft does (#532; mixed case as the photos show,
  §3.7.1). Its title was assumed TRIM; the photos
  print "Stabilator Trim" (§3.7), which the trainer now uses (M17 T1). The
  trainer keeps neutral as a trim position because the take-off placard asks for
  neutral trim (HB 7-20); cues name it in words, not as a printed legend.
  This intake gives no number of steps or travel for the wheel, so the trainer
  steps it through five positions, nose down, half nose down, neutral, half nose
  up and nose up (#620); the count, the spacing and the two half stops are
  assumed (unverified). The trainer draws an unworded tick beside the slot at
  every stop, neutral included, which the aircraft's placard does not have.
  Cues name the half stops in words, not as printed legends.
- The parking-brake valve prints PARK BRAKE, OPEN and SHUT. #529 called this
  trainer wording; the owner confirmed it as the aircraft's legends on 2026-10-08.
  **Superseded 2026-10-10** (§2a, decision 1): the trainer prints "Brake" as the title
  with "Off" and "On" at the two ends (M17 T1); the title place of "Brake" on the
  curved slot's arc is assumed (unverified). The lever sits in that curved slot
  (M17 T2), forward end "Off" with an arrow up, aft end "On" with an arrow down.
- The provisional carb-heat pull knob stands outboard of the lever row, on the
  right-seat side of the console top, clear of the lever row; this place is
  **assumed (unverified)** (§9, question 3).
- The aileron-trim wheel (a wide wheel in an oval recess, "Aileron Trim" between
  L and R), a parachute warning placard and the rudder-trim wheel (in a slot,
  "Rudder Trim" between L and R) are drawn as inert art aft of the lever row,
  between the seats; the placard's wording is the trainer's own paraphrase and
  the wheels' exact shape and the placards' order are **assumed (unverified)**.
  The photos hide the rest of the rudder-trim legend (it starts "L Rud…"), so
  its "Rudder Trim" wording is **assumed (unverified)** too.
- The rescue handle sits low at the console's aft end, centred between the seats,
  on a recessed shelf at the bulkhead (M17 T2). The photos put it on the
  console's upright aft face; the shelf is how the top view shows that face, a
  trainer compromise. It is red, with an orange-bordered label and a pin
  carrying a red remove-before-flight flag. The label prints "Parachute": the
  photos do not show the handle's own wording, so the word is a trainer
  assumption from the parachute placard, kept so the handle has a printed label
  (§9, question 26). Pulled, it slides forward (up the top view) to the stop at
  its guide block; the safety pin goes across the guide block through the
  release lever. Its description and the E2 pull item say forward, hard, to the
  stop. The red handle's grip shape, the label's wording, the
  flag's streamer shape and the handle's place on the shelf are **assumed
  (unverified)**.
- The fuel valve is a vertical strip "Open", "Fuel Valve" (printed on two lines)
  and "Closed" with arrows; "Fuel" is inferred from the worn "F…" of the photos
  (§3.7) and is **assumed (unverified)**. The strip stands beside a slot along
  the column's left edge; its grip is a red horizontal bar. Closed, the grip
  lies over the ignition key slot, as the handbook has it (HB 3-6); the photos
  show it just below the key switch's face, a difference left as is because the
  interlock rests on the handbook fact.

### 3.5 Not in the analog variant

No EFIS/EMS (Dynon D180), no autopilot, no fuel quantity gauge (sight tubes at the
wing roots and a dipstick only), no ammeter or voltmeter (D-MPGO has a
voltmeter, §3.7; M17 T4 adds it), no outside air
temperature readout. The altitude encoder feeds the transponder and has no
controls.

**Voltmeter model, M17 T4 (assumed (unverified)):** the indicator reads the bus
voltage of the systems model: 0 V with the bus dead, 12 V on the battery, 14 V while the
generator charges (the constants of the electrical block). The dial runs 9 to 17 V;
arcs red 9 to 10.5, yellow 10.5 to 11.5, green 11.5 to 15, yellow 15 to 16, red 16 to
17 are the trainer's own.

### 3.6 Electrical bus map

| Source or consumer  | Protection                    | Fed from                                                |
| ------------------- | ----------------------------- | ------------------------------------------------------- |
| Battery 12 V, 7 Ah  | BAT switch-breaker 25 A       | to the main bus                                         |
| Generator (≤ 250 W) | GEN switch-breaker 30 A       | to the main bus, via rectifier                          |
| Flaps               | flap breaker 8 A              | main bus                                                |
| Beacon/strobe       | 5 A, Beacon rocker            | main bus                                                |
| Position lights     | 2 A, Position rocker          | main bus                                                |
| Intercom            | 2 A, Intercom rocker          | main bus                                                |
| Landing light       | 10 A, Landing rocker          | main bus                                                |
| Cockpit light       | rocker (no own breaker shown) | main bus                                                |
| 12 V outlet         | 3 A                           | main bus                                                |
| Avionics bus        | Avionics Master rocker        | main bus                                                |
| COM radio           | 5 A                           | avionics bus                                            |
| Transponder         | 3 A                           | avionics bus                                            |
| GPS                 | 3 A                           | avionics bus                                            |
| FLARM display       | no own breaker shown          | avionics bus (**assumed (unverified)**, §9 question 33) |

- **Trainer (M18):** the FLARM install has power whenever the avionics bus has it:
  the Avionics Master switches it, no breaker, no legend added (§9 question 33). It
  reads the bus voltage as its supply.
- The ignition is independent of the electrical system: the engine keeps running
  with BAT and GEN off (HB 3-7). The starter needs the main bus.
- The generator warning lamp (indicator id `chargeLamp`) lights when the bus is powered and the generator is not
  charging (engine stopped, GEN off, or generator failed).
- Switch the consumers and the generator off before stopping the engine (HB 4-14).

### 3.7 Photo survey, D-MPGO, 2026-10-10 (owner photos)

What the owner's eight photos (§1) show, field by field, forward to aft. Photos
only: nothing here was cross-checked against the handbook. Short printed legends
are recorded as printed (in quotes, with the panel's own capitalisation); longer
placards are paraphrased. "Not legible" marks what the photos do not resolve.
Registration-specific running values (hour meter, frequencies, squawk, rescue
system serial and service dates, the panel's version label) are left out.

#### 3.7.1 What the photos show

**Overall layout.** The panel has **four** fields, not three: a wide upper-left
field, a narrow upper-centre field for the avionics, a wide upper-right field,
and the lower centre column hanging below the upper-centre field. The console
continues straight aft from the column between the seats. A loose yellow
T-shaped item hangs over the dash edge above the rocker row; it carries no
legend and is not identified.

**Glareshield, top centre.** Two round items side by side above the upper-centre
field: a knob in a square bezel printed "Cabin Heat" around its face (left), and
a plain disc with a red cross and no legend (right; not identified).

**Upper-left field.** Registration lettering at the top left. Four instruments
in a 2×2 grid:

- Top left: airspeed indicator, "AIRSPEED" over "KmH", scale 40 to 340 km/h. A
  green arc runs up to about 245, a yellow arc from there to about 300, and a
  red mark at about 300 (read from the dial; tick precision limited). The
  white arc is washed out by glare: not legible. A small orange triangle sits on
  the bezel's right edge near 100; its meaning is not legible.
- Top right: altimeter in feet with a pressure window, a knob at its lower left.
- Bottom left: a round "SLIP INDICATOR" (ball in a curved tube).
- Bottom right: vertical speed indicator scaled in **thousands of feet per
  minute** (0, .5, 1, 1.5, 2 each way, "1000 ft per min").

Placards: a "Takeoff Checklist Summary" at the top right (paraphrased below), and
a German placard at the bottom saying that aerobatics and spins are prohibited.
**No warning lamp** in this field.

**Upper-centre field**, top to bottom: a FLARM traffic display (small, top
left, with its status LEDs); a version label; a second copy of the take-off
checklist summary; the GPS, a Garmin unit in a cradle (the model plate reads
like aera 500, not fully legible); then two round radios side by
side: a funkwerk **COM** radio (left; printed "COM", keys "I/O", "SET", "MEM",
"VOL/SQL" (corrected to VOL/SEL in §3.8.1), "DW" and arrows, an active and a standby frequency, a volume line)
and a funkwerk transponder (right; printed "ATC", keys "I/O", "VFR", "ID",
"MODE" and arrows, a code, a flight-level and a "STBY" line). Model names not
legible.

The field's surface is **light brushed aluminium** (a cool grey-blue in the photos,
hint #6c747c). The units sit directly on it, so the black radio discs read as strong
black circles on a light panel: **no recess, frame, label strip or caption** surrounds
any of the four (added from the photos). The radios' "square bezel" of the first
reading is not there (§3.8.1, §3.8.2).

The take-off checklist summary, paraphrased: confirm the pre-flight and the
before-take-off checklists complete, belts fastened, fuel quantity checked,
pitch trim neutral, flight controls checked; all doors closed, fuel valve open,
choke and carb heat off, flaps set, parachute armed. A warning strip says it is
a summary only and the full checklists are mandatory.

**Upper-right field.**

- Top left: the largest gauge, the tachometer, "TACH", "RPM x100", scale 0 to
  70, arcs at the top of the scale (colours not legible in detail).
- Top right: one round red lamp with the legend "Generator" above it. It is
  the only warning lamp on the panel.
- The type name in script lettering across the middle (manufacturer lettering:
  not to be reproduced).
- Below, a 2×2 block of small gauges: "CHT" (°C, 40 to 150) and "VOLTMETER"
  (9 to 17 V; the trainer's voltmeter value model, a main-bus voltage, is
  **assumed (unverified)**) on top; "OIL TEMP" (°C, 40 to 150) and "OIL PRESS" ("BAR", 0 to 10) below. An hour meter ("HOURS") to their right.
- No compass anywhere on the panel.
- Along the lower edge, the breaker block, "Circuit Breakers" / "Push off". Two
  rows of seven, a single breaker below the left end:
  - top row: "Com", "Nav", "Transponder", "Autopilot", "HS34", "EFIS", "EMS";
  - bottom row: "Landing Light", "Cockpit Light", "Instrument Light", "Beacon
    Light", "Position Light", "Intercom", "GPS";
  - below: "12V Outlet".
  - Fitted (button in a bezel) as far as the photos show: Com, Transponder, EMS,
    Landing Light, Beacon Light, Position Light, GPS, 12V Outlet. Nav,
    Autopilot, HS34, EFIS, Cockpit Light, Instrument Light and Intercom show a
    plain black cap; whether each is a blank or a breaker is not legible.

**Lower centre column**, top to bottom:

- Rocker row, left to right: a larger rocker whose legend is mostly hidden by
  the yellow item (starts "Av…" over "M…", read as Avionics Master), then
  "Beacon Light", "Position Light", "Intercom", "Cockpit Light", "Landing
  Light". The rockers carry the I and O symbols, not ON/OFF words. The first
  rocker's legend "Avionics Master" is **assumed (unverified)** from the visible
  letters; the trainer prints it on two lines, "Avionics" over "Master"
  (M17 T1).
- A yellow placard under the row: avionics off before engine start or stop.
- Left: a 12 V socket marked "MAX 20A"; under it a fuel-capacity placard (per
  side 65 l, 62 l usable, also in US gallons).
- Right: a German limit-speed placard, flap setting against km/h: −12° 300,
  0° 184, 15° 148, 30° 115, 35° 115.
- Centre: the flap readout, a red seven-segment display under "Flaps", and to
  its right a round breaker "Flap Fuse".
- Left edge: the fuel valve. A vertical legend strip, "Open" with an arrow up
  at the top, "Valve" with a letter before it (read "F…", the rest worn) in the
  middle, "Closed" with an arrow down at the bottom; a slot runs down the
  column's left edge beside it, and the red horizontal grip stands at its lower
  end, which by the strip is closed. The grip lies just below the key switch's
  face, not over the key.
- Centre: the flap selector, a lever knob in a worn printed ring. "up" over
  "manually" at its upper left and "down" over "manually" at its lower left;
  the detent numbers on the right of the ring are worn (0, 15 and 30 partly
  legible; −12 and 35 not legible).
- Bottom left: "Ignition", a key switch. Legends "OFF" (left), "1" and "2"
  clockwise over the top; any further positions are worn and not legible. The
  key is in, at OFF, with the fuel-valve grip at its closed end.
- Bottom centre: the legend "Instrument Light"; no control is visible beside
  it in the photos (not identified).
- Bottom right: a boxed "Master" group with two round push-pull switches,
  "BAT" and "GEN".
- No ELT remote switch, no intercom panel, no audio selector and no headset
  jacks are visible on this column.

**Console, lever row**, left to right from the left seat:

- A green legend strip on the console's left edge: "Down" with an arrow forward,
  "Stabilator Trim", "Up" aft. A small black knob protrudes from the console's
  left flank beside it (not identified).
- The trim wheel, its rim showing in a fore-and-aft slot.
- A short slot with a small stud, between wheel and choke (read as the trim
  position indicator).
- "Choke": a white strip, "Off" forward, "On" aft; a thin lever without a
  visible grip.
- "Throttle": a blue strip, "Full" forward, "Idle" aft, **nothing printed or
  marked between**. Its lever runs aft to a blue cylindrical grip; at Idle the
  grip lies aft of the row.
- "Brake": a black strip, "On" aft; the forward legend is hidden by the lever.
  Its lever stands up forward to a black knurled crossbar grip.

**Console, aft of the lever row**, forward to aft:

- On the right side of the console top, a small lever in a curved slot with an
  arc legend "Off" (arrow up, forward), "Brake", "On" (arrow down, aft): the
  parking-brake valve, read so from its place and legend.
- The aileron-trim wheel, a wide wheel in an oval recess, a placard "L Aileron
  Trim R" with arrows.
- A placard with a parachute warning symbol, saying the aircraft carries a
  ballistically deployed emergency parachute.
- The rudder-trim wheel in a slot, a placard starting "L Rud…" (the rest hidden).
- The rescue handle on the console's upright aft face at the bulkhead, centred
  between the seats: a red handle with an orange-bordered warning label, held by
  a pin carrying a red "remove before flight" flag. A rescue-system data plate
  beside it names BRS; the model is not legible.
- Above, a blank four-screw plate.
- No large knob, propeller lever or carb-heat control is visible on the console.

**Wing roots, overhead.** On each side a sight gauge, "Fuel Indicator (Left)"
and "Fuel Indicator (Right)", scaled 5 to 40 "Liter", beside the tank access.
Next to each, an approved-fuel placard: motor gasoline to EN 228 at RON 95 or
better (and equivalents), or avgas 100LL or UL91; per side 65 l total and 63 l
usable. This 63 l differs from the 62 l on the lower-column placard (see
§3.7.2).

#### 3.7.2 Photo against trainer

"Trainer today" is the current package (`packages/aircraft-ctsl/src/`) and
§3.1 to §3.6. Impact: high changes what a pilot learns or the panel's overall
shape; medium misplaces or mislabels a control or indicator; low is detail.
Rows marked **owner-confirmed** contradict a fact the owner confirmed on
2026-10-08. The owner ruled on 2026-10-10 (§2a): the photos win, except where an
item is only absent from the photos (the ELT remote switch, the carb-heat
control), which stays as the trainer draws it; the avionics rows go to M18.

| Item                     | Photo shows                                                                                                            | Trainer today                                                                                                        | Impact | Change kind                | Likely files                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Panel fields             | four fields: upper left, upper centre (avionics), upper right, lower centre column under the centre field              | two upper fields and the lower column; radios in the upper-left field, GPS in the upper-right (owner-confirmed, q19) | high   | layout, art                | `views.ts`, `cockpit.ts`, `assets/view-panel.svg`, `assets/view-centre.svg`                                      |
| Avionics units           | FLARM display; Garmin GPS (reads like aera 500); funkwerk round COM; funkwerk round ATC transponder                    | Garmin SL40, GTX 327, GPSMAP 496 (§2 decision 1)                                                                     | high   | systems (devices)          | `devices.ts`, `views.ts` (`deviceSlots`), `apps/web/src/device-registry.ts`, new `packages/device-*`             |
| Airspeed markings        | scale to 340; yellow arc to a red mark at about 300                                                                    | scale 40–300, yellow 245–260, red line 260 (VNE 260, §4.1, §8)                                                       | high   | art, systems, procedure    | `artwork.ts` (airspeed gauge), `indicators.ts`, intake §4.1, §4.3, §8                                            |
| Upper-left instruments   | 2×2: airspeed, altimeter / slip indicator, VSI; no lamp                                                                | airspeed left, VSI top middle, charge lamp, altimeter right; slip ball in the background                             | medium | layout, art                | `views.ts` (`panel.indicators`), `assets/view-panel.svg`                                                         |
| VSI units                | thousands of ft/min, to 2 each way                                                                                     | ±5 m/s                                                                                                               | medium | art, systems               | `artwork.ts` (VSI gauge), `indicators.ts`, `systems.ts` (`verticalSpeedMs`), intake §4.3                         |
| Charge lamp              | one red lamp, legend "Generator", top right of the upper-right field                                                   | red lamp "CHARGE" at the top of the upper-left field (owner-confirmed, q22)                                          | medium | legends-text, layout       | `artwork.ts` (`lampArtwork.charge`), `views.ts` (`chargeLamp`), `indicators.ts`                                  |
| Second lamp              | none                                                                                                                   | a second unlit lamp in the background (q9)                                                                           | low    | art                        | `assets/view-panel.svg`                                                                                          |
| Compass                  | none on the panel                                                                                                      | small panel compass, top left of the upper-right field (owner-confirmed, q20)                                        | medium | layout, art                | `views.ts` (`compass`), `indicators.ts`, `artwork.ts`                                                            |
| Engine gauges            | tach (large) top left; CHT, voltmeter / oil temp, oil pressure in 2×2; hour meter                                      | tach, oil pressure, oil temp, CHT in one row under the GPS; no voltmeter (§3.5)                                      | medium | layout, systems            | `views.ts`, `indicators.ts`, `systems.ts` (a bus-voltage value for a voltmeter), `artwork.ts`                    |
| Breaker block            | along the lower edge of the upper-right field, 2×7 plus 12V Outlet, full-word legends, several capped                  | 4×3 block at the right edge, legends COM, XPDR, POS, INT, GPS, STRB, LDG and the outlet                              | medium | layout, legends-text       | `views.ts` (breakers), `artwork.ts` (`breaker` lettering), `controls.ts`, `assets/view-panel.svg`                |
| Rocker legends           | two-word legends ("Beacon Light" …), I/O symbols on the rockers                                                        | one-word legends, ON and OFF lettering                                                                               | low    | legends-text               | `artwork.ts` (`rocker`)                                                                                          |
| ELT remote switch        | not visible on the panel or column                                                                                     | ELT toggle (ON/ARM) and lamp in the lower column (owner-confirmed, q21); in N2, N6, N15, N16 and E5                  | medium | layout, procedure, systems | `views.ts` (`elt`, `eltLamp`), `controls.ts`, `indicators.ts`, `procedures/normal.ts`, `procedures/emergency.ts` |
| Upper-left placards      | "Takeoff Checklist Summary" at the top right; a German aerobatics and spins placard at the bottom                      | a short take-off checklist and a limits placard at the far left (§3.1)                                               | low    | art                        | `assets/view-panel.svg`                                                                                          |
| Lower column contents    | 12 V socket, fuel-capacity and limit-speed placards; no intercom panel, audio selector or jacks                        | intercom panel, audio selector and jacks drawn in the background                                                     | low    | art                        | `assets/view-centre.svg`                                                                                         |
| Ignition legends         | "OFF", "1", "2", further positions not legible                                                                         | OFF, L, R, BOTH, START                                                                                               | medium | legends-text, procedure    | `controls.ts` (`ignition.legends`), `artwork.ts`, `procedures/normal.ts` (N6 checks)                             |
| Fuel valve               | strip "Open" / "…Valve" / "Closed" at the column's left edge; red grip in a slot; key in at OFF beside the closed grip | FUEL, VALVE, OPEN, CLOSED; the closed handle covers the key slot                                                     | low    | art                        | `views.ts` (`fuelValve`), `artwork.ts`                                                                           |
| Flap selector legends    | "up manually", "down manually"                                                                                         | UP, DN                                                                                                               | low    | legends-text               | `controls.ts` (`flapSelector.legends`), `artwork.ts`                                                             |
| Master and light legends | BAT/GEN boxed "Master"; an "Instrument Light" legend in the column                                                     | BAT, GEN; no instrument light                                                                                        | low    | legends-text, art          | `artwork.ts`, `assets/view-centre.svg`                                                                           |
| Lever order              | trim wheel, choke, throttle, brake, left to right                                                                      | the same (q31)                                                                                                       | none   | none                       | none                                                                                                             |
| Throttle strip           | "Full" and "Idle" only, no marks between                                                                               | FULL and IDLE, plus unworded detent ticks at the three trainer stops (#570)                                          | low    | art                        | `artwork.ts` (throttle)                                                                                          |
| Strip titles and grips   | "Stabilator Trim", "Choke", "Throttle", "Brake" titles; blue throttle grip, black knurled brake grip                   | TRIM, CHOKE, THROTTLE, BRAKE titles (TRIM and THROTTLE assumed)                                                      | low    | legends-text, art          | `artwork.ts`                                                                                                     |
| Parking-brake valve      | lever in a curved slot, right side of the console aft of the row, arc legend "Off" / "Brake" / "On"                    | PARK BRAKE, OPEN, SHUT, below the brake lever (owner-confirmed, §3.4)                                                | medium | legends-text, layout       | `controls.ts` (`parkingBrakeValve`), `artwork.ts`, `views.ts`                                                    |
| Large knob               | no such knob on the console                                                                                            | unlabelled artwork knob aft of the valve (#535)                                                                      | low    | art, layout                | `assets/view-console.svg`, `views.ts` (`rescueHandle` offset)                                                    |
| Carb heat                | no carb-heat control visible; the checklist placard names carb heat                                                    | provisional pull knob on the right-seat side of the console (q3)                                                     | medium | layout, procedure          | `controls.ts` (`carbHeat`), `views.ts`, `procedures/normal.ts`                                                   |
| Cabin heat               | knob "Cabin Heat" on the glareshield, top centre                                                                       | not drawn                                                                                                            | low    | art                        | `assets/view-panel.svg`                                                                                          |
| Rudder and aileron trim  | both trim wheels on the console between the seats, L/R placards                                                        | not drawn; §4.4 says the tabs are ground-adjustable only                                                             | low    | art, systems               | `assets/view-console.svg`, intake §4.4                                                                           |
| Rescue handle            | red handle on the console's upright aft face, centred; pin with a red flag; BRS                                        | T-grip on the aft shelf, left of centre; RESCUE, PULL HARD; pin with a ring, no flag (q26)                           | medium | art, layout, legends-text  | `artwork.ts` (`rescueHandle`), `views.ts`, `assets/view-console.svg`                                             |
| Usable fuel              | 62 l per side (column placard) and 63 l per side (wing-root placards)                                                  | 124 l (§4.4, §8)                                                                                                     | low    | procedure (intake value)   | intake §4.4, §8                                                                                                  |
| Wing-root fuel gauges    | sight gauges, Left and Right, 5 to 40 l                                                                                | not drawn (named in §3.5)                                                                                            | low    | art                        | none today (outside the three views)                                                                             |
| FLARM, hour meter        | a FLARM display and an hour meter                                                                                      | not drawn                                                                                                            | low    | art                        | `assets/view-panel.svg`                                                                                          |

**Trainer (M18, #678):** the rows "Avionics units" and the FLARM half of "FLARM, hour
meter" are resolved: the CTSL installs D-MPGO's four units (§3.8), the FLARM display
included, as device slots. The hour meter stays inert art.

**Resolved in M19 (§3.9):** the position, size and arrangement columns of the rows
"Panel fields", "Upper-left instruments", "Engine gauges", "Breaker block", "Charge
lamp", "Cabin heat" and "FLARM, hour meter" are measured in §3.9 (field boundaries
§3.9.1, gauges §3.9.2, avionics §3.9.3, breakers and lamp §3.9.4, placards §3.9.5,
lower column §3.9.6). The 12V Outlet breaker stands under the second breaker column,
not "below the left end" (§3.9.4), and the Generator lamp at the right plate's
horizontal middle, not at its top right as §3.7.1 and the "Charge lamp" row say
(§3.9.4). The airspeed indicator's white arc, "not legible" in §3.7.1, is resolved
in §3.10.1: white 72–115 on the inner half of the band. The trainer follows in #716
and #712.

### 3.8 Avionics units (M18)

The four units below replace SL40, GTX 327 and GPSMAP 496 in the CTSL (§2a item
5). Each subsection is paraphrased from the manual it names; no wording, table,
figure or icon is copied, and none of the manuals is in the repository.
Implementers read this section and the M18 plan
(`docs/superpowers/plans/2026-10-10-m18-d-mpgo-avionics.md`), never the manuals.
Panel positions come from the photo identification of 2026-10-10 (§3.7) and
describe the real panel; the trainer's slots are the compromise §3.2a records
(M18). A value the manuals do not give is marked
**assumed (unverified)** and, where the club could settle it, points to a §9
question. "Manual §n" is the manual's own section number.

Each unit also has a **Face layout (photos)** block, from the owner's photos (§3.7),
so that an implementer can draw the face without seeing them (face fidelity fix,
plan addendum). Conventions for those blocks:

- Each unit has a unit box: for a round unit the bounding square of its disc
  (diameter D, 57 mm), for the aera 500 the outer cradle frame, for the FLARM display
  the rounded-rectangle face. The origin is the top left, x runs right and y down, as
  fractions of the box (the FLARM display uses its width W and height H).
- Camera perspective is already removed, and the photos' slight tilt is averaged out,
  so every row and column below is horizontal or vertical.
- Positions are good to ±0.02 and sizes to ±15 percent unless marked **low
  confidence**.
- Display values (frequencies, codes, volume, map) are illustrative: what a block
  fixes is the line layout, the alignment, the relative glyph size and the colour.
- A maker's logo, wordmark or model lettering is **never reproduced**; its footprint
  is listed only so that the area stays blank. Real chart content is likewise not
  reproduced.
- Colours are given in words, with an approximate hex hint after allowing for the
  photos' cool cast. The hint only guides the choice of the nearest `tokens.css`
  token.
- Real-panel scale, in units of D: the COM and ATC discs are 1.00 D, the FLARM face
  about 1.05 D wide and 0.58 D tall, the aera cradle about 2.8 D wide and 1.67 D
  tall (its body about 2.45 D by 1.42 D).
- The units sit directly on the panel's light brushed aluminium (§3.7.1), with no
  frame, box or label strip around any of them.

#### 3.8.1 COM radio: funkwerk ATR833-OLED

**Identification.** A round 57 mm funkwerk COM radio with a yellow OLED and 8.33
kHz channel names. It has no visible bezel: the disc sits directly on the panel, with screws and knobs in the corners of its bounding square (corrected from the photos). Most likely the original ATR833-OLED. The
variant letter of an ATR833A-OLED is not visible on the face and cannot be ruled
out. The ATR833-II OLED is less likely: D-MPGO's face carries the funkwerk logo
used before the maker was renamed f.u.n.k.e. AVIONICS and no "Mk II" lettering.
Rejected: the older ATR 500 (its memory rotary switch and exchange key are not on
this face) and every LCD type (this display is OLED). The family is certain; the
owner confirmed the original ATR833-OLED (§9 question 36). §3.7.1's reading of the knob legend as
"VOL/SQL" is corrected here: the legend reads VOL/SEL.

**Panel position.** Upper-centre field, bottom row, left unit: directly below the
GPS, left of the transponder. Its two knobs take the right-hand corners of its
bounding square.

**Source.** f.u.n.k.e. AVIONICS GmbH, "ATR833A-OLED Operation and Installation",
document 01.1411.010.71e, revision 3.00, read on ManualsLib (manual 876459) because
the manufacturer no longer hosts manuals for the original unit. The owner chose it
on 2026-10-11 (#718); for the COM it replaces the ATR833-II manual that §2a item 6
used to name. The A variant is taken to behave like D-MPGO's original ATR833-OLED (§9
question 64). "Manual §n" is the A manual's own section number. A function whose
control D-MPGO's face lacks is out of scope.

**Face.** Top row, three push keys printed `I/O`, `SET`, `MEM`. A knob at the
upper right with a curved legend `VOL/SEL`. The display in the middle, three text
lines, with `COM` printed vertically down its left. Bottom row, three push keys
printed `DW`, `▲▼` (an up and a down triangle, side by side, up first: corrected
from the photos, which show `▲▼` and not `▼▲`) and `►`; the funkwerk logo under
the row. A second knob at the lower right with no printed legend in the manual's
figure. Two separate single knobs, not a concentric pair; the manual gives no push
function for either. The II's figure also prints `Mk II` down the right; D-MPGO
does not.

**Face layout (photos).** Unit box: the bounding square of the black disc, whose
diameter is D (57 mm). Origin at the top left, x to the right, y down; the disc
centre is (0.5, 0.5) and its radius 0.5. Screws and knobs sit in the corners of the
square, outside the circle, so some values are below 0 or above 1. Source: the
owner's photos (§3.7). The conventions are those of the §3.8 introduction.

- **Outline.** A circular matte disc, near-black with a very slight blue cast
  (hint #10181c), darker than the FLARM face (§3.8.4). A very thin, slightly lighter
  rim highlight (about 0.01 D) runs round the edge. There is no chrome ring and no
  visible square body (corrected from the photos: §3.8.1 used to say "square
  bezel"). The key caps are slightly glossier than the disc.
- **Mounting.** The disc sits directly on the light brushed-aluminium panel (§3.7.1)
  with no frame, box or label strip around it.

_Printed lettering_ (white, bold, uppercase sans; legends are printed on the face
**above** each key and never on a cap):

| Item         | Position and size                                                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `COM`        | Three upright letters stacked top to bottom (C, O, M), not a rotated word. Column centre x 0.055, spanning y 0.44 to 0.62; each letter about 0.05 D tall, pitch about 0.065                                                                                    |
| `VOL/SEL`    | Curved along the rim at the upper right, on a circle of radius about 0.42 D, from about (0.72, 0.09) to (0.85, 0.21). It reads clockwise and descends to the right, average tilt about +35 degrees; letter height about 0.035 D. It marks the upper-right knob |
| Key legends  | About 0.035 D cap height, centred over the cap, with a gap of about 0.02 D above it                                                                                                                                                                            |
| Maker's logo | Footprint at the bottom centre, x 0.38 to 0.63, y 0.90 to 0.96. **Not reproduced**: the area stays blank                                                                                                                                                       |

_Keys_: six round push buttons in two rows of three. Each cap is a round black dome
of diameter about 0.10 D with a soft highlight at its upper left. Pitch is about 0.17
D in both rows. The top row sits left of centre (row centre about x 0.48), which
leaves the upper right free for `VOL/SEL`; the bottom row is centred at x 0.50.

| Key    | Legend (printed above the cap)                                                                                                                                             | Legend centre (x, y) | Cap centre (x, y) |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------- |
| `I/O`  | `I/O`                                                                                                                                                                      | 0.315, 0.09          | 0.32, 0.165       |
| `SET`  | `SET`                                                                                                                                                                      | 0.486, 0.09          | 0.49, 0.16        |
| `MEM`  | `MEM`                                                                                                                                                                      | 0.635, 0.085         | 0.65, 0.155       |
| `DW`   | `DW`                                                                                                                                                                       | 0.33, 0.765          | 0.32, 0.85        |
| swap   | `▲▼`: a filled up-triangle **then** a filled down-triangle, side by side, each about 0.03 D (corrected from the photos: the face prints up first, §3.8.1 used to say `▼▲`) | 0.50, 0.765          | 0.50, 0.85        |
| cursor | `►`: one filled right-pointing triangle, about 0.045 D wide                                                                                                                | 0.67, 0.76           | 0.67, 0.85        |

_Knobs_: two, both outside the disc in the right-hand corners. Each is a black
knurled cylinder (fine vertical ribs, about 18 to 20 around) seen end-on with a flat
black end, no pointer, diameter about 0.16 D, its edge clearing the disc by about
0.01 D.

| Knob                          | Centre (x, y) | Legend on the face   |
| ----------------------------- | ------------- | -------------------- |
| upper right (volume / select) | 0.92, 0.09    | the curved `VOL/SEL` |
| lower right (frequency)       | 0.92, 0.92    | none                 |

_Screws_: two silver Phillips pan-head screws, diameter about 0.10 D, at the upper
left (0.10, 0.12) and the lower left (0.10, 0.95). The knobs take the right-hand
corners, so there are none on the right.

_Display_ (yellow OLED). A black glass window, x 0.14 to 0.85 and y 0.24 to 0.63,
corner radius about 0.02 D. Its bevel shows as a thin lighter line along the bottom
edge (y about 0.62, x 0.17 to 0.80) and a faint lighter strip along the right edge
(x 0.83 to 0.86). The window is almost the same black as the disc, so an unlit
display is nearly invisible. Every glyph, label and value alike, is one saturated
warm yellow on black (hint #f0d840), never white, grey or amber-orange.

| Line | Centre y | Content and alignment                                                                                                                                                      |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 0.335    | Label `ACT` at x 0.205 to 0.285; the active frequency right-aligned to x 0.80 (seven characters including the dot, starting near x 0.41 to 0.47)                           |
| 2    | 0.44     | Label `SBY`; the standby frequency right-aligned to x 0.80. The edit cursor is an underline below the MHz digits (x about 0.41 to 0.57, y about 0.475, about 0.01 D thick) |
| 3    | 0.555    | Label `VOL` at x 0.205 to 0.275 and its value left-aligned straight after it (x about 0.33 to 0.38). The rest of the line is empty                                         |

Digits are about 0.075 D tall with an advance of about 0.06 D. The labels `ACT`,
`SBY` and `VOL` are about as tall as the digits but in a condensed face, about 0.026
D per character. Both are bold with slightly rounded strokes, like an OLED pixel
font. A faint vertical divider at x about 0.335, from y 0.28 to 0.60, separates
labels from values (**low confidence**, optional). The frequencies and volume shown
in the photos are illustrative only.

_Not visible_: the OLED pixel structure, the knobs' detents and any pointer, a
legend for the lower knob, edge-lit key legends, and the display in other modes.

**Controls** (manual §2.1, summarised per control).

- **`I/O`**: a press of about half a second switches the radio on; holding it about
  2 s switches it off.
- **`SET`**: each short press moves the third display line on to its next setting,
  in the order VOL, SQL, DIM, VOX, DWM, INT, EXT and round to VOL again; a hold of
  1.5 s or more goes straight back to VOL; a hold of 5 s or more opens the
  configuration menu (not modelled).
- **`MEM`**: a short press opens the user memory list, and a second one the list of
  recently used frequencies (LST). Held 1.5 s or more while the memory list is open,
  it stores the **active** frequency in the shown entry and clears the entry's name.
- **`DW`**: dual watch on or off; line 2 then reads `DW` in place of `SBY`.
- **`▲▼`**: swaps active and standby, and also closes an open list.
- **`►`**: moves the underline to the next field of the standby frequency; held 1.5 s
  or more in the memory list, it starts naming the entry (not modelled).
- **`VOL/SEL` knob**: sets the value of the line-3 setting; in a list it picks the
  entry, which becomes the standby frequency at once.
- **Lower-right knob** (FREQ in the manual): changes the underlined field of the
  standby frequency.

The A manual has no REPLAY and no split sidetone items; those are ATR833-II features.

Not on the face and out of scope: the push-to-talk button on the stick, an external
intercom switch, the serial remote interface, the PC tool for the memory list and the
external audio input.

**Line-3 settings** (manual §2.4). `SET` chooses the setting and `VOL/SEL` changes
it; values always show two digits, and line 3 returns to VOL after 12 s untouched.
Receive volume (`VOL`) runs 01 to 16. Squelch (`SQL`, higher needs a stronger
signal, default 05 and the only default the manual gives), display brightness
(`DIM`), the speech level that opens the intercom (`VOX`, 01 meaning always open)
and intercom volume (`INT`, shown as `INT --` when the wiring disables the intercom)
each run 01 to 10. The external audio volume (`EXT`) runs 00 to 10, 00 switching the
input off. The dual-watch reduction (`DWM`), how much quieter standby is heard,
runs from 00 (none) down to −8, the minus sign printed.

**Configuration menu** (manual §3, `SET` held 5 s; not modelled). Installer
settings: channel spacing, automatic display darkening, push-to-talk assignment,
external audio priority, microphone sensitivities and a maintenance test mode. A
master reset (manual §3.7) restores the factory configuration. The manual has **no
AUTO ON** setting and names no automatic switch-on.

**Display.** Three lines on the OLED. Line 1: `ACT`, a status field (`RX`
receiving, `TX` transmitting, `Te` after two minutes of continuous transmission) and
the active frequency. Line 2: `SBY` or `DW`, a status field (`RX` in dual watch) and
the standby frequency, with the edit cursor as an underline below one field. Line 3:
the chosen item and its value (default `VOL nn`), or `MEM nn` with the entry's name,
or `LST nn`, while browsing a list; `BAT` for a low supply. While a list is open,
line 2 keeps the `SBY` label and shows the entry, because the entry is the standby
frequency. The manual's example and D-MPGO's display show the same layout, with the
cursor on the MHz field.

**Power** (manual §2.2). Holding `I/O` about 0.5 s switches the unit on: a start
screen with the type and software version, then the frequencies and settings it had
at switch-off. About 2 s switches it off. The manual names no switch-on when supply
arrives, so power arriving leaves the unit dark until `I/O` is pressed; this matches
the owner's answer for D-MPGO (§9 question 35). The manual does not say whether the
memories and the last-used list survive switch-off.

**Frequency entry and swap** (manual §2.5). Tuning is two steps: set the standby
frequency, then swap. With 8.33 kHz spacing the standby frequency has three fields:
the MHz part, the first decimal digit, and the last two digits. `►` moves from field
to field and the lower-right knob changes the field. The range is 118.000 to 136.975
MHz. The radio takes the channel width from the channel's name: 25 kHz channels are
named in steps of 25 kHz (.000, .025, .050, .075), and the 8.33 kHz channel sharing a
carrier is named 5 kHz higher (.005, .030, .055, .080), with the two names between
them for the other 8.33 kHz slots. The values on D-MPGO's display are 8.33 kHz names.
The channel-spacing setting in the configuration menu can restrict entry to 25 kHz
names.

**Memories** (manual §2.5.3 to §2.5.5). 100 user entries, numbered 00 to 99, each
optionally named with up to 8 characters. Recall: `MEM` opens the list at entry 00;
turning the `VOL/SEL` knob picks an entry, and the entry replaces the standby
frequency at once; `▲▼` then makes it active and leaves the list. A second short
`MEM` opens the last-used list: the last 10 active frequencies as `LST 01` to
`LST 10`, plus `LST 00`, which holds the last standby frequency taken from the
memory list; picking and swapping work as in the memory list. Save: make the
frequency active, open the memory list, pick the entry, hold `MEM` 1.5 s or more;
the active frequency is written into the entry (so line 2 now shows it too) and any
name is cleared. There is no save mark. A list is left by a key press or after a
time-out whose length the manual does not give.

**Dual watch** (manual §2.6). With one receiver, dual watch listens mainly to the
standby frequency and samples the active one at intervals; a signal on the active
one takes priority. Transmission is always on the active frequency. Changing either
frequency ends dual watch. It needs a squelch of at least 02. `DWM` makes standby
reception quieter so the two can be told apart. The manual advises against dual
watch where a continuous listening watch is required. The pilot swaps before
answering a call heard on standby.

**Typical use.** Before engine start: with avionics power on, switch on with `I/O`,
check that `BAT` is absent, set the volume, check that squelch is at least 02 if dual
watch will be used. Before take-off: the first frequency in standby, swap, then the
next frequency in standby. In flight: swap at each hand-off; optional dual watch; the
pilot saves frequencies to memory when it helps. After landing: hold `I/O` about 2 s
to switch off before the avionics master goes off. The manual has no checklist;
these steps are assembled from its functions.

**Uncertain.**

- Whether the ATR833A-OLED behaves like D-MPGO's original ATR833-OLED (§9 question
  64).
- The manual leaves open: which key leaves a list and whether that key also does its
  own job; the list time-out; what an unused memory entry holds; what `LST 00` holds
  exactly; whether the memories and the last-used list survive switch-off; what a
  `MEM` hold does outside the memory list; how long the `I/O` press must be; whether
  a cursor field carries into the next when it wraps; where the cursor starts after
  power-on or a swap; and the cursor fields in 25 kHz spacing (§9 question 65).

**Trainer (#718).** The `atr833` device models the A manual: power (any `I/O` press
switches on while powered, a 2 s hold switches off; power arriving leaves it dark,
power lost switches it off), active and standby frequencies of 8.33 kHz names with
the three-field cursor (fixed spacing; fields wrap without carry, **assumed
(unverified)**), swap, dual watch (squelch 02 or more), the line-3 items VOL, SQL,
DIM, VOX, DWM, INT and EXT as numbers with the SET hold back to VOL and the 12 s
time-out, the user memory list (100 unnamed entries) and the last-used list with
`LST 00`, browsing that replaces the standby frequency, and storing the active
frequency with a `MEM` hold. Frequencies, settings, memories and the last-used list
survive power loss and switch-off; dual watch, the line-3 item and an open list do
not. It leaves out reception, transmission and audio (so no `RX`, `TX`, `Te`, and
`DIM`, `DWM` and the volumes are numbers only), the configuration menu, memory names,
the `BAT` warning, the start screen, master reset and every external interface.
Nothing is printed at the lower-right knob (owner, §9 question 36); `FREQ` is the
manual's name for it and appears only on the dock's touch helpers.

#### 3.8.2 Transponder: funkwerk TRT800H-OLED

**Identification.** A round 57 mm funkwerk Mode S transponder with a yellow OLED, in
no visible bezel (corrected from the photos): the disc sits directly on the panel, with three screws and the knob in the corners of its bounding square, and `ATC` printed vertically on the left. It is
the TRT800H-OLED: the TRT800A-OLED is a different, rectangular unit with seven
buttons (it adds a `FID` key and letters its mode key `MOD`) in another layout, so the round 57 mm body
settles the variant. The older Filser TRT800 (a
square face with four knobs and an LCD) is a different face. Certainty: high on the
family and variant, from the housing; the software version and cradle contents are
not visible (§9 question 37).

**Panel position.** Upper-centre field, bottom row, right unit: below the GPS, right
of the COM radio and next to the right-hand breaker rows. Its knob takes the lower
right corner.

**Source.** f.u.n.k.e. AVIONICS GmbH, "TRT800H Mode-S Transponder, OLED/LCD,
Operation and Installation", document 03.2126.010.71e, revision 3.00 (15 Mar 2021),
downloaded from the manufacturer's own site (§2a item 7). One manual covers the LCD
and the OLED; their controls are identical.

**Face.** Top row, three push keys printed `I/O`, `VFR`, `ID`. A four-line display in
the middle, `ATC` printed vertically at its left. Bottom row, three push keys
printed `MODE`, `▲▼` (an up and a down triangle, side by side, up first) and `►`; the logo under the row. One
rotary knob at the lower right with no printed legend. The manual sometimes writes
the swap glyph as `▼▲`; the face prints up then down, side by side (corrected from
the photos: not stacked).

**Face layout (photos).** Unit box, origin and corner conventions as for the COM
radio (§3.8.1): the bounding square of a disc of diameter D (57 mm), centre (0.5, 0.5),
radius 0.5. Source: the owner's photos (§3.7). The conventions are those of the §3.8
introduction.

- **Outline.** The same disc as the COM radio: matte near-black (hint #0c1a20), a
  thin lighter rim highlight, no chrome ring and no visible square body (corrected
  from the photos: §3.8.2 used to say "square bezel"). It sits directly on the
  light brushed-aluminium panel (§3.7.1) with no frame, box or label strip.

_Printed lettering_ (white, bold, uppercase sans, as on the COM radio; legends stand
above the keys, never on a cap):

| Item         | Position and size                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ATC`        | Three upright letters stacked top to bottom (A, T, C). Column centre x 0.068, spanning y 0.43 to 0.61; each letter about 0.05 D tall |
| Key legends  | As on the COM radio. There is no curved legend on this unit                                                                          |
| Maker's logo | Footprint at the bottom centre, x 0.38 to 0.62, y 0.90 to 0.97. **Not reproduced**: the area stays blank                             |

_Keys_: six round caps in two rows of three, diameter about 0.10 D. The top row is
centred at x about 0.53, offset to the right of the COM radio's. Pitch is about 0.155
D on top and about 0.165 D on the bottom row.

| Key    | Legend                                                                                     | Legend centre (x, y) | Cap centre (x, y) |
| ------ | ------------------------------------------------------------------------------------------ | -------------------- | ----------------- |
| `I/O`  | `I/O`                                                                                      | 0.375, 0.095         | 0.37, 0.17        |
| `VFR`  | `VFR`                                                                                      | 0.535, 0.09          | 0.535, 0.17       |
| `ID`   | `ID`                                                                                       | 0.686, 0.085         | 0.69, 0.165       |
| `MODE` | `MODE`, a wide word about 0.14 D across                                                    | 0.33, 0.77           | 0.33, 0.85        |
| change | `▲▼`, up-triangle then down-triangle side by side (corrected from the photos: not stacked) | 0.495, 0.763         | 0.50, 0.85        |
| cursor | `►`                                                                                        | 0.657, 0.755         | 0.66, 0.845       |

**Low confidence, optional**: in all the photos the `I/O`, `ID`, `▲▼` and `►` caps
look dark grey, slightly lighter than `VFR` and `MODE`, which look black. This may be
wear or gloss.

_Knob_: one, outside the disc at the lower right, centre (0.91, 0.92), diameter about
0.15 D. A black knurled skirt with a light grey or white circular end cap about 0.6
times the knob diameter, crossed by a dark straight line that acts as pointer or slot.
The face prints no legend for it.

_Screws_: three silver Phillips screws, diameter about 0.10 D, at the upper left
(0.10, 0.11), the upper right (0.92, 0.08) and the lower left (0.09, 0.94).

_Display_ (yellow OLED). A black glass window, x 0.13 to 0.84 and y 0.24 to 0.63, with
the COM radio's bevel cues; the lighter line along its bottom edge (y about 0.62) is
quite visible. Every line, `STBY` included, is the same warm yellow as the COM
radio's (hint #f0d840) on black.

| Line | Centre y | Content and alignment                                                                                                                                   |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 0.33     | The four-digit squawk code, right edge at x about 0.69, spanning x 0.50 to 0.695. It is not pushed to the window's right edge                           |
| 2    | 0.475    | The pressure-level readout `FL 000` in small glyphs, about 0.04 D tall (about 0.6 times the digit height), x about 0.46 to 0.64                         |
| 3    | 0.565    | The status word `STBY` in large glyphs, as tall as the digits and not condensed, at x 0.18 to 0.40; a second four-digit value follows at x 0.47 to 0.69 |

Digits are about 0.067 D tall with an advance of about 0.049 D; `STBY` takes about
0.055 D per character. The values form a column whose right edge is near x 0.69, and
the window right of x 0.70 stays empty. One photo caught line 2 mid-refresh (dashes
at the left, then `FL 000`); treat it as a refresh frame, not as a layout. The code
and level shown are illustrative only.

_Not visible_: the display in other modes (ALT, ON, ident), the knob's detents and
function legend, and key backlighting.

**Controls** (the manual's names in parentheses).

| Control        | Press or turn                | Effect                                                                                                                            |
| -------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `I/O` (on/off) | about 0.5 s                  | switches on                                                                                                                       |
| `I/O`          | about 3 s                    | switches off                                                                                                                      |
| `VFR`          | short                        | makes the VFR code active; the old active code goes to standby and the standby place reads `VFR`                                  |
| `VFR`          | about 3 s                    | stores the current active code as the new VFR code (an `S` shows, then `VFR`)                                                     |
| `▲▼` (change)  | short                        | exchanges active and standby; while a value is edited it moves the cursor back; while `VFR` shows it shows the standby code again |
| `ID` (ident)   | short                        | sends the ident pulse for 18 s, `IDT` on line 3                                                                                   |
| `ID`           | held in STBY                 | a counter opens the Flight-ID, setup and altitude-correction menus by release point (not modelled)                                |
| `MODE`         | short                        | steps the operating mode; also confirms picks in menus                                                                            |
| `►` (cursor)   | short                        | puts the cursor on a standby digit and moves it on                                                                                |
| `►`            | about 2 s, in an active mode | opens display brightness, `DIM` (not modelled)                                                                                    |
| knob           | turn                         | changes the digit under the cursor; selects records and brightness                                                                |

**Display.** Top line: the mode (`ACS`, `A-S`) at the left and the active code at the
right, with a solid diamond for a reply and a bar for a lock-out. In STBY the mode
text moves to the bottom line as `STBY`. Line 2: error codes at the left (PLL, TRX,
DC, FPG), `BAT` or `DIM` at the right. Line 3: `IDT` at the left during ident, the
flight level (`FL 030`, in 100 ft steps) at the right; `FLerr` for an invalid altitude
outside −1000 to 35 000 ft, which stops Mode C. Bottom line: the standby code at the
right, or the word `VFR` while the VFR code is active; a `G` or `F` for the ground
switch if one is fitted. `TM` at the far right of the top line marks test mode.

**Power.** Hold `I/O` for about 0.5 s. A start screen shows the device name and the
software versions. If the cradle's external memory holds several aircraft records, a
list by 24-bit address appears; the pilot picks one with the knob and confirms with
`MODE`. With no memory or no address the unit shows `Cradle OFF` and works only as a
Mode A/C transponder. It then starts in STBY, except that with a ground switch
fitted and in-flight state selected it starts active. It keeps its codes, VFR code,
brightness and altitude offset itself.

**Power loss and return (#727).** The installation manual (§3.6.1.3 Auto-On, §3.10 Starting
Up, §3.11) settles three things and leaves the rest open.

- _Switch-on after power returns._ An installation pin, Auto-On, decides. Wired to the
  supply behind an avionics master switch, the unit starts by itself whenever power is
  supplied and its `I/O` key then has no function. Left unconnected, the unit stays dark
  until `I/O` is held for about 0.5 s. The manual asks for the first wiring where an
  avionics master switch feeds the unit, but D-MPGO's wiring is not known (§9 question 66).
- _What survives._ The unit stores the active, standby and VFR codes, the display
  contrast and the altitude offset internally, and the aircraft record (address, category,
  Flight-ID, ground switch, speed category, data ports) in the cradle's memory. Power
  loss therefore keeps the codes. It does not keep the operating mode: every start is in
  STBY, except with a ground switch fitted and in-flight state selected. Ident, a
  half-made entry and the word `VFR` on the bottom line are not mentioned as stored (§9
  question 67).
- _Start-up sequence._ After switch-on the unit shows its name and software and firmware
  versions, then the record list (only with more than one record, picked with the knob
  and `MODE`), or `Cradle OFF` without an address, and then the code, level and `STBY`
  screen. The manual names no self-test and gives no duration for any of these screens;
  whether a key is accepted while they show is not stated (§9 question 67).

**Squawk entry and swap.** The active code is on the top line, the standby code on the
bottom. Press `►` to put the cursor on a digit, turn the knob, press `►` for the next
digit; `▲▼` makes the standby code active and the old active code standby.

**Modes.** `MODE` cycles STBY, ACS (Mode A, C and S, the normal mode) and A-S (A and
S without altitude). Without a 24-bit address the choices are AC- and A-- besides
STBY. There is no separate ALT position: ACS reports altitude. STBY makes the
aircraft invisible to ATC and to collision-avoidance systems: the manual says not to
use it in flight unless asked, and to select an active mode before take-off.

**Typical use.** Before engine start: with avionics on, switch on; check the start
screen and that `Cradle OFF` is absent. Before take-off or at line-up: set the
assigned code or VFR, then `MODE` until `ACS`; never take off in STBY. In flight:
`ID` only when ATC asks; change codes through the standby code and `▲▼`. After
landing: the manual gives no step; the derived one is `MODE` until STBY. At shutdown:
hold `I/O` about 3 s. The manual has no checklist; the steps are assembled from its
functions. The manual does not mention emergency squawks.

**Uncertain.**

- A second `VFR` press while VFR is active: one passage says activate or deactivate,
  another says it shows the standby code and VFR stays active. The trainer follows the
  second reading.
- The counter thresholds of the held-`ID` menus, and the
  cursor behaviour after the last digit, which the manual does not state.

**Trainer (M18).** The `trt800h` device models: power (a press switches on, in STBY;
a hold switches off), the mode cycle STBY, ACS and A-S, active and standby codes with
the cursor and the knob (digits 0 to 7), swap and cursor-back, the VFR key with its
store hold, ident for 18 s in an active mode, and the flight level taken from the
pressure altitude (`FLerr` outside the valid range). A Mode S cradle is
fitted, with no ground switch, and the stored VFR code is 7000 (owner, §9 question 37);
the initial code 2000 is a placeholder. It leaves out interrogations, replies and the
lock-out and reply indicators, squitter and ADS-B, Flight-ID and setup menus,
operation without the cradle address, brightness, error codes and the `BAT` warning,
test mode, the ground-switch state, the start screen and the remote head. The knob
prints `CODE`, the trainer's word; the unit prints nothing there.

**Power cycle (trainer, #727).** The `trt800h` device follows the `powered` condition the
aircraft gives it: with the Transponder breaker pulled, or the Avionics Master off, or the
battery off with no generator running, it is dark and ignores every key. When power
returns it stays dark until `I/O` is pressed, as for an Auto-On pin left unconnected
(**assumed (unverified)**, §9 question 66; the trainer's `I/O` steps in N6 and in
`radioAndTransponder` are the trainer's own, and a wired pin would leave the key without
function). It returns in STBY with the
active, standby and VFR codes of before; ident, the cursor, the stored-code flash and a
pending key hold are gone, and the word `VFR` is not shown again. A key still held when
power returns does not count as a press. The start screens are not shown and no key is
blocked after the press (§9 question 67).

#### 3.8.3 GPS: Garmin aera 500

**Identification.** Confirmed: the bezel prints the model; a landscape touchscreen
in a dark cradle frame that stands proud of the panel. The photos do not show whether
the cradle is Garmin's own mount or an aftermarket dock, nor the software version.

**Panel position.** Upper-centre field, middle, roughly centred: below the FLARM
display and the checklist placard, above the COM and transponder row. A small paper
label is stuck to the panel just below it.

**Source.** Garmin, "aera 500 Series Pilot's Guide" (models 500, 510, 550, 560),
document 190-01117-02, revision C (Aug 2012), system software 4.10 or later. Its
copyright notice allows personal viewing and forbids reproduction: paraphrase only,
no icon, figure or screen copied. Options of the 510 and 560 (weather, XM radio) and
of the GDL 39 (traffic) do not apply to a plain aera 500.

**Face and controls.** A 4.3 inch colour touchscreen in landscape. Exactly one
physical control: the POWER button. The photos show the front face has no keys (corrected from the
photos); the button's place is **assumed (unverified)**: a raised bump on the cradle frame's top edge at the right is consistent with it, and no legend is visible (see the face layout below). Its lettering is not visible. Everything else is a touch icon that appears with the page.
POWER: a long hold switches the unit on or off; with external power connected, a long
hold enters Charge Mode (screen off, battery charging) instead of switching off; a
short press opens a quick overlay for backlight brightness and volume. In the
aircraft the unit sits in a cradle that supplies power and audio.

Touch icons by name: **Home** (back to the Home screen), **Back** (previous page;
held, Home), **OK**, **Menu**, a combined **Menu / Direct-to** icon, **Up** and
**Down** arrows, **Direct-to**, **Out** and **In** (map range), **Cancel**, and a
keypad (OK, BKSP, Numeric, Alpha, Cancel) when a text field is touched. A touched
icon briefly turns blue.

**Face layout (photos).** Unit box: the outer cradle frame, true width to height
about 1.67 to 1.70, origin at the top left. Screen content is also given in a nested
frame (sx, sy), both from 0 to 1 across the screen. Source: the owner's photos
(§3.7). The conventions are those of the §3.8 introduction.

- **Cradle frame.** A near-black charcoal rounded rectangle (hint #252f37), outer
  corner radius about 0.09 H. Band widths: left 0.055 W, right 0.05 W, top 0.07 H,
  bottom 0.075 H. It stands proud of the panel and casts a slight shadow; a thin
  darker seam (about 0.01) separates it from the unit's body.
- **Top-edge features** (corrected from the photos: the front has no keys, §3.8.3
  used to leave the POWER place open). A raised dark bar, the cradle's latch or top
  rail, sits on the frame at x 0.33 to 0.61 and protrudes about 0.03 H above the top
  edge. A shorter raised bump sits at the top right, x 0.81 to 0.92: it is
  consistent with the aera's power key on its top edge, and no legend is visible.
  The aera's physical POWER key is **not on the front face**.
- **Body (the unit's bezel).** A dark neutral grey clearly lighter than the cradle
  (hint #4a4b50), x 0.066 to 0.945 and y 0.075 to 0.925, corner radius about 0.05 H.
  A slightly lighter lip runs along the bottom inner edge. The bottom band is taller
  than the top band (0.125 H against 0.075 H).
- **Light sensor.** A small dark dot on the right band at (0.92, 0.44), diameter about
  0.012 W.
- **Brand lettering.** Brand and model lettering in the body's lower left, x 0.11 to
  0.31, y 0.89 to 0.93. **Not reproduced**: the area stays blank.
- **Controls on the front.** None. No keys, knobs or joystick; the face is a
  touchscreen only.

_Screen_: x 0.151 to 0.838 and y 0.150 to 0.799 in unit coordinates. Landscape 16:9
(a 480 by 272 pixel panel), square corners, a thin black inner frame about 0.008
wide. The side bands are about 0.08 W (left) and 0.10 W (right).

_Soft-key column_ (part of the display; the Map page): at sx 0.83 to 1.00, the right
17 percent of the screen at full screen height. Four keys top to bottom: `Out`, `In`,
`Menu`, `Home`. Each takes about a quarter of the height (sy 0 to 0.25, 0.26 to 0.49,
0.51 to 0.73, 0.75 to 1.0) with thin gaps. Each is near-black or charcoal with a
slightly lighter top gradient and a thin light separator. A white pictogram fills the
upper 60 percent (a magnifier with a minus, a magnifier with a plus, a page or list,
a house) and a bold white label stands centred in the lower 35 percent.

_Map page_ (the only page the photos show), at sx 0 to 0.83: a VFR-chart look with
light yellow-green land, thin grey-blue lines, a thick blue river, thick red lines,
dotted light-blue airspace lines and small white labels with a dark outline. **Chart
content is not reproduced**: no real names or geography; the trainer draws a generic
chart. Overlays carry no boxes: small bold white field labels with a dark outline,
each over a dashed value line.

| Field       | Position (sx, sy)                        |
| ----------- | ---------------------------------------- |
| `GS`        | top left, 0.10 to 0.135, 0.04 to 0.07    |
| `ETE NEXT`  | top right, 0.68 to 0.82, 0.02 to 0.07    |
| `BRG`       | bottom left, 0.075 to 0.13, 0.83 to 0.87 |
| `DIST NEXT` | bottom right, 0.63 to 0.79, 0.82 to 0.86 |

A white double-line range arc, about a semicircle, runs from (0.055, 0.54) over an
apex near (0.42, 0.14) to (0.79, 0.54). The white own-ship symbol stands near (0.40,
0.87). A small "detail map" tag sits at sx 0.47 to 0.59 and sy 0.93 to 0.98.

_Not visible_: the Home menu page, the start-up and database pages, any legend on the
power key, the side-edge controls (the card slot), and the backlight-off look.

**Power-on.** External power switches the unit on by itself. First use runs AutoLocate,
which can take several minutes. A database initialisation page lists each database's
dates and cycle; the pilot reviews it and touches **Press To Accept**. Then Home
appears with GPS signal bars. The page comes at every switch-on, not only the first: the guide
says that when the unit is turned on, the initialisation shows whether the databases are
current, out of date or not available (#727). The receiver's status text runs Autolocate, Searching
the Sky, Acquiring Satellites, 2D GPS Location (three satellites), 3D GPS Location
(four) or Lost Satellite Reception. The unit is a VFR aid only.

**Pages.** Home is a grid of large icons: Map, Terrain, HSI/Panel, Nearest, Traffic,
Active FPL, WPT Info, Direct To, Position, Weather and XM Radio (those two on
options), Tools. Nearest lists airports, VORs and other items by distance; Tools holds
Setup, user waypoints, logs, the flight-plan list, calculators, GPS Status and more.
The **Map** shows the aircraft symbol, the active leg in magenta, airports, navaids,
airspace and terrain shading, four data fields across the top (defaults GS, DIST NEXT,
VSR, ETE NEXT; many others available, among them BRG and DTK), a compass arc, and
the range at lower right in 23 steps from 200 ft to 800 nm. Orientation is North Up by
default, Track Up or DTK Up from the map setup. On a loss of GPS a blinking red question
mark sits over the aircraft symbol and the GPS-based fields go blank. The **GPS
Status** page shows a sky view and a signal bar per satellite.

**Direct-to and flight plan.** Direct To: choose the target by identifier, name or
city (keypad, OK), or from the plan, nearest airports or recent waypoints; touch
Activate. Stop Navigation ends it. A flight plan is built on Active FPL with "Touch to
add Waypoint" and activated from the plan list. The unit has no radio tuning, no
squawk entry and no swap.

**Power loss and return (#727).** The guide (Rev. C) settles the return and is nearly silent on
the loss.

- _Return._ Applying external power turns the unit on for full operation by itself; there
  is nothing to press. The initialisation page follows (above). A unit that was held off
  with external power connected sits in Charge Mode, and it too comes on when external
  power is applied again.
- _Loss._ The guide never says what the unit does when external power is removed while it
  runs. It does say that the unit has a lithium-ion battery which must stay installed
  whenever the unit is on, that the battery charges from external power, and that a Setup
  item `Power Loss Warning` exists. Read together this suggests that a unit with a battery
  keeps running and warns, but the guide does not say so, and whether D-MPGO's unit carries
  a battery is unknown (§9 question 68).
- _What survives._ After a start the receiver searches again from its last known position
  and stored satellite data, so a repeat search is probably shorter than the first; the
  guide gives no time. Settings such as the backlight level and the map range are the
  unit's own; the guide does not list which survive a power loss (§9 question 68).

**Settings a trainer may touch.** Backlight level and time-out, day or night colours,
sound volumes, alarms, power-loss warning, simulator mode.

**Typical use.** Before engine start: external power switches it on; accept the
databases; check GPS Status reaches a 3D fix; select the Map, or set a Direct-to.
Before take-off: confirm the active route on the Map, range and orientation. En
route: Map, HSI/Panel and Terrain pages; Nearest and Direct-to for a diversion. After
landing: Stop Navigation. Shutdown: hold POWER (cradle power keeps it in Charge Mode;
the guide advises disconnecting external power if the aircraft stands for days).
The guide has no checklist; these steps are inferred from its functions.

**Uncertain.**

- What cradle power loss does: switch the unit off or keep it on battery (§9 question
  38, still unknown). The guide covers only power-on on external power and Charge Mode.
- The exact Home grid order and size, the layout of the POWER overlay, and any lettering
  on the POWER button (the trainer prints `POWER`, **assumed (unverified)**).
- D-MPGO's software version (§9 question 38).

Owner-confirmed (§9 question 38): the map is track up with the fields GS, ETE NEXT, BRG and
DIST NEXT, there is no traffic or weather source, and the start-up step is accepting the
databases and opening the map.

**Trainer (M18).** The `aera500` device models: cradle power switching it on at the
database-acceptance page, accepting (Home opens), a Map page (schematic, Track Up, range
steps, the fields GS, ETE NEXT, BRG, DIST NEXT with GS live and the rest dashed because
there is no route), pages for Nearest, Active FPL, Direct To, Position, Tools and GPS
Status with the receiver status text, the POWER overlay for backlight, and a simulated
fix found after a short search (spec §4.9). It leaves out the navigation database (so
Nearest, Direct To and Active FPL stay empty and identifiers are not entered), map data,
terrain, weather and traffic, the map pointer and panning, page menus, flight plans and
guidance, alarms, messages, sound, the battery and Charge Mode, database dates, automotive
and simulator modes, calibration and dimming. Its touchscreen is one control with a position
per icon, shown only on the page that has it. Every icon prints the guide's name for it.

**Power cycle (trainer, #727).** The `aera500` device follows the `powered` condition: with the
GPS breaker pulled, or the Avionics Master off, or the battery off with no generator running, it
is dark, and the touchscreen and POWER are inert. When power returns it switches on by itself at
the database page, whatever it showed before, even if it had been held off (Charge Mode). The
fix, the readings, the page and the backlight overlay are gone and the search starts from
nothing; the backlight level and the map range stay. A pull during the database page or during
the search starts both over. A POWER key held while power returns is spent. The battery is not
modelled, so a pull always goes dark (**assumed (unverified)**, §9 question 68).

#### 3.8.4 FLARM display: classic external LED display

**Identification.** A small rectangular dark face with rounded corners, about 1.8 times as wide
as tall, LED-only, with a FLARM wordmark, four status LEDs, a square push button
printed `Mode` on the face, two LEDs printed `above` and `below`, and an aircraft outline ringed by
ten direction LEDs (pairs flank the nose and the tail, no LED at 12 or 6 o'clock). That is
16 LEDs and one button: the classic external display of the FLARM system. **It is not
round 57 mm.** The owner's expectation of a round display does not hold; the owner
decided on 2026-10-10 to build the rectangular display (§2a item 5). Round displays with a
screen (other makers) are rejected, as are the LXNAV LED displays with bicolour LEDs and a
five-LED status column. Two things the photos cannot show: whether the face is a separate
display or the front of a panel unit, and which FLARM unit drives it (§9 question 39).
Which maker of the two similar classic displays this is rests on the labels `above`,
`below`, `RX`, `TX`, `GPS`, `Power` and `Mode`, and on the EDIATec sheet's red-only ring LEDs (the photo identification
does not give the ring colour).

**Panel position.** Upper-centre field, top-left corner: above the GPS, left of the
take-off checklist placard and just below the glareshield strip.

**Sources.** EDIATec GmbH, "External display from FLARM", operating manual V 5.1e
(18 Apr 2011), for display hardware 1.0 and 2.0; for everything it does not describe,
FLARM Technology, "Operating Manual FLARM Collision Avoidance System", version 242
(18 Dec 2016), for units F6 to F9, and the legacy manual for F4/F5, version 5.00E
(1 Mar 2011). Third-party documents: paraphrase only (§2a item 7).

**Face.** At the top left the FLARM wordmark. Under it a column of four green status
LEDs printed, top to bottom, `RX`, `TX`, `GPS`, `Power`. Right of that the `Mode` key,
the only control, a square key on the face itself. Right of the key a thin vertical bar
with the `above` LED at its top and the `below` LED at its bottom, their labels on its
left (hardware 2.0 only; corrected from the photos: they are not at the ring's edge).
Right of the bar an aircraft symbol pointing up inside a ring of ten LEDs (red per
the sheet; the photos show them unlit) at 36 degree steps, the first at 18 degrees
and the last at 342 degrees clockwise from the nose, the ring centred about three
quarters across the face. A sound emitter sits behind the symbol. No power switch:
the display takes power from the FLARM unit, and FLARM is on whenever it has supply.

**Face layout (photos).** Unit box: the rounded-rectangle face. x is a fraction of the
face width W and y of its height H; W:H is about 1.8 (plausible range 1.65 to 1.9),
origin at the top left. Source: the owner's photos (§3.7). The conventions are those
of the §3.8 introduction.

- **Outline.** A rounded rectangle, corner radius about 0.08 H. Colour: dark slate
  navy (hint #323b4f), clearly bluer and lighter than the radio discs. A thin
  darker edge or shadow runs round it.
- **No screen.** Everything is an LED or printed line on the flat face, and the
  Mode key sits **on** the face, with no separate housing (corrected from the
  photos: it is a square outline and cap inside the face box). Screws are not visible.

_Printed artwork_ (thin white or light grey lines and text):

| Item               | Position and size                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wordmark footprint | Top left, x 0.06 to 0.27, y 0.15 to 0.33. **Not reproduced**: the logo has its own lettering style and a red mark. A plain unit word in the panel's generic type (the trainer prints uppercase FLARM, plan addendum D20) may stand there, with no logo styling |
| Status labels      | `RX`, `TX`, `GPS`, `Power` (only `Power` is in mixed case). White sans, cap height about 0.075 H, left-aligned at x 0.13, centred vertically on their LEDs                                                                                                     |
| `above`            | Lowercase, about 0.06 H, right-aligned to end at x 0.47 (spanning about 0.34 to 0.47), centred at y 0.165                                                                                                                                                      |
| `below`            | Lowercase, about 0.06 H, spanning about 0.355 to 0.47, centred at y 0.835                                                                                                                                                                                      |
| Vertical bar       | A thin light line at x 0.497 joining the `above` LED to the `below` LED, y 0.20 to 0.80                                                                                                                                                                        |

_Aircraft outline_ (top view, one thin light line): a straight-wing light aircraft or
glider, **not** a swept-wing jet.

- Fuselage along x about 0.735 with a rounded nose at y 0.23, tapering to the tail at
  y 0.73; width about 0.04 to 0.06 W.
- A long, thin, straight wing drawn as a pill shape, x 0.60 to 0.87 at y 0.45 to 0.53
  (chord about 0.07 H).
- A short straight tailplane, x 0.68 to 0.79 at y 0.70 to 0.75.
- Ten thin straight light spokes run radially from the outline to each direction LED
  and continue about 0.05 H past it as a short tail.

_LEDs_: 16 in all. Each is a round dome of diameter about 0.055 H (about 0.03 W).
Unlit it looks milky white or light grey. A lit status LED is a bright yellow-green
with a glow (hint #9be04a).

| Group                              | Positions (x, y)                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Status column (below the wordmark) | x 0.10; `RX` y 0.47, `TX` 0.59, `GPS` 0.705, `Power` 0.82 (pitch about 0.117 H)                                                                |
| `above` and `below`                | (0.50, 0.165) and (0.50, 0.83)                                                                                                                 |
| Direction ring                     | Centre (0.734, 0.485), radius about 0.33 H in true units; ten LEDs at bearings of ±18, ±54, ±90, ±126 and ±162 degrees clockwise from the nose |

The ring pairs flank the nose and the tail; no LED stands at 12 or 6 o'clock.
Measured ring positions, for checking: nose pair (0.671, 0.150) and (0.786, 0.150);
(0.586, 0.281) and (0.875, 0.268); 9 and 3 o'clock (0.557, 0.49) and (0.91, 0.477);
(0.593, 0.693) and (0.879, 0.68); tail pair (0.686, 0.817) and (0.793, 0.817).

_Mode key_ (the only control, on the face between the status column and the
`above`/`below` bar):

- Outer frame: a thin light-grey rounded-square outline, x 0.28 to 0.47 and y 0.38
  to 0.75, near-square in true units.
- Cap: inside the frame, x 0.31 to 0.44 and y 0.43 to 0.70, darker than the face
  (near-black navy) with a faint light rim.
- Lettering: `Mode` is printed **on the cap**, centred at (0.375, 0.57), white, title
  case, cap height about 0.07 H.

_Not visible_: the lit colour of the direction LEDs and of `above`/`below` (all unlit
in every photo), blink timing (`RX` and `TX` are lit in one photo and off in two),
screws, and the unit that drives the display.

**Status LEDs.** `RX` is lit while another FLARM aircraft is within the set range (3 km
by default) and 500 m vertically, and flashes while warnings are suppressed but traffic is
received. `TX` is lit while the unit transmits, which needs GPS. `GPS` is lit with a brief
blink each second; dark with a brief flash each second means no fix, which can last
minutes after switch-on. `Power` is lit in normal operation and flashes below 8 V supply,
when FLARM stops working.

**Start-up.** Supply arrives, a short beep, the display shows its own two-digit software
version on the ring (one LED per digit), a self-test lights the ring one LED after another
clockwise, then `above`, `below` and the status LEDs, then the unit's three-digit software
version the same way. The display then starts in Nearest mode at loud volume. FLARM waits
for a GPS fix. Before departure `Power`, `GPS` and `TX` must be steady, and they must stay
so for the flight.

**The `Mode` key** (by how long it is held; most timings are the FLARM unit's, since the
display sheet describes only the differences).

| Push                                | Effect                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| brief (under 0.8 s)                 | volume loud, medium, quiet, silent, loud, with a tone at the new level                                                                                             |
| about 2 s                           | swaps Nearest and Collision (called Warning in places); two ring LEDs run top to bottom into Nearest and bottom to top out of it; the mode is not shown afterwards |
| 5 to 8 s, on the ground             | receiver self-test: the unit counts what it receives at half sensitivity and shows it (not modelled)                                                               |
| double push                         | suppresses all traffic and obstacle signals for 5 minutes, another double push ends it (not modelled)                                                              |
| over 8 s (F4/F5) or 11 s (F6 to F9) | reboot (not modelled)                                                                                                                                              |
| over 20 s                           | factory reset (not modelled)                                                                                                                                       |
| held while power arrives            | display setup for brightness, front or rear seat, the unit's own LEDs and sound, and the baud rate (not modelled)                                                  |

**Traffic and warnings** (not modelled, spec §4.9). In Nearest mode one steady LED shows
the bearing of the nearest received aircraft. A collision prediction flashes the LED
towards the most threatening object relative to the own ground track, at 2, 4 or 6 Hz
by urgency, with a rising beep; `above` or `below` lights for a target more than about 7
degrees above or below; fixed obstacles flash the two topmost LED pairs in turn.
Only the single most dangerous threat is shown. Faults flash all four status LEDs for
30 s with a binary code on the red LEDs.

**Power loss and return (#727).** The unit manual (version 242, §7 Start-Up, §10 and §4)
settles most of it; the display sheet (V 5.1e) was not fetched again for this item.

- _Return._ The unit is always on whenever it is connected to an adequate supply, so power
  returning switches it on by itself, and the display starts its sequence again (see Start-up
  above). The unit manual puts its own self-test at about 8 seconds, depending on the size
  of the obstacle data, and says that without the firmware version display and its beep the
  unit is not ready. A GPS fix after switch-on can take several minutes.
- _What survives._ Every start is in Nearest mode at loud volume (the manual's defaults;
  that a pilot's volume or mode would persist across a power loss is not stated, and the
  display sheet's "starts in Nearest mode at loud volume" is followed). Warning suppression
  ends (it is not modelled). Flight recording ends with the supply: pulling power within
  about a minute of landing, at the recommended 2 s interval, loses the last part of the
  flight (not modelled).
- _Switching it off in flight._ The manual requires the pilot to have direct sight of and
  immediate access to a switch or circuit breaker that disconnects the FLARM from the
  aircraft supply without affecting other essential systems. D-MPGO's panel shows no
  FLARM breaker or switch (§3.6, §9 question 33).
- _Low supply._ Below 8 V the `Power` LED flashes and the unit does not operate.

The self-test duration and the search time of the trainer are its own (§9 question 69).

**Typical use.** Before engine start: the FLARM supply is on (switch or breaker, §9
question 33); the beep, version display and self-test follow; choose volume and mode.
Before take-off: `Power`, `GPS` and `TX` steady (the manual's check; the club does not do it,
§9 question 34); an optional receive test on the ground. In flight: mode by a 2 s push, volume by brief pushes, double push to
suppress. After landing: wait at least a minute before removing power or the end of the
flight log is lost; power goes with the aircraft's FLARM supply, since the display has no
switch. The system is for day VFR only and not for navigation. These steps are assembled
from the manuals; there is no checklist.

**Uncertain.**

- Whether each timing above holds for this display; the sheet defers to the unit's manual
  (§9 question 39).
- Whether a brief push sets the display's own volume or the unit's; whether the status
  LEDs repeat the unit's exactly, fault codes and the low-supply flash included.
- The display hardware version (the 16-LED count implies 2.0), the FLARM unit it is
  paired with, and so the reboot hold (§9 question 39).
- The FLARM supply and its breaker (§9 question 33).
- The default display setup values, read from bold marks in a figure, are a small risk
  and unused.

**Trainer (M18).** The `flarm` device models: power from the avionics bus with no breaker
of its own (**assumed (unverified)**, §9 question 33), the start-up self-test, a GPS search
that runs from the moment power arrives, the four status LEDs (`Power` lit or flashing below
8 V; `GPS` dark-flashing then lit-blinking; `TX` lit once the fix is found and supply is
good; `RX` dark, there is no traffic), the volume steps, and the Nearest and Collision
swap with its confirmation run, all acting on release by hold time. It leaves out traffic
and obstacle warnings, the Nearest bearing, `RX`, the receiver self-test, suppression,
sound (the volume level is kept but never heard), the version display, reboot, factory
reset, display setup, fault codes and flight recording. The trainer's timings for the
self-test steps, the GPS search and the push thresholds are **assumed (unverified)** where
the manuals give none.

**Power cycle (trainer, #727).** With the Avionics Master off, or the battery off with no
generator running, the display is dark (the FLARM has no breaker of its own in the trainer,
§9 question 33; the other breakers do not affect it). When power returns it starts over:
the self-test from its first LED, Nearest mode, loud volume, and the GPS search from nothing,
whatever it showed before, including a mode-swap run in progress; a Mode key held through
the return counts from the end of the self-test. The trainer's self-test is shorter than the
unit manual's figure and its search is a fixed time (**assumed (unverified)**, §9 question 69).

### 3.9 Panel layout (photos, M19)

Where everything sits on D-MPGO's panel, measured from the owner's photos (§1, §3.7)
for M19 (#716: the whole panel as D-MPGO's; #712: the centre-field avionics). §3.7
says _what_ is on the panel; this section says _where_ and _how big_. Owner principle
(§2a item 10): fidelity is recognition, so the numbers below cover position, relative
size, dial layout, coloured-arc places and controls; colours, stickers, logos and fine
ticks are notes only. Photos only, nothing from the handbook. No photo, crop or
derived image is in the repo; maker logos and lettering are given as footprints only.

#### 3.9.0 Coordinate convention

- **Photos.** Upper panel: photo 10.14.30 (the most frontal view from the left seat),
  cross-checked against 10.14.29 (4), 10.14.28 and 10.14.29 (3). Lower column and
  lever row: photo 10.14.30 (1). Console aft and wing roots: 10.14.29, 10.14.29 (1)
  and (2).
- **Perspective removed per plate.** Each aluminium plate is flat, but the three upper
  plates are **not in one plane**: the two outer plates are angled toward the seats
  (their perspective differs from the centre plate's; a single correction leaves the
  outer rows sloping). Each plate was corrected on its own, from its screw squares
  (four-screw instrument mounts), straight screw rows and columns, and for the centre
  plate the GPS screen's 480 by 272 pixel aspect. The outer plates were then unfolded
  flat onto the centre plate's plane at their shared edge. Checks: every round face
  comes out round within 3 percent; the breaker columns come out evenly pitched; the
  right plate's two outer screws come out vertically aligned (not constrained).
- **Unit A** = the airspeed indicator's case diameter (the outer edge of its black
  bezel). It is the one size unit of §3.9 and §3.10 (§3.10.0): every size below is in
  A, and §3.9.2's size column is the one size table for the gauges (§2a item 10).
  **D** is the COM disc's diameter (57 mm nominal, §3.8) and appears only where a size
  is compared with the radios. **D = 0.72 A** (ASI = 1.38 D, range 1.31 to 1.45 D,
  medium confidence), from the two copies of the take-off checklist summary, one on
  the left plate and one on the centre plate: the same printed card, each measured in
  its own plate's corrected frame (widths give 1.36 to 1.39 D in three photos, heights
  1.31 to 1.32). With D = 57 mm, A is about 79 to 83 mm, a 3⅛-inch instrument. A raw
  photo ratio of about 1.8 is perspective: the radios sit low on the centre plate,
  farther from the lens.
- **Conversion from the first survey's D values** (already applied below). The survey
  linked the plates by unfolding the outer plates onto the centre plate at their
  shared edges, which gave the ASI 1.45 D and the tachometer 1.03 D. Its outer-plate
  sizes are therefore same-plate ratios: left-plate sizes are divided by 1.45 and
  right-plate sizes are scaled through the tachometer (T = 0.72 A, so × 0.70). The
  plate outlines, the gaps and the panel box keep the unfolding (÷ 1.45), so that
  §3.9.1's relations hold. Centre-plate units and the glareshield items use D = 0.72 A.
  The two links differ by about 5 percent, so a centre-plate unit drawn at its §3.9.3
  size comes out up to about 4 percent larger than its field fractions give: a known
  mismatch, within the size tolerance.
- **Perspective and size checks.** Every photo is a close, high, wide-angle view, so
  the lower part of each plate is farther from the lens and images up to about 20
  percent smaller (in 10.14.30 the centre plate's bottom screw pair spans about 0.79
  of its top pair). Raw photo ratios, and corrections without a perspective term,
  therefore shrink everything low on a plate. The sizes below come from a per-plate
  correction with a perspective term, fitted so that all of a plate's round cases come
  out round at once (residual under 0.5 percent of the radius, against 1.5 to 2
  percent without the perspective term). Checks: the left plate's column pitch comes
  out equal in both rows, the altimeter equals the airspeed indicator, the four engine
  gauges come out equal, and the centre plate's corner screws come out at 2.04 by
  3.23 A (2.96 by 4.68 D, through the outline chain ÷ 1.45; §3.9.1).
- **Two boxes.** The _panel box_ is the bounding box of the three upper plates: x from
  the left plate's outer edge to the right plate's outer edge, y from the centre plate's
  top edge (the highest) to the centre plate's bottom edge (the lowest). It measures
  **9.10 A by 3.45 A (width to height 2.64)**. A _field box_ is one plate's own bounding
  box. All fractions: origin top left, x right, y down; positions are centres unless an
  edge is named.
- **Accuracy.** Positions ±0.02 of the box named; sizes ±5 percent; the outer plates'
  outer extents ±0.03 (**low confidence**: the left plate's outer edge is at the
  photo's border, and both depend on the unfolding). Items marked low confidence carry
  ±0.04.
- **Trainer columns.** "Today" is the current `views.ts` rect or `view-panel.svg`
  shape, in panel view units. "T" is the one mapping §3.9.7 defines (assumption T);
  §9 question 41 asks the owner about it.

#### 3.9.1 Field boundaries and panel colour

| Field              | Panel box x   | Panel box y   | Size (w × h)  | Shape (field fractions)                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Upper left plate   | 0.000 – 0.370 | 0.057 – 0.988 | 3.38 × 3.22 A | Inner (right) edge straight and vertical; top edge level from the inner corner out to x 0.55, then a long convex curve through (0.50, 0.03), (0.36, 0.06), (0.22, 0.10), (0.13, 0.15), (0.08, 0.22), (0.04, 0.34), (0.01, 0.45) to the outermost point (0.00, 0.56); back in through (0.01, 0.68), (0.03, 0.78), (0.08, 0.85) to the level bottom edge, which starts near x 0.20 (bottom-outer curve **low confidence**). Small radius at the inner corners. |
| Upper centre plate | 0.400 – 0.646 | 0.000 – 1.000 | 2.25 × 3.46 A | Upright rectangle (width to height 0.65), small rounded corners, four corner screws inset about 0.11 A from each edge. The tallest plate: its top stands 0.06 (left) and 0.08 (right) of the panel height above the outer plates' inner top corners.                                                                                                                                                                                                         |
| Upper right plate  | 0.679 – 1.000 | 0.080 – 0.995 | 2.93 × 3.17 A | Inner (left) edge straight and vertical; top edge level from the inner corner out to x 0.61, then a convex curve through (0.68, 0.08), (0.80, 0.13), (0.89, 0.19), (0.94, 0.24), (0.97, 0.32), (0.99, 0.41) to the outermost point (1.00, 0.50); back in through (0.98, 0.68), (0.95, 0.76), (0.91, 0.83), (0.85, 0.93), (0.75, 0.97) to the level bottom edge, which starts near x 0.70.                                                                    |

- **Gaps.** Dark moulding between the plates: left gap 0.030 of the panel width
  (0.28 A), right gap 0.033 (0.30 A). The bottoms of the three plates are level within
  0.012 of the panel height; only the tops differ (the centre plate rises above both).
- **The trainer is much wider than the aircraft.** Real field widths, as fractions of
  the panel box: left 0.370, centre 0.246, right 0.321. Trainer today (fractions of the
  drawn span 12 – 2360): left 0.19, centre 0.49, right 0.31. On D-MPGO the centre field
  is the **narrowest** plate, a tall upright panel between two wide wings, and the left
  plate is the widest; the trainer has it the other way round. Real plate-span aspect
  2.64, trainer 3.51.
- **Above the centre plate**, on the dark moulding (**low confidence**, the moulding
  curves toward the windscreen): the "Cabin Heat" knob in its square bezel at x 0.430,
  y −0.064 of the panel box (0.27 A square), and the plain red-cross disc at x 0.490,
  y −0.062 (0.28 A). In centre-plate fractions both sit 0.23 A above the plate's top
  edge, at x 0.12 and 0.37: over the plate's **left half**, not centred.
- **Lower column**: its top edge spans x 0.364 – 0.601 of the panel box (§3.9.6).
- **Colour (photos).** All three upper plates **and the lower column plate are the same
  light brushed aluminium**, brushed horizontally. In even light (photo 10.14.28) they
  read mid grey: left #908F90, centre #7E8C8E, right #67767D (in shadow), column
  #8A9492; in photo 10.14.30 the left plate reads lighter only because sunlight falls
  on it. Neutral hint for the aluminium: about #8E9296. The dark surround is the
  moulding (glareshield, the gaps between plates, the frame around the column): dark
  charcoal with the photos' blue cast (#2B4051 raw), neutral hint about #2C2F33.
- **Colour (trainer today).** The outer fields are drawn dark charcoal (`pp` gradient,
  #303338 to #1D1F22), which is the _moulding's_ colour, not the plates'; the centre
  field is aluminium (`al` gradient, #80878F to #5C626A); the centre view's plate is
  dark (`gp`, #26282C).
- **Owner decision (#716, 2026-10-11): the centre field is the outer panel's colour**;
  label colour and contrast on it do not matter. Recorded as given. The photos show the
  outer plates are aluminium like the centre one, so the ruling is met either by
  drawing every field in the trainer's dark panel colour or by drawing every field
  aluminium: §9 question 40.

#### 3.9.2 Gauge placement

Positions: field box fractions, then panel box fractions. Sizes are the outer diameter
of the black bezel or housing (the face plus its rim), in A (§3.9.0). This size column
is the one size table for the gauges; §3.10.11 repeats it.

| Gauge                 | Field (x, y) | Panel (x, y) | Size (A)                                           | Today (view units, centre; size) | T (centre; size)   |
| --------------------- | ------------ | ------------ | -------------------------------------------------- | -------------------------------- | ------------------ |
| Airspeed (left plate) | 0.400, 0.384 | 0.148, 0.415 | 1.00 (reference)                                   | 132, 232; 220                    | 566, 293; 193      |
| Altimeter (left)      | 0.781, 0.386 | 0.289, 0.416 | 1.00 (case; the lug and knob stand out beyond it)  | 346, 232; 196                    | 815, 294; 193      |
| Slip indicator (left) | 0.404, 0.734 | 0.149, 0.740 | 0.71 (measured 0.69 to 0.71)                       | 132, 456; about 213 (art)        | 569, 510; 137      |
| VSI (left)            | 0.787, 0.734 | 0.291, 0.740 | 0.71 (measured 0.70 to 0.73)                       | 346, 456; 196                    | 818, 510; 137      |
| Tachometer (right)    | 0.202, 0.205 | 0.744, 0.268 | 0.72 (T; across plates, **low confidence**, ±0.04) | 1759, 145; 210                   | 1615, 195; 139     |
| CHT (right)           | 0.192, 0.427 | 0.741, 0.471 | 0.40 (E = 0.55 T)                                  | 1953, 115; 150                   | 1610, 330; 77      |
| Voltmeter (right)     | 0.371, 0.427 | 0.798, 0.471 | 0.40                                               | 2109, 115; 150                   | 1711, 330; 77      |
| Oil temp (right)      | 0.192, 0.589 | 0.741, 0.619 | 0.40                                               | 1953, 271; 150                   | 1610, 429; 77      |
| Oil pressure (right)  | 0.371, 0.591 | 0.798, 0.621 | 0.40                                               | 2109, 271; 150                   | 1711, 431; 77      |
| Hour meter (right)    | 0.576, 0.524 | 0.864, 0.559 | 0.45 × 0.28 (aspect about 1.6)                     | 2271, 235; 150 × 70 (art)        | 1827, 389; 87 × 54 |
| Fuel sight gauges     | wing roots   | outside      | strip 5 to 40 l                                    | not drawn                        | not drawn          |

Arrangement, in words a pilot would use:

- **Left plate**: a 2×2 grid. Top row: airspeed (left column) and altimeter (right
  column), centres level at y 0.385. Bottom row: slip indicator under the airspeed,
  VSI under the altimeter, centres level at y 0.734. The columns sit at x 0.40
  and 0.78: the grid fills the plate's **inner three-quarters**; the outer quarter
  (left of x 0.25) is bare aluminium, and the registration lettering sits above the
  airspeed indicator. Centre to centre, the columns are 1.30 A apart (the same in both
  rows) and the rows 1.12 A (0.35 of the field height). The columns are straight: the
  slip indicator sits about 0.01 A right of the airspeed's axis and the VSI about
  0.02 A right of the altimeter's. The slip indicator and the VSI are the same size,
  about 0.7 of the airspeed indicator; the photos show the slip indicator 1 to 2
  percent the smaller, under the tolerance, so draw them equal. Trainer today: the
  grid hugs the plate's left edge (airspeed centre at x 0.27 of today's 447-unit
  field) and the field is half as wide as on the aircraft.
- **Right plate**: the tachometer at the top left; under it a 2×2 block of small
  gauges (CHT, voltmeter / oil temp, oil pressure), its left column under the
  tachometer (the tach centre about 0.05 T right of that column's axis) and its right
  column at x 0.37; the hour meter right of the block, level between its two rows
  (y 0.524, about 0.1 of a row pitch below the block's mid-height); the Generator lamp
  at the top, at x 0.49 (§3.9.4). The **tachometer is only about the VSI's size**
  (0.72 A), not near the airspeed indicator's size as the trainer draws it (210
  against 220), and the four small gauges are 0.40 A, all four equal (trainer 0.68).
  Trainer today: the small gauges sit right of the tachometer at its height (a 2×2 at
  x 0.33 – 0.76, y 0.04 – 0.49 of today's field); on the aircraft they sit **below**
  it.
- Real centre-to-centre spacings: small-gauge columns and rows both 0.53 A (0.74 T,
  1.35 E), leaving about 0.35 E between neighbouring cases; from the tachometer's
  centre to the CHT's centre 0.71 A (0.99 T) down; from the voltmeter column to the
  hour meter's centre 0.60 A (1.5 E) across.

Dial layout, as clock positions (scale numerals and units are on the dials; the dials'
legends are recorded in §3.7.1, the markings in §4.3). **§3.10 governs the dial
geometry**: its angle tables are the measurement, and this table only summarises them.

| Gauge          | Rest / zero stop                                                   | Sweep                                                                                                                                                                                                                            | Pointers, knobs, windows                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Airspeed       | pointer at 12 o'clock on a white rest index                        | clockwise, almost a full turn: 40 just right of 12 o'clock, 100 at about 2:30, 200 at 6, 300 at about 9:45, 340 just left of 12; numerals every 20                                                                               | one pointer; dial legend in the upper centre, maker's logo lower centre (footprint only). White arc on the inner half of the ring from about 1:30 to 3 o'clock (72 – 115); green from about 2:20 (94, beside the white) round the bottom to about 7:50 (245); yellow from 7:50 to about 9:45 (300); red mark at 9:45 (values as §4.3). An orange triangle outside the bezel at about 2:30 (field x 0.565, y 0.341; about 0.13 A), pointing at the dial at about 100 km/h. |
| Altimeter      | "0" at 12 o'clock                                                  | clockwise, 0 to 9 (hundreds of feet) round the dial, every 36°, except that the **2 and the 3 stand pushed apart around the pressure window** (the 2 at about 2:10, the 3 at about 3:50; their long ticks stay at 2:24 and 3:36) | **three pointers**: a long slim hundreds pointer, a short broad thousands pointer and a thin ten-thousands pointer ending in a small triangle at the rim; **pressure window at 3 o'clock** inside the dial face; the **setting knob outside the dial at its lower left**, about 7:15 (field x 0.668, y 0.543; about 0.15 A; §3.10.2); a hatched low-altitude flag window at about 6 o'clock, between the hub and the 5.                                                   |
| VSI            | pointer at 9 o'clock = 0                                           | climb clockwise over the top: .5 at 10:30, 1 at 12, 1.5 at 1:30, 2 at 3 o'clock; descent counter-clockwise under the bottom: .5 at 7:30, 1 at 6, 1.5 at 4:30, meeting 2 at 3 o'clock                                             | one pointer; a small "up" mark above the zero; the units legend (thousands of ft/min) below the hub on the vertical axis, the dial legend above it.                                                                                                                                                                                                                                                                                                                       |
| Slip indicator | ball at the centre                                                 | –                                                                                                                                                                                                                                | a near-straight tube across the middle with two centre lines; maker's logo above the tube (footprint only), legend below; round black housing, four screws.                                                                                                                                                                                                                                                                                                               |
| Tachometer     | pointer at about 7:15 (0)                                          | clockwise about 285°, symmetric about 12 o'clock (3,500 rpm at the top): 10 at about 8:40, 20 at 10, 30 at about 11:20, 40 at about 12:40, 50 at 2, 60 at 3:30, 70 at about 4:50; the gap at the bottom carries no scale         | one pointer; legends upper centre and below the hub; at the low end a red band from 0 to about 9:10 and a short yellow block to about 9:40; green along the rim from there to about 2:50; a short yellow block and the red line at about 3:10 (5,800 rpm), before the 60; nothing after it (colours **low confidence**).                                                                                                                                                  |
| CHT, oil temp  | lowest mark 40 °C at about 7:40; rest not visible (§9 question 57) | clockwise about 262° to 150 at about 4:30: 60 at about 9:30, 80 at about 11:15, 100 at about 1:00, 120 at about 2:50; the last step, 120 to 150, is visibly shorter than the others                                              | one pointer; "°C" above the hub; legend at the bottom; a green arc from 90 to 110 (about 12:10 to 2 o'clock), then a yellow block from 110, to the red line at 120 (CHT, about 2:50) or a short red segment ending at 130 (oil temp, about 3:20) (colours **low confidence**).                                                                                                                                                                                            |
| Voltmeter      | lowest mark 9 V at about 7:50; rest not visible (§9 question 57)   | clockwise to 17 at about 4:10, symmetric about 12 o'clock with **13 at the top**: 10 at 9, 11 at 10, 12 at 11, 14 at 1, 15 at 2, 16 at 3                                                                                         | one pointer; unit legend in the upper centre, under 12 – 13; gauge legend at the bottom; no arcs.                                                                                                                                                                                                                                                                                                                                                                         |
| Oil pressure   | pointer at about 7:50 (0 bar)                                      | clockwise to 10 at about 4:30, numerals every 1 bar; 5 just left of 12 o'clock; the steps from 7 to 10 are wider than those below 7                                                                                              | one pointer; unit legend top centre, gauge legend at the bottom; a thin pale arc from 1 to 2 bar (about 8:40 to 9:30), nothing from 2 to 5, a thin pale arc 5 to 6 running into a wider tan-orange arc 6 to 7 (about 12 to 1:30), the 7 tick red (colours **low confidence**).                                                                                                                                                                                            |
| Hour meter     | –                                                                  | –                                                                                                                                                                                                                                | black rectangle, digit window across its middle (running value, not recorded), legend under the window, maker name above (not reproduced), a screw left and right.                                                                                                                                                                                                                                                                                                        |

Fuel sight gauges: one on each wing root overhead, a vertical scale strip 5 to 40
"Liter" beside the tank's sight window (§3.7.1); outside all three views, not drawn.

#### 3.9.3 Avionics arrangement (#712)

| Unit                                 | Centre-plate box: x range, y range | Centre (field) | Panel (x, y) | Size in A (w × h, aspect; in D)          | Today (slot)             | T (centre; w × h)    |
| ------------------------------------ | ---------------------------------- | -------------- | ------------ | ---------------------------------------- | ------------------------ | -------------------- |
| FLARM display (classic LED)          | 0.104 – 0.371, 0.060 – 0.148       | 0.237, 0.104   | 0.458, 0.104 | 0.63 × 0.32, 1.96 (±0.15); 0.87 × 0.44 D | at(500, 150, 320, 160)   | 1112, 86; 121 × 61   |
| Take-off checklist summary (copy)    | 0.457 – 0.922, 0.051 – 0.171       | 0.690, 0.111   | 0.570, 0.111 | 1.09 × 0.43; 1.52 × 0.60 D               | art 1318, 140, 262 × 300 | 1309, 90; 211 × 84   |
| aera 500 in its cradle (outer frame) | 0.143 – 0.910, 0.323 – 0.627       | 0.527, 0.475   | 0.530, 0.475 | 1.80 × 1.10, 1.64; 2.50 × 1.53 D         | at(850, 123, 440, 275)   | 1238, 334; 347 × 213 |
| … its screen (touch area)            | 0.256 – 0.793, 0.364 – 0.564       | 0.524, 0.464   | 0.529, 0.464 | 1.26 × 0.72; 1.75 × 1.00 D               | –                        | 1237, 326; 243 × 139 |
| ATR833 COM                           | 0.133 – 0.440, 0.725 – 0.924       | 0.286, 0.825   | 0.470, 0.825 | 0.72 round; 1.00 D                       | at(540, 404, 272, 272)   | 1134, 567; 139       |
| TRT800H transponder                  | 0.549 – 0.856, 0.727 – 0.926       | 0.702, 0.827   | 0.573, 0.827 | 0.72 round; 1.00 D                       | at(832, 404, 272, 272)   | 1314, 568; 139       |

- **Arrangement.** Top band: the FLARM display at the top left and the checklist
  summary at the top right, their top edges level (y 0.05 – 0.06); the FLARM is the
  shorter of the two. Above the checklist, between it and the plate's top edge, the
  yellow version label strip (§3.9.5). Middle: the aera 500 in its cradle, centred
  under them within 0.03 of the field width (its centre sits that far right of the
  field's centre line, just beyond the ±0.02 accuracy) with bare aluminium above it
  (0.56 A between the FLARM's bottom and the cradle's top latch at y 0.303). Bottom:
  COM (left) and transponder (right) side by side, the pair centred on the field (pair
  midpoint x 0.494), centres level, 0.98 A apart (1.36 D; a 0.26 A gap between the
  discs), their bottoms 0.27 A above the plate's bottom edge. Between the cradle and
  the radios (y 0.63 – 0.69, right of centre) a faded blank paper label (0.69 ×
  0.23 A), nothing legible: optional art. A tiny pale mark just under the FLARM's lower
  left corner (a scrap of tape or residue, nothing legible) is not identified and not
  drawn; it is not the version label.
- Each round unit's two screws and two knobs sit on the corners of a square about
  0.59 A (0.82 D) wide around its disc (COM: screws left, knobs right; transponder: screws
  top left, top right and bottom left, knob bottom right), as §3.8 describes.
- **Relative sizes** (the trainer's slots against the photos, in COM diameters D): GPS
  cradle real 2.50 D wide, slot 1.62; FLARM real 0.87 × 0.44, slot 1.18 × 0.59. On the
  aircraft the GPS dominates the field and the FLARM is a small strip; the trainer
  shrinks the one and enlarges the other (§9 questions 44, 45).
- **Correction to §3.8's scale line.** The conventions bullet of §3.8 (FLARM about
  1.05 × 0.58 D, aera cradle about 2.8 × 1.67 D, body 2.45 × 1.42 D) was read without
  removing perspective, which enlarges the upper units against the radios at the
  bottom. Corrected here: FLARM 0.87 × 0.44 D, cradle 2.50 × 1.53 D, screen
  1.75 × 1.00 D (screen aspect 1.75, the unit's 480 by 272 pixels give 1.76); in A,
  the table's values.
- **Slot aspects.** The photos confirm today's slot aspects within their error: FLARM
  1.96 against 2.00, GPS cradle 1.64 against 1.60, round units 1.00. Nothing in the
  photos asks for an aspect change (#716: "slot aspect ratios stay unless the photos
  contradict them").

#### 3.9.4 Switch groups, breakers, keys and lamps (upper panel)

The upper plates carry no switch, key or lever: only the breakers, the Generator lamp,
the altimeter knob and the avionics units' own controls. The rockers, ignition key,
BAT and GEN, flap selector and fuel valve are on the lower column (§3.9.6).

**Breaker block** (right plate, lower part). Seven columns, two rows, and one breaker
alone under the **second** column:

| Breaker     | Field (x, y) | Panel (x, y) | T (centre) |     | Breaker          | Field (x, y) | Panel (x, y) | T (centre) |
| ----------- | ------------ | ------------ | ---------- | --- | ---------------- | ------------ | ------------ | ---------- |
| Com         | 0.101, 0.754 | 0.712, 0.770 | 1558, 531  |     | Landing Light    | 0.101, 0.822 | 0.712, 0.833 | 1558, 572  |
| Nav         | 0.225, 0.754 | 0.751, 0.770 | 1628, 531  |     | Cockpit Light    | 0.225, 0.822 | 0.751, 0.833 | 1628, 572  |
| Transponder | 0.344, 0.754 | 0.789, 0.770 | 1695, 531  |     | Instrument Light | 0.344, 0.822 | 0.789, 0.833 | 1695, 572  |
| Autopilot   | 0.466, 0.754 | 0.829, 0.770 | 1765, 531  |     | Beacon Light     | 0.466, 0.822 | 0.829, 0.833 | 1765, 572  |
| HS34        | 0.588, 0.754 | 0.868, 0.770 | 1833, 531  |     | Position Light   | 0.588, 0.822 | 0.868, 0.833 | 1833, 572  |
| EFIS        | 0.708, 0.754 | 0.906, 0.770 | 1901, 531  |     | Intercom         | 0.708, 0.822 | 0.906, 0.833 | 1901, 572  |
| EMS         | 0.831, 0.754 | 0.946, 0.770 | 1971, 531  |     | GPS              | 0.831, 0.822 | 0.946, 0.833 | 1971, 572  |
| 12V Outlet  | 0.225, 0.923 | 0.751, 0.925 | 1628, 634  |     |                  |              |              |            |

- Pitch: columns 0.36 A, rows 0.22 A; the 12V Outlet row 0.31 A below the bottom row
  (about 1.4 row pitches). Each breaker face (bezel or cap) about 0.18 A. The block
  spans x 0.07 – 0.86 and y 0.73 – 0.95 of the field (2.35 × 0.72 A), starting just
  right of the plate's inner edge. Row against column pitch reads 0.61 to 0.68 across
  the photos (**low confidence** on the row pitch).
- Faces: two styles that read apart at a glance. The fitted breakers of §3.7.1 (Com,
  Transponder, EMS, Landing Light, Beacon Light, Position Light, GPS, 12V Outlet) show
  a button standing in a lighter collar; the others show a flat black cap.
- Legends: above each top-row breaker; **under** each bottom-row breaker (the two-word
  ones in two lines); under the 12V Outlet breaker. Header "Circuit Breakers" centred
  at field x 0.522, y 0.919 (right of the 12V Outlet breaker, from just right of
  column 3 to just past column 5, centred between columns 4 and 5),
  "Push off" under it at y 0.946. Which positions are fitted is §3.7.1.
- **Correction:** the 12V Outlet breaker is under column 2 (Nav / Cockpit Light), not
  under column 1 as `views.ts` draws it (`outletBreaker` at x 1650, under Com) and as
  §3.7.1 words it ("below the left end").
- Trainer today: a 100 × 96 grid at x 1650 – 2350, y 372 – 660 (the full plate width,
  rows 96 apart); real rows are 0.22 A apart, so under T the row pitch is 42 units and
  the column pitch 69 (§3.9.7, touch targets).

**Generator lamp** (right plate): field x 0.494, y 0.124, a red lens 0.27 A; legend
"Generator" above it at y 0.08. It sits at the plate's horizontal middle, right of the
tachometer (about 0.86 A right of its centre and 0.25 A above it) and level with the
tachometer's top half, about 0.24 A left of the hour meter's vertical axis; not in the
top right corner, where today's `chargeLamp` (at(2196, 36, 150, 90)) puts it. Panel
0.838, 0.194; T 1780, 146; 52.

**Altimeter knob**: outside the dial at its lower left (§3.9.2).

**Glareshield**: the Cabin Heat knob and the red-cross disc, above the centre plate's
left half (§3.9.1).

#### 3.9.5 Placards

Positions only; wording is in §3.1, §3.3 and §3.7.1 (paraphrased there), and maker
text is never reproduced.

| Placard                                  | Field and position (centre)                                                                                                               | Panel (x, y) | Size (A)                                                   | Look                                                                                                          | Today                                   | T (centre; w × h)              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| Registration lettering                   | left, 0.421, 0.148 (over the airspeed)                                                                                                    | 0.156, 0.195 | 1.02 × 0.21                                                | the registration in large black capitals, no plate                                                            | not drawn                               | 580, 147; 197 × 39             |
| Take-off checklist summary               | left, 0.780, 0.142 (over the altimeter)                                                                                                   | 0.289, 0.189 | 1.10 × 0.45 (printed frame)                                | white card, two-column table, yellow warning strip along its bottom                                           | 238, 68; 416 × 92 (top left)            | 814, 143; 212 × 87             |
| Aerobatics and spins prohibited (German) | left, 0.689, 0.895 (bottom; spans x 0.52 – 0.86, from the slip indicator's right edge to under the VSI)                                   | 0.255, 0.891 | 1.14 × 0.19                                                | white strip, one line of black text                                                                           | 238, 624; 416 × 100 (bottom left)       | 754, 611; 221 × 36             |
| Take-off checklist summary (copy)        | centre, 0.690, 0.111 (top right)                                                                                                          | 0.570, 0.111 | 1.09 × 0.43 (printed frame; the same card as the left one) | as the left one                                                                                               | 1449, 290; 262 × 300 (right of the GPS) | 1309, 90; 211 × 84             |
| Version label                            | centre, 0.62, 0.03 (top right: a strip between the plate's top edge and the checklist copy, its bottom about 0.014 A above the checklist) | 0.553, 0.030 | 0.70 × 0.12 (about 1.0 × 0.17 D)                           | yellow strip with one line of small black print, a version and a date: a running value (§3.7 rule), not drawn | not drawn                               | 1280, 36; 135 × 23 (not drawn) |
| Small pale mark                          | centre, just under the FLARM display's lower left corner                                                                                  | –            | tiny                                                       | a scrap of tape or residue, nothing legible, not identified                                                   | not drawn                               | –                              |
| Faded blank label                        | centre, 0.642, 0.662 (under the cradle)                                                                                                   | 0.558, 0.662 | 0.69 × 0.23                                                | faded paper, nothing legible; optional                                                                        | not drawn                               | 1288, 458; 133 × 44            |
| Type name, script                        | right, 0.620, 0.297 (right of the tach, across the plate)                                                                                 | 0.878, 0.352 | 1.58 × 0.25                                                | manufacturer lettering: footprint only, never reproduced; the area stays plain aluminium                      | not drawn                               | 1852, 251; 305 × 48            |
| "Generator" legend                       | right, 0.494, 0.08                                                                                                                        | 0.838, 0.153 | –                                                          | small black text over the lamp                                                                                | on the lamp art                         | 1780, 118                      |
| "Circuit Breakers" / "Push off"          | right, 0.522, 0.919 / 0.946                                                                                                               | 0.847, 0.921 | 0.81 × 0.17                                                | black text, no plate                                                                                          | 2080, 620; card 460 × 96                | 1796, 631; 156 × 33            |

Lower-column placards are in §3.9.6. Stickers (the "do not step" floor labels, the
yellow T-shaped item over the rocker row) are notes only.

- **Trainer deviation: "Push off" left out** (owner, #729, 2026-10-11). D-MPGO prints
  "Push off" under the "Circuit Breakers" header; the trainer draws the header alone,
  because the wording reads as if a pushed-in breaker were off. The label is on the
  aircraft; leaving it out is the owner's decision, not a photo finding.
- **Parachute placard (console).** §3.9 measures no position for it. §3.7.1 lists it
  between the aileron- and rudder-trim wheels, just forward of the rescue handle, and
  the handle is centred (§3.9.6), so the trainer centres the placard over the handle
  (M19, #729).

#### 3.9.6 Lower column and console

**Lower column** (photo 10.14.30 (1), near frontal to the column face; its vertical
positions are **low confidence**, ±0.04).

- **Place.** The column's top edge spans x 0.364 – 0.601 of the panel box: 2.17 A wide,
  0.96 of the centre plate's width, and **offset 0.37 A left of the centre plate's
  centre line** (toward the pilot; 0.30 to 0.39 A across the photos). Its top edge is
  0.28 A (0.08 of the panel height) below the centre plate's bottom (**low
  confidence**: the column face is in another plane, and raw photo readings give 0.14
  to 0.21 A). Trainer today (§3.2a): the field sits about 40 px
  _left_ of the column, i.e. the column right of the field's centre; on the aircraft
  it is the other way round. Under T (§3.9.7) the column's top maps to panel view
  x 946 – 1364, cockpit x 654 – 890 px at HD, centre 772 px; the `centre` cell's centre
  is 755 px, 17 px left of it.
- **Shape.** A T: the top part takes the full width and holds the rocker row; below it
  both sides curve in over the upper half to the lower part, 0.59 of the top width
  (1.27 A), which runs straight down to a level bottom edge. Height about 2.9 A, so the
  column box is **taller than wide (0.75)**; the `centre` view is 1200 × 900 (1.33).
  Aluminium like the upper plates (§3.9.1); the trainer draws a dark rectangle.
- **Contents**, as fractions of the column box (x across the top width from the top
  left corner, y from the top edge to the bottom edge), against the `centre` view today
  (fractions of its plate area 16 – 1184 × 16 – 892) and the target coordinates under
  the fraction mapping x = 16 + 1168·x, y = 16 + 876·y (§9 question 43):

| Item                                  | Column (x, y)                             | Size (fraction of the top width)           | Today (x, y)         | Target (view units) |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------ | -------------------- | ------------------- |
| Rocker row (y)                        | –, 0.12                                   | rockers 0.07 × 0.14, the first 0.11 × 0.14 | –, 0.13 – 0.14       | y 121               |
| Avionics Master (larger rocker)       | 0.267                                     |                                            | 0.106                | 328                 |
| Beacon Light                          | 0.408                                     |                                            | 0.273                | 493                 |
| Position Light                        | 0.501                                     |                                            | 0.410                | 601                 |
| Intercom                              | 0.598                                     |                                            | 0.547                | 714                 |
| Cockpit Light                         | 0.694                                     |                                            | 0.684                | 827                 |
| Landing Light                         | 0.784                                     |                                            | 0.821                | 932                 |
| Avionics placard (yellow strip)       | 0.617, 0.206                              | 0.43 × 0.03                                | art                  | 737, 196            |
| 12 V socket                           | 0.318, 0.302                              | 0.18                                       | art                  | 387, 281            |
| Fuel-capacity placard                 | 0.322, 0.413                              | 0.20 wide                                  | art                  | 392, 378            |
| Limit-speed placard                   | 0.707, 0.343                              | 0.18 × 0.19                                | art                  | 842, 316            |
| Flap readout ("Flaps" above)          | 0.516, 0.540                              | 0.21 × 0.07                                | 0.586, 0.501         | 619, 489            |
| Flap Fuse                             | 0.718, 0.547                              | 0.07                                       | 0.767, 0.502         | 855, 495            |
| Fuel valve legend strip               | 0.325, 0.604                              | 0.05 × 0.30 (vertical)                     | 0.177, 0.647         | 396, 545            |
| Fuel valve slot (column's left edge)  | 0.21, 0.62 – 0.95                         | –                                          | –                    | 261, 559 – 848      |
| Fuel valve grip (closed, at slot end) | 0.357, 0.945                              | 0.25 long, horizontal, pointing right      | –                    | 433, 844            |
| Flap selector (ring)                  | 0.530, 0.715                              | 0.18 × 0.19                                | 0.586, 0.821         | 635, 642            |
| Ignition key switch                   | 0.367, 0.852                              | 0.18                                       | 0.177, 0.826         | 445, 762            |
| Master box (BAT left, GEN right)      | 0.711, 0.858                              | 0.19 × 0.11                                | 0.782 / 0.919, 0.838 | 846, 768            |
| "Instrument Light" legend             | 0.548, 0.902                              | –                                          | art                  | 656, 806            |
| ELT remote switch and lamp            | not visible in photos (stays, §2a item 1) | –                                          | 0.305, 0.514         | unchanged           |

- **Deltas that a pilot would notice.** The rocker row is centred on the column's top
  and closely spaced (pitch 0.095 of the top width, about 0.21 A), not spread over the
  whole width from the far left. The flap selector sits **above** the ignition's level,
  between the flap readout and the Master box, not level with the ignition. The
  ignition is at the lower part's left, right of the fuel-valve slot, not at the far
  left. The fuel valve's legend strip is right of its slot, and the closed grip lies
  at the slot's lower end just under the ignition's face (§3.7.1).
- **Overlaps under the fraction mapping at today's control sizes**: the rocker pitch
  becomes 110 units (today's rockers are 150 wide), and the flap selector (290
  round) overlaps the ignition (260) by about 50 units, the Master box (BAT and GEN,
  300 × 220) by about 80 and the flap readout (240 × 110) by about 45; real geometry
  and today's touch-target sizes conflict here (§9 question 43).

**Console** (photos 10.14.30 (1) and 10.14.29 (3), **low confidence**, ±0.05 of the
console's width at the lever row):

- Lever row, left to right, as fractions of the console top's width: the green
  stabilator-trim strip at the left edge (0.03), the trim wheel 0.15, the trim
  indicator slot 0.27, choke 0.35, throttle 0.55, brake 0.80. The levers use the
  console's **full width**, the brake near its right edge. Trainer today (fractions of
  1200): trim 0.10, choke 0.28, throttle 0.45, brake 0.61, with the provisional
  carb-heat knob at 0.84 (not on D-MPGO; stays, §2a item 1).
- Parking-brake valve: on the right flank (x about 0.95), aft of the lever row by
  about half the console's width; trainer 0.85, below the brake: same side, slightly
  further in.
- Rescue handle: centred on the upright aft face (trainer 0.50): no delta.
- Aileron and rudder trim wheels between valve and handle: not drawn (§3.7.2), no
  position needed for M19.

#### 3.9.7 Trainer mapping

**Today.** `views.ts` and `view-panel.svg`: panel view box 2372 × 700, plates left
12 – 459, centre 471 – 1628, right 1640 – 2360, all y 16 – 684 (span aspect 3.51).
`cockpit.ts`: panel cell 1339 × 395 at HD (x 120 – 1459), floor `minWidth` 1110
(0.468 px per view unit), `centre` cell x 524 – 987, dock x 0 – 508. Device slots at
natural size (§3.2a): round 272, GPS 440 × 275, FLARM 320 × 160. The airspeed
indicator is 220 units because its numerals set the lettering minimum at the floor.

**Do the real proportions need a new view box? Yes, if the panel is to keep its full
width.** The plates' real span is 2.64 times as wide as tall; the view's is 3.51.
Height binds, not width:

- At **2372 wide** (1 A = 257 units): left plate 869 × 829, gap 69, centre 579 × 891,
  gap 77, right 754 × 815. The box would have to be about 2372 × 923 (+32 percent
  height). In the HD panel cell that is 1339 × 521 px, which leaves no room for the
  `centre` and `console` row (347 px) inside the 758 px cockpit: the one-viewport rule
  (#253) breaks. At this scale the natural device slots would just fit the centre
  plate (radio pair 544 of 579 wide; FLARM, GPS and radios stacked 707 of 891 tall),
  with the radio gap shrunk from 0.26 A to about 0.07 A.
- At **700 tall** (1 A = 193 units): the plates span only 1761 of the 2372 units;
  centre plate 434 × 668. The natural slots cannot fit: the radio pair alone (544) is
  wider than the centre plate.

**Assumption T (all "T" coordinates in §3.9.2 – §3.9.5 use it; the owner decides in
§9 question 41).** The view box stays 2372 × 700, so `cockpit.ts`'s cell rects stay.
The three plates are drawn at true proportions with one uniform scale fitted to the
height: **1 A = 193 view units** (the panel box's 3.45 A fitted to 668 units),
centred, with the dark moulding filling x 0 – 306 and 2066 – 2372 and the gaps:

- panel box fraction to view: **x = 306 + 1761·px, y = 16 + 668·py**; a size in A
  times 193;
- left plate x 306 – 957, y 54 – 676; centre plate x 1009 – 1443, y 16 – 684; right
  plate x 1501 – 2066, y 70 – 681.

What T costs (each a training-UX trade-off of equal rank under ADR 0002, realism
against lettering minimums and 44 px targets):

- **Lettering floor.** The airspeed indicator comes out at 193 units, 0.88 of the 220
  its numerals need. Keeping today's lettering minimum means the panel's `minWidth`
  rises from 1110 to about 1267 px (still below the HD cell's 1339), or the dial
  numerals are redrawn relatively larger. Every other gauge shrinks against today
  too: tachometer 139 (today 210), small engine gauges 77 (today 150), slip indicator
  and VSI 137 (today about 213 and 196).
- **Device mirrors** fall below natural size: COM and transponder 139 (0.51 of 272),
  GPS cradle 347 × 213 (0.79), FLARM 121 × 61 (0.38). Their slot lettering would be
  below the floor; operation in the dock is unchanged.
- **Breakers.** Real pitch gives 69 by 42 units per breaker (39 by 24 px at HD), far
  below 44 px targets; today's grid is 100 × 96.
- **Glareshield items** fall above the box (y about −26): the Cabin Heat knob and the
  red-cross disc cannot be drawn above the centre plate (§9 question 42).
- **Cockpit fit.** The lower column stays under the centre plate within 17 px at HD
  (§3.9.6), so the `centre` cell need not move. The radios move right, to cockpit
  x 760 and 862 px: they no longer reach over the dock (x 0 – 508), which §3.2a's
  layout aimed for.

**Alternative (not used for the coordinates): a box of about 2044 × 800 at today's
scale (1 A = 220 units, airspeed 220).** True proportions with no shrink of the
lettering; the panel cell becomes about 1009 × 395 px at HD with `minWidth` about 957
(the same 0.468 px per unit), freeing about 330 px of cockpit width; the glareshield
items still do not fit (including them needs a box about 880 tall, whose scale in the
395 px cell falls below the floor). This
cascades to `cockpit.ts` (panel cell rect and `minWidth`) and to every statement of
the 1110 floor. The device mirrors and breakers are as small, relative to their
natural sizes, as under T.

**Summary for the implementer of #716 and #712.** Whatever the owner chooses in §9
41, the _positions_ (field and panel fractions) and the _relative sizes_ (in A)
above are what makes the panel recognisable; the fractions do not change with the box.

**Trainer (M19, #716).** What the layout PR drew, against assumption T:

- **The floor cannot rise.** Below the 1200 px desktop breakpoint the panel renders at
  most 1113 px wide, and the floor checks run there, so the floor stays 1110 px (0.468
  px per view unit) and the view box stays 2372 × 700; `cockpit.ts` is unchanged.
- **Gauges at T.** 1 A = 193 units, every gauge at its §3.9.2 size. At HD the scale
  numerals fall under the 11 px lettering minimum and print as secondary lettering
  (half the minimum); the engine gauges' and the VSI's smallest legends are decor.
- **Plates wider than true, positions kept.** Left plate 740 units wide (true 652), the
  gauge grid at its true distances from the inner edge, the extra width bare on the
  outer side, so the left plate stays the widest. Right plate 718 wide (true 565):
  the breaker grid keeps its 7 + 7 + 1 arrangement at 98 by 94 units, a 44 px target
  at the floor each way, and the outlet breaker sits 62 units under column 2; the
  tachometer and the engine block move 45 units up to make room, at their true
  spacings. Centre plate 578 × 696 (true 434 × 668).
- **Units at D-MPGO's relative sizes** (photo-fidelity gate, round 1): FLARM 120 × 60
  (0.62 A), GPS cradle 347 × 217 (1.80 A, 2.50 radio diameters), COM and transponder
  139 each (0.72 A), 0.26 A of clear plate between them, the pair centred under the
  cradle, the radio centres at 0.84 of the plate height, and the faded blank label
  drawn in the gap under the cradle. The checklist card (212 × 96) sits top right at
  its photographed centre, wider than the FLARM display as on D-MPGO. The cradle and
  radio mirrors meet the slot lettering floor; the FLARM mirror does not and is read in
  the dock (ADR 0002: recognition over in-slot legibility), its tap area grown to the
  touch target around the slot (§9 questions 44, 45).
  The radio pair sits right of the dock; the lower column hangs 0.37 A left of the
  centre plate's middle, as on the aircraft.
- **Left out:** the glareshield knob and the red-cross disc (no room above the FLARM
  display, §9 question 42); the "Push off" label (owner, §3.9.5); the Cockpit Light
  breaker legend (the 12V Outlet breaker sits right under that breaker, §3.9.4); the
  plates' corner screws; gauge screws,
  which belong to the gauge faces (#719 to #721).
- **Not moved in this PR:** the lower column (`centre` view, §9 question 43) and the
  console's lever row; on the console only the parachute placard and, beside it, the
  rudder-trim wheel and the parking-brake valve move.

### 3.10 Gauge faces (photos, M19)

The round panel gauges and the hour meter, drawn from the owner's photos (§3.7) so
that an implementer can draw each face without seeing them. Each block has a **Face
layout (photos)** part in the manner of §3.8, paraphrased measurements only; no
photo, crop or derived image is in the repository. §3.10.0 sets the convention,
§3.10.11 the look and grouping shared by all of them; the case sizes are §3.9.2's.
Values the photos do not settle are marked **assumed (unverified)** or **low
confidence** and, where the club could settle them, point to a §9 question (46 to 63).

#### 3.10.0 Gauge-face convention

The **Face layout (photos)** blocks of the round panel gauges (§3.10.1 onwards) use
this convention. They come from the owner's photos (§3.7). No photo, crop or derived
image is in the repository.

- **Angles.** 0° is 12 o'clock on the dial and angles grow clockwise, so 90° is 3
  o'clock and 270° is 9 o'clock. Each dial's own reference sets 0°: the rest index
  of the airspeed indicator and the 0 numeral of the altimeter. Angles are measured
  about the dial's pivot (where the tick radials meet), not the case centre.
- **Radii** are fractions of the **case radius R**: the outer edge of the black bezel
  ring, which is the visible edge of the instrument against the panel. Each gauge
  uses its own R.
- **Sizes** are fractions of **A, the airspeed indicator's case diameter** (2R of the
  ASI), the one size unit of §3.9 and §3.10 (§3.9.0). The radio disc of §3.8 (D,
  57 mm nominal) is 0.72 A. Case sizes come from §3.9.2's size column, the one size
  table (§2a item 10); for screw and print positions inside a gauge's own box, that
  gauge's block governs.
- **Box coordinates**, where a block gives them, follow §3.8: origin at the top left
  of the case's bounding square, x to the right and y down, as fractions of that
  gauge's own case diameter. The centre is (0.5, 0.5). Polar and box positions
  convert by x = 0.5 + 0.5·(r/R)·sin θ and y = 0.5 − 0.5·(r/R)·cos θ. Values
  outside 0 to 1 lie beyond the case (screws, knobs, stickers).
- **Method.** Three of the left-seat panel views were corrected to the panel plane,
  using the four mounting screws around each instrument as a square. Angles were
  then read against the dial's own reference. On the airspeed indicator, three
  photos agree within about 1° on every tick.
- **Parallax.** The dial sits recessed behind its bezel, so in the photos the dial
  print appears shifted by about 0.05 to 0.10 R against the case outline, depending on
  the view. The real instruments are concentric, and the blocks give the concentric
  geometry. The same recess lets the bezel lip hide the outer part of the dial at the
  top in the two closer views: there the outer band of an arc and the outer end of a
  tick can be hidden (occlusion, not a gap in the print).
- **Accuracy.** Angles are good to ±3°, radii to ±0.03 R, box positions to ±0.02 and
  sizes inside a face (pointers, print, footprints) to ±15 % unless marked **low
  confidence**. Case sizes carry §3.9.0's ±5 %.
- **Colours** are given in words with an approximate hex hint after allowing for the
  photos' cool cast; the hint only guides the choice of a panel colour. Under the
  owner's principle (fidelity is recognition), colours, stickers, logos, fonts and
  fine ticks are notes; positions, sizes, dial type, pointers, scale direction,
  numerals, units, arc positions and controls are what the face must get right.
- A maker's logo, name or country-of-manufacture line is **never reproduced**: its
  footprint is listed so that the area stays blank or carries a generic mark.
- **Mounting, airspeed indicator and altimeter.** A round case with a narrow
  matte-black bezel ring (no chrome) sits directly on the light brushed-aluminium
  plate (§3.7.1), with no square flange or frame. Four black cross-head screws sit
  at the corners of a square centred on the gauge, their centres about 0.39 A from
  the gauge centre in x and in y, their heads about 0.10 A across.
- **Notation in the later blocks.** **E** is the case diameter of the CHT, oil
  temperature, voltmeter and oil pressure gauges (0.40 A = 0.55 T), and **T** is the
  tachometer's (0.72 A). §3.10.3 to §3.10.5 give positions as (x, y) from the dial
  centre in units of R, x to the right and y down (box fraction = 0.5 + 0.5 × value).
- **Perspective.** The panel photos lean each gauge by a keystone shear that depends
  on the view (about 3 to 5° in the wide left-seat view, 13 to 17° in the two closer
  frontal views; tops lean outward: left on the upper-left field, right on the
  upper-right field), shorten it vertically by 4 to 16 %, and image the lower part
  of each plate smaller, because it is farther from the lens (§3.9.0). All three were
  removed before measuring: the screw squares come out square, the round cases round,
  and the tachometer's numerals 30 and 40 symmetric about 12 o'clock.
- **Absolute size of A** (**low confidence**). Scaled from the aera 500 body (about 12
  cm wide; the maker's figure is quoted from memory, unverified), A is about 75 to 85
  mm; scaled from the COM disc taken as 57 mm (§3.9.0), about 79 to 83 mm. Both give
  the 3⅛-inch class. The trainer sizes gauges by the ratios to A, not in mm.
- **Screws, both outer fields.** Every gauge screw is the same black dome-headed
  cross-head screw. Head diameters in A (§3.10.11's table gives them in each
  instrument's own diameter): ASI and altimeter about 0.10, VSI and slip indicator
  about 0.09, tachometer and hour meter about 0.085, engine gauges about 0.08.

#### 3.10.1 Airspeed indicator

**Face layout (photos).** A single-pointer airspeed indicator in km/h, top left of
the upper-left field's 2×2 (§3.7.1). Case diameter 1.00 A by definition (§3.10.0).
The needle is at rest in every photo.

- **Case and bezel.** Round. The black bezel ring runs from about 0.885 R to R
  (about 0.06 A wide). Four screws as in §3.10.0, in box coordinates (0.115, 0.115),
  (0.885, 0.115), (0.885, 0.885) and (0.115, 0.885). The case has no lug or knob.
- **Dial.** Matte black. Every print is white. There is one scale, km/h, and no
  second unit.
- **Rest and stop.** The needle rests at 0° (12 o'clock) on a short white **rest
  index**: a bar centred on 0°, about 0.025 A wide, visible from r 0.77 to about
  0.85 R (its outer end hides under the bezel lip in the closer views). No stop pin is
  visible.
- **Sweep.** Clockwise, almost a full turn. 40 km/h sits at 10°, just right of the
  rest index, and 340 km/h at 340°, just left of it. The scale spans about 330° for
  300 km/h, about 1.10° per km/h. Nothing is marked between the rest index and 40,
  so the first 40 km/h share only the first 10° of the dial. The linear rule
  θ(v) = 10° + 1.10° × (v − 40) for 40 ≤ v ≤ 340 holds within 1° from 40 to 250
  km/h; from 260 to 300 the ticks sit 3 to 4° below it, and 320 and 340 are back on
  it. Three photos agree within about 1° on every tick.
- **Numerals.** Sixteen, every 20 km/h from 40 to 340. They stand upright (not
  rotated with the scale), in a regular-weight sans. Their centres lie on a circle
  of about 0.62 R (±0.04). Cap height is about 0.05 A; a three-digit numeral is
  about 0.11 A wide.

| km/h | Angle | km/h | Angle | km/h | Angle | km/h | Angle |
| ---- | ----- | ---- | ----- | ---- | ----- | ---- | ----- |
| 40   | 10°   | 120  | 98°   | 200  | 185°  | 280  | 270°  |
| 60   | 32°   | 140  | 119°  | 220  | 207°  | 300  | 293°  |
| 80   | 54°   | 160  | 141°  | 240  | 229°  | 320  | 318°  |
| 100  | 76°   | 180  | 163°  | 260  | 249°  | 340  | 340°  |

- **Ticks.** One every 10 km/h from 40 to 340 (31 ticks), all running out to the
  dial edge at about 0.88 R. Numbered ticks span 0.72 to 0.88 R, unnumbered ticks
  0.74 to 0.88 R; the difference is slight. Ticks are about 0.012 A wide. At 300 the
  red line takes the tick's place.
- **Printed words.**
  - "AIRSPEED" centred straight above the hub at box (0.50, 0.335) (r 0.33 R), cap
    height about 0.04 A, about 0.28 A wide.
  - "KmH" under it at box (0.50, 0.405) (r 0.19 R), as printed: capital K, small m,
    capital H. About 0.04 A tall and 0.12 A wide. It is the scale's unit legend.
  - The maker's footprint below the hub: a small logo with two short lines under it
    (maker name, country of manufacture), at box x 0.40 to 0.60, y 0.545 to 0.71.
    **Not reproduced**: draw a generic mark there or leave it blank.
  - Two small dark dial screws at box (0.40, 0.49) and (0.60, 0.49), about 0.02 A
    across (optional detail).
- **Needle.** One: a long, straight white lance with parallel sides, about 0.022 to
  0.025 A wide, ending in a pointed tip. It runs from about 0.08 R to its tip at about
  0.75 R, into the tick band and short of the arcs and of the rest index. No tail is
  visible, and the hub is black on black, with no visible cap.
- **Arcs.** All coloured marks lie in a narrow band at the dial edge. The outer half
  of the band (0.83 to 0.88 R) carries green and yellow; the inner half (0.79 to
  0.82 R) stays dark except under the white arc.

| Mark     | km/h                 | Angles                   | Radii                                                                                      |
| -------- | -------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| White    | 72 to 115            | 45° to 93°               | full band 0.79 to 0.88 R from 72 to 94; from 94 to 115 only the inner half, 0.79 to 0.82 R |
| Green    | 94 to 245            | 69° to 235°              | outer half, 0.83 to 0.88 R; from 94 to 115 it runs beside the white                        |
| Yellow   | 245 to 300           | 235° to 293°             | outer half, 0.83 to 0.88 R                                                                 |
| Red line | 300                  | 293° (±2°)               | a radial line from about 0.67 to 0.87 R, longer inward than the ticks, about 0.02 A wide   |
| None     | 40 to 72, 300 to 340 | 10° to 45°, 293° to 340° | no arc                                                                                     |

**Arc verdict.** The photos confirm the §4.3 markings and the handbook's airspeed
markings: white 72–115, green 94–245, yellow 245–300 and the red line at 300. The
audit reading "green about 115–240" (#720) is superseded. The green arc starts at
about 94 km/h, but its first 20 km/h run in the outer half of the band beside the
white arc's inner half, and in the two closer photos the bezel lip hides the outer
band there (§3.10.0), so that stretch reads as missing. The clearest photo resolves
both bands (white start 73, green start 95, white end 115, green end 245); a second
photo agrees within 3 km/h. No mark lies at 276 (about 268°): the yellow runs on
unbroken to the red line at 300.

- **Handbook comparison** (HB 2-1 and the airspeed rows of HB 7-20, numbers only).
  The handbook's speeds match §4.1: stall 85, 75 and 65 km/h (flaps −12°, 0°, 35°);
  VA 194; flap limits 184 (0°), 148 (15°) and 115 (30° and 35°); VRA 245, with the
  caution range from 245 to VNE. The handbook gives three VNEs by rescue system: 276
  for BRS 1050, 260 for the Junkers High Speed, 300 for the Junkers Light Speed. Its
  marking table gives white 72–115 and green 94–245 for all, and the yellow arc and
  red line by the same split: 245–276 and 276, 245–260 and 260, or 245–300 and 300
  (Junkers Light Speed or no rescue system). **D-MPGO's dial carries the last of
  these.**
- **Rescue-system note** (**low confidence**: small, oblique print on the console
  photo). The data plate beside the rescue handle (§3.7.1) reads as a BRS of the
  1050 type, and its limits line gives about 475 kg and 276 km/h. If that reading
  is right, the dial's 300 marking belongs to the handbook's no-rescue variant while
  the installed system is the 276 one. This bears on §2a decision 3 and the §8 VNE
  row, and the owner decides (§9 question 50). The trainer draws the dial as
  photographed.
- **Windows and knobs.** None.
- **Sticker (on the panel, not the instrument).** A filled orange triangle (hint
  #e89a20) beside the case on the right, its apex pointing left at the dial. The apex
  is at θ about 75° and r about 1.04 R (box (1.00, 0.36)); the base is upright at box
  x about 1.13, from y 0.28 to 0.42. The triangle is about 0.13 A wide and 0.14 A
  tall. About the dial's pivot the apex sits at about 77°, the 100 km/h tick. It
  carries no print, so its meaning is not legible (§9 question 51).
- **Placement** (cross-check for the panel layout; panel plane corrected, ±0.03).
  The centre sits at about (0.38, 0.36) of the bounding box of the upper-left field's
  aluminium plate, which is about 3.38 A wide and 3.22 A tall (§3.9.1; §3.9.2's field
  position (0.40, 0.38) governs). The altimeter's centre is 1.30 A to the right, level
  within ±0.03 A.
- **Not visible in the photos:** how the needle moves between 0 and 40 km/h and
  whether a stop pin exists (§9 question 52); the needle's hub and any tail; any print on
  the sticker; the exact arc colours under the glare.
- **Colours (notes).** Face black (hint #121619); print and needle white (#ececec);
  white arc #e8e8e8; green arc a medium green (dark teal in the photos; hint
  #2f8a5a); yellow arc #d8c83c; red line #c8323c; bezel and screws black (#1a1a1a).

#### 3.10.2 Altimeter and QNH setting

**Face layout (photos).** A three-pointer sensitive altimeter in feet, top right of
the upper-left field's 2×2, with a pressure-setting window at 3 o'clock and a
setting knob at its lower left. The maker is not legible and the face shows no logo.

- **Case and bezel.** Round, the same size as the airspeed indicator: case diameter
  1.00 A (±0.04; the two screw squares also match within 3 %). The bezel ring is
  narrow and black like the ASI's; the face edge inside it does not show (black on
  black). A black moulded **lug** grows out of the case at the lower left, from θ
  about 205° to about 245°, reaching out to about 1.2 R, with an outline of two
  rounded lobes; it carries the knob. Of the four screws of §3.10.0 three show, at box
  (0.115, 0.115), (0.885, 0.115) and (0.885, 0.885); the fourth, at (0.115, 0.885), is
  hidden under the lug and knob.
- **Dial.** Matte black, every print off-white. **No coloured markings** and no arcs.
- **Scale.** 0 at 12 o'clock. There is no stop: the pointers turn on round the dial,
  a full 360° per turn, clockwise for rising altitude. The numerals 0 to 9 count
  100 ft each on the long pointer and sit every 36° (θ = 36° × n, within ±2.5°),
  **except the 2 and the 3, which stand pushed apart around the pressure window: the
  2 at about 65° and the 3 at about 115°** (about 7° each away from the window),
  while their long ticks stay at 72° and 108°. Draw every tick at 36° × n and move
  only those two numerals: the wide gap around the window is part of the face's
  look. The numerals stand upright, tall and condensed, cap height about 0.09 A
  (about twice the ASI's), with centres on a circle of about 0.61 R (±0.04); the 0
  and the 5 sit a little further out (0.65 to 0.67 R) and the 1 a little further in
  (about 0.60 R). The 1 is a plain bar. The 0 is partly hidden by the ten-thousands
  pointer in the photos, and the 3 partly by the long pointer.
- **Ticks.** 50, one every 7.2° (20 ft on the long pointer). Minor ticks span 0.77
  to 0.85 R; each numeral has a longer tick, 0.73 to 0.85 R. Ticks are about
  0.01 A wide and run on past the window.
- **Printed words.**
  - A small spaced-capital unit legend split either side of the 0: the figure 100 on
    the left (box (0.41, 0.16)) and FEET on the right (box (0.60, 0.16)), cap height
    about 0.02 A. It says each numeral is 100 ft on the long pointer.
  - "ALT", bold, at box (0.41, 0.38), cap height about 0.06 A, about 0.15 A wide.
  - Under it a tiny two-line note at box x 0.29 to 0.47, y 0.46 to 0.51, cap height
    about 0.012 A: a word for range, then a figure with a unit word. The figure is
    **not legible** at the photos' resolution (it may be 20,000 feet, but its leading
    digits and the unit word are not resolved; **low confidence**). Optional detail.
- **Pressure window.**

| Item                  | Position and size                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window                | An opening in the dial at 3 o'clock, box x 0.75 to 0.88, y 0.42 to 0.56 (θ about 77° to 102°, r 0.50 to 0.76 R), about symmetric about the index. Its outline does not show (black on black)               |
| Value                 | Four digits, the current setting (1025 in the photos), centred at θ 90°, r 0.60 R (box (0.80, 0.50)), reading horizontally. Cap height about 0.03 A, about 0.10 A wide: far smaller than the main numerals |
| Pressure-scale ticks  | A column of short fine ticks just right of the value, at r about 0.70 R (box x about 0.85), from y about 0.42 to 0.56. The scale turns behind the dial                                                     |
| Index                 | A short bold double bar at θ 90° on the tick ring (r 0.74 to 0.82 R, box x 0.87 to 0.91), level with the value                                                                                             |
| Print at the top edge | A row of small print cut off by the window's upper edge, under the 2 (box x about 0.73 to 0.84, y about 0.43): not legible. It is either the next scale value or a unit word                               |
| Units                 | **hPa**, inferred from the four-digit value; no unit word is legible. No inHg scale or second window                                                                                                       |

- **Low-altitude sector.** A fan-shaped opening below the hub: an annular sector from
  θ about 150° to about 206°, r 0.23 to 0.48 R (box x 0.40 to 0.62, y 0.60 to 0.74),
  on the 5's radial, between the hub and the numeral. It shows about five white
  stripes on black, slanting down to the right at about 40 to 45°; stripes and gaps
  are each about 0.025 A wide. The photos (at about 330 ft) show it fully striped.
- **Pointers.** Three, all off-white; the hub is black on black, with no visible cap.

| Pointer                  | Shape and size                                                                                                                                                     | Turns               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Hundreds (long)          | A slim bar about 0.022 A wide ending in a small arrowhead, from about 0.15 R to its tip at about 0.75 to 0.77 R, into the tick band. No tail is visible            | once per 1,000 ft   |
| Thousands (broad)        | A broad blade with parallel sides, about 0.05 A wide, ending in a pointed (chevron) tip, from about 0.10 R to its tip at about 0.38 R                              | once per 10,000 ft  |
| Ten-thousands (hairline) | A hairline, about 0.006 A wide, from the hub to a small inverted white triangle on the tick ring: base outward at 0.86 R, about 0.05 A wide; apex inward at 0.75 R | once per 100,000 ft |

The hundreds pointer is the longer of the two main pointers (this settles the
question #719 raised). Stacking: the hairline appears to pass under the broad blade
(**low confidence**); the long pointer on top is general knowledge, not visible
(the two never overlap in the photos).

- **Setting knob.** A plain black cylinder seen end-on at the lug's outer lower end:
  centre at θ about 217° (about 7:15 o'clock) and r about 1.25 to 1.3 R (box about
  (0.12, 1.01); its end face stands proud of the panel, so its place in a photo moves
  with the view, 1.27 R in the wide view and 1.33 R in a closer one), diameter about
  0.155 A, so its disc reaches out to about 1.4 R, beyond the case and past the
  hidden lower-left screw. Its face is flat and plain with a thin
  lighter edge; it carries **no print and no pointer line**. It stands out from the
  lug by about 0.08 A (**low confidence**, one oblique photo). Knurling is not
  resolved: the side looks plain at the photos' resolution.
- **Stickers.** None on or beside the altimeter.
- **Reading in the photos.** On the parked aircraft the altimeter reads about 330 ft
  with 1025 in the window (the long pointer just past the 3's tick, at about 120°;
  the broad pointer just right of 0, the hairline at 0). The day's QNH is unknown
  (§9 question 47).
- **Trainer uses** (§9 questions 46 to 49, all **assumed (unverified)**): a field
  elevation of 315 ft at the home aerodrome; QNH 1013 hPa unless a scenario sets its
  own; indicated altitude = field elevation + height above the field + (knob setting
  − QNH) × 27 ft per hPa, all three pointers following that one value; a setting
  range of 950 to 1050 hPa in 1 hPa steps, turning the knob clockwise raising the
  setting and the reading. The knob's starting setting is the #719 PR's decision
  (§9 question 47).
- **Placement** (cross-check for the panel layout; panel plane corrected, ±0.03).
  The centre sits at about (0.78, 0.36) of the upper-left plate's bounding box
  (§3.9.2's field position (0.781, 0.386) governs), 1.30 A right of the ASI's centre
  and level with it.
- **Not visible in the photos:** the drum's setting range and step; the knob's
  turning sense, knurl and exact length; the printed pressure unit (the cut-off
  print is not legible); the hub cap and any tail on the long pointer; the stacking
  of the long pointer; how the striped sector closes above 10,000 ft (§9 question 49).
- **Colours (notes).** Face black (hint #111418); print and pointers off-white
  (#e6e6e0); bezel, lug, knob and screws black (#1a1a1a). The stripes are the same
  off-white on black.

#### 3.10.3 Vertical speed indicator

**Face layout (photos).** Unit box, frame and angles as in §3.10.0 (notation): (x, y)
in units of R from the dial centre, x right, y down; 0° at 12 o'clock, clockwise
positive. Measured in three frontal photos with perspective removed. Angles ±5°,
positions ±0.03 R, sizes ±15 % unless marked **low confidence**.

- **Size.** Case diameter **0.71 A** (§3.9.2: 0.70 to 0.73 in four photos once the
  perspective term is removed; corrections without it read 0.63 to 0.64, §3.9.0).
- **Case and mount.** A thin matte black bezel ring (about 0.07 R wide), barely
  distinct from the black dial; no chrome. The case sits on the brushed-aluminium
  field with three black dome-headed cross-head screws at (−0.84, −0.83),
  (+0.84, −0.83) and (+0.84, +0.83), head diameter ≈ 0.26 R. At the lower-left
  corner, in place of a fourth screw head, a short black cylindrical stub sticks out
  diagonally at −135°, from about 1.05 R to 1.25 R from the centre and about 0.10 R
  thick: probably the zero-set screw (**low confidence**).
- **Dial type.** Black dial with white markings and one pointer. **0 at 9 o'clock
  (−90°).** Climb reads clockwise over the top, descent counter-clockwise under the
  bottom, and the two halves meet at **one shared 2 at 3 o'clock (+90°)**, so each
  half spans 180°. No stop pin is visible.
- **Units.** Thousands of feet per minute (the printed `1000 ft. per min.`). No
  coloured arcs.

_Scale._ Linear: 90° per 1,000 ft/min, 9° per 100 ft/min.

| Value (×1000 ft/min) | Climb half (over the top) | Descent half (under the bottom) | Numeral printed |
| -------------------- | ------------------------- | ------------------------------- | --------------- |
| 0                    | −90° (shared)             | (shared)                        | `0`             |
| 0.5                  | −45°                      | −135°                           | `.5`            |
| 1                    | 0°                        | 180°                            | `1`             |
| 1.5                  | +45°                      | +135°                           | `1.5`           |
| 2                    | +90° (shared)             | (shared)                        | `2`             |

Measured: the 0 bar at −91°, the 2 mark at +88°, the climb 1 at +2°, the descent 1
at 179°, the 1.5 numerals at +44° and +137°. No non-linearity is visible.

- **Ticks.** White, radial, every 0.1 (100 ft/min) on both halves. Minor ticks run
  from 0.73 R to 0.86 R, about 0.015 R thick. Major ticks at 0.5, 1 and 1.5 on both
  halves run from 0.70 R to 0.88 R, about twice as thick. The **0** is a thick bar
  from 0.70 R to 0.88 R, about 0.05 R thick. At **2** an I-shaped mark replaces the
  tick: a tangential bar at 0.81 R spanning ±8° about +90° (about 0.23 R long), with
  short radial serifs at both ends from 0.74 R to 0.88 R.
- **Ticks across the top.** Between about −45° and +45° the bezel lip hides the outer
  part of each tick in every photo, so they show as dots there. They are the same
  dashes as everywhere else (inference from the viewing angle, medium confidence).
- **Numerals.** Upright white bold sans, cap height ≈ 0.14 R, centred on a ring of
  ≈ 0.60 R on their value's radial (for `.5` the digit sits on the radial and the
  point to its left). The `0` is half covered by the pointer at rest.

_Printed lettering_ (white bold sans, as printed):

| Item         | Position (x, y) in R and size                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VERTICAL`   | centre (+0.02, −0.29); width 0.62; cap height 0.09                                                                                                                                       |
| `SPEED`      | centre (+0.02, −0.18); width 0.40; cap height 0.09                                                                                                                                       |
| `1000 ft.`   | centre (+0.02, +0.18); width 0.29; cap height 0.05                                                                                                                                       |
| `per min.`   | centre (+0.02, +0.26); width 0.29; cap height 0.05; lower case                                                                                                                           |
| up arrow     | an L-shaped arrow just above the `0`: corner at (−0.66, −0.11), a vertical shaft up to an arrowhead at (−0.64, −0.25), a horizontal leg right to (−0.52, −0.11); stroke ≈ 0.02 R         |
| `up`         | lower case, centre (−0.45, −0.11), cap height 0.05, at the end of the leg                                                                                                                |
| down arrow   | the up arrow mirrored about the horizontal axis: corner (−0.66, +0.11), arrowhead pointing down at (−0.64, +0.25)                                                                        |
| down legend  | at about (−0.45, +0.11), mostly hidden under the resting pointer in every photo: not legible. The trainer prints a short lower-case down legend mirroring `up`, **assumed (unverified)** |
| maker's mark | none on this dial                                                                                                                                                                        |

_Pointer._ One broad white paddle from about 0.11 R to its tip at about 0.85 R,
≈ 0.09 R wide out to about 0.64 R, then tapering to a point over the last ≈ 0.2 R;
the inner end is cut square. No hub cap is visible: the centre is black. In the
frontal photos it rests about 8 to 10° below the 0 bar (a small zero offset of the
real instrument); the trainer rests it on 0.

- **Colours.** Dial and bezel matte black (hint #111418); markings and pointer white
  (hint #eeeeea).
- **Stickers.** None.
- **Not visible.** A hub or stop pin, the legend under the resting pointer, and the
  outer part of the scale across the top (hidden by the bezel lip).

#### 3.10.4 Slip indicator (ball)

**Face layout (photos).** Unit box, frame and conventions as for §3.10.3. Measured
in four photos with perspective removed. Positions ±0.03 R, sizes ±15 % unless
marked **low confidence**.

- **Size.** Case diameter **0.71 A**, the VSI's size (§3.9.2: 0.69 to 0.71 in four
  photos once the perspective term is removed, 1 to 2 percent below the VSI). The
  case is round; an earlier reading of it as slightly wider than tall came from a
  correction without the perspective term.
- **Case and mount.** A plain round matte black face with a thin rim (about 0.05 R,
  barely distinct). Four black dome-headed cross-head screws on a square at
  (±0.83, ±0.84), head diameter ≈ 0.26 R.
- **Dial type.** A ball inclinometer only: **no scale, no ticks, no numerals, no
  pointer and no coloured marks.**
- **Tube.** One horizontal glass tube, nearly straight: its middle sits about 0.03 R
  lower than its ends, a very shallow upward curve (**low confidence**; it reads as
  straight). It runs from x −0.72 to +0.72 (length ≈ 1.45 R), its centre line at
  y +0.06, outer height ≈ 0.25 R, with flat square-cut ends and slightly rounded
  corners. Colour cream / ivory (hint #e4dac2). A faint lengthwise highlight along
  its lower part is glare (optional).
- **Ball.** One black ball, diameter ≈ 0.26 R (it fills the tube's height), at the
  tube's centre (x 0.00 ±0.04) in every photo.
- **Reference lines.** Two thin dark lines across the tube (≈ 0.015 R wide, the
  tube's full height), about one ball diameter apart at x ≈ ±0.14, framing the
  centred ball. The left line is clear in every photo; the right one merges with the
  ball's edge (**low confidence** on the right line). A small curved light highlight
  on the glass sits just inside the left line (optional). The ball's travel is the
  tube's length less one ball: centre within about ±0.58 R.
- **Centring.** The tube, the maker's mark and the legend are centred on the
  vertical axis (±0.05 R).

_Printed lettering:_

| Item             | Position (x, y) in R and size                                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maker's mark     | above the tube: a symbol, footprint x −0.25 to +0.25, y −0.53 to −0.26, with a one-line wordmark under it, footprint x −0.29 to +0.29, y −0.23 to −0.15. **Not reproduced**: the area stays blank or carries a generic mark (#721) |
| `SLIP INDICATOR` | one line under the tube, white bold uppercase sans, centre (0.00, +0.53), width ≈ 0.97, cap height ≈ 0.11                                                                                                                          |

- **Colours.** Face matte black with a faint blue cast (hint #121820); tube cream;
  ball black; reference lines dark grey to black; lettering white.
- **Stickers.** None.
- **Not visible.** Any marks on the tube other than the two lines, and the
  ball's behaviour (the aircraft was parked level).

#### 3.10.5 Tachometer

**Face layout (photos).** Unit box, frame and conventions as for §3.10.3. Measured
in three frontal photos, with the tick angles found by sampling the scale ring after
removing perspective. Angles ±4°, positions ±0.03 R, sizes ±15 % unless marked
**low confidence**.

- **Size.** Case diameter **0.72 A** (§3.9.2; across plates, **low confidence**,
  ±0.04; raw photo ratios read 0.68 to 0.70). The largest gauge on the upper-right
  field.
- **Case and mount.** A thin matte black bezel ring from 0.92 R to 1.00 R around a
  black dial (the dial edge at ≈ 0.91 R). Four black dome-headed cross-head screws on
  a square at (±0.84, ±0.84), head diameter ≈ 0.24 R.
- **Dial type.** Black dial, white markings, one pointer. **0 at −142° (about
  7:15)**, sweep **clockwise** over the top to **70 at +145° (about 4:50)**: about
  285°. The scale is symmetric about 12 o'clock, where **3,500 rpm** sits (±3°). The
  gap at the bottom, from +145° through 180° to −142°, carries no scale.
- **Units and multiplier.** `RPM` over `x100` (lower-case x); numerals in hundreds
  of rpm.

_Scale._ Close to linear: angle ≈ −142° + 4.06° × (rpm / 100), which stays within
±4° of every measured mark (the 1,000 to 2,000 step measures a little short, ≈ 36°,
and 2,000 to 3,000 a little long, ≈ 44°, in every photo; real or residual
perspective, not settled).

| Numeral printed | rpm   | Measured angle                    | Linear model |
| --------------- | ----- | --------------------------------- | ------------ |
| `0`             | 0     | −141° (under the resting pointer) | −142°        |
| `10`            | 1,000 | −99°                              | −101°        |
| `20`            | 2,000 | −63°                              | −61°         |
| `30`            | 3,000 | −19°                              | −20°         |
| `40`            | 4,000 | +19°                              | +20°         |
| `50`            | 5,000 | +62°                              | +61°         |
| `60`            | 6,000 | +105°                             | +102°        |
| `70`            | 7,000 | +145°                             | +142°        |

- **Ticks.** White, radial, **every 200 rpm** (≈ 8°; counted: four minor ticks
  between each pair of numerals). Minor ticks from 0.76 R to 0.89 R, about 0.02 R
  thick; major ticks at each numeral from 0.70 R to 0.89 R, about 0.035 R thick.
  **From 6,000 to 7,000 every tick is long and thick** like a major tick.
- **Numerals.** Upright white bold sans, cap height ≈ 0.12 R, centred on a ring of
  ≈ 0.59 R, each within 5° of its major tick's radial. The `0` is half covered by the
  pointer at rest.

_Coloured arcs_ (a band from 0.76 R to 0.88 R, under the ticks; colours are muted by
glare in every photo, positions are reliable):

| Arc           | From → to (rpm)          | Measured angles                                   | Colour (hint)         |
| ------------- | ------------------------ | ------------------------------------------------- | --------------------- |
| red (low)     | 0 → ≈ 1,400 (±100)       | −141° → −84°                                      | brick red (#a8383c)   |
| yellow (low)  | ≈ 1,400 → ≈ 1,800 (±100) | −84° → −70°                                       | pale yellow (#d8c46c) |
| green         | ≈ 1,800 → ≈ 5,500        | −70° → +84°                                       | mid green (#3a8a5a)   |
| yellow (high) | ≈ 5,500 → ≈ 5,800        | +84° → +95°                                       | pale yellow (#d8c46c) |
| red line      | ≈ 5,800                  | +96°, radial from 0.68 R to 0.87 R, ≈ 0.03 R wide | dark red (#8c2a2e)    |

Nothing coloured from 5,800 to 7,000. The low red arc starts right at 0, next to the
resting pointer (#670). The green's hue shows clearly from about 4,000 rpm up; from
1,800 to about 4,000 glare washes it in all three frontal photos, where the band
still reads as a lighter, faintly greenish ring with no break. It is drawn
continuous (medium confidence; §9 question 55).

_Printed lettering:_

| Item                   | Position (x, y) in R and size                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TACH`                 | centre (0.00, −0.28); width 0.39; cap height 0.10. Its last letter is partly worn in the photos (cosmetic, not reproduced)                                                                |
| `RPM`                  | centre (+0.02, +0.30); cap height 0.09; just below and right of the hub; the resting pointer passes over the corner of its first letter                                                   |
| `x100`                 | centre (0.00, +0.42); cap height 0.08                                                                                                                                                     |
| country-of-origin line | a small line of text curving along the bottom gap, centred at 6 o'clock at ≈ 0.83 R, spanning x −0.32 to +0.32, cap height ≈ 0.06. A maker line: **not reproduced**, the area stays blank |
| small dark dot         | ≈ 0.06 R across at about (−0.14, +0.60) in the two frontal photos; perhaps a plugged hole (optional detail, **low confidence**)                                                           |

_Pointer._ One white tapered wedge from 0.18 R to 0.88 R: ≈ 0.08 R wide at its inner
end, narrowing to ≈ 0.02 R at a slightly rounded tip. The inner end is cut square; no
hub cap is visible (the centre is black). At rest (engine off) it lies on the 0
mark at ≈ −141°.

- **Colours.** Dial and bezel black (glare makes the dial read dark grey in two
  photos; hint #141414); markings and pointer white; arcs as in the table.
- **Stickers.** None.
- **Not visible.** A hub, a stop pin, and the arc colour between about 1,800 and
  4,000 rpm (glare).

#### 3.10.6 Cylinder head temperature

**Face layout (photos).** Unit box: the bounding square of the round case (diameter
E, §3.10.11). Source: the owner's photos (§3.7), measured in the two sharpest
front views and checked in two more. The case spans only about 85 pixels in the
best photo, hence the ±6° angle tolerance. In every photo the engine is stopped
and the master is on (the avionics are lit), so the needle shows a live reading.

- **Case and mounting.** Round. A thin black ring, about 0.05 to 0.07 E wide, merges
  into the black face (the face's edge, a faint line, at about 0.87 R, low
  confidence); no chrome, no glare to draw, no square flange. R is the case's outer
  edge, where the aluminium starts: every tick and arc ends at about 0.84 R, well
  inside it. Four black screws stand on the bare panel aluminium at the case's
  diagonal corners (§3.10.11).
- **Dial.** A single-pointer round dial: matte black face (navy in the photos from
  their cool cast; hint #141a22) with off-white markings (hint #e6e6de). No subdial,
  window or knob.
- **Scale.** Clockwise from 40 at the lower left to 150 at the lower right, about
  262° in all; the open gap (about 98°) is centred on 6 o'clock. Linear from 40 to
  120 at about 2.7° per °C; the last step, 120 to 150, is compressed to about 1.65°
  per °C, so 120 and 150 stand visibly closer than any other pair. No ticks below 40
  or above 150.

_Numerals_ (upright plain sans, cap height about 0.13 R, each inside its major
tick; `120` and above all `150` sit deeper than the rest, and `150` stands a few
degrees clockwise of its bar rather than inside it):

| Numeral | Angle (model) | Measured | Radius |
| ------- | ------------- | -------- | ------ |
| `40`    | −130°         | −129°    | 0.49 R |
| `60`    | −76°          | −77°     | 0.58 R |
| `80`    | −22°          | −22°     | 0.65 R |
| `100`   | +32°          | +30°     | 0.53 R |
| `120`   | +86°          | +82°     | 0.45 R |
| `150`   | +136°         | +139°    | 0.41 R |

Model: angle = −130° + 2.7° × (T − 40) up to 120 °C; +86° + 1.65° × (T − 120) above
(the 125 to 150 bars measure +94°, +103°, +111°, +119°, +127°, +135°).

_Ticks_: one every 5 °C, outer ends on a circle at about 0.84 R. From 40 to 120 the
majors (every 10 °C) are longest at the ends of that range and shortest in its
middle: 40 about 0.19 R, 50 about 0.13 R, 60 about 0.09 R, 70 and 80 about 0.06 R
(the 80 one reads almost as a dot), 90 about 0.12 R, 100 about 0.16 R. Minors are
about 0.05 R where visible; those at 65, 75 and 85 are not resolved (low
confidence). From 120 to 150 the six ticks (125 to 150) are **heavy bars**, about
twice a minor's width and alternating long and short: 130, 140 and 150 about 0.25 R
(0.58 R to 0.83 R), 125, 135 and 145 about 0.17 R (0.65 R to 0.82 R). Fine-tick
detail is optional.

_Arcs_ (inside the ring; ticks inside an arc take its tint):

| Arc                                                  | From–to (°C) | From–to (angle) | Radial band                                |
| ---------------------------------------------------- | ------------ | --------------- | ------------------------------------------ |
| green: dark band, lighter green ticks (hint #2f6a4a) | 90 to 110    | +5° to +59°     | 0.73 R to 0.85 R                           |
| yellow-amber block (hint #d8a830)                    | 110 to 119   | +59° to +83°    | 0.70 R to 0.85 R, visibly wider than green |
| red radial line (dark red, hint #9a2a2a)             | 120          | +86°            | 0.65 R to 0.85 R, across the tick band     |

Arc ends ±4 °C. No arc below 90, and none from 120 to 150 (the heavy bars are white).

_Printed words_:

| Item  | Position and size                                                                               |
| ----- | ----------------------------------------------------------------------------------------------- |
| `°C`  | Centred on the vertical axis at (0.50, 0.37), cap height about 0.13 R                           |
| `CHT` | Centred at (0.50, 0.80), letters widely spaced, word about 0.50 R wide, cap height about 0.14 R |

The words are drawn centred on the vertical axis; in both sharp photos their
measured centres sit 0.03 to 0.04 left of the case centre (on every engine gauge),
within tolerance and possibly residual perspective (low confidence).

No maker's line, logo or sticker on this face.

_Pointer_: a white blade (hint #f2f0e6). Its square-cut inner end, about 0.14 R
wide, lies about 0.15 R from the pivot (±0.03; measured 0.12 to 0.19 R across the
four gauges). Its sides run nearly parallel out to about 0.45 R, then close to a
point at about 0.69 R (low confidence on where the taper starts: the pointer is
only about 6 pixels wide in the photos). The tip reaches past the numerals but stops
short of the minor ticks. No tail and no visible hub cap (the pivot is black on
black).

_Reading in the photos_: about 46 °C (needle at about −112°), engine stopped but
still warm. Illustrative only.

_Stop and rest position_: not visible in photos (the needle shows a live reading
above 40); §9 question 57.

**§4.3.** The CHT row now follows the dial: green 90–110, yellow-amber 110–120, the
red line at 120, nothing below 90.

#### 3.10.7 Oil temperature

**Face layout (photos).** The same dial as the CHT (§3.10.6): same case and screws,
same scale geometry and model, same numerals (`40` `60` `80` `100` `120` `150`,
measured −124°, −74°, −21°, +27°, +76°, +137°, with `120` and `150` deeper, at
about 0.44 R and 0.38 R), same ticks with the alternating heavy bars from 120 to
150, and the same white pointer. Measured against the CHT's, its 40 tick sits about
4° clockwise (−124°), its 120 tick about 6° anticlockwise (+80°, white inside the
yellow) and its 150 bar 2° anticlockwise (+133°); these are at the edge of the ±6°,
so draw both gauges from the one CHT model (low confidence whether the difference is
real). Only the words and the arcs differ. Source and tolerances as for the CHT.

_Printed words_:

| Item   | Position and size                                                   |
| ------ | ------------------------------------------------------------------- |
| `°C`   | Centred at (0.50, 0.35), cap height about 0.13 R                    |
| `OIL`  | Centred at (0.50, 0.75), about 0.29 R wide, cap height about 0.14 R |
| `TEMP` | Centred at (0.50, 0.84), about 0.50 R wide, same cap height         |

No maker's line, logo or sticker on this face. A faint small pale mark near
(0.46, 0.60), below and left of the pivot, shows on this face only; it is not
resolved (a glint or a tiny print) and stays blank (low confidence).

_Arcs_ (inside the ring, as on the CHT):

| Arc                                                  | From–to (°C) | From–to (angle) | Radial band                                    |
| ---------------------------------------------------- | ------------ | --------------- | ---------------------------------------------- |
| green: dark band, lighter green ticks (hint #2f6a4a) | 90 to 110    | +5° to +59°     | 0.72 R to 0.85 R                               |
| yellow (olive-yellow in the photos, hint #c0b040)    | 110 to 127   | +59° to +97°    | 0.68 R to 0.85 R; runs on past the 120 tick    |
| red (red-brown, hint #9a3a2a), a short segment       | 127 to 130   | +97° to +101°   | 0.68 R to 0.85 R; reads as the red mark at 130 |

Arc ends ±4 °C. **No arc below 90** (no low-end yellow); the heavy bars beyond the
red are white.

_Reading in the photos_: about 47 °C (needle at about −110°). Illustrative only.

_Stop and rest position_: not visible in photos; §9 question 57.

**§4.3.** The oil temperature row drops the low yellow arc 50–90, which is not on the
dial. Green 90–110, yellow 110–130 and the red line 130 match within the photo
precision (the dial's yellow ends about 127 at a short red segment ending at 130).

#### 3.10.8 Voltmeter

**Face layout (photos).** The CHT's case, screws, face colours and white blade
pointer (§3.10.6); its own scale and words. Source and tolerances as for the CHT,
angles ±8° here.

- **Scale.** 9 to 17 V clockwise, about 31° per volt, symmetric about 12 o'clock
  with **13 at the top**; about 254° in all, the gap centred on 6 o'clock. No ticks
  below 9 or above 17.

_Numerals_ (upright plain sans, cap height about 0.14 R):

| Numeral | Angle (model) | Measured | Radius |
| ------- | ------------- | -------- | ------ |
| `9`     | −124°         | −118°    | 0.53 R |
| `10`    | −93°          | −88°     | 0.59 R |
| `11`    | −62°          | −58°     | 0.65 R |
| `12`    | −31°          | −30°     | 0.69 R |
| `13`    | 0°            | −2°      | 0.70 R |
| `14`    | +31°          | +26°     | 0.63 R |
| `15`    | +62°          | +55°     | 0.55 R |
| `16`    | +93°          | +92°     | 0.48 R |
| `17`    | +124°         | +130°    | 0.43 R |

Model: angle = 31° × (V − 13). It stays within ±7° of every measured major tick (9
at −122°, 10 at −87°, 11 at −57°, 12 at −32°, 14 at +28°, 16 at +94°, 17 at
+131°); the numerals stray up to 7° from it (`15` sits anticlockwise of its tick).

_Ticks_: outer ends at about 0.84 R. Majors at each volt, minors every 0.25 V
(three between the majors at 9–10, 14–15 and 15–16; count elsewhere not resolved).
Short dashes (about 0.06 R) from 11 to 15, longer (about 0.15 R) at 9 and 10, and
from just past 15 to 17 **heavy bars** every 0.25 V, the 16 and 17 bars long
(about 0.25 R, inner ends near 0.58 R) and the others about 0.15 R, as on the CHT's
top end.

_Arcs_: **none visible**. The sharpest zoom shows only short white ticks between 13
and 15; whether a small coloured band sits near 13 to 14 is not resolvable
(§9 question 58). No red or yellow at either end.

_Printed words_:

| Item        | Position and size                                                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOLTS`     | Centred at about (0.48, 0.34), about 0.5 R wide, cap height about 0.12 R. "VO" is legible and a third letter shows faintly at the needle's edge, consistent with "VOL"; the rest is under the needle in every photo, so the word is **low confidence** (§9 question 58) |
| `VOLTMETER` | One straight line along the bottom, centred at (0.50, 0.80), about 1.08 R wide (broad letters), cap height about 0.14 R                                                                                                                                                 |

No maker's line, logo or sticker on this face.

_Reading in the photos_: about 13.5 V (needle at about +17°), master on and engine
stopped, so a battery voltage. Illustrative only.

_Stop and rest position_: not visible in photos; §9 question 57.

**§4.3.** The table has no voltmeter row. The dial runs 9–17 V with no markings.

#### 3.10.9 Oil pressure

**Face layout (photos).** The CHT's case, screws, face colours and white blade
pointer (§3.10.6); its own scale, arcs and words. Source and tolerances as for the
CHT, angles ±8° here.

- **Scale.** 0 to 10 bar clockwise, about 258° in all, the gap centred on 6
  o'clock, in **two segments**: about 24° per bar from 0 to 7 and about 30° per bar
  from 7 to 10, so the heavy-bar section is visibly more spread out. **5 sits just
  left of the top** (12 o'clock is about 5.2 bar). No ticks below 0 or above 10.

_Numerals_ (upright plain sans, cap height about 0.13 R):

| Numeral | Angle (model) | Measured                                 | Radius |
| ------- | ------------- | ---------------------------------------- | ------ |
| `0`     | −124°         | its tick −125°; numeral under the needle | 0.52 R |
| `1`     | −100°         | −98°                                     | 0.61 R |
| `2`     | −76°          | −74°                                     | 0.66 R |
| `3`     | −52°          | −54°                                     | 0.70 R |
| `4`     | −28°          | −32°                                     | 0.71 R |
| `5`     | −4°           | −8°                                      | 0.70 R |
| `6`     | +20°          | +16°                                     | 0.62 R |
| `7`     | +44°          | +40°                                     | 0.59 R |
| `8`     | +74°          | +70°                                     | 0.54 R |
| `9`     | +104°         | +102°                                    | 0.53 R |
| `10`    | +134°         | +134°                                    | 0.46 R |

Model: angle = −124° + 24° × p up to 7 bar; +44° + 30° × (p − 7) above. The
measured major ticks (−125°, −100°, −76°, −51°, −31°, −8°, +17°, +44°, +74°, +103°,
+134°) stay within ±4° of it, and the numerals within 4° of their ticks. (A single
26° per bar rule misses 6 and 7 by 9°.)

_Ticks_: a major at each bar, a minor at each half bar (low confidence below 7),
outer ends at about 0.84 R. From 0 to 7 they are short dots and dashes (about 0.05
to 0.10 R; 3 and 4 nearly dots). From 7 to 10 they are **heavy bars**: long ones at
8, 9 and 10 (about 0.25 R, inner ends near 0.55 R) and shorter ones at 7.5, 8.5 and
9.5 (about 0.15 R).

_Arcs_ (positions reliable; colours washed out by glare, **low confidence**, §9 question 59):

| Arc                                                | From–to (bar) | From–to (angle, model) | Shape                                                                                        |
| -------------------------------------------------- | ------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| thin pale arc, white to pale yellow (hint #d8d8c0) | 1.0 to 2.0    | −100° to −76°          | about 0.04 R wide at about 0.83 R, with a short inward end cap at each end (a bracket shape) |
| thin pale arc, grey-green (hint #b8c0b0)           | 5.0 to 6.0    | −4° to +20°            | about 0.04 R wide at about 0.84 R, along the tick ends                                       |
| tan-orange arc (hint #c89a6a)                      | 6.0 to 7.0    | +20° to +44°           | about 0.09 R wide (0.76 R to 0.85 R), visibly wider than the 5–6 part                        |
| red radial line (pink-red, hint #b04848)           | 7             | +44°                   | the 7 major tick itself drawn red, from about 0.66 R to 0.84 R                               |

Arc ends ±0.2 bar. **No arc between 2 and 5**: the face is plain black there, while
the CHT's dark green arc shows in the same photos. **No red radial at 5**, and nothing
below 1.

_Printed words_:

| Item         | Position and size                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `BAR`        | Centred at (0.48, 0.36), about 0.34 R wide, cap height about 0.12 R                                     |
| `OIL`        | Centred at (0.50, 0.75), cap height about 0.14 R                                                        |
| `PRESS`      | Centred at (0.49, 0.84), about 0.63 R wide, same cap height                                             |
| Maker's mark | A tiny mark under `PRESS`, footprint about (0.47–0.51, 0.89–0.93). **Not reproduced**: area stays blank |

_Reading in the photos_: 0 bar. The needle lies on the 0 tick (about −125°) with the
engine stopped and the master on, so at zero pressure the needle sits on the 0 mark,
not below it.

_Stop and rest position_: with power on, on the 0 mark (above). With the master off:
not visible in photos (§9 question 57).

**§4.3.** The oil pressure row now follows the dial: a pale arc 1–2, nothing from 2
to 5, a pale arc 5–6, a wider tan-orange arc 6–7 and the red radial at **7**, with
no red mark at 5. The dial agrees with §4.2 (normal 2–5 bar, minimum 0.8, up to 7
bar briefly when cold); only the old red line at 5 conflicted with it.

#### 3.10.10 Hour meter

**Face layout (photos).** Unit box: the black rectangular face, width W and height
H; origin at its top left, x right and y down, as fractions of W and H. Perspective
removed. Positions ±0.03, sizes ±15 % unless marked **low confidence**. Inert art:
any running value shown is illustrative, and D-MPGO's own reading is not recorded
(§3.7).

- **Size.** W ≈ **0.45 A**, H ≈ **0.28 A** (aspect W:H ≈ 1.6, readings 1.55 to
  1.67; §3.9.2).
- **Case and mount.** One black rounded rectangle, corner radius ≈ 0.04 W, face and
  bezel reading as one piece: there is no wider body behind it. A black dome-headed
  screw on each side at mid-height, centred at about (−0.11, 0.50) and (1.11, 0.50),
  diameter ≈ 0.19 to 0.20 W (≈ 0.085 A, the same screw as the gauges), just touching
  the face's ends. Mounted level with the panel rows.
- **Dial type.** A drum counter: no pointer, no scale, no arcs.

_Layout:_

| Item                                 | Position and size                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| maker lines                          | two lines of white text in the upper left: a wordmark, footprint x 0.20 to 0.62, y 0.13 to 0.27, and a shorter word under it, footprint x 0.20 to 0.60, y 0.30 to 0.40. **Not reproduced**: the area stays blank |
| running indicator                    | a small white-outlined glyph like an hourglass, centre (0.77, 0.31), ≈ 0.08 W by 0.16 H (**low confidence** on its shape)                                                                                        |
| whole-hour digits                    | four white digits on black in one row, centres x 0.11, 0.22, 0.33, 0.44 (pitch 0.11 W), y 0.53; digit height ≈ 0.15 H, width ≈ 0.05 W; no frame round each digit                                                 |
| fifth window (read as tenths)        | centre (0.54, 0.53), ≈ 0.08 W by 0.19 H: a light (white) surround with a dark digit inside, so it stands out from the four white-on-black digits (**low confidence** that it is the tenths drum)                 |
| small mark right of the fifth window | x 0.62 to 0.78, y 0.48 to 0.62: a few small strokes, not legible (it reads like a fraction label for the tenths, or a drum caught mid-turn)                                                                      |
| `HOURS`                              | white bold uppercase sans, centre (0.46, 0.74), width 0.32 W, cap height 0.09 H                                                                                                                                  |

The text block (maker lines, digits, `HOURS`) is centred a little left of the face's
centre (x ≈ 0.43); the running indicator takes the upper right.

- **Colours.** Face black (hint #10161c); digits and lettering white; the fifth
  window's surround white.
- **Stickers.** None.
- **Not visible.** Whether the digits are separate drums with window frames (they
  read as plain digits), what the small mark right of the fifth window says.
- **Position on the panel.** §3.9.2: right of the voltmeter / oil-pressure column,
  its centre 0.60 A (1.5 E) right of that column's axis, at the height between the
  two rows of small gauges (about 0.1 of a row pitch below the block's mid-height).

#### 3.10.11 Panel-wide gauge look

**Face layout (photos).** What all instruments share, their sizes and their grouping.
Sizes are outer-ring diameters in units of A, the ASI's; they repeat §3.9.2's size
column, which governs (§2a item 10). Absolute panel positions belong to §3.9.2
(#716); this block gives only relative geometry. Source: the owner's photos (§3.7),
four panel views.

- **Bezels.** Every round instrument has a thin black ring, 0.03 to 0.07 of its own
  diameter, around a matte black face of the same black, separated only by a faint
  edge. There is no chrome, no thick bezel and no strong glass glare to draw.
- **Mounts.** No square flange or plate anywhere. Each round case sits directly on
  the field's brushed aluminium, and its screws stand on the bare aluminium at the
  four corners of a square pattern. The hour meter is the only rectangular case.
- **Screws.** Black pan heads. The cross-head (Phillips) recess is clear on the
  upper-left field's instruments; on the upper-right field it is only faintly
  visible (**low confidence**; drawing cross-heads there too matches the photos).
  The heads are about the same physical size everywhere (slightly smaller on the
  engine gauges), so they look much larger beside the small gauges. On every round
  instrument each head just clears the ring.

| Instrument                          | Screws                                                                                                                                                               | Screw centres (own box)                            | Head Ø (own diameter)          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------ |
| ASI                                 | 4                                                                                                                                                                    | 0.115 / 0.885 (§3.10.0)                            | 0.10                           |
| Altimeter                           | 3: upper left, upper right, lower right; the knob boss takes the lower-left corner (§3.10.2)                                                                         | 0.115 / 0.885 (§3.10.0)                            | 0.10                           |
| VSI                                 | 3: upper left, upper right, lower right; at the lower left a small dark tab about 0.12 of its diameter long, pointing down-left, centre about (0.08, 0.93) (§3.10.3) | 0.08 / 0.92                                        | 0.13                           |
| Slip indicator                      | 4                                                                                                                                                                    | 0.085 / 0.915                                      | 0.13                           |
| Tachometer                          | 4                                                                                                                                                                    | 0.08 / 0.92                                        | 0.12                           |
| CHT, voltmeter, oil temp, oil press | 4 each                                                                                                                                                               | 0.065 / 0.935                                      | 0.19                           |
| Hour meter                          | 2, one beyond each short end at mid-height, just touching it                                                                                                         | (−0.11, 0.50), (1.11, 0.50) of the face (§3.10.10) | 0.19 to 0.20 of the face width |

The hour meter is one black rectangle, 0.45 A wide (§3.10.10); there is no wider body
behind the face.

- **Relative sizes** (as §3.9.2):

| Instrument                              | Size                                                     | Basis                                              |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| ASI                                     | 1.00 A                                                   | reference                                          |
| Altimeter                               | 1.00 A, case only; the knob sticks out at the lower left | same plate, four photos                            |
| Slip indicator                          | 0.71 A (measured 0.69 to 0.71), round                    | same plate, four photos                            |
| VSI                                     | 0.71 A (measured 0.70 to 0.73)                           | same plate, four photos                            |
| Tachometer (T)                          | 0.72 A (±0.04), **low confidence**                       | across plates (see below)                          |
| CHT, voltmeter, oil temp, oil press (E) | 0.40 A; 0.55 T (0.545 to 0.565), all four equal (±3 %)   | E against T on the same plate, four photos; then T |
| Hour meter                              | 0.45 A by 0.28 A (0.63 T by 0.39 T)                      | same plate as the tach                             |
| Generator lamp (not a gauge)            | lens 0.27 A (0.38 T)                                     | same plate as the tach                             |

Basis: every same-plate ratio comes from a correction with a perspective term that
makes all of a plate's round cases round at once (§3.9.0). Corrections without that
term, used for the first drafts of these blocks, shrink the cases low on a plate:
they gave the VSI and the slip indicator 0.64 A, the altimeter 0.96 A, the engine
gauges 0.53 T and the left plate's row pitch 1.06 A, all superseded. The
tachometer's link to the airspeed indicator crosses from one plate to another: the
first survey's unfolding gives 0.71 A, the plain photo ratios 0.68 to 0.70, and the
corrected centred view about 0.72, so 0.72 A stays **low confidence** until §9
question 60 settles the diameters. #721's audit figures (VSI and slip 0.67, tach
0.72, engine gauges 0.48) are superseded where they differ, notably for the engine
gauges.

The trainer before M19 (`views.ts` panel indicators, as fractions of its airspeed
size) drew the altimeter 0.89, the VSI 0.89, the tach 0.95 and the engine gauges
0.68. The photos give 1.00, 0.71, 0.72 and 0.40.

- **Grouping.**
  - Upper-left field, a 2×2: ASI top left, altimeter top right, slip indicator under
    the ASI, VSI under the altimeter. Column pitch (ASI to altimeter) 1.30 A, the
    same in both rows; row pitch 1.12 A (1.09 to 1.14). The columns are straight:
    the slip indicator sits about 0.01 A right of the ASI's axis and the VSI about
    0.02 A right of the altimeter's. The raw photos show the lower pair 0.15 to 0.2 A
    to the right and the lower row's pitch smaller; that is shear and perspective.
  - Upper-right field: the tachometer at the top left. Below it the 2×2 engine block,
    CHT and voltmeter on top, oil temp and oil press below; its left column (CHT over
    oil temp) is under the tach, the tach centre about 0.05 T right of that column's
    axis. Block pitch 0.74 T (1.35 E, 0.53 A) both ways, leaving about 0.35 E between
    neighbouring cases. The top row's centres are about 0.99 T (0.71 A) below the
    tach centre.
  - The hour meter stands right of the block: its centre 0.60 A (1.5 E) right of the
    voltmeter column and at the block's mid-height (about 0.1 of a row pitch lower).
    The Generator lamp stands at the plate's horizontal middle (§3.9.4): right of the
    tachometer and level with its top half, about 0.24 A left of the hour meter's
    vertical axis; not at the plate's top right.

## 4. Limits and values used by the trainer

Conservative choices per owner decisions 3 and 4, and owner rulings of §2a, are
in **bold**. Phase presets
feed `Environment` in knots and feet; the conversions are given so no implementer
converts. Altitudes are above the field; the trainer models no real aerodrome. One
exception: the altimeter adds the home aerodrome's elevation to the height above the
field (§3.10.2, §9 questions 46 and 48); presets and systems keep heights above the
field.

### 4.1 Speeds (km/h IAS, with knots)

| Speed                                     | km/h            | kt           |
| ----------------------------------------- | --------------- | ------------ |
| Stall, flaps 35° (VS0)                    | 65              | 35           |
| Stall, flaps 0° (VS1)                     | 75              | 40           |
| Stall, flaps −12°                         | 85              | 46           |
| Lift-off                                  | 75              | 40           |
| Best rate of climb, flaps 15° / 0° / −12° | 105 / 115 / 125 | 57 / 62 / 67 |
| Steepest climb, flaps 15° / 0°            | 100 / 105       | 54 / 57      |
| Approach and final                        | 100             | 54           |
| Before landing / go-around                | 110             | 59           |
| Best glide, flaps 0° (glide ratio 1:8.5)  | 125             | 67           |
| Emergency approach / corn field or forest | 100 / 90        | 54 / 49      |
| Manoeuvring VA                            | 194             | 105          |
| Rough air VRA                             | 245             | 132          |
| Max flap speed, 15°                       | 148             | 80           |
| Max flap speed, 30° and 35°               | 115             | 62           |
| Max flap speed, 0° (§8)                   | 184             | 99           |
| Max flap speed, −12° (placard, §3.7)      | 300             | 162          |
| **VNE (airspeed red line, §2a)**          | **300**         | **162**      |
| Max range cruise (4300 rpm)               | 180             | 97           |
| Level flight, flaps −12°, 5500 rpm (VH)   | 240             | 130          |

VNE 300 km/h follows D-MPGO's airspeed dial by owner ruling (§2a decision 3). It
is above the handbook's VNE for a BRS rescue system (276 km/h, §8), the system
the photos identify (§9, question 2); it is not the conservative choice.

Crosswind limit 30 km/h with flaps 0°, 20 km/h with 35°. Bank at most 60°; no
turns steeper than 30° below 100 km/h. Load factors +4/−2 g up to VA. Day VFR, no
icing, no aerobatics, no intentional spins.

### 4.2 Engine (Rotax 912, variant unknown)

| Limit                           | UL            | ULS      | Trainer value                       |
| ------------------------------- | ------------- | -------- | ----------------------------------- |
| Max take-off rpm (5 min)        | 5800          | 5800     | 5800 (red line)                     |
| Max continuous rpm              | 5500          | 5500     | 5500                                |
| Idle                            | ~1400         | ~1400    | 1400                                |
| CHT max (coolant, hottest head) | 150 °C        | 135 °C   | **120 °C**, the gauge red line (§8) |
| Oil temperature max             | 140 °C        | 130 °C   | **130 °C**                          |
| Oil temperature min, ideal      | 50, 90–110 °C | same     | min **51 °C** for take-off (§8)     |
| Oil pressure normal / min       | 2–5 / 0.8 bar | same     | same; up to 7 bar briefly when cold |
| Fuel grade                      | RON ≥ 90      | RON ≥ 95 | **RON ≥ 95**                        |

Starting (HB 4-6, 4-7): starter at most 10 s, then 2 min to cool. Throttle at idle
(at most about 10 % open). Choke fully on for a cold start, with the throttle
closed; close the choke slowly after 20–30 s. Oil pressure must rise within 10 s
or shut down. Raise rpm only with oil pressure above 2 bar. Warm up 2 min at about
2000 rpm, then 2500 rpm; ready at 50 °C oil.

Ignition check (HB 4-3): at 4000 rpm, each single circuit drops at most 300 rpm;
the two drops differ by at most 120 rpm. A windmilling engine relights from about
200 propeller rpm; below that, use the starter.

Propeller: ground-adjustable, set at the factory to about 5000 rpm static, 4800 in
the climb and 5500 in level flight at full throttle, so it cannot overspeed. No
propeller control in the cockpit (§9).

### 4.3 Gauge markings

| Gauge              | Scale used                               | Markings                                                                                                              |
| ------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Airspeed (km/h)    | 40–340                                   | white 72–115, green 94–245, yellow 245–300, red line **300**                                                          |
| Tachometer (rpm)   | 0–7000                                   | red 0–1400, yellow 1400–1800, green 1800–5500, yellow 5500–5800, red line 5800; drawn in #721 (§3.10.5)               |
| Oil pressure (bar) | 0–10                                     | pale arc 1–2, none 2–5, pale arc 5–6, tan-orange arc 6–7, red line **7** (§3.10.9)                                    |
| Oil temp (°C)      | 40–150                                   | green 90–110, yellow 110–130, red line **130** (§3.10.7)                                                              |
| CHT (°C)           | 40–150                                   | green 90–110, yellow 110–120, red line **120** (§3.10.6)                                                              |
| Vertical speed     | ±2000 ft/min                             | none                                                                                                                  |
| Altimeter (ft)     | 0–9 × 100 ft, three pointers, hPa window | none; reads field elevation + height above the field, corrected for the knob setting (§3.10.2, §9 questions 46 to 49) |
| Voltmeter (V)      | 9–17                                     | none (§3.10.8)                                                                                                        |

The handbook gives only the airspeed arcs and the red lines. The tachometer, oil
pressure, oil temperature and CHT rows follow the dials in the owner's photos
(§3.10.5 to §3.10.9), not copied markings.

**Trainer uses (2026-10-10, §2a decision 3):** the airspeed dial of the photos,
40 to 340 km/h with numbers every 20; the yellow arc from 245 to the red line at
300 km/h; VNE 300 km/h (162 kt). The green arc's upper end (245) matches the
photo; the white arc 72–115 and the green arc's lower end at 94 are confirmed by
the clearest photo (§3.10.1). The vertical speed indicator reads thousands of feet
per minute, 0 to 2 each way with half steps: the trainer scale is ±2000 ft/min with
ticks every 500. Systems may keep metres per second internally; the gauge shows
ft/min (1 m/s ≈ 197 ft/min).

Trainer deviation (agent decision, M17 T3, open for the owner): the drawn
airspeed dial prints numbers every 40 (40 to 320) with ticks every 20, because
fifteen three-digit numerals do not fit the ring at the lettering floor; numbers
every 20 need a larger gauge (M17 T4's layout) or an owner exemption. Open for
#720: §2a item 10 makes numerals a recognition fact, and the real dial numbers every
20; under §9 question 41 (a) the airspeed indicator shrinks to 193 units, which makes
numbers every 20 harder to fit.

### 4.4 Fuel, flaps, masses

- Two wing tanks, 65 l each. **Usable 124 l (62 per side)** (§8). The photos show
  62 l usable per side on the lower-column placard and 63 l on the wing-root
  placards (§3.7): the trainer uses the lower, 62 l per side, 124 l. Each tank has a
  baffle against starvation in a slip. A slip drains the tanks unevenly; raise the
  fuller wing.
- Feed: tank outlets, two gravity lines, Y-piece, fine filter, **single fuel valve
  (open/closed, no tank selector)**, fuel-flow sensor, firewall, gascolator (drain
  point), engine-driven pump, carburettors.
- Flaps: electric spindle motor and torsion shaft, symmetrical, mixed with the
  ailerons. The pilot preselects a setting; the readout blinks while the flaps
  move and shows steady when they arrive. An overload cut-out stops extension when
  too fast (reduce speed if the readout keeps blinking). Positions −12°, 0°, 15°,
  30°, 35°. Cruise −12°; take-off 15° (0° possible on pavement); landing 15–35°
  (35° only for very short strips); crosswind at most 15°. Never retract to a
  negative setting near the ground.
- Flap manual override, for a failed controller: turn the selector past the end
  detent; the motor drives while it stays there; return to the end detent to stop;
  left there, the motor runs to its end switch.
- Pitch trim: anti-tab on the stabilator, wheel on the console, neutral for
  take-off. Rudder and aileron tabs are ground-adjustable only. **Photo survey
  2026-10-10 (§3.7):** D-MPGO has an aileron-trim wheel and a rudder-trim wheel on
  the console between the seats. The trainer draws them as inert art (M17 T2) and
  models no rudder or aileron trim.
- Brakes: hydraulic, main wheels, one central non-locking lever. Parking brake as in §3.4;
  always use chocks too.
- MTOW 472.5 kg; baggage 25 kg per side.

### 4.5 Rescue system

Ballistic parachute behind the main bulkhead; the rocket exits through the top of
the fuselage. Maximum deployment speed is VNE. Deploy at any height, but height
helps. After deployment the aircraft cannot be controlled; it hangs nose down and
lands nose wheel first. Safety pin in on the ground, removed before take-off
(checklist states: armed, entsichert / secured, gesichert).

## 5. Phase presets

| Phase id          | On ground | kt  | ft above field | Engine and settings                                                                |
| ----------------- | --------- | --- | -------------- | ---------------------------------------------------------------------------------- |
| `parking`         | yes       | 0   | 0              | cold, everything off, fuel valve closed, key out, pin in, parking brake set        |
| `taxiOut`         | yes       | 0   | 0              | as `holding` but low power and parking brake released; oil temp a trainer estimate |
| `holding`         | yes       | 0   | 0              | warm (oil ≥ 51 °C), idle, GEN on, avionics on, flaps 0°, parking brake set         |
| `linedUp`         | yes       | 0   | 0              | as `holding` after N6: parking brake released, flaps 15°, pin out, transponder ACS |
| `departure`       | no        | 57  | 200            | full throttle, flaps 0° (N7 retracts above 50 m), climbing                         |
| `cruise`          | no        | 108 | 2500           | cruise power (about 4800 rpm), flaps −12°; speed is a trainer estimate             |
| `approach`        | no        | 59  | 500            | low power, flaps 15°, landing light on, descending                                 |
| `landing`         | no        | 54  | 3              | idle, flaps 30°, in the flare, landing light on                                    |
| `taxiIn`          | yes       | 0   | 0              | low power, flaps 30°, landing light on (N15 switches it off)                       |
| `parkingSecuring` | yes       | 0   | 0              | idle, avionics on, lights as after taxi, transponder standby                       |

From `linedUp` to `parkingSecuring` the rescue safety pin is out (§4.5): it is removed
at the holding point (N6) and put back at shutdown.

Owner ruling 2026-10-08: a CTSL registered as an ultralight in Germany flies day VFR
only. The cockpit light is off in every phase; Avionics Master and beacon are on
whenever the engine runs; the landing light is not needed in cruise.

Assumed (unverified), from general-aviation practice, for the running phases: the
intercom is on whenever the engine runs (N16 switches it off); the transponder is
off while taxiing out and at the holding point until N6 sets it, at ACS from line-up through `taxiIn`, and
at standby in `parkingSecuring`; the landing light is on from the approach until N15
switches it off; the vertical speed indicator shows about +3 m/s in `departure` and
about −2 m/s in `approach` (on the ft/min dial of §4.3, about +600 and −400 ft/min). The phase entry seeds device state
(#476; since M18 the transponder's MODE is a key, so no phase presets a device control):
the transponder is on and squawks 7000 (German VFR, SERA) from `linedUp` through
`parkingSecuring`, at ACS until `taxiIn` and at STBY in `parkingSecuring`; the GPS is on
at its map page and the FLARM display ready, each with its position fix, from `linedUp`
through `parkingSecuring`, so neither restarts its start-up page or self-test when the
parking-and-securing leg begins. All assumed (unverified). The COM radio is seeded switched on
(and powered) in every phase after engine start, from `taxiOut` through `parkingSecuring`, as the
pilot's `I/O` press in N3 leaves it (owner, §9 question 35); in `parking` it is dark. Before
`linedUp` the GPS and the FLARM start as power finds them: at the holding point the GPS is at its
database page and the FLARM runs its self-test and searches. The map page shows ground speed and track (taken from the
airspeed and heading) at once in the seeded phases; powered up at the holding point the
units search first. The fix and the ground speed and track it shows are assumed
(unverified).

The `cruise` speed is not a handbook figure: it lies between max range cruise
(180 km/h at 4300 rpm) and VH (240 km/h at 5500 rpm) of §4.1.

Circuit reference (HB 4-8, 4-9), for the outside views: crosswind turn at
200–250 m (660–820 ft), downwind at 300 m (980 ft) and 4300 rpm, abeam the
threshold reduce to 10–20 % power at 130 km/h with flaps 0°, base at 110 km/h with
flaps 15°, final turn at 150 m (490 ft) with bank under 30°, final at 100 km/h with
flaps 15–35°, flare at about 1 m.

## 6. Normal procedures (our wording)

Each line is "item: state". Labels in parentheses are the German control or
checklist names. Steps marked _(confirm)_ have no control in the trainer.

**N1 Pre-flight, cabin part (HB 4-1, 4-2).** Documents on board _(confirm)_;
controls connected and free _(confirm)_; wing bolts secured _(confirm)_; ignition
off; key out; electrical consumers off; Avionics Master off; BAT in; flaps run
out and back to check them; BAT out; fuel valve (Brandhahn) open; doors and
glazing checked _(confirm)_. Walk-around zones as confirm items, one each: left
fuselage and tail; right fuselage; right wing incl. fuel quantity (sight tube or
dipstick) and cap; nose incl. fuel drain (no water), oil level (turn the prop by
hand until the oil gurgles, then read the dipstick), coolant level; left wing
incl. fuel quantity and cap.

**N2 Passenger briefing (HB 4-4 to 4-6).** Belts, door latch, rescue handle,
extinguisher, ELT remote switch. Folded into N6.

**N3 Engine start (HB 4-3, 4-6).** Pre-flight done _(confirm)_; parking brake set;
carb heat off; all breakers in; Avionics Master off; BAT in; Beacon on; fuel valve
open; key in; choke as needed (cold: on); throttle idle; propeller area
clear _(confirm)_; key to START until the engine runs (at most 10 s); choke off
after 20–30 s; oil pressure rising within 10 s; GEN in; Avionics Master on; COM radio on
_(action: press the ATR833's I/O, then a check that it is on; AUTO ON is off, §9 question 35)_;
intercom on (trainer addition, assumed, §9 question 32); flaps to the taxi setting (0°).
Before the first start of the day turn the prop by hand; if the aircraft rolls
during start, ignition off.

**N4 Warm-up (HB 4-6, 4-7; no checklist in the handbook).** About 2000 rpm for
2 min, then 2500 rpm; raise rpm only above 2 bar oil pressure; ready at 50 °C oil.

**N5 Taxi (HB 4-3).** Brakes checked; nose-wheel steering checked (both confirm).
The trainer runs it as its own procedure from `taxiOut` to `holding`, so the checks happen
with the taxiway outside view; it opens with the parking brake released (trainer addition,
assumed: N3 leaves the brake set and `taxiOut` has it released).

**N6 Before take-off and run-up (Vor dem Start, HB 4-3, 4-4).** Parking brake set;
belts fastened; doors closed; controls free; altimeter to QNH _(confirm)_;
transponder on, standby _(action: press the TRT800H's I/O, then a check that it is on
and at STBY)_; GPS: databases accepted, then its map page (the start-up step is owner-confirmed,
§9 question 38; only its place in N6 is assumed, §9 question 32; a pilot who accepted earlier
ticks the acceptance, #692); choke
off; carb heat off; throttle to 4000 rpm; engine gauges in the green; ignition left:
drop at most 300 rpm; both; right: drop at most 300 rpm, difference at most 120 rpm;
both; oil temperature at least 51 °C; generator lamp out; throttle idle; flaps 15°; trim
neutral; radio set _(confirm)_; GPS position fix _(check, same assumption)_; rescue
system armed, pin removed (Rettungsgerät entsichert); ELT armed (Notsender); passenger briefed _(confirm)_;
approach and departure clear _(confirm)_; parking brake released.

**N7 Normal take-off (HB 4-3, 4-10, 4-11).** Flaps 15° (0° on pavement); carb heat
off; throttle full; rpm 4800–5000 (at least 4600); lift the nose wheel, lift off at
about 75 km/h; climb at 105 km/h with 15°; above 50 m (160 ft) flaps to 0° at
105 km/h, then 115 km/h.

**N8 Short take-off (HB 4-3).** Flaps 15°; parking brake set; choke off; carb heat
off; throttle full; brake released; rotate at 65 km/h; accelerate to 105 km/h;
steepest climb at **105 km/h** (§8).

**N9 Climb (HB 4-3).** Flaps −12°; climb speed by flap setting per §4.1 (§8); rpm
at most 5500.

**N10 Cruise (HB 4-3, 4-11).** Power as needed: about 4800 rpm economical, 4300 for
range, 5500 maximum continuous; engine gauges in the green; flaps −12°; carb heat
only when icing is likely.

**N11 Descent (HB 4-3).** Carb heat as needed; altimeter set.

**N12 Before landing (HB 4-3).** Belts tight; 110 km/h; flaps 15–35°; landing light
as needed.

**N13 Normal landing (HB 4-4, 4-13).** Approach 100 km/h at 10–20 % power; flaps on
final 15° or 30°; final 100 km/h; carb heat closed on short final; at about 1 m idle
and flare gently, nose not too high; after touchdown, stick gently back to unload
the nose wheel. Crosswind: flaps 15° or 0°.

**N14 Go-around (HB 4-4).** Full power; carb heat closed; flaps 15°; 110 km/h;
positive climb. A go-around with full flaps is acceptable.

**N15 After landing (HB 4-4, 4-15).** Throttle idle; brakes as needed; carb heat
off; landing light off; flaps retracted (0°). Listen on 121.5 MHz for an
accidental ELT activation _(confirm)_. Transponder to STBY: `MODE` twice from ACS, then a
check that it shows STBY (trainer addition, the derived step of §3.8.2, #692).

**N16 Shutdown and securing (HB 4-4, 4-14).** Parking brake set; Avionics Master
off; electrical consumers off; GEN out; ignition off; BAT out; fuel valve closed
(assumed, §9 key and fuel valve cover: the key comes out only with it closed, E6); key out; rescue
system secured, pin in (gesichert); ELT checked and left armed (§9); chocks
_(confirm)_.

## 7. Emergency procedures (our wording)

**E1 Spin (HB 3-1, 3-3).** Controls neutral; full opposite rudder; once rotation
stops, reduce power and pull out gently. If recovery fails or height is short, use
the rescue system. _Not trained in M6: no flight-dynamics model._

**E2 Rescue system (HB 3-1, 3-4, 3-5).** Ignition off (so the prop cannot damage
the chute); pull the handle forward, hard, to the stop, and the rocket fires; fuel valve closed;
emergency call _(confirm)_; BAT out; belts tight; brace: hands crossed behind the
neck, forearms beside the face _(confirm)_. Maximum deployment speed VNE.

**E3 Engine failure (HB 3-1, 3-5).** Below 100 m (330 ft): land ahead (E5), no
restart, no turn back below 250 m (820 ft), no turns at all below 50 m (160 ft).
Above 100 m: restart (E4).

**E4 Restart in flight (HB 3-1, 3-5).** Fuel valve open; fuel visible in both tanks
_(confirm)_ (if one shows empty, keep that wing up); ignition both; if the prop
turns slower than about 200 rpm, use the starter; if it does not start, E5.

**E5 Emergency landing (HB 3-1, 3-3, 3-6).** No field reachable: rescue system;
field chosen _(confirm)_; belts tight; loose items stowed _(confirm)_; emergency
call _(confirm)_; flaps beyond 0° only once the field is made; best glide 125 km/h
with flaps 0°, approach 100 km/h (90 into crops or forest); flare about 50 cm above
the ground or treetops; ignition off in the flare; fuel valve closed; after
touchdown stick fully back and brake; ELT on if it has not triggered. Too high:
S-turns.

**E6 Engine fire (HB 3-2, 3-6).** Fuel valve closed at once; throttle full until
the engine stops; ignition off; key out (the closed valve covers the key slot, so
this also proves the valve is fully closed); slip away from the flames while
descending; emergency landing (E5). **Never deploy the rescue system with fire on
board** (§8).

**E7 Coolant loss (HB 3-2, 3-7).** Reduce power; keep CHT below the red line
(**120 °C**, §8), using flaps 0–15° if speed gets low; land at the nearest
airfield.

**E8 Oil loss (HB 3-2, 3-7).** Ignition off; fuel valve closed; key out (after the
valve, §8); emergency landing (E5) at once: fire risk.

**E9 Flap control failure (HB 3-2, 3-7, 3-8, 7-13).** GEN out; BAT out; wait 3 s;
BAT in; GEN in (safe in flight: the ignition does not need the bus). Flaps work:
done. Otherwise, in cruise, drive the flaps to full negative with the override
(selector past −12° "up", back to −12° to stop). Long runway: land with flaps
negative (approach 120 km/h at −12°, or 110 km/h at 0°). Short runway: on short
final, drive to full positive (past 35° "down", back to stop). The thermal flap
breaker may also have tripped after an overload.

**E10 EMS failure (HB 3-2, 3-8).** _Not applicable: the analog variant has no EMS._

**Generator failure (club-authored, not in the handbook).** Derived from the
generator-lamp check and the flap reset: generator lamp lit; GEN out, then in once; lamp
stays lit: the battery is the only source; non-essential consumers off (landing
light, avionics not needed); land as soon as practical. Mark the procedure in the
app and README as club-authored, for instructor confirmation.

**Further guidance, not trained:** stall (release back pressure; up to 50 m height
loss straight, about 60 m in a 30° bank); after a rollover (brace, cut the belts,
get out, fire risk).

## 8. Handbook contradictions and the value used

| Topic                         | Value A                                                                           | Value B                                                         | Trainer uses                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| CHT red line                  | 120 °C gauge marking (HB 7-20)                                                    | 150 °C UL / 135 °C ULS limit (HB 2-2)                           | 120 °C (lowest)                                                                                |
| CHT in the coolant-loss item  | keep below 150 °C (HB 3-7)                                                        | gauge red line 120 °C (HB 7-20)                                 | 120 °C                                                                                         |
| Usable fuel                   | 128 l (HB 2-2)                                                                    | 62 l per side, 124 l (placard, HB 7-20)                         | 124 l                                                                                          |
| Minimum oil temp for take-off | 51 °C (run-up checklist, HB 4-3)                                                  | 50 °C (HB 2-2, 4-7)                                             | 51 °C                                                                                          |
| Climb speeds                  | Vx 120 / Vy 135 with −12° (climb checklist, HB 4-3)                               | 100–125 by flap setting (HB 4-3 take-off box, 5-1)              | the by-flap table of §4.1; the checklist pair is flagged                                       |
| Short take-off climb          | 105 km/h (HB 4-3)                                                                 | 100 km/h with 15° (HB 5-1)                                      | 105 km/h (more margin over the stall)                                                          |
| Best glide                    | 125 km/h flaps 0° (HB 3-6)                                                        | 124 / 115 km/h negative flaps by mass (HB 5-8)                  | 125 km/h flaps 0° (the emergency chapter)                                                      |
| Stall speeds vs ASI arcs      | VS1 75, VS0 65 (HB 2-1)                                                           | white arc from 72, green from 94 (HB 7-20)                      | gauge arcs as marked; speeds as listed                                                         |
| Max flap speed at 0°          | 184 km/h (HB 2-1)                                                                 | flaps 0° inside the green arc to 245 (HB 7-20)                  | 184 km/h at 0°; 15°, 30° and 35° per §4.1                                                      |
| Rescue system with fire       | descend to about 200 m and deploy if no landing is possible (HB 3-6 text)         | never deploy with fire on board (HB 3-6 warning)                | never deploy; the fire procedure ends in an emergency landing                                  |
| Shutdown ELT item             | "checked and off" (HB 4-4)                                                        | the remote switch has armed and on, no off                      | left armed                                                                                     |
| VNE                           | 276 BRS / 260 Junkers High Speed / 300 Junkers Light Speed or none (HB 2-1, 7-20) | D-MPGO's dial: red line at 300; placard 300 at −12° (§3.7)      | 300 km/h (owner, §2a decision 3, against BRS 276; assumed (unverified); was 260)               |
| Oil temperature max           | 140 °C UL                                                                         | 130 °C ULS                                                      | 130 °C                                                                                         |
| Order at start                | GEN in before Avionics Master (HB 4-3)                                            | placard: avionics off for start and stop                        | GEN first, then avionics, after the engine runs                                                |
| Key out in oil loss           | key out, then fuel valve closed (HB 3-7)                                          | the key comes out only with the valve fully closed (HB 3-6, E6) | fuel valve closed, then key out                                                                |
| Flaps after take-off          | climb checklist: flaps −12° (HB 4-3)                                              | never negative near the ground, no height given (§4.4)          | 0° above 50 m per N7 (also the `departure` preset); −12° only after a safe-height confirm item |

## 9. Open questions for the club and instructor

Each item lists the value the trainer uses until it is answered.

Owner ruling 2026-10-08: where a panel fact is missing, agents may use general
knowledge of the CT Supralight. Each such fact is recorded beside its question as
**assumed (unverified)**, and the implementing PR lists it, until the owner
verifies it on D-MPGO.

1. **Engine**: 912 UL or ULS? (The club web page says ULS; unconfirmed.) Uses the
   conservative limits of §4.2.
   **Photo survey 2026-10-10 (§3.7):** not visible. No engine type plate is in the
   photos. The wing-root fuel placards ask for RON 95 or better, which matches the
   trainer value of §4.2 but does not settle UL or ULS.
2. **Rescue system**: BRS 1050, Junkers High Speed or Junkers Light Speed? Uses
   VNE 260 km/h and the yellow arc 245–260.
   **Photo survey 2026-10-10 (§3.7):** partly answered. The data plate beside the
   rescue handle names BRS (model not legible), so the Junkers options drop out. The
   airspeed indicator puts its red mark at about 300 km/h and the lower-column
   placard allows 300 km/h at −12°, against the trainer's VNE 260: **contradicts
   current trainer**. **Settled 2026-10-10** (§2a decision 3): VNE 300 km/h,
   yellow arc 245–300 (§4.1, §4.3).
3. **Carb heat**: does D-MPGO have a carb-heat control, and where? Uses a
   provisional pull knob on the console, off/on.
   **Handbook check 2026-10-08:** still open. Carb heat is pulled to apply (HB 4-11, 4-13); no figure
   or text shows the control (HB 7-18 to 7-21).
   Provisional place (#534): the knob stood where the figure shows the large knob,
   so it moved to the right-seat side of the console top, outboard of the lever row
   and clear of it, pulled aft to ON. This place is **assumed (unverified)**.
   **Photo survey 2026-10-10 (§3.7):** not visible. No carb-heat control appears on
   the panel, the lower column or the console, and nothing stands where the
   trainer's provisional knob sits. The take-off checklist placard does name carb
   heat with the choke. The only heat knob seen is "Cabin Heat" on the glareshield.
4. **Engine fire ending**: the handbook allows a rescue deployment at about 200 m
   after the flames die; the same page forbids it with fire on board. Uses: never
   deploy, emergency landing.
5. **Every contradiction in §8**: please confirm the value in the last column.
6. **Generator failure procedure**: club-authored (§7); please confirm or replace.
7. **ELT at shutdown**: off or left armed? Uses armed.
8. **Ignition key labels**: OFF / 1 / 2 / 1+2 / START or L / R / BOTH? Used
   OFF, L, R, BOTH, START until M17 (superseded). **Answered 2026-10-10, applied in M17 T1 (#629): numbered.**
   **Handbook check 2026-10-08:** still open, leaning to numbers. The restart item names the both
   position 1 + 2 (HB 3-5); the dial cannot be read in HB 7-18.
   **Photo survey 2026-10-10 (§3.7):** **confirmed: numbered.** The dial prints
   "OFF", then "1" and "2" clockwise; the positions beyond 2 (both and START) are
   worn and not legible. **Contradicts current trainer** (L, R, BOTH). **Trainer uses (2026-10-10):** OFF, 1, 2, 1+2, START (M17 T1, #629); the 1+2 and START legends are **assumed (unverified)**.
9. **Second warning lamp** at the top of the upper-left field: what is it in the
   analog variant? Drawn unlit, not modelled.
   **Photo survey 2026-10-10 (§3.7):** not visible: the panel has one warning lamp,
   "Generator", in the upper-right field (question 22). Nothing is at the top of the
   upper-left field. **Contradicts current trainer** (a second unlit lamp is drawn).
   **Settled 2026-10-10** (§2a decision 1): no second lamp; "Drawn unlit" is
   superseded (M17 T4). **Done in M17 T4:** the background draws no second lamp.
10. **Large knob** aft of the parking-brake valve: cabin heat, propeller, other?
    Not modelled as a control (drawn as artwork, #535). **Handbook check 2026-10-08:** still open, one candidate. The hydraulic
    in-flight adjustable propeller has its lever on the centre console behind the
    engine control unit, with detents and a catch under the grip (HB 7-5), where
    the figure shows the knob; a cabin heater is optional equipment (HB 6-8, 8-7).
    Goes with question 11.
    **Photo survey 2026-10-10 (§3.7):** not visible. No large knob, propeller lever
    or catch-and-detent lever is on the console in the photos. Cabin heat is
    excluded as its identity: the "Cabin Heat" knob is on the glareshield, top
    centre. Aft of the lever row the console carries the parking-brake valve (right
    side), the aileron-trim wheel in an oval recess, the rudder-trim wheel and the
    rescue handle; the aileron-trim wheel may be what the handbook figure shows as
    the knob (inferred, unverified). **Contradicts current trainer** (unlabelled
    knob drawn aft of the valve). **Settled 2026-10-10** (§2a decision 1): no
    large knob; "drawn as artwork" is superseded. **Answered (M17 T2, #536):** the
    trainer draws no knob; cabin heat is the glareshield knob (M17 T4).
11. **Propeller**: ground-adjustable, hydraulic in-flight adjustable or ECS
    constant speed? Uses ground-adjustable (no cockpit control).
    **Photo survey 2026-10-10 (§3.7):** not visible: no propeller control in the
    cockpit photos, which fits the trainer's ground-adjustable propeller; the
    propeller itself is not identified. No change to the rpm model follows from the
    photos. **Answered (M17 T2):** no propeller control, as the trainer has it.
12. **Trim wheel position**: left of the throttle (text) or below the choke
    (photo)? Uses left of the throttle, with the choke between them (#534). **Handbook check 2026-10-08:** answered by inference from the
    handbook, for the owner to confirm on D-MPGO. Both are true if the figure is
    read as a top view with forward to the left: its bottom slot is then the pilot-side one, and the trim wheel is left of the throttle with the choke
    between them (HB 7-12, 7-19; §3.4).
    **Photo survey 2026-10-10 (§3.7):** **confirmed:** the trim wheel is the
    leftmost item of the lever row, left of the choke and the throttle.
13. **Cockpit-light switch**: present on the panel but absent from the wiring
    diagram. Modelled as a main-bus consumer.
    **Photo survey 2026-10-10 (§3.7):** confirmed present: a "Cockpit Light" rocker
    in the row and a "Cockpit Light" position in the breaker block (fitted or blank
    not legible). **Trainer (M17 T4):** the breaker position is an inert cap, since the
    cockpit light has no breaker in the model.
14. **Avionics as installed**: the units, their software versions and the pilot's
    guide revisions for SL40, GTX 327 and GPSMAP 496; any later changes (e.g. a
    Dynon retrofit) or handbook supplements on board.
    **Photo survey 2026-10-10 (§3.7):** partly answered. Installed: a FLARM display,
    a Garmin GPS whose plate reads like aera 500, a funkwerk COM radio and a
    funkwerk transponder (printed "ATC"); model names and software versions not
    legible. **Contradicts current trainer** (SL40, GTX 327, GPSMAP 496; decision 1
    of §2). **Answered 2026-10-10 (M18, §2a item 5):** aera 500, funkwerk ATR833-OLED
    (generation open, question 36), funkwerk TRT800H-OLED, and a rectangular classic
    FLARM LED display (§3.8). Software versions and the guide revisions on board stay
    unknown (questions 36 to 39).
15. **Club checklist card**: if the club has its own card, it is authoritative for
    wording (spec §7) and replaces §6 and §7 wording.
16. **Handbook copy**: is AE04300003 Rev 01 the book on board D-MPGO, with no later
    revision or supplement?
17. **Climb speeds**: the climb checklist's Vx 120 / Vy 135 km/h with −12° versus
    the by-flap table; which does the club teach?
18. **Parking brake before take-off**: the take-off list (N7) has no brake item.
    **Answered by the procedure order** (#466): N6 ends with the parking brake
    released, so `linedUp` starts with it released and `takeoff` has no brake item.
19. **Field proportions**: how wide is the lower centre column compared with the
    two upper fields, is it centred under their junction or offset, and where does
    the console start below it? Today: the centre column hangs below the junction
    of the upper fields; the console sits beside it on the right, since panel,
    centre column and console stacked do not fit one HD screen at their legibility
    floors; the column is drawn wider than assumed below, for legibility.
    **Answered by assumption pending owner verification** (#436). Assumed
    (unverified), from general knowledge of the CT Supralight: the centre column
    is centred on the junction of the two upper fields, its top at their lower
    edge; it is narrower than either upper field; the console continues straight
    down from it between the seats. **Handbook check 2026-10-08:** partly answered. The engine
    control unit sits on the console just aft of the lower centre field (HB 7-19);
    the column's width and offset are not given.
    **Answered by the owner 2026-10-08:** the panel geometry as drawn matches the
    aircraft (**Superseded 2026-10-10** (§2a, decision 1): four fields, with an upper-centre avionics field). The one-screen compromise stays: the console beside the centre
    column rather than below it.
    **Photo survey 2026-10-10 (§3.7):** **contradicts current trainer.** The panel
    has an upper-centre field between the two wide upper fields, holding the GPS and
    both radios; the lower column hangs below that centre field, not below a
    junction of two fields. This also differs from the owner's 2026-10-08 answer
    that the geometry matches; settled 2026-10-10 for the photos (§2a).
    **Done in M17 T4 (compromises assumed (unverified), §3.2a):** the panel has three
    upper fields and the column hangs below the middle one, about 40 px right of the
    field's centre at HD; the console stays beside the column.
20. **Compass**: panel compass with a reversed card in a narrow window, or a
    vertical card? Its size and exact mount (panel or windscreen frame)? Today: a
    small round panel compass at the top left of the upper-right field, no larger
    than the vertical speed indicator; its reversed card shows through a window at
    the top of the housing, numbers increasing to the left. **Answered by the
    owner 2026-10-08** (see below); first answered by assumption (#444). Assumed (unverified), from general knowledge of the CT
    Supralight: a panel-mounted magnetic compass with a reversed card read in a
    window, mounted in the panel (not on the windscreen frame), no larger than the
    vertical speed indicator. **Handbook check 2026-10-08:** still open. A magnetic compass with a
    deviation card under it is minimum equipment (HB 1-3, 7-20); type and card are
    not given. **Answered by the owner 2026-10-08:** correct as drawn,
    owner-confirmed. **Superseded 2026-10-10** (§2a, decision 1): no panel compass.
    **Photo survey 2026-10-10 (§3.7):** not visible: no compass on the panel; the
    top right of the upper-right field holds the "Generator" lamp. **Contradicts
    current trainer**, which the owner confirmed on 2026-10-08. Settled 2026-10-10
    (§2a): no panel compass. **Done in M17 T4:** the compass indicator is gone, and
    with it the compass checks (a trainer addition) that N7 and N8 opened with; the
    heading of each phase still feeds the GPS track.
21. **ELT remote switch legends**: what does the remote panel print beside its
    positions (for example ON and ARM, or a TEST or RESET position), and what
    colour is its lamp? Today: a toggle on a small remote plate printed "ELT",
    ON up and ARM down, its lamp beside it, red. **Answered by the owner
    2026-10-08** (see below); first answered by assumption (#447). Assumed (unverified), from general knowledge of
    the CT Supralight: the remote plate prints ELT, ON (up) and ARM (down), with no
    TEST or RESET position; the lamp lights red while the ELT transmits.
    **Handbook check 2026-10-08:** still open. The remote unit in the lower centre field shows
    when the ELT has been triggered (HB 4-15, 7-18); its legends cannot be read.
    **Answered by the owner 2026-10-08:** the remote plate's legends and lamp are
    correct as drawn, owner-confirmed.
    **Photo survey 2026-10-10 (§3.7):** not visible: no ELT remote switch or lamp on
    the lower column or the panel. Settled 2026-10-10 (§2a decision 1): an item the
    photos do not show keeps its answer, so the ELT remote stays as drawn.
22. **Charge lamp legend**: does the charge warning lamp carry a printed legend,
    and in which colour does it light? Today: a round red lamp with the legend
    CHARGE printed below it; the second lamp is round at the same size, without a
    legend. **Answered by the owner 2026-10-08** (see below); first answered by
    assumption (#444). Assumed (unverified), from general knowledge of the CT
    Supralight: the charge lamp
    lights red and the panel prints CHARGE with it. **Handbook check 2026-10-08:** still open. The
    wiring diagram names an alternator warning light (HB 7-8); legend and colour
    are not given. **Answered by the owner 2026-10-08:** the CHARGE lamp is
    correct as drawn, owner-confirmed. **Superseded 2026-10-10** (§2a, decision 1): the red "Generator" lamp in
    the upper-right field.
    **Photo survey 2026-10-10 (§3.7):** **contradicts current trainer.** The only
    warning lamp is round, red and printed "Generator", at the top right of the
    upper-right field; the trainer prints CHARGE at the top of the upper-left field,
    owner-confirmed on 2026-10-08. Settled 2026-10-10 (§2a): the "Generator" lamp.
    **Done in M17 T4:** the lamp keeps its indicator id and behaviour; procedure items
    that named the charge lamp now say "Generator lamp".
23. **Memory items**: which steps of the §7 procedures does the club expect from
    memory before the checklist is read? Today: the leading steps below are memory
    items; the rest of each procedure is read and done from the list. **Answered by
    assumption pending owner verification** (#450). Assumed (unverified), from
    general knowledge of light-aircraft emergency drills, where the steps that stop
    a fire, restore or secure the engine, or commit to the landing or the rescue
    system are flown from memory and the rest is read:
    - E3 below 100 m: rpm below idle; no restart, land ahead.
    - E4: rpm below idle; fuel valve open; fuel visible in both tanks; ignition
      both; starter if the prop turns slower than about 200 rpm.
    - E2: rpm below idle; no field reachable, deploy; ignition off; safety pin
      out; pull the handle.
    - E6: smoke or flames; fuel valve closed; throttle full until the engine
      stops; ignition off.
    - E8: oil pressure below the minimum; ignition off; fuel valve closed.
    - In E6 and E8 the key comes out after the valve is closed (question 27), as
      the first item read from the list.
    - E7, E9 and the generator failure have no memory items: they leave time to
      read the list.

    Memory items must lead the procedure, so two questions go with this one. Many
    drills open an engine failure with "best glide" from memory, but §7 puts best
    glide (125 km/h, E5) after E4's restart attempt, and E3 below 100 m names only
    the approach speed: does the club fly the glide from memory, and where in the
    list? The safety-pin confirm (E2) is a memory item only because it sits
    inside the leading block; does the club drill it so? **Handbook check 2026-10-08:** still
    open; the handbook marks no memory items.

24. **Phase start states**: which switches does the club have on in each phase? Today
    (§5): intercom on while the engine runs, transponder ACS from line-up to taxi-in
    and standby once parked, squawk 7000 from line-up, and the GPS on at its map page and
    the FLARM ready from line-up to parking and securing (#476, M18), landing light on from the approach until N15, vertical
    speed climbing in `departure` and descending in `approach`. No procedure step
    switches the landing light on (N12 says "as needed"), so the approach, landing
    and `taxiIn` entries carry it. **Answered by assumption pending owner
    verification** (#466). Assumed (unverified), from general-aviation practice;
    the day-VFR-only rulings (cockpit light off, avionics and beacon on) are the
    owner's. **Handbook check 2026-10-08:** still open; the handbook gives no phase states.
25. **Console lever and trim geometry**: do BRAKE, THROTTLE and CHOKE travel
    fore and aft, which way does each apply (brake and choke on when pulled?),
    what handles do they carry, and where does the trim indicator sit relative to
    the wheel? Before #534: three horizontal levers stacked top to bottom, drawn as the
    left seat sees the console's flank, forward to the left; the throttle pushes
    forward to full, the brake and choke pull aft to on; the trim wheel's rim
    shows in a slot below the choke with its indicator scale above it, nose down
    forward. Today: see §3.4 (#534). **Answered by assumption pending owner
    verification** (#449).
    Assumed (unverified), from general knowledge of the CT Supralight: the three
    levers slide fore and aft; push is forward, so full throttle is forward and
    the brake and choke apply when pulled toward the pilot; the trim wheel turns
    fore and aft, forward nose down, with its indicator beside it.
    **Handbook check 2026-10-08:** answered from the handbook, with one correction;
    the lever order is an inference for the owner to confirm (question 31). Directions:
    throttle FULL forward and IDLE aft, brake and choke OFF forward and ON aft, trim
    DOWN forward and UP aft, forward trims nose-heavy (HB 7-12, 7-19 to 7-21); the
    trim indicator sits directly beside the wheel (HB 7-12). Correction: the levers
    lie side by side across the console top, not stacked on its flank; from the
    pilot's side outward trim wheel, choke, throttle, brake (inferred from HB 7-19;
    §3.4). Handle shapes cannot be read in the figure and stay open.
    Throttle legends (#531): the placard prints FULL and IDLE only; the trainer's
    low, run-up and cruise stops are unprinted. The THROTTLE title was assumed
    (unverified); superseded 2026-10-10 by the photo survey below ("Throttle").
    Trim legends (#532): the placard prints DOWN forward and UP aft, with no
    neutral mark; the trainer's neutral position has no printed legend. The title
    was assumed TRIM; answered 2026-10-10 (M17 T1): "Stabilator Trim". The trainer's half-down and half-up stops
    (#620) are assumed (unverified) and have no printed legend; the trainer's
    unworded tick at every stop, neutral included, is a trainer departure.
    **Grips, answered from the photos (M17 T2):** blue cylindrical throttle grip,
    black knurled crossbar on the brake lever, plain choke lever without a visible
    grip, green trim strip with a small stud slot between wheel and choke; the
    throttle strip carries no mark between FULL and IDLE (#570).
    **Photo survey 2026-10-10 (§3.7):** **confirmed:** the levers lie side by side
    and slide fore and aft; "Choke" "Off" forward / "On" aft, "Throttle" "Full"
    forward / "Idle" aft with no detent marks or words between (#570), "Brake" "On" aft (its forward legend hidden), trim "Down"
    forward / "Up" aft. Handles: a blue cylindrical throttle grip and a black
    knurled crossbar on the brake; the choke shows no grip. The trim title prints
    "Stabilator Trim", not TRIM; the throttle title "Throttle" is confirmed.
26. **Rescue handle placement**: how high and where across the main
    bulkhead does the handle sit, what shape is its grip, and where does the
    safety pin go? Before #535: a T-grip in a holder centred on the bulkhead between
    the two seat backs, the safety pin through the holder above the grip, the
    holder printed RESCUE and PULL HARD. **Answered by assumption pending owner
    verification** (#449). Assumed (unverified), from general knowledge of the CT
    Supralight: the handle sits centred between the seats on the bulkhead behind
    them, at about shoulder height, reached back over the shoulder; the pin goes
    through the holder and carries a remove-before-flight flag.
    **Handbook check 2026-10-08:** answered from the handbook; the assumption is wrong on
    height and reach, and it gave no pull direction. The handle is on the centre console between the seats,
    at the main bulkhead, low at the console's aft end (HB 3-4, 7-13, 4-5), and is
    pulled forward, hard, to the stop (HB 3-4). The pin secures the release lever
    itself (HB 8-1). Grip shape and the pin's flag are not given.
    **Drawn so (#535):** the handle is on the console view's recessed aft shelf,
    low between the seats, and pulls forward to the stop; the pin goes through the
    release lever. The `bulkhead` view is gone. Still **assumed (unverified)**: the
    T-grip, the plate's legends, a pin with a ring but no flag, and the handle's
    place across the shelf, drawn to the pilot's side of the centreline because the
    large knob holds the column aft of the valve.
    **Photo survey 2026-10-10 (§3.7):** **contradicts current trainer.** The handle
    is red with an orange-bordered warning label, on the console's upright aft face
    at the bulkhead, centred between the seats, with nothing printed RESCUE or PULL
    HARD; the pin carries a red remove-before-flight flag. The grip's pull direction
    is not legible. **Settled 2026-10-10** (§2a decision 1): the handle is drawn
    red and centred on the aft face, without the RESCUE and PULL HARD legends, with
    a flagged pin (M17 T2); the "Drawn so (#535)" place and legends are superseded.
    The forward pull stays (handbook, HB 3-4), not confirmed by the photos.
    **Answered (M17 T2):** drawn so. The handle is red and centred, the label is
    orange-bordered and prints "Parachute" (assumed (unverified): the photos do
    not show the handle's own wording, and the printed-labels contract needs one),
    and the pin carries a red flag without lettering.
27. **Key and fuel valve cover**: can the key go in while the closed valve's handle
    covers the slot, and does N16 close the valve? Today: the key is out in
    `parking`; it comes out only with the valve fully closed (E6, a handbook fact);
    it goes in only with the valve open, and the closed valve holds a key at OFF;
    N16 closes the valve after BAT out so the key can come out, leaving the aircraft
    as `parking` has it. **Answered by assumption pending owner verification**
    (#468). Assumed (unverified), from the handle covering the slot and N3's order
    (fuel valve open, then key in). **Handbook check 2026-10-08:** partly answered. The closed
    handle covering the lock is a handbook fact (HB 3-6), and the valve is shaped so
    the key can hardly be operated past it (HB 4-6). Whether the key goes in under
    the closed handle, and the N16 order, are not given.
    **Photo survey 2026-10-10 (§3.7):** partly answered. The photos show the key in
    at OFF while the valve grip is at its closed end, just below the key face rather
    than over it. That fits the trainer's closed valve holding a key at OFF; whether
    the key can go in under the closed grip is not visible.
28. **Engine fire cues**: what does the pilot perceive first? Today: smoke from the
    engine bay streams over the windscreen in the outside view, and the CHT and oil
    temperature climb past their red lines within seconds while the fire burns; both
    clear once the valve is closed and the engine has stopped. **Answered by
    assumption pending owner verification** (#233). Assumed (unverified), from
    general-aviation practice: smell and smoke come first, and a fire in the engine
    bay heats the CHT and oil sensors; the size of the rise is a trainer value.
    **Handbook check 2026-10-08:** still open; the fire item gives actions, not cues (HB 3-6).
29. **Flap control failure cue**: what shows on the panel when the flap controller
    fails? Today: the failure trips the flap breaker (8 A, thermal), the flap
    position readout on that circuit goes dark, and with the breaker reset the readout
    stays put whatever the selector says. **Answered by assumption pending owner
    verification** (#233). Assumed (unverified), from the overload note of E9 and the
    wiring of §4: the readout is fed through the flap breaker, and a failed controller
    overloads the drive until the breaker trips. **Handbook check 2026-10-08:** partly answered,
    and it adds a cue. The readout blinks while the drive runs and shows steady
    once the setting is reached; blinking that persists while extending means the
    overload protection has stopped the drive (HB 7-12). The thermal flap breaker
    beside the selector can trip under sustained overload and takes a while to
    reset (HB 7-13). A failed controller is reset by switching GEN and BAT off and
    on (HB 3-7). The trainer blinks the readout while the drive runs, steady
    once the setting is reached, and it keeps blinking while airspeed holds an
    extension off (#533). Its rate (`--panel-blink-period`) is a trainer value,
    assumed (unverified).
30. **Flows**: which procedures does the club open with a panel scan done from
    memory before the checklist is read, and in which order? Today: three, each
    verified by the §6 items that follow it. **Answered by assumption pending
    owner verification** (#453). Assumed (unverified), from general-aviation
    practice and the CT Supralight panel layout (§3), scanned top to bottom on the
    centre field, then across the console from the pilot's side and on to carb heat:
    - N3 Engine start: Avionics Master off; Beacon on; fuel valve open; BAT in;
      carb heat off.
    - N6 Before take-off: flaps 15°; trim neutral; choke off; carb heat off. The
      parking brake stays out of the flow, since its valve and lever go in order
      (§3.4).
    - N15 After landing: landing light off; flaps 0°; carb heat off.

    **Handbook check 2026-10-08:** still open; the handbook gives checklists, not flows. The
    console scan order changes with §3.4: across the console from the pilot's side
    (trim, choke, throttle, brake), not down a stack.

31. **Console lever order across the console**: in which order do the levers sit
    from the pilot's side outward? The handbook figure and the trim wheel sitting
    left of the throttle (HB 7-19, 7-12) give trim wheel, choke, throttle, brake
    (question 25's handbook check).
    The order is inferred from the figure: **assumed (unverified)** until the
    owner confirms it on D-MPGO. Today (#534): the console is drawn from above,
    forward up, with the trim wheel, choke, throttle and brake side by side in
    that order from the pilot's side, each sliding fore and aft (§3.4).
    **Photo survey 2026-10-10 (§3.7):** **confirmed:** from the left seat, left to
    right: trim wheel, choke, throttle, brake.
32. **GPS and intercom switch-on steps**: which normal-procedure step switches
    the GPS on, and which the intercom? The handbook checklists name neither (§6).
    The trainer switches the intercom on in N3 right after Avionics Master on, and
    the GPS on in N6 after the transponder, with a check of its position fix after
    "radio set", so the run-up covers the receiver's search. A full flight then
    reaches line-up with both on, as the phase presets have them (§5, question 24);
    a carried leg keeps what the pilot did and re-seeds no device state (#519).
    **Assumed (unverified)**, from general-aviation practice, until the club
    confirms when its pilots switch each on.
    **Update (M18):** the GPS is the aera 500, which starts with cradle power, so the
    GPS step becomes accepting its databases, then opening its map page (§3.8.3,
    question 38). The step is still **assumed (unverified)**.
    **Trainer (M18, #678):** N6 presses the aera's Press To Accept, then its Map icon, right after the
    transponder; the fix check stays after "radio set". The map step keeps the line-up
    seed's map page true for a whole flight.
33. **FLARM power source**: which breaker or switch feeds the FLARM display and its
    unit? The breaker rows show no FLARM legend; Com, Nav, Transponder, GPS and others
    exist (§3.7.1). Trainer uses: powered from the avionics bus with no breaker of its
    own, so the "avionics off before engine start or stop" placard covers it and no
    legend is added. **Assumed (unverified)** (§3.6, §3.8.4).
    **Trainer (M18, #678):** the `flarm` install is powered by the avionics bus alone and reads its
    voltage; the Com, Transponder and GPS breaker legends stay as they are.
    **Owner (2026-10-11, #717):** not answered; the supply stays **assumed (unverified)**.
34. **FLARM check before take-off**: does the club check that Power, GPS and TX are
    steady before take-off, as the FLARM manual asks? Trainer uses: one check in N6.
    **Assumed (unverified)**, from the manual (§3.8.4).
    **Trainer (M18, #678):** the check "FLARM: Power, GPS and TX lit" follows the GPS fix check in N6
    and rings the Mode key; it passes once the self-test is over and the fix found.
    **Owner (2026-10-11, #717):** the club does not check the FLARM before take-off. **Answered.**
    **Trainer (#717):** the check is removed from N6; no procedure checks the FLARM.
35. **ATR833 AUTO ON**: is the installer setting on, so the radio starts when avionics
    power arrives, or must the pilot press `I/O`? Trainer uses: on, so no COM switch-on
    step exists, as before. **Assumed (unverified)** (§3.8.1).
    **Trainer (M18, #678):** the `atr833` switches on when the avionics bus and the Com breaker give it
    power; no phase seeds it.
    **Owner (2026-10-11, #717):** AUTO ON is off; the pilot presses `I/O` to switch the radio on.
    **Answered.**
    **Trainer (#717):** the handbook checklists name no COM step (question 32). The Avionics Master
    comes on in N3 after the engine runs and a pilot needs the radio for the taxi call, so N3 presses
    `I/O` right after the Avionics Master, not at the holding point; N6 keeps its "radio set"
    confirm and `radioAndTransponder` starts with the radio already on. Every phase after engine
    start seeds the COM on. The `atr833` no longer switches on when power arrives; an `I/O` press
    does. Where the club presses `I/O` is not answered: the step's place in N3 is the trainer's
    choice, **assumed (unverified)**.
36. **ATR833 generation, and the lower-right knob**: is D-MPGO's unit the original
    ATR833-OLED, an ATR833A-OLED or an ATR833-II? The only source is the II manual, so
    II features the original may lack are unconfirmed: the last-10 list (LST), named
    memories, the REPLAY of a call, the split sidetone items. Is anything printed at the
    lower-right knob? Trainer uses: the II manual's behaviour for every control on the
    face, REPLAY and names not modelled, and the knob printed `FREQ`. **Assumed
    (unverified)** (§3.8.1).
    **Trainer (M18, #678):** the dock prints `FREQ −` and `FREQ +`; the slot mirror draws both knobs as
    plain discs, with no lettering.
    **Owner (2026-10-11, #717):** the unit is the original ATR833-OLED, not the II; nothing is
    printed at the lower-right knob. **Answered.** The slot mirror stays plain; `FREQ −` and
    `FREQ +` stay only as the dock touch helpers' wording. Trimming the II-only features is a
    separate issue.
    **Trainer (#718):** the `atr833` follows the ATR833A-OLED manual in place of the II's for every
    control on the face (question 64): the II-only STL, STR and BRT items, the save
    mode and its mark are gone, REPLAY is absent, the A manual's last-used list (LST) stays and
    memory names stay unmodelled. Points that manual leaves open are question 65 (§3.8.1).
37. **TRT800H set-up**: is a Mode S cradle with a 24-bit address fitted (modes STBY,
    ACS, A-S, rather than Mode A/C only), is there a ground switch, and which VFR code
    is stored? Trainer uses: cradle fitted, no ground switch, VFR code 7000, and the
    knob printed `CODE`. **Assumed (unverified)** (§3.8.2).
    **Trainer (M18, #678):** `radioAndTransponder` presses I/O (on, STBY), VFR (7000) and MODE (ACS),
    N6 presses I/O and N15 presses MODE twice (STBY, #692); the seeded phases start the unit
    on at ACS or STBY.
    **Owner (2026-10-11, #717):** Mode S cradle (STBY, ACS, A-S), no ground switch, VFR code 7000.
    **Owner-confirmed**, no longer assumed. The trainer already does this.
38. **aera 500 on D-MPGO**: what happens when cradle power drops (off, or on battery)?
    Which map orientation and data fields does the club use, and what is the start-up
    step? Which software version, and is there a traffic or weather source? Trainer uses:
    the unit starts with cradle power, the step is accepting the databases and opening
    the map, orientation track-up (the unit's own default is north up), the fields GS,
    ETE NEXT, BRG and DIST NEXT, no traffic or weather, and power loss switching it off.
    **Assumed (unverified)** (§3.8.3).
    **Trainer (M18, #678):** the aera starts at its database page whenever the GPS breaker and the
    avionics bus give the cradle power; the seeded phases start it on the map page with
    its fix.
    **Owner (2026-10-11, #717):** the map is track up with the fields GS, ETE NEXT, BRG and
    DIST NEXT, there is no traffic or weather source, and the start-up step is accepting the
    databases and opening the map. **Owner-confirmed**, no longer assumed. Still unknown: the
    behaviour on cradle power loss and the software version. The trainer already does this.
39. **FLARM display hardware, pairing and traffic**: is the display hardware 1.0 or 2.0
    (the 16 LEDs imply 2.0), which FLARM unit is it paired with (the reboot hold depends
    on it), and does the club want simulated traffic on the display? Traffic would
    change the spec's scope (§4.9): a decision for the owner, with no code in M18. Trainer
    uses: a 2.0 face, no traffic, the manual's push timings. **Assumed (unverified)**
    (§3.8.4).
    **Trainer (M18, #678):** the `flarm` declares no traffic input, so `RX` stays dark and the ring
    lights only in the self-test and the Nearest and Collision confirmation.
    **Owner (2026-10-11, #717):** no simulated FLARM traffic, ever; the owner declined it as a scope
    change. **Answered.** Still unknown and **assumed (unverified)**: the display hardware version
    and the FLARM unit it is paired with; also the colour of the lit status LEDs.

40. **Panel colour** (#716): the photos show all three upper plates and the lower
    column in the same light brushed aluminium, with only the moulding around them
    dark (§3.9.1). The owner ruled that the centre field takes the outer panel's
    colour. Should every field then be aluminium, as on D-MPGO, or every field the
    trainer's dark panel colour? Trainer uses: the ruling as worded against today's
    trainer, so all fields, the lower column included, take the dark panel colour of
    today's outer fields. **Assumed (unverified)** (§3.9.1).
    **Trainer (M19, #716):** every upper plate, the centre one included, takes the outer
    plates' dark panel colour; the lower column keeps its dark plate.
41. **Panel proportions against legibility** (#716): D-MPGO's upper panel is 2.64 times
    as wide as tall, with a narrow upright centre field between two wide outer fields;
    the trainer's is 3.51 with the centre field widest. At true proportions in today's
    2372 × 700 box everything is drawn smaller than today (airspeed 193 against 220,
    tachometer 139, engine gauges 77, radios 139, breakers 42 units apart), and
    the panel floor would rise from 1110 to about 1267 px to keep today's lettering
    minimum. Should the trainer (a) draw true proportions in today's box and raise the
    floor, (b) change the box to about 2044 × 800 at today's scale and narrow the HD
    panel cell to about 1009 px, or (c) keep today's gauge and slot sizes and take
    only the positions from the photos, accepting a panel wider than D-MPGO's? Trainer
    uses: (a), the coordinates marked T in §3.9.2 to §3.9.5. **Assumed (unverified)**
    (§3.9.7).
    **Trainer (M19, #716):** neither (a) nor (b) as worded: the floor cannot rise (the
    panel renders at most 1113 px wide below the 1200 px desktop breakpoint), so the box
    stays 2372 × 700 at the 1110 px floor. The gauges take T's sizes (their numerals
    print as secondary lettering at HD) and the plates are drawn wider than true where
    the floor's touch targets and mirror lettering need room: left 740, centre 578 × 696,
    right 718 units (§3.9.7).
42. **Glareshield knob and red-cross disc** (#716): on D-MPGO both sit on the moulding
    above the centre plate's left half, about 0.23 A above its top edge (§3.9.1). Under
    either true-proportion layout they fall outside the view box. Should they be left
    out, stay as today in a strip at the top of the centre field, or should the box
    grow upward for them? Trainer uses: both kept inside the centre plate's top margin
    above the FLARM display and the checklist, at their photographed x (0.12 and 0.37
    of the plate), shrunk to the margin's height (about 34 units under T).
    **Assumed (unverified)** (§3.9.1, §3.9.7). The red-cross disc is still
    unidentified (§3.7.1).
    **Trainer (M19, #716):** both left out: the view box has no room above the centre
    plate, and inside it they would stand in the FLARM display's and the checklist's
    top band (§3.9.7).
43. **Lower column proportions** (#716): the column is taller than wide (0.75), a T
    with the rocker row across its top and a lower part 0.59 as wide; the `centre` view
    is 1.33 and drawn as a full rectangle (§3.9.6). Its rockers are 0.21 A apart and the
    flap selector and ignition nearly touch, which at today's control sizes overlap.
    Should the view draw the T-shaped plate at its true aspect with dark moulding beside
    it, or stretch the column across the view and keep today's control sizes? Trainer
    uses: the column's fractions stretched across today's view (x = 16 + 1168·x,
    y = 16 + 876·y), controls at today's sizes, nudged apart where they would overlap.
    **Assumed (unverified)** (§3.9.6).
    **Trainer (M19, #716):** the `centre` view is not changed yet. At its floor a 44 px
    target is 121 units and the rockers' printed labels hold them at 150 units wide, so
    the rocker row cannot close up to D-MPGO's pitch; moving the flap selector, the
    ignition and the fuel valve changes the valve-over-key geometry, left to a
    follow-up.
44. **GPS size against the radios** (#712): the aera 500's cradle is 2.50 by 1.53 COM
    diameters on D-MPGO (1.80 × 1.10 A), and dominates the centre field; today's slot
    is 1.62 by 1.01 COM diameters. Should the GPS keep the photographed ratio to the
    radios even if the radios then sit below their natural size, or keep its natural
    440 × 275 beside radios at 272? Trainer uses: the photographed ratio, at the scale
    of §9 question 41 (cradle 347 × 213 under T, 0.79 of natural). **Assumed
    (unverified)** (§3.9.3).
    **Trainer (M19, #716):** the photographed ratio at T's scale: cradle 347 × 217 units
    (1.80 A), radios 139 (0.72 A), so the cradle is 2.50 radio diameters wide (§3.9.7).
45. **FLARM display size** (#712): the classic FLARM display on D-MPGO is a small strip,
    0.87 by 0.44 COM diameters (0.63 × 0.32 A), at the centre field's top left beside
    the checklist summary; today's slot is 1.18 by 0.59 COM diameters (320 × 160 at
    natural size). Should it
    shrink to its photographed size, with its LED legends below the lettering floor, or
    keep a legible minimum? Trainer uses: the photographed size, at the scale of §9
    question 41 (121 × 61 under T). **Assumed (unverified)** (§3.9.3).
    **Trainer (M19, #716):** the photographed size, 120 × 60 units (0.62 A), at the top
    left beside the checklist card; its LED legends are read in the dock, and its tap
    area grows to the touch target around the slot (§3.9.7).

<!-- prettier-ignore-start -->

46. **Home aerodrome elevation** (altimeter, #719): what is the field elevation of
    D-MPGO's base, Herrenteich (EDEH, §1)? Trainer uses: **315 ft (96 m)**,
    **assumed (unverified)**, from general aviation knowledge, to be checked against
    the current AIP or VFR chart entry. Cross-check from the photos (§3.10.2): parked
    at its base, the altimeter reads about 330 ft with 1025 hPa set. That fits an
    elevation near 300 to 330 ft but proves nothing, since the day's QNH is unknown.
    The trainer places every phase at this aerodrome for the altimeter only: phase
    presets and systems keep heights above the field (§4), and the altimeter adds
    the elevation (§9 question 48).
47. **Scenario QNH and the knob's starting setting** (#719): which QNH does each
    scenario use, and does the altimeter start at that value? Trainer uses: **QNH
    1013 hPa** for every scenario unless a scenario sets its own, **assumed
    (unverified)**, from general knowledge (ISA standard pressure; VFR pilots in
    Germany set QNH before take-off). Whether the knob starts at another value, so
    that setting it is a real task, is the #719 PR's decision, named there. The
    photos show one real example of a setting left over from the last flight: 1025
    hPa on the parked aircraft.
48. **Indicated altitude** (#719): Trainer uses: indicated altitude (ft) = field
    elevation (§9 question 46) + height above the field (`altitudeFt`) + (knob setting −
    QNH) × 27 ft per hPa. A setting above QNH reads high, by about 27 ft per hPa.
    The window shows the knob setting. All three pointers follow that one value: the
    long pointer turns once per 1,000 ft (3.6° per 10 ft), the broad pointer once per
    10,000 ft and the hairline once per 100,000 ft. **Assumed (unverified)**: the
    27 ft per hPa factor is the general-knowledge value near sea level (about 27 to 30
    ft per hPa). The transponder's altitude feed stays as it is, independent of the
    knob (known simplification, #719).
49. **Altimeter details the photos do not show** (#719): the drum's setting range and
    step, the knob's turning sense, its knurl and length, and the printed pressure
    unit (the small print at the window's top edge is not legible). Trainer uses: 950
    to 1050 hPa in 1 hPa steps, turning clockwise raises the setting and the reading,
    a plain knob, **assumed (unverified)**, from general knowledge of hPa altimeters
    (typical range about 946 to 1050 hPa). Note for the printed-label rule: no
    pressure-unit word is legible on the face.
50. **ASI red line against the rescue system** (#720): D-MPGO's dial marks yellow
    245–300 and the red line at 300 (§3.10.1), which the handbook gives for the
    Junkers Light Speed or no rescue system (HB 7-20). The rescue-system data plate
    reads as a BRS 1050 type with a 276 km/h limit (**low confidence**, small print),
    and for BRS 1050 the handbook gives VNE 276, yellow 245–276 and the red line at
    276 (HB 2-1, 7-20). Which applies to D-MPGO, and why is the dial marked to 300?
    Trainer uses: the dial as photographed and VNE 300 (§2a decision 3); the photos
    show no mark at 276. The question bears on §2a decision 3 and the §8 VNE row;
    the owner decides.
51. **Orange triangle beside the ASI** (#720): what does it mark? It points at about
    100 km/h (§3.10.1), the approach and final speed of §4.1. Trainer uses: an
    unlabelled orange triangle with no function; its meaning as an approach-speed
    reminder is **assumed (unverified)**.
52. **ASI below 40 km/h** (#720): the needle rests at 12 o'clock on a white index
    and the scale starts at 40, 10° clockwise of it; the photos do not show how the
    needle travels between 0 and 40 km/h or whether a stop pin exists. Trainer uses:
    0° at 0 km/h, linear to 10° at 40 km/h, then θ = 10° + 1.10° × (v − 40) up to
    340° at 340 km/h, held there above 340. **Assumed (unverified)**.
53. **VSI face** (#721): no question needed; the photos settle the face (§3.10.3). The
    legend beside the down arrow is hidden under the resting pointer in every photo;
    the trainer prints a short down legend mirroring `up`. **Assumed (unverified)**.
54. **Slip indicator face** (#721): no question needed (§3.10.4).
55. **Tachometer arcs** (#721): the photos show red from 0 to about 1,400 rpm, yellow to
    about 1,800, green to about 5,500, yellow to about 5,800 and a red line at about
    5,800 (each boundary read to ±100 rpm). Are those the printed values, and is the
    green arc continuous from 1,800 to 5,500? Glare washes its colour between about
    1,800 and 4,000 rpm in every photo. Trainer uses: the values above, green
    continuous. **Assumed (unverified)** for the continuous green (§3.10.5, §4.3).
    The trainer's idle (about 1,400 rpm, §4.2) sits on the red/yellow boundary.
    **Trainer (M19, #721):** drawn as assumed: green continuous, every boundary at its
    printed rpm on the needle's own linear scale (−142° at 0 to +142° at 7,000 rpm, so
    the red line sits at +93.3° where the photos read +96°, within the tolerance).
56. **Hour meter** (#721): no question needed; it is inert art with an illustrative value
    (§3.10.10).
57. **Engine gauges at rest** (#721): with the master off, and with a
    cold engine below 40 °C, where do the needles of the CHT, oil temperature,
    voltmeter and oil pressure gauges rest: on the lowest mark (40, 40, 9, 0) or
    pinned below it, and how far below? The photos show only live readings with the
    master on (CHT and oil temperature about 46 °C, voltmeter about 13.5 V, oil
    pressure on 0). Trainer uses: each needle on its lowest mark whenever the value is
    below the scale or the gauge has no power. **Assumed (unverified)** (§3.10.6 to
    §3.10.9).
58. **Voltmeter band and centre word** (#721): is there a small coloured band near
    13 to 14 V (#721's audit thought so; the photos show none, but the needle covers
    part of that sector), and is the word above the dial centre `VOLTS` (only "VO"
    and a faint third letter show; the rest is under the needle in every photo)?
    Trainer uses: no coloured band, and `VOLTS`. **Assumed (unverified)** (§3.10.8).
59. **Oil-pressure arc colours** (#721): which colours are the thin arc from 1 to 2
    bar, the thin arc from 5 to 6 and the wider arc from 6 to 7 (glare washes them
    out), and is there really no arc from 2 to 5? Trainer uses: the colours as
    photographed, pale yellow from 1 to 2, pale grey-green from 5 to 6, tan-orange
    from 6 to 7, the red line at 7, nothing from 2 to 5. **Assumed (unverified)**
    (§3.10.9).
60. **Gauge diameters** (#721): what are the outer ring diameters of the ASI, the
    tachometer and one small engine gauge (a ruler across each ring is enough)? Sizes
    across the two upper plates come from photo ratios: the tachometer measures about
    0.72 of the ASI (low confidence: the link crosses plates) and the small gauges
    0.55 of the tachometer, about 0.40 of the ASI (#721's audit estimated 0.48).
    Trainer uses: the photo ratios of §3.9.2. **Assumed (unverified)** (§3.9.2,
    §3.10.11).
61. **Panel-wide gauge look** (#721): no question needed; the photos settle the
    bezels, mounts, screws and grouping (§3.10.11), and the sizes are §3.9.2's (the
    diameters are question 60).
62. Not used (reserved for #721).
63. **Scale start positions (#670)**, for the gauges of §3.10.3 to §3.10.5 and
    §3.10.10: no question needed. The photos settle them: the VSI's 0 sits at
    9 o'clock (−90°) and both halves meet at a single 2 at 3 o'clock; the
    tachometer's 0 sits at about −142° under the resting pointer, sweeping clockwise
    to 70 at about +145°, with the low red and yellow arcs recorded in §3.10.5 (any
    doubt on their values is §9 question 55); the slip indicator and the hour meter
    have no scale start. The airspeed indicator, the altimeter and the four engine
    gauges record theirs in their own blocks (§3.10.1, §3.10.2 and §3.10.6 to
    §3.10.9).
    **Trainer (M19, #721), tachometer:** as recorded here; the red low arc starts at 0,
    next to the resting pointer.
64. **ATR833A-OLED manual for D-MPGO's unit (#718)**: does the original ATR833-OLED
    on D-MPGO behave as the ATR833A-OLED manual (document 01.1411.010.71e, revision
    3.00) describes? The owner chose that manual because the maker no longer hosts one
    for the original unit; the variant letter is not visible on the face (§3.8.1).
    Trainer uses: the A manual's behaviour for every control on the face. **Assumed
    (unverified)** (§3.8.1).
65. **ATR833 points the A manual leaves open (#718)**: which key leaves a MEM or LST
    list, and does it also do its own job; how long the list time-out is; what an
    unused memory entry holds; whether `LST 00` holds the standby frequency the
    memory list last set; whether memories and the last-used list survive switch-off;
    what a `MEM` hold does outside the memory list; how long the `I/O` press must be;
    whether a cursor field carries into the next when it wraps; where the cursor starts
    after power-on or a swap; which fields the cursor has in 25 kHz spacing.
    Trainer uses: `▲▼` swaps and leaves a list, `MEM` steps from the memory list to
    the last-used list and closes it, any other key leaves the list without its own
    effect, and the frequency knob leaves it and then steps the standby frequency;
    the 12 s line-3 time-out; unused entries are empty and leave the standby
    frequency as it is; `LST 00` holds the last standby frequency the memory list set;
    memories and the last-used list survive; a `MEM` hold outside the memory list
    acts as a short press; any `I/O` press switches on; the cursor fields wrap without
    carry; the cursor starts on the MHz field at power-on and stays where it was on a
    swap; 25 kHz spacing is not modelled (spacing fixed at 8.33 kHz); the defaults
    VOL 10, DIM 10, VOX 05, DWM 00, INT 05, EXT 00 (SQL 05 is the manual's).
    **Assumed (unverified)** (§3.8.1).

66. **TRT800H Auto-On wiring** (#727): is the transponder's Auto-On pin wired to the supply
    behind the Avionics Master (the unit then starts by itself whenever power arrives and
    its `I/O` key does nothing), or left open (the pilot presses `I/O` after every power
    return)? The installation manual asks for the wiring where an avionics master feeds the
    unit (§3.8.2). Trainer uses: left open, so power returning leaves the unit dark until
    `I/O` is pressed, and the trainer's `I/O` steps stay. **Assumed (unverified)**; the
    owner's answer for the COM radio's AUTO ON (question 35) is the nearest evidence.
67. **TRT800H after a power loss** (#727): after the breaker is pulled and pushed back, does
    the unit show the word `VFR` again when its active code equals the VFR code, does the
    unit accept keys at once or only after its start screens (name and versions, then the
    code screen), and how long do those screens last? Trainer uses: codes kept, STBY, no
    `VFR` word, no start screens and no blocked keys. **Assumed (unverified)** (§3.8.2).
68. **aera 500 power loss and return** (#727): when the GPS breaker is pulled or the
    Avionics Master goes off with the aera running, does the unit go dark, or does it
    keep running on its own battery and warn (the guide has a `Power Loss Warning`
    item)? Is a battery fitted in D-MPGO's unit? When power returns, which settings does
    it keep, and how long is the repeat search? Trainer uses: dark at once, backlight and
    map range kept, the full search time again. The return on its own and the database
    page at every switch-on are from the guide; the rest is **assumed (unverified)**
    (§3.8.3, question 38).
69. **FLARM start-up and power loss** (#727): how long does the display's start-up take on
    D-MPGO, is the volume or mode the pilot chose kept across a power loss, and how long
    does the GPS fix take to return? Which switch or breaker, if any, cuts the FLARM in
    flight (question 33)? Trainer uses: the display sheet's start-up sequence at the
    trainer's own step times, Nearest and loud volume on every start, and a fixed search time. The
    start in Nearest at loud volume is from the display sheet; the timings and the
    absence of a breaker are **assumed (unverified)** (§3.8.4).

<!-- prettier-ignore-end -->
