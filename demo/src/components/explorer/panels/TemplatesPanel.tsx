import { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import type { ApiCallLog } from "../../../context/AppContext";

export function TemplatesPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [id, setId] = useState("1");

  async function handleTry() {
    const r = await fetchApi("GET", `/todos/${id}/share`);
    setLog({ method: "GET", url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        Interpolate request data into the static response body: <code>{"{{params.id}}"}</code>,{" "}
        <code>{"{{now}}"}</code>, <code>{"{{uuid}}"}</code>, <code>{"{{query.x}}"}</code>,{" "}
        <code>{"{{body.x}}"}</code>. The <code>uuid</code> is different on every request.
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">Todo ID</span>
          <input
            className="ex-input"
            type="number"
            value={id}
            onChange={(e) => setId(e.target.value)}
            min="1"
            style={{ width: "70px" }}
          />
        </div>
        <button className="btn-try" onClick={handleTry}>
          GET /api/todos/:id/share →
        </button>
      </div>
      <ApiLog log={log} emptyMessage="Enter an ID and click the button..." />
    </>
  );
}
