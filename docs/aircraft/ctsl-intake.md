# CTSL intake record

The source every M6 implementer works from. Implementers have no access to the
flight manual; this file carries the facts they need, written in our own words.
Plan: `docs/superpowers/plans/2026-10-06-m6-ctsl.md`. Content rules:
`docs/content-policy.md`.

Nothing here is copied from the handbook: no sentences, tables or drawings. Limits
and speeds are facts restated in our own layout. German appears only as control or
checklist labels, in parentheses. "HB 4-3" means handbook chapter 4, page 3.

## 1. Handbook and aircraft

| Field                   | Value                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aircraft type           | Flight Design CT Supralight (CTSL): high wing, stabilator with anti-tab, tricycle gear, two side-by-side seats, gull-wing doors. Not the CTLS.                                                                                                                                                                                                                                                                                 |
| Handbook                | CT Supralight flight and maintenance manual (Flug- und Wartungshandbuch), document AE04300003, revision 01 of 14 Jan 2010 (revision 00 was 28 Oct 2009).                                                                                                                                                                                                                                                                       |
| Club aircraft           | D-MPGO, Sportfliegerclub Schwetzingen, Herrenteich (EDEH). The handbook copy does not name the registration, and its equipment list and weighing report are factory examples, not D-MPGO's.                                                                                                                                                                                                                                    |
| `handbookRevision` text | `Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)`. The package `README.md` `## Source revision` uses the same words.                                                                                                                                                                                                                                                           |
| Panel wording           | The app and the package call the panel a **representative CTSL panel** drawn from the handbook's description, not a photo of D-MPGO's panel. Aircraft name: "CT Supralight (representative panel)", German "CT Supralight (repräsentatives Panel)". **Superseded 2026-10-10** (§2a): M17 redraws the panel from the owner's photos of D-MPGO; whether the name drops "representative" is open for the owner once M17 T4 lands. |
| Photo survey            | Eight photos of D-MPGO's cockpit taken by the owner on 2026-10-10 and supplied for this intake: the panel from the left seat (four views), the lower centre field and console, the console between the seats aft to the bulkhead, and the two wing-root fuel sight gauges. Local-only: no photo, crop or derived image is in the repo. Findings in §3.7, answers in §9.                                                        |

## 2. Owner decisions (2026-10-06)

1. **Panel variant: analog gauges with a panel-mounted handheld GPS** (the handbook's
   first variant, HB 7-16). Avionics: COM radio Garmin SL40, Mode A/C transponder
   Garmin GTX 327 with an altitude encoder, GPS Garmin GPSMAP 496. Where the handbook
   leaves an item optional, the analog variant's default is taken and flagged (§9).
2. **No club photos.** View backgrounds, outside views and artwork are drawn for
   this project from the descriptions below and labelled a representative CTSL
   panel. No photos, scans, handbook drawings or manufacturer artwork in the repo.
   Outside views are first-person from the left seat.
3. **Engine (912 UL or ULS) and rescue system are unknown.** The most conservative
   limits apply (§4) and each is an open question (§9).
4. **Handbook contradictions:** the conservative value or step is used (§8) and
   each is listed for the instructor.
5. **Checklists in the club's own words**, English with German control labels as
   the app already does. The package states the handbook revision. Glider and
   banner tow procedures are out of scope, although the club aircraft has a tow
   coupling.

Decision 1 is superseded in part by §2a: the trainer keeps these three devices
until milestone M18 replaces them.

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

## 3. Panel inventory (analog variant; superseded in part 2026-10-10, §2a)

The panel has three fields: upper left, upper right, and a narrow lower centre
column. An engine control unit sits on the centre console below it. Everything is
laid out for the left seat (pilot in command). The trainer draws three views:
`panel` (both upper fields), `centre` (lower centre field) and `console` (the
console top down to the rescue handle at its aft end, between the seats).

§3.1 to §3.6 describe the handbook's analog variant as the trainer draws it. The
owner's photos of D-MPGO (§3.7) differ in many places; §3.7.2 lists each
difference against the trainer.

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

