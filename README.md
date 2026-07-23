# CourseConnect

CourseConnect is a full-stack online course platform built for the
"Data Management 2" coursework brief: a relational Oracle database for
core operations, MongoDB for flexible content, a PL/SQL business layer,
and a real Node.js/Express web application with a role-based UI on top of
both.

The app **runs immediately** with `npm install && npm start` —  Business logic, exception codes, trigger
behaviour, and report queries are identical either way — see
`docs/INTEGRATION_GUIDE.md`.

## Quick start

```bash
cd CourseConnect
npm install
npm start
```

Open `http://localhost:3000` and sign in 

You can also create a new student account from the login screen.

## What's in the box

- **`src/`** — Express API and data-access layer
  - `src/db/oracleEngine.js` — real Oracle adapter (`oracledb` driver), calls the actual PL/SQL package
  - `src/db/jsonDocStore.js` / `src/db/mongoAdapter.js` — same pairing for the document side
  - `src/routes/` — REST API: auth, courses, lecturers, students, enrollments, payments, progress, reviews, forums, reports, dashboard
- **`public/`** — the web UI (vanilla HTML/CSS/JS, no build step): dashboard, catalogue, enrollment & progress tracking, payments, admin CRUD, business reports with CSV export, MongoDB-backed reviews & discussion forum
- **`database/oracle/`** — schema, sample data, PL/SQL package (procedures, functions, cursors, triggers, exception handling), and report calls
- **`database/mongodb/`** — seed data and aggregation/query examples for the three MongoDB collections
- **`docs/`** — ER diagram, setup guide, business report guide, data dictionary, integration guide

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



## Submission helpers

- `docs/INTEGRATION_GUIDE.md` — how the app talks to Oracle/MongoDB (and the embedded fallbacks)
- `docs/ER_DIAGRAM.md` / `docs/BUSINESS_REPORTS.md` — schema and report reference
