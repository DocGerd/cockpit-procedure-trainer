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

`flarmScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot (its
bezel is lettered FLARM), a `readout` of the status LEDs in German and English, and the `floor`:
the smallest frame size at which the operable screen keeps full touch targets (see
`src/entry.ts`). The Display shows the status column and the ring; the words `above`, `below`
and the key are on the operable screen only, because the slot's text size leaves no room for
them.

## Not modelled

- Traffic and obstacle warnings
- The Nearest-mode bearing, the RX light and the receiver self-test
- Warning suppression (double push)
- Sound: the volume level is kept but never heard
- The software versions shown at start-up
- Reboot, factory reset and the display setup (Mode held at power-up)
- Fault codes
- Flight recording
