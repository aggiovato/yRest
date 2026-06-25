---
title: Field Schema
description: Declare field types, constraints and OpenAPI annotations with _schema
---

The `_schema` block lets you annotate fields with types, validation constraints, and OpenAPI metadata. Declarations are used by the OpenAPI generator to produce accurate specs and by yRest to enforce constraints at write time (POST / PUT / PATCH). Fields not listed in `_schema` are inferred from the collection data and treated as optional.

---

## The `_schema` block

`_schema` lives at the top level of `db.yml` alongside your collections. Under it, each key matches a collection name, and under each collection each key is a field name:

```yaml
_schema:
  users:
    name:
      _required: true
      _type: string
    email:
      _required: true
      _type: string
      _format: email

users:
  - id: 1
    name: Ana
    email: ana@test.com
```

All keys inside field objects use the `_` prefix convention. The collection data sits at the root level as usual — `_schema` does not replace or wrap it.

---

## Shorthand forms

Two shorthand strings are accepted at the field level for the most common cases:

```yaml
_schema:
  users:
    name: required # → { _required: true }
    email:
      _required: true # verbose equivalent
```

`required` as a plain string is the only shorthand currently supported. All other annotations require the object form.

---

## Core fields

| Key            | Type      | Description                                                                              |
| -------------- | --------- | ---------------------------------------------------------------------------------------- |
| `_required`    | `boolean` | Marks the field as required — enforced on POST and PUT                                   |
| `_type`        | `string`  | Overrides the inferred type: `string`, `integer`, `number`, `boolean`, `array`, `object` |
| `_format`      | `string`  | OpenAPI format hint: `email`, `date`, `date-time`, `uuid`, `uri`, `password`, …          |
| `_enum`        | `array`   | Restricts the field to a fixed set of allowed values                                     |
| `_description` | `string`  | Human-readable field description included in the OpenAPI schema                          |
| `_default`     | `any`     | Default value shown in the OpenAPI schema (not applied at runtime)                       |
| `_example`     | `any`     | Example value shown in the OpenAPI schema and `/_about`                                  |
| `_nullable`    | `boolean` | Allows the field to be `null` in addition to its declared type                           |

---

## String constraints

| Key          | Type     | Description                                    |
| ------------ | -------- | ---------------------------------------------- |
| `_minLength` | `number` | Minimum number of characters                   |
| `_maxLength` | `number` | Maximum number of characters                   |
| `_pattern`   | `string` | ECMAScript regex the string value must satisfy |

```yaml
_schema:
  users:
    username:
      _type: string
      _minLength: 3
      _maxLength: 20
      _pattern: "^[a-zA-Z0-9_]+$"
```

---

## Number constraints

| Key                 | Type     | Description                                 |
| ------------------- | -------- | ------------------------------------------- |
| `_minimum`          | `number` | Inclusive lower bound                       |
| `_maximum`          | `number` | Inclusive upper bound                       |
| `_exclusiveMinimum` | `number` | Exclusive lower bound (value must be `> N`) |
| `_exclusiveMaximum` | `number` | Exclusive upper bound (value must be `< N`) |
| `_multipleOf`       | `number` | Value must be an exact multiple of N        |

```yaml
_schema:
  products:
    price:
      _type: number
      _minimum: 0
      _exclusiveMaximum: 100000
    quantity:
      _type: integer
      _minimum: 0
      _multipleOf: 1
```

---

## Array constraints

| Key            | Type      | Description                                                      |
| -------------- | --------- | ---------------------------------------------------------------- |
| `_minItems`    | `number`  | Minimum number of items in the array                             |
| `_maxItems`    | `number`  | Maximum number of items in the array                             |
| `_uniqueItems` | `boolean` | All array items must be distinct                                 |
| `_items`       | `object`  | Schema for each array item — accepts `_type`, `_format`, `_enum` |

```yaml
_schema:
  users:
    tags:
      _type: array
      _minItems: 1
      _uniqueItems: true
      _items:
        _type: string
        _enum: [admin, editor, viewer, guest]
```

---

## OpenAPI meta

| Key           | Type      | Description                                                   |
| ------------- | --------- | ------------------------------------------------------------- |
| `_deprecated` | `boolean` | Marks the field as deprecated in the generated spec           |
| `_readOnly`   | `boolean` | Field is read-only — excluded from POST / PUT request schemas |
| `_writeOnly`  | `boolean` | Field is write-only — excluded from GET response schemas      |

```yaml
_schema:
  users:
    createdAt:
      _type: string
      _format: date-time
      _readOnly: true # auto-set by the server, not accepted in writes
    password:
      _type: string
      _writeOnly: true # accepted on write, never returned in GET
    legacyField:
      _type: string
      _deprecated: true
```

---

## Complete example

```yaml
_schema:
  users:
    name: required
    email:
      _required: true
      _type: string
      _format: email
      _minLength: 5
      _maxLength: 100
      _example: ana@example.com
    age:
      _type: integer
      _minimum: 0
      _maximum: 150
      _nullable: true
    role:
      _type: string
      _enum: [admin, editor, viewer]
      _default: viewer
      _description: Access level for this user
    tags:
      _type: array
      _items:
        _type: string
      _minItems: 1
      _uniqueItems: true
    createdAt:
      _type: string
      _format: date-time
      _readOnly: true
    password:
      _type: string
      _minLength: 8
      _writeOnly: true

users:
  - id: 1
    name: Ana
    email: ana@example.com
    age: 28
    role: admin
    tags: [typescript, backend]
    createdAt: "2024-01-15T10:00:00Z"
```

---

## Type inference

Fields not listed in `_schema` are inferred from the first item in the collection:

- Field present on the first item → type inferred from the value, treated as **optional**
- Field declared in `_schema` with `_required: true` → **required**
- Field declared in `_schema` without `_required` → **optional** (explicit annotation takes precedence over inference)

Inference rules per value type:

| YAML value type | Inferred OpenAPI type |
| --------------- | --------------------- |
| String          | `string`              |
| Integer         | `integer`             |
| Float           | `number`              |
| Boolean         | `boolean`             |
| Sequence        | `array`               |
| Mapping         | `object`              |
| Null            | inferred as optional  |

`_schema` itself is never exposed as a REST resource or included in response bodies.

---

## Next steps

- [YAML Format](/database/format/) — collections, reserved keys and the underscore convention
- [OpenAPI Export](/integrations/openapi/) — generate specs from `_schema` declarations
- [Configuration](/getting-started/configuration/) — server options and `yrest.config.yml`
