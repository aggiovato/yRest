import { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import type { ApiCallLog } from "../../../context/AppContext";

export function SortPagePanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState("1");
  const [limit, setLimit] = useState("3");

  async function handleTry() {
    const p = new URLSearchParams({ _sort: sort, _order: order, _page: page, _limit: limit });
    const r = await fetchApi("GET", `/todos?${p}`);
    setLog({
      method: "GET",
      url: r.url,
      status: r.status,
      data: r.data,
      total: r.total,
      ts: Date.now(),
    });
  }

  return (
    <>
      <p className="feature-desc">
        Sort with <code>?_sort=field&amp;_order=asc|desc</code>. Paginate with{" "}
        <code>?_page=N&amp;_limit=N</code>. The <code>X-Total-Count</code> header returns the
        unpaginated total.
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">_sort</span>
          <select className="ex-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="createdAt">createdAt</option>
            <option value="title">title</option>
            <option value="priority">priority</option>
          </select>
        </div>
        <div className="ex-field">
          <span className="ex-label">_order</span>
          <select className="ex-select" value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </div>
        <div className="ex-field">
          <span className="ex-label">_page</span>
          <input
            className="ex-input"
            type="number"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            min="1"
            style={{ width: "60px" }}
          />
        </div>
        <div className="ex-field">
          <span className="ex-label">_limit</span>
          <input
            className="ex-input"
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min="1"
            max="20"
            style={{ width: "60px" }}
          />
        </div>
        <button className="btn-try" onClick={handleTry}>
          Try it →
        </button>
      </div>
      <ApiLog log={log} emptyMessage="Configure sort and pagination, then click Try it..." />
    </>
  );
}
