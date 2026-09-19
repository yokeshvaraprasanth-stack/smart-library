export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  publisher: string;
  publicationYear: number;
  language: string;
  description: string;
  rating: number;
  totalCopies: number;
  issuedCopies: number;
  reservedCopies: number;
  coverAccent: string;
  coverEmoji: string;
}

export type BookStatus = 'Available' | 'Partially Available' | 'Unavailable';

export interface Student {
  name: string;
  studentId: string;
  department: string;
  year: string;
}

export type IssueStatus = 'Active' | 'Due Soon' | 'Overdue' | 'Returned';

export interface IssueRecord {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  student: Student;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: IssueStatus;
  fine: number;
}

export type ActivityType = 'issue' | 'return' | 'add' | 'reserve';

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}

export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  joinedAt: string;
  theme: 'light' | 'dark';
  wishlist: string[];
  reservedBooks: string[];
  notificationsRead: string[];
}

export interface NotificationItem {
  id: string;
  text: string;
  read: boolean;
  kind: 'info' | 'success' | 'warning' | 'danger';
  time: string;
}

export type RouteName =
  | 'home'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'admin-login'
  | 'user-dashboard'
  | 'my-books'
  | 'books'
  | 'book-detail'
  | 'wishlist'
  | 'notifications'
  | 'profile'
  | 'admin-dashboard'
  | 'admin-books'
  | 'admin-users'
  | 'admin-issued'
  | 'admin-reservations'
  | 'admin-overdue'
  | 'admin-analytics'
  | 'admin-reports'
  | 'admin-settings';

export type Page = 'dashboard' | 'books' | 'issue' | 'issued' | 'add';
