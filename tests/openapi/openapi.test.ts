import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestServer, cleanup } from "../routes/helpers";
import type { createServer } from "../../src/server/createServer";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const YAML_BASIC_SCHEMA = `
_schema:
  users:
    name: required
    email:
      _required: true
      _format: email
    age:
      _type: integer
users:
  - id: 1
    name: Ana
    email: ana@test.com
    age: 28
  - id: 2
    name: Luis
    email: luis@test.com
    age: 34
`;

const YAML_WITH_REL_AND_SCHEMA = `
_schema:
  posts:
    title: required
    userId: required
_rel:
  posts:
    userId: users
users:
  - id: 1
    name: Ana
posts:
  - id: 1
    title: First post
    userId: 1
  - id: 2
    title: Second post
    userId: 1
`;

const YAML_WITH_MANY2MANY = `
_rel:
  posts:
    tags:
      _type: many2many
      _target: tags
      _through: post_tags
      _foreignKey: postId
      _otherKey: tagId
users:
  - id: 1
    name: Ana
posts:
  - id: 1
    title: First post
    userId: 1
tags:
  - id: 1
    name: typescript
post_tags:
  - id: 1
    postId: 1
    tagId: 1
`;

const YAML_WITH_CUSTOM_ROUTES = `
_routes:
  - _method: POST
    _path: /login
    _response:
      _status: 200
      _body:
        token: fake-jwt
  - _method: GET
    _path: /health
    _response:
      _status: 200
      _body:
        ok: true
  - _method: GET
    _path: /fail
    _error: 503
users:
  - id: 1
    name: Ana
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type OpenApiDoc = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};

async function getOpenApi(server: Awaited<ReturnType<typeof createServer>>): Promise<OpenApiDoc> {
  const res = await server.inject({ method: "GET", url: "/_openapi.json" });
  expect(res.statusCode).toBe(200);
  return res.json<OpenApiDoc>();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /_openapi.json — structure", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC_SCHEMA));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with application/json", async () => {
    const res = await server.inject({ method: "GET", url: "/_openapi.json" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("returns valid OpenAPI 3.0.3 envelope", async () => {
    const doc = await getOpenApi(server);
    expect(doc.openapi).toBe("3.0.3");
    expect(doc.info).toMatchObject({ title: expect.any(String), version: expect.any(String) });
    expect(doc.paths).toBeDefined();
    expect(doc.components.schemas).toBeDefined();
  });

  it("includes a schema for each collection", async () => {
    const doc = await getOpenApi(server);
    expect(doc.components.schemas).toHaveProperty("User");
  });

  it("generates CRUD paths for each collection", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/users");
    expect(doc.paths).toHaveProperty("/users/{id}");
    expect(doc.paths["/users"]).toHaveProperty("get");
    expect(doc.paths["/users"]).toHaveProperty("post");
    expect(doc.paths["/users/{id}"]).toHaveProperty("get");
    expect(doc.paths["/users/{id}"]).toHaveProperty("put");
    expect(doc.paths["/users/{id}"]).toHaveProperty("patch");
    expect(doc.paths["/users/{id}"]).toHaveProperty("delete");
  });
});

describe("GET /_openapi — YAML endpoint", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC_SCHEMA));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("returns 200 with text/yaml", async () => {
    const res = await server.inject({ method: "GET", url: "/_openapi" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/yaml");
  });

  it("body is valid YAML containing openapi key", async () => {
    const res = await server.inject({ method: "GET", url: "/_openapi" });
    expect(res.body).toContain("openapi: 3.0.3");
  });
});

describe("_schema: required fields reflected in OpenAPI", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_BASIC_SCHEMA));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("marks required fields in the schema", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as {
      required?: string[];
      properties: Record<string, { type: string; format?: string }>;
    };
    expect(userSchema.required).toContain("name");
    expect(userSchema.required).toContain("email");
  });

  it("applies format hint from _schema", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as {
      properties: Record<string, { type: string; format?: string }>;
    };
    expect(userSchema.properties["email"]?.format).toBe("email");
  });

  it("applies explicit type from _schema (overrides inference)", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as {
      properties: Record<string, { type: string }>;
    };
    expect(userSchema.properties["age"]?.type).toBe("integer");
  });

  it("does not list id as required (not declared in _schema)", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as { required?: string[] };
    expect(userSchema.required ?? []).not.toContain("id");
  });
});

describe("_schema absent → all fields optional", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    const yaml = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
`;
    ({ server, filePath } = await createTestServer(yaml));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("generates schema with no required fields", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as { required?: string[] };
    expect(userSchema.required ?? []).toHaveLength(0);
  });

  it("still infers property types from data", async () => {
    const doc = await getOpenApi(server);
    const userSchema = doc.components.schemas["User"] as {
      properties: Record<string, { type: string }>;
    };
    expect(userSchema.properties["id"]?.type).toBe("integer");
    expect(userSchema.properties["name"]?.type).toBe("string");
  });
});

describe("OpenAPI — relation paths", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_REL_AND_SCHEMA));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("generates nested route for many2one relation", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/users/{id}/posts");
    expect(doc.paths["/users/{id}/posts"]).toHaveProperty("get");
  });

  it("generates child item route for many2one", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/users/{id}/posts/{childId}");
  });
});

describe("OpenAPI — many2many bidirectional paths", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_MANY2MANY));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("generates forward many2many path", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/posts/{id}/tags");
  });

  it("generates inverse many2many path", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/tags/{id}/posts");
  });
});

describe("OpenAPI — custom route paths", () => {
  let filePath: string;
  let server: Awaited<ReturnType<typeof createServer>>;

  beforeEach(async () => {
    ({ server, filePath } = await createTestServer(YAML_WITH_CUSTOM_ROUTES));
  });

  afterEach(async () => {
    await server.close();
    cleanup(filePath);
  });

  it("generates path for each custom route", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths).toHaveProperty("/login");
    expect(doc.paths).toHaveProperty("/health");
    expect(doc.paths).toHaveProperty("/fail");
  });

  it("uses correct HTTP method for custom routes", async () => {
    const doc = await getOpenApi(server);
    expect(doc.paths["/login"]).toHaveProperty("post");
    expect(doc.paths["/health"]).toHaveProperty("get");
  });

  it("documents the forced error status for error injection routes", async () => {
    const doc = await getOpenApi(server);
    const failGet = (doc.paths["/fail"] as { get: { responses: Record<string, unknown> } }).get;
    expect(failGet.responses).toHaveProperty("503");
  });
});
