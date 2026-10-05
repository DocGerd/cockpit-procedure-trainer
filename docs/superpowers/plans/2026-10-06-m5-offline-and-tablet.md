# M5 Offline and Tablet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The trainer installs as a PWA, loads and runs a procedure without a network after one visit, and asks before switching to a new version. On a tablet every control is operable by touch, including small ones and press-and-hold, and the panel pinch-zooms and pans without moving the page. Every control works from the keyboard and exposes its name and position to assistive technology, and every animation respects reduced motion. M3, M4 and M5 ship together as v0.6.0.

**Architecture:** The service worker and manifest come from `vite-plugin-pwa` (Workbox) configured in `apps/web/vite.config.ts`; the update prompt is a chrome component in `apps/web/src/pwa/`. Zoom and pan live in the panel renderer (`apps/web/src/panel/`), wrapping the placements, M3 #26's `PanelOverlay` and M3 #45's `DeviceLayer`, so everything on the panel scales together. Touch and keyboard behaviour of the widgets lives in panel-kit; the web app adds focus order, view tabs and the Explore details.

**Tech Stack:** as M3, plus `vite-plugin-pwa` (dev, `apps/web`; peer range includes Vite 8) and `@playwright/test` (dev, root, for M4 #32), both added by Task 3. No gesture or accessibility-testing library (Decisions 5, 7).

**Spec:** `docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md`, sections 1 (Success criteria: installs on a tablet, works offline), 2 (Hosting, Devices), 5 (Modes, Screen), 6.2, 9, 10 (Hosting) and 12 (service worker scope). M3 plan: `docs/superpowers/plans/2026-10-06-m3-web-shell.md`. M4 plan: `docs/superpowers/plans/2026-10-06-m4-demo-aircraft.md` (combined wave table).

**Issues:** #34 PWA, #35 touch polish, #36 accessibility, #124 (Task 3: add the M4/M5 dependencies), and #125 (Task 5: owner verification on a real tablet, no milestone).

## Pre-flight checks

**(a) Does `vite-plugin-pwa` support this stack?** Yes. Its current major declares `vite` up to `^8.0.0` as a peer. Task 3 installs it and proves `pnpm build` emits `sw.js` and `manifest.webmanifest`. If that fails, Task 4 falls back to an in-repo Vite plugin that writes the precache list from the bundle and a hand-written worker (no dependency); the fallback is recorded in the PR.

**(b) Spec §12: one origin, two environments.** Production builds with base `/cockpit-procedure-trainer/`, UAT with `/cockpit-procedure-trainer/uat/` (`deploy.yml`), both on the same origin. A worker registered at the production base also matches `/uat/` URLs, and its navigation fallback would answer a first UAT visit with the production page. Decision 2 settles scope and cache names. This is the open question §12 hands to this plan; it changes no row of the decisions table.

**(c) Which files are free, and when?** From the M3 wave table: `pnpm-lock.yaml` and every `package.json` are #19's in wave 1 only; `apps/web/src/App.tsx` is #28's in wave 2 and free after; `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/public/**` and `apps/web/src/styles/base.css` (after wave 1) have no later M3 owner; `packages/panel-kit/src/controls/**` is #21's (wave 2); `apps/web/src/panel/**` is #20's (wave 4); `modes/**`, `devices/**`, `device-registry.ts` and `panel-kit/src/device-screen/**` are wave 5's. So #35 can start alongside wave 5, #36 and #34 after it.

**(d) Lockfile.** After M3 wave 5 three tasks need dependencies: M4 Task 4 (device packages into `apps/web`), M4 #32 (Playwright) and #34 (PWA plugin). Each would be its own wave. Task 3 adds the two external dependencies in lane 3, when no other task holds the lockfile, which saves one wave.

**(e) Can an agent verify "on a real tablet"?** No. Agents emulate touch and viewports in Chromium; a real device, a real pinch and a real home-screen install need the owner. Task 5 carries that check.

## Global Constraints

- Everything in the M3 plan's Global Constraints applies, and the cross-milestone wave invariant and the "M3 tests never hard-code demo content" rule of the M4 plan.
- **UI-rendering PRs** (#34, #35, #36) get a `ui-verifier` pass at tablet and desktop width, light and dark, with touch emulation for #35 and keyboard-only operation for #36.
- The update prompt is chrome: brand tokens, never on the panel. Zoom controls are chrome too (a reset button outside the panel image).
- Page zoom stays enabled; only the panel area sets `touch-action: none`. The viewport meta is not changed to block zoom.
- Every interaction is reachable by mouse, touch and keyboard; none depends on hover.
- Manifest and theme colours come from `tokens.css` read at build time, never a literal in `vite.config.ts` (Decision 3).
- Fragments: #34, #35, #36: `added`; #124: `No changelog: dependencies for later tasks, no user-visible effect`; Task 5: no PR.

## Vocabulary

- **update prompt**: the chrome notice shown when a new service worker is waiting; reload happens only when the pilot accepts.
- **hit slop**: an invisible extension of a control's interactive area to at least `--size-target`, independent of its drawn size.
- **panel zoom**: the scale and offset applied to the panel's content box, not to the page.

## Execution Model

| Task                                 | Worker       | Reviewer                                                       |
| ------------------------------------ | ------------ | -------------------------------------------------------------- |
| 1 Touch polish (#35)                 | sonnet, high | sonnet, high                                                   |
| 2 Accessibility (#36)                | sonnet, high | opus, xhigh (touches every widget and the panel's input path)  |
| 3 M4/M5 dependencies (new chore)     | haiku, low   | sonnet, high                                                   |
| 4 PWA (#34)                          | sonnet, high | opus, xhigh (a wrong worker scope breaks production and UAT)   |
| 5 Real-tablet verification (owner)   | owner        | —                                                              |
| 6 Release v0.6.0 (M3 + M4 + M5)      | sonnet, high | opus, xhigh (whole-milestone review of three milestones)       |

## Dependency Graph

```
Task 3 (lane 3) → #34, M4 #32
M3 #20 (wave 4) → #35
#35 + M3 wave 5 → #36
M3 complete + Task 3 → #34
#34 + #36 + M4 Task 4 → M4 #32
everything → Task 6 (release PR opened) → #125 (owner, on UAT) → owner merges the release PR
```

## Waves

The combined M3/M4/M5 table is in the M4 plan. M5's entries:

| Wave / lane       | M5 issue | Files (beyond each issue's fragment)                                                                                                                                                         |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lane 3 (M3 wave 3) | #124     | `package.json` (`@playwright/test` dev), `apps/web/package.json` (`vite-plugin-pwa` dev), `pnpm-lock.yaml`                                                                                   |
| lane 5 (M3 wave 5) | #35      | `packages/panel-kit/src/controls/**`, `apps/web/src/panel/**`, `apps/web/src/styles/base.css`                                                                                                |
| 6                 | #34      | `apps/web/vite.config.ts`, `apps/web/src/pwa/**`, `apps/web/src/App.tsx`, `apps/web/public/**`, `apps/web/index.html`                                                                        |
| 6                 | #36      | `packages/panel-kit/src/{controls,indicators,artwork,device-screen}/**`, `apps/web/src/{panel,modes,devices}/**`                                                                              |
| 6                 | (M4 #123)  | `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/device-registry.ts`, `packages/aircraft-demo/**`                                                                               |
| 7                 | (M4 #32) | browser tests, including the offline reload                                                                                                                                                  |
| after release PR  | #125     | none (owner, on UAT)                                                                                                                                                                         |
| then              | Task 6   | `CHANGELOG.md`, `changelog.d/**`, `docs/milestones/m3-web-shell.md`, `docs/milestones/m4-demo-aircraft.md`, `docs/milestones/m5-offline-and-tablet.md`                                       |

Lane 5 check: wave 5's M3 files are `modes/**`, `devices/**`, `device-registry.ts` and `panel-kit/src/device-screen/**`; #35's are disjoint. #26 and #45 render inside `PanelArea`, so they land inside #35's zoom wrapper without editing `panel/`.

---

### Task 1: Touch polish (Closes #35) — lane 5

**Files:** `packages/panel-kit/src/controls/**`, `apps/web/src/panel/**`, `apps/web/src/styles/base.css`, `changelog.d/35.added.md`

**Dependencies:** M3 #21 (widgets), #20 (panel renderer).

**Interfaces (produced):** `PanelArea` gains a zoom container: `usePanelZoom()` → `{ scale, offset, reset }`; scale is bounded (a named constant pair), pan is clamped so the panel never leaves the viewport. Widgets get hit slop to `--size-target`.

- [ ] **Step 1: Failing tests** (jsdom, synthesized pointer events): two pointers moving apart on the panel raise the scale, together lower it, within bounds; one-pointer drag on an empty panel area pans when zoomed and does nothing at scale 1; a second pointer landing while a momentary control is pressed cancels that press (`onRelease`) before zooming; a press-and-hold that drifts within the control's hit slop keeps holding (pointer capture), and only lifting or cancelling releases; the panel area has `touch-action: none` and no other element does; the panel suppresses the context menu, text selection and touch callout; the reset button restores scale 1; at a scale other than 1, an Explore tap still selects the control under the finger and opens its details (M3 #26), and the Guided outline (`PanelOverlay`) and the device screens (`DeviceLayer`) stay aligned with their placement rects; a one-pointer drag that starts on a control operates that control and does not pan; every control's hit area is at least `--size-target` even when its placement rect is smaller.
- [ ] **Step 2: Implement** with pointer events, no gesture library (Decision 5).
- [ ] **Step 3: Fragment:** `Touch polish: larger hit areas, reliable press-and-hold, pinch zoom and pan on the panel.`

**Definition of done:** #35's first two bullets have tests; `ui-verifier` with touch emulation at tablet size operates the smallest demo control, holds the starter, and zooms and pans the panel without the page moving. The third bullet ("verified on a real tablet") moves to #125 (Task 5, Decision 8). PR with `Closes #35`, reviewed, in `develop`.

---

### Task 2: Accessibility (Closes #36) — wave 6

**Files:** `packages/panel-kit/src/{controls,indicators,artwork,device-screen}/**`, `apps/web/src/{panel,modes,devices}/**`, `changelog.d/36.added.md`

**Dependencies:** #35, M3 wave 5 (#26 modes, #45 devices).

**Keyboard and ARIA model (Decision 6):**

| Control                                    | Role and value                                                   | Keys                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| toggle, breaker, rotary (fixed positions)  | `slider` with `aria-valuetext` = localized position label        | Arrow keys step one position, Home/End go to the first and last                                              |
| rotary detent that springs back            | as above                                                         | stepping onto the detent presses it; releasing the key releases it                                           |
| lever, continuous                          | `slider`, `aria-valuemin` 0, `aria-valuemax` 1                   | Arrow keys step a named fraction; Home/End set exactly `0` and `1` (M3 Decision 9)                           |
| lever, notched                             | `slider` over the notches                                        | Arrow keys step one notch                                                                                    |
| momentary                                  | `button`                                                         | Space or Enter down presses, up releases                                                                     |
| guarded                                    | a guard `button` (expanded state), then the handle's own role    | Enter opens or closes the guard                                                                              |
| indicator                                  | `img` (or `meter` for gauges) with a label "name: value units"   | not focusable                                                                                                |

Accessible names are the localized control or indicator names (resolved strings, M3 Decision 5). Focus order follows the view's placement order; view tabs are a WAI-ARIA tablist; Guided's view switch moves focus to the current target only on a view change; Explore with operate off opens the details on Enter and returns focus on close. Device screens already use native buttons (M4 Decision 5); `DeviceLayer` gives each device a labelled group.

- [ ] **Step 1: Failing tests** (Testing Library `user-event` keyboard, `getByRole` with name): every row of the table; Tab reaches every control of each demo view in order; Home/End on a continuous lever set exactly `0` and `1`; holding Space on the starter presses and releasing releases; Explore details open and close by keyboard; every role has a name and value text in both languages; a focus indicator is visible (outline from tokens, not removed); under `prefers-reduced-motion: reduce` widgets, artwork needles, the Guided pulse and the zoom transition have no animation or transition.
- [ ] **Step 2: Implement** until green. No accessibility-testing library (Decision 7).
- [ ] **Step 3: Fragment:** `Keyboard operation of every control, names and positions for assistive technology, and reduced motion throughout.`

**Definition of done:** #36's three bullets have tests; `ui-verifier` completes a demo procedure with the keyboard only in Guided, in both themes, and checks reduced motion. PR with `Closes #36`, reviewed, in `develop`.

---

### Task 3: Add the Playwright and PWA plugin dependencies (Closes #124) — lane 3

**Files:** `package.json` (`@playwright/test` in `devDependencies`), `apps/web/package.json` (`vite-plugin-pwa` in `devDependencies`), `pnpm-lock.yaml`. No code, no config.

**Dependencies:** M3 wave 1 (#19 owns every manifest and the lockfile there). Not alongside M4 #46 (lane 2), which also writes the lockfile.

- [ ] **Step 1:** `pnpm add` both; `pnpm install --frozen-lockfile` and the full gate pass; `pnpm build` output is unchanged (the plugin is not used yet).
- [ ] **Step 2:** PR body: `No changelog: dependencies for later tasks, no user-visible effect`, and the peer range check of pre-flight (a).

**Definition of done:** gate green; PR with `Closes #124`, reviewed, in `develop`.

---

### Task 4: PWA (Closes #34) — wave 6

**Files:** `apps/web/vite.config.ts`, `apps/web/src/pwa/**` (create: update prompt, registration hook wrapper, `messages.ts`, type reference for the plugin's virtual module), `apps/web/src/App.tsx` (mount the prompt), `apps/web/public/**` (PNG icons), `apps/web/index.html` (theme-color and apple-touch-icon links), `changelog.d/34.added.md`

**Dependencies:** Task 3, M3 complete (a procedure must run offline).

**Interfaces (produced):** `UpdatePrompt` (chrome, bilingual through `defineMessages`): shown when a new worker is waiting; "Reload" activates it and reloads; "Later" hides it until the next start. Never reloads on its own.

- [ ] **Step 1: Failing tests:** with the plugin's register hook mocked, `needRefresh` shows the prompt, Reload calls the update with reload, Later hides it, nothing reloads without a click; a build-output test (runs `vite build` into a temp dir for each of the production and UAT bases, or inspects the resolved plugin config) asserts: the worker's scope and `start_url` equal the base; the precache list contains the HTML, scripts, styles, the bundled font files and every aircraft and phase image; the production build's navigation fallback denylists `^<base>uat/`; the two builds use different cache ids; the manifest's `theme_color` and `background_color` equal the values in `tokens.css`.
- [ ] **Step 2: Implement:** `registerType: 'prompt'`, no `skipWaiting` without consent, `scope` and `base` from `BASE_PATH`, `cacheId` from `VITE_DEPLOY_ENV`, worker disabled in `vite dev` (gallery and HMR unaffected), manifest name and short name in English (one manifest per build), icons 192, 512 and maskable 512 plus a 180 apple-touch icon, rendered once from `public/favicon.svg` and committed (the render command goes in the PR body, not into the repo).
- [ ] **Step 3: Fragment:** `The trainer installs as an app, works offline after one visit, and asks before switching to a new version.`

**Definition of done:** #34's two bullets: the update behaviour has tests; the `ui-verifier` serves the production build with `vite preview`, waits for the worker to control the page, switches the browser context offline, reloads, and completes a demo procedure; it repeats the load under the UAT base and confirms the UAT page is not served by the production worker. M4 #32 then automates the offline reload. PR with `Closes #34`, reviewed, in `develop`.

---

### Task 5: Verification on a real tablet (#125, owner only, no milestone) — after the release PR is open

#125 carries #35's third bullet and spec success criterion 4. No PR, no agent work.

**Checks for the owner, on the UAT site (wave 7 in `develop`):** smallest controls operable by finger; starter held without the page scrolling or a callout; pinch zoom and pan on the panel only; install to the home screen; airplane mode, start from the home screen, run a procedure; deploy a newer `develop` and see the update prompt.

**Definition of done:** the owner closes #125. It has no milestone, so it does not block `milestone-release` or the release cut; it gates only the owner's merge of the release PR.

---

### Task 6: Release v0.6.0 (M3 + M4 + M5)

Run the `milestone-release` skill once every issue of M3, M4 and M5 is closed, as one cut: whole-milestone review across the three milestones, fragment fold into one `## v0.6.0` section on `release/v0.6.0`, one summary per milestone (`docs/milestones/m3-web-shell.md`, `m4-demo-aircraft.md`, `m5-offline-and-tablet.md`), release PR `develop` to `main`. The owner reviews and merges it. This supersedes the M3 plan's Task 18 (release v0.4.0); the owner confirmed the single v0.6.0 release.

**Blocked by:** nothing outside M3–M5. The owner's merge of the release PR waits for #125; the release PR lists #125's checks under how to verify.

The summary carries what shipped, the Decisions of the three plans and those made in PRs, the open questions, and how to verify: the local gate, `pnpm test:e2e`, `pnpm dev` and the gallery, the UAT site including install and offline.

**Definition of done:** release PR open against `main`; nothing merged into `main` by an agent.

---

## Decisions

1. **`vite-plugin-pwa` (Workbox) builds the worker and manifest.** Reason: a precache manifest of hashed assets and a safe prompt-based update flow are what it does; an in-repo worker would reimplement both. Fallback in pre-flight (a).
2. **Spec §12: each environment registers a worker scoped to its own base path, with its own cache id.** Production: scope `/cockpit-procedure-trainer/`, navigation fallback denylisting `/cockpit-procedure-trainer/uat/`, cache id from `VITE_DEPLOY_ENV` (`prod`); UAT: scope `/cockpit-procedure-trainer/uat/`, cache id `uat`. The browser picks the registration with the longest matching scope, so the UAT worker controls `/uat/` once installed, and the denylist keeps the production worker from answering a first UAT visit. Workbox's precache names also include the scope, so caches never mix.
3. **Manifest colours are read from `tokens.css` at build time** by `vite.config.ts` (parse the named custom property), so the token file stays the only place a colour is written.
4. **Updates are prompt-only.** A waiting worker never takes over while the pilot is in a procedure; "Later" defers to the next start. Reason: #34's "never silently mixing versions".
5. **Pinch zoom and pan with pointer events, no gesture library**, applied to the panel's content box only, page zoom left enabled. Reason: no new dependency; the panel already routes all input through pointer events (M3 #21); keeping page zoom serves accessibility.
6. **Keyboard model:** positioned controls are ARIA sliders with position names as value text, momentary controls are buttons held by Space or Enter, guards are a separate button. Reason: one consistent pattern for every multi-position control; Home/End give exact lever stops for M3 Decision 9.
7. **No axe or similar library;** roles, names and values are asserted with Testing Library queries, and the browser tests select by role. Reason: no dependency, and the queries fail exactly where assistive technology would.
8. **"Verified on a real tablet" moves from #35 to the owner-only #125 (Task 5, no milestone)**, together with the install-and-offline success criterion. Reason: no agent has a tablet; keeping it in #35 would leave a merged PR's issue open with nothing an agent can do.
9. **Dependencies are added early in one chore PR (Task 3)** so wave 6 holds three tasks instead of two waves.

## Open questions for the owner

1. **NEEDS OWNER: real-tablet verification (#125).** Touch, pinch zoom, install and offline on a real device, on the UAT site. Gates the owner's merge of the release PR, not the release cut.
2. One release v0.6.0 for M3, M4 and M5, confirmed by the owner. The Versioning row ("Mn releases as v0.(n+1).0") still holds for M5; v0.4.0 and v0.5.0 are never cut, and production goes from v0.3.0 to v0.6.0.
3. Production gets its first service worker with v0.6.0. A pilot who visited production before keeps the old page until the first load after the release, which installs the worker; from then on updates prompt.
