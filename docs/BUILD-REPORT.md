# Build report

Crewboard was built by an AI coding agent (Claude Code) working from a written spec. This report records what that took: time, tokens and API-equivalent cost, measured from the agent's own logs.

It covers **iteration 1**, from the first prompt (2026-11-15 11:26:55 UTC) to the end of the iteration (17:14:57 UTC). Later iterations will be added below as separate entries, each with its own time range, tokens and cost, plus a running total. Raw data: [`metrics/timeline.json`](metrics/timeline.json), [`metrics/usage.json`](metrics/usage.json), [`metrics/pricing.json`](metrics/pricing.json).

## Iteration 1

### Summary

| Measure                                  | Value                                           |
| ---------------------------------------- | ----------------------------------------------- |
| Active time                              | **3 h 55 min**                                  |
| Wall-clock time, first prompt → end      | 5 h 48 min (11:26:55 → 17:14:57 UTC)            |
| Idle pause inside that window, no work   | 1 h 53 min (13:48:13 → 15:40:59)                |
| First live deployment, with a smoke test | 11:55:17 UTC, **28 min** after the first prompt |
| Total tokens                             | **112,711,420**                                 |
| API-equivalent cost                      | **US$39.07**                                    |

**Active time by phase.** Phases overlapped slightly: the first acceptance review ran while the repository was being created.

| Phase                                                                                                | Time                                                          | Tokens     | Output tokens | Cost   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- | ------------- | ------ |
| Build: plan, scaffold, mock API, UI, drag and drop, unit and e2e tests, local checks                 | 25 min (11:26:55 → 11:52:14)                                  | 16,038,062 | 196,035       | $7.85  |
| First deployment: repo, Pages, CI and deploy, live smoke test                                        | 3 min (11:52:14 → 11:55:17)                                   | 1,201,460  | 11,711        | $0.37  |
| Review and improve: 6 completed functional rounds (a 7th stopped), 3 design rounds, fixes, redeploys | 3 h 27 min active (5 h 20 min wall-clock including the pause) | 95,471,898 | 654,927       | $30.85 |

A working version was live in under half an hour. Most of the time and cost went into the review-and-fix rounds that followed.

**Tokens by type**

| Type               | Tokens          | Cost       |
| ------------------ | --------------- | ---------- |
| Input (uncached)   | 1,594           | $0.00      |
| Output             | 862,673         | $11.39     |
| Cache write, 5 min | 1,575,602       | $3.94      |
| Cache write, 1 h   | 755,765         | $6.05      |
| Cache read         | 109,515,786     | $17.69     |
| **Total**          | **112,711,420** | **$39.07** |

**By model**

| Model             | Role                                                                               | Messages | Output tokens | Cost   |
| ----------------- | ---------------------------------------------------------------------------------- | -------- | ------------- | ------ |
| Claude Opus 5.5   | Main session: plan, architecture, UI, integration, all fixes, final judgement      | 266      | 276,133       | $25.05 |
| Claude Sonnet 5.5 | 13 subagents: mock server and its tests, Playwright suite, the independent reviews | 505      | 586,540       | $14.02 |

The cost is what the same usage would cost at API list prices. It does not include any human time spent on scoping, writing the spec or reviewing the result.

### How the iteration ended

The iteration was closed by decision, not by a clean review round.

- Every acceptance item passed on the live site in the last completed full functional review (round 5: 34/34), and in rounds 2 and 3 as well.
- Round 5 found five issues (3 minor, 2 trivial). All five were fixed, each with a regression test, and deployed. CI, deploy and the live smoke test were green.
- Round 6 was stopped unfinished, so **no independent review has confirmed that the round 5 fixes leave zero functional issues.** Severity did not fall steadily: round 4 found a blocker after rounds 2 and 3 had found only minor and trivial issues. Round 5 then found only minor and trivial ones.

### What was built

Crewboard is a single-board Kanban app for a small team. It runs entirely in the browser and is deployed to GitHub Pages: https://vlvereta.github.io/team-task-board/

- **Auth:** sign-up, login and logout against a typed REST client over a mock server. The mock persists to `localStorage`, hashes passwords (PBKDF2 via Web Crypto) and issues JWT-shaped, expiring tokens. The README says plainly that this is simulated and not real security.
- **Board:** three columns with counts, a rename-in-place board name, empty, loading and error states, and the "My tasks" filter kept in the URL.
- **Tasks:**
  - Create from any column, edit, and delete with confirmation.
  - Each task has a deep link.
  - Dialogs ask before discarding unsaved changes.
  - Saving over an edit made in another tab returns a conflict (409).
- **Drag and drop:** works with mouse, touch and keyboard, across columns and within one. Moves are optimistic, roll back with a visible message when the save fails, and are sent to the server in order.
- **Settings:** display name, board name, and "Reset demo data".
- **Quality:**
  - Responsive from 320 px, rem-based so it holds at 200% text, 44 px touch targets.
  - Keyboard access with visible focus, focus-trapped dialogs, reduced-motion support.
  - No console output in normal use.
