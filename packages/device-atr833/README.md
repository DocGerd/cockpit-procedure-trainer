# @cpt/device-atr833

The funkwerk ATR833-OLED COM radio, the unit on D-MPGO's panel: a round 57 mm disc straight on the
panel, three keys above the display (I/O, SET, MEM), three below (DW, ▲▼, ►), the VOL/SEL knob at the
upper right and an unlettered frequency knob at the lower right. An aircraft installs it by id (`atr833`);
the CT Supralight does.

## Source revision

The source is the manufacturer's ATR833A-OLED operation and installation manual, document
01.1411.010.71e, revision 3.00, hosted by ManualsLib (manual 876459) because the manufacturer no
longer hosts manuals for the original unit; the owner chose it on 2026-10-11. It is paraphrased in
`docs/aircraft/ctsl-intake.md` section 3.8.1. D-MPGO's unit is the original ATR833-OLED (intake
section 9, question 36); the A variant is assumed to behave like it (question 64). A function whose
control D-MPGO's face lacks is out. AUTO ON is off on D-MPGO (question 35) and the A manual has no
such setting: power arriving leaves the unit dark and an I/O press switches it on; power lost
switches it off.

Decided, not yet implemented: the standby rule for opening a list, the two-digit negative `DWM` and dual watch ending when SQL drops below 02 (intake section 9, question 65; Refs #765, #766).

Assumptions, none checked against a unit (intake section 9, questions 64 and 65):

- Spacing is fixed at 8.33 kHz. The range is 118.000 to 136.990: the last name of the 136.975 block.
- The cursor starts on MHz at power-on. `►` runs MHz, 100 kHz digit, channel digits, MHz. Each field wraps without carrying into its neighbour.
- Any I/O press switches the unit on; the manual's about 0.5 s is not enforced.
- In a list, `▲▼` swaps and leaves it, `MEM` steps from the memory list to the last-used list and then closes it, and SET, DW, `►` and the frequency knob leave it without their own effect (the knob then steps the standby frequency). Lists close after `MENU_TIMEOUT_MS`, as line 3 does.
- An unused memory entry is empty; browsing onto it leaves the standby frequency as it is.
- `LST 00` holds the last standby frequency the memory list set; `LST 01` to `LST 10` hold the last active frequencies, newest first.
- A MEM hold outside the memory list acts as a short press on its release.
- Memories and the last-used list survive power loss and switch-off, as the frequencies and settings do.
- Defaults: SQL 05 is the manual's; VOL 10, DIM 10, VOX 05, DWM 00, INT 05 and EXT 00 are placeholders.
- The knob unlettered on the face is `freq`, the manual's name for it; the trainer prints `FREQ` on its keys, which is not visible lettering.
- Initial frequencies 118.000 active and 119.000 standby are placeholders.

## Controls

- `power`: momentary `I/O`. Any press switches the unit on while it is off and powered. Held for `POWER_OFF_HOLD_MS` while on it switches off; the press that switched it on does not count.
- `set`: momentary `SET`. On release steps line 3 through VOL, SQL, DIM, VOX, DWM, INT and EXT; in a list it leaves the list. Held for `LONG_PRESS_MS` it returns line 3 to VOL, and the release that ends the hold does nothing more.
- `mem`: momentary `MEM`. On release opens the memory list (`MEM 00` to `MEM 99`), then the last-used list (`LST 00` to `LST 10`), then closes it. Held for `LONG_PRESS_MS` in the memory list it writes the active frequency into the shown entry, and the release that ends the hold does nothing more.
- `dw`: momentary `DW`. Toggles dual watch, which needs a squelch of `DUAL_WATCH_MIN_SQL` or more; in a list it leaves the list.
- `swap`: momentary `▲▼` (accessible name SWAP). Exchanges active and standby; in a list it also leaves the list.
- `cursor`: momentary `►` (accessible name CURSOR). Moves the underline to the next field of the standby frequency; in a list it leaves the list.
- `volSel`: rotary `rest`, `down`, `up` with spring-back, `VOL/SEL −` and `VOL/SEL +`. Steps the line 3 value; in a list, steps the entry, which at once replaces the standby frequency.
- `freq`: rotary `rest`, `down`, `up` with spring-back, `FREQ −` and `FREQ +`. Steps the underlined field of the standby frequency.

Holds are measured from the time the session advances while the key is down; line 3 or a list falls back to the
standard display after `MENU_TIMEOUT_MS` without input. Ranges: VOL 1 to 16, SQL, DIM, VOX and INT 1 to 10, DWM −8
to 0, EXT 0 to 10; line 3 prints non-negative values with two digits and `DWM` prints its minus sign with one digit (`DWM -2`, `DWM 00`). Dual watch ends when either frequency
changes, a swap included. A frequency that becomes active joins the last-used list once, newest first, up to
`RECENT_LIMIT`. The state keeps the frequencies, the settings, the `MEMORY_SLOTS` memory entries and the
last-used list through power loss and clears the transients (dual watch, the line-3 item, an open list).

## Inputs

None. The unit is powered by the install's `powered` condition.

## Display

`atr833ScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot, a `readout` of what
the display shows in German and English, and the `floor`: the smallest frame size at which the operable screen
keeps full touch targets (see `src/entry.ts`). The unit draws its own face (`face: 'own'`) from the photographed
layout in `docs/aircraft/ctsl-intake.md` section 3.8.1, kept in `src/face/geometry.ts`: the black disc with its
rim, six round key caps with the legends printed above them, the two knurled knobs in the right-hand corners,
two screws at the left, `COM` down the left, the curved `VOL/SEL` and the yellow OLED window with `ACT`, `SBY`
(or `DW`) and line 3. While a list is open line 2 keeps `SBY` and shows the entry, which is the standby
frequency. One face component draws both views. In the dock each key is one touch target over its legend and
cap, and a column of plus and minus helpers on the panel metal right of the disc turns each knob (`VOL/SEL` and
`FREQ`). The slot mirror is the same face at panel scale, square (`ATR833_MIRROR`), with no keys; its legends
and line labels print in the secondary lettering tier and the frame prints `COM`.

## Not modelled

- Reception, transmission and audio (RX, TX, Te and the two-minute transmit cut-off; volumes, DIM and DWM are numbers only)
- The configuration menu (SET held 5 s): spacing (fixed 8.33 kHz), automatic display darkening, PTT selection, external-audio priority, microphone sensitivities, test mode
- Memory names
- The low-voltage BAT warning
- The start screen with type and software version
- Master reset
- The external intercom switch, remote control and PC frequency tool
