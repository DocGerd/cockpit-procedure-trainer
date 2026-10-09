#!/usr/bin/env bash
# PreToolUse hook for Edit, Write and NotebookEdit. It denies a target inside
# this project's main working tree, so agents edit only in their own worktree.
#
# The decision follows the target path, not the session cwd: the nearest
# existing ancestor of the target must belong to this project's repo and be its
# main working tree. Linked worktrees (also those nested under the main
# checkout), other repos and paths outside any repo are allowed.
#
# This is an accident tripwire, NOT a security boundary: Bash (sed -i, tee)
# is not covered.
#
# Fails closed only on a clear match. A missing jq or git, unparseable input
# or an unreadable repo allows the call and prints a notice on stderr.
# Override: CPT_ALLOW_MAIN_EDIT=1.
#
# The decision is in the JSON on stdout; the exit code is always 0.
set -uo pipefail

[ "${CPT_ALLOW_MAIN_EDIT:-}" = 1 ] && exit 0

warn() {
  echo "main-checkout-guard: $1; allowing the call" >&2
  exit 0
}

command -v jq >/dev/null 2>&1 || warn "jq is missing"
command -v git >/dev/null 2>&1 || warn "git is missing"

input="$(cat)"
target="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input" 2>/dev/null)" || warn "input is not valid JSON"
[ -n "$target" ] || exit 0
cwd="$(jq -r '.cwd // empty' <<<"$input" 2>/dev/null)"
[ -n "$cwd" ] || cwd="$PWD"

[[ "$target" == "~" || "$target" == "~/"* ]] && target="$HOME${target#\~}"
[[ "$target" == /* ]] || target="$cwd/$target"
target="$(realpath -m -- "$target")"

dir="$target"
until [ -d "$dir" ]; do dir="$(dirname "$dir")"; done

# Prints git-dir then common-dir, both absolute and symlink-resolved.
repo_dirs() {
  local out
  out="$(git -C "$1" rev-parse --path-format=absolute --git-dir --git-common-dir 2>/dev/null)" || return 1
  while IFS= read -r line; do realpath -m -- "$line"; done <<<"$out"
}

mapfile -t here < <(repo_dirs "$dir") || true
[ "${#here[@]}" = 2 ] || exit 0

proj="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mapfile -t ours < <(repo_dirs "$proj") || true
[ "${#ours[@]}" = 2 ] || warn "cannot read the project repo"

[ "${here[1]}" = "${ours[1]}" ] || exit 0
[ "${here[0]}" = "${here[1]}" ] || exit 0

jq -n --arg r "Refused: '${target}' is in the main checkout. Work in your own git worktree and never edit files in the main checkout. The owner can set CPT_ALLOW_MAIN_EDIT=1 to authorise this edit." '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
