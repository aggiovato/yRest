import { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import type { ApiCallLog } from "../../../context/AppContext";

/**
 * Handlers tab — demonstrates GET /stats and GET /summary, both backed by
 * JavaScript functions in yrest.handlers.js referenced from _routes.
 */
export function HandlersPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function call(method: string, path: string) {
    setLoading(path);
    const r = await fetchApi(method, path);
    setLog({ method, url: r.url, status: r.status, data: r.data, ts: Date.now() });
    setLoading(null);
  }

  return (
    <>
      <p className="feature-desc">
        JavaScript functions in <code>yrest.handlers.js</code> referenced by name in{" "}
        <code>_routes</code>. Handlers have access to <code>req.params</code>,{" "}
        <code>req.query</code>, <code>req.body</code>, and <code>req.headers</code>.
      </p>
      <pre
        className="hint"
        style={{ whiteSpace: "pre", overflowX: "auto" }}
      >{`# db.yml — _routes entries that use handlers
  - method: GET
    path: /stats
    handler: stats      # → export async function stats(_req)

  - method: GET
    path: /summary
    handler: summary    # → export async function summary(_req)`}</pre>
      <div className="btn-try-group">
        <button
          className="btn-try"
          onClick={() => call("GET", "/stats")}
          disabled={loading === "/stats"}
        >
          GET /api/stats →
        </button>
        <button
          className="btn-try"
          onClick={() => call("GET", "/summary")}
          disabled={loading === "/summary"}
        >
          GET /api/summary →
        </button>
      </div>
      <ApiLog log={log} emptyMessage="Click a button to call a handler..." />
    </>
  );
}
