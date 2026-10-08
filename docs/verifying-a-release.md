# Verifying a release

Every GitHub Release after v0.11.0 carries one signed asset,
`cockpit-procedure-trainer-<version>.tar.gz`: the production web bundle
(`apps/web/dist`) built from the tagged commit. v0.11.0 and earlier have no
asset and cannot be verified this way. GitHub's automatic source archives are
not signed.

The asset is signed keylessly with Sigstore through GitHub artifact
attestations. There is no key to download or trust: the "public key" is the
identity of the release workflow, recorded in a short-lived certificate.

## Verify

You need a [GitHub CLI](https://cli.github.com/) (`gh`) recent enough to have
the `gh attestation` command, signed in.

    gh release download v<version> --repo DocGerd/cockpit-procedure-trainer -p '*.tar.gz'
    gh attestation verify cockpit-procedure-trainer-<version>.tar.gz \
      --repo DocGerd/cockpit-procedure-trainer \
      --signer-workflow DocGerd/cockpit-procedure-trainer/.github/workflows/release.yml \
      --source-ref refs/heads/main \
      --deny-self-hosted-runners

Exit code 0 means the file verified; gh may print nothing when its output is
not a terminal. If it fails, read the error:
a missing sign-in or network problem is not a verdict on the file, but a file
that does not verify must not be used.

To also pin the exact commit, add `--source-digest` with the commit the tag
points to:

    gh api repos/DocGerd/cockpit-procedure-trainer/commits/v<version> --jq .sha

`gh attestation verify --help` lists the other checks.

## What the signature proves

With the command above:

- The file's SHA-256 digest matches a SLSA build provenance statement.
- The statement was signed by the workflow `.github/workflows/release.yml` of
  `DocGerd/cockpit-procedure-trainer` (`--repo`, `--signer-workflow`), running
  on `main` (`--source-ref`) on a GitHub-hosted runner
  (`--deny-self-hosted-runners`). The provenance names the commit it was built
  from; `--source-digest` checks it.
- The signing certificate was issued by Sigstore's Fulcio certificate authority
  to that workflow identity through GitHub's OIDC token. A signature made
  outside the workflow carries a different identity and fails.
- The signature is recorded in the public Rekor transparency log, and
  verification requires that entry. It proves the signature was made while the
  short-lived certificate was valid, so it cannot be made later.

It does not prove that the source is free of defects or that the build is
bit-for-bit reproducible. It ties the bundle to this repository's source and
workflow, nothing more.

## Hosting the bundle elsewhere

The bundle is built for the production site, so it expects to be served under
`/cockpit-procedure-trainer/`. To host it elsewhere, build from the tagged
source with your own `BASE_PATH`. That build is yours: the signature does not
cover it.
