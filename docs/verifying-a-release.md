# Verifying a release

Each GitHub Release carries one signed asset,
`cockpit-procedure-trainer-<version>.tar.gz`: the production web bundle
(`apps/web/dist`) built from the tagged commit. GitHub's automatic source
archives are not signed.

The asset is signed keylessly with Sigstore through GitHub artifact
attestations. There is no key to download or trust: the "public key" is the
identity of the release workflow, recorded in a short-lived certificate.

## Verify

You need the [GitHub CLI](https://cli.github.com/) (`gh`), signed in.

    gh release download v<version> --repo DocGerd/cockpit-procedure-trainer -p '*.tar.gz'
    gh attestation verify cockpit-procedure-trainer-<version>.tar.gz \
      --repo DocGerd/cockpit-procedure-trainer \
      --signer-workflow DocGerd/cockpit-procedure-trainer/.github/workflows/release.yml

A successful run prints the matching attestation. A failure means the file is
not the one the release workflow built; do not use it.

`--signer-workflow` pins the workflow that signed. `--source-ref refs/heads/main`
additionally pins the branch it ran on. `gh attestation verify --help` lists the
other checks.

## What the signature proves

- The file's SHA-256 digest matches a SLSA build provenance statement.
- The statement was signed by the workflow `.github/workflows/release.yml` of
  `DocGerd/cockpit-procedure-trainer`, running on GitHub-hosted runners for
  the commit the release was created from. The provenance names that commit.
- The signing certificate was issued by Sigstore's Fulcio certificate authority
  to that workflow identity through GitHub's OIDC token, and is valid only for
  minutes. The signature was logged in the public Rekor transparency log at
  signing time, so a signature made later or outside the workflow cannot pass
  verification.

It does not prove that the source is free of defects or that the build is
bit-for-bit reproducible. It ties the bundle to this repository's source and
workflow, nothing more.

## Hosting the bundle elsewhere

The bundle is built for the production site, so it expects to be served under
`/cockpit-procedure-trainer/`. To host it elsewhere, build from the tagged
source with your own `BASE_PATH`.
