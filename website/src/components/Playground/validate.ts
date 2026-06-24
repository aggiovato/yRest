import {
  VALID_RELATION_TYPES,
  VALID_CARDINALITIES,
  DSL_REGEX,
  RESERVED_KEYS,
  BARE_ROUTE_ENTRY_KEYS,
  BARE_RESPONSE_KEYS,
  BARE_SCENARIO_KEYS,
} from "./constants";

export type ValidationIssue = {
  token: string;
  message: string;
};

type VerboseRelDef = Record<string, unknown>;
type RelDef = string | VerboseRelDef;

export function extractCollections(data: Record<string, unknown>): string[] {
  return Object.entries(data)
    .filter(([key, val]) => !RESERVED_KEYS.has(key) && Array.isArray(val))
    .map(([key]) => key);
}

export function validateRelations(
  data: Record<string, unknown>,
  collections: string[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rel = data["_rel"];
  if (!rel) return issues;

  if (typeof rel !== "object" || Array.isArray(rel)) {
    issues.push({ token: "_rel", message: "_rel must be a YAML object." });
    return issues;
  }

  for (const [entity, fields] of Object.entries(rel as Record<string, unknown>)) {
    if (!collections.includes(entity)) {
      issues.push({
        token: entity,
        message: `"${entity}" is not a root collection in this file.`,
      });
      continue;
    }

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;

    for (const [field, def] of Object.entries(fields as Record<string, unknown>)) {
      issues.push(...validateRelDef(collections, field, def as RelDef));
    }
  }

  return issues;
}

export function validateRoutes(data: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const routes = data["_routes"];
  if (!Array.isArray(routes)) return issues;

  for (const entry of routes) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const route = entry as Record<string, unknown>;

    for (const key of Object.keys(route)) {
      if (BARE_ROUTE_ENTRY_KEYS[key]) {
        issues.push({
          token: key,
          message: `Use \`${BARE_ROUTE_ENTRY_KEYS[key]}\` instead of \`${key}\` inside _routes entries.`,
        });
      }
    }

    for (const blockKey of ["_response", "_otherwise", "response", "otherwise"] as const) {
      const block = route[blockKey];
      if (!block || typeof block !== "object" || Array.isArray(block)) continue;
      for (const key of Object.keys(block as Record<string, unknown>)) {
        if (BARE_RESPONSE_KEYS[key]) {
          issues.push({
            token: key,
            message: `Use \`${BARE_RESPONSE_KEYS[key]}\` instead of \`${key}\` inside a response block.`,
          });
        }
      }
    }

    for (const scenariosKey of ["_scenarios", "scenarios"] as const) {
      const scenarios = route[scenariosKey];
      if (!Array.isArray(scenarios)) continue;
      for (const scenario of scenarios) {
        if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) continue;
        for (const key of Object.keys(scenario as Record<string, unknown>)) {
          if (BARE_SCENARIO_KEYS[key]) {
            issues.push({
              token: key,
              message: `Use \`${BARE_SCENARIO_KEYS[key]}\` instead of \`${key}\` inside a _scenarios entry.`,
            });
          }
        }
      }
    }
  }

  return issues;
}

function validateRelDef(collections: string[], field: string, def: RelDef): ValidationIssue[] {
  if (typeof def === "string") return validateStringRelDef(collections, def);
  if (typeof def === "object" && def !== null && !Array.isArray(def)) {
    return validateVerboseRelDef(collections, field, def);
  }
  return [
    {
      token: field,
      message: `Invalid relation definition for "${field}". Use a shorthand string, DSL string, or verbose object with _type and _target.`,
    },
  ];
}

function validateStringRelDef(collections: string[], def: string): ValidationIssue[] {
  if (DSL_REGEX.test(def)) {
    const match = def.match(DSL_REGEX)!;
    const target = match[2];
    if (!collections.includes(target)) {
      return [{ token: target, message: `DSL target "${target}" is not a root collection.` }];
    }
    return [];
  }
  if (!collections.includes(def)) {
    return [{ token: def, message: `Target "${def}" is not a root collection.` }];
  }
  return [];
}

function validateVerboseRelDef(
  collections: string[],
  field: string,
  def: VerboseRelDef
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const relType = def["_type"] as string | undefined;
  const target = def["_target"] as string | undefined;

  if (!relType) {
    issues.push({ token: field, message: `Relation "${field}" is missing _type.` });
  } else if (!VALID_RELATION_TYPES.has(relType)) {
    issues.push({
      token: relType,
      message: `Invalid relation type "${relType}". Accepted values: many2one, one2one, many2many (or aliases m2o, o2o, m2m).`,
    });
  }

  if (!target) {
    issues.push({ token: field, message: `Relation "${field}" is missing _target.` });
  } else if (!collections.includes(target)) {
    issues.push({ token: target, message: `Target "${target}" is not a root collection.` });
  }

  for (const key of ["_car-direct", "_car-inverse"] as const) {
    const val = def[key] as string | undefined;
    if (val && !VALID_CARDINALITIES.has(val)) {
      issues.push({
        token: val,
        message: `Invalid cardinality "${val}" for ${key}. Accepted values: ${[...VALID_CARDINALITIES].join(", ")}.`,
      });
    }
  }

  return issues;
}
