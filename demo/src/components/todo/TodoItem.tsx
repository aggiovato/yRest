import type { Todo, User } from '../../types';

interface Props {
  todo: Todo;
  user?: User;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, user, onToggle, onDelete }: Props) {
  const avatar = user?.avatar ?? String(todo.userId);
  const name   = user?.name   ?? `User ${todo.userId}`;
  const prio   = todo.priority ?? 'low';

  return (
    <li className={`todo-item${todo.done ? ' is-done' : ''}`}>
      <button
        className="check-btn"
        onClick={() => onToggle(todo.id, !todo.done)}
        title={todo.done ? 'Mark pending' : 'Complete'}
      >
        {todo.done ? '✓' : ''}
      </button>
      <span className="todo-title">{todo.title}</span>
      <span className={`priority-badge ${prio}`}>{prio}</span>
      <span className="user-avatar" title={name}>{avatar}</span>
      <button className="delete-btn" onClick={() => onDelete(todo.id)} title="Delete">×</button>
    </li>
  );
}
