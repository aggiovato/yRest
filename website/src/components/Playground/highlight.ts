import { parse as yamlParse } from "yaml";
import { extractCollections, validateRelations, validateRoutes } from "./validate";

// ── Reserved yRest keys ────────────────────────────────────────────────────
const YREST_KEYS = new Set([
  "_rel",
  "_routes",
  "_schema",
  "_type",
  "_target",
  "_foreignKey",
  "_otherKey",
  "_primaryKey",
  "_car-direct",
  "_car-inverse",
  "_nested",
  "_through",
  "_method",
  "_path",
  "_handler",
  "_delay",
  "_error",
  "_errorBody",
  "_response",
  "_otherwise",
  "_scenarios",
  "_when",
  "_status",
  "_body",
  "_headers",
  "_sse",
  "_interval",
  "_loop",
  "_repeat",
  "_events",
  "_event",
  "_data",
]);

// ── Token patterns ─────────────────────────────────────────────────────────
const KEY_RE = /^([ \t]*(?:-[ \t]*)?)([_a-zA-Z][a-zA-Z0-9_-]*)(?=[ \t]*:)/;
const REL_RE = /\b(many2one|one2many|one2one|many2many)\b/g;
const DSL_TYPE_RE = /\b(m2o|o2m|o2o|m2m)(?=:)/g;
const CAR_RE = /\b([01]\.\.[1n])\b/g;
const TPL_RE = /\{\{[^}]+\}\}/g;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Range = { from: number; to: number; style: string; pri: number };

// Sweep-line merge: produces non-overlapping segments with combined styles.
function mergeRanges(ranges: Range[]): Array<{ from: number; to: number; style: string }> {
  if (!ranges.length) return [];

  const events: Array<{ pos: number; open: boolean; idx: number }> = [];
  ranges.forEach((r, i) => {
    events.push({ pos: r.from, open: true, idx: i });
    events.push({ pos: r.to, open: false, idx: i });
  });
  // Sort by position; on ties close-events come before open-events
  events.sort((a, b) => (a.pos !== b.pos ? a.pos - b.pos : a.open ? 1 : -1));

  const result: Array<{ from: number; to: number; style: string }> = [];
  // active set sorted by priority (ascending = higher visual priority first)
  const active: number[] = [];
  let pos = 0;

  for (const ev of events) {
    if (ev.pos > pos && active.length > 0) {
      // Sort active by pri so higher-priority ranges contribute their color,
      // lower-priority ranges contribute their decoration, etc.
      const sorted = active.slice().sort((a, b) => ranges[a].pri - ranges[b].pri);
      const style = sorted.map((i) => ranges[i].style).join(";");
      result.push({ from: pos, to: ev.pos, style });
    }
    pos = ev.pos;
    if (ev.open) {
      active.push(ev.idx);
    } else {
      const i = active.indexOf(ev.idx);
      if (i !== -1) active.splice(i, 1);
    }
  }
  return result;
}

function applyRanges(text: string, ranges: Range[]): string {
  const segments = mergeRanges(ranges);
  let html = "";
  let pos = 0;
  for (const { from, to, style } of segments) {
    html += esc(text.slice(pos, from));
    html += `<span style="${style}">${esc(text.slice(from, to))}</span>`;
    pos = to;
  }
  return html + esc(text.slice(pos));
}

// ── Lint issue type ────────────────────────────────────────────────────────
export interface LintIssue {
  severity: "error" | "warning";
  message: string;
  line: number; // 1-based line number in the source
  token: string; // exact string to underline (may be "")
}

function highlightLine(line: string, lineIssues: LintIssue[] = []): string {
  if (!line.trim()) return esc(line);

  // Comment line
  if (/^\s*#/.test(line)) {
    return `<span style="color:#8b949e;font-style:italic">${esc(line)}</span>`;
  }

  // YAML document markers
  if (/^---\s*$|^\.\.\.\s*$/.test(line)) {
    return `<span style="color:#8b949e">${esc(line)}</span>`;
  }

  const ranges: Range[] = [];

  // Key — priority 0 (highest color)
  const km = KEY_RE.exec(line);
  if (km) {
    const start = km[1].length;
    const end = start + km[2].length;
    const style = YREST_KEYS.has(km[2]) ? "color:#79c0ff;font-weight:600" : "color:#7ee787";
    ranges.push({ from: start, to: end, style, pri: 0 });
  }

  // Template variables — priority 1
  TPL_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = TPL_RE.exec(line)); ) {
    ranges.push({ from: m.index, to: m.index + m[0].length, style: "color:#7ce38b", pri: 1 });
  }

  // Relation type names — priority 2
  REL_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = REL_RE.exec(line)); ) {
    ranges.push({ from: m.index, to: m.index + m[0].length, style: "color:#d2a8ff", pri: 2 });
  }

  // DSL type aliases (m2o, o2m, etc.) — priority 2
  DSL_TYPE_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = DSL_TYPE_RE.exec(line)); ) {
    ranges.push({ from: m.index, to: m.index + m[1].length, style: "color:#d2a8ff", pri: 2 });
  }

  // Cardinality notation — priority 2
  CAR_RE.lastIndex = 0;
  for (let m: RegExpExecArray | null; (m = CAR_RE.exec(line)); ) {
    ranges.push({ from: m.index, to: m.index + m[1].length, style: "color:#e3b341", pri: 2 });
  }

  // Inline lint decorations — priority 10 (lowest, stacks with color ranges)
  for (const { token, severity } of lineIssues) {
    if (!token) continue;
    const idx = line.indexOf(token);
    if (idx === -1) continue;
    const color = severity === "error" ? "#f85149" : "#d29922";
    ranges.push({
      from: idx,
      to: idx + token.length,
      style: `text-decoration:underline wavy ${color};text-underline-offset:2px`,
      pri: 10,
    });
  }

  return applyRanges(line, ranges);
}

export function highlightYaml(code: string, issues: LintIssue[] = []): string {
  const byLine = new Map<number, LintIssue[]>();
  for (const issue of issues) {
    if (!byLine.has(issue.line)) byLine.set(issue.line, []);
    byLine.get(issue.line)!.push(issue);
  }
  return code
    .split("\n")
    .map((line, i) => highlightLine(line, byLine.get(i + 1) ?? []))
    .join("\n");
}

// ── Lint ───────────────────────────────────────────────────────────────────

function findTokenLine(code: string, token: string): number {
  if (!token) return 1;
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(token)) return i + 1;
  }
  return 1;
}

export function lintYaml(code: string): LintIssue[] {
  if (!code.trim()) return [];
  let data: Record<string, unknown>;
  try {
    const parsed = yamlParse(code);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    data = parsed as Record<string, unknown>;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    let line = 1;
    const lineMatch = msg.match(/line (\d+)/i);
    if (lineMatch) line = parseInt(lineMatch[1], 10);
    return [{ severity: "error", message: `YAML: ${msg}`, line, token: "" }];
  }
  const collections = extractCollections(data);
  return [...validateRelations(data, collections), ...validateRoutes(data)].map((i) => ({
    severity: "warning" as const,
    message: i.message,
    line: findTokenLine(code, i.token),
    token: i.token,
  }));
}
