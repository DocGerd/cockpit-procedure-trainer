# M18 D-MPGO Avionics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the CTSL carries D-MPGO's own avionics, so a pilot practises the radio, transponder, GPS and FLARM display that are in the aircraft, where the aircraft has them.

**Design:** spec §4.9 (avionics devices) and the decisions-table row "Avionics (CTSL)" added by W1; `docs/aircraft/ctsl-intake.md` §2a items 5 to 9 (owner decisions), §3.8 (one paraphrased section per unit, with its panel position) and §9 questions 33 to 39; `docs/adding-a-device.md`. ADR 0002: rank 1 procedural correctness, rank 2 realism; accessibility ranks lowest.

**Inputs:** the owner's decisions of 2026-10-10, binding:

1. GPS: Garmin aera 500 in its panel cradle.
2. COM: funkwerk ATR833-OLED, round 57 mm. Its only source is the manufacturer-hosted ATR833-II manual; a II fact whose control D-MPGO's face lacks is out.
3. Transponder: funkwerk TRT800H-OLED, round 57 mm, from the manufacturer's TRT800H manual revision 3.00.
4. FLARM: the classic rectangular external FLARM LED display (16 LEDs, one Mode button), built as a full device, from the EDIATec display sheet V5.1e and the FLARM operating manual.
5. These replace SL40, GTX 327 and GPSMAP 496 in the CTSL (spec change approved). `device-sl40`, `device-gtx327` and `device-gpsmap496` stay in the repo with their tests and READMEs, unregistered. The generic `device-com` and `device-transponder` do not match and stay as they are (demo aircraft).
6. Device ids `atr833`, `trt800h`, `aera500`, `flarm` (`packages/device-<id>`).
7. The aircraft name drops "(representative panel)" in the swap. The Com, Transponder and GPS breaker legends stay.
8. #657 (panel-kit glare) lands before or with the device PRs (landed as #671); #661 (1024 px labels, header ellipsis) comes after the name change.

**Milestone:** M18 "D-MPGO avionics" (GitHub milestone 19), released as v0.19.0. #633 is the umbrella issue.

**Tech stack:** as M12. No new dependency.

## Issues

Seven new issues, all on milestone 19, each the brief of one PR.

| Wave | Task                      | Issue        | Also closes | Branch                       | Area                    |
| ---- | ------------------------- | ------------ | ----------- | ---------------------------- | ----------------------- |
| W1   | Intake, spec and plan     | `#672`  |             | `docs/672-d-mpgo-avionics-intake`        | docs                    |
| W1   | Slot-fit test harness     | `#673` |             | `chore/673-slot-fit`         | tools, apps/web tests   |
| W1   | Softer glass glare        | #657         |             | landed as #671               | panel-kit               |
| W2   | ATR833 COM radio          | `#674`  |             | `feat/674-device-atr833`     | device                  |
| W2   | TRT800H transponder       | `#675` |             | `feat/675-device-trt800h`    | device                  |
| W2   | aera 500 GPS              | `#676` |             | `feat/676-device-aera500`    | device                  |
| W2   | FLARM display             | `#677`   |             | `feat/677-device-flarm`      | device                  |
| W3   | CTSL swap and name        | `#678`    | #633        | `feat/678-ctsl-d-mpgo-avionics` | aircraft, apps/web, e2e |
| W4   | CTSL at 1024 px           | #661         |             | `fix/661-ctsl-1024`          | apps/web shell, e2e     |

Issue titles and scope to file:

- **`#672` "M18 intake: D-MPGO avionics decisions, unit sections, spec row and plan".** Docs only; `Refs #633`. Scope: task W1a.
- **`#673` "Check slot mirrors against the installing aircraft, not against the CTSL".** Tests and docs only. Scope: task W1b.
- **`#674` "Device: funkwerk ATR833-OLED COM radio (`atr833`)".** New package, registered, not installed. Scope: W2 common list plus the ATR833 section.
- **`#675` "Device: funkwerk TRT800H-OLED transponder (`trt800h`)".** As above, TRT800H section.
- **`#676` "Device: Garmin aera 500 GPS (`aera500`)".** As above, aera 500 section.
- **`#677` "Device: classic FLARM external LED display (`flarm`)".** As above, FLARM section.
- **`#678` "CTSL installs D-MPGO's avionics and drops '(representative panel)'".** Scope: task W3. Its PR body carries `Closes #678` and `Closes #633`, the last M18 PR in #633's scope.

Not in M18:

- **Simulated traffic for the FLARM.** Spec §4.9 rules out anything that needs the outside world. Traffic scenarios would change the decisions table: §9 question 39 asks the owner, no code.
- **The generic `com` and `transponder` devices** and the demo aircraft: unchanged.
- **ATR833-II features absent from D-MPGO's face** (owner decision 2).

## Pre-flight checks

**(a) #657 has landed** (#671). W2 shares no file with it. W3 is judged on the final glass.

**(b) The decisions-table change is owner-approved.** W1 adds the row; no other PR edits the spec.

**(c) Facts come from the intake.** W1 paraphrases the unit notes into intake §3.8. Device implementers read §3.8 and this plan only: never the manuals (kept local in the session scratchpad, never committed), never `reference/`. The aera 500 guide forbids reproduction and the FLARM sources are third-party: paraphrase only, no figure, table, icon or wording copied.

**(d) Printed labels.** Every operable key prints its label (`apps/web/src/panel/printed-labels.test.tsx` "device keys"); the rule is decision D6.

**(e) Numbered lists.** §2a items 5 to 9 and §9 questions 33 to 39 belong to W1. No other PR appends to either list; W3 adds "Trainer:" notes under them.

## Global constraints

- Everything in the M12 plan's Global constraints applies: base `develop`, one issue per PR with `Closes #<n>`, a fragment or a `No changelog:` line, separate-agent review via `pr-selfreview`, `merge-train`, tests first, and the CONTRIBUTING Checks chain before every push.
- An issue's scope and this plan's file lists are the allowlist. A task that needs another file names it and why in the PR.
- No manufacturer artwork, logos or lettering: no funkwerk logo, no "GARMIN aera 500" bezel text, no lowercase FLARM wordmark. Face lettering that names a function (I/O, SET, VFR, Mode, RX …) is drawn in project type; the slot label is the plain unit word.
- Colours, type and spacing from `apps/web/src/styles/tokens.css` only; device screens use `var(--panel-*)` only; no status colour on the panel (the aera's lost-fix mark and the FLARM's LEDs included).
- Device procedure targets are taps: Guided, `walkProcedure` and e2e `pressDevice` press and release at once. A function that needs a long hold is never a procedure step (decision D5).
- Comments only where the code cannot say it; no measured figure or timing in a comment (the constants and the intake own them).
- Every implementer stops the dev servers, watchers and poll loops it started before handing back; never `pkill` by name.
- No M18 PR changes a workflow, security behaviour or process, so the OpenSSF badge docs (`docs/openssf-best-practices-badge.md`, `SECURITY.md`, `GOVERNANCE.md`, `docs/security-assurance-case.md`) stay untouched; `docs/architecture.md` needs no change either (its `packages/device-<id>` row is generic).

## Waves and agents

