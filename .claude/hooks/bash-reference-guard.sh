#!/usr/bin/env bash
# PreToolUse hook for Bash, the companion of reference-guard.sh. It denies a
# command that names a path under reference/ of any worktree of this project,
# the main checkout included, or that recursively searches or copies a
# directory containing an existing reference/ without excluding it.
#
# This is an accident tripwire, NOT a security boundary. Known limits:
# - Words are judged after a plain quote and heredoc strip. Variables other
#   than $HOME, $PWD and $CLAUDE_PROJECT_DIR, command substitutions, globs
#   (ref*) and a path built at run time are not followed, and a script run
#   from a file is not read. The text of "$(...)" inside double quotes is not
#   scanned.
# - A word containing whitespace is never a path, and the bare word reference
#   is a path only where a command takes one (cd, ls, find, cp, ...) or after
#   a search pattern, so reference as message or search text passes.
# - Searches that honour .gitignore (rg, ag, fd) pass unless a no-ignore flag
#   is given; git grep never sees untracked files. du, ls and tree list names
#   only, so they are not checked for recursion; their path operands are.
# - A recursive grep, ack, tar, cp, rsync or zip, and a find that runs or
#   prints file contents (-exec, -execdir, -ok, -okdir, -fprint), is judged by
#   its path operands (the working directory when it has none). A find piped
#   to a reader is not followed. cd is followed within the command, nothing
#   else is.
# - The code of python -c, node -e, perl -e and ruby -e is scanned only for
#   words containing reference/ and the quoted word reference.
#
# Fails visible rather than closed: a missing jq, git or GNU realpath,
# unexpected input or a command it cannot tokenise allows the call and exit 1
# shows the user a hook-error notice. Override (owner, when authoring docs/
# aircraft intake): CPT_ALLOW_REFERENCE=1.
#
# A deny is the JSON on stdout with exit 0.
set -uo pipefail

[ "${CPT_ALLOW_REFERENCE:-}" = 1 ] && exit 0
# git -C must find the project repo, not an inherited one.
unset GIT_DIR GIT_WORK_TREE GIT_COMMON_DIR GIT_CEILING_DIRECTORIES GIT_DISCOVERY_ACROSS_FILESYSTEM

