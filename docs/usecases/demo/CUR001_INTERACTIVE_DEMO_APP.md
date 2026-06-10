# CUR001 — Interactive Demo App

## Summary

A developer runs the bundled demo application to explore every yrest feature
interactively through a live Todo app backed by a real `db.yml`.

## Actor

Developer (evaluating or learning yrest)

## Preconditions

- Node.js ≥ 18 installed
- Repository cloned (`git clone` / `npm install` at root)
- `npm install` run inside `demo/`
- Ports 3070 (API) and 4321 (web) are free

## Main Flow

1. Developer runs `task demo` from the repository root.
2. `task demo` builds the local package (`tsup`) then starts `concurrently`:
   - `yrest serve` → API at `http://localhost:3070/api` (reads `demo/db.yml`)
   - `astro dev` → web app at `http://localhost:4321`
3. Browser opens the demo. The header shows a green **Connected** dot within 5 s.
4. The left column shows a live Todo list with filters, sort, and pagination.
5. The right column shows the **API Explorer** — a tabbed panel starting on **Auth**.

### Auth flow

6. Developer fills in email + password in the **Auth** tab and clicks **Sign in**.
   - `POST /api/auth/login` is sent; the `login` handler validates credentials.
   - On success the session is stored client-side; the explorer header shows the
     user's initials and name in blue.
7. The Todo list enables the **+ Add** button. New tasks are created under the
   logged-in user's `userId`.
8. Tasks owned by the current user show a check toggle and a delete button on hover.
   Tasks owned by other users are read-only (no toggle, no delete).
9. Hovering the initials circle on any task reveals a popover with the owner's
   name, email, and role — populated from `?_expand=user` on the GET request.

### API Explorer tabs

10. Developer switches to the **CRUD** tab and calls `GET /api/todos` or
    `POST /api/todos` directly. The response log appears below the controls.
    The Todo list refreshes automatically (shared `refreshTrigger` in context).
11. **Filters** tab demonstrates field filters (`?name=Ana`), OR filters, operator
    suffixes (`_gte`, `_like`, `_regex`), and full-text search (`?_q=term`).
12. **Sort & Page** demonstrates `?_sort`, `?_order`, `?_page`, `?_limit`, and the
    `X-Total-Count` header visible in the response log.
13. **Relations** demonstrates `?_expand=user` (child → parent embedding) and
    `?_embed=todos` (parent → children).
14. **Fields** demonstrates `?_fields=id,title,done` projection.
15. **Custom Routes** calls static routes defined in `_routes` (`/health`,
    `/auth/logout`, `/todos/:id/share` with template variables).
16. **Templates** calls `GET /todos/:id/share` and shows `{{params.id}}`, `{{now}}`,
    and `{{uuid}}` resolved at request time.
17. **Handlers** calls `GET /api/stats` and `GET /api/summary`, both backed by
    JavaScript functions in `yrest.handlers.js`.

### Summary dialog

18. Developer clicks **≡ Summary** in the Todo toolbar.
    - `GET /api/summary` is called; the `summary` handler fetches all todos and
      users from the API itself and aggregates the data.
    - A dialog opens showing per-user stats (done / pending counts with progress
      bar) and a CSS bar chart of tasks created per day grouped by user.

### Stopping

19. Developer runs `task demo:stop` to kill both processes (frees ports 3070 + 4321).

## Alternative Flows

### Alt-1: Invalid credentials

The `login` handler returns `401 { "error": "Invalid credentials" }`.
The error message is shown inline below the password field. No session is created.

### Alt-2: API server not running

The health poll fails within 2 s. The header dot turns red (**Disconnected**).
The Todo list shows "Connecting to yrest…". All API calls from the explorer
still execute — they return `{ error: "Cannot connect to yrest" }` from the
`fetchApi` catch block.

### Alt-3: Port already in use

`yrest serve` exits with `EADDRINUSE`. Developer runs `task demo:stop` first,
then `task demo` again.

### Alt-4: Logout

Clicking **Sign out** in the Auth tab dispatches `LOGOUT` to the React context.
The session is cleared client-side. The Todo list disables the add form. The
explorer badge reverts to the grey "Not signed in" state.

## Postconditions

- All CRUD operations made through the Explorer or the Todo form are persisted
  to `demo/db.yml` (watch mode active).
- `_routes`, `_rel`, and all collections are preserved across every write
  (guaranteed by `persist()` in `yamlStorage.ts`).
- Running `task demo:stop` + `task demo` restores the full server state from
  the current `db.yml`.

## Architecture Notes

### React + Astro (single island)

The entire UI is one React island (`<AppShell client:load />`). Splitting
into multiple islands would require cross-island state (e.g. Nano Stores)
because `TodoApp` and `ApiExplorer` share `AppContext`. The single-island
pattern is correct for this level of interconnected state.

```
AppProvider (context)
├── AppHeader        ← useServerStatus (polls /health, adaptive 5s/30s)
└── main.app-main
    ├── TodoApp      ← useTodos (facade), session-gated mutations
    └── ApiExplorer  ← tabbed panels, session badge
```

### Facade hooks

| Hook              | Responsibility                                                     |
| ----------------- | ------------------------------------------------------------------ |
| `useTodos`        | Fetch + filter + paginate + CRUD, bumps `version` after mutations  |
| `useServerStatus` | Health poll, adaptive interval (5 s disconnected / 30 s connected) |
| `useUsers`        | Loads user list once on connect, returns `Map<id, User>`           |

### Shared state (AppContext)

| Field            | Writer                        | Reader                               |
| ---------------- | ----------------------------- | ------------------------------------ |
| `connected`      | `useServerStatus`             | `TodoList`, `TodoForm`               |
| `crudLog`        | `useTodos`                    | `CrudPanel`                          |
| `refreshTrigger` | `CrudPanel` (after mutations) | `useTodos` (re-fetch)                |
| `session`        | `AuthPanel` (login/logout)    | `TodoApp`, `TodoItem`, `ApiExplorer` |

## File Map

```
demo/
├── db.yml                          # YAML database (collections + _routes + _rel)
├── yrest.config.yml                # port 3070, base /api, watch, handlers path
├── yrest.handlers.js               # login, stats, summary handler functions
└── src/
    ├── context/AppContext.tsx       # global state + dispatch
    ├── hooks/
    │   ├── useTodos.ts             # todo facade
    │   ├── useServerStatus.ts      # health polling
    │   └── useUsers.ts             # user map
    ├── components/
    │   ├── AppShell.tsx            # React island root
    │   ├── AppHeader.tsx           # logo + connected status
    │   ├── todo/                   # TodoApp, TodoForm, TodoList, TodoItem,
    │   │                           # TodoToolbar, TodoPagination, SummaryDialog
    │   └── explorer/
    │       ├── ApiExplorer.tsx     # tab router + session badge
    │       └── panels/             # AuthPanel, CrudPanel, FiltersPanel,
    │                               # SortPagePanel, RelationsPanel, ProjectionPanel,
    │                               # CustomRoutesPanel, TemplatesPanel, HandlersPanel
    └── styles/global.css           # design tokens + all component styles
```

## Running the Demo

```bash
# Install deps (first time only)
cd demo && npm install && cd ..

# Start (builds package + launches API + web)
task demo

# Stop (frees ports 3070 and 4321)
task demo:stop
```

Demo accounts: `ana@demo.com` / `demo123` (admin) · `luis@demo.com` / `demo123` (user)
