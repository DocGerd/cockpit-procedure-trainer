# @cpt/aircraft-demo

An invented single-engine piston aircraft that exercises every control kind and every generic widget, with three views, four phases, three normal procedures, one emergency and two installed devices.

## Source revision

Fictional aircraft; no handbook.

## Contents

- Controls: battery master, alternator, avionics master, magneto key, starter button, annunciator switch (TEST springs back), fuel selector, throttle, mixture, flaps, guarded fuel shut-off, alternator and avionics breakers.
- Indicators: tachometer, oil pressure, ammeter, low-voltage and oil-pressure lamps, hour meter.
- Views: panel, centre console and radio stack.
- Devices: a generic COM radio (`radio`) and a transponder (`xpdr`), both on the radio stack and powered by the avionics bus. The transponder reads the pressure altitude of the phase.
- Systems: core's `electricalBus` and `pistonEngineStart`, plus the gauge values derived from them.
- Failure: `alternatorFailure`, which trips the alternator breaker.
- Phases: parking, holding point, departure, cruise.
- Procedures: `engineStart`, `beforeTakeoff`, `radioAndTransponder` and the emergency `alternatorFailure`.

Throttle and mixture action targets are only 0 or 1; run-up readings are check items on the tachometer. The rpm ranges, the magneto drop and the oil pressure limits are invented for this aircraft and belong to no real one. Because levers take only the stops 0 and 1 as action targets, the magneto check runs with the throttle at its full stop rather than at a partial-power setting.

The COM knobs step the standby frequency, so `radioAndTransponder` checks the device state after the knob action instead of targeting a frequency. An aircraft depends on core only, so this package's tests install stand-ins for the two devices; the web app's registry tests walk every normal procedure with the real ones.
