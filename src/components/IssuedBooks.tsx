import { useMemo, useState } from 'react';
import type { IssueRecord, IssueStatus } from '../types';

interface Props {
  issues: IssueRecord[];
  onReturn: (issueId: string) => string | null;
}

type StatusFilter = 'All' | IssueStatus;

const STATUS_BADGE: Record<IssueStatus, { cls: string; icon: string }> = {
  Active: { cls: 'badge-green', icon: '🟢' },
  'Due Soon': { cls: 'badge-amber', icon: '🟠' },
  Overdue: { cls: 'badge-red', icon: '🔴' },
  Returned: { cls: 'badge-blue', icon: '🔵' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function IssuedBooks({ issues, onReturn }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [confirming, setConfirming] = useState<IssueRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      const matchesQuery =
        !q || i.bookTitle.toLowerCase().includes(q) || i.student.name.toLowerCase().includes(q);
      const matchesStatus = status === 'All' || i.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [issues, query, status]);

  function handleConfirmReturn() {
    if (!confirming) return;
    const result = onReturn(confirming.id);
    if (result) {
      setError(result);
    } else {
      setError(null);
    }
    setConfirming(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="section-title mt-0">Issued Books</h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {issues.filter((i) => i.status !== 'Returned').length} books currently checked out
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner">⚠️ {error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔎</span>
          <input
            type="text"
            placeholder="Search student or book..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select-field" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Due Soon">Due Soon</option>
          <option value="Overdue">Overdue</option>
          <option value="Returned">Returned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📭</span>
          No issued books found matching your search.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const badge = STATUS_BADGE[i.status];
                return (
                  <tr key={i.id}>
                    <td className="cell-title">{i.bookTitle}</td>
                    <td>{i.student.name}</td>
                    <td>{i.student.studentId}</td>
                    <td>{i.student.department}</td>
                    <td>{formatDate(i.issueDate)}</td>
                    <td>{formatDate(i.dueDate)}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>
                        {badge.icon} {i.status}
                      </span>
                    </td>
                    <td>
                      {i.status !== 'Returned' ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(i)}>
                          Return Book
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Confirm Return</h2>
              <button className="modal-close" onClick={() => setConfirming(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--navy-800)', marginBottom: 20 }}>
              Are you sure you want to return <strong>{confirming.bookTitle}</strong>, issued to{' '}
              <strong>{confirming.student.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirming(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmReturn}>
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
