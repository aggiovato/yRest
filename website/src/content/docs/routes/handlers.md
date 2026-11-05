---
title: Handler Functions
description: Add real logic to custom routes with a JavaScript or TypeScript handlers file — typed wrappers, access to the live collections and SSE handler streams
---

Handler functions give you full programmatic control over a route response. You export functions from a handlers file; yRest loads it at startup and calls the matching function when the route is hit. Unlike [scenarios](/routes/scenarios/), handlers can run any logic — counters, state, branching on the request, reading and writing your collections.

## The handler file

A handlers file is an ES module that exports one function per handler. It can be JavaScript (`.js`, `.mjs`, `.cjs`) or TypeScript (`.ts`, `.mts`):

```ts
// yrest.handlers.ts
import { defineHandler } from "@yrest/cli";

export const login = defineHandler((req) => {
  const { password } = (req.body ?? {}) as { password?: string };
  if (password !== "secret") return { status: 401, body: { error: "Invalid credentials" } };
  return { body: { token: "tok-123" } };
});
```

Pass it to the server with `--handlers`, or set it once in `yrest.config.yml`:

```bash
yrest serve db.yml --handlers yrest.handlers.ts
```

```yaml
# yrest.config.yml
handlers: yrest.handlers.ts
```

Every exported function is registered under its export name. Anything that is not a function is ignored.

## Referencing a handler in \_routes

Point a `_routes` entry at a handler with `_handler`:

```yaml
_routes:
  - _method: POST
    _path: /login
    _handler: login

  - _method: GET
    _path: /users/:id/card
    _handler: userCard
```

Path params, query string, body and headers of the request are all available to the handler.

## Function signature

```ts
type HandlerRequest = {
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string | string[]>;
};

type HandlerResponse = {
  status?: number; // defaults to 200
  body?: unknown;
  headers?: Record<string, string>;
};

type HandlerContext = {
  collection<T>(name: string): CollectionHandle<T>;
};

type Handler = (
  req: HandlerRequest,
  ctx: HandlerContext
) => HandlerResponse | Promise<HandlerResponse>;
```

A handler returns a `HandlerResponse` — or a promise of one, so `async` functions work as well. A `204` without a body is sent empty.

## Typed handlers

`defineHandler` is an identity wrapper exported by `@yrest/cli`. It changes nothing at runtime; it gives the function its parameter and return types, so `req`, `ctx` and the returned object are checked by TypeScript:

```ts
import { defineHandler } from "@yrest/cli";

export const userCard = defineHandler((req) => ({
  body: { id: req.params["id"], badge: "gold" },
}));
```

