# @cpt/device-transponder

A generic transponder for the cockpit procedure trainer: mode selection, four-digit
squawk entry, a timed IDENT reply and bus power. It is one avionics unit that any
aircraft can install by id (`transponder`).

## Source revision

Generic unit, no manufacturer manual.

## Controls

- `mode`: rotary with `off`, `stby`, `on`, `alt`.
- `code1` to `code4`: rotary digits `0` to `7`, one per squawk position.
- `ident`: momentary button. In `on` and `alt` it starts the reply flag, which clears after `IDENT_DURATION_MS`.

## Inputs

- `pressureAltitude` (feet): shown in `alt` mode only.

The unit is powered by the install's `powered` condition.

## Display

`transponderScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot
(its bezel is lettered XPDR), a `readout` of what the display shows in German and English,
and the `floor`: the smallest frame size at which the operable screen keeps full
touch targets (see `src/entry.ts`).

## Not modelled

- Interrogation and replies
- ADS-B and position reports
- Code-preset key behaviour beyond setting the code
- Altitude reporting increments and altitude correction
- Self test and fault messages
