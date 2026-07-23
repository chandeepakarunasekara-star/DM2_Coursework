# CourseConnect

CourseConnect is a full-stack online course platform built for the
"Data Management 2" coursework brief: a relational Oracle database for
core operations, MongoDB for flexible content, a PL/SQL business layer,
and a real Node.js/Express web application with a role-based UI on top of
both.

The app **runs immediately** with `npm install && npm start` — no Oracle
or MongoDB installation required for a demo/grading run. It ships with an
embedded engine on each side (SQLite mirroring the exact Oracle schema,
and a JSON store mirroring the exact MongoDB collections) that is used
automatically until you point it at real Oracle/MongoDB instances via
environment variables. Business logic, exception codes, trigger
behaviour, and report queries are identical either way — see
`docs/INTEGRATION_GUIDE.md`.

## Quick start

```bash
cd CourseConnect
npm install
npm start
```

Open `http://localhost:3000` and sign in with any demo account shown on
the login screen (password `password123` for all of them):

| Email | Role |
|---|---|
| admin@courseconnect.edu | Admin |
| amara@courseconnect.edu | Lecturer |
| kavindu@example.com | Student |

You can also create a new student account from the login screen.

## What's in the box

- **`src/`** — Express API and data-access layer
  - `src/db/sqliteEngine.js` — embedded relational engine (demo mode), a faithful port of `01_schema.sql` + `03_plsql_package.sql`
  - `src/db/oracleEngine.js` — real Oracle adapter (`oracledb` driver), calls the actual PL/SQL package
  - `src/db/jsonDocStore.js` / `src/db/mongoAdapter.js` — same pairing for the document side
  - `src/routes/` — REST API: auth, courses, lecturers, students, enrollments, payments, progress, reviews, forums, reports, dashboard
- **`public/`** — the web UI (vanilla HTML/CSS/JS, no build step): dashboard, catalogue, enrollment & progress tracking, payments, admin CRUD, business reports with CSV export, MongoDB-backed reviews & discussion forum
- **`database/oracle/`** — schema, sample data, PL/SQL package (procedures, functions, cursors, triggers, exception handling), and report calls
- **`database/mongodb/`** — seed data and aggregation/query examples for the three MongoDB collections
- **`docs/`** — ER diagram, setup guide, business report guide, data dictionary, marking checklist, viva answers, integration guide
- **`presentation/`** — outline for the presentation deliverable

## Core functionality

- Course catalogue management (categories, courses, lessons, publish status)
- Lecturer and student management (admin CRUD + self-service student sign-up)
- Enrollment workflow with duplicate/exception handling (`ORA-2000x` style errors)
- Payment processing with unique transaction references
- Lesson-by-lesson progress tracking that auto-completes enrollments and issues certificates at 100%
- Five required PL/SQL business reports, plus a sixth **hybrid Oracle × MongoDB** report ("course health") for the Integration & Innovation criterion
- MongoDB-backed course resources, student reviews/ratings, and a searchable discussion forum
- Role-based access (Admin / Lecturer / Student) enforced on both the API and the UI
- CSV export on every report

## Switching to real Oracle / MongoDB

See `docs/SETUP_GUIDE.md` for the full walkthrough. In short: run the SQL
scripts against your Oracle instance, `npm install oracledb`, and set
`ORACLE_USER` / `ORACLE_PASSWORD` / `ORACLE_CONNECT_STRING` in a `.env`
file (copy `.env.example`). For MongoDB, just set `MONGODB_URI` — the app
seeds the collections automatically on first connect. The server logs
which engine is active on startup.

## Submission helpers

- `docs/DATA_DICTIONARY.md` — explains all Oracle tables and MongoDB collections
- `docs/INTEGRATION_GUIDE.md` — how the app talks to Oracle/MongoDB (and the embedded fallbacks)
- `docs/ER_DIAGRAM.md` / `docs/BUSINESS_REPORTS.md` — schema and report reference
