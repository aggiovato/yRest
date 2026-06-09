import { useRef } from 'react';

interface Filters {
  search: string;
  done: string;
  priority: string;
  sort: string;
  order: string;
  limit: number;
}

interface Props {
  filters: Filters;
  onSearch: (search: string) => void;
  onDoneFilter: (done: string) => void;
  onPriorityFilter: (priority: string) => void;
  onSort: (sort: string, order: string) => void;
  onLimit: (limit: number) => void;
}

export function TodoToolbar({ filters, onSearch, onDoneFilter, onPriorityFilter, onSort, onLimit }: Props) {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => onSearch(value.trim()), 350);
  }

  function handleSort(e: React.ChangeEvent<HTMLSelectElement>) {
    const [sort, order] = e.target.value.split('|');
    onSort(sort, order);
  }

  return (
    <div className="toolbar-controls">
      <input
        className="search-input"
        placeholder="Search..."
        defaultValue={filters.search}
        onChange={handleSearch}
      />
      <select value={filters.done} onChange={e => onDoneFilter(e.target.value)}>
        <option value="">All</option>
        <option value="false">Pending</option>
        <option value="true">Completed</option>
      </select>
      <select value={filters.priority} onChange={e => onPriorityFilter(e.target.value)}>
        <option value="">Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select value={`${filters.sort}|${filters.order}`} onChange={handleSort}>
        <option value="createdAt|desc">Newest</option>
        <option value="createdAt|asc">Oldest</option>
        <option value="priority|desc">Priority ↑</option>
        <option value="title|asc">A → Z</option>
      </select>
      <select value={String(filters.limit)} onChange={e => onLimit(parseInt(e.target.value))}>
        <option value="5">5 / page</option>
        <option value="10">10 / page</option>
      </select>
    </div>
  );
}
