import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTodos } from "../../hooks/useTodos";
import { fetchApi } from "../../lib/api";
import { TodoForm } from "./TodoForm";
import { TodoToolbar } from "./TodoToolbar";
import { TodoList } from "./TodoList";
import { TodoPagination } from "./TodoPagination";
import { SummaryDialog, type SummaryData } from "./SummaryDialog";

export function TodoApp() {
  const { state } = useAppContext();
  const session = state.session;

  const {
    todos,
    total,
    totalPages,
    loading,
    filters,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setDoneFilter,
    setPriorityFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
  } = useTodos();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function handleAdd(title: string) {
    if (!session) return;
    await addTodo(title, session.userId);
  }

  async function openSummary() {
    setSummaryLoading(true);
    const r = await fetchApi("GET", "/summary");
    setSummaryLoading(false);
    if (r.status === 200 && r.data) setSummary(r.data as SummaryData);
  }

  return (
    <section className="todo-section">
      <div className="todo-toolbar">
        <div className="add-row">
          <TodoForm onAdd={handleAdd} disabled={!session} />
          <button className="btn-outline" onClick={openSummary} disabled={summaryLoading}>
            {summaryLoading ? "…" : "≡ Summary"}
          </button>
        </div>
        <TodoToolbar
          filters={filters}
          onSearch={setSearch}
          onDoneFilter={setDoneFilter}
          onPriorityFilter={setPriorityFilter}
          onSort={setSort}
          onLimit={setLimit}
        />
      </div>
      <TodoList
        todos={todos}
        loading={loading}
        connected={state.connected}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
      <TodoPagination
        page={filters.page}
        totalPages={totalPages}
        total={total}
        onPrev={() => setPage(filters.page - 1)}
        onNext={() => setPage(filters.page + 1)}
      />
      {summary && <SummaryDialog data={summary} onClose={() => setSummary(null)} />}
    </section>
  );
}
