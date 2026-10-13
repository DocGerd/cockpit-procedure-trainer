# GitHub without `gh`: the GitHub connector

The skills spell their GitHub calls as `gh`. In a session where `gh` is
missing or `gh auth status` fails (Claude Code cloud sessions), make the same
call through the GitHub connector's `mcp__github__*` tools instead; load them
with ToolSearch (`select:mcp__github__pull_request_read,...`). Every tool takes
`owner=DocGerd`, `repo=cockpit-procedure-trainer`. Decide once per session:
check `gh auth status` first and use `gh` whenever it works.

Plain `git` (fetch, push, `push origin --delete`) works in both cases.

## The guard hooks do not see connector calls

`.claude/hooks/block-main-merge.sh` matches Bash commands only. A connector
merge passes no tripwire, so these rules are the only guard:

- `mcp__github__merge_pull_request` only from the `merge-train` skill, step 5,
  on a PR whose `base.ref` you read as `develop` in step 1 of the same run.
  Always pass `expectedHeadSha` (the step 2 SHA) and `merge_method`
  (`squash`; `merge` only for `chore/backmerge`).
- Never merge a PR whose base is `main`, by any tool. Never call
  `mcp__github__enable_pr_auto_merge`.
- `mcp__github__update_pull_request` with `base` only to retarget a child to
  `develop` (merge-train step 7), never to `main`.

## Call map

| `gh` call in a skill                                                       | Connector call                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gh api …/pulls/N` (`base.ref`, `head.sha`, `head.ref`, `state`, `merged`) | `pull_request_read` `method=get`, `pullNumber=N`                                                                                                                                                                                                                 |
| `gh pr diff N`                                                             | `pull_request_read` `method=get_diff`                                                                                                                                                                                                                            |
| `gh pr view N --json state` (`MERGED`)                                     | `pull_request_read` `method=get`: `merged` is true                                                                                                                                                                                                               |
| `gh api …/git/ref/heads/<branch>` (tip SHA, or does it exist)              | `get_commit` `sha=<branch>`, `detail=none`: its `sha`; not found means no branch                                                                                                                                                                                 |
| `gh api …/commits/SHA/check-runs` (`check` job)                            | `pull_request_read` `method=get_check_runs` (the PR's head commit; compare its SHA first)                                                                                                                                                                        |
| `check` run of `develop`'s tip                                             | `actions_list` `method=list_workflow_runs`, `workflow_runs_filter.branch=develop`: the newest run's `head_sha` and `conclusion`                                                                                                                                  |
| `gh pr checks` poll                                                        | the `get_check_runs` call, polled the same way (30 s or less, bounded tries)                                                                                                                                                                                     |
| `gh api …/pulls --raw-field base=<ref> --raw-field state=open`             | `list_pull_requests` `base=<ref>`, `state=open`                                                                                                                                                                                                                  |
| `gh pr merge N --squash --match-head-commit SHA`                           | `merge_pull_request` `pullNumber=N`, `merge_method=squash`, `expectedHeadSha=SHA` (rules above)                                                                                                                                                                  |
| `--delete-branch`, or DELETE `…/git/refs/heads/<branch>`                   | `git push origin --delete <branch>`                                                                                                                                                                                                                              |
| POST `…/git/refs` (recreate a branch at a SHA)                             | `git push origin <sha>:refs/heads/<branch>` (fetch the SHA first)                                                                                                                                                                                                |
| PATCH `…/pulls/<n>` `base=develop` / `state=open` / `body`                 | `update_pull_request` `base` / `state` / `body`                                                                                                                                                                                                                  |
| PUT `…/pulls/M/update-branch`                                              | `update_pull_request_branch` `pullNumber=M`                                                                                                                                                                                                                      |
| `gh pr create …`                                                           | `create_pull_request` (`body` is the file's text)                                                                                                                                                                                                                |
| PR-level comment (POST `…/issues/N/comments`)                              | `add_issue_comment` `issue_number=N`                                                                                                                                                                                                                             |
| Inline thread (POST `…/pulls/N/comments`)                                  | `pull_request_review_write` `method=create`, `commitID=SHA` (no `event`: pending); one `add_comment_to_pending_review` per finding (`path`, `line`, `side=RIGHT`, `subjectType=LINE`); then `pull_request_review_write` `method=submit_pending`, `event=COMMENT` |
| GraphQL `reviewThreads` enumerate                                          | `pull_request_read` `method=get_review_comments`: each thread's `id` and `is_resolved`; page with `after`                                                                                                                                                        |
| GraphQL thread reply                                                       | `add_reply_to_pull_request_comment` `commentId=<n>`, the number after `#discussion_r` in the thread's first comment `html_url`                                                                                                                                   |
| GraphQL `resolveReviewThread`                                              | `resolve_review_thread` `threadId=<PRRT_… id>`                                                                                                                                                                                                                   |
| PATCH `…/issues/<n>` `state=closed`                                        | `issue_write` `method=update`, `state=closed`, `state_reason=completed`                                                                                                                                                                                          |
| Issue state (`Closes #n` closed?)                                          | `issue_read` `method=get`: `state`                                                                                                                                                                                                                               |
| `…/issues?milestone=<n>&state=open`, `milestone=none`                      | `list_issues` `state=OPEN` (every page; drop pull requests), then `issue_read` `method=get` on each: keep those whose `milestone` is the title, or is missing                                                                                                    |
| PATCH `…/issues/<n>` `{"milestone": null}`                                 | `issue_write` `method=update` cannot clear it: ask the owner                                                                                                                                                                                                     |

Text that a `gh` call would pass through `--body-file` or `--input` goes into
the tool's `body` argument directly; no quoting rules apply.
