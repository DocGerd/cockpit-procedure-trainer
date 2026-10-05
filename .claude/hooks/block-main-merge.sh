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
# An expansion ($, backtick or %) is merge-like only where it can spell a
# subcommand or a target: the first two words after gh, the gh api endpoint, a
# GraphQL query, the curl or wget URL, or the command word itself.
#
# Deliberate obfuscation is out of scope: shell expansion tricks, and clients
# other than gh, curl and wget (for example python).
#
# Input is only tokenised, never executed. The decision is in the JSON on
# stdout; the exit code is always 0.
set -uo pipefail

REPO=DocGerd/cockpit-procedure-trainer

SHAPE_TAIL="The only merge allowed is a single plain command: gh pr merge NUMBER with --squash or --merge, and optionally --delete-branch, --match-head-commit SHA, --repo OWNER/REPO, for a PR whose base is develop."

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

has_client='(^|[^[:alnum:]_])(gh|curl|wget)([^[:alnum:]_]|$)'
hidden_query_re='gh[[:space:]].*api[[:space:]].*graphql.*(--input|=@)'
expansion_re='[$`%]'
shape_re='^[A-Za-z0-9._/= -]+$'
SEP=$'\x1e'

# Sets trigger to the first merge-like feature found in text.
trigger=""
merge_like() {
  local text="$1"
  shopt -s nocasematch
  if [[ "$text" =~ merge ]]; then
    shopt -u nocasematch
    trigger="it contains the word merge"
    return 0
  fi
  if [[ "$text" =~ gh[[:space:]]+alias ]]; then
    shopt -u nocasematch
    trigger="it defines or imports a gh alias"
    return 0
  fi
  shopt -u nocasematch
  if [[ "$text" =~ $hidden_query_re ]]; then
    trigger="it reads a GraphQL query from a file"
    return 0
  fi
  if [[ "$text" =~ pr[[:space:]]+edit.*(--base|[[:space:]]-B) ]]; then
    trigger="it retargets a PR with pr edit --base"
    return 0
  fi
  return 1
}

# Quote-aware split of $1 into toks, with SEP between simple commands.
toks=()
tokenize() {
  toks=()
  local s="$1" i c cur="" q="" has=0 n=${#1}
  for ((i = 0; i < n; i++)); do
    c="${s:i:1}"
    if [ -n "$q" ]; then
      cur+="$c"
      [ "$c" = "$q" ] && q=""
      continue
    fi
    case "$c" in
      "'" | '"')
        q="$c"
        cur+="$c"
        has=1
        ;;
      '\')
        cur+="${s:i:2}"
        i=$((i + 1))
        has=1
        ;;
      ' ' | $'\t' | $'\r')
        [ "$has" = 1 ] && toks+=("$cur")
        cur="" has=0
        ;;
      ';' | '&' | '|' | '(' | ')' | $'\n')
        [ "$has" = 1 ] && toks+=("$cur")
        cur="" has=0
        toks+=("$SEP")
        ;;
      *)
        cur+="$c"
        has=1
        ;;
    esac
  done
  [ "$has" = 1 ] && toks+=("$cur")
  return 0
}

# True if the token, outside single quotes, holds an expansion character.
expands() {
  local t="${1//\'[^\']*\'/}"
  [[ "$t" =~ $expansion_re ]]
}

# Value-taking options, so their values are not mistaken for the endpoint or URL.
gh_api_valued=' -X --method -H --header -f --raw-field -F --field --jq -q --input -t --template --hostname --cache -p --preview '
curl_valued=' -X --request -H --header -d --data --data-raw --data-binary --data-urlencode -o --output -w --write-out -u --user -A --user-agent -e --referer -b --cookie -c --cookie-jar -F --form -T --upload-file --connect-timeout -m --max-time --retry -K --config -x --proxy -O -P -U --post-data --post-file -t '

# First positional word among "$@" after skipping valued options.
first_positional() {
  local valued="$1" w skip=0
  shift
  for w in "$@"; do
    if [ "$skip" = 1 ]; then
      skip=0
      continue
    fi
    case "$w" in
      --*=*) ;;
      -*)
        [[ "$valued" == *" $w "* ]] && skip=1
        ;;
      *)
        printf '%s' "$w"
        return 0
        ;;
    esac
  done
  return 1
}

