---
title: Template Variables
description: Interpolate request data into static and scenario responses with {{}} syntax
---

:::caution[Work in progress]
This page is being written. See the [README](https://github.com/aggiovato/yRest#readme) for the full reference in the meantime.
:::

Template variables let static route responses include values from the incoming request — path params, query string, body, timestamps and generated IDs. They use a `{{variable}}` syntax resolved at request time.

## Available variables

| Variable       | Resolves to                            |
| -------------- | -------------------------------------- |
| `{{params.X}}` | Path parameter `:X` from the route     |
| `{{query.X}}`  | Query string value for key `X`         |
| `{{body}}`     | Full request body as JSON              |
| `{{body.X}}`   | Nested field `X` from the request body |
| `{{now}}`      | Current timestamp (ISO 8601)           |
| `{{uuid}}`     | A freshly generated UUID v4            |

## Using in response body

## Using in scenarios

## Using in SSE event data

## Examples

## Next steps

- [Static Routes](/routes/static/) — define the routes that use template variables
- [Scenarios](/routes/scenarios/) — combine template variables with conditional logic
- [SSE Streams](/routes/sse/) — template variables resolved per frame in event data
