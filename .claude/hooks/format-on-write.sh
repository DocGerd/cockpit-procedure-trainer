#!/bin/sh
# PostToolUse hook: Prettier on a written file, only if it is a regular file
# whose resolved path lies strictly inside the resolved project directory.
# Never blocks the tool: every path out of here exits 0.

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0

root=$(realpath -e -- "$CLAUDE_PROJECT_DIR" 2>/dev/null) || exit 0
file=$(realpath -e -- "$file" 2>/dev/null) || exit 0
[ -n "$root" ] && [ -f "$file" ] || exit 0

case "$file" in
"$root"/*) ;;
*) exit 0 ;;
esac

cd "$root" || exit 0
pnpm exec prettier --write --ignore-unknown --log-level warn -- "$file" ||
  echo "format-on-write: prettier failed on $file" >&2
exit 0
