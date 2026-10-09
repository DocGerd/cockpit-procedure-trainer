## Triage phase - no milestone to run

Delegate it; the main session keeps only the proposal. Create and change
nothing before the owner approves.

1. One agent sweeps every open issue without a milestone
   (`gh api --paginate "repos/DocGerd/cockpit-procedure-trainer/issues?state=open&milestone=none&per_page=100"`;
   drop pull requests), reading body, labels, recent comments and linked open
   PRs. It writes its table to the scratchpad and returns a summary.
2. Classify each issue: ready; needs owner decision (label `question`, a
   change to the spec's decisions table, unclear copyright); blocked (label
   or open dependency); spike or idea needing scoping; stale or done (verify
   against `origin/develop` and open PRs; propose closing with the reason);
   duplicate (name the original).
3. Rank the ready issues: `docs/adr/0002-quality-priorities.md` order (gates
   first, never traded), then dependencies, then the steering text if given.
   No ready issue: stop after presenting the table; create nothing and do not
   go to Phase 4.
4. Propose ONE coherent milestone: title `M<n> <Theme>` with n one above the
   highest milestone, open or closed; each issue with a one-line reason;
   deferred issues with the reason (they stay unchanged); owner questions that
   block anything.
5. Present it as one scannable block and ask once with AskUserQuestion:
   approve, adjust, or an alternative theme. This is the owner's scope choice
   and the one approval stop.
6. On approval, one unchained REST call each, bodies from files: POST
   `milestones`; PATCH `issues/<n>` with the milestone; PATCH `issues/<n>`
   with `state=closed` and `state_reason` `completed` or `not_planned` (only
   approved closes); label changes. On a partial failure stop and report what
   was applied. Then continue with Phase 0. Without approval, stop with
   nothing changed.
