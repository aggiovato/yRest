import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { useAppContext } from '../context/AppContext';
import type { Todo } from '../types';

interface Filters {
  page: number;
  limit: number;
  sort: string;
  order: string;
  search: string;
  done: string;
  priority: string;
}

const DEFAULT: Filters = {
  page: 1, limit: 5, sort: 'createdAt', order: 'desc',
  search: '', done: '', priority: '',
};

export function useTodos() {
  const { state, dispatch } = useAppContext();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [version, setVersion] = useState(0);

  const todosLengthRef = useRef(todos.length);
  useEffect(() => { todosLengthRef.current = todos.length; }, [todos.length]);

  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  useEffect(() => {
    if (!state.connected) return;

    setLoading(true);
    const f = filtersRef.current;
    const p = new URLSearchParams({
      _page: String(f.page),
      _limit: String(f.limit),
      _sort: f.sort,
      _order: f.order,
    });
    if (f.search)   p.set('_q', f.search);
    if (f.done)     p.set('done', f.done);
    if (f.priority) p.set('priority', f.priority);

    fetchApi('GET', `/todos?${p}`).then(r => {
      dispatch({ type: 'LOG_CRUD', payload: { method: 'GET', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
      if (Array.isArray(r.data)) setTodos(r.data as Todo[]);
      if (r.total !== null) setTotal(parseInt(r.total));
      setLoading(false);
    });
  }, [
    state.connected, state.refreshTrigger,
    filters.page, filters.limit, filters.sort, filters.order,
    filters.search, filters.done, filters.priority,
    version, dispatch,
  ]);

  const addTodo = useCallback(async (title: string) => {
    const r = await fetchApi('POST', '/todos', {
      title, done: false, priority: 'medium', userId: 1,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    dispatch({ type: 'LOG_CRUD', payload: { method: 'POST', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
    setFilters(f => ({ ...f, page: 1 }));
    setVersion(v => v + 1);
  }, [dispatch]);

  const toggleTodo = useCallback(async (id: number, done: boolean) => {
    const r = await fetchApi('PATCH', `/todos/${id}`, { done });
    dispatch({ type: 'LOG_CRUD', payload: { method: 'PATCH', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
    setVersion(v => v + 1);
  }, [dispatch]);

  const deleteTodo = useCallback(async (id: number) => {
    const r = await fetchApi('DELETE', `/todos/${id}`);
    dispatch({ type: 'LOG_CRUD', payload: { method: 'DELETE', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
    const f = filtersRef.current;
    const shouldGoBack = f.page > 1 && todosLengthRef.current === 1;
    if (shouldGoBack) {
      setFilters(prev => ({ ...prev, page: prev.page - 1 }));
    } else {
      setVersion(v => v + 1);
    }
  }, [dispatch]);

  const totalPages = Math.ceil(total / filters.limit) || 1;

  return {
    todos, total, totalPages, loading, filters,
    setPage:           (page: number)    => setFilters(f => ({ ...f, page })),
    setLimit:          (limit: number)   => setFilters(f => ({ ...f, limit, page: 1 })),
    setSort:           (sort: string, order: string) => setFilters(f => ({ ...f, sort, order, page: 1 })),
    setSearch:         (search: string)  => setFilters(f => ({ ...f, search, page: 1 })),
    setDoneFilter:     (done: string)    => setFilters(f => ({ ...f, done, page: 1 })),
    setPriorityFilter: (priority: string) => setFilters(f => ({ ...f, priority, page: 1 })),
    addTodo, toggleTodo, deleteTodo,
  };
}
