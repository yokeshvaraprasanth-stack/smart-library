import type { Book, IssueRecord, Activity, Page } from '../types';
import { totalCopies, totalAvailable, totalIssued, uniqueActiveStudents } from '../utils/storage';
import { categoryStyle } from '../utils/categoryStyle';

interface Props {
  books: Book[];
  issues: IssueRecord[];
  activities: Activity[];
  onNavigate: (page: Page) => void;
}

const ACTIVITY_ICON: Record<Activity['type'], string> = {
  issue: '📤',
  return: '📥',
  add: '➕',
  reserve: '📌',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard({ books, issues, activities, onNavigate }: Props) {
  const total = totalCopies(books);
  const available = totalAvailable(books);
  const issued = totalIssued(books);
  const students = uniqueActiveStudents(issues);

  const byCategory = new Map<string, number>();
  for (const b of books) {
    byCategory.set(b.category, (byCategory.get(b.category) ?? 0) + b.totalCopies);
  }
  const categoryEntries = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = Math.max(1, ...categoryEntries.map(([, c]) => c));

  return (
    <div>
      <section className="hero">
        <p className="hero-eyebrow">LIBRARIAN DASHBOARD</p>
        <h1>Smart library management</h1>
        <p>Search, issue and track books easily — all from one place.</p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('books')}>
            🔎 Search Books
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('issue')}>
            📤 Issue a Book
          </button>
        </div>
      </section>

      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-icon">📚</span>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Books</div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon">🟢</span>
          <div className="stat-value">{available}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon">🔴</span>
          <div className="stat-value">{issued}</div>
          <div className="stat-label">Issued</div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon">👨‍🎓</span>
          <div className="stat-value">{students}</div>
          <div className="stat-label">Active Students</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div>
          <div className="card panel">
            <h2 className="section-title">Library Overview</h2>
            <p className="section-sub">Available vs. issued copies across the catalog</p>

            <div className="legend-row">
              <span><span className="legend-dot" style={{ background: 'var(--green-600)' }} />Available</span>
              <span><span className="legend-dot" style={{ background: 'var(--red-600)' }} />Issued</span>
            </div>

            <div className="bar-row">
              <span>Available</span>
              <div className="bar-track">
                <div
                  className="bar-fill available"
                  style={{ width: `${total ? (available / total) * 100 : 0}%` }}
                />
              </div>
              <span className="bar-count">{available}</span>
            </div>
            <div className="bar-row">
              <span>Issued</span>
              <div className="bar-track">
                <div
                  className="bar-fill issued"
                  style={{ width: `${total ? (issued / total) * 100 : 0}%` }}
                />
              </div>
              <span className="bar-count">{issued}</span>
            </div>
          </div>

          <div className="card panel">
            <h2 className="section-title">Books by Category</h2>
            <p className="section-sub">Total copies held per subject area</p>
            {categoryEntries.map(([category, count]) => (
              <div className="bar-row" key={category}>
                <span>{category}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill category"
                    style={{
                      width: `${(count / maxCategoryCount) * 100}%`,
                      background: categoryStyle(category).bg,
                    }}
                  />
                </div>
                <span className="bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel">
          <h2 className="section-title">Recent Library Activity</h2>
          <p className="section-sub">Latest issues, returns and catalog updates</p>
          {activities.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🗒️</span>
              No activity yet. Issue or add a book to get started.
            </div>
          ) : (
            <div className="activity-list">
              {activities.slice(0, 8).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-icon">{ACTIVITY_ICON[a.type]}</span>
                  <div>
                    <div className="activity-text">{a.message}</div>
                    <div className="activity-time">{timeAgo(a.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
