# @cpt/device-gtx327

The Garmin GTX 327 Mode A/C transponder as fitted to the CT Supralight's analog panel: a
mode knob, a keypad for the four-digit squawk, the VFR key, IDENT, a function key with a
count-up timer, the pressure altitude from the altitude encoder, and bus power. An aircraft
installs it by id (`gtx327`). Its screen is made for the radio stack view, where the keys
are large enough to operate by touch.

## Source revision

Garmin GTX 327 pilot's guide, document number and revision not identified: no guide was
reachable, so the logic follows general knowledge of how a Mode A/C transponder is operated,
not a manual revision. The owner is asked to name the revision to follow. Assumptions to
confirm against it:

- The knob positions are OFF, SBY, TST, GND, ON and ALT. GND is modelled like standby: no reply, no IDENT.
- Digits 0 to 7 are typed one key at a time; the code becomes active with the fourth digit.
- The VFR key sets 7000, the usual VFR code in Germany. The unit's installed VFR code is configurable.
- IDENT starts a reply flag of 18 s in ON and ALT only.
- The pressure altitude is shown in every mode except OFF and TST, and is reported in ALT only.
- The install feeds the indicated altitude; no altimeter setting is modelled, so it is not a true pressure altitude.
- In OFF every key is ignored and the timer is reset.
- The power-up code is a placeholder, 2000.

## Controls

- `mode`: rotary with `off`, `sby`, `tst`, `gnd`, `on`, `alt`. TST shows the test pattern.
- `key0` to `key7`: momentary digit keys. Typed digits show as a partial code; the fourth completes and sets it.
- `clr`: momentary key that deletes the last typed digit, or resets a stopped count-up timer on its page.
- `crsr`: momentary key that cancels a half-typed code.
- `vfr`: momentary key that sets the VFR code.
- `ident`: momentary key that starts the reply flag, which clears after `IDENT_DURATION_MS`.
- `func`: momentary key that cycles the pressure altitude and count-up timer pages.
- `startStop`: momentary key that starts or stops the count-up timer while its page is shown.

## Inputs

- `pressureAltitude` (feet).

The unit is powered by the install's `powered` condition. Losing power stops the timer and
drops any half-typed code; the active code is kept.

## Not modelled

- Interrogation and replies, reply annunciation
- Flight time, countdown timer and altitude monitor
- Brightness, contrast and display lighting
- Altitude reporting increments and altitude correction
- Self-test results and fault messages
- Installer configuration of the VFR code
- Time-out of a half-typed code