- **Tests:** 138 unit and component tests (Vitest). 97 end-to-end tests (Playwright) run against the production build; they include layout checks at 320, 768 and 1440 px and at 200% text, plus regression tests for the functional bugs found in review (the few exceptions are noted in the review log).
- **CI and deployment:** CI on pull requests and pushes to `main`, and a Pages deploy gated on the same checks, so a merge to `main` updates the live site.

**Acceptance checklist:** 34/34 PASS on the live site in the last completed functional review (round 5).

### Review rounds

All reviewers were fresh subagents that had not seen the implementation. They got only the spec and the running app; the round 0 reviewer used a local production build. The full log is in [`REVIEW.md`](REVIEW.md).

| Round                                      | Found                                                                                                                                                                | Outcome                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0 (local acceptance)                       | 31 pass, 1 fail (touch targets), 2 partial (large-text layout, keyboard column moves)                                                                                | Fixed; one screen-reader nit left as is                         |
| 1 functional / design                      | 4 functional (minor, trivial); 15 design (7 should-fix)                                                                                                              | Functional fixed. Objective design fixed; taste items left open |
| 2 functional / design                      | 5 functional (Back skipped the discard prompt, edit conflicts, reload loss, …); 1 design blocker (login layout collapse at 320 px + 200%) and 7 smaller design items | All fixed; taste items left open                                |
| 3 functional / design (final design round) | 4 functional (history and focus edge cases); 5 objective design nits                                                                                                 | All fixed; taste items left open                                |
| 4 functional                               | **1 blocker:** slow cross-column drags crashed the app (React "maximum update depth"); 2 minor, 3 trivial                                                            | All fixed; slow-drag regression tests added                     |
| 5 functional                               | 3 minor, 2 trivial (hand-edited URLs, blocked storage, double-click, drop below a short column, focus)                                                               | All fixed                                                       |
| 6 functional                               | Stopped unfinished                                                                                                                                                   | Not completed                                                   |

The agents fixed every design defect that could be judged objectively. Matters of taste were left open, for example header height at 200% text, toast position over dialogs on phones, and the empty area to the right of the columns on wide screens.

### Decisions, deviations and known limits

Full log: [`DECISIONS.md`](DECISIONS.md). The main ones:

- **Additions to the spec** (smallest versions, each logged):
  - The create-task dialog.
  - A per-task deep-link route.
  - Optimistic concurrency (`expectedUpdatedAt`, 409) on task edits.
  - A failure-injection switch (`?failMoves=1`) to demonstrate rollback.
  - An in-memory fallback when the browser blocks storage.
- **Deviations:**
  - "My tasks" filters on the client from the full task list. `GET /tasks?assignee=me` is implemented and tested but not used by the board, because drag and drop needs full column order.
  - The board uses React Router's data router (`createHashRouter`) for navigation blocking.
- **Known limits:**
  - Pressing browser Back with unsaved dialog edits, onto an entry typed into the address bar by hand, cannot be intercepted with hash routing (H1 and M3 in the review log).
  - A malformed task id in a hand-typed URL logs React Router's own decode warning.
  - Touch drag was tested with emulated touch only, not on a physical device.
  - End-to-end tests run in Chromium only.
  - `npm audit` reports moderate advisories in dev-only lint dependencies (typescript-eslint). They do not ship in the build.

### Method

- **Time** comes from [`metrics/timeline.json`](metrics/timeline.json). The agent appended a UTC timestamp at the start and end of each phase and around each subagent delegation (13 delegations: purpose, model, start, end), and recorded the idle pause. "Active time" is wall-clock time minus that pause.
- **Tokens** come from Claude Code's local session logs (`~/.claude/projects/<project>/`), aggregated by [`scripts/usage-report.mjs`](../scripts/usage-report.mjs). The script was written after inspecting the real files.
  - Each API response can be logged as several lines (one per content block) that repeat the same `message.id` and usage, so usage is counted once per `message.id`. 771 unique assistant messages in range.
  - Subagent activity is in separate files (`<session>/subagents/agent-*.jsonl`, `isSidechain: true`), and the script reads them recursively: 505 of the 771 messages.
  - This was verified by running the report while only subagents were using Sonnet: Sonnet usage appeared only from those files. The per-agent sums also matched the size of each subagent's transcript.
  - The window starts at the first prompt and ends when the iteration was closed. Messages are assigned to phases by timestamp.
- **Prices** are Anthropic's API list prices, fetched on 2026-11-15 from https://platform.claude.com/docs/en/about-claude/pricing and saved in [`metrics/pricing.json`](metrics/pricing.json). They use global routing (the logs record `inference_geo: "global"`) and cost the 5-minute and 1-hour cache writes at their separate rates.
- **Not included:**
  - Tokens spent after this report was generated: the final commits and the closing summary.
  - Preparation of the spec and build instructions, which happened before the first prompt.

  `npm run usage-report` recomputes `docs/metrics/usage.json` for an iteration's time range on the machine that holds the logs.

## Running total

| Iterations  | Active time | Tokens      | API-equivalent cost |
| ----------- | ----------- | ----------- | ------------------- |
| iteration-1 | 3 h 55 min  | 112,711,420 | US$39.07            |
