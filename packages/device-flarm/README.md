# @cpt/device-flarm

The classic external LED display of a FLARM system for the cockpit procedure trainer: a
rectangular face with four status LEDs, one `Mode` key and a ring of ten LEDs around an
aircraft outline. It is one avionics unit that any aircraft can install by id (`flarm`). It
models the display only: no traffic is ever received, so the ring stays dark except in the
start-up self-test and the mode-swap confirmation.

## Source revision

The display maker's external-display data sheet (version 5.1e, display hardware 1.0 and 2.0)
and the FLARM operating manual (version 242), as paraphrased in `docs/aircraft/ctsl-intake.md`
section 3.8.4. The sheet defers most timings to the unit's manual. Assumptions, none settled by
a source (intake section 9, questions 33, 34 and 39):

- The unit is powered from the aircraft's avionics bus with no breaker of its own.
- `SELF_TEST_STEP_MS` (one LED per step), `CONFIRM_STEP_MS`, `ACQUIRE_MS` (counted from power
  arriving, alongside the self-test), `LONG_PUSH_MS` (a bound around the manual's "about two
  seconds") and the 1 Hz rate of the flashing and blinking LEDs are the trainer's own values.
- The mode swap and its confirmation run also work on the ground; the manuals describe them in
  flight.
- The `above` and `below` LEDs are red like the ring; the intake gives red for the ring only.
- `BLINK_MS` (the brief blink or flash of the GPS LED each second) is the trainer's own value.
- The confirmation run lights the two ring LEDs that mirror each other across the aircraft's
  axis, from the nose pair to the tail pair going into Nearest and back going out; the manuals
  say only that two LEDs run top to bottom.
- A missing `supplyVolts` reading counts as a good supply.

## Controls

- `mode`: momentary key printed `Mode`. It acts on release, by how long it was held. Under
  `BRIEF_PUSH_MS` it steps the volume loud, medium, quiet, silent, loud. From `BRIEF_PUSH_MS` up
  to just under `LONG_PUSH_MS` it swaps Nearest and Collision and runs the confirmation on the ring.
  A push of `LONG_PUSH_MS` or longer does nothing. The key is ignored during the self-test and while unpowered; a key still
  held when the self-test ends counts from that moment.

## Inputs

- `supplyVolts` (volts): below `LOW_SUPPLY_V` the Power LED flashes and TX goes dark.

The unit has no switch: it is on whenever the install's `powered` condition holds. Power arriving
runs the self-test (ring, above, below, then the status column), ends in Nearest mode at loud
volume and starts the GPS search. Power lost drops the search and the confirmation.

## Display

`flarmScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot, a
`readout` of the status LEDs in German and English, and the `floor`: the smallest frame size at
which the operable screen keeps full touch targets (see `src/entry.ts`).

The unit draws its own face (`face: 'own'`), laid out as intake section 3.8.4 "Face layout
(photos)" gives it: a slate rounded rectangle with the status column, the `Mode` key in its
printed frame, the `above` and `below` LEDs on their bar, and the ring of ten LEDs with spokes
around a straight-wing aircraft. `src/face/geometry.ts` holds the positions, and one face
component draws both the dock's Screen and the slot's Display, so the slot shows the same face
at panel scale. In the dock the whole printed key frame is the `Mode` key's touch target and the
face prints the unit word `FLARM` where the maker's wordmark stands; in the slot the frame label
prints it there, and the face words are secondary lettering. The face has no screen, so it
wears no glass. No logo is drawn.

## Not modelled

- Traffic and obstacle warnings
- The Nearest-mode bearing, the RX light and the receiver self-test
- Warning suppression (double push)
- Sound: the volume level is kept but never heard
- The software versions shown at start-up
- Reboot, factory reset and the display setup (Mode held at power-up)
- Fault codes
- Flight recording
