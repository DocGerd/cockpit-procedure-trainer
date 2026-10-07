# Governance

How the Cockpit Procedure Trainer is governed: who decides, how a change is
accepted, what each role does, and what happens if the maintainer stops. It
describes the project as it is, including the uncomfortable parts.

Related documents, not repeated here:
[`CONTRIBUTING.md`](CONTRIBUTING.md) (workflow and checks),
[`SECURITY.md`](SECURITY.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md),
[`ROADMAP.md`](ROADMAP.md), [`docs/architecture.md`](docs/architecture.md).

## Governance model: single maintainer

One person holds commit rights and makes all final decisions: Patrick Kuhn
([@DocGerd](https://github.com/DocGerd)). There is no committee, vote or formal
consensus process. Decisions are recorded in the issue or pull request that
implements them; design-level decisions live in the
[design spec](docs/superpowers/specs/2026-10-05-cockpit-procedure-trainer-design.md)
and the [ADRs](docs/adr/). A change that deviates from the spec updates the
spec first.

Project invariants a proposal must not violate (ADR-0002 gates): no backend, no
accounts, no tracking or runtime calls to third-party origins, a strict CSP, and
no handbook scans or manufacturer artwork in the repository.

Dispute resolution: discuss in the issue; if unresolved the maintainer decides
and states why. The project is MIT licensed, so anyone who disagrees may fork.

## Roles and responsibilities

| Role                 | Who                                      | Authority                                                                                        |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Maintainer**       | Patrick Kuhn (@DocGerd)                  | Everything: merge, release, deploy, repository settings                                          |
| **Contributor**      | Anyone filing an issue or pull request   | Propose; no merge rights                                                                         |
| **Automated agents** | Claude Code agents run by the maintainer | Implement and review; merge reviewed pull requests into `develop` only; no independent authority |
| **Dependabot**       | GitHub bot                               | Opens dependency pull requests; no merge rights                                                  |

The maintainer triages issues, accountable for every merge (agent-authored or
not), decides when `develop` becomes a release, opens or merges the release pull
request into `main`, handles security reports
([`SECURITY.md`](SECURITY.md)), and keeps the documentation current at each
release.

The project is built largely by AI agents; the maintainer steers and reviews at
milestone boundaries. An agent review is a review aid, never presented as a
second human's approval. Agents never merge into `main`: the owner merges the
release pull request.

## How a change gets accepted

1. An issue exists (small chores may skip it).
2. Branch from `develop`, open a pull request with `Closes #<n>`.
3. The required `check` job passes and all review threads are resolved
   (enforced by the `protect-develop` and `protect-main` rulesets).
4. A separate agent reviews the pull request.
5. `develop` takes squash merges; releases go `develop` to `main` through a
   release pull request merged by the owner. Details: `CONTRIBUTING.md`.

New functionality needs tests; the `check` job runs them.

## Contribution licensing: no DCO or CLA (deliberate)

The project does not require a Developer Certificate of Origin sign-off or a
Contributor License Agreement. The OpenSSF `dco` criterion is a SHOULD, and the
reasoning is:

- **Inbound equals outbound.** The project is [MIT](LICENSE) licensed;
  contributions are made under the terms of the licence the project ships.
- **A sign-off would add nothing today.** Every human-authored commit comes
  from the maintainer, who is also the copyright holder; `git shortlog -sne`
  shows the current authors.
- **An unenforced requirement would be a false claim.** No human-authored commit carries a
  `Signed-off-by:` trailer and no check verifies one.

Reopen this decision at the first substantial outside contribution, a second
maintainer, or a downstream request for stronger provenance.

## Continuity and succession

### The bus factor is 1

One person holds every capability the project needs: repository admin, merging,
releasing and the GitHub Pages deployment. If that person became unavailable,
nobody else could merge into this repository, release from it or deploy to its
Pages origin. Anyone depending on this specific repository should factor that in.

Mitigating facts: MIT licence, a build reproducible from the repository, no
server to keep running, no database, no accounts, and no user data held
anywhere but the user's own browser. An installed copy keeps working offline
indefinitely.

### Access continuity: fork continuity

The outcome that matters is creating and closing issues, accepting changes and
releasing within a week without the current maintainer. The whole build,
release and deploy pipeline is committed in the repository, and all three
workflows (`.github/workflows/ci.yml`, `deploy.yml`, `release.yml`) run on the
automatic `GITHUB_TOKEN` alone: none uses a repository secret, and the Pages
deploy uses GitHub's OIDC flow. So anyone who forks can, without cooperation:

- use the fork's own issue tracker and pull-request flow immediately;
- run CI, and build and deploy by enabling GitHub Pages and the `github-pages`
  environment on the fork;
- cut releases by running the same workflows: a release is the changelog
  folded into `CHANGELOG.md`, and `release.yml` tags and creates the GitHub
  Release from it.

What a fork does not inherit, stated plainly:

- **The deployed origin.** Production is `docgerd.github.io/cockpit-procedure-trainer`,
  bound to this repository; a fork deploys to its own URL. Users who installed
  the original PWA keep a working offline copy but receive no updates from a
  fork until they reinstall from the new URL.
- **The OpenSSF badge entry**, which is tied to the maintainer's login.

### What a successor would need

| Capability                                  | Where it lives                                                |
| ------------------------------------------- | ------------------------------------------------------------- |
| Repository admin, rulesets                  | GitHub `DocGerd/cockpit-procedure-trainer`                    |
| GitHub Pages and `github-pages` environment | Repository settings                                           |
| OpenSSF Best Practices entry                | [Project 15281](https://www.bestpractices.dev/projects/15281) |
| Secrets                                     | None held                                                     |

No DNS to transfer (the site lives on a `github.io` sub-path) and nothing is
published to a package registry.

## Growing the project

A contributor with a sustained record of merged changes may be invited to
become a second maintainer; that would be announced in this file and would
reopen the DCO decision above and the review-approval trade-off in
`SECURITY.md`.

## Changing this document

Through a pull request like any other change, reviewed by the maintainer.
