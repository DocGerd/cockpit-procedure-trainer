# @cpt/device-com

A generic VHF COM radio for the cockpit procedure trainer: standby frequency entry
with a coarse and a fine knob, an active/standby swap, a volume knob and bus power.
It is one avionics unit that any aircraft can install by id (`com`).

## Source revision

Generic unit, no manufacturer manual.

## Controls

- `volume`: continuous lever from 0 to 1.
- `coarse`, `fine`: spring-back rotary knobs (`rest`, `down`, `up`). Each click changes the standby frequency by one MHz or one channel, wrapping at the ends.
- `swap`: momentary button that exchanges the active and standby frequencies.

The unit is powered by the install's `powered` condition. It takes no inputs.

## Display

`comScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot
(its bezel is lettered COM), a `readout` of what the display shows in German and English,
and the `floor`: the smallest frame size at which the operable screen keeps full
touch targets (see `src/entry.ts`).

## Not modelled

- Audio and the effect of the volume setting
- Reception, range and squelch
- Intercom
- Memory channels
- Frequency database and station names
- 8.33 kHz channel spacing