# Judges one simple command (the words in seg). Sets trigger and returns 0 if
# an expansion sits where it could spell a merge.
judge_segment() {
  local -a seg=("$@")
  local i=0 w client="" n=${#seg[@]}
  while [ "$i" -lt "$n" ]; do
    w="${seg[i]}"
    case "$w" in
      [A-Za-z_]*=* | env | command | exec | sudo | time | nohup | xargs | do | then | else | elif | if | while | until | '!' | '{') ;;
      timeout | -* | [0-9]*) ;;
      *) break ;;
    esac
    i=$((i + 1))
  done
  [ "$i" -lt "$n" ] || return 1
  w="${seg[i]}"
  if expands "$w"; then
    [[ "$unquoted" =~ $has_client ]] || return 1
    trigger="the command word is an expansion in a command that uses gh, curl or wget"
    return 0
  fi
  case "${w##*/}" in
    gh | curl | wget) client="${w##*/}" ;;
    *) return 1 ;;
  esac
  local -a args=("${seg[@]:i+1}")
  local ep
  if [ "$client" = gh ]; then
    local k
    for k in 0 1; do
      if [ "${#args[@]}" -gt "$k" ] && expands "${args[k]}"; then
        trigger="an expansion sits in the gh subcommand"
        return 0
      fi
    done
    if [ "${args[0]:-}" = api ]; then
      ep="$(first_positional "$gh_api_valued" "${args[@]:1}")" || ep=""
      if [ -n "$ep" ] && expands "$ep"; then
        trigger="an expansion sits in the gh api endpoint"
        return 0
      fi
      if [ "$ep" = graphql ]; then
        for w in "${args[@]:1}"; do
          if [[ "$w" == *query=* ]] && expands "$w"; then
            trigger="an expansion sits in a GraphQL query"
            return 0
          fi
        done
      fi
    fi
    return 1
  fi
  ep=""
  for w in "${args[@]}"; do
    [[ "$w" == *://* ]] && ep="$w" && break
  done
  [ -n "$ep" ] || ep="$(first_positional "$curl_valued" "${args[@]}")" || ep=""
  if [ -n "$ep" ] && expands "$ep"; then
    trigger="an expansion sits in the $client URL"
    return 0
  fi
  return 1
}

# True if some simple command in text has an expansion in a merge-relevant spot.
risky_expansion() {
  tokenize "$1"
  local -a seg=()
  local t
  for t in "${toks[@]}" "$SEP"; do
    if [ "$t" = "$SEP" ]; then
      if [ "${#seg[@]}" -gt 0 ] && judge_segment "${seg[@]}"; then
        return 0
      fi
      seg=()
    else
      seg+=("$t")
    fi
  done
  return 1
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

orig="$cmd"
cmd="${cmd//\\$'\n'/ }"
unquoted="$(tr '\n' ' ' <<<"$cmd" | sed "s/'[^']*'//g")"
norm="$(tr -d "\\\\'\"" <<<"$cmd" | tr -s '[:space:]' ' ')"

if merge_like "$norm"; then
  :
elif [[ "$unquoted" =~ $has_client ]] && [[ "$unquoted" =~ $expansion_re ]] && risky_expansion "$cmd"; then
  deny "Refused: ${trigger}. Spell the gh subcommand, the gh api endpoint, GraphQL queries and curl or wget URLs as literals; expansions elsewhere in a command are fine. ${SHAPE_TAIL}"
else
  exit 0
fi
shape_trigger="$trigger"

# One command only, checked before any shape is tried.
case "$orig" in
  *$'\n'* | *$'\r'* | *';'* | *'&'* | *'|'* | *'`'* | *'$('*)
    deny "Refused: the command chains or substitutes commands (newline, semicolon, ampersand, pipe, backtick or dollar-paren) and also looks merge-like because ${shape_trigger}. Run each command on its own. ${SHAPE_TAIL}"
    ;;
esac

# Shape 1: git merge and git merge-base never touch a GitHub PR.
if [[ "$cmd" =~ ^[[:blank:]]*git[[:blank:]]+merge(-base)?([[:blank:]]+[A-Za-z0-9._/@~^-]+)*[[:blank:]]*$ ]]; then
  exit 0
fi

# Shape 2: one plain gh pr merge, built only from known tokens.
DENY_SHAPE="Refused: the command looks merge-like because ${shape_trigger}, and it is not the allowed shape. ${SHAPE_TAIL} Run that shape, keep the word merge out of the command, or ask the owner."
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
