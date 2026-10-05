#!/usr/bin/env bash
# PreToolUse hook for Bash: agents never merge into main.
# Denies every `gh pr merge` whose PR base is main, any merge or GraphQL
# mutation sent through `gh api` that bypasses that check, and every case it
# cannot decide. Fails closed. Input is only ever tokenised, never executed.
# The decision is in the JSON on stdout; the exit code is always 0.
set -uo pipefail

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
  exit 0
}

command -v jq >/dev/null 2>&1 || deny "jq is not installed, so the main-merge guard cannot inspect the command. Install jq."

cmd="$(jq -r '.tool_input.command // empty')" || deny "The main-merge guard could not parse its input."
[ -n "$cmd" ] || exit 0

cmd="${cmd//\\$'\n'/ }"
lines="$(tr -d "\\\\'\"" <<<"$cmd")"
norm="$(tr -s '[:space:]' ' ' <<<"$lines")"

shopt -s nocasematch
if [[ "$norm" =~ gh[[:space:]].*api[[:space:]].*/merge ]]; then
  deny "Merging through the API is not allowed. Use gh pr merge on a PR whose base is develop."
fi
if [[ "$norm" =~ gh[[:space:]].*api[[:space:]].*graphql ]]; then
  [[ "$norm" =~ mergePullRequest|enablePullRequestAutoMerge ]] &&
    deny "Merging through GraphQL is not allowed. Use gh pr merge on a PR whose base is develop."
  [[ "$norm" =~ --input|=@|query=\$|\$\(|\` ]] &&
    deny "GraphQL calls must pass the query inline and literally so it can be inspected."
fi
shopt -u nocasematch

repo_ok='^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'

# Sets BASE_NUM and BASE_REPO from the words after `merge`, or denies.
# $1 is the repo named before `merge` (global flag or GH_REPO), possibly empty.
parse_merge_args() {
  local repo="$1" word url_repo="" count=0 want=""
  shift
  BASE_NUM=""
  for word in "$@"; do
    case "$want" in
      repo)
        repo="$word"
        want=""
        continue
        ;;
      value)
        want=""
        continue
        ;;
    esac
    case "$word" in
      -R | --repo) want=repo ;;
      --repo=*) repo="${word#--repo=}" ;;
      -R?*) repo="${word#-R}" ;;
      --match-head-commit | --subject | --body | --body-file | --author-email | -[tbFA]) want=value ;;
      -*) ;;
      *)
        count=$((count + 1))
        if [[ "$word" =~ ^[0-9]+$ ]]; then
          BASE_NUM="$word"
        elif [[ "$word" =~ ^https://github\.com/([A-Za-z0-9._-]+/[A-Za-z0-9._-]+)/pull/([0-9]+)([/?#].*)?$ ]]; then
          url_repo="${BASH_REMATCH[1]}"
          BASE_NUM="${BASH_REMATCH[2]}"
        else
          deny "Name the PR by number or URL so its base branch can be checked."
        fi
        ;;
    esac
  done
  [ -z "$want" ] || deny "A flag of gh pr merge is missing its value."
  [ "$count" = 1 ] || deny "Name exactly one PR by number or URL so its base branch can be checked."
  [ -z "$url_repo" ] || repo="$url_repo"
  if [ -z "$repo" ]; then
    case "$norm" in
      *"cd "* | *pushd*) deny "Name the repository with --repo when the command changes directory before gh pr merge." ;;
    esac
    BASE_REPO='{owner}/{repo}'
  else
    [[ "$repo" =~ $repo_ok ]] || deny "Could not interpret the repository named for gh pr merge."
    BASE_REPO="$repo"
  fi
}

merges=0
check_merge() {
  merges=$((merges + 1))
  [ "$merges" -le 3 ] || deny "At most three gh pr merge calls can be inspected in one command."
  command -v gh >/dev/null 2>&1 || deny "gh is not installed, so the base branch of the PR cannot be read."
  parse_merge_args "$@"
  local base
  base="$(timeout -k 5 8 gh api "repos/$BASE_REPO/pulls/$BASE_NUM" --jq .base.ref </dev/null 2>/dev/null)" ||
    deny "Could not read the base branch of PR $BASE_NUM."
  [[ "$base" =~ ^[A-Za-z0-9._/-]+$ ]] || deny "Could not read the base branch of PR $BASE_NUM."
  [ "$base" != null ] || deny "Could not read the base branch of PR $BASE_NUM."
  [ "$base" != main ] ||
    deny "PR $BASE_NUM targets main. Agents never merge into main; the owner merges the release PR."
}

# Finds `gh [flags] pr [flags] merge` in the words of a segment and calls
# check_merge with the repo named before `merge` and the words after it.
scan_segment() {
  local -a words
  local i j n word repo stage
  read -ra words <<<"$1"
  n=${#words[@]}
  for ((i = 0; i < n; i++)); do
    [ "${words[i]##*/}" = gh ] || continue
    repo=""
    for ((j = 0; j < i; j++)); do
      case "${words[j]}" in GH_REPO=*) repo="${words[j]#GH_REPO=}" ;; esac
    done
    stage=gh
    for ((j = i + 1; j < n; j++)); do
      word="${words[j]}"
      case "$word" in
        -R | --repo)
          repo="${words[j + 1]:-}"
          j=$((j + 1))
          continue
          ;;
        --repo=*)
          repo="${word#--repo=}"
          continue
          ;;
        -R?*)
          repo="${word#-R}"
          continue
          ;;
        --hostname)
          j=$((j + 1))
          continue
          ;;
        -*) continue ;;
      esac
      if [ "$stage" = gh ] && [ "$word" = pr ]; then
        stage="pr"
      elif [ "$stage" = pr ] && [ "$word" = merge ]; then
        check_merge "$repo" "${words[@]:j+1}"
        break
      else
        break
      fi
    done
  done
  return 0
}

mapfile -t segments < <(sed -e 's/[;&|(){}`]/\n/g' <<<"$lines")
for segment in "${segments[@]}"; do
  scan_segment "$segment"
done
exit 0
