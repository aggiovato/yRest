import { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { ApiLog } from '../../ui/ApiLog';
import type { ApiCallLog } from '../../../context/AppContext';

export function HandlersPanel() {
  const [log, setLog] = useState<ApiCallLog | null>(null);
  const [email, setEmail] = useState('ana@demo.com');
  const [password, setPassword] = useState('demo123');

  async function handleLogin() {
    const r = await fetchApi('POST', '/auth/login', { email, password });
    setLog({ method: 'POST', url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  async function handleStats() {
    const r = await fetchApi('GET', '/stats');
    setLog({ method: 'GET', url: r.url, status: r.status, data: r.data, ts: Date.now() });
  }

  return (
    <>
      <p className="feature-desc">
        JavaScript functions exported from <code>yrest.handlers.js</code> and referenced by name
        in <code>_routes</code>. They have access to <code>req.params</code>,{' '}
        <code>req.query</code>, <code>req.body</code>, and <code>req.headers</code>.
        The response can contain real logic.
      </p>
      <p className="hint">
        Credentials: <strong>ana@demo.com</strong> / <strong>demo123</strong>
        &nbsp;·&nbsp;
        <strong>luis@demo.com</strong> / <strong>demo123</strong>
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">email</span>
          <input
            className="ex-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '190px' }}
          />
        </div>
        <div className="ex-field">
          <span className="ex-label">password</span>
          <input
            className="ex-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '120px' }}
          />
        </div>
        <button className="btn-try" onClick={handleLogin}>POST /api/auth/login →</button>
        <button className="btn-try" onClick={handleStats}>GET /api/stats →</button>
      </div>
      <ApiLog log={log} emptyMessage="Click one of the buttons..." />
    </>
  );
}
