import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYrestStorage } from "../../src/storage/yrestStorage";
import { createServer } from "../../src/server/createServer";
import { yrestOptionsSchema } from "../../src/config/loadOptions";

export const options = yrestOptionsSchema.parse({ file: "db.yml" });

export const YAML_BASIC = `
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com
`;

export const YAML_FIVE_USERS = `
users:
  - id: 1
    name: Alice
    role: admin
  - id: 2
    name: Bob
    role: user
  - id: 3
    name: Carol
    role: user
  - id: 4
    name: Dave
    role: admin
  - id: 5
    name: Eve
    role: user
`;

export const YAML_WITH_REL = `
_rel:
  posts:
    userId: users
users:
  - id: 1
    name: Ana
    email: ana@test.com
  - id: 2
    name: Luis
    email: luis@test.com
posts:
  - id: 1
    title: First post
    userId: 1
  - id: 2
    title: Second post
    userId: 1
`;

export const YAML_WITH_ONE2ONE = `
_rel:
  profiles:
    userId:
      type: one2one
      target: users
users:
  - id: 1
    name: Ana
  - id: 2
    name: Luis
profiles:
  - id: 1
    userId: 1
    bio: Developer
  - id: 2
    userId: 2
    bio: Designer
`;

export const YAML_WITH_MANY2MANY = `
_rel:
  posts:
    userId: users
    tags:
      type: many2many
      target: tags
      through: post_tags
      foreignKey: postId
      otherKey: tagId
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
tags:
  - id: 1
    name: typescript
  - id: 2
    name: vitest
  - id: 3
    name: fastify
post_tags:
  - id: 1
    postId: 1
    tagId: 1
  - id: 2
    postId: 1
    tagId: 2
  - id: 3
    postId: 2
    tagId: 3
`;

export const YAML_WITH_NESTED = `
_rel:
  posts:
    userId:
      type: many2one
      target: users
      nested: true
    tags:
      type: many2many
      target: tags
      through: post_tags
      foreignKey: postId
      otherKey: tagId
      nested: true
users:
  - id: 1
    name: Ana
tags:
  - id: 1
    name: typescript
  - id: 2
    name: vitest
posts:
  - id: 1
    title: First post
    userId: 1
  - id: 2
    title: Second post
    userId: 1
post_tags:
  - id: 1
    postId: 1
    tagId: 1
  - id: 2
    postId: 1
    tagId: 2
`;

export async function createTestServer(yaml: string) {
  const filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
  writeFileSync(filePath, yaml, "utf8");
  const storage = createYrestStorage(filePath);
  const server = await createServer(storage, options);
  return { server, filePath };
}

export function cleanup(filePath: string) {
  unlinkSync(filePath);
}
