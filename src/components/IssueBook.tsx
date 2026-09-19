import { useMemo, useState, useEffect, type FormEvent } from 'react';
import type { Book } from '../types';
import { availableCopies } from '../utils/storage';

interface Props {
  books: Book[];
  preselectedBookId: string | null;
  onClearPreselected: () => void;
  onSubmit: (input: {
    bookId: string;
    name: string;
    studentId: string;
    department: string;
    year: string;
    issueDate: string;
    dueDate: string;
  }) => string | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function IssueBook({ books, preselectedBookId, onClearPreselected, onSubmit }: Props) {
  const [bookId, setBookId] = useState(preselectedBookId ?? '');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [issueDate, setIssueDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(plusDays(todayStr(), 14));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedBookId) {
      setBookId(preselectedBookId);
      onClearPreselected();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedBookId]);

  const issuableBooks = useMemo(() => books.filter((b) => availableCopies(b) > 0), [books]);
  const selectedBook = books.find((b) => b.id === bookId) ?? null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!bookId) {
      setError('Please select a book to issue.');
      return;
    }

    const result = onSubmit({ bookId, name, studentId, department, year, issueDate, dueDate });
    if (result) {
      setError(result);
      return;
    }

    setSuccess(`Book issued successfully to ${name}.`);
    setName('');
    setStudentId('');
    setDepartment('');
    setYear('');
    setBookId('');
    setIssueDate(todayStr());
    setDueDate(plusDays(todayStr(), 14));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="section-title mt-0">Issue a Book</h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            Select a title and record who it's going to
          </p>
        </div>
      </div>

      <div className="card panel" style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error-banner">⚠️ {error}</div>}
          {success && <div className="form-error-banner" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>✅ {success}</div>}

          <div className="form-field">
            <label htmlFor="book-select">Book</label>
            <select id="book-select" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">Select a book…</option>
              {issuableBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} — {availableCopies(b)} available
                </option>
              ))}
            </select>
          </div>

          {selectedBook && (
            <div className="modal-summary">
              <p className="cell-title">{selectedBook.title}</p>
              <p className="cell-sub">
                {selectedBook.author} · {availableCopies(selectedBook)} of {selectedBook.totalCopies} copies available
              </p>
            </div>
          )}

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="student-name">Student Name</label>
              <input id="student-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Yokesh" />
            </div>
            <div className="form-field">
              <label htmlFor="student-id">Student ID</label>
              <input id="student-id" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 23AI087" />
            </div>
            <div className="form-field">
              <label htmlFor="department">Department</label>
              <input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. AI & DS" />
            </div>
            <div className="form-field">
              <label htmlFor="year">Year</label>
              <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Select year…</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="issue-date">Issue Date</label>
              <input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="due-date">Due Date</label>
              <input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
            Confirm Issue
          </button>
        </form>
      </div>
    </div>
  );
}
