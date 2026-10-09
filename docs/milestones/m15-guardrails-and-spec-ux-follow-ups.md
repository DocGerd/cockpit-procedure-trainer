# M15 Guardrails and spec/UX follow-ups (v0.16.0)

Milestone M15 is released as v0.(15+1).0, so this is v0.16.0; on GitHub it is milestone 16. The goal: clear the follow-ups of the M14 release review and older review leftovers (trainer behaviour, spec drift, lint and contract-test gaps), and close the remaining routes by which an agent could read the local-only `reference/` directory. No aircraft content changed.

## What shipped

For pilots:

- **Key-out refusal explained** (#560): taking the CT Supralight ignition key out from anywhere but OFF now shows a notice that it comes out only from OFF and rings the key, instead of doing nothing.
- **Hide upcoming items stays with the flight** (#561): ticking it in the Full flight drill, or in the checklist pane during a flight, no longer changes the Practice setting that later single runs use.
- **Run summary comes forward** (#363): when the running checklist completes while the pilot reads another one, the view returns to the run summary instead of leaving it behind the selector.

For contributors and agents:

- **Bash reference guard** (#578): `.claude/hooks/bash-reference-guard.sh` refuses Bash commands that read, copy or recursively search `reference/` in any worktree; `CPT_ALLOW_REFERENCE=1` overrides. With the file-tool guard and the main-checkout guard (#577) all three are accident tripwires.
- **Image licence contract test** (#424): `tools/image-licence.test.ts` holds every image under `packages/*/src` to a row in its package's `LICENSES.md`, and refuses SVGs that embed a raster.
- **E2E import lint** (#361): relative imports into `packages/` are caught however the path is written, dynamic `import()` is covered, and `.mts`/`.cts` e2e files are linted.
- **Unused `raw.d.ts` removed** (#407) from the five device packages.
- **Specs aligned with the code** (#562, #415, #362): the surprise-failure text names the shipped wording; the cockpit `dock` cell is required (one-viewport spec, aircraft guide, main spec §4.3); the validator section lists the running-image and dock codes; Back to picker and an aircraft change forget the last procedure.

Agent tooling that landed after v0.15.0, before the milestone's issues: project skills `add-device` and `changelog-fragment` and the `intake-checker` agent (#576), the reference and main-checkout guard hooks (#577, #580), backlog triage in `/release-cycle` (#582), and CLAUDE.md upkeep (#571, #575).

## Decisions made

Agent decisions you may overrule (reasons in the PRs):

1. **The flight carries its own recall** (#561, PR #587): while a flight runs, `trainer.recall` resolves to the flight's option, so no restore step can be missed when a flight is dropped (Back to picker, aircraft change, Free explore). The drill checkbox starts from the current Practice setting; `startFlight()` without the option means off.
2. **An interlock holder wins over the source restriction** (#560, PR #588) when both refuse a move, so existing interlock notices and rings are unchanged. Printed position names come from one shared helper, `apps/web/src/panel/position-name.ts`; the German notice reads "{control}: {to} nur von {from} aus erreichbar."
3. **Switch back to the summary rather than add a notice** (#363, PR #591): the summary carries the next-step actions. The switch fires only on the completing transition, so a pilot who opens another checklist afterwards is not pulled back; Free explore is excluded. It lives in the trainer session subscription, not in the pane, so it also works with the tablet drawer closed.
4. **`raw.d.ts` kept in `aircraft-ctsl` and `aircraft-demo`** (#407, PR #585): their tests import `?raw`, and typecheck fails without it.
5. **Dynamic `import('@playwright/test')` is forbidden in specs** (#361, PR #586), as it would bypass the `./fixtures` rule. The shared `dynamicSource` lint helper now also matches template literals without substitutions, which tightens the package boundary rules too.
6. **`apps/web/public` icons are not in the licence test** (#424, PR #589): their provenance is recorded nowhere in the repo, so none was invented (open question 1).
7. **The Bash reference guard is a sibling hook** (#578, PR #592), not an extension of `reference-guard.sh`. Like that one it fails open with a notice when jq, git or GNU realpath is missing. `find` counts as reading only with `-exec`, `-ok` or `-fprint`; recursive tools are refused only where a `reference/` exists and is not excluded. Known limits (globs, command substitution, most variables, scripts run from a file) are listed in the hook header.
8. **Docs fixed, not code** (#415, #362): the dock stays required; the spec's decisions table is untouched.

## Open questions for the owner

1. **Licence of the app icons** (#590): `apps/web/public` holds `favicon.svg` and four PNG icons with no licence row. Are they the project's own marks under the repository licence? Then an `apps/web/LICENSES.md` and one more root in the licence test follow.
2. **Device names** (#185) stays open: devices have no name field, the no-screen notice uses the raw device id, and deviation texts do not name the device. The "device groups" the issue mentions were not found. Rescope it, or close it?
3. **Still waiting on you from earlier milestones:** D-MPGO checks #536 (large knob), #537 (ignition legends), #538 (console lever order), #570 (throttle detent marks); #297 gauge lettering below the minimum (blocks #420); #569 a photorealism art pass for the console; #125 a check on a real tablet.

Closed in the backlog triage: #179 (done) and #354 (won't do, ADR 0002).

## How to verify

- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test:coverage && pnpm build`; browser tests `pnpm test:e2e` (`E2E_PORT=<port>` when the default port is busy).
- Each PR had a separate reviewer; #587, #588 and #591 also passed a real-browser check at 1920x1080 and 1024x768.
- UAT (develop): https://docgerd.github.io/cockpit-procedure-trainer/uat/; prod after the merge: https://docgerd.github.io/cockpit-procedure-trainer/.

A short walk-through at 1920x1080, CT Supralight, English:

1. **Key out.** In Free explore from Parking, open the fuel valve, put the key in and turn it to BOTH, then try to take it out: the header says the key comes out only from OFF and the key is ringed.
2. **Hide upcoming.** Drills: Full flight in Practice with Hide upcoming items ticked; go back to the picker and run a single Practice checklist: the box is unticked and the next item shows.
3. **Summary.** In Practice run Engine start; before the last item, open Before take-off from the selector, then tick Engine start's last item on the panel: the view returns to Engine start's summary.

When you merge the release PR: wait until the Deploy run's `prod-environment` job of the push to `main` has finished before any push to `develop`. Then the next session confirms tag `v0.16.0` and the Release (`gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.16.0 --jq .tag_name`), closes milestone 16, and opens a backmerge only if `main` holds a hotfix.
