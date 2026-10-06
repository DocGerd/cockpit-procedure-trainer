# @cpt/aircraft-demo

An invented single-engine piston aircraft that exercises every control kind and every generic widget, with three views, nine phases covering a whole flight, seven normal procedures, one emergency and two installed devices.

## Source revision

Fictional aircraft; no handbook.

## Contents

- Controls: battery master, alternator, avionics master, magneto key, starter button, annunciator switch (TEST springs back), fuel selector, throttle, mixture, flaps, guarded fuel shut-off, alternator and avionics breakers.
- Indicators: tachometer, oil pressure, ammeter, low-voltage and oil-pressure lamps, hour meter.
- Views: panel, centre console and radio stack.
- Devices: a generic COM radio (`radio`) and a transponder (`xpdr`), both on the radio stack and powered by the avionics bus. The transponder reads the pressure altitude of the phase.
- Systems: core's `electricalBus` and `pistonEngineStart`, plus the gauge values derived from them.
- Failure: `alternatorFailure`, which trips the alternator breaker.
- Phases, in flight order: parking, holding point, lined up on the runway, departure, cruise, approach, landing, taxi in, parking and securing. Each outside view is drawn from the pilot's seat. All phases share the airfield of `src/airfield.ts` (runway 27) as described for the CTSL, and the `takeoff` procedure starts lined up with a compass-versus-runway confirm item. A compass readout on the panel shows the heading of each phase. The engine runs on entry to every phase but the first parking; approach and landing are airborne, landing in the flare.
- Procedures: `engineStart` (parking), `beforeTakeoff` and `radioAndTransponder` (holding point), `takeoff` (lined up), `beforeLanding` (approach), `afterLanding` (taxi in), `shutdownSecuring` (parking and securing) and the emergency `alternatorFailure` (cruise).

Throttle and mixture action targets are only 0 or 1; run-up readings are check items on the tachometer. The rpm ranges, the magneto drop and the oil pressure limits are invented for this aircraft and belong to no real one. Because levers take only the stops 0 and 1 as action targets, the magneto check runs with the throttle at its full stop rather than at a partial-power setting. The approach snapshot has the mixture leaned and the taxi-in snapshot a little taxi power, so `beforeLanding` sets the mixture rich and `afterLanding` checks the taxi rpm on the tachometer.

`shutdownSecuring` ends with the controls of the first parking phase: engine stopped by the mixture, magnetos, alternator, battery and avionics off, fuel selector off. The aircraft has no light switches, so the light items are confirm items.

The COM knobs step the standby frequency, so `radioAndTransponder` checks the device state after the knob action instead of targeting a frequency. An aircraft depends on core only, so this package's tests install stand-ins for the two devices; the web app's registry tests walk every normal procedure with the real ones.
