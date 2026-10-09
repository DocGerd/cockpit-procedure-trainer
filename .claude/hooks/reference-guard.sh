#!/usr/bin/env bash
# PreToolUse hook for the file tools (Read, Glob, Grep, Edit, Write,
# NotebookEdit, LSP) and the PDF viewer. It denies a target under reference/ of
# any worktree of this project, the main checkout included: that directory
# holds copyrighted material that agents must not read or quote.
#
# This is an accident tripwire, NOT a security boundary. Known limits:
# - Bash (cat, sed, rg) is not covered.
# - A Grep or Glob rooted above reference/ is allowed unless a pattern segment
#   is literally reference, preceded only by a literal path and then bare
#   wildcards (*, **); ref* or */docs/reference pass.
#
# Fails closed only on a clear match. A missing jq, git or GNU realpath,
# unexpected input or an unreadable repo allows the call: exit 1 shows the
# user a hook-error notice. Override (owner, when authoring docs/aircraft
# intake): CPT_ALLOW_REFERENCE=1.
#
# A deny is the JSON on stdout with exit 0.
set -uo pipefail

[ "${CPT_ALLOW_REFERENCE:-}" = 1 ] && exit 0
# git -C must find the project repo, not an inherited one.
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR GIT_CEILING_DIRECTORIES GIT_DISCOVERY_ACROSS_FILESYSTEM
# On a case-insensitive filesystem Reference/ opens reference/.
shopt -s nocasematch

warn() {
  echo "reference-guard: $1; allowing the call" >&2
  exit 1
}

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

command -v jq >/dev/null 2>&1 || warn "jq is missing"
command -v git >/dev/null 2>&1 || warn "git is missing"
realpath -m / >/dev/null 2>&1 || warn "realpath does not support -m (needs GNU coreutils)"

input="$(cat)"
jq -e '(.tool_input | type) == "object"' >/dev/null 2>&1 <<<"$input" || warn "input is not JSON with a tool_input object"
cwd="$(jq -r '.cwd // empty' <<<"$input")"
[ -n "$cwd" ] || cwd="$PWD"

# Resolve to an absolute path, normalising .. and symlinks where they exist.
resolve() {
  local p="$1"
  [[ "$p" == "~" || "$p" == "~/"* ]] && p="$HOME${p#\~}"
  [[ "$p" == /* ]] || p="$cwd/$p"
  realpath -m -- "$p"
}

under() { [[ "$1" == "$2" || "$1" == "${2%/}"/* ]]; }

mapfile -t paths < <(jq -r '[.tool_input | .file_path, .notebook_path, .path, .filePath, (.url | select(type == "string" and ((test("^[a-z]+://") | not) or startswith("file://"))) | sub("^file://"; ""))] | map(select(type == "string" and . != "")) | .[]' <<<"$input")
mapfile -t patterns < <(jq -r 'if .tool_name == "Glob" then .tool_input.pattern elif .tool_name == "Grep" then .tool_input.glob else empty end | select(type == "string" and . != "")' <<<"$input")
searchbase="$(jq -r '.tool_input.path // empty' <<<"$input")"

tool="$(jq -r '.tool_name // empty' <<<"$input")"
# A search without a path starts at the session cwd.
if [ -z "$searchbase" ] && [[ "$tool" == Glob || "$tool" == Grep ]]; then
  paths+=("$cwd")
fi

resolved=()
for p in "${paths[@]}"; do
  r="$(resolve "$p")" || warn "cannot resolve '$p'"
  resolved+=("$r")
done

# Cheap exit: every protected root is reached through a path naming
# reference, so a call that never mentions it needs no git lookup.
mentions=0
for p in "${paths[@]}" "${resolved[@]}" "${patterns[@]}"; do
  [[ "$p" == *reference* ]] && mentions=1
done
[ "$mentions" = 1 ] || exit 0

proj="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -n "$proj" ] || warn "cannot locate the project"
trees="$(LC_ALL=C git -C "$proj" worktree list --porcelain 2>&1)" || warn "cannot read the project repo: ${trees%%$'\n'*}"
mapfile -t trees <<<"$trees"
# A symlinked reference/ is guarded under its own name and, when reached
# through it, at its target; the target's own path is not guarded.
roots=()
for line in "${trees[@]}"; do
  [[ "$line" == "worktree "* ]] || continue
  roots+=("$(resolve "${line#worktree }/reference")" "$(realpath -ms -- "${line#worktree }/reference")")
done
[ "${#roots[@]}" -gt 0 ] || warn "the project repo lists no worktree"

hit=""
for p in "${resolved[@]}"; do
  for r in "${roots[@]}"; do
    under "$p" "$r" && hit="$p"
  done
done

# A pattern that names a reference segment reaches a root when what precedes
# it is a literal path, optionally followed by bare wildcards, and that path
# contains the root or lies inside it.
if [ -z "$hit" ]; then
  base="$(resolve "${searchbase:-$cwd}")"
  for pat in "${patterns[@]}"; do
    [[ "$pat" =~ (^|/)reference(/|$) ]] || continue
    pre="${pat%%"${BASH_REMATCH[0]}"*}"
    [[ "$pat" == /* ]] && lit="/" || lit="$base"
    wild=0 opaque=0
    IFS=/ read -ra segs <<<"$pre"
    for s in "${segs[@]}"; do
      if [[ "$s" =~ ^\*\*?$ ]]; then
        wild=1
      elif [[ "$s" == *[*?[{]* ]] || [ "$wild" = 1 ]; then
        opaque=1
      else
        lit="$lit/$s"
      fi
    done
    [ "$opaque" = 0 ] || continue
    lit="$(realpath -m -- "$lit")"
    for r in "${roots[@]}"; do
      if [ "$wild" = 1 ]; then
        { under "$r" "$lit" || under "$lit" "$r"; } && hit="$pat"
      else
        under "$lit/reference" "$r" && hit="$pat"
      fi
    done
  done
fi

[ -n "$hit" ] || exit 0
deny "Refused: '${hit}' reaches reference/, which holds copyrighted handbook material that agents must not read, quote or edit. Aircraft facts come from docs/aircraft/<id>-intake.md. The owner can set CPT_ALLOW_REFERENCE=1 to authorise this when authoring an intake."
