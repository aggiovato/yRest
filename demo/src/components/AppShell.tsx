import { AppProvider } from '../context/AppContext';
import { AppHeader }   from './AppHeader';
import { TodoApp }     from './todo/TodoApp';
import { ApiExplorer } from './explorer/ApiExplorer';

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
