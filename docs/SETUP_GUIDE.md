# Setup Guide

## 1. Run the Web App (demo mode — no external databases required)

```bash
cd CourseConnect
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Demo mode runs on an embedded SQLite database (built from the exact schema
in `database/oracle/01_schema.sql`) and an embedded JSON document store
(same shape as `database/mongodb/seed_and_queries.js`), both pre-seeded
with realistic sample data. Sign in with any of the demo accounts shown on
the login screen (password `password123` for all of them).

## 2. Switch to a real Oracle Database

1. Run these against your Oracle instance (SQL Developer, SQLcl, etc.):

   ```sql
   @database/oracle/01_schema.sql
   @database/oracle/02_sample_data.sql
   @database/oracle/03_plsql_package.sql
   @database/oracle/04_report_calls.sql
   ```

2. Install the Oracle driver and copy `.env.example` to `.env`:

   ```bash
   npm install oracledb
   cp .env.example .env
   ```

3. Fill in `ORACLE_USER`, `ORACLE_PASSWORD`, `ORACLE_CONNECT_STRING` in `.env`
   and restart `npm start`. The server logs `Relational engine : oracle` on
   boot when it's connected. Every enrollment, payment, and progress update
   now runs through the real `courseconnect_pkg` PL/SQL procedures instead
   of the SQLite fallback.

## 3. Switch to a real MongoDB

1. Set `MONGODB_URI` (and optionally `MONGODB_DB`) in `.env`.
2. Restart the app — it seeds the three collections automatically the
   first time it connects to an empty database, using the same content as
   `database/mongodb/seed_and_queries.js`. The server logs
   `Document engine : mongodb` on boot when it's connected.

Oracle and MongoDB can be turned on independently — you can run Oracle
with the embedded document store, or the embedded SQLite engine with real
MongoDB, while you wire each one up.

## 4. Suggested Demonstration Order

1. Show the web dashboard and course catalogue (sign in as admin, lecturer, and student to show role-based views).
2. Enroll as a student, pay, and complete lessons to show the completion-trigger and certificate issuance live.
3. Explain the Oracle ER diagram and PL/SQL package (`courseconnect_pkg`).
4. Run the 5 business reports (+ the hybrid Oracle×MongoDB report) from the Reports tab, or `04_report_calls.sql` directly in Oracle.
5. Show MongoDB reviews, top-rated aggregation, and forum keyword search.
6. Explain why Oracle and MongoDB are both useful in CourseConnect.

