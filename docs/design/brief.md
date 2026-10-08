# Design brief: screens and states

Every screen and state the web app needs. Spec: `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, §5 (Screen) and §6. Values come from `BRAND.md`.

Screen ids (`S1` …) are stable. The design handoff maps each drawn artboard to them.

## Frame rules

- The brand styles the chrome only: header, checklist pane, outside-view frame, tabs, popovers, dialogs. The panel shows the aircraft, never brand colours.
- The accent as an outline on the panel is the only brand colour there, always paired with a shape cue, in two places: the Guided highlight (S9) and the selected control in Free explore (S7). Status inks never appear on the panel.
- Status inks appear only in the chrome.
- Every screen exists in light and dark with the same layout. Tablet and desktop are both first-class, touch and mouse alike.

## Screens

### S1 Main layout, desktop

- Header: aircraft, procedure, mode, phase, language, theme (spec §5). The UAT build adds a "UAT" badge.
- Free explore hides the procedure button; the phase control stays, because phase is global session state.
- Outside-view strip on top.
- Cockpit below it: the panel on top; under it the device dock (S12), then the aircraft's lower fields where they sit in the real cockpit (CTSL: the centre field under the junction of the upper fields, the console beside it). View tabs only where the combined cockpit would be too small; the dock then sits below the tab panel.
- Checklist pane at the side.

### S2 Main layout, tablet

The same regions as S1. The checklist pane is collapsed to a header toggle that shows progress (`2 / 6`) and can be expanded over the panel.

### S3 Checklist pane per mode

- Guided: current item highlighted, deviations shown at once.
- Practice: no highlight on the panel, the current item marked in the pane, a deviation count in the footer, summary at the end. Deviations are recorded without an immediate banner (spec §5), because Practice tests recall and instant correction would make it Guided.
- Free explore: a read-only checklist reference with no arrow, hints, ticking or deviations, and control details (S7). In every mode a selector opens any checklist of the aircraft for reading; in Guided and Practice the running procedure is untouched and a button leads back to it.
- Each item shows its state: pending, current, done, deviated.
- An emergency procedure is marked as such in the pane header.

### S4 Outside-view strip

The outside view of the current phase. The phase control lives in the header, because phase is global session state; the strip may mirror it.

### S5 Aircraft and procedure picker

Aircraft and procedure choice, with Guided and Practice as the mode options. Free explore is a separate button, not a mode option.

The notice is a permanent block at the bottom of the picker, with no acknowledgement: training aid only, the aircraft's handbook is authoritative, not for use in flight.

### S6 Deviation summary

Shown when a procedure ends:

- items completed (`9 / 9`) and the deviation count;
- the deviations, each with its position and an explanation;
- three actions: next procedure, repeat, back to selection.

If the procedure names an end phase, the app moves to it (spec §5).

### S7 Control details in Free explore

The tapped control is selected with the accent outline (S9). Its details show name and purpose, type and view as tags, the positions with the current one marked, and a "Used in" list of procedures and items. A toggle switches to operating controls freely instead.

### S8 Device mirrors in the panel

An avionics unit's slot in the panel (spec §4.9) shows a live read-only mirror of the unit: bezel with the printed unit name, display, powered and powered off. The slot is one tappable target that opens the unit in the device dock (S12).

### S9 Guided highlight on the panel

Accent outline with a pulse around the current target. A reduced-motion variant keeps the outline and drops the pulse. The selected control in Free explore uses the same outline without the pulse.

### S10 Light and dark

Both themes for S1 to S9, S11 and S12.

### S11 Error states

- Error boundary: a readable message and a reset.
- Missing panel image: a labelled placeholder.

### S12 Device dock

One non-modal dock under the panel (spec §4.9), holding one avionics unit at a time with its operable screen and bezel.

- Empty: a hint in chrome text; nothing on the panel changes.
- Holding a unit: the unit's operable screen at its floor size or larger, and a close button that empties the dock. Activating another slot swaps the unit.
- Guided: the dock opens the unit the current step targets and the slot is ringed (S9); no view switches.

## Covered and missing

Where the spec and the canvas disagree, this brief follows the spec for behaviour and the canvas for appearance.

The product's design canvas draws every screen; some states are not drawn, and some screens are drawn in one theme only (S10 row below). `handoff/README.md` maps each exported artboard to its screens.

Drawn, by artboard:

| Artboard                                   | Draws                                             | Screens                                |
| ------------------------------------------ | ------------------------------------------------- | -------------------------------------- |
| Guided, light and dark                     | desktop Guided                                    | S1, S3 Guided, S4, S9, S10             |
| Practice, light and dark                   | a procedure for an abnormal event, phase selector | S3 Practice, S4, S10                   |
| Free explore, light and dark               | control details as a side pane                    | S3 Free explore, S7 as a pane, S9, S10 |
| Free explore, control details popover      | control details as a popover                      | S7                                     |
| Picker, light and dark                     | the training-aid notice                           | S5, S10                                |
| Summary, light and dark                    | the procedure summary                             | S6, S10                                |
| Tablet, collapsed and expanded             | the checklist as a header toggle, and over panel  | S2                                     |
| Device screens                             | powered and powered off, as operable screens      | S8 (before the dock)                   |
| Error boundary, missing panel image (dark) | the two error states                              | S11, S10 (part)                        |

Not drawn, specified below in words:

| Screen | Missing                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| S3     | the deviated item state                                                                                                  |
| S6     | the end phase after the summary                                                                                          |
| S8     | the slot mirror                                                                                                          |
| S9     | reduced-motion variant                                                                                                   |
| S12    | the device dock, empty and holding a unit                                                                                |
| S10    | the other theme of S2, S7 popover, S8 and S11: each is drawn in one theme only, and the missing panel image in dark only |

## Specification of the screens and states not drawn

The sections below specify in words what the table above lists as not drawn (S3 deviated item, S6 end phase, S8 slot mirror, S9 reduced motion, S12 device dock, the S10 themes). S2, S7 and S11 are now drawn; their sections below stay as the behaviour text. Each derives from a drawn artboard, so the web shell can be built without new drawings.

### S2 Tablet

- The device dock (S12) sits below the tab panel and is shared across tabs.
- Below the desktop breakpoint, which the web shell chooses, the checklist pane collapses to a header button showing progress (`2 / 6`).
- Opening it slides the pane in from the side, over the panel. Content is the same as on desktop.
- A tap outside the pane, or the same button, closes it. Guided keeps highlighting, and switching views for non-device targets, while the pane is closed.
- Header, outside-view strip and panel keep the S1 layout.

### S3 Deviated item

An item whose step was deviated from is marked with a distinct icon and a status ink in the chrome, so it does not rely on hue alone. Otherwise it keeps the layout of a done item.

### S6 End phase

When the app moves to the end phase, the phase in the header and the outside-view strip update. The summary itself is unchanged.

### S7 Popover

- Tapping a control in Free explore opens its details in a popover anchored to that control, replacing the side pane of the drawn Explore artboard. It carries the same fields as the pane (name, purpose, type and view tags, positions, "Used in", the operate-freely toggle); the "Used in" list is condensed to a few entries with a count for the rest, and a long positions list scrolls.
- It closes on a tap outside or on Escape, and only one is open at a time.
- It stays inside the viewport and flips to the opposite side of the control when it does not fit.
- It is chrome: surface, border and text tokens apply, the control keeps its own look.
- With operate freely on, a tap operates the control and no popover opens.

### S8 Device mirrors

- The slot draws the device's read-only display inside a bezel that scales with the slot, printed with the unit name. It is aircraft content and takes no brand tokens.
- Powered: the mirror shows the unit's current page. Powered off: a dark screen with no content. A device's power follows its electrical bus.
- The slot is one target of at least the touch size; activating it opens the unit in the dock.

### S12 Device dock

- The dock is chrome around aircraft content: its hint and close button use chrome tokens, the device inside takes none.
- Empty on start. Only one unit is open at a time.

### S9 Reduced motion

When the user prefers reduced motion, the highlight is the accent outline alone, with no pulse. The outline is the shape cue, so guidance never depends on motion or on hue.

### S10 Other theme

The same layout with the other theme's tokens. Nothing moves, resizes or changes content. The panel is identical in both themes.

### S11 Errors

- Error boundary: a chrome dialog over the app with a short readable message and a reset action. It does not show a stack trace.
- Missing panel image: a neutral placeholder in the image's place, labelled with the view name. Controls and indicators stay usable on it.
