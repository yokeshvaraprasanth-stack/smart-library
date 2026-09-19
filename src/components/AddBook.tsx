import { useState, type FormEvent } from 'react';
import { CATEGORIES } from '../data/sampleData';

interface Props {
  onSubmit: (input: { title: string; author: string; isbn: string; category: string; totalCopies: number }) => string | null;
}

export default function AddBook({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [copies, setCopies] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const parsedCopies = Number(copies);
    const result = onSubmit({ title, author, isbn, category, totalCopies: parsedCopies });

    if (result) {
      setError(result);
      return;
    }

    setSuccess(`"${title}" was added to the catalog.`);
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCategory('');
    setCopies('1');
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="section-title mt-0">Add Book</h1>
          <p className="section-sub" style={{ marginBottom: 0 }}>
            Add a new title to the library catalog
          </p>
        </div>
      </div>

      <div className="card panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error-banner">⚠️ {error}</div>}
          {success && (
            <div className="form-error-banner" style={{ background: 'var(--green-50)', color: 'var(--green-600)' }}>
              ✅ {success}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="new-title">Book Title</label>
            <input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Algorithms" />
          </div>
          <div className="form-field">
            <label htmlFor="new-author">Author</label>
            <input id="new-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Thomas Cormen" />
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="new-isbn">ISBN</label>
              <input id="new-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="e.g. 978000000011" />
            </div>
            <div className="form-field">
              <label htmlFor="new-category">Category</label>
              <select id="new-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field" style={{ maxWidth: 200 }}>
            <label htmlFor="new-copies">Total Copies</label>
            <input
              id="new-copies"
              type="number"
              min={1}
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
            Add Book
          </button>
        </form>
      </div>
    </div>
  );
}
