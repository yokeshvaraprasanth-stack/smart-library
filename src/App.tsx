import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, SAMPLE_ACTIVITY, SAMPLE_BOOKS, SAMPLE_ISSUES, SAMPLE_NOTIFICATIONS, SAMPLE_USERS } from './data/sampleData';
import BookCover from './components/BookCover';
import { api, type ApiUser } from './lib/api';
import type { Book, IssueRecord, NotificationItem, RouteName, ToastMessage, UserProfile } from './types';

const STORAGE_KEYS = {
  books: 'librasmart.books',
  issues: 'librasmart.issues',
  users: 'librasmart.users',
  notifications: 'librasmart.notifications',
  theme: 'librasmart.theme',
};

function mergeSeedRecords<T extends { id: string }>(key: string, seeds: T[]): T[] {
  const stored = readJSON<T[]>(key, []);
  const storedIds = new Set(stored.map((record) => record.id));
  return [...stored, ...seeds.filter((record) => !storedIds.has(record.id))];
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getAvailableCopies(book: Book): number {
  return Math.max(0, book.totalCopies - book.issuedCopies);
}

function computeFine(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.max(0, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  return diffDays * 5;
}

function deriveIssueStatus(issue: IssueRecord): IssueRecord['status'] {
  if (issue.returnDate) return 'Returned';
  const now = new Date();
  const due = new Date(issue.dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Overdue';
  if (diffDays <= 3) return 'Due Soon';
  return 'Active';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function normalizeCredential(value: string): string {
  return value.trim().toLowerCase();
}

function isMongoId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function getAuthErrorMessage(message: string, fallback: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (normalized.includes('email not confirmed')) return 'Please verify your email before signing in.';
  if (normalized.includes('already registered') || normalized.includes('already exists')) return 'An account with this email already exists.';
  if (normalized.includes('password')) return 'Password must meet the required security rules.';
  if (normalized.includes('fetch') || normalized.includes('network') || normalized.includes('connect')) return 'Unable to connect. Please check your internet connection.';
  return fallback;
}

function apiUserToProfile(profile: ApiUser, existing?: UserProfile): UserProfile {
  return {
    id: profile.id,
    fullName: profile.fullName,
    studentId: profile.studentId,
    email: profile.email,
    phone: profile.phone,
    password: '',
    role: profile.role,
    joinedAt: profile.joinedAt,
    theme: existing?.theme ?? 'light',
    wishlist: existing?.wishlist ?? [],
    reservedBooks: existing?.reservedBooks ?? [],
    notificationsRead: existing?.notificationsRead ?? [],
  };
}

function apiBookToBook(raw: Record<string, unknown>): Book {
  return {
    id: String(raw._id ?? raw.id),
    title: String(raw.title ?? ''),
    author: String(raw.author ?? ''),
    category: String(raw.category ?? 'Computer Science'),
    isbn: String(raw.isbn ?? ''),
    publisher: String(raw.publisher ?? ''),
    publicationYear: Number(raw.publicationYear ?? new Date().getFullYear()),
    language: String(raw.language ?? 'English'),
    description: String(raw.description ?? ''),
    rating: Number(raw.rating ?? 0),
    totalCopies: Number(raw.totalCopies ?? 1),
    issuedCopies: Number(raw.issuedCopies ?? 0),
    reservedCopies: Number(raw.reservedCopies ?? 0),
    coverAccent: String(raw.coverAccent ?? '#334155'),
    coverEmoji: String(raw.coverEmoji ?? '📚'),
  };
}

function apiIssueToIssue(raw: Record<string, unknown>): IssueRecord {
  const book = (raw.book ?? {}) as Record<string, unknown>;
  const user = (raw.user ?? {}) as Record<string, unknown>;
  return {
    id: String(raw._id ?? raw.id),
    userId: String(user._id ?? raw.user ?? ''),
    bookId: String(book._id ?? raw.book ?? ''),
    bookTitle: String(book.title ?? ''),
    student: { name: String(user.fullName ?? ''), studentId: String(user.studentId ?? ''), department: 'Computer Science', year: '2' },
    issueDate: String(raw.issueDate),
    dueDate: String(raw.dueDate),
    returnDate: raw.returnDate ? String(raw.returnDate) : null,
    status: (raw.status as IssueRecord['status']) ?? 'Active',
    fine: Number(raw.fine ?? 0),
  };
}

function apiNotificationToNotification(raw: Record<string, unknown>): NotificationItem {
  return {
    id: String(raw._id ?? raw.id),
    text: String(raw.text ?? ''),
    read: Boolean(raw.read),
    kind: (raw.kind as NotificationItem['kind']) ?? 'info',
    time: String(raw.createdAt ?? new Date().toISOString()),
  };
}

const ROUTE_PATHS: Record<RouteName, string> = {
  home: '/',
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
  'reset-password': '/reset-password',
  'admin-login': '/admin/login',
  'user-dashboard': '/user/dashboard',
  'my-books': '/user/my-books',
  books: '/books',
  'book-detail': '/book-detail',
  wishlist: '/wishlist',
  notifications: '/notifications',
  profile: '/profile',
  'admin-dashboard': '/admin/dashboard',
  'admin-books': '/admin/books',
  'admin-users': '/admin/users',
  'admin-issued': '/admin/issued',
  'admin-reservations': '/admin/reservations',
  'admin-overdue': '/admin/overdue',
  'admin-analytics': '/admin/analytics',
  'admin-reports': '/admin/reports',
  'admin-settings': '/admin/settings',
};

function routeFromPath(pathname: string): RouteName {
  const match = (Object.entries(ROUTE_PATHS) as [RouteName, string][]).find(([, path]) => path === pathname);
  return match?.[0] ?? 'home';
}

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => mergeSeedRecords(STORAGE_KEYS.books, SAMPLE_BOOKS));
  const [issues, setIssues] = useState<IssueRecord[]>(() =>
    mergeSeedRecords(STORAGE_KEYS.issues, SAMPLE_ISSUES).map((issue) => ({
      ...issue,
      status: deriveIssueStatus(issue),
      fine: issue.fine || computeFine(issue.dueDate),
    }))
  );
  const [users, setUsers] = useState<UserProfile[]>(() => mergeSeedRecords(STORAGE_KEYS.users, SAMPLE_USERS));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => mergeSeedRecords(STORAGE_KEYS.notifications, SAMPLE_NOTIFICATIONS));
  const [route, setRouteState] = useState<RouteName>(() => routeFromPath(window.location.pathname));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readJSON(STORAGE_KEYS.theme, 'light'));
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [borrowBookId, setBorrowBookId] = useState<string | null>(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategory, setBookCategory] = useState('All');
  const [bookAvailability, setBookAvailability] = useState('All');
  const [bookSort, setBookSort] = useState('popular');
  const [adminSearch, setAdminSearch] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [addBookForm, setAddBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Programming',
    publisher: '',
    publicationYear: '2024',
    description: '',
    totalCopies: '3',
    coverEmoji: '📘',
  });

  const currentUser = users.find((user) => user.id === sessionUserId) ?? null;

  function setRoute(next: RouteName) {
    setRouteState(next);
    if (window.location.pathname !== ROUTE_PATHS[next]) {
      window.history.pushState({}, '', ROUTE_PATHS[next]);
    }
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.issues, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users.map(({ password: _password, ...user }) => ({ ...user, password: '' }))));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
  }, [theme]);

  async function loadApiProfile(): Promise<UserProfile | null> {
    const { user } = await api.profile();
    const existing = users.find((entry) => entry.id === user.id || normalizeCredential(entry.email) === normalizeCredential(user.email));
    const profile = apiUserToProfile(user, existing);
    setUsers((previous) => {
      const matchingLocalId = previous.find((entry) => entry.id === profile.id || normalizeCredential(entry.email) === normalizeCredential(profile.email))?.id;
      const migrated = previous.map((user) => user.id === matchingLocalId ? { ...profile, wishlist: user.wishlist, reservedBooks: user.reservedBooks, notificationsRead: user.notificationsRead } : user);
      return migrated.some((user) => user.id === profile.id) ? migrated : [profile, ...migrated];
    });
    setSessionUserId(profile.id);
    try {
      const [bookResponse, issueResponse, notificationResponse] = await Promise.all([api.getBooks(), api.getIssues(), api.getNotifications()]);
      if (bookResponse.books.length > 0) setBooks(bookResponse.books.map(apiBookToBook));
      if (issueResponse.issues.length > 0) setIssues(issueResponse.issues.map(apiIssueToIssue));
      if (notificationResponse.notifications.length > 0) setNotifications(notificationResponse.notifications.map(apiNotificationToNotification));
      if (profile.role === 'ADMIN') {
        const userResponse = await api.getUsers();
        setUsers(userResponse.users.map((remoteUser) => apiUserToProfile(remoteUser)));
      }
    } catch {
      // The local demo collections remain available while MongoDB is empty or unavailable.
    }
    return profile;
  }

  useEffect(() => {
    if (!api.hasToken()) {
      setAuthReady(true);
      return;
    }
    void loadApiProfile().catch(() => {
      api.clearToken();
      setSessionUserId(null);
    }).finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handlePopState = () => setRouteState(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const userIssues = useMemo(
    () => issues.filter((issue) => issue.userId === sessionUserId && !issue.returnDate),
    [issues, sessionUserId]
  );

  const userWishlist = useMemo(
    () => (currentUser ? books.filter((book) => currentUser.wishlist.includes(book.id)) : []),
    [books, currentUser]
  );

  const availableBooks = books.filter((book) => getAvailableCopies(book) > 0).length;
  const overdueCount = issues.filter((issue) => issue.status === 'Overdue' && !issue.returnDate).length;
  const reservationCount = books.reduce((sum, book) => sum + book.reservedCopies, 0);

  function pushToast(kind: ToastMessage['kind'], text: string) {
    setToast({ id: generateId('toast'), kind, text });
  }

  function navigate(next: RouteName) {
    setRoute(next);
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      api.clearToken();
    } finally {
      setSessionUserId(null);
      setRoute('home');
      pushToast('info', 'You have been logged out.');
    }
  }

  async function handleUserLogin(email: string, password: string) {
    if (!normalizeCredential(email) || !password) {
      pushToast('error', 'Enter your email and password to continue.');
      return;
    }

    setIsSubmittingLogin(true);
    let data: { user: ApiUser };
    try {
      data = await api.login(normalizeCredential(email), password);
    } catch (error) {
      setIsSubmittingLogin(false);
      pushToast('error', getAuthErrorMessage(error instanceof Error ? error.message : '', 'Unable to sign in. Please try again.'));
      return;
    }
    setIsSubmittingLogin(false);
    const profile = apiUserToProfile(data.user, users.find((entry) => normalizeCredential(entry.email) === normalizeCredential(data.user.email)));
    setUsers((previous) => [profile, ...previous.filter((entry) => entry.id !== profile.id && normalizeCredential(entry.email) !== normalizeCredential(profile.email))]);
    setSessionUserId(profile.id);
    if (profile.role !== 'USER') {
      api.clearToken();
      setSessionUserId(null);
      pushToast('error', 'This account belongs to an administrator. Use Admin login.');
      return;
    }
    setRoute('user-dashboard');
    pushToast('success', `Welcome back, ${profile.fullName.split(' ')[0]}!`);
  }

  async function handleRegisterSubmit() {
    if (!registerForm.fullName.trim() || !registerForm.studentId.trim() || !registerForm.email.trim() || !registerForm.phone.trim()) {
      pushToast('error', 'Please complete all registration fields.');
      return;
    }
    if (!registerForm.email.includes('@')) {
      pushFormError('Please enter a valid email address.');
      return;
    }
    if (registerForm.password.length < 8) {
      pushFormError('Password must contain at least 8 characters.');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      pushFormError('Passwords do not match.');
      return;
    }

    setIsSubmittingRegister(true);
    let data: { user: ApiUser };
    try {
      data = await api.register({ fullName: registerForm.fullName.trim(), studentId: registerForm.studentId.trim(), email: normalizeCredential(registerForm.email), phone: registerForm.phone.trim(), password: registerForm.password });
    } catch (error) {
      setIsSubmittingRegister(false);
      pushToast('error', getAuthErrorMessage(error instanceof Error ? error.message : '', 'Unable to create your account. Please try again.'));
      return;
    }
    setIsSubmittingRegister(false);
    setRegisterForm({ fullName: '', studentId: '', email: '', phone: '', password: '', confirmPassword: '' });
    const profile = apiUserToProfile(data.user);
    setUsers((previous) => [profile, ...previous]);
    setSessionUserId(profile.id);
    setRoute('user-dashboard');
    pushToast('success', `Welcome to LibraSmart, ${profile.fullName.split(' ')[0]}!`);
  }

  function pushFormError(message: string) {
    pushToast('error', message);
  }

  async function handleAdminLogin() {
    setIsSubmittingAdmin(true);
    let data: { user: ApiUser };
    try {
      data = await api.login(normalizeCredential(adminForm.email), adminForm.password);
    } catch (error) {
      setIsSubmittingAdmin(false);
      pushToast('error', getAuthErrorMessage(error instanceof Error ? error.message : '', 'Unable to sign in. Please try again.'));
      return;
    }
    setIsSubmittingAdmin(false);
    const profile = apiUserToProfile(data.user);
    setUsers((previous) => [profile, ...previous.filter((entry) => entry.id !== profile.id)]);
    setSessionUserId(profile.id);
    if (!profile || profile.role !== 'ADMIN') {
      api.clearToken();
      setSessionUserId(null);
      pushToast('error', 'Access denied. This account is not an administrator.');
      return;
    }
    setRoute('admin-dashboard');
    pushToast('success', 'Administrator access granted.');
  }

  async function sendPasswordReset() {
    pushToast('info', 'Password reset is managed by your library administrator. Please contact support.');
  }

  async function updatePassword() {
    pushToast('info', 'Password reset is managed by your library administrator. Please contact support.');
  }

  async function handleAddBookSubmit() {
    const title = addBookForm.title.trim();
    const author = addBookForm.author.trim();
    const isbn = addBookForm.isbn.trim();
    const publisher = addBookForm.publisher.trim();
    const description = addBookForm.description.trim();
    const totalCopies = Number(addBookForm.totalCopies);

    if (!title || !author || !isbn || !publisher || !description) {
      pushToast('error', 'Please fill in all required book fields.');
      return;
    }

    if (books.some((book) => book.isbn === isbn)) {
      pushToast('error', 'A book with this ISBN already exists in the catalog.');
      return;
    }

    if (!Number.isFinite(totalCopies) || totalCopies <= 0) {
      pushToast('error', 'Total copies must be greater than zero.');
      return;
    }

    const newBook: Book = {
      id: generateId('book'),
      title,
      author,
      category: addBookForm.category,
      isbn,
      publisher,
      publicationYear: Number(addBookForm.publicationYear) || new Date().getFullYear(),
      language: 'English',
      description,
      rating: 4.5,
      totalCopies,
      issuedCopies: 0,
      reservedCopies: 0,
      coverAccent: '#4338ca',
      coverEmoji: addBookForm.coverEmoji || '📘',
    };

    if (api.hasToken() && currentUser?.role === 'ADMIN') {
      try {
        const response = await api.addBook({ ...newBook, id: undefined });
        setBooks((prev) => [apiBookToBook(response.book), ...prev]);
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to add the book.');
        return;
      }
    } else {
      setBooks((prev) => [newBook, ...prev]);
    }
    setAddBookForm({
      title: '',
      author: '',
      isbn: '',
      category: 'Programming',
      publisher: '',
      publicationYear: '2024',
      description: '',
      totalCopies: '3',
      coverEmoji: '📘',
    });
    pushToast('success', 'Book successfully added to the library inventory.');
  }

  async function toggleWishlist(bookId: string) {
    if (!currentUser) {
      setRoute('login');
      pushToast('info', 'Please log in to manage your wishlist.');
      return;
    }

    const alreadySaved = currentUser.wishlist.includes(bookId);
    if (api.hasToken() && isMongoId(bookId)) {
      try {
        const response = await api.updateWishlist(bookId, !alreadySaved);
        const profile = apiUserToProfile(response.user, currentUser);
        setUsers((prev) => prev.map((user) => user.id === currentUser.id ? profile : user));
        pushToast(alreadySaved ? 'info' : 'success', alreadySaved ? 'Book removed from wishlist.' : 'Book added to your wishlist.');
        return;
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to update your wishlist.');
        return;
      }
    }
    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              wishlist: alreadySaved ? user.wishlist.filter((id) => id !== bookId) : [...user.wishlist, bookId],
            }
          : user
      )
    );
    pushToast(alreadySaved ? 'info' : 'success', alreadySaved ? 'Book removed from wishlist.' : 'Book added to your wishlist.');
  }

  async function reserveBook(bookId: string) {
    if (!currentUser) {
      setRoute('login');
      pushToast('info', 'Login to reserve a book.');
      return;
    }

    const book = books.find((item) => item.id === bookId);
    if (!book) return;

    if (api.hasToken() && isMongoId(bookId)) {
      try {
        await api.reserveBook(bookId);
        setBooks((prev) => prev.map((item) => item.id === bookId ? { ...item, reservedCopies: Math.min(item.totalCopies, item.reservedCopies + 1) } : item));
        pushToast('success', 'You have successfully reserved this book.');
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to reserve the book.');
      }
      return;
    }

    setBooks((prev) =>
      prev.map((item) =>
        item.id === bookId ? { ...item, reservedCopies: Math.min(item.totalCopies, item.reservedCopies + 1) } : item
      )
    );
    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentUser.id
          ? { ...user, reservedBooks: user.reservedBooks.includes(bookId) ? user.reservedBooks : [...user.reservedBooks, bookId] }
          : user
      )
    );
    setNotifications((prev) => [
      {
        id: generateId('notification'),
        text: `Your reservation for ${book.title} is now pending approval.`,
        read: false,
        kind: 'info',
        time: new Date().toISOString(),
      },
      ...prev,
    ]);
    pushToast('success', 'You have successfully reserved this book.');
  }

  async function confirmBorrow(bookId: string) {
    if (!currentUser) {
      setRoute('login');
      pushToast('info', 'Please log in before borrowing.');
      return;
    }

    const book = books.find((item) => item.id === bookId);
    if (!book) {
      pushToast('error', 'The selected book could not be found.');
      return;
    }

    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(borrowDate.getDate() + 14);

    if (api.hasToken() && isMongoId(bookId)) {
      try {
        const response = await api.issueBook(bookId, dueDate.toISOString());
        setBooks((prev) => prev.map((item) => item.id === bookId ? { ...item, issuedCopies: item.issuedCopies + 1 } : item));
        setIssues((prev) => [apiIssueToIssue(response.issue), ...prev]);
        setNotifications((prev) => [{ id: generateId('notification'), text: `${book.title} was issued successfully to you.`, read: false, kind: 'success', time: new Date().toISOString() }, ...prev]);
        pushToast('success', 'Book successfully issued!');
        setSelectedBookId(null);
        setBorrowBookId(null);
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to issue the book.');
      }
      return;
    }

    const issue: IssueRecord = {
      id: generateId('issue'),
      userId: currentUser.id,
      bookId: book.id,
      bookTitle: book.title,
      student: {
        name: currentUser.fullName,
        studentId: currentUser.studentId,
        department: 'Computer Science',
        year: '2',
      },
      issueDate: borrowDate.toISOString(),
      dueDate: dueDate.toISOString(),
      returnDate: null,
      status: 'Active',
      fine: 0,
    };

    setBooks((prev) =>
      prev.map((item) =>
        item.id === bookId ? { ...item, issuedCopies: item.issuedCopies + 1 } : item
      )
    );
    setIssues((prev) => [issue, ...prev]);
    setNotifications((prev) => [
      { id: generateId('notification'), text: `${book.title} was issued successfully to you.`, read: false, kind: 'success', time: new Date().toISOString() },
      ...prev,
    ]);
    pushToast('success', 'Book successfully issued!');
    setSelectedBookId(null);
    setBorrowBookId(null);
  }

  async function returnIssuedBook(issueId: string) {
    const issue = issues.find((entry) => entry.id === issueId);
    if (!issue) return;

    if (api.hasToken() && isMongoId(issueId)) {
      try {
        const response = await api.returnBook(issueId);
        setIssues((prev) => prev.map((entry) => entry.id === issueId ? apiIssueToIssue(response.issue) : entry));
        setBooks((prev) => prev.map((book) => book.id === issue.bookId ? { ...book, issuedCopies: Math.max(0, book.issuedCopies - 1) } : book));
        setNotifications((prev) => [{ id: generateId('notification'), text: `You returned ${issue.bookTitle}.`, read: false, kind: 'success', time: new Date().toISOString() }, ...prev]);
        pushToast('success', 'Book returned successfully.');
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to return the book.');
      }
      return;
    }

    setIssues((prev) =>
      prev.map((entry) =>
        entry.id === issueId
          ? { ...entry, returnDate: new Date().toISOString(), status: 'Returned', fine: computeFine(entry.dueDate) }
          : entry
      )
    );

    setBooks((prev) =>
      prev.map((book) =>
        book.id === issue.bookId ? { ...book, issuedCopies: Math.max(0, book.issuedCopies - 1) } : book
      )
    );

    setNotifications((prev) => [
      { id: generateId('notification'), text: `You returned ${issue.bookTitle}.`, read: false, kind: 'info', time: new Date().toISOString() },
      ...prev,
    ]);
    pushToast('success', 'Book returned successfully.');
  }

  function extendDueDate(issueId: string) {
    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;
        const date = new Date(issue.dueDate);
        date.setDate(date.getDate() + 7);
        return { ...issue, dueDate: date.toISOString(), status: 'Active', fine: 0 };
      })
    );
    pushToast('success', 'Due date extended by 7 days.');
  }

  async function deleteBookFromCatalog(bookId: string) {
    if (api.hasToken() && isMongoId(bookId)) {
      try {
        await api.deleteBook(bookId);
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Unable to delete the book.');
        return;
      }
    }
    setBooks((prev) => prev.filter((book) => book.id !== bookId));
    setDeleteBookId(null);
    pushToast('success', 'Book deleted successfully.');
  }

  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    const list = books.filter((book) => {
      const matchesQuery =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category.toLowerCase().includes(query) ||
        book.isbn.includes(query);
      const matchesCategory = bookCategory === 'All' || book.category === bookCategory;
      const available = getAvailableCopies(book);
      const matchesAvailability =
        bookAvailability === 'All' ||
        (bookAvailability === 'Available' && available > 0) ||
        (bookAvailability === 'Reserved' && book.reservedCopies > 0) ||
        (bookAvailability === 'Issued' && book.issuedCopies > 0);

      return matchesQuery && matchesCategory && matchesAvailability;
    });

    return list.sort((a, b) => {
      if (bookSort === 'title') return a.title.localeCompare(b.title);
      if (bookSort === 'newest') return b.publicationYear - a.publicationYear;
      if (bookSort === 'popular') return b.rating - a.rating;
      return b.issuedCopies - a.issuedCopies;
    });
  }, [bookAvailability, bookCategory, bookSearch, bookSort, books]);

  const recommendedBooks = useMemo(() => {
    if (!currentUser) return books.slice(0, 3);
    const categories = new Set(
      issues
        .filter((issue) => issue.userId === currentUser.id)
        .map((issue) => books.find((book) => book.id === issue.bookId)?.category)
        .filter(Boolean) as string[]
    );
    return books.filter((book) => categories.has(book.category)).slice(0, 4);
  }, [books, currentUser, issues]);

  const adminFilteredUsers = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    return users.filter((user) => {
      const searchText = `${user.fullName} ${user.studentId} ${user.email}`.toLowerCase();
      return !query || searchText.includes(query);
    });
  }, [adminSearch, users]);

  const userDashboardIssues = issues.filter((issue) => issue.userId === sessionUserId && issue.returnDate === null);
  const dashboardStats = [
    { label: 'Total Books', value: books.length, icon: '📚', accent: 'blue' },
    { label: 'Available Books', value: availableBooks, icon: '✅', accent: 'green' },
    { label: 'Books Issued', value: issues.filter((issue) => !issue.returnDate).length, icon: '📖', accent: 'purple' },
    { label: 'Registered Users', value: users.filter((user) => user.role === 'USER').length, icon: '👥', accent: 'cyan' },
    { label: 'Overdue Books', value: overdueCount, icon: '⏰', accent: 'amber' },
    { label: 'Reservations', value: reservationCount, icon: '📌', accent: 'red' },
  ];

  function renderUserPage() {
    if (!currentUser && route === 'books') {
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Catalog</p>
              <h1>Explore the library</h1>
            </div>
            <button className="primary-btn" onClick={() => setRoute('login')}>Login to borrow</button>
          </div>

          <div className="filters-bar">
            <div className="search-box wide">
              <span>⌕</span>
              <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search title, author, ISBN or category" />
            </div>
            <select value={bookCategory} onChange={(e) => setBookCategory(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={bookAvailability} onChange={(e) => setBookAvailability(e.target.value)}>
              <option value="All">All</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Issued">Issued</option>
            </select>
            <select value={bookSort} onChange={(e) => setBookSort(e.target.value)}>
              <option value="popular">Sort by popularity</option>
              <option value="title">Sort by title</option>
              <option value="newest">Sort by newest</option>
              <option value="issued">Sort by issue count</option>
            </select>
          </div>

          <div className="book-grid">
            {filteredBooks.map((book) => {
              const available = getAvailableCopies(book);
              return (
                <div className="book-card" key={book.id}>
                  <div className="book-cover-with-badge">
                    <BookCover book={book} />
                    <span className={`badge ${available > 0 ? 'available' : 'issued'}`}>{available > 0 ? 'Available' : 'Issued'}</span>
                  </div>
                  <div className="book-meta-block">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <div className="chip-row"><span>{book.category}</span><span>★ {book.rating}</span></div>
                    <small>ISBN: {book.isbn}</small>
                    <strong>{available} copies available</strong>
                  </div>
                  <div className="card-actions">
                    <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>View Details</button>
                    <button className="primary-btn" onClick={() => setRoute('login')}>Login</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (!currentUser && route === 'book-detail' && selectedBookId) {
      const book = books.find((item) => item.id === selectedBookId);
      if (!book) {
        return null;
      }
      const available = getAvailableCopies(book);
      return (
        <div className="page-shell">
          <div className="detail-layout">
            <BookCover book={book} size="detail" className="detail-cover" />
            <div className="detail-body">
              <p className="eyebrow">{book.category}</p>
              <h1>{book.title}</h1>
              <h3>{book.author}</h3>
              <p>{book.description}</p>
              <div className="detail-grid">
                <span><strong>ISBN</strong> {book.isbn}</span>
                <span><strong>Publisher</strong> {book.publisher}</span>
                <span><strong>Publication Year</strong> {book.publicationYear}</span>
                <span><strong>Language</strong> {book.language}</span>
                <span><strong>Available Copies</strong> {available}</span>
                <span><strong>Total Copies</strong> {book.totalCopies}</span>
                <span><strong>Rating</strong> {book.rating} / 5</span>
              </div>
              <div className="button-row">
                <button className="primary-btn" onClick={() => setRoute('login')}>Login to borrow</button>
                <button className="secondary-btn" onClick={() => setRoute('books')}>Back to catalog</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (route === 'forgot-password') {
      return (
        <section className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">Account recovery</p>
            <h1>Reset your password</h1>
            <p className="auth-subtext">Enter your account email and Supabase will send a secure reset link.</p>
            <div className="field-row"><label>Email</label><input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div className="button-row">
              <button className="primary-btn" disabled={isSubmittingRecovery} onClick={() => void sendPasswordReset()}>{isSubmittingRecovery ? 'Sending...' : 'Send reset link'}</button>
              <button className="ghost-btn" onClick={() => setRoute('login')}>Back to Login</button>
            </div>
          </div>
        </section>
      );
    }

    if (route === 'reset-password') {
      return (
        <section className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">Secure recovery</p>
            <h1>Choose a new password</h1>
            <div className="field-row"><label>New Password</label><input type="password" value={resetForm.password} onChange={(e) => setResetForm((previous) => ({ ...previous, password: e.target.value }))} placeholder="At least 8 characters" /></div>
            <div className="field-row"><label>Confirm Password</label><input type="password" value={resetForm.confirmPassword} onChange={(e) => setResetForm((previous) => ({ ...previous, confirmPassword: e.target.value }))} placeholder="Repeat your password" /></div>
            <button className="primary-btn" disabled={isSubmittingReset} onClick={() => void updatePassword()}>{isSubmittingReset ? 'Updating...' : 'Update password'}</button>
          </div>
        </section>
      );
    }

    if (!currentUser) {
      return (
        <section className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">Account access</p>
            <h1>Welcome back</h1>
            <p className="auth-subtext">Sign in to continue to your smart library.</p>
            <div className="field-row">
              <label>Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="field-row password-field">
              <label>Password</label>
              <div className="password-wrap">
                <input
                  type={showUserPassword ? 'text' : 'password'}
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                />
                <button type="button" className="toggle-password" onClick={() => setShowUserPassword((prev) => !prev)}>
                  {showUserPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="button-row">
              <button className="primary-btn" disabled={isSubmittingLogin} onClick={() => void handleUserLogin(authForm.email, authForm.password)}>
                {isSubmittingLogin ? 'Logging in...' : 'Login'}
              </button>
              <button className="ghost-btn" onClick={() => setRoute('register')}>
                Create Account
              </button>
            </div>
            <div className="action-row">
              <button className="text-btn" onClick={() => setRoute('forgot-password')}>Forgot Password?</button>
              <button className="secondary-btn" onClick={() => setRoute('admin-login')}>
                Admin login
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (route === 'user-dashboard') {
      return (
        <div className="shell-layout">
          <aside className="side-panel">
            <div className="brand-block">
              <div className="brand-icon">📚</div>
              <div>
                <strong>LibraSmart</strong>
                <small>Student Portal</small>
              </div>
            </div>
            {[
              ['Dashboard', 'user-dashboard'],
              ['Browse Books', 'books'],
              ['My Books', 'my-books'],
              ['Reservations', 'books'],
              ['Wishlist', 'wishlist'],
              ['Notifications', 'notifications'],
              ['Profile', 'profile'],
            ].map(([label, value]) => (
              <button
                key={label}
                className={route === value ? 'nav-item active' : 'nav-item'}
                onClick={() => setRoute(value as RouteName)}
              >
                {label}
              </button>
            ))}
            <button className="nav-item danger" onClick={logout}>
              Logout
            </button>
          </aside>

          <main className="content-panel">
            <header className="topbar">
              <div className="search-box">
                <span>⌕</span>
                <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search books..." />
              </div>
              <div className="topbar-actions">
                <button className="icon-btn" onClick={() => setRoute('notifications')}>🔔</button>
                <button className="profile-pill" onClick={() => setRoute('profile')}>
                  <span>{currentUser.fullName.slice(0, 2).toUpperCase()}</span>
                  {currentUser.fullName}
                </button>
              </div>
            </header>

            <section className="stats-grid">
              {[
                { label: 'Borrowed Books', value: userDashboardIssues.length, icon: '📚', tone: 'blue' },
                { label: 'Due Soon', value: userDashboardIssues.filter((issue) => issue.status === 'Due Soon').length, icon: '⏰', tone: 'amber' },
                { label: 'Wishlist', value: currentUser.wishlist.length, icon: '❤️', tone: 'red' },
                { label: 'Reading History', value: issues.filter((issue) => issue.userId === currentUser.id && issue.returnDate).length, icon: '📖', tone: 'green' },
              ].map((item) => (
                <div className={`stat-card ${item.tone}`} key={item.label}>
                  <div className="stat-icon">{item.icon}</div>
                  <div>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="board-grid">
              <div className="panel">
                <div className="panel-header">
                  <h3>Currently Borrowed</h3>
                  <button className="link-btn" onClick={() => setRoute('books')}>Explore Books</button>
                </div>
                <div className="stack-list">
                  {userDashboardIssues.length === 0 ? (
                    <div className="empty-box">
                      <p>No borrowed books yet.</p>
                      <button className="secondary-btn" onClick={() => setRoute('books')}>Explore Books</button>
                    </div>
                  ) : (
                    userDashboardIssues.map((issue) => {
                      const book = books.find((item) => item.id === issue.bookId);
                      const daysLeft = Math.ceil((new Date(issue.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div className="book-issue-row" key={issue.id}>
                          <BookCover book={book} size="mini" />
                          <div className="issue-copy">
                            <strong>{issue.bookTitle}</strong>
                            <small>{issue.student.name}</small>
                            <span>Borrowed: {formatDate(issue.issueDate)} • Due: {formatDate(issue.dueDate)}</span>
                            <div className="progress-line"><span style={{ width: `${Math.max(15, 100 - Math.min(95, daysLeft * 8))}%` }} /></div>
                          </div>
                          <div className="issue-status-group">
                            <span className={`status-pill ${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>{issue.status}</span>
                            <button className="secondary-btn" onClick={() => returnIssuedBook(issue.id)}>Return</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Recommended For You</h3>
                </div>
                <div className="recommend-list">
                  {recommendedBooks.map((book) => (
                    <div className="recommend-item" key={book.id}>
                      <BookCover book={book} size="mini" />
                      <div>
                        <strong>{book.title}</strong>
                        <small>{book.author}</small>
                      </div>
                      <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bottom-grid">
              <div className="panel full-width">
                <div className="panel-header">
                  <h3>Recent Activity</h3>
                </div>
                <div className="activity-list">
                  {SAMPLE_ACTIVITY.map((item) => (
                    <div className="activity-row" key={item.id}>
                      <span>{item.type === 'issue' ? '📤' : item.type === 'return' ? '📥' : '✨'}</span>
                      <div>
                        <strong>{item.message}</strong>
                        <small>{relativeTime(item.timestamp)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      );
    }

    if (route === 'books') {
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Catalog</p>
              <h1>Browse books</h1>
            </div>
            <button className="primary-btn" onClick={() => setRoute('user-dashboard')}>Back to dashboard</button>
          </div>

          <div className="filters-bar">
            <div className="search-box wide">
              <span>⌕</span>
              <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search title, author, ISBN or category" />
            </div>
            <select value={bookCategory} onChange={(e) => setBookCategory(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select value={bookAvailability} onChange={(e) => setBookAvailability(e.target.value)}>
              <option value="All">All</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Issued">Issued</option>
            </select>
            <select value={bookSort} onChange={(e) => setBookSort(e.target.value)}>
              <option value="popular">Sort by popularity</option>
              <option value="title">Sort by title</option>
              <option value="newest">Sort by newest</option>
              <option value="issued">Sort by issue count</option>
            </select>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">🔎</div>
              <h3>No books match your search</h3>
              <p>Try another title, category, or availability filter to find more results.</p>
              <button className="primary-btn" onClick={() => { setBookSearch(''); setBookCategory('All'); setBookAvailability('All'); }}>Clear filters</button>
            </div>
          ) : (
            <div className="book-grid">
              {filteredBooks.map((book) => {
                const available = getAvailableCopies(book);
                const badgeClass = available > 0 ? 'available' : 'issued';
                const wishlistActive = currentUser?.wishlist.includes(book.id);
                return (
                  <div className="book-card" key={book.id}>
                    <div className="book-cover-with-badge">
                      <BookCover book={book} />
                      <span className={`badge ${badgeClass}`}>{available > 0 ? 'Available' : 'Issued'}</span>
                    </div>
                    <div className="book-meta-block">
                      <h3>{book.title}</h3>
                      <p>{book.author}</p>
                      <div className="chip-row">
                        <span>{book.category}</span>
                        <span>★ {book.rating}</span>
                      </div>
                      <small>ISBN: {book.isbn}</small>
                      <strong>{available} copies available</strong>
                    </div>
                    <div className="card-actions">
                      <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>
                        View Details
                      </button>
                      <button className="primary-btn" onClick={() => setBorrowBookId(book.id)} disabled={available <= 0}>
                        Borrow
                      </button>
                      <button className="secondary-btn" onClick={() => reserveBook(book.id)}>
                        Reserve
                      </button>
                      <button className="mini-toggle" onClick={() => toggleWishlist(book.id)}>{wishlistActive ? '♥' : '♡'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (route === 'my-books') {
      const activeIssues = userIssues;
      const dueSoonIssues = activeIssues.filter((issue) => issue.status === 'Due Soon');
      const overdueIssues = activeIssues.filter((issue) => issue.status === 'Overdue');
      const renderIssue = (issue: IssueRecord) => {
        const book = books.find((item) => item.id === issue.bookId);
        const daysRemaining = Math.ceil((new Date(issue.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const statusText = issue.status === 'Overdue' ? `OVERDUE • Fine ₹${computeFine(issue.dueDate)}` : `${Math.max(0, daysRemaining)} days remaining`;
        return (
          <div className="book-issue-row" key={issue.id}>
            <BookCover book={book} size="mini" />
            <div className="issue-copy">
              <strong>{issue.bookTitle}</strong>
              <small>{book?.author ?? 'LibraSmart library collection'}</small>
              <span>Borrowed: {formatDate(issue.issueDate)} • Due: {formatDate(issue.dueDate)}</span>
              <span className={issue.status === 'Overdue' ? 'overdue-copy' : issue.status === 'Due Soon' ? 'warning-copy' : ''}>{statusText}</span>
            </div>
            <div className="issue-status-group">
              <span className={`status-pill ${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>{issue.status}</span>
              <button className="secondary-btn" onClick={() => returnIssuedBook(issue.id)}>Return Book</button>
            </div>
          </div>
        );
      };
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div><p className="eyebrow">Reading activity</p><h1>My Books</h1></div>
            <button className="primary-btn" onClick={() => setRoute('books')}>Browse Books</button>
          </div>
          <section className="board-grid">
            <div className="panel">
              <div className="panel-header"><h3>Currently Borrowed</h3><span className="muted-label">{activeIssues.length} books</span></div>
              <div className="stack-list">
                {activeIssues.length === 0 ? <div className="empty-state-card small-empty"><div className="empty-state-icon">📚</div><h3>No books borrowed yet</h3><p>Explore our library and find your next book.</p><button className="primary-btn" onClick={() => setRoute('books')}>Browse Books</button></div> : activeIssues.map(renderIssue)}
              </div>
            </div>
            <div className="panel">
              <div className="panel-header"><h3>Borrowing overview</h3></div>
              <div className="profile-summary-grid compact-summary">
                <div className="summary-card"><span className="summary-label">Due soon</span><strong>{dueSoonIssues.length}</strong></div>
                <div className="summary-card"><span className="summary-label">Overdue</span><strong>{overdueIssues.length}</strong></div>
                <div className="summary-card"><span className="summary-label">History</span><strong>{issues.filter((issue) => issue.userId === currentUser?.id && issue.returnDate).length}</strong></div>
              </div>
              {overdueIssues.length > 0 && <div className="notice-callout danger"><strong>Action needed</strong><span>{overdueIssues.length} book{overdueIssues.length === 1 ? '' : 's'} require attention. Fines are calculated at ₹5 per day.</span></div>}
            </div>
          </section>
          {dueSoonIssues.length > 0 && <section className="panel full-width"><div className="panel-header"><h3>Due Soon</h3></div><div className="stack-list">{dueSoonIssues.map(renderIssue)}</div></section>}
          {overdueIssues.length > 0 && <section className="panel full-width"><div className="panel-header"><h3>Overdue</h3></div><div className="stack-list">{overdueIssues.map(renderIssue)}</div></section>}
        </div>
      );
    }

    if (route === 'book-detail' && selectedBookId) {
      const book = books.find((item) => item.id === selectedBookId);
      if (!book) {
        return null;
      }
      const available = getAvailableCopies(book);
      return (
        <div className="page-shell">
          <div className="detail-layout">
            <BookCover book={book} size="detail" className="detail-cover" />
            <div className="detail-body">
              <p className="eyebrow">{book.category}</p>
              <h1>{book.title}</h1>
              <h3>{book.author}</h3>
              <p>{book.description}</p>
              <div className="detail-grid">
                <span><strong>ISBN</strong> {book.isbn}</span>
                <span><strong>Publisher</strong> {book.publisher}</span>
                <span><strong>Publication Year</strong> {book.publicationYear}</span>
                <span><strong>Language</strong> {book.language}</span>
                <span><strong>Available Copies</strong> {available}</span>
                <span><strong>Total Copies</strong> {book.totalCopies}</span>
                <span><strong>Rating</strong> {book.rating} / 5</span>
              </div>
              <div className="button-row">
                <button className="primary-btn" onClick={() => setBorrowBookId(book.id)}>Borrow Book</button>
                <button className="secondary-btn" onClick={() => reserveBook(book.id)}>Reserve Book</button>
                <button className="ghost-btn" onClick={() => toggleWishlist(book.id)}>Add to Wishlist</button>
              </div>
            </div>
          </div>

          <div className="related-section">
            <div className="panel-header">
              <h3>Related Books</h3>
            </div>
            {books.filter((item) => item.category === book.category && item.id !== book.id).slice(0, 4).length === 0 ? (
              <div className="empty-state-card small-empty">
                <div className="empty-state-icon">📚</div>
                <h3>No related titles available</h3>
                <p>Explore the full catalog to discover more books in this subject area.</p>
                <button className="primary-btn" onClick={() => setRoute('books')}>Browse catalog</button>
              </div>
            ) : (
              <div className="book-grid compact">
                {books.filter((item) => item.category === book.category && item.id !== book.id).slice(0, 4).map((item) => (
                  <div className="book-card mini" key={item.id}>
                    <BookCover book={item} size="mini" />
                    <strong>{item.title}</strong>
                    <small>{item.author}</small>
                    <button className="ghost-btn" onClick={() => { setSelectedBookId(item.id); }}>Open</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (route === 'wishlist') {
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Your list</p>
              <h1>Wishlist</h1>
            </div>
          </div>
          {userWishlist.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">♡</div>
              <h3>Your wishlist is empty</h3>
              <p>Save books you want to read later and they will appear here.</p>
              <button className="primary-btn" onClick={() => setRoute('books')}>Explore books</button>
            </div>
          ) : (
            <div className="book-grid">
              {userWishlist.map((book) => (
                <div className="book-card" key={book.id}>
                  <BookCover book={book} />
                  <div className="book-meta-block">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <small>{book.category}</small>
                  </div>
                  <div className="card-actions">
                    <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>Open</button>
                    <button className="primary-btn" onClick={() => setBorrowBookId(book.id)} disabled={getAvailableCopies(book) <= 0}>Borrow</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (route === 'notifications') {
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Updates</p>
              <h1>Notifications</h1>
            </div>
            <button className="secondary-btn" onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))}>Mark all as read</button>
          </div>
          {notifications.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-state-icon">🔔</div>
              <h3>No notifications yet</h3>
              <p>You will see borrow reminders, approvals, and updates here when they arrive.</p>
              <button className="primary-btn" onClick={() => setRoute('books')}>Browse books</button>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((item) => (
                <div className={`notice-item ${item.read ? 'read' : 'new'}`} key={item.id}>
                  <div className={`notice-dot ${item.kind}`} />
                  <div>
                    <strong>{item.text}</strong>
                    <small>{relativeTime(item.time)}</small>
                  </div>
                  <button className="ghost-btn" onClick={() => setNotifications((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}>Mark read</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (route === 'profile') {
      return (
        <div className="page-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Account</p>
              <h1>Profile</h1>
            </div>
          </div>
          <div className="profile-card">
            <div className="profile-avatar">{currentUser.fullName.slice(0, 2).toUpperCase()}</div>
            <div className="profile-info">
              <h3>{currentUser.fullName}</h3>
              <p>{currentUser.studentId}</p>
              <p>{currentUser.email}</p>
              <p>{currentUser.phone}</p>
            </div>
          </div>

          <div className="profile-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Books borrowed</span>
              <strong>{issues.filter((issue) => issue.userId === currentUser.id && !issue.returnDate).length}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Wishlist items</span>
              <strong>{currentUser.wishlist.length}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Reservations</span>
              <strong>{currentUser.reservedBooks.length}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Member since</span>
              <strong>{formatDate(currentUser.joinedAt)}</strong>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  function renderAdminPage() {
    if (currentUser && currentUser.role !== 'ADMIN') {
      return (
        <section className="auth-shell">
          <div className="auth-card admin-card">
            <p className="eyebrow">Access denied</p>
            <h1>Administrator access required</h1>
            <p className="auth-subtext">Your account does not have permission to open this area.</p>
            <button className="primary-btn" onClick={() => setRoute('user-dashboard')}>Return to dashboard</button>
          </div>
        </section>
      );
    }

    if (!currentUser) {
      return (
        <section className="auth-shell">
          <div className="auth-card admin-card">
            <p className="eyebrow">Administrator access</p>
            <h1>LibraSmart Administration</h1>
            <div className="field-row">
              <label>Admin Email</label>
              <input value={adminForm.email} onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="field-row password-field">
              <label>Password</label>
              <div className="password-wrap">
                <input type={showAdminPassword ? 'text' : 'password'} value={adminForm.password} onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))} />
                <button type="button" className="toggle-password" onClick={() => setShowAdminPassword((prev) => !prev)}>{showAdminPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <button className="primary-btn" disabled={isSubmittingAdmin} onClick={handleAdminLogin}>{isSubmittingAdmin ? 'Authenticating...' : 'Login'}</button>
          </div>
        </section>
      );
    }

    const adminBooks = books.filter((book) => book.title.toLowerCase().includes(adminSearch.toLowerCase()) || book.author.toLowerCase().includes(adminSearch.toLowerCase()));

    if (route === 'admin-dashboard') {
      return (
        <div className="shell-layout admin-layout">
          <aside className="side-panel admin-side">
            <div className="brand-block">
              <div className="brand-icon">📚</div>
              <div>
                <strong>LibraSmart</strong>
                <small>Admin Console</small>
              </div>
            </div>
            {[
              ['Dashboard', 'admin-dashboard'],
              ['Books', 'admin-books'],
              ['Users', 'admin-users'],
              ['Issued Books', 'admin-issued'],
              ['Reservations', 'admin-reservations'],
              ['Overdue', 'admin-overdue'],
              ['Analytics', 'admin-analytics'],
              ['Reports', 'admin-reports'],
              ['Settings', 'admin-settings'],
            ].map(([label, value]) => (
              <button
                key={label}
                className={route === value ? 'nav-item active' : 'nav-item'}
                onClick={() => setRoute(value as RouteName)}
              >
                {label}
              </button>
            ))}
            <button className="nav-item danger" onClick={logout}>Logout</button>
          </aside>

          <main className="content-panel">
            <header className="topbar admin-topbar">
              <div>
                <p className="eyebrow">Operations overview</p>
                <h2>Library performance</h2>
              </div>
              <div className="topbar-actions">
                <button className="secondary-btn" onClick={() => setRoute('admin-books')}>+ Add Book</button>
                <button className="profile-pill" onClick={() => setRoute('admin-settings')}>
                  <span>AN</span>
                  Admin
                </button>
              </div>
            </header>

            <section className="stats-grid admin-stats">
              {dashboardStats.map((stat) => (
                <div className={`stat-card ${stat.accent}`} key={stat.label}>
                  <div className="stat-icon">{stat.icon}</div>
                  <div>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="board-grid admin-grid">
              <div className="panel">
                <div className="panel-header"><h3>Issued over time</h3></div>
                <div className="chart-bars">
                  {[30, 55, 47, 72, 64, 90, 112].map((value, index) => (
                    <div className="bar-column" key={index}>
                      <span style={{ height: `${value}%` }} />
                      <small>{['Jan','Feb','Mar','Apr','May','Jun','Jul'][index]}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-header"><h3>Top categories</h3></div>
                <div className="category-list">
                  {CATEGORIES.slice(0, 5).map((category, index) => (
                    <div className="category-row" key={category}>
                      <span>{category}</span>
                      <div className="progress-line"><span style={{ width: `${60 + index * 8}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      );
    }

    if (route === 'admin-books') {
      return (
        <div className="page-shell admin-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Catalog management</p>
              <h1>Books</h1>
            </div>
            <button className="primary-btn" onClick={() => setRoute('admin-dashboard')}>Back to dashboard</button>
          </div>

          <div className="admin-form-card">
            <h3>Add Book</h3>
            <div className="form-grid-two">
              <div className="field-row"><label>Title</label><input value={addBookForm.title} onChange={(e) => setAddBookForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
              <div className="field-row"><label>Author</label><input value={addBookForm.author} onChange={(e) => setAddBookForm((prev) => ({ ...prev, author: e.target.value }))} /></div>
              <div className="field-row"><label>ISBN</label><input value={addBookForm.isbn} onChange={(e) => setAddBookForm((prev) => ({ ...prev, isbn: e.target.value }))} /></div>
              <div className="field-row"><label>Category</label><select value={addBookForm.category} onChange={(e) => setAddBookForm((prev) => ({ ...prev, category: e.target.value }))}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="field-row"><label>Publisher</label><input value={addBookForm.publisher} onChange={(e) => setAddBookForm((prev) => ({ ...prev, publisher: e.target.value }))} /></div>
              <div className="field-row"><label>Publication Year</label><input value={addBookForm.publicationYear} onChange={(e) => setAddBookForm((prev) => ({ ...prev, publicationYear: e.target.value }))} /></div>
              <div className="field-row wide"><label>Description</label><textarea value={addBookForm.description} onChange={(e) => setAddBookForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
              <div className="field-row"><label>Cover Icon</label><input value={addBookForm.coverEmoji} onChange={(e) => setAddBookForm((prev) => ({ ...prev, coverEmoji: e.target.value }))} /></div>
              <div className="field-row"><label>Total Copies</label><input type="number" value={addBookForm.totalCopies} onChange={(e) => setAddBookForm((prev) => ({ ...prev, totalCopies: e.target.value }))} /></div>
            </div>
            <button className="primary-btn" onClick={handleAddBookSubmit}>Submit Book</button>
          </div>

          <div className="table-panel">
            <div className="table-header">
              <h3>Inventory</h3>
              <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Search books or authors" />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Book ID</th>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>Copies</th>
                  <th>Available</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminBooks.map((book) => (
                  <tr key={book.id}>
                    <td>{slugify(book.title).slice(0, 8)}</td>
                    <td><BookCover book={book} size="mini" /></td>
                    <td>{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.category}</td>
                    <td>{book.totalCopies}</td>
                    <td>{getAvailableCopies(book)}</td>
                    <td><span className={`status-pill ${getAvailableCopies(book) > 0 ? 'active' : 'overdue'}`}>{getAvailableCopies(book) > 0 ? 'Available' : 'Unavailable'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>View</button>
                        <button className="secondary-btn" onClick={() => pushToast('info', 'Edit flow is ready for extension.')}>Edit</button>
                        <button className="danger-btn" onClick={() => setDeleteBookId(book.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deleteBookId && (
            <div className="modal-backdrop" onClick={() => setDeleteBookId(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm deletion</h3>
                <p>Are you sure you want to delete this book from the catalog?</p>
                <div className="button-row">
                  <button className="ghost-btn" onClick={() => setDeleteBookId(null)}>Cancel</button>
                  <button className="danger-btn" onClick={() => deleteBookFromCatalog(deleteBookId)}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (route === 'admin-users') {
      return (
        <div className="page-shell admin-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Member management</p>
              <h1>Users</h1>
            </div>
          </div>
          <div className="table-panel">
            <div className="table-header">
              <h3>Registered users</h3>
              <input value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} placeholder="Search users" />
            </div>
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Books Borrowed</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminFilteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id.slice(0, 8)}</td>
                    <td>{user.fullName}</td>
                    <td>{user.studentId}</td>
                    <td>{user.email}</td>
                    <td>{issues.filter((issue) => issue.userId === user.id && !issue.returnDate).length}</td>
                    <td><span className="status-pill active">Active</span></td>
                    <td>{formatDate(user.joinedAt)}</td>
                    <td><div className="row-actions"><button className="ghost-btn" onClick={() => pushToast('info', `${user.fullName}'s account details opened.`)}>View</button><button className="secondary-btn" onClick={() => pushToast('success', `${user.fullName} account updated.`)}>Edit</button><button className="danger-btn" onClick={() => pushToast('info', `${user.fullName} account deactivated in demo mode.`)}>Deactivate</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (route === 'admin-issued') {
      return (
        <div className="page-shell admin-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Issue tracking</p>
              <h1>Issued Books</h1>
            </div>
          </div>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Book</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Fine</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.filter((issue) => !issue.returnDate).map((issue) => (
                  <tr key={issue.id}>
                    <td>{issue.student.name}</td>
                    <td>{issue.bookTitle}</td>
                    <td>{formatDate(issue.issueDate)}</td>
                    <td>{formatDate(issue.dueDate)}</td>
                    <td><span className={`status-pill ${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>{issue.status}</span></td>
                    <td>₹{issue.fine}</td>
                    <td><div className="row-actions"><button className="ghost-btn" onClick={() => returnIssuedBook(issue.id)}>Mark returned</button><button className="secondary-btn" onClick={() => extendDueDate(issue.id)}>Extend</button><button className="primary-btn" onClick={() => pushToast('info', `Overdue details for ${issue.bookTitle} ready to review.`)}>View details</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (route === 'admin-reservations') {
      return (
        <div className="page-shell admin-shell">
          <h1>Reservations</h1>
          <div className="table-panel">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Book</th>
                  <th>Reservation Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.filter((user) => user.reservedBooks.length > 0).map((user) => (
                  user.reservedBooks.map((bookId) => {
                    const book = books.find((item) => item.id === bookId);
                    if (!book) return null;
                    return (
                      <tr key={`${user.id}-${bookId}`}>
                        <td>{user.fullName}</td>
                        <td>{book.title}</td>
                        <td>{formatDate(new Date().toISOString())}</td>
                        <td><span className="status-pill active">Pending</span></td>
                        <td><div className="row-actions"><button className="secondary-btn" onClick={() => pushToast('success', `${book.title} reservation approved.`)}>Approve</button><button className="ghost-btn" onClick={() => pushToast('info', `${book.title} reservation cancelled.`)}>Cancel</button><button className="primary-btn" onClick={() => pushToast('success', `${book.title} reservation completed.`)}>Complete</button></div></td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (route === 'admin-analytics') {
      return (
        <div className="page-shell admin-shell">
          <h1>Analytics</h1>
          <div className="analysis-grid">
            <div className="panel"><div className="panel-header"><h3>Books issued over time</h3></div><div className="mini-bars">{[35,50,60,45,70,90].map((height) => <span style={{ height: `${height}%` }} />)}</div></div>
            <div className="panel"><div className="panel-header"><h3>Most borrowed categories</h3></div><div className="pill-stack"><span>Programming</span><span>AI</span><span>Web</span></div></div>
            <div className="panel"><div className="panel-header"><h3>Most popular books</h3></div><ul className="simple-list"><li>Clean Code</li><li>Deep Learning</li><li>React for Beginners</li></ul></div>
            <div className="panel"><div className="panel-header"><h3>Active users</h3></div><div className="big-number">144</div></div>
          </div>
        </div>
      );
    }

    if (route === 'admin-reports') {
      return (
        <div className="page-shell admin-shell">
          <div className="page-title-row">
            <div>
              <p className="eyebrow">Reports</p>
              <h1>Export library reports</h1>
            </div>
            <button className="primary-btn" onClick={() => {
              const csv = ['Title,Author,Category,ISBN,Available'];
              books.forEach((book) => csv.push(`${book.title},${book.author},${book.category},${book.isbn},${getAvailableCopies(book)}`));
              const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'librasmart-book-report.csv';
              link.click();
              URL.revokeObjectURL(url);
              pushToast('success', 'Report exported successfully.');
            }}>Export Report</button>
          </div>
          <div className="report-grid">
            {['Book Inventory', 'User Report', 'Borrowing Report', 'Overdue Report', 'Monthly Activity'].map((report) => (
              <div className="report-card" key={report}>{report}</div>
            ))}
          </div>
        </div>
      );
    }

    if (route === 'admin-settings') {
      return (
        <div className="page-shell admin-shell">
          <h1>Settings</h1>
          <div className="settings-grid">
            <div className="panel">
              <h3>Library settings</h3>
              <div className="field-row"><label>Library Name</label><input defaultValue="LibraSmart" /></div>
              <div className="field-row"><label>Fine Per Day</label><input defaultValue="₹5" /></div>
              <div className="field-row"><label>Borrow Duration</label><input defaultValue="14 days" /></div>
              <button className="primary-btn" onClick={() => pushToast('success', 'Library settings updated.')}>Save</button>
            </div>
            <div className="panel">
              <h3>Appearance</h3>
              <div className="field-row"><label>Theme</label><select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}><option value="light">Light</option><option value="dark">Dark</option></select></div>
              <button className="secondary-btn" onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}>Toggle Theme</button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  if (!authReady) {
    return (
      <div className={theme === 'dark' ? 'app-shell theme-dark' : 'app-shell theme-light'}>
        <section className="auth-shell"><div className="auth-card"><p className="eyebrow">LibraSmart</p><h1>Checking your session...</h1><p className="auth-subtext">Loading your secure library account.</p></div></section>
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'app-shell theme-dark' : 'app-shell theme-light'}>
      <header className="top-header">
        <div className="header-inner">
          <button className="brand-mark" onClick={() => setRoute('home')}>
            <span>📚</span>
            <div>
              <strong>LibraSmart</strong>
              <small>Smart Library Management System</small>
            </div>
          </button>

          <nav className="main-nav">
            <button className={route === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => setRoute('home')}>Home</button>
            <button className={route === 'books' ? 'nav-link active' : 'nav-link'} onClick={() => setRoute('books')}>Books</button>
            <button className={route === 'my-books' ? 'nav-link active' : 'nav-link'} onClick={() => (currentUser ? setRoute('my-books') : setRoute('login'))}>My Books</button>
            <button className={route === 'wishlist' ? 'nav-link active' : 'nav-link'} onClick={() => (currentUser ? setRoute('wishlist') : setRoute('login'))}>Wishlist</button>
            <button className={route === 'notifications' ? 'nav-link active' : 'nav-link'} onClick={() => (currentUser ? setRoute('notifications') : setRoute('login'))}>Notifications</button>
            <button className={route === 'profile' ? 'nav-link active' : 'nav-link'} onClick={() => (currentUser ? setRoute('profile') : setRoute('login'))}>Profile</button>
          </nav>

          <div className="header-actions">
            {currentUser ? (
              <button className="primary-btn" onClick={logout}>Logout</button>
            ) : (
              <>
                <button className="ghost-btn" onClick={() => setRoute('login')}>Login</button>
                <button className="primary-btn" onClick={() => setRoute('register')}>Create Account</button>
              </>
            )}
          </div>
        </div>
      </header>

      {route === 'home' && (
        <main className="landing-page">
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">SMART LIBRARY MANAGEMENT</p>
              <h1>Search, borrow and manage books effortlessly.</h1>
              <p className="subtext">LibraSmart brings discovery, tracking, renewals, and administration into one confident student-first digital library experience.</p>
              <div className="hero-badges" aria-label="Product highlights">
                <span>⚡ Smart catalog</span>
                <span>🔐 Secure access</span>
                <span>📈 Live tracking</span>
              </div>
              <div className="button-row">
                <button className="primary-btn" onClick={() => setRoute('books')}>Explore Books</button>
                <button className="secondary-btn" onClick={() => setRoute('login')}>Login</button>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-card main-card">
                <div className="book-stack">
                  <span className="stack-item book-one">📖</span>
                  <span className="stack-item book-two">📘</span>
                  <span className="stack-item book-three">📙</span>
                </div>
                <div className="floating-panel">
                  <small>Books Available</small>
                  <strong>{availableBooks}</strong>
                </div>
                <div className="analytics-mini">
                  <span>99.6%</span>
                  <small>Uptime</small>
                </div>
              </div>
            </div>
          </section>

          <section className="trust-bar">
            <span>Trusted by 120+ institutions</span>
            <span>Campus ready</span>
            <span>Simple onboarding</span>
            <span>Real-time tracking</span>
          </section>

          <section className="feature-section">
            <div className="section-heading">
              <p className="eyebrow">Key Features</p>
              <h2>Built for modern learning</h2>
            </div>
            <div className="feature-grid">
              {[
                ['📚', 'Smart Book Search'],
                ['🔐', 'Secure User Access'],
                ['⚡', 'Fast Book Issuing'],
                ['📊', 'Library Analytics'],
                ['🔔', 'Due Date Notifications'],
                ['📱', 'Responsive Experience'],
              ].map(([icon, label]) => (
                <div className="feature-card" key={label}><span>{icon}</span><strong>{label}</strong></div>
              ))}
            </div>
          </section>

          <section className="process-section">
            <div className="section-heading">
              <p className="eyebrow">How it works</p>
              <h2>Everything your library needs</h2>
            </div>
            <div className="process-grid">
              {[
                ['01', 'Browse catalog', 'Students discover books by category, author, and availability in a single, fast search flow.'],
                ['02', 'Borrow instantly', 'A clear issue flow helps users reserve or borrow with confidence and low-friction steps.'],
                ['03', 'Track and manage', 'Admin staff monitor activity, overdue books, and usage trends from one dashboard.'],
              ].map(([step, title, text]) => (
                <div className="process-card" key={step}>
                  <span className="step-number">{step}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-row">
            {[
              ['Total Books', books.length],
              ['Available Books', availableBooks],
              ['Registered Users', users.filter((user) => user.role === 'USER').length],
              ['Books Issued', issues.filter((issue) => !issue.returnDate).length],
            ].map(([label, value]) => (
              <div className="metric-card" key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </section>

          <section className="popular-section">
            <div className="section-heading">
              <p className="eyebrow">Popular Books</p>
              <h2>Most loved by students</h2>
            </div>
            <div className="book-grid home-grid">
              {books.slice(0, 4).map((book) => (
                <div className="book-card" key={book.id}>
                  <BookCover book={book} />
                  <div className="book-meta-block">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <div className="chip-row"><span>{book.category}</span><span>★ {book.rating}</span></div>
                    <strong>{getAvailableCopies(book)} available</strong>
                  </div>
                  <button className="ghost-btn" onClick={() => { setSelectedBookId(book.id); setRoute('book-detail'); }}>View Details</button>
                </div>
              ))}
            </div>
          </section>

          <section className="about-section">
            <div className="about-content">
              <p className="eyebrow">Our solution</p>
              <h2>Traditional libraries can be difficult to manage.</h2>
              <p>LibraSmart provides a centralized smart platform for discovery, borrowing, tracking, and administration in one smooth experience.</p>
              <p><strong>Search → Borrow → Track → Return → Analyze</strong></p>
            </div>
          </section>

          <footer className="site-footer">
            <div>
              <strong>LibraSmart</strong>
              <p>Discover. Borrow. Manage. Smarter.</p>
            </div>
            <div>
              <small>© 2026 LibraSmart</small>
            </div>
          </footer>
        </main>
      )}

      {route === 'login' && !currentUser && renderUserPage()}
      {route === 'register' && !currentUser && (
        <section className="auth-shell">
          <div className="auth-card">
            <p className="eyebrow">Create account</p>
            <h1>Register as a student</h1>
            <div className="form-grid-two">
              <div className="field-row"><label>Full Name</label><input value={registerForm.fullName} onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))} /></div>
              <div className="field-row"><label>Student ID</label><input value={registerForm.studentId} onChange={(e) => setRegisterForm((prev) => ({ ...prev, studentId: e.target.value }))} /></div>
              <div className="field-row"><label>Email</label><input value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
              <div className="field-row"><label>Phone</label><input value={registerForm.phone} onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
              <div className="field-row password-field">
                <label>Password</label>
                <div className="password-wrap">
                  <input type={showRegisterPassword ? 'text' : 'password'} value={registerForm.password} onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))} />
                  <button type="button" className="toggle-password" onClick={() => setShowRegisterPassword((prev) => !prev)}>{showRegisterPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
              <div className="field-row password-field">
                <label>Confirm Password</label>
                <div className="password-wrap">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={registerForm.confirmPassword} onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
                  <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword((prev) => !prev)}>{showConfirmPassword ? 'Hide' : 'Show'}</button>
                </div>
              </div>
            </div>
            <div className="button-row">
              <button className="primary-btn" disabled={isSubmittingRegister} onClick={() => void handleRegisterSubmit()}>{isSubmittingRegister ? 'Creating account...' : 'Create Account'}</button>
              <button className="secondary-btn" onClick={() => setRoute('login')}>Back to Login</button>
            </div>
          </div>
        </section>
      )}
      {route === 'admin-login' && renderAdminPage()}
      {currentUser && currentUser.role === 'USER' && renderUserPage()}
      {currentUser && currentUser.role === 'ADMIN' && renderAdminPage()}

      {borrowBookId && (
        <div className="modal-backdrop" onClick={() => setBorrowBookId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Borrow Book</h3>
            {(() => {
              const book = books.find((item) => item.id === borrowBookId);
              if (!book) return null;
              return (
                <>
                  <p><strong>{book.title}</strong></p>
                  <p>Borrow Date: {formatDate(new Date().toISOString())}</p>
                  <p>Expected Return Date: {formatDate(daysFromNow(14))}</p>
                  <div className="button-row">
                    <button className="ghost-btn" onClick={() => setBorrowBookId(null)}>Cancel</button>
                    <button className="primary-btn" onClick={() => confirmBorrow(book.id)}>Confirm Borrow</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.kind}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
