import { useState } from 'react';

interface Props {
  onAdd: (title: string) => void;
}

export function TodoForm({ onAdd }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;
    onAdd(title);
    setValue('');
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        className="add-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="New task..."
        autoComplete="off"
        maxLength={120}
      />
      <button className="btn" type="submit">+ Add</button>
    </form>
  );
}
