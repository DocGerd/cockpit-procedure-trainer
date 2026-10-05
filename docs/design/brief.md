# Design brief: screens and states

Every screen and state the web app needs. Spec: `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, §5 (Screen) and §6. Values come from `BRAND.md`.

Screen ids (`S1` …) are stable. The design handoff maps each drawn artboard to them.

## Frame rules

- The brand styles the chrome only: header, checklist pane, outside-view frame, tabs, popovers, dialogs. The panel shows the aircraft, never brand colours.
- Status inks appear only in the chrome.
- Every screen exists in light and dark with the same layout. Tablet and desktop are both first-class, touch and mouse alike.

## Screens

### S1 Main layout, desktop

- Header: aircraft, procedure, mode, phase, language, theme. The UAT build adds a "UAT" badge.
- Outside-view strip on top.
- Panel below it, with view tabs.
- Checklist pane at the side.

### S2 Main layout, tablet

The same regions as S1. The checklist pane is collapsed to a header toggle that shows progress (`2 / 6`) and can be expanded over the panel.

### S3 Checklist pane per mode

- Guided: current item highlighted, deviations shown at once.
- Practice: no highlight, a deviation count, summary at the end.
- Free explore: no checklist; control details instead (S7).
- Each item shows its state: pending, current, done, deviated.
- An emergency procedure is marked as such in the pane header.

### S4 Outside-view strip

The outside view of the current phase, with the phase selector.

### S5 Aircraft and procedure picker

Aircraft, procedure and mode choice. On start it shows the notice: training aid only, the aircraft's handbook is authoritative, not for use in flight.

### S6 Deviation summary

Shown when a procedure ends: the deviations, and the end phase if the procedure names one.

### S7 Control details in Free explore

Name and purpose of the tapped control, with a toggle to operate controls freely instead.

### S8 Device screens in the panel

An avionics unit's own screen and bezel inside its panel placement (spec §4.9): powered and powered off.

### S9 Guided highlight on the panel

Accent outline with a pulse around the current target. A reduced-motion variant keeps the outline and drops the pulse.

### S10 Light and dark

Both themes for S1 to S9 and S11.

### S11 Error states

- Error boundary: a readable message and a reset.
- Missing panel image: a labelled placeholder.

## Covered and missing

The product's design canvas has five artboards.

| Artboard | Draws                                                  | Screens                       |
| -------- | ------------------------------------------------------ | ----------------------------- |
| Main     | desktop Guided in light                                | S1, S3 Guided, S4             |
| Practice | dark, emergency procedure, a deviation, phase selector | S3 Practice, S4, S10 (part)   |
| Explore  | light, control details as a side pane                  | S3 Free explore, S7 as a pane |
| Picker   | the training-aid notice                                | S5                            |
| Summary  | the procedure summary                                  | S6                            |

Not drawn, specified below in words:

| Screen | Missing                                                          |
| ------ | ---------------------------------------------------------------- |
| S2     | tablet with the collapsed and the expanded checklist             |
| S7     | control details as a popover                                     |
| S8     | device screens                                                   |
| S9     | reduced-motion variant                                           |
| S10    | dark for Guided, Explore, picker and summary; light for Practice |
| S11    | error states                                                     |

## Specification of the missing screens

Each derives from a drawn artboard, so the web shell can be built without new drawings.

### S2 Tablet

- Below the desktop breakpoint, which the web shell chooses, the checklist pane collapses to a header button showing progress (`2 / 6`).
- Opening it slides the pane in from the side, over the panel. Content is the same as on desktop.
- A tap outside the pane, or the same button, closes it. Guided keeps highlighting and switching views while the pane is closed.
- Header, outside-view strip and panel keep the S1 layout.

### S7 Popover

- Tapping a control in Free explore opens its details in a popover anchored to that control, replacing the side pane of the drawn Explore artboard. Content is the same: name, purpose and the operate-freely toggle.
- It closes on a tap outside or on Escape, and only one is open at a time.
- It stays inside the viewport and flips to the opposite side of the control when it does not fit.
- It is chrome: surface, border and text tokens apply, the control keeps its own look.
- With operate freely on, a tap operates the control and no popover opens.

### S8 Device screens

- The device draws its own rendering inside its panel placement: bezel, display and the unit's controls. It is aircraft content and takes no brand tokens.
- Powered: the screen shows the unit's current page.
- Powered off: a dark screen with no content. A device's power follows its electrical bus.

### S9 Reduced motion

When the user prefers reduced motion, the highlight is the accent outline alone, with no pulse. The outline is the shape cue, so guidance never depends on motion or on hue.

### S10 Other theme

The same layout with the other theme's tokens. Nothing moves, resizes or changes content. The panel is identical in both themes.

### S11 Errors

- Error boundary: a chrome dialog over the app with a short readable message and a reset action. It does not show a stack trace.
- Missing panel image: a neutral placeholder in the image's place, labelled with the view name. Controls and indicators stay usable on it.
