import { useServerStatus } from "../hooks/useServerStatus";

export function AppHeader() {
  const connected = useServerStatus();

  return (
    <header className="app-header">
      <img src="/logo-text.png" alt="yRest" className="app-logo" />
      <span className="header-sep">·</span>
      <span className="app-subtitle">todo list demo</span>
      <div className={`server-status ${connected ? "connected" : "disconnected"}`}>
        <span className="status-dot">●</span>
        <span>{connected ? "connected · localhost:3070" : "disconnected — run npm run api"}</span>
      </div>
    </header>
  );
}
