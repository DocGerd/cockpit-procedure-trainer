# @cpt/aircraft-demo

An invented single-engine piston aircraft that exercises the whole aircraft contract: every control kind, every generic widget, two views, four phases, two normal procedures and one emergency.

## Source revision

Fictional aircraft; no handbook.

## Contents

- Controls: battery master, alternator, avionics master, magneto key, starter button, annunciator switch (TEST springs back), fuel selector, throttle, mixture, flaps, guarded fuel shut-off, alternator and avionics breakers.
- Indicators: tachometer, oil pressure, ammeter, low-voltage and oil-pressure lamps, hour meter.
- Views: panel and centre console.
- Systems: core's `electricalBus` and `pistonEngineStart`, plus the gauge values derived from them.
- Failure: `alternatorFailure`, which trips the alternator breaker.
- Phases: parking, holding point, departure, cruise.
- Procedures: `engineStart`, `beforeTakeoff` and the emergency `alternatorFailure`.

Throttle and mixture action targets are only 0 or 1; run-up readings are check items on the tachometer. The rpm ranges, the magneto drop and the oil pressure limits are invented for this aircraft and belong to no real one. Because levers take only the stops 0 and 1 as action targets, the magneto check runs with the throttle at its full stop rather than at a partial-power setting.

This package installs no devices.