### 3.3 Lower centre field (view `centre`), top to bottom

- Rocker-switch row, left to right: **Avionics Master** (larger; checklist label
  Avionik), Beacon Light,
  Position Light, Intercom, Cockpit Light, Landing Light. A placard under the row
  says to switch the avionics off before engine start and stop.
- Below the row: 12 V socket (left), intercom panel (centre), an audio-source
  selector and audio jack (right). Background drawing only.
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
  For the key going in and out under the handle, see the ignition key below.
- Flap selector (Klappenwahlschalter), a rotary knob centre right, detents
  −12°, 0°, 15°, 30°, 35°, with an overtravel position beyond each end detent
  ("up" past −12°, "down" past 35°) for the manual override.
- Ignition key switch with starter (Zündschalter), bottom left, labelled
  "Ignition": OFF, left circuit, right circuit, both, START (springs back to both).
  The dial legends cannot be read in the handbook's figure (HB 7-18); its restart
  item names the both position 1 + 2 (HB 3-5), which points to numbered positions
  (§9, question 8).
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
  second candidate.
- **Carb heat** (Vergaservorwärmung): pulled to apply (HB 4-11, 4-13); named in
  seven checklists and on the take-off placard, but no figure or text shows the
  control (§9, question 3).
- **Rescue-system handle** (Rettungsgerät): on the centre console between the
  seats, at the main bulkhead, low at the console's aft end (HB 3-4, 7-13; the
  passenger briefing calls it the handle on the centre shelf, HB 4-5). It pulls a
  cable to the rocket. Deploy by pulling it forward, hard, to the stop (HB 3-4).
  Secured on the ground by a pin through the release lever (HB 8-1). The rocket and
  canopy sit in the upper compartment behind the bulkhead (HB 7-13).
- Not modelled as a control: the large knob aft of the parking-brake valve
  (drawn as artwork only). Not modelled: the fire extinguisher (pocket behind
  the passenger seat), the fuel dipstick.

What the trainer draws today, and where it departs from the above:

