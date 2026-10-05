# M1 Design (v0.2.0)

## What shipped

- M1 implementation plan (#76).
- `docs/design/BRAND.md`: the product brand, its tokens and rules (#79, closes #7).
- `docs/design/brief.md`: every screen and state, with what the design canvas covers (#80, closes #8).
- `docs/design/handoff/`: export of the five drawn artboards (#81, closes #9).
- `apps/web/src/styles/tokens.css` for light and dark, a lint ban on colour, type and spacing literals in `apps/web/src` (ESLint and Stylelint), and self-hosted Geist and Geist Mono fonts (#83, closes #10).
- Dependabot exemption from the changelog fragment rule, documented (#78, closes #75) and recorded in `CLAUDE.md` (#82).
- The 19 carried M0 minor findings resolved or triaged, including CI cancellation, Dependabot grouping and the styled UAT badge (#85, closes #71).
- Whole-milestone review fixes: the literal ban also covers the `font` shorthand, `font-weight` and CSS system colours; doc and test fixes (#87, closes #86).

## Decisions made

- The owner chose to run M1 on the current design canvas as final.
- #9's done-when was narrowed, with owner approval: the drawn artboards are exported and the undrawn screens are specified in the brief. #77 (M3) draws them later. The spec's decisions table is unchanged.
- Where canvas and spec conflict, the spec governs behaviour and the canvas governs appearance.
- Status inks used as text sit only on `--color-bg` or `--color-surface` (BRAND rule); the canvas token values are unchanged.
- Dependabot PRs are exempt from changelog fragments and `Closes`, because they have no issue.
- The literal ban covers `apps/web/src` only, because panel colours are aircraft content.
- Fonts come from `@fontsource/geist` and `@fontsource/geist-mono` (OFL, licence shipped in `dist/licenses/`), so no font CDN is contacted.
- Docs-only PRs #76 and #82 carry no fragment, following the #53 precedent.
- #71's 19 findings: 9 fixed, 1 resolved, 1 moved to #19, 7 accepted, 1 owner action (open question 5).
- The `font` shorthand allows only `inherit`, because no token can fill it; `font-weight` takes only weight tokens, `inherit` or `normal` (#87).

## Open questions for the owner

1. Confirm the `BRAND.md` token values against the DocGerdSoft brand bundle (needs the owner's design login).
2. Phase control: the spec puts it in the header; the canvas shows it only in the outside-view strip.
3. Practice: the canvas shows an immediate deviation banner; the spec says summary at the end, and the brief follows the spec.
4. The Explore selected-control accent outline on the panel, as a second accent exception under spec section 6.2.
5. Owner action from #71 (finding 16): run `/plugin` once in a fresh Claude Code session to confirm the project's plugin list loads.

## How to verify

- UAT: https://docgerd.github.io/cockpit-procedure-trainer/uat/ shows Geist text on the token background colours and the styled UAT badge. Prod: https://docgerd.github.io/cockpit-procedure-trainer/ updates when this release PR is merged.
- A real-browser pass of `develop` passed for production and UAT builds, at tablet and desktop width, light and `data-theme="dark"`: Geist loaded from the built assets with no external requests, the background follows the theme tokens, the badge appears only on UAT and is styled from the warning token.
- Local gate: `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`
- `docs/design/` holds `BRAND.md`, `brief.md` and `handoff/`.
- After the owner merges this release PR: `gh api repos/DocGerd/cockpit-procedure-trainer/releases/tags/v0.2.0 --jq .tag_name` prints `v0.2.0`.

## Carried findings

The whole-milestone review found no critical issues. Its important findings (the `font` shorthand passed the type rule, and no browser pass was recorded for #10 and #71) were fixed in #87 and by the browser pass above, together with four cheap minors. Carried minors:

- TS and TSX type and spacing literals (for example `style={{ padding: 12 }}`) are not linted; only colour literals are. Guard before M3 adds inline styles.
- `brief.md` counts popovers as chrome; `BRAND.md` and spec section 6.2 do not list them.
- `tokens.css` sets no `color-scheme`, so native controls stay light in the dark theme; fits the M3 app shell (#19).
- The canvas uses spacing values off the token scale; M3 snaps them to `--space-*`.
- The #71 disposition comment renders finding 17's NUL escape wrongly; cosmetic, on GitHub only.
- `index.html` has no favicon link, so a first load can log one 404.
