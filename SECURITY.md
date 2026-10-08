# Security Policy

## Supported versions

The Cockpit Procedure Trainer is a client-only static web app with no backend
and no accounts. The only supported version is the latest production
deployment at <https://docgerd.github.io/cockpit-procedure-trainer/> (built
from `main`). An installed PWA offers the update on the next online visit. The
`/uat/` preview is the unreleased `develop` state and is not supported.

## Security requirements: what you can and cannot expect

The argument for why these hold (threat model, trust boundaries, secure-design
and common-weakness arguments) is the
[security assurance case](docs/security-assurance-case.md).

### What you can expect

- **No accounts and no credentials to steal.** No sign-up, login, session or
  cookie.
- **No backend to breach.** The project operates no server, API or database.
- **Your data stays on your device.** The only persisted user data are the
  settings theme, language and last aircraft, and a per-procedure run history
  (last and best deviation count and date), in the browser's `localStorage`;
  the service worker caches only the app's own assets. Nothing is uploaded.
- **No analytics, telemetry or tracking.**
- **No runtime calls to third-party origins.** The app loads only its own
  assets; a strict Content Security Policy
  ([`apps/web/src/csp.ts`](apps/web/src/csp.ts)) enforces this in the browser,
  and the end-to-end tests fail on any violation.
- **Reviewed releases.** Production is built from `main` by CI, which is
  reachable only through pull requests with a passing required check.

### What you cannot expect

- **No flight-safety authority.** This is a training aid. The aircraft's
  handbook is authoritative; do not use the app in flight.
- **No protection against a compromised device or browser.**
- **No custom response headers.** GitHub Pages cannot set them, so the CSP is
  delivered as a `<meta>` tag, which cannot carry `frame-ancestors`.
- **No third-party availability guarantees.** GitHub Pages is outside the
  project's control.

### In scope for a report

Anything that breaks an expectation above, including vulnerabilities in
bundled dependencies. A wrong checklist or aircraft behaviour is a content
defect, not a vulnerability; file it as a normal issue.

## Reporting a vulnerability

Report privately through GitHub:
**[Report a vulnerability](https://github.com/DocGerd/cockpit-procedure-trainer/security/advisories/new)**
(Security tab, "Report a vulnerability"; private vulnerability reporting is
enabled on this repository). Do not open a public issue for anything
exploitable. There is no bug-bounty program.

## Vulnerability response process

The project has a single maintainer (see [GOVERNANCE.md](GOVERNANCE.md)), so
these steps are sequential and the targets are honest, not guarantees.

1. **Acknowledge, within 7 days**, in the private advisory thread, which stays
   the channel for everything that follows. The initial response never takes
   longer than 14 days.
2. **Triage and reproduce.** The outcome (vulnerability, defect or expected
   behaviour) is stated in the thread; a report that is not a vulnerability is
   answered, not silently closed.
3. **Assess severity** with CVSS as a shared vocabulary, weighted for the
   app's exposure: with no server, impact is bounded by one user's browser
   origin.
4. **Fix** on a private fork through GitHub's advisory workflow when the issue
   is exploitable and not yet public, with a regression test where the defect
   is testable.
5. **Release.** Merged to `develop`, then shipped to `main` through the release
   pull request, which deploys to production. With no supported older
   versions, shipping the fix remediates every user.
6. **Publish an advisory** for any issue that could affect users, with
   affected and fixed versions and a workaround where one exists, and note the
   fix in [`CHANGELOG.md`](CHANGELOG.md).
7. **Credit the reporter** by name or handle in the advisory and the changelog
   entry, unless they ask to stay anonymous. Say so in the report if you
   prefer anonymity.

A report that affects an upstream dependency is forwarded upstream, and the
dependency is updated once a fix exists. Dependabot security updates are
enabled and alert on vulnerable dependencies.

## Verifying a release

Every GitHub Release after v0.11.0 carries the production bundle as an asset,
signed keylessly with Sigstore through GitHub artifact attestations;
[docs/verifying-a-release.md](docs/verifying-a-release.md) has the
verification steps and what the signature proves. v0.11.0 and earlier have no
signed asset and are verifiable only by rebuilding them from the tagged
source.

## Review and merge controls

`develop` and `main` are protected by repository rulesets: changes arrive only
through pull requests with a passing `check` job and resolved review threads.
With one maintainer, GitHub does not count self-approval, so a second human's
approving review is not required; every pull request is instead reviewed by a
separate agent before merge, and only the owner merges into `main`. CodeQL
code scanning (`.github/workflows/codeql.yml`) analyses every pull request and
push to `develop` and `main`, and runs on a schedule.
