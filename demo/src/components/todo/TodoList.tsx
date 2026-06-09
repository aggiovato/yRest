import type { Todo } from "../../types";
import { TodoItem } from "./TodoItem";

interface Props {
  todos: Todo[];
  loading: boolean;
  connected: boolean;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, loading, connected, onToggle, onDelete }: Props) {
  if (!connected) {
    return (
      <ul className="todo-list">
        <li className="todo-placeholder">Connecting to yrest...</li>
      </ul>
    );
  }
  if (loading && todos.length === 0) {
    return (
      <ul className="todo-list">
        <li className="todo-placeholder">Loading...</li>
      </ul>
    );
  }
  if (todos.length === 0) {
    return (
      <ul className="todo-list">
        <li className="todo-placeholder">No tasks found</li>
      </ul>
    );
  }
  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
