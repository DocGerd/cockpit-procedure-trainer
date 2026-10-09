---
name: milestone-release
description: Cut a milestone release under gitflow - whole-milestone review, changelog fold, owner summary, and the release PR develop to main. Use when every issue of a milestone is closed. Never merges the release PR.
---

# Milestone release

Arguments: the milestone title, for example `M2 Core engine`. Milestone Mn is
released as `v0.(n+1).0`, so `M2` is `v0.3.0`. The slug is the title in
lower-case kebab form, for example `m2-core-engine`.

1. Confirm the milestone has no open issues. If it has, stop and list them.
   `git fetch origin`; work from `origin/develop`.
2. Dispatch one reviewer on the most capable model over the diff since the
   previous release tag (the first commit for the first release), with the spec
   and the milestone plan. The reviewer must be an agent that can post
   comments, not a read-only type. Fix findings through PRs into `develop`,
   each reviewed with the `pr-selfreview` skill.
3. Branch `release/vX.Y.Z` from `origin/develop`:
   - Fold every `changelog.d/<issue>.<category>.md` and `+<slug>.<category>.md` fragment into
     `CHANGELOG.md` as `## [X.Y.Z] - <UTC date>` (`date -u +%Y-%m-%d`), one
     `- <text>` bullet under a `### Category` heading, in the order Added,
     Changed, Deprecated, Removed, Fixed, Security. Delete the folded
     fragments and keep `changelog.d/README.md`. Keep `## [Unreleased]`
     free of entries and keep the pointer line beneath it. Update the link references at the bottom.
   - Write `docs/milestones/<slug>.md` with four sections: What shipped,
     Decisions made (from the PR descriptions, with reasons), Open questions
     for the owner, How to verify (commands and URLs).
   - Open a PR with base `develop`, have a separate agent review it with the
     `pr-selfreview` skill, and merge it into `develop` with the `merge-train`
     skill once `check` is green and all review threads are resolved.
4. Open the release PR: `gh pr create --base main --head develop --title "Release vX.Y.Z" --body-file docs/milestones/<slug>.md`.
5. Stop. NEVER merge the release PR: no `gh pr merge`, no auto-merge, no API
   merge; the `block-main-merge.sh` tripwire denies the usual forms but is not a boundary. The owner merges it; the `Release` workflow then creates tag
   `vX.Y.Z` and the GitHub Release from the top section of `CHANGELOG.md`.
6. Give the owner the release PR URL and the open questions.
7. After the owner's merge, in this session or the next: confirm tag and
   Release exist and close the milestone. Open a PR `main` to `develop` (branch
   `chore/sync-main-to-develop`) only if `git log --max-parents=1 origin/develop..origin/main`
   prints commits: it excludes the release's own merge commit, so anything left
   is a hotfix.
