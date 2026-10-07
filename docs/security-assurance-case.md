# Security assurance case

Why the security claims in [`SECURITY.md`](../SECURITY.md) hold for the
Cockpit Procedure Trainer: claims, system, trust boundaries, threats, secure
design and common weaknesses. Companion: [`architecture.md`](architecture.md).

## 1. Claims

| #   | Claim                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | The project owns no server-side attack surface: no backend, API, database or accounts.                                               |
| C2  | No user data leaves the device. The app persists only theme, language and last aircraft, in `localStorage`.                          |
| C3  | The app loads only its own assets and makes no runtime request to a third-party origin; the browser enforces this with a strict CSP. |
| C4  | The shipped bytes correspond to the reviewed source: `main` is built by CI and served by GitHub Pages.                               |
| C5  | Third-party code is declared in a lockfile, monitored and updated.                                                                   |
| C6  | Failure is safe: a missing `localStorage` or image disables persistence or shows a placeholder, never corrupts the trainer.          |

Not claimed: flight-safety authority (training aid only, the handbook is
authoritative) and protection against a compromised device or browser.

## 2. System description

A static bundle (React, built with Vite) served from GitHub Pages and installable
as a PWA. All logic runs in the browser. Input is limited to pointer and
keyboard events on the panel; the app parses no files, URLs or network
responses supplied by a user. Aircraft data are TypeScript modules inside the
repository, validated in CI. See [`architecture.md`](architecture.md).

## 3. Trust boundaries

| #   | Boundary                        | Trust                                                      |
| --- | ------------------------------- | ---------------------------------------------------------- |
| TB1 | Browser to GitHub Pages (HTTPS) | The only network path; carries the app's own static assets |
| TB2 | Dependencies to the build       | Untrusted code enters the bundle at build time             |
| TB3 | Contributor to repository       | Changes enter only through pull requests                   |
| TB4 | Repository to deployment        | CI builds and deploys from protected branches              |
| TB5 | App to browser storage          | Own origin; readable by anyone with the browser profile    |

There is no boundary to a project server (none exists) and none for user
accounts or uploads.

## 4. Threat model

| Threat                                                     | Countered by                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 Compromised dependency                                  | Lockfile (`pnpm-lock.yaml`), Dependabot version and security updates, a CSP that blocks exfiltration to third-party origins even if injected code ran                                                                                                                |
| T2 Script injection (XSS)                                  | No user-supplied HTML is rendered, no `dangerouslySetInnerHTML`, React escaping, `script-src 'self'` with no inline script or style (the e2e specs fail on a violation), `object-src 'none'`, `base-uri 'self'`; CodeQL scans every pull request for injection sinks |
| T3 Data exfiltration or tracking                           | No analytics, no third-party origin; `connect-src 'self'` and `form-action 'none'`                                                                                                                                                                                   |
| T4 Tampering between repository and browser                | Pull-request-only protected branches, required `check` job, deploy from `main` through GitHub's OIDC Pages flow, HTTPS from GitHub Pages                                                                                                                             |
| T5 Local attacker with device access                       | Out of scope: only non-sensitive settings are stored                                                                                                                                                                                                                 |
| T6 Malicious contributor or compromised maintainer account | Required checks and review threads, a separate review agent, owner-only release pull request; a compromised owner account is an accepted risk (section 7)                                                                                                            |
| T7 Malicious or broken aircraft content                    | The validator rejects inconsistent aircraft data in CI; content is paraphrased in-repo and never fetched at runtime                                                                                                                                                  |

Out of model: attacks on GitHub, browsers or the user's operating system.

## 5. Secure design argument

- **No server, no accounts.** The largest classes of web vulnerabilities
  (backend injection, authentication and session flaws, access control) do not
  apply because those components do not exist (C1).
- **Least privilege.** The CSP grants `'self'` only; workflows declare minimal
  `permissions` and use only the automatic `GITHUB_TOKEN`, with no repository
  secrets.
- **Fail-safe defaults.** Storage reads and writes are guarded and the app works
  without them; an error boundary shows a readable message and a reset.
- **Economy of mechanism.** The only fetch in the app reads its own SVG
  artwork from the same origin (`apps/web/src/panel/image-size.ts`); nothing
  parses user- or third-party-supplied input; minimal persistence.
- **Defense in depth.** Even if a dependency were compromised, the CSP limits
  where it could send data; ESLint package boundaries limit what each package
  can import.
- **Build integrity.** Dependency installs from the lockfile, CI-built
  artifacts, protected branches, CodeQL static analysis
  (`.github/workflows/codeql.yml`) on every pull request and on a schedule.

## 6. Common implementation weaknesses

| Weakness (OWASP / CWE)                 | Status                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Injection, XSS (CWE-79, CWE-89)        | No SQL or backend; no HTML injection sinks; strict CSP; CodeQL scanning                 |
| Broken authentication / access control | Not applicable: no accounts                                                             |
| Sensitive data exposure (CWE-200)      | No sensitive data collected or stored; HTTPS only                                       |
| Insecure deserialization (CWE-502)     | Settings are plain strings read through a guarded accessor; no external input is parsed |
| Vulnerable components (CWE-1104)       | Dependabot and lockfile; see T1                                                         |
| SSRF, CSRF                             | No server; `form-action 'none'`, no state-changing requests                             |
| Misconfiguration                       | The CSP is built from one source file, `apps/web/src/csp.ts`, covered by `csp.test.ts`  |
| Hard-coded credentials                 | None; workflows hold no secrets                                                         |

## 7. Known gaps and accepted risk

- **CSP via `<meta>`.** GitHub Pages cannot set custom response headers, so `frame-ancestors`,
  `report-uri` and `sandbox` are unavailable. Clickjacking is not mitigated; the
  app holds nothing worth clicking through to.
- **Single maintainer.** One human approves every release; GitHub does not count
  self-approval, so review is by a separate agent plus required checks (see
  [`GOVERNANCE.md`](../GOVERNANCE.md)). A compromised owner account could ship a
  malicious release.
- **Unsigned release artifacts.** Signing is pending work
  ([#369](https://github.com/DocGerd/cockpit-procedure-trainer/issues/369)),
  which adds [`verifying-a-release.md`](verifying-a-release.md); until then a
  release is verifiable only by rebuilding it from the tagged source.

## 8. Assumptions

GitHub Pages and the user's browser enforce HTTPS and CSP correctly; the
maintainer's GitHub account is secured.

## 9. Maintenance

Reviewed when the CSP, the persistence layer, the set of network destinations
or the delivery pipeline changes, and at each release. Vulnerability handling
is in [`SECURITY.md`](../SECURITY.md).
