---
title: OpenAPI Export
description: Generate an OpenAPI 3.0 spec from your db.yml — for Swagger UI, Postman, or code generation
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

yRest generates a live OpenAPI 3.0 specification from your `db.yml` file. Every collection, relation, and custom route is reflected in the spec automatically — no annotations required.

## The `/_openapi` endpoint

When the server is running, the spec is available at:

| Endpoint        | Description              |
| --------------- | ------------------------ |
| `GET /_openapi` | OpenAPI 3.0 spec as JSON |

## yrest openapi command

Export the spec to a file without starting the server:

```bash
yrest openapi db.yml
yrest openapi db.yml --output openapi.json
yrest openapi db.yml --output openapi.yaml
```

:::note[Coming soon]
The `yrest openapi` CLI command is planned for a future phase. The `/_openapi` endpoint is available now when the server is running.
:::

## What is included

## Schema inference

yRest infers field types from the live data in `db.yml`. Explicit `_schema` declarations override the inferred types.

## Swagger UI integration

Point Swagger UI at `/_openapi` while yRest is running:

```html
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({ url: "http://localhost:3070/_openapi", dom_id: "#swagger-ui" });
</script>
```

## Postman import

## Limitations

## Next steps

- [Field Schema](/database/schema/) — use `_schema` to add types and constraints that appear in the spec
- [CLI Reference](/reference/cli-reference/) — `yrest openapi` command reference
- [Programmatic API](/reference/programmatic-api/) — access the spec from Node.js test code
