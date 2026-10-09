---
name: changelog-fragment
description: Write the changelog fragment a PR needs, or decide it may use a "No changelog" line instead. Use when preparing any PR.
---

# Changelog fragment

`changelog.d/README.md` is the source of truth for categories, naming and wording;
`CONTRIBUTING.md` (Flow) states the rule.

- File: `changelog.d/<issue>.<category>.md`; without an issue, `changelog.d/+<slug>.<category>.md`.
- Category is one of those listed in `changelog.d/README.md`.
- Content: one line describing the change for a user or contributor.
- No user-visible effect (internal docs, CI-only, tests-only, agent config): skip
  the file and put `No changelog: <reason>` in the PR body. A spec or plan change
  that alters product behaviour still needs a fragment.
- Dependabot PRs are exempt.
- Once the release-prep PR has folded `changelog.d` into `CHANGELOG.md`, a PR
  landing before the release edits that release's section in `CHANGELOG.md`
  instead of adding a fragment.
