#!/usr/bin/env bash
# PreToolUse hook for Read, Glob, Grep, Edit, Write and NotebookEdit. It denies
# a target under reference/ of the main checkout or of the current worktree:
# that directory holds copyrighted material that agents must not read or quote.
#
# This is an accident tripwire, NOT a security boundary. Known limits:
# - Bash (cat, sed, rg) is not covered.
# - A Grep or Glob rooted above reference/ with no pattern naming it is allowed.
#
# Fails closed only on a clear match. A missing jq or git, unparseable input
# or an unreadable repo allows the call and prints a notice on stderr.
# Override (owner, when authoring docs/aircraft intake): CPT_ALLOW_REFERENCE=1.
#
# The decision is in the JSON on stdout; the exit code is always 0.
set -uo pipefail

[ "${CPT_ALLOW_REFERENCE:-}" = 1 ] && exit 0

warn() {
  echo "reference-guard: $1; allowing the call" >&2
  exit 0
}

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

command -v jq >/dev/null 2>&1 || warn "jq is missing"
command -v git >/dev/null 2>&1 || warn "git is missing"

input="$(cat)"
cwd="$(jq -r '.cwd // empty' <<<"$input" 2>/dev/null)" || warn "input is not valid JSON"
[ -n "$cwd" ] || cwd="$PWD"

# Resolve to an absolute path, normalising .. and symlinks where they exist.
resolve() {
  local p="$1"
  [[ "$p" == "~" || "$p" == "~/"* ]] && p="$HOME${p#\~}"
  [[ "$p" == /* ]] || p="$cwd/$p"
  realpath -m -- "$p"
}

under() { [[ "$1" == "$2" || "$1" == "$2"/* ]]; }

mapfile -t paths < <(jq -r '[.tool_input.file_path, .tool_input.notebook_path, .tool_input.path] | map(select(type == "string" and . != "")) | .[]' <<<"$input" 2>/dev/null)
mapfile -t patterns < <(jq -r 'if .tool_name == "Glob" then .tool_input.pattern elif .tool_name == "Grep" then .tool_input.glob else empty end | select(type == "string" and . != "")' <<<"$input" 2>/dev/null)
searchbase="$(jq -r '.tool_input.path // empty' <<<"$input" 2>/dev/null)"

tool="$(jq -r '.tool_name // empty' <<<"$input" 2>/dev/null)"
# A search without a path starts at the session cwd.
if [ -z "$searchbase" ] && [[ "$tool" == Glob || "$tool" == Grep ]]; then
  paths+=("$cwd")
fi

resolved=()
for p in "${paths[@]}"; do
  resolved+=("$(resolve "$p")")
done

# Cheap exit: every protected root ends in /reference, so a call whose paths
# and patterns never mention it needs no git lookup.
mentions=0
for p in "${resolved[@]}" "${patterns[@]}"; do
  [[ "$p" == *reference* ]] && mentions=1
done
[ "$mentions" = 1 ] || exit 0

proj="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
common="$(git -C "$proj" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || warn "cannot read the project repo"
roots=("$(resolve "$(dirname "$common")/reference")")
for dir in "$proj" "$cwd"; do
  top="$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null)" || continue
  roots+=("$(resolve "$top/reference")")
done

hit=""
for p in "${resolved[@]}"; do
  for r in "${roots[@]}"; do
    under "$p" "$r" && hit="$p"
  done
done

# A pattern that names a reference segment reaches a root when its literal
# prefix lands there, or when only wildcards precede it and the search base
# contains the root.
if [ -z "$hit" ]; then
  base="$cwd"
  [ -n "$searchbase" ] && base="$(resolve "$searchbase")"
  for pat in "${patterns[@]}"; do
    [[ "$pat" =~ (^|/)reference(/|$) ]] || continue
    pre="${pat%%reference*}"
    pre="${pre%/}"
    if [ -z "$pre" ] || [[ "$pre" =~ ^(\*\*?/)*\*\*?$ ]]; then
      for r in "${roots[@]}"; do
        { under "$r" "$base" || under "$base" "$r"; } && hit="$pat"
      done
    elif [[ "$pre" != *[*?[{]* ]]; then
      if [[ "$pre" == /* ]]; then t="$pre/reference"; else t="$base/$pre/reference"; fi
      t="$(realpath -m -- "$t")"
      for r in "${roots[@]}"; do
        under "$t" "$r" && hit="$pat"
      done
    fi
  done
fi

[ -n "$hit" ] || exit 0
deny "Refused: '${hit}' reaches reference/, which holds copyrighted handbook material that agents must not read, quote or edit. Aircraft facts come from docs/aircraft/<id>-intake.md. The owner can set CPT_ALLOW_REFERENCE=1 to authorise this when authoring an intake."
