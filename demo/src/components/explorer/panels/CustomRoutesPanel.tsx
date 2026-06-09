import { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { ApiLog } from '../../ui/ApiLog';
import type { ApiCallLog } from '../../../context/AppContext';

export function CustomRoutesPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);

  async function tryHealth() {
    const r = await fetchApi('GET', '/health');
    setLog({ method: 'GET', url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  async function tryLogout() {
    const r = await fetchApi('POST', '/auth/logout', {});
    setLog({ method: 'POST', url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        Static routes defined in the <code>_routes</code> block of <code>db.yml</code>.
        The response is fixed — no server logic. Registered before resource routes,
        so they take priority over any same-name collection.
      </p>
      <div className="btn-try-group">
        <button className="btn-try" onClick={tryHealth}>GET /api/health →</button>
        <button className="btn-try" onClick={tryLogout}>POST /api/auth/logout →</button>
      </div>
      <ApiLog log={log} emptyMessage="Click one of the buttons..." />
    </>
  );
}
