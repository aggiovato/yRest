import { useAppContext } from "../../context/AppContext";
import type { Todo } from "../../types";

interface Props {
  todo: Todo;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  const { state } = useAppContext();
  const session = state.session;

  // Can edit only when logged in as the task owner.
  const canEdit = session !== null && session.userId === todo.userId;

  const user = todo.user;
  const avatar = user?.avatar ?? String(todo.userId);
  const prior = todo.priority ?? "low";

  return (
    <li className={`todo-item${todo.done ? " is-done" : ""}${canEdit ? "" : " locked"}`}>
      <button
        className="check-btn"
        onClick={() => canEdit && onToggle(todo.id, !todo.done)}
        disabled={!canEdit}
        title={
          canEdit ? (todo.done ? "Mark pending" : "Complete") : "Sign in as the task owner to edit"
        }
      >
        {todo.done ? "✓" : ""}
      </button>
      <span className="todo-title">{todo.title}</span>
      <span className={`priority-badge ${prior}`}>{prior}</span>
      <span className="user-avatar-wrap">
        <span className="user-avatar">{avatar}</span>
        {user && (
          <div className="user-popover">
            <span className="user-popover-name">{user.name}</span>
            <span className="user-popover-email">{user.email}</span>
            <span className="user-popover-role">{user.role}</span>
          </div>
        )}
      </span>
      {canEdit && (
        <button className="delete-btn" onClick={() => onDelete(todo.id)} title="Delete">
          ×
        </button>
      )}
    </li>
  );
}
