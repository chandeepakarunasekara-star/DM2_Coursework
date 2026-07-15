# Real Database Integration Guide

The app runs in demo mode by default (embedded SQLite + embedded JSON
store) so it can be shown immediately without installing anything. It
also ships with real Oracle and MongoDB adapters already wired up — this
guide explains how the switch works.

## Oracle Connection

Install the Oracle Node.js driver:

```bash
npm install oracledb
```

Create a `.env` file (copy `.env.example`):

```text
ORACLE_USER=courseconnect
ORACLE_PASSWORD=your_password
ORACLE_CONNECT_STRING=localhost/XEPDB1
```

What happens automatically once these are set (see `src/db/relational.js`
and `src/db/oracleEngine.js`):

1. The app keeps using the Oracle tables and PL/SQL package from `database/oracle`.
2. `src/db/oracleEngine.js` connects using `oracledb` and a connection pool.
3. Every business operation (`enrollStudent`, `recordPayment`, `updateProgress`) calls the matching `courseconnect_pkg` procedure with `BEGIN ... END;` blocks.
4. The five reports call the package's ref-cursor-returning procedures and stream rows back through the same REST API the UI already uses — no frontend changes needed.
5. Oracle error codes (`ORA-20001` … `ORA-20009`) are parsed out of the driver error and returned as normal JSON API errors.

## MongoDB Connection

The `mongodb` driver is already a project dependency. Add to `.env`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=courseconnect
```

What happens automatically (see `src/db/documents.js` and
`src/db/mongoAdapter.js`):

1. Oracle (or the SQLite fallback) still owns structured operations.
2. MongoDB owns `courseResources`, `courseReviews`, and `discussionThreads`.
3. The Oracle/SQLite `course_id` value is stored as `courseId` on every MongoDB document, which is what makes the hybrid "course health" report (`/api/reports/hybrid-course-health`) possible — it joins relational revenue/enrollment figures with MongoDB's aggregated rating in the application layer.
4. On first connect to an empty database, the app seeds all three collections from the same dataset used everywhere else (`src/seedData.js`), so you don't have to run `seed_and_queries.js` by hand — though you still can, for the mongosh-based demo.

## Why demo mode is still useful

Demo mode lets the project run during presentation even if Oracle or
MongoDB are not installed on the grader's machine, with identical
business logic and identical API responses. The SQL/JS database scripts
in `database/` are the real, gradable artifacts; the embedded engines are
a drop-in stand-in so the *application* can always be demonstrated live.
