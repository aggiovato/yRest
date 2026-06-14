import type { Relations } from "../../storage/types.js";
import type { YrestOptions } from "../../config/loadOptions.js";
import { hasTemplates } from "../../utils/interpolate.js";
import type { HandlerMap } from "../../utils/handlers.js";
import type { CustomRoute } from "../../storage/types.js";

const METHOD_COLOR: Record<string, string> = {
  GET: "#3fb950",
  POST: "#58a6ff",
  PUT: "#d29922",
  PATCH: "#a371f7",
  DELETE: "#f85149",
  fn: "#f0883e",
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function badge(label: string, color: string, bg: string): string {
  return `<span class="badge" style="background:${bg};color:${color};border:1px solid ${color}40">${escapeHtml(label)}</span>`;
}

function methodBadge(method: string): string {
  const color = METHOD_COLOR[method] ?? "#7d8590";
  return badge(method, color, `${color}18`);
}

export function endpointRow(method: string, path: string, desc: string): string {
  return `
    <tr>
      <td class="method-cell">${methodBadge(method)}</td>
      <td class="path-cell"><code>${escapeHtml(path)}</code></td>
      <td class="desc-cell">${desc}</td>
    </tr>`;
}

export function resourceAccordion(name: string, base: string, isOpen: boolean): string {
  const p = `${base}/${name}`;
  const singular = name.endsWith("s") ? name.slice(0, -1) : name;
  const rows = [
    endpointRow(
      "GET",
      p,
      `List all ${name}. Supports filters, sort, pagination and <code>?_expand</code>.`
    ),
    endpointRow(
      "POST",
      p,
      `Create a new ${singular}. Auto-assigns <code>id</code> if not provided.`
    ),
    endpointRow("GET", `${p}/:id`, `Get a single ${singular} by id.`),
    endpointRow(
      "PUT",
      `${p}/:id`,
      `Fully replace a ${singular}. Original <code>id</code> is always preserved.`
    ),
    endpointRow(
      "PATCH",
      `${p}/:id`,
      `Partially update a ${singular} — only provided fields change.`
    ),
    endpointRow("DELETE", `${p}/:id`, `Delete a ${singular} and return it as confirmation.`),
  ].join("");

  return `
  <details class="resource-card" ${isOpen ? "open" : ""}>
    <summary>
      <span class="resource-name">/${escapeHtml(name)}</span>
      <span class="route-count">6 routes</span>
    </summary>
    <table>
      <tbody>${rows}</tbody>
    </table>
  </details>`;
}

export function nestedRoutesAccordion(relations: Relations, base: string): string {
  const rows: string[] = [];

  for (const [source, fields] of Object.entries(relations)) {
    for (const [key, def] of Object.entries(fields)) {
      if (def.type === "many2many") {
        const path = `${base}/${source}/:id/${key}`;
        const singular = source.endsWith("s") ? source.slice(0, -1) : source;
        rows.push(
          endpointRow(
            "GET",
            path,
            `List ${def.target} linked to a ${singular} via ${def.through}. ${badge("many2many", "#818cf8", "#818cf818")}`
          )
        );
      } else {
        const path = `${base}/${def.target}/:id/${source}`;
        const parentSingular = def.target.endsWith("s") ? def.target.slice(0, -1) : def.target;
        const typeBadge =
          def.type === "one2one" ? ` ${badge("one2one", "#34d399", "#34d39918")}` : "";
        rows.push(
          endpointRow(
            "GET",
            path,
            `${def.type === "one2one" ? "Get" : "List"} ${source} belonging to a ${parentSingular}.${typeBadge}`
          )
        );
      }
    }
  }

  if (!rows.length) return "";

  return `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Nested routes</span>
      <span class="route-count">${rows.length} route${rows.length !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>${rows.join("")}</tbody></table>
  </details>`;
}

export function snapshotAccordion(): string {
  return `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">/_snapshot</span>
      <span class="route-count">3 routes</span>
    </summary>
    <table><tbody>
      ${endpointRow("GET", "/_snapshot", "Returns metadata of the current snapshot: <code>savedAt</code> and item counts per collection.")}
      ${endpointRow("POST", "/_snapshot/save", "Replaces the stored snapshot with the current database state.")}
      ${endpointRow("POST", "/_snapshot/reset", "Restores the database to the last saved snapshot and persists to disk.")}
    </tbody></table>
  </details>`;
}

export function customRoutesAccordion(
  routes: CustomRoute[],
  base: string,
  handlers: HandlerMap
): string {
  if (!routes.length) return "";

  const rows = routes.map((r) => {
    const fullPath = `${base}${r.path}`;
    const tags: string[] = [];

    if (r.error) tags.push(`<span style="color:#f85149;font-size:11px">error·${r.error}</span>`);
    if (r.delay && r.delay > 0)
      tags.push(`<span style="color:#fb923c;font-size:11px">delay·${r.delay}ms</span>`);
    if (r.scenarios?.length) {
      const hasOr = r.scenarios.some((s) => Array.isArray(s.when));
      tags.push(
        `<span style="color:#a371f7;font-size:11px">scenarios·${r.scenarios.length}${hasOr ? " (OR)" : ""}</span>`
      );
    }
    if (r.otherwise)
      tags.push(`<span style="color:var(--text-muted);font-size:11px">otherwise</span>`);

    let desc: string;
    if (r.error) {
      desc = `Error injection — <code>${r.error}</code>`;
    } else if (r.handler) {
      const found = handlers.has(r.handler);
      const handlerName = escapeHtml(r.handler);
      desc = found
        ? `Handler — <code>${handlerName}()</code>`
        : `Handler — <code>${handlerName}()</code> <span style="color:#f85149">(not loaded)</span>`;
    } else if (r.scenarios?.length) {
      const hasTemplateInScenarios =
        r.scenarios.some((s) => s.response.body != null && hasTemplates(s.response.body)) ||
        (r.otherwise?.body != null && hasTemplates(r.otherwise.body));
      desc = hasTemplateInScenarios ? `Scenarios — <code>{{…}}</code>` : `Scenarios`;
    } else if (r.response?.body != null && hasTemplates(r.response.body)) {
      desc = `Dynamic — <code>{{…}}</code>`;
    } else {
      const status = r.response?.status ?? 200;
      desc = `Static — <code>${status}</code>${r.response?.headers ? ` + headers` : ""}`;
    }

    if (tags.length) desc += `&ensp;${tags.join("&ensp;")}`;
    return endpointRow(r.method?.toUpperCase() ?? "GET", fullPath, desc);
  });

  return `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Custom routes</span>
      <span class="route-count">${routes.length} route${routes.length !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>
      ${rows.join("")}
    </tbody></table>
  </details>`;
}

export function handlersAccordion(
  handlers: HandlerMap,
  routes: CustomRoute[],
  base: string
): string {
  if (!handlers.size) return "";

  const routesByHandler = new Map<string, { method: string; path: string }[]>();
  for (const r of routes) {
    if (r.handler) {
      const list = routesByHandler.get(r.handler) ?? [];
      list.push({ method: (r.method ?? "GET").toUpperCase(), path: `${base}${r.path}` });
      routesByHandler.set(r.handler, list);
    }
  }

  const rows = [...handlers.keys()].map((name) => {
    const linked = routesByHandler.get(name);
    const routeDesc = linked
      ? linked.map((r) => `<code>${r.method} ${r.path}</code>`).join(", ")
      : `<span style="color:var(--text-muted)">not referenced in _routes</span>`;
    return endpointRow("fn" as string, name + "()", routeDesc);
  });

  return `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Handlers</span>
      <span class="route-count">${handlers.size} function${handlers.size !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>
      ${rows.join("")}
    </tbody></table>
  </details>`;
}

export function examplesBlock(
  collections: string[],
  relations: Relations,
  base: string,
  host: string,
  options: YrestOptions,
  firstCustomRoute?: { method?: string; path?: string }
): string {
  const examples: string[] = [];
  const firstCol = collections[0];

  if (firstCol) {
    const p = `${host}${base}/${firstCol}`;
    const singular = firstCol.endsWith("s") ? firstCol.slice(0, -1) : firstCol;
    examples.push(
      `# List all ${firstCol}\ncurl ${p}`,
      `# Filter by field\ncurl "${p}?name=value"`,
      `# Sort and paginate\ncurl "${p}?_sort=id&_order=desc&_page=1&_limit=5"`,
      `# Get single ${singular}\ncurl ${p}/1`,
      `# Create ${singular}\ncurl -X POST ${p} \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"example"}'`,
      `# Partially update ${singular}\ncurl -X PATCH ${p}/1 \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"updated"}'`,
      `# Delete ${singular}\ncurl -X DELETE ${p}/1`
    );
  }

  const firstRel = Object.entries(relations)[0];
  if (firstRel) {
    const [child, fields] = firstRel;
    const firstField = Object.entries(fields)[0];
    if (firstField) {
      const [fk, def] = firstField;
      if (def.type !== "many2many") {
        const expandKey = fk.replace(/Id$/i, "");
        examples.push(
          `# Embed parent with ?_expand\ncurl "${host}${base}/${child}/1?_expand=${expandKey}"`,
          `# Nested resource\ncurl ${host}${base}/${def.target}/1/${child}`
        );
      } else {
        examples.push(`# Many-to-many embed\ncurl "${host}${base}/${child}/1/${fk}"`);
      }
    }
  }

  if (options.pageable.enabled && firstCol) {
    examples.push(`# Pageable envelope\ncurl "${host}${base}/${firstCol}?_page=2"`);
  }

  if (firstCol) {
    examples.push(
      `# Project fields with ?_fields\ncurl "${host}${base}/${firstCol}?_fields=id,name"`
    );
  }

  const firstParentRel = Object.entries(relations).find(([, fields]) =>
    Object.values(fields).some((def) => def.type !== "many2many" && def.target === firstCol)
  );
  if (firstParentRel && firstCol) {
    const [childName] = firstParentRel;
    examples.push(
      `# Embed child collection with ?_embed\ncurl "${host}${base}/${firstCol}/1?_embed=${childName}"`
    );
  }

  if (options.snapshot) {
    examples.push(
      `# Snapshot endpoints\ncurl ${host}/_snapshot\ncurl -X POST ${host}/_snapshot/save\ncurl -X POST ${host}/_snapshot/reset`
    );
  }

  if (firstCustomRoute) {
    const method = firstCustomRoute.method?.toUpperCase() ?? "GET";
    const fullPath = `${host}${base}${escapeHtml(firstCustomRoute.path ?? "")}`;
    const curlFlag = method === "GET" ? "" : `-X ${method} `;
    examples.push(`# Custom route\ncurl ${curlFlag}${fullPath}`);
  }

  const highlighted = examples
    .map((e) => e.replace(/^(#.+)$/gm, '<span class="cm">$1</span>'))
    .join("\n\n");

  return `<pre>${highlighted}</pre>`;
}
