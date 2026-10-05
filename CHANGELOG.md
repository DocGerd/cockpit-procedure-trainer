# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
semantic versioning below 1.0: milestone Mn is released as v0.(n+1).0.

## [Unreleased]

Pending changes live in `changelog.d/` and are folded in at each release.

## [0.1.0] - 2026-10-05

### Added

- Baseline documentation and public repository: licence, README, contributing guide and project `CLAUDE.md`.
- pnpm workspace with strict TypeScript, Prettier and ESLint package-boundary rules proven by a test.
- Continuous integration (lint, format, typecheck, test and build on every pull request) and automated dependency updates.
- Issue forms for features, bugs, new aircraft and new devices, and a pull request template.
- ADR-0001 on the architecture and aircraft contract, and the content policy.
- Committed Claude Code configuration: plugins, a formatting hook, a UI verifier agent and a milestone release skill.
- Gitflow with a develop branch, a UAT site under /uat/, and tags and releases created from CHANGELOG.md.
- Release-cycle command and skills for review and merging into develop, and a hook that blocks merges into main.

### Changed

- Align deploy and release workflow action versions with CI, and ignore TypeScript 6.1 and above and `@types/node` majors above the supported Node major in Dependabot.

### Fixed

- Release-cycle skills and the main-merge guard: commands the guard denied, a clearer deny reason, a narrower expansion rule, and exemptions for release and backmerge PRs.

[Unreleased]: https://github.com/DocGerd/cockpit-procedure-trainer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DocGerd/cockpit-procedure-trainer/releases/tag/v0.1.0
