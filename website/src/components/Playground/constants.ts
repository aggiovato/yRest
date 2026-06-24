export const VALID_RELATION_TYPES = new Set([
  "many2one",
  "one2many",
  "one2one",
  "many2many",
  "m2o",
  "o2m",
  "o2o",
  "m2m",
]);

export const VALID_CARDINALITIES = new Set(["0..1", "1..1", "1..n", "0..n"]);

export const DSL_REGEX =
  /^(m2o|o2o|m2m|many2one|one2one|many2many):([^@[\s(]+)(?:@([^[(+\s]+)(?:\([^)]+\))?)?(?:\[([0-9n]\.[.][0-9n1])->([0-9n]\.[.][0-9n1])\])?(\+nested)?$/;

export const RESERVED_KEYS = new Set(["_rel", "_routes", "_schema"]);

export const BARE_ROUTE_ENTRY_KEYS: Record<string, string> = {
  method: "_method",
  path: "_path",
  handler: "_handler",
  response: "_response",
  scenarios: "_scenarios",
  otherwise: "_otherwise",
  delay: "_delay",
  error: "_error",
  errorBody: "_errorBody",
};

export const BARE_RESPONSE_KEYS: Record<string, string> = {
  status: "_status",
  body: "_body",
  headers: "_headers",
};

export const BARE_SCENARIO_KEYS: Record<string, string> = {
  when: "_when",
  response: "_response",
};
