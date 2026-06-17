import type { YrestStorage } from "../../storage/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // Cardinality for the two pivot edges, read from the pivot table's own _rel declarations
  fkCarDirect?: string; // pivot.foreignKey → source: carDirect  (1 source per pivot row)
  fkCarInverse?: string; // pivot.foreignKey → source: carInverse (n pivot rows per source)
  otherCarDirect?: string; // pivot.otherKey   → target: carDirect
  otherCarInverse?: string; // pivot.otherKey   → target: carInverse
};

export type ERData = {
  entities: EREntity[];
  relations: ERRelation[];
};

// ─── Data extraction ──────────────────────────────────────────────────────────

function inferType(value: unknown): string {
  if (value === null || value === undefined) return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "string";
}

export function generateERData(storage: YrestStorage): ERData {
  const data = storage.getData();
  const relations = storage.getRelations();
  const schema = storage.getSchema();

  const pivotTables = new Set<string>();
  // FK keys on each pivot table that are already represented by many2many edges
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
    const sample = items[0] ?? {};
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
        // Skip FK relations on pivot tables already covered by their many2many edge
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
