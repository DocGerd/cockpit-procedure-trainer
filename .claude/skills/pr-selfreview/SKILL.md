---
name: pr-selfreview
description: Review a pull request - run a review, post one inline thread per finding, fix, reply, resolve every thread. Run by a separate reviewer agent, never the PR's implementer, whenever a PR is opened or updated.
---

# Review a PR

Argument: the PR number `N`. Repo: `DocGerd/cockpit-procedure-trainer`. The
reviewer must be an agent that can run `gh` and post comments; a read-only
agent type cannot post threads. Called by the `/release-cycle` command, and
followed by the `merge-train` skill.

1. **Review.** The base is `develop`. Get the diff with `gh pr diff N` and the
   head SHA with `gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N --jq .head.sha`.
   Run `pr-review-toolkit:review-pr` on that diff. Check that the PR adds a
   `changelog.d/<issue>.<category>.md` fragment and that its body has
   `Closes #<issue>`. Release PRs (`release/*`), backmerge PRs
   (`chore/backmerge`) and Dependabot PRs (`dependabot/*`) are exempt from both:
   the release PR deletes fragments, Dependabot PRs cannot add one, and none of
   them closes an issue. Accept a missing fragment on any other PR only if its
   body has `No changelog: <reason>` and the reason is valid: no user-visible
   effect (internal docs, plans, agent config, CI-only, tests-only).
2. **Post one inline thread per finding**, anchored to a changed line. A finding
   outside the diff becomes a PR-level comment through
   `gh api repos/DocGerd/cockpit-procedure-trainer/issues/N/comments --method POST --raw-field body=TEXT`.

       gh api repos/DocGerd/cockpit-procedure-trainer/pulls/N/comments --method POST \
         --raw-field body='Narrow on the kind instead of casting.' \
         --raw-field commit_id=SHA --raw-field path=packages/core/src/index.ts \
         --field line=42 --raw-field side=RIGHT

   A body that contains a single quote goes through `--input` with a JSON file
   written outside the repository.

3. **Fix** every finding, commit, push. Never skip hooks, never force-push.
   Run `git push` and `gh api` in separate shell calls.
4. **Reply and resolve** each thread through GraphQL. Pass every query inline
   as a literal; the main-merge guard hook denies GraphQL calls whose query
   comes from a file or a shell expansion. Enumerate:

       gh api graphql --raw-field query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line}}}}}' \
         --raw-field o=DocGerd --raw-field r=cockpit-procedure-trainer --field n=N

   Reply, then resolve:

       gh api graphql --raw-field query='mutation($id:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$id,body:$b}){comment{id}}}' \
         --raw-field id=THREAD_ID --raw-field b='Fixed in the latest commit.'
       gh api graphql --raw-field query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' \
         --raw-field id=THREAD_ID

Done when the enumerate query shows `isResolved: true` for every thread. A
review with no findings posts one PR comment saying so and has no threads.
Write any report to a scratch location outside the repository and return a
summary of at most 25 lines.
