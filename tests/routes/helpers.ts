import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createYamlStorage } from "../../src/storage/yamlStorage";
import { createServer } from "../../src/server/createServer";
import { serverOptionsSchema } from "../../src/config/loadOptions";

export const options = serverOptionsSchema.parse({ file: "db.yml" });

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

export async function createTestServer(yaml: string) {
  const filePath = join(tmpdir(), `yrest-test-${randomUUID()}.yml`);
  writeFileSync(filePath, yaml, "utf8");
  const storage = createYamlStorage(filePath);
  const server = await createServer(storage, options);
  return { server, filePath };
}

export function cleanup(filePath: string) {
  unlinkSync(filePath);
}
