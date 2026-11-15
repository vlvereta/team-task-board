# Review log

## Round 0: independent acceptance review (local production build)

- **Date:** 2026-11-15
- **Reviewer:** independent agent. Inputs were `SPEC.md` and the running app only. No source, tests or git history were read.
- **Environment:** production build served at `http://localhost:4180/team-task-board/`. Playwright 1.x with headless Chromium on macOS. Every scenario used a fresh browser context, so localStorage started empty. Touch was checked with the Pixel 7 and iPhone 13 device profiles plus raw CDP touch events. Console errors and warnings were captured on every page (none appeared in any run).
- **Method notes:** `tsc` and ESLint were run only for their exit codes. Evidence screenshots and scripts are in the session scratchpad `review/` folder.

| # | Acceptance item (short) | Result | Evidence |
|---|---|---|---|
| 1 | Sign up: name, email, password; validation; duplicate email rejected | PASS | Empty submit shows "Enter your name." / "Enter your email address." / "Enter a password." `notanemail` gives "Enter a valid email address, like name@example.com." A 3-character password gives "Use at least 8 characters." `ana@crewboard.demo` and `ANA@Crewboard.demo` both give "An account with this email already exists. Sign in instead?" A valid sign-up lands on `#/board`. |
| 2 | Log in; wrong credentials show one generic error | PASS | Wrong password for a real email and an unknown email both show the identical "Incorrect email or password." |
| 3 | Session survives reload; log out clears it | PASS | Reload on `#/board` stays signed in. Log out goes to `#/login`, the token is removed, and a reload plus a visit to `#/board` still end on login. A malformed token (`aaa.bbb.ccc`) returns to login with "Your session has ended. Please sign in again." A genuinely expired token could not be forged without the signing secret, so I did not verify it directly. |
| 4 | Board routes redirect to login when signed out | PASS | `#/board`, `#/settings` and an unknown route all redirect to `#/login` when signed out. |
| 5 | Login page lists seeded demo accounts, one-click sign-in | PASS | Five accounts (Ana, Ben, Chloé, Dev, Emma) with role and email, and the shared password is stated. One click signs in; each card has an aria-label such as "Sign in as Ana Silva, Project lead". |
| 6 | Three columns To Do / In Progress / Done, each with a task count | PASS | Headers show "To Do 5", "In Progress 4", "Done 3". Counts update after create, delete, move and filter. |
| 7 | Board name in header and renamable | PASS | Click the name, edit inline, Enter. The header updates and survives reload. A blank name is rejected with "The board name cannot be empty." Escape cancels. The name can also be changed in Settings. |
| 8 | Empty columns show a helpful empty state | PASS | An empty Done column shows "Nothing finished yet / Finished cards land here." A filtered empty column shows "None of your tasks here / Turn off "My tasks" to see everyone's cards." |
| 9 | Loading and error states for the initial fetch | PASS | A "Loading board…" state is visible after reload. To force a fetch error I made `localStorage.getItem` throw partway through the load. The board area then showed "We couldn't load the board / Something went wrong. Please try again." with a "Try again" button. I did not click that button. A corrupted store returns to login with a message instead of crashing. |
| 10 | Create a task from any column with title (required), description, assignee | PASS | "Add a card" in each column opens "New task in <column>" with that column's status preselected. An empty title shows "Give the task a title." Title, multi-paragraph description and assignee were saved, and the card appears in the right column with the right count. |
| 11 | Open a task to view and edit title, description, assignee, status | PASS | Clicking or pressing Enter on a card opens "Edit task". All four fields were changed and saved. The card moved column, and values persisted after reload. |
| 12 | Delete a task with a confirmation step | PASS | Delete opens "Delete this task?" naming the task, with Cancel focused. Escape closes only the confirm. "Delete task" removes the card, the count drops, and it stays gone after reload. |
| 13 | Assignee from registered users or unassigned; cards show initials avatar | PASS | The picker lists Unassigned plus all users with "(you)" on the current user. Cards show initials avatars with an accessible name, and unassigned cards show the text "Unassigned". |
| 14 | New accounts appear in the assignee picker | PASS | A newly registered "Test User" appeared in the picker as "Test User (you)". |
| 15 | Drag to another column; status saved via API; survives reload | PASS | Mouse (down, stepped move, up) moved a card To Do to In Progress. It stayed after a reload 1.2 s later. A drop onto the empty area below the cards, and onto an empty column (filtered view), also persisted. |
| 16 | Reorder within a column; order survives reload | PASS | Mouse reorder in Done persisted after reload. A keyboard reorder persisted too. |
| 17 | Optimistic update; rollback with visible message on API failure | PASS | With `?failMoves=1`, the card sat in the target column for about 300 ms, then returned to its origin. A red toast read "Couldn't move "Create the component library". It has been put back. (Simulated server failure.)" and auto-dismissed. The original order was still there after reload. The same happened with the keyboard. See defect 3 for a stale screen-reader announcement. |
| 18 | Drag works with mouse, touch and keyboard | PARTIAL | Mouse: PASS. Touch (CDP touch events on a Pixel 7 profile): a quick swipe does not drag, while press-and-hold (600 ms) then move reorders within a column and moves across columns, and both persist after reload. This is synthetic touch only; no real device was available. Keyboard: Space picks up, arrows move, Space drops and Escape cancels, all with live announcements, and a cross-column move persisted. However, the first arrow press in a new direction does not move the card to the next column (it only changes position in the current one), and the announcements can be wrong. See defect 3. |
| 19 | "My tasks" toggle shows only my tasks; counts reflect the filter | PASS | As Ana, counts became To Do 1 / In Progress 0 / Done 1 ("2 of 12"). As Emma they were 0 / 1 / 1. The toggle has `aria-pressed`. |
| 20 | Filter state visible and easy to clear | PASS | The button is highlighted. A banner reads "Showing only tasks assigned to you (2 of 12)." with a "Show all tasks" button. Clicking either the banner button or the toggle restores 5/4/3. The filter persists across reload. |
| 21 | Edit own display name | PASS | In Settings the name saves with "Display name updated." The header and avatar initials update. A blank name shows "Display name cannot be empty." |
| 22 | Rename the board | PASS | The Settings "Board name" field saves, and the header updates. |
| 23 | "Reset demo data" restores seed after confirmation | PASS | A confirm dialog appears, and Cancel changes nothing. Confirming restores board name "Website relaunch", the original names, and the original tasks, and a "Demo data re…" status message appears. |
| 24 | Five seeded users with obvious demo credentials | PASS | Five users, password `demo1234` shown on the login page. |
| 25 | One project, ~10-12 realistic tasks across columns, several assignees, 1-2 unassigned | PASS | "Website relaunch" has 12 tasks (5/4/3) across 5 assignees. Two are unassigned ("Plan the launch announcement", "Run an accessibility review"). The tasks are realistic. |
| 26 | Seed on first visit only; user changes never overwritten unless reset | PASS | Edits, deletes and moves survived reloads and a second tab in the same context. The seed returned only after Reset. |
| 27 | Responsive 320 px to large desktop, portrait and landscape; columns scroll with snap; dialogs full-screen on narrow | PASS | I checked 1920x1080, 1280x800, 1024x768, 768x1024, 1024x600, 412x839, 390x844, 844x390, 667x375, 360x640, 320x568, 568x320 and 320x256 on board, settings and task dialog. `documentElement.scrollWidth` never exceeded `innerWidth`. On phones the column strip scrolls horizontally with `scroll-snap-type: x mandatory`. At 568 px width and below the dialog fills the viewport; on wider landscape it is a centred card whose overlay scrolls vertically, and Save stays reachable. |
| 28 | Touch targets at least 44 px on touch devices | FAIL | iPhone 13 and Pixel 7 profiles, every screen audited. Fails: the header logo link is 32x32; the icon-only "Settings" link is 40x44; the inline links "Create an account" (login) and "Sign in" (signup) are about 17 px tall. All buttons, inputs, selects, cards and dialog controls are at least 44 px. |
| 29 | Scales with font size: rem-based; usable at 200% default font and 400% zoom | PARTIAL | With `html{font-size:200%}` every text node doubled (11, 14 and 16 px base became 22, 28 and 32 px) and nothing overflowed horizontally at 1280, 768, 412, 320x568 or 320x256. At 320x256 with the normal font (400% zoom approximation) the header is about 115 px and the board is usable. At 412 wide and above, and at 768, 200% is usable. Problem: at 320x568 with 200% font the non-sticky header is 497 px tall, the page does not scroll, and only about 70 px is left for the board, which makes the board practically unusable (defect 2). I could not inspect CSS units directly, so the "never fixed px" claim was verified only through behaviour. |
| 30 | Long titles, unbroken words, long names, multi-paragraph descriptions handled | PASS | Tested a 140-character title, a 204-character unbroken word as title, an 8-paragraph description with an unbroken word, a 70-character display name and a long board name. Card titles wrap or clamp with an ellipsis, the header name and user name truncate with an ellipsis, and the dialog scrolls with a vertically resizable textarea. There was no horizontal overflow or broken layout at 320 px to 1920 px. |
| 31 | Respects `prefers-reduced-motion` | PASS | With `reducedMotion: 'no-preference'`, the dialog runs `fade-in` 120 ms and `dialog-in` 160 ms, the drag overlay is tilted, and the drop animates 250 ms. With `reduce`, no animations run, durations are 1e-5 s, and the drag tilt is gone. |
| 32 | Keyboard reachable, visible focus, labelled controls, dialogs trap focus and close on Escape | PASS | Tab order on login, board and dialogs is logical. Every focused control shows a 3 px solid outline (teal, amber, white or red depending on the surface). The Tab and Shift+Tab cycle stays inside the dialog (`aria-modal`, labelled). Escape closes task, create and confirm dialogs (confirm closes alone) and focus returns to the opener. A scan found no unlabelled inputs, selects, buttons or links on board or settings. Minor: initial dialog focus goes to the close button rather than the first field. |
| 33 | No console errors or warnings in normal use | PASS | Across all scripts (auth, CRUD, drag with mouse/touch/keyboard, settings, reset, narrow viewports, reduced motion) no console errors, warnings or page errors were captured. The simulated move failure also logged none. |
| 34 | Production build has no TypeScript or lint errors | PASS | `npm run typecheck` exits 0. `npm run lint` (`eslint . --max-warnings=0`) exits 0. I did not rebuild; the check was against the working tree. `prettier --check` is not part of the criterion but reports 4 files (see observations). |

