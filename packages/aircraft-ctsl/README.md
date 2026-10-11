# @cpt/aircraft-ctsl

The club's Flight Design CT Supralight (CTSL), analog panel variant, drawn from the owner's photos of D-MPGO with D-MPGO's own avionics. No photo is in the repository: the panel and its art are drawn for this project. The app names it "CT Supralight".

Every fact in this package (limits, speeds, steps, labels) comes from the intake record, [`docs/aircraft/ctsl-intake.md`](../../docs/aircraft/ctsl-intake.md), which also lists the open questions for the club and the instructor.

## Source revision

Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)

## Contents

- Views: `panel` (the three upper fields: flight gauges, the four device slots in the upper-centre field, engine gauges, Generator lamp, breaker block; the hour meter, cabin-heat knob and red-cross disc are inert art), `centre` (the lower centre field: rocker row, ELT remote, flap readout and breaker, fuel valve, flap selector, ignition key, BAT and GEN) and `console` (seen from above, forward up: trim wheel and indicator, choke, throttle and brake side by side, each sliding fore and aft; the parking-brake lever in a curved slot on the right side, aft of them; the aileron- and rudder-trim wheels and a parachute placard as inert art; carb heat; the rescue-system handle low at the aft end, centred between the seats, pulled forward).
- Controls: eight panel breakers (Com, Transponder, GPS, Position Light, Beacon Light, Landing Light, Intercom, 12V Outlet), six rockers (Avionics Master, beacon, position lights, intercom, cockpit light, landing light), the ELT remote switch, the flap breaker, the fuel valve (Brandhahn), the flap selector with its two override positions, the ignition key, out of the lock when parked, inserted and removed only at OFF, with START springing back to 1+2, the BAT and GEN push-pull switches, the console levers (throttle and trim with unprinted trainer stops between their printed ends), the parking-brake valve and the rescue handle guarded by its safety pin.
- Carb heat is a provisional console control: the handbook names it in its checklists but shows no knob (intake §9).
- Indicators: airspeed (km/h, 40–340, VNE 300), altimeter (ft), vertical speed (ft/min, ±2000), tachometer, oil pressure (bar), oil temperature and CHT (°C), the voltmeter (9–17 V, a bus voltage assumed by the trainer), the Generator warning lamp, the flap position readout (blinking while the flaps travel or an airspeed hold keeps them back) and the ELT lamp. Arcs and red lines follow intake §4.3.
- Failures: `generatorFailure`, `engineStoppage`, `engineFire`, `coolantLoss`, `oilLoss`, `flapControlFailure`. Each shows on the panel within seconds: an engine fire also lays smoke over the outside view (`src/outside-cues.ts`) and heats the CHT and oil temperature; a flap control failure trips the flap breaker, which darkens the flap readout (both assumed, intake §9).
- Phases, in flight order: parking, taxi out, holding point, lined up on the runway, departure, cruise, approach, landing, taxi in, parking and securing, with the presets of intake §5. Each outside view is drawn first-person from the left seat. All phases share the airfield of `src/airfield.ts` (runway 36): the holding point is at a right angle to it with the wind from the left, and the lined-up, departure, approach and landing phases are on the runway heading. Each phase enters facing its heading; the panel has no compass, and the heading only feeds the GPS track.
- Systems: the electrical system, engine, fuel valve, flaps, brakes and every failure above. Values the intake does not give are trainer assumptions, named as constants in `src/systems.ts`.

The slip indicator, the placards, the hour meter, the cabin-heat knob, the red-cross disc, the 12 V socket, the instrument-light legend and the breaker positions the trainer does not model (Nav, Autopilot, HS34, EFIS, EMS, Cockpit Light, Instrument Light) are drawn in the background and not modelled.

## Procedures

Normal:

| Id              | Intake  |
| --------------- | ------- |
| `preflight`     | N1      |
| `engineStart`   | N3      |
| `taxi`          | N5      |
| `beforeTakeoff` | N6, N2  |
| `takeoff`       | N7      |
| `shortTakeoff`  | N8      |
| `climbCruise`   | N9, N10 |
| `descent`       | N11     |
| `beforeLanding` | N12     |
| `landing`       | N13     |
| `goAround`      | N14     |
| `afterLanding`  | N15     |
| `shutdown`      | N16     |

Warm-up (N4) is no procedure of its own: the holding-point snapshot is warm and `beforeTakeoff` checks the oil temperature.

Emergency:

| Id                     | Intake                         | Failure              |
| ---------------------- | ------------------------------ | -------------------- |
| `engineFailureLow`     | E3 low, E5                     | `engineStoppage`     |
| `engineFailureRestart` | E3 high, E4, E5                | `engineStoppage`     |
| `rescueDeployment`     | E5 first step, E2              | `engineStoppage`     |
| `engineFire`           | E6, E5 without the rescue step | `engineFire`         |
| `coolantLoss`          | E7                             | `coolantLoss`        |
| `oilLoss`              | E8, E5                         | `oilLoss`            |
| `flapControlFailure`   | E9                             | `flapControlFailure` |
| `generatorFailure`     | club-authored                  | `generatorFailure`   |

`generatorFailure` is **club-authored**: the handbook has no such procedure. It awaits the instructor's confirmation.

Avionics: `radioAndTransponder` at the holding point (the COM radio is switched on in `engineStart`).

## Not trained

- Spin (E1), and the stall and rollover guidance: the trainer has no flight-dynamics model.
- EMS failure (E10): the analog variant has no EMS.

## Open questions

- The phase start states the intake marks as assumed (intake §5): intercom, transponder mode, landing light and vertical speed per phase.
- The avionics state is seeded per phase (`src/phases.ts`, intake §5): from lined up through taxi in the transponder is on at ACS squawking 7000, at standby once parked; from lined up through parking and securing the GPS is on its map page with a fix and the FLARM ready with its fix. Before that every unit starts as power finds it (#476, #501).
- The avionics assumptions of intake §9 questions 32 to 39: the GPS start-up step's place, the FLARM supply, the units' generation and set-up.

## Devices

D-MPGO's own units (intake §3.8), all on the avionics bus and installed in the `panel` view, where each slot mirrors its unit; activating a slot opens the operable unit in the device dock. Each slot keeps its mirror's aspect and is at least its natural size, larger than the real unit, so that the mirror lettering stays legible; the GPS slot is the largest the field allows (intake §3.2a). The units sit on the field's light brushed aluminium with no recess or frame of the panel art: each draws its own whole face.

- `com`: funkwerk ATR833-OLED COM radio (`atr833`), behind the Com breaker; the pilot switches it on with I/O (AUTO ON is off)
- `xpdr`: funkwerk TRT800H-OLED transponder (`trt800h`), behind the Transponder breaker, fed by the altitude encoder
- `gps`: Garmin aera 500 in its panel cradle (`aera500`), behind the GPS breaker; it starts with cradle power
- `flarm`: the classic FLARM external LED display (`flarm`), with no breaker of its own (assumed, intake §9 question 33), fed with the bus voltage

The intercom and the ELT remote are aircraft controls, not devices.
