# v0.11.1: OpenSSF Best Practices groundwork

There is no milestone for this work: it is a PATCH release covering issues
#367, #368, #369, #370 and #375, so the milestone-specific steps (milestone
review, closing the milestone) were skipped. The release exists so the first
release with a keyless-Sigstore-attested asset is published, which the OpenSSF
`signed_releases` criterion needs.

## What shipped

- CodeQL code scanning workflow.
- A statement-coverage threshold enforced in CI.
- Governance and security documentation set.
- Release workflow builds the production bundle as a `.tar.gz` asset and
  attests it with GitHub artifact attestations (keyless Sigstore);
  `docs/verifying-a-release.md` explains verification.
- OpenSSF Best Practices answer sheet: `docs/openssf-best-practices-badge.md`.

## Decisions made

- Coverage threshold is 95% statements.
- Keyless attestation of the release asset instead of signed tags.
- DCO sign-off declined.
- Repository homepage set to the GitHub Pages URL.
- Private vulnerability reporting and Dependabot security updates enabled.

## Open questions for the owner

- `access_continuity`: is the fork-continuity argument (anyone can fork and
  continue the project) acceptable as the answer, given a single maintainer?
- `version_tags_signed` stays unmet, because tags are not signed; attestation
  covers the release asset only.

## How to verify

After merging this release PR:

1. The `Release` workflow builds and attests the asset; confirm tag `v0.11.1`
   and the GitHub Release exist with the `.tar.gz` asset.
2. Run the commands in `docs/verifying-a-release.md` against `v0.11.1`.
3. Fill the bestpractices.dev form from `docs/openssf-best-practices-badge.md`.