| Wave | PRs                                           | Starts when                                    | Agents                                                                                                   |
| ---- | --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| W1   | `#672`, `#673` in parallel (#657 landed) | now                                      | 3 implementers (doc-writer plus a committer for the intake; one for the harness), 2 reviewers, 1 merge train |
| W2   | four device PRs in parallel                   | both W1 PRs landed                             | 4 implementers (`sonnet`, high), 4 reviewers, 1 merge train; no ui-verifier (nothing new renders in the app) |
| W3   | `#678`                                     | all four device PRs landed                     | 1 implementer (`opus`, L17; no split of the unregistering), 1 reviewer (`opus`, xhigh: the one cross-cutting PR), 1 ui-verifier, 1 blind rubric scorer, 1 merge train; the orchestrator runs the review-toolkit pass |
| W4   | #661                                          | W3 landed                                      | 1 implementer, 1 reviewer, 1 ui-verifier, 1 merge train                                                  |
| End  | release PR                                    | every milestone-19 issue closed               | `milestone-release`                                                                                      |

## Dependency graph

```
W1  #672 (docs) ──────────┐
    #673 (tests) ────────┤        #657 landed (#671)
                               ▼
W2  #674  #675  #676  #677     (parallel; land one at a time)
                               ▼
W3  #678  (installs, slots, art, procedures, seeds, e2e, unregister, name)  closes #633
                               ▼
W4  #661  (1024 px labels and header, after the shorter name)
```

## Shared files in W2: pre-assigned rows

Each device PR touches these shared files and nothing else outside its package. Positions are chosen so that two PRs never insert at the same place, except where alphabetical order forces it (marked "adjacent").

**`apps/web/src/device-registry.ts`**

| Device  | Import line (alphabetical by module)                                              | `deviceRegistry` and `deviceEntries` position |
| ------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| aera500 | `import { aera500Device, aera500ScreenEntry } from '@cpt/device-aera500';` after `@cpt/core` (adjacent to atr833) | before `com`                                  |
| atr833  | `import { atr833Device, atr833ScreenEntry } from '@cpt/device-atr833';` before `@cpt/device-com` (adjacent to aera500) | after `com`, before `sl40`                    |
| flarm   | `import { flarmDevice, flarmScreenEntry } from '@cpt/device-flarm';` between `device-com` and `device-gpsmap496` | after `gpsmap496`, before `transponder`       |
| trt800h | `import { trt800hDevice, trt800hScreenEntry } from '@cpt/device-trt800h';` between `device-transponder` and `@cpt/panel-kit` | after `transponder`, last                     |

`deviceEntries` rows read `[atr833Device.id]: atr833ScreenEntry,` and so on. `deviceScreens` is never edited. Order after W2: aera500, com, atr833, sl40, gtx327, gpsmap496, flarm, transponder, trt800h; after W3 removes three: aera500, com, atr833, flarm, transponder, trt800h.

**`apps/web/src/devices/messages.ts` `unitNames`** (both blocks, same positions)

| Device  | Position                          | en          | de              |
| ------- | --------------------------------- | ----------- | --------------- |
| flarm   | first, before `com`               | `'FLARM'`   | `'FLARM'`       |
| atr833  | after `sl40`, before `transponder` | `'COM radio'` | `'COM-Funkgerät'` |
| trt800h | after `gtx327`, before `gpsmap496` | `'Transponder'` | `'Transponder'` |
| aera500 | after `gpsmap496`, last           | `'GPS'`     | `'GPS'`         |

**`tools/device-entry.test.ts` `NATURAL_SCREEN`**: one row, same positions as `unitNames` (flarm first; atr833 after sl40; trt800h after gtx327; aera500 last), value `[w, h]` measured in Chromium on the powered Screen. `SLOT_OF`: no row; `#673` removes the table (W1b). No `views.ts` slot key in W2: the CTSL slots change in W3 only.

**`apps/web/package.json`**: `"@cpt/device-<id>": "workspace:*"` in alphabetical order (aera500 and atr833 adjacent after `@cpt/core`; flarm after `device-com`; trt800h after `device-transponder`). **`pnpm-lock.yaml`**: regenerated by `pnpm install`, never hand-edited.

**Merge order.** The device PRs land in the order their reviews finish; the train lands one at a time. If two are ready together: flarm, trt800h, aera500, atr833 (smallest first, so the largest absorbs the most updates while still in review).

**Conflict protocol** (every later device PR, after each landing):

- [ ] The merge train updates the branch from `develop` (a merge, never a rebase after the first push; force-push is blocked). On a conflict it stops and hands the branch back to the PR's implementer, who resolves it in its own worktree (`git fetch origin`, then `git merge origin/develop`):
- [ ] Shared files: keep both sides, each row at its pre-assigned position above.
- [ ] Lockfile: `git checkout origin/develop -- pnpm-lock.yaml`, then `pnpm install`, then stage the regenerated file.
- [ ] Run the full Checks chain on the merged head; push.
- [ ] The reviewer checks the merge commit's conflict hunks; threads resolved; then the train lands it.

## Tasks

### W1a Intake, spec and plan (`#672`, Refs #633)

Files: `docs/aircraft/ctsl-intake.md`, `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, `docs/superpowers/plans/2026-10-10-m18-d-mpgo-avionics.md` (this plan). `No changelog: intake, spec and plan; the behaviour change and its fragment land with #678.` (`changelog.d/README.md`: a spec change that alters behaviour needs a fragment; here the behaviour changes only in W3.)

- [ ] §2a items 5 to 9: (5) the four units replace SL40, GTX 327 and GPSMAP 496; (6) ATR833 facts only from the ATR833-II manual and only for controls on D-MPGO's face; (7) TRT800H manual revision 3.00; FLARM from the EDIATec sheet V5.1e and the FLARM operating manual, built as a full device; (8) the three old device packages stay, unregistered; (9) the name drops "(representative panel)" when the units land, and the Com, Transponder and GPS breaker legends stay.
- [ ] §2 decision 1 and its note: superseded by §2a item 5 (M18).
- [ ] §3.6 bus map: a FLARM row, "no own breaker shown; avionics bus", **assumed (unverified)**, §9 q33.
- [ ] New §3.8 "Avionics units (M18)", one subsection each: §3.8.1 COM ATR833-OLED, §3.8.2 transponder TRT800H-OLED, §3.8.3 GPS aera 500, §3.8.4 FLARM external display. Each holds, paraphrased: identification and its certainty; **panel position** (from the identification: FLARM top-left of the upper-centre field above the GPS; aera 500 middle, centred; COM bottom row left under the GPS; transponder bottom row right of the COM, next to the breaker rows); source document (title, number, revision, host); face layout with every printed legend and where it sits; each control's functions; display lines; power-on and power-off; entry and swap sequences; typical use by flight phase; uncertain points, each pointing to a §9 question; and a "Trainer (M18)" paragraph stating what the device models and leaves out, as this plan's device sections say.
- [ ] §9 questions, numbered here and nowhere else: **33** FLARM power source; **34** FLARM check before take-off; **35** ATR833 AUTO ON setting; **36** ATR833 generation (original OLED or II features: LST, named memories, REPLAY) and any lettering at the lower-right knob; **37** TRT800H set-up (Mode S cradle address, ground switch, stored VFR code); **38** aera 500 on D-MPGO (cradle power loss, map orientation and data fields, the club's start-up step); **39** FLARM display hardware version, the FLARM unit it is paired with, and whether simulated traffic is wanted (spec change). q14: answered by §2a item 5. q32: the GPS switch-on step becomes the aera's database acceptance, then its map page (W3).
- [ ] Spec §2 decisions table, new row after "Visual design": `| Avionics (CTSL) | D-MPGO's installed units: funkwerk ATR833-OLED COM and TRT800H-OLED transponder (round 57 mm), Garmin aera 500 in its cradle, and the classic FLARM external LED display; they replace SL40, GTX 327 and GPSMAP 496 (owner decision 2026-10-10). ATR833 facts come from the ATR833-II manual, limited to D-MPGO's face. The FLARM has no traffic (§4.9 scope). |`
- [ ] Spec §4.9 scope paragraph: the CTSL's GPS (aera 500) finds its fix after a short search once powered or is seeded from line-up; the FLARM display finds its own; neither shows traffic, map data or a database.
- [ ] Spec §11 ticket 47: done in M18, one issue per unit.
- [ ] This plan with the filed issue numbers, then `pnpm exec prettier --write docs/aircraft/ctsl-intake.md` (`.prettierignore` excludes `docs/superpowers`, so `format:check` skips the plan and the spec).

### W1b Slot-fit test harness (`#673`)

Why: `tools/device-entry.test.ts` checks every device package's mirror against a CTSL slot through `SLOT_OF`. Four new devices with no CTSL slot yet, and three old ones whose slots W3 reshapes, cannot pass it. The fit is a property of an install, so it moves to the installs.

Files: `tools/device-entry.test.ts`, new `apps/web/src/devices/slot-fit.test.tsx`, `docs/adding-a-device.md`, `.claude/skills/add-device/SKILL.md`. `No changelog: tests and docs only.` The fit test lives in `apps/web`, not `tools/`: it checks registered aircraft installs, as `apps/web/src/aircraft-validation.test.ts` checks dock floors per install; the per-package contracts stay in `tools/` (the PR states this).

- [ ] New `slot-fit.test.tsx`: for every registered aircraft with a cockpit dock, for every install, render the device's `Display` (from `deviceEntries`, initial state, `on`) with `react-dom/server` `renderToStaticMarkup` in the node environment (jsdom's style parser can drop `aspect-ratio` and `calc(var(…))`), parse the bezel's `width:calc(var(--a) * N + var(--b))` and `aspect-ratio:X / Y`, and assert (1) the mirror aspect equals the placement rect's aspect to 2 decimals, and (2) the smallest inline text and the `.pk-mirror-label` size times the slot scale at the panel floor is at least `--text-2xs`. The scale is computed as the old test does: the slot rect in px at the floor (`rect × cockpit.views[view].minWidth / views[view].size.width`), then `min(slotW / naturalW, slotH / naturalH)`. The demo's radio and transponder are in scope (24 px × 649/1406 = 11.08 px, just above 11).
- [ ] Tests first: it passes for today's CTSL installs and fails for a deliberately mismatched rect in a test-local aircraft.
- [ ] `device-entry.test.ts`: delete `SLOT_OF` and the "mirror lettering at the panel floor" block; keep `mirrorSize()` and add to the per-package Display test that the bezel style parses to a finite width and aspect (until now only the deleted block parsed it, so the uninstalled W2 devices would go unchecked until W3); keep the label `^[A-Z0-9]+$` and Display inline type-scale checks.
- [ ] `docs/adding-a-device.md`: replace the `SLOT_OF` sentence; say a Display may pass a device-local `MirrorSize`; reword the "A device is generic" paragraph to spec §4.9 (a device models the specific unit; no manufacturer artwork, logos or lettering). The add-device skill drops its `SLOT_OF` item.

### W2 Device PRs: common checklist (each of `#674`, `#675`, `#676`, `#677`)

Files: `packages/device-<id>/**` (new, copied from the nearest sibling), plus the shared rows above. `No changelog: the unit is registered but no aircraft installs it until #678.`

- [ ] Read `docs/adding-a-device.md`, `docs/content-policy.md`, intake §3.8.n and this plan's device section. Nothing else is a source. Work through the `add-device` skill's touch points; its "serialise registry edits" is met by the pre-assigned rows below and one-at-a-time landing.
- [ ] Logic with `defineDevice`: controls, state, inputs and timings exactly as this plan's section (state field names are W3's contract with its stand-ins, seeds and checks); `manual` names the source revision and intake §3.8.n; `notModelled` equals the README list.
- [ ] Power: when `powered` is false, ignore the controls, drop transients, keep settings, record positions. A device that reacts to power arriving keeps the last power it saw in a state field `powered`, so a phase seed can set it `true` and the first step sees no power-up edge.
- [ ] Holds (decision D5): a key with a hold function sums `dtMs` in `heldMs` while pressed; the hold acts at its threshold; the short function acts on release if the threshold was not reached. Keys with a hold use panel-kit `useHold` (press on pointer down, release on pointer up). Exception: the FLARM's Mode acts on release by how long it was held, as its section says.
- [ ] Screen: every key a native `<button>` with its own printed text (D6), `data-control`, `data-position` where it stands for one position, `min-height`/`min-width` `var(--size-target)`; type only from the scale; no `<style>` or `<script>`, also not inside an inline SVG (CSP; the Display test rejects both). Natural size at most **456 x 303** px, so `floor` (natural + 24) fits the CTSL dock (480 wide, 327.9 tall at its minimum).
- [ ] Display: `DeviceDisplayFrame` with a device-local `MirrorSize` from Settled values, label as Settled values, every inline text at `--text-2xl` or larger (the slot scale at the panel floor is 0.468), the same contents as the Screen without keys.
- [ ] Tests: logic per behaviour including power loss and each hold; a session test that installs the device in a test-local aircraft, runs the validator and walks a procedure with `walkProcedure`; screen tests (accessible names, `send` calls); readout in both languages, on and off.
- [ ] Every position that no key prints at a `data-position` declares `legends` (`position-legends.test.tsx` runs once W3 installs the device).
- [ ] README: title `# @cpt/device-<id>`, `## Source revision` (document, revision, intake §3.8.n, and every assumption), `## Controls` (one bullet per control), `## Inputs`, `## Display`, `## Not modelled` (equal to `notModelled`).
- [ ] Shared rows at their pre-assigned positions; `pnpm install`; Checks chain.

