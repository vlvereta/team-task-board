# Plan

## Product name

**Crewboard**: a task board for a small crew. Short, neutral, and descriptive, and not a well-known product name.

## Folder structure

```
src/
  api/          types.ts (domain + DTO types), transport.ts (Transport interface, ApiRequest/ApiResponse),
                client.ts (createApiClient: api.auth.*, api.users.*, api.board.*, api.tasks.*, api.demo.*),
                errors.ts (ApiError), token.ts (token storage: the one localStorage use outside the mock)
  mock/         server.ts (createMockServer → Transport), router.ts, store.ts (versioned store),
                seed.ts, crypto.ts (salt+hash, JWT-shaped tokens), validation.ts, handlers/*.ts
  app/          App.tsx (hash router + guards), AuthContext.tsx, ToastContext.tsx, apiContext.tsx
  pages/        LoginPage, SignupPage, BoardPage, SettingsPage
  components/   ui/ (Button, TextField, Dialog, ConfirmDialog, Avatar, Spinner, Toast),
                board/ (BoardHeader, Column, TaskCard, AddTaskForm, TaskDialog, FilterToggle)
  hooks/        useBoardData (tasks + users + board, optimistic move with rollback)
  lib/          ordering.ts (position maths for moves), initials.ts
e2e/            Playwright specs + layout checks + live smoke test
scripts/        usage-report.mjs, timeline.mjs
docs/           API.md, PLAN.md, DECISIONS.md, REVIEW.md, BUILD-REPORT.md, metrics/, screenshots/
```

## Components

- **App shell**: `HashRouter`; `RequireAuth` guard redirects to `/login` (keeps the target in state); `PublicOnly` sends signed-in users to `/board`.
- **Auth pages**: Login (email, password, generic error, demo account list with one-click sign-in), Sign-up (name, email, password, field-level validation, duplicate-email message from 409).
- **BoardPage**: header (product mark, board name, "My tasks" toggle, settings link, user menu / log out), column strip (3 `Column`s, horizontal scroll-snap on narrow screens), `DndContext` with pointer, touch and keyboard sensors, `DragOverlay`.
- **Column**: header with title + count, sortable card list, empty state, "Add a card" inline form at the foot.
- **TaskCard**: title (clamped), assignee initials avatar, opens the task dialog on click / Enter.
- **TaskDialog**: route `/board/tasks/:taskId` so it deep-links; edit title, description, assignee, status; delete with confirmation step.
- **SettingsPage**: display name, board name, reset demo data with confirmation.
- **Toasts**: rollback and error messages (`role="status"`/`alert`).

## Mock server modules

`createMockServer({ storage, latency: [min,max], now })` returns a `Transport` (`send(req) → Promise<ApiResponse>`). Router matches method + path pattern, then: auth check (Bearer token → verify signature + `exp`, else 401), JSON body validation (400 with `{ error: { code, message, fields? } }`), store read/write, status + body. Store is one localStorage key `crewboard:db` with `{ schemaVersion, users, board, tasks, secret }`; unknown version → reseed. Seed only when the key is absent. Latency defaults to 150–400 ms, `0` in unit tests and configurable at build time for e2e.

Error statuses: 400 validation, 401 missing/expired/bad token or wrong credentials, 403 editing another user's profile or a task-level action not allowed (e.g. `PATCH /users/:id` for someone else), 404 unknown task/route, 409 duplicate email.

## Test plan (mapped to SPEC.md section 3)

| Area     | Unit (Vitest)                                                                                                                | E2E (Playwright, preview build)                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | register/login/me, validation, 409, wrong creds generic 401, expired + malformed token 401, hashing (no plain text in store) | sign-up, login, logout, reload keeps session, route guard, demo one-click                                                                         |
| Board    | GET/PATCH board, validation                                                                                                  | three columns + counts, rename persists                                                                                                           |
| Tasks    | CRUD, 404, validation, `?assignee=me`                                                                                        | create from each column, edit, delete with confirm, persistence after reload                                                                      |
| DnD      | move endpoint position maths, rollback hook test                                                                             | drag across columns, reorder within column, keyboard move, persistence, rollback on forced failure                                                |
| Filter   | assignee filter                                                                                                              | My tasks toggle, counts, clear                                                                                                                    |
| Settings | PATCH users/me, demo reset                                                                                                   | rename name/board, reset demo                                                                                                                     |
| Seed     | 5 users, 10–12 tasks, all columns, unassigned, seed-once                                                                     | first visit vs. returning visit                                                                                                                   |
| Quality  | components: dialog focus trap + Escape, labelled controls                                                                    | layout at 320 / 768 / 1440 px, 200% root font, long titles; no horizontal overflow outside strip; console clean; mobile viewport run; screenshots |

## Order of work

1. Scaffold + tooling (Vite, TS strict, Tailwind, ESLint, Prettier, Vitest, Playwright) → commit.
2. Types + `docs/API.md` (main session) → mock server + unit tests (delegated, Sonnet) → commit.
3. API client, auth context, guards, login/sign-up (main) → commit.
4. Board UI: shared UI primitives (main), columns/cards/dialog/settings → commits.
5. Drag and drop with optimistic update and rollback, keyboard support → commit.
6. Polish pass; Playwright suite (delegated, Sonnet); independent acceptance review (fresh subagent).
7. README, LICENSE, CI + deploy workflows, repo creation, Pages, live smoke test (`deployed_at`).
8. Review-and-improve loop on the live site until ready (`ready_at`), UI checklist, measured report.
