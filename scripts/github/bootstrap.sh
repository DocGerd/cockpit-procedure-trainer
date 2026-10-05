#!/usr/bin/env bash
# Creates labels, milestones and issues from backlog.json. Safe to re-run.
set -euo pipefail

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="$dir/backlog.json"
repo="$(jq -r '.repo' "$manifest")"
spec="$(jq -r '.spec' "$manifest")"

gh_() { timeout -k 5 60 gh "$@" </dev/null; }

unknown="$(jq -r '
  (.labels | map(.name)) as $l | (.milestones | map(.title)) as $m
  | .issues[]
  | select((.milestone as $x | $m | index($x) | not) or (.labels - $l | length > 0))
  | "issue \(.id): unknown milestone or label"' "$manifest")"
if [[ -n "$unknown" ]]; then
  echo "$unknown" >&2
  exit 1
fi

mapfile -t labels < <(jq -c '.labels[]' "$manifest")
for l in "${labels[@]}"; do
  gh_ label create "$(jq -r '.name' <<<"$l")" --repo "$repo" --force \
    --color "$(jq -r '.color' <<<"$l")" \
    --description "$(jq -r '.description' <<<"$l")" >/dev/null
done

existing_ms="$(gh_ api --paginate "repos/$repo/milestones?state=all&per_page=100" --jq '.[].title')"
mapfile -t milestones < <(jq -c '.milestones[]' "$manifest")
for m in "${milestones[@]}"; do
  title="$(jq -r '.title' <<<"$m")"
  if ! grep -Fxq -- "$title" <<<"$existing_ms"; then
    gh_ api "repos/$repo/milestones" -f title="$title" \
      -f description="$(jq -r '.description' <<<"$m")" >/dev/null
  fi
done

ms_numbers="$(gh_ api --paginate "repos/$repo/milestones?state=all&per_page=100" \
  --jq '.[] | "\(.number)\t\(.title)"')"
existing_issues="$(gh_ api --paginate "repos/$repo/issues?state=all&per_page=100" \
  --jq '.[] | select(.pull_request | not) | .title')"

created=0
mapfile -t issues < <(jq -c '.issues | sort_by(.id) | .[]' "$manifest")
for i in "${issues[@]}"; do
  title="$(jq -r '.title' <<<"$i")"
  if grep -Fxq -- "$title" <<<"$existing_issues"; then
    continue
  fi
  ms_title="$(jq -r '.milestone' <<<"$i")"
  ms_number="$(awk -F'\t' -v t="$ms_title" '$2 == t { print $1 }' <<<"$ms_numbers")"
  body="$(jq -r '.body' <<<"$i")"$'\n\n'"Design spec: $spec"
  args=(-f title="$title" -f body="$body" -F milestone="$ms_number")
  mapfile -t issue_labels < <(jq -r '.labels[]' <<<"$i")
  for label in "${issue_labels[@]}"; do
    args+=(-f "labels[]=$label")
  done
  gh_ api "repos/$repo/issues" "${args[@]}" >/dev/null
  created=$((created + 1))
done

echo "created $created issues"
