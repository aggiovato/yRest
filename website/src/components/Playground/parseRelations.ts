export type RelationDef =
  | {
      type: "many2one";
      target: string;
      foreignKey?: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    }
  | {
      type: "one2one";
      target: string;
      foreignKey?: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    }
  | {
      type: "many2many";
      target: string;
      through: string;
      foreignKey: string;
      otherKey: string;
      nested?: boolean;
      carDirect?: string;
      carInverse?: string;
    };

export type Relations = Record<string, Record<string, RelationDef>>;

export function parseRelations(raw: unknown): Relations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: Relations = {};

  for (const [collection, fields] of Object.entries(raw as Record<string, unknown>)) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;

    result[collection] = {};

    for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
      const def = normaliseRelationDef(key, value);
      if (def) result[collection]![key] = def;
    }
  }

  return result;
}

function normaliseRelationDef(key: string, value: unknown): RelationDef | null {
  if (typeof value === "string") {
    return value.includes(":") ? parseDslString(value) : { type: "many2one", target: value };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const v = value as Record<string, unknown>;
  const type = v["_type"];
  const nested = v["_nested"] === true ? true : undefined;
  const carDirect = typeof v["_car-direct"] === "string" ? v["_car-direct"] : undefined;
  const carInverse = typeof v["_car-inverse"] === "string" ? v["_car-inverse"] : undefined;

  if (type === "many2one" || type === undefined) {
    const target = v["_target"];
    if (typeof target !== "string") return null;
    const foreignKey = typeof v["_foreignKey"] === "string" ? v["_foreignKey"] : undefined;
    return compact({ type: "many2one", target, foreignKey, nested, carDirect, carInverse });
  }

  if (type === "one2one") {
    const target = v["_target"];
    if (typeof target !== "string") return null;
    const foreignKey = typeof v["_foreignKey"] === "string" ? v["_foreignKey"] : undefined;
    return compact({ type: "one2one", target, foreignKey, nested, carDirect, carInverse });
  }

  if (type === "many2many") {
    const target = typeof v["_target"] === "string" ? v["_target"] : key;
    const through = v["_through"];
    const foreignKey = v["_foreignKey"];
    const otherKey = v["_otherKey"];
    if (
      typeof through !== "string" ||
      typeof foreignKey !== "string" ||
      typeof otherKey !== "string"
    )
      return null;
    return compact({
      type: "many2many",
      target,
      through,
      foreignKey,
      otherKey,
      nested,
      carDirect,
      carInverse,
    });
  }

  return null;
}

const TYPE_ALIASES: Record<string, "many2one" | "one2one" | "many2many"> = {
  many2one: "many2one",
  m2o: "many2one",
  one2one: "one2one",
  o2o: "one2one",
  many2many: "many2many",
  m2m: "many2many",
};

function parseDslString(raw: string): RelationDef | null {
  const nested = raw.endsWith("+nested") ? true : undefined;
  let s = nested ? raw.slice(0, -7) : raw;

  let carDirect: string | undefined;
  let carInverse: string | undefined;
  const carMatch = s.match(/\[([^[\]]+)->([^[\]]+)\]$/);
  if (carMatch) {
    carDirect = carMatch[1];
    carInverse = carMatch[2];
    s = s.slice(0, s.length - carMatch[0].length);
  }

  const colonIdx = s.indexOf(":");
  if (colonIdx === -1) return null;
  const typeAlias = s.slice(0, colonIdx);
  const body = s.slice(colonIdx + 1);

  const type = TYPE_ALIASES[typeAlias];
  if (!type) return null;

  if (type === "many2many") {
    const m = body.match(/^([^@()[\]]+)@([^@()[\]]+)\(([^,)]+),\s*([^,)]+)\)$/);
    if (!m) return null;
    const [, target, through, foreignKey, otherKey] = m;
    return compact({
      type: "many2many",
      target,
      through,
      foreignKey,
      otherKey,
      nested,
      carDirect,
      carInverse,
    });
  }

  const atIdx = body.indexOf("@");
  const target = atIdx === -1 ? body : body.slice(0, atIdx);
  const foreignKey = atIdx === -1 ? undefined : body.slice(atIdx + 1);

  if (!target) return null;
  return compact({ type, target, foreignKey, nested, carDirect, carInverse });
}

function compact(obj: Record<string, unknown>): RelationDef {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as RelationDef;
}
