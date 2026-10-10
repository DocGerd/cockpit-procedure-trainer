# M16 App chrome redesign (v0.17.0)

Milestone M16 is released as v0.(16+1).0, so this is v0.17.0; on GitHub it is milestone 17. The goal: redesign the app frame around the cockpit panel ("flight-deck paperwork") following the design canvas: the picker, the trainer header, the checklist pane, the footer, dialogs and notices, plus a faster first paint. The cockpit panel itself is unchanged, apart from the CTSL trim wheel fix.

## What shipped

For pilots:

- **Chrome foundation** (#609, PR #615): new tokens (strong accent, two shadows, motion durations, content width, measure) in `BRAND.md` and `tokens.css`; hover and press states for buttons; shared primitives (kicker, readout, switch, leader, datum, thin scrollbar, scroll fade); `shell.css` split into frame, header, picker and footer stylesheets.
- **Picker as a QRH index** (#610, PR #622): aircraft and drills on the left; the procedure index with dot leaders, sticky group headers and Normal/Emergency thumb tabs on the right, with Mode and Start under it; the training-aid note under the title; "Explore the cockpit" is now "Free explore".
- **Trainer header** (#611, PR #624): a breadcrumb (aircraft / procedure) that never cuts a name on desktop; one Mode control with Guided, Practice and Free explore; settings behind a hairline with an icon theme button; the browser tab names procedure and aircraft; a close button in the tablet drawer.
- **Title returns home** (#599, PR #624): "Procedure Trainer" in the trainer header goes back to the picker, through a confirm when a session is at risk.
- **Checklist pane** (#612, PR #623): the current item marked by a side rule with one primary button (Done, Checked or Verified) and Show me beside it; a deviation as a sheet over the list foot instead of reserved space; checks show challenge, leader, RESPONSE; the summary lists figures as readouts.
- **Footer, About, dialogs and notices** (#613, PR #621): the footer version opens About (training-aid note, handbook revisions, licence, build, links); confirm dialogs are native modal dialogs with a red discarding action; update prompt, session failure and error screen share one left-rule notice style.
- **Changelog in the app** (#598, PR #621): About shows the latest three releases from `CHANGELOG.md`, built in at build time, with a link to all release notes.
- **Faster first paint** (#614, PR #619): the trainer screen is a lazy, prefetched chunk; only Latin and Latin-ext fonts ship, none inlined.
- **Theme cross-fade** (#617, PR #626): switching theme with the toggle cross-fades the whole app frame; a dark load and reduced motion skip it.
- **CTSL trim wheel in steps** (#620, PR #625): nose down, half nose down, neutral, half nose up, nose up.
- **Whole-milestone visual pass fixes** (#634, PR #636): a dark load no longer starts light; secondary buttons are ink on a neutral fill; the checklist flow block keeps the pane inset under a plain heading; picker rows keep one title line; the tablet header keeps one line of names; the control details popover scales on 4K.

Filed along the way, without milestone: #616 (split aircraft metadata from art so the landing skips the panel art, from PR #619), #618 (flaky `view-checklist` tablet-drawer summary e2e, seen on develop), #627 (spike: VOR/GPS navigation training).

**Before you merge:** another session is working on the CTSL panel from the D-MPGO photos (M17, #629, worktree `629`). Nothing from M17 may land on `develop` before this release PR is merged.

## Decisions made

Agent decisions you may overrule (reasons in the PRs):

1. **Hover never outranks a pressed or selected state** (PR #615): hover selectors use `:where()` so they tie on specificity, are gated on `(hover: hover)` and skip disabled buttons.
2. **Theme fade moved out of WP1 into #617** (PR #615): a fade on `body` alone dropped inherited text to near 1:1 contrast mid-fade.
3. **Shadows derived, not copied** (PR #615): the brand bundle stylesheet was not fetched; `BRAND.md` marks the rows "derived".
4. **`use()` on a cached import promise, not `React.lazy`** (PR #619): `React.lazy` always committed one fallback frame, so Start would not be instant even when prefetched.
5. **A failed trainer load reloads the page on Reset** (PR #619): a cached failed module fetch or a replaced chunk after a deploy only recovers on a fresh page.
6. **Trainer stylesheets stay in the entry CSS** (PR #619): splitting them flipped the cascade; a build test forbids a trainer CSS chunk.
7. **Fonts subset by a Vite transform** (PR #619), not per-subset imports, which lose `unicode-range` and change metrics. The >500 kB chunk warning stays; the real fix is #616.
8. **Mode and Start under the index on the right, rows grow to a cap** (PR #622): as the plan says; uncapped stretch was rejected twice.
9. **Tablet header stays one row** (PR #624, then PR #636): the brand name stays hidden at tablet; since #636 tablet crumbs are single-line with an ellipsis (the aircraft crumb gives way first) and the full name stays in the title. Desktop never truncates.
10. **Theme icon shows the current state**, its accessible name the target (PR #624), as the plan asks.
11. **Deviation sheet may move the card only to keep it uncovered** (PR #623): hiding the action button would be worse than a small move.
12. **Item verbs: Done, Checked, Verified** (PR #623): "Confirm" read like a dialog button, "Check off" like an instruction; Verified keeps its distinct meaning.
13. **Checklist selector label visually hidden** (PR #623): the visible label squeezed the select; the accessible name is unchanged.
14. **Challenge, leader, RESPONSE only on check items** (PR #636): action and guard items have no separate response in the procedure data; splitting them is a content change outside app chrome. Accepted deviation from the canvas.
15. **Footer Version button stays below 44 px** (PR #621): the footer height is pinned for the one-viewport cockpit and a larger hit area would steal presses from controls above it; ADR-0002 ranks geometry higher. Named as the sacrificed quality.
16. **Destructive confirm by default** (PR #621): every current confirm discards progress; a `tone="neutral"` option exists for later.
17. **About is a lazy chunk with the latest three releases** (PR #621); a failed load closes About quietly. Release notes stay English, labelled "(auf Englisch)" in German.
18. **Fade the colour tokens, not each element** (PR #626): per-element transitions made inherited text lag; registered `@property` colour tokens move in step. Shadows and native controls switch at the start of the fade (accepted).
19. **Trim wheel: five evenly spaced stops, assumed** (PR #625): the intake gives no step count; the half stops are the trainer's own, recorded as assumed (unverified), with an unworded tick per stop.
20. **The 1024 picker list scrolls internally** (PR #636): a row cut at its edge is the scroll cue.

## Open questions for the owner

The whole-milestone review handed nine blocker/major findings to PR #636. Its minor findings are recorded locally; the ones #636 already fixed (accent-outlined secondary buttons, the second kicker in the flow block) and those settled above (Version button target, English changelog, leaders on action rows, cut row at 1024) are not repeated here. Filed as follow-ups without milestone: #639 (trim wheel: a tap at an end stop can step back), #640 (missing full stop after "Training aid only"), #641 (dead `.shell-eyebrow` CSS).

1. **Dead bands.** Practice with Hide upcoming leaves a large empty pane under the active row, and its footer is about twice Guided's (switch above Restart; the DE label wraps). At 1366x1024 the panel is top-aligned with a band under the dock; the empty dock box is a pre-existing band. Accept, or plan a follow-up (one-row footer, an "items hidden" hint, vertical centring)?
2. **Picker rows.** Drill rows and the Demo aircraft row are tall for their content, and in DE the CTSL count wraps under the name, so row heights differ by language. Tighten?
3. **Header detail vs canvas.** No 1 px dividers around the breadcrumb and Mode group; the phase label reads "Start in phase" where the canvas says "Phase"; at 1366 the header runs edge to edge while picker content is centred, so the logo and the h1 do not share an edge. Accept, or align with the canvas?
4. **Hide-upcoming switch** off-state track is dark grey in the light theme; the canvas uses the neutral fill. Change to the neutral token?
5. **Picker group links** (Normal/Emergency) scroll the list but show no selected state, and the rotated text is harder to read at tablet. Add an active marker?
6. **Checklist pane footer** says "No deviations" where the canvas shows a mono "Δ 0", and the last item sits under the scroll fade at 4K. Keep the words?
7. **Theme cross-fade** passes through low text contrast around its midpoint, as text and background move in opposite directions. Acceptable for a short fade?
8. **About at 4K** keeps a small body text size. Scale it in the 4K block?
9. **To confirm on UAT:** the pass (before #636) saw a bare dot leader on Practice rows whose text is hidden; the current tree draws the leader only on revealed checks, so it may be gone.
10. **Still waiting from earlier milestones:** #536, #537, #538, #570 (now in M17), #590 icon licences, #185 device names.

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy). Known flake: #618.
- Each PR had a separate reviewer and, for visual work, a blind ui-verifier pass at 1920, 3840 and 1024.
- Whole-milestone review: one reviewer over the diff since v0.16.0 with a real-browser pass at 1920x1080, 3840x2160 and 1024x768, light and dark, EN and DE. Its blocker and major findings were fixed in PR #636; minor findings are listed above.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the merge: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through at 1920x1080, then 3840x2160 and 1024x768, in light and dark, EN and DE (set language and theme explicitly; they persist):

1. **Picker.** The procedure index fills its column with leaders and Normal/Emergency tabs; Mode and Start sit under it; the training-aid note sits under the title.
2. **Header.** Start a Demo procedure: the breadcrumb shows aircraft / procedure, the Mode control has three segments, and the browser tab names the procedure. Click "Procedure Trainer" to go home.
3. **Checklist.** In Guided, the current item has a side rule and Done; skip an item to see the deviation sheet over the list foot.
4. **Theme.** Toggle the theme: the frame cross-fades; reload in dark: no fade.
5. **About.** Click the footer version: About shows handbook revisions and the latest three releases (this one on top after the merge).
6. **Trim.** CTSL in Free explore: the trim wheel steps through five positions.
7. **Tablet.** At 1024x768 the header stays one row and the checklist drawer has a close button.

When you merge the release PR: wait until the Deploy run's `prod-environment` job of the push to `main` has finished before any push to `develop`. Then the next session confirms tag `v0.17.0` and the Release (`gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.17.0 --jq .tag_name`), closes milestone 17, and opens a backmerge only if `main` holds a hotfix.
