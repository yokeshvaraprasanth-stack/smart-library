# LibraSmart – Smart Library Management System

A complete, working library management dashboard built for a college hackathon.
Search books, issue and return them, add new titles, and watch every statistic
update live. The frontend has a MongoDB-backed Express API with JWT auth and
keeps the seeded LocalStorage data as a development fallback when MongoDB is empty.

## Tech stack

Frontend: React + TypeScript + Vite, plain CSS.
Backend: Node.js + Express + MongoDB + Mongoose + JWT + bcryptjs.

## Install & run

```bash
npm install
npm run dev

# In a second terminal
cd backend
npm install
npm run dev
```

Then open `http://localhost:5173`. The API runs at `http://localhost:5000`.
Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a strong
`JWT_SECRET` before using database-backed features.

## Project structure

```
librasmart/
  src/
    components/   Navbar, Dashboard, Books, IssueBook, IssuedBooks, AddBook, ToastStack
    data/         seed catalog + demo issues
    types/        Book, Student, IssueRecord, Activity
    utils/        LocalStorage helpers + business logic (issue/return/add)
    App.tsx       page routing + state
    main.tsx      React entry point
    index.css     design system + all component styles
   backend/
      server.js     Express entry point
      config/       MongoDB connection
      models/       User, Book, Issue, Notification, Reservation
      routes/       Auth, books, issues, users, notifications, reservations
      controllers/  REST request handlers
      middleware/   JWT, admin, database, and error middleware
  index.html
  package.json
```

## Testing checklist

- [ ] Dashboard loads with non-zero Total/Available/Issued/Students stats
- [ ] Searching "Python" on the Books page filters to Python Programming
- [ ] Filtering by category and by availability both narrow the list correctly
- [ ] Issuing a book with an empty student name shows a validation error
- [ ] Issuing a book with due date ≤ issue date shows a validation error
- [ ] Issuing the last available copy makes the book show "Unavailable" and disables further issuing
- [ ] Confirming an issue shows a success toast and updates the Dashboard stats immediately
- [ ] Issued Books page lists the new issue with the correct status badge
- [ ] Returning a book asks for confirmation, then updates availability and stats
- [ ] Adding a book with a duplicate ISBN is rejected
- [ ] A newly added book appears immediately on the Books page
- [ ] Reloading the page keeps all data (LocalStorage persistence)
- [ ] Resizing to a phone width collapses the nav into a hamburger menu and reflows cards to one column

## 2-minute hackathon presentation script

> "Every college library still runs on registers and guesswork about what's
> available. LibraSmart replaces that with a single dashboard.
>
> [Dashboard] Here's the librarian's home screen — total books, what's
> available right now, what's issued, and how many students currently have a
> book out. These aren't hard-coded; they're computed live from the catalog.
>
> [Books] Say a student asks for a Python book. I search 'Python' — instant
> filter, no page reload. I can also filter by category or availability.
>
> [Issue] I click Issue, pick the book, and fill in the student's details —
> Yokesh, 23AI087, AI & DS, third year. Confirm Issue.
>
> [Dashboard] Back on the dashboard — Available just dropped by one, Issued
> went up by one, and the activity feed logged it.
>
> [Issued Books] Here's every book currently checked out, with due dates and
> status — active, due soon, or overdue. I'll return this one — confirm — and
> the dashboard updates again, live.
>
> [Add Book] Finally, adding a new title takes seconds, and it shows up in the
> catalog instantly.
>
> Everything is built in React and TypeScript, runs entirely in the browser
> with LocalStorage, and needs no backend, no API key, and no login — so it's
> ready to deploy in any college library today."

## Likely judge questions

1. **"What happens if I refresh the page — do I lose my data?"**
   No. Every change is written to LocalStorage immediately, so the catalog,
   issue records, and activity log all survive a reload.

2. **"How do you stop two students from getting the last copy of a book?"**
   Availability is checked at the moment of issuing (`available copies ≤ 0`
   blocks the action), and the count is decremented immediately, so the UI
   never shows a copy as available after it's gone.

3. **"Why no backend or database?"**
   For a 3-hour hackathon build, LocalStorage lets us ship a fully working,
   demoable prototype without infrastructure, auth, or hosting overhead. The
   data layer is isolated in `utils/storage.ts`, so swapping in a real API
   later means changing one file, not the UI.

4. **"How do you calculate 'Due Soon' vs 'Overdue'?"**
   Status is derived from today's date against the due date every time it's
   displayed — 3 days or fewer remaining is "Due Soon," a past due date is
   "Overdue," so it's always accurate without manual updates.

5. **"Is this responsive / usable on a phone?"**
   Yes — the nav collapses to a hamburger menu, book cards reflow to a single
   column, and tables become horizontally scrollable, all tested down to
   mobile widths.

## Future enhancements

- Real backend + database for multi-device, multi-librarian sync
- Barcode/ISBN scanning for faster issue and return
- Email/SMS reminders for due and overdue books
- Fine calculation for overdue returns
- Student-facing portal to search and reserve books
- CSV import/export for bulk catalog management
- Role-based login for librarians vs. student assistants