**Totals:** 34 rows: 31 PASS, 1 FAIL, 2 PARTIAL.

### Section 4 design checks (objective)

- **Name and identity:** "Crewboard", with its own three-bar logo (two white bars plus an amber bar, no square). There is no Trello name, wordmark or blue anywhere. The board colour is a dark teal.
- **Layout:** full-height coloured board, three fixed-width neutral columns with header and count, white compact cards, an "Add a card" action at the foot of each column, and a centred dialog for task details. Light theme only.
- **Typeface:** one sans family, consistent spacing, restrained shadows.
- **Contrast:** I computed WCAG contrast ratios for every text element on login, signup (with errors), board, task dialog and settings. All meet AA. The lowest measured values were 4.75:1 for "Back to board" and "Unassigned" (12 px), 5.18:1 for avatar initials and 5.47:1 for the primary buttons.

## Failures and defects

1. **Touch targets below 44 px (FAIL for item 28).** Severity: minor.
   Repro: use an iPhone 13 or Pixel 7 profile, open `#/board` and measure the header logo link (32x32) and the icon-only Settings link (40 px wide). Open `#/login` and `#/signup` and measure the inline "Create an account" and "Sign in" links (about 17 px tall).

2. **Board almost unusable at 320 px wide with a 200% default font (PARTIAL for item 29).** Severity: major.
   Repro: viewport 320x568, inject `html{font-size:200%}`, sign in. The header wraps into a non-sticky block of 497 px, the document does not scroll (`scrollHeight == innerHeight`), and the board gets about 70 px of height, so cards and "Add a card" cannot be reached comfortably. At 412 and 768 px wide it is fine. Suggested direction: collapse header controls (menu or smaller header at narrow widths and large text) or let the page scroll.

