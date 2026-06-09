import React, { useState } from "react";

interface Props {
  onAdd: (title: string) => void;
  disabled?: boolean;
}

export function TodoForm({ onAdd, disabled }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = value.trim();
    if (!title || disabled) return;
    onAdd(title);
    setValue("");
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        className="add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={disabled ? "Sign in to add tasks…" : "New task…"}
        autoComplete="off"
        maxLength={120}
        disabled={disabled}
      />
      <button className="btn" type="submit" disabled={disabled}>
        + Add
      </button>
    </form>
  );
}
