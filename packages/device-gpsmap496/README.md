# @cpt/device-gpsmap496

The Garmin GPSMAP 496 as fitted to the CT Supralight's analog panel, reduced to what a
trainer without a world outside needs: power, the backlight, the main pages and a position
fix. An aircraft installs it by id (`gpsmap496`). Its screen opens in the device dock, where
the keys are large enough to operate by touch. Switched on, the receiver searches for
satellites and then has a fix; with a fix the map page shows ground speed, track and a
schematic track-up map without map data.

## Source revision

Garmin GPSMAP 496 owner's manual, document number and revision not identified: no manual
was reachable, so the logic follows general knowledge of how a Garmin handheld GPS is
operated, not a manual revision. The owner is asked to name the revision to follow.
Assumptions to confirm against it:

- The unit stays off when the aircraft supplies power, until the power key is pressed.
- Losing power switches the unit off and the next start shows the first page.
- The main pages are map, terrain, active route and information, in that order. The real
  unit's page set and order differ by configuration.
- PAGE steps forward through the pages and QUIT steps backward; both wrap.
- The backlight has three levels, stepped by its own key. The real unit puts the backlight
  on a short press of the power key.
- The backlight level survives a power loss; the page does not.
- Page and backlight keys do nothing while the unit is off.
- The receiver finds its fix a fixed time (`ACQUIRE_MS`) after it is switched on, and loses
  it when switched off or unpowered. The real search time depends on the sky view and on how
  long the unit was off.
- The map is track up: the track line points up and a marker shows north.

## Controls

- `power`: momentary key that switches the unit on or off while the aircraft powers it.
- `backlight`: momentary key that steps the backlight level.
- `page`: momentary key that shows the next main page.
- `quit`: momentary key that shows the previous main page.

## Inputs

- `groundSpeedKt` (knots).
- `trackDeg` (degrees, 1 to 360).

Both are read only with a fix; a missing input shows dashes. The unit is powered by the
install's `powered` condition.

## Display

`gpsmap496ScreenEntry` pairs the operable screen with a read-only `Display` for a panel slot
(its bezel is lettered GPS), a `readout` of what the display shows in German and English,
and the `floor`: the smallest frame size at which the operable screen keeps full
touch targets (see `src/entry.ts`).

## Not modelled

- Map data, zoom and map orientation: the map shows only range rings, the track line and north
- Satellite constellation, signal strength, coordinates and GPS altitude; the fix comes after a fixed search time
- Navigation database, airports and airspace
- Direct-to, routes, nearest airports and waypoints
- Weather, terrain and traffic data
- Audio output and alerts
- Menus, settings, enter key and rocker
- Internal battery and charge indication
- Start-up with splash and acknowledgement pages
