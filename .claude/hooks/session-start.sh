#!/usr/bin/env bash
# SessionStart hook: prepares a Claude Code cloud session so lint, typecheck
# and tests run from the first turn. Local sessions exit at once: contributors
# set up their own machine.
#
# Node: when the container's Node is older than package.json's engines
# (>=24), downloads the latest Node 24 from nodejs.org, checks it against the
# release's SHASUMS256.txt, installs it under ~/.cache/cpt-node and puts it
# first on the session's PATH through CLAUDE_ENV_FILE. Then installs the
# workspace dependencies from the lockfile, and the Chromium build that the
# lockfile's Playwright needs.
#
# Idempotent: a present Node 24, an up-to-date node_modules and a present
# Chromium build make a rerun a quick no-op.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = true ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

required=24
node_dir="$HOME/.cache/cpt-node"

node_major() {
  "$1" -p 'process.versions.node.split(".")[0]'
}

if [ "$(node_major node)" -lt "$required" ]; then
  if [ ! -x "$node_dir/bin/node" ] || [ "$(node_major "$node_dir/bin/node")" -lt "$required" ]; then
    case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *)
      echo "session-start: no Node $required build for $(uname -m)" >&2
      exit 1
      ;;
    esac
    dist=https://nodejs.org/dist
    version=$(curl -fsSL "$dist/index.json" |
      node -e 'const r = JSON.parse(require("fs").readFileSync(0, "utf8")); process.stdout.write(r.find((v) => v.version.startsWith(process.argv[1])).version)' "v$required.")
    tarball="node-$version-linux-$arch.tar.xz"
    # Stage next to the install dir: the final mv is then an atomic rename,
    # so an interrupted run never leaves a partial Node tree behind.
    mkdir -p "$(dirname "$node_dir")"
    tmp=$(mktemp -d -p "$(dirname "$node_dir")")
    trap 'rm -rf "$tmp"' EXIT
    curl -fsSL -o "$tmp/$tarball" "$dist/$version/$tarball"
    curl -fsSL -o "$tmp/SHASUMS256.txt" "$dist/$version/SHASUMS256.txt"
    (cd "$tmp" && grep " $tarball\$" SHASUMS256.txt | sha256sum -c --quiet -)
    mkdir "$tmp/node"
    tar -xJf "$tmp/$tarball" -C "$tmp/node" --strip-components=1
    rm -rf "$node_dir"
    mv "$tmp/node" "$node_dir"
    echo "session-start: installed Node $version in $node_dir" >&2
  fi
  export PATH="$node_dir/bin:$PATH"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$node_dir/bin:\$PATH\"" >>"$CLAUDE_ENV_FILE"
  fi
fi

# SessionStart stdout becomes session context: keep pnpm's output out of it.
pnpm install --frozen-lockfile >&2

# The image's preinstalled Chromium can be older than the build the lockfile's
# Playwright needs, and the image sets PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD.
# A blocked download only warns: lint, typecheck and unit tests still run.
if ! PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD= pnpm --filter @cpt/web exec playwright install chromium >&2; then
  echo "session-start: Chromium download failed; e2e needs cdn.playwright.dev and playwright.download.prss.microsoft.com in the environment's allowed domains" >&2
fi
