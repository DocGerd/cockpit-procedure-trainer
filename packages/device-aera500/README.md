# @cpt/device-aera500

The Garmin aera 500 as fitted to D-MPGO's panel, reduced to what a trainer without a world
outside needs: cradle power, the database acceptance, the Home grid, a schematic track-up
map, a position fix and the backlight overlay. An aircraft installs it by id (`aera500`). Its
screen opens in the device dock, where the touch icons are keys large enough to operate by
touch. Facts come from `docs/aircraft/ctsl-intake.md` section 3.8.3, never from the manual.

## Source revision

Garmin, aera 500 Series Pilot's Guide (models 500, 510, 550, 560), document 190-01117-02,
revision C, system software 4.10 or later, as paraphrased in intake section 3.8.3 and the
M18 plan (W2.3). The owner confirmed the map orientation and data fields (intake section 9
question 38). Assumptions, none of them settled by the guide:

- The POWER button prints `POWER` (the guide shows its place and lettering only in a figure).
- Cradle power arriving switches the unit on at the start-up page; losing it switches the unit
  off and the next start shows the start-up page again (battery not modelled, intake section 9
  question 38).
- `POWER_OFF_HOLD_MS`, the hold that switches the unit off, is 2 s; the guide gives no time.
  With cradle power the real unit enters Charge Mode, which has the same screen-off result.
- The search for satellites ends with a fix `ACQUIRE_MS` after switching on, on any page. The
  status text reads Searching the Sky for the first third of that time, then Acquiring
  Satellites, then 3D GPS Location (the split is assumed).
- The map range steps are 0.5, 1, 2, 5, 10, 20 and 50 nm, a subset of the unit's 23 steps.
- The map is track up and its data fields are GS, ETE NEXT, BRG and DIST NEXT (owner-confirmed,
  question 38; the unit's default is north up). GS is live with a fix and the others stay
  dashed, because there is no route.
- The Home grid holds the six icons Map, Nearest, Active FPL, Direct To, Position and Tools
  (the real grid order and size are unknown). Back leads from a page to its parent and Home to
  the Home page.
- The backlight has levels 1 to 10, stepped in its overlay; it affects nothing else.
- Page icons are named as the guide names them, in English, whatever the app language: the
  unit prints its own wording.

## Controls

- `power`: momentary button on the cradle's top edge, above the screen. Dark and powered: any press switches the unit
  on. On: a short press opens or closes the backlight overlay; held for `POWER_OFF_HOLD_MS` it
  switches the unit off.
- `touch`: the touchscreen, a rotary that springs back to `rest`; each position is one icon
  (`accept`, `home`, `back`, `map`, `nearest`, `activeFpl`, `directTo`, `position`, `tools`,
  `gpsStatus`, `zoomOut`, `zoomIn`, `dimmer`, `brighter`) and acts only on the page that shows
  it. The dock renders the keys of the current page on the screen; while the unit is dark they
  stay in place, unprinted and inert.

## Inputs

- `groundSpeedKt` (knots).
- `trackDeg` (degrees).
- `altitudeFt` (feet).

All three are read only with a fix; a missing input shows dashes. The unit is powered by the
install's `powered` condition, which the state mirrors in `powered` so a seed can set it.

## Display

`aera500ScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot,
a `readout` of what the display shows in German and English, and the `floor`: the smallest
frame size at which the operable screen keeps full touch targets (see `src/entry.ts`). The unit
draws its own face (`face: 'own'`, intake section 3.8.3, "Face layout (photos)"): the dark
cradle with its latch rail and the POWER bump on the top edge, the grey body and the 16:9
touchscreen. `src/face/geometry.ts` holds the layout, and one face component draws both the dock
and the slot mirror, so the mirror is the same face at panel scale (an 8:5 slot, lettered GPS in
the body's bottom band). The dock's touch keys sit on the screen where the unit draws them; a
key's touch target may reach into the bezel or over the drawn Menu key, which stays inert
because page menus are not modelled. The map is a generic chart drawn for the trainer, with no real
geography. In the mirror the on-screen lettering is secondary (half the slot minimum).

## Not modelled

- The navigation database (airports, navaids, airspace), so Nearest, Direct To and Active FPL stay empty and identifier entry is not modelled
- Map data, terrain, obstacles, weather, traffic and XM, and their pages (Terrain, HSI/Panel, Traffic, Weather, WPT Info, Numbers)
- The map pointer, panning, page menus (Menu icon) and map settings (orientation fixed track up)
- The satellite sky view, latitude and longitude and the reference waypoint
- Flight plans, Direct-To guidance, VNAV, alarms and message pop-ups
- Tools other than GPS Status, and setup
- Sound and volume
- The battery, Charge Mode and the power-loss warning
- Database dates and cycles
- Automotive and simulator modes
- Touchscreen calibration
- Screen dimming (the backlight level shows in its overlay only)
