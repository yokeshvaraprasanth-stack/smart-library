import { useState } from 'react';
import type { Page } from '../types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const LINKS: { page: Page; label: string }[] = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'books', label: 'Books' },
  { page: 'issue', label: 'Issue Book' },
  { page: 'issued', label: 'Issued Books' },
  { page: 'add', label: 'Add Book' },
];

export default function Navbar({ currentPage, onNavigate }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function go(page: Page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar-inner" style={{ position: 'relative' }}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go('dashboard');
          }}
        >
          <span className="brand-mark">📚</span>
          <span className="brand-text">
            <span className="brand-name">LibraSmart</span>
            <span className="brand-sub">Smart Library Management System</span>
          </span>
        </a>

        <nav className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
          {LINKS.map((link) => (
            <button
              key={link.page}
              className={`nav-link ${currentPage === link.page ? 'active' : ''}`}
              onClick={() => go(link.page)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <button
            className="icon-btn"
            aria-label="Search books"
            onClick={() => go('books')}
            title="Search books"
          >
            🔎
          </button>
          <div className="librarian-chip">
            <span className="avatar">LB</span>
            <span>Librarian</span>
          </div>
          <button
            className="menu-toggle"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </header>
  );
}
