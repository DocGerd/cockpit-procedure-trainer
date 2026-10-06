# @cpt/aircraft-ctsl

The club's Flight Design CT Supralight (CTSL), analog panel variant with a panel-mounted handheld GPS. The panel is a **representative CTSL panel** drawn for this project from the handbook's description, not a photo of the club aircraft's panel. The app names it "CT Supralight (representative panel)".

Every fact in this package (limits, speeds, steps, labels) comes from the intake record, [`docs/aircraft/ctsl-intake.md`](../../docs/aircraft/ctsl-intake.md), which also lists the open questions for the club and the instructor.

## Source revision

Flight Design CT Supralight flight and maintenance manual AE04300003, revision 01 (14 Jan 2010)

## Contents

- Views: `panel` (both upper fields: flight gauges, charge lamp, the device slots for COM radio, transponder and GPS, engine gauges, breaker block), `centre` (the lower centre field: rocker row, ELT remote, flap readout and breaker, fuel valve, flap selector, ignition key, BAT and GEN) and `console` (brake, throttle, choke, parking-brake valve, carb heat, trim wheel, rescue-system handle).
- Controls: eight panel breakers (COM, transponder, GPS, position lights, strobe, landing light, intercom, 12 V outlet), six rockers (Avionics Master, beacon, position lights, intercom, cockpit light, landing light), the ELT remote switch, the flap breaker, the fuel valve (Brandhahn), the flap selector with its two override positions, the ignition key with START springing back to BOTH, the BAT and GEN push-pull switches, the console levers with named notches, the parking-brake valve and the rescue handle guarded by its safety pin.
- Carb heat is a provisional console control: the handbook names it in its checklists but shows no knob (intake §9).
- Indicators: airspeed (km/h), altimeter (ft), vertical speed (m/s), tachometer, oil pressure (bar), oil temperature and CHT (°C), the charge warning lamp, the flap position readout and the ELT lamp. Arcs and red lines follow intake §4.3.
- Failures: `generatorFailure`, `engineStoppage`, `engineFire`, `coolantLoss`, `oilLoss`, `flapControlFailure`.
- Phases, in flight order: parking, holding point, departure, cruise, approach, landing, taxi in, parking and securing, with the presets of intake §5. Each outside view is drawn first-person from the left seat.
- Systems: the state shape and entry snapshots. The behaviour of the electrical system, engine, flaps, brakes and failures follows in #39.

The second warning lamp of the upper-left field, the compass, the slip ball, the placards, the intercom panel, the jacks, the 12 V socket and the blank D-180 and autopilot breaker positions are drawn in the background and not modelled.

## Planned procedures

Normal (#40):

| Id              | Intake  |
| --------------- | ------- |
| `preflight`     | N1      |
| `engineStart`   | N3, N5  |
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

Emergency (#41):

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

Avionics (#211): `radioAndTransponder` at the holding point.

## Not trained

- Spin (E1), and the stall and rollover guidance: the trainer has no flight-dynamics model.
- EMS failure (E10): the analog variant has no EMS.

## Planned devices

All three sit in the `panel` view, on the avionics bus, each behind its own breaker:

- `com`: Garmin SL40 COM radio (#210)
- `xpdr`: Garmin GTX 327 transponder, fed by the altitude encoder (#211)
- `gps`: Garmin GPSMAP 496 in its cradle (#212)

Until they are installed, the panel shows the empty bezels. The intercom and the ELT remote are aircraft controls, not devices.
