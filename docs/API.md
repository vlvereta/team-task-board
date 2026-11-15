# Crewboard REST contract

The UI talks to this API through `src/api/client.ts`, which builds requests and hands them to a `Transport` (`src/api/transport.ts`). In this build the transport is the in-browser mock server (`src/mock/`), which persists to `localStorage`. A real server implementing the same contract can be plugged in with `createFetchTransport(baseUrl)`.

Types referenced below are defined in `src/api/types.ts`.

## Conventions

- JSON request and response bodies. Paths are relative to the API root (for a real server, e.g. `https://api.example.com`).
- Authenticated endpoints need `Authorization: Bearer <token>`. Every endpoint is authenticated except `POST /auth/register` and `POST /auth/login`.
- Successful responses wrap the resource in a named key (`{ "task": … }`, `{ "tasks": [...] }`), except `DELETE`, which returns `204` with no body.
- Timestamps are ISO 8601 strings in UTC.
- Strings are trimmed by the server before validation and storage. Emails are compared and stored lower-cased.

## Error format

Every non-2xx response has this body:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Please fix the highlighted fields.",
    "fields": { "email": "Enter a valid email address." }
  }
}
```

| Status | `code`                | When                                                                                                                                                                                                           |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400    | `validation_error`    | Body missing or not an object, a field fails validation (`fields` lists them), bad query value.                                                                                                                |
| 401    | `unauthorized`        | Missing, malformed, badly signed or expired token, or the token's user no longer exists.                                                                                                                       |
| 401    | `invalid_credentials` | Login with an unknown email or a wrong password. One generic message for both: "Incorrect email or password."                                                                                                  |
| 403    | `forbidden`           | Authenticated, but the action targets someone else's account (`PATCH /users/:id` with another user's id).                                                                                                      |
| 404    | `not_found`           | Unknown task id, or no route matches the method and path.                                                                                                                                                      |
| 409    | `conflict`            | Registering an email that already exists ("An account with this email already exists."), or editing a task with an outdated `expectedUpdatedAt` ("This task was changed somewhere else after you opened it."). |
| 500    | `internal_error`      | Unexpected failure (also used by the mock's failure injection).                                                                                                                                                |

## Validation rules

| Field          | Rule                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `name` (user)  | Required, 1–60 characters after trimming.                                                               |
| `email`        | Required, matches `local@domain.tld` (no spaces, one `@`, a dot in the domain), at most 254 characters. |
| `password`     | Required, at least 8 characters. Not trimmed.                                                           |
| `title` (task) | Required, 1–200 characters after trimming.                                                              |
| `description`  | Optional string, at most 5000 characters. Defaults to `""`.                                             |
| `status`       | One of `todo`, `in_progress`, `done`.                                                                   |
| `assigneeId`   | `null` or the id of an existing user.                                                                   |
| `position`     | Integer ≥ 0. Values past the end of the column are clamped to the end.                                  |
| `name` (board) | Required, 1–80 characters after trimming.                                                               |

## Endpoints

### Auth

#### `POST /auth/register`

Body: `RegisterInput` `{ name, email, password }`.
`201` → `{ token, user }` (`AuthResult`). The new user gets an avatar colour from a fixed palette. Errors: 400, 409.

#### `POST /auth/login`

Body: `LoginInput` `{ email, password }`.
`200` → `{ token, user }`. Errors: 400 (missing fields), 401 `invalid_credentials`.

#### `GET /auth/me`

`200` → `{ user }`. Errors: 401.

### Users

#### `GET /users`

`200` → `{ users: User[] }`, sorted by name (case-insensitive). Used for the assignee picker.

#### `PATCH /users/me`

Body: `{ name }`. `200` → `{ user }`. Errors: 400, 401.
`PATCH /users/:id` behaves the same when `:id` is the caller's own id, and returns 403 for any other existing id (404 for an unknown one).

### Board

#### `GET /board`

`200` → `{ board }` with `columns` always `[{ id: "todo", title: "To Do" }, { id: "in_progress", title: "In Progress" }, { id: "done", title: "Done" }]`.

#### `PATCH /board`

Body: `{ name }`. `200` → `{ board }`. Errors: 400.

### Tasks

Positions are dense, 0-based integers within each status column. The server renumbers the affected columns after every create, status change, move and delete, so clients can rely on `0..n-1`.

#### `GET /tasks`

Query: optional `assignee=me` (tasks assigned to the caller) or `assignee=<userId>`; any other value of an unknown user returns an empty list. `assignee=unassigned` returns tasks with no assignee.
`200` → `{ tasks: Task[] }` ordered by column (`todo`, `in_progress`, `done`) then `position`.

#### `POST /tasks`

Body: `CreateTaskInput` `{ title, description?, status?, assigneeId? }`. `status` defaults to `todo`, `assigneeId` to `null`. The task is appended to the end of its column. `createdBy` is the caller.
`201` → `{ task }`. Errors: 400.

#### `PATCH /tasks/:id`

Body: `UpdateTaskInput`, any subset of `{ title, description, status, assigneeId }`. Unknown keys are ignored; `position` cannot be set here. If `status` changes, the task moves to the end of the new column. `updatedAt` is refreshed.
Optional `expectedUpdatedAt`: the task's `updatedAt` when the editor opened it. If the task has been saved since, the server returns 409 and changes nothing, so two editors cannot silently overwrite each other.
`200` → `{ task }`. Errors: 400, 404, 409.

#### `PATCH /tasks/:id/move`

Body: `MoveTaskInput` `{ status, position }`. `position` is the task's final index in the target column (after it has been taken out of its old place). Works for moving between columns and reordering within one.
`200` → `{ tasks: Task[] }`, the whole board's tasks after the move, ordered as in `GET /tasks`. Errors: 400, 404.

#### `DELETE /tasks/:id`

`204`, no body. Errors: 404.

### Demo

#### `POST /demo/reset`

Restores the seed: the five demo users, the demo board and its tasks. Accounts created since are removed, so a token for such an account then gets 401. Tokens for demo accounts stay valid.
`200` → `{ ok: true }`.

## Mock server specifics

- **Storage**: one `localStorage` key, `crewboard:db`, holding `{ schemaVersion: 1, secret, users, board, tasks }`. If the key is missing, the seed is written (first visit only). If it cannot be parsed or has another `schemaVersion`, it is replaced by the seed. The store is re-read on every request, so two open tabs see each other's changes after a refetch.
- **Passwords**: PBKDF2-SHA-256 with a random 16-byte salt per user (Web Crypto), stored as base64 `passwordHash` + `salt`. Never stored in plain text and never returned.
- **Tokens**: JWT-shaped `base64url(header).base64url(payload).base64url(HMAC-SHA-256 signature)`, payload `{ sub, iat, exp }`, signed with a per-browser random secret kept in the store. Lifetime 12 hours.
- **Processing and latency**: requests are processed one at a time in arrival order, and each write is stored immediately; the response is then delayed by a random 150–400 ms (configurable: `VITE_MOCK_LATENCY="min,max"`, `0` in unit tests). As with a real server, a request that has been sent is kept even if the page reloads before the response arrives.
- **Failure injection**: when the page URL has `?failMoves=1`, every `PATCH /tasks/:id/move` returns 500. Used to demonstrate and test the optimistic-update rollback.

## Seed

Five users, password `demo1234` for all: Ana Silva (`ana@crewboard.demo`), Ben Okafor (`ben@crewboard.demo`), Chloé Martin (`chloe@crewboard.demo`), Dev Patel (`dev@crewboard.demo`), Emma Novak (`emma@crewboard.demo`). One board, "Website relaunch", with 12 tasks across the three columns, several assignees and two unassigned tasks.