`defineSseHandler` does the same for [SSE handler streams](#sse-handler-streams).

## Reading and writing collections

The second argument, `ctx`, gives the handler typed access to the live data through `ctx.collection(name)`. It is the same handle as [`server.collection()`](/reference/programmatic-api/#typed-collection-access) in the programmatic API:

```ts
import { defineHandler } from "@yrest/cli";
import type { User } from "./db.types"; // generated with `yrest types`

export const login = defineHandler((req, { collection }) => {
  const { email } = (req.body ?? {}) as { email?: string };
  const user = collection<User>("users").findWhere((u) => u.email === email)[0];
  return user
    ? { body: { token: `tok-${user.id}` } }
    : { status: 401, body: { error: "Unknown user" } };
});

export const signup = defineHandler((req, { collection }) => {
  const user = collection<User>("users").create(req.body as Omit<User, "id">);
  return { status: 201, body: user };
});
```

Writes go through the same layer as the REST routes: the user that `signup` creates is returned by `GET /users` straight away, gets its id from the server's id strategy and is persisted to `db.yml` like a `POST`.

| Method              | Returns          | Description                                         |
| ------------------- | ---------------- | --------------------------------------------------- |
| `findAll()`         | `T[]`            | Every item, in stored order                         |
| `findById(id)`      | `T \| undefined` | Item by id — `1` and `"1"` both match               |
| `findWhere(fn)`     | `T[]`            | Items for which the predicate returns `true`        |
| `count()`           | `number`         | Number of items                                     |
| `create(data)`      | `T`              | Adds an item; the id is generated when omitted      |
| `update(id, patch)` | `T \| undefined` | Merges `patch` into the item (the id cannot change) |
| `delete(id)`        | `T \| undefined` | Removes the item and returns it                     |

Returned items are copies — change data with `update()`, not by mutating a result. `collection()` throws for a collection that does not exist.

Use [`yrest types`](/integrations/codegen/) to generate the `User`, `Post`… interfaces from your `db.yml`.

## SSE handler streams

An [SSE route](/routes/sse/) can hand the whole stream to a handler with `_handler` inside `_sse`, instead of a scripted `_events` list:

```yaml
_routes:
  - _method: SSE
    _path: /events/chat
    _sse:
      _handler: chatStream

  - _method: POST
    _path: /chat/messages
    _handler: postMessage
```

```ts
import { EventEmitter } from "node:events";
import { defineHandler, defineSseHandler } from "@yrest/cli";

const bus = new EventEmitter();

export const chatStream = defineSseHandler((req, raw) => {
  const send = (msg: unknown) => raw.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
  bus.on("message", send);
  raw.on("close", () => bus.off("message", send));
});

export const postMessage = defineHandler((req, { collection }) => {
  const message = collection("messages").create(req.body as { text: string });
  bus.emit("message", message);
  return { status: 201, body: message };
});
```

An SSE handler receives `(req, raw, ctx)`, where `raw` is the Node.js `ServerResponse`. yRest sends the SSE headers and a keep-alive comment every 15 s; the handler writes frames in the `event:` / `data:` wire format and calls `raw.end()` when the stream is over. Listen to `raw.on("close")` to stop work when the client disconnects.

## Errors

| Situation                                            | Response                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `_handler` names a function the file does not export | `501` with `Handler "name" is not defined in the handlers file` |
| The handler throws or rejects                        | `500` with `Handler "name" threw an error: …`                   |
| An SSE handler is missing                            | `501` before the stream opens                                   |
| An SSE handler throws                                | An `event: error` frame, then the stream is closed              |
| The handlers file fails to load                      | The error is logged and the server starts without handlers      |

`_error` on the route takes priority over the handler: the route always answers with the forced status.

## CLI scaffold command

`yrest handler` adds a stub to the handlers file configured in `yrest.config.yml` (or `yrest.handlers.js`), creating the file if needed:

```bash
yrest handler login
yrest handler login --method POST --path /login
yrest handler login --method POST --path /login --register
```

For a `.ts` / `.mts` handlers file the stub uses `defineHandler`:

```ts
/** Handler for POST /login */
export const login = defineHandler(async (req, ctx) => {
  // TODO: implement handler logic — ctx.collection("name") gives typed access to the data
  return { status: 200, body: null };
});
```

`--register` also writes the `_routes` entry (`_method`, `_path`, `_handler`) to `db.yml`.

## TypeScript support

TypeScript handler files are imported directly, without a build step:

- **Node ≥ 22.18** strips the types itself. Use `import type` for type-only imports, and only erasable syntax (no `enum` or parameter properties).
- **Older Node versions** — load [`tsx`](https://tsx.is) into Node: `NODE_OPTIONS="--import tsx" npx @yrest/cli serve db.yml --handlers yrest.handlers.ts`.
- Or compile the file to `.js` and point `--handlers` at the output.

In JavaScript, `ctx` is available too; JSDoc gives editor types without a compiler:

```js
// yrest.handlers.js
/** @type {import('@yrest/cli').Handler} */
export const login = async (req, ctx) => {
  const user = ctx.collection("users").findWhere((u) => u.email === req.body?.email)[0];
  return user ? { body: { token: `tok-${user.id}` } } : { status: 401 };
};
```

## Next steps

- [SSE Streams](/routes/sse/) — scripted event streams and handler-driven ones
- [Codegen](/integrations/codegen/) — generate the types of your collections with `yrest types`
- [Programmatic API](/reference/programmatic-api/) — the same collection access from your tests
- [Scenarios](/routes/scenarios/) — conditional responses without code
