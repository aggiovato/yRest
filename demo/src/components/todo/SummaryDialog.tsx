import React from "react";

/** Response shape returned by the GET /api/summary handler. */
export interface SummaryData {
  generatedAt: string;
  totalTodos: number;
  totalUsers: number;
  userStats: Array<{
    id: number;
    name: string;
    avatar: string;
    total: number;
    done: number;
    pending: number;
  }>;
  byDate: Array<{
    date: string;
    counts: Record<number, number>;
  }>;
}

interface Props {
  data: SummaryData;
  onClose: () => void;
}

const USER_COLORS = ["var(--blue)", "var(--green)", "var(--orange)", "var(--red)"];
const CHART_HEIGHT = 100;

export function SummaryDialog({ data, onClose }: Props) {
  const maxCount = Math.max(1, ...data.byDate.flatMap((d) => Object.values(d.counts).map(Number)));

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">App Summary</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="dialog-body">
          <div className="summary-meta">
            {data.totalTodos} tasks · {data.totalUsers} users · generated at{" "}
            {new Date(data.generatedAt).toLocaleTimeString()}
          </div>

          {/* Per-user stats */}
          <div className="summary-stats">
            {data.userStats.map((user, i) => (
              <div className="summary-user-card" key={user.id}>
                <div className="summary-avatar" style={{ color: USER_COLORS[i] }}>
                  {user.avatar}
                </div>
                <div className="summary-user-name">{user.name}</div>
                <div className="summary-user-counts">
                  <span className="count-done">{user.done} done</span>
                  <span className="count-pending">{user.pending} pending</span>
                </div>
                {/* Mini progress bar */}
                <div className="summary-progress-track">
                  <div
                    className="summary-progress-fill"
                    style={{
                      width: user.total > 0 ? `${(user.done / user.total) * 100}%` : "0%",
                      background: USER_COLORS[i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart by creation date */}
          <p className="summary-chart-title">Tasks created per day by user</p>
          <div className="summary-chart">
            {data.byDate.map(({ date, counts }) => (
              <div className="chart-col" key={date}>
                <div className="chart-bars" style={{ height: `${CHART_HEIGHT}px` }}>
                  {data.userStats.map((user, i) => {
                    const count = Number(counts[user.id] ?? 0);
                    const barH = count > 0 ? Math.max(4, (count / maxCount) * CHART_HEIGHT) : 0;
                    return (
                      <div
                        key={user.id}
                        className="chart-bar"
                        style={{ height: `${barH}px`, background: USER_COLORS[i] }}
                        title={`${user.name}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="chart-date">{date.slice(5)}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="chart-legend">
            {data.userStats.map((user, i) => (
              <span key={user.id} className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: USER_COLORS[i] }} />
                {user.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
