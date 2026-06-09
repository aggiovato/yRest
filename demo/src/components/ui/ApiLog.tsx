import type { ApiCallLog } from '../../context/AppContext';

const METHOD_COLORS: Record<string, string> = {
  GET: '#3fb950', POST: '#f0883e', PATCH: '#58a6ff', PUT: '#58a6ff', DELETE: '#f85149',
};

interface Props {
  log: ApiCallLog | null;
  emptyMessage?: string;
}

export function ApiLog({ log, emptyMessage = 'Try an operation...' }: Props) {
  if (!log) {
    return <div className="api-log"><p className="api-log-empty">{emptyMessage}</p></div>;
  }

  const mc = METHOD_COLORS[log.method] ?? '#8b949e';
  const sc = log.status >= 200 && log.status < 300 ? '#3fb950' : log.status === 0 ? '#8b949e' : '#f85149';
  const body = JSON.stringify(log.data, null, 2) + (log.total != null ? `\n\n// X-Total-Count: ${log.total}` : '');

  return (
    <div className="api-log">
      <div className="api-log-request">
        <span className="log-method" style={{ color: mc }}>{log.method}</span>
        <span className="log-url">{log.url}</span>
        <span className="log-status" style={{ color: sc }}>{log.status || '×'}</span>
      </div>
      <pre className="api-log-body">{body}</pre>
    </div>
  );
}