### W2.1 ATR833 COM radio (`atr833`, intake §3.8.1)

Face: square bezel, round 57 mm face, `COM` printed vertically on the left; keys I/O, SET, MEM above the display, DW, ▼▲, ► below; knob VOL/SEL at upper right, an unlettered knob at lower right.

| Control  | Kind                                      | Dock key text (`data-position`)       | Function                                                                                                                                                       |
| -------- | ----------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `power`  | momentary                                 | `I/O`                                 | Off and powered: any press switches on. On: held `POWER_OFF_HOLD_MS` switches off.                                                                               |
| `set`    | momentary                                 | `SET`                                 | Release: next line-3 item VOL, SQL, VOX, INT, STL, STR, EXT, BRT, then VOL. In a MEM or LST list: the entry goes to standby, list closes.                         |
| `mem`    | momentary                                 | `MEM`                                 | Release: opens the MEM list (slots 01 to 20); a second release while it is open opens LST (last 10 active). Held `MEM_SAVE_HOLD_MS`: save mode (`MEM saveTo nn`); the release that ends this hold does nothing more. In save mode `volSel` picks the slot and a later short release writes the standby frequency to it and shows `>` before it (standby, not active: §2.1 and the worked example against the §2.3 table; assumed). |
| `dw`     | momentary                                 | `DW`                                  | Toggles dual watch (line 2 reads `DW` for `SBY`). In a menu or list: back to the standard display.                                                              |
| `swap`   | momentary                                 | `▼▲` (accessible name `SWAP`)         | Exchanges active and standby. In a list: the entry goes to active.                                                                                             |
| `cursor` | momentary                                 | `►` (accessible name `CURSOR`)        | Moves the underline to the next standby field: MHz, then the 100 kHz digit, then the channel digits, then MHz (the wrap back to MHz is assumed).                                                  |
| `volSel` | rotary `rest`, `down`, `up`; spring-back  | `VOL/SEL −` (`down`), `VOL/SEL +` (`up`) | Steps the line-3 item's value; in a list, the entry; in save mode, the slot.                                                                                |
| `freq`   | rotary `rest`, `down`, `up`; spring-back  | `FREQ −` (`down`), `FREQ +` (`up`)    | Steps the underlined field of the standby frequency.                                                                                                           |

