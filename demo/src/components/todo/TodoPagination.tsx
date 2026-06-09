interface Props {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function TodoPagination({ page, totalPages, total, onPrev, onNext }: Props) {
  return (
    <div className="pagination">
      <button className="page-btn" onClick={onPrev} disabled={page <= 1}>‹</button>
      <span className="page-info">{page} / {totalPages}</span>
      <button className="page-btn" onClick={onNext} disabled={page >= totalPages}>›</button>
      <span className="page-count">{total} {total === 1 ? 'task' : 'tasks'}</span>
    </div>
  );
}
