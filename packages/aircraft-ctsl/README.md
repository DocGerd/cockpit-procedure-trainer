# @cpt/aircraft-ctsl

The club's Flight Design CT Supralight (CTSL), analog panel variant with a panel-mounted handheld GPS. The panel is a **representative CTSL panel** drawn for this project from the handbook's description, not a photo of the club aircraft's panel. The app names it "CT Supralight (representative panel)".

Every fact in this package (limits, speeds, steps, labels) comes from the intake record, [`docs/aircraft/ctsl-intake.md`](../../docs/aircraft/ctsl-intake.md), which also lists the open questions for the club and the instructor.

## Source revision

Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)

## Contents

- Views: `panel` (both upper fields: flight gauges, charge lamp, the three device slots, engine gauges, breaker block), `centre` (the lower centre field: rocker row, ELT remote, flap readout and breaker, fuel valve, flap selector, ignition key, BAT and GEN) and `console` (seen from above, forward up: trim wheel and indicator, choke, throttle and brake side by side, each sliding fore and aft; the parking-brake valve aft of them, the large knob aft of the valve as unlabelled artwork; carb heat; the rescue-system handle low at the aft end, between the seats, pulled forward).
- Controls: eight panel breakers (COM, transponder, GPS, position lights, strobe, landing light, intercom, 12 V outlet), six rockers (Avionics Master, beacon, position lights, intercom, cockpit light, landing light), the ELT remote switch, the flap breaker, the fuel valve (Brandhahn), the flap selector with its two override positions, the ignition key, out of the lock when parked, inserted and removed only at OFF, with START springing back to 1+2, the BAT and GEN push-pull switches, the console levers (throttle and trim with unprinted trainer stops between their printed ends), the parking-brake valve and the rescue handle guarded by its safety pin.
- Carb heat is a provisional console control: the handbook names it in its checklists but shows no knob (intake §9).
- Indicators: airspeed (km/h), altimeter (ft), vertical speed (m/s), tachometer, oil pressure (bar), oil temperature and CHT (°C), the charge warning lamp, the flap position readout (blinking while the flaps travel or an airspeed hold keeps them back) and the ELT lamp. Arcs and red lines follow intake §4.3.
- Failures: `generatorFailure`, `engineStoppage`, `engineFire`, `coolantLoss`, `oilLoss`, `flapControlFailure`. Each shows on the panel within seconds: an engine fire also lays smoke over the outside view (`src/outside-cues.ts`) and heats the CHT and oil temperature; a flap control failure trips the flap breaker, which darkens the flap readout (both assumed, intake §9).
- Phases, in flight order: parking, taxi out, holding point, lined up on the runway, departure, cruise, approach, landing, taxi in, parking and securing, with the presets of intake §5. Each outside view is drawn first-person from the left seat. All phases share the airfield of `src/airfield.ts` (runway 36): the holding point is at a right angle to it with the wind from the left, and the lined-up, departure, approach and landing phases are on the runway heading. The take-off and short take-off start lined up and open with a check of the compass against the runway heading. The magnetic compass is an indicator: each phase enters facing its heading, and the card turns to show it.
- Systems: the electrical system, engine, fuel valve, flaps, brakes and every failure above. Values the intake does not give are trainer assumptions, named as constants in `src/systems.ts`.

The second warning lamp of the upper-left field, the slip ball, the take-off and limits knee-board placards, the intercom panel, the jacks, the 12 V socket and the blank D-180 and autopilot breaker positions are drawn in the background and not modelled.

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

Avionics: `radioAndTransponder` at the holding point.

## Not trained

- Spin (E1), and the stall and rollover guidance: the trainer has no flight-dynamics model.
- EMS failure (E10): the analog variant has no EMS.

## Open questions

- The phase start states the intake marks as assumed (intake §5): intercom, transponder mode, landing light and vertical speed per phase.
- The transponder squawk code and the GPS state are seeded per phase (`src/phases.ts`, intake §5): squawk 7000 from lined up on, the GPS on at its map page with a position fix from lined up through taxi in; before that both stay at their power-on state (#476, #501).

## Devices

All three are on the avionics bus, each behind its own breaker, and installed in the `panel` view, where each slot mirrors its unit; activating a slot opens the operable unit in the device dock.

- `com`: Garmin SL40 COM radio, in `panel`
- `xpdr`: Garmin GTX 327 transponder, fed by the altitude encoder, in `panel`
- `gps`: Garmin GPSMAP 496, in `panel`

The intercom and the ELT remote are aircraft controls, not devices.
