import React, { useState } from "react";
import { fetchApi } from "../../../lib/api";
import { ApiLog } from "../../ui/ApiLog";
import { useAppContext } from "../../../context/AppContext";
import type { ApiCallLog, SessionUser } from "../../../context/AppContext";

/**
 * Auth tab panel — login form when logged out, session card when logged in.
 * Session state lives in AppContext (client-side only, no server validation).
 */
export function AuthPanel() {
  const { state, dispatch } = useAppContext();
  const session = state.session;

  const [email, setEmail] = useState("ana@demo.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<ApiCallLog | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await fetchApi("POST", "/auth/login", { email, password });
    setLoading(false);
    setLog({ method: "POST", url: r.url, status: r.status, data: r.data, ts: Date.now() });

    if (r.status === 200 && r.data) {
      const body = r.data as { user: SessionUser };
      dispatch({ type: "LOGIN", payload: body.user });
    } else {
      const body = r.data as { error?: string };
      setError(body?.error ?? "Login failed");
    }
  }

  function handleLogout() {
    dispatch({ type: "LOGOUT" });
    setLog(null);
  }

  if (session) {
    return (
      <div className="auth-logged-in">
        <div className="auth-user-card">
          <div className="auth-user-avatar">{session.avatar}</div>
          <div className="auth-user-info">
            <p className="auth-user-name">{session.name}</p>
            <p className="auth-user-email">{session.email}</p>
            <span className="auth-user-role">{session.role}</span>
          </div>
          <button className="btn-outline" onClick={handleLogout}>
            Sign out
          </button>
        </div>
        <p className="auth-note">
          You can create tasks and manage your own. Other users' tasks are read-only.
        </p>
        <ApiLog log={log} emptyMessage="Sign out to see the logout request here..." />
      </div>
    );
  }

  return (
    <div className="auth-login">
      <div className="auth-card">
        <div className="auth-card-icon">⬡</div>
        <h3 className="auth-card-title">Sign in to yrest demo</h3>
        <p className="auth-card-desc">
          Log in to create tasks and manage your own. Browse is available without an account.
        </p>
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="auth-hint">
          Demo accounts: <strong>ana@demo.com</strong> or <strong>luis@demo.com</strong> · password{" "}
          <strong>demo123</strong>
        </p>
      </div>
      <ApiLog log={log} emptyMessage="Sign in to see the response here..." />
    </div>
  );
}