- **State:** `on`, `powered`, `active` and `standby` (kHz of the channel name, e.g. 132055), `cursor` (`mhz`, `tenths` or `channel`), `dualWatch`, `item`, `settings` (`vol` 1–20, `sql` 0–9, `vox` 0–9, `int`, `stl`, `str`, `ext` 0–20 with 0 shown as off, `brt` 0–9), `list` (null, or kind `mem`, `lst` or `save` with an index), `memory` (20 slots, kHz or null), `recent` (up to 10 kHz, newest first), `saved`, `idleMs`, `held`, `heldMs`.
- **Initial:** active 118.000, standby 119.000, cursor on MHz, VOL 10, SQL 5 (manual default), VOX 5, INT 10, STL 10, STR 10, EXT off, BRT 9 (all but SQL assumed), memory empty, dual watch off. One `freq` up from power-on gives standby 120.000, which W3's procedure needs.
- **Entry:** spacing fixed at 8.33 kHz. MHz 118 to 136; the channel field steps through the 16 names of a 100 kHz block (.x00 .x05 .x10 .x15 .x25 .x30 .x35 .x40 .x50 .x55 .x60 .x65 .x75 .x80 .x85 .x90); each field wraps without carrying into its neighbour, and the result stays within 118.000 to 136.990 (assumed: the manual gives 118.000 to 136.975 MHz and shows neither carry nor wrap; 136.990 is the last 8.33 kHz name of the 136.975 block).
- **Dual watch** turns off when either frequency changes, a swap included. A frequency that becomes active joins `recent`.
- **Timeout:** a list or a non-VOL line-3 item returns to the standard display after `MENU_TIMEOUT_MS` without input.
- **Inputs:** none. **Power:** AUTO ON assumed on (§9 q35): power arriving switches the unit on; power lost switches it off; frequencies, settings and memory are kept.
- **Screen and Display:** three lines `ACT 118.000`, `SBY 119.000` (or `DW`) with the cursor field underlined, line 3 `VOL 10` (or the list or save line). Mirror: round face drawn by the Display inside the frame window, the two knobs as plain discs in the right-hand corners, label `COM`.
- **Not modelled:** reception, transmission and audio (`RX`, `TX`, `Te` and the stuck-mic time-out; volumes are numbers only); REPLAY of the last call; the setup menu (SET held 5 s): spacing (fixed 8.33 kHz), display dimming, dual-watch volume reduction, PTT selection, microphone, headset and external-audio settings, AUTO ON (fixed on), versions; memory names and clearing a slot; the low-voltage `BAT` warning; the start screen; factory reset; the external swap button, intercom switch, remote control and PC frequency tool.

### W2.2 TRT800H transponder (`trt800h`, intake §3.8.2)

Face: square bezel with three screws and the knob in the fourth corner, round 57 mm face, `ATC` printed vertically on the left; keys I/O, VFR, ID above the display, MODE, ▲▼, ► below; one unlettered knob at lower right.

| Control  | Kind                                     | Dock key text (`data-position`)    | Function                                                                                                                                                                                           |
| -------- | ---------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `power`  | momentary                                | `I/O`                              | Off and powered: any press switches on, in STBY. On: held `POWER_OFF_HOLD_MS` switches off.                                                                                                     |
| `vfr`    | momentary                                | `VFR`                              | Release: the VFR code becomes active, the old active code goes to standby, line 4 shows `VFR`; a release while `VFR` is shown shows the standby code again, VFR staying active (§2.9 reading, assumed). Held `VFR_STORE_HOLD_MS`: the active code becomes the VFR code (`S`, then `VFR`). |
| `ident`  | momentary                                | `ID`                               | In ACS or A-S: `IDT` for `IDENT_MS`. In STBY: nothing (the held-ID menus are not modelled).                                                                                                     |
| `mode`   | momentary                                | `MODE`                             | STBY, ACS, A-S, then STBY.                                                                                                                                                                       |
| `swap`   | momentary                                | `▲▼` (accessible name `CHANGE`)    | With the cursor on a digit: moves it back one digit, the reverse of `►` (§2.2, §4.5.4; from the first digit it is removed, assumed). While `VFR` is shown: shows the standby code again, VFR staying active (§2.9). Otherwise: exchanges active and standby codes.                                                                                                                      |
| `cursor` | momentary                                | `►` (accessible name `CURSOR`)     | Puts the cursor on the standby code's first digit, then the next; after the fourth it is removed (assumed).                                                                                              |
| `knob`   | rotary `rest`, `down`, `up`; spring-back | `CODE −` (`down`), `CODE +` (`up`) | Steps the digit under the cursor, 0 to 7 (the wrap is assumed). With no cursor while `VFR` is shown: shows the standby code.                                                                               |

- **State:** `on`, `mode` (`stby`, `acs` or `as`), `squawk` (active code, four digits), `standby`, `vfrCode`, `vfrShown`, `storedMs`, `cursor` (0 to 3 or null), `identMs`, `flightLevel` (number, or null for `FLerr`), `reporting` (derived: unit on, `acs`, valid flight level), `held`, `heldMs`.
- **Initial:** off, STBY, active 2000 and standby 2000 (placeholders, as `gtx327`), VFR code 7000 (factory).
- **Input:** `pressureAltitude` (ft); flight level = altitude / 100 rounded, `FLerr` outside −1000 to 35 000 ft.
- **Power:** no auto-on (the manual has none); power lost switches off and keeps the codes and the VFR code.
- **Screen and Display:** four lines: mode text (`ACS`, `A-S`) and active code on top; line 3 `IDT` left and `FL 030` right; bottom line `STBY` left in standby and the standby code or `VFR` right; caret under the cursor digit. Mirror: round face drawn by the Display, the knob as a plain disc in the lower-right corner, label `ATC`.
- **Not modelled:** interrogations, replies, the reply and lock-out indicators, squitter and ADS-B; Flight ID display and entry, setup pages and altitude correction (ID held in standby); operation without the cradle's address (`Cradle OFF`, `AC-`, `A--`) and the power-up record list; brightness (`DIM`); error codes, the low-voltage `BAT` warning and test mode; the ground-switch state; the start screen; the remote control head.

