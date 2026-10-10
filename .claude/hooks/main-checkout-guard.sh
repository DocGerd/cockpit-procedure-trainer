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
# is not covered. Files under the main checkout's top-level .remember/ are
# exempt.
#
# Fails closed only on a clear match. A missing jq, git or GNU realpath,
# unexpected input or an unreadable repo allows the call: exit 1 shows the
# user a hook-error notice. Override: CPT_ALLOW_MAIN_EDIT=1.
#
# A deny is the JSON on stdout with exit 0.
set -uo pipefail

[ "${CPT_ALLOW_MAIN_EDIT:-}" = 1 ] && exit 0
# Repo lookups must follow the paths, not an inherited GIT_DIR.
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR GIT_CEILING_DIRECTORIES GIT_DISCOVERY_ACROSS_FILESYSTEM

warn() {
  echo "main-checkout-guard: $1; allowing the call" >&2
  exit 1
}

command -v jq >/dev/null 2>&1 || warn "jq is missing"
command -v git >/dev/null 2>&1 || warn "git is missing"
realpath -m / >/dev/null 2>&1 || warn "realpath does not support -m (needs GNU coreutils)"

input="$(cat)"
jq -e '(.tool_input | type) == "object"' >/dev/null 2>&1 <<<"$input" || warn "input is not JSON with a tool_input object"
target="$(jq -r '.tool_input | .file_path // .notebook_path // empty' <<<"$input")"
[ -n "$target" ] || exit 0
cwd="$(jq -r '.cwd // empty' <<<"$input")"
[ -n "$cwd" ] || cwd="$PWD"

[[ "$target" == "~" || "$target" == "~/"* ]] && target="$HOME${target#\~}"
[[ "$target" == /* ]] || target="$cwd/$target"
target="$(realpath -m -- "$target")"

dir="$target"
until [ -d "$dir" ]; do dir="$(dirname "$dir")"; done

# Sets dirs to git-dir and common-dir of $1, absolute and symlink-resolved.
# Returns 1 outside any repo; other git failures are a notice.
dirs=()
repo_dirs() {
  local out line
  if ! out="$(git -C "$1" rev-parse --path-format=absolute --git-dir --git-common-dir 2>/dev/null)"; then
    out="$(LC_ALL=C git -C "$1" rev-parse --path-format=absolute --git-dir --git-common-dir 2>&1)"
    [[ "$out" == *"not a git repository"* ]] && return 1
    warn "cannot read the repo at $1: ${out%%$'\n'*}"
  fi
  mapfile -t dirs <<<"$out"
  [ "${#dirs[@]}" = 2 ] || warn "unexpected git rev-parse output at $1 (git 2.31 or newer is needed)"
  for line in 0 1; do dirs[line]="$(realpath -m -- "${dirs[line]}")"; done
}

proj="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -n "$proj" ] || warn "cannot locate the project"
repo_dirs "$proj" || warn "the project at $proj is not a git repo"
ours=("${dirs[@]}")
repo_dirs "$dir" || exit 0
here=("${dirs[@]}")

[ "${here[1]}" = "${ours[1]}" ] || exit 0
[ "${here[0]}" = "${here[1]}" ] || exit 0

# .remember/ holds local session-handoff notes, not project files.
[[ "$target" == "$(dirname "${here[1]}")/.remember/"* ]] && exit 0

jq -n --arg r "Refused: '${target}' is in the main checkout. Work in your own git worktree and never edit files in the main checkout. The owner can set CPT_ALLOW_MAIN_EDIT=1 to authorise this edit." '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
