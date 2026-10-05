#!/usr/bin/env bash
# PreToolUse hook for Bash. It allows exactly one merge shape and denies every
# other command that looks like a merge, so agents cannot merge into main.
#
# This is an accident tripwire, NOT a security boundary. Known limits:
# - The base branch is read before the command runs, and it can change before
#   the merge executes.
# - Anything holding the owner's token can still merge a PR into main.
# The server-side backstop is the protect-main ruleset. It blocks direct pushes
# to main, but not PR merges made by the owner account.
#
# Allowed merge-like shapes, each as a single plain command:
#   gh pr merge <number> --squash|--merge [--delete-branch]
#       [--match-head-commit <40-hex>] [--repo <this repo>]
#   whose PR has base develop (one lookup), and git merge / git merge-base.
# Text that merely mentions merge is denied too; run the allowed shape, keep
# the word out of the command, or ask the owner.
#
# Input is only tokenised, never executed. The decision is in the JSON on
# stdout; the exit code is always 0.
set -uo pipefail

REPO=DocGerd/cockpit-procedure-trainer

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

DENY_SHAPE="Merge-like command refused. The only merge allowed is a single plain command: gh pr merge NUMBER with --squash or --merge, and optionally --delete-branch, --match-head-commit SHA, --repo OWNER/REPO, for a PR whose base is develop. Run that shape, keep the word merge out of the command, or ask the owner."

has_client='(^|[^[:alnum:]_])(gh|curl|wget)([^[:alnum:]_]|$)'
hidden_query_re='gh[[:space:]].*api[[:space:]].*graphql.*(--input|=@)'
expansion_re='[$`%]'
shape_re='^[A-Za-z0-9._/= -]+$'

# Merge-like: the word merge anywhere (also in mergePullRequest and /merge),
# gh aliases, GraphQL queries read from a file, retargeting a PR with
# pr edit --base, and shell expansion or percent-encoding in a gh, curl or wget
# command, since that can spell merge without writing it.
merge_like() {
  local text="$1"
  shopt -s nocasematch
  if [[ "$text" =~ merge ]] || [[ "$text" =~ gh[[:space:]]+alias ]]; then
    shopt -u nocasematch
    return 0
  fi
  shopt -u nocasematch
  [[ "$text" =~ $hidden_query_re ]] && return 0
  [[ "$text" =~ pr[[:space:]]+edit.*(--base|[[:space:]]-B) ]]
}

input="$(cat)"
cmd=""
jq_ok=0
if command -v jq >/dev/null 2>&1; then
  if cmd="$(jq -r '.tool_input.command // empty' <<<"$input" 2>/dev/null)"; then
    jq_ok=1
  else
    cmd=""
  fi
fi

if [ "$jq_ok" = 0 ]; then
  # Without a parsed command, judge the raw input: deny only what could be a merge.
  if merge_like "$input" || { [[ "$input" =~ $has_client ]] && [[ "$input" =~ $expansion_re ]]; }; then
    deny "The main-merge guard could not parse this command (jq missing or input invalid) and it looks like a merge. Install jq, run the allowed shape, or ask the owner."
  fi
  exit 0
fi
[ -n "$cmd" ] || exit 0

cmd="${cmd//\\$'\n'/ }"
unquoted="$(tr '\n' ' ' <<<"$cmd" | sed "s/'[^']*'//g")"
norm="$(tr -d "\\\\'\"" <<<"$cmd" | tr -s '[:space:]' ' ')"

mergelike=0
merge_like "$norm" && mergelike=1
if [[ "$unquoted" =~ $has_client ]] && [[ "$unquoted" =~ $expansion_re ]]; then
  mergelike=1
fi
[ "$mergelike" = 1 ] || exit 0

# Shape 1: git merge and git merge-base never touch a GitHub PR.
if [[ "$cmd" =~ ^[[:space:]]*git[[:space:]]+merge(-base)?([[:space:]]+[A-Za-z0-9._/@~^-]+)*[[:space:]]*$ ]]; then
  exit 0
fi

# Shape 2: one plain gh pr merge, built only from known tokens.
[[ "$cmd" =~ $shape_re ]] || deny "$DENY_SHAPE"
read -ra words <<<"$cmd"
[ "${#words[@]}" -ge 5 ] || deny "$DENY_SHAPE"
[ "${words[0]}" = gh ] && [ "${words[1]}" = pr ] && [ "${words[2]}" = merge ] || deny "$DENY_SHAPE"

num="" method="" delete=0 sha="" repo=""
i=3
while [ "$i" -lt "${#words[@]}" ]; do
  word="${words[i]}"
  case "$word" in
    --squash | --merge)
      [ -z "$method" ] || deny "$DENY_SHAPE"
      method="$word"
      ;;
    --delete-branch)
      [ "$delete" = 0 ] || deny "$DENY_SHAPE"
      delete=1
      ;;
    --match-head-commit)
      [ -z "$sha" ] || deny "$DENY_SHAPE"
      i=$((i + 1))
      sha="${words[i]:-}"
      [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || deny "$DENY_SHAPE"
      ;;
    -R | --repo)
      [ -z "$repo" ] || deny "$DENY_SHAPE"
      i=$((i + 1))
      repo="${words[i]:-}"
      [ "$repo" = "$REPO" ] || deny "$DENY_SHAPE"
      ;;
    *)
      [ -z "$num" ] || deny "$DENY_SHAPE"
      [[ "$word" =~ ^[0-9]+$ ]] || deny "$DENY_SHAPE"
      num="$word"
      ;;
  esac
  i=$((i + 1))
done
[ -n "$num" ] && [ -n "$method" ] || deny "$DENY_SHAPE"

command -v gh >/dev/null 2>&1 || deny "gh is not installed, so the base branch of the PR cannot be read."
if [ -n "$repo" ]; then
  path="repos/$repo/pulls/$num"
else
  path="repos/{owner}/{repo}/pulls/$num"
fi
found="$(timeout -k 2 10 gh api "$path" --jq '.base.ref + " " + .base.repo.full_name' </dev/null 2>/dev/null)" ||
  deny "Could not read the base branch of PR $num, so the merge is refused."
[ "$found" = "develop $REPO" ] ||
  deny "PR $num does not have base develop in this repository. Agents never merge into main; the owner merges the release PR."
exit 0
