# Setup Guide

## 1. Run the Web Demo

The demo app runs without external packages.

```bash
cd CourseConnect
npm start
```

Open:

```text
http://localhost:3000
```

## 2. Oracle Database Setup

Use Oracle SQL Developer and run:

```sql
@database/oracle/01_schema.sql
@database/oracle/02_sample_data.sql
@database/oracle/03_plsql_package.sql
@database/oracle/04_report_calls.sql
```

Expected result:

- Tables are created with relationships and constraints.
- Sample categories, lecturers, students, courses, lessons, enrollments, payments, progress records, and certificates are inserted.
- PL/SQL package and triggers are compiled.
- Report calls display result cursors.

## 3. MongoDB Setup

Use MongoDB Shell:

```bash
mongosh < database/mongodb/seed_and_queries.js
```

Expected result:

- `courseconnect` database is selected.
- `courseResources`, `courseReviews`, and `discussionThreads` collections are created.
- Indexes and query examples are executed.

## 4. Suggested Demonstration Order

1. Show the web dashboard and course catalogue.
2. Explain the Oracle ER diagram.
3. Run Oracle sample reports from `04_report_calls.sql`.
4. Show MongoDB query results.
5. Explain why Oracle and MongoDB are both useful in CourseConnect.
