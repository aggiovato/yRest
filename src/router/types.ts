import type { FastifyInstance } from "fastify";
import type { YamlStorage } from "../storage/yamlStorage.js";
import type { Relations } from "../storage/types.js";

export type RoutePlugin = (
  server: FastifyInstance,
  storage: YamlStorage,
  resource: string,
  base: string
) => void;

export type NestedRoutePlugin = (
  server: FastifyInstance,
  storage: YamlStorage,
  relations: Relations,
  base: string
) => void;
