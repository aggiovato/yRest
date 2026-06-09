import { useAppContext } from '../../context/AppContext';
import { useTodos } from '../../hooks/useTodos';
import { useUsers } from '../../hooks/useUsers';
import { TodoForm } from './TodoForm';
import { TodoToolbar } from './TodoToolbar';
import { TodoList } from './TodoList';
import { TodoPagination } from './TodoPagination';

export function TodoApp() {
  const { state } = useAppContext();
  const users = useUsers();
  const {
    todos, total, totalPages, loading, filters,
    setPage, setLimit, setSort, setSearch, setDoneFilter, setPriorityFilter,
    addTodo, toggleTodo, deleteTodo,
  } = useTodos();

  return (
    <section className="todo-section">
      <div className="todo-toolbar">
        <TodoForm onAdd={addTodo} />
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
        users={users}
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
    </section>
  );
}
