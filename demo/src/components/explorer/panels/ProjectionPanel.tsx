import { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import type { ApiCallLog } from "../../../context/AppContext";

export function ProjectionPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [fields, setFields] = useState("id,title,done");

  async function handleTry() {
    const p = new URLSearchParams({ _fields: fields, _limit: "4" });
    const r = await fetchApi("GET", `/todos?${p}`);
    setLog({ method: "GET", url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        <code>?_fields=field1,field2</code> projects only the requested fields in each response
        object. Useful for reducing payload size.
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">_fields</span>
          <input
            className="ex-input"
            value={fields}
            onChange={(e) => setFields(e.target.value)}
            style={{ width: "220px" }}
          />
        </div>
        <button className="btn-try" onClick={handleTry}>
          Try it →
        </button>
      </div>
      <ApiLog log={log} emptyMessage="Enter fields and click Try it..." />
    </>
  );
}