- The console is drawn from above, forward up and the pilot's seat on the left
  (#534). The trim wheel, CHOKE, THROTTLE and BRAKE lie side by side in that
  order, left to right; the order is **assumed (unverified)** (§9, question 31).
  Each slides up (forward) and down (aft) in its own slot with its legend strip
  beside it: the throttle pushes up to FULL, the brake and choke pull down to ON,
  and the trim wheel's rim shows in a fore-and-aft slot with its indicator beside
  it, DOWN forward. The parking-brake valve sits aft of the lever row, below the
  brake lever.
- The throttle prints FULL at the forward end and IDLE at the aft end, as the
  aircraft does (#531). Its title THROTTLE is assumed (unverified): the handbook
  check gives the end legends, not the title. The handbook treats the throttle as
  continuous; the trainer keeps it stepped, with three trainer stops between the
  ends (low, run-up and cruise power) that drive the rpm model and the procedures.
  The trainer marks them with unworded detent ticks, which the aircraft's strip
  does not have. Cues name those stops in words, not as printed legends.
- The trim placard prints DOWN at the forward end and UP at the aft end, with no
  neutral mark, as the aircraft does (#532). Its title TRIM is assumed
  (unverified): the handbook check gives the end legends, not the title. The
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
  **Superseded 2026-10-10** (§2a, decision 1): "Off", "Brake", "On" as above.
- The large knob is drawn as unlabelled artwork, not a control, until its
  identity is known (§9, question 10). It stands directly aft of the valve (#535).
- The provisional carb-heat pull knob stands outboard of the lever row, on the
  right-seat side of the console top, clear of the lever row and the large knob;
  this place is **assumed (unverified)** (§9, question 3).
- The rescue handle sits low at the console's aft end, between the seats, on a
  recessed shelf beside the valve at the bulkhead (#535). The large knob holds the
  column aft of the valve, so the handle is drawn a little to the pilot's side of the
  console's centreline, not on it; that offset is a trainer compromise. Pulled, it
  slides forward (up the top view) to the stop at its guide block; the safety pin
  goes across the guide block through the release lever. Its description and the E2
  pull item say forward, hard, to the stop. The T-grip, the plate's RESCUE and
  PULL HARD with its forward chevrons, a pin with a ring and no flag, and the
  handle's place across the shelf are **assumed (unverified)** (§9, question 26).

### 3.5 Not in the analog variant

No EFIS/EMS (Dynon D180), no autopilot, no fuel quantity gauge (sight tubes at the
wing roots and a dipstick only), no ammeter or voltmeter (D-MPGO has a
voltmeter, §3.7; M17 T4 adds it), no outside air
temperature readout. The altitude encoder feeds the transponder and has no
controls.

### 3.6 Electrical bus map

| Source or consumer  | Protection                    | Fed from                       |
| ------------------- | ----------------------------- | ------------------------------ |
| Battery 12 V, 7 Ah  | BAT switch-breaker 25 A       | to the main bus                |
| Generator (≤ 250 W) | GEN switch-breaker 30 A       | to the main bus, via rectifier |
| Flaps               | flap breaker 8 A              | main bus                       |
| Beacon/strobe       | 5 A, Beacon rocker            | main bus                       |
| Position lights     | 2 A, Position rocker          | main bus                       |
| Intercom            | 2 A, Intercom rocker          | main bus                       |
| Landing light       | 10 A, Landing rocker          | main bus                       |
| Cockpit light       | rocker (no own breaker shown) | main bus                       |
| 12 V outlet         | 3 A                           | main bus                       |
| Avionics bus        | Avionics Master rocker        | main bus                       |
| COM radio           | 5 A                           | avionics bus                   |
| Transponder         | 3 A                           | avionics bus                   |
| GPS                 | 3 A                           | avionics bus                   |

- The ignition is independent of the electrical system: the engine keeps running
  with BAT and GEN off (HB 3-7). The starter needs the main bus.
- The charge warning lamp lights when the bus is powered and the generator is not
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
"VOL/SQL", "DW" and arrows, an active and a standby frequency, a volume line)
and a funkwerk transponder (right; printed "ATC", keys "I/O", "VFR", "ID",
"MODE" and arrows, a code, a flight-level and a "STBY" line). Model names not
legible.

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
  letters.
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

## 4. Limits and values used by the trainer

Conservative choices per owner decisions 3 and 4, and owner rulings of §2a, are
in **bold**. Phase presets
feed `Environment` in knots and feet; the conversions are given so no implementer
converts. Altitudes are above the field; the trainer models no real aerodrome.

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

| Gauge              | Scale used           | Markings                                                     |
| ------------------ | -------------------- | ------------------------------------------------------------ |
| Airspeed (km/h)    | 40–340               | white 72–115, green 94–245, yellow 245–300, red line **300** |
| Tachometer (rpm)   | 0–7000               | green 1400–5500, yellow 5500–5800, red line 5800             |
| Oil pressure (bar) | 0–10                 | red below 0.8, yellow 0.8–2, green 2–5, red line 5           |
| Oil temp (°C)      | 40–150               | yellow 50–90, green 90–110, yellow 110–130, red line **130** |
| CHT (°C)           | 40–150               | green 50–120, red line **120**                               |
| Vertical speed     | ±2000 ft/min         | none                                                         |
| Altimeter (ft)     | implementer's choice | none                                                         |

The handbook gives only the airspeed arcs and the red lines; the other arcs are
derived from the limits table above, not copied markings.

**Trainer uses (2026-10-10, §2a decision 3):** the airspeed dial of the photos,
40 to 340 km/h with numbers every 20; the yellow arc from 245 to the red line at
300 km/h; VNE 300 km/h (162 kt). The green arc's upper end (245) matches the
photo; the white arc and the green arc's lower end are not legible in the photos,
so 72–115 and 94 stay. The vertical speed indicator reads thousands of feet per
minute, 0 to 2 each way with half steps: the trainer scale is ±2000 ft/min with
ticks every 500. Systems may keep metres per second internally; the gauge shows
ft/min (1 m/s ≈ 197 ft/min).

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
| `linedUp`         | yes       | 0   | 0              | as `holding` after N6: parking brake released, flaps 15°, pin out, transponder ALT |
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
off while taxiing out and at the holding point until N6 sets it, at ALT from line-up through `taxiIn`, and
at standby in `parkingSecuring`; the landing light is on from the approach until N15
switches it off; the vertical speed indicator shows about +3 m/s in `departure` and
about −2 m/s in `approach` (on the ft/min dial of §4.3, about +600 and −400 ft/min). The phase entry seeds device state as well as device
controls (#476): the transponder squawks 7000 (German VFR, SERA) from `linedUp`
through `parkingSecuring`, and the GPS is on at its map page from `linedUp` through
`taxiIn`; both assumed (unverified). Before that the two stay at their power-on state.
The GPS also starts with its position fix in those phases, so the map page shows ground
speed and track (taken from the airspeed and heading) at once; switched on by hand it
searches first. The fix and the ground speed and track it shows are assumed (unverified).

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
after 20–30 s; oil pressure rising within 10 s; GEN in; Avionics Master on; intercom on
(trainer addition, assumed, §9 question 32); flaps to the taxi setting (0°).
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
transponder on, standby _(action: set the GTX 327 mode to standby, then a check that it is
powered and at standby)_; GPS on (trainer addition, assumed, §9 question 32); choke
off; carb heat off; throttle to 4000 rpm; engine gauges in the green; ignition left:
drop at most 300 rpm; both; right: drop at most 300 rpm, difference at most 120 rpm;
both; oil temperature at least 51 °C; charge lamp out; throttle idle; flaps 15°; trim
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
accidental ELT activation _(confirm)_.

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
charge-lamp check and the flap reset: charge lamp lit; GEN out, then in once; lamp
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
8. **Ignition key labels**: OFF / 1 / 2 / 1+2 / START or L / R / BOTH? Uses
   OFF, L, R, BOTH, START.
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
   superseded (M17 T4).
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
    large knob; "drawn as artwork" is superseded (M17 T2, #536).
11. **Propeller**: ground-adjustable, hydraulic in-flight adjustable or ECS
    constant speed? Uses ground-adjustable (no cockpit control).
    **Photo survey 2026-10-10 (§3.7):** not visible: no propeller control in the
    cockpit photos, which fits the trainer's ground-adjustable propeller; the
    propeller itself is not identified. No change to the rpm model follows from the
    photos.
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
    not legible).
14. **Avionics as installed**: the units, their software versions and the pilot's
    guide revisions for SL40, GTX 327 and GPSMAP 496; any later changes (e.g. a
    Dynon retrofit) or handbook supplements on board.
    **Photo survey 2026-10-10 (§3.7):** partly answered. Installed: a FLARM display,
    a Garmin GPS whose plate reads like aera 500, a funkwerk COM radio and a
    funkwerk transponder (printed "ATC"); model names and software versions not
    legible. **Contradicts current trainer** (SL40, GTX 327, GPSMAP 496; decision 1
    of §2).
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
    (§2a): no panel compass.
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
    (§5): intercom on while the engine runs, transponder ALT from line-up to taxi-in
    and standby once parked, squawk 7000 from line-up and the GPS on at its map page
    from line-up to taxi-in (#476), landing light on from the approach until N15, vertical
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
    low, run-up and cruise stops are unprinted. The THROTTLE title is assumed
    (unverified).
    Trim legends (#532): the placard prints DOWN forward and UP aft, with no
    neutral mark; the trainer's neutral position has no printed legend. The TRIM
    title is assumed (unverified). The trainer's half-down and half-up stops
    (#620) are assumed (unverified) and have no printed legend; the trainer's
    unworded tick at every stop, neutral included, is a trainer departure.
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