3. **Keyboard drag glitches (PARTIAL for item 18).** Severity: minor.
   Repro A: focus a card, Space, then ArrowRight once. The announcement is "over To Do, position 1 of 5" (still in the source column), so cross-column moves need two presses.
   Repro B: sign in as Emma, turn on "My tasks", pick up "Write the new About page copy", press ArrowLeft. The announcements read "position 2 of 1", and the drop reads "Dropped ... in To Do, position 2 of 1". The result is correct, but the announced position is impossible.
   Repro C: with `?failMoves=1`, after a failed move the live region still says "Dropped ... in In Progress, position 1 of 5." The rollback toast does carry the correction.

## Other observations (not acceptance failures)

- `document.title` is always "Crewboard" on every route.
- The board page has two `h1` elements (logo or board name plus another); consider one per page.
- Opening a task puts focus on the Close button rather than the Title field.
- A blank board-name rename closes the inline editor and shows the error only as a live-region alert, so a sighted user may miss it. The alert text also lingers after Escape.
- On a phone, "Settings" is icon-only (aria-label "Settings") and the avatar plus "Log out" sit on a second header row. It works but looks cramped at 320 px, and the long board name truncates with no tooltip.
- Landscape phone (844x390): the dialog is a centred card taller than the viewport, so the overlay scrolls and the Save and Delete row is below the fold until you scroll. A full-height sheet would be easier.
- Delete shows one toast per deletion and the toasts stack without a cap.
- `prettier --check` flags 4 files, including `docs/metrics/usage.json` and `scripts/usage-report.mjs`. This is not covered by the spec criterion.
- Not verified: real touch hardware (only synthetic CDP touch), genuine token expiry, and the "Try again" button on the load-error screen.
- The "Try demo account" list and the password hint make the demo trivially usable, as intended.

