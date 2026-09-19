import { useMemo, useState } from 'react';
import type { Book } from '../types';
import BookCover from './BookCover';
import { computeBookStatus, availableCopies } from '../utils/storage';
import { CATEGORIES } from '../data/sampleData';

interface Props {
  books: Book[];
  initialQuery?: string;
  onIssue: (bookId: string) => void;
}

type AvailabilityFilter = 'All' | 'Available' | 'Issued' | 'Unavailable';

const STATUS_BADGE: Record<ReturnType<typeof computeBookStatus>, { cls: string; icon: string }> = {
  Available: { cls: 'badge-green', icon: '🟢' },
  'Partially Available': { cls: 'badge-amber', icon: '🟡' },
  Unavailable: { cls: 'badge-red', icon: '🔴' },
};

export default function Books({ books, initialQuery, onIssue }: Props) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [category, setCategory] = useState('All');
  const [availability, setAvailability] = useState<AvailabilityFilter>('All');
  const [viewing, setViewing] = useState<Book | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q);

      const matchesCategory = category === 'All' || b.category === category;

      const status = computeBookStatus(b);
      const matchesAvailability =
        availability === 'All' ||
        (availability === 'Available' && status !== 'Unavailable') ||
        (availability === 'Issued' && b.issuedCopies > 0) ||
        (availability === 'Unavailable' && status === 'Unavailable');

      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [books, query, category, availability]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="section-title mt-0">Books</h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            {books.length} titles in the catalog
          </p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔎</span>
          <input
            type="text"
            placeholder="Search books by title, author, ISBN or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="select-field"
          value={availability}
          onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
        >
          <option value="All">All</option>
          <option value="Available">Available</option>
          <option value="Issued">Issued</option>
          <option value="Unavailable">Unavailable</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📭</span>
          No books found matching your search.
        </div>
      ) : (
        <div className="book-grid">
          {filtered.map((book) => {
            const status = computeBookStatus(book);
            const badge = STATUS_BADGE[status];
            const avail = availableCopies(book);
            return (
              <div className="card book-card" key={book.id}>
                <div className="book-card-top">
                  <BookCover book={book} />
                  <span className={`badge ${badge.cls}`}>
                    {badge.icon} {status}
                  </span>
                </div>
                <div>
                  <p className="book-title">{book.title}</p>
                  <p className="book-author">{book.author}</p>
                </div>
                <div className="book-meta">
                  <span>{book.category}</span>
                  <span>ISBN {book.isbn}</span>
                </div>
                <p className="book-copies">
                  {avail} of {book.totalCopies} copies available
                </p>
                <div className="book-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewing(book)}>
                    View
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={avail <= 0}
                    onClick={() => onIssue(book.id)}
                  >
                    Issue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{viewing.title}</h2>
              <button className="modal-close" onClick={() => setViewing(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-summary">
              <p className="cell-title">{viewing.author}</p>
              <p className="cell-sub">{viewing.category} · ISBN {viewing.isbn}</p>
            </div>
            <div className="form-grid" style={{ marginBottom: 18 }}>
              <div>
                <p className="cell-sub" style={{ marginBottom: 4 }}>Total copies</p>
                <p className="cell-title">{viewing.totalCopies}</p>
              </div>
              <div>
                <p className="cell-sub" style={{ marginBottom: 4 }}>Available now</p>
                <p className="cell-title">{availableCopies(viewing)}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setViewing(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                disabled={availableCopies(viewing) <= 0}
                onClick={() => {
                  onIssue(viewing.id);
                  setViewing(null);
                }}
              >
                Issue this book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