### W2.3 aera 500 GPS (`aera500`, intake §3.8.3)

Face: landscape 4.3 inch touchscreen; one physical POWER button; the unit sits in its cradle, which the panel art draws (W3). Modelled pages, sized to a trainer: start-up (database acceptance), Home, Map, Nearest, Active FPL, Direct To, Position, Tools with GPS Status, and the backlight overlay. Why this subset: it is every page a pilot reaches in the CTSL's procedures (power-up, acceptance, map, fix), plus the Home icons a pilot uses en route; the other pages (Terrain, HSI/Panel, Traffic, Weather, WPT Info, Numbers) present data the trainer does not have.

| Control | Kind                                                     | Dock key text (`data-position`) | Function                                                                                                                       |
| ------- | -------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `power` | momentary                                                | `POWER` (outside the screen)    | Off and powered: any press switches on. On: release opens or closes the backlight overlay; held `POWER_OFF_HOLD_MS` switches off. |
| `touch` | rotary; every position but `rest` springs back to `rest` | one key per icon, below         | The touchscreen: each position is one icon, shown only on the page that has it.                                                 |

`touch` positions and where they show: `accept` "Press To Accept" (start-up; the guide's name for the button, D6); `home` "Home" (every page but start-up and Home: the start-up page offers only its acceptance button); `back` "Back" (Nearest, Active FPL, Direct To, Position, Tools, GPS Status: to the parent page); `map` "Map", `nearest` "Nearest", `activeFpl` "Active FPL", `directTo` "Direct To", `position` "Position", `tools` "Tools" (Home grid); `gpsStatus` "GPS Status" (Tools); `zoomOut` "Out", `zoomIn` "In" (Map); `dimmer` "−", `brighter` "+" (overlay). Every icon position declares `legends` (its icon name), since most are off the initial page; `rest` takes the knob-style rest legend.

- **Keys while dark:** the current page's touch keys always render, inert while the unit is dark (a press while off does nothing), because `device-keys.test.tsx`, the printed-labels "device keys" test, position-legends and `tools/device-entry.test.ts` render `device.initial` (unit off, start-up page) and need a `touch` key there. The key area is sized for the largest page (Home, six icons), so the Screen has one natural size on every page and `NATURAL_SCREEN` and `floor` hold everywhere.
- **Pages:** start-up shows the acceptance prompt and its Press To Accept key (no database dates; accepting opens Home); Home shows the six icons and GPS signal bars; Map shows a schematic track-up map with range rings, the aircraft symbol, a compass arc, the range, and the data fields GS, ETE NEXT, BRG, DIST NEXT (GS live with a fix, the others dashed: no route); Nearest shows the Airport list header with no entries; Active FPL an empty plan; Direct To its search choices as text, not operable; Position the GPS altitude; GPS Status the receiver status text (Searching the Sky, Acquiring Satellites, 3D GPS Location) and schematic signal bars. Without a fix the map shows a question mark over the aircraft and blank GS.
- **State:** `on`, `powered`, `page` (`startup`, `home`, `map`, `nearest`, `activeFpl`, `directTo`, `position`, `tools`, `gpsStatus`), `overlay`, `backlight` (1–10), `rangeIndex`, `fix`, `acquiringMs`, `groundSpeedKt`, `trackDeg`, `altitudeFt`, `held`, `heldMs`.
- **Initial:** off, page `startup`, backlight 10, range 5 nm.
- **Range steps (assumed subset):** 0.5, 1, 2, 5, 10, 20, 50 nm.
- **Fix:** found `ACQUIRE_MS` after power-on, on any page; status text Searching the Sky for the first third, Acquiring Satellites until the fix, then 3D GPS Location (assumed split).
- **Inputs:** `groundSpeedKt`, `trackDeg` (as `gpsmap496`), `altitudeFt`.
- **Power:** cradle power arriving switches the unit on at the start-up page; power lost switches it off (battery not modelled, §9 q38); POWER held while on switches off (the real unit enters Charge Mode on cradle power: same screen-off result).
- **Display:** the current page without icons; label `GPS`; landscape 8:5 window.
- **Not modelled:** the navigation database (airports, navaids, airspace), so Nearest, Direct To and Active FPL stay empty and identifier entry is not modelled; map data, terrain, obstacles, weather, traffic and XM, and their pages (Terrain, HSI/Panel, Traffic, Weather, WPT Info, Numbers); the map pointer, panning, page menus (Menu icon) and map settings (orientation fixed track up); the satellite sky view, latitude and longitude and the reference waypoint; flight plans, Direct-To guidance, VNAV, alarms and message pop-ups; Tools other than GPS Status, and setup; sound and volume; the battery, Charge Mode and the power-loss warning; database dates and cycles; automotive and simulator modes; touchscreen calibration; screen dimming (the backlight level shows in its overlay only).

### W2.4 FLARM external display (`flarm`, intake §3.8.4)

Face: rectangular, about 2:1. Status LEDs in a column, printed RX, TX, GPS, Power; one key printed `Mode`; a ring of 10 LEDs around an aircraft outline (first at 018°, last at 342°, none at 12 or 6 o'clock); `above` and `below` LEDs at the ring's right. No power switch.

| Control | Kind      | Dock key text | Function (by how long it was held, acting on release)                                                                                           |
| ------- | --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode`  | momentary | `Mode`        | Under `BRIEF_PUSH_MS`: volume loud, medium, quiet, silent, loud. From `BRIEF_PUSH_MS` to `LONG_PUSH_MS`: Nearest and Collision swap, with the confirmation run (on the ground too; the manuals describe it in flight, assumed). Longer: nothing. |

- **Power and start-up:** on whenever powered. Power arriving runs the self-test: ring LEDs one at a time clockwise, then above, then below, then the status LEDs, `SELF_TEST_STEP_MS` each (assumed); then ready in Nearest mode at volume loud. The GPS search timer runs from power arriving, alongside the self-test, so the FLARM and the aera find their fixes together.
- **Status LEDs:** Power lit (flashing below `LOW_SUPPLY_V`; the 1 Hz rate is assumed); GPS dark with a brief flash each second until the fix, then lit with a brief blink each second; TX lit while operational (fix found and supply at or above `LOW_SUPPLY_V`: FLARM does not run below 8 V); RX dark (no traffic).
- **Ring and above/below:** dark, except in the self-test and the confirmation run (two LEDs running top to bottom into Nearest, bottom to top out of it).
- **State:** `powered`, `stage` (`selfTest` or `ready`), `stageMs`, `fix`, `acquiringMs`, `volume`, `mode` (`nearest` or `collision`), `confirm` (null, or direction and elapsed time), `clockMs` (blink phase), `lowSupply`, `operational` (derived: ready, fix found, supply good, so Power, GPS and TX are lit), `held`, `heldMs`.
- **Input:** `supplyVolts`.
- **Traffic:** none (spec §4.9). No traffic input is declared; adding one is §9 q39's spec change.
- **Screen and Display:** the face with all 16 LEDs drawn as discs in panel colours and an aircraft outline drawn for the project. The Display prints the status words and `Mode` inline at `--text-2xl` (the entry test needs inline type); a word that does not fit the mirror at that size is printed on the dock Screen only, named in the PR. Label `FLARM`.
- **Not modelled:** traffic and obstacle warnings, the Nearest-mode bearing, the RX light and the receiver self-test (no traffic, spec §4.9); warning suppression (double push); sound, so the volume level is kept but never heard; the software versions shown at start-up; reboot, factory reset and the display setup (Mode held at power-up); fault codes; flight recording.

### W3 CTSL swap and name (`#678`, closes #633)

One PR (decision D2). Files: `packages/aircraft-ctsl/src/{devices,views,phases,test-devices,devices.test,index,index.test,artwork.test}.ts`, `src/procedures/{avionics,avionics.test,normal,normal.test}.ts`, `src/assets/view-panel.svg`, `README.md`; `apps/web/src/{device-registry,device-registry.test,procedure-walkthrough.test}.ts`, `apps/web/src/devices/messages.ts`, `apps/web/src/panel/printed-labels.test.tsx`, `apps/web/src/shell/app-footer.test.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`; `tools/device-entry.test.ts`; `apps/web/e2e/{gtx327,gpsmap496}.spec.ts` (deleted), new `{atr833,trt800h,aera500,flarm}.spec.ts`, `modes-dock.spec.ts`, `dock.spec.ts`, `checklist-footer.spec.ts`; `docs/aircraft/ctsl-intake.md` (trainer notes); `docs/adding-a-device.md` and `.claude/skills/add-device/SKILL.md` (unregistered packages); `changelog.d/678.changed.md`. A device package changes only for a defect the ui-verifier or the slot-fit test finds, named in the PR.

**Installs (`devices.ts`).** Install keys and breakers stay.

| Install | Device    | Slot                | `powered`                                     | `inputs`                                                                      |
| ------- | --------- | ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `com`   | `atr833`  | `deviceSlots.com`   | `avionicsOn('comBreaker')`                    | none                                                                          |
| `xpdr`  | `trt800h` | `deviceSlots.xpdr`  | `avionicsOn('xpdrBreaker')`                   | `pressureAltitude: altitudeFt`                                                |
| `gps`   | `aera500` | `deviceSlots.gps`   | `avionicsOn('gpsBreaker')`                    | `groundSpeedKt` and `trackDeg` as today, `altitudeFt: altitudeFt`             |
| `flarm` | `flarm`   | `deviceSlots.flarm` | `state.systems.bus.avionicsPowered` (D11)     | `supplyVolts: bus.volts`                                                      |

**Slots (`views.ts`, panel units; size = the device's mirror natural size in px, so the slot scale at the panel floor is 0.468 and 24 px text reads at 11.2 px).** Sizes are binding. Positions follow the panel positions in intake §3.8 (from the photo identification) as far as the sizes allow; they are the starting layout, W3's call within the upper-centre field (x 471 to 1628, y 122 to 684), recorded in intake §3.2a.

| Slot    | Rect (x, y, w, h)    | Note                                                                                                     |
| ------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `flarm` | 500, 150, 320, 160   | Left of the GPS, not above it (keeps the §3.2a compromise: the field is not tall enough for both). 75 px tall at the floor; 44 px needs a panel at least 652 px wide, which W3 confirms at 768x1024 from `layout-probe`. |
| `gps`   | 880, 132, 400, 250   | Cradle frame and rail drawn around it; the second checklist placard stays right of it.                 |
| `com`   | 540, 404, 272, 272   | Below the FLARM and left of the GPS axis, so it still reaches over the dock (`index.test.ts` overlap test). |
| `xpdr`  | 832, 404, 272, 272   | Right of the COM, below the GPS.                                                                         |

**Panel art (`view-panel.svg`):** the GPS cradle frame and rail at 8:5; square recesses for the two round units (no captions, which the aircraft does not have); a recess for the FLARM display in place of the inert graphic-screen FLARM art; no logos. `artwork.test.ts` ("keeps the panel lettering in place") pins the `GPS`, `COM RADIO` and `TRANSPONDER` bay captions at their coordinates: drop the removed ones there and move any kept one with its bay. Run `pnpm test:perf`.

**Procedures, old to new** (`procedures/avionics.ts` `radioAndTransponder`, startPhase `holding`):

| #   | Old                                         | New                                                      | Text (EN / DE)                                                         |
| --- | ------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | action `com.coarse` = `up`                  | action `com.freq` = `up`                                 | unchanged                                                              |
| 2   | action `com.swap` = `pressed`               | unchanged                                                | unchanged                                                              |
| 3   | check `active` = 120000, target `com.swap`  | unchanged                                                | unchanged                                                              |
| 4   | action `xpdr.mode` = `sby`                  | action `xpdr.power` = `pressed`                          | "Transponder on (I/O), standby" / "Transponder ein (I/O), Standby"     |
| 5   | action `xpdr.vfr` = `pressed`               | unchanged                                                | unchanged                                                              |
| 6   | check squawk 7000 and mode `sby`            | check `squawk` = '7000' and `mode` = `stby`              | unchanged                                                              |
| 7   | action `xpdr.mode` = `alt`                  | action `xpdr.mode` = `pressed`                           | "Transponder to ACS (MODE)" / "Transponder auf ACS (MODE)"             |
| 8   | check mode `alt` and `reporting`            | check `mode` = `acs` and `reporting`                     | unchanged                                                              |

`avionics.test.ts` order becomes `com.freq=up, com.swap=pressed, xpdr.power=pressed, xpdr.vfr=pressed, xpdr.mode=pressed`.

`procedures/normal.ts`:

| Where                                  | Old                                                   | New                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| engine start, breaker check            | com, xpdr, gps breakers in                            | unchanged (the FLARM has no breaker)                                                                                 |
| before take-off, transponder action    | `xpdr.mode` = `sby`                                   | `xpdr.power` = `pressed`, "Transponder on, standby"                                                                 |
| before take-off, transponder check     | `xpdr.on` and control `xpdr.mode` = `sby`             | `field(state, 'xpdr', 'on') === true` and `field(state, 'xpdr', 'mode') === 'stby'`, target `xpdr.power`. Not `state.devices.xpdr?.on`: the runtime sets that to the install's power, and the TRT800H starts in `stby` while switched off, so the check would pass before I/O is pressed                                                             |
| before take-off, GPS action (q32)      | `gps.power` = `pressed`, "GPS on"                     | `gps.touch` = `accept`, "GPS: databases accepted" / "GPS: Datenbanken bestätigt" (the aera starts with cradle power) |
| new, right after the GPS action        | none                                                  | `gps.touch` = `map`, "GPS: map page" / "GPS: Kartenseite"; **assumed (unverified)**, §9 q38. Acceptance opens Home; the line-up seed says `page: 'map'`, and `procedure-walkthrough.test.ts` requires every leg from before take-off to shutdown to carry that seed |
| before take-off, GPS fix check         | `fix`, target `gps.power`                             | unchanged                                                                                                            |
| new, right after the GPS fix check     | none                                                  | check `flarm` `operational`, target `flarm.mode`, "FLARM: Power, GPS and TX lit" / "FLARM: Power, GPS und TX leuchten"; **assumed (unverified)**, §9 q34, FLARM manual's pre-departure check |

**Phase seeds (`phases.ts`).** Delete the `transponder(mode)` control seed and every `entry.devices` for `xpdr` (MODE is a key now). `deviceStates`:

- `linedUp` through `taxiIn`: `xpdr: { on: true, mode: 'acs', squawk: '7000' }`, `gps: { on: true, powered: true, page: 'map', fix: true }`, `flarm: { powered: true, stage: 'ready', fix: true }`.
- `parkingSecuring`: the `xpdr` seed `{ on: true, mode: 'stby', squawk: '7000' }` plus taxiIn's `gps` and `flarm` seeds (L16: the aera and FLARM stay up, not restarting at start-up or self-test).
- No `com` seed: AUTO ON switches it on with the avionics bus.

**Stand-ins (`test-devices.ts`):** `atr833`, `trt800h`, `aera500` and `flarm` stand-ins with the real control ids and kinds (the `touch` rotary with all its positions) and the state fields the procedures and seeds read; the `aera500` stand-in finds its fix at once when on and moves its page on `accept` (Home) and `map`, the `flarm` stand-in is `operational` whenever powered. Remove the three old stand-ins.

**Unregister the old three:**

- [ ] `device-registry.ts`: drop the sl40, gtx327 and gpsmap496 imports and rows. `messages.ts`: drop their `unitNames` rows. `apps/web/package.json`: drop their three dependencies (nothing in the app imports them); `pnpm install`.
- [ ] `tools/device-entry.test.ts` app-registry test: compare against the device packages minus `UNREGISTERED = ['gpsmap496', 'gtx327', 'sl40']`, and assert each listed id is a package and is not registered, so the list cannot rot. Their `NATURAL_SCREEN` rows stay (their package tests still run).
- [ ] `printed-labels.test.tsx` slot labels: `/^(COM|XPDR|ATC|GPS|FLARM)$/`.
- [ ] `docs/adding-a-device.md` (Installing in an aircraft) and the add-device skill: a package kept in the repo but not registered is listed in `UNREGISTERED` in `tools/device-entry.test.ts`; its own tests and the `tools/` per-package tests still run.

**Name:** `index.ts` `text('CT Supralight', 'CT Supralight')`; `index.test.ts`, `app-footer.test.tsx` and `README.md` line 3 ("drawn from the owner's photos of D-MPGO") follow; the README's Devices section and its inert-FLARM lines are rewritten for the four units; intake §1 "Panel wording" records it.

**Tests and e2e:**

- [ ] `devices.test.ts` per install (ids, slots, power, inputs; FLARM with the avionics master); `index.test.ts` four installs on `panel`, slots inside the view, the dock overlap with `com`, `com` and `xpdr` side by side below `gps`, the seeds per phase; `device-registry.test.ts` (xpdr state `mode`/`squawk`; gps powers up with the cradle, `touch` = `accept`, then `fix`, `groundSpeedKt`, `trackDeg`); `procedure-walkthrough.test.ts` keeps asserting that a full flight carries the line-up GPS seed (the N6 map step makes it hold).
- [ ] e2e: delete `gtx327.spec.ts` and `gpsmap496.spec.ts`; add `atr833.spec.ts` (FREQ + then ▼▲ gives ACT 120.000), `trt800h.spec.ts` (I/O gives STBY, VFR gives 7000, MODE gives ACS with FL), `aera500.spec.ts` (Press To Accept, Home, Map; GS from the cruise seed as `gpsmap496.spec.ts` does, or a wait for `ACQUIRE_MS` under `page.clock`), `flarm.spec.ts` (self-test, then Power and GPS lit; a 2 s Mode hold under `page.clock` runs the confirmation); `modes-dock.spec.ts` (ids and keys: `FREQ +`, `SWAP`, `I/O`, `VFR`, `MODE`; the item lookup `xpdr.mode` = `pressed`); `dock.spec.ts` (groups `trt800h`, `aera500`; four slots); `checklist-footer.spec.ts` (`aera500`). `full-flight.spec.ts` and `procedure.spec.ts` stay generic and green.
- [ ] `walk-procedure` over every CTSL procedure; `floors.spec.ts` and `layout.spec.ts` at 1920x1080 and 1920x950; `pnpm test:perf`.
- [ ] ui-verifier at 1920x1080, 3840x2160 and 1024x768 (walk the panel at 1920, then resize): every slot mirror and every docked device. The PR is rubric-scored (M12 rubric, at least 2 on every applicable heading) and stays a draft until a ui-verifier passes it; the scorer is briefed blind.

**Intake trainer notes (W3):** §1 Panel wording; §3.2a (slots, sizes, FLARM place); §3.6 the FLARM row's trainer note (W1a adds the row); §3.7.2 rows "Avionics units" and "FLARM, hour meter" resolved; §5 seed text; §6 N6 (transponder I/O, database acceptance and map page, FLARM check); "Trainer:" notes under q32 to q39.

### W4 CTSL at 1024 px (#661)

After W3: the shorter name changes the header measurement. Files: `apps/web/src/shell/{header.css,Header.tsx}`, `apps/web/src/outside-view/` label styles, `apps/web/e2e/{legibility.ts,layout.spec.ts}`; panel art only if the issue's label sizes need it, named in the PR.

- [ ] Header: aircraft name, "Start in phase" and "Checklist" without ellipsis at 1024x768 in EN and DE, or the shortest truncation the layout allows, stated in the PR.
- [ ] The legibility-exempt captions are guarded again at 1024x768 (`withoutSecondary`), or the PR states why tablet captions stay exempt (CONTRIBUTING: face lettering is enforced from 1920x1080 up). Mind `layout.spec.ts` `indicatorFaceGaps`, which marks ctsl `test.fail` at the tablet viewports (#420): a guard that starts passing flips them.
- [ ] ui-verifier at 1024x768 and 1440x900; fragment `changelog.d/661.fixed.md`.

## Settled values

| Value                     | Trainer uses                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit names (en / de)      | atr833 COM radio / COM-Funkgerät; trt800h Transponder / Transponder; aera500 GPS / GPS; flarm FLARM / FLARM                                 |
| Slot labels               | `COM`, `ATC`, `GPS`, `FLARM` (face words; no logos)                                                                                          |
| Round mirror              | `{ width: 'calc(var(--space-12) * 5 + var(--space-8))', aspectRatio: '1 / 1' }`: 272 px; atr833 and trt800h                                |
| aera 500 mirror           | `{ width: 'calc(var(--space-12) * 8 + var(--space-4))', aspectRatio: '8 / 5' }`: 400 x 250 px                                                |
| FLARM mirror              | `{ width: 'calc(var(--space-12) * 6 + var(--space-8))', aspectRatio: '2 / 1' }`: 320 x 160 px                                                |
| Mirror text               | `--text-2xl` or larger, inline                                                                                                                |
| Screen natural size       | at most 456 x 303 px (dock 480 x 327.9 at its minimum, minus 24 px frame chrome)                                                              |
| ATR833 timings            | `POWER_OFF_HOLD_MS` 3000; `MEM_SAVE_HOLD_MS` 1500 (the manual gives 1.5 s and 2 s; the shorter accepts both); `MENU_TIMEOUT_MS` 10 000       |
| TRT800H timings           | `POWER_OFF_HOLD_MS` 3000; `VFR_STORE_HOLD_MS` 3000; `IDENT_MS` 18 000                                                                          |
| aera 500 timings          | `POWER_OFF_HOLD_MS` 2000 (assumed; the guide gives none); `ACQUIRE_MS` 30 000 (as `gpsmap496`, assumed)                                        |
| FLARM timings and limits  | `BRIEF_PUSH_MS` 800; `LONG_PUSH_MS` 5000 (assumed bound around the manual's "about 2 s"); `SELF_TEST_STEP_MS` 100 (assumed); `ACQUIRE_MS` 30 000 from power arriving (assumed, equal to the GPS so N6's checks are met together); `LOW_SUPPLY_V` 8 |
| Placeholder states        | ATR833 118.000 / 119.000; TRT800H 2000 / 2000, VFR 7000; aera 500 start-up page, range 5 nm                                                   |

## Decisions (agent, overrulable)

- **D1 Harness before devices.** The mirror-fit check moves from a per-package CTSL lookup to the installs (W1b), because four new devices have no slot until W3 and W3 reshapes the slots the three old ones are checked against. The check still runs on every real install, and W2 needs no CTSL edit.
- **D2 One swap PR with its own issue.** Installs, slots, art, procedures, seeds, stand-ins and e2e must change together for the CTSL to validate and walk at every commit; per-device swaps would serialise four rubric passes and four perf runs on the same files. The swap closes `#678` and #633.
- **D3 No panel-kit change for round faces.** Both units have a square bezel with corner screws and a round face, which the existing frame plus a round face drawn by the device's own Display reproduces; a device-local `MirrorSize` sets the 1:1 aspect. This keeps the four device PRs disjoint from panel-kit. Cost: the frame prints `COM`/`ATC` across the top-left corner, not vertically as on the unit; the dock frame stays rectangular, since the dock is a touch surface. The frame also paints four corner screws where D-MPGO's units have knobs (ATR833 both right corners, TRT800H lower right; identification); the Display's knob discs sit over them, or W3's rubric pass accepts it.
- **D4 Slots sized for legibility, not scale.** At the panel floor a slot shows 0.468 px per unit and the bezel label is 24 px, so a slot must be at least about 98% of its mirror's natural width; true-scale 57 mm units (about 150 units) cannot pass. Slot size equals mirror natural size; precedent intake §3.2a.
- **D5 Taps for procedures, holds inside the device.** Procedure and e2e presses are clicks. A power-on press acts at any length (the 0.5 s on the radios only debounces); switching off, storing, saving and the FLARM mode swap need their holds, measured from `dtMs`, and are never procedure steps.
- **D6 Printed labels, decided once.** Face lettering verbatim, glyphs included (`▼▲`, `▲▼`, `►`; their accessible names are the manual's function names). A knob without lettering prints one word for what it sets plus `−`/`+` and declares knob legends: the ATR833's lower-right knob `FREQ`, the TRT800H's knob `CODE` (facts (c) precedent `STBY MHz +`; one word, because the cursor decides which part changes). An unlettered physical key prints the manual's name: the aera's `POWER`. Touch icons print the guide's icon name; pictograms are not drawn.
- **D7 The aera's touchscreen is one spring-back rotary `touch`.** The device-keys test renders the initial state and requires every control to have a key; contextual icons as separate controls would fail it on every page but one. One control with a position per icon keeps Guided rings (`data-position`), cues (legends) and `pressDevice` working.
- **D8 The aera starts with cradle power; the GPS step becomes "databases accepted".** The guide says external power switches it on, so pressing POWER in N6 would open the backlight overlay instead. Acceptance opens Home, so N6 then opens the Map (assumed, q38), which keeps the line-up seed's `page: 'map'` true for a whole flight. Track-up map as spec §4.9 describes (the unit's default is north up; D-MPGO's setting is §9 q38).
- **D9 ATR833 behaviour.** AUTO ON assumed on, so no new COM step and parity with today (q35); spacing fixed at 8.33 kHz; cursor on MHz at power-on, fields wrap without carry; any frequency change, a swap included, ends dual watch.
- **D10 TRT800H behaviour.** Mode S cradle present (STBY, ACS, A-S); MODE stays a key, as on the unit, and its seeds become device state; `reporting` is derived; the second VFR press follows the §2.9 reading.
- **D11 FLARM.** Power from the avionics bus with no breaker (option B: no breaker legend on the aircraft, the "avionics off before engine start" placard covers it, no art or procedure change), q33. No traffic, its own GPS timer (no precedent for reading another install's state), and one N6 check (q34).
- **D12 FLARM left of the GPS.** The photos show it above; the field cannot hold the FLARM, the GPS and the radio row stacked at legible sizes. Keeps the §3.2a compromise.
- **D13 Old three unregistered, not deleted.** Owner decision 5; the app drops their dependencies, and `UNREGISTERED` keeps the registry test honest.
- **D14 Changelog.** W2 PRs use `No changelog:` (registered, not installed); W3 carries the user-visible entry.
- **D15 No ui-verifier in W2.** Nothing new renders in the app until W3 installs the units; W3's pass covers all four, and W3 may fix a device's presentation in its package.

## Open risks

- **Legibility against realism.** The round units are drawn at about 1.8 times scale and the FLARM at about twice; the panel reads crowded. Mitigation: D4, the M12 rubric in W3, and intake §3.2a states the sizes.
- **FLARM mirror space.** 320 x 160 px may not hold every face word at 24 px beside the ring; the PR names any word kept to the dock Screen. A larger mirror needs a larger W3 slot.
- **aera mirror space.** Four data fields and a map at `--text-2xl` in 400 x 250 px is tight; the PR names any field kept to the dock Screen.
- **ATR833 generation.** LST, 20 named slots and the knob layout come from the II manual; the original OLED may lack some (q36). Names, REPLAY and setup are already out.
- **Holds in the browser.** The session advances on its timer while a key is held; a long touch on a tablet may open the context menu. W3's ui-verifier checks a 3 s I/O hold and a 2 s Mode hold at 1024x768.
- **Guided on contextual icons.** `pressDevice` falls back to the first `touch` key when the wanted icon is not shown, so a procedure may only target an icon on the page it expects (`accept` on the start-up page). W3's e2e proves it.
- **Seeds against power-up edges.** A seed without `powered: true` restarts the aera's start-up page or the FLARM self-test on the first step.
- **Lost app coverage for the old three.** `device-keys`, the printed-label "device keys" test and `unit-names` iterate the registry; once unregistered, only the packages' own tests and the `tools/` per-package tests cover them.
- **Registry hot files.** aera500 and atr833 insert next to each other in imports and `package.json`, and the lockfile always conflicts; the protocol above applies.
- **Copyright.** The aera guide forbids reproduction; the FLARM sources are third-party. Paraphrase only, no icons or figures copied (pre-flight (c)).
- **#661 scope.** About 6 px labels at 1024 px may need art changes in the CTSL package or an ADR 0002 exemption for tablet captions; W4 states which.

## Review focus

1. Every device fact traces to intake §3.8.n; every assumption is in the README and, if open, a §9 question.
2. Control ids, kinds and state field names match this plan exactly (W3's stand-ins, seeds and checks depend on them).
3. No logo, wordmark or manufacturer lettering; no status colour on the panel.
4. W2: shared rows at their pre-assigned places; Screen natural at most 456 x 303; Display text at 2xl or larger.
5. W3: slot sizes equal the mirrors; `walk-procedure`, floors, layout and perf green; the rubric pass is on the final head.
