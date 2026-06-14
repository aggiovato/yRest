import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { YrestStorage } from "../../storage/types.js";
import type { YrestOptions } from "../../config/loadOptions.js";
import type { HandlerMap } from "../../utils/handlers.js";
import { hasTemplates } from "../../utils/interpolate.js";

const _dir = dirname(fileURLToPath(import.meta.url));
const LOGO_SRC = (() => {
  try {
    const buf = readFileSync(join(_dir, "../../assets/logo-color.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
})();

const METHOD_COLOR: Record<string, string> = {
  GET: "#3fb950",
  POST: "#58a6ff",
  PUT: "#d29922",
  PATCH: "#a371f7",
  DELETE: "#f85149",
  fn: "#f0883e",
};

function badge(label: string, color: string, bg: string): string {
  return `<span class="badge" style="background:${bg};color:${color};border:1px solid ${color}40">${label}</span>`;
}

function methodBadge(method: string): string {
  const color = METHOD_COLOR[method] ?? "#7d8590";
  return badge(method, color, `${color}18`);
}

function endpointRow(method: string, path: string, desc: string): string {
  return `
    <tr>
      <td class="method-cell">${methodBadge(method)}</td>
      <td class="path-cell"><code>${path}</code></td>
      <td class="desc-cell">${desc}</td>
    </tr>`;
}

function resourceAccordion(name: string, base: string, isOpen: boolean): string {
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
      <span class="resource-name">/${name}</span>
      <span class="route-count">6 routes</span>
    </summary>
    <table>
      <tbody>${rows}</tbody>
    </table>
  </details>`;
}

function examplesBlock(
  collections: string[],
  relations: Record<string, Record<string, string>>,
  base: string,
  host: string,
  options: YrestOptions,
  firstCustomRoute?: { method?: string; path?: string } | undefined
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
    const fk = Object.keys(fields)[0]!;
    const expandKey = fk.replace(/Id$/i, "");
    examples.push(
      `# Embed parent with ?_expand\ncurl "${host}${base}/${child}/1?_expand=${expandKey}"`
    );
  }

  const firstRelEntry = Object.entries(relations)[0];
  if (firstRelEntry) {
    const [child, fields] = firstRelEntry;
    const parent = Object.values(fields)[0];
    if (parent) {
      examples.push(`# Nested resource\ncurl ${host}${base}/${parent}/1/${child}`);
    }
  }

  if (options.pageable.enabled && firstCol) {
    examples.push(`# Pageable envelope\ncurl "${host}${base}/${firstCol}?_page=2"`);
  }

  const firstParentRel = Object.entries(relations).find(([, fields]) =>
    Object.values(fields).includes(firstCol ?? "")
  );
  if (firstCol) {
    examples.push(
      `# Project fields with ?_fields\ncurl "${host}${base}/${firstCol}?_fields=id,name"`
    );
  }

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
    const fullPath = `${host}${base}${firstCustomRoute.path}`;
    const curlFlag = method === "GET" ? "" : `-X ${method} `;
    examples.push(`# Custom route\ncurl ${curlFlag}${fullPath}`);
  }

  const highlighted = examples
    .map((e) => e.replace(/^(#.+)$/gm, '<span class="cm">$1</span>'))
    .join("\n\n");

  return `<pre>${highlighted}</pre>`;
}

/**
 * Generates the full HTML string for the `/_about` page.
 *
 * The output is self-contained (inline CSS, no external dependencies) and
 * reflects the live state of `storage` and `options` at the moment of the call.
 *
 * @param storage - Live YAML storage to derive collections and relations from.
 * @param options - Resolved server options for mode display and config info.
 * @param handlers - Map of named handler functions loaded from yrest.handlers.js.
 * @returns Complete HTML document as a string.
 */
export function generateAboutHtml(
  storage: YrestStorage,
  options: YrestOptions,
  handlers: HandlerMap = new Map()
): string {
  const collections = Object.keys(storage.getData());
  const relations = storage.getRelations();
  const base = options.base;
  const host = `http://${options.host}:${options.port}`;

  // ── Mode badges ─────────────────────────────────────────────────────────────
  const modes: string[] = [];
  if (options.watch) modes.push(badge("watch", "#38bdf8", "#38bdf818"));
  if (options.readonly) modes.push(badge("readonly", "#94a3b8", "#94a3b818"));
  if (options.delay > 0) modes.push(badge(`delay · ${options.delay}ms`, "#fb923c", "#fb923c18"));
  if (options.pageable.enabled)
    modes.push(badge(`pageable · limit ${options.pageable.limit}`, "#34d399", "#34d39918"));
  if (options.snapshot) modes.push(badge("snapshot", "#c084fc", "#c084fc18"));
  if (handlers.size > 0) modes.push(badge(`handlers · ${handlers.size}`, "#f0883e", "#f0883e18"));

  // ── Resource accordions ──────────────────────────────────────────────────────
  const accordions = collections.map((col, i) => resourceAccordion(col, base, i === 0)).join("");

  // ── Nested routes accordion ──────────────────────────────────────────────────
  const nestedRows: string[] = [];
  for (const [child, fields] of Object.entries(relations)) {
    for (const [, parent] of Object.entries(fields)) {
      const nestedPath = `${base}/${parent}/:id/${child}`;
      const parentSingular = parent.endsWith("s") ? parent.slice(0, -1) : parent;
      nestedRows.push(
        endpointRow("GET", nestedPath, `List ${child} belonging to a ${parentSingular}.`)
      );
    }
  }

  const nestedAccordion = nestedRows.length
    ? `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Nested routes</span>
      <span class="route-count">${nestedRows.length} route${nestedRows.length !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>${nestedRows.join("")}</tbody></table>
  </details>`
    : "";

  // ── Snapshot accordion ───────────────────────────────────────────────────────
  const snapshotAccordion = options.snapshot
    ? `
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
  </details>`
    : "";

  // ── Custom routes accordion ──────────────────────────────────────────────────
  const customRoutes = storage.getRoutes();
  const customRoutesAccordion = customRoutes.length
    ? `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Custom routes</span>
      <span class="route-count">${customRoutes.length} route${customRoutes.length !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>
      ${customRoutes
        .map((r) => {
          const fullPath = `${base}${r.path}`;

          const tags: string[] = [];
          if (r.delay && r.delay > 0) {
            tags.push(`<span style="color:#fb923c;font-size:11px">delay·${r.delay}ms</span>`);
          }
          if (r.scenarios?.length) {
            const hasOr = r.scenarios.some((s) => Array.isArray(s.when));
            tags.push(
              `<span style="color:#a371f7;font-size:11px">scenarios·${r.scenarios.length}${hasOr ? " (OR)" : ""}</span>`
            );
          }
          if (r.otherwise) {
            tags.push(`<span style="color:var(--text-muted);font-size:11px">otherwise</span>`);
          }

          let desc: string;
          if (r.handler) {
            const found = handlers.has(r.handler);
            desc = found
              ? `Handler — <code>${r.handler}()</code>`
              : `Handler — <code>${r.handler}()</code> <span style="color:#f85149">(not loaded)</span>`;
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
        })
        .join("")}
    </tbody></table>
  </details>`
    : "";

  // ── Handlers accordion ───────────────────────────────────────────────────────
  const routesByHandler = new Map<string, { method: string; path: string }[]>();
  for (const r of customRoutes) {
    if (r.handler) {
      const list = routesByHandler.get(r.handler) ?? [];
      list.push({ method: (r.method ?? "GET").toUpperCase(), path: `${base}${r.path}` });
      routesByHandler.set(r.handler, list);
    }
  }
  const handlersAccordion =
    handlers.size > 0
      ? `
  <details class="resource-card nested-card">
    <summary>
      <span class="resource-name">Handlers</span>
      <span class="route-count">${handlers.size} function${handlers.size !== 1 ? "s" : ""}</span>
    </summary>
    <table><tbody>
      ${[...handlers.keys()]
        .map((name) => {
          const routes = routesByHandler.get(name);
          const routeDesc = routes
            ? routes.map((r) => `<code>${r.method} ${r.path}</code>`).join(", ")
            : `<span style="color:var(--text-muted)">not referenced in _routes</span>`;
          return endpointRow("fn" as string, name + "()", routeDesc);
        })
        .join("")}
    </tbody></table>
  </details>`
      : "";

  // ── Pagination description ───────────────────────────────────────────────────
  const paginationDesc = options.pageable.enabled
    ? `Pageable mode active — default limit <code>${options.pageable.limit}</code>. Response wrapped in <code>{ data, pagination }</code>.`
    : `Returns the requested slice. <code>X-Total-Count</code> header reflects the total before pagination.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>yrest — API Overview</title>
  <style>
    :root {
      --bg:        #0d1117;
      --bg-card:   #161b22;
      --bg-hover:  #1c2128;
      --bg-inset:  #0d1117;
      --border:    #30363d;
      --border-hi: #3d444d;
      --text:      #e6edf3;
      --text-muted:#7d8590;
      --accent:    #58a6ff;
      --radius:    8px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; line-height: 1.6; }

    /* ── Banner ── */
    .banner {
      width: 100%;
      background: linear-gradient(135deg, #0d1117 0%, #161b22 40%, #1a2332 100%);
      border-bottom: 1px solid var(--border);
      padding: 48px 32px 40px;
    }
    .banner-inner { max-width: 1100px; margin: 0 auto; }
    .banner h1 { font-size: clamp(36px, 6vw, 60px); font-weight: 800; letter-spacing: -2px; line-height: 1; }
    .banner h1 .y { color: var(--text); }
    .banner h1 .rest { color: var(--accent); }
    .banner p { color: var(--text-muted); margin-top: 10px; font-size: 15px; }
    .banner-meta { display: flex; gap: 24px; margin-top: 20px; flex-wrap: wrap; }
    .banner-meta span { color: var(--text-muted); font-size: 13px; }
    .banner-meta span strong { color: var(--text); font-family: monospace; }

    /* ── Layout ── */
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 48px; }
    h2 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--text-muted); margin: 32px 0 12px; }

    /* ── Cards ── */
    .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 600px) { .two-col { grid-template-columns: 1fr; } }

    /* ── Server info grid ── */
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .stat label { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); display: block; margin-bottom: 3px; }
    .stat value { font-size: 15px; font-weight: 600; font-family: monospace; color: var(--text); }

    /* ── Mode badges ── */
    .modes { display: flex; gap: 8px; flex-wrap: wrap; min-height: 28px; align-items: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }

    /* ── Endpoints grid (2 cols on wide, 1 col on narrow) ── */
    .endpoints-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    @media (max-width: 860px) { .endpoints-grid { grid-template-columns: 1fr; } }
    .nested-card { grid-column: 1 / -1; }

    /* ── Accordion (details/summary) ── */
    .resource-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: border-color .15s;
    }
    .resource-card[open] { border-color: var(--border-hi); }
    .resource-card summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 18px;
      cursor: pointer;
      user-select: none;
      list-style: none;
      gap: 8px;
    }
    .resource-card summary::-webkit-details-marker { display: none; }
    .resource-card summary::before {
      content: "›";
      color: var(--text-muted);
      font-size: 18px;
      line-height: 1;
      transition: transform .2s;
      margin-right: 4px;
      flex-shrink: 0;
    }
    .resource-card[open] summary::before { transform: rotate(90deg); }
    .resource-card summary:hover { background: var(--bg-hover); }
    .resource-name { font-family: monospace; font-size: 14px; font-weight: 600; color: var(--accent); flex: 1; }
    .route-count { font-size: 11px; color: var(--text-muted); background: var(--bg-inset); border: 1px solid var(--border); padding: 2px 8px; border-radius: 12px; white-space: nowrap; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 12px; border-top: 1px solid var(--border); vertical-align: top; font-size: 13px; }
    .method-cell { width: 78px; white-space: nowrap; }
    .path-cell { width: 44%; white-space: nowrap; }
    .desc-cell { color: var(--text-muted); }
    code { font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; background: #58a6ff15; color: var(--accent); padding: 1px 5px; border-radius: 3px; }

    /* ── Query params table ── */
    .param-table th { text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .param-table td:first-child { white-space: nowrap; width: 160px; }
    .param-table td:nth-child(2) { white-space: nowrap; width: 200px; }

    /* ── Code block ── */
    pre { background: #010409; border: 1px solid var(--border); color: #e6edf3; padding: 20px 24px; border-radius: var(--radius); font-size: 12.5px; line-height: 1.8; overflow-x: auto; font-family: "SF Mono", "Fira Code", monospace; }
    .cm { color: #3d444d; }

    /* ── Warning ── */
    .warn { background: #2d1f0e; border-left: 3px solid #d29922; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 13px; color: #d29922; margin-top: 12px; }

    /* ── Footer ── */
    footer { margin-top: 48px; text-align: center; font-size: 11px; color: var(--text-muted); padding-bottom: 16px; }
    footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>

  <div class="banner">
    <div class="banner-inner">
      ${
        LOGO_SRC
          ? `<img src="${LOGO_SRC}" alt="yRest" height="68" style="display:block;margin-bottom:0px" />`
          : `<h1><span class="y">y</span><span class="rest">Rest</span></h1>`
      }
      <p>Zero-config REST API mock server</p>
      <div class="banner-meta">
        <span>URL <strong>${host}</strong></span>
        <span>Base <strong>${base || "/"}</strong></span>
        <span>File <strong>${options.file}</strong></span>
        <span>Collections <strong>${collections.length}</strong></span>
      </div>
    </div>
  </div>

  <div class="wrap">

    <h2>Active Modes</h2>
    <div class="card">
      <div class="modes">${modes.length ? modes.join(" ") : `<span style="color:var(--text-muted);font-size:13px">none</span>`}</div>
      ${options.watch ? `<div class="warn">⚠ <strong>Watch mode:</strong> data changes in existing collections reload automatically. Adding or removing entire collections requires a server restart.</div>` : ""}
    </div>

    <h2>Endpoints</h2>
    <div class="endpoints-grid">
      ${accordions}
      ${nestedAccordion}
      ${snapshotAccordion}
      ${customRoutesAccordion}
      ${handlersAccordion}
    </div>

    <h2>Query Parameters</h2>
    <div class="card">
      <table class="param-table">
        <thead><tr><th>Param</th><th>Example</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>?field=value</code></td><td><code>?name=Ana&amp;role=admin</code></td><td>Filter by any field. Multiple params are ANDed.</td></tr>
          <tr><td><code>?field_gte / _lte</code></td><td><code>?price_gte=10&amp;price_lte=50</code></td><td>Numeric or lexicographic range. Works with any comparable field.</td></tr>
          <tr><td><code>?field_ne</code></td><td><code>?status_ne=inactive</code></td><td>Exclude items where the field equals the value.</td></tr>
          <tr><td><code>?field_like</code></td><td><code>?name_like=ana</code></td><td>Case-insensitive substring match.</td></tr>
          <tr><td><code>?field_start</code></td><td><code>?name_start=A</code></td><td>Case-insensitive prefix match.</td></tr>
          <tr><td><code>?field_regex</code></td><td><code>?email_regex=gmail</code></td><td>Case-insensitive regular expression match.</td></tr>
          <tr><td><code>?_q</code></td><td><code>?_q=ana</code></td><td>Full-text search across all scalar fields (case-insensitive substring).</td></tr>
          <tr><td><code>?_sort &amp; ?_order</code></td><td><code>?_sort=name&amp;_order=desc</code></td><td>Sort by field. <code>_order</code>: <code>asc</code> (default) or <code>desc</code>.</td></tr>
          <tr><td><code>?_page &amp; ?_limit</code></td><td><code>?_page=2&amp;_limit=10</code></td><td>${paginationDesc}</td></tr>
          <tr><td><code>?_expand</code></td><td><code>?_expand=user</code></td><td>Embed a related parent object inline. Requires <code>_rel</code> in the YAML file.</td></tr>
          <tr><td><code>?_embed</code></td><td><code>?_embed=posts</code></td><td>Embed child collections into each parent item. Requires <code>_rel</code> in the YAML file.</td></tr>
          <tr><td><code>?_fields</code></td><td><code>?_fields=id,name</code></td><td>Return only the specified fields. Applied last — can include embedded/expanded keys.</td></tr>
        </tbody>
      </table>
    </div>

    ${collections.length ? `<h2>Examples</h2><div class="card">${examplesBlock(collections, relations, base, host, options, customRoutes[0])}</div>` : ""}

    <footer>
      Powered by <a href="https://github.com/aggiovato/yRest" target="_blank">@yrest/cli</a> &nbsp;·&nbsp; <a href="/_about">/_about</a>
    </footer>

  </div>
</body>
</html>`;
}