warn() {
  echo "bash-reference-guard: $1; allowing the call" >&2
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
cmdline="$(jq -r '.tool_input.command | select(type == "string")' <<<"$input")"
[ -n "$cmdline" ] || exit 0
cwd="$(jq -r '.cwd // empty' <<<"$input")"
[ -n "$cwd" ] || cwd="$PWD"

# Cheap exit: a command that names neither reference nor a command able to
# reach it through a parent directory needs no git lookup.
recursers='(^|[^[:alnum:]_.-])(grep|egrep|fgrep|zgrep|rg|ag|ack|fd|fdfind|find|cp|rsync|tar|zip)([^[:alnum:]_.-]|$)'
lower="${cmdline,,}${cwd,,}"
if [[ "$lower" != *reference* && ! "$cmdline" =~ $recursers ]]; then
  exit 0
fi

proj="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -n "$proj" ] || warn "cannot locate the project"
trees="$(LC_ALL=C git -C "$proj" worktree list --porcelain 2>&1)" || warn "cannot read the project repo: ${trees%%$'\n'*}"
mapfile -t trees <<<"$trees"

# Resolve to an absolute path, normalising .. and symlinks where they exist.
resolve() {
  local p="$1"
  [[ "$p" == "~" || "$p" == "~/"* ]] && p="$HOME${p#\~}"
  [[ "$p" == /* ]] || p="$cwd/$p"
  realpath -m -- "$p"
}

# On a case-insensitive filesystem Reference/ opens reference/.
under() { local a="${1,,}" b="${2,,}"; [[ "$a" == "$b" || "$a" == "${b%/}"/* ]]; }

# A symlinked reference/ is guarded under its own name and at its target.
roots=()
live=()
for line in "${trees[@]}"; do
  [[ "$line" == "worktree "* ]] || continue
  for r in "$(resolve "${line#worktree }/reference")" "$(realpath -ms -- "${line#worktree }/reference")"; do
    roots+=("$r")
    if [ -e "$r" ] || [ -L "$r" ]; then live+=("$r"); fi
  done
done
[ "${#roots[@]}" -gt 0 ] || warn "the project repo lists no worktree"

tokenizer=$(
  cat <<'EOF'
def unheredoc:
  gsub("(?<head>(?<!<)<<-?[ \\t]*(?<q>['\"]?)(?<d>[A-Za-z_][A-Za-z0-9_]*)\\k<q>[^\\n]*\\n)(?:[^\\n]*\\n)*?[ \\t]*\\k<d>[ \\t]*(?=\\n|$)"; "\(.head)");
def unquote:
  gsub("'(?<s>[^']*)'|\"(?<d>(?:[^\"\\\\]|\\\\.)*)\"|\\\\(?<e>.)"; "\(.s // .d // .e // "")");
def expand:
  gsub("\\$\\{?(?<n>HOME|PWD|CLAUDE_PROJECT_DIR)\\}?"; if .n == "HOME" then $home elif .n == "PWD" then $pwd else $proj end);
$c | unheredoc
| [scan("[0-9]*[<>]+&?[0-9]*-?|(?:[^\\s;|&<>()`'\"\\\\]|\\\\.|'[^']*'|\"(?:[^\"\\\\]|\\\\.)*\")+|[;|&()`\\n]+")]
| map(if test("^[0-9]*<<<") then "\u0003" elif test("^[0-9]*[<>]") then empty elif test("^[;|&()`\\n]") then "\u0001" else unquote | expand end)
| .[], "\u0002"
| ., "\u0000"
EOF
)

hit=""
reason=""
vcwd="$cwd"

# Excluded: the segment words a[] name reference as something to skip.
excludes_reference() {
  local cmd="$1" j prev="" w pruned=0
  for w in "${a[@]}"; do [[ "$w" == -prune ]] && pruned=1; done
  for ((j = 0; j < ${#a[@]}; j++)); do
    w="${a[j]}"
    if [[ "${w,,}" == *reference* ]]; then
      [[ "$w" =~ ^--(exclude|exclude-dir|ignore[a-z-]*)= ]] && return 0
      [[ "$w" =~ ^(--i?glob=)?! ]] && return 0
      [[ "$prev" =~ ^--(exclude|exclude-dir|ignore[a-z-]*)$ ]] && return 0
      [[ "$cmd" == fd || "$cmd" == fdfind ]] && [[ "$prev" == -E ]] && return 0
      [ "$cmd" = find ] && [ "$pruned" = 1 ] && return 0
    fi
    prev="$w"
  done
  return 1
}

# Succeeds when the command recurses by itself or through a flag in a[].
recurses() {
  local cmd="$1" w
  case "$cmd" in
    ack | tar) return 0 ;;
    find)
      for w in "${a[@]}"; do [[ "$w" =~ ^-(exec|execdir|ok|okdir|fprint0?|fprintf)$ ]] && return 0; done ;;
    grep | egrep | fgrep | zgrep)
      for w in "${a[@]}"; do [[ "$w" =~ ^-[A-Za-z]*[rR][A-Za-z]*$ || "$w" == --recursive || "$w" == --dereference-recursive ]] && return 0; done ;;
    rg | ag | fd | fdfind)
      for w in "${a[@]}"; do [[ "$w" =~ ^-[A-Za-z]*u[A-Za-z]*$ || "$w" =~ ^--(no-ignore[a-z-]*|unrestricted|skip-vcs-ignores)$ ]] && return 0; done
      if [[ "$cmd" == fd || "$cmd" == fdfind ]]; then
        for w in "${a[@]}"; do [[ "$w" == -I ]] && return 0; done
      fi ;;
    cp | rsync)
      for w in "${a[@]}"; do [[ "$w" =~ ^-[A-Za-z]*[rRa][A-Za-z]*$ || "$w" == --recursive || "$w" == --archive ]] && return 0; done ;;
    zip)
      for w in "${a[@]}"; do [[ "$w" =~ ^-[A-Za-z]*r[A-Za-z]*$ || "$w" == --recurse-paths ]] && return 0; done ;;
  esac
  return 1
}

# Judge one simple command held in the words seg[].
check_segment() {
  local -a a=() cands=() ops=()
  local here=0 w
  for w in "${seg[@]}"; do
    if [ "$here" = 1 ]; then
      here=0
    elif [ "$w" = $'\x03' ]; then
      here=1
    else
      a+=("$w")
    fi
  done
  seg=()
  local inline=$'[^[:space:]\'"()`,;]*reference/[^[:space:]\'"()`,;]*|[\'"]reference[\'"]' code m
  local n=${#a[@]} k=0 wrapped=0 opt cmd i skip=0 pat=0 fexpr=0 explicit=0 grepish=0 fileish=0
  while [ "$k" -lt "$n" ]; do
    w="${a[k]}"
    if [[ "$w" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      k=$((k + 1))
    elif [[ "$w" =~ ^(sudo|env|command|exec|nohup|time|nice|xargs|builtin)$ ]]; then
      wrapped=1
      k=$((k + 1))
    elif [ "$wrapped" = 1 ] && [[ "$w" == -* ]]; then
      k=$((k + 1))
    else
      break
    fi
  done
  [ "$k" -lt "$n" ] || return 0
  cmd="${a[k]##*/}"
  a=("${a[@]:k}")
  n=${#a[@]}

  case "$cmd" in
    bash | sh | dash | zsh | ash)
      for ((i = 1; i < n - 1; i++)); do
        if [[ "${a[i]}" =~ ^-[A-Za-z]*c$ ]]; then
          scan_command "${a[i + 1]}" "$((depth + 1))"
          break
        fi
      done
      ;;
    eval) scan_command "${a[*]:1}" "$((depth + 1))" ;;
    python | python[0-9]* | node | nodejs | perl | ruby)
      for ((i = 1; i < n - 1; i++)); do
        if [[ "${a[i]}" =~ ^-[A-Za-z]*[ceE]$ || "${a[i]}" == --eval ]]; then
          code="${a[i + 1]}"
          while [[ "$code" =~ $inline ]]; do
            m="${BASH_REMATCH[0]}"
            cands+=("${m//[\'\"]/}")
            code="${code#*"$m"}"
          done
        fi
      done
      ;;
    grep | egrep | fgrep | zgrep | rg | ag | ack | fd | fdfind) grepish=1 ;;
    cd | pushd | ls | tree | du | find | cp | mv | rsync | tar | zip | 7z) fileish=1 ;;
  esac
  if [ "$grepish" = 1 ] && [[ "$cmd" != fd && "$cmd" != fdfind ]]; then
    for w in "${a[@]:1}"; do [[ "$w" =~ ^-[A-Za-z]*[ef]$ || "$w" == --regexp || "$w" == --file || "$w" == --files ]] && explicit=1; done
  fi

  [[ "${a[0]}" == */* ]] && cands+=("${a[0]}")
  for ((i = 1; i < n; i++)); do
    w="${a[i]}"
    if [ "$skip" = 1 ]; then
      skip=0
      continue
    fi
    [ -n "$w" ] || continue
    [[ "$w" == *[[:space:]]* ]] && continue
    if [[ "$w" == -* ]]; then
      if [[ "$w" == --*=* ]]; then
        opt="${w%%=*}"
        [[ "$opt" =~ ^--(exclude|exclude-dir|ignore[a-z-]*|include|regexp|pattern)$ ]] && continue
        w="${w#*=}"
        [ -n "$w" ] || continue
        [[ "$w" == */* ]] || continue
        cands+=("$w")
        continue
      fi
      if [[ "$w" =~ ^--(exclude|exclude-dir|ignore[a-z-]*|include|regexp|file)$ || "$w" =~ ^-(path|ipath|wholename|iwholename|name|iname|regex)$ ]]; then
        skip=1
      elif [ "$grepish" = 1 ] && [[ "$w" =~ ^-[A-Za-z]*[ef]$ ]]; then
        skip=1
      fi
      [ "$cmd" = find ] && fexpr=1
      continue
    fi
    if [ "$cmd" = find ] && [[ "$w" == '!' || "$w" == '(' ]]; then
      fexpr=1
      continue
    fi
    if [ "$grepish" = 1 ] && [ "$explicit" = 0 ] && [ "$pat" = 0 ]; then
      pat=1
      continue
    fi
    if [[ "$w" != */* && "${w,,}" == reference && "$fileish" = 0 && "$grepish" = 0 ]]; then
      continue
    fi
    cands+=("$w")
    [ "$fexpr" = 0 ] && ops+=("$w")
  done

  local -a res=() abs=()
  local c p r
  if [ "${#cands[@]}" -gt 0 ]; then
    for c in "${cands[@]}"; do
      [[ "$c" == "~" || "$c" == "~/"* ]] && c="$HOME${c#\~}"
      [[ "$c" == /* ]] || c="$vcwd/$c"
      abs+=("$c")
    done
    mapfile -d '' -t res < <(realpath -m -z -- "${abs[@]}")
    [ "${#res[@]}" = "${#abs[@]}" ] || warn "cannot resolve the paths in '$cmd'"
    for p in "${res[@]}"; do
      for r in "${roots[@]}"; do
        if under "$p" "$r"; then
          hit="$p"
          reason="Refused: the command reaches reference/ through '$hit', which holds copyrighted handbook material that agents must not read, quote or edit. Aircraft facts come from docs/aircraft/<id>-intake.md. The owner can set CPT_ALLOW_REFERENCE=1 to authorise this when authoring an intake."
          return 0
        fi
      done
    done
  fi

  if [ "${#live[@]}" -gt 0 ] && recurses "$cmd"; then
    local -a over=("${ops[@]}")
    case "$cmd" in cp | rsync) [ "${#over[@]}" -gt 0 ] && unset 'over[-1]' ;; esac
    if [ "${#ops[@]}" = 0 ]; then
      case "$cmd" in grep | egrep | fgrep | zgrep | rg | ag | ack | fd | fdfind | find) over=("$vcwd") ;; esac
    fi
    if [ "${#over[@]}" -gt 0 ] && ! excludes_reference "$cmd"; then
      abs=()
      for c in "${over[@]}"; do
        [[ "$c" == "~" || "$c" == "~/"* ]] && c="$HOME${c#\~}"
        [[ "$c" == /* ]] || c="$vcwd/$c"
        abs+=("$c")
      done
      mapfile -d '' -t res < <(realpath -m -z -- "${abs[@]}")
      [ "${#res[@]}" = "${#abs[@]}" ] || warn "cannot resolve the paths in '$cmd'"
      for p in "${res[@]}"; do
        for r in "${live[@]}"; do
          if under "$r" "$p"; then
            hit="$p"
            reason="Refused: '$cmd' searches or copies '$hit', which contains reference/ (copyrighted handbook material that agents must not read, quote or edit). Name a narrower path or exclude it, for example --exclude-dir=reference. The owner can set CPT_ALLOW_REFERENCE=1 to authorise this when authoring an intake."
            return 0
          fi
        done
      done
    fi
  fi

  if [[ "$cmd" == cd || "$cmd" == pushd ]] && [ "${#res[@]}" -gt 0 ]; then
    vcwd="${res[-1]}"
  fi
  return 0
}

depth=0
# Judge a command text: split it into simple commands and check each.
scan_command() {
  local text="$1" depth="$2" w
  [ "$depth" -le 3 ] || return 0
  local -a words=() seg=()
  mapfile -d '' -t words < <(jq -nj --arg c "$text" --arg home "$HOME" --arg pwd "$cwd" --arg proj "$proj" "$tokenizer")
  [ "${#words[@]}" -gt 0 ] && [ "${words[-1]}" = $'\x02' ] || warn "cannot tokenise the command"
  unset 'words[-1]'
  words+=($'\x01')
  for w in "${words[@]}"; do
    if [ "$w" = $'\x01' ]; then
      [ "${#seg[@]}" -gt 0 ] && check_segment
      [ -z "$hit" ] || return 0
    else
      seg+=("$w")
    fi
  done
}

scan_command "$cmdline" 0
[ -n "$hit" ] || exit 0
deny "$reason"
