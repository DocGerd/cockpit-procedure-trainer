# Changelog fragments

Every pull request adds one file here: `<issue>.<category>.md`, for example
`50.added.md`. A pull request without an issue uses `+<slug>.<category>.md`.
Dependabot pull requests are exempt.
A pull request with no user-visible effect (internal docs, plans, agent config, CI-only, tests-only) may skip the fragment if its description has a line `No changelog: <reason>`. A spec or plan change that alters product behaviour still needs one.

Categories: `added`, `changed`, `deprecated`, `removed`, `fixed`, `security`.

The file holds one line that describes the change for a user or contributor.
At release time the fragments are folded into `CHANGELOG.md` under the
matching `### Category` heading and deleted; this file stays.
