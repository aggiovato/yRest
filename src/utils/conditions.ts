import type { Scenario } from "../storage/types.js";
import type { HandlerRequest } from "./handlers.js";
import { OPERATORS, applyOperator } from "../services/query.service.js";

/**
 * Resolves a dot-notation request path to its value.
 *
 * Supported roots: `body`, `params`, `query`, `headers`.
 *
 * @example
 * resolveRequestPath("body.email", req)   // → req.body.email
 * resolveRequestPath("params.id", req)    // → req.params.id
 * resolveRequestPath("query.page", req)   // → req.query.page
 */
function resolveRequestPath(dotPath: string, req: HandlerRequest): unknown {
  const [root, ...rest] = dotPath.split(".");

  let value: unknown;
  switch (root) {
    case "body":
      value = req.body;
      break;
    case "params":
      value = req.params;
      break;
    case "query":
      value = req.query;
      break;
    case "headers":
      value = req.headers;
      break;
    default:
      return undefined;
  }

  for (const key of rest) {
    if (value != null && typeof value === "object") {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Evaluates a single condition group against the request (AND semantics).
 *
 * All entries must match. Keys use dot-notation with an optional operator suffix
 * (`_ne`, `_like`, `_start`, `_regex`, `_gte`, `_lte`).
 * Without a suffix, comparison is a case-sensitive string equality check.
 */
function matchConditionGroup(group: Record<string, unknown>, req: HandlerRequest): boolean {
  return Object.entries(group).every(([key, expected]) => {
    const op = OPERATORS.find((o) => key.endsWith(o));

    if (op) {
      const path = key.slice(0, -op.length);
      const value = resolveRequestPath(path, req);
      if (value === undefined) return false;
      return applyOperator(value, op, String(expected));
    }

    const value = resolveRequestPath(key, req);
    return String(value) === String(expected);
  });
}

/**
 * Evaluates a scenario's `when` condition against the request.
 *
 * - **Object** → all entries must match (AND)
 * - **Array of objects** → any group must match (OR of ANDs)
 */
function matchWhen(
  when: Record<string, unknown> | Record<string, unknown>[],
  req: HandlerRequest
): boolean {
  if (Array.isArray(when)) {
    return when.some((group) => matchConditionGroup(group, req));
  }
  return matchConditionGroup(when, req);
}

/**
 * Returns the first scenario whose `when` conditions match the request,
 * or `undefined` if none match.
 *
 * Scenarios are evaluated in declaration order — the first match wins.
 */
export function findMatchingScenario(
  scenarios: Scenario[],
  req: HandlerRequest
): Scenario | undefined {
  return scenarios.find((s) => matchWhen(s.when, req));
}
