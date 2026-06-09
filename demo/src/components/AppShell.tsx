import { AppProvider } from "../context/AppContext";
import { AppHeader } from "./AppHeader";
import { TodoApp } from "./todo/TodoApp";
import { ApiExplorer } from "./explorer/ApiExplorer";

/**
 * Root React island for the demo page.
 *
 * TodoApp and ApiExplorer share AppContext (crudLog + refreshTrigger), so they
 * must live on the same island. Splitting them would require cross-island state
 * (e.g. Nano Stores), which is unnecessary complexity for a demo app.
 */
export function AppShell() {
  return (
    <AppProvider>
      <AppHeader />
      <main className="app-main">
        <TodoApp />
        <ApiExplorer />
      </main>
    </AppProvider>
  );
}
