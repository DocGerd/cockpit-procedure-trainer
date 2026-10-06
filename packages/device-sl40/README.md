# @cpt/device-sl40

The Garmin SL40 VHF COM radio as fitted to the CT Supralight's analog panel: standby
frequency entry with a coarse and a fine knob, an active/standby swap, a monitor button,
a volume knob and bus power. An aircraft installs it by id (`sl40`).

## Source revision

Garmin SL40 pilot's guide, document number and revision not identified: no guide was
reachable, so the logic follows general knowledge of how a VHF COM radio is operated, not a
manual revision. The owner is asked to name the revision to follow.

## Controls

- `volume`: continuous lever from 0 to 1.
- `coarse`, `fine`: spring-back rotary knobs (`rest`, `down`, `up`). Each click changes the standby frequency by one MHz or one channel, wrapping at the ends.
- `swap`: momentary button that exchanges the active and standby frequencies.
- `monitor`: momentary button; while held, the screen flags that the standby frequency is monitored.

Channels are 25 kHz apart from 118.000 to 136.975 MHz. The unit is powered by the install's
`powered` condition. It takes no inputs.

## Not modelled

- Audio and the effect of the volume setting
- Reception, range and squelch
- Intercom
- Memory channels and user frequencies
- Squelch test
- Transmit operation and transmit indication
- Frequency database and station names
- 8.33 kHz channel spacing
- Display lighting and dimming
