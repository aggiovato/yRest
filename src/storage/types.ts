export type Resource = Record<string, unknown>;

export type DbData = Record<string, Resource[]>;

export type Relations = Record<string, Record<string, string>>;
