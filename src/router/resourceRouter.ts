import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Resource } from "../storage/types.js";

function nextId(items: Resource[]): number {
  const ids = items
    .map((i) => i["id"])
    .filter((id): id is number => typeof id === "number");
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

export function registerResourceRoutes(
  server: FastifyInstance,
  storage: YamlStorage,
  base: string
): void {
  const data = storage.getData();

  for (const resource of Object.keys(data)) {
    const prefix = `${base}/${resource}`;

    server.get(prefix, () => storage.getCollection(resource) ?? []);

    server.get<{ Params: { id: string } }>(`${prefix}/:id`, (req, reply) => {
      const item = (storage.getCollection(resource) ?? []).find(
        (i) => String(i["id"]) === req.params.id
      );
      if (!item) return reply.status(404).send({ error: "Not found" });
      return item;
    });

    server.post<{ Body: Resource }>(prefix, (req, reply) => {
      const collection = storage.getCollection(resource) ?? [];
      const body = req.body as Resource;
      const item: Resource = {
        id: body["id"] !== undefined ? body["id"] : nextId(collection),
        ...body,
      };
      storage.setCollection(resource, [...collection, item]);
      storage.persist();
      return reply.status(201).send(item);
    });

    server.put<{ Params: { id: string }; Body: Resource }>(
      `${prefix}/:id`,
      (req, reply) => {
        const collection = storage.getCollection(resource) ?? [];
        const idx = collection.findIndex(
          (i) => String(i["id"]) === req.params.id
        );
        if (idx === -1) return reply.status(404).send({ error: "Not found" });
        const updated: Resource = { ...req.body, id: collection[idx]!["id"] };
        collection[idx] = updated;
        storage.setCollection(resource, collection);
        storage.persist();
        return updated;
      }
    );

    server.patch<{ Params: { id: string }; Body: Resource }>(
      `${prefix}/:id`,
      (req, reply) => {
        const collection = storage.getCollection(resource) ?? [];
        const idx = collection.findIndex(
          (i) => String(i["id"]) === req.params.id
        );
        if (idx === -1) return reply.status(404).send({ error: "Not found" });
        const updated: Resource = { ...collection[idx], ...req.body };
        collection[idx] = updated;
        storage.setCollection(resource, collection);
        storage.persist();
        return updated;
      }
    );

    server.delete<{ Params: { id: string } }>(`${prefix}/:id`, (req, reply) => {
      const collection = storage.getCollection(resource) ?? [];
      const idx = collection.findIndex(
        (i) => String(i["id"]) === req.params.id
      );
      if (idx === -1) return reply.status(404).send({ error: "Not found" });
      const [deleted] = collection.splice(idx, 1);
      storage.setCollection(resource, collection);
      storage.persist();
      return deleted;
    });
  }
}
