# Attendance

A student attendance application: classes with a hard 30-student capacity,
student records, daily attendance with four statuses, filterable history and
per-student statistics.

Built with Next.js 15 (App Router, Server Components + Server Actions),
PostgreSQL and Drizzle ORM.

---

## Requirements

- Node.js 20+
- PostgreSQL 14+

## 1. Install dependencies

```bash
npm install
```

## 2. Configure the database

Copy the example environment file and point `DATABASE_URL` at your PostgreSQL
instance:

```bash
cp .env.example .env.local
```

| Variable        | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string (required)                     |
| `DEMO_EMAIL`    | Shared demo account email (default `demo@attendance.app`)   |
| `DEMO_PASSWORD` | Shared demo account password (default `demo12345`)          |
| `APP_TIMEZONE`  | Time zone used for "today" (default `Asia/Jakarta`)         |
| `SEED_DEMO`     | Set to `false` to skip demo seeding during a deploy release |

A throwaway local database:

```bash
docker run -d --name attendance-pg \
  -e POSTGRES_USER=attendance -e POSTGRES_PASSWORD=attendance -e POSTGRES_DB=attendance \
  -p 55432:5432 postgres:16-alpine
```

## 3. Run migrations

```bash
npm run db:migrate
```

Migrations are plain SQL files in `drizzle/`, applied once each and tracked in
the `schema_migrations` table, so the command is safe to re-run.

## 4. Seed the demo account

```bash
npm run db:seed
```

This creates the shared demo user (`demo@attendance.app` / `demo12345`) with
48 students and three classes — Computer Science A (24/30), Mathematics B
(30/30, full) and Physics C (14/30) — plus ten weekdays of attendance history.
Re-running it replaces only the demo account's data.

## 5. Start the application

```bash
npm run dev            # development, http://localhost:3000
# or
npm run build && npm start   # production build
```

Open `/login` and use **Try Demo**, or create your own account.

---

## Capacity rule and concurrency

A class holds at most **30** students. The rule is enforced in three places:

1. **UI** — the class page shows `24 / 30 students`, and at 30 the enrollment
   form is replaced by *"This class has reached the maximum capacity of 30
   students."*
2. **Business logic** (`lib/domain/enrollments.ts`) — `enrollStudent()` runs in
   a transaction that first takes a row lock on the class:

   ```sql
   SELECT id FROM classes WHERE id = $1 AND owner_id = $2 FOR UPDATE;
   ```

   Two concurrent requests for the same class therefore serialize: the second
   transaction blocks until the first commits and only then counts the members,
   so it sees 30 and is rejected. The UI and the REST API both call this single
   function — there is no second code path that skips it.
3. **Database** — every enrollment carries a `seat_no` with
   `CHECK (seat_no BETWEEN 1 AND 30)` and `UNIQUE (class_id, seat_no)`. Even a
   direct `INSERT` from psql, a second application process or a future bug
   cannot create a 31st membership; PostgreSQL rejects it.

### Demonstration

With the app running and the demo account seeded:

```bash
BASE_URL=http://localhost:3000 npm run check:concurrency
```

The script builds a scratch class with 29 students and then fires five
**simultaneous** `POST /api/classes/:id/enrollments` requests for five different
students:

```
Class filled to 29 / 30.
Fired 5 simultaneous enrollments.
  accepted: 1
  rejected with 409: 4
  → This class has reached the maximum capacity of 30 students.
Final class size: 30 / 30
PASS: capacity held at 30 under concurrent enrollment.
```

---

## Authorization model

Every request resolves the signed-in user from an httpOnly session cookie
(`lib/auth.ts`). Identifiers coming from the client are never treated as proof
of ownership: each query carries the owner id in its `WHERE` clause, for example

```sql
SELECT ... FROM classes WHERE id = $1 AND owner_id = $2
```

so another account's class, student, enrollment or attendance record is
indistinguishable from one that does not exist — the API answers `404`, the UI
renders the not-found page. The same domain functions back both the server
actions and the JSON API, so calling the API directly gains nothing.

---

## Data model

| Table                | Key columns                                    | Constraints |
| -------------------- | ---------------------------------------------- | ----------- |
| `users`              | `email`, `password_hash`, `is_demo`            | unique `lower(email)` |
| `sessions`           | `token_hash`, `user_id`, `expires_at`          | FK → users (cascade) |
| `classes`            | `owner_id`, `name`, `description`, `created_at`| unique (`owner_id`, `lower(name)`), index on `owner_id` |
| `students`           | `owner_id`, `student_identifier`, `full_name`, `email`, `phone` | unique (`owner_id`, `lower(student_identifier)`) |
| `enrollments`        | `class_id`, `student_id`, `seat_no`            | unique (`class_id`,`student_id`) — no duplicate membership; unique (`class_id`,`seat_no`) + CHECK 1..30 — hard capacity |
| `attendance_records` | `class_id`, `student_id`, `date`, `status`     | unique (`class_id`,`student_id`,`date`) — one record per day, re-saving updates it |

Deleting a user cascades to their classes and students; deleting a class or a
student cascades to enrollments and attendance records.

Attendance statuses are a PostgreSQL enum: `present`, `absent`, `late`,
`excused`.

---

## Project structure

```
app/
  (app)/                  authenticated pages: dashboard, classes, students,
                          attendance history, settings — plus their server actions
  api/                    JSON API (same domain logic, same authorization)
  login/                  sign in / register / Try Demo
components/               presentational + client components only
lib/
  auth.ts                 sessions, sign in / up / out, requireUser()
  db/                     Drizzle connection and schema (tables, relations, indexes)
  domain/                 business logic: classes, students, enrollments, attendance
  validation.ts           zod schemas shared by actions and API routes
  errors.ts               typed domain errors mapped to HTTP status codes
drizzle/                  SQL migrations
scripts/                  migration runner, demo seeder, release step, concurrency check
```

Components never talk to the database: pages call `lib/domain/*`, which is the
only layer that touches Drizzle, and every mutation is validated with zod first.

## JSON API

All routes require the session cookie.

| Method & path                          | Purpose |
| -------------------------------------- | ------- |
| `POST /api/auth/login`                 | `{email, password}` or `{demo: true}` |
| `GET  /api/classes`                    | List classes with member counts |
| `POST /api/classes`                    | Create a class |
| `GET  /api/classes/:id`                | Class detail + members |
| `DELETE /api/classes/:id`              | Delete a class |
| `GET  /api/classes/:id/enrollments`    | Class roster |
| `POST /api/classes/:id/enrollments`    | Enroll `{studentId}` — 409 when full or duplicated |
| `DELETE /api/classes/:id/enrollments`  | Remove `{studentId}` |
| `GET  /api/students`                   | List students |
| `POST /api/students`                   | Register a student |
| `GET  /api/attendance`                 | History, filters: `classId`, `studentId`, `date`, `from`, `to`, `status` |
| `POST /api/attendance`                 | Save a day: `{classId, date, entries:[{studentId, status}]}` |

## Deployment

`scripts/release.mjs` runs migrations and refreshes the demo account; wire it
to the platform's release step (on Nrapken Quick: `node scripts/release.mjs`)
and set `DATABASE_URL` plus the `DEMO_*` variables as runtime environment.
