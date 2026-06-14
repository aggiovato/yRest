/** Minimal OpenAPI 3.0 type definitions — only the subset used by the generator. */

export type OpenApiDoc = {
  openapi: "3.0.3";
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, SchemaObject>;
  };
};

export type SchemaObject = {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  enum?: unknown[];
  default?: unknown;
  $ref?: string;
};

export type PathItem = {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
};

export type Operation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ApiResponse>;
};

export type Parameter = {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  description?: string;
  schema: SchemaObject;
};

export type RequestBody = {
  required?: boolean;
  content: Record<string, { schema: SchemaObject }>;
};

export type ApiResponse = {
  description: string;
  content?: Record<string, { schema: SchemaObject }>;
  headers?: Record<string, { schema: SchemaObject; description?: string }>;
};
