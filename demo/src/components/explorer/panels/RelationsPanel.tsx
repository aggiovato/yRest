import { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import type { ApiCallLog } from "../../../context/AppContext";

export function RelationsPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);

  async function tryExpand() {
    const r = await fetchApi("GET", "/todos?_expand=user&_limit=3");
    setLog({ method: "GET", url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  async function tryEmbed() {
    const r = await fetchApi("GET", "/users/1?_embed=todos");
    setLog({ method: "GET", url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  async function tryNested() {
    const r = await fetchApi("GET", "/users/1/todos");
    setLog({ method: "GET", url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        <code>?_expand=user</code> expands the parent object (to-do → user via <code>userId</code>{" "}
        defined in <code>_rel</code>). <code>?_embed=todos</code> embeds children (user → todos).{" "}
        <code>GET /api/users/:id/todos</code> is the auto-generated nested route.
      </p>
      <div className="btn-try-group">
        <button className="btn-try" onClick={tryExpand}>
          GET /api/todos?_expand=user →
        </button>
        <button className="btn-try" onClick={tryEmbed}>
          GET /api/users/1?_embed=todos →
        </button>
        <button className="btn-try" onClick={tryNested}>
          GET /api/users/1/todos →
        </button>
      </div>
      <ApiLog log={log} emptyMessage="Click one of the buttons..." />
    </>
  );
}