### Round 0: fixes (main session)

| Finding | Fix | Regression test |
|---|---|---|
| FAIL: touch targets under 44 px (logo link 32 px, icon-only Settings 40 px wide, inline "Create an account" / "Sign in" links ~17 px tall). | Logo link, Settings and Log out get `min-h/min-w` of the touch size (44 px on coarse pointers); auth links are now 44 px tall inline-flex targets. | `e2e/layout-regression.spec.ts`: touch-target sizes on a touch device profile. |
| PARTIAL (major): at 320 px with 200% text the header took 497 px and the page could not scroll, leaving ~70 px of board. | Below the `lg` breakpoint the app shell is no longer fixed to the viewport height: the page scrolls vertically and columns grow with their cards (the fixed-height board with per-column scrolling remains on large screens). The header is denser on phones (icon-only Settings and Log out with accessible names, avatar hidden, smaller board title). | `e2e/layout-regression.spec.ts`: board reachable by scrolling at 320 px / 200%, no horizontal overflow. |
| PARTIAL (minor): keyboard ArrowRight sometimes needed two presses to change column; announcements could say "position 2 of 1". | Custom keyboard coordinate getter: Left/Right jump straight to the neighbouring column; Up/Down keep the standard sortable behaviour. Announcement positions are computed from the live drag order and clamped to the total. | `e2e/dnd.spec.ts`: one ArrowRight reaches In Progress and the announced position ≤ total (5 repeats, no flakes). |
| Not verified by the reviewer: real touch hardware, a genuinely expired token, the load-error "Try again" button. | Expiry is covered by unit tests (`src/mock/auth.test.ts`, injected clock) and the 401 → login path by the client. Touch hardware is listed in `docs/UI-REVIEW-CHECKLIST.md` for the owner. | — |

The screen-reader message after a rolled-back move still says "Dropped …" first; the error toast (`role="alert"`) then announces that the move failed and the card is back. Left as is.

## Round 1: live site (https://vlvereta.github.io/team-task-board/)

Two fresh reviewers, neither of whom had seen the implementation: a functional reviewer (spec + live URL, real browser) and a design reviewer (screenshots of every screen and state at 320 / 768 / 1440 px and at 200% text).

### Functional review

