import type { Book, IssueRecord, Activity, BookStatus, IssueStatus, Student } from '../types';
import { SAMPLE_BOOKS, SAMPLE_ISSUES, SAMPLE_ACTIVITY } from '../data/sampleData';

const KEYS = {
  books: 'librasmart.books',
  issues: 'librasmart.issues',
  activities: 'librasmart.activities',
  initialized: 'librasmart.initialized',
};

export interface LibraryState {
  books: Book[];
  issues: IssueRecord[];
  activities: Activity[];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Loads persisted data, seeding sample data only on the very first run. */
export function loadLibrary(): LibraryState {
  const initialized = localStorage.getItem(KEYS.initialized);

  if (!initialized) {
    localStorage.setItem(KEYS.books, JSON.stringify(SAMPLE_BOOKS));
    localStorage.setItem(KEYS.issues, JSON.stringify(SAMPLE_ISSUES));
    localStorage.setItem(KEYS.activities, JSON.stringify(SAMPLE_ACTIVITY));
    localStorage.setItem(KEYS.initialized, 'true');
    return { books: SAMPLE_BOOKS, issues: SAMPLE_ISSUES, activities: SAMPLE_ACTIVITY };
  }

  return {
    books: safeParse<Book[]>(localStorage.getItem(KEYS.books), SAMPLE_BOOKS),
    issues: safeParse<IssueRecord[]>(localStorage.getItem(KEYS.issues), []),
    activities: safeParse<Activity[]>(localStorage.getItem(KEYS.activities), []),
  };
}

export function persistLibrary(state: LibraryState): void {
  localStorage.setItem(KEYS.books, JSON.stringify(state.books));
  localStorage.setItem(KEYS.issues, JSON.stringify(state.issues));
  localStorage.setItem(KEYS.activities, JSON.stringify(state.activities));
}

export function computeBookStatus(book: Book): BookStatus {
  const available = book.totalCopies - book.issuedCopies;
  if (available <= 0) return 'Unavailable';
  if (available === book.totalCopies) return 'Available';
  return 'Partially Available';
}

export function availableCopies(book: Book): number {
  return Math.max(0, book.totalCopies - book.issuedCopies);
}

/** Derives the live status of an issue from its due/return date. */
export function statusFromDates(dueDate: string, returnDate: string | null): IssueStatus {
  if (returnDate) return 'Returned';
  const now = new Date();
  const due = new Date(dueDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.floor((due.getTime() - now.getTime()) / msPerDay);
  if (daysUntilDue < 0) return 'Overdue';
  if (daysUntilDue <= 3) return 'Due Soon';
  return 'Active';
}

/** Derives the live status of a full issue record from today's date. */
export function computeIssueStatus(issue: IssueRecord): IssueStatus {
  return statusFromDates(issue.dueDate, issue.returnDate);
}

/** Recomputes derived statuses for every issue. Call this on load / periodically. */
export function refreshIssueStatuses(issues: IssueRecord[]): IssueRecord[] {
  return issues.map((issue) => ({ ...issue, status: computeIssueStatus(issue) }));
}

export function uniqueActiveStudents(issues: IssueRecord[]): number {
  const ids = new Set(
    issues.filter((i) => i.status !== 'Returned').map((i) => i.student.studentId)
  );
  return ids.size;
}

export function totalCopies(books: Book[]): number {
  return books.reduce((sum, b) => sum + b.totalCopies, 0);
}

export function totalAvailable(books: Book[]): number {
  return books.reduce((sum, b) => sum + availableCopies(b), 0);
}

export function totalIssued(books: Book[]): number {
  return books.reduce((sum, b) => sum + b.issuedCopies, 0);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export interface IssueBookInput {
  bookId: string;
  student: Student;
  issueDate: string;
  dueDate: string;
}

export type OperationResult<T> =
  | { ok: true; state: LibraryState; payload: T }
  | { ok: false; error: string };

/** Issues a book to a student. Validates availability and dates. */
export function issueBook(state: LibraryState, input: IssueBookInput): OperationResult<IssueRecord> {
  const { bookId, student, issueDate, dueDate } = input;

  if (!student.name.trim()) return { ok: false, error: 'Student name is required.' };
  if (!student.studentId.trim()) return { ok: false, error: 'Student ID is required.' };
  if (!student.department.trim()) return { ok: false, error: 'Department is required.' };
  if (!student.year.trim()) return { ok: false, error: 'Year is required.' };
  if (new Date(dueDate) <= new Date(issueDate)) {
    return { ok: false, error: 'Due date must be after the issue date.' };
  }

  const book = state.books.find((b) => b.id === bookId);
  if (!book) return { ok: false, error: 'Selected book could not be found.' };
  if (availableCopies(book) <= 0) return { ok: false, error: 'This book has no available copies.' };

  const updatedBooks = state.books.map((b) =>
    b.id === bookId ? { ...b, issuedCopies: b.issuedCopies + 1 } : b
  );

  const record: IssueRecord = {
    id: makeId('issue'),
    userId: 'demo-user',
    bookId: book.id,
    bookTitle: book.title,
    student,
    issueDate,
    dueDate,
    returnDate: null,
    status: statusFromDates(dueDate, null),
    fine: 0,
  };

  const activity: Activity = {
    id: makeId('act'),
    type: 'issue',
    message: `${book.title} issued to ${student.name}`,
    timestamp: new Date().toISOString(),
  };

  return {
    ok: true,
    payload: record,
    state: {
      books: updatedBooks,
      issues: [record, ...state.issues],
      activities: [activity, ...state.activities],
    },
  };
}

/** Returns a book that is currently issued. */
export function returnBook(state: LibraryState, issueId: string): OperationResult<IssueRecord> {
  const issue = state.issues.find((i) => i.id === issueId);
  if (!issue) return { ok: false, error: 'Issue record could not be found.' };
  if (issue.returnDate) return { ok: false, error: 'This book has already been returned.' };

  const updatedIssue: IssueRecord = { ...issue, returnDate: new Date().toISOString(), status: 'Returned' };
  const updatedBooks = state.books.map((b) =>
    b.id === issue.bookId ? { ...b, issuedCopies: Math.max(0, b.issuedCopies - 1) } : b
  );

  const activity: Activity = {
    id: makeId('act'),
    type: 'return',
    message: `${issue.bookTitle} returned by ${issue.student.name}`,
    timestamp: new Date().toISOString(),
  };

  return {
    ok: true,
    payload: updatedIssue,
    state: {
      books: updatedBooks,
      issues: state.issues.map((i) => (i.id === issueId ? updatedIssue : i)),
      activities: [activity, ...state.activities],
    },
  };
}

export interface AddBookInput {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
}

/** Adds a new title to the catalog. Validates required fields and ISBN uniqueness. */
export function addBook(state: LibraryState, input: AddBookInput): OperationResult<Book> {
  const title = input.title.trim();
  const author = input.author.trim();
  const isbn = input.isbn.trim();
  const category = input.category.trim();

  if (!title || !author || !isbn || !category) {
    return { ok: false, error: 'All fields are required.' };
  }
  if (!Number.isFinite(input.totalCopies) || input.totalCopies <= 0) {
    return { ok: false, error: 'Total copies must be greater than 0.' };
  }
  if (state.books.some((b) => b.isbn === isbn)) {
    return { ok: false, error: 'A book with this ISBN already exists.' };
  }

  const book: Book = {
    id: makeId('book'),
    title,
    author,
    category,
    isbn,
    publisher: 'Library Collection',
    publicationYear: new Date().getFullYear(),
    language: 'English',
    description: 'Newly added library title for students and faculty.',
    rating: 4.5,
    totalCopies: input.totalCopies,
    issuedCopies: 0,
    reservedCopies: 0,
    coverAccent: '#4f46e5',
    coverEmoji: '📘',
  };

  const activity: Activity = {
    id: makeId('act'),
    type: 'add',
    message: `New book added: ${title}`,
    timestamp: new Date().toISOString(),
  };

  return {
    ok: true,
    payload: book,
    state: {
      books: [book, ...state.books],
      issues: state.issues,
      activities: [activity, ...state.activities],
    },
  };
}
