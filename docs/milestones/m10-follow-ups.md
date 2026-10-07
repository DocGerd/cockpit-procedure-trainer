# M10 Follow-ups (v0.11.0)

Milestone M10 is released as v0.(10+1).0, so this is v0.11.0. On GitHub it is milestone 11. It took the follow-ups the v0.10.0 release review filed, plus three fixes and one feature you asked for during the milestone: the checklist returns after Free explore, any checklist can be read in every mode, and the outside view shows whether the engine runs.

## What shipped

Visible in the app:

- **Read any checklist in every mode** (#359, for #343). The checklist pane now exists in every mode and has a "Show checklist" ("Checkliste anzeigen") selector at its top, with Normal and Emergency groups and the running one marked. The chosen checklist is shown view-only: no arrow, hints, ticks, deviations or completion. In Free explore it is a static reference and operating controls ticks nothing. In Guided and Practice viewing another checklist leaves the running one untouched, and a "Back to running checklist" ("Zurück zur laufenden Checkliste") button returns to it. Spec §5 (Modes table, Free explore row) changed with your approval.
- **The checklist comes back after Free explore** (#344, for #342). The trainer remembers the last started procedure; switching from Free explore to Guided or Practice restarts it fresh in that mode. With nothing remembered, the switch goes to the picker with that mode preselected.
- **Propeller disc while the engine runs** (#358, for #350). With the engine running the first-person outside view shows a static propeller-disc outline; with the engine off every phase shows the stopped blade. No animation.
- **Header chips open the full text at every width** (#336, for #325). The aircraft and procedure chips always open the full-text dialog with its "Change aircraft" / "Change procedure" button, as you decided on #325. Back to the picker is now two taps everywhere, 1920x1080 included.
- **Gauge captions fit between the arc ends** (#338, for #321). A round gauge's caption is fitted to the room between the ends of the coloured arcs and sits below the end ticks, clear of the "0" and "100" ticks and numerals.

For contributors and the test suite:

- **Boundary rules cover `.mts`/`.cts`** (#334, for #319) in every package kind, in `apps/web/src` and in the test-file blocks; `tools/boundary.test.ts` has reject cases per kind.
- **Device stylesheet test can no longer pass vacuously** (#335, for #328). The slider check is generated from the device screens that render `type="range"`, and a stylesheet that declares a colour must yield at least one checked declaration.
- **Browser tests drive pinch zoom and the PWA update prompt** (#337, for #326), so the CSP fixture now sees both flows.
- **E2E files cannot import packages by relative path** (#345, for #327). An ESLint rule covers all of `apps/web/e2e`; `tools/e2e-imports.test.ts` proves it fires. The round gauge SVG exposes `data-sweep-end` so `lettering.spec.ts` reads the sweep from the rendered dial.
- **ADR-0002 ranks accessibility lowest** (#357, for #356), your decision this milestone.
- **Design brief**: the garbled sentence about screens not drawn now reads correctly (#333, for #329).
- Also in this release, outside the milestone: the M9 cycle learnings in `CLAUDE.md` (#332).
- From the release review: nothing needed fixing before release. Its verdict was "ship with follow-ups"; the three follow-ups it filed are listed under Open questions. It corrected one folded changelog bullet (#342: the procedure is forgotten at the picker and on an aircraft change, not only when none was ever started).

## Decisions made

The spec's decisions table is unchanged. Spec prose changed in §5 (Modes, #359, owner-approved) and §4.6 (contract, #358).

### Your decisions this milestone

- **Header chips always open the disclosure** (#325): no truncation detection, no layout-only fix, one extra tap accepted. Where the dialog is placed (anchored to the header edge, not under its chip) was left as is and is #341 in M11.
- **Checklist in every mode, read-only in Free explore** (#343), including the spec §5 change.
- **Accessibility ranks lowest in ADR-0002** (#356). Printed labels, 44 px touch targets and lettering minimums stay under Training UX. The 3D renderer spec's Training UX wording was changed to match.
- **Show the engine state in the outside view** (#350) and **bring the checklist back after Free explore** (#342), both from your reports this milestone.

### Agent decisions you may overrule

- **Last procedure and when it is forgotten** (#344). It is forgotten on back-to-picker and on an aircraft change, so Free explore after a deliberate trip to the picker does not restart a stale procedure. Only a switch out of Free explore restarts; Guided to Practice keeps the running procedure, and after a phase jump ended a procedure nothing restarts.
- **Viewed checklist is a separate selection** (#359). It defaults to the running procedure, else the last one, else the aircraft's first. It is cleared on a procedure start, an aircraft change, back-to-picker and any switch through Free explore; Guided to Practice keeps it. In Guided the running procedure's deviation banner stays visible while another list is viewed. After a phase jump or reset ends a procedure, the pane stays as a read-only reference instead of disappearing. The tablet drawer now stays as you left it across a mode switch.
- **Selector at the top of the pane, a native `<select>`** (#359), so on a tablet it is the first focusable element when the drawer opens. No extra keyboard or screen-reader work, per the accessibility ranking; 44 px targets are tested.
- **Trade-off named (ADR-0002) for #359**: in Free explore on desktop the cockpit now shares its row with the checklist pane, so it falls back to view tabs earlier. At 1680x1050 Free explore now shows view tabs; 1920x1080 is unaffected.
- **Engine state from `systems.engine.running`, not RPM** (#358): the CTSL windmills with RPM above zero and the engine stopped in flight; windmilling shows the blade.
- **Contract extension, not an app-side guess** (#358): two optional fields, `PhaseDefinition.imageRunning` and `AircraftDefinition.engineRunning` (a condition), `CONTRACT_VERSION` unchanged like earlier additive keys. The validator enforces both directions: a running image needs `engineRunning`, and an aircraft with `engineRunning` needs a running image for every phase.
- **Image variants, not an overlay** (#358): the disc must sit behind the cowl, whose height changes with pitch per phase, so each phase has a `-running` twin SVG (18 added). Sacrificed quality (ADR-0002): size; the precache grows by about 230 KB raw. The blade is now drawn in every phase of both aircraft, where before only the CTSL parking image had one. `tools/propeller-art.test.ts` checks the blade and disc markers across all aircraft.
- **Gauge caption dropped when it does not fit** (#338). A caption shows only if it fits between the arc ends at the 11 px text floor; otherwise only the caption is dropped, and numerals and units keep their own room (they still drop on their own rules, numerals first). An earlier fix wave that dropped numerals too was rejected as a regression. Caption room shrinks from about 66 to about 55 viewBox units at every size; no shipped panel reaches the threshold except the demo's "Oil pressure" at 768x1024, which loses its caption (the OIL PRESS annunciator is next to it).
- **Boundary fix widened beyond the issue** (#334): `apps/web/src` and the `*.test.*` blocks had the same `.mts`/`.cts` gap and got the same fix.
- **Update-prompt test edits the built `dist/sw.js`** (#337) and restores it after each test, because Playwright's routing does not see the worker's update fetch. Pinch zoom is driven through real CDP touch events.
- **`data-sweep-end` on the gauge SVG** (#345) rather than repeating the sweep constant in the spec.

## Open questions for the owner

1. **Chip disclosure placement** (#341, in M11): the dialog opens at the header edge, not under its chip. It is planned for M11; say if it should wait for the re-layout or go first.
2. **Gaps in the e2e relative-import rule** (#361, from #345): a dynamic `import('../packages/...')`, unnormalised paths such as `../e2e/../../../packages/...` and `.mts`/`.cts` e2e files are not flagged. Accept, or extend the rule?
3. **Finished procedure hidden while viewing another checklist** (#363): in Guided or Practice, if the running procedure completes while another checklist is viewed, its summary stays hidden until "Back to running checklist" is pressed. Show the summary at once, or keep it?
4. **Spec drift** (#362): the one-viewport spec's decisions 4 and 7 still call accessibility rank 2, spec §8 does not list the `imageRunning`/`engineRunning` pairing rule, and §5's "last procedure that ran" does not say it is forgotten at the picker. A docs fix; it changes no decision.
5. **Propeller disc contrast** (#358): the disc outline is thin at 768x1024 and slightly weak on the CTSL background. Accept, or draw it heavier?
6. **Carried over**: CTSL gauge lettering at the panel floor (#297) is still open without a milestone; M11's 950 px panel floor may change it. A leftover remote branch `docs/m9-claude-md-learnings` (from #332) can be deleted.
7. **M11 Cockpit re-layout** is planned from spike #339 (dock layout A, 950 px panel floor, empty dock with Guided opening the target device, a demo radio section): #346 to #349, #351 to #353, #355 and #341. The keyboard route (#354) moved to the backlog after the accessibility decision, and fully operable in-slot devices on large viewports (#340) is in the backlog too. Confirm the scope before work starts.

Follow-ups filed by the release review, without milestone: #361, #362 and #363 (Open questions 2 to 4).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.
- Browser tests: `pnpm exec playwright install chromium` once, then `pnpm test:e2e` (new: `mode-switch.spec.ts`, `view-checklist.spec.ts`, `zoom.spec.ts`, the propeller spec and the update prompt in `offline.spec.ts`). CI runs them in the required `check` job.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- In a browser at 1920x1080:
  1. Start a CTSL procedure in Geführt, switch to Freies Erkunden and back: the checklist returns, restarted from its first item.
  2. In Freies Erkunden pick any checklist under "Checkliste anzeigen" in the pane: it is read-only and operating controls ticks nothing.
  3. In Geführt pick another checklist: the running one keeps its progress, and "Zurück zur laufenden Checkliste" returns to it.
  4. Start the engine: the outside view shows the propeller disc; with the engine off, the stopped blade.
  5. Click the aircraft or procedure chip in the header: a dialog shows the full text with a "Change aircraft" / "Change procedure" button.
  6. Demo aircraft at 768x1024: no gauge caption touches an arc end, tick or numeral.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.11.0 --jq .tag_name` prints `v0.11.0`, and the prod footer reads `Version v0.11.0`.

### When you merge the release PR

Wait until the Deploy run's `prod-environment` job of the push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it. If it was cancelled, re-run it.
