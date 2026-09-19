const API_BASE_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')
).replace(/\/$/, '');
const TOKEN_KEY = 'librasmart.apiToken';

export interface ApiUser {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  wishlist: string[];
  reservedBooks: string[];
  joinedAt: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Unable to connect to the library server. Please start the backend and try again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The library server returned an error.');
  return payload as T;
}

export const api = {
  hasToken: () => Boolean(localStorage.getItem(TOKEN_KEY)),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },
  register: async (payload: { fullName: string; studentId: string; email: string; phone: string; password: string }) => {
    const result = await request<{ token: string; user: ApiUser }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },
  profile: () => request<{ user: ApiUser }>('/auth/profile'),
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  getBooks: (query = '') => request<{ books: Record<string, unknown>[] }>(`/books${query}`),
  getBook: (id: string) => request<{ book: Record<string, unknown> }>(`/books/${id}`),
  addBook: (book: Record<string, unknown>) => request<{ book: Record<string, unknown> }>('/books', { method: 'POST', body: JSON.stringify(book) }),
  updateBook: (id: string, book: Record<string, unknown>) => request<{ book: Record<string, unknown> }>(`/books/${id}`, { method: 'PUT', body: JSON.stringify(book) }),
  deleteBook: (id: string) => request<{ message: string }>(`/books/${id}`, { method: 'DELETE' }),
  issueBook: (bookId: string, dueDate?: string) => request<{ issue: Record<string, unknown> }>('/issues', { method: 'POST', body: JSON.stringify({ bookId, dueDate }) }),
  getIssues: () => request<{ issues: Record<string, unknown>[] }>('/issues'),
  returnBook: (issueId: string) => request<{ issue: Record<string, unknown> }>(`/issues/${issueId}/return`, { method: 'PUT' }),
  reserveBook: (bookId: string) => request<{ reservation: Record<string, unknown> }>('/reservations', { method: 'POST', body: JSON.stringify({ bookId }) }),
  updateWishlist: (bookId: string, saved: boolean) => request<{ user: ApiUser }>('/users/wishlist', { method: 'PUT', body: JSON.stringify({ bookId, saved }) }),
  getUsers: () => request<{ users: ApiUser[] }>('/users'),
  getNotifications: () => request<{ notifications: Record<string, unknown>[] }>('/notifications'),
};
