import { parseRelations, type Relations } from "./parseRelations";
import { RESERVED_KEYS } from "./constants";

export type ERField = {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
  required: boolean;
};

export type EREntity = {
  name: string;
  fields: ERField[];
  isPivot: boolean;
};

export type ERRelation = {
  source: string;
  target: string;
  type: "many2one" | "one2one" | "many2many";
  label: string;
  through?: string;
  foreignKey?: string;
  otherKey?: string;
  carDirect?: string;
  carInverse?: string;
  fkCarDirect?: string;
  fkCarInverse?: string;
  otherCarDirect?: string;
  otherCarInverse?: string;
};

export type ERData = {
  entities: EREntity[];
  relations: ERRelation[];
};

function inferType(value: unknown): string {
  if (value === null || value === undefined) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "string";
}

export function generateERData(raw: Record<string, unknown>): ERData {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!RESERVED_KEYS.has(key) && Array.isArray(val)) {
      data[key] = val as Record<string, unknown>[];
    }
  }

  const relations: Relations = parseRelations(raw["_rel"]);
  const schema =
    (raw["_schema"] as
      | Record<string, Record<string, { type?: string; required?: boolean }>>
      | undefined) ?? {};

  const pivotTables = new Set<string>();
  const pivotFKs = new Map<string, Set<string>>();
  for (const fields of Object.values(relations)) {
    for (const def of Object.values(fields)) {
      if (def.type === "many2many") {
        pivotTables.add(def.through);
        if (!pivotFKs.has(def.through)) pivotFKs.set(def.through, new Set());
        pivotFKs.get(def.through)!.add(def.foreignKey);
        pivotFKs.get(def.through)!.add(def.otherKey);
      }
    }
  }

  const fkFields = new Map<string, Set<string>>();
  for (const [source, fields] of Object.entries(relations)) {
    for (const [key, def] of Object.entries(fields)) {
      if (def.type !== "many2many") {
        if (!fkFields.has(source)) fkFields.set(source, new Set());
        fkFields.get(source)!.add(key);
      }
    }
  }

  const entities: EREntity[] = Object.entries(data).map(([name, items]) => {
    const sample = (items[0] ?? {}) as Record<string, unknown>;
    const schemaFields = schema[name] ?? {};
    const allFields = new Set([...Object.keys(sample), ...Object.keys(schemaFields)]);

    const fields: ERField[] = [...allFields].map((fieldName) => ({
      name: fieldName,
      type: (schemaFields[fieldName]?.type ?? inferType(sample[fieldName])) as string,
      pk: fieldName === "id",
      fk: fkFields.get(name)?.has(fieldName) ?? false,
      required: schemaFields[fieldName]?.required ?? false,
    }));

    fields.sort((a, b) => {
      if (a.pk) return -1;
      if (b.pk) return 1;
      if (a.fk && !b.fk) return 1;
      if (!a.fk && b.fk) return -1;
      return 0;
    });

    return { name, fields, isPivot: pivotTables.has(name) };
  });

  const erRelations: ERRelation[] = [];
  for (const [source, fields] of Object.entries(relations)) {
    for (const [key, def] of Object.entries(fields)) {
      if (def.type === "many2many") {
        const throughRels = relations[def.through] ?? {};
        const fkRel = throughRels[def.foreignKey];
        const otherRel = throughRels[def.otherKey];
        erRelations.push({
          source,
          target: def.target,
          type: "many2many",
          label: def.through,
          through: def.through,
          foreignKey: def.foreignKey,
          otherKey: def.otherKey,
          fkCarDirect: fkRel?.carDirect,
          fkCarInverse: fkRel?.carInverse,
          otherCarDirect: otherRel?.carDirect,
          otherCarInverse: otherRel?.carInverse,
        });
      } else {
        if (pivotFKs.get(source)?.has(key)) continue;
        erRelations.push({
          source,
          target: def.target,
          type: def.type,
          label: key,
          carDirect: def.carDirect,
          carInverse: def.carInverse,
        });
      }
    }
  }

  return { entities, relations: erRelations };
}
