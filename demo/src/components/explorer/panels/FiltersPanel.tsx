import { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { ApiLog } from '../../ui/ApiLog';
import type { ApiCallLog } from '../../../context/AppContext';

export function FiltersPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [done, setDone] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');

  async function handleTry() {
    const p = new URLSearchParams();
    if (done) p.set('done', done);
    if (priority) p.set('priority', priority);
    if (q.trim()) p.set('_q', q.trim());
    const r = await fetchApi('GET', `/todos?${p}`);
    setLog({ method: 'GET', url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        Filter by exact field (<code>?done=true</code>), operators (<code>?priority_ne=low</code>),
        or full-text search (<code>?_q=term</code>). Multiple values on the same field act as OR.
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">done</span>
          <select className="ex-select" value={done} onChange={e => setDone(e.target.value)}>
            <option value="">(any)</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div className="ex-field">
          <span className="ex-label">priority</span>
          <select className="ex-select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="">(any)</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </div>
        <div className="ex-field">
          <span className="ex-label">_q (full-text)</span>
          <input
            className="ex-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="search..."
            style={{ width: '150px' }}
          />
        </div>
        <button className="btn-try" onClick={handleTry}>Try it →</button>
      </div>
      <ApiLog log={log} emptyMessage="Configure filters and click Try it..." />
    </>
  );
}
