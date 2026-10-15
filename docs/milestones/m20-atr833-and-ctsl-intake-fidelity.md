# M20 ATR833 and CTSL intake fidelity (v0.21.0)

Milestone M20 is released as v0.(20+1).0, so this is v0.21.0; on GitHub it is milestone 21. The goal: settle the open ATR833 and TRT800H assumptions in the CT Supralight intake, make the trainer follow the rulings, and finish the CT Supralight breaker block. Alongside, the outside-view strip, which used to vanish on a short browser window, now only folds.

Only the CT Supralight changes in its radio and breaker block; the outside-view fold applies to both aircraft.

## What shipped

For pilots:

- **The outside view is never hidden** (PR #784 for #763, #411 and #412). On a short browser window the strip above the panel folds to a thin band cropped towards the horizon, and the cockpit still reaches its combined layout where it did before. The fold order is whole, folded, tabs. In tabs the strip stays whole. 1920x1080 and 4K are unchanged. PR #791 anchors the folded crop so that horizon and canopy arc show for both aircraft.
- **ATR833 follows the settled rules** (PR #786 for #765, #766 and #767). Opening the MEM or LST list no longer overwrites standby: only a VOL/SEL pick of a non-empty entry loads it. Line 3 prints numeric values with two digits, a negative dual-watch value as `DWM -02`. Dual watch ends when VOL/SEL lowers the squelch below 02. A MEM-hold store writes only the shown memory entry. The spoken readout pads like the display.
- **CT Supralight breaker block** (PR #787 for #768 and #773). The inert cap under the Nav column prints a two-line "Cockpit" / "Light" legend as on D-MPGO, and the "Circuit Breakers" header is as wide as on D-MPGO, on one condensed line.

For maintainers:

- **Intake rulings** (PR #783 for #770 and #771): the TRT800H manual was matched against the intake (flight-level rounding, out-of-range flight level); the ATR833A items stay assumed. Intake questions 64 and 65 carry the results.
- **Intake sweep** (PR #788 for #764): statements left stale by the altimeter, airspeed, voltmeter and M20 edits are aligned with the intake and the code.
- **Test hardening** (PR #786 for #685 and #767): the ATR833 power-loss tests now set the state they claim to clear, and the CTSL COM power test is named for what it checks.
- **Whole-milestone review fixes** (PR #791 for #790): changelog wording, the caption-gap note in `CONTRIBUTING.md`, the one-viewport spec's trade-off note, the ATR833 list-display note and the folded-strip crop.

## Decisions made

From the PR descriptions (reasons in the PRs):

1. **The ATR833A-OLED manual could not be fetched** (PR #783). The manual (document 01.1411.010.71e, revision 3.00) is blocked for automated access, and the maker hosts only the ATR833A-II manual, a different variant that was not used. Every ATR833A item from #771 stays assumed, recorded in intake questions 64 and 65.
2. **The TRT800H flight level keeps rounding down** (PR #783). The matched manual says only "100 ft steps", so it neither confirms nor refutes the code: no code change. Flight levels beyond -1000 to 35 000 ft show `FLerr` (verified); the negative-level format stays assumed.
3. **Opening a list does not touch standby** (PR #783, PR #786). A pilot who only looks at a list must not lose a hand-tuned standby frequency; the pick loads the entry, and `LST 00` is set only by a non-empty memory-list pick.
4. **Negative values pad too, and dual watch ends below SQL 02** (PR #783, PR #786). `DWM -02` matches the intake's "always two digits"; ending dual watch keeps the display consistent with the rule that dual watch needs squelch 02 or more.
5. **A MEM-hold store writes only the memory entry** (PR #786), as intake section 3.8.1 and question 65 say. Standby, dual watch and `LST 00` stay unchanged.
6. **The CTSL COM power test is renamed, not replaced** (PR #786 for #767). Aircraft packages may not import devices, so the real radio's power cycle is covered in the ATR833 device tests.
7. **Fold order is whole, folded, tabs; the hidden step is gone** (PR #784), because the pilot should always see the phase outside. The cost: the CT Supralight's combined layout no longer reaches below about 930 px window height, so it uses tabs at 1920x900 (it reached combined there only by hiding the strip).
8. **A thinner minimum band and a stable fold** (PR #784). The minimum band token is `--space-8` and the folded strip is pulled by a full row gap (`--space-4`), so the CT Supralight still reaches the combined layout at the 1080p browser window without lowering any touch-target or lettering floor. Below `SHORT_VIEWPORT_HEIGHT` the strip folds to the minimum outright whenever that makes the cockpit combined (#411), so the state hangs on the window height, not on pixel slack.
9. **The folded crop is anchored at 45 percent** (PR #791). A lower percentage shows the upper part of the picture, where the horizon sits (the brief suggested the opposite direction, which shows only tarmac and nose). One anchor does not serve every picture equally: the demo's parking crop shows trees, hangars and tarmac edge, its cruise crop shows sky and the canopy arc with the horizon at the bottom edge.
10. **The Beacon Light touch box is unchanged** (PR #787 for #772, closed as not planned). The four operable bottom-row breakers share one knob line, so their boxes at the 44 px floor must tile along x, and no layout clears the inert Instrument Light cap. Recorded as a final trade-off in intake section 3.9.4 (the 44 px floor is not traded (ADR-0002, Training UX)).
11. **The Circuit Breakers header stays at the lettering minimum** (PR #787 for #773). It is condensed to one line at D-MPGO's width; an unsqueezed header would fall under the tablet lettering floor and two lines do not fit. Letters are denser and taller than D-MPGO's (intake section 3.9.7).
12. **Two secondary findings are filed, not fixed here** (PR #784, PR #791): the demo's avionics placard overflows in the tabs at 1536x760 (#785), and the CT Supralight's secondary dial captions print below the floor in the same tabs layout (#789). Both are recorded as expected-failure tests that fail once the art is fixed.

## Open questions for the owner

1. **The ATR833A-OLED manual.** Do you have revision 3.00 to put in `reference/`? An intake job could then verify questions 64 and 65: the 2 s I/O hold, VOL 1 to 16, MEM 00 to 99, the keys that leave a list and the list time-out, memory retention, power-on defaults and the unit's own negative-DWM format.
2. **Folded outside-view strip.** Is the folded band (anchored at 45 percent) readable enough, or do you want per-phase anchors or a taller minimum band? A taller band would push the CT Supralight to tabs at about 950 px window height.
3. **ATR833 list display.** While a list is open the entry's frequency is not shown until a VOL/SEL pick loads it, and `MEM 00` / `LST 00` load only by stepping away and back. Accept, or load entry 00 on open (which brings back the overwriting of standby)?
4. **Beacon Light touch box (#772).** Accept the box covering 41 percent of the inert Instrument Light cap (about a third at best)?
5. **Circuit Breakers header (#773).** Accept the condensed header with letters taller than D-MPGO's?
6. **Tabs at 1920x900.** Accept that the CT Supralight uses tabs there?
7. **Follow-up issues.** None blocks the release. The list is compiled from this milestone's issues and PRs, so an item you remember may be missing:

   - **Layouts:** #785 (demo avionics placard overflow at 1536x760), #789 (CT Supralight secondary captions below the floor at 1536x760 tabs).
   - **Filed at the end of M20:** #794 (the e2e `view-checklist` tablet-drawer spec fails in local full runs), #795 (M20 review follow-ups: the scope of the placard `test.fail`, the `layout.spec` fallback chain, the folded strip touching the panel).
   - **Carried over from M19:** #774 (the artwork contract is undocumented, stops are not validated), #775 (stale CTSL README and one-viewport spec lines), #782 (brushed-aluminium plates and the T-shaped lower console).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). One e2e test, `view-checklist.spec.ts` "the summary comes forward with the tablet drawer closed", fails in full local runs (passes alone and in CI; Refs #794).
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the release: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through on UAT:

1. **Outside view.** At 1920x1080 both aircraft show the whole strip above the panel, as before. Resize the window to 1920x950: the strip folds to a thin band showing horizon and canopy arc (Parking and Cruise) and is never hidden; the CT Supralight keeps the combined layout.
2. **ATR833 lists.** In the dock of the CT Supralight, switch the radio on with I/O. Press MEM: line 3 reads `MEM 00`, line 2 keeps the standby frequency. Store an entry (hold MEM in the list), tune standby elsewhere, open MEM and turn VOL/SEL to that entry: standby loads it. A MEM-hold store keeps standby and `LST 00`.
3. **Numbers and dual watch.** Press SET until `DWM` and turn VOL/SEL down: `DWM -01`, `DWM -02`. Press DW, SET to `SQL`, turn VOL/SEL down to 01: dual watch ends, and at SQL 01 pressing DW does nothing.
4. **Breaker block.** At 1920x1080 on the CT Supralight, the bottom-right block shows "Cockpit Light" under the Nav column's cap and a one-line "Circuit Breakers" header clear of the legends above it.
