import { useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { useAppContext } from '../../../context/AppContext';
import { ApiLog } from '../../ui/ApiLog';

export function CrudPanel() {
  const { state, dispatch } = useAppContext();
  const [newTitle, setNewTitle] = useState('');
  const [deleteId, setDeleteId] = useState('');

  async function handlePost() {
    if (!newTitle.trim()) return;
    const r = await fetchApi('POST', '/todos', {
      title: newTitle.trim(), done: false, priority: 'medium', userId: 1,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    dispatch({ type: 'LOG_CRUD', payload: { method: 'POST', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
    dispatch({ type: 'REFRESH_TODOS' });
    setNewTitle('');
  }

  async function handleDelete() {
    const id = parseInt(deleteId);
    if (!id) return;
    const r = await fetchApi('DELETE', `/todos/${id}`);
    dispatch({ type: 'LOG_CRUD', payload: { method: 'DELETE', url: r.url, status: r.status, data: r.data, ts: Date.now() } });
    dispatch({ type: 'REFRESH_TODOS' });
    setDeleteId('');
  }

  return (
    <>
      <p className="feature-desc">
        Full CRUD auto-generated from <code>db.yml</code>:{' '}
        <code>GET /api/todos</code>, <code>POST /api/todos</code>,{' '}
        <code>PATCH /api/todos/:id</code>, <code>DELETE /api/todos/:id</code>.
        Operations here and in the todo list both update this log and reflect in the UI.
      </p>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">title</span>
          <input
            className="ex-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePost()}
            placeholder="New todo title..."
            style={{ width: '200px' }}
          />
        </div>
        <button className="btn-try" onClick={handlePost} disabled={!newTitle.trim()}>
          POST /api/todos →
        </button>
      </div>
      <div className="ex-controls">
        <div className="ex-field">
          <span className="ex-label">id</span>
          <input
            className="ex-input"
            type="number"
            value={deleteId}
            onChange={e => setDeleteId(e.target.value)}
            placeholder="ID"
            style={{ width: '80px' }}
          />
        </div>
        <button className="btn-try" onClick={handleDelete} disabled={!deleteId}>
          DELETE /api/todos/:id →
        </button>
      </div>
      <ApiLog log={state.crudLog} emptyMessage="Perform an operation in the todo list or test here..." />
    </>
  );
}
