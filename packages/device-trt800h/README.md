# @cpt/device-trt800h

The funkwerk TRT800H-OLED Mode S transponder in its round 57 mm housing, as D-MPGO's CT
Supralight carries it: three keys above the display (I/O, VFR, ID), three below (MODE, the
code-swap key and the cursor key), one unlettered knob, the standby and active codes with a
cursor, the flight level from the pressure altitude, and the VFR key with its store hold. An
aircraft installs it by id (`trt800h`).

## Source revision

funkwerk TRT800H Mode-S Transponder, OLED/LCD, Operation and Installation, document
03.2126.010.71e, revision 3.00, as paraphrased in `docs/aircraft/ctsl-intake.md` section 3.8.2
(face, controls, display, power, modes, typical use) and section 2a items 5 to 9. The plan is
`docs/superpowers/plans/2026-10-10-m18-d-mpgo-avionics.md`, section W2.2. The owner
confirmed the set-up (intake section 9 question 37): a Mode S cradle, no ground switch and the
VFR code 7000. Assumptions:

- A Mode S cradle with a 24-bit address is fitted and no ground switch, so the modes are STBY, ACS and A-S (owner-confirmed).
- The VFR code is 7000 (owner-confirmed). The initial code 2000 is a placeholder; the unit starts switched off, in standby.
- A second VFR press while VFR is shown shows the standby code again and VFR stays active (the intake's second reading).
- `►` puts the cursor on the first digit of the standby code, moves it on, and removes it after the fourth digit. The swap key moves the cursor back one digit and removes it from the first.
- A press of `►` while `VFR` shows shows the standby code again, and a VFR release clears the cursor.
- A level below zero prints as `FL -` and two digits (`FL -10`, `FL -05`); the intake gives the format only for levels from `FL 000`.
- The knob wraps within the digits 0 to 7.
- Pressing VFR when the active code already is the VFR code only shows `VFR`; the standby code is kept.
- The `S` that confirms a store shows for `STORED_SHOW_MS`; the manual gives no duration.
- The knob prints `CODE` here; the unit prints nothing at it.
- `mode` is `stby` whenever the unit is off and on every power-on; the codes and the VFR code survive switching off and power loss.

## Controls

- `power`: momentary key printed `I/O`. Any press switches the unit on, in standby. Held for `POWER_OFF_HOLD_MS` it switches off; a hold acts once and its release does nothing more.
- `vfr`: momentary key printed `VFR`. Release: the VFR code becomes active, the old active code goes to standby and `VFR` shows; another release while `VFR` shows shows the standby code again. Held for `VFR_STORE_HOLD_MS`: the active code becomes the VFR code (`S`, then `VFR`).
- `ident`: momentary key printed `ID`. In ACS and A-S it shows `IDT` for `IDENT_MS`; in standby it does nothing.
- `mode`: momentary key printed `MODE`. Steps standby, ACS, A-S, then standby.
- `swap`: momentary key printed `▲▼`, named CHANGE. Moves the cursor back one digit while it shows; otherwise, while `VFR` shows, shows the standby code again; otherwise exchanges the active and standby codes.
- `cursor`: momentary key printed `►`, named CURSOR. Puts the cursor on a digit of the standby code and moves it on.
- `knob`: rotary with `rest`, `down` and `up`; `down` and `up` spring back to `rest`. Steps the digit under the cursor; with no cursor while `VFR` shows, it shows the standby code. The screen prints it as `CODE −` and `CODE +`.

## Inputs

- `pressureAltitude` (feet): the flight level is the altitude in hundreds of feet, rounded down (an assumption, intake §3.8.2), in every state while the unit is on. Outside `MIN_ALTITUDE_FT` to `MAX_ALTITUDE_FT`, or without a number, the display shows `FLerr` and the unit does not report (`reporting` is true only in ACS with a valid level).

The unit is powered by the install's `powered` condition. It never switches itself on: power arriving leaves it off until I/O is pressed.

## Power cycle

Intake section 3.8.2, "Power loss and return" and "Power cycle (trainer, #727)"; assumptions in intake section 9 questions 66 and 67.

- Modelled, from the manual: power loss switches the unit off and every start is in standby; the active, standby and VFR codes survive.
- Assumed (question 66): the installation's Auto-On pin is left open, so power returning leaves the unit dark until I/O is pressed. A wired pin would start the unit by itself and leave I/O without function.
- Assumed (question 67): ident, the cursor, the stored-code flash and a pending hold do not survive; the word `VFR` is not shown again after a return, the start screens (name and versions, the code screen) are not shown, and no key is blocked after the I/O press.
- A key still held when power returns does not count as a press.

## Display

`trt800hScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot, a
`readout` of what the display shows in German and English, and the `floor`: the smallest frame
size at which the operable screen keeps full touch targets (see `src/entry.ts`). The device draws
its own face (`face: 'own'`) from one geometry module, `src/face/geometry.ts`, which holds the
face layout of intake section 3.8.2: the black disc on the panel metal, the six keys with their
legends above the caps, three screws, the knurled knob at the lower right, `ATC` printed upright
down the left, and the yellow OLED window. The dock shows that face with a touch target over each
legend and cap, and `CODE +` and `CODE −` helpers on the panel metal right of the knob; the slot
mirror shows the same face at panel scale, with the key legends and the flight level as secondary
lettering. The display shows three lines: the mode and the active code; `IDT` and the flight
level in small glyphs; `STBY` in standby and the standby code, `VFR` or `S`, with the cursor
digit underlined.

## Not modelled

- Interrogations, replies, the reply and lock-out indicators, squitter and ADS-B
- Flight ID display and entry, setup pages and altitude correction (ID held in standby)
- Operation without the cradle's address (Cradle OFF, AC-, A--) and the power-up record list
- Brightness (DIM)
- Error codes, the low-voltage BAT warning and test mode
- The ground-switch state
- The start screen
- The remote control head
