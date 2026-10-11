# @cpt/device-atr833

The funkwerk ATR833-OLED COM radio, the unit on D-MPGO's panel: a round 57 mm disc straight on the
panel, three keys above the display (I/O, SET, MEM), three below (DW, ▲▼, ►), the VOL/SEL knob at the
upper right and an unlettered frequency knob at the lower right. An aircraft installs it by id (`atr833`);
the CT Supralight does.

## Source revision

The only source is the manufacturer's ATR833-II operation and installation manual, document
01.143.010.71e, revision 1.06 (24 Jan 2024), paraphrased in `docs/aircraft/ctsl-intake.md` section
3.8.1. A function of the II whose control D-MPGO's face lacks is out. The generation of D-MPGO's unit
is open (intake section 9, question 36). The owner confirmed AUTO ON is off (question 35): power arriving leaves the unit dark and an I/O press switches it on; power lost switches it off. Assumptions, none checked against a unit:

- Spacing is fixed at 8.33 kHz. The range is 118.000 to 136.990: the last name of the 136.975 block.
- The cursor starts on MHz at power-on. `►` runs MHz, 100 kHz digit, channel digits, MHz. Each field wraps without carrying into its neighbour.
- Dual watch needs a squelch of at least 1, and ends when either frequency changes, a swap included. Switching off also ends it.
- A frequency that becomes active joins the last-active list once, newest first, up to 10. A third MEM release closes the lists.
- SET held 5 s or more would open the setup menu, which is not modelled, so the release that ends such a hold does nothing.
- Saving writes the standby frequency (key table and worked example) and shows `>` before it until the standby frequency changes. The hold is 1.5 s, the shorter of the manual's two times.
- A browsed list entry shows its frequency on the standby line, without the `SBY` label; the manual does not say where. Loading an empty entry does nothing.
- Setting ranges: VOL, INT, STL and STR 1 to 20; SQL, VOX and BRT 0 to 9; EXT 0 to 20, shown as off at 0. The intake gives no default for any setting, so every default (SQL 5 included) is a placeholder.
- The knob unlettered on the face is `freq`, the manual's name for it; the trainer prints `FREQ` on its keys, which is not visible lettering.
- Initial frequencies 118.000 active and 119.000 standby are placeholders.

## Controls

- `power`: momentary `I/O`. Any press switches the unit on while it is off and powered. Held for `POWER_OFF_HOLD_MS` while on it switches off; the press that switched it on does not count.
- `set`: momentary `SET`. On release steps line 3 through VOL, SQL, VOX, INT, STL, STR, EXT and BRT; in a MEM or LST list it loads the entry into the standby frequency. A release after `SETUP_MENU_HOLD_MS` ends a setup-menu hold and does nothing.
- `mem`: momentary `MEM`. On release opens the MEM list, then the LST list. Held for `MEM_SAVE_HOLD_MS` it opens save mode; the release that ends this hold does nothing more.
- `dw`: momentary `DW`. Toggles dual watch; in a menu, list or save mode it returns to the standard display.
- `swap`: momentary `▲▼` (accessible name SWAP). Exchanges active and standby; in a list it loads the entry into the active frequency.
- `cursor`: momentary `►` (accessible name CURSOR). Moves the underline to the next field of the standby frequency.
- `volSel`: rotary `rest`, `down`, `up` with spring-back, `VOL/SEL −` and `VOL/SEL +`. Steps the line 3 value, the list entry or the save slot.
- `freq`: rotary `rest`, `down`, `up` with spring-back, `FREQ −` and `FREQ +`. Steps the underlined field of the standby frequency.

Holds are measured from the time the session advances while the key is down; a menu or list falls back to the
standard display after `MENU_TIMEOUT_MS` without input. The state keeps the settings, the 20 memory slots and the
last-active list through power loss and clears the transients (dual watch, menus, lists, the saved mark).

## Inputs

None. The unit is powered by the install's `powered` condition.

## Display

`atr833ScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot, a `readout` of what
the display shows in German and English, and the `floor`: the smallest frame size at which the operable screen
keeps full touch targets (see `src/entry.ts`). The unit draws its own face (`face: 'own'`) from the photographed
layout in `docs/aircraft/ctsl-intake.md` section 3.8.1, kept in `src/face/geometry.ts`: the black disc with its
rim, six round key caps with the legends printed above them, the two knurled knobs in the right-hand corners,
two screws at the left, `COM` down the left, the curved `VOL/SEL` and the yellow OLED window with `ACT`, `SBY`
(or `DW`) and line 3. One face component draws both views. In the dock each key is one touch target over its
legend and cap, and a column of plus and minus helpers on the panel metal right of the disc turns each knob
(`VOL/SEL` and `FREQ`). The slot mirror is the same face at panel scale, square (`ATR833_MIRROR`), with no
keys; its legends and line labels print in the secondary lettering tier and the frame prints `COM`.

## Not modelled

- Reception, transmission and audio (RX, TX, Te and the stuck-microphone time-out; volumes are numbers only)
- REPLAY of the last call
- The setup menu (SET held 5 s): spacing (fixed 8.33 kHz), display dimming, dual-watch volume reduction, PTT selection, microphone, headset and external-audio settings, AUTO ON (off: the unit is switched on with I/O), versions
- Memory names and clearing a slot
- The low-voltage BAT warning
- The start screen
- Factory reset
- The external swap button, intercom switch, remote control and PC frequency tool