Acceptance: **33 PASS, 0 FAIL, 1 not verifiable from the browser** ("production build has no TypeScript or lint errors"; covered by CI, which runs `npm run lint` and `npm run typecheck` on every push). No console errors, warnings or page errors in any run. Break-it session: fast repeated drags, reload mid-save, double submits on every form, back/forward, expired/forged/garbage tokens, cleared storage, corrupted store, two tabs, phone portrait and landscape, 200% text and 400% zoom all ended in a consistent state.

| # | Severity | Issue | Fix | Regression test |
|---|---|---|---|---|
| F1 | minor | Editing a task that another tab deleted showed "Task not found." but the stale card stayed on the board until reload. | A 404 on update removes the task locally and resyncs; the dialog then shows "Task not found". Deleting an already-deleted task now simply succeeds. | `e2e/review-regressions.spec.ts` (two tabs) |
| F2 | minor | Closing the task dialog (X, Esc, backdrop, Cancel) silently discarded unsaved edits. | Both the edit and the create dialog ask "Discard unsaved changes?" (Keep editing / Discard changes) when something was changed. | `e2e/review-regressions.spec.ts` (edit, create, and unchanged → no prompt) |
| F3 | trivial | Title (200) and description (5000) limits truncated input with no message. | A character count appears near the limit and says when it is reached (linked to the field with `aria-describedby`). | `e2e/review-regressions.spec.ts` |
| F4 | trivial | Edit dialog title box was two rows tall, so long titles looked clipped at 200% / 320 px. | The title field grows with its content (`field-sizing: content`, capped at 12rem, resizable elsewhere). | Covered by the layout screenshots |

### Design review

No blockers. Objective defects fixed; taste items listed for the owner in `docs/UI-REVIEW-CHECKLIST.md`.

| # | Rating | Finding | Outcome |
|---|---|---|---|
| D1 | should-fix | On phones / at 200% the toast covered the dialog's Cancel/Save buttons. | Fixed: toasts sit at the top on small screens, bottom on larger ones; one at a time. |
| D2 | should-fix | At 320 px + 200% text the header is ~405 px tall; at 320 px it is two rows. | Partly fixed in round 0 (page scrolls, denser header). At double text size every control is twice as tall, so the remaining height is inherent; **left for the owner** (a collapsed menu is a design choice). |
| D3 | should-fix | Edit dialog title fixed at two rows. | Fixed (grows with content). |
| D4 | should-fix | Card focus ring clipped at the top; teal vs amber rings inconsistent. | Clipping fixed (list padding). Ring colour kept deliberately: amber on the dark header, dark teal on light surfaces (both ≥ 3:1 against their background); **owner may overrule**. |
| D5 | should-fix | "My tasks" banner was a loud 52 px yellow bar. | Fixed: quieter amber-100 strip with the same information and the clear button. |
| D7 | should-fix | Toast text off-centre, no success icon, old toasts stacked. | Fixed: centred, success icon, a new message replaces older non-error ones. |
| D10 | should-fix | Demo accounts below the fold on the login page; "Sign in" repeated six times; dangling period; emails truncated at 320 px. | Fixed: demo panel beside the form on wide screens and first on phones, arrow icons instead of repeated "Sign in", copy tidied, emails wrap. |
| D6 | nice-to-have | Inactive "My tasks" looked selected (same fill as active nav). | Fixed: outlined when off, amber when on. |
| D8 | nice-to-have | No target-column highlight while dragging. | Fixed: the column under the dragged card gets an amber ring. |
| D9 | nice-to-have | Session check showed a bare spinner. | Fixed: "Loading Crewboard…" with `role="status"`. |
| D12 | nice-to-have | Disabled Save buttons washed out (~2.6:1). | Fixed: solid slate disabled style. |
| D13 | nice-to-have | Logo (vertical bars in a rounded square) conceptually close to a well-known mark. | Fixed: new mark, three horizontal cards in a circle. |
| D11 | nice-to-have | ~37% empty teal to the right of the columns at 1440 px. | Taste; **left for the owner** (fixed-width columns are the Kanban convention the spec asks for). |
| D14 | nice-to-have | Confirmations stack over the still-visible edit dialog. | Kept: the context of what is being deleted stays visible; **left for the owner**. |
| D15 | nice-to-have | "Unassigned" text 4.76:1, a narrow AA pass. | No change needed (passes AA). |
