# CTSL intake record

The source every M6 implementer works from. Implementers have no access to the
flight manual; this file carries the facts they need, written in our own words.
Plan: `docs/superpowers/plans/2026-10-06-m6-ctsl.md`. Content rules:
`docs/content-policy.md`.

Nothing here is copied from the handbook: no sentences, tables or drawings. Limits
and speeds are facts restated in our own layout. German appears only as control or
checklist labels, in parentheses. "HB 4-3" means handbook chapter 4, page 3.

## 1. Handbook and aircraft

| Field                   | Value                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aircraft type           | Flight Design CT Supralight (CTSL): high wing, stabilator with anti-tab, tricycle gear, two side-by-side seats, gull-wing doors. Not the CTLS.                                                                                                      |
| Handbook                | CT Supralight flight and maintenance manual (Flug- und Wartungshandbuch), document AE04300003, revision 01 of 14 Jan 2010 (revision 00 was 28 Oct 2009).                                                                                            |
| Serial on the cover     | E-12-03-06                                                                                                                                                                                                                                          |
| Club aircraft           | D-MPGO, Sportfliegerclub Schwetzingen, Herrenteich (EDEH). The handbook copy does not name the registration, and its equipment list and weighing report are factory examples, not D-MPGO's.                                                         |
| `handbookRevision` text | `Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)`. The package `README.md` `## Source revision` uses the same words.                                                                                |
| Panel wording           | The app and the package call the panel a **representative CTSL panel** drawn from the handbook's description, not a photo of D-MPGO's panel. Aircraft name: "CT Supralight (representative panel)", German "CT Supralight (repräsentatives Panel)". |

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

## 3. Panel inventory (analog variant)

The panel has three fields: upper left, upper right, and a narrow lower centre
column. An engine control unit sits on the centre console below it. Everything is
laid out for the left seat (pilot in command). The trainer draws four views:
`panel` (both upper fields), `centre` (lower centre field), `console` and
`bulkhead` (the rescue handle between the seats, behind the console).

### 3.1 Upper-left field (view `panel`)

- Round airspeed indicator, left. Altimeter right of centre, a smaller vertical
  speed indicator between them at the top. A slip ball below, between airspeed and
  VSI (drawn in the background; not an indicator).
- Two round warning lamps at the top centre. One is the charge warning lamp
  (Ladekontrolle), driven by the generator rectifier. The second is unidentified
  for this variant (§9) and is drawn unlit in the background. The charge lamp's
  legend and colour are assumed (§9, question 22).
- COM radio, then transponder below it, stacked in the lower centre of the field
  (device slots).
- Two placards at the far left: a short take-off checklist and a limits placard.
  Draw them as placards with our own short wording, not the handbook's.

### 3.2 Upper-right field (view `panel`)

- GPS in its cradle in the centre (device slot).
- Below it, four round engine gauges in a row: a larger tachometer on the left,
  then oil pressure, oil temperature and cylinder head temperature (CHT).
- A small item at the top left next to the type name: probably the magnetic
  compass. The trainer models it as an indicator that reads the heading of each
  phase from the airfield of `src/airfield.ts`. Its type, card sense and size are
  assumed (§9, question 20); the type name is not printed.
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
  thermal), then two headset emergency jacks (background).
- Fuel valve (Brandhahn), left: a vertical slide lever, open up, closed down.
  When closed, its handle covers the ignition key slot. Assumed (unverified),
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
  The key goes in and comes out at OFF, and comes out only with the fuel valve
  fully closed (E6). Assumed (unverified), from the handle covering the slot and
  N3's order (#468): the key goes in only with the valve open (§9, key and fuel valve cover).
- Master plate, bottom right: two round push-pull breaker switches, **BAT** (25 A,
  master switch, Hauptschalter) and **GEN** (30 A, generator, Generatorschalter).

### 3.4 Centre console (view `console`)

