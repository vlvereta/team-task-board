# Decisions

One line of reasoning per decision. Newest at the bottom.

| #   | Decision                                                                                                             | Reason                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Installed Node.js (v26.13.1) with Homebrew during preflight.                                                         | Node was not on the machine and the build cannot proceed without it; CI pins Node 24 LTS.                                  |
| 2   | Product name **Crewboard**.                                                                                          | Short, neutral, describes a board for a small crew, not a well-known product.                                              |
| 3   | Palette: deep teal board, slate column panels, white cards, amber focus ring.                                        | One strong board colour that is clearly not Trello's blue; teal-on-white and slate text pass WCAG AA.                      |
| 4   | Task dialog is a route (`#/board/tasks/:id`).                                                                        | Gives deep links to a task that survive a hard refresh with hash routing.                                                  |
| 5   | Settings is a page (`#/settings`), not a modal.                                                                      | Simpler focus handling and a natural deep link; the spec only asks for "minimal" settings.                                 |
| 6   | No state-management library; React context + a `useBoardData` hook.                                                  | Three resources and one board do not need more.                                                                            |
| 7   | Positions are dense integers (0..n-1) per column, re-numbered by the server on every move/create/delete.             | Simple, deterministic, easy to test; the data set is tiny.                                                                 |
| 8   | Mock latency is set by `VITE_MOCK_LATENCY` ("min,max" ms); unit tests pass 0 directly.                               | Keeps the demo's loading states real while letting tests run fast.                                                         |
| 9   | A failure-injection hook (`?failMoves=1` in the URL, read only by the mock server) to test move rollback end to end. | The spec requires a visible rollback; without a real network there is no other way to force a failing move in the browser. |
| 10  | No global git identity existed; set a repo-local one: the GitHub profile name and the `users.noreply.github.com` address. | Keeps the owner's email out of public commit metadata while attributing commits to the GitHub account. |
| 11  | Create a task through a dialog opened by each column's "Add a card" button, not an inline composer. | The spec asks for title, description and assignee at creation; a dialog fits all three accessibly and reuses the edit form. |
| 12  | "My tasks" filters client-side from the full task list; `GET /tasks?assignee=me` is implemented and tested in the API but not used by the board. | Drag and drop needs the full column order to compute positions while filtered; one list keeps both views consistent. |
| 13  | Task mutations are queued and sent one at a time. | The mock's random latency could otherwise apply two quick moves in the wrong order. |
| 14  | System UI font stack as the one typeface family. | No external font requests, fast first paint, native look on each platform. |
| 15  | `deploy.yml` reuses `ci.yml` (`workflow_call`) as its first job. | Deploys only happen after the same checks pass, with one definition of those checks. |
| 16  | Token cost uses API list prices for global routing fetched on the day; Haiku at the ≤100k-token tier. | Matches what the logs record (`inference_geo: global`); see `docs/metrics/pricing.json`. |
