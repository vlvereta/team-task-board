# UI review checklist (for the owner)

Work through this by hand on the live site (https://vlvereta.github.io/team-task-board/) or against the screenshots. Each item is a yes/no question. Screenshots are in [`docs/screenshots/checklist/`](screenshots/checklist/) (regenerate with `SCREENSHOTS=1 npx playwright test checklist-screenshots --project desktop`); the automated layout checks also save screenshots to [`docs/screenshots/review/`](screenshots/review/).

"200%" means the browser's default font size set to 200% (Chrome: Settings → Appearance → Font size → Very large, or a custom 32 px).

## Needs your eye (reviewer unsure, or left unfixed as a matter of taste)

These come from the three design review rounds in [`REVIEW.md`](REVIEW.md). Each one was a judgement call the agents did not make for you.

1. **Needs your eye**: Header at 320 px and 200% text is about 400 px tall, with controls on three rows (D2). Is that acceptable now that the page scrolls to the board, or would you prefer a collapsed menu? (`board-phone-200pct.png`)
2. **Needs your eye**: At 1440 px and 200% text the header takes two rows, with the second row right-aligned (N7). Fine? (`board-desktop-200pct.png`)
3. **Needs your eye**: On phones a confirmation toast appears at the top and can sit over the title of a dialog or confirmation sheet for up to 5 seconds (N2). Would you rather toasts were dismissed when a dialog opens, or shown at the bottom? (`toast-and-long-title-card.png`; try it on a phone)
4. **Needs your eye**: Drag and drop on a real touch phone: press and hold a card for about a quarter of a second, then drag to another column. Does it feel natural, and does the strip scroll when you hold the card near the screen edge (N8)? Automated tests used emulated touch only.
5. **Needs your eye**: At 1440 px about a third of the board is empty teal to the right of the three columns (D11). Keep the fixed-width, left-aligned columns (the familiar Kanban layout), or centre / widen them? (`board-desktop.png`)
6. **Needs your eye**: Delete and discard confirmations open over the still-visible task dialog (D14). Is the stacking clear, or should the task dialog hide? (`delete-confirm.png`, `discard-confirm.png`)
7. **Needs your eye**: On phones the confirmation sheets are full-screen, with the buttons at the bottom and a large empty middle. Would a smaller bottom sheet suit better? (try "Delete" on a phone)
8. **Needs your eye**: Focus rings use amber on the dark header and dark teal on light surfaces (D4). Both pass 3:1, but they differ. Is the card focus ring visible enough against the column? (`card-focus.png`, `header-focus.png`)
9. **Needs your eye**: The new logo (three horizontal cards in a circle, the last one amber). Does it read as "tasks moving across a board", or as a menu icon at small sizes (D13)? (`board-desktop.png`, browser tab icon)
10. **Needs your eye**: At 320 px the header hides your name and avatar to save space, so the signed-in user is not visible on the board. Acceptable? (`board-phone.png`)
11. **Needs your eye**: At 320 px and 200% text a card's text gets about 150 px, so long words such as "announcement" still break mid-word. Acceptable at that extreme size? (`board-phone-200pct.png`)
12. **Needs your eye**: When "Add a card" wraps onto two lines at 200% text, the label is centred next to the plus icon rather than left-aligned. (`board-phone-200pct.png`)
13. **Needs your eye**: The drag preview is tilted slightly and offset from the pointer. Do you like the tilt? (`drag-in-progress.png`)
14. **Needs your eye**: At 768 px the sign-in card and the demo-accounts card have different heights. Fine, or should they match? (`login-tablet.png`)
15. **Needs your eye**: The session-check screen ("Loading Crewboard…") is only visible for a moment after a reload. The reviewers could not capture it. Reload the board and look.
16. **Needs your eye**: The edit-conflict message (two tabs editing the same task) is long, about ten lines at 320 px and 200%. Is the wording right? (`edit-conflict.png`)
17. **Needs your eye**: The cards in a column scroll inside the column on large screens, with no visible hint that there are more cards below (N7). Is that discoverable enough with a long column?

## Login

- Is it obvious within a few seconds that you can sign in with one click as a demo user? (`login-desktop.png`, `login-phone.png`)
- Is the "Incorrect email or password." message clear and placed where you would look? (`login-error-desktop.png`)
- Does the logo with the "Crewboard" wordmark look like a product, not a placeholder? (`login-desktop.png`)

## Sign-up

- Are the field errors specific and next to their fields? (`signup-errors-desktop.png`, `signup-errors-phone.png`)
- Is the password hint ("At least 8 characters.") visible before you make a mistake? (`signup-errors-tablet.png`)

## Board

- Is the board name prominent enough, and is it clear that you can click it to rename? (`board-desktop.png`)
- Do the column colours (grey / amber / green dots) help tell the columns apart? (`board-desktop.png`)
- Are the count badges easy to read? (`board-tablet.png`)

## Card

- Is the card title size comfortable to read next to the avatar? (`board-desktop.png`)
- Is the "has a description" icon understandable, or is it noise? (`board-desktop.png`)
- Does a very long title clamp tidily with an ellipsis after four lines? (`toast-and-long-title-card.png`)
- Is the hover state noticeable but quiet? (`card-hover.png`)

## Task dialog

- Do the field order and grouping (title, description, then assignee and status side by side) feel right? (`task-dialog-desktop.png`)
- Is "Delete" visually separate enough from "Save changes"? (`task-dialog-desktop.png`)
- On a phone, is the full-screen sheet comfortable, with Save reachable? (`task-dialog-phone.png`)

## Create flow

- Does opening a dialog for "Add a card" (rather than an inline composer) feel natural? (`create-dialog.png`)
- Is the success toast's wording ("Added to To Do.") useful? (`toast-and-long-title-card.png`)

## Drag in progress

- Is it clear where the card will land (amber ring on the target column, dashed placeholder)? (`drag-in-progress.png`)

## Filter on

- Is the "My tasks" state obvious (amber button plus banner), and is "Show all tasks" easy to find? (`filter-on-desktop.png`, `filter-on-phone.png`)

## Settings

- Is the page's purpose clear, and is "Reset demo data" suitably cautious (red, with confirmation)? (`settings-desktop.png`, `reset-confirm.png`)
- On a phone, are the Save buttons easy to tap? (`settings-phone.png`)

## Empty, loading and error states

- Is the empty-column message helpful, with or without the filter? (`empty-column-filter-on.png`)
- Does the loading skeleton look calm, not jumpy? (`loading.png`)
- Is the load-error message clear, with an obvious "Try again"? (`load-error.png`)

## Phone, tablet, desktop, 200% text

- Phone (320 px): do the columns snap one at a time when you swipe, and is it clear there are more columns to the right? (`board-phone.png`)
- Tablet (768 px): does the layout use the space well? (`board-tablet.png`, `task-dialog-tablet.png`)
- Desktop (1440 px): does the whole board feel balanced? (`board-desktop.png`)
- 200% text: is everything still readable and reachable, with no clipped text? (`login-phone-200pct.png`, `board-phone-200pct.png`, `task-dialog-phone-200pct.png`, `login-desktop-200pct.png`, `board-desktop-200pct.png`, `task-dialog-desktop-200pct.png`)

## Taste decisions the agents made (overrule any of them)

| Decision           | What was chosen                                                                                                          | Where to change it                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Product name       | Crewboard                                                                                                                | `index.html`, `src/components/ui/AuthLayout.tsx`, `src/components/board/AppHeader.tsx` |
| Palette            | Deep teal board `#0d5c55`, darker header `#0a4743`, neutral column panels `#ebf0ef`, white cards, amber accent `#fbbf24` | `src/index.css` (`@theme`)                                                             |
| Typeface           | The system UI font stack (no web font)                                                                                   | `src/index.css` (`--font-sans`)                                                        |
| Density            | Compact cards (12 px padding, 8 px gaps), 18rem (288 px) columns                                                         | `src/components/board/TaskCard.tsx`, `src/index.css` (`--spacing-column`)              |
| Corner radius      | 8 px cards and buttons, 12 px columns and dialogs, 16 px auth cards                                                      | Tailwind `rounded-lg` / `rounded-xl` / `rounded-2xl` in the components                 |
| Shadows            | Hairline card shadow, soft column shadow, large dialog shadow                                                            | `src/components/board/TaskCard.tsx`, `src/components/ui/Dialog.tsx`                    |
| Logo               | Three horizontal rounded bars in a dark teal circle, the last one amber                                                  | `src/components/ui/Logo.tsx`, `public/favicon.svg`                                     |
| Column status dots | Grey (To Do), amber (In Progress), green (Done)                                                                          | `src/components/board/columns.ts`                                                      |
| Creating a task    | A dialog opened from each column's "Add a card" button                                                                   | `src/components/board/CreateTaskDialog.tsx`                                            |
| Toasts             | Top of the screen on phones, bottom on larger screens; 5 seconds; one at a time                                          | `src/app/ToastContext.tsx`                                                             |
| Login layout       | Demo accounts beside the form on wide screens, above it on phones                                                        | `src/components/ui/AuthLayout.tsx`, `src/pages/LoginPage.tsx`                          |