- Horizontal push-pull levers, top to bottom: **BRAKE** (off/on, the single
  hydraulic brake lever, Bremshebel; non-locking: it brakes only while held and
  springs back when released, owner ruling #465), **THROTTLE** (idle/full, Gashebel),
  **CHOKE** (off/on). The trainer draws the console as the left seat sees its
  flank, so forward is to the left: the throttle pushes left to full, and the
  brake and choke pull right, toward the pilot, to on (§9, question 25).
- **Stabilator trim wheel** (Trimmrad) with its indicator beside it; forward is
  nose down. The trainer draws the wheel's rim in its slot with the indicator
  scale above it, nose down to the left (§9, question 25).
- **Parking-brake valve** (Rückflusshahn), a small lever labelled "Brake", right of
  the throttle group. Parking brake: close the valve, then pull and release the
  brake lever; the valve traps the pressure, which holds until the valve is opened.
  Assumed (unverified): closing the valve while the lever is held traps it as well.
- **Carb heat** (Vergaservorwärmung): named in seven checklists and on the take-off
  placard, but the handbook shows no control. The trainer adds a provisional
  pull knob on the console (§9).
- **Rescue-system handle** (Rettungsgerät), on the main bulkhead between the seats,
  secured on the ground by a safety pin. Pull hard and far forward to deploy.
  The trainer draws it in its own view, `bulkhead`, behind the console (§9,
  question 26).
- Not modelled: the large unlabelled knob right of the parking-brake valve (§9),
  the fire extinguisher (pocket behind the passenger seat), the fuel dipstick.

### 3.5 Not in the analog variant

No EFIS/EMS (Dynon D180), no autopilot, no fuel quantity gauge (sight tubes at the
wing roots and a dipstick only), no ammeter or voltmeter, no outside air
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

## 4. Limits and values used by the trainer

Conservative choices per owner decisions 3 and 4 are in **bold**. Phase presets
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
| **VNE (Junkers High Speed, the lowest)**  | **260**         | **140**      |
| Max range cruise (4300 rpm)               | 180             | 97           |
| Level flight, flaps −12°, 5500 rpm (VH)   | 240             | 130          |

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
| Airspeed (km/h)    | 40–300               | white 72–115, green 94–245, yellow 245–260, red line **260** |
| Tachometer (rpm)   | 0–7000               | green 1400–5500, yellow 5500–5800, red line 5800             |
| Oil pressure (bar) | 0–10                 | red below 0.8, yellow 0.8–2, green 2–5, red line 5           |
| Oil temp (°C)      | 40–150               | yellow 50–90, green 90–110, yellow 110–130, red line **130** |
| CHT (°C)           | 40–150               | green 50–120, red line **120**                               |
| Vertical speed     | ±5 m/s               | none                                                         |
| Altimeter (ft)     | implementer's choice | none                                                         |

The handbook gives only the airspeed arcs and the red lines; the other arcs are
derived from the limits table above, not copied markings.

### 4.4 Fuel, flaps, masses

- Two wing tanks, 65 l each. **Usable 124 l (62 per side)** (§8). Each tank has a
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
  take-off. Rudder and aileron tabs are ground-adjustable only.
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
about −2 m/s in `approach`. The phase entry seeds device state as well as device
controls (#476): the transponder squawks 7000 (German VFR, SERA) from `linedUp`
through `parkingSecuring`, and the GPS is on at its map page from `linedUp` through
`taxiIn`; both assumed (unverified). Before that the two stay at their power-on state.

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
after 20–30 s; oil pressure rising within 10 s; GEN in; Avionics Master on; flaps
to the taxi setting (0°). Before the first start of the day turn the prop by hand;
if the aircraft rolls during start, ignition off.

**N4 Warm-up (HB 4-6, 4-7; no checklist in the handbook).** About 2000 rpm for
2 min, then 2500 rpm; raise rpm only above 2 bar oil pressure; ready at 50 °C oil.

**N5 Taxi (HB 4-3).** Brakes checked; nose-wheel steering checked (both confirm).

**N6 Before take-off and run-up (Vor dem Start, HB 4-3, 4-4).** Parking brake set;
belts fastened; doors closed; controls free; altimeter to QNH _(confirm)_;
transponder on, standby (a check on the GTX 327 mode); choke off; carb heat off; throttle to 4000 rpm; engine
gauges in the green; ignition left: drop at most 300 rpm; both; right: drop at most
300 rpm, difference at most 120 rpm; both; oil temperature at least 51 °C; charge
lamp out; throttle idle; flaps 15°; trim neutral; radio set _(confirm)_; rescue system armed,
pin removed (Rettungsgerät entsichert) _(confirm)_; ELT armed (Notsender); passenger briefed _(confirm)_;
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
system secured, pin in (gesichert) _(confirm)_; ELT checked and left armed (§9); chocks
_(confirm)_.

## 7. Emergency procedures (our wording)

**E1 Spin (HB 3-1, 3-3).** Controls neutral; full opposite rudder; once rotation
stops, reduce power and pull out gently. If recovery fails or height is short, use
the rescue system. _Not trained in M6: no flight-dynamics model._

**E2 Rescue system (HB 3-1, 3-4, 3-5).** Ignition off (so the prop cannot damage
the chute); pull the handle hard and far until the rocket fires; fuel valve closed;
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
| VNE                           | 276 BRS / 260 Junkers High Speed / 300 Junkers Light Speed or none (HB 2-1, 7-20) | rescue system unknown                                           | 260 km/h                                                                                       |
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
2. **Rescue system**: BRS 1050, Junkers High Speed or Junkers Light Speed? Uses
   VNE 260 km/h and the yellow arc 245–260.
3. **Carb heat**: does D-MPGO have a carb-heat control, and where? Uses a
   provisional pull knob on the console, off/on.
4. **Engine fire ending**: the handbook allows a rescue deployment at about 200 m
   after the flames die; the same page forbids it with fire on board. Uses: never
   deploy, emergency landing.
5. **Every contradiction in §8**: please confirm the value in the last column.
6. **Generator failure procedure**: club-authored (§7); please confirm or replace.
7. **ELT at shutdown**: off or left armed? Uses armed.
8. **Ignition key labels**: OFF / 1 / 2 / 1+2 / START or L / R / BOTH? Uses
   OFF, L, R, BOTH, START.
9. **Second warning lamp** at the top of the upper-left field: what is it in the
   analog variant? Drawn unlit, not modelled.
10. **Large knob** right of the parking-brake valve: cabin heat, propeller, other?
    Not modelled.
11. **Propeller**: ground-adjustable, hydraulic in-flight adjustable or ECS
    constant speed? Uses ground-adjustable (no cockpit control).
12. **Trim wheel position**: left of the throttle (text) or below the choke
    (photo)? Uses below the choke.
13. **Cockpit-light switch**: present on the panel but absent from the wiring
    diagram. Modelled as a main-bus consumer.
14. **Avionics as installed**: the units, their software versions and the pilot's
    guide revisions for SL40, GTX 327 and GPSMAP 496; any later changes (e.g. a
    Dynon retrofit) or handbook supplements on board.
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
    down from it between the seats.
20. **Compass**: panel compass with a reversed card in a narrow window, or a
    vertical card? Its size and exact mount (panel or windscreen frame)? Today: a
    small round panel compass at the top left of the upper-right field, no larger
    than the vertical speed indicator; its reversed card shows through a window at
    the top of the housing, numbers increasing to the left. **Answered by
    assumption pending owner verification** (#444). Assumed (unverified), from general knowledge of the CT
    Supralight: a panel-mounted magnetic compass with a reversed card read in a
    window, mounted in the panel (not on the windscreen frame), no larger than the
    vertical speed indicator.
21. **ELT remote switch legends**: what does the remote panel print beside its
    positions (for example ON and ARM, or a TEST or RESET position), and what
    colour is its lamp? Today: a toggle on a small remote plate printed "ELT",
    ON up and ARM down, its lamp beside it, red. **Answered by assumption pending
    owner verification** (#447). Assumed (unverified), from general knowledge of
    the CT Supralight: the remote plate prints ELT, ON (up) and ARM (down), with no
    TEST or RESET position; the lamp lights red while the ELT transmits.
22. **Charge lamp legend**: does the charge warning lamp carry a printed legend,
    and in which colour does it light? Today: a round red lamp with the legend
    CHARGE printed below it; the second lamp is round at the same size, without a
    legend. **Answered by assumption pending owner verification** (#444). Assumed
    (unverified), from general knowledge of the CT Supralight: the charge lamp
    lights red and the panel prints CHARGE with it.
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
    inside the leading block; does the club drill it so?

24. **Phase start states**: which switches does the club have on in each phase? Today
    (§5): intercom on while the engine runs, transponder ALT from line-up to taxi-in
    and standby once parked, squawk 7000 from line-up and the GPS on at its map page
    from line-up to taxi-in (#476), landing light on from the approach until N15, vertical
    speed climbing in `departure` and descending in `approach`. No procedure step
    switches the landing light on (N12 says "as needed"), so the approach, landing
    and `taxiIn` entries carry it. **Answered by assumption pending owner
    verification** (#466). Assumed (unverified), from general-aviation practice;
    the day-VFR-only rulings (cockpit light off, avionics and beacon on) are the
    owner's.
25. **Console lever and trim geometry**: do BRAKE, THROTTLE and CHOKE travel
    fore and aft, which way does each apply (brake and choke on when pulled?),
    what handles do they carry, and where does the trim indicator sit relative to
    the wheel? Today: three horizontal levers stacked top to bottom, drawn as the
    left seat sees the console's flank, forward to the left; the throttle pushes
    forward to full, the brake and choke pull aft to on; the trim wheel's rim
    shows in a slot below the choke with its indicator scale above it, nose down
    forward. **Answered by assumption pending owner verification** (#449).
    Assumed (unverified), from general knowledge of the CT Supralight: the three
    levers slide fore and aft; push is forward, so full throttle is forward and
    the brake and choke apply when pulled toward the pilot; the trim wheel turns
    fore and aft, forward nose down, with its indicator beside it.
26. **Rescue handle on the bulkhead**: how high and where across the main
    bulkhead does the handle sit, what shape is its grip, and where does the
    safety pin go? Today: a T-grip in a holder centred on the bulkhead between
    the two seat backs, the safety pin through the holder above the grip, the
    holder printed RESCUE and PULL HARD. **Answered by assumption pending owner
    verification** (#449). Assumed (unverified), from general knowledge of the CT
    Supralight: the handle sits centred between the seats on the bulkhead behind
    them, at about shoulder height, reached back over the shoulder; the pin goes
    through the holder and carries a remove-before-flight flag.
27. **Key and fuel valve cover**: can the key go in while the closed valve's handle
    covers the slot, and does N16 close the valve? Today: the key is out in
    `parking`; it comes out only with the valve fully closed (E6, a handbook fact);
    it goes in only with the valve open, and the closed valve holds a key at OFF;
    N16 closes the valve after BAT out so the key can come out, leaving the aircraft
    as `parking` has it. **Answered by assumption pending owner verification**
    (#468). Assumed (unverified), from the handle covering the slot and N3's order
    (fuel valve open, then key in).
28. **Engine fire cues**: what does the pilot perceive first? Today: smoke from the
    engine bay streams over the windscreen in the outside view, and the CHT and oil
    temperature climb past their red lines within seconds while the fire burns; both
    clear once the valve is closed and the engine has stopped. **Answered by
    assumption pending owner verification** (#233). Assumed (unverified), from
    general-aviation practice: smell and smoke come first, and a fire in the engine
    bay heats the CHT and oil sensors; the size of the rise is a trainer value.
29. **Flap control failure cue**: what shows on the panel when the flap controller
    fails? Today: the failure trips the flap breaker (8 A, thermal), the flap
    position readout on that circuit goes dark, and with the breaker reset the readout
    stays put whatever the selector says. **Answered by assumption pending owner
    verification** (#233). Assumed (unverified), from the overload note of E9 and the
    wiring of §4: the readout is fed through the flap breaker, and a failed controller
    overloads the drive until the breaker trips.
30. **Flows**: which procedures does the club open with a panel scan done from
    memory before the checklist is read, and in which order? Today: three, each
    verified by the §6 items that follow it. **Answered by assumption pending
    owner verification** (#453). Assumed (unverified), from general-aviation
    practice and the CT Supralight panel layout (§3), scanned top to bottom on the
    centre field, then down the console's lever stack and across to carb heat:
    - N3 Engine start: Avionics Master off; Beacon on; fuel valve open; BAT in;
      carb heat off.
    - N6 Before take-off: flaps 15°; choke off; trim neutral; carb heat off. The
      parking brake stays out of the flow, since its valve and lever go in order
      (§3.4).
    - N15 After landing: landing light off; flaps 0°; carb heat off.
