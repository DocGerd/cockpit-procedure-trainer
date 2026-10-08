# M12 Photorealistic panel (v0.13.0)

Milestone M12 is released as v0.(12+1).0, so this is v0.13.0. On GitHub it is milestone 13. It redraws the panel as hardware: painted panel metal with seams, screws and instrument seats; gauges with machined bezels, glass glare and needle shadows; switches, breakers, knobs and levers per position; generic panel-kit widgets from the same materials; and avionics units in anodised bezels behind glass. All art is self-drawn vector (ADR 0002 G1); no photographs, scans or manufacturer artwork.

This release stacks on v0.12.0 (#422): the owner merges #422 first. The spike and plan (#398), the glass layer, materials and perf harness (#401) and the demo backgrounds (#402) already shipped in v0.12.0, marked "Photorealistic panel (M12, in progress)", and are listed here only for completeness.

## What shipped

Visible in the app:

- **CTSL view backgrounds as painted panel metal** (#403, for #393): panel, centre field and console with fine stipple, raised plates and seams, screws, bays with depth and shadowed instrument seats.
- **CTSL controls as photoreal hardware** (#417, for #392): breakers, push-pulls, rockers, fuel valves, levers, flap selector, ignition and rescue handle, one image per position, no SVG filters.
- **CTSL gauges** (#423, for #391): eight instruments with machined bezels, one shared needle with a stage-drawn shadow, a shared glass with glare above the needle, and the compass with its own face, card and glass.
- **Generic panel widgets as real hardware** (#419, for #390): every panel-kit control and indicator drawn from token gradients, engraved-aluminium placards; `--panel-bezel`, `--panel-bezel-dark` and `--panel-dial` aligned to the plan's palette.
- **Device frames as anodised bezels behind glass** (#416, for #394), in the panel mirrors and in the dock: faceplates, glass glare, moulded keycaps, cast shadow; CSS only, tokens only, floors and hit regions unchanged.
- **Whole-panel verification and fix wave** (#426, for #396): the docked COM and radio volume thumb now stands out against its track, and the demo's aluminium placards sit a shade darker on the dark panel.

For contributors:

- **Perf harness corrected** (#413, for #409): each paint is counted once, P2 judges the view switch and the resize is printed as information.
- **New checks:** artwork controls meet the 44 px target (`legibility.ts`), indicator faces meet the lettering minimum from 1920x1080 up (`lettering.spec.ts`), every panel-kit widget paints only from `--panel-*` tokens (`paint-check.ts`), and device volume thumbs keep 3:1 against their track (`tools/device-css.test.ts`).
- **Licence rows:** the verification audit added the missing rows for the outside-view propeller images (#358); every aircraft and device image now has one.
- **Plan** (`docs/superpowers/plans/2026-10-07-m12-photorealistic-panel.md`): the scoring process, the interim perf rule under load and the milestone's readings of ADR 0002 are recorded there.

Results (figures in the PR bodies, chiefly #426):

- **Rubric:** every element on both aircraft meets the plan's bar (every applicable heading at least 2, mean at least 2.5) on 1920x1080 crops at device scale factor 2 and at 3840x2160. The cross-element heading 10 (one light, one palette across widgets, backgrounds and frames) scores 2 on every view, never higher.
- **Performance:** the absolute budget (P1 needle frame within 4 ms, P2 view switch within 33 ms, P3 at most one filter per view background, P4 payload within 3x the baseline) holds on every view in a near-idle run after the fix wave.
- **Spec §1 audit** (#426): each success criterion has evidence; gaps are #425 (no e2e operates every control through its positions), #360 (fidelity spike), #415 (the spec still calls the dock optional) and #125 (install on a real tablet).

## Decisions made

Agent decisions you may overrule:

1. **Technique** (#398): generic widgets draw gradients in TSX whose stops are `--panel-*` tokens, one `<defs>` per widget, no `<filter>`. A shared SVG kit file was rejected (Chromium does not resolve paint servers across documents, and its colours would bypass the token rule).
2. **One scorer.** Implementer self-scores ran consistently above independent scores, so one calibrated ui-verifier scored every M12 art PR and #426; the tables in the PR bodies are its scores, not the implementers'.
3. **Heading 10 in two passes:** per crop on the element's own parts in each PR, across elements only on the whole panel (#426).
4. **P2 under load** (orchestrator): with the machine saturated by parallel agents, the same base measured far apart, so art PRs passed P2 on an alternating base/PR comparison or a fixed margin under the budget; P1, P3 and P4 stayed absolute, and the absolute budget was checked once in #426. The rule is in the plan.
5. **Real-face wording beats the 10.5 px floor for secondary captions** (#423): numerals and units are held to the floor; identity captions printed small on the real instrument carry `data-lettering="secondary"` and are skipped by the face check. Tablet sizes are #420.
6. **Stage needle shadow on all gauges and glass on all eight** (#423): a baked halo on the small gauges scored too faint and was dropped; the glass costs per image layer, tracked in #421 as an optimisation.
7. **No page-level defs sharing** (#419): each widget carries its own `<defs>`, which grows the gallery's DOM; its test has a longer timeout.
8. **Filters:** none in panel-kit TSX or any control or gauge image; at most one `feTurbulence` per view background.
9. **Small calls:** RADIO legend in plain ink, no engraving (#402); plates raised, not recessed; ELT and lamps stay generic (#417); the dock bezel keeps its width because device floors are exact (#416); the `--panel-bezel` change darkens device CSS too (#419).
10. **Fix wave scope** (#426): the issue first said verification only; parts from different tasks meet only on the whole panel, so it scored `develop` and ran one fix wave. The volume fail was settled by measuring rendered pixels: only the thumb changed.

## Open questions for the owner

1. **Is this what "photorealistic" means?** The bar is every heading at least 2 ("convincing: at a glance it reads as the real material") and a mean of at least 2.5; heading 10 never went above 2. Judge by eye from the screenshots under How to verify. If not, name the heading to raise.
2. **ADR 0002 readings:** hardware-recognisable realism (shape, position, state, lettering) is rank 2, finish beyond that is rank 6 and yields to performance; real-face wording beats the 10.5 px floor for secondary captions. The release review raised one edge: on the oil-temperature and CHT faces the OIL and CHT captions are the only text that tells the two apart, yet they are marked secondary. Keep, or hold identity captions to the floor?
3. **Perf rule:** the absolute budget is now verified. Keep the interim under-load rule for future art PRs on a busy machine, or require the absolute run on every art PR?
4. **Accepted at the bar, not above it:** #421 glass-layer cost (within budget; pay for an optimisation?), #420 CTSL gauge lettering below the floor at tablet sizes (unscheduled), and the VSI and compass needle shadows at 2 (the compass card shadow is not visible).
5. **CLAUDE.md edits from M11** proposed in #422's summary ("own view" and "adding a device") are still pending your approval.

Follow-ups, without milestone unless noted: #407 Remove unused raw.d.ts from the device packages; #411 Demo at 1920x950 sits on the strip-fold threshold; #412 Viewport matrix never exercises the folded outside-view strip; #414 Tablet checklist overlay: footer below the fold with long procedures at 1024x768; #415 Spec and guide drift: the cockpit dock cell is required, not optional; #420 CTSL indicator-face lettering below 10.5 px at tablet sizes; #421 ArtworkStage: glass overlay cost per `<img>` (layer per glass); #424 Contract test: every aircraft and device image has a licence row (G1); #425 E2E: operate every control of each aircraft through its positions (spec §1).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when 4399 is busy).
- Perf: `pnpm test:perf` on a quiet machine; it prints P1 to P4 per view and fails on a budget.
- Viewport matrix: `layout.spec.ts` (the priority viewports per aircraft), with `lettering.spec.ts`, `placards.spec.ts` and `floors.spec.ts`.
- Screenshots: `m12-<aircraft>-<viewport>[-dark][-docked].png` (final state, both aircraft at 1920x1080 light and dark, 3840x2160 and every tab at 1024x768) and the earlier `develop-e4f16d9-*.png` crops, in `/tmp/claude-1000/-home-pkuhn-gaproctrainer/ed6433f4-5a16-484c-8fdd-fabc147ddcef/scratchpad/`; not committed.
- In the built app at 1920x1080 and 3840x2160, both aircraft, Free explore: every view in one viewport; dock the COM (CTSL) or radio (demo), turn on the battery and avionics, and drag VOL. Repeat at 1024x768 through the tabs. Light and dark chrome leave the panel unchanged.
- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ and, after this release PR is merged, prod https://docgerd.github.io/cockpit-procedure-trainer/.
- After the owner merges: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.13.0 --jq .tag_name` prints `v0.13.0`, and the prod footer reads `Version v0.13.0`.

### When you merge the release PR

Merge #422 (v0.12.0) first and let its Deploy finish, then this one. Wait until the Deploy run's `prod-environment` job of each push to `main` has finished before the backmerge PR (`main` into `develop`) lands, because the develop push it causes would cancel it.
