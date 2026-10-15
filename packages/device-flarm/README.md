# @cpt/device-flarm

The classic external LED display of a FLARM system for the cockpit procedure trainer: a
rectangular face with four status LEDs, one `Mode` key and a ring of ten LEDs around an
aircraft outline. It is one avionics unit that any aircraft can install by id (`flarm`). It
models the display only: no traffic is ever received, so the ring stays dark except in the
start-up self-test and the mode-swap confirmation.

## Source revision

The display maker's external-display data sheet (version 5.1e, display hardware 1.0 and 2.0)
and the FLARM operating manual (version 242), as paraphrased in `docs/aircraft/ctsl-intake.md`
section 3.8.4. The sheet defers most timings to the unit's manual. The owner answered question 34
(the club does not check the FLARM before take-off, so no procedure does) and declined simulated
traffic (question 39). Assumptions, none settled by a source (intake section 9, questions 33 and
39):

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
- The beeps (intake section 3.8.4, "Trainer (M18)"): the pitch, the length and the loud, medium and
  quiet level ratios are assumed (unverified). No tone on the step into silent is inferred: the intake
  gives a tone at the new level and records nothing for silent. No sound below `LOW_SUPPLY_V` is
  inferred: the intake says FLARM stops working there. A supply that recovers while the unit is on
  gives no start-up beep.

## Controls

- `mode`: momentary key printed `Mode`. It acts on release, by how long it was held. Under
  `BRIEF_PUSH_MS` it steps the volume loud, medium, quiet, silent, loud. From `BRIEF_PUSH_MS` up
  to just under `LONG_PUSH_MS` it swaps Nearest and Collision and runs the confirmation on the ring.
  A push of `LONG_PUSH_MS` or longer does nothing. The key is ignored during the self-test and while unpowered; a key still
  held when the self-test ends counts from that moment. Each brief push gives one tone at the new
  volume level, none on the step into silent or on a low supply; the mode swap makes no sound.

## Inputs

- `supplyVolts` (volts): below `LOW_SUPPLY_V` the Power LED flashes and TX goes dark.

The unit has no switch: it is on whenever the install's `powered` condition holds. Power arriving
runs the self-test (ring, above, below, then the status column), ends in Nearest mode at loud
volume and starts the GPS search. Power lost drops the search and the confirmation.

## Power cycle

Intake section 3.8.4, "Power loss and return" and "Power cycle (trainer, #727)"; assumptions in intake section 9 questions 33 and 69.

- Modelled, from the manuals: the unit switches on by itself with its supply and every start is in Nearest mode at loud volume; a low supply flashes `Power`.
- Assumed (questions 33 and 69): the unit has no breaker of its own, so only the avionics bus takes it down; the chosen volume and mode do not survive a power loss; the self-test and the GPS search restart from nothing, with the trainer's own timings.
- Modelled, from the manuals: every start gives one short beep at loud volume, whatever the volume was before the power loss.
- Inferred (FLARM stops working below `LOW_SUPPLY_V`): a low supply gives no beep. Assumed: a supply that recovers while the unit is on gives none either.
- A pull during the self-test, the search or a mode-swap confirmation drops it; a Mode key held through the return counts from the end of the self-test.

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
- Sound: only the start-up beep and the volume-step tones, with assumed pitch, length and level ratios; no warning tones
- The software versions shown at start-up
- Reboot, factory reset and the display setup (Mode held at power-up)
- Fault codes
- Flight recording
